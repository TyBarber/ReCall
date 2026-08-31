import { EmptyState } from "@/components/empty-state";
import { Pagination } from "@/components/pagination";
import { RecallCard } from "@/components/recall-card";
import type { Recall } from "@/lib/types";

type RecallFeedProps = {
  recalls: Recall[];
  search?: string;
  status?: string;
  offset: number;
  limit: number;
};

export function RecallFeed({
  recalls,
  search,
  status,
  offset,
  limit,
}: RecallFeedProps) {
  if (recalls.length === 0) {
    return <EmptyState filtered={Boolean(search || status || offset)} />;
  }

  return (
    <>
      <div className="recall-grid">
        {recalls.map((recall) => (
          <RecallCard key={recall.id} recall={recall} />
        ))}
      </div>
      <Pagination
        offset={offset}
        limit={limit}
        resultCount={recalls.length}
        search={search}
        status={status}
      />
    </>
  );
}
