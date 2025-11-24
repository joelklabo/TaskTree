import { expect, test } from "./fixtures";

const flowYaml = `
id: log_error_handler
start: investigate
steps:
  - id: investigate
    agent: codex_cli
    action: investigate_error
    transitions:
      success: implement
  - id: implement
    agent: codex_cli
    action: implement_fix
    transitions:
      success: test
`;

test("Debugger shows and fetches input skeleton with usable layout", async ({ page }) => {
  // Stub backend responses
  await page.route("**/api/editor/flows", (route) =>
    route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(["log_error_handler.yaml"]) }),
  );
  await page.route("**/api/editor/flows/log_error_handler.yaml", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ name: "log_error_handler.yaml", content: flowYaml }),
    }),
  );
  await page.route("**/api/editor/agents", (route) =>
    route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(["codex_cli.yaml"]) }),
  );
  await page.route("**/api/editor/agents/codex_cli.yaml", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        name: "codex_cli.yaml",
        content: "id: codex_cli\nprompt_map:\n  investigate_error: error_investigate.j2",
      }),
    }),
  );
  await page.route("**/api/editor/prompts", (route) =>
    route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(["error_investigate.j2"]) }),
  );
  await page.route("**/api/editor/prompts/error_investigate.j2", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ name: "error_investigate.j2", content: "Prompt content" }),
    }),
  );
  await page.route("**/api/prompts/skeleton**", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        action: "investigate_error",
        agent: "codex_cli",
        template: "error_investigate.j2",
        skeleton: { input: { error_log: "", severity: "" } },
      }),
    }),
  );
  await page.route("**/api/logs/events", (route) =>
    route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ events: [] }) }),
  );
  await page.route("**/api/debug/log-client-error", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ status: "logged", log_file: "frontend-client.log" }),
    }),
  );
  await page.route("**/api/health", (route) =>
    route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ status: "ok" }) }),
  );

  await page.goto("/debug");

  const flowSelect = page.getByRole("combobox").first();
  await flowSelect.selectOption("log_error_handler.yaml");
  const stepSelect = page.getByRole("combobox").nth(1);
  await expect(stepSelect).toBeEnabled();
  await expect(stepSelect).toHaveValue("investigate");

  // Fetch skeleton and ensure it renders
  await page.getByTestId("fetch-skeleton-btn").click();
  const skeleton = page.getByTestId("input-skeleton");
  await expect(skeleton).toContainText('"error_log"');
  await expect(skeleton).toContainText('"severity"');

  // Trigger client error button and ensure it posts
  const [clientReq] = await Promise.all([
    page.waitForRequest((req) => req.url().includes("/api/debug/log-client-error")),
    page.getByRole("button", { name: "Trigger client error" }).click(),
  ]);
  expect(clientReq.url()).toContain("/api/debug/log-client-error");

  // Layout check: agent/prompt block sits below the context column
  const contextBox = await page.getByTestId("debug-context").boundingBox();
  const agentBox = await page.getByTestId("agent-prompt").boundingBox();
  expect(contextBox && agentBox && contextBox.y < agentBox.y).toBeTruthy();
});
