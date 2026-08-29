import { Inject, Injectable, Logger } from "@nestjs/common";
import { publishPurchaseWrite, type PurchaseWriteMessage } from "@workspace/queue";
import { QUEUE_CONNECTION } from "../queue/queue.constants";
import type { Queue } from "../queue/queue.types";

@Injectable()
export class PurchaseQueueService {
  private readonly logger = new Logger(PurchaseQueueService.name);

  constructor(@Inject(QUEUE_CONNECTION) private readonly queue: Queue) {}

  // false means "don't trust the broker right now" (down, or the publish
  // itself failed) — the caller falls back to the synchronous Postgres
  // write, the same shape as PurchaseReserveService.reserve()'s null.
  async publish(message: PurchaseWriteMessage): Promise<boolean> {
    const channel = this.queue.getChannel();
    if (!channel) {
      return false;
    }

    try {
      await publishPurchaseWrite(channel, message);
      return true;
    } catch (error) {
      this.logger.warn(
        `Failed to publish purchase write for sale ${message.saleId} — falling back to Postgres: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
      return false;
    }
  }
}
