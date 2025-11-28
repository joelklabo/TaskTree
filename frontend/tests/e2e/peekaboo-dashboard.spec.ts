import fs from "node:fs";

import { expect, test } from "./fixtures";
import { capturePeekaboo } from "./support/peekaboo";

// Scenario 8: Dashboard cards capture
// Ensures CI/Git/Servers/Alerts cards render with recent_text block and no clipping.
test("peekaboo captures dashboard cards", async ({ page }, testInfo) => {
  await page.goto("/");
  await page.getByRole("tab", { name: "Dashboard" }).click();

  await expect(page.getByText(/Dashboard \(shared state\)/i)).toBeVisible();
  await expect(page.getByRole("heading", { name: "CI" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Git" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Servers" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Alerts" })).toBeVisible();

  // Alerts pre block should be present (recent_text)
  await expect(page.getByText(/recent alerts text/i)).toBeVisible();

  const { capturePath, artifactPath, tracePath } = await capturePeekaboo(testInfo, {
    name: "dashboard",
    traceRunId: "peekaboo-dashboard",
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

  await testInfo.attach("peekaboo-dashboard", { path: capturePath, contentType: "image/png" });
  await testInfo.attach("peekaboo-dashboard-artifact", {
    path: artifactPath,
    contentType: "image/png",
  });
  if (tracePath) {
    await testInfo.attach("peekaboo-dashboard-trace-copy", {
      path: tracePath,
      contentType: "image/png",
    });
  }
});
