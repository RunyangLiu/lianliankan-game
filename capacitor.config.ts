import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.codex.lianliankan",
  appName: "果趣对对消",
  webDir: "dist",
  android: {
    allowMixedContent: false,
  },
};

export default config;
