import type { Channel, ConsumeMessage } from "amqplib";
import {
  DEFAULT_BATCH_SIZE,
  DEFAULT_BATCH_WINDOW_MS,
  DEFAULT_MAX_ATTEMPTS,
  DEFAULT_PREFETCH,
  DEFAULT_RETRY_BACKOFF_MS,
  PURCHASE_WRITES_QUEUE,
} from "./constants";
import type { PurchaseWriteMessage } from "./client.types";

export interface DrainPurchaseWritesOptions {
  channel: Channel;
  writeBatch: (entries: PurchaseWriteMessage[]) => Promise<void>;
  prefetch?: number;
  batchSize?: number;
  batchWindowMs?: number;
  maxAttempts?: number;
  retryBackoffMs?: number;
  /** Fires once per batch that exhausts retries — the whole retry story;
   * deliberately no reconciliation beyond this. */
  onDeadLettered?: (entries: PurchaseWriteMessage[], error: unknown) => void;
}

export interface DrainHandle {
  /** Stops consuming, finishes any in-flight or pending batch, then resolves. */
  stop: () => Promise<void>;
}

const sleep = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));

export const drainPurchaseWrites = async ({
  channel,
  writeBatch,
  prefetch = DEFAULT_PREFETCH,
  batchSize = DEFAULT_BATCH_SIZE,
  batchWindowMs = DEFAULT_BATCH_WINDOW_MS,
  maxAttempts = DEFAULT_MAX_ATTEMPTS,
  retryBackoffMs = DEFAULT_RETRY_BACKOFF_MS,
  onDeadLettered,
}: DrainPurchaseWritesOptions): Promise<DrainHandle> => {
  await channel.prefetch(prefetch);

  let pending: ConsumeMessage[] = [];
  let flushTimer: NodeJS.Timeout | undefined;
  let flushing = Promise.resolve();
  let stopped = false;

  const flush = async (): Promise<void> => {
    if (pending.length === 0) return;
    const batch = pending;
    pending = [];

    const entries = batch.map(
      (msg) => JSON.parse(msg.content.toString("utf8")) as PurchaseWriteMessage,
    );

    let lastError: unknown;
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        await writeBatch(entries);
        channel.ack(batch[batch.length - 1], true);
        return;
      } catch (error) {
        lastError = error;
        if (attempt < maxAttempts) {
          await sleep(retryBackoffMs * attempt);
        }
      }
    }

    for (const msg of batch) {
      channel.nack(msg, false, false);
    }
    onDeadLettered?.(entries, lastError);
  };

  const scheduleFlush = (): void => {
    if (flushTimer) return;
    flushTimer = setTimeout(() => {
      flushTimer = undefined;
      flushing = flushing.then(flush);
    }, batchWindowMs);
  };

  const { consumerTag } = await channel.consume(PURCHASE_WRITES_QUEUE, (msg) => {
    if (!msg || stopped) return;
    pending.push(msg);
    if (pending.length >= batchSize) {
      if (flushTimer) {
        clearTimeout(flushTimer);
        flushTimer = undefined;
      }
      flushing = flushing.then(flush);
    } else {
      scheduleFlush();
    }
  });

  return {
    stop: async () => {
      stopped = true;
      await channel.cancel(consumerTag);
      if (flushTimer) {
        clearTimeout(flushTimer);
        flushTimer = undefined;
      }
      flushing = flushing.then(flush);
      await flushing;
    },
  };
};
