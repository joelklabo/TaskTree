import React from "react";
import { fetchLogSources } from "../api/client";
import { LogViewer } from "../components/LogViewer";
import { Button } from "../components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "../components/ui/alert";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Skeleton } from "../components/ui/skeleton";

export default function LogsPage() {
  const [sources, setSources] = React.useState<Array<{ name: string; size: number }>>([]);
  const [selectedSources, setSelectedSources] = React.useState<Set<string>>(new Set());
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    fetchLogSources()
      .then((data) => {
        if (!Array.isArray(data)) {
          throw new Error("Unexpected response from /logs/sources");
        }
        setSources(data);
        if (data.length > 0) {
          // Default to "all logs" just like `./tt watch`
          setSelectedSources(new Set(data.map((s) => s.name)));
        }
      })
      .catch((err: unknown) =>
        setError(err instanceof Error ? err.message : "Unable to load log sources"),
      );
  }, []);

  const toggleSource = (name: string) => {
    const next = new Set(selectedSources);
    if (next.has(name)) {
      next.delete(name);
    } else {
      next.add(name);
    }
    setSelectedSources(next);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold tracking-tight">Logs</h2>
          <p className="text-sm text-muted-foreground">Live stream of backend and agent logs.</p>
        </div>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertTitle>Log error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="grid gap-3 md:grid-cols-[220px,1fr]">
        <Card className="h-fit">
          <CardHeader>
            <CardTitle className="text-sm">Sources</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {sources.length === 0 && <Skeleton className="h-8 w-full" />}
            {sources.length > 0 && (
              <Button
                variant={
                  selectedSources.size === sources.length && sources.length > 0
                    ? "secondary"
                    : "outline"
                }
                className="w-full justify-start"
                onClick={() => {
                  if (selectedSources.size === sources.length) {
                    setSelectedSources(new Set());
                  } else {
                    setSelectedSources(new Set(sources.map((s) => s.name)));
                  }
                }}
              >
                All logs (./tt watch)
              </Button>
            )}
            {sources.map((src) => (
              <Button
                key={src.name}
                variant={selectedSources.has(src.name) ? "secondary" : "ghost"}
                className="w-full justify-start"
                onClick={() => toggleSource(src.name)}
              >
                <span className="truncate">{src.name}</span>
              </Button>
            ))}
          </CardContent>
        </Card>

        <div className="space-y-4">
          {selectedSources.size > 0 ? (
            <LogViewer sources={Array.from(selectedSources)} initialLines={50} className="h-full" />
          ) : (
            <Card>
              <CardContent className="p-8 text-center text-muted-foreground">
                Select one or more log sources to view live stream.
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
