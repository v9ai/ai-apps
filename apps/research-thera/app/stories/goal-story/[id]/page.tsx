"use client";

import {
  Box,
  Button,
  Flex,
  Heading,
  Text,
  Card,
  Badge,
  Spinner,
  Separator,
} from "@radix-ui/themes";
import { AudioPlayer } from "@/app/components/AudioPlayer";
import { Breadcrumbs } from "@/app/components/Breadcrumbs";
import { ArrowLeftIcon } from "@radix-ui/react-icons";
import { useParams } from "next/navigation";
import NextLink from "next/link";
import dynamic from "next/dynamic";
import { useGetGoalStoryQuery } from "@/app/__generated__/hooks";

function GoalStoryPageContent() {
  const params = useParams();
  const goalStoryId = parseInt(params.id as string);

  const { data, loading, error, refetch } = useGetGoalStoryQuery({
    variables: { id: goalStoryId },
    skip: !goalStoryId,
  });

  const story = data?.goalStory;

  if (loading) {
    return (
      <Flex justify="center" align="center" style={{ minHeight: "200px" }}>
        <Spinner size="3" />
      </Flex>
    );
  }

  if (error || !story) {
    return (
      <Card>
        <Text color="red">
          {error ? `Error: ${error.message}` : "Story not found"}
        </Text>
      </Card>
    );
  }

  return (
    <Flex direction="column" gap="4">
      <Breadcrumbs
        crumbs={[
          { label: "Goals", href: "/goals" },
          {
            label: "Goal",
            href: `/goals/${story.goalId}`,
          },
          { label: "Generated Story" },
        ]}
      />

      {/* Story Card */}
      <Card>
        <Flex direction="column" gap="4" p="4">
          <Flex justify="between" align="start" gap="3">
            <Flex align="center" gap="2">
              <Badge color="violet" size="1">
                {story.language}
              </Badge>
              <Badge variant="soft" size="1">
                {story.minutes} min
              </Badge>
            </Flex>
            <Flex gap="4" wrap="wrap">
              <Flex direction="column" gap="1">
                <Text size="1" color="gray" weight="medium">
                  Created
                </Text>
                <Text size="2">
                  {new Date(story.createdAt).toLocaleDateString()}
                </Text>
              </Flex>
              {story.updatedAt !== story.createdAt && (
                <Flex direction="column" gap="1">
                  <Text size="1" color="gray" weight="medium">
                    Last Updated
                  </Text>
                  <Text size="2">
                    {new Date(story.updatedAt).toLocaleDateString()}
                  </Text>
                </Flex>
              )}
            </Flex>
          </Flex>

          {/* Audio Player */}
          <AudioPlayer
            goalStoryId={story.id}
            goalId={story.goalId}
            storyContent={story.text}
            existingAudioUrl={story.audioUrl}
            audioGeneratedAt={story.audioGeneratedAt}
            onAudioGenerated={refetch}
          />

          {/* Story Text */}
          <Text size="3" style={{ whiteSpace: "pre-wrap" }}>
            {story.text}
          </Text>
        </Flex>
      </Card>
    </Flex>
  );
}

const DynamicGoalStoryPageContent = dynamic(
  () => Promise.resolve(GoalStoryPageContent),
  { ssr: false },
);

export default function GoalStoryPage() {
  const params = useParams();
  const goalStoryId = parseInt(params.id as string);

  const { data } = useGetGoalStoryQuery({
    variables: { id: goalStoryId },
    skip: !goalStoryId,
  });

  const story = data?.goalStory;

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
          marginLeft: "calc(-1 * var(--space-5))",
          marginRight: "calc(-1 * var(--space-5))",
          paddingLeft: "var(--space-5)",
          paddingRight: "var(--space-5)",
        }}
      >
        <Flex
          py="4"
          align="center"
          gap="4"
          style={{ maxWidth: "1200px", margin: "0 auto", width: "100%" }}
        >
          <Button variant="soft" size="2" radius="full" color="gray" asChild>
            <NextLink
              href={
                story?.goalId
                  ? `/goals/${story.goalId}`
                  : "/goals"
              }
            >
              <ArrowLeftIcon />
              Back to Goal
            </NextLink>
          </Button>

          <Separator orientation="vertical" style={{ height: 20 }} />

          <Box minWidth="0" style={{ flex: 1 }}>
            <Heading size="8" weight="bold" truncate>
              Generated Story
            </Heading>
          </Box>
        </Flex>
      </Box>

      <Box style={{ maxWidth: "1200px", margin: "0 auto", width: "100%" }}>
        <DynamicGoalStoryPageContent />
      </Box>
    </Flex>
  );
}
