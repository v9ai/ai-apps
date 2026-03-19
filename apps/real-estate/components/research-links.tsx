"use client";

import { useState, useMemo } from "react";
import Link from "next/link";

/* ------------------------------------------------------------------ */
/*  Inline SVG icons                                                   */
/* ------------------------------------------------------------------ */

function BookIcon({ size = 14 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      style={{ flexShrink: 0 }}
    >
      <path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20" />
    </svg>
  );
}

function ChevronIcon({ open }: { open: boolean }) {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      style={{
        flexShrink: 0,
        transition: "transform 0.2s ease",
        transform: open ? "rotate(180deg)" : "rotate(0deg)",
      }}
    >
      <polyline points="6 9 12 15 18 9" />
    </svg>
  );
}

function BuildingIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      style={{ flexShrink: 0, opacity: 0.7 }}
    >
      <rect x="4" y="2" width="16" height="20" rx="2" ry="2" />
      <path d="M9 22v-4h6v4" />
      <path d="M8 6h.01" />
      <path d="M16 6h.01" />
      <path d="M12 6h.01" />
      <path d="M12 10h.01" />
      <path d="M12 14h.01" />
      <path d="M16 10h.01" />
      <path d="M16 14h.01" />
      <path d="M8 10h.01" />
      <path d="M8 14h.01" />
    </svg>
  );
}

function FlaskIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      style={{ flexShrink: 0 }}
    >
      <path d="M9 3h6" />
      <path d="M10 9V3" />
      <path d="M14 9V3" />
      <path d="M6 21h12" />
      <path d="M10 9a8.1 8.1 0 0 0-4 7c0 2.2 1.8 5 4 5h4c2.2 0 4-2.8 4-5a8.1 8.1 0 0 0-4-7" />
    </svg>
  );
}

function ChartIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      style={{ flexShrink: 0 }}
    >
      <path d="M3 3v18h18" />
      <path d="M18.7 8l-5.1 5.2-2.8-2.7L7 14.3" />
    </svg>
  );
}

function LayersIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      style={{ flexShrink: 0 }}
    >
      <polygon points="12 2 2 7 12 12 22 7 12 2" />
      <polyline points="2 17 12 22 22 17" />
      <polyline points="2 12 12 17 22 12" />
    </svg>
  );
}

function StarIcon() {
  return (
    <svg
      width="10"
      height="10"
      viewBox="0 0 24 24"
      fill="currentColor"
      stroke="none"
      style={{ flexShrink: 0 }}
    >
      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
    </svg>
  );
}

function ShieldIcon() {
  return (
    <svg
      width="11"
      height="11"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      style={{ flexShrink: 0 }}
    >
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
      <polyline points="9 12 11 14 15 10" />
    </svg>
  );
}

function ExternalIcon() {
  return (
    <svg
      width="10"
      height="10"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      style={{ flexShrink: 0, opacity: 0.5 }}
    >
      <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
      <polyline points="15 3 21 3 21 9" />
      <line x1="10" y1="14" x2="21" y2="3" />
    </svg>
  );
}

/* ------------------------------------------------------------------ */
/*  Section toggle                                                     */
/* ------------------------------------------------------------------ */

function CollapsibleSection({
  title,
  defaultOpen = false,
  children,
}: {
  title: React.ReactNode;
  defaultOpen?: boolean;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div>
      <button
        onClick={() => setOpen((v) => !v)}
        style={{
          all: "unset",
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          gap: 6,
          width: "100%",
          padding: "6px 0",
        }}
      >
        <ChevronIcon open={open} />
        {title}
      </button>
      <div
        style={{
          display: "grid",
          gridTemplateRows: open ? "1fr" : "0fr",
          transition: "grid-template-rows 0.25s ease",
        }}
      >
        <div style={{ overflow: "hidden" }}>
          <div style={{ paddingTop: 8, paddingBottom: 4 }}>{children}</div>
        </div>
      </div>
    </div>
  );
}

/* ================================================================== */
/*  ResearchCitations                                                  */
/* ================================================================== */

export interface Citation {
  slug: string;
  title: string;
  relevance: string;
}

export interface ResearchCitationsProps {
  method_citations: Citation[];
  feature_citations: Citation[];
  market_citations: Citation[];
}

/* ---------- category metadata --------- */

const SUBSECTIONS: {
  key: keyof ResearchCitationsProps;
  label: string;
  description: string;
  accent: string;
  accentBg: string;
  icon: React.ComponentType;
}[] = [
  {
    key: "method_citations",
    label: "Valuation Methodology",
    description: "Research backing the pricing models applied",
    accent: "var(--iris-9)",
    accentBg: "var(--iris-3)",
    icon: FlaskIcon,
  },
  {
    key: "feature_citations",
    label: "Feature Analysis",
    description: "Studies on property attribute impact",
    accent: "var(--teal-9)",
    accentBg: "var(--teal-3)",
    icon: LayersIcon,
  },
  {
    key: "market_citations",
    label: "Market Context",
    description: "Market dynamics and investment research",
    accent: "var(--amber-9)",
    accentBg: "var(--amber-3)",
    icon: ChartIcon,
  },
];

/* ---------- credibility helpers --------- */

const CREDIBILITY: Record<string, { label: string; color: string }> = {
  "agent-11": { label: "Core Model", color: "var(--iris-9)" },
  "agent-13": { label: "Peer Reviewed", color: "var(--teal-9)" },
  "agent-14": { label: "Industry Standard", color: "var(--blue-9)" },
  "agent-16": { label: "Peer Reviewed", color: "var(--teal-9)" },
  "agent-18": { label: "Core Model", color: "var(--iris-9)" },
  "agent-21": { label: "Research", color: "var(--amber-9)" },
  "agent-22": { label: "Research", color: "var(--amber-9)" },
  "agent-32": { label: "Applied AI", color: "var(--green-9)" },
  "agent-33": { label: "Applied AI", color: "var(--green-9)" },
  "agent-37": { label: "Applied AI", color: "var(--green-9)" },
  "agent-39": { label: "Peer Reviewed", color: "var(--teal-9)" },
  "agent-40": { label: "Industry Standard", color: "var(--blue-9)" },
  "agent-49": { label: "Core Model", color: "var(--iris-9)" },
  "agent-86": { label: "Research", color: "var(--amber-9)" },
  "agent-96": { label: "Research", color: "var(--amber-9)" },
};

function getCredibility(slug: string): { label: string; color: string } {
  const prefix = slug.replace(/-[^-]+$/, "");
  return CREDIBILITY[prefix] ?? { label: "Research", color: "var(--gray-9)" };
}

/* ---------- "Most Relevant" selector --------- */

function pickMostRelevant(props: ResearchCitationsProps): Citation | null {
  // Priority: method first (core to valuation), then feature, then market.
  // Within each, pick the first entry (the mapping is already ordered by relevance).
  for (const sub of SUBSECTIONS) {
    const list = props[sub.key];
    if (list.length > 0) return list[0];
  }
  return null;
}

/* ---------- Citation card ---------- */

function CitationCard({
  citation,
  accent,
  highlighted,
}: {
  citation: Citation;
  accent: string;
  highlighted?: boolean;
}) {
  const credibility = getCredibility(citation.slug);

  return (
    <Link
      href={`/${citation.slug}`}
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 10,
        padding: "14px 16px",
        borderRadius: 10,
        background: highlighted
          ? "linear-gradient(135deg, rgba(255,255,255,0.06), rgba(255,255,255,0.02))"
          : "var(--gray-2)",
        border: highlighted
          ? `1px solid color-mix(in srgb, ${accent} 40%, transparent)`
          : "1px solid var(--gray-4)",
        textDecoration: "none",
        color: "inherit",
        transition:
          "border-color 0.2s ease, background 0.2s ease, transform 0.2s ease, box-shadow 0.2s ease",
        position: "relative",
        overflow: "hidden",
        minHeight: 96,
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.borderColor = `color-mix(in srgb, ${accent} 60%, transparent)`;
        e.currentTarget.style.background =
          "linear-gradient(135deg, rgba(255,255,255,0.07), rgba(255,255,255,0.03))";
        e.currentTarget.style.transform = "translateY(-2px)";
        e.currentTarget.style.boxShadow = `0 8px 24px rgba(0,0,0,0.2), 0 0 0 1px color-mix(in srgb, ${accent} 15%, transparent)`;
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = highlighted
          ? `color-mix(in srgb, ${accent} 40%, transparent)`
          : "var(--gray-4)";
        e.currentTarget.style.background = highlighted
          ? "linear-gradient(135deg, rgba(255,255,255,0.06), rgba(255,255,255,0.02))"
          : "var(--gray-2)";
        e.currentTarget.style.transform = "translateY(0)";
        e.currentTarget.style.boxShadow = "none";
      }}
    >
      {/* Subtle accent glow for highlighted card */}
      {highlighted && (
        <div
          style={{
            position: "absolute",
            top: -40,
            right: -40,
            width: 100,
            height: 100,
            borderRadius: "50%",
            background: `radial-gradient(circle, ${accent}, transparent 70%)`,
            opacity: 0.08,
            pointerEvents: "none",
          }}
        />
      )}

      {/* Top row: credibility badge + external arrow */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 8,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <ShieldIcon />
          <span
            style={{
              fontSize: 10,
              fontWeight: 600,
              color: credibility.color,
              textTransform: "uppercase",
              letterSpacing: "0.06em",
            }}
          >
            {credibility.label}
          </span>
        </div>
        <ExternalIcon />
      </div>

      {/* Title */}
      <div
        style={{
          fontSize: 13,
          fontWeight: 700,
          lineHeight: 1.35,
          color: "var(--gray-12)",
          letterSpacing: "-0.01em",
        }}
      >
        {citation.title}
      </div>

      {/* Relevance context */}
      <div
        style={{
          display: "flex",
          alignItems: "flex-start",
          gap: 6,
          marginTop: "auto",
        }}
      >
        <div
          style={{
            width: 3,
            minHeight: 14,
            borderRadius: 2,
            background: accent,
            opacity: 0.5,
            flexShrink: 0,
            marginTop: 2,
          }}
        />
        <span
          style={{
            fontSize: 11,
            lineHeight: 1.45,
            color: "var(--gray-9)",
            fontStyle: "italic",
          }}
        >
          {citation.relevance}
        </span>
      </div>
    </Link>
  );
}

/* ---------- Highlighted top card ---------- */

function MostRelevantCard({
  citation,
}: {
  citation: Citation;
}) {
  const credibility = getCredibility(citation.slug);

  return (
    <Link
      href={`/${citation.slug}`}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 14,
        padding: "14px 18px",
        borderRadius: 10,
        background:
          "linear-gradient(135deg, rgba(255,255,255,0.05), rgba(255,255,255,0.02))",
        border: "1px solid color-mix(in srgb, var(--accent-9) 35%, transparent)",
        textDecoration: "none",
        color: "inherit",
        transition:
          "border-color 0.2s ease, background 0.2s ease, transform 0.2s ease, box-shadow 0.2s ease",
        position: "relative",
        overflow: "hidden",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.borderColor =
          "color-mix(in srgb, var(--accent-9) 60%, transparent)";
        e.currentTarget.style.background =
          "linear-gradient(135deg, rgba(255,255,255,0.08), rgba(255,255,255,0.03))";
        e.currentTarget.style.transform = "translateY(-1px)";
        e.currentTarget.style.boxShadow =
          "0 8px 24px rgba(0,0,0,0.2), 0 0 20px color-mix(in srgb, var(--accent-9) 10%, transparent)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor =
          "color-mix(in srgb, var(--accent-9) 35%, transparent)";
        e.currentTarget.style.background =
          "linear-gradient(135deg, rgba(255,255,255,0.05), rgba(255,255,255,0.02))";
        e.currentTarget.style.transform = "translateY(0)";
        e.currentTarget.style.boxShadow = "none";
      }}
    >
      {/* Glow */}
      <div
        style={{
          position: "absolute",
          top: -30,
          left: -30,
          width: 120,
          height: 120,
          borderRadius: "50%",
          background:
            "radial-gradient(circle, var(--accent-9), transparent 70%)",
          opacity: 0.06,
          pointerEvents: "none",
        }}
      />

      {/* Star marker */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          width: 36,
          height: 36,
          borderRadius: 8,
          background: "var(--accent-3)",
          border: "1px solid var(--accent-5)",
          color: "var(--accent-11)",
          flexShrink: 0,
        }}
      >
        <StarIcon />
      </div>

      {/* Content */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            marginBottom: 3,
          }}
        >
          <span
            style={{
              fontSize: 10,
              fontWeight: 700,
              color: "var(--accent-11)",
              textTransform: "uppercase",
              letterSpacing: "0.08em",
            }}
          >
            Most Relevant
          </span>
          <span
            style={{
              fontSize: 10,
              fontWeight: 600,
              color: credibility.color,
              background: "rgba(255,255,255,0.04)",
              border: "1px solid rgba(255,255,255,0.06)",
              padding: "1px 6px",
              borderRadius: 4,
              letterSpacing: "0.03em",
            }}
          >
            {credibility.label}
          </span>
        </div>
        <div
          style={{
            fontSize: 13,
            fontWeight: 700,
            color: "var(--gray-12)",
            lineHeight: 1.3,
            letterSpacing: "-0.01em",
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {citation.title}
        </div>
        <div
          style={{
            fontSize: 11,
            color: "var(--gray-9)",
            marginTop: 2,
            fontStyle: "italic",
          }}
        >
          {citation.relevance}
        </div>
      </div>

      <ExternalIcon />
    </Link>
  );
}

/* ---------- Main export ---------- */

export function ResearchCitations({
  method_citations,
  feature_citations,
  market_citations,
}: ResearchCitationsProps) {
  const [open, setOpen] = useState(false);

  const allCitations = { method_citations, feature_citations, market_citations };
  const totalCount =
    method_citations.length + feature_citations.length + market_citations.length;

  const mostRelevant = useMemo(
    () => pickMostRelevant({ method_citations, feature_citations, market_citations }),
    [method_citations, feature_citations, market_citations],
  );

  if (totalCount === 0) return null;

  return (
    <div
      style={{
        borderRadius: 12,
        border: "1px solid var(--gray-4)",
        background: "var(--gray-1)",
        overflow: "hidden",
      }}
    >
      {/* Header toggle */}
      <button
        onClick={() => setOpen((v) => !v)}
        style={{
          all: "unset",
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          width: "100%",
          padding: "14px 18px",
          boxSizing: "border-box",
          transition: "background 0.15s ease",
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = "rgba(255,255,255,0.02)";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = "transparent";
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: 28,
              height: 28,
              borderRadius: 7,
              background: "var(--accent-3)",
              border: "1px solid var(--accent-5)",
              color: "var(--accent-11)",
            }}
          >
            <BookIcon size={13} />
          </div>
          <span
            style={{
              fontSize: 14,
              fontWeight: 700,
              color: "var(--gray-12)",
              letterSpacing: "-0.01em",
            }}
          >
            Research Backing
          </span>
          <span
            style={{
              fontSize: 11,
              fontWeight: 500,
              color: "var(--gray-9)",
              background: "var(--gray-3)",
              padding: "2px 8px",
              borderRadius: 9999,
            }}
          >
            {totalCount} paper{totalCount !== 1 ? "s" : ""}
          </span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          {/* Category dots preview when collapsed */}
          {!open && (
            <div style={{ display: "flex", gap: 4 }}>
              {SUBSECTIONS.map(({ key, accent }) =>
                allCitations[key].length > 0 ? (
                  <div
                    key={key}
                    style={{
                      width: 6,
                      height: 6,
                      borderRadius: "50%",
                      background: accent,
                      opacity: 0.7,
                    }}
                  />
                ) : null,
              )}
            </div>
          )}
          <ChevronIcon open={open} />
        </div>
      </button>

      {/* Collapsible body */}
      <div
        style={{
          display: "grid",
          gridTemplateRows: open ? "1fr" : "0fr",
          transition: "grid-template-rows 0.3s ease",
        }}
      >
        <div style={{ overflow: "hidden" }}>
          <div
            style={{
              padding: "0 18px 18px",
              display: "flex",
              flexDirection: "column",
              gap: 18,
            }}
          >
            {/* Divider */}
            <div
              style={{
                height: 1,
                background:
                  "linear-gradient(90deg, transparent, var(--gray-4), transparent)",
                margin: "0 -18px",
              }}
            />

            {/* Most Relevant highlight */}
            {mostRelevant && (
              <MostRelevantCard citation={mostRelevant} />
            )}

            {/* Category sections */}
            {SUBSECTIONS.map(({ key, label, description, accent, accentBg, icon: Icon }) => {
              const citations = allCitations[key];
              if (citations.length === 0) return null;

              return (
                <CollapsibleSection
                  key={key}
                  defaultOpen
                  title={
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 8,
                        flex: 1,
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          width: 22,
                          height: 22,
                          borderRadius: 5,
                          background: accentBg,
                          color: accent,
                        }}
                      >
                        <Icon />
                      </div>
                      <div style={{ display: "flex", flexDirection: "column" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                          <span
                            style={{
                              fontSize: 12,
                              fontWeight: 700,
                              color: "var(--gray-11)",
                              letterSpacing: "0.01em",
                            }}
                          >
                            {label}
                          </span>
                          <span
                            style={{
                              fontSize: 10,
                              fontWeight: 600,
                              color: accent,
                              background: accentBg,
                              padding: "0 5px",
                              borderRadius: 4,
                            }}
                          >
                            {citations.length}
                          </span>
                        </div>
                        <span
                          style={{
                            fontSize: 10,
                            color: "var(--gray-8)",
                            lineHeight: 1.3,
                          }}
                        >
                          {description}
                        </span>
                      </div>
                    </div>
                  }
                >
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns:
                        "repeat(auto-fill, minmax(240px, 1fr))",
                      gap: 10,
                    }}
                  >
                    {citations.map((c) => (
                      <CitationCard
                        key={c.slug}
                        citation={c}
                        accent={accent}
                        highlighted={
                          mostRelevant ? c.slug === mostRelevant.slug : false
                        }
                      />
                    ))}
                  </div>
                </CollapsibleSection>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ================================================================== */
/*  RelatedListings                                                    */
/* ================================================================== */

export interface RelatedListing {
  url: string;
  city: string;
  zone: string;
  price_eur: number;
  deviation_pct: number;
  verdict: string;
  analyzed_at: string;
}

export interface RelatedListingsProps {
  listings: RelatedListing[];
  paper_category: string;
}

const VERDICT_COLORS: Record<string, string> = {
  undervalued: "var(--green-9)",
  fair: "var(--blue-9)",
  overvalued: "var(--red-9)",
};

const VERDICT_BG: Record<string, string> = {
  undervalued: "var(--green-3)",
  fair: "var(--blue-3)",
  overvalued: "var(--red-3)",
};

const VERDICT_LABELS: Record<string, string> = {
  undervalued: "Undervalued",
  fair: "Fair",
  overvalued: "Overvalued",
};

function ListingCard({ listing }: { listing: RelatedListing }) {
  const deviationColor =
    listing.deviation_pct < -10
      ? "var(--green-9)"
      : listing.deviation_pct > 10
        ? "var(--red-9)"
        : "var(--gray-9)";
  const sign = listing.deviation_pct > 0 ? "+" : "";
  const date = new Date(listing.analyzed_at);
  const dateStr = date.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });

  return (
    <Link
      href={`/analyzer?url=${encodeURIComponent(listing.url)}`}
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 8,
        padding: "12px 14px",
        borderRadius: 8,
        background: "var(--gray-2)",
        border: "1px solid var(--gray-4)",
        textDecoration: "none",
        color: "inherit",
        transition: "border-color 0.15s ease, background 0.15s ease",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.borderColor = "var(--gray-6)";
        e.currentTarget.style.background = "var(--gray-3)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = "var(--gray-4)";
        e.currentTarget.style.background = "var(--gray-2)";
      }}
    >
      {/* Top row: city + zone */}
      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
        <BuildingIcon />
        <span
          style={{
            fontSize: 13,
            fontWeight: 600,
            color: "var(--gray-12)",
          }}
        >
          {listing.city}
        </span>
        {listing.zone && (
          <span
            style={{
              fontSize: 11,
              color: "var(--gray-9)",
            }}
          >
            / {listing.zone}
          </span>
        )}
      </div>

      {/* Middle row: price + deviation */}
      <div
        style={{
          display: "flex",
          alignItems: "baseline",
          justifyContent: "space-between",
          gap: 8,
        }}
      >
        <span
          style={{
            fontSize: 16,
            fontWeight: 700,
            color: "var(--gray-12)",
            fontVariantNumeric: "tabular-nums",
          }}
        >
          &euro;{listing.price_eur.toLocaleString()}
        </span>
        <span
          style={{
            fontSize: 12,
            fontWeight: 600,
            color: deviationColor,
            fontVariantNumeric: "tabular-nums",
          }}
        >
          {sign}{listing.deviation_pct.toFixed(1)}%
        </span>
      </div>

      {/* Bottom row: verdict badge + date */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 8,
        }}
      >
        <span
          style={{
            fontSize: 11,
            fontWeight: 600,
            color: VERDICT_COLORS[listing.verdict] ?? "var(--gray-9)",
            background: VERDICT_BG[listing.verdict] ?? "var(--gray-3)",
            padding: "2px 8px",
            borderRadius: 9999,
            textTransform: "capitalize",
          }}
        >
          {VERDICT_LABELS[listing.verdict] ?? listing.verdict}
        </span>
        <span style={{ fontSize: 11, color: "var(--gray-8)" }}>{dateStr}</span>
      </div>
    </Link>
  );
}

export function RelatedListings({ listings, paper_category }: RelatedListingsProps) {
  const [open, setOpen] = useState(true);

  if (listings.length === 0) return null;

  return (
    <div
      style={{
        borderRadius: 10,
        border: "1px solid var(--gray-4)",
        background: "var(--gray-1)",
        overflow: "hidden",
      }}
    >
      {/* Header toggle */}
      <button
        onClick={() => setOpen((v) => !v)}
        style={{
          all: "unset",
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          width: "100%",
          padding: "12px 16px",
          boxSizing: "border-box",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <BuildingIcon />
          <span
            style={{
              fontSize: 14,
              fontWeight: 600,
              color: "var(--gray-12)",
              letterSpacing: "0.01em",
            }}
          >
            Listings Using This Research
          </span>
          <span
            style={{
              fontSize: 11,
              fontWeight: 600,
              color: "var(--accent-11)",
              background: "var(--accent-3)",
              padding: "2px 8px",
              borderRadius: 9999,
            }}
          >
            Applied in {listings.length} analysis{listings.length !== 1 ? "es" : ""}
          </span>
        </div>
        <ChevronIcon open={open} />
      </button>

      {/* Collapsible body */}
      <div
        style={{
          display: "grid",
          gridTemplateRows: open ? "1fr" : "0fr",
          transition: "grid-template-rows 0.3s ease",
        }}
      >
        <div style={{ overflow: "hidden" }}>
          <div style={{ padding: "0 16px 16px" }}>
            <div
              style={{
                height: 1,
                background: "var(--gray-4)",
                margin: "0 -16px",
                marginBottom: 12,
              }}
            />

            {paper_category && (
              <div
                style={{
                  fontSize: 11,
                  color: "var(--gray-8)",
                  marginBottom: 10,
                  textTransform: "uppercase",
                  letterSpacing: "0.05em",
                }}
              >
                Category: {paper_category}
              </div>
            )}

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))",
                gap: 10,
              }}
            >
              {listings.map((listing) => (
                <ListingCard key={listing.url} listing={listing} />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
