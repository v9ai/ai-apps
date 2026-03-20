"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { Topbar } from "@/components/topbar";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface PipelineItem {
  id: number;
  url: string;
  label: string | null;
  city: string | null;
  zone: string | null;
  rooms: number | null;
  price_eur: number | null;
  price_per_m2: number | null;
  investment_score: number | null;
  deviation_pct: number | null;
  verdict: string | null;
  pipeline_stage: string;
  notes: string | null;
  target_price_eur: number | null;
  tags: string[];
}

interface PipelineView {
  stages: Record<string, PipelineItem[]>;
  total: number;
  by_stage: Record<string, number>;
}

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */

const ANALYZER_URL = process.env.NEXT_PUBLIC_ANALYZER_URL ?? "http://localhost:8005";

const STAGES = [
  { key: "discovered", label: "Discovered", color: "var(--gray-9)" },
  { key: "analyzed", label: "Analyzed", color: "var(--blue-9)" },
  { key: "shortlisted", label: "Shortlisted", color: "var(--iris-9)" },
  { key: "viewing", label: "Viewing", color: "var(--amber-9)" },
  { key: "offer", label: "Offer", color: "var(--orange-9)" },
  { key: "closed", label: "Closed", color: "var(--green-9)" },
  { key: "rejected", label: "Rejected", color: "var(--red-9)" },
];

const VERDICT_COLORS: Record<string, string> = {
  undervalued: "#22c55e",
  fair: "#6366f1",
  overvalued: "#ef4444",
};

const VERDICT_BG: Record<string, string> = {
  undervalued: "rgba(34,197,94,0.12)",
  fair: "rgba(99,102,241,0.12)",
  overvalued: "rgba(239,68,68,0.12)",
};

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function fmtEur(n: number): string {
  if (n >= 1_000_000) return `\u20AC${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000) return `\u20AC${(n / 1_000).toFixed(0)}K`;
  return `\u20AC${n.toLocaleString()}`;
}

function scoreColor(score: number): string {
  if (score >= 7) return "var(--green-9)";
  if (score >= 5) return "var(--amber-9)";
  return "var(--red-9)";
}

/* ------------------------------------------------------------------ */
/*  Pipeline Card                                                      */
/* ------------------------------------------------------------------ */

function PipelineCard({
  item,
  onStageChange,
  onNotesChange,
}: {
  item: PipelineItem;
  onStageChange: (url: string, stage: string) => void;
  onNotesChange: (url: string, notes: string) => void;
}) {
  const [editingNotes, setEditingNotes] = useState(false);
  const [notesDraft, setNotesDraft] = useState(item.notes ?? "");

  const displayLabel = item.label || item.zone || item.city || "Untitled";
  const verdictColor = item.verdict ? VERDICT_COLORS[item.verdict] ?? "var(--gray-7)" : "var(--gray-7)";
  const verdictBg = item.verdict ? VERDICT_BG[item.verdict] ?? "rgba(107,114,128,0.12)" : "rgba(107,114,128,0.12)";

  return (
    <div
      style={{
        background: "rgba(255,255,255,0.02)",
        border: "1px solid rgba(255,255,255,0.06)",
        borderRadius: 10,
        padding: "12px 14px",
        transition: "background 0.15s, box-shadow 0.15s",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.background = "rgba(255,255,255,0.04)";
        e.currentTarget.style.boxShadow = "0 4px 16px rgba(0,0,0,0.2)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = "rgba(255,255,255,0.02)";
        e.currentTarget.style.boxShadow = "none";
      }}
    >
      {/* Title + verdict */}
      <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8 }}>
        <span
          style={{
            fontSize: 12,
            fontWeight: 700,
            color: "var(--gray-12)",
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
            flex: "1 1 0",
            minWidth: 0,
          }}
        >
          {displayLabel}
        </span>
        {item.verdict && (
          <span
            style={{
              fontSize: 8,
              fontWeight: 700,
              padding: "2px 6px",
              borderRadius: 99,
              background: verdictBg,
              color: verdictColor,
              textTransform: "uppercase",
              letterSpacing: "0.04em",
              flexShrink: 0,
            }}
          >
            {item.verdict}
          </span>
        )}
      </div>

      {/* Price + score */}
      <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginBottom: 8 }}>
        {item.price_eur != null && (
          <span style={{ fontSize: 14, fontWeight: 800, color: "var(--gray-12)", fontVariantNumeric: "tabular-nums" }}>
            {fmtEur(item.price_eur)}
          </span>
        )}
        {item.investment_score != null && (
          <span
            style={{
              fontSize: 10,
              fontWeight: 700,
              color: scoreColor(item.investment_score),
              fontVariantNumeric: "tabular-nums",
            }}
          >
            {item.investment_score}/10
          </span>
        )}
      </div>

      {/* Zone info */}
      <div style={{ fontSize: 10, color: "var(--gray-8)", marginBottom: 8 }}>
        {[item.city, item.zone, item.rooms != null ? `${item.rooms}R` : null].filter(Boolean).join(" / ")}
      </div>

      {/* Stage selector */}
      <div style={{ marginBottom: 8 }}>
        <select
          value={item.pipeline_stage}
          onChange={(e) => onStageChange(item.url, e.target.value)}
          style={{
            width: "100%",
            background: "rgba(255,255,255,0.04)",
            border: "1px solid rgba(255,255,255,0.08)",
            borderRadius: 6,
            padding: "5px 8px",
            fontSize: 10,
            fontWeight: 600,
            color: "var(--gray-11)",
            cursor: "pointer",
            outline: "none",
          }}
        >
          {STAGES.map((s) => (
            <option key={s.key} value={s.key}>
              {s.label}
            </option>
          ))}
        </select>
      </div>

      {/* Notes */}
      {editingNotes ? (
        <div style={{ marginBottom: 4 }}>
          <textarea
            value={notesDraft}
            onChange={(e) => setNotesDraft(e.target.value)}
            rows={2}
            style={{
              width: "100%",
              background: "rgba(255,255,255,0.04)",
              border: "1px solid rgba(255,255,255,0.1)",
              borderRadius: 6,
              padding: "6px 8px",
              fontSize: 10,
              color: "var(--gray-12)",
              resize: "vertical",
              outline: "none",
              boxSizing: "border-box",
            }}
          />
          <div style={{ display: "flex", gap: 4, marginTop: 4 }}>
            <button
              onClick={() => {
                onNotesChange(item.url, notesDraft);
                setEditingNotes(false);
              }}
              style={{
                background: "var(--accent-9)",
                border: "none",
                borderRadius: 4,
                padding: "3px 8px",
                fontSize: 9,
                fontWeight: 700,
                color: "#fff",
                cursor: "pointer",
              }}
            >
              Save
            </button>
            <button
              onClick={() => {
                setNotesDraft(item.notes ?? "");
                setEditingNotes(false);
              }}
              style={{
                background: "transparent",
                border: "1px solid rgba(255,255,255,0.08)",
                borderRadius: 4,
                padding: "3px 8px",
                fontSize: 9,
                fontWeight: 600,
                color: "var(--gray-9)",
                cursor: "pointer",
              }}
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <button
          onClick={() => setEditingNotes(true)}
          style={{
            background: "transparent",
            border: "none",
            padding: 0,
            fontSize: 10,
            color: item.notes ? "var(--gray-9)" : "var(--gray-6)",
            cursor: "pointer",
            textAlign: "left",
            width: "100%",
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {item.notes || "Add notes..."}
        </button>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Main Component                                                     */
/* ------------------------------------------------------------------ */

export function PipelineBoard() {
  const [data, setData] = useState<PipelineView | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [filterCity, setFilterCity] = useState<string>("__all__");
  const [filterVerdict, setFilterVerdict] = useState<string>("__all__");
  const [filterMinScore, setFilterMinScore] = useState<number>(0);

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch(`${ANALYZER_URL}/portfolio/pipeline`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setData(await res.json());
    } catch {
      setError("Failed to load pipeline data.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleStageChange = async (url: string, stage: string) => {
    // Optimistic update
    setData((prev) => {
      if (!prev) return prev;
      const newStages = { ...prev.stages };
      for (const [key, items] of Object.entries(newStages)) {
        newStages[key] = items.filter((i) => i.url !== url);
      }
      const item = Object.values(prev.stages).flat().find((i) => i.url === url);
      if (item) {
        const updated = { ...item, pipeline_stage: stage };
        newStages[stage] = [updated, ...(newStages[stage] ?? [])];
      }
      const by_stage = Object.fromEntries(Object.entries(newStages).map(([k, v]) => [k, v.length]));
      return { stages: newStages, total: prev.total, by_stage };
    });

    await fetch(`${ANALYZER_URL}/portfolio/${encodeURIComponent(url)}/stage`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ stage }),
    });
  };

  const handleNotesChange = async (url: string, notes: string) => {
    setData((prev) => {
      if (!prev) return prev;
      const newStages = { ...prev.stages };
      for (const key of Object.keys(newStages)) {
        newStages[key] = newStages[key].map((i) => (i.url === url ? { ...i, notes } : i));
      }
      return { ...prev, stages: newStages };
    });

    await fetch(`${ANALYZER_URL}/portfolio/${encodeURIComponent(url)}/notes`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ notes }),
    });
  };

  // Extract unique cities and verdicts for filters
  const allItems = useMemo(() => (data ? Object.values(data.stages).flat() : []), [data]);
  const cities = useMemo(() => [...new Set(allItems.map((i) => i.city).filter(Boolean) as string[])].sort(), [allItems]);
  const verdicts = useMemo(() => [...new Set(allItems.map((i) => i.verdict).filter(Boolean) as string[])].sort(), [allItems]);

  // Apply filters
  const filteredStages = useMemo(() => {
    if (!data) return {};
    const result: Record<string, PipelineItem[]> = {};
    for (const [stage, items] of Object.entries(data.stages)) {
      result[stage] = items.filter((item) => {
        if (filterCity !== "__all__" && item.city !== filterCity) return false;
        if (filterVerdict !== "__all__" && item.verdict !== filterVerdict) return false;
        if (filterMinScore > 0 && (item.investment_score ?? 0) < filterMinScore) return false;
        return true;
      });
    }
    return result;
  }, [data, filterCity, filterVerdict, filterMinScore]);

  if (loading) {
    return (
      <div>
        <Topbar />
        <div style={{ maxWidth: 1400, margin: "0 auto", padding: "32px 20px 64px" }}>
          <div style={{ textAlign: "center", padding: "60px 0", color: "var(--gray-7)", fontSize: 13 }}>
            <div
              style={{
                width: 32,
                height: 32,
                border: "2px solid var(--gray-4)",
                borderTopColor: "var(--accent-9)",
                borderRadius: "50%",
                animation: "spin 0.8s linear infinite",
                margin: "0 auto 12px",
              }}
            />
            Loading pipeline...
            <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
          </div>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div>
        <Topbar />
        <div style={{ maxWidth: 1400, margin: "0 auto", padding: "32px 20px 64px" }}>
          <div
            style={{
              background: "rgba(239,68,68,0.06)",
              border: "1px solid rgba(239,68,68,0.2)",
              borderRadius: 10,
              padding: "14px 18px",
              fontSize: 12,
              color: "var(--red-9)",
            }}
          >
            {error ?? "No pipeline data available."}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <Topbar />
      <div style={{ maxWidth: 1400, margin: "0 auto", padding: "32px 20px 64px" }}>
        {/* Header */}
        <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", flexWrap: "wrap", gap: 8, marginBottom: 4 }}>
          <h1 style={{ fontSize: 26, fontWeight: 800, letterSpacing: "-0.03em", color: "var(--gray-12)", margin: 0 }}>
            Investment Pipeline
          </h1>
          <span style={{ fontSize: 11, fontWeight: 600, color: "var(--gray-7)", fontVariantNumeric: "tabular-nums" }}>
            {data.total} listing{data.total !== 1 ? "s" : ""}
          </span>
        </div>
        <p style={{ fontSize: 13, color: "var(--gray-8)", margin: "4px 0 20px" }}>
          Track listings through your acquisition pipeline from discovery to closing.
        </p>

        {/* Filters */}
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 20 }}>
          <select
            value={filterCity}
            onChange={(e) => setFilterCity(e.target.value)}
            style={{
              background: "rgba(255,255,255,0.04)",
              border: "1px solid rgba(255,255,255,0.08)",
              borderRadius: 6,
              padding: "6px 10px",
              fontSize: 11,
              fontWeight: 600,
              color: "var(--gray-11)",
              cursor: "pointer",
              outline: "none",
            }}
          >
            <option value="__all__">All Cities</option>
            {cities.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>

          <select
            value={filterVerdict}
            onChange={(e) => setFilterVerdict(e.target.value)}
            style={{
              background: "rgba(255,255,255,0.04)",
              border: "1px solid rgba(255,255,255,0.08)",
              borderRadius: 6,
              padding: "6px 10px",
              fontSize: 11,
              fontWeight: 600,
              color: "var(--gray-11)",
              cursor: "pointer",
              outline: "none",
            }}
          >
            <option value="__all__">All Verdicts</option>
            {verdicts.map((v) => (
              <option key={v} value={v}>
                {v}
              </option>
            ))}
          </select>

          <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
            <span style={{ fontSize: 10, color: "var(--gray-8)" }}>Min Score:</span>
            <input
              type="number"
              min={0}
              max={10}
              step={1}
              value={filterMinScore}
              onChange={(e) => setFilterMinScore(Number(e.target.value))}
              style={{
                width: 48,
                background: "rgba(255,255,255,0.04)",
                border: "1px solid rgba(255,255,255,0.08)",
                borderRadius: 6,
                padding: "5px 8px",
                fontSize: 11,
                fontWeight: 600,
                color: "var(--gray-11)",
                outline: "none",
                textAlign: "center",
              }}
            />
          </div>
        </div>

        {/* Kanban board */}
        <div
          style={{
            display: "flex",
            gap: 12,
            overflowX: "auto",
            paddingBottom: 16,
          }}
        >
          {STAGES.map((stage) => {
            const items = filteredStages[stage.key] ?? [];
            return (
              <div
                key={stage.key}
                style={{
                  flex: "0 0 220px",
                  minWidth: 220,
                  display: "flex",
                  flexDirection: "column",
                }}
              >
                {/* Column header */}
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                    marginBottom: 10,
                    paddingBottom: 8,
                    borderBottom: `2px solid ${stage.color}`,
                  }}
                >
                  <span style={{ fontSize: 11, fontWeight: 700, color: "var(--gray-12)", textTransform: "uppercase", letterSpacing: "0.04em" }}>
                    {stage.label}
                  </span>
                  <span
                    style={{
                      fontSize: 10,
                      fontWeight: 700,
                      padding: "1px 6px",
                      borderRadius: 99,
                      background: `${stage.color}1a`,
                      color: stage.color,
                      fontVariantNumeric: "tabular-nums",
                    }}
                  >
                    {items.length}
                  </span>
                </div>

                {/* Cards */}
                <div style={{ display: "flex", flexDirection: "column", gap: 8, flex: 1 }}>
                  {items.length === 0 && (
                    <div
                      style={{
                        padding: "20px 12px",
                        textAlign: "center",
                        fontSize: 10,
                        color: "var(--gray-6)",
                        background: "rgba(255,255,255,0.01)",
                        borderRadius: 10,
                        border: "1px dashed rgba(255,255,255,0.06)",
                      }}
                    >
                      No items
                    </div>
                  )}
                  {items.map((item) => (
                    <PipelineCard
                      key={item.id}
                      item={item}
                      onStageChange={handleStageChange}
                      onNotesChange={handleNotesChange}
                    />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
