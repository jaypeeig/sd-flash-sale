import { redisKeys } from "./keys";
import type { FlashSaleRedis } from "./client.types";

// KEYS[1] stock  KEYS[2] buyers  ARGV[1] normalized email
//
// Compensates a reservation that reservePurchase already granted but that
// Postgres then failed to commit (pool exhaustion, timeout, an unexpected
// constraint failure). Idempotent — only mutates if the email is still a
// member of the buyer set, so a retried release can't double-increment
// stock.
export const RELEASE_PURCHASE_LUA = `
if redis.call('SISMEMBER', KEYS[2], ARGV[1]) == 1 then
  redis.call('SREM', KEYS[2], ARGV[1])
  redis.call('INCR', KEYS[1])
  return 1
end
return 0
`;

export interface ReleasePurchaseParams {
  saleId: string;
  /** Must already be normalizeEmail()'d — this function does not normalize. */
  email: string;
}

// Best-effort by design: a failure here is logged by the caller, not
// thrown — the compensating release must never mask the original error
// that triggered it. Worst case on a failed release is an undersold unit
// and one buyer wrongly locked out of the fast path, never an oversell.
export const releasePurchase = async (
  redis: FlashSaleRedis,
  { saleId, email }: ReleasePurchaseParams,
): Promise<boolean> => {
  const released = await redis.releasePurchase(
    redisKeys.saleStock(saleId),
    redisKeys.saleBuyers(saleId),
    email,
  );
  return released === 1;
};
