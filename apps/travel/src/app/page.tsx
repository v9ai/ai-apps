import { css } from "styled-system/css";
import placesData from "@/data/places.json";
import { PlaceCard } from "@/components/PlaceCard";
import { MapOverview } from "@/components/MapOverview";
import { CategoryFilter } from "@/components/CategoryFilter";

export default function Home() {
  const { city, city_overview, places } = placesData;

  return (
    <main
      className={css({
        position: "relative",
        zIndex: 1,
        mx: "auto",
        maxW: "6xl",
        px: "4",
        py: "10",
      })}
    >
      {/* Hero */}
      <header
        className={css({
          textAlign: "center",
          mb: "12",
          animation: "fadeUp 0.6s ease-out",
        })}
      >
        <p
          className={css({
            fontSize: "sm",
            fontWeight: "600",
            fontFamily: "display",
            color: "amber.warm",
            letterSpacing: "0.15em",
            textTransform: "uppercase",
            mb: "3",
          })}
        >
          Travel Guide
        </p>
        <h1
          className={css({
            fontSize: { base: "4xl", md: "6xl" },
            fontWeight: "700",
            fontFamily: "display",
            letterSpacing: "-0.03em",
            color: "text.primary",
            lineHeight: "1.1",
          })}
        >
          {city}
        </h1>
        <p
          className={css({
            mt: "2",
            fontSize: { base: "lg", md: "xl" },
            fontFamily: "display",
            color: "text.muted",
            fontWeight: "400",
          })}
        >
          Top {places.length} Places to Visit
        </p>
      </header>

      {/* City Overview */}
      <section
        className={css({
          mb: "12",
          maxW: "3xl",
          mx: "auto",
          animation: "fadeUp 0.6s ease-out 0.1s both",
        })}
      >
        <div
          className={css({
            bg: "steel.surface",
            rounded: "card",
            border: "1px solid",
            borderColor: "steel.border",
            p: { base: "5", md: "8" },
            boxShadow: "card",
          })}
        >
          {city_overview.split("\n\n").map((para, i) => (
            <p
              key={i}
              className={css({
                fontSize: "sm",
                lineHeight: "1.8",
                color: "text.secondary",
                mb: i < city_overview.split("\n\n").length - 1 ? "4" : "0",
              })}
            >
              {para}
            </p>
          ))}
        </div>
      </section>

      {/* Map Overview */}
      <section
        className={css({
          mb: "12",
          animation: "fadeUp 0.6s ease-out 0.2s both",
        })}
      >
        <h2
          className={css({
            fontSize: "2xl",
            fontWeight: "700",
            fontFamily: "display",
            color: "text.primary",
            mb: "4",
          })}
        >
          Explore the Map
        </h2>
        <MapOverview places={places} city={city} />
      </section>

      {/* Category Filter + Places */}
      <section className={css({ animation: "fadeUp 0.6s ease-out 0.3s both" })}>
        <h2
          className={css({
            fontSize: "2xl",
            fontWeight: "700",
            fontFamily: "display",
            color: "text.primary",
            mb: "6",
          })}
        >
          Places to Visit
        </h2>
        <CategoryFilter places={places} />
      </section>
    </main>
  );
}
