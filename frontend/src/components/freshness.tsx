import { formatTimeAgo, latestCheck, sourceShortName } from "@/lib/format";
import type { SourceFreshness } from "@/lib/types";

/** Shows when ReCall last checked its sources, falling back to the schedule. */
export function FreshnessSticker({
  sources,
  className = "",
}: {
  sources: SourceFreshness[] | null;
  className?: string;
}) {
  const latest = latestCheck(sources);
  const ago = latest ? formatTimeAgo(latest) : null;

  return (
    <span className={className || undefined}>
      {ago ? (
        <time dateTime={latest ?? undefined}>Checked {ago}</time>
      ) : (
        "Updated daily"
      )}
    </span>
  );
}

export function FreshnessDetails({ sources }: { sources: SourceFreshness[] | null }) {
  const checked = (sources ?? []).flatMap((source) => {
    const ago = source.last_checked_at ? formatTimeAgo(source.last_checked_at) : null;
    return ago && source.last_checked_at
      ? [{ source: source.source, ago, at: source.last_checked_at }]
      : [];
  });

  if (checked.length === 0) {
    return null;
  }

  return (
    <p className="footer-freshness">
      {checked.map(({ source, ago, at }) => (
        <span key={source}>
          {sourceShortName(source)} last checked <time dateTime={at}>{ago}</time>
        </span>
      ))}
    </p>
  );
}
