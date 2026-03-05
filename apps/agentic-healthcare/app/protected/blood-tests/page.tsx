import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Badge, Box, Card, Flex, Heading, Separator, Skeleton, Text } from "@radix-ui/themes";
import { Suspense } from "react";
import { Droplet } from "lucide-react";
import { UploadForm } from "./upload-form";
import { gqlQuery } from "@/lib/graphql/execute";
import { GetBloodTestsDocument } from "@/lib/graphql/__generated__/graphql";

const statusColor: Record<string, "green" | "red" | "yellow" | "gray"> = {
  done: "green",
  error: "red",
  processing: "yellow",
  pending: "gray",
};

async function TestsList() {
  const supabase = await createClient();
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) redirect("/auth/login");

  const data = await gqlQuery(GetBloodTestsDocument, {}, session.access_token);
  const tests = data.blood_testsCollection?.edges.map((e) => e.node) ?? [];

  if (tests.length === 0) {
    return (
      <Flex direction="column" align="center" gap="3" py="6">
        <Droplet size={48} color="var(--gray-8)" />
        <Heading size="4">No blood tests yet</Heading>
        <Text size="2" color="gray">Upload your first blood test to start tracking your markers.</Text>
      </Flex>
    );
  }

  return (
    <>
      <Separator size="4" />
      <Flex direction="column" gap="2">
        <Heading size="4">History</Heading>
        {tests.map((test) => (
          <Card key={test.id} asChild className="card-hover">
            <Link href={`/protected/blood-tests/${test.id}`} style={{ textDecoration: "none" }}>
              <Flex justify="between" align="center">
                <Flex direction="column" gap="1">
                  <Text size="2" weight="medium">{test.file_name}</Text>
                  <Text size="1" color="gray">
                    {test.test_date
                      ? new Date(test.test_date).toLocaleDateString()
                      : new Date(test.uploaded_at).toLocaleDateString()}
                  </Text>
                </Flex>
                <Badge color={statusColor[test.status] ?? "gray"} variant="soft">
                  {test.status}
                </Badge>
              </Flex>
            </Link>
          </Card>
        ))}
      </Flex>
    </>
  );
}

export default function BloodTestsPage() {
  return (
    <Box py="8" style={{ maxWidth: 600, margin: "0 auto" }}>
      <Flex direction="column" gap="6">
        <Flex direction="column" gap="1">
          <Heading size="7" weight="bold">Blood Tests</Heading>
          <Text size="2" color="gray">Upload and review your blood test results.</Text>
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
