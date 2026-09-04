"use client";

export default function ErrorPage({ retry }: { retry: () => void }) {
  return (
    <main className="shell state-page">
      <div className="state-card error-state">
        <span className="state-symbol" aria-hidden="true">
          !
        </span>
        <h1>Recall information is unavailable</h1>
        <p>
          We could not load the recall feed. Check your connection and try
          again.
        </p>
        <button className="primary-button" type="button" onClick={retry}>
          Try again
        </button>
      </div>
    </main>
  );
}
