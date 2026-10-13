import { FreshnessDetails } from "@/components/freshness";
import { getFreshness } from "@/lib/api/recalls";

export async function SiteFooter() {
  const freshness = await getFreshness();

  return (
    <footer className="site-footer">
      <div className="shell footer-inner">
        <div>
          <strong>ReCall</strong>
          <p>Clear food recall information for everyday decisions.</p>
        </div>
        <div className="footer-trust">
          <p>
            Recall information is sourced from U.S. FDA and USDA FSIS data and
            may be updated as investigations develop.
          </p>
          <FreshnessDetails sources={freshness} />
        </div>
      </div>
    </footer>
  );
}
