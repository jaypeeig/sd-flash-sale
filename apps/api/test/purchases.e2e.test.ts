import { sales } from "@workspace/database";
import type { GetPurchasesResponse, PostPurchaseResponse } from "@workspace/shared-types";
import { eq } from "drizzle-orm";
import request, { type Response } from "supertest";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { createPurchase, createSale } from "./setup/fixtures";
import { bootstrapTestApp } from "./setup/test-app";
import type { TestApp } from "./setup/test-app.types";

describe("Given the bootstrapped application with a real database", () => {
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

  describe("Given an active sale with one unit left", () => {
    let saleId: string;
    let salePrice: string;

    beforeEach(async () => {
      const sale = await createSale(testApp.db, { phase: "active", stock: 1 });
      saleId = sale.id;
      salePrice = sale.salePrice;
    });

    describe("When POST /api/sales/:id/purchase is requested with a fresh email", () => {
      let response: Response;

      beforeEach(async () => {
        response = await request(testApp.server)
          .post(`/api/sales/${saleId}/purchase`)
          .send({ email: "buyer@example.com" });
      });

      it("Then it responds with 200", () => {
        expect(response.status).toBe(200);
      });

      it("Then the outcome is success", () => {
        const body: PostPurchaseResponse = response.body;
        expect(body.data.status).toBe("success");
      });

      it("Then it returns the purchase record priced at the sale price", () => {
        const body: PostPurchaseResponse = response.body;
        expect(body.data.purchase?.price).toBe(salePrice);
      });

      it("Then the sale's remaining stock is decremented to zero", async () => {
        const [row] = await testApp.db.select().from(sales).where(eq(sales.id, saleId));
        expect(row.remainingStock).toBe(0);
      });
    });
  });

  describe("Given an active sale with two units left", () => {
    let saleId: string;

    beforeEach(async () => {
      const sale = await createSale(testApp.db, { phase: "active", stock: 2 });
      saleId = sale.id;
    });

    describe("When the same email purchases twice", () => {
      let secondResponse: Response;

      beforeEach(async () => {
        await request(testApp.server)
          .post(`/api/sales/${saleId}/purchase`)
          .send({ email: "buyer@example.com" });

        secondResponse = await request(testApp.server)
          .post(`/api/sales/${saleId}/purchase`)
          .send({ email: "buyer@example.com" });
      });

      it("Then the second attempt reports already_purchased", () => {
        const body: PostPurchaseResponse = secondResponse.body;
        expect(body.data.status).toBe("already_purchased");
      });
    });

    describe("When the same email purchases twice with different casing", () => {
      let secondResponse: Response;

      beforeEach(async () => {
        await request(testApp.server)
          .post(`/api/sales/${saleId}/purchase`)
          .send({ email: "buyer@example.com" });

        secondResponse = await request(testApp.server)
          .post(`/api/sales/${saleId}/purchase`)
          .send({ email: "BUYER@EXAMPLE.COM" });
      });

      it("Then the second attempt reports already_purchased", () => {
        const body: PostPurchaseResponse = secondResponse.body;
        expect(body.data.status).toBe("already_purchased");
      });
    });
  });

  describe("Given a sale that is already sold out", () => {
    let saleId: string;

    beforeEach(async () => {
      const sale = await createSale(testApp.db, { phase: "sold_out" });
      saleId = sale.id;
    });

    describe("When POST /api/sales/:id/purchase is requested", () => {
      it("Then the outcome is sold_out", async () => {
        const response = await request(testApp.server)
          .post(`/api/sales/${saleId}/purchase`)
          .send({ email: "buyer@example.com" });

        const body: PostPurchaseResponse = response.body;
        expect(body.data.status).toBe("sold_out");
      });
    });
  });

  describe.each([
    ["upcoming", "upcoming" as const],
    ["past", "past" as const],
    ["cancelled", "cancelled" as const],
  ])("Given a sale that is %s", (_label, phase) => {
    let saleId: string;

    beforeEach(async () => {
      const sale = await createSale(testApp.db, { phase });
      saleId = sale.id;
    });

    describe("When POST /api/sales/:id/purchase is requested", () => {
      it("Then the outcome is sale_not_active", async () => {
        const response = await request(testApp.server)
          .post(`/api/sales/${saleId}/purchase`)
          .send({ email: "buyer@example.com" });

        const body: PostPurchaseResponse = response.body;
        expect(body.data.status).toBe("sale_not_active");
      });
    });
  });

  describe("When POST /api/sales/:id/purchase is requested for an unknown sale", () => {
    it("Then it responds with 404", async () => {
      const response = await request(testApp.server)
        .post("/api/sales/00000000-0000-0000-0000-000000000000/purchase")
        .send({ email: "buyer@example.com" });

      expect(response.status).toBe(404);
    });
  });

  describe("Given an active sale", () => {
    let saleId: string;

    beforeEach(async () => {
      const sale = await createSale(testApp.db, { phase: "active" });
      saleId = sale.id;
    });

    describe("When POST /api/sales/:id/purchase is requested with a malformed email", () => {
      it("Then it responds with 400", async () => {
        const response = await request(testApp.server)
          .post(`/api/sales/${saleId}/purchase`)
          .send({ email: "not-an-email" });

        expect(response.status).toBe(400);
      });
    });
  });

  describe("When POST /api/sales/:id/purchase is requested with a non-uuid id", () => {
    it("Then it responds with 400", async () => {
      const response = await request(testApp.server)
        .post("/api/sales/not-a-uuid/purchase")
        .send({ email: "buyer@example.com" });

      expect(response.status).toBe(400);
    });
  });

  describe("Given two purchases by the same email on two different sales", () => {
    let email: string;
    let earlierSaleId: string;
    let laterSaleId: string;

    beforeEach(async () => {
      email = "buyer@example.com";
      const earlierSale = await createSale(testApp.db, { phase: "past" });
      const laterSale = await createSale(testApp.db, { phase: "active" });
      earlierSaleId = earlierSale.id;
      laterSaleId = laterSale.id;

      await createPurchase(testApp.db, earlierSale, {
        email,
        purchasedAt: earlierSale.startsAt,
      });
      await createPurchase(testApp.db, laterSale, { email, purchasedAt: laterSale.startsAt });
    });

    describe("When GET /api/purchases?email= is requested", () => {
      let response: Response;

      beforeEach(async () => {
        response = await request(testApp.server).get(
          `/api/purchases?email=${encodeURIComponent(email)}`,
        );
      });

      it("Then it responds with 200", () => {
        expect(response.status).toBe(200);
      });

      it("Then it returns both purchases newest first", () => {
        const body: GetPurchasesResponse = response.body;
        expect(body.data.map((purchase) => purchase.saleId)).toEqual([laterSaleId, earlierSaleId]);
      });
    });

    describe("When GET /api/purchases is requested without an email", () => {
      it("Then it responds with 400", async () => {
        const response = await request(testApp.server).get("/api/purchases");

        expect(response.status).toBe(400);
      });
    });
  });
});
