import type { ConsumeMessage } from "amqplib";
import { describe, expect, it, vi } from "vitest";
import { drainPurchaseWrites } from "./drain";
import type { Channel } from "./client.types";
import type { PurchaseWriteMessage } from "./client.types";

const sleep = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));

const makeMessage = (payload: PurchaseWriteMessage): ConsumeMessage =>
  ({
    content: Buffer.from(JSON.stringify(payload)),
  }) as unknown as ConsumeMessage;

const entry = (overrides: Partial<PurchaseWriteMessage> = {}): PurchaseWriteMessage => ({
  saleId: "sale-1",
  email: "buyer@example.com",
  reservedAt: Date.now(),
  ...overrides,
});

const createFakeChannel = () => {
  let onMessage: ((msg: ConsumeMessage | null) => void) | undefined;
  const acked: ConsumeMessage[] = [];
  const nacked: ConsumeMessage[] = [];

  const channel = {
    prefetch: vi.fn(() => Promise.resolve()),
    consume: vi.fn((_queue: string, cb: (msg: ConsumeMessage | null) => void) => {
      onMessage = cb;
      return Promise.resolve({ consumerTag: "fake-consumer" });
    }),
    cancel: vi.fn(() => Promise.resolve()),
    ack: vi.fn((msg: ConsumeMessage) => {
      acked.push(msg);
    }),
    nack: vi.fn((msg: ConsumeMessage) => {
      nacked.push(msg);
    }),
  } as unknown as Channel;

  return {
    channel,
    acked,
    nacked,
    deliver: (msg: ConsumeMessage) => onMessage?.(msg),
  };
};

describe("Given a batch that reaches batchSize before the window elapses", () => {
  describe("When drainPurchaseWrites is running", () => {
    it("Then it flushes immediately without waiting for the batch window", async () => {
      const { channel, deliver } = createFakeChannel();
      const writeBatch = vi.fn(() => Promise.resolve());

      const handle = await drainPurchaseWrites({
        channel,
        writeBatch,
        batchSize: 2,
        batchWindowMs: 10_000, // long enough that a call here proves size-triggered, not time-triggered
      });

      deliver(makeMessage(entry()));
      deliver(makeMessage(entry()));
      await sleep(10); // let the chained flush promise settle

      expect(writeBatch).toHaveBeenCalledTimes(1);
      await handle.stop();
    });
  });
});

describe("Given messages arrive below batchSize", () => {
  describe("When the batch window elapses", () => {
    it("Then it flushes whatever is pending", async () => {
      const { channel, deliver } = createFakeChannel();
      const writeBatch = vi.fn(() => Promise.resolve());

      const handle = await drainPurchaseWrites({
        channel,
        writeBatch,
        batchSize: 200,
        batchWindowMs: 10,
      });

      deliver(makeMessage(entry()));
      await sleep(30);

      expect(writeBatch).toHaveBeenCalledTimes(1);
      await handle.stop();
    });
  });
});

describe("Given a successful flush", () => {
  describe("When the batch has been written", () => {
    it("Then it acks only the last message, with multiple: true", async () => {
      const { channel, deliver, acked } = createFakeChannel();
      const writeBatch = vi.fn(() => Promise.resolve());

      const handle = await drainPurchaseWrites({
        channel,
        writeBatch,
        batchSize: 2,
        batchWindowMs: 10_000,
      });

      const second = makeMessage(entry());
      deliver(makeMessage(entry()));
      deliver(second);
      await sleep(10);

      expect(acked).toEqual([second]);
      await handle.stop();
    });
  });
});

describe("Given writeBatch fails on every attempt", () => {
  describe("When retries are exhausted", () => {
    it("Then it nacks every message in the batch without requeueing", async () => {
      const { channel, deliver, nacked } = createFakeChannel();
      const writeBatch = vi.fn(() => Promise.reject(new Error("connection reset")));

      const handle = await drainPurchaseWrites({
        channel,
        writeBatch,
        batchSize: 1,
        maxAttempts: 2,
        retryBackoffMs: 1,
      });

      const message = makeMessage(entry());
      deliver(message);
      await sleep(20);

      expect(nacked).toEqual([message]);
      await handle.stop();
    });

    it("Then it reports the dead-lettered batch via onDeadLettered", async () => {
      const { channel, deliver } = createFakeChannel();
      const writeBatch = vi.fn(() => Promise.reject(new Error("connection reset")));
      const onDeadLettered = vi.fn();

      const handle = await drainPurchaseWrites({
        channel,
        writeBatch,
        batchSize: 1,
        maxAttempts: 2,
        retryBackoffMs: 1,
        onDeadLettered,
      });

      deliver(makeMessage(entry()));
      await sleep(20);

      expect(onDeadLettered).toHaveBeenCalledTimes(1);
      await handle.stop();
    });
  });
});

describe("Given a pending batch that hasn't reached the window yet", () => {
  describe("When stop() is called", () => {
    it("Then it flushes the pending batch before resolving", async () => {
      const { channel, deliver } = createFakeChannel();
      const writeBatch = vi.fn(() => Promise.resolve());

      const handle = await drainPurchaseWrites({
        channel,
        writeBatch,
        batchSize: 200,
        batchWindowMs: 10_000,
      });

      deliver(makeMessage(entry()));
      await handle.stop();

      expect(writeBatch).toHaveBeenCalledTimes(1);
    });
  });
});
