import { purchases, sales } from "@workspace/database";
import { syncSaleToRedis } from "@workspace/redis";
import type { PostPurchaseResponse } from "@workspace/shared-types";
import { and, eq } from "drizzle-orm";
import request from "supertest";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { createSale } from "./setup/fixtures";
import { bootstrapTestApp } from "./setup/test-app";
import type { TestApp } from "./setup/test-app.types";

const purchase = (server: TestApp["server"], saleId: string, email: string) =>
  request(server)
    .post(`/api/sales/${saleId}/purchase`)
    .send({ email })
    .then((response) => (response.body as PostPurchaseResponse).data.status);

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

  describe("Given an active sale with a single unit in stock, synced into Redis", () => {
    let saleId: string;
    const concurrentBuyers = 20;

    beforeEach(async () => {
      const sale = await createSale(testApp.db, { phase: "active", stock: 1 });
      saleId = sale.id;
      await syncSaleToRedis(testApp.db, testApp.redis, saleId, { force: true });
    });

    describe("When 20 different emails purchase it at the same time", () => {
      let outcomes: string[];

      beforeEach(async () => {
        outcomes = await Promise.all(
          Array.from({ length: concurrentBuyers }, (_, i) =>
            purchase(testApp.server, saleId, `buyer-${i}@example.com`),
          ),
        );
      });

      it("Then exactly one purchase succeeds", () => {
        expect(outcomes.filter((status) => status === "success")).toHaveLength(1);
      });

      it("Then every other purchase reports sold_out", () => {
        expect(outcomes.filter((status) => status === "sold_out")).toHaveLength(
          concurrentBuyers - 1,
        );
      });

      it("Then the sale's remaining stock never goes negative in Postgres", async () => {
        const [row] = await testApp.db.select().from(sales).where(eq(sales.id, saleId));
        expect(row.remainingStock).toBe(0);
      });

      it("Then Redis's stock counter matches Postgres exactly", async () => {
        const stock = await testApp.redis.get(`flashsale:sale:${saleId}:stock`);
        expect(stock).toBe("0");
      });
    });
  });

  describe("Given an active sale with ten units in stock, synced into Redis", () => {
    let saleId: string;
    const concurrentAttempts = 20;
    const email = "buyer@example.com";

    beforeEach(async () => {
      const sale = await createSale(testApp.db, { phase: "active", stock: 10 });
      saleId = sale.id;
      await syncSaleToRedis(testApp.db, testApp.redis, saleId, { force: true });
    });

    describe("When the same email purchases it 20 times at the same time", () => {
      let outcomes: string[];

      beforeEach(async () => {
        outcomes = await Promise.all(
          Array.from({ length: concurrentAttempts }, () => purchase(testApp.server, saleId, email)),
        );
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

      it("Then the losing attempts did not decrement stock beyond the single sale", async () => {
        const [row] = await testApp.db.select().from(sales).where(eq(sales.id, saleId));
        expect(row.remainingStock).toBe(9);
      });
    });
  });

  describe("Given an active sale with different-casing duplicate purchases", () => {
    let saleId: string;

    beforeEach(async () => {
      const sale = await createSale(testApp.db, { phase: "active", stock: 5 });
      saleId = sale.id;
      await syncSaleToRedis(testApp.db, testApp.redis, saleId, { force: true });
    });

    describe("When the same email purchases twice with different casing", () => {
      it("Then the second attempt reports already_purchased", async () => {
        const first = await purchase(testApp.server, saleId, "Buyer@Example.com");
        expect(first).toBe("success");

        const second = await purchase(testApp.server, saleId, "buyer@example.com");
        expect(second).toBe("already_purchased");
      });
    });
  });
});
