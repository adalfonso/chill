import { Client } from "@elastic/elasticsearch";

/** Singleton cache connection instance */
export class Search {
  /** Search engine connection */
  static _instance: Client;

  /**
   * Create a new connection

   * @throws when cache is already connected or fails to connect
   */
  static async connect({
    node,
    username,
    password,
  }: {
    node: string;
    username: string;
    password: string;
  }) {
    if (Search._instance) {
      throw new Error("Elasticsearch is already connected");
    }

    try {
      const client = new Client({
        node,
        auth: { username, password },
      });

      try {
        await client.cluster.health();
        console.info("Connected to Elasticsearch");
      } catch (error) {
        console.error("Elasticsearch connection failed:", error);
      }

      this._instance = client;
    } catch (err) {
      console.error(`Unable to connect to elasticsearch: ${err}`);

      throw new Error("Unable to connect to elasticsearch");
    }
  }

  /**
   * Get the connection
   *
   * @returns conection
   */
  static instance() {
    if (!Search._instance) {
      throw new Error("Failed to get cache connection instance.");
    }

    return Search._instance;
  }
}
