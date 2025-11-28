import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { vi } from "vitest";
import FlowsPage from "../FlowsPage";

const mockFetchFlows = vi.fn();
const mockFetchFlow = vi.fn();
const mockRunFlow = vi.fn();

vi.mock("../../api/client", async () => {
  const actual = await vi.importActual<Record<string, unknown>>("../../api/client");
  return {
    ...actual,
    fetchFlows: (...args: unknown[]) => mockFetchFlows(...args),
    fetchFlow: (...args: unknown[]) => mockFetchFlow(...args),
    runFlow: (...args: unknown[]) => mockRunFlow(...args),
    updateFlow: vi.fn(),
    startControlledRun: vi.fn(),
    fetchRunEvents: vi.fn(),
    resumeRun: vi.fn(),
    createFlow: vi.fn(),
    deleteFlow: vi.fn(),
  };
});

describe("FlowsPage shadcn shell", () => {
  beforeEach(() => {
    mockFetchFlows.mockResolvedValue([
      { id: "alpha", name: "Alpha flow", description: "First" },
      { id: "bravo", name: "Bravo flow", description: "Second" },
    ]);
    mockFetchFlow.mockResolvedValue({
      id: "alpha",
      start: "init",
      steps: [{ id: "init", agent: "codex_cli", transitions: {} }],
    });
    mockRunFlow.mockResolvedValue({ session_id: "sess1" });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("shows hero, creation form, search filter, and filtered flow cards", async () => {
    render(<FlowsPage onRunSelected={() => {}} />);

    expect(await screen.findByTestId("flows-hero")).toBeInTheDocument();
    expect(screen.getByTestId("flow-create-form")).toBeInTheDocument();
    const filter = screen.getByTestId("flow-search-input");
    expect(filter).toHaveAttribute("placeholder", expect.stringMatching(/Filter flows/i));

    // filter down to one card
    fireEvent.change(filter, { target: { value: "alpha" } });
    await waitFor(() => {
      const cards = screen.getAllByTestId("flow-card");
      expect(cards).toHaveLength(1);
      expect(cards[0]).toHaveTextContent(/Alpha flow/);
    });
  });
});
