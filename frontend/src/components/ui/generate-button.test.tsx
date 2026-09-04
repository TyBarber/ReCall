import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { GenerateButton } from "@/components/ui/generate-button";

describe("GenerateButton", () => {
  it("activates the supplied animation state on focus and click", () => {
    render(
      <GenerateButton
        generatingLabel="Searching…"
        idleLabel="Search"
        type="submit"
      />,
    );
    const button = screen.getByRole("button", { name: "Search" });

    expect(button).toHaveAttribute("type", "submit");
    expect(button).toHaveAttribute("data-generating", "false");

    fireEvent.focus(button);
    expect(button).toHaveAttribute("data-generating", "true");

    fireEvent.blur(button);
    expect(button).toHaveAttribute("data-generating", "false");

    fireEvent.click(button);
    expect(button).toHaveAttribute("data-generating", "true");
  });

  it("uses the active label and state while work is pending", () => {
    render(
      <GenerateButton
        generatingLabel="Searching…"
        idleLabel="Search"
        isGenerating
      />,
    );

    expect(
      screen.getByRole("button", { name: "Searching…" }),
    ).toHaveAttribute("data-generating", "true");
  });
});
