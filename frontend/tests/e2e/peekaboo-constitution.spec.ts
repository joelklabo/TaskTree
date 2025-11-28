import fs from "node:fs";

import { expect, test } from "./fixtures";
import { capturePeekaboo } from "./support/peekaboo";

// Scenario 7: Constitution page capture
// Renders ownership/protected paths from seeded API and captures for Peekaboo.
test("peekaboo captures constitution page", async ({ page }, testInfo) => {
  await page.goto("/constitution");

  await expect(page.getByRole("heading", { name: "Constitution" })).toBeVisible();
  await expect(page.getByText("Live from backend")).toBeVisible();

  // Ensure task states render concrete values (no placeholders)
  await expect(page.getByRole("heading", { name: "Task states" })).toBeVisible();
  await expect(page.getByText(/todo/i).first()).toBeVisible();
  await expect(page.getByText(/in_progress/i).first()).toBeVisible();
  await expect(page.getByText(/start -> in_progress/i)).toBeVisible();

  // Ownership + protected paths present
  await expect(page.getByRole("heading", { name: "Ownership" })).toBeVisible();
  await expect(page.getByText(/planner\//i)).toBeVisible();
  await expect(page.getByText(/tasktree\/config\/flows\//i)).toBeVisible();

  await expect(page.getByRole("heading", { name: "Protected paths" })).toBeVisible();
  await expect(page.getByText(/constitution\.yaml/i)).toBeVisible();

  const { capturePath, artifactPath, tracePath } = await capturePeekaboo(testInfo, {
    name: "constitution",
    traceRunId: "peekaboo-constitution",
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

  await testInfo.attach("peekaboo-constitution", { path: capturePath, contentType: "image/png" });
  await testInfo.attach("peekaboo-constitution-artifact", {
    path: artifactPath,
    contentType: "image/png",
  });
  if (tracePath) {
    await testInfo.attach("peekaboo-constitution-trace-copy", {
      path: tracePath,
      contentType: "image/png",
    });
  }
});
