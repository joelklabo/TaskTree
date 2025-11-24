import fs from "node:fs";
import path from "node:path";

import { expect, test } from "./fixtures";
import { capturePeekaboo } from "./support/peekaboo";

test("peekaboo captures flow graph for log_error_handler", async ({ page }, testInfo) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Flows", exact: true })).toBeVisible();

  // Wait for flows to load - relaxed check
  // The previous check was waiting for a specific response URL pattern which might be flaky if cached or different.
  // Instead, let's wait for the button to appear.
  /*
  await page.waitForResponse(
    (resp) => resp.url().includes("/api/flows/") && resp.status() === 200,
    { timeout: 15000 },
  );
  */
  const flowButton = page.getByRole("button", { name: "log_error_handler" });
  await expect(flowButton).toBeVisible({ timeout: 15000 });
  await flowButton.click();

  await expect(page.getByText("Flow detail: log_error_handler")).toBeVisible();
  await expect(page.locator(".react-flow")).toBeVisible();
  const nodeCount = await page.locator(".react-flow__node").count();
  expect(nodeCount).toBeGreaterThan(0);
  await expect(page.locator(".react-flow__node").first()).toHaveCSS("position", "absolute");

  const traceRoot = testInfo.outputPath("trace-root");
  const { capturePath, artifactPath, tracePath } = await capturePeekaboo(testInfo, {
    name: "flow-graph-log-error-handler",
    traceRunId: "peekaboo-flow-graph",
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
  await testInfo.attach("peekaboo-flow-graph", {
    path: capturePath,
    contentType: "image/png"
  });
  await testInfo.attach("peekaboo-flow-graph-artifact", {
    path: artifactPath,
    contentType: "image/png"
  });
  if (tracePath) {
    await testInfo.attach("peekaboo-flow-graph-trace-copy", {
      path: tracePath,
      contentType: "image/png"
    });
  }
});
