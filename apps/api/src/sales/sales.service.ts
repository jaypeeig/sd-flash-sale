import { Inject, Injectable } from "@nestjs/common";
import { products, sales } from "@workspace/database";
import type { GetSalesParams, Sale, SalePhase } from "@workspace/shared-types";
import { and, eq, gt, isNull, lte, or, sql } from "drizzle-orm";
import { DATABASE_CONNECTION } from "../database/database.constants";
import type { Database } from "../database/database.types";

@Injectable()
export class SalesService {
  constructor(@Inject(DATABASE_CONNECTION) private readonly db: Database) {}

  async findAll(status?: GetSalesParams["status"]): Promise<Sale[]> {
    const now = new Date();

    const phase = sql<SalePhase>`
      case
        when ${sales.startsAt} > ${now} then 'upcoming'
        when ${sales.endsAt} <= ${now} then 'ended'
        when ${sales.remainingStock} <= 0 then 'sold_out'
        else 'active'
      end
    `;

    const isActive = and(
      lte(sales.startsAt, now),
      gt(sales.endsAt, now),
      gt(sales.remainingStock, 0),
    );
    const isUpcoming = gt(sales.startsAt, now);
    const isPast = or(
      lte(sales.endsAt, now),
      and(lte(sales.startsAt, now), gt(sales.endsAt, now), eq(sales.remainingStock, 0)),
    );

    const statusCondition =
      status === "active"
        ? isActive
        : status === "upcoming"
          ? isUpcoming
          : status === "past"
            ? isPast
            : undefined;

    const conditions = [isNull(sales.cancelledAt), statusCondition].filter(
      (condition) => condition !== undefined,
    );

    const rows = await this.db
      .select({
        id: sales.id,
        phase,
        salePrice: sales.salePrice,
        totalStock: sales.totalStock,
        remainingStock: sales.remainingStock,
        startsAt: sales.startsAt,
        endsAt: sales.endsAt,
        productId: products.id,
        productName: products.name,
        productDescription: products.description,
        productImageUrl: products.imageUrl,
        productPrice: products.price,
      })
      .from(sales)
      .innerJoin(products, eq(sales.productId, products.id))
      .where(and(...conditions));

    const serverTime = now.toISOString();

    return rows.map((row) => ({
      id: row.id,
      product: {
        id: row.productId,
        name: row.productName,
        description: row.productDescription,
        imageUrl: row.productImageUrl,
        price: row.productPrice,
      },
      phase: row.phase,
      salePrice: row.salePrice,
      totalStock: row.totalStock,
      remainingStock: row.remainingStock,
      startsAt: row.startsAt.toISOString(),
      endsAt: row.endsAt.toISOString(),
      serverTime,
    }));
  }
}
