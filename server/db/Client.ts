import { MongoClient } from "mongodb";

/**
 * Create a mongodb client
 *
 * @param host - mongo host name
 * @param port - mongo port
 *
 * @returns client
 */
export const create = (host: string, port: string) => {
  const uri = `mongodb://${host}:${port}`;

  return new MongoClient(uri);
};

/**
 * Connect to mongodb
 *
 * @param host - mongo host name
 * @param port - mongo port
 *
 * @returns client
 * @throws when it can't conneect
 */
export const connect = async (host: string, port: string) => {
  const client = create(host, port);

  try {
    await client.connect();

    console.info("Connected to mongodb");

    return client;
  } catch (e) {
    console.error(`Unable to connect to mongo: ${e}`);

    throw new Error("Unable to connect to mongo");
  }
};
