import { CATEGORIES, CATEGORY_META, type GroupedPapers } from "@/lib/articles";

const DOMAIN_DETAILS: Record<string, { abbr: string; longDesc: string }> = {
  Foundations: {
    abbr: "FND",
    longDesc: "Core ML/AI architectures and evaluation frameworks that underpin every real-estate application.",
  },
  Valuation: {
    abbr: "VAL",
    longDesc: "Automated valuation models (AVMs) and appraisal systems using gradient boosting, neural nets, and explainable AI.",
  },
  Forecasting: {
    abbr: "FRC",
    longDesc: "Time-series prediction for housing prices, rent indices, and market cycle turning points.",
  },
  "Computer Vision": {
    abbr: "CV",
    longDesc: "Image and video analysis for property condition scoring, floor-plan extraction, and virtual staging.",
  },
  NLP: {
    abbr: "NLP",
    longDesc: "Text mining of listings, contracts, and regulations with LLMs, sentiment analysis, and entity extraction.",
  },
  Geospatial: {
    abbr: "GEO",
    longDesc: "Location intelligence combining POI embeddings, satellite imagery, and walkability scoring.",
  },
  "Investment & Finance": {
    abbr: "INV",
    longDesc: "Portfolio optimization, mortgage default prediction, and risk-adjusted return modelling.",
  },
  "PropTech & IoT": {
    abbr: "IOT",
    longDesc: "Smart buildings, digital twins, construction robotics, and sensor-driven facility management.",
  },
  Sustainability: {
    abbr: "SUS",
    longDesc: "Climate risk assessment, energy performance certification, and green-building analytics.",
  },
  "Legal & Compliance": {
    abbr: "LEG",
    longDesc: "Fair housing compliance, regulatory AI, and automated legal document analysis.",
  },
  "Generative AI": {
    abbr: "GEN",
    longDesc: "Diffusion models for virtual staging, synthetic data generation, and text-to-floorplan synthesis.",
  },
  Synthesis: {
    abbr: "SYN",
    longDesc: "Cross-domain integration reports and meta-analyses spanning multiple AI disciplines.",
  },
  "Landscape & Roadmap": {
    abbr: "MAP",
    longDesc: "Industry landscape surveys, startup mapping, and implementation roadmaps for AI adoption.",
  },
};

function slugify(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

export function DomainGrid({ groups }: { groups: GroupedPapers[] }) {
  const countMap = new Map(groups.map((g) => [g.category, g.articles.length]));
  const totalPapers = groups.reduce((sum, g) => sum + g.articles.length, 0);

  return (
    <section className="domain-grid-section">
      <div className="domain-grid-header">
        <span className="domain-grid-kicker">Research Domains</span>
        <h2 className="domain-grid-title">
          {totalPapers} papers across {groups.length} AI/ML disciplines
        </h2>
      </div>
      <div className="domain-grid">
        {CATEGORIES.map(([, , name]) => {
          const detail = DOMAIN_DETAILS[name];
          const catMeta = CATEGORY_META[name];
          if (!detail || !catMeta) return null;
          const count = countMap.get(name) ?? 0;
          if (count === 0) return null;
          return (
            <a
              key={name}
              href={`#cat-${slugify(name)}`}
              className={`domain-card cat-${catMeta.slug}`}
            >
              <div className="domain-card-top">
                <span className="domain-card-icon">{catMeta.icon}</span>
                <span className="domain-card-abbr">{detail.abbr}</span>
              </div>
              <span className="domain-card-name">{name}</span>
              <span className="domain-card-count">
                {count} {count === 1 ? "paper" : "papers"}
              </span>
              <p className="domain-card-desc">{detail.longDesc}</p>
              <span className="domain-card-border" aria-hidden="true" />
            </a>
          );
        })}
      </div>
    </section>
  );
}
