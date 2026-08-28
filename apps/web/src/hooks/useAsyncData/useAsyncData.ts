import { useCallback, useEffect, useState } from "react";
import { asApiError, type ApiError } from "../../api/apiFetch";
import type { AsyncData } from "./useAsyncData.types";

type Fetcher<T> = ((signal: AbortSignal) => Promise<T>) | null;

export const useAsyncData = <T>(fetcher: Fetcher<T>): AsyncData<T> => {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<ApiError | null>(null);
  const [isLoading, setIsLoading] = useState(fetcher !== null);
  const [reloadToken, setReloadToken] = useState(0);

  const refetch = useCallback(() => {
    setReloadToken((token) => token + 1);
  }, []);

  const [prevAttempt, setPrevAttempt] = useState({ fetcher, reloadToken });
  if (prevAttempt.fetcher !== fetcher || prevAttempt.reloadToken !== reloadToken) {
    setPrevAttempt({ fetcher, reloadToken });
    if (fetcher) {
      setIsLoading(true);
      setError(null);
    } else {
      setIsLoading(false);
      setData(null);
      setError(null);
    }
  }

  useEffect(() => {
    if (!fetcher) return;

    const controller = new AbortController();

    fetcher(controller.signal)
      .then((result) => {
        if (controller.signal.aborted) return;
        setData(result);
        setIsLoading(false);
      })
      .catch((cause: unknown) => {
        if (controller.signal.aborted) return;
        setError(asApiError(cause));
        setIsLoading(false);
      });

    return () => controller.abort();
  }, [fetcher, reloadToken]);

  return { data, error, isLoading, refetch };
};
