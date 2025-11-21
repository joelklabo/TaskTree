import React from "react";
import { render, screen } from "@testing-library/react";
import { vi } from "vitest";
import FlowGraph from "../FlowGraph";

const renderProps = vi.fn();

vi.mock("react-flow-renderer", () => {
  const ReactFlowMock = (props: unknown) => {
    renderProps(props);
    return <div data-testid="react-flow-mock" />;
  };
  return {
    __esModule: true,
    default: ReactFlowMock,
    Background: () => null,
    Controls: () => null,
    MiniMap: () => null,
    Position: { Left: "left", Right: "right" },
  };
});

describe("FlowGraph", () => {
  beforeEach(() => {
    renderProps.mockClear();
  });

  it("renders nodes/edges with start/end badges and fitView padding", () => {
    const flow = {
      id: "log_error_handler",
      start: "assess",
      steps: [
        { id: "assess", agent: "copilot_cli", transitions: { success: "propose_fix" } },
        { id: "propose_fix", agent: "copilot_cli", transitions: { success: "test" } },
        { id: "test", agent: "copilot_cli", transitions: { tests_passed: "end" } },
      ],
    };

    render(<FlowGraph flow={flow} />);

    expect(renderProps).toHaveBeenCalledTimes(1);
    const propsRaw: unknown = renderProps.mock.calls[0]?.[0];
    expect(propsRaw && typeof propsRaw === "object").toBeTruthy();
    if (!propsRaw || typeof propsRaw !== "object") return;

    const fitView = (propsRaw as { fitView?: unknown }).fitView;
    expect(fitView).toBe(true);
    const fitViewOptions = (propsRaw as { fitViewOptions?: { padding?: number } }).fitViewOptions;
    expect(fitViewOptions?.padding ?? 0).toBeGreaterThan(0);

    const elementsRaw = (propsRaw as { elements?: unknown }).elements;
    const elements = Array.isArray(elementsRaw)
      ? elementsRaw.filter(
          (el): el is { id?: unknown; data?: unknown; target?: unknown; position?: unknown } =>
            typeof el === "object" && el !== null,
        )
      : [];

    const nodeIds = elements
      .filter((el) => "position" in el)
      .map((n) => (typeof n.id === "string" ? n.id : ""))
      .filter(Boolean);
    const edgeTargets = elements
      .filter((el) => "target" in el)
      .map((e) => (typeof e.target === "string" ? e.target : ""))
      .filter(Boolean);

    expect(nodeIds).toEqual(
      expect.arrayContaining(["start", "assess", "propose_fix", "test", "end"]),
    );
    expect(edgeTargets).toEqual(expect.arrayContaining(["assess", "propose_fix", "test"]));

    const isNodeData = (val: unknown): val is { label?: unknown; badge?: unknown } =>
      typeof val === "object" && val !== null;

    const startNode = elements.find((el) => typeof el.id === "string" && el.id === "start");
    expect(startNode).toBeDefined();
    if (startNode && "data" in startNode) {
      const data: unknown = startNode.data;
      if (isNodeData(data)) {
        expect(typeof data.label === "string" && data.label.toLowerCase().includes("start")).toBe(
          true,
        );
        expect(data.badge).toBe("start");
      }
    }
    const endNode = elements.find((el) => typeof el.id === "string" && el.id === "end");
    expect(endNode).toBeDefined();
    if (endNode && "data" in endNode) {
      const data: unknown = endNode.data;
      if (isNodeData(data)) {
        expect(typeof data.label === "string" && data.label.toLowerCase().includes("end")).toBe(
          true,
        );
        expect(data.badge).toBe("end");
      }
    }
  });

  it("shows a placeholder when no steps are provided", () => {
    const flow = { id: "empty_flow", start: "start", steps: [] };
    render(<FlowGraph flow={flow} />);

    expect(renderProps).not.toHaveBeenCalled();
    expect(screen.getByText(/No steps defined/)).toBeInTheDocument();
  });
});
