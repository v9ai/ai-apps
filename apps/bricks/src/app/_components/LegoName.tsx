import { css } from "styled-system/css";

// Contrast-safe colors on #FFD500 yellow background (WCAG AA large text >= 3:1)
const LEGO_COLORS = ["#E3000B", "#7A6000", "#006CB7", "#00852B", "#C04F00"];

// ─── Timing constants ─────────────────────────────────────────────────────────
// Each flip lasts 400ms. Letters stagger 38ms apart.
// Stagger wraps at 12 so long names stay brisk (max wave = 11 * 38 = 418ms).
const FLIP_DURATION_MS = 400;
const STAGGER_MS = 38;
const MAX_STAGGER = 12;

interface LegoNameProps {
  name: string;
}

export function LegoName({ name }: LegoNameProps) {
  const words = name.split(" ");
  let colorIndex = 0;
  // Absolute letter counter across all words — drives stagger delay.
  let globalLetterIndex = 0;

  return (
    <div
      role="img"
      aria-label={name}
      className={css({
        display: "inline-flex",
        alignItems: "center",
        gap: "6px",
        bg: "lego.yellow",
        rounded: "brick",
        px: "10px",
        py: "6px",
        // Layer 1: Plate lift — fires at t=0, immediate feedback
        transform: "rotate(-0.4deg)",
        boxShadow:
          "inset 0 1px 0 rgba(255,255,255,0.55), inset 0 -1px 0 rgba(0,0,0,0.15), 0 2px 0 #B89800, 0 3px 10px rgba(0,0,0,0.4)",
        transition: "transform 180ms ease-out, box-shadow 180ms ease-out",
        willChange: "transform",

        // 3D context for child rotateX flips
        perspective: "400px",
        transformStyle: "preserve-3d",

        // Layers 2+3: play-state toggle for letter flips + stud sparkle
        "--flip-play": "paused",
        "&:hover": {
          "--flip-play": "running",
          transform: "rotate(0deg) translateY(-3px)",
          boxShadow:
            "inset 0 1px 0 rgba(255,255,255,0.55), inset 0 -1px 0 rgba(0,0,0,0.15), 0 4px 0 #B89800, 0 6px 16px rgba(0,0,0,0.45)",
        },
        "&:hover [data-stud]": {
          animationPlayState: "running",
        },

        // Reduced motion: disable all animation layers
        "@media (prefers-reduced-motion: reduce)": {
          "--flip-play": "paused !important",
          transition: "none",
          "&:hover": {
            transform: "rotate(-0.4deg)",
            boxShadow:
              "inset 0 1px 0 rgba(255,255,255,0.55), inset 0 -1px 0 rgba(0,0,0,0.15), 0 2px 0 #B89800, 0 3px 10px rgba(0,0,0,0.4)",
          },
          "&:hover [data-stud]": {
            animationPlayState: "paused",
          },
        },
      })}
      style={{ backgroundColor: "#FFD500", borderRadius: "10px" }}
    >
      {words.map((word, wordIdx) => (
        <div
          key={wordIdx}
          className={css({
            display: "inline-flex",
            alignItems: "center",
          })}
        >
          {/* Layer 3: Stud sparkle — fires at t=60ms */}
          {wordIdx > 0 && (
            <div
              aria-hidden="true"
              data-stud=""
              className={css({
                w: "7px",
                h: "7px",
                rounded: "stud",
                bg: "#B89800",
                mr: "6px",
                flexShrink: 0,
                boxShadow:
                  "inset 0 -1px 2px rgba(0,0,0,0.35), inset 0 1px 2px rgba(255,255,255,0.25), 0 1px 2px rgba(0,0,0,0.3)",
                animationName: "stud-sparkle",
                animationDuration: "160ms",
                animationTimingFunction: "ease-out",
                animationIterationCount: 1,
                animationFillMode: "both",
                animationPlayState: "paused",
                animationDelay: "60ms",
              })}
            />
          )}

          {word.split("").map((letter, letterIdx) => {
            const color = LEGO_COLORS[colorIndex % LEGO_COLORS.length];
            colorIndex++;

            // Wrap stagger: index 0→0ms, 1→38ms, …, 11→418ms, 12→0ms again.
            const delayMs = (globalLetterIndex % MAX_STAGGER) * STAGGER_MS;
            globalLetterIndex++;

            return (
              <span
                key={letterIdx}
                data-flip
                className={css({
                  fontFamily: "display",
                  fontWeight: "900",
                  fontSize: "22px",
                  lineHeight: 1,
                  letterSpacing: "0.5px",
                  // inline-block is required — rotateX has no effect on inline nodes.
                  display: "inline-block",
                  // Pivot around the letter's horizontal midline so the tile
                  // rotates in place rather than swinging from its top or bottom edge.
                  transformOrigin: "center center",
                  // animationFillMode "both":
                  //   backwards — holds the 0% keyframe during the delay window,
                  //               preventing letters from flashing unstyled before
                  //               their individual flip starts.
                  //   forwards  — holds the 100% state after the animation ends.
                  // play-state is driven entirely by --flip-play on the parent.
                  animationName: "brickFlip",
                  animationDuration: `${FLIP_DURATION_MS}ms`,
                  animationTimingFunction: "ease-in-out",
                  animationIterationCount: 1,
                  animationFillMode: "both",
                  animationPlayState: "var(--flip-play)",
                })}
                style={{
                  color,
                  textShadow: "0 1px 0 rgba(0,0,0,0.4)",
                  animationDelay: `${delayMs}ms`,
                }}
              >
                {letter}
              </span>
            );
          })}
        </div>
      ))}
    </div>
  );
}
