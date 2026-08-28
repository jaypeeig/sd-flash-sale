export const getRedisUrl = (): string => {
  const url = process.env.REDIS_URL;
  if (!url) {
    throw new Error("REDIS_URL is not set — copy .env.example to .env at the repo root.");
  }
  return url;
};
