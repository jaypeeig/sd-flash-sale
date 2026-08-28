import {
  Global,
  Inject,
  Logger,
  Module,
  type OnModuleDestroy,
  type OnModuleInit,
} from "@nestjs/common";
import { REDIS_CONNECTION } from "./redis.constants";
import { redisProvider } from "./redis.provider";
import type { Redis } from "./redis.types";

@Global()
@Module({
  providers: [redisProvider],
  exports: [REDIS_CONNECTION],
})
export class RedisModule implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RedisModule.name);

  constructor(@Inject(REDIS_CONNECTION) private readonly redis: Redis) {}

  // XXX: lazyConnect means the socket only opens on the first command.
  async onModuleInit(): Promise<void> {
    try {
      await this.redis.ping();
    } catch (error) {
      this.logger.warn(
        `Initial Redis ping failed: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  // A live Redis socket otherwise keeps the event loop (and vitest
  // teardown) alive — this needs main.ts's app.enableShutdownHooks() to
  // actually run on process signals.
  async onModuleDestroy(): Promise<void> {
    await this.redis.quit();
  }
}
