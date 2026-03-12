export function Hero({
  lessonCount,
  domainCount,
  wordCount,
}: {
  lessonCount: number;
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
        <p className="hero-kicker">From Zero to AI Engineer</p>
        <h1 className="hero-title">
          Your Deep-Dive into{" "}
          <span className="hero-title-accent">AI Engineering</span>
        </h1>
        <p className="hero-subtitle">
          {lessonCount} hands-on lessons across {domainCount} skill areas
          — {wordLabel} words of practical knowledge covering evals, RAG, agents,
          fine-tuning, prompting &amp; production AI systems. Built for junior
          engineers ready to go deep.
        </p>
        <div className="hero-stats">
          <div className="hero-stat">
            <span className="hero-stat-number">{lessonCount}</span>
            <span className="hero-stat-label">Lessons</span>
          </div>
          <div className="hero-stat">
            <span className="hero-stat-number">{domainCount}</span>
            <span className="hero-stat-label">Skill Areas</span>
          </div>
          <div className="hero-stat">
            <span className="hero-stat-number">{wordLabel}</span>
            <span className="hero-stat-label">Words of Explanation</span>
          </div>
        </div>
        <a href="#lessons" className="hero-cta">
          Start Learning ↓
        </a>
      </div>
      <div className="hero-bottom-line" />
    </section>
  );
}
