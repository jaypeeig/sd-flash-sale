import { saleId } from "../config/environment.ts";
import { purchase } from "../lib/client.ts";
import { uniqueEmail } from "../lib/identity.ts";

// One purchase attempt against the prepared load-test sale, always a fresh
// email — see lib/identity.ts for why a repeat email would understate
// throughput by tripping the one-per-user constraint after iteration one.
export const attemptPurchase = (): void => {
  purchase(saleId(), uniqueEmail());
};
