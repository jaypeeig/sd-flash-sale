import type { products, sales } from "@workspace/database";
import type { PgColumn } from "drizzle-orm/pg-core";

export interface SaleRow {
  id: string;
  salePrice: string;
  totalStock: number;
  remainingStock: number;
  startsAt: Date;
  endsAt: Date;
  cancelledAt: Date | null;
  productId: string;
  productName: string;
  productDescription: string | null;
  productImageUrl: string | null;
  productPrice: string;
}

export interface SaleSelection {
  [key: string]: PgColumn;
  id: typeof sales.id;
  salePrice: typeof sales.salePrice;
  totalStock: typeof sales.totalStock;
  remainingStock: typeof sales.remainingStock;
  startsAt: typeof sales.startsAt;
  endsAt: typeof sales.endsAt;
  cancelledAt: typeof sales.cancelledAt;
  productId: typeof products.id;
  productName: typeof products.name;
  productDescription: typeof products.description;
  productImageUrl: typeof products.imageUrl;
  productPrice: typeof products.price;
}
