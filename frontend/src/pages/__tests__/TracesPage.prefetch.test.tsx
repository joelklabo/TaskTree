import React from "react";
import { render, screen } from "@testing-library/react";
import { vi } from "vitest";
import type { Mock } from "vitest";
import TracesPage from "../TracesPage";
import type { TraceMeta } from "../../api/client";

vi.mock("../../api/client", async () => {
  const actual = await vi.importActual<typeof import("../../api/client")>("../../api/client");
  return { ...actual, fetchTraces: vi.fn(() => Promise.resolve([] as TraceMeta[])) };
});

describe("TracesPage prefetch", () => {
  it("renders provided traces without triggering a fetch", async () => {
    const initial: TraceMeta[] = [
      { run_id: "abc123", cmd: ["uv", "run", "tt", "run", "code_fix"], start_time: "now" },
    ];
    const { fetchTraces } = await import("../../api/client");

    render(<TracesPage onSelectRun={() => {}} initialRuns={initial} />);

    expect(screen.getByText("abc123")).toBeInTheDocument();
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const fetchTracesMock: Mock = fetchTraces as unknown as Mock;
    expect(fetchTracesMock).not.toHaveBeenCalled();
  });
});
