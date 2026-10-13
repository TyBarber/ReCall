export default function Loading() {
  return (
    <div className="home-page home-loading">
      <span className="sr-only">Loading current recalls</span>
      <section className="shell hero" aria-hidden="true">
        <div className="hero-panel">
          <div className="skeleton home-skeleton-headline" />
          <div className="skeleton home-skeleton-copy" />
          <div className="skeleton home-skeleton-input" />
        </div>
        <div className="spotlight-card tone-unknown spotlight-skeleton">
          <div className="skeleton skeleton-pill" />
          <div className="skeleton skeleton-line skeleton-wide" />
          <div className="skeleton skeleton-block" />
        </div>
      </section>
      <main className="shell home-latest loading-content" aria-hidden="true">
        <div className="skeleton feed-skeleton-title" />
        <div className="recall-grid">
          {Array.from({ length: 6 }, (_, index) => (
            <div className="recall-card tone-unknown skeleton-card" key={index}>
              <div className="skeleton skeleton-pill" />
              <div className="skeleton skeleton-line skeleton-wide" />
              <div className="skeleton skeleton-line" />
              <div className="skeleton skeleton-block" />
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
