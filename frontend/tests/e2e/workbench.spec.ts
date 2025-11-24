import { expect, test } from "./fixtures";

const flowDetail = {
  id: "code_fix",
  name: "Code Fix",
  start: "plan",
  description: "Fix a bug, run tests, and handle failures.",
  steps: [
    { id: "plan", agent: "codex_cli", action: "plan_bugfix", transitions: { success: "implement" } },
    { id: "implement", agent: "codex_cli", action: "implement_fix", transitions: { success: "test" } },
    { id: "test", agent: "codex_cli", action: "run_tests", transitions: { tests_passed: "end" } }
  ],
  _raw: `id: code_fix
name: "Code Fix"
version: "0.1.0"
description: "Fix a bug, run tests, and handle failures."
start: plan
steps:
  - id: plan
    agent: codex_cli
    action: plan_bugfix
    transitions:
      success: implement
  - id: implement
    agent: codex_cli
    action: implement_fix
    transitions:
      success: test
  - id: test
    agent: codex_cli
    action: run_tests
    transitions:
      tests_passed: end`
};

test.describe("Step Workbench", () => {
  test.beforeEach(async ({ page }) => {
    await page.route("**/api/flows/", async (route, request) => {
      if (request.method() === "GET") {
        await route.fulfill({ json: [{ id: "code_fix", name: "Code Fix", description: "Fix a bug" }] });
        return;
      }
      await route.fallback();
    });

    await page.route("**/api/flows/code_fix", async (route) => {
      await route.fulfill({ json: flowDetail });
    });

    await page.route("**/api/prompts/skeleton**", async (route) => {
      await route.fulfill({
        json: {
          action: "plan_bugfix",
          agent: "codex_cli",
          template: "Prompt",
          skeleton: { input: { bug_description: "string" } }
        }
      });
    });

    await page.route("**/api/logs/stream**", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "text/event-stream",
        body: 'data: {"type":"log_line","source":"llm-transcript.log","line":"hello"}\n\n'
      });
    });
  });

  test("renders flow details and editors", async ({ page }) => {
    await page.goto("/workbench");

    await expect(page.getByRole("heading", { name: /Flow Workbench/ })).toBeVisible();
    await expect(page.getByRole("combobox", { name: /Workbench Flow/ })).toBeVisible();
    await expect(page.getByRole("combobox", { name: /Workbench Step/ })).toBeVisible();
    await expect(page.getByText("Input Context")).toBeVisible();
    await expect(page.getByText("Prompt override")).toBeVisible();
    await expect(page.getByText("Output / Logs")).toBeVisible();
  });

  test("fetches input skeleton and allows prompt edits", async ({ page }) => {
    await page.goto("/workbench");
    await page.getByRole("button", { name: "Fetch skeleton" }).click();
    await expect(page.getByText(/bug_description/)).toBeVisible();

    const promptEditor = page.getByTestId("workbench-prompt-editor").locator("textarea");
    await promptEditor.fill("override prompt body");
    await expect(promptEditor).toHaveValue("override prompt body");
  });
});
