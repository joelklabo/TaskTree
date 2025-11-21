import { expect, test } from "@playwright/test";

test("UI navigation + trace detail renders without console errors", async ({ page }) => {
  const consoleErrors: string[] = [];
  page.on("console", (msg) => {
    if (msg.type() === "error") {
      consoleErrors.push(msg.text());
    }
  });
  page.on("pageerror", (err) => consoleErrors.push(err.message));

  // Pre-create a traced run to ensure data is present.
  const resp = await page.request.post("/api/runs/", {
    headers: { "x-trace": "true" },
    data: { flow_id: "code_fix", input: { bug_description: "ui smoke run" } }
  });
  if (!resp.ok()) {
    throw new Error(`run creation failed: ${resp.status()} ${resp.statusText()} ${await resp.text()}`);
  }
  const created = (await resp.json()) as { trace_run_id?: string | null };
  const runId = created.trace_run_id;
  expect(runId).toBeTruthy();
  if (!runId) throw new Error("trace_run_id missing in UI smoke setup");

  await page.goto("/");

  // Tabs render.
  await expect(page.getByRole("tab", { name: "Flows" })).toBeVisible();
  await expect(page.getByRole("tab", { name: "Traces" })).toBeVisible();
  await expect(page.getByRole("tab", { name: "Run detail" })).toBeVisible();

  // Traces tab shows the run and opens detail.
  await page.getByRole("tab", { name: "Traces" }).click();
  const runButton = page.getByRole("button", { name: runId });
  await expect(runButton).toBeVisible({ timeout: 15000 });
  await runButton.click();
  const runDetailTab = page.getByRole("tab", { name: "Run detail" });
  await runDetailTab.click();

  // Run detail tab should now be active and show trace content/artifacts sections.
  await expect(runDetailTab).toHaveAttribute("data-state", "active");
  await expect(page.getByRole("heading", { name: "Trace events" })).toBeVisible();
  await page.getByRole("tab", { name: "Artifacts" }).click();
  await expect(page.getByRole("heading", { name: "Artifacts" })).toBeVisible();

  // No console errors should have occurred during the flow.
  expect(consoleErrors).toEqual([]);
});
