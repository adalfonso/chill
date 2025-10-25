import jwt, { JwtPayload } from "jsonwebtoken";
import { createClient } from "redis";
import { jwt_expiration_seconds } from "@server/controllers/AuthController";

/** Singleton cache connection instance */
export class Cache {
  /** Cache Connection */
  static _instance: ReturnType<typeof createClient>;

  /**
   * Create a new connection

   * @throws when cache is already connected or fails to connect
   */
  static async connect(host: string) {
    if (Cache._instance) {
      throw new Error("Cache is already connected");
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
    const payload = jwt.decode(token);
    const expires_in_seconds = getJwtExpiresInSeconds(payload);

    await client.set(getTokenKey(token), token, {
      EX: expires_in_seconds,
    });
  } catch (err) {
    console.error("Failed to blacklist a JWT", { err });
  }
};

export const getTokenKey = (token: string) => `token.blacklist.${token}`;

const getJwtExpiresInSeconds = (
  payload: null | JwtPayload | string,
): number => {
  if (payload === null || typeof payload === "string") {
    return jwt_expiration_seconds;
  }

  if (payload.exp === undefined) {
    return jwt_expiration_seconds;
  }

  return payload.exp - Math.round(Date.now().valueOf() / 1000);
};
