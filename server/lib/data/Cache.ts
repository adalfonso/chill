import { createClient } from "redis";

/**
 * The Redis connection type, as exposed by `Cache.instance()`
 *
 * Derived from the client `Cache` actually builds, rather than from the bare
 * `createClient`, because redis v5+ types the client by its options (e.g. the
 * RESP protocol version) and the generic form is not assignable from it.
 */
export type CacheClient = ReturnType<typeof createCacheClient>;

/** Singleton cache connection instance */
export class Cache {
  /** Cache Connection */
  static _instance: CacheClient;

  /**
   * Create a new connection
   *
   * Connects once per process; `instance()` returns the connection afterwards.
   *
   * @param host - the Redis host name (port 6379)
   * @param password - the Redis password, if the server requires one
   * @returns a promise that resolves once the connection is open
   * @throws when cache is already connected or fails to connect
   */
  static async connect(host: string, password?: string) {
    if (Cache._instance) {
      throw new Error("Cache is already connected");
    }

    try {
      const client = createCacheClient(host, password);

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
   * @returns connection
   * @throws when `connect()` has not completed yet
   */
  static instance() {
    if (!Cache._instance) {
      throw new Error("Failed to get cache connection instance.");
    }

    return Cache._instance;
  }
}

/**
 * Build the (not yet connected) Redis client for the cache
 *
 * @param host - the Redis host name (port 6379)
 * @param password - the Redis password, if the server requires one
 * @returns the configured client
 */
const createCacheClient = (host: string, password?: string) =>
  createClient({
    url: `redis://${host}:6379`,
    password: password,
    // A dropped socket otherwise queues commands indefinitely instead of
    // failing, parking every authenticated request until it reconnects
    // (ADR-0009 KTD15).
    disableOfflineQueue: true,
  });
