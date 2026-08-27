export type SalePhaseFixture = "active" | "upcoming" | "past" | "sold_out" | "cancelled";

export interface CreateProductOptions {
  name?: string;
  description?: string | null;
  imageUrl?: string | null;
  price?: string;
}

export interface CreateSaleOptions {
  /** Reuses an existing product instead of creating one. */
  productId?: string;
  /** Where the sale sits relative to now. Defaults to "active". */
  phase?: SalePhaseFixture;
  /** Remaining stock. Defaults to totalStock (or 10 if that's also unset). */
  stock?: number;
  totalStock?: number;
  salePrice?: string;
}

export interface CreatePurchaseOptions {
  email?: string;
  /** Must fall within the sale's [startsAt, endsAt) window — the DB trigger
   *  rejects anything outside it. Defaults to the window's midpoint. */
  purchasedAt?: Date;
}
