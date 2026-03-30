import { withAuth } from "@/lib/auth-helpers";
import { db } from "@/lib/db";
import { bloodTests, bloodMarkers } from "@/lib/db/schema";
import { eq, asc } from "drizzle-orm";
import { notFound } from "next/navigation";
import { Badge, Box, Callout, Flex, Grid, Heading, Separator, Skeleton, Text } from "@radix-ui/themes";
import Link from "next/link";
import { Suspense } from "react";
import { deleteBloodTest } from "../actions";
import { DeleteConfirmButton } from "@/components/delete-confirm-button";
import { css } from "styled-system/css";

const statusColor: Record<string, "green" | "red" | "yellow" | "gray"> = {
  done: "green",
  error: "red",
  processing: "yellow",
  pending: "gray",
};

const flagColor: Record<string, "blue" | "red" | "green"> = {
  low: "blue",
  high: "red",
  normal: "green",
};

const backLinkClass = css({
  color: "var(--gray-9)",
  textDecoration: "none",
  display: "inline-flex",
  alignItems: "center",
  gap: "var(--space-1)",
  _hover: {
    color: "var(--gray-11)",
  },
  transition: "color 150ms ease",
});

const tableContainerClass = css({
  border: "1px solid var(--gray-a5)",
  borderRadius: "var(--radius-3)",
  overflow: "hidden",
  width: "100%",
});

const tableHeaderRowClass = css({
  display: "grid",
  gridTemplateColumns: "2fr 1fr 1fr 2fr 1fr",
  padding: "var(--space-2) var(--space-4)",
  background: "var(--gray-a2)",
  borderBottom: "1px solid var(--gray-a5)",
  gap: "var(--space-4)",
});

const markerRowClass = css({
  display: "grid",
  gridTemplateColumns: "2fr 1fr 1fr 2fr 1fr",
  padding: "var(--space-3) var(--space-4)",
  borderTop: "1px solid var(--gray-a4)",
  gap: "var(--space-4)",
  alignItems: "center",
  transition: "background 150ms ease",
  _hover: {
    background: "var(--gray-a2)",
  },
});

const valueNormalClass = css({
  color: "var(--green-11)",
  fontWeight: "500",
});

const valueHighClass = css({
  color: "var(--red-11)",
  fontWeight: "500",
});

const valueLowClass = css({
  color: "var(--blue-11)",
  fontWeight: "500",
});

function getValueClass(flag: string | null) {
  if (flag === "high") return valueHighClass;
  if (flag === "low") return valueLowClass;
  return valueNormalClass;
}

async function TestDetail({ id }: { id: string }) {
  const { userId } = await withAuth();

  const [test] = await db
    .select()
    .from(bloodTests)
    .where(eq(bloodTests.id, id));

  if (!test || test.userId !== userId) notFound();

  const markers = await db
    .select()
    .from(bloodMarkers)
    .where(eq(bloodMarkers.testId, id))
    .orderBy(asc(bloodMarkers.name));

  return (
    <>
      <Flex justify="between" align="start" wrap="wrap" gap="3">
        <Flex direction="column" gap="1">
          <Heading size="6">{test.fileName}</Heading>
          <Text size="2" color="gray">
            {test.testDate
              ? new Date(test.testDate).toLocaleDateString()
              : new Date(test.uploadedAt).toLocaleString()}
          </Text>
        </Flex>
        <Flex align="center" gap="3">
          <Badge color={statusColor[test.status] ?? "gray"} variant="soft" size="2">
            {test.status}
          </Badge>
          <DeleteConfirmButton
            action={async () => {
              "use server";
              await deleteBloodTest(id);
            }}
            description="This blood test and its markers will be permanently deleted."
            variant="button"
          />
        </Flex>
      </Flex>

      <Separator size="4" />

      {test.status === "error" && (
        <Callout.Root color="red">
          <Callout.Text>{test.errorMessage}</Callout.Text>
        </Callout.Root>
      )}

      {test.status === "processing" && (
        <Callout.Root color="yellow">
          <Callout.Text>Still processing — refresh in a moment.</Callout.Text>
        </Callout.Root>
      )}

      {markers && markers.length > 0 ? (
        <Flex direction="column" gap="3">
          <Flex justify="between" align="center">
            <Heading size="4">Markers</Heading>
            <Text size="2" color="gray">{markers.length} result{markers.length !== 1 ? "s" : ""}</Text>
          </Flex>
          <div className={tableContainerClass}>
            <div className={tableHeaderRowClass}>
              <Text size="1" weight="medium" color="gray">MARKER</Text>
              <Text size="1" weight="medium" color="gray">VALUE</Text>
              <Text size="1" weight="medium" color="gray">UNIT</Text>
              <Text size="1" weight="medium" color="gray">REFERENCE</Text>
              <Text size="1" weight="medium" color="gray">FLAG</Text>
            </div>
            {markers.map((m) => (
              <div key={m.id} className={markerRowClass}>
                <Text size="2" weight="medium">{m.name}</Text>
                <Text size="2" className={getValueClass(m.flag)}>{m.value}</Text>
                <Text size="2" color="gray">{m.unit}</Text>
                <Text size="2" color="gray">{m.referenceRange}</Text>
                <Badge
                  color={flagColor[m.flag ?? "normal"] ?? "green"}
                  variant="soft"
                  size="1"
                >
                  {m.flag ?? "normal"}
                </Badge>
              </div>
            ))}
          </div>
        </Flex>
      ) : (
        test.status === "done" && (
          <Flex direction="column" align="center" gap="2" py="8">
            <Text size="3" weight="medium">No markers extracted</Text>
            <Text size="2" color="gray">
              No markers could be extracted. The format may not be supported.
            </Text>
          </Flex>
        )
      )}
    </>
  );
}

export default async function BloodTestDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  return (
    <Box py="6">
      <Flex direction="column" gap="6">
        <Text size="2" asChild>
          <Link href="/blood-tests" className={backLinkClass}>
            ← Back to Blood Tests
          </Link>
        </Text>
        <Suspense fallback={
          <Flex direction="column" gap="4">
            <Skeleton height="36px" width="280px" />
            <Skeleton height="400px" />
          </Flex>
        }>
          <TestDetail id={id} />
        </Suspense>
      </Flex>
    </Box>
  );
}
