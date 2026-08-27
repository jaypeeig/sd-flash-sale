// Postgres's `purchases.email` column is citext (case-insensitive), so
// "A@X.com" and "a@x.com" are the same buyer there. Redis's buyer SETs have
// no such notion — every call site that reads or writes a buyer set (Lua
// reservation, release, sync) must normalize through this first, or Redis
// will let through a duplicate that Postgres would have rejected.
export const normalizeEmail = (email: string): string => email.trim().toLowerCase();
