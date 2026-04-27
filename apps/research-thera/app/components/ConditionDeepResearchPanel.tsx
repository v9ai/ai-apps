"use client";

import { useEffect, useState } from "react";
import {
  Badge,
  Box,
  Button,
  Callout,
  Card,
  Flex,
  Heading,
  Separator,
  Spinner,
  Text,
} from "@radix-ui/themes";
import {
  AlertTriangle,
  Brain,
  Check,
  ClipboardList,
  Microscope,
  RefreshCw,
  Stethoscope,
  Target,
  Users,
  X,
} from "lucide-react";
import {
  useConditionDeepResearchQuery,
  useGenerateConditionDeepResearchMutation,
  useGetGenerationJobQuery,
  ConditionDeepResearchDocument,
  type ConditionProximityAssessment,
  type ConditionCriteriaMatchAdhd,
  type ConditionMatchedSymptom,
} from "../__generated__/hooks";

const TIER_LABELS: Record<string, string> = {
  preschool: "Preșcolar (≤5)",
  early_school: "Școlar mic (6-8)",
  middle_childhood: "Copilărie mijlocie (9-12)",
  adolescent: "Adolescent (13-17)",
  adult: "Adult",
};

const EVIDENCE_COLORS: Record<
  string,
  "green" | "blue" | "amber" | "gray" | "purple"
> = {
  strong: "green",
  moderate: "blue",
  weak: "amber",
  expert_opinion: "gray",
  experimental: "purple",
};

const PROXIMITY_COLORS: Record<
  string,
  "red" | "orange" | "amber" | "blue" | "green" | "gray"
> = {
  very_likely: "red",
  likely: "orange",
  possible: "amber",
  unlikely: "blue",
  very_unlikely: "green",
};

const PROXIMITY_LABELS: Record<string, string> = {
  very_likely: "Foarte probabil",
  likely: "Probabil",
  possible: "Posibil",
  unlikely: "Puțin probabil",
  very_unlikely: "Foarte puțin probabil",
};

const CONFIDENCE_LABELS: Record<string, string> = {
  high: "încredere ridicată",
  moderate: "încredere moderată",
  low: "încredere scăzută",
};

const PRESENTATION_LABELS: Record<string, string> = {
  predominantly_inattentive: "Predominant neatent",
  predominantly_hyperactive_impulsive: "Predominant hiperactiv-impulsiv",
  combined: "Combinat",
  subthreshold: "Sub prag",
};

export function ConditionDeepResearchPanel({
  conditionSlug,
  memberSlug,
  language = "ro",
}: {
  conditionSlug: string;
  memberSlug: string;
  language?: string;
}) {
  const { data, loading, error, refetch } = useConditionDeepResearchQuery({
    variables: { slug: conditionSlug, memberSlug, language },
    fetchPolicy: "cache-and-network",
  });

  const [generate, { loading: generating, error: genError }] =
    useGenerateConditionDeepResearchMutation({
      refetchQueries: [
        {
          query: ConditionDeepResearchDocument,
          variables: { slug: conditionSlug, memberSlug, language },
        },
      ],
    });

  const [pollingJobId, setPollingJobId] = useState<string | null>(null);
  const { data: jobData, stopPolling } = useGetGenerationJobQuery({
    variables: { id: pollingJobId ?? "" },
    skip: !pollingJobId,
    pollInterval: 1500,
  });

  useEffect(() => {
    if (!pollingJobId || !jobData?.generationJob) return;
    const status = jobData.generationJob.status;
    if (status === "SUCCEEDED" || status === "FAILED") {
      stopPolling();
      setPollingJobId(null);
      void refetch();
    }
  }, [jobData, pollingJobId, refetch, stopPolling]);

  const research = data?.conditionDeepResearch;

  async function handleGenerate() {
    const result = await generate({
      variables: { slug: conditionSlug, memberSlug, language },
    });
    const jobId = result.data?.generateConditionDeepResearch?.jobId;
    if (jobId) setPollingJobId(jobId);
  }

  const isWorking =
    generating ||
    (!!pollingJobId &&
      jobData?.generationJob?.status !== "SUCCEEDED" &&
      jobData?.generationJob?.status !== "FAILED");

  return (
    <Card>
      <Flex direction="column" gap="3" p="2">
        <Flex justify="between" align="center" gap="2" wrap="wrap">
          <Flex align="center" gap="2">
            <Microscope size={18} color="var(--indigo-10)" />
            <Heading size="4">Cercetare clinică profundă</Heading>
          </Flex>
          <Button
            variant="soft"
            color={research ? "gray" : "indigo"}
            disabled={isWorking}
            onClick={handleGenerate}
          >
            {isWorking ? (
              <>
                <Spinner size="1" /> Generare…
              </>
            ) : (
              <>
                <RefreshCw size={14} /> {research ? "Regenerează" : "Generează"}
              </>
            )}
          </Button>
        </Flex>

        {(error || genError) && (
          <Callout.Root color="red" size="1">
            <Callout.Text>
              {error?.message ?? genError?.message ?? "Eroare necunoscută"}
            </Callout.Text>
          </Callout.Root>
        )}

        {loading && !research && (
          <Flex justify="center" py="4">
            <Spinner size="2" />
          </Flex>
        )}

        {!loading && !research && (
          <Text size="2" color="gray">
            Apasă „Generează" pentru a obține o sinteză clinică structurată
            (fiziopatologie, manifestări pe vârste, tratamente bazate pe dovezi,
            comorbidități, semne de alarmă) calibrată pe profilul de
            dezvoltare al persoanei.
          </Text>
        )}

        {research && (
          <Flex direction="column" gap="4">
            {research.proximityAssessment && (
              <ProximityCard assessment={research.proximityAssessment} />
            )}

            {research.criteriaMatch && (
              <CriteriaMatchSection criteria={research.criteriaMatch} />
            )}

            {research.pathophysiology && (
              <Section icon={<Brain size={16} />} title="Fiziopatologie">
                <Text size="2" style={{ lineHeight: 1.6 }}>
                  {research.pathophysiology.summary}
                </Text>
                {research.pathophysiology.mechanisms.length > 0 && (
                  <Box mt="2">
                    <ul style={{ margin: 0, paddingLeft: "1.25rem" }}>
                      {research.pathophysiology.mechanisms.map((m, i) => (
                        <li key={i}>
                          <Text size="2">{m}</Text>
                        </li>
                      ))}
                    </ul>
                  </Box>
                )}
              </Section>
            )}

            {research.ageManifestations.length > 0 && (
              <Section
                icon={<Users size={16} />}
                title="Manifestări pe etape de dezvoltare"
              >
                <Flex direction="column" gap="3">
                  {research.ageManifestations.map((m, i) => (
                    <Box key={i}>
                      <Badge color="indigo" variant="soft" size="1">
                        {TIER_LABELS[m.developmentalTier] ??
                          m.developmentalTier}
                      </Badge>
                      <ul style={{ margin: "0.4rem 0 0", paddingLeft: "1.25rem" }}>
                        {m.manifestations.map((x, j) => (
                          <li key={j}>
                            <Text size="2">{x}</Text>
                          </li>
                        ))}
                      </ul>
                      {m.notes && (
                        <Text size="1" color="gray" mt="1" as="p">
                          {m.notes}
                        </Text>
                      )}
                    </Box>
                  ))}
                </Flex>
              </Section>
            )}

            {research.evidenceBasedTreatments.length > 0 && (
              <Section
                icon={<Stethoscope size={16} />}
                title="Tratamente bazate pe dovezi"
              >
                <Flex direction="column" gap="3">
                  {research.evidenceBasedTreatments.map((t, i) => (
                    <Box key={i}>
                      <Flex align="center" gap="2" wrap="wrap">
                        <Text size="2" weight="bold">
                          {t.name}
                        </Text>
                        <Badge color="gray" variant="soft" size="1">
                          {t.category}
                        </Badge>
                        {t.evidenceLevel && (
                          <Badge
                            color={EVIDENCE_COLORS[t.evidenceLevel] ?? "gray"}
                            variant="soft"
                            size="1"
                          >
                            {t.evidenceLevel}
                          </Badge>
                        )}
                        {t.ageAppropriate && (
                          <Text size="1" color="gray">
                            · {t.ageAppropriate}
                          </Text>
                        )}
                      </Flex>
                      {t.notes && (
                        <Text
                          size="2"
                          color="gray"
                          mt="1"
                          as="p"
                          style={{ lineHeight: 1.5 }}
                        >
                          {t.notes}
                        </Text>
                      )}
                    </Box>
                  ))}
                </Flex>
              </Section>
            )}

            {research.comorbidities.length > 0 && (
              <Section icon={<Users size={16} />} title="Comorbidități">
                <Flex direction="column" gap="2">
                  {research.comorbidities.map((c, i) => (
                    <Box key={i}>
                      <Flex align="center" gap="2" wrap="wrap">
                        <Text size="2" weight="medium">
                          {c.name}
                        </Text>
                        {c.prevalence && (
                          <Badge color="gray" variant="soft" size="1">
                            {c.prevalence}
                          </Badge>
                        )}
                      </Flex>
                      {c.notes && (
                        <Text size="1" color="gray" as="p">
                          {c.notes}
                        </Text>
                      )}
                    </Box>
                  ))}
                </Flex>
              </Section>
            )}

            {research.redFlags.length > 0 && (
              <Section
                icon={<AlertTriangle size={16} color="var(--red-10)" />}
                title="Semne de alarmă"
              >
                <Flex direction="column" gap="2">
                  {research.redFlags.map((rf, i) => (
                    <Box
                      key={i}
                      p="2"
                      style={{
                        borderLeft: "3px solid var(--red-9)",
                        background: "var(--red-2)",
                        borderRadius: 4,
                      }}
                    >
                      <Text size="2" weight="medium">
                        {rf.flag}
                      </Text>
                      {rf.action && (
                        <Text
                          size="1"
                          color="gray"
                          as="p"
                          style={{ marginTop: 2 }}
                        >
                          → {rf.action}
                        </Text>
                      )}
                    </Box>
                  ))}
                </Flex>
              </Section>
            )}

            <Separator size="4" />
            <Text size="1" color="gray">
              Generat: {new Date(research.generatedAt).toLocaleString()} · rulează pe toate datele înregistrate
            </Text>
          </Flex>
        )}
      </Flex>
    </Card>
  );
}

function Section({
  icon,
  title,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <Box>
      <Flex align="center" gap="2" mb="2">
        {icon}
        <Text size="2" weight="bold">
          {title}
        </Text>
      </Flex>
      {children}
    </Box>
  );
}

function ProximityCard({
  assessment,
}: {
  assessment: ConditionProximityAssessment;
}) {
  const color = PROXIMITY_COLORS[assessment.label] ?? "gray";
  const labelText = PROXIMITY_LABELS[assessment.label] ?? assessment.label;
  const confText =
    CONFIDENCE_LABELS[assessment.confidence] ?? assessment.confidence;

  return (
    <Card
      style={{
        borderTop: `4px solid var(--${color}-9)`,
        background: `var(--${color}-2)`,
      }}
    >
      <Flex direction="column" gap="3" p="2">
        <Flex justify="between" align="center" gap="3" wrap="wrap">
          <Flex align="center" gap="3">
            <Target size={20} color={`var(--${color}-10)`} />
            <Heading size="4">Cât de aproape este de ADHD?</Heading>
          </Flex>
          <Flex align="center" gap="2">
            <Badge color={color} variant="solid" size="2">
              {labelText}
            </Badge>
            <Badge color="gray" variant="soft" size="1">
              {confText}
            </Badge>
          </Flex>
        </Flex>

        <Flex align="baseline" gap="3">
          <Text
            size="9"
            weight="bold"
            style={{ color: `var(--${color}-11)`, lineHeight: 1 }}
          >
            {assessment.score}
          </Text>
          <Text size="3" color="gray">
            / 100 potrivire cu criteriile DSM-5
          </Text>
        </Flex>

        <Text size="2" style={{ lineHeight: 1.6 }}>
          {assessment.rationale}
        </Text>

        <Flex direction={{ initial: "column", sm: "row" }} gap="3">
          <Box style={{ flex: 1 }}>
            <Flex align="center" gap="2" mb="1">
              <Check size={14} color="var(--green-10)" />
              <Text size="1" weight="bold" color="green">
                Susține diagnosticul ({assessment.supportingEvidence.length})
              </Text>
            </Flex>
            {assessment.supportingEvidence.length > 0 ? (
              <ul style={{ margin: 0, paddingLeft: "1.1rem" }}>
                {assessment.supportingEvidence.map((s, i) => (
                  <li key={i}>
                    <Text size="2">{s}</Text>
                  </li>
                ))}
              </ul>
            ) : (
              <Text size="1" color="gray">
                — niciun element identificat —
              </Text>
            )}
          </Box>

          <Box style={{ flex: 1 }}>
            <Flex align="center" gap="2" mb="1">
              <X size={14} color="var(--red-10)" />
              <Text size="1" weight="bold" color="red">
                Contrazice ({assessment.contradictingEvidence.length})
              </Text>
            </Flex>
            {assessment.contradictingEvidence.length > 0 ? (
              <ul style={{ margin: 0, paddingLeft: "1.1rem" }}>
                {assessment.contradictingEvidence.map((s, i) => (
                  <li key={i}>
                    <Text size="2">{s}</Text>
                  </li>
                ))}
              </ul>
            ) : (
              <Text size="1" color="gray">
                — niciun element identificat —
              </Text>
            )}
          </Box>
        </Flex>

        {assessment.missingEvidence.length > 0 && (
          <Callout.Root color="amber" size="1">
            <Callout.Icon>
              <ClipboardList size={14} />
            </Callout.Icon>
            <Callout.Text>
              <Text size="1" weight="bold" as="span">
                Date care ar clarifica evaluarea:{" "}
              </Text>
              {assessment.missingEvidence.join(" · ")}
            </Callout.Text>
          </Callout.Root>
        )}

        {assessment.recommendedNextStep && (
          <Box
            p="3"
            style={{
              borderLeft: `3px solid var(--${color}-9)`,
              background: "var(--gray-2)",
              borderRadius: 4,
            }}
          >
            <Text size="1" color="gray" weight="bold" mr="1">
              Următorul pas recomandat:
            </Text>
            <Text size="2">{assessment.recommendedNextStep}</Text>
          </Box>
        )}
      </Flex>
    </Card>
  );
}

function CriteriaMatchSection({
  criteria,
}: {
  criteria: ConditionCriteriaMatchAdhd;
}) {
  const presentation = criteria.presentation
    ? PRESENTATION_LABELS[criteria.presentation] ?? criteria.presentation
    : null;

  return (
    <Section
      icon={<ClipboardList size={16} />}
      title={`Potrivire cu criteriile ${criteria.framework}`}
    >
      <Flex direction="column" gap="3">
        {presentation && (
          <Box>
            <Text size="1" color="gray">
              Prezentare:{" "}
            </Text>
            <Badge color="indigo" variant="soft" size="1">
              {presentation}
            </Badge>
          </Box>
        )}

        {criteria.criterionAInattention && (
          <CriterionABlock
            label="Criteriul A1 — Neatenție"
            group={criteria.criterionAInattention}
          />
        )}

        {criteria.criterionAHyperactivityImpulsivity && (
          <CriterionABlock
            label="Criteriul A2 — Hiperactivitate-impulsivitate"
            group={criteria.criterionAHyperactivityImpulsivity}
          />
        )}

        <Flex direction="column" gap="2">
          <CriterionRow
            label="B — Debut înainte de 12 ani"
            met={criteria.criterionBAgeOnset?.met ?? false}
            evidence={criteria.criterionBAgeOnset?.evidence ?? null}
          />
          <CriterionRow
            label="C — Prezent în ≥2 contexte"
            met={criteria.criterionCSettings?.met ?? false}
            evidence={criteria.criterionCSettings?.evidence ?? null}
          />
          <CriterionRow
            label="D — Afectare funcțională documentată"
            met={criteria.criterionDImpairment?.met ?? false}
            evidence={criteria.criterionDImpairment?.evidence ?? null}
          />
          <CriterionRow
            label="E — Diferențial: nu se explică prin altă afecțiune"
            met={criteria.criterionEDifferential?.ruledOut ?? false}
            evidence={criteria.criterionEDifferential?.notes ?? null}
          />
        </Flex>
      </Flex>
    </Section>
  );
}

function CriterionABlock({
  label,
  group,
}: {
  label: string;
  group: {
    matchedSymptoms: ConditionMatchedSymptom[];
    matchedCount: number;
    thresholdMet: boolean;
  };
}) {
  return (
    <Box>
      <Flex align="center" justify="between" wrap="wrap" gap="2" mb="1">
        <Text size="2" weight="bold">
          {label}
        </Text>
        <Flex align="center" gap="2">
          <Badge
            color={group.thresholdMet ? "red" : "gray"}
            variant="soft"
            size="1"
          >
            {group.matchedCount} / 9 simptome
          </Badge>
          {group.thresholdMet && (
            <Badge color="red" variant="solid" size="1">
              prag depășit
            </Badge>
          )}
        </Flex>
      </Flex>
      {group.matchedSymptoms.length > 0 ? (
        <Flex direction="column" gap="1">
          {group.matchedSymptoms.map((s, i) => (
            <Box
              key={i}
              p="2"
              style={{
                background: "var(--gray-2)",
                borderRadius: 4,
                borderLeft: "2px solid var(--red-8)",
              }}
            >
              <Text size="2" weight="medium" as="div">
                {s.symptom}
              </Text>
              <Text size="1" color="gray" as="div" mt="1">
                {s.evidence}
              </Text>
            </Box>
          ))}
        </Flex>
      ) : (
        <Text size="1" color="gray">
          Niciun simptom susținut explicit de evidență.
        </Text>
      )}
    </Box>
  );
}

function CriterionRow({
  label,
  met,
  evidence,
}: {
  label: string;
  met: boolean;
  evidence: string | null;
}) {
  return (
    <Flex align="start" gap="2">
      {met ? (
        <Check size={16} color="var(--green-10)" style={{ marginTop: 2 }} />
      ) : (
        <X size={16} color="var(--gray-9)" style={{ marginTop: 2 }} />
      )}
      <Box style={{ flex: 1 }}>
        <Text size="2" weight={met ? "medium" : "regular"}>
          {label}
        </Text>
        {evidence && (
          <Text size="1" color="gray" as="div" mt="1">
            {evidence}
          </Text>
        )}
      </Box>
    </Flex>
  );
}
