#!/bin/bash
# Helper script to temporarily use codex config for log_trigger

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
AGENTS_DIR="$BACKEND_DIR/tasktree/config/agents"

# Backup original config
cp "$AGENTS_DIR/codex_cli.yaml" "$AGENTS_DIR/codex_cli.yaml.backup"

# Use codex config
cp "$AGENTS_DIR/codex_cli_codex.yaml" "$AGENTS_DIR/codex_cli.yaml"

echo "✅ Switched to codex config"
echo "   Original backed up to codex_cli.yaml.backup"
echo ""
echo "Run log watcher with:"
echo "  cd backend && uv run python -m tasktree.log_trigger --paths logs/backend-dev.log --patterns ERROR Traceback"
echo ""
echo "To restore original config:"
echo "  ./scripts/restore_default_agent.sh"
