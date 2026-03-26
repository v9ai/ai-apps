"use client";

import { Suspense, useCallback } from "react";
import { Container, Heading, Button, Flex, Text, Box, Card, Skeleton, Tabs } from "@radix-ui/themes";
import { useParams, useRouter } from "next/navigation";
import { useGetApplicationQuery } from "@/__generated__/hooks";
import Link from "next/link";
import { useAuth } from "@/lib/auth-hooks";
import { ADMIN_EMAIL } from "@/lib/constants";
import { ApplicationHeader } from "@/components/app-detail/ApplicationHeader";
import { InterviewPrepTab } from "@/components/app-detail/InterviewPrepTab";

function PrepPageInner() {
  const params = useParams();
  const router = useRouter();
  const id = Number(params.id);

  const { data, loading, error } = useGetApplicationQuery({
    variables: { id },
    skip: isNaN(id),
  });

  const { user } = useAuth();
  const isAdmin = user?.email === ADMIN_EMAIL;
  const app = data?.application;

  const handleTabChange = useCallback(
    (tab: string) => {
      if (tab !== "prep") {
        router.push(`/applications/${id}?tab=${tab}`);
      }
    },
    [router, id],
  );

  if (loading) {
    return (
      <Container size="3" p="8">
        <Skeleton height="32px" mb="6" style={{ maxWidth: 200 }} />
        <Skeleton height="400px" />
      </Container>
    );
  }

  if (error) {
    return (
      <Container size="3" p="8">
        <Card>
          <Flex direction="column" align="center" gap="4" p="6">
            <Heading size="5">Error Loading Application</Heading>
            <Text color="gray">{error.message}</Text>
          </Flex>
        </Card>
      </Container>
    );
  }

  if (!app) {
    return (
      <Container size="3" p="8">
        <Card>
          <Flex direction="column" align="center" gap="4" p="6">
            <Heading size="5">Application Not Found</Heading>
            <Text color="gray">This application doesn&apos;t exist or you don&apos;t have access.</Text>
            <Button asChild>
              <Link href="/applications">Back to Applications</Link>
            </Button>
          </Flex>
        </Card>
      </Container>
    );
  }

  return (
    <Container size="3" p={{ initial: "4", md: "8" }}>
      <ApplicationHeader app={app} isAdmin={isAdmin} />

      <Tabs.Root value="prep" onValueChange={handleTabChange}>
        <Tabs.List style={{ borderBottom: "1px solid var(--gray-6)" }}>
          <Tabs.Trigger value="description">
            <Flex direction="column" align="center" gap="0">
              <Text>Job Description</Text>
              <span className="tab-shortcut-hint">1</span>
            </Flex>
          </Tabs.Trigger>
          {app.id === 13 && (
            <Tabs.Trigger value="docs">
              <Flex direction="column" align="center" gap="0">
                <Text>Docs</Text>
                <span className="tab-shortcut-hint">2</span>
              </Flex>
            </Tabs.Trigger>
          )}
          <Tabs.Trigger value="prep">
            <Flex direction="column" align="center" gap="0">
              <Text>Prep</Text>
              <span className="tab-shortcut-hint">3</span>
            </Flex>
          </Tabs.Trigger>
        </Tabs.List>

        <Box pt="4">
          <Tabs.Content value="prep">
            <InterviewPrepTab app={app} isAdmin={isAdmin} />
          </Tabs.Content>
        </Box>
      </Tabs.Root>
    </Container>
  );
}

export default function PrepPage() {
  return (
    <Suspense fallback={
      <Container size="3" p="8">
        <Skeleton height="32px" mb="6" style={{ maxWidth: 200 }} />
        <Skeleton height="400px" />
      </Container>
    }>
      <PrepPageInner />
    </Suspense>
  );
}
