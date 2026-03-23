import { css } from "styled-system/css";

const section = css({
  pos: "relative",
  overflow: "hidden",
  overflowX: "clip",
  pt: { base: "8", sm: "10", md: "12", lg: "14" },
  pb: { base: "4", sm: "5", md: "6", lg: "8" },
  textAlign: "center",
  display: "flex",
  flexDir: "column",
  alignItems: "center",
  justifyContent: "center",
});

const inner = css({
  pos: "relative",
  maxW: "800px",
  mx: "auto",
  px: { base: "4", sm: "6", md: "8", lg: "10" },
});

const h1 = css({
  fontWeight: "bold",
  letterSpacing: "-0.03em",
  fontFamily: "sans",
  fontSize: "clamp(2rem, 6vw, 4.5rem)",
  backgroundImage:
    "linear-gradient(160deg, #FFFFFF 0%, #F2EFFF 35%, #A89EC4 100%)",
  backgroundClip: "text",
  color: "transparent",
  animation: "fade-in-up 0.65s var(--ease-expo-out) both",
});

const tagline = css({
  mt: { base: "3", sm: "4" },
  fontSize: "clamp(0.6875rem, 1.4vw, 0.8125rem)",
  fontWeight: "500",
  letterSpacing: "0.22em",
  textTransform: "uppercase",
  color: "rgba(167, 139, 250, 0.55)",
  animation: "fade-in-up 0.5s var(--ease-expo-out) 0.15s both",
});

const taglineSep = css({
  display: "inline-block",
  mx: { base: "1.5", sm: "2.5" },
  color: "rgba(167, 139, 250, 0.25)",
  fontSize: "0.65em",
  verticalAlign: "middle",
});

const subtitle = css({
  mt: { base: "4", sm: "5", md: "6" },
  mb: { base: "3", sm: "4" },
  maxW: "36rem",
  mx: "auto",
  fontSize: "clamp(1rem, 2vw, 1.25rem)",
  lineHeight: "1.65",
  letterSpacing: "0.015em",
  fontWeight: "300",
  color: "#D0D0DA",
  animation: "fade-in-up 0.6s var(--ease-expo-out) 0.2s both",
});

export default function HeroSection() {
  return (
    <section className={section}>
      <div className="hero-gradient-mesh" aria-hidden="true" />

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
      </div>
    </section>
  );
}
