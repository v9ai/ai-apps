"use client";

import { css } from "styled-system/css";
import { useLang } from "@/components/LanguageSwitcher";

interface Spot {
  name: string;
  tagline: string;
  access: string;
  description: string;
  bestTime: string;
  familyNote: string;
  bring: string;
  note?: string;
}

const T = {
  en: {
    sectionLabel: "Free Hot Springs",
    sectionTitle: "Wild Thermal Bathing",
    sectionSubtitle:
      "No tickets, no loungers \u2014 just volcanic water meeting the sea. Ischia\u2019s free thermal spots are the most authentic way to experience the island\u2019s geothermal energy.",
    accessLabel: "Access",
    bestTimeLabel: "Best Time",
    familyLabel: "Family Note",
    bringLabel: "What to Bring",
    noteLabel: "Note",
    spots: [
      {
        name: "Sorgeto Bay",
        tagline: "The Crown Jewel",
        access:
          "234 stone steps from Panza village or water taxi from Sant\u2019Angelo (\u20ac7, last return 23:00)",
        description:
          "Wild bay where volcanic hot springs bubble up through the seabed and mix with the Tyrrhenian Sea. Temperature varies by position \u2014 move closer to rocks for hotter water (up to 90\u00b0C at the vent). Open 24/7. Sunset and night visits are magical, with steam rising from moonlit water.",
        bestTime: "Sunset or after dark",
        familyNote:
          "Steps manageable for kids 5+; take water taxi with strollers. Keep children away from hottest vents.",
        bring: "Water shoes, towel, headlamp for night visits",
      },
      {
        name: "Fumarole Beach (Maronti)",
        tagline: "Dig Your Own Spa",
        access:
          "Water taxi from Sant\u2019Angelo (\u20ac5) or bus to Maronti + walk east",
        description:
          "Ischia\u2019s longest beach (3 km) with volcanic fumaroles heating the sand from below. Dig 30cm down on the eastern end to hit warm water and create your own thermal pool. Locals bury eggs in the sand to cook them.",
        bestTime: "Morning (cooler air, hot sand contrast)",
        familyNote:
          "Kids love digging thermal pools \u2014 like a science experiment. Keep young children on the western end (cooler sand).",
        bring: "Shade/umbrella, spade for digging, plenty of water",
      },
      {
        name: "Nitrodi Springs",
        tagline: "Apollo\u2019s Fountain",
        access: "Bus to Buonopane (Barano) + 10-min walk",
        description:
          "Ancient springs dedicated to Apollo and the Nymphs. Cool therapeutic water (28\u00b0C) \u2014 the only thermal water on Ischia certified as drinkable. Flows through stone channels into outdoor shower stations among lemon trees. Excellent for skin conditions.",
        bestTime: "Any time \u2014 sheltered garden",
        familyNote:
          "Gentle 28\u00b0C water is perfect for children. Peaceful garden setting.",
        bring: "Bottles to fill (free with entry), swimsuit",
        note: "Technically \u20ac12 entry, but listed here because it\u2019s the closest to a natural spring experience",
      },
      {
        name: "Olmitello Spring",
        tagline: "Hidden Thermal Waterfall",
        access: "Trail from Barano village (30-min hike)",
        description:
          "Natural warm waterfall hidden in a wooded ravine above Maronti beach. The spring feeds a small natural pool surrounded by ferns and Mediterranean maquis. Locals come here to escape crowds \u2014 true hidden gem.",
        bestTime: "Early morning for solitude",
        familyNote:
          "The hike is moderate \u2014 suitable for kids 6+. The ravine can be slippery after rain.",
        bring: "Hiking shoes, towel, water",
      },
    ] as Spot[],
  },
  ro: {
    sectionLabel: "Izvoare Termale Gratuite",
    sectionTitle: "Sc\u0103ldat Termal S\u0103lbatic",
    sectionSubtitle:
      "F\u0103r\u0103 bilete, f\u0103r\u0103 \u0219ezlonguri \u2014 doar ap\u0103 vulcanic\u0103 care se \u00eent\u00e2lne\u0219te cu marea. Locurile termale gratuite din Ischia sunt cel mai autentic mod de a experimenta energia geotermal\u0103 a insulei.",
    accessLabel: "Acces",
    bestTimeLabel: "Cel Mai Bun Moment",
    familyLabel: "Not\u0103 Familial\u0103",
    bringLabel: "Ce S\u0103 Aduci",
    noteLabel: "Not\u0103",
    spots: [
      {
        name: "Sorgeto Bay",
        tagline: "Bijuteria Coroanei",
        access:
          "234 de trepte de piatr\u0103 din satul Panza sau taxi nautic din Sant\u2019Angelo (\u20ac7, ultima curs\u0103 23:00)",
        description:
          "Golf s\u0103lbatic unde izvoare vulcanice fierbin\u021bi clocotesc prin fundul m\u0103rii \u0219i se amestec\u0103 cu Marea Tirenian\u0103. Temperatura variaz\u0103 dup\u0103 pozi\u021bie \u2014 apropia\u021bi-v\u0103 de roci pentru ap\u0103 mai fierbinte (p\u00e2n\u0103 la 90\u00b0C la gur\u0103). Deschis 24/7. Vizitele la apus \u0219i noaptea sunt magice, cu abur ridic\u00e2ndu-se din apa luminat\u0103 de lun\u0103.",
        bestTime: "Apus sau dup\u0103 l\u0103sarea \u00eentunericului",
        familyNote:
          "Treptele sunt gestionabile pentru copii 5+; lua\u021bi taxi nautic cu c\u0103rucioare. \u021aine\u021bi copiii departe de cele mai fierbin\u021bi guri.",
        bring: "Pantofi de ap\u0103, prosop, lantern\u0103 de cap pentru vizite nocturne",
      },
      {
        name: "Fumarole Beach (Maronti)",
        tagline: "Sap\u0103-\u021bi Propriul Spa",
        access:
          "Taxi nautic din Sant\u2019Angelo (\u20ac5) sau autobuz la Maronti + mers spre est",
        description:
          "Cea mai lung\u0103 plaj\u0103 din Ischia (3 km) cu fumarole vulcanice care \u00eenc\u0103lzesc nisipul de dedesubt. S\u0103pa\u021bi 30 cm pe cap\u0103tul estic pentru a atinge apa cald\u0103 \u0219i a crea propria piscin\u0103 termal\u0103. Localnicii \u00eengroap\u0103 ou\u0103 \u00een nisip pentru a le fierbe.",
        bestTime: "Diminea\u021ba (aer mai rece, contrast cu nisipul fierbinte)",
        familyNote:
          "Copiii ador\u0103 s\u0103 sape piscine termale \u2014 ca un experiment \u0219tiin\u021bific. \u021aine\u021bi copiii mici pe cap\u0103tul vestic (nisip mai rece).",
        bring: "Umbrel\u0103, lop\u0103\u021bic\u0103 pentru s\u0103pat, mult\u0103 ap\u0103",
      },
      {
        name: "Nitrodi Springs",
        tagline: "F\u00e2nt\u00e2na lui Apollo",
        access: "Autobuz la Buonopane (Barano) + 10 min pe jos",
        description:
          "Izvoare antice dedicate lui Apollo \u0219i Nimfelor. Ap\u0103 terapeutic\u0103 r\u0103coroas\u0103 (28\u00b0C) \u2014 singura ap\u0103 termal\u0103 din Ischia certificat\u0103 ca potabil\u0103. Curge prin canale de piatr\u0103 \u00een sta\u021bii de du\u0219 \u00een aer liber printre l\u0103m\u00e2i. Excelent\u0103 pentru afec\u021biuni ale pielii.",
        bestTime: "Oric\u00e2nd \u2014 gr\u0103din\u0103 ad\u0103postit\u0103",
        familyNote:
          "Apa bl\u00e2nd\u0103 de 28\u00b0C este perfect\u0103 pentru copii. Cadru pa\u0219nic de gr\u0103din\u0103.",
        bring: "Sticle de umplut (gratuit cu intrarea), costum de baie",
        note: "Tehnic \u20ac12 intrare, dar inclus aici pentru c\u0103 este cea mai apropiat\u0103 experien\u021b\u0103 de izvor natural",
      },
      {
        name: "Olmitello Spring",
        tagline: "Cascada Termal\u0103 Ascuns\u0103",
        access: "Traseu din satul Barano (30 min excursie)",
        description:
          "Cascad\u0103 cald\u0103 natural\u0103 ascuns\u0103 \u00eentr-o r\u00e2p\u0103 \u00eemp\u0103durit\u0103 deasupra plajei Maronti. Izvorul alimenteaz\u0103 o mic\u0103 piscin\u0103 natural\u0103 \u00eenconjurat\u0103 de ferigi \u0219i maquis mediteranean. Localnicii vin aici pentru a sc\u0103pa de mul\u021bimi \u2014 adev\u0103rat\u0103 bijuterie ascuns\u0103.",
        bestTime: "Diminea\u021ba devreme pentru lini\u0219te",
        familyNote:
          "Excursia este moderat\u0103 \u2014 potrivit\u0103 pentru copii 6+. R\u00e2pa poate fi alunecos\u0103 dup\u0103 ploaie.",
        bring: "Pantofi de drume\u021bie, prosop, ap\u0103",
      },
    ] as Spot[],
  },
};

function InfoPill({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div
      className={css({
        bg: "steel.raised",
        border: "1px solid",
        borderColor: "steel.border",
        rounded: "md",
        px: "4",
        py: "3",
      })}
    >
      <p
        className={css({
          fontSize: "2xs",
          fontFamily: "display",
          fontWeight: "700",
          letterSpacing: "0.1em",
          textTransform: "uppercase",
          color: "text.faint",
          mb: "1",
        })}
      >
        {label}
      </p>
      <p
        className={css({
          fontSize: "xs",
          color: "text.secondary",
          lineHeight: "1.5",
        })}
      >
        {value}
      </p>
    </div>
  );
}

export function FreeHotSprings() {
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

      {/* ── Spot cards (vertical stack) ── */}
      <div
        className={css({
          display: "flex",
          flexDir: "column",
          gap: { base: "4", md: "6" },
        })}
      >
        {t.spots.map((spot) => (
          <div
            key={spot.name}
            className={css({
              bg: "steel.surface",
              border: "1px solid",
              borderColor: "steel.border",
              rounded: "card",
              boxShadow: "card",
              p: { base: "6", md: "7" },
              display: "flex",
              flexDir: "column",
              gap: "5",
              transition: "border-color 0.2s, box-shadow 0.2s",
              _hover: {
                borderColor: "steel.borderHover",
                boxShadow: "card.hover",
              },
            })}
          >
            {/* ── Title row ── */}
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
                {spot.name}
              </h3>
              <p
                className={css({
                  fontSize: "meta",
                  fontFamily: "display",
                  color: "amber.warm",
                  letterSpacing: "0.04em",
                  fontStyle: "italic",
                })}
              >
                &ldquo;{spot.tagline}&rdquo;
              </p>
            </div>

            {/* ── Access row ── */}
            <div
              className={css({
                bg: "steel.raised",
                border: "1px solid",
                borderColor: "steel.border",
                rounded: "md",
                px: "4",
                py: "3",
                display: "flex",
                alignItems: "baseline",
                gap: "3",
              })}
            >
              <span
                className={css({
                  fontSize: "2xs",
                  fontFamily: "display",
                  fontWeight: "700",
                  letterSpacing: "0.1em",
                  textTransform: "uppercase",
                  color: "amber.warm",
                  flexShrink: "0",
                })}
              >
                {t.accessLabel}
              </span>
              <span
                className={css({
                  fontSize: "xs",
                  color: "text.secondary",
                  lineHeight: "1.5",
                })}
              >
                {spot.access}
              </span>
            </div>

            {/* ── Description ── */}
            <p
              className={css({
                fontSize: "meta",
                color: "text.secondary",
                lineHeight: "1.6",
              })}
            >
              {spot.description}
            </p>

            {/* ── Note (if present) ── */}
            {spot.note && (
              <div
                className={css({
                  bg: "steel.raised",
                  border: "1px solid",
                  borderColor: "amber.warm",
                  borderLeftWidth: "3px",
                  rounded: "md",
                  px: "4",
                  py: "3",
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
                    mb: "1",
                  })}
                >
                  {t.noteLabel}
                </p>
                <p
                  className={css({
                    fontSize: "xs",
                    color: "text.muted",
                    lineHeight: "1.5",
                    fontStyle: "italic",
                  })}
                >
                  {spot.note}
                </p>
              </div>
            )}

            {/* ── Divider ── */}
            <div
              className={css({
                h: "1px",
                bg: "steel.border",
              })}
            />

            {/* ── Info pills ── */}
            <div
              className={css({
                display: "grid",
                gridTemplateColumns: { base: "1fr", sm: "repeat(3, 1fr)" },
                gap: "3",
              })}
            >
              <InfoPill label={t.bestTimeLabel} value={spot.bestTime} />
              <InfoPill label={t.familyLabel} value={spot.familyNote} />
              <InfoPill label={t.bringLabel} value={spot.bring} />
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
