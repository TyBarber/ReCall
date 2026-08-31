import type { ComponentProps } from "react";
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("next/form", () => ({
  default: (props: ComponentProps<"form">) => <form {...props} />,
}));

import { SearchForm } from "@/components/search-form";

describe("SearchForm", () => {
  it("advertises only live-verified search categories", () => {
    render(<SearchForm search="mac & cheese" status="Ongoing" />);

    expect(screen.getByRole("searchbox")).toHaveAttribute(
      "placeholder",
      "Search food, brands, UPCs",
    );
    expect(screen.getByRole("searchbox")).toHaveValue("mac & cheese");
    expect(screen.getByRole("link", { name: "Ongoing" })).toHaveAttribute(
      "aria-current",
      "page",
    );
    expect(screen.getByRole("link", { name: "Salmonella" })).toHaveAttribute(
      "href",
      "/?search=Salmonella&status=Ongoing#current-recalls",
    );
    expect(screen.queryByText(/most serious/i)).not.toBeInTheDocument();
  });
});
