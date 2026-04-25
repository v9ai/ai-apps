"use client";

import { Suspense } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Box,
  Callout,
  Container,
  Flex,
  Heading,
  Tabs,
  Text,
} from "@radix-ui/themes";
import {
  BarChartIcon,
  EnvelopeClosedIcon,
  EnvelopeOpenIcon,
  ExclamationTriangleIcon,
  FileTextIcon,
  LinkedInLogoIcon,
  PaperPlaneIcon,
  Pencil1Icon,
  RocketIcon,
} from "@radix-ui/react-icons";
import { button } from "@/recipes/button";
import { useAuth } from "@/lib/auth-hooks";
import { ADMIN_EMAIL } from "@/lib/constants";
import { DraftReviewPanel } from "@/components/emails/draft-review-panel";

function DraftsPageContent() {
  const router = useRouter();

  const handleTabChange = (value: string) => {
    if (value === "drafts") return;
    router.push(`/emails?tab=${value}`);
  };

  return (
    <Container size="4" p="8">
      <Flex justify="between" align="center" mb="6">
        <Box>
          <Flex align="center" gap="2" mb="1">
            <Pencil1Icon />
            <Heading size="7">Email Drafts</Heading>
          </Flex>
          <Text color="gray" size="2">
            Review and send AI-generated replies and follow-ups.
          </Text>
        </Box>
      </Flex>

      <Tabs.Root value="drafts" onValueChange={handleTabChange}>
        <Tabs.List mb="4">
          <Tabs.Trigger value="inbox">
            <EnvelopeOpenIcon />
            &nbsp;Inbox
          </Tabs.Trigger>
          <Tabs.Trigger value="sent">
            <EnvelopeClosedIcon />
            &nbsp;Sent
          </Tabs.Trigger>
          <Tabs.Trigger value="campaigns">
            <RocketIcon />
            &nbsp;Campaigns
          </Tabs.Trigger>
          <Tabs.Trigger value="templates">
            <FileTextIcon />
            &nbsp;Templates
          </Tabs.Trigger>
          <Tabs.Trigger value="compose">
            <LinkedInLogoIcon />
            &nbsp;Compose
          </Tabs.Trigger>
          <Tabs.Trigger value="drafts">
            <Pencil1Icon />
            &nbsp;Drafts
          </Tabs.Trigger>
          <Tabs.Trigger value="cpn">
            <PaperPlaneIcon />
            &nbsp;CPN
          </Tabs.Trigger>
          <Tabs.Trigger value="stats">
            <BarChartIcon />
            &nbsp;Stats
          </Tabs.Trigger>
          <Tabs.Trigger value="logs">
            <ExclamationTriangleIcon />
            &nbsp;Logs
          </Tabs.Trigger>
        </Tabs.List>

        <Tabs.Content value="drafts">
          <DraftReviewPanel />
        </Tabs.Content>
      </Tabs.Root>
    </Container>
  );
}

function AdminGuard({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();

  if (!user) {
    return (
      <Container size="3" p="8">
        <Text color="gray">Loading…</Text>
      </Container>
    );
  }

  if (user.email?.toLowerCase() !== ADMIN_EMAIL.toLowerCase()) {
    return (
      <Container size="3" p="8">
        <Callout.Root color="red" role="alert">
          <Callout.Icon>
            <ExclamationTriangleIcon />
          </Callout.Icon>
          <Callout.Text>
            <Heading size="3" as="h2" mb="1">Access denied</Heading>
            This page is restricted to administrators.{" "}
            <Link href="/" className={button({ variant: "ghost", size: "sm" })}>← Back to Jobs</Link>
          </Callout.Text>
        </Callout.Root>
      </Container>
    );
  }

  return <>{children}</>;
}

export default function EmailDraftsPage() {
  return (
    <AdminGuard>
      <Suspense
        fallback={
          <Container size="3" p="8">
            <Text color="gray">Loading…</Text>
          </Container>
        }
      >
        <DraftsPageContent />
      </Suspense>
    </AdminGuard>
  );
}
