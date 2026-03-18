import { css } from "styled-system/css";

type NavHeaderProps = {
  totalPersonalities: number;
  totalPodcasts: number;
};

const header = css({
  position: "fixed",
  top: 0,
  left: 0,
  right: 0,
  zIndex: 50,
  height: "3.5rem",
  bg: "rgba(11, 11, 15, 0.95)",
  backdropFilter: "blur(12px)",
  shadow: "navBorder",
});

const inner = css({
  maxWidth: "80rem",
  mx: "auto",
  px: "6",
  height: "100%",
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
});

const logo = css({
  fontFamily: "sans",
  fontSize: "lg",
  fontWeight: "bold",
  color: "ui.heading",
  letterSpacing: "tight",
  transition: "colors",
  transitionDuration: "normal",
  textShadow: "titleGlow",
  display: "flex",
  alignItems: "center",
  height: "100%",
  _hover: { color: "white" },
});

const stats = css({
  display: "none",
  alignItems: "center",
  gap: "3",
  height: "100%",
  sm: { display: "flex" },
});

const stat = css({
  color: "ui.tertiary",
  fontSize: "xs",
  fontWeight: "medium",
  textTransform: "uppercase",
  letterSpacing: "editorial",
});

const divider = css({
  color: "ui.faint",
  fontSize: "xs",
  userSelect: "none",
});

export default function NavHeader({
  totalPersonalities,
  totalPodcasts,
}: NavHeaderProps) {
  return (
    <header className={header}>
      <div className={inner}>
        <a href="/" className={logo}>
          Humans of AI
        </a>

        <div className={stats}>
          <span className={stat}>{totalPersonalities} Stories</span>
          <span aria-hidden="true" className={divider}>&middot;</span>
          <span className={stat}>{totalPodcasts} Podcasts</span>
        </div>
      </div>
    </header>
  );
}
