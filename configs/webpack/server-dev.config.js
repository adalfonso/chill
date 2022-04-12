const common = require("./server-common.config");
const { merge } = require("webpack-merge");

module.exports = merge(common, {
  mode: "development",
  watchOptions: {
    aggregateTimeout: 300,
    poll: 1000,
  },
});
