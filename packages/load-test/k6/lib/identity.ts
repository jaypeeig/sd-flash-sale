import { LOAD_TEST_EMAIL_DOMAIN } from "../../shared/constants.ts";
import { emailRepeatPoolSize, emailRepeatShare, runId } from "../config/environment.ts";

// Unique per iteration: `purchases_one_per_user_per_sale` would otherwise
// turn the purchase baseline into an `already_purchased` benchmark after the
// first iteration per VU. __VU/__ITER are k6 globals — no import needed.
export const uniqueEmail = (): string =>
  `vu${__VU}-iter${__ITER}-${runId}@${LOAD_TEST_EMAIL_DOMAIN}`;

// A fraction of calls return one of a small, fixed pool of emails instead of
// a fresh one — real flash-sale traffic isn't only first-time attempts, some
// share of users refresh/retry. Used by flash-sale-spike so the herd
// actually produces same-email collisions under real network+DB
// concurrency — a purely unique-email stream would never trigger
// already_purchased or exercise the unique constraint at all, only the
// stock-exhaustion path.
export const purchaseEmail = (): string => {
  if (Math.random() >= emailRepeatShare(0.3)) {
    return uniqueEmail();
  }
  const slot = Math.floor(Math.random() * emailRepeatPoolSize(200));
  return `repeat${slot}-${runId}@${LOAD_TEST_EMAIL_DOMAIN}`;
};
