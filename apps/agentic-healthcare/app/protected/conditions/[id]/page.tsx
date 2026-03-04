import { createClient } from "@/lib/supabase/server";
import { redirect, notFound } from "next/navigation";
import { Box, Flex, Heading, IconButton, Separator, Text } from "@radix-ui/themes";
import Link from "next/link";
import { Suspense } from "react";
import { gqlQuery } from "@/lib/graphql/execute";
import { GetConditionDocument } from "@/lib/graphql/__generated__/graphql";
import { deleteCondition } from "../actions";
import { Cross2Icon } from "@radix-ui/react-icons";

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
        <form
          action={async () => {
            "use server";
            await deleteCondition(id);
            redirect("/protected/conditions");
          }}
        >
          <IconButton type="submit" variant="soft" color="red" size="2" aria-label="Delete condition">
            <Cross2Icon />
          </IconButton>
        </form>
      </Flex>

      <Separator size="4" />

      {condition.notes ? (
        <Flex direction="column" gap="1">
          <Text size="2" weight="medium" color="gray">Notes</Text>
          <Text size="3">{condition.notes}</Text>
        </Flex>
      ) : (
        <Text size="2" color="gray">No notes added.</Text>
      )}
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
        <Suspense fallback={<Text size="2" color="gray">Loading...</Text>}>
          <ConditionDetail id={id} />
        </Suspense>
      </Flex>
    </Box>
  );
}
