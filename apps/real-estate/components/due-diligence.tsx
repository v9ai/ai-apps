"use client";

import { useState, useEffect } from "react";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface ChecklistItem {
  category: string;
  item: string;
  description: string;
  priority: string;
  market_specific: boolean;
  estimated_cost_eur: number | null;
  typical_time_days: number | null;
}

interface DueDiligenceChecklist {
  market: string;
  items: ChecklistItem[];
  risk_level: string;
  estimated_total_days: number;
  estimated_total_cost_eur: number;
}

interface DueDiligenceProps {
  market?: string;
}

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */

const ANALYZER_URL = process.env.NEXT_PUBLIC_ANALYZER_URL ?? "http://localhost:8005";

const MARKETS = ["moldova", "romania", "uk"] as const;

const MARKET_LABELS: Record<string, string> = {
  moldova: "Moldova",
  romania: "Romania",
  uk: "United Kingdom",
};

const CATEGORIES = ["legal", "financial", "physical", "regulatory"] as const;

const CATEGORY_LABELS: Record<string, string> = {
  legal: "Legal",
  financial: "Financial",
  physical: "Physical",
  regulatory: "Regulatory",
};

const CATEGORY_ACCENT: Record<string, string> = {
  legal: "var(--blue-9)",
  financial: "var(--green-9)",
  physical: "var(--amber-9)",
  regulatory: "var(--gray-9)",
};

const PRIORITY_COLOR: Record<string, string> = {
  critical: "var(--red-9)",
  important: "var(--amber-9)",
  recommended: "var(--gray-8)",
};

const PRIORITY_BG: Record<string, string> = {
  critical: "rgba(239, 68, 68, 0.08)",
  important: "rgba(234, 179, 8, 0.08)",
  recommended: "rgba(128, 128, 128, 0.06)",
};

const RISK_COLOR: Record<string, string> = {
  high: "var(--red-9)",
  medium: "var(--amber-9)",
  low: "var(--green-9)",
};

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function fmtEur(n: number): string {
  if (n >= 1_000) return `\u20AC${(n / 1_000).toFixed(1)}K`;
  return `\u20AC${n.toLocaleString()}`;
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export function DueDiligence({ market: initialMarket }: DueDiligenceProps) {
  const [activeMarket, setActiveMarket] = useState<string>(initialMarket ?? "moldova");
  const [checklist, setChecklist] = useState<DueDiligenceChecklist | null>(null);
  const [checked, setChecked] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    fetch(`${ANALYZER_URL}/due-diligence/${activeMarket}`)
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then((data: DueDiligenceChecklist) => {
        if (cancelled) return;
        setChecklist(data);
        setChecked(new Set());
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : "Failed to load checklist");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [activeMarket]);

  const toggleItem = (itemKey: string) => {
    setChecked((prev) => {
      const next = new Set(prev);
      if (next.has(itemKey)) next.delete(itemKey);
      else next.add(itemKey);
      return next;
    });
  };

  const totalItems = checklist?.items.length ?? 0;
  const completedCount = checked.size;
  const progressPct = totalItems > 0 ? Math.round((completedCount / totalItems) * 100) : 0;

  return (
    <div
      style={{
        background: "rgba(255,255,255,0.02)",
        border: "1px solid rgba(255,255,255,0.06)",
        borderRadius: 12,
        padding: "20px 20px 16px",
      }}
    >
      {/* Header */}
      <div
        style={{
          fontSize: 9,
          fontWeight: 700,
          color: "var(--gray-7)",
          textTransform: "uppercase",
          letterSpacing: "0.1em",
          marginBottom: 4,
        }}
      >
        Due Diligence Checklist
      </div>
      <div
        style={{
          fontSize: 13,
          fontWeight: 700,
          color: "var(--gray-12)",
          marginBottom: 16,
        }}
      >
        Pre-purchase verification steps
      </div>

      {/* Market tabs */}
      <div style={{ display: "flex", gap: 4, marginBottom: 18 }}>
        {MARKETS.map((m) => {
          const active = activeMarket === m;
          return (
            <button
              key={m}
              onClick={() => setActiveMarket(m)}
              style={{
                flex: "1 1 0",
                padding: "8px 10px",
                borderRadius: 8,
                border: active
                  ? "1px solid var(--accent-7)"
                  : "1px solid rgba(255,255,255,0.08)",
                background: active
                  ? "rgba(99,102,241,0.10)"
                  : "rgba(255,255,255,0.02)",
                cursor: "pointer",
                fontSize: 12,
                fontWeight: 700,
                color: active ? "var(--accent-11)" : "var(--gray-9)",
                transition: "all 0.15s",
              }}
            >
              {MARKET_LABELS[m]}
            </button>
          );
        })}
      </div>

      {/* Loading */}
      {loading && (
        <div
          style={{
            textAlign: "center",
            padding: "32px 0",
            color: "var(--gray-7)",
            fontSize: 12,
          }}
        >
          Loading checklist...
        </div>
      )}

      {/* Error */}
      {error && !loading && (
        <div
          style={{
            background: "rgba(239,68,68,0.06)",
            border: "1px solid rgba(239,68,68,0.2)",
            borderRadius: 8,
            padding: "10px 14px",
            fontSize: 11,
            color: "var(--red-9)",
            marginBottom: 16,
          }}
        >
          {error}
        </div>
      )}

      {/* Content */}
      {checklist && !loading && (
        <>
          {/* Progress bar */}
          <div style={{ marginBottom: 18 }}>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                marginBottom: 6,
              }}
            >
              <span style={{ fontSize: 11, color: "var(--gray-9)" }}>
                Progress: {completedCount}/{totalItems}
              </span>
              <span
                style={{
                  fontSize: 11,
                  fontWeight: 700,
                  color:
                    progressPct === 100
                      ? "var(--green-9)"
                      : progressPct > 50
                        ? "var(--amber-9)"
                        : "var(--gray-9)",
                  fontVariantNumeric: "tabular-nums",
                }}
              >
                {progressPct}%
              </span>
            </div>
            <div
              style={{
                height: 6,
                background: "var(--gray-4)",
                borderRadius: 3,
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  width: `${progressPct}%`,
                  height: "100%",
                  background:
                    progressPct === 100
                      ? "var(--green-9)"
                      : "var(--accent-9)",
                  borderRadius: 3,
                  transition: "width 0.3s ease",
                }}
              />
            </div>
          </div>

          {/* Risk + summary cards */}
          <div style={{ display: "flex", gap: 8, marginBottom: 18, flexWrap: "wrap" }}>
            <div
              style={{
                flex: "1 1 0",
                minWidth: 120,
                background: "rgba(255,255,255,0.02)",
                border: "1px solid rgba(255,255,255,0.06)",
                borderRadius: 8,
                padding: "10px 12px",
              }}
            >
              <div
                style={{
                  fontSize: 9,
                  fontWeight: 700,
                  color: "var(--gray-7)",
                  textTransform: "uppercase",
                  letterSpacing: "0.08em",
                  marginBottom: 4,
                }}
              >
                Risk Level
              </div>
              <div
                style={{
                  fontSize: 14,
                  fontWeight: 800,
                  color: RISK_COLOR[checklist.risk_level] ?? "var(--gray-12)",
                  textTransform: "capitalize",
                }}
              >
                {checklist.risk_level}
              </div>
            </div>
            <div
              style={{
                flex: "1 1 0",
                minWidth: 120,
                background: "rgba(255,255,255,0.02)",
                border: "1px solid rgba(255,255,255,0.06)",
                borderRadius: 8,
                padding: "10px 12px",
              }}
            >
              <div
                style={{
                  fontSize: 9,
                  fontWeight: 700,
                  color: "var(--gray-7)",
                  textTransform: "uppercase",
                  letterSpacing: "0.08em",
                  marginBottom: 4,
                }}
              >
                Est. Timeline
              </div>
              <div
                style={{
                  fontSize: 14,
                  fontWeight: 800,
                  color: "var(--gray-12)",
                  fontVariantNumeric: "tabular-nums",
                }}
              >
                {checklist.estimated_total_days} days
              </div>
            </div>
            <div
              style={{
                flex: "1 1 0",
                minWidth: 120,
                background: "rgba(255,255,255,0.02)",
                border: "1px solid rgba(255,255,255,0.06)",
                borderRadius: 8,
                padding: "10px 12px",
              }}
            >
              <div
                style={{
                  fontSize: 9,
                  fontWeight: 700,
                  color: "var(--gray-7)",
                  textTransform: "uppercase",
                  letterSpacing: "0.08em",
                  marginBottom: 4,
                }}
              >
                Est. Cost
              </div>
              <div
                style={{
                  fontSize: 14,
                  fontWeight: 800,
                  color: "var(--gray-12)",
                  fontVariantNumeric: "tabular-nums",
                }}
              >
                {fmtEur(checklist.estimated_total_cost_eur)}
              </div>
            </div>
          </div>

          {/* Category groups */}
          {CATEGORIES.map((cat) => {
            const items = checklist.items.filter((i) => i.category === cat);
            if (items.length === 0) return null;

            return (
              <div key={cat} style={{ marginBottom: 16 }}>
                {/* Category header */}
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                    marginBottom: 8,
                    paddingBottom: 6,
                    borderBottom: "1px solid rgba(255,255,255,0.06)",
                  }}
                >
                  <span
                    style={{
                      width: 8,
                      height: 8,
                      borderRadius: 2,
                      background: CATEGORY_ACCENT[cat],
                      flexShrink: 0,
                    }}
                  />
                  <span
                    style={{
                      fontSize: 11,
                      fontWeight: 700,
                      color: "var(--gray-11)",
                      textTransform: "uppercase",
                      letterSpacing: "0.06em",
                    }}
                  >
                    {CATEGORY_LABELS[cat]}
                  </span>
                  <span
                    style={{
                      fontSize: 10,
                      color: "var(--gray-7)",
                      marginLeft: "auto",
                    }}
                  >
                    {items.filter((i) => checked.has(`${cat}-${i.item}`)).length}/{items.length}
                  </span>
                </div>

                {/* Items */}
                <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                  {items.map((item) => {
                    const key = `${cat}-${item.item}`;
                    const isChecked = checked.has(key);

                    return (
                      <div
                        key={key}
                        onClick={() => toggleItem(key)}
                        style={{
                          display: "flex",
                          alignItems: "flex-start",
                          gap: 10,
                          padding: "10px 12px",
                          borderRadius: 8,
                          background: isChecked
                            ? "rgba(34, 197, 94, 0.04)"
                            : PRIORITY_BG[item.priority] ?? "transparent",
                          border: isChecked
                            ? "1px solid rgba(34, 197, 94, 0.15)"
                            : "1px solid rgba(255,255,255,0.04)",
                          cursor: "pointer",
                          transition: "all 0.15s",
                          opacity: isChecked ? 0.7 : 1,
                        }}
                      >
                        {/* Checkbox */}
                        <div
                          style={{
                            width: 16,
                            height: 16,
                            borderRadius: 4,
                            border: isChecked
                              ? "2px solid var(--green-9)"
                              : "2px solid var(--gray-6)",
                            background: isChecked ? "var(--green-9)" : "transparent",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            flexShrink: 0,
                            marginTop: 1,
                            transition: "all 0.15s",
                          }}
                        >
                          {isChecked && (
                            <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                              <path
                                d="M2 5L4 7L8 3"
                                stroke="white"
                                strokeWidth="1.5"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                              />
                            </svg>
                          )}
                        </div>

                        {/* Content */}
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: 6,
                              marginBottom: 3,
                            }}
                          >
                            {/* Priority dot */}
                            <span
                              style={{
                                width: 6,
                                height: 6,
                                borderRadius: "50%",
                                background: PRIORITY_COLOR[item.priority] ?? "var(--gray-7)",
                                flexShrink: 0,
                              }}
                            />
                            <span
                              style={{
                                fontSize: 12,
                                fontWeight: 700,
                                color: isChecked ? "var(--gray-8)" : "var(--gray-12)",
                                textDecoration: isChecked ? "line-through" : "none",
                              }}
                            >
                              {item.item}
                            </span>
                            {item.market_specific && (
                              <span
                                style={{
                                  fontSize: 8,
                                  fontWeight: 700,
                                  padding: "1px 5px",
                                  borderRadius: 3,
                                  background: "rgba(99,102,241,0.10)",
                                  color: "var(--accent-9)",
                                  textTransform: "uppercase",
                                  letterSpacing: "0.04em",
                                  flexShrink: 0,
                                }}
                              >
                                Local
                              </span>
                            )}
                          </div>
                          <div
                            style={{
                              fontSize: 11,
                              color: "var(--gray-8)",
                              lineHeight: 1.4,
                              marginBottom: 4,
                            }}
                          >
                            {item.description}
                          </div>
                          <div style={{ display: "flex", gap: 12 }}>
                            {item.estimated_cost_eur != null && item.estimated_cost_eur > 0 && (
                              <span
                                style={{
                                  fontSize: 10,
                                  color: "var(--gray-7)",
                                  fontVariantNumeric: "tabular-nums",
                                }}
                              >
                                ~{"\u20AC"}{item.estimated_cost_eur}
                              </span>
                            )}
                            {item.typical_time_days != null && item.typical_time_days > 0 && (
                              <span style={{ fontSize: 10, color: "var(--gray-7)" }}>
                                ~{item.typical_time_days}d
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}

          {/* Priority legend */}
          <div
            style={{
              display: "flex",
              gap: 14,
              paddingTop: 12,
              borderTop: "1px solid rgba(255,255,255,0.06)",
            }}
          >
            {(["critical", "important", "recommended"] as const).map((p) => (
              <div key={p} style={{ display: "flex", alignItems: "center", gap: 4 }}>
                <span
                  style={{
                    width: 6,
                    height: 6,
                    borderRadius: "50%",
                    background: PRIORITY_COLOR[p],
                    flexShrink: 0,
                  }}
                />
                <span
                  style={{
                    fontSize: 10,
                    color: "var(--gray-8)",
                    textTransform: "capitalize",
                  }}
                >
                  {p}
                </span>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
