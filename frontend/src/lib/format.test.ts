import { describe, expect, it } from "vitest";

import {
  displayCompany,
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
    [
      "Salata Salad Kitchen Jalapen¿o Avocado Dressing.  Keep Refrigerated.   Packaged in the following",
      "Salata Salad Kitchen Jalapeno Avocado Dressing",
    ],
    ["Lemon Alfredo Fettuccine packed in a yellow plastic sealed bag", "Lemon Alfredo Fettuccine"],
    ["American Ginsengs. PRODUCT OF WISCONSIN. NET WT: 4 oz.", "American Ginsengs"],
    ["Fromagerie Coop de Mean Cabricharme Shelf life: 30 days", "Fromagerie Coop de Mean Cabricharme"],
    [
      "Fontanini Foods LLC Recalls Raw, Frozen Pork Sausage Products Due to Possible Foreign Matter Contamination",
      "Raw, Frozen Pork Sausage Products",
    ],
    [
      "FSIS Issues Public Health Alert for A Ready-To-Eat Beef Jerky Product Due to Misbranding and Undeclared Allergen",
      "Ready-To-Eat Beef Jerky Product",
    ],
    [
      "Golden Gourmet Recalls Frozen Turkey Meatloaf Products Due to Misbranding and Undeclared Allergens",
      "Frozen Turkey Meatloaf Products",
    ],
    [
      "Inexport Logistics LLC Recalls Ineligible Pork Cracklings Products Imported From The Republic of Colombia",
      "Ineligible Pork Cracklings Products",
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
    expect(
      foodCategory({
        product_name: "So Delicious Dairy Free Salted Caramel Cluster Cashewmilk",
        description: "So Delicious Dairy Free Salted Caramel Cluster Cashewmilk",
      }),
    ).toBe("drinks");
    expect(
      foodCategory({
        product_name: "Organiccs Absolutely Pure",
        description: "Organiccs Absolutely Pure, Type-1 Hydrolyzed Collagen Peptides",
      }),
    ).toBe("supplements");
    expect(
      foodCategory({
        product_name: "Lior brand Cinnamon Ground Seasoning; 90g container",
        description: "contains milk",
      }),
    ).toBe("spices");
    expect(
      foodCategory({ product_name: "Coco G's Courmet Flaming Cheddar Hots", description: null }),
    ).toBe("dairy");
    expect(
      foodCategory({ product_name: "Todd's Seeds Alfalfa & Mung Bundle", description: null }),
    ).toBe("produce");
    expect(
      foodCategory({ product_name: "Mystery Mix", description: "Product code 1234" }),
    ).toBe("meals");
    expect(
      foodCategory({ product_name: "Salata Jalapeño Dressing", description: null }),
    ).toBe("produce");
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

  it("finds the company in USDA titles when the record has none", () => {
    expect(
      displayCompany({
        recalling_firm: null,
        brand: null,
        source: "usda_fsis",
        product_name:
          "Sempio Food Services Inc. Recalls Ready-To-Eat Chicken Stew Products Imported Without the Benefit of Import Reinspection",
      }),
    ).toBe("Sempio Food Services Inc.");
    expect(
      displayCompany({
        recalling_firm: null,
        brand: null,
        source: "usda_fsis",
        product_name: "FSIS Issues Public Health Alert for Chicken Salad Product",
      }),
    ).toBeNull();
    expect(
      displayCompany({
        recalling_firm: "Kerry, Inc.",
        brand: "Kerry",
        source: "fda",
        product_name: "Mac & Cheese",
      }),
    ).toBe("Kerry, Inc.");
    expect(
      displayCompany({ recalling_firm: "TODD'S SEEDS LLC", brand: null, source: "fda", product_name: "x" }),
    ).toBe("Todd's Seeds LLC");
    expect(
      displayCompany({ recalling_firm: "TOJI CO.", brand: null, source: "fda", product_name: "x" }),
    ).toBe("Toji Co.");
  });
});

describe("companyWatchTerm", () => {
  it("drops corporate suffixes so a watch matches every filing", async () => {
    const { companyWatchTerm } = await import("@/lib/format");
    expect(companyWatchTerm("Taylor Fresh Foods, Inc.")).toBe("Taylor Fresh Foods");
    expect(companyWatchTerm("Fontanini Foods, LLC")).toBe("Fontanini Foods");
    expect(companyWatchTerm("Acme Co. Inc")).toBe("Acme");
    expect(companyWatchTerm("Kerry")).toBe("Kerry");
    expect(companyWatchTerm("  Co ")).toBeNull();
  });
});
