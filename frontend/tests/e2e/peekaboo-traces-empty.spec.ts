import fs from "node:fs";

import { expect, test } from "./fixtures";
import { capturePeekaboo } from "./support/peekaboo";

// Scenario 11: Empty state handling on Traces tab
// Mocks empty trace list and captures the empty alert state.
test("peekaboo captures empty traces state", async ({ page }, testInfo) => {
  await page.route("**/api/trace/runs", async (route, request) => {
    if (request.method() === "GET") {
      await route.fulfill({ json: [] });
      return;
    }
    await route.fallback();
  });

  await page.goto("/traces");

  const emptyAlert = page.getByText(/No trace runs yet/i);
  await expect(emptyAlert).toBeVisible();

  const { capturePath, artifactPath, tracePath } = await capturePeekaboo(testInfo, {
    name: "traces-empty",
    traceRunId: "peekaboo-traces-empty",
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

  await testInfo.attach("peekaboo-traces-empty", { path: capturePath, contentType: "image/png" });
  await testInfo.attach("peekaboo-traces-empty-artifact", {
    path: artifactPath,
    contentType: "image/png",
  });
  if (tracePath) {
    await testInfo.attach("peekaboo-traces-empty-trace-copy", {
      path: tracePath,
      contentType: "image/png",
    });
  }
});
