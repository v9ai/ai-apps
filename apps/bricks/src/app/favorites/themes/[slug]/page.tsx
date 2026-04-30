"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { css } from "styled-system/css";
import { useSession } from "@/lib/auth-client";

interface Theme {
  id: number;
  slug: string;
  name: string;
  description: string | null;
  createdAt: string;
}

interface ThemeItem {
  id: number;
  themeId: number;
  kind: "moc" | "set";
  refId: string;
  name: string;
  imageUrl: string | null;
  url: string | null;
  designer: string | null;
  addedAt: string;
}

export default function ThemeDetailPage() {
  const { slug } = useParams<{ slug: string }>();
  const { data: session, isPending: authPending } = useSession();
  const [theme, setTheme] = useState<Theme | null>(null);
  const [items, setItems] = useState<ThemeItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  const [input, setInput] = useState("");
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch(`/api/themes/${slug}`);
    if (res.status === 404) {
      setNotFound(true);
      setLoading(false);
      return;
    }
    if (res.ok) {
      const data = await res.json();
      setTheme(data.theme);
      setItems(data.items);
    }
    setLoading(false);
  }, [slug]);

  useEffect(() => {
    if (session && slug) load();
  }, [session, slug, load]);

  async function handleAdd() {
    const trimmed = input.trim();
    if (!trimmed) return;
    setAdding(true);
    setError(null);

    const body: Record<string, string> = {};
    if (trimmed.includes("rebrickable.com")) {
      body.url = trimmed;
    } else if (/^MOC-\d+$/i.test(trimmed)) {
      body.kind = "moc";
      body.refId = trimmed.toUpperCase();
    } else {
      body.kind = "set";
      body.refId = trimmed;
    }

    try {
      const res = await fetch(`/api/themes/${slug}/items`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error);
      } else {
        setInput("");
        load();
      }
    } catch {
      setError("Network error");
    } finally {
      setAdding(false);
    }
  }

  async function handleRemove(item: ThemeItem) {
    await fetch(`/api/themes/${slug}/items`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ kind: item.kind, refId: item.refId }),
    });
    load();
  }

  if (authPending) {
    return (
      <main className={css({ mx: "auto", maxW: "4xl", px: "4", py: "12" })}>
        <p className={css({ fontSize: "sm", color: "ink.muted" })}>Loading...</p>
      </main>
    );
  }

  if (!session) {
    return (
      <main className={css({ mx: "auto", maxW: "4xl", px: "4", py: "12" })}>
        <p className={css({ fontSize: "sm", color: "ink.muted" })}>
          Sign in to view themes.
        </p>
      </main>
    );
  }

  if (notFound) {
    return (
      <main className={css({ mx: "auto", maxW: "4xl", px: "4", py: "12" })}>
        <Link
          href="/favorites"
          className={css({
            fontSize: "xs",
            fontWeight: "700",
            color: "ink.muted",
            textDecoration: "none",
            _hover: { color: "lego.orange" },
          })}
        >
          ← Favorites
        </Link>
        <h1
          className={css({
            mt: "4",
            fontSize: "2xl",
            fontWeight: "900",
            fontFamily: "display",
            color: "ink.primary",
          })}
        >
          Theme &quot;{slug}&quot; not found
        </h1>
        <p className={css({ mt: "2", fontSize: "sm", color: "ink.muted" })}>
          Create one from the Favorites page.
        </p>
      </main>
    );
  }

  if (loading || !theme) {
    return (
      <main className={css({ mx: "auto", maxW: "4xl", px: "4", py: "12" })}>
        <p className={css({ fontSize: "sm", color: "ink.muted" })}>Loading...</p>
      </main>
    );
  }

  return (
    <main className={css({ mx: "auto", maxW: "4xl", px: "4", py: "12" })}>
      <Link
        href="/favorites"
        className={css({
          fontSize: "xs",
          fontWeight: "700",
          color: "ink.muted",
          textDecoration: "none",
          _hover: { color: "lego.orange" },
        })}
      >
        ← Favorites
      </Link>

      <h1
        className={css({
          mt: "4",
          fontSize: "3xl",
          fontWeight: "900",
          fontFamily: "display",
          letterSpacing: "-0.02em",
          color: "ink.primary",
        })}
      >
        {theme.name}
      </h1>
      <p className={css({ mt: "1", fontSize: "sm", color: "ink.muted" })}>
        /{theme.slug} · {items.length} {items.length === 1 ? "item" : "items"}
      </p>

      {/* Add form */}
      <div
        className={css({
          mt: "6",
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
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleAdd()}
          placeholder="Rebrickable URL, MOC-12345, or set number (e.g., 75257-1)"
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
          disabled={adding || !input.trim()}
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

      {/* Items */}
      <div className={css({ mt: "6", display: "flex", flexDir: "column", gap: "2" })}>
        {items.length === 0 && (
          <p className={css({ fontSize: "sm", color: "ink.faint" })}>
            No items yet. Add a Rebrickable MOC URL or a set number above.
          </p>
        )}
        {items.map((item) => {
          const detailHref =
            item.kind === "moc" ? `/favorites/${item.refId}` : `/sets/${item.refId}`;
          return (
            <div
              key={item.id}
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
              <a href={detailHref} className={css({ flexShrink: 0 })}>
                {item.imageUrl ? (
                  <img
                    src={item.imageUrl}
                    alt={item.name}
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
                ) : (
                  <div
                    className={css({
                      w: "32",
                      h: "32",
                      rounded: "lg",
                      bg: "plate.base",
                      border: "2px solid",
                      borderColor: "plate.border",
                    })}
                  />
                )}
              </a>

              <div className={css({ flex: 1, minW: 0 })}>
                <a
                  href={detailHref}
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
                  {item.name}
                </a>
                <span className={css({ fontSize: "xs", color: "ink.muted" })}>
                  {item.kind.toUpperCase()} ·{" "}
                  {item.designer ? `by ${item.designer} · ` : ""}
                  {item.refId}
                </span>
              </div>

              <button
                onClick={() => handleRemove(item)}
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
    </main>
  );
}
