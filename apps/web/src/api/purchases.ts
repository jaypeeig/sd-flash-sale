import type { PurchaseRecord } from "@workspace/shared-types";
import { apiFetch } from "./apiFetch";

export const getPurchases = (email: string, signal?: AbortSignal): Promise<PurchaseRecord[]> =>
  apiFetch<PurchaseRecord[]>("/purchases", { query: { email }, signal });
