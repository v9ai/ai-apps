"use client";

import { useState, useMemo } from "react";
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  flexRender,
  createColumnHelper,
  type SortingState,
  type ColumnFiltersState,
} from "@tanstack/react-table";
import {
  BOROUGHS,
  TIER_LABEL,
  TIER_COLOR,
  fmt,
  fmtK,
  type Borough,
} from "@/lib/london-data";

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */

const TIER_ORDER = [
  "prime",
  "inner_premium",
  "inner",
  "outer",
  "outer_affordable",
] as const;

const ALL_TIERS = ["__all__", ...TIER_ORDER] as const;

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function trendColor(trend: Borough["trend"]) {
  if (trend === "rising") return "#22c55e";
  if (trend === "stable") return "#3b82f6";
  return "#ef4444";
}

function trendLabel(trend: Borough["trend"]) {
  if (trend === "rising") return "Rising";
  if (trend === "stable") return "Stable";
  return "Declining";
}

/* ------------------------------------------------------------------ */
/*  Column definitions                                                 */
/* ------------------------------------------------------------------ */

const col = createColumnHelper<Borough>();

const columns = [
  col.accessor("name", {
    header: "Borough",
    enableSorting: true,
    cell: (info) => {
      const tier = info.row.original.tier;
      return (
        <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
          <span
            style={{
              width: 8,
              height: 8,
              borderRadius: "50%",
              background: TIER_COLOR[tier],
              flexShrink: 0,
            }}
          />
          <span style={{ fontWeight: 600, color: "var(--gray-12)" }}>
            {info.getValue()}
          </span>
        </span>
      );
    },
  }),

  col.accessor("zone", {
    header: "Zone",
    enableSorting: true,
    cell: (info) => (
      <span style={{ color: "var(--gray-10)", fontVariantNumeric: "tabular-nums" }}>
        {info.getValue()}
      </span>
    ),
  }),

  col.accessor("avgPricePerM2", {
    header: "Avg Price/m\u00B2",
    enableSorting: true,
    cell: (info) => (
      <span
        style={{
          fontWeight: 700,
          color: "var(--gray-12)",
          fontVariantNumeric: "tabular-nums",
        }}
      >
        {"\u00A3"}{fmt(info.getValue())}
      </span>
    ),
    meta: { align: "right" as const },
  }),

  col.accessor("avgPrice", {
    header: "Avg Price",
    enableSorting: true,
    cell: (info) => (
      <span
        style={{
          fontWeight: 600,
          color: "var(--gray-11)",
          fontVariantNumeric: "tabular-nums",
        }}
      >
        {fmtK(info.getValue())}
      </span>
    ),
    meta: { align: "right" as const },
  }),

  col.accessor("yieldHigh", {
    id: "yieldRange",
    header: "Yield Range",
    enableSorting: true,
    cell: (info) => {
      const b = info.row.original;
      return (
        <span
          style={{
            color: "var(--gray-10)",
            fontVariantNumeric: "tabular-nums",
          }}
        >
          {b.yieldLow.toFixed(1)}&ndash;{b.yieldHigh.toFixed(1)}%
        </span>
      );
    },
  }),

  col.accessor("growth1y", {
    header: "Growth 1Y",
    enableSorting: true,
    cell: (info) => {
      const v = info.getValue();
      return (
        <span
          style={{
            fontWeight: 700,
            color: v >= 0 ? "#22c55e" : "#ef4444",
            fontVariantNumeric: "tabular-nums",
          }}
        >
          {v >= 0 ? "+" : ""}{v.toFixed(1)}%
        </span>
      );
    },
    meta: { align: "right" as const },
  }),

  col.accessor("trend", {
    header: "Trend",
    enableSorting: true,
    cell: (info) => {
      const trend = info.getValue();
      const color = trendColor(trend);
      return (
        <span
          style={{
            display: "inline-block",
            fontSize: 11,
            fontWeight: 700,
            padding: "2px 10px",
            borderRadius: 9999,
            background: `${color}1a`,
            color,
            border: `1px solid ${color}33`,
            textTransform: "capitalize",
            letterSpacing: "0.02em",
            lineHeight: "18px",
            whiteSpace: "nowrap",
          }}
        >
          {trendLabel(trend)}
        </span>
      );
    },
  }),

  col.accessor("tier", {
    header: "Tier",
    enableSorting: true,
    cell: (info) => {
      const tier = info.getValue();
      const color = TIER_COLOR[tier];
      return (
        <span
          style={{
            display: "inline-block",
            fontSize: 11,
            fontWeight: 700,
            padding: "2px 10px",
            borderRadius: 9999,
            background: `${color}1a`,
            color,
            border: `1px solid ${color}33`,
            letterSpacing: "0.02em",
            lineHeight: "18px",
            whiteSpace: "nowrap",
          }}
        >
          {TIER_LABEL[tier]}
        </span>
      );
    },
    filterFn: (row, _columnId, filterValue) => {
      if (!filterValue || filterValue === "__all__") return true;
      return row.original.tier === filterValue;
    },
  }),
];

/* ------------------------------------------------------------------ */
/*  BoroughTable                                                       */
/* ------------------------------------------------------------------ */

export function BoroughTable() {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [globalFilter, setGlobalFilter] = useState("");
  const [activeTier, setActiveTier] = useState<string>("__all__");

  const data = useMemo(() => BOROUGHS, []);

  const table = useReactTable({
    data,
    columns,
    state: { sorting, columnFilters, globalFilter },
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onGlobalFilterChange: setGlobalFilter,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    globalFilterFn: (row, _columnId, filterValue) => {
      if (!filterValue) return true;
      return row.original.name
        .toLowerCase()
        .includes((filterValue as string).toLowerCase());
    },
  });

  function handleTierFilter(tier: string) {
    setActiveTier(tier);
    const tierColumn = table.getColumn("tier");
    if (tierColumn) {
      tierColumn.setFilterValue(tier === "__all__" ? undefined : tier);
    }
  }

  return (
    <div>
      {/* ── Toolbar: search + tier pills ── */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 16,
          marginBottom: 20,
        }}
      >
        {/* Search input */}
        <div style={{ position: "relative", maxWidth: 320 }}>
          <svg
            width="15"
            height="15"
            viewBox="0 0 24 24"
            fill="none"
            stroke="var(--gray-7)"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            style={{
              position: "absolute",
              left: 12,
              top: "50%",
              transform: "translateY(-50%)",
              pointerEvents: "none",
            }}
          >
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            type="text"
            placeholder="Search boroughs..."
            value={globalFilter}
            onChange={(e) => setGlobalFilter(e.target.value)}
            style={{
              width: "100%",
              padding: "8px 12px 8px 36px",
              borderRadius: 10,
              border: "1px solid rgba(255,255,255,0.08)",
              background: "rgba(255,255,255,0.04)",
              color: "var(--gray-12)",
              fontSize: 13,
              outline: "none",
              transition: "border-color 0.2s ease",
              backdropFilter: "blur(8px)",
            }}
            onFocus={(e) =>
              (e.currentTarget.style.borderColor = "var(--accent-9)")
            }
            onBlur={(e) =>
              (e.currentTarget.style.borderColor = "rgba(255,255,255,0.08)")
            }
          />
        </div>

        {/* Tier filter pills */}
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {ALL_TIERS.map((tier) => {
            const isActive = activeTier === tier;
            const label = tier === "__all__" ? "All" : TIER_LABEL[tier];
            const dotColor = tier !== "__all__" ? TIER_COLOR[tier] : undefined;

            return (
              <button
                key={tier}
                onClick={() => handleTierFilter(tier)}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                  padding: "6px 16px",
                  borderRadius: 99,
                  border: "1px solid",
                  borderColor: isActive
                    ? "var(--accent-9)"
                    : "rgba(255,255,255,0.08)",
                  background: isActive
                    ? "var(--accent-3)"
                    : "rgba(255,255,255,0.04)",
                  color: isActive ? "var(--accent-11)" : "var(--gray-10)",
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: "pointer",
                  transition: "all 0.2s ease",
                  backdropFilter: "blur(8px)",
                  lineHeight: 1,
                }}
              >
                {dotColor && (
                  <span
                    style={{
                      width: 7,
                      height: 7,
                      borderRadius: "50%",
                      background: dotColor,
                      flexShrink: 0,
                    }}
                  />
                )}
                {label}
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Table ── */}
      <div
        style={{
          overflowX: "auto",
          borderRadius: 12,
          border: "1px solid rgba(255,255,255,0.06)",
          background: "rgba(255,255,255,0.02)",
        }}
      >
        <table
          style={{
            width: "100%",
            borderCollapse: "collapse",
            fontSize: 13,
            minWidth: 900,
          }}
        >
          <thead>
            {table.getHeaderGroups().map((hg) => (
              <tr key={hg.id}>
                {hg.headers.map((header) => {
                  const canSort = header.column.getCanSort();
                  const sorted = header.column.getIsSorted();
                  const meta = header.column.columnDef.meta as
                    | { align?: "left" | "right" }
                    | undefined;
                  const align = meta?.align ?? "left";

                  return (
                    <th
                      key={header.id}
                      onClick={canSort ? header.column.getToggleSortingHandler() : undefined}
                      style={{
                        position: "sticky",
                        top: 0,
                        zIndex: 2,
                        textAlign: align,
                        padding: "10px 14px",
                        fontSize: 10,
                        fontWeight: 700,
                        textTransform: "uppercase",
                        letterSpacing: "0.06em",
                        color: "var(--gray-8)",
                        background: "rgba(15,15,15,0.95)",
                        backdropFilter: "blur(8px)",
                        borderBottom: "1px solid rgba(255,255,255,0.06)",
                        whiteSpace: "nowrap",
                        cursor: canSort ? "pointer" : "default",
                        userSelect: "none",
                        transition: "color 0.15s ease",
                      }}
                      onMouseEnter={(e) => {
                        if (canSort) e.currentTarget.style.color = "var(--gray-11)";
                      }}
                      onMouseLeave={(e) => {
                        if (canSort) e.currentTarget.style.color = "var(--gray-8)";
                      }}
                    >
                      <span
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 4,
                        }}
                      >
                        {flexRender(
                          header.column.columnDef.header,
                          header.getContext(),
                        )}
                        {canSort && (
                          <span
                            style={{
                              fontSize: 10,
                              opacity: sorted ? 1 : 0.3,
                              transition: "opacity 0.15s ease",
                            }}
                          >
                            {sorted === "asc"
                              ? "\u25B2"
                              : sorted === "desc"
                                ? "\u25BC"
                                : "\u25B2"}
                          </span>
                        )}
                      </span>
                    </th>
                  );
                })}
              </tr>
            ))}
          </thead>

          <tbody>
            {table.getRowModel().rows.map((row, rowIdx) => (
              <tr
                key={row.id}
                style={{
                  background:
                    rowIdx % 2 === 0
                      ? "rgba(255,255,255,0.02)"
                      : "transparent",
                  transition: "background 0.15s ease",
                }}
                onMouseEnter={(e) =>
                  (e.currentTarget.style.background = "rgba(255,255,255,0.04)")
                }
                onMouseLeave={(e) =>
                  (e.currentTarget.style.background =
                    rowIdx % 2 === 0
                      ? "rgba(255,255,255,0.02)"
                      : "transparent")
                }
              >
                {row.getVisibleCells().map((cell) => {
                  const meta = cell.column.columnDef.meta as
                    | { align?: "left" | "right" }
                    | undefined;
                  const align = meta?.align ?? "left";

                  return (
                    <td
                      key={cell.id}
                      style={{
                        textAlign: align,
                        padding: "10px 14px",
                        borderBottom: "1px solid rgba(255,255,255,0.03)",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext(),
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}

            {table.getRowModel().rows.length === 0 && (
              <tr>
                <td
                  colSpan={columns.length}
                  style={{
                    textAlign: "center",
                    padding: "32px 16px",
                    color: "var(--gray-7)",
                    fontSize: 13,
                  }}
                >
                  No boroughs match the current filters.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Row count */}
      <div
        style={{
          marginTop: 10,
          fontSize: 11,
          color: "var(--gray-7)",
          fontVariantNumeric: "tabular-nums",
        }}
      >
        {table.getRowModel().rows.length} of {data.length} boroughs
      </div>
    </div>
  );
}
