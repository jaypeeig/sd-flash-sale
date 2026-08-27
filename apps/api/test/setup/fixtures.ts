import { products, purchases, sales } from "@workspace/database";
import type { ProductRow, PurchaseRow, SaleRow } from "@workspace/database";
import type { Database } from "../../src/database/database.types";
import type {
  CreateProductOptions,
  CreatePurchaseOptions,
  CreateSaleOptions,
  SalePhaseFixture,
} from "./fixtures.types";

const HOUR = 60 * 60 * 1000;

// Distinguishes fixtures created within the same test run — cheaper than a
// uuid and still unique enough that fixtures never collide with each other.
let sequence = 0;
const nextSequence = (): number => sequence++;

export const createProduct = async (
  db: Database,
  options: CreateProductOptions = {},
): Promise<ProductRow> => {
  const [product] = await db
    .insert(products)
    .values({
      name: options.name ?? `Test Product ${nextSequence()}`,
      description: options.description ?? "A product created for e2e testing.",
      imageUrl: options.imageUrl ?? null,
      price: options.price ?? "100.00",
    })
    .returning();

  return product;
};

const windowForPhase = (phase: SalePhaseFixture, now: number): { startsAt: Date; endsAt: Date } => {
  switch (phase) {
    case "upcoming":
      return { startsAt: new Date(now + HOUR), endsAt: new Date(now + 2 * HOUR) };
    case "past":
      return { startsAt: new Date(now - 2 * HOUR), endsAt: new Date(now - HOUR) };
    // "active", "sold_out", and "cancelled" are all in-window right now —
    // what makes a cancelled sale inactive is cancelledAt, and what makes a
    // sold-out sale inactive is remainingStock, not the time window.
    default:
      return { startsAt: new Date(now - HOUR), endsAt: new Date(now + HOUR) };
  }
};

export const createSale = async (db: Database, options: CreateSaleOptions = {}): Promise<SaleRow> => {
  const phase = options.phase ?? "active";
  const now = Date.now();
  const { startsAt, endsAt } = windowForPhase(phase, now);

  const productId = options.productId ?? (await createProduct(db)).id;
  const totalStock = options.totalStock ?? options.stock ?? 10;
  const remainingStock = phase === "sold_out" ? 0 : (options.stock ?? totalStock);

  const [sale] = await db
    .insert(sales)
    .values({
      productId,
      totalStock,
      remainingStock,
      salePrice: options.salePrice ?? "90.00",
      startsAt,
      endsAt,
      cancelledAt: phase === "cancelled" ? new Date() : null,
    })
    .returning();

  return sale;
};

export const createPurchase = async (
  db: Database,
  sale: Pick<SaleRow, "id" | "startsAt" | "endsAt">,
  options: CreatePurchaseOptions = {},
): Promise<PurchaseRow> => {
  const midpoint = new Date((sale.startsAt.getTime() + sale.endsAt.getTime()) / 2);

  const [purchase] = await db
    .insert(purchases)
    .values({
      saleId: sale.id,
      email: options.email ?? `buyer-${nextSequence()}@example.com`,
      purchasedAt: options.purchasedAt ?? midpoint,
    })
    .returning();

  return purchase;
};
