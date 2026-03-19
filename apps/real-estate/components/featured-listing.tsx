import Link from "next/link";

export function FeaturedListing() {
  return (
    <section className="featured-listing-section">
      <p className="featured-listing-label">Live Example — Try the Analyzer</p>
      <Link href="/analyzer/999/103528157" className="featured-listing-card">
        <div className="featured-listing-inner">
          <p className="featured-listing-title">
            Apartament cu 1 cameră, Aeroport, Chișinău
          </p>
          <div className="featured-listing-prices">
            <span className="featured-listing-price">€72,500</span>
            <span className="featured-listing-sep">·</span>
            <span className="featured-listing-ppm">€1,421/m²</span>
            <span className="featured-listing-sep">·</span>
            <span className="featured-listing-size">51 m²</span>
          </div>
          <div className="featured-listing-meta">
            <span>1 room</span>
            <span>floor 3/10</span>
            <span>variantă albă</span>
            <span className="featured-listing-badge">new build</span>
          </div>
        </div>
        <span className="featured-listing-cta">Analyze this listing →</span>
      </Link>
    </section>
  );
}
