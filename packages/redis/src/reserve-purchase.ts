import type { FlashSaleRedis, ReservationCode } from "./client.types";
import { redisKeys } from "./keys";
import { normalizeEmail } from "./normalize-email";

export interface ReservePurchaseParams {
  saleId: string;
  email: string;
  now?: number;
}

export const reservePurchase = (
  redis: FlashSaleRedis,
  { saleId, email, now = Date.now() }: ReservePurchaseParams,
): Promise<ReservationCode> =>
  redis.reservePurchase(
    redisKeys.saleStock(saleId),
    redisKeys.saleMeta(saleId),
    redisKeys.saleBuyers(saleId),
    normalizeEmail(email),
    String(now),
  );
