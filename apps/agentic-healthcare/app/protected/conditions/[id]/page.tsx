import { createClient } from "@/lib/supabase/server";
import { redirect, notFound } from "next/navigation";
import { Box, Button, Card, Flex, Skeleton, Text } from "@radix-ui/themes";
import Link from "next/link";
import { Suspense } from "react";
import { gqlQuery } from "@/lib/graphql/execute";
import { GetConditionDocument } from "@/lib/graphql/__generated__/graphql";
import { deleteCondition } from "../actions";
import { EditNotesForm } from "../edit-notes-form";
import { EditConditionHeader } from "../edit-condition-header";
import { RelatedMarkers } from "../related-markers";
import { ConditionResearch } from "../condition-research";
import { ChevronLeftIcon } from "@radix-ui/react-icons";

async function ConditionDetail({ id }: { id: string }) {
  const supabase = await createClient();
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) redirect("/auth/login");

  const data = await gqlQuery(GetConditionDocument, { id }, session.access_token);
  const condition = data.conditionsCollection?.edges[0]?.node;

  if (!condition || condition.user_id !== session.user.id) notFound();

  return (
    <>
      <EditConditionHeader
        conditionId={condition.id}
        initialName={condition.name}
        createdAt={condition.created_at}
        deleteAction={async () => {
          "use server";
          await deleteCondition(id);
          redirect("/protected/conditions");
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
          <Link href="/protected/conditions">
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
