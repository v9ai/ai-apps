"use client";

import { useState, useMemo } from "react";
import { css } from "styled-system/css";
import { logos } from "./logos-data";

const LOGOS_PER_PAGE = 20;

export default function LogoPage() {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<number | null>(null);

  const filtered = useMemo(
    () =>
      logos.filter(
        (l) =>
          l.title.toLowerCase().includes(search.toLowerCase()) ||
          l.concept.toLowerCase().includes(search.toLowerCase())
      ),
    [search]
  );

  const totalPages = Math.ceil(filtered.length / LOGOS_PER_PAGE);
  const paginated = filtered.slice((page - 1) * LOGOS_PER_PAGE, page * LOGOS_PER_PAGE);
  const selectedLogo = selected !== null ? logos.find((l) => l.id === selected) : null;

  return (
    <div className={css({ minH: "100vh", bg: "#0a0a0f", color: "white", fontFamily: "system-ui, sans-serif" })}>
      {/* Header */}
      <div
        className={css({
          borderBottom: "1px solid rgba(255,255,255,0.08)",
          px: { base: "4", md: "10" },
          py: "8",
          background: "linear-gradient(180deg, rgba(99,102,241,0.08) 0%, transparent 100%)",
        })}
      >
        <div className={css({ maxW: "1400px", mx: "auto" })}>
          <div className={css({ display: "flex", alignItems: "center", gap: "3", mb: "2" })}>
            <span className={css({ fontSize: "11px", letterSpacing: "0.15em", color: "rgba(99,102,241,0.8)", textTransform: "uppercase", fontWeight: "600" })}>
              100 AGENTS · 100 DESIGNS
            </span>
          </div>
          <h1
            className={css({
              fontSize: { base: "32px", md: "52px" },
              fontWeight: "800",
              letterSpacing: "-0.03em",
              lineHeight: "1",
              mb: "3",
              background: "linear-gradient(135deg, #fff 0%, rgba(99,102,241,1) 50%, rgba(139,92,246,1) 100%)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
            })}
          >
            Agentic Lead Gen
          </h1>
          <p className={css({ color: "rgba(255,255,255,0.45)", fontSize: "15px", mb: "6", maxW: "480px" })}>
            100 parallel AI agents each designed a unique SVG logo. Every concept is distinct — from circuit neural networks to origami birds, quantum dots to chess strategy.
          </p>
          {/* Search */}
          <div className={css({ position: "relative", maxW: "360px" })}>
            <input
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              placeholder="Search concepts..."
              className={css({
                w: "100%",
                px: "4",
                py: "2.5",
                bg: "rgba(255,255,255,0.05)",
                border: "1px solid rgba(255,255,255,0.1)",
                borderRadius: "none",
                color: "white",
                fontSize: "14px",
                outline: "none",
                _placeholder: { color: "rgba(255,255,255,0.3)" },
                _focus: { borderColor: "rgba(99,102,241,0.6)", bg: "rgba(99,102,241,0.06)" },
              })}
            />
            <span className={css({ position: "absolute", right: "12px", top: "50%", transform: "translateY(-50%)", color: "rgba(255,255,255,0.25)", fontSize: "13px" })}>
              {filtered.length}
            </span>
          </div>
        </div>
      </div>

      {/* Grid */}
      <div className={css({ maxW: "1400px", mx: "auto", px: { base: "4", md: "10" }, py: "8" })}>
        <div
          className={css({
            display: "grid",
            gridTemplateColumns: { base: "repeat(2, 1fr)", sm: "repeat(3, 1fr)", md: "repeat(4, 1fr)", lg: "repeat(5, 1fr)" },
            gap: "3",
          })}
        >
          {paginated.map((logo) => (
            <button
              key={logo.id}
              onClick={() => setSelected(logo.id)}
              className={css({
                bg: "rgba(255,255,255,0.03)",
                border: "1px solid rgba(255,255,255,0.07)",
                borderRadius: "none",
                overflow: "hidden",
                cursor: "pointer",
                textAlign: "left",
                transition: "all 0.15s ease",
                _hover: {
                  bg: "rgba(99,102,241,0.08)",
                  borderColor: "rgba(99,102,241,0.35)",
                  transform: "translateY(-2px)",
                  boxShadow: "0 8px 24px rgba(99,102,241,0.15)",
                },
              })}
            >
              {/* SVG Preview */}
              <div
                className={css({
                  w: "100%",
                  aspectRatio: "3/2",
                  overflow: "hidden",
                  bg: "rgba(0,0,0,0.4)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                })}
                dangerouslySetInnerHTML={{ __html: logo.svg ?? "" }}
              />
              {/* Label */}
              <div className={css({ px: "3", py: "2.5" })}>
                <div className={css({ display: "flex", alignItems: "center", justifyContent: "space-between", mb: "0.5" })}>
                  <span className={css({ fontSize: "12px", fontWeight: "700", color: "rgba(255,255,255,0.9)", letterSpacing: "-0.01em" })}>
                    {logo.title}
                  </span>
                  <span className={css({ fontSize: "10px", color: "rgba(99,102,241,0.6)", fontWeight: "600" })}>
                    #{logo.id}
                  </span>
                </div>
                <p className={css({ fontSize: "10px", color: "rgba(255,255,255,0.3)", lineHeight: "1.4", m: "0" })}>
                  {logo.concept}
                </p>
              </div>
            </button>
          ))}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className={css({ display: "flex", alignItems: "center", justifyContent: "center", gap: "2", mt: "10" })}>
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className={css({
                px: "4", py: "2", borderRadius: "none", fontSize: "13px", fontWeight: "600",
                bg: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)",
                color: "rgba(255,255,255,0.7)", cursor: "pointer",
                _disabled: { opacity: "0.3", cursor: "default" },
                _hover: { bg: "rgba(99,102,241,0.1)" },
              })}
            >
              ← Prev
            </button>
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
              <button
                key={p}
                onClick={() => setPage(p)}
                className={css({
                  w: "32px", h: "32px", borderRadius: "none", fontSize: "13px", fontWeight: "600",
                  bg: p === page ? "rgba(99,102,241,0.6)" : "rgba(255,255,255,0.04)",
                  border: p === page ? "1px solid rgba(99,102,241,0.8)" : "1px solid rgba(255,255,255,0.08)",
                  color: p === page ? "white" : "rgba(255,255,255,0.5)",
                  cursor: "pointer",
                  _hover: { bg: "rgba(99,102,241,0.2)" },
                })}
              >
                {p}
              </button>
            ))}
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className={css({
                px: "4", py: "2", borderRadius: "none", fontSize: "13px", fontWeight: "600",
                bg: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)",
                color: "rgba(255,255,255,0.7)", cursor: "pointer",
                _disabled: { opacity: "0.3", cursor: "default" },
                _hover: { bg: "rgba(99,102,241,0.1)" },
              })}
            >
              Next →
            </button>
          </div>
        )}
      </div>

      {/* Lightbox */}
      {selectedLogo && (
        <div
          onClick={() => setSelected(null)}
          className={css({
            position: "fixed", inset: "0", bg: "rgba(0,0,0,0.85)", backdropFilter: "blur(8px)",
            display: "flex", alignItems: "center", justifyContent: "center", zIndex: "50", p: "4",
          })}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className={css({
              bg: "#111118", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "none",
              overflow: "hidden", maxW: "640px", w: "100%",
              boxShadow: "0 40px 80px rgba(0,0,0,0.8), 0 0 80px rgba(99,102,241,0.15)",
            })}
          >
            {/* SVG large view */}
            <div
              className={css({
                w: "100%", aspectRatio: "3/2", bg: "rgba(0,0,0,0.6)",
                display: "flex", alignItems: "center", justifyContent: "center",
              })}
            >
              <div
                style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}
                dangerouslySetInnerHTML={{ __html: selectedLogo.svg ?? "" }}
              />
            </div>
            {/* Info */}
            <div className={css({ p: "6" })}>
              <div className={css({ display: "flex", alignItems: "flex-start", justifyContent: "space-between", mb: "2" })}>
                <div>
                  <h2 className={css({ fontSize: "22px", fontWeight: "800", letterSpacing: "-0.02em", mb: "1" })}>
                    {selectedLogo.title}
                  </h2>
                  <p className={css({ fontSize: "13px", color: "rgba(255,255,255,0.45)", lineHeight: "1.5" })}>
                    {selectedLogo.concept}
                  </p>
                </div>
                <span className={css({ fontSize: "28px", fontWeight: "800", color: "rgba(99,102,241,0.4)", letterSpacing: "-0.03em" })}>
                  #{selectedLogo.id}
                </span>
              </div>
              <button
                onClick={() => setSelected(null)}
                className={css({
                  mt: "4", w: "100%", py: "2.5", borderRadius: "none", fontSize: "14px", fontWeight: "600",
                  bg: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)",
                  color: "rgba(255,255,255,0.7)", cursor: "pointer",
                  _hover: { bg: "rgba(255,255,255,0.1)" },
                })}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
