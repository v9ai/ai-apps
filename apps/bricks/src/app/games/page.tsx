"use client";

import Link from "next/link";
import { css } from "styled-system/css";
import { GAMES, type GameCard } from "@/lib/games";

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
          <GameTile key={game.title} game={game} />
        ))}
      </div>
    </main>
  );
}

function GameTile({ game }: { game: GameCard }) {
  const playable = Boolean(game.href);

  const card = (
    <>
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
          color: playable ? "white" : "ink.faint",
          bg: playable ? "lego.orange" : "plate.raised",
          border: "1px solid",
          borderColor: playable ? "lego.orange" : "plate.border",
          rounded: "brick",
          px: "2",
          py: "0.5",
        })}
      >
        {playable ? "Play" : "Coming soon"}
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
    </>
  );

  const baseStyles = css({
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
    textDecoration: "none",
    transition: "transform 0.15s ease, border-color 0.15s ease",
  });

  if (game.href) {
    return (
      <Link
        href={game.href}
        className={`${baseStyles} ${css({ _hover: { borderColor: "plate.borderHover", transform: "translateY(-2px)" } })}`}
      >
        {card}
      </Link>
    );
  }

  return <article className={baseStyles}>{card}</article>;
}
