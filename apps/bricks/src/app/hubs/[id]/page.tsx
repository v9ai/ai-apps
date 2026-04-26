"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { css } from "styled-system/css";
import { HubType, hubDisplayName, hubColor, hubPorts } from "@/lib/parser";

interface HubDetail {
  id: number;
  name: string;
  hubType: string;
  bleName: string;
  createdAt: string;
  docsUrl: string | null;
}

const HUB_IMG: Record<string, string> = {
  CityHub: "/hubs/hub-city.png",
  TechnicHub: "/hubs/hub-technic.png",
  MoveHub: "/hubs/hub-move.png",
  PrimeHub: "/hubs/hub-prime.png",
  EssentialHub: "/hubs/hub-essential.png",
};

export default function HubPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [hub, setHub] = useState<HubDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    fetch(`/api/hubs/${id}`)
      .then(async (res) => {
        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error || "Hub not found");
        }
        return res.json();
      })
      .then(setHub)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [id]);

  async function handleDelete() {
    if (!hub) return;
    if (!confirm(`Delete "${hub.name}"?`)) return;
    setDeleting(true);
    const res = await fetch(`/api/hubs/${hub.id}`, { method: "DELETE" });
    if (res.ok) {
      router.push("/my-parts");
    } else {
      setDeleting(false);
    }
  }

  if (loading) {
    return (
      <main className={css({ maxW: "3xl", mx: "auto", px: "5", py: "10" })}>
        <p className={css({ color: "ink.muted", fontSize: "sm" })}>Loading…</p>
      </main>
    );
  }

  if (error || !hub) {
    return (
      <main className={css({ maxW: "3xl", mx: "auto", px: "5", py: "10" })}>
        <p className={css({ color: "lego.red", fontSize: "sm", fontWeight: "700" })}>
          {error || "Hub not found"}
        </p>
        <Link
          href="/my-parts"
          className={css({
            mt: "4",
            display: "inline-block",
            color: "lego.orange",
            fontWeight: "700",
            textDecoration: "underline",
          })}
        >
          ← Back to My Parts
        </Link>
      </main>
    );
  }

  const hubType = hub.hubType as HubType;
  const color = hubColor(hubType);
  const img = HUB_IMG[hub.hubType];
  const ports = hubPorts(hubType);

  return (
    <main className={css({ maxW: "3xl", mx: "auto", px: "5", py: "10" })}>
      <Link
        href="/my-parts"
        className={css({
          fontSize: "xs",
          fontWeight: "700",
          color: "ink.muted",
          textDecoration: "none",
          _hover: { color: "lego.orange" },
        })}
      >
        ← My Parts
      </Link>

      <div
        className={css({
          mt: "4",
          display: "flex",
          alignItems: "center",
          gap: "5",
          bg: "plate.surface",
          rounded: "brick",
          border: "2px solid",
          borderColor: "plate.border",
          boxShadow: "brick",
          p: "6",
        })}
      >
        {img && (
          <img
            src={img}
            alt={hub.hubType}
            className={css({ w: "24", h: "24", objectFit: "contain", flexShrink: 0 })}
          />
        )}
        <div className={css({ flex: 1, minW: 0 })}>
          <h1
            className={css({
              fontSize: "3xl",
              fontWeight: "900",
              fontFamily: "display",
              letterSpacing: "-0.03em",
              color: "ink.primary",
            })}
          >
            {hub.name}
          </h1>
          <div className={css({ mt: "2", display: "flex", gap: "2", alignItems: "center", flexWrap: "wrap" })}>
            <span
              className={css({
                display: "inline-block",
                px: "2",
                py: "0.5",
                rounded: "md",
                fontSize: "xs",
                fontWeight: "800",
                fontFamily: "display",
              })}
              style={{ backgroundColor: color + "20", color }}
            >
              {hubDisplayName(hubType)}
            </span>
            {hub.bleName && (
              <span className={css({ fontSize: "xs", color: "ink.muted" })}>
                BLE: <span className={css({ fontWeight: "700", color: "ink.primary" })}>{hub.bleName}</span>
              </span>
            )}
          </div>
        </div>
      </div>

      {hub.docsUrl && (
        <a
          href={hub.docsUrl}
          target="_blank"
          rel="noopener noreferrer"
          className={css({
            mt: "5",
            display: "inline-flex",
            alignItems: "center",
            gap: "2",
            rounded: "brick",
            bg: "lego.blue",
            px: "5",
            py: "2.5",
            fontSize: "sm",
            fontWeight: "800",
            fontFamily: "display",
            color: "white",
            textDecoration: "none",
            transition: "all 0.15s ease",
            _hover: { bg: "#0080D0", transform: "translateY(-1px)" },
          })}
        >
          Pybricks {hubDisplayName(hubType)} docs →
        </a>
      )}

      {ports.length > 0 && (
        <section className={css({ mt: "8" })}>
          <h2
            className={css({
              fontSize: "lg",
              fontWeight: "900",
              fontFamily: "display",
              color: "ink.primary",
              mb: "3",
            })}
          >
            Ports
          </h2>
          <div className={css({ display: "flex", gap: "2", flexWrap: "wrap" })}>
            {ports.map((p) => (
              <span
                key={p}
                className={css({
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  w: "10",
                  h: "10",
                  rounded: "stud",
                  bg: "lego.yellow",
                  boxShadow: "stud",
                  fontSize: "sm",
                  fontWeight: "900",
                  fontFamily: "display",
                  color: "ink.primary",
                })}
              >
                {p}
              </span>
            ))}
          </div>
        </section>
      )}

      <section className={css({ mt: "10", pt: "6", borderTop: "1px solid", borderColor: "plate.border" })}>
        <button
          onClick={handleDelete}
          disabled={deleting}
          className={css({
            rounded: "lg",
            bg: "transparent",
            border: "2px solid",
            borderColor: "lego.red",
            px: "4",
            py: "2",
            fontSize: "sm",
            fontWeight: "800",
            fontFamily: "display",
            color: "lego.red",
            cursor: "pointer",
            transition: "all 0.15s ease",
            _hover: { bg: "lego.red", color: "white" },
            _disabled: { opacity: 0.5, cursor: "not-allowed" },
          })}
        >
          {deleting ? "Deleting…" : "Delete hub"}
        </button>
      </section>
    </main>
  );
}
