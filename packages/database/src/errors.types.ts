import type { DatabaseErrorCode } from "./errors";

export type DatabaseErrorCodeValue = (typeof DatabaseErrorCode)[keyof typeof DatabaseErrorCode];
