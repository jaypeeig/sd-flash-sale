import type { Sale, SalePhase } from "@workspace/shared-types";
import type { SaleRow } from "./sales.types";

export const derivePhase = (row: SaleRow, now: Date): SalePhase => {
  if (row.startsAt > now) {
    return "upcoming";
  }
  if (row.endsAt <= now) {
    return "ended";
  }
  if (row.remainingStock <= 0) {
    return "sold_out";
  }
  return "active";
};

// The gate a purchase attempt cares about: the sale window is open and it
// hasn't been cancelled. Deliberately not phase-based — it ignores stock
// (the transaction's conditional decrement is the only stock check) and
// cancellation isn't one of the SalePhase values.
export const isSaleOpen = (row: SaleRow, now: Date): boolean =>
  row.cancelledAt === null && row.startsAt <= now && now < row.endsAt;

export const mapRowToSale = (row: SaleRow, now: Date): Sale => ({
  id: row.id,
  product: {
    id: row.productId,
    name: row.productName,
    description: row.productDescription,
    imageUrl: row.productImageUrl,
    price: row.productPrice,
  },
  phase: derivePhase(row, now),
  salePrice: row.salePrice,
  totalStock: row.totalStock,
  remainingStock: row.remainingStock,
  startsAt: row.startsAt.toISOString(),
  endsAt: row.endsAt.toISOString(),
  serverTime: now.toISOString(),
});
