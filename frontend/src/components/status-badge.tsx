type StatusBadgeProps = {
  status: string;
};

function statusTone(status: string): string {
  switch (status.trim().toLowerCase()) {
    case "ongoing":
      return "ongoing";
    case "terminated":
      return "terminated";
    case "completed":
      return "completed";
    default:
      return "neutral";
  }
}

export function StatusBadge({ status }: StatusBadgeProps) {
  return (
    <span className={`status-badge status-badge-${statusTone(status)}`}>
      <span className="status-indicator" aria-hidden="true">
        <span className="status-dot" />
      </span>
      {status}
    </span>
  );
}
