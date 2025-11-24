#!/bin/bash
# Watch the combined debug log for live flow debugging

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
LOG_FILE="$BACKEND_DIR/logs/debug.log"

echo "Watching TaskTree debug log: $LOG_FILE"
echo "Press Ctrl+C to stop"
echo "========================================"

# Create log file if it doesn't exist
mkdir -p "$(dirname "$LOG_FILE")"
touch "$LOG_FILE"

# Tail the log with color highlighting
uv run python -m tasktree.cli logs tail "$LOG_FILE" --follow | while IFS= read -r line; do
    # Color code by event type
    if [[ "$line" =~ FLOW ]]; then
        echo -e "\033[1;36m$line\033[0m"  # Cyan for flow events
    elif [[ "$line" =~ STEP ]]; then
        echo -e "\033[1;34m$line\033[0m"  # Blue for step start
    elif [[ "$line" =~ PROMPT ]]; then
        echo -e "\033[0;33m$line\033[0m"  # Yellow for prompts
    elif [[ "$line" =~ RESPONSE ]]; then
        echo -e "\033[0;32m$line\033[0m"  # Green for responses
    elif [[ "$line" =~ RESULT ]]; then
        echo -e "\033[1;35m$line\033[0m"  # Magenta for results
    elif [[ "$line" =~ TRANS ]]; then
        echo -e "\033[0;36m$line\033[0m"  # Light cyan for transitions
    elif [[ "$line" =~ ERROR ]]; then
        echo -e "\033[1;31m$line\033[0m"  # Red for errors
    else
        echo "$line"
    fi
done
