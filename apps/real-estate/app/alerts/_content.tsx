"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { Topbar } from "@/components/topbar";

const ANALYZER_URL = process.env.NEXT_PUBLIC_ANALYZER_URL ?? "http://localhost:8005";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface AlertCriteria {
  city: string;
  zones: string[];
  min_rooms: number | null;
  max_rooms: number | null;
  max_price_eur: number | null;
  min_size_m2: number | null;
  max_price_per_m2: number | null;
}

interface SavedAlert {
  id: number;
  label: string | null;
  criteria: AlertCriteria;
  created_at: string;
  last_run_at: string | null;
  is_active: boolean;
  matches_count: number;
}

interface AlertMatch {
  id: number;
  alert_id: number;
  listing_url: string;
  title: string | null;
  price_eur: number | null;
  size_m2: number | null;
  price_per_m2: number | null;
  rooms: number | null;
  zone: string | null;
  matched_at: string;
  seen: boolean;
}

/* ------------------------------------------------------------------ */
/*  Styles                                                             */
/* ------------------------------------------------------------------ */

const S = {
  glass: {
    background: "rgba(255,255,255,0.025)",
    border: "1px solid rgba(255,255,255,0.06)",
    borderRadius: 12,
    padding: "16px 18px",
  } as React.CSSProperties,
  label: {
    fontSize: 9,
    fontWeight: 700,
    color: "var(--gray-7)",
    textTransform: "uppercase" as const,
    letterSpacing: "0.1em",
    marginBottom: 6,
  } as React.CSSProperties,
  input: {
    background: "rgba(255,255,255,0.03)",
    border: "1px solid var(--gray-4)",
    color: "var(--gray-12)",
    padding: "9px 12px",
    borderRadius: 6,
    fontSize: 12,
    outline: "none",
    transition: "border-color 0.2s",
    width: "100%",
  } as React.CSSProperties,
  btn: {
    background: "linear-gradient(135deg, var(--accent-9), #ec4899)",
    border: "none",
    borderRadius: 6,
    padding: "9px 18px",
    fontSize: 12,
    fontWeight: 700,
    color: "#fff",
    cursor: "pointer",
    transition: "opacity 0.15s",
    whiteSpace: "nowrap" as const,
  } as React.CSSProperties,
  btnGhost: {
    background: "transparent",
    border: "1px solid rgba(255,255,255,0.08)",
    borderRadius: 5,
    padding: "5px 12px",
    fontSize: 11,
    fontWeight: 600,
    color: "var(--gray-9)",
    cursor: "pointer",
    transition: "all 0.15s",
  } as React.CSSProperties,
};

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

function fmtEur(n: number): string {
  if (n >= 1_000_000) return `\u20AC${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000) return `\u20AC${(n / 1_000).toFixed(0)}K`;
  return `\u20AC${n.toLocaleString()}`;
}

/* ------------------------------------------------------------------ */
/*  Create Alert Form                                                  */
/* ------------------------------------------------------------------ */

function CreateAlertForm({ onCreated }: { onCreated: () => void }) {
  const [city, setCity] = useState("Chisinau");
  const [zones, setZones] = useState("");
  const [label, setLabel] = useState("");
  const [minRooms, setMinRooms] = useState("");
  const [maxRooms, setMaxRooms] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const [minSize, setMinSize] = useState("");
  const [maxPpm2, setMaxPpm2] = useState("");
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleCreate = async () => {
    if (!city.trim()) return;
    setCreating(true);
    setError(null);
    try {
      const criteria: AlertCriteria = {
        city: city.trim(),
        zones: zones
          .split(",")
          .map((z) => z.trim())
          .filter(Boolean),
        min_rooms: minRooms ? parseInt(minRooms) : null,
        max_rooms: maxRooms ? parseInt(maxRooms) : null,
        max_price_eur: maxPrice ? parseInt(maxPrice) : null,
        min_size_m2: minSize ? parseFloat(minSize) : null,
        max_price_per_m2: maxPpm2 ? parseFloat(maxPpm2) : null,
      };
      const res = await fetch(`${ANALYZER_URL}/alerts`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ label: label.trim() || null, criteria }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setLabel("");
      setZones("");
      setMinRooms("");
      setMaxRooms("");
      setMaxPrice("");
      setMinSize("");
      setMaxPpm2("");
      onCreated();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to create alert");
    } finally {
      setCreating(false);
    }
  };

  return (
    <div style={{ ...S.glass, marginBottom: 24 }}>
      <div style={S.label}>Create New Alert</div>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))",
          gap: 10,
          marginBottom: 12,
        }}
      >
        <div>
          <div style={{ ...S.label, marginBottom: 4 }}>Label</div>
          <input
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            placeholder="e.g. Botanica 2-room"
            style={S.input}
          />
        </div>
        <div>
          <div style={{ ...S.label, marginBottom: 4 }}>City *</div>
          <input
            value={city}
            onChange={(e) => setCity(e.target.value)}
            placeholder="Chisinau"
            style={S.input}
          />
        </div>
        <div>
          <div style={{ ...S.label, marginBottom: 4 }}>Zones (comma-sep)</div>
          <input
            value={zones}
            onChange={(e) => setZones(e.target.value)}
            placeholder="Botanica, Centru"
            style={S.input}
          />
        </div>
        <div>
          <div style={{ ...S.label, marginBottom: 4 }}>Min Rooms</div>
          <input
            type="number"
            value={minRooms}
            onChange={(e) => setMinRooms(e.target.value)}
            placeholder="1"
            style={S.input}
          />
        </div>
        <div>
          <div style={{ ...S.label, marginBottom: 4 }}>Max Rooms</div>
          <input
            type="number"
            value={maxRooms}
            onChange={(e) => setMaxRooms(e.target.value)}
            placeholder="3"
            style={S.input}
          />
        </div>
        <div>
          <div style={{ ...S.label, marginBottom: 4 }}>Max Price (EUR)</div>
          <input
            type="number"
            value={maxPrice}
            onChange={(e) => setMaxPrice(e.target.value)}
            placeholder="60000"
            style={S.input}
          />
        </div>
        <div>
          <div style={{ ...S.label, marginBottom: 4 }}>Min Size (m{"\u00B2"})</div>
          <input
            type="number"
            value={minSize}
            onChange={(e) => setMinSize(e.target.value)}
            placeholder="40"
            style={S.input}
          />
        </div>
        <div>
          <div style={{ ...S.label, marginBottom: 4 }}>Max Price/m{"\u00B2"}</div>
          <input
            type="number"
            value={maxPpm2}
            onChange={(e) => setMaxPpm2(e.target.value)}
            placeholder="800"
            style={S.input}
          />
        </div>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <button
          onClick={handleCreate}
          disabled={creating || !city.trim()}
          style={{
            ...S.btn,
            opacity: creating || !city.trim() ? 0.5 : 1,
            cursor: creating ? "wait" : "pointer",
          }}
        >
          {creating ? "Creating..." : "Create Alert"}
        </button>
        {error && (
          <span style={{ fontSize: 11, color: "var(--red-9)" }}>{error}</span>
        )}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Match Card                                                         */
/* ------------------------------------------------------------------ */

function MatchCard({ match }: { match: AlertMatch }) {
  return (
    <div
      style={{
        background: "rgba(255,255,255,0.02)",
        border: "1px solid rgba(255,255,255,0.06)",
        borderRadius: 8,
        padding: "10px 14px",
        display: "flex",
        alignItems: "center",
        gap: 10,
        flexWrap: "wrap",
      }}
    >
      <div style={{ flex: "1 1 200px", minWidth: 0 }}>
        <div
          style={{
            fontSize: 12,
            fontWeight: 600,
            color: "var(--gray-12)",
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {match.title || "Untitled listing"}
        </div>
        <div style={{ fontSize: 10, color: "var(--gray-7)", marginTop: 2 }}>
          {match.zone && <span>{match.zone}</span>}
          {match.rooms != null && <span> {"\u00B7"} {match.rooms}R</span>}
          {match.size_m2 != null && (
            <span>
              {" "}
              {"\u00B7"} {match.size_m2}m{"\u00B2"}
            </span>
          )}
        </div>
      </div>

      {match.price_eur != null && (
        <span
          style={{
            fontSize: 14,
            fontWeight: 800,
            color: "var(--gray-12)",
            fontVariantNumeric: "tabular-nums",
          }}
        >
          {fmtEur(match.price_eur)}
        </span>
      )}

      {match.price_per_m2 != null && (
        <span
          style={{
            fontSize: 11,
            fontWeight: 600,
            color: "var(--gray-8)",
            fontVariantNumeric: "tabular-nums",
          }}
        >
          {"\u20AC"}{Math.round(match.price_per_m2)}/m{"\u00B2"}
        </span>
      )}

      <span style={{ fontSize: 10, color: "var(--gray-7)" }}>
        {timeAgo(match.matched_at)}
      </span>

      <Link
        href={`/analyzer?url=${encodeURIComponent(match.listing_url)}`}
        style={{
          ...S.btnGhost,
          fontSize: 10,
          color: "var(--accent-11)",
          textDecoration: "none",
        }}
      >
        Analyze {"\u2192"}
      </Link>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Alert Card                                                         */
/* ------------------------------------------------------------------ */

function AlertCard({
  alert,
  onDelete,
  onScan,
}: {
  alert: SavedAlert;
  onDelete: (id: number) => void;
  onScan: (id: number) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [matches, setMatches] = useState<AlertMatch[]>([]);
  const [loadingMatches, setLoadingMatches] = useState(false);
  const [scanning, setScanning] = useState(false);

  const loadMatches = async () => {
    setLoadingMatches(true);
    try {
      const res = await fetch(`${ANALYZER_URL}/alerts/${alert.id}/matches`);
      if (res.ok) setMatches(await res.json());
    } catch {
      /* silent */
    } finally {
      setLoadingMatches(false);
    }
  };

  const handleExpand = () => {
    const next = !expanded;
    setExpanded(next);
    if (next && matches.length === 0) loadMatches();
  };

  const handleScan = async () => {
    setScanning(true);
    try {
      const res = await fetch(`${ANALYZER_URL}/alerts/${alert.id}/scan`, {
        method: "POST",
      });
      if (res.ok) {
        const newMatches: AlertMatch[] = await res.json();
        if (newMatches.length > 0) {
          setMatches((prev) => [...newMatches, ...prev]);
        }
        onScan(alert.id);
      }
    } catch {
      /* silent */
    } finally {
      setScanning(false);
    }
  };

  const c = alert.criteria;

  return (
    <div style={{ ...S.glass, marginBottom: 12 }}>
      {/* Header row */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          cursor: "pointer",
        }}
        onClick={handleExpand}
      >
        <span
          style={{
            fontSize: 10,
            color: "var(--gray-7)",
            transition: "transform 0.2s",
            transform: expanded ? "rotate(90deg)" : "rotate(0deg)",
          }}
        >
          {"\u25B6"}
        </span>
        <span
          style={{
            fontSize: 14,
            fontWeight: 700,
            color: "var(--gray-12)",
            flex: "1 1 0",
            minWidth: 0,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {alert.label || `${c.city} alert`}
        </span>

        {/* Criteria pills */}
        {c.zones.length > 0 && (
          <span
            style={{
              fontSize: 9,
              fontWeight: 600,
              padding: "2px 6px",
              borderRadius: 4,
              background: "rgba(99,102,241,0.1)",
              color: "var(--accent-11)",
            }}
          >
            {c.zones.join(", ")}
          </span>
        )}
        {c.min_rooms != null && (
          <span
            style={{
              fontSize: 9,
              fontWeight: 600,
              padding: "2px 6px",
              borderRadius: 4,
              background: "rgba(255,255,255,0.06)",
              color: "var(--gray-9)",
            }}
          >
            {c.min_rooms}
            {c.max_rooms ? `\u2013${c.max_rooms}` : "+"}R
          </span>
        )}
        {c.max_price_eur != null && (
          <span
            style={{
              fontSize: 9,
              fontWeight: 600,
              padding: "2px 6px",
              borderRadius: 4,
              background: "rgba(255,255,255,0.06)",
              color: "var(--gray-9)",
            }}
          >
            max {fmtEur(c.max_price_eur)}
          </span>
        )}

        {/* Matches count */}
        <span
          style={{
            fontSize: 10,
            fontWeight: 700,
            color:
              alert.matches_count > 0
                ? "var(--green-9)"
                : "var(--gray-7)",
            fontVariantNumeric: "tabular-nums",
          }}
        >
          {alert.matches_count} match{alert.matches_count !== 1 ? "es" : ""}
        </span>
      </div>

      {/* Meta row */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          marginTop: 8,
          fontSize: 10,
          color: "var(--gray-7)",
        }}
      >
        <span>Created {timeAgo(alert.created_at)}</span>
        {alert.last_run_at && <span>Last scan {timeAgo(alert.last_run_at)}</span>}
        <span style={{ flex: 1 }} />
        <button
          onClick={(e) => {
            e.stopPropagation();
            handleScan();
          }}
          disabled={scanning}
          style={{
            ...S.btnGhost,
            color: scanning ? "var(--gray-7)" : "var(--accent-11)",
            cursor: scanning ? "wait" : "pointer",
          }}
        >
          {scanning ? "Scanning..." : "Scan Now"}
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onDelete(alert.id);
          }}
          style={{
            ...S.btnGhost,
            color: "var(--gray-7)",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.color = "var(--red-9)";
            e.currentTarget.style.borderColor = "rgba(239,68,68,0.3)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.color = "var(--gray-7)";
            e.currentTarget.style.borderColor = "rgba(255,255,255,0.08)";
          }}
        >
          Delete
        </button>
      </div>

      {/* Expanded matches */}
      {expanded && (
        <div style={{ marginTop: 14 }}>
          {loadingMatches && (
            <div style={{ fontSize: 11, color: "var(--gray-7)", padding: "8px 0" }}>
              Loading matches...
            </div>
          )}
          {!loadingMatches && matches.length === 0 && (
            <div style={{ fontSize: 11, color: "var(--gray-7)", padding: "8px 0" }}>
              No matches yet. Click "Scan Now" to search.
            </div>
          )}
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {matches.map((m) => (
              <MatchCard key={m.id} match={m} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Main Content                                                       */
/* ------------------------------------------------------------------ */

export function AlertsContent() {
  const [alerts, setAlerts] = useState<SavedAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAlerts = useCallback(async () => {
    try {
      const res = await fetch(`${ANALYZER_URL}/alerts`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setAlerts(await res.json());
    } catch {
      setError("Failed to load alerts. Is the backend running?");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAlerts();
  }, [fetchAlerts]);

  const handleDelete = async (id: number) => {
    setAlerts((prev) => prev.filter((a) => a.id !== id));
    await fetch(`${ANALYZER_URL}/alerts/${id}`, { method: "DELETE" });
  };

  const handleScan = () => {
    fetchAlerts();
  };

  return (
    <div>
      <Topbar />

      <div style={{ maxWidth: 900, margin: "0 auto", padding: "32px 20px 64px" }}>
        {/* Header */}
        <div
          style={{
            display: "flex",
            alignItems: "baseline",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: 8,
            marginBottom: 4,
          }}
        >
          <h1
            style={{
              fontSize: 26,
              fontWeight: 800,
              letterSpacing: "-0.03em",
              color: "var(--gray-12)",
              margin: 0,
            }}
          >
            Listing Alerts
          </h1>
          {!loading && alerts.length > 0 && (
            <span
              style={{
                fontSize: 11,
                fontWeight: 600,
                color: "var(--gray-7)",
                fontVariantNumeric: "tabular-nums",
              }}
            >
              {alerts.length} alert{alerts.length !== 1 ? "s" : ""}
            </span>
          )}
        </div>
        <p style={{ fontSize: 13, color: "var(--gray-8)", margin: "0 0 24px" }}>
          Define search criteria and scan for matching new listings.
        </p>

        {/* Create form */}
        <CreateAlertForm onCreated={fetchAlerts} />

        {/* Loading */}
        {loading && (
          <div
            style={{
              textAlign: "center",
              padding: "60px 0",
              color: "var(--gray-7)",
              fontSize: 13,
            }}
          >
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
            Loading alerts...
            <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
          </div>
        )}

        {/* Error */}
        {error && !loading && (
          <div
            style={{
              background: "rgba(239,68,68,0.06)",
              border: "1px solid rgba(239,68,68,0.2)",
              borderRadius: 10,
              padding: "14px 18px",
              marginBottom: 20,
              fontSize: 12,
              color: "var(--red-9)",
            }}
          >
            {error}
          </div>
        )}

        {/* Empty state */}
        {!loading && !error && alerts.length === 0 && (
          <div
            style={{
              textAlign: "center",
              padding: "48px 24px",
            }}
          >
            <div
              style={{
                width: 72,
                height: 72,
                borderRadius: 18,
                background:
                  "linear-gradient(135deg, rgba(99,102,241,0.12), rgba(236,72,153,0.12))",
                border: "1px solid rgba(99,102,241,0.15)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                margin: "0 auto 20px",
                fontSize: 28,
              }}
            >
              {"\u{1F514}"}
            </div>
            <h2
              style={{
                fontSize: 20,
                fontWeight: 800,
                color: "var(--gray-12)",
                margin: "0 0 6px",
              }}
            >
              No alerts configured
            </h2>
            <p
              style={{
                fontSize: 13,
                color: "var(--gray-8)",
                maxWidth: 400,
                margin: "0 auto",
                lineHeight: 1.5,
              }}
            >
              Create an alert above to start monitoring for listings
              matching your criteria.
            </p>
          </div>
        )}

        {/* Alert list */}
        {!loading &&
          !error &&
          alerts.map((a) => (
            <AlertCard
              key={a.id}
              alert={a}
              onDelete={handleDelete}
              onScan={handleScan}
            />
          ))}
      </div>
    </div>
  );
}
