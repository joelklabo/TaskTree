import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import { vi } from "vitest";
import App from "../App";
import stateFixture from "./fixtures/dashboard_state.json";

describe("App layout polish", () => {
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

  it("keeps workspace tabs sticky and leaves room for footer content", async () => {
    render(<App />);

    const tabs = await screen.findByTestId("workspace-tabs");
    expect(tabs.className).toMatch(/sticky/);
    expect(tabs.className).toMatch(/top-/);

    const main = screen.getByTestId("workspace-main");
    expect(main.className).toMatch(/pb-2[024]/); // generous padding for scroll
    expect(main.className).toMatch(/max-w-6xl/);

    await waitFor(() => expect(screen.getAllByText(/Workspace/).length).toBeGreaterThan(0));
  });

  it("exposes the upgraded shell toolbar with search and quick actions", async () => {
    render(<App />);

    const search = await screen.findByPlaceholderText(/search flows, traces/i);
    expect(search).toBeInTheDocument();

    const commandButton = screen.getByTestId("command-menu-button");
    expect(commandButton).toHaveTextContent(/Command/i);

    const hero = screen.getByTestId("workspace-hero");
    expect(hero).toBeInTheDocument();
    expect(hero.className).toMatch(/gradient|glass|backdrop/i);
  });
});
