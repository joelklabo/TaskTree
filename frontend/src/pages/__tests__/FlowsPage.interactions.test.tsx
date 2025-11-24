import React from "react";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { vi, beforeAll } from "vitest";
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
  updateFlow: vi.fn<(flowId: string, content: string) => Promise<unknown>>(),
  startControlledRun:
    vi.fn<
      (
        flowId: string,
        input: Record<string, unknown>,
        breakpoints?: string[],
      ) => Promise<RunResponse>
    >(),
  fetchRunEvents: vi.fn<(sessionId: string) => Promise<Array<Record<string, unknown>>>>(),
  resumeRun: vi.fn<(sessionId: string) => Promise<unknown>>(),
  toast: vi.fn<(payload: Record<string, unknown>) => void>(),
}));

vi.mock("../../api/client", async () => {
  const actual = await vi.importActual<typeof import("../../api/client")>("../../api/client");
  return {
    ...actual,
    fetchFlows: mocks.fetchFlows,
    fetchFlow: mocks.fetchFlow,
    runFlow: mocks.runFlow,
    updateFlow: mocks.updateFlow,
    startControlledRun: mocks.startControlledRun,
    fetchRunEvents: mocks.fetchRunEvents,
    resumeRun: mocks.resumeRun,
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
  beforeAll(() => {
    (globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;
  });

  beforeEach(() => {
    mocks.fetchFlows.mockReset();
    mocks.fetchFlow.mockReset();
    mocks.runFlow.mockReset();
    mocks.toast.mockReset();
  });

  it(
    "loads flows, shows detail, and starts traced/non-traced runs",
    { timeout: 10000 },
    async () => {
      mocks.fetchFlows.mockResolvedValue([
        { id: "code_fix", name: "Code Fix", description: "Fix a bug" },
      ]);
      mocks.fetchFlow.mockResolvedValue({
        id: "code_fix",
        name: "Code Fix",
        start: "start",
        steps: [{ id: "s1", agent: "codex_cli" }],
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

      await screen.findByText("Code Fix");
      const codeFixButton = await screen.findByRole("button", { name: "code_fix" });

      await act(async () => {
        fireEvent.click(codeFixButton);
      });
      expect(mocks.fetchFlow).toHaveBeenCalledWith("code_fix");
      expect(await screen.findByTestId("flow-graph")).toHaveTextContent('"id":"code_fix"');

      const runButtons = screen.getAllByRole("button", { name: "Run" });
      fireEvent.click(runButtons[0]);
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

      const tracedButtons = screen.getAllByRole("button", { name: "Run with trace" });
      await act(async () => {
        fireEvent.click(tracedButtons[0]);
      });
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
    },
  );

  it("surfaces run errors via alert and toast", async () => {
    mocks.fetchFlows.mockResolvedValue([{ id: "demo", name: "Demo", description: "Demo flow" }]);
    mocks.fetchFlow.mockResolvedValue({ id: "demo", start: "s", steps: [] });
    mocks.runFlow.mockRejectedValue(new Error("boom"));

    render(<FlowsPage onRunSelected={() => {}} />);

    const demoButton = await screen.findByRole("button", { name: "demo" });
    await act(async () => {
      fireEvent.click(demoButton);
    });
    const runButton = screen.getAllByRole("button", { name: "Run" })[0];
    await act(async () => {
      fireEvent.click(runButton);
    });

    await waitFor(() => expect(screen.getByText("Unable to load flows")).toBeInTheDocument());
    expect(mocks.toast).toHaveBeenCalledWith(
      expect.objectContaining({ variant: "destructive", title: "Run failed" }),
    );
  });

  it("lets users edit flow YAML and control a run", async () => {
    mocks.fetchFlows.mockResolvedValue([
      { id: "code_fix", name: "Code Fix", description: "Fix a bug" },
    ]);
    mocks.fetchFlow.mockResolvedValue({
      id: "code_fix",
      name: "Code Fix",
      start: "start",
      steps: [{ id: "s1", agent: "codex_cli" }],
      description: "demo",
    });
    mocks.updateFlow.mockResolvedValue({ id: "code_fix" });
    mocks.startControlledRun.mockResolvedValue({
      session_id: "ctrl-1",
      flow_name: "code_fix",
      steps: [],
    } as RunResponse);
    mocks.fetchRunEvents.mockResolvedValue([{ type: "paused", step: "s1" }]);
    mocks.resumeRun.mockResolvedValue({ status: "resumed" });

    render(<FlowsPage onRunSelected={() => {}} />);

    const codeFixButton = await screen.findByRole("button", { name: "code_fix" });
    await act(async () => {
      fireEvent.click(codeFixButton);
    });

    const editor = await screen.findByLabelText(/Flow YAML/i);
    fireEvent.change(editor, { target: { value: "id: code_fix\ndescription: edited\n" } });
    fireEvent.click(screen.getByRole("button", { name: /Save flow/i }));
    await waitFor(() => expect(mocks.updateFlow).toHaveBeenCalled());

    fireEvent.click(screen.getByRole("button", { name: /Start controlled run/i }));
    await waitFor(() => expect(mocks.startControlledRun).toHaveBeenCalled());
    await waitFor(() => expect(screen.getByText(/paused/)).toBeInTheDocument());

    fireEvent.click(screen.getByRole("button", { name: /Resume run/i }));
    expect(mocks.resumeRun).toHaveBeenCalledWith("ctrl-1");
  });
});
