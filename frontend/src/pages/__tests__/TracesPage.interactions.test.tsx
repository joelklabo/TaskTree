import React from "react";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import { vi } from "vitest";
import TracesPage from "../TracesPage";
import type { TraceMeta } from "../../api/client";

const mockFetchTraces = vi.hoisted(() => vi.fn<() => Promise<TraceMeta[]>>());
const mockFetchCompare = vi.hoisted(() => vi.fn<(a: string, b: string) => Promise<any>>());

vi.mock("../../api/client", async () => {
  const actual = await vi.importActual<typeof import("../../api/client")>("../../api/client");
  return { ...actual, fetchTraces: mockFetchTraces, fetchTraceCompare: mockFetchCompare };
});

describe("TracesPage interactions", () => {
  beforeEach(() => {
    mockFetchTraces.mockReset();
    mockFetchCompare.mockReset();
  });

  it("loads traces, supports quick filters, and invokes selection", async () => {
    const onSelectRun = vi.fn();
    mockFetchTraces.mockResolvedValue([
      {
        run_id: "trace-1",
        cmd: ["uv", "run", "tt", "run", "code_fix"],
        start_time: "now",
        flow_name: "code_fix",
        label: "tests_passed",
      },
      {
        run_id: "trace-2",
        cmd: ["uv", "run", "tt", "run", "log_error_handler"],
        start_time: "later",
        flow_name: "log_error_handler",
        label: "error_seen",
      },
    ]);

    render(<TracesPage onSelectRun={onSelectRun} />);

    expect(await screen.findByText("trace-1")).toBeInTheDocument();
    expect(screen.getAllByText("code_fix").length).toBeGreaterThan(0);
    expect(screen.getAllByText("tests_passed").length).toBeGreaterThan(0);
    fireEvent.click(screen.getByRole("button", { name: "trace-1" }));
    expect(onSelectRun).toHaveBeenCalledWith("trace-1");

    const quickFilter = screen.getByRole("button", { name: "code_fix" });
    fireEvent.click(quickFilter);
    expect(screen.queryByText("trace-2")).not.toBeInTheDocument();
    expect(screen.getByText("trace-1")).toBeInTheDocument();
    fireEvent.click(quickFilter);
    expect(screen.getByText("trace-2")).toBeInTheDocument();

    // Switch to error case.
    mockFetchTraces.mockRejectedValueOnce(new Error("oops"));
    render(<TracesPage onSelectRun={onSelectRun} />);
    await waitFor(() => expect(screen.getByText(/Unable to load traces/)).toBeInTheDocument());
  });

  it("filters traces by id, flow name, or label", async () => {
    mockFetchTraces.mockResolvedValue([
      { run_id: "t-1", cmd: ["run"], start_time: "now", flow_name: "code_fix", label: "tests" },
      { run_id: "t-2", cmd: ["run"], start_time: "now", flow_name: "debugger", label: "failed" },
    ]);

    render(<TracesPage onSelectRun={() => {}} />);

    expect(await screen.findByText("t-1")).toBeInTheDocument();
    const search = screen.getByPlaceholderText(/Filter runs/i);
    fireEvent.change(search, { target: { value: "debug" } });

    expect(screen.queryByText("t-1")).not.toBeInTheDocument();
    expect(screen.getByText("t-2")).toBeInTheDocument();

    fireEvent.change(search, { target: { value: "tests" } });
    expect(screen.getByText("t-1")).toBeInTheDocument();

    fireEvent.change(search, { target: { value: "nope" } });
    expect(screen.getByText(/No runs match filter/)).toBeInTheDocument();
  });

  it("compares two runs and shows summary", async () => {
    mockFetchTraces.mockResolvedValue([
      { run_id: "a", flow_name: "code_fix", start_time: "now" },
      { run_id: "b", flow_name: "code_fix", start_time: "now" },
    ]);
    mockFetchCompare.mockResolvedValue({
      runs: { a: { run_id: "a" }, b: { run_id: "b" } },
      summary: { total: 2, mismatched: 1, missing_in_a: 0, missing_in_b: 0 },
      steps: [
        {
          step_name: "plan",
          a: { status: "success", duration_ms: 100 },
          b: { status: "failure", duration_ms: 120 },
          delta: { status_changed: true, duration_ms: 20 },
        },
      ],
    });

    render(<TracesPage onSelectRun={() => {}} />);
    await screen.findByText("a");

    fireEvent.change(screen.getByTestId("compare-run-a"), { target: { value: "a" } });
    fireEvent.change(screen.getByTestId("compare-run-b"), { target: { value: "b" } });
    fireEvent.click(screen.getByRole("button", { name: "Compare" }));

    expect(await screen.findByTestId("compare-result")).toBeInTheDocument();
    expect(screen.getByText(/1 mismatched/)).toBeInTheDocument();
    expect(screen.getByTestId("compare-row-plan")).toBeInTheDocument();
    expect(mockFetchCompare).toHaveBeenCalledWith("a", "b");
  });
});
