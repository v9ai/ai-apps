import { withAuth } from "@/lib/auth-helpers";
import { db } from "@/lib/db";
import { conditions } from "@/lib/db/schema";
import { eq, desc } from "drizzle-orm";
import { Badge, Box, Card, Flex, Heading, Separator, Skeleton, Text } from "@radix-ui/themes";
import { Suspense } from "react";
import { AddConditionForm } from "./add-form";
import { deleteCondition } from "./actions";
import { DeleteConfirmButton } from "@/components/delete-confirm-button";
import { Heart } from "lucide-react";
import Link from "next/link";
import { css } from "styled-system/css";

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

async function ConditionsList() {
  const { userId } = await withAuth();

  const rows = await db
    .select()
    .from(conditions)
    .where(eq(conditions.userId, userId))
    .orderBy(desc(conditions.createdAt));

  if (rows.length === 0) {
    return (
      <Flex direction="column" align="center" gap="3" py="9">
        <Heart size={48} color="var(--gray-8)" />
        <Heading size="4">No conditions yet</Heading>
        <Text size="2" color="gray">Add a condition above to start tracking your health.</Text>
      </Flex>
    );
  }

  return (
    <>
      <Separator size="4" />
      <Flex direction="column" gap="3">
        <Heading size="4">Your conditions</Heading>
        <div className={cardGridClass}>
          {rows.map((c) => (
            <Card key={c.id} asChild className="card-hover">
              <Link href={`/conditions/${c.id}`} className={cardLinkClass}>
                <Flex justify="between" align="start" height="100%">
                  <Flex direction="column" gap="2" flexGrow="1">
                    <Flex align="center" gap="2" wrap="wrap">
                      <Text size="2" weight="medium">{c.name}</Text>
                      <Badge color="indigo" variant="soft" size="1">Active</Badge>
                    </Flex>
                    {c.notes && (
                      <Text size="1" color="gray" className={css({ lineClamp: "2" })}>
                        {c.notes}
                      </Text>
                    )}
                    <Text size="1" color="gray">
                      Added {new Date(c.createdAt).toLocaleDateString()}
                    </Text>
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
        </div>
      </Flex>
    </>
  );
}

const skeletonGridClass = css({
  display: "grid",
  gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
  gap: "4",
});

export default function ConditionsPage() {
  return (
    <Box py="6">
      <Flex direction="column" gap="6">
        <Flex justify="between" align="center" wrap="wrap" gap="3">
          <Flex direction="column" gap="1">
            <Heading size="7" weight="bold">Conditions</Heading>
            <Text size="2" color="gray">Track and manage your health conditions.</Text>
          </Flex>
        </Flex>

        <Separator size="4" />

        <Flex direction="column" gap="3">
          <Heading size="4">Add a condition</Heading>
          <AddConditionForm />
        </Flex>

        <Suspense fallback={
          <div className={skeletonGridClass}>
            <Skeleton height="80px" />
            <Skeleton height="80px" />
            <Skeleton height="80px" />
          </div>
        }>
          <ConditionsList />
        </Suspense>
      </Flex>
    </Box>
  );
}
