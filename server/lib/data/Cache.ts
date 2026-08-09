import { createClient } from "redis";

/** Singleton cache connection instance */
export class Cache {
  /** Cache Connection */
  static _instance: ReturnType<typeof createClient>;

  /**
   * Create a new connection

   * @throws when cache is already connected or fails to connect
   */
  static async connect(host: string, password?: string) {
    if (Cache._instance) {
      throw new Error("Cache is already connected");
    }

    try {
      const client = createClient({
        url: `redis://${host}:6379`,
        password: password,
        // A dropped socket otherwise queues commands indefinitely instead of
        // failing, parking every authenticated request until it reconnects
        // (ADR-0009 KTD15).
        disableOfflineQueue: true,
      });

      client.on("error", (err) => {
        console.error(`Unable to connect to redis: ${err}`);
      });

      client.on("connect", () => {
        console.info("Connected to redis");
      });

      await client.connect();
      this._instance = client;
    } catch (err) {
      console.error(`Unable to connect to redis: ${err}`);

      throw new Error("Unable to connect to redis");
    }
  }

  /**
   * Get the connection
   *
   * @returns conection
   */
  static instance() {
    if (!Cache._instance) {
      throw new Error("Failed to get cache connection instance.");
    }

    return Cache._instance;
  }
}
