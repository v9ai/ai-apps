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
} from "@radix-ui/themes";
import { ArrowLeftIcon } from "@radix-ui/react-icons";
import { useParams } from "next/navigation";
import NextLink from "next/link";
import {
  useGetIssuesQuery,
  useGetFamilyMemberQuery,
  useDeleteIssueMutation,
} from "@/app/__generated__/hooks";
import AddIssueButton from "@/app/components/AddIssueButton";
import { getSeverityColor, getCategoryColor } from "@/app/lib/issue-colors";

function IssuesListContent() {
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
        <Flex direction="column" gap="3" p="4" align="center">
          <Text color="red">Error: {error.message}</Text>
          <Button variant="soft" size="2" onClick={() => window.location.reload()}>
            Try Again
          </Button>
        </Flex>
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
        {!isNaN(familyMemberId) && (
          <AddIssueButton
            familyMemberId={familyMemberId}
            refetchQueries={["GetIssues"]}
            size="2"
          />
        )}
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
                    <Text size="2" color="gray" style={{
                      display: "-webkit-box",
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: "vertical",
                      overflow: "hidden",
                    }}>
                      {issue.description}
                    </Text>
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
