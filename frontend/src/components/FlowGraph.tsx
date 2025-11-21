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
  type FlowNodeData = { label: string };
  type FlowEdgeData = { label?: string };
  type FlowElements = Array<Node<FlowNodeData> | Edge<FlowEdgeData>>;

  const nodes: Array<Node<FlowNodeData>> = [];
  const edges: Array<Edge<FlowEdgeData>> = [];

  nodes.push({
    id: "start",
    data: { label: "start" },
    position: { x: 50, y: 50 },
    sourcePosition: Position.Right,
  });

  flow.steps.forEach((step, idx: number) => {
    nodes.push({
      id: step.id,
      data: { label: `${step.id} (${step.agent})` },
      position: { x: 180 * (idx + 1), y: 120 },
      sourcePosition: Position.Right,
      targetPosition: Position.Left,
      style: { border: "1px solid #cbd5e1", padding: 8, borderRadius: 6, background: "#fff" },
    });

    Object.entries(step.transitions || {}).forEach(([event, target]) => {
      if (target !== "end") {
        edges.push({
          id: `${step.id}-${event}-${target}`,
          source: step.id,
          target,
          label: event,
          animated: true,
        });
      }
    });
  });

  nodes.push({
    id: "end",
    data: { label: "end" },
    position: { x: 150 * (flow.steps.length + 1), y: 100 },
    targetPosition: Position.Left,
  });

  edges.push({
    id: `start-${flow.start}`,
    source: "start",
    target: flow.start,
    label: "start",
    animated: true,
  });

  const elements: FlowElements = [...nodes, ...edges];

  const reactFlowProps = { elements, fitView: true };

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
