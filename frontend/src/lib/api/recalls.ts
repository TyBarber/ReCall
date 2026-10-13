import { cache } from "react";

import { classificationTone } from "@/lib/format";
import type {
  Recall,
  RecallClassFilter,
  RecallListParams,
  RecallPage,
  SourceFreshness,
} from "@/lib/types";

export class RecallApiError extends Error {
  constructor(
    message: string,
    public readonly status?: number,
  ) {
    super(message);
    this.name = "RecallApiError";
  }
}

const API_CACHE_SECONDS = 300;

function apiBaseUrl(): string {
  const value = process.env.NEXT_PUBLIC_API_BASE_URL?.trim();
  if (!value) {
    throw new RecallApiError(
      "NEXT_PUBLIC_API_BASE_URL is not configured for the frontend.",
    );
  }
  return value.replace(/\/$/, "");
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === "string");
}

export function isRecall(value: unknown): value is Recall {
  if (!value || typeof value !== "object") {
    return false;
  }

  const recall = value as Record<string, unknown>;
  return (
    typeof recall.id === "string" &&
    (recall.source === "fda" || recall.source === "usda_fsis") &&
    typeof recall.source_recall_id === "string" &&
    (recall.record_type === undefined ||
      recall.record_type === "recall" ||
      recall.record_type === "public_health_alert") &&
    (recall.category === undefined || recall.category === "food") &&
    typeof recall.product_name === "string" &&
    (recall.recalling_firm === undefined ||
      recall.recalling_firm === null ||
      typeof recall.recalling_firm === "string") &&
    typeof recall.recall_reason === "string" &&
    typeof recall.status === "string" &&
    (recall.source_active === undefined ||
      recall.source_active === null ||
      typeof recall.source_active === "boolean") &&
    (recall.source_archived === undefined ||
      recall.source_archived === null ||
      typeof recall.source_archived === "boolean") &&
    (recall.reported_at === undefined ||
      recall.reported_at === null ||
      typeof recall.reported_at === "string") &&
    (recall.product_code_info === undefined ||
      recall.product_code_info === null ||
      typeof recall.product_code_info === "string") &&
    (recall.source_updated_at === undefined ||
      recall.source_updated_at === null ||
      typeof recall.source_updated_at === "string") &&
    (recall.product_items === undefined || isStringArray(recall.product_items)) &&
    (recall.establishment_numbers === undefined ||
      isStringArray(recall.establishment_numbers)) &&
    (recall.source_documents === undefined ||
      isStringArray(recall.source_documents)) &&
    isStringArray(recall.states) &&
    isStringArray(recall.upc_codes) &&
    isStringArray(recall.lot_numbers) &&
    typeof recall.created_at === "string" &&
    typeof recall.updated_at === "string"
  );
}

type ApiResponse = {
  data: unknown;
  headers: Headers;
};

function recallListPath(params: RecallListParams): string {
  const query = new URLSearchParams();
  if (params.source) {
    query.set("source", params.source);
  }
  query.set("limit", String(params.limit ?? 12));
  query.set("offset", String(params.offset ?? 0));
  if (params.search?.trim()) {
    query.set("search", params.search.trim());
  }
  if (params.status?.trim()) {
    query.set("status", params.status.trim());
  }
  if (params.sort) {
    query.set("sort", params.sort);
  }
  if (params.recordType) {
    query.set("record_type", params.recordType);
  }
  if (params.classification) {
    query.set("classification", params.classification);
  }
  return `/recalls?${query.toString()}`;
}

const CLASS_TONES: Record<RecallClassFilter, string> = {
  class_i: "class-one",
  class_ii: "class-two",
  class_iii: "class-three",
};

/**
 * An API without classification support ignores the parameter and returns
 * everything, which would mislabel results. Refuse rather than mislead.
 */
function assertClassification(
  recalls: Recall[],
  classification: RecallClassFilter | undefined,
): void {
  if (
    classification &&
    recalls.some(
      (recall) =>
        classificationTone(recall.classification) !== CLASS_TONES[classification],
    )
  ) {
    throw new RecallApiError(
      "The recall service does not support filtering by classification yet.",
    );
  }
}

function validatedRecallList(data: unknown): Recall[] {
  if (!Array.isArray(data) || !data.every(isRecall)) {
    throw new RecallApiError("The recall service returned invalid recall data.");
  }
  return data;
}

async function request(
  path: string,
  options: { notFoundMessage?: string } = {},
): Promise<ApiResponse> {
  let response: Response;
  try {
    // Recall data changes daily, so a short shared cache absorbs traffic
    // spikes without serving meaningfully stale information.
    response = await fetch(`${apiBaseUrl()}${path}`, {
      next: { revalidate: API_CACHE_SECONDS },
    });
  } catch (error) {
    throw new RecallApiError(
      error instanceof Error
        ? `The recall service could not be reached: ${error.message}`
        : "The recall service could not be reached.",
    );
  }

  if (!response.ok) {
    throw new RecallApiError(
      response.status === 404
        ? (options.notFoundMessage ??
          "The recall service endpoint could not be found.")
        : "The recall service returned an unexpected response.",
      response.status,
    );
  }

  try {
    return { data: await response.json(), headers: response.headers };
  } catch {
    throw new RecallApiError("The recall service returned unreadable data.");
  }
}

export async function getRecallPage(
  params: RecallListParams = {},
): Promise<RecallPage> {
  const { data, headers } = await request(recallListPath(params));
  const recalls = validatedRecallList(data);
  assertClassification(recalls, params.classification);

  const totalCountHeader = headers.get("x-total-count");
  const totalCount = Number.parseInt(totalCountHeader ?? "", 10);
  if (!Number.isSafeInteger(totalCount) || totalCount < 0) {
    throw new RecallApiError(
      "The recall service did not provide valid pagination metadata.",
    );
  }

  return { recalls, totalCount };
}

export async function getRecalls(
  params: RecallListParams = {},
): Promise<Recall[]> {
  const { data } = await request(recallListPath(params));
  const recalls = validatedRecallList(data);
  assertClassification(recalls, params.classification);
  return recalls;
}

function isSourceFreshness(value: unknown): value is SourceFreshness {
  if (!value || typeof value !== "object") {
    return false;
  }
  const entry = value as Record<string, unknown>;
  return (
    (entry.source === "fda" || entry.source === "usda_fsis") &&
    (entry.last_checked_at === null || typeof entry.last_checked_at === "string")
  );
}

/**
 * Returns per-source freshness, or null when the API predates the endpoint.
 * The endpoint's presence also signals classification filtering support.
 */
export const getFreshness = cache(async (): Promise<SourceFreshness[] | null> => {
  try {
    const { data } = await request("/freshness");
    const sources = (data as { sources?: unknown } | null)?.sources;
    return Array.isArray(sources) && sources.every(isSourceFreshness)
      ? sources
      : null;
  } catch {
    return null;
  }
});

export const getRecall = cache(async (id: string): Promise<Recall> => {
  const { data } = await request(`/recalls/${encodeURIComponent(id)}`, {
    notFoundMessage: "Recall not found.",
  });
  if (!isRecall(data)) {
    throw new RecallApiError("The recall service returned invalid recall data.");
  }
  return data;
});
