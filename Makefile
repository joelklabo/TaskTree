TOOLS_DIR := $(CURDIR)/.bin
export PATH := $(TOOLS_DIR):$(PATH)
PY=cd backend && uv
FE=cd frontend

.PHONY: setup setup-backend setup-frontend setup-tools
setup-backend:
	cd backend && uv sync --extra dev

setup-frontend:
	cd frontend && npm ci
	cd frontend && npx playwright install --with-deps

setup-tools:
	./scripts/install_tools.sh

setup: setup-backend setup-frontend setup-tools

.PHONY: setup-fast
setup-fast:
	$(MAKE) setup-backend
	$(MAKE) setup-frontend

.PHONY: format format-backend format-frontend
format-backend:
	cd backend && uvx ruff format .

format-frontend:
	cd frontend && npm run format

format: format-backend format-frontend

.PHONY: dev dev-backend dev-frontend
dev-backend:
	cd backend && uv run uvicorn tasktree.api.app:app --reload --port 8000

dev-frontend:
	cd frontend && npm run dev

dev:
	$(MAKE) -j2 dev-backend dev-frontend

.PHONY: check-backend
check-backend:
	curl -fsS http://localhost:8000/health || (echo "backend not responding on :8000"; exit 1)

.PHONY: lint lint-backend lint-frontend
lint-backend:
	cd backend && uvx ruff check . && uv run mypy --config-file mypy.ini . && uv run bandit -q -r tasktree && uv run yamllint -c ../.yamllint.yml .

lint-frontend:
	cd frontend && npm run lint && npm run typecheck && npm run format:check

lint: lint-backend lint-frontend lint-shellcheck
	$(MAKE) lint-md lint-djlint lint-shfmt lint-actions

.PHONY: lint-shellcheck
lint-shellcheck:
	$(TOOLS_DIR)/shellcheck --version >/dev/null
	find scripts -name '*.sh' -print0 | xargs -0 $(TOOLS_DIR)/shellcheck

.PHONY: lint-jsonschema
lint-jsonschema:
	python3 -c "import json, pathlib; p=pathlib.Path('scripts/tmux/dashboard_state.schema.json'); json.loads(p.read_text()); print('ok: dashboard_state.schema.json is valid JSON')"

.PHONY: lint-md lint-djlint lint-shfmt
lint-md:
	npx markdownlint-cli2 "README.md" "docs/**/*.md"

lint-djlint:
	cd backend && uv run djlint --extension j2 tasktree/config/prompts --check

lint-shfmt:
	if [ ! -x "$(TOOLS_DIR)/shfmt" ]; then \
	  echo "shfmt missing; run 'make setup-tools' to install to $(TOOLS_DIR)"; \
	  exit 1; \
	fi
	$(TOOLS_DIR)/shfmt --version >/dev/null
	$(TOOLS_DIR)/shfmt -d scripts

.PHONY: lint-actions
lint-actions:
	if [ ! -x "$(TOOLS_DIR)/actionlint" ]; then \
	  echo "actionlint missing; run 'make setup-tools' to install to $(TOOLS_DIR)"; \
	  exit 1; \
	fi
	$(TOOLS_DIR)/actionlint

.PHONY: log-watch
log-watch:
	LOG_PATH=$(LOG_PATH) FLOW_ID=$(FLOW_ID) PATTERNS="$(PATTERNS)" DRY_RUN=$(DRY_RUN) ./scripts/watch_logs.sh

.PHONY: tmux-log-watch
tmux-log-watch:
	TMUX_SESSION=$(SESSION) CMD_OVERRIDE="$(CMD)" ./scripts/tmux/log_watch_pane.sh

.PHONY: test test-backend test-frontend
test-backend:
	cd backend && uv run pytest --cov=tasktree --cov-report=xml

test-frontend:
	cd frontend && npm run test:unit && npm run coverage && npm run e2e

test: test-backend test-frontend

.PHONY: coverage coverage-backend coverage-frontend
coverage-backend:
	cd backend && uv run pytest --cov=tasktree --cov-report=xml

coverage-frontend:
	cd frontend && npm run coverage

coverage: coverage-backend coverage-frontend

.PHONY: test-e2e
test-e2e:
	cd frontend && npm run e2e

.PHONY: build build-backend build-frontend
build-backend:
	cd backend && uv run python -m compileall tasktree

build-frontend:
	cd frontend && npm run build

build: build-backend build-frontend

.PHONY: ci
ci: lint test build

.PHONY: tmux-smoke
tmux-smoke:
	./scripts/tmux/tmux_dashboard_smoke.sh

.PHONY: tmux-refresh-smoke
tmux-refresh-smoke:
	./scripts/tmux/tmux_refresh_smoke.sh

.PHONY: tmux
tmux:
	./scripts/tmux/tmux_dashboard.sh --session ttx

tmux-info:
	@session=ttx; \
	echo "Session: $$session"; \
	echo "Attach: tmux attach -t $$session"; \
	echo "Launcher: ./scripts/tmux/tmux_dashboard.sh --session $$session"; \
	if [ -f logs/dashboard_session.txt ]; then \
	  echo "--- logs/dashboard_session.txt ---"; cat logs/dashboard_session.txt; \
	fi

.PHONY: test-scripts
test-scripts:
	$(MAKE) lint-shellcheck
	cd tui && go build -o cmd/ttx-dashboard/ttx-dashboard ./cmd/ttx-dashboard
	./scripts/tmux/tests/test_log_search.sh
	./scripts/tmux/tests/test_log_search_bug.sh
	./scripts/tmux/tests/test_log_sources_listing.sh
	./scripts/tmux/tests/test_mouse_copy.sh
	./scripts/tmux/tests/test_log_search_missing_rg.sh
	./scripts/tmux/tests/test_alerts_smoke_header.sh
	./scripts/tmux/tests/test_alerts_cache_fallback.sh
	./scripts/tmux/tests/test_search_pane_prompt.sh
	./scripts/tmux/tests/test_ci_pane_missing.sh
	./scripts/tmux/tests/test_ci_pane_with_gh_stub.sh
	./scripts/tmux/tests/test_status_links.sh
	./scripts/tmux/tests/test_tmux_overlays.sh
	./scripts/tmux/tests/test_tmux_titles.sh
	./scripts/tmux/tests/test_log_alerts.sh
	./scripts/tmux/tests/test_dashboard_state_smoke.sh
	./scripts/tmux/tests/test_dashboard_state_schema.sh
	./scripts/tmux/tests/test_dashboard_state_tmux.sh
	./scripts/tmux/tests/test_dashboard_state_cache.sh
	./scripts/tmux/tests/test_dashboard_state_schema_file.sh
	./scripts/tmux/tests/test_dashboard_state_missing_keys.sh
	./scripts/tmux/tests/test_dashboard_state_alerts_detail.sh
	./scripts/tmux/tests/test_dashboard_state_ci_runs.sh
	./scripts/tmux/tests/test_dashboard_window_cmd.sh
	./scripts/tmux/tests/test_tui_window.sh
	./scripts/tmux/tests/test_tui_window.sh
	$(MAKE) tmux-smoke
	$(MAKE) tmux-refresh-smoke
	./scripts/tmux/tmux_e2e_expect.sh

.PHONY: verify-scripts
verify-scripts: test-scripts

.PHONY: tmux-e2e
tmux-e2e:
	./scripts/tmux_e2e_expect.sh
