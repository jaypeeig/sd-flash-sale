import { NotFoundException } from "@nestjs/common";
import { describe, expect, it, vi } from "vitest";
import type { Database } from "../database/database.types";
import type { Redis } from "../redis/redis.types";
import type { SalesService } from "../sales/sales.service";
import type { SaleRow } from "../sales/sales.types";
import { PurchaseReserveService } from "./purchases-reserve.service";
import { PurchasesService } from "./purchases.service";

const HOUR = 60 * 60 * 1000;

const baseSaleRow: SaleRow = {
  id: "sale-id",
  salePrice: "189.00",
  totalStock: 50,
  remainingStock: 5,
  startsAt: new Date(Date.now() - HOUR),
  endsAt: new Date(Date.now() + HOUR),
  cancelledAt: null,
  productId: "22222222-2222-2222-a222-222222222222",
  productName: "Field Recorder MK1",
  productDescription: "Hand-assembled portable recorder.",
  productImageUrl: "https://picsum.photos/seed/recorder/640/480",
  productPrice: "229.00",
};

const fakeSalesService = (row: SaleRow | undefined) =>
  ({ findRowById: () => Promise.resolve(row) }) as unknown as SalesService;

// Every test that isn't about Redis itself uses this: a socket that isn't
// "ready" makes PurchasesService skip straight to the Postgres flow
// without ever calling reservePurchase, so it's a safe default that keeps
// the pre-Redis test cases below unchanged.
const fakeDownRedis = (): Redis =>
  ({
    status: "end",
    reservePurchase: () =>
      Promise.reject(new Error("reservePurchase should not be called when Redis is down")),
  }) as unknown as Redis;

const fakeReadyRedis = (reservePurchase: () => Promise<string>): Redis =>
  ({ status: "ready", reservePurchase }) as unknown as Redis;

describe("Given no sale matches the given id", () => {
  describe("When a purchase is attempted", () => {
    it("Then it throws NotFoundException", async () => {
      const db = {} as unknown as Database;
      const service = new PurchasesService(
        db,
        new PurchaseReserveService(fakeDownRedis()),
        fakeSalesService(undefined),
      );

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
      const db = {} as unknown as Database;
      const service = new PurchasesService(
        db,
        new PurchaseReserveService(fakeDownRedis()),
        fakeSalesService(row),
      );

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
      const db = {} as unknown as Database;
      const service = new PurchasesService(
        db,
        new PurchaseReserveService(fakeDownRedis()),
        fakeSalesService(row),
      );

      const result = await service.purchase("sale-id", "user@example.com");

      expect(result.status).toBe("sale_not_active");
    });
  });
});

describe("Given a cancelled sale", () => {
  describe("When a purchase is attempted", () => {
    it("Then it returns a sale_not_active outcome", async () => {
      const row = { ...baseSaleRow, cancelledAt: new Date() };
      const db = {} as unknown as Database;
      const service = new PurchasesService(
        db,
        new PurchaseReserveService(fakeDownRedis()),
        fakeSalesService(row),
      );

      const result = await service.purchase("sale-id", "user@example.com");

      expect(result.status).toBe("sale_not_active");
    });
  });
});

describe("Given an active sale with stock available", () => {
  describe("When the purchase transaction succeeds", () => {
    it("Then it returns a success outcome", async () => {
      const tx = {
        insert: () => ({
          values: () => Promise.resolve(),
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
        transaction: (callback: (tx: unknown) => Promise<unknown>) => callback(tx),
      } as unknown as Database;
      const service = new PurchasesService(
        db,
        new PurchaseReserveService(fakeDownRedis()),
        fakeSalesService(baseSaleRow),
      );

      const result = await service.purchase("sale-id", "user@example.com");

      expect(result).toEqual({
        status: "success",
        message: "You've successfully secured your item!",
      });
    });
  });

  describe("When the stock decrement loses a concurrent race", () => {
    it("Then it returns a sold_out outcome", async () => {
      const tx = {
        insert: () => ({
          values: () => Promise.resolve(),
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
        transaction: (callback: (tx: unknown) => Promise<unknown>) => callback(tx),
      } as unknown as Database;
      const service = new PurchasesService(
        db,
        new PurchaseReserveService(fakeDownRedis()),
        fakeSalesService(baseSaleRow),
      );

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
        transaction: () => Promise.reject(uniqueViolation),
      } as unknown as Database;
      const service = new PurchasesService(
        db,
        new PurchaseReserveService(fakeDownRedis()),
        fakeSalesService(baseSaleRow),
      );

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
        transaction: () => Promise.reject(outsideWindow),
      } as unknown as Database;
      const service = new PurchasesService(
        db,
        new PurchaseReserveService(fakeDownRedis()),
        fakeSalesService(baseSaleRow),
      );

      const result = await service.purchase("sale-id", "user@example.com");

      expect(result.status).toBe("sale_not_active");
    });
  });

  describe("When the transaction fails for an unexpected reason", () => {
    it("Then it rethrows the error", async () => {
      const unexpected = new Error("connection reset");
      const db = {
        transaction: () => Promise.reject(unexpected),
      } as unknown as Database;
      const service = new PurchasesService(
        db,
        new PurchaseReserveService(fakeDownRedis()),
        fakeSalesService(baseSaleRow),
      );

      await expect(service.purchase("sale-id", "user@example.com")).rejects.toThrow(unexpected);
    });
  });
});

describe("Given Redis is down", () => {
  describe("When a purchase is attempted", () => {
    it("Then it falls back to Postgres without calling the reservation script", async () => {
      const reservePurchase = vi.fn();
      const redis = { status: "end", reservePurchase } as unknown as Redis;
      const tx = {
        insert: () => ({ values: () => Promise.resolve() }),
        update: () => ({
          set: () => ({
            where: () => ({ returning: () => Promise.resolve([{ remainingStock: 4 }]) }),
          }),
        }),
      };
      const db = {
        transaction: (callback: (tx: unknown) => Promise<unknown>) => callback(tx),
      } as unknown as Database;
      const service = new PurchasesService(
        db,
        new PurchaseReserveService(redis),
        fakeSalesService(baseSaleRow),
      );

      await service.purchase("sale-id", "user@example.com");

      expect(reservePurchase).not.toHaveBeenCalled();
    });
  });
});

describe("Given Redis has no state loaded for the sale", () => {
  describe("When a purchase is attempted", () => {
    it("Then it falls back to the same Postgres flow as when Redis is down", async () => {
      const redis = fakeReadyRedis(() => Promise.resolve("not_warmed"));
      const tx = {
        insert: () => ({ values: () => Promise.resolve() }),
        update: () => ({
          set: () => ({
            where: () => ({ returning: () => Promise.resolve([{ remainingStock: 4 }]) }),
          }),
        }),
      };
      const db = {
        transaction: (callback: (tx: unknown) => Promise<unknown>) => callback(tx),
      } as unknown as Database;
      const service = new PurchasesService(
        db,
        new PurchaseReserveService(redis),
        fakeSalesService(baseSaleRow),
      );

      const result = await service.purchase("sale-id", "user@example.com");

      expect(result.status).toBe("success");
    });
  });
});

describe.each([
  ["sale_not_active", "sale_not_active"],
  ["already_purchased", "already_purchased"],
  ["sold_out", "sold_out"],
] as const)("Given Redis rejects the reservation as %s", (code, expectedStatus) => {
  describe("When a purchase is attempted", () => {
    it(`Then it returns a ${expectedStatus} outcome without touching Postgres`, async () => {
      const dbTransaction = vi.fn();
      const findRowById = vi.fn();
      const redis = fakeReadyRedis(() => Promise.resolve(code));
      const db = { transaction: dbTransaction } as unknown as Database;
      const salesService = { findRowById } as unknown as SalesService;
      const service = new PurchasesService(db, new PurchaseReserveService(redis), salesService);

      const result = await service.purchase("sale-id", "user@example.com");

      expect(result.status).toBe(expectedStatus);
      expect(dbTransaction).not.toHaveBeenCalled();
      expect(findRowById).not.toHaveBeenCalled();
    });
  });
});

describe("Given Redis reserves the purchase", () => {
  describe("When the write-through to Postgres succeeds", () => {
    it("Then it skips the sale lookup and returns a success outcome", async () => {
      const findRowById = vi.fn();
      const redis = fakeReadyRedis(() => Promise.resolve("reserved"));
      const tx = {
        insert: () => ({ values: () => Promise.resolve() }),
        update: () => ({
          set: () => ({
            where: () => ({ returning: () => Promise.resolve([{ remainingStock: 4 }]) }),
          }),
        }),
      };
      const db = {
        transaction: (callback: (tx: unknown) => Promise<unknown>) => callback(tx),
      } as unknown as Database;
      const salesService = { findRowById } as unknown as SalesService;
      const service = new PurchasesService(db, new PurchaseReserveService(redis), salesService);

      const result = await service.purchase("sale-id", "user@example.com");

      expect(result.status).toBe("success");
      expect(findRowById).not.toHaveBeenCalled();
    });
  });

  describe("When Postgres then rejects the write as a duplicate purchase", () => {
    it("Then it returns already_purchased", async () => {
      const uniqueViolation = Object.assign(new Error("Failed query"), {
        cause: Object.assign(new Error("duplicate key value violates unique constraint"), {
          code: "23505",
        }),
      });
      const redis = fakeReadyRedis(() => Promise.resolve("reserved"));
      const db = { transaction: () => Promise.reject(uniqueViolation) } as unknown as Database;
      const service = new PurchasesService(
        db,
        new PurchaseReserveService(redis),
        fakeSalesService(baseSaleRow),
      );

      const result = await service.purchase("sale-id", "user@example.com");

      expect(result.status).toBe("already_purchased");
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
        productId: "22222222-2222-2222-a222-222222222222",
        productName: "Field Recorder MK1",
        productDescription: "Hand-assembled portable recorder.",
        productImageUrl: "https://picsum.photos/seed/recorder/640/480",
        productPrice: "229.00",
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
      const service = new PurchasesService(
        db,
        new PurchaseReserveService(fakeDownRedis()),
        fakeSalesService(baseSaleRow),
      );

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
