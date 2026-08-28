import { Inject, Injectable, Logger } from "@nestjs/common";
import { reservePurchase, type ReservationCode } from "@workspace/redis";
import { REDIS_CONNECTION } from "../redis/redis.constants";
import type { Redis } from "../redis/redis.types";

@Injectable()
export class PurchaseReserveService {
  private readonly logger = new Logger(PurchaseReserveService.name);

  constructor(@Inject(REDIS_CONNECTION) private readonly redis: Redis) {}

  // Redis as the gate: null means "don't trust Redis right now" (down, or
  // the round trip itself failed) rather than a real rejection — the
  // caller treats that identically to "not_warmed".
  async reserve(saleId: string, email: string): Promise<ReservationCode | null> {
    if (this.redis.status !== "ready") {
      return null;
    }

    try {
      return await reservePurchase(this.redis, { saleId, email, now: Date.now() });
    } catch (error) {
      this.logger.warn(
        `Redis reservation failed for sale ${saleId} — falling back to Postgres: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
      return null;
    }
  }
}
