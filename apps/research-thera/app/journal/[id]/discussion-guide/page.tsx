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
  Separator,
  Button,
} from "@radix-ui/themes";
import { ArrowLeftIcon } from "@radix-ui/react-icons";
import { useParams, useRouter } from "next/navigation";
import {
  useGetPublicDiscussionGuideQuery,
  useGenerateDiscussionGuideMutation,
  useDeleteDiscussionGuideMutation,
  useGetGenerationJobQuery,
} from "@/app/__generated__/hooks";
import { authClient } from "@/app/lib/auth/client";
import { Breadcrumbs } from "@/app/components/Breadcrumbs";

type GuideTab = "context" | "starters" | "talking" | "language" | "reactions" | "followup";

export default function DiscussionGuidePage() {
  const params = useParams();
  const router = useRouter();
  const id = parseInt(params.id as string, 10);

  const { data: session } = authClient.useSession();
  const isOwner = !!session?.user;

  const [activeTab, setActiveTab] = useState<GuideTab>("context");
  const [message, setMessage] = useState<{ text: string; type: "success" | "error" } | null>(null);
  const [jobId, setJobId] = useState<string | null>(null);

  const { data, loading, refetch } = useGetPublicDiscussionGuideQuery({
    variables: { journalEntryId: id },
    skip: isNaN(id),
  });

  const result = data?.publicDiscussionGuide;
  const guide = result?.guide ?? null;
  const entryTitle = result?.entryTitle;
  const familyName = result?.familyMemberName;

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
          setMessage({ text: "Guide generated.", type: "success" });
          refetch();
        } else {
          setMessage({
            text: d.generationJob?.error?.message ?? "Discussion guide generation failed.",
            type: "error",
          });
        }
        setJobId(null);
      }
    },
  });

  const jobProgress = jobData?.generationJob?.progress ?? 0;

  const [generateGuide, { loading: starting }] = useGenerateDiscussionGuideMutation({
    onCompleted: (d) => {
      if (d.generateDiscussionGuide.success && d.generateDiscussionGuide.jobId) {
        setMessage(null);
        setJobId(d.generateDiscussionGuide.jobId);
      } else {
        setMessage({
          text: d.generateDiscussionGuide.message || "Failed to start generation.",
          type: "error",
        });
      }
    },
    onError: (err) => setMessage({ text: err.message, type: "error" }),
  });

  const generating = starting || Boolean(jobId);

  const [deleteGuide, { loading: deleting }] = useDeleteDiscussionGuideMutation({
    onCompleted: () => {
      setMessage(null);
      refetch();
    },
  });

  if (loading) {
    return (
      <Flex justify="center" py="9">
        <Spinner size="3" />
      </Flex>
    );
  }

  if (!result) {
    return (
      <Flex direction="column" gap="4" py="4">
        <Button variant="ghost" size="2" onClick={() => router.back()}>
          <ArrowLeftIcon /> Back
        </Button>
        <Card>
          <Box p="4">
            <Text color="red">Discussion guide not found.</Text>
          </Box>
        </Card>
      </Flex>
    );
  }

  return (
    <Flex direction="column" gap={{ initial: "3", sm: "5" }} py={{ initial: "2", sm: "4" }}>
      <Breadcrumbs
        crumbs={[
          { label: "Journal", href: "/journal" },
          { label: entryTitle || `Entry ${id}`, href: `/journal/${id}` },
          { label: "Discussion Guide" },
        ]}
      />

      {/* Header */}
      <Flex justify="between" align="start" wrap="wrap" gap="3">
        <Box style={{ flex: "1 1 0", minWidth: 0 }}>
          <Heading size={{ initial: "5", md: "7" }} mb="1">Discussion Guide</Heading>
          <Text size="2" color="gray">
            Research-grounded guide for discussing this with {familyName || "your child"}.
          </Text>
        </Box>
        {isOwner && (
          <Flex gap="2" style={{ flexShrink: 0 }}>
            {guide && (
              <Button
                variant="soft"
                color="red"
                size={{ initial: "1", sm: "2" }}
                onClick={() => deleteGuide({ variables: { journalEntryId: id } })}
                disabled={deleting || generating}
              >
                {deleting ? "Deleting..." : "Delete"}
              </Button>
            )}
            <Button
              size={{ initial: "1", sm: "2" }}
              onClick={() => {
                setMessage(null);
                generateGuide({ variables: { journalEntryId: id } });
              }}
              disabled={generating}
            >
              {generating && <Spinner />}
              {generating ? "Generating..." : guide ? "Regenerate" : "Generate Guide"}
            </Button>
          </Flex>
        )}
      </Flex>

      {/* Loading bar */}
      {generating && (
        <Card>
          <Flex direction="column" gap="2" p="4">
            <Text size="2" color="gray">
              {jobProgress > 0 ? `Preparing discussion guide… ${jobProgress}%` : "Preparing discussion guide…"}
            </Text>
            <Box style={{ height: 6, borderRadius: 3, background: "var(--gray-4)", overflow: "hidden" }}>
              {jobProgress > 0 ? (
                <Box
                  style={{
                    height: "100%",
                    width: `${Math.max(jobProgress, 5)}%`,
                    background: "var(--teal-9)",
                    borderRadius: 3,
                    transition: "width 400ms ease-out",
                  }}
                />
              ) : (
                <Box
                  style={{
                    height: "100%",
                    width: "40%",
                    background: "var(--teal-9)",
                    borderRadius: 3,
                    animation: "researchSweep 1.4s ease-in-out infinite",
                  }}
                />
              )}
            </Box>
          </Flex>
        </Card>
      )}

      {/* Status message */}
      {message && (
        <Text size="2" color={message.type === "success" ? "green" : "red"}>
          {message.text}
        </Text>
      )}

      {/* Empty state */}
      {!guide && !generating && (
        <Card>
          <Flex direction="column" align="center" gap="3" p={{ initial: "4", sm: "6" }}>
            <Text size="5">&#128172;</Text>
            <Text size="2" color="gray" align="center" style={{ maxWidth: 400 }}>
              No discussion guide yet.{isOwner && ` Generate one to get research-backed conversation starters,
              talking points, and language guidance tailored to ${familyName || "your child"}.`}
            </Text>
          </Flex>
        </Card>
      )}

      {guide && (
        <>
          {/* Summary card */}
          <Card>
            <Flex direction="column" gap="3" p={{ initial: "3", sm: "4" }}>
              <Text size="2" style={{ whiteSpace: "pre-wrap", lineHeight: "1.7" }}>
                {guide.behaviorSummary}
              </Text>
              <Flex gap="2" wrap="wrap">
                {guide.childAge && (
                  <Badge variant="outline" color="teal" size="1">Age {guide.childAge}</Badge>
                )}
                <Badge variant="outline" color="gray" size="1">{guide.model}</Badge>
                <Badge variant="outline" color="gray" size="1">
                  {new Date(guide.createdAt).toLocaleDateString()}
                </Badge>
              </Flex>
            </Flex>
          </Card>

          {/* Tabs */}
          <Flex gap="1" wrap="wrap">
            {([
              ["context", "Context"],
              ["starters", `Starters (${guide.conversationStarters.length})`],
              ["talking", `Points (${guide.talkingPoints.length})`],
              ["language", "Language"],
              ["reactions", `Reactions (${guide.anticipatedReactions.length})`],
              ["followup", `Follow-Up (${guide.followUpPlan.length})`],
            ] as const).map(([tab, label]) => (
              <Button
                key={tab}
                variant={activeTab === tab ? "solid" : "soft"}
                color="teal"
                size="1"
                onClick={() => setActiveTab(tab)}
              >
                {label}
              </Button>
            ))}
          </Flex>

          {/* Developmental Context */}
          {activeTab === "context" && (
            <Card>
              <Flex direction="column" gap="4" p={{ initial: "3", sm: "4" }}>
                <Box>
                  <Text size="2" weight="bold" mb="1" as="div">Developmental Stage</Text>
                  <Badge variant="soft" color="teal" size="2">{guide.developmentalContext.stage}</Badge>
                </Box>
                <Separator size="4" />
                <Box>
                  <Text size="2" weight="bold" mb="1" as="div">Why This Happens</Text>
                  <Text size="2" color="gray" style={{ lineHeight: "1.7" }}>
                    {guide.developmentalContext.explanation}
                  </Text>
                </Box>
                <Box>
                  <Text size="2" weight="bold" mb="1" as="div">{"What's Age-Typical"}</Text>
                  <Text size="2" color="gray" style={{ lineHeight: "1.7" }}>
                    {guide.developmentalContext.normalizedBehavior}
                  </Text>
                </Box>
                {guide.developmentalContext.researchBasis && (
                  <Box>
                    <Text size="2" weight="bold" mb="1" as="div">Research Basis</Text>
                    <Text size="2" color="teal" style={{ lineHeight: "1.7" }}>
                      {guide.developmentalContext.researchBasis}
                    </Text>
                  </Box>
                )}
              </Flex>
            </Card>
          )}

          {/* Conversation Starters */}
          {activeTab === "starters" && (
            <Flex direction="column" gap={{ initial: "2", sm: "3" }}>
              {guide.conversationStarters.map((starter, i) => (
                <Card key={i} variant="surface">
                  <Flex direction="column" gap="2" p={{ initial: "3", sm: "4" }}>
                    <Text size={{ initial: "2", sm: "3" }} weight="bold" style={{ fontStyle: "italic" }}>
                      &ldquo;{starter.opener}&rdquo;
                    </Text>
                    <Text size="2" color="gray" style={{ lineHeight: "1.7" }}>
                      {starter.context}
                    </Text>
                    {starter.ageAppropriateNote && (
                      <Text size="1" color="teal" style={{ lineHeight: "1.6" }}>
                        {starter.ageAppropriateNote}
                      </Text>
                    )}
                  </Flex>
                </Card>
              ))}
            </Flex>
          )}

          {/* Talking Points */}
          {activeTab === "talking" && (
            <Flex direction="column" gap={{ initial: "2", sm: "3" }}>
              {guide.talkingPoints.map((tp, i) => (
                <Card key={i} variant="surface">
                  <Flex direction="column" gap="2" p={{ initial: "3", sm: "4" }}>
                    <Text size={{ initial: "2", sm: "3" }} weight="bold">{tp.point}</Text>
                    <Text size="2" color="gray" style={{ lineHeight: "1.7" }}>
                      {tp.explanation}
                    </Text>
                    {tp.researchBacking && (
                      <Text size="1" color="teal" style={{ lineHeight: "1.7" }}>
                        {tp.researchBacking}
                      </Text>
                    )}
                  </Flex>
                </Card>
              ))}
            </Flex>
          )}

          {/* Language Guide */}
          {activeTab === "language" && (
            <Flex direction="column" gap={{ initial: "3", sm: "4" }}>
              <Card>
                <Flex direction="column" gap="3" p={{ initial: "3", sm: "4" }}>
                  <Text size={{ initial: "2", sm: "3" }} weight="bold" color="green">What To Say</Text>
                  <Flex direction="column" gap="2">
                    {guide.languageGuide.whatToSay.map((item, i) => (
                      <Card key={i} variant="surface">
                        <Flex direction="column" gap="1" p={{ initial: "2", sm: "3" }}>
                          <Text size="2" weight="bold" color="green" style={{ fontStyle: "italic" }}>
                            &ldquo;{item.phrase}&rdquo;
                          </Text>
                          <Text size="1" color="gray">{item.reason}</Text>
                        </Flex>
                      </Card>
                    ))}
                  </Flex>
                </Flex>
              </Card>
              <Card>
                <Flex direction="column" gap="3" p={{ initial: "3", sm: "4" }}>
                  <Text size={{ initial: "2", sm: "3" }} weight="bold" color="red">What Not To Say</Text>
                  <Flex direction="column" gap="2">
                    {guide.languageGuide.whatNotToSay.map((item, i) => (
                      <Card key={i} variant="surface">
                        <Flex direction="column" gap="1" p={{ initial: "2", sm: "3" }}>
                          <Text size="2" weight="bold" color="red" style={{ fontStyle: "italic", textDecoration: "line-through" }}>
                            &ldquo;{item.phrase}&rdquo;
                          </Text>
                          <Text size="1" color="gray">{item.reason}</Text>
                          {item.alternative && (
                            <Text size="1" color="green">
                              Instead: &ldquo;{item.alternative}&rdquo;
                            </Text>
                          )}
                        </Flex>
                      </Card>
                    ))}
                  </Flex>
                </Flex>
              </Card>
            </Flex>
          )}

          {/* Anticipated Reactions */}
          {activeTab === "reactions" && (
            <Flex direction="column" gap={{ initial: "2", sm: "3" }}>
              {guide.anticipatedReactions.map((reaction, i) => (
                <Card key={i} variant="surface">
                  <Flex direction="column" gap="2" p={{ initial: "3", sm: "4" }}>
                    <Flex justify="between" align="start" gap="2" wrap="wrap">
                      <Text size={{ initial: "2", sm: "3" }} weight="bold" style={{ flex: "1 1 0", minWidth: 0 }}>{reaction.reaction}</Text>
                      <Badge
                        variant="soft"
                        size="1"
                        color={reaction.likelihood === "high" ? "red" : reaction.likelihood === "medium" ? "orange" : "green"}
                        style={{ flexShrink: 0 }}
                      >
                        {reaction.likelihood}
                      </Badge>
                    </Flex>
                    <Text size="2" color="gray" style={{ lineHeight: "1.7" }}>
                      {reaction.howToRespond}
                    </Text>
                  </Flex>
                </Card>
              ))}
            </Flex>
          )}

          {/* Follow-Up Plan */}
          {activeTab === "followup" && (
            <Flex direction="column" gap={{ initial: "2", sm: "3" }}>
              {guide.followUpPlan.map((step, i) => (
                <Card key={i} variant="surface">
                  <Flex direction="column" gap="2" p={{ initial: "3", sm: "4" }}>
                    <Flex justify="between" align="start" gap="2" wrap="wrap">
                      <Text size={{ initial: "2", sm: "3" }} weight="bold" style={{ flex: "1 1 0", minWidth: 0 }}>{step.action}</Text>
                      <Badge variant="soft" color="teal" size="1" style={{ flexShrink: 0 }}>{step.timing}</Badge>
                    </Flex>
                    <Text size="2" color="gray" style={{ lineHeight: "1.7" }}>
                      {step.description}
                    </Text>
                  </Flex>
                </Card>
              ))}
            </Flex>
          )}
        </>
      )}
    </Flex>
  );
}
