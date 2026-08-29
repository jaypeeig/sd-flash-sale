import amqplib, { type Channel } from "amqplib";
import { PURCHASE_WRITES_DEAD_QUEUE, PURCHASE_WRITES_QUEUE } from "./constants";
import { getRabbitmqUrl } from "./env";
import type { QueueHandles } from "./client.types";

export const assertTopology = async (channel: Channel): Promise<void> => {
  await channel.assertQueue(PURCHASE_WRITES_DEAD_QUEUE, { durable: true });
  await channel.assertQueue(PURCHASE_WRITES_QUEUE, {
    durable: true,
    arguments: {
      "x-dead-letter-exchange": "",
      "x-dead-letter-routing-key": PURCHASE_WRITES_DEAD_QUEUE,
    },
  });
};

export const connect = async (
  connectionString: string = getRabbitmqUrl(),
): Promise<QueueHandles> => {
  const connection = await amqplib.connect(connectionString);
  const channel = await connection.createChannel();

  await assertTopology(channel);

  return {
    connection,
    channel,
    close: async () => {
      await channel.close();
      await connection.close();
    },
  };
};
