"use client";

import * as React from "react";
import { useCallback, useState } from "react";
import {
  useGetContactsQuery,
  useCreateContactMutation,
  useDeleteContactMutation,
} from "@/__generated__/hooks";
import type { GetContactsQuery } from "@/__generated__/hooks";
import Link from "next/link";
import { useAuth } from "@/lib/auth-hooks";
import { ADMIN_EMAIL } from "@/lib/constants";
import {
  Badge,
  Box,
  Button,
  Callout,
  Card,
  Container,
  Dialog,
  Flex,
  Heading,
  Spinner,
  Text,
  TextArea,
  TextField,
} from "@radix-ui/themes";
import {
  EnvelopeClosedIcon,
  ExclamationTriangleIcon,
  InfoCircledIcon,
  LinkedInLogoIcon,
  MagnifyingGlassIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  PlusIcon,
  TrashIcon,
} from "@radix-ui/react-icons";

type Contact = NonNullable<
  GetContactsQuery["contacts"]["contacts"]
>[number];

const PAGE_SIZE = 50;

export default function AdminContactsPage() {
  const { user } = useAuth();
  const isAdmin = user?.email === ADMIN_EMAIL;

  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [page, setPage] = useState(0);
  const [createOpen, setCreateOpen] = useState(false);

  const debounceRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const handleSearch = useCallback((val: string) => {
    setSearch(val);
    setPage(0);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => setDebouncedSearch(val), 300);
  }, []);

  const { data, loading, refetch } = useGetContactsQuery({
    variables: {
      search: debouncedSearch || undefined,
      limit: PAGE_SIZE,
      offset: page * PAGE_SIZE,
    },
    skip: !isAdmin,
    fetchPolicy: "cache-and-network",
  });

  const [createContact, { loading: creating }] = useCreateContactMutation();
  const [deleteContact] = useDeleteContactMutation();

  if (!isAdmin) {
    return (
      <Container size="3" p="8">
        <Callout.Root color="red">
          <Callout.Icon><ExclamationTriangleIcon /></Callout.Icon>
          <Callout.Text>Access denied. Admin only.</Callout.Text>
        </Callout.Root>
      </Container>
    );
  }

  const contactsList = data?.contacts?.contacts ?? [];
  const totalCount = data?.contacts?.totalCount ?? 0;
  const totalPages = Math.ceil(totalCount / PAGE_SIZE);

  async function handleCreate(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    await createContact({
      variables: {
        input: {
          firstName: fd.get("firstName") as string,
          lastName: fd.get("lastName") as string || undefined,
          email: fd.get("email") as string || undefined,
          position: fd.get("position") as string || undefined,
          linkedinUrl: fd.get("linkedinUrl") as string || undefined,
        },
      },
    });
    setCreateOpen(false);
    refetch();
  }

  async function handleDelete(id: number) {
    if (!confirm("Delete this contact?")) return;
    await deleteContact({ variables: { id } });
    refetch();
  }

  return (
    <Container size="4" p="8" style={{ maxWidth: "1100px" }}>
      <Flex justify="between" align="center" mb="6">
        <Heading size="7">Contacts</Heading>
        <Dialog.Root open={createOpen} onOpenChange={setCreateOpen}>
          <Dialog.Trigger>
            <Button size="2"><PlusIcon /> New Contact</Button>
          </Dialog.Trigger>
          <Dialog.Content maxWidth="450px">
            <Dialog.Title>New Contact</Dialog.Title>
            <form onSubmit={handleCreate}>
              <Flex direction="column" gap="3" mt="3">
                <TextField.Root name="firstName" placeholder="First name *" required />
                <TextField.Root name="lastName" placeholder="Last name" />
                <TextField.Root name="email" placeholder="Email" type="email" />
                <TextField.Root name="position" placeholder="Position" />
                <TextField.Root name="linkedinUrl" placeholder="LinkedIn URL" />
                <Flex gap="3" justify="end" mt="2">
                  <Dialog.Close>
                    <Button variant="soft" color="gray">Cancel</Button>
                  </Dialog.Close>
                  <Button type="submit" disabled={creating}>
                    {creating ? "Creating…" : "Create"}
                  </Button>
                </Flex>
              </Flex>
            </form>
          </Dialog.Content>
        </Dialog.Root>
      </Flex>

      <Flex align="center" justify="between" gap="3" mb="4">
        <Text size="2" color="gray">
          {loading ? "Loading…" : `${totalCount} contact${totalCount !== 1 ? "s" : ""}`}
        </Text>
        <Box style={{ width: 280 }}>
          <TextField.Root
            size="2"
            placeholder="Search contacts…"
            value={search}
            onChange={(e) => handleSearch(e.target.value)}
          >
            <TextField.Slot>
              <MagnifyingGlassIcon />
            </TextField.Slot>
          </TextField.Root>
        </Box>
      </Flex>

      {loading && contactsList.length === 0 ? (
        <Flex justify="center" py="6"><Spinner size="3" /></Flex>
      ) : contactsList.length === 0 ? (
        <Callout.Root color="gray" variant="soft">
          <Callout.Icon><InfoCircledIcon /></Callout.Icon>
          <Callout.Text>No contacts found.</Callout.Text>
        </Callout.Root>
      ) : (
        <Flex direction="column" gap="2">
          {contactsList.map((contact) => (
            <Card key={contact.id}>
              <Box p="3">
                <Flex align="start" justify="between" gap="3">
                  <Link
                    href={`/contacts/${contact.id}`}
                    style={{ textDecoration: "none", color: "inherit", flex: 1 }}
                  >
                    <Flex align="center" gap="2" wrap="wrap">
                      <Text size="3" weight="medium">
                        {contact.firstName} {contact.lastName}
                      </Text>
                      {contact.emailVerified && (
                        <Badge color="green" variant="soft" size="1">verified</Badge>
                      )}
                      {contact.doNotContact && (
                        <Badge color="red" variant="soft" size="1">do not contact</Badge>
                      )}
                    </Flex>
                    {(contact.position || contact.company) && (
                      <Text size="2" color="gray" mt="1" as="p">
                        {contact.position}{contact.position && contact.company && " · "}{contact.company}
                      </Text>
                    )}
                    <Flex gap="3" mt="2" wrap="wrap" align="center">
                      {contact.email && (
                        <Flex align="center" gap="1">
                          <EnvelopeClosedIcon color="gray" />
                          <Text size="2" color="gray">{contact.email}</Text>
                        </Flex>
                      )}
                      {contact.linkedinUrl && (
                        <Flex align="center" gap="1">
                          <LinkedInLogoIcon color="gray" />
                          <Text size="2" color="gray">LinkedIn</Text>
                        </Flex>
                      )}
                    </Flex>
                    {contact.tags && contact.tags.length > 0 && (
                      <Flex gap="1" mt="2" wrap="wrap">
                        {contact.tags.map((tag) => (
                          <Badge key={tag} color="gray" variant="surface" size="1">{tag}</Badge>
                        ))}
                      </Flex>
                    )}
                  </Link>
                  <Button
                    size="1"
                    variant="ghost"
                    color="red"
                    onClick={() => handleDelete(contact.id)}
                  >
                    <TrashIcon />
                  </Button>
                </Flex>
              </Box>
            </Card>
          ))}
        </Flex>
      )}

      {totalPages > 1 && (
        <Flex justify="center" align="center" gap="3" mt="4">
          <Button size="2" variant="soft" color="gray" disabled={page === 0} onClick={() => setPage((p) => p - 1)}>
            <ChevronLeftIcon /> Previous
          </Button>
          <Text size="2" color="gray">Page {page + 1} of {totalPages}</Text>
          <Button size="2" variant="soft" color="gray" disabled={page >= totalPages - 1} onClick={() => setPage((p) => p + 1)}>
            Next <ChevronRightIcon />
          </Button>
        </Flex>
      )}
    </Container>
  );
}
