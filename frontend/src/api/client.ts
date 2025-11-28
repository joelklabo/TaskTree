import axios from "axios";

export type FlowSummary = { id: string; name?: string; description?: string };
export type FlowDetail = {
  id: string;
  name?: string;
  start: string;
  description?: string;
  steps: Array<{
    id: string;
    agent: string;
    transitions?: Record<string, string>;
  }>;
  _raw?: string;
};

export type RunResponse = {
  session_id: string;
  flow_name: string;
  trace_run_id?: string | null;
  steps: Array<{ step_name: string; agent: string; status: string; label?: string | null }>;
};

export type TraceMeta = {
  run_id?: string;
  cmd?: string[];
  cwd?: string;
  start_time?: string;
  end_time?: string;
  flow_name?: string;
  flow_version?: string;
  label?: string | null;
  status?: string;
  exit_code?: number;
};

export type ArtifactInfo = { path: string; size: number };
export type TraceCompareResponse = {
  runs: { a: TraceMeta; b: TraceMeta };
  steps: Array<{
    step_name: string;
    a: { status?: string | null; label?: string | null; duration_ms?: number | null } | null;
    b: { status?: string | null; label?: string | null; duration_ms?: number | null } | null;
    delta: { status_changed?: boolean; duration_ms?: number | null };
  }>;
  summary: {
    total: number;
    mismatched: number;
    missing_in_a: number;
    missing_in_b: number;
  };
};
type ClientErrorPayload = {
  message: string;
  name?: string;
  stack?: string;
  context?: Record<string, unknown>;
  user_agent?: string;
};
type ClientErrorResponse = { status: string; log_file: string };
type LogSource = { name: string; size: number };
type TailLogResponse = { source: string; lines: string[] };
type LogEventsResponse = { events: Array<Record<string, unknown>> };
type StreamConfig = {
  sources?: string[];
  tags?: string[];
  contains?: string;
  interval?: number;
  tail_lines?: number;
};
type PromptSkeletonResponse = {
  action: string;
  agent: string;
  template: string;
  skeleton: { input: Record<string, unknown> };
};
export type Constitution = {
  task_states?: {
    states?: string[];
    transitions?: Record<string, Record<string, string>>;
  };
  ownership?: Record<string, string>;
  protected?: string[];
};

const api = axios.create({
  baseURL: "/api",
});

// Expose for tests
export const apiClient = api;

api.interceptors.response.use(
  (response) => response,
  (error) => {
    try {
      const url: string | undefined = error?.config?.url;
      const status: number | undefined = error?.response?.status;
      const method: string | undefined = error?.config?.method;

      // Avoid recursive logging on the logging endpoint itself
      const isLoggingEndpoint = typeof url === "string" && url.includes("/debug/log-client-error");

      // Only capture server/transport failures; skip expected 4xx client errors
      const shouldLog = !isLoggingEndpoint && (!status || status >= 500);

      if (shouldLog) {
        void logClientErrorFn({
          message: error?.message || "API request failed",
          name: "ApiError",
          stack: error?.stack,
          context: {
            url,
            status,
            method,
          },
          user_agent: navigator.userAgent,
        }).catch(() => {
          /* swallow to avoid loops */
        });
      }
    } catch {
      // never throw from interceptor logging path
    }
    return Promise.reject(error);
  },
);

export async function fetchFlows(): Promise<FlowSummary[]> {
  const res = await api.get<FlowSummary[]>("/flows/");
  return res.data;
}

export async function createFlow(payload: {
  id: string;
  name?: string;
  description?: string;
  content?: string;
}): Promise<FlowDetail> {
  const res = await api.post<FlowDetail>("/flows/", payload);
  return res.data;
}

export async function fetchFlow(flowId: string): Promise<FlowDetail> {
  const res = await api.get<FlowDetail>(`/flows/${flowId}`);
  return res.data;
}

export async function updateFlow(flowId: string, content: string): Promise<unknown> {
  const res = await api.put(`/flows/${flowId}`, { content });
  return res.data;
}

export async function deleteFlow(flowId: string): Promise<unknown> {
  const res = await api.delete(`/flows/${flowId}`);
  return res.data;
}

export async function runFlow(
  flowId: string,
  input: Record<string, unknown>,
  opts?: { trace?: boolean },
): Promise<RunResponse> {
  const res = await api.post<RunResponse>(
    "/runs/",
    { flow_id: flowId, input },
    opts?.trace ? { headers: { "x-trace": "true" } } : undefined,
  );
  return res.data;
}

export async function fetchTraces(): Promise<TraceMeta[]> {
  const res = await api.get<TraceMeta[]>("/trace/runs");
  return res.data;
}

export async function fetchTrace(runId: string): Promise<unknown[]> {
  const res = await api.get<unknown[]>(`/trace/runs/${runId}/trace`);
  return res.data;
}

export async function fetchArtifacts(runId: string): Promise<ArtifactInfo[]> {
  const res = await api.get<ArtifactInfo[]>(`/trace/runs/${runId}/artifacts`);
  return res.data;
}

export async function fetchTraceCompare(runA: string, runB: string): Promise<TraceCompareResponse> {
  const res = await api.get<TraceCompareResponse>("/trace/compare", {
    params: { run_a: runA, run_b: runB },
  });
  return res.data;
}

export async function fetchPromptSkeleton(
  action: string,
  agent = "codex_cli",
): Promise<PromptSkeletonResponse> {
  const res = await api.get<PromptSkeletonResponse>("/prompts/skeleton", {
    params: { action, agent },
  });
  return res.data;
}

export async function fetchPromptSkeletonByTemplate(
  template: string,
): Promise<PromptSkeletonResponse> {
  const res = await api.get<PromptSkeletonResponse>("/prompts/skeleton", {
    params: { template },
  });
  return res.data;
}

export async function startControlledRun(
  flowId: string,
  input: Record<string, unknown>,
  breakpoints?: string[],
): Promise<RunResponse> {
  const res = await api.post<RunResponse>(`/flows/${flowId}/run-controlled`, {
    input,
    breakpoints,
  });
  return res.data;
}

export async function resumeRun(sessionId: string): Promise<unknown> {
  const res = await api.post(`/runs/${sessionId}/resume`);
  return res.data;
}

export async function fetchRunEvents(sessionId: string): Promise<Array<Record<string, unknown>>> {
  const res = await api.get<Array<Record<string, unknown>>>(`/runs/${sessionId}/events`);
  return res.data;
}

export async function fetchLogSources(): Promise<LogSource[]> {
  const res = await api.get<LogSource[]>("/logs/sources");
  return res.data;
}

export async function tailLog(source: string, lines = 200): Promise<TailLogResponse> {
  const res = await api.get<TailLogResponse>("/logs/tail", { params: { source, lines } });
  return res.data;
}

export async function fetchLogEvents(): Promise<LogEventsResponse> {
  const res = await api.get<LogEventsResponse>("/logs/events");
  return res.data;
}

export function streamLogs(config: StreamConfig = {}): EventSource {
  const params = new URLSearchParams();
  if (config.sources && config.sources.length > 0) {
    params.set("sources", config.sources.join(","));
  }
  if (config.tags && config.tags.length > 0) {
    params.set("tags", config.tags.join(","));
  }
  if (config.contains) {
    params.set("contains", config.contains);
  }
  if (config.interval) {
    params.set("interval", String(config.interval));
  }
  if (config.tail_lines) {
    params.set("tail_lines", String(config.tail_lines));
  }
  const url = `/api/logs/stream?${params.toString()}`;
  return new EventSource(url);
}

export async function logClientError(payload: ClientErrorPayload): Promise<ClientErrorResponse> {
  const res = await api.post<ClientErrorResponse>("/debug/log-client-error", payload);
  return res.data;
}

// Allow tests to override the logging sink used by the interceptor
let logClientErrorFn = logClientError;
export const __setLogClientErrorForTest = (fn: typeof logClientError) => {
  logClientErrorFn = fn;
};

export async function fetchConstitution(): Promise<Constitution> {
  const res = await api.get<Constitution>("/constitution/");
  return res.data;
}

type EditorFile = { name: string; content: string };

export async function listPrompts(): Promise<string[]> {
  const res = await api.get<string[]>("/editor/prompts");
  return res.data;
}

export async function getPrompt(name: string): Promise<EditorFile> {
  const res = await api.get<EditorFile>(`/editor/prompts/${name}`);
  return res.data;
}

export async function updatePrompt(name: string, content: string): Promise<unknown> {
  const res = await api.put(`/editor/prompts/${name}`, { content });
  return res.data;
}

export async function listFlowFiles(): Promise<string[]> {
  const res = await api.get<string[]>("/editor/flows");
  return res.data;
}

export async function getFlowFile(name: string): Promise<EditorFile> {
  const res = await api.get<EditorFile>(`/editor/flows/${name}`);
  return res.data;
}

export async function updateFlowFile(name: string, content: string): Promise<unknown> {
  const res = await api.put(`/editor/flows/${name}`, { content });
  return res.data;
}

export async function listAgents(): Promise<string[]> {
  const res = await api.get<string[]>("/editor/agents");
  return res.data;
}

export async function getAgent(name: string): Promise<EditorFile> {
  const res = await api.get<EditorFile>(`/editor/agents/${name}`);
  return res.data;
}

export async function updateAgent(name: string, content: string): Promise<unknown> {
  const res = await api.put(`/editor/agents/${name}`, { content });
  return res.data;
}
