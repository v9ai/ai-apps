"use client";

import { css } from "styled-system/css";
import Link from "next/link";
import { useLang } from "@/components/LanguageSwitcher";

/* ── Constants ─────────────────────────────────────────────────────── */
const BOOKING_URL =
  "https://www.booking.com/hotel/it/maronti.ro.html?age=7&aid=964694&app_hotel_id=618644&checkin=2026-05-31&checkout=2026-06-06&from_sn=android&group_adults=2&group_children=1&label=hotel_details-XMmDZmN%401776336442&no_rooms=1&req_adults=2&req_age=7&req_children=1&room1=A%2CA%2C7";

const CHECK_IN = "31 Mai";
const CHECK_OUT = "6 Iun";
const NIGHTS = 6;

/* ── Translations ──────────────────────────────────────────────────── */
const T = {
  en: {
    back: "Ischia Guide",
    hotelName: "Hotel Maronti",
    subtitle: "Barano d'Ischia — Maronti Beach",
    tagline: "Family-run beachfront hotel, 1 minute from Ischia's largest beach",
    dateRange: `${CHECK_IN} – ${CHECK_OUT} 2026`,
    nights: `${NIGHTS} nights`,
    guests: "2 adults + 1 child (age 7)",
    bookOnBooking: "View on Booking.com",
    overview: "Overview",
    overviewText:
      "Hotel Maronti is a 25-room family-run hotel perched directly above Maronti Beach — the largest beach on Ischia. Owner Ernesto is legendary among guests for genuine hospitality: arranging boat trips, restaurant tips, and thermal park logistics. The hotel trades resort polish for authenticity — classic tiled rooms, a sweet Italian breakfast under a magnolia tree, and a floral garden with jacuzzi looking toward Sant'Angelo.",
    location: "Location",
    locationText:
      "Via Maronti 18, Barano d'Ischia. One minute on foot to Maronti Beach. Bus stop 200m away connects to Ischia Porto in ~15 minutes. Walking distance to Cavascura Natural Hot Springs and Olympus Thermal Park.",
    rooms: "Rooms",
    roomEconomy: "Economy",
    roomEconomyDesc: "Courtyard view, fan, tiled floors, private bathroom",
    roomStandard: "Standard",
    roomStandardDesc: "Beach & lateral sea view, window or balcony",
    roomClassic: "Classic Sea View",
    roomClassicDesc: "Frontal sea view, private balcony, best panorama",
    included: "Included in Stay",
    breakfast: "Sweet breakfast daily",
    beach: "Free beach service (umbrellas & sunbeds)",
    beachNote: "Jul–Aug excluded",
    wifi: "Free WiFi",
    parking: "Free parking nearby",
    garden: "Garden with jacuzzi & sun terrace",
    restaurant: "Traditional restaurant & bar",
    toiletries: "Private bathroom with toiletries & hairdryer",
    marmalade: "Complimentary jar of marmalade at checkout",
    reviews: "Guest Reviews",
    bookingScore: "9.1 / 10",
    bookingReviews: "150 reviews on Booking.com",
    googleScore: "4.5 / 5",
    googleReviews: "149 reviews on Google",
    guestHighlight: "Guests consistently praise host Ernesto's warm hospitality, the clean rooms with sea views, plentiful breakfast, and the unbeatable beach proximity.",
    checkTimes: "Check-in & Check-out",
    checkIn: "Check-in: 12:00 – 19:00",
    checkOut: "Check-out: 08:00 – 10:00",
    nearby: "Nearby",
    nearbyItems: [
      "Maronti Beach — 1 min walk (largest beach on Ischia)",
      "Cavascura Natural Hot Springs — 15 min walk along beach",
      "Olympus Thermal Park — 10 min walk",
      "Sant'Angelo village — 20 min walk or water taxi",
      "Bus to Ischia Porto — 15 min from stop 200m away",
    ],
    whyThisHotel: "Why This Hotel",
    whyItems: [
      "Closest hotel to Maronti Beach — no shuttle or taxi needed",
      "Genuine family atmosphere — Ernesto runs it personally",
      "Breakfast included, free beach service, jacuzzi garden",
      "Walking distance to Cavascura natural hot springs",
      "Budget-friendly base for exploring all of Ischia's south coast",
    ],
  },
  ro: {
    back: "Ghid Ischia",
    hotelName: "Hotel Maronti",
    subtitle: "Barano d'Ischia — Plaja Maronti",
    tagline: "Hotel de familie pe plajă, la 1 minut de cea mai mare plajă din Ischia",
    dateRange: `${CHECK_IN} – ${CHECK_OUT} 2026`,
    nights: `${NIGHTS} nopți`,
    guests: "2 adulți + 1 copil (7 ani)",
    bookOnBooking: "Vezi pe Booking.com",
    overview: "Prezentare",
    overviewText:
      "Hotel Maronti este un hotel familial cu 25 de camere, situat direct deasupra plajei Maronti — cea mai mare plajă din Ischia. Proprietarul Ernesto este legendar printre oaspeți pentru ospitalitatea autentică: organizează excursii cu barca, recomandări de restaurante și logistică pentru parcurile termale. Hotelul oferă autenticitate în locul luxului de resort — camere clasice cu gresie, mic dejun italian sub un magnolie și o grădină cu jacuzzi cu vedere spre Sant'Angelo.",
    location: "Locație",
    locationText:
      "Via Maronti 18, Barano d'Ischia. Un minut pe jos până la plaja Maronti. Stația de autobuz la 200m, conectează la Ischia Porto în ~15 minute. La distanță de mers pe jos de izvoarele naturale Cavascura și Parcul Termal Olympus.",
    rooms: "Camere",
    roomEconomy: "Economy",
    roomEconomyDesc: "Vedere curte interioară, ventilator, gresie, baie privată",
    roomStandard: "Standard",
    roomStandardDesc: "Vedere plajă și laterală la mare, fereastră sau balcon",
    roomClassic: "Classic Sea View",
    roomClassicDesc: "Vedere frontală la mare, balcon privat, cea mai bună panoramă",
    included: "Inclus în sejur",
    breakfast: "Mic dejun dulce zilnic",
    beach: "Serviciu plajă gratuit (umbrele și șezlonguri)",
    beachNote: "exclus iul–aug",
    wifi: "WiFi gratuit",
    parking: "Parcare gratuită în apropiere",
    garden: "Grădină cu jacuzzi și terasă",
    restaurant: "Restaurant tradițional și bar",
    toiletries: "Baie privată cu produse de toaletă și uscător",
    marmalade: "Borcan de marmeladă cadou la plecare",
    reviews: "Recenzii oaspeți",
    bookingScore: "9.1 / 10",
    bookingReviews: "150 recenzii pe Booking.com",
    googleScore: "4.5 / 5",
    googleReviews: "149 recenzii pe Google",
    guestHighlight: "Oaspeții laudă constant ospitalitatea caldă a lui Ernesto, camerele curate cu vedere la mare, micul dejun bogat și proximitatea imbatabilă de plajă.",
    checkTimes: "Check-in & Check-out",
    checkIn: "Check-in: 12:00 – 19:00",
    checkOut: "Check-out: 08:00 – 10:00",
    nearby: "În apropiere",
    nearbyItems: [
      "Plaja Maronti — 1 min pe jos (cea mai mare plajă din Ischia)",
      "Izvoarele naturale Cavascura — 15 min pe plajă",
      "Parcul Termal Olympus — 10 min pe jos",
      "Satul Sant'Angelo — 20 min pe jos sau taxi nautic",
      "Autobuz la Ischia Porto — 15 min de la stația de la 200m",
    ],
    whyThisHotel: "De ce acest hotel",
    whyItems: [
      "Cel mai apropiat hotel de plaja Maronti — fără transfer",
      "Atmosferă familială autentică — Ernesto îl conduce personal",
      "Mic dejun inclus, serviciu plajă gratuit, grădină cu jacuzzi",
      "La distanță de mers de izvoarele naturale Cavascura",
      "Bază accesibilă pentru explorarea coastei de sud a Ischiei",
    ],
  },
};

/* ── Styles ─────────────────────────────────────────────────────────── */
const sectionTitle = css({
  fontSize: "h3",
  fontWeight: "700",
  fontFamily: "display",
  color: "text.primary",
  mb: "5",
});

const card = css({
  bg: "steel.surface",
  border: "1px solid",
  borderColor: "steel.border",
  rounded: "card",
  p: { base: "5", md: "7" },
});

const label = css({
  fontSize: "2xs",
  fontFamily: "display",
  fontWeight: "700",
  letterSpacing: "0.1em",
  textTransform: "uppercase",
  color: "text.faint",
  mb: "2",
});

const bodyText = css({
  fontSize: "body",
  color: "text.secondary",
  lineHeight: "1.7",
});

/* ── Component ─────────────────────────────────────────────────────── */
export function MarontiContent() {
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
          {t.dateRange} &middot; {t.nights} &middot; {t.guests}
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
          {t.hotelName}
        </h1>

        <p
          className={css({
            fontSize: { base: "body", md: "h3" },
            fontFamily: "display",
            color: "text.muted",
            letterSpacing: "0.02em",
            mb: "2",
          })}
        >
          {t.subtitle}
        </p>

        <p
          className={css({
            fontSize: "meta",
            color: "text.secondary",
            fontFamily: "display",
            fontStyle: "italic",
          })}
        >
          {t.tagline}
        </p>
      </div>

      {/* ── Review scores + Book CTA ── */}
      <div
        className={css({
          display: "flex",
          flexWrap: "wrap",
          gap: { base: "4", md: "6" },
          mb: { base: "8", md: "12" },
        })}
      >
        {/* Booking.com score */}
        <div
          className={css({
            bg: "steel.surface",
            border: "1px solid",
            borderColor: "amber.warm",
            rounded: "card",
            p: { base: "5", md: "6" },
            flex: "1",
            minW: "180px",
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
            {t.bookingScore}
          </p>
          <p className={css({ fontSize: "meta", color: "text.faint", fontFamily: "display" })}>
            Booking.com
          </p>
          <div className={css({ h: "1px", bg: "steel.border", my: "3" })} />
          <p className={css({ fontSize: "xs", color: "text.secondary", fontFamily: "display" })}>
            {t.bookingReviews}
          </p>
        </div>

        {/* Google score */}
        <div
          className={css({
            bg: "steel.surface",
            border: "1px solid",
            borderColor: "steel.border",
            rounded: "card",
            p: { base: "5", md: "6" },
            flex: "1",
            minW: "180px",
          })}
        >
          <p
            className={css({
              fontSize: "h1",
              fontWeight: "800",
              fontFamily: "display",
              color: "text.primary",
              lineHeight: "1.1",
              mb: "1",
            })}
          >
            {t.googleScore}
          </p>
          <p className={css({ fontSize: "meta", color: "text.faint", fontFamily: "display" })}>
            Google
          </p>
          <div className={css({ h: "1px", bg: "steel.border", my: "3" })} />
          <p className={css({ fontSize: "xs", color: "text.secondary", fontFamily: "display" })}>
            {t.googleReviews}
          </p>
        </div>

        {/* Book CTA */}
        <a
          href={BOOKING_URL}
          target="_blank"
          rel="noopener noreferrer"
          className={css({
            bg: "amber.warm",
            color: "steel.dark",
            rounded: "card",
            p: { base: "5", md: "6" },
            flex: "1",
            minW: "180px",
            display: "flex",
            flexDir: "column",
            justifyContent: "center",
            alignItems: "center",
            gap: "2",
            fontFamily: "display",
            fontWeight: "700",
            fontSize: "xs",
            letterSpacing: "0.06em",
            textTransform: "uppercase",
            textDecoration: "none",
            transition: "opacity 0.15s",
            _hover: { opacity: 0.9 },
          })}
        >
          <span className={css({ fontSize: "h3" })}>{t.bookOnBooking}</span>
          <span className={css({ fontSize: "meta", fontWeight: "400", textTransform: "none", opacity: 0.8 })}>
            {t.dateRange}
          </span>
        </a>
      </div>

      {/* ── Overview ── */}
      <section className={css({ mb: { base: "8", md: "12" } })}>
        <h2 className={sectionTitle}>{t.overview}</h2>
        <div className={card}>
          <p className={bodyText}>{t.overviewText}</p>
        </div>
      </section>

      {/* ── Room types ── */}
      <section className={css({ mb: { base: "8", md: "12" } })}>
        <h2 className={sectionTitle}>{t.rooms}</h2>
        <div
          className={css({
            display: "grid",
            gridTemplateColumns: { base: "1fr", md: "1fr 1fr 1fr" },
            gap: { base: "4", md: "5" },
          })}
        >
          {[
            { name: t.roomEconomy, desc: t.roomEconomyDesc },
            { name: t.roomStandard, desc: t.roomStandardDesc },
            { name: t.roomClassic, desc: t.roomClassicDesc },
          ].map((room) => (
            <div key={room.name} className={card}>
              <p
                className={css({
                  fontSize: "xs",
                  fontWeight: "700",
                  fontFamily: "display",
                  color: "amber.warm",
                  mb: "3",
                  letterSpacing: "0.04em",
                })}
              >
                {room.name}
              </p>
              <p className={css({ fontSize: "meta", color: "text.secondary", lineHeight: "1.6" })}>
                {room.desc}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Included in stay ── */}
      <section className={css({ mb: { base: "8", md: "12" } })}>
        <h2 className={sectionTitle}>{t.included}</h2>
        <div className={card}>
          <div
            className={css({
              display: "grid",
              gridTemplateColumns: { base: "1fr", md: "1fr 1fr" },
              gap: "4",
            })}
          >
            {[
              t.breakfast,
              `${t.beach} (${t.beachNote})`,
              t.wifi,
              t.parking,
              t.garden,
              t.restaurant,
              t.toiletries,
              t.marmalade,
            ].map((item) => (
              <div key={item} className={css({ display: "flex", alignItems: "baseline", gap: "3" })}>
                <span
                  className={css({
                    color: "amber.warm",
                    fontSize: "meta",
                    fontWeight: "700",
                    flexShrink: 0,
                  })}
                >
                  +
                </span>
                <p className={css({ fontSize: "meta", color: "text.secondary", lineHeight: "1.5" })}>
                  {item}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Reviews highlight ── */}
      <section className={css({ mb: { base: "8", md: "12" } })}>
        <h2 className={sectionTitle}>{t.reviews}</h2>
        <div className={card} style={{ borderColor: "var(--colors-amber-warm)" }}>
          <p className={bodyText}>{t.guestHighlight}</p>
        </div>
      </section>

      {/* ── Check-in / Check-out + Location ── */}
      <div
        className={css({
          display: "grid",
          gridTemplateColumns: { base: "1fr", md: "1fr 1fr" },
          gap: { base: "4", md: "6" },
          mb: { base: "8", md: "12" },
        })}
      >
        <div className={card}>
          <h2
            className={css({
              fontSize: "xs",
              fontWeight: "700",
              fontFamily: "display",
              color: "text.primary",
              mb: "4",
            })}
          >
            {t.checkTimes}
          </h2>
          <div className={css({ display: "flex", flexDir: "column", gap: "2" })}>
            <p className={css({ fontSize: "meta", color: "text.secondary" })}>{t.checkIn}</p>
            <p className={css({ fontSize: "meta", color: "text.secondary" })}>{t.checkOut}</p>
          </div>
        </div>

        <div className={card}>
          <h2
            className={css({
              fontSize: "xs",
              fontWeight: "700",
              fontFamily: "display",
              color: "text.primary",
              mb: "4",
            })}
          >
            {t.location}
          </h2>
          <p className={css({ fontSize: "meta", color: "text.secondary", lineHeight: "1.6" })}>
            {t.locationText}
          </p>
        </div>
      </div>

      {/* ── Nearby ── */}
      <section className={css({ mb: { base: "8", md: "12" } })}>
        <h2 className={sectionTitle}>{t.nearby}</h2>
        <div className={card}>
          <div className={css({ display: "flex", flexDir: "column", gap: "3" })}>
            {t.nearbyItems.map((item) => (
              <div key={item} className={css({ display: "flex", alignItems: "baseline", gap: "3" })}>
                <span
                  className={css({
                    color: "amber.warm",
                    fontSize: "2xs",
                    fontWeight: "700",
                    flexShrink: 0,
                    width: "6px",
                    height: "6px",
                    rounded: "full",
                    bg: "amber.warm",
                    display: "inline-block",
                    position: "relative",
                    top: "-2px",
                  })}
                />
                <p className={css({ fontSize: "meta", color: "text.secondary", lineHeight: "1.5" })}>
                  {item}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Why this hotel ── */}
      <section className={css({ mb: { base: "8", md: "12" } })}>
        <h2 className={sectionTitle}>{t.whyThisHotel}</h2>
        <div className={card}>
          <div className={css({ display: "flex", flexDir: "column", gap: "3" })}>
            {t.whyItems.map((item, i) => (
              <div key={i} className={css({ display: "flex", alignItems: "baseline", gap: "3" })}>
                <span
                  className={css({
                    color: "amber.warm",
                    fontSize: "meta",
                    fontWeight: "700",
                    flexShrink: 0,
                    fontFamily: "display",
                  })}
                >
                  {i + 1}.
                </span>
                <p className={css({ fontSize: "meta", color: "text.secondary", lineHeight: "1.5" })}>
                  {item}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Bottom Book CTA ── */}
      <div className={css({ textAlign: "center", pt: "4" })}>
        <a
          href={BOOKING_URL}
          target="_blank"
          rel="noopener noreferrer"
          className={css({
            display: "inline-block",
            bg: "amber.warm",
            color: "steel.dark",
            rounded: "pill",
            px: "8",
            py: "3",
            fontSize: "xs",
            fontFamily: "display",
            fontWeight: "700",
            letterSpacing: "0.06em",
            textTransform: "uppercase",
            textDecoration: "none",
            transition: "opacity 0.15s",
            _hover: { opacity: 0.9 },
          })}
        >
          {t.bookOnBooking} &rarr;
        </a>
      </div>
    </main>
  );
}
