# VS Code quickstart

## Run dev servers
- Tasks: `Dev: backend (uvicorn)` and `Dev: frontend (Vite)` from the Command Palette (Tasks: Run Task). Use the compound launch config “Dev: backend + frontend” in the Run/Debug panel to start both plus a browser.

## Lint/test shortcuts
- Tasks: `Lint: backend`, `Lint: frontend`, `Test: backend`, `Test: frontend (unit)`, `Test: frontend (e2e)`, or `CI (make ci)` for the full suite.
- Pytest is enabled in VS Code (see `.vscode/settings.json`); Test Explorer will show backend tests.

## Tmux dashboard from VS Code
- Tasks: `Dashboard: tmux (attach)` or `Dashboard: tmux (no attach)` will launch the existing tmux dashboard (`scripts/tmux_dashboard.sh`) from an integrated terminal. Attach will drop you into tmux; no-attach just spins it up for logs/servers.
- You can also open a new integrated terminal and run `scripts/tmux_dashboard.sh --session ttx`.

## Debug configs
- Backend: “Backend: FastAPI (uvicorn)” debug config runs uvicorn with reload at :8000.
- Frontend: “Frontend: Vite (Chrome)” launches Chrome to :5173 (prelaunch task starts Vite dev server).
- Playwright: “Playwright: UI mode” opens the test runner UI.
- Compound: “Dev: backend + frontend” starts both services together.

## Useful extensions
- See `.vscode/extensions.json`: Python, Ruff, ESLint/Prettier, GitHub Copilot/Actions, Playwright, YAML.

## Notes
- Formatting on save is enabled (Ruff for Python, Prettier for TS/TSX).
- `.vscode/settings.json` sets pytest as the test runner and associates `.j2` with Jinja-HTML.
