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
import { ArrowLeftIcon, PlusIcon, Pencil1Icon, TrashIcon, MagicWandIcon } from "@radix-ui/react-icons";
import { useParams } from "next/navigation";
import NextLink from "next/link";
import {
  useGetFamilyMemberQuery,
  useGetAffirmationsQuery,
  useCreateAffirmationMutation,
  useUpdateAffirmationMutation,
  useDeleteAffirmationMutation,
  useGenerateAffirmationsForFamilyMemberMutation,
  AffirmationCategory,
} from "@/app/__generated__/hooks";

const CATEGORY_OPTIONS: { value: AffirmationCategory; label: string }[] = [
  { value: AffirmationCategory.Encouragement, label: "Encouragement" },
  { value: AffirmationCategory.Gratitude, label: "Gratitude" },
  { value: AffirmationCategory.Strength, label: "Strength" },
  { value: AffirmationCategory.Growth, label: "Growth" },
  { value: AffirmationCategory.SelfWorth, label: "Self-Worth" },
];

const CATEGORY_COLORS: Record<string, string> = {
  ENCOURAGEMENT: "blue",
  GRATITUDE: "green",
  STRENGTH: "orange",
  GROWTH: "purple",
  SELF_WORTH: "pink",
};

function getCategoryColor(category: string) {
  return (CATEGORY_COLORS[category] ?? "gray") as any;
}

function getCategoryLabel(category: string) {
  const opt = CATEGORY_OPTIONS.find((o) => o.value === category);
  return opt?.label ?? category;
}

function AffirmationsContent() {
  const params = useParams();
  const familySlug = params.id as string;
  const isNumeric = /^\d+$/.test(familySlug);
  const familyMemberIdFromRoute = isNumeric ? parseInt(familySlug, 10) : NaN;

  const { data: fmData } = useGetFamilyMemberQuery({
    variables: isNumeric
      ? { id: familyMemberIdFromRoute }
      : { slug: familySlug },
  });

  const familyMember = fmData?.familyMember;
  const familyMemberId = familyMember?.id ?? NaN;

  const { data, loading, error } = useGetAffirmationsQuery({
    variables: { familyMemberId },
    skip: isNaN(familyMemberId),
  });

  // Create dialog state
  const [createOpen, setCreateOpen] = useState(false);
  const [newText, setNewText] = useState("");
  const [newCategory, setNewCategory] = useState<AffirmationCategory>(
    AffirmationCategory.Encouragement,
  );

  // Edit dialog state
  const [editOpen, setEditOpen] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [editText, setEditText] = useState("");
  const [editCategory, setEditCategory] = useState<AffirmationCategory>(
    AffirmationCategory.Encouragement,
  );

  const [createAffirmation, { loading: creating }] =
    useCreateAffirmationMutation({
      onCompleted: () => {
        setCreateOpen(false);
        setNewText("");
        setNewCategory(AffirmationCategory.Encouragement);
      },
      refetchQueries: ["GetAffirmations"],
    });

  const [updateAffirmation, { loading: updating }] =
    useUpdateAffirmationMutation({
      onCompleted: () => {
        setEditOpen(false);
        setEditId(null);
      },
      refetchQueries: ["GetAffirmations"],
    });

  const [deleteAffirmation] = useDeleteAffirmationMutation({
    refetchQueries: ["GetAffirmations"],
  });

  // AI generation dialog state
  const [generateOpen, setGenerateOpen] = useState(false);
  const [genCount, setGenCount] = useState(5);
  const [genCategoryFocus, setGenCategoryFocus] = useState<AffirmationCategory | "ANY">("ANY");
  const [genError, setGenError] = useState<string | null>(null);

  const [generateAffirmations, { loading: generating }] =
    useGenerateAffirmationsForFamilyMemberMutation({
      onCompleted: () => {
        setGenerateOpen(false);
        setGenError(null);
      },
      onError: (err) => setGenError(err.message),
      refetchQueries: ["GetAffirmations"],
    });

  const handleGenerate = () => {
    if (isNaN(familyMemberId)) return;
    setGenError(null);
    generateAffirmations({
      variables: {
        familyMemberId,
        count: genCount,
        categoryFocus: genCategoryFocus === "ANY" ? null : genCategoryFocus,
      },
    });
  };

  const handleCreate = () => {
    if (!newText.trim() || isNaN(familyMemberId)) return;
    createAffirmation({
      variables: {
        input: {
          familyMemberId,
          text: newText.trim(),
          category: newCategory,
        },
      },
    });
  };

  const handleEdit = (aff: { id: number; text: string; category: AffirmationCategory }) => {
    setEditId(aff.id);
    setEditText(aff.text);
    setEditCategory(aff.category);
    setEditOpen(true);
  };

  const handleUpdate = () => {
    if (!editText.trim() || editId == null) return;
    updateAffirmation({
      variables: {
        id: editId,
        input: {
          text: editText.trim(),
          category: editCategory,
        },
      },
    });
  };

  const handleToggleActive = (id: number, currentlyActive: boolean) => {
    updateAffirmation({
      variables: {
        id,
        input: { isActive: !currentlyActive },
      },
    });
  };

  const handleDelete = async (id: number) => {
    await deleteAffirmation({ variables: { id } });
  };

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
        <Flex direction="column" gap="3" p="4" align="center">
          <Text color="red">Error: {error.message}</Text>
          <Button variant="soft" size="2" onClick={() => window.location.reload()}>
            Try Again
          </Button>
        </Flex>
      </Card>
    );
  }

  const affirmations = data?.affirmations || [];
  const activeAffirmations = affirmations.filter((a) => a.isActive);
  const archivedAffirmations = affirmations.filter((a) => !a.isActive);

  return (
    <Flex direction="column" gap="5" p="5">
      {/* Header */}
      <Flex justify="between" align="center">
        <Flex gap="3" align="center">
          <Button variant="ghost" size="2" asChild>
            <NextLink href={`/family/${familySlug}`}>
              <ArrowLeftIcon />
            </NextLink>
          </Button>
          <Box>
            <Heading size="5">Affirmations</Heading>
            {familyMember && (
              <Text size="2" color="gray">
                for {familyMember.firstName}
                {familyMember.name ? ` ${familyMember.name}` : ""}
              </Text>
            )}
          </Box>
        </Flex>

        <Flex gap="2">
        {/* Generate with AI Dialog */}
        <Dialog.Root open={generateOpen} onOpenChange={setGenerateOpen}>
          <Dialog.Trigger>
            <Button size="2" variant="soft" color="purple">
              <MagicWandIcon /> Generate with AI
            </Button>
          </Dialog.Trigger>
          <Dialog.Content maxWidth="480px">
            <Dialog.Title>Generate Affirmations with AI</Dialog.Title>
            <Dialog.Description size="2" color="gray" mb="4">
              Creates personalized affirmations for {familyMember?.firstName ?? "this family member"} using
              their goals, issues, observations, and linked research. Takes 15–30 seconds.
            </Dialog.Description>
            <Flex direction="column" gap="3">
              <label>
                <Text size="2" weight="bold" mb="1">
                  How many?
                </Text>
                <TextField.Root
                  type="number"
                  min={1}
                  max={10}
                  value={String(genCount)}
                  onChange={(e) => {
                    const n = parseInt(e.target.value, 10);
                    if (!isNaN(n)) setGenCount(Math.max(1, Math.min(10, n)));
                  }}
                />
              </label>
              <label>
                <Text size="2" weight="bold" mb="1">
                  Category focus (optional)
                </Text>
                <Select.Root
                  value={genCategoryFocus}
                  onValueChange={(v) => setGenCategoryFocus(v as AffirmationCategory | "ANY")}
                >
                  <Select.Trigger style={{ width: "100%" }} />
                  <Select.Content>
                    <Select.Item value="ANY">Any (mixed)</Select.Item>
                    {CATEGORY_OPTIONS.map((opt) => (
                      <Select.Item key={opt.value} value={opt.value}>
                        {opt.label}
                      </Select.Item>
                    ))}
                  </Select.Content>
                </Select.Root>
              </label>
              {genError && (
                <Text size="2" color="red">
                  {genError}
                </Text>
              )}
            </Flex>
            <Flex gap="3" mt="4" justify="end">
              <Dialog.Close>
                <Button variant="soft" color="gray" disabled={generating}>
                  Cancel
                </Button>
              </Dialog.Close>
              <Button
                color="purple"
                onClick={handleGenerate}
                disabled={generating || isNaN(familyMemberId)}
              >
                {generating ? (
                  <>
                    <Spinner size="1" /> Generating…
                  </>
                ) : (
                  <>
                    <MagicWandIcon /> Generate
                  </>
                )}
              </Button>
            </Flex>
          </Dialog.Content>
        </Dialog.Root>

        {/* Create Dialog */}
        <Dialog.Root open={createOpen} onOpenChange={setCreateOpen}>
          <Dialog.Trigger>
            <Button size="2">
              <PlusIcon /> Add Affirmation
            </Button>
          </Dialog.Trigger>
          <Dialog.Content maxWidth="500px">
            <Dialog.Title>New Affirmation</Dialog.Title>
            <Dialog.Description size="2" color="gray" mb="4">
              Write a positive affirmation for {familyMember?.firstName ?? "this family member"}.
            </Dialog.Description>
            <Flex direction="column" gap="3">
              <label>
                <Text size="2" weight="bold" mb="1">
                  Affirmation Text
                </Text>
                <TextArea
                  placeholder="e.g. I am proud of how hard you work every day..."
                  value={newText}
                  onChange={(e) => setNewText(e.target.value)}
                  rows={3}
                />
              </label>
              <label>
                <Text size="2" weight="bold" mb="1">
                  Category
                </Text>
                <Select.Root
                  value={newCategory}
                  onValueChange={(v) => setNewCategory(v as AffirmationCategory)}
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
            </Flex>
            <Flex gap="3" mt="4" justify="end">
              <Dialog.Close>
                <Button variant="soft" color="gray">
                  Cancel
                </Button>
              </Dialog.Close>
              <Button onClick={handleCreate} disabled={creating || !newText.trim()}>
                {creating ? "Creating..." : "Create"}
              </Button>
            </Flex>
          </Dialog.Content>
        </Dialog.Root>
        </Flex>
      </Flex>

      <Separator size="4" />

      {/* Active Affirmations */}
      {activeAffirmations.length === 0 && archivedAffirmations.length === 0 ? (
        <Card>
          <Flex direction="column" gap="3" align="center" justify="center" p="6">
            <Text size="4" weight="bold" color="gray">
              No affirmations yet
            </Text>
            <Text size="2" color="gray">
              Add positive affirmations to encourage and support {familyMember?.firstName ?? "this family member"}.
            </Text>
          </Flex>
        </Card>
      ) : (
        <Flex direction="column" gap="4">
          {activeAffirmations.length > 0 && (
            <Flex direction="column" gap="3">
              {activeAffirmations.map((aff) => (
                <Card key={aff.id} variant="surface">
                  <Flex direction="column" gap="2" p="4">
                    <Flex justify="between" align="start">
                      <Flex direction="column" gap="2" style={{ flex: 1 }}>
                        <Text size="3" style={{ lineHeight: "1.5" }}>
                          &ldquo;{aff.text}&rdquo;
                        </Text>
                        <Flex gap="2" align="center">
                          <Badge
                            color={getCategoryColor(aff.category)}
                            variant="soft"
                            size="1"
                          >
                            {getCategoryLabel(aff.category)}
                          </Badge>
                          <Text size="1" color="gray">
                            {new Date(aff.createdAt).toLocaleDateString(undefined, {
                              year: "numeric",
                              month: "short",
                              day: "numeric",
                            })}
                          </Text>
                        </Flex>
                      </Flex>
                      <Flex gap="2" ml="3">
                        <Button
                          variant="ghost"
                          size="1"
                          onClick={() => handleEdit(aff)}
                        >
                          <Pencil1Icon />
                        </Button>
                        <Button
                          variant="ghost"
                          size="1"
                          color="gray"
                          onClick={() => handleToggleActive(aff.id, true)}
                        >
                          Archive
                        </Button>
                        <AlertDialog.Root>
                          <AlertDialog.Trigger>
                            <Button variant="ghost" size="1" color="red">
                              <TrashIcon />
                            </Button>
                          </AlertDialog.Trigger>
                          <AlertDialog.Content maxWidth="400px">
                            <AlertDialog.Title>Delete Affirmation</AlertDialog.Title>
                            <AlertDialog.Description size="2">
                              Are you sure you want to delete this affirmation? This cannot be undone.
                            </AlertDialog.Description>
                            <Flex gap="3" mt="4" justify="end">
                              <AlertDialog.Cancel>
                                <Button variant="soft" color="gray">
                                  Cancel
                                </Button>
                              </AlertDialog.Cancel>
                              <AlertDialog.Action>
                                <Button
                                  variant="solid"
                                  color="red"
                                  onClick={() => handleDelete(aff.id)}
                                >
                                  Delete
                                </Button>
                              </AlertDialog.Action>
                            </Flex>
                          </AlertDialog.Content>
                        </AlertDialog.Root>
                      </Flex>
                    </Flex>
                  </Flex>
                </Card>
              ))}
            </Flex>
          )}

          {/* Archived Affirmations */}
          {archivedAffirmations.length > 0 && (
            <>
              <Separator size="4" />
              <Text size="2" weight="bold" color="gray">
                Archived ({archivedAffirmations.length})
              </Text>
              <Flex direction="column" gap="3">
                {archivedAffirmations.map((aff) => (
                  <Card key={aff.id} variant="surface" style={{ opacity: 0.6 }}>
                    <Flex direction="column" gap="2" p="4">
                      <Flex justify="between" align="start">
                        <Flex direction="column" gap="2" style={{ flex: 1 }}>
                          <Text size="3" style={{ lineHeight: "1.5" }}>
                            &ldquo;{aff.text}&rdquo;
                          </Text>
                          <Flex gap="2" align="center">
                            <Badge
                              color={getCategoryColor(aff.category)}
                              variant="soft"
                              size="1"
                            >
                              {getCategoryLabel(aff.category)}
                            </Badge>
                          </Flex>
                        </Flex>
                        <Flex gap="2" ml="3">
                          <Button
                            variant="ghost"
                            size="1"
                            color="green"
                            onClick={() => handleToggleActive(aff.id, false)}
                          >
                            Restore
                          </Button>
                          <AlertDialog.Root>
                            <AlertDialog.Trigger>
                              <Button variant="ghost" size="1" color="red">
                                <TrashIcon />
                              </Button>
                            </AlertDialog.Trigger>
                            <AlertDialog.Content maxWidth="400px">
                              <AlertDialog.Title>Delete Affirmation</AlertDialog.Title>
                              <AlertDialog.Description size="2">
                                Are you sure you want to permanently delete this affirmation?
                              </AlertDialog.Description>
                              <Flex gap="3" mt="4" justify="end">
                                <AlertDialog.Cancel>
                                  <Button variant="soft" color="gray">
                                    Cancel
                                  </Button>
                                </AlertDialog.Cancel>
                                <AlertDialog.Action>
                                  <Button
                                    variant="solid"
                                    color="red"
                                    onClick={() => handleDelete(aff.id)}
                                  >
                                    Delete
                                  </Button>
                                </AlertDialog.Action>
                              </Flex>
                            </AlertDialog.Content>
                          </AlertDialog.Root>
                        </Flex>
                      </Flex>
                    </Flex>
                  </Card>
                ))}
              </Flex>
            </>
          )}
        </Flex>
      )}

      {/* Edit Dialog */}
      <Dialog.Root open={editOpen} onOpenChange={setEditOpen}>
        <Dialog.Content maxWidth="500px">
          <Dialog.Title>Edit Affirmation</Dialog.Title>
          <Flex direction="column" gap="3">
            <label>
              <Text size="2" weight="bold" mb="1">
                Affirmation Text
              </Text>
              <TextArea
                value={editText}
                onChange={(e) => setEditText(e.target.value)}
                rows={3}
              />
            </label>
            <label>
              <Text size="2" weight="bold" mb="1">
                Category
              </Text>
              <Select.Root
                value={editCategory}
                onValueChange={(v) => setEditCategory(v as AffirmationCategory)}
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
          </Flex>
          <Flex gap="3" mt="4" justify="end">
            <Dialog.Close>
              <Button variant="soft" color="gray">
                Cancel
              </Button>
            </Dialog.Close>
            <Button onClick={handleUpdate} disabled={updating || !editText.trim()}>
              {updating ? "Saving..." : "Save"}
            </Button>
          </Flex>
        </Dialog.Content>
      </Dialog.Root>
    </Flex>
  );
}

export default function AffirmationsPage() {
  return <AffirmationsContent />;
}
