const nodeExternals = require("webpack-node-externals");
const { resolve } = require("path");

module.exports = {
  target: "node",
  externals: [nodeExternals()],
  externalsPresets: { node: true },
  context: resolve(__dirname, "../../server"),
  entry: ["./index.ts"],
  resolve: {
    extensions: [".ts", ".js"],

    alias: {
      "@server": resolve(__dirname, "../../server/"),
    },
  },
  output: {
    filename: "index.js",
    path: resolve(__dirname, "../../dist/server"),
  },
  module: {
    rules: [
      {
        test: [/\.ts$/, /\.js$/],
        use: ["babel-loader"],
        exclude: /node_modules/,
      },
    ],
  },
};
