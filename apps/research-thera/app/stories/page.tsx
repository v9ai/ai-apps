"use client";

import {
  Flex,
  Heading,
  Text,
  Card,
  Badge,
  Spinner,
  Button,
} from "@radix-ui/themes";
import { SpeakerLoudIcon, FileTextIcon } from "@radix-ui/react-icons";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import { useGetAllStoriesQuery } from "@/app/__generated__/hooks";
import { useUser } from "@clerk/nextjs";
import { AuthGate } from "@/app/components/AuthGate";

function StoriesListContent() {
  const router = useRouter();
  const { user } = useUser();

  const { data, loading, error, refetch } = useGetAllStoriesQuery({
    skip: !user,
  });

  if (loading) {
    return (
      <Flex justify="center" align="center" style={{ minHeight: "200px" }}>
        <Spinner size="3" />
      </Flex>
    );
  }

  if (error) {
    return (
      <Card>
        <Flex direction="column" gap="3" p="4">
          <Text color="red">{error.message}</Text>
          <Button onClick={() => refetch()}>Retry</Button>
        </Flex>
      </Card>
    );
  }

  const stories = data?.allStories ?? [];

  if (stories.length === 0) {
    return (
      <Card>
        <Flex direction="column" align="center" gap="3" p="6">
          <FileTextIcon width="32" height="32" color="var(--gray-9)" />
          <Flex direction="column" align="center" gap="1">
            <Text weight="medium">No stories yet</Text>
            <Text size="2" color="gray">
              Stories are generated from your therapeutic goals. Open a goal to
              create one.
            </Text>
          </Flex>
          <Button variant="soft" onClick={() => router.push("/goals")}>
            Browse Goals
          </Button>
        </Flex>
      </Card>
    );
  }

  return (
    <Flex direction="column" gap="3">
      {stories.map((story) => {
        const preview = story.content.slice(0, 160);
        const hasMore = story.content.length > 160;
        const date = new Date(story.createdAt).toLocaleDateString("en-GB", {
          day: "numeric",
          month: "short",
          year: "numeric",
        });

        return (
          <Card
            key={story.id}
            style={{ cursor: "pointer" }}
            onClick={() => router.push(`/stories/${story.id}`)}
          >
            <Flex direction="column" gap="3" p="2">
              <Flex justify="between" align="start" gap="3">
                <Flex direction="column" gap="1" style={{ flex: 1, minWidth: 0 }}>
                  {story.goal && (
                    <Text size="1" color="indigo" weight="medium">
                      {story.goal.title}
                    </Text>
                  )}
                  <Text
                    size="2"
                    color="gray"
                    style={{
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      display: "-webkit-box",
                      WebkitLineClamp: 3,
                      WebkitBoxOrient: "vertical",
                    }}
                  >
                    {preview}
                    {hasMore && "…"}
                  </Text>
                </Flex>
                <Flex direction="column" align="end" gap="2" style={{ flexShrink: 0 }}>
                  <Badge color="gray" variant="soft" size="1">
                    {date}
                  </Badge>
                  {story.audioUrl && (
                    <Badge color="indigo" variant="soft" size="1">
                      <SpeakerLoudIcon width="10" height="10" />
                      Audio
                    </Badge>
                  )}
                </Flex>
              </Flex>
            </Flex>
          </Card>
        );
      })}
    </Flex>
  );
}

const DynamicStoriesListContent = dynamic(
  () => Promise.resolve(StoriesListContent),
  { ssr: false },
);

export default function StoriesPage() {
  return (
    <AuthGate
      pageName="Stories"
      description="Your therapeutic stories are private. Sign in to read and listen to them."
    >
      <Flex direction="column" gap="4">
        <Heading size="8">Stories</Heading>
        <DynamicStoriesListContent />
      </Flex>
    </AuthGate>
  );
}
