import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { vi } from "vitest";
import FlowsPage from "../pages/FlowsPage";
import type { FlowDetail } from "../api/client";

const mockFetchFlow = vi.fn();

vi.mock("../api/client", async () => {
  const actual = await vi.importActual<Record<string, unknown>>("../api/client");
  return {
    ...actual,
    fetchFlows: vi.fn().mockResolvedValue([]),
    fetchFlow: (...args: unknown[]) => mockFetchFlow(...args),
    runFlow: vi.fn(),
    updateFlow: vi.fn(),
    startControlledRun: vi.fn(),
    fetchRunEvents: vi.fn(),
    resumeRun: vi.fn(),
  };
});

describe("FlowsPage layout", () => {
  beforeAll(() => {
    // React Flow uses ResizeObserver; provide a minimal stub for jsdom.
    // @ts-expect-error jsdom global shim
    global.ResizeObserver = class {
      observe() {}
      unobserve() {}
      disconnect() {}
    };
  });

  beforeEach(() => {
    mockFetchFlow.mockReset();
  });

  it("stacks the flow editor below the graph/details for more space", async () => {
    const flowDetail: FlowDetail = {
      id: "log_error_handler",
      start: "investigate",
      steps: [
        { id: "investigate", agent: "codex_cli", transitions: { success: "implement" } },
        { id: "implement", agent: "codex_cli", transitions: { success: "test" } },
      ],
      _raw: "id: log_error_handler\nstart: investigate\nsteps: []",
    };

    mockFetchFlow.mockResolvedValue(flowDetail);

    render(
      <FlowsPage
        initialFlows={[{ id: "log_error_handler", description: "Test flow" }]}
        onRunSelected={() => {}}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "log_error_handler" }));

    await waitFor(() => expect(screen.getByTestId("flow-detail-editor")).toBeInTheDocument());
    const panels = screen.getByTestId("flow-detail-panels");
    const main = screen.getByTestId("flow-detail-main");
    const editor = screen.getByTestId("flow-detail-editor");

    expect(panels.className).not.toMatch(/grid/);
    const relation = main.compareDocumentPosition(editor);
    expect(relation & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });
});
