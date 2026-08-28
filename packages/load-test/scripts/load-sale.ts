import {
  createDatabase,
  products,
  purchases,
  sales,
  type ProductRow,
  type SaleRow,
} from "@workspace/database";
import { eq } from "drizzle-orm";
import { LOAD_TEST_EMAIL_DOMAIN } from "../shared/constants.ts";

export const LOAD_TEST_PRODUCT_NAME = "[load-test] Flash Sale Target";
export { LOAD_TEST_EMAIL_DOMAIN };

export type LoadTestConnection = ReturnType<typeof createDatabase>;
export type LoadTestDb = LoadTestConnection["db"];

export const connect = (): LoadTestConnection => createDatabase();

const HOUR_MS = 60 * 60 * 1000;
const DAY_MS = 24 * HOUR_MS;

export const findLoadTestProduct = async (db: LoadTestDb): Promise<ProductRow | undefined> => {
  const [product] = await db
    .select()
    .from(products)
    .where(eq(products.name, LOAD_TEST_PRODUCT_NAME));
  return product;
};

// Returns the sale ids it deleted, so callers can also drop their Redis
// state (see scripts/cleanup.ts) — deleting the Postgres rows alone would
// leave that sale's flashsale:* keys behind as harmless but untidy orphans.
export const deleteLoadTestRows = async (db: LoadTestDb): Promise<string[]> => {
  const product = await findLoadTestProduct(db);
  if (!product) return [];

  const saleRows = await db
    .select({ id: sales.id })
    .from(sales)
    .where(eq(sales.productId, product.id));
  for (const sale of saleRows) {
    await db.delete(purchases).where(eq(purchases.saleId, sale.id));
  }
  await db.delete(sales).where(eq(sales.productId, product.id));
  await db.delete(products).where(eq(products.id, product.id));

  return saleRows.map((sale) => sale.id);
};

export interface CreateLoadTestSaleOptions {
  totalStock: number;
}

// Always starts from a clean slate (deletes any rows a previous, possibly
// crashed, run left behind) then inserts one fresh tagged product + sale.
// The window is wide (-1h to +1d) so even a long-running test (capacity-ramp
// runs several minutes) never crosses endsAt mid-run and trips the
// trg_purchases_within_sale_period trigger.
export const createLoadTestSale = async (
  db: LoadTestDb,
  { totalStock }: CreateLoadTestSaleOptions,
): Promise<{ productId: string; sale: SaleRow }> => {
  await deleteLoadTestRows(db);

  const now = Date.now();
  const [product] = await db
    .insert(products)
    .values({
      name: LOAD_TEST_PRODUCT_NAME,
      description:
        "Created by @workspace/load-test — tagged and removed by scripts/cleanup.ts after each run.",
      price: "1.00",
    })
    .returning();

  const [sale] = await db
    .insert(sales)
    .values({
      productId: product.id,
      totalStock,
      remainingStock: totalStock,
      salePrice: "1.00",
      startsAt: new Date(now - HOUR_MS),
      endsAt: new Date(now + DAY_MS),
    })
    .returning();

  return { productId: product.id, sale };
};
