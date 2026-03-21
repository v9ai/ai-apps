import type { Metadata } from "next";
import NavHeader from "./_components/nav-header";
import HeroSection from "./_components/hero-section";
import { FilterableGrid } from "./_components/filterable-grid";
import { categories, getAllPersonalities } from "@/lib/personalities";
import { quotes } from "@/lib/quotes";
import { css, cx } from "styled-system/css";

/* ── Page metadata ────────────────────────────────────────────── */

const SITE_URL = "https://humans-of-ai.vercel.app";

export const metadata: Metadata = {
  title: "Humans of AI — Intimate Portraits of the Minds Building AI",
  description:
    "Explore curated podcast interviews with the AI leaders, researchers, and founders shaping artificial intelligence — from deep learning pioneers to large language model architects.",
  keywords: [
    "AI leaders",
    "artificial intelligence",
    "machine learning",
    "deep learning",
    "AI researchers",
    "large language models",
    "tech founders",
    "AI interviews",
    "podcast",
    "AI podcast",
    "neural networks",
    "AI pioneers",
    "generative AI",
    "AI scientists",
    "tech visionaries",
  ],
  alternates: {
    canonical: SITE_URL,
  },
  openGraph: {
    title: "Humans of AI — Intimate Portraits of the Minds Building AI",
    description:
      "Explore curated podcast interviews with the AI leaders, researchers, and founders shaping artificial intelligence — from deep learning pioneers to large language model architects.",
    url: SITE_URL,
  },
};

/* ── Styles ───────────────────────────────────────────────────── */

const mainStyle = css({
  minH: "screen",
  bg: "#0B0B0F",
  color: "#E8E8ED",
  pt: { base: "14", sm: "16" },
});

const sectionStyle = css({
  maxW: "90rem",
  mx: "auto",
  px: { base: "5", sm: "6", md: "8", lg: "10", xl: "12" },
  pt: { base: "12", md: "16", lg: "20" },
  pb: { base: "16", md: "20", lg: "24" },
});

const headingWrapperStyle = css({
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  gap: { base: "3", md: "4" },
  mb: { base: "3", md: "4" },
  animation: "fade-in-up 0.6s var(--ease-expo-out) both",
});

const diamondAccentStyle = css({
  display: "inline-block",
  w: "6px",
  h: "6px",
  bg: "#3A3A45",
  transform: "rotate(45deg)",
  flexShrink: 0,
});

const h2Style = css({
  fontSize: { base: "3xl", md: "4xl" },
  fontWeight: "semibold",
  color: "#C4C4CC",
  textAlign: "center",
  letterSpacing: "-0.02em",
});

const subheadStyle = css({
  textAlign: "center",
  fontSize: { base: "13px", md: "14px" },
  letterSpacing: "0.04em",
  fontWeight: "300",
  color: "#5A5A65",
  mb: { base: "6", md: "8" },
  maxW: "36rem",
  mx: "auto",
  lineHeight: "relaxed",
  animation: "fade-in-up 0.6s 0.1s var(--ease-expo-out) both",
});

const separatorWrapStyle = css({
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  mb: { base: "10", md: "12", lg: "14" },
  animation: "fade-in 0.8s 0.2s var(--ease-expo-out) both",
});

const separatorLineStyle = css({
  h: "1px",
  w: "100%",
  maxW: "180px",
  bg: "linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.08) 100%)",
});

const separatorLineRightStyle = css({
  h: "1px",
  w: "100%",
  maxW: "180px",
  bg: "linear-gradient(90deg, rgba(255,255,255,0.08) 0%, transparent 100%)",
});

const separatorGlowStyle = css({
  w: "6px",
  h: "6px",
  borderRadius: "50%",
  bg: "rgba(255,255,255,0.12)",
  boxShadow: "0 0 8px 2px rgba(255,255,255,0.06)",
  mx: "3",
  flexShrink: 0,
});

const statsBannerStyle = css({
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  gap: { base: "2", md: "3" },
  flexWrap: "wrap",
  maxW: "40rem",
  mx: "auto",
  mb: { base: "10", md: "14", lg: "16" },
  animation: "fade-in-up 0.6s 0.15s var(--ease-expo-out) both",
});

const statPillStyle = css({
  display: "inline-flex",
  alignItems: "center",
  gap: "1.5",
  px: { base: "3", md: "4" },
  py: { base: "1.5", md: "2" },
  borderRadius: "9999px",
  bg: "rgba(255,255,255,0.03)",
  border: "1px solid rgba(255,255,255,0.06)",
  fontSize: { base: "11px", md: "12px" },
  letterSpacing: "0.05em",
  color: "#6A6A75",
  fontWeight: "400",
  transition: "all 0.2s var(--ease-expo-out)",
  _hover: {
    borderColor: "rgba(255,255,255,0.10)",
    bg: "rgba(255,255,255,0.05)",
  },
});

const statValueStyle = css({
  color: "#9A9AA5",
  fontWeight: "500",
  fontVariantNumeric: "tabular-nums",
});

/* ── Page component (Server) ──────────────────────────────────── */

export default function HomePage() {
  const allPersonalities = getAllPersonalities();

  const totalPersonalities = allPersonalities.length;
  const totalPodcasts = allPersonalities.reduce(
    (acc, p) => acc + p.podcasts.length,
    0,
  );
  const totalCategories = categories.length;

  return (
    <main className={mainStyle}>
      <NavHeader
        totalPersonalities={totalPersonalities}
        totalPodcasts={totalPodcasts}
      />

      <HeroSection />

      {/* ── Stats banner ── */}
      <div className={statsBannerStyle}>
        <span className={statPillStyle}>
          <span className={statValueStyle}>{totalPersonalities}</span> stories
        </span>
        <span className={statPillStyle}>
          <span className={statValueStyle}>{totalCategories}</span> categories
        </span>
        <span className={statPillStyle}>
          <span className={statValueStyle}>{totalPodcasts}</span> podcasts
        </span>
      </div>

      <section className={sectionStyle}>
        <div className={headingWrapperStyle}>
          <span className={diamondAccentStyle} />
          <h2 className={h2Style}>The Collection</h2>
          <span className={diamondAccentStyle} />
        </div>
        <p className={subheadStyle}>
          The minds rewriting what intelligence means
        </p>

        {/* ── Elegant separator ── */}
        <div className={separatorWrapStyle}>
          <div className={separatorLineStyle} />
          <div className={separatorGlowStyle} />
          <div className={separatorLineRightStyle} />
        </div>

        <FilterableGrid
          categories={categories}
          allPersonalities={allPersonalities}
          quotes={quotes}
        />
      </section>
    </main>
  );
}
