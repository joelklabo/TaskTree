import React from "react";
import { streamLogs } from "../api/client";
import { Button } from "./ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";

interface LogViewerProps {
  sources: string[];
  initialLines?: number;
  contains?: string;
  className?: string;
}

const COLORS = [
  "text-cyan-400",
  "text-green-400",
  "text-yellow-400",
  "text-blue-400",
  "text-purple-400",
];

export function LogViewer({ sources, initialLines = 50, contains, className }: LogViewerProps) {
  const [lines, setLines] = React.useState<Array<{ source: string; line: string }>>([]);
  const [connected, setConnected] = React.useState(false);
  const [autoScroll, setAutoScroll] = React.useState(true);
  const scrollRef = React.useRef<HTMLDivElement>(null);
  const streamRef = React.useRef<EventSource | null>(null);

  // Assign a stable color index to each source
  const sourceColorMap = React.useMemo(() => {
    const map = new Map<string, string>();
    sources.forEach((src, i) => {
      map.set(src, COLORS[i % COLORS.length]);
    });
    return map;
  }, [sources]);

  React.useEffect(() => {
    if (sources.length === 0) return;

    // Close existing stream
    if (streamRef.current) {
      streamRef.current.close();
    }

    setLines([]); // Clear lines on source change
    setConnected(false);

    const es = streamLogs({
      sources,
      tail_lines: initialLines,
      contains,
      interval: 0.5,
    });

    es.onopen = () => setConnected(true);

    es.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === "log_line") {
          setLines((prev) => [...prev, { source: data.source, line: data.line }].slice(-2000));
        }
      } catch {
        // ignore
      }
    };

    es.onerror = () => {
      setConnected(false);
      // EventSource auto-reconnects, but we can handle specific errors here if needed
    };

    streamRef.current = es;

    return () => {
      es.close();
    };
  }, [sources, initialLines, contains]);

  // Auto-scroll
  React.useEffect(() => {
    if (autoScroll && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [lines, autoScroll]);

  const handleScroll = () => {
    if (!scrollRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = scrollRef.current;
    const isAtBottom = Math.abs(scrollHeight - clientHeight - scrollTop) < 50;
    setAutoScroll(isAtBottom);
  };

  return (
    <Card className={className}>
      <CardHeader className="flex flex-row items-center justify-between py-2">
        <CardTitle className="text-sm font-medium">
          Live Logs{" "}
          {connected ? (
            <span className="text-green-500">●</span>
          ) : (
            <span className="text-red-500">●</span>
          )}
        </CardTitle>
        <div className="flex gap-2">
          <Button variant="ghost" size="sm" className="h-6 text-xs" onClick={() => setLines([])}>
            Clear
          </Button>
          <Button
            variant={autoScroll ? "secondary" : "ghost"}
            size="sm"
            className="h-6 text-xs"
            onClick={() => setAutoScroll(!autoScroll)}
          >
            {autoScroll ? "Auto-scroll On" : "Auto-scroll Off"}
          </Button>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <div
          ref={scrollRef}
          onScroll={handleScroll}
          className="h-[400px] overflow-y-auto bg-black/90 p-4 font-mono text-xs leading-relaxed"
        >
          {lines.length === 0 ? (
            <div className="text-muted-foreground italic">Waiting for logs...</div>
          ) : (
            lines.map((l, i) => (
              <div key={i} className="whitespace-pre-wrap break-all">
                <span
                  className={`${sourceColorMap.get(l.source) || "text-gray-400"} font-bold mr-2`}
                >
                  [{l.source}]
                </span>
                <span className="text-gray-300">{l.line}</span>
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
}
