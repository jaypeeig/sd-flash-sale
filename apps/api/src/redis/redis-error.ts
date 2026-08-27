import { RedisErrorCode } from "@workspace/redis";

export const isRedisUnavailable = (error: unknown): boolean => {
  if (typeof error !== "object" || error === null || !("code" in error)) {
    return false;
  }

  const { code } = error;
  return (
    code === RedisErrorCode.CONNECTION_REFUSED ||
    code === RedisErrorCode.CONNECTION_RESET ||
    code === RedisErrorCode.TIMEOUT
  );
};
