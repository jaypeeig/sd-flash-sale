import { customType } from "drizzle-orm/pg-core";

// Case-insensitive text (requires the `citext` extension) — used for
// email columns so a@x.com and A@X.com collide on uniqueness checks.
export const citext = customType<{ data: string }>({
  dataType: () => "citext",
});
