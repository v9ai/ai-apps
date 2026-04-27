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
            {research && (
              <Badge color="green" variant="soft" size="1">
                Cache 30 zile
              </Badge>
            )}
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
            <Flex justify="between" wrap="wrap" gap="2">
              <Text size="1" color="gray">
                Generat: {new Date(research.generatedAt).toLocaleString()}
              </Text>
              {research.freshUntil && (
                <Text size="1" color="gray">
                  Cache valabil până: {new Date(research.freshUntil).toLocaleDateString()}
                </Text>
              )}
            </Flex>
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
