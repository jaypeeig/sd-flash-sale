-- Required for the citext type used by purchases.email
-- (case-insensitive: a@x.com == A@X.com).
CREATE EXTENSION IF NOT EXISTS citext;
