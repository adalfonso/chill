import * as webpack from "webpack";
import { Express } from "express";

/**
 * Enable hot module replacement for an application
 *
 * @param app express app
 */
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
