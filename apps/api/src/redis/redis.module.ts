import { Global, Inject, Module, type OnModuleDestroy } from "@nestjs/common";
import { REDIS_CONNECTION } from "./redis.constants";
import { redisProvider } from "./redis.provider";
import type { Redis } from "./redis.types";

@Global()
@Module({
  providers: [redisProvider],
  exports: [REDIS_CONNECTION],
})
export class RedisModule implements OnModuleDestroy {
  constructor(@Inject(REDIS_CONNECTION) private readonly redis: Redis) {}

  // A live Redis socket otherwise keeps the event loop (and vitest
  // teardown) alive — this needs main.ts's app.enableShutdownHooks() to
  // actually run on process signals.
  async onModuleDestroy(): Promise<void> {
    await this.redis.quit();
  }
}
