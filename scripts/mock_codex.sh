#!/bin/bash
# Read stdin into a variable
PROMPT=$(cat)

# Check for keywords to identify the prompt type
if echo "$PROMPT" | grep -q "Produce a short plan"; then
  cat <<EOF
{
  "status": "success",
  "summary": "Plan: Fix the add function in calculator.py.",
  "learnings": [],
  "commands": []
}
EOF
elif echo "$PROMPT" | grep -q "Implement the following plan"; then
  # Return the fix
  cat <<EOF
{
  "status": "success",
  "summary": "Fixed calculator.py",
  "learnings": [],
  "commands": [
    "cat <<INNER_EOF > src/calculator.py\ndef add(a, b):\n    return a + b\nINNER_EOF"
  ]
}
EOF
elif echo "$PROMPT" | grep -q "Run the project's tests"; then
  # Run the actual tests to see if they pass
  if uv run pytest tests/test_calculator.py >/dev/null 2>&1; then
    LABEL="tests_passed"
    SUMMARY="Tests passed."
  else
    LABEL="tests_failed"
    SUMMARY="Tests failed."
  fi

  cat <<EOF
{
  "status": "success",
  "summary": "$SUMMARY",
  "label": "$LABEL",
  "metrics": {"time_sec": 0.1},
  "learnings": []
}
EOF
else
  # Fallback
  echo '{"status": "failure", "output": "Unknown prompt"}'
fi
