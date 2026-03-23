import type { Metadata } from "next";
import NavHeader from "./_components/nav-header";
import HeroSection from "./_components/hero-section";
import { FilterableGrid } from "./_components/filterable-grid";
import { categories, getAllPersonalities } from "@/lib/personalities";
import { quotes } from "@/lib/quotes";
import { css } from "styled-system/css";

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
  bg: "ui.base",
  color: "ui.heading",
  pt: { base: "14", sm: "16" },
  overflowX: "hidden",
});

const sectionStyle = css({
  w: "100%",
  maxW: "80rem",
  mx: "auto",
  px: { base: "4", sm: "6", md: "8", lg: "10" },
  pt: { base: "2", sm: "3", md: "4" },
  pb: { base: "12", sm: "14", md: "16", lg: "20" },
});

/* ── Page component (Server) ──────────────────────────────────── */

export default function HomePage() {
  const allPersonalities = getAllPersonalities();

  const totalPersonalities = allPersonalities.length;
  const totalPodcasts = allPersonalities.reduce(
    (acc, p) => acc + p.podcasts.length,
    0,
  );

  return (
    <main className={mainStyle}>
      <NavHeader
        totalPersonalities={totalPersonalities}
        totalPodcasts={totalPodcasts}
      />

      <HeroSection />

      <section className={sectionStyle}>
        <FilterableGrid
          categories={categories}
          allPersonalities={allPersonalities}
          quotes={quotes}
        />
      </section>
    </main>
  );
}
