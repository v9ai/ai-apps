import { withAuth } from "@/lib/auth-helpers";
import { db } from "@/lib/db";
import { familyMembers } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { notFound, redirect } from "next/navigation";
import { Box, Badge, Flex, Heading, Separator, Skeleton, Text } from "@radix-ui/themes";
import Link from "next/link";
import { Suspense } from "react";
import { deleteFamilyMember } from "../actions";
import { DeleteConfirmButton } from "@/components/delete-confirm-button";

async function FamilyMemberDetail({ id }: { id: string }) {
  const { userId } = await withAuth();

  const [member] = await db
    .select()
    .from(familyMembers)
    .where(eq(familyMembers.id, id));

  if (!member || member.userId !== userId) notFound();

  const age = member.dateOfBirth
    ? Math.floor(
        (Date.now() - new Date(member.dateOfBirth).getTime()) / (365.25 * 24 * 60 * 60 * 1000),
      )
    : null;

  return (
    <>
      <Flex justify="between" align="start">
        <Flex direction="column" gap="1">
          <Heading size="6">{member.name}</Heading>
          <Flex align="center" gap="2">
            {member.relationship && (
              <Badge color="gray" variant="soft">{member.relationship}</Badge>
            )}
            {age !== null && (
              <Text size="2" color="gray">{age} years old</Text>
            )}
          </Flex>
        </Flex>
        <DeleteConfirmButton
          action={async () => {
            "use server";
            await deleteFamilyMember(id);
            redirect("/family");
          }}
          description="This family member will be permanently deleted."
          variant="icon-red"
        />
      </Flex>

      <Separator size="4" />

      <Flex direction="column" gap="3">
        {member.dateOfBirth && (
          <Flex direction="column" gap="1">
            <Text size="2" weight="medium" color="gray">Date of birth</Text>
            <Text size="3">{new Date(member.dateOfBirth).toLocaleDateString()}</Text>
          </Flex>
        )}
        {member.notes ? (
          <Flex direction="column" gap="1">
            <Text size="2" weight="medium" color="gray">Notes</Text>
            <Text size="3" style={{ whiteSpace: "pre-wrap" }}>{member.notes}</Text>
          </Flex>
        ) : (
          !member.dateOfBirth && <Text size="2" color="gray">No additional details.</Text>
        )}
      </Flex>
    </>
  );
}

export default async function FamilyMemberDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  return (
    <Box py="8" style={{ maxWidth: 600, margin: "0 auto" }}>
      <Flex direction="column" gap="6">
        <Text size="2" asChild>
          <Link href="/family" style={{ color: "var(--gray-9)" }}>
            ← Back
          </Link>
        </Text>
        <Suspense fallback={
          <Flex direction="column" gap="4">
            <Skeleton height="32px" width="200px" />
            <Skeleton height="120px" />
          </Flex>
        }>
          <FamilyMemberDetail id={id} />
        </Suspense>
      </Flex>
    </Box>
  );
}
