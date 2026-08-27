const NAMESPACE = "flashsale";

// Single source of truth for every key shape the system uses — the Redis
// analog of packages/database/src/schema. Grows as caching/reservation
// logic lands; nothing outside this file should hand-build a key string.
export const redisKeys = {
  saleStock: (saleId: string) => `${NAMESPACE}:sale:${saleId}:stock`,
  saleBuyers: (saleId: string) => `${NAMESPACE}:sale:${saleId}:buyers`,
  saleSnapshot: (saleId: string) => `${NAMESPACE}:sale:${saleId}:snapshot`,
  namespacePattern: () => `${NAMESPACE}:*`,
} as const;
