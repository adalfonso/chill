import { Express } from "express";
import * as webpack from "webpack";

export const enableHmr = (app: Express) => {
  const config = require("../configs/webpack/client-dev.config.js");
  const compiler = webpack(config);

  app.use(
    require("webpack-dev-middleware")(compiler, {
      publicPath: config.output.publicPath,
    }),
  );

  app.use(require("webpack-hot-middleware")(compiler));
};
