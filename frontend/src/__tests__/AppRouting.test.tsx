import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import { vi } from "vitest";
import App from "../App";
import stateFixture from "./fixtures/dashboard_state.json";

describe("App routing from path", () => {
  beforeEach(() => {
    vi.stubGlobal(
      "fetch",
      vi.fn(() =>
        Promise.resolve({
          ok: true,
          json: () => Promise.resolve(stateFixture),
        }),
      ),
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
});
