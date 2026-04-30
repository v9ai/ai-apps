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
  Callout,
  TextField,
  TextArea,
  Select,
  Dialog,
  AlertDialog,
  Separator,
} from "@radix-ui/themes";
import { ArrowLeftIcon, ExclamationTriangleIcon, EyeOpenIcon, Pencil1Icon, TrashIcon } from "@radix-ui/react-icons";
import { useRouter, useParams } from "next/navigation";
import NextLink from "next/link";
import dynamic from "next/dynamic";
import {
  useGetFamilyMemberQuery,
  useUpdateFamilyMemberMutation,
  useShareFamilyMemberMutation,
  useUnshareFamilyMemberMutation,
  useDeleteIssueMutation,
  useDeleteTeacherFeedbackMutation,
  useDeleteRelationshipMutation,
  useDeleteContactMutation,
  FamilyMemberShareRole,
} from "@/app/__generated__/hooks";
import { authClient } from "@/app/lib/auth/client";
import AddGoalButton from "@/app/components/AddGoalButton";
import AddFamilyRelationshipButton from "@/app/components/AddFamilyRelationshipButton";
import AddTeacherFeedbackButton from "@/app/components/AddTeacherFeedbackButton";
import TeacherFeedbackList from "@/app/components/TeacherFeedbackList";
import AddContactButton from "@/app/components/AddContactButton";
import AddIssueButton from "@/app/components/AddIssueButton";
import { getSeverityColor, getCategoryColor } from "@/app/lib/issue-colors";
import { DeepAnalysisPanel } from "@/app/components/DeepAnalysisPanel";
import { DeepAnalysisSubjectType } from "@/app/__generated__/hooks";
import { FamilyDocumentsSection } from "./family-documents-section";

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

const BLOOD_TEST_STATUS_COLOR: Record<string, "gray" | "amber" | "green" | "red"> = {
  pending: "gray",
  uploaded: "gray",
  processing: "amber",
  completed: "green",
  failed: "red",
};

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
  const raw = params.id as string;
  const isNumeric = /^\d+$/.test(raw);
  const id = isNumeric ? parseInt(raw, 10) : NaN;
  const slug = isNumeric ? undefined : raw;
  const { data: session } = authClient.useSession();
  const user = session?.user;

  const { data, loading, error } = useGetFamilyMemberQuery({
    variables: isNumeric ? { id } : { slug },
    skip: isNumeric ? isNaN(id) : !slug,
  });

  const member = data?.familyMember;
  const memberId = member?.id ?? NaN;

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
  const [editAllergies, setEditAllergies] = useState("");
  const [editError, setEditError] = useState<string | null>(null);

  // Share form state
  const [shareEmail, setShareEmail] = useState("");
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
        setShareError(null);
      },
      onError: (err) => setShareError(err.message),
      refetchQueries: ["GetFamilyMember"],
    });

  const [unshareFamilyMember, { loading: unsharing }] =
    useUnshareFamilyMemberMutation({
      refetchQueries: ["GetFamilyMember"],
    });

  const issues = member?.issues ?? [];

  const [deleteIssue, { loading: deletingIssue }] = useDeleteIssueMutation({
    refetchQueries: ["GetFamilyMember"],
  });

  const handleDeleteIssue = (issueId: number) => {
    deleteIssue({ variables: { id: issueId } });
  };

  const memberSlugOrId = member?.slug ?? raw;

  const teacherFeedbacks = member?.teacherFeedbacks ?? [];

  const [deleteFeedback, { loading: deletingFeedback }] =
    useDeleteTeacherFeedbackMutation({
      refetchQueries: ["GetFamilyMember"],
    });

  const handleDeleteFeedback = (fbId: number) => {
    deleteFeedback({ variables: { id: fbId } });
  };

  const relationships = member?.relationships ?? [];
  const familyRelationships = relationships.filter(
    (r) => r.relatedType === "FAMILY_MEMBER",
  );
  const contactRelationships = relationships.filter(
    (r) => r.relatedType === "CONTACT",
  );

  const [deleteRelationship, { loading: deletingRelationship }] =
    useDeleteRelationshipMutation({
      refetchQueries: ["GetFamilyMember"],
    });

  const [deleteContact] = useDeleteContactMutation({
    refetchQueries: ["GetContacts"],
  });

  const handleDeleteContact = async (relationshipId: number, contactId: number) => {
    await deleteRelationship({ variables: { id: relationshipId } });
    await deleteContact({ variables: { id: contactId } });
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
    setEditAllergies(member.allergies ?? "");
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
        id: memberId,
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
          allergies: editAllergies.trim() || undefined,
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
        familyMemberId: memberId,
        email: shareEmail.trim().toLowerCase(),
        role: FamilyMemberShareRole.Editor,
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
    member.userId === user?.email ||
    member.userId === user?.id;

  const memberName = member.firstName + (member.name ? ` ${member.name}` : "");

  return (
    <Flex direction="column" gap="5">
      {/* Deep Analysis (whole-member superset view, no trigger) */}
      <DeepAnalysisPanel
        subjectType={DeepAnalysisSubjectType.FamilyMember}
        subjectId={member.id}
        subjectLabel={memberName}
      />

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
            {member.allergies && (
              <Callout.Root color="red" size="1">
                <Callout.Icon>
                  <ExclamationTriangleIcon />
                </Callout.Icon>
                <Callout.Text>
                  <Text weight="medium">Alergii: </Text>
                  {member.allergies}
                </Callout.Text>
              </Callout.Root>
            )}
            {!member.email &&
              !member.phone &&
              !member.location &&
              !member.occupation &&
              !member.ageYears &&
              !member.dateOfBirth &&
              !member.bio &&
              !member.allergies && (
                <Text size="2" color="gray">
                  No additional details
                </Text>
              )}
          </Flex>
        </Flex>
      </Card>

      {/* Family Relationships */}
      <Card>
        <Flex direction="column" gap="3" p="4">
          <Flex justify="between" align="center">
            <Heading size="4">
              Family Relationships ({familyRelationships.length})
            </Heading>
            {isOwner && (
              <AddFamilyRelationshipButton
                familyMemberId={memberId}
                familyMemberName={memberName}
                size="2"
              />
            )}
          </Flex>
          <Separator size="4" />
          {familyRelationships.length === 0 ? (
            <Text size="2" color="gray">
              No family relationships yet. Link this member to siblings,
              parents, or other family members.
            </Text>
          ) : (
            <Flex direction="column" gap="2">
              {familyRelationships.map((rel) => {
                const person = rel.related;
                if (!person) return null;
                const personHref = `/family/${person.slug || person.id}`;
                return (
                  <Flex
                    key={rel.id}
                    justify="between"
                    align="center"
                    p="2"
                    style={{
                      borderRadius: "var(--radius-2)",
                      background: "var(--gray-a2)",
                      cursor: "pointer",
                    }}
                    onClick={() => router.push(personHref)}
                  >
                    <Flex gap="2" align="center">
                      <Text size="2" weight="medium" color="indigo">
                        {person.firstName}
                        {person.lastName ? ` ${person.lastName}` : ""}
                      </Text>
                      <Badge color="blue" variant="soft" size="1">
                        {rel.relationshipType.replace(/_/g, " ")}
                      </Badge>
                    </Flex>
                    {isOwner && (
                      <AlertDialog.Root>
                        <AlertDialog.Trigger>
                          <Button
                            variant="ghost"
                            color="red"
                            size="1"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <TrashIcon />
                          </Button>
                        </AlertDialog.Trigger>
                        <AlertDialog.Content>
                          <AlertDialog.Title>
                            Remove Relationship
                          </AlertDialog.Title>
                          <AlertDialog.Description>
                            Remove the relationship with {person.firstName}?
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
                                disabled={deletingRelationship}
                                onClick={() =>
                                  deleteRelationship({
                                    variables: { id: rel.id },
                                  })
                                }
                              >
                                Remove
                              </Button>
                            </AlertDialog.Action>
                          </Flex>
                        </AlertDialog.Content>
                      </AlertDialog.Root>
                    )}
                  </Flex>
                );
              })}
            </Flex>
          )}
        </Flex>
      </Card>

      {/* Contacts */}
      <Card>
        <Flex direction="column" gap="3" p="4">
          <Flex justify="between" align="center">
            <Heading size="4">
              Contacts ({contactRelationships.length})
            </Heading>
            {isOwner && (
              <AddContactButton
                familyMemberId={memberId}
                refetchQueries={["GetFamilyMember"]}
                size="2"
              />
            )}
          </Flex>
          <Separator size="4" />
          {contactRelationships.length === 0 ? (
            <Text size="2" color="gray">
              No contacts added yet
            </Text>
          ) : (
            <Flex direction="column" gap="2">
              {contactRelationships.map((rel) => {
                const contact = rel.related;
                if (!contact) return null;
                const contactHref = `/family/${memberSlugOrId}/contacts/${contact.slug || contact.id}`;
                return (
                  <Flex
                    key={rel.id}
                    justify="between"
                    align="center"
                    p="2"
                    style={{
                      borderRadius: "var(--radius-2)",
                      background: "var(--gray-a2)",
                      cursor: "pointer",
                    }}
                    onClick={() => router.push(contactHref)}
                  >
                    <Flex gap="2" align="center">
                      <Text size="2" weight="medium" color="indigo">
                        {contact.firstName}
                        {contact.lastName ? ` ${contact.lastName}` : ""}
                      </Text>
                      <Badge color="violet" variant="soft" size="1">
                        {rel.relationshipType.replace(/_/g, " ")}
                      </Badge>
                    </Flex>
                    {isOwner && (
                      <AlertDialog.Root>
                        <AlertDialog.Trigger>
                          <Button
                            variant="ghost"
                            color="red"
                            size="1"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <TrashIcon />
                          </Button>
                        </AlertDialog.Trigger>
                        <AlertDialog.Content>
                          <AlertDialog.Title>Remove Contact</AlertDialog.Title>
                          <AlertDialog.Description>
                            Remove {contact.firstName} as a contact? This will
                            delete the contact and the relationship.
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
                                disabled={deletingRelationship}
                                onClick={() =>
                                  handleDeleteContact(rel.id, contact.id)
                                }
                              >
                                Remove
                              </Button>
                            </AlertDialog.Action>
                          </Flex>
                        </AlertDialog.Content>
                      </AlertDialog.Root>
                    )}
                  </Flex>
                );
              })}
            </Flex>
          )}
        </Flex>
      </Card>

      {/* Family documents (migrated from agentic-healthcare; hidden when empty) */}
      <FamilyDocumentsSection familyMemberId={memberId} />

      {/* Blood Tests */}
      <Card>
        <Flex direction="column" gap="3" p="4">
          <Flex justify="between" align="center">
            <Heading size="4">
              Blood Tests ({(member.bloodTests ?? []).length})
            </Heading>
            {isOwner && (
              <Button variant="soft" size="2" asChild>
                <NextLink href="/blood-tests">Upload</NextLink>
              </Button>
            )}
          </Flex>
          <Separator size="4" />
          {(member.bloodTests ?? []).length === 0 ? (
            <Text size="2" color="gray">
              No blood tests linked yet.
            </Text>
          ) : (
            <Flex direction="column" gap="2">
              {(member.bloodTests ?? []).map((t) => (
                <Flex
                  key={t.id}
                  justify="between"
                  align="center"
                  p="2"
                  style={{
                    borderRadius: "var(--radius-2)",
                    background: "var(--gray-a2)",
                  }}
                >
                  <Flex direction="column" gap="1" style={{ minWidth: 0, flex: 1 }}>
                    <Flex gap="2" align="center" wrap="wrap">
                      <Text size="2" weight="medium">
                        {t.fileName}
                      </Text>
                      <Badge
                        color={BLOOD_TEST_STATUS_COLOR[t.status] ?? "gray"}
                        variant="soft"
                        size="1"
                      >
                        {t.status}
                      </Badge>
                      {t.markersCount > 0 && (
                        <Badge color="blue" variant="soft" size="1">
                          {t.markersCount} marker
                          {t.markersCount !== 1 ? "s" : ""}
                        </Badge>
                      )}
                    </Flex>
                    <Flex gap="3" wrap="wrap">
                      {t.testDate && (
                        <Text size="1" color="gray">
                          Test: {t.testDate}
                        </Text>
                      )}
                      <Text size="1" color="gray">
                        Uploaded {new Date(t.uploadedAt).toLocaleDateString()}
                      </Text>
                    </Flex>
                  </Flex>
                  <Button
                    asChild
                    variant="ghost"
                    color="gray"
                    size="1"
                    aria-label="View blood test"
                  >
                    <a
                      href={`/api/healthcare/blood-test-file/${t.id}`}
                      target="_blank"
                      rel="noreferrer"
                    >
                      <EyeOpenIcon />
                    </a>
                  </Button>
                </Flex>
              ))}
            </Flex>
          )}
        </Flex>
      </Card>

      {/* Goals */}
      <Card>
        <Flex direction="column" gap="3" p="4">
          <Flex justify="between" align="center">
            <Heading size="4">Goals ({member.goals.length})</Heading>
            <AddGoalButton
              presetFamilyMemberId={memberId}
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

      {/* Issues */}
      <Card>
        <Flex direction="column" gap="3" p="4">
          <Flex justify="between" align="center">
            <Heading size="4">Issues ({issues.length})</Heading>
            <Flex gap="2">
              <AddIssueButton familyMemberId={memberId} size="2" />
              <Button
                variant="soft"
                size="2"
                onClick={() => router.push(`/family/${memberSlugOrId}/issues`)}
              >
                View All
              </Button>
            </Flex>
          </Flex>
          <Separator size="4" />
          {issues.length === 0 ? (
            <Text size="2" color="gray">
              No issues yet. Extract issues from contact feedback or add them manually.
            </Text>
          ) : (
            <Flex direction="column" gap="2">
              {issues.slice(0, 5).map((issue) => (
                <Card
                  key={issue.id}
                  style={{ cursor: "pointer" }}
                  onClick={() => router.push(`/family/${memberSlugOrId}/issues/${issue.id}`)}
                >
                  <Flex justify="between" align="center" p="3">
                    <Flex direction="column" gap="1" style={{ flex: 1 }}>
                      <Flex gap="2" align="center">
                        <Text size="2" weight="medium">
                          {issue.title}
                        </Text>
                        <Badge
                          color={getSeverityColor(issue.severity)}
                          variant="soft"
                          size="1"
                        >
                          {issue.severity}
                        </Badge>
                        <Badge
                          color={getCategoryColor(issue.category)}
                          variant="outline"
                          size="1"
                        >
                          {issue.category}
                        </Badge>
                      </Flex>
                      {issue.description && (
                        <Text
                          size="1"
                          color="gray"
                          style={{
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                          }}
                        >
                          {issue.description}
                        </Text>
                      )}
                    </Flex>
                    <AlertDialog.Root>
                      <AlertDialog.Trigger>
                        <Button
                          variant="ghost"
                          color="red"
                          size="1"
                          disabled={deletingIssue}
                          onClick={(e) => e.stopPropagation()}
                        >
                          <TrashIcon />
                        </Button>
                      </AlertDialog.Trigger>
                      <AlertDialog.Content>
                        <AlertDialog.Title>Delete Issue</AlertDialog.Title>
                        <AlertDialog.Description>
                          Remove &quot;{issue.title}&quot;? This action cannot be undone.
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
                              disabled={deletingIssue}
                              onClick={() => handleDeleteIssue(issue.id)}
                            >
                              Delete
                            </Button>
                          </AlertDialog.Action>
                        </Flex>
                      </AlertDialog.Content>
                    </AlertDialog.Root>
                  </Flex>
                </Card>
              ))}
              {issues.length > 5 && (
                <Text size="2" color="gray" align="center">
                  +{issues.length - 5} more issues
                </Text>
              )}
            </Flex>
          )}
        </Flex>
      </Card>

      {/* Affirmations */}
      <Card>
        <Flex direction="column" gap="3" p="4">
          <Flex justify="between" align="center">
            <Heading size="4">Affirmations</Heading>
            <Button
              variant="soft"
              size="2"
              onClick={() => router.push(`/family/${memberSlugOrId}/affirmations`)}
            >
              View All
            </Button>
          </Flex>
          <Separator size="4" />
          <Text size="2" color="gray">
            Positive affirmations to encourage and support {member.firstName}.
          </Text>
        </Flex>
      </Card>

      {/* Plant Plan — Bogdan-only entry point */}
      {member.firstName?.trim().toLowerCase() === "bogdan" && (
        <Card>
          <Flex direction="column" gap="3" p="4">
            <Flex justify="between" align="center">
              <Flex direction="column" gap="1">
                <Heading size="4">Plant Plan</Heading>
                <Text size="1" color="gray">
                  A single living plant-based, non-pharmacologic plan grounded
                  in {member.firstName}'s issues, characteristics, and allergies.
                </Text>
              </Flex>
              <Button
                variant="soft"
                size="2"
                onClick={() =>
                  router.push(`/family/${memberSlugOrId}/calming-plan`)
                }
              >
                Open
              </Button>
            </Flex>
            <Separator size="4" />
            <Text size="2" color="gray">
              Each generation merges prior plans with current state, biased
              toward botanical interventions (herbal teas, plant foods, plant-
              derived supplements, sensory plant materials, aromatherapy).
            </Text>
          </Flex>
        </Card>
      )}

      {/* Teacher Feedback */}
      <Card>
        <Flex direction="column" gap="3" p="4">
          <Flex justify="between" align="center">
            <Flex direction="column" gap="1">
              <Heading size="4">
                Teacher Feedback ({teacherFeedbacks.length})
              </Heading>
              <Text size="1" color="gray">
                Feedback from teachers — can be extracted into issues
              </Text>
            </Flex>
            <AddTeacherFeedbackButton
              familyMemberId={memberId}
              refetchQueries={["GetFamilyMember"]}
              size="2"
            />
          </Flex>
          <Separator size="4" />
          <TeacherFeedbackList
            feedbacks={teacherFeedbacks}
            onDelete={handleDeleteFeedback}
            deleting={deletingFeedback}
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
                                    familyMemberId: memberId,
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
              <label>
                <Text as="div" size="2" mb="1" weight="medium">
                  Alergii
                </Text>
                <TextArea
                  placeholder="ex. polen, alune, lactate"
                  value={editAllergies}
                  onChange={(e) => setEditAllergies(e.target.value)}
                  rows={2}
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
  const raw = params.id as string;
  const isNumeric = /^\d+$/.test(raw);
  const id = isNumeric ? parseInt(raw, 10) : NaN;
  const slug = isNumeric ? undefined : raw;

  const { data } = useGetFamilyMemberQuery({
    variables: isNumeric ? { id } : { slug },
    skip: isNumeric ? isNaN(id) : !slug,
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
            <NextLink href="/family">
              <ArrowLeftIcon />
              <Box display={{ initial: "none", sm: "inline" }} asChild>
                <span>Family</span>
              </Box>
            </NextLink>
          </Button>

          <Box display={{ initial: "none", sm: "block" }}><Separator orientation="vertical" style={{ height: 20 }} /></Box>

          <Box minWidth="0" style={{ flex: 1 }}>
            <Heading size={{ initial: "5", md: "8" }} weight="bold" truncate>
              {member
                ? `${member.firstName}${member.name ? ` ${member.name}` : ""}`
                : "Family Member"}
            </Heading>
          </Box>

          {member?.relationship === "self" ? (
            <Badge color="indigo" variant="solid" size="2">
              You
            </Badge>
          ) : member?.relationship ? (
            <Badge
              color={getRelationshipColor(member.relationship)}
              variant="soft"
              size="2"
            >
              {member.relationship}
            </Badge>
          ) : null}

          {member && (
            <Button size="2" asChild>
              <NextLink href={`/stories/new?familyMemberId=${member.id}`}>
                Generate Story
              </NextLink>
            </Button>
          )}
        </Flex>
      </Box>

      <Box style={{ maxWidth: "1200px", margin: "0 auto", width: "100%" }}>
        <DynamicFamilyMemberContent />
      </Box>
    </Flex>
  );
}
