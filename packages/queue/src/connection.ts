import amqplib, { type Channel, type ChannelModel } from "amqplib";
import { assertTopology } from "./client";
import { getRabbitmqUrl } from "./env";

const RECONNECT_BASE_DELAY_MS = 500;
const RECONNECT_MAX_DELAY_MS = 10_000;

export interface QueueConnection {
  /** null whenever the broker is unreachable — callers degrade to the
   * synchronous fallback, exactly like apps/api/src/redis on a down Redis. */
  getChannel: () => Channel | null;
  close: () => Promise<void>;
}

export const createQueueConnection = (
  connectionString: string = getRabbitmqUrl(),
  onError?: (error: unknown) => void,
): QueueConnection => {
  let channel: Channel | null = null;
  let connection: ChannelModel | null = null;
  let closed = false;
  let attempt = 0;

  const scheduleReconnect = (): void => {
    if (closed) return;
    attempt += 1;
    const delay = Math.min(RECONNECT_BASE_DELAY_MS * 2 ** (attempt - 1), RECONNECT_MAX_DELAY_MS);
    setTimeout(() => void connectOnce(), delay);
  };

  const connectOnce = async (): Promise<void> => {
    if (closed) return;
    try {
      const nextConnection = await amqplib.connect(connectionString);
      const nextChannel = await nextConnection.createChannel();
      await assertTopology(nextChannel);

      attempt = 0;
      connection = nextConnection;
      channel = nextChannel;

      const onDown = (error?: unknown): void => {
        if (connection === nextConnection) {
          connection = null;
          channel = null;
        }
        if (error) onError?.(error);
        scheduleReconnect();
      };

      nextConnection.on("error", onDown);
      nextConnection.on("close", () => onDown());
    } catch (error) {
      onError?.(error);
      scheduleReconnect();
    }
  };

  void connectOnce();

  return {
    getChannel: () => channel,
    close: async () => {
      closed = true;
      const currentConnection = connection;
      channel = null;
      connection = null;
      if (currentConnection) {
        await currentConnection.close();
      }
    },
  };
};
