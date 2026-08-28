import { beforeEach, describe, expect, it } from "vitest";
import type { Redis } from "../redis/redis.types";
import { ReadinessService } from "./readiness.service";
import type { ReadinessStatus } from "./readiness.types";

const fakeRedis = (ping: () => Promise<"PONG">): Redis => ({ ping }) as unknown as Redis;

describe("Given Redis responds to a ping", () => {
  describe("When readiness is checked", () => {
    let result: ReadinessStatus;

    beforeEach(async () => {
      const service = new ReadinessService(fakeRedis(() => Promise.resolve("PONG")));
      result = await service.getStatus();
    });

    it("Then it reports the service as ready", () => {
      expect(result.status).toBe("ready");
    });

    it("Then it reports Redis as up", () => {
      expect(result.redis.status).toBe("up");
    });
  });
});

describe("Given Redis rejects the ping", () => {
  describe("When readiness is checked", () => {
    let result: ReadinessStatus;

    beforeEach(async () => {
      const service = new ReadinessService(
        fakeRedis(() => Promise.reject(new Error("connect ECONNREFUSED"))),
      );
      result = await service.getStatus();
    });

    it("Then it reports the service as degraded", () => {
      expect(result.status).toBe("degraded");
    });

    it("Then it reports Redis as down with the failure reason", () => {
      expect(result.redis).toEqual({ status: "down", error: "connect ECONNREFUSED" });
    });
  });
});
