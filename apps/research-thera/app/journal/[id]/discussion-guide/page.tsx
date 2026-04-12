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
  useGetJournalEntryQuery,
  useGenerateDiscussionGuideMutation,
  useDeleteDiscussionGuideMutation,
} from "@/app/__generated__/hooks";
import { Breadcrumbs } from "@/app/components/Breadcrumbs";

type GuideTab = "context" | "starters" | "talking" | "language" | "reactions" | "followup";

export default function DiscussionGuidePage() {
  const params = useParams();
  const router = useRouter();
  const id = parseInt(params.id as string, 10);

  const [activeTab, setActiveTab] = useState<GuideTab>("context");
  const [message, setMessage] = useState<{ text: string; type: "success" | "error" } | null>(null);

  const { data, loading, refetch } = useGetJournalEntryQuery({
    variables: { id },
    skip: isNaN(id),
  });

  const entry = data?.journalEntry;
  const guide = entry?.discussionGuide ?? null;

  const [generateGuide, { loading: generating }] = useGenerateDiscussionGuideMutation({
    onCompleted: (d) => {
      if (d.generateDiscussionGuide.success) {
        setMessage({ text: d.generateDiscussionGuide.message || "Guide generated.", type: "success" });
        refetch();
      } else {
        setMessage({ text: d.generateDiscussionGuide.message || "Failed.", type: "error" });
      }
    },
    onError: (err) => setMessage({ text: err.message, type: "error" }),
  });

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

  if (!entry) {
    return (
      <Flex direction="column" gap="4" py="4">
        <Button variant="ghost" size="2" onClick={() => router.back()}>
          <ArrowLeftIcon /> Back
        </Button>
        <Card>
          <Box p="4">
            <Text color="red">Journal entry not found.</Text>
          </Box>
        </Card>
      </Flex>
    );
  }

  const familyName = entry.familyMember?.firstName || entry.familyMember?.name;

  return (
    <Flex direction="column" gap="5" py="4">
      <Breadcrumbs
        crumbs={[
          { label: "Journal", href: "/journal" },
          { label: entry.title || `Entry ${id}`, href: `/journal/${id}` },
          { label: "Discussion Guide" },
        ]}
      />

      {/* Header */}
      <Flex justify="between" align="start" wrap="wrap" gap="3">
        <Box>
          <Heading size="6" mb="1">Discussion Guide</Heading>
          <Text size="2" color="gray">
            Research-grounded guide for discussing this with {familyName || "your child"}.
          </Text>
        </Box>
        <Flex gap="2">
          {guide && (
            <Button
              variant="soft"
              color="red"
              size="2"
              onClick={() => deleteGuide({ variables: { journalEntryId: id } })}
              disabled={deleting || generating}
            >
              {deleting ? "Deleting..." : "Delete"}
            </Button>
          )}
          <Button
            size="2"
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
      </Flex>

      {/* Loading bar */}
      {generating && (
        <Card>
          <Flex direction="column" gap="2" p="4">
            <Text size="2" color="gray">Preparing discussion guide...</Text>
            <Box style={{ height: 6, borderRadius: 3, background: "var(--gray-4)", overflow: "hidden" }}>
              <Box style={{ height: "100%", width: "40%", background: "var(--teal-9)", borderRadius: 3, animation: "researchSweep 1.4s ease-in-out infinite" }} />
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
          <Flex direction="column" align="center" gap="3" p="6">
            <Text size="5">&#128172;</Text>
            <Text size="2" color="gray" align="center" style={{ maxWidth: 400 }}>
              No discussion guide yet. Generate one to get research-backed conversation starters,
              talking points, and language guidance tailored to {familyName || "your child"}.
            </Text>
          </Flex>
        </Card>
      )}

      {guide && (
        <>
          {/* Summary card */}
          <Card>
            <Flex direction="column" gap="3" p="4">
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
          <Flex gap="2" wrap="wrap">
            {([
              ["context", "Developmental Context"],
              ["starters", `Conversation Starters (${guide.conversationStarters.length})`],
              ["talking", `Talking Points (${guide.talkingPoints.length})`],
              ["language", "Language Guide"],
              ["reactions", `Anticipated Reactions (${guide.anticipatedReactions.length})`],
              ["followup", `Follow-Up Plan (${guide.followUpPlan.length})`],
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
              <Flex direction="column" gap="4" p="4">
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
                  <Text size="2" weight="bold" mb="1" as="div">What's Age-Typical</Text>
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
            <Flex direction="column" gap="3">
              {guide.conversationStarters.map((starter, i) => (
                <Card key={i} variant="surface">
                  <Flex direction="column" gap="2" p="4">
                    <Text size="3" weight="bold" style={{ fontStyle: "italic" }}>
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
            <Flex direction="column" gap="3">
              {guide.talkingPoints.map((tp, i) => (
                <Card key={i} variant="surface">
                  <Flex direction="column" gap="2" p="4">
                    <Text size="3" weight="bold">{tp.point}</Text>
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
            <Flex direction="column" gap="4">
              <Card>
                <Flex direction="column" gap="3" p="4">
                  <Text size="3" weight="bold" color="green">What To Say</Text>
                  <Flex direction="column" gap="2">
                    {guide.languageGuide.whatToSay.map((item, i) => (
                      <Card key={i} variant="surface">
                        <Flex direction="column" gap="1" p="3">
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
                <Flex direction="column" gap="3" p="4">
                  <Text size="3" weight="bold" color="red">What Not To Say</Text>
                  <Flex direction="column" gap="2">
                    {guide.languageGuide.whatNotToSay.map((item, i) => (
                      <Card key={i} variant="surface">
                        <Flex direction="column" gap="1" p="3">
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
            <Flex direction="column" gap="3">
              {guide.anticipatedReactions.map((reaction, i) => (
                <Card key={i} variant="surface">
                  <Flex direction="column" gap="2" p="4">
                    <Flex justify="between" align="center">
                      <Text size="3" weight="bold">{reaction.reaction}</Text>
                      <Badge
                        variant="soft"
                        size="1"
                        color={reaction.likelihood === "high" ? "red" : reaction.likelihood === "medium" ? "orange" : "green"}
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
            <Flex direction="column" gap="3">
              {guide.followUpPlan.map((step, i) => (
                <Card key={i} variant="surface">
                  <Flex direction="column" gap="2" p="4">
                    <Flex justify="between" align="center">
                      <Text size="3" weight="bold">{step.action}</Text>
                      <Badge variant="soft" color="teal" size="1">{step.timing}</Badge>
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
