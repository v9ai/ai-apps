"use client";

import { useState } from "react";
import { css } from "styled-system/css";
import { VideoEmbed } from "./VideoEmbed";

type Entry = {
  title: string;
  channel: string;
  note?: string;
  videoId?: string;
  searchQuery?: string;
};

type Section = {
  label: string;
  blurb?: string;
  entries: Entry[];
};

const SECTIONS: Section[] = [
  {
    label: "The big three (combined tutorial)",
    blurb: "Bogie, Christie, and torsion bar in a single walkthrough.",
    entries: [
      {
        title: "How to build LEGO tank suspensions",
        channel: "Kelkschiz",
        videoId: "SQgdOdTWVoo",
      },
    ],
  },
  {
    label: "Christie suspension",
    entries: [
      {
        title:
          "LEGO Ultra-Compact Driveable Christie Suspension for Tracked Vehicles [WITH INSTRUCTIONS]",
        channel: "Sariel's Bricks & Pets",
        note: "Original ID was unavailable — falls back to a YouTube search.",
        searchQuery:
          "Sariel Ultra-Compact Driveable Christie Suspension Tracked Vehicles",
      },
      {
        title: "Lego Technic Christie Suspension Tutorial (Compact)",
        channel: "Eian",
        videoId: "p-1ZDlCt-lo",
      },
    ],
  },
  {
    label: "HVSS (Horizontal Volute Spring)",
    entries: [
      {
        title: "Building a Lego TANK with HVSS",
        channel: "Vilius",
        note: "Build process.",
        videoId: "ENsqsoKn17o",
      },
      {
        title: "Lego Technic Modern TANK (HVSS)",
        channel: "Vilius",
        note: "Finished model showcase.",
        videoId: "KPtWkiJSvzc",
      },
    ],
  },
  {
    label: "Torsion bar (demo / testing)",
    entries: [
      {
        title: "Testing LEGO Tank Suspension…",
        channel: "Multiple types incl. torsion bar, shown working",
        videoId: "1_pJn4mcPzY",
      },
    ],
  },
  {
    label: "General Technic suspension theory",
    blurb:
      "Not tank-specific, but useful for adapting to Horstmann, VVSS, etc.",
    entries: [
      {
        title: 'Lego "Suspension Tutorial" Pt.1',
        channel: "Technic theory",
        videoId: "IuP17PiWy-s",
      },
      {
        title: 'Lego "Suspension Tutorial" Pt.2',
        channel: "Technic theory",
        videoId: "xu79DpUuCEc",
      },
    ],
  },
];

const FIRST_VIDEO_ID = SECTIONS.flatMap((s) => s.entries).find(
  (e) => e.videoId,
)?.videoId;

function watchUrl(entry: Entry) {
  if (entry.videoId) return `https://www.youtube.com/watch?v=${entry.videoId}`;
  return `https://www.youtube.com/results?search_query=${encodeURIComponent(
    entry.searchQuery ?? `${entry.channel} ${entry.title}`,
  )}`;
}

export function SuspensionLinks() {
  const [selectedId, setSelectedId] = useState<string | null>(
    FIRST_VIDEO_ID ?? null,
  );

  return (
    <section className={css({ mt: "2" })}>
      <h2
        className={css({
          fontSize: "xl",
          fontWeight: "900",
          fontFamily: "display",
          letterSpacing: "-0.02em",
          color: "ink.primary",
          mb: "2",
        })}
      >
        Tank Suspensions
      </h2>
      <p className={css({ fontSize: "sm", color: "ink.muted", mb: "5" })}>
        Direct YouTube links for LEGO tank suspensions with build tutorials or
        detailed build videos. Click a row to play it above.
      </p>

      {selectedId && (
        <div className={css({ mb: "5" })}>
          <VideoEmbed videoId={selectedId} />
        </div>
      )}

      <div
        className={css({ display: "flex", flexDir: "column", gap: "6" })}
      >
        {SECTIONS.map((section) => (
          <div key={section.label}>
            <h3
              className={css({
                fontSize: "md",
                fontWeight: "900",
                fontFamily: "display",
                letterSpacing: "-0.01em",
                color: "ink.primary",
                mb: section.blurb ? "1" : "3",
              })}
            >
              {section.label}
            </h3>
            {section.blurb && (
              <p
                className={css({
                  fontSize: "xs",
                  color: "ink.muted",
                  mb: "3",
                })}
              >
                {section.blurb}
              </p>
            )}

            <div
              className={css({
                display: "flex",
                flexDir: "column",
                gap: "2",
              })}
            >
              {section.entries.map((entry) => {
                const active =
                  !!entry.videoId && entry.videoId === selectedId;
                const playable = !!entry.videoId;
                const thumb = entry.videoId
                  ? `https://i.ytimg.com/vi/${entry.videoId}/mqdefault.jpg`
                  : null;

                return (
                  <div
                    key={`${section.label}-${entry.title}`}
                    className={css({
                      display: "flex",
                      alignItems: "center",
                      gap: "3",
                      bg: "plate.surface",
                      rounded: "brick",
                      border: "2px solid",
                      borderColor: active ? "lego.orange" : "plate.border",
                      px: "3",
                      py: "2",
                      transition: "all 0.15s ease",
                      _hover: {
                        borderColor: active
                          ? "lego.orange"
                          : "plate.borderHover",
                        boxShadow: "brick",
                      },
                    })}
                  >
                    <button
                      onClick={() =>
                        playable && setSelectedId(entry.videoId!)
                      }
                      disabled={!playable}
                      className={css({
                        flexShrink: 0,
                        p: 0,
                        border: "none",
                        bg: "transparent",
                        cursor: playable ? "pointer" : "not-allowed",
                        rounded: "lg",
                        overflow: "hidden",
                      })}
                      aria-label={
                        playable ? `Play ${entry.title}` : entry.title
                      }
                    >
                      {thumb ? (
                        <img
                          src={thumb}
                          alt={entry.title}
                          className={css({
                            w: "28",
                            h: "16",
                            objectFit: "cover",
                            rounded: "lg",
                            border: "2px solid",
                            borderColor: active
                              ? "lego.orange"
                              : "plate.border",
                            display: "block",
                          })}
                        />
                      ) : (
                        <div
                          className={css({
                            w: "28",
                            h: "16",
                            rounded: "lg",
                            border: "2px dashed",
                            borderColor: "plate.border",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            fontSize: "xs",
                            fontWeight: "800",
                            fontFamily: "display",
                            color: "ink.faint",
                          })}
                        >
                          SEARCH
                        </div>
                      )}
                    </button>

                    <button
                      onClick={() =>
                        playable && setSelectedId(entry.videoId!)
                      }
                      disabled={!playable}
                      className={css({
                        flex: 1,
                        minW: 0,
                        textAlign: "left",
                        bg: "transparent",
                        border: "none",
                        cursor: playable ? "pointer" : "default",
                        p: 0,
                      })}
                    >
                      <span
                        className={css({
                          display: "block",
                          fontSize: "sm",
                          fontWeight: "700",
                          fontFamily: "display",
                          color: "ink.primary",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        })}
                      >
                        {entry.title}
                      </span>
                      <span
                        className={css({
                          fontSize: "xs",
                          color: "ink.muted",
                          display: "block",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        })}
                      >
                        {entry.channel}
                        {entry.note ? ` — ${entry.note}` : ""}
                      </span>
                    </button>

                    <a
                      href={watchUrl(entry)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={css({
                        fontSize: "xs",
                        fontWeight: "700",
                        fontFamily: "display",
                        color: "ink.secondary",
                        bg: "transparent",
                        border: "1.5px solid",
                        borderColor: "plate.border",
                        textDecoration: "none",
                        px: "3",
                        py: "1.5",
                        rounded: "brick",
                        transition: "all 0.15s ease",
                        flexShrink: 0,
                        _hover: {
                          borderColor: "plate.borderHover",
                          color: "ink.primary",
                        },
                      })}
                    >
                      {playable ? "Open" : "Search"}
                    </a>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
