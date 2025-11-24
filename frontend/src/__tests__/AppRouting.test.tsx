import React from "react";
import { render, screen, waitFor, act } from "@testing-library/react";
import { vi } from "vitest";
import App from "../App";
import stateFixture from "./fixtures/dashboard_state.json";

// TODO: Re-enable once router mount no longer hangs under Vitest (EventSource/log polling).
describe.skip("App routing from path", () => {
  beforeEach(() => {
    vi.stubGlobal(
      "fetch",
      vi.fn((url: RequestInfo | URL) => {
        const href = typeof url === "string" ? url : url.toString();
        if (href.includes("/dashboard_state.json") || href.includes("/tmp/dashboard_state.json")) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve(stateFixture),
          } as Response);
        }
        if (href.includes("/api/logs/events")) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ events: [] }),
          } as Response);
        }
        if (href.includes("/api/health")) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ status: "ok" }),
          } as Response);
        }
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve([]),
        } as Response);
      }),
    );
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("shows dashboard view when path is /dashboard", async () => {
    window.history.pushState({}, "", "/dashboard");
    render(<App />);
    await waitFor(() => expect(screen.getByText(/Dashboard \(shared state\)/i)).toBeVisible());
    expect(screen.getByText(/Env:/i)).toBeVisible();
    expect(window.location.pathname).toBe("/dashboard");
  });

  it("navigates back to flows when clicking the logo", async () => {
    window.history.pushState({}, "", "/dashboard");
    render(<App />);

    await waitFor(() => expect(screen.getByText(/Dashboard \(shared state\)/i)).toBeVisible());
    const logo = screen.getByTestId("app-logo");
    await act(async () => {
      logo.click();
    });

    await waitFor(() =>
      expect(screen.getByRole("tab", { name: "Flows" })).toHaveAttribute("data-state", "active"),
    );
    expect(window.location.pathname).toBe("/");
  });
});
