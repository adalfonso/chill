import "core-js";
import "regenerator-runtime";
import * as dotenv from "dotenv";
import * as express from "express";
import { connect } from "./db/Client";
import { enableHmr } from "./hmr";
import { MediaCrawler } from "./media/MediaCrawler";
import * as fs from "fs/promises";
import * as path from "path";
import { AudioType } from "./media/types";

dotenv.config();

// Check for required env vars
["NODE_PORT", "SOURCE_DIR"].forEach((key) => {
  if (process.env[key] === undefined) {
    throw new Error(`Missing env value for ${key}`);
  }
});

const app = express();

// Enable hot module replacement during dev
if (process.env.NODE_ENV === "development") {
  enableHmr(app);
}

app.use(express.static(process.env.SOURCE_DIR));

const crawler = new MediaCrawler({
  workers: 50,
  file_types: Object.values(AudioType),
});

crawler.crawl("/opt/app/media").then(async (result) => {
  await fs.writeFile(
    path.join("/opt/app/media/", "log.json"),
    JSON.stringify(
      {
        result,
        duration: result.end.valueOf() - result.start.valueOf(),
        dir_count: result.dirs.length,
        files_count: result.files.length,
      },
      null,
      2,
    ),
  );
});

app.listen(process.env.NODE_PORT, () => {
  console.log(`Server started: http://localhost:${process.env.NODE_PORT}`);
  console.log(`Serving content from /${process.env.SOURCE_DIR}/`);
});

connect(process.env.MONGO_HOST, process.env.MONGO_PORT);
