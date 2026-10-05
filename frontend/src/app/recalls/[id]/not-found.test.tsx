import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import RecallNotFound from "@/app/recalls/[id]/not-found";

describe("RecallNotFound", () => {
  it("offers a clear path back to the recall directory", () => {
    render(<RecallNotFound />);

    expect(
      screen.getByRole("heading", { name: "Recall not found" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Browse recalls" })).toHaveAttribute(
      "href",
      "/recalls",
    );
  });
});
