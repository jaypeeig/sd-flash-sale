import type { Channel, ChannelModel } from "amqplib";

// Re-exported so consumers (e.g. apps/api's e2e test setup) never need
// amqplib as a direct dependency just to name this type.
export type { Channel };

export interface PurchaseWriteMessage {
  saleId: string;
  email: string;
  reservedAt: number; // ms epoch
}

export interface QueueHandles {
  connection: ChannelModel;
  channel: Channel;
  close: () => Promise<void>;
}
