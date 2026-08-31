import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { RecallCard } from "@/components/recall-card";
import { recallFixture } from "@/test/fixtures";

describe("RecallCard", () => {
  it("uses consumer-safe labels and a clear detail action", () => {
    render(<RecallCard recall={recallFixture} />);

    expect(
      screen.getByRole("heading", { name: recallFixture.product_name }),
    ).toBeInTheDocument();
    expect(screen.getByText("FDA Class II")).toBeInTheDocument();
    expect(screen.getByText("Recall initiated")).toBeInTheDocument();
    expect(screen.getByText("Distribution")).toBeInTheDocument();
    expect(screen.getByText("NY, PA")).toBeInTheDocument();
    expect(screen.getByText("Product codes")).toBeInTheDocument();
    expect(screen.getByText("2 FDA-reported codes")).toBeInTheDocument();
    expect(screen.queryByText("Recall date")).not.toBeInTheDocument();
    expect(screen.queryByText("FDA recall number")).not.toBeInTheDocument();
    expect(screen.queryByText(recallFixture.id)).not.toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: /view recall details/i }),
    ).toHaveAttribute("href", `/recalls/${recallFixture.id}`);
  });

  it("handles a missing brand without leaving an empty label", () => {
    render(<RecallCard recall={{ ...recallFixture, brand: null }} />);

    expect(screen.getByText("Company not reported")).toBeInTheDocument();
  });

  it("summarizes many states and omits facts that are not available", () => {
    const { rerender } = render(
      <RecallCard
        recall={{
          ...recallFixture,
          states: ["CA", "NV", "OR", "WA", "AZ"],
          distribution_pattern: "A fallback that should not be shown.",
        }}
      />,
    );

    expect(screen.getByText("5 states reported")).toBeInTheDocument();
    expect(
      screen.queryByText("A fallback that should not be shown."),
    ).not.toBeInTheDocument();

    rerender(
      <RecallCard
        recall={{
          ...recallFixture,
          recall_date: null,
          states: [],
          distribution_pattern: null,
          upc_codes: [],
          lot_numbers: [],
        }}
      />,
    );

    expect(screen.queryByText("Recall initiated")).not.toBeInTheDocument();
    expect(screen.queryByText("Distribution")).not.toBeInTheDocument();
    expect(screen.queryByText("Product codes")).not.toBeInTheDocument();
  });

  it("uses the distribution pattern when no states are available", () => {
    render(
      <RecallCard
        recall={{
          ...recallFixture,
          states: [],
          distribution_pattern: "Nationwide distribution.",
        }}
      />,
    );

    expect(screen.getByText("Nationwide distribution.")).toBeInTheDocument();
  });
});
