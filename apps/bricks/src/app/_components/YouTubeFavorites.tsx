"use client";

import { useCallback, useEffect, useState } from "react";
import { css } from "styled-system/css";
import { useSession } from "@/lib/auth-client";
import { VideoEmbed } from "./VideoEmbed";

interface SavedVideo {
  id: number;
  videoId: string;
  title: string;
  channelName: string;
  thumbnailUrl: string | null;
  url: string;
  createdAt: string;
}

const SAMPLE_URL = "https://youtu.be/1_pJn4mcPzY";

export function YouTubeFavorites() {
  const { data: session, isPending } = useSession();
  const [items, setItems] = useState<SavedVideo[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [url, setUrl] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [loaded, setLoaded] = useState(false);

  const load = useCallback(async () => {
    const res = await fetch("/api/videos");
    if (res.ok) {
      const data = await res.json();
      const list: SavedVideo[] = data.items ?? [];
      setItems(list);
      setSelectedId((cur) => cur ?? list[0]?.videoId ?? null);
    }
    setLoaded(true);
  }, []);

  useEffect(() => {
    if (session) load();
  }, [session, load]);

  async function handleAdd(overrideUrl?: string) {
    const toAdd = (overrideUrl ?? url).trim();
    if (!toAdd) return;
    setAdding(true);
    setError(null);
    try {
      const res = await fetch("/api/videos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: toAdd }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed to save");
      } else {
        if (!overrideUrl) setUrl("");
        if (data.item?.videoId) setSelectedId(data.item.videoId);
        load();
      }
    } catch {
      setError("Network error");
    } finally {
      setAdding(false);
    }
  }

  async function handleRemove(videoId: string) {
    await fetch("/api/videos", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ videoId }),
    });
    if (selectedId === videoId) setSelectedId(null);
    load();
  }

  if (isPending) {
    return (
      <p className={css({ fontSize: "sm", color: "ink.muted", mt: "6" })}>
        Loading…
      </p>
    );
  }

  if (!session) {
    return (
      <p className={css({ fontSize: "sm", color: "ink.muted", mt: "6" })}>
        Sign in to save favorite videos.
      </p>
    );
  }

  const selected = items.find((v) => v.videoId === selectedId) ?? items[0];

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
        Paste any YouTube URL — saved to your account. Click a row to play it above.
      </p>

      {selected && (
        <div className={css({ mb: "5" })}>
          <VideoEmbed videoId={selected.videoId} />
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
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleAdd()}
          placeholder="https://youtu.be/…"
          disabled={adding}
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
          onClick={() => handleAdd()}
          disabled={adding || !url.trim()}
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
          {adding ? "Saving…" : "Add"}
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
        {loaded && items.length === 0 && (
          <div
            className={css({
              bg: "plate.surface",
              rounded: "brick",
              border: "2px dashed",
              borderColor: "plate.border",
              px: "4",
              py: "5",
              display: "flex",
              flexDir: "column",
              gap: "3",
              alignItems: "flex-start",
            })}
          >
            <p className={css({ fontSize: "sm", color: "ink.faint" })}>
              No favorites yet. Paste a YouTube URL above, or add the sample:
            </p>
            <button
              onClick={() => handleAdd(SAMPLE_URL)}
              disabled={adding}
              className={css({
                fontSize: "xs",
                fontWeight: "700",
                fontFamily: "display",
                color: "ink.primary",
                bg: "transparent",
                border: "1.5px solid",
                borderColor: "plate.border",
                cursor: "pointer",
                px: "3",
                py: "1.5",
                rounded: "brick",
                transition: "all 0.15s ease",
                _hover: { borderColor: "plate.borderHover" },
                _disabled: { opacity: 0.5, cursor: "not-allowed" },
              })}
            >
              + Add {SAMPLE_URL}
            </button>
          </div>
        )}
        {items.map((vid) => {
          const active = vid.videoId === (selected?.videoId ?? null);
          return (
            <div
              key={vid.id}
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
                onClick={() => setSelectedId(vid.videoId)}
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
                  src={vid.thumbnailUrl ?? `https://i.ytimg.com/vi/${vid.videoId}/mqdefault.jpg`}
                  alt={vid.title}
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
                onClick={() => setSelectedId(vid.videoId)}
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
                  {vid.title}
                </span>
                <span
                  className={css({
                    fontSize: "xs",
                    color: "ink.muted",
                  })}
                >
                  {vid.channelName || `youtu.be/${vid.videoId}`}
                </span>
              </button>

              <a
                href={vid.url}
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
                onClick={() => handleRemove(vid.videoId)}
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
