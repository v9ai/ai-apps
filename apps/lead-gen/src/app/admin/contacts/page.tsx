"use client";

import * as React from "react";
import { useCallback, useState } from "react";
import {
  useGetContactsQuery,
  useCreateContactMutation,
  useDeleteContactMutation,
} from "@/__generated__/hooks";
import Link from "next/link";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import {
  Badge,
  Box,
  Callout,
  Card,
  Container,
  Dialog,
  Flex,
  Heading,
  Spinner,
  Text,
  TextField,
} from "@radix-ui/themes";
import { button } from "@/recipes/button";
import {
  EnvelopeClosedIcon,
  InfoCircledIcon,
  LinkedInLogoIcon,
  MagnifyingGlassIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  PlusIcon,
  TrashIcon,
} from "@radix-ui/react-icons";

const PAGE_SIZE = 50;

export default function AdminContactsPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const activeTag = searchParams.get("tag") || null;

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

  const setTag = useCallback(
    (tag: string | null) => {
      const params = new URLSearchParams(searchParams.toString());
      if (tag) params.set("tag", tag);
      else params.delete("tag");
      const qs = params.toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname);
      setPage(0);
    },
    [searchParams, router, pathname],
  );

  const { data, loading, refetch } = useGetContactsQuery({
    variables: {
      search: debouncedSearch || undefined,
      tag: activeTag || undefined,
      limit: PAGE_SIZE,
      offset: page * PAGE_SIZE,
    },
    fetchPolicy: "cache-and-network",
  });

  const [createContact, { loading: creating }] = useCreateContactMutation();
  const [deleteContact] = useDeleteContactMutation();

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
    await deleteContact({ variables: { id } });
    refetch();
  }

  return (
    <Container size="4" p="8" style={{ maxWidth: "1100px" }}>
      <Flex justify="between" align="center" mb="6">
        <Heading size="7">Contacts</Heading>
        <Dialog.Root open={createOpen} onOpenChange={setCreateOpen}>
          <Dialog.Trigger>
            <button className={button({ variant: "ghost", size: "md" })}><PlusIcon /> New Contact</button>
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
                    <button className={button({ variant: "ghost" })}>Cancel</button>
                  </Dialog.Close>
                  <button className={button({ variant: "ghost" })} type="submit" disabled={creating}>
                    {creating ? "Creating…" : "Create"}
                  </button>
                </Flex>
              </Flex>
            </form>
          </Dialog.Content>
        </Dialog.Root>
      </Flex>

      <Flex align="center" justify="between" gap="3" mb="4" wrap="wrap">
        <Flex align="center" gap="2" wrap="wrap">
          <Text size="2" color="gray">
            {loading ? "Loading…" : `${totalCount} contact${totalCount !== 1 ? "s" : ""}`}
          </Text>
          <button
            className={button({ variant: activeTag === "papers" ? "solid" : "outline", size: "sm" })}
            onClick={() => setTag(activeTag === "papers" ? null : "papers")}
            aria-pressed={activeTag === "papers"}
          >
            Papers
          </button>
          {activeTag && activeTag !== "papers" && (
            <Badge color="blue" variant="soft" size="1">
              tag: {activeTag}
              <button
                className={button({ variant: "ghost", size: "sm" })}
                onClick={() => setTag(null)}
                style={{ padding: 0, marginLeft: 4 }}
                aria-label="Clear tag filter"
              >
                ×
              </button>
            </Badge>
          )}
        </Flex>
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
                    href={`/contacts/${contact.slug ?? contact.id}`}
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
                          <Badge
                            key={tag}
                            color={activeTag === tag ? "blue" : "gray"}
                            variant={activeTag === tag ? "soft" : "surface"}
                            size="1"
                            onClick={(ev) => {
                              ev.preventDefault();
                              ev.stopPropagation();
                              setTag(activeTag === tag ? null : tag);
                            }}
                            style={{ cursor: "pointer" }}
                          >
                            {tag}
                          </Badge>
                        ))}
                      </Flex>
                    )}
                  </Link>
                  <button
                    className={button({ variant: "ghost", size: "sm" })}
                    onClick={() => handleDelete(contact.id)}
                  >
                    <TrashIcon />
                  </button>
                </Flex>
              </Box>
            </Card>
          ))}
        </Flex>
      )}

      {totalPages > 1 && (
        <Flex justify="center" align="center" gap="3" mt="4">
          <button className={button({ variant: "ghost", size: "md" })} disabled={page === 0} onClick={() => setPage((p) => p - 1)}>
            <ChevronLeftIcon /> Previous
          </button>
          <Text size="2" color="gray">Page {page + 1} of {totalPages}</Text>
          <button className={button({ variant: "ghost", size: "md" })} disabled={page >= totalPages - 1} onClick={() => setPage((p) => p + 1)}>
            Next <ChevronRightIcon />
          </button>
        </Flex>
      )}
    </Container>
  );
}
