import type { ComponentProps } from "react";
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("next/form", () => ({
  default: (props: ComponentProps<"form">) => <form {...props} />,
}));

import { SearchForm } from "@/components/search-form";

describe("SearchForm", () => {
  it("advertises only live-verified search categories", () => {
    const { container } = render(
      <SearchForm
        search="mac & cheese"
        status="Ongoing"
        source="usda_fsis"
        recordType="public_health_alert"
      />,
    );

    expect(screen.getByRole("searchbox")).toHaveAttribute(
      "placeholder",
      "Food, brand, or barcode",
    );
    expect(screen.getByRole("searchbox")).toHaveValue("mac & cheese");
    expect(screen.getByRole("link", { name: "Ongoing" })).toHaveAttribute(
      "aria-current",
      "page",
    );
    expect(screen.getByRole("link", { name: "USDA FSIS" })).toHaveAttribute(
      "aria-current",
      "page",
    );
    expect(
      screen.getByRole("link", { name: "Public Health Alerts" }),
    ).toHaveAttribute("aria-current", "page");
    expect(screen.getByRole("link", { name: "Salmonella" })).toHaveAttribute(
      "href",
      "/recalls?search=Salmonella&status=Ongoing&source=usda_fsis&record_type=public_health_alert&page=1#current-recalls",
    );
    expect(screen.getByDisplayValue("1")).toHaveAttribute("name", "page");
    expect(screen.queryByText(/most serious/i)).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Search" })).toHaveAttribute(
      "type",
      "submit",
    );
    expect(container.querySelector("details.more-filters")).toHaveAttribute(
      "open",
    );
    expect(container.querySelector("svg.command-icon")).toHaveAttribute(
      "aria-hidden",
      "true",
    );
  });

  it("keeps status and record type filters collapsed until they are used", () => {
    const { container } = render(<SearchForm />);

    expect(container.querySelector("details.more-filters")).not.toHaveAttribute(
      "open",
    );
    expect(screen.getByRole("link", { name: "All sources" })).toHaveAttribute(
      "aria-current",
      "page",
    );
  });
});
