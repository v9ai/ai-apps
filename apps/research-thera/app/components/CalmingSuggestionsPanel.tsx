"use client";

import {
  Badge,
  Box,
  Callout,
  Card,
  Flex,
  Heading,
  Text,
} from "@radix-ui/themes";
import { Info, Leaf, Moon, ShieldAlert, Sparkles } from "lucide-react";

type Tone = "green" | "blue" | "amber" | "red" | "gray";

type Suggestion = {
  name: string;
  category: string;
  tone: Tone;
  dose: string;
  notes: React.ReactNode;
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
        iritabilitatea. Dacă apare scaun moale, reduceți doza. Verificați
        excipientul capsulei (preferabil HPMC, nu gelatină + coloranți). Fără
        derivate vegetale.
      </>
    ),
  },
  {
    name: "Glicină",
    category: "aminoacid",
    tone: "green",
    dose: "1–3 g cu 30 min înainte de culcare",
    notes: (
      <>
        Gust dulce, ușor de administrat la copii (pulbere dizolvată în apă).
        Studiată pentru calitatea somnului. Sigură, cu profil alergenic foarte
        scăzut.
      </>
    ),
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
  },
  {
    name: "L-teanină (Suntheanine®)",
    category: "aminoacid izolat",
    tone: "blue",
    dose: "100–200 mg",
    notes: (
      <>
        Forma Suntheanine® este obținută prin fermentație, nu prin extracție
        din ceai — verificați eticheta să confirme acest lucru. Calmare fără
        somnolență. Evitați produsele etichetate „extract de ceai verde”.
      </>
    ),
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
        Cofactor în sinteza GABA și serotoninei. Nu depășiți doza — B6 în exces
        cronic poate cauza neuropatie. Doar pe perioadă limitată.
      </>
    ),
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
  },
  {
    name: "Taurină",
    category: "aminoacid",
    tone: "gray",
    dose: "250–500 mg",
    notes: (
      <>
        Efect ușor calmant, modulează GABA. Profil alergenic foarte scăzut.
      </>
    ),
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
      "Sulfat de magneziu — mineral, fără origine vegetală. ~1 cană la o cadă, 15–20 min, cu 1 h înainte de culcare.",
  },
];

export function CalmingSuggestionsPanel() {
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
          (≈ 11.05 – 25.05.2026). Nu introduceți nimic nou care ar putea masca
          acest semnal fără acordul medicului curant.
        </Callout.Text>
      </Callout.Root>

      <SectionHeader
        icon={<Leaf size={18} color="var(--green-11)" />}
        title="Sugestii calmante — fără plante, fără alergeni comuni"
        subtitle="Pentru un copil de 7 ani cu rinită alergică. Toate opțiunile sunt minerale, aminoacizi sau actiivi sintetici — fără extracte vegetale, fără polenuri, fără plante medicinale."
      />

      <SectionHeader
        icon={<Sparkles size={18} color="var(--green-11)" />}
        title="Nivel 1 — opțiuni cu dovezi pediatrice rezonabile"
        subtitle="De discutat cu medicul curant înainte de prima administrare."
      />
      <SuggestionList suggestions={TIER_1} />

      <SectionHeader
        icon={<Sparkles size={18} color="var(--gray-11)" />}
        title="Nivel 2 — suport adjuvant"
        subtitle="Doze mici, perioadă limitată. Numai dacă Nivel 1 nu este suficient."
      />
      <SuggestionList suggestions={TIER_2} />

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

      <Callout.Root color="red" variant="surface">
        <Callout.Icon>
          <ShieldAlert size={18} />
        </Callout.Icon>
        <Callout.Text>
          <Text weight="bold">Verificare obligatorie a excipienților. </Text>
          Pentru un copil cu rinită alergică, citiți eticheta completă înainte
          de fiecare produs: evitați extractele vegetale, polenurile, plantele
          medicinale, aromele „naturale” derivate din plante și coloranții
          alimentari controversați (E102, E110, E124, E129). Preferați capsule
          HPMC în locul celor de gelatină dacă există sensibilități. Niciuna
          dintre aceste sugestii nu înlocuiește avizul medical — discutați cu
          Dr. Mariana (alergolog) sau Dr. Mihăila Rodica (CMU Brașov) înainte
          de a începe orice supliment.
        </Callout.Text>
      </Callout.Root>

      <Box>
        <Text size="1" color="gray">
          Surse de fundal: ghiduri AAP privind utilizarea pediatrică a
          melatoninei pentru tulburări de somn; review-uri Cochrane pe
          magneziu și somn; FDA boxed warning pentru montelukast (martie
          2020). Acest panou este un punct de plecare pentru discuția cu
          medicul, nu un protocol de tratament.
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

function SuggestionList({ suggestions }: { suggestions: Suggestion[] }) {
  return (
    <Flex direction="column" gap="3">
      {suggestions.map((s) => (
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
          </Flex>
        </Card>
      ))}
    </Flex>
  );
}
