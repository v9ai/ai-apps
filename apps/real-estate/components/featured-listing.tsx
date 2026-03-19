import Link from "next/link";

export function FeaturedListing() {
  return (
    <section className="featured-listing-section">
      <p className="featured-listing-label">Live Example — Try the Analyzer</p>
      <Link href="/analyzer/999/103528157" className="featured-listing-card featured-listing-card--glow">
        <div className="featured-listing-verdict">
          <span className="featured-listing-verdict-dot" />
          Undervalued by 12%
        </div>
        <div className="featured-listing-inner">
          <p className="featured-listing-title">
            Apartament cu 1 camera, Aeroport, Chisinau
          </p>
          <div className="featured-listing-prices">
            <span className="featured-listing-price">EUR 72,500</span>
            <span className="featured-listing-sep">/</span>
            <span className="featured-listing-ppm">EUR 1,421/m2</span>
            <span className="featured-listing-sep">/</span>
            <span className="featured-listing-size">51 m2</span>
          </div>
          <div className="featured-listing-scores">
            <span className="featured-listing-score">
              <span className="featured-listing-score-label">Investment</span>
              <span className="featured-listing-score-value">8.4/10</span>
            </span>
            <span className="featured-listing-score">
              <span className="featured-listing-score-label">Rental yield</span>
              <span className="featured-listing-score-value">6.2%</span>
            </span>
            <span className="featured-listing-score">
              <span className="featured-listing-score-label">Zone</span>
              <span className="featured-listing-score-value">Aeroport</span>
            </span>
          </div>
          <div className="featured-listing-meta">
            <span>1 room</span>
            <span>floor 3/10</span>
            <span>varianta alba</span>
            <span className="featured-listing-badge">new build</span>
          </div>
        </div>
        <span className="featured-listing-cta">See AI Analysis →</span>
      </Link>
    </section>
  );
}
