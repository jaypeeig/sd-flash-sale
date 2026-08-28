import { sql } from "drizzle-orm";
import { createDatabase } from "../client";
import { loadEnv } from "../load-env";
import { products, purchases, sales, type ProductRow } from "../schema";

loadEnv();

const { db, pool } = createDatabase();

await db.execute(sql`truncate table ${purchases}, ${sales}, ${products} cascade`);

const MINUTE = 60 * 1000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;
const now = Date.now();

const seedProducts = [
  {
    name: "Apple AirPods Pro (2nd Generation)",
    description:
      "Wireless earbuds with Active Noise Cancellation, Adaptive Transparency, and a USB-C charging case.",
    imageUrl:
      "https://images.unsplash.com/photo-1606220945770-b5b6c2c55bf1?w=600&h=600&fit=contain&bg=ffffff",
    price: "139.90",
  },
  {
    name: "Sony WH-1000XM5",
    description:
      "Premium wireless over-ear headphones with advanced noise cancellation and up to 30 hours of battery life.",
    imageUrl:
      "https://images.unsplash.com/photo-1546435770-a3e426bf472b?w=600&h=600&fit=contain&bg=ffffff",
    price: "189.90",
  },
  {
    name: "Apple Watch Series 10",
    description:
      "Advanced smartwatch with fitness tracking, health features, sleep tracking, and a wide-angle OLED display.",
    imageUrl:
      "https://images.unsplash.com/photo-1551816230-ef5deaed4a26?w=600&h=600&fit=contain&bg=ffffff",
    price: "269.90",
  },
  {
    name: "Nike Air Max 270",
    description:
      "Lifestyle sneakers featuring a breathable upper and responsive Max Air cushioning for everyday comfort.",
    imageUrl:
      "https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=600&h=600&fit=contain&bg=ffffff",
    price: "74.95",
  },
  {
    name: "Nintendo Switch OLED",
    description:
      "Hybrid gaming console with a 7-inch OLED screen, enhanced audio, and an adjustable stand.",
    imageUrl:
      "https://images.unsplash.com/photo-1578303512597-81e6cc155b3e?w=600&h=600&fit=contain&bg=ffffff",
    price: "199.90",
  },
  {
    name: "JBL Flip 6",
    description:
      "Portable waterproof Bluetooth speaker delivering powerful sound with up to 12 hours of playtime.",
    imageUrl:
      "https://images.unsplash.com/photo-1608156639585-b3a032ef9689?w=600&h=600&fit=contain&bg=ffffff",
    price: "69.99",
  },
  {
    name: "Logitech MX Master 3S",
    description:
      "Advanced wireless mouse with an 8,000 DPI sensor, quiet clicks, and MagSpeed electromagnetic scrolling.",
    imageUrl:
      "https://images.unsplash.com/photo-1527814050087-3793815479db?w=600&h=600&fit=contain&bg=ffffff",
    price: "59.95",
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
    productId: productByName("Sony WH-1000XM5").id,
    totalStock: 30,
    remainingStock: 27,
    salePrice: "159.90",
    startsAt: new Date(now - 2 * DAY),
    endsAt: new Date(now - 1 * DAY),
  })
  .returning();

const [lowStockSale] = await db
  .insert(sales)
  .values({
    productId: productByName("Apple AirPods Pro (2nd Generation)").id,
    totalStock: 50,
    remainingStock: 2,
    salePrice: "119.90",
    startsAt: new Date(now - 2 * HOUR),
    endsAt: new Date(now + 2 * HOUR),
  })
  .returning();

const [endingSoonSale] = await db
  .insert(sales)
  .values({
    productId: productByName("Nintendo Switch OLED").id,
    totalStock: 40,
    remainingStock: 15,
    salePrice: "169.90",
    startsAt: new Date(now - 1 * HOUR),
    endsAt: new Date(now + 4 * MINUTE),
  })
  .returning();

await db.insert(sales).values({
  productId: productByName("JBL Flip 6").id,
  totalStock: 35,
  remainingStock: 20,
  salePrice: "54.90",
  startsAt: new Date(now - 3 * HOUR),
  endsAt: new Date(now + 3 * HOUR),
});

await db.insert(sales).values({
  productId: productByName("Apple Watch Series 10").id,
  totalStock: 40,
  remainingStock: 40,
  salePrice: "229.90",
  startsAt: new Date(now + 1 * DAY),
  endsAt: new Date(now + 2 * DAY),
});

await db.insert(sales).values({
  productId: productByName("Nike Air Max 270").id,
  totalStock: 45,
  remainingStock: 45,
  salePrice: "59.90",
  startsAt: new Date(now + 2 * DAY),
  endsAt: new Date(now + 3 * DAY),
});

await db.insert(sales).values({
  productId: productByName("Logitech MX Master 3S").id,
  totalStock: 25,
  remainingStock: 25,
  salePrice: "47.90",
  startsAt: new Date(now + 3 * DAY),
  endsAt: new Date(now + 4 * DAY),
});

console.log(`Seeded 7 sales (1 past, 3 active, 3 upcoming).`);

const pastSalePurchasedAt = new Date(now - 1.5 * DAY);

const seedPurchases = [
  { saleId: pastSale.id, email: "dave@example.com", purchasedAt: pastSalePurchasedAt },
  { saleId: pastSale.id, email: "erin@example.com", purchasedAt: pastSalePurchasedAt },
  { saleId: pastSale.id, email: "alice@example.com", purchasedAt: pastSalePurchasedAt },
  { saleId: lowStockSale.id, email: "jaypee@example.com" },
  { saleId: endingSoonSale.id, email: "grace@example.com" },
];

await db.insert(purchases).values(seedPurchases);
console.log(`Seeded ${seedPurchases.length} purchases.`);

await pool.end();
