import type { INestApplication } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import request, { type Response } from "supertest";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { AppModule } from "../app.module";

describe("Given the bootstrapped application", () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();

    app = moduleRef.createNestApplication();
    app.setGlobalPrefix("api");
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  describe("When GET /api/health is requested", () => {
    let response: Response;

    beforeEach(async () => {
      response = await request(app.getHttpServer()).get("/api/health");
    });

    it("Then it responds with 200", () => {
      expect(response.status).toBe(200);
    });

    it("Then it wraps the payload in the response envelope", () => {
      expect(response.body.statusCode).toBe(200);
    });

    it("Then it reports an ok status", () => {
      expect(response.body.data.status).toBe("ok");
    });
  });

  describe("When GET /health is requested outside the global prefix", () => {
    it("Then it responds with 404", async () => {
      const response = await request(app.getHttpServer()).get("/health");

      expect(response.status).toBe(404);
    });
  });
});
