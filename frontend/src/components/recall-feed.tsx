import { EmptyState } from "@/components/empty-state";
import { Pagination } from "@/components/pagination";
import { RecallCard } from "@/components/recall-card";
import type { Recall } from "@/lib/types";

type RecallFeedProps = {
  recalls: Recall[];
  search?: string;
  status?: string;
  source?: Recall["source"];
  recordType?: Recall["record_type"];
  currentPage: number;
  limit: number;
  totalCount: number;
};

export function RecallFeed({
  recalls,
  search,
  status,
  source,
  recordType,
  currentPage,
  limit,
  totalCount,
}: RecallFeedProps) {
  if (recalls.length === 0) {
    return (
      <EmptyState
        filtered={Boolean(
          search || status || source || recordType || currentPage > 1,
        )}
      />
    );
  }

  return (
    <>
      <div className="recall-grid">
        {recalls.map((recall) => (
          <RecallCard key={recall.id} recall={recall} />
        ))}
      </div>
      <Pagination
        currentPage={currentPage}
        limit={limit}
        search={search}
        status={status}
        source={source}
        recordType={recordType}
        totalCount={totalCount}
      />
    </>
  );
}
