"use client";

import { css } from "styled-system/css";

interface Place {
  name: string;
  description: string;
  category: string;
  address: string;
  lat: number;
  lng: number;
  rating: number;
  visit_duration: string;
  tips: string;
  maps_url: string;
}

const CATEGORY_COLORS: Record<string, string> = {
  culture: "cat.culture",
  nature: "cat.nature",
  food: "cat.food",
  nightlife: "cat.nightlife",
  architecture: "cat.architecture",
  history: "cat.history",
  entertainment: "cat.entertainment",
};

const CATEGORY_ICONS: Record<string, string> = {
  culture: "\u{1F3AD}",
  nature: "\u{1F333}",
  food: "\u{1F37D}",
  nightlife: "\u{1F3B6}",
  architecture: "\u{1F3DB}",
  history: "\u{1F3F0}",
  entertainment: "\u{1F3AA}",
};

export function PlaceCard({
  place,
  index,
}: {
  place: Place;
  index: number;
}) {
  return (
    <article
      className={css({
        bg: "steel.surface",
        rounded: "card",
        border: "1px solid",
        borderColor: "steel.border",
        overflow: "hidden",
        boxShadow: "card",
        transition: "all 0.2s ease",
        _hover: {
          borderColor: "steel.borderHover",
          boxShadow: "card.hover",
          transform: "translateY(-2px)",
        },
      })}
    >
      {/* Map embed */}
      <div className={css({ position: "relative", h: "200px", bg: "steel.dark" })}>
        <iframe
          src={`https://www.google.com/maps?q=${place.lat},${place.lng}&z=16&output=embed`}
          width="100%"
          height="100%"
          style={{ border: 0 }}
          loading="lazy"
          referrerPolicy="no-referrer-when-downgrade"
          title={`Map of ${place.name}`}
        />
        <div
          className={css({
            position: "absolute",
            top: "3",
            left: "3",
            bg: "rgba(15, 17, 20, 0.85)",
            backdropFilter: "blur(8px)",
            rounded: "pill",
            px: "3",
            py: "1",
            fontSize: "xs",
            fontWeight: "700",
            fontFamily: "display",
            color: "amber.warm",
          })}
        >
          #{index + 1}
        </div>
      </div>

      {/* Content */}
      <div className={css({ p: "5" })}>
        {/* Category badge */}
        <span
          className={css({
            display: "inline-block",
            fontSize: "xs",
            fontWeight: "600",
            fontFamily: "display",
            textTransform: "uppercase",
            letterSpacing: "0.08em",
            color: CATEGORY_COLORS[place.category] || "text.muted",
            mb: "2",
          })}
        >
          {CATEGORY_ICONS[place.category] || ""} {place.category}
        </span>

        <h3
          className={css({
            fontSize: "lg",
            fontWeight: "700",
            fontFamily: "display",
            color: "text.primary",
            mb: "2",
            lineHeight: "1.3",
          })}
        >
          {place.name}
        </h3>

        <p
          className={css({
            fontSize: "sm",
            color: "text.secondary",
            lineHeight: "1.7",
            mb: "4",
          })}
        >
          {place.description}
        </p>

        {/* Meta row */}
        <div
          className={css({
            display: "flex",
            flexWrap: "wrap",
            gap: "3",
            mb: "4",
            fontSize: "xs",
            color: "text.muted",
          })}
        >
          <span>{"⭐"} {place.rating}/5</span>
          <span>{"⏱"} {place.visit_duration}</span>
        </div>

        {/* Address */}
        <p
          className={css({
            fontSize: "xs",
            color: "text.faint",
            mb: "3",
          })}
        >
          {place.address}
        </p>

        {/* Tip */}
        <div
          className={css({
            bg: "amber.glow",
            border: "1px solid",
            borderColor: "rgba(232, 168, 56, 0.2)",
            rounded: "8px",
            px: "3",
            py: "2",
            fontSize: "xs",
            color: "amber.bright",
            mb: "4",
          })}
        >
          <strong>Tip:</strong> {place.tips}
        </div>

        {/* Google Maps link */}
        <a
          href={place.maps_url}
          target="_blank"
          rel="noopener noreferrer"
          className={css({
            display: "inline-flex",
            alignItems: "center",
            gap: "2",
            fontSize: "sm",
            fontWeight: "600",
            fontFamily: "display",
            color: "amber.warm",
            textDecoration: "none",
            transition: "color 0.15s",
            _hover: { color: "amber.bright" },
          })}
        >
          Open in Google Maps {"→"}
        </a>
      </div>
    </article>
  );
}
