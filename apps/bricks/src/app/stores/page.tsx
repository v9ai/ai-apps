"use client";

import { useState, useEffect, useCallback } from "react";
import { css } from "styled-system/css";
import { useSession } from "@/lib/auth-client";

interface Store {
  id: number;
  storeName: string;
  url: string;
  notes: string | null;
}

const LEGO_COLORS = ["#E3000B", "#FFD500", "#006CB7", "#00852B", "#FE8A18"];

export default function StoresPage() {
  const { data: session, isPending } = useSession();
  const [stores, setStores] = useState<Store[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [storeName, setStoreName] = useState("");
  const [url, setUrl] = useState("");
  const [notes, setNotes] = useState("");
  const [adding, setAdding] = useState(false);

  const fetchStores = useCallback(async () => {
    const res = await fetch("/api/stores");
    if (res.ok) {
      const data = await res.json();
      setStores(data.stores);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    if (session) {
      fetchStores();
    } else {
      setLoading(false);
    }
  }, [session, fetchStores]);

  async function handleAdd() {
    const trimmedName = storeName.trim();
    const trimmedUrl = url.trim();
    if (!trimmedName || !trimmedUrl) return;
    setAdding(true);
    setError(null);

    try {
      const res = await fetch("/api/stores", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          storeName: trimmedName,
          url: trimmedUrl,
          notes: notes.trim() || null,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Failed to add store");
      } else {
        const data = await res.json();
        if (data.alreadyExists) {
          setError("Store already in your favorites");
        } else {
          setStoreName("");
          setUrl("");
          setNotes("");
          await fetchStores();
        }
      }
    } catch {
      setError("Failed to add store");
    } finally {
      setAdding(false);
    }
  }

  async function handleRemove(id: number) {
    setStores((prev) => prev.filter((s) => s.id !== id));
    await fetch("/api/stores", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
  }

  if (isPending || loading) {
    return (
      <main className={css({ mx: "auto", maxW: "4xl", px: "4", py: "16", textAlign: "center" })}>
        <div
          className={css({
            mx: "auto",
            w: "12",
            h: "12",
            rounded: "stud",
            bg: "lego.orange",
            boxShadow: "stud",
            animation: "spin 1s linear infinite",
          })}
        />
      </main>
    );
  }

  if (!session) {
    return (
      <main className={css({ mx: "auto", maxW: "4xl", px: "4", py: "16", textAlign: "center" })}>
        <p className={css({ fontSize: "md", color: "ink.muted" })}>
          <a href="/login" className={css({ color: "lego.orange", fontWeight: "700", textDecoration: "none" })}>
            Sign in
          </a>{" "}
          to manage your favorite stores.
        </p>
      </main>
    );
  }

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
          Favorite Stores
        </h1>
        <p className={css({ mt: "1", fontSize: "sm", color: "ink.muted" })}>
          BrickLink stores you want to keep an eye on
          {stores.length > 0 && <> &mdash; {stores.length} saved</>}
        </p>
      </div>

      {/* Add store form */}
      <div
        className={css({
          display: "flex",
          gap: "2",
          flexWrap: "wrap",
          bg: "plate.surface",
          rounded: "brick",
          border: "2px solid",
          borderColor: "plate.border",
          boxShadow: "brick",
          p: "3",
          mb: "6",
          _focusWithin: { borderColor: "lego.orange" },
        })}
      >
        <input
          value={storeName}
          onChange={(e) => setStoreName(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleAdd()}
          placeholder="Store name"
          className={css({
            flex: "1",
            minW: "140px",
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
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleAdd()}
          placeholder="Store URL"
          className={css({
            flex: "2",
            minW: "200px",
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
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleAdd()}
          placeholder="Notes (optional)"
          className={css({
            flex: "1",
            minW: "120px",
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
          disabled={adding || !storeName.trim() || !url.trim()}
          className={css({
            rounded: "lg",
            bg: "lego.green",
            px: "5",
            py: "2",
            fontSize: "sm",
            fontWeight: "800",
            fontFamily: "display",
            color: "white",
            cursor: "pointer",
            transition: "all 0.15s ease",
            flexShrink: 0,
            boxShadow:
              "inset 0 1px 0 rgba(255,255,255,0.2), 0 2px 0 #005A1B, 0 3px 6px rgba(0,0,0,0.3)",
            _hover: { bg: "#00A333", transform: "translateY(-1px)" },
            _disabled: { opacity: 0.5, cursor: "not-allowed" },
          })}
        >
          {adding ? "..." : "Add"}
        </button>
      </div>

      {error && (
        <div
          className={css({
            mb: "4",
            rounded: "brick",
            border: "2px solid",
            borderColor: "rgba(227, 0, 11, 0.3)",
            bg: "rgba(227, 0, 11, 0.08)",
            px: "4",
            py: "3",
            fontSize: "sm",
            fontWeight: "500",
            color: "#FF6B6B",
          })}
        >
          {error}
        </div>
      )}

      {/* Stores list */}
      {stores.length === 0 ? (
        <div
          className={css({
            textAlign: "center",
            py: "16",
            bg: "plate.surface",
            rounded: "brick",
            border: "2px solid",
            borderColor: "plate.border",
            boxShadow: "brick",
          })}
        >
          <div
            className={css({
              mx: "auto",
              w: "14",
              h: "14",
              rounded: "stud",
              bg: "lego.yellow",
              boxShadow: "stud",
              mb: "4",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "xl",
            })}
          >
            ?
          </div>
          <p className={css({ fontSize: "sm", color: "ink.muted" })}>
            No stores yet. Add your favorite BrickLink stores to keep track of them.
          </p>
        </div>
      ) : (
        <div className={css({ display: "flex", flexDir: "column", gap: "2" })}>
          {stores.map((store, i) => (
            <div
              key={store.id}
              className={css({
                display: "flex",
                alignItems: "center",
                gap: "3",
                bg: "plate.surface",
                rounded: "brick",
                border: "1px solid",
                borderColor: "plate.border",
                boxShadow: "plate",
                px: "3",
                py: "2.5",
                transition: "all 0.15s ease",
              })}
            >
              {/* Color stud */}
              <div
                className={css({
                  w: "10",
                  h: "10",
                  rounded: "stud",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                  fontSize: "sm",
                  fontWeight: "900",
                  fontFamily: "display",
                  color: "white",
                  boxShadow: "stud",
                })}
                style={{ background: LEGO_COLORS[i % LEGO_COLORS.length] }}
              >
                {store.storeName.charAt(0).toUpperCase()}
              </div>

              {/* Info */}
              <div className={css({ flex: 1, minW: 0 })}>
                <span
                  className={css({
                    fontSize: "sm",
                    fontWeight: "700",
                    fontFamily: "display",
                    color: "ink.primary",
                    display: "block",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  })}
                >
                  {store.storeName}
                </span>
                {store.notes && (
                  <span className={css({ fontSize: "xs", color: "ink.muted" })}>
                    {store.notes}
                  </span>
                )}
              </div>

              {/* Visit link */}
              <a
                href={store.url}
                target="_blank"
                rel="noopener noreferrer"
                className={css({
                  fontSize: "xs",
                  fontWeight: "700",
                  fontFamily: "display",
                  color: "lego.blue",
                  textDecoration: "none",
                  flexShrink: 0,
                  px: "3",
                  py: "1.5",
                  rounded: "brick",
                  border: "1px solid",
                  borderColor: "rgba(0,108,183,0.2)",
                  transition: "all 0.15s ease",
                  _hover: {
                    bg: "rgba(0,108,183,0.08)",
                    borderColor: "rgba(0,108,183,0.4)",
                  },
                })}
              >
                Visit Store
              </a>

              {/* Delete */}
              <button
                onClick={() => handleRemove(store.id)}
                className={css({
                  fontSize: "xs",
                  fontWeight: "700",
                  fontFamily: "display",
                  color: "ink.faint",
                  bg: "transparent",
                  border: "none",
                  cursor: "pointer",
                  px: "2",
                  py: "1",
                  rounded: "md",
                  transition: "color 0.15s",
                  flexShrink: 0,
                  _hover: { color: "lego.red" },
                })}
              >
                x
              </button>
            </div>
          ))}
        </div>
      )}
    </main>
  );
}
