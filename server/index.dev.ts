import { init as initializer } from "./init";
import { createServer } from "../viteDevServer";

createServer({ port: 1337, initializer });
