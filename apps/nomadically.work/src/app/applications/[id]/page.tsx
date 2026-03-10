"use client";

import { useState, useEffect, useCallback, Suspense } from "react";
import { Container, Heading, Button, Flex, Text, Box, Card, Skeleton, Tabs } from "@radix-ui/themes";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useGetApplicationQuery } from "@/__generated__/hooks";
import Link from "next/link";
import { useAuth } from "@/lib/auth-hooks";
import { ADMIN_EMAIL } from "@/lib/constants";
import { ApplicationHeader } from "@/components/app-detail/ApplicationHeader";
import { JobDescriptionTab } from "@/components/app-detail/JobDescriptionTab";
import dynamic from "next/dynamic";

const ProjectDocsTab = dynamic(
  () => import("@/components/app-detail/ProjectDocsTab").then((m) => ({ default: m.ProjectDocsTab })),
  { loading: () => <Skeleton height="400px" /> },
);

const TAB_VALUES = ["description", "docs"] as const;
type TabValue = (typeof TAB_VALUES)[number];

function ApplicationDetailInner() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const id = Number(params.id);

  const { data, loading, error, refetch } = useGetApplicationQuery({
    variables: { id },
    skip: isNaN(id),
  });

  const { user } = useAuth();
  const isAdmin = user?.email === ADMIN_EMAIL;
  const app = data?.application;

  // Tab state persisted to URL
  const rawTab = searchParams.get("tab") ?? "description";
  const activeTab: TabValue = TAB_VALUES.includes(rawTab as TabValue) ? (rawTab as TabValue) : "description";
  const setActiveTab = useCallback(
    (tab: string) => {
      const url = new URL(window.location.href);
      url.searchParams.set("tab", tab);
      router.replace(url.pathname + url.search, { scroll: false });
    },
    [router],
  );

  // Keyboard shortcuts 1-2 to switch tabs
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
      const idx = Number(e.key) - 1;
      if (idx >= 0 && idx < TAB_VALUES.length) {
        setActiveTab(TAB_VALUES[idx]);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [setActiveTab]);

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
            <Button onClick={() => refetch()}>Retry</Button>
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

      <Tabs.Root value={activeTab} onValueChange={setActiveTab}>
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
                <Flex align="center" gap="1">
                  <Text>Docs</Text>
                </Flex>
                <span className="tab-shortcut-hint">2</span>
              </Flex>
            </Tabs.Trigger>
          )}
        </Tabs.List>

        <Box pt="4">
          <Tabs.Content value="description">
            <JobDescriptionTab
              app={app}
              isAdmin={isAdmin}
              refetch={refetch}
            />
          </Tabs.Content>
          {app.id === 13 && (
            <Tabs.Content value="docs">
              <ProjectDocsTab app={app} isAdmin={isAdmin} />
            </Tabs.Content>
          )}
        </Box>
      </Tabs.Root>
    </Container>
  );
}

export default function ApplicationDetailPage() {
  return (
    <Suspense fallback={
      <Container size="3" p="8">
        <Skeleton height="32px" mb="6" style={{ maxWidth: 200 }} />
        <Skeleton height="400px" />
      </Container>
    }>
      <ApplicationDetailInner />
    </Suspense>
  );
}
