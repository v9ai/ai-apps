import { withAuth } from "@/lib/auth-helpers";
import { db } from "@/lib/db";
import { conditions } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import { Box, Button, Card, Flex, Skeleton, Text } from "@radix-ui/themes";
import Link from "next/link";
import { Suspense } from "react";
import { deleteCondition } from "../actions";
import { redirect } from "next/navigation";
import { EditNotesForm } from "../edit-notes-form";
import { EditConditionHeader } from "../edit-condition-header";
import { RelatedMarkers } from "../related-markers";
import { ConditionResearch } from "../condition-research";
import { ChevronLeftIcon } from "@radix-ui/react-icons";

async function ConditionDetail({ id }: { id: string }) {
  const { userId } = await withAuth();

  const [condition] = await db
    .select()
    .from(conditions)
    .where(eq(conditions.id, id));

  if (!condition || condition.userId !== userId) notFound();

  return (
    <>
      <EditConditionHeader
        conditionId={condition.id}
        initialName={condition.name}
        createdAt={condition.createdAt.toISOString()}
        deleteAction={async () => {
          "use server";
          await deleteCondition(id);
          redirect("/conditions");
        }}
      />

      <EditNotesForm conditionId={condition.id} initialNotes={condition.notes ?? null} />

      <Suspense fallback={
        <Card>
          <Flex direction="column" gap="3">
            <Skeleton height="20px" width="180px" />
            <Skeleton height="60px" />
            <Skeleton height="60px" />
          </Flex>
        </Card>
      }>
        <RelatedMarkers conditionId={condition.id} />
      </Suspense>

      <Suspense fallback={
        <Card>
          <Flex direction="column" gap="3">
            <Skeleton height="20px" width="200px" />
            <Skeleton height="120px" />
          </Flex>
        </Card>
      }>
        <ConditionResearch conditionId={condition.id} />
      </Suspense>
    </>
  );
}

export default async function ConditionDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  return (
    <Box py="8" style={{ maxWidth: 700, margin: "0 auto" }}>
      <Flex direction="column" gap="5">
        <Button variant="ghost" size="1" asChild style={{ alignSelf: "flex-start" }}>
          <Link href="/conditions">
            <ChevronLeftIcon /> Back to conditions
          </Link>
        </Button>
        <Suspense fallback={
          <Flex direction="column" gap="4">
            <Card>
              <Flex direction="column" gap="3">
                <Skeleton height="48px" width="260px" />
                <Skeleton height="16px" width="140px" />
              </Flex>
            </Card>
            <Card><Skeleton height="100px" /></Card>
            <Card><Skeleton height="120px" /></Card>
          </Flex>
        }>
          <ConditionDetail id={id} />
        </Suspense>
      </Flex>
    </Box>
  );
}
