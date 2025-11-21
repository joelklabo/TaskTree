import React from "react";
import { fetchConstitution, Constitution } from "../api/client";
import { Alert, AlertDescription, AlertTitle } from "../components/ui/alert";
import { Skeleton } from "../components/ui/skeleton";

export default function ConstitutionPage() {
  const [data, setData] = React.useState<Constitution | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    fetchConstitution()
      .then(setData)
      .catch((err) => setError(err instanceof Error ? err.message : String(err)))
      .finally(() => setLoading(false));
  }, []);

  const renderTaskStates = () => {
    const taskStates = (data?.task_states as Record<string, unknown>) || {};
    const entries = Object.entries(taskStates);
    if (entries.length === 0) return null;
    return (
      <div className="space-y-2">
        <h3 className="text-sm font-semibold text-slate-700">Task states</h3>
        <div className="divide-y rounded-md border bg-white">
          {entries.map(([state, transitions]) => (
            <div key={state} className="p-3">
              <div className="font-semibold text-slate-900">{state}</div>
              <div className="text-sm text-slate-600">
                {(transitions as Record<string, string> | undefined)
                  ? Object.entries(transitions as Record<string, string>)
                      .map(([k, v]) => `${k} → ${v}`)
                      .join(", ")
                  : "—"}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-4 p-2">
      <h1 className="text-xl font-semibold text-slate-900">Constitution</h1>
      {loading && <Skeleton className="h-24 w-full" />}
      {error && (
        <Alert variant="destructive">
          <AlertTitle>Unable to load constitution</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      {data && (
        <div className="space-y-4">
          {renderTaskStates()}
          {data.owners && (
            <div>
              <h3 className="text-sm font-semibold text-slate-700">Ownership</h3>
              <pre className="rounded-md border bg-slate-50 p-3 text-xs text-slate-800">
                {JSON.stringify(data.owners, null, 2)}
              </pre>
            </div>
          )}
          {data.protected && (
            <div>
              <h3 className="text-sm font-semibold text-slate-700">Protected paths</h3>
              <pre className="rounded-md border bg-slate-50 p-3 text-xs text-slate-800">
                {JSON.stringify(data.protected, null, 2)}
              </pre>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
