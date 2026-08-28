import { Inject, Injectable, Logger, NotFoundException } from "@nestjs/common";
import { DatabaseErrorCode, products, purchases, sales } from "@workspace/database";
import { reservePurchase, type ReservationCode } from "@workspace/redis";
import type { PurchaseRecord, PurchaseResult } from "@workspace/shared-types";
import { and, desc, eq, gt, sql } from "drizzle-orm";
import { DATABASE_CONNECTION } from "../database/database.constants";
import type { Database } from "../database/database.types";
import { isPgErrorWithCode, POSTGRES_UNIQUE_VIOLATION } from "../database/pg-error";
import { REDIS_CONNECTION } from "../redis/redis.constants";
import type { Redis } from "../redis/redis.types";
import { SalesService } from "../sales/sales.service";
import { isSaleOpen } from "../sales/sales.utils";
import {
  ALREADY_PURCHASED_RESULT,
  SALE_NOT_ACTIVE_RESULT,
  SOLD_OUT_RESULT,
  SUCCESS_RESULT,
} from "./purchases.constants";
import { SoldOutError } from "./purchases.exceptions";

@Injectable()
export class PurchasesService {
  private readonly logger = new Logger(PurchasesService.name);

  constructor(
    @Inject(DATABASE_CONNECTION) private readonly db: Database,
    @Inject(REDIS_CONNECTION) private readonly redis: Redis,
    private readonly salesService: SalesService,
  ) {}

  async purchase(saleId: string, email: string): Promise<PurchaseResult> {
    const reservation = await this.reserve(saleId, email);

    switch (reservation) {
      case "sale_not_active":
        return SALE_NOT_ACTIVE_RESULT;
      case "already_purchased":
        return ALREADY_PURCHASED_RESULT;
      case "sold_out":
        return SOLD_OUT_RESULT;
      case "reserved":
        // Redis already confirmed the window, the buyer, and the stock —
        // go straight to the write, no need to re-fetch the sale row.
        return this.writeThrough(saleId, email, { reserved: true });
      case null:
      case "not_warmed":
        // Redis is down, or this sale was never loaded into it — fall
        // back to the same Postgres-only flow as before Redis existed.
        return this.purchaseFromDatabase(saleId, email);
    }
  }

  // Redis as the gate: null means "don't trust Redis right now" (down, or
  // the round trip itself failed) rather than a real rejection — the
  // caller treats that identically to "not_warmed".
  private async reserve(saleId: string, email: string): Promise<ReservationCode | null> {
    if (this.redis.status !== "ready") {
      return null;
    }

    try {
      return await reservePurchase(this.redis, { saleId, email, now: Date.now() });
    } catch (error) {
      this.logger.warn(
        `Redis reservation failed for sale ${saleId} — falling back to Postgres: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
      return null;
    }
  }

  private async purchaseFromDatabase(saleId: string, email: string): Promise<PurchaseResult> {
    const sale = await this.salesService.findRowById(saleId);

    if (!sale) {
      throw new NotFoundException("Sale not found");
    }

    if (!isSaleOpen(sale, new Date())) {
      return SALE_NOT_ACTIVE_RESULT;
    }

    return this.writeThrough(saleId, email, { reserved: false });
  }

  // Insert first, decrement second: a duplicate purchase or a purchase
  // outside the sale window (trigger-enforced) is then rejected before
  // ever touching — and contending on — the shared stock counter.
  private async writeThrough(
    saleId: string,
    email: string,
    { reserved }: { reserved: boolean },
  ): Promise<PurchaseResult> {
    try {
      await this.db.transaction(async (tx): Promise<void> => {
        await tx.insert(purchases).values({ saleId, email });

        const [updated] = await tx
          .update(sales)
          .set({ remainingStock: sql`${sales.remainingStock} - 1` })
          .where(and(eq(sales.id, saleId), gt(sales.remainingStock, 0)))
          .returning({ remainingStock: sales.remainingStock });

        if (!updated) {
          throw new SoldOutError();
        }
      });

      return SUCCESS_RESULT;
    } catch (error) {
      const result = this.classifyWriteThroughError(error);

      if (reserved) {
        // XXX: Redis reserved a unit the DB then refused — its counter is
        // now understated by one and stays that way until the next
        // redis:warm. Deliberately not compensated here; candidate for a
        // retry queue once one exists.
        this.logger.error(
          `Redis reserved sale ${saleId} for ${email} but Postgres rejected it (${result.status}) — Redis stock is now off by 1 until redis:warm runs.`,
        );
      }

      return result;
    }
  }

  // Returns the result a known failure maps to; rethrows anything else.
  private classifyWriteThroughError(error: unknown): PurchaseResult {
    if (error instanceof SoldOutError) {
      return SOLD_OUT_RESULT;
    }
    if (isPgErrorWithCode(error, POSTGRES_UNIQUE_VIOLATION)) {
      return ALREADY_PURCHASED_RESULT;
    }
    if (isPgErrorWithCode(error, DatabaseErrorCode.PURCHASE_OUTSIDE_SALE_WINDOW)) {
      return SALE_NOT_ACTIVE_RESULT;
    }
    throw error;
  }

  async findByEmail(email: string): Promise<PurchaseRecord[]> {
    const rows = await this.db
      .select({
        id: purchases.id,
        saleId: purchases.saleId,
        email: purchases.email,
        purchasedAt: purchases.purchasedAt,
        salePrice: sales.salePrice,
        productId: products.id,
        productName: products.name,
        productDescription: products.description,
        productImageUrl: products.imageUrl,
        productPrice: products.price,
      })
      .from(purchases)
      .innerJoin(sales, eq(purchases.saleId, sales.id))
      .innerJoin(products, eq(sales.productId, products.id))
      .where(eq(purchases.email, email))
      .orderBy(desc(purchases.purchasedAt));

    return rows.map((row) => ({
      id: row.id,
      saleId: row.saleId,
      product: {
        id: row.productId,
        name: row.productName,
        description: row.productDescription,
        imageUrl: row.productImageUrl,
        price: row.productPrice,
      },
      email: row.email,
      price: row.salePrice,
      purchasedAt: row.purchasedAt.toISOString(),
    }));
  }
}
