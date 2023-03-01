import { defineConfig } from "vite";

export default defineConfig({
  root: "./receiver",
  build: { outDir: "../dist/receiver" },
  base: "/receiver/",
});
