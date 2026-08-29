import { and, eq, gte, sql } from "drizzle-orm";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import { purchases, sales } from "./schema";
import type * as schema from "./schema";

export interface PurchaseWriteEntry {
  saleId: string;
  email: string;
  reservedAt: number; // ms epoch — becomes purchases.purchased_at
}

// Batched counterpart to apps/api's single-row write - drains one worker
// batch in a single transaction instead of one per purchase, so the hot
// `sales` row is touched once per batch, not once per purchase. That's the
// entire reason a queue buys throughput here.
//
// onConflictDoNothing makes this safe under RabbitMQ's at-least-once
// redelivery: a redelivered message inserts nothing and is excluded from
// the decrement below, so `total_stock - remaining_stock === purchase
// count` still holds exactly, the same invariant the single-row path keeps.
export const writePurchaseBatch = async (
  db: NodePgDatabase<typeof schema>,
  entries: PurchaseWriteEntry[],
): Promise<number> => {
  if (entries.length === 0) return 0;

  return db.transaction(async (tx) => {
    const inserted = await tx
      .insert(purchases)
      .values(
        entries.map((entry) => ({
          saleId: entry.saleId,
          email: entry.email,
          purchasedAt: new Date(entry.reservedAt),
        })),
      )
      .onConflictDoNothing()
      .returning({ saleId: purchases.saleId });

    const countBySale = new Map<string, number>();
    for (const row of inserted) {
      countBySale.set(row.saleId, (countBySale.get(row.saleId) ?? 0) + 1);
    }

    for (const [saleId, count] of countBySale) {
      const [updated] = await tx
        .update(sales)
        .set({ remainingStock: sql`${sales.remainingStock} - ${count}` })
        .where(and(eq(sales.id, saleId), gte(sales.remainingStock, count)))
        .returning({ remainingStock: sales.remainingStock });

      // Redis already guaranteed this stock was available before the
      // message was published — reaching here means Redis oversold, a bug
      // upstream of this function. Throwing aborts and retries the whole
      // batch (see drainPurchaseWrites), which is the deliberate limit of
      // this system's "simple retry, no reconciliation" scope.
      if (!updated) {
        throw new Error(
          `writePurchaseBatch: sale ${saleId} could not absorb a decrement of ${count} — remaining_stock would go negative.`,
        );
      }
    }

    return inserted.length;
  });
};
