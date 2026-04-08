export function Hero({
  lessonCount,
  domainCount,
  wordCount,
  readingHours,
}: {
  lessonCount: number;
  domainCount: number;
  wordCount: number;
  readingHours: number;
}) {
  const wordLabel =
    wordCount >= 1000 ? `${Math.round(wordCount / 1000)}K+` : String(wordCount);

  return (
    <section className="hero">
      <div className="hero-glow" />
      <div className="hero-grid-bg" />
      <div className="hero-content">
        <p className="hero-kicker">
          <span className="hero-badge">100% Free</span>
          From Zero to AI Engineer
        </p>
        <h1 className="hero-title">
          Your Deep-Dive into{" "}
          <span className="hero-title-accent">AI Engineering</span>
        </h1>
        <p className="hero-subtitle">
          Master evals, RAG, agents, fine-tuning &amp; production AI systems
          — {lessonCount} hands-on lessons, {wordLabel} words of practical depth.
        </p>
        <p className="hero-supporting">
          Built for junior engineers ready to go deep across {domainCount} skill areas.
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
            <span className="hero-stat-number">{readingHours}h</span>
            <span className="hero-stat-label">Reading Time</span>
          </div>
          <div className="hero-stat">
            <span className="hero-stat-number">{wordLabel}</span>
            <span className="hero-stat-label">Words</span>
          </div>
        </div>
        <div className="hero-cta-group">
          <a href="#lessons" className="hero-cta hero-cta-primary">
            Start Learning
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
              <path d="M8 3v10M4 9l4 4 4-4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </a>
          <a href="#lessons" className="hero-cta hero-cta-ghost">
            Browse Curriculum
          </a>
        </div>
      </div>
      <div className="hero-bottom-line" />
    </section>
  );
}
