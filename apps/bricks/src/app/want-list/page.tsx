"use client";

import { useState, useEffect, useCallback } from "react";
import { css } from "styled-system/css";
import { useSession } from "@/lib/auth-client";

type ItemType = "part" | "set" | "minifig";
type Status = "pending" | "purchased";

interface WantListItem {
  id: number;
  itemType: ItemType;
  itemNum: string;
  name: string;
  color: string;
  qty: number;
  price: number | null;
  url: string | null;
  imageUrl: string | null;
  notes: string | null;
  status: Status;
}

const TYPE_COLORS: Record<ItemType, string> = {
  part: "#E3000B",
  set: "#006CB7",
  minifig: "#00852B",
};

const TYPE_LABELS: Record<ItemType, string> = {
  part: "Part",
  set: "Set",
  minifig: "Minifig",
};

function bricklinkUrl(item: WantListItem): string {
  if (item.url) return item.url;
  const param = item.itemType === "part" ? "P" : item.itemType === "set" ? "S" : "M";
  return `https://www.bricklink.com/v2/catalog/catalogitem.page?${param}=${encodeURIComponent(item.itemNum)}`;
}

function formatPrice(cents: number | null): string {
  if (cents == null) return "--";
  return `$${(cents / 100).toFixed(2)}`;
}

const LEGO_COLORS = ["#E3000B", "#FFD500", "#006CB7", "#00852B", "#FE8A18"];

export default function WantListPage() {
  const { data: session, isPending } = useSession();
  const [items, setItems] = useState<WantListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Form state
  const [itemType, setItemType] = useState<ItemType>("part");
  const [itemNum, setItemNum] = useState("");
  const [name, setName] = useState("");
  const [color, setColor] = useState("");
  const [qty, setQty] = useState(1);
  const [price, setPrice] = useState("");
  const [adding, setAdding] = useState(false);

  // Filters
  const [filterType, setFilterType] = useState<"all" | ItemType>("all");
  const [filterStatus, setFilterStatus] = useState<"all" | Status>("all");

  const fetchItems = useCallback(async () => {
    const res = await fetch("/api/want-list");
    if (res.ok) {
      const data = await res.json();
      setItems(data.items);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    if (session) {
      fetchItems();
    } else {
      setLoading(false);
    }
  }, [session, fetchItems]);

  async function handleAdd() {
    const trimmedNum = itemNum.trim();
    const trimmedName = name.trim();
    if (!trimmedNum || !trimmedName) return;
    setAdding(true);
    setError(null);

    try {
      const priceCents = price ? Math.round(parseFloat(price) * 100) : null;
      const res = await fetch("/api/want-list", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          itemType,
          itemNum: trimmedNum,
          name: trimmedName,
          color: itemType === "part" ? color.trim() : "",
          qty,
          price: priceCents,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Failed to add item");
      } else {
        const data = await res.json();
        if (data.alreadyExists) {
          setError("Item already in your want list");
        } else {
          setItemNum("");
          setName("");
          setColor("");
          setQty(1);
          setPrice("");
          await fetchItems();
        }
      }
    } catch {
      setError("Failed to add item");
    } finally {
      setAdding(false);
    }
  }

  async function handleRemove(id: number) {
    setItems((prev) => prev.filter((i) => i.id !== id));
    await fetch("/api/want-list", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
  }

  async function handleQtyChange(id: number, newQty: number) {
    if (newQty < 1) return;
    setItems((prev) => prev.map((i) => (i.id === id ? { ...i, qty: newQty } : i)));
    await fetch("/api/want-list", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, qty: newQty }),
    });
  }

  async function handleToggleStatus(item: WantListItem) {
    const newStatus: Status = item.status === "pending" ? "purchased" : "pending";
    setItems((prev) =>
      prev.map((i) => (i.id === item.id ? { ...i, status: newStatus } : i))
    );
    await fetch("/api/want-list", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: item.id, status: newStatus }),
    });
  }

  // Filtered items
  const filtered = items.filter((i) => {
    if (filterType !== "all" && i.itemType !== filterType) return false;
    if (filterStatus !== "all" && i.status !== filterStatus) return false;
    return true;
  });

  // Summary
  const pendingItems = items.filter((i) => i.status === "pending");
  const pendingTotal = pendingItems.reduce(
    (sum, i) => sum + (i.price ?? 0) * i.qty,
    0
  );

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
          to manage your want list.
        </p>
      </main>
    );
  }

  return (
    <main className={css({ mx: "auto", maxW: "4xl", px: "4", py: "12" })}>
      {/* Page header */}
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
          Want List
        </h1>
        <p className={css({ mt: "1", fontSize: "sm", color: "ink.muted" })}>
          Items you want to buy on BrickLink
          {items.length > 0 && (
            <>
              {" "}&mdash; {pendingItems.length} pending
              {pendingTotal > 0 && `, est. ${formatPrice(pendingTotal)}`}
            </>
          )}
        </p>
      </div>

      {/* Add item form */}
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
        <select
          value={itemType}
          onChange={(e) => setItemType(e.target.value as ItemType)}
          className={css({
            minW: "100px",
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
          <option value="part">Part</option>
          <option value="set">Set</option>
          <option value="minifig">Minifig</option>
        </select>
        <input
          value={itemNum}
          onChange={(e) => setItemNum(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleAdd()}
          placeholder="Item # (e.g. 3001, 75192-1)"
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
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleAdd()}
          placeholder="Name"
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
        {itemType === "part" && (
          <input
            value={color}
            onChange={(e) => setColor(e.target.value)}
            placeholder="Color"
            className={css({
              minW: "80px",
              flex: "0.5",
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
        )}
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
        <input
          value={price}
          onChange={(e) => setPrice(e.target.value)}
          placeholder="Price ($)"
          className={css({
            w: "80px",
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
          disabled={adding || !itemNum.trim() || !name.trim()}
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

      {/* Filter bar */}
      {items.length > 0 && (
        <div className={css({ display: "flex", gap: "2", mb: "4", flexWrap: "wrap" })}>
          <div className={css({ display: "flex", gap: "1" })}>
            {(["all", "part", "set", "minifig"] as const).map((t) => (
              <button
                key={t}
                onClick={() => setFilterType(t)}
                className={css({
                  px: "3",
                  py: "1",
                  rounded: "brick",
                  fontSize: "xs",
                  fontWeight: "700",
                  fontFamily: "display",
                  cursor: "pointer",
                  border: "none",
                  transition: "all 0.15s ease",
                  bg: filterType === t ? "lego.orange" : "plate.raised",
                  color: filterType === t ? "white" : "ink.secondary",
                  boxShadow: filterType === t ? "stud" : "none",
                  _hover: {
                    bg: filterType === t ? "lego.orange" : "plate.hover",
                  },
                })}
              >
                {t === "all" ? "All" : TYPE_LABELS[t] + "s"}
              </button>
            ))}
          </div>
          <div className={css({ display: "flex", gap: "1" })}>
            {(["all", "pending", "purchased"] as const).map((s) => (
              <button
                key={s}
                onClick={() => setFilterStatus(s)}
                className={css({
                  px: "3",
                  py: "1",
                  rounded: "brick",
                  fontSize: "xs",
                  fontWeight: "700",
                  fontFamily: "display",
                  cursor: "pointer",
                  border: "none",
                  transition: "all 0.15s ease",
                  bg: filterStatus === s ? "lego.orange" : "plate.raised",
                  color: filterStatus === s ? "white" : "ink.secondary",
                  boxShadow: filterStatus === s ? "stud" : "none",
                  _hover: {
                    bg: filterStatus === s ? "lego.orange" : "plate.hover",
                  },
                })}
              >
                {s === "all" ? "All" : s.charAt(0).toUpperCase() + s.slice(1)}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Items list */}
      {items.length === 0 ? (
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
            No items yet. Add LEGO parts, sets, or minifigs you want to buy on BrickLink.
          </p>
        </div>
      ) : filtered.length === 0 ? (
        <div
          className={css({
            textAlign: "center",
            py: "12",
            bg: "plate.surface",
            rounded: "brick",
            border: "2px solid",
            borderColor: "plate.border",
            boxShadow: "brick",
          })}
        >
          <p className={css({ fontSize: "sm", color: "ink.muted" })}>
            No items match the current filters.
          </p>
        </div>
      ) : (
        <div className={css({ display: "flex", flexDir: "column", gap: "2" })}>
          {filtered.map((item, i) => (
            <div
              key={item.id}
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
                opacity: item.status === "purchased" ? 0.5 : 1,
                transition: "opacity 0.15s",
              })}
            >
              {/* Type badge + image */}
              <div className={css({ display: "flex", alignItems: "center", gap: "2", flexShrink: 0 })}>
                <span
                  className={css({
                    display: "inline-block",
                    px: "1.5",
                    py: "0.5",
                    rounded: "md",
                    fontSize: "10px",
                    fontWeight: "700",
                    fontFamily: "display",
                  })}
                  style={{
                    backgroundColor: TYPE_COLORS[item.itemType] + "20",
                    color: TYPE_COLORS[item.itemType],
                  }}
                >
                  {TYPE_LABELS[item.itemType]}
                </span>
                {item.imageUrl ? (
                  <img
                    src={item.imageUrl}
                    alt={item.name}
                    className={css({
                      w: "10",
                      h: "10",
                      objectFit: "contain",
                      rounded: "lg",
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
                    {item.itemNum.slice(0, 5)}
                  </div>
                )}
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
                    textDecoration: item.status === "purchased" ? "line-through" : "none",
                  })}
                >
                  {item.name}
                </span>
                <span className={css({ fontSize: "xs", color: "ink.muted" })}>
                  #{item.itemNum}
                  {item.color && ` / ${item.color}`}
                  {item.notes && ` — ${item.notes}`}
                </span>
              </div>

              {/* BrickLink link */}
              <a
                href={bricklinkUrl(item)}
                target="_blank"
                rel="noopener noreferrer"
                className={css({
                  fontSize: "xs",
                  fontWeight: "700",
                  fontFamily: "display",
                  color: "lego.blue",
                  textDecoration: "none",
                  flexShrink: 0,
                  _hover: { textDecoration: "underline" },
                })}
              >
                BL
              </a>

              {/* Price */}
              <span
                className={css({
                  fontSize: "sm",
                  fontWeight: "700",
                  fontFamily: "display",
                  color: item.price != null ? "lego.green" : "ink.faint",
                  flexShrink: 0,
                  minW: "60px",
                  textAlign: "right",
                })}
              >
                {formatPrice(item.price != null ? item.price * item.qty : null)}
              </span>

              {/* Qty controls */}
              <div className={css({ display: "flex", alignItems: "center", gap: "1", flexShrink: 0 })}>
                <button
                  onClick={() => handleQtyChange(item.id, item.qty - 1)}
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
                  {item.qty}
                </span>
                <button
                  onClick={() => handleQtyChange(item.id, item.qty + 1)}
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

              {/* Status toggle */}
              <button
                onClick={() => handleToggleStatus(item)}
                className={css({
                  px: "2",
                  py: "1",
                  rounded: "brick",
                  fontSize: "10px",
                  fontWeight: "700",
                  fontFamily: "display",
                  cursor: "pointer",
                  border: "none",
                  transition: "all 0.15s ease",
                  flexShrink: 0,
                  bg: item.status === "purchased" ? "rgba(0,133,43,0.15)" : "rgba(254,138,24,0.15)",
                  color: item.status === "purchased" ? "#00852B" : "#FE8A18",
                  _hover: {
                    bg: item.status === "purchased" ? "rgba(0,133,43,0.25)" : "rgba(254,138,24,0.25)",
                  },
                })}
              >
                {item.status === "purchased" ? "Bought" : "Pending"}
              </button>

              {/* Delete */}
              <button
                onClick={() => handleRemove(item.id)}
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

      {/* Cost summary */}
      {pendingItems.length > 0 && pendingTotal > 0 && (
        <div
          className={css({
            mt: "6",
            bg: "plate.surface",
            rounded: "brick",
            border: "1px solid",
            borderColor: "plate.border",
            boxShadow: "plate",
            px: "4",
            py: "3",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          })}
        >
          <span className={css({ fontSize: "sm", color: "ink.muted" })}>
            {pendingItems.length} pending item{pendingItems.length !== 1 && "s"}
          </span>
          <span
            className={css({
              fontSize: "md",
              fontWeight: "800",
              fontFamily: "display",
              color: "lego.green",
            })}
          >
            Est. {formatPrice(pendingTotal)}
          </span>
        </div>
      )}
    </main>
  );
}
