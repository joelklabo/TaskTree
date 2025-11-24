import React from "react";
import { render, screen, fireEvent, act, waitFor } from "@testing-library/react";
import { vi } from "vitest";
import { CodeEditor } from "../components/CodeEditor";

describe("CodeEditor JSON helpers", () => {
  it("shows lint errors and formats valid JSON", { timeout: 10000 }, async () => {
    const handleChange = vi.fn();

    function Wrapper() {
      const [val, setVal] = React.useState('{"foo":');
      return (
        <CodeEditor
          value={val}
          onValueChange={(next) => {
            setVal(next);
            handleChange(next);
          }}
          language="json"
          enableLint
          data-testid="code-editor"
        />
      );
    }

    render(<Wrapper />);

    expect(screen.getByText(/Invalid JSON/i)).toBeInTheDocument();

    const textbox = screen.getByRole("textbox");
    await act(async () => {
      fireEvent.change(textbox, { target: { value: '{"foo":1}' } });
    });

    const formatBtn = screen.getByRole("button", { name: /Format JSON/i });
    await act(async () => {
      fireEvent.click(formatBtn);
    });

    await waitFor(() => expect(screen.getByRole("textbox")).toHaveValue('{\n  "foo": 1\n}'));
    expect(handleChange).toHaveBeenLastCalledWith('{\n  "foo": 1\n}');
    expect(screen.queryByText(/Invalid JSON/i)).toBeNull();
  });
});
