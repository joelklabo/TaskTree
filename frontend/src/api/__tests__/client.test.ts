import { describe, expect, it, vi } from "vitest";

const mockGet = vi.fn<(path: string) => Promise<{ data: unknown }>>();
const mockPost =
  vi.fn<(path: string, body?: unknown, config?: unknown) => Promise<{ data: unknown }>>();
const mockPut = vi.fn<(path: string, body?: unknown) => Promise<{ data: unknown }>>();
const mockInterceptorUse = vi.fn();
const mockInterceptors = { response: { use: mockInterceptorUse } };

vi.mock("axios", () => ({
  default: {
    create: () => ({
      get: mockGet,
      post: mockPost,
      put: mockPut,
      interceptors: mockInterceptors,
    }),
  },
}));

describe("api client wrappers", () => {
  beforeEach(() => {
    mockGet.mockReset();
    mockPost.mockReset();
    mockPut.mockReset();
    mockInterceptorUse.mockReset();
  });

  it("wraps flow/trace/run endpoints with the correct paths and headers", async () => {
    const {
      fetchFlows,
      fetchFlow,
      updateFlow,
      runFlow,
      fetchTraces,
      fetchTrace,
      fetchArtifacts,
      fetchConstitution,
      startControlledRun,
      resumeRun,
      fetchRunEvents,
      fetchLogSources,
      tailLog,
      fetchLogEvents,
    } = await import("../client");

    mockGet.mockResolvedValueOnce({ data: [{ id: "foo" }] });
    await expect(fetchFlows()).resolves.toEqual([{ id: "foo" }]);
    expect(mockGet).toHaveBeenCalledWith("/flows/");

    mockGet.mockResolvedValueOnce({ data: { id: "bar", start: "s", steps: [] } });
    await expect(fetchFlow("bar")).resolves.toEqual({ id: "bar", start: "s", steps: [] });
    expect(mockGet).toHaveBeenCalledWith("/flows/bar");

    mockPost.mockResolvedValueOnce({ data: { session_id: "sess1", flow_name: "code_fix" } });
    await expect(runFlow("code_fix", { a: 1 })).resolves.toMatchObject({ session_id: "sess1" });
    expect(mockPost).toHaveBeenCalledWith(
      "/runs/",
      { flow_id: "code_fix", input: { a: 1 } },
      undefined,
    );

    mockPost.mockResolvedValueOnce({ data: { session_id: "sess2", trace_run_id: "trace123" } });
    await runFlow("code_fix", {}, { trace: true });
    expect(mockPost).toHaveBeenLastCalledWith(
      "/runs/",
      { flow_id: "code_fix", input: {} },
      { headers: { "x-trace": "true" } },
    );

    mockGet.mockResolvedValueOnce({ data: [{ run_id: "r1" }] });
    await fetchTraces();
    expect(mockGet).toHaveBeenLastCalledWith("/trace/runs");

    mockGet.mockResolvedValueOnce({ data: [{ rec: 1 }] });
    await fetchTrace("abc");
    expect(mockGet).toHaveBeenLastCalledWith("/trace/runs/abc/trace");

    mockGet.mockResolvedValueOnce({ data: [{ path: "p", size: 1 }] });
    await fetchArtifacts("abc");
    expect(mockGet).toHaveBeenLastCalledWith("/trace/runs/abc/artifacts");

    mockGet.mockResolvedValueOnce({ data: { protected: [] } });
    await fetchConstitution();
    expect(mockGet).toHaveBeenLastCalledWith("/constitution/");

    mockPut.mockResolvedValueOnce({ data: { id: "demo" } });
    await updateFlow("demo", "yaml");
    expect(mockPut).toHaveBeenLastCalledWith("/flows/demo", { content: "yaml" });

    mockPost.mockResolvedValueOnce({ data: { session_id: "ctrl1" } });
    await startControlledRun("demo", { a: 1 }, ["step"]);
    expect(mockPost).toHaveBeenLastCalledWith("/flows/demo/run-controlled", {
      input: { a: 1 },
      breakpoints: ["step"],
    });

    mockPost.mockResolvedValueOnce({ data: { status: "resumed" } });
    await resumeRun("ctrl1");
    expect(mockPost).toHaveBeenLastCalledWith("/runs/ctrl1/resume");

    mockGet.mockResolvedValueOnce({ data: [{ type: "paused" }] });
    await fetchRunEvents("ctrl1");
    expect(mockGet).toHaveBeenLastCalledWith("/runs/ctrl1/events");

    mockGet.mockResolvedValueOnce({ data: [{ name: "debug.log" }] });
    await fetchLogSources();
    expect(mockGet).toHaveBeenLastCalledWith("/logs/sources");

    mockGet.mockResolvedValueOnce({ data: { source: "debug.log", lines: [] } });
    await tailLog("debug.log", 10);
    expect(mockGet).toHaveBeenLastCalledWith("/logs/tail", {
      params: { source: "debug.log", lines: 10 },
    });

    mockGet.mockResolvedValueOnce({ data: { events: [] } });
    await fetchLogEvents();
    expect(mockGet).toHaveBeenLastCalledWith("/logs/events");
  });
});
