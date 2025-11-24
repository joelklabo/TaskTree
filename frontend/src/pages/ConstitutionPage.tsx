import React from "react";
import { fetchConstitution, Constitution } from "../api/client";
import { Alert, AlertDescription, AlertTitle } from "../components/ui/alert";
import { Badge } from "../components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";
import { Skeleton } from "../components/ui/skeleton";
import { ScrollArea } from "../components/ui/scroll-area";

export default function ConstitutionPage() {
  const [data, setData] = React.useState<Constitution | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  const isStringRecord = (val: unknown): val is Record<string, string> =>
    typeof val === "object" && val !== null && !Array.isArray(val);

  React.useEffect(() => {
    fetchConstitution()
      .then(setData)
      .catch((err) => setError(err instanceof Error ? err.message : String(err)))
      .finally(() => setLoading(false));
  }, []);

  const taskStates = data?.task_states || {};
  const stateList = Array.isArray(taskStates.states) ? taskStates.states : [];
  const transitions = taskStates.transitions || {};
  const ownership: Record<string, string> = isStringRecord(data?.ownership) ? data.ownership : {};
  const protectedPaths = Array.isArray(data?.protected) ? data.protected : [];

  const emptyConstitution =
    !stateList.length &&
    !Object.keys(transitions).length &&
    !Object.keys(ownership).length &&
    !protectedPaths.length;

  return (
    <div className="space-y-4 p-2">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">Constitution</h1>
          <p className="text-sm text-muted-foreground">
            Task states, ownership, and protected paths enforced during flow execution.
          </p>
        </div>
        <Badge variant="outline">Live from backend</Badge>
      </div>

      {loading && <Skeleton className="h-24 w-full" />}

      {error && (
        <Alert variant="destructive">
          <AlertTitle>Unable to load constitution</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {!loading && !error && (
        <div className="space-y-4">
          {emptyConstitution && (
            <Alert>
              <AlertTitle>No constitution data available</AlertTitle>
              <AlertDescription>
                The constitution file is empty. Add task states, ownership, and protected paths to
                enforce guardrails.
              </AlertDescription>
            </Alert>
          )}

          <div className="grid gap-4 lg:grid-cols-2">
            <Card className="h-full">
              <CardHeader>
                <CardTitle className="text-base">Task states</CardTitle>
                <CardDescription>States and transitions for flow execution.</CardDescription>
              </CardHeader>
              <CardContent>
                {stateList.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No task states configured.</p>
                ) : (
                  <div className="space-y-3">
                    {stateList.map((state) => {
                      const transitionsForState = transitions[state] || {};
                      const transitionText = Object.entries(transitionsForState)
                        .map(([event, target]) => `${event} -> ${target}`)
                        .join(", ");
                      return (
                        <div key={state} className="rounded-md border bg-white px-3 py-2 shadow-sm">
                          <div className="font-semibold text-slate-900">{state}</div>
                          <div className="text-xs text-slate-600">
                            {transitionText || "No transitions defined"}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="h-full">
              <CardHeader>
                <CardTitle className="text-base">Ownership</CardTitle>
                <CardDescription>Who controls protected assets.</CardDescription>
              </CardHeader>
              <CardContent>
                {Object.keys(ownership).length === 0 ? (
                  <p className="text-sm text-muted-foreground">No ownership entries.</p>
                ) : (
                  <div className="divide-y rounded-md border bg-white">
                    {Object.entries(ownership).map(([path, owner]) => (
                      <div key={path} className="flex items-center justify-between px-3 py-2">
                        <span className="font-mono text-xs text-slate-800">{path}</span>
                        <Badge variant="secondary" className="text-[11px] font-semibold">
                          {owner}
                        </Badge>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Protected paths</CardTitle>
              <CardDescription>Paths blocked without the owning agent.</CardDescription>
            </CardHeader>
            <CardContent>
              {protectedPaths.length === 0 ? (
                <p className="text-sm text-muted-foreground">No protected paths.</p>
              ) : (
                <ScrollArea className="max-h-64">
                  <ul className="space-y-2">
                    {protectedPaths.map((p) => (
                      <li key={p} className="flex items-center gap-2">
                        <Badge variant="outline" className="font-mono text-xs">
                          {p}
                        </Badge>
                        <span className="text-sm text-muted-foreground">
                          Restricted to the listed owner.
                        </span>
                      </li>
                    ))}
                  </ul>
                </ScrollArea>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
