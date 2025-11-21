import React, { useEffect, useState } from "react";
import { DashboardStateView } from "./DashboardStateView";
import stateFixture from "../__tests__/fixtures/dashboard_state.json";

type DashboardState = typeof stateFixture;

type Props = { initialState?: DashboardState | null };

export default function DashboardPage({ initialState }: Props) {
  const [state, setState] = useState<DashboardState | null>(initialState ?? null);
  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const res = await fetch("/tmp/dashboard_state.json", { cache: "no-cache" });
        if (!res.ok) throw new Error(`fetch failed: ${res.status}`);
        const data = (await res.json()) as DashboardState;
        if (!cancelled) setState(data);
      } catch (err) {
        // fall back to fixture
        if (!cancelled) setState(stateFixture);
        console.error("dashboard state fetch failed; using fixture", err);
      }
    };
    void load();
    const id = setInterval(() => {
      void load();
    }, 2000);
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
