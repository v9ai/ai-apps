"use client";

import { useState } from "react";
import {
  Dialog,
  Button,
  Flex,
  Text,
  Select,
} from "@radix-ui/themes";
import { Link2Icon } from "@radix-ui/react-icons";
import {
  useGetFamilyMembersQuery,
  useCreateRelationshipMutation,
  useCreateFamilyMemberMutation,
  PersonType,
} from "@/app/__generated__/hooks";
import { authClient } from "@/app/lib/auth/client";

interface AddFamilyRelationshipButtonProps {
  familyMemberId: number;
  familyMemberName: string;
  size?: "1" | "2" | "3";
}

const FAMILY_RELATIONSHIP_TYPES = [
  { value: "father_of", label: "Father of" },
  { value: "mother_of", label: "Mother of" },
  { value: "parent_of", label: "Parent of" },
  { value: "child_of", label: "Child of" },
  { value: "sibling_of", label: "Sibling of" },
  { value: "spouse_of", label: "Spouse of" },
  { value: "grandparent_of", label: "Grandparent of" },
  { value: "grandchild_of", label: "Grandchild of" },
  { value: "uncle_aunt_of", label: "Uncle/Aunt of" },
  { value: "nephew_niece_of", label: "Nephew/Niece of" },
  { value: "cousin_of", label: "Cousin of" },
  { value: "step_parent_of", label: "Step-parent of" },
  { value: "step_child_of", label: "Step-child of" },
  { value: "guardian_of", label: "Guardian of" },
] as const;

const SELF_VALUE = "__self__";

export default function AddFamilyRelationshipButton({
  familyMemberId,
  familyMemberName,
  size = "2",
}: AddFamilyRelationshipButtonProps) {
  const { data: session } = authClient.useSession();
  const user = session?.user;

  const [open, setOpen] = useState(false);
  const [selectedMemberId, setSelectedMemberId] = useState("");
  const [relationshipType, setRelationshipType] = useState("");
  const [error, setError] = useState<string | null>(null);

  const { data: membersData } = useGetFamilyMembersQuery({ skip: !open });

  const [createRelationship, { loading: linkingRel }] =
    useCreateRelationshipMutation({
      onCompleted: () => {
        setOpen(false);
        resetForm();
      },
      onError: (err) => setError(err.message),
      refetchQueries: ["GetFamilyMember"],
    });

  const [createFamilyMember, { loading: creatingSelf }] =
    useCreateFamilyMemberMutation({
      onError: (err) => setError(err.message),
      refetchQueries: ["GetFamilyMembers"],
    });

  const loading = linkingRel || creatingSelf;

  function resetForm() {
    setSelectedMemberId("");
    setRelationshipType("");
    setError(null);
  }

  const allMembers = membersData?.familyMembers ?? [];
  const selfMember = allMembers.find((m) => m.relationship === "self");
  const otherMembers = allMembers.filter(
    (m) => m.id !== familyMemberId && m.relationship !== "self",
  );

  async function resolveSelfMemberId(): Promise<number | null> {
    if (selfMember) return selfMember.id;

    const userName = user?.name || user?.email?.split("@")[0] || "Me";
    const parts = userName.split(" ");
    const firstName = parts[0];
    const lastName = parts.slice(1).join(" ") || undefined;

    const { data } = await createFamilyMember({
      variables: {
        input: {
          firstName,
          name: lastName,
          relationship: "self",
          email: user?.email || undefined,
        },
      },
    });

    return data?.createFamilyMember?.id ?? null;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!selectedMemberId) {
      setError("Please select a family member");
      return;
    }
    if (!relationshipType) {
      setError("Please select a relationship type");
      return;
    }

    try {
      let relatedId: number;

      if (selectedMemberId === SELF_VALUE) {
        const id = await resolveSelfMemberId();
        if (!id) {
          setError("Failed to create your profile");
          return;
        }
        relatedId = id;
      } else {
        relatedId = parseInt(selectedMemberId, 10);
      }

      await createRelationship({
        variables: {
          input: {
            subjectType: PersonType.FamilyMember,
            subjectId: familyMemberId,
            relatedType: PersonType.FamilyMember,
            relatedId,
            relationshipType,
          },
        },
      });
    } catch {
      // errors already handled by onError callbacks
    }
  };

  const selectedType = FAMILY_RELATIONSHIP_TYPES.find(
    (t) => t.value === relationshipType,
  );

  const myselfLabel = `Myself (${user?.name || "You"})`;

  return (
    <Dialog.Root
      open={open}
      onOpenChange={(isOpen) => {
        setOpen(isOpen);
        if (!isOpen) resetForm();
      }}
    >
      <Dialog.Trigger>
        <Button variant="soft" size={size}>
          <Link2Icon width="16" height="16" />
          Link Family Member
        </Button>
      </Dialog.Trigger>

      <Dialog.Content style={{ maxWidth: 460 }}>
        <Dialog.Title>Link Family Member</Dialog.Title>
        <Dialog.Description size="2" mb="4">
          Create a relationship between {familyMemberName} and another family
          member.
        </Dialog.Description>

        <form onSubmit={handleSubmit}>
          <Flex direction="column" gap="4">
            <Flex direction="column" gap="1">
              <Text as="div" size="2" weight="medium">
                {familyMemberName} is...
              </Text>
              <Select.Root
                value={relationshipType || "none"}
                onValueChange={(v) =>
                  setRelationshipType(v === "none" ? "" : v)
                }
                disabled={loading}
              >
                <Select.Trigger
                  placeholder="Select relationship..."
                  style={{ width: "100%" }}
                />
                <Select.Content>
                  <Select.Item value="none">
                    Select relationship...
                  </Select.Item>
                  {FAMILY_RELATIONSHIP_TYPES.map((t) => (
                    <Select.Item key={t.value} value={t.value}>
                      {t.label}
                    </Select.Item>
                  ))}
                </Select.Content>
              </Select.Root>
            </Flex>

            <Flex direction="column" gap="1">
              <Text as="div" size="2" weight="medium">
                {selectedType ? selectedType.label : "..."}{" "}
              </Text>
              <Select.Root
                value={selectedMemberId || "none"}
                onValueChange={(v) =>
                  setSelectedMemberId(v === "none" ? "" : v)
                }
                disabled={loading}
              >
                <Select.Trigger
                  placeholder="Select family member..."
                  style={{ width: "100%" }}
                />
                <Select.Content>
                  <Select.Item value="none">
                    Select family member...
                  </Select.Item>
                  <Select.Separator />
                  <Select.Group>
                    <Select.Label>You</Select.Label>
                    <Select.Item value={SELF_VALUE}>
                      {myselfLabel}
                    </Select.Item>
                  </Select.Group>
                  <Select.Separator />
                  <Select.Group>
                    <Select.Label>Family Members</Select.Label>
                    {otherMembers.map((m) => (
                      <Select.Item key={m.id} value={String(m.id)}>
                        {m.firstName}
                        {m.name ? ` ${m.name}` : ""}
                        {m.relationship ? ` (${m.relationship})` : ""}
                      </Select.Item>
                    ))}
                  </Select.Group>
                </Select.Content>
              </Select.Root>
            </Flex>

            {error && (
              <Text color="red" size="2">
                {error}
              </Text>
            )}

            <Flex gap="3" justify="end" mt="2">
              <Dialog.Close>
                <Button variant="soft" color="gray" disabled={loading}>
                  Cancel
                </Button>
              </Dialog.Close>
              <Button type="submit" disabled={loading}>
                {loading ? "Linking..." : "Link"}
              </Button>
            </Flex>
          </Flex>
        </form>
      </Dialog.Content>
    </Dialog.Root>
  );
}
