# Feature Delivery Conveyor (Beads)

Purpose: turn a short feature description into a Beads epic with child tasks, then drive implementation through a minimum 3-attempt implement→test loop before escalation.

## Flow
1. **Intake**
   - Capture the request in the Feature Intake template (`docs/templates/feature-intake-template.md`).
   - Create Beads via the helper: `./scripts/feature_to_beads.py --title "<feature>" --description-file spec.md --apply`
     - Defaults to tasks: Discovery/Research, Design, Implementation, Testing & Validation, Docs & Rollout.
     - Use `--tasks "Research,Backend,Frontend,Testing"` to customize.
2. **Work the tasks**
   - Each child task is pre-seeded with the Bead Task template (`docs/templates/bead-task-template.md`).
   - **Retry policy:** The template includes a "Retry Log (min 3 attempts on failure)" checklist. When tests fail, log the attempt (date, change, test output) and retry until at least three attempts have been made. If still failing, leave the task open, add the failure notes, and push a richer hypothesis to the parent epic.
   - Update status/notes via `bd update <id> --status open --notes "Attempt 2: ..."` or `bd comment <id> "Attempt 2 ..."`.
3. **Testing & traces**
   - Run `make test` (backend+frontend+Playwright) before closing any task. Add targeted commands in the task "Validation" section.
   - Capture traces when flows are run: `cd backend && uv run -m tasktree.agents.trace.record uv run tt run implement_feature --input '{"feature_spec": "..."}'`.
   - Attach artifacts/screenshots to Beads via `bd comment <id> --file <path>`.
4. **Close-out**
   - Close child tasks after green tests and docs updates; close the epic when all children are done and rollout is verified.

## Validation plan (for this conveyor)
- Automated: `backend/tests/test_feature_to_beads.py` asserts the helper prints the retry log block and task scaffolding in dry-run mode (runs with `make test`).
- Manual trace recipe: run the feature conveyor on a sample spec using the command in Step 1 with `--apply`, implement one task, record a trace with the wrapper, and log at least one retry entry in the task Retry Log.
- Smoke: `./scripts/feature_to_beads.py --title "Sample" --description "demo" --dry-run` should print the plan without touching `.beads/`.

## Quick commands
- Preview plan (no writes): `./scripts/feature_to_beads.py --title "Telemetry" --description "Collect client pings" --dry-run`
- Create with custom tasks: `./scripts/feature_to_beads.py --title "Offline cache" --description-file spec.md --tasks "Research,API,UI,Testing" --apply`
- Add retry note: `bd comment TaskTree-123 "Attempt 2: fixed mock data; Playwright still failing on traces tab"`
