import { connect, purchaseQueueDepth } from "@workspace/queue";

export interface DrainQueueResult {
  drainedMs: number;
  timedOut: boolean;
  finalDepth: number;
}

const POLL_INTERVAL_MS = 250;
const SETTLE_MS = 1_500;
const DEFAULT_TIMEOUT_MS = 60_000;

const sleep = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));

export const waitForQueueDrain = async (
  timeoutMs = DEFAULT_TIMEOUT_MS,
): Promise<DrainQueueResult> => {
  const { channel, close } = await connect();
  const start = Date.now();

  try {
    while (Date.now() - start < timeoutMs) {
      const depth = await purchaseQueueDepth(channel);
      if (depth === 0) {
        await sleep(SETTLE_MS);
        const settledDepth = await purchaseQueueDepth(channel);
        if (settledDepth === 0) {
          return { drainedMs: Date.now() - start, timedOut: false, finalDepth: 0 };
        }
      }
      await sleep(POLL_INTERVAL_MS);
    }

    const finalDepth = await purchaseQueueDepth(channel);
    return { drainedMs: Date.now() - start, timedOut: true, finalDepth };
  } finally {
    await close();
  }
};
