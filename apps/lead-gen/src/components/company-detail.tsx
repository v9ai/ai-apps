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
} from "@/__generated__/hooks";
import { useRouter } from "next/navigation";
import type { CompanyCategory } from "@/__generated__/graphql";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import Link from "next/link";
import { useAuth } from "@/lib/auth-hooks";
import { ADMIN_EMAIL } from "@/lib/constants";
import {
  AlertDialog,
  Badge,
  Box,
  Button,
  Callout,
  Card,
  Container,
  Dialog,
  Flex,
  Heading,
  Link as RadixLink,
  Select,
  Separator,
  Skeleton,
  Strong,
  Tabs,
  Text,
  TextArea,
  TextField,
} from "@radix-ui/themes";
import {
  CheckCircledIcon,
  ExternalLinkIcon,
  GlobeIcon,
  InfoCircledIcon,
  MagicWandIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  Link2Icon,
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
            style={{ fontWeight: 700, letterSpacing: '0.08em' }}
          >
            {title}
          </Text>
          {right}
        </Flex>
        <Box mt="3">{children}</Box>
      </Box>
    </Card>
  );
}

function Chip({ children, title }: { children: React.ReactNode; title?: string }) {
  return (
    <Badge
      color="gray"
      variant="surface"
      title={title}
      style={{
        maxWidth: "100%",
        overflow: "hidden",
        textOverflow: "ellipsis",
        whiteSpace: "nowrap",
      }}
    >
      {children}
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
            size="2"
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
          <Text key={item} size="2" color="gray">
            • {item}
          </Text>
        ))}
      </Flex>

      {canCollapse && (
        <Box mt="3">
          <Button
            type="button"
            size="2"
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
  size = 52,
}: {
  name: string;
  logoUrl?: string | null;
  size?: number;
}) {
  const initials = name
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0] ?? "")
    .join("")
    .toUpperCase();

  if (logoUrl) {
    return (
      <Box
        style={{
          width: size,
          height: size,
          borderRadius: "50%",
          overflow: "hidden",
          border: "1px solid var(--gray-4)",
          flexShrink: 0,
        }}
      >
        <img
          src={logoUrl}
          alt={name}
          style={{ width: "100%", height: "100%", objectFit: "cover" }}
        />
      </Box>
    );
  }

  return (
    <Flex
      align="center"
      justify="center"
      style={{
        width: size,
        height: size,
        borderRadius: "50%",
        background: "var(--accent-3)",
        border: "1px solid var(--accent-6)",
        flexShrink: 0,
      }}
    >
      <Text size="2" weight="bold" style={{ color: "var(--accent-11)" }}>
        {initials}
      </Text>
    </Flex>
  );
}

function formatScore(score?: number | null): string {
  if (typeof score !== "number" || !Number.isFinite(score)) return "—";
  return score.toFixed(2);
}

type KeyFactsCardProps = {
  linkedinUrl?: string | null;
  score?: number | null;
  careerPagesCount?: number | null;
  isAdmin?: boolean;
};

function KeyFactsCard({
  linkedinUrl,
  score,
  careerPagesCount,
  isAdmin = false,
}: KeyFactsCardProps) {
  const linkedinHref = useMemo(
    () => coerceExternalUrl(linkedinUrl),
    [linkedinUrl]
  );

  const rows: Array<{
    label: string;
    value: React.ReactNode;
  }> = [
    {
      label: "LinkedIn",
      value: linkedinHref ? (
        <RadixLink
          href={linkedinHref}
          target="_blank"
          rel="noopener noreferrer"
          color="gray"
          title={linkedinHref}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            maxWidth: "100%",
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          linkedin.com
          <ExternalLinkIcon />
        </RadixLink>
      ) : (
        <Text size="2">—</Text>
      ),
    },
    ...(isAdmin
      ? [
          {
            label: "Crawl confidence",
            value: (
              <Text size="2" style={{ fontVariantNumeric: "tabular-nums" }}>
                {formatScore(score)}
              </Text>
            ),
          },
        ]
      : []),
    {
      label: "Hiring platforms",
      value: (
        <Text size="2" style={{ fontVariantNumeric: "tabular-nums" }}>
          {typeof careerPagesCount === "number" && Number.isFinite(careerPagesCount)
            ? careerPagesCount
            : 0}
        </Text>
      ),
    },
  ];

  return (
    <Card>
      {/* tighter padding to reduce "empty space" */}
      <Box p="3">
        <Text
          size="1"
          color="gray"
          style={{
            fontWeight: 600,
            letterSpacing: "0.12em",
            textTransform: "uppercase",
          }}
        >
          Key facts
        </Text>

        <Box mt="3">
          {rows.map((row, idx) => (
            <Box key={row.label}>
              <Flex
                direction={{ initial: "column", sm: "row" }}
                align={{ initial: "start", sm: "center" }}
                justify="between"
                gap="1"
                style={{ minWidth: 0, padding: "6px 0" }}
              >
                <Text size="1" color="gray">
                  {row.label}
                </Text>

                {/* right-aligned value, ellipsis-safe */}
                <Box
                  style={{
                    minWidth: 0,
                    maxWidth: "100%",
                    textAlign: "right",
                  }}
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

const ATS_VENDOR_COLORS: Record<string, React.ComponentProps<typeof Badge>["color"]> = {
  GREENHOUSE: "green",
  LEVER: "blue",
  WORKABLE: "amber",
  TEAMTAILOR: "violet",
  ASHBY: "orange",
  WORKDAY: "cyan",
  ICIMS: "indigo",
  SMARTRECRUITERS: "teal",
};

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
        <Button size="2" variant="soft" color="blue">
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
                <Button variant="soft" color="gray">
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
                <Button variant="soft" color="gray">
                  Cancel
                </Button>
              </Dialog.Close>
              <Button
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
              <Flex direction="column" gap="1" style={{ flex: 1 }}>
                <Text size="2" weight="medium">
                  First name
                </Text>
                <TextField.Root
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                />
              </Flex>
              <Flex direction="column" gap="1" style={{ flex: 1 }}>
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
                variant="soft"
                color="gray"
                onClick={() => setPhase("paste")}
              >
                Back
              </Button>
              <Button onClick={handleSave} disabled={saving}>
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
    industry: company?.industry ?? "",
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
      industry: company?.industry ?? "",
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
          industry: form.industry || undefined,
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
        <Button size="2" variant="soft" color="gray" onClick={handleOpen}>
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

          <Flex gap="3">
            <Flex direction="column" gap="1" style={{ flex: 1 }}>
              <Text size="2" weight="medium">Size</Text>
              <TextField.Root
                value={form.size}
                onChange={(e) => setForm((f) => ({ ...f, size: e.target.value }))}
                placeholder="e.g. 51-200"
              />
            </Flex>
            <Flex direction="column" gap="1" style={{ flex: 1 }}>
              <Text size="2" weight="medium">Industry</Text>
              <TextField.Root
                value={form.industry}
                onChange={(e) => setForm((f) => ({ ...f, industry: e.target.value }))}
                placeholder="e.g. Software"
              />
            </Flex>
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
              placeholder="https://jobs.ashbyhq.com/..."
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
              <Select.Trigger placeholder="Select…" style={{ width: "100%" }} />
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
            <Button variant="soft" color="gray">
              Cancel
            </Button>
          </Dialog.Close>
          <Button onClick={handleSave} disabled={loading}>
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

  if (loading) {
    return (
      <Container size="3" p={{ initial: "4", md: "6" }}>
        <Text color="gray">Loading company details…</Text>
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

        {/* Header */}
        <Flex
          direction={{ initial: "column", sm: "row" }}
          gap="4"
          align={{ initial: "start", sm: "center" }}
          justify="between"
        >
          <Flex gap="4" align="start" style={{ flex: 1, minWidth: 0 }}>
            <CompanyAvatar name={company.name} logoUrl={company.logo_url} />
            <Box style={{ flex: 1, minWidth: 0 }}>
              <Heading size="8" style={{ lineHeight: 1.1 }}>
                {company.name}
              </Heading>

              <Flex align="center" gap="3" mt="2" wrap="wrap">
                {websiteHref && (
                  <Flex align="center" gap="2" style={{ minWidth: 0 }}>
                    <GlobeIcon />
                    <RadixLink
                      href={websiteHref}
                      target="_blank"
                      rel="noopener noreferrer"
                      color="gray"
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 6,
                        minWidth: 0,
                        maxWidth: "100%",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                      title={websiteHref}
                    >
                      {websiteLabel || websiteHref}
                      <ExternalLinkIcon />
                    </RadixLink>
                  </Flex>
                )}

                {company.linkedin_url && (
                  <Flex align="center" gap="2">
                    <RadixLink
                      href={coerceExternalUrl(company.linkedin_url) ?? ""}
                      target="_blank"
                      rel="noopener noreferrer"
                      color="gray"
                      style={{ display: "inline-flex", alignItems: "center", gap: 6 }}
                    >
                      <Text size="2">LinkedIn</Text>
                      <ExternalLinkIcon />
                    </RadixLink>
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
                {company.size ? <Chip>{company.size}</Chip> : null}
                {company.location ? <Chip>{company.location}</Chip> : null}
                {isAdmin && company.score != null && (
                  <Badge
                    color={scoreColor(company.score)}
                    variant="soft"
                    radius="full"
                    style={{ fontVariantNumeric: "tabular-nums" }}
                  >
                    ★ {company.score.toFixed(2)}
                  </Badge>
                )}
              </Flex>
            </Box>
          </Flex>

          <Flex gap="2" align="center">
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
                onClick={handleEnhance}
                disabled={isEnhancing}
                color="orange"
                variant="solid"
              >
                <MagicWandIcon />
                {isEnhancing ? "Enhancing…" : "Enhance"}
              </Button>
            )}
            {isAdmin && company.website && (
              <Button
                onClick={handleAnalyze}
                disabled={isAnalyzing}
                color="violet"
                variant="solid"
              >
                <MagicWandIcon />
                {isAnalyzing ? "Analyzing…" : company.deep_analysis ? "Re-analyze" : "Deep Analysis"}
              </Button>
            )}
            {isAdmin && (
              <Button
                onClick={handleDelete}
                disabled={isDeleting}
                color="red"
                variant="soft"
              >
                <TrashIcon />
                {isDeleting ? "Deleting…" : "Delete"}
              </Button>
            )}
          </Flex>
        </Flex>

        {/* Tabs */}
        <Tabs.Root
          defaultValue="overview"
          aria-label="Company sections"
        >
          <Tabs.List>
            <Tabs.Trigger value="overview">Overview</Tabs.Trigger>
            {isAdmin && (
              <Link href={`/companies/${effectiveKey}/contacts`} className="rt-reset rt-TabsTrigger" style={{ textDecoration: "none", display: "inline-flex", alignItems: "center", paddingLeft: "var(--tabs-trigger-padding-x)", paddingRight: "var(--tabs-trigger-padding-x)" }}>
                Contacts
              </Link>
            )}
            {isAdmin && (
              <Link href={`/companies/${effectiveKey}/emails`} className="rt-reset rt-TabsTrigger" style={{ textDecoration: "none", display: "inline-flex", alignItems: "center", paddingLeft: "var(--tabs-trigger-padding-x)", paddingRight: "var(--tabs-trigger-padding-x)" }}>
                Emails
              </Link>
            )}
          </Tabs.List>

          {/* Overview tab */}
          <Tabs.Content value="overview">
            <Box pt="4">
              <Flex direction="column" gap="5">
                {/* Balanced 2/3 + 1/3 layout */}
                <Flex
                  direction={{ initial: "column", md: "row" }}
                  gap="4"
                  align="start"
                >
                  <Box style={{ flex: 2, minWidth: 0 }}>
                    <Flex direction="column" gap="4">
                      {company.deep_analysis && (
                        <SectionCard title="Deep Analysis">
                          <Box
                            className="prose prose-sm prose-gray max-w-none"
                            style={{
                              lineHeight: 1.7,
                              fontSize: '0.9rem',
                            }}
                          >
                            <ReactMarkdown remarkPlugins={[remarkGfm]}>
                              {company.deep_analysis}
                            </ReactMarkdown>
                          </Box>
                        </SectionCard>
                      )}

                      {company.description ? (
                        <SectionCard title="About">
                          <Text
                            as="p"
                            size="3"
                            color="gray"
                            style={{ whiteSpace: "pre-wrap", lineHeight: 1.6 }}
                          >
                            {company.description}
                          </Text>
                        </SectionCard>
                      ) : null}

                      {company.services?.length ? (
                        <SectionCard title="Services">
                          <CollapsibleList items={company.services} visibleCount={7} />
                        </SectionCard>
                      ) : null}
                    </Flex>
                  </Box>

                  <Box style={{ flex: 1, minWidth: 0 }}>
                    <Flex direction="column" gap="4">
                      <KeyFactsCard
                        linkedinUrl={company.linkedin_url}
                        score={company.score}
                        careerPagesCount={company.ats_boards?.length ?? 0}
                        isAdmin={isAdmin}
                      />

                      {company.industries?.length ? (
                        <SectionCard title="Industries">
                          <CollapsibleChips
                            items={company.industries}
                            visibleCount={8}
                          />
                        </SectionCard>
                      ) : null}

                      {company.ashby_enrichment?.tech_signals?.length ? (
                        <SectionCard title="Tech stack">
                          <CollapsibleChips
                            items={company.ashby_enrichment.tech_signals}
                            visibleCount={10}
                          />
                        </SectionCard>
                      ) : null}

                      {company.tags?.length ? (
                        <SectionCard title="Tags">
                          <CollapsibleChips items={company.tags} visibleCount={10} />
                        </SectionCard>
                      ) : null}
                    </Flex>
                  </Box>
                </Flex>

                {/* Career pages */}
                {company.ats_boards?.length ? (
                  <SectionCard title={`Hiring platforms (${company.ats_boards.length})`}>
                    <Flex direction="column">
                      {company.ats_boards.map((board, idx) => {
                        const confidence =
                          typeof board.confidence === "number" &&
                          Number.isFinite(board.confidence)
                            ? Math.round(board.confidence * 100)
                            : null;
                        const boardHref = coerceExternalUrl(board.url) ?? board.url;
                        return (
                          <Box key={board.id}>
                            <Flex align="center" justify="between" gap="3" wrap="wrap">
                              <Flex gap="2" wrap="wrap" align="center">
                                <Chip>{board.vendor}</Chip>
                                <Chip>{board.board_type}</Chip>
                                {confidence !== null && isAdmin ? (
                                  <Badge color="gray" variant="outline">
                                    {confidence}% confidence
                                  </Badge>
                                ) : null}
                                {board.is_active ? (
                                  <Badge color="green" variant="soft">active</Badge>
                                ) : (
                                  <Badge color="gray" variant="soft">inactive</Badge>
                                )}
                              </Flex>
                              <RadixLink
                                href={boardHref}
                                target="_blank"
                                rel="noopener noreferrer"
                                color="gray"
                                style={{
                                  display: "inline-flex",
                                  alignItems: "center",
                                  gap: 6,
                                  maxWidth: "100%",
                                  overflow: "hidden",
                                  textOverflow: "ellipsis",
                                  whiteSpace: "nowrap",
                                }}
                                title={boardHref}
                              >
                                {prettyUrl(boardHref)}
                                <ExternalLinkIcon />
                              </RadixLink>
                            </Flex>
                            {idx < company.ats_boards.length - 1 ? (
                              <Separator size="4" my="3" />
                            ) : null}
                          </Box>
                        );
                      })}
                    </Flex>
                  </SectionCard>
                ) : null}

                {/* Admin-only: Ashby enrichment raw data */}
                {isAdmin && company.ashby_enrichment?.enriched_at ? (
                  <SectionCard title="Ashby Enrichment">
                    <Flex direction="column" gap="3">
                      <Flex gap="4" align="center" wrap="wrap">
                        {company.ashby_enrichment.company_name ? (
                          <Flex gap="2" align="center">
                            <Text size="2" color="gray">Company</Text>
                            <Text size="2" weight="medium">{company.ashby_enrichment.company_name}</Text>
                          </Flex>
                        ) : null}
                        {company.ashby_enrichment.size_signal ? (
                          <Flex gap="2" align="center">
                            <Text size="2" color="gray">Size signal</Text>
                            <Badge color="amber" variant="soft" radius="full">
                              {company.ashby_enrichment.size_signal}
                            </Badge>
                          </Flex>
                        ) : null}
                      </Flex>

                      {company.ashby_enrichment.industry_tags.length ? (
                        <Flex gap="2" wrap="wrap" align="center">
                          <Text size="2" color="gray" style={{ minWidth: 90 }}>Industries</Text>
                          {company.ashby_enrichment.industry_tags.map((tag) => (
                            <Badge key={tag} color="blue" variant="soft" radius="full">
                              {tag}
                            </Badge>
                          ))}
                        </Flex>
                      ) : null}

                      <Text size="1" color="gray">
                        Enriched {new Date(company.ashby_enrichment.enriched_at).toLocaleDateString()}
                      </Text>
                    </Flex>
                  </SectionCard>
                ) : null}

                {/* Admin-only: Score breakdown */}
                {isAdmin && company.score_reasons?.length ? (
                  <SectionCard title="Score breakdown">
                    <Flex direction="column" gap="2">
                      {company.score_reasons.map((reason: string, idx: number) => (
                        <Text key={`${idx}-${reason}`} size="2" color="gray">
                          • {reason}
                        </Text>
                      ))}
                    </Flex>
                  </SectionCard>
                ) : null}
              </Flex>
            </Box>
          </Tabs.Content>
        </Tabs.Root>
      </Flex>
    </Container>
  );
}
