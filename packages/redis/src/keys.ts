const NAMESPACE = "flashsale";

export const redisKeys = {
  saleStock: (saleId: string) => `${NAMESPACE}:sale:${saleId}:stock`,
  saleMeta: (saleId: string) => `${NAMESPACE}:sale:${saleId}:meta`,
  saleBuyers: (saleId: string) => `${NAMESPACE}:sale:${saleId}:buyers`,
  namespacePattern: () => `${NAMESPACE}:*`,
} as const;
