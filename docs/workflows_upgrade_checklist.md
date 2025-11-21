# GitHub Workflows & Pages Upgrade Checklist

Context: style direction for marketing site = bold gradient hero (teal/amber), big mono headline, cards for Agents/Flows/Traces, animated stats, OG image previews. Pages should host both the existing frontend app build and the marketing site; PRs get preview links.

## Repo hygiene and ownership
- [x] Add CODEOWNERS keyed by area (.github, backend, frontend, docs/site) to guide agents and route reviews.
- [x] Add labeler config to apply path-based labels (backend, frontend, docs, infra) and drive job inclusion/skip logic.
- [ ] Document branch protection and required checks (checklist in docs).
- [x] Pin Actions to SHAs baseline (track upgrades in a single file / comment).

## CI reshape (fan-out + summaries)
- [x] Split CI into reusable workflows: lint, test, e2e, docs; orchestrator uses `needs` fan-in and gate job.
- [x] Add change-aware matrix/path filters to skip untouched areas.
- [x] Add caches: uv (venv/uv cache), npm/pnpm, Playwright browsers; concurrency cancel-in-progress.
- [x] Add flake guard: retry wrapper for flaky steps with annotation.
- [x] Collect artifacts: coverage HTML + diff vs main, test logs, Playwright traces/video, debug bundle on failure.
- [x] Generate run summaries via `GITHUB_STEP_SUMMARY` with status, durations, coverage, artifact links, preview URLs.
- [x] Post PR comment mirroring summary (one comment updated per run).

## Security layer
- [x] Enable CodeQL workflow (language matrix for Python/TS).
- [ ] Enable dependency review + document secret scanning/push protection expectations.
- [x] Add SBOM generation (syft/cyclonedx) + vuln scan (grype/trivy); upload to artifacts/security tab; gate on criticals.
- [ ] Add action provenance/attestation for builds (OIDC).

## GitHub Pages + marketing site
- [x] Scaffold marketing site under `site/` (gradient hero, stat cards, CTA, OG/favicons, analytics hook).
- [x] Wire build scripts for marketing site and existing frontend (Vite) outputs.
- [x] Add Pages deploy workflow (OIDC) publishing both artifacts; configure CNAME hook for future custom domain.
- [x] Add PR preview deploys with comment + link in run summary.
- [ ] Add OG image generation script (node) and social metadata.

## Releases and packages
- [x] Add tag-driven release workflow: backend wheel, frontend bundle, container images to GHCR. *(Image publish + cosign keyless + provenance added.)*
- [x] Add cosign signing + provenance attestations for release artifacts/images.
- [ ] Upload changelog notes and key artifacts (coverage snapshot, SBOM) to releases.

## Bots and automation
- [x] Slash-command dispatch: `/test backend|frontend|docs`, `/release`, `/format`. *(Implemented `/test` → manual-tests workflow.)*
- [ ] Auto-merge deps with labels (dependabot or renovate-friendly).
- [ ] Path-based job routing via labels and CODEOWNERS (docs-only PRs skip heavy tests).
- [x] Add PR template (agent-guidance: tests, traces, docs, preview link) + issue forms (bug/feature).

## README/docs upkeep
- [x] Add managed blocks for badges, last-verified run, workflow tour links. *(Status badge block with guard workflow.)*
- [ ] Add Ops Runbook for workflows (rerun commands, artifacts, slash commands).
- [x] Add Pages/preview instructions and release playbook references.
- [x] Add script to refresh README managed sections in CI and fail on drift.

## Verification
- [ ] Dry-run new workflows via `workflow_dispatch` (or `act` if feasible) and document any org-level toggles needed.
- [ ] Validate PR previews render and summaries show artifact/previews correctly.
- [ ] Document gaps/TODOs if any infra (permissions) is missing.
