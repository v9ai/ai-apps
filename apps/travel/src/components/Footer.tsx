import { css } from "styled-system/css";

interface FooterProps {
  city: string;
  count: number;
}

export function Footer({ city, count }: FooterProps) {
  const year = new Date().getFullYear();

  return (
    <footer
      className={css({
        position: "relative",
        zIndex: 1,
        borderTop: "1px solid",
        borderColor: "steel.border",
        mt: "8",
      })}
    >
      {/*
       * Amber coal-seam rule — Silesian motif done elegantly.
       *
       * A 2px gradient line that suggests the bright amber vein of a
       * coal seam, or the edge of a blast-furnace door. The amberDrift
       * animation gives it a slow candlelight pulse — present but not
       * loud. This is the only animated element in the footer, and at
       * 4s it reads as environmental ambience, not UI feedback.
       */}
      <div
        className={css({
          h: "2px",
          bg: "linear-gradient(90deg, transparent 0%, token(colors.amber.warm) 40%, token(colors.copper.main) 60%, transparent 100%)",
          animation: "amberDrift 4s ease-in-out infinite",
          mb: "-1px",
        })}
      />

      <div
        className={css({
          mx: "auto",
          px: { base: "4", sm: "6", md: "10", lg: "16", xl: "20" },
          py: { base: "8", sm: "10", md: "12" },
          display: "flex",
          flexDirection: { base: "column", sm: "row" },
          alignItems: { base: "flex-start", sm: "center" },
          justifyContent: "space-between",
          gap: { base: "5", sm: "6" },
        })}
      >
        {/* Left — identity */}
        <div>
          <p
            className={css({
              fontSize: "label",
              fontWeight: "600",
              fontFamily: "display",
              color: "amber.warm",
              letterSpacing: "label",
              textTransform: "uppercase",
              mb: "2",
            })}
          >
            Travel Guide
          </p>
          <p
            className={css({
              fontSize: "h3",
              fontWeight: "700",
              fontFamily: "display",
              color: "text.primary",
              letterSpacing: "h3",
            })}
          >
            {city}
          </p>
          <p
            className={css({
              mt: "1",
              fontSize: "meta",
              color: "text.muted",
            })}
          >
            {count} curated places
          </p>
        </div>

        {/* Right — meta */}
        <div
          className={css({
            display: "flex",
            flexDirection: "column",
            alignItems: { base: "flex-start", sm: "flex-end" },
            gap: "1",
          })}
        >
          {/* Silesian coordinates — geographic grounding, a Monocle convention */}
          <p
            className={css({
              fontSize: "meta",
              fontFamily: "display",
              fontWeight: "600",
              color: "text.faint",
              letterSpacing: "0.08em",
              fontVariantNumeric: "tabular-nums",
            })}
          >
            50°15&prime;N&nbsp;&nbsp;19°01&prime;E
          </p>
          <p
            className={css({
              fontSize: "meta",
              color: "text.faint",
            })}
          >
            Upper Silesia, Poland
          </p>
          <p
            className={css({
              mt: "3",
              fontSize: "meta",
              color: "text.faint",
              opacity: "0.5",
            })}
          >
            &copy; {year} — {city} Travel Guide
          </p>
          <p
            className={css({
              mt: "1",
              fontSize: "meta",
              color: "text.faint",
              opacity: "0.4",
              maxW: "280px",
              lineHeight: "1.5",
              textAlign: { base: "left", sm: "right" },
            })}
          >
            Some links may earn us a commission at no extra cost to you.
          </p>
        </div>
      </div>
    </footer>
  );
}
