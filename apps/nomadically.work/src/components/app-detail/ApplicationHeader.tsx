"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Flex,
  Heading,
  Button,
  Box,
  Text,
  Dialog,
  IconButton,
  Avatar,
  Badge,
  DropdownMenu,
} from "@radix-ui/themes";
import {
  Pencil1Icon,
  DotsHorizontalIcon,
  TrashIcon,
  ExternalLinkIcon,
  ChevronDownIcon,
} from "@radix-ui/react-icons";
import {
  useDeleteApplicationMutation,
  useUpdateApplicationMutation,
  useUpdateCompanyMutation,
  useGetCompanyQuery,
} from "@/__generated__/hooks";
import type { ApplicationStatus } from "@/__generated__/hooks";
import { CompanyPicker } from "@/components/company-picker";
import type { AppData } from "./types";
import { formatDate, companyInitials, COLUMNS } from "./constants";

interface ApplicationHeaderProps {
  app: AppData;
  isAdmin: boolean;
}

export function ApplicationHeader({ app, isAdmin }: ApplicationHeaderProps) {
  const router = useRouter();
  const [deleteApplication] = useDeleteApplicationMutation();
  const [updateApplication] = useUpdateApplicationMutation();
  const [updateCompany] = useUpdateCompanyMutation();

  const { data: companyData } = useGetCompanyQuery({
    variables: { key: app.companyKey ?? "" },
    skip: !app.companyKey || !isAdmin,
  });

  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [editingCompany, setEditingCompany] = useState(false);
  const [companyNameValue, setCompanyNameValue] = useState("");
  const [companyWebsiteValue, setCompanyWebsiteValue] = useState("");
  const [companySaving, setCompanySaving] = useState(false);
  const [companySaveError, setCompanySaveError] = useState<string | null>(null);

  const [editingApp, setEditingApp] = useState(false);
  const [jobUrlValue, setJobUrlValue] = useState("");
  const [jobTitleValue, setJobTitleValue] = useState("");
  const [appSaving, setAppSaving] = useState(false);
  const [appSaveError, setAppSaveError] = useState<string | null>(null);
  const [enhancing, setEnhancing] = useState(false);
  const [enhanceMessage, setEnhanceMessage] = useState<string | null>(null);

  const displayName = app.companyName ?? app.jobId;
  const displayTitle = app.jobTitle ?? "Job application";
  const initials = companyInitials(displayName ?? "?");
  const statusCol = COLUMNS.find((c) => c.status === app.status);
  const statusColorToken = statusCol?.color ?? "gray";
  const statusCssColor = `var(--${statusColorToken}-9)`;
  const jobUrl = app.jobId?.startsWith("http") ? app.jobId : null;

  const handleStatusChange = async (status: ApplicationStatus) => {
    await updateApplication({
      variables: { id: app.id, input: { status } },
      refetchQueries: ["GetApplication"],
    });
  };

  const handleSaveCompany = async () => {
    const company = companyData?.company;
    if (!company) return;
    setCompanySaving(true);
    setCompanySaveError(null);
    try {
      await updateCompany({
        variables: {
          id: company.id,
          input: { name: companyNameValue, website: companyWebsiteValue || null },
        },
        refetchQueries: ["GetCompany"],
      });
      setEditingCompany(false);
    } catch (e) {
      setCompanySaveError(e instanceof Error ? e.message : "Save failed");
    } finally {
      setCompanySaving(false);
    }
  };

  const handleSaveApp = async () => {
    setAppSaving(true);
    setAppSaveError(null);
    try {
      await updateApplication({
        variables: {
          id: app.id,
          input: {
            jobId: jobUrlValue || undefined,
            jobTitle: jobTitleValue || undefined,
          },
        },
        refetchQueries: ["GetApplication"],
      });
      setEditingApp(false);
    } catch (e) {
      setAppSaveError(e instanceof Error ? e.message : "Save failed");
    } finally {
      setAppSaving(false);
    }
  };

  const handleEnhanceFromAshby = async () => {
    setEnhancing(true);
    setEnhanceMessage(null);
    try {
      const res = await fetch("/api/applications/enhance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ applicationId: app.id }),
      });
      const data = await res.json() as { error?: string; enriched?: { jobTitle?: string } };
      if (!res.ok) throw new Error(data.error ?? "Enhance failed");
      setEnhanceMessage(`Done — fetched description for ${data.enriched?.jobTitle ?? "job"}`);
      router.refresh();
    } catch (e) {
      setEnhanceMessage(e instanceof Error ? e.message : "Enhance failed");
    } finally {
      setEnhancing(false);
    }
  };

  const isAshbyUrl = jobUrl?.includes("ashbyhq.com");

  return (
    <>
      {/* Breadcrumb + overflow menu */}
      <Flex justify="between" align="center" mb="4">
        <Flex align="center" gap="1">
          <Text size="1" color="gray" asChild>
            <Link href="/applications" style={{ color: "inherit", textDecoration: "none" }}>
              Applications
            </Link>
          </Text>
          <Text size="1" color="gray">/</Text>
          <Text size="1" weight="medium" title={displayTitle}>
            {displayTitle.length > 40 ? displayTitle.slice(0, 40) + "\u2026" : displayTitle}
          </Text>
        </Flex>
        <DropdownMenu.Root>
          <DropdownMenu.Trigger>
            <IconButton size="2" variant="ghost" color="gray">
              <DotsHorizontalIcon />
            </IconButton>
          </DropdownMenu.Trigger>
          <DropdownMenu.Content size="1">
            <DropdownMenu.Item onClick={() => {
              setJobUrlValue(app.jobId ?? "");
              setJobTitleValue(app.jobTitle ?? "");
              setAppSaveError(null);
              setEnhanceMessage(null);
              setEditingApp(true);
            }}>
              <Pencil1Icon /> Edit application
            </DropdownMenu.Item>
            <DropdownMenu.Separator />
            <DropdownMenu.Item color="red" onClick={() => setDeleteDialogOpen(true)}>
              <TrashIcon /> Delete application
            </DropdownMenu.Item>
          </DropdownMenu.Content>
        </DropdownMenu.Root>
      </Flex>

      {/* Delete confirmation dialog */}
      <Dialog.Root open={deleteDialogOpen} onOpenChange={(o) => { if (!o && !deleting) setDeleteDialogOpen(false); }}>
        <Dialog.Content maxWidth="400px">
          <Dialog.Title>Delete application?</Dialog.Title>
          <Dialog.Description size="2" color="gray">
            This will permanently delete this application and all associated data. This action cannot be undone.
          </Dialog.Description>
          <Flex gap="2" justify="end" mt="4">
            <Dialog.Close>
              <Button variant="soft" color="gray" size="2" disabled={deleting}>Cancel</Button>
            </Dialog.Close>
            <Button
              color="red"
              size="2"
              disabled={deleting}
              onClick={async () => {
                setDeleting(true);
                try {
                  await deleteApplication({ variables: { id: app.id } });
                  router.push("/applications");
                } catch {
                  setDeleting(false);
                  setDeleteDialogOpen(false);
                }
              }}
            >
              {deleting ? "Deleting\u2026" : "Delete"}
            </Button>
          </Flex>
        </Dialog.Content>
      </Dialog.Root>

      {/* Header */}
      <Flex
        gap="4"
        align="start"
        mb="2"
        direction={{ initial: "column", sm: "row" }}
        style={{
          borderLeft: `3px solid ${statusCssColor}`,
          paddingLeft: 16,
        }}
      >
        <Avatar
          size="4"
          fallback={initials}
          variant="soft"
          color="indigo"
          style={{ flexShrink: 0 }}
        />
        <Box style={{ flex: 1 }}>
          <Heading size="7" mb="1">
            {displayTitle}
          </Heading>
          <Flex align="center" gap="2" wrap="wrap">
            <Text size="3" color="gray">
              {app.companyKey ? (
                <Link href={`/companies/${app.companyKey}`} target="_blank" rel="noopener noreferrer" style={{ color: "inherit", textDecoration: "underline", textUnderlineOffset: 2 }}>
                  {app.companyName ?? "Unknown company"}
                </Link>
              ) : (
                app.companyName ?? "Unknown company"
              )}{" "}
              &middot; Added {formatDate(app.createdAt)}
            </Text>
            <Badge
              color={statusCol?.color ?? "gray"}
              variant="soft"
              size="2"
              style={{
                boxShadow: `0 0 6px ${statusCssColor}`,
              }}
            >
              {statusCol?.label ?? app.status}
            </Badge>
            {isAdmin && (
              <DropdownMenu.Root>
                <DropdownMenu.Trigger>
                  <Button variant="ghost" size="1" color="gray">
                    <ChevronDownIcon />
                  </Button>
                </DropdownMenu.Trigger>
                <DropdownMenu.Content size="1">
                  {COLUMNS.map((col) => (
                    <DropdownMenu.Item
                      key={col.status}
                      disabled={col.status === app.status}
                      onClick={() => handleStatusChange(col.status)}
                    >
                      <Badge color={col.color} variant="soft" size="1">{col.label}</Badge>
                    </DropdownMenu.Item>
                  ))}
                </DropdownMenu.Content>
              </DropdownMenu.Root>
            )}
            {isAdmin && app.companyKey && (
              <IconButton
                size="1"
                variant="ghost"
                color="gray"
                onClick={() => {
                  setCompanyNameValue(companyData?.company?.name ?? app.companyName ?? "");
                  setCompanyWebsiteValue(companyData?.company?.website ?? "");
                  setCompanySaveError(null);
                  setEditingCompany(true);
                }}
              >
                <Pencil1Icon />
              </IconButton>
            )}
            {isAdmin && !app.companyKey && (
              <CompanyPicker
                companyKey={app.companyKey}
                companyName={app.companyName}
                onLinked={async (_key, name) => {
                  await updateApplication({
                    variables: { id: app.id, input: { companyName: name } },
                    refetchQueries: ["GetApplication"],
                  });
                }}
              />
            )}
          </Flex>

          {/* Inline job URL + resume */}
          <Flex align="center" gap="3" mt="1" wrap="wrap">
            {jobUrl ? (
              <a
                href={jobUrl}
                target="_blank"
                rel="noopener noreferrer"
                style={{ display: "inline-flex", alignItems: "center", gap: 4, color: "var(--accent-11)", textDecoration: "none" }}
              >
                <Text size="1">Job posting</Text>
                <ExternalLinkIcon width={12} height={12} />
              </a>
            ) : (
              <Button
                size="1"
                variant="ghost"
                color="gray"
                onClick={() => {
                  setJobUrlValue(app.jobId ?? "");
                  setJobTitleValue(app.jobTitle ?? "");
                  setAppSaveError(null);
                  setEnhanceMessage(null);
                  setEditingApp(true);
                }}
              >
                + Add job URL
              </Button>
            )}
            {isAshbyUrl && (
              <Button
                size="1"
                variant="ghost"
                color="indigo"
                disabled={enhancing}
                onClick={handleEnhanceFromAshby}
              >
                {enhancing ? "Enhancing\u2026" : "Enhance from Ashby"}
              </Button>
            )}
            {app.resume && (
              <a
                href={app.resume as unknown as string}
                target="_blank"
                rel="noopener noreferrer"
                style={{ display: "inline-flex", alignItems: "center", gap: 4, color: "var(--accent-11)", textDecoration: "none" }}
              >
                <Text size="1">Resume</Text>
                <ExternalLinkIcon width={12} height={12} />
              </a>
            )}
          </Flex>
        </Box>
      </Flex>

      {/* Company edit dialog */}
      <Dialog.Root open={editingCompany} onOpenChange={(o) => { if (!o) setEditingCompany(false); }}>
        <Dialog.Content maxWidth="420px">
          <Dialog.Title>Edit Company</Dialog.Title>
          <Flex direction="column" gap="3" mt="2">
            <Box>
              <Text size="2" weight="medium" mb="1" as="div">Name</Text>
              <input
                value={companyNameValue}
                onChange={(e) => setCompanyNameValue(e.target.value)}
                placeholder="Company name"
                style={{
                  width: "100%",
                  padding: "6px 10px",
                  borderRadius: "var(--radius-2)",
                  border: "1px solid var(--gray-6)",
                  background: "var(--gray-2)",
                  color: "var(--gray-12)",
                  fontSize: "var(--font-size-2)",
                  boxSizing: "border-box",
                }}
              />
            </Box>
            <Box>
              <Text size="2" weight="medium" mb="1" as="div">Website</Text>
              <input
                value={companyWebsiteValue}
                onChange={(e) => setCompanyWebsiteValue(e.target.value)}
                placeholder="https://example.com"
                style={{
                  width: "100%",
                  padding: "6px 10px",
                  borderRadius: "var(--radius-2)",
                  border: "1px solid var(--gray-6)",
                  background: "var(--gray-2)",
                  color: "var(--gray-12)",
                  fontSize: "var(--font-size-2)",
                  boxSizing: "border-box",
                }}
              />
            </Box>
            {companySaveError && (
              <Text size="1" color="red">{companySaveError}</Text>
            )}
          </Flex>
          <Flex gap="2" justify="end" mt="4">
            <Dialog.Close>
              <Button variant="soft" color="gray" size="2">Cancel</Button>
            </Dialog.Close>
            <Button size="2" disabled={companySaving} onClick={handleSaveCompany}>
              {companySaving ? "Saving\u2026" : "Save"}
            </Button>
          </Flex>
        </Dialog.Content>
      </Dialog.Root>

      {/* Edit application dialog */}
      <Dialog.Root open={editingApp} onOpenChange={(o) => { if (!o) setEditingApp(false); }}>
        <Dialog.Content maxWidth="480px">
          <Dialog.Title>Edit Application</Dialog.Title>
          <Flex direction="column" gap="3" mt="2">
            <Box>
              <Text size="2" weight="medium" mb="1" as="div">Job Title</Text>
              <input
                value={jobTitleValue}
                onChange={(e) => setJobTitleValue(e.target.value)}
                placeholder="e.g. Senior Frontend Engineer"
                style={{
                  width: "100%",
                  padding: "6px 10px",
                  borderRadius: "var(--radius-2)",
                  border: "1px solid var(--gray-6)",
                  background: "var(--gray-2)",
                  color: "var(--gray-12)",
                  fontSize: "var(--font-size-2)",
                  boxSizing: "border-box",
                }}
              />
            </Box>
            <Box>
              <Text size="2" weight="medium" mb="1" as="div">Job URL</Text>
              <input
                value={jobUrlValue}
                onChange={(e) => setJobUrlValue(e.target.value)}
                placeholder="https://jobs.ashbyhq.com/..."
                style={{
                  width: "100%",
                  padding: "6px 10px",
                  borderRadius: "var(--radius-2)",
                  border: "1px solid var(--gray-6)",
                  background: "var(--gray-2)",
                  color: "var(--gray-12)",
                  fontSize: "var(--font-size-2)",
                  boxSizing: "border-box",
                }}
              />
            </Box>
            {jobUrlValue.includes("ashbyhq.com") && (
              <Flex align="center" gap="2">
                <Button
                  size="1"
                  variant="soft"
                  color="indigo"
                  disabled={enhancing}
                  onClick={async () => {
                    // Save job URL first, then enhance
                    setAppSaving(true);
                    try {
                      await updateApplication({
                        variables: { id: app.id, input: { jobId: jobUrlValue, jobTitle: jobTitleValue || undefined } },
                        refetchQueries: ["GetApplication"],
                      });
                    } finally {
                      setAppSaving(false);
                    }
                    await handleEnhanceFromAshby();
                    setEditingApp(false);
                  }}
                >
                  {enhancing ? "Enhancing\u2026" : "Enhance from Ashby"}
                </Button>
                {enhanceMessage && (
                  <Text size="1" color={enhanceMessage.startsWith("Done") ? "green" : "red"}>{enhanceMessage}</Text>
                )}
              </Flex>
            )}
            {appSaveError && <Text size="1" color="red">{appSaveError}</Text>}
          </Flex>
          <Flex gap="2" justify="end" mt="4">
            <Dialog.Close>
              <Button variant="soft" color="gray" size="2">Cancel</Button>
            </Dialog.Close>
            <Button size="2" disabled={appSaving} onClick={handleSaveApp}>
              {appSaving ? "Saving\u2026" : "Save"}
            </Button>
          </Flex>
        </Dialog.Content>
      </Dialog.Root>
    </>
  );
}
