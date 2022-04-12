const common = require("./client-common.config");
const webpack = require("webpack");
const { merge } = require("webpack-merge");
const { resolve } = require("path");

module.exports = merge(common, {
  mode: "development",
  entry: [
    "react-hot-loader/patch",
    "webpack-hot-middleware/client?path=/__webpack_hmr&timeout=20000",
    "./index.tsx",
  ],
  output: {
    filename: "js/bundle.js",
    path: resolve(__dirname, "../../dist/client"),
    publicPath: "/",
    clean: true,
  },
  devtool: "inline-source-map",
  plugins: [new webpack.HotModuleReplacementPlugin()],
  watchOptions: {
    aggregateTimeout: 300,
    poll: 1000,
  },
});
