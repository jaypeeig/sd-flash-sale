import { saleId } from "../config/environment.ts";
import { purchase } from "../lib/client.ts";
import { purchaseEmail } from "../lib/identity.ts";

// Distinct from scenarios/purchase.ts's attemptPurchase: mixes in repeated
// emails (see lib/identity.ts) so the herd generates real same-email
// contention, not just stock exhaustion. capacity-ramp stays on pure unique
// emails on purpose — repeats there would dilute its throughput/latency
// signal with already_purchased noise.
export const attemptFlashSalePurchase = (): void => {
  purchase(saleId(), purchaseEmail());
};
