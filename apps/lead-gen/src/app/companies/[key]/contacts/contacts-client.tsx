"use client";

import * as React from "react";
import { useCallback, useState } from "react";
import {
  useGetCompanyQuery,
  useGetContactsQuery,
  useGetCompanyContactEmailsQuery,
  useImportContactsMutation,
  useFindContactEmailMutation,
  useFindCompanyEmailsMutation,
  useApplyEmailPatternMutation,
  useCreateContactMutation,
  useDeleteContactMutation,
  useUnverifyCompanyContactsMutation,
  useMergeDuplicateContactsMutation,
  useScoreContactsMlMutation,
} from "@/__generated__/hooks";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-hooks";
import { ADMIN_EMAIL } from "@/lib/constants";
import { useStreamingEmail } from "@/hooks/useStreamingEmail";
import type { GetContactsQuery } from "@/__generated__/hooks";
import {
  AlertDialog,
  Badge,
  Box,
  Callout,
  Card,
  Code,
  Container,
  Dialog,
  Flex,
  Link as RadixLink,
  Spinner,
  TabNav,
  Text,
  TextArea,
  TextField,
} from "@radix-ui/themes";
import { button } from "@/recipes/button";
import {
  ArrowLeftIcon,
  CheckIcon,
  CopyIcon,
  EnvelopeClosedIcon,
  ExclamationTriangleIcon,
  ExternalLinkIcon,
  GitHubLogoIcon,
  InfoCircledIcon,
  LinkedInLogoIcon,
  MagnifyingGlassIcon,
  MagicWandIcon,
  PaperPlaneIcon,
  PlusIcon,
  TrashIcon,
  UpdateIcon,
  ClockIcon,
} from "@radix-ui/react-icons";
import { BatchEmailModal } from "@/components/admin/BatchEmailModal";
import { GenerateAndSendBatchEmailModal } from "@/components/admin/GenerateAndSendBatchEmailModal";
import { FollowUpModal } from "@/components/admin/FollowUpModal";
import { useStreamingEmailScheduler } from "@/hooks/useStreamingEmailScheduler";

type Contact = NonNullable<
  GetContactsQuery["contacts"]["contacts"]
>[number];

/** Map seniority tier to a Radix badge color */
function seniorityColor(
  seniority: string | null | undefined,
): "red" | "orange" | "yellow" | "blue" | "gray" {
  switch (seniority) {
    case "C-level":
    case "Founder":
      return "red";
    case "Partner":
    case "VP":
      return "orange";
    case "Director":
      return "yellow";
    case "Manager":
      return "blue";
    default:
      return "gray";
  }
}

function parseLinkedInHTML(html: string) {
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, "text/html");
  const contacts: Array<{ name: string; title: string; profileUrl: string }> =
    [];

  const cards = doc.querySelectorAll(
    "li.org-people-profile-card__profile-card-spacing",
  );

  cards.forEach((card) => {
    const nameElement = card.querySelector(
      ".artdeco-entity-lockup__title .lt-line-clamp",
    );
    const name = nameElement?.textContent?.trim() || "";

    const profileLink = card.querySelector('a[href*="/in/"]');
    let profileUrl = profileLink?.getAttribute("href") || "";
    if (profileUrl) {
      profileUrl = profileUrl.split("?")[0];
      if (!profileUrl.startsWith("http")) {
        profileUrl = `https://www.linkedin.com${profileUrl}`;
      }
    }

    const titleElement = card.querySelector(
      ".artdeco-entity-lockup__subtitle .lt-line-clamp",
    );
    const title = titleElement?.textContent?.trim() || "";

    if (name && profileUrl && name !== "LinkedIn Member") {
      contacts.push({ name, title, profileUrl });
    }
  });

  return contacts;
}

function GenerateEmailDialog({
  contact,
  companyName,
}: {
  contact: Contact;
  companyName: string | null | undefined;
}) {
  const [open, setOpen] = useState(false);
  const [instructions, setInstructions] = useState("");
  const [copied, setCopied] = useState(false);
  const { content, partialContent, isStreaming, error, generate, stop, reset } =
    useStreamingEmail();

  const recipientName = `${contact.firstName} ${contact.lastName}`.trim();

  const handleOpen = (val: boolean) => {
    setOpen(val);
    if (!val) {
      reset();
      setInstructions("");
      setCopied(false);
    }
  };

  const handleGenerate = async () => {
    await generate({
      recipientName,
      companyName: companyName ?? undefined,
      recipientContext: contact.position ?? undefined,
      instructions: instructions || undefined,
    });
  };

  const handleCopy = () => {
    if (!content) return;
    navigator.clipboard.writeText(
      `Subject: ${content.subject}\n\n${content.body}`,
    );
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Dialog.Root open={open} onOpenChange={handleOpen}>
      <Dialog.Trigger>
        <button className={button({ variant: "ghost", size: "sm" })}>
          <MagicWandIcon />
          Draft email
        </button>
      </Dialog.Trigger>

      <Dialog.Content maxWidth="540px">
        <Dialog.Title>Draft email to {recipientName}</Dialog.Title>
        {companyName && (
          <Dialog.Description size="2" color="gray" mb="4">
            {contact.position ? `${contact.position} · ` : ""}
            {companyName}
          </Dialog.Description>
        )}

        <Flex direction="column" gap="3">
          <TextArea
            placeholder="Special instructions (optional) — e.g. mention their recent open source work…"
            value={instructions}
            onChange={(e) => setInstructions(e.target.value)}
            rows={3}
            disabled={isStreaming}
          />

          <Flex gap="2">
            <button
              className={button({ variant: "ghost" })}
              onClick={handleGenerate}
              disabled={isStreaming}
            >
              <MagicWandIcon />
              {isStreaming ? "Generating…" : "Generate"}
            </button>
            {isStreaming && (
              <button className={button({ variant: "ghost" })} onClick={stop}>
                Stop
              </button>
            )}
            {content && !isStreaming && (
              <button className={button({ variant: "ghost" })} onClick={reset}>
                Regenerate
              </button>
            )}
          </Flex>

          {error && (
            <Callout.Root color="red" size="1">
              <Callout.Icon>
                <ExclamationTriangleIcon />
              </Callout.Icon>
              <Callout.Text>{error}</Callout.Text>
            </Callout.Root>
          )}

          {isStreaming && partialContent && (
            <Box>
              <Text size="1" color="gray" mb="1" as="p">
                Streaming…
              </Text>
              <Box overflow="auto" maxHeight="200px">
                <Code
                  size="1"
                  style={{
                    display: "block",
                    whiteSpace: "pre-wrap",
                  }}
                >
                  {partialContent}
                </Code>
              </Box>
            </Box>
          )}

          {content && !isStreaming && (
            <Box
              p="3"
              style={{
                background: "var(--green-2)",
                borderRadius: 0,
              }}
            >
              <Flex justify="between" align="center" mb="2">
                <Badge color="green" size="1">
                  <CheckIcon />
                  Generated
                </Badge>
                <button className={button({ variant: "ghost", size: "sm" })} onClick={handleCopy}>
                  <CopyIcon />
                  {copied ? "Copied!" : "Copy"}
                </button>
              </Flex>

              <Text size="1" color="gray" weight="bold" as="p" mb="1">
                SUBJECT
              </Text>
              <Text size="2" weight="medium" as="p" mb="3">
                {content.subject}
              </Text>

              <Text size="1" color="gray" weight="bold" as="p" mb="1">
                BODY
              </Text>
              <Text
                size="2"
                as="p"
                style={{ whiteSpace: "pre-wrap", lineHeight: "1.6" }}
              >
                {content.body}
              </Text>
            </Box>
          )}
        </Flex>

        <Flex justify="end" mt="4">
          <Dialog.Close>
            <button className={button({ variant: "ghost" })}>
              Close
            </button>
          </Dialog.Close>
        </Flex>
      </Dialog.Content>
    </Dialog.Root>
  );
}

function FindEmailButton({
  contact,
  onFound,
}: {
  contact: Contact;
  onFound: () => void;
}) {
  const [findEmail, { loading }] = useFindContactEmailMutation();
  const [result, setResult] = useState<string | null>(null);

  const handleClick = useCallback(async () => {
    setResult(null);
    const { data } = await findEmail({ variables: { contactId: contact.id } });
    const res = data?.findContactEmail;
    if (res?.emailFound && res.email) {
      setResult(`Found: ${res.email}`);
      onFound();
    } else {
      setResult(res?.message ?? "No email found");
    }
  }, [findEmail, contact.id, onFound]);

  if (contact.emailVerified) return null;

  return (
    <Flex direction="column" align="end" gap="1">
      <button
        className={button({ variant: "ghost", size: "sm" })}
        onClick={handleClick}
        disabled={loading}
      >
        {loading ? <Spinner size="1" /> : <MagnifyingGlassIcon />}
        Find email
      </button>
      {result && (
        <Text size="1" color="gray" maxWidth="180px" align="right">
          {result}
        </Text>
      )}
    </Flex>
  );
}

function CreateContactDialog({
  companyId,
  companyName,
  onCreated,
}: {
  companyId: number;
  companyName: string | null | undefined;
  onCreated: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    position: "",
    linkedinUrl: "",
  });
  const [createContact, { loading }] = useCreateContactMutation();
  const [error, setError] = useState<string | null>(null);

  const handleOpenChange = (val: boolean) => {
    setOpen(val);
    if (!val) {
      setForm({ firstName: "", lastName: "", email: "", position: "", linkedinUrl: "" });
      setError(null);
    }
  };

  const handleSubmit = async () => {
    if (!form.firstName.trim()) {
      setError("First name is required.");
      return;
    }
    setError(null);
    try {
      await createContact({
        variables: {
          input: {
            firstName: form.firstName.trim(),
            lastName: form.lastName.trim() || undefined,
            email: form.email.trim() || undefined,
            position: form.position.trim() || undefined,
            linkedinUrl: form.linkedinUrl.trim() || undefined,
            companyId,
          },
        },
      });
      setOpen(false);
      onCreated();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to create contact.");
    }
  };

  return (
    <Dialog.Root open={open} onOpenChange={handleOpenChange}>
      <Dialog.Trigger>
        <button className={button({ variant: "solid", size: "md" })}>
          <PlusIcon />
          Add contact
        </button>
      </Dialog.Trigger>

      <Dialog.Content maxWidth="440px">
        <Dialog.Title>Add contact</Dialog.Title>
        {companyName && (
          <Dialog.Description size="2" color="gray" mb="4">
            {companyName}
          </Dialog.Description>
        )}

        <Flex direction="column" gap="3">
          {error && (
            <Callout.Root color="red" size="1">
              <Callout.Icon>
                <ExclamationTriangleIcon />
              </Callout.Icon>
              <Callout.Text>{error}</Callout.Text>
            </Callout.Root>
          )}

          <Flex gap="2">
            <Box flexGrow="1">
              <Text size="1" color="gray" mb="1" as="p">First name *</Text>
              <TextField.Root
                placeholder="First name"
                value={form.firstName}
                onChange={(e) => setForm((f) => ({ ...f, firstName: e.target.value }))}
              />
            </Box>
            <Box flexGrow="1">
              <Text size="1" color="gray" mb="1" as="p">Last name</Text>
              <TextField.Root
                placeholder="Last name"
                value={form.lastName}
                onChange={(e) => setForm((f) => ({ ...f, lastName: e.target.value }))}
              />
            </Box>
          </Flex>

          <Box>
            <Text size="1" color="gray" mb="1" as="p">Position</Text>
            <TextField.Root
              placeholder="e.g. Engineering Manager"
              value={form.position}
              onChange={(e) => setForm((f) => ({ ...f, position: e.target.value }))}
            />
          </Box>

          <Box>
            <Text size="1" color="gray" mb="1" as="p">Email</Text>
            <TextField.Root
              type="email"
              placeholder="name@company.com"
              value={form.email}
              onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
            />
          </Box>

          <Box>
            <Text size="1" color="gray" mb="1" as="p">LinkedIn URL</Text>
            <TextField.Root
              placeholder="https://linkedin.com/in/…"
              value={form.linkedinUrl}
              onChange={(e) => setForm((f) => ({ ...f, linkedinUrl: e.target.value }))}
            />
          </Box>
        </Flex>

        <Flex gap="3" mt="4" justify="end">
          <Dialog.Close>
            <button className={button({ variant: "ghost" })}>Cancel</button>
          </Dialog.Close>
          <button className={button({ variant: "ghost" })} onClick={handleSubmit} disabled={loading}>
            {loading ? "Saving…" : "Create contact"}
          </button>
        </Flex>
      </Dialog.Content>
    </Dialog.Root>
  );
}

function DeleteContactButton({
  contact,
  onDeleted,
}: {
  contact: Contact;
  onDeleted: () => void;
}) {
  const [deleteContact, { loading }] = useDeleteContactMutation();

  const handleDelete = useCallback(async () => {
    const { data } = await deleteContact({ variables: { id: contact.id } });
    if (data?.deleteContact?.success) {
      onDeleted();
    }
  }, [deleteContact, contact.id, onDeleted]);

  return (
    <AlertDialog.Root>
      <AlertDialog.Trigger>
        <button className={button({ variant: "ghost", size: "sm" })}>
          <TrashIcon />
          Remove
        </button>
      </AlertDialog.Trigger>
      <AlertDialog.Content maxWidth="400px">
        <AlertDialog.Title>Remove contact</AlertDialog.Title>
        <AlertDialog.Description size="2">
          Remove {contact.firstName} {contact.lastName}? This cannot be undone.
        </AlertDialog.Description>
        <Flex gap="3" mt="4" justify="end">
          <AlertDialog.Cancel>
            <button className={button({ variant: "ghost" })}>
              Cancel
            </button>
          </AlertDialog.Cancel>
          <AlertDialog.Action>
            <button className={button({ variant: "ghost" })} onClick={handleDelete} disabled={loading}>
              {loading ? "Removing…" : "Remove"}
            </button>
          </AlertDialog.Action>
        </Flex>
      </AlertDialog.Content>
    </AlertDialog.Root>
  );
}

export function CompanyContactsClient({
  companyKey,
}: {
  companyKey: string;
}) {
  const router = useRouter();
  const { user } = useAuth();
  const isAdmin = user?.email === ADMIN_EMAIL;

  const { data: companyData, loading: companyLoading } = useGetCompanyQuery({
    variables: { key: companyKey },
    skip: !isAdmin,
  });

  const company = companyData?.company ?? null;

  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [showImport, setShowImport] = useState(false);
  const [batchEmailOpen, setBatchEmailOpen] = useState(false);
  const [generateBatchOpen, setGenerateBatchOpen] = useState(false);
  const [linkedinHtml, setLinkedinHtml] = useState("");
  const [importStatus, setImportStatus] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);
  const [emailDiscoveryStatus, setEmailDiscoveryStatus] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);
  const { isStreaming, progress, completion, error: schedulerError, scheduleEmails, reset: resetScheduler } = useStreamingEmailScheduler();

  const debounceRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const handleSearch = useCallback((val: string) => {
    setSearch(val);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => setDebouncedSearch(val), 300);
  }, []);

  const { data, loading, refetch } = useGetContactsQuery({
    variables: {
      companyId: company?.id ?? 0,
      search: debouncedSearch || undefined,
      limit: 100,
    },
    skip: !isAdmin || !company?.id,
    fetchPolicy: "cache-and-network",
  });

  const [followUpOpen, setFollowUpOpen] = useState(false);
  const [importContacts, { loading: importing }] = useImportContactsMutation();
  const [findCompanyEmails, { loading: enhancing }] = useFindCompanyEmailsMutation();
  const [applyEmailPattern, { loading: applyingPattern }] = useApplyEmailPatternMutation();
  const [unverifyCompanyContacts, { loading: unverifying }] = useUnverifyCompanyContactsMutation();
  const [mergeDuplicateContacts, { loading: merging }] = useMergeDuplicateContactsMutation();
  const [scoreContactsML, { loading: scoringML }] = useScoreContactsMlMutation();
  const [mlScoreStatus, setMlScoreStatus] = useState<{ type: "success" | "error"; message: string } | null>(null);

  // Fetch company emails for follow-up modal
  const { data: companyEmailsData, refetch: refetchEmails } = useGetCompanyContactEmailsQuery({
    variables: { companyId: company?.id ?? 0 },
    skip: !company?.id,
    fetchPolicy: "cache-and-network",
  });

  const handleImportContacts = useCallback(async () => {
    if (!linkedinHtml || !company) return;
    setImportStatus(null);

    const parsed = parseLinkedInHTML(linkedinHtml);
    if (parsed.length === 0) {
      setImportStatus({
        type: "error",
        message:
          "No contacts found in the HTML. Make sure you copied the LinkedIn company People page source.",
      });
      return;
    }

    try {
      const { data: result } = await importContacts({
        variables: {
          contacts: parsed.map((c) => ({
            firstName: c.name.split(" ")[0] || "",
            lastName: c.name.split(" ").slice(1).join(" ") || "",
            linkedinUrl: c.profileUrl || null,
            email: null,
            company: company.name || null,
            companyId: company.id,
            position: c.title || null,
          })),
        },
      });

      const imported = result?.importContacts?.imported ?? 0;
      const failed = result?.importContacts?.failed ?? 0;

      if (failed === 0) {
        setImportStatus({
          type: "success",
          message: `Imported ${imported} contact${imported !== 1 ? "s" : ""} successfully.`,
        });
      } else {
        setImportStatus({
          type: "error",
          message: `Imported ${imported}, failed ${failed}.`,
        });
      }

      setLinkedinHtml("");
      await refetch();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Import failed.";
      setImportStatus({ type: "error", message: msg });
    }
  }, [linkedinHtml, importContacts, company, refetch]);

  const handleEnhanceAll = useCallback(async () => {
    if (!company) return;
    setEmailDiscoveryStatus(null);
    try {
      const { data: result } = await findCompanyEmails({
        variables: { companyId: company.id },
      });
      const res = result?.findCompanyEmails;
      if (res?.success) {
        const errSuffix = res.errors?.length
          ? ` (${res.errors.length} errors: ${res.errors.slice(0, 3).join("; ")}${res.errors.length > 3 ? "…" : ""})`
          : "";
        setEmailDiscoveryStatus({ type: "success", message: res.message + errSuffix });
        await refetch();
      } else {
        setEmailDiscoveryStatus({
          type: "error",
          message: res?.message ?? "Email discovery failed",
        });
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Email discovery failed.";
      setEmailDiscoveryStatus({ type: "error", message: msg });
    }
  }, [findCompanyEmails, company, refetch]);

  const handleApplyPattern = useCallback(async () => {
    if (!company) return;
    setEmailDiscoveryStatus(null);
    try {
      const { data: result } = await applyEmailPattern({
        variables: { companyId: company.id },
      });
      const res = result?.applyEmailPattern;
      setEmailDiscoveryStatus({
        type: res?.success ? "success" : "error",
        message: res?.message ?? "Pattern application failed",
      });
      if (res?.success) await refetch();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Pattern application failed.";
      setEmailDiscoveryStatus({ type: "error", message: msg });
    }
  }, [applyEmailPattern, company, refetch]);

  const handleUnverifyAll = useCallback(async () => {
    if (!company) return;
    try {
      const { data: result, errors } = await unverifyCompanyContacts({ variables: { companyId: company.id } });
      if (errors?.length) {
        setEmailDiscoveryStatus({ type: "error", message: errors[0].message });
        return;
      }
      setEmailDiscoveryStatus({ type: "success", message: `Unverified ${result?.unverifyCompanyContacts?.count ?? 0} contacts` });
      await refetch();
    } catch (err: unknown) {
      setEmailDiscoveryStatus({ type: "error", message: err instanceof Error ? err.message : "Unverify failed" });
    }
  }, [company, unverifyCompanyContacts, refetch]);

  const handleScoreML = useCallback(async () => {
    if (!company) return;
    setMlScoreStatus(null);
    try {
      const { data: result } = await scoreContactsML({
        variables: { companyId: company.id },
      });
      const res = result?.scoreContactsML;
      setMlScoreStatus({
        type: res?.success ? "success" : "error",
        message: res?.message ?? "ML scoring failed",
      });
      if (res?.success) await refetch();
    } catch (err: unknown) {
      setMlScoreStatus({ type: "error", message: err instanceof Error ? err.message : "ML scoring failed" });
    }
  }, [scoreContactsML, company, refetch]);

  // Admin guard
  if (!isAdmin) {
    return (
      <Container size="3" p="8">
        <Callout.Root color="red">
          <Callout.Icon>
            <ExclamationTriangleIcon />
          </Callout.Icon>
          <Callout.Text>Access denied. Admin only.</Callout.Text>
        </Callout.Root>
      </Container>
    );
  }

  if (companyLoading) {
    return (
      <Container size="3" p="8">
        <Flex justify="center">
          <Spinner size="3" />
        </Flex>
      </Container>
    );
  }

  if (!company) {
    return (
      <Container size="3" p="8">
        <Callout.Root color="gray">
          <Callout.Icon>
            <InfoCircledIcon />
          </Callout.Icon>
          <Callout.Text>Company not found.</Callout.Text>
        </Callout.Root>
      </Container>
    );
  }

  // Sort by authority score DESC so decision makers appear first
  const contactsList = [...(data?.contacts?.contacts ?? [])].sort(
    (a, b) => (b.authorityScore ?? 0) - (a.authorityScore ?? 0),
  );
  const totalCount = data?.contacts?.totalCount ?? 0;
  const batchEmailRecipients = contactsList
    .filter((c) => c.email && !c.doNotContact)
    .map((c) => ({
      email: c.email as string,
      name: `${c.firstName} ${c.lastName}`.trim(),
    }));

  const generateBatchContacts = contactsList
    .filter((c) => c.email && !c.doNotContact)
    .map((c) => ({
      id: c.id,
      firstName: c.firstName,
      lastName: c.lastName,
      email: c.email as string,
    }));

  return (
    <Container size="3" p={{ initial: "4", md: "6" }}>
      <Flex direction="column" gap="5">
        {/* Back link + header */}
        <Box>
          <Link
            href={`/companies/${companyKey}`}
            style={{ textDecoration: "none" }}
          >
            <Flex align="center" gap="1" mb="3">
              <ArrowLeftIcon />
              <Text size="2" color="gray">
                {company.name}
              </Text>
            </Flex>
          </Link>

          {/* Tab navigation */}
          <TabNav.Root mb="4">
            <TabNav.Link asChild>
              <Link href={`/companies/${companyKey}`}>Overview</Link>
            </TabNav.Link>
            <TabNav.Link asChild active>
              <Link href={`/companies/${companyKey}/contacts`}>Contacts</Link>
            </TabNav.Link>
            <TabNav.Link asChild>
              <Link href={`/companies/${companyKey}/emails`}>Emails</Link>
            </TabNav.Link>
          </TabNav.Root>
        </Box>

        {/* Email discovery status */}
        {emailDiscoveryStatus && (
          <Callout.Root
            color={emailDiscoveryStatus.type === "success" ? "green" : "red"}
            size="1"
          >
            <Callout.Icon>
              <InfoCircledIcon />
            </Callout.Icon>
            <Callout.Text>{emailDiscoveryStatus.message}</Callout.Text>
          </Callout.Root>
        )}

        {/* ML scoring status */}
        {mlScoreStatus && (
          <Callout.Root
            color={mlScoreStatus.type === "success" ? "blue" : "red"}
            size="1"
          >
            <Callout.Icon>
              <InfoCircledIcon />
            </Callout.Icon>
            <Callout.Text>{mlScoreStatus.message}</Callout.Text>
          </Callout.Root>
        )}

        {/* Streaming scheduler progress */}
        {(isStreaming || completion || schedulerError) && (
          <Callout.Root
            color={schedulerError ? "red" : completion ? "green" : "blue"}
            size="1"
          >
            <Callout.Icon>
              {isStreaming ? <Spinner size="1" /> : schedulerError ? <ExclamationTriangleIcon /> : <InfoCircledIcon />}
            </Callout.Icon>
            <Callout.Text>
              {completion
                ? completion.message
                : schedulerError
                  ? schedulerError
                  : progress.length > 0
                    ? progress[progress.length - 1].message
                    : "Starting scheduler..."}
            </Callout.Text>
            {(completion || schedulerError) && (
              <Box ml="2" flexShrink="0">
                <button className={button({ variant: "ghost", size: "sm" })} onClick={resetScheduler}>
                  Dismiss
                </button>
              </Box>
            )}
          </Callout.Root>
        )}

        {/* Toolbar */}
        <Flex align="center" justify="between" gap="3" wrap="wrap">
          <Text size="2" color="gray">
            {loading
              ? "Loading…"
              : `${totalCount} contact${totalCount !== 1 ? "s" : ""}`}
          </Text>
          <Flex gap="2" align="center" wrap="wrap">
            <CreateContactDialog
              companyId={company.id}
              companyName={company.name}
              onCreated={refetch}
            />

            {/* Email discovery actions */}
            <button
              className={button({ variant: "ghost", size: "md" })}
              onClick={handleEnhanceAll}
              disabled={enhancing || applyingPattern}
            >
              {enhancing ? <Spinner size="1" /> : <MagnifyingGlassIcon />}
              Find emails for all
            </button>
            <button
              className={button({ variant: "ghost", size: "md" })}
              onClick={handleApplyPattern}
              disabled={applyingPattern || enhancing}
            >
              {applyingPattern ? <Spinner size="1" /> : <UpdateIcon />}
              Apply pattern
            </button>

            <button
              className={button({ variant: "ghost", size: "md" })}
              onClick={handleUnverifyAll}
              disabled={unverifying}
            >
              {unverifying ? <Spinner size="1" /> : null}
              Unverify all
            </button>

            <button
              className={button({ variant: "ghost", size: "md" })}
              onClick={handleScoreML}
              disabled={scoringML}
              title="Classify each contact's seniority, department, and decision-maker status from their job title"
            >
              {scoringML ? <Spinner size="1" /> : <MagicWandIcon />}
              Score ML
            </button>

            <button
              className={button({ variant: "solid", size: "md" })}
              onClick={() => setGenerateBatchOpen(true)}
              disabled={batchEmailRecipients.length === 0}
            >
              <MagicWandIcon />
              Generate & Send
              {batchEmailRecipients.length > 0 && ` (${batchEmailRecipients.length})`}
            </button>
            <button
              className={button({ variant: "solid", size: "md" })}
              onClick={() => setBatchEmailOpen(true)}
              disabled={batchEmailRecipients.length === 0}
            >
              <PaperPlaneIcon />
              Send Batch Email
              {batchEmailRecipients.length > 0 && ` (${batchEmailRecipients.length})`}
            </button>
            <button
              className={button({ variant: "ghost", size: "md" })}
              onClick={() => company?.id && scheduleEmails(company.id)}
              disabled={isStreaming || !company?.id}
            >
              {isStreaming ? <Spinner size="1" /> : <UpdateIcon />}
              {isStreaming ? "Scheduling..." : "Schedule All"}
            </button>
            <button
              className={button({ variant: "ghost", size: "md" })}
              onClick={() => setFollowUpOpen(true)}
              disabled={!company?.id}
            >
              <ClockIcon />
              Follow-up
            </button>
            <button
              className={button({ variant: "ghost", size: "md" })}
              onClick={async () => {
                if (!company?.id) return;
                const { data: result } = await mergeDuplicateContacts({ variables: { companyId: company.id } });
                if (result?.mergeDuplicateContacts?.success) {
                  setImportStatus({ type: "success", message: result.mergeDuplicateContacts.message });
                  await refetch();
                }
              }}
              disabled={merging}
            >
              {merging ? <Spinner size="1" /> : null}
              Merge Duplicates
            </button>

            {/* LinkedIn import */}
            <Dialog.Root
              open={showImport}
              onOpenChange={(open) => {
                setShowImport(open);
                if (!open) {
                  setLinkedinHtml("");
                  setImportStatus(null);
                }
              }}
            >
              <Dialog.Trigger>
                <button className={button({ variant: "ghost", size: "md" })}>
                  <LinkedInLogoIcon />
                  Import from LinkedIn
                </button>
              </Dialog.Trigger>

              <Dialog.Content maxWidth="520px">
                <Dialog.Title>Import LinkedIn contacts</Dialog.Title>
                <Dialog.Description size="2" color="gray" mb="4">
                  Go to the company&apos;s LinkedIn page → People tab →
                  right-click → View Page Source → copy all HTML → paste below.
                </Dialog.Description>

                {importStatus && (
                  <Callout.Root
                    color={importStatus.type === "success" ? "green" : "red"}
                    mb="3"
                  >
                    <Callout.Icon>
                      <InfoCircledIcon />
                    </Callout.Icon>
                    <Callout.Text>{importStatus.message}</Callout.Text>
                  </Callout.Root>
                )}

                <TextArea
                  size="1"
                  placeholder="Paste LinkedIn page HTML here…"
                  value={linkedinHtml}
                  onChange={(e) => setLinkedinHtml(e.target.value)}
                  rows={12}
                />

                <Flex gap="3" mt="4" justify="end">
                  <Dialog.Close>
                    <button className={button({ variant: "ghost" })}>
                      Cancel
                    </button>
                  </Dialog.Close>
                  <button
                    className={button({ variant: "ghost" })}
                    onClick={handleImportContacts}
                    disabled={!linkedinHtml.trim() || importing}
                  >
                    {importing ? "Importing…" : "Import contacts"}
                  </button>
                </Flex>
              </Dialog.Content>
            </Dialog.Root>

            <Box width="240px">
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
        </Flex>

        {/* Contacts list */}
        {!loading && contactsList.length === 0 ? (
          <Callout.Root color="gray" variant="soft">
            <Callout.Icon>
              <InfoCircledIcon />
            </Callout.Icon>
            <Callout.Text>No contacts found.</Callout.Text>
          </Callout.Root>
        ) : (
          <Flex direction="column" gap="2">
            {contactsList.map((contact) => (
              <Card
                key={contact.id}
                style={{ cursor: "pointer" }}
                onClick={() => router.push(`/contacts/${contact.id}`)}
              >
                <Box p="3">
                  <Flex align="start" justify="between" gap="3" wrap="wrap">
                    <Box minWidth="0">
                      <Flex align="center" gap="2" wrap="wrap">
                        <Text size="3" weight="medium">
                          {contact.firstName} {contact.lastName}
                        </Text>
                        {contact.emailVerified && (
                          <Badge color="green" variant="soft" size="1">
                            verified
                          </Badge>
                        )}
                        {contact.email && !contact.emailVerified && contact.nbResult && (
                          <Badge color="orange" variant="soft" size="1">
                            {contact.nbResult}
                          </Badge>
                        )}
                        {contact.doNotContact && (
                          <Badge color="red" variant="soft" size="1">
                            do not contact
                          </Badge>
                        )}
                        {contact.isDecisionMaker && (
                          <Badge color="green" variant="solid" size="1">
                            DM
                          </Badge>
                        )}
                        {contact.seniority && (
                          <Badge
                            color={seniorityColor(contact.seniority)}
                            variant="soft"
                            size="1"
                          >
                            {contact.seniority}
                          </Badge>
                        )}
                        {contact.department && contact.department !== "Other" && (
                          <Badge color="gray" variant="outline" size="1">
                            {contact.department}
                          </Badge>
                        )}
                      </Flex>

                      {contact.position && (
                        <Text size="2" color="gray" mt="1" as="p">
                          {contact.position}
                          {contact.authorityScore != null && contact.authorityScore > 0 && (
                            <Text as="span" size="1" color="gray" ml="2">
                              {(contact.authorityScore * 100).toFixed(0)}%
                            </Text>
                          )}
                        </Text>
                      )}

                      <Flex gap="3" mt="2" wrap="wrap" align="center">
                        {contact.email && (
                          <Flex align="center" gap="1" onClick={(e) => e.stopPropagation()}>
                            <EnvelopeClosedIcon color="gray" />
                            <RadixLink
                              href={`mailto:${contact.email}`}
                              size="2"
                              color="gray"
                            >
                              {contact.email}
                            </RadixLink>
                          </Flex>
                        )}
                        {contact.linkedinUrl && (
                          <Flex align="center" gap="1" onClick={(e) => e.stopPropagation()}>
                            <LinkedInLogoIcon color="gray" />
                            <RadixLink
                              href={contact.linkedinUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              size="2"
                              color="gray"
                            >
                              <Flex as="span" align="center" gap="1">
                                LinkedIn
                                <ExternalLinkIcon />
                              </Flex>
                            </RadixLink>
                          </Flex>
                        )}
                        {contact.githubHandle && (
                          <Flex align="center" gap="1" onClick={(e) => e.stopPropagation()}>
                            <GitHubLogoIcon color="gray" />
                            <RadixLink
                              href={`https://github.com/${contact.githubHandle}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              size="2"
                              color="gray"
                            >
                              {contact.githubHandle}
                            </RadixLink>
                          </Flex>
                        )}
                      </Flex>

                      {contact.tags && contact.tags.length > 0 && (
                        <Flex gap="1" mt="2" wrap="wrap">
                          {contact.tags.map((tag) => (
                            <Badge
                              key={tag}
                              color="gray"
                              variant="surface"
                              size="1"
                            >
                              {tag}
                            </Badge>
                          ))}
                        </Flex>
                      )}
                    </Box>

                    <Flex direction="column" align="end" gap="2" flexShrink="0" onClick={(e) => e.stopPropagation()}>
                      {!contact.doNotContact && (
                        <GenerateEmailDialog
                          contact={contact}
                          companyName={company.name}
                        />
                      )}
                      {!contact.doNotContact && (
                        <FindEmailButton
                          contact={contact}
                          onFound={refetch}
                        />
                      )}
                      <DeleteContactButton
                        contact={contact}
                        onDeleted={refetch}
                      />
                    </Flex>
                  </Flex>
                </Box>
              </Card>
            ))}
          </Flex>
        )}
      </Flex>
      <BatchEmailModal
        open={batchEmailOpen}
        onOpenChange={setBatchEmailOpen}
        recipients={batchEmailRecipients}
      />
      <GenerateAndSendBatchEmailModal
        open={generateBatchOpen}
        onOpenChange={setGenerateBatchOpen}
        companyId={company.id}
        companyName={company.name ?? undefined}
        contacts={generateBatchContacts}
        onSuccess={refetch}
      />
      <FollowUpModal
        open={followUpOpen}
        onOpenChange={setFollowUpOpen}
        companyId={company.id}
        companyName={company.name ?? undefined}
        companyDescription={company.description ?? undefined}
        sentEmails={(companyEmailsData?.companyContactEmails ?? []).map((e) => ({
          id: e.id,
          resendId: e.resendId,
          recipientEmail: (e.toEmails?.[0] ?? ""),
          recipientName: e.recipientName ?? `${e.contactFirstName} ${e.contactLastName}`.trim(),
          subject: e.subject,
          sentAt: e.sentAt,
          sequenceNumber: e.sequenceNumber,
          sequenceType: e.sequenceType,
          status: e.status,
        }))}
        onSuccess={() => { refetch(); refetchEmails(); }}
      />
    </Container>
  );
}
