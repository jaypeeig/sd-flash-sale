import { createRedis } from "../client";
import { loadEnv } from "../load-env";
import { flushSaleKeys } from "../sync";

loadEnv();

const run = async () => {
  const { redis, close } = createRedis();

  try {
    const deleted = await flushSaleKeys(redis);
    console.log(`Flushed ${deleted} flashsale:* key(s).`);
  } finally {
    await close();
  }
};

void run().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
