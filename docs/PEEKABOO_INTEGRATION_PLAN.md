# READ THIS FULL PAGE BEFORE ANY ACTION

- Every time you open this file (start, switch, close a task), read it top-to-bottom. No exceptions.
- Test-Driven Development only: start from a failing/absent test → add/adjust test → implement → re-run tests.
- One task = one commit. Do not start the next task until you have committed the previous one and written its commit hash on that task line.
- After committing and recording the hash, immediately pick the next task. Do not pause/overthink; continue the loop.

## Workflow (repeat for each task)
1) Read this file fully.
2) Identify the next unchecked task; ensure prior task has a commit hash recorded.
3) Write/adjust failing test(s) first.
4) Implement the minimal change to satisfy the test.
5) Run `make ci` (or narrower only if explicitly allowed by the plan; otherwise full). Fix issues until green.
6) Commit with a meaningful message. Record the commit hash inline on the task.
7) Repeat from step 1 for the next task.

## Task list (add commit hash after completion)
- [x] Install Peekaboo CLI (brew preferred) and document invocation path in `docs/PEEKABOO_NOTES.md`. (commit: 40124fe)
- [x] Add a `scripts/peekaboo_capture.sh` helper that captures a full-screen PNG and optional AI describe; cover with a minimal shell test (e.g., verifies script is executable/runs in noop dry mode). (commit: 40124fe)
- [x] Wire Playwright failure hook to call the capture helper (guarded so CI without Peekaboo skips gracefully) and attach artifacts to Playwright output dir. (commit: 40124fe)
- [x] Add a TaskTree trace artifact uploader step for captured images on Playwright failures (backend/trace integration if needed) with tests. (commit: 41705d4)
- [ ] Scenario 1: Flows list loads — Peekaboo script that captures Workspace > Flows with populated rows; add Playwright+Peekaboo test/assert that screenshot exists. (commit: ______)
- [ ] Scenario 2: Flow graph renders — Capture flow detail graph for `log_error_handler`; assert nodes visible via vision/metadata. (commit: ______)
- [ ] Scenario 3: Run start feedback — After traced run start, capture toast + “No run selected” pill update. (commit: ______)
- [ ] Scenario 4: Trace list populated — Capture Traces table with run IDs/commands/timestamps and “View trace” buttons. (commit: ______)
- [ ] Scenario 5: Run detail timeline — Capture timeline cards showing step name/agent/status/label and raw toggle; verify via test. (commit: ______)
- [ ] Scenario 6: Artifacts panel — Capture artifacts view with type badge + humanized size + download link. (commit: ______)
- [ ] Scenario 7: Constitution page — Capture rendered ownership/protected paths; ensure no placeholder text. (commit: ______)
- [ ] Scenario 8: Dashboard cards — Capture CI/Git/Servers/Alerts cards, ensure no clipping and alerts pre block present. (commit: ______)
- [ ] Scenario 9: Flow run error modal — Capture destructive toast + inline alert on a forced run error. (commit: ______)
- [ ] Scenario 10: Trace raw session records — Capture scroll area showing session JSON (flow_name/version/run_id). (commit: ______)
- [ ] Scenario 11: Empty state handling — Capture Traces tab when empty to verify empty-state message. (commit: ______)
- [ ] Scenario 12: Header nav highlighting — Capture tab highlight switching and “No run selected” badge on non-run pages. (commit: ______)

## Guardrails
- Keep tasks small; if a task grows, split it before starting and ensure one commit per split task.
- If Peekaboo unavailable on a runner, guard integrations to skip cleanly and document fallback in tests.
- Prefer manifesting artifacts into `frontend/test-results/peekaboo/` (or similar) to align with Playwright outputs.
- Always update docs for any new commands/scripts added (e.g., `docs/PEEKABOO_NOTES.md`).
