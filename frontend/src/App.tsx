import React from "react";
import ConstitutionPage from "./pages/ConstitutionPage";
import FlowsPage from "./pages/FlowsPage";
import RunDetailPage from "./pages/RunDetailPage";
import TracesPage from "./pages/TracesPage";
import { Button } from "./components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./components/ui/tabs";
import { Badge } from "./components/ui/badge";
import { Toaster } from "./components/ui/toaster";

type View = "flows" | "run" | "constitution" | "traces";
type RunRef = { sessionId: string; traceId?: string };

export default function App() {
  const [view, setView] = React.useState<View>("flows");
  const [runRef, setRunRef] = React.useState<RunRef | null>(null);

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

      <main className="mx-auto max-w-6xl px-6 py-6 lg:py-8">
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
              <TabsList className="mb-4">
                <TabsTrigger value="flows">Flows</TabsTrigger>
                <TabsTrigger value="traces">Traces</TabsTrigger>
                <TabsTrigger value="constitution">Constitution</TabsTrigger>
                <TabsTrigger value="run" disabled={!runRef}>
                  Run detail
                </TabsTrigger>
              </TabsList>

              <TabsContent value="flows" className="border-none p-0">
                <FlowsPage onRunSelected={handleRunSelected} />
              </TabsContent>
              <TabsContent value="traces" className="border-none p-0">
                <TracesPage
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
            </Tabs>
          </CardContent>
        </Card>
      </main>
      <Toaster />
    </div>
  );
}
