import type { INestApplication } from "@nestjs/common";
import { NotFoundException } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import type { Sale } from "@workspace/shared-types";
import request from "supertest";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { AppModule } from "../app.module";
import { PurchasesService } from "../purchases/purchases.service";
import { SalesService } from "./sales.service";

const fakeSale: Sale = {
  id: "11111111-1111-1111-a111-111111111111",
  product: {
    id: "22222222-2222-2222-a222-222222222222",
    name: "Field Recorder MK1",
    description: "Hand-assembled portable recorder.",
    imageUrl: "https://picsum.photos/seed/recorder/640/480",
    price: "229.00",
  },
  phase: "active",
  salePrice: "189.00",
  totalStock: 50,
  remainingStock: 49,
  startsAt: "2026-08-26T00:00:00.000Z",
  endsAt: "2026-08-27T00:00:00.000Z",
  serverTime: "2026-08-26T12:00:00.000Z",
};

describe("Given the bootstrapped application", () => {
  let app: INestApplication;
  const findAll = vi.fn();
  const findById = vi.fn();
  const purchase = vi.fn();

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(SalesService)
      .useValue({ findAll, findById })
      .overrideProvider(PurchasesService)
      .useValue({ purchase, findByEmail: vi.fn() })
      .compile();

    app = moduleRef.createNestApplication();
    app.setGlobalPrefix("api");
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  describe("When GET /api/sales is requested", () => {
    it("Then it returns the enveloped list from the service", async () => {
      findAll.mockResolvedValueOnce([fakeSale]);

      const response = await request(app.getHttpServer()).get("/api/sales");

      expect(response.body).toEqual({
        statusCode: 200,
        message: "Sales retrieved successfully",
        data: [fakeSale],
      });
    });
  });

  describe("When GET /api/sales is requested with an invalid status", () => {
    it("Then it responds with 400", async () => {
      const response = await request(app.getHttpServer()).get("/api/sales?status=bogus");

      expect(response.status).toBe(400);
    });
  });

  describe("When GET /api/sales/:id is requested for an existing sale", () => {
    it("Then it returns the enveloped sale", async () => {
      findById.mockResolvedValueOnce(fakeSale);

      const response = await request(app.getHttpServer()).get(`/api/sales/${fakeSale.id}`);

      expect(response.body.data).toEqual(fakeSale);
    });
  });

  describe("When GET /api/sales/:id is requested for a non-UUID id", () => {
    it("Then it responds with 400", async () => {
      const response = await request(app.getHttpServer()).get("/api/sales/not-a-uuid");

      expect(response.status).toBe(400);
    });
  });

  describe("When GET /api/sales/:id is requested for a sale that does not exist", () => {
    it("Then it responds with 404", async () => {
      findById.mockRejectedValueOnce(new NotFoundException("Sale not found"));

      const response = await request(app.getHttpServer()).get(
        "/api/sales/11111111-1111-1111-a111-111111111111",
      );

      expect(response.status).toBe(404);
    });
  });

  describe("When POST /api/sales/:id/purchase is requested with a valid email", () => {
    it("Then it delegates to the purchases service and returns 200", async () => {
      purchase.mockResolvedValueOnce({ status: "success", message: "ok" });

      const response = await request(app.getHttpServer())
        .post(`/api/sales/${fakeSale.id}/purchase`)
        .send({ email: "user@example.com" });

      expect(response.status).toBe(200);
    });
  });

  describe("When POST /api/sales/:id/purchase is requested with an invalid email", () => {
    it("Then it responds with 400", async () => {
      const response = await request(app.getHttpServer())
        .post(`/api/sales/${fakeSale.id}/purchase`)
        .send({ email: "not-an-email" });

      expect(response.status).toBe(400);
    });
  });
});
