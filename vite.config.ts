import path from "path";
import preact from "@preact/preset-vite";
import { defineConfig } from "vite";

export default defineConfig({
  root: "./client",
  build: { outDir: "../dist/client" },
  plugins: [preact()],
  resolve: {
    alias: {
      "@reducers": path.resolve(__dirname, "./client/state/reducers/"),
      "@hooks": path.resolve(__dirname, "./client/hooks"),
      "@server": path.resolve(__dirname, "./server"),
      "@client": path.resolve(__dirname, "./client"),
      "@common": path.resolve(__dirname, "./common"),
    },
  },
});
