const common = require("./client-common.config");
const { merge } = require("webpack-merge");
const { resolve } = require("path");

module.exports = merge(common, {
  mode: "production",
  entry: "./index.tsx",
  output: {
    filename: "js/bundle.[contenthash].min.js",
    path: resolve(__dirname, "../../dist/client"),
    publicPath: "/",
  },
  devtool: "source-map",
});
