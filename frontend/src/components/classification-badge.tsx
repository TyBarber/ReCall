import { classificationTone, formatClassification } from "@/lib/format";

type ClassificationBadgeProps = {
  classification: string | null;
};

export function ClassificationBadge({
  classification,
}: ClassificationBadgeProps) {
  const label = formatClassification(classification);
  if (!label) {
    return null;
  }

  return (
    <span className={`badge badge-${classificationTone(classification)}`}>
      {label}
    </span>
  );
}
