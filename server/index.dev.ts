import { init as initializer } from "./init";
import { createServer } from "../viteDevServer";

createServer({ port: parseInt(process.env.NODE_PORT as string), initializer });
