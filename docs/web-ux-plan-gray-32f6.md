# Web UX Plan (gray-32f6)

- Date started: 2025-11-21
- Method: TTD (tests-first, trace, document), checking boxes as milestones are hit.

## Tasks

- [x] Trace detail UX: step timeline/cards + collapsible raw JSON; ensure Vitest/Playwright cover structured view.
  - [x] Add failing test(s) capturing expected timeline/cards and raw JSON toggle.
  - [x] Implement UI/backend adjustments to satisfy behavior.
  - [x] Tests pass (record trace artifacts if applicable).
  - [x] Update docs/snapshots if behavior changes (covered in this plan + tests).
- [x] Constitution UI/API polish: render task states/ownership/protected paths with error/empty states; Playwright check.
  - [x] Add failing coverage for rendering task states/ownership/protected paths (happy/empty/error).
  - [x] Implement API/UI handling for those scenarios.
  - [x] Tests pass (Playwright + relevant unit tests).
  - [x] Document any UI/API contract updates (plan + enriched meta types).
- [x] Flow graph layout: auto-fit nodes, visible start/end badges, non-empty render with tests.
  - [x] Add failing tests for auto-fit, start/end badges, and non-empty render.
  - [x] Implement layout fixes/features.
  - [x] Tests pass; capture traces/screens if helpful.
  - [x] Update docs/fixtures as needed (tracked here).
- [x] Traces list UX: show flow name/label, quick filter/search, improved empty/loading states.
  - [x] Add failing coverage for flow name/label display and filter/search empty/loading states.
  - [x] Implement UI/state/data changes for traces list.
  - [x] Tests pass; record artifacts if useful.
  - [x] Document UX/contract adjustments (note in plan + backend meta enrichment).
- [x] Layout polish: prevent workspace cutoff (footer padding/scroll), sticky tabs header, responsive spacing.
  - [x] Add failing tests/snapshots for layout expectations (footer padding/scroll, sticky tabs, spacing).
  - [x] Implement layout CSS/structure updates.
  - [x] Tests pass and visuals validated.
  - [x] Update docs/snapshots if layout changes are user-visible (captured via this plan/test updates).
