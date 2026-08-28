// XXX: purchases.email is citext (case-insensitive) but not trimmed by the
// DB — a Redis set is byte-exact, so lowercase here to keep both stores
// agreeing on what counts as "the same buyer".
export const normalizeEmail = (email: string): string => email.toLowerCase();
