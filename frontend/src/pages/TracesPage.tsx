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
  const [query, setQuery] = React.useState("");
  const [flowFilter, setFlowFilter] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (initialRuns) return;
    setLoading(true);
    fetchTraces()
      .then((data) => setRuns(data))
      .catch((err: unknown) => setError(err instanceof Error ? err.message : JSON.stringify(err)))
      .finally(() => setLoading(false));
  }, [initialRuns]);

  const flowNames = Array.from(
    new Set(
      runs
        .map((r) => r.flow_name)
        .filter((f): f is string => typeof f === "string" && f.length > 0),
    ),
  );

  const filteredRuns = runs.filter((r) => {
    const matchesFlow = !flowFilter || r.flow_name === flowFilter;
    if (!matchesFlow) return false;
    if (!query.trim()) return true;
    const haystack = [
      r.run_id,
      r.flow_name,
      r.label,
      (r.cmd || []).join(" "),
      r.start_time,
      r.end_time,
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();
    return haystack.includes(query.toLowerCase());
  });

  const clearFilters = () => {
    setQuery("");
    setFlowFilter(null);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold tracking-tight">Traces</h2>
          <p className="text-sm text-muted-foreground">
            Inspect captured trace runs, commands, and start times.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <input
            type="search"
            placeholder="Filter runs by flow, label, or command"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="h-9 min-w-[240px] rounded-md border px-3 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            aria-label="Filter runs"
          />
          {query ? (
            <Button variant="ghost" size="sm" onClick={() => setQuery("")}>
              Clear
            </Button>
          ) : null}
        </div>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertTitle>Unable to load traces</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="flex flex-wrap items-center gap-2">
        {flowNames.map((name) => (
          <Button
            key={name}
            type="button"
            size="sm"
            variant={flowFilter === name ? "default" : "secondary"}
            onClick={() => setFlowFilter((prev) => (prev === name ? null : name))}
          >
            {name}
          </Button>
        ))}
        {(query || flowFilter) && (
          <Button type="button" size="sm" variant="ghost" onClick={clearFilters}>
            Clear filters
          </Button>
        )}
      </div>

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
      ) : filteredRuns.length === 0 ? (
        <Alert>
          <AlertTitle>No runs match filter</AlertTitle>
          <AlertDescription>Adjust the search or quick filters to see trace runs.</AlertDescription>
        </Alert>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Run ID</TableHead>
              <TableHead>Flow</TableHead>
              <TableHead>Label</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Command</TableHead>
              <TableHead className="w-32">Started</TableHead>
              <TableHead className="w-32 text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredRuns.map((r, idx) => (
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
                <TableCell className="text-sm">
                  {r.flow_name ? (
                    <Badge variant="secondary" className="text-[11px] font-semibold">
                      {r.flow_name}
                    </Badge>
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  )}
                </TableCell>
                <TableCell className="text-sm">
                  {r.label ? (
                    <Badge variant="outline" className="text-[11px] font-semibold">
                      {r.label}
                    </Badge>
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  )}
                </TableCell>
                <TableCell className="text-sm">
                  {r.status ? (
                    <Badge variant="secondary" className="text-[11px] font-semibold">
                      {r.status}
                    </Badge>
                  ) : (
                    <span className="text-muted-foreground">—</span>
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
