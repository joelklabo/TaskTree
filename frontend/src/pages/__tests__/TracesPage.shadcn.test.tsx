import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import TracesPage from "../TracesPage";
import type { TraceMeta } from "../../api/client";

describe("TracesPage shadcn layout", () => {
  const sampleRuns: TraceMeta[] = [
    {
      run_id: "trace-a",
      flow_name: "code_fix",
      label: "tests_passed",
      cmd: ["uv", "run", "tt", "run"],
      start_time: "2025-01-01T00:00:00Z",
      status: "tests_passed",
    },
    {
      run_id: "trace-b",
      flow_name: "log_error_handler",
      label: "error_seen",
      cmd: ["uv", "run", "tt", "run"],
      start_time: "2025-01-02T00:00:00Z",
      status: "error",
    },
  ];

  it("renders hero, stats, search, and quick filters", () => {
    render(<TracesPage onSelectRun={() => {}} initialRuns={sampleRuns} />);

    expect(screen.getByText("Traces")).toBeInTheDocument();
    expect(screen.getByTestId("traces-hero")).toBeInTheDocument();

    expect(screen.getByText("Total runs")).toBeInTheDocument();
    expect(screen.getAllByText("2")[0]).toBeInTheDocument();
    expect(screen.getByText("Unique flows")).toBeInTheDocument();

    const search = screen.getByPlaceholderText("Filter runs by flow, label, or command");
    fireEvent.change(search, { target: { value: "code_fix" } });
    expect(screen.getByText("trace-a")).toBeInTheDocument();

    const quickFilter = screen.getByRole("button", { name: "log_error_handler" });
    fireEvent.click(quickFilter);
    expect(screen.queryByText("trace-a")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Reset filters" }));
    expect(screen.getByText("trace-a")).toBeInTheDocument();
  });
});
