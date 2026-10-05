export type Recall = {
  id: string;
  source: "fda" | "usda_fsis";
  source_recall_id: string;
  record_type: "recall" | "public_health_alert";
  category: "food";
  product_name: string;
  brand: string | null;
  recalling_firm?: string | null;
  description: string | null;
  recall_reason: string;
  classification: string | null;
  severity: string | null;
  status: string;
  source_active?: boolean | null;
  source_archived?: boolean | null;
  recall_date: string | null;
  reported_at: string | null;
  source_updated_at: string | null;
  distribution_pattern: string | null;
  product_code_info?: string | null;
  product_items: string[];
  establishment_numbers: string[];
  source_documents: string[];
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
  source?: "fda" | "usda_fsis";
  recordType?: "recall" | "public_health_alert";
};

export type RecallPage = {
  recalls: Recall[];
  totalCount: number;
};
