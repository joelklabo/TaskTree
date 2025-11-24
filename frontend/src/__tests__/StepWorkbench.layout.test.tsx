import React from "react";
import { render, screen } from "@testing-library/react";
import { vi } from "vitest";
import { StepWorkbenchPage } from "../pages/StepWorkbenchPage";

vi.mock("../api/client", async () => {
  const actual = await vi.importActual<Record<string, unknown>>("../api/client");
  return {
    ...actual,
    listAgents: vi.fn().mockResolvedValue(["codex_cli.yaml"]),
    listPrompts: vi.fn().mockResolvedValue(["error_investigate.j2"]),
    getPrompt: vi.fn().mockResolvedValue({ name: "error_investigate.j2", content: "prompt" }),
    fetchPromptSkeletonByTemplate: vi.fn().mockResolvedValue({
      action: "investigate_error",
      agent: "codex_cli",
      template: "error_investigate.j2",
      skeleton: { input: { error_log: "" } },
    }),
  };
});

describe("StepWorkbench layout", () => {
  it("stacks prompt/output/logs in main column below the config", async () => {
    render(<StepWorkbenchPage />);

    const config = screen.getAllByRole("combobox")[0].closest("div");
    const output = await screen.findByText("Output");
    const outputContainer = output.parentElement;

    const relation = config?.compareDocumentPosition(outputContainer!);
    expect(relation && relation & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });
});
