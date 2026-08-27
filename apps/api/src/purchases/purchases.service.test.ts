import { NotFoundException } from "@nestjs/common";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Database } from "../database/database.types";
import type { RedisClient } from "../redis/redis.types";
import { PurchasesService } from "./purchases.service";

const HOUR = 60 * 60 * 1000;

// purchases.service.ts calls the reservePurchase/releasePurchase *functions*
// exported from @workspace/redis (each internally issuing one Lua call) —
// mocking those two, rather than the redis client itself, is what lets
// these stay unit tests with no real Redis connection. normalizeEmail and
// redisKeys stay real since purchases.service.ts relies on their actual
// behavior.
const { reservePurchase, releasePurchase } = vi.hoisted(() => ({
  reservePurchase: vi.fn(),
  releasePurchase: vi.fn(),
}));

vi.mock("@workspace/redis", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@workspace/redis")>();
  return { ...actual, reservePurchase, releasePurchase };
});

// Kept as a plain reference (not re-read through the RedisClient cast
// below) so assertions on it stay typed as a vitest mock.
const redisSet = vi.fn();

beforeEach(() => {
  reservePurchase.mockReset();
  releasePurchase.mockReset().mockResolvedValue(true);
  redisSet.mockReset().mockResolvedValue("OK");
});

// With Redis reporting "close" (down), the dispatcher takes the Postgres
// branch unconditionally without ever calling reservePurchase — every test
// below that uses this stub is exercising purchaseViaPostgres exactly as
// it ran before Redis existed.
const DOWN_REDIS_STUB = { status: "close" } as unknown as RedisClient;

// Redis reporting "ready" routes through reservePurchase (mocked above);
// `set` backs the best-effort "mark desynced on Redis failure" call.
const READY_REDIS_STUB = { status: "ready", set: redisSet } as unknown as RedisClient;

const baseSaleRow = {
  startsAt: new Date(Date.now() - HOUR),
  endsAt: new Date(Date.now() + HOUR),
  remainingStock: 5,
  salePrice: "189.00",
  cancelledAt: null as Date | null,
  productId: "22222222-2222-2222-a222-222222222222",
  productName: "Field Recorder MK1",
  productDescription: "Hand-assembled portable recorder.",
  productImageUrl: "https://picsum.photos/seed/recorder/640/480",
  productPrice: "229.00",
};

const withSelect = (row: typeof baseSaleRow | undefined) => ({
  select: () => ({
    from: () => ({
      innerJoin: () => ({
        where: () => Promise.resolve(row ? [row] : []),
      }),
    }),
  }),
});

describe("Given no sale matches the given id", () => {
  describe("When a purchase is attempted", () => {
    it("Then it throws NotFoundException", async () => {
      const db = { ...withSelect(undefined) } as unknown as Database;
      const service = new PurchasesService(db, DOWN_REDIS_STUB);

      await expect(service.purchase("missing-id", "user@example.com")).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});

describe("Given a sale that has not started yet", () => {
  describe("When a purchase is attempted", () => {
    it("Then it returns a sale_not_active outcome", async () => {
      const row = { ...baseSaleRow, startsAt: new Date(Date.now() + HOUR) };
      const db = { ...withSelect(row) } as unknown as Database;
      const service = new PurchasesService(db, DOWN_REDIS_STUB);

      const result = await service.purchase("sale-id", "user@example.com");

      expect(result.status).toBe("sale_not_active");
    });
  });
});

describe("Given a sale that has already ended", () => {
  describe("When a purchase is attempted", () => {
    it("Then it returns a sale_not_active outcome", async () => {
      const row = {
        ...baseSaleRow,
        startsAt: new Date(Date.now() - 2 * HOUR),
        endsAt: new Date(Date.now() - HOUR),
      };
      const db = { ...withSelect(row) } as unknown as Database;
      const service = new PurchasesService(db, DOWN_REDIS_STUB);

      const result = await service.purchase("sale-id", "user@example.com");

      expect(result.status).toBe("sale_not_active");
    });
  });
});

describe("Given a cancelled sale", () => {
  describe("When a purchase is attempted", () => {
    it("Then it returns a sale_not_active outcome", async () => {
      const row = { ...baseSaleRow, cancelledAt: new Date() };
      const db = { ...withSelect(row) } as unknown as Database;
      const service = new PurchasesService(db, DOWN_REDIS_STUB);

      const result = await service.purchase("sale-id", "user@example.com");

      expect(result.status).toBe("sale_not_active");
    });
  });
});

describe("Given a sale with no remaining stock", () => {
  describe("When a purchase is attempted", () => {
    it("Then it returns a sold_out outcome", async () => {
      const row = { ...baseSaleRow, remainingStock: 0 };
      const db = { ...withSelect(row) } as unknown as Database;
      const service = new PurchasesService(db, DOWN_REDIS_STUB);

      const result = await service.purchase("sale-id", "user@example.com");

      expect(result.status).toBe("sold_out");
    });
  });
});

describe("Given an active sale with stock available", () => {
  describe("When the purchase transaction succeeds", () => {
    it("Then it returns a success outcome with the purchase record", async () => {
      const purchasedAt = new Date("2026-08-26T10:00:00.000Z");
      const tx = {
        insert: () => ({
          values: () => ({
            returning: () =>
              Promise.resolve([{ id: "purchase-id", email: "user@example.com", purchasedAt }]),
          }),
        }),
        update: () => ({
          set: () => ({
            where: () => ({
              returning: () => Promise.resolve([{ remainingStock: 4 }]),
            }),
          }),
        }),
      };
      const db = {
        ...withSelect(baseSaleRow),
        transaction: (callback: (tx: unknown) => Promise<unknown>) => callback(tx),
      } as unknown as Database;
      const service = new PurchasesService(db, DOWN_REDIS_STUB);

      const result = await service.purchase("sale-id", "user@example.com");

      expect(result).toEqual({
        status: "success",
        message: "You've successfully secured your item!",
        purchase: {
          id: "purchase-id",
          saleId: "sale-id",
          product: {
            id: baseSaleRow.productId,
            name: baseSaleRow.productName,
            description: baseSaleRow.productDescription,
            imageUrl: baseSaleRow.productImageUrl,
            price: baseSaleRow.productPrice,
          },
          email: "user@example.com",
          price: baseSaleRow.salePrice,
          purchasedAt: purchasedAt.toISOString(),
        },
      });
    });
  });

  describe("When the stock decrement loses a concurrent race", () => {
    it("Then it returns a sold_out outcome", async () => {
      const tx = {
        insert: () => ({
          values: () => ({
            returning: () =>
              Promise.resolve([
                { id: "purchase-id", email: "user@example.com", purchasedAt: new Date() },
              ]),
          }),
        }),
        update: () => ({
          set: () => ({
            where: () => ({
              returning: () => Promise.resolve([]),
            }),
          }),
        }),
      };
      const db = {
        ...withSelect(baseSaleRow),
        transaction: (callback: (tx: unknown) => Promise<unknown>) => callback(tx),
      } as unknown as Database;
      const service = new PurchasesService(db, DOWN_REDIS_STUB);

      const result = await service.purchase("sale-id", "user@example.com");

      expect(result.status).toBe("sold_out");
    });
  });

  describe("When the user has already purchased this sale", () => {
    it("Then it returns an already_purchased outcome", async () => {
      // Modeled on the actual shape drizzle-orm throws: a DrizzleQueryError
      // wrapper whose .cause is the real pg error carrying the SQLSTATE code.
      const uniqueViolation = Object.assign(new Error("Failed query"), {
        cause: Object.assign(new Error("duplicate key value violates unique constraint"), {
          code: "23505",
        }),
      });
      const db = {
        ...withSelect(baseSaleRow),
        transaction: () => Promise.reject(uniqueViolation),
      } as unknown as Database;
      const service = new PurchasesService(db, DOWN_REDIS_STUB);

      const result = await service.purchase("sale-id", "user@example.com");

      expect(result.status).toBe("already_purchased");
    });
  });

  describe("When the sale's window closes before the transaction commits", () => {
    it("Then it returns a sale_not_active outcome", async () => {
      const outsideWindow = Object.assign(new Error("Failed query"), {
        cause: Object.assign(new Error("purchase is outside the sale period"), { code: "P1002" }),
      });
      const db = {
        ...withSelect(baseSaleRow),
        transaction: () => Promise.reject(outsideWindow),
      } as unknown as Database;
      const service = new PurchasesService(db, DOWN_REDIS_STUB);

      const result = await service.purchase("sale-id", "user@example.com");

      expect(result.status).toBe("sale_not_active");
    });
  });

  describe("When the transaction fails for an unexpected reason", () => {
    it("Then it rethrows the error", async () => {
      const unexpected = new Error("connection reset");
      const db = {
        ...withSelect(baseSaleRow),
        transaction: () => Promise.reject(unexpected),
      } as unknown as Database;
      const service = new PurchasesService(db, DOWN_REDIS_STUB);

      await expect(service.purchase("sale-id", "user@example.com")).rejects.toThrow(unexpected);
    });
  });
});

describe("Given Redis is ready but the sale hasn't been synced into it", () => {
  describe("When a purchase is attempted", () => {
    it("Then it falls through to the Postgres path and still succeeds", async () => {
      reservePurchase.mockResolvedValue({ code: "not_loaded" });
      const purchasedAt = new Date("2026-08-26T10:00:00.000Z");
      const tx = {
        insert: () => ({
          values: () => ({
            returning: () =>
              Promise.resolve([{ id: "purchase-id", email: "user@example.com", purchasedAt }]),
          }),
        }),
        update: () => ({
          set: () => ({
            where: () => ({
              returning: () => Promise.resolve([{ remainingStock: 4 }]),
            }),
          }),
        }),
      };
      const db = {
        ...withSelect(baseSaleRow),
        transaction: (callback: (tx: unknown) => Promise<unknown>) => callback(tx),
      } as unknown as Database;
      const service = new PurchasesService(db, READY_REDIS_STUB);

      const result = await service.purchase("sale-id", "user@example.com");

      expect(result.status).toBe("success");
    });
  });
});

describe("Given Redis is ready and reservePurchase rejects the reservation", () => {
  describe("When the sale is outside its window", () => {
    it("Then it returns a sale_not_active outcome with no Postgres call", async () => {
      reservePurchase.mockResolvedValue({ code: "sale_not_active" });
      const service = new PurchasesService({} as unknown as Database, READY_REDIS_STUB);

      const result = await service.purchase("sale-id", "user@example.com");

      expect(result.status).toBe("sale_not_active");
    });
  });

  describe("When the buyer already purchased", () => {
    it("Then it returns an already_purchased outcome with no Postgres call", async () => {
      reservePurchase.mockResolvedValue({ code: "already_purchased" });
      const service = new PurchasesService({} as unknown as Database, READY_REDIS_STUB);

      const result = await service.purchase("sale-id", "user@example.com");

      expect(result.status).toBe("already_purchased");
    });
  });

  describe("When the sale is sold out", () => {
    it("Then it returns a sold_out outcome with no Postgres call", async () => {
      reservePurchase.mockResolvedValue({ code: "sold_out" });
      const service = new PurchasesService({} as unknown as Database, READY_REDIS_STUB);

      const result = await service.purchase("sale-id", "user@example.com");

      expect(result.status).toBe("sold_out");
    });
  });
});

describe("Given Redis reserves a unit and the Postgres transaction succeeds", () => {
  describe("When a purchase is attempted", () => {
    it("Then it returns success built entirely from the Redis snapshot", async () => {
      reservePurchase.mockResolvedValue({
        code: "reserved",
        snapshot: {
          salePrice: "149.00",
          productId: "snapshot-product-id",
          productName: "Snapshot Product",
          productDescription: "From Redis, not Postgres.",
          productImageUrl: "https://example.com/snapshot.png",
          productPrice: "199.00",
        },
      });
      const purchasedAt = new Date("2026-08-26T10:00:00.000Z");
      const tx = {
        insert: () => ({
          values: () => ({
            returning: () =>
              Promise.resolve([{ id: "purchase-id", email: "User@Example.com", purchasedAt }]),
          }),
        }),
        update: () => ({
          set: () => ({
            where: () => ({
              returning: () => Promise.resolve([{ remainingStock: 4 }]),
            }),
          }),
        }),
      };
      // No `select` needed on this db stub at all — the golden path never
      // issues the pre-transaction SELECT purchaseViaPostgres relies on.
      const db = {
        transaction: (callback: (tx: unknown) => Promise<unknown>) => callback(tx),
      } as unknown as Database;
      const service = new PurchasesService(db, READY_REDIS_STUB);

      const result = await service.purchase("sale-id", "User@Example.com");

      expect(result).toEqual({
        status: "success",
        message: "You've successfully secured your item!",
        purchase: {
          id: "purchase-id",
          saleId: "sale-id",
          product: {
            id: "snapshot-product-id",
            name: "Snapshot Product",
            description: "From Redis, not Postgres.",
            imageUrl: "https://example.com/snapshot.png",
            price: "199.00",
          },
          email: "User@Example.com",
          price: "149.00",
          purchasedAt: purchasedAt.toISOString(),
        },
      });
    });

    it("Then reservePurchase is called with the normalized email", async () => {
      reservePurchase.mockResolvedValue({
        code: "reserved",
        snapshot: {
          salePrice: "149.00",
          productId: "id",
          productName: "name",
          productDescription: null,
          productImageUrl: null,
          productPrice: "199.00",
        },
      });
      const tx = {
        insert: () => ({
          values: () => ({
            returning: () =>
              Promise.resolve([
                { id: "purchase-id", email: "User@Example.com", purchasedAt: new Date() },
              ]),
          }),
        }),
        update: () => ({
          set: () => ({
            where: () => ({ returning: () => Promise.resolve([{ remainingStock: 4 }]) }),
          }),
        }),
      };
      const db = {
        transaction: (callback: (tx: unknown) => Promise<unknown>) => callback(tx),
      } as unknown as Database;
      const service = new PurchasesService(db, READY_REDIS_STUB);

      await service.purchase("sale-id", "  User@Example.com  ");

      expect(reservePurchase).toHaveBeenCalledWith(
        READY_REDIS_STUB,
        expect.objectContaining({ saleId: "sale-id", email: "user@example.com" }),
      );
    });
  });
});

describe("Given Redis reserves a unit but the Postgres transaction then fails", () => {
  const reservedResult = {
    code: "reserved" as const,
    snapshot: {
      salePrice: "149.00",
      productId: "id",
      productName: "name",
      productDescription: null,
      productImageUrl: null,
      productPrice: "199.00",
    },
  };

  describe("When the stock decrement loses a concurrent race", () => {
    it("Then it returns a sold_out outcome", async () => {
      reservePurchase.mockResolvedValue(reservedResult);
      const tx = {
        insert: () => ({
          values: () => ({
            returning: () =>
              Promise.resolve([
                { id: "purchase-id", email: "user@example.com", purchasedAt: new Date() },
              ]),
          }),
        }),
        update: () => ({
          set: () => ({ where: () => ({ returning: () => Promise.resolve([]) }) }),
        }),
      };
      const db = {
        transaction: (callback: (tx: unknown) => Promise<unknown>) => callback(tx),
      } as unknown as Database;
      const service = new PurchasesService(db, READY_REDIS_STUB);

      const result = await service.purchase("sale-id", "user@example.com");

      expect(result.status).toBe("sold_out");
    });

    it("Then it releases the Redis reservation", async () => {
      reservePurchase.mockResolvedValue(reservedResult);
      const tx = {
        insert: () => ({
          values: () => ({
            returning: () =>
              Promise.resolve([
                { id: "purchase-id", email: "user@example.com", purchasedAt: new Date() },
              ]),
          }),
        }),
        update: () => ({
          set: () => ({ where: () => ({ returning: () => Promise.resolve([]) }) }),
        }),
      };
      const db = {
        transaction: (callback: (tx: unknown) => Promise<unknown>) => callback(tx),
      } as unknown as Database;
      const service = new PurchasesService(db, READY_REDIS_STUB);

      await service.purchase("sale-id", "user@example.com");

      expect(releasePurchase).toHaveBeenCalledWith(
        READY_REDIS_STUB,
        expect.objectContaining({ saleId: "sale-id", email: "user@example.com" }),
      );
    });
  });

  describe("When the user already purchased via a different path", () => {
    it("Then it returns already_purchased and releases the reservation", async () => {
      reservePurchase.mockResolvedValue(reservedResult);
      const uniqueViolation = Object.assign(new Error("Failed query"), {
        cause: Object.assign(new Error("duplicate key"), { code: "23505" }),
      });
      const db = {
        transaction: () => Promise.reject(uniqueViolation),
      } as unknown as Database;
      const service = new PurchasesService(db, READY_REDIS_STUB);

      const result = await service.purchase("sale-id", "user@example.com");

      expect(result.status).toBe("already_purchased");
      expect(releasePurchase).toHaveBeenCalled();
    });
  });

  describe("When the sale's window closes before the transaction commits", () => {
    it("Then it returns sale_not_active and releases the reservation", async () => {
      reservePurchase.mockResolvedValue(reservedResult);
      const outsideWindow = Object.assign(new Error("Failed query"), {
        cause: Object.assign(new Error("outside sale period"), { code: "P1002" }),
      });
      const db = {
        transaction: () => Promise.reject(outsideWindow),
      } as unknown as Database;
      const service = new PurchasesService(db, READY_REDIS_STUB);

      const result = await service.purchase("sale-id", "user@example.com");

      expect(result.status).toBe("sale_not_active");
      expect(releasePurchase).toHaveBeenCalled();
    });
  });

  describe("When the transaction fails for an unexpected reason", () => {
    it("Then it rethrows the error after releasing the reservation", async () => {
      reservePurchase.mockResolvedValue(reservedResult);
      const unexpected = new Error("connection reset");
      const db = {
        transaction: () => Promise.reject(unexpected),
      } as unknown as Database;
      const service = new PurchasesService(db, READY_REDIS_STUB);

      await expect(service.purchase("sale-id", "user@example.com")).rejects.toThrow(unexpected);
      expect(releasePurchase).toHaveBeenCalled();
    });
  });

  describe("When the compensating release itself fails", () => {
    it("Then the original outcome is still returned, not the release failure", async () => {
      reservePurchase.mockResolvedValue(reservedResult);
      releasePurchase.mockRejectedValue(new Error("redis unreachable"));
      const tx = {
        insert: () => ({
          values: () => ({
            returning: () =>
              Promise.resolve([
                { id: "purchase-id", email: "user@example.com", purchasedAt: new Date() },
              ]),
          }),
        }),
        update: () => ({
          set: () => ({ where: () => ({ returning: () => Promise.resolve([]) }) }),
        }),
      };
      const db = {
        transaction: (callback: (tx: unknown) => Promise<unknown>) => callback(tx),
      } as unknown as Database;
      const service = new PurchasesService(db, READY_REDIS_STUB);

      const result = await service.purchase("sale-id", "user@example.com");

      expect(result.status).toBe("sold_out");
    });
  });
});

describe("Given Redis is ready but the reservation call itself throws", () => {
  describe("When a purchase is attempted", () => {
    it("Then it falls through to the Postgres path and still succeeds", async () => {
      reservePurchase.mockRejectedValue(
        Object.assign(new Error("connect ECONNREFUSED"), { code: "ECONNREFUSED" }),
      );
      const purchasedAt = new Date("2026-08-26T10:00:00.000Z");
      const tx = {
        insert: () => ({
          values: () => ({
            returning: () =>
              Promise.resolve([{ id: "purchase-id", email: "user@example.com", purchasedAt }]),
          }),
        }),
        update: () => ({
          set: () => ({
            where: () => ({ returning: () => Promise.resolve([{ remainingStock: 4 }]) }),
          }),
        }),
      };
      const db = {
        ...withSelect(baseSaleRow),
        transaction: (callback: (tx: unknown) => Promise<unknown>) => callback(tx),
      } as unknown as Database;
      const service = new PurchasesService(db, READY_REDIS_STUB);

      const result = await service.purchase("sale-id", "user@example.com");

      expect(result.status).toBe("success");
    });

    it("Then it marks the sale desynced", async () => {
      reservePurchase.mockRejectedValue(
        Object.assign(new Error("connect ECONNREFUSED"), { code: "ECONNREFUSED" }),
      );
      const tx = {
        insert: () => ({
          values: () => ({
            returning: () =>
              Promise.resolve([
                { id: "purchase-id", email: "user@example.com", purchasedAt: new Date() },
              ]),
          }),
        }),
        update: () => ({
          set: () => ({
            where: () => ({ returning: () => Promise.resolve([{ remainingStock: 4 }]) }),
          }),
        }),
      };
      const db = {
        ...withSelect(baseSaleRow),
        transaction: (callback: (tx: unknown) => Promise<unknown>) => callback(tx),
      } as unknown as Database;
      const service = new PurchasesService(db, READY_REDIS_STUB);

      await service.purchase("sale-id", "user@example.com");

      expect(redisSet).toHaveBeenCalledWith("flashsale:sale:sale-id:desynced", "1");
    });
  });
});

describe("Given a user has purchases", () => {
  describe("When their purchases are requested by email", () => {
    it("Then it maps each row into the PurchaseRecord shape", async () => {
      const purchasedAt = new Date("2026-08-26T10:00:00.000Z");
      const row = {
        id: "purchase-id",
        saleId: "sale-id",
        email: "user@example.com",
        purchasedAt,
        salePrice: "189.00",
        productId: baseSaleRow.productId,
        productName: baseSaleRow.productName,
        productDescription: baseSaleRow.productDescription,
        productImageUrl: baseSaleRow.productImageUrl,
        productPrice: baseSaleRow.productPrice,
      };
      const db = {
        select: () => ({
          from: () => ({
            innerJoin: () => ({
              innerJoin: () => ({
                where: () => ({
                  orderBy: () => Promise.resolve([row]),
                }),
              }),
            }),
          }),
        }),
      } as unknown as Database;
      const service = new PurchasesService(db, DOWN_REDIS_STUB);

      const result = await service.findByEmail("user@example.com");

      expect(result).toEqual([
        {
          id: row.id,
          saleId: row.saleId,
          product: {
            id: row.productId,
            name: row.productName,
            description: row.productDescription,
            imageUrl: row.productImageUrl,
            price: row.productPrice,
          },
          email: row.email,
          price: row.salePrice,
          purchasedAt: purchasedAt.toISOString(),
        },
      ]);
    });
  });
});
