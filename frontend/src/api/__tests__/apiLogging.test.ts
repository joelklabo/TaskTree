import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { waitFor } from "@testing-library/react";
import * as client from "../client";

describe("api error logging interceptor", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    client.__setLogClientErrorForTest(client.logClientError as any);
    vi.restoreAllMocks();
  });

  it("logs server errors with context", async () => {
    const logSpy = vi.fn().mockResolvedValue({ status: "ok", log_file: "debug.log" });
    client.__setLogClientErrorForTest(logSpy as any);

    const handler = (client.apiClient as any).interceptors.response.handlers[0]?.rejected;
    expect(typeof handler).toBe("function");

    try {
      await handler({
        message: "server boom",
        config: { url: "/api/flows/", method: "get" },
        response: { status: 500 },
        stack: "stack",
      });
    } catch {
      // interceptor rethrows; swallow for assertion
    }

    await waitFor(() => {
      expect(logSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          name: "ApiError",
          context: expect.objectContaining({ url: "/api/flows/", status: 500, method: "get" }),
        }),
      );
    });
  });

  it("avoids recursive logging on logging endpoint", async () => {
    const logSpy = vi.fn().mockResolvedValue({ status: "ok", log_file: "debug.log" });
    client.__setLogClientErrorForTest(logSpy as any);

    const handler = (client.apiClient as any).interceptors.response.handlers[0]?.rejected;
    expect(typeof handler).toBe("function");

    try {
      await handler({
        message: "noop",
        config: { url: "/api/debug/log-client-error", method: "post" },
        response: { status: 500 },
      });
    } catch {
      /* ignore */
    }

    // Should skip logging for the logging endpoint itself
    expect(logSpy).not.toHaveBeenCalled();
  });
});
