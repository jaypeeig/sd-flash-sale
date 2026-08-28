import { Inject, Injectable, NotFoundException } from "@nestjs/common";
import { DatabaseErrorCode, products, purchases, sales } from "@workspace/database";
import type { PurchaseRecord, PurchaseResult } from "@workspace/shared-types";
import { and, desc, eq, gt, sql } from "drizzle-orm";
import { DATABASE_CONNECTION } from "../database/database.constants";
import type { Database } from "../database/database.types";
import { isPgErrorWithCode, POSTGRES_UNIQUE_VIOLATION } from "../database/pg-error";
import { SalesService } from "../sales/sales.service";
import { isSaleOpen } from "../sales/sales.utils";
import {
  ALREADY_PURCHASED_RESULT,
  SALE_NOT_ACTIVE_RESULT,
  SOLD_OUT_RESULT,
  SUCCESS_RESULT,
} from "./purchases.constants";
import { SoldOutError } from "./purchases.exceptions";
import { PurchaseReserveService } from "./purchases-reserve.service";

@Injectable()
export class PurchasesService {
  constructor(
    @Inject(DATABASE_CONNECTION) private readonly db: Database,
    private readonly reserveService: PurchaseReserveService,
    private readonly salesService: SalesService,
  ) {}

  async purchase(saleId: string, email: string): Promise<PurchaseResult> {
    const reservation = await this.reserveService.reserve(saleId, email);

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
        return this.writePurchase(saleId, email);
      case null:
      case "not_warmed":
        // Redis is down, or this sale was never loaded into it — fall
        // back to the same Postgres-only flow as before Redis existed.
        return this.recordPurchase(saleId, email);
    }
  }

  private async recordPurchase(saleId: string, email: string): Promise<PurchaseResult> {
    const sale = await this.salesService.findRowById(saleId);

    if (!sale) {
      throw new NotFoundException("Sale not found");
    }

    if (!isSaleOpen(sale, new Date())) {
      return SALE_NOT_ACTIVE_RESULT;
    }

    return this.writePurchase(saleId, email);
  }

  // Insert first, decrement second: a duplicate purchase or a purchase
  // outside the sale window (trigger-enforced) is then rejected before
  // ever touching — and contending on — the shared stock counter.
  private async writePurchase(saleId: string, email: string): Promise<PurchaseResult> {
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
