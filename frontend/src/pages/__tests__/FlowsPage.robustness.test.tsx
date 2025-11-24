import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import { vi } from "vitest";
import FlowsPage from "../FlowsPage";

const mockFetchFlows = vi.fn();

vi.mock("../../api/client", async () => {
  const actual = await vi.importActual<Record<string, unknown>>("../../api/client");
  return { ...actual, fetchFlows: (...args: unknown[]) => mockFetchFlows(...args) };
});

describe("FlowsPage robustness", () => {
  beforeEach(() => {
    mockFetchFlows.mockReset();
  });

  it("shows error if /flows returns non-array", async () => {
    mockFetchFlows.mockResolvedValue({ bad: true } as any);
    render(<FlowsPage onRunSelected={() => {}} initialFlows={undefined} />);
    await waitFor(() => expect(screen.getByText(/Unable to load flows/)).toBeInTheDocument());
  });
});
