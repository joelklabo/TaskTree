import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import { vi } from "vitest";
import App from "../App";
import stateFixture from "./fixtures/dashboard_state.json";

describe("App layout polish", () => {
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

  it("keeps workspace tabs sticky and leaves room for footer content", async () => {
    render(<App />);

    const tabs = await screen.findByTestId("workspace-tabs");
    expect(tabs.className).toMatch(/sticky/);
    expect(tabs.className).toMatch(/top-/);

    const main = screen.getByTestId("workspace-main");
    expect(main.className).toMatch(/pb-2[024]/); // generous padding for scroll
    expect(main.className).toMatch(/max-w-6xl/);

    await waitFor(() => expect(screen.getByText(/Workspace/)).toBeInTheDocument());
  });
});
