import React, { useEffect, useMemo, useState } from "react";
import { fetchFlows, fetchFlow, fetchPromptSkeleton, type FlowDetail } from "@/api/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CodeEditor } from "@/components/CodeEditor";
import { LogViewer } from "@/components/LogViewer";
import FlowGraph from "@/components/FlowGraph";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

type StepState = {
  id: string;
  agent: string;
  action?: string;
};

export function FlowWorkbenchPage() {
  const [flows, setFlows] = useState<FlowDetail[]>([]);
  const [selectedFlowId, setSelectedFlowId] = useState<string>("");
  const [selectedStepId, setSelectedStepId] = useState<string>("");
  const [flowYaml, setFlowYaml] = useState<string>("");
  const [inputJson, setInputJson] = useState<string>('{\n  "input": {}\n}');
  const [promptOverride, setPromptOverride] = useState<string>("");
  const [skeletonJson, setSkeletonJson] = useState<string>("");
  const [skeletonError, setSkeletonError] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const summaries = await fetchFlows();
        const details = await Promise.all(
          summaries.map(async (s) => {
            try {
              return await fetchFlow(s.id);
            } catch {
              return null;
            }
          }),
        );
        if (cancelled) return;
        const allFlows = details.filter(Boolean) as FlowDetail[];
        setFlows(allFlows);
        if (allFlows.length > 0) {
          setSelectedFlowId(allFlows[0].id);
          setSelectedStepId(allFlows[0].start);
          setFlowYaml((allFlows[0] as FlowDetail & { _raw?: string })._raw || "");
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Unable to load flows");
        }
      }
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  const currentFlow = useMemo(
    () => flows.find((f) => f.id === selectedFlowId) || null,
    [flows, selectedFlowId],
  );
  const currentStep: StepState | null = useMemo(() => {
    if (!currentFlow) return null;
    const step =
      currentFlow.steps.find((s) => s.id === selectedStepId) ||
      currentFlow.steps.find((s) => s.id === currentFlow.start);
    if (!step) return null;
    const actionName = (step as { action?: string }).action;
    return { id: step.id, agent: step.agent, action: actionName };
  }, [currentFlow, selectedStepId]);

  const fetchSkeleton = async () => {
    if (!currentStep?.action) {
      setSkeletonError("No action set for this step.");
      return;
    }
    setSkeletonError("");
    setLoading(true);
    try {
      const res = await fetchPromptSkeleton(currentStep.action, currentStep.agent);
      setSkeletonJson(JSON.stringify(res.skeleton, null, 2));
    } catch (err) {
      setSkeletonError(err instanceof Error ? err.message : "Unable to fetch skeleton");
    } finally {
      setLoading(false);
    }
  };

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertTitle>Unable to load flows</AlertTitle>
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }

  if (!currentFlow) {
    return <Skeleton className="h-64 w-full" />;
  }

  return (
    <div className="container mx-auto p-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-3">
            <span>Flow Workbench</span>
            <Badge variant="outline">{currentFlow.id}</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap items-center gap-3">
            <label className="text-sm font-semibold">Flow</label>
            <select
              className="border rounded p-2 text-sm bg-background"
              aria-label="Workbench Flow"
              value={selectedFlowId}
              onChange={(e) => {
                setSelectedFlowId(e.target.value);
                const f = flows.find((fl) => fl.id === e.target.value);
                if (f) {
                  setSelectedStepId(f.start);
                  setFlowYaml((f as FlowDetail & { _raw?: string })._raw || "");
                }
              }}
            >
              {flows.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.id}
                </option>
              ))}
            </select>
            <label className="text-sm font-semibold">Step</label>
            <select
              className="border rounded p-2 text-sm bg-background"
              aria-label="Workbench Step"
              value={selectedStepId}
              onChange={(e) => setSelectedStepId(e.target.value)}
            >
              {currentFlow.steps.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.id} ({(s as { action?: string }).action || s.agent})
                </option>
              ))}
            </select>
          </div>

          <div className="grid gap-4 lg:grid-cols-[320px,1fr]">
            <div className="space-y-3">
              <div className="rounded-md border bg-white">
                <FlowGraph flow={currentFlow} />
              </div>
              <div className="border rounded p-3 space-y-2">
                <div className="text-sm font-semibold">Run Controls</div>
                <Button size="sm" variant="outline" disabled>
                  Run step (coming soon)
                </Button>
              </div>
            </div>

            <div className="space-y-3">
              <div className="grid gap-3 lg:grid-cols-2">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold">Input Context</span>
                    <Badge variant="outline">{currentStep?.id}</Badge>
                  </div>
                  <CodeEditor
                    data-testid="workbench-input-editor"
                    value={inputJson}
                    onValueChange={setInputJson}
                    language="json"
                    className="min-h-[180px]"
                    enableLint
                  />
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold">Input skeleton (from prompt)</span>
                    <Button size="sm" variant="outline" onClick={fetchSkeleton} disabled={loading}>
                      {loading ? "Loading..." : "Fetch skeleton"}
                    </Button>
                  </div>
                  {skeletonError && <p className="text-xs text-destructive">{skeletonError}</p>}
                  <pre className="min-h-[140px] max-h-48 overflow-auto rounded-md border bg-muted/30 p-3 text-xs">
                    {skeletonJson || "No skeleton loaded yet."}
                  </pre>
                </div>
              </div>

              <div className="grid gap-3 lg:grid-cols-2">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold">Prompt override</span>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setPromptOverride("")}
                      disabled={!promptOverride}
                    >
                      Reset
                    </Button>
                  </div>
                  <CodeEditor
                    data-testid="workbench-prompt-editor"
                    value={promptOverride}
                    onValueChange={setPromptOverride}
                    language="yaml"
                    className="min-h-[160px]"
                    enableFormat
                  />
                </div>
                <div className="space-y-2">
                  <div className="text-sm font-semibold">Output / Logs</div>
                  <Tabs defaultValue="output">
                    <TabsList>
                      <TabsTrigger value="output">Output</TabsTrigger>
                      <TabsTrigger value="logs">Logs</TabsTrigger>
                    </TabsList>
                    <TabsContent value="output">
                      <pre className="min-h-[140px] rounded-md border bg-muted/30 p-3 text-xs">
                        No output yet
                      </pre>
                    </TabsContent>
                    <TabsContent value="logs">
                      <LogViewer
                        sources={["llm-transcript.log"]}
                        contains={currentStep?.id || ""}
                        className="border rounded"
                        initialLines={0}
                      />
                    </TabsContent>
                  </Tabs>
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold">Flow YAML</span>
              <Badge variant="outline">Read-only snapshot</Badge>
            </div>
            <CodeEditor
              value={flowYaml || "No YAML loaded"}
              onValueChange={() => {}}
              readOnly
              language="yaml"
              className="min-h-[200px]"
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
