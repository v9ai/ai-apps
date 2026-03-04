"use client";

import { useState } from "react";
import {
  Flex,
  Heading,
  Text,
  Card,
  Button,
  Badge,
  Spinner,
  Dialog,
  TextField,
  TextArea,
  Select,
  AlertDialog,
  Separator,
} from "@radix-ui/themes";
import { PlusIcon, TrashIcon } from "@radix-ui/react-icons";
import Link from "next/link";
import dynamic from "next/dynamic";
import {
  useGetFamilyMembersQuery,
  useGetMySharedFamilyMembersQuery,
  useCreateFamilyMemberMutation,
  useDeleteFamilyMemberMutation,
} from "@/app/__generated__/hooks";
import { useUser } from "@clerk/nextjs";
import { AuthGate } from "@/app/components/AuthGate";

const RELATIONSHIP_OPTIONS = [
  "self",
  "child",
  "spouse",
  "partner",
  "parent",
  "sibling",
  "friend",
  "other",
] as const;

const RELATIONSHIP_COLORS: Record<string, string> = {
  self: "indigo",
  child: "green",
  spouse: "pink",
  partner: "pink",
  parent: "blue",
  sibling: "purple",
  friend: "cyan",
  other: "gray",
};

function getRelationshipColor(relationship: string | null | undefined) {
  return (RELATIONSHIP_COLORS[relationship?.toLowerCase() ?? ""] ??
    "gray") as any;
}

function FamilyListContent() {
  const { user } = useUser();
  const [addOpen, setAddOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<number | null>(null);

  // Form state
  const [firstName, setFirstName] = useState("");
  const [name, setName] = useState("");
  const [relationship, setRelationship] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [location, setLocation] = useState("");
  const [occupation, setOccupation] = useState("");
  const [ageYears, setAgeYears] = useState("");
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [bio, setBio] = useState("");
  const [formError, setFormError] = useState<string | null>(null);

  const {
    data: ownData,
    loading: ownLoading,
    error: ownError,
    refetch: refetchOwn,
  } = useGetFamilyMembersQuery({ skip: !user });

  const {
    data: sharedData,
    loading: sharedLoading,
    error: sharedError,
  } = useGetMySharedFamilyMembersQuery({ skip: !user });

  const [createFamilyMember, { loading: creating }] =
    useCreateFamilyMemberMutation({
      onCompleted: () => {
        setAddOpen(false);
        resetForm();
      },
      onError: (err) => setFormError(err.message),
      refetchQueries: ["GetFamilyMembers"],
    });

  const [deleteFamilyMember, { loading: deleting }] =
    useDeleteFamilyMemberMutation({
      onCompleted: () => setDeleteId(null),
      refetchQueries: ["GetFamilyMembers"],
    });

  function resetForm() {
    setFirstName("");
    setName("");
    setRelationship("");
    setEmail("");
    setPhone("");
    setLocation("");
    setOccupation("");
    setAgeYears("");
    setDateOfBirth("");
    setBio("");
    setFormError(null);
  }

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    if (!firstName.trim()) {
      setFormError("First name is required");
      return;
    }
    await createFamilyMember({
      variables: {
        input: {
          firstName: firstName.trim(),
          name: name.trim() || undefined,
          relationship: relationship || undefined,
          email: email.trim() || undefined,
          phone: phone.trim() || undefined,
          location: location.trim() || undefined,
          occupation: occupation.trim() || undefined,
          ageYears: ageYears ? parseInt(ageYears, 10) : undefined,
          dateOfBirth: dateOfBirth || undefined,
          bio: bio.trim() || undefined,
        },
      },
    });
  };

  const loading = ownLoading || sharedLoading;
  const error = ownError || sharedError;

  if (loading) {
    return (
      <Flex justify="center" align="center" style={{ minHeight: "200px" }}>
        <Spinner size="3" />
      </Flex>
    );
  }

  if (error) {
    return (
      <Card>
        <Flex direction="column" gap="3" p="4">
          <Text color="red">{error.message}</Text>
          <Button onClick={() => refetchOwn()}>Retry</Button>
        </Flex>
      </Card>
    );
  }

  const members = ownData?.familyMembers ?? [];
  const sharedMembers = sharedData?.mySharedFamilyMembers ?? [];

  return (
    <Flex direction="column" gap="4">
      <Flex justify="between" align="center" wrap="wrap" gap="3">
        <Heading size="5">My Family Members ({members.length})</Heading>
        <Dialog.Root
          open={addOpen}
          onOpenChange={(open) => {
            setAddOpen(open);
            if (!open) resetForm();
          }}
        >
          <Dialog.Trigger>
            <Button size="3">
              <PlusIcon width="16" height="16" />
              Add Family Member
            </Button>
          </Dialog.Trigger>

          <Dialog.Content style={{ maxWidth: 500 }}>
            <Dialog.Title>Add Family Member</Dialog.Title>
            <Dialog.Description size="2" mb="4">
              Add a family member to track goals and share access.
            </Dialog.Description>
            <form onSubmit={handleCreate}>
              <Flex direction="column" gap="3">
                <label>
                  <Text as="div" size="2" mb="1" weight="medium">
                    First Name *
                  </Text>
                  <TextField.Root
                    placeholder="First name"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    required
                    disabled={creating}
                  />
                </label>
                <label>
                  <Text as="div" size="2" mb="1" weight="medium">
                    Last Name
                  </Text>
                  <TextField.Root
                    placeholder="Last name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    disabled={creating}
                  />
                </label>
                <label>
                  <Text as="div" size="2" mb="1" weight="medium">
                    Relationship
                  </Text>
                  <Select.Root
                    value={relationship}
                    onValueChange={setRelationship}
                    disabled={creating}
                  >
                    <Select.Trigger
                      placeholder="Select relationship..."
                      style={{ width: "100%" }}
                    />
                    <Select.Content>
                      {RELATIONSHIP_OPTIONS.map((r) => (
                        <Select.Item key={r} value={r}>
                          {r.charAt(0).toUpperCase() + r.slice(1)}
                        </Select.Item>
                      ))}
                    </Select.Content>
                  </Select.Root>
                </label>
                <label>
                  <Text as="div" size="2" mb="1" weight="medium">
                    Email
                  </Text>
                  <TextField.Root
                    type="email"
                    placeholder="Email address"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    disabled={creating}
                  />
                </label>
                <label>
                  <Text as="div" size="2" mb="1" weight="medium">
                    Phone
                  </Text>
                  <TextField.Root
                    placeholder="Phone number"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    disabled={creating}
                  />
                </label>
                <label>
                  <Text as="div" size="2" mb="1" weight="medium">
                    Location
                  </Text>
                  <TextField.Root
                    placeholder="City, Country"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    disabled={creating}
                  />
                </label>
                <label>
                  <Text as="div" size="2" mb="1" weight="medium">
                    Occupation
                  </Text>
                  <TextField.Root
                    placeholder="Occupation"
                    value={occupation}
                    onChange={(e) => setOccupation(e.target.value)}
                    disabled={creating}
                  />
                </label>
                <label>
                  <Text as="div" size="2" mb="1" weight="medium">
                    Age
                  </Text>
                  <TextField.Root
                    type="number"
                    placeholder="Age in years"
                    value={ageYears}
                    onChange={(e) => setAgeYears(e.target.value)}
                    disabled={creating}
                  />
                </label>
                <label>
                  <Text as="div" size="2" mb="1" weight="medium">
                    Date of Birth
                  </Text>
                  <TextField.Root
                    type="date"
                    value={dateOfBirth}
                    onChange={(e) => setDateOfBirth(e.target.value)}
                    disabled={creating}
                  />
                </label>
                <label>
                  <Text as="div" size="2" mb="1" weight="medium">
                    Bio
                  </Text>
                  <TextArea
                    placeholder="Short bio or notes"
                    value={bio}
                    onChange={(e) => setBio(e.target.value)}
                    rows={3}
                    disabled={creating}
                  />
                </label>

                {formError && (
                  <Text color="red" size="2">
                    {formError}
                  </Text>
                )}

                <Flex gap="3" justify="end" mt="2">
                  <Dialog.Close>
                    <Button variant="soft" color="gray" disabled={creating}>
                      Cancel
                    </Button>
                  </Dialog.Close>
                  <Button type="submit" disabled={creating}>
                    {creating ? "Adding..." : "Add Member"}
                  </Button>
                </Flex>
              </Flex>
            </form>
          </Dialog.Content>
        </Dialog.Root>
      </Flex>

      {members.length === 0 ? (
        <Card>
          <Flex direction="column" gap="2" p="4" align="center">
            <Text color="gray">No family members yet</Text>
            <Text size="2" color="gray">
              Add your first family member to get started
            </Text>
          </Flex>
        </Card>
      ) : (
        <Flex direction="column" gap="3">
          {members.map((member) => (
            <Link
              key={member.id}
              href={`/family/${member.id}`}
              style={{ textDecoration: "none", color: "inherit" }}
            >
            <Card
              style={{ cursor: "pointer" }}
            >
              <Flex direction="column" gap="3" p="4">
                <Flex justify="between" align="start" gap="3">
                  <Flex direction="column" gap="2" style={{ flex: 1 }}>
                    <Heading size="4">
                      {member.firstName}
                      {member.name ? ` ${member.name}` : ""}
                    </Heading>
                    {member.email && (
                      <Text size="2" color="gray">
                        {member.email}
                      </Text>
                    )}
                  </Flex>
                  <Flex gap="2" align="center">
                    {member.relationship && (
                      <Badge
                        color={getRelationshipColor(member.relationship)}
                        variant="soft"
                        size="2"
                      >
                        {member.relationship}
                      </Badge>
                    )}
                    <AlertDialog.Root
                      open={deleteId === member.id}
                      onOpenChange={(open) =>
                        setDeleteId(open ? member.id : null)
                      }
                    >
                      <AlertDialog.Trigger>
                        <Button
                          variant="ghost"
                          color="red"
                          size="1"
                          onClick={(e) => {
                            e.stopPropagation();
                            setDeleteId(member.id);
                          }}
                        >
                          <TrashIcon />
                        </Button>
                      </AlertDialog.Trigger>
                      <AlertDialog.Content>
                        <AlertDialog.Title>
                          Delete Family Member
                        </AlertDialog.Title>
                        <AlertDialog.Description>
                          Are you sure you want to delete {member.firstName}
                          {member.name ? ` ${member.name}` : ""}? This action
                          cannot be undone.
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
                              onClick={(e) => {
                                e.stopPropagation();
                                deleteFamilyMember({
                                  variables: { id: member.id },
                                });
                              }}
                            >
                              {deleting ? "Deleting..." : "Delete"}
                            </Button>
                          </AlertDialog.Action>
                        </Flex>
                      </AlertDialog.Content>
                    </AlertDialog.Root>
                  </Flex>
                </Flex>
                <Flex gap="4" align="center" wrap="wrap">
                  {member.ageYears && (
                    <Text size="1" color="gray">
                      Age {member.ageYears}
                    </Text>
                  )}
                  <Text size="1" color="gray">
                    Added {new Date(member.createdAt).toLocaleDateString()}
                  </Text>
                </Flex>
              </Flex>
            </Card>
            </Link>
          ))}
        </Flex>
      )}

      {sharedMembers.length > 0 && (
        <>
          <Separator size="4" my="2" />
          <Heading size="5">Shared With Me ({sharedMembers.length})</Heading>
          <Flex direction="column" gap="3">
            {sharedMembers.map((member) => (
              <Link
                key={member.id}
                href={`/family/${member.id}`}
                style={{ textDecoration: "none", color: "inherit" }}
              >
              <Card
                style={{ cursor: "pointer" }}
              >
                <Flex direction="column" gap="3" p="4">
                  <Flex justify="between" align="start" gap="3">
                    <Flex direction="column" gap="2" style={{ flex: 1 }}>
                      <Heading size="4">
                        {member.firstName}
                        {member.name ? ` ${member.name}` : ""}
                      </Heading>
                      {member.email && (
                        <Text size="2" color="gray">
                          {member.email}
                        </Text>
                      )}
                    </Flex>
                    <Flex gap="2" align="center">
                      <Badge color="orange" variant="outline" size="1">
                        Shared
                      </Badge>
                      {member.relationship && (
                        <Badge
                          color={getRelationshipColor(member.relationship)}
                          variant="soft"
                          size="2"
                        >
                          {member.relationship}
                        </Badge>
                      )}
                    </Flex>
                  </Flex>
                  <Text size="1" color="gray">
                    Added {new Date(member.createdAt).toLocaleDateString()}
                  </Text>
                </Flex>
              </Card>
              </Link>
            ))}
          </Flex>
        </>
      )}
    </Flex>
  );
}

const DynamicFamilyListContent = dynamic(
  () => Promise.resolve(FamilyListContent),
  { ssr: false },
);

export default function FamilyPage() {
  return (
    <AuthGate
      pageName="Family"
      description="Your family members are private. Sign in to manage your family profiles."
    >
      <Flex direction="column" gap="4">
        <Heading size="8">My Family</Heading>
        <DynamicFamilyListContent />
      </Flex>
    </AuthGate>
  );
}
