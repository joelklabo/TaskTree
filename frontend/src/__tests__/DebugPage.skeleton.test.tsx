import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { vi } from "vitest";
import { DebugPage } from "../pages/DebugPage";

const mockListFlowFiles = vi.fn();
const mockGetFlowFile = vi.fn();
const mockGetAgent = vi.fn();
const mockGetPrompt = vi.fn();
const mockFetchSkeleton = vi.fn();

vi.mock("../api/client", async () => {
  const actual = await vi.importActual<Record<string, unknown>>("../api/client");
  return {
    ...actual,
    listFlowFiles: (...args: unknown[]) => mockListFlowFiles(...args),
    getFlowFile: (...args: unknown[]) => mockGetFlowFile(...args),
    getAgent: (...args: unknown[]) => mockGetAgent(...args),
    getPrompt: (...args: unknown[]) => mockGetPrompt(...args),
    fetchPromptSkeleton: (...args: unknown[]) => mockFetchSkeleton(...args),
  };
});

describe("DebugPage input skeleton", () => {
  beforeEach(() => {
    mockListFlowFiles.mockResolvedValue(["log_error_handler.yaml"]);
    mockGetFlowFile.mockResolvedValue({
      content: `
id: log_error_handler
start: investigate
steps:
  - id: investigate
    agent: codex_cli
    action: investigate_error
`,
    });
    mockGetAgent.mockResolvedValue({ content: "id: codex_cli" });
    mockGetPrompt.mockResolvedValue({ content: "prompt" });
    mockFetchSkeleton.mockResolvedValue({
      action: "investigate_error",
      agent: "codex_cli",
      template: "error_investigate.j2",
      skeleton: { input: { error_log: "" } },
    });
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  it("fetches and displays input skeleton for the selected step", async () => {
    render(<DebugPage />);

    await waitFor(() => expect(mockListFlowFiles).toHaveBeenCalled());
    const flowSelect = screen.getByLabelText("Debug Flow");
    await userEvent.selectOptions(flowSelect, "log_error_handler.yaml");
    await waitFor(() => expect(mockGetFlowFile).toHaveBeenCalled());

    const fetchBtn = await screen.findByTestId("fetch-skeleton-btn");
    fireEvent.click(fetchBtn);

    await waitFor(() =>
      expect(mockFetchSkeleton).toHaveBeenCalledWith("investigate_error", "codex_cli"),
    );
    const skeleton = screen.getByTestId("input-skeleton");
    expect(skeleton.textContent).toContain('"error_log"');
  });
});
