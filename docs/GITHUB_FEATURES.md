# GitHub features setup (admin)

These steps need repo admin rights (UI or `gh` CLI).

## Merge queue (branch protection / ruleset)
1. Protect `main` with required checks (`CI`, `Pages`, `Instructions guard`, `CodeQL`, `Security`, `Project Automation`) and require PR reviews.
2. Enable merge queue on `main` (Settings → Branches → Merge queue). Require the same checks as above; allow squash-only if preferred.
3. Optionally add a ruleset that blocks direct pushes to `.github/` and `main` except for @honk.

## Projects automation (Projects v2)
- Set repo or org variable `PROJECT_ID` to your target project’s ID (find via `gh api graphql -f query='query { repository(name:"TaskTree", owner:"honk"){projectsV2(first:10){nodes{id,title}}}}'`).
- Workflow `.github/workflows/projects.yml` will add newly opened issues/PRs to that project automatically. If `PROJECT_ID` is empty, it no-ops.
- Customize project fields via additional GraphQL calls if desired (status, owner).

## Autolinks/linkifiers
- Use `scripts/github_admin/create_autolink.sh` (requires `gh` logged in with admin rights).
  - Defaults: prefix `TRACE-`, template `https://github.com/<repo>/tree/main/backend/tasktree/agents/trace/runs/{reference}`.
  - Override with `PREFIX`, `TEMPLATE`, `DESCRIPTION`, `REPO`.
  - Example: `PREFIX=FLOW- TEMPLATE='https://tasktree.dev/flows/{reference}' bash scripts/github_admin/create_autolink.sh`.

## Security enforcement
- Enable dependency review + secret scanning push protection in repo settings (Security → Code security and analysis).
- Make `Security` and `CodeQL` workflows required checks in branch protection/ruleset.

## Merge queue + environment guards
- Create environments `github-pages` and `release` with required reviewers/time windows if you want gated deploys.
- Tie Pages and Release workflows to those environments (already targeting `github-pages`).
