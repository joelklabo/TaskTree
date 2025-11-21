# Make targets quick reference

| Scenario | Backend | Frontend | Tools/notes | All-in-one |
| --- | --- | --- | --- | --- |
| Fresh setup (full) | `make setup-backend` | `make setup-frontend` | `make setup-tools` (installs shfmt/shellcheck) | `make setup` |
| Fresh setup (skip tools) | `make setup-backend` | `make setup-frontend` | — | `make setup-fast` |
| Format | `make format-backend` | `make format-frontend` | — | `make format` |
| Lint | `make lint-backend` | `make lint-frontend` | `make lint-shfmt` / `make lint-shellcheck` | `make lint` |
| Test | `make test-backend` | `make test-frontend` | — | `make test` |
| Coverage | `make coverage-backend` | `make coverage-frontend` | — | `make coverage` |
| Build | `make build-backend` | `make build-frontend` | — | `make build` |
| Dev servers | `make dev-backend` | `make dev-frontend` | — | `make dev` (runs both) |
| Scripts checks | — | — | `make verify-scripts` (shellcheck + tmux smokes) | — |

Notes:
- `make ci` runs lint + test + build.
- `make setup-tools` installs shfmt/shellcheck into `.bin/` (included in PATH). Running `make lint` expects these to exist.
- E2E only: `make test-e2e` (frontend Playwright).
