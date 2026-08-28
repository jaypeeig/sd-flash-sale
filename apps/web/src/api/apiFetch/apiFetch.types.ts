export interface ApiFetchOptions {
  method?: "GET" | "POST";
  body?: unknown;
  query?: Record<string, string | undefined>;
  signal?: AbortSignal;
}
