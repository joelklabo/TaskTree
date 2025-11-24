import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync } from "node:fs";
import path from "node:path";

import { expect, test as base } from "@playwright/test";

import { copyToTraceArtifacts } from "../helpers/traceArtifacts";

const repoRoot = path.resolve(__dirname, "..", "..");
const captureScript = path.join(repoRoot, "scripts", "peekaboo_capture.sh");
const uploadScript = path.join(repoRoot, "scripts", "trace_artifact_upload.sh");

const test = base.extend({});

const defaultFlows = [
  {
    id: "code_fix",
    name: "Code Fix",
    description: "Fix bugs in code, run tests, and handle failures."
  },
  {
    id: "implement_feature",
    name: "Implement Feature",
    description: "Implement a feature from a markdown spec using Copilot CLI."
  },
  {
    id: "implement_feature_iterative",
    name: "Implement Feature (Iterative)",
    description: "Iterative feature implementation with retries and issue fallback."
  },
  {
    id: "implement_e2e_tests",
    name: "Implement E2E Tests",
    description: "Generate end-to-end tests from a spec."
  },
  {
    id: "proof_fix",
    name: "Proof Fix",
    description: "Fix a bug using the proof agent."
  },
  {
    id: "log_error_handler",
    name: "Log Error Handler",
    description: "Autonomous error handler with retry."
  }
];

const defaultFlowDetails: Record<string, unknown> = {
  code_fix: {
    id: "code_fix",
    name: "Code Fix",
    start: "plan",
    description: "Fix bugs in code, run tests, and handle failures.",
    steps: [
      { id: "plan", agent: "codex_cli", action: "plan_bugfix", transitions: { success: "implement" } },
      { id: "implement", agent: "codex_cli", action: "implement_fix", transitions: { success: "test", failure: "end" } },
      { id: "test", agent: "codex_cli", action: "run_tests", transitions: { tests_passed: "end", tests_failed: "implement" } }
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
      failure: end
  - id: test
    agent: codex_cli
    action: run_tests
    transitions:
      tests_passed: end
      tests_failed: implement`
  },
  log_error_handler: {
    id: "log_error_handler",
    name: "Log Error Handler",
    start: "investigate",
    description: "Handle errors with retries",
    steps: [
      { id: "investigate", agent: "codex_cli", action: "investigate_error", transitions: { success: "implement", failure: "triage" } },
      { id: "implement", agent: "codex_cli", action: "implement_fix", transitions: { success: "test", failure: "triage" } },
      { id: "test", agent: "codex_cli", action: "run_tests", transitions: { tests_passed: "end", tests_failed: "implement" } }
    ]
  }
};

const defaultTraceRunId = "trace-demo";
const defaultTraceRun = {
  run_id: defaultTraceRunId,
  flow_name: "code_fix",
  status: "tests_passed",
  label: "Demo run",
  start_time: "2025-01-01T00:00:00Z",
  end_time: "2025-01-01T00:00:05Z"
};

const defaultTraceRecords = [
  {
    run_id: defaultTraceRunId,
    session: {
      flow_name: "code_fix",
      flow_version: "0.1.0",
      start_time: "2025-01-01T00:00:00Z",
      end_time: "2025-01-01T00:00:05Z"
    }
  },
  {
    run_id: defaultTraceRunId,
    step: {
      step_name: "plan",
      agent_name: "codex_cli",
      status: "success",
      label: "plan"
    },
    data: {
      message: "planned"
    }
  }
];

const defaultArtifacts = [{ path: "logs/output.log", size: 1024 }];

test.beforeEach(async ({ page }) => {
  await page.route("**/api/health", (route) => route.fulfill({ json: { status: "ok" } }));
  await page.route("**/api/logs/events*", (route) => route.fulfill({ json: { events: [] } }));
  await page.route("**/api/logs/sources", async (route) => {
    await route.fulfill({
      json: [
        { name: "backend-dev.log", size: 123 },
        { name: "frontend-dev.log", size: 456 },
      ],
    });
  });
  await page.route("**/api/logs/stream**", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "text/event-stream",
      body: 'data: {"type":"log_line","source":"backend-dev.log","line":"hello"}\n\ndata: {"type":"log_line","source":"frontend-dev.log","line":"world"}\n\n',
    });
  });

  const fulfillFlows = async (route: any, request: any) => {
    if (request.method() === "GET") {
      await route.fulfill({ json: defaultFlows });
      return;
    }
    await route.fallback();
  };

  await page.route("**/api/flows/", fulfillFlows);
  await page.route("**/api/flows", fulfillFlows);

  await page.route("**/api/flows/*", async (route, request) => {
    if (request.method() === "GET") {
      const url = new URL(request.url());
      const parts = url.pathname.split("/");
      const idRaw = parts[parts.length - 1] || "";
      const flowId = idRaw.replace(".yaml", "");
      const detail = defaultFlowDetails[flowId];
      if (detail) {
        await route.fulfill({ json: detail });
        return;
      }
      await route.fulfill({ status: 404, json: { detail: "flow not found" } });
      return;
    }
    await route.fallback();
  });

  const fulfillRun = async (route: any, request: any) => {
    if (request.method() === "POST") {
      const body = await request.postDataJSON();
      await route.fulfill({
        json: {
          session_id: `sess-${Date.now()}`,
          flow_name: body.flow_id ?? "flow",
          steps: [],
          trace_run_id: defaultTraceRunId
        }
      });
      return;
    }
    await route.fallback();
  };

  await page.route("**/api/runs/", fulfillRun);
  await page.route("**/api/runs", fulfillRun);

  await page.route("**/api/trace/runs", async (route, request) => {
    if (request.method() === "GET") {
      await route.fulfill({ json: [defaultTraceRun] });
      return;
    }
    await route.fallback();
  });

  await page.route("**/api/trace/runs/*/trace", async (route) => {
    await route.fulfill({ json: defaultTraceRecords });
  });

  await page.route("**/api/trace/runs/*/artifacts", async (route) => {
    await route.fulfill({ json: defaultArtifacts });
  });

  await page.route("**/api/editor/flows", async (route) => {
    await route.fulfill({ json: defaultFlows.map((f) => `${f.id}.yaml`) });
  });

  await page.route("**/api/editor/flows/*", async (route) => {
    const url = new URL(route.request().url());
    const parts = url.pathname.split("/");
    const name = parts[parts.length - 1];
    const flowId = name.replace(".yaml", "");
    const detail = defaultFlowDetails[flowId] as any;
    if (detail) {
      await route.fulfill({ json: { name, content: detail._raw || detail } });
      return;
    }
    await route.fulfill({ status: 404, json: { detail: "flow not found" } });
  });

  await page.route("**/api/editor/prompts", async (route) => {
    await route.fulfill({ json: ["code_plan.j2", "code_implement.j2", "test_prompt.j2"] });
  });

  await page.route("**/api/editor/prompts/*", async (route) => {
    const url = new URL(route.request().url());
    const name = url.pathname.split("/").pop() || "prompt.j2";
    await route.fulfill({ json: { name, content: "Sample prompt template" } });
  });

  await page.route("**/api/editor/agents", async (route) => {
    await route.fulfill({ json: ["codex_cli.yaml"] });
  });

  await page.route("**/api/editor/agents/*", async (route) => {
    const url = new URL(route.request().url());
    const name = url.pathname.split("/").pop() || "codex_cli.yaml";
    await route.fulfill({
      json: { name, content: "id: codex_cli\nmodel: gpt-test\nprompt_map:\n  plan_bugfix: code_plan.j2" },
    });
  });

  await page.route("**/api/prompts/skeleton**", async (route) => {
    await route.fulfill({
      json: { action: "plan_bugfix", agent: "codex_cli", template: "Prompt", skeleton: { input: { bug: "string" } } },
    });
  });

  await page.route("**/api/constitution/", async (route) => {
    await route.fulfill({
      json: {
        task_states: { states: ["todo", "in_progress", "done"], transitions: { todo: { start: "in_progress" } } },
        ownership: { "src/backend": "backend-team" },
        protected: ["src/secrets"],
      },
    });
  });

  await page.route("**/api/debug/log-client-error", async (route) => {
    await route.fulfill({ json: { status: "logged", log_file: "/tmp/backend-dev.log" } });
  });

  await page.route("**/api/debug/sessions", async (route, request) => {
    if (request.method() === "POST") {
      await route.fulfill({ json: { session_id: `debug-${Date.now()}` } });
      return;
    }
    await route.fallback();
  });

  await page.route("**/api/trace/runs*", async (route, request) => {
    if (request.method() === "GET") {
      const url = new URL(request.url());
      if (url.pathname.endsWith("/trace")) {
        await route.fulfill({ json: defaultTraceRecords });
        return;
      }
      if (url.pathname.endsWith("/artifacts")) {
        await route.fulfill({ json: defaultArtifacts });
        return;
      }
      await route.fulfill({ json: [defaultTraceRun] });
      return;
    }
    await route.fallback();
  });
});

test.afterEach(async ({}, testInfo) => {
  if (testInfo.status === "passed") {
    return;
  }

  const slug = testInfo.title.replace(/[^a-z0-9]+/gi, "-").toLowerCase() || "capture";
  const capturePath = testInfo.outputPath(`peekaboo-${slug}.png`);
  mkdirSync(path.dirname(capturePath), { recursive: true });

  if (!existsSync(captureScript)) {
    testInfo.attachments.push({
      name: "peekaboo",
      body: Buffer.from("skip: capture script missing"),
      contentType: "text/plain"
    });
    return;
  }

  const proc = spawnSync(captureScript, [capturePath], {
    env: { ...process.env },
    stdio: "inherit"
  });

  if (proc.status !== 0) {
    testInfo.attachments.push({
      name: "peekaboo",
      body: Buffer.from(`capture script failed with status ${proc.status ?? "unknown"}`),
      contentType: "text/plain"
    });
    return;
  }

  if (existsSync(capturePath)) {
    testInfo.attachments.push({
      name: "peekaboo",
      path: capturePath,
      contentType: "image/png"
    });

    // Best-effort: copy into trace artifacts directory for later upload/inspection.
    if (existsSync(uploadScript)) {
      spawnSync(uploadScript, [capturePath, path.basename(capturePath)], {
        env: { ...process.env },
        stdio: "ignore"
      });
    }

    copyToTraceArtifacts(capturePath);
  }
});

export { expect, test };
