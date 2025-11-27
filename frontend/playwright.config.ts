import { defineConfig } from "@playwright/test";
import path from "node:path";

const baseURL = process.env.E2E_BASE_URL || "http://localhost:4173";
const useExternalServer = process.env.E2E_EXTERNAL === "1";
// Use the working directory so GitHub Actions + pnpm exec resolve identically.
const testDir = path.resolve(process.cwd(), "tests", "e2e");

// Helpful diagnostics when CI can't discover tests.
console.log("[playwright-config] cwd:", process.cwd(), "testDir:", testDir);

export default defineConfig({
  // Using an absolute path avoids any ambiguity if the working directory
  // changes in CI and makes “no tests found” failures easier to diagnose.
  testDir,
  timeout: 60_000,
  expect: {
    timeout: 10_000
  },
  globalSetup: "./tests/e2e/global-setup.ts",
  reporter:
    process.env.CI === "true"
      ? [
          ["line"],
          ["html", { outputFolder: "playwright-report", open: "never" }]
        ]
      : "list",
  outputDir: "test-results",
  use: {
    baseURL,
    headless: true,
    trace: "on-first-retry"
  },
  webServer: useExternalServer
    ? undefined
    : {
        command: "npm run dev -- --host --port 4173",
        url: baseURL,
        reuseExistingServer: true,
        stdout: "pipe",
        stderr: "pipe",
        timeout: 120_000
      }
});
