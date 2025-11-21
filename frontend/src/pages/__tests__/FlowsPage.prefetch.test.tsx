import React from "react";
import { render, screen } from "@testing-library/react";
import { vi } from "vitest";
import type { Mock } from "vitest";
import FlowsPage from "../FlowsPage";
import type { FlowSummary } from "../../api/client";

vi.mock("../../api/client", async () => {
  const actual = await vi.importActual<typeof import("../../api/client")>("../../api/client");
  return { ...actual, fetchFlows: vi.fn(() => Promise.resolve([] as FlowSummary[])) };
});

describe("FlowsPage prefetch", () => {
  it("renders provided flows without triggering a fetch", async () => {
    const initial = [{ id: "log_error_handler", description: "Handles log errors" }];
    const { fetchFlows } = await import("../../api/client");

    render(<FlowsPage onRunSelected={() => {}} initialFlows={initial} />);

    expect(screen.getByText("log_error_handler")).toBeInTheDocument();
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const fetchFlowsMock: Mock = fetchFlows as unknown as Mock;
    expect(fetchFlowsMock).not.toHaveBeenCalled();
  });
});
