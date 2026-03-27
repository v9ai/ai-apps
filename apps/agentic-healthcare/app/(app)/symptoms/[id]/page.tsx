import { withAuth } from "@/lib/auth-helpers";
import { db } from "@/lib/db";
import { symptoms } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import { Badge, Box, Flex, Heading, Separator, Skeleton, Text } from "@radix-ui/themes";
import Link from "next/link";
import { Suspense } from "react";
import { deleteSymptom } from "../actions";
import { redirect } from "next/navigation";
import { DeleteConfirmButton } from "@/components/delete-confirm-button";

const severityColor = {
  mild: "green" as const,
  moderate: "orange" as const,
  severe: "red" as const,
};

async function SymptomDetail({ id }: { id: string }) {
  const { userId } = await withAuth();

  const [symptom] = await db
    .select()
    .from(symptoms)
    .where(eq(symptoms.id, id));

  if (!symptom || symptom.userId !== userId) notFound();

  return (
    <>
      <Flex justify="between" align="start">
        <Flex direction="column" gap="1">
          <Heading size="6">{symptom.description}</Heading>
          <Flex align="center" gap="2">
            {symptom.severity && (
              <Badge color={severityColor[symptom.severity as keyof typeof severityColor]} variant="soft">
                {symptom.severity}
              </Badge>
            )}
            <Text size="2" color="gray">
              {new Date(symptom.loggedAt).toLocaleString()}
            </Text>
          </Flex>
        </Flex>
        <DeleteConfirmButton
          action={async () => {
            "use server";
            await deleteSymptom(id);
            redirect("/symptoms");
          }}
          description="This symptom will be permanently deleted."
          variant="icon-red"
        />
      </Flex>

      <Separator size="4" />

      <Flex direction="column" gap="1">
        <Text size="2" weight="medium" color="gray">Logged</Text>
        <Text size="3">{new Date(symptom.loggedAt).toLocaleString()}</Text>
      </Flex>
    </>
  );
}

export default async function SymptomDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  return (
    <Box py="8" style={{ maxWidth: 600, margin: "0 auto" }}>
      <Flex direction="column" gap="6">
        <Text size="2" asChild>
          <Link href="/symptoms" style={{ color: "var(--gray-9)" }}>
            ← Back
          </Link>
        </Text>
        <Suspense fallback={
          <Flex direction="column" gap="4">
            <Skeleton height="32px" width="200px" />
            <Skeleton height="120px" />
          </Flex>
        }>
          <SymptomDetail id={id} />
        </Suspense>
      </Flex>
    </Box>
  );
}
