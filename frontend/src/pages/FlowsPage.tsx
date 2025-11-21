import React from "react";
import FlowGraph from "../components/FlowGraph";
import {
  fetchFlows,
  fetchFlow,
  runFlow,
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

type Props = {
  onRunSelected: (ref: { sessionId: string; traceId?: string }) => void;
  initialFlows?: FlowSummary[] | null;
};

export default function FlowsPage({ onRunSelected, initialFlows }: Props) {
  const [flows, setFlows] = React.useState<FlowSummary[]>(initialFlows ?? []);
  const [loading, setLoading] = React.useState(!initialFlows);
  const [error, setError] = React.useState<string | null>(null);
  const [selectedFlowId, setSelectedFlowId] = React.useState<string | null>(null);
  const [flowDetail, setFlowDetail] = React.useState<FlowDetail | null>(null);
  const [detailLoading, setDetailLoading] = React.useState(false);
  const [detailError, setDetailError] = React.useState<string | null>(null);
  const { toast } = useToast();

  React.useEffect(() => {
    if (initialFlows) return;
    fetchFlows()
      .then((data) => {
        setFlows(data);
      })
      .catch((err) => setError(err instanceof Error ? err.message : JSON.stringify(err)))
      .finally(() => setLoading(false));
  }, [initialFlows]);

  React.useEffect(() => {
    if (!selectedFlowId) {
      setFlowDetail(null);
      return;
    }
    setDetailLoading(true);
    setDetailError(null);
    fetchFlow(selectedFlowId)
      .then((data) => setFlowDetail(data))
      .catch((err: unknown) =>
        setDetailError(err instanceof Error ? err.message : JSON.stringify(err)),
      )
      .finally(() => setDetailLoading(false));
  }, [selectedFlowId]);

  const handleRun = async (flowId: string, trace?: boolean) => {
    setLoading(true);
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
      setLoading(false);
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="text-lg font-semibold tracking-tight">Flows</h2>
          <p className="text-sm text-muted-foreground">
            Launch flows with or without tracing and inspect their structure.
          </p>
        </div>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertTitle>Unable to load flows</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {loading ? (
        <div className="space-y-3">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
        </div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>ID</TableHead>
              <TableHead>Description</TableHead>
              <TableHead className="w-48 text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {flows.map((flow) => (
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
                <TableCell className="text-muted-foreground">
                  {flow.description || "No description provided"}
                </TableCell>
                <TableCell className="space-x-2 text-right">
                  <Button onClick={() => handleRun(flow.id)} size="sm" disabled={loading}>
                    Run
                  </Button>
                  <Button
                    variant="secondary"
                    onClick={() => handleRun(flow.id, true)}
                    size="sm"
                    disabled={loading}
                  >
                    Run with trace
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

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
              <>
                <p className="text-sm text-muted-foreground">Start: {flowDetail.start}</p>
                <div className="rounded-md border bg-white">
                  <FlowGraph flow={flowDetail} />
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
