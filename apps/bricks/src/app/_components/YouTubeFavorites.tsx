"use client";

import { useState } from "react";
import { css } from "styled-system/css";
import { VideoEmbed } from "./VideoEmbed";

type YTFav = {
  id: string;
  title: string;
  note?: string;
};

const INITIAL_FAVS: YTFav[] = [
  {
    id: "1_pJn4mcPzY",
    title: "Saved video",
    note: "https://youtu.be/1_pJn4mcPzY",
  },
];

const YT_ID_RE = /(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|shorts\/))([A-Za-z0-9_-]{11})/;

function parseYouTubeId(input: string): string | null {
  const trimmed = input.trim();
  if (/^[A-Za-z0-9_-]{11}$/.test(trimmed)) return trimmed;
  const m = trimmed.match(YT_ID_RE);
  return m ? m[1] : null;
}

export function YouTubeFavorites() {
  const [favs, setFavs] = useState<YTFav[]>(INITIAL_FAVS);
  const [selectedId, setSelectedId] = useState<string>(INITIAL_FAVS[0]?.id ?? "");
  const [input, setInput] = useState("");
  const [error, setError] = useState<string | null>(null);

  const selected = favs.find((f) => f.id === selectedId) ?? favs[0];

  function handleAdd() {
    const id = parseYouTubeId(input);
    if (!id) {
      setError("Paste a YouTube URL or 11-char ID.");
      return;
    }
    if (favs.some((f) => f.id === id)) {
      setError("Already in favorites.");
      return;
    }
    const next: YTFav = { id, title: "Saved video", note: input.trim() };
    setFavs((prev) => [next, ...prev]);
    setSelectedId(id);
    setInput("");
    setError(null);
  }

  function handleRemove(id: string) {
    setFavs((prev) => {
      const next = prev.filter((f) => f.id !== id);
      if (id === selectedId) setSelectedId(next[0]?.id ?? "");
      return next;
    });
  }

  return (
    <section className={css({ mt: "2" })}>
      <h2
        className={css({
          fontSize: "xl",
          fontWeight: "900",
          fontFamily: "display",
          letterSpacing: "-0.02em",
          color: "ink.primary",
          mb: "2",
        })}
      >
        YouTube Favorites
      </h2>
      <p className={css({ fontSize: "sm", color: "ink.muted", mb: "5" })}>
        Paste any YouTube URL and save it. Click a row to play it above.
      </p>

      {selected && (
        <div className={css({ mb: "5" })}>
          <VideoEmbed videoId={selected.id} />
        </div>
      )}

      <div
        className={css({
          display: "flex",
          gap: "2",
          bg: "plate.surface",
          rounded: "brick",
          border: "2px solid",
          borderColor: "plate.border",
          p: "2",
          boxShadow: "brick",
          _focusWithin: {
            borderColor: "lego.orange",
            boxShadow: "brick.hover",
          },
        })}
      >
        <input
          type="url"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleAdd()}
          placeholder="https://youtu.be/…"
          className={css({
            flex: 1,
            bg: "transparent",
            px: "3",
            py: "2",
            fontSize: "sm",
            color: "ink.primary",
            outline: "none",
            border: "none",
            _placeholder: { color: "ink.faint" },
          })}
        />
        <button
          onClick={handleAdd}
          disabled={!input.trim()}
          className={css({
            rounded: "lg",
            bg: "lego.blue",
            px: "5",
            py: "2",
            fontSize: "sm",
            fontWeight: "800",
            fontFamily: "display",
            color: "white",
            border: "none",
            cursor: "pointer",
            transition: "all 0.15s ease",
            boxShadow:
              "inset 0 1px 0 rgba(255,255,255,0.2), 0 2px 0 #004A80, 0 3px 6px rgba(0,0,0,0.3)",
            _hover: { bg: "#0080D0", transform: "translateY(-1px)" },
            _disabled: { opacity: 0.5, cursor: "not-allowed", transform: "none" },
          })}
        >
          Add
        </button>
      </div>

      {error && (
        <p
          className={css({
            mt: "2",
            fontSize: "sm",
            fontWeight: "500",
            color: "#FF6B6B",
          })}
        >
          {error}
        </p>
      )}

      <div className={css({ mt: "4", display: "flex", flexDir: "column", gap: "2" })}>
        {favs.length === 0 && (
          <p className={css({ fontSize: "sm", color: "ink.faint" })}>
            No favorites yet. Paste a YouTube URL above.
          </p>
        )}
        {favs.map((fav) => {
          const active = fav.id === selectedId;
          return (
            <div
              key={fav.id}
              className={css({
                display: "flex",
                alignItems: "center",
                gap: "3",
                bg: "plate.surface",
                rounded: "brick",
                border: "2px solid",
                borderColor: active ? "lego.orange" : "plate.border",
                px: "3",
                py: "2",
                transition: "all 0.15s ease",
                _hover: {
                  borderColor: active ? "lego.orange" : "plate.borderHover",
                  boxShadow: "brick",
                },
              })}
            >
              <button
                onClick={() => setSelectedId(fav.id)}
                className={css({
                  flexShrink: 0,
                  p: 0,
                  border: "none",
                  bg: "transparent",
                  cursor: "pointer",
                  rounded: "lg",
                  overflow: "hidden",
                })}
              >
                <img
                  src={`https://i.ytimg.com/vi/${fav.id}/mqdefault.jpg`}
                  alt={fav.title}
                  className={css({
                    w: "28",
                    h: "16",
                    objectFit: "cover",
                    rounded: "lg",
                    border: "2px solid",
                    borderColor: active ? "lego.orange" : "plate.border",
                    display: "block",
                  })}
                />
              </button>

              <button
                onClick={() => setSelectedId(fav.id)}
                className={css({
                  flex: 1,
                  minW: 0,
                  textAlign: "left",
                  bg: "transparent",
                  border: "none",
                  cursor: "pointer",
                  p: 0,
                })}
              >
                <span
                  className={css({
                    display: "block",
                    fontSize: "sm",
                    fontWeight: "700",
                    fontFamily: "display",
                    color: "ink.primary",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  })}
                >
                  {fav.title}
                </span>
                <span
                  className={css({
                    fontSize: "xs",
                    color: "ink.muted",
                    fontFamily: "mono",
                  })}
                >
                  {fav.note ?? `youtu.be/${fav.id}`}
                </span>
              </button>

              <a
                href={`https://youtu.be/${fav.id}`}
                target="_blank"
                rel="noopener noreferrer"
                className={css({
                  fontSize: "xs",
                  fontWeight: "700",
                  fontFamily: "display",
                  color: "ink.secondary",
                  bg: "transparent",
                  border: "1.5px solid",
                  borderColor: "plate.border",
                  textDecoration: "none",
                  px: "3",
                  py: "1.5",
                  rounded: "brick",
                  transition: "all 0.15s ease",
                  flexShrink: 0,
                  _hover: { borderColor: "plate.borderHover", color: "ink.primary" },
                })}
              >
                Open
              </a>
              <button
                onClick={() => handleRemove(fav.id)}
                className={css({
                  fontSize: "xs",
                  fontWeight: "700",
                  fontFamily: "display",
                  color: "ink.faint",
                  bg: "transparent",
                  border: "1.5px solid",
                  borderColor: "plate.border",
                  cursor: "pointer",
                  px: "3",
                  py: "1.5",
                  rounded: "brick",
                  transition: "all 0.15s ease",
                  flexShrink: 0,
                  _hover: {
                    color: "lego.red",
                    borderColor: "rgba(227,0,11,0.3)",
                    bg: "rgba(227,0,11,0.06)",
                  },
                })}
              >
                Remove
              </button>
            </div>
          );
        })}
      </div>
    </section>
  );
}
