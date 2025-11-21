import React from "react";
import { fetchTraces, TraceMeta } from "../api/client";
import { Alert, AlertDescription, AlertTitle } from "../components/ui/alert";
import { Badge } from "../components/ui/badge";
import { Button } from "../components/ui/button";
import { Skeleton } from "../components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../components/ui/table";

type Props = {
  onSelectRun: (runId: string) => void;
  initialRuns?: TraceMeta[] | null;
};

export default function TracesPage({ onSelectRun, initialRuns }: Props) {
  const [runs, setRuns] = React.useState<TraceMeta[]>(initialRuns ?? []);
  const [loading, setLoading] = React.useState(!initialRuns);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (initialRuns) return;
    setLoading(true);
    fetchTraces()
      .then((data) => setRuns(data))
      .catch((err: unknown) => setError(err instanceof Error ? err.message : JSON.stringify(err)))
      .finally(() => setLoading(false));
  }, [initialRuns]);

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold tracking-tight">Traces</h2>
        <p className="text-sm text-muted-foreground">
          Inspect captured trace runs, commands, and start times.
        </p>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertTitle>Unable to load traces</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {loading ? (
        <div className="space-y-3">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
        </div>
      ) : runs.length === 0 ? (
        <Alert>
          <AlertTitle>No trace runs yet</AlertTitle>
          <AlertDescription>
            Run a flow with tracing enabled to record trace events and artifacts.
          </AlertDescription>
        </Alert>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Run ID</TableHead>
              <TableHead>Command</TableHead>
              <TableHead className="w-32">Started</TableHead>
              <TableHead className="w-32 text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {runs.map((r, idx) => (
              <TableRow key={(r.run_id || "run") + idx}>
                <TableCell className="font-medium">
                  {r.run_id ? (
                    <Button
                      variant="link"
                      className="h-auto px-0 font-mono text-xs"
                      disabled={!r.run_id}
                      onClick={() => r.run_id && onSelectRun(r.run_id)}
                    >
                      {r.run_id}
                    </Button>
                  ) : (
                    <Badge variant="outline">unknown</Badge>
                  )}
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {r.cmd ? r.cmd.join(" ") : "—"}
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {r.start_time || "—"}
                </TableCell>
                <TableCell className="text-right">
                  <Button
                    size="sm"
                    variant="secondary"
                    disabled={!r.run_id}
                    onClick={() => r.run_id && onSelectRun(r.run_id)}
                  >
                    View trace
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
}
