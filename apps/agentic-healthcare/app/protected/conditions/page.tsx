import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { Box, Card, Flex, Heading, IconButton, Separator, Text } from "@radix-ui/themes";
import { Suspense } from "react";
import { AddConditionForm } from "./add-form";
import { deleteCondition } from "./actions";
import { Cross2Icon } from "@radix-ui/react-icons";

async function ConditionsList() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  const { data: conditions } = await supabase
    .from("conditions")
    .select("*")
    .order("created_at", { ascending: false });

  if (!conditions || conditions.length === 0) return null;

  return (
    <>
      <Separator size="4" />
      <Flex direction="column" gap="2">
        <Heading size="3">Your conditions</Heading>
        {conditions.map((c) => (
          <Card key={c.id}>
            <Flex justify="between" align="start">
              <Flex direction="column" gap="1">
                <Text size="2" weight="medium">{c.name}</Text>
                {c.notes && <Text size="1" color="gray">{c.notes}</Text>}
                <Text size="1" color="gray">{new Date(c.created_at).toLocaleDateString()}</Text>
              </Flex>
              <form action={deleteCondition.bind(null, c.id)}>
                <IconButton type="submit" variant="ghost" color="gray" size="1" aria-label="Remove">
                  <Cross2Icon />
                </IconButton>
              </form>
            </Flex>
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
