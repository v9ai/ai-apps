import { css } from "styled-system/css";

const section = css({
  pos: "relative",
  overflow: "hidden",
  overflowX: "clip",
  pt: { base: "36", sm: "44", lg: "56" },
  pb: { base: "24", sm: "28", lg: "36" },
  textAlign: "center",
  minH: { base: "auto", lg: "100vh" },
  display: "flex",
  flexDir: "column",
  alignItems: "center",
  justifyContent: "center",
});

const inner = css({
  pos: "relative",
  maxW: "800px",
  mx: "auto",
  px: { base: "5", sm: "6", md: "8", lg: "10" },
});

const h1 = css({
  fontWeight: "bold",
  letterSpacing: "-0.03em",
  fontFamily: "sans",
  fontSize: "clamp(2.5rem, 7vw, 6rem)",
  backgroundImage:
    "linear-gradient(160deg, #FFFFFF 0%, #F2EFFF 35%, #A89EC4 100%)",
  backgroundClip: "text",
  color: "transparent",
  animation: "fade-in-up 0.65s var(--ease-expo-out) both",
});

const tagline = css({
  mt: { base: "3", sm: "4" },
  fontSize: "clamp(0.75rem, 1.6vw, 0.9375rem)",
  fontWeight: "500",
  letterSpacing: "0.22em",
  textTransform: "uppercase",
  color: "rgba(167, 139, 250, 0.55)",
  "& span": {
    display: "inline-block",
    animation: "fade-in-up 0.5s var(--ease-expo-out) both",
  },
  "& span:nth-child(1)": { animationDelay: "0.25s" },
  "& span:nth-child(3)": { animationDelay: "0.35s" },
  "& span:nth-child(5)": { animationDelay: "0.45s" },
});

const taglineSep = css({
  display: "inline-block",
  mx: { base: "2", sm: "3" },
  color: "rgba(167, 139, 250, 0.25)",
  fontSize: "0.65em",
  verticalAlign: "middle",
  animation: "fade-in 0.4s var(--ease-expo-out) 0.55s both",
});

const subtitle = css({
  mt: { base: "8", sm: "10", md: "12" },
  mb: { base: "8", sm: "10", md: "12", lg: "14" },
  maxW: "36rem",
  mx: "auto",
  fontSize: "clamp(1.125rem, 2.4vw, 1.375rem)",
  lineHeight: "1.65",
  letterSpacing: "0.015em",
  fontWeight: "300",
  color: "#D0D0DA",
  animation: "fade-in-up 0.6s var(--ease-expo-out) 0.2s both",
});

const divider = css({
  h: "1px",
  w: "16",
  mx: "auto",
  mt: { base: "0", sm: "0" },
  mb: { base: "6", sm: "8", md: "10" },
  background:
    "linear-gradient(90deg, transparent, rgba(167,139,250,0.35), transparent)",
  animation: "fade-in-micro 0.5s var(--ease-expo-out) 0.38s both",
});

const pulseWrapper = css({
  mt: { base: "0", sm: "0" },
  display: { base: "none", sm: "flex" },
  flexDir: "column",
  alignItems: "center",
  animation: "fade-in-micro 0.45s var(--ease-expo-out) 0.52s both",
});

const scrollIndicator = css({
  mt: { base: "10", sm: "14", lg: "18" },
  display: "flex",
  flexDir: "column",
  alignItems: "center",
  gap: "2",
  animation: "fade-in-up 0.5s var(--ease-expo-out) 0.7s both",
});

const scrollLabel = css({
  fontSize: "0.6875rem",
  fontWeight: "500",
  letterSpacing: "0.18em",
  textTransform: "uppercase",
  color: "rgba(196, 196, 204, 0.4)",
});

const scrollChevron = css({
  w: "5",
  h: "5",
  color: "rgba(167, 139, 250, 0.35)",
  animation: "hero-scroll-bounce 2.4s ease-in-out infinite",
});

export default function HeroSection() {
  return (
    <section className={section}>
      <div className="hero-gradient-mesh" aria-hidden="true" />
      <div className="hero-grain-overlay" aria-hidden="true" />
      <div className="hero-orb hero-orb--1" aria-hidden="true" />
      <div className="hero-orb hero-orb--2" aria-hidden="true" />
      <div className="hero-orb hero-orb--3" aria-hidden="true" />

      <div className={inner}>
        <h1 className={h1} style={{ WebkitBackgroundClip: "text" }}>
          Humans of AI
        </h1>

        <p className={tagline} aria-label="Researchers, Founders, Visionaries">
          <span>Researchers</span>
          <span className={taglineSep} aria-hidden="true">
            &#x2027;
          </span>
          <span>Founders</span>
          <span className={taglineSep} aria-hidden="true">
            &#x2027;
          </span>
          <span>Visionaries</span>
        </p>

        <p className={subtitle}>The conversations that matter.</p>

        <div className={divider} />

        <div className={pulseWrapper}>
          <div
            className="hero-pulse-line"
            style={{
              width: "1px",
              height: "48px",
              background:
                "linear-gradient(to bottom, rgba(167,139,250,0.22), transparent)",
            }}
          />
        </div>

        <div className={scrollIndicator}>
          <span className={scrollLabel}>Explore</span>
          <svg
            className={scrollChevron}
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 20 20"
            fill="currentColor"
            aria-hidden="true"
          >
            <path
              fillRule="evenodd"
              d="M5.22 8.22a.75.75 0 0 1 1.06 0L10 11.94l3.72-3.72a.75.75 0 1 1 1.06 1.06l-4.25 4.25a.75.75 0 0 1-1.06 0L5.22 9.28a.75.75 0 0 1 0-1.06Z"
              clipRule="evenodd"
            />
          </svg>
        </div>
      </div>
    </section>
  );
}
