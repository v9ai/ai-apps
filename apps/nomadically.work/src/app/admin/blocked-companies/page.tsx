"use client";

import * as React from "react";
import { useState } from "react";
import {
  useGetBlockedCompaniesQuery,
  useBlockCompanyMutation,
  useUnblockCompanyMutation,
} from "@/__generated__/hooks";
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
  Cross2Icon,
  ExclamationTriangleIcon,
  PlusIcon,
} from "@radix-ui/react-icons";

export default function AdminBlockedCompaniesPage() {
  const { user } = useAuth();
  const isAdmin = user?.email === ADMIN_EMAIL;

  const [createOpen, setCreateOpen] = useState(false);

  const { data, loading, refetch } = useGetBlockedCompaniesQuery({
    skip: !isAdmin,
    fetchPolicy: "cache-and-network",
  });

  const [blockCompany, { loading: blocking }] = useBlockCompanyMutation();
  const [unblockCompany] = useUnblockCompanyMutation();

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

  const list = data?.blockedCompanies ?? [];

  async function handleBlock(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    await blockCompany({
      variables: {
        name: fd.get("name") as string,
        reason: fd.get("reason") as string || undefined,
      },
    });
    setCreateOpen(false);
    refetch();
  }

  async function handleUnblock(id: number) {
    if (!confirm("Unblock this company?")) return;
    await unblockCompany({ variables: { id } });
    refetch();
  }

  return (
    <Container size="4" p="8" style={{ maxWidth: "1100px" }}>
      <Flex justify="between" align="center" mb="6">
        <Flex align="center" gap="3">
          <Heading size="7">Blocked Companies</Heading>
          <Badge color="gray" variant="soft" size="2">{list.length}</Badge>
        </Flex>
        <Dialog.Root open={createOpen} onOpenChange={setCreateOpen}>
          <Dialog.Trigger>
            <Button size="2"><PlusIcon /> Block Company</Button>
          </Dialog.Trigger>
          <Dialog.Content maxWidth="450px">
            <Dialog.Title>Block Company</Dialog.Title>
            <form onSubmit={handleBlock}>
              <Flex direction="column" gap="3" mt="3">
                <TextField.Root name="name" placeholder="Company name *" required />
                <TextArea name="reason" placeholder="Reason (optional)" />
                <Flex gap="3" justify="end" mt="2">
                  <Dialog.Close>
                    <Button variant="soft" color="gray">Cancel</Button>
                  </Dialog.Close>
                  <Button type="submit" color="red" disabled={blocking}>
                    {blocking ? "Blocking…" : "Block"}
                  </Button>
                </Flex>
              </Flex>
            </form>
          </Dialog.Content>
        </Dialog.Root>
      </Flex>

      {loading ? (
        <Flex justify="center" py="6"><Spinner size="3" /></Flex>
      ) : list.length === 0 ? (
        <Callout.Root color="gray" variant="soft">
          <Callout.Text>No blocked companies.</Callout.Text>
        </Callout.Root>
      ) : (
        <Flex direction="column" gap="2">
          {list.map((company) => (
            <Card key={company.id}>
              <Flex align="center" justify="between" p="3">
                <Box>
                  <Text size="3" weight="medium">{company.name}</Text>
                  {company.reason && (
                    <Text size="2" color="gray" as="p" mt="1">{company.reason}</Text>
                  )}
                  <Text size="1" color="gray" as="p" mt="1">
                    Blocked {new Date(company.createdAt).toLocaleDateString()}
                  </Text>
                </Box>
                <Button
                  size="1"
                  variant="soft"
                  color="red"
                  onClick={() => handleUnblock(company.id)}
                >
                  <Cross2Icon /> Unblock
                </Button>
              </Flex>
            </Card>
          ))}
        </Flex>
      )}
    </Container>
  );
}
