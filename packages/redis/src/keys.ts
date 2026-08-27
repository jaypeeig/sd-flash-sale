const NAMESPACE = "flashsale";

export const redisKeys = {
  saleStock: (saleId: string) => `${NAMESPACE}:sale:${saleId}:stock`,
  saleBuyers: (saleId: string) => `${NAMESPACE}:sale:${saleId}:buyers`,
  saleSnapshot: (saleId: string) => `${NAMESPACE}:sale:${saleId}:snapshot`,
  // Presence-only flag: a sale whose Postgres-fallback purchases may have
  // gone unrecorded in Redis (outage, or mid-outage reconnect). Checked
  // first by the reservePurchase Lua script, which refuses the fast path
  // (returns "not_loaded") while it's set.
  saleDesynced: (saleId: string) => `${NAMESPACE}:sale:${saleId}:desynced`,
  namespacePattern: () => `${NAMESPACE}:*`,
  saleStockPattern: () => `${NAMESPACE}:sale:*:stock`,
} as const;

const SALE_STOCK_KEY_RE = /^flashsale:sale:(.+):stock$/;

export const saleIdFromStockKey = (key: string): string | undefined =>
  SALE_STOCK_KEY_RE.exec(key)?.[1];
