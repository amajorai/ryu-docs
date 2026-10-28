import path from "node:path";
import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: __dirname,
  testMatch: "coverage-pages.spec.ts",
  globalSetup: path.resolve(__dirname, "coverage-pages.setup.ts"),
  fullyParallel: false,
  workers: 1,
  reporter: "line",
  timeout: 60_000,
  use: {
    baseURL: "http://127.0.0.1:5489",
    viewport: { width: 1440, height: 1000 },
    // Opt-in installed Chromium when the locked Playwright build is absent.
    launchOptions: {
      executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH,
    },
    trace: "retain-on-failure",
  },
  webServer: {
    command: "bun run start -- --hostname 127.0.0.1 --port 5489",
    cwd: path.resolve(__dirname, ".."),
    url: "http://127.0.0.1:5489",
    reuseExistingServer: false,
    timeout: 60_000,
  },
});
