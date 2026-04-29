"use client";

import { useEffect, useMemo } from "react";
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
  Tabs,
} from "@radix-ui/themes";
import { ArrowLeftIcon } from "@radix-ui/react-icons";
import { useParams, useRouter } from "next/navigation";
import NextLink from "next/link";
import ReactMarkdown from "react-markdown";
import {
  useGetFamilyMemberQuery,
  useCalmingPlanQuery,
} from "@/app/__generated__/hooks";

const isBogdan = (firstName?: string | null) =>
  (firstName ?? "").trim().toLowerCase() === "bogdan";

function CalmingPlanDetailContent() {
  const params = useParams();
  const router = useRouter();
  const familySlug = params.id as string;
  const planIdRaw = params.planId as string;
  const planId = parseInt(planIdRaw, 10);

  const isNumeric = /^\d+$/.test(familySlug);
  const familyMemberIdFromRoute = isNumeric ? parseInt(familySlug, 10) : NaN;

  const { data: fmData } = useGetFamilyMemberQuery({
    variables: isNumeric ? { id: familyMemberIdFromRoute } : { slug: familySlug },
  });
  const member = fmData?.familyMember;

  useEffect(() => {
    if (member && !isBogdan(member.firstName)) {
      router.replace(`/family/${member.slug ?? member.id}`);
    }
  }, [member, router]);

  const { data, loading, error } = useCalmingPlanQuery({
    variables: { id: planId },
    skip: isNaN(planId) || !isBogdan(member?.firstName),
    fetchPolicy: "cache-and-network",
  });

  const plan = data?.calmingPlan;
  const planJson = useMemo(() => {
    if (!plan?.planJson) return null;
    try {
      return JSON.parse(plan.planJson);
    } catch {
      return null;
    }
  }, [plan?.planJson]);
  const sources = useMemo(() => {
    if (!plan?.sourcesJson) return [];
    try {
      const arr = JSON.parse(plan.sourcesJson);
      return Array.isArray(arr) ? arr : [];
    } catch {
      return [];
    }
  }, [plan?.sourcesJson]);

  if (loading && !plan) {
    return (
      <Flex p="6" justify="center">
        <Spinner />
      </Flex>
    );
  }

  if (error || !plan) {
    return (
      <Box p="6">
        <Text color="gray">Plan not found.</Text>
      </Box>
    );
  }

  const memberPath = `/family/${member?.slug ?? member?.id ?? ""}`;
  const generatedAt = new Date(plan.generatedAt);
  const bundles = (planJson?.cluster_bundles as any[]) ?? [];
  const tiers = (planJson?.stepped_tiers as any[]) ?? [];
  const headline = planJson?.headline as string | undefined;
  const execSummary = planJson?.executive_summary as string | undefined;

  return (
    <Box p={{ initial: "3", md: "5" }} style={{ maxWidth: 980, margin: "0 auto" }}>
      <Flex direction="column" gap="4">
        <Flex align="center" gap="2">
          <NextLink href={`${memberPath}/calming-plans`}>
            <Button variant="ghost" size="2">
              <ArrowLeftIcon /> All plans
            </Button>
          </NextLink>
        </Flex>

        <Flex direction="column" gap="2">
          <Flex gap="2" align="center" wrap="wrap">
            <Heading size={{ initial: "5", md: "7" }}>
              {headline ?? `Plan #${plan.id}`}
            </Heading>
          </Flex>
          <Flex gap="2" align="center" wrap="wrap">
            <Badge color="indigo">{plan.language}</Badge>
            <Badge color="gray">id {plan.id}</Badge>
            <Badge color="gray">{bundles.length} clusters</Badge>
            <Badge color="gray">{tiers.length} tiers</Badge>
            <Badge color="gray">{sources.length} sources</Badge>
            <Text size="1" color="gray">
              generated {generatedAt.toLocaleString()}
            </Text>
          </Flex>
          {execSummary && (
            <Card>
              <Box p="3">
                <Text size="2">{execSummary}</Text>
              </Box>
            </Card>
          )}
        </Flex>

        <Separator size="4" />

        <Tabs.Root defaultValue="plan">
          <Tabs.List>
            <Tabs.Trigger value="plan">Plan</Tabs.Trigger>
            <Tabs.Trigger value="clusters">
              Clusters ({bundles.length})
            </Tabs.Trigger>
            <Tabs.Trigger value="safety">Safety notes</Tabs.Trigger>
            <Tabs.Trigger value="sources">
              Sources ({sources.length})
            </Tabs.Trigger>
          </Tabs.List>

          <Box pt="4">
            <Tabs.Content value="plan">
              <Card>
                <Box p="4" className="prose prose-invert" style={{ maxWidth: "none" }}>
                  <ReactMarkdown>{plan.planMarkdown}</ReactMarkdown>
                </Box>
              </Card>
            </Tabs.Content>

            <Tabs.Content value="clusters">
              <Flex direction="column" gap="3">
                {bundles.length === 0 && (
                  <Text color="gray">No cluster bundles on this plan.</Text>
                )}
                {bundles.map((b: any, idx: number) => (
                  <Card key={`${b.cluster_name}-${idx}`}>
                    <Flex direction="column" gap="3" p="4">
                      <Flex justify="between" align="center" wrap="wrap" gap="2">
                        <Heading size="4">{b.cluster_name}</Heading>
                        <Badge color="purple">{b.axis}</Badge>
                      </Flex>
                      {b.summary && <Text size="2">{b.summary}</Text>}
                      {b.mechanism_explanation && (
                        <Box>
                          <Text size="2" weight="bold">
                            Mechanism:
                          </Text>{" "}
                          <Text size="2">{b.mechanism_explanation}</Text>
                        </Box>
                      )}
                      {Array.isArray(b.interventions) && b.interventions.length > 0 && (
                        <Box>
                          <Heading size="2" mb="1">
                            Interventions
                          </Heading>
                          <ul style={{ paddingLeft: 18, margin: 0 }}>
                            {b.interventions.map((iv: any, i: number) => (
                              <li key={i} style={{ marginBottom: 8 }}>
                                <Text size="2" weight="bold">
                                  {iv.title}
                                </Text>{" "}
                                <Badge size="1">{iv.type}</Badge>
                                <br />
                                <Text size="2">{iv.specifics}</Text>
                                {iv.why_it_works && (
                                  <>
                                    <br />
                                    <Text size="1" color="gray">
                                      {iv.why_it_works}
                                    </Text>
                                  </>
                                )}
                              </li>
                            ))}
                          </ul>
                        </Box>
                      )}
                      {Array.isArray(b.trigger_response_pairs) &&
                        b.trigger_response_pairs.length > 0 && (
                          <Box>
                            <Heading size="2" mb="1">
                              Trigger → Response
                            </Heading>
                            <ul style={{ paddingLeft: 18, margin: 0 }}>
                              {b.trigger_response_pairs.map((tr: any, i: number) => (
                                <li key={i} style={{ marginBottom: 8 }}>
                                  <Text size="2" weight="bold">
                                    {tr.trigger}
                                  </Text>
                                  <br />
                                  <Text size="2">→ {tr.in_the_moment_response}</Text>
                                  {tr.after_response && (
                                    <>
                                      <br />
                                      <Text size="1" color="gray">
                                        After: {tr.after_response}
                                      </Text>
                                    </>
                                  )}
                                </li>
                              ))}
                            </ul>
                          </Box>
                        )}
                      {b.kpis && (
                        <Box>
                          <Heading size="2" mb="1">
                            KPIs
                          </Heading>
                          <Flex direction="column" gap="1">
                            {b.kpis.week_1 && (
                              <Text size="2">
                                <Badge color="green" size="1">
                                  1 wk
                                </Badge>{" "}
                                {b.kpis.week_1}
                              </Text>
                            )}
                            {b.kpis.week_4 && (
                              <Text size="2">
                                <Badge color="amber" size="1">
                                  4 wk
                                </Badge>{" "}
                                {b.kpis.week_4}
                              </Text>
                            )}
                            {b.kpis.week_12 && (
                              <Text size="2">
                                <Badge color="red" size="1">
                                  12 wk
                                </Badge>{" "}
                                {b.kpis.week_12}
                              </Text>
                            )}
                          </Flex>
                        </Box>
                      )}
                      {Array.isArray(b.escalation_signals) && b.escalation_signals.length > 0 && (
                        <Box>
                          <Heading size="2" mb="1">
                            Escalation signals
                          </Heading>
                          <ul style={{ paddingLeft: 18, margin: 0 }}>
                            {b.escalation_signals.map((s: string, i: number) => (
                              <li key={i}>
                                <Text size="2">{s}</Text>
                              </li>
                            ))}
                          </ul>
                        </Box>
                      )}
                    </Flex>
                  </Card>
                ))}
              </Flex>
            </Tabs.Content>

            <Tabs.Content value="safety">
              <Card>
                <Box p="4">
                  {plan.safetyNotes ? (
                    <Text size="2" style={{ whiteSpace: "pre-wrap" }}>
                      {plan.safetyNotes}
                    </Text>
                  ) : (
                    <Text color="gray">No safety notes recorded.</Text>
                  )}
                </Box>
              </Card>
            </Tabs.Content>

            <Tabs.Content value="sources">
              <Flex direction="column" gap="2">
                {sources.length === 0 && <Text color="gray">No sources cited.</Text>}
                {sources.map((s: any) => (
                  <Card key={`${s.index}-${s.title}`}>
                    <Box p="3">
                      <Flex direction="column" gap="1">
                        <Text size="2" weight="bold">
                          [{s.index}] {s.title}
                        </Text>
                        {s.authors && Array.isArray(s.authors) && s.authors.length > 0 && (
                          <Text size="1" color="gray">
                            {s.authors.slice(0, 5).join(", ")}
                            {s.year ? ` (${s.year})` : ""}
                          </Text>
                        )}
                        {s.doi && (
                          <Text size="1" color="gray">
                            DOI:{" "}
                            <a
                              href={`https://doi.org/${s.doi}`}
                              target="_blank"
                              rel="noreferrer"
                            >
                              {s.doi}
                            </a>
                          </Text>
                        )}
                      </Flex>
                    </Box>
                  </Card>
                ))}
              </Flex>
            </Tabs.Content>
          </Box>
        </Tabs.Root>
      </Flex>
    </Box>
  );
}

export default function CalmingPlanDetailPage() {
  return <CalmingPlanDetailContent />;
}
