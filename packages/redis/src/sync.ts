import { products, purchases, sales, type createDatabase } from "@workspace/database";
import { and, eq, gt, isNull, sql } from "drizzle-orm";
import type { FlashSaleRedis } from "./client.types";
import { redisKeys } from "./keys";
import { normalizeEmail } from "./normalize-email";

type DrizzleDb = ReturnType<typeof createDatabase>["db"];

const SADD_CHUNK_SIZE = 5_000;

const chunk = <T>(items: T[], size: number): T[][] => {
  const chunks: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    chunks.push(items.slice(i, i + size));
  }
  return chunks;
};

export interface SyncSaleOptions {
  force?: boolean;
}

export type SyncSaleResult =
  | { saleId: string; synced: true; stock: number; buyerCount: number }
  | { saleId: string; synced: false; reason: string };

const isLiveSale = async (
  db: DrizzleDb,
  sale: {
    id: string;
    startsAt: Date;
    endsAt: Date;
    cancelledAt: Date | null;
    totalStock: number;
    remainingStock: number;
  },
): Promise<boolean> => {
  const now = new Date();
  const inActiveWindow = sale.cancelledAt === null && now >= sale.startsAt && now < sale.endsAt;
  if (!inActiveWindow) return false;

  if (sale.remainingStock < sale.totalStock) return true;

  const [row] = await db
    .select({ value: sql<number>`count(*)::int` })
    .from(purchases)
    .where(eq(purchases.saleId, sale.id));
  return (row?.value ?? 0) > 0;
};

export const syncSaleToRedis = async (
  db: DrizzleDb,
  redis: FlashSaleRedis,
  saleId: string,
  options: SyncSaleOptions = {},
): Promise<SyncSaleResult> => {
  const [sale] = await db
    .select({
      id: sales.id,
      startsAt: sales.startsAt,
      endsAt: sales.endsAt,
      cancelledAt: sales.cancelledAt,
      totalStock: sales.totalStock,
      remainingStock: sales.remainingStock,
      salePrice: sales.salePrice,
      productId: products.id,
      productName: products.name,
      productDescription: products.description,
      productImageUrl: products.imageUrl,
      productPrice: products.price,
    })
    .from(sales)
    .innerJoin(products, eq(sales.productId, products.id))
    .where(eq(sales.id, saleId));

  if (!sale) {
    return { saleId, synced: false, reason: "sale not found" };
  }

  if (!options.force && (await isLiveSale(db, sale))) {
    return {
      saleId,
      synced: false,
      reason:
        "sale is active and already has purchases/decrements — syncing now could clobber " +
        "in-flight purchases. Pass force to overwrite anyway.",
    };
  }

  const buyerRows = await db
    .select({ email: purchases.email })
    .from(purchases)
    .where(eq(purchases.saleId, saleId));
  const buyers = buyerRows.map((row) => normalizeEmail(row.email));

  const stockKey = redisKeys.saleStock(saleId);
  const buyersKey = redisKeys.saleBuyers(saleId);
  const snapshotKey = redisKeys.saleSnapshot(saleId);
  const desyncedKey = redisKeys.saleDesynced(saleId);

  const pipeline = redis.multi();
  pipeline.del(stockKey, buyersKey, snapshotKey, desyncedKey);
  pipeline.set(stockKey, sale.remainingStock);
  pipeline.hset(snapshotKey, {
    startsAt: String(sale.startsAt.getTime()),
    endsAt: String(sale.endsAt.getTime()),
    cancelledAt: sale.cancelledAt ? String(sale.cancelledAt.getTime()) : "",
    salePrice: sale.salePrice,
    productId: sale.productId,
    productName: sale.productName,
    productDescription: sale.productDescription ?? "",
    productImageUrl: sale.productImageUrl ?? "",
    productPrice: sale.productPrice,
  });
  for (const batch of chunk(buyers, SADD_CHUNK_SIZE)) {
    if (batch.length > 0) pipeline.sadd(buyersKey, ...batch);
  }
  await pipeline.exec();

  return { saleId, synced: true, stock: sale.remainingStock, buyerCount: buyers.length };
};

// Shared by the CLI's --all flag, and by anything else that wants "every
// sale worth having in Redis right now": not cancelled, not yet ended, and
// with stock left to sell. Deliberately omits a startsAt <= now check —
// that's what makes this cover upcoming sales too, not just active ones,
// so a sale synced ahead of time is already on the fast path the instant
// it goes live instead of falling back to Postgres until someone remembers
// to sync it. A sold-out or already-ended sale has nothing worth caching.
export const findSyncableSaleIds = async (db: DrizzleDb): Promise<string[]> => {
  const now = new Date();
  const rows = await db
    .select({ id: sales.id })
    .from(sales)
    .where(and(isNull(sales.cancelledAt), gt(sales.endsAt, now), gt(sales.remainingStock, 0)));
  return rows.map((row) => row.id);
};
