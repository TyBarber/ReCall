import Link from "next/link";

export default function NotFound() {
  return (
    <main className="state-page">
      <div className="receipt state-receipt">
        <p className="void-stamp">NOT FOUND</p>
        <h1>Recall not found</h1>
        <p>
          This recall may no longer be available at this address, or the link
          may be incorrect.
        </p>
        <Link className="r-btn" href="/#current-recalls">
          Browse current recalls
        </Link>
      </div>
    </main>
  );
}
