import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { Box, Card, Flex, Heading, Separator, Skeleton, Text } from "@radix-ui/themes";
import { Suspense } from "react";
import { AddConditionForm } from "./add-form";
import { deleteCondition } from "./actions";
import { DeleteConfirmButton } from "@/components/delete-confirm-button";
import { Heart } from "lucide-react";
import { gqlQuery } from "@/lib/graphql/execute";
import { GetConditionsDocument } from "@/lib/graphql/__generated__/graphql";
import Link from "next/link";

async function ConditionsList() {
  const supabase = await createClient();
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) redirect("/auth/login");

  const data = await gqlQuery(GetConditionsDocument, {}, session.access_token);
  const conditions = data.conditionsCollection?.edges.map((e) => e.node) ?? [];

  if (conditions.length === 0) {
    return (
      <Flex direction="column" align="center" gap="3" py="6">
        <Heart size={48} color="var(--gray-8)" />
        <Heading size="4">No conditions yet</Heading>
        <Text size="2" color="gray">Add a condition above to start tracking your health.</Text>
      </Flex>
    );
  }

  return (
    <>
      <Separator size="4" />
      <Flex direction="column" gap="2">
        <Heading size="4">Your conditions</Heading>
        {conditions.map((c) => (
          <Card key={c.id} asChild className="card-hover">
            <Link href={`/protected/conditions/${c.id}`} style={{ textDecoration: "none" }}>
              <Flex justify="between" align="start">
                <Flex direction="column" gap="1">
                  <Text size="2" weight="medium">{c.name}</Text>
                  {c.notes && <Text size="1" color="gray">{c.notes}</Text>}
                  <Text size="1" color="gray">{new Date(c.created_at).toLocaleDateString()}</Text>
                </Flex>
                <DeleteConfirmButton
                  action={deleteCondition.bind(null, c.id)}
                  description="This condition will be permanently removed."
                  stopPropagation
                />
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
        <Flex direction="column" gap="1">
          <Heading size="7" weight="bold">Conditions</Heading>
          <Text size="2" color="gray">Track and manage your health conditions.</Text>
        </Flex>

        <Separator size="4" />

        <Flex direction="column" gap="3">
          <Heading size="4">Add a condition</Heading>
          <AddConditionForm />
        </Flex>

        <Suspense fallback={
          <Flex direction="column" gap="2">
            <Skeleton height="52px" />
            <Skeleton height="52px" />
            <Skeleton height="52px" />
          </Flex>
        }>
          <ConditionsList />
        </Suspense>
      </Flex>
    </Box>
  );
}
