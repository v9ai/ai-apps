"use client";

import {
  Box,
  Card,
  Flex,
  Heading,
  Text,
  Badge,
  Separator,
  Spinner,
  Button,
  Callout,
} from "@radix-ui/themes";
import { ArrowLeft, AlertTriangle, Pill } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useMedicationDeepResearchQuery } from "../../../__generated__/hooks";
import { AuthGate } from "../../../components/AuthGate";

const FREQ_LABEL: Record<string, { ro: string; color: "red" | "orange" | "amber" | "gray" }> = {
  black_box: { ro: "Avertisment FDA (boxed)", color: "red" },
  common: { ro: "Frecvente", color: "orange" },
  uncommon: { ro: "Mai puțin frecvente", color: "amber" },
  rare: { ro: "Rare", color: "gray" },
};

const SEVERITY_LABEL: Record<string, { ro: string; color: "red" | "orange" | "amber" | "gray" }> = {
  contraindicated: { ro: "Contraindicat", color: "red" },
  major: { ro: "Major", color: "orange" },
  moderate: { ro: "Moderat", color: "amber" },
  minor: { ro: "Minor", color: "gray" },
};

const CORRELATION_LABEL: Record<string, { ro: string; color: "red" | "orange" | "blue" | "gray" }> = {
  possible_side_effect: { ro: "Posibil efect advers", color: "red" },
  indication_match: { ro: "Indicație terapeutică", color: "blue" },
  temporal: { ro: "Corelație temporală", color: "orange" },
  other: { ro: "Altă corelație", color: "gray" },
};

export default function MedicationMemberPage() {
  const params = useParams<{ slug: string; member: string }>();
  return (
    <AuthGate
      pageName={`${params.slug} · ${params.member}`}
      description="Sign in to access medication analysis."
    >
      <DeepView slug={params.slug} memberSlug={params.member} />
    </AuthGate>
  );
}

function DeepView({ slug, memberSlug }: { slug: string; memberSlug: string }) {
  const { data, loading, error } = useMedicationDeepResearchQuery({
    variables: { slug, memberSlug },
  });

  if (loading) {
    return (
      <Flex justify="center" py="9">
        <Spinner size="3" />
      </Flex>
    );
  }
  if (error) {
    return (
      <Box py="6">
        <Callout.Root color="red">
          <Callout.Icon><AlertTriangle size={16} /></Callout.Icon>
          <Callout.Text>Eroare la încărcare: {error.message}</Callout.Text>
        </Callout.Root>
      </Box>
    );
  }
  const r = data?.medicationDeepResearch;
  if (!r) {
    return (
      <Box py="9">
        <Flex direction="column" align="center" gap="3">
          <Pill size={48} color="var(--gray-8)" />
          <Heading size="4">Nicio analiză disponibilă</Heading>
          <Text size="2" color="gray">
            Nu am găsit niciun medicament &quot;{slug}&quot; pentru &quot;{memberSlug}&quot;.
          </Text>
          <Link href="/medications">
            <Button variant="soft"><ArrowLeft size={14} /> Înapoi</Button>
          </Link>
        </Flex>
      </Box>
    );
  }

  const med = r.medication;
  const fm = r.familyMember;
  const ph = r.pharmacology;
  const sideEffectCorrs = r.correlations.filter((c) => c.correlationType === "possible_side_effect");
  const indicationCorrs = r.correlations.filter((c) => c.correlationType === "indication_match");
  const otherCorrs = r.correlations.filter(
    (c) => c.correlationType !== "possible_side_effect" && c.correlationType !== "indication_match",
  );

  const bbw = r.adverseEvents.filter((a) => a.frequencyBand === "black_box");

  return (
    <Box py="6">
      <Flex direction="column" gap="6">
        <Flex align="center" gap="2">
          <Link href={`/medications/${slug}`}>
            <Button variant="ghost" color="gray" size="2">
              <ArrowLeft size={14} /> Înapoi la {med.name}
            </Button>
          </Link>
        </Flex>

        {/* Header */}
        <Flex direction="column" gap="2">
          <Heading size={{ initial: "6", md: "8" }} weight="bold">
            {med.name} <Text size="4" color="gray" weight="regular">· {fm?.firstName}</Text>
          </Heading>
          <Flex gap="2" wrap="wrap" align="center">
            {med.dosage && <Badge color="blue" variant="soft">{med.dosage}</Badge>}
            {med.frequency && <Badge color="gray" variant="soft">{med.frequency}</Badge>}
            {ph?.genericName && <Badge color="indigo" variant="outline">DCI: {ph.genericName}</Badge>}
            {ph?.atcCode && <Badge color="indigo" variant="outline">ATC: {ph.atcCode}</Badge>}
            {(med.startDate || med.endDate) && (
              <Text size="1" color="gray">
                {med.startDate ?? "?"} → {med.endDate ?? "în curs"}
              </Text>
            )}
          </Flex>
        </Flex>

        {/* Black-box prominent banner */}
        {bbw.length > 0 && (
          <Callout.Root color="red" variant="soft">
            <Callout.Icon><AlertTriangle size={16} /></Callout.Icon>
            <Callout.Text>
              <Text weight="medium">Avertisment FDA (boxed)</Text>
              <Box mt="1">
                {bbw.map((b) => (
                  <Text as="div" key={b.id} size="2">• {b.event}</Text>
                ))}
              </Box>
            </Callout.Text>
          </Callout.Root>
        )}

        <Separator size="4" />

        {/* Possible side-effect correlations — the headline section */}
        <Section
          title={`Posibile efecte adverse observate la ${fm?.firstName} (${sideEffectCorrs.length})`}
          subtitle="Comportamente / înregistrări care se aliniază cu profilul de siguranță al medicamentului."
        >
          {sideEffectCorrs.length === 0 ? (
            <Text size="2" color="gray">Nicio corelație detectată.</Text>
          ) : (
            <Flex direction="column" gap="2">
              {sideEffectCorrs.map((c) => (
                <CorrelationCard key={c.id} c={c} />
              ))}
            </Flex>
          )}
        </Section>

        {/* Indication match */}
        {indicationCorrs.length > 0 && (
          <Section
            title={`Indicații terapeutice potrivite (${indicationCorrs.length})`}
            subtitle="Probleme documentate care se aliniază cu indicațiile aprobate ale medicamentului."
          >
            <Flex direction="column" gap="2">
              {indicationCorrs.map((c) => <CorrelationCard key={c.id} c={c} />)}
            </Flex>
          </Section>
        )}

        {/* Other correlations */}
        {otherCorrs.length > 0 && (
          <Section title={`Alte corelații (${otherCorrs.length})`}>
            <Flex direction="column" gap="2">
              {otherCorrs.map((c) => <CorrelationCard key={c.id} c={c} />)}
            </Flex>
          </Section>
        )}

        {/* Drug profile reference */}
        <Separator size="4" />

        <Section title="Profil medicament" subtitle="Date din eticheta FDA (DailyMed / openFDA).">
          <Flex direction="column" gap="4">
            {ph && (
              <Card>
                <Flex direction="column" gap="2">
                  <Text size="1" color="gray" weight="medium">FARMACOLOGIE</Text>
                  {ph.moa && <FactRow label="Mecanism" value={ph.moa} />}
                  {ph.halfLife && <FactRow label="Timp de înjumătățire" value={ph.halfLife} />}
                  {ph.peakTime && <FactRow label="Concentrație maximă" value={ph.peakTime} />}
                  {ph.metabolism && <FactRow label="Metabolism" value={ph.metabolism} />}
                  {ph.excretion && <FactRow label="Excreție" value={ph.excretion} />}
                </Flex>
              </Card>
            )}

            {r.indications.length > 0 && (
              <Card>
                <Flex direction="column" gap="2">
                  <Text size="1" color="gray" weight="medium">INDICAȚII</Text>
                  {r.indications.map((ind) => (
                    <Flex key={ind.id} gap="2" align="start">
                      <Badge color={ind.kind === "primary" ? "green" : "gray"} variant="soft" size="1">
                        {ind.kind === "primary" ? "Principal" : "Off-label"}
                      </Badge>
                      <Text size="2">{ind.condition}</Text>
                    </Flex>
                  ))}
                </Flex>
              </Card>
            )}

            {r.dosing.length > 0 && (
              <Card>
                <Flex direction="column" gap="2">
                  <Text size="1" color="gray" weight="medium">DOZAJ</Text>
                  {r.dosing.map((d) => (
                    <Flex key={d.id} gap="2" align="start" wrap="wrap">
                      <Badge color="blue" variant="soft" size="1">
                        {d.population === "pediatric" ? "Pediatric" :
                         d.population === "adult" ? "Adult" :
                         d.population === "elderly" ? "Vârstnici" :
                         d.population === "renal" ? "Renal" :
                         d.population === "hepatic" ? "Hepatic" : d.population}
                      </Badge>
                      {d.ageBand && <Badge variant="outline" size="1">{d.ageBand}</Badge>}
                      <Text size="2">{d.doseText}{d.frequency ? `, ${d.frequency}` : ""}</Text>
                    </Flex>
                  ))}
                </Flex>
              </Card>
            )}

            {r.adverseEvents.length > 0 && (
              <Card>
                <Flex direction="column" gap="2">
                  <Text size="1" color="gray" weight="medium">EFECTE ADVERSE</Text>
                  {r.adverseEvents.map((ae) => {
                    const meta = FREQ_LABEL[ae.frequencyBand] ?? { ro: ae.frequencyBand, color: "gray" as const };
                    return (
                      <Flex key={ae.id} gap="2" align="start">
                        <Badge color={meta.color} variant="soft" size="1">{meta.ro}</Badge>
                        <Text size="2">{ae.event}</Text>
                      </Flex>
                    );
                  })}
                </Flex>
              </Card>
            )}

            {r.interactions.length > 0 && (
              <Card>
                <Flex direction="column" gap="2">
                  <Text size="1" color="gray" weight="medium">INTERACȚIUNI</Text>
                  {r.interactions.map((inx) => {
                    const meta = SEVERITY_LABEL[inx.severity] ?? { ro: inx.severity, color: "gray" as const };
                    return (
                      <Flex key={inx.id} gap="2" align="start" wrap="wrap">
                        <Badge color={meta.color} variant="soft" size="1">{meta.ro}</Badge>
                        <Text size="2" weight="medium">{inx.interactingDrug}</Text>
                        {inx.recommendation && (
                          <Text size="1" color="gray" style={{ flex: 1 }}>{inx.recommendation}</Text>
                        )}
                      </Flex>
                    );
                  })}
                </Flex>
              </Card>
            )}
          </Flex>
        </Section>

        {ph?.sourceUrl && (
          <Text size="1" color="gray">
            Sursă: <a href={ph.sourceUrl} target="_blank" rel="noopener noreferrer" style={{ color: "var(--accent-11)" }}>FDA / DailyMed</a>
            {" · "}Actualizat: {new Date(ph.updatedAt).toLocaleDateString("ro-RO")}
          </Text>
        )}
      </Flex>
    </Box>
  );
}

function Section({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <Flex direction="column" gap="2">
      <Heading size="4">{title}</Heading>
      {subtitle && <Text size="2" color="gray">{subtitle}</Text>}
      <Box mt="1">{children}</Box>
    </Flex>
  );
}

type CorrelationItem = {
  id: string;
  relatedEntityType: string;
  relatedEntityId: number;
  correlationType: string;
  confidence: number;
  matchedFact?: string | null;
  rationale?: string | null;
  relatedTitle?: string | null;
  relatedDescription?: string | null;
  relatedDate?: string | null;
};

function CorrelationCard({ c }: { c: CorrelationItem }) {
  const ctype = CORRELATION_LABEL[c.correlationType] ?? { ro: c.correlationType, color: "gray" as const };
  const link =
    c.relatedEntityType === "issue"
      ? `/issues/${c.relatedEntityId}`
      : c.relatedEntityType === "journal_entry"
        ? `/journal/${c.relatedEntityId}`
        : null;
  const label = c.relatedEntityType === "issue" ? "Issue" : "Jurnal";

  const inner = (
    <Card variant="surface" style={{ width: "100%" }}>
      <Flex direction="column" gap="2">
        <Flex gap="2" align="center" wrap="wrap">
          <Badge color={ctype.color} variant="soft">{ctype.ro}</Badge>
          <Badge color="gray" variant="outline">{label} #{c.relatedEntityId}</Badge>
          {c.relatedDate && <Text size="1" color="gray">{c.relatedDate}</Text>}
          <Box style={{ marginLeft: "auto" }}>
            <Badge color={c.confidence >= 80 ? "red" : c.confidence >= 60 ? "orange" : "gray"} variant="soft">
              {c.confidence}%
            </Badge>
          </Box>
        </Flex>
        {c.relatedTitle && <Text size="2" weight="medium">{c.relatedTitle}</Text>}
        {c.matchedFact && (
          <Text size="1" color="gray">
            <Text weight="medium">Fapt corelat:</Text> {c.matchedFact}
          </Text>
        )}
        {c.rationale && <Text size="2">{c.rationale}</Text>}
      </Flex>
    </Card>
  );

  return link ? (
    <Link href={link} style={{ color: "inherit", textDecoration: "none" }}>{inner}</Link>
  ) : (
    inner
  );
}

function FactRow({ label, value }: { label: string; value: string }) {
  return (
    <Flex gap="2" align="start">
      <Text size="1" color="gray" weight="medium" style={{ minWidth: 140 }}>{label}</Text>
      <Text size="2" style={{ flex: 1 }}>{value}</Text>
    </Flex>
  );
}
