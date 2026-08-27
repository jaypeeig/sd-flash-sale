import { Counter, Trend } from "k6/metrics";
import type { PurchaseOutcome } from "./api.types.ts";

// One counter per PurchaseOutcome, so a summary shows *why* requests
// succeeded or not (sold_out vs. already_purchased vs. a real error) instead
// of a single opaque success/fail split.
const purchaseOutcomeCounters: Record<PurchaseOutcome, Counter> = {
  success: new Counter("purchase_outcome_success"),
  already_purchased: new Counter("purchase_outcome_already_purchased"),
  sold_out: new Counter("purchase_outcome_sold_out"),
  sale_not_active: new Counter("purchase_outcome_sale_not_active"),
};

export const recordPurchaseOutcome = (outcome: PurchaseOutcome): void => {
  purchaseOutcomeCounters[outcome].add(1);
};

// Not a PurchaseOutcome — the API never sent one back to classify. Kept as
// its own counter (not folded into purchaseOutcomeCounters) so its key
// doesn't have to lie about being part of the PurchaseResult union. Without
// this, a run's outcome counts silently undercount http_reqs by exactly the
// requests that failed at the transport level instead of resolving one of
// the four documented outcomes.
const purchaseErrorCounter = new Counter("purchase_outcome_error");

export const recordPurchaseError = (): void => {
  purchaseErrorCounter.add(1);
};

export const purchaseOutcomeMetricNames = Object.keys(purchaseOutcomeCounters) as PurchaseOutcome[];
export const purchaseErrorMetricName = "purchase_outcome_error";

// Per-endpoint latency, separate from k6's built-in http_req_duration (which
// blends every request together) — the read and purchase paths have very
// different cost profiles and a blended p95 hides both.
export const listSalesDuration = new Trend("list_sales_duration", true);
export const getSaleDuration = new Trend("get_sale_duration", true);
export const purchaseDuration = new Trend("purchase_duration", true);
