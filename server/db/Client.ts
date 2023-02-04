import mongoose from "mongoose";

/** Singleton DB connection instance */
export class Connection {
  /** Database Connection */
  private static _instance: Connection;

  /**
   * Create a new connection
   *
   * @param host DB host
   * @param port DB port
   * @throws when DB already connected or fails to connect
   */
  static async create(host: string, port: string) {
    if (Connection._instance) {
      throw new Error("Database is already connected");
    }

    try {
      mongoose.set("strictQuery", true);
      const uri = `mongodb://${host}:${port}/chill`;
      Connection._instance = await mongoose.connect(uri);
      console.info("Connected to mongodb");

      return Connection._instance;
    } catch (err) {
      console.error(`Unable to connect to mongo: ${err}`);

      throw new Error("Unable to connect to mongo");
    }
  }

  /**
   * Get the DB connection
   *
   * @returns DB conection
   */
  static instance() {
    if (!Connection._instance) {
      throw new Error("Failed to get DB connection instance.");
    }

    return Connection._instance;
  }
}
