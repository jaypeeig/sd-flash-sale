import type { Redis } from "ioredis";

export type ReservationCode =
  | "reserved"
  | "sold_out"
  | "already_purchased"
  | "sale_not_active"
  | "not_warmed";

// The reservePurchase command is registered onto the ioredis instance by
// createRedis() via defineCommand — this augments the type to match.
export interface FlashSaleRedisCommands {
  reservePurchase(
    stockKey: string,
    metaKey: string,
    buyersKey: string,
    email: string,
    now: string,
  ): Promise<ReservationCode>;
}

export type FlashSaleRedis = Redis & FlashSaleRedisCommands;
