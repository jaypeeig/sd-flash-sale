import type { RedisErrorCode } from "./errors";

export type RedisErrorCodeValue = (typeof RedisErrorCode)[keyof typeof RedisErrorCode];
