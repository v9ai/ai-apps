"use client";

import {
  Badge,
  Box,
  Callout,
  Card,
  Flex,
  Heading,
  Spinner,
  Text,
} from "@radix-ui/themes";
import { Info, Leaf, Moon, ShieldAlert, Sparkles } from "lucide-react";
import {
  useAllergiesQuery,
  useBloodTestsQuery,
} from "../__generated__/hooks";

const BOGDAN_SLUG = "bogdan";

type Tone = "green" | "blue" | "amber" | "red" | "gray";

type Allergen = {
  id: string;
  kind: "allergy" | "intolerance";
  name: string;
  severity: string | null;
  notes: string | null;
};

type AllergenFlags = {
  hasGluten: boolean;
  hasLatex: boolean;
  hasMold: boolean;
  hasProfilins: boolean;
  hasLtp: boolean;
  hasDairy: boolean;
  hasSoy: boolean;
};

type Suggestion = {
  name: string;
  category: string;
  tone: Tone;
  dose: string;
  notes: React.ReactNode;
  warnings: (flags: AllergenFlags) => string[];
};

const TIER_1: Suggestion[] = [
  {
    name: "Magneziu glicinat (bisglicinat)",
    category: "mineral chelat cu glicină",
    tone: "green",
    dose: "100–200 mg Mg elemental, seara",
    notes: (
      <>
        Forma cea mai bine tolerată gastric. Ajută somnul și reduce
        iritabilitatea. Dacă apare scaun moale, reduceți doza.
      </>
    ),
    warnings: (f) => {
      const w: string[] = [];
      if (f.hasGluten)
        w.push("Alegeți produs etichetat „fără gluten” — unele excipienți pot conține amidon de grâu.");
      if (f.hasLatex)
        w.push("Verificați dopul/sigiliul flaconului — preferați PE/HDPE, nu cauciuc natural.");
      return w;
    },
  },
  {
    name: "Glicină",
    category: "aminoacid",
    tone: "green",
    dose: "1–3 g cu 30 min înainte de culcare",
    notes: (
      <>
        Gust dulce, ușor de administrat la copii (pulbere dizolvată în apă).
        Studiată pentru calitatea somnului. Profil alergenic foarte scăzut.
      </>
    ),
    warnings: (f) => {
      const w: string[] = [];
      if (f.hasGluten)
        w.push("Pulberea pură nu conține gluten — evitați produsele combinate cu „aromă de fructe” care pot avea glucoză din grâu.");
      return w;
    },
  },
  {
    name: "Melatonină",
    category: "hormon sintetic",
    tone: "amber",
    dose: "0,5–1 mg cu 30–60 min înainte de culcare",
    notes: (
      <>
        <Text as="span" weight="bold">
          Doar pe termen scurt și doar cu acordul medicului.
        </Text>{" "}
        În acest moment poate masca semnalul de somn al perioadei de wash-out
        Singulair (întrerupt 2026-04-27). Discutați expres cu Dr. Mariana sau
        Dr. Mihăila înainte de a începe.
      </>
    ),
    warnings: (f) => {
      const w: string[] = [];
      if (f.hasGluten)
        w.push("Multe formule mestecabile pediatrice conțin maltodextrină de grâu — alegeți marcaj „gluten-free”.");
      if (f.hasLatex)
        w.push("Picăturile sublinguale au adesea pipetă de cauciuc — preferați tablete sau pulbere.");
      return w;
    },
  },
  {
    name: "L-teanină (Suntheanine®)",
    category: "aminoacid izolat",
    tone: "amber",
    dose: "100–200 mg",
    notes: (
      <>
        Forma Suntheanine® este obținută prin fermentație bacteriană (nu prin
        extracție din ceai), însă pentru un copil cu sensibilizare la mucegai
        (Alternaria) se recomandă <Text as="span" weight="bold">precauție extra</Text>:
        confirmați cu medicul dacă fermentația controlată cu Pseudomonas este
        acceptabilă în profilul lui. Evitați orice produs etichetat „extract
        de ceai verde”.
      </>
    ),
    warnings: (f) => {
      const w: string[] = [];
      if (f.hasMold)
        w.push("Sensibilizare la Alternaria detectată — produs fermentat. Discutați explicit cu alergologul înainte.");
      if (f.hasProfilins || f.hasLtp)
        w.push("Profiline / LTP pozitive — verificați că NU este extras din ceai (Camellia sinensis).");
      if (f.hasGluten)
        w.push("Verificați excipienții capsulei — preferați HPMC, fără făină de orez/grâu.");
      return w;
    },
  },
];

const TIER_2: Suggestion[] = [
  {
    name: "Vitamina B6 (P-5-P)",
    category: "piridoxal-5-fosfat, formă activă",
    tone: "gray",
    dose: "5–10 mg/zi (doză pediatrică mică)",
    notes: (
      <>
        Cofactor în sinteza GABA și serotoninei. Nu depășiți doza — B6 în
        exces cronic poate cauza neuropatie. Doar pe perioadă limitată.
      </>
    ),
    warnings: (f) => (f.hasGluten ? ["Alegeți marcaj „gluten-free”."] : []),
  },
  {
    name: "Zinc bisglicinat",
    category: "mineral chelat",
    tone: "gray",
    dose: "5–10 mg/zi, cu masa",
    notes: (
      <>
        Util mai ales dacă există deficit documentat. Asociat cu echilibrul
        comportamental la copii. Administrare scurtă (4–6 săptămâni), apoi
        pauză.
      </>
    ),
    warnings: (f) => {
      const w: string[] = [];
      if (f.hasGluten) w.push("Alegeți marcaj „gluten-free”.");
      if (f.hasLatex) w.push("Verificați sigiliul flaconului — fără cauciuc natural.");
      return w;
    },
  },
  {
    name: "Taurină",
    category: "aminoacid",
    tone: "gray",
    dose: "250–500 mg",
    notes: <>Efect ușor calmant, modulează GABA. Profil alergenic foarte scăzut.</>,
    warnings: (f) => (f.hasGluten ? ["Alegeți marcaj „gluten-free”."] : []),
  },
];

const NON_PHARMA: { label: string; detail: string }[] = [
  {
    label: "Pătură cu greutate",
    detail:
      "Țesătură hipoalergenică (microfibră sau bumbac certificat OEKO-TEX). ~10% din greutatea corpului — pentru Bogdan ≈ 2 kg. De evitat umpluturile cu coji vegetale.",
  },
  {
    label: "Zgomot alb sau roz",
    detail:
      "Aplicație simplă sau aparat dedicat. Stabilizează somnul și reduce reacțiile la zgomotele bruște.",
  },
  {
    label: "Respirație 4-7-8 sau „box breathing”",
    detail:
      "Inspir 4 sec, ținut 7 sec, expir 8 sec. Sau 4-4-4-4. Făcut împreună, ca un joc, înainte de culcare.",
  },
  {
    label: "Rutină fixă de seară",
    detail:
      "Aceeași ordine în fiecare seară (baie → pijama → carte → lumină stinsă). Reduce anxietatea de tranziție.",
  },
  {
    label: "Fără ecrane cu 60 min înainte de culcare",
    detail:
      "Reduce stimularea și protejează producția endogenă de melatonină.",
  },
  {
    label: "Baie călduță cu sare Epsom",
    detail:
      "Sulfat de magneziu — mineral, fără origine vegetală. ~1 cană la o cadă, 15–20 min, cu 1 h înainte de culcare. Evitați produsele cu uleiuri esențiale adăugate.",
  },
];

function severityTone(severity: string | null): Tone {
  switch ((severity ?? "").toLowerCase()) {
    case "severe":
      return "red";
    case "moderate":
      return "amber";
    case "mild":
      return "blue";
    default:
      return "gray";
  }
}

function severityLabel(severity: string | null): string {
  switch ((severity ?? "").toLowerCase()) {
    case "severe":
      return "severă";
    case "moderate":
      return "moderată";
    case "mild":
      return "ușoară";
    default:
      return "neclasificată";
  }
}

function computeFlags(allergens: Allergen[]): AllergenFlags {
  const hay = allergens
    .map((a) => `${a.name} ${a.notes ?? ""}`.toLowerCase())
    .join(" | ");
  return {
    hasGluten: /glut|gliad|grâu|wheat/.test(hay),
    hasLatex: /latex/.test(hay),
    hasMold: /mucegai|alternaria|cladospor|aspergil|mold/.test(hay),
    hasProfilins: /profilin/.test(hay),
    hasLtp: /\bltp\b/.test(hay),
    hasDairy: /lactoz|lactat|lapte|cazein|whey/.test(hay),
    hasSoy: /soia|soy|glycine max/.test(hay),
  };
}

export function CalmingSuggestionsPanel() {
  const allergiesQ = useAllergiesQuery();
  const bloodTestsQ = useBloodTestsQuery();

  const allergens: Allergen[] = (allergiesQ.data?.allergies ?? [])
    .filter((a) => a.familyMember?.slug === BOGDAN_SLUG)
    .map((a) => ({
      id: a.id,
      kind: a.kind === "intolerance" ? "intolerance" : "allergy",
      name: a.name,
      severity: a.severity ?? null,
      notes: a.notes ?? null,
    }));

  const bogdanId =
    allergiesQ.data?.allergies.find((a) => a.familyMember?.slug === BOGDAN_SLUG)
      ?.familyMember?.id ?? null;

  const bloodTests = (bloodTestsQ.data?.bloodTests ?? []).filter(
    (b) => bogdanId != null && b.familyMemberId === bogdanId,
  );
  const bloodTestsWithMarkers = bloodTests.filter((b) => b.markersCount > 0);
  const mostRecentTest = [...bloodTests].sort((a, b) =>
    (b.testDate ?? "").localeCompare(a.testDate ?? ""),
  )[0];

  const sortedAllergens = [...allergens].sort((a, b) => {
    const order: Record<string, number> = {
      severe: 0,
      moderate: 1,
      mild: 2,
    };
    return (
      (order[(a.severity ?? "").toLowerCase()] ?? 3) -
      (order[(b.severity ?? "").toLowerCase()] ?? 3)
    );
  });

  const flags = computeFlags(allergens);
  const loading = allergiesQ.loading || bloodTestsQ.loading;

  return (
    <Flex direction="column" gap="5">
      <Callout.Root color="amber" variant="surface">
        <Callout.Icon>
          <Info size={18} />
        </Callout.Icon>
        <Callout.Text>
          <Text weight="bold">Context wash-out Singulair — </Text>
          Singulair a fost întrerupt pe 2026-04-27 la recomandarea Dr. Mariana
          (alergolog) pentru a evalua dacă simptomele comportamentale de tip
          ADHD sunt iatrogene. Fereastra minimă de observație: 2–4 săptămâni
          (≈ 11.05 – 25.05.2026). Nu introduceți nimic nou care ar putea
          masca acest semnal fără acordul medicului curant.
        </Callout.Text>
      </Callout.Root>

      <SectionHeader
        icon={<ShieldAlert size={18} color="var(--red-11)" />}
        title="Profilul alergic al lui Bogdan"
        subtitle={
          loading
            ? "Se încarcă din baza de date…"
            : `${allergens.length} sensibilizări înregistrate · sursă: skin prick test 16.02.2026, Dr. Mihăila Rodica (CMU Brașov).`
        }
      />
      {loading ? (
        <Flex justify="center" py="4">
          <Spinner size="2" />
        </Flex>
      ) : sortedAllergens.length === 0 ? (
        <Card>
          <Flex p="3">
            <Text size="2" color="gray">
              Nu există sensibilizări înregistrate în baza de date pentru
              Bogdan. Adăugați rezultatele testului prick pentru recomandări
              personalizate.
            </Text>
          </Flex>
        </Card>
      ) : (
        <Card>
          <Flex direction="column" gap="2" p="3">
            <Flex wrap="wrap" gap="2">
              {sortedAllergens.map((a) => (
                <Badge
                  key={a.id}
                  color={severityTone(a.severity)}
                  variant="soft"
                  size="2"
                >
                  {a.name} · {severityLabel(a.severity)}
                  {a.kind === "intolerance" ? " (intoleranță)" : ""}
                </Badge>
              ))}
            </Flex>
            <Box pt="2">
              <Text size="1" color="gray">
                Categoriile cu impact direct asupra alegerii suplimentelor:{" "}
                {[
                  flags.hasGluten && "gluten / cereale",
                  flags.hasLatex && "latex",
                  flags.hasMold && "mucegai (Alternaria)",
                  (flags.hasProfilins || flags.hasLtp) &&
                    "profiline / LTP (cross-react cu fructe-legume crude)",
                ]
                  .filter(Boolean)
                  .join(" · ") || "—"}
              </Text>
            </Box>
          </Flex>
        </Card>
      )}

      <SectionHeader
        icon={<Leaf size={18} color="var(--green-11)" />}
        title="Sugestii calmante — fără plante, fără alergeni comuni"
        subtitle="Pentru un copil de 7 ani cu rinită alergică polisensibilizat. Toate opțiunile sunt minerale, aminoacizi sau actiivi sintetici — fără extracte vegetale, fără polenuri, fără plante medicinale."
      />

      <SectionHeader
        icon={<Sparkles size={18} color="var(--green-11)" />}
        title="Nivel 1 — opțiuni cu dovezi pediatrice rezonabile"
        subtitle="De discutat cu medicul curant înainte de prima administrare."
      />
      <SuggestionList suggestions={TIER_1} flags={flags} />

      <SectionHeader
        icon={<Sparkles size={18} color="var(--gray-11)" />}
        title="Nivel 2 — suport adjuvant"
        subtitle="Doze mici, perioadă limitată. Numai dacă Nivel 1 nu este suficient."
      />
      <SuggestionList suggestions={TIER_2} flags={flags} />

      <SectionHeader
        icon={<Moon size={18} color="var(--indigo-11)" />}
        title="Non-medicamentos — primul lucru de încercat"
        subtitle="Eficient, fără riscuri farmacologice, compatibil cu wash-out-ul în curs."
      />
      <Card>
        <Flex direction="column" gap="3" p="3">
          {NON_PHARMA.map((item) => (
            <Flex key={item.label} direction="column" gap="1">
              <Text size="2" weight="medium">
                {item.label}
              </Text>
              <Text size="2" color="gray">
                {item.detail}
              </Text>
            </Flex>
          ))}
        </Flex>
      </Card>

      <SectionHeader
        icon={<Info size={18} color="var(--gray-11)" />}
        title="Teste de sânge importate"
        subtitle="Context biologic util pentru discuția cu medicul."
      />
      <Card>
        <Flex direction="column" gap="2" p="3">
          {loading ? (
            <Spinner size="2" />
          ) : bloodTests.length === 0 ? (
            <Text size="2" color="gray">
              Niciun test importat pentru Bogdan.
            </Text>
          ) : (
            <>
              <Flex align="center" gap="2" wrap="wrap">
                <Badge color="gray" variant="soft">
                  {bloodTests.length} fișiere
                </Badge>
                {mostRecentTest?.testDate && (
                  <Text size="1" color="gray">
                    Cel mai recent: {mostRecentTest.testDate.slice(0, 10)} (
                    {mostRecentTest.fileName})
                  </Text>
                )}
              </Flex>
              {bloodTestsWithMarkers.length === 0 && (
                <Text size="2" color="amber">
                  Markerii nu sunt încă extrași din PDF-uri — discutați cu
                  medicul pe baza fișierelor originale. Înainte de a începe
                  orice supliment, verificați feritina, vitamina D, magneziul
                  seric, zincul și un panel hepatic recent.
                </Text>
              )}
            </>
          )}
        </Flex>
      </Card>

      <Callout.Root color="red" variant="surface">
        <Callout.Icon>
          <ShieldAlert size={18} />
        </Callout.Icon>
        <Callout.Text>
          <Text weight="bold">Verificare obligatorie a excipienților. </Text>
          Pentru un copil cu rinită alergică polisensibilizat, citiți eticheta
          completă înainte de fiecare produs: evitați extractele vegetale,
          polenurile, plantele medicinale, aromele „naturale” derivate din
          plante și coloranții alimentari controversați (E102, E110, E124,
          E129). Preferați capsule HPMC în locul celor de gelatină dacă există
          sensibilități. Niciuna dintre aceste sugestii nu înlocuiește avizul
          medical — discutați cu Dr. Mariana (alergolog) sau Dr. Mihăila
          Rodica (CMU Brașov) înainte de a începe orice supliment.
        </Callout.Text>
      </Callout.Root>

      <Box>
        <Text size="1" color="gray">
          Surse de fundal: ghiduri AAP privind utilizarea pediatrică a
          melatoninei pentru tulburări de somn; review-uri Cochrane pe
          magneziu și somn; FDA boxed warning pentru montelukast (martie
          2020). Acest panou este un punct de plecare pentru discuția cu
          medicul, nu un protocol de tratament. Datele despre alergii și
          teste sunt încărcate din baza ta de date și se actualizează automat
          când adaugi rezultate noi.
        </Text>
      </Box>
    </Flex>
  );
}

function SectionHeader({
  icon,
  title,
  subtitle,
}: {
  icon: React.ReactNode;
  title: string;
  subtitle: string;
}) {
  return (
    <Flex direction="column" gap="1">
      <Flex align="center" gap="2">
        {icon}
        <Heading size="4">{title}</Heading>
      </Flex>
      <Text size="2" color="gray">
        {subtitle}
      </Text>
    </Flex>
  );
}

function SuggestionList({
  suggestions,
  flags,
}: {
  suggestions: Suggestion[];
  flags: AllergenFlags;
}) {
  return (
    <Flex direction="column" gap="3">
      {suggestions.map((s) => {
        const warnings = s.warnings(flags);
        return (
          <Card key={s.name}>
            <Flex direction="column" gap="2" p="3">
              <Flex align="center" gap="2" wrap="wrap">
                <Text size="2" weight="medium">
                  {s.name}
                </Text>
                <Badge color={s.tone} variant="soft">
                  {s.category}
                </Badge>
              </Flex>
              <Text size="1" color="gray">
                Doză orientativă: {s.dose}
              </Text>
              <Text size="2">{s.notes}</Text>
              {warnings.length > 0 && (
                <Box mt="1">
                  <Flex direction="column" gap="1">
                    {warnings.map((w, i) => (
                      <Flex key={i} align="start" gap="2">
                        <ShieldAlert
                          size={14}
                          color="var(--red-11)"
                          style={{ flexShrink: 0, marginTop: 2 }}
                        />
                        <Text size="1" color="red">
                          {w}
                        </Text>
                      </Flex>
                    ))}
                  </Flex>
                </Box>
              )}
            </Flex>
          </Card>
        );
      })}
    </Flex>
  );
}
