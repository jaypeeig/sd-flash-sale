import type {
  GetSalesParams,
  PostPurchaseBody,
  PurchaseResult,
  Sale,
} from "@workspace/shared-types";
import { apiFetch } from "./apiFetch";

export const getSales = (status: GetSalesParams["status"], signal?: AbortSignal): Promise<Sale[]> =>
  apiFetch<Sale[]>("/sales", { query: { status }, signal });

export const getSaleById = (id: string, signal?: AbortSignal): Promise<Sale> =>
  apiFetch<Sale>(`/sales/${id}`, { signal });

export const postPurchase = (
  saleId: string,
  body: PostPurchaseBody,
  signal?: AbortSignal,
): Promise<PurchaseResult> =>
  apiFetch<PurchaseResult>(`/sales/${saleId}/purchase`, { method: "POST", body, signal });
