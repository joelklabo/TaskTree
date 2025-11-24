import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { waitFor } from "@testing-library/react";
import { attachClientErrorLogger, __resetClientErrorLoggerForTest } from "../lib/clientErrorLogger";
import * as clientApi from "../api/client";

describe("clientErrorLogger", () => {
  const originalAddEventListener = window.addEventListener;
  const listeners: Record<string, Array<(payload: any) => void>> = {};

  beforeEach(() => {
    __resetClientErrorLoggerForTest();
    listeners.error = [];
    listeners.unhandledrejection = [];
    vi.spyOn(window, "addEventListener").mockImplementation((type: any, listener: any) => {
      if (!listeners[type]) listeners[type] = [];
      listeners[type].push(listener);
      return undefined as any;
    });
    vi.spyOn(clientApi, "logClientError").mockResolvedValue({
      status: "ok",
      log_file: "debug.log",
    } as any);
    attachClientErrorLogger();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    window.addEventListener = originalAddEventListener;
  });

  it("logs window errors to backend", async () => {
    const err = new Error("boom");
    listeners.error.forEach((fn) =>
      fn({ message: "boom", filename: "test.js", lineno: 1, colno: 2, error: err }),
    );
    await waitFor(() => {
      expect(clientApi.logClientError).toHaveBeenCalledWith(
        expect.objectContaining({
          message: "boom",
          name: "Error",
        }),
      );
    });
  });

  it("logs unhandled rejections to backend", async () => {
    const reason = new Error("reject");
    listeners.unhandledrejection.forEach((fn) =>
      fn({
        reason,
        promise: Promise.resolve(),
        type: "unhandledrejection",
        preventDefault: () => {},
      }),
    );
    await waitFor(() => {
      expect(clientApi.logClientError).toHaveBeenCalledWith(
        expect.objectContaining({
          message: "reject",
          name: "Error",
        }),
      );
    });
  });
});
