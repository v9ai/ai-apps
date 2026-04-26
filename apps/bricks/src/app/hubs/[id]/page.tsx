"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { css } from "styled-system/css";
import { HubType, hubDisplayName, hubColor, hubPorts } from "@/lib/parser";
import { GAMES } from "@/lib/games";
import { useLanguage } from "@/lib/language";
import { HUB_CAPABILITIES } from "@/lib/hub-capabilities";

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

const LABELS = {
  en: {
    loading: "Loading…",
    notFound: "Hub not found",
    backToParts: "← Back to My Parts",
    myParts: "← My Parts",
    pybricksDocs: "Pybricks {hub} docs →",
    capabilities: "Capabilities",
    ports: "Ports",
    games: "Games",
    browseAll: "Browse all →",
    playOn: "Play on {name}",
    deleteHub: "Delete hub",
    deleting: "Deleting…",
    confirmDelete: 'Delete "{name}"?',
    bleLabel: "BLE",
    comingSoon: "Coming soon",
  },
  ro: {
    loading: "Se încarcă…",
    notFound: "Hub negăsit",
    backToParts: "← Înapoi la Piesele mele",
    myParts: "← Piesele mele",
    pybricksDocs: "Documentație Pybricks {hub} →",
    capabilities: "Capabilități",
    ports: "Porturi",
    games: "Jocuri",
    browseAll: "Vezi toate →",
    playOn: "Joacă pe {name}",
    deleteHub: "Șterge hub",
    deleting: "Se șterge…",
    confirmDelete: 'Ștergi "{name}"?',
    bleLabel: "BLE",
    comingSoon: "În curând",
  },
} as const;

export default function HubPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { language } = useLanguage();
  const t = LABELS[language === "ro" ? "ro" : "en"];
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
    if (!confirm(t.confirmDelete.replace("{name}", hub.name))) return;
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
      <main className={css({ w: "full", px: { base: "5", md: "8" }, py: "10" })}>
        <p className={css({ color: "ink.muted", fontSize: "sm" })}>{t.loading}</p>
      </main>
    );
  }

  if (error || !hub) {
    return (
      <main className={css({ w: "full", px: { base: "5", md: "8" }, py: "10" })}>
        <p className={css({ color: "lego.red", fontSize: "sm", fontWeight: "700" })}>
          {error || t.notFound}
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
          {t.backToParts}
        </Link>
      </main>
    );
  }

  const hubType = hub.hubType as HubType;
  const color = hubColor(hubType);
  const img = HUB_IMG[hub.hubType];
  const ports = hubPorts(hubType);
  const capabilities = HUB_CAPABILITIES[hubType] ?? [];

  return (
    <main className={css({ w: "full", px: { base: "5", md: "8" }, py: "10" })}>
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
        {t.myParts}
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
                {t.bleLabel}: <span className={css({ fontWeight: "700", color: "ink.primary" })}>{hub.bleName}</span>
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
          {t.pybricksDocs.replace("{hub}", hubDisplayName(hubType))}
        </a>
      )}

      {capabilities.length > 0 && (
        <section className={css({ mt: "8" })}>
          <h2
            className={css({
              fontSize: "lg",
              fontWeight: "900",
              fontFamily: "display",
              color: "ink.primary",
              mb: "4",
            })}
          >
            {t.capabilities}
          </h2>
          <div className={css({ display: "flex", flexDirection: "column", gap: "3" })}>
            {capabilities.map((group) => (
              <article
                key={group.id}
                className={css({
                  position: "relative",
                  bg: "plate.surface",
                  border: "2px solid",
                  borderColor: "plate.border",
                  rounded: "brick",
                  boxShadow: "brick",
                  p: "5",
                  overflow: "hidden",
                })}
              >
                <div
                  aria-hidden="true"
                  className={css({
                    position: "absolute",
                    top: 0,
                    left: 0,
                    right: 0,
                    h: "3px",
                  })}
                  style={{ background: color }}
                />
                <h3
                  className={css({
                    fontSize: "md",
                    fontWeight: "900",
                    fontFamily: "display",
                    color: "ink.primary",
                    letterSpacing: "-0.01em",
                  })}
                >
                  {language === "ro" ? group.titleRo : group.titleEn}
                </h3>
                <p
                  className={css({
                    mt: "1",
                    fontSize: "sm",
                    color: "ink.muted",
                    lineHeight: "1.5",
                  })}
                >
                  {language === "ro" ? group.descRo : group.descEn}
                </p>
                <ul
                  className={css({
                    mt: "4",
                    display: "flex",
                    flexDirection: "column",
                    gap: "3",
                    listStyle: "none",
                    p: 0,
                  })}
                >
                  {group.methods.map((m) => (
                    <li key={m.signature}>
                      <code
                        className={css({
                          display: "inline-block",
                          fontFamily: "mono",
                          fontSize: "xs",
                          fontWeight: "700",
                          bg: "plate.raised",
                          color: "ink.primary",
                          px: "2",
                          py: "0.5",
                          rounded: "md",
                        })}
                      >
                        {m.signature}
                      </code>
                      <p
                        className={css({
                          mt: "1",
                          fontSize: "xs",
                          color: "ink.muted",
                          lineHeight: "1.5",
                        })}
                      >
                        {language === "ro" ? m.descRo : m.descEn}
                      </p>
                    </li>
                  ))}
                </ul>
              </article>
            ))}
          </div>
        </section>
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
            {t.ports}
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

      <section className={css({ mt: "10" })}>
        <div
          className={css({
            display: "flex",
            alignItems: "baseline",
            justifyContent: "space-between",
            mb: "3",
            gap: "3",
          })}
        >
          <h2
            className={css({
              fontSize: "lg",
              fontWeight: "900",
              fontFamily: "display",
              color: "ink.primary",
            })}
          >
            {t.games}
          </h2>
          <Link
            href="/games"
            className={css({
              fontSize: "xs",
              fontWeight: "700",
              fontFamily: "display",
              color: "ink.muted",
              textDecoration: "none",
              _hover: { color: "lego.orange" },
            })}
          >
            {t.browseAll}
          </Link>
        </div>
        <p
          className={css({
            fontSize: "xs",
            color: "ink.muted",
            mb: "4",
          })}
        >
          {t.playOn.replace("{name}", hub.name)}
        </p>
        <div
          className={css({
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))",
            gap: "3",
          })}
        >
          {GAMES.map((game) => (
            <Link
              key={game.title}
              href="/games"
              className={css({
                position: "relative",
                bg: "plate.surface",
                border: "1px solid",
                borderColor: "plate.border",
                rounded: "brick",
                boxShadow: "brick",
                p: "4",
                display: "flex",
                flexDirection: "column",
                gap: "1",
                overflow: "hidden",
                textDecoration: "none",
                transition: "all 0.15s ease",
                _hover: {
                  borderColor: "plate.borderHover",
                  transform: "translateY(-1px)",
                },
              })}
            >
              <div
                aria-hidden="true"
                className={css({
                  position: "absolute",
                  top: 0,
                  left: 0,
                  right: 0,
                  h: "3px",
                })}
                style={{ background: game.accent }}
              />
              <span
                className={css({
                  mt: "1",
                  fontFamily: "display",
                  fontWeight: "900",
                  fontSize: "sm",
                  color: "ink.primary",
                  letterSpacing: "-0.01em",
                })}
              >
                {language === "ro" ? game.titleRo : game.title}
              </span>
              <span
                className={css({
                  mt: "1",
                  fontSize: "xs",
                  color: "ink.muted",
                  lineHeight: "1.4",
                })}
              >
                {language === "ro" ? game.taglineRo : game.tagline}
              </span>
              <span
                className={css({
                  mt: "2",
                  fontSize: "10px",
                  fontFamily: "display",
                  fontWeight: "800",
                  letterSpacing: "0.08em",
                  textTransform: "uppercase",
                  color: "ink.faint",
                })}
              >
                {t.comingSoon}
              </span>
            </Link>
          ))}
        </div>
      </section>

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
          {deleting ? t.deleting : t.deleteHub}
        </button>
      </section>
    </main>
  );
}
