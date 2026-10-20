import { EmptyState } from "@/components/empty-state";
import { Pagination } from "@/components/pagination";
import { Cut, Line } from "@/components/receipt";
import { RecallCard } from "@/components/recall-card";
import { recallSeverity, type SeverityKey } from "@/lib/format";
import type { Recall } from "@/lib/types";

type RecallFeedProps = {
  recalls: Recall[];
  search?: string;
  status?: string;
  source?: Recall["source"];
  recordType?: Recall["record_type"];
  level?: string;
  currentPage: number;
  limit: number;
  totalCount: number;
};

const TOTALS: [SeverityKey, string][] = [
  ["serious", "Serious"],
  ["moderate", "Moderate"],
  ["low", "Low risk"],
  ["alert", "Health alerts"],
  ["unknown", "Not classified"],
];

export function RecallFeed({
  recalls,
  search,
  status,
  source,
  recordType,
  level,
  currentPage,
  limit,
  totalCount,
}: RecallFeedProps) {
  if (recalls.length === 0) {
    return (
      <EmptyState
        filtered={Boolean(
          search || status || source || recordType || level || currentPage > 1,
        )}
        search={currentPage === 1 ? search : undefined}
        otherFilters={Boolean(status || source || recordType || level)}
      />
    );
  }

  const counts = recalls.reduce<Partial<Record<SeverityKey, number>>>((total, recall) => {
    const key = recallSeverity(recall).key;
    total[key] = (total[key] ?? 0) + 1;
    return total;
  }, {});

  return (
    <>
      <ul className="r-items">
        {recalls.map((recall) => (
          <li key={recall.id}>
            <RecallCard recall={recall} />
          </li>
        ))}
      </ul>
      <Cut dots />
      <div className="totals">
        {TOTALS.filter(([key]) => counts[key]).map(([key, label]) => (
          <Line
            className={`tone-${key}`}
            key={key}
            name={label}
            value={<span className={key === "serious" ? "tag" : undefined}>{counts[key]}</span>}
          />
        ))}
        <Line name="On this page" strong value={recalls.length} />
      </div>
      <Pagination
        currentPage={currentPage}
        limit={limit}
        search={search}
        status={status}
        source={source}
        recordType={recordType}
        level={level}
        totalCount={totalCount}
      />
    </>
  );
}
