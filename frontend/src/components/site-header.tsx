import Link from "next/link";

export function SiteHeader() {
  return (
    <header className="site-header">
      <div className="shell header-inner">
        <Link className="brand" href="/" aria-label="ReCall home">
          <strong>ReCall</strong>
          <span>FDA recall feed</span>
        </Link>
        <nav aria-label="Primary navigation">
          <Link className="header-link" href="/#recall-search">
            Search recalls
          </Link>
        </nav>
      </div>
    </header>
  );
}
