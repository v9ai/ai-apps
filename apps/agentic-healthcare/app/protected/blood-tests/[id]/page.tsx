import { createClient } from "@/lib/supabase/server";
import { redirect, notFound } from "next/navigation";
import { Badge, Box, Button, Callout, Flex, Heading, Separator, Table, Text } from "@radix-ui/themes";
import Link from "next/link";
import { Suspense } from "react";
import { deleteBloodTest } from "../actions";
import { gqlQuery } from "@/lib/graphql/execute";
import { GetBloodTestDocument } from "@/lib/graphql/__generated__/graphql";

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

async function TestDetail({ id }: { id: string }) {
  const supabase = await createClient();
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) redirect("/auth/login");

  const data = await gqlQuery(GetBloodTestDocument, { id }, session.access_token);
  const test = data.blood_testsCollection?.edges[0]?.node;

  if (!test || test.user_id !== session.user.id) notFound();

  const markers = data.blood_markersCollection?.edges.map((e) => e.node) ?? [];

  return (
    <>
      <Flex justify="between" align="start">
        <Flex direction="column" gap="1">
          <Heading size="6">{test.file_name}</Heading>
          <Text size="2" color="gray">
            {test.test_date
              ? new Date(test.test_date).toLocaleDateString()
              : new Date(test.uploaded_at).toLocaleString()}
          </Text>
        </Flex>
        <Flex align="center" gap="3">
          <Badge color={statusColor[test.status] ?? "gray"} variant="soft">
            {test.status}
          </Badge>
          <form
            action={async () => {
              "use server";
              await deleteBloodTest(id);
            }}
          >
            <Button type="submit" color="red" variant="soft" size="1">
              Delete
            </Button>
          </form>
        </Flex>
      </Flex>

      <Separator size="4" />

      {test.status === "error" && (
        <Callout.Root color="red">
          <Callout.Text>{test.error_message}</Callout.Text>
        </Callout.Root>
      )}

      {test.status === "processing" && (
        <Callout.Root color="yellow">
          <Callout.Text>Still processing — refresh in a moment.</Callout.Text>
        </Callout.Root>
      )}

      {markers && markers.length > 0 ? (
        <Table.Root variant="surface">
          <Table.Header>
            <Table.Row>
              <Table.ColumnHeaderCell>Marker</Table.ColumnHeaderCell>
              <Table.ColumnHeaderCell>Value</Table.ColumnHeaderCell>
              <Table.ColumnHeaderCell>Unit</Table.ColumnHeaderCell>
              <Table.ColumnHeaderCell>Reference</Table.ColumnHeaderCell>
              <Table.ColumnHeaderCell>Flag</Table.ColumnHeaderCell>
            </Table.Row>
          </Table.Header>
          <Table.Body>
            {markers.map((m) => (
              <Table.Row key={m.id}>
                <Table.Cell><Text weight="medium">{m.name}</Text></Table.Cell>
                <Table.Cell>{m.value}</Table.Cell>
                <Table.Cell><Text color="gray">{m.unit}</Text></Table.Cell>
                <Table.Cell><Text color="gray">{m.reference_range}</Text></Table.Cell>
                <Table.Cell>
                  <Badge color={flagColor[m.flag ?? "normal"] ?? "green"} variant="soft">
                    {m.flag ?? "normal"}
                  </Badge>
                </Table.Cell>
              </Table.Row>
            ))}
          </Table.Body>
        </Table.Root>
      ) : (
        test.status === "done" && (
          <Text size="2" color="gray">
            No markers could be extracted. The format may not be supported.
          </Text>
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
    <Box py="8" style={{ maxWidth: 800, margin: "0 auto" }}>
      <Flex direction="column" gap="6">
        <Text size="2" asChild>
          <Link href="/protected/blood-tests" style={{ color: "var(--gray-9)" }}>
            ← Back
          </Link>
        </Text>
        <Suspense fallback={<Text size="2" color="gray">Loading...</Text>}>
          <TestDetail id={id} />
        </Suspense>
      </Flex>
    </Box>
  );
}
