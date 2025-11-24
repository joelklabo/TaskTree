#!/bin/bash
# Wrapper for codex exec that returns only the LLM's JSON response
# Usage: echo "prompt" | codex_wrapper.sh

# Read prompt from stdin
prompt=$(cat)

# Run codex and capture output
output=$(echo "$prompt" | codex exec - 2>/dev/null)

# Extract JSON response, handling various formats:
# 1. Remove markdown code blocks (```json ... ```)
# 2. Find first line starting with { (JSON object)
# 3. Return just that line

# Remove markdown code blocks and get lines starting with {
echo "$output" | sed '/```/d' | grep -m 1 '^{' || {
    # Fallback: if no line starts with {, try to find first non-empty line
    echo "$output" | grep -v '^$' | head -1
}
