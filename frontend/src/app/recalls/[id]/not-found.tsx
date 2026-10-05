import Link from "next/link";

export default function RecallNotFound() {
  return (
    <main className="shell state-page">
      <div className="state-card">
        <span className="state-symbol" aria-hidden="true">
          ?
        </span>
        <h1>Recall not found</h1>
        <p>
          This recall may no longer be available at this address. Browse the
          recall directory to find current information.
        </p>
        <Link className="primary-button" href="/recalls">
          Browse recalls
        </Link>
      </div>
    </main>
  );
}
