import { beforeEach, describe, expect, it } from "vitest";
import type { RedisClient } from "../redis/redis.types";
import { HealthService } from "./health.service";
import type { HealthStatus } from "./health.types";

const createRedisStub = (status: RedisClient["status"]): RedisClient => ({ status }) as RedisClient;

describe("Given a health service backed by a ready Redis client", () => {
  describe("When the status is requested", () => {
    let status: HealthStatus;

    beforeEach(() => {
      status = new HealthService(createRedisStub("ready")).getStatus();
    });

    it("Then it reports status ok", () => {
      expect(status.status).toBe("ok");
    });

    it("Then it reports redis as up", () => {
      expect(status.redis).toBe("up");
    });
  });
});

describe("Given a health service backed by a disconnected Redis client", () => {
  describe("When the status is requested", () => {
    it("Then it reports redis as down", () => {
      const status = new HealthService(createRedisStub("close")).getStatus();

      expect(status.redis).toBe("down");
    });
  });
});
