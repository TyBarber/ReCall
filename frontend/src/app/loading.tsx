export default function Loading() {
  return (
    <main className="state-page loading-content">
      <span className="sr-only">Loading current recalls</span>
      <div className="receipt" aria-hidden="true">
        <div className="skeleton skeleton-title" />
        <div className="skeleton skeleton-short" style={{ margin: "0 auto" }} />
        <hr className="cut" />
        {Array.from({ length: 6 }, (_, index) => (
          <div key={index} style={{ marginBottom: 22 }}>
            <div className="skeleton skeleton-wide" />
            <div className="skeleton skeleton-short" />
          </div>
        ))}
      </div>
    </main>
  );
}
