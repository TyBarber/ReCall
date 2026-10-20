import { FreshnessDetails } from "@/components/freshness";
import { getFreshness } from "@/lib/api/recalls";

export async function SiteFooter() {
  const freshness = await getFreshness();

  return (
    <footer className="site-footer">
      <div className="footer-inner">
        <div>
          <p>
            ReCall is an independent project. Recall information comes from the
            U.S. FDA and USDA FSIS and may be updated as investigations develop.
          </p>
        </div>
        <FreshnessDetails sources={freshness} />
      </div>
    </footer>
  );
}
