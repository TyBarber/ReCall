import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { RecallDetailView } from "@/components/recall-detail";
import { getRecall, RecallApiError } from "@/lib/api/recalls";
import { formatRecallDate } from "@/lib/format";

type RecallDetailProps = {
  params: Promise<{ id: string }>;
};

export async function generateMetadata({
  params,
}: RecallDetailProps): Promise<Metadata> {
  const { id } = await params;
  try {
    const recall = await getRecall(id);
    return {
      title: recall.product_name,
      description: `${recall.recall_reason} Recall started ${formatRecallDate(recall.recall_date)}.`,
    };
  } catch {
    return { title: "Recall details" };
  }
}

export default async function RecallDetail({ params }: RecallDetailProps) {
  const { id } = await params;
  let recall;
  try {
    recall = await getRecall(id);
  } catch (error) {
    if (error instanceof RecallApiError && error.status === 404) {
      notFound();
    }
    throw error;
  }

  return <RecallDetailView recall={recall} />;
}
