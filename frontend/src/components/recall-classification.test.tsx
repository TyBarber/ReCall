import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { RecallClassification } from "@/components/recall-classification";

const CASES = [
  {
    classification: "Class I",
    heading: "Class I",
    primary: "Most serious classification.",
    description: /serious health consequences or death/i,
  },
  {
    classification: "Class II",
    heading: "Class II",
    primary: "Moderate health risk.",
    description: /temporary or medically reversible health effects/i,
  },
  {
    classification: "Class III",
    heading: "Class III",
    primary: "Lower health risk.",
    description: /not likely to cause adverse health consequences/i,
  },
] as const;

describe("RecallClassification", () => {
  it.each(CASES)(
    "shows the consumer explanation for $heading",
    ({ classification, heading, primary, description }) => {
      render(<RecallClassification classification={classification} />);
      const trigger = screen.getByRole("button", {
        name: `Learn what ${heading} means`,
      });

      expect(screen.getByText(`FDA ${heading}`)).toBeVisible();
      expect(trigger).toHaveAttribute("aria-expanded", "false");
      fireEvent.click(trigger);

      const tooltip = screen.getByRole("tooltip");
      expect(trigger).toHaveAttribute("aria-expanded", "true");
      expect(tooltip).toHaveTextContent(primary);
      expect(tooltip).toHaveTextContent(description);
      expect(tooltip).toHaveTextContent("FDA classification");
    },
  );

  it("toggles by click and closes on Escape", async () => {
    render(<RecallClassification classification="Class I" />);
    const trigger = screen.getByRole("button", {
      name: "Learn what Class I means",
    });

    fireEvent.click(trigger);
    expect(screen.getByRole("tooltip")).toBeInTheDocument();
    fireEvent.keyDown(document, { key: "Escape" });

    await waitFor(() =>
      expect(screen.queryByRole("tooltip")).not.toBeInTheDocument(),
    );
    expect(trigger).toHaveFocus();

    fireEvent.click(trigger);
    fireEvent.click(trigger);
    await waitFor(() =>
      expect(screen.queryByRole("tooltip")).not.toBeInTheDocument(),
    );
  });

  it("closes when the user interacts outside the control", async () => {
    render(<RecallClassification classification="Class II" />);
    fireEvent.click(
      screen.getByRole("button", { name: "Learn what Class II means" }),
    );

    fireEvent.pointerDown(document.body);

    await waitFor(() =>
      expect(screen.queryByRole("tooltip")).not.toBeInTheDocument(),
    );
  });

  it("opens for mouse hover and keyboard focus", async () => {
    render(<RecallClassification classification="Class III" />);
    const trigger = screen.getByRole("button", {
      name: "Learn what Class III means",
    });
    fireEvent.pointerEnter(trigger, { pointerType: "mouse" });
    expect(screen.getByRole("tooltip")).toBeInTheDocument();
    fireEvent.pointerLeave(trigger, { pointerType: "mouse" });
    await waitFor(() =>
      expect(screen.queryByRole("tooltip")).not.toBeInTheDocument(),
    );

    fireEvent.focus(trigger);
    expect(screen.getByRole("tooltip")).toBeInTheDocument();
  });

  it("keeps the first pointer activation open after hover or focus", async () => {
    render(<RecallClassification classification="Class I" />);
    const trigger = screen.getByRole("button", {
      name: "Learn what Class I means",
    });
    fireEvent.pointerEnter(trigger, { pointerType: "mouse" });
    fireEvent.focus(trigger);
    fireEvent.pointerDown(trigger, { pointerType: "mouse" });
    fireEvent.click(trigger);

    expect(screen.getByRole("tooltip")).toBeInTheDocument();

    fireEvent.pointerDown(trigger, { pointerType: "mouse" });
    fireEvent.click(trigger);
    await waitFor(() =>
      expect(screen.queryByRole("tooltip")).not.toBeInTheDocument(),
    );
  });

  it("does not open when the classification label is hovered", () => {
    render(<RecallClassification classification="Class I" />);

    fireEvent.pointerEnter(screen.getByText("FDA Class I"), {
      pointerType: "mouse",
    });

    expect(screen.queryByRole("tooltip")).not.toBeInTheDocument();
  });

  it("keeps unknown classifications visible without inventing an explanation", () => {
    render(<RecallClassification classification="Pending" />);

    expect(screen.getByText("Pending")).toBeVisible();
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
    expect(screen.queryByRole("tooltip")).not.toBeInTheDocument();
  });

  it("uses official USDA FSIS classification labeling and explanation", () => {
    render(
      <RecallClassification classification="Class II" source="usda_fsis" />,
    );
    const trigger = screen.getByRole("button", {
      name: "Learn what Class II means",
    });

    expect(screen.getByText("USDA Class II")).toBeVisible();
    fireEvent.click(trigger);
    expect(screen.getByRole("tooltip")).toHaveTextContent(
      "remote probability of adverse health consequences",
    );
    expect(screen.getByRole("tooltip")).toHaveTextContent(
      "USDA FSIS classification",
    );
  });

  it("renders nothing when classification is absent", () => {
    const { container } = render(
      <RecallClassification classification={null} />,
    );

    expect(container).toBeEmptyDOMElement();
  });
});
