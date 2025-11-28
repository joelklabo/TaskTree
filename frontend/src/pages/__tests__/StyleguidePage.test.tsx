import React from "react";
import { render, screen } from "@testing-library/react";
import StyleguidePage from "../StyleguidePage";

describe("StyleguidePage", () => {
  it("shows key shadcn primitives", () => {
    render(<StyleguidePage />);

    expect(screen.getByText(/Shadcn component gallery/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Primary/i })).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/search or type/i)).toBeInTheDocument();
    expect(screen.getByText(/Hover me/i)).toBeInTheDocument();
  });
});
