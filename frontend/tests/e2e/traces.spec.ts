import { expect, test } from "@playwright/test";

// End-to-end: create a traced run via API, then verify Traces UI and Run detail render data.
test("traced run appears in UI with trace records", async ({ page }) => {
  // Create a traced run via API to ensure trace exists.
  const resp = await page.request.post("/api/runs/", {
    headers: { "x-trace": "true" },
    data: { flow_id: "code_fix", input: { bug_description: "e2e trace run" } }
  });
  expect(resp.ok()).toBeTruthy();
  const created = (await resp.json()) as { trace_run_id?: string | null };
  const runId = created.trace_run_id;
  expect(runId).toBeTruthy();
  if (!runId) {
    throw new Error("trace_run_id missing from run creation response");
  }

  // Wait until the run is visible in the trace list.
  const waitForRun = async () => {
    for (let i = 0; i < 20; i += 1) {
      const tracesResp = await page.request.get("/api/trace/runs");
      if (tracesResp.ok()) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const runs = (await tracesResp.json()) as Array<Record<string, any>>;
        if (runs.some((r) => r.run_id === runId)) {
          return;
        }
      }
      await page.waitForTimeout(500);
    }
    throw new Error("Timed out waiting for trace run to appear");
  };
  await waitForRun();

  await page.goto("/");
  await expect(page.getByRole("heading", { name: "TaskTree" })).toBeVisible();

  // Navigate to Traces tab.
  await page.getByRole("tab", { name: "Traces" }).click();
  const runButton = page.getByRole("button", { name: runId });
  await expect(runButton).toBeVisible({ timeout: 15000 });
  await runButton.click();
  const runDetailTab = page.getByRole("tab", { name: "Run detail" });
  await runDetailTab.click();

  // Trace detail should render JSON content (flow_name present).
  await expect(page.locator("pre").first()).toContainText('"flow_name": "code_fix"');

  const waitForArtifacts = async () => {
    for (let i = 0; i < 20; i += 1) {
      const artifactsResp = await page.request.get(`/api/trace/runs/${runId}/artifacts`);
      if (artifactsResp.status() === 404) {
        await page.waitForTimeout(500);
        continue;
      }
      expect(artifactsResp.ok()).toBeTruthy();
      const artifacts = (await artifactsResp.json()) as Array<unknown>;
      if (artifacts.length > 0) {
        return artifacts;
      }
      await page.waitForTimeout(500);
    }
    throw new Error("Timed out waiting for artifacts to be written");
  };

  const artifacts = await waitForArtifacts();
  expect(artifacts.length).toBeGreaterThan(0);
});
