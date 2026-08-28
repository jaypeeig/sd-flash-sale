import type { PurchaseRecord } from "@workspace/shared-types";
import { useMemo } from "react";
import { getPurchases } from "../api/purchases";
import type { AsyncData } from "./useAsyncData";
import { useAsyncData } from "./useAsyncData";

// XXX: accepting `string | null` lets OrdersPage pass useUser().email straight
// through with no non-null assertion, even though RequireAuth guarantees it.
export const usePurchases = (email: string | null): AsyncData<PurchaseRecord[]> => {
  const fetcher = useMemo(
    () => (email === null ? null : (signal: AbortSignal) => getPurchases(email, signal)),
    [email],
  );
  return useAsyncData(fetcher);
};
