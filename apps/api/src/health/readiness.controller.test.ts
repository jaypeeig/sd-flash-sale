import type { INestApplication } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import request, { type Response } from "supertest";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { AppModule } from "../app.module";
import { ReadinessService } from "./readiness.service";

describe("Given the bootstrapped application", () => {
  let app: INestApplication;
  const getStatus = vi.fn();

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(ReadinessService)
      .useValue({ getStatus })
      .compile();

    app = moduleRef.createNestApplication();
    app.setGlobalPrefix("api");
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  describe("When GET /api/ready is requested and Redis is up", () => {
    let response: Response;

    beforeEach(async () => {
      getStatus.mockResolvedValueOnce({ status: "ready", redis: { status: "up", latencyMs: 1 } });
      response = await request(app.getHttpServer()).get("/api/ready");
    });

    it("Then it responds with 200", () => {
      expect(response.status).toBe(200);
    });

    it("Then it wraps the payload in the response envelope", () => {
      expect(response.body).toEqual({
        statusCode: 200,
        message: "Readiness checked",
        data: { status: "ready", redis: { status: "up", latencyMs: 1 } },
      });
    });
  });

  describe("When GET /api/ready is requested and Redis is down", () => {
    it("Then it still responds with 200, reporting degraded", async () => {
      getStatus.mockResolvedValueOnce({
        status: "degraded",
        redis: { status: "down", error: "connect ECONNREFUSED" },
      });

      const response = await request(app.getHttpServer()).get("/api/ready");

      expect(response.status).toBe(200);
      expect(response.body.data.status).toBe("degraded");
    });
  });
});
