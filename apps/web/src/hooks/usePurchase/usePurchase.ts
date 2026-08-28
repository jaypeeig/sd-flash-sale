import type { PurchaseResult } from "@workspace/shared-types";
import { useCallback, useEffect, useRef, useState } from "react";
import { asApiError, type ApiError } from "../../api/apiFetch";
import { postPurchase } from "../../api/sales";
import type { PurchaseState } from "./usePurchase.types";

// XXX: a mutation, not a fetch — deliberately not built on useAsyncData.
export const usePurchase = (): PurchaseState => {
  const [result, setResult] = useState<PurchaseResult | null>(null);
  const [error, setError] = useState<ApiError | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const inFlightRef = useRef(false); // synchronous double-submit guard
  const controllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    return () => controllerRef.current?.abort();
  }, []);

  const submit = useCallback(
    async (saleId: string, email: string): Promise<PurchaseResult | null> => {
      if (inFlightRef.current) return null;
      inFlightRef.current = true;

      const controller = new AbortController();
      controllerRef.current = controller;
      setIsSubmitting(true);
      setError(null);

      try {
        const outcome = await postPurchase(saleId, { email }, controller.signal);
        setResult(outcome);
        return outcome;
      } catch (cause) {
        setError(asApiError(cause));
        setResult(null);
        return null;
      } finally {
        inFlightRef.current = false;
        setIsSubmitting(false);
      }
    },
    [],
  );

  return { result, error, isSubmitting, submit };
};
