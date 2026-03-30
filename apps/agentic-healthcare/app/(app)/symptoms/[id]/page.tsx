import { withAuth } from "@/lib/auth-helpers";
import { db } from "@/lib/db";
import { symptoms } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import { Badge, Box, Button, Card, Flex, Heading, Separator, Skeleton, Text } from "@radix-ui/themes";
import Link from "next/link";
import { Suspense } from "react";
import { deleteSymptom } from "../actions";
import { redirect } from "next/navigation";
import { DeleteConfirmButton } from "@/components/delete-confirm-button";
import { ChevronLeftIcon } from "@radix-ui/react-icons";
import { Activity } from "lucide-react";
import { css } from "styled-system/css";

const severityColor = {
  mild: "green" as const,
  moderate: "orange" as const,
  severe: "red" as const,
};

const twoColClass = css({
  display: "grid",
  gridTemplateColumns: "1fr",
  gap: "5",
  "@media (min-width: 900px)": {
    gridTemplateColumns: "1fr 300px",
  },
});

const headerCardClass = css({
  background: "linear-gradient(135deg, var(--accent-a2), var(--indigo-a2))",
});

async function SymptomDetail({ id }: { id: string }) {
  const { userId } = await withAuth();

  const [symptom] = await db
    .select()
    .from(symptoms)
    .where(eq(symptoms.id, id));

  if (!symptom || symptom.userId !== userId) notFound();

  const severityKey = symptom.severity as keyof typeof severityColor | null;

  return (
    <div className={twoColClass}>
      {/* Main column */}
      <Flex direction="column" gap="5">
        <Card className={headerCardClass}>
          <Flex justify="between" align="start">
            <Flex align="start" gap="4">
              <Flex
                align="center"
                justify="center"
                className={css({
                  width: "48px",
                  height: "48px",
                  borderRadius: "var(--radius-3)",
                  background: "var(--accent-a3)",
                  flexShrink: "0",
                })}
              >
                <Activity size={24} style={{ color: "var(--accent-11)" }} />
              </Flex>
              <Flex direction="column" gap="2">
                <Heading size="6">{symptom.description}</Heading>
                <Flex align="center" gap="2" wrap="wrap">
                  {severityKey && severityColor[severityKey] && (
                    <Badge
                      color={severityColor[severityKey]}
                      variant="soft"
                      size="2"
                    >
                      {symptom.severity}
                    </Badge>
                  )}
                  <Text size="2" color="gray">
                    {new Date(symptom.loggedAt).toLocaleString()}
                  </Text>
                </Flex>
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
        </Card>

        <Card>
          <Flex direction="column" gap="3">
            <Heading size="3">Details</Heading>
            <Separator size="4" />
            <Flex direction="column" gap="1">
              <Text size="2" weight="medium" color="gray">Logged at</Text>
              <Text size="3">{new Date(symptom.loggedAt).toLocaleString()}</Text>
            </Flex>
            {severityKey && (
              <Flex direction="column" gap="1">
                <Text size="2" weight="medium" color="gray">Severity</Text>
                <Badge
                  color={severityColor[severityKey]}
                  variant="soft"
                  size="2"
                  className={css({ alignSelf: "flex-start" })}
                >
                  {symptom.severity}
                </Badge>
              </Flex>
            )}
          </Flex>
        </Card>
      </Flex>

      {/* Sidebar */}
      <Flex direction="column" gap="4">
        <Card>
          <Flex direction="column" gap="3">
            <Heading size="3">About severity</Heading>
            <Separator size="4" />
            <Flex direction="column" gap="2">
              <Flex align="center" gap="2">
                <Badge color="green" variant="soft" size="1">mild</Badge>
                <Text size="1" color="gray">Minor discomfort, no disruption</Text>
              </Flex>
              <Flex align="center" gap="2">
                <Badge color="orange" variant="soft" size="1">moderate</Badge>
                <Text size="1" color="gray">Noticeable, some impact on daily activity</Text>
              </Flex>
              <Flex align="center" gap="2">
                <Badge color="red" variant="soft" size="1">severe</Badge>
                <Text size="1" color="gray">Significant distress or disruption</Text>
              </Flex>
            </Flex>
          </Flex>
        </Card>
      </Flex>
    </div>
  );
}

export default async function SymptomDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  return (
    <Box py="6">
      <Flex direction="column" gap="5">
        <Button variant="ghost" size="1" asChild className={css({ alignSelf: "flex-start" })}>
          <Link href="/symptoms">
            <ChevronLeftIcon /> Back to symptoms
          </Link>
        </Button>
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
