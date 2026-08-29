export const PURCHASE_WRITES_QUEUE = "flash-sale.purchase-writes";
export const PURCHASE_WRITES_DEAD_QUEUE = "flash-sale.purchase-writes.dead";

// Tuning knobs, all overridable via env (see apps/worker/src/main.ts) —
// kept here so a default only ever lives in one place.
export const DEFAULT_PREFETCH = 500;
export const DEFAULT_BATCH_SIZE = 200;
export const DEFAULT_BATCH_WINDOW_MS = 50;
export const DEFAULT_MAX_ATTEMPTS = 5;
export const DEFAULT_RETRY_BACKOFF_MS = 200;
