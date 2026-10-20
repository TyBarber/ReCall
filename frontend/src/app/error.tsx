"use client";

export default function ErrorPage({ retry }: { retry: () => void }) {
  return (
    <main className="state-page">
      <div className="receipt state-receipt">
        <p className="void-stamp">VOID</p>
        <h1>Recall information is unavailable</h1>
        <p>
          We could not load the recall feed. Check your connection and try
          again.
        </p>
        <button className="r-btn" type="button" onClick={retry}>
          Try again
        </button>
      </div>
    </main>
  );
}
