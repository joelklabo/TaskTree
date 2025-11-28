import fs from "node:fs";
import path from "node:path";

import { expect, test } from "./fixtures";
import { capturePeekaboo } from "./support/peekaboo";

// Scenario 5: Run detail timeline capture
// Uses seeded trace-demo fixture from backend to render timeline cards and raw toggle.
test("peekaboo captures run detail timeline", async ({ page }, testInfo) => {
  await page.goto("/traces");

  // Open seeded trace run
  await page.getByRole("row", { name: /trace-demo/ }).getByRole("button", { name: "View" }).click();

  await expect(page.getByText("Trace timeline")).toBeVisible();
  await expect(page.getByRole("button", { name: /Show raw/i })).toBeVisible();

  // Expand first step raw payload to confirm availability
  await page.getByRole("button", { name: /Show raw/i }).first().click();

  const traceRoot = testInfo.outputPath("trace-root");
  const { capturePath, artifactPath, tracePath } = await capturePeekaboo(testInfo, {
    name: "run-detail-timeline",
    traceRunId: "peekaboo-run-detail",
    traceRoot,
  });

  expect(fs.existsSync(capturePath)).toBe(true);
  expect(fs.statSync(capturePath).size).toBeGreaterThan(0);

  expect(fs.existsSync(artifactPath)).toBe(true);
  expect(fs.statSync(artifactPath).size).toBeGreaterThan(0);

  if (tracePath) {
    expect(fs.existsSync(tracePath)).toBe(true);
    expect(fs.statSync(tracePath).size).toBeGreaterThan(0);
  }

  await testInfo.attach("peekaboo-run-detail", { path: capturePath, contentType: "image/png" });
  await testInfo.attach("peekaboo-run-detail-artifact", {
    path: artifactPath,
    contentType: "image/png",
  });
  if (tracePath) {
    await testInfo.attach("peekaboo-run-detail-trace-copy", {
      path: tracePath,
      contentType: "image/png",
    });
  }
});
