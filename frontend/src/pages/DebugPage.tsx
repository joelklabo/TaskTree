import { useEffect, useMemo, useState } from "react";
import axios from "axios";
import yaml from "js-yaml";
import { LogViewer } from "@/components/LogViewer";
import { CodeEditor } from "@/components/CodeEditor";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/components/ui/use-toast";
import { getAgent, getFlowFile, getPrompt, listFlowFiles, fetchPromptSkeleton } from "@/api/client";

type DebugState = {
  type: "paused" | "finished";
  phase?: string;
  step?: string;
  context?: Record<string, unknown>;
  result?: unknown;
};

type FlowStep = { id: string; agent: string; action?: string };
type RawStep = { id?: string; name?: string; agent?: string; action?: string };

type SavedContext = {
  id: string;
  label: string;
  flow: string | null;
  step: string | null;
  input: Record<string, unknown>;
  debugState?: DebugState | null;
  logs?: string[];
  agentConfig?: string;
  promptTemplate?: string;
  promptOverride?: string;
  agentProfile?: string | null;
  llmModel?: string | null;
};

const DEFAULT_PROMPT_MAP: Record<string, string> = {
  plan_bugfix: "code_plan.j2",
  implement_fix: "code_impl.j2",
  run_tests: "test_run.j2",
  investigate_error: "error_investigate.j2",
  check_retry_count: "error_retry_check.j2",
  triage_failure: "error_triage.j2",
  analyze_test_spec: "test_spec_analyze.j2",
  plan_test_implementation: "test_plan.j2",
  implement_test_code: "test_implement.j2",
  review_test_code: "test_review.j2",
};

const CONTEXT_STORAGE_KEY = "tasktree.debug.savedContexts";
const SCENARIO_STORAGE_KEY = "tasktree.debug.scenarios";

const buildContextTemplate = (flowId?: string, stepId?: string) =>
  JSON.stringify(
    {
      input: {},
      breakpoints: stepId ? [stepId] : [],
      notes: flowId ? `Context for ${flowId}` : "Add any fields your flow expects",
      errors: [],
    },
    null,
    2,
  );

export function DebugPage() {
  const [flows, setFlows] = useState<string[]>([]);
  const [flowSteps, setFlowSteps] = useState<FlowStep[]>([]);
  const [selectedFlow, setSelectedFlow] = useState<string | null>(null);
  const [selectedStep, setSelectedStep] = useState<string | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [scenarioId, setScenarioId] = useState<string | null>(null);
  const [debugState, setDebugState] = useState<DebugState | null>(null);
  const [useRealLLM, setUseRealLLM] = useState(false);
  const [agentProfile, setAgentProfile] = useState<string>("");
  const [ws, setWs] = useState<WebSocket | null>(null);
  const { toast } = useToast();
  const [logs, setLogs] = useState<string[]>([]);
  const [contextJson, setContextJson] = useState<string>(() => buildContextTemplate());
  const [savedContexts, setSavedContexts] = useState<SavedContext[]>([]);
  const [savedScenarios, setSavedScenarios] = useState<SavedContext[]>([]);
  const [agentContent, setAgentContent] = useState<string>("Select a flow to view agent config");
  const [promptContent, setPromptContent] = useState<string>("Select a step to view prompt");
  const [promptOverride, setPromptOverride] = useState<string>("");
  const [modelOverride, setModelOverride] = useState<string>("");
  const [scenarioName, setScenarioName] = useState<string>("Scenario");
  const [resetContextOnLoad, setResetContextOnLoad] = useState(true);
  const [skeletonJson, setSkeletonJson] = useState<string>("");
  const [skeletonError, setSkeletonError] = useState<string>("");
  const [skeletonLoading, setSkeletonLoading] = useState(false);

  useEffect(() => {
    listFlowFiles()
      .then(setFlows)
      .catch((err) => {
        toast({ title: "Error loading flows", description: String(err), variant: "destructive" });
      });
  }, [toast]);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(CONTEXT_STORAGE_KEY);
      if (stored) {
        setSavedContexts(JSON.parse(stored));
      }
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(CONTEXT_STORAGE_KEY, JSON.stringify(savedContexts));
    } catch {
      // ignore
    }
  }, [savedContexts]);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(SCENARIO_STORAGE_KEY);
      if (stored) {
        setSavedScenarios(JSON.parse(stored));
      }
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(SCENARIO_STORAGE_KEY, JSON.stringify(savedScenarios));
    } catch {
      // ignore
    }
  }, [savedScenarios]);

  const addLog = (msg: string) => setLogs((prev) => [...prev, msg].slice(-200));

  const parseContext = () => {
    try {
      return contextJson.trim() ? JSON.parse(contextJson) : {};
    } catch (err) {
      toast({
        title: "Invalid context JSON",
        description: err instanceof Error ? err.message : "Unable to parse JSON",
        variant: "destructive",
      });
      return null;
    }
  };

  const loadFlowDetails = async (flowName: string, resetContext = true) => {
    try {
      const flowFile = await getFlowFile(flowName);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const doc = yaml.load(flowFile.content) as any;
      const stepsRaw = Array.isArray(doc?.steps) ? doc.steps : Object.values(doc?.steps || {});
      const typedSteps = stepsRaw as RawStep[];
      const parsedSteps: FlowStep[] = typedSteps
        .map((s) => ({
          id: s.id || s.name,
          agent: s.agent,
          action: s.action,
        }))
        .filter((s) => s.id && s.agent);
      setFlowSteps(parsedSteps);
      const initialStep = parsedSteps[0]?.id || null;
      setSelectedStep((prev) => prev || initialStep);
      if (resetContext) {
        setContextJson(
          buildContextTemplate(doc?.id || flowName.replace(".yaml", ""), initialStep || undefined),
        );
      }
    } catch (err) {
      toast({ title: "Unable to load flow", description: String(err), variant: "destructive" });
      setFlowSteps([]);
      setSelectedStep(null);
    }
  };

  useEffect(() => {
    if (selectedFlow) {
      loadFlowDetails(selectedFlow, resetContextOnLoad);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedFlow, resetContextOnLoad]);

  const resolvePromptName = (agentYaml: string, action?: string) => {
    if (!action) return null;
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const agentDoc = yaml.load(agentYaml) as any;
      const map = agentDoc?.prompt_map as Record<string, string> | undefined;
      if (map && map[action]) return map[action];
    } catch {
      // ignore and fall back
    }
    return DEFAULT_PROMPT_MAP[action] || null;
  };

  useEffect(() => {
    const stepMeta = flowSteps.find((s) => s.id === selectedStep);
    if (!stepMeta) return;
    const agentFile = `${stepMeta.agent}.yaml`;

    getAgent(agentFile)
      .then((res) => {
        setAgentContent(res.content);
        const promptName = resolvePromptName(res.content, stepMeta.action);
        if (promptName) {
          return getPrompt(promptName)
            .then((p) => setPromptContent(p.content))
            .catch(() => setPromptContent("Prompt template not found"));
        }
        setPromptContent("No prompt mapping for this action");
        return null;
      })
      .catch((err) => {
        setAgentContent(`Unable to load agent config: ${String(err)}`);
        setPromptContent("Prompt template not found");
      });
  }, [flowSteps, selectedStep]);

  useEffect(() => {
    if (promptContent && !promptOverride.trim()) {
      setPromptOverride(promptContent);
    }
  }, [promptContent, promptOverride]);

  const fetchSkeleton = async () => {
    const step = currentStep;
    if (!step?.action) {
      setSkeletonError("Selected step has no action; cannot fetch skeleton.");
      return;
    }
    setSkeletonError("");
    setSkeletonLoading(true);
    try {
      const res = await fetchPromptSkeleton(step.action, step.agent);
      setSkeletonJson(JSON.stringify(res.skeleton, null, 2));
    } catch (err) {
      setSkeletonError(
        err instanceof Error ? err.message : "Unable to fetch prompt skeleton for this step",
      );
    } finally {
      setSkeletonLoading(false);
    }
  };

  const startSession = async () => {
    if (!selectedFlow) return;
    const parsed = parseContext();
    if (!parsed) return;
    try {
      const flowId = selectedFlow.replace(".yaml", "");
      const newScenarioId = `scn-${Date.now().toString(36)}`;
      setScenarioId(newScenarioId);
      const promptOverrides =
        promptOverride.trim() && currentStep?.action
          ? { [currentStep.action]: promptOverride }
          : undefined;
      const agentProfileToUse =
        agentProfile ||
        (useRealLLM || typeof parsed.agent_profile === "string"
          ? useRealLLM
            ? "codex_cli_codex"
            : parsed.agent_profile
          : undefined);
      const llmModel =
        modelOverride || (typeof parsed.llm_model === "string" ? parsed.llm_model : undefined);

      const res = await axios.post("/api/debug/sessions", {
        flow_id: flowId,
        input: parsed.input ?? parsed,
        breakpoints: Array.isArray(parsed.breakpoints) ? parsed.breakpoints : [],
        agent_profile: agentProfileToUse,
        llm_model: llmModel,
        scenario_id: newScenarioId,
        prompt_overrides: promptOverrides,
      });
      setSessionId(res.data.session_id);
      addLog(`Session started: ${res.data.session_id} (scenario ${newScenarioId})`);
      connectWs(res.data.session_id);
    } catch (err) {
      toast({ title: "Error starting session", description: String(err), variant: "destructive" });
    }
  };

  const connectWs = (sid: string) => {
    if (ws) {
      ws.close();
    }
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const url = `${protocol}//${window.location.host}/api/debug/sessions/${sid}/ws`;
    const socket = new WebSocket(url);

    socket.onopen = () => addLog("WebSocket connected");
    socket.onerror = () => addLog("WebSocket error");
    socket.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.type === "paused") {
        setDebugState(data);
        if (data.scenario_id) setScenarioId(data.scenario_id);
        addLog(`Paused at ${data.phase} ${data.step}`);
      } else if (data.type === "finished") {
        setDebugState(data);
        if (data.scenario_id) setScenarioId(data.scenario_id);
        addLog("Flow finished");
      }
    };
    socket.onclose = () => addLog("WebSocket closed");
    setWs(socket);
  };

  const sendCommand = (cmd: string, payload: Record<string, unknown> = {}) => {
    if (ws) {
      ws.send(JSON.stringify({ command: cmd, ...payload }));
    }
  };

  const captureContext = () => {
    const parsed = parseContext();
    if (!parsed) return;
    const snapshot: SavedContext = {
      id: `ctx-${Date.now()}`,
      label: `Saved context for ${selectedFlow || "flow"}`,
      flow: selectedFlow,
      step: selectedStep,
      input: parsed.input ?? parsed,
      debugState,
      logs: logs.slice(-50),
      agentConfig: agentContent,
      promptTemplate: promptContent,
    };
    setSavedContexts((prev) => [snapshot, ...prev].slice(0, 10));
    toast({ title: "Context captured", description: "Saved for quick reuse" });
  };

  const saveScenario = () => {
    const parsed = parseContext();
    if (!parsed) return;
    const scenario: SavedContext = {
      id: `scn-${Date.now().toString(36)}`,
      label: scenarioName || "Scenario",
      flow: selectedFlow,
      step: selectedStep,
      input: parsed.input ?? parsed,
      promptOverride,
      agentProfile: agentProfile || (useRealLLM ? "codex_cli_codex" : null),
      llmModel: modelOverride || (typeof parsed.llm_model === "string" ? parsed.llm_model : null),
    };
    setSavedScenarios((prev) => [scenario, ...prev].slice(0, 10));
    toast({ title: "Scenario saved", description: scenario.label });
  };

  const loadSavedContext = (ctx: SavedContext) => {
    setResetContextOnLoad(false);
    setSelectedFlow(ctx.flow);
    if (ctx.step) setSelectedStep(ctx.step);
    if (ctx.promptOverride) setPromptOverride(ctx.promptOverride);
    if (ctx.agentProfile) setAgentProfile(ctx.agentProfile);
    if (ctx.llmModel) setModelOverride(ctx.llmModel);
    setScenarioName(ctx.label || "Scenario");
    const payload = {
      input: ctx.input || {},
      breakpoints: ctx.debugState?.step ? [ctx.debugState.step] : [],
      notes: ctx.debugState?.type === "paused" ? `Paused at ${ctx.debugState.step}` : undefined,
    };
    setContextJson(JSON.stringify(payload, null, 2));
    toast({ title: "Context loaded", description: ctx.label });
  };

  const loadScenario = (scenario: SavedContext) => {
    loadSavedContext(scenario);
    setScenarioName(scenario.label || "Scenario");
    setScenarioId(null);
  };

  const deleteScenario = (id: string) =>
    setSavedScenarios((prev) => prev.filter((s) => s.id !== id));

  const currentStep = useMemo(
    () => flowSteps.find((s) => s.id === selectedStep),
    [flowSteps, selectedStep],
  );

  return (
    <div className="container mx-auto p-6 h-[calc(100vh-4rem)]">
      <Card className="h-full flex flex-col">
        <CardHeader className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <CardTitle>Live Debugger</CardTitle>
          <div className="flex items-center gap-3 text-sm text-muted-foreground">
            <span className="rounded-full bg-slate-100 px-3 py-1">
              {sessionId ? `Session ${sessionId.slice(0, 8)}` : "No session"}
            </span>
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                // trigger unhandled rejection to exercise client error logging
                Promise.reject(new Error("ClientErrorDemo"));
              }}
            >
              Trigger client error
            </Button>
          </div>
        </CardHeader>
        <CardContent className="flex-1 grid gap-4 md:grid-cols-[18rem,1fr] overflow-hidden">
          {/* Sidebar */}
          <div className="flex flex-col gap-4 border-r pr-4">
            <div>
              <h3 className="font-semibold mb-2 text-sm">Select Flow</h3>
              <select
                aria-label="Debug Flow"
                className="w-full border rounded p-2 text-sm bg-background"
                onChange={(e) => {
                  setResetContextOnLoad(true);
                  setSelectedFlow(e.target.value);
                }}
                value={selectedFlow || ""}
                disabled={flows.length === 0}
              >
                <option value="">{flows.length === 0 ? "No flows found" : "Select..."}</option>
                {flows.map((f) => (
                  <option key={f} value={f}>
                    {f}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <h3 className="font-semibold mb-2 text-sm">Step</h3>
              <select
                aria-label="Debug Step"
                className="w-full border rounded p-2 text-sm bg-background"
                value={selectedStep || ""}
                onChange={(e) => setSelectedStep(e.target.value)}
                disabled={flowSteps.length === 0}
              >
                {flowSteps.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.id} ({s.action || "action"})
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="real-llm"
                className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                checked={useRealLLM}
                onChange={(e) => setUseRealLLM(e.target.checked)}
              />
              <label
                htmlFor="real-llm"
                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
              >
                Use Real LLM (Codex)
              </label>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium" htmlFor="scenario-name">
                Scenario name
              </label>
              <input
                id="scenario-name"
                className="w-full border rounded p-2 text-sm bg-background"
                value={scenarioName}
                onChange={(e) => setScenarioName(e.target.value)}
                placeholder="Scenario label"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium" htmlFor="agent-profile">
                Agent profile (optional)
              </label>
              <input
                id="agent-profile"
                className="w-full border rounded p-2 text-sm bg-background"
                value={agentProfile}
                onChange={(e) => setAgentProfile(e.target.value)}
                placeholder="e.g., codex_cli_codex"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium" htmlFor="model-override">
                Model override (optional)
              </label>
              <input
                id="model-override"
                className="w-full border rounded p-2 text-sm bg-background"
                value={modelOverride}
                onChange={(e) => setModelOverride(e.target.value)}
                placeholder="e.g., gpt-4.1"
              />
            </div>

            <div className="flex gap-2">
              <Button onClick={startSession} disabled={!selectedFlow} className="flex-1">
                Start Debugging
              </Button>
              <Button onClick={saveScenario} variant="outline">
                Save
              </Button>
            </div>

            {sessionId && (
              <div className="flex flex-col gap-2">
                <Button onClick={() => sendCommand("step")} variant="outline" size="sm">
                  Step Over
                </Button>
                <Button onClick={() => sendCommand("resume")} variant="outline" size="sm">
                  Resume
                </Button>
                <Button
                  onClick={() => {
                    sendCommand("stop");
                    ws?.close();
                  }}
                  variant="destructive"
                  size="sm"
                >
                  Stop
                </Button>
              </div>
            )}
          </div>

          {/* Context + Saved */}
          <div className="flex flex-col gap-3 overflow-hidden min-w-0" data-testid="debug-context">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold">Input Context</h3>
              <Button size="sm" variant="outline" onClick={captureContext}>
                Capture Context
              </Button>
            </div>
            <CodeEditor
              data-testid="context-editor"
              value={contextJson}
              onValueChange={setContextJson}
              language="json"
              enableLint
              className="flex-1"
            />
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="text-sm font-semibold">Input skeleton (from prompt)</div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={fetchSkeleton}
                  disabled={skeletonLoading}
                  data-testid="fetch-skeleton-btn"
                >
                  {skeletonLoading ? "Loading..." : "Fetch skeleton"}
                </Button>
              </div>
              {skeletonError && (
                <p className="text-xs text-destructive" data-testid="skeleton-error">
                  {skeletonError}
                </p>
              )}
              <pre
                data-testid="input-skeleton"
                className="max-h-48 overflow-auto rounded-md border bg-muted/30 p-3 text-xs"
              >
                {skeletonJson || "No skeleton loaded yet."}
              </pre>
            </div>
            <div data-testid="saved-contexts" className="space-y-2">
              <div className="text-sm font-semibold">Saved Contexts</div>
              {savedContexts.length === 0 && (
                <p className="text-xs text-muted-foreground">No saved contexts yet.</p>
              )}
              {savedContexts.map((ctx) => (
                <div
                  key={ctx.id}
                  className="flex items-center justify-between rounded-md border bg-muted/40 px-3 py-2"
                >
                  <div>
                    <div className="text-sm font-medium">{ctx.label}</div>
                    <div className="text-xs text-muted-foreground">
                      {ctx.flow || "Any flow"} · {ctx.step || "step"}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" onClick={() => loadSavedContext(ctx)}>
                      Load
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => navigator.clipboard.writeText(JSON.stringify(ctx, null, 2))}
                    >
                      Copy
                    </Button>
                  </div>
                </div>
              ))}
            </div>
            <div className="space-y-2">
              <div className="text-sm font-semibold">Saved Scenarios</div>
              {savedScenarios.length === 0 && (
                <p className="text-xs text-muted-foreground">No scenarios saved.</p>
              )}
              {savedScenarios.map((scn) => (
                <div
                  key={scn.id}
                  className="flex items-center justify-between rounded-md border bg-muted/40 px-3 py-2"
                >
                  <div>
                    <div className="text-sm font-medium">{scn.label}</div>
                    <div className="text-xs text-muted-foreground">
                      {scn.flow || "Any flow"} · {scn.step || "step"}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" onClick={() => loadScenario(scn)}>
                      Load
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => deleteScenario(scn.id)}>
                      Delete
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Main Area */}
          <div className="flex flex-col gap-4 overflow-hidden min-w-0" data-testid="debug-main">
            <div
              className="border rounded p-4 overflow-auto font-mono text-sm min-h-[180px]"
              data-testid="debug-state"
            >
              {debugState ? (
                <pre>{JSON.stringify(debugState, null, 2)}</pre>
              ) : (
                <div className="text-muted-foreground">Waiting for session...</div>
              )}
            </div>

            <div
              className="border rounded overflow-hidden flex flex-col"
              data-testid="agent-prompt"
            >
              <div className="p-2 font-semibold text-xs bg-muted border-b">Agent & Prompt</div>
              <div className="flex-1 grid grid-rows-2 gap-2 p-2">
                <CodeEditor
                  data-testid="agent-viewer"
                  value={agentContent}
                  onValueChange={() => {}}
                  language="yaml"
                  readOnly
                  enableFormat={false}
                  className="h-full"
                />
                <CodeEditor
                  data-testid="prompt-viewer"
                  value={promptContent}
                  onValueChange={() => {}}
                  language="yaml"
                  readOnly
                  enableFormat={false}
                  className="h-full"
                />
              </div>
            </div>

            <div className="border rounded overflow-hidden flex flex-col">
              <div className="p-2 font-semibold text-xs bg-muted border-b flex items-center justify-between">
                <span>Prompt Override (optional)</span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setPromptOverride(promptContent)}
                  disabled={!promptContent}
                >
                  Reset to default
                </Button>
              </div>
              <CodeEditor
                value={promptOverride}
                onValueChange={setPromptOverride}
                language="yaml"
                className="h-40"
                enableFormat
                textareaId="prompt-override"
                ariaLabel="Prompt override"
              />
            </div>

            <div className="grid grid-cols-2 gap-4 h-64">
              <div className="border rounded p-2 overflow-auto text-xs font-mono bg-muted flex flex-col">
                <div className="font-semibold mb-1">Status</div>
                {currentStep && (
                  <div className="mb-2 text-muted-foreground">
                    {currentStep.id} · {currentStep.action}
                  </div>
                )}
                {scenarioId && (
                  <div className="mb-2 text-muted-foreground">Scenario: {scenarioId}</div>
                )}
                {logs.map((l, i) => (
                  <div key={i}>{l}</div>
                ))}
              </div>

              <div className="border rounded overflow-hidden flex flex-col">
                <div className="p-2 font-semibold text-xs bg-muted border-b">Session Logs</div>
                {sessionId ? (
                  <LogViewer
                    sources={["llm-transcript.log", "debug.log"]}
                    contains={(scenarioId || sessionId.slice(0, 8)) ?? ""}
                    className="flex-1 border-none shadow-none"
                    initialLines={0}
                  />
                ) : (
                  <div className="p-4 text-xs text-muted-foreground">
                    Start session to view logs
                  </div>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
