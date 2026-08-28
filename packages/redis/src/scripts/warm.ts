import { createDatabase, purchases, sales } from "@workspace/database";
import { and, eq, gt, isNull } from "drizzle-orm";
import { createRedis } from "../client";
import { loadEnv } from "../load-env";
import { syncSale } from "../sync";

loadEnv();

// XXX: loads every active-or-upcoming sale (plus its existing buyers) from
// Postgres into Redis. Deliberately explicit/operator-run — there's no
// lazy warm-on-miss, so a cold sale just falls through to the normal
// Postgres purchase flow until this is run.
const run = async () => {
  const { db, pool } = createDatabase();
  const { redis, close } = createRedis();

  try {
    const now = new Date();
    const rows = await db
      .select()
      .from(sales)
      .where(and(isNull(sales.cancelledAt), gt(sales.endsAt, now)));

    for (const sale of rows) {
      const buyerRows = await db
        .select({ email: purchases.email })
        .from(purchases)
        .where(eq(purchases.saleId, sale.id));

      await syncSale(
        redis,
        {
          id: sale.id,
          remainingStock: sale.remainingStock,
          startsAt: sale.startsAt,
          endsAt: sale.endsAt,
          cancelledAt: sale.cancelledAt,
        },
        buyerRows.map((row) => row.email),
      );

      console.log(
        `Warmed sale ${sale.id} — stock=${sale.remainingStock}, buyers=${buyerRows.length}`,
      );
    }

    console.log(`Warmed ${rows.length} sale(s).`);
  } finally {
    await close();
    await pool.end();
  }
};

void run().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
