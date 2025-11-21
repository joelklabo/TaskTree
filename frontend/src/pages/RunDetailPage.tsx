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
                <ScrollArea className="max-h-[420px]">
                  <div className="divide-y">
                    {records.map((rec, idx) => (
                      <pre
                        key={idx}
                        className="whitespace-pre-wrap px-4 py-3 text-sm text-foreground"
                      >
                        {JSON.stringify(rec, null, 2)}
                      </pre>
                    ))}
                  </div>
                </ScrollArea>
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
                  {artifacts.map((a) => (
                    <li key={a.path} className="flex items-center justify-between px-4 py-2">
                      <div className="space-y-0.5">
                        <a
                          className="font-medium text-primary hover:underline"
                          href={artifactUrl(a.path)}
                        >
                          {a.path}
                        </a>
                        <p className="text-xs text-muted-foreground">
                          {a.size.toLocaleString()} bytes
                        </p>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
