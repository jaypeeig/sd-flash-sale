import type { Redis } from "ioredis";

export type FlashSaleRedis = Redis & {
  reservePurchase(
    stockKey: string,
    buyersKey: string,
    snapshotKey: string,
    desyncedKey: string,
    email: string,
    nowMs: string,
  ): Promise<[code: string, ...snapshot: (string | null)[]]>;
  releasePurchase(stockKey: string, buyersKey: string, email: string): Promise<number>;
};
