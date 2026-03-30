"use client";

import {
  Flex,
  Heading,
  Text,
  Card,
  Badge,
  Spinner,
} from "@radix-ui/themes";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import { useGetAllIssuesQuery } from "@/app/__generated__/hooks";
import { AuthGate } from "@/app/components/AuthGate";

function getSeverityColor(severity: string) {
  switch (severity.toLowerCase()) {
    case "high": return "red" as const;
    case "medium": return "orange" as const;
    case "low": return "green" as const;
    default: return "gray" as const;
  }
}

function getCategoryColor(category: string) {
  switch (category.toLowerCase()) {
    case "academic": return "blue" as const;
    case "behavioral": return "orange" as const;
    case "social": return "purple" as const;
    case "emotional": return "pink" as const;
    case "developmental": return "cyan" as const;
    case "health": return "red" as const;
    case "communication": return "yellow" as const;
    default: return "gray" as const;
  }
}

function IssuesContent() {
  const router = useRouter();
  const { data, loading, error } = useGetAllIssuesQuery();

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

  const issues = data?.allIssues || [];

  return (
    <Flex direction="column" gap="4">
      <Heading size="5">Issues ({issues.length})</Heading>

      {issues.length === 0 ? (
        <Card>
          <Flex direction="column" gap="2" p="4" align="center">
            <Text color="gray">No issues yet.</Text>
          </Flex>
        </Card>
      ) : (
        <Flex direction="column" gap="3">
          {issues.map((issue) => (
            <Card
              key={issue.id}
              style={{ cursor: "pointer" }}
              onClick={() =>
                router.push(
                  `/family/${issue.familyMemberId}/issues/${issue.id}`,
                )
              }
            >
              <Flex direction="column" gap="2" p="4">
                <Flex justify="between" align="start" gap="3">
                  <Flex direction="column" gap="1" style={{ flex: 1 }}>
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
                    {issue.familyMember && (
                      <Badge
                        color="cyan"
                        size="1"
                        style={{ width: "fit-content" }}
                      >
                        {issue.familyMember.firstName ??
                          issue.familyMember.name}
                      </Badge>
                    )}
                    <Text size="2" color="gray">
                      {issue.description}
                    </Text>
                  </Flex>
                  <Text size="1" color="gray" style={{ whiteSpace: "nowrap" }}>
                    {new Date(issue.updatedAt).toLocaleDateString(undefined, {
                      year: "numeric",
                      month: "short",
                      day: "numeric",
                    })}
                  </Text>
                </Flex>
              </Flex>
            </Card>
          ))}
        </Flex>
      )}
    </Flex>
  );
}

const DynamicIssuesContent = dynamic(
  () => Promise.resolve(IssuesContent),
  { ssr: false },
);

export default function IssuesPage() {
  return (
    <AuthGate
      pageName="Issues"
      description="Sign in to view your issues."
    >
      <Flex direction="column" gap="4">
        <Heading size={{ initial: "6", md: "8" }}>Issues</Heading>
        <DynamicIssuesContent />
      </Flex>
    </AuthGate>
  );
}
