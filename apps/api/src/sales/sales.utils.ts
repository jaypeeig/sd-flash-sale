import type { Sale } from "@workspace/shared-types";
import type { SaleRow } from "./sales.types";

export const mapRowToSale = (row: SaleRow, serverTime: string): Sale => ({
  id: row.id,
  product: {
    id: row.productId,
    name: row.productName,
    description: row.productDescription,
    imageUrl: row.productImageUrl,
    price: row.productPrice,
  },
  phase: row.phase,
  salePrice: row.salePrice,
  totalStock: row.totalStock,
  remainingStock: row.remainingStock,
  startsAt: row.startsAt.toISOString(),
  endsAt: row.endsAt.toISOString(),
  serverTime,
});
