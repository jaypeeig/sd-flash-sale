import { sql } from "drizzle-orm";
import { check, integer, numeric, pgTable, timestamp, uuid } from "drizzle-orm/pg-core";
import { products } from "./products";

export const sales = pgTable(
  "sales",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    productId: uuid("product_id")
      .notNull()
      .references(() => products.id, { onDelete: "restrict" }),

    totalStock: integer("total_stock").notNull(),
    remainingStock: integer("remaining_stock").notNull(),
    salePrice: numeric("sale_price", { precision: 10, scale: 2 }).notNull(),

    startsAt: timestamp("starts_at", { withTimezone: true }).notNull(),
    endsAt: timestamp("ends_at", { withTimezone: true }).notNull(),
    cancelledAt: timestamp("cancelled_at", { withTimezone: true }),

    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    check("sales_total_stock_check", sql`${table.totalStock} >= 0`),
    check("sales_remaining_stock_check", sql`${table.remainingStock} >= 0`),
    check("sales_end_after_start", sql`${table.endsAt} > ${table.startsAt}`),
    check("sales_remaining_lte_total", sql`${table.remainingStock} <= ${table.totalStock}`),
  ],
);
