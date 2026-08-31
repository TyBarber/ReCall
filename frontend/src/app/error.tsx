"use client";

export default function ErrorPage({ retry }: { retry: () => void }) {
  return (
    <main className="shell state-page">
      <div className="state-panel error-state">
        <p className="state-code" aria-hidden="true">ERR</p>
        <h1>Recall feed unavailable</h1>
        <p>Check your connection, then try again.</p>
        <button className="primary-button" type="button" onClick={retry}>
          Try again
        </button>
      </div>
    </main>
  );
}
