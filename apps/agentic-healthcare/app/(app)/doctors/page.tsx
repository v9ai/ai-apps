import { withAuth } from "@/lib/auth-helpers";
import { db } from "@/lib/db";
import { doctors, familyMemberDoctors, familyMembers } from "@/lib/db/schema";
import { eq, asc, inArray } from "drizzle-orm";
import { Box, Badge, Button, Card, Flex, Heading, Separator, Skeleton, Text } from "@radix-ui/themes";
import { Suspense } from "react";
import { AddDoctorForm } from "./add-form";
import { deleteDoctor } from "./actions";
import { DeleteConfirmButton } from "@/components/delete-confirm-button";
import { Stethoscope } from "lucide-react";
import Link from "next/link";
import { css } from "styled-system/css";

function DoctorInitials({ name }: { name: string }) {
  const parts = name.trim().split(/\s+/);
  const initials = parts.length >= 2
    ? (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
    : name.slice(0, 2).toUpperCase();

  return (
    <Flex
      align="center"
      justify="center"
      className={css({
        width: "48px",
        height: "48px",
        borderRadius: "50%",
        background: "var(--indigo-3)",
        flexShrink: "0",
      })}
    >
      <Text size="3" weight="bold" className={css({ color: "var(--indigo-11)" })}>
        {initials}
      </Text>
    </Flex>
  );
}

async function DoctorsList() {
  const { userId } = await withAuth();

  const rows = await db
    .select()
    .from(doctors)
    .where(eq(doctors.userId, userId))
    .orderBy(asc(doctors.name));

  // Fetch linked family members for all doctors in one round-trip
  const doctorIds = rows.map((d) => d.id);
  const linkedMap = new Map<string, string[]>();
  if (doctorIds.length) {
    const fmdRows = await db
      .select({ doctorId: familyMemberDoctors.doctorId, name: familyMembers.name })
      .from(familyMemberDoctors)
      .innerJoin(familyMembers, eq(familyMemberDoctors.familyMemberId, familyMembers.id))
      .where(inArray(familyMemberDoctors.doctorId, doctorIds));
    for (const { doctorId, name } of fmdRows) {
      if (!linkedMap.has(doctorId)) linkedMap.set(doctorId, []);
      linkedMap.get(doctorId)!.push(name);
    }
  }

  if (!rows.length) {
    return (
      <Flex direction="column" align="center" gap="4" py="9">
        <Stethoscope size={48} color="var(--gray-8)" />
        <Heading size="4" color="gray">No doctors yet</Heading>
        <Text size="2" color="gray">Add a doctor above to keep track of your care team.</Text>
      </Flex>
    );
  }

  return (
    <Flex direction="column" gap="4">
      <Flex align="center" gap="2">
        <Heading size="4">Your care team</Heading>
        <Badge color="indigo" variant="soft" size="1">{rows.length}</Badge>
      </Flex>
      <Box
        className={css({
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
          gap: "3",
        })}
      >
        {rows.map((d) => (
          <Card
            key={d.id}
            asChild
            className={css({
              _hover: {
                transform: "translateY(-1px)",
                boxShadow: "0 4px 12px rgba(0,0,0,0.2)",
              },
              transition: "all 150ms ease",
            })}
          >
            <Link href={`/doctors/${d.id}`} style={{ textDecoration: "none" }}>
              <Flex direction="column" gap="3">
                {/* Header row: avatar + name + delete */}
                <Flex justify="between" align="start" gap="2">
                  <Flex align="center" gap="3">
                    <DoctorInitials name={d.name} />
                    <Flex direction="column" gap="1">
                      <Text size="3" weight="bold">{d.name}</Text>
                      {d.specialty && (
                        <Badge color="blue" variant="soft" size="1">{d.specialty}</Badge>
                      )}
                    </Flex>
                  </Flex>
                  <DeleteConfirmButton
                    action={deleteDoctor.bind(null, d.id)}
                    description="This doctor will be permanently removed from your care team."
                    stopPropagation
                  />
                </Flex>

                {/* Contact info */}
                {(d.phone || d.email || d.address) && (
                  <Flex direction="column" gap="1">
                    {d.phone && (
                      <Text size="1" color="gray">{d.phone}</Text>
                    )}
                    {d.email && (
                      <Text size="1" color="gray">{d.email}</Text>
                    )}
                    {d.address && (
                      <Text size="1" color="gray">{d.address}</Text>
                    )}
                  </Flex>
                )}

                {/* Linked family members */}
                {(linkedMap.get(d.id) ?? []).length > 0 && (
                  <Flex gap="1" wrap="wrap">
                    {(linkedMap.get(d.id) ?? []).map((name) => (
                      <Badge key={name} color="purple" variant="soft" size="1">{name}</Badge>
                    ))}
                  </Flex>
                )}
              </Flex>
            </Link>
          </Card>
        ))}
      </Box>
    </Flex>
  );
}

export default function DoctorsPage() {
  return (
    <Box py="8" px="4">
      <Flex direction="column" gap="6">
        <Flex justify="between" align="center" wrap="wrap" gap="3">
          <Flex direction="column" gap="1">
            <Heading size="7" weight="bold">Doctors</Heading>
            <Text size="2" color="gray">Manage your care team and their contact details.</Text>
          </Flex>
        </Flex>

        <Separator size="4" />

        <Card variant="surface">
          <Flex direction="column" gap="3">
            <Heading size="4">Add a doctor</Heading>
            <AddDoctorForm />
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
          <DoctorsList />
        </Suspense>
      </Flex>
    </Box>
  );
}
