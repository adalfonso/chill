const common = require("./server-common.config");
const { merge } = require("webpack-merge");

module.exports = merge(common, { mode: "production" });
