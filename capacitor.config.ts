import type { CapacitorConfig } from "@capacitor/cli";
import dotenv from "dotenv";

dotenv.config();

// Same source of truth the server uses to build its own OAuth callback URL
// (see passportConfig.ts) — pointing the native shell anywhere else would
// make it same-origin with a different server than the one it authenticates
// against. Switching between a local dev server and a real deployment is a
// matter of changing HOST/APP_PORT in .env, not this file.
const server_url = `${process.env.HOST}:${process.env.APP_PORT}`;
const is_cleartext = server_url.startsWith("http://");

const config: CapacitorConfig = {
  appId: "com.adalfonso.chill",
  appName: "Chill",
  webDir: "dist/client",
  android: {
    allowMixedContent: false,
  },
  server: {
    androidScheme: is_cleartext ? "http" : "https",
    url: server_url,
    cleartext: is_cleartext,
  },
};

export default config;
