"use client";

import { Suspense } from "react";
import Link from "next/link";
import {
  Box,
  Card,
  Container,
  Flex,
  Heading,
  Text,
} from "@radix-ui/themes";
import {
  ArrowLeftIcon,
  ExclamationTriangleIcon,
  Pencil1Icon,
} from "@radix-ui/react-icons";
import { button } from "@/recipes/button";
import { useAuth } from "@/lib/auth-hooks";
import { ADMIN_EMAIL } from "@/lib/constants";
import { DraftReviewPanel } from "@/components/emails/draft-review-panel";

function DraftsPageContent() {
  return (
    <Container size="4" p="8">
      <Flex justify="between" align="center" mb="6">
        <Box>
          <Flex align="center" gap="2" mb="1">
            <Pencil1Icon />
            <Heading size="7">Email Drafts</Heading>
          </Flex>
          <Text color="gray" size="2">
            Review, edit, approve, and regenerate AI-generated reply and follow-up drafts
          </Text>
        </Box>
        <Link href="/emails" className={button({ variant: "ghost", size: "md" })}>
          <ArrowLeftIcon /> Back to Emails
        </Link>
      </Flex>

      <DraftReviewPanel />
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
        <Card>
          <Flex direction="column" align="center" gap="4" p="4">
            <ExclamationTriangleIcon width="32" height="32" color="red" />
            <Heading size="5">Access denied</Heading>
            <Text color="gray">This page is restricted to administrators.</Text>
            <Link href="/" className={button({ variant: "ghost" })}>← Back to Jobs</Link>
          </Flex>
        </Card>
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
