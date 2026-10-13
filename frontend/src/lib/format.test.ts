import { describe, expect, it } from "vitest";

import {
  displayProductName,
  foodCategory,
  formatClassification,
  formatTimeAgo,
  latestCheck,
  formatRecallDate,
  hasUsefulSourceUrl,
  recallSeverity,
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

  it("maps classifications to plain-language severity", () => {
    expect(recallSeverity({ classification: "Class I", record_type: "recall" }).label).toBe("Serious");
    expect(recallSeverity({ classification: "Class II", record_type: "recall" }).label).toBe("Moderate");
    expect(recallSeverity({ classification: "Class III", record_type: "recall" }).label).toBe("Low risk");
    expect(
      recallSeverity({ classification: null, record_type: "public_health_alert" }).label,
    ).toBe("Health alert");
    expect(recallSeverity({ classification: null, record_type: "recall" }).key).toBe("unknown");
  });

  it.each([
    ["KC Everyday Mac & Cheese", "KC Everyday Mac & Cheese"],
    ["Tomato Salsa Fresca. Ingredients: Tomatoes", "Tomato Salsa Fresca"],
    ["Prince ITALIAN BREAD; Sesame; ITALIAN & FRENCH BREAD", "Prince Italian Bread"],
    [
      "Glutinous Rice Balls with Black Sesame Filling NET WT. 14.1 OZ (400 g) Product of China UPC: 6908791000053",
      "Glutinous Rice Balls with Black Sesame Filling",
    ],
    [
      "UPC 25185700000 COOKIE GOURMET DUBAI 1CT This is Albertson's store-made item and sold by unit.",
      "Cookie Gourmet Dubai",
    ],
    ["Organic Moringa Powder; 15kg/bag (bulk); Product code: GJ96", "Organic Moringa Powder"],
    [
      "Sura Tanmen Hot and Sour Flavor Premium Japanese Noodles & Soup Base. Retail package net wt. 15.4oz.",
      "Sura Tanmen Hot and Sour Flavor Premium Japanese Noodles & Soup Base",
    ],
  ])("shortens raw product text %#", (raw, expected) => {
    expect(displayProductName(raw)).toBe(expected);
  });

  it("guesses a food category for the card icon", () => {
    expect(foodCategory({ product_name: "Requeson Mexican Cottage Cheese", description: null })).toBe("dairy");
    expect(foodCategory({ product_name: "Crunchy Protein Sprout Mix", description: null })).toBe("produce");
    expect(foodCategory({ product_name: "Ribeye steak", description: null })).toBe("meat");
    expect(
      foodCategory({ product_name: "Tomato Salsa Fresca", description: "Contains water" }),
    ).toBe("produce");
    expect(foodCategory({ product_name: "Glutinous Rice Balls", description: null })).toBe("meals");
  });

  it("describes how long ago the data was checked", () => {
    const now = new Date("2026-10-13T12:00:00Z");
    expect(formatTimeAgo("2026-10-13T11:59:40Z", now)).toBe("just now");
    expect(formatTimeAgo("2026-10-13T11:20:00Z", now)).toBe("40 minutes ago");
    expect(formatTimeAgo("2026-10-13T06:00:00Z", now)).toBe("6 hours ago");
    expect(formatTimeAgo("2026-10-10T12:00:00Z", now)).toBe("3 days ago");
    expect(formatTimeAgo("not a date", now)).toBeNull();
    expect(
      latestCheck([
        { last_checked_at: "2026-10-12T06:00:00Z" },
        { last_checked_at: null },
        { last_checked_at: "2026-10-13T06:00:00Z" },
      ]),
    ).toBe("2026-10-13T06:00:00Z");
    expect(latestCheck(null)).toBeNull();
  });
});
