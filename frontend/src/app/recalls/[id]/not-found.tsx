import Link from "next/link";

export default function RecallNotFound() {
  return (
    <main className="state-page">
      <div className="receipt state-receipt">
        <p className="void-stamp">NOT FOUND</p>
        <h1>Recall not found</h1>
        <p>
          This recall may no longer be available at this address. Browse the
          recall directory to find current information.
        </p>
        <Link className="r-btn" href="/recalls">
          Browse recalls
        </Link>
      </div>
    </main>
  );
}
