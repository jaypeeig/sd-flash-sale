export const POSTGRES_UNIQUE_VIOLATION = "23505";

// drizzle-orm wraps every query failure in a DrizzleQueryError, with the
// underlying pg error (carrying the real SQLSTATE .code) nested under
// .cause rather than on the wrapper itself — so this walks the cause
// chain instead of only checking the top-level error.
const getErrorCode = (error: unknown): string | undefined => {
  if (typeof error !== "object" || error === null) {
    return undefined;
  }
  if ("code" in error && typeof error.code === "string") {
    return error.code;
  }
  if ("cause" in error) {
    return getErrorCode(error.cause);
  }
  return undefined;
};

export const isPgErrorWithCode = (error: unknown, code: string): boolean =>
  getErrorCode(error) === code;
