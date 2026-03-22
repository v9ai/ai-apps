"use client";

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
  Link,
} from "@radix-ui/themes";
import { ArrowLeftIcon, PlusIcon } from "@radix-ui/react-icons";
import { useRouter, useParams } from "next/navigation";
import NextLink from "next/link";
import {
  useGetIssuesQuery,
  useGetFamilyMemberQuery,
  useDeleteIssueMutation,
} from "@/app/__generated__/hooks";

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

function IssuesListContent() {
  const router = useRouter();
  const params = useParams();
  const familySlug = params.id as string;
  const isNumeric = /^\d+$/.test(familySlug);
  const familyMemberIdFromRoute = isNumeric ? parseInt(familySlug, 10) : NaN;

  const { data: fmData } = useGetFamilyMemberQuery({
    variables: isNumeric
      ? { id: familyMemberIdFromRoute }
      : { slug: familySlug },
  });

  const familyMember = fmData?.familyMember;
  const familyMemberId = familyMember?.id ?? NaN;

  const { data, loading, error } = useGetIssuesQuery({
    variables: { familyMemberId },
    skip: isNaN(familyMemberId),
  });

  const [deleteIssue] = useDeleteIssueMutation({
    refetchQueries: ["GetIssues"],
  });

  const handleDelete = async (id: number) => {
    if (!confirm("Are you sure you want to delete this issue?")) return;
    await deleteIssue({ variables: { id } });
  };

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
        <Text color="red">Error: {error.message}</Text>
      </Card>
    );
  }

  const issues = data?.issues || [];

  return (
    <Flex direction="column" gap="5" p="5">
      {/* Header */}
      <Flex justify="between" align="center">
        <Flex gap="3" align="center">
          <Button variant="ghost" size="2" asChild>
            <NextLink href={`/family/${familySlug}`}>
              <ArrowLeftIcon />
            </NextLink>
          </Button>
          <Box>
            <Heading size="5">Issues</Heading>
            {familyMember && (
              <Text size="2" color="gray">
                for {familyMember.firstName}
                {familyMember.name ? ` ${familyMember.name}` : ""}
              </Text>
            )}
          </Box>
        </Flex>
        <Button variant="soft" color="iris" size="2">
          <PlusIcon />
          Add Issue
        </Button>
      </Flex>

      <Separator size="4" />

      {/* Issues List */}
      {issues.length === 0 ? (
        <Card>
          <Flex direction="column" gap="3" align="center" justify="center" p="6">
            <Text size="3" color="gray">
              No issues yet. Extract issues from contact feedback or add them manually.
            </Text>
          </Flex>
        </Card>
      ) : (
        <Flex direction="column" gap="3">
          {issues.map((issue) => (
            <Card key={issue.id} variant="surface">
              <Flex direction="column" gap="3" p="4">
                <Flex justify="between" align="start">
                  <Flex direction="column" gap="2" style={{ flex: 1 }}>
                    <Flex gap="2" align="center" wrap="wrap">
                      <Text size="3" weight="bold">
                        {issue.title}
                      </Text>
                      <Badge
                        color={getSeverityColor(issue.severity)}
                        variant="soft"
                        size="1"
                      >
                        {issue.severity}
                      </Badge>
                      <Badge
                        color={getCategoryColor(issue.category)}
                        variant="outline"
                        size="1"
                      >
                        {issue.category}
                      </Badge>
                    </Flex>
                    <Text size="1" color="gray">
                      {new Date(issue.createdAt).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" })}
                    </Text>
                    <Text size="2" color="gray">
                      {issue.description}
                    </Text>
                    {issue.recommendations && issue.recommendations.length > 0 && (
                      <Flex direction="column" gap="1">
                        <Text size="2" weight="medium">
                          Recommendations:
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
                      </Flex>
                    )}
                  </Flex>
                  <Flex gap="2">
                    <Button
                      variant="soft"
                      size="2"
                      asChild
                    >
                      <NextLink href={`/family/${familySlug}/issues/${issue.id}`}>
                        View
                      </NextLink>
                    </Button>
                    <Button
                      variant="soft"
                      color="red"
                      size="2"
                      onClick={() => handleDelete(issue.id)}
                    >
                      Delete
                    </Button>
                  </Flex>
                </Flex>
              </Flex>
            </Card>
          ))}
        </Flex>
      )}
    </Flex>
  );
}

export default function IssuesListPage() {
  return <IssuesListContent />;
}
