import { expect, test } from "./fixtures";

test("non-traced run shows tracing-disabled message in Run detail", async ({ page }) => {
  await page.route("**/api/runs/", async (route) => {
    if (route.request().method() === "POST") {
      await route.fulfill({ json: { session_id: "sess-demo", trace_run_id: null } });
      return;
    }
    await route.fallback();
  });

  await page.goto("/");

  // Kick off a non-traced run from the flows table (first flow row).
  const flowRow = page.getByRole("row", { name: /code_fix/ });
  const runResponse = page.waitForResponse(
    (resp) => resp.url().includes("/api/runs") && resp.request().method() === "POST" && resp.status() === 200,
    { timeout: 20000 },
  );
  await flowRow.getByRole("button", { name: "Run", exact: true }).click();
  await runResponse;

  // Run detail view should be reachable once the run is selected.
  await expect(page.getByRole("button", { name: "View last run" })).toBeVisible({
    timeout: 20000,
  });
  await page.getByRole("button", { name: "View last run" }).click();

  // The Run detail view should show the tracing-disabled message instead of failing.
  await expect(page.getByText("Tracing disabled")).toBeVisible();
  await expect(page.getByRole("heading", { name: /Run / })).toBeVisible();

  // No destructive error alert should be shown.
  await expect(page.getByRole("alert").filter({ hasText: "Failed to load trace" })).toHaveCount(0);
});

test("should render timeline steps and expand raw data", async ({ page }) => {
  // Mock the trace API response
  await page.route('**/api/trace/runs/test-run-id/trace', async route => {
    await route.fulfill({
      json: [
        {
          session: {
            start_time: "2023-01-01T00:00:00Z",
            end_time: "2023-01-01T00:01:00Z",
            flow_name: "test_flow",
            flow_version: "1.0"
          }
        },
        {
          step: {
            step_name: "step1",
            agent_name: "test_agent",
            status: "success",
            label: "test_label"
          },
          raw_data: { some: "long json data that might overflow if not handled correctly" }
        }
      ]
    });
  });

  // Mock artifacts to avoid 404s
  await page.route('**/api/trace/runs/test-run-id/artifacts', async route => {
    await route.fulfill({ json: [] });
  });

  await page.route('**/api/trace/runs', async route => {
    await route.fulfill({
      json: [{ run_id: "test-run-id", flow_name: "test_flow", status: "success" }]
    });
  });

  await page.goto('/traces');
  await page.getByText('test-run-id').click();

  // Check if timeline is visible
  await expect(page.getByText('Trace timeline')).toBeVisible();
  await expect(page.getByText('step1')).toBeVisible();
  
  // Check status badge
  await expect(page.getByText('success')).toBeVisible();

  // Expand raw data
  await page.getByText('Show raw').click();
  
  // Check if raw data is visible
  const pre = page.locator('pre').filter({ hasText: 'long json data' });
  await expect(pre).toBeVisible();
});
