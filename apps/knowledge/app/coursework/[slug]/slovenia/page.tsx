"use client";

import {
  Container,
  Heading,
  Text,
  Box,
  Card,
  Badge,
  Flex,
  Separator,
  Avatar,
  Link as RadixLink,
  Callout,
} from "@radix-ui/themes";
import {
  ArrowLeftIcon,
  CalendarIcon,
  ClockIcon,
  StarIcon,
  InfoCircledIcon,
} from "@radix-ui/react-icons";
import NextLink from "next/link";
import { useParams } from "next/navigation";

const SCHOOL = {
  child: "Bogdan Nicolai",
  className: "Clasa Aventurierilor — clasa I",
  school: "Școala Primară Româno-Finlandeză ERI Brașov",
  parents: ["Vadim Nicolai", "Elena Nicolai"],
};

const EVENT = {
  title: "Ziua Europei",
  country: "Slovenia",
  flag: "🇸🇮",
  date: "Joi, 7 Mai 2026",
  time: "14:00 — 16:00",
  setupTime: "13:30",
  rsvpDeadline: "Mie, 29 Apr. 2026 @ 23:00",
  location: "Școala ERI Brașov",
  price: "GRATUIT",
  group: "Clasa Aventurierilor — clasa I",
  organizer: "Profesori ERI",
};

const TEAM_SLOVENIA = [
  { name: "Bogdan Nicolai", isOurChild: true },
  { name: "Iunia Tuca" },
  { name: "Iustin Tuca" },
  { name: "Elina Pantelimon" },
];

const TODOS = [
  "Luați legătura cu colegii din echipă (Iunia, Iustin, Elina) și organizați o întâlnire (puteți solicita un spațiu în școală, cu anunț prealabil).",
  "Realizați o ștampilă reprezentativă pentru Slovenia.",
  "Pregătiți materialele (afișe, decor, elemente vizuale).",
  "Pregătiți o prezentare de aproximativ 3 minute, susținută pe rând de câte 2 elevi.",
  "Asigurați-vă că informația esențială despre Slovenia nu lipsește din prezentare.",
];

const STAND_IDEAS = [
  "Prezentarea unor informații despre Slovenia",
  "Realizarea unui afiș sau poster",
  "Expunerea de obiecte, produse sau simboluri reprezentative",
  "Degustarea de produse alimentare (achiziționate din comerț, pentru siguranță)",
  "Audiții muzicale",
  "Prezentarea de dansuri tradiționale sau costume",
];

// ── Ghid complet de pregătire ──────────────────────────────────────

const CONCEPT_OPTIONS = [
  { title: "Slovenia — Țara Dragonilor", note: "Dragonul Ljubljanei e simbol ușor de recunoscut, iubit de copii." },
  { title: "Slovenia — Bijuteria Alpilor", note: "Lacul Bled, Triglav, natura." },
  { title: "Slovenia — Țara Albinelor și a Peșterilor", note: "60% păduri, 10.000+ peșteri, Slovenia a inițiat Ziua Mondială a Albinelor." },
];

const ESSENTIAL_FACTS: Array<{ label: string; value: string }> = [
  { label: "Poziție", value: "Europa Centrală — vecini: Italia, Austria, Ungaria, Croația" },
  { label: "Capitala", value: "Ljubljana („Liubliana” — înseamnă „iubită”)" },
  { label: "Limba", value: "Slovena — are formă duală pentru 2 persoane (pe lângă singular și plural)" },
  { label: "Populație", value: "~2 milioane (cât Bucureștiul)" },
  { label: "Moneda", value: "Euro" },
  { label: "În UE din", value: "2004" },
  { label: "Steag", value: "Alb-albastru-roșu + stema cu vârful Triglav" },
  { label: "Cel mai înalt munte", value: "Triglav (2.864 m) — apare pe stemă, pe stema echipei de fotbal, pe bancnote, pe moneda de 50 cenți" },
  { label: "Curiozitate favorită", value: "Peste 10.000 de peșteri; în Divje Babe s-a găsit cel mai vechi flaut din lume — os de urs, ~60.000 de ani" },
];

const STAMP_IDEAS = [
  "Dragonul Ljubljanei — silueta simplificată (cel mai iconic)",
  "Triglav (3 vârfuri) — extrem de ușor de recunoscut și de sculptat",
  "Silueta Lacului Bled (munte + insulă cu biserică) — foarte „de poveste”",
  "Licitarsko srce — inima roșie din turtă dulce, simbol tradițional sloven",
  "O albinuță — face trimitere la Ziua Mondială a Albinelor",
];

const STAMP_HOW_TO = [
  "Comandă online (2–3 zile, Vistaprint / Printare.ro / ștampile personalizate Brașov) — ~30–60 lei, cea mai sigură variantă",
  "Ștampilă din gumă de șters tăiată cu cutter (copiii desenează, părinții taie)",
  "Ștampilă din cartof (variante simple, ex. Triglav sau inima) — artizanal, dar se usucă rapid",
  "Foam autoadeziv lipit pe dop de plută sau cub de lemn — curat și durabil",
];

const POSTER_ITEMS = [
  "Steagul Sloveniei (3 dungi orizontale: alb, albastru, roșu + stema în colțul stânga sus)",
  "Hartă Europa cu Slovenia colorată distinct + săgeată „suntem aici”",
  "Hartă Slovenia cu 4–5 obiective marcate (Ljubljana, Bled, Piran, Postojna, Triglav)",
  "Top 5 curiozități scrise mare, cu imagini",
  "„3 cuvinte slovene”: Zdravo (Bună!), Hvala (Mulțumesc), Nasvidenje (La revedere)",
  "Panou-colaj cu fotografii: Bled, Postojna, dragonul, Triglav, castelul Predjama",
];

const DECOR_ITEMS = [
  "Machetă Lacul Bled (carton + hârtie albastră + bisericuță pe insuliță) — elementul „wow”",
  "Dragon mare din carton decupat și colorat (stil Podul Dragonilor) — decor central",
  "„Peștera miracol” dintr-o cutie de pantofi: stalactite din hârtie, lanternă, un proteu (olm) din plastilină",
  "„Flautul de 60.000 de ani” — tub de carton cu găuri, replica flautului Divje Babe",
  "Inimi „Licitar” din turtă dulce sau carton roșu, ca ghirlandă",
  "Borcan de miere cu etichetă „Slovenski med” (marcă protejată UE)",
  "Mini-steaguri slovene pe bețișoare, de oferit vizitatorilor",
  "Albinuțe de hârtie lipite pe stand",
  "Poze printate cu cai Lipițan (rasa albă slovenă, 425 ani)",
];

const TASTING_ITEMS = [
  "Potica — regina deserturilor slovene; alternativă la îndemână: cozonac cu nucă („verișorul românesc al poticii”)",
  "Miere în borcănele mici cu lingurițe de unică folosință + pâine feliată („kruh”)",
  "Kremšnita / Cremșnit de Bled — prăjitură cu foietaj și cremă de vanilie",
  "Kranjska klobasa — cârnatul sloven (Kaufland/Lidl/Mega Image); alternativ un cârnat uscat similar",
  "Struguri sau stafide — omagiu „celei mai vechi vițe-de-vie din lume” (400+ ani, Maribor)",
  "Biscuiți „inimi” cu glazură roșie — aluzie la Licitarsko srce",
  "Bomboane cu miere ambalate individual",
];

const MUSIC_ITEMS = [
  "„Zdravljica” — imnul Sloveniei (primele 30 de secunde)",
  "Polka slovenă — Slavko Avsenik („Na Golici” e printre cele mai cântate piese instrumentale din lume)",
  "Muzică instrumentală cu acordeon (trăsătură a muzicii tradiționale slovene)",
];

const COSTUMES_ITEMS = [
  "Fete: rochie sau bluză albă + fustă + șorț (pregača) + eșarfă tricoloră + coroniță de flori (garoafa = floarea națională)",
  "Băieți: cămașă albă + pantaloni negri/bleumarin + pălărie alpină cu pană + bretele",
  "Dans scurt de polka (30s) — 4 copii în perechi, pași simpli; YouTube: „Slovenian polka simple steps”",
];

const INTERACTIVE_ITEMS = [
  "Quiz cu 3 întrebări simple după prezentare („Cum se numește dragonul?”, „Câte vârfuri are Triglav?”, „Cum spunem «mulțumesc»?”) — răspuns corect = ștampilă cu floricică",
  "„Colorează dragonul” — schițe A5 imprimate + creioane",
  "„Numără albinele de pe stand” — 10 albinuțe ascunse, premiu = bomboană cu miere",
  "Hartă oarbă: „Pune pinul pe Slovenia”",
  "Salutul în slovenă: vizitatorul spune „Zdravo!” sau „Hvala!” pentru a primi ștampila",
];

const PRESENTATION_PAIRS = [
  {
    pair: "Perechea 1 (ex: Bogdan + Iunia)",
    theme: "Cine e Slovenia?",
    bullets: [
      "Salut în slovenă („Zdravo!”)",
      "Unde se află pe hartă, vecinii, capitala",
      "Steag și stemă (arată Triglavul)",
      "Curiozitate: „Slovenia e mică (cam un sfert din România) dar are munți, mare, peșteri și lacuri.”",
    ],
  },
  {
    pair: "Perechea 2 (ex: Iustin + Elina)",
    theme: "Ce e magic în Slovenia?",
    bullets: [
      "Dragonul din Ljubljana (povestea pe scurt)",
      "Lacul Bled și biserica de pe insulă",
      "Peștera Postojna + flautul de 60.000 de ani + albinele",
      "Invitație la degustare și ștampilă: „Veniți să gustați potica și luați ștampila cu dragonul! Hvala!”",
    ],
  },
];

const SLOVENIAN_WORDS: Array<{ word: string; meaning: string }> = [
  { word: "Zdravo!", meaning: "Bună!" },
  { word: "Hvala", meaning: "Mulțumesc" },
  { word: "Prosim", meaning: "Te rog" },
  { word: "Nasvidenje", meaning: "La revedere" },
  { word: "Zmaj", meaning: "Dragon" },
  { word: "Da / Ne", meaning: "Da / Nu" },
];

const FAMILY_ASSIGNMENTS = [
  { family: "Familie 1", role: "Ștampila + tușieră + tipăriturile interactive" },
  { family: "Familie 2", role: "Afiș principal + harta + cuvintele slovene" },
  { family: "Familie 3", role: "Decorul 3D (macheta Bled sau dragonul din carton)" },
  { family: "Familie 4", role: "Degustarea + fețele de masă + playlist muzical + vesela de unică folosință" },
];

const DAY_Z_CHECKLIST = [
  "Față de masă albă + bandă tricoloră pe margine",
  "Toate materialele în cutii etichetate",
  "Serviciu masă, șervețele, mănuși pentru degustare",
  "Gel dezinfectant",
  "Rolă bandă adezivă + foarfecă + pix de rezervă",
  "Apă pentru copii",
  "Telefon cu muzica gata de pornit",
];

const WOW_ITEMS = [
  "Macheta Lacului Bled — greu de egalat ca impact vizual",
  "„Peștera cu proteu” în cutie de pantofi cu lanternă",
  "Flautul Divje Babe artizanal — cel mai vechi instrument din lume, pe care copiii îl pot atinge",
  "Pașaport sloven propriu — booklet de 5 pagini cu întrebări simple, vizitatorii pleacă cu el",
  "Dans scurt de polka la final — garantat aplauze",
];

function initials(name: string) {
  return name
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

export default function SloveniaEventPage() {
  const params = useParams<{ slug: string }>();
  const slug = params?.slug ?? "bogdan";

  return (
    <Container size="3" py="8" className="cw-container">
      {/* Breadcrumb */}
      <Flex align="center" gap="2" mb="4">
        <RadixLink asChild color="gray" size="2">
          <NextLink href={`/coursework/${slug}`}>
            <Flex align="center" gap="1">
              <ArrowLeftIcon /> {SCHOOL.child}
            </Flex>
          </NextLink>
        </RadixLink>
      </Flex>

      {/* School / child header */}
      <Card mb="5">
        <Flex align="center" gap="3">
          <Avatar size="4" fallback={initials(SCHOOL.child)} radius="full" color="teal" />
          <Box style={{ flex: 1, minWidth: 0 }}>
            <Text size="4" weight="bold" as="div">
              {SCHOOL.child}
            </Text>
            <Text size="2" color="gray" as="div">
              {SCHOOL.className} · {SCHOOL.school}
            </Text>
            <Text size="1" color="gray" as="div" mt="1">
              Părinți: {SCHOOL.parents.join(" & ")}
            </Text>
          </Box>
        </Flex>
      </Card>

      {/* Event title */}
      <Flex align="center" gap="3" mb="2">
        <Text size="9">{EVENT.flag}</Text>
        <Box>
          <Heading size="8" mb="1">
            {EVENT.title} — {EVENT.country}
          </Heading>
          <Flex gap="2" wrap="wrap">
            <Badge size="2" color="teal" variant="soft">
              <CalendarIcon /> {EVENT.date}
            </Badge>
            <Badge size="2" color="teal" variant="soft">
              <ClockIcon /> {EVENT.time}
            </Badge>
            <Badge size="2" color="green" variant="soft">
              {EVENT.price}
            </Badge>
          </Flex>
        </Box>
      </Flex>

      <Text color="gray" size="2" mb="5" as="p">
        Organizator: {EVENT.organizer} · Grupă: {EVENT.group}
      </Text>

      {/* RSVP deadline callout */}
      <Callout.Root color="amber" mb="5">
        <Callout.Icon>
          <InfoCircledIcon />
        </Callout.Icon>
        <Callout.Text>
          <strong>Deadline RSVP:</strong> {EVENT.rsvpDeadline}. Pregătirea standurilor începe la{" "}
          <strong>{EVENT.setupTime}</strong>; prezentările pornesc la <strong>14:00</strong>.
        </Callout.Text>
      </Callout.Root>

      {/* Team Slovenia — highlighted */}
      <Card mb="5" style={{ borderColor: "var(--teal-7)" }}>
        <Flex align="center" gap="2" mb="3">
          <StarIcon color="var(--teal-9)" />
          <Heading size="4">Echipa Slovenia</Heading>
        </Flex>
        <Flex direction="column" gap="2">
          {TEAM_SLOVENIA.map((m) => (
            <Flex key={m.name} align="center" gap="3">
              <Avatar
                size="2"
                fallback={initials(m.name)}
                radius="full"
                color={m.isOurChild ? "teal" : "gray"}
              />
              <Text size="3" weight={m.isOurChild ? "bold" : "regular"}>
                {m.name}
              </Text>
              {m.isOurChild && (
                <Badge size="1" color="teal" variant="solid">
                  copilul nostru
                </Badge>
              )}
            </Flex>
          ))}
        </Flex>
      </Card>

      {/* TODOs for Slovenia team */}
      <Card mb="5">
        <Heading size="4" mb="3">
          De pregătit pentru standul Slovenia
        </Heading>
        <Flex direction="column" gap="2" asChild>
          <ol style={{ paddingLeft: 20, margin: 0 }}>
            {TODOS.map((t, i) => (
              <li key={i}>
                <Text size="2">{t}</Text>
              </li>
            ))}
          </ol>
        </Flex>
        <Separator size="4" my="4" />
        <Text size="2" weight="medium" mb="2" as="div">
          Idei pentru organizarea standului:
        </Text>
        <Flex direction="column" gap="1" asChild>
          <ul style={{ paddingLeft: 20, margin: 0 }}>
            {STAND_IDEAS.map((s) => (
              <li key={s}>
                <Text size="2" color="gray">
                  {s}
                </Text>
              </li>
            ))}
          </ul>
        </Flex>
      </Card>

      {/* Full guide */}
      <Card mb="5" style={{ borderColor: "var(--teal-7)" }}>
        <Flex align="center" gap="2" mb="2">
          <StarIcon color="var(--teal-9)" />
          <Heading size="5">Ghid complet de pregătire</Heading>
        </Flex>
        <Text size="2" color="gray" mb="4" as="p">
          Idei multe, împărțite pe categorii — alegeți direcția care vi se potrivește și delegați ușor între părinți. Gândit pentru clasa I și pentru cei 4 copii din echipă.
        </Text>

        {/* Concept */}
        <Heading size="3" mb="2">
          1. Concept umbrelă pentru stand
        </Heading>
        <Text size="2" mb="2" as="p">
          Un fir roșu face standul memorabil și ajută copiii să povestească coerent. Trei variante potrivite pentru cei mici:
        </Text>
        <Flex direction="column" gap="2" mb="2">
          {CONCEPT_OPTIONS.map((c) => (
            <Box key={c.title}>
              <Text size="2" weight="bold" as="div">
                {c.title}
              </Text>
              <Text size="1" color="gray">
                {c.note}
              </Text>
            </Box>
          ))}
        </Flex>
        <Callout.Root color="teal" mb="4">
          <Callout.Icon>
            <StarIcon />
          </Callout.Icon>
          <Callout.Text>
            <strong>Recomandarea mea:</strong> combinație Dragon + Bled + Albine — cele mai vizuale și ușor de prezentat de un copil de 7 ani.
          </Callout.Text>
        </Callout.Root>

        <Separator size="4" my="4" />

        {/* Essential facts */}
        <Heading size="3" mb="2">
          2. Informații esențiale (obligatoriu în prezentare)
        </Heading>
        <Flex direction="column" gap="2" mb="3">
          {ESSENTIAL_FACTS.map((f) => (
            <Flex key={f.label} gap="2" align="start">
              <Text size="2" weight="bold" style={{ minWidth: 140 }}>
                {f.label}:
              </Text>
              <Text size="2" style={{ flex: 1 }}>
                {f.value}
              </Text>
            </Flex>
          ))}
        </Flex>

        <Separator size="4" my="4" />

        {/* Stamp */}
        <Heading size="3" mb="2">
          3. Ștampila (obligatorie — toți copiii o caută pentru pașaport)
        </Heading>
        <Text size="2" weight="medium" mb="1" as="div">
          Idei vizuale:
        </Text>
        <Flex direction="column" gap="1" mb="3" asChild>
          <ol style={{ paddingLeft: 20, margin: 0 }}>
            {STAMP_IDEAS.map((s) => (
              <li key={s}>
                <Text size="2">{s}</Text>
              </li>
            ))}
          </ol>
        </Flex>
        <Text size="2" weight="medium" mb="1" as="div">
          Cum o realizați practic (de la simplu la artizanal):
        </Text>
        <Flex direction="column" gap="1" mb="2" asChild>
          <ul style={{ paddingLeft: 20, margin: 0 }}>
            {STAMP_HOW_TO.map((s) => (
              <li key={s}>
                <Text size="2" color="gray">
                  {s}
                </Text>
              </li>
            ))}
          </ul>
        </Flex>
        <Text size="2" color="gray" as="p">
          Luați o tușieră albastră sau roșie (culorile steagului).
        </Text>

        <Separator size="4" my="4" />

        {/* Poster */}
        <Heading size="3" mb="2">
          4. Afiș / poster principal
        </Heading>
        <Text size="2" mb="2" as="p">
          Un poster mare (A2 sau mai mare) cu:
        </Text>
        <Flex direction="column" gap="1" asChild>
          <ul style={{ paddingLeft: 20, margin: 0 }}>
            {POSTER_ITEMS.map((s) => (
              <li key={s}>
                <Text size="2">{s}</Text>
              </li>
            ))}
          </ul>
        </Flex>

        <Separator size="4" my="4" />

        {/* Decor */}
        <Heading size="3" mb="2">
          5. Decor și exponate 3D
        </Heading>
        <Flex direction="column" gap="1" asChild>
          <ul style={{ paddingLeft: 20, margin: 0 }}>
            {DECOR_ITEMS.map((s) => (
              <li key={s}>
                <Text size="2">{s}</Text>
              </li>
            ))}
          </ul>
        </Flex>

        <Separator size="4" my="4" />

        {/* Tasting */}
        <Heading size="3" mb="2">
          6. Degustare (din comerț, pentru siguranță)
        </Heading>
        <Flex direction="column" gap="1" asChild>
          <ul style={{ paddingLeft: 20, margin: 0 }}>
            {TASTING_ITEMS.map((s) => (
              <li key={s}>
                <Text size="2">{s}</Text>
              </li>
            ))}
          </ul>
        </Flex>

        <Separator size="4" my="4" />

        {/* Music */}
        <Heading size="3" mb="2">
          7. Audiție muzicală (fundal discret)
        </Heading>
        <Flex direction="column" gap="1" mb="2" asChild>
          <ul style={{ paddingLeft: 20, margin: 0 }}>
            {MUSIC_ITEMS.map((s) => (
              <li key={s}>
                <Text size="2">{s}</Text>
              </li>
            ))}
          </ul>
        </Flex>
        <Text size="2" color="gray" as="p">
          Un mic boxerel bluetooth pe volum mic, cu playlist pregătit pe telefon.
        </Text>

        <Separator size="4" my="4" />

        {/* Costumes */}
        <Heading size="3" mb="2">
          8. Costume și dans
        </Heading>
        <Flex direction="column" gap="1" asChild>
          <ul style={{ paddingLeft: 20, margin: 0 }}>
            {COSTUMES_ITEMS.map((s) => (
              <li key={s}>
                <Text size="2">{s}</Text>
              </li>
            ))}
          </ul>
        </Flex>

        <Separator size="4" my="4" />

        {/* Interactive activities */}
        <Heading size="3" mb="2">
          9. Activități interactive la stand
        </Heading>
        <Flex direction="column" gap="1" asChild>
          <ul style={{ paddingLeft: 20, margin: 0 }}>
            {INTERACTIVE_ITEMS.map((s) => (
              <li key={s}>
                <Text size="2">{s}</Text>
              </li>
            ))}
          </ul>
        </Flex>

        <Separator size="4" my="4" />

        {/* Presentation script */}
        <Heading size="3" mb="2">
          10. Structura prezentării de 3 minute (2 copii pe rând)
        </Heading>
        <Text size="2" color="gray" mb="3" as="p">
          Fiecare pereche ~90 secunde. Scrieți textul mare pe cartonașe A5 — copiii pot citi, nu trebuie memorat perfect.
        </Text>
        <Flex direction="column" gap="3">
          {PRESENTATION_PAIRS.map((p) => (
            <Box key={p.pair} style={{ background: "var(--gray-2)", padding: 12, borderRadius: 8 }}>
              <Text size="2" weight="bold" as="div">
                {p.pair} — {p.theme}
              </Text>
              <Flex direction="column" gap="1" mt="2" asChild>
                <ul style={{ paddingLeft: 20, margin: 0 }}>
                  {p.bullets.map((b) => (
                    <li key={b}>
                      <Text size="2">{b}</Text>
                    </li>
                  ))}
                </ul>
              </Flex>
            </Box>
          ))}
        </Flex>

        <Separator size="4" my="4" />

        {/* Slovenian words */}
        <Heading size="3" mb="2">
          11. Cuvinte slovene de expus pe stand
        </Heading>
        <Flex gap="2" wrap="wrap">
          {SLOVENIAN_WORDS.map((w) => (
            <Box
              key={w.word}
              style={{
                background: "var(--teal-2)",
                padding: "8px 12px",
                borderRadius: 8,
                minWidth: 140,
              }}
            >
              <Text size="2" weight="bold" as="div">
                {w.word}
              </Text>
              <Text size="1" color="gray">
                {w.meaning}
              </Text>
            </Box>
          ))}
        </Flex>

        <Separator size="4" my="4" />

        {/* Family logistics */}
        <Heading size="3" mb="2">
          12. Logistică & împărțirea sarcinilor
        </Heading>
        <Text size="2" weight="medium" mb="2" as="div">
          Propunere de împărțire (ajustați după preferințe):
        </Text>
        <Flex direction="column" gap="2" mb="3">
          {FAMILY_ASSIGNMENTS.map((f) => (
            <Flex key={f.family} gap="2" align="start">
              <Badge size="1" color="teal" variant="soft" style={{ minWidth: 80 }}>
                {f.family}
              </Badge>
              <Text size="2">{f.role}</Text>
            </Flex>
          ))}
        </Flex>
        <Flex direction="column" gap="1" mb="3" asChild>
          <ul style={{ paddingLeft: 20, margin: 0 }}>
            <li>
              <Text size="2">
                <strong>Întâlnire pregătitoare:</strong> ideal un weekend (25–26 aprilie sau 2–3 mai). Online pentru coordonare, live doar pentru repetiția prezentării.
              </Text>
            </li>
            <li>
              <Text size="2">
                <strong>Repetiție prezentare:</strong> minim 2 — una cu o săptămână înainte și una cu 1–2 zile înainte.
              </Text>
            </li>
            <li>
              <Text size="2">
                <strong>Buget estimativ total:</strong> 200–400 lei per familie (carton, vopsele, gustări, ștampila, printuri).
              </Text>
            </li>
          </ul>
        </Flex>
        <Text size="2" weight="medium" mb="2" as="div">
          Checklist ziua Z (7 mai, 13:30):
        </Text>
        <Flex direction="column" gap="1" asChild>
          <ul style={{ paddingLeft: 20, margin: 0 }}>
            {DAY_Z_CHECKLIST.map((s) => (
              <li key={s}>
                <Text size="2" color="gray">
                  {s}
                </Text>
              </li>
            ))}
          </ul>
        </Flex>

        <Separator size="4" my="4" />

        {/* WOW differentiators */}
        <Heading size="3" mb="2">
          13. Elemente „WOW” de diferențiere
        </Heading>
        <Flex direction="column" gap="1" asChild>
          <ul style={{ paddingLeft: 20, margin: 0 }}>
            {WOW_ITEMS.map((s) => (
              <li key={s}>
                <Text size="2">{s}</Text>
              </li>
            ))}
          </ul>
        </Flex>
      </Card>

      {/* Full description */}
      <Card mb="5">
        <Heading size="4" mb="3">
          Descriere eveniment
        </Heading>
        <Text size="2" as="p" mb="2">
          Dragi părinți, avem plăcerea să vă invităm la un eveniment special dedicat Zilei Europei,
          care va avea loc pe <strong>7 mai 2026, ora 14:00</strong>. Activitatea celebrează
          diversitatea și frumusețea Uniunii Europene, oferindu-le copiilor ocazia de a explora,
          învăța și experimenta lucruri noi.
        </Text>
        <Text size="2" as="p" mb="2">
          Pregătirea standurilor, alături de părinți, începe la <strong>13:30</strong>, pentru o
          desfășurare eficientă. Elevii și părinții vor lucra în echipe pentru a prezenta țara
          europeană repartizată — în cazul nostru, <strong>Slovenia</strong>. Părinții au rol de
          ghidaj și sprijin; prezentarea standului trebuie realizată exclusiv de către copii.
        </Text>
        <Text size="2" as="p" mb="2">
          Anul acesta echipele includ colegi din alte clase. În ziua evenimentului, fiecare elev
          primește un <em>„Pașaport pentru Europa”</em> și un <em>„Jurnal de călătorie”</em>,
          vizitează standurile și colectează ștampile (după participarea la prezentare). Este
          necesară vizitarea a minimum <strong>8 țări</strong>.
        </Text>
        <Text size="2" as="p" color="gray">
          Important: nu lăsați pregătirea pe ultimul moment.
        </Text>
      </Card>

      {/* Source comment */}
      <Card>
        <Flex align="center" gap="2" mb="2">
          <Avatar size="1" fallback="LO" radius="full" color="gray" />
          <Box>
            <Text size="2" weight="medium" as="div">
              Luiza Oprea
            </Text>
            <Text size="1" color="gray">
              22 apr. 2026, 14:48
            </Text>
          </Box>
        </Flex>
        <Text size="1" color="gray">
          Sursa repartizării echipelor pe țări (mesaj din portalul școlii).
        </Text>
      </Card>
    </Container>
  );
}
