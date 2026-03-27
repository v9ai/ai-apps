import { withAuth } from "@/lib/auth-helpers";
import { db } from "@/lib/db";
import { familyMembers, familyMemberDoctors } from "@/lib/db/schema";
import { eq, asc, count } from "drizzle-orm";
import { Box, Badge, Card, Flex, Heading, Separator, Skeleton, Text } from "@radix-ui/themes";
import { Suspense } from "react";
import { AddFamilyMemberForm } from "./add-form";
import { deleteFamilyMember } from "./actions";
import { DeleteConfirmButton } from "@/components/delete-confirm-button";
import { Users } from "lucide-react";
import Link from "next/link";

const RELATIONSHIP_COLORS: Record<string, "blue" | "green" | "orange" | "purple" | "pink" | "gray"> = {
  Father: "blue",
  Mother: "pink",
  Brother: "blue",
  Sister: "pink",
  Son: "green",
  Daughter: "green",
  Spouse: "purple",
  Partner: "purple",
};

async function FamilyList() {
  const { userId } = await withAuth();

  const [rows, doctorCounts] = await Promise.all([
    db
      .select()
      .from(familyMembers)
      .where(eq(familyMembers.userId, userId))
      .orderBy(asc(familyMembers.name)),
    db
      .select({ familyMemberId: familyMemberDoctors.familyMemberId, doctorCount: count() })
      .from(familyMemberDoctors)
      .groupBy(familyMemberDoctors.familyMemberId),
  ]);

  const doctorCountMap = new Map(doctorCounts.map((r) => [r.familyMemberId, r.doctorCount]));

  if (!rows.length) {
    return (
      <Flex direction="column" align="center" gap="3" py="6">
        <Users size={48} color="var(--gray-8)" />
        <Heading size="4">No family members yet</Heading>
        <Text size="2" color="gray">Add family members to track hereditary health factors.</Text>
      </Flex>
    );
  }

  return (
    <>
      <Separator size="4" />
      <Flex direction="column" gap="2">
        <Heading size="4">Your family</Heading>
        {rows.map((m) => (
          <Card key={m.id} asChild className="card-hover">
            <Link href={`/family/${m.id}`} style={{ textDecoration: "none" }}>
              <Flex justify="between" align="start">
                <Flex direction="column" gap="1">
                  <Flex align="center" gap="2">
                    <Text size="2" weight="medium">{m.name}</Text>
                    {m.relationship && (
                      <Badge
                        color={RELATIONSHIP_COLORS[m.relationship] ?? "gray"}
                        variant="soft"
                        size="1"
                      >
                        {m.relationship}
                      </Badge>
                    )}
                    {(doctorCountMap.get(m.id) ?? 0) > 0 && (
                      <Badge color="blue" variant="soft" size="1">
                        {doctorCountMap.get(m.id)} {doctorCountMap.get(m.id) === 1 ? "doctor" : "doctors"}
                      </Badge>
                    )}
                  </Flex>
                  {m.dateOfBirth && (
                    <Text size="1" color="gray">
                      Born {new Date(m.dateOfBirth).toLocaleDateString()}
                    </Text>
                  )}
                  {m.notes && (
                    <Text size="1" color="gray">
                      {m.notes.slice(0, 80)}{m.notes.length > 80 ? "..." : ""}
                    </Text>
                  )}
                </Flex>
                <DeleteConfirmButton
                  action={deleteFamilyMember.bind(null, m.id)}
                  description="This family member will be permanently removed."
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

export default function FamilyPage() {
  return (
    <Box py="8" style={{ maxWidth: 600, margin: "0 auto" }}>
      <Flex direction="column" gap="6">
        <Flex direction="column" gap="1">
          <Heading size="7" weight="bold">Family</Heading>
          <Text size="2" color="gray">Track family members and hereditary health context.</Text>
        </Flex>

        <Separator size="4" />

        <Flex direction="column" gap="3">
          <Heading size="4">Add a family member</Heading>
          <AddFamilyMemberForm />
        </Flex>

        <Suspense fallback={
          <Flex direction="column" gap="2">
            <Skeleton height="52px" />
            <Skeleton height="52px" />
            <Skeleton height="52px" />
          </Flex>
        }>
          <FamilyList />
        </Suspense>
      </Flex>
    </Box>
  );
}
