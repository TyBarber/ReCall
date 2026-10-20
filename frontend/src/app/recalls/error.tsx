"use client";

import Link from "next/link";

export default function RecallDirectoryError({ retry }: { retry: () => void }) {
  return (
    <main className="state-page">
      <div className="receipt state-receipt">
        <p className="void-stamp">VOID</p>
        <h1>Recall information is unavailable</h1>
        <p>Try loading the directory again, or return to the homepage.</p>
        <div className="state-actions">
          <button className="r-btn" type="button" onClick={retry}>
            Try again
          </button>
          <Link className="r-btn r-btn-ghost" href="/">
            Go to homepage
          </Link>
        </div>
      </div>
    </main>
  );
}
