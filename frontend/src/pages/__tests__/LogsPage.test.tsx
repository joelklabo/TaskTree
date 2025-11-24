import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { vi } from "vitest";

import LogsPage from "../LogsPage";

const mocks = vi.hoisted(() => ({
  fetchLogSources: vi.fn(),
  streamLogs: vi.fn(),
}));

vi.mock("../../api/client", async () => {
  const actual = await vi.importActual<typeof import("../../api/client")>("../../api/client");
  return {
    ...actual,
    fetchLogSources: mocks.fetchLogSources,
    streamLogs: mocks.streamLogs,
  };
});

describe("LogsPage", () => {
  beforeEach(() => {
    mocks.fetchLogSources.mockReset();
    mocks.streamLogs.mockReset();
  });

  it("loads sources and selects log to stream", async () => {
    mocks.fetchLogSources.mockResolvedValue([{ name: "debug.log", size: 10 }]);
    const close = vi.fn();
    // Mock EventSource object
    const mockEs = { close, onmessage: null, onerror: null, onopen: null };
    mocks.streamLogs.mockReturnValue(mockEs as any);

    render(<LogsPage />);

    expect(await screen.findByText("debug.log")).toBeInTheDocument();

    // Should render LogViewer which calls streamLogs
    await waitFor(() => expect(mocks.streamLogs).toHaveBeenCalled());
    expect(screen.getByText(/Live Logs/)).toBeInTheDocument();
  });

  it("shows empty state when no source selected", async () => {
    mocks.fetchLogSources.mockResolvedValue([{ name: "other.log", size: 10 }]);
    const close = vi.fn();
    const mockEs = { close, onmessage: null, onerror: null, onopen: null };
    mocks.streamLogs.mockReturnValue(mockEs as any);

    render(<LogsPage />);

    // Wait for sources to load
    await screen.findByText("other.log");

    // Deselect if selected (our logic auto-selects first if no defaults match, so we might need to click to deselect)
    const btn = screen.getByText("other.log").closest("button");
    if (btn?.getAttribute("data-state") === "on") {
      // or check class for secondary variant
      fireEvent.click(btn);
    }

    // Actually, our new logic:
    // if (defaults.size > 0) setSelectedSources(defaults);
    // else if (data.length > 0) setSelectedSources(new Set([data[0].name]));
    // So "other.log" will be auto-selected.

    // Let's click it to deselect
    fireEvent.click(screen.getByText("other.log"));

    expect(await screen.findByText(/Select one or more log sources/)).toBeInTheDocument();
  });
});
