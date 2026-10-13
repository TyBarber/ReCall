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

export type SeverityKey = "serious" | "moderate" | "low" | "alert" | "unknown";

export type Severity = {
  key: SeverityKey;
  label: string;
  summary: string;
  advice: string;
};

const SEVERITIES: Record<SeverityKey, Omit<Severity, "key">> = {
  serious: {
    label: "Serious",
    summary: "Could cause serious illness.",
    advice: "Don’t eat it. Throw it away or return it to the store.",
  },
  moderate: {
    label: "Moderate",
    summary: "Could make you sick for a short time.",
    advice: "Don’t eat it. Return it or throw it away.",
  },
  low: {
    label: "Low risk",
    summary: "Unlikely to make you sick.",
    advice: "Often a labeling mistake. Check the details before eating it.",
  },
  alert: {
    label: "Health alert",
    summary: "Officials are warning people about this food.",
    advice: "Don’t eat it. A formal recall was not issued.",
  },
  unknown: {
    label: "Not classified",
    summary: "The agency has not shared a risk level yet.",
    advice: "Check the details below before eating it.",
  },
};

export function recallSeverity(
  recall: Pick<Recall, "classification" | "record_type">,
): Severity {
  const tone = classificationTone(recall.classification);
  const key: SeverityKey =
    tone === "class-one"
      ? "serious"
      : tone === "class-two"
        ? "moderate"
        : tone === "class-three"
          ? "low"
          : recall.record_type === "public_health_alert"
            ? "alert"
            : "unknown";

  return { key, ...SEVERITIES[key] };
}

export function severityByKey(key: SeverityKey): Severity {
  return { key, ...SEVERITIES[key] };
}

const PACKAGING_DETAIL =
  /(?:[.;,]\s+|\s+)(?:net\s*wt\b|net\s*weight\b|upc\b|ingredients?\s*:|product\s*code\b|item\s*#|retail\s*package\b|produced\s+and\s+distributed\b|distributed\s+by\b|packed\s+by\b|manufactured\s+by\b|this\s+is\b)/i;
const LEADING_UPC = /^upc[:#\s]*[\d\s-]+/i;
const TRAILING_SIZE = /\s+(?:\d+(?:\.\d+)?\s*(?:ct|oz|lbs?|g|kg|ml|l)\.?|\([^)]*\))$/i;
const KEEP_UPPERCASE = new Set(["BBQ", "USA", "USDA", "FDA", "UPC", "II", "III"]);
const MAX_DISPLAY_NAME = 80;

function capitalizeWord(word: string): string {
  return word.charAt(0) + word.slice(1).toLocaleLowerCase("en-US");
}

/** Shortens raw agency product text into a readable product name. */
export function displayProductName(raw: string): string {
  const original = raw.trim().replace(/\s+/g, " ");
  let name = original.replace(LEADING_UPC, "").trim();

  const packaging = name.match(PACKAGING_DETAIL);
  if (packaging?.index && packaging.index >= 8) {
    name = name.slice(0, packaging.index);
  }
  if (name.indexOf("; ") >= 8) {
    name = name.slice(0, name.indexOf("; "));
  }
  while (TRAILING_SIZE.test(name)) {
    name = name.replace(TRAILING_SIZE, "");
  }
  name = name.replace(/[\s.,;:-]+$/, "");

  const letters = name.replace(/[^A-Za-z]/g, "");
  const mostlyUppercase =
    letters.length > 0 &&
    letters.replace(/[^A-Z]/g, "").length / letters.length > 0.6;
  name = name.replace(/[A-Za-z][A-Za-z'’]*/g, (word) => {
    if (word !== word.toUpperCase() || KEEP_UPPERCASE.has(word)) {
      return word;
    }
    return word.length >= (mostlyUppercase ? 3 : 4) ? capitalizeWord(word) : word;
  });

  if (name.length > MAX_DISPLAY_NAME) {
    const cut = name.lastIndexOf(" ", MAX_DISPLAY_NAME);
    name = `${name.slice(0, cut > 40 ? cut : MAX_DISPLAY_NAME).replace(/[\s.,;:-]+$/, "")}…`;
  }

  return name || original;
}

export type FoodCategory =
  | "seafood"
  | "meat"
  | "dairy"
  | "bakery"
  | "drinks"
  | "spices"
  | "produce"
  | "snacks"
  | "meals";

const CATEGORY_KEYWORDS: [FoodCategory, string[]][] = [
  ["seafood", ["fish", "salmon", "tuna", "shrimp", "crab", "seafood", "oyster", "clam", "cod", "tilapia"]],
  ["meat", ["beef", "chicken", "pork", "sausage", "turkey", "meat", "poultry", "ham", "bacon", "jerky", "hot dog", "lamb", "steak"]],
  ["dairy", ["cheese", "milk", "cream", "yogurt", "butter", "dairy", "reques", "queso"]],
  ["bakery", ["bread", "cookie", "cake", "bakery", "muffin", "bun", "bagel", "pastr", "tortilla", "cracker", "pie"]],
  ["produce", ["sprout", "tomato", "lettuce", "salad", "fruit", "vegetable", "spinach", "onion", "jalape", "apple", "cucumber", "cantaloupe", "berr", "produce", "salsa", "carrot", "melon"]],
  ["drinks", ["tea", "coffee", "juice", "drink", "beverage", "water", "soda", "kombucha", "tisane"]],
  ["spices", ["spice", "powder", "seasoning", "curry", "cinnamon", "herb", "pepper flakes"]],
  ["snacks", ["chocolate", "candy", "chip", "snack", "nut", "granola", "bar"]],
];

const CATEGORY_PATTERNS = CATEGORY_KEYWORDS.map(
  ([category, words]) =>
    [category, new RegExp(`\\b(?:${words.join("|")})`, "i")] as const,
);

export function foodCategory(
  recall: Pick<Recall, "product_name" | "description">,
): FoodCategory {
  const text = `${recall.product_name} ${recall.description ?? ""}`;
  return (
    CATEGORY_PATTERNS.find(([, pattern]) => pattern.test(text))?.[0] ?? "meals"
  );
}
