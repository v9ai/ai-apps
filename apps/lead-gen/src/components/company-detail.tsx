"use client";

import * as React from "react";
import { useCallback, useMemo, useState } from "react";
import {
  useGetCompanyQuery,
  useEnhanceCompanyMutation,
  useAnalyzeCompanyMutation,
  useUpdateCompanyMutation,
  useCreateContactMutation,
  useDeleteCompanyMutation,
  useBlockCompanyMutation,
  useUnblockCompanyMutation,
} from "@/__generated__/hooks";
import { useRouter } from "next/navigation";
import type { CompanyCategory } from "@/__generated__/graphql";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import Link from "next/link";
import { useAuth } from "@/lib/auth-hooks";
import { ADMIN_EMAIL } from "@/lib/constants";
import { CompanyContactsClient } from "@/app/companies/[key]/contacts/contacts-client";
import {
  AlertDialog,
  Avatar,
  Badge,
  Blockquote,
  Box,
  Button,
  Callout,
  Card,
  Code,
  Container,
  Dialog,
  Em,
  Flex,
  Heading,
  Link as RadixLink,
  Select,
  Separator,
  Skeleton,
  Strong,
  TabNav,
  Text,
  TextArea,
  TextField,
} from "@radix-ui/themes";
import {
  CheckCircledIcon,
  ExternalLinkIcon,
  GlobeIcon,
  InfoCircledIcon,
  LinkedInLogoIcon,
  MagicWandIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  Link2Icon,
  CrossCircledIcon,
  Pencil1Icon,
  TrashIcon,
} from "@radix-ui/react-icons";

type Props = {
  companyKey?: string;
  companyId?: number;
};

function coerceExternalUrl(raw?: string | null): string | null {
  if (!raw) return null;
  const trimmed = raw.trim();
  if (!trimmed) return null;
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  return `https://${trimmed.replace(/^\/+/, "")}`;
}

function prettyUrl(raw?: string | null): string {
  if (!raw) return "";
  return raw.trim().replace(/^https?:\/\//i, "").replace(/\/+$/g, "");
}

const CATEGORY_COLORS: Record<string, string> = {
  PRODUCT: "blue",
  CONSULTANCY: "violet",
  AGENCY: "amber",
  STAFFING: "green",
  DIRECTORY: "cyan",
  OTHER: "gray",
  UNKNOWN: "gray",
};


function scoreColor(score?: number | null): "green" | "amber" | "red" | "gray" {
  if (score == null || !Number.isFinite(score)) return "gray";
  if (score >= 0.7) return "green";
  if (score >= 0.4) return "amber";
  return "red";
}

function SectionCard({
  title,
  children,
  right,
}: {
  title: string;
  children: React.ReactNode;
  right?: React.ReactNode;
}) {
  return (
    <Card>
      <Box p="4">
        <Flex align="center" justify="between" gap="3">
          <Text
            size="2"
            color="gray"
            weight="medium"
            style={{ letterSpacing: '0.1em' }}
          >
            {title.toUpperCase()}
          </Text>
          {right}
        </Flex>
        <Box mt="3">{children}</Box>
      </Box>
    </Card>
  );
}

function Chip({
  children,
  title,
  color = "gray",
  variant = "surface",
}: {
  children: React.ReactNode;
  title?: string;
  color?: React.ComponentProps<typeof Badge>["color"];
  variant?: React.ComponentProps<typeof Badge>["variant"];
}) {
  return (
    <Badge color={color} variant={variant} size="1" title={title}>
      <Text truncate>{children}</Text>
    </Badge>
  );
}

function CollapsibleChips({
  items,
  visibleCount = 8,
}: {
  items: string[];
  visibleCount?: number;
}) {
  const [expanded, setExpanded] = useState(false);

  const normalized = useMemo(
    () => items.map((x) => x.trim()).filter(Boolean),
    [items]
  );

  const canCollapse = normalized.length > visibleCount;
  const shown = expanded ? normalized : normalized.slice(0, visibleCount);

  return (
    <Box>
      <Flex gap="2" wrap="wrap">
        {shown.map((item) => (
          <Chip key={item} title={item}>
            {item}
          </Chip>
        ))}
      </Flex>

      {canCollapse && (
        <Box mt="3">
          <Button
            type="button"
            variant="ghost"
            color="gray"
            onClick={() => setExpanded((v) => !v)}
          >
            {expanded ? <ChevronUpIcon /> : <ChevronDownIcon />}
            {expanded ? "Show less" : `Show more (${normalized.length - visibleCount})`}
          </Button>
        </Box>
      )}
    </Box>
  );
}

function CollapsibleList({
  items,
  visibleCount = 7,
}: {
  items: string[];
  visibleCount?: number;
}) {
  const [expanded, setExpanded] = useState(false);

  const normalized = useMemo(
    () => items.map((x) => x.trim()).filter(Boolean),
    [items]
  );

  const canCollapse = normalized.length > visibleCount;
  const shown = expanded ? normalized : normalized.slice(0, visibleCount);

  return (
    <Box>
      <Flex direction="column" gap="2">
        {shown.map((item) => (
          <Flex key={item} align="start" gap="2">
            <Text color="gray" size="1" style={{ flexShrink: 0, marginTop: 2 }}>•</Text>
            <Text size="2" color="gray">
              {item}
            </Text>
          </Flex>
        ))}
      </Flex>

      {canCollapse && (
        <Box mt="3">
          <Button
            type="button"
            variant="ghost"
            color="gray"
            onClick={() => setExpanded((v) => !v)}
          >
            {expanded ? (
              <>
                <ChevronUpIcon /> Show less
              </>
            ) : (
              <>
                <ChevronDownIcon /> Show more ({normalized.length - visibleCount})
              </>
            )}
          </Button>
        </Box>
      )}
    </Box>
  );
}

function CompanyAvatar({
  name,
  logoUrl,
  size = "5",
}: {
  name: string;
  logoUrl?: string | null;
  size?: React.ComponentProps<typeof Avatar>["size"];
}) {
  const initials = name
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0] ?? "")
    .join("")
    .toUpperCase();

  return (
    <Avatar
      size={size}
      src={logoUrl ?? undefined}
      fallback={initials}
      radius="full"
      color="indigo"
      style={{ flexShrink: 0 }}
    />
  );
}

function formatScore(score?: number | null): string {
  if (typeof score !== "number" || !Number.isFinite(score)) return "—";
  return score.toFixed(2);
}

type KeyFactsCardProps = {
  linkedinUrl?: string | null;
  jobBoardUrl?: string | null;
  score?: number | null;
  isAdmin?: boolean;
  updatedAt?: string | null;
};

function KeyFactsCard({
  linkedinUrl,
  jobBoardUrl,
  score,
  isAdmin = false,
  updatedAt,
}: KeyFactsCardProps) {
  const linkedinHref = useMemo(
    () => coerceExternalUrl(linkedinUrl),
    [linkedinUrl]
  );
  const jobBoardHref = useMemo(
    () => coerceExternalUrl(jobBoardUrl),
    [jobBoardUrl]
  );

  const rows: Array<{
    label: string;
    value: React.ReactNode;
  }> = [
    {
      label: "LinkedIn",
      value: linkedinHref ? (
        <Flex display="inline-flex" align="center" gap="1" maxWidth="100%" overflow="hidden" asChild>
          <RadixLink
            href={linkedinHref}
            target="_blank"
            rel="noopener noreferrer"
            color="gray"
            title={linkedinHref}
          >
            <Text truncate>linkedin.com</Text>
            <ExternalLinkIcon />
          </RadixLink>
        </Flex>
      ) : (
        <Text size="2">—</Text>
      ),
    },
    {
      label: "Job board",
      value: jobBoardHref ? (
        <Flex display="inline-flex" align="center" gap="1" maxWidth="100%" overflow="hidden" asChild>
          <RadixLink
            href={jobBoardHref}
            target="_blank"
            rel="noopener noreferrer"
            color="gray"
            title={jobBoardHref}
          >
            <Text truncate>Jobs</Text>
            <ExternalLinkIcon />
          </RadixLink>
        </Flex>
      ) : (
        <Text size="2">—</Text>
      ),
    },
    ...(isAdmin
      ? [
          {
            label: "Crawl confidence",
            value: (
              <Text size="2">
                {formatScore(score)}
              </Text>
            ),
          },
        ]
      : []),
    ...(updatedAt
      ? [
          {
            label: "Updated",
            value: (
              <Text size="2">
                {new Date(updatedAt).toLocaleDateString("en-GB", {
                  day: "numeric",
                  month: "short",
                  year: "numeric",
                })}
              </Text>
            ),
          },
        ]
      : []),
  ];

  return (
    <Card>
      {/* tighter padding to reduce "empty space" */}
      <Box p="3">
        <Text
          size="1"
          color="gray"
          weight="medium"
          style={{ letterSpacing: "0.12em" }}
        >
          KEY FACTS
        </Text>

        <Box mt="3">
          {rows.map((row, idx) => (
            <Box key={row.label}>
              <Flex
                direction={{ initial: "column", sm: "row" }}
                align={{ initial: "start", sm: "center" }}
                justify="between"
                gap="1"
                minWidth="0"
                py="1"
              >
                <Text size="1" color="gray">
                  {row.label}
                </Text>

                {/* right-aligned value, ellipsis-safe */}
                <Box
                  minWidth="0"
                  maxWidth="100%"
                  style={{ textAlign: "right" }}
                >
                  {row.value}
                </Box>
              </Flex>

              {idx < rows.length - 1 ? (
                <Separator size="4" my="1" />
              ) : null}
            </Box>
          ))}
        </Box>
      </Box>
    </Card>
  );
}


const CATEGORY_OPTIONS: CompanyCategory[] = [
  "PRODUCT",
  "CONSULTANCY",
  "AGENCY",
  "STAFFING",
  "DIRECTORY",
  "OTHER",
  "UNKNOWN",
];

function LinkedInLeadDialog({
  companyId,
  companyName,
  onCreated,
}: {
  companyId: number;
  companyName: string;
  onCreated?: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [phase, setPhase] = useState<"paste" | "review">("paste");
  const [postUrl, setPostUrl] = useState("");
  const [rawText, setRawText] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [linkedinProfile, setLinkedinProfile] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [createContact, { loading: contactLoading }] =
    useCreateContactMutation();

  const saving = contactLoading;

  const handleExtract = () => {
    setError(null);
    const emailMatch = rawText.match(
      /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/
    );
    if (!emailMatch) {
      setError("No email address found in the pasted text.");
      return;
    }
    setEmail(emailMatch[0]);

    // Guess name from email local part
    const local = emailMatch[0].split("@")[0];
    const parts = local.split(/[._-]/).filter(Boolean);
    if (parts.length >= 2) {
      setFirstName(parts[0].charAt(0).toUpperCase() + parts[0].slice(1));
      setLastName(parts[1].charAt(0).toUpperCase() + parts[1].slice(1));
    } else if (parts.length === 1) {
      setFirstName(parts[0].charAt(0).toUpperCase() + parts[0].slice(1));
      setLastName("");
    }

    // Try to find a LinkedIn profile URL in the text
    const profileMatch = rawText.match(
      /https?:\/\/(?:www\.)?linkedin\.com\/in\/[a-zA-Z0-9\-_%]+\/?/
    );
    if (profileMatch) {
      setLinkedinProfile(profileMatch[0]);
    }

    setPhase("review");
  };

  const handleSave = async () => {
    setError(null);
    if (!firstName.trim()) {
      setError("First name is required.");
      return;
    }
    if (!email.trim()) {
      setError("Email is required.");
      return;
    }

    try {
      const contactResult = await createContact({
        variables: {
          input: {
            firstName: firstName.trim(),
            lastName: lastName.trim() || undefined,
            email: email.trim(),
            companyId,
            linkedinUrl: linkedinProfile.trim() || undefined,
            tags: ["linkedin-lead"],
          },
        },
      });

      const contactId = contactResult.data?.createContact?.id;

      setSuccess(
        `Contact created (ID ${contactId}).`
      );
      onCreated?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    }
  };

  const handleOpenChange = (nextOpen: boolean) => {
    setOpen(nextOpen);
    if (nextOpen) {
      setPhase("paste");
      setPostUrl("");
      setRawText("");
      setFirstName("");
      setLastName("");
      setEmail("");
      setLinkedinProfile("");
      setError(null);
      setSuccess(null);
    }
  };

  return (
    <Dialog.Root open={open} onOpenChange={handleOpenChange}>
      <Dialog.Trigger>
        <Button variant="ghost" color="gray">
          <Link2Icon />
          Import Lead
        </Button>
      </Dialog.Trigger>

      <Dialog.Content maxWidth="520px">
        <Dialog.Title>Import LinkedIn Lead</Dialog.Title>
        <Dialog.Description size="2" color="gray" mb="4">
          Paste a LinkedIn post to extract contact info for {companyName}.
        </Dialog.Description>

        {success ? (
          <Flex direction="column" gap="3">
            <Callout.Root color="green" size="1">
              <Callout.Icon>
                <CheckCircledIcon />
              </Callout.Icon>
              <Callout.Text>{success}</Callout.Text>
            </Callout.Root>
            <Flex justify="end">
              <Dialog.Close>
                <Button variant="ghost" color="gray">
                  Close
                </Button>
              </Dialog.Close>
            </Flex>
          </Flex>
        ) : phase === "paste" ? (
          <Flex direction="column" gap="3">
            {error && (
              <Callout.Root color="red" size="1">
                <Callout.Icon>
                  <InfoCircledIcon />
                </Callout.Icon>
                <Callout.Text>{error}</Callout.Text>
              </Callout.Root>
            )}

            <Flex direction="column" gap="1">
              <Text size="2" weight="medium">
                LinkedIn post URL
              </Text>
              <TextField.Root
                value={postUrl}
                onChange={(e) => setPostUrl(e.target.value)}
                placeholder="https://linkedin.com/feed/update/..."
              />
            </Flex>

            <Flex direction="column" gap="1">
              <Text size="2" weight="medium">
                Post text
              </Text>
              <TextArea
                value={rawText}
                onChange={(e) => setRawText(e.target.value)}
                placeholder="Paste the LinkedIn post text here..."
                rows={8}
              />
            </Flex>

            <Flex justify="end" gap="2">
              <Dialog.Close>
                <Button variant="ghost" color="gray">
                  Cancel
                </Button>
              </Dialog.Close>
              <Button
                variant="ghost"
                color="gray"
                onClick={handleExtract}
                disabled={!rawText.trim()}
              >
                Extract email
              </Button>
            </Flex>
          </Flex>
        ) : (
          <Flex direction="column" gap="3">
            {error && (
              <Callout.Root color="red" size="1">
                <Callout.Icon>
                  <InfoCircledIcon />
                </Callout.Icon>
                <Callout.Text>{error}</Callout.Text>
              </Callout.Root>
            )}

            <Flex gap="3">
              <Flex direction="column" gap="1" flexGrow="1">
                <Text size="2" weight="medium">
                  First name
                </Text>
                <TextField.Root
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                />
              </Flex>
              <Flex direction="column" gap="1" flexGrow="1">
                <Text size="2" weight="medium">
                  Last name
                </Text>
                <TextField.Root
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                />
              </Flex>
            </Flex>

            <Flex direction="column" gap="1">
              <Text size="2" weight="medium">
                Email
              </Text>
              <TextField.Root
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </Flex>

            <Flex direction="column" gap="1">
              <Text size="2" weight="medium">
                LinkedIn profile URL
              </Text>
              <TextField.Root
                value={linkedinProfile}
                onChange={(e) => setLinkedinProfile(e.target.value)}
                placeholder="https://linkedin.com/in/..."
              />
            </Flex>

            <Flex justify="end" gap="2">
              <Button
                variant="ghost"
                color="gray"
                onClick={() => setPhase("paste")}
              >
                Back
              </Button>
              <Button
                variant="ghost"
                color="gray"
                onClick={handleSave}
                disabled={saving}
              >
                {saving ? "Saving..." : "Create contact"}
              </Button>
            </Flex>
          </Flex>
        )}
      </Dialog.Content>
    </Dialog.Root>
  );
}

type EditDialogProps = {
  company: NonNullable<ReturnType<typeof useGetCompanyQuery>["data"]>["company"];
  onSaved: () => void;
};

function CompanyEditDialog({ company, onSaved }: EditDialogProps) {
  const [open, setOpen] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const [form, setForm] = useState({
    name: company?.name ?? "",
    website: company?.website ?? "",
    description: company?.description ?? "",
    logo_url: company?.logo_url ?? "",
    size: company?.size ?? "",
    linkedin_url: company?.linkedin_url ?? "",
    job_board_url: company?.job_board_url ?? "",
    category: (company?.category as CompanyCategory | null | undefined) ?? null,
    tags: (company?.tags ?? []).join(", "),
    services: (company?.services ?? []).join("\n"),
  });

  const [updateCompany, { loading }] = useUpdateCompanyMutation({
    onCompleted: () => {
      setSaveError(null);
      setOpen(false);
      onSaved();
    },
    onError: (err) => {
      setSaveError(err.message || "Save failed.");
    },
  });

  const handleOpen = () => {
    setForm({
      name: company?.name ?? "",
      website: company?.website ?? "",
      description: company?.description ?? "",
      logo_url: company?.logo_url ?? "",
      size: company?.size ?? "",
      linkedin_url: company?.linkedin_url ?? "",
      job_board_url: company?.job_board_url ?? "",
      category: (company?.category as CompanyCategory | null | undefined) ?? null,
      tags: (company?.tags ?? []).join(", "),
      services: (company?.services ?? []).join("\n"),
    });
    setSaveError(null);
    setOpen(true);
  };

  const handleSave = async () => {
    if (!company) return;
    const tags = form.tags
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    const services = form.services
      .split("\n")
      .map((s) => s.trim())
      .filter(Boolean);

    await updateCompany({
      variables: {
        id: company.id,
        input: {
          name: form.name || undefined,
          website: form.website || undefined,
          description: form.description || undefined,
          logo_url: form.logo_url || undefined,
          size: form.size || undefined,
          linkedin_url: form.linkedin_url || undefined,
          job_board_url: form.job_board_url || undefined,
          category: form.category ?? undefined,
          tags: tags.length > 0 ? tags : undefined,
          services: services.length > 0 ? services : undefined,
        },
      },
    });
  };

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Trigger>
        <Button variant="ghost" color="gray" onClick={handleOpen}>
          <Pencil1Icon />
          Edit
        </Button>
      </Dialog.Trigger>

      <Dialog.Content maxWidth="560px">
        <Dialog.Title>Edit company</Dialog.Title>
        <Dialog.Description size="2" color="gray" mb="4">
          Update company fields. Leave blank to keep existing value.
        </Dialog.Description>

        <Flex direction="column" gap="3">
          {saveError && (
            <Callout.Root color="red" size="1">
              <Callout.Icon>
                <InfoCircledIcon />
              </Callout.Icon>
              <Callout.Text>{saveError}</Callout.Text>
            </Callout.Root>
          )}

          <Flex direction="column" gap="1">
            <Text size="2" weight="medium">Name</Text>
            <TextField.Root
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              placeholder="Company name"
            />
          </Flex>

          <Flex direction="column" gap="1">
            <Text size="2" weight="medium">Website</Text>
            <TextField.Root
              value={form.website}
              onChange={(e) => setForm((f) => ({ ...f, website: e.target.value }))}
              placeholder="https://example.com"
            />
          </Flex>

          <Flex direction="column" gap="1">
            <Text size="2" weight="medium">Logo URL</Text>
            <TextField.Root
              value={form.logo_url}
              onChange={(e) => setForm((f) => ({ ...f, logo_url: e.target.value }))}
              placeholder="https://..."
            />
          </Flex>

          <Flex direction="column" gap="1">
            <Text size="2" weight="medium">Size</Text>
            <TextField.Root
              value={form.size}
              onChange={(e) => setForm((f) => ({ ...f, size: e.target.value }))}
              placeholder="e.g. 51-200"
            />
          </Flex>

          <Flex direction="column" gap="1">
            <Text size="2" weight="medium">LinkedIn URL</Text>
            <TextField.Root
              value={form.linkedin_url}
              onChange={(e) => setForm((f) => ({ ...f, linkedin_url: e.target.value }))}
              placeholder="https://linkedin.com/company/..."
            />
          </Flex>

          <Flex direction="column" gap="1">
            <Text size="2" weight="medium">Job board URL</Text>
            <TextField.Root
              value={form.job_board_url}
              onChange={(e) => setForm((f) => ({ ...f, job_board_url: e.target.value }))}
              placeholder="https://jobs.example.com/..."
            />
          </Flex>

          <Flex direction="column" gap="1">
            <Text size="2" weight="medium">Category</Text>
            <Select.Root
              value={form.category ?? "__none__"}
              onValueChange={(v) =>
                setForm((f) => ({ ...f, category: v === "__none__" ? null : (v as CompanyCategory) }))
              }
            >
              <Box width="100%"><Select.Trigger placeholder="Select…" /></Box>
              <Select.Content>
                <Select.Item value="__none__">— none —</Select.Item>
                {CATEGORY_OPTIONS.map((c) => (
                  <Select.Item key={c} value={c}>
                    {c}
                  </Select.Item>
                ))}
              </Select.Content>
            </Select.Root>
          </Flex>

          <Flex direction="column" gap="1">
            <Text size="2" weight="medium">Tags <Text size="1" color="gray">(comma-separated)</Text></Text>
            <TextField.Root
              value={form.tags}
              onChange={(e) => setForm((f) => ({ ...f, tags: e.target.value }))}
              placeholder="tag1, tag2, tag3"
            />
          </Flex>

          <Flex direction="column" gap="1">
            <Text size="2" weight="medium">Services <Text size="1" color="gray">(one per line)</Text></Text>
            <TextArea
              value={form.services}
              onChange={(e) => setForm((f) => ({ ...f, services: e.target.value }))}
              placeholder="Service A&#10;Service B"
              rows={4}
            />
          </Flex>

          <Flex direction="column" gap="1">
            <Text size="2" weight="medium">Description</Text>
            <TextArea
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              placeholder="Company description…"
              rows={4}
            />
          </Flex>
        </Flex>

        <Flex gap="3" mt="5" justify="end">
          <Dialog.Close>
            <Button variant="ghost" color="gray">
              Cancel
            </Button>
          </Dialog.Close>
          <Button
            variant="ghost"
            color="gray"
            onClick={handleSave}
            disabled={loading}
          >
            {loading ? "Saving…" : "Save"}
          </Button>
        </Flex>
      </Dialog.Content>
    </Dialog.Root>
  );
}

export function CompanyDetail({ companyKey, companyId }: Props) {
  const { user } = useAuth();
  const isAdmin = user?.email === ADMIN_EMAIL;
  const router = useRouter();

  const [enhanceError, setEnhanceError] = useState<string | null>(null);
  const [enhanceSuccess, setEnhanceSuccess] = useState<string | null>(null);

  const { loading, error, data, refetch } = useGetCompanyQuery({
    variables: companyId ? { id: companyId } : { key: companyKey },
    skip: !companyKey && !companyId,
    fetchPolicy: "cache-and-network",
  });

  const [enhanceCompany, { loading: isEnhancing }] = useEnhanceCompanyMutation({
    onCompleted: async () => {
      setEnhanceError(null);
      setEnhanceSuccess("Company enhanced successfully.");
      await refetch();
    },
    onError: (err) => {
      setEnhanceSuccess(null);
      setEnhanceError(err.message || "Enhancement failed.");
    },
  });

  const [deleteCompany, { loading: isDeleting }] = useDeleteCompanyMutation();

  const [blockCompany, { loading: isBlocking }] = useBlockCompanyMutation({
    onCompleted: () => refetch(),
  });
  const [unblockCompany, { loading: isUnblocking }] = useUnblockCompanyMutation({
    onCompleted: () => refetch(),
  });

  const [analyzeError, setAnalyzeError] = useState<string | null>(null);
  const [analyzeSuccess, setAnalyzeSuccess] = useState<string | null>(null);
  const [analyzeCompany, { loading: isAnalyzing }] = useAnalyzeCompanyMutation({
    onCompleted: async () => {
      setAnalyzeError(null);
      setAnalyzeSuccess("Deep analysis completed.");
      await refetch();
    },
    onError: (err) => {
      setAnalyzeSuccess(null);
      setAnalyzeError(err.message || "Analysis failed.");
    },
  });

  const [updateCompanyDirect] = useUpdateCompanyMutation();
  const [linkedInFetchError, setLinkedInFetchError] = useState<string | null>(null);
  const [linkedInFetchSuccess, setLinkedInFetchSuccess] = useState<string | null>(null);
  const [isLinkedInFetching, setIsLinkedInFetching] = useState(false);

  const company = data?.company ?? null;
  // When a numeric ID is passed, derive the slug from the loaded company record
  const effectiveKey = companyKey ?? company?.key;

  const handleDelete = useCallback(async () => {
    if (!company?.id) return;
    await deleteCompany({ variables: { id: company.id } });
    router.push("/companies");
  }, [company, deleteCompany, router]);

  const websiteHref = useMemo(
    () => coerceExternalUrl(company?.website),
    [company?.website]
  );
  const websiteLabel = useMemo(
    () => prettyUrl(company?.website),
    [company?.website]
  );

  const handleEnhance = useCallback(async () => {
    if (!company) return;

    setEnhanceError(null);
    setEnhanceSuccess(null);

    try {
      await enhanceCompany({
        variables: { id: company.id, key: company.key },
      });
    } catch (e) {
      console.error("Enhancement error:", e);
    }
  }, [company, enhanceCompany]);

  const handleAnalyze = useCallback(async () => {
    if (!company) return;
    setAnalyzeError(null);
    setAnalyzeSuccess(null);
    try {
      await analyzeCompany({
        variables: { id: company.id, key: company.key },
      });
    } catch (e) {
      console.error("Analysis error:", e);
    }
  }, [company, analyzeCompany]);

  const handleFetchLinkedIn = useCallback(async () => {
    if (!company?.linkedin_url) return;
    setIsLinkedInFetching(true);
    setLinkedInFetchError(null);
    setLinkedInFetchSuccess(null);
    try {
      const res = await fetch("/api/linkedin/extract", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: company.linkedin_url }),
      });
      const data = await res.json() as {
        urlType?: string;
        companyName?: string | null;
        tagline?: string | null;
        logoUrl?: string | null;
        extractionQuality?: string;
        reason?: string;
        error?: string;
      };
      if (!res.ok) {
        setLinkedInFetchError(data.error ?? "LinkedIn fetch failed");
        return;
      }
      if (data.extractionQuality === "failed") {
        setLinkedInFetchError(data.reason ?? "LinkedIn requires authentication");
        return;
      }
      const input: Record<string, string> = {};
      if (data.tagline) input.description = data.tagline;
      if (data.logoUrl) input.logo_url = data.logoUrl;
      if (Object.keys(input).length > 0) {
        await updateCompanyDirect({ variables: { id: company.id, input } });
        await refetch();
        setLinkedInFetchSuccess(`Updated: ${Object.keys(input).join(", ")}`);
      } else {
        setLinkedInFetchSuccess("LinkedIn returned no metadata (description/logo).");
      }
    } catch (err) {
      setLinkedInFetchError(err instanceof Error ? err.message : "Fetch failed");
    } finally {
      setIsLinkedInFetching(false);
    }
  }, [company, updateCompanyDirect, refetch]);

  const handleToggleBlock = useCallback(async () => {
    if (!company) return;
    if (company.blocked) {
      await unblockCompany({ variables: { id: company.id } });
    } else {
      await blockCompany({ variables: { id: company.id } });
    }
  }, [company, blockCompany, unblockCompany]);

  if (loading) {
    return (
      <Container size="3" p={{ initial: "4", md: "6" }}>
        <Flex direction="column" gap="4">
          <Flex gap="4" align="center">
            <Skeleton width="52px" height="52px" />
            <Flex direction="column" gap="2" flexGrow="1">
              <Skeleton height="28px" width="60%" />
              <Skeleton height="16px" width="40%" />
            </Flex>
          </Flex>
          <Skeleton height="120px" />
          <Skeleton height="80px" />
        </Flex>
      </Container>
    );
  }

  if (error) {
    return (
      <Container size="3" p={{ initial: "4", md: "6" }}>
        <Callout.Root color="red">
          <Callout.Icon>
            <InfoCircledIcon />
          </Callout.Icon>
          <Callout.Text>
            <Strong>Error loading company:</Strong> {error.message}
          </Callout.Text>
        </Callout.Root>
      </Container>
    );
  }

  if (!company) {
    return (
      <Container size="3" p={{ initial: "4", md: "6" }}>
        <Callout.Root>
          <Callout.Icon>
            <InfoCircledIcon />
          </Callout.Icon>
          <Callout.Text>Company not found.</Callout.Text>
        </Callout.Root>
      </Container>
    );
  }

  return (
    <Container size="3" p={{ initial: "4", md: "6" }}>
      <Flex direction="column" gap="5">
        {/* Alerts */}
        {enhanceError && (
          <Callout.Root color="red">
            <Callout.Icon>
              <InfoCircledIcon />
            </Callout.Icon>
            <Callout.Text>
              <Strong>Enhancement error:</Strong> {enhanceError}
            </Callout.Text>
          </Callout.Root>
        )}

        {enhanceSuccess && (
          <Callout.Root color="green">
            <Callout.Icon>
              <InfoCircledIcon />
            </Callout.Icon>
            <Callout.Text>{enhanceSuccess}</Callout.Text>
          </Callout.Root>
        )}

        {analyzeError && (
          <Callout.Root color="red">
            <Callout.Icon>
              <InfoCircledIcon />
            </Callout.Icon>
            <Callout.Text>
              <Strong>Analysis error:</Strong> {analyzeError}
            </Callout.Text>
          </Callout.Root>
        )}

        {analyzeSuccess && (
          <Callout.Root color="green">
            <Callout.Icon>
              <InfoCircledIcon />
            </Callout.Icon>
            <Callout.Text>{analyzeSuccess}</Callout.Text>
          </Callout.Root>
        )}

        {linkedInFetchError && (
          <Callout.Root color="red">
            <Callout.Icon>
              <InfoCircledIcon />
            </Callout.Icon>
            <Callout.Text>
              <Strong>LinkedIn fetch error:</Strong> {linkedInFetchError}
            </Callout.Text>
          </Callout.Root>
        )}

        {linkedInFetchSuccess && (
          <Callout.Root color="green">
            <Callout.Icon>
              <LinkedInLogoIcon />
            </Callout.Icon>
            <Callout.Text>{linkedInFetchSuccess}</Callout.Text>
          </Callout.Root>
        )}

        {/* Header */}
        <Card variant="surface">
          <Box p="5">
            <Flex
              direction={{ initial: "column", sm: "row" }}
              gap="4"
              align={{ initial: "start", sm: "center" }}
              justify="between"
            >
              <Flex gap="4" align="start" flexGrow="1" minWidth="0">
                <CompanyAvatar name={company.name} logoUrl={company.logo_url} size="6" />
                <Box flexGrow="1" minWidth="0">
                  <Heading size="6" style={{ lineHeight: 1.2, overflowWrap: 'break-word' }}>
                    {company.name}
                  </Heading>

                  <Flex align="center" gap="3" mt="2" wrap="wrap">
                    {websiteHref && (
                      <Flex align="center" gap="2" minWidth="0">
                        <GlobeIcon />
                        <Flex display="inline-flex" align="center" gap="1" minWidth="0" maxWidth="100%" overflow="hidden">
                          <RadixLink
                            href={websiteHref}
                            target="_blank"
                            rel="noopener noreferrer"
                            color="gray"
                            truncate
                            title={websiteHref}
                          >
                            {websiteLabel || websiteHref}
                          </RadixLink>
                          <ExternalLinkIcon />
                        </Flex>
                      </Flex>
                    )}

                    {company.linkedin_url && (
                      <Flex align="center" gap="2">
                        <Flex display="inline-flex" align="center" gap="1">
                          <RadixLink
                            href={coerceExternalUrl(company.linkedin_url) ?? ""}
                            target="_blank"
                            rel="noopener noreferrer"
                            color="gray"
                          >
                            <Text size="2">LinkedIn</Text>
                          </RadixLink>
                          <ExternalLinkIcon />
                        </Flex>
                      </Flex>
                    )}
                  </Flex>

                  <Flex gap="2" wrap="wrap" mt="3">
                    {company.category ? (
                      <Badge
                        color={(CATEGORY_COLORS[company.category] ?? "gray") as "blue" | "violet" | "amber" | "green" | "cyan" | "gray"}
                        variant="soft"
                        radius="full"
                      >
                        {company.category}
                      </Badge>
                    ) : null}
                    {company.size ? <Chip color="blue" variant="surface">{company.size}</Chip> : null}
                    {company.location ? <Chip color="gray" variant="surface">{company.location}</Chip> : null}
                    {company.score != null && (
                      <Badge
                        color={scoreColor(company.score)}
                        variant="soft"
                        radius="full"
                      >
                        ★ {company.score.toFixed(2)}
                      </Badge>
                    )}
                  </Flex>
                </Box>
              </Flex>

              <Flex
                gap="2"
                align="center"
                wrap="wrap"
                justify={{ initial: "start", sm: "end" }}
              >
                {isAdmin && company && (
                  <LinkedInLeadDialog
                    companyId={company.id}
                    companyName={company.name}
                    onCreated={refetch}
                  />
                )}
                {isAdmin && (
                  <CompanyEditDialog company={company} onSaved={refetch} />
                )}
                {isAdmin && (
                  <Button
                    variant="soft"
                    onClick={handleEnhance}
                    disabled={isEnhancing}
                  >
                    <MagicWandIcon />
                    {isEnhancing ? "Enhancing…" : "Enhance"}
                  </Button>
                )}
                {isAdmin && company.linkedin_url && (
                  <Button
                    variant="soft"
                    onClick={handleFetchLinkedIn}
                    disabled={isLinkedInFetching}
                  >
                    <LinkedInLogoIcon />
                    {isLinkedInFetching ? "Fetching…" : "Fetch LinkedIn"}
                  </Button>
                )}
                {isAdmin && company.website && (
                  <Button
                    variant="soft"
                    onClick={handleAnalyze}
                    disabled={isAnalyzing}
                  >
                    <MagicWandIcon />
                    {isAnalyzing ? "Analyzing…" : company.deep_analysis ? "Re-analyze" : "Deep Analysis"}
                  </Button>
                )}
                {isAdmin && (
                  <Button
                    variant={company?.blocked ? "solid" : "ghost"}
                    color={company?.blocked ? "red" : "gray"}
                    onClick={handleToggleBlock}
                    disabled={isBlocking || isUnblocking}
                  >
                    <CrossCircledIcon />
                    {isBlocking || isUnblocking ? "Updating…" : company?.blocked ? "Blocked" : "Block"}
                  </Button>
                )}
                {isAdmin && (
                  <AlertDialog.Root>
                    <AlertDialog.Trigger>
                      <Button variant="ghost" color="gray" disabled={isDeleting}>
                        <TrashIcon />
                        {isDeleting ? "Deleting…" : "Delete"}
                      </Button>
                    </AlertDialog.Trigger>
                    <AlertDialog.Content maxWidth="400px">
                      <AlertDialog.Title>Delete company</AlertDialog.Title>
                      <AlertDialog.Description size="2">
                        Are you sure you want to delete <Strong>{company.name}</Strong>? This action cannot be undone.
                      </AlertDialog.Description>
                      <Flex gap="3" mt="4" justify="end">
                        <AlertDialog.Cancel>
                          <Button variant="ghost" color="gray">Cancel</Button>
                        </AlertDialog.Cancel>
                        <AlertDialog.Action>
                          <Button variant="ghost" color="gray" onClick={handleDelete}>Delete</Button>
                        </AlertDialog.Action>
                      </Flex>
                    </AlertDialog.Content>
                  </AlertDialog.Root>
                )}
              </Flex>
            </Flex>
          </Box>
        </Card>

        {/* Tab nav */}
        <TabNav.Root>
          <TabNav.Link active>Overview</TabNav.Link>
          {isAdmin && (
            <TabNav.Link asChild>
              <Link href={`/companies/${effectiveKey}/contacts`}>Contacts</Link>
            </TabNav.Link>
          )}
          {isAdmin && (
            <TabNav.Link asChild>
              <Link href={`/companies/${effectiveKey}/emails`}>Emails</Link>
            </TabNav.Link>
          )}
        </TabNav.Root>

        <Box pt="4">
              <Flex direction="column" gap="5">
                {/* Balanced 2/3 + 1/3 layout */}
                <Flex
                  direction={{ initial: "column", md: "row" }}
                  gap="4"
                  align="start"
                >
                  <Box flexGrow="2" minWidth="0">
                    <Flex direction="column" gap="4">
                      {company.deep_analysis && (
                        <SectionCard title="Deep Analysis">
                          <Text size="2" as="div">
                            <ReactMarkdown
                              remarkPlugins={[remarkGfm]}
                              components={{
                                h1: ({ children }) => (
                                  <Heading as="h1" size="5" weight="bold" mt="4" mb="2">{children}</Heading>
                                ),
                                h2: ({ children }) => (
                                  <Heading as="h2" size="4" weight="bold" mt="3" mb="2">{children}</Heading>
                                ),
                                h3: ({ children }) => (
                                  <Heading as="h3" size="3" weight="bold" mt="3" mb="1">{children}</Heading>
                                ),
                                p: ({ children }) => (
                                  <Text as="p" size="2" color="gray" mb="3">{children}</Text>
                                ),
                                ul: ({ children }) => (
                                  <ul style={{ paddingLeft: '1.5em', marginBottom: '0.5em' }}>{children}</ul>
                                ),
                                ol: ({ children }) => (
                                  <ol style={{ paddingLeft: '1.5em', marginBottom: '0.5em' }}>{children}</ol>
                                ),
                                li: ({ children }) => (
                                  <li style={{ marginBottom: '0.25em' }}>{children}</li>
                                ),
                                strong: ({ children }) => (
                                  <Strong>{children}</Strong>
                                ),
                                em: ({ children }) => (
                                  <Em>{children}</Em>
                                ),
                                code: ({ children, className }) => {
                                  const isBlock = className?.includes('language-');
                                  return isBlock ? (
                                    <Code size="2" style={{ display: 'block', overflowX: 'auto', padding: '0.5em 0.75em' }}>{children}</Code>
                                  ) : (
                                    <Code size="2">{children}</Code>
                                  );
                                },
                                blockquote: ({ children }) => (
                                  <Blockquote>{children}</Blockquote>
                                ),
                                hr: () => (
                                  <Separator size="4" my="4" />
                                ),
                              }}
                            >
                              {company.deep_analysis}
                            </ReactMarkdown>
                          </Text>
                        </SectionCard>
                      )}

                      {company.description ? (
                        <SectionCard title="About">
                          <Text
                            as="p"
                            size="3"
                            color="gray"
                            style={{ whiteSpace: "pre-wrap" }}
                          >
                            {company.description}
                          </Text>
                        </SectionCard>
                      ) : null}

                      {company.services?.length ? (
                        <SectionCard title="Services">
                          <CollapsibleChips items={company.services} visibleCount={8} />
                        </SectionCard>
                      ) : null}

                    </Flex>
                  </Box>

                  <Box flexGrow="1" minWidth="0">
                    <Flex direction="column" gap="4">
                      <KeyFactsCard
                        linkedinUrl={company.linkedin_url}
                        jobBoardUrl={company.job_board_url}
                        score={company.score}
                        isAdmin={isAdmin}
                        updatedAt={company.updated_at}
                      />

                      {company.industries?.length ? (
                        <SectionCard title="Industries">
                          <CollapsibleChips
                            items={company.industries}
                            visibleCount={8}
                          />
                        </SectionCard>
                      ) : null}

                      {(() => {
                        const displayTags = (company.tags ?? []).filter((t: string) => !t.startsWith('leadgen-'));
                        return displayTags.length ? (
                          <SectionCard title="Tags">
                            <CollapsibleChips items={displayTags} visibleCount={10} />
                          </SectionCard>
                        ) : null;
                      })()}
                    </Flex>
                  </Box>
                </Flex>

                {/* Admin-only: Score breakdown */}
                {isAdmin && company.score_reasons?.length ? (
                  <SectionCard title="Score breakdown">
                    <Flex direction="column" gap="2">
                      {company.score_reasons.map((reason: string, idx: number) => (
                        <Box key={`${idx}-${reason}`} px="3" py="1" style={{ background: 'var(--gray-2)' }}><Text size="2" color="gray">{reason}</Text></Box>
                      ))}
                    </Flex>
                  </SectionCard>
                ) : null}
              </Flex>
            </Box>
      </Flex>
    </Container>
  );
}
