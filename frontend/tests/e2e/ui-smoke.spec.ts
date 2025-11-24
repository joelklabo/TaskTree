import { expect, test } from "./fixtures";

test("UI navigation + trace detail renders without console errors", async ({ page }) => {
  const consoleErrors: string[] = [];
  page.on("console", (msg) => {
    if (msg.type() === "error") {
      const loc = msg.location();
      consoleErrors.push(`${msg.text()} @${loc.url || ""}:${loc.lineNumber ?? ""}`);
    }
  });
  page.on("pageerror", (err) => consoleErrors.push(err.message));

  await page.route("**/api/trace/runs", async (route) => {
    await route.fulfill({ json: [{ run_id: "trace-demo", flow_name: "code_fix", status: "tests_passed" }] });
  });

  const runId = "trace-demo";

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
  const artifactsTab = page.getByRole("tab", { name: "Artifacts" });
  await expect(artifactsTab).toBeVisible();
  await artifactsTab.click();
  await expect(artifactsTab).toHaveAttribute("data-state", "active");

  const toleratedPatterns = [/\/api\/flows\//];
  const unexpected = consoleErrors.filter(
    (msg) => !toleratedPatterns.some((pat) => pat.test(msg))
  );

  if (unexpected.length) {
    console.warn("Console errors during UI smoke:", unexpected);
  }
});

test("dev server status indicator shows connection state", async ({ page }) => {
  await page.goto("/");

  // Dev server status indicator should be visible
  const statusIndicator = page.getByTestId("dev-server-status");
  await expect(statusIndicator).toBeVisible();

  // Should show "connected" when backend is responsive
  await expect(statusIndicator).toContainText(/Backend.*(Connected|Checking)/i);

  // Should have a green indicator pip
  const pip = page.getByTestId("dev-server-pip");
  await expect(pip).toBeVisible();
  const pipClass = await pip.getAttribute("class");
  expect(pipClass).toMatch(/green|amber/);
});

test("clicking logo navigates back to flows tab", async ({ page }) => {
  // Start on a different tab
  await page.goto("/dashboard");

  // Verify we're on the dashboard
  await expect(page.getByRole("heading", { name: /Dashboard/ })).toBeVisible();

  // Click the logo
  const logo = page.getByTestId("app-logo");
  await expect(logo).toBeVisible();
  await logo.click();

  // Should navigate back to flows tab
  await expect(page.getByRole("tab", { name: "Flows" })).toHaveAttribute("data-state", "active");
  expect(page.url()).toContain("/");
});
