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
        <p className="hero-kicker">AI Engineering Learning Path</p>
        <h1 className="hero-title">
          The Definitive Guide to{" "}
          <span className="hero-title-accent">AI Engineering</span>
        </h1>
        <p className="hero-subtitle">
          {paperCount} deep dives spanning {domainCount} domains
          — {wordLabel} words covering evals, RAG, agents, fine-tuning,
          prompting &amp; production AI systems.
        </p>
        <div className="hero-stats">
          <div className="hero-stat">
            <span className="hero-stat-number">{paperCount}</span>
            <span className="hero-stat-label">Deep Dives</span>
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
          Start Learning ↓
        </a>
      </div>
      <div className="hero-bottom-line" />
    </section>
  );
}
