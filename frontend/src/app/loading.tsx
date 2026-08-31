export default function Loading() {
  return (
    <div className="alert-page home-loading">
      <span className="sr-only">Loading current recalls</span>
      <section className="ticker-intro" aria-hidden="true">
        <div className="shell ticker-intro-inner">
          <div className="skeleton skeleton-source" />
          <div className="skeleton skeleton-headline" />
          <div className="skeleton skeleton-copy" />
          <div className="skeleton skeleton-search" />
        </div>
      </section>
      <main className="ticker-feed loading-content" aria-hidden="true">
        <div className="shell ticker-feed-inner">
          <div className="skeleton skeleton-feed-heading" />
          <div className="recall-grid">
            {Array.from({ length: 6 }, (_, index) => (
              <div className="recall-row skeleton-row" key={index}>
                <div className="skeleton skeleton-code" />
                <div className="skeleton-row-copy">
                  <div className="skeleton skeleton-line skeleton-wide" />
                  <div className="skeleton skeleton-line" />
                </div>
                <div className="skeleton skeleton-status" />
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}
