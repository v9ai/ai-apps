"use client";

import { useState } from "react";
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
  Tooltip,
  Link as RadixLink,
} from "@radix-ui/themes";
import { format } from "date-fns";
import { ro } from "date-fns/locale";
import {
  useGenerateBogdanDiscussionMutation,
  useLatestBogdanDiscussionQuery,
  useBogdanDiscussionsQuery,
  useGetGenerationJobQuery,
} from "@/app/__generated__/hooks";
import { AuthGate } from "../components/AuthGate";
import { BogdanJobsSection } from "./_components/BogdanJobsSection";

function formatRo(dateStr: string): string {
  return format(new Date(dateStr), "d MMM yyyy, HH:mm", { locale: ro });
}

type Citation = {
  researchId: number;
  doi?: string | null;
  title: string;
  year?: number | null;
  authors?: string | null;
  url?: string | null;
};

function citationHref(c: Citation): string | undefined {
  if (c.url) return c.url;
  if (c.doi) return `https://doi.org/${c.doi}`;
  return undefined;
}

function CitationsRow({ citations }: { citations: Citation[] }) {
  if (!citations.length) return null;
  return (
    <Box mt="2">
      <Text size="1" color="gray" weight="medium" as="div" mb="1">
        Surse
      </Text>
      <Flex gap="1" wrap="wrap">
        {citations.map((c) => {
          const href = citationHref(c);
          const label = `${c.title.length > 60 ? c.title.slice(0, 60) + "…" : c.title}${c.year ? ` (${c.year})` : ""}`;
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
    </Box>
  );
}

type CritiqueScores = {
  romanianFluency: number;
  actionability: number;
  citationCoverage: number;
  ageAppropriateness: number;
  internalConsistency: number;
  microScriptDepth: number;
};

type MicroScript = {
  parentOpener: string;
  childResponse: string;
  parentFollowUp: string;
};

type Critique = {
  scores: CritiqueScores;
  weakSections: string[];
  refined: boolean;
};

function averageScore(s: CritiqueScores): number {
  const vals = [
    s.romanianFluency,
    s.actionability,
    s.citationCoverage,
    s.ageAppropriateness,
    s.internalConsistency,
    s.microScriptDepth,
  ].filter((v) => typeof v === "number" && !Number.isNaN(v));
  if (!vals.length) return 0;
  const sum = vals.reduce((a, b) => a + b, 0);
  return sum / vals.length;
}

function qualityColor(avg: number): "green" | "amber" | "red" {
  if (avg >= 8) return "green";
  if (avg >= 6) return "amber";
  return "red";
}

const SCORE_LABELS_RO: Record<keyof CritiqueScores, string> = {
  romanianFluency: "Fluență română",
  actionability: "Aplicabilitate",
  citationCoverage: "Acoperire surse",
  ageAppropriateness: "Adecvare vârstă",
  internalConsistency: "Coerență internă",
  microScriptDepth: "Adâncime mini-dialog",
};

function QualityBadge({ critique }: { critique: Critique }) {
  const avg = averageScore(critique.scores);
  const color = qualityColor(avg);
  const scoreKeys = Object.keys(SCORE_LABELS_RO) as Array<keyof CritiqueScores>;
  const tooltip = scoreKeys
    .map((k) => `${SCORE_LABELS_RO[k]}: ${critique.scores[k]}/10`)
    .concat(critique.refined ? ["Rafinat după critică: da"] : [])
    .join("\n");
  return (
    <Tooltip content={tooltip}>
      <Badge size="2" variant="soft" color={color}>
        Calitate: {avg.toFixed(1)}/10
        {critique.refined ? " ✨" : ""}
      </Badge>
    </Tooltip>
  );
}

export default function DiscussionsPage() {
  return (
    <AuthGate
      pageName="Discuții"
      description="Discuțiile sunt private. Conectează-te pentru a participa."
      signInHeading="Conectează-te pentru a accesa Discuțiile"
      signInLabel="Conectează-te"
      createAccountLabel="Creează cont"
    >
      <BogdanDiscussion />
    </AuthGate>
  );
}

function BogdanDiscussion() {
  const [jobId, setJobId] = useState<string | null>(null);
  const [message, setMessage] = useState<{ text: string; type: "success" | "error" } | null>(null);

  const { data: latestData, loading: latestLoading, refetch: refetchLatest } =
    useLatestBogdanDiscussionQuery({ fetchPolicy: "cache-and-network" });
  const { data: historyData, refetch: refetchHistory } = useBogdanDiscussionsQuery({
    fetchPolicy: "cache-and-network",
  });

  const { data: jobData, stopPolling } = useGetGenerationJobQuery({
    variables: { id: jobId! },
    skip: !jobId,
    pollInterval: 2000,
    notifyOnNetworkStatusChange: true,
    fetchPolicy: "network-only",
    onCompleted: (d) => {
      const status = d.generationJob?.status;
      if (status === "SUCCEEDED" || status === "FAILED") {
        stopPolling();
        if (status === "SUCCEEDED") {
          setMessage({ text: "Ghidul de discuție a fost generat.", type: "success" });
          refetchLatest();
          refetchHistory();
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

  const [generate, { loading: starting }] = useGenerateBogdanDiscussionMutation({
    onCompleted: (d) => {
      if (d.generateBogdanDiscussion.success && d.generateBogdanDiscussion.jobId) {
        setMessage(null);
        setJobId(d.generateBogdanDiscussion.jobId);
      } else {
        setMessage({
          text: d.generateBogdanDiscussion.message || "Nu am putut porni generarea.",
          type: "error",
        });
      }
    },
    onError: (err) => setMessage({ text: err.message, type: "error" }),
  });

  const generating = starting || Boolean(jobId);
  const guide = latestData?.latestBogdanDiscussion;
  const history = historyData?.bogdanDiscussions ?? [];

  return (
    <Flex direction="column" gap="5">
      <Flex direction="column" gap="1">
        <Heading size={{ initial: "6", md: "8" }}>Discuții cu Bogdan</Heading>
        <Text size="3" color="gray">
          Generează un ghid de discuție personalizat, bazat pe contextul lui Bogdan
          (obiective active, comportamente recente, feedback de la profesori și contacte).
        </Text>
      </Flex>

      <Card>
        <Flex direction="column" gap="3" p="2">
          <Flex justify="between" align="center" wrap="wrap" gap="3">
            <Box>
              <Text size="2" weight="medium">
                Generare nouă
              </Text>
              <Text size="1" color="gray" as="div">
                Folosește contextul cel mai recent. Durează ~30–60 secunde.
              </Text>
            </Box>
            <Button onClick={() => generate()} disabled={generating} size="3">
              {generating ? (
                <>
                  <Spinner size="2" /> Se generează… {jobProgress}%
                </>
              ) : (
                "Generează ghid de discuție pentru Bogdan"
              )}
            </Button>
          </Flex>
          {message && (
            <Text size="2" color={message.type === "error" ? "red" : "green"}>
              {message.text}
            </Text>
          )}
        </Flex>
      </Card>

      <BogdanJobsSection />

      {latestLoading && !guide && (
        <Flex justify="center" p="6">
          <Spinner size="3" />
        </Flex>
      )}

      {guide && (
        <Card>
          <Flex direction="column" gap="4" p="2">
            <Flex justify="between" align="start" wrap="wrap" gap="2">
              <Heading size="5">Ghid curent</Heading>
              <Flex gap="2" align="center" wrap="wrap">
                {guide.critique && <QualityBadge critique={guide.critique as Critique} />}
                <Badge variant="soft" color="indigo">
                  {formatRo(guide.createdAt)}
                </Badge>
              </Flex>
            </Flex>

            <Box>
              <Text size="2" weight="bold">
                Rezumat comportament
              </Text>
              <Text size="3" as="p" mt="1">
                {guide.behaviorSummary}
              </Text>
            </Box>

            <Separator size="4" />

            <Section title="Context dezvoltare">
              <Text size="2" weight="medium">
                {guide.developmentalContext.stage}
              </Text>
              <Text size="2" as="p" mt="1">
                {guide.developmentalContext.explanation}
              </Text>
              <Text size="2" color="gray" as="p" mt="2">
                {guide.developmentalContext.normalizedBehavior}
              </Text>
              {guide.developmentalContext.researchBasis && (
                <Text size="1" color="gray" as="p" mt="2">
                  <em>{guide.developmentalContext.researchBasis}</em>
                </Text>
              )}
            </Section>

            <Section title="Cum începi conversația">
              <Flex direction="column" gap="3">
                {guide.conversationStarters.map((s, i) => (
                  <Box key={i}>
                    <Text size="2" weight="medium" as="div">
                      "{s.opener}"
                    </Text>
                    <Text size="1" color="gray" as="div" mt="1">
                      {s.context}
                    </Text>
                    {s.ageAppropriateNote && (
                      <Text size="1" color="gray" as="div" mt="1">
                        <em>{s.ageAppropriateNote}</em>
                      </Text>
                    )}
                  </Box>
                ))}
              </Flex>
            </Section>

            <Section title="Puncte de discuție">
              <Flex direction="column" gap="3">
                {guide.talkingPoints.map((t, i) => (
                  <Box key={i}>
                    <Text size="2" weight="medium" as="div">
                      {t.point}
                    </Text>
                    <Text size="2" as="div" mt="1">
                      {t.explanation}
                    </Text>
                    {t.researchBacking && (
                      <Text size="1" color="gray" as="div" mt="1">
                        <em>{t.researchBacking}</em>
                      </Text>
                    )}
                    <CitationsRow citations={(t.citations ?? []) as Citation[]} />
                    {t.microScript && (
                      <Box
                        mt="3"
                        p="3"
                        role="group"
                        aria-label="Mini-dialog părinte și Bogdan"
                        style={{ background: "var(--gray-2)", borderRadius: 6 }}
                      >
                        <Text size="1" color="gray" weight="medium" as="div" mb="2">
                          Mini-dialog
                        </Text>
                        <Flex direction="column" gap="2">
                          <Box role="group" aria-label="Părinte spune">
                            <Badge size="1" color="indigo" variant="soft">
                              Părinte
                            </Badge>
                            <Text size="2" as="div" mt="1">
                              "{t.microScript.parentOpener}"
                            </Text>
                          </Box>
                          <Box role="group" aria-label="Bogdan răspunde">
                            <Badge size="1" color="amber" variant="soft">
                              Bogdan
                            </Badge>
                            <Text size="2" as="div" mt="1" style={{ color: "var(--gray-11)" }}>
                              "{t.microScript.childResponse}"
                            </Text>
                          </Box>
                          <Box role="group" aria-label="Părinte continuă">
                            <Badge size="1" color="indigo" variant="soft">
                              Părinte
                            </Badge>
                            <Text size="2" as="div" mt="1">
                              "{t.microScript.parentFollowUp}"
                            </Text>
                          </Box>
                        </Flex>
                      </Box>
                    )}
                  </Box>
                ))}
              </Flex>
            </Section>

            <Section title="Limbaj — ce să spui">
              <Flex direction="column" gap="2">
                {guide.languageGuide.whatToSay.map((p, i) => (
                  <Box key={i}>
                    <Text size="2" weight="medium" as="div" color="green">
                      "{p.phrase}"
                    </Text>
                    <Text size="1" color="gray" as="div">
                      {p.reason}
                    </Text>
                  </Box>
                ))}
              </Flex>
            </Section>

            <Section title="Limbaj — ce să eviți">
              <Flex direction="column" gap="2">
                {guide.languageGuide.whatNotToSay.map((p, i) => (
                  <Box key={i}>
                    <Text size="2" weight="medium" as="div" color="red">
                      "{p.phrase}"
                    </Text>
                    <Text size="1" color="gray" as="div">
                      {p.reason}
                    </Text>
                    {p.alternative && (
                      <Text size="1" as="div" mt="1">
                        În loc: <strong>"{p.alternative}"</strong>
                      </Text>
                    )}
                  </Box>
                ))}
              </Flex>
            </Section>

            <Section title="Reacții anticipate">
              <Flex direction="column" gap="3">
                {guide.anticipatedReactions.map((r, i) => (
                  <Box key={i}>
                    <Flex gap="2" align="center">
                      <Text size="2" weight="medium">
                        {r.reaction}
                      </Text>
                      <Badge size="1" variant="soft">
                        {r.likelihood}
                      </Badge>
                    </Flex>
                    <Text size="2" color="gray" as="div" mt="1">
                      Răspuns: {r.howToRespond}
                    </Text>
                  </Box>
                ))}
              </Flex>
            </Section>

            <Section title="Plan de continuare">
              <Flex direction="column" gap="3">
                {guide.followUpPlan.map((f, i) => (
                  <Box key={i}>
                    <Flex gap="2" align="center">
                      <Text size="2" weight="medium">
                        {f.action}
                      </Text>
                      <Badge size="1" variant="soft" color="indigo">
                        {f.timing}
                      </Badge>
                    </Flex>
                    <Text size="2" color="gray" as="div" mt="1">
                      {f.description}
                    </Text>
                  </Box>
                ))}
              </Flex>
            </Section>
          </Flex>
        </Card>
      )}

      {!guide && !latestLoading && !generating && (
        <Card>
          <Flex direction="column" align="center" p="6" gap="2">
            <Text size="3" weight="bold">
              Niciun ghid generat încă
            </Text>
            <Text size="2" color="gray">
              Apasă butonul de mai sus pentru a crea primul ghid.
            </Text>
          </Flex>
        </Card>
      )}

      {history.length > 1 && (
        <Card>
          <Flex direction="column" gap="2" p="2">
            <Heading size="3">Istoric ({history.length})</Heading>
            <Flex direction="column" gap="2">
              {history.slice(1).map((h) => (
                <Box key={h.id}>
                  <Text size="2" weight="medium" as="div">
                    {h.behaviorSummary.slice(0, 120)}
                    {h.behaviorSummary.length > 120 && "…"}
                  </Text>
                  <Text size="1" color="gray">
                    {formatRo(h.createdAt)}
                  </Text>
                </Box>
              ))}
            </Flex>
          </Flex>
        </Card>
      )}
    </Flex>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Box>
      <Heading size="3" mb="2">
        {title}
      </Heading>
      {children}
    </Box>
  );
}
