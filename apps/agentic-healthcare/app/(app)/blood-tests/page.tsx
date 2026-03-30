import { withAuth } from "@/lib/auth-helpers";
import { db } from "@/lib/db";
import { bloodTests } from "@/lib/db/schema";
import { eq, desc } from "drizzle-orm";
import Link from "next/link";
import { Badge, Box, Flex, Heading, Separator, Skeleton, Text } from "@radix-ui/themes";
import { Suspense } from "react";
import { Droplet } from "lucide-react";
import { UploadForm } from "./upload-form";
import { css } from "styled-system/css";

const statusColor: Record<string, "green" | "red" | "yellow" | "gray"> = {
  done: "green",
  error: "red",
  processing: "yellow",
  pending: "gray",
};

const rowClass = css({
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  padding: "var(--space-3) var(--space-4)",
  borderRadius: "var(--radius-2)",
  textDecoration: "none",
  color: "inherit",
  transition: "background 150ms ease",
  _hover: {
    background: "var(--gray-a2)",
  },
});

const tableContainerClass = css({
  border: "1px solid var(--gray-a5)",
  borderRadius: "var(--radius-3)",
  overflow: "hidden",
});

const tableHeaderClass = css({
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  padding: "var(--space-2) var(--space-4)",
  background: "var(--gray-a2)",
  borderBottom: "1px solid var(--gray-a5)",
});

const rowDividerClass = css({
  borderTop: "1px solid var(--gray-a4)",
});

async function TestsList() {
  const { userId } = await withAuth();

  const tests = await db
    .select()
    .from(bloodTests)
    .where(eq(bloodTests.userId, userId))
    .orderBy(desc(bloodTests.uploadedAt));

  if (tests.length === 0) {
    return (
      <Flex direction="column" align="center" gap="3" py="9">
        <Droplet size={48} color="var(--gray-8)" />
        <Heading size="4">No blood tests yet</Heading>
        <Text size="2" color="gray">Upload your first blood test to start tracking your markers.</Text>
      </Flex>
    );
  }

  return (
    <Flex direction="column" gap="3">
      <Heading size="4">History</Heading>
      <div className={tableContainerClass}>
        <div className={tableHeaderClass}>
          <Text size="1" weight="medium" color="gray">FILE NAME</Text>
          <Flex gap="6" align="center">
            <Text size="1" weight="medium" color="gray">DATE</Text>
            <Text size="1" weight="medium" color="gray">STATUS</Text>
          </Flex>
        </div>
        {tests.map((test, i) => (
          <div key={test.id} className={i > 0 ? rowDividerClass : undefined}>
            <Link href={`/blood-tests/${test.id}`} className={rowClass}>
              <Flex direction="column" gap="1">
                <Text size="2" weight="medium">{test.fileName}</Text>
              </Flex>
              <Flex align="center" gap="6">
                <Text size="2" color="gray">
                  {test.testDate
                    ? new Date(test.testDate).toLocaleDateString()
                    : new Date(test.uploadedAt).toLocaleDateString()}
                </Text>
                <Badge color={statusColor[test.status] ?? "gray"} variant="soft">
                  {test.status}
                </Badge>
              </Flex>
            </Link>
          </div>
        ))}
      </div>
    </Flex>
  );
}

export default function BloodTestsPage() {
  return (
    <Box py="6">
      <Flex direction="column" gap="6">
        <Flex justify="between" align="start">
          <Flex direction="column" gap="1">
            <Heading size="7" weight="bold">Blood Tests</Heading>
            <Text size="2" color="gray">Upload and review your blood test results.</Text>
          </Flex>
        </Flex>

        <Separator size="4" />

        <Flex direction="column" gap="3">
          <Heading size="4">Upload a new test</Heading>
          <UploadForm />
        </Flex>

        <Suspense fallback={
          <Flex direction="column" gap="2">
            <Skeleton height="52px" />
            <Skeleton height="52px" />
            <Skeleton height="52px" />
          </Flex>
        }>
          <TestsList />
        </Suspense>
      </Flex>
    </Box>
  );
}
