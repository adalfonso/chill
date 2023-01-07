import { init as initializer } from "./init.mjs";
import { createServer } from "../viteDevServer.mjs";

createServer({ port: 1337, initializer });
