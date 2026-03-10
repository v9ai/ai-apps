import { CATEGORIES, type GroupedPapers } from "@/lib/articles";

const DOMAIN_META: Record<string, { icon: string; desc: string }> = {
  Foundations: { icon: "\u25C7", desc: "Core ML/AI frameworks for real estate" },
  Valuation: { icon: "\u25C8", desc: "Automated valuation models & appraisal" },
  Forecasting: { icon: "\u25B2", desc: "Market prediction & time-series analysis" },
  "Computer Vision": { icon: "\u25C9", desc: "Building & property image analysis" },
  NLP: { icon: "\u00B6", desc: "Text intelligence & conversational AI" },
  Geospatial: { icon: "\u2B21", desc: "Location intelligence & urban analytics" },
  "Investment & Finance": { icon: "\u25C6", desc: "Portfolio optimization, risk & mortgage ML" },
  "PropTech & IoT": { icon: "\u26A1", desc: "Smart buildings, digital twins & IoT" },
  Sustainability: { icon: "\u25CF", desc: "Climate risk & energy performance" },
  "Legal & Compliance": { icon: "\u00A7", desc: "Regulatory AI & fair housing compliance" },
  "Generative AI": { icon: "\u2726", desc: "Synthesis, generation & foundation models" },
  Synthesis: { icon: "\u25CE", desc: "Cross-domain integration reports" },
  "Landscape & Roadmap": { icon: "\u25B6", desc: "Industry landscape & implementation" },
};

function slugify(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

export function DomainGrid({ groups }: { groups: GroupedPapers[] }) {
  const countMap = new Map(groups.map((g) => [g.category, g.articles.length]));

  return (
    <section className="domain-grid-section">
      <div className="section-header">
        <p className="section-label">Research Domains</p>
        <div className="accent-divider" />
      </div>
      <div className="domain-grid">
        {CATEGORIES.map(([, , name]) => {
          const meta = DOMAIN_META[name];
          if (!meta) return null;
          const count = countMap.get(name) ?? 0;
          if (count === 0) return null;
          return (
            <a
              key={name}
              href={`#cat-${slugify(name)}`}
              className="domain-card"
            >
              <span className="domain-card-icon">{meta.icon}</span>
              <span className="domain-card-name">{name}</span>
              <span className="domain-card-count">
                {count} {count === 1 ? "paper" : "papers"}
              </span>
              <span className="domain-card-desc">{meta.desc}</span>
            </a>
          );
        })}
      </div>
    </section>
  );
}
