import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { vi } from "vitest";
import RunDetailPage from "../RunDetailPage";
import type { ArtifactInfo } from "../../api/client";

const mocks = vi.hoisted(() => ({
  fetchTrace: vi.fn<(runId: string) => Promise<unknown[]>>(),
  fetchArtifacts: vi.fn<(runId: string) => Promise<ArtifactInfo[]>>(),
}));

vi.mock("../../components/ui/tabs", () => {
  const Tabs = ({ children }: { children: React.ReactNode }) => <div>{children}</div>;
  const TabsList = ({ children }: { children: React.ReactNode }) => <div>{children}</div>;
  const TabsTrigger = ({
    children,
    ...props
  }: { children: React.ReactNode } & React.ButtonHTMLAttributes<HTMLButtonElement>) => (
    <button type="button" {...props}>
      {children}
    </button>
  );
  const TabsContent = ({ children }: { children: React.ReactNode }) => <div>{children}</div>;
  return { Tabs, TabsList, TabsTrigger, TabsContent };
});

vi.mock("../../api/client", () => ({
  fetchTrace: mocks.fetchTrace,
  fetchArtifacts: mocks.fetchArtifacts,
}));

describe("RunDetailPage", () => {
  beforeEach(() => {
    mocks.fetchTrace.mockReset();
    mocks.fetchArtifacts.mockReset();
  });

  it("shows missing trace/artifacts when no trace id is provided", () => {
    render(<RunDetailPage runRef={{ sessionId: "sess-123" }} />);

    expect(screen.getByText(/Tracing disabled/)).toBeInTheDocument();
    expect(screen.getAllByText(/No trace available/)).toHaveLength(1);
    const artifactsTab = screen.getByRole("button", { name: "Artifacts" });
    fireEvent.click(artifactsTab);
    expect(screen.getByText(/No artifacts captured/)).toBeInTheDocument();
    expect(mocks.fetchTrace).not.toHaveBeenCalled();
    expect(mocks.fetchArtifacts).not.toHaveBeenCalled();
  });

  it("renders trace step/session records and artifacts", async () => {
    mocks.fetchTrace.mockResolvedValue([
      { step: { step_name: "s1", agent_name: "agent" }, extra: "value" },
      { session: "info" },
    ]);
    mocks.fetchArtifacts.mockResolvedValue([{ path: "logs/steps trace.txt", size: 2048 }]);

    render(<RunDetailPage runRef={{ sessionId: "sess-123", traceId: "trace-123" }} />);

    expect(await screen.findByText(/Trace events/)).toBeInTheDocument();
    expect(screen.getByText("s1")).toBeInTheDocument();
    expect(screen.getByText("agent")).toBeInTheDocument();
    expect(screen.getByText(/Session/)).toBeInTheDocument();
    const artifactsTab = screen.getByRole("button", { name: "Artifacts" });
    fireEvent.click(artifactsTab);
    const artifactLink = await screen.findByRole("link", { name: /logs\/steps trace.txt/i });
    expect(artifactLink.getAttribute("href")).toContain("logs/steps%20trace.txt");
    expect(screen.getByText("TXT")).toBeInTheDocument();
    expect(screen.getByText(/2\.0 KB/i)).toBeInTheDocument();
  });

  it("handles 404s from trace and artifacts fetches", async () => {
    const trace404 = Object.assign(new Error("not found"), {
      isAxiosError: true,
      response: { status: 404 },
    });
    const artifact404 = Object.assign(new Error("no artifacts"), {
      isAxiosError: true,
      response: { status: 404 },
    });
    mocks.fetchTrace.mockRejectedValue(trace404);
    mocks.fetchArtifacts.mockRejectedValue(artifact404);

    render(<RunDetailPage runRef={{ sessionId: "sess-123", traceId: "trace-404" }} />);

    await waitFor(() => expect(screen.getByText(/Tracing disabled/)).toBeInTheDocument());
    expect(screen.getByText(/No trace available/)).toBeInTheDocument();
    const artifactsTab = screen.getByRole("button", { name: "Artifacts" });
    fireEvent.click(artifactsTab);
    await waitFor(() => expect(screen.getByText(/Unable to load artifacts/)).toBeInTheDocument());
  });
});
