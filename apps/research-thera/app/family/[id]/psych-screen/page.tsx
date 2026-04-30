"use client";

import { useEffect, useState } from "react";
import {
  Box,
  Flex,
  Heading,
  Text,
  Card,
  Badge,
  Spinner,
  Button,
  Separator,
  Callout,
  Link as RadixLink,
  Tooltip,
} from "@radix-ui/themes";
import {
  ArrowLeftIcon,
  MagicWandIcon,
  ExclamationTriangleIcon,
  InfoCircledIcon,
} from "@radix-ui/react-icons";
import { useParams, useRouter } from "next/navigation";
import NextLink from "next/link";
import { format } from "date-fns";
import { ro } from "date-fns/locale";
import {
  useGetFamilyMemberQuery,
  useLatestPsychScreenQuery,
  useGeneratePsychScreenMutation,
  useGetGenerationJobQuery,
} from "@/app/__generated__/hooks";

type Recommendation =
  | "URGENT_CONSULT"
  | "CONSULT_RECOMMENDED"
  | "WAIT_AND_OBSERVE"
  | "NO_CONSULT_NEEDED";

const RECOMMENDATION_LABEL_RO: Record<Recommendation, string> = {
  URGENT_CONSULT: "Consult URGENT",
  CONSULT_RECOMMENDED: "Consult recomandat",
  WAIT_AND_OBSERVE: "Așteaptă și observă",
  NO_CONSULT_NEEDED: "Nu este necesar consult",
};

const RECOMMENDATION_COLOR: Record<Recommendation, "red" | "amber" | "blue" | "green"> = {
  URGENT_CONSULT: "red",
  CONSULT_RECOMMENDED: "amber",
  WAIT_AND_OBSERVE: "blue",
  NO_CONSULT_NEEDED: "green",
};

const PHASE_LABEL_RO: Record<string, string> = {
  acute: "acută (0–7 zile)",
  subacute: "subacută (8–14 zile)",
  resolution: "rezolvare (15–28 zile)",
  persistent: "persistentă (>28 zile)",
  "n/a": "nu se aplică",
};

function formatRo(dateStr: string): string {
  try {
    return format(new Date(dateStr), "d MMM yyyy, HH:mm", { locale: ro });
  } catch {
    return dateStr;
  }
}

function citationHref(c: { doi?: string | null }): string | undefined {
  return c.doi ? `https://doi.org/${c.doi}` : undefined;
}

function PsychScreenContent() {
  const params = useParams();
  const router = useRouter();
  const familySlug = params.id as string;
  const isNumeric = /^\d+$/.test(familySlug);
  const familyMemberIdFromRoute = isNumeric ? parseInt(familySlug, 10) : NaN;

  const { data: fmData, loading: fmLoading } = useGetFamilyMemberQuery({
    variables: isNumeric ? { id: familyMemberIdFromRoute } : { slug: familySlug },
  });
  const member = fmData?.familyMember;
  const familyMemberId = member?.id ?? NaN;

  const {
    data: latestData,
    loading: latestLoading,
    refetch,
  } = useLatestPsychScreenQuery({
    variables: { familyMemberId },
    skip: isNaN(familyMemberId),
    fetchPolicy: "cache-and-network",
  });

  const [jobId, setJobId] = useState<string | null>(null);
  const [message, setMessage] = useState<{ text: string; type: "success" | "error" } | null>(null);

  const { data: jobData, stopPolling } = useGetGenerationJobQuery({
    variables: { id: jobId! },
    skip: !jobId,
    pollInterval: 8000,
    notifyOnNetworkStatusChange: true,
    fetchPolicy: "network-only",
    onCompleted: (d) => {
      const status = d.generationJob?.status;
      if (status === "SUCCEEDED" || status === "FAILED") {
        stopPolling();
        if (status === "SUCCEEDED") {
          setMessage({ text: "Evaluarea s-a generat cu succes.", type: "success" });
          refetch();
        } else {
          setMessage({
            text: d.generationJob?.error?.message ?? "Generarea a eșuat.",
            type: "error",
          });
        }
        setJobId(null);
      }
    },
  });

  const jobProgress = jobData?.generationJob?.progress ?? 0;

  const [generate, { loading: starting }] = useGeneratePsychScreenMutation({
    onCompleted: (d) => {
      if (d.generatePsychScreen.success && d.generatePsychScreen.jobId) {
        setMessage(null);
        setJobId(d.generatePsychScreen.jobId);
      } else {
        setMessage({
          text: d.generatePsychScreen.message || "Nu am putut porni generarea.",
          type: "error",
        });
      }
    },
    onError: (err) => setMessage({ text: err.message, type: "error" }),
  });

  const generating = starting || Boolean(jobId);
  const screen = latestData?.latestPsychScreen;

  if (fmLoading) {
    return (
      <Flex p="6" justify="center">
        <Spinner />
      </Flex>
    );
  }

  if (!member) {
    return (
      <Box p="6">
        <Text color="gray">Family member not found.</Text>
      </Box>
    );
  }

  const memberPath = `/family/${member.slug ?? member.id}`;

  return (
    <Box p={{ initial: "3", md: "5" }} style={{ maxWidth: 980, margin: "0 auto" }}>
      <Flex direction="column" gap="4">
        <Flex align="center" gap="2">
          <NextLink href={memberPath}>
            <Button variant="ghost" size="2">
              <ArrowLeftIcon /> {member.firstName}
            </Button>
          </NextLink>
        </Flex>

        <Flex justify="between" align="end" wrap="wrap" gap="3">
          <Flex direction="column" gap="1">
            <Heading size={{ initial: "5", md: "7" }}>
              Evaluare consult psiholog — {member.firstName}
            </Heading>
            <Text size="2" color="gray">
              Sintetizează tabloul clinic complet (medicații, observații, jurnal,
              caracteristici, analize) și recomandă dacă {member.firstName} are
              nevoie de un consult la psiholog. Doar orientativ — confirmarea o
              face medicul.
            </Text>
          </Flex>
          <Button onClick={() => generate({ variables: { familyMemberId, language: "ro" } })} disabled={generating} size="3">
            {generating ? (
              <>
                <Spinner size="2" /> Se evaluează… {jobProgress}%
              </>
            ) : (
              <>
                <MagicWandIcon /> {screen ? "Reevaluează" : "Generează evaluarea"}
              </>
            )}
          </Button>
        </Flex>

        {message && (
          <Callout.Root color={message.type === "error" ? "red" : "green"}>
            <Callout.Icon>
              {message.type === "error" ? <ExclamationTriangleIcon /> : <InfoCircledIcon />}
            </Callout.Icon>
            <Callout.Text>{message.text}</Callout.Text>
          </Callout.Root>
        )}

        {generating && (
          <Callout.Root color="blue">
            <Callout.Icon>
              <Spinner />
            </Callout.Icon>
            <Callout.Text>
              Rulez graful psych_screen (load_context → assess_window → screen_red_flags
              → generate → critique → persist). Durează ~60–90 secunde.
            </Callout.Text>
          </Callout.Root>
        )}

        {latestLoading && !screen ? (
          <Flex p="6" justify="center">
            <Spinner />
          </Flex>
        ) : !screen ? (
          <Card>
            <Flex direction="column" gap="2" p="4">
              <Text>Încă nu există o evaluare pentru {member.firstName}.</Text>
              <Text size="2" color="gray">
                Apasă <em>Generează evaluarea</em> pentru a rula graful pe baza
                contextului actual.
              </Text>
            </Flex>
          </Card>
        ) : (
          <PsychScreenView screen={screen as any} />
        )}

        <Callout.Root color="gray">
          <Callout.Icon>
            <InfoCircledIcon />
          </Callout.Icon>
          <Callout.Text>
            Acest instrument oferă o recomandare orientativă, nu un diagnostic.
            Pentru evaluare clinică formală, contactează un psiholog sau medic
            specialist.
          </Callout.Text>
        </Callout.Root>
      </Flex>
    </Box>
  );
}

function PsychScreenView({ screen }: { screen: any }) {
  const rec = screen.recommendation as Recommendation;
  const win = screen.observationWindow ?? null;
  const flags = screen.redFlags ?? [];
  const supportingObs = screen.supportingObservations ?? [];
  const differential = screen.differential ?? [];
  const nextSteps = screen.recommendedNextSteps ?? [];
  const citations = screen.citations ?? [];

  return (
    <>
      <Card>
        <Flex direction="column" gap="3" p="2">
          <Flex justify="between" align="start" wrap="wrap" gap="2">
            <Flex direction="column" gap="2">
              <Badge size="3" variant="solid" color={RECOMMENDATION_COLOR[rec]}>
                {RECOMMENDATION_LABEL_RO[rec] ?? rec}
              </Badge>
              <Flex gap="2" wrap="wrap">
                <Badge variant="soft" color="gray">
                  Încredere: {(screen.confidence * 100).toFixed(0)}%
                </Badge>
                {typeof screen.iatrogenicLikelihood === "number" && (
                  <Tooltip content="Probabilitatea ca simptomele să fie atribuibile montelukast/Singulair">
                    <Badge variant="soft" color="orange">
                      Probabilitate iatrogenă: {(screen.iatrogenicLikelihood * 100).toFixed(0)}%
                    </Badge>
                  </Tooltip>
                )}
              </Flex>
            </Flex>
            <Badge variant="soft" color="indigo">
              {formatRo(screen.createdAt)}
            </Badge>
          </Flex>

          <Separator size="4" />

          <Box>
            <Text size="2" weight="bold">Argumentare</Text>
            <Text size="3" as="p" mt="1" style={{ whiteSpace: "pre-wrap" }}>
              {screen.rationale}
            </Text>
          </Box>
        </Flex>
      </Card>

      {win && win.phase && win.phase !== "n/a" && (
        <Card>
          <Flex direction="column" gap="2" p="3">
            <Text size="2" weight="bold">Fereastra de observație post-Singulair</Text>
            <Flex gap="2" wrap="wrap">
              <Badge variant="soft" color="blue">
                Faza: {PHASE_LABEL_RO[win.phase] ?? win.phase}
              </Badge>
              {typeof win.daysSinceStop === "number" && (
                <Badge variant="soft" color="gray">Zile de la oprire: {win.daysSinceStop}</Badge>
              )}
              {typeof win.reassessInDays === "number" && (
                <Badge variant="soft" color="indigo">Reevaluează în: {win.reassessInDays} zile</Badge>
              )}
            </Flex>
          </Flex>
        </Card>
      )}

      {flags.length > 0 && (
        <Card>
          <Flex direction="column" gap="2" p="3">
            <Text size="2" weight="bold" color="red">
              Semnale roșii ({flags.length})
            </Text>
            <Flex direction="column" gap="2">
              {flags.map((f: any, i: number) => (
                <Box key={i}>
                  <Badge color="red" variant="soft" size="1">{f.category}</Badge>{" "}
                  <Text size="2" as="span">
                    {f.labelRo ?? f.category}
                  </Text>
                  {f.evidenceRef && (
                    <Text size="1" color="gray" as="div" mt="1">
                      <em>ref: {f.evidenceRef}</em>
                    </Text>
                  )}
                </Box>
              ))}
            </Flex>
          </Flex>
        </Card>
      )}

      {supportingObs.length > 0 && (
        <Card>
          <Flex direction="column" gap="2" p="3">
            <Text size="2" weight="bold">Observații care susțin recomandarea</Text>
            <Flex direction="column" gap="2">
              {supportingObs.map((o: any, i: number) => (
                <Box key={i}>
                  <Text size="2" as="div">{o.summaryRo}</Text>
                  {o.evidenceRef && (
                    <Text size="1" color="gray" as="div">
                      <em>ref: {o.evidenceRef}</em>
                    </Text>
                  )}
                </Box>
              ))}
            </Flex>
          </Flex>
        </Card>
      )}

      {differential.length > 0 && (
        <Card>
          <Flex direction="column" gap="2" p="3">
            <Text size="2" weight="bold">Diagnostic diferențial (ipoteze, nu diagnostic)</Text>
            <Flex direction="column" gap="3">
              {differential.map((d: any, i: number) => (
                <Box key={i}>
                  <Flex gap="2" align="center" wrap="wrap">
                    <Text size="2" weight="medium">{d.condition}</Text>
                    <Badge variant="soft" color="gray" size="1">
                      {(d.likelihood * 100).toFixed(0)}%
                    </Badge>
                  </Flex>
                  <Text size="2" color="gray" as="p" mt="1">{d.rationaleRo}</Text>
                </Box>
              ))}
            </Flex>
          </Flex>
        </Card>
      )}

      {nextSteps.length > 0 && (
        <Card>
          <Flex direction="column" gap="2" p="3">
            <Text size="2" weight="bold">Pași recomandați</Text>
            <Box asChild>
              <ol style={{ paddingLeft: 20, margin: 0 }}>
                {nextSteps.map((step: string, i: number) => (
                  <li key={i} style={{ marginBottom: 6 }}>
                    <Text size="2">{step}</Text>
                  </li>
                ))}
              </ol>
            </Box>
          </Flex>
        </Card>
      )}

      {citations.length > 0 && (
        <Card>
          <Flex direction="column" gap="2" p="3">
            <Text size="2" weight="bold">Surse</Text>
            <Flex gap="1" wrap="wrap">
              {citations.map((c: any) => {
                const href = citationHref(c);
                const label = `${c.title.length > 70 ? c.title.slice(0, 70) + "…" : c.title}${c.year ? ` (${c.year})` : ""}`;
                const badge = (
                  <Badge size="1" variant="soft" color="indigo">
                    {label}
                  </Badge>
                );
                return href ? (
                  <RadixLink key={c.researchId} href={href} target="_blank" rel="noopener noreferrer" underline="none">
                    {badge}
                  </RadixLink>
                ) : (
                  <span key={c.researchId}>{badge}</span>
                );
              })}
            </Flex>
          </Flex>
        </Card>
      )}
    </>
  );
}

export default function PsychScreenPage() {
  return <PsychScreenContent />;
}
