import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { vi, type Mock } from "vitest";

import ErrorPlaygroundPage from "../ErrorPlaygroundPage";
import { logClientError } from "../../api/client";

vi.mock("../../api/client", () => ({
  logClientError: vi.fn().mockResolvedValue({
    status: "logged",
    log_file: "/tmp/backend-dev.log",
  }),
}));

const mockedLogClientError = logClientError as unknown as Mock<typeof logClientError>;

describe("ErrorPlaygroundPage", () => {
  afterEach(() => {
    mockedLogClientError.mockClear();
  });

  it("sends a client error payload to the backend and shows success", async () => {
    render(<ErrorPlaygroundPage />);

    fireEvent.change(screen.getByLabelText(/Error name/i), {
      target: { value: "UIBoom" },
    });
    fireEvent.change(screen.getByLabelText(/Error message/i), {
      target: { value: "Something blew up" },
    });
    fireEvent.change(screen.getByLabelText(/Context/i), {
      target: { value: '{"path":"/flows","action":"click"}' },
    });

    fireEvent.click(screen.getByRole("button", { name: /send to backend/i }));

    await waitFor(() => expect(mockedLogClientError).toHaveBeenCalledTimes(1));
    expect(await screen.findByText(/Logged to/)).toBeInTheDocument();

    const payload = mockedLogClientError.mock.calls[0][0];
    expect(payload.message).toBe("Something blew up");
    expect(payload.name).toBe("UIBoom");
  });

  it("shows a validation error when context JSON is invalid", async () => {
    render(<ErrorPlaygroundPage />);

    fireEvent.change(screen.getByLabelText(/Context/i), {
      target: { value: "not-json" },
    });
    fireEvent.click(screen.getByRole("button", { name: /send to backend/i }));

    expect(await screen.findByText(/Context must be valid JSON/)).toBeInTheDocument();
    expect(mockedLogClientError).not.toHaveBeenCalled();
  });
});
