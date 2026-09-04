import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { RecallSpotlight } from "@/components/recall-spotlight";
import { recallFixture } from "@/test/fixtures";

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
    classification: "Class III",
  },
];

describe("RecallSpotlight", () => {
  it("renders three aligned layers with only the front card interactive", () => {
    const { container } = render(<RecallSpotlight recalls={recalls} />);
    const spotlight = screen.getByRole("complementary", {
      name: "Featured recall",
    });
    const cards = container.querySelectorAll(".spotlight-card");

    expect(spotlight).not.toHaveAttribute("tabindex");
    expect(cards).toHaveLength(3);
    expect(container.querySelectorAll(".spotlight-position-front")).toHaveLength(
      1,
    );
    expect(
      container.querySelectorAll(".spotlight-position-middle"),
    ).toHaveLength(1);
    expect(container.querySelectorAll(".spotlight-position-back")).toHaveLength(
      1,
    );
    expect(cards[0]).not.toHaveAttribute("aria-hidden");
    expect(cards[1]).toHaveAttribute("aria-hidden", "true");
    expect(cards[2]).toHaveAttribute("aria-hidden", "true");
    expect(container.querySelectorAll("a")).toHaveLength(1);
    expect(container.querySelectorAll("button")).toHaveLength(1);
    expect(
      screen.getByRole("button", { name: "Learn what Class II means" }),
    ).toHaveAttribute("type", "button");
  });

  it("uses the first newest-query result without reordering by status", () => {
    const newestCompleted = {
      ...recallFixture,
      id: "newest-completed",
      product_name: "Newest FDA record",
      status: "Completed",
    };
    const olderOngoing = {
      ...recallFixture,
      id: "older-ongoing",
      product_name: "Older ongoing record",
      status: "Ongoing",
    };

    render(<RecallSpotlight recalls={[newestCompleted, olderOngoing]} />);

    expect(
      screen.getByRole("heading", { name: "Newest FDA record" }),
    ).toBeInTheDocument();
    expect(screen.queryByText("Older ongoing record")).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: /view recall/i })).toHaveAttribute(
      "href",
      "/recalls/newest-completed",
    );
  });

  it("shows the featured recall's prioritized real data", () => {
    render(<RecallSpotlight recalls={recalls} />);
    const card = screen.getByRole("article");

    expect(
      within(card).getByRole("heading", { name: recallFixture.product_name }),
    ).toBeInTheDocument();
    expect(within(card).getByText("FDA Class II")).toBeInTheDocument();
    expect(within(card).getByText(recallFixture.brand!)).toBeInTheDocument();
    expect(within(card).getByText(recallFixture.recall_reason)).toBeInTheDocument();
    expect(within(card).getByText("Ongoing")).toBeInTheDocument();
    expect(
      within(card).getByText(/Listed by FDA August 19, 2026/),
    ).toBeInTheDocument();
  });

  it("renders nothing when no live recall data is available", () => {
    const { container } = render(<RecallSpotlight recalls={[]} />);

    expect(container).toBeEmptyDOMElement();
  });
});
