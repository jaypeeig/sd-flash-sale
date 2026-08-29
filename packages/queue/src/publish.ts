import type { Channel } from "amqplib";
import { PURCHASE_WRITES_QUEUE } from "./constants";
import type { PurchaseWriteMessage } from "./client.types";

export const publishPurchaseWrite = async (
  channel: Channel,
  message: PurchaseWriteMessage,
): Promise<void> => {
  const ok = channel.sendToQueue(PURCHASE_WRITES_QUEUE, Buffer.from(JSON.stringify(message)), {
    persistent: true,
  });

  if (!ok) {
    await new Promise<void>((resolve) => channel.once("drain", resolve));
  }
};
