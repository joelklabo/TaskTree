import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { DashboardStateView } from "../pages/DashboardStateView";

describe("DashboardStateView", () => {
  it("renders core sections from state", () => {
    render(
      <DashboardStateView
        state={{
          status: { env: "dev", updated_at: "now" },
          git: { branch: "main", ahead: 1, behind: 0, dirty: 2 },
          servers: [
            { name: "backend", status: true, port: 8000 },
            { name: "frontend", status: false, port: 5173 },
          ],
          alerts: {
            total: 3,
            recent_text: "recent alerts text",
            recent: [{ level: "warn", msg: "test alert" }],
          },
          ci: {
            status: "success",
            recent_text: "cached ci",
            runs: [
              {
                workflow: "ci",
                status: "completed",
                conclusion: "success",
                branch: "main",
                url: "https://example.com/run/1",
              },
            ],
          },
          traces: { recent_runs: 4 },
          logs: { configured_sources: 2 },
        }}
      />,
    );

    expect(screen.getByText(/Env: dev/i)).toBeInTheDocument();
    expect(screen.getByText(/Branch: main/i)).toBeInTheDocument();
    expect(screen.getByText(/backend/i)).toBeInTheDocument();
    expect(screen.getByText(/frontend/i)).toBeInTheDocument();
    expect(screen.getByText(/Total: 3/i)).toBeInTheDocument();
    expect(screen.getByText(/Status: success/i)).toBeInTheDocument();
    expect(screen.getAllByText(/ci/i)).not.toHaveLength(0);
    expect(screen.getByText(/Recent runs: 4/i)).toBeInTheDocument();
  });

  it("hides smoke text when CI runs are present", () => {
    render(
      <DashboardStateView
        state={{
          ci: {
            status: "success",
            recent_text: "Smoke mode (no network)",
            runs: [
              {
                workflow: "ci",
                status: "completed",
                conclusion: "success",
                branch: "main",
                url: "https://example.com/run/1",
              },
            ],
          },
          status: {},
          git: {},
          servers: [],
          alerts: { total: 0, recent: [] },
          traces: { recent_runs: 0 },
          logs: { configured_sources: 0 },
        }}
      />,
    );

    expect(screen.queryByText(/Smoke mode/i)).not.toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /CI/i })).toBeInTheDocument();
    expect(screen.getAllByText(/ci/i).length).toBeGreaterThanOrEqual(1);
  });
});
