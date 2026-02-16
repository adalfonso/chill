import { defineConfig } from "vite";

export default defineConfig({
  root: "./receiver",
  build: {
    outDir: "../dist/receiver",
    emptyOutDir: true,
  },
  base: "/receiver/",
});
