"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Badge,
  Box,
  Card,
  Flex,
  Heading,
  Separator,
  Text,
} from "@radix-ui/themes";

import {
  BOROUGHS,
  TIER_LABEL,
  TIER_COLOR,
  HEDONIC_FACTORS,
  STAMP_DUTY_BANDS,
  RENTAL_DATA,
  fmt,
  fmtK,
  fmtGBP,
} from "@/lib/london-data";

import { BoroughBarChart } from "@/components/london/borough-bar-chart";
import { GrowthChart } from "@/components/london/growth-chart";
import { YieldScatter } from "@/components/london/yield-scatter";
import { ElizabethLineChart } from "@/components/london/elizabeth-line-chart";
import { HedonicCalculator } from "@/components/london/hedonic-calculator";
import { BoroughTable } from "@/components/london/borough-table";
import { SDLTCalculator } from "@/components/london/sdlt-calculator";
import { BoroughMap } from "@/components/london/borough-map";
import { InvestmentRadar } from "@/components/london/investment-radar";

// ─── Tabs ──────────────────────────────────────────────────────────────────

const TABS = ["Overview", "Compare", "Calculator", "Map"] as const;
type Tab = (typeof TABS)[number];

// ─── Component ─────────────────────────────────────────────────────────────

export function LondonPredictContent() {
  const [activeTab, setActiveTab] = useState<Tab>("Overview");

  return (
    <div>
      {/* ─── Topbar ──────────────────────────────────────────────── */}
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
          <span style={{ fontSize: 12, opacity: 0.8 }}>Predict</span>
        </Link>
        <span style={{ fontSize: 12, fontWeight: 600 }}>London Market</span>
      </div>

      {/* ─── Hero ────────────────────────────────────────────────── */}
      <section className="hero">
        <div className="hero-glow" />
        <div className="hero-grid-bg" />
        <div className="hero-blob-pink" />
        <div className="hero-content">
          <p className="hero-kicker">London Property Intelligence</p>
          <h1 className="hero-title">
            London Market{" "}
            <span className="hero-title-accent">Dashboard</span>
          </h1>
          <p className="hero-subtitle">
            Comprehensive market intelligence across 33 boroughs. Powered by
            Land Registry + ONS data with hedonic pricing models and investment
            analytics.
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
            <div className="hero-stat">
              <span className="hero-stat-number">{fmtK(564000)}</span>
              <span className="hero-stat-label">Avg Price</span>
            </div>
          </div>
        </div>
        <div className="hero-bottom-line" />
      </section>

      {/* ─── Tab pills ───────────────────────────────────────────── */}
      <Box px="5" py="6" style={{ maxWidth: 1200, margin: "0 auto" }}>
        <Flex gap="2" mb="5" wrap="wrap">
          {TABS.map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              style={{
                padding: "6px 16px",
                borderRadius: 99,
                border: "1px solid",
                borderColor:
                  activeTab === tab
                    ? "var(--accent-9)"
                    : "rgba(255,255,255,0.08)",
                background:
                  activeTab === tab
                    ? "var(--accent-3)"
                    : "rgba(255,255,255,0.04)",
                color:
                  activeTab === tab
                    ? "var(--accent-11)"
                    : "var(--gray-10)",
                fontSize: 13,
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              {tab}
            </button>
          ))}
        </Flex>

        {/* ─── Overview Tab ──────────────────────────────────────── */}
        {activeTab === "Overview" && (
          <>
            {/* Top-level stats */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(4, 1fr)",
                gap: 12,
                marginBottom: 24,
              }}
            >
              <Card>
                <Text size="1" color="gray" as="p">London Average</Text>
                <Text size="6" weight="bold">{fmtK(564000)}</Text>
                <Text size="1" color="gray" as="p">avg property price</Text>
              </Card>
              <Card>
                <Text size="1" color="gray" as="p">Annual Growth</Text>
                <Text size="6" weight="bold" color="green">+2.3%</Text>
                <Text size="1" color="gray" as="p">Jan 2025 YoY</Text>
              </Card>
              <Card>
                <Text size="1" color="gray" as="p">Avg Yield</Text>
                <Text size="6" weight="bold">5.4%</Text>
                <Text size="1" color="gray" as="p">gross, flats</Text>
              </Card>
              <Card>
                <Text size="1" color="gray" as="p">2026 Forecast</Text>
                <Text size="6" weight="bold" color="teal">+3-5%</Text>
                <Text size="1" color="gray" as="p">Savills/JLL consensus</Text>
              </Card>
            </div>

            {/* Borough bar chart */}
            <Box mb="5">
              <BoroughBarChart />
            </Box>

            {/* Growth chart */}
            <Box mb="5">
              <GrowthChart />
            </Box>

            {/* Elizabeth Line */}
            <Box mb="5">
              <ElizabethLineChart />
            </Box>
          </>
        )}

        {/* ─── Compare Tab ───────────────────────────────────────── */}
        {activeTab === "Compare" && (
          <>
            {/* Yield scatter — full width */}
            <Box mb="5">
              <YieldScatter />
            </Box>

            {/* Investment radar */}
            <Box mb="5">
              <InvestmentRadar />
            </Box>

            {/* Borough table — full width */}
            <Box mb="5">
              <BoroughTable />
            </Box>
          </>
        )}

        {/* ─── Calculator Tab ────────────────────────────────────── */}
        {activeTab === "Calculator" && (
          <>
            {/* Hedonic + SDLT side by side */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: 16,
                marginBottom: 24,
              }}
            >
              <HedonicCalculator />
              <SDLTCalculator />
            </div>

            {/* Hedonic factors reference */}
            <Card mb="5">
              <Heading size="3" mb="1">Hedonic Adjustment Factors</Heading>
              <Text size="1" color="gray" as="p" mb="3">
                Research-backed price modifiers. Apply to borough baseline /m2
                to estimate specific property values.
              </Text>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1.2fr 0.8fr 2fr",
                  gap: 8,
                  padding: "4px 0",
                  borderBottom: "1px solid var(--gray-5)",
                  marginBottom: 4,
                }}
              >
                <Text size="1" color="gray">Factor</Text>
                <Text size="1" color="gray">Adjustment</Text>
                <Text size="1" color="gray">Notes</Text>
              </div>
              {HEDONIC_FACTORS.map((f) => (
                <div
                  key={f.factor}
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1.2fr 0.8fr 2fr",
                    gap: 8,
                    alignItems: "center",
                    padding: "5px 0",
                    borderBottom: "1px solid var(--gray-3)",
                  }}
                >
                  <Text size="2" weight="medium">{f.factor}</Text>
                  <Text
                    size="2"
                    weight="bold"
                    color={f.adjustment.startsWith("-") ? "red" : "green"}
                  >
                    {f.adjustment}
                  </Text>
                  <Text size="1" color="gray">{f.notes}</Text>
                </div>
              ))}
            </Card>

            {/* Stamp duty reference */}
            <Card mb="5">
              <Heading size="3" mb="1">Stamp Duty (SDLT) 2025-2026</Heading>
              <Text size="1" color="gray" as="p" mb="3">
                Rates for England & Northern Ireland. First-time buyer relief
                available up to 625K.
              </Text>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1.5fr 1fr 1fr",
                  gap: 8,
                  padding: "4px 0",
                  borderBottom: "1px solid var(--gray-5)",
                  marginBottom: 4,
                }}
              >
                <Text size="1" color="gray">Band</Text>
                <Text size="1" color="gray">Standard Rate</Text>
                <Text size="1" color="gray">First-Time Buyer</Text>
              </div>
              {STAMP_DUTY_BANDS.map((b) => (
                <div
                  key={b.band}
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1.5fr 1fr 1fr",
                    gap: 8,
                    padding: "5px 0",
                    borderBottom: "1px solid var(--gray-3)",
                  }}
                >
                  <Text size="2">{b.band}</Text>
                  <Text size="2" weight="bold">{b.rate}</Text>
                  <Text size="2" color="gray">{b.ftb}</Text>
                </div>
              ))}
            </Card>

            {/* Rental reference */}
            <Card mb="5">
              <Heading size="3" mb="1">Rental Market Reference</Heading>
              <Text size="1" color="gray" as="p" mb="3">
                Monthly rents by area (2025-2026)
              </Text>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(3, 1fr)",
                  gap: 12,
                }}
              >
                {RENTAL_DATA.map((r) => (
                  <Box
                    key={r.area}
                    p="3"
                    style={{
                      border: "1px solid var(--gray-4)",
                      borderRadius: 8,
                      background: "var(--gray-1)",
                    }}
                  >
                    <Text size="2" weight="bold" as="p" mb="1">
                      {r.area}
                    </Text>
                    <Flex justify="between">
                      <Text size="1" color="gray">1br</Text>
                      <Text size="1">{r.r1}</Text>
                    </Flex>
                    <Flex justify="between">
                      <Text size="1" color="gray">2br</Text>
                      <Text size="1">{r.r2}</Text>
                    </Flex>
                  </Box>
                ))}
              </div>
            </Card>
          </>
        )}

        {/* ─── Map Tab ───────────────────────────────────────────── */}
        {activeTab === "Map" && (
          <Box mb="5" style={{ height: 600 }}>
            <BoroughMap />
          </Box>
        )}

        {/* ─── Sources ───────────────────────────────────────────── */}
        <Separator mb="4" size="4" />
        <Box mb="6">
          <Text
            size="1"
            color="gray"
            weight="bold"
            as="p"
            mb="2"
            style={{ textTransform: "uppercase", letterSpacing: "0.05em" }}
          >
            Sources & Methodology
          </Text>
          <Text size="1" color="gray" as="p" style={{ lineHeight: 1.8 }}>
            Borough prices: HM Land Registry Price Paid Data + UK House Price
            Index (Dec 2025). Hedonic factors: Gorjian et al. (2025) systematic
            review, Nationwide 2025 transport research, LSE SERC DP 0127.
            Elizabeth Line impact: CBRE Crossrail Impact Report, London Property
            Talk 2025. Rental yields: Investropa 2026, GuestReady 2026, Portico
            Yields. Forecasts: Savills Residential Forecasts, JLL UK Outlook
            2026. LLM appraisal methodology: arXiv:2506.11812, arXiv:2503.12344
            (EXPRESS).
          </Text>
        </Box>
      </Box>

      {/* ─── Footer ──────────────────────────────────────────────── */}
      <footer className="site-footer">
        <div className="footer-brand">
          <span className="footer-brand-dot" />
          <span className="footer-brand-title">PropertyAI</span>
          <span className="footer-version">v0.1 beta</span>
        </div>
        <p className="footer-tagline">
          AI-powered real estate valuation and market intelligence
        </p>
        <nav className="footer-nav">
          <Link href="/" className="footer-nav-link">Home</Link>
          <Link href="/analyzer" className="footer-nav-link">Analyzer</Link>
          <Link href="/dashboard" className="footer-nav-link">Dashboard</Link>
          <Link href="/trends" className="footer-nav-link">Trends</Link>
          <Link href="/predict" className="footer-nav-link">Predict</Link>
        </nav>
        <div className="footer-bottom">
          <span>Powered by DeepSeek AI</span>
          <span className="footer-separator" aria-hidden="true" />
          <span>Markets: Moldova &middot; Romania &middot; London</span>
          <span className="footer-separator" aria-hidden="true" />
          <span>&copy; {new Date().getFullYear()} Vadim Nicolai</span>
        </div>
      </footer>
    </div>
  );
}
