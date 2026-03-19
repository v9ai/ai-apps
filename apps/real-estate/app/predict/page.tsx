"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Badge,
  Box,
  Button,
  Card,
  Flex,
  Heading,
  Select,
  Separator,
  Text,
  TextField,
} from "@radix-ui/themes";

/* ------------------------------------------------------------------ */
/*  Types matching LondonPredictionResponse from predict_london.py     */
/* ------------------------------------------------------------------ */

type ScoreBreakdown = {
  location_score: number;
  size_score: number;
  condition_score: number;
  transport_score: number;
};

type Prediction = {
  estimated_price_gbp: number;
  price_per_sqft: number;
  price_per_m2: number;
  confidence: number;
  price_low_gbp: number;
  price_high_gbp: number;
  borough: string;
  zone_transport: string | null;
  rental_estimate_monthly_gbp: number;
  rental_yield_gross_pct: number;
  rental_yield_net_pct: number;
  investment_score: number;
  score_breakdown: ScoreBreakdown;
  recommendation: "strong_buy" | "buy" | "hold" | "avoid";
  appreciation_pct_1y: number;
  appreciation_pct_5y: number;
  price_trend: "rising" | "stable" | "declining";
  borough_avg_price_per_m2: number;
  borough_median_price: number;
  reasoning: string;
  key_factors: string[];
  opportunity_factors: string[];
  risk_factors: string[];
  market_context: string;
  stamp_duty_gbp: number;
  total_acquisition_cost_gbp: number;
  price_to_rent_ratio: number;
  breakeven_years: number;
};

type Result = {
  postcode: string;
  property_type: string;
  bedrooms: number;
  size_sqft: number | null;
  size_m2: number | null;
  prediction: Prediction;
};

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */

const ANALYZER_URL =
  process.env.NEXT_PUBLIC_ANALYZER_URL ?? "http://localhost:8005";

const REC_COLOR: Record<string, "green" | "teal" | "orange" | "red"> = {
  strong_buy: "green",
  buy: "teal",
  hold: "orange",
  avoid: "red",
};
const REC_LABEL: Record<string, string> = {
  strong_buy: "Strong Buy",
  buy: "Buy",
  hold: "Hold",
  avoid: "Avoid",
};

const TREND_COLOR: Record<string, "green" | "blue" | "red"> = {
  rising: "green",
  stable: "blue",
  declining: "red",
};
const TREND_LABEL: Record<string, string> = {
  rising: "Rising",
  stable: "Stable",
  declining: "Declining",
};

/* ------------------------------------------------------------------ */
/*  Small reusable components                                          */
/* ------------------------------------------------------------------ */

function ScoreBar({ label, value }: { label: string; value: number }) {
  const color =
    value >= 7
      ? "var(--green-9)"
      : value >= 5
        ? "var(--amber-9)"
        : "var(--red-9)";
  return (
    <Flex direction="column" gap="1">
      <Flex justify="between">
        <Text size="1" color="gray">
          {label}
        </Text>
        <Text size="1" weight="bold">
          {value.toFixed(1)}
        </Text>
      </Flex>
      <Box
        style={{
          height: 4,
          background: "var(--gray-4)",
          borderRadius: 2,
        }}
      >
        <Box
          style={{
            width: `${value * 10}%`,
            height: "100%",
            background: color,
            borderRadius: 2,
            transition: "width 0.6s ease",
          }}
        />
      </Box>
    </Flex>
  );
}

function ConfidenceRing({ confidence }: { confidence: number }) {
  const pct = Math.round(confidence * 100);
  const radius = 38;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (confidence * circumference);
  const color =
    pct >= 80
      ? "var(--green-9)"
      : pct >= 65
        ? "var(--amber-9)"
        : "var(--red-9)";

  return (
    <Box style={{ position: "relative", width: 96, height: 96 }}>
      <svg width="96" height="96" viewBox="0 0 96 96">
        <circle
          cx="48"
          cy="48"
          r={radius}
          fill="none"
          stroke="var(--gray-4)"
          strokeWidth="6"
        />
        <circle
          cx="48"
          cy="48"
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth="6"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          transform="rotate(-90 48 48)"
          style={{ transition: "stroke-dashoffset 0.8s ease" }}
        />
      </svg>
      <Flex
        align="center"
        justify="center"
        direction="column"
        style={{
          position: "absolute",
          inset: 0,
        }}
      >
        <Text size="5" weight="bold" style={{ fontVariantNumeric: "tabular-nums" }}>
          {pct}%
        </Text>
        <Text size="1" color="gray">
          confidence
        </Text>
      </Flex>
    </Box>
  );
}

function PriceRangeBar({
  low,
  mid,
  high,
  boroughAvg,
}: {
  low: number;
  mid: number;
  high: number;
  boroughAvg: number;
}) {
  const min = Math.min(low, boroughAvg) * 0.92;
  const max = Math.max(high, boroughAvg) * 1.08;
  const range = max - min || 1;
  const pct = (v: number) =>
    Math.min(100, Math.max(0, ((v - min) / range) * 100));

  return (
    <Box>
      <Flex justify="between" mb="1">
        <Text size="1" color="gray">
          {"\u00A3"}{low.toLocaleString()}
        </Text>
        <Text size="1" color="gray">
          {"\u00A3"}{high.toLocaleString()}
        </Text>
      </Flex>
      <Box
        style={{
          position: "relative",
          height: 12,
          background: "var(--gray-3)",
          borderRadius: 6,
          overflow: "visible",
        }}
      >
        {/* Range band */}
        <Box
          style={{
            position: "absolute",
            left: `${pct(low)}%`,
            width: `${pct(high) - pct(low)}%`,
            top: 0,
            bottom: 0,
            background: "var(--accent-5)",
            borderRadius: 6,
          }}
        />
        {/* Borough average marker */}
        <Box
          style={{
            position: "absolute",
            left: `${pct(boroughAvg)}%`,
            top: -3,
            width: 3,
            height: 18,
            background: "var(--gray-9)",
            borderRadius: 2,
            transform: "translateX(-50%)",
          }}
          title={`Borough avg: \u00A3${boroughAvg.toLocaleString()}`}
        />
        {/* Predicted price marker */}
        <Box
          style={{
            position: "absolute",
            left: `${pct(mid)}%`,
            top: -4,
            width: 5,
            height: 20,
            background: "var(--accent-9)",
            borderRadius: 3,
            transform: "translateX(-50%)",
            boxShadow: "0 0 8px var(--accent-7)",
          }}
          title={`Predicted: \u00A3${mid.toLocaleString()}`}
        />
      </Box>
      <Flex justify="between" mt="1">
        <Text size="1" color="gray">Low estimate</Text>
        <Text size="1" color="gray">High estimate</Text>
      </Flex>
    </Box>
  );
}

/* ------------------------------------------------------------------ */
/*  Page component                                                     */
/* ------------------------------------------------------------------ */

export default function PredictPage() {
  // Form state
  const [postcode, setPostcode] = useState("");
  const [propertyType, setPropertyType] = useState("flat");
  const [bedrooms, setBedrooms] = useState("2");
  const [bathrooms, setBathrooms] = useState("1");
  const [sizeSqm, setSizeSqm] = useState("");
  const [yearBuilt, setYearBuilt] = useState("");
  const [floor, setFloor] = useState("");
  const [tenure, setTenure] = useState("leasehold");
  const [condition, setCondition] = useState("good");
  const [epcRating, setEpcRating] = useState("none");
  const [hasGarden, setHasGarden] = useState(false);
  const [hasParking, setHasParking] = useState(false);
  const [hasBalcony, setHasBalcony] = useState(false);

  // Result state
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<Result | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!postcode.trim()) return;

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const body: Record<string, unknown> = {
        postcode: postcode.trim().toUpperCase(),
        property_type: propertyType,
        bedrooms: parseInt(bedrooms),
        bathrooms: parseInt(bathrooms),
        condition,
        tenure: tenure || undefined,
        has_garden: hasGarden || undefined,
        has_parking: hasParking || undefined,
        has_balcony: hasBalcony || undefined,
        epc_rating: epcRating !== "none" ? epcRating : undefined,
      };
      if (sizeSqm) body.size_m2 = parseFloat(sizeSqm);
      if (yearBuilt) body.year_built = parseInt(yearBuilt);
      if (floor) body.floor = parseInt(floor);

      const res = await fetch(`${ANALYZER_URL}/predict/london`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const detail = await res.json().catch(() => null);
        throw new Error(detail?.detail || `Server returned ${res.status}`);
      }

      const data: Result = await res.json();
      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Prediction failed");
    } finally {
      setLoading(false);
    }
  }

  const p = result?.prediction;

  return (
    <div>
      {/* ---- Topbar ---- */}
      <div className="yc-topbar">
        <Link href="/">
          <span className="yc-topbar-logo" />
          PropertyAI
        </Link>
        <Link href="/analyzer">
          <span style={{ fontSize: 12, opacity: 0.8 }}>Analyzer</span>
        </Link>
        <Link href="/dashboard">
          <span style={{ fontSize: 12, opacity: 0.8 }}>Dashboard</span>
        </Link>
        <Link href="/trends">
          <span style={{ fontSize: 12, opacity: 0.8 }}>Trends</span>
        </Link>
        <Link href="/predict">
          <span style={{ fontSize: 12, fontWeight: 600 }}>Predict</span>
        </Link>
        <Link href="/portfolio">
          <span style={{ fontSize: 12, opacity: 0.8 }}>Portfolio</span>
        </Link>
        <span className="yc-topbar-count">London</span>
      </div>

      {/* ---- Hero ---- */}
      <section className="hero">
        <div className="hero-glow" />
        <div className="hero-grid-bg" />
        <div className="hero-blob-pink" />
        <div className="hero-content">
          <p className="hero-kicker">AI-Powered Valuation</p>
          <h1 className="hero-title">
            London Property{" "}
            <span className="hero-title-accent">Price Predictor</span>
          </h1>
          <p className="hero-subtitle">
            Enter property details and get an instant AI valuation powered by
            DeepSeek hedonic pricing models, 2025-2026 Land Registry data, and
            33 borough-level market benchmarks.
          </p>
          <div className="hero-stats">
            <div className="hero-stat">
              <span className="hero-stat-number">33</span>
              <span className="hero-stat-label">Boroughs</span>
            </div>
            <div className="hero-stat">
              <span className="hero-stat-number">6</span>
              <span className="hero-stat-label">Zones</span>
            </div>
            <div className="hero-stat">
              <span className="hero-stat-number">12+</span>
              <span className="hero-stat-label">Factors</span>
            </div>
          </div>
        </div>
        <div className="hero-bottom-line" />
      </section>

      {/* ---- Main content ---- */}
      <Box px="5" py="6" style={{ maxWidth: 1020, margin: "0 auto" }}>
        {/* ---- Input Form ---- */}
        <Card mb="5">
          <Heading size="4" mb="4">
            Property Details
          </Heading>
          <form onSubmit={handleSubmit}>
            <Flex direction="column" gap="4">
              {/* Row 1: core fields */}
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr 1fr",
                  gap: 16,
                }}
              >
                <Box>
                  <Text size="1" color="gray" mb="1" as="label" htmlFor="pc">
                    Postcode *
                  </Text>
                  <TextField.Root
                    id="pc"
                    placeholder="e.g. E14 9SH or SW1A"
                    value={postcode}
                    onChange={(e) => setPostcode(e.target.value)}
                    required
                  />
                </Box>
                <Box>
                  <Text size="1" color="gray" mb="1" as="label">
                    Property type
                  </Text>
                  <Select.Root
                    value={propertyType}
                    onValueChange={setPropertyType}
                  >
                    <Select.Trigger style={{ width: "100%" }} />
                    <Select.Content>
                      <Select.Item value="flat">Flat</Select.Item>
                      <Select.Item value="terraced">
                        Terraced house
                      </Select.Item>
                      <Select.Item value="semi_detached">
                        Semi-detached
                      </Select.Item>
                      <Select.Item value="detached">Detached</Select.Item>
                      <Select.Item value="maisonette">Maisonette</Select.Item>
                    </Select.Content>
                  </Select.Root>
                </Box>
                <Box>
                  <Text size="1" color="gray" mb="1" as="label">
                    Bedrooms
                  </Text>
                  <Select.Root value={bedrooms} onValueChange={setBedrooms}>
                    <Select.Trigger style={{ width: "100%" }} />
                    <Select.Content>
                      <Select.Item value="0">Studio</Select.Item>
                      <Select.Item value="1">1 bed</Select.Item>
                      <Select.Item value="2">2 bed</Select.Item>
                      <Select.Item value="3">3 bed</Select.Item>
                      <Select.Item value="4">4 bed</Select.Item>
                      <Select.Item value="5">5 bed</Select.Item>
                      <Select.Item value="6">6 bed</Select.Item>
                    </Select.Content>
                  </Select.Root>
                </Box>
              </div>

              {/* Row 2: size, year, floor, bathrooms */}
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr 1fr 1fr",
                  gap: 16,
                }}
              >
                <Box>
                  <Text size="1" color="gray" mb="1" as="label">
                    Floor area (m{"\u00B2"})
                  </Text>
                  <TextField.Root
                    placeholder="e.g. 65"
                    value={sizeSqm}
                    onChange={(e) => setSizeSqm(e.target.value)}
                    type="number"
                  />
                </Box>
                <Box>
                  <Text size="1" color="gray" mb="1" as="label">
                    Year built
                  </Text>
                  <TextField.Root
                    placeholder="e.g. 1920"
                    value={yearBuilt}
                    onChange={(e) => setYearBuilt(e.target.value)}
                    type="number"
                  />
                </Box>
                <Box>
                  <Text size="1" color="gray" mb="1" as="label">
                    Floor level
                  </Text>
                  <TextField.Root
                    placeholder="e.g. 3"
                    value={floor}
                    onChange={(e) => setFloor(e.target.value)}
                    type="number"
                  />
                </Box>
                <Box>
                  <Text size="1" color="gray" mb="1" as="label">
                    Bathrooms
                  </Text>
                  <Select.Root value={bathrooms} onValueChange={setBathrooms}>
                    <Select.Trigger style={{ width: "100%" }} />
                    <Select.Content>
                      <Select.Item value="1">1</Select.Item>
                      <Select.Item value="2">2</Select.Item>
                      <Select.Item value="3">3</Select.Item>
                      <Select.Item value="4">4</Select.Item>
                      <Select.Item value="5">5</Select.Item>
                    </Select.Content>
                  </Select.Root>
                </Box>
              </div>

              {/* Row 3: condition, tenure, EPC */}
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr 1fr",
                  gap: 16,
                }}
              >
                <Box>
                  <Text size="1" color="gray" mb="1" as="label">
                    Condition
                  </Text>
                  <Select.Root value={condition} onValueChange={setCondition}>
                    <Select.Trigger style={{ width: "100%" }} />
                    <Select.Content>
                      <Select.Item value="new_build">
                        New build
                      </Select.Item>
                      <Select.Item value="refurbished">
                        Refurbished
                      </Select.Item>
                      <Select.Item value="good">Good condition</Select.Item>
                      <Select.Item value="needs_work">
                        Needs work
                      </Select.Item>
                      <Select.Item value="unknown">Unknown</Select.Item>
                    </Select.Content>
                  </Select.Root>
                </Box>
                <Box>
                  <Text size="1" color="gray" mb="1" as="label">
                    Tenure
                  </Text>
                  <Select.Root value={tenure} onValueChange={setTenure}>
                    <Select.Trigger style={{ width: "100%" }} />
                    <Select.Content>
                      <Select.Item value="leasehold">Leasehold</Select.Item>
                      <Select.Item value="freehold">Freehold</Select.Item>
                      <Select.Item value="share_of_freehold">
                        Share of freehold
                      </Select.Item>
                    </Select.Content>
                  </Select.Root>
                </Box>
                <Box>
                  <Text size="1" color="gray" mb="1" as="label">
                    EPC Rating
                  </Text>
                  <Select.Root value={epcRating} onValueChange={setEpcRating}>
                    <Select.Trigger style={{ width: "100%" }} />
                    <Select.Content>
                      <Select.Item value="none">Not known</Select.Item>
                      <Select.Item value="A">A</Select.Item>
                      <Select.Item value="B">B</Select.Item>
                      <Select.Item value="C">C</Select.Item>
                      <Select.Item value="D">D</Select.Item>
                      <Select.Item value="E">E</Select.Item>
                      <Select.Item value="F">F</Select.Item>
                      <Select.Item value="G">G</Select.Item>
                    </Select.Content>
                  </Select.Root>
                </Box>
              </div>

              {/* Row 4: checkboxes + submit */}
              <Flex justify="between" align="center" wrap="wrap" gap="4">
                <Flex gap="5">
                  <label
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 6,
                      cursor: "pointer",
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={hasGarden}
                      onChange={(e) => setHasGarden(e.target.checked)}
                    />
                    <Text size="2">Garden</Text>
                  </label>
                  <label
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 6,
                      cursor: "pointer",
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={hasParking}
                      onChange={(e) => setHasParking(e.target.checked)}
                    />
                    <Text size="2">Parking</Text>
                  </label>
                  <label
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 6,
                      cursor: "pointer",
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={hasBalcony}
                      onChange={(e) => setHasBalcony(e.target.checked)}
                    />
                    <Text size="2">Balcony</Text>
                  </label>
                </Flex>
                <Button
                  type="submit"
                  size="3"
                  disabled={loading || !postcode.trim()}
                  style={{ minWidth: 160 }}
                >
                  {loading ? "Predicting..." : "Predict Price"}
                </Button>
              </Flex>
            </Flex>
          </form>
        </Card>

        {/* ---- Loading ---- */}
        {loading && (
          <Flex direction="column" align="center" gap="3" py="9">
            <Box
              style={{
                width: 48,
                height: 48,
                border: "4px solid var(--gray-4)",
                borderTopColor: "var(--accent-9)",
                borderRadius: "50%",
                animation: "spin 0.8s linear infinite",
              }}
            />
            <Text size="3" weight="bold">
              Analyzing property...
            </Text>
            <Text size="2" color="gray">
              Running DeepSeek hedonic pricing model with London market data
            </Text>
            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
          </Flex>
        )}

        {/* ---- Error ---- */}
        {error && !loading && (
          <Card mb="5" style={{ border: "1px solid var(--red-6)" }}>
            <Flex gap="2" align="start">
              <Text color="red" size="2" weight="bold">
                Error:
              </Text>
              <Text color="red" size="2">
                {error}
              </Text>
            </Flex>
          </Card>
        )}

        {/* ---- Results ---- */}
        {p && !loading && (
          <Flex direction="column" gap="4">
            {/* ---- Headline card ---- */}
            <Card>
              <Flex justify="between" align="start" gap="3" mb="4">
                <Box>
                  <Text size="1" color="gray" as="p">
                    {result!.postcode} &middot; {p.borough}
                    {p.zone_transport ? ` &middot; ${p.zone_transport}` : ""}
                  </Text>
                  <Heading size="5">
                    {result!.property_type.replace("_", "-")} &middot;{" "}
                    {result!.bedrooms === 0
                      ? "Studio"
                      : `${result!.bedrooms} bed`}
                    {result!.size_m2 ? ` &middot; ${result!.size_m2} m\u00B2` : ""}
                  </Heading>
                </Box>
                <Flex gap="2" align="center" style={{ flexShrink: 0 }}>
                  <Badge
                    size="2"
                    color={REC_COLOR[p.recommendation]}
                    variant="surface"
                  >
                    {REC_LABEL[p.recommendation]}
                  </Badge>
                </Flex>
              </Flex>

              {/* Price + key stats */}
              <Flex gap="6" wrap="wrap" mb="5" align="end">
                <Box>
                  <Text size="1" color="gray" as="p">
                    Predicted price
                  </Text>
                  <Text
                    size="8"
                    weight="bold"
                    style={{ fontVariantNumeric: "tabular-nums" }}
                  >
                    {"\u00A3"}
                    {p.estimated_price_gbp.toLocaleString()}
                  </Text>
                </Box>
                <Box>
                  <Text size="1" color="gray" as="p">
                    Per sq ft
                  </Text>
                  <Text size="6" weight="bold">
                    {"\u00A3"}
                    {p.price_per_sqft.toLocaleString()}
                  </Text>
                </Box>
                <Box>
                  <Text size="1" color="gray" as="p">
                    Per m{"\u00B2"}
                  </Text>
                  <Text size="6" weight="bold">
                    {"\u00A3"}
                    {p.price_per_m2.toLocaleString()}
                  </Text>
                  <Text size="1" color="gray" as="p">
                    Borough avg: {"\u00A3"}
                    {p.borough_avg_price_per_m2.toLocaleString()}
                  </Text>
                </Box>
                <ConfidenceRing confidence={p.confidence} />
              </Flex>

              {/* Confidence interval bar */}
              <Box mb="4">
                <Text
                  size="1"
                  color="gray"
                  mb="2"
                  as="p"
                  style={{
                    textTransform: "uppercase",
                    letterSpacing: "0.05em",
                  }}
                >
                  Price range
                </Text>
                <PriceRangeBar
                  low={p.price_low_gbp}
                  mid={p.estimated_price_gbp}
                  high={p.price_high_gbp}
                  boroughAvg={p.borough_median_price}
                />
              </Box>

              <Separator mb="4" size="4" />

              {/* Opportunities and Risks */}
              {(p.opportunity_factors.length > 0 ||
                p.risk_factors.length > 0) && (
                <>
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "1fr 1fr",
                      gap: 24,
                      marginBottom: 16,
                    }}
                  >
                    {p.opportunity_factors.length > 0 && (
                      <Box>
                        <Text
                          size="1"
                          color="green"
                          weight="bold"
                          mb="2"
                          as="p"
                          style={{
                            textTransform: "uppercase",
                            letterSpacing: "0.05em",
                          }}
                        >
                          Opportunities
                        </Text>
                        {p.opportunity_factors.map((f, i) => (
                          <Flex key={i} gap="2" mb="1" align="start">
                            <Text
                              size="2"
                              color="green"
                              style={{ flexShrink: 0 }}
                            >
                              +
                            </Text>
                            <Text size="2">{f}</Text>
                          </Flex>
                        ))}
                      </Box>
                    )}
                    {p.risk_factors.length > 0 && (
                      <Box>
                        <Text
                          size="1"
                          color="red"
                          weight="bold"
                          mb="2"
                          as="p"
                          style={{
                            textTransform: "uppercase",
                            letterSpacing: "0.05em",
                          }}
                        >
                          Risks
                        </Text>
                        {p.risk_factors.map((f, i) => (
                          <Flex key={i} gap="2" mb="1" align="start">
                            <Text
                              size="2"
                              color="red"
                              style={{ flexShrink: 0 }}
                            >
                              {"\u2212"}
                            </Text>
                            <Text size="2">{f}</Text>
                          </Flex>
                        ))}
                      </Box>
                    )}
                  </div>
                  <Separator mb="4" size="4" />
                </>
              )}

              {/* Market context */}
              {p.market_context && (
                <Box mb="4">
                  <Flex align="center" gap="2" mb="1">
                    <Text
                      size="1"
                      color="gray"
                      style={{
                        textTransform: "uppercase",
                        letterSpacing: "0.05em",
                      }}
                    >
                      Market Context
                    </Text>
                    <Badge
                      size="1"
                      variant="soft"
                      color={TREND_COLOR[p.price_trend]}
                    >
                      {TREND_LABEL[p.price_trend]}
                    </Badge>
                  </Flex>
                  <Text
                    size="2"
                    as="p"
                    style={{ lineHeight: 1.6 }}
                    color="gray"
                  >
                    {p.market_context}
                  </Text>
                </Box>
              )}

              {/* AI analysis */}
              <Box mb="4">
                <Text
                  size="1"
                  color="gray"
                  mb="1"
                  as="p"
                  style={{
                    textTransform: "uppercase",
                    letterSpacing: "0.05em",
                  }}
                >
                  AI Analysis (DeepSeek)
                </Text>
                <Text size="2" as="p" style={{ lineHeight: 1.7 }}>
                  {p.reasoning}
                </Text>
              </Box>

              {/* Key factors */}
              {p.key_factors.length > 0 && (
                <Flex gap="2" wrap="wrap" mb="4">
                  {p.key_factors.map((f, i) => (
                    <Badge key={i} variant="soft" color="gray" size="1">
                      {f}
                    </Badge>
                  ))}
                </Flex>
              )}

              {/* Score breakdown */}
              <Separator mb="4" size="4" />
              <Flex gap="6" wrap="wrap" align="start">
                <Box style={{ flex: "1 1 300px" }}>
                  <Text
                    size="1"
                    weight="bold"
                    color="gray"
                    mb="2"
                    as="p"
                    style={{
                      textTransform: "uppercase",
                      letterSpacing: "0.05em",
                    }}
                  >
                    Score Breakdown
                  </Text>
                  <Box
                    style={{
                      display: "grid",
                      gridTemplateColumns: "1fr 1fr",
                      gap: "0.75rem",
                    }}
                  >
                    <ScoreBar
                      label="Location"
                      value={p.score_breakdown.location_score}
                    />
                    <ScoreBar
                      label="Transport"
                      value={p.score_breakdown.transport_score}
                    />
                    <ScoreBar
                      label="Size"
                      value={p.score_breakdown.size_score}
                    />
                    <ScoreBar
                      label="Condition"
                      value={p.score_breakdown.condition_score}
                    />
                  </Box>
                </Box>
                <Box style={{ flex: "0 0 auto" }}>
                  <Text
                    size="1"
                    weight="bold"
                    color="gray"
                    mb="2"
                    as="p"
                    style={{
                      textTransform: "uppercase",
                      letterSpacing: "0.05em",
                    }}
                  >
                    Investment Score
                  </Text>
                  <Flex align="baseline" gap="1">
                    <Text
                      size="8"
                      weight="bold"
                      color={
                        p.investment_score >= 7
                          ? "green"
                          : p.investment_score >= 5
                            ? undefined
                            : "red"
                      }
                    >
                      {p.investment_score.toFixed(1)}
                    </Text>
                    <Text size="3" color="gray">
                      /10
                    </Text>
                  </Flex>
                </Box>
              </Flex>
            </Card>

            {/* ---- Investment metrics card ---- */}
            <Card>
              <Heading size="3" mb="4">
                Investment Metrics
              </Heading>
              <Flex gap="6" wrap="wrap" mb="4">
                <Box>
                  <Text size="1" color="gray" as="p">
                    Est. monthly rent
                  </Text>
                  <Text size="5" weight="bold">
                    {"\u00A3"}
                    {p.rental_estimate_monthly_gbp.toLocaleString()}
                  </Text>
                </Box>
                <Box>
                  <Text size="1" color="gray" as="p">
                    Gross yield
                  </Text>
                  <Text
                    size="5"
                    weight="bold"
                    color={
                      p.rental_yield_gross_pct >= 5
                        ? "green"
                        : p.rental_yield_gross_pct >= 4
                          ? undefined
                          : "red"
                    }
                  >
                    {p.rental_yield_gross_pct.toFixed(1)}%
                  </Text>
                </Box>
                <Box>
                  <Text size="1" color="gray" as="p">
                    Net yield
                  </Text>
                  <Text size="5" weight="bold">
                    {p.rental_yield_net_pct.toFixed(1)}%
                  </Text>
                </Box>
                <Box>
                  <Text size="1" color="gray" as="p">
                    Stamp duty (SDLT)
                  </Text>
                  <Text size="5" weight="bold">
                    {"\u00A3"}
                    {p.stamp_duty_gbp.toLocaleString()}
                  </Text>
                </Box>
              </Flex>

              <Separator mb="4" size="4" />

              <Flex direction="column" gap="2" mb="4">
                <Flex justify="between">
                  <Text size="2" color="gray">
                    Total acquisition cost
                  </Text>
                  <Text size="2" weight="bold">
                    {"\u00A3"}
                    {p.total_acquisition_cost_gbp.toLocaleString()}
                  </Text>
                </Flex>
                <Flex justify="between">
                  <Text size="2" color="gray">
                    Price-to-rent ratio
                  </Text>
                  <Text
                    size="2"
                    weight="bold"
                    color={
                      p.price_to_rent_ratio < 15
                        ? "green"
                        : p.price_to_rent_ratio < 20
                          ? undefined
                          : "red"
                    }
                  >
                    {p.price_to_rent_ratio.toFixed(1)}x
                  </Text>
                </Flex>
                <Flex justify="between">
                  <Text size="2" color="gray">
                    Breakeven
                  </Text>
                  <Text size="2" weight="bold">
                    {p.breakeven_years.toFixed(1)} yrs
                  </Text>
                </Flex>
                <Flex justify="between">
                  <Text size="2" color="gray">
                    Est. appreciation (1 year)
                  </Text>
                  <Text
                    size="2"
                    weight="bold"
                    color={p.appreciation_pct_1y >= 4 ? "green" : "gray"}
                  >
                    +{p.appreciation_pct_1y.toFixed(1)}%
                  </Text>
                </Flex>
                <Flex justify="between">
                  <Text size="2" color="gray">
                    Est. appreciation (5 year cumulative)
                  </Text>
                  <Text size="2" weight="bold" color="green">
                    +{p.appreciation_pct_5y.toFixed(1)}%
                  </Text>
                </Flex>
              </Flex>

              <Flex gap="4" wrap="wrap">
                <Flex align="center" gap="2">
                  <Text size="2" color="gray">
                    Price trend
                  </Text>
                  <Badge
                    size="1"
                    variant="soft"
                    color={TREND_COLOR[p.price_trend]}
                  >
                    {TREND_LABEL[p.price_trend]}
                  </Badge>
                </Flex>
                <Flex align="center" gap="2">
                  <Text size="2" color="gray">
                    Borough median
                  </Text>
                  <Text size="2" weight="bold">
                    {"\u00A3"}
                    {p.borough_median_price.toLocaleString()}
                  </Text>
                </Flex>
              </Flex>
            </Card>

            {/* ---- Footer meta ---- */}
            <Flex justify="between" align="center">
              <Text size="1" color="gray">
                {p.borough} &middot; Confidence:{" "}
                {(p.confidence * 100).toFixed(0)}%
              </Text>
              <Text size="1" color="gray">
                Powered by DeepSeek hedonic pricing model
              </Text>
            </Flex>
          </Flex>
        )}
      </Box>

      {/* ---- Footer ---- */}
      <footer className="site-footer">
        <div className="footer-brand">
          <span className="footer-brand-dot" />
          <span className="footer-brand-title">PropertyAI</span>
        </div>
        <p className="footer-tagline">
          AI-powered property intelligence for London and beyond.
        </p>
        <div className="footer-bottom">
          <span>London Market Data 2025-2026</span>
          <span>&middot;</span>
          <span>Land Registry + ONS</span>
          <span>&middot;</span>
          <span>DeepSeek Hedonic Model</span>
        </div>
      </footer>
    </div>
  );
}
