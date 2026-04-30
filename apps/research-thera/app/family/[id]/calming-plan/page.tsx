"use client";

import { useEffect, useMemo, useState } from "react";
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
  Callout,
} from "@radix-ui/themes";
import {
  ArrowLeftIcon,
  MagicWandIcon,
  ExclamationTriangleIcon,
} from "@radix-ui/react-icons";
import { useParams, useRouter } from "next/navigation";
import NextLink from "next/link";
import ReactMarkdown from "react-markdown";
import {
  useGetFamilyMemberQuery,
  useCalmingPlansQuery,
  useGenerateCalmingPlanMutation,
} from "@/app/__generated__/hooks";

const isBogdan = (firstName?: string | null) =>
  (firstName ?? "").trim().toLowerCase() === "bogdan";

function PlantPlanContent() {
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

  // Bogdan-only — redirect away if anyone navigates manually.
  useEffect(() => {
    if (member && !isBogdan(member.firstName)) {
      router.replace(`/family/${member.slug ?? member.id}`);
    }
  }, [member, router]);

  const {
    data: plansData,
    loading: plansLoading,
    refetch,
  } = useCalmingPlansQuery({
    variables: { familyMemberId },
    skip: isNaN(familyMemberId) || !isBogdan(member?.firstName),
    fetchPolicy: "cache-and-network",
  });

  const [generate, { loading: generating }] = useGenerateCalmingPlanMutation();
  const [genError, setGenError] = useState<string | null>(null);

  const plans = plansData?.calmingPlans ?? [];
  const plan = plans[0] ?? null;
  const earlier = plans.slice(1);

  const planJson = useMemo(() => {
    // The list query returns plan_markdown but not plan_json — to keep this
    // page on a single query we'd need to widen CalmingPlans.graphql. For now
    // we render the markdown view inline; clusters/safety/sources tabs will
    // appear once we extend the query (next pass).
    return null;
  }, []);
  const sources: any[] = useMemo(() => [], []);

  const onGenerate = async () => {
    setGenError(null);
    try {
      const res = await generate({
        variables: { familyMemberId, language: "ro" },
      });
      const r = res.data?.generateCalmingPlan;
      if (!r?.success) {
        setGenError(r?.message ?? "Generation failed");
        return;
      }
      await refetch();
    } catch (e: any) {
      setGenError(e.message ?? String(e));
    }
  };

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

  if (!isBogdan(member.firstName)) {
    return null;
  }

  const memberPath = `/family/${member.slug ?? member.id}`;
  const generatedAt = plan ? new Date(plan.generatedAt) : null;
  const headline = plan ? extractHeadline(plan.planMarkdown) : null;

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
              Plant Plan — {member.firstName}
            </Heading>
            <Text size="2" color="gray">
              A single living plant-based plan. Each generation merges prior
              insights with {member.firstName}'s current issues, characteristics,
              and allergies — biased toward botanical interventions.
            </Text>
          </Flex>
          <Button onClick={onGenerate} disabled={generating} size="3">
            {generating ? <Spinner /> : <MagicWandIcon />}
            {plan ? "Refine plan" : "Generate first plan"}
          </Button>
        </Flex>

        {genError && (
          <Callout.Root color="red">
            <Callout.Icon>
              <ExclamationTriangleIcon />
            </Callout.Icon>
            <Callout.Text>{genError}</Callout.Text>
          </Callout.Root>
        )}

        {generating && (
          <Callout.Root color="blue">
            <Callout.Icon>
              <Spinner />
            </Callout.Icon>
            <Callout.Text>
              Running 7-node graph (analyze → search research → 3 parallel
              cluster bundles → synthesize → safety → persist). Typical 2–3
              minutes.
            </Callout.Text>
          </Callout.Root>
        )}

        {plansLoading && !plan ? (
          <Flex p="6" justify="center">
            <Spinner />
          </Flex>
        ) : !plan ? (
          <Card>
            <Flex direction="column" gap="2" p="4">
              <Text>No plant plan yet for {member.firstName}.</Text>
              <Text size="2" color="gray">
                Click <em>Generate first plan</em> above to run the deep graph
                against {member.firstName}'s current issue + allergy profile.
              </Text>
            </Flex>
          </Card>
        ) : (
          <>
            <Flex direction="column" gap="2">
              <Flex gap="2" align="center" wrap="wrap">
                <Heading size={{ initial: "4", md: "5" }}>
                  {headline ?? `Plan #${plan.id}`}
                </Heading>
              </Flex>
              <Flex gap="2" align="center" wrap="wrap">
                <Badge color="indigo">{plan.language}</Badge>
                <Badge color="gray">id {plan.id}</Badge>
                {generatedAt && !isNaN(generatedAt.getTime()) && (
                  <Text size="1" color="gray">
                    refreshed {generatedAt.toLocaleString()}
                  </Text>
                )}
              </Flex>
            </Flex>

            <Separator size="4" />

            <Tabs.Root defaultValue="plan">
              <Tabs.List>
                <Tabs.Trigger value="plan">Plan</Tabs.Trigger>
                <Tabs.Trigger value="safety">Safety notes</Tabs.Trigger>
              </Tabs.List>

              <Box pt="4">
                <Tabs.Content value="plan">
                  <Card>
                    <Box
                      p="4"
                      className="prose prose-invert"
                      style={{ maxWidth: "none" }}
                    >
                      <ReactMarkdown>{plan.planMarkdown}</ReactMarkdown>
                    </Box>
                  </Card>
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
              </Box>
            </Tabs.Root>

            {earlier.length > 0 && (
              <Box mt="4">
                <details>
                  <summary
                    style={{
                      cursor: "pointer",
                      color: "var(--gray-11)",
                      fontSize: 13,
                    }}
                  >
                    Earlier versions ({earlier.length})
                  </summary>
                  <Flex direction="column" gap="2" pt="3">
                    {earlier.map((p) => {
                      const dt = new Date(p.generatedAt);
                      return (
                        <Card key={p.id}>
                          <Flex
                            justify="between"
                            align="center"
                            wrap="wrap"
                            gap="2"
                            p="3"
                          >
                            <Flex direction="column">
                              <Text size="2">
                                {extractHeadline(p.planMarkdown) ?? `Plan #${p.id}`}
                              </Text>
                              <Text size="1" color="gray">
                                id {p.id} ·{" "}
                                {!isNaN(dt.getTime())
                                  ? dt.toLocaleString()
                                  : "—"}
                              </Text>
                            </Flex>
                            <Badge color="gray">{p.language}</Badge>
                          </Flex>
                        </Card>
                      );
                    })}
                  </Flex>
                </details>
              </Box>
            )}
          </>
        )}
      </Flex>
    </Box>
  );
}

function extractHeadline(md: string): string | null {
  const m = md.match(/^#\s+(.+)$/m);
  return m ? m[1].trim() : null;
}

export default function PlantPlanPage() {
  return <PlantPlanContent />;
}
