"use client";

import { useState, useEffect, useCallback } from "react";
import { css } from "styled-system/css";
import { useSession } from "@/lib/auth-client";
import { mocImageUrl } from "@/lib/moc-image";

interface Favorite {
  id: number;
  mocId: string;
  designer: string;
  name: string;
  url: string;
  createdAt: string;
}

const LEGO_COLORS = ["#E3000B", "#FFD500", "#006CB7", "#00852B", "#FE8A18"];

export function Favorites() {
  const { data: session } = useSession();
  const [items, setItems] = useState<Favorite[]>([]);
  const [url, setUrl] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);

  const load = useCallback(async () => {
    const res = await fetch("/api/favorites");
    if (res.ok) {
      const data = await res.json();
      setItems(data.items);
    }
  }, []);

  useEffect(() => {
    if (session) load();
  }, [session, load]);

  async function handleAdd() {
    if (!url.trim()) return;
    setAdding(true);
    setError(null);
    try {
      const res = await fetch("/api/favorites", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error);
      } else {
        setUrl("");
        load();
      }
    } catch {
      setError("Network error");
    } finally {
      setAdding(false);
    }
  }

  async function handleRemove(mocId: string) {
    await fetch("/api/favorites", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mocId }),
    });
    load();
  }

  if (!session) {
    return (
      <p className={css({ fontSize: "sm", color: "ink.muted", mt: "6" })}>
        Sign in to save favorite MOCs.
      </p>
    );
  }

  return (
    <section className={css({ mt: "10" })}>
      <h2
        className={css({
          fontSize: "xl",
          fontWeight: "900",
          fontFamily: "display",
          letterSpacing: "-0.02em",
          color: "ink.primary",
          mb: "4",
        })}
      >
        Favorite MOCs
      </h2>

      {/* Add form */}
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
          transition: "all 0.2s ease",
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
          placeholder="https://rebrickable.com/mocs/MOC-..."
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
          onClick={handleAdd}
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
            cursor: "pointer",
            transition: "all 0.15s ease",
            boxShadow:
              "inset 0 1px 0 rgba(255,255,255,0.2), 0 2px 0 #004A80, 0 3px 6px rgba(0,0,0,0.3)",
            _hover: {
              bg: "#0080D0",
              transform: "translateY(-1px)",
            },
            _disabled: { opacity: 0.5, cursor: "not-allowed" },
          })}
        >
          {adding ? "Adding..." : "Add"}
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

      {/* List */}
      <div className={css({ mt: "4", display: "flex", flexDir: "column", gap: "2" })}>
        {items.length === 0 && (
          <p className={css({ fontSize: "sm", color: "ink.faint" })}>
            No favorites yet. Paste a Rebrickable MOC URL above.
          </p>
        )}
        {items.map((fav, i) => (
          <div
            key={fav.id}
            className={css({
              display: "flex",
              alignItems: "center",
              gap: "3",
              bg: "plate.surface",
              rounded: "brick",
              border: "2px solid",
              borderColor: "plate.border",
              px: "4",
              py: "3",
              transition: "all 0.15s ease",
              _hover: {
                borderColor: "plate.borderHover",
                boxShadow: "brick",
              },
            })}
          >
            {/* Thumbnail */}
            <a
              href={`/favorites/${fav.mocId}`}
              className={css({ flexShrink: 0 })}
            >
              <img
                src={mocImageUrl(fav.mocId)}
                alt={fav.name}
                className={css({
                  w: "32",
                  h: "32",
                  objectFit: "cover",
                  rounded: "lg",
                  border: "2px solid",
                  borderColor: "plate.border",
                  transition: "border-color 0.15s ease",
                  _hover: { borderColor: "lego.orange" },
                })}
              />
            </a>

            {/* Info */}
            <div className={css({ flex: 1, minW: 0 })}>
              <a
                href={`/favorites/${fav.mocId}`}
                className={css({
                  fontSize: "sm",
                  fontWeight: "700",
                  fontFamily: "display",
                  color: "ink.primary",
                  textDecoration: "none",
                  _hover: { color: "lego.orange" },
                  display: "block",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                })}
              >
                {fav.name}
              </a>
              <span
                className={css({
                  fontSize: "xs",
                  color: "ink.muted",
                })}
              >
                by {fav.designer} / {fav.mocId}
              </span>
            </div>

            {/* Remove */}
            <button
              onClick={() => handleRemove(fav.mocId)}
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
        ))}
      </div>
    </section>
  );
}
