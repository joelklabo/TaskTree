import { defineConfig } from "@playwright/test";

const baseURL = process.env.E2E_BASE_URL || "http://localhost:5173";
const useExternalServer = process.env.E2E_EXTERNAL === "1";

export default defineConfig({
  testDir: "./tests",
  timeout: 60_000,
  expect: {
    timeout: 10_000
  },
  globalSetup: "./tests/e2e/global-setup.ts",
  use: {
    baseURL,
    headless: true,
    trace: "on-first-retry"
  },
  webServer: useExternalServer
    ? undefined
    : {
        command: "npm run dev -- --host --port 5173",
        url: baseURL,
        reuseExistingServer: false,
        stdout: "pipe",
        stderr: "pipe",
        timeout: 120_000
      }
});
