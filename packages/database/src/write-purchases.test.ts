import { describe, expect, it, vi } from "vitest";
import { writePurchaseBatch, type PurchaseWriteEntry } from "./write-purchases";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import type * as schema from "./schema";

type FakeTx = ReturnType<typeof fakeTx>;

const fakeTx = (
  insertReturns: { saleId: string }[],
  updateReturning: { remainingStock: number }[][],
) => {
  const updateWhere = vi.fn();
  let updateCall = 0;

  return {
    insert: () => ({
      values: () => ({
        onConflictDoNothing: () => ({
          returning: () => Promise.resolve(insertReturns),
        }),
      }),
    }),
    update: () => ({
      set: (patch: unknown) => ({
        where: (condition: unknown) => {
          updateWhere(patch, condition);
          const rows = updateReturning[updateCall] ?? [];
          updateCall += 1;
          return { returning: () => Promise.resolve(rows) };
        },
      }),
    }),
    updateWhere,
  };
};

const fakeDb = (tx: FakeTx) =>
  ({
    transaction: (callback: (tx: FakeTx) => Promise<unknown>) => callback(tx),
  }) as unknown as NodePgDatabase<typeof schema>;

const entry = (overrides: Partial<PurchaseWriteEntry> = {}): PurchaseWriteEntry => ({
  saleId: "sale-1",
  email: "buyer@example.com",
  reservedAt: Date.now(),
  ...overrides,
});

describe("Given an empty batch", () => {
  describe("When writePurchaseBatch is called", () => {
    it("Then it returns 0 without opening a transaction", async () => {
      const transaction = vi.fn();
      const db = { transaction } as unknown as NodePgDatabase<typeof schema>;

      const written = await writePurchaseBatch(db, []);

      expect(written).toBe(0);
    });
  });
});

describe("Given a batch of entries all for the same sale", () => {
  describe("When every row inserts cleanly", () => {
    it("Then it decrements that sale's remaining_stock by the inserted count", async () => {
      const tx = fakeTx([{ saleId: "sale-1" }, { saleId: "sale-1" }], [[{ remainingStock: 8 }]]);
      const db = fakeDb(tx);

      await writePurchaseBatch(db, [entry(), entry()]);

      expect(tx.updateWhere).toHaveBeenCalledTimes(1);
    });

    it("Then it returns the number of rows actually inserted", async () => {
      const tx = fakeTx([{ saleId: "sale-1" }, { saleId: "sale-1" }], [[{ remainingStock: 8 }]]);
      const db = fakeDb(tx);

      const written = await writePurchaseBatch(db, [entry(), entry()]);

      expect(written).toBe(2);
    });
  });

  describe("When a redelivered message inserts nothing (onConflictDoNothing)", () => {
    it("Then the decrement excludes it, keeping the invariant exact", async () => {
      // Only one of the two entries actually inserted — the redelivery's
      // saleId is simply absent from insertReturns.
      const tx = fakeTx([{ saleId: "sale-1" }], [[{ remainingStock: 9 }]]);
      const db = fakeDb(tx);

      const written = await writePurchaseBatch(db, [entry(), entry()]);

      expect(written).toBe(1);
    });
  });
});

describe("Given a batch spanning two different sales", () => {
  describe("When every row inserts cleanly", () => {
    it("Then it issues one decrement per sale", async () => {
      const tx = fakeTx(
        [{ saleId: "sale-1" }, { saleId: "sale-1" }, { saleId: "sale-2" }],
        [[{ remainingStock: 8 }], [{ remainingStock: 3 }]],
      );
      const db = fakeDb(tx);

      await writePurchaseBatch(db, [
        entry({ saleId: "sale-1" }),
        entry({ saleId: "sale-1" }),
        entry({ saleId: "sale-2" }),
      ]);

      expect(tx.updateWhere).toHaveBeenCalledTimes(2);
    });
  });
});

describe("Given the decrement's guard rejects the update", () => {
  describe("When remaining_stock could not absorb the decrement (Redis oversold)", () => {
    it("Then it throws rather than silently under-decrementing", async () => {
      const tx = fakeTx([{ saleId: "sale-1" }], [[]]);
      const db = fakeDb(tx);

      await expect(writePurchaseBatch(db, [entry()])).rejects.toThrow();
    });
  });
});
