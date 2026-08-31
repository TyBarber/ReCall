import { cache } from "react";

import type { Recall, RecallListParams } from "@/lib/types";

export class RecallApiError extends Error {
  constructor(
    message: string,
    public readonly status?: number,
  ) {
    super(message);
    this.name = "RecallApiError";
  }
}

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
    recall.source === "fda" &&
    typeof recall.source_recall_id === "string" &&
    typeof recall.product_name === "string" &&
    typeof recall.recall_reason === "string" &&
    typeof recall.status === "string" &&
    isStringArray(recall.states) &&
    isStringArray(recall.upc_codes) &&
    isStringArray(recall.lot_numbers) &&
    typeof recall.created_at === "string" &&
    typeof recall.updated_at === "string"
  );
}

async function request(path: string): Promise<unknown> {
  let response: Response;
  try {
    response = await fetch(`${apiBaseUrl()}${path}`, { cache: "no-store" });
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
        ? "Recall not found."
        : "The recall service returned an unexpected response.",
      response.status,
    );
  }

  try {
    return await response.json();
  } catch {
    throw new RecallApiError("The recall service returned unreadable data.");
  }
}

export async function getRecalls(
  params: RecallListParams = {},
): Promise<Recall[]> {
  const query = new URLSearchParams();
  query.set("source", "fda");
  query.set("limit", String(params.limit ?? 12));
  query.set("offset", String(params.offset ?? 0));
  if (params.search?.trim()) {
    query.set("search", params.search.trim());
  }
  if (params.status?.trim()) {
    query.set("status", params.status.trim());
  }

  const data = await request(`/recalls?${query.toString()}`);
  if (!Array.isArray(data) || !data.every(isRecall)) {
    throw new RecallApiError("The recall service returned invalid recall data.");
  }
  return data;
}

export const getRecall = cache(async (id: string): Promise<Recall> => {
  const data = await request(`/recalls/${encodeURIComponent(id)}`);
  if (!isRecall(data)) {
    throw new RecallApiError("The recall service returned invalid recall data.");
  }
  return data;
});
