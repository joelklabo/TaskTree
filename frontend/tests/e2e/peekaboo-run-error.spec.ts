import fs from "node:fs";

import { expect, test } from "./fixtures";
import { capturePeekaboo } from "./support/peekaboo";

// Scenario 9: Flow run error modal / toast
// Forces a run start failure to surface destructive toast + inline alert.
test("peekaboo captures run error modal and toast", async ({ page }, testInfo) => {
  // Force POST /api/runs to fail
  await page.route("**/api/runs", async (route) => {
    if (route.request().method() === "POST") {
      await route.fulfill({
        status: 500,
        json: { detail: "forced run failure" },
      });
      return;
    }
    await route.fallback();
  });
  await page.route("**/api/runs/", async (route) => {
    if (route.request().method() === "POST") {
      await route.fulfill({
        status: 500,
        json: { detail: "forced run failure" },
      });
      return;
    }
    await route.fallback();
  });

  await page.goto("/");

  const flowRow = page.getByRole("row", { name: /code_fix/ });
  const runResponse = page.waitForResponse(
    (resp) => resp.url().includes("/api/runs") && resp.request().method() === "POST",
  );
  await flowRow.getByRole("button", { name: "Run", exact: true }).click();
  await runResponse;

  // Inline destructive alert should be visible (toast may be transient)
  await expect(page.getByRole("alert").filter({ hasText: /Unable to load flows/i })).toBeVisible();

  const { capturePath, artifactPath, tracePath } = await capturePeekaboo(testInfo, {
    name: "run-error",
    traceRunId: "peekaboo-run-error",
    traceRoot: testInfo.outputPath("trace-root"),
  });

  expect(fs.existsSync(capturePath)).toBe(true);
  expect(fs.statSync(capturePath).size).toBeGreaterThan(0);
  expect(fs.existsSync(artifactPath)).toBe(true);
  expect(fs.statSync(artifactPath).size).toBeGreaterThan(0);
  if (tracePath) {
    expect(fs.existsSync(tracePath)).toBe(true);
    expect(fs.statSync(tracePath).size).toBeGreaterThan(0);
  }

  await testInfo.attach("peekaboo-run-error", { path: capturePath, contentType: "image/png" });
  await testInfo.attach("peekaboo-run-error-artifact", {
    path: artifactPath,
    contentType: "image/png",
  });
  if (tracePath) {
    await testInfo.attach("peekaboo-run-error-trace-copy", {
      path: tracePath,
      contentType: "image/png",
    });
  }
});
