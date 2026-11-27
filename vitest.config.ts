import path from "path";
import { defineConfig } from "vitest/config";
import vite_config from "./vite.config";

/**
 * Test configuration.
 *
 * Deliberately does not extend the whole app build config: that config roots
 * Vite at ./client, drops console.* calls (which tests assert on), and adds
 * build-only compression. Only the module aliases are shared, so tests
 * resolve @client/@server/@common/@prisma/client exactly as the app does.
 *
 * The server-only aliases (@controllers, @middleware, @routes) come from
 * tsconfig.json, which tsx honors at runtime but the client build never
 * needs; they are added here so server modules resolve under test too.
 */
export default defineConfig({
  resolve: {
    alias: {
      ...vite_config.resolve?.alias,
      "@controllers": path.resolve(__dirname, "./server/controllers"),
      "@middleware": path.resolve(__dirname, "./server/middleware"),
      "@routes": path.resolve(__dirname, "./server/routes"),
    },
  },
  // Compile-time flags the client reads; both off under test.
  define: {
    DEVELOPMENT: false,
    FAKE_SERVER: false,
  },
  test: {
    // describe/it/expect/vi available without imports, as under Jest.
    globals: true,
    // Client code needs a DOM by default; server tests opt into Node with a
    // `/** @vitest-environment node */` docblock at the top of the file.
    environment: "jsdom",
    include: ["tests/**/*.{test,spec}.{ts,tsx}"],
    setupFiles: ["./tests/__mocks__/shim.js"],
    coverage: {
      provider: "v8",
      reportsDirectory: "./tests/__coverage__",
    },
  },
});
