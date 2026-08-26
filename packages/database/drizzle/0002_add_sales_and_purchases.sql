CREATE TABLE "purchases" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"sale_id" uuid NOT NULL,
	"email" "citext" NOT NULL,
	"purchased_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "purchases_one_per_user_per_sale" UNIQUE("sale_id","email")
);
--> statement-breakpoint
CREATE TABLE "sales" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"product_id" uuid NOT NULL,
	"total_stock" integer NOT NULL,
	"remaining_stock" integer NOT NULL,
	"sale_price" numeric(10, 2) NOT NULL,
	"starts_at" timestamp with time zone NOT NULL,
	"ends_at" timestamp with time zone NOT NULL,
	"cancelled_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "sales_total_stock_check" CHECK ("sales"."total_stock" >= 0),
	CONSTRAINT "sales_remaining_stock_check" CHECK ("sales"."remaining_stock" >= 0),
	CONSTRAINT "sales_end_after_start" CHECK ("sales"."ends_at" > "sales"."starts_at"),
	CONSTRAINT "sales_remaining_lte_total" CHECK ("sales"."remaining_stock" <= "sales"."total_stock")
);
--> statement-breakpoint
ALTER TABLE "purchases" ADD CONSTRAINT "purchases_sale_id_sales_id_fk" FOREIGN KEY ("sale_id") REFERENCES "public"."sales"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sales" ADD CONSTRAINT "sales_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE restrict ON UPDATE no action;