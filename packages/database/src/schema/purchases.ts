import { pgTable, timestamp, unique, uuid } from "drizzle-orm/pg-core";
import { citext } from "./citext";
import { sales } from "./sales";

// The correctness-critical table. The unique constraint below is what
// makes "one item per user" hold even under concurrent requests —
// a second insert attempt for the same (sale_id, email) fails at the
// database level regardless of what the app already checked.
export const purchases = pgTable(
  "purchases",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    saleId: uuid("sale_id")
      .notNull()
      .references(() => sales.id, { onDelete: "restrict" }),
    email: citext("email").notNull(), // case-insensitive: a@x.com == A@X.com
    purchasedAt: timestamp("purchased_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [unique("purchases_one_per_user_per_sale").on(table.saleId, table.email)],
);
