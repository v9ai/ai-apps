export function Hero({
  paperCount,
  domainCount,
  wordCount,
}: {
  paperCount: number;
  domainCount: number;
  wordCount: number;
}) {
  const wordLabel =
    wordCount >= 1000 ? `${Math.round(wordCount / 1000)}K+` : String(wordCount);

  return (
    <section className="hero">
      <div className="hero-glow" />
      <div className="hero-grid-bg" />
      <div className="hero-content">
        <p className="hero-kicker">AI/ML Research Compendium</p>
        <h1 className="hero-title">
          The Definitive Guide to{" "}
          <span className="hero-title-accent">AI in Learning &amp; Education</span>
        </h1>
        <p className="hero-subtitle">
          {paperCount} research papers spanning {domainCount} domains
          — {wordLabel} words of analysis covering every frontier of
          intelligent learning technology.
        </p>
        <div className="hero-stats">
          <div className="hero-stat">
            <span className="hero-stat-number">{paperCount}</span>
            <span className="hero-stat-label">Research Papers</span>
          </div>
          <div className="hero-stat">
            <span className="hero-stat-number">{domainCount}</span>
            <span className="hero-stat-label">Domains</span>
          </div>
          <div className="hero-stat">
            <span className="hero-stat-number">{wordLabel}</span>
            <span className="hero-stat-label">Words of Analysis</span>
          </div>
        </div>
        <a href="#research" className="hero-cta">
          Explore the Research ↓
        </a>
      </div>
      <div className="hero-bottom-line" />
    </section>
  );
}
