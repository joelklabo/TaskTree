import React from "react";
import { fetchTraces, fetchTraceCompare, TraceCompareResponse, TraceMeta } from "../api/client";
import { Alert, AlertDescription, AlertTitle } from "../components/ui/alert";
import { Badge } from "../components/ui/badge";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";
import { Input } from "../components/ui/input";
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
  const [compareA, setCompareA] = React.useState("");
  const [compareB, setCompareB] = React.useState("");
  const [compareResult, setCompareResult] = React.useState<TraceCompareResponse | null>(null);
  const [compareError, setCompareError] = React.useState<string | null>(null);
  const [compareLoading, setCompareLoading] = React.useState(false);

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

  const handleCompare = async () => {
    setCompareError(null);
    setCompareResult(null);
    if (!compareA || !compareB) {
      setCompareError("Select two run IDs to compare");
      return;
    }
    setCompareLoading(true);
    try {
      const res = await fetchTraceCompare(compareA.trim(), compareB.trim());
      setCompareResult(res);
    } catch (err) {
      setCompareError(err instanceof Error ? err.message : "Failed to compare traces");
    } finally {
      setCompareLoading(false);
    }
  };

  const totalRuns = runs.length;
  const uniqueFlows = flowNames.length;
  const completedRuns = runs.filter((r) => r.status === "tests_passed" || r.status === "success");
  const completionLabel = totalRuns === 0 ? "0" : `${completedRuns.length}/${totalRuns}`;

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold">Traces</h1>

      <Card
        className="border bg-gradient-to-r from-slate-50 via-white to-sky-50"
        data-testid="traces-hero"
      >
        <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">
              Trace Observatory
            </p>
            <CardTitle className="text-2xl">Inspect runs and replay evidence</CardTitle>
            <CardDescription>
              Filter by flow, label, or command; jump into a run’s trace timeline in one click.
            </CardDescription>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={clearFilters}
              disabled={!query && !flowFilter}
            >
              Reset filters
            </Button>
          </div>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-3">
          <div className="space-y-1 rounded-lg border bg-white p-3 shadow-sm">
            <p className="text-xs font-semibold text-muted-foreground">Total runs</p>
            <p className="text-2xl font-semibold">{totalRuns}</p>
            <p className="text-xs text-muted-foreground">Captured in this workspace</p>
          </div>
          <div className="space-y-1 rounded-lg border bg-white p-3 shadow-sm">
            <p className="text-xs font-semibold text-muted-foreground">Unique flows</p>
            <p className="text-2xl font-semibold">{uniqueFlows}</p>
            <p className="text-xs text-muted-foreground">Grouped by flow name</p>
          </div>
          <div className="space-y-1 rounded-lg border bg-white p-3 shadow-sm">
            <p className="text-xs font-semibold text-muted-foreground">Completed</p>
            <p className="text-2xl font-semibold">{completionLabel}</p>
            <p className="text-xs text-muted-foreground">tests_passed / success statuses</p>
          </div>
          <div className="md:col-span-3 grid gap-3 md:grid-cols-[1.25fr,1fr]">
            <div className="space-y-2">
              <label htmlFor="traces-search" className="text-sm font-medium text-foreground">
                Filter runs
              </label>
              <Input
                id="traces-search"
                type="search"
                placeholder="Filter runs by flow, label, or command"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                aria-label="Filter runs"
              />
              <p className="text-xs text-muted-foreground">
                Type a run id, flow name, or label to narrow the list.
              </p>
            </div>
            <div className="space-y-2">
              <label htmlFor="flow-quick-filters" className="text-sm font-medium text-foreground">
                Quick filters
              </label>
              <div className="flex flex-wrap gap-2" id="flow-quick-filters">
                {flowNames.length === 0 ? (
                  <span className="text-xs text-muted-foreground">No flows yet</span>
                ) : (
                  flowNames.map((name) => (
                    <Button
                      key={name}
                      type="button"
                      size="sm"
                      variant={flowFilter === name ? "default" : "secondary"}
                      onClick={() => setFlowFilter((prev) => (prev === name ? null : name))}
                    >
                      {name}
                    </Button>
                  ))
                )}
                {(query || flowFilter) && (
                  <Button type="button" size="sm" variant="ghost" onClick={clearFilters}>
                    Clear filters
                  </Button>
                )}
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Compare two runs</label>
              <div className="grid gap-2 sm:grid-cols-[1fr,1fr,auto]">
                <Input
                  placeholder="Run A id"
                  value={compareA}
                  onChange={(e) => setCompareA(e.target.value)}
                  data-testid="compare-run-a"
                />
                <Input
                  placeholder="Run B id"
                  value={compareB}
                  onChange={(e) => setCompareB(e.target.value)}
                  data-testid="compare-run-b"
                />
                <Button onClick={handleCompare} disabled={compareLoading}>
                  {compareLoading ? "Comparing…" : "Compare"}
                </Button>
              </div>
              {compareError && <p className="text-xs text-destructive">{compareError}</p>}
            </div>
          </div>
        </CardContent>
      </Card>

      {compareResult && (
        <Card data-testid="compare-result">
          <CardHeader>
            <CardTitle className="text-lg">Comparison</CardTitle>
            <CardDescription className="text-sm text-muted-foreground">
              {compareResult.runs.a.run_id} vs {compareResult.runs.b.run_id} ·{" "}
              {compareResult.summary.mismatched} mismatched · {compareResult.summary.missing_in_a}{" "}
              missing in A · {compareResult.summary.missing_in_b} missing in B
            </CardDescription>
          </CardHeader>
          <CardContent className="overflow-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Step</TableHead>
                  <TableHead className="w-32">Run A status</TableHead>
                  <TableHead className="w-32">Run B status</TableHead>
                  <TableHead className="w-28 text-right">Δ duration (ms)</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {compareResult.steps.map((step) => (
                  <TableRow
                    key={step.step_name}
                    data-testid={`compare-row-${step.step_name}`}
                    className={
                      step.delta.status_changed ? "bg-amber-50 dark:bg-amber-950/40" : undefined
                    }
                  >
                    <TableCell className="font-medium">{step.step_name}</TableCell>
                    <TableCell>
                      {step.a?.status || <Badge variant="outline">missing</Badge>}
                    </TableCell>
                    <TableCell>
                      {step.b?.status || <Badge variant="outline">missing</Badge>}
                    </TableCell>
                    <TableCell className="text-right font-mono text-xs">
                      {step.delta.duration_ms ?? "—"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

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
