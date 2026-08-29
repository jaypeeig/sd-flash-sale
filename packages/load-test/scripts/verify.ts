import { purchases, sales } from "@workspace/database";
import { eq } from "drizzle-orm";
import { loadRootEnv } from "./env";
import { connect } from "./load-sale";

loadRootEnv();

export interface VerifyCheck {
  name: string;
  passed: boolean;
  detail: string;
}

export interface VerifyResult {
  ok: boolean;
  checks: VerifyCheck[];
}

// The DB-truth assertions k6 itself can't make (no SQL driver without a
// custom xk6 build). Run once after k6 exits, against the actual rows the
// run produced — this is what a load test's throughput number is worthless
// without.
export const verify = async (saleId: string): Promise<VerifyResult> => {
  const { db, pool } = connect();
  try {
    const { sale, purchaseRows } = await db.transaction(
      async (tx) => {
        const [sale] = await tx.select().from(sales).where(eq(sales.id, saleId));
        const purchaseRows = await tx.select().from(purchases).where(eq(purchases.saleId, saleId));
        return { sale, purchaseRows };
      },
      { isolationLevel: "repeatable read" },
    );

    if (!sale) {
      throw new Error(`Sale ${saleId} not found — did scripts/prepare.ts run for this test?`);
    }

    const distinctEmails = new Set(purchaseRows.map((row) => row.email));
    const decrement = sale.totalStock - sale.remainingStock;

    const checks: VerifyCheck[] = [
      {
        name: "remaining_stock is never negative",
        passed: sale.remainingStock >= 0,
        detail: `remaining_stock = ${sale.remainingStock}`,
      },
      {
        name: "stock decrement matches purchase count (no phantom decrements)",
        passed: decrement === purchaseRows.length,
        detail: `total_stock(${sale.totalStock}) - remaining_stock(${sale.remainingStock}) = ${decrement}, purchases = ${purchaseRows.length}`,
      },
      {
        name: "no duplicate purchases (one email, one purchase)",
        passed: distinctEmails.size === purchaseRows.length,
        detail: `${purchaseRows.length} purchases, ${distinctEmails.size} distinct emails`,
      },
    ];

    // Only meaningful when the sale actually sold out — a test that gave it
    // effectively unlimited stock (capacity-ramp) will never reach 0, and
    // that absence is expected, not a failure.
    if (sale.remainingStock === 0) {
      checks.push({
        name: "a sold-out sale sold exactly total_stock units, not more",
        passed: purchaseRows.length === sale.totalStock,
        detail: `purchases = ${purchaseRows.length}, total_stock = ${sale.totalStock}`,
      });
    }

    return { ok: checks.every((check) => check.passed), checks };
  } finally {
    await pool.end();
  }
};

export const printVerifyReport = (result: VerifyResult): void => {
  console.log("\nInvariant checks:");
  for (const check of result.checks) {
    console.log(`  ${check.passed ? "✓" : "✗"} ${check.name} — ${check.detail}`);
  }
  console.log(result.ok ? "\nAll invariants held.\n" : "\nINVARIANT VIOLATION — see above.\n");
};

const isMain = import.meta.url === `file://${process.argv[1]}`;
if (isMain) {
  const saleId = process.argv[2] ?? process.env.SALE_ID;
  if (!saleId) {
    console.error("Usage: tsx scripts/verify.ts <sale-id>  (or set SALE_ID)");
    process.exit(1);
  }
  const result = await verify(saleId);
  printVerifyReport(result);
  if (!result.ok) process.exit(1);
}
