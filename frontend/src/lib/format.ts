import type { Recall } from "@/lib/types";

const MONTH_DAY_YEAR = new Intl.DateTimeFormat("en-US", {
  month: "long",
  day: "numeric",
  year: "numeric",
  timeZone: "UTC",
});

export function formatRecallDate(value: string | null): string {
  if (!value) {
    return "Not reported";
  }

  const parsed = new Date(`${value}T00:00:00Z`);
  return Number.isNaN(parsed.getTime())
    ? value
    : MONTH_DAY_YEAR.format(parsed);
}

export function sourceShortName(source: Recall["source"]): string {
  return source === "usda_fsis" ? "USDA FSIS" : "FDA";
}

export function sourceFullName(source: Recall["source"]): string {
  return source === "usda_fsis"
    ? "U.S. Department of Agriculture FSIS"
    : "U.S. FDA enforcement data";
}

export function reportedDateLabel(source: Recall["source"]): string {
  return source === "usda_fsis" ? "Published by USDA FSIS" : "Listed by FDA";
}

export function formatClassification(
  value: string | null,
  source: Recall["source"] = "fda",
): string | null {
  if (!value) {
    return null;
  }

  const match = value.match(/class\s*(i{1,3})/i);
  return match
    ? `${source === "usda_fsis" ? "USDA" : "FDA"} Class ${match[1].toUpperCase()}`
    : value;
}

export function classificationTone(value: string | null): string {
  const normalized = value?.toLowerCase() ?? "";
  if (normalized.includes("class i") && !normalized.includes("class ii")) {
    return "class-one";
  }
  if (normalized.includes("class ii") && !normalized.includes("class iii")) {
    return "class-two";
  }
  if (normalized.includes("class iii")) {
    return "class-three";
  }
  return "unclassified";
}

export function hasUsefulSourceUrl(value: string | null): value is string {
  if (!value) {
    return false;
  }

  try {
    const url = new URL(value);
    return (
      (url.protocol === "https:" || url.protocol === "http:") &&
      !url.href.endsWith("recall_number:")
    );
  } catch {
    return false;
  }
}
