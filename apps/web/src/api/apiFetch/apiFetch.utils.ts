import { DEFAULT_BASE_URL, UNEXPECTED_ERROR_MESSAGE } from "./apiFetch.constants";

export class ApiError extends Error {
  status: number; // HTTP status, or 0 when the request never reached the server
  details: string[]; // per-field messages from a 400 "Validation failed" body

  constructor(status: number, message: string, details: string[] = []) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.details = details;
  }
}

// XXX: read per call, not once at module load — Vite inlines this literal at
// build time, but vitest needs vi.stubEnv to be able to override it per test.
export const baseUrl = (): string =>
  (import.meta.env.VITE_API_URL ?? DEFAULT_BASE_URL).replace(/\/$/, "");

export const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

// XXX: duck-type on `name`, not `instanceof DOMException`/`instanceof Error` —
// jsdom's DOMException isn't instanceof its own realm's Error, so an
// instanceof check here silently fails under vitest.
export const isAbortError = (cause: unknown): boolean =>
  isRecord(cause) && cause.name === "AbortError";

// XXX: error bodies are NOT enveloped — 404/500 are { statusCode, message, error }
// and 400 is { statusCode: 400, message: "Validation failed", errors: ZodIssue[] }.
export const toApiError = (status: number, payload: unknown): ApiError => {
  const message =
    isRecord(payload) && typeof payload.message === "string"
      ? payload.message
      : UNEXPECTED_ERROR_MESSAGE;

  const details =
    isRecord(payload) && Array.isArray(payload.errors)
      ? payload.errors
          .map((issue) =>
            isRecord(issue) && typeof issue.message === "string" ? issue.message : null,
          )
          .filter((issue): issue is string => issue !== null)
      : [];

  return new ApiError(status, message, details);
};

export const asApiError = (cause: unknown): ApiError =>
  cause instanceof ApiError ? cause : new ApiError(0, UNEXPECTED_ERROR_MESSAGE);
