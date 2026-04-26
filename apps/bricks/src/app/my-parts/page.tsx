"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { css } from "styled-system/css";
import { useSession } from "@/lib/auth-client";
import { HubType, hubDisplayName, hubColor } from "@/lib/parser";

interface UserHub {
  id: number;
  name: string;
  hubType: string;
  bleName: string;
}

const HUB_OPTIONS: { type: HubType; img: string; docs: string }[] = [
  { type: "CityHub", img: "/hubs/hub-city.png", docs: "https://docs.pybricks.com/en/latest/hubs/cityhub.html" },
  { type: "TechnicHub", img: "/hubs/hub-technic.png", docs: "https://docs.pybricks.com/en/latest/hubs/technichub.html" },
  { type: "MoveHub", img: "/hubs/hub-move.png", docs: "https://docs.pybricks.com/en/latest/hubs/movehub.html" },
  { type: "PrimeHub", img: "/hubs/hub-prime.png", docs: "https://docs.pybricks.com/en/latest/hubs/primehub.html" },
  { type: "EssentialHub", img: "/hubs/hub-essential.png", docs: "https://docs.pybricks.com/en/latest/hubs/essentialhub.html" },
];

interface UserPart {
  id: number;
  partNum: string;
  name: string;
  color: string;
  qty: number;
  imageUrl: string | null;
}

const LEGO_COLORS = ["#E3000B", "#FFD500", "#006CB7", "#00852B", "#FE8A18"];

export default function MyPartsPage() {
  const { data: session, isPending } = useSession();
  const [parts, setParts] = useState<UserPart[]>([]);
  const [loading, setLoading] = useState(true);
  const [partNum, setPartNum] = useState("");
  const [color, setColor] = useState("");
  const [qty, setQty] = useState(1);
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Hubs state
  const [hubs, setHubs] = useState<UserHub[]>([]);
  const [hubName, setHubName] = useState("");
  const [hubType, setHubType] = useState<HubType>("EssentialHub");
  const [hubBleName, setHubBleName] = useState("");
  const [addingHub, setAddingHub] = useState(false);
  const [hubError, setHubError] = useState<string | null>(null);

  const fetchParts = useCallback(async () => {
    const res = await fetch("/api/user-parts");
    if (res.ok) {
      const data = await res.json();
      setParts(data.items);
    }
    setLoading(false);
  }, []);

  const fetchHubs = useCallback(async () => {
    const res = await fetch("/api/hubs");
    if (res.ok) setHubs(await res.json());
  }, []);

  useEffect(() => {
    if (session) {
      fetchParts();
      fetchHubs();
    } else {
      setLoading(false);
    }
  }, [session, fetchParts, fetchHubs]);

  async function handleAdd() {
    const trimmed = partNum.trim();
    if (!trimmed) return;
    setAdding(true);
    setError(null);

    try {
      // Look up part from Rebrickable
      const lookupRes = await fetch(`/api/parts/${encodeURIComponent(trimmed)}`);
      let name = trimmed;
      let imageUrl: string | null = null;

      if (lookupRes.ok) {
        const data = await lookupRes.json();
        name = data.name || trimmed;
        imageUrl = data.imageUrl || null;
      }

      const res = await fetch("/api/user-parts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          partNum: trimmed,
          name,
          color: color.trim() || "Any",
          qty,
          imageUrl,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Failed to add part");
      } else {
        setPartNum("");
        setColor("");
        setQty(1);
        await fetchParts();
      }
    } catch {
      setError("Failed to add part");
    } finally {
      setAdding(false);
    }
  }

  async function handleRemove(id: number) {
    await fetch("/api/user-parts", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    setParts((prev) => prev.filter((p) => p.id !== id));
  }

  async function handleQtyChange(id: number, newQty: number) {
    if (newQty < 1) return;
    setParts((prev) => prev.map((p) => (p.id === id ? { ...p, qty: newQty } : p)));
    await fetch("/api/user-parts", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, qty: newQty }),
    });
  }

  async function handleAddHub() {
    const trimmed = hubName.trim();
    if (!trimmed) return;
    setAddingHub(true);
    setHubError(null);
    try {
      const res = await fetch("/api/hubs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: trimmed,
          hubType,
          bleName: hubBleName.trim(),
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        setHubError(data.error || "Failed to add hub");
      } else {
        setHubName("");
        setHubBleName("");
        await fetchHubs();
      }
    } catch {
      setHubError("Failed to add hub");
    } finally {
      setAddingHub(false);
    }
  }

  async function handleRemoveHub(id: number) {
    await fetch(`/api/hubs/${id}`, { method: "DELETE" });
    setHubs((prev) => prev.filter((h) => h.id !== id));
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
          to manage your parts collection.
        </p>
      </main>
    );
  }

  const totalPieces = parts.reduce((sum, p) => sum + p.qty, 0);

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
          My Parts
        </h1>
        <p className={css({ mt: "1", fontSize: "sm", color: "ink.muted" })}>
          Your personal LEGO parts inventory
          {parts.length > 0 && ` — ${parts.length} unique parts, ${totalPieces} pieces total`}
        </p>
      </div>

      {/* Add part form */}
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
          value={partNum}
          onChange={(e) => setPartNum(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleAdd()}
          placeholder="Part # (e.g. 3001)"
          className={css({
            flex: "2",
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
        <input
          value={color}
          onChange={(e) => setColor(e.target.value)}
          placeholder="Color"
          className={css({
            flex: "1",
            minW: "80px",
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
          type="number"
          min={1}
          value={qty}
          onChange={(e) => setQty(Math.max(1, parseInt(e.target.value) || 1))}
          className={css({
            w: "60px",
            bg: "transparent",
            px: "3",
            py: "2",
            fontSize: "sm",
            color: "ink.primary",
            outline: "none",
            border: "none",
            textAlign: "center",
          })}
        />
        <button
          onClick={handleAdd}
          disabled={adding || !partNum.trim()}
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
          {adding ? "..." : "Add Part"}
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

      {/* Parts list */}
      {parts.length === 0 ? (
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
            No parts yet. Add a Rebrickable part number above to start your collection.
          </p>
        </div>
      ) : (
        <div className={css({ display: "flex", flexDir: "column", gap: "2" })}>
          {parts.map((part, i) => (
            <div
              key={part.id}
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
              })}
            >
              <Link
                href={`/parts/${encodeURIComponent(part.partNum)}`}
                className={css({
                  display: "flex",
                  alignItems: "center",
                  gap: "3",
                  flex: 1,
                  minW: 0,
                  textDecoration: "none",
                  _hover: { "& span": { color: "lego.orange" } },
                })}
              >
                {part.imageUrl ? (
                  <img
                    src={part.imageUrl}
                    alt={part.name}
                    className={css({
                      w: "48",
                      h: "48",
                      objectFit: "contain",
                      rounded: "lg",
                      bg: "white",
                      flexShrink: 0,
                    })}
                  />
                ) : (
                  <div
                    className={css({
                      w: "48",
                      h: "48",
                      rounded: "stud",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0,
                      fontSize: "8px",
                      fontWeight: "900",
                      color: "white",
                      boxShadow: "stud",
                    })}
                    style={{ background: LEGO_COLORS[i % LEGO_COLORS.length] }}
                  >
                    {part.partNum}
                  </div>
                )}

                <div className={css({ minW: 0 })}>
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
                      transition: "color 0.15s",
                    })}
                  >
                    {part.name}
                  </span>
                  <span className={css({ fontSize: "xs", color: "ink.muted" })}>
                    #{part.partNum} / {part.color}
                  </span>
                </div>
              </Link>

              {/* Qty controls */}
              <div className={css({ display: "flex", alignItems: "center", gap: "1", flexShrink: 0 })}>
                <button
                  onClick={() => handleQtyChange(part.id, part.qty - 1)}
                  className={css({
                    w: "6",
                    h: "6",
                    rounded: "stud",
                    bg: "plate.raised",
                    border: "1px solid",
                    borderColor: "plate.border",
                    color: "ink.secondary",
                    cursor: "pointer",
                    fontSize: "sm",
                    fontWeight: "700",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    _hover: { bg: "plate.hover" },
                  })}
                >
                  -
                </button>
                <span
                  className={css({
                    w: "8",
                    textAlign: "center",
                    fontSize: "sm",
                    fontWeight: "800",
                    fontFamily: "display",
                    color: "ink.primary",
                  })}
                >
                  {part.qty}
                </span>
                <button
                  onClick={() => handleQtyChange(part.id, part.qty + 1)}
                  className={css({
                    w: "6",
                    h: "6",
                    rounded: "stud",
                    bg: "plate.raised",
                    border: "1px solid",
                    borderColor: "plate.border",
                    color: "ink.secondary",
                    cursor: "pointer",
                    fontSize: "sm",
                    fontWeight: "700",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    _hover: { bg: "plate.hover" },
                  })}
                >
                  +
                </button>
              </div>

              <button
                onClick={() => handleRemove(part.id)}
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

      {/* ── My Hubs ─────────────────────────────────────────────── */}
      <div className={css({ mt: "12", mb: "8" })}>
        <h2
          className={css({
            fontSize: "2xl",
            fontWeight: "900",
            fontFamily: "display",
            letterSpacing: "-0.03em",
            color: "ink.primary",
          })}
        >
          My Hubs
        </h2>
        <p className={css({ mt: "1", fontSize: "sm", color: "ink.muted" })}>
          Powered Up hubs you own
          {hubs.length > 0 && ` — ${hubs.length} hub${hubs.length > 1 ? "s" : ""}`}
        </p>
      </div>

      {/* Add hub form */}
      <div
        className={css({
          display: "flex",
          gap: "2",
          flexWrap: "wrap",
          alignItems: "center",
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
          value={hubName}
          onChange={(e) => setHubName(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleAddHub()}
          placeholder="Hub name (e.g. My Train Hub)"
          className={css({
            flex: "2",
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
        <select
          value={hubType}
          onChange={(e) => setHubType(e.target.value as HubType)}
          className={css({
            flex: "1",
            minW: "130px",
            bg: "transparent",
            px: "3",
            py: "2",
            fontSize: "sm",
            color: "ink.primary",
            outline: "none",
            border: "none",
            cursor: "pointer",
          })}
        >
          {HUB_OPTIONS.map((h) => (
            <option key={h.type} value={h.type}>
              {hubDisplayName(h.type)}
            </option>
          ))}
        </select>
        <input
          value={hubBleName}
          onChange={(e) => setHubBleName(e.target.value)}
          placeholder="BLE name (optional)"
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
          onClick={handleAddHub}
          disabled={addingHub || !hubName.trim()}
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
          {addingHub ? "..." : "Add Hub"}
        </button>
      </div>

      {hubError && (
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
          {hubError}
        </div>
      )}

      {/* Hub list */}
      {hubs.length === 0 ? (
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
              bg: "lego.blue",
              boxShadow: "stud",
              mb: "4",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "xl",
              color: "white",
            })}
          >
            ?
          </div>
          <p className={css({ fontSize: "sm", color: "ink.muted" })}>
            No hubs yet. Add your Powered Up hubs above.
          </p>
        </div>
      ) : (
        <div className={css({ display: "flex", flexDir: "column", gap: "2" })}>
          {hubs.map((hub) => {
            const opt = HUB_OPTIONS.find((h) => h.type === hub.hubType);
            const color = hubColor(hub.hubType as HubType);
            return (
              <div
                key={hub.id}
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
                })}
              >
                {opt ? (
                  <a
                    href={opt.docs}
                    target="_blank"
                    rel="noopener noreferrer"
                    title={`${hubDisplayName(hub.hubType as HubType)} — Pybricks docs`}
                    className={css({
                      flexShrink: 0,
                      display: "inline-flex",
                      transition: "transform 0.15s ease",
                      _hover: { transform: "translateY(-1px) scale(1.05)" },
                    })}
                  >
                    <img
                      src={opt.img}
                      alt={hub.hubType}
                      className={css({ w: "10", h: "10", objectFit: "contain" })}
                    />
                  </a>
                ) : (
                  <div
                    className={css({
                      w: "10",
                      h: "10",
                      rounded: "stud",
                      bg: "lego.blue",
                      boxShadow: "stud",
                      flexShrink: 0,
                    })}
                  />
                )}
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
                    {hub.name}
                  </span>
                  <span className={css({ fontSize: "xs", color: "ink.muted" })}>
                    <span
                      className={css({
                        display: "inline-block",
                        px: "1.5",
                        py: "0.5",
                        rounded: "md",
                        fontSize: "10px",
                        fontWeight: "700",
                        mr: "1",
                      })}
                      style={{ backgroundColor: color + "20", color }}
                    >
                      {hubDisplayName(hub.hubType as HubType)}
                    </span>
                    {hub.bleName && `BLE: ${hub.bleName}`}
                  </span>
                </div>
                <button
                  onClick={() => handleRemoveHub(hub.id)}
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
            );
          })}
        </div>
      )}
    </main>
  );
}
