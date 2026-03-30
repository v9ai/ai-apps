import { withAuth } from "@/lib/auth-helpers";
import { db } from "@/lib/db";
import { symptoms } from "@/lib/db/schema";
import { eq, desc } from "drizzle-orm";
import { Badge, Box, Card, Flex, Heading, Separator, Skeleton, Text } from "@radix-ui/themes";
import { Suspense } from "react";
import { AddSymptomForm } from "./add-form";
import { deleteSymptom } from "./actions";
import { DeleteConfirmButton } from "@/components/delete-confirm-button";
import { Activity } from "lucide-react";
import Link from "next/link";
import { css } from "styled-system/css";

const severityColor = {
  mild: "green" as const,
  moderate: "orange" as const,
  severe: "red" as const,
};

const cardGridClass = css({
  display: "grid",
  gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
  gap: "4",
});

const cardLinkClass = css({
  textDecoration: "none",
  display: "block",
  height: "100%",
});

const skeletonGridClass = css({
  display: "grid",
  gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
  gap: "4",
});

async function SymptomsList() {
  const { userId } = await withAuth();

  const rows = await db
    .select()
    .from(symptoms)
    .where(eq(symptoms.userId, userId))
    .orderBy(desc(symptoms.loggedAt));

  if (!rows.length) {
    return (
      <Flex direction="column" align="center" gap="3" py="9">
        <Activity size={48} color="var(--gray-8)" />
        <Heading size="4">No symptoms logged</Heading>
        <Text size="2" color="gray">Log a symptom above to start your health journal.</Text>
      </Flex>
    );
  }

  return (
    <>
      <Separator size="4" />
      <Flex direction="column" gap="3">
        <Heading size="4">Symptom journal</Heading>
        <div className={cardGridClass}>
          {rows.map((s) => (
            <Card key={s.id} asChild className="card-hover">
              <Link href={`/symptoms/${s.id}`} className={cardLinkClass}>
                <Flex justify="between" align="start" height="100%">
                  <Flex direction="column" gap="2" flexGrow="1">
                    <Flex align="center" gap="2" wrap="wrap">
                      <Text size="2" weight="medium">{s.description}</Text>
                      {s.severity && (
                        <Badge
                          color={severityColor[s.severity as keyof typeof severityColor]}
                          variant="soft"
                          size="1"
                        >
                          {s.severity}
                        </Badge>
                      )}
                    </Flex>
                    <Text size="1" color="gray">
                      {new Date(s.loggedAt).toLocaleString()}
                    </Text>
                  </Flex>
                  <DeleteConfirmButton
                    action={deleteSymptom.bind(null, s.id)}
                    description="This symptom entry will be permanently removed."
                    stopPropagation
                  />
                </Flex>
              </Link>
            </Card>
          ))}
        </div>
      </Flex>
    </>
  );
}

export default function SymptomsPage() {
  return (
    <Box py="6">
      <Flex direction="column" gap="6">
        <Flex justify="between" align="center" wrap="wrap" gap="3">
          <Flex direction="column" gap="1">
            <Heading size="7" weight="bold">Symptoms</Heading>
            <Text size="2" color="gray">Log and monitor your symptoms over time.</Text>
          </Flex>
        </Flex>

        <Separator size="4" />

        <Flex direction="column" gap="3">
          <Heading size="4">Log a symptom</Heading>
          <AddSymptomForm />
        </Flex>

        <Suspense fallback={
          <div className={skeletonGridClass}>
            <Skeleton height="80px" />
            <Skeleton height="80px" />
            <Skeleton height="80px" />
          </div>
        }>
          <SymptomsList />
        </Suspense>
      </Flex>
    </Box>
  );
}
