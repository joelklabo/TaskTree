import React, { useEffect, useState } from "react";
import { DashboardStateView, type DashboardState } from "./DashboardStateView";
import stateFixture from "../__tests__/fixtures/dashboard_state.json";

type Props = { initialState?: DashboardState | null };

async function fetchJson<T>(url: string): Promise<T | null> {
  try {
    const res = await fetch(url, { cache: "no-cache" });
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

export default function DashboardPage({ initialState }: Props) {
  const [state, setState] = useState<DashboardState | null>(initialState ?? null);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      const [health, flows, logs, events, traces] = await Promise.all([
        fetchJson<{ status?: string }>("/health"),
        fetchJson<Array<{ id: string; description?: string }>>("/api/flows/"),
        fetchJson<Array<{ name: string; description?: string }>>("/api/logs/sources"),
        fetchJson<{ events: Array<Record<string, unknown>> }>("/api/logs/events"),
        fetchJson<Array<Record<string, unknown>>>("/api/trace/runs"),
      ]);

      const logErrors = events?.events.filter((ev) => ev.type === "log_error").slice(0, 3) ?? [];
      const next: DashboardState = {
        status: {
          env: "dev",
          ready: health?.status === "ok",
          updated_at: new Date().toISOString(),
        },
        git: { branch: "main", ahead: 0, behind: 0, dirty: 0 },
        servers: [
          { name: "backend", status: health?.status === "ok", port: 8000 },
          {
            name: "frontend",
            status: true,
            port: window.location.port ? Number(window.location.port) : 4173,
          },
        ],
        alerts: {
          total: logErrors.length,
          recent_text: logErrors.map((ev) => String(ev.message || "")).join("\n"),
          recent: logErrors.map((ev) => ({
            level: "error",
            msg: String(ev.message || ev.type || ""),
            source: String(ev.log_file || "log"),
          })),
        },
        ci: { status: "unknown", recent_text: "ci not wired", runs: [] },
        traces: { recent_runs: traces?.length ?? 0 },
        logs: {
          configured_sources: logs?.length ?? 0,
          sources: logs?.map((l) => ({ name: l.name, description: l.description || "" })) ?? [],
        },
        flows: { total: flows?.length ?? 0 },
      };
      if (!cancelled) {
        setState(next);
      }
    };
    void load();
    const id = setInterval(() => void load(), 5000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, []);

  return (
    <div className="p-4">
      <h1 className="text-xl font-bold text-slate-100 mb-3">Dashboard (shared state)</h1>
      <DashboardStateView state={state ?? stateFixture} />
    </div>
  );
}
