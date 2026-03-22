"use client";

import { useState, useCallback } from "react";
import Link from "next/link";
import { css } from "styled-system/css";

export interface Part {
  partNum: string;
  name: string;
  color: string;
  qty: number;
  imageUrl?: string;
}

interface PartsEditorProps {
  mocId: string;
  initialParts: Part[];
}

const LEGO_COLORS = ["#E3000B", "#FFD500", "#006CB7", "#00852B", "#FE8A18"];

export function PartsEditor({ mocId, initialParts }: PartsEditorProps) {
  const [parts, setParts] = useState<Part[]>(initialParts);
  const [partNum, setPartNum] = useState("");
  const [color, setColor] = useState("");
  const [qty, setQty] = useState(1);
  const [adding, setAdding] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const saveParts = useCallback(
    async (newParts: Part[]) => {
      setSaving(true);
      try {
        await fetch(`/api/favorites/${mocId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ parts: newParts }),
        });
        setSaved(true);
      } finally {
        setSaving(false);
      }
    },
    [mocId]
  );

  async function handleAdd() {
    const trimmed = partNum.trim();
    if (!trimmed) return;
    setAdding(true);
    setError(null);

    try {
      // Look up part from Rebrickable API
      const res = await fetch(`/api/parts/${encodeURIComponent(trimmed)}`);
      let name = trimmed;
      let imageUrl: string | undefined;

      if (res.ok) {
        const data = await res.json();
        name = data.name || trimmed;
        imageUrl = data.imageUrl || undefined;
      }

      const newPart: Part = {
        partNum: trimmed,
        name,
        color: color.trim() || "Any",
        qty,
        imageUrl,
      };

      const newParts = [...parts, newPart];
      setParts(newParts);
      setSaved(false);
      setPartNum("");
      setColor("");
      setQty(1);

      await saveParts(newParts);
    } catch {
      setError("Failed to add part");
    } finally {
      setAdding(false);
    }
  }

  async function handleRemove(index: number) {
    const newParts = parts.filter((_, i) => i !== index);
    setParts(newParts);
    await saveParts(newParts);
  }

  async function handleQtyChange(index: number, newQty: number) {
    if (newQty < 1) return;
    const newParts = parts.map((p, i) => (i === index ? { ...p, qty: newQty } : p));
    setParts(newParts);
    setSaved(false);
    await saveParts(newParts);
  }

  return (
    <div
      className={css({
        mt: "6",
        bg: "plate.surface",
        rounded: "brick",
        border: "2px solid",
        borderColor: "plate.border",
        boxShadow: "brick",
        p: "6",
      })}
    >
      <div className={css({ display: "flex", alignItems: "center", justifyContent: "space-between", mb: "4" })}>
        <h2
          className={css({
            fontSize: "sm",
            fontWeight: "900",
            fontFamily: "display",
            letterSpacing: "0.08em",
            textTransform: "uppercase",
            color: "ink.muted",
          })}
        >
          Parts List
        </h2>
        {parts.length > 0 && (
          <span className={css({ fontSize: "xs", color: "ink.faint", fontWeight: "700", fontFamily: "display" })}>
            {parts.reduce((sum, p) => sum + p.qty, 0)} pieces
            {saving ? " — saving..." : saved ? "" : " — unsaved"}
          </span>
        )}
      </div>

      {/* Add part form */}
      <div
        className={css({
          display: "flex",
          gap: "2",
          flexWrap: "wrap",
          bg: "plate.raised",
          rounded: "lg",
          border: "1.5px solid",
          borderColor: "plate.border",
          p: "2",
          mb: "4",
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
            px: "4",
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
        <p className={css({ mb: "3", fontSize: "sm", fontWeight: "500", color: "#FF6B6B" })}>
          {error}
        </p>
      )}

      {/* Parts table */}
      {parts.length === 0 ? (
        <p className={css({ fontSize: "sm", color: "ink.faint" })}>
          No parts yet. Enter a Rebrickable part number above to add one.
        </p>
      ) : (
        <div className={css({ display: "flex", flexDir: "column", gap: "2" })}>
          {parts.map((part, i) => (
            <div
              key={`${part.partNum}-${i}`}
              className={css({
                display: "flex",
                alignItems: "center",
                gap: "3",
                bg: "plate.raised",
                rounded: "lg",
                border: "1px solid",
                borderColor: "plate.border",
                px: "3",
                py: "2",
              })}
            >
              {/* Part image + info — clickable link */}
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
                      w: "10",
                      h: "10",
                      objectFit: "contain",
                      rounded: "md",
                      bg: "white",
                      flexShrink: 0,
                    })}
                  />
                ) : (
                  <div
                    className={css({
                      w: "10",
                      h: "10",
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
                  onClick={() => handleQtyChange(i, part.qty - 1)}
                  className={css({
                    w: "6",
                    h: "6",
                    rounded: "stud",
                    bg: "plate.surface",
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
                  onClick={() => handleQtyChange(i, part.qty + 1)}
                  className={css({
                    w: "6",
                    h: "6",
                    rounded: "stud",
                    bg: "plate.surface",
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

              {/* Remove */}
              <button
                onClick={() => handleRemove(i)}
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
    </div>
  );
}
