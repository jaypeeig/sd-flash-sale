import { Inject, Injectable } from "@nestjs/common";
import { REDIS_CONNECTION } from "../redis/redis.constants";
import type { Redis } from "../redis/redis.types";
import type { ReadinessStatus, RedisReadiness } from "./readiness.types";

@Injectable()
export class ReadinessService {
  constructor(@Inject(REDIS_CONNECTION) private readonly redis: Redis) {}

  async getStatus(): Promise<ReadinessStatus> {
    const redis = await this.checkRedis();

    return {
      status: redis.status === "up" ? "ready" : "degraded",
      redis,
    };
  }

  private async checkRedis(): Promise<RedisReadiness> {
    // Always actually pings rather than trusting `redis.status` alone —
    // the client connects lazily (see REDIS_DEFAULT_OPTIONS), so a fresh
    // boot sits at "wait" until something issues a command. A real ping
    // is what both proves liveness and (on a cold start) establishes the
    // connection so the purchase path's cheap status check goes "ready".
    try {
      const startedAt = Date.now();
      await this.redis.ping();
      return { status: "up", latencyMs: Date.now() - startedAt };
    } catch (error) {
      return { status: "down", error: error instanceof Error ? error.message : String(error) };
    }
  }
}
