"use client";

import { useState } from "react";
import {
  AlertDialog,
  Box,
  Button,
  Flex,
  Heading,
  Text,
  Card,
  Badge,
  Spinner,
  Link,
  Separator,
  TextArea,
} from "@radix-ui/themes";
import { GlassButton } from "@/app/components/GlassButton";
import { AudioPlayer } from "@/app/components/AudioPlayer";
import { Breadcrumbs } from "@/app/components/Breadcrumbs";
import { ArrowLeftIcon, Pencil1Icon, TrashIcon } from "@radix-ui/react-icons";
import { useRouter, useParams } from "next/navigation";
import NextLink from "next/link";
import dynamic from "next/dynamic";
import {
  useGetStoryQuery,
  useUpdateStoryMutation,
  useDeleteStoryMutation,
} from "@/app/__generated__/hooks";
import { useUser } from "@clerk/nextjs";

function StoryPageContent() {
  const router = useRouter();
  const params = useParams();
  const storyId = parseInt(params.id as string);
  const { user } = useUser();
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState("");
  const [deleteOpen, setDeleteOpen] = useState(false);

  const { data, loading, error, refetch } = useGetStoryQuery({
    variables: { id: storyId },
    skip: !storyId,
  });

  const [updateStory, { loading: updating }] = useUpdateStoryMutation({
    onCompleted: () => {
      setIsEditing(false);
      refetch();
    },
  });

  const [deleteStory, { loading: deleting }] = useDeleteStoryMutation({
    onCompleted: (data) => {
      if (data.deleteStory.success) {
        const goalId = story?.goal?.id;
        if (goalId) {
          router.push(`/goals/${goalId}`);
        } else {
          router.push("/goals");
        }
      }
    },
  });

  const story = data?.story;

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

  const handleEdit = () => {
    setEditContent(story.content);
    setIsEditing(true);
  };

  const handleSave = async () => {
    if (!editContent.trim()) return;
    await updateStory({
      variables: {
        id: storyId,
        input: { content: editContent },
      },
    });
  };

  const handleDelete = async () => {
    await deleteStory({ variables: { id: storyId } });
  };

  const canEdit = user?.emailAddresses[0]?.emailAddress === story.createdBy;

  return (
    <Flex direction="column" gap="4">
      <Breadcrumbs
        crumbs={[
          { label: "Goals", href: "/goals" },
          {
            label: story.goal?.title || "Goal",
            href: story.goal
              ? `/goals/${story.goal.slug || story.goal.id}`
              : "/goals",
          },
          { label: "Story" },
        ]}
      />
      {/* Story Card */}
      <Card>
        <Flex direction="column" gap="4" p="4">
          <Flex justify="between" align="start" gap="3">
            <Flex direction="column" gap="2" style={{ flex: 1 }}>
              <Flex align="center" gap="2">
                <Text size="1" color="gray" weight="medium">
                  Created by {story.createdBy}
                </Text>
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
            {canEdit && (
              <Flex gap="2">
                {!isEditing && (
                  <>
                    <Button
                      variant="soft"
                      size="2"
                      onClick={handleEdit}
                      disabled={deleting}
                    >
                      <Pencil1Icon />
                      Edit
                    </Button>
                    <AlertDialog.Root open={deleteOpen} onOpenChange={setDeleteOpen}>
                      <AlertDialog.Trigger>
                        <Button
                          variant="soft"
                          color="red"
                          size="2"
                          disabled={deleting}
                          loading={deleting}
                        >
                          <TrashIcon />
                          Delete
                        </Button>
                      </AlertDialog.Trigger>
                      <AlertDialog.Content maxWidth="420px">
                        <AlertDialog.Title>Delete this story?</AlertDialog.Title>
                        <AlertDialog.Description size="2">
                          This story will be permanently deleted and cannot be recovered.
                        </AlertDialog.Description>
                        <Flex gap="3" mt="4" justify="end">
                          <AlertDialog.Cancel>
                            <Button variant="soft" color="gray">Cancel</Button>
                          </AlertDialog.Cancel>
                          <AlertDialog.Action>
                            <Button variant="solid" color="red" onClick={handleDelete}>
                              Delete Story
                            </Button>
                          </AlertDialog.Action>
                        </Flex>
                      </AlertDialog.Content>
                    </AlertDialog.Root>
                  </>
                )}
              </Flex>
            )}
          </Flex>

          {isEditing ? (
            <Flex direction="column" gap="3">
              <TextArea
                value={editContent}
                onChange={(e) => setEditContent(e.target.value)}
                placeholder="Write your story here..."
                size="3"
                style={{ minHeight: "300px" }}
              />
              <Flex gap="2" justify="end">
                <Button
                  variant="soft"
                  color="gray"
                  onClick={() => setIsEditing(false)}
                  disabled={updating}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleSave}
                  disabled={updating || !editContent.trim()}
                  loading={updating}
                >
                  Save
                </Button>
              </Flex>
            </Flex>
          ) : (
            <Flex direction="column" gap="3">
              {/* Audio Player Component */}
              <AudioPlayer
                storyId={story.id}
                goalId={story.goalId}
                storyContent={story.content}
                existingAudioUrl={story.audioUrl}
                audioGeneratedAt={story.audioGeneratedAt}
                onAudioGenerated={refetch}
              />

              <Text size="3" style={{ whiteSpace: "pre-wrap" }}>
                {story.content}
              </Text>
            </Flex>
          )}
        </Flex>
      </Card>

      {/* Related Goal */}
      {story.goal && (
        <Card>
          <Flex direction="column" gap="3" p="4">
            <Heading size="4">Related Goal</Heading>
            <Card
              style={{ cursor: "pointer", backgroundColor: "var(--gray-2)" }}
              onClick={() => {
                if (story.goal?.slug) {
                  router.push(`/goals/${story.goal.slug}`);
                } else if (story.goal?.id) {
                  router.push(`/goals/${story.goal.id}`);
                }
              }}
            >
              <Flex direction="column" gap="2" p="3">
                <Heading size="3">{story.goal.title}</Heading>
              </Flex>
            </Card>
          </Flex>
        </Card>
      )}
    </Flex>
  );
}

const DynamicStoryPageContent = dynamic(
  () => Promise.resolve(StoryPageContent),
  { ssr: false },
);

export default function StoryPage() {
  const router = useRouter();
  const params = useParams();
  const storyId = parseInt(params.id as string);
  const { user } = useUser();

  const { data } = useGetStoryQuery({
    variables: { id: storyId },
    skip: !storyId,
  });

  const story = data?.story;

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
                story?.goal?.slug
                  ? `/goals/${story.goal.slug}`
                  : story?.goalId
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
              Story
            </Heading>
          </Box>
        </Flex>
      </Box>

      <Box style={{ width: "100%" }}>
        <DynamicStoryPageContent />
      </Box>
    </Flex>
  );
}
