import { test, expect } from "./fixtures";

test.describe("Flows CRUD", () => {
  test("create and delete flow", async ({ page }) => {
    // Mock list fetch and create/delete endpoints
    await page.route("**/api/flows/", async (route, request) => {
      if (request.method() === "GET") {
        await route.fulfill({ json: [] });
      } else if (request.method() === "POST") {
        const body = await request.postDataJSON();
        await route.fulfill({ json: { id: body.id, name: body.name, description: body.description || "" } });
      }
    });

    await page.route("**/api/flows/*", async (route, request) => {
      if (request.method() === "DELETE") {
        await route.fulfill({ json: { status: "deleted", id: "new_flow" } });
        return;
      }
      await route.fulfill({ json: { id: "new_flow", name: "New Flow", start: "start", steps: [] } });
    });

    await page.goto("/");
    await page.getByRole("tab", { name: "Flows" }).click();

    await page.getByLabel("New flow id").fill("new_flow");
    await page.getByLabel("Name").fill("New Flow");
    await page.getByLabel("Description").fill("Demo flow");
    await page.getByRole("button", { name: "Create flow" }).click();

    await expect(page.getByRole("cell", { name: "New Flow" })).toBeVisible();
    await expect(page.getByRole("cell", { name: "new_flow" })).toBeVisible();

    await page.getByRole("button", { name: "Delete" }).click();
    await expect(page.getByText("new_flow")).not.toBeVisible();
  });
});
