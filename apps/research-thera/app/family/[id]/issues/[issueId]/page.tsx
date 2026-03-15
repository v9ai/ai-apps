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
  Dialog,
  AlertDialog,
  TextArea,
  TextField,
  Select,
} from "@radix-ui/themes";
import {
  ArrowLeftIcon,
  Pencil1Icon,
  TrashIcon,
  TargetIcon,
} from "@radix-ui/react-icons";
import { useRouter, useParams } from "next/navigation";
import NextLink from "next/link";
import {
  useGetIssueQuery,
  useUpdateIssueMutation,
  useDeleteIssueMutation,
  useConvertIssueToGoalMutation,
} from "@/app/__generated__/hooks";

const CATEGORY_OPTIONS = [
  "academic",
  "behavioral",
  "social",
  "emotional",
  "developmental",
  "health",
  "communication",
  "other",
];

const SEVERITY_OPTIONS = ["low", "medium", "high"];

function getSeverityColor(severity: string) {
  switch (severity.toLowerCase()) {
    case "high":
      return "red" as const;
    case "medium":
      return "orange" as const;
    case "low":
      return "green" as const;
    default:
      return "gray" as const;
  }
}

function getCategoryColor(category: string) {
  switch (category.toLowerCase()) {
    case "academic":
      return "blue" as const;
    case "behavioral":
      return "orange" as const;
    case "social":
      return "purple" as const;
    case "emotional":
      return "pink" as const;
    case "developmental":
      return "cyan" as const;
    case "health":
      return "red" as const;
    case "communication":
      return "yellow" as const;
    default:
      return "gray" as const;
  }
}

function IssueDetailContent() {
  const router = useRouter();
  const params = useParams();
  const familySlug = params.id as string;
  const issueId = parseInt(params.issueId as string, 10);

  const { data, loading, error } = useGetIssueQuery({
    variables: { id: issueId },
    skip: isNaN(issueId),
  });

  const [updateIssue, { loading: updating }] = useUpdateIssueMutation({
    refetchQueries: ["GetIssue"],
  });

  const [deleteIssue, { loading: deleting }] = useDeleteIssueMutation({
    refetchQueries: ["GetIssues"],
  });

  const [convertIssueToGoal, { loading: converting }] =
    useConvertIssueToGoalMutation();

  const [editOpen, setEditOpen] = useState(false);
  const [editTitle, setEditTitle] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editCategory, setEditCategory] = useState("");
  const [editSeverity, setEditSeverity] = useState("");
  const [editRecommendations, setEditRecommendations] = useState("");
  const [editError, setEditError] = useState<string | null>(null);

  const [convertOpen, setConvertOpen] = useState(false);
  const [convertTitle, setConvertTitle] = useState("");
  const [convertDescription, setConvertDescription] = useState("");
  const [convertError, setConvertError] = useState<string | null>(null);

  const issue = data?.issue;

  const handleEdit = () => {
    if (!issue) return;
    setEditTitle(issue.title);
    setEditDescription(issue.description);
    setEditCategory(issue.category);
    setEditSeverity(issue.severity);
    setEditRecommendations(issue.recommendations?.join("\n") || "");
    setEditError(null);
    setEditOpen(true);
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!issue) return;

    const recommendations = editRecommendations
      .split("\n")
      .map((r) => r.trim())
      .filter(Boolean);

    try {
      await updateIssue({
        variables: {
          id: issue.id,
          input: {
            title: editTitle.trim() || undefined,
            description: editDescription.trim() || undefined,
            category: editCategory || undefined,
            severity: editSeverity || undefined,
            recommendations: recommendations.length > 0 ? recommendations : undefined,
          },
        },
      });
      setEditOpen(false);
    } catch (err: any) {
      setEditError(err.message || "Failed to update issue");
    }
  };

  const handleDelete = async () => {
    if (!issue) return;
    try {
      await deleteIssue({ variables: { id: issue.id } });
      router.push(`/family/${familySlug}/issues`);
    } catch (err: any) {
      console.error("Failed to delete issue:", err);
    }
  };

  const handleConvertToGoal = async () => {
    if (!issue) return;
    try {
      const result = await convertIssueToGoal({
        variables: {
          id: issue.id,
          input: {
            familyMemberId: issue.familyMemberId,
            title: convertTitle.trim() || issue.title,
            description: convertDescription.trim() || `Goal created from issue: ${issue.description}`,
          },
        },
      });

      if (result.data?.convertIssueToGoal) {
        const goalId = result.data.convertIssueToGoal.id;
        setConvertOpen(false);
        router.push(`/family/${familySlug}/goals/${goalId}`);
      }
    } catch (err: any) {
      setConvertError(err.message || "Failed to convert to goal");
    }
  };

  const openConvertDialog = () => {
    if (!issue) return;
    setConvertTitle(issue.title);
    setConvertDescription(`Goal created from issue: ${issue.description}`);
    setConvertError(null);
    setConvertOpen(true);
  };

  if (loading) {
    return (
      <Flex justify="center" align="center" style={{ minHeight: "200px" }}>
        <Spinner size="3" />
      </Flex>
    );
  }

  if (error || !issue) {
    return (
      <Card>
        <Text color="red">
          {error ? `Error: ${error.message}` : "Issue not found"}
        </Text>
      </Card>
    );
  }

  return (
    <Flex direction="column" gap="5" p="5">
      {/* Header */}
      <Flex justify="between" align="center">
        <Flex gap="3" align="center">
          <Button variant="ghost" size="2" asChild>
            <NextLink href={`/family/${familySlug}/issues`}>
              <ArrowLeftIcon />
            </NextLink>
          </Button>
          <Heading size="5">Issue Details</Heading>
        </Flex>
        <Flex gap="2">
          <Button
            variant="soft"
            color="iris"
            size="2"
            onClick={openConvertDialog}
            disabled={converting}
          >
            <TargetIcon />
            {converting ? "Converting..." : "Convert to Goal"}
          </Button>
          <Button variant="soft" size="2" onClick={handleEdit}>
            <Pencil1Icon />
            Edit
          </Button>
          <AlertDialog.Root>
            <AlertDialog.Trigger>
              <Button variant="soft" color="red" size="2">
                <TrashIcon />
                Delete
              </Button>
            </AlertDialog.Trigger>
            <AlertDialog.Content>
              <AlertDialog.Title>Delete Issue</AlertDialog.Title>
              <AlertDialog.Description>
                Are you sure you want to delete this issue? This action cannot
                be undone.
              </AlertDialog.Description>
              <Flex gap="3" justify="end" mt="4">
                <AlertDialog.Cancel>
                  <Button variant="soft" color="gray">
                    Cancel
                  </Button>
                </AlertDialog.Cancel>
                <AlertDialog.Action>
                  <Button
                    color="red"
                    disabled={deleting}
                    onClick={handleDelete}
                  >
                    {deleting ? "Deleting..." : "Delete"}
                  </Button>
                </AlertDialog.Action>
              </Flex>
            </AlertDialog.Content>
          </AlertDialog.Root>
        </Flex>
      </Flex>

      <Separator size="4" />

      {/* Issue Details */}
      <Card>
        <Flex direction="column" gap="4" p="4">
          <Flex gap="2" align="center" wrap="wrap">
            <Heading size="4">{issue.title}</Heading>
            <Badge
              color={getSeverityColor(issue.severity)}
              variant="soft"
              size="2"
            >
              {issue.severity} severity
            </Badge>
            <Badge
              color={getCategoryColor(issue.category)}
              variant="outline"
              size="2"
            >
              {issue.category}
            </Badge>
          </Flex>

          <Box>
            <Text size="2" weight="medium">
              Description
            </Text>
            <Text size="2" color="gray" style={{ whiteSpace: "pre-wrap" }}>
              {issue.description}
            </Text>
          </Box>

          {issue.recommendations && issue.recommendations.length > 0 && (
            <Box>
              <Text size="2" weight="medium">
                Recommendations
              </Text>
              <ul style={{ margin: 0, paddingLeft: "20px" }}>
                {issue.recommendations.map((rec, idx) => (
                  <li key={idx}>
                    <Text size="2" color="gray">
                      {rec}
                    </Text>
                  </li>
                ))}
              </ul>
            </Box>
          )}

          <Flex gap="4" wrap="wrap">
            <Box>
              <Text size="2" weight="medium">
                Source Feedback
              </Text>
              {issue.feedback ? (
                <NextLink
                  href={`/family/${familySlug}/contacts/${issue.feedback.contactId}/feedback/${issue.feedback.id}`}
                >
                  <Text size="2" color="iris" style={{ textDecoration: "underline" }}>
                    {issue.feedback.subject || "View Feedback"}
                  </Text>
                </NextLink>
              ) : (
                <Text size="2" color="gray">
                  No feedback linked
                </Text>
              )}
            </Box>
          </Flex>

          {issue.familyMember && (
            <Flex gap="4" wrap="wrap">
              <Box>
                <Text size="2" weight="medium">
                  Family Member
                </Text>
                <NextLink href={`/family/${familySlug}`}>
                  <Text size="2" color="iris" style={{ textDecoration: "underline" }}>
                    {issue.familyMember.firstName}
                    {issue.familyMember.name ? ` ${issue.familyMember.name}` : ""}
                  </Text>
                </NextLink>
              </Box>
            </Flex>
          )}
        </Flex>
      </Card>

      {/* Edit Dialog */}
      <Dialog.Root open={editOpen} onOpenChange={setEditOpen}>
        <Dialog.Content style={{ maxWidth: 540 }}>
          <Dialog.Title>Edit Issue</Dialog.Title>
          <form onSubmit={handleUpdate}>
            <Flex direction="column" gap="4">
              <label>
                <Text as="div" size="2" mb="1" weight="medium">
                  Title
                </Text>
                <TextField.Root
                  placeholder="Issue title"
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  disabled={updating}
                />
              </label>

              <label>
                <Text as="div" size="2" mb="1" weight="medium">
                  Description
                </Text>
                <TextArea
                  placeholder="Issue description"
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  rows={4}
                  disabled={updating}
                />
              </label>

              <Flex gap="3">
                <label style={{ flex: 1 }}>
                  <Text as="div" size="2" mb="1" weight="medium">
                    Category
                  </Text>
                  <Select.Root
                    value={editCategory}
                    onValueChange={setEditCategory}
                    disabled={updating}
                  >
                    <Select.Trigger style={{ width: "100%" }} />
                    <Select.Content>
                      {CATEGORY_OPTIONS.map((opt) => (
                        <Select.Item key={opt} value={opt}>
                          {opt.charAt(0).toUpperCase() + opt.slice(1)}
                        </Select.Item>
                      ))}
                    </Select.Content>
                  </Select.Root>
                </label>

                <label style={{ flex: 1 }}>
                  <Text as="div" size="2" mb="1" weight="medium">
                    Severity
                  </Text>
                  <Select.Root
                    value={editSeverity}
                    onValueChange={setEditSeverity}
                    disabled={updating}
                  >
                    <Select.Trigger style={{ width: "100%" }} />
                    <Select.Content>
                      {SEVERITY_OPTIONS.map((opt) => (
                        <Select.Item key={opt} value={opt}>
                          {opt.charAt(0).toUpperCase() + opt.slice(1)}
                        </Select.Item>
                      ))}
                    </Select.Content>
                  </Select.Root>
                </label>
              </Flex>

              <label>
                <Text as="div" size="2" mb="1" weight="medium">
                  Recommendations
                </Text>
                <TextArea
                  placeholder="One recommendation per line"
                  value={editRecommendations}
                  onChange={(e) => setEditRecommendations(e.target.value)}
                  rows={3}
                  disabled={updating}
                />
              </label>

              {editError && (
                <Text color="red" size="2">
                  {editError}
                </Text>
              )}

              <Flex gap="3" justify="end" mt="4">
                <Dialog.Close>
                  <Button variant="soft" color="gray">
                    Cancel
                  </Button>
                </Dialog.Close>
                <Button type="submit" disabled={updating}>
                  {updating ? "Saving..." : "Save Changes"}
                </Button>
              </Flex>
            </Flex>
          </form>
        </Dialog.Content>
      </Dialog.Root>

      {/* Convert to Goal Dialog */}
      <Dialog.Root open={convertOpen} onOpenChange={setConvertOpen}>
        <Dialog.Content style={{ maxWidth: 540 }}>
          <Dialog.Title>Convert Issue to Goal</Dialog.Title>
          <form onSubmit={handleConvertToGoal}>
            <Flex direction="column" gap="4">
              <label>
                <Text as="div" size="2" mb="1" weight="medium">
                  Goal Title
                </Text>
                <TextField.Root
                  placeholder="Goal title"
                  value={convertTitle}
                  onChange={(e) => setConvertTitle(e.target.value)}
                  disabled={converting}
                />
              </label>

              <label>
                <Text as="div" size="2" mb="1" weight="medium">
                  Goal Description
                </Text>
                <TextArea
                  placeholder="Goal description"
                  value={convertDescription}
                  onChange={(e) => setConvertDescription(e.target.value)}
                  rows={4}
                  disabled={converting}
                />
              </label>

              {convertError && (
                <Text color="red" size="2">
                  {convertError}
                </Text>
              )}

              <Flex gap="3" justify="end" mt="4">
                <Dialog.Close>
                  <Button variant="soft" color="gray">
                    Cancel
                  </Button>
                </Dialog.Close>
                <Button type="submit" disabled={converting}>
                  {converting ? "Converting..." : "Convert to Goal"}
                </Button>
              </Flex>
            </Flex>
          </form>
        </Dialog.Content>
      </Dialog.Root>
    </Flex>
  );
}

export default function IssueDetailPage() {
  return <IssueDetailContent />;
}
