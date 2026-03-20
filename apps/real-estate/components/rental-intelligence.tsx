"use client";

import { Badge, Box, Flex, Text } from "@radix-ui/themes";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

type RentalComparable = {
  title: string;
  monthly_rent_eur: number;
  size_m2: number | null;
  rent_per_m2: number | null;
  rooms: number | null;
  zone: string | null;
  url: string | null;
};

type RentalMarketData = {
  avg_rent: number;
  median_rent: number;
  min_rent: number;
  max_rent: number;
  sample_count: number;
  rent_per_m2_avg: number | null;
  comparables: RentalComparable[];
};

type ValidatedYield = {
  gross_yield_pct: number;
  net_yield_pct: number;
  market_rent: number;
  llm_estimate: number | null;
  rent_confidence: string;
};

const S = {
  glass: {
    background: "rgba(255,255,255,0.025)",
    border: "1px solid rgba(255,255,255,0.06)",
    borderRadius: 16,
    padding: "24px 28px",
  },
  secLabel: {
    fontSize: 11,
    fontWeight: 700,
    textTransform: "uppercase" as const,
    letterSpacing: "0.1em",
    color: "var(--gray-8)",
    marginBottom: 16,
  } as React.CSSProperties,
  metricTile: {
    textAlign: "center" as const,
    padding: "14px 10px",
    borderRadius: 12,
    background: "rgba(255,255,255,0.03)",
    border: "1px solid rgba(255,255,255,0.05)",
  },
  metricLabel: {
    fontSize: 10,
    fontWeight: 600,
    textTransform: "uppercase" as const,
    letterSpacing: "0.08em",
    color: "var(--gray-8)",
    marginBottom: 6,
  } as React.CSSProperties,
  metricValue: {
    fontSize: 22,
    fontWeight: 800,
    letterSpacing: "-0.02em",
    fontVariantNumeric: "tabular-nums" as const,
    lineHeight: 1.1,
  } as React.CSSProperties,
  metricSub: { fontSize: 11, color: "var(--gray-8)", marginTop: 4 },
};

const CONFIDENCE_COLOR: Record<string, "green" | "orange" | "red"> = {
  high: "green",
  medium: "orange",
  low: "red",
};

const tooltipStyle = {
  backgroundColor: "rgba(20,20,30,0.95)",
  border: "1px solid rgba(255,255,255,0.1)",
  borderRadius: 10,
  padding: "10px 14px",
  fontSize: 12,
};

export function RentalIntelligence({
  rentalData,
  validatedYield,
  purchasePrice,
}: {
  rentalData: RentalMarketData | null;
  validatedYield: ValidatedYield | null;
  purchasePrice: number | null;
}) {
  if (!rentalData) return null;

  const rentRange = rentalData.max_rent - rentalData.min_rent;
  const medianPct =
    rentRange > 0
      ? ((rentalData.median_rent - rentalData.min_rent) / rentRange) * 100
      : 50;

  // Build rent/m2 distribution for chart
  const rentPerM2Data = rentalData.comparables
    .filter((c) => c.rent_per_m2 != null)
    .map((c, i) => ({
      name: c.zone || `#${i + 1}`,
      "Rent/m\u00B2": c.rent_per_m2,
    }));

  return (
    <Flex direction="column" gap="4">
      {/* Header with confidence */}
      <div style={S.glass}>
        <Flex justify="between" align="center" mb="4">
          <div style={S.secLabel}>Rental Market Intelligence</div>
          {validatedYield && (
            <Badge
              size="1"
              variant="soft"
              color={CONFIDENCE_COLOR[validatedYield.rent_confidence] ?? "gray"}
            >
              {validatedYield.rent_confidence} confidence (
              {rentalData.sample_count} comps)
            </Badge>
          )}
        </Flex>

        {/* Main metrics */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(130px, 1fr))",
            gap: 10,
            marginBottom: 20,
          }}
        >
          <div style={S.metricTile}>
            <div style={S.metricLabel}>Median Rent</div>
            <div style={{ ...S.metricValue, color: "var(--green-9)" }}>
              {"\u20AC"}{rentalData.median_rent.toLocaleString()}
            </div>
            <div style={S.metricSub}>per month</div>
          </div>
          <div style={S.metricTile}>
            <div style={S.metricLabel}>Average Rent</div>
            <div style={S.metricValue}>
              {"\u20AC"}{rentalData.avg_rent.toLocaleString()}
            </div>
            <div style={S.metricSub}>per month</div>
          </div>
          {rentalData.rent_per_m2_avg != null && (
            <div style={S.metricTile}>
              <div style={S.metricLabel}>Avg Rent/m{"\u00B2"}</div>
              <div style={S.metricValue}>
                {"\u20AC"}{rentalData.rent_per_m2_avg.toFixed(1)}
              </div>
              <div style={S.metricSub}>per month</div>
            </div>
          )}
          <div style={S.metricTile}>
            <div style={S.metricLabel}>Sample Size</div>
            <div style={S.metricValue}>{rentalData.sample_count}</div>
            <div style={S.metricSub}>comparables</div>
          </div>
        </div>

        {/* Rent range bar */}
        <Box mb="4">
          <Text size="1" color="gray" weight="bold" mb="2" style={{ display: "block", textTransform: "uppercase", letterSpacing: "0.06em" }}>
            Rent Range
          </Text>
          <div
            style={{
              position: "relative",
              height: 12,
              background: "var(--gray-3)",
              borderRadius: 6,
            }}
          >
            <div
              style={{
                position: "absolute",
                left: 0,
                right: 0,
                top: 0,
                bottom: 0,
                background:
                  "linear-gradient(90deg, var(--green-5), var(--iris-5), var(--red-5))",
                borderRadius: 6,
                opacity: 0.5,
              }}
            />
            <div
              style={{
                position: "absolute",
                left: `${medianPct}%`,
                top: -3,
                width: 4,
                height: 18,
                background: "var(--green-9)",
                borderRadius: 2,
                transform: "translateX(-50%)",
              }}
              title={`Median: \u20AC${rentalData.median_rent}/mo`}
            />
          </div>
          <Flex justify="between" mt="1">
            <Text size="1" color="gray">
              {"\u20AC"}{rentalData.min_rent}
            </Text>
            <Text
              size="1"
              color="gray"
              style={{ fontSize: 10, opacity: 0.7 }}
            >
              median {"\u20AC"}{rentalData.median_rent}/mo
            </Text>
            <Text size="1" color="gray">
              {"\u20AC"}{rentalData.max_rent}
            </Text>
          </Flex>
        </Box>

        {/* LLM vs Market comparison */}
        {validatedYield && validatedYield.llm_estimate != null && (
          <Box
            mb="3"
            style={{
              padding: "14px 16px",
              borderRadius: 10,
              background: "rgba(255,255,255,0.03)",
              border: "1px solid rgba(255,255,255,0.06)",
            }}
          >
            <Flex justify="between" align="center">
              <Flex direction="column" gap="1" style={{ flex: 1 }}>
                <Text
                  size="1"
                  color="gray"
                  weight="bold"
                  style={{ textTransform: "uppercase", letterSpacing: "0.06em" }}
                >
                  LLM Estimate
                </Text>
                <Text size="4" weight="bold">
                  {"\u20AC"}{validatedYield.llm_estimate.toLocaleString()}/mo
                </Text>
              </Flex>
              <div
                style={{
                  width: 1,
                  height: 40,
                  background: "rgba(255,255,255,0.08)",
                  margin: "0 16px",
                }}
              />
              <Flex direction="column" gap="1" style={{ flex: 1 }}>
                <Text
                  size="1"
                  color="gray"
                  weight="bold"
                  style={{ textTransform: "uppercase", letterSpacing: "0.06em" }}
                >
                  Market Data
                </Text>
                <Text size="4" weight="bold" style={{ color: "var(--green-9)" }}>
                  {"\u20AC"}{validatedYield.market_rent.toLocaleString()}/mo
                </Text>
              </Flex>
            </Flex>
            {(() => {
              const diff =
                validatedYield.market_rent - validatedYield.llm_estimate!;
              const pct =
                validatedYield.llm_estimate! > 0
                  ? ((diff / validatedYield.llm_estimate!) * 100).toFixed(1)
                  : "0";
              return diff !== 0 ? (
                <Flex mt="2" justify="center">
                  <Badge
                    size="1"
                    variant="soft"
                    color={diff > 0 ? "green" : "red"}
                  >
                    Market is {diff > 0 ? "+" : ""}
                    {"\u20AC"}{diff} ({diff > 0 ? "+" : ""}
                    {pct}%) vs LLM
                  </Badge>
                </Flex>
              ) : null;
            })()}
          </Box>
        )}
      </div>

      {/* Validated yield */}
      {validatedYield && (
        <div style={S.glass}>
          <div style={S.secLabel}>Validated Yield</div>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))",
              gap: 10,
            }}
          >
            <div style={S.metricTile}>
              <div style={S.metricLabel}>Gross Yield</div>
              <div
                style={{
                  ...S.metricValue,
                  color:
                    validatedYield.gross_yield_pct > 6
                      ? "var(--green-9)"
                      : validatedYield.gross_yield_pct > 4
                        ? "var(--amber-9)"
                        : "var(--red-9)",
                }}
              >
                {validatedYield.gross_yield_pct.toFixed(1)}%
              </div>
              <div style={S.metricSub}>annual</div>
            </div>
            <div style={S.metricTile}>
              <div style={S.metricLabel}>Net Yield</div>
              <div
                style={{
                  ...S.metricValue,
                  color:
                    validatedYield.net_yield_pct > 5
                      ? "var(--green-9)"
                      : validatedYield.net_yield_pct > 3
                        ? "var(--amber-9)"
                        : "var(--red-9)",
                }}
              >
                {validatedYield.net_yield_pct.toFixed(1)}%
              </div>
              <div style={S.metricSub}>after expenses</div>
            </div>
            <div style={S.metricTile}>
              <div style={S.metricLabel}>Market Rent</div>
              <div style={S.metricValue}>
                {"\u20AC"}{validatedYield.market_rent.toLocaleString()}
              </div>
              <div style={S.metricSub}>monthly median</div>
            </div>
          </div>
        </div>
      )}

      {/* Rent/m2 distribution chart */}
      {rentPerM2Data.length > 2 && (
        <div style={S.glass}>
          <div style={S.secLabel}>
            Rent per m{"\u00B2"} Distribution
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={rentPerM2Data}>
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="rgba(255,255,255,0.06)"
              />
              <XAxis
                dataKey="name"
                tick={{ fill: "var(--gray-8)", fontSize: 10 }}
                axisLine={{ stroke: "rgba(255,255,255,0.06)" }}
                interval={0}
                angle={-30}
                textAnchor="end"
                height={50}
              />
              <YAxis
                tick={{ fill: "var(--gray-8)", fontSize: 11 }}
                axisLine={{ stroke: "rgba(255,255,255,0.06)" }}
              />
              <Tooltip
                contentStyle={tooltipStyle}
                formatter={(v) => `\u20AC${Number(v).toFixed(1)}/m\u00B2`}
              />
              <Bar
                dataKey="Rent/m\u00B2"
                fill="var(--iris-9)"
                radius={[4, 4, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Comparables list */}
      {rentalData.comparables.length > 0 && (
        <div style={S.glass}>
          <div style={S.secLabel}>
            Rental Comparables ({rentalData.comparables.length})
          </div>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))",
              gap: 10,
            }}
          >
            {rentalData.comparables.map((c, i) => (
              <RentalCompCard key={i} comp={c} />
            ))}
          </div>
        </div>
      )}
    </Flex>
  );
}

function RentalCompCard({ comp }: { comp: RentalComparable }) {
  const inner = (
    <Box
      p="3"
      style={{
        border: "1px solid rgba(255,255,255,0.06)",
        borderRadius: 12,
        background: "rgba(255,255,255,0.025)",
        height: "100%",
        transition: "border-color 0.2s, box-shadow 0.2s",
      }}
    >
      <Text
        size="1"
        color="gray"
        as="p"
        mb="1"
        style={{
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
        }}
      >
        {comp.title || "\u2014"}
      </Text>
      <Text size="4" weight="bold" as="p" style={{ color: "var(--green-9)" }}>
        {"\u20AC"}{comp.monthly_rent_eur.toLocaleString()}/mo
      </Text>
      <Flex gap="2" align="center" mt="1" wrap="wrap">
        {comp.size_m2 != null && (
          <Text size="1" color="gray">
            {comp.size_m2} m{"\u00B2"}
          </Text>
        )}
        {comp.rooms != null && (
          <Badge size="1" variant="soft" color="gray">
            {comp.rooms}R
          </Badge>
        )}
        {comp.rent_per_m2 != null && (
          <Text size="1" color="gray">
            {"\u20AC"}{comp.rent_per_m2.toFixed(1)}/m{"\u00B2"}
          </Text>
        )}
      </Flex>
      {comp.zone && (
        <Text
          size="1"
          color="gray"
          as="p"
          mt="1"
          style={{ opacity: 0.7 }}
        >
          {comp.zone}
        </Text>
      )}
    </Box>
  );
  return comp.url ? (
    <a
      href={comp.url}
      target="_blank"
      rel="noopener noreferrer"
      style={{ textDecoration: "none", color: "inherit" }}
    >
      {inner}
    </a>
  ) : (
    inner
  );
}
