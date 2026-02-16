import path from "path";
import preact from "@preact/preset-vite";
import { defineConfig } from "vite";
import viteCompression from "vite-plugin-compression";

export default defineConfig({
  root: "./client",
  build: {
    outDir: "../dist/client",
    emptyOutDir: true,  // Clean dist before build to avoid stale compressed files
    minify: "esbuild",
    target: "es2020",
  },
  esbuild: {
    drop: ["console", "debugger"],  // Remove console.* and debugger in production
  },
  plugins: [
    preact(),
    // Gzip compression (fallback for older browsers)
    viteCompression({
      algorithm: "gzip",
      ext: ".gz",
      threshold: 1024,
      deleteOriginFile: false,
    }),
    // Brotli compression (15-20% better than gzip, modern browsers)
    viteCompression({
      algorithm: "brotliCompress",
      ext: ".br",
      threshold: 1024,
      deleteOriginFile: false,
    }),
  ],
  resolve: {
    alias: {
      react: "preact/compat",
      "react-dom": "preact/compat",
      "@hooks": path.resolve(__dirname, "./client/hooks"),
      "@server": path.resolve(__dirname, "./server"),
      "@client": path.resolve(__dirname, "./client"),
      "@common": path.resolve(__dirname, "./common"),
      "@prisma/client": path.resolve(
        __dirname,
        "./prisma/generated/prisma/client",
      ),
    },
  },
});
