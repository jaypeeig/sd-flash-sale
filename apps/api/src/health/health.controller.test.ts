import type { INestApplication } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import request, { type Response } from "supertest";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { AppModule } from "../app.module";
import { REDIS_CONNECTION } from "../redis/redis.constants";
import type { RedisClient } from "../redis/redis.types";

describe("Given the bootstrapped application", () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(REDIS_CONNECTION)
      .useValue({ status: "ready", quit: async () => "OK" } as unknown as RedisClient)
      .compile();

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

    it("Then it reports redis as up", () => {
      expect(response.body.data.redis).toBe("up");
    });
  });

  describe("When GET /health is requested outside the global prefix", () => {
    it("Then it responds with 404", async () => {
      const response = await request(app.getHttpServer()).get("/health");

      expect(response.status).toBe(404);
    });
  });
});
