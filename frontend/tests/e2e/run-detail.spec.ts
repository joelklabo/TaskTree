import { expect, test } from "./fixtures";

test("non-traced run shows tracing-disabled message in Run detail", async ({ page }) => {
  await page.goto("/");

  // Kick off a non-traced run from the flows table (first flow row).
  const flowRow = page.getByRole("row", { name: /code_fix/ });
  await flowRow.getByRole("button", { name: "Run", exact: true }).click();

  // Run detail tab should become enabled once the run is selected.
  const runDetailTab = page.getByRole("tab", { name: "Run detail" });
  await expect(runDetailTab).toBeEnabled({ timeout: 10000 });
  await runDetailTab.click();

  // The Run detail view should show the tracing-disabled message instead of failing.
  await expect(page.getByText("Tracing disabled")).toBeVisible();
  await expect(page.getByRole("heading", { name: /Run / })).toBeVisible();

  // No destructive error alert should be shown.
  await expect(page.getByRole("alert").filter({ hasText: "Failed to load trace" })).toHaveCount(0);
});
