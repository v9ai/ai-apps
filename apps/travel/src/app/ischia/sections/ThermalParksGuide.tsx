"use client";

import { css } from "styled-system/css";
import { useLang } from "@/components/LanguageSwitcher";

interface Park {
  name: string;
  location: string;
  pools: string;
  tempRange: string;
  price: string;
  childPrice: string;
  description: string;
  familyFriendly?: boolean;
  recommended?: boolean;
}

const T = {
  en: {
    sectionLabel: "Thermal Parks",
    sectionTitle: "The Six Great Terme",
    sectionSubtitle:
      "Ischia's thermal parks range from 22-pool mega-complexes to ancient Roman rock grottos. Entry prices are for 2026 season.",
    recommended: "RECOMMENDED",
    pools: "Pools",
    temp: "Temp",
    adult: "adult",
    child: "child",
    familyFriendly: "Family-friendly",
    parks: [
      {
        name: "Giardini Poseidon Terme",
        location: "Forio",
        pools: "22",
        tempRange: "15\u201340\u00b0C",
        price: "\u20ac35\u201338",
        childPrice: "\u20ac20\u201322",
        description:
          "Europe\u2019s largest thermal park. 22 pools from cold plunge to 40\u00b0C, private beach on Citara Bay, sauna caves carved into tuff rock, Kneipp path, thermal waterfall.",
        familyFriendly: true,
        recommended: true,
      },
      {
        name: "Negombo Thermal Gardens",
        location: "Lacco Ameno",
        pools: "12",
        tempRange: "28\u201338\u00b0C",
        price: "\u20ac38",
        childPrice: "\u20ac22",
        description:
          "Boutique thermal park with Japanese zen garden, sculpture installations, and a private beach cove in the Bay of San Montano. More curated and upscale than Poseidon.",
        familyFriendly: true,
      },
      {
        name: "Parco Termale Castiglione",
        location: "Casamicciola",
        pools: "10",
        tempRange: "",
        price: "\u20ac30",
        childPrice: "\u20ac18",
        description:
          "Terraced hillside park with panoramic infinity pools overlooking Ischia Porto. Views of Capri and Vesuvius. Quieter, more local feel.",
        familyFriendly: true,
      },
      {
        name: "Tropical Terme",
        location: "Sant\u2019Angelo",
        pools: "6",
        tempRange: "38\u201342\u00b0C",
        price: "\u20ac25",
        childPrice: "\u20ac15",
        description:
          "Intimate park with pools directly heated by volcanic fumaroles. Each pool has distinct mineral character \u2014 sulfurous to iron-rich.",
      },
      {
        name: "Cavascura",
        location: "Barano / Maronti",
        pools: "",
        tempRange: "",
        price: "\u20ac15 entry",
        childPrice: "\u20ac30 full treatment",
        description:
          "Ancient Roman thermal grotto \u2014 2,000 years old. Natural hot water cascades through carved stone channels into rock pools. Volcanic-mud wraps in cave alcoves.",
      },
      {
        name: "Fonte delle Ninfe Nitrodi",
        location: "Barano",
        pools: "",
        tempRange: "28\u00b0C",
        price: "\u20ac12",
        childPrice: "\u20ac8",
        description:
          "Open-air springs dedicated to Apollo by the Romans. Only drinkable thermal water on Ischia (28\u00b0C). Stone channels, lemon trees, bougainvillea.",
      },
    ] as Park[],
  },
  ro: {
    sectionLabel: "Parcuri Termale",
    sectionTitle: "Cele \u0218ase Mari Terme",
    sectionSubtitle:
      "Parcurile termale din Ischia variaz\u0103 de la mega-complexe cu 22 de piscine la grote romane antice. Pre\u021burile de intrare sunt pentru sezonul 2026.",
    recommended: "RECOMANDAT",
    pools: "Piscine",
    temp: "Temp",
    adult: "adult",
    child: "copil",
    familyFriendly: "Prietenos cu familiile",
    parks: [
      {
        name: "Giardini Poseidon Terme",
        location: "Forio",
        pools: "22",
        tempRange: "15\u201340\u00b0C",
        price: "\u20ac35\u201338",
        childPrice: "\u20ac20\u201322",
        description:
          "Cel mai mare parc termal din Europa. 22 de piscine de la plonjare rece la 40\u00b0C, plaj\u0103 privat\u0103 pe golful Citara, saune s\u0103pate \u00een roc de tuf, traseu Kneipp, cascad\u0103 termal\u0103.",
        familyFriendly: true,
        recommended: true,
      },
      {
        name: "Negombo Thermal Gardens",
        location: "Lacco Ameno",
        pools: "12",
        tempRange: "28\u201338\u00b0C",
        price: "\u20ac38",
        childPrice: "\u20ac22",
        description:
          "Parc termal boutique cu gr\u0103din\u0103 zen japonez\u0103, instala\u021bii de sculptur\u0103 \u0219i golf privat cu plaj\u0103 \u00een Golful San Montano. Mai rafinat \u0219i exclusivist dec\u00e2t Poseidon.",
        familyFriendly: true,
      },
      {
        name: "Parco Termale Castiglione",
        location: "Casamicciola",
        pools: "10",
        tempRange: "",
        price: "\u20ac30",
        childPrice: "\u20ac18",
        description:
          "Parc pe deal \u00een terase cu piscine infinity panoramice cu vedere la Ischia Porto. Vedere la Capri \u0219i Vezuviu. Mai lini\u0219tit, atmosfer\u0103 mai local\u0103.",
        familyFriendly: true,
      },
      {
        name: "Tropical Terme",
        location: "Sant\u2019Angelo",
        pools: "6",
        tempRange: "38\u201342\u00b0C",
        price: "\u20ac25",
        childPrice: "\u20ac15",
        description:
          "Parc intim cu piscine \u00eenc\u0103lzite direct de fumarole vulcanice. Fiecare piscin\u0103 are un caracter mineral distinct \u2014 de la sulfuroase la bogate \u00een fier.",
      },
      {
        name: "Cavascura",
        location: "Barano / Maronti",
        pools: "",
        tempRange: "",
        price: "\u20ac15 intrare",
        childPrice: "\u20ac30 tratament complet",
        description:
          "Grot\u0103 termal\u0103 roman\u0103 antic\u0103 \u2014 2.000 de ani. Ap\u0103 cald\u0103 natural\u0103 cade prin canale de piatr\u0103 sculptate \u00een bazine de roc\u0103. \u00cempachet\u0103ri cu n\u0103mol vulcanic \u00een alcove de pe\u0219ter\u0103.",
      },
      {
        name: "Fonte delle Ninfe Nitrodi",
        location: "Barano",
        pools: "",
        tempRange: "28\u00b0C",
        price: "\u20ac12",
        childPrice: "\u20ac8",
        description:
          "Izvoare \u00een aer liber dedicate lui Apollo de romani. Singura ap\u0103 termal\u0103 potabil\u0103 din Ischia (28\u00b0C). Canale de piatr\u0103, l\u0103m\u00e2i, bougainvillea.",
      },
    ] as Park[],
  },
};

export function ThermalParksGuide() {
  const { lang } = useLang();
  const t = T[lang];

  return (
    <section
      className={css({
        maxW: "none",
        mx: "auto",
        mb: { base: "14", md: "20" },
        animation: "fadeUp 0.6s ease-out",
      })}
    >
      {/* ── Section header ── */}
      <div className={css({ mb: { base: "10", md: "14" } })}>
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
            maxW: "800px",
          })}
        >
          {t.sectionSubtitle}
        </p>
      </div>

      {/* ── Park cards grid ── */}
      <div
        className={css({
          display: "grid",
          gridTemplateColumns: { base: "1fr", md: "repeat(2, 1fr)", xl: "repeat(3, 1fr)" },
          gap: { base: "4", md: "6" },
        })}
      >
        {t.parks.map((park) => (
          <div
            key={park.name}
            className={css({
              bg: "steel.surface",
              border: "1px solid",
              borderColor: park.recommended ? "amber.warm" : "steel.border",
              rounded: "card",
              boxShadow: park.recommended ? "card.hover" : "card",
              p: { base: "6", md: "7" },
              display: "flex",
              flexDir: "column",
              gap: "4",
              position: "relative",
              transition: "border-color 0.2s, box-shadow 0.2s",
              _hover: {
                borderColor: park.recommended
                  ? "amber.bright"
                  : "steel.borderHover",
                boxShadow: "card.hover",
              },
            })}
          >
            {/* Recommended badge */}
            {park.recommended && (
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

            {/* Park name + location */}
            <div>
              <h3
                className={css({
                  fontSize: "h3",
                  fontWeight: "700",
                  fontFamily: "display",
                  color: "text.primary",
                  lineHeight: "1.2",
                  mb: "1.5",
                })}
              >
                {park.name}
              </h3>
              <p
                className={css({
                  fontSize: "meta",
                  fontFamily: "display",
                  color: "text.muted",
                  letterSpacing: "0.04em",
                })}
              >
                {park.location}
                {park.familyFriendly && (
                  <span
                    className={css({
                      ml: "2",
                      color: "text.faint",
                    })}
                  >
                    &middot; {t.familyFriendly}
                  </span>
                )}
              </p>
            </div>

            {/* Description */}
            <p
              className={css({
                fontSize: "meta",
                color: "text.secondary",
                lineHeight: "1.55",
              })}
            >
              {park.description}
            </p>

            {/* Info row: pools + temp */}
            {(park.pools || park.tempRange) && (
              <div
                className={css({
                  display: "flex",
                  alignItems: "center",
                  gap: "4",
                  flexWrap: "wrap",
                })}
              >
                {park.pools && (
                  <span
                    className={css({
                      fontSize: "2xs",
                      fontFamily: "display",
                      fontWeight: "600",
                      letterSpacing: "0.06em",
                      color: "text.faint",
                      textTransform: "uppercase",
                    })}
                  >
                    {t.pools}: {park.pools}
                  </span>
                )}
                {park.tempRange && (
                  <span
                    className={css({
                      fontSize: "2xs",
                      fontFamily: "display",
                      fontWeight: "600",
                      letterSpacing: "0.06em",
                      color: "text.faint",
                      textTransform: "uppercase",
                    })}
                  >
                    {t.temp}: {park.tempRange}
                  </span>
                )}
              </div>
            )}

            {/* Divider */}
            <div
              className={css({
                h: "1px",
                bg: park.recommended ? "amber.warm" : "steel.border",
                opacity: park.recommended ? 0.4 : 1,
              })}
            />

            {/* Price */}
            <div
              className={css({
                display: "flex",
                alignItems: "baseline",
                gap: "3",
                flexWrap: "wrap",
              })}
            >
              <span
                className={css({
                  fontSize: "h3",
                  fontWeight: "700",
                  fontFamily: "display",
                  color: "amber.warm",
                  lineHeight: "1.1",
                })}
              >
                {park.price}
              </span>
              <span
                className={css({
                  fontSize: "meta",
                  fontFamily: "display",
                  color: "text.faint",
                  letterSpacing: "0.04em",
                })}
              >
                {t.adult}
              </span>
              <span
                className={css({
                  fontSize: "xs",
                  fontFamily: "display",
                  color: "text.muted",
                  fontWeight: "600",
                })}
              >
                {park.childPrice}
              </span>
              <span
                className={css({
                  fontSize: "meta",
                  fontFamily: "display",
                  color: "text.faint",
                  letterSpacing: "0.04em",
                })}
              >
                {t.child}
              </span>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
