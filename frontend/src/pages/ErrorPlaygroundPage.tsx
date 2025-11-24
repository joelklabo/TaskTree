import React from "react";
import { logClientError } from "../api/client";
import { Alert, AlertDescription, AlertTitle } from "../components/ui/alert";
import { Badge } from "../components/ui/badge";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";
import { CodeEditor } from "../components/CodeEditor";
import axios from "axios";

type Status =
  | { state: "idle" }
  | { state: "sending" }
  | { state: "success"; logFile: string }
  | { state: "error"; message: string };

type BackendErrorType =
  | "type_error"
  | "value_error"
  | "key_error"
  | "zero_division"
  | "attribute_error";

type ParsedError = {
  error_type: string;
  error_message: string;
  file_path: string;
  line_number: number;
  function_name: string;
  full_traceback: string;
  context_before: string[];
  context_after: string[];
};

type InvestigationResult = {
  prompt: string;
  raw_response: string;
  parsed: unknown;
  result: {
    status: string;
    output: string;
    metrics: Record<string, unknown>;
    learnings: string[];
    label?: string;
  };
};

export default function ErrorPlaygroundPage() {
  const [errorName, setErrorName] = React.useState("ClientPlaygroundError");
  const [message, setMessage] = React.useState("Frontend demo error triggered from the UI");
  const [contextInput, setContextInput] = React.useState('{"path": "/flows", "synthetic": true}');
  const [shouldThrow, setShouldThrow] = React.useState(false);
  const [status, setStatus] = React.useState<Status>({ state: "idle" });

  // Backend error investigation state
  const [backendErrorType, setBackendErrorType] = React.useState<BackendErrorType>("type_error");
  const [parsedError, setParsedError] = React.useState<ParsedError | null>(null);
  const [triggerLoading, setTriggerLoading] = React.useState(false);
  const [investigateLoading, setInvestigateLoading] = React.useState(false);
  const [investigation, setInvestigation] = React.useState<InvestigationResult | null>(null);

  const handleTriggerBackendError = async () => {
    setTriggerLoading(true);
    setParsedError(null);
    setInvestigation(null);

    try {
      // Trigger the error
      await axios.get(`/api/debug/trigger-error?error_type=${backendErrorType}`);

      // Wait a moment for it to be written to log
      await new Promise((resolve) => setTimeout(resolve, 500));

      // Read the log to get the traceback
      const logsRes = await axios.get("/api/logs/tail", {
        params: {
          source: "backend-dev.log",
          lines: 50,
        },
      });

      // Parse the log to extract error details
      const logText = logsRes.data.content;

      // Simple parsing - look for the traceback
      const tracebackMatch = logText.match(
        /Traceback \(most recent call last\):[\s\S]+?(?=\n\d{4}-|\n$|$)/,
      );
      if (!tracebackMatch) {
        throw new Error("Could not find traceback in logs");
      }

      const traceback = tracebackMatch[0];
      const lines = traceback.split("\n");

      // Extract error type and message from last line
      const lastLine = lines[lines.length - 1];
      const [errorType, ...messageParts] = lastLine.split(":");
      const errorMessage = messageParts.join(":").trim();

      // Extract file, line, function from the last "File" line
      const fileLines = lines.filter((l) => l.includes('File "'));
      const lastFileLine = fileLines[fileLines.length - 1];
      const fileMatch = lastFileLine.match(/File "([^"]+)", line (\d+), in (.+)/);

      if (!fileMatch) {
        throw new Error("Could not parse file/line/function");
      }

      const [, filePath, lineNumber, functionName] = fileMatch;

      const parsed: ParsedError = {
        error_type: errorType.trim(),
        error_message: errorMessage,
        file_path: filePath,
        line_number: parseInt(lineNumber),
        function_name: functionName.trim(),
        full_traceback: traceback,
        context_before: [],
        context_after: [],
      };

      setParsedError(parsed);
    } catch (error) {
      console.error("Failed to trigger/parse error:", error);
      alert(`Failed: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setTriggerLoading(false);
    }
  };

  const handleInvestigate = async () => {
    if (!parsedError) return;

    setInvestigateLoading(true);
    setInvestigation(null);

    try {
      const res = await axios.post("/api/workbench/step", {
        agent_id: "codex_cli",
        action: "investigate",
        input: {
          error_details: parsedError,
        },
        agent_config_override: {
          prompt_map: { investigate: "error_investigate.j2" },
          llm_enabled: false,
        },
      });

      setInvestigation(res.data);
    } catch (error) {
      console.error("Investigation failed:", error);
      alert(`Investigation failed: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setInvestigateLoading(false);
    }
  };

  const handleSubmit = async (evt: React.FormEvent<HTMLFormElement>) => {
    evt.preventDefault();
    setStatus({ state: "sending" });

    let parsedContext: Record<string, unknown> | undefined;
    if (contextInput.trim()) {
      try {
        parsedContext = JSON.parse(contextInput);
      } catch {
        setStatus({ state: "error", message: "Context must be valid JSON" });
        return;
      }
    }

    const err = new Error(message || "Frontend demo error");
    if (errorName) {
      err.name = errorName;
    }

    console.error("[Error playground] simulated error", err);

    try {
      const res = await logClientError({
        message: err.message,
        name: err.name,
        stack: err.stack || "",
        context: parsedContext,
        user_agent: typeof navigator !== "undefined" ? navigator.userAgent : undefined,
      });

      if (shouldThrow) {
        // Throw asynchronously so the UI can render the success state first.
        setTimeout(() => {
          throw err;
        }, 0);
      }

      setStatus({ state: "success", logFile: res.log_file });
    } catch (submitErr) {
      const description =
        submitErr instanceof Error ? submitErr.message : "Unable to send error to backend";
      setStatus({ state: "error", message: description });
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <div>
          <h2 className="text-lg font-semibold tracking-tight">Error lab</h2>
          <p className="text-sm text-muted-foreground">
            Craft a client-side error, send it to the backend log, and let the autonomous flow pick
            it up.
          </p>
        </div>
        <Badge variant="secondary">frontend → /api/debug/log-client-error</Badge>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Simulate a client error</CardTitle>
          <CardDescription>
            This posts to the backend debug logger so the log watcher can trigger{" "}
            <code>log_error_handler</code>.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form className="space-y-4" onSubmit={handleSubmit}>
            <div className="grid gap-3 md:grid-cols-2">
              <label className="space-y-1">
                <span className="text-sm font-medium">Error name</span>
                <input
                  className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm shadow-sm"
                  value={errorName}
                  onChange={(e) => setErrorName(e.target.value)}
                  placeholder="TypeError"
                />
              </label>
              <label className="space-y-1">
                <span className="text-sm font-medium">Error message</span>
                <input
                  className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm shadow-sm"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Something went wrong…"
                  required
                />
              </label>
            </div>

            <label className="space-y-1 block" htmlFor="error-context">
              <span className="text-sm font-medium">Context (JSON, optional)</span>
            </label>
            <CodeEditor
              textareaId="error-context"
              value={contextInput}
              onValueChange={setContextInput}
              language="json"
              enableLint
              placeholder='{"path": "/flows", "notes": "what were you doing?"}'
            />

            <div className="flex items-center gap-3">
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  className="h-4 w-4 rounded border-border"
                  checked={shouldThrow}
                  onChange={(e) => setShouldThrow(e.target.checked)}
                />
                Also throw in the browser (logs to console, may break current view)
              </label>
            </div>

            <div className="flex items-center gap-3">
              <Button type="submit" disabled={status.state === "sending"}>
                {status.state === "sending" ? "Sending…" : "Send to backend log"}
              </Button>
              {status.state === "success" && (
                <Badge variant="outline">Logged to {status.logFile}</Badge>
              )}
            </div>

            {status.state === "error" && (
              <Alert variant="destructive" role="alert">
                <AlertTitle>Unable to log client error</AlertTitle>
                <AlertDescription>{status.message}</AlertDescription>
              </Alert>
            )}
          </form>
        </CardContent>
      </Card>

      {/* Backend Error Investigation */}
      <Card>
        <CardHeader>
          <CardTitle>Backend Error Investigation</CardTitle>
          <CardDescription>
            Trigger a backend error, parse it, and run the investigation step
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-3">
            <label className="text-sm font-medium">Error Type:</label>
            <select
              className="rounded-md border border-border bg-background px-3 py-2 text-sm"
              value={backendErrorType}
              onChange={(e) => setBackendErrorType(e.target.value as BackendErrorType)}
            >
              <option value="type_error">TypeError</option>
              <option value="value_error">ValueError</option>
              <option value="key_error">KeyError</option>
              <option value="zero_division">ZeroDivisionError</option>
              <option value="attribute_error">AttributeError</option>
            </select>
            <Button onClick={handleTriggerBackendError} disabled={triggerLoading}>
              {triggerLoading ? "Triggering..." : "1. Trigger Error"}
            </Button>
            {parsedError && (
              <Button onClick={handleInvestigate} disabled={investigateLoading} variant="secondary">
                {investigateLoading ? "Investigating..." : "2. Investigate"}
              </Button>
            )}
          </div>

          {parsedError && (
            <div className="space-y-2">
              <h3 className="text-sm font-semibold">Parsed Error:</h3>
              <CodeEditor
                value={JSON.stringify(parsedError, null, 2)}
                onValueChange={() => {}}
                language="json"
                readOnly
                className="h-48"
              />
            </div>
          )}

          {investigation && (
            <div className="space-y-2">
              <h3 className="text-sm font-semibold">Investigation Result:</h3>
              <div className="grid gap-2">
                <div>
                  <h4 className="text-xs font-medium text-muted-foreground mb-1">
                    Rendered Prompt:
                  </h4>
                  <CodeEditor
                    value={investigation.prompt}
                    onValueChange={() => {}}
                    language="yaml"
                    readOnly
                    className="h-32"
                  />
                </div>
                <div>
                  <h4 className="text-xs font-medium text-muted-foreground mb-1">LLM Response:</h4>
                  <CodeEditor
                    value={investigation.raw_response}
                    onValueChange={() => {}}
                    language="json"
                    readOnly
                    className="h-32"
                  />
                </div>
                <div>
                  <h4 className="text-xs font-medium text-muted-foreground mb-1">Parsed Output:</h4>
                  <CodeEditor
                    value={JSON.stringify(investigation.result, null, 2)}
                    onValueChange={() => {}}
                    language="json"
                    readOnly
                    className="h-32"
                  />
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
