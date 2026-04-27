"use client";

import { use } from "react";
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
import { ArrowLeft, Eye, FileText, Mail, MapPin, Phone, Trash2 } from "lucide-react";
import Link from "next/link";
import {
  useDoctorQuery,
  useDeleteMedicalLetterMutation,
  DoctorDocument,
} from "../../__generated__/hooks";
import { AuthGate } from "../../components/AuthGate";
import { UploadMedicalLetterForm } from "./upload-medical-letter-form";

export default function DoctorDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  return (
    <AuthGate
      pageName="Doctor"
      description="Sign in to view this doctor."
    >
      <DoctorDetailContent id={id} />
    </AuthGate>
  );
}

function DoctorDetailContent({ id }: { id: string }) {
  const { data, loading, error } = useDoctorQuery({ variables: { id } });

  if (loading) {
    return (
      <Flex justify="center" py="9">
        <Spinner size="3" />
      </Flex>
    );
  }
  if (error) {
    return (
      <Flex direction="column" align="center" p="6" gap="2">
        <Text color="red">Error loading doctor</Text>
        <Text size="1" color="gray">
          {error.message}
        </Text>
      </Flex>
    );
  }

  const doctor = data?.doctor;
  const letters = data?.medicalLetters ?? [];

  if (!doctor) {
    return (
      <Flex direction="column" align="center" gap="3" py="9">
        <Heading size="4">Doctor not found</Heading>
        <Link href="/doctors">
          <Button variant="soft">Back to doctors</Button>
        </Link>
      </Flex>
    );
  }

  return (
    <Box py="6">
      <Flex direction="column" gap="6">
        <Flex direction="column" gap="2">
          <Link href="/doctors" style={{ textDecoration: "none" }}>
            <Flex align="center" gap="1">
              <ArrowLeft size={14} />
              <Text size="1" color="gray">
                All doctors
              </Text>
            </Flex>
          </Link>
          <Flex direction="column" gap="1">
            <Flex align="center" gap="2" wrap="wrap">
              <Heading size="7" weight="bold">
                {doctor.name}
              </Heading>
              {doctor.specialty && (
                <Badge color="cyan" variant="soft" size="2">
                  {doctor.specialty}
                </Badge>
              )}
            </Flex>
            <Flex gap="3" wrap="wrap" mt="1">
              {doctor.phone && (
                <Flex gap="1" align="center">
                  <Phone size={12} color="var(--gray-9)" />
                  <Text size="1" color="gray">
                    {doctor.phone}
                  </Text>
                </Flex>
              )}
              {doctor.email && (
                <Flex gap="1" align="center">
                  <Mail size={12} color="var(--gray-9)" />
                  <Text size="1" color="gray">
                    {doctor.email}
                  </Text>
                </Flex>
              )}
              {doctor.address && (
                <Flex gap="1" align="center">
                  <MapPin size={12} color="var(--gray-9)" />
                  <Text size="1" color="gray">
                    {doctor.address}
                  </Text>
                </Flex>
              )}
            </Flex>
            {doctor.notes && (
              <Text size="2" color="gray">
                {doctor.notes}
              </Text>
            )}
          </Flex>
        </Flex>

        <Separator size="4" />

        <Flex direction="column" gap="3">
          <Heading size="4">Medical letters ({letters.length})</Heading>
          {letters.length > 0 ? (
            <Flex direction="column" gap="2">
              {letters.map((l) => (
                <LetterRow
                  key={l.id}
                  id={l.id}
                  fileName={l.fileName}
                  description={l.description ?? null}
                  letterDate={l.letterDate ?? null}
                  uploadedAt={l.uploadedAt}
                />
              ))}
            </Flex>
          ) : (
            <Text size="2" color="gray">
              No letters uploaded yet.
            </Text>
          )}
          <UploadMedicalLetterForm doctorId={doctor.id} />
        </Flex>
      </Flex>
    </Box>
  );
}

function LetterRow({
  id,
  fileName,
  description,
  letterDate,
  uploadedAt,
}: {
  id: string;
  fileName: string;
  description: string | null;
  letterDate: string | null;
  uploadedAt: string;
}) {
  const [deleteLetter, { loading: deleting }] = useDeleteMedicalLetterMutation({
    refetchQueries: [DoctorDocument],
  });

  return (
    <Card>
      <Flex justify="between" align="start" gap="3">
        <Flex gap="2" align="start" style={{ flexGrow: 1, minWidth: 0 }}>
          <FileText size={16} color="var(--gray-9)" style={{ marginTop: 2 }} />
          <Flex direction="column" gap="1" style={{ minWidth: 0 }}>
            <Text size="2" weight="medium">
              {fileName}
            </Text>
            {description && (
              <Text size="1" color="gray">
                {description}
              </Text>
            )}
            <Flex gap="3" wrap="wrap">
              {letterDate && (
                <Text size="1" color="gray">
                  Letter date: {letterDate}
                </Text>
              )}
              <Text size="1" color="gray">
                Uploaded {new Date(uploadedAt).toLocaleString()}
              </Text>
            </Flex>
          </Flex>
        </Flex>

        <Flex gap="1" align="center">
          <Button
            asChild
            variant="ghost"
            color="gray"
            size="1"
            aria-label="View letter"
          >
            <a
              href={`/api/healthcare/medical-letter-file/${id}`}
              target="_blank"
              rel="noreferrer"
            >
              <Eye size={14} />
            </a>
          </Button>

          <AlertDialog.Root>
            <AlertDialog.Trigger>
              <Button
                variant="ghost"
                color="gray"
                size="1"
                disabled={deleting}
                aria-label="Delete letter"
              >
                <Trash2 size={14} />
              </Button>
            </AlertDialog.Trigger>
          <AlertDialog.Content maxWidth="400px">
            <AlertDialog.Title>Delete letter?</AlertDialog.Title>
            <AlertDialog.Description size="2">
              The PDF will be removed from R2 and the record permanently
              deleted.
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
                  onClick={() => deleteLetter({ variables: { id } })}
                >
                  Delete
                </Button>
              </AlertDialog.Action>
            </Flex>
          </AlertDialog.Content>
        </AlertDialog.Root>
        </Flex>
      </Flex>
    </Card>
  );
}
