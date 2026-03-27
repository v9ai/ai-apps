import { withAuth } from "@/lib/auth-helpers";
import { db } from "@/lib/db";
import { doctors, familyMemberDoctors, familyMembers } from "@/lib/db/schema";
import { eq, asc, inArray } from "drizzle-orm";
import { Box, Card, Flex, Heading, Separator, Skeleton, Text, Badge } from "@radix-ui/themes";
import { Suspense } from "react";
import { AddDoctorForm } from "./add-form";
import { deleteDoctor } from "./actions";
import { DeleteConfirmButton } from "@/components/delete-confirm-button";
import { Stethoscope } from "lucide-react";
import Link from "next/link";

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
      <Flex direction="column" align="center" gap="3" py="6">
        <Stethoscope size={48} color="var(--gray-8)" />
        <Heading size="4">No doctors yet</Heading>
        <Text size="2" color="gray">Add a doctor above to keep track of your care team.</Text>
      </Flex>
    );
  }

  return (
    <>
      <Separator size="4" />
      <Flex direction="column" gap="2">
        <Heading size="4">Your doctors</Heading>
        {rows.map((d) => (
          <Card key={d.id} asChild className="card-hover">
            <Link href={`/doctors/${d.id}`} style={{ textDecoration: "none" }}>
              <Flex justify="between" align="start">
                <Flex direction="column" gap="1">
                  <Flex align="center" gap="2">
                    <Text size="2" weight="medium">{d.name}</Text>
                    {d.specialty && <Badge color="blue" variant="soft" size="1">{d.specialty}</Badge>}
                  </Flex>
                  {d.phone && <Text size="1" color="gray">{d.phone}</Text>}
                  {d.address && <Text size="1" color="gray">{d.address}</Text>}
                  {(linkedMap.get(d.id) ?? []).length > 0 && (
                    <Flex gap="1" wrap="wrap" mt="1">
                      {(linkedMap.get(d.id) ?? []).map((name) => (
                        <Badge key={name} color="purple" variant="soft" size="1">{name}</Badge>
                      ))}
                    </Flex>
                  )}
                </Flex>
                <DeleteConfirmButton
                  action={deleteDoctor.bind(null, d.id)}
                  description="This doctor will be permanently removed from your care team."
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

export default function DoctorsPage() {
  return (
    <Box py="8" style={{ maxWidth: 600, margin: "0 auto" }}>
      <Flex direction="column" gap="6">
        <Flex direction="column" gap="1">
          <Heading size="7" weight="bold">Doctors</Heading>
          <Text size="2" color="gray">Manage your care team and their contact details.</Text>
        </Flex>

        <Separator size="4" />

        <Flex direction="column" gap="3">
          <Heading size="4">Add a doctor</Heading>
          <AddDoctorForm />
        </Flex>

        <Suspense fallback={
          <Flex direction="column" gap="2">
            <Skeleton height="52px" />
            <Skeleton height="52px" />
            <Skeleton height="52px" />
          </Flex>
        }>
          <DoctorsList />
        </Suspense>
      </Flex>
    </Box>
  );
}
