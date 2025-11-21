# Copilot / AI assistant instructions

- Source of truth: `AGENTS.md` (TTD workflow expectations). Keep this file aligned with it.
- Follow the TTD loop: start from a failing test/trace, make the smallest change, update docs immediately.
- Always run the matching commands before proposing outcomes: `make lint-backend` / `make test-backend`, `npm run lint` / `npm run test:unit` / `npm run e2e`, or narrower where appropriate.
- Keep README/docs in sync; if a flow, agent, or workflow changes, update `AGENTS.md` or `docs/` with a brief note.
- Respect CODEOWNERS routing; prefer path-specific reviewers/owners.
- Prefer reusable workflows and artifact uploads: coverage HTML, Playwright traces, debug bundles.
- Add preview links (Pages) when touching `site/` or `frontend/`.
- Leave PR comments concise: summary, risk, artifacts/preview links, tests run.
- If unsure about secrets/permissions, stop and ask a human.
