import { sql } from "drizzle-orm";
import { createDatabase } from "../client";
import { loadEnv } from "../env";
import { products, purchases, sales, type ProductRow } from "../schema";

loadEnv();

const { db, pool } = createDatabase();

await db.execute(sql`truncate table ${purchases}, ${sales}, ${products} cascade`);

const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;
const now = Date.now();

const seedProducts = [
  {
    name: "Field Recorder MK1",
    description:
      "Hand-assembled portable recorder, solid-state storage, analog gain dial, anodized aluminum shell.",
    imageUrl: "https://picsum.photos/seed/recorder/640/480",
    price: "229.00",
  },
  {
    name: "Open-Back Studio Headphones",
    description: "Walnut earcups, replaceable pads, coiled cable included.",
    imageUrl: "https://picsum.photos/seed/headphones/640/480",
    price: "179.00",
  },
  {
    name: "Canvas Field Tote",
    description: "Waxed canvas, leather straps, internal laptop sleeve.",
    imageUrl: "https://picsum.photos/seed/tote/640/480",
    price: "89.00",
  },
  {
    name: "Dot-Grid Notebook, Set of 3",
    description: "160gsm paper, stitched binding, blank cover.",
    imageUrl: "https://picsum.photos/seed/notebook/640/480",
    price: "34.00",
  },
];

const insertedProducts = await db.insert(products).values(seedProducts).returning();
console.log(`Seeded ${insertedProducts.length} products.`);

const productByName = (name: string): ProductRow => {
  const product = insertedProducts.find((row) => row.name === name);
  if (!product) throw new Error(`Seeded product not found: ${name}`);
  return product;
};

const [pastSale] = await db
  .insert(sales)
  .values({
    productId: productByName("Open-Back Studio Headphones").id,
    totalStock: 30,
    remainingStock: 27,
    salePrice: "149.00",
    startsAt: new Date(now - 2 * DAY),
    endsAt: new Date(now - 1 * DAY),
  })
  .returning();

const [activeSale] = await db
  .insert(sales)
  .values({
    productId: productByName("Field Recorder MK1").id,
    totalStock: 50,
    remainingStock: 49,
    salePrice: "189.00",
    startsAt: new Date(now - 2 * HOUR),
    endsAt: new Date(now + 2 * HOUR),
  })
  .returning();

await db.insert(sales).values({
  productId: productByName("Canvas Field Tote").id,
  totalStock: 40,
  remainingStock: 40,
  salePrice: "69.00",
  startsAt: new Date(now + 1 * DAY),
  endsAt: new Date(now + 2 * DAY),
});

console.log(`Seeded 3 sales (1 past, 1 active, 1 upcoming).`);

const pastSalePurchasedAt = new Date(now - 1.5 * DAY);

const seedPurchases = [
  { saleId: pastSale.id, email: "dave@example.com", purchasedAt: pastSalePurchasedAt },
  { saleId: pastSale.id, email: "erin@example.com", purchasedAt: pastSalePurchasedAt },
  { saleId: pastSale.id, email: "alice@example.com", purchasedAt: pastSalePurchasedAt },
  { saleId: activeSale.id, email: "jaypee@example.com" },
];

await db.insert(purchases).values(seedPurchases);
console.log(`Seeded ${seedPurchases.length} purchases.`);

await pool.end();
