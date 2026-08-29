import { Logger, type Provider } from "@nestjs/common";
import { createQueueConnection } from "@workspace/queue";
import { QUEUE_CONNECTION } from "./queue.constants";

const logger = new Logger("Queue");

export const queueProvider: Provider = {
  provide: QUEUE_CONNECTION,
  useFactory: () =>
    createQueueConnection(undefined, (error) => {
      logger.warn(
        `RabbitMQ connection error — purchases will use the synchronous fallback until it recovers: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }),
};
