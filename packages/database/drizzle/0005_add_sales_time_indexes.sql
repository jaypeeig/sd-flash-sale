CREATE INDEX "idx_sales_starts_at" ON "sales" USING btree ("starts_at");--> statement-breakpoint
CREATE INDEX "idx_sales_ends_at" ON "sales" USING btree ("ends_at");