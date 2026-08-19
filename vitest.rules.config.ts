import { defineConfig } from "vitest/config";

// A separate config from the Angular unit-test builder: this suite talks to a
// real (local) Realtime Database emulator over the network, which needs Node
// rather than jsdom and has nothing to do with the app's own coverage thresholds.
export default defineConfig({
  test: {
    include: ["database.rules.spec.ts"],
    environment: "node",
    globals: true,
    testTimeout: 20000,
  },
});
