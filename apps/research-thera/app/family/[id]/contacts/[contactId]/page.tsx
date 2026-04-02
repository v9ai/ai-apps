"use client";

import { useState } from "react";
import {
  Box,
  Flex,
  Heading,
  Text,
  Card,
  Badge,
  Spinner,
  Button,
  TextField,
  TextArea,
  Select,
  Dialog,
  AlertDialog,
  Separator,
} from "@radix-ui/themes";
import { ArrowLeftIcon, Pencil1Icon, TrashIcon } from "@radix-ui/react-icons";
import { useRouter, useParams } from "next/navigation";
import NextLink from "next/link";
import dynamic from "next/dynamic";
import {
  useGetContactQuery,
  useUpdateContactMutation,
  useDeleteContactMutation,
  useDeleteRelationshipMutation,
  useGetRelationshipsQuery,
  useGetFamilyMemberQuery,
  useGetContactFeedbacksQuery,
  useDeleteContactFeedbackMutation,
  PersonType,
} from "@/app/__generated__/hooks";
import { authClient } from "@/app/lib/auth/client";
import ContactFeedbackList from "@/app/components/ContactFeedbackList";
import AddContactFeedbackButton from "@/app/components/AddContactFeedbackButton";

const ROLE_OPTIONS = [
  "teacher",
  "therapist",
  "doctor",
  "tutor",
  "coach",
  "counselor",
  "caregiver",
  "other",
] as const;

function ContactDetailContent() {
  const router = useRouter();
  const params = useParams();
  const familySlug = params.id as string;
  const contactRaw = params.contactId as string;
  const isNumeric = /^\d+$/.test(contactRaw);
  const contactId = isNumeric ? parseInt(contactRaw, 10) : NaN;
  const contactSlug = isNumeric ? undefined : contactRaw;
  const { data: session } = authClient.useSession();
  const user = session?.user;

  const { data, loading, error } = useGetContactQuery({
    variables: isNumeric ? { id: contactId } : { slug: contactSlug },
    skip: isNumeric ? isNaN(contactId) : !contactSlug,
  });

  const contact = data?.contact;

  // Edit form state
  const [editOpen, setEditOpen] = useState(false);
  const [editFirstName, setEditFirstName] = useState("");
  const [editLastName, setEditLastName] = useState("");
  const [editSlug, setEditSlug] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editRole, setEditRole] = useState("");
  const [editAgeYears, setEditAgeYears] = useState("");
  const [editNotes, setEditNotes] = useState("");
  const [editError, setEditError] = useState<string | null>(null);

  const [updateContact, { loading: updating }] = useUpdateContactMutation({
    onCompleted: (data) => {
      setEditOpen(false);
      setEditError(null);
      // Navigate to the new slug URL if slug changed
      const newSlug = data?.updateContact?.slug;
      if (newSlug && newSlug !== contactRaw) {
        router.replace(`/family/${familySlug}/contacts/${newSlug}`);
      }
    },
    onError: (err) => setEditError(err.message),
    refetchQueries: ["GetContact"],
  });

  const [deleteContact, { loading: deleting }] = useDeleteContactMutation({
    onCompleted: () => {
      router.push(`/family/${familySlug}`);
    },
  });

  const [deleteRelationship] = useDeleteRelationshipMutation({
    refetchQueries: ["GetRelationships"],
  });

  // Resolve family member
  const familyIsNumeric = /^\d+$/.test(familySlug);
  const familyIdNum = familyIsNumeric ? parseInt(familySlug, 10) : NaN;
  const familyMemberSlug = familyIsNumeric ? undefined : familySlug;

  const { data: familyData } = useGetFamilyMemberQuery({
    variables: familyIsNumeric ? { id: familyIdNum } : { slug: familyMemberSlug },
    skip: familyIsNumeric ? isNaN(familyIdNum) : !familyMemberSlug,
  });

  const familyMember = familyData?.familyMember;
  const resolvedFamilyMemberId = familyMember?.id ?? NaN;

  // Find the relationship linking this contact to the family member
  const { data: relsData } = useGetRelationshipsQuery({
    variables: {
      subjectType: PersonType.FamilyMember,
      subjectId: familyIsNumeric ? parseInt(familySlug, 10) : 0,
    },
    skip: !familyIsNumeric && !contact,
  });

  // Contact Feedbacks
  const resolvedContactId = contact?.id ?? NaN;
  const { data: feedbackData } = useGetContactFeedbacksQuery({
    variables: {
      contactId: resolvedContactId,
      familyMemberId: resolvedFamilyMemberId,
    },
    skip: isNaN(resolvedContactId) || isNaN(resolvedFamilyMemberId),
  });
  const contactFeedbacks = feedbackData?.contactFeedbacks ?? [];

  const [deleteContactFeedback, { loading: deletingContactFeedback }] =
    useDeleteContactFeedbackMutation({
      refetchQueries: ["GetContactFeedbacks"],
    });

  const handleDeleteContactFeedback = (fbId: number) => {
    deleteContactFeedback({ variables: { id: fbId } });
  };

  function openEditDialog() {
    if (!contact) return;
    setEditFirstName(contact.firstName);
    setEditLastName(contact.lastName ?? "");
    setEditSlug(contact.slug ?? "");
    setEditDescription(contact.description ?? "");
    setEditRole(contact.role ?? "");
    setEditAgeYears(contact.ageYears ? String(contact.ageYears) : "");
    setEditNotes(contact.notes ?? "");
    setEditError(null);
    setEditOpen(true);
  }

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!contact) return;
    if (!editFirstName.trim()) {
      setEditError("First name is required");
      return;
    }
    const slugValue = editSlug.trim().toLowerCase().replace(/[^a-z0-9-]/g, "").replace(/-+/g, "-").replace(/^-|-$/g, "");
    await updateContact({
      variables: {
        id: contact.id,
        input: {
          firstName: editFirstName.trim(),
          lastName: editLastName.trim() || undefined,
          slug: slugValue || undefined,
          description: editDescription.trim() || undefined,
          role: editRole || undefined,
          ageYears: editAgeYears ? parseInt(editAgeYears, 10) : undefined,
          notes: editNotes.trim() || undefined,
        },
      },
    });
  };

  const handleDelete = async () => {
    if (!contact) return;
    // Delete the relationship first if we can find it
    const relationships = relsData?.relationships ?? [];
    const rel = relationships.find(
      (r) =>
        (r.relatedType === PersonType.Contact && r.relatedId === contact.id) ||
        (r.subjectType === PersonType.Contact && r.subjectId === contact.id),
    );
    if (rel) {
      await deleteRelationship({ variables: { id: rel.id } });
    }
    await deleteContact({ variables: { id: contact.id } });
  };

  if (loading) {
    return (
      <Flex justify="center" align="center" style={{ minHeight: "200px" }}>
        <Spinner size="3" />
      </Flex>
    );
  }

  if (error || !contact) {
    return (
      <Card>
        <Text color="red">
          {error ? `Error: ${error.message}` : "Contact not found"}
        </Text>
      </Card>
    );
  }

  const isOwner =
    contact.createdBy === user?.email ||
    contact.createdBy === user?.id;

  const contactName =
    contact.firstName + (contact.lastName ? ` ${contact.lastName}` : "");

  return (
    <Flex direction="column" gap="5">
      {/* Contact Details Card */}
      <Card>
        <Flex direction="column" gap="3" p="4">
          <Flex justify="between" align="center">
            <Heading size="4">Details</Heading>
            {isOwner && (
              <Flex gap="2">
                <Button variant="soft" size="2" onClick={openEditDialog}>
                  <Pencil1Icon />
                  Edit
                </Button>
                <AlertDialog.Root>
                  <AlertDialog.Trigger>
                    <Button variant="soft" color="red" size="2">
                      <TrashIcon />
                      Delete
                    </Button>
                  </AlertDialog.Trigger>
                  <AlertDialog.Content>
                    <AlertDialog.Title>Delete Contact</AlertDialog.Title>
                    <AlertDialog.Description>
                      Are you sure you want to delete {contactName}? This will
                      also remove any relationships with this contact.
                    </AlertDialog.Description>
                    <Flex gap="3" justify="end" mt="4">
                      <AlertDialog.Cancel>
                        <Button variant="soft" color="gray">
                          Cancel
                        </Button>
                      </AlertDialog.Cancel>
                      <AlertDialog.Action>
                        <Button
                          color="red"
                          disabled={deleting}
                          onClick={handleDelete}
                        >
                          {deleting ? "Deleting..." : "Delete"}
                        </Button>
                      </AlertDialog.Action>
                    </Flex>
                  </AlertDialog.Content>
                </AlertDialog.Root>
              </Flex>
            )}
          </Flex>
          <Separator size="4" />
          <Flex direction="column" gap="2">
            <Flex gap="2">
              <Text size="2" weight="medium" style={{ minWidth: 100 }}>
                Name
              </Text>
              <Text size="2" color="gray">
                {contactName}
              </Text>
            </Flex>
            {contact.slug && (
              <Flex gap="2">
                <Text size="2" weight="medium" style={{ minWidth: 100 }}>
                  Slug
                </Text>
                <Text size="2" color="gray">
                  {contact.slug}
                </Text>
              </Flex>
            )}
            {contact.role && (
              <Flex gap="2">
                <Text size="2" weight="medium" style={{ minWidth: 100 }}>
                  Role
                </Text>
                <Badge color="violet" variant="soft" size="1">
                  {contact.role.charAt(0).toUpperCase() + contact.role.slice(1)}
                </Badge>
              </Flex>
            )}
            {contact.description && (
              <Flex gap="2">
                <Text size="2" weight="medium" style={{ minWidth: 100 }}>
                  Description
                </Text>
                <Text size="2" color="gray">
                  {contact.description}
                </Text>
              </Flex>
            )}
            {contact.ageYears && (
              <Flex gap="2">
                <Text size="2" weight="medium" style={{ minWidth: 100 }}>
                  Age
                </Text>
                <Text size="2" color="gray">
                  {contact.ageYears} years
                </Text>
              </Flex>
            )}
            {contact.notes && (
              <Flex gap="2">
                <Text size="2" weight="medium" style={{ minWidth: 100 }}>
                  Notes
                </Text>
                <Text size="2" color="gray">
                  {contact.notes}
                </Text>
              </Flex>
            )}
            <Flex gap="2">
              <Text size="2" weight="medium" style={{ minWidth: 100 }}>
                Added
              </Text>
              <Text size="2" color="gray">
                {new Date(contact.createdAt).toLocaleDateString()}
              </Text>
            </Flex>
          </Flex>
        </Flex>
      </Card>

      {/* Feedback */}
      <Card>
        <Flex direction="column" gap="3" p="4">
          <Flex justify="between" align="center">
            <Heading size="4">
              Feedback ({contactFeedbacks.length})
            </Heading>
            <Flex gap="2">
              {!isNaN(resolvedContactId) && !isNaN(resolvedFamilyMemberId) && (
                <AddContactFeedbackButton
                  contactId={resolvedContactId}
                  familyMemberId={resolvedFamilyMemberId}
                  size="2"
                />
              )}
              {contactFeedbacks.length > 0 && (
                <Button variant="soft" size="2" asChild>
                  <NextLink
                    href={`/family/${familySlug}/contacts/${contactRaw}/feedback`}
                  >
                    View All
                  </NextLink>
                </Button>
              )}
            </Flex>
          </Flex>
          <Separator size="4" />
          <ContactFeedbackList
            feedbacks={contactFeedbacks}
            onDelete={handleDeleteContactFeedback}
            deleting={deletingContactFeedback}
            onClickItem={(id) =>
              router.push(
                `/family/${familySlug}/contacts/${contactRaw}/feedback/${id}`,
              )
            }
          />
        </Flex>
      </Card>

      {/* Edit Dialog */}
      <Dialog.Root open={editOpen} onOpenChange={setEditOpen}>
        <Dialog.Content style={{ maxWidth: 500 }}>
          <Dialog.Title>Edit Contact</Dialog.Title>
          <form onSubmit={handleUpdate}>
            <Flex direction="column" gap="3">
              <label>
                <Text as="div" size="2" mb="1" weight="medium">
                  First Name *
                </Text>
                <TextField.Root
                  placeholder="First name"
                  value={editFirstName}
                  onChange={(e) => setEditFirstName(e.target.value)}
                  required
                  disabled={updating}
                />
              </label>
              <label>
                <Text as="div" size="2" mb="1" weight="medium">
                  Last Name
                </Text>
                <TextField.Root
                  placeholder="Last name"
                  value={editLastName}
                  onChange={(e) => setEditLastName(e.target.value)}
                  disabled={updating}
                />
              </label>
              <label>
                <Text as="div" size="2" mb="1" weight="medium">
                  Slug
                </Text>
                <TextField.Root
                  placeholder="url-friendly-name"
                  value={editSlug}
                  onChange={(e) => setEditSlug(e.target.value)}
                  disabled={updating}
                />
                <Text as="div" size="1" color="gray" mt="1">
                  URL path segment, e.g. /family/bogdan/contacts/{editSlug || "lizi"}
                </Text>
              </label>
              <label>
                <Text as="div" size="2" mb="1" weight="medium">
                  Description
                </Text>
                <TextArea
                  placeholder="Brief description of this contact..."
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  rows={2}
                  disabled={updating}
                />
              </label>
              <Flex direction="column" gap="1">
                <Text as="div" size="2" weight="medium">
                  Role
                </Text>
                <Select.Root
                  value={editRole || "none"}
                  onValueChange={(v) => setEditRole(v === "none" ? "" : v)}
                  disabled={updating}
                >
                  <Select.Trigger
                    placeholder="Select role..."
                    style={{ width: "100%" }}
                  />
                  <Select.Content>
                    <Select.Item value="none">Select role...</Select.Item>
                    {ROLE_OPTIONS.map((role) => (
                      <Select.Item key={role} value={role}>
                        {role.charAt(0).toUpperCase() + role.slice(1)}
                      </Select.Item>
                    ))}
                  </Select.Content>
                </Select.Root>
              </Flex>
              <label>
                <Text as="div" size="2" mb="1" weight="medium">
                  Age
                </Text>
                <TextField.Root
                  type="number"
                  placeholder="Age in years"
                  value={editAgeYears}
                  onChange={(e) => setEditAgeYears(e.target.value)}
                  disabled={updating}
                />
              </label>
              <label>
                <Text as="div" size="2" mb="1" weight="medium">
                  Notes
                </Text>
                <TextArea
                  placeholder="Notes about this contact..."
                  value={editNotes}
                  onChange={(e) => setEditNotes(e.target.value)}
                  rows={3}
                  disabled={updating}
                />
              </label>

              {editError && (
                <Text color="red" size="2">
                  {editError}
                </Text>
              )}

              <Flex gap="3" justify="end" mt="2">
                <Dialog.Close>
                  <Button variant="soft" color="gray" disabled={updating}>
                    Cancel
                  </Button>
                </Dialog.Close>
                <Button type="submit" disabled={updating}>
                  {updating ? "Saving..." : "Save Changes"}
                </Button>
              </Flex>
            </Flex>
          </form>
        </Dialog.Content>
      </Dialog.Root>
    </Flex>
  );
}

const DynamicContactDetailContent = dynamic(
  () => Promise.resolve(ContactDetailContent),
  { ssr: false },
);

export default function ContactDetailPage() {
  const params = useParams();
  const familySlug = params.id as string;
  const contactRaw = params.contactId as string;
  const isNumeric = /^\d+$/.test(contactRaw);
  const contactId = isNumeric ? parseInt(contactRaw, 10) : NaN;
  const contactSlug = isNumeric ? undefined : contactRaw;

  const { data } = useGetContactQuery({
    variables: isNumeric ? { id: contactId } : { slug: contactSlug },
    skip: isNumeric ? isNaN(contactId) : !contactSlug,
  });

  const contact = data?.contact;

  return (
    <Flex direction="column" gap="5">
      {/* Sticky Header */}
      <Box
        position="sticky"
        top="0"
        style={{
          zIndex: 20,
          background: "var(--color-panel)",
          borderBottom: "1px solid var(--gray-a6)",
          backdropFilter: "blur(10px)",
          marginLeft: "calc(-1 * var(--space-3))",
          marginRight: "calc(-1 * var(--space-3))",
          paddingLeft: "var(--space-3)",
          paddingRight: "var(--space-3)",
        }}
      >
        <Flex
          py="3"
          align="center"
          gap={{ initial: "2", md: "4" }}
          style={{ maxWidth: "1200px", margin: "0 auto", width: "100%" }}
        >
          <Button variant="soft" size="2" radius="full" color="gray" asChild>
            <NextLink href={`/family/${familySlug}`}>
              <ArrowLeftIcon />
              <Box display={{ initial: "none", sm: "inline" }} asChild>
                <span>Back</span>
              </Box>
            </NextLink>
          </Button>

          <Box display={{ initial: "none", sm: "block" }}><Separator orientation="vertical" style={{ height: 20 }} /></Box>

          <Box minWidth="0" style={{ flex: 1 }}>
            <Heading size={{ initial: "5", md: "8" }} weight="bold" truncate>
              {contact
                ? `${contact.firstName}${contact.lastName ? ` ${contact.lastName}` : ""}`
                : "Contact"}
            </Heading>
          </Box>

          {contact?.role && (
            <Badge color="violet" variant="soft" size="2">
              {contact.role.charAt(0).toUpperCase() + contact.role.slice(1)}
            </Badge>
          )}
        </Flex>
      </Box>

      <Box style={{ maxWidth: "1200px", margin: "0 auto", width: "100%" }}>
        <DynamicContactDetailContent />
      </Box>
    </Flex>
  );
}
