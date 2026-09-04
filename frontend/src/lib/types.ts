export type Recall = {
  id: string;
  source: "fda";
  source_recall_id: string;
  product_name: string;
  brand: string | null;
  description: string | null;
  recall_reason: string;
  classification: string | null;
  severity: string | null;
  status: string;
  recall_date: string | null;
  reported_at: string | null;
  distribution_pattern: string | null;
  states: string[];
  upc_codes: string[];
  lot_numbers: string[];
  source_url: string | null;
  created_at: string;
  updated_at: string;
};

export type RecallListParams = {
  search?: string;
  status?: string;
  limit?: number;
  offset?: number;
  sort?: "newest";
};

export type RecallPage = {
  recalls: Recall[];
  totalCount: number;
};
