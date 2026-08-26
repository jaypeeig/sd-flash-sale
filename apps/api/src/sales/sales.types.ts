import type { products, sales } from "@workspace/database";
import type { SalePhase } from "@workspace/shared-types";
import type { SQL } from "drizzle-orm";
import type { PgColumn } from "drizzle-orm/pg-core";

export interface SaleRow {
  id: string;
  phase: SalePhase;
  salePrice: string;
  totalStock: number;
  remainingStock: number;
  startsAt: Date;
  endsAt: Date;
  productId: string;
  productName: string;
  productDescription: string | null;
  productImageUrl: string | null;
  productPrice: string;
}

export interface SaleSelection {
  [key: string]: PgColumn | SQL;
  id: typeof sales.id;
  phase: SQL<SalePhase>;
  salePrice: typeof sales.salePrice;
  totalStock: typeof sales.totalStock;
  remainingStock: typeof sales.remainingStock;
  startsAt: typeof sales.startsAt;
  endsAt: typeof sales.endsAt;
  productId: typeof products.id;
  productName: typeof products.name;
  productDescription: typeof products.description;
  productImageUrl: typeof products.imageUrl;
  productPrice: typeof products.price;
}
