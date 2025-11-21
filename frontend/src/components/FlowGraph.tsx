import React from "react";
import ReactFlow, {
  Background,
  Controls,
  MiniMap,
  Position,
  Edge,
  Node,
} from "react-flow-renderer";

type Props = {
  flow: {
    id: string;
    start: string;
    steps: Array<{
      id: string;
      agent: string;
      transitions?: Record<string, string>;
    }>;
  };
};

export default function FlowGraph({ flow }: Props) {
  if (!flow) return null;
  if (!flow.steps || flow.steps.length === 0) {
    return (
      <div className="rounded-md border border-dashed bg-white p-4 text-sm text-muted-foreground">
        No steps defined for this flow yet.
      </div>
    );
  }
  type FlowNodeData = { label: string; badge?: string };
  type FlowEdgeData = { label?: string };
  type FlowElements = Array<Node<FlowNodeData> | Edge<FlowEdgeData>>;

  const nodes: Array<Node<FlowNodeData>> = [];
  const edges: Array<Edge<FlowEdgeData>> = [];

  nodes.push({
    id: "start",
    data: { label: "Start", badge: "start" },
    position: { x: 50, y: 80 },
    sourcePosition: Position.Right,
    style: { border: "1px solid #cbd5e1", padding: 10, borderRadius: 10, background: "#ecfeff" },
  });

  const stepIds = flow.steps.map((step) => step.id);

  flow.steps.forEach((step, idx: number) => {
    const x = 190 * (idx + 1);
    const y = 80 + (idx % 2) * 120;
    nodes.push({
      id: step.id,
      data: { label: `${step.id} (${step.agent})`, badge: "step" },
      position: { x, y },
      sourcePosition: Position.Right,
      targetPosition: Position.Left,
      style: { border: "1px solid #cbd5e1", padding: 10, borderRadius: 10, background: "#fff" },
    });

    Object.entries(step.transitions || {}).forEach(([event, target]) => {
      const targetId = target === "end" ? "end" : target;
      edges.push({
        id: `${step.id}-${event}-${targetId}`,
        source: step.id,
        target: targetId,
        label: event,
        animated: true,
      });
    });
  });

  nodes.push({
    id: "end",
    data: { label: "End", badge: "end" },
    position: { x: 200 * (flow.steps.length + 1 || 2), y: 100 },
    targetPosition: Position.Left,
    style: { border: "1px solid #cbd5e1", padding: 10, borderRadius: 10, background: "#fef9c3" },
  });

  const startTargetId = stepIds.includes(flow.start) ? flow.start : stepIds[0] || "end";

  edges.push({
    id: `start-${startTargetId}`,
    source: "start",
    target: startTargetId,
    label: "start",
    animated: true,
  });

  const elements: FlowElements = [...nodes, ...edges];

  const reactFlowProps = {
    elements,
    fitView: true,
    fitViewOptions: { padding: 0.2 },
  };

  return (
    <div style={{ height: 420 }}>
      {/* Elements prop typing differs across react-flow-renderer versions; cast to satisfy TS/ESLint. */}
      {/* eslint-disable-next-line @typescript-eslint/no-unsafe-assignment */}
      <ReactFlow {...(reactFlowProps as unknown as Record<string, unknown>)}>
        <MiniMap />
        <Controls />
        <Background />
      </ReactFlow>
    </div>
  );
}
