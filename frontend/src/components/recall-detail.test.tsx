import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { RecallDetailView } from "@/components/recall-detail";
import { fsisAlertFixture, recallFixture } from "@/test/fixtures";

describe("RecallDetailView", () => {
  it("presents the consumer safety hierarchy and both date meanings", () => {
    render(<RecallDetailView recall={recallFixture} />);

    expect(screen.getByText("FDA Class II")).toBeInTheDocument();
    expect(screen.getByText("Ongoing")).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { level: 1, name: recallFixture.product_name }),
    ).toBeInTheDocument();
    expect(screen.getByText("Recalling firm")).toBeInTheDocument();
    expect(screen.getByText("Kerry, Inc.")).toBeInTheDocument();
    expect(screen.getByText("Kerry")).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "Why it was recalled" }),
    ).toBeInTheDocument();
    expect(screen.getByText(recallFixture.recall_reason)).toBeInTheDocument();
    expect(screen.getByText("Listed by FDA")).toBeInTheDocument();
    expect(screen.getByText("August 19, 2026")).toBeInTheDocument();
    expect(screen.getByText("Recall started")).toBeInTheDocument();
    expect(screen.getByText("July 14, 2026")).toBeInTheDocument();

    const reason = screen.getByRole("heading", { name: "Why it was recalled" });
    const dates = screen.getByRole("heading", { name: "Key dates" });
    expect(reason.compareDocumentPosition(dates)).toBe(
      Node.DOCUMENT_POSITION_FOLLOWING,
    );
  });

  it("shows preserved FDA code information and filters parser artifacts", () => {
    render(
      <RecallDetailView
        recall={{
          ...recallFixture,
          product_code_info: "Best if used by 08/12/26; package code K42",
          upc_codes: ["20609055", "N/A", "  ", "20609055"],
          lot_numbers: ["Numbers", "LOT 42", "unknown"],
        }}
      />,
    );

    expect(
      screen.getByText("FDA-reported product/code information"),
    ).toBeInTheDocument();
    expect(
      screen.getByText("Best if used by 08/12/26; package code K42"),
    ).toBeInTheDocument();
    expect(screen.getByText("UPC")).toBeInTheDocument();
    expect(screen.getByText("20609055")).toBeInTheDocument();
    expect(screen.getByText("Lot / batch information")).toBeInTheDocument();
    expect(screen.getByText("LOT 42")).toBeInTheDocument();
    expect(screen.queryByText("Numbers")).not.toBeInTheDocument();
    expect(screen.queryByText("N/A")).not.toBeInTheDocument();
  });

  it("prefers structured states and falls back to FDA distribution text", () => {
    const { rerender } = render(<RecallDetailView recall={recallFixture} />);

    expect(screen.getByText("States reported")).toBeInTheDocument();
    expect(screen.getByText("NY, PA")).toBeInTheDocument();
    expect(
      screen.queryByText("Distributed in select U.S. states."),
    ).not.toBeInTheDocument();

    rerender(
      <RecallDetailView
        recall={{
          ...recallFixture,
          states: [],
          distribution_pattern: "Nationwide distribution.",
        }}
      />,
    );

    expect(screen.getByText("Nationwide distribution.")).toBeInTheDocument();
    expect(screen.queryByText("States reported")).not.toBeInTheDocument();
  });

  it("omits unusable values and explains important missing data once", () => {
    render(
      <RecallDetailView
        recall={{
          ...recallFixture,
          brand: null,
          recalling_firm: null,
          reported_at: null,
          recall_date: null,
          product_code_info: "N/A",
          upc_codes: ["Numbers"],
          lot_numbers: ["unknown"],
          states: [],
          distribution_pattern: "N/A",
          source_recall_id: "n/a",
        }}
      />,
    );

    expect(
      screen.getByText("Brand or recalling firm not provided in the FDA record."),
    ).toBeInTheDocument();
    expect(
      screen.getByText("Dates were not provided in the FDA record."),
    ).toBeInTheDocument();
    expect(
      screen.getByText("Product codes were not provided in the FDA record."),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        "Distribution details were not provided in the FDA record.",
      ),
    ).toBeInTheDocument();
    expect(screen.queryByText(/^n\/a$/i)).not.toBeInTheDocument();
    expect(screen.queryByText("Numbers")).not.toBeInTheDocument();
    expect(screen.queryByText("FDA recall number")).not.toBeInTheDocument();
    expect(
      screen.queryByRole("link", { name: /view fda source data/i }),
    ).not.toBeInTheDocument();
  });

  it("links back to the directory and to useful FDA source data", () => {
    render(<RecallDetailView recall={recallFixture} />);

    expect(screen.getByRole("link", { name: /back to recalls/i })).toHaveAttribute(
      "href",
      "/recalls",
    );
    expect(
      screen.getByText("U.S. FDA enforcement data"),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: /view fda source data/i }),
    ).toHaveAttribute("href", recallFixture.source_url);
    expect(screen.queryByText(recallFixture.id)).not.toBeInTheDocument();
  });

  it("distinguishes a USDA FSIS Public Health Alert and links source documents", () => {
    render(<RecallDetailView recall={fsisAlertFixture} />);

    expect(screen.getByText("USDA FSIS Public Health Alert")).toBeInTheDocument();
    expect(screen.getByText("Published by USDA FSIS")).toBeInTheDocument();
    expect(
      screen.getByText("U.S. Department of Agriculture FSIS"),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: /view usda fsis source data/i }),
    ).toHaveAttribute("href", fsisAlertFixture.source_url);
    expect(
      screen.getByRole("link", { name: /source document 1/i }),
    ).toHaveAttribute("href", fsisAlertFixture.source_documents[0]);
    expect(screen.queryByText(/USDA Class/)).not.toBeInTheDocument();
  });
});
