import type { GetSalesParams, Sale } from "@workspace/shared-types";
import { useCallback } from "react";
import { getSales } from "../api/sales";
import type { AsyncData } from "./useAsyncData";
import { useAsyncData } from "./useAsyncData";

export const useSales = (status: GetSalesParams["status"]): AsyncData<Sale[]> => {
  const fetcher = useCallback((signal: AbortSignal) => getSales(status, signal), [status]);
  return useAsyncData(fetcher);
};
