import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { vi } from "vitest";
import FlowsPage from "../FlowsPage";
import type { FlowDetail, FlowSummary, RunResponse } from "../../api/client";

const mocks = vi.hoisted(() => ({
  fetchFlows: vi.fn<() => Promise<FlowSummary[]>>(),
  fetchFlow: vi.fn<(flowId: string) => Promise<FlowDetail>>(),
  runFlow:
    vi.fn<
      (
        flowId: string,
        input: Record<string, unknown>,
        opts?: { trace?: boolean },
      ) => Promise<RunResponse>
    >(),
  toast: vi.fn<(payload: Record<string, unknown>) => void>(),
}));

vi.mock("../../api/client", async () => {
  const actual = await vi.importActual<typeof import("../../api/client")>("../../api/client");
  return {
    ...actual,
    fetchFlows: mocks.fetchFlows,
    fetchFlow: mocks.fetchFlow,
    runFlow: mocks.runFlow,
  };
});

vi.mock("../../components/FlowGraph", () => ({
  default: ({ flow }: { flow: unknown }) => (
    <pre data-testid="flow-graph">{JSON.stringify(flow)}</pre>
  ),
}));

vi.mock("../../components/ui/use-toast", () => ({
  useToast: () => ({ toast: mocks.toast }),
}));

describe("FlowsPage interactions", () => {
  beforeEach(() => {
    mocks.fetchFlows.mockReset();
    mocks.fetchFlow.mockReset();
    mocks.runFlow.mockReset();
    mocks.toast.mockReset();
  });

  it("loads flows, shows detail, and starts traced/non-traced runs", async () => {
    mocks.fetchFlows.mockResolvedValue([{ id: "code_fix", description: "Fix a bug" }]);
    mocks.fetchFlow.mockResolvedValue({
      id: "code_fix",
      start: "start",
      steps: [{ id: "s1", agent: "copilot_cli" }],
    });
    mocks.runFlow
      .mockResolvedValueOnce({
        session_id: "sess-1",
        flow_name: "code_fix",
        trace_run_id: null,
        steps: [],
      })
      .mockResolvedValueOnce({
        session_id: "sess-2",
        flow_name: "code_fix",
        trace_run_id: "trace-2",
        steps: [],
      });
    const onRunSelected = vi.fn();

    render(<FlowsPage onRunSelected={onRunSelected} />);

    expect(await screen.findByText("code_fix")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "code_fix" }));
    expect(mocks.fetchFlow).toHaveBeenCalledWith("code_fix");
    expect(await screen.findByTestId("flow-graph")).toHaveTextContent('"id":"code_fix"');

    fireEvent.click(screen.getByRole("button", { name: "Run" }));
    expect(mocks.runFlow).toHaveBeenCalledWith("code_fix", {}, undefined);
    await waitFor(() =>
      expect(onRunSelected).toHaveBeenCalledWith({ sessionId: "sess-1", traceId: undefined }),
    );
    const normalToast = mocks.toast.mock.calls[0]?.[0];
    expect(normalToast && typeof normalToast === "object").toBe(true);
    if (normalToast && typeof normalToast === "object") {
      const payload = normalToast as { title?: unknown; description?: unknown };
      expect(payload.title).toBe("Run started");
      const description = typeof payload.description === "string" ? payload.description : "";
      expect(description).toContain("sess-1");
    }

    fireEvent.click(screen.getByRole("button", { name: "Run with trace" }));
    expect(mocks.runFlow).toHaveBeenCalledWith("code_fix", {}, { trace: true });
    await waitFor(() =>
      expect(onRunSelected).toHaveBeenCalledWith({ sessionId: "sess-2", traceId: "trace-2" }),
    );
    const tracedToast = mocks.toast.mock.calls[1]?.[0];
    expect(tracedToast && typeof tracedToast === "object").toBe(true);
    if (tracedToast && typeof tracedToast === "object") {
      const payload = tracedToast as { title?: unknown; description?: unknown };
      expect(payload.title).toBe("Traced run started");
      const description = typeof payload.description === "string" ? payload.description : "";
      expect(description).toContain("sess-2");
    }
  });

  it("surfaces run errors via alert and toast", async () => {
    mocks.fetchFlows.mockResolvedValue([{ id: "demo", description: "Demo flow" }]);
    mocks.fetchFlow.mockResolvedValue({ id: "demo", start: "s", steps: [] });
    mocks.runFlow.mockRejectedValue(new Error("boom"));

    render(<FlowsPage onRunSelected={() => {}} />);

    fireEvent.click(await screen.findByRole("button", { name: "demo" }));
    fireEvent.click(screen.getByRole("button", { name: "Run" }));

    await waitFor(() => expect(screen.getByText("Unable to load flows")).toBeInTheDocument());
    expect(mocks.toast).toHaveBeenCalledWith(
      expect.objectContaining({ variant: "destructive", title: "Run failed" }),
    );
  });
});
