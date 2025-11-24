import { LogViewer } from "@/components/LogViewer";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/components/ui/use-toast";
import { listAgents, listPrompts, getPrompt, fetchPromptSkeletonByTemplate } from "@/api/client";
import axios from "axios";
import { CodeEditor } from "@/components/CodeEditor";

export function StepWorkbenchPage() {
  const [agents, setAgents] = useState<string[]>([]);
  const [prompts, setPrompts] = useState<string[]>([]);
  const [selectedAgent, setSelectedAgent] = useState<string>("codex_cli.yaml");
  const [selectedAction, setSelectedAction] = useState<string>("");
  const [inputJson, setInputJson] = useState<string>("{\n  \n}");
  const [skeletonJson, setSkeletonJson] = useState<string>("");
  const [skeletonError, setSkeletonError] = useState<string>("");
  const [skeletonLoading, setSkeletonLoading] = useState(false);
  const [promptContent, setPromptContent] = useState<string>("");
  const [output, setOutput] = useState<Record<string, unknown> | null>(null);
  const [useRealLLM, setUseRealLLM] = useState(false);
  const [sessionId, setSessionId] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const [agentList, promptList] = await Promise.all([listAgents(), listPrompts()]);
        if (!cancelled) {
          setAgents(agentList);
          setPrompts(promptList);
        }
      } catch (err) {
        if (!cancelled) {
          toast({
            title: "Error loading options",
            description: String(err),
            variant: "destructive",
          });
        }
      }
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, [toast]);

  const handleActionChange = async (actionFile: string) => {
    setSelectedAction(actionFile);
    try {
      const data = await getPrompt(actionFile);
      setPromptContent(data.content);
    } catch (err) {
      toast({ title: "Error loading prompt", description: String(err), variant: "destructive" });
    }
  };

  const fetchSkeleton = async () => {
    if (!selectedAction) {
      setSkeletonError("Select a prompt template first.");
      return;
    }
    setSkeletonError("");
    setSkeletonLoading(true);
    try {
      const res = await fetchPromptSkeletonByTemplate(selectedAction);
      setSkeletonJson(JSON.stringify(res.skeleton, null, 2));
    } catch (err) {
      setSkeletonError(
        err instanceof Error ? err.message : "Unable to fetch skeleton for this template",
      );
    } finally {
      setSkeletonLoading(false);
    }
  };

  const runStep = async () => {
    const newSessionId = `wb-${Date.now()}`;
    setSessionId(newSessionId);
    setLoading(true);
    setOutput(null);
    try {
      const agentId = selectedAgent.replace(".yaml", "");
      const actionName = "custom_action";
      const configOverride: Record<string, unknown> = {
        prompt_map: { [actionName]: selectedAction },
      };

      if (useRealLLM) {
        configOverride.llm_enabled = true;
      }

      const res = await axios.post("/api/workbench/step", {
        agent_id: agentId,
        action: actionName,
        input: JSON.parse(inputJson),
        prompt_override: promptContent,
        agent_config_override: configOverride,
        session_id: newSessionId,
      });
      const body = res.data || {};
      if (!body || Object.keys(body).length === 0) {
        setOutput({ message: "No output captured yet" });
      } else {
        setOutput(body);
      }
    } catch (err) {
      toast({ title: "Error running step", description: String(err), variant: "destructive" });
      setOutput({ error: String(err) || "No output captured yet" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto p-6 h-[calc(100vh-4rem)]">
      <Card className="h-full flex flex-col">
        <CardHeader>
          <CardTitle>Step Workbench</CardTitle>
        </CardHeader>
        <CardContent className="flex-1 grid gap-4 lg:grid-cols-[20rem,1fr] overflow-hidden">
          {/* Left Column: Configuration */}
          <div className="flex flex-col gap-4 overflow-y-auto pr-2">
            <div>
              <label className="text-sm font-medium">Agent</label>
              <select
                className="w-full border rounded p-2 text-sm bg-background"
                value={selectedAgent}
                onChange={(e) => setSelectedAgent(e.target.value)}
              >
                {agents.map((a) => (
                  <option key={a} value={a}>
                    {a}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-sm font-medium">Prompt Template</label>
              <select
                className="w-full border rounded p-2 text-sm bg-background"
                value={selectedAction}
                onChange={(e) => handleActionChange(e.target.value)}
              >
                <option value="">Select a prompt...</option>
                {prompts.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex-1 flex flex-col">
              <label className="text-sm font-medium mb-2">Input Context (JSON)</label>
              <CodeEditor
                value={inputJson}
                onValueChange={setInputJson}
                language="json"
                className="flex-1"
                placeholder="{}"
                enableLint
              />
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium">Input skeleton (from prompt)</label>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={fetchSkeleton}
                  disabled={skeletonLoading}
                >
                  {skeletonLoading ? "Loading..." : "Fetch skeleton"}
                </Button>
              </div>
              {skeletonError && <p className="text-xs text-destructive">{skeletonError}</p>}
              <pre className="max-h-48 overflow-auto rounded-md border bg-muted/30 p-3 text-xs">
                {skeletonJson || "No skeleton loaded yet."}
              </pre>
            </div>

            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="wb-real-llm"
                className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                checked={useRealLLM}
                onChange={(e) => setUseRealLLM(e.target.checked)}
              />
              <label
                htmlFor="wb-real-llm"
                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
              >
                Use Real LLM
              </label>
            </div>

            <Button onClick={runStep} disabled={loading || !selectedAction}>
              {loading ? "Running..." : "Run Step"}
            </Button>
          </div>

          {/* Right Column: Prompt + Output + Logs stacked */}
          <div className="flex flex-col gap-4 overflow-hidden min-w-0">
            <div className="flex flex-col gap-2 min-h-0">
              <label className="text-sm font-medium">Prompt Editor (Override)</label>
              <CodeEditor
                value={promptContent}
                onValueChange={setPromptContent}
                language="yaml"
                className="min-h-[180px]"
                enableFormat
              />
            </div>
            <div className="grid gap-3 lg:grid-cols-2 min-h-[240px]">
              <div className="flex flex-col gap-2 min-h-0">
                <label className="text-sm font-medium">Output</label>
                <CodeEditor
                  value={output ? JSON.stringify(output, null, 2) : "No output yet"}
                  onValueChange={() => {}}
                  language="json"
                  readOnly
                  className="flex-1"
                  enableLint
                />
              </div>
              <div className="flex flex-col gap-2 min-h-0">
                <label className="text-sm font-medium">Logs (LLM Transcript)</label>
                {sessionId ? (
                  <LogViewer
                    sources={["llm-transcript.log"]}
                    contains={sessionId.slice(0, 8)}
                    className="flex-1 border rounded"
                    initialLines={0}
                  />
                ) : (
                  <div className="flex-1 border rounded p-4 text-xs text-muted-foreground bg-muted">
                    Run a step to see logs
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
