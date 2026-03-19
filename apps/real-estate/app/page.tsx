import { getGroupedPapers } from "@/lib/articles";
import { Topbar } from "@/components/topbar";
import { Hero } from "@/components/hero";
import { FeaturedListing } from "@/components/featured-listing";
import { TrustSignals } from "@/components/trust-signals";
import { CategoryGrid } from "@/components/category-grid";
import { Footer } from "@/components/footer";

export default function HomePage() {
  const groups = getGroupedPapers();
  return (
    <div>
      <Topbar />

      <Hero />

      <FeaturedListing />

      <TrustSignals />

      {/* Research Papers */}
      <div id="research" style={{ maxWidth: 1200, margin: "0 auto", padding: "0 24px 24px" }}>
        <CategoryGrid groups={groups} />
      </div>

      <Footer />
    </div>
  );
}
