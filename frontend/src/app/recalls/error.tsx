"use client";

import Link from "next/link";

export default function RecallDirectoryError({ retry }: { retry: () => void }) {
  return (
    <main className="shell state-page">
      <div className="state-card error-state">
        <span className="state-symbol" aria-hidden="true">
          !
        </span>
        <h1>Recall information is unavailable</h1>
        <p>Try loading the directory again, or return to the homepage.</p>
        <div className="state-actions">
          <button className="primary-button" type="button" onClick={retry}>
            Try again
          </button>
          <Link className="secondary-button" href="/">
            Go to homepage
          </Link>
        </div>
      </div>
    </main>
  );
}
