import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import { vi } from "vitest";
import ConstitutionPage from "../ConstitutionPage";
import type { Constitution } from "../../api/client";

const mockFetchConstitution = vi.hoisted(() => vi.fn<() => Promise<Constitution>>());

vi.mock("../../api/client", async () => {
  const actual = await vi.importActual<typeof import("../../api/client")>("../../api/client");
  return { ...actual, fetchConstitution: mockFetchConstitution };
});

describe("ConstitutionPage", () => {
  beforeEach(() => {
    mockFetchConstitution.mockReset();
  });

  it("renders task states, ownership, and protected paths", async () => {
    mockFetchConstitution.mockResolvedValue({
      task_states: {
        states: ["TODO", "IN_PROGRESS"],
        transitions: { TODO: { start: "IN_PROGRESS" } },
      },
      ownership: { "tasktree/": "planner", "backend/": "ops" },
      protected: ["tasktree/config/flows/", "backend/"],
    });

    render(<ConstitutionPage />);

    expect(await screen.findByText(/Task states/)).toBeInTheDocument();
    expect(await screen.findByText("TODO")).toBeInTheDocument();
    expect(await screen.findByText("start -> IN_PROGRESS")).toBeInTheDocument();
    expect(screen.getByText(/Ownership/)).toBeInTheDocument();
    expect(screen.getAllByText("tasktree/").length).toBeGreaterThan(0);
    expect(screen.getByText("Protected paths")).toBeInTheDocument();
    expect(screen.getAllByText("backend/").length).toBeGreaterThan(0);
  });

  it("shows an empty message when the constitution is missing sections", async () => {
    mockFetchConstitution.mockResolvedValue({});

    render(<ConstitutionPage />);

    await waitFor(() =>
      expect(screen.getByText(/No constitution data available/)).toBeInTheDocument(),
    );
    expect(screen.getByText(/No task states configured/)).toBeInTheDocument();
    expect(screen.getByText(/No ownership entries/)).toBeInTheDocument();
    expect(screen.getByText(/No protected paths/)).toBeInTheDocument();
  });

  it("surfaces errors when the fetch fails", async () => {
    mockFetchConstitution.mockRejectedValue(new Error("boom"));

    render(<ConstitutionPage />);

    await waitFor(() =>
      expect(screen.getByText(/Unable to load constitution/)).toBeInTheDocument(),
    );
    expect(screen.getByText(/boom/)).toBeInTheDocument();
  });
});
