"use client";

import {
  Badge,
  Box,
  Callout,
  Card,
  Flex,
  Heading,
  Link as RadixLink,
  Text,
} from "@radix-ui/themes";
import { AlertTriangle, ExternalLink, Eye, ShieldAlert } from "lucide-react";

type Severity = "red" | "amber" | "gray";

type Bucket = {
  label: string;
  denominator: string;
  tone: Severity;
  items: React.ReactNode[];
};

const SERIOUS: Bucket[] = [
  {
    label: "Uncommon",
    denominator: "up to 1 in 100 people",
    tone: "amber",
    items: [
      "Allergic reactions — swelling of the face, lips, tongue and/or throat, which may cause difficulty breathing or swallowing",
      "Behaviour and mood changes — agitation, aggressive behaviour or hostility, depression",
      "Seizure",
    ],
  },
  {
    label: "Rare",
    denominator: "up to 1 in 1,000 people",
    tone: "amber",
    items: [
      "Increased bleeding tendency",
      "Tremor",
      "Palpitations",
    ],
  },
  {
    label: "Very rare",
    denominator: "up to 1 in 10,000 people",
    tone: "red",
    items: [
      "Churg-Strauss syndrome — flu-like illness, pins-and-needles or numbness of arms/legs, worsening pulmonary symptoms and/or rash",
      "Low blood platelet count",
      <>
        Behaviour and mood changes — hallucinations, disorientation,{" "}
        <Text as="span" weight="bold">
          suicidal thoughts and actions
        </Text>
      </>,
      "Inflammation of the lungs",
      "Severe skin reactions (erythema multiforme) that may occur without warning",
      "Inflammation of the liver (hepatitis)",
    ],
  },
];

const OTHER: Bucket[] = [
  {
    label: "Very common",
    denominator: "more than 1 in 10 people",
    tone: "gray",
    items: ["Upper respiratory infection"],
  },
  {
    label: "Common",
    denominator: "up to 1 in 10 people",
    tone: "gray",
    items: [
      "Headache",
      "Abdominal pain (reported in clinical studies of the 10 mg film-coated form)",
      "Diarrhoea, nausea, vomiting",
      "Rash",
      "Fever",
      "Elevated liver enzymes",
    ],
  },
  {
    label: "Uncommon",
    denominator: "up to 1 in 100 people",
    tone: "amber",
    items: [
      "Dream abnormalities including nightmares, trouble sleeping, sleepwalking, irritability, feeling anxious, restlessness",
      "Dizziness, drowsiness, pins-and-needles/numbness",
      "Nosebleed",
      "Dry mouth, indigestion",
      "Bruising, itching, hives",
      "Joint or muscle pain, muscle cramps",
      "Bedwetting in children",
      "Weakness/tiredness, feeling unwell, swelling",
    ],
  },
  {
    label: "Rare",
    denominator: "up to 1 in 1,000 people",
    tone: "amber",
    items: [
      "Disturbance in attention, memory impairment, uncontrolled muscle movements",
    ],
  },
  {
    label: "Very rare",
    denominator: "up to 1 in 10,000 people",
    tone: "red",
    items: [
      "Tender red lumps under the skin, most commonly on the shins (erythema nodosum)",
      "Obsessive-compulsive symptoms, stuttering",
    ],
  },
];

export function MontelukastSafetyPanel() {
  return (
    <Flex direction="column" gap="5">
      <Callout.Root color="red" variant="surface">
        <Callout.Icon>
          <AlertTriangle size={18} />
        </Callout.Icon>
        <Callout.Text>
          <Text weight="bold">FDA Boxed Warning (March 2020) — </Text>
          Montelukast carries a boxed warning for serious neuropsychiatric
          events, including agitation, depression, sleep disturbance, suicidal
          thoughts, and behaviour changes. Risk is reported in children and
          adolescents. Discuss benefits versus risks with the prescribing
          doctor and stop the drug + seek care if any of these appear.{" "}
          <RadixLink
            href="https://www.fda.gov/drugs/drug-safety-and-availability/fda-requires-boxed-warning-about-serious-mental-health-side-effects-asthma-and-allergy-drug"
            target="_blank"
            rel="noopener noreferrer"
          >
            FDA notice{" "}
            <ExternalLink size={12} style={{ display: "inline" }} />
          </RadixLink>
        </Callout.Text>
      </Callout.Root>

      <SectionHeader
        icon={<ShieldAlert size={18} color="var(--red-11)" />}
        title="Serious side effects"
        subtitle="Talk to a doctor immediately if any of these appear."
      />
      <BucketList buckets={SERIOUS} />

      <SectionHeader
        icon={<Eye size={18} color="var(--gray-11)" />}
        title="Other side effects"
        subtitle="Reported in clinical studies and post-marketing surveillance."
      />
      <BucketList buckets={OTHER} />

      <Card>
        <Flex direction="column" gap="2" p="3">
          <Text size="2" weight="medium">
            Overdose
          </Text>
          <Text size="2" color="gray">
            Most overdose reports describe no side effects. The most frequently
            reported symptoms in adults and children were abdominal pain,
            sleepiness, thirst, headache, vomiting, and hyperactivity. If too
            much has been taken, contact a doctor immediately.
          </Text>
        </Flex>
      </Card>

      <Box>
        <Text size="1" color="gray">
          Source: Organon Pharma (UK) Ltd. — Singulair Paediatric 5 mg
          chewable tablets, Patient Information Leaflet, revised December 2022
          (PIL.SGA-5mg.22.UK.0191). This is a regulatory leaflet summary, not
          medical advice. Talk to the prescribing doctor or pharmacist about
          anything new or worrying.
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

function BucketList({ buckets }: { buckets: Bucket[] }) {
  return (
    <Flex direction="column" gap="3">
      {buckets.map((b) => (
        <Card key={b.label}>
          <Flex direction="column" gap="2" p="3">
            <Flex align="center" gap="2" wrap="wrap">
              <Badge color={b.tone} variant="soft">
                {b.label}
              </Badge>
              <Text size="1" color="gray">
                {b.denominator}
              </Text>
            </Flex>
            <ul style={{ margin: 0, paddingLeft: "1.25rem" }}>
              {b.items.map((item, idx) => (
                <li key={idx}>
                  <Text size="2">{item}</Text>
                </li>
              ))}
            </ul>
          </Flex>
        </Card>
      ))}
    </Flex>
  );
}
