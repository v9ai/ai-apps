"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  Badge,
  Box,
  Button,
  Card,
  Flex,
  Heading,
  Separator,
  Text,
  TextField,
} from "@radix-ui/themes";

const API = "http://localhost:8005";

type Listing = {
  title: string;
  price_eur: number | null;
  size_m2: number | null;
  price_per_m2: number | null;
  rooms: number | null;
  floor: number | null;
  total_floors: number | null;
  zone: string | null;
  city: string;
  condition: string;
  features: string[];
};

type Valuation = {
  verdict: "undervalued" | "fair" | "overvalued";
  confidence: number;
  fair_value_eur_per_m2: number | null;
  price_deviation_pct: number | null;
  reasoning: string;
  key_factors: string[];
};

type ComparableListing = {
  title: string;
  price_eur: number | null;
  size_m2: number | null;
  price_per_m2: number | null;
  rooms: number | null;
  zone: string | null;
  url: string | null;
  source: string;
  deviation_pct: number | null;
};

type ZoneStats = {
  zone: string | null;
  avg_price_per_m2: number | null;
  median_price_per_m2: number | null;
  min_price_per_m2: number | null;
  max_price_per_m2: number | null;
  count: number;
};

type Result = {
  url: string;
  source: string;
  listing: Listing;
  valuation: Valuation;
  analyzed_at: string;
  comparables: ComparableListing[];
  zone_stats: ZoneStats | null;
};

const VERDICT_COLOR: Record<string, "green" | "blue" | "red"> = {
  undervalued: "green",
  fair: "blue",
  overvalued: "red",
};

const VERDICT_LABEL: Record<string, string> = {
  undervalued: "Undervalued",
  fair: "Fair Price",
  overvalued: "Overvalued",
};

const EXAMPLE_LISTING = {
  url: "https://999.md/ro/103528157",
  zone: "Aeroport, Chișinău",
  price_eur: 72_500,
  price_per_m2: 1_421,
  size_m2: 51,
  rooms: 1,
  floor: "3/10",
};

function ZonePriceBar({
  min,
  max,
  avg,
  listing,
}: {
  min: number;
  max: number;
  avg: number | null;
  listing: number | null;
}) {
  const range = max - min || 1;
  const pct = (v: number) => Math.min(100, Math.max(0, ((v - min) / range) * 100));

  return (
    <div style={{ position: "relative", height: 12, background: "var(--gray-3)", borderRadius: 6 }}>
      <div
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          top: 0,
          bottom: 0,
          background: "var(--gray-5)",
          borderRadius: 6,
        }}
      />
      {avg != null && (
        <div
          style={{
            position: "absolute",
            left: `${pct(avg)}%`,
            top: -2,
            width: 3,
            height: 16,
            background: "var(--gray-9)",
            borderRadius: 2,
            transform: "translateX(-50%)",
          }}
          title={`Zone avg: €${avg}/m²`}
        />
      )}
      {listing != null && (
        <div
          style={{
            position: "absolute",
            left: `${pct(listing)}%`,
            top: -3,
            width: 4,
            height: 18,
            background: "var(--iris-9)",
            borderRadius: 2,
            transform: "translateX(-50%)",
          }}
          title={`This listing: €${listing}/m²`}
        />
      )}
    </div>
  );
}

function DeviationBadge({ pct }: { pct: number | null }) {
  if (pct == null) return null;
  const color: "green" | "red" | "gray" = pct < -10 ? "green" : pct > 10 ? "red" : "gray";
  const sign = pct > 0 ? "+" : "";
  return (
    <Badge size="1" color={color} variant="soft">
      {sign}{pct.toFixed(1)}%
    </Badge>
  );
}

function ComparableCard({ comp }: { comp: ComparableListing }) {
  const inner = (
    <Box
      p="3"
      style={{
        border: "1px solid var(--gray-4)",
        borderRadius: 8,
        background: "var(--gray-1)",
        height: "100%",
      }}
    >
      <Text
        size="1"
        color="gray"
        as="p"
        mb="1"
        style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}
      >
        {comp.title || "—"}
      </Text>
      {comp.price_per_m2 != null && (
        <Text size="4" weight="bold" as="p">
          €{comp.price_per_m2.toLocaleString()}/m²
        </Text>
      )}
      <Flex gap="2" align="center" mt="1" wrap="wrap">
        {comp.size_m2 != null && (
          <Text size="1" color="gray">
            {comp.size_m2} m²
          </Text>
        )}
        <DeviationBadge pct={comp.deviation_pct} />
      </Flex>
    </Box>
  );

  return comp.url ? (
    <a href={comp.url} target="_blank" rel="noopener noreferrer" style={{ textDecoration: "none", color: "inherit" }}>
      {inner}
    </a>
  ) : (
    inner
  );
}

export function AnalyzerContent({ initialUrl }: { initialUrl?: string }) {
  const [url, setUrl] = useState(initialUrl ?? "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<Result | null>(null);

  async function analyze(targetUrl?: string) {
    const trimmed = targetUrl ?? url.trim();
    if (!trimmed) return;
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const res = await fetch(`${API}/analyze`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: trimmed }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.detail ?? "Analysis failed");
      }
      const data: Result = await res.json();
      setResult(data);
      // fire-and-forget: persist result
      fetch("/api/save-analysis", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      }).catch(() => {});
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (initialUrl) analyze(initialUrl);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div>
      <div className="yc-topbar">
        <Link href="/">
          <span className="yc-topbar-logo" />
          REAL ESTATE AI RESEARCH
        </Link>
        <Link href="/analyzer">
          <span style={{ fontSize: 13, opacity: 0.7 }}>Price Analyzer</span>
        </Link>
      </div>

      <Box px="5" py="8" style={{ maxWidth: 760, margin: "0 auto" }}>
        <Heading size="7" mb="2">
          Apartment Price Analyzer
        </Heading>
        <Text color="gray" size="2" mb="4" as="p">
          Paste a listing URL from{" "}
          <Text color="iris">999.md</Text> or{" "}
          <Text color="iris">imobiliare.ro</Text> to check if it&apos;s
          undervalued or overvalued.
        </Text>

        <Text size="1" color="gray" mb="2" as="p">Try an example:</Text>
        <Box
          mb="5"
          onClick={() => { setUrl(EXAMPLE_LISTING.url); analyze(EXAMPLE_LISTING.url); }}
          style={{ cursor: "pointer", display: "inline-block" }}
        >
          <Box p="3" style={{ border: "1px solid var(--gray-5)", borderRadius: 8, background: "var(--gray-2)" }}>
            <Text size="2" weight="bold" as="p">{EXAMPLE_LISTING.zone}</Text>
            <Flex gap="3" mt="1" align="center" wrap="wrap">
              <Text size="2">€{EXAMPLE_LISTING.price_eur.toLocaleString()}</Text>
              <Text size="2" color="gray">€{EXAMPLE_LISTING.price_per_m2.toLocaleString()}/m²</Text>
              <Text size="2" color="gray">
                {EXAMPLE_LISTING.rooms} room · {EXAMPLE_LISTING.size_m2} m² · floor {EXAMPLE_LISTING.floor}
              </Text>
              <Badge size="1" variant="soft" color="blue">new build</Badge>
            </Flex>
          </Box>
        </Box>

        <Flex gap="2" mb="6">
          <TextField.Root
            size="3"
            placeholder="https://999.md/ro/... or https://www.imobiliare.ro/..."
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && !loading && analyze()}
            style={{ flex: 1 }}
          />
          <Button size="3" disabled={loading || !url.trim()} onClick={() => analyze()}>
            {loading ? "Analyzing…" : "Analyze"}
          </Button>
        </Flex>

        {error && (
          <Card mb="5" style={{ border: "1px solid var(--red-6)" }}>
            <Flex align="center" justify="between" gap="3">
              <Text color="red" size="2">
                {error === "Failed to fetch"
                  ? "Backend not reachable — make sure the analyzer server is running on port 8005."
                  : error}
              </Text>
              <Button
                size="2"
                variant="soft"
                color="red"
                style={{ flexShrink: 0 }}
                onClick={() => analyze(initialUrl ?? url)}
              >
                Retry
              </Button>
            </Flex>
          </Card>
        )}

        {result && (
          <Flex direction="column" gap="4">
            <Card>
              <Flex justify="between" align="start" gap="3" mb="4">
                <Heading size="4" style={{ lineHeight: 1.3 }}>
                  {result.listing.title}
                </Heading>
                <Badge
                  size="2"
                  color={VERDICT_COLOR[result.valuation.verdict]}
                  style={{ flexShrink: 0 }}
                >
                  {VERDICT_LABEL[result.valuation.verdict]}
                </Badge>
              </Flex>

              <Flex gap="6" wrap="wrap" mb="4">
                {result.listing.price_eur != null && (
                  <Box>
                    <Text size="1" color="gray" as="p">Asking price</Text>
                    <Text size="6" weight="bold">€{result.listing.price_eur.toLocaleString()}</Text>
                  </Box>
                )}
                {result.listing.price_per_m2 != null && (
                  <Box>
                    <Text size="1" color="gray" as="p">Per m²</Text>
                    <Text size="6" weight="bold">€{result.listing.price_per_m2.toLocaleString()}</Text>
                  </Box>
                )}
                {result.valuation.fair_value_eur_per_m2 != null && (
                  <Box>
                    <Text size="1" color="gray" as="p">Fair value / m²</Text>
                    <Text size="6" weight="bold">€{result.valuation.fair_value_eur_per_m2.toLocaleString()}</Text>
                  </Box>
                )}
                {result.valuation.price_deviation_pct != null && (
                  <Box>
                    <Text size="1" color="gray" as="p">Deviation</Text>
                    <Text
                      size="6"
                      weight="bold"
                      color={
                        result.valuation.price_deviation_pct < 0
                          ? "green"
                          : result.valuation.price_deviation_pct > 0
                            ? "red"
                            : undefined
                      }
                    >
                      {result.valuation.price_deviation_pct > 0 ? "+" : ""}
                      {result.valuation.price_deviation_pct.toFixed(1)}%
                    </Text>
                  </Box>
                )}
              </Flex>

              <Separator mb="4" size="4" />

              <Flex gap="4" wrap="wrap" mb="4">
                {result.listing.city && (
                  <Text size="2"><strong>City</strong> {result.listing.city}</Text>
                )}
                {result.listing.zone && (
                  <Text size="2"><strong>Zone</strong> {result.listing.zone}</Text>
                )}
                {result.listing.size_m2 != null && (
                  <Text size="2"><strong>Size</strong> {result.listing.size_m2} m²</Text>
                )}
                {result.listing.rooms != null && (
                  <Text size="2"><strong>Rooms</strong> {result.listing.rooms}</Text>
                )}
                {result.listing.floor != null && (
                  <Text size="2">
                    <strong>Floor</strong> {result.listing.floor}
                    {result.listing.total_floors ? `/${result.listing.total_floors}` : ""}
                  </Text>
                )}
                {result.listing.condition && (
                  <Text size="2"><strong>Condition</strong> {result.listing.condition}</Text>
                )}
              </Flex>

              <Separator mb="4" size="4" />

              <Box mb="4">
                <Text size="1" color="gray" mb="1" as="p">AI Reasoning (Qwen)</Text>
                <Text size="2" as="p" style={{ lineHeight: 1.6 }}>
                  {result.valuation.reasoning}
                </Text>
              </Box>

              {result.valuation.key_factors.length > 0 && (
                <Flex gap="2" wrap="wrap">
                  {result.valuation.key_factors.map((f, i) => (
                    <Badge key={i} variant="soft" color="gray" size="1">{f}</Badge>
                  ))}
                </Flex>
              )}
            </Card>

            {result.comparables.length > 0 && (
              <Card>
                <Heading size="3" mb="3">Similar Listings on 999.md</Heading>

                {result.zone_stats && result.zone_stats.min_price_per_m2 != null && result.zone_stats.max_price_per_m2 != null && (
                  <Box mb="4">
                    <Flex justify="between" mb="1">
                      <Text size="1" color="gray">
                        Zone avg: €{result.zone_stats.avg_price_per_m2?.toLocaleString()}/m² · {result.zone_stats.count} listings
                      </Text>
                      <Text size="1" color="gray">
                        Range: €{result.zone_stats.min_price_per_m2.toLocaleString()} – €{result.zone_stats.max_price_per_m2.toLocaleString()}
                      </Text>
                    </Flex>
                    <ZonePriceBar
                      min={result.zone_stats.min_price_per_m2}
                      max={result.zone_stats.max_price_per_m2}
                      avg={result.zone_stats.avg_price_per_m2}
                      listing={result.listing.price_per_m2}
                    />
                  </Box>
                )}

                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 12 }}>
                  {result.comparables.map((comp, i) => (
                    <ComparableCard key={i} comp={comp} />
                  ))}
                </div>
              </Card>
            )}

            <Flex justify="between">
              <Text size="1" color="gray">
                Source: {result.source} · Confidence: {(result.valuation.confidence * 100).toFixed(0)}%
              </Text>
              <Text size="1" color="gray">
                {new Date(result.analyzed_at).toLocaleString()}
              </Text>
            </Flex>
          </Flex>
        )}
      </Box>
    </div>
  );
}
