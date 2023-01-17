import path from "path";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  root: "./client",
  build: { outDir: "../dist/client" },
  plugins: [react()],
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
