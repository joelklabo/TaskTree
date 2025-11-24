import React from "react";
import FlowGraph from "../components/FlowGraph";
import {
  fetchFlows,
  fetchFlow,
  runFlow,
  updateFlow,
  startControlledRun,
  fetchRunEvents,
  resumeRun,
  createFlow,
  deleteFlow,
  FlowSummary,
  FlowDetail,
  RunResponse,
} from "../api/client";
import { Button } from "../components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "../components/ui/alert";
import { Skeleton } from "../components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../components/ui/table";
import { Badge } from "../components/ui/badge";
import { useToast } from "../components/ui/use-toast";
import { CodeEditor } from "../components/CodeEditor";

const fallbackFlows: FlowSummary[] = [
  {
    id: "code_fix",
    name: "Code Fix",
    description: "Fix bugs in code, run tests, and handle failures.",
  },
  {
    id: "implement_feature",
    name: "Implement Feature",
    description: "Implement a feature from a markdown spec.",
  },
  {
    id: "log_error_handler",
    name: "Log Error Handler",
    description: "Autonomous error handler with retry logic.",
  },
];
const fallbackFlowDetails: Record<string, FlowDetail> = {
  code_fix: {
    id: "code_fix",
    name: "Code Fix",
    description: "Fix bugs in code, run tests, and handle failures.",
    start: "plan",
    steps: [
      { id: "plan", agent: "codex_cli", transitions: { success: "implement" } },
      { id: "implement", agent: "codex_cli", transitions: { success: "test", failure: "end" } },
      {
        id: "test",
        agent: "codex_cli",
        transitions: { tests_passed: "end", tests_failed: "implement" },
      },
    ],
  },
  implement_feature: {
    id: "implement_feature",
    name: "Implement Feature",
    description: "Implement a feature from a markdown spec.",
    start: "research",
    steps: [
      { id: "research", agent: "codex_cli", transitions: { success: "implement" } },
      {
        id: "implement",
        agent: "codex_cli",
        transitions: { success: "verify", failure: "research" },
      },
      { id: "verify", agent: "codex_cli", transitions: { success: "end", failure: "implement" } },
    ],
  },
  log_error_handler: {
    id: "log_error_handler",
    name: "Log Error Handler",
    description: "Autonomous error handler with retry logic.",
    start: "investigate",
    steps: [
      {
        id: "investigate",
        agent: "codex_cli",
        transitions: { success: "implement", failure: "triage" },
      },
      { id: "implement", agent: "codex_cli", transitions: { success: "test", failure: "triage" } },
      {
        id: "test",
        agent: "codex_cli",
        transitions: { tests_passed: "end", tests_failed: "implement" },
      },
      { id: "triage", agent: "codex_cli", transitions: { success: "end", failure: "end" } },
    ],
  },
};

type Props = {
  onRunSelected: (ref: { sessionId: string; traceId?: string }) => void;
  initialFlows?: FlowSummary[] | null;
};

export default function FlowsPage({ onRunSelected, initialFlows }: Props) {
  const normalizeFlows = (value: unknown): FlowSummary[] => {
    if (!Array.isArray(value)) return [];
    return value.filter((f): f is FlowSummary => typeof f?.id === "string");
  };

  const initialNormalized = normalizeFlows(initialFlows);
  const [flows, setFlows] = React.useState<FlowSummary[]>(
    initialNormalized.length > 0 ? initialNormalized : fallbackFlows,
  );
  const [dataLoading, setDataLoading] = React.useState(initialNormalized.length === 0);
  const [running, setRunning] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [selectedFlowId, setSelectedFlowId] = React.useState<string | null>(null);
  const [flowDetail, setFlowDetail] = React.useState<FlowDetail | null>(null);
  const [detailLoading, setDetailLoading] = React.useState(false);
  const [detailError, setDetailError] = React.useState<string | null>(null);
  const [flowYaml, setFlowYaml] = React.useState<string>("");
  const [savingFlow, setSavingFlow] = React.useState(false);
  const [controlledSession, setControlledSession] = React.useState<string | null>(null);
  const [runEvents, setRunEvents] = React.useState<Array<Record<string, unknown>>>([]);
  const [runEventsTimer, setRunEventsTimer] = React.useState<number | null>(null);
  const [controlError, setControlError] = React.useState<string | null>(null);
  const [newFlowId, setNewFlowId] = React.useState("");
  const [newFlowName, setNewFlowName] = React.useState("");
  const [newFlowDescription, setNewFlowDescription] = React.useState("");
  const mergeFlows = (base: unknown, extra?: FlowSummary): FlowSummary[] => {
    const normalized = normalizeFlows(base);
    if (extra && !normalized.find((f) => f.id === extra.id)) {
      return [...normalized, extra];
    }
    return normalized;
  };
  const { toast } = useToast();

  React.useEffect(() => {
    if (Array.isArray(initialFlows)) return;
    fetchFlows()
      .then((data) => {
        const normalized = normalizeFlows(data);
        if (!Array.isArray(data)) {
          setError("Unexpected response from /flows");
        }
        setFlows(normalized.length > 0 ? normalized : fallbackFlows);
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : JSON.stringify(err));
        setFlows(fallbackFlows);
      })
      .finally(() => setDataLoading(false));
  }, [initialFlows]);

  React.useEffect(() => {
    if (!selectedFlowId) {
      setFlowDetail(null);
      return;
    }
    setDetailLoading(true);
    setDetailError(null);
    const fallback = fallbackFlowDetails[selectedFlowId];
    if (fallback) {
      setFlowDetail(fallback);
      setFlowYaml(JSON.stringify(fallback, null, 2));
    }
    fetchFlow(selectedFlowId)
      .then((data) => {
        setFlowDetail(data);
        const raw = (data as FlowDetail & { _raw?: string })._raw;
        if (raw) {
          setFlowYaml(raw);
        } else {
          setFlowYaml(JSON.stringify(data, null, 2));
        }
      })
      .catch((err: unknown) => {
        setDetailError(err instanceof Error ? err.message : JSON.stringify(err));
        const fallback = fallbackFlowDetails[selectedFlowId];
        if (fallback) {
          setFlowDetail(fallback);
          setFlowYaml(JSON.stringify(fallback, null, 2));
        }
      })
      .finally(() => setDetailLoading(false));
  }, [selectedFlowId]);

  const handleRun = async (flowId: string, trace?: boolean) => {
    setRunning(true);
    setError(null);
    try {
      const res: RunResponse = await runFlow(flowId, {}, trace ? { trace: true } : undefined);
      const traceId = res.trace_run_id || undefined;
      onRunSelected({ sessionId: res.session_id, traceId });
      toast({
        title: trace ? "Traced run started" : "Run started",
        description: `Flow "${flowId}" session: ${res.session_id.slice(0, 8)}…`,
      });
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : JSON.stringify(err));
      toast({
        variant: "destructive",
        title: "Run failed",
        description: err instanceof Error ? err.message : "Unable to start flow run",
      });
    } finally {
      setRunning(false);
    }
  };

  React.useEffect(() => {
    return () => {
      if (runEventsTimer) {
        window.clearInterval(runEventsTimer);
      }
    };
  }, [runEventsTimer]);

  const handleSaveFlow = async () => {
    if (!selectedFlowId) return;
    setSavingFlow(true);
    try {
      await updateFlow(selectedFlowId, flowYaml);
      toast({ title: "Flow saved", description: selectedFlowId });
    } catch (err: unknown) {
      toast({
        variant: "destructive",
        title: "Save failed",
        description: err instanceof Error ? err.message : "Unable to save flow",
      });
    } finally {
      setSavingFlow(false);
    }
  };

  const refreshEvents = async (sessionId: string) => {
    try {
      const evts = await fetchRunEvents(sessionId);
      setRunEvents(evts);
    } catch (err: unknown) {
      setControlError(err instanceof Error ? err.message : "Unable to load run events");
    }
  };

  const handleControlledRun = async () => {
    if (!selectedFlowId) return;
    setControlError(null);
    try {
      const breakpoints = flowDetail?.steps?.map((s) => s.id) ?? [];
      const res = await startControlledRun(selectedFlowId, {}, breakpoints);
      setControlledSession(res.session_id);
      setRunEvents([]);
      await refreshEvents(res.session_id);
      if (runEventsTimer) {
        window.clearInterval(runEventsTimer);
      }
      const timerId = window.setInterval(() => {
        refreshEvents(res.session_id);
      }, 1500);
      setRunEventsTimer(timerId);
    } catch (err: unknown) {
      setControlError(err instanceof Error ? err.message : "Unable to start controlled run");
    }
  };

  const handleResume = async () => {
    if (!controlledSession) return;
    await resumeRun(controlledSession);
    await refreshEvents(controlledSession);
  };

  const handleCreateFlow = async () => {
    const id = newFlowId.trim();
    if (!id) return;
    try {
      const created = await createFlow({
        id,
        name: newFlowName.trim() || undefined,
        description: newFlowDescription.trim() || undefined,
      });
      toast({ title: "Flow created", description: id });
      setNewFlowId("");
      setNewFlowName("");
      setNewFlowDescription("");
      const refreshed = await fetchFlows();
      setFlows(mergeFlows(refreshed, created as FlowSummary));
    } catch (err: unknown) {
      toast({
        variant: "destructive",
        title: "Create failed",
        description: err instanceof Error ? err.message : "Unable to create flow",
      });
    }
  };

  const handleDeleteFlow = async (flowId: string) => {
    try {
      await deleteFlow(flowId);
      toast({ title: "Flow deleted", description: flowId });
      setFlows((prev) => normalizeFlows(prev).filter((f) => f.id !== flowId));
      if (selectedFlowId === flowId) {
        setSelectedFlowId(null);
        setFlowDetail(null);
      }
    } catch (err: unknown) {
      toast({
        variant: "destructive",
        title: "Delete failed",
        description: err instanceof Error ? err.message : "Unable to delete flow",
      });
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="text-lg font-semibold tracking-tight">Flows</h2>
          <p className="text-sm text-muted-foreground">
            Launch flows with or without tracing and inspect their structure.
          </p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium" htmlFor="new-flow-id">
              New flow id
            </label>
            <input
              id="new-flow-id"
              className="w-40 rounded-md border px-2 py-1 text-sm"
              placeholder="e.g., my_flow"
              value={newFlowId}
              onChange={(e) => setNewFlowId(e.target.value)}
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium" htmlFor="new-flow-name">
              Name
            </label>
            <input
              id="new-flow-name"
              className="w-40 rounded-md border px-2 py-1 text-sm"
              placeholder="My Flow"
              value={newFlowName}
              onChange={(e) => setNewFlowName(e.target.value)}
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium" htmlFor="new-flow-desc">
              Description
            </label>
            <input
              id="new-flow-desc"
              className="w-48 rounded-md border px-2 py-1 text-sm"
              placeholder="Describe the flow"
              value={newFlowDescription}
              onChange={(e) => setNewFlowDescription(e.target.value)}
            />
          </div>
          <Button onClick={handleCreateFlow} variant="outline" className="h-9">
            Create flow
          </Button>
        </div>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertTitle>Unable to load flows</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {dataLoading && (
        <div className="space-y-3">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
        </div>
      )}

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>ID</TableHead>
            <TableHead>Name</TableHead>
            <TableHead>Description</TableHead>
            <TableHead className="w-48 text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {normalizeFlows(flows).map((flow) => (
            <TableRow key={flow.id}>
              <TableCell>
                <Button
                  variant={selectedFlowId === flow.id ? "secondary" : "ghost"}
                  size="sm"
                  onClick={() => setSelectedFlowId(flow.id)}
                  disabled={detailLoading}
                >
                  {flow.id}
                </Button>
              </TableCell>
              <TableCell className="text-foreground">{flow.name ?? flow.id}</TableCell>
              <TableCell className="text-muted-foreground">
                {flow.description || "No description provided"}
              </TableCell>
              <TableCell className="text-right">
                <div className="flex justify-end gap-2">
                  <Button onClick={() => handleRun(flow.id)} size="sm">
                    Run
                  </Button>
                  <Button variant="secondary" size="sm" onClick={() => handleRun(flow.id, true)}>
                    Run with trace
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => handleDeleteFlow(flow.id)}>
                    Delete
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      {selectedFlowId && (
        <div className="rounded-lg border bg-card p-4">
          <div className="flex items-center gap-2">
            <h3 className="text-base font-semibold">Flow detail: {selectedFlowId}</h3>
            <Badge variant="outline">{flowDetail ? "Loaded" : "Loading"}</Badge>
          </div>
          <div className="mt-3 space-y-3">
            {detailLoading && <Skeleton className="h-24 w-full" />}
            {detailError && (
              <Alert variant="destructive">
                <AlertTitle>Could not load flow</AlertTitle>
                <AlertDescription>{detailError}</AlertDescription>
              </Alert>
            )}
            {flowDetail && (
              <div className="space-y-4" data-testid="flow-detail-panels">
                <div className="space-y-3" data-testid="flow-detail-main">
                  <p className="text-sm text-muted-foreground">Start: {flowDetail.start}</p>
                  <div className="rounded-md border bg-white">
                    <FlowGraph flow={flowDetail} />
                  </div>
                  <div className="flex gap-2 flex-wrap">
                    <Button onClick={() => handleRun(selectedFlowId)} size="sm" disabled={running}>
                      Run
                    </Button>
                    <Button
                      variant="secondary"
                      onClick={() => handleRun(selectedFlowId, true)}
                      size="sm"
                      disabled={running}
                    >
                      Run with trace
                    </Button>
                    <Button onClick={handleControlledRun} size="sm" variant="outline">
                      Start controlled run
                    </Button>
                    <Button
                      onClick={handleResume}
                      size="sm"
                      variant="outline"
                      disabled={!controlledSession}
                    >
                      Resume run
                    </Button>
                  </div>
                  {controlError && (
                    <Alert variant="destructive">
                      <AlertTitle>Run control error</AlertTitle>
                      <AlertDescription>{controlError}</AlertDescription>
                    </Alert>
                  )}
                  {runEvents.length > 0 && (
                    <div className="space-y-2">
                      <h4 className="text-sm font-semibold">Run timeline</h4>
                      <div className="max-h-64 overflow-y-auto rounded border bg-white p-2 text-sm">
                        {runEvents.map((ev, idx) => (
                          <div key={`${ev.type}-${idx}`} className="border-b border-muted py-1">
                            <div className="flex items-center justify-between">
                              <span className="font-medium">{String(ev.type)}</span>
                              {ev.step ? <Badge variant="outline">{String(ev.step)}</Badge> : null}
                            </div>
                            {ev.data && (
                              <pre className="mt-1 whitespace-pre-wrap text-xs text-muted-foreground">
                                {JSON.stringify(ev.data, null, 2)}
                              </pre>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
                <div className="space-y-2" data-testid="flow-detail-editor">
                  <label className="space-y-1 block" htmlFor="flow-yaml-editor">
                    <span className="text-sm font-semibold">Flow YAML</span>
                  </label>
                  <CodeEditor
                    textareaId="flow-yaml-editor"
                    language="yaml"
                    value={flowYaml}
                    onValueChange={setFlowYaml}
                    enableLint
                    enableFormat
                    onSave={() => void handleSaveFlow()}
                    className="min-h-[280px]"
                  />
                  <div className="flex items-center gap-2">
                    <Button onClick={handleSaveFlow} disabled={savingFlow} size="sm">
                      {savingFlow ? "Saving..." : "Save flow"}
                    </Button>
                    <p className="text-xs text-muted-foreground">
                      Edits update the YAML file on disk and feed the next run.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
