"use client";

import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Box,
  Button,
  Flex,
  Heading,
  Text,
  Link,
  Separator,
  TextArea,
  Card,
  Spinner,
} from "@radix-ui/themes";
import { GlassButton } from "@/app/components/GlassButton";
import { Breadcrumbs } from "@/app/components/Breadcrumbs";
import { ArrowLeftIcon } from "@radix-ui/react-icons";
import NextLink from "next/link";
import {
  useCreateStoryMutation,
  useGetGoalQuery,
} from "@/app/__generated__/hooks";
import { useUser } from "@clerk/nextjs";

function NewStoryContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const goalId = searchParams.get("goalId");
  const { user } = useUser();
  const [storyContent, setStoryContent] = useState("");

  const { data: goalData } = useGetGoalQuery({
    variables: { id: goalId ? parseInt(goalId) : undefined },
    skip: !goalId,
  });

  const [createStory, { loading: creatingStory }] = useCreateStoryMutation({
    onCompleted: (data) => {
      if (data.createStory?.id) {
        router.push(`/stories/${data.createStory.id}`);
      }
    },
  });

  const handleCreateStory = async () => {
    if (!storyContent.trim() || !goalId) return;

    await createStory({
      variables: {
        input: {
          goalId: parseInt(goalId),
          content: storyContent,
        },
      },
    });
  };

  const goal = goalData?.goal;

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
                goal?.slug
                  ? `/goals/${goal.slug}`
                  : goalId
                    ? `/goals/${goalId}`
                    : "/goals"
              }
            >
              <ArrowLeftIcon />
              Back to Goal
            </NextLink>
          </Button>

          <Separator orientation="vertical" style={{ height: 20 }} />

          <Box minWidth="0" style={{ flex: 1 }}>
            <Heading size="8" weight="bold">
              Create Story
            </Heading>
          </Box>
        </Flex>
      </Box>

      <Box style={{ width: "100%" }}>
        <Breadcrumbs
          crumbs={[
            { label: "Goals", href: "/goals" },
            {
              label: goal?.title || "Goal",
              href: goal?.slug
                ? `/goals/${goal.slug}`
                : goalId
                  ? `/goals/${goalId}`
                  : "/goals",
            },
            { label: "New Story" },
          ]}
        />
        <Card>
          <Flex direction="column" gap="4" p="4">
            {goal && (
              <Flex direction="column" gap="2">
                <Text size="1" color="gray" weight="medium">
                  Related Goal
                </Text>
                <Heading size="4">{goal.title}</Heading>
              </Flex>
            )}

            <Flex direction="column" gap="2">
              <Text size="2" weight="medium">
                Your Story
              </Text>
              <Text size="2" color="gray">
                Share your thoughts, reflections, or experiences related to this
                goal.
              </Text>
            </Flex>

            <TextArea
              value={storyContent}
              onChange={(e) => setStoryContent(e.target.value)}
              placeholder="Write your story here..."
              size="3"
              style={{ minHeight: "400px" }}
            />

            <Flex gap="2" justify="end">
              <Button
                variant="soft"
                color="gray"
                onClick={() => {
                  if (goal?.slug) {
                    router.push(`/goals/${goal.slug}`);
                  } else if (goalId) {
                    router.push(`/goals/${goalId}`);
                  } else {
                    router.push("/goals");
                  }
                }}
                disabled={creatingStory}
              >
                Cancel
              </Button>
              <Button
                onClick={handleCreateStory}
                disabled={!storyContent.trim() || creatingStory}
                loading={creatingStory}
              >
                Create Story
              </Button>
            </Flex>
          </Flex>
        </Card>
      </Box>
    </Flex>
  );
}

export default function NewStoryPage() {
  return (
    <Suspense
      fallback={
        <Flex justify="center" align="center" style={{ minHeight: "200px" }}>
          <Spinner size="3" />
        </Flex>
      }
    >
      <NewStoryContent />
    </Suspense>
  );
}
