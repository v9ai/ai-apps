"use client";

import { useState } from "react";
import {
  Dialog,
  Button,
  Flex,
  Text,
  TextField,
  TextArea,
  Select,
} from "@radix-ui/themes";
import { PlusIcon } from "@radix-ui/react-icons";
import {
  useCreateContactMutation,
  useCreateRelationshipMutation,
  PersonType,
} from "@/app/__generated__/hooks";

interface AddContactButtonProps {
  familyMemberId: number;
  refetchQueries?: string[];
  size?: "1" | "2" | "3";
}

const ROLE_OPTIONS = [
  "teacher",
  "therapist",
  "doctor",
  "tutor",
  "coach",
  "counselor",
  "caregiver",
  "classmate",
  "schoolmate",
  "other",
] as const;

const defaultForm = () => ({
  firstName: "",
  lastName: "",
  role: "" as string,
  notes: "",
  relationshipType: "works_with",
});

export default function AddContactButton({
  familyMemberId,
  refetchQueries: extraRefetchQueries,
  size = "2",
}: AddContactButtonProps) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(defaultForm);
  const [error, setError] = useState<string | null>(null);

  const [createContact, { loading: creatingContact }] =
    useCreateContactMutation({
      onError: (err) => setError(err.message),
    });

  const [createRelationship, { loading: creatingRelationship }] =
    useCreateRelationshipMutation({
      onCompleted: () => {
        setOpen(false);
        setForm(defaultForm);
        setError(null);
      },
      onError: (err) => setError(err.message),
      refetchQueries: [
        "GetRelationships",
        "GetContacts",
        ...(extraRefetchQueries ?? []),
      ],
    });

  const loading = creatingContact || creatingRelationship;

  const resetForm = () => {
    setForm(defaultForm);
    setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!form.firstName.trim()) {
      setError("First name is required");
      return;
    }
    if (!form.role) {
      setError("Role is required");
      return;
    }

    try {
      const { data } = await createContact({
        variables: {
          input: {
            firstName: form.firstName.trim(),
            lastName: form.lastName.trim() || undefined,
            role: form.role,
            notes: form.notes.trim() || undefined,
          },
        },
      });

      if (!data?.createContact?.id) {
        setError("Failed to create contact");
        return;
      }

      await createRelationship({
        variables: {
          input: {
            subjectType: PersonType.FamilyMember,
            subjectId: familyMemberId,
            relatedType: PersonType.Contact,
            relatedId: data.createContact.id,
            relationshipType: form.relationshipType,
          },
        },
      });
    } catch (err) {
      console.error("Failed to add contact:", err);
    }
  };

  return (
    <Dialog.Root
      open={open}
      onOpenChange={(isOpen) => {
        setOpen(isOpen);
        if (!isOpen) resetForm();
      }}
    >
      <Dialog.Trigger>
        <Button size={size}>
          <PlusIcon width="16" height="16" />
          Add Contact
        </Button>
      </Dialog.Trigger>

      <Dialog.Content style={{ maxWidth: 500 }}>
        <Dialog.Title>Add Contact</Dialog.Title>
        <Dialog.Description size="2" mb="4">
          Add a contact (teacher, therapist, etc.) for this family member.
        </Dialog.Description>

        <form onSubmit={handleSubmit}>
          <Flex direction="column" gap="4">
            <label>
              <Text as="div" size="2" mb="1" weight="medium">
                First Name *
              </Text>
              <TextField.Root
                placeholder="e.g. Mrs. Smith"
                value={form.firstName}
                onChange={(e) =>
                  setForm((f) => ({ ...f, firstName: e.target.value }))
                }
                required
                disabled={loading}
              />
            </label>

            <label>
              <Text as="div" size="2" mb="1" weight="medium">
                Last Name
              </Text>
              <TextField.Root
                placeholder="Last name"
                value={form.lastName}
                onChange={(e) =>
                  setForm((f) => ({ ...f, lastName: e.target.value }))
                }
                disabled={loading}
              />
            </label>

            <Flex direction="column" gap="1">
              <Text as="div" size="2" weight="medium">
                Role *
              </Text>
              <Select.Root
                value={form.role || "none"}
                onValueChange={(value) =>
                  setForm((f) => ({
                    ...f,
                    role: value === "none" ? "" : value,
                  }))
                }
                disabled={loading}
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
                Notes
              </Text>
              <TextArea
                placeholder="Any additional notes about this contact..."
                value={form.notes}
                onChange={(e) =>
                  setForm((f) => ({ ...f, notes: e.target.value }))
                }
                rows={3}
                disabled={loading}
              />
            </label>

            {error && (
              <Text color="red" size="2">
                {error}
              </Text>
            )}

            <Flex gap="3" justify="end" mt="4">
              <Dialog.Close>
                <Button variant="soft" color="gray" disabled={loading}>
                  Cancel
                </Button>
              </Dialog.Close>
              <Button type="submit" disabled={loading}>
                {loading ? "Saving..." : "Add Contact"}
              </Button>
            </Flex>
          </Flex>
        </form>
      </Dialog.Content>
    </Dialog.Root>
  );
}
