import { logClientError } from "@/api/client";

let attached = false;

export function attachClientErrorLogger(): void {
  if (attached) return;
  attached = true;

  const handler = (
    message: string,
    source?: string,
    lineno?: number,
    colno?: number,
    error?: Error,
  ) => {
    void logClientError({
      message: message?.toString() ?? "Unknown error",
      name: error?.name ?? "Error",
      stack: error?.stack,
      context: {
        source,
        lineno,
        colno,
        href: window.location.href,
      },
      user_agent: navigator.userAgent,
    }).catch(() => {
      // swallow errors to avoid loops
    });
  };

  const rejectionHandler = (event: PromiseRejectionEvent) => {
    try {
      const reason = event.reason;
      const message =
        typeof reason === "string" ? reason : (reason?.message ?? "Unhandled promise rejection");
      const name = reason?.name ?? "UnhandledRejection";
      const stack =
        reason && typeof reason === "object" && "stack" in reason
          ? String((reason as { stack?: unknown }).stack || "") || undefined
          : undefined;
      void logClientError({
        message,
        name,
        stack,
        context: {
          href: window.location.href,
        },
        user_agent: navigator.userAgent,
      }).catch(() => {
        /* ignore */
      });
    } catch {
      // ignore
    }
  };

  window.addEventListener("error", (event) => {
    handler(event.message, event.filename, event.lineno, event.colno, event.error);
  });
  window.addEventListener("unhandledrejection", (event) => rejectionHandler(event));
}

// Test hook
export function __resetClientErrorLoggerForTest(): void {
  attached = false;
}
