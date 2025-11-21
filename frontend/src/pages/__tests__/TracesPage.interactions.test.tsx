import React from "react";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import { vi } from "vitest";
import TracesPage from "../TracesPage";
import type { TraceMeta } from "../../api/client";

const mockFetchTraces = vi.hoisted(() => vi.fn<() => Promise<TraceMeta[]>>());

vi.mock("../../api/client", async () => {
  const actual = await vi.importActual<typeof import("../../api/client")>("../../api/client");
  return { ...actual, fetchTraces: mockFetchTraces };
});

describe("TracesPage interactions", () => {
  beforeEach(() => {
    mockFetchTraces.mockReset();
  });

  it("loads traces, handles errors, and invokes selection", async () => {
    const onSelectRun = vi.fn();
    mockFetchTraces.mockResolvedValue([
      { run_id: "trace-1", cmd: ["uv", "run", "tt", "run"], start_time: "now" },
    ]);

    render(<TracesPage onSelectRun={onSelectRun} />);

    expect(await screen.findByText("trace-1")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "trace-1" }));
    expect(onSelectRun).toHaveBeenCalledWith("trace-1");

    // Switch to error case.
    mockFetchTraces.mockRejectedValueOnce(new Error("oops"));
    render(<TracesPage onSelectRun={onSelectRun} />);
    await waitFor(() => expect(screen.getByText(/Unable to load traces/)).toBeInTheDocument());
  });
});
