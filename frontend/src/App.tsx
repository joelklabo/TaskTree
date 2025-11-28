import React from "react";
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
import { Input } from "./components/ui/input";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "./components/ui/tooltip";
import { Skeleton } from "./components/ui/skeleton";

const FlowsPage = React.lazy(() => import("./pages/FlowsPage"));
const RunDetailPage = React.lazy(() => import("./pages/RunDetailPage"));
const TracesPage = React.lazy(() => import("./pages/TracesPage"));
const DashboardPage = React.lazy(() => import("./pages/DashboardPage"));
const LogsPage = React.lazy(() => import("./pages/LogsPage"));
const ErrorPlaygroundPage = React.lazy(() => import("./pages/ErrorPlaygroundPage"));
const ConstitutionPage = React.lazy(() => import("./pages/ConstitutionPage"));
const EditorPage = React.lazy(() =>
  import("./pages/EditorPage").then((m) => ({ default: m.EditorPage })),
);
const DebugPage = React.lazy(() =>
  import("./pages/DebugPage").then((m) => ({ default: m.DebugPage })),
);
const FlowWorkbenchPage = React.lazy(() =>
  import("./pages/FlowWorkbenchPage").then((m) => ({ default: m.FlowWorkbenchPage })),
);
const StyleguidePage = React.lazy(() => import("./pages/StyleguidePage"));

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
  | "workbench"
  | "styleguide";
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
  if (trimmed === "styleguide") return "styleguide";
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

  const LoadingCard = () => (
    <div className="space-y-3 rounded-xl border bg-card/80 p-4">
      <Skeleton className="h-4 w-24" />
      <Skeleton className="h-6 w-48" />
      <Skeleton className="h-24 w-full" />
    </div>
  );

  return (
    <div className="relative min-h-screen bg-gradient-to-b from-slate-50 via-white to-slate-100 text-foreground">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-primary focus:px-4 focus:py-2 focus:text-primary-foreground"
      >
        Skip to content
      </a>
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -left-24 top-[-8%] h-64 w-64 rounded-full bg-primary/10 blur-3xl" />
        <div className="absolute right-[-12%] top-[24%] h-52 w-52 rounded-full bg-indigo-200/60 blur-2xl" />
        <div className="absolute bottom-[-10%] left-[20%] h-72 w-72 rounded-full bg-cyan-100/60 blur-3xl" />
      </div>

      <header className="border-b bg-white/80 backdrop-blur-lg">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <button
            type="button"
            data-testid="app-logo"
            className="flex items-center gap-3 rounded-md px-1 py-1 transition hover:bg-slate-100"
            onClick={() => setView("flows")}
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-primary-foreground font-semibold shadow-sm">
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
        id="main-content"
        className="relative mx-auto max-w-6xl px-5 py-6 pb-24 lg:px-6 lg:py-10"
        data-testid="workspace-main"
      >
        <section
          data-testid="workspace-hero"
          className="mb-6 overflow-hidden rounded-2xl border bg-white/90 shadow-sm backdrop-blur supports-[backdrop-filter]:backdrop-blur"
        >
          <div className="flex flex-col gap-4 border-b border-border/60 p-5 md:flex-row md:items-center md:justify-between">
            <div className="space-y-1">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">
                Workspace
              </p>
              <h2 className="text-3xl font-semibold tracking-tight">Flows and traces hub</h2>
              <p className="text-sm text-muted-foreground">
                Stay oriented with quick search, live status, and fast navigation.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <TooltipProvider delayDuration={150}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      data-testid="command-menu-button"
                      variant="secondary"
                      size="sm"
                      className="gap-2"
                    >
                      Command
                      <kbd className="rounded-md border bg-white px-1.5 text-[11px] font-medium text-muted-foreground shadow-sm">
                        ⌘K
                      </kbd>
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Open the command palette</TooltipContent>
                </Tooltip>
              </TooltipProvider>
              <Button variant="default" size="sm" onClick={() => setView("flows")}>
                New flow
              </Button>
              <Button variant="outline" size="sm" onClick={() => setView("traces")}>
                See traces
              </Button>
            </div>
          </div>
          <div className="grid gap-3 p-5 md:grid-cols-[1.3fr,0.7fr]">
            <div className="flex flex-col gap-3 rounded-xl border bg-background/80 p-3 shadow-inner">
              <label className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                Quick search
              </label>
              <Input
                data-testid="workspace-omnibox"
                placeholder="Search flows, traces, or runs"
                aria-label="Search flows, traces, or runs"
              />
              <p className="text-xs text-muted-foreground">
                Type a flow name, trace ID, or session to jump to the right tab.
              </p>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-xl border bg-white p-3 shadow-inner">
                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                  Last activity
                </p>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  {liveRun ? (
                    <Badge variant="default" className="animate-pulse">
                      Live: {liveRun.sessionId.slice(0, 8)}{" "}
                      {liveRun.step ? `· ${liveRun.step}` : ""}
                    </Badge>
                  ) : (
                    <Badge variant="secondary">No live runs</Badge>
                  )}
                  {runRef ? (
                    <Badge variant="outline">
                      Last run {(runRef.traceId || runRef.sessionId).slice(0, 8)}…
                    </Badge>
                  ) : (
                    <Badge variant="outline">No run selected</Badge>
                  )}
                </div>
              </div>
              <div className="rounded-xl border bg-white p-3 shadow-inner">
                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                  Shortcuts
                </p>
                <div className="mt-2 space-y-1 text-sm text-muted-foreground">
                  <div className="flex items-center justify-between rounded-lg border bg-slate-50 px-3 py-2">
                    <span>Command menu</span>
                    <kbd className="rounded-md border bg-white px-1.5 text-[11px] font-medium text-slate-600 shadow-sm">
                      ⌘K
                    </kbd>
                  </div>
                  <div className="flex items-center justify-between rounded-lg border bg-slate-50 px-3 py-2">
                    <span>Jump to traces</span>
                    <kbd className="rounded-md border bg-white px-1.5 text-[11px] font-medium text-slate-600 shadow-sm">
                      ⇧T
                    </kbd>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <Card className="border bg-white/90 shadow-sm backdrop-blur supports-[backdrop-filter]:backdrop-blur">
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
                <TabsTrigger value="styleguide">Styleguide</TabsTrigger>
              </TabsList>

              <TabsContent value="flows" className="border-none p-0">
                <React.Suspense fallback={<LoadingCard />}>
                  <FlowsPage onRunSelected={handleRunSelected} initialFlows={prefetchedFlows} />
                </React.Suspense>
              </TabsContent>
              <TabsContent value="errors" className="border-none p-0">
                <React.Suspense fallback={<LoadingCard />}>
                  <ErrorPlaygroundPage />
                </React.Suspense>
              </TabsContent>
              <TabsContent value="logs" className="border-none p-0">
                <React.Suspense fallback={<LoadingCard />}>
                  <LogsPage />
                </React.Suspense>
              </TabsContent>
              <TabsContent value="traces" className="border-none p-0">
                <React.Suspense fallback={<LoadingCard />}>
                  <TracesPage
                    initialRuns={prefetchedTraces}
                    onSelectRun={(id) => handleRunSelected({ sessionId: id, traceId: id })}
                  />
                </React.Suspense>
              </TabsContent>
              <TabsContent value="constitution" className="border-none p-0">
                <React.Suspense fallback={<LoadingCard />}>
                  <ConstitutionPage />
                </React.Suspense>
              </TabsContent>
              <TabsContent value="run" className="border-none p-0">
                <React.Suspense fallback={<LoadingCard />}>
                  {runRef ? (
                    <RunDetailPage runRef={runRef} />
                  ) : (
                    <p className="text-sm text-muted-foreground">Select a run to view details.</p>
                  )}
                </React.Suspense>
              </TabsContent>
              <TabsContent value="dashboard" className="border-none p-0">
                <React.Suspense fallback={<LoadingCard />}>
                  <DashboardPage initialState={prefetchedDashboard} />
                </React.Suspense>
              </TabsContent>
              <TabsContent value="editor" className="border-none p-0">
                <React.Suspense fallback={<LoadingCard />}>
                  <EditorPage />
                </React.Suspense>
              </TabsContent>
              <TabsContent value="debug" className="border-none p-0">
                <React.Suspense fallback={<LoadingCard />}>
                  <DebugPage />
                </React.Suspense>
              </TabsContent>
              <TabsContent value="workbench" className="border-none p-0">
                <React.Suspense fallback={<LoadingCard />}>
                  <FlowWorkbenchPage />
                </React.Suspense>
              </TabsContent>
              <TabsContent value="styleguide" className="border-none p-0">
                <React.Suspense fallback={<LoadingCard />}>
                  <StyleguidePage />
                </React.Suspense>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </main>
      <Toaster />
    </div>
  );
}
