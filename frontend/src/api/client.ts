import axios from "axios";

export type FlowSummary = { id: string; description?: string };
export type FlowDetail = {
  id: string;
  start: string;
  steps: Array<{
    id: string;
    agent: string;
    transitions?: Record<string, string>;
  }>;
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
};

export type ArtifactInfo = { path: string; size: number };
export type Constitution = Record<string, unknown>;

const api = axios.create({
  baseURL: "/api",
});

export async function fetchFlows(): Promise<FlowSummary[]> {
  const res = await api.get<FlowSummary[]>("/flows/");
  return res.data;
}

export async function fetchFlow(flowId: string): Promise<FlowDetail> {
  const res = await api.get<FlowDetail>(`/flows/${flowId}`);
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

export async function fetchConstitution(): Promise<Constitution> {
  const res = await api.get<Constitution>("/constitution/");
  return res.data;
}

export default api;
