"use client";

import Link from "next/link";

export default function RecallDetailError({ retry }: { retry: () => void }) {
  return (
    <main className="shell state-page">
      <div className="state-card error-state">
        <span className="state-symbol" aria-hidden="true">
          !
        </span>
        <h1>Recall details are unavailable</h1>
        <p>Try loading this recall again, or return to the recall directory.</p>
        <div className="state-actions">
          <button className="primary-button" type="button" onClick={retry}>
            Try again
          </button>
          <Link className="secondary-button" href="/recalls">
            Back to recalls
          </Link>
        </div>
      </div>
    </main>
  );
}
