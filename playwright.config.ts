import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./test",
  testMatch: /electron-smoke\.spec\.ts$/,
  timeout: 30000,
  fullyParallel: false,
  workers: 1,
  reporter: "list",
});
