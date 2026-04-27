"use client";

import {
  Box,
  Card,
  Flex,
  Heading,
  Text,
  Badge,
  Separator,
  Spinner,
  Button,
  AlertDialog,
} from "@radix-ui/themes";
import { Stethoscope, Trash2, Mail, Phone, MapPin } from "lucide-react";
import Link from "next/link";
import {
  useDoctorsQuery,
  useDeleteDoctorMutation,
  DoctorsDocument,
} from "../__generated__/hooks";
import { AuthGate } from "../components/AuthGate";
import { AddDoctorForm } from "./add-doctor-form";

export default function DoctorsPage() {
  return (
    <AuthGate
      pageName="Doctors"
      description="Manage your healthcare providers. Sign in to access your records."
    >
      <DoctorsContent />
    </AuthGate>
  );
}

function DoctorsContent() {
  const { data, loading, error } = useDoctorsQuery();
  const doctors = data?.doctors ?? [];

  return (
    <Box py="6">
      <Flex direction="column" gap="6">
        <Flex direction="column" gap="1">
          <Heading size={{ initial: "6", md: "8" }} weight="bold">
            Doctors
          </Heading>
          <Text size="3" color="gray">
            Your healthcare providers and contacts.
          </Text>
        </Flex>

        <Separator size="4" />

        <Flex direction="column" gap="3">
          <Heading size="4">Add a doctor</Heading>
          <AddDoctorForm />
        </Flex>

        <Separator size="4" />

        {loading && (
          <Flex justify="center" py="6">
            <Spinner size="3" />
          </Flex>
        )}

        {error && (
          <Flex direction="column" align="center" p="6" gap="2">
            <Text color="red">Error loading doctors</Text>
            <Text size="1" color="gray">
              {error.message}
            </Text>
          </Flex>
        )}

        {!loading && !error && doctors.length === 0 && (
          <Flex direction="column" align="center" gap="3" py="9">
            <Stethoscope size={48} color="var(--gray-8)" />
            <Heading size="4">No doctors yet</Heading>
            <Text size="2" color="gray">
              Add a doctor above to start tracking.
            </Text>
          </Flex>
        )}

        {!loading && !error && doctors.length > 0 && (
          <Flex direction="column" gap="3">
            <Heading size="4">Your doctors ({doctors.length})</Heading>
            <Flex
              direction="column"
              gap="3"
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
              }}
            >
              {doctors.map((d) => (
                <DoctorCard
                  key={d.id}
                  id={d.id}
                  name={d.name}
                  specialty={d.specialty ?? null}
                  phone={d.phone ?? null}
                  email={d.email ?? null}
                  address={d.address ?? null}
                  notes={d.notes ?? null}
                />
              ))}
            </Flex>
          </Flex>
        )}
      </Flex>
    </Box>
  );
}

function DoctorCard({
  id,
  name,
  specialty,
  phone,
  email,
  address,
  notes,
}: {
  id: string;
  name: string;
  specialty: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  notes: string | null;
}) {
  const [deleteDoctor, { loading: deleting }] = useDeleteDoctorMutation({
    refetchQueries: [{ query: DoctorsDocument }],
  });

  return (
    <Card>
      <Flex justify="between" align="start" gap="2">
        <Flex direction="column" gap="2" style={{ flexGrow: 1, minWidth: 0 }}>
          <Flex align="center" gap="2" wrap="wrap">
            <Link
              href={`/doctors/${id}`}
              style={{ textDecoration: "none", color: "inherit" }}
            >
              <Text size="2" weight="medium">
                {name}
              </Text>
            </Link>
            {specialty && (
              <Badge color="cyan" variant="soft" size="1">
                {specialty}
              </Badge>
            )}
          </Flex>
          {phone && (
            <Flex gap="1" align="center">
              <Phone size={12} color="var(--gray-9)" />
              <Text size="1" color="gray">
                {phone}
              </Text>
            </Flex>
          )}
          {email && (
            <Flex gap="1" align="center">
              <Mail size={12} color="var(--gray-9)" />
              <Text size="1" color="gray">
                {email}
              </Text>
            </Flex>
          )}
          {address && (
            <Flex gap="1" align="start">
              <MapPin
                size={12}
                color="var(--gray-9)"
                style={{ marginTop: 3 }}
              />
              <Text size="1" color="gray">
                {address}
              </Text>
            </Flex>
          )}
          {notes && (
            <Text
              size="1"
              color="gray"
              style={{
                display: "-webkit-box",
                WebkitLineClamp: 2,
                WebkitBoxOrient: "vertical",
                overflow: "hidden",
              }}
            >
              {notes}
            </Text>
          )}
        </Flex>

        <AlertDialog.Root>
          <AlertDialog.Trigger>
            <Button
              variant="ghost"
              color="gray"
              size="1"
              disabled={deleting}
              aria-label="Delete doctor"
            >
              <Trash2 size={14} />
            </Button>
          </AlertDialog.Trigger>
          <AlertDialog.Content maxWidth="400px">
            <AlertDialog.Title>Delete doctor?</AlertDialog.Title>
            <AlertDialog.Description size="2">
              This doctor and all linked appointments will lose the reference.
            </AlertDialog.Description>
            <Flex gap="3" mt="4" justify="end">
              <AlertDialog.Cancel>
                <Button variant="soft" color="gray">
                  Cancel
                </Button>
              </AlertDialog.Cancel>
              <AlertDialog.Action>
                <Button
                  color="red"
                  onClick={() => deleteDoctor({ variables: { id } })}
                >
                  Delete
                </Button>
              </AlertDialog.Action>
            </Flex>
          </AlertDialog.Content>
        </AlertDialog.Root>
      </Flex>
    </Card>
  );
}
