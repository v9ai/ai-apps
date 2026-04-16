"use client";

import { css } from "styled-system/css";
import Link from "next/link";
import { useLang } from "@/components/LanguageSwitcher";

const BOOKING_URL =
  "https://www.booking.com/hotel/it/la-vispa-teresa.ro.html?age=7&aid=964694&app_hotel_id=565536&checkin=2026-05-31&checkout=2026-06-06&from_sn=android&group_adults=2&group_children=1&label=hotel_details-c9hJBCW%401776336357&no_rooms=1&req_adults=2&req_age=7&req_children=1&room1=A%2CA%2C7";

interface Review {
  name: string;
  country: { en: string; ro: string };
  text: string;
}

interface NearbyPlace {
  name: string;
  distance: string;
}

interface ScoreCategory {
  en: string;
  ro: string;
  score: number;
}

const SCORES: ScoreCategory[] = [
  { en: "Staff", ro: "Personal", score: 9.9 },
  { en: "Facilities", ro: "Facilități", score: 9.5 },
  { en: "Cleanliness", ro: "Curățenie", score: 9.7 },
  { en: "Comfort", ro: "Confort", score: 9.7 },
  { en: "Value for money", ro: "Calitate / preț", score: 9.6 },
  { en: "Location", ro: "Locație", score: 9.6 },
  { en: "Free WiFi", ro: "WiFi gratuit", score: 10 },
];

const REVIEWS: Review[] = [
  {
    name: "Catalin",
    country: { en: "Romania", ro: "România" },
    text: "Totul. In primul rand gazda. Foarte amabila, gata sa te ajute cu orice informație. Curățenia exemplara.",
  },
  {
    name: "Linda",
    country: { en: "United Kingdom", ro: "Regatul Unit" },
    text: "A property we first visited 10 years ago. Then on our return they remembered us. It's clean, comfortable, wonderful staff and in a good location.",
  },
  {
    name: "Milena",
    country: { en: "Serbia", ro: "Serbia" },
    text: "The host super friendly :) Location perfect. Breakfast mmmm the best croissants with pistachio and the Nescafé coffee :)",
  },
  {
    name: "Jitka",
    country: { en: "Czech Republic", ro: "Republica Cehă" },
    text: "Most of all Teresa, the host — we felt welcome, she invited us warmly, explained everything we needed, gave us recommendations, all sent to SMS/WhatsApp.",
  },
  {
    name: "Alexandru",
    country: { en: "Romania", ro: "România" },
    text: "Friendly and helpful host always available to help us with the information that we needed. Very clean large room (everyday cleaning) with nearby good restaurants.",
  },
  {
    name: "Joharna",
    country: { en: "Australia", ro: "Australia" },
    text: "Fantastic accommodation — clean, central, and a wonderful host Teresa. Look forward to returning to Ischia soon and staying here again :)",
  },
];

const BEACHES: NearbyPlace[] = [
  { name: "Spiaggia di San Pietro", distance: "750 m" },
  { name: "Spiaggia dei Pescatori", distance: "900 m" },
  { name: "Spiaggia degli Inglesi", distance: "1.8 km" },
  { name: "Plaja Cartaromana", distance: "2.6 km" },
];

const LANDMARKS: NearbyPlace[] = [
  { name: "Pineta Mirtina Ex Villari", distance: "650 m" },
  { name: "Museo del Mare", distance: "1.2 km" },
  { name: "Aragonese Castle", distance: "1.6 km" },
  { name: "Botanical Garden La Mortella", distance: "8 km" },
  { name: "Monte Epomeo", distance: "6 km" },
];

const RESTAURANTS: NearbyPlace[] = [
  { name: "Calise", distance: "100 m" },
  { name: "Angelolapasticceria", distance: "200 m" },
  { name: "Ristorante Dortas", distance: "350 m" },
];

const AMENITIES_EN = [
  "Free WiFi (10/10)",
  "Free parking",
  "Family rooms",
  "Non-smoking rooms",
  "Breakfast included",
  "Garden & BBQ",
  "Air conditioning",
  "Balcony",
  "Private bathroom",
  "Soundproofing",
  "Coffee machine & minibar",
  "Iron & ironing facilities",
  "Hair dryer",
  "Kettle",
  "Desk & sofa",
  "Fridge",
  "Outdoor dining area",
  "Private entrance",
  "Free toiletries & bathrobes",
];

const AMENITIES_RO = [
  "WiFi gratuit (10/10)",
  "Parcare gratuită",
  "Camere de familie",
  "Camere pentru nefumători",
  "Mic dejun inclus",
  "Grădină & grătar",
  "Aer condiționat",
  "Balcon",
  "Baie privată",
  "Izolare fonică",
  "Mașină de cafea & minibar",
  "Fier și facilități de călcat",
  "Uscător de păr",
  "Cană fierbător",
  "Birou & canapea",
  "Frigider",
  "Zonă de luat masa în aer liber",
  "Intrare privată",
  "Articole de toaletă gratuite & halate",
];

const T = {
  en: {
    back: "All Ischia Hotels",
    badge: "B&B — Booked",
    name: "La Vispa Teresa",
    subtitle: "Via Federico Variopinto 10, Ischia Porto, 80077 Ischia",
    ratingLabel: "Exceptional",
    reviewCount: "98 reviews",
    dates: "31 May – 6 Jun 2026",
    guests: "2 adults · 1 child (7y) · 1 room",
    nights: "6 nights",
    room: "Junior Suite",
    roomDetail: "1 sofa bed + 1 king bed · free cot available · 23 m²",
    priceSection: "Price",
    originalPrice: "5,281 RON",
    currentPrice: "4,492 RON",
    priceNote: "Includes taxes & fees · Genius Level 2 discount (16%)",
    perNight: "~749 RON / night",
    board: "Fabulous breakfast included",
    cancellation: "Free cancellation before 17 May 2026",
    payment: "No prepayment — pay at property",
    availability: "Only 2 left",
    bookNow: "Book on Booking.com",
    reviewsTitle: "Guest Reviews",
    overallScore: "9.7 / 10",
    scoresTitle: "Category Scores",
    amenitiesTitle: "Amenities",
    amenities: AMENITIES_EN,
    nearbyTitle: "Nearby",
    beachesLabel: "Beaches",
    landmarksLabel: "Landmarks",
    restaurantsLabel: "Restaurants",
    policiesTitle: "Policies",
    checkIn: "Check-in: 12:30 – 23:30",
    checkOut: "Check-out: before 11:00",
    children: "Children of all ages welcome. Cot: free. Extra bed (0–11y): €15/child/night. Extra bed (12+): €20/person/night.",
    pets: "Pets not allowed",
    description:
      "La Vispa Teresa is a 9-minute walk from Spiaggia di San Pietro and offers a garden, BBQ facilities, and accommodation with air conditioning, free WiFi, and a balcony. Free private parking is available on site. Each unit has a private bathroom with bidet, free toiletries, hairdryer, and bathrobes. Located 1.7 km from Aragonese Castle and 5 km from Casamicciola Terme Port. Naples International Airport is 50 km away.",
    familyNote: "Families rate this location 10/10 for stays with children.",
    airport: "Naples International Airport — 50 km",
  },
  ro: {
    back: "Toate Hotelurile Ischia",
    badge: "B&B — Rezervat",
    name: "La Vispa Teresa",
    subtitle: "Via Federico Variopinto 10, Ischia Porto, 80077 Ischia",
    ratingLabel: "Excepțional",
    reviewCount: "98 evaluări",
    dates: "31 mai – 6 iun 2026",
    guests: "2 adulți · 1 copil (7 ani) · 1 cameră",
    nights: "6 nopți",
    room: "Suită Junior",
    roomDetail: "1 canapea extensibilă + 1 pat dublu mare · pătuț gratuit la cerere · 23 m²",
    priceSection: "Preț",
    originalPrice: "5.281 lei",
    currentPrice: "4.492 lei",
    priceNote: "Include taxe și costuri · Discount Genius Nivelul 2 (16%)",
    perNight: "~749 lei / noapte",
    board: "Mic dejun fabulos inclus",
    cancellation: "Anulare gratuită înainte de 17 mai 2026",
    payment: "Fără plată în avans — plătiți la proprietate",
    availability: "Au mai rămas 2",
    bookNow: "Rezervă pe Booking.com",
    reviewsTitle: "Evaluările Oaspeților",
    overallScore: "9,7 / 10",
    scoresTitle: "Scoruri pe Categorii",
    amenitiesTitle: "Facilități",
    amenities: AMENITIES_RO,
    nearbyTitle: "Împrejurimi",
    beachesLabel: "Plaje",
    landmarksLabel: "Atracții",
    restaurantsLabel: "Restaurante",
    policiesTitle: "Informații",
    checkIn: "Check-in: 12:30 – 23:30",
    checkOut: "Check-out: înainte de 11:00",
    children: "Copiii de orice vârstă sunt bine-veniți. Pătuț: gratuit. Pat suplimentar (0–11 ani): €15/copil/noapte. Pat suplimentar (12+): €20/persoană/noapte.",
    pets: "Animalele de companie nu sunt acceptate",
    description:
      "La Vispa Teresa se găsește la 9 minute de mers pe jos de Spiaggia di San Pietro și oferă o grădină, facilități de grătar și unități de cazare cu aer condiționat, WiFi gratuit și balcon. Se oferă la locație parcare privată. În fiecare unitate există o baie proprie cu bideu, articole de toaletă gratuite, uscător de păr și halate de baie. Se află la 1,7 km de Aragonese Castle și la 5 km de Portul Casamicciola Terme. Aeroportul Internațional Napoli se află la 50 km.",
    familyNote: "Familiile dau scorul 10/10 pentru sejururi cu copiii.",
    airport: "Aeroportul Internațional Napoli — 50 km",
  },
};

export function LaVispaTeresaDetail() {
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

      {/* ── Rating + Price hero row ── */}
      <div
        className={css({
          display: "flex",
          flexWrap: "wrap",
          gap: { base: "4", md: "6" },
          mb: { base: "8", md: "12" },
        })}
      >
        {/* Rating card */}
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
            {t.overallScore}
          </p>
          <p className={css({ fontSize: "meta", color: "text.faint", fontFamily: "display" })}>
            {t.ratingLabel} &middot; {t.reviewCount}
          </p>
          <div className={css({ h: "1px", bg: "steel.border", my: "3" })} />
          <p className={css({ fontSize: "xs", color: "text.secondary", fontFamily: "display" })}>
            {t.familyNote}
          </p>
        </div>

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
          <div className={css({ display: "flex", alignItems: "baseline", gap: "3", mb: "1" })}>
            <p
              className={css({
                fontSize: "h1",
                fontWeight: "800",
                fontFamily: "display",
                color: "amber.warm",
                lineHeight: "1.1",
              })}
            >
              {t.currentPrice}
            </p>
            <p
              className={css({
                fontSize: "body",
                fontFamily: "display",
                color: "text.faint",
                textDecoration: "line-through",
              })}
            >
              {t.originalPrice}
            </p>
          </div>
          <p className={css({ fontSize: "meta", color: "text.faint", fontFamily: "display" })}>
            {t.nights} &middot; {t.perNight}
          </p>
          <div className={css({ h: "1px", bg: "steel.border", my: "3" })} />
          <p className={css({ fontSize: "xs", color: "text.secondary", fontFamily: "display" })}>
            {t.priceNote}
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

          {/* Board */}
          <InfoRow
            label={t.board}
            accent
          />

          {/* Cancellation */}
          <InfoRow label={t.cancellation} accent />

          {/* Payment */}
          <InfoRow label={t.payment} />

          {/* Availability */}
          <div
            className={css({
              display: "inline-flex",
              alignItems: "center",
              gap: "2",
              bg: "rgba(201,146,42,0.1)",
              border: "1px solid rgba(201,146,42,0.3)",
              rounded: "pill",
              px: "4",
              py: "1.5",
              alignSelf: "flex-start",
            })}
          >
            <span
              className={css({
                w: "6px",
                h: "6px",
                rounded: "full",
                bg: "amber.warm",
                animation: "pulse 2s ease-in-out infinite",
              })}
            />
            <span
              className={css({
                fontSize: "2xs",
                fontFamily: "display",
                fontWeight: "700",
                color: "amber.warm",
                letterSpacing: "0.06em",
                textTransform: "uppercase",
              })}
            >
              {t.availability}
            </span>
          </div>

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

      {/* ── Category Scores ── */}
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
          {t.scoresTitle}
        </h2>

        <div
          className={css({
            display: "grid",
            gridTemplateColumns: { base: "1fr", sm: "repeat(2, 1fr)", lg: "repeat(4, 1fr)" },
            gap: { base: "3", md: "4" },
          })}
        >
          {SCORES.map((cat) => (
            <div
              key={cat.en}
              className={css({
                bg: "steel.surface",
                border: "1px solid",
                borderColor: cat.score >= 9.7 ? "rgba(201,146,42,0.4)" : "steel.border",
                rounded: "card",
                p: "4",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: "3",
              })}
            >
              <span
                className={css({
                  fontSize: "xs",
                  fontFamily: "display",
                  color: "text.secondary",
                })}
              >
                {cat[lang]}
              </span>
              <span
                className={css({
                  fontSize: "h3",
                  fontWeight: "800",
                  fontFamily: "display",
                  color: cat.score === 10 ? "amber.warm" : "text.primary",
                })}
              >
                {cat.score.toFixed(1).replace(".", lang === "ro" ? "," : ".")}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* ── Guest Reviews ── */}
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
          {t.reviewsTitle}
        </h2>

        <div
          className={css({
            display: "grid",
            gridTemplateColumns: { base: "1fr", md: "repeat(2, 1fr)", xl: "repeat(3, 1fr)" },
            gap: { base: "3", md: "4" },
          })}
        >
          {REVIEWS.map((review) => (
            <div
              key={review.name}
              className={css({
                bg: "steel.surface",
                border: "1px solid",
                borderColor: "steel.border",
                rounded: "card",
                p: { base: "5", md: "6" },
                display: "flex",
                flexDir: "column",
                gap: "3",
                transition: "border-color 0.2s",
                _hover: { borderColor: "steel.borderHover" },
              })}
            >
              <div className={css({ display: "flex", alignItems: "center", gap: "3" })}>
                <div
                  className={css({
                    w: "36px",
                    h: "36px",
                    rounded: "full",
                    bg: "steel.raised",
                    border: "1px solid",
                    borderColor: "steel.border",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "xs",
                    fontWeight: "700",
                    fontFamily: "display",
                    color: "amber.warm",
                    flexShrink: 0,
                  })}
                >
                  {review.name[0]}
                </div>
                <div>
                  <p
                    className={css({
                      fontSize: "xs",
                      fontWeight: "700",
                      fontFamily: "display",
                      color: "text.primary",
                      lineHeight: "1.2",
                    })}
                  >
                    {review.name}
                  </p>
                  <p
                    className={css({
                      fontSize: "2xs",
                      fontFamily: "display",
                      color: "text.faint",
                    })}
                  >
                    {review.country[lang]}
                  </p>
                </div>
              </div>
              <p
                className={css({
                  fontSize: "meta",
                  color: "text.secondary",
                  lineHeight: "1.55",
                  fontStyle: "italic",
                })}
              >
                &ldquo;{review.text}&rdquo;
              </p>
            </div>
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
              gridTemplateColumns: { base: "1fr", sm: "repeat(2, 1fr)", lg: "repeat(3, 1fr)" },
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
          <NearbyCard label={t.beachesLabel} places={BEACHES} />
          <NearbyCard label={t.landmarksLabel} places={LANDMARKS} />
          <NearbyCard label={t.restaurantsLabel} places={RESTAURANTS} />
        </div>
      </div>

      {/* ── Policies ── */}
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
          {t.policiesTitle}
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
          <InfoRow label={t.checkIn} />
          <InfoRow label={t.checkOut} />
          <div className={css({ h: "1px", bg: "steel.border" })} />
          <p className={css({ fontSize: "meta", color: "text.secondary", lineHeight: "1.6", fontFamily: "display" })}>
            {t.children}
          </p>
          <p className={css({ fontSize: "meta", color: "text.muted", fontFamily: "display" })}>
            {t.pets}
          </p>
          <p className={css({ fontSize: "meta", color: "text.muted", fontFamily: "display" })}>
            {t.airport}
          </p>
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
