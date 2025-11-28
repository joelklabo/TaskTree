import fs from "node:fs";
import path from "node:path";

import { expect, test } from "./fixtures";
import { capturePeekaboo } from "./support/peekaboo";

test("peekaboo captures populated traces list", async ({ page }, testInfo) => {
  await page.goto("/traces");

  await expect(page.getByRole("heading", { name: "Traces", exact: true })).toBeVisible();
  await expect(page.getByRole("row", { name: /trace-demo/i })).toBeVisible({ timeout: 15000 });

  const traceRoot = testInfo.outputPath("trace-root");
  const { capturePath, artifactPath, tracePath } = await capturePeekaboo(testInfo, {
    name: "traces-list",
    traceRunId: "peekaboo-traces",
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

  await testInfo.attach("peekaboo-traces", { path: capturePath, contentType: "image/png" });
  await testInfo.attach("peekaboo-traces-artifact", {
    path: artifactPath,
    contentType: "image/png",
  });
  if (tracePath) {
    await testInfo.attach("peekaboo-traces-trace-copy", {
      path: tracePath,
      contentType: "image/png",
    });
  }
});
