import { useCallback, useEffect, useState } from "react";

type Status = "unknown" | "online" | "offline";

type DevServerStatusProps = {
  pollIntervalMs?: number;
};

const fallbackBackendUrl = "http://localhost:8000";

function normalizeBackendUrl(value?: string): string {
  if (!value) return fallbackBackendUrl;
  try {
    return new URL(value).origin;
  } catch {
    return fallbackBackendUrl;
  }
}

export function DevServerStatus({ pollIntervalMs = 5000 }: DevServerStatusProps) {
  const [status, setStatus] = useState<Status>("unknown");
  const [checking, setChecking] = useState(false);
  const [lastChecked, setLastChecked] = useState<number | null>(null);

  const envSource = (import.meta as unknown as { env?: Record<string, unknown> }).env;
  const backendUrl = normalizeBackendUrl(
    typeof envSource?.VITE_BACKEND_URL === "string" ? envSource.VITE_BACKEND_URL : undefined,
  );
  const frontendUrl =
    typeof window !== "undefined" && window.location
      ? window.location.origin
      : "http://localhost:5173";

  const probeHealth = useCallback(async () => {
    const endpoints = [
      "/api/health",
      `${backendUrl.replace(/\/$/, "")}/health`,
      `${backendUrl.replace(/\/$/, "")}/api/health`,
    ];

    let isOnline = false;
    for (const endpoint of endpoints) {
      try {
        const res = await fetch(endpoint, { cache: "no-store" });
        if (res.ok) {
          isOnline = true;
          break;
        }
      } catch {
        // ignore and try the next endpoint
      }
    }

    return { isOnline, checkedAt: Date.now() };
  }, [backendUrl]);

  useEffect(() => {
    let cancelled = false;

    const runCheck = async () => {
      setChecking(true);
      const result = await probeHealth();
      if (cancelled) {
        setChecking(false);
        return;
      }
      setStatus(result.isOnline ? "online" : "offline");
      setLastChecked(result.checkedAt);
      setChecking(false);
    };

    runCheck();
    const id = window.setInterval(runCheck, pollIntervalMs);
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, [pollIntervalMs, probeHealth]);

  const pipClass =
    status === "online"
      ? "h-2.5 w-2.5 rounded-full bg-green-500 shadow-green-500/50 shadow-sm animate-pulse"
      : status === "offline"
        ? "h-2.5 w-2.5 rounded-full bg-red-500 shadow-red-500/50 shadow-sm"
        : "h-2.5 w-2.5 rounded-full bg-amber-400 shadow-amber-400/40 shadow-sm animate-pulse";

  const statusLabel =
    status === "online" ? "Connected" : status === "offline" ? "Offline" : "Checking…";
  const statusTone =
    status === "online"
      ? "text-emerald-700"
      : status === "offline"
        ? "text-rose-700"
        : "text-slate-700";

  return (
    <div
      className="flex items-center gap-3 rounded-lg border border-slate-200 bg-white/90 px-3 py-2 text-xs text-muted-foreground shadow-sm"
      data-testid="dev-server-status"
      aria-live="polite"
    >
      <div className="flex h-10 w-10 items-center justify-center rounded-md bg-slate-900 text-[11px] font-semibold uppercase text-white">
        Dev
      </div>
      <div className="flex flex-col gap-1 leading-tight">
        <div className="flex flex-wrap items-center gap-2">
          <span data-testid="dev-server-pip" className={pipClass} />
          <span className={`text-sm font-semibold ${statusTone}`}>Backend {statusLabel}</span>
          <span className="rounded-full bg-slate-100 px-2 py-[2px] text-[11px] text-slate-600">
            {checking
              ? "Checking now…"
              : lastChecked
                ? `Checked ${new Date(lastChecked).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" })}`
                : "Waiting for first check"}
          </span>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded bg-slate-50 px-2 py-1 font-mono text-[11px] text-slate-700">
            frontend: {frontendUrl}
          </span>
          <span className="rounded bg-slate-50 px-2 py-1 font-mono text-[11px] text-slate-700">
            backend: {backendUrl}
          </span>
          <span className="text-[11px] text-slate-500">via /api/health probe</span>
        </div>
      </div>
      <button
        type="button"
        onClick={() => {
          setStatus("unknown");
          setLastChecked(null);
          setChecking(true);
          probeHealth()
            .then((result) => {
              setStatus(result.isOnline ? "online" : "offline");
              setLastChecked(result.checkedAt);
            })
            .catch(() => {
              setStatus("offline");
              setLastChecked(Date.now());
            })
            .finally(() => setChecking(false));
        }}
        className="text-[11px] font-semibold text-primary underline-offset-2 hover:underline"
      >
        Retry
      </button>
    </div>
  );
}
