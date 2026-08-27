import type { GetSaleByIdResponse, GetSalesResponse } from "@workspace/shared-types";
import request, { type Response } from "supertest";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { createSale } from "./setup/fixtures";
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

  describe("Given an active, upcoming, past, sold-out, and cancelled sale", () => {
    let activeSaleId: string;
    let upcomingSaleId: string;
    let pastSaleId: string;
    let soldOutSaleId: string;
    let cancelledSaleId: string;

    beforeEach(async () => {
      activeSaleId = (await createSale(testApp.db, { phase: "active" })).id;
      upcomingSaleId = (await createSale(testApp.db, { phase: "upcoming" })).id;
      pastSaleId = (await createSale(testApp.db, { phase: "past" })).id;
      soldOutSaleId = (await createSale(testApp.db, { phase: "sold_out" })).id;
      cancelledSaleId = (await createSale(testApp.db, { phase: "cancelled" })).id;
    });

    describe("When GET /api/sales?status=active is requested", () => {
      let response: Response;

      beforeEach(async () => {
        response = await request(testApp.server).get("/api/sales?status=active");
      });

      it("Then it responds with 200", () => {
        expect(response.status).toBe(200);
      });

      it("Then it returns only the active sale", () => {
        const body: GetSalesResponse = response.body;
        expect(body.data.map((sale) => sale.id)).toEqual([activeSaleId]);
      });
    });

    describe("When GET /api/sales?status=upcoming is requested", () => {
      it("Then it returns only the upcoming sale", async () => {
        const response = await request(testApp.server).get("/api/sales?status=upcoming");

        const body: GetSalesResponse = response.body;
        expect(body.data.map((sale) => sale.id)).toEqual([upcomingSaleId]);
      });
    });

    describe("When GET /api/sales?status=past is requested", () => {
      it("Then it returns the past sale and the sold-out sale, but not the active one", async () => {
        const response = await request(testApp.server).get("/api/sales?status=past");

        const body: GetSalesResponse = response.body;
        expect(new Set(body.data.map((sale) => sale.id))).toEqual(
          new Set([pastSaleId, soldOutSaleId]),
        );
      });
    });

    describe("When GET /api/sales is requested with no filter", () => {
      it("Then a cancelled sale is never included", async () => {
        const response = await request(testApp.server).get("/api/sales");

        const body: GetSalesResponse = response.body;
        expect(body.data.map((sale) => sale.id)).not.toContain(cancelledSaleId);
      });
    });

    describe("When GET /api/sales/:id is requested for the sold-out sale", () => {
      it("Then its phase is reported as sold_out", async () => {
        const response = await request(testApp.server).get(`/api/sales/${soldOutSaleId}`);

        const body: GetSaleByIdResponse = response.body;
        expect(body.data.phase).toBe("sold_out");
      });
    });

    describe("When GET /api/sales/:id is requested for the active sale", () => {
      let response: Response;

      beforeEach(async () => {
        response = await request(testApp.server).get(`/api/sales/${activeSaleId}`);
      });

      it("Then it responds with 200", () => {
        expect(response.status).toBe(200);
      });

      it("Then it wraps the payload in the response envelope", () => {
        const body: GetSaleByIdResponse = response.body;
        expect(body.message).toBe("Sale retrieved successfully");
      });

      it("Then it returns that sale's id", () => {
        const body: GetSaleByIdResponse = response.body;
        expect(body.data.id).toBe(activeSaleId);
      });
    });

    describe("When GET /api/sales/:id is requested for the cancelled sale", () => {
      it("Then it responds with 404", async () => {
        const response = await request(testApp.server).get(`/api/sales/${cancelledSaleId}`);

        expect(response.status).toBe(404);
      });
    });
  });

  describe("When GET /api/sales/:id is requested for an unknown but valid uuid", () => {
    it("Then it responds with 404", async () => {
      const response = await request(testApp.server).get(
        "/api/sales/00000000-0000-0000-0000-000000000000",
      );

      expect(response.status).toBe(404);
    });
  });

  describe("When GET /api/sales/:id is requested with a non-uuid id", () => {
    it("Then it responds with 400", async () => {
      const response = await request(testApp.server).get("/api/sales/not-a-uuid");

      expect(response.status).toBe(400);
    });
  });

  describe("When GET /api/sales is requested with an invalid status", () => {
    it("Then it responds with 400", async () => {
      const response = await request(testApp.server).get("/api/sales?status=bogus");

      expect(response.status).toBe(400);
    });
  });
});
