import { expect, test } from "./fixtures";
test("dashboard displays shared state cards", async ({ page }) => {
  await page.goto("/");
  const dashboardTab = page.getByRole("tab", { name: "Dashboard" });
  await dashboardTab.click();
  await expect(dashboardTab).toHaveAttribute("data-state", "active");
  await expect(page.getByText(/Dashboard \(shared state\)/i)).toBeVisible();
  await expect(page.getByText(/Env:/i)).toBeVisible();
  await expect(page.getByText(/Branch:/i)).toBeVisible();
  await expect(page.getByText(/Servers/i)).toBeVisible();
  await expect(page.getByRole("heading", { name: /Alerts/i })).toBeVisible();
  await expect(page.getByRole("heading", { name: /CI/i })).toBeVisible();
  await expect(page.getByRole("link", { name: /open/i })).toBeVisible();

  // No stale "Smoke mode" text should appear when real runs exist.
  await expect(page.getByText(/Smoke mode/i)).toHaveCount(0);
});
