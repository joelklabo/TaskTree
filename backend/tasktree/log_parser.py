"""Parse Python error logs and extract structured error information."""

import re
from dataclasses import dataclass
from pathlib import Path


@dataclass
class StackFrame:
    """A single frame in a stack trace."""

    file_path: str
    line_number: int
    function_name: str
    code_line: str


@dataclass
class ParsedError:
    """Structured error information extracted from logs."""

    error_type: str
    error_message: str
    file_path: str
    line_number: int
    function_name: str
    stack_trace: list[StackFrame]
    context_before: list[str]
    context_after: list[str]
    full_traceback: str


def parse_python_traceback(log_text: str, context_lines: int = 3) -> ParsedError | None:
    """
    Parse a Python traceback from log text.

    Args:
        log_text: Log text containing a Python traceback
        context_lines: Number of lines of context to extract before/after error line

    Returns:
        ParsedError if a traceback was found, None otherwise

    Example input:
        2024-11-21 12:00:00 - tasktree.debug - ERROR - Debug error triggered: type_error
        Traceback (most recent call last):
          File "/path/to/routes_debug.py", line 100, in trigger_error
            trigger_fn()
          File "/path/to/routes_debug.py", line 25, in _trigger_type_error
            calculate_total([1, 2, "three", 4])
          File "/path/to/routes_debug.py", line 22, in calculate_total
            return sum(items)
        TypeError: unsupported operand type(s) for +: 'int' and 'str'
    """
    lines = log_text.strip().split("\n")

    # Find traceback start
    traceback_start = None
    for i, line in enumerate(lines):
        if "Traceback (most recent call last):" in line:
            traceback_start = i
            break

    if traceback_start is None:
        return None

    # Extract stack frames
    stack_frames: list[StackFrame] = []
    i = traceback_start + 1
    file_pattern = re.compile(r'^\s*File "([^"]+)", line (\d+), in (.+)$')

    while i < len(lines):
        line = lines[i]

        # Check if this is a file/line/function line
        match = file_pattern.match(line)
        if match:
            file_path = match.group(1)
            line_number = int(match.group(2))
            function_name = match.group(3)

            # Next line should be the code
            code_line = ""
            if i + 1 < len(lines):
                code_line = lines[i + 1].strip()
                i += 1  # Skip the code line

            stack_frames.append(
                StackFrame(
                    file_path=file_path,
                    line_number=line_number,
                    function_name=function_name,
                    code_line=code_line,
                )
            )
        elif line.strip() and not line.startswith(" "):
            # This is the error line (not indented, not empty)
            break

        i += 1

    if not stack_frames:
        return None

    # The last line should be the error type and message
    error_line = lines[i] if i < len(lines) else ""
    error_type = "UnknownError"
    error_message = error_line

    # Parse error type and message (e.g., "TypeError: unsupported operand...")
    if ":" in error_line:
        error_type, _, error_message = error_line.partition(":")
        error_type = error_type.strip()
        error_message = error_message.strip()

    # Get the deepest (most specific) frame
    deepest_frame = stack_frames[-1] if stack_frames else None
    if not deepest_frame:
        return None

    # Extract context from source file if possible
    context_before: list[str] = []
    context_after: list[str] = []

    try:
        source_path = Path(deepest_frame.file_path)
        if source_path.exists():
            source_lines = source_path.read_text().splitlines()
            error_line_idx = deepest_frame.line_number - 1  # 0-indexed

            # Extract context before
            start_idx = max(0, error_line_idx - context_lines)
            context_before = source_lines[start_idx:error_line_idx]

            # Extract context after
            end_idx = min(len(source_lines), error_line_idx + context_lines + 1)
            context_after = source_lines[error_line_idx + 1 : end_idx]
    except Exception:
        # If we can't read the file, just use empty context
        context_before = []
        context_after = []

    # Reconstruct full traceback
    full_traceback = "\n".join(lines[traceback_start : i + 1])

    return ParsedError(
        error_type=error_type,
        error_message=error_message,
        file_path=deepest_frame.file_path,
        line_number=deepest_frame.line_number,
        function_name=deepest_frame.function_name,
        stack_trace=stack_frames,
        context_before=context_before,
        context_after=context_after,
        full_traceback=full_traceback,
    )


def format_error_for_display(error: ParsedError) -> str:
    """Format a parsed error for human-readable display."""
    lines = [
        f"Error Type: {error.error_type}",
        f"Message: {error.error_message}",
        f"Location: {error.file_path}:{error.line_number} in {error.function_name}",
        "",
        "Stack Trace:",
    ]

    for frame in error.stack_trace:
        lines.append(f"  {frame.file_path}:{frame.line_number} in {frame.function_name}")
        lines.append(f"    {frame.code_line}")

    if error.context_before or error.context_after:
        lines.append("")
        lines.append("Context:")

        for i, line in enumerate(error.context_before):
            line_num = error.line_number - len(error.context_before) + i
            lines.append(f"  {line_num:4d} | {line}")

        lines.append(f"→ {error.line_number:4d} | {error.stack_trace[-1].code_line}")

        for i, line in enumerate(error.context_after):
            line_num = error.line_number + i + 1
            lines.append(f"  {line_num:4d} | {line}")

    return "\n".join(lines)
