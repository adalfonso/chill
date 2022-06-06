import WebpackDevMiddleware from "webpack-dev-middleware";
import WebpackHotMiddleware from "webpack-hot-middleware";
import config from "../configs/webpack/client-dev.config";
import webpack from "webpack";
import { Express } from "express";

/**
 * Enable hot module replacement for an application
 *
 * @param app express app
 */
export const enableHmr = (app: Express) => {
  const compiler = webpack(config);

  app.use(
    WebpackDevMiddleware(compiler, {
      publicPath: config.output.publicPath,
    }),
  );

  app.use(WebpackHotMiddleware(compiler));
};
