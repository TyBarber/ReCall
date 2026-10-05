import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { RecallCard } from "@/components/recall-card";
import { fsisAlertFixture, recallFixture } from "@/test/fixtures";

describe("RecallCard", () => {
  it("uses consumer-safe labels and a clear detail action", () => {
    render(<RecallCard recall={recallFixture} />);

    expect(
      screen.getByRole("heading", { name: recallFixture.product_name }),
    ).toBeInTheDocument();
    expect(screen.getByText("FDA Class II")).toBeInTheDocument();
    expect(screen.getByText("Listed by FDA")).toBeInTheDocument();
    expect(screen.getByText("August 19, 2026")).toBeInTheDocument();
    expect(screen.getByText("Sold/distributed in")).toBeInTheDocument();
    expect(screen.getByText("NY, PA")).toBeInTheDocument();
    expect(screen.getByText("Product codes reported by FDA")).toBeInTheDocument();
    expect(screen.getByText("2 codes")).toBeInTheDocument();
    expect(screen.queryByText("Recall date")).not.toBeInTheDocument();
    expect(screen.queryByText("FDA recall number")).not.toBeInTheDocument();
    expect(screen.queryByText(recallFixture.id)).not.toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: /view recall details/i }),
    ).toHaveAttribute("href", `/recalls/${recallFixture.id}`);
  });

  it("uses the recalling firm when a separate brand is absent", () => {
    render(<RecallCard recall={{ ...recallFixture, brand: null }} />);

    expect(screen.getByText("Kerry, Inc.")).toBeInTheDocument();
  });

  it("labels a USDA FSIS Public Health Alert without inventing a class", () => {
    render(<RecallCard recall={fsisAlertFixture} />);

    expect(screen.getByText("Public Health Alert")).toBeInTheDocument();
    expect(screen.getByText("USDA FSIS")).toBeInTheDocument();
    expect(screen.getByText("Published by USDA FSIS")).toBeInTheDocument();
    expect(screen.queryByText(/Class I/)).not.toBeInTheDocument();
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
          reported_at: null,
          states: [],
          distribution_pattern: null,
          upc_codes: [],
          lot_numbers: [],
        }}
      />,
    );

    expect(screen.queryByText("Listed by FDA")).not.toBeInTheDocument();
    expect(screen.queryByText("Recall started")).not.toBeInTheDocument();
    expect(screen.queryByText("Sold/distributed in")).not.toBeInTheDocument();
    expect(
      screen.queryByText("Product codes reported by FDA"),
    ).not.toBeInTheDocument();
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

  it("labels the initiation date as Recall started when no report date exists", () => {
    render(
      <RecallCard recall={{ ...recallFixture, reported_at: null }} />,
    );

    expect(screen.getByText("Recall started")).toBeInTheDocument();
    expect(screen.getByText("July 14, 2026")).toBeInTheDocument();
    expect(screen.queryByText("Listed by FDA")).not.toBeInTheDocument();
  });

  it("keeps homepage previews focused on essential recall facts", () => {
    render(<RecallCard recall={recallFixture} variant="preview" />);

    expect(screen.getByText("Why it was recalled")).toBeInTheDocument();
    expect(screen.getByText("Listed by FDA")).toBeInTheDocument();
    expect(screen.queryByText("Sold/distributed in")).not.toBeInTheDocument();
    expect(
      screen.queryByText("Product codes reported by FDA"),
    ).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: /view recall/i })).toHaveAttribute(
      "href",
      `/recalls/${recallFixture.id}`,
    );
  });
});
