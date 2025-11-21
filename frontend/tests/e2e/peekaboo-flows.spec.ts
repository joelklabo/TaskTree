import fs from "node:fs";
import path from "node:path";

import { expect, test } from "./fixtures";
import { capturePeekaboo } from "./support/peekaboo";

test("peekaboo captures flows list screenshot", async ({ page }, testInfo) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Flows" })).toBeVisible();
  await expect(page.getByText("code_fix")).toBeVisible();

  const traceRoot = testInfo.outputPath("trace-root");
  const { capturePath, artifactPath, tracePath } = await capturePeekaboo(testInfo, {
    name: "flows-list",
    traceRunId: "peekaboo-flows",
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

  const basename = path.basename(capturePath);
  await testInfo.attach("peekaboo-flows", {
    path: capturePath,
    contentType: "image/png"
  });
  await testInfo.attach("peekaboo-artifact", {
    path: artifactPath,
    contentType: "image/png"
  });
  if (tracePath) {
    await testInfo.attach("peekaboo-trace-copy", {
      path: tracePath,
      contentType: "image/png"
    });
  }
});
