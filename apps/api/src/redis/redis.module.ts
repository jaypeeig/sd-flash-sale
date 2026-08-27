import { Global, Inject, Module, type OnModuleDestroy } from "@nestjs/common";
import { REDIS_CONNECTION } from "./redis.constants";
import { redisProvider } from "./redis.provider";
import type { RedisClient } from "./redis.types";

@Global()
@Module({
  providers: [redisProvider],
  exports: [REDIS_CONNECTION],
})
export class RedisModule implements OnModuleDestroy {
  constructor(@Inject(REDIS_CONNECTION) private readonly redis: RedisClient) {}

  // Unlike DatabaseModule, closing this matters: a live Redis socket keeps
  // the event loop (and vitest teardown) alive after the Nest app closes.
  async onModuleDestroy(): Promise<void> {
    await this.redis.quit();
  }
}
