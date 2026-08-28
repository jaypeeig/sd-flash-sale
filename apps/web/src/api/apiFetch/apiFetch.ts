import type { ApiResponse } from "@workspace/shared-types";
import {
  NETWORK_ERROR_MESSAGE,
  NETWORK_ERROR_STATUS,
  UNEXPECTED_ERROR_MESSAGE,
} from "./apiFetch.constants";
import type { ApiFetchOptions } from "./apiFetch.types";
import { ApiError, baseUrl, isAbortError, isRecord, toApiError } from "./apiFetch.utils";

export const apiFetch = async <T>(path: string, options: ApiFetchOptions = {}): Promise<T> => {
  const url = new URL(`${baseUrl()}${path}`, globalThis.location.href);
  for (const [key, value] of Object.entries(options.query ?? {})) {
    if (value !== undefined) url.searchParams.set(key, value);
  }

  let response: Response;
  try {
    response = await fetch(url, {
      method: options.method ?? "GET",
      headers: { "Content-Type": "application/json" },
      body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
      signal: options.signal,
    });
  } catch (cause) {
    if (isAbortError(cause)) throw cause;
    throw new ApiError(NETWORK_ERROR_STATUS, NETWORK_ERROR_MESSAGE);
  }

  const payload: unknown = await response.json().catch(() => null);

  if (!response.ok) throw toApiError(response.status, payload);
  if (!isRecord(payload) || !("data" in payload)) {
    throw new ApiError(response.status, UNEXPECTED_ERROR_MESSAGE);
  }

  return (payload as unknown as ApiResponse<T>).data;
};
