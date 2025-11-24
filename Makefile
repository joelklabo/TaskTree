TOOLS_DIR := $(CURDIR)/.bin
export PATH := $(TOOLS_DIR):$(PATH)
PY=cd backend && uv
FE=cd frontend
PNPM=PNPM_HOME=$${PNPM_HOME:-$$HOME/.local/share/pnpm} pnpm
PNPM_LOG_DIR=$(CURDIR)/logs/npm
LINT_LOG_DIR=$(CURDIR)/logs/lint
PNPM_AGG_LOG=$(CURDIR)/logs/npm.log
LINT_AGG_LOG=$(CURDIR)/logs/lint.log
TEST_SHARDS ?= 5

.PHONY: setup setup-backend setup-frontend setup-tools
setup-backend:
	cd backend && uv sync --extra dev

setup-frontend:
	mkdir -p $(PNPM_LOG_DIR)
	cd frontend && bash -o pipefail -c 'PNPM_HOME=${PNPM_HOME:-$$HOME/.local/share/pnpm} pnpm install 2>&1 | tee ../logs/npm/install-frontend.log'
	cd frontend && bash -o pipefail -c 'PNPM_HOME=${PNPM_HOME:-$$HOME/.local/share/pnpm} pnpm exec playwright install --with-deps 2>&1 | tee ../logs/npm/playwright-install.log'

setup-tools:
	./scripts/install_tools.sh

setup: setup-backend setup-frontend setup-tools

.PHONY: setup-fast
setup-fast:
	$(MAKE) setup-backend
	$(MAKE) setup-frontend

.PHONY: format format-backend format-frontend
format-backend:
	@echo "[RUFF] Formatting Python code..."
	cd backend && uvx ruff format .

format-frontend:
	@echo "[PRETTIER] Formatting frontend code..."
	cd frontend && $(PNPM) run format

format: format-backend format-frontend

.PHONY: dev dev-backend dev-frontend
dev-backend:
	cd backend && uv run uvicorn tasktree.api.app:app --reload --port 8000

dev-frontend:
	cd frontend && $(PNPM) run dev -- --host 127.0.0.1 --port 5173

dev:
	$(MAKE) -j2 dev-backend dev-frontend

.PHONY: dev-supervisor
dev-supervisor:
	./scripts/dev_supervisor.sh

.PHONY: check-backend
check-backend:
	curl -fsS http://localhost:8000/health || (echo "backend not responding on :8000"; exit 1)

.PHONY: lint lint-backend lint-frontend
lint-backend:
	mkdir -p $(LINT_LOG_DIR)
	@echo "[RUFF] Checking Python code style (auto-fix)..."
	cd backend && bash -o pipefail -c 'uvx ruff check . --fix 2>&1 | tee ../logs/lint/ruff.log | tee -a ../logs/lint.log'
	@echo "[MYPY] Checking type hints..."
	cd backend && bash -o pipefail -c 'uv run mypy --config-file mypy.ini . 2>&1 | tee ../logs/lint/mypy.log | tee -a ../logs/lint.log'
	@echo "[BANDIT] Checking for security issues..."
	cd backend && bash -o pipefail -c 'uv run bandit -q -r tasktree 2>&1 | tee ../logs/lint/bandit.log | tee -a ../logs/lint.log'
	@echo "[YAMLLINT] Checking YAML files..."
	cd backend && bash -o pipefail -c 'uv run yamllint -c ../.yamllint.yml . 2>&1 | tee ../logs/lint/yamllint.log | tee -a ../logs/lint.log'

.PHONY: lint-backend-fix
lint-backend-fix:
	@echo "[RUFF] Attempting autofix..."
	cd backend && uvx ruff check . --fix

.PHONY: lint-frontend-fix
lint-frontend-fix:
	@echo "[ESLINT] Attempting autofix..."
	cd frontend && $(PNPM) run lint -- --fix
	@echo "[PRETTIER] Attempting autofix..."
	cd frontend && $(PNPM) run format

lint-frontend:
	mkdir -p $(PNPM_LOG_DIR)
	@echo "[ESLINT] Checking frontend code style..."
	cd frontend && bash -o pipefail -c 'PNPM_HOME=$${PNPM_HOME:-$$HOME/.local/share/pnpm} pnpm run lint 2>&1 | tee ../logs/npm/lint-frontend.log | tee -a ../logs/npm.log'
	@echo "[TSC] Checking frontend types..."
	cd frontend && bash -o pipefail -c 'PNPM_HOME=$${PNPM_HOME:-$$HOME/.local/share/pnpm} pnpm run typecheck 2>&1 | tee ../logs/npm/typecheck.log | tee -a ../logs/npm.log'
	@echo "[PRETTIER] Checking frontend formatting..."
	cd frontend && bash -o pipefail -c 'PNPM_HOME=$${PNPM_HOME:-$$HOME/.local/share/pnpm} pnpm run format:check 2>&1 | tee ../logs/npm/format-frontend.log | tee -a ../logs/npm.log'

.PHONY: lint-knip
lint-knip:
	@echo "[KNIP] Checking unused files/exports/deps..."
	cd frontend && bash -o pipefail -c 'PNPM_HOME=$${PNPM_HOME:-$$HOME/.local/share/pnpm} pnpm knip 2>&1 | tee ../logs/npm/knip.log | tee -a ../logs/npm.log'

lint-deps: lint-deps-py lint-vulture

.PHONY: lint-deps-py
lint-deps-py:
	mkdir -p $(LINT_LOG_DIR)
	@echo "[DEPTRY] Checking Python deps (unused/misplaced)..."
	cd backend && bash -o pipefail -c 'uvx deptry . 2>&1 | tee ../logs/lint/deptry.log | tee -a ../logs/lint.log'

.PHONY: lint-vulture
lint-vulture:
	mkdir -p $(LINT_LOG_DIR)
	@echo "[VULTURE] Finding dead Python code..."
	cd backend && bash -o pipefail -c 'uvx vulture tasktree --min-confidence 80 2>&1 | tee ../logs/lint/vulture.log | tee -a ../logs/lint.log'

.PHONY: lint-pip-audit
lint-pip-audit:
	@echo "[PIP-AUDIT] Checking Python vulns..."
	uvx pip-audit || true

lint: lint-backend lint-frontend lint-knip lint-shellcheck lint-log-tailing lint-deps
	$(MAKE) lint-md lint-djlint lint-shfmt lint-actions

.PHONY: lint-shellcheck lint-log-tailing
lint-log-tailing:
	@echo "[LINT] Checking for direct log tailing..."
	mkdir -p $(LINT_LOG_DIR)
	bash -o pipefail -c './scripts/lint_log_tailing.sh 2>&1 | tee logs/lint/log-tailing.log | tee -a logs/lint.log'

lint-shellcheck:
	@echo "[SHELLCHECK] Checking shell scripts..."
	mkdir -p $(LINT_LOG_DIR)
	$(TOOLS_DIR)/shellcheck --version >/dev/null
	bash -o pipefail -c 'find scripts -name \"*.sh\" -print0 | xargs -0 $(TOOLS_DIR)/shellcheck 2>&1 | tee logs/lint/shellcheck.log | tee -a logs/lint.log'

.PHONY: lint-jsonschema
lint-jsonschema:
	python3 -c "import json, pathlib; p=pathlib.Path('scripts/tmux/dashboard_state.schema.json'); json.loads(p.read_text()); print('ok: dashboard_state.schema.json is valid JSON')"

.PHONY: lint-md lint-djlint lint-shfmt
.PHONY: lint-md-fix
lint-md-fix:
	@echo "[MARKDOWNLINT] Attempting autofix..."
	npx markdownlint-cli2-fix "README.md" "docs/**/*.md"

lint-md:
	@echo "[MARKDOWNLINT] Checking markdown files..."
	mkdir -p $(LINT_LOG_DIR)
	bash -o pipefail -c 'npx markdownlint-cli2 "README.md" "docs/**/*.md" 2>&1 | tee logs/lint/markdownlint.log | tee -a logs/lint.log'

.PHONY: lint-djlint-fix
lint-djlint-fix:
	@echo "[DJLINT] Attempting autofix..."
	cd backend && uv run djlint --extension j2 tasktree/config/prompts --fix

lint-djlint:
	@echo "[DJLINT] Checking Jinja2 templates..."
	mkdir -p $(LINT_LOG_DIR)
	cd backend && bash -o pipefail -c 'uv run djlint --extension j2 tasktree/config/prompts --check 2>&1 | tee ../logs/lint/djlint.log | tee -a ../logs/lint.log'

.PHONY: lint-shfmt-fix
lint-shfmt-fix:
		@echo "[SHFMT] Attempting autofix..."
		if [ ! -x "$(TOOLS_DIR)/shfmt" ]; then \
			echo "shfmt missing; run 'make setup-tools' to install to $(TOOLS_DIR)"; \
			exit 1; \
		fi
		$(TOOLS_DIR)/shfmt --version >/dev/null
		$(TOOLS_DIR)/shfmt -w scripts

lint-shfmt:
		@echo "[SHFMT] Checking shell script formatting..."
		if [ ! -x "$(TOOLS_DIR)/shfmt" ]; then \
			echo "shfmt missing; run 'make setup-tools' to install to $(TOOLS_DIR)"; \
			exit 1; \
		fi
		mkdir -p $(LINT_LOG_DIR)
		$(TOOLS_DIR)/shfmt --version >/dev/null
		bash -o pipefail -c '$(TOOLS_DIR)/shfmt -d scripts 2>&1 | tee logs/lint/shfmt.log | tee -a logs/lint.log'

.PHONY: lint-actions
lint-actions:
		@echo "[ACTIONLINT] Checking GitHub Actions workflows..."
		if [ ! -x "$(TOOLS_DIR)/actionlint" ]; then \
			echo "actionlint missing; run 'make setup-tools' to install to $(TOOLS_DIR)"; \
			exit 1; \
		fi
		mkdir -p $(LINT_LOG_DIR)
		bash -o pipefail -c '$(TOOLS_DIR)/actionlint 2>&1 | tee logs/lint/actionlint.log | tee -a logs/lint.log'

.PHONY: log-watch
log-watch:
	LOG_PATH=$(LOG_PATH) FLOW_ID=$(FLOW_ID) PATTERNS="$(PATTERNS)" DRY_RUN=$(DRY_RUN) ./scripts/watch_logs.sh

.PHONY: tmux-log-watch
tmux-log-watch:
	TMUX_SESSION=$(SESSION) CMD_OVERRIDE="$(CMD)" ./scripts/tmux/log_watch_pane.sh

.PHONY: test test-backend test-frontend
# Wrapper to run Playwright once while controlling worker count via TEST_SHARDS.
define run_playwright
BACKEND_PORT=18000 E2E_BACKEND_PORT=18000 VITE_DISABLE_CHECKER=1 $(PNPM) exec playwright test --workers=$(TEST_SHARDS)
endef

test-backend:
	cd backend && uv run pytest --cov=tasktree --cov-report=xml

test-frontend:
	cd frontend && $(PNPM) run test:unit && $(PNPM) run coverage && $(run_playwright)

test: test-backend test-frontend
	@echo "Full suite finished (backend + frontend + Playwright e2e)"

.PHONY: coverage coverage-backend coverage-frontend
coverage-backend:
	cd backend && uv run pytest --cov=tasktree --cov-report=xml

coverage-frontend:
	cd frontend && $(PNPM) run coverage

coverage: coverage-backend coverage-frontend

.PHONY: test-e2e
test-e2e:
	cd frontend && $(PNPM) run e2e

.PHONY: build build-backend build-frontend
build-backend:
	cd backend && uv run python -m compileall tasktree

build-frontend:
	cd frontend && $(PNPM) run build

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
	cd tui && go test ./...
	./scripts/tests/test_zip_repo.sh
	./scripts/tests/test_trace_artifact_upload.sh
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
	./scripts/tmux/tests/test_dashboard_state_schema_types.sh
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

.PHONY: zip
zip:
	./scripts/zip_repo.sh $(if $(ARGS),$(ARGS),--out /tmp/tasktree-code-$(shell date +%Y%m%d-%H%M%S).zip)
