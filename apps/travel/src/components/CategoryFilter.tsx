"use client";

import { useState } from "react";
import { css } from "styled-system/css";
import { PlaceCard } from "./PlaceCard";

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
  maps_embed_query: string;
}

const CATEGORY_COLORS: Record<string, string> = {
  culture: "#7B68EE",
  nature: "#4CAF50",
  food: "#FF7043",
  nightlife: "#E040FB",
  architecture: "#42A5F5",
  history: "#AB8B6B",
  entertainment: "#FFD54F",
};

export function CategoryFilter({ places }: { places: Place[] }) {
  const [active, setActive] = useState<string | null>(null);

  const categories = [...new Set(places.map((p) => p.category))];
  const filtered = active ? places.filter((p) => p.category === active) : places;

  return (
    <>
      {/* Filter buttons */}
      <div
        className={css({
          display: "flex",
          flexWrap: "wrap",
          gap: "2",
          mb: "6",
        })}
      >
        <button
          onClick={() => setActive(null)}
          className={css({
            fontSize: "sm",
            fontWeight: "600",
            fontFamily: "display",
            rounded: "pill",
            px: "4",
            py: "1.5",
            cursor: "pointer",
            transition: "all 0.15s ease",
            border: "1px solid",
            bg: !active ? "amber.warm" : "steel.surface",
            color: !active ? "steel.dark" : "text.secondary",
            borderColor: !active ? "amber.warm" : "steel.border",
            _hover: {
              borderColor: !active ? "amber.warm" : "steel.borderHover",
              bg: !active ? "amber.bright" : "steel.raised",
            },
          })}
        >
          All ({places.length})
        </button>
        {categories.map((cat) => {
          const isActive = active === cat;
          const color = CATEGORY_COLORS[cat] || "#999";
          return (
            <button
              key={cat}
              onClick={() => setActive(isActive ? null : cat)}
              className={css({
                fontSize: "sm",
                fontWeight: "600",
                fontFamily: "display",
                rounded: "pill",
                px: "4",
                py: "1.5",
                cursor: "pointer",
                transition: "all 0.15s ease",
                border: "1px solid",
                textTransform: "capitalize",
              })}
              style={{
                background: isActive ? color : undefined,
                color: isActive ? "#0F1114" : color,
                borderColor: isActive ? color : `${color}44`,
              }}
            >
              {cat} ({places.filter((p) => p.category === cat).length})
            </button>
          );
        })}
      </div>

      {/* Place grid */}
      <div
        className={css({
          display: "grid",
          gap: "6",
          gridTemplateColumns: {
            base: "1fr",
            md: "repeat(2, 1fr)",
            lg: "repeat(2, 1fr)",
          },
        })}
      >
        {filtered.map((place, i) => (
          <PlaceCard
            key={place.name}
            place={place}
            index={places.indexOf(place)}
          />
        ))}
      </div>
    </>
  );
}
