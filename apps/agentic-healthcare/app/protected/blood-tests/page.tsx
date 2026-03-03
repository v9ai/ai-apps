import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Badge, Box, Card, Flex, Heading, Separator, Text } from "@radix-ui/themes";
import { Suspense } from "react";
import { UploadForm } from "./upload-form";

const statusColor: Record<string, "green" | "red" | "yellow" | "gray"> = {
  done: "green",
  error: "red",
  processing: "yellow",
  pending: "gray",
};

async function TestsList() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  const { data: tests } = await supabase
    .from("blood_tests")
    .select("*")
    .order("uploaded_at", { ascending: false });

  if (!tests || tests.length === 0) return null;

  return (
    <>
      <Separator size="4" />
      <Flex direction="column" gap="2">
        <Heading size="3">History</Heading>
        {tests.map((test) => (
          <Card key={test.id} asChild>
            <Link href={`/protected/blood-tests/${test.id}`} style={{ textDecoration: "none" }}>
              <Flex justify="between" align="center">
                <Flex direction="column" gap="1">
                  <Text size="2" weight="medium">{test.file_name}</Text>
                  <Text size="1" color="gray">{new Date(test.uploaded_at).toLocaleDateString()}</Text>
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
        <Heading size="6">Blood Tests</Heading>

        <Separator size="4" />

        <Flex direction="column" gap="3">
          <Heading size="3">Upload a new test</Heading>
          <UploadForm />
        </Flex>

        <Suspense fallback={null}>
          <TestsList />
        </Suspense>
      </Flex>
    </Box>
  );
}
