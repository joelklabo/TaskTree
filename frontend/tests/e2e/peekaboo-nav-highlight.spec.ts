import fs from "node:fs";

import { expect, test } from "./fixtures";
import { capturePeekaboo } from "./support/peekaboo";

// Scenario 12: Header nav highlighting + No run selected badge
test("peekaboo captures header nav highlighting across tabs", async ({ page }, testInfo) => {
  await page.goto("/");

  const flowsTab = page.getByRole("tab", { name: "Flows" });
  await expect(flowsTab).toHaveAttribute("data-state", "active");
  await expect(page.getByText(/No run selected/i).first()).toBeVisible();

  // Switch to Traces tab and assert highlight updates
  const tracesTab = page.getByRole("tab", { name: "Traces" });
  await tracesTab.click();
  await expect(tracesTab).toHaveAttribute("data-state", "active");
  await expect(flowsTab).toHaveAttribute("data-state", "inactive");
  await expect(page.getByText(/No run selected/i).first()).toBeVisible();

  const { capturePath, artifactPath, tracePath } = await capturePeekaboo(testInfo, {
    name: "nav-highlight",
    traceRunId: "peekaboo-nav-highlight",
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

  await testInfo.attach("peekaboo-nav-highlight", { path: capturePath, contentType: "image/png" });
  await testInfo.attach("peekaboo-nav-highlight-artifact", {
    path: artifactPath,
    contentType: "image/png",
  });
  if (tracePath) {
    await testInfo.attach("peekaboo-nav-highlight-trace-copy", {
      path: tracePath,
      contentType: "image/png",
    });
  }
});
