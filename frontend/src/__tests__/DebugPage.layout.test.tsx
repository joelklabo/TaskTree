import React from "react";
import { render, screen } from "@testing-library/react";
import { vi } from "vitest";
import { DebugPage } from "../pages/DebugPage";

vi.mock("../api/client", async () => {
  const actual = await vi.importActual<Record<string, unknown>>("../api/client");
  return {
    ...actual,
    listFlowFiles: vi.fn().mockResolvedValue([]),
    getFlowFile: vi.fn(),
    getAgent: vi.fn(),
    getPrompt: vi.fn(),
    fetchPromptSkeleton: vi.fn(),
  };
});

describe("DebugPage layout", () => {
  it("stacks main sections so agent/prompt sits below the context column in the DOM", async () => {
    render(<DebugPage />);

    const context = await screen.findByTestId("debug-context");
    const agentPrompt = await screen.findByTestId("agent-prompt");

    const relation = context.compareDocumentPosition(agentPrompt);
    expect(relation & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });
});
