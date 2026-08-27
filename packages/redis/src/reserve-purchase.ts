import { redisKeys } from "./keys";
import type { FlashSaleRedis } from "./client.types";

// KEYS[1] stock  KEYS[2] buyers  KEYS[3] snapshot  KEYS[4] desynced
// ARGV[1] normalized email  ARGV[2] now (ms epoch, as a string)
//
// One atomic round trip answers every rejection the purchase endpoint can
// give without ever touching Postgres: not-yet-synced, cancelled, outside
// the sale window, already purchased, or sold out. Only a genuine
// reservation (stock decremented + buyer recorded, both here, atomically)
// proceeds to write through to Postgres.
export const RESERVE_PURCHASE_LUA = `
if redis.call('EXISTS', KEYS[4]) == 1 then
  return {'not_loaded'}
end
if redis.call('EXISTS', KEYS[1]) == 0 or redis.call('EXISTS', KEYS[3]) == 0 then
  return {'not_loaded'}
end

local cancelledAt = redis.call('HGET', KEYS[3], 'cancelledAt')
if cancelledAt and cancelledAt ~= '' then
  return {'sale_not_active'}
end

local startsAt = tonumber(redis.call('HGET', KEYS[3], 'startsAt'))
local endsAt = tonumber(redis.call('HGET', KEYS[3], 'endsAt'))
local now = tonumber(ARGV[2])
if now == nil or startsAt == nil or endsAt == nil or now < startsAt or now >= endsAt then
  return {'sale_not_active'}
end

if redis.call('SISMEMBER', KEYS[2], ARGV[1]) == 1 then
  return {'already_purchased'}
end

local stock = tonumber(redis.call('GET', KEYS[1]))
if stock == nil or stock <= 0 then
  return {'sold_out'}
end

redis.call('SADD', KEYS[2], ARGV[1])
redis.call('DECR', KEYS[1])

local snap = redis.call('HMGET', KEYS[3], 'salePrice', 'productId', 'productName',
  'productDescription', 'productImageUrl', 'productPrice')
return {'reserved', snap[1], snap[2], snap[3], snap[4], snap[5], snap[6]}
`;

export type ReservationCode =
  | "reserved"
  | "sold_out"
  | "already_purchased"
  | "sale_not_active"
  | "not_loaded";

export interface ReservationSnapshot {
  salePrice: string;
  productId: string;
  productName: string;
  productDescription: string | null;
  productImageUrl: string | null;
  productPrice: string;
}

export type ReservationResult =
  | { code: "reserved"; snapshot: ReservationSnapshot }
  | { code: Exclude<ReservationCode, "reserved"> };

export interface ReservePurchaseParams {
  saleId: string;
  /** Must already be normalizeEmail()'d — this function does not normalize. */
  email: string;
  now: number;
}

const emptyToNull = (value: string | null | undefined): string | null =>
  value === undefined || value === "" ? null : value;

export const reservePurchase = async (
  redis: FlashSaleRedis,
  { saleId, email, now }: ReservePurchaseParams,
): Promise<ReservationResult> => {
  const reply = await redis.reservePurchase(
    redisKeys.saleStock(saleId),
    redisKeys.saleBuyers(saleId),
    redisKeys.saleSnapshot(saleId),
    redisKeys.saleDesynced(saleId),
    email,
    String(now),
  );

  const [
    code,
    salePrice,
    productId,
    productName,
    productDescription,
    productImageUrl,
    productPrice,
  ] = reply;

  if (code !== "reserved") {
    return { code: code as Exclude<ReservationCode, "reserved"> };
  }

  return {
    code: "reserved",
    snapshot: {
      salePrice: salePrice ?? "",
      productId: productId ?? "",
      productName: productName ?? "",
      productDescription: emptyToNull(productDescription),
      productImageUrl: emptyToNull(productImageUrl),
      productPrice: productPrice ?? "",
    },
  };
};
