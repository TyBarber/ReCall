export default function Loading() {
  return (
    <div className="home-page home-loading">
      <span className="sr-only">Loading current recalls</span>
      <section className="signal-hero" aria-hidden="true">
        <div className="shell signal-hero-inner">
          <div className="hero-primary">
            <div className="skeleton home-skeleton home-skeleton-headline" />
            <div className="skeleton home-skeleton home-skeleton-copy" />
            <div className="home-skeleton-search">
              <div className="skeleton home-skeleton home-skeleton-input" />
            </div>
          </div>
          <div className="spotlight-skeleton">
            <div className="skeleton spotlight-skeleton-line" />
            <div className="skeleton spotlight-skeleton-title" />
            <div className="skeleton spotlight-skeleton-copy" />
          </div>
        </div>
      </section>
      <main className="recall-feed-section loading-content" aria-hidden="true">
        <div className="shell recall-feed-inner">
          <div className="skeleton feed-skeleton feed-skeleton-title" />
          <div className="recall-grid">
            {Array.from({ length: 4 }, (_, index) => (
              <div className="recall-card skeleton-card" key={index}>
                <div className="skeleton skeleton-pill" />
                <div className="skeleton skeleton-line skeleton-wide" />
                <div className="skeleton skeleton-line" />
                <div className="skeleton skeleton-block" />
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}
