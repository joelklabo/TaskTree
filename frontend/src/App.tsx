import React from "react";
import ConstitutionPage from "./pages/ConstitutionPage";
import ErrorPlaygroundPage from "./pages/ErrorPlaygroundPage";
import FlowsPage from "./pages/FlowsPage";
import RunDetailPage from "./pages/RunDetailPage";
import TracesPage from "./pages/TracesPage";
import DashboardPage from "./pages/DashboardPage";
import LogsPage from "./pages/LogsPage";
import { EditorPage } from "./pages/EditorPage";
import { DebugPage } from "./pages/DebugPage";
import { FlowWorkbenchPage } from "./pages/FlowWorkbenchPage";
import { fetchLogEvents } from "./api/client";
import { fetchFlows, fetchTraces } from "./api/client";
import dashboardFixture from "./__tests__/fixtures/dashboard_state.json";
import { Button } from "./components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./components/ui/tabs";
import { Badge } from "./components/ui/badge";
import { Toaster } from "./components/ui/toaster";
import { useToast } from "./components/ui/use-toast";
import { DevServerStatus } from "./components/DevServerStatus";

type View =
  | "flows"
  | "run"
  | "constitution"
  | "traces"
  | "dashboard"
  | "errors"
  | "logs"
  | "editor"
  | "debug"
  | "workbench";
type RunRef = { sessionId: string; traceId?: string };

const pathToView = (path: string): View => {
  const trimmed = path.replace(/^\/+|\/+$/g, "");
  if (trimmed === "traces") return "traces";
  if (trimmed === "constitution") return "constitution";
  if (trimmed === "dashboard") return "dashboard";
  if (trimmed === "run") return "run";
  if (trimmed === "errors") return "errors";
  if (trimmed === "logs") return "logs";
  if (trimmed === "error-playground") return "errors";
  if (trimmed === "editor") return "editor";
  if (trimmed === "debug") return "debug";
  if (trimmed === "workbench") return "workbench";
  if (trimmed === "flow-workbench") return "workbench";
  return "flows";
};

export default function App() {
  const initialView = pathToView(window.location.pathname);
  const [view, setView] = React.useState<View>(initialView);
  const [runRef, setRunRef] = React.useState<RunRef | null>(null);
  const [liveRun, setLiveRun] = React.useState<{ sessionId: string; step?: string } | null>(null);
  const [prefetchedFlows, setPrefetchedFlows] =
    React.useState<typeof fetchFlows extends () => Promise<infer R> ? R : [] | null>(null);
  const [prefetchedTraces, setPrefetchedTraces] =
    React.useState<typeof fetchTraces extends () => Promise<infer R> ? R : [] | null>(null);
  const [prefetchedDashboard, setPrefetchedDashboard] = React.useState<
    typeof dashboardFixture | null
  >(null);
  const { toast } = useToast();

  React.useEffect(() => {
    const onPop = () => setView(pathToView(window.location.pathname));
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);

  React.useEffect(() => {
    const interval = window.setInterval(() => {
      fetchLogEvents()
        .then((res) => {
          res.events.forEach((ev) => {
            if (ev.type === "log_error") {
              toast({
                variant: "destructive",
                title: `Log error: ${String(ev.name || ev.type)}`,
                description: String(ev.message || ""),
              });
            }
            if (ev.type && String(ev.type).startsWith("run_")) {
              const sessionId = String(ev.session_id || "");
              if (sessionId) {
                setLiveRun({ sessionId, step: typeof ev.step === "string" ? ev.step : undefined });
              }
              if (ev.type === "run_completed" || ev.type === "run_error") {
                setTimeout(() => setLiveRun(null), 2000);
              }
            }
          });
        })
        .catch(() => {
          // ignore poll errors; next tick will retry
        });
    }, 2500);
    return () => window.clearInterval(interval);
  }, [toast]);

  React.useEffect(() => {
    fetchFlows()
      .then(setPrefetchedFlows)
      .catch(() => setPrefetchedFlows(null));
    fetchTraces()
      .then(setPrefetchedTraces)
      .catch(() => setPrefetchedTraces(null));
    fetch("/tmp/dashboard_state.json", { cache: "no-cache" })
      .then((res) => (res.ok ? res.json() : Promise.reject(new Error("fetch failed"))))
      .then((data) => setPrefetchedDashboard(data as typeof dashboardFixture))
      .catch(() => setPrefetchedDashboard(dashboardFixture));
  }, []);

  React.useEffect(() => {
    const path = view === "flows" ? "/" : `/${view}`;
    if (view === "run" && !runRef) {
      return;
    }
    window.history.replaceState(null, "", path);
  }, [view, runRef]);

  const handleRunSelected = (ref: RunRef) => {
    setRunRef(ref);
    setView("run");
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-slate-100 text-foreground">
      <header className="border-b bg-white/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <button
            type="button"
            data-testid="app-logo"
            className="flex items-center gap-3 rounded-md px-1 py-1 transition hover:bg-slate-100"
            onClick={() => setView("flows")}
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-primary-foreground font-semibold">
              TT
            </div>
            <div className="text-left">
              <h1 className="text-xl font-semibold tracking-tight">TaskTree</h1>
              <p className="text-sm text-muted-foreground">
                Flows, traces, and artifacts at a glance.
              </p>
            </div>
          </button>
          <div className="flex items-center gap-2">
            <DevServerStatus />
            {liveRun && (
              <Badge variant="default" className="hidden sm:inline-flex animate-pulse">
                Live run: {liveRun.sessionId.slice(0, 8)} {liveRun.step ? `· ${liveRun.step}` : ""}
              </Badge>
            )}
            {runRef && (
              <Badge variant="secondary" className="hidden sm:inline-flex">
                Last run: {(runRef.traceId || runRef.sessionId).slice(0, 8)}…
              </Badge>
            )}
          </div>
        </div>
      </header>

      <main
        className="mx-auto max-w-6xl px-5 py-6 pb-24 lg:px-6 lg:py-10"
        data-testid="workspace-main"
      >
        <Card>
          <CardHeader className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
            <div>
              <CardTitle>Workspace</CardTitle>
              <CardDescription>
                Navigate flows, inspect traces, and review run artifacts.
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              {runRef ? (
                <Button variant="secondary" size="sm" onClick={() => setView("run")}>
                  View last run
                </Button>
              ) : (
                <Badge variant="outline">No run selected</Badge>
              )}
            </div>
          </CardHeader>
          <CardContent>
            <Tabs value={view} onValueChange={(v) => setView(v as View)}>
              <TabsList
                className="sticky top-0 z-20 mb-4 flex flex-wrap gap-2 bg-card/95 px-2 py-2 backdrop-blur supports-[backdrop-filter]:backdrop-blur"
                data-testid="workspace-tabs"
              >
                <TabsTrigger value="flows">Flows</TabsTrigger>
                <TabsTrigger value="errors">Error lab</TabsTrigger>
                <TabsTrigger value="logs">Logs</TabsTrigger>
                <TabsTrigger value="traces">Traces</TabsTrigger>
                <TabsTrigger value="constitution">Constitution</TabsTrigger>
                <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
                <TabsTrigger value="editor">Editor</TabsTrigger>
                <TabsTrigger value="debug">Debugger</TabsTrigger>
                <TabsTrigger value="workbench">Workbench</TabsTrigger>
                <TabsTrigger value="run" disabled={!runRef}>
                  Run detail
                </TabsTrigger>
              </TabsList>

              <TabsContent value="flows" className="border-none p-0">
                <FlowsPage onRunSelected={handleRunSelected} initialFlows={prefetchedFlows} />
              </TabsContent>
              <TabsContent value="errors" className="border-none p-0">
                <ErrorPlaygroundPage />
              </TabsContent>
              <TabsContent value="logs" className="border-none p-0">
                <LogsPage />
              </TabsContent>
              <TabsContent value="traces" className="border-none p-0">
                <TracesPage
                  initialRuns={prefetchedTraces}
                  onSelectRun={(id) => handleRunSelected({ sessionId: id, traceId: id })}
                />
              </TabsContent>
              <TabsContent value="constitution" className="border-none p-0">
                <ConstitutionPage />
              </TabsContent>
              <TabsContent value="run" className="border-none p-0">
                {runRef ? (
                  <RunDetailPage runRef={runRef} />
                ) : (
                  <p className="text-sm text-muted-foreground">Select a run to view details.</p>
                )}
              </TabsContent>
              <TabsContent value="dashboard" className="border-none p-0">
                <DashboardPage initialState={prefetchedDashboard} />
              </TabsContent>
              <TabsContent value="editor" className="border-none p-0">
                <EditorPage />
              </TabsContent>
              <TabsContent value="debug" className="border-none p-0">
                <DebugPage />
              </TabsContent>
              <TabsContent value="workbench" className="border-none p-0">
                <FlowWorkbenchPage />
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </main>
      <Toaster />
    </div>
  );
}
