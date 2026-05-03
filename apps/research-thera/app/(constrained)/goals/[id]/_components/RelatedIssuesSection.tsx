"use client";

import { Flex, Heading, Text, Card, Badge } from "@radix-ui/themes";
import NextLink from "next/link";
import { useGetIssuesQuery } from "@/app/__generated__/hooks";

function severityColor(severity: string) {
  switch (severity.toLowerCase()) {
    case "high": return "red" as const;
    case "medium": return "orange" as const;
    case "low": return "green" as const;
    default: return "gray" as const;
  }
}

interface RelatedIssuesSectionProps {
  familyMemberId: number;
  familyMemberSlug?: string | null;
}

export default function RelatedIssuesSection({ familyMemberId, familyMemberSlug }: RelatedIssuesSectionProps) {
  const { data, loading } = useGetIssuesQuery({
    variables: { familyMemberId },
  });

  const issues = data?.issues ?? [];

  if (loading || issues.length === 0) return null;

  const basePath = familyMemberSlug
    ? `/family/${familyMemberSlug}`
    : `/family/${familyMemberId}`;

  return (
    <Card>
      <Flex direction="column" gap="3" p="4">
        <Heading size="4">Related Issues ({issues.length})</Heading>
        <Flex direction="column" gap="2">
          {issues.slice(0, 10).map((issue) => (
            <Card key={issue.id} style={{ backgroundColor: "var(--gray-2)" }} asChild>
              <NextLink
                href={`${basePath}/issues/${issue.id}`}
                style={{ textDecoration: "none" }}
              >
                <Flex direction="column" gap="1" p="3">
                  <Flex justify="between" align="center" gap="2">
                    <Text size="2" weight="medium">{issue.title}</Text>
                    <Flex gap="1">
                      <Badge size="1" variant="soft">{issue.category}</Badge>
                      <Badge size="1" color={severityColor(issue.severity)}>{issue.severity}</Badge>
                    </Flex>
                  </Flex>
                  <Text
                    size="1"
                    color="gray"
                    style={{
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      display: "-webkit-box",
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: "vertical",
                    }}
                  >
                    {issue.description}
                  </Text>
                </Flex>
              </NextLink>
            </Card>
          ))}
          {issues.length > 10 && (
            <Text size="1" color="gray">+ {issues.length - 10} more issues</Text>
          )}
        </Flex>
      </Flex>
    </Card>
  );
}
