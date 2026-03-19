export function TrustSignals({
  listingsAnalyzed = 150,
}: {
  listingsAnalyzed?: number;
}) {
  const signals = [
    {
      icon: "\u2726",
      title: "Powered by DeepSeek AI",
      desc: "Advanced extraction and valuation",
    },
    {
      icon: "\u2116",
      title: `${listingsAnalyzed}+ Listings Analyzed`,
      desc: "Growing dataset of real results",
    },
    {
      icon: "\u25C8",
      title: "Real Market Data",
      desc: "Comparables sourced from 999.md",
    },
    {
      icon: "\u2605",
      title: "Investment Grade Analysis",
      desc: "Rental yield, zone scoring, trends",
    },
    {
      icon: "\u2192",
      title: "Free to Use",
      desc: "No sign-up required to analyze",
    },
  ];

  return (
    <section className="trust-section">
      <p className="trust-section-title">Why analysts use this tool</p>
      <div className="trust-grid">
        {signals.map((s) => (
          <div key={s.title} className="trust-item">
            <div className="trust-item-icon">{s.icon}</div>
            <div className="trust-item-title">{s.title}</div>
            <div className="trust-item-desc">{s.desc}</div>
          </div>
        ))}
      </div>
    </section>
  );
}
