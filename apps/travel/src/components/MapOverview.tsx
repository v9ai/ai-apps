"use client";

import { css } from "styled-system/css";

interface Place {
  name: string;
  lat: number;
  lng: number;
  category: string;
  maps_url: string;
}

export function MapOverview({
  places,
  city,
}: {
  places: Place[];
  city: string;
}) {
  // Build a static Google Maps embed URL with all markers
  // Use the center of all places as the map center
  const centerLat =
    places.reduce((sum, p) => sum + p.lat, 0) / places.length;
  const centerLng =
    places.reduce((sum, p) => sum + p.lng, 0) / places.length;

  // Google Maps embed with the city as query — shows the general area
  const embedUrl = `https://www.google.com/maps?q=${centerLat},${centerLng}&z=13&output=embed`;

  return (
    <div
      className={css({
        rounded: "card",
        overflow: "hidden",
        border: "1px solid",
        borderColor: "steel.border",
        boxShadow: "card",
        position: "relative",
      })}
    >
      <iframe
        src={embedUrl}
        width="100%"
        height="450"
        style={{ border: 0 }}
        loading="lazy"
        referrerPolicy="no-referrer-when-downgrade"
        title={`Map of ${city}`}
      />
      {/* Quick-jump place list overlay */}
      <div
        className={css({
          position: "absolute",
          bottom: "0",
          left: "0",
          right: "0",
          bg: "linear-gradient(transparent, rgba(15,17,20,0.95))",
          px: "4",
          py: "3",
        })}
      >
        <div
          className={css({
            display: "flex",
            flexWrap: "wrap",
            gap: "2",
          })}
        >
          {places.map((place, i) => (
            <a
              key={i}
              href={place.maps_url}
              target="_blank"
              rel="noopener noreferrer"
              className={css({
                fontSize: "xs",
                fontWeight: "600",
                fontFamily: "display",
                color: "text.secondary",
                bg: "steel.surface",
                border: "1px solid",
                borderColor: "steel.border",
                rounded: "pill",
                px: "3",
                py: "1",
                textDecoration: "none",
                transition: "all 0.15s ease",
                whiteSpace: "nowrap",
                _hover: {
                  color: "amber.warm",
                  borderColor: "steel.borderHover",
                  bg: "steel.raised",
                },
              })}
            >
              {i + 1}. {place.name}
            </a>
          ))}
        </div>
      </div>
    </div>
  );
}
