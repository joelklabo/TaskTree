import fs from "node:fs";

import { expect, test } from "./fixtures";
import { capturePeekaboo } from "./support/peekaboo";

// Scenario 10: Trace raw session records
// Expands raw session JSON scroll area and captures it for Peekaboo.
test("peekaboo captures trace raw session records", async ({ page }, testInfo) => {
  await page.goto("/traces");

  await page.getByRole("row", { name: /trace-demo/ }).getByRole("button", { name: "View" }).click();

  // Expand session raw JSON
  await page.getByRole("button", { name: /Show session raw/i }).click();

  const rawBlock = page.locator("pre").first();
  await expect(rawBlock).toContainText(/flow_name/i);
  await expect(rawBlock).toBeVisible();

  const { capturePath, artifactPath, tracePath } = await capturePeekaboo(testInfo, {
    name: "trace-raw-session",
    traceRunId: "peekaboo-trace-raw",
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

  await testInfo.attach("peekaboo-trace-raw", { path: capturePath, contentType: "image/png" });
  await testInfo.attach("peekaboo-trace-raw-artifact", {
    path: artifactPath,
    contentType: "image/png",
  });
  if (tracePath) {
    await testInfo.attach("peekaboo-trace-raw-trace-copy", {
      path: tracePath,
      contentType: "image/png",
    });
  }
});
