# tmux → Web dashboard consolidation plan (TDD)

Goal: replace the tmux-pane-rendered dashboard with a single TUI/web view that reads one shared `DashboardState` while keeping tmux as a window manager (servers/logs) and preserving terminal usability. Everything below is TDD-first: add failing tests, then implement.

## Scope / outcomes
- One `DashboardState` contract (JSON schema + validator) consumed by:
  - A new web dashboard view (React/Vite in `frontend/`).
  - A fallback terminal TUI (BubbleTea) launched from tmux as a single pane.
- A collector that emits `tmp/dashboard_state.json` (later optional HTTP endpoint for the same data).
- No more per-pane `while true; clear` render loops for dashboard content.
- CI/alerts/log-search remain visible through the new dashboard.

## Test plan (write first, expect red) — tracker
- **Schema**: validator test that fails if required fields are missing/typed wrong (`backend/tests` or `scripts/tmux/tests`).
- **Collector smoke**: script test that runs collector in smoke mode and asserts `tmp/dashboard_state.json` exists and includes required sections (status/git/servers/alerts/ci/traces/logs).
- **Collector failure fallback**: test that collector writes last-good cache when a probe fails (e.g., gh/rg absent).
- **TUI render**: Go/BubbleTea snapshot test for a sample state (ensure sections and titles appear).
- **Web view unit**: React component test (Vitest/RTL) rendering sample state; asserts cards/titles/links/copy buttons present.
- **Web view e2e**: Playwright pointing to dev server with mocked state endpoint; asserts no flicker and icons/links visible.
- **tmux integration**: tmux smoke test that the dashboard window runs `ttx-dashboard` (not shell loops) and pane titles stay themed.
- **Alert patterns config**: test that YAML-driven alert levels appear in dashboard view and copy/export button renders the underlying query.
- **CI watch**: test that CI section renders a recent run in smoke (mocked gh) and caches on gh missing.
**Status so far:** collector smoke/schema/tmux-state + cache tests are GREEN; tmux window cmd GREEN; web unit + Playwright dashboard smoke GREEN. Remaining: stricter schema, TUI snapshot, alerts/CI tests, full probes, docs.

## Implementation steps (ordered)
1) **Contract**: define `DashboardState` JSON schema (types for status/git/servers/alerts/ci/traces/log sources/search). Add schema file + validator test (red).
2) **Collector skeleton**: create `scripts/tmux/dashboard_collector.sh` (or small Go/Python) to emit sample state in smoke; add smoke test (red→green).
3) **Real collectors** (parallelizable):
   - Git status (branch/ahead/behind/dirty list).
   - Servers (backend/frontend ports, pids, last restarts).
   - Alerts (reuse alert_patterns.yaml + rg; cache on failure).
   - CI (gh run list; smoke fallback).
   - Traces (recent runs/artifacts).
   - Log sources inventory (YAML-driven).
4) **Writer/refresh**: collector writes `tmp/dashboard_state.json` atomically, plus optional cache under `logs/tmux/cache/state.json`; add test for atomic swap.
5) **TUI scaffold**: Go BubbleTea app `cmd/ttx-dashboard` that reads state and renders sections (Lipgloss styling). Add snapshot/unit tests with sample state.
6) **Web view scaffold**: add a new route/page in `frontend/` that fetches `dashboard_state.json` (file or small API). Add component/unit tests (Vitest) + Playwright smoke using mocked state.
7) **tmux launcher**: simplify `scripts/tmux/tmux_dashboard.sh` to launch `ttx-dashboard` in one pane; keep servers/logs windows. Update tmux smoke test to check the command.
8) **Copy/export UX**: add copy buttons in web and keyboard shortcut in TUI for alerts/log search queries; tests assert copy hook runs.
9) **Live refresh**: ensure both TUI and web poll the state with minimal flicker (diffed render). Add Playwright check for stable layout over N refreshes.
10) **Docs**: document usage (`docs/TMUX_DASHBOARD.md` + README + shortcuts). Add troubleshooting for gh/rg missing.

## Nice-to-haves / stretch
- Serve `dashboard_state.json` via a tiny HTTP endpoint from the collector (or backend) to avoid file reads in the web view.
- SSE/websocket for push updates (optional).
- Persistent history for alerts/CI (write to `logs/tmux/state_history.jsonl`).
- Theme parity: reuse Catppuccin palette across TUI and web (CSS vars + Lipgloss).

## Risks / mitigations
- **Collector crashes**: guard each probe; write last-good cache; expose error fields in state.
- **gh/rg missing**: surface in-state warnings and fall back to cache; keep tests to assert graceful handling.
- **Drift between views**: enforce the schema and share sample fixtures for both TUI and web tests.

## Tracking checklist
- [x] Collector smoke test (scripts) — `test_dashboard_state_smoke.sh`
- [x] Schema sanity test (scripts) — `test_dashboard_state_schema.sh`
- [x] Collector cache/failure test — `test_dashboard_state_cache.sh`
- [x] tmux state creation test — `test_dashboard_state_tmux.sh`
- [x] tmux dashboard cmd test — `test_dashboard_window_cmd.sh`
- [x] Web unit test — `src/__tests__/DashboardStateView.test.tsx`
- [x] Web e2e smoke — `tests/e2e/dashboard-state.spec.ts`
- [ ] Schema formalized (JSON schema + stricter validator)
- [ ] TUI snapshot test (BubbleTea)
- [ ] Alerts config/structured test (YAML-driven levels/alerts copy)
- [ ] CI section test (smoke + gh output)
- [ ] Implement full collector probes (alerts/ci/logs detail)
- [ ] Polish TUI layout
- [ ] Docs updated

## New work items (render/layout)
- [ ] Add failing TUI snapshot to catch overflow/duplication (alerts showing smoke cache + runs, CI wrapping).
- [ ] Add failing React unit for DashboardStateView to avoid showing stale smoke text when CI runs exist.
- [ ] Add Playwright check for dashboard layout (no overflow, CI links visible, no duplicated smoke block).
- [ ] Fix renderer: trim cached smoke text when real data exists, normalize card widths/padding.
- [ ] Apply updated style/theme to other tabs (git/logs/search/help) and retitle panes.

## TDD plan for the next three tracks
1) **Schema + validator**
   - Add formal JSON schema (WIP: `scripts/tmux/dashboard_state.schema.json`).
   - Add a validator test that runs against sample fixtures and real collector output; currently add a failing step to assert required fields and types.
   - Implement a tiny validator script (python/node) and wire into tests once schema is stable.
2) **BubbleTea TUI (terminal dashboard)**
   - Add a sample state fixture for TUI tests.
   - Add a Go module under `tui/` with a BubbleTea model that reads `tmp/dashboard_state.json` and renders sections.
   - Add a snapshot/regexp test (Go `testing`) that feeds the fixture and asserts sections/titles. Initially mark failing until model renders.
   - Wire tmux to launch `ttx-dashboard` (single pane) after the collector.
3) **Web view (Playwright e2e)**
   - Serve `dashboard_state.json` (fixture fallback handled by dev server).
   - Playwright smoke now asserts dashboard/tab; keep it running in CI and extend to cover alerts/CI when wired.
