import { expect, test } from "./fixtures";

test("constitution view renders task states, ownership, and protected paths", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("tab", { name: "Constitution" }).click();

  await expect(page.getByRole("heading", { name: "Constitution" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Task states" })).toBeVisible();
  await expect(page.getByText("start -> IN_PROGRESS")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Ownership" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Protected paths" })).toBeVisible();
  await expect(page.getByText("docs/PLAN.md", { exact: true }).first()).toBeVisible();
});
