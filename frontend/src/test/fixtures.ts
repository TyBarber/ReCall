import type { Recall } from "@/lib/types";

export const recallFixture: Recall = {
  id: "9111d5c1-d82d-5052-9161-f8b32d481860",
  source: "fda",
  source_recall_id: "H-1237-2026",
  product_name: "KC Everyday Mac & Cheese",
  brand: "Kerry",
  description: "Prepared macaroni and cheese product.",
  recall_reason: "Potential contamination with Salmonella.",
  classification: "Class II",
  severity: null,
  status: "Ongoing",
  recall_date: "2026-07-14",
  distribution_pattern: "Distributed in select U.S. states.",
  states: ["NY", "PA"],
  upc_codes: ["20609055"],
  lot_numbers: ["LOT 42"],
  source_url: "https://api.fda.gov/food/enforcement.json?search=recall_number:H-1237-2026",
  created_at: "2026-08-30T12:00:00Z",
  updated_at: "2026-08-30T12:00:00Z",
};
