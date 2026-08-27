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
  product: Product;
  email: string;
  price: string;
  purchasedAt: string;
}

export interface PurchaseResult {
  status: PurchaseOutcome;
  message: string;
  purchase?: PurchaseRecord;
}

// XXX: Envelope every endpoint responds with on success
export interface ApiResponse<T> {
  statusCode: number;
  message: string;
  data: T;
}

export interface GetSalesParams {
  status?: "active" | "upcoming" | "past";
}

export type GetSalesResponse = ApiResponse<Sale[]>;

export type GetSaleByIdResponse = ApiResponse<Sale>;

export interface GetPurchasesParams {
  email: string;
}

export type GetPurchasesResponse = ApiResponse<PurchaseRecord[]>;

export interface PostPurchaseBody {
  email: string;
}

export type PostPurchaseResponse = ApiResponse<PurchaseResult>;
