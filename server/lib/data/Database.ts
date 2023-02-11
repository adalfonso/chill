import mongoose, { Mongoose } from "mongoose";

/** Singleton DB connection instance */
export class Database {
  /** Database Connection */
  static _instance: Mongoose;

  /**
   * Create a new connection
   *
   * @param host DB host
   * @param port DB port
   * @throws when DB already connected or fails to connect
   */
  static async connect(host: string, port: string) {
    if (Database._instance) {
      throw new Error("Database is already connected");
    }

    try {
      mongoose.set("strictQuery", true);
      const uri = `mongodb://${host}:${port}/chill`;
      Database._instance = await mongoose.connect(uri);
      console.info("Connected to mongodb");

      return Database._instance;
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
    if (!Database._instance) {
      throw new Error("Failed to get DB connection instance.");
    }

    return Database._instance;
  }
}
