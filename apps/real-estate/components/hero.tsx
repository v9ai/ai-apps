import Link from "next/link";

export function Hero() {
  return (
    <section className="hero">
      <div className="hero-glow" />
      <div className="hero-grid-bg" />
      <div className="hero-content">
        <p className="hero-kicker">AI-Powered Real Estate Intelligence</p>
        <h1 className="hero-title">
          Never Overpay for{" "}
          <span className="hero-title-accent">Property Again</span>
        </h1>
        <p className="hero-subtitle">
          Instant AI valuation, real market comparables, and investment scoring
          for Eastern European real estate. Paste a listing URL and get a
          Bloomberg-grade analysis in seconds.
        </p>
        <div className="hero-stats">
          <div className="hero-stat">
            <span className="hero-stat-number">50K+</span>
            <span className="hero-stat-label">Listings Analyzed</span>
          </div>
          <div className="hero-stat">
            <span className="hero-stat-number">12%</span>
            <span className="hero-stat-label">Avg. Savings Found</span>
          </div>
          <div className="hero-stat">
            <span className="hero-stat-number">2</span>
            <span className="hero-stat-label">Markets Covered</span>
          </div>
        </div>
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap", justifyContent: "center" }}>
          <Link href="/analyzer" className="hero-cta">
            Analyze a Listing
          </Link>
          <Link
            href="/trends"
            className="hero-cta"
            style={{
              background: "transparent",
              border: "1px solid var(--gray-6)",
              color: "var(--gray-11)",
              boxShadow: "none",
            }}
          >
            Market Trends
          </Link>
        </div>
      </div>
      <div className="hero-bottom-line" />
    </section>
  );
}
