import React from "react";
import { render, screen, waitFor, act } from "@testing-library/react";
import { vi } from "vitest";
import RunDetailPage from "../RunDetailPage";

vi.mock("../../components/ui/tabs", () => {
  const Tabs = ({ children }: { children: React.ReactNode }) => <div>{children}</div>;
  const TabsList = ({ children }: { children: React.ReactNode }) => <div>{children}</div>;
  const TabsTrigger = ({
    children,
    ...props
  }: { children: React.ReactNode } & React.ButtonHTMLAttributes<HTMLButtonElement>) => (
    // eslint-disable-next-line react/no-unknown-property
    <button type="button" {...props}>
      {children}
    </button>
  );
  const TabsContent = ({ children }: { children: React.ReactNode }) => <div>{children}</div>;
  return { Tabs, TabsList, TabsTrigger, TabsContent };
});

vi.mock("../../api/client", async () => {
  const actual = await vi.importActual<typeof import("../../api/client")>("../../api/client");
  return {
    ...actual,
    fetchTrace: vi.fn(() =>
      Promise.resolve([
        {
          run_id: "trace1",
          session: {
            session_id: "sess1",
            flow_name: "log_error_handler",
            flow_version: "0.1.0",
            start_time: "2025-11-20T10:00:00Z",
            end_time: "2025-11-20T10:05:00Z",
          },
        },
        {
          run_id: "trace1",
          step: {
            step_name: "assess",
            agent_name: "codex_cli",
            status: "success",
            label: "tests_passed",
          },
          extra: "value",
        },
      ]),
    ),
    fetchArtifacts: vi.fn(() => Promise.resolve([])),
  };
});

describe("RunDetailPage trace view formatting", () => {
  it(
    "shows step cards, session timing badges, and toggles raw payloads",
    { timeout: 10000 },
    async () => {
      render(<RunDetailPage runRef={{ sessionId: "sess1", traceId: "trace1" }} />);

      await waitFor(() => expect(screen.getByText(/Trace timeline/i)).toBeInTheDocument());
      expect(screen.getByText(/Start:/i)).toBeInTheDocument();
      expect(screen.getByText(/End:/i)).toBeInTheDocument();
      expect(screen.getAllByText(/Session summary/i).length).toBeGreaterThan(0);

      const stepCard = screen.getByTestId("timeline-step-assess");
      expect(stepCard).toBeInTheDocument();
      expect(stepCard).toHaveTextContent("assess");
      expect(stepCard).toHaveTextContent("codex_cli");
      expect(stepCard).toHaveTextContent("success");
      expect(stepCard).toHaveTextContent("tests_passed");

      expect(screen.queryByText(/"extra": "value"/i)).not.toBeInTheDocument();
      const toggleRaw = screen.getByRole("button", { name: /Show raw/i });
      act(() => toggleRaw.click());
      await waitFor(() =>
        expect(
          screen.getByText((content) => content.includes('"extra": "value"')),
        ).toBeInTheDocument(),
      );
      expect(
        screen.queryByText(/"flow_name": "log_error_handler"/i, {
          selector: "pre",
        }),
      ).not.toBeInTheDocument();

      const sessionToggle = screen.getByRole("button", { name: /Show session raw/i });
      expect(screen.queryByText(/"flow_version": "0.1.0"/i)).not.toBeInTheDocument();
      act(() => sessionToggle.click());
      await waitFor(() =>
        expect(
          screen.getByText((content) => content.includes('"flow_version": "0.1.0"')),
        ).toBeInTheDocument(),
      );
    },
  );
});
