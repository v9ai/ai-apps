import { createClient } from "@/lib/supabase/server";
import { redirect, notFound } from "next/navigation";
import { Box, Flex, Heading, Separator, Skeleton, Text } from "@radix-ui/themes";
import Link from "next/link";
import { Suspense } from "react";
import { gqlQuery } from "@/lib/graphql/execute";
import { GetConditionDocument } from "@/lib/graphql/__generated__/graphql";
import { deleteCondition } from "../actions";
import { DeleteConfirmButton } from "@/components/delete-confirm-button";
import { EditNotesForm } from "../edit-notes-form";
import { RelatedMarkers } from "../related-markers";

async function ConditionDetail({ id }: { id: string }) {
  const supabase = await createClient();
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) redirect("/auth/login");

  const data = await gqlQuery(GetConditionDocument, { id }, session.access_token);
  const condition = data.conditionsCollection?.edges[0]?.node;

  if (!condition || condition.user_id !== session.user.id) notFound();

  return (
    <>
      <Flex justify="between" align="start">
        <Flex direction="column" gap="1">
          <Heading size="6">{condition.name}</Heading>
          <Text size="2" color="gray">
            Added {new Date(condition.created_at).toLocaleDateString()}
          </Text>
        </Flex>
        <DeleteConfirmButton
          action={async () => {
            "use server";
            await deleteCondition(id);
            redirect("/protected/conditions");
          }}
          description="This condition and its notes will be permanently deleted."
          variant="icon-red"
        />
      </Flex>

      <Separator size="4" />

      <EditNotesForm conditionId={condition.id} initialNotes={condition.notes ?? null} />

      <Separator size="4" />

      <Suspense fallback={<Text size="2" color="gray">Finding related markers...</Text>}>
        <RelatedMarkers conditionId={condition.id} />
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
    <Box py="8" style={{ maxWidth: 600, margin: "0 auto" }}>
      <Flex direction="column" gap="6">
        <Text size="2" asChild>
          <Link href="/protected/conditions" style={{ color: "var(--gray-9)" }}>
            ← Back
          </Link>
        </Text>
        <Suspense fallback={
          <Flex direction="column" gap="4">
            <Skeleton height="32px" width="200px" />
            <Skeleton height="120px" />
          </Flex>
        }>
          <ConditionDetail id={id} />
        </Suspense>
      </Flex>
    </Box>
  );
}
