import type { PurchaseResult } from "@workspace/shared-types";
import type { ApiError } from "../../api/apiFetch";

export interface PurchaseState {
  result: PurchaseResult | null;
  error: ApiError | null;
  isSubmitting: boolean;
  submit: (saleId: string, email: string) => Promise<PurchaseResult | null>;
}
