import { withAuth } from "@/lib/auth-helpers";
import { db } from "@/lib/db";
import { familyMembers, familyMemberDoctors, familyDocuments } from "@/lib/db/schema";
import { eq, asc, count } from "drizzle-orm";
import { Box, Badge, Button, Card, Flex, Heading, Separator, Skeleton, Text } from "@radix-ui/themes";
import { Suspense } from "react";
import { AddFamilyMemberForm } from "./add-form";
import { deleteFamilyMember } from "./actions";
import { DeleteConfirmButton } from "@/components/delete-confirm-button";
import { Users } from "lucide-react";
import Link from "next/link";
import { css } from "styled-system/css";

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

const AVATAR_COLORS: Record<string, string> = {
  Father: "var(--blue-3)",
  Mother: "var(--pink-3)",
  Brother: "var(--blue-3)",
  Sister: "var(--pink-3)",
  Son: "var(--green-3)",
  Daughter: "var(--green-3)",
  Spouse: "var(--purple-3)",
  Partner: "var(--purple-3)",
};

const AVATAR_TEXT_COLORS: Record<string, string> = {
  Father: "var(--blue-11)",
  Mother: "var(--pink-11)",
  Brother: "var(--blue-11)",
  Sister: "var(--pink-11)",
  Son: "var(--green-11)",
  Daughter: "var(--green-11)",
  Spouse: "var(--purple-11)",
  Partner: "var(--purple-11)",
};

function MemberAvatar({ name, relationship }: { name: string; relationship: string | null }) {
  const parts = name.trim().split(/\s+/);
  const initials = parts.length >= 2
    ? (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
    : name.slice(0, 2).toUpperCase();

  const bg = relationship ? (AVATAR_COLORS[relationship] ?? "var(--gray-3)") : "var(--gray-3)";
  const color = relationship ? (AVATAR_TEXT_COLORS[relationship] ?? "var(--gray-11)") : "var(--gray-11)";

  return (
    <Flex
      align="center"
      justify="center"
      className={css({
        width: "48px",
        height: "48px",
        borderRadius: "50%",
        flexShrink: "0",
      })}
      style={{ background: bg }}
    >
      <Text size="3" weight="bold" style={{ color }}>
        {initials}
      </Text>
    </Flex>
  );
}

function calculateAge(dateOfBirth: string): number {
  const dob = new Date(dateOfBirth);
  const today = new Date();
  let age = today.getFullYear() - dob.getFullYear();
  const m = today.getMonth() - dob.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < dob.getDate())) age--;
  return age;
}

async function FamilyList() {
  const { userId } = await withAuth();

  const [rows, doctorCounts, docCounts] = await Promise.all([
    db
      .select()
      .from(familyMembers)
      .where(eq(familyMembers.userId, userId))
      .orderBy(asc(familyMembers.name)),
    db
      .select({ familyMemberId: familyMemberDoctors.familyMemberId, doctorCount: count() })
      .from(familyMemberDoctors)
      .groupBy(familyMemberDoctors.familyMemberId),
    db
      .select({ familyMemberId: familyDocuments.familyMemberId, docCount: count() })
      .from(familyDocuments)
      .groupBy(familyDocuments.familyMemberId),
  ]);

  const doctorCountMap = new Map(doctorCounts.map((r) => [r.familyMemberId, r.doctorCount]));
  const docCountMap = new Map(docCounts.map((r) => [r.familyMemberId, r.docCount]));

  if (!rows.length) {
    return (
      <Flex direction="column" align="center" gap="4" py="9">
        <Users size={48} color="var(--gray-8)" />
        <Heading size="4" color="gray">No family members yet</Heading>
        <Text size="2" color="gray">Add family members to track hereditary health factors.</Text>
      </Flex>
    );
  }

  return (
    <Flex direction="column" gap="4">
      <Flex align="center" gap="2">
        <Heading size="4">Your family</Heading>
        <Badge color="purple" variant="soft" size="1">{rows.length}</Badge>
      </Flex>
      <Box
        className={css({
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
          gap: "3",
        })}
      >
        {rows.map((m) => {
          const drCount = doctorCountMap.get(m.id) ?? 0;
          const docsCount = docCountMap.get(m.id) ?? 0;
          const age = m.dateOfBirth ? calculateAge(m.dateOfBirth) : null;

          return (
            <Card
              key={m.id}
              asChild
              className={css({
                _hover: {
                  transform: "translateY(-1px)",
                  boxShadow: "0 4px 12px rgba(0,0,0,0.2)",
                },
                transition: "all 150ms ease",
              })}
            >
              <Link href={`/family/${m.slug}`} style={{ textDecoration: "none" }}>
                <Flex direction="column" gap="3">
                  {/* Header row: avatar + name + delete */}
                  <Flex justify="between" align="start" gap="2">
                    <Flex align="center" gap="3">
                      <MemberAvatar name={m.name} relationship={m.relationship} />
                      <Flex direction="column" gap="1">
                        <Text size="3" weight="bold">{m.name}</Text>
                        {m.relationship && (
                          <Badge
                            color={RELATIONSHIP_COLORS[m.relationship] ?? "gray"}
                            variant="soft"
                            size="1"
                          >
                            {m.relationship}
                          </Badge>
                        )}
                      </Flex>
                    </Flex>
                    <DeleteConfirmButton
                      action={deleteFamilyMember.bind(null, m.id)}
                      description="This family member will be permanently removed."
                      stopPropagation
                    />
                  </Flex>

                  {/* Health summary stats */}
                  <Flex gap="3">
                    {age !== null && (
                      <Flex direction="column" gap="0">
                        <Text size="4" weight="bold">{age}</Text>
                        <Text size="1" color="gray">yrs old</Text>
                      </Flex>
                    )}
                    {drCount > 0 && (
                      <Flex direction="column" gap="0">
                        <Text size="4" weight="bold">{drCount}</Text>
                        <Text size="1" color="gray">{drCount === 1 ? "doctor" : "doctors"}</Text>
                      </Flex>
                    )}
                    {docsCount > 0 && (
                      <Flex direction="column" gap="0">
                        <Text size="4" weight="bold">{docsCount}</Text>
                        <Text size="1" color="gray">{docsCount === 1 ? "doc" : "docs"}</Text>
                      </Flex>
                    )}
                  </Flex>

                  {/* Notes preview */}
                  {m.notes && (
                    <Text size="1" color="gray">
                      {m.notes.slice(0, 100)}{m.notes.length > 100 ? "…" : ""}
                    </Text>
                  )}
                </Flex>
              </Link>
            </Card>
          );
        })}
      </Box>
    </Flex>
  );
}

export default function FamilyPage() {
  return (
    <Box py="8" px="4">
      <Flex direction="column" gap="6">
        <Flex justify="between" align="center" wrap="wrap" gap="3">
          <Flex direction="column" gap="1">
            <Heading size="7" weight="bold">Family</Heading>
            <Text size="2" color="gray">Track family members and hereditary health context.</Text>
          </Flex>
        </Flex>

        <Separator size="4" />

        <Card variant="surface">
          <Flex direction="column" gap="3">
            <Heading size="4">Add a family member</Heading>
            <AddFamilyMemberForm />
          </Flex>
        </Card>

        <Suspense fallback={
          <Box
            className={css({
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
              gap: "3",
            })}
          >
            <Skeleton height="140px" />
            <Skeleton height="140px" />
            <Skeleton height="140px" />
          </Box>
        }>
          <FamilyList />
        </Suspense>
      </Flex>
    </Box>
  );
}
