import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { Box, Card, Flex, Heading, IconButton, Separator, Text } from "@radix-ui/themes";
import { Suspense } from "react";
import { AddConditionForm } from "./add-form";
import { deleteCondition } from "./actions";
import { Cross2Icon } from "@radix-ui/react-icons";
import { gqlQuery } from "@/lib/graphql/execute";
import { GetConditionsDocument } from "@/lib/graphql/__generated__/graphql";
import Link from "next/link";

async function ConditionsList() {
  const supabase = await createClient();
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) redirect("/auth/login");

  const data = await gqlQuery(GetConditionsDocument, {}, session.access_token);
  const conditions = data.conditionsCollection?.edges.map((e) => e.node) ?? [];

  if (conditions.length === 0) return null;

  return (
    <>
      <Separator size="4" />
      <Flex direction="column" gap="2">
        <Heading size="3">Your conditions</Heading>
        {conditions.map((c) => (
          <Card key={c.id} asChild>
            <Link href={`/protected/conditions/${c.id}`} style={{ textDecoration: "none" }}>
              <Flex justify="between" align="start">
                <Flex direction="column" gap="1">
                  <Text size="2" weight="medium">{c.name}</Text>
                  {c.notes && <Text size="1" color="gray">{c.notes}</Text>}
                  <Text size="1" color="gray">{new Date(c.created_at).toLocaleDateString()}</Text>
                </Flex>
                <form
                  action={deleteCondition.bind(null, c.id)}
                  onClick={(e) => e.stopPropagation()}
                >
                  <IconButton type="submit" variant="ghost" color="gray" size="1" aria-label="Remove">
                    <Cross2Icon />
                  </IconButton>
                </form>
              </Flex>
            </Link>
          </Card>
        ))}
      </Flex>
    </>
  );
}

export default function ConditionsPage() {
  return (
    <Box py="8" style={{ maxWidth: 600, margin: "0 auto" }}>
      <Flex direction="column" gap="6">
        <Heading size="6">Conditions</Heading>

        <Separator size="4" />

        <Flex direction="column" gap="3">
          <Heading size="3">Add a condition</Heading>
          <AddConditionForm />
        </Flex>

        <Suspense fallback={null}>
          <ConditionsList />
        </Suspense>
      </Flex>
    </Box>
  );
}
