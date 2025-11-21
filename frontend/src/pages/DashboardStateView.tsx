import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";

type Server = { name: string; status: boolean; port: number };
type Alert = { level?: string; msg?: string; count?: number; source?: string };
type CiRun = {
  workflow?: string;
  status?: string;
  conclusion?: string;
  branch?: string;
  url?: string;
  updated_at?: string;
};
type DashboardState = {
  status?: { env?: string; ready?: boolean; updated_at?: string };
  git?: { branch?: string; ahead?: number; behind?: number; dirty?: number };
  servers?: Server[];
  alerts?: { total?: number; recent_text?: string; recent?: Alert[] };
  ci?: { status?: string; recent_text?: string; runs?: CiRun[] };
  traces?: { recent_runs?: number };
  logs?: { configured_sources?: number };
};

const Badge: React.FC<{ ok: boolean }> = ({ ok }) => (
  <span className={`inline-flex h-2 w-2 rounded-full ${ok ? "bg-green-500" : "bg-red-500"}`} />
);

export function DashboardStateView({ state = {} as DashboardState }: { state?: DashboardState }) {
  const servers = state.servers ?? [];
  const alerts = state.alerts?.recent ?? [];
  const ciRuns = state.ci?.runs ?? [];
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      <Card>
        <CardHeader>
          <CardTitle>Status</CardTitle>
        </CardHeader>
        <CardContent className="space-y-1 text-sm text-slate-100">
          <div>Env: {state.status?.env ?? "?"}</div>
          <div>Updated: {state.status?.updated_at ?? "?"}</div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Git</CardTitle>
        </CardHeader>
        <CardContent className="space-y-1 text-sm text-slate-100">
          <div>Branch: {state.git?.branch ?? "?"}</div>
          <div>
            Ahead {state.git?.ahead ?? 0} / Behind {state.git?.behind ?? 0} / Dirty{" "}
            {state.git?.dirty ?? 0}
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Servers</CardTitle>
        </CardHeader>
        <CardContent className="space-y-1 text-sm text-slate-100">
          {servers.map((srv) => (
            <div key={srv.name} className="flex items-center gap-2">
              <Badge ok={srv.status} />
              <span className="font-medium">{srv.name}</span>
              <span className="text-slate-300">:{srv.port}</span>
            </div>
          ))}
          {servers.length === 0 && <div className="text-slate-400">No servers</div>}
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Alerts</CardTitle>
        </CardHeader>
        <CardContent className="space-y-1 text-sm text-slate-100">
          <div>Total: {state.alerts?.total ?? 0}</div>
          {state.alerts?.recent_text && (
            <pre className="whitespace-pre-wrap rounded bg-slate-800/50 p-2 text-xs text-slate-200">
              {state.alerts.recent_text}
            </pre>
          )}
          {alerts.length > 0 ? (
            alerts.slice(0, 5).map((a, i) => (
              <div key={i} className="text-slate-300">
                [{a.level ?? "info"}] {a.msg ?? ""}
              </div>
            ))
          ) : (
            <div className="text-slate-400">No recent alerts</div>
          )}
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>CI</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-slate-100">
          <div>Status: {state.ci?.status ?? "unknown"}</div>
          {ciRuns.length > 0 ? (
            <div className="space-y-1">
              {ciRuns.slice(0, 5).map((run, idx) => (
                <div key={idx} className="text-slate-300">
                  <span className="font-medium">{run.workflow ?? "run"}</span>{" "}
                  <span className="text-green-400">{run.conclusion ?? run.status}</span>{" "}
                  <span className="text-slate-400">({run.branch ?? "?"})</span>{" "}
                  {run.url ? (
                    <a href={run.url} className="text-blue-300 underline">
                      open
                    </a>
                  ) : null}
                </div>
              ))}
            </div>
          ) : (
            <div className="text-slate-400">No recent runs</div>
          )}
          {ciRuns.length === 0 && state.ci?.recent_text && (
            <pre className="whitespace-pre-wrap rounded bg-slate-800/50 p-2 text-xs text-slate-200">
              {state.ci.recent_text}
            </pre>
          )}
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Traces</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-slate-100">
          Recent runs: {state.traces?.recent_runs ?? 0}
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Logs</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-slate-100">
          Sources configured: {state.logs?.configured_sources ?? 0}
        </CardContent>
      </Card>
    </div>
  );
}
