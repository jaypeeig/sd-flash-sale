import type { Channel } from "amqplib";
import { PURCHASE_WRITES_QUEUE } from "./constants";

export const purchaseQueueDepth = async (channel: Channel): Promise<number> => {
  const { messageCount } = await channel.checkQueue(PURCHASE_WRITES_QUEUE);
  return messageCount;
};
