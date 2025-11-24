#!/bin/bash
# Restore original agent config

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
AGENTS_DIR="$BACKEND_DIR/tasktree/config/agents"

if [ -f "$AGENTS_DIR/codex_cli.yaml.backup" ]; then
    mv "$AGENTS_DIR/codex_cli.yaml.backup" "$AGENTS_DIR/codex_cli.yaml"
    echo "✅ Restored original codex_cli.yaml config"
else
    echo "⚠️  No backup found at codex_cli.yaml.backup"
fi
