import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.wodetianna.habitcheckin",
  appName: "21天",
  webDir: "dist",
  server: {
    androidScheme: "https",
  },
};

export default config;
