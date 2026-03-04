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
  useGetFamilyMemberQuery,
  useUpdateFamilyMemberMutation,
  useShareFamilyMemberMutation,
  useUnshareFamilyMemberMutation,
  useGetBehaviorObservationsQuery,
  useDeleteBehaviorObservationMutation,
  useGetFamilyMemberCharacteristicsQuery,
  useDeleteFamilyMemberCharacteristicMutation,
  FamilyMemberShareRole,
  CharacteristicCategory,
} from "@/app/__generated__/hooks";
import { useUser } from "@clerk/nextjs";
import AddGoalButton from "@/app/components/AddGoalButton";
import AddBehaviorObservationButton from "@/app/components/AddBehaviorObservationButton";
import BehaviorObservationsList from "@/app/components/BehaviorObservationsList";
import AddCharacteristicButton from "@/app/components/AddCharacteristicButton";
import CharacteristicsList from "@/app/components/CharacteristicsList";

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

function getStatusColor(status: string) {
  switch (status.toLowerCase()) {
    case "active":
      return "green" as const;
    case "completed":
      return "blue" as const;
    case "paused":
      return "orange" as const;
    case "archived":
      return "gray" as const;
    default:
      return "gray" as const;
  }
}

function FamilyMemberContent() {
  const router = useRouter();
  const params = useParams();
  const id = parseInt(params.id as string, 10);
  const { user } = useUser();

  const { data, loading, error } = useGetFamilyMemberQuery({
    variables: { id },
    skip: isNaN(id),
  });

  const member = data?.familyMember;

  // Edit form state
  const [editOpen, setEditOpen] = useState(false);
  const [editFirstName, setEditFirstName] = useState("");
  const [editName, setEditName] = useState("");
  const [editRelationship, setEditRelationship] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [editLocation, setEditLocation] = useState("");
  const [editOccupation, setEditOccupation] = useState("");
  const [editAgeYears, setEditAgeYears] = useState("");
  const [editDateOfBirth, setEditDateOfBirth] = useState("");
  const [editBio, setEditBio] = useState("");
  const [editError, setEditError] = useState<string | null>(null);

  // Share form state
  const [shareEmail, setShareEmail] = useState("");
  const [shareRole, setShareRole] = useState<FamilyMemberShareRole>(
    FamilyMemberShareRole.Viewer,
  );
  const [shareError, setShareError] = useState<string | null>(null);

  const [updateFamilyMember, { loading: updating }] =
    useUpdateFamilyMemberMutation({
      onCompleted: () => {
        setEditOpen(false);
        setEditError(null);
      },
      onError: (err) => setEditError(err.message),
      refetchQueries: ["GetFamilyMember"],
    });

  const [shareFamilyMember, { loading: sharing }] =
    useShareFamilyMemberMutation({
      onCompleted: () => {
        setShareEmail("");
        setShareRole(FamilyMemberShareRole.Viewer);
        setShareError(null);
      },
      onError: (err) => setShareError(err.message),
      refetchQueries: ["GetFamilyMember"],
    });

  const [unshareFamilyMember, { loading: unsharing }] =
    useUnshareFamilyMemberMutation({
      refetchQueries: ["GetFamilyMember"],
    });

  const { data: obsData } = useGetBehaviorObservationsQuery({
    variables: { familyMemberId: id },
    skip: isNaN(id),
  });
  const observations = obsData?.behaviorObservations ?? [];

  const [deleteObservation, { loading: deletingObs }] =
    useDeleteBehaviorObservationMutation({
      refetchQueries: ["GetBehaviorObservations"],
    });

  const handleDeleteObservation = (obsId: number) => {
    deleteObservation({ variables: { id: obsId } });
  };

  const { data: charData } = useGetFamilyMemberCharacteristicsQuery({
    variables: { familyMemberId: id },
    skip: isNaN(id),
  });
  const characteristics = charData?.familyMemberCharacteristics ?? [];
  const strengths = characteristics.filter(
    (c) => c.category === CharacteristicCategory.Strength,
  );
  const supportNeeds = characteristics.filter(
    (c) => c.category === CharacteristicCategory.SupportNeed,
  );
  const priorityConcerns = characteristics.filter(
    (c) => c.category === CharacteristicCategory.PriorityConcern,
  );

  const [deleteCharacteristic, { loading: deletingChar }] =
    useDeleteFamilyMemberCharacteristicMutation({
      refetchQueries: ["GetFamilyMemberCharacteristics"],
    });

  const handleDeleteCharacteristic = (charId: number) => {
    deleteCharacteristic({ variables: { id: charId } });
  };

  function openEditDialog() {
    if (!member) return;
    setEditFirstName(member.firstName);
    setEditName(member.name ?? "");
    setEditRelationship(member.relationship ?? "");
    setEditEmail(member.email ?? "");
    setEditPhone(member.phone ?? "");
    setEditLocation(member.location ?? "");
    setEditOccupation(member.occupation ?? "");
    setEditAgeYears(member.ageYears ? String(member.ageYears) : "");
    setEditDateOfBirth(member.dateOfBirth ?? "");
    setEditBio(member.bio ?? "");
    setEditError(null);
    setEditOpen(true);
  }

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editFirstName.trim()) {
      setEditError("First name is required");
      return;
    }
    await updateFamilyMember({
      variables: {
        id,
        input: {
          firstName: editFirstName.trim(),
          name: editName.trim() || undefined,
          relationship: editRelationship || undefined,
          email: editEmail.trim() || undefined,
          phone: editPhone.trim() || undefined,
          location: editLocation.trim() || undefined,
          occupation: editOccupation.trim() || undefined,
          ageYears: editAgeYears ? parseInt(editAgeYears, 10) : undefined,
          dateOfBirth: editDateOfBirth || undefined,
          bio: editBio.trim() || undefined,
        },
      },
    });
  };

  const handleShare = async (e: React.FormEvent) => {
    e.preventDefault();
    setShareError(null);
    if (!shareEmail.trim()) {
      setShareError("Email is required");
      return;
    }
    await shareFamilyMember({
      variables: {
        familyMemberId: id,
        email: shareEmail.trim().toLowerCase(),
        role: shareRole,
      },
    });
  };

  if (loading) {
    return (
      <Flex justify="center" align="center" style={{ minHeight: "200px" }}>
        <Spinner size="3" />
      </Flex>
    );
  }

  if (error || !member) {
    return (
      <Card>
        <Text color="red">
          {error ? `Error: ${error.message}` : "Family member not found"}
        </Text>
      </Card>
    );
  }

  const isOwner =
    member.userId === user?.primaryEmailAddress?.emailAddress ||
    member.userId === user?.id;

  const memberName = member.firstName + (member.name ? ` ${member.name}` : "");

  return (
    <Flex direction="column" gap="5">
      {/* Member Info */}
      <Card>
        <Flex direction="column" gap="3" p="4">
          <Flex justify="between" align="center">
            <Heading size="4">Details</Heading>
            {isOwner && (
              <Button variant="soft" size="2" onClick={openEditDialog}>
                <Pencil1Icon />
                Edit
              </Button>
            )}
          </Flex>
          <Separator size="4" />
          <Flex direction="column" gap="2">
            {member.email && (
              <Flex gap="2">
                <Text size="2" weight="medium" style={{ minWidth: 100 }}>
                  Email
                </Text>
                <Text size="2" color="gray">
                  {member.email}
                </Text>
              </Flex>
            )}
            {member.phone && (
              <Flex gap="2">
                <Text size="2" weight="medium" style={{ minWidth: 100 }}>
                  Phone
                </Text>
                <Text size="2" color="gray">
                  {member.phone}
                </Text>
              </Flex>
            )}
            {member.location && (
              <Flex gap="2">
                <Text size="2" weight="medium" style={{ minWidth: 100 }}>
                  Location
                </Text>
                <Text size="2" color="gray">
                  {member.location}
                </Text>
              </Flex>
            )}
            {member.occupation && (
              <Flex gap="2">
                <Text size="2" weight="medium" style={{ minWidth: 100 }}>
                  Occupation
                </Text>
                <Text size="2" color="gray">
                  {member.occupation}
                </Text>
              </Flex>
            )}
            {(member.ageYears || member.dateOfBirth) && (
              <Flex gap="2">
                <Text size="2" weight="medium" style={{ minWidth: 100 }}>
                  Age / DOB
                </Text>
                <Text size="2" color="gray">
                  {member.ageYears ? `${member.ageYears} years` : ""}
                  {member.ageYears && member.dateOfBirth ? " - " : ""}
                  {member.dateOfBirth
                    ? new Date(member.dateOfBirth).toLocaleDateString()
                    : ""}
                </Text>
              </Flex>
            )}
            {member.bio && (
              <Flex gap="2">
                <Text size="2" weight="medium" style={{ minWidth: 100 }}>
                  Bio
                </Text>
                <Text size="2" color="gray">
                  {member.bio}
                </Text>
              </Flex>
            )}
            {!member.email &&
              !member.phone &&
              !member.location &&
              !member.occupation &&
              !member.ageYears &&
              !member.dateOfBirth &&
              !member.bio && (
                <Text size="2" color="gray">
                  No additional details
                </Text>
              )}
          </Flex>
        </Flex>
      </Card>

      {/* Goals */}
      <Card>
        <Flex direction="column" gap="3" p="4">
          <Flex justify="between" align="center">
            <Heading size="4">Goals ({member.goals.length})</Heading>
            <AddGoalButton
              presetFamilyMemberId={id}
              refetchQueries={["GetFamilyMember"]}
              size="2"
            />
          </Flex>
          <Separator size="4" />
          {member.goals.length === 0 ? (
            <Text size="2" color="gray">
              No goals yet
            </Text>
          ) : (
            <Flex direction="column" gap="2">
              {member.goals.map((goal) => (
                <Card
                  key={goal.id}
                  style={{ cursor: "pointer" }}
                  onClick={() => router.push(`/goals/${goal.id}`)}
                >
                  <Flex justify="between" align="center" p="3">
                    <Flex direction="column" gap="1" style={{ flex: 1 }}>
                      <Text size="3" weight="medium">
                        {goal.title}
                      </Text>
                      {goal.description && (
                        <Text
                          size="1"
                          color="gray"
                          style={{
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                          }}
                        >
                          {goal.description}
                        </Text>
                      )}
                    </Flex>
                    <Badge
                      color={getStatusColor(goal.status)}
                      variant="soft"
                      size="1"
                    >
                      {goal.status}
                    </Badge>
                  </Flex>
                </Card>
              ))}
            </Flex>
          )}
        </Flex>
      </Card>

      {/* Strengths */}
      <Card>
        <Flex direction="column" gap="3" p="4">
          <Flex justify="between" align="center">
            <Flex direction="column" gap="1">
              <Heading size="4">Strengths ({strengths.length})</Heading>
              <Text size="1" color="gray">
                Part of how they function — neutral
              </Text>
            </Flex>
            <AddCharacteristicButton
              familyMemberId={id}
              defaultCategory={CharacteristicCategory.Strength}
              label="Add Strength"
              refetchQueries={["GetFamilyMemberCharacteristics"]}
              size="2"
            />
          </Flex>
          <Separator size="4" />
          <CharacteristicsList
            items={strengths}
            onDelete={handleDeleteCharacteristic}
            deleting={deletingChar}
            emptyMessage="No strengths added yet"
            getHref={(item) => `/family/${id}/characteristics/${item.id}`}
          />
        </Flex>
      </Card>

      {/* Support Priority */}
      <Card>
        <Flex direction="column" gap="3" p="4">
          <Flex justify="between" align="center">
            <Flex direction="column" gap="1">
              <Heading size="4">Support Priority ({supportNeeds.length})</Heading>
              <Text size="1" color="gray">
                Interferes with something
              </Text>
            </Flex>
            <AddCharacteristicButton
              familyMemberId={id}
              defaultCategory={CharacteristicCategory.SupportNeed}
              label="Add Support Priority"
              refetchQueries={["GetFamilyMemberCharacteristics"]}
              size="2"
            />
          </Flex>
          <Separator size="4" />
          <CharacteristicsList
            items={supportNeeds}
            onDelete={handleDeleteCharacteristic}
            deleting={deletingChar}
            emptyMessage="No Support Priority added yet"
            getHref={(item) => `/family/${id}/characteristics/${item.id}`}
          />
        </Flex>
      </Card>

      {/* Priority Concerns */}
      <Card>
        <Flex direction="column" gap="3" p="4">
          <Flex justify="between" align="center">
            <Flex direction="column" gap="1">
              <Heading size="4">Priority Concerns ({priorityConcerns.length})</Heading>
              <Text size="1" color="gray">
                Requires active intervention
              </Text>
            </Flex>
            <AddCharacteristicButton
              familyMemberId={id}
              defaultCategory={CharacteristicCategory.PriorityConcern}
              label="Add Priority Concern"
              refetchQueries={["GetFamilyMemberCharacteristics"]}
              size="2"
            />
          </Flex>
          <Separator size="4" />
          <CharacteristicsList
            items={priorityConcerns}
            onDelete={handleDeleteCharacteristic}
            deleting={deletingChar}
            emptyMessage="No priority concerns added yet"
            getHref={(item) => `/family/${id}/characteristics/${item.id}`}
          />
        </Flex>
      </Card>

      {/* Behavior Observations */}
      <Card>
        <Flex direction="column" gap="3" p="4">
          <Flex justify="between" align="center">
            <Heading size="4">
              Behavior Observations ({observations.length})
            </Heading>
            <AddBehaviorObservationButton
              familyMemberId={id}
              refetchQueries={["GetBehaviorObservations"]}
              size="2"
            />
          </Flex>
          <Separator size="4" />
          <BehaviorObservationsList
            observations={observations}
            onDelete={handleDeleteObservation}
            deleting={deletingObs}
          />
        </Flex>
      </Card>

      {/* Sharing - only for owner */}
      {isOwner && (
        <Card>
          <Flex direction="column" gap="3" p="4">
            <Heading size="4">Sharing</Heading>
            <Separator size="4" />

            {/* Current shares */}
            {member.shares.length > 0 ? (
              <Flex direction="column" gap="2">
                {member.shares.map((share) => (
                  <Flex
                    key={share.email}
                    justify="between"
                    align="center"
                    p="2"
                    style={{
                      borderRadius: "var(--radius-2)",
                      background: "var(--gray-a2)",
                    }}
                  >
                    <Flex gap="2" align="center">
                      <Text size="2">{share.email}</Text>
                      <Badge
                        color={
                          share.role === FamilyMemberShareRole.Editor
                            ? "blue"
                            : "gray"
                        }
                        variant="soft"
                        size="1"
                      >
                        {share.role}
                      </Badge>
                    </Flex>
                    <AlertDialog.Root>
                      <AlertDialog.Trigger>
                        <Button variant="ghost" color="red" size="1">
                          <TrashIcon />
                        </Button>
                      </AlertDialog.Trigger>
                      <AlertDialog.Content>
                        <AlertDialog.Title>Remove Share</AlertDialog.Title>
                        <AlertDialog.Description>
                          Remove access for {share.email}? They will no longer
                          be able to view this family member.
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
                              disabled={unsharing}
                              onClick={() =>
                                unshareFamilyMember({
                                  variables: {
                                    familyMemberId: id,
                                    email: share.email,
                                  },
                                })
                              }
                            >
                              Remove
                            </Button>
                          </AlertDialog.Action>
                        </Flex>
                      </AlertDialog.Content>
                    </AlertDialog.Root>
                  </Flex>
                ))}
              </Flex>
            ) : (
              <Text size="2" color="gray">
                Not shared with anyone
              </Text>
            )}

            {/* Add share form */}
            <Separator size="4" />
            <form onSubmit={handleShare}>
              <Flex gap="2" align="end">
                <Box style={{ flex: 1 }}>
                  <Text as="div" size="1" mb="1" weight="medium">
                    Share with
                  </Text>
                  <TextField.Root
                    type="email"
                    placeholder="Email address"
                    value={shareEmail}
                    onChange={(e) => setShareEmail(e.target.value)}
                    disabled={sharing}
                  />
                </Box>
                <Select.Root
                  value={shareRole}
                  onValueChange={(v) =>
                    setShareRole(v as FamilyMemberShareRole)
                  }
                  disabled={sharing}
                >
                  <Select.Trigger style={{ minWidth: 110 }} />
                  <Select.Content>
                    <Select.Item value={FamilyMemberShareRole.Viewer}>
                      Viewer
                    </Select.Item>
                    <Select.Item value={FamilyMemberShareRole.Editor}>
                      Editor
                    </Select.Item>
                  </Select.Content>
                </Select.Root>
                <Button type="submit" disabled={sharing}>
                  {sharing ? "Sharing..." : "Share"}
                </Button>
              </Flex>
              {shareError && (
                <Text color="red" size="1" mt="1">
                  {shareError}
                </Text>
              )}
            </form>
          </Flex>
        </Card>
      )}

      {/* Edit Dialog */}
      <Dialog.Root open={editOpen} onOpenChange={setEditOpen}>
        <Dialog.Content style={{ maxWidth: 500 }}>
          <Dialog.Title>Edit Family Member</Dialog.Title>
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
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  disabled={updating}
                />
              </label>
              <label>
                <Text as="div" size="2" mb="1" weight="medium">
                  Relationship
                </Text>
                <Select.Root
                  value={editRelationship}
                  onValueChange={setEditRelationship}
                  disabled={updating}
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
                  value={editEmail}
                  onChange={(e) => setEditEmail(e.target.value)}
                  disabled={updating}
                />
              </label>
              <label>
                <Text as="div" size="2" mb="1" weight="medium">
                  Phone
                </Text>
                <TextField.Root
                  placeholder="Phone number"
                  value={editPhone}
                  onChange={(e) => setEditPhone(e.target.value)}
                  disabled={updating}
                />
              </label>
              <label>
                <Text as="div" size="2" mb="1" weight="medium">
                  Location
                </Text>
                <TextField.Root
                  placeholder="City, Country"
                  value={editLocation}
                  onChange={(e) => setEditLocation(e.target.value)}
                  disabled={updating}
                />
              </label>
              <label>
                <Text as="div" size="2" mb="1" weight="medium">
                  Occupation
                </Text>
                <TextField.Root
                  placeholder="Occupation"
                  value={editOccupation}
                  onChange={(e) => setEditOccupation(e.target.value)}
                  disabled={updating}
                />
              </label>
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
                  Date of Birth
                </Text>
                <TextField.Root
                  type="date"
                  value={editDateOfBirth}
                  onChange={(e) => setEditDateOfBirth(e.target.value)}
                  disabled={updating}
                />
              </label>
              <label>
                <Text as="div" size="2" mb="1" weight="medium">
                  Bio
                </Text>
                <TextArea
                  placeholder="Short bio or notes"
                  value={editBio}
                  onChange={(e) => setEditBio(e.target.value)}
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

const DynamicFamilyMemberContent = dynamic(
  () => Promise.resolve(FamilyMemberContent),
  { ssr: false },
);

export default function FamilyMemberPage() {
  const router = useRouter();
  const params = useParams();
  const id = parseInt(params.id as string, 10);

  const { data } = useGetFamilyMemberQuery({
    variables: { id },
    skip: isNaN(id),
  });

  const member = data?.familyMember;

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
          marginLeft: "calc(-1 * var(--space-5))",
          marginRight: "calc(-1 * var(--space-5))",
          paddingLeft: "var(--space-5)",
          paddingRight: "var(--space-5)",
        }}
      >
        <Flex
          py="4"
          align="center"
          gap="4"
          style={{ maxWidth: "1200px", margin: "0 auto", width: "100%" }}
        >
          <Button variant="soft" size="2" radius="full" color="gray" asChild>
            <NextLink href="/family">
              <ArrowLeftIcon />
              <Text as="span" size="2" weight="medium">
                Family
              </Text>
            </NextLink>
          </Button>

          <Separator orientation="vertical" style={{ height: 20 }} />

          <Box minWidth="0" style={{ flex: 1 }}>
            <Heading size="8" weight="bold" truncate>
              {member
                ? `${member.firstName}${member.name ? ` ${member.name}` : ""}`
                : "Family Member"}
            </Heading>
          </Box>

          {member?.relationship && (
            <Badge
              color={getRelationshipColor(member.relationship)}
              variant="soft"
              size="2"
            >
              {member.relationship}
            </Badge>
          )}
        </Flex>
      </Box>

      <Box style={{ maxWidth: "1200px", margin: "0 auto", width: "100%" }}>
        <DynamicFamilyMemberContent />
      </Box>
    </Flex>
  );
}
