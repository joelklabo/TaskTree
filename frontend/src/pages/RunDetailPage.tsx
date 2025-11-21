import React from "react";
import axios from "axios";
import { fetchArtifacts, fetchTrace, ArtifactInfo } from "../api/client";
import { Alert, AlertDescription, AlertTitle } from "../components/ui/alert";
import { Badge } from "../components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Skeleton } from "../components/ui/skeleton";
import { Separator } from "../components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs";
import { ScrollArea } from "../components/ui/scroll-area";

type TraceRecord = Record<string, unknown>;

type Props = {
  runRef: {
    sessionId: string;
    traceId?: string;
  };
};

export default function RunDetailPage({ runRef }: Props) {
  const [records, setRecords] = React.useState<unknown[]>([]);
  const [error, setError] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(false);
  const [artifacts, setArtifacts] = React.useState<ArtifactInfo[]>([]);
  const [artifactsError, setArtifactsError] = React.useState<string | null>(null);
  const [artifactsLoading, setArtifactsLoading] = React.useState(false);
  const [traceMissing, setTraceMissing] = React.useState(false);
  const [artifactsMissing, setArtifactsMissing] = React.useState(false);
  const [expandedRaw, setExpandedRaw] = React.useState<Record<string, boolean>>({});
  const [sessionRawOpen, setSessionRawOpen] = React.useState(false);

  React.useEffect(() => {
    if (!runRef.traceId) {
      setTraceMissing(true);
      setError(null);
      setRecords([]);
      return;
    }
    setLoading(true);
    fetchTrace(runRef.traceId)
      .then(setRecords)
      .catch((err) => {
        if (axios.isAxiosError(err) && err.response?.status === 404) {
          setTraceMissing(true);
          setError(null);
        } else {
          setError(String(err));
        }
      })
      .finally(() => setLoading(false));
  }, [runRef.traceId]);

  React.useEffect(() => {
    if (!runRef.traceId) {
      setArtifactsMissing(true);
      setArtifactsError(null);
      setArtifacts([]);
      return;
    }
    setArtifactsLoading(true);
    fetchArtifacts(runRef.traceId)
      .then(setArtifacts)
      .catch((err) => {
        if (axios.isAxiosError(err) && err.response?.status === 404) {
          setArtifactsMissing(true);
          setArtifactsError("No artifacts for this run.");
        } else {
          setArtifactsError(String(err));
        }
      })
      .finally(() => setArtifactsLoading(false));
  }, [runRef.traceId]);

  const displayId = runRef.traceId || runRef.sessionId;
  const artifactUrl = (relPath: string) =>
    `/api/trace/runs/${displayId}/artifacts/${relPath.split("/").map(encodeURIComponent).join("/")}`;
  const stepRecords = records.filter((rec) => (rec as TraceRecord).step) as TraceRecord[];
  const sessionRecords = records.filter((rec) => !(rec as TraceRecord).step) as TraceRecord[];
  const sessionSummary = (sessionRecords[0]?.session as TraceRecord) || {};
  const timelineSteps = stepRecords.map((rec, idx) => {
    const step = (rec.step as Record<string, unknown>) || {};
    return {
      key: `${(step.step_name as string) || "step"}-${idx}`,
      stepName: (step.step_name as string) || "unknown",
      agent: (step.agent_name as string) || "unknown",
      status: (step.status as string) || "unknown",
      label: (step.label as string | null | undefined) || null,
      raw: rec,
    };
  });

  const sessionStart = (sessionSummary.start_time as string) || null;
  const sessionEnd = (sessionSummary.end_time as string) || null;

  const formatBytes = (n: number) => {
    if (n < 1024) return `${n} bytes`;
    const kb = n / 1024;
    if (kb < 1024) return `${kb.toFixed(1)} KB`;
    return `${(kb / 1024).toFixed(1)} MB`;
  };

  const toggleRaw = (key: string) => setExpandedRaw((prev) => ({ ...prev, [key]: !prev[key] }));

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <div>
          <h2 className="text-lg font-semibold tracking-tight">Run {displayId}</h2>
          <p className="text-sm text-muted-foreground">
            Trace records and captured artifacts for this session.
          </p>
        </div>
        <Badge variant="outline" className="font-mono text-xs">
          {displayId}
        </Badge>
      </div>

      {error && !traceMissing && (
        <Alert variant="destructive">
          <AlertTitle>Failed to load trace</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {traceMissing && (
        <Alert>
          <AlertTitle>Tracing disabled</AlertTitle>
          <AlertDescription>This run was not captured with tracing.</AlertDescription>
        </Alert>
      )}

      {traceMissing && (
        <Alert>
          <AlertTitle>No trace available</AlertTitle>
          <AlertDescription>
            Run flows with tracing to capture records:
            <code className="ml-1 rounded bg-muted px-2 py-0.5 text-xs">
              uv run -m tasktree.agents.trace.record uv run tt run code_fix --input {"{...}"}
            </code>
          </AlertDescription>
        </Alert>
      )}

      <Tabs defaultValue="trace" className="w-full">
        <TabsList className="mb-3">
          <TabsTrigger value="trace">Trace records</TabsTrigger>
          <TabsTrigger value="artifacts">Artifacts</TabsTrigger>
        </TabsList>

        <TabsContent value="trace" className="border-none p-0">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Trace events</CardTitle>
            </CardHeader>
            <Separator />
            <CardContent className="p-0">
              {loading ? (
                <div className="space-y-2 p-4">
                  <Skeleton className="h-5 w-full" />
                  <Skeleton className="h-5 w-full" />
                  <Skeleton className="h-5 w-3/4" />
                </div>
              ) : records.length === 0 ? (
                <div className="p-4 text-sm text-muted-foreground">No trace records found.</div>
              ) : (
                <div className="space-y-3 p-3">
                  {sessionRecords.length > 0 && (
                    <div className="space-y-1 rounded-md border bg-slate-50 p-3">
                      <div className="text-sm font-semibold text-slate-700">Session summary</div>
                      <div className="grid gap-1 text-xs text-slate-700 sm:grid-cols-2">
                        <div>
                          <span className="font-semibold">Flow:</span>{" "}
                          {(sessionSummary.flow_name as string) || "unknown"}
                        </div>
                        <div>
                          <span className="font-semibold">Version:</span>{" "}
                          {(sessionSummary.flow_version as string) || "?"}
                        </div>
                        <div>
                          <span className="font-semibold">Run ID:</span>{" "}
                          {(sessionRecords[0]?.run_id as string) || displayId}
                        </div>
                      </div>
                      <div className="mt-2 flex flex-wrap gap-2 text-[11px] text-slate-600">
                        <Badge variant="outline" className="font-mono">
                          Start: {sessionStart || "—"}
                        </Badge>
                        <Badge variant="outline" className="font-mono">
                          End: {sessionEnd || "—"}
                        </Badge>
                      </div>
                    </div>
                  )}
                  {timelineSteps.length > 0 && (
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <div className="text-sm font-semibold text-slate-700">Trace timeline</div>
                        <Badge variant="outline">{timelineSteps.length} steps</Badge>
                      </div>
                      <div className="space-y-3">
                        {timelineSteps.map((step) => (
                          <div
                            key={step.key}
                            data-testid={`timeline-step-${step.stepName}`}
                            className="flex flex-col gap-3 rounded-md border bg-white p-3 shadow-sm md:flex-row md:items-start md:justify-between"
                          >
                            <div className="space-y-1">
                              <div className="text-xs uppercase text-slate-500">Step</div>
                              <div className="flex flex-wrap items-center gap-2">
                                <div className="font-medium text-slate-900">{step.stepName}</div>
                                <Badge variant="secondary" className="text-[11px] font-semibold">
                                  {step.agent}
                                </Badge>
                                <Badge
                                  variant={step.status === "success" ? "default" : "secondary"}
                                  className="text-[11px] font-semibold capitalize"
                                >
                                  {step.status}
                                </Badge>
                                {step.label ? (
                                  <Badge variant="outline" className="text-[11px] font-semibold">
                                    {step.label}
                                  </Badge>
                                ) : null}
                              </div>
                            </div>
                            <div className="md:w-1/2 space-y-2">
                              <button
                                type="button"
                                className="text-xs text-primary underline"
                                onClick={() => toggleRaw(step.key)}
                              >
                                {expandedRaw[step.key] ? "Hide raw" : "Show raw"}
                              </button>
                              {expandedRaw[step.key] ? (
                                <pre className="rounded bg-slate-50 p-2 text-xs text-slate-800">
                                  {JSON.stringify(step.raw, null, 2)}
                                </pre>
                              ) : null}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  {sessionRecords.length > 0 && (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="text-sm font-semibold text-slate-700">Session raw</div>
                        <button
                          type="button"
                          className="text-xs text-primary underline"
                          onClick={() => setSessionRawOpen((prev) => !prev)}
                        >
                          {sessionRawOpen ? "Hide session raw" : "Show session raw"}
                        </button>
                      </div>
                      {sessionRawOpen ? (
                        <ScrollArea className="max-h-[240px] rounded border">
                          <div className="divide-y">
                            {sessionRecords.map((rec, idx) => (
                              <pre
                                key={idx}
                                className="whitespace-pre-wrap px-4 py-3 text-sm text-foreground"
                              >
                                {JSON.stringify(rec, null, 2)}
                              </pre>
                            ))}
                          </div>
                        </ScrollArea>
                      ) : (
                        <p className="text-xs text-muted-foreground">
                          Expand to inspect raw session JSON.
                        </p>
                      )}
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="artifacts" className="border-none p-0">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Artifacts</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {artifactsLoading ? (
                <Skeleton className="h-16 w-full" />
              ) : artifactsError ? (
                <Alert variant="destructive">
                  <AlertTitle>Unable to load artifacts</AlertTitle>
                  <AlertDescription>{artifactsError}</AlertDescription>
                </Alert>
              ) : artifactsMissing ? (
                <Alert>
                  <AlertTitle>No artifacts captured</AlertTitle>
                  <AlertDescription>
                    Use the trace wrapper to collect artifacts during runs.
                  </AlertDescription>
                </Alert>
              ) : artifacts.length === 0 ? (
                <p className="text-sm text-muted-foreground">No artifacts for this run.</p>
              ) : (
                <ul className="divide-y rounded-md border">
                  {artifacts.map((a) => {
                    const ext = (a.path.split(".").pop() || "file").toUpperCase();
                    return (
                      <li
                        key={a.path}
                        className="flex items-center justify-between px-4 py-2 gap-3"
                      >
                        <div className="space-y-0.5 min-w-0">
                          <a
                            className="truncate font-medium text-primary hover:underline"
                            href={artifactUrl(a.path)}
                            download
                          >
                            {a.path}
                          </a>
                          <div className="text-xs text-muted-foreground flex items-center gap-2">
                            <Badge variant="secondary" className="text-[11px] font-semibold">
                              {ext}
                            </Badge>
                            <span>{formatBytes(a.size)}</span>
                          </div>
                        </div>
                        <a
                          className="text-xs text-primary underline"
                          href={artifactUrl(a.path)}
                          download
                        >
                          Download
                        </a>
                      </li>
                    );
                  })}
                </ul>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
