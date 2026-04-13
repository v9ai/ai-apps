"use client";

import { css } from "styled-system/css";
import { useLang } from "@/components/LanguageSwitcher";
import { NIGHTS, DATE_RANGE_LABEL, RECOMMENDED_TIER } from "../constants";

const T = {
  en: {
    sectionLabel: "Where to Sleep",
    sectionTitle: "Accommodation in Naples",
    sectionSubtitle:
      `Naples, ${NIGHTS} nights (${DATE_RANGE_LABEL.en}). Three tiers for 2 adults + 1 child. Prices are family totals per night including breakfast.`,
    recommended: "RECOMMENDED",
    hotelsLabel: "Properties in this tier",
    tiers: [
      {
        tier: "Budget",
        price: "€60–90 / night",
        total: `${NIGHTS} nights ≈ €${NIGHTS * 75}`,
        type: "B&Bs, guesthouses, 2-star hotels in the centro storico",
        neighbourhoods: "Spaccanapoli, Quartieri Spagnoli",
        expect:
          "Clean double or triple room, breakfast included, air conditioning, Wi-Fi. Noise at night from the streets below — earplugs recommended.",
        goodFor: "Families prioritising location and walkability over amenities",
        hotels: [
          { name: "B&B Palazzo Ferrante",     area: "Spaccanapoli",      price: "~€65 / night", note: "Restored palazzo, family room, rooftop terrace" },
          { name: "Casa Tolentino",           area: "Quartieri Spagnoli", price: "~€75 / night", note: "2★, triple room, central, breakfast included" },
          { name: "Hotel Piazza Bellini",     area: "Centro Storico",     price: "~€85 / night", note: "3★, boutique feel, quiet piazza location" },
        ],
      },
      {
        tier: "Mid-Range",
        price: "€90–140 / night",
        total: `${NIGHTS} nights ≈ €${NIGHTS * 115}`,
        type: "3–4 star hotels with family rooms",
        neighbourhoods: "Chiaia, Lungomare, Centro Storico",
        expect:
          "4-star family room or connecting rooms, breakfast buffet, concierge, some with sea views. Child discount 30–50 % at most properties.",
        goodFor:
          "Families wanting a comfortable base with good transport links and reliable service",
        hotels: [
          { name: "Hotel Palazzo Decumani",   area: "Spaccanapoli",  price: "~€95 / night",  note: "4★, family suite, rooftop breakfast, quiet street" },
          { name: "Hotel Rex",                area: "Lungomare",     price: "~€110 / night", note: "3★, sea-view rooms, 5 min walk to Castel dell'Ovo" },
          { name: "Grand Hotel Parker's",     area: "Corso Vittorio", price: "~€130 / night", note: "4★, historic property, panoramic terrace, family rooms" },
        ],
      },
      {
        tier: "Comfort",
        price: "€140–220 / night",
        total: `${NIGHTS} nights ≈ €${NIGHTS * 180}`,
        type: "4-star boutique and luxury hotels",
        neighbourhoods: "Chiaia, Posillipo, Lungomare",
        expect:
          "Premium rooms with bay views, full breakfast, concierge, babysitting available. Quieter neighbourhoods.",
        goodFor:
          "Families wanting sea views, calm evenings, and easy access to the ferry terminal for day trips",
        hotels: [
          { name: "Hotel Excelsior",          area: "Lungomare",  price: "~€150 / night", note: "4★, rooftop pool, Vesuvius views, family suites" },
          { name: "Grand Hotel Vesuvio",      area: "Lungomare",  price: "~€190 / night", note: "5★, legendary property, bay-view suites, kids welcome" },
          { name: "Hotel San Francesco al Monte", area: "Vomero", price: "~€160 / night", note: "4★, converted monastery, infinity pool, panoramic" },
        ],
      },
    ],
    neighbourhoodsLabel: "Naples Area Guide",
    neighbourhoods: [
      {
        name: "Spaccanapoli / Centro Storico",
        desc: "The beating heart of Naples. UNESCO-listed streets, the best pizza, MANN museum, Napoli Sotterranea. Noisy at night but unbeatable for walkability and atmosphere.",
      },
      {
        name: "Chiaia / Lungomare",
        desc: "Elegant seafront district with bay views, Castel dell'Ovo, and the Villa Comunale park. Quieter, more upscale — best for families wanting a calmer base.",
      },
      {
        name: "Vomero",
        desc: "Hilltop residential area reached by funicular. Certosa di San Martino, panoramic views, quieter streets. A refuge from centro chaos but slightly isolated.",
      },
      {
        name: "Quartieri Spagnoli",
        desc: "Grid of narrow alleys west of Via Toledo. Authentic, gritty, full of life — budget accommodation and street food. Safe for families by day, louder at night.",
      },
    ],
    tierLabels: {
      type: "Property type",
      neighbourhoods: "Best areas",
      expect: "What to expect",
      goodFor: "Good for",
    },
  },
  ro: {
    sectionLabel: "Unde Dormi",
    sectionTitle: "Cazare în Napoli",
    sectionSubtitle:
      `Napoli, ${NIGHTS} nopți (${DATE_RANGE_LABEL.ro}). Trei niveluri pentru 2 adulți + 1 copil. Prețurile sunt totalul familiei pe noapte inclusiv micul dejun.`,
    recommended: "RECOMANDAT",
    hotelsLabel: "Proprietăți în acest nivel",
    tiers: [
      {
        tier: "Buget",
        price: "€60–90 / noapte",
        total: `${NIGHTS} nopți ≈ €${NIGHTS * 75}`,
        type: "B&B-uri, pensiuni, hoteluri de 2 stele în centrul istoric",
        neighbourhoods: "Spaccanapoli, Quartieri Spagnoli",
        expect:
          "Cameră dublă sau triplă curată, mic dejun inclus, aer condiționat, Wi-Fi. Zgomot noaptea de pe străzile de jos — dopuri de urechi recomandate.",
        goodFor: "Familii care prioritizează locația și accesul pietonal față de facilități",
        hotels: [
          { name: "B&B Palazzo Ferrante",     area: "Spaccanapoli",      price: "~€65 / noapte", note: "Palat restaurat, cameră de familie, terasă pe acoperiș" },
          { name: "Casa Tolentino",           area: "Quartieri Spagnoli", price: "~€75 / noapte", note: "2★, cameră triplă, central, mic dejun inclus" },
          { name: "Hotel Piazza Bellini",     area: "Centro Storico",     price: "~€85 / noapte", note: "3★, atmosferă boutique, locație pe piață liniștită" },
        ],
      },
      {
        tier: "Mediu",
        price: "€90–140 / noapte",
        total: `${NIGHTS} nopți ≈ €${NIGHTS * 115}`,
        type: "Hoteluri de 3–4 stele cu camere de familie",
        neighbourhoods: "Chiaia, Lungomare, Centro Storico",
        expect:
          "Cameră de familie sau camere comunicante 4 stele, bufet mic dejun, concierge, unele cu vedere la mare. Reducere copii 30–50% la cele mai multe proprietăți.",
        goodFor:
          "Familii care vor o bază confortabilă cu legături bune de transport și servicii fiabile",
        hotels: [
          { name: "Hotel Palazzo Decumani",   area: "Spaccanapoli",  price: "~€95 / noapte",  note: "4★, suită de familie, mic dejun pe acoperiș, stradă liniștită" },
          { name: "Hotel Rex",                area: "Lungomare",     price: "~€110 / noapte", note: "3★, camere cu vedere la mare, 5 min pe jos de Castel dell'Ovo" },
          { name: "Grand Hotel Parker's",     area: "Corso Vittorio", price: "~€130 / noapte", note: "4★, proprietate istorică, terasă panoramică, camere de familie" },
        ],
      },
      {
        tier: "Confort",
        price: "€140–220 / noapte",
        total: `${NIGHTS} nopți ≈ €${NIGHTS * 180}`,
        type: "Hoteluri boutique și de lux de 4 stele",
        neighbourhoods: "Chiaia, Posillipo, Lungomare",
        expect:
          "Camere premium cu vedere la golf, mic dejun complet, concierge, babysitting disponibil. Cartiere mai liniștite.",
        goodFor:
          "Familii care vor vedere la mare, seri calme și acces ușor la terminalul de feribot pentru excursii de o zi",
        hotels: [
          { name: "Hotel Excelsior",          area: "Lungomare",  price: "~€150 / noapte", note: "4★, piscină pe acoperiș, vedere Vezuviu, suite de familie" },
          { name: "Grand Hotel Vesuvio",      area: "Lungomare",  price: "~€190 / noapte", note: "5★, proprietate legendară, suite cu vedere la golf, copii bineveniți" },
          { name: "Hotel San Francesco al Monte", area: "Vomero", price: "~€160 / noapte", note: "4★, mănăstire convertită, piscină infinity, panoramic" },
        ],
      },
    ],
    neighbourhoodsLabel: "Ghid Zone Napoli",
    neighbourhoods: [
      {
        name: "Spaccanapoli / Centro Storico",
        desc: "Inima pulsantă a Napoliului. Străzi UNESCO, cea mai bună pizza, muzeul MANN, Napoli Sotterranea. Zgomotos noaptea dar imbatabil pentru acces pietonal și atmosferă.",
      },
      {
        name: "Chiaia / Lungomare",
        desc: "District elegant pe malul mării cu vedere la golf, Castel dell'Ovo și parcul Villa Comunale. Mai liniștit, mai exclusivist — cel mai bun pentru familii care vor o bază mai calmă.",
      },
      {
        name: "Vomero",
        desc: "Zonă rezidențială pe deal accesibilă cu funicularul. Certosa di San Martino, vederi panoramice, străzi mai liniștite. Refugiu din haosul centrului dar ușor izolat.",
      },
      {
        name: "Quartieri Spagnoli",
        desc: "Grilă de alei înguste la vest de Via Toledo. Autentic, aspru, plin de viață — cazare buget și mâncare de stradă. Sigur pentru familii ziua, mai zgomotos noaptea.",
      },
    ],
    tierLabels: {
      type: "Tip proprietate",
      neighbourhoods: "Cele mai bune zone",
      expect: "La ce sa te aștepți",
      goodFor: "Potrivit pentru",
    },
  },
};

export function SleepGuide() {
  const { lang } = useLang();
  const t = T[lang];

  return (
    <section
      className={css({
        bg: "steel.dark",
        py: { base: "14", md: "20" },
        px: { base: "5", md: "8" },
      })}
    >
      {/* ── Section header ── */}
      <div
        className={css({
          maxW: "960px",
          mx: "auto",
          mb: { base: "10", md: "14" },
        })}
      >
        <p
          className={css({
            fontSize: "label",
            fontFamily: "display",
            letterSpacing: "0.12em",
            textTransform: "uppercase",
            color: "amber.warm",
            mb: "3",
          })}
        >
          {t.sectionLabel}
        </p>
        <h2
          className={css({
            fontSize: "h2",
            fontWeight: "800",
            fontFamily: "display",
            lineHeight: "h2",
            letterSpacing: "h2",
            color: "text.primary",
            mb: "4",
          })}
        >
          {t.sectionTitle}
        </h2>
        <p
          className={css({
            fontSize: "body",
            color: "text.secondary",
            lineHeight: "body",
            maxW: "600px",
          })}
        >
          {t.sectionSubtitle}
        </p>
      </div>

      {/* ── Tier cards ── */}
      <div
        className={css({
          maxW: "960px",
          mx: "auto",
          display: "grid",
          gridTemplateColumns: {
            base: "1fr",
            md: "repeat(3, 1fr)",
          },
          gap: { base: "4", md: "6" },
          mb: { base: "12", md: "16" },
        })}
      >
        {t.tiers.map((tier, i) => {
          const isRecommended = i === RECOMMENDED_TIER;
          return (
            <div
              key={tier.tier}
              className={css({
                bg: "steel.surface",
                border: "1px solid",
                borderColor: isRecommended ? "amber.warm" : "steel.border",
                rounded: "card",
                boxShadow: isRecommended ? "card.hover" : "card",
                p: { base: "6", md: "7" },
                display: "flex",
                flexDir: "column",
                gap: "5",
                position: "relative",
                transition: "border-color 0.2s, box-shadow 0.2s",
                _hover: {
                  borderColor: isRecommended ? "amber.bright" : "steel.borderHover",
                  boxShadow: "card.hover",
                },
              })}
            >
              {/* Recommended badge */}
              {isRecommended && (
                <div
                  className={css({
                    position: "absolute",
                    top: "-1px",
                    right: "20px",
                    bg: "amber.warm",
                    color: "steel.dark",
                    fontSize: "2xs",
                    fontFamily: "display",
                    fontWeight: "700",
                    letterSpacing: "0.1em",
                    textTransform: "uppercase",
                    px: "3",
                    py: "1",
                    rounded: "pill",
                  })}
                >
                  {t.recommended}
                </div>
              )}

              {/* Tier header */}
              <div>
                <p
                  className={css({
                    fontSize: "xs",
                    fontFamily: "display",
                    letterSpacing: "0.1em",
                    textTransform: "uppercase",
                    color: isRecommended ? "amber.warm" : "text.muted",
                    mb: "2",
                  })}
                >
                  {tier.tier}
                </p>
                <p
                  className={css({
                    fontSize: "h3",
                    fontWeight: "700",
                    fontFamily: "display",
                    color: "text.primary",
                    lineHeight: "1.1",
                    mb: "1",
                  })}
                >
                  {tier.price}
                </p>
                <p
                  className={css({
                    fontSize: "meta",
                    color: isRecommended ? "amber.bright" : "text.faint",
                    fontFamily: "display",
                    letterSpacing: "0.04em",
                  })}
                >
                  {tier.total}
                </p>
              </div>

              {/* Divider */}
              <div
                className={css({
                  h: "1px",
                  bg: isRecommended ? "amber.warm" : "steel.border",
                  opacity: isRecommended ? 0.4 : 1,
                })}
              />

              {/* Details */}
              <dl
                className={css({
                  display: "flex",
                  flexDir: "column",
                  gap: "4",
                })}
              >
                <TierRow label={t.tierLabels.type}          value={tier.type}          isRecommended={isRecommended} />
                <TierRow label={t.tierLabels.neighbourhoods} value={tier.neighbourhoods} isRecommended={isRecommended} />
                <TierRow label={t.tierLabels.expect}        value={tier.expect}        isRecommended={isRecommended} />
                <TierRow label={t.tierLabels.goodFor}       value={tier.goodFor}       isRecommended={isRecommended} />
              </dl>

              {/* Hotel list divider */}
              <div
                className={css({
                  h: "1px",
                  bg: isRecommended ? "amber.warm" : "steel.border",
                  opacity: isRecommended ? 0.3 : 0.6,
                })}
              />

              {/* Named hotels */}
              <div>
                <p
                  className={css({
                    fontSize: "2xs",
                    fontFamily: "display",
                    fontWeight: "700",
                    letterSpacing: "0.1em",
                    textTransform: "uppercase",
                    color: "text.faint",
                    mb: "3",
                  })}
                >
                  {t.hotelsLabel}
                </p>
                <div
                  className={css({
                    display: "flex",
                    flexDir: "column",
                    gap: "3",
                  })}
                >
                  {tier.hotels.map((hotel) => (
                    <div
                      key={hotel.name}
                      className={css({
                        bg: "steel.raised",
                        border: "1px solid",
                        borderColor: isRecommended ? "rgba(201,146,42,0.15)" : "steel.border",
                        rounded: "md",
                        px: "3",
                        py: "2.5",
                      })}
                    >
                      <div
                        className={css({
                          display: "flex",
                          alignItems: "baseline",
                          justifyContent: "space-between",
                          gap: "2",
                          mb: "0.5",
                        })}
                      >
                        <p
                          className={css({
                            fontSize: "xs",
                            fontWeight: "700",
                            fontFamily: "display",
                            color: isRecommended ? "text.primary" : "text.secondary",
                            lineHeight: "1.3",
                          })}
                        >
                          {hotel.name}
                        </p>
                        <span
                          className={css({
                            flexShrink: "0",
                            fontSize: "2xs",
                            fontWeight: "700",
                            fontFamily: "display",
                            color: isRecommended ? "amber.warm" : "text.muted",
                            whiteSpace: "nowrap",
                          })}
                        >
                          {hotel.price}
                        </span>
                      </div>
                      <p
                        className={css({
                          fontSize: "2xs",
                          color: "text.faint",
                          fontFamily: "display",
                          letterSpacing: "0.02em",
                        })}
                      >
                        {hotel.area} · {hotel.note}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* ── Area guide ── */}
      <div className={css({ maxW: "960px", mx: "auto" })}>
        <p
          className={css({
            fontSize: "label",
            fontFamily: "display",
            letterSpacing: "0.12em",
            textTransform: "uppercase",
            color: "text.muted",
            mb: "6",
          })}
        >
          {t.neighbourhoodsLabel}
        </p>

        <div
          className={css({
            display: "grid",
            gridTemplateColumns: { base: "1fr", sm: "repeat(2, 1fr)" },
            gap: { base: "3", md: "4" },
          })}
        >
          {t.neighbourhoods.map((n) => (
            <div
              key={n.name}
              className={css({
                bg: "steel.raised",
                border: "1px solid",
                borderColor: "steel.border",
                rounded: "card",
                px: "5",
                py: "4",
                transition: "border-color 0.2s",
                _hover: { borderColor: "steel.borderHover" },
              })}
            >
              <p
                className={css({
                  fontSize: "label",
                  fontWeight: "600",
                  fontFamily: "display",
                  color: "text.primary",
                  mb: "1",
                })}
              >
                {n.name}
              </p>
              <p
                className={css({
                  fontSize: "meta",
                  color: "text.secondary",
                  lineHeight: "1.55",
                })}
              >
                {n.desc}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ── Internal sub-component ──────────────────────────────────────────────────

function TierRow({
  label,
  value,
  isRecommended,
}: {
  label: string;
  value: string;
  isRecommended: boolean;
}) {
  return (
    <div>
      <dt
        className={css({
          fontSize: "xs",
          fontFamily: "display",
          letterSpacing: "0.08em",
          textTransform: "uppercase",
          color: "text.faint",
          mb: "1",
        })}
      >
        {label}
      </dt>
      <dd
        className={css({
          fontSize: "meta",
          color: isRecommended ? "text.primary" : "text.secondary",
          lineHeight: "1.5",
          margin: 0,
        })}
      >
        {value}
      </dd>
    </div>
  );
}
