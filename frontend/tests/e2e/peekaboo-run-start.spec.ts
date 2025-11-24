import fs from "node:fs";
import path from "node:path";

import { expect, test } from "./fixtures";
import { capturePeekaboo } from "./support/peekaboo";

test("peekaboo captures run start feedback with toast + run badge", async ({ page }, testInfo) => {
  await page.route("**/api/runs/", async (route) => {
    if (route.request().method() === "POST") {
      await route.fulfill({ json: { session_id: "sess-peekaboo", trace_run_id: "trace-peekaboo" } });
      return;
    }
    await route.fallback();
  });

  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Flows", exact: true })).toBeVisible();

  const flowRow = page.getByRole("row", { name: /code_fix/ });
  await flowRow.getByRole("button", { name: "Run with trace" }).click();

  await expect(page.getByRole("button", { name: "View last run" })).toBeVisible({ timeout: 10000 });

  const traceRoot = testInfo.outputPath("trace-root");
  const { capturePath, artifactPath, tracePath } = await capturePeekaboo(testInfo, {
    name: "run-start-feedback",
    traceRunId: "peekaboo-run-start",
    traceRoot
  });

  expect(fs.existsSync(capturePath)).toBe(true);
  expect(fs.statSync(capturePath).size).toBeGreaterThan(0);

  expect(fs.existsSync(artifactPath)).toBe(true);
  expect(fs.statSync(artifactPath).size).toBeGreaterThan(0);

  if (tracePath) {
    expect(fs.existsSync(tracePath)).toBe(true);
    expect(fs.statSync(tracePath).size).toBeGreaterThan(0);
  }

  await testInfo.attach("peekaboo-run-start", {
    path: capturePath,
    contentType: "image/png"
  });
  await testInfo.attach("peekaboo-run-start-artifact", {
    path: artifactPath,
    contentType: "image/png"
  });
  if (tracePath) {
    await testInfo.attach("peekaboo-run-start-trace-copy", {
      path: tracePath,
      contentType: "image/png"
    });
  }
});
