// XXX: a dev fallback so a fresh clone works before .env is copied — the root
// .env is gitignored, so VITE_API_URL is not guaranteed to be set.
export const DEFAULT_BASE_URL = "http://localhost:3000/api";
export const NETWORK_ERROR_STATUS = 0;
export const NETWORK_ERROR_MESSAGE =
  "Could not reach the server. Check your connection and try again.";
export const UNEXPECTED_ERROR_MESSAGE = "Something went wrong. Please try again.";
