import { purchases, sales } from "@workspace/database";
import type { SaleRow } from "@workspace/database";
import { syncSale } from "@workspace/redis";
import type { PostPurchaseResponse } from "@workspace/shared-types";
import { and, eq } from "drizzle-orm";
import request from "supertest";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { createPurchase, createSale } from "./setup/fixtures";
import { bootstrapTestApp } from "./setup/test-app";
import type { TestApp } from "./setup/test-app.types";

const purchase = (server: TestApp["server"], saleId: string, email: string) =>
  request(server)
    .post(`/api/sales/${saleId}/purchase`)
    .send({ email })
    .then((response) => (response.body as PostPurchaseResponse).data);

// Loads a sale (and, optionally, its existing buyers) into Redis exactly as
// `redis:warm` would, so these tests exercise the same fast path a real
// warmed sale gets — without going through the standalone script.
const warmSale = (redis: TestApp["redis"], sale: SaleRow, buyerEmails: string[] = []) =>
  syncSale(
    redis,
    {
      id: sale.id,
      remainingStock: sale.remainingStock,
      startsAt: sale.startsAt,
      endsAt: sale.endsAt,
      cancelledAt: sale.cancelledAt,
    },
    buyerEmails,
  );

const remainingStockOf = async (db: TestApp["db"], saleId: string): Promise<number> => {
  const [row] = await db.select().from(sales).where(eq(sales.id, saleId));
  return row.remainingStock;
};

describe("Given the bootstrapped application with a real database and Redis", () => {
  let testApp: TestApp;

  beforeAll(async () => {
    testApp = await bootstrapTestApp();
  });

  afterAll(async () => {
    await testApp.close();
  });

  beforeEach(async () => {
    await testApp.reset();
  });

  describe("Given a sale warmed into Redis with stock available", () => {
    let saleId: string;

    beforeEach(async () => {
      const sale = await createSale(testApp.db, { phase: "active", stock: 5 });
      saleId = sale.id;
      await warmSale(testApp.redis, sale);
    });

    describe("When a new buyer purchases it", () => {
      let outcome: PostPurchaseResponse["data"];

      beforeEach(async () => {
        outcome = await purchase(testApp.server, saleId, "buyer@example.com");
      });

      it("Then it reports success", () => {
        expect(outcome.status).toBe("success");
      });

      it("Then Postgres records the purchase", async () => {
        const rows = await testApp.db
          .select()
          .from(purchases)
          .where(and(eq(purchases.saleId, saleId), eq(purchases.email, "buyer@example.com")));
        expect(rows).toHaveLength(1);
      });

      it("Then Postgres stock is decremented", async () => {
        expect(await remainingStockOf(testApp.db, saleId)).toBe(4);
      });
    });
  });

  describe("Given a sale warmed into Redis with no stock remaining", () => {
    let saleId: string;

    beforeEach(async () => {
      const sale = await createSale(testApp.db, { phase: "sold_out" });
      saleId = sale.id;
      await warmSale(testApp.redis, sale);
    });

    describe("When a buyer purchases it", () => {
      it("Then it reports sold_out and never reaches Postgres", async () => {
        const outcome = await purchase(testApp.server, saleId, "buyer@example.com");

        expect(outcome.status).toBe("sold_out");
        const rows = await testApp.db
          .select()
          .from(purchases)
          .where(and(eq(purchases.saleId, saleId), eq(purchases.email, "buyer@example.com")));
        expect(rows).toHaveLength(0);
      });
    });
  });

  describe("Given a sale warmed into Redis where the buyer already purchased", () => {
    let saleId: string;
    const email = "existing-buyer@example.com";

    beforeEach(async () => {
      const sale = await createSale(testApp.db, { phase: "active", stock: 5 });
      saleId = sale.id;
      await createPurchase(testApp.db, sale, { email });
      await warmSale(testApp.redis, sale, [email]);
    });

    describe("When that buyer purchases again", () => {
      it("Then it reports already_purchased without decrementing stock further", async () => {
        const outcome = await purchase(testApp.server, saleId, email);

        expect(outcome.status).toBe("already_purchased");
        expect(await remainingStockOf(testApp.db, saleId)).toBe(5);
      });
    });
  });

  describe("Given a sale warmed into Redis that has not started yet", () => {
    let saleId: string;

    beforeEach(async () => {
      const sale = await createSale(testApp.db, { phase: "upcoming", stock: 5 });
      saleId = sale.id;
      await warmSale(testApp.redis, sale);
    });

    describe("When someone purchases it", () => {
      it("Then it reports sale_not_active", async () => {
        const outcome = await purchase(testApp.server, saleId, "buyer@example.com");

        expect(outcome.status).toBe("sale_not_active");
      });
    });
  });

  describe("Given a sale that was never warmed into Redis", () => {
    let saleId: string;

    beforeEach(async () => {
      const sale = await createSale(testApp.db, { phase: "active", stock: 5 });
      saleId = sale.id;
    });

    describe("When it is purchased", () => {
      it("Then it still succeeds via the same Postgres flow as before Redis existed", async () => {
        const outcome = await purchase(testApp.server, saleId, "buyer@example.com");

        expect(outcome.status).toBe("success");
        expect(await remainingStockOf(testApp.db, saleId)).toBe(4);
      });
    });
  });

  describe("Given a sale warmed into Redis with a single unit in stock", () => {
    let saleId: string;
    const concurrentBuyers = 20;

    beforeEach(async () => {
      const sale = await createSale(testApp.db, { phase: "active", stock: 1 });
      saleId = sale.id;
      await warmSale(testApp.redis, sale);
    });

    describe("When 20 different emails purchase it at the same time", () => {
      let outcomes: string[];

      beforeEach(async () => {
        const responses = await Promise.all(
          Array.from({ length: concurrentBuyers }, (_, i) =>
            purchase(testApp.server, saleId, `buyer-${i}@example.com`),
          ),
        );
        outcomes = responses.map((response) => response.status);
      });

      it("Then exactly one purchase succeeds", () => {
        expect(outcomes.filter((status) => status === "success")).toHaveLength(1);
      });

      it("Then every other purchase reports sold_out", () => {
        expect(outcomes.filter((status) => status === "sold_out")).toHaveLength(
          concurrentBuyers - 1,
        );
      });

      it("Then Postgres' remaining stock never goes negative", async () => {
        expect(await remainingStockOf(testApp.db, saleId)).toBe(0);
      });
    });
  });

  describe("Given a sale warmed into Redis with ten units in stock", () => {
    let saleId: string;
    const concurrentAttempts = 20;
    const email = "buyer@example.com";

    beforeEach(async () => {
      const sale = await createSale(testApp.db, { phase: "active", stock: 10 });
      saleId = sale.id;
      await warmSale(testApp.redis, sale);
    });

    describe("When the same email purchases it 20 times at the same time", () => {
      let outcomes: string[];

      beforeEach(async () => {
        const responses = await Promise.all(
          Array.from({ length: concurrentAttempts }, () => purchase(testApp.server, saleId, email)),
        );
        outcomes = responses.map((response) => response.status);
      });

      it("Then exactly one purchase succeeds", () => {
        expect(outcomes.filter((status) => status === "success")).toHaveLength(1);
      });

      it("Then every other attempt reports already_purchased", () => {
        expect(outcomes.filter((status) => status === "already_purchased")).toHaveLength(
          concurrentAttempts - 1,
        );
      });

      it("Then only one purchase row exists for that sale and email", async () => {
        const rows = await testApp.db
          .select()
          .from(purchases)
          .where(and(eq(purchases.saleId, saleId), eq(purchases.email, email)));
        expect(rows).toHaveLength(1);
      });

      it("Then Postgres' remaining stock reflects exactly one sale", async () => {
        expect(await remainingStockOf(testApp.db, saleId)).toBe(9);
      });
    });
  });
});
