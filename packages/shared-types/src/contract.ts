export type SalePhase = "upcoming" | "active" | "ended" | "sold_out";

export interface Product {
  id: string;
  name: string;
  description: string | null;
  imageUrl: string | null;
  price: string; // XXX: string instead of number to avoid floating point precision issues with money
}

export interface Sale {
  id: string;
  product: Product;
  phase: SalePhase;
  salePrice: string;
  totalStock: number;
  remainingStock: number;
  startsAt: string;
  endsAt: string;
  serverTime: string; // ISO 8601 — for countdown accuracy, avoids client clock skew
}

export type PurchaseOutcome = "success" | "already_purchased" | "sold_out" | "sale_not_active";

export interface PurchaseRecord {
  id: string;
  saleId: string;
  email: string;
  purchasedAt: string;
}

export interface PurchaseResult {
  status: PurchaseOutcome;
  message: string;
  purchase?: PurchaseRecord;
}

export interface GetSalesParams {
  status?: "active" | "upcoming" | "past";
}

export type GetSalesResponse = Sale[];

export type GetSaleByIdResponse = Sale;

export interface GetPurchasesParams {
  email: string;
}

export type GetPurchasesResponse = PurchaseRecord[];

export interface PostPurchaseBody {
  email: string;
}

export type PostPurchaseResponse = PurchaseResult;
