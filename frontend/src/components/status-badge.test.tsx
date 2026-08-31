import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { StatusBadge } from "@/components/status-badge";

describe("StatusBadge", () => {
  it.each([
    ["Ongoing", "status-badge-ongoing"],
    ["Completed", "status-badge-completed"],
    ["Terminated", "status-badge-terminated"],
    ["Pending review", "status-badge-neutral"],
  ])("maps %s to its supported visual tone", (status, expectedClass) => {
    render(<StatusBadge status={status} />);

    const badge = screen.getByText(status);
    expect(badge).toHaveClass(expectedClass);
    expect(badge.querySelector(".status-indicator")).toHaveAttribute(
      "aria-hidden",
      "true",
    );
  });
});
