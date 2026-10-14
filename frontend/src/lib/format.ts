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
};

// Summaries paraphrase the agencies' own class definitions. The frontend does
// not invent disposal, return, or medical guidance.
const SEVERITIES: Record<SeverityKey, Omit<Severity, "key">> = {
  serious: {
    label: "Serious",
    summary: "Could cause serious health problems or death.",
  },
  moderate: {
    label: "Moderate",
    summary: "Could cause temporary health problems.",
  },
  low: {
    label: "Low risk",
    summary: "Not likely to cause health problems.",
  },
  alert: {
    label: "Health alert",
    summary: "A USDA FSIS warning about a possible health risk.",
  },
  unknown: {
    label: "Not classified",
    summary: "The agency has not reported a risk level.",
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
  /(?:[.;,]\s+|\s+)(?:net\s*wt\b|net\s*weight\b|upc\b|ingredients?\s*:|product\s*code\b|item\s*#|retail\s*package\b|produced\s+and\s+distributed\b|distributed\s+by\b|packed\s+by\b|manufactured\s+by\b|this\s+is\b|keep\s+refrigerated\b|pack(?:ag)?ed\s+in\b|shelf\s+life\b|product\s+of\b|each\s+\w+\s+(?:is|contains)\b)/i;
// FSIS titles read like headlines: "Acme LLC Recalls Pork Products Due to ...".
const FSIS_ALERT_PREFIX = /^FSIS\s+Issues\s+Public\s+Health\s+Alert\s+for\s+(?:an?\s+)?/i;
const FSIS_RECALL_TITLE = /^(.+?)\s+Recalls?\s+(.+)$/;
const FSIS_TITLE_REASON =
  /\s+(?:Due\s+to|That\s+(?:May|Have|Has|Were|Was)|Because|Produced\s+Without|(?:Illegally\s+)?Imported\s+(?:From|Without)|Distributed\s+Without|Containing)\b/i;
// A sentence break after a real product name ("Pico De Gallo. Ingredients...").
const SENTENCE_BREAK = /\.\s+(?=[A-Z])/;
const LEADING_UPC = /^upc[:#\s]*[\d\s-]+/i;
const TRAILING_SIZE = /\s+(?:\d+(?:\.\d+)?\s*(?:ct|oz|lbs?|g|kg|ml|l)\.?|\([^)]*\))$/i;
const KEEP_UPPERCASE = new Set([
  "BBQ", "USA", "USDA", "FDA", "FSIS", "UPC", "II", "III", "LLC", "LLP", "LP", "DBA",
]);
const MAX_DISPLAY_NAME = 80;

function capitalizeWord(word: string): string {
  return word.charAt(0) + word.slice(1).toLocaleLowerCase("en-US");
}

/** Turns ALL-CAPS words from agency data into normal capitalization. */
export function softenCapitals(text: string): string {
  const letters = text.replace(/[^A-Za-z]/g, "");
  const mostlyUppercase =
    letters.length > 0 &&
    letters.replace(/[^A-Z]/g, "").length / letters.length > 0.6;
  return text.replace(/[A-Za-z][A-Za-z'’]*/g, (word) => {
    if (word !== word.toUpperCase() || KEEP_UPPERCASE.has(word)) {
      return word;
    }
    return word.length >= (mostlyUppercase ? 2 : 4) ? capitalizeWord(word) : word;
  });
}

/** Shortens raw agency product text into a readable product name. */
export function displayProductName(raw: string): string {
  // Some FDA text arrives with "¿" in place of accented letters ("Jalapen¿o").
  const original = raw.trim().replace(/\s+/g, " ").replace(/(\w)¿(\w)/g, "$1$2");
  let name = original.replace(LEADING_UPC, "").trim();

  const fsisProduct = fsisTitleParts(name)?.product;
  if (fsisProduct) {
    name = fsisProduct;
  }

  const packaging = name.match(PACKAGING_DETAIL);
  if (packaging?.index && packaging.index >= 8) {
    name = name.slice(0, packaging.index);
  }
  if (name.indexOf("; ") >= 8) {
    name = name.slice(0, name.indexOf("; "));
  }
  const sentence = name.match(SENTENCE_BREAK);
  if (sentence?.index && sentence.index >= 12) {
    name = name.slice(0, sentence.index);
  }
  while (TRAILING_SIZE.test(name)) {
    name = name.replace(TRAILING_SIZE, "");
  }
  name = name.replace(/[\s.,;:-]+$/, "");

  name = softenCapitals(name);

  if (name.length > MAX_DISPLAY_NAME) {
    const cut = name.lastIndexOf(" ", MAX_DISPLAY_NAME);
    name = `${name.slice(0, cut > 40 ? cut : MAX_DISPLAY_NAME).replace(/[\s.,;:-]+$/, "")}…`;
  }

  return name || original;
}

function fsisTitleParts(
  title: string,
): { company: string | null; product: string } | null {
  let company: string | null = null;
  let rest: string;
  if (FSIS_ALERT_PREFIX.test(title)) {
    rest = title.replace(FSIS_ALERT_PREFIX, "");
  } else {
    const match = title.match(FSIS_RECALL_TITLE);
    // Headlines name a company of a few words before "Recalls".
    if (!match || match[1].split(/\s+/).length > 10 || !/^[A-Z0-9]/.test(match[1])) {
      return null;
    }
    company = match[1].replace(/[,\s]+$/, "");
    rest = match[2];
  }
  const reason = rest.match(FSIS_TITLE_REASON);
  const product = (reason?.index ? rest.slice(0, reason.index) : rest).trim();
  return product.length >= 4 ? { company, product } : null;
}

/** The recalling company, falling back to the firm named in a USDA title. */
export function displayCompany(
  recall: Pick<Recall, "recalling_firm" | "brand" | "product_name" | "source">,
): string | null {
  const company =
    recall.recalling_firm?.trim() ||
    recall.brand?.trim() ||
    (recall.source === "usda_fsis"
      ? fsisTitleParts(recall.product_name)?.company
      : null);
  return company ? softenCapitals(company) : null;
}

export type FoodCategory =
  | "seafood"
  | "meat"
  | "dairy"
  | "bakery"
  | "drinks"
  | "supplements"
  | "spices"
  | "produce"
  | "snacks"
  | "meals";

const CATEGORY_KEYWORDS: [FoodCategory, string[]][] = [
  ["seafood", ["fish", "salmon", "tuna", "shrimp", "crab", "seafood", "oyster", "clam", "cod", "tilapia", "siluriformes", "catfish"]],
  ["meat", ["beef", "chicken", "pork", "sausage", "turkey", "meat", "poultry", "ham", "bacon", "jerky", "hot dog", "lamb", "steak", "goat", "pastrami", "guanciale", "meatloaf"]],
  ["supplements", ["collagen", "peptide", "supplement", "capsule", "vitamin", "ginseng", "protein powder"]],
  ["drinks", ["tea", "coffee", "juice", "drink", "beverage", "soda", "kombucha", "tisane", "cashewmilk", "almondmilk", "oatmilk", "7up"]],
  ["dairy", ["cheese", "cheddar", "milk", "cream", "yogurt", "butter", "dairy", "reques*", "queso", "pecorino", "fromage"]],
  ["bakery", ["bread", "cookie", "cake", "bakery", "muffin", "bun", "bagel", "pastr*", "tortilla", "cracker", "pie", "fettuccine", "pasta", "noodle", "dumpling"]],
  ["produce", ["sprout*", "alfalfa", "mung", "broccoli", "radish", "garlic", "pepper", "tomato", "lettuce", "salad", "fruit", "vegetable", "spinach", "onion", "jalape*", "apple", "cucumber", "cantaloupe", "berr*", "strawberr*", "produce", "salsa", "pico", "guacamole", "avocado", "carrot", "melon", "mushroom", "raisin", "coconut", "moringa"]],
  ["spices", ["spice", "powder", "seasoning", "curry", "cinnamon", "herb", "sugar", "olive oil", "oil"]],
  ["snacks", ["chocolate", "candy", "chip", "snack", "nut", "granola", "bar", "hots", "puffs", "crisps", "pretzel", "popcorn", "crackling*"]],
];

// Keywords match whole words (plus a plural ending); a trailing "*" marks a
// prefix such as "jalape*" for "jalapeño". Whole words keep "bun" out of
// "bundle" and "cod" out of "code".
const CATEGORY_PATTERNS = CATEGORY_KEYWORDS.map(([category, words]) => {
  const alternatives = words.map((word) =>
    word.endsWith("*") ? word.slice(0, -1) : `${word}(?:e?s)?\\b`,
  );
  return [category, new RegExp(`\\b(?:${alternatives.join("|")})`, "i")] as const;
});

function categoryIn(text: string): FoodCategory | undefined {
  // "Dairy free" products should not get the dairy icon.
  const cleaned = text.replace(/\bdairy[\s-]free\b/gi, " ");
  return CATEGORY_PATTERNS.find(([, pattern]) => pattern.test(cleaned))?.[0];
}

/** Picks an icon category from the product name first, then the description. */
export function foodCategory(
  recall: Pick<Recall, "product_name" | "description">,
): FoodCategory {
  return (
    categoryIn(displayProductName(recall.product_name)) ??
    categoryIn(recall.description ?? "") ??
    "meals"
  );
}

export const SEVERITY_FILTERS = [
  ["serious", "class_i"],
  ["moderate", "class_ii"],
  ["low", "class_iii"],
] as const;

export type SeverityFilterKey = (typeof SEVERITY_FILTERS)[number][0];

export function severityFilterClass(
  level: string,
): (typeof SEVERITY_FILTERS)[number][1] | undefined {
  return SEVERITY_FILTERS.find(([key]) => key === level)?.[1];
}

const RELATIVE_TIME = new Intl.RelativeTimeFormat("en-US", { numeric: "auto" });

/** "2 hours ago"-style text for a past timestamp. */
export function formatTimeAgo(value: string, now: Date = new Date()): string | null {
  const then = new Date(value);
  if (Number.isNaN(then.getTime())) {
    return null;
  }
  const minutes = Math.round((then.getTime() - now.getTime()) / 60_000);
  if (Math.abs(minutes) < 60) {
    return minutes > -1 ? "just now" : RELATIVE_TIME.format(minutes, "minute");
  }
  const hours = Math.round(minutes / 60);
  if (Math.abs(hours) < 48) {
    return RELATIVE_TIME.format(hours, "hour");
  }
  return RELATIVE_TIME.format(Math.round(hours / 24), "day");
}

/** The most recent check across sources, for a single "last checked" label. */
export function latestCheck(
  sources: { last_checked_at: string | null }[] | null,
): string | null {
  const times = (sources ?? [])
    .map((source) => source.last_checked_at)
    .filter((value): value is string => Boolean(value))
    .sort();
  return times.at(-1) ?? null;
}

const COMPANY_SUFFIX =
  /[,\s]+(?:inc|incorporated|llc|l\.l\.c|ltd|limited|co|corp|corporation|company|lp|llp|plc|us|usa)\.?$/i;

/**
 * A company name trimmed to what search can match across records, e.g.
 * "Taylor Fresh Foods, Inc." becomes "Taylor Fresh Foods", so a watch also
 * finds recalls filed as "Taylor Fresh Foods Inc".
 */
export function companyWatchTerm(company: string): string | null {
  let name = company.trim().replace(/\s+/g, " ");
  for (let previous = ""; previous !== name; ) {
    previous = name;
    name = name.replace(COMPANY_SUFFIX, "").trim();
  }
  return name.length >= 3 ? name.slice(0, 80) : null;
}
