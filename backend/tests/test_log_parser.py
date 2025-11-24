"""Tests for the log parser."""

from tasktree.log_parser import ParsedError, StackFrame, parse_python_traceback


def test_parse_simple_traceback() -> None:
    """Test parsing a simple Python traceback."""
    log_text = """2024-11-21 12:00:00 - tasktree.debug - ERROR - Debug error triggered: type_error
Traceback (most recent call last):
  File "/app/routes_debug.py", line 100, in trigger_error
    trigger_fn()
  File "/app/routes_debug.py", line 25, in _trigger_type_error
    calculate_total([1, 2, "three", 4])
  File "/app/routes_debug.py", line 22, in calculate_total
    return sum(items)
TypeError: unsupported operand type(s) for +: 'int' and 'str'"""

    result = parse_python_traceback(log_text)

    assert result is not None
    assert result.error_type == "TypeError"
    assert "unsupported operand type(s)" in result.error_message
    assert result.file_path == "/app/routes_debug.py"
    assert result.line_number == 22
    assert result.function_name == "calculate_total"
    assert len(result.stack_trace) == 3

    # Check first frame
    assert result.stack_trace[0].file_path == "/app/routes_debug.py"
    assert result.stack_trace[0].line_number == 100
    assert result.stack_trace[0].function_name == "trigger_error"
    assert result.stack_trace[0].code_line == "trigger_fn()"

    # Check last frame
    assert result.stack_trace[2].file_path == "/app/routes_debug.py"
    assert result.stack_trace[2].line_number == 22
    assert result.stack_trace[2].function_name == "calculate_total"
    assert result.stack_trace[2].code_line == "return sum(items)"


def test_parse_value_error_traceback() -> None:
    """Test parsing a ValueError traceback."""
    log_text = """2024-11-21 12:05:00 - ERROR - Value error occurred
Traceback (most recent call last):
  File "/app/main.py", line 50, in process_data
    value = int(user_input)
ValueError: invalid literal for int() with base 10: 'not_a_number'"""

    result = parse_python_traceback(log_text)

    assert result is not None
    assert result.error_type == "ValueError"
    assert "invalid literal for int()" in result.error_message
    assert result.file_path == "/app/main.py"
    assert result.line_number == 50
    assert result.function_name == "process_data"


def test_parse_key_error_traceback() -> None:
    """Test parsing a KeyError traceback."""
    log_text = """Traceback (most recent call last):
  File "/app/config.py", line 30, in get_setting
    return settings[key]
KeyError: 'missing_key'"""

    result = parse_python_traceback(log_text)

    assert result is not None
    assert result.error_type == "KeyError"
    assert result.error_message == "'missing_key'"
    assert result.file_path == "/app/config.py"
    assert result.line_number == 30


def test_parse_zero_division_traceback() -> None:
    """Test parsing a ZeroDivisionError traceback."""
    log_text = """Traceback (most recent call last):
  File "/app/math_ops.py", line 15, in divide
    result = numerator / denominator
ZeroDivisionError: division by zero"""

    result = parse_python_traceback(log_text)

    assert result is not None
    assert result.error_type == "ZeroDivisionError"
    assert result.error_message == "division by zero"


def test_parse_no_traceback() -> None:
    """Test that None is returned when no traceback is found."""
    log_text = """2024-11-21 12:00:00 - INFO - Everything is fine
No errors here
Just normal log messages"""

    result = parse_python_traceback(log_text)

    assert result is None


def test_parse_multiline_error_message() -> None:
    """Test parsing an error with multiline message."""
    log_text = """Traceback (most recent call last):
  File "/app/validator.py", line 42, in validate
    raise ValueError(message)
ValueError: Validation failed:
  - Field 'name' is required
  - Field 'age' must be positive"""

    result = parse_python_traceback(log_text)

    assert result is not None
    assert result.error_type == "ValueError"
    # The message parsing might only get the first line after the colon
    assert "Validation failed" in result.error_message


def test_full_traceback_preserved() -> None:
    """Test that full traceback text is preserved."""
    log_text = """Traceback (most recent call last):
  File "/app/main.py", line 10, in main
    do_something()
  File "/app/main.py", line 20, in do_something
    raise RuntimeError("Something went wrong")
RuntimeError: Something went wrong"""

    result = parse_python_traceback(log_text)

    assert result is not None
    assert "Traceback (most recent call last)" in result.full_traceback
    assert "RuntimeError: Something went wrong" in result.full_traceback
    assert len(result.full_traceback.split("\n")) > 0


def test_stack_frame_dataclass() -> None:
    """Test StackFrame dataclass creation."""
    frame = StackFrame(
        file_path="/app/test.py",
        line_number=42,
        function_name="test_function",
        code_line="result = do_work()",
    )

    assert frame.file_path == "/app/test.py"
    assert frame.line_number == 42
    assert frame.function_name == "test_function"
    assert frame.code_line == "result = do_work()"


def test_parsed_error_dataclass() -> None:
    """Test ParsedError dataclass creation."""
    error = ParsedError(
        error_type="TypeError",
        error_message="test error",
        file_path="/app/test.py",
        line_number=10,
        function_name="test_func",
        stack_trace=[],
        context_before=["line 1", "line 2"],
        context_after=["line 3"],
        full_traceback="full traceback text",
    )

    assert error.error_type == "TypeError"
    assert error.error_message == "test error"
    assert len(error.context_before) == 2
    assert len(error.context_after) == 1
