"use client";

import { useState } from "react";

interface QualityWarningsProps {
  quality_score: number; // 0-1
  warnings: string[];
  flags: string[]; // "unrealistic_price", "missing_key_fields", etc.
  recommendation: "proceed" | "caution" | "avoid";
}

/* ── severity classification ──────────────────────────────────── */

type Severity = "critical" | "moderate" | "info";

const SEVERITY_STYLES: Record<
  Severity,
  {
    borderLeft: string;
    bg: string;
    iconColor: string;
    label: string;
    badgeBg: string;
    badgeBorder: string;
  }
> = {
  critical: {
    borderLeft: "#ef4444",
    bg: "rgba(239,68,68,0.06)",
    iconColor: "#f87171",
    label: "Critical",
    badgeBg: "rgba(239,68,68,0.12)",
    badgeBorder: "rgba(239,68,68,0.25)",
  },
  moderate: {
    borderLeft: "#f59e0b",
    bg: "rgba(245,158,11,0.06)",
    iconColor: "#fbbf24",
    label: "Moderate",
    badgeBg: "rgba(245,158,11,0.12)",
    badgeBorder: "rgba(245,158,11,0.25)",
  },
  info: {
    borderLeft: "#3b82f6",
    bg: "rgba(59,130,246,0.06)",
    iconColor: "#60a5fa",
    label: "Info",
    badgeBg: "rgba(59,130,246,0.12)",
    badgeBorder: "rgba(59,130,246,0.25)",
  },
};

/** Map a flag string to a severity level based on backend _SEVERITY weights. */
function classifyFlag(flag: string): Severity {
  const critical = ["unrealistic_price", "price_anomaly", "too_good_to_be_true"];
  const moderate = ["inconsistent_details", "missing_key_fields"];
  // everything else is info (e.g. suspicious_description)
  if (critical.some((k) => flag.includes(k))) return "critical";
  if (moderate.some((k) => flag.includes(k))) return "moderate";
  return "info";
}

/** Classify a warning string by matching it against known patterns. */
function classifyWarning(warning: string, flags: string[]): Severity {
  const wl = warning.toLowerCase();

  // Try to match against flags first
  for (const flag of flags) {
    const flagWords = flag.replace(/_/g, " ").toLowerCase();
    if (wl.includes(flagWords) || flagWords.split(" ").every((w) => wl.includes(w))) {
      return classifyFlag(flag);
    }
  }

  // Pattern-based fallback
  if (
    wl.includes("suspiciously low") ||
    wl.includes("unusually high") ||
    wl.includes("deviates") ||
    wl.includes("less than 50%") ||
    wl.includes("verify listing authenticity")
  )
    return "critical";

  if (
    wl.includes("implausible") ||
    wl.includes("data-entry error") ||
    wl.includes("missing") ||
    wl.includes("mislabelled")
  )
    return "moderate";

  return "info";
}

/* ── actionable suggestions per warning pattern ───────────────── */

function getSuggestion(warning: string, flags: string[]): string | null {
  const wl = warning.toLowerCase();

  if (wl.includes("suspiciously low"))
    return "Confirm the price on the original listing page. This may be a monthly rent mislabelled as a sale price.";

  if (wl.includes("unusually high"))
    return "Verify this is a standard residential unit. Luxury or commercial properties may skew the valuation model.";

  if (wl.includes("below 15"))
    return "Check whether the listing is a studio, storage unit, or parking space rather than a full apartment.";

  if (wl.includes("exceeds 300"))
    return "Confirm this is a single unit and not a building or multi-unit property listed under one entry.";

  if (wl.includes("missing") && wl.includes("zone"))
    return "Try a listing with a full address for better zone matching and more accurate valuation.";

  if (wl.includes("missing") && (wl.includes("rooms") || wl.includes("size")))
    return "Look for a listing with complete specifications. Missing fields reduce valuation confidence.";

  if (wl.includes("implausible") || wl.includes("data-entry error"))
    return "Cross-reference room count and size on the listing page. One of these values is likely incorrect.";

  if (wl.includes("deviates"))
    return "Compare this listing directly with the comparables shown below. A large deviation often signals a data issue or unique property features.";

  if (wl.includes("less than 50%") || wl.includes("verify listing authenticity"))
    return "This price is unusually low for the area. Verify the listing is genuine and not a scam or placeholder.";

  if (wl.includes("suspicious"))
    return "Read the listing description carefully for signs of misleading information or AI-generated filler text.";

  return null;
}

/* ── colour helpers ─────────────────────────────────────────────── */

function scoreColor(score: number): string {
  if (score > 0.8) return "#22c55e"; // green-500
  if (score >= 0.5) return "#eab308"; // yellow-500
  return "#ef4444"; // red-500
}

function scoreLabel(score: number): string {
  if (score > 0.8) return "High quality";
  if (score >= 0.6) return "Acceptable";
  if (score >= 0.4) return "Low quality";
  return "Very low quality";
}

const REC_CONFIG: Record<
  QualityWarningsProps["recommendation"],
  { bg: string; border: string; text: string; label: string }
> = {
  proceed: {
    bg: "rgba(34,197,94,0.12)",
    border: "rgba(34,197,94,0.3)",
    text: "#4ade80",
    label: "Safe to Proceed",
  },
  caution: {
    bg: "rgba(245,158,11,0.12)",
    border: "rgba(245,158,11,0.3)",
    text: "#fbbf24",
    label: "Proceed with Caution",
  },
  avoid: {
    bg: "rgba(239,68,68,0.12)",
    border: "rgba(239,68,68,0.3)",
    text: "#f87171",
    label: "Avoid This Listing",
  },
};

/* ── inline SVG icons (16x16) ───────────────────────────────────── */

function CheckIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 8.5l3.5 3.5 6.5-7" />
    </svg>
  );
}

function WarningIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M8 1L1 14h14L8 1z" />
      <path d="M8 6v3" />
      <circle cx="8" cy="12" r="0.5" fill="currentColor" />
    </svg>
  );
}

function XIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 4l8 8M12 4l-8 8" />
    </svg>
  );
}

function DollarIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M8 1v14" />
      <path d="M11 4H6.5a2.5 2.5 0 000 5h3a2.5 2.5 0 010 5H5" />
    </svg>
  );
}

function ListIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 3h8M6 8h8M6 13h8" />
      <circle cx="2.5" cy="3" r="1" fill="currentColor" />
      <circle cx="2.5" cy="8" r="1" fill="currentColor" />
      <circle cx="2.5" cy="13" r="1" fill="currentColor" />
    </svg>
  );
}

function MagnifierIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="7" cy="7" r="4.5" />
      <path d="M10.5 10.5L14 14" />
    </svg>
  );
}

function DocIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 1h6l4 4v10H4V1z" />
      <path d="M10 1v4h4" />
      <path d="M6 8h5M6 11h3" />
    </svg>
  );
}

function ChartIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2 14V8l3-2 3 4 3-6 3 2v8H2z" />
    </svg>
  );
}

function StarIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M8 1l2.2 4.6L15 6.3l-3.5 3.4.8 4.9L8 12.2 3.7 14.6l.8-4.9L1 6.3l4.8-.7L8 1z" />
    </svg>
  );
}

function LightbulbIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 14h4" />
      <path d="M6 12c-1.5-1-3-2.5-3-5a5 5 0 0110 0c0 2.5-1.5 4-3 5" />
      <path d="M6 12h4" />
    </svg>
  );
}

function ChevronIcon({ open }: { open: boolean }) {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      style={{
        transition: "transform 200ms ease",
        transform: open ? "rotate(180deg)" : "rotate(0deg)",
      }}
    >
      <path d="M4 6l4 4 4-4" />
    </svg>
  );
}

function ShieldIcon({ color }: { color: string }) {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke={color} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M8 1L2 4v4c0 3.5 2.5 6.5 6 7.5 3.5-1 6-4 6-7.5V4L8 1z" />
    </svg>
  );
}

const REC_ICON: Record<QualityWarningsProps["recommendation"], React.ReactNode> = {
  proceed: <CheckIcon />,
  caution: <WarningIcon />,
  avoid: <XIcon />,
};

/* ── flag -> icon mapping ────────────────────────────────────────── */

function flagIcon(flag: string): React.ReactNode {
  if (flag.includes("price") || flag.includes("unrealistic")) return <DollarIcon />;
  if (flag.includes("field") || flag.includes("missing")) return <ListIcon />;
  if (flag.includes("detail")) return <MagnifierIcon />;
  if (flag.includes("description")) return <DocIcon />;
  if (flag.includes("anomal")) return <ChartIcon />;
  if (flag.includes("too_good") || flag.includes("star")) return <StarIcon />;
  return <WarningIcon />;
}

/* ── circular progress ring ─────────────────────────────────────── */

function ScoreRing({ score }: { score: number }) {
  const size = 56;
  const strokeW = 5;
  const radius = (size - strokeW) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference * (1 - Math.max(0, Math.min(1, score)));
  const color = scoreColor(score);
  const pct = Math.round(score * 100);

  return (
    <svg width={size} height={size} style={{ flexShrink: 0 }}>
      {/* track */}
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke="rgba(255,255,255,0.08)"
        strokeWidth={strokeW}
      />
      {/* progress */}
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke={color}
        strokeWidth={strokeW}
        strokeLinecap="round"
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        style={{
          transform: "rotate(-90deg)",
          transformOrigin: "50% 50%",
          transition: "stroke-dashoffset 500ms ease",
        }}
      />
      {/* label */}
      <text
        x="50%"
        y="50%"
        textAnchor="middle"
        dominantBaseline="central"
        fill={color}
        fontSize="14"
        fontWeight="700"
        fontFamily="inherit"
      >
        {pct}
      </text>
    </svg>
  );
}

/* ── quality bar (linear meter) ────────────────────────────────── */

function QualityBar({ score }: { score: number }) {
  const pct = Math.round(score * 100);
  const color = scoreColor(score);
  const label = scoreLabel(score);

  return (
    <div style={{ flex: 1, minWidth: 0 }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "baseline",
          marginBottom: 6,
        }}
      >
        <span style={{ fontSize: 12, fontWeight: 500, color: "#a1a1aa" }}>
          Data Quality Score
        </span>
        <span style={{ fontSize: 13, fontWeight: 700, color, fontVariantNumeric: "tabular-nums" }}>
          {pct}%
          <span style={{ fontWeight: 400, fontSize: 11, color: "#71717a", marginLeft: 4 }}>
            {label}
          </span>
        </span>
      </div>
      <div
        style={{
          height: 6,
          borderRadius: 3,
          background: "rgba(255,255,255,0.06)",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            height: "100%",
            width: `${pct}%`,
            borderRadius: 3,
            background: `linear-gradient(90deg, ${color}cc, ${color})`,
            transition: "width 500ms ease",
          }}
        />
      </div>
    </div>
  );
}

/* ── severity summary counts ───────────────────────────────────── */

function SeveritySummary({ warnings, flags }: { warnings: string[]; flags: string[] }) {
  const counts: Record<Severity, number> = { critical: 0, moderate: 0, info: 0 };
  for (const w of warnings) {
    counts[classifyWarning(w, flags)]++;
  }

  const items = ([
    { severity: "critical" as Severity, count: counts.critical },
    { severity: "moderate" as Severity, count: counts.moderate },
    { severity: "info" as Severity, count: counts.info },
  ] satisfies { severity: Severity; count: number }[]).filter((d) => d.count > 0);

  if (items.length === 0) return null;

  return (
    <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
      {items.map(({ severity, count }) => {
        const s = SEVERITY_STYLES[severity];
        return (
          <span
            key={severity}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 4,
              padding: "3px 8px",
              borderRadius: 6,
              fontSize: 11,
              fontWeight: 600,
              color: s.iconColor,
              background: s.badgeBg,
              border: `1px solid ${s.badgeBorder}`,
              textTransform: "capitalize",
            }}
          >
            <span
              style={{
                width: 6,
                height: 6,
                borderRadius: "50%",
                background: s.borderLeft,
                flexShrink: 0,
              }}
            />
            {count} {severity}
          </span>
        );
      })}
    </div>
  );
}

/* ── main component ─────────────────────────────────────────────── */

export function QualityWarnings({
  quality_score,
  warnings,
  flags,
  recommendation,
}: QualityWarningsProps) {
  const [open, setOpen] = useState(false);
  const rec = REC_CONFIG[recommendation];
  const hasDetails = warnings.length > 0;

  // Sort warnings by severity: critical first, then moderate, then info
  const severityOrder: Record<Severity, number> = { critical: 0, moderate: 1, info: 2 };
  const sortedWarnings = [...warnings].sort(
    (a, b) =>
      severityOrder[classifyWarning(a, flags)] - severityOrder[classifyWarning(b, flags)]
  );

  return (
    <div
      style={{
        background: "#18181b", // zinc-900
        border: "1px solid rgba(255,255,255,0.08)",
        borderRadius: 12,
        overflow: "hidden",
      }}
    >
      {/* ── collapsed header: score ring + bar + recommendation + toggle ── */}
      <button
        type="button"
        onClick={() => hasDetails && setOpen((v) => !v)}
        aria-expanded={open}
        style={{
          display: "flex",
          alignItems: "center",
          gap: 14,
          width: "100%",
          padding: "14px 16px",
          background: "transparent",
          border: "none",
          cursor: hasDetails ? "pointer" : "default",
          color: "#e4e4e7",
          textAlign: "left",
          fontFamily: "inherit",
        }}
      >
        <ScoreRing score={quality_score} />

        <div style={{ display: "flex", flexDirection: "column", gap: 8, flex: 1, minWidth: 0 }}>
          {/* quality bar */}
          <QualityBar score={quality_score} />

          {/* recommendation badge + severity summary row */}
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
            {/* recommendation badge */}
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                padding: "5px 12px",
                borderRadius: 9999,
                fontSize: 13,
                fontWeight: 600,
                lineHeight: 1,
                color: rec.text,
                background: rec.bg,
                border: `1px solid ${rec.border}`,
                whiteSpace: "nowrap",
              }}
            >
              {REC_ICON[recommendation]}
              {rec.label}
            </span>

            {/* severity summary badges */}
            {hasDetails && <SeveritySummary warnings={warnings} flags={flags} />}
          </div>
        </div>

        {/* toggle hint */}
        {hasDetails && (
          <span
            style={{
              display: "flex",
              alignItems: "center",
              gap: 4,
              fontSize: 12,
              color: "#a1a1aa", // zinc-400
              flexShrink: 0,
            }}
          >
            {warnings.length} warning{warnings.length !== 1 ? "s" : ""}
            <ChevronIcon open={open} />
          </span>
        )}
      </button>

      {/* ── expanded: warnings list ─────────────────────────────── */}
      <div
        style={{
          maxHeight: open ? 800 : 0,
          opacity: open ? 1 : 0,
          overflow: "hidden",
          transition: "max-height 300ms ease, opacity 200ms ease",
        }}
      >
        <div
          style={{
            borderTop: "1px solid rgba(255,255,255,0.06)",
            padding: "12px 16px 16px",
            display: "flex",
            flexDirection: "column",
            gap: 8,
          }}
        >
          {/* flags row */}
          {flags.length > 0 && (
            <div
              style={{
                display: "flex",
                flexWrap: "wrap",
                gap: 6,
                marginBottom: 4,
              }}
            >
              {flags.map((flag) => {
                const severity = classifyFlag(flag);
                const sev = SEVERITY_STYLES[severity];
                return (
                  <span
                    key={flag}
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 5,
                      padding: "3px 8px",
                      borderRadius: 6,
                      fontSize: 11,
                      fontWeight: 500,
                      color: sev.iconColor,
                      background: sev.badgeBg,
                      border: `1px solid ${sev.badgeBorder}`,
                      fontFamily: "monospace",
                    }}
                  >
                    <span style={{ color: sev.iconColor, flexShrink: 0 }}>
                      {flagIcon(flag)}
                    </span>
                    {flag}
                  </span>
                );
              })}
            </div>
          )}

          {/* warning cards — sorted by severity */}
          {sortedWarnings.map((warning, i) => {
            const severity = classifyWarning(warning, flags);
            const sev = SEVERITY_STYLES[severity];
            const suggestion = getSuggestion(warning, flags);

            const matchedFlag = flags.find(
              (f) =>
                warning.toLowerCase().includes(f.replace(/_/g, " ").toLowerCase()) ||
                f.toLowerCase().includes(warning.split(" ")[0]?.toLowerCase() ?? "")
            );

            return (
              <div
                key={i}
                style={{
                  borderRadius: 8,
                  background: sev.bg,
                  border: "1px solid rgba(255,255,255,0.06)",
                  borderLeft: `3px solid ${sev.borderLeft}`,
                  overflow: "hidden",
                }}
              >
                {/* warning text row */}
                <div
                  style={{
                    display: "flex",
                    alignItems: "flex-start",
                    gap: 10,
                    padding: "10px 12px",
                  }}
                >
                  <span
                    style={{
                      flexShrink: 0,
                      marginTop: 1,
                      color: sev.iconColor,
                    }}
                  >
                    {matchedFlag ? flagIcon(matchedFlag) : flagIcon(flags[i] ?? "")}
                  </span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 6,
                        marginBottom: 2,
                      }}
                    >
                      <span
                        style={{
                          fontSize: 10,
                          fontWeight: 700,
                          textTransform: "uppercase",
                          letterSpacing: "0.05em",
                          color: sev.iconColor,
                        }}
                      >
                        {sev.label}
                      </span>
                    </div>
                    <span
                      style={{
                        fontSize: 13,
                        lineHeight: 1.5,
                        color: "#d4d4d8", // zinc-300
                      }}
                    >
                      {warning}
                    </span>
                  </div>
                </div>

                {/* actionable suggestion */}
                {suggestion && (
                  <div
                    style={{
                      display: "flex",
                      alignItems: "flex-start",
                      gap: 6,
                      padding: "8px 12px 10px 37px",
                      borderTop: "1px solid rgba(255,255,255,0.04)",
                      background: "rgba(255,255,255,0.02)",
                    }}
                  >
                    <span style={{ flexShrink: 0, marginTop: 1, color: "#71717a" }}>
                      <LightbulbIcon />
                    </span>
                    <span
                      style={{
                        fontSize: 12,
                        lineHeight: 1.5,
                        color: "#a1a1aa",
                        fontStyle: "italic",
                      }}
                    >
                      {suggestion}
                    </span>
                  </div>
                )}
              </div>
            );
          })}

          {/* no-warnings state (only flags) */}
          {warnings.length === 0 && flags.length > 0 && (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                padding: "10px 12px",
                borderRadius: 8,
                background: "rgba(255,255,255,0.03)",
                color: "#71717a",
                fontSize: 13,
              }}
            >
              <ShieldIcon color="#71717a" />
              Flags detected but no specific warnings generated.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
