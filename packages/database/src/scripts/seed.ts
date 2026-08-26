import { sql } from "drizzle-orm";
import { createDatabase } from "../client";
import { loadEnv } from "../env";
import { products } from "../schema";

loadEnv();

const { db, pool } = createDatabase();

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

await db.execute(sql`truncate table ${products}`);
await db.insert(products).values(seedProducts);
console.log(`Seeded ${seedProducts.length} products.`);

await pool.end();
