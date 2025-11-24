#!/usr/bin/env python3
"""Test script to demonstrate the full log error handler flow."""

import json

from tasktree.log_parser import parse_python_traceback

# Sample traceback from the debug endpoint
# ruff: noqa: E501
SAMPLE_TRACEBACK = """2024-11-21 12:00:00 - tasktree.debug - ERROR - Debug error triggered: type_error
Traceback (most recent call last):
  File "/Users/honk/code/TaskTree/backend/tasktree/api/routes_debug.py", line 100, in trigger_error
    trigger_fn()
  File "/Users/honk/code/TaskTree/backend/tasktree/api/routes_debug.py", line 25, in _trigger_type_error
    calculate_total([1, 2, "three", 4])
  File "/Users/honk/code/TaskTree/backend/tasktree/api/routes_debug.py", line 22, in calculate_total
    return sum(items)
TypeError: unsupported operand type(s) for +: 'int' and 'str'"""


def main() -> None:
    """Parse the error and generate flow input."""
    parsed = parse_python_traceback(SAMPLE_TRACEBACK)

    if not parsed:
        print("Failed to parse traceback")
        return

    # Create flow input with parsed error details
    flow_input = {
        "error_log": SAMPLE_TRACEBACK,
        "error_details": {
            "error_type": parsed.error_type,
            "error_message": parsed.error_message,
            "file_path": parsed.file_path,
            "line_number": parsed.line_number,
            "function_name": parsed.function_name,
            "full_traceback": parsed.full_traceback,
            "context_before": parsed.context_before,
            "context_after": parsed.context_after,
        },
    }

    print("Parsed error details:")
    print(json.dumps(flow_input, indent=2))
    print("\n" + "=" * 80 + "\n")

    # Show the command to run the flow
    input_json = json.dumps(flow_input)
    print("Run the flow with this command:")
    print(f"uv run tt run log_error_handler --input '{input_json}'")


if __name__ == "__main__":
    main()
