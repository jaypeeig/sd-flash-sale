import { Inject, Injectable, Logger, NotFoundException } from "@nestjs/common";
import {
  DatabaseErrorCode,
  products,
  purchases,
  sales,
  type PurchaseRow,
} from "@workspace/database";
import {
  normalizeEmail,
  redisKeys,
  releasePurchase,
  reservePurchase,
  type ReservationResult,
  type ReservationSnapshot,
} from "@workspace/redis";
import type { PurchaseRecord, PurchaseResult } from "@workspace/shared-types";
import { and, desc, eq, gt, sql } from "drizzle-orm";
import { DATABASE_CONNECTION } from "../database/database.constants";
import type { Database } from "../database/database.types";
import { isPgErrorWithCode, POSTGRES_UNIQUE_VIOLATION } from "../database/pg-error";
import { isRedisUnavailable } from "../redis/redis-error";
import { REDIS_CONNECTION } from "../redis/redis.constants";
import type { RedisClient } from "../redis/redis.types";
import {
  ALREADY_PURCHASED_RESULT,
  SALE_NOT_ACTIVE_RESULT,
  SOLD_OUT_RESULT,
} from "./purchases.constants";
import { SoldOutError } from "./purchases.exceptions";

@Injectable()
export class PurchasesService {
  private readonly logger = new Logger(PurchasesService.name);

  constructor(
    @Inject(DATABASE_CONNECTION) private readonly db: Database,
    @Inject(REDIS_CONNECTION) private readonly redis: RedisClient,
  ) {}

  async purchase(saleId: string, email: string): Promise<PurchaseResult> {
    // XXX: Skips straight to the Postgres path rather than waiting for Redis to load the sale, if Redis is down or not ready. This is
    if (this.redis.status !== "ready") {
      return this.purchaseViaPostgres(saleId, email);
    }

    const normalizedEmail = normalizeEmail(email);
    let reservation: ReservationResult;
    try {
      reservation = await reservePurchase(this.redis, {
        saleId,
        email: normalizedEmail,
        now: Date.now(),
      });
    } catch (error) {
      if (isRedisUnavailable(error)) {
        // Best-effort — if this write also fails because Redis is still
        // down, the reconnect sweep in redis.provider.ts is the backstop
        // that marks it desynced the moment the connection comes back.
        await this.redis.set(redisKeys.saleDesynced(saleId), "1").catch(() => {});
      }
      this.logger.warn(
        `Redis reservation failed for sale ${saleId}, falling back to Postgres: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
      return this.purchaseViaPostgres(saleId, email);
    }

    switch (reservation.code) {
      case "not_loaded":
        return this.purchaseViaPostgres(saleId, email);
      case "sale_not_active":
        return SALE_NOT_ACTIVE_RESULT;
      case "already_purchased":
        return ALREADY_PURCHASED_RESULT;
      case "sold_out":
        return SOLD_OUT_RESULT;
      case "reserved":
        return this.commitReservedPurchase(saleId, email, normalizedEmail, reservation.snapshot);
    }
  }

  // The original purchase flow, untouched — the correctness backstop and
  // what every request runs when Redis is unreachable or this sale hasn't
  // been synced into it. See packages/redis/src/reserve-purchase.ts for
  // why the fast path re-validates the same window/cancellation/dedupe
  // rules from a Redis snapshot instead of duplicating this SELECT.
  private async purchaseViaPostgres(saleId: string, email: string): Promise<PurchaseResult> {
    const now = new Date();

    const [sale] = await this.db
      .select({
        startsAt: sales.startsAt,
        endsAt: sales.endsAt,
        remainingStock: sales.remainingStock,
        salePrice: sales.salePrice,
        cancelledAt: sales.cancelledAt,
        productId: products.id,
        productName: products.name,
        productDescription: products.description,
        productImageUrl: products.imageUrl,
        productPrice: products.price,
      })
      .from(sales)
      .innerJoin(products, eq(sales.productId, products.id))
      .where(eq(sales.id, saleId));

    if (!sale) {
      throw new NotFoundException("Sale not found");
    }

    if (sale.cancelledAt !== null || now < sale.startsAt || now >= sale.endsAt) {
      return SALE_NOT_ACTIVE_RESULT;
    }

    if (sale.remainingStock <= 0) {
      return SOLD_OUT_RESULT;
    }

    try {
      // Insert first, decrement second: a duplicate purchase or a purchase
      // outside the sale window (trigger-enforced) is then rejected before
      // ever touching — and contending on — the shared stock counter.
      const purchaseRow = await this.db.transaction(async (tx): Promise<PurchaseRow> => {
        const [inserted] = await tx.insert(purchases).values({ saleId, email }).returning();

        const [updated] = await tx
          .update(sales)
          .set({ remainingStock: sql`${sales.remainingStock} - 1` })
          .where(and(eq(sales.id, saleId), gt(sales.remainingStock, 0)))
          .returning({ remainingStock: sales.remainingStock });

        if (!updated) {
          throw new SoldOutError();
        }

        return inserted;
      });

      const purchase: PurchaseRecord = {
        id: purchaseRow.id,
        saleId,
        product: {
          id: sale.productId,
          name: sale.productName,
          description: sale.productDescription,
          imageUrl: sale.productImageUrl,
          price: sale.productPrice,
        },
        email: purchaseRow.email,
        price: sale.salePrice,
        purchasedAt: purchaseRow.purchasedAt.toISOString(),
      };

      return {
        status: "success",
        message: "You've successfully secured your item!",
        purchase,
      };
    } catch (error) {
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
  }

  // Runs once reservePurchase() has already atomically decremented Redis's
  // stock counter and recorded the buyer — Postgres is still the durable
  // write and the final backstop (its own unique index / trigger /
  // conditional UPDATE can still reject this on drift between the two
  // stores), so on ANY failure here the Redis reservation is released
  // before returning. The release is best-effort: its failure is logged,
  // never thrown, matching the chosen "undersell, never oversell" trade-off.
  private async commitReservedPurchase(
    saleId: string,
    email: string,
    normalizedEmail: string,
    snapshot: ReservationSnapshot,
  ): Promise<PurchaseResult> {
    try {
      const purchaseRow = await this.db.transaction(async (tx): Promise<PurchaseRow> => {
        const [inserted] = await tx.insert(purchases).values({ saleId, email }).returning();

        const [updated] = await tx
          .update(sales)
          .set({ remainingStock: sql`${sales.remainingStock} - 1` })
          .where(and(eq(sales.id, saleId), gt(sales.remainingStock, 0)))
          .returning({ remainingStock: sales.remainingStock });

        if (!updated) {
          throw new SoldOutError();
        }

        return inserted;
      });

      const purchase: PurchaseRecord = {
        id: purchaseRow.id,
        saleId,
        product: {
          id: snapshot.productId,
          name: snapshot.productName,
          description: snapshot.productDescription,
          imageUrl: snapshot.productImageUrl,
          price: snapshot.productPrice,
        },
        email: purchaseRow.email,
        price: snapshot.salePrice,
        purchasedAt: purchaseRow.purchasedAt.toISOString(),
      };

      return {
        status: "success",
        message: "You've successfully secured your item!",
        purchase,
      };
    } catch (error) {
      await releasePurchase(this.redis, { saleId, email: normalizedEmail }).catch(
        (releaseError: unknown) => {
          this.logger.warn(
            `Compensating release failed for sale ${saleId}: ${
              releaseError instanceof Error ? releaseError.message : String(releaseError)
            }`,
          );
        },
      );

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
