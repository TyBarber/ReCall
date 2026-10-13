import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import {
  pickSpotlightRecall,
  RecallSpotlight,
} from "@/components/recall-spotlight";
import { fsisAlertFixture, recallFixture } from "@/test/fixtures";

const recalls = [
  recallFixture,
  {
    ...recallFixture,
    id: "second-recall",
    product_name: "Frozen spinach",
    classification: "Class I",
  },
  {
    ...recallFixture,
    id: "third-recall",
    product_name: "Bottled water",
    classification: "Class I",
  },
];

describe("pickSpotlightRecall", () => {
  it("prefers the newest serious recall", () => {
    expect(pickSpotlightRecall(recalls)?.id).toBe("second-recall");
  });

  it("falls back to the newest recall when none are serious", () => {
    expect(pickSpotlightRecall([recallFixture, fsisAlertFixture])?.id).toBe(
      recallFixture.id,
    );
    expect(pickSpotlightRecall([])).toBeUndefined();
  });
});

describe("RecallSpotlight", () => {
  it("highlights a serious recall with what to do next", () => {
    render(<RecallSpotlight recall={recalls[1]} />);
    const card = screen.getByRole("article", { name: "Featured recall" });

    expect(within(card).getByText("Most serious right now")).toBeInTheDocument();
    expect(
      within(card).getByRole("heading", { name: "Frozen spinach" }),
    ).toBeInTheDocument();
    expect(within(card).getByText("Serious")).toBeInTheDocument();
    expect(within(card).getByText("FDA Class I")).toBeInTheDocument();
    expect(within(card).getByText("Kerry, Inc.")).toBeInTheDocument();
    expect(within(card).getByText(recallFixture.recall_reason)).toBeInTheDocument();
    expect(within(card).getByText("Ongoing")).toBeInTheDocument();
    expect(
      within(card).getByText(/Listed by FDA August 19, 2026/),
    ).toBeInTheDocument();
    expect(
      within(card).getByRole("link", { name: /see what to do/i }),
    ).toHaveAttribute("href", "/recalls/second-recall");
  });

  it("labels a non-serious fallback as the newest recall", () => {
    render(<RecallSpotlight recall={recallFixture} />);

    expect(screen.getByText("Newest recall")).toBeInTheDocument();
    expect(screen.getByText("Moderate")).toBeInTheDocument();
  });

  it("labels a featured Public Health Alert without fabricating a class", () => {
    render(<RecallSpotlight recall={fsisAlertFixture} />);
    const card = screen.getByRole("article");

    expect(within(card).queryAllByText("Public Health Alert")).toHaveLength(1);
    expect(within(card).queryByText(/Class I/)).not.toBeInTheDocument();
  });

  it("renders nothing when no live recall data is available", () => {
    const { container } = render(<RecallSpotlight recall={undefined} />);

    expect(container).toBeEmptyDOMElement();
  });
});
