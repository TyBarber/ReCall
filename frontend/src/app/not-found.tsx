import Link from "next/link";

export default function NotFound() {
  return (
    <main className="shell state-page">
      <div className="state-card">
        <span className="state-symbol" aria-hidden="true">
          ?
        </span>
        <h1>Recall not found</h1>
        <p>
          This recall may no longer be available at this address, or the link
          may be incorrect.
        </p>
        <Link className="primary-button" href="/#current-recalls">
          Browse current recalls
        </Link>
      </div>
    </main>
  );
}
