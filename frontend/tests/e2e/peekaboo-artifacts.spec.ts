import fs from "node:fs";

import { expect, test } from "./fixtures";
import { capturePeekaboo } from "./support/peekaboo";

// Scenario 6: Artifacts panel capture
// Uses seeded trace-demo run to render artifacts list and download links.
test("peekaboo captures artifacts panel", async ({ page }, testInfo) => {
  await page.goto("/traces");

  await page.getByRole("row", { name: /trace-demo/ }).getByRole("button", { name: "View" }).click();

  await page.getByRole("tab", { name: "Artifacts" }).click();

  // Expect at least one artifact entry with download link
  const artifactLink = page.getByRole("link", { name: /download/i }).first();
  await expect(artifactLink).toBeVisible({ timeout: 15000 });

  const { capturePath, artifactPath, tracePath } = await capturePeekaboo(testInfo, {
    name: "artifacts-panel",
    traceRunId: "peekaboo-artifacts",
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

  await testInfo.attach("peekaboo-artifacts", { path: capturePath, contentType: "image/png" });
  await testInfo.attach("peekaboo-artifacts-artifact", {
    path: artifactPath,
    contentType: "image/png",
  });
  if (tracePath) {
    await testInfo.attach("peekaboo-artifacts-trace-copy", {
      path: tracePath,
      contentType: "image/png",
    });
  }
});
