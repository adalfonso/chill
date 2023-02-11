import { createClient } from "redis";

/** Singleton cache connection instance */
export class Cache {
  /** Database Connection */
  static _instance: ReturnType<typeof createClient>;

  /**
   * Create a new connection

   * @throws when cache is already connected or fails to connect
   */
  static async connect(host: string) {
    if (Cache._instance) {
      throw new Error("Database is already connected");
    }

    try {
      const client = createClient({ url: `redis://${host}:6379` });

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

export const blacklistToken = async (token: string) => {
  try {
    const client = Cache.instance();

    // TODO: this should be the number of seconds left in the JWT TTL
    const expires_in_seconds = 3600;

    await client.set(getTokenKey(token), token, {
      EX: expires_in_seconds,
    });
  } catch (err) {
    console.warn("Failed to blacklist a JWT");
  }
};

export const getTokenKey = (token: string) => `token.blacklist.${token}`;
