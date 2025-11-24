import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import { vi } from "vitest";
import LogsPage from "../LogsPage";

const mockFetchLogSources = vi.fn();

vi.mock("../../api/client", async () => {
  const actual = await vi.importActual<Record<string, unknown>>("../../api/client");
  return { ...actual, fetchLogSources: (...args: unknown[]) => mockFetchLogSources(...args) };
});

describe("LogsPage robustness", () => {
  beforeEach(() => {
    mockFetchLogSources.mockReset();
  });

  it("shows an error when /logs/sources returns non-array", async () => {
    mockFetchLogSources.mockResolvedValue({ nope: true } as any);
    render(<LogsPage />);
    await waitFor(() => expect(screen.getByText(/Log error/i)).toBeInTheDocument());
    expect(screen.getByText(/Unexpected response/)).toBeInTheDocument();
  });
});
