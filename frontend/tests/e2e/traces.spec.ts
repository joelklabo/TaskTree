import { expect, test } from "./fixtures";

// Verify Traces UI renders a traced run and drill-down pages.
test("traced run appears in UI with trace records", async ({ page }) => {
  const runId = "trace-demo-e2e";

  // Mock trace APIs to provide a stable run and trace data.
  await page.route("**/api/trace/runs", async (route) => {
    await route.fulfill({
      json: [
        {
          run_id: runId,
          flow_name: "code_fix",
          status: "tests_passed",
          label: "Demo run",
          start_time: "2025-01-01T00:00:00Z",
          end_time: "2025-01-01T00:00:05Z"
        }
      ]
    });
  });

  await page.route(`**/api/trace/runs/${runId}/trace`, async (route) => {
    await route.fulfill({
      json: [
        {
          run_id: runId,
          session: {
            flow_name: "code_fix",
            flow_version: "0.1.0",
            start_time: "2025-01-01T00:00:00Z",
            end_time: "2025-01-01T00:00:05Z"
          }
        },
        {
          run_id: runId,
          step: {
            step_name: "plan",
            agent_name: "codex_cli",
            status: "success",
            label: "plan"
          },
          data: { output: "planned" }
        }
      ]
    });
  });

  await page.route(`**/api/trace/runs/${runId}/artifacts`, async (route) => {
    await route.fulfill({
      json: [{ path: "logs/output.log", size: 1024 }]
    });
  });

  await page.goto("/");
  await expect(page.getByRole("heading", { name: "TaskTree" })).toBeVisible();

  // Navigate to Traces tab.
  await page.getByRole("tab", { name: "Traces" }).click();
  await expect(page.getByPlaceholder("Filter runs by flow, label, or command")).toBeVisible();
  const runButton = page.getByRole("button", { name: runId });
  await expect(runButton).toBeVisible({ timeout: 15000 });
  const runRow = page.getByRole("row", { name: new RegExp(runId) });
  await expect(runRow.getByText("code_fix")).toBeVisible();
  await expect(runRow.getByText(/tests_passed/i)).toBeVisible();
  await runButton.click();
  const runDetailTab = page.getByRole("tab", { name: "Run detail" });
  await runDetailTab.click();

  await expect(page.getByText("Trace timeline")).toBeVisible();
  const sessionToggle = page.getByRole("button", { name: /Show session raw/i });
  await sessionToggle.click();
  await expect(page.locator("pre").first()).toContainText('"flow_name": "code_fix"');
  const rawToggle = page.getByRole("button", { name: /Show raw/i }).first();
  await rawToggle.click();
  await expect(page.locator("pre").first()).toContainText("step");
  await expect(page.locator("pre").nth(1)).toContainText('"flow_version": "0.1.0"');

  await expect(page.getByText(/Artifacts/)).toBeVisible();
});
