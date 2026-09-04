export default function RecallDetailLoading() {
  return (
    <main className="shell detail-page loading-content">
      <span className="sr-only">Loading recall details</span>
      <div className="skeleton skeleton-link" />
      <div className="detail-layout" aria-hidden="true">
        <div className="detail-main">
          <div className="skeleton skeleton-pill" />
          <div className="skeleton skeleton-line skeleton-wide" />
          <div className="skeleton skeleton-line" />
          <div className="skeleton skeleton-block skeleton-tall" />
        </div>
        <div className="detail-sidebar skeleton skeleton-tall" />
      </div>
    </main>
  );
}
