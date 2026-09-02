import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.adalfonso.chill",
  appName: "Chill",
  webDir: "dist/client",
  android: {
    allowMixedContent: false,
  },
  server: {
    androidScheme: "http",
    url: "http://localhost:3200",
    cleartext: true,
  },
};

export default config;
