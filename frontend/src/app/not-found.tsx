import Link from "next/link";

export default function NotFound() {
  return (
    <main className="shell state-page">
      <div className="state-panel">
        <p className="state-code" aria-hidden="true">404</p>
        <h1>Recall not found</h1>
        <p>Check the address, or return to the current recall feed.</p>
        <Link className="primary-button" href="/#current-recalls">
          Browse current recalls
        </Link>
      </div>
    </main>
  );
}
