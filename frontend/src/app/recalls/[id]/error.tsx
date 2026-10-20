"use client";

import Link from "next/link";

export default function RecallDetailError({ retry }: { retry: () => void }) {
  return (
    <main className="state-page">
      <div className="receipt state-receipt">
        <p className="void-stamp">VOID</p>
        <h1>Recall details are unavailable</h1>
        <p>Try loading this recall again, or return to the recall directory.</p>
        <div className="state-actions">
          <button className="r-btn" type="button" onClick={retry}>
            Try again
          </button>
          <Link className="r-btn r-btn-ghost" href="/recalls">
            Back to recalls
          </Link>
        </div>
      </div>
    </main>
  );
}
