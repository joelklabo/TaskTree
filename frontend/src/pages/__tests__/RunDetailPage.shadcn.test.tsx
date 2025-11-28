import React from "react";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import { vi } from "vitest";
import RunDetailPage from "../RunDetailPage";

const mockFetchTrace = vi.hoisted(() => vi.fn());
const mockFetchArtifacts = vi.hoisted(() => vi.fn());

vi.mock("../../api/client", async () => {
  const actual = await vi.importActual<typeof import("../../api/client")>("../../api/client");
  return { ...actual, fetchTrace: mockFetchTrace, fetchArtifacts: mockFetchArtifacts };
});

describe("RunDetailPage shadcn hero", () => {
  beforeEach(() => {
    mockFetchTrace.mockReset();
    mockFetchArtifacts.mockReset();
  });

  it("shows hero stats and reload action", async () => {
    mockFetchTrace.mockResolvedValue([
      {
        run_id: "trace-123",
        session: {
          flow_name: "code_fix",
          flow_version: "1.0.0",
          start_time: "2025-01-01T00:00:00Z",
          end_time: "2025-01-01T00:00:05Z",
          status: "tests_passed",
        },
      },
      {
        run_id: "trace-123",
        step: {
          step_name: "plan",
          agent_name: "codex_cli",
          status: "success",
          label: "plan",
        },
      },
    ]);
    mockFetchArtifacts.mockResolvedValue([{ path: "logs/output.log", size: 512 }]);

    render(<RunDetailPage runRef={{ sessionId: "session-1", traceId: "trace-123" }} />);

    await waitFor(() => expect(mockFetchTrace).toHaveBeenCalled());
    expect(screen.getByTestId("run-hero")).toBeInTheDocument();
    expect(screen.getAllByText(/Run trace-123/i)[0]).toBeInTheDocument();
    expect(screen.getByText("code_fix")).toBeInTheDocument();
    expect(screen.getByText("Steps")).toBeInTheDocument();
    expect(screen.getAllByText("Artifacts")[0]).toBeInTheDocument();
    expect(screen.getByText("Duration")).toBeInTheDocument();
    expect(screen.getByText("tests_passed")).toBeInTheDocument();

    const reload = screen.getByRole("button", { name: /Reload trace/i });
    fireEvent.click(reload);
    await waitFor(() => expect(mockFetchTrace).toHaveBeenCalledTimes(2));
  });
});
