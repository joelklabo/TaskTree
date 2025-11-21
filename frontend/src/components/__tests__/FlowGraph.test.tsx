import React from "react";
import { render } from "@testing-library/react";
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

  it("renders nodes/edges and requests fitView so the graph is visible", () => {
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
    const props = renderProps.mock.calls[0][0] as Record<string, unknown>;
    expect(props.fitView).toBe(true);

    const elements = (props.elements as Array<Record<string, unknown>>) || [];
    const nodeIds = elements.filter((el) => "position" in el).map((n) => n.id);
    const edgeTargets = elements.filter((el) => "target" in el).map((e) => e.target);

    expect(nodeIds).toEqual(
      expect.arrayContaining(["start", "assess", "propose_fix", "test", "end"]),
    );
    expect(edgeTargets).toEqual(expect.arrayContaining(["assess", "propose_fix", "test"]));
  });
});
