"use client";

import { useState, useEffect, useCallback } from "react";
import { css } from "styled-system/css";
import { useSession } from "@/lib/auth-client";

interface Theme {
  id: number;
  slug: string;
  name: string;
  description: string | null;
  itemCount: number;
  createdAt: string;
}

function slugify(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function Themes() {
  const { data: session } = useSession();
  const [items, setItems] = useState<Theme[]>([]);
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [slugDirty, setSlugDirty] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);

  const load = useCallback(async () => {
    const res = await fetch("/api/themes");
    if (res.ok) {
      const data = await res.json();
      setItems(data.items);
    }
  }, []);

  useEffect(() => {
    if (session) load();
  }, [session, load]);

  function onNameChange(value: string) {
    setName(value);
    if (!slugDirty) setSlug(slugify(value));
  }

  function onSlugChange(value: string) {
    setSlug(value.toLowerCase());
    setSlugDirty(true);
  }

  async function handleAdd() {
    if (!name.trim() || !slug.trim()) return;
    setAdding(true);
    setError(null);
    try {
      const res = await fetch("/api/themes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, slug }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error);
      } else {
        setName("");
        setSlug("");
        setSlugDirty(false);
        load();
      }
    } catch {
      setError("Network error");
    } finally {
      setAdding(false);
    }
  }

  if (!session) return null;

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
        Themes
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
          type="text"
          value={name}
          onChange={(e) => onNameChange(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleAdd()}
          placeholder="Theme name (e.g., Dragons)"
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
        <input
          type="text"
          value={slug}
          onChange={(e) => onSlugChange(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleAdd()}
          placeholder="slug (e.g., dragon)"
          disabled={adding}
          className={css({
            w: "32",
            bg: "transparent",
            px: "3",
            py: "2",
            fontSize: "sm",
            color: "ink.primary",
            outline: "none",
            border: "none",
            borderLeft: "2px solid",
            borderLeftColor: "plate.border",
            _placeholder: { color: "ink.faint" },
          })}
        />
        <button
          onClick={handleAdd}
          disabled={adding || !name.trim() || !slug.trim()}
          className={css({
            rounded: "lg",
            bg: "lego.orange",
            px: "5",
            py: "2",
            fontSize: "sm",
            fontWeight: "800",
            fontFamily: "display",
            color: "white",
            cursor: "pointer",
            transition: "all 0.15s ease",
            boxShadow:
              "inset 0 1px 0 rgba(255,255,255,0.2), 0 2px 0 #B05E00, 0 3px 6px rgba(0,0,0,0.3)",
            _hover: {
              bg: "#FF9A2E",
              transform: "translateY(-1px)",
            },
            _disabled: { opacity: 0.5, cursor: "not-allowed" },
          })}
        >
          {adding ? "Adding..." : "Add theme"}
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
            No themes yet. Create one above to group related MOCs and sets.
          </p>
        )}
        {items.map((theme) => (
          <a
            key={theme.id}
            href={`/favorites/themes/${theme.slug}`}
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
              textDecoration: "none",
              transition: "all 0.15s ease",
              _hover: {
                borderColor: "lego.orange",
                boxShadow: "brick",
              },
            })}
          >
            <div className={css({ flex: 1, minW: 0 })}>
              <span
                className={css({
                  fontSize: "sm",
                  fontWeight: "700",
                  fontFamily: "display",
                  color: "ink.primary",
                  display: "block",
                })}
              >
                {theme.name}
              </span>
              <span className={css({ fontSize: "xs", color: "ink.muted" })}>
                /{theme.slug} · {theme.itemCount}{" "}
                {theme.itemCount === 1 ? "item" : "items"}
              </span>
            </div>
          </a>
        ))}
      </div>
    </section>
  );
}
