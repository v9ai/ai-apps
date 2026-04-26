"use client";

import { css } from "styled-system/css";

interface GameCard {
  title: string;
  tagline: string;
  accent: string;
}

const GAMES: GameCard[] = [
  {
    title: "Color Match",
    tagline: "Sort bricks by LEGO color before the timer runs out.",
    accent: "#E3000B",
  },
  {
    title: "Stud Sort",
    tagline: "Place the right studs on the right plate.",
    accent: "#FFD500",
  },
  {
    title: "Brick Breaker",
    tagline: "Knock down the wall — classic-style, with studs.",
    accent: "#006CB7",
  },
  {
    title: "MOC Memory",
    tagline: "Memorize the build, then rebuild it from memory.",
    accent: "#00852B",
  },
];

export default function GamesPage() {
  return (
    <main className={css({ mx: "auto", maxW: "4xl", px: "4", py: "12" })}>
      <div className={css({ mb: "8" })}>
        <h1
          className={css({
            fontSize: "3xl",
            fontWeight: "900",
            fontFamily: "display",
            letterSpacing: "-0.03em",
            color: "ink.primary",
          })}
        >
          Games
        </h1>
        <p className={css({ mt: "1", fontSize: "sm", color: "ink.muted" })}>
          Tiny LEGO-flavored games to play between builds.
        </p>
      </div>

      <div
        className={css({
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))",
          gap: "4",
        })}
      >
        {GAMES.map((game) => (
          <article
            key={game.title}
            className={css({
              position: "relative",
              bg: "plate.surface",
              border: "1px solid",
              borderColor: "plate.border",
              rounded: "brick",
              boxShadow: "brick",
              p: "5",
              minH: "180px",
              display: "flex",
              flexDirection: "column",
              gap: "2",
              overflow: "hidden",
            })}
          >
            <div
              aria-hidden="true"
              className={css({
                position: "absolute",
                top: 0,
                left: 0,
                right: 0,
                h: "4px",
              })}
              style={{ background: game.accent }}
            />

            <div
              className={css({
                position: "absolute",
                top: "3",
                right: "3",
                fontSize: "10px",
                fontFamily: "display",
                fontWeight: "800",
                letterSpacing: "0.08em",
                textTransform: "uppercase",
                color: "ink.faint",
                bg: "plate.raised",
                border: "1px solid",
                borderColor: "plate.border",
                rounded: "brick",
                px: "2",
                py: "0.5",
              })}
            >
              Coming soon
            </div>

            <h2
              className={css({
                mt: "3",
                fontFamily: "display",
                fontWeight: "900",
                fontSize: "xl",
                letterSpacing: "-0.02em",
                color: "ink.primary",
                lineHeight: 1.1,
              })}
            >
              {game.title}
            </h2>

            <p
              className={css({
                fontSize: "sm",
                color: "ink.muted",
                lineHeight: 1.5,
              })}
            >
              {game.tagline}
            </p>

            <div className={css({ flex: 1 })} />

            <div
              className={css({
                display: "flex",
                gap: "1",
              })}
            >
              {[0, 1, 2, 3, 4].map((i) => (
                <div
                  key={i}
                  className={css({
                    w: "2.5",
                    h: "2.5",
                    rounded: "stud",
                    boxShadow: "stud",
                  })}
                  style={{
                    background: i === 0 ? game.accent : "rgba(255,255,255,0.08)",
                  }}
                />
              ))}
            </div>
          </article>
        ))}
      </div>
    </main>
  );
}
