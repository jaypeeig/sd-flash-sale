import type { INestApplication } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import type { PurchaseRecord } from "@workspace/shared-types";
import request from "supertest";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { AppModule } from "../app.module";
import { PurchasesService } from "./purchases.service";

const fakePurchase: PurchaseRecord = {
  id: "33333333-3333-3333-a333-333333333333",
  saleId: "11111111-1111-1111-a111-111111111111",
  product: {
    id: "22222222-2222-2222-a222-222222222222",
    name: "Field Recorder MK1",
    description: "Hand-assembled portable recorder.",
    imageUrl: "https://picsum.photos/seed/recorder/640/480",
    price: "229.00",
  },
  email: "user@example.com",
  price: "189.00",
  purchasedAt: "2026-08-26T10:32:15.000Z",
};

describe("Given the bootstrapped application", () => {
  let app: INestApplication;
  const findByEmail = vi.fn();

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(PurchasesService)
      .useValue({ purchase: vi.fn(), findByEmail })
      .compile();

    app = moduleRef.createNestApplication();
    app.setGlobalPrefix("api");
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  describe("When GET /api/purchases is requested with a valid email", () => {
    it("Then it returns the enveloped purchase list", async () => {
      findByEmail.mockResolvedValueOnce([fakePurchase]);

      const response = await request(app.getHttpServer()).get(
        "/api/purchases?email=user@example.com",
      );

      expect(response.body).toEqual({
        statusCode: 200,
        message: "Purchases retrieved successfully",
        data: [fakePurchase],
      });
    });
  });

  describe("When GET /api/purchases is requested without an email", () => {
    it("Then it responds with 400", async () => {
      const response = await request(app.getHttpServer()).get("/api/purchases");

      expect(response.status).toBe(400);
    });
  });

  describe("When GET /api/purchases is requested with an invalid email", () => {
    it("Then it responds with 400", async () => {
      const response = await request(app.getHttpServer()).get("/api/purchases?email=not-an-email");

      expect(response.status).toBe(400);
    });
  });
});
