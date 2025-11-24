import { render, screen, waitFor } from "@testing-library/react";
import { vi, afterEach } from "vitest";
import { DevServerStatus } from "../components/DevServerStatus";

describe("DevServerStatus", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it("shows online when the dev server health endpoint responds OK", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue({ ok: true, json: () => Promise.resolve({ status: "ok" }) });

    vi.stubGlobal("fetch", fetchMock as unknown as typeof fetch);

    render(<DevServerStatus pollIntervalMs={20} />);

    await waitFor(() => {
      expect(screen.getByTestId("dev-server-status").textContent).toMatch(/backend connected/i);
    });
    expect(screen.getByTestId("dev-server-pip").className).toMatch(/green-500/);
    expect(fetchMock).toHaveBeenCalled();
  });
});
