"use client";

import { useState, useEffect } from "react";
import {
  Box,
  Flex,
  Heading,
  Text,
  Card,
  Button,
  TextField,
  TextArea,
  Select,
  Spinner,
  Separator,
} from "@radix-ui/themes";
import { ArrowLeftIcon } from "@radix-ui/react-icons";
import { useRouter, useParams } from "next/navigation";
import NextLink from "next/link";
import dynamic from "next/dynamic";
import {
  useGetContactQuery,
  useUpdateContactMutation,
} from "@/app/__generated__/hooks";
import { authClient } from "@/app/lib/auth/client";

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

function ContactEditContent() {
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

  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    slug: "",
    description: "",
    role: "",
    ageYears: "",
    notes: "",
  });
  const [formError, setFormError] = useState<string | null>(null);
  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    if (contact && !initialized) {
      setForm({
        firstName: contact.firstName,
        lastName: contact.lastName ?? "",
        slug: contact.slug ?? "",
        description: contact.description ?? "",
        role: contact.role ?? "",
        ageYears: contact.ageYears ? String(contact.ageYears) : "",
        notes: contact.notes ?? "",
      });
      setInitialized(true);
    }
  }, [contact, initialized]);

  const [updateContact, { loading: saving }] = useUpdateContactMutation({
    onCompleted: (data) => {
      const newSlug = data?.updateContact?.slug;
      const target = newSlug && newSlug !== contactRaw ? newSlug : contactRaw;
      router.push(`/family/${familySlug}/contacts/${target}`);
    },
    onError: (err) => setFormError(err.message),
    refetchQueries: ["GetContact"],
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!contact) return;
    if (!form.firstName.trim()) {
      setFormError("First name is required");
      return;
    }

    const slugValue = form.slug
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9-]/g, "")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "");

    await updateContact({
      variables: {
        id: contact.id,
        input: {
          firstName: form.firstName.trim(),
          lastName: form.lastName.trim() || undefined,
          slug: slugValue || undefined,
          description: form.description.trim() || undefined,
          role: form.role || undefined,
          ageYears: form.ageYears ? parseInt(form.ageYears, 10) : undefined,
          notes: form.notes.trim() || undefined,
        },
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
    contact.createdBy === user?.email || contact.createdBy === user?.id;

  if (!isOwner) {
    return (
      <Card>
        <Text color="red">You do not have permission to edit this contact.</Text>
      </Card>
    );
  }

  return (
    <Card style={{ backgroundColor: "var(--indigo-3)" }}>
      <form onSubmit={handleSubmit}>
        <Flex direction="column" gap="4" p="1">
          <Heading size="5">Edit Contact</Heading>

          <label>
            <Text as="div" size="2" mb="1" weight="medium">
              First Name *
            </Text>
            <TextField.Root
              placeholder="First name"
              value={form.firstName}
              onChange={(e) =>
                setForm((f) => ({ ...f, firstName: e.target.value }))
              }
              required
              disabled={saving}
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
              disabled={saving}
            />
          </label>

          <label>
            <Text as="div" size="2" mb="1" weight="medium">
              Slug
            </Text>
            <TextField.Root
              placeholder="url-friendly-name"
              value={form.slug}
              onChange={(e) =>
                setForm((f) => ({ ...f, slug: e.target.value }))
              }
              disabled={saving}
            />
            <Text as="div" size="1" color="gray" mt="1">
              URL path segment, e.g. /family/{familySlug}/contacts/
              {form.slug || "alex"}
            </Text>
          </label>

          <label>
            <Text as="div" size="2" mb="1" weight="medium">
              Description
            </Text>
            <TextArea
              placeholder="Brief description of this contact..."
              value={form.description}
              onChange={(e) =>
                setForm((f) => ({ ...f, description: e.target.value }))
              }
              rows={3}
              disabled={saving}
            />
          </label>

          <Flex direction="column" gap="1">
            <Text as="div" size="2" weight="medium">
              Role
            </Text>
            <Select.Root
              value={form.role || "none"}
              onValueChange={(v) =>
                setForm((f) => ({ ...f, role: v === "none" ? "" : v }))
              }
              disabled={saving}
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
              value={form.ageYears}
              onChange={(e) =>
                setForm((f) => ({ ...f, ageYears: e.target.value }))
              }
              disabled={saving}
            />
          </label>

          <label>
            <Text as="div" size="2" mb="1" weight="medium">
              Notes
            </Text>
            <TextArea
              placeholder="Notes about this contact..."
              value={form.notes}
              onChange={(e) =>
                setForm((f) => ({ ...f, notes: e.target.value }))
              }
              rows={3}
              disabled={saving}
            />
          </label>

          {formError && (
            <Text color="red" size="2">
              {formError}
            </Text>
          )}

          <Flex gap="3" justify="end" mt="2">
            <Button
              variant="soft"
              color="gray"
              disabled={saving}
              type="button"
              asChild
            >
              <NextLink
                href={`/family/${familySlug}/contacts/${contactRaw}`}
              >
                Cancel
              </NextLink>
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? "Saving..." : "Save Changes"}
            </Button>
          </Flex>
        </Flex>
      </form>
    </Card>
  );
}

const DynamicContactEditContent = dynamic(
  () => Promise.resolve(ContactEditContent),
  { ssr: false },
);

export default function ContactEditPage() {
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
  const contactName = contact
    ? `${contact.firstName}${contact.lastName ? ` ${contact.lastName}` : ""}`
    : "Contact";

  return (
    <Flex direction="column" gap="5">
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
            <NextLink href={`/family/${familySlug}/contacts/${contactRaw}`}>
              <ArrowLeftIcon />
              <Box display={{ initial: "none", sm: "inline" }} asChild>
                <span>Back</span>
              </Box>
            </NextLink>
          </Button>

          <Box display={{ initial: "none", sm: "block" }}>
            <Separator orientation="vertical" style={{ height: 20 }} />
          </Box>

          <Box minWidth="0" style={{ flex: 1 }}>
            <Heading size={{ initial: "5", md: "8" }} weight="bold" truncate>
              Edit {contactName}
            </Heading>
          </Box>
        </Flex>
      </Box>

      <Box style={{ maxWidth: "1200px", margin: "0 auto", width: "100%" }}>
        <DynamicContactEditContent />
      </Box>
    </Flex>
  );
}
