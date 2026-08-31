export default function RecallDetailLoading() {
  return (
    <main className="shell detail-page loading-content">
      <span className="sr-only">Loading recall details</span>
      <div className="skeleton skeleton-link" />
      <div aria-hidden="true">
        <div className="detail-record-header">
          <div className="skeleton skeleton-code-line" />
          <div className="skeleton skeleton-detail-title" />
          <div className="skeleton skeleton-line" />
        </div>
        <div className="detail-record skeleton-record">
          {Array.from({ length: 7 }, (_, index) => (
            <div className="skeleton-record-row" key={index}>
              <div className="skeleton skeleton-field-label" />
              <div className="skeleton skeleton-field-value" />
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
