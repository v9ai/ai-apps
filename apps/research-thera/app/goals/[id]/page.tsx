"use client";

import {
  Box,
  Flex,
  Heading,
  Separator,
  Spinner,
  Text,
  Card,
  Badge,
  Button,
} from "@radix-ui/themes";
import { ArrowLeftIcon } from "@radix-ui/react-icons";
import { useParams } from "next/navigation";
import NextLink from "next/link";
import dynamic from "next/dynamic";
import { Breadcrumbs } from "@/app/components/Breadcrumbs";
import { useGetGoalQuery } from "@/app/__generated__/hooks";

import GoalMainCard from "./_components/GoalMainCard";
import SubGoalsList from "./_components/SubGoalsList";
import NotesSection from "./_components/NotesSection";
import StoriesSection from "./_components/StoriesSection";
import ResearchSection from "./_components/ResearchSection";
import QuestionsSection from "./_components/QuestionsSection";
import RelatedIssuesSection from "./_components/RelatedIssuesSection";
import JournalEntriesSection from "./_components/JournalEntriesSection";
import ParentAdviceSection from "./_components/ParentAdviceSection";

function getStatusColor(status: string) {
  switch (status.toLowerCase()) {
    case "active": return "green" as const;
    case "completed": return "blue" as const;
    case "paused": return "orange" as const;
    case "archived": return "gray" as const;
    default: return "gray" as const;
  }
}

function GoalPageContent() {
  const params = useParams();
  const paramValue = params.id as string;

  const isNumericId = /^\d+$/.test(paramValue);
  const goalId = isNumericId ? parseInt(paramValue) : undefined;
  const goalSlug = !isNumericId ? paramValue : undefined;

  const { data, loading, error } = useGetGoalQuery({
    variables: { id: goalId, slug: goalSlug },
    skip: !goalId && !goalSlug,
  });

  const goal = data?.goal;

  if (loading) {
    return (
      <Flex justify="center" align="center" style={{ minHeight: "200px" }}>
        <Spinner size="3" />
      </Flex>
    );
  }

  if (error || !goal) {
    return (
      <Card>
        <Text color="red">
          {error ? `Error: ${error.message}` : "Goal not found"}
        </Text>
      </Card>
    );
  }

  const parentHref = goal.parentGoal
    ? goal.parentGoal.slug
      ? `/goals/${goal.parentGoal.slug}`
      : `/goals/${goal.parentGoal.id}`
    : "/goals";

  return (
    <Flex direction="column" gap="4">
      <Breadcrumbs
        crumbs={
          goal.parentGoal
            ? [
                { label: "Goals", href: "/goals" },
                { label: goal.parentGoal.title, href: parentHref },
                { label: goal.title },
              ]
            : [{ label: "Goals", href: "/goals" }, { label: goal.title }]
        }
      />

      {/* Parent Goal Link */}
      {goal.parentGoal && (
        <Card
          style={{
            backgroundColor: "var(--amber-3)",
            border: "1px solid var(--amber-6)",
          }}
          asChild
        >
          <NextLink href={parentHref} style={{ textDecoration: "none" }}>
            <Flex align="center" gap="3" p="1">
              <ArrowLeftIcon width="16" height="16" />
              <Flex direction="column" gap="0">
                <Text size="1" color="gray" weight="medium">
                  Parent Goal
                </Text>
                <Flex align="center" gap="2">
                  <Text size="3" weight="bold">
                    {goal.parentGoal.title}
                  </Text>
                  <Badge
                    color={getStatusColor(goal.parentGoal.status)}
                    size="1"
                  >
                    {goal.parentGoal.status}
                  </Badge>
                </Flex>
              </Flex>
            </Flex>
          </NextLink>
        </Card>
      )}

      <GoalMainCard goal={goal} />
      <SubGoalsList goal={goal} />

      {/* Therapeutic Guidance */}
      {goal.therapeuticText && (
        <Card>
          <Flex direction="column" gap="3" p="4">
            <Flex align="center" gap="2">
              <Heading size="4">Therapeutic Guidance</Heading>
              {goal.therapeuticTextLanguage && (
                <Badge variant="soft" size="1">
                  {goal.therapeuticTextLanguage}
                </Badge>
              )}
            </Flex>
            <Text style={{ whiteSpace: "pre-wrap" }}>
              {goal.therapeuticText}
            </Text>
            {goal.therapeuticTextGeneratedAt && (
              <Text size="1" color="gray">
                Generated{" "}
                {new Date(goal.therapeuticTextGeneratedAt).toLocaleDateString()}
              </Text>
            )}
          </Flex>
        </Card>
      )}

      <ParentAdviceSection goal={goal} />

      <NotesSection goalId={goal.id} />
      <StoriesSection goal={goal} />
      <ResearchSection goal={goal} />
      <QuestionsSection
        goalId={goal.id}
        hasResearch={!!goal.research && goal.research.length > 0}
      />

      {goal.familyMember && (
        <RelatedIssuesSection
          familyMemberId={goal.familyMember.id}
          familyMemberSlug={goal.familyMember.slug}
        />
      )}
      <JournalEntriesSection goalId={goal.id} />
    </Flex>
  );
}

const DynamicGoalPageContent = dynamic(() => Promise.resolve(GoalPageContent), {
  ssr: false,
});

export default function GoalPage() {
  const params = useParams();
  const goalId = parseInt(params.id as string);

  const { data } = useGetGoalQuery({
    variables: { id: goalId },
    skip: !goalId,
  });

  const goal = data?.goal;
  const backHref = goal?.parentGoal
    ? goal.parentGoal.slug
      ? `/goals/${goal.parentGoal.slug}`
      : `/goals/${goal.parentGoal.id}`
    : "/goals";
  const backLabel = goal?.parentGoal ? goal.parentGoal.title : "Goals";

  return (
    <Flex direction="column" gap="5">
      {/* Sticky Header */}
      <Box
        position="sticky"
        top="0"
        style={{
          zIndex: 20,
          background: "var(--color-panel)",
          borderBottom: "1px solid var(--gray-a6)",
          backdropFilter: "blur(10px)",
          marginLeft: "calc(-1 * var(--space-3))",
          marginRight: "calc(-1 * var(--space-3))",
          paddingLeft: "var(--space-3)",
          paddingRight: "var(--space-3)",
        }}
      >
        <Flex
          py="3"
          align="center"
          gap={{ initial: "2", md: "4" }}
          style={{ maxWidth: "1200px", margin: "0 auto", width: "100%" }}
        >
          <Button variant="soft" size="2" radius="full" color="gray" asChild>
            <NextLink href={backHref}>
              <ArrowLeftIcon />
              <Box display={{ initial: "none", sm: "inline" }} asChild>
                <span>{backLabel}</span>
              </Box>
            </NextLink>
          </Button>

          <Box display={{ initial: "none", sm: "block" }}>
            <Separator orientation="vertical" style={{ height: 20 }} />
          </Box>

          <Box minWidth="0" style={{ flex: 1 }}>
            <Heading size={{ initial: "5", md: "8" }} weight="bold" truncate>
              {goal?.title || "Loading goal\u2026"}
            </Heading>
          </Box>
        </Flex>
      </Box>

      <Box style={{ width: "100%" }}>
        <DynamicGoalPageContent />
      </Box>
    </Flex>
  );
}
