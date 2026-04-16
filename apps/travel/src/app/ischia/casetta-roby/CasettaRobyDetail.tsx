"use client";

import { css } from "styled-system/css";
import Link from "next/link";
import { useLang } from "@/components/LanguageSwitcher";

const BOOKING_URL =
  "https://www.booking.com/hotel/it/casetta-roby.html?checkin=2026-05-31&checkout=2026-06-07&group_adults=2&group_children=1&age=8";

interface NearbyPlace {
  name: string;
  distance: string;
}

const LANDMARKS: NearbyPlace[] = [
  { name: "Duomo di Napoli (Cathedral)", distance: "50 m" },
  { name: "Museo Cappella Sansevero", distance: "200 m" },
  { name: "Piazza San Gaetano", distance: "500 m" },
  { name: "Spaccanapoli", distance: "300 m" },
  { name: "MANN (Museo Archeologico)", distance: "1.2 km" },
  { name: "Napoli Sotterranea", distance: "600 m" },
];

const RESTAURANTS: NearbyPlace[] = [
  { name: "Sorbillo", distance: "350 m" },
  { name: "L'Antica Pizzeria da Michele", distance: "400 m" },
  { name: "Tandem Ragù", distance: "250 m" },
  { name: "Pizzeria Di Matteo", distance: "300 m" },
];

const TRANSPORT: NearbyPlace[] = [
  { name: "Università (Metro L1)", distance: "700 m" },
  { name: "Duomo (Metro L1)", distance: "250 m" },
  { name: "Napoli Centrale (Garibaldi)", distance: "1.5 km" },
  { name: "Capodichino Airport", distance: "6 km" },
];

const AMENITIES_EN = [
  "Air conditioning",
  "Fully equipped kitchen",
  "Refrigerator",
  "Television",
  "Private bathroom",
  "Shower",
  "Bidet",
  "Separate toilet",
];

const AMENITIES_RO = [
  "Aer conditionat",
  "Bucatarie complet echipata",
  "Frigider",
  "Televizor",
  "Baie privata",
  "Dus",
  "Bideu",
  "Toaleta separata",
];

const T = {
  en: {
    back: "Ischia",
    badge: "Apartment — Centro Storico",
    name: "Casetta Roby",
    subtitle: "Vico Zuroli 42, Centro Storico, 80138 Naples",
    dates: "31 May – 7 Jun 2026",
    guests: "2 adults · 1 child (8y) · 1 apartment",
    nights: "7 nights",
    room: "Entire Apartment",
    roomDetail: "1 bedroom · 1 bathroom · kitchen · sleeps 2+1",
    priceSection: "Price",
    price: "~€70 / night",
    priceTotal: "7 nights ~ €490",
    board: "Self-catering — fully equipped kitchen",
    bookNow: "View on Booking.com",
    amenitiesTitle: "Amenities",
    amenities: AMENITIES_EN,
    nearbyTitle: "Nearby",
    landmarksLabel: "Landmarks",
    restaurantsLabel: "Restaurants & Pizza",
    transportLabel: "Transport",
    notesTitle: "Good to Know",
    notes: [
      "Next door to Naples Cathedral (Duomo) — the heart of Centro Storico",
      "Cappella Sansevero (Veiled Christ) is a 2-minute walk",
      "Best pizza in the world within 5 minutes on foot (Sorbillo, da Michele)",
      "No parking available — arrive by metro or taxi from Centrale station",
      "No internet / WiFi — buy a local SIM or use mobile data",
      "Capodichino Airport is 8 minutes by car",
    ],
    description:
      "Casetta Roby is a self-catering apartment in the absolute heart of Naples' Centro Storico, on Vico Zuroli just steps from the Duomo. The apartment has one bedroom and one bathroom, a fully equipped kitchen with refrigerator, air conditioning, and a TV. Ideal for exploring Naples on foot — Spaccanapoli, the Archaeological Museum, and the best pizzerias are all within walking distance.",
    locationNote: "One of the best locations in Naples for sightseeing — everything walkable.",
    airport: "Capodichino Airport — 6 km (8 min drive)",
  },
  ro: {
    back: "Ischia",
    badge: "Apartament — Centro Storico",
    name: "Casetta Roby",
    subtitle: "Vico Zuroli 42, Centro Storico, 80138 Napoli",
    dates: "31 mai – 7 iun 2026",
    guests: "2 adulti · 1 copil (8 ani) · 1 apartament",
    nights: "7 nopti",
    room: "Apartament Intreg",
    roomDetail: "1 dormitor · 1 baie · bucatarie · 2+1 persoane",
    priceSection: "Pret",
    price: "~€70 / noapte",
    priceTotal: "7 nopti ~ €490",
    board: "Self-catering — bucatarie complet echipata",
    bookNow: "Vezi pe Booking.com",
    amenitiesTitle: "Facilitati",
    amenities: AMENITIES_RO,
    nearbyTitle: "Imprejurimi",
    landmarksLabel: "Atractii",
    restaurantsLabel: "Restaurante & Pizza",
    transportLabel: "Transport",
    notesTitle: "De Stiut",
    notes: [
      "Langa Catedrala din Napoli (Duomo) — inima Centro Storico",
      "Cappella Sansevero (Cristul cu Val) la 2 minute pe jos",
      "Cea mai buna pizza din lume la 5 minute pe jos (Sorbillo, da Michele)",
      "Fara parcare — ajungi cu metroul sau taxi din gara Centrale",
      "Fara internet / WiFi — cumpara SIM local sau foloseste date mobile",
      "Aeroportul Capodichino la 8 minute cu masina",
    ],
    description:
      "Casetta Roby este un apartament self-catering in inima absoluta a Centro Storico din Napoli, pe Vico Zuroli la cativa pasi de Duomo. Apartamentul are un dormitor si o baie, bucatarie complet echipata cu frigider, aer conditionat si televizor. Ideal pentru explorarea Napoliului pe jos — Spaccanapoli, Muzeul Arheologic si cele mai bune pizzerii sunt toate la distanta de mers pe jos.",
    locationNote: "Una dintre cele mai bune locatii din Napoli — totul accesibil pe jos.",
    airport: "Aeroportul Capodichino — 6 km (8 min cu masina)",
  },
};

export function CasettaRobyDetail() {
  const { lang } = useLang();
  const t = T[lang];

  return (
    <main
      className={css({
        position: "relative",
        zIndex: 1,
        mx: "auto",
        px: { base: "4", sm: "6", md: "8", lg: "10", xl: "12" },
        pt: { base: "8", md: "16" },
        pb: { base: "12", md: "20" },
        animation: "fadeUp 0.6s ease-out",
      })}
    >
      {/* ── Back link ── */}
      <Link
        href="/ischia"
        className={css({
          display: "inline-flex",
          alignItems: "center",
          gap: "2",
          fontSize: "meta",
          fontFamily: "display",
          color: "text.muted",
          letterSpacing: "0.04em",
          mb: { base: "6", md: "10" },
          transition: "color 0.15s",
          _hover: { color: "amber.warm" },
        })}
      >
        &larr; {t.back}
      </Link>

      {/* ── Hero header ── */}
      <div className={css({ mb: { base: "8", md: "12" } })}>
        <p
          className={css({
            fontSize: "2xs",
            fontFamily: "display",
            fontWeight: "700",
            letterSpacing: "0.1em",
            textTransform: "uppercase",
            color: "amber.warm",
            mb: "3",
          })}
        >
          {t.badge}
        </p>

        <h1
          className={css({
            fontSize: "h1",
            fontWeight: "800",
            fontFamily: "display",
            letterSpacing: "h1",
            color: "text.primary",
            lineHeight: "h1",
            mb: "3",
          })}
        >
          {t.name}
        </h1>

        <p
          className={css({
            fontSize: { base: "body", md: "h3" },
            fontFamily: "display",
            color: "text.muted",
            letterSpacing: "0.02em",
            mb: "3",
          })}
        >
          {t.subtitle}
        </p>

        <p
          className={css({
            fontSize: "meta",
            fontFamily: "display",
            color: "text.secondary",
            letterSpacing: "0.02em",
          })}
        >
          {t.dates} &middot; {t.guests}
        </p>
      </div>

      {/* ── Price + Location hero row ── */}
      <div
        className={css({
          display: "flex",
          flexWrap: "wrap",
          gap: { base: "4", md: "6" },
          mb: { base: "8", md: "12" },
        })}
      >
        {/* Price card */}
        <div
          className={css({
            bg: "steel.surface",
            border: "1px solid",
            borderColor: "amber.warm",
            rounded: "card",
            p: { base: "5", md: "6" },
            flex: "1",
            minW: "200px",
          })}
        >
          <p
            className={css({
              fontSize: "h1",
              fontWeight: "800",
              fontFamily: "display",
              color: "amber.warm",
              lineHeight: "1.1",
              mb: "1",
            })}
          >
            {t.price}
          </p>
          <p className={css({ fontSize: "meta", color: "text.faint", fontFamily: "display" })}>
            {t.priceTotal}
          </p>
          <div className={css({ h: "1px", bg: "steel.border", my: "3" })} />
          <p className={css({ fontSize: "xs", color: "text.secondary", fontFamily: "display" })}>
            {t.board}
          </p>
        </div>

        {/* Location card */}
        <div
          className={css({
            bg: "steel.surface",
            border: "1px solid",
            borderColor: "amber.warm",
            rounded: "card",
            p: { base: "5", md: "6" },
            flex: "1",
            minW: "200px",
          })}
        >
          <p
            className={css({
              fontSize: "h2",
              fontWeight: "800",
              fontFamily: "display",
              color: "amber.warm",
              lineHeight: "1.1",
              mb: "1",
            })}
          >
            Centro Storico
          </p>
          <p className={css({ fontSize: "meta", color: "text.faint", fontFamily: "display" })}>
            Duomo &middot; Spaccanapoli &middot; Decumani
          </p>
          <div className={css({ h: "1px", bg: "steel.border", my: "3" })} />
          <p className={css({ fontSize: "xs", color: "text.secondary", fontFamily: "display" })}>
            {t.locationNote}
          </p>
        </div>
      </div>

      {/* ── Room + Booking details ── */}
      <div className={css({ mb: { base: "8", md: "12" } })}>
        <h2
          className={css({
            fontSize: "h3",
            fontWeight: "700",
            fontFamily: "display",
            color: "text.primary",
            mb: "5",
          })}
        >
          {t.room}
        </h2>

        <div
          className={css({
            bg: "steel.surface",
            border: "1px solid",
            borderColor: "steel.border",
            rounded: "card",
            p: { base: "5", md: "7" },
            display: "flex",
            flexDir: "column",
            gap: "4",
          })}
        >
          <p className={css({ fontSize: "body", color: "text.primary", fontFamily: "display", fontWeight: "600" })}>
            {t.roomDetail}
          </p>

          <div className={css({ h: "1px", bg: "steel.border" })} />

          <InfoRow label={t.board} accent />

          <div className={css({ h: "1px", bg: "steel.border" })} />

          {/* Book button */}
          <a
            href={BOOKING_URL}
            target="_blank"
            rel="noopener noreferrer"
            className={css({
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "2",
              bg: "amber.warm",
              color: "steel.dark",
              fontSize: "xs",
              fontFamily: "display",
              fontWeight: "700",
              letterSpacing: "0.06em",
              textTransform: "uppercase",
              textDecoration: "none",
              px: "6",
              py: "3",
              rounded: "pill",
              transition: "background 0.15s, transform 0.1s",
              alignSelf: "flex-start",
              _hover: { bg: "amber.bright" },
              _active: { transform: "scale(0.98)" },
            })}
          >
            {t.bookNow} &rarr;
          </a>
        </div>
      </div>

      {/* ── Description ── */}
      <div className={css({ mb: { base: "8", md: "12" } })}>
        <div
          className={css({
            bg: "steel.surface",
            border: "1px solid",
            borderColor: "steel.border",
            rounded: "card",
            p: { base: "5", md: "7" },
          })}
        >
          <p
            className={css({
              fontSize: "body",
              color: "text.secondary",
              lineHeight: "1.7",
            })}
          >
            {t.description}
          </p>
        </div>
      </div>

      {/* ── Good to Know ── */}
      <div className={css({ mb: { base: "8", md: "12" } })}>
        <h2
          className={css({
            fontSize: "h3",
            fontWeight: "700",
            fontFamily: "display",
            color: "text.primary",
            mb: "5",
          })}
        >
          {t.notesTitle}
        </h2>

        <div
          className={css({
            bg: "steel.surface",
            border: "1px solid",
            borderColor: "steel.border",
            rounded: "card",
            p: { base: "5", md: "7" },
            display: "flex",
            flexDir: "column",
            gap: "3",
          })}
        >
          {t.notes.map((note) => (
            <InfoRow key={note} label={note} accent={note.includes("Cathedral") || note.includes("Catedrala") || note.includes("pizza") || note.includes("Pizza")} />
          ))}
        </div>
      </div>

      {/* ── Amenities ── */}
      <div className={css({ mb: { base: "8", md: "12" } })}>
        <h2
          className={css({
            fontSize: "h3",
            fontWeight: "700",
            fontFamily: "display",
            color: "text.primary",
            mb: "5",
          })}
        >
          {t.amenitiesTitle}
        </h2>

        <div
          className={css({
            bg: "steel.surface",
            border: "1px solid",
            borderColor: "steel.border",
            rounded: "card",
            p: { base: "5", md: "7" },
          })}
        >
          <div
            className={css({
              display: "grid",
              gridTemplateColumns: { base: "1fr", sm: "repeat(2, 1fr)", lg: "repeat(4, 1fr)" },
              gap: "3",
            })}
          >
            {t.amenities.map((amenity) => (
              <div
                key={amenity}
                className={css({
                  display: "flex",
                  alignItems: "center",
                  gap: "2",
                })}
              >
                <span
                  className={css({
                    w: "4px",
                    h: "4px",
                    rounded: "full",
                    bg: "amber.warm",
                    flexShrink: 0,
                  })}
                />
                <span
                  className={css({
                    fontSize: "meta",
                    color: "text.secondary",
                    fontFamily: "display",
                  })}
                >
                  {amenity}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Nearby ── */}
      <div className={css({ mb: { base: "8", md: "12" } })}>
        <h2
          className={css({
            fontSize: "h3",
            fontWeight: "700",
            fontFamily: "display",
            color: "text.primary",
            mb: "5",
          })}
        >
          {t.nearbyTitle}
        </h2>

        <div
          className={css({
            display: "grid",
            gridTemplateColumns: { base: "1fr", md: "repeat(3, 1fr)" },
            gap: { base: "4", md: "5" },
          })}
        >
          <NearbyCard label={t.landmarksLabel} places={LANDMARKS} />
          <NearbyCard label={t.restaurantsLabel} places={RESTAURANTS} />
          <NearbyCard label={t.transportLabel} places={TRANSPORT} />
        </div>
      </div>

      {/* ── Bottom CTA ── */}
      <div className={css({ textAlign: "center", pt: "4" })}>
        <a
          href={BOOKING_URL}
          target="_blank"
          rel="noopener noreferrer"
          className={css({
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "2",
            bg: "amber.warm",
            color: "steel.dark",
            fontSize: "xs",
            fontFamily: "display",
            fontWeight: "700",
            letterSpacing: "0.06em",
            textTransform: "uppercase",
            textDecoration: "none",
            px: "8",
            py: "3.5",
            rounded: "pill",
            transition: "background 0.15s, transform 0.1s",
            _hover: { bg: "amber.bright" },
            _active: { transform: "scale(0.98)" },
            mb: "6",
          })}
        >
          {t.bookNow} &rarr;
        </a>

        <div>
          <Link
            href="/ischia"
            className={css({
              display: "inline-block",
              fontSize: "meta",
              fontFamily: "display",
              fontWeight: "600",
              color: "text.muted",
              letterSpacing: "0.06em",
              textTransform: "uppercase",
              transition: "color 0.15s",
              _hover: { color: "amber.warm" },
            })}
          >
            &larr; {t.back}
          </Link>
        </div>
      </div>
    </main>
  );
}

function InfoRow({ label, accent }: { label: string; accent?: boolean }) {
  return (
    <div className={css({ display: "flex", alignItems: "center", gap: "2" })}>
      <span
        className={css({
          w: "6px",
          h: "6px",
          rounded: "full",
          bg: accent ? "amber.warm" : "text.faint",
          flexShrink: 0,
        })}
      />
      <span
        className={css({
          fontSize: "meta",
          fontFamily: "display",
          color: accent ? "text.primary" : "text.secondary",
          fontWeight: accent ? "600" : "400",
        })}
      >
        {label}
      </span>
    </div>
  );
}

function NearbyCard({ label, places }: { label: string; places: NearbyPlace[] }) {
  return (
    <div
      className={css({
        bg: "steel.surface",
        border: "1px solid",
        borderColor: "steel.border",
        rounded: "card",
        p: { base: "5", md: "6" },
      })}
    >
      <p
        className={css({
          fontSize: "2xs",
          fontFamily: "display",
          fontWeight: "700",
          letterSpacing: "0.1em",
          textTransform: "uppercase",
          color: "amber.warm",
          mb: "4",
        })}
      >
        {label}
      </p>
      <div className={css({ display: "flex", flexDir: "column", gap: "2.5" })}>
        {places.map((p) => (
          <div
            key={p.name}
            className={css({
              display: "flex",
              alignItems: "baseline",
              justifyContent: "space-between",
              gap: "2",
            })}
          >
            <span className={css({ fontSize: "meta", color: "text.secondary", fontFamily: "display" })}>
              {p.name}
            </span>
            <span
              className={css({
                fontSize: "2xs",
                color: "text.faint",
                fontFamily: "display",
                fontWeight: "600",
                whiteSpace: "nowrap",
              })}
            >
              {p.distance}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
