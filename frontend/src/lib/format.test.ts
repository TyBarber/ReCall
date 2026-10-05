import { describe, expect, it } from "vitest";

import {
  formatClassification,
  formatRecallDate,
  hasUsefulSourceUrl,
} from "@/lib/format";

describe("recall display formatting", () => {
  it("formats FDA classification labels", () => {
    expect(formatClassification("Class I")).toBe("FDA Class I");
    expect(formatClassification("Class II")).toBe("FDA Class II");
    expect(formatClassification("Class III")).toBe("FDA Class III");
  });

  it("formats USDA FSIS classification labels without using FDA branding", () => {
    expect(formatClassification("Class I", "usda_fsis")).toBe("USDA Class I");
  });

  it("formats a source date without timezone drift", () => {
    expect(formatRecallDate("2026-07-14")).toBe("July 14, 2026");
  });

  it("rejects absent, malformed, and empty-recall-number source URLs", () => {
    expect(hasUsefulSourceUrl(null)).toBe(false);
    expect(hasUsefulSourceUrl("not a url")).toBe(false);
    expect(
      hasUsefulSourceUrl(
        "https://api.fda.gov/food/enforcement.json?search=recall_number:",
      ),
    ).toBe(false);
  });
});
