import { withAuth } from "@/lib/auth-helpers";
import { db } from "@/lib/db";
import { familyMembers, familyMemberDoctors, doctors } from "@/lib/db/schema";
import { and, eq, asc, notInArray } from "drizzle-orm";
import { notFound, redirect } from "next/navigation";
import { Box, Badge, Card, Flex, Heading, Separator, Skeleton, Text } from "@radix-ui/themes";
import Link from "next/link";
import { Suspense } from "react";
import { Stethoscope } from "lucide-react";
import { deleteFamilyMember } from "../actions";
import { linkDoctorToFamilyMember, unlinkDoctorFromFamilyMember } from "../doctor-link-actions";
import { DeleteConfirmButton } from "@/components/delete-confirm-button";
import { LinkDoctorForm } from "./link-doctor-form";

async function FamilyMemberDetail({ slug }: { slug: string }) {
  const { userId } = await withAuth();

  const [member] = await db
    .select()
    .from(familyMembers)
    .where(and(eq(familyMembers.slug, slug), eq(familyMembers.userId, userId)));

  if (!member) notFound();

  const id = member.id;

  const age = member.dateOfBirth
    ? Math.floor(
        (Date.now() - new Date(member.dateOfBirth).getTime()) / (365.25 * 24 * 60 * 60 * 1000),
      )
    : null;

  // Fetch linked doctors
  const linkedDoctors = await db
    .select({
      id: doctors.id,
      name: doctors.name,
      specialty: doctors.specialty,
      phone: doctors.phone,
      address: doctors.address,
    })
    .from(familyMemberDoctors)
    .innerJoin(doctors, eq(familyMemberDoctors.doctorId, doctors.id))
    .where(eq(familyMemberDoctors.familyMemberId, id))
    .orderBy(asc(doctors.name));

  // Fetch user's doctors not yet linked — for the link form
  const linkedDoctorIds = linkedDoctors.map((d) => d.id);
  const availableDoctors = await db
    .select({ id: doctors.id, name: doctors.name, specialty: doctors.specialty })
    .from(doctors)
    .where(
      linkedDoctorIds.length > 0
        ? and(eq(doctors.userId, userId), notInArray(doctors.id, linkedDoctorIds))
        : eq(doctors.userId, userId),
    )
    .orderBy(asc(doctors.name));

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

      <Separator size="4" />

      <Flex direction="column" gap="3">
        <Heading size="4">Doctors</Heading>

        {linkedDoctors.length > 0 ? (
          <Flex direction="column" gap="2">
            {linkedDoctors.map((d) => (
              <Card key={d.id} asChild className="card-hover">
                <Link href={`/doctors/${d.id}`} style={{ textDecoration: "none" }}>
                  <Flex justify="between" align="start">
                    <Flex direction="column" gap="1">
                      <Flex align="center" gap="2">
                        <Text size="2" weight="medium">{d.name}</Text>
                        {d.specialty && (
                          <Badge color="blue" variant="soft" size="1">{d.specialty}</Badge>
                        )}
                      </Flex>
                      {d.phone && <Text size="1" color="gray">{d.phone}</Text>}
                      {d.address && <Text size="1" color="gray">{d.address}</Text>}
                    </Flex>
                    <DeleteConfirmButton
                      action={async () => {
                        "use server";
                        await unlinkDoctorFromFamilyMember(id, d.id);
                      }}
                      description="This doctor will be unlinked from this family member."
                      stopPropagation
                    />
                  </Flex>
                </Link>
              </Card>
            ))}
          </Flex>
        ) : (
          <Flex align="center" gap="2" py="2">
            <Stethoscope size={16} color="var(--gray-8)" />
            <Text size="2" color="gray">No doctors linked yet.</Text>
          </Flex>
        )}

        {availableDoctors.length > 0 && (
          <LinkDoctorForm
            familyMemberId={id}
            availableDoctors={availableDoctors}
            linkAction={linkDoctorToFamilyMember}
          />
        )}
      </Flex>
    </>
  );
}

export default async function FamilyMemberDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  return (
    <Box py="8" px="4">
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
          <FamilyMemberDetail slug={slug} />
        </Suspense>
      </Flex>
    </Box>
  );
}
