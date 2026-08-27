import { CACHE_MANAGER } from "@nestjs/cache-manager";
import { Inject, Injectable, NotFoundException } from "@nestjs/common";
import { products, sales } from "@workspace/database";
import type { GetSalesParams, Sale } from "@workspace/shared-types";
import type { Cache } from "cache-manager";
import { and, eq, gt, isNull, lte, or } from "drizzle-orm";
import { DATABASE_CONNECTION } from "../database/database.constants";
import type { Database } from "../database/database.types";
import type { SaleRow, SaleSelection } from "./sales.types";
import { mapRowToSale } from "./sales.utils";

// XXX: sale rows only ever move forward (stock down, cancelledAt set once),
// so a short TTL is enough to cut repeat lookups without ever serving a
// contradiction. Misses are never cached — an unknown id must keep hitting
// the DB so the cache can't be grown with garbage ids.
const SALE_CACHE_TTL_MS = 1000;

const saleCacheKey = (id: string) => `sale:${id}`;

const SALE_COLUMNS: SaleSelection = {
  id: sales.id,
  salePrice: sales.salePrice,
  totalStock: sales.totalStock,
  remainingStock: sales.remainingStock,
  startsAt: sales.startsAt,
  endsAt: sales.endsAt,
  cancelledAt: sales.cancelledAt,
  productId: products.id,
  productName: products.name,
  productDescription: products.description,
  productImageUrl: products.imageUrl,
  productPrice: products.price,
};

@Injectable()
export class SalesService {
  constructor(
    @Inject(DATABASE_CONNECTION) private readonly db: Database,
    @Inject(CACHE_MANAGER) private readonly cache: Cache,
  ) {}

  // Shared by findById and PurchasesService.purchase() — the raw row,
  // cached, with no window/cancellation filtering applied. Each caller
  // decides what "not found" means for its own response shape.
  async findRowById(id: string): Promise<SaleRow | undefined> {
    const cached = await this.cache.get<SaleRow>(saleCacheKey(id));
    if (cached) {
      return cached;
    }

    const [row] = await this.db
      .select(SALE_COLUMNS)
      .from(sales)
      .innerJoin(products, eq(sales.productId, products.id))
      .where(eq(sales.id, id));

    if (row) {
      await this.cache.set(saleCacheKey(id), row, SALE_CACHE_TTL_MS);
    }

    return row;
  }

  async findAll(status?: GetSalesParams["status"]): Promise<Sale[]> {
    const now = new Date();

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
      .select(SALE_COLUMNS)
      .from(sales)
      .innerJoin(products, eq(sales.productId, products.id))
      .where(and(...conditions));

    return rows.map((row) => mapRowToSale(row, now));
  }

  async findById(id: string): Promise<Sale> {
    const row = await this.findRowById(id);

    if (!row || row.cancelledAt !== null) {
      throw new NotFoundException("Sale not found");
    }

    return mapRowToSale(row, new Date());
  }
}
