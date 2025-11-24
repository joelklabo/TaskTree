# Scenario Debugger / Variant Runner

## Goal
Give users a first-class way to create, save, and replay “scenarios” for any flow step with custom prompt/model overrides, breakpoints, and side-by-side results/logs. This builds on the existing Debugger and Workbench so prompt + model experimentation is fast and reproducible.

## Objectives
- Create/save/load named scenarios scoped to a flow + step (defaults allowed).
- Edit context, prompt override, agent profile/model, and breakpoints per scenario.
- Run a scenario and see: parsed context in/out, agent output, and filtered logs (llm-transcript + debug) tagged by scenario_id.
- Compare runs: show latest result for each scenario side-by-side (at least two columns).
- Persist scenarios locally (browser storage) with an API hook to accept server-backed storage later.

## Non-goals (v1)
- No multi-step orchestration of scenarios (single step/flow run at a time).
- No server-side persistence (local only for now).
- No diffing UI beyond simple side-by-side.

## UX
- Entry: replace/augment Debugger with a “Scenario Builder” panel.
- Left rail: pick flow -> step; toggle agent profile/model; set breakpoints.
- Editors: context JSON, prompt override (preloaded from mapped prompt), optional notes.
- Scenarios list: cards with name, flow/step, model/profile, last run status, actions (Load, Run, Delete).
- Results area: two-column responsive grid showing run output JSON + filtered logs for selected scenarios (tagged by scenario_id prefix).
- Controls: “Run Scenario” (uses current form), “Save Scenario”, “Run All” (parallel runs optional v2).

## Backend/API
- Extend `/api/debug/sessions` to accept optional `scenario_id`, `prompt_overrides` (map action->template), and `agent_profile/model_override`.
- DebugSession/run_flow: pass scenario_id through context; include in debug/llm logs and websocket payloads.
- Add lightweight scenario run endpoint (alias to `/api/debug/sessions` if enough).
- Logging: prepend `[scn:<id>]` to llm-transcript and debug log lines; allow `contains` filter to match scenario ids.

## Frontend
- Reuse `DebugPage` and `StepWorkbenchPage` components:
  - Add prompt override editor in DebugPage tied to the selected step.
  - Add scenario model/profile selectors.
  - Save scenarios to localStorage (include flow, step, context, prompt override, profile, breakpoints).
  - Run button posts to `/api/debug/sessions` with scenario_id (random short id) and overrides.
  - Results panel renders last websocket payload + tail of logs filtered by scenario_id.
- Add minimal comparisons: show last N scenarios as tiles with status chip and “view logs”.

## Acceptance Criteria
- Can save a scenario with custom prompt/model/breakpoints and reload it later (localStorage-backed).
- Running a scenario shows paused/finished state via websocket and displays the updated context/result.
- Logs for a scenario are filterable via `contains=scn-<id>` in `LogViewer`.
- Prompt override is applied (verified by echo in llm-transcript or backend test stub).
- Playwright e2e covers: create scenario, save, reload, run, see logs.

## Testing
- Backend pytest: new params on `/api/debug/sessions`; DebugSession propagates scenario_id into logs; prompt override applied via DictLoader.
- Frontend Vitest: state management for scenarios, save/load, payload shape.
- Frontend Playwright: scenario creation + run + log filtering happy path.

## TaskTree Input (feature_spec)
Use this doc as `feature_spec` for the `implement_feature` flow. In CLI form:
```
./tt run implement_feature --input '{"feature_spec": "Scenario debugger/variant runner: ... (paste this doc)"}'
```
