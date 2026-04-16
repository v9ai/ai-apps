"use client";

import { css } from "styled-system/css";
import Link from "next/link";
import { useLang } from "@/components/LanguageSwitcher";

/* ── Constants ─────────────────────────────────────────────────────── */
const BOOKING_URL =
  "https://www.booking.com/hotel/it/il-soffio-di-tifeo-resort.ro.html?age=7&aid=964694&app_hotel_id=2779167&checkin=2026-05-31&checkout=2026-06-06&from_sn=android&group_adults=2&group_children=1&label=hotel_details-KI8tmc%401776336653&no_rooms=1&req_adults=2&req_age=7&req_children=1&room1=A%2CA%2C7";

const CHECK_IN = "31 Mai";
const CHECK_OUT = "6 Iun";
const NIGHTS = 6;

/* ── Translations ──────────────────────────────────────────────────── */
const T = {
  en: {
    back: "Ischia Guide",
    hotelName: "Il Soffio di Tifeo Resort",
    subtitle: "Forio, Ischia — near Citara Beach",
    tagline: "4-star aparthotel with heated pool, jacuzzi, sauna & Turkish bath",
    stars: "4-Star Aparthotel",
    dateRange: `${CHECK_IN} – ${CHECK_OUT} 2026`,
    nights: `${NIGHTS} nights`,
    guests: "2 adults + 1 child (age 7)",
    bookOnBooking: "View on Booking.com",
    overview: "Overview",
    overviewText:
      "Il Soffio di Tifeo is a boutique 4-star aparthotel with just 10 apartments, run by owners Marta and Angelo — both legendary among guests for their hospitality. The property sits on the hillside above Forio with views toward Mount Epomeo and the sea. Each apartment has a full kitchenette, making it ideal for families who want the freedom of self-catering combined with resort-level wellness facilities. The heated pool, jacuzzi with waterfall, sauna, and Turkish bath make this a private thermal oasis without the thermal hotel price tag.",
    location: "Location",
    locationText:
      "Via II Cimmentorosso 1, Forio. Citara Beach is a 25-minute walk (or short bus from the stop 700m away). Near Sorgeto Hot Spring Bay and La Mortella Garden. Mount Epomeo trailhead 2.4 km away.",
    rooms: "Apartments",
    roomStudio: "Studio Apartment",
    roomStudioDesc: "Compact layout for 2, kitchenette, air conditioning, flat-screen TV, balcony",
    roomStandard: "Standard Apartment",
    roomStandardDesc: "Living area + bedroom, full kitchenette, terrace with garden furniture, sea or mountain view",
    roomDeluxe: "Deluxe Apartment / Loft",
    roomDeluxeDesc: "Spacious layout for 2–4 guests, panoramic views, soundproof, queen bed, full kitchen",
    included: "Included in Stay",
    pool: "Heated seasonal outdoor pool",
    jacuzzi: "Jacuzzi with waterfall",
    sauna: "Sauna & Turkish bath (steam room)",
    solarium: "Solarium with sun loungers & umbrellas",
    fitness: "Fitness centre",
    wifi: "Free WiFi (rated 10/10)",
    parking: "Free private on-site parking",
    kitchen: "Full kitchenette in every apartment",
    terrace: "Private terrace or balcony",
    reviews: "Guest Reviews",
    bookingScore: "9.8 / 10",
    bookingReviews: "140 reviews on Booking.com",
    tripScore: "4.9 / 5",
    tripReviews: "#1 of 4 villas in Forio (TripAdvisor)",
    guestHighlight: "Guests describe 'almost maniacal cleanliness' and highlight owners Marta & Angelo as the heart of the experience. The heated pool, jacuzzi with waterfall, and sauna are consistently called out as highlights. Staff rated 10/10, Cleanliness 10/10, WiFi 10/10.",
    checkTimes: "Check-in & Check-out",
    checkIn: "Check-in: 17:30 – 19:30",
    checkOut: "Check-out: 08:00 – 10:00",
    nearby: "Nearby",
    nearbyItems: [
      "Citara Beach — 25 min walk (or short bus ride)",
      "Sorgeto Hot Spring Bay — natural thermal bathing, free",
      "La Mortella Garden — botanical gardens by William Walton",
      "Mount Epomeo — 2.4 km to trailhead, Ischia's highest peak",
      "Giardini Termali Tropical — 10 min drive",
      "34 restaurants within 1 km",
    ],
    whyThisHotel: "Why This Resort",
    whyItems: [
      "9.8/10 Booking.com — one of the highest-rated properties on Ischia",
      "Self-catering apartments = save on restaurant costs with a family",
      "Private wellness complex: heated pool, jacuzzi, sauna, Turkish bath",
      "Only 10 apartments — boutique feel, personal attention from owners",
      "Near Sorgeto Bay for free natural thermal bathing",
    ],
    wellness: "Wellness Facilities",
    wellnessText:
      "The resort's private wellness area includes a heated outdoor pool (seasonal), a hydromassage jacuzzi with waterfall, a Finnish sauna, and a Turkish bath (steam room). The solarium terrace has panoramic views with sun loungers and umbrellas. A fitness centre is also available. All facilities are included in the stay.",
  },
  ro: {
    back: "Ghid Ischia",
    hotelName: "Il Soffio di Tifeo Resort",
    subtitle: "Forio, Ischia — lângă Plaja Citara",
    tagline: "Aparthotel 4 stele cu piscină încălzită, jacuzzi, saună și baie turcească",
    stars: "Aparthotel 4 Stele",
    dateRange: `${CHECK_IN} – ${CHECK_OUT} 2026`,
    nights: `${NIGHTS} nopți`,
    guests: "2 adulți + 1 copil (7 ani)",
    bookOnBooking: "Vezi pe Booking.com",
    overview: "Prezentare",
    overviewText:
      "Il Soffio di Tifeo este un aparthotel boutique 4 stele cu doar 10 apartamente, condus de proprietarii Marta și Angelo — ambii legendari printre oaspeți pentru ospitalitate. Proprietatea este situată pe dealul de deasupra Forio, cu vedere spre Muntele Epomeo și mare. Fiecare apartament are bucătărie completă, ideal pentru familii care vor libertatea self-catering combinată cu facilități wellness de resort. Piscina încălzită, jacuzzi-ul cu cascadă, sauna și baia turcească fac din aceasta o oază termală privată fără prețul hotelurilor termale.",
    location: "Locație",
    locationText:
      "Via II Cimmentorosso 1, Forio. Plaja Citara la 25 min pe jos (sau autobuz scurt de la stația la 700m). Aproape de Sorgeto Hot Spring Bay și Grădina La Mortella. Traseul Muntele Epomeo la 2,4 km.",
    rooms: "Apartamente",
    roomStudio: "Apartament Studio",
    roomStudioDesc: "Layout compact pentru 2, bucătărie, aer condiționat, TV ecran plat, balcon",
    roomStandard: "Apartament Standard",
    roomStandardDesc: "Living + dormitor, bucătărie completă, terasă cu mobilier de grădină, vedere la mare sau munte",
    roomDeluxe: "Apartament Deluxe / Loft",
    roomDeluxeDesc: "Layout spațios pentru 2–4 oaspeți, vedere panoramică, izolat fonic, pat queen, bucătărie completă",
    included: "Inclus în sejur",
    pool: "Piscină exterioară încălzită (sezonieră)",
    jacuzzi: "Jacuzzi cu cascadă",
    sauna: "Saună și baie turcească (hammam)",
    solarium: "Solarium cu șezlonguri și umbrele",
    fitness: "Centru fitness",
    wifi: "WiFi gratuit (evaluat 10/10)",
    parking: "Parcare privată gratuită",
    kitchen: "Bucătărie completă în fiecare apartament",
    terrace: "Terasă sau balcon privat",
    reviews: "Recenzii oaspeți",
    bookingScore: "9.8 / 10",
    bookingReviews: "140 recenzii pe Booking.com",
    tripScore: "4.9 / 5",
    tripReviews: "#1 din 4 vile în Forio (TripAdvisor)",
    guestHighlight: "Oaspeții descriu o 'curățenie aproape maniacală' și îi evidențiază pe proprietarii Marta și Angelo ca sufletul experienței. Piscina încălzită, jacuzzi-ul cu cascadă și sauna sunt constant menționate. Staff 10/10, Curățenie 10/10, WiFi 10/10.",
    checkTimes: "Check-in & Check-out",
    checkIn: "Check-in: 17:30 – 19:30",
    checkOut: "Check-out: 08:00 – 10:00",
    nearby: "În apropiere",
    nearbyItems: [
      "Plaja Citara — 25 min pe jos (sau autobuz scurt)",
      "Sorgeto Hot Spring Bay — baie termală naturală, gratuită",
      "Grădina La Mortella — grădini botanice de William Walton",
      "Muntele Epomeo — 2,4 km la traseul de start, cel mai înalt vârf",
      "Giardini Termali Tropical — 10 min cu mașina",
      "34 restaurante la sub 1 km",
    ],
    whyThisHotel: "De ce acest resort",
    whyItems: [
      "9.8/10 Booking.com — una dintre cele mai bine cotate proprietăți din Ischia",
      "Apartamente self-catering = economie la restaurante cu familia",
      "Complex wellness privat: piscină încălzită, jacuzzi, saună, baie turcească",
      "Doar 10 apartamente — atmosferă boutique, atenție personală",
      "Aproape de Sorgeto Bay pentru baie termală naturală gratuită",
    ],
    wellness: "Facilități Wellness",
    wellnessText:
      "Zona wellness privată include piscină exterioară încălzită (sezonieră), jacuzzi cu hidromasaj și cascadă, saună finlandeză și baie turcească (hammam). Terasa solarium are vedere panoramică cu șezlonguri și umbrele. Centru fitness disponibil. Toate facilitățile sunt incluse în sejur.",
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

const bodyText = css({
  fontSize: "body",
  color: "text.secondary",
  lineHeight: "1.7",
});

/* ── Component ─────────────────────────────────────────────────────── */
export function TifeoContent() {
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
          {t.stars} &middot; {t.dateRange} &middot; {t.nights} &middot; {t.guests}
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

        {/* TripAdvisor score */}
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
            {t.tripScore}
          </p>
          <p className={css({ fontSize: "meta", color: "text.faint", fontFamily: "display" })}>
            TripAdvisor
          </p>
          <div className={css({ h: "1px", bg: "steel.border", my: "3" })} />
          <p className={css({ fontSize: "xs", color: "text.secondary", fontFamily: "display" })}>
            {t.tripReviews}
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

      {/* ── Wellness Facilities ── */}
      <section className={css({ mb: { base: "8", md: "12" } })}>
        <h2 className={sectionTitle}>{t.wellness}</h2>
        <div className={card} style={{ borderColor: "var(--colors-amber-warm)" }}>
          <p className={bodyText}>{t.wellnessText}</p>
        </div>
      </section>

      {/* ── Apartment types ── */}
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
            { name: t.roomStudio, desc: t.roomStudioDesc },
            { name: t.roomStandard, desc: t.roomStandardDesc },
            { name: t.roomDeluxe, desc: t.roomDeluxeDesc },
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
              t.pool,
              t.jacuzzi,
              t.sauna,
              t.solarium,
              t.fitness,
              t.wifi,
              t.parking,
              t.kitchen,
              t.terrace,
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

      {/* ── Why this resort ── */}
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
