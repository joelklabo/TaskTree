import React from "react";
import ConstitutionPage from "./pages/ConstitutionPage";
import FlowsPage from "./pages/FlowsPage";
import RunDetailPage from "./pages/RunDetailPage";
import TracesPage from "./pages/TracesPage";
import DashboardPage from "./pages/DashboardPage";
import { fetchFlows, fetchTraces } from "./api/client";
import dashboardFixture from "./__tests__/fixtures/dashboard_state.json";
import { Button } from "./components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./components/ui/tabs";
import { Badge } from "./components/ui/badge";
import { Toaster } from "./components/ui/toaster";

type View = "flows" | "run" | "constitution" | "traces" | "dashboard";
type RunRef = { sessionId: string; traceId?: string };

const pathToView = (path: string): View => {
  const trimmed = path.replace(/^\/+|\/+$/g, "");
  if (trimmed === "traces") return "traces";
  if (trimmed === "constitution") return "constitution";
  if (trimmed === "dashboard") return "dashboard";
  if (trimmed === "run") return "run";
  return "flows";
};

export default function App() {
  const initialView = pathToView(window.location.pathname);
  const [view, setView] = React.useState<View>(initialView);
  const [runRef, setRunRef] = React.useState<RunRef | null>(null);
  const [prefetchedFlows, setPrefetchedFlows] =
    React.useState<typeof fetchFlows extends () => Promise<infer R> ? R : [] | null>(null);
  const [prefetchedTraces, setPrefetchedTraces] =
    React.useState<typeof fetchTraces extends () => Promise<infer R> ? R : [] | null>(null);
  const [prefetchedDashboard, setPrefetchedDashboard] = React.useState<
    typeof dashboardFixture | null
  >(null);

  React.useEffect(() => {
    const onPop = () => setView(pathToView(window.location.pathname));
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);

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
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-primary-foreground font-semibold">
              TT
            </div>
            <div>
              <h1 className="text-xl font-semibold tracking-tight">TaskTree</h1>
              <p className="text-sm text-muted-foreground">
                Flows, traces, and artifacts at a glance.
              </p>
            </div>
          </div>
          {runRef && (
            <Badge variant="secondary" className="hidden sm:inline-flex">
              Last run: {(runRef.traceId || runRef.sessionId).slice(0, 8)}…
            </Badge>
          )}
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
                <TabsTrigger value="traces">Traces</TabsTrigger>
                <TabsTrigger value="constitution">Constitution</TabsTrigger>
                <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
                <TabsTrigger value="run" disabled={!runRef}>
                  Run detail
                </TabsTrigger>
              </TabsList>

              <TabsContent value="flows" className="border-none p-0">
                <FlowsPage onRunSelected={handleRunSelected} initialFlows={prefetchedFlows} />
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
            </Tabs>
          </CardContent>
        </Card>
      </main>
      <Toaster />
    </div>
  );
}
