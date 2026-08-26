-- Cross-table check (Postgres CHECK constraints can't reference other
-- tables), so this is enforced via a BEFORE INSERT trigger instead.
--
-- Raises a custom SQLSTATE so app can distinguish this business
-- error from a generic constraint violation by catching on error.code:
--   P1002 - purchased_at falls outside the sale's [starts_at, ends_at]
-- (A nonexistent sale_id is already rejected by the sale_id FK, so that
-- case isn't duplicated here.) Kept in sync with DatabaseErrorCode in
-- packages/database/src/errors.ts.
CREATE OR REPLACE FUNCTION check_purchase_within_sale_period()
RETURNS TRIGGER AS $$
DECLARE
    sale_starts_at TIMESTAMPTZ;
    sale_ends_at TIMESTAMPTZ;
BEGIN
    SELECT starts_at, ends_at INTO sale_starts_at, sale_ends_at
    FROM sales
    WHERE id = NEW.sale_id;

    IF NEW.purchased_at < sale_starts_at OR NEW.purchased_at > sale_ends_at THEN
        RAISE EXCEPTION 'purchase is outside the sale period (starts_at=%, ends_at=%, purchased_at=%)',
            sale_starts_at, sale_ends_at, NEW.purchased_at
            USING ERRCODE = 'P1002';
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_purchases_within_sale_period
    BEFORE INSERT ON purchases
    FOR EACH ROW EXECUTE FUNCTION check_purchase_within_sale_period();
