import { Inject, Injectable } from "@nestjs/common";
import { REDIS_CONNECTION } from "../redis/redis.constants";
import type { RedisClient } from "../redis/redis.types";
import type { HealthStatus } from "./health.types";

@Injectable()
export class HealthService {
  constructor(@Inject(REDIS_CONNECTION) private readonly redis: RedisClient) {}

  getStatus(): HealthStatus {
    return {
      status: "ok",
      uptime: Math.floor(process.uptime()),
      // A local property read, not a round trip — health stays cheap and
      // cannot hang when Redis is unreachable.
      redis: this.redis.status === "ready" ? "up" : "down",
    };
  }
}

export type { HealthStatus };
