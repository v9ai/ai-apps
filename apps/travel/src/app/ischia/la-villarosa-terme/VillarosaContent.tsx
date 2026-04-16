"use client";

import { css } from "styled-system/css";
import Link from "next/link";
import { useLang } from "@/components/LanguageSwitcher";
import { ISCHIA_HOTELS, TIER_META, getIschiaHotelsByTier } from "../hotels";
import { NIGHTS, DATE_RANGE_LABEL } from "../constants";

const SLUG = "la-villarosa-terme";
const BOOKING_URL =
  "https://www.booking.com/hotel/it/la-villarosa-terme.html?checkin=2026-05-31&checkout=2026-06-07&group_adults=2&group_children=1&age=7&no_rooms=1";

const BOARD_OPTIONS = {
  en: [
    { label: "Breakfast", tag: "BB", priceNight: 218, emoji: "◇" },
    { label: "Half Board", tag: "HB", priceNight: 226, emoji: "◈" },
    { label: "Full Board", tag: "FB", priceNight: 234, emoji: "◆" },
  ],
  ro: [
    { label: "Mic Dejun", tag: "MD", priceNight: 218, emoji: "◇" },
    { label: "Demi-pensiune", tag: "DP", priceNight: 226, emoji: "◈" },
    { label: "Pensiune Completă", tag: "PC", priceNight: 234, emoji: "◆" },
  ],
};

const HIGHLIGHTS = {
  en: [
    { icon: "♨", title: "Thermal Pool", desc: "Outdoor pool with volcanic hot water" },
    { icon: "⛱", title: "Private Beach", desc: "Free sunbeds & umbrellas, 300m walk, May–Oct" },
    { icon: "✦", title: "Rooftop Restaurant", desc: "4th floor, panoramic sea views, Mediterranean cuisine" },
    { icon: "❋", title: "Tropical Gardens", desc: "19th-century botanical setting, garden-view rooms" },
    { icon: "⚕", title: "Parco Aurora Spa", desc: "Free wellness centre & gym access, 500m" },
    { icon: "▣", title: "Central Location", desc: "Via Roma — Ischia Porto's main street, walk everywhere" },
  ],
  ro: [
    { icon: "♨", title: "Piscină Termală", desc: "Piscină exterioară cu apă caldă vulcanică" },
    { icon: "⛱", title: "Plajă Privată", desc: "Șezlonguri & umbrele gratuite, la 300m, mai–oct" },
    { icon: "✦", title: "Restaurant Panoramic", desc: "Etajul 4, vedere la mare, bucătărie mediteraneană" },
    { icon: "❋", title: "Grădini Tropicale", desc: "Cadru botanic din sec. XIX, camere cu vedere la grădină" },
    { icon: "⚕", title: "Spa Parco Aurora", desc: "Acces gratuit centru wellness & fitness, 500m" },
    { icon: "▣", title: "Locație Centrală", desc: "Via Roma — strada principală din Ischia Porto" },
  ],
};

const REVIEWS = [
  {
    name: "Andreea",
    country: { en: "Romania", ro: "România" },
    text: {
      en: "The villa is located in the centre, on Via Roma in Ischia Porto — the liveliest street. It's an oasis of nature, the building is impressive, superb architecture, private beach, thermal pool.",
      ro: "Vila este situată în centru, pe strada Via Roma din Ischia Porto, strada cea mai animată. Este o oază în natură, clădirea este impresionantă, arhitectura superbă, plajă proprie, piscină termală.",
    },
  },
  {
    name: "Adriana",
    country: { en: "Romania", ro: "România" },
    text: {
      en: "The food is extraordinary, and the staff very attentive and professional. It is the best relaxation holiday with all-inclusive, hot thermal water and spa.",
      ro: "Mâncarea este extraordinară, iar personalul foarte atent și profesionist. Este cea mai bună vacanță de relaxare cu all inclusive, apă termală caldă și spa.",
    },
  },
  {
    name: "Samuel",
    country: { en: "Switzerland", ro: "Elveția" },
    text: {
      en: "Extremely pleasant family and charming hotel. We had full board. It was extremely affordable, food was absolutely delicious & abundant.",
      ro: "Hotel extrem de plăcut și fermecător pentru familii. Am avut pensiune completă. A fost foarte accesibil, mâncarea absolut delicioasă și abundentă.",
    },
  },
  {
    name: "Evelina",
    country: { en: "Lithuania", ro: "Lituania" },
    text: {
      en: "Fabulous hotel, set in the Ischia Porto centre. Beautiful gardens, rooftop restaurant with amazing views, Italian style decor that reminded me of some kind of movie. Room was spacious and comfortable.",
      ro: "Hotel fabulos, în centrul din Ischia Porto. Grădini superbe, restaurant pe acoperiș cu priveliști uimitoare, decor în stil italian ca dintr-un film. Camera spațioasă și confortabilă.",
    },
  },
  {
    name: "Frances",
    country: { en: "Ireland", ro: "Irlanda" },
    text: {
      en: "Old style of building, gardens are beautiful, clean snow white towels, very clean, lovely staff. Loved the thermal pool.",
      ro: "Clădire în stil vechi, grădinile sunt superbe, prosoape albe imaculate, foarte curat, personal minunat. Am adorat piscina termală.",
    },
  },
];

const NEARBY = {
  en: [
    { name: "Spiaggia di San Pietro", dist: "200m" },
    { name: "Lido Solemar", dist: "200m" },
    { name: "Pineta Mirtina", dist: "950m" },
    { name: "Museo del Mare", dist: "1.6km" },
    { name: "Aragonese Castle", dist: "2km" },
    { name: "Botanical Garden La Mortella", dist: "7km" },
    { name: "Monte Epomeo", dist: "5km" },
  ],
  ro: [
    { name: "Spiaggia di San Pietro", dist: "200m" },
    { name: "Lido Solemar", dist: "200m" },
    { name: "Pineta Mirtina", dist: "950m" },
    { name: "Museo del Mare", dist: "1.6km" },
    { name: "Castelul Aragonez", dist: "2km" },
    { name: "Grădina Botanică La Mortella", dist: "7km" },
    { name: "Monte Epomeo", dist: "5km" },
  ],
};

const RATINGS = [
  { label: { en: "Overall", ro: "General" }, score: 8.4 },
  { label: { en: "Location", ro: "Locație" }, score: 9.4 },
  { label: { en: "Family", ro: "Familie" }, score: 9.3 },
  { label: { en: "Staff", ro: "Personal" }, score: 9.1 },
  { label: { en: "Cleanliness", ro: "Curățenie" }, score: 8.6 },
  { label: { en: "Value", ro: "Raport calitate/preț" }, score: 8.6 },
  { label: { en: "Comfort", ro: "Confort" }, score: 8.5 },
  { label: { en: "Facilities", ro: "Facilități" }, score: 8.3 },
];

const T = {
  en: {
    back: "All Ischia Hotels",
    tagline: `Ischia Porto, Italy  ·  ${DATE_RANGE_LABEL.en}  ·  2 Adults + 1 Child`,
    boardOptions: "Board Options",
    perNight: "/ night",
    weekTotal: (n: number) => `${NIGHTS}-night total: €${n}`,
    freeCancellation: "Free cancellation before 17 May 2026",
    noPayUpfront: "No prepayment — pay at property",
    genius: "Genius Level 2 — 10% discount included",
    highlights: "What Makes It Special",
    reviews: "Guest Reviews",
    reviewCount: "1,229 reviews on Booking.com",
    nearby: "What's Nearby",
    practical: "Practical Info",
    checkIn: "Check-in",
    checkOut: "Check-out",
    checkInTime: "From 13:00",
    checkOutTime: "Until 10:00",
    children: "Children",
    childrenPolicy: "Welcome from age 1. Adult rates from age 11. Cot available: €20/night (1–2 years).",
    parking: "Parking",
    parkingInfo: "Free private parking",
    pets: "Pets",
    petsInfo: "Allowed (charges may apply)",
    transfer: "Transfer",
    transferInfo: "Available to/from Naples Central Station & Capodichino Airport",
    room: "Room",
    roomDesc: "20m² double/twin · garden view · some with balcony · 19th-century Neapolitan style · iron-wrought beds · wooden furniture · AC · satellite TV · minibar",
    bookNow: "Book on Booking.com",
    otherHotels: "Other Comfort Tier Hotels",
    allTiers: "Browse All Ischia Hotels",
    description: "Set on the main street of Ischia Porto, Hotel La Villarosa Terme is a 19th-century villa turned thermal hotel, 300 metres from its private beach. The building is wrapped in tropical gardens and crowned by a rooftop restaurant on the 4th floor with panoramic sea views. Rooms are inspired by classic Neapolitan, Sicilian, and French styles — iron-wrought beds, wooden furniture, garden views. Every morning: a sweet-and-savoury buffet breakfast, on the terrace when the weather allows.",
  },
  ro: {
    back: "Toate Hotelurile Ischia",
    tagline: `Ischia Porto, Italia  ·  ${DATE_RANGE_LABEL.ro}  ·  2 Adulți + 1 Copil`,
    boardOptions: "Opțiuni Pensiune",
    perNight: "/ noapte",
    weekTotal: (n: number) => `Total ${NIGHTS} nopți: €${n}`,
    freeCancellation: "Anulare gratuită înainte de 17 mai 2026",
    noPayUpfront: "Fără plată în avans — plătiți la proprietate",
    genius: "Genius Nivelul 2 — discount 10% inclus",
    highlights: "Ce Îl Face Special",
    reviews: "Recenzii Oaspeți",
    reviewCount: "1.229 recenzii pe Booking.com",
    nearby: "Ce Găsești în Apropiere",
    practical: "Informații Practice",
    checkIn: "Check-in",
    checkOut: "Check-out",
    checkInTime: "De la 13:00",
    checkOutTime: "Până la 10:00",
    children: "Copii",
    childrenPolicy: "Bineveniți de la 1 an. Tarif adult de la 11 ani. Pătuț disponibil: €20/noapte (1–2 ani).",
    parking: "Parcare",
    parkingInfo: "Parcare privată gratuită",
    pets: "Animale",
    petsInfo: "Acceptate (se pot percepe taxe)",
    transfer: "Transfer",
    transferInfo: "Disponibil spre/de la Gara Centrală Napoli & Aeroportul Capodichino",
    room: "Camera",
    roomDesc: "20m² dublă/twin · vedere la grădină · unele cu balcon · stil napoletan sec. XIX · paturi fier forjat · mobilier din lemn · AC · TV satelit · minibar",
    bookNow: "Rezervă pe Booking.com",
    otherHotels: "Alte Hoteluri Nivel Confort",
    allTiers: "Vezi Toate Hotelurile Ischia",
    description: "Situate pe strada principală din Ischia Porto, Hotel La Villarosa Terme este o vilă din secolul al XIX-lea transformată în hotel termal, la 300 de metri de plaja sa privată. Clădirea este înconjurată de grădini tropicale și are un restaurant pe acoperiș la etajul 4 cu vedere panoramică la mare. Camerele sunt inspirate din stilurile clasice napoletane, siciliene și franceze — paturi din fier forjat, mobilier din lemn, vedere la grădină. În fiecare dimineață: bufet dulce-sărat, pe terasă când vremea permite.",
  },
};

/* ── label helper ── */
const labelCss = css({
  fontSize: "2xs",
  fontFamily: "display",
  fontWeight: "700",
  letterSpacing: "0.1em",
  textTransform: "uppercase",
  color: "text.faint",
  mb: "2",
});

const sectionTitle = css({
  fontSize: "h3",
  fontWeight: "700",
  fontFamily: "display",
  color: "text.primary",
  mb: "5",
});

export function VillarosaContent() {
  const { lang } = useLang();
  const t = T[lang];
  const boards = BOARD_OPTIONS[lang];
  const highlights = HIGHLIGHTS[lang];
  const nearby = NEARBY[lang];

  const hotel = ISCHIA_HOTELS.find((h) => h.slug === SLUG)!;
  const tierMeta = TIER_META[hotel.tierIndex][lang];
  const siblings = getIschiaHotelsByTier(hotel.tierIndex).filter((s) => s.slug !== SLUG);

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

      {/* ── Hero ── */}
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
          {tierMeta.tier}
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
          Hotel La Villarosa Terme
        </h1>

        <p
          className={css({
            fontSize: { base: "body", md: "h3" },
            fontFamily: "display",
            color: "text.muted",
            letterSpacing: "0.02em",
            mb: "6",
          })}
        >
          {t.tagline}
        </p>

        {/* Rating badges */}
        <div className={css({ display: "flex", flexWrap: "wrap", gap: "3" })}>
          {RATINGS.map((r) => (
            <div
              key={r.label.en}
              className={css({
                bg: "steel.surface",
                border: "1px solid",
                borderColor: r.score >= 9 ? "amber.warm" : "steel.border",
                rounded: "card",
                px: "4",
                py: "2",
                display: "flex",
                alignItems: "baseline",
                gap: "2",
              })}
            >
              <span
                className={css({
                  fontSize: "h3",
                  fontWeight: "800",
                  fontFamily: "display",
                  color: r.score >= 9 ? "amber.warm" : "text.primary",
                  lineHeight: "1",
                })}
              >
                {r.score}
              </span>
              <span className={css({ fontSize: "2xs", color: "text.faint", fontFamily: "display" })}>
                {r.label[lang]}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* ── Description ── */}
      <div className={css({ mb: { base: "8", md: "12" }, maxW: "3xl" })}>
        <p
          className={css({
            fontSize: "body",
            color: "text.secondary",
            lineHeight: "1.8",
          })}
        >
          {t.description}
        </p>
      </div>

      {/* ── Board / Pricing options ── */}
      <div className={css({ mb: { base: "8", md: "12" } })}>
        <h2 className={sectionTitle}>{t.boardOptions}</h2>

        <div
          className={css({
            display: "grid",
            gridTemplateColumns: { base: "1fr", md: "repeat(3, 1fr)" },
            gap: { base: "4", md: "5" },
            mb: "4",
          })}
        >
          {boards.map((b, i) => (
            <div
              key={b.tag}
              className={css({
                bg: "steel.surface",
                border: "1px solid",
                borderColor: i === 1 ? "amber.warm" : "steel.border",
                rounded: "card",
                p: { base: "5", md: "6" },
                display: "flex",
                flexDir: "column",
                gap: "3",
                position: "relative",
              })}
            >
              {i === 1 && (
                <span
                  className={css({
                    position: "absolute",
                    top: "-10px",
                    right: "12px",
                    bg: "amber.warm",
                    color: "steel.dark",
                    fontSize: "2xs",
                    fontFamily: "display",
                    fontWeight: "700",
                    letterSpacing: "0.06em",
                    px: "3",
                    py: "1",
                    rounded: "sm",
                    textTransform: "uppercase",
                  })}
                >
                  {lang === "en" ? "Best value" : "Cel mai bun raport"}
                </span>
              )}
              <p className={css({ fontSize: "2xs", fontFamily: "display", fontWeight: "700", color: "text.faint", letterSpacing: "0.08em", textTransform: "uppercase" })}>
                {b.emoji} {b.tag}
              </p>
              <p className={css({ fontSize: "xs", fontWeight: "600", fontFamily: "display", color: "text.primary" })}>
                {b.label}
              </p>
              <div className={css({ h: "1px", bg: "steel.border" })} />
              <p className={css({ fontSize: "h2", fontWeight: "800", fontFamily: "display", color: "amber.warm", lineHeight: "1.1" })}>
                ~€{b.priceNight}
                <span className={css({ fontSize: "meta", fontWeight: "500", color: "text.faint", ml: "1" })}>
                  {t.perNight}
                </span>
              </p>
              <p className={css({ fontSize: "meta", color: "text.muted", fontFamily: "display" })}>
                {t.weekTotal(b.priceNight * NIGHTS)}
              </p>
            </div>
          ))}
        </div>

        <div className={css({ display: "flex", flexDir: "column", gap: "1" })}>
          <p className={css({ fontSize: "2xs", color: "text.faint", fontFamily: "display" })}>
            ✓ {t.freeCancellation}
          </p>
          <p className={css({ fontSize: "2xs", color: "text.faint", fontFamily: "display" })}>
            ✓ {t.noPayUpfront}
          </p>
          <p className={css({ fontSize: "2xs", color: "amber.warm", fontFamily: "display", fontWeight: "600" })}>
            ✦ {t.genius}
          </p>
        </div>
      </div>

      {/* ── Highlights grid ── */}
      <div className={css({ mb: { base: "8", md: "12" } })}>
        <h2 className={sectionTitle}>{t.highlights}</h2>

        <div
          className={css({
            display: "grid",
            gridTemplateColumns: { base: "1fr", sm: "1fr 1fr", md: "repeat(3, 1fr)" },
            gap: { base: "4", md: "5" },
          })}
        >
          {highlights.map((h) => (
            <div
              key={h.title}
              className={css({
                bg: "steel.surface",
                border: "1px solid",
                borderColor: "steel.border",
                rounded: "card",
                p: { base: "5", md: "6" },
              })}
            >
              <p className={css({ fontSize: "h2", mb: "2", lineHeight: "1" })}>{h.icon}</p>
              <p className={css({ fontSize: "xs", fontWeight: "700", fontFamily: "display", color: "text.primary", mb: "1" })}>
                {h.title}
              </p>
              <p className={css({ fontSize: "meta", color: "text.muted", lineHeight: "1.5" })}>
                {h.desc}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* ── Room details ── */}
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
          <p className={labelCss}>{t.room}</p>
          <p className={css({ fontSize: "body", color: "text.secondary", lineHeight: "1.7" })}>
            {t.roomDesc}
          </p>
        </div>
      </div>

      {/* ── Reviews ── */}
      <div className={css({ mb: { base: "8", md: "12" } })}>
        <h2 className={sectionTitle}>{t.reviews}</h2>
        <p className={css({ fontSize: "meta", color: "text.faint", fontFamily: "display", mb: "5" })}>
          {t.reviewCount}
        </p>

        <div className={css({ display: "flex", flexDir: "column", gap: "4" })}>
          {REVIEWS.map((r) => (
            <div
              key={r.name}
              className={css({
                bg: "steel.surface",
                border: "1px solid",
                borderColor: "steel.border",
                rounded: "card",
                p: { base: "5", md: "6" },
              })}
            >
              <div className={css({ display: "flex", justifyContent: "space-between", alignItems: "baseline", mb: "3" })}>
                <p className={css({ fontSize: "xs", fontWeight: "700", fontFamily: "display", color: "text.primary" })}>
                  {r.name}
                </p>
                <p className={css({ fontSize: "2xs", color: "text.faint", fontFamily: "display" })}>
                  {r.country[lang]}
                </p>
              </div>
              <p className={css({ fontSize: "meta", color: "text.secondary", lineHeight: "1.7", fontStyle: "italic" })}>
                &ldquo;{r.text[lang]}&rdquo;
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* ── Nearby ── */}
      <div className={css({ mb: { base: "8", md: "12" } })}>
        <h2 className={sectionTitle}>{t.nearby}</h2>

        <div
          className={css({
            bg: "steel.surface",
            border: "1px solid",
            borderColor: "steel.border",
            rounded: "card",
            p: { base: "5", md: "7" },
            display: "grid",
            gridTemplateColumns: { base: "1fr", sm: "1fr 1fr" },
            gap: "3",
          })}
        >
          {nearby.map((n) => (
            <div key={n.name} className={css({ display: "flex", justifyContent: "space-between", alignItems: "baseline" })}>
              <p className={css({ fontSize: "meta", color: "text.secondary", fontFamily: "display" })}>
                {n.name}
              </p>
              <p className={css({ fontSize: "2xs", color: "text.faint", fontFamily: "display", fontWeight: "600", flexShrink: 0, ml: "3" })}>
                {n.dist}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* ── Practical info ── */}
      <div className={css({ mb: { base: "8", md: "12" } })}>
        <h2 className={sectionTitle}>{t.practical}</h2>

        <div
          className={css({
            bg: "steel.surface",
            border: "1px solid",
            borderColor: "steel.border",
            rounded: "card",
            p: { base: "5", md: "7" },
            display: "grid",
            gridTemplateColumns: { base: "1fr", md: "1fr 1fr" },
            gap: "5",
          })}
        >
          {[
            { label: t.checkIn, value: t.checkInTime },
            { label: t.checkOut, value: t.checkOutTime },
            { label: t.children, value: t.childrenPolicy },
            { label: t.parking, value: t.parkingInfo },
            { label: t.pets, value: t.petsInfo },
            { label: t.transfer, value: t.transferInfo },
          ].map((item) => (
            <div key={item.label}>
              <p className={labelCss}>{item.label}</p>
              <p className={css({ fontSize: "meta", color: "text.secondary", lineHeight: "1.6" })}>
                {item.value}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* ── Book CTA ── */}
      <div className={css({ textAlign: "center", mb: { base: "10", md: "14" } })}>
        <a
          href={BOOKING_URL}
          target="_blank"
          rel="noopener noreferrer"
          className={css({
            display: "inline-block",
            bg: "amber.warm",
            color: "steel.dark",
            fontSize: "xs",
            fontWeight: "700",
            fontFamily: "display",
            letterSpacing: "0.06em",
            textTransform: "uppercase",
            textDecoration: "none",
            px: "8",
            py: "4",
            rounded: "card",
            transition: "opacity 0.15s, transform 0.15s",
            _hover: { opacity: 0.9, transform: "translateY(-2px)" },
          })}
        >
          {t.bookNow} &rarr;
        </a>
      </div>

      {/* ── Other hotels in tier ── */}
      {siblings.length > 0 && (
        <div className={css({ mb: { base: "8", md: "12" } })}>
          <h2 className={sectionTitle}>{t.otherHotels}</h2>

          <div
            className={css({
              display: "grid",
              gridTemplateColumns: { base: "1fr", md: `repeat(${Math.min(siblings.length, 3)}, 1fr)` },
              gap: { base: "4", md: "5" },
            })}
          >
            {siblings.map((sib) => {
              const s = sib[lang];
              const sibStars = Array.from({ length: 5 }, (_, i) => (i < s.qualityPrice ? "★" : "☆")).join("");
              return (
                <Link
                  key={sib.slug}
                  href={`/ischia/${sib.slug}`}
                  className={css({
                    bg: "steel.surface",
                    border: "1px solid",
                    borderColor: "steel.border",
                    rounded: "card",
                    boxShadow: "card",
                    p: { base: "5", md: "6" },
                    display: "flex",
                    flexDir: "column",
                    gap: "3",
                    transition: "border-color 0.2s, box-shadow 0.2s",
                    textDecoration: "none",
                    _hover: { borderColor: "amber.warm", boxShadow: "card.hover" },
                  })}
                >
                  <p className={css({ fontSize: "xs", fontWeight: "700", fontFamily: "display", color: "text.primary", lineHeight: "1.3" })}>
                    {s.name}
                  </p>
                  <p className={css({ fontSize: "2xs", color: "text.faint", fontFamily: "display" })}>
                    {s.area} &middot; {s.note}
                  </p>
                  <div className={css({ h: "1px", bg: "steel.border" })} />
                  <div className={css({ display: "flex", justifyContent: "space-between", alignItems: "baseline" })}>
                    <span className={css({ fontSize: "h3", fontWeight: "700", fontFamily: "display", color: "amber.warm" })}>
                      {s.price}
                    </span>
                    <span className={css({ fontSize: "2xs", fontWeight: "700", fontFamily: "display", color: s.qualityPrice >= 4 ? "amber.warm" : "text.faint" })}>
                      {sibStars}
                    </span>
                  </div>
                  <p className={css({ fontSize: "2xs", color: "text.muted", fontFamily: "display" })}>
                    {s.thermalPools}
                  </p>
                </Link>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Back to all ── */}
      <div className={css({ textAlign: "center", pt: "4" })}>
        <Link
          href="/ischia"
          className={css({
            display: "inline-block",
            fontSize: "meta",
            fontFamily: "display",
            fontWeight: "600",
            color: "amber.warm",
            letterSpacing: "0.06em",
            textTransform: "uppercase",
            transition: "opacity 0.15s",
            _hover: { opacity: 0.8 },
          })}
        >
          &larr; {t.allTiers}
        </Link>
      </div>
    </main>
  );
}
