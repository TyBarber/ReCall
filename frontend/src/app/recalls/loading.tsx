export default function RecallDirectoryLoading() {
  return (
    <main className="home-page directory-page" aria-hidden="true">
      <span className="sr-only">Loading recall directory</span>
      <section className="directory-intro">
        <div className="shell directory-intro-inner">
          <div className="skeleton home-skeleton home-skeleton-kicker" />
          <div className="skeleton directory-skeleton-title" />
          <div className="skeleton directory-skeleton-copy" />
          <div className="home-skeleton-search">
            <div className="skeleton home-skeleton home-skeleton-input" />
          </div>
        </div>
      </section>
      <section className="recall-feed-section loading-content">
        <div className="shell recall-feed-inner">
          <div className="skeleton feed-skeleton feed-skeleton-title" />
          <div className="recall-grid">
            {Array.from({ length: 6 }, (_, index) => (
              <div className="recall-card skeleton-card" key={index}>
                <div className="skeleton skeleton-pill" />
                <div className="skeleton skeleton-line skeleton-wide" />
                <div className="skeleton skeleton-line" />
                <div className="skeleton skeleton-block" />
              </div>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
