import { Global, Inject, Module, type OnModuleDestroy } from "@nestjs/common";
import { QUEUE_CONNECTION } from "./queue.constants";
import { queueProvider } from "./queue.provider";
import type { Queue } from "./queue.types";

@Global()
@Module({
  providers: [queueProvider],
  exports: [QUEUE_CONNECTION],
})
export class QueueModule implements OnModuleDestroy {
  constructor(@Inject(QUEUE_CONNECTION) private readonly queue: Queue) {}

  async onModuleDestroy(): Promise<void> {
    await this.queue.close();
  }
}
