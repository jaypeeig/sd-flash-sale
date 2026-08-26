import type { products } from "./products";

export type ProductRow = typeof products.$inferSelect;
export type NewProductRow = typeof products.$inferInsert;
