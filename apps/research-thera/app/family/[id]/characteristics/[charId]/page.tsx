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
  IconButton,
  Callout,
} from "@radix-ui/themes";
import { ArrowLeftIcon, Pencil1Icon, TrashIcon, PlusIcon, Cross2Icon, ExclamationTriangleIcon, MagnifyingGlassIcon } from "@radix-ui/react-icons";
import { useRouter, useParams } from "next/navigation";
import NextLink from "next/link";
import dynamic from "next/dynamic";
import {
  useGetFamilyMemberCharacteristicQuery,
  useUpdateFamilyMemberCharacteristicMutation,
  useDeleteFamilyMemberCharacteristicMutation,
  useGetRelationshipsQuery,
  useCreateRelationshipMutation,
  useDeleteRelationshipMutation,
  useGetFamilyMembersQuery,
  useGetContactsQuery,
  useCreateContactMutation,
  useGetGoalsQuery,
  useGenerateLongFormTextMutation,
  useGenerateResearchMutation,
  useGetGenerationJobQuery,
  useCreateUniqueOutcomeMutation,
  useDeleteUniqueOutcomeMutation,
  CharacteristicCategory,
  PersonType,
  RelationshipStatus,
  RiskTier,
  SeverityLevel,
  FormulationStatus,
  ImpairmentDomain,
} from "@/app/__generated__/hooks";
import { useApolloClient } from "@apollo/client";
import AddGoalButton from "@/app/components/AddGoalButton";
import { CheckCircledIcon } from "@radix-ui/react-icons";

const CATEGORY_COLORS: Record<string, "teal" | "blue" | "orange"> = {
  [CharacteristicCategory.Strength]: "teal",
  [CharacteristicCategory.SupportNeed]: "blue",
  [CharacteristicCategory.PriorityConcern]: "orange",
};

const CATEGORY_OPTIONS = [
  { value: CharacteristicCategory.Strength, label: "Strength" },
  { value: CharacteristicCategory.SupportNeed, label: "Support Priority" },
  { value: CharacteristicCategory.PriorityConcern, label: "Priority Concern" },
];

function getDevelopmentalTier(ageYears: number | null | undefined): string {
  if (!ageYears) return "Unknown";
  if (ageYears <= 5) return "Early Childhood (2\u20135)";
  if (ageYears <= 11) return "Middle Childhood (6\u201311)";
  if (ageYears <= 14) return "Early Adolescence (12\u201314)";
  if (ageYears <= 18) return "Late Adolescence (15\u201318)";
  return "Adult";
}

const RELATIONSHIP_TYPE_OPTIONS = [
  { value: "parent", label: "Parent" },
  { value: "child", label: "Child" },
  { value: "sibling", label: "Sibling" },
  { value: "spouse", label: "Spouse" },
  { value: "partner", label: "Partner" },
  { value: "friend", label: "Friend" },
  { value: "teacher", label: "Teacher" },
  { value: "therapist", label: "Therapist" },
  { value: "peer", label: "Peer" },
  { value: "classmate", label: "Classmate" },
  { value: "peer-conflict-perpetrating", label: "Peer Conflict \u2014 Perpetrating" },
  { value: "peer-conflict-targeted", label: "Peer Conflict \u2014 Targeted" },
  { value: "witness", label: "Witness" },
  { value: "other", label: "Other" },
];

const PEER_CONFLICT_KEYWORDS = [
  "peer conflict", "conflict", "intimidat", "harass", "agres",
  "violenta", "violență", "intimidare", "hărțuire", "batjocur",
  "persecutat", "abuz", "abuse", "taunt", "mock",
];

function isPeerConflictRelated(title: string, description?: string | null): boolean {
  const text = `${title} ${description ?? ""}`.toLowerCase();
  return PEER_CONFLICT_KEYWORDS.some((kw) => text.includes(kw));
}

function RelationshipsSection({
  familyMemberId,
  quickAddType,
}: {
  familyMemberId: number;
  quickAddType?: string;
}) {
  const [addOpen, setAddOpen] = useState(false);
  const [relatedType, setRelatedType] = useState<PersonType>(PersonType.FamilyMember);
  const [relatedId, setRelatedId] = useState<string>("");
  const [relationshipType, setRelationshipType] = useState("friend");
  const [addError, setAddError] = useState<string | null>(null);

  // Inline contact creation state
  const [creatingNewContact, setCreatingNewContact] = useState(false);
  const [newFirstName, setNewFirstName] = useState("");
  const [newLastName, setNewLastName] = useState("");
  const [newRole, setNewRole] = useState("");

  const { data: relsData, loading: relsLoading } = useGetRelationshipsQuery({
    variables: { subjectType: PersonType.FamilyMember, subjectId: familyMemberId },
  });

  const { data: fmData } = useGetFamilyMembersQuery();
  const { data: contactsData } = useGetContactsQuery();

  function openQuickAdd(type: string) {
    setRelationshipType(type);
    setRelatedType(PersonType.Contact);
    setRelatedId("");
    setCreatingNewContact(false);
    setAddError(null);
    setAddOpen(true);
  }

  const [createRelationship, { loading: creating }] = useCreateRelationshipMutation({
    onCompleted: () => {
      setAddOpen(false);
      setRelatedId("");
      setRelationshipType("friend");
      setAddError(null);
      setCreatingNewContact(false);
      setNewFirstName("");
      setNewLastName("");
      setNewRole("");
    },
    onError: (err) => setAddError(err.message),
    refetchQueries: ["GetRelationships"],
  });

  const [createContact, { loading: creatingContact }] = useCreateContactMutation({
    onError: (err) => setAddError(err.message),
    refetchQueries: ["GetContacts"],
  });

  const [deleteRelationship] = useDeleteRelationshipMutation({
    refetchQueries: ["GetRelationships"],
  });

  const relationships = relsData?.relationships ?? [];

  const personOptions =
    relatedType === PersonType.FamilyMember
      ? (fmData?.familyMembers ?? [])
          .filter((fm) => fm.id !== familyMemberId)
          .map((fm) => ({
            value: String(fm.id),
            label: [fm.firstName, fm.name].filter(Boolean).join(" "),
          }))
      : (contactsData?.contacts ?? []).map((c) => ({
          value: String(c.id),
          label: [c.firstName, c.lastName].filter(Boolean).join(" "),
        }));

  function getPersonLabel(type: PersonType, id: number) {
    if (type === PersonType.FamilyMember) {
      const fm = fmData?.familyMembers?.find((f) => f.id === id);
      return fm ? [fm.firstName, fm.name].filter(Boolean).join(" ") : `#${id}`;
    }
    const c = contactsData?.contacts?.find((x) => x.id === id);
    return c ? [c.firstName, c.lastName].filter(Boolean).join(" ") : `#${id}`;
  }

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();

    if (creatingNewContact) {
      if (!newFirstName.trim()) {
        setAddError("First name is required");
        return;
      }
      setAddError(null);
      const contactResult = await createContact({
        variables: {
          input: {
            firstName: newFirstName.trim(),
            lastName: newLastName.trim() || undefined,
            role: newRole.trim() || undefined,
          },
        },
      });
      const newContactId = contactResult.data?.createContact?.id;
      if (!newContactId) return;
      await createRelationship({
        variables: {
          input: {
            subjectType: PersonType.FamilyMember,
            subjectId: familyMemberId,
            relatedType: PersonType.Contact,
            relatedId: newContactId,
            relationshipType,
            status: RelationshipStatus.Active,
          },
        },
      });
      return;
    }

    if (!relatedId) {
      setAddError("Please select a person");
      return;
    }
    await createRelationship({
      variables: {
        input: {
          subjectType: PersonType.FamilyMember,
          subjectId: familyMemberId,
          relatedType,
          relatedId: parseInt(relatedId, 10),
          relationshipType,
          status: RelationshipStatus.Active,
        },
      },
    });
  };

  return (
    <Card>
      <Flex direction="column" gap="3" p="4">
        <Flex justify="between" align="center">
          <Heading size="4">Relationships</Heading>
          <Flex gap="2">
            <Button variant="soft" size="2" onClick={() => setAddOpen(true)}>
              <PlusIcon />
              Add
            </Button>
            {quickAddType && (
              <Button
                variant="solid"
                color="red"
                size="2"
                onClick={() => openQuickAdd(quickAddType)}
              >
                <PlusIcon />
                Link Involved Peer
              </Button>
            )}
          </Flex>
        </Flex>
        <Separator size="4" />

        {relsLoading ? (
          <Spinner size="2" />
        ) : relationships.length === 0 ? (
          <Text size="2" color="gray">
            No relationships yet.
          </Text>
        ) : (
          <Flex direction="column" gap="2">
            {relationships.map((rel) => {
              const otherType =
                rel.relatedType === PersonType.FamilyMember ? "FM" : "Contact";
              const otherLabel = getPersonLabel(rel.relatedType, rel.relatedId);
              return (
                <Flex key={rel.id} align="center" gap="2" justify="between">
                  <Flex align="center" gap="2">
                    <Badge variant="soft" color="indigo" size="1">
                      {rel.relationshipType}
                    </Badge>
                    <Text size="2">{otherLabel}</Text>
                    <Text size="1" color="gray">
                      ({otherType})
                    </Text>
                  </Flex>
                  <AlertDialog.Root>
                    <AlertDialog.Trigger>
                      <IconButton variant="ghost" color="red" size="1">
                        <Cross2Icon />
                      </IconButton>
                    </AlertDialog.Trigger>
                    <AlertDialog.Content>
                      <AlertDialog.Title>Remove Relationship</AlertDialog.Title>
                      <AlertDialog.Description>
                        Remove the &quot;{rel.relationshipType}&quot; relationship with{" "}
                        {otherLabel}?
                      </AlertDialog.Description>
                      <Flex gap="3" justify="end" mt="4">
                        <AlertDialog.Cancel>
                          <Button variant="soft" color="gray">Cancel</Button>
                        </AlertDialog.Cancel>
                        <AlertDialog.Action>
                          <Button
                            color="red"
                            onClick={() => deleteRelationship({ variables: { id: rel.id } })}
                          >
                            Remove
                          </Button>
                        </AlertDialog.Action>
                      </Flex>
                    </AlertDialog.Content>
                  </AlertDialog.Root>
                </Flex>
              );
            })}
          </Flex>
        )}
      </Flex>

      <Dialog.Root open={addOpen} onOpenChange={setAddOpen}>
        <Dialog.Content style={{ maxWidth: 460 }}>
          <Dialog.Title>Add Relationship</Dialog.Title>
          <form onSubmit={handleAdd}>
            <Flex direction="column" gap="3">
              <label>
                <Text as="div" size="2" mb="1" weight="medium">
                  Person type
                </Text>
                <Select.Root
                  value={relatedType}
                  onValueChange={(v) => {
                    setRelatedType(v as PersonType);
                    setRelatedId("");
                    setCreatingNewContact(false);
                    setNewFirstName("");
                    setNewLastName("");
                    setNewRole("");
                  }}
                >
                  <Select.Trigger style={{ width: "100%" }} />
                  <Select.Content>
                    <Select.Item value={PersonType.FamilyMember}>Family Member</Select.Item>
                    <Select.Item value={PersonType.Contact}>Contact</Select.Item>
                  </Select.Content>
                </Select.Root>
              </label>

              {creatingNewContact && relatedType === PersonType.Contact ? (
                <Flex direction="column" gap="2">
                  <Flex justify="between" align="center">
                    <Text size="2" weight="medium">New contact</Text>
                    <Button
                      variant="ghost"
                      size="1"
                      onClick={() => {
                        setCreatingNewContact(false);
                        setNewFirstName("");
                        setNewLastName("");
                        setNewRole("");
                        setAddError(null);
                      }}
                    >
                      &larr; Back to existing contacts
                    </Button>
                  </Flex>
                  <label>
                    <Text as="div" size="1" mb="1" color="gray">First name *</Text>
                    <TextField.Root
                      placeholder="First name"
                      value={newFirstName}
                      onChange={(e) => setNewFirstName(e.target.value)}
                      required
                    />
                  </label>
                  <label>
                    <Text as="div" size="1" mb="1" color="gray">Last name</Text>
                    <TextField.Root
                      placeholder="Last name"
                      value={newLastName}
                      onChange={(e) => setNewLastName(e.target.value)}
                    />
                  </label>
                  <label>
                    <Text as="div" size="1" mb="1" color="gray">Role</Text>
                    <TextField.Root
                      placeholder="e.g. classmate, teacher"
                      value={newRole}
                      onChange={(e) => setNewRole(e.target.value)}
                    />
                  </label>
                </Flex>
              ) : (
                <Flex direction="column" gap="2">
                  <label>
                    <Text as="div" size="2" mb="1" weight="medium">
                      Person
                    </Text>
                    <Select.Root value={relatedId} onValueChange={setRelatedId}>
                      <Select.Trigger
                        placeholder="Select a person…"
                        style={{ width: "100%" }}
                      />
                      <Select.Content>
                        {personOptions.map((opt) => (
                          <Select.Item key={opt.value} value={opt.value}>
                            {opt.label}
                          </Select.Item>
                        ))}
                      </Select.Content>
                    </Select.Root>
                  </label>
                  {relatedType === PersonType.Contact && (
                    <Button
                      variant="ghost"
                      size="1"
                      style={{ alignSelf: "flex-start" }}
                      onClick={() => {
                        setCreatingNewContact(true);
                        setRelatedId("");
                        setAddError(null);
                      }}
                    >
                      + Create new contact
                    </Button>
                  )}
                </Flex>
              )}

              <label>
                <Text as="div" size="2" mb="1" weight="medium">
                  Relationship type
                </Text>
                <Select.Root value={relationshipType} onValueChange={setRelationshipType}>
                  <Select.Trigger style={{ width: "100%" }} />
                  <Select.Content>
                    {RELATIONSHIP_TYPE_OPTIONS.map((t) => (
                      <Select.Item key={t.value} value={t.value}>
                        {t.label}
                      </Select.Item>
                    ))}
                  </Select.Content>
                </Select.Root>
              </label>

              {addError && (
                <Text color="red" size="2">
                  {addError}
                </Text>
              )}

              <Flex gap="3" justify="end" mt="2">
                <Dialog.Close>
                  <Button variant="soft" color="gray" disabled={creating || creatingContact}>
                    Cancel
                  </Button>
                </Dialog.Close>
                <Button type="submit" disabled={creating || creatingContact}>
                  {creating || creatingContact ? "Saving…" : "Add Relationship"}
                </Button>
              </Flex>
            </Flex>
          </form>
        </Dialog.Content>
      </Dialog.Root>
    </Card>
  );
}

const RESEARCH_STEP_LABELS: Record<number, string> = {
  5: "Loading goal context…",
  10: "Preparing search prompts…",
  20: "Planning search queries…",
  40: "Searching Crossref, PubMed, Semantic Scholar…",
  60: "Enriching paper abstracts…",
  65: "Preparing extraction…",
  85: "Extracting relevant findings…",
  95: "Saving papers to database…",
  100: "Research complete!",
};

function CharacteristicDetailContent() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;
  const charId = parseInt(params.charId as string, 10);
  const apolloClient = useApolloClient();

  const { data, loading, error } = useGetFamilyMemberCharacteristicQuery({
    variables: { id: charId },
    skip: isNaN(charId),
  });

  const characteristic = data?.familyMemberCharacteristic;

  // Family member data for developmental tier
  const { data: fmData } = useGetFamilyMembersQuery();
  const familyMember = fmData?.familyMembers?.find(
    (fm) => fm.id === parseInt(id, 10),
  );

  // Edit form state
  const [editOpen, setEditOpen] = useState(false);
  const [editTitle, setEditTitle] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editCategory, setEditCategory] = useState<CharacteristicCategory>(
    CharacteristicCategory.Strength,
  );
  const [editSeverity, setEditSeverity] = useState<SeverityLevel | "">("");
  const [editDurationWeeks, setEditDurationWeeks] = useState("");
  const [editFrequencyPerWeek, setEditFrequencyPerWeek] = useState("");
  const [editImpairmentDomains, setEditImpairmentDomains] = useState<ImpairmentDomain[]>([]);
  const [editExternalizedName, setEditExternalizedName] = useState("");
  const [editStrengths, setEditStrengths] = useState("");
  const [editRiskTier, setEditRiskTier] = useState<RiskTier>(RiskTier.None);
  const [editFormulationStatus, setEditFormulationStatus] = useState<FormulationStatus>(FormulationStatus.Draft);
  const [editError, setEditError] = useState<string | null>(null);

  const [updateCharacteristic, { loading: updating }] =
    useUpdateFamilyMemberCharacteristicMutation({
      onCompleted: () => {
        setEditOpen(false);
        setEditError(null);
      },
      onError: (err) => setEditError(err.message),
      refetchQueries: ["GetFamilyMemberCharacteristic"],
    });

  const [deleteCharacteristic, { loading: deleting }] =
    useDeleteFamilyMemberCharacteristicMutation({
      onCompleted: () => {
        router.push(`/family/${id}`);
      },
    });

  const { data: goalsData } = useGetGoalsQuery({
    variables: { familyMemberId: parseInt(id, 10) },
    skip: isNaN(parseInt(id, 10)),
  });
  const goals = goalsData?.goals ?? [];

  const [generatingGoalId, setGeneratingGoalId] = useState<number | null>(null);
  const [generateLongFormText] = useGenerateLongFormTextMutation();

  const handleGenerateStory = async (goalId: number) => {
    setGeneratingGoalId(goalId);
    try {
      await generateLongFormText({
        variables: { goalId, characteristicId: charId },
      });
      router.push(`/goals/${goalId}`);
    } finally {
      setGeneratingGoalId(null);
    }
  };

  // Research generation state
  const [researchGoalId, setResearchGoalId] = useState<number | null>(null);
  const [researchJobId, setResearchJobId] = useState<string | null>(null);
  const [researchMessage, setResearchMessage] = useState<{
    text: string;
    type: "success" | "error";
  } | null>(null);

  const { data: jobData, stopPolling } = useGetGenerationJobQuery({
    variables: { id: researchJobId! },
    skip: !researchJobId,
    pollInterval: 2000,
    notifyOnNetworkStatusChange: true,
    fetchPolicy: "network-only",
    onCompleted: (d) => {
      const status = d.generationJob?.status;
      if (status === "SUCCEEDED" || status === "FAILED") {
        stopPolling();
        setResearchJobId(null);
        setResearchGoalId(null);
        if (status === "SUCCEEDED") {
          apolloClient.refetchQueries({ include: ["GetGoal"] });
          setResearchMessage({ text: "Research generated successfully.", type: "success" });
        } else {
          setResearchMessage({
            text: d.generationJob?.error?.message ?? "Research generation failed.",
            type: "error",
          });
        }
      }
    },
  });
  const jobProgress = jobData?.generationJob?.progress ?? 0;
  const jobStatus = jobData?.generationJob?.status;
  const isJobRunning = !!researchJobId && jobStatus !== "SUCCEEDED" && jobStatus !== "FAILED";

  const [generateResearch, { loading: generatingResearch }] = useGenerateResearchMutation({
    onCompleted: (data) => {
      if (data.generateResearch.success) {
        setResearchMessage(null);
        if (data.generateResearch.jobId) {
          setResearchJobId(data.generateResearch.jobId);
        }
      } else {
        setResearchGoalId(null);
        setResearchMessage({
          text: data.generateResearch.message || "Failed to generate research.",
          type: "error",
        });
      }
    },
    onError: (err) => {
      setResearchGoalId(null);
      setResearchMessage({ text: err.message || "An error occurred.", type: "error" });
    },
  });

  const handleGenerateResearch = async (goalId: number) => {
    setResearchGoalId(goalId);
    setResearchMessage(null);
    await generateResearch({ variables: { goalId } });
  };

  // Unique outcomes (sparkling moments)
  const [sparklingOpen, setSparklingOpen] = useState(false);
  const [sparklingDate, setSparklingDate] = useState("");
  const [sparklingDescription, setSparklingDescription] = useState("");
  const [sparklingError, setSparklingError] = useState<string | null>(null);

  const [createUniqueOutcome, { loading: creatingOutcome }] = useCreateUniqueOutcomeMutation({
    onCompleted: () => {
      setSparklingOpen(false);
      setSparklingDate("");
      setSparklingDescription("");
      setSparklingError(null);
    },
    onError: (err) => setSparklingError(err.message),
    refetchQueries: ["GetFamilyMemberCharacteristic"],
  });

  const [deleteUniqueOutcome, { loading: deletingOutcome }] = useDeleteUniqueOutcomeMutation({
    refetchQueries: ["GetFamilyMemberCharacteristic"],
  });

  // Safeguarding acknowledgment
  const handleSafeguardingAck = async () => {
    await updateCharacteristic({
      variables: {
        id: charId,
        input: { riskTier: RiskTier.Concern },
      },
    });
  };

  function openEditDialog() {
    if (!characteristic) return;
    setEditTitle(characteristic.title);
    setEditDescription(characteristic.description ?? "");
    setEditCategory(characteristic.category);
    setEditSeverity(characteristic.severity ?? "");
    setEditDurationWeeks(characteristic.durationWeeks ? String(characteristic.durationWeeks) : "");
    setEditFrequencyPerWeek(characteristic.frequencyPerWeek ? String(characteristic.frequencyPerWeek) : "");
    setEditImpairmentDomains([...characteristic.impairmentDomains]);
    setEditExternalizedName(characteristic.externalizedName ?? "");
    setEditStrengths(characteristic.strengths ?? "");
    setEditRiskTier(characteristic.riskTier);
    setEditFormulationStatus(characteristic.formulationStatus);
    setEditError(null);
    setEditOpen(true);
  }

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editTitle.trim()) {
      setEditError("Title is required");
      return;
    }
    await updateCharacteristic({
      variables: {
        id: charId,
        input: {
          title: editTitle.trim(),
          description: editDescription.trim() || undefined,
          category: editCategory,
          severity: editSeverity || undefined,
          durationWeeks: editDurationWeeks ? parseInt(editDurationWeeks, 10) : undefined,
          frequencyPerWeek: editFrequencyPerWeek ? parseInt(editFrequencyPerWeek, 10) : undefined,
          impairmentDomains: editImpairmentDomains.length > 0 ? editImpairmentDomains : undefined,
          externalizedName: editExternalizedName.trim() || undefined,
          strengths: editStrengths.trim() || undefined,
          riskTier: editRiskTier,
          formulationStatus: editFormulationStatus,
        },
      },
    });
  };

  const handleDelete = () => {
    deleteCharacteristic({ variables: { id: charId } });
  };

  const toggleImpairmentDomain = (domain: ImpairmentDomain) => {
    setEditImpairmentDomains((prev) =>
      prev.includes(domain) ? prev.filter((d) => d !== domain) : [...prev, domain],
    );
  };

  if (loading) {
    return (
      <Flex justify="center" align="center" style={{ minHeight: "200px" }}>
        <Spinner size="3" />
      </Flex>
    );
  }

  if (error || !characteristic) {
    return (
      <Card>
        <Text color="red">
          {error ? `Error: ${error.message}` : "Characteristic not found"}
        </Text>
      </Card>
    );
  }

  const categoryLabel = CATEGORY_OPTIONS.find((o) => o.value === characteristic.category)?.label
    ?? (characteristic.category.charAt(0) + characteristic.category.slice(1).toLowerCase().replace(/_/g, " "));

  const isPeerConflict = isPeerConflictRelated(
    characteristic.title,
    characteristic.description,
  );

  const isSafeguarding = characteristic.riskTier === RiskTier.SafeguardingAlert;
  const isFormulationReady = characteristic.formulationStatus !== FormulationStatus.Draft;
  const canGenerate = !isSafeguarding && isFormulationReady;

  const memberName = familyMember?.firstName ?? "this person";
  const uniqueOutcomes = characteristic.uniqueOutcomes ?? [];

  return (
    <Flex direction="column" gap="5">
      {/* Safeguarding gate */}
      {isSafeguarding && (
        <Callout.Root color="red" variant="surface">
          <Callout.Icon>
            <ExclamationTriangleIcon />
          </Callout.Icon>
          <Callout.Text>
            <Text weight="bold" as="div" mb="2">
              Active safeguarding concern. Story generation and characteristic
              deletion are blocked until a supervisor acknowledgment is recorded.
            </Text>
            <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}>
              <input
                type="checkbox"
                onChange={handleSafeguardingAck}
                disabled={updating}
              />
              <Text size="2">
                Supervisor acknowledgment recorded (this updates the risk tier)
              </Text>
            </label>
          </Callout.Text>
        </Callout.Root>
      )}

      {/* Peer conflict context banner */}
      {isPeerConflict && !isSafeguarding && (
        <Callout.Root color="red" variant="surface">
          <Callout.Icon>
            <ExclamationTriangleIcon />
          </Callout.Icon>
          <Callout.Text>
            This area may involve peer conflict. Document involved people in
            the Relationships section below. Use{" "}
            <strong>Link Involved Peer</strong> to connect the person(s)
            involved.
          </Callout.Text>
        </Callout.Root>
      )}

      {/* 1. Strengths & Context */}
      {(characteristic.strengths || characteristic.externalizedName) && (
        <Card>
          <Flex direction="column" gap="3" p="4">
            <Heading size="4">Strengths & Context</Heading>
            <Separator size="4" />
            {characteristic.strengths && (
              <Flex direction="column" gap="1">
                <Text size="2" weight="medium">
                  What {memberName} does well in relation to this area
                </Text>
                <Text size="2" color="gray">
                  {characteristic.strengths}
                </Text>
              </Flex>
            )}
            {characteristic.externalizedName && (
              <Flex direction="column" gap="1">
                <Text size="2" weight="medium">
                  What your family calls this
                </Text>
                <Text size="2" color="gray">
                  {characteristic.externalizedName}
                </Text>
              </Flex>
            )}
          </Flex>
        </Card>
      )}

      {/* 2. Generate Story (with formulation readiness check) */}
      <Card>
        <Flex direction="column" gap="3" p="4">
          <Flex justify="between" align="center">
            <Flex direction="column" gap="1">
              <Heading size="4">Generate Story</Heading>
              <Text size="1" color="gray">
                Create a therapeutic story focused on this characteristic
              </Text>
            </Flex>
          </Flex>
          <Separator size="4" />

          {/* Formulation readiness checklist */}
          <Flex direction="column" gap="1">
            <Flex gap="2" align="center">
              {characteristic.severity ? (
                <CheckCircledIcon color="var(--green-9)" />
              ) : (
                <Cross2Icon color="var(--gray-8)" />
              )}
              <Text size="2" color={characteristic.severity ? undefined : "gray"}>
                Severity set
              </Text>
            </Flex>
            <Flex gap="2" align="center">
              {characteristic.impairmentDomains.length > 0 ? (
                <CheckCircledIcon color="var(--green-9)" />
              ) : (
                <Cross2Icon color="var(--gray-8)" />
              )}
              <Text size="2" color={characteristic.impairmentDomains.length > 0 ? undefined : "gray"}>
                Impairment domains set
              </Text>
            </Flex>
            <Flex gap="2" align="center">
              {characteristic.durationWeeks ? (
                <CheckCircledIcon color="var(--green-9)" />
              ) : (
                <Cross2Icon color="var(--gray-8)" />
              )}
              <Text size="2" color={characteristic.durationWeeks ? undefined : "gray"}>
                Duration set
              </Text>
            </Flex>
          </Flex>

          {characteristic.formulationStatus === FormulationStatus.Draft && (
            <Callout.Root color="orange" variant="soft" size="1">
              <Callout.Text>
                Complete the clinical assessment before generating a story.
              </Callout.Text>
            </Callout.Root>
          )}

          {isSafeguarding && (
            <Callout.Root color="red" variant="soft" size="1">
              <Callout.Text>
                Story generation is blocked while a safeguarding alert is active.
              </Callout.Text>
            </Callout.Root>
          )}

          {/* Data transparency callout */}
          <Callout.Root color="gray" variant="soft" size="1">
            <Callout.Text>
              Stories are generated using AI. The characteristic description,
              goal, and sparkling moments are sent for generation. Data is not
              used for AI training.
            </Callout.Text>
          </Callout.Root>

          {goals.length === 0 ? (
            <Flex direction="column" gap="2">
              <Text size="2" color="gray">
                No goals yet. Create a goal first to generate a story.
              </Text>
              <AddGoalButton
                presetFamilyMemberId={parseInt(id, 10)}
                presetTitle={characteristic.title}
                presetDescription={characteristic.description ?? undefined}
                refetchQueries={["GetGoals", "GetFamilyMember"]}
                size="2"
              />
            </Flex>
          ) : (
            <Flex direction="column" gap="2">
              {goals.map((goal) => (
                <Flex key={goal.id} align="center" justify="between" gap="2">
                  <Text size="2" style={{ flex: 1, minWidth: 0 }} truncate>
                    {goal.title}
                  </Text>
                  <Button
                    size="2"
                    variant="soft"
                    disabled={!canGenerate || generatingGoalId !== null}
                    loading={generatingGoalId === goal.id}
                    onClick={() => handleGenerateStory(goal.id)}
                  >
                    Generate
                  </Button>
                </Flex>
              ))}
            </Flex>
          )}
        </Flex>
      </Card>

      {/* 3. Details */}
      <Card>
        <Flex direction="column" gap="3" p="4">
          <Flex justify="between" align="center">
            <Heading size="4">Details</Heading>
            <Flex gap="2">
              <AddGoalButton
                presetFamilyMemberId={parseInt(id, 10)}
                presetTitle={characteristic.title}
                presetDescription={characteristic.description ?? undefined}
                refetchQueries={["GetFamilyMember"]}
                size="2"
              />
              <Button variant="soft" size="2" onClick={openEditDialog}>
                <Pencil1Icon />
                Edit
              </Button>
              <AlertDialog.Root>
                <AlertDialog.Trigger>
                  <Button variant="soft" color="red" size="2" disabled={deleting || isSafeguarding}>
                    <TrashIcon />
                    Delete
                  </Button>
                </AlertDialog.Trigger>
                <AlertDialog.Content>
                  <AlertDialog.Title>Delete Characteristic</AlertDialog.Title>
                  <AlertDialog.Description>
                    Remove &quot;{characteristic.title}&quot;? This action cannot
                    be undone.
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
                        Delete
                      </Button>
                    </AlertDialog.Action>
                  </Flex>
                </AlertDialog.Content>
              </AlertDialog.Root>
            </Flex>
          </Flex>
          <Separator size="4" />
          <Flex direction="column" gap="2">
            <Flex gap="2">
              <Text size="2" weight="medium" style={{ minWidth: 100 }}>
                Category
              </Text>
              <Badge
                color={CATEGORY_COLORS[characteristic.category]}
                variant="soft"
                size="1"
              >
                {categoryLabel}
              </Badge>
            </Flex>
            {characteristic.description && (
              <Flex gap="2">
                <Text size="2" weight="medium" style={{ minWidth: 100 }}>
                  Description
                </Text>
                <Text size="2" color="gray">
                  {characteristic.description}
                </Text>
              </Flex>
            )}
            {characteristic.severity && (
              <Flex gap="2">
                <Text size="2" weight="medium" style={{ minWidth: 100 }}>
                  Severity
                </Text>
                <Text size="2" color="gray">
                  {characteristic.severity.charAt(0) + characteristic.severity.slice(1).toLowerCase()}
                </Text>
              </Flex>
            )}
            {characteristic.durationWeeks && (
              <Flex gap="2">
                <Text size="2" weight="medium" style={{ minWidth: 100 }}>
                  Duration
                </Text>
                <Text size="2" color="gray">
                  {characteristic.durationWeeks} weeks
                </Text>
              </Flex>
            )}
            {characteristic.frequencyPerWeek && (
              <Flex gap="2">
                <Text size="2" weight="medium" style={{ minWidth: 100 }}>
                  Frequency
                </Text>
                <Text size="2" color="gray">
                  {characteristic.frequencyPerWeek}x per week
                </Text>
              </Flex>
            )}
            {characteristic.impairmentDomains.length > 0 && (
              <Flex gap="2">
                <Text size="2" weight="medium" style={{ minWidth: 100 }}>
                  Impairment
                </Text>
                <Flex gap="1" wrap="wrap">
                  {characteristic.impairmentDomains.map((d) => (
                    <Badge key={d} variant="soft" size="1" color="gray">
                      {d.replace(/_/g, " ").charAt(0) + d.replace(/_/g, " ").slice(1).toLowerCase()}
                    </Badge>
                  ))}
                </Flex>
              </Flex>
            )}
            <Flex gap="2">
              <Text size="2" weight="medium" style={{ minWidth: 100 }}>
                Risk Tier
              </Text>
              <Badge
                variant="soft"
                size="1"
                color={
                  characteristic.riskTier === RiskTier.SafeguardingAlert ? "red"
                    : characteristic.riskTier === RiskTier.Concern ? "orange"
                    : characteristic.riskTier === RiskTier.Watch ? "yellow"
                    : "gray"
                }
              >
                {characteristic.riskTier.replace(/_/g, " ").charAt(0) +
                  characteristic.riskTier.replace(/_/g, " ").slice(1).toLowerCase()}
              </Badge>
            </Flex>
            <Flex gap="2">
              <Text size="2" weight="medium" style={{ minWidth: 100 }}>
                Status
              </Text>
              <Badge variant="soft" size="1" color={
                characteristic.formulationStatus === FormulationStatus.Formulated ? "green"
                  : characteristic.formulationStatus === FormulationStatus.Assessed ? "blue"
                  : "gray"
              }>
                {characteristic.formulationStatus.charAt(0) +
                  characteristic.formulationStatus.slice(1).toLowerCase()}
              </Badge>
            </Flex>
            <Flex gap="2">
              <Text size="2" weight="medium" style={{ minWidth: 100 }}>
                Created
              </Text>
              <Text size="2" color="gray">
                {new Date(characteristic.createdAt).toLocaleDateString()}
              </Text>
            </Flex>
          </Flex>
        </Flex>
      </Card>

      {/* 4. Relationships */}
      <RelationshipsSection
        familyMemberId={parseInt(id, 10)}
        quickAddType={isPeerConflict ? "peer-conflict-targeted" : undefined}
      />

      {/* 5. Sparkling Moments */}
      <Card>
        <Flex direction="column" gap="3" p="4">
          <Flex justify="between" align="center">
            <Flex direction="column" gap="1">
              <Heading size="4">Sparkling Moments</Heading>
              <Text size="1" color="gray">
                Times when the challenge had less influence
              </Text>
            </Flex>
            <Button variant="soft" size="2" onClick={() => setSparklingOpen(true)}>
              <PlusIcon />
              Add Sparkling Moment
            </Button>
          </Flex>
          <Separator size="4" />
          {uniqueOutcomes.length === 0 ? (
            <Text size="2" color="gray">
              No sparkling moments recorded yet.
            </Text>
          ) : (
            <Flex direction="column" gap="2">
              {uniqueOutcomes.map((outcome) => (
                <Flex key={outcome.id} justify="between" align="start" gap="2"
                  p="2" style={{ borderRadius: "var(--radius-2)", background: "var(--gray-a2)" }}
                >
                  <Flex direction="column" gap="1" style={{ flex: 1 }}>
                    <Text size="1" color="gray">
                      {new Date(outcome.observedAt).toLocaleDateString(undefined, {
                        year: "numeric", month: "short", day: "numeric",
                      })}
                    </Text>
                    <Text size="2">{outcome.description}</Text>
                  </Flex>
                  <AlertDialog.Root>
                    <AlertDialog.Trigger>
                      <IconButton variant="ghost" color="red" size="1" disabled={deletingOutcome}>
                        <Cross2Icon />
                      </IconButton>
                    </AlertDialog.Trigger>
                    <AlertDialog.Content>
                      <AlertDialog.Title>Delete Sparkling Moment</AlertDialog.Title>
                      <AlertDialog.Description>
                        Remove this sparkling moment? This cannot be undone.
                      </AlertDialog.Description>
                      <Flex gap="3" justify="end" mt="4">
                        <AlertDialog.Cancel>
                          <Button variant="soft" color="gray">Cancel</Button>
                        </AlertDialog.Cancel>
                        <AlertDialog.Action>
                          <Button
                            color="red"
                            disabled={deletingOutcome}
                            onClick={() => deleteUniqueOutcome({ variables: { id: outcome.id } })}
                          >
                            Delete
                          </Button>
                        </AlertDialog.Action>
                      </Flex>
                    </AlertDialog.Content>
                  </AlertDialog.Root>
                </Flex>
              ))}
            </Flex>
          )}
        </Flex>

        <Dialog.Root open={sparklingOpen} onOpenChange={setSparklingOpen}>
          <Dialog.Content style={{ maxWidth: 460 }}>
            <Dialog.Title>Add Sparkling Moment</Dialog.Title>
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                if (!sparklingDescription.trim()) {
                  setSparklingError("Description is required");
                  return;
                }
                await createUniqueOutcome({
                  variables: {
                    input: {
                      characteristicId: charId,
                      observedAt: sparklingDate || new Date().toISOString().split("T")[0],
                      description: sparklingDescription.trim(),
                    },
                  },
                });
              }}
            >
              <Flex direction="column" gap="3">
                <label>
                  <Text as="div" size="2" mb="1" weight="medium">Date</Text>
                  <TextField.Root
                    type="date"
                    value={sparklingDate}
                    onChange={(e) => setSparklingDate(e.target.value)}
                    disabled={creatingOutcome}
                  />
                </label>
                <label>
                  <Text as="div" size="2" mb="1" weight="medium">Description *</Text>
                  <TextArea
                    placeholder="What happened? When did the challenge have less influence?"
                    value={sparklingDescription}
                    onChange={(e) => setSparklingDescription(e.target.value)}
                    rows={3}
                    disabled={creatingOutcome}
                  />
                </label>
                {sparklingError && (
                  <Text color="red" size="2">{sparklingError}</Text>
                )}
                <Flex gap="3" justify="end" mt="2">
                  <Dialog.Close>
                    <Button variant="soft" color="gray" disabled={creatingOutcome}>Cancel</Button>
                  </Dialog.Close>
                  <Button type="submit" disabled={creatingOutcome}>
                    {creatingOutcome ? "Saving..." : "Add"}
                  </Button>
                </Flex>
              </Flex>
            </form>
          </Dialog.Content>
        </Dialog.Root>
      </Card>

      {/* Generate Research */}
      <Card>
        <Flex direction="column" gap="3" p="4">
          <Flex justify="between" align="center">
            <Flex direction="column" gap="1">
              <Heading size="4">Generate Research</Heading>
              <Text size="1" color="gray">
                Find academic papers for a goal linked to this characteristic
              </Text>
            </Flex>
          </Flex>
          <Separator size="4" />
          {researchMessage && (
            <Text size="2" color={researchMessage.type === "success" ? "green" : "red"}>
              {researchMessage.text}
            </Text>
          )}
          {isJobRunning ? (
            <Flex direction="column" gap="2">
              <Flex justify="between" align="center">
                <Text size="2" color="gray">
                  {RESEARCH_STEP_LABELS[jobProgress] ?? "Searching for papers\u2026"}
                </Text>
                {jobProgress > 0 && (
                  <Text size="2" color="gray">{jobProgress}%</Text>
                )}
              </Flex>
              <Box style={{ height: 6, borderRadius: 3, background: "var(--gray-4)", overflow: "hidden" }}>
                {jobProgress > 0 ? (
                  <Box style={{ height: "100%", width: `${jobProgress}%`, background: "var(--indigo-9)", transition: "width 0.4s ease", borderRadius: 3 }} />
                ) : (
                  <Box style={{ height: "100%", width: "40%", background: "var(--indigo-9)", borderRadius: 3, animation: "researchSweep 1.4s ease-in-out infinite" }} />
                )}
              </Box>
            </Flex>
          ) : goals.length === 0 ? (
            <Flex direction="column" gap="2">
              <Text size="2" color="gray">
                No goals yet. Create a goal first to generate research.
              </Text>
              <AddGoalButton
                presetFamilyMemberId={parseInt(id, 10)}
                presetTitle={characteristic.title}
                presetDescription={characteristic.description ?? undefined}
                refetchQueries={["GetGoals", "GetFamilyMember"]}
                size="2"
              />
            </Flex>
          ) : (
            <Button
              size="2"
              variant="soft"
              disabled={generatingResearch}
              loading={generatingResearch}
              onClick={() => handleGenerateResearch(goals[0].id)}
            >
              <MagnifyingGlassIcon />
              Generate Research
            </Button>
          )}
        </Flex>
      </Card>

      {/* Edit Dialog */}
      <Dialog.Root open={editOpen} onOpenChange={setEditOpen}>
        <Dialog.Content style={{ maxWidth: 560 }}>
          <Dialog.Title>Edit Characteristic</Dialog.Title>
          <form onSubmit={handleUpdate}>
            <Flex direction="column" gap="3">
              <label>
                <Text as="div" size="2" mb="1" weight="medium">
                  Title *
                </Text>
                <TextField.Root
                  placeholder="Title"
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  required
                  disabled={updating}
                />
              </label>
              <label>
                <Text as="div" size="2" mb="1" weight="medium">
                  Description
                </Text>
                <TextArea
                  placeholder="Description"
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  rows={3}
                  disabled={updating}
                />
              </label>
              <label>
                <Text as="div" size="2" mb="1" weight="medium">
                  Category
                </Text>
                <Select.Root
                  value={editCategory}
                  onValueChange={(v) =>
                    setEditCategory(v as CharacteristicCategory)
                  }
                  disabled={updating}
                >
                  <Select.Trigger style={{ width: "100%" }} />
                  <Select.Content>
                    {CATEGORY_OPTIONS.map((opt) => (
                      <Select.Item key={opt.value} value={opt.value}>
                        {opt.label}
                      </Select.Item>
                    ))}
                  </Select.Content>
                </Select.Root>
              </label>

              <label>
                <Text as="div" size="2" mb="1" weight="medium">
                  Severity
                </Text>
                <Select.Root
                  value={editSeverity}
                  onValueChange={(v) => setEditSeverity(v as SeverityLevel)}
                  disabled={updating}
                >
                  <Select.Trigger placeholder="Select severity..." style={{ width: "100%" }} />
                  <Select.Content>
                    <Select.Item value={SeverityLevel.Mild}>Mild</Select.Item>
                    <Select.Item value={SeverityLevel.Moderate}>Moderate</Select.Item>
                    <Select.Item value={SeverityLevel.Severe}>Severe</Select.Item>
                    <Select.Item value={SeverityLevel.Profound}>Profound</Select.Item>
                  </Select.Content>
                </Select.Root>
              </label>

              <Flex gap="3">
                <label style={{ flex: 1 }}>
                  <Text as="div" size="2" mb="1" weight="medium">
                    Duration (weeks)
                  </Text>
                  <TextField.Root
                    type="number"
                    placeholder="Weeks"
                    value={editDurationWeeks}
                    onChange={(e) => setEditDurationWeeks(e.target.value)}
                    disabled={updating}
                  />
                </label>
                <label style={{ flex: 1 }}>
                  <Text as="div" size="2" mb="1" weight="medium">
                    Frequency per week
                  </Text>
                  <TextField.Root
                    type="number"
                    placeholder="Times/week"
                    value={editFrequencyPerWeek}
                    onChange={(e) => setEditFrequencyPerWeek(e.target.value)}
                    disabled={updating}
                  />
                </label>
              </Flex>

              <fieldset style={{ border: "none", padding: 0, margin: 0 }}>
                <Text as="div" size="2" mb="1" weight="medium">
                  Impairment Domains
                </Text>
                <Flex gap="3" wrap="wrap">
                  {([
                    { value: ImpairmentDomain.Academic, label: "Academic" },
                    { value: ImpairmentDomain.Peer, label: "Peer" },
                    { value: ImpairmentDomain.Family, label: "Family" },
                    { value: ImpairmentDomain.SelfCare, label: "Self-Care" },
                    { value: ImpairmentDomain.Safety, label: "Safety" },
                  ] as const).map(({ value, label }) => (
                    <label key={value} style={{ display: "flex", alignItems: "center", gap: 4, cursor: "pointer" }}>
                      <input
                        type="checkbox"
                        checked={editImpairmentDomains.includes(value)}
                        onChange={() => toggleImpairmentDomain(value)}
                        disabled={updating}
                      />
                      <Text size="2">{label}</Text>
                    </label>
                  ))}
                </Flex>
              </fieldset>

              <label>
                <Text as="div" size="2" mb="1" weight="medium">
                  What does your child call this?
                </Text>
                <TextField.Root
                  placeholder="Externalized name"
                  value={editExternalizedName}
                  onChange={(e) => setEditExternalizedName(e.target.value)}
                  disabled={updating}
                />
              </label>

              <label>
                <Text as="div" size="2" mb="1" weight="medium">
                  What does {memberName} do well in relation to this area?
                </Text>
                <TextArea
                  placeholder="Strengths in this area"
                  value={editStrengths}
                  onChange={(e) => setEditStrengths(e.target.value)}
                  rows={2}
                  disabled={updating}
                />
              </label>

              <label>
                <Text as="div" size="2" mb="1" weight="medium">
                  Risk Tier
                </Text>
                <Select.Root
                  value={editRiskTier}
                  onValueChange={(v) => setEditRiskTier(v as RiskTier)}
                  disabled={updating}
                >
                  <Select.Trigger style={{ width: "100%" }} />
                  <Select.Content>
                    <Select.Item value={RiskTier.None}>None</Select.Item>
                    <Select.Item value={RiskTier.Watch}>Watch</Select.Item>
                    <Select.Item value={RiskTier.Concern}>Concern</Select.Item>
                    <Select.Item value={RiskTier.SafeguardingAlert}>Safeguarding Alert</Select.Item>
                  </Select.Content>
                </Select.Root>
              </label>

              <label>
                <Text as="div" size="2" mb="1" weight="medium">
                  Formulation Status
                </Text>
                <Select.Root
                  value={editFormulationStatus}
                  onValueChange={(v) => setEditFormulationStatus(v as FormulationStatus)}
                  disabled={updating}
                >
                  <Select.Trigger style={{ width: "100%" }} />
                  <Select.Content>
                    <Select.Item value={FormulationStatus.Draft}>Draft</Select.Item>
                    <Select.Item value={FormulationStatus.Assessed}>Assessed</Select.Item>
                    <Select.Item value={FormulationStatus.Formulated}>Formulated</Select.Item>
                  </Select.Content>
                </Select.Root>
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

const DynamicCharacteristicDetailContent = dynamic(
  () => Promise.resolve(CharacteristicDetailContent),
  { ssr: false },
);

export default function CharacteristicDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const charId = parseInt(params.charId as string, 10);

  const { data } = useGetFamilyMemberCharacteristicQuery({
    variables: { id: charId },
    skip: isNaN(charId),
  });

  const { data: fmData } = useGetFamilyMembersQuery();
  const familyMember = fmData?.familyMembers?.find(
    (fm) => fm.id === parseInt(id, 10),
  );

  const characteristic = data?.familyMemberCharacteristic;

  const categoryLabel = characteristic
    ? CATEGORY_OPTIONS.find((o) => o.value === characteristic.category)?.label
      ?? (characteristic.category.charAt(0) + characteristic.category.slice(1).toLowerCase().replace(/_/g, " "))
    : "";

  const devTier = getDevelopmentalTier(familyMember?.ageYears);

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
            <NextLink href={`/family/${id}`}>
              <ArrowLeftIcon />
              <Text as="span" size="2" weight="medium">
                Back
              </Text>
            </NextLink>
          </Button>

          <Separator orientation="vertical" style={{ height: 20 }} />

          <Box minWidth="0" style={{ flex: 1 }}>
            <Heading size="8" weight="bold" truncate>
              {characteristic?.title ?? "Characteristic"}
            </Heading>
          </Box>

          {characteristic && (
            <Badge
              color={CATEGORY_COLORS[characteristic.category]}
              variant="soft"
              size="2"
            >
              {categoryLabel}
            </Badge>
          )}
          {familyMember && (
            <Badge color="gray" variant="soft" size="2">
              {devTier}
            </Badge>
          )}
        </Flex>
      </Box>

      <Box style={{ maxWidth: "1200px", margin: "0 auto", width: "100%" }}>
        <DynamicCharacteristicDetailContent />
      </Box>
    </Flex>
  );
}
