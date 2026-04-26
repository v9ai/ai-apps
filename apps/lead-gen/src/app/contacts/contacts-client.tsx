"use client";

import * as React from "react";
import { useCallback, useEffect, useRef, useState } from "react";
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
import { ContactTagSelect } from "@/components/contact-tag-select";
import {
  EnvelopeClosedIcon,
  InfoCircledIcon,
  LinkedInLogoIcon,
  MagnifyingGlassIcon,
  PlusIcon,
  TrashIcon,
} from "@radix-ui/react-icons";

const PAGE_SIZE = 50;

export function ContactsClient() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const activeTag = searchParams.get("tag") || null;

  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);

  const debounceRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const handleSearch = useCallback((val: string) => {
    setSearch(val);
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
    },
    [searchParams, router, pathname],
  );

  const { data, loading, refetch, fetchMore } = useGetContactsQuery({
    variables: {
      search: debouncedSearch || undefined,
      tag: activeTag || undefined,
      limit: PAGE_SIZE,
      offset: 0,
      // Admin list — show flagged rows so admins can review/unflag them.
      includeFlagged: true,
    },
    fetchPolicy: "cache-and-network",
    notifyOnNetworkStatusChange: true,
  });

  const [createContact, { loading: creating }] = useCreateContactMutation();
  const [deleteContact] = useDeleteContactMutation();

  const contactsList = data?.contacts?.contacts ?? [];
  const totalCount = data?.contacts?.totalCount ?? 0;
  const hasMore = contactsList.length < totalCount;

  const sentinelRef = useRef<HTMLDivElement | null>(null);
  const loadingMoreRef = useRef(false);

  useEffect(() => {
    const node = sentinelRef.current;
    if (!node || !hasMore) return;
    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (!entry?.isIntersecting) return;
        if (loadingMoreRef.current) return;
        loadingMoreRef.current = true;
        setLoadingMore(true);
        fetchMore({
          variables: { offset: contactsList.length },
          updateQuery: (prev, { fetchMoreResult }) => {
            if (!fetchMoreResult) return prev;
            return {
              ...prev,
              contacts: {
                ...fetchMoreResult.contacts,
                contacts: [
                  ...prev.contacts.contacts,
                  ...fetchMoreResult.contacts.contacts,
                ],
              },
            };
          },
        })
          .finally(() => {
            loadingMoreRef.current = false;
            setLoadingMore(false);
          });
      },
      { rootMargin: "400px 0px" },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [hasMore, contactsList.length, fetchMore]);

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
          <ContactTagSelect value={activeTag} onChange={setTag} />
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

      {hasMore && (
        <Box ref={sentinelRef} py="4">
          <Flex justify="center">
            {loadingMore ? <Spinner size="2" /> : <Text size="2" color="gray">Scroll for more…</Text>}
          </Flex>
        </Box>
      )}
    </Container>
  );
}
