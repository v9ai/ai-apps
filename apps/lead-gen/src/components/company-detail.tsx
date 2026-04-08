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
import { css, cx } from "styled-system/css";
import { flex } from "styled-system/patterns";
import { button } from "@/recipes/button";
import { input, textarea, fieldLabel } from "@/recipes/input";
import { select } from "@/recipes/select";
import { overlay, dialog } from "@/recipes/modal";
import { callout } from "@/recipes/callout";
import { tabList, tabTrigger } from "@/recipes/tabs";
import { markdown } from "@/recipes/markdown";
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

const CATEGORY_CSS: Record<string, { color: string; borderColor: string; bg: string }> = {
  PRODUCT: { color: "rgb(59, 130, 246)", borderColor: "rgba(59, 130, 246, 0.3)", bg: "rgba(59, 130, 246, 0.1)" },
  CONSULTANCY: { color: "rgb(139, 92, 246)", borderColor: "rgba(139, 92, 246, 0.3)", bg: "rgba(139, 92, 246, 0.1)" },
  AGENCY: { color: "rgb(245, 158, 11)", borderColor: "rgba(245, 158, 11, 0.3)", bg: "rgba(245, 158, 11, 0.1)" },
  STAFFING: { color: "rgb(34, 197, 94)", borderColor: "rgba(34, 197, 94, 0.3)", bg: "rgba(34, 197, 94, 0.1)" },
  DIRECTORY: { color: "rgb(6, 182, 212)", borderColor: "rgba(6, 182, 212, 0.3)", bg: "rgba(6, 182, 212, 0.1)" },
  OTHER: { color: "var(--gray-9)", borderColor: "var(--gray-6)", bg: "var(--gray-3)" },
  UNKNOWN: { color: "var(--gray-9)", borderColor: "var(--gray-6)", bg: "var(--gray-3)" },
};

const SCORE_CSS: Record<string, { color: string; borderColor: string; bg: string }> = {
  green: { color: "rgb(34, 197, 94)", borderColor: "rgba(34, 197, 94, 0.3)", bg: "rgba(34, 197, 94, 0.1)" },
  amber: { color: "rgb(245, 158, 11)", borderColor: "rgba(245, 158, 11, 0.3)", bg: "rgba(245, 158, 11, 0.1)" },
  red: { color: "rgb(239, 68, 68)", borderColor: "rgba(239, 68, 68, 0.3)", bg: "rgba(239, 68, 68, 0.1)" },
  gray: { color: "var(--gray-9)", borderColor: "var(--gray-6)", bg: "var(--gray-3)" },
};


function scoreColor(score?: number | null): "green" | "amber" | "red" | "gray" {
  if (score == null || !Number.isFinite(score)) return "gray";
  if (score >= 0.7) return "green";
  if (score >= 0.4) return "amber";
  return "red";
}

/* ------------------------------------------------------------------ */
/*  Lightweight modal wrapper (replaces Radix Dialog)                  */
/* ------------------------------------------------------------------ */
function Modal({
  open,
  onOpenChange,
  children,
  maxWidth = "560px",
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children: React.ReactNode;
  maxWidth?: string;
}) {
  if (!open) return null;
  return (
    <div className={overlay()} onClick={() => onOpenChange(false)}>
      <div
        className={dialog()}
        style={{ maxWidth }}
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </div>
    </div>
  );
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
    <div className={css({ bg: "ui.surface", border: "1px solid", borderColor: "ui.border", p: "4" })}>
      <div className={flex({ align: "center", justify: "space-between", gap: "3" })}>
        <span
          className={css({
            fontSize: "sm",
            color: "ui.tertiary",
            fontWeight: "medium",
            letterSpacing: "0.1em",
          })}
        >
          {title.toUpperCase()}
        </span>
        {right}
      </div>
      <div className={css({ mt: "3" })}>{children}</div>
    </div>
  );
}

function Chip({
  children,
  title,
}: {
  children: React.ReactNode;
  title?: string;
}) {
  return (
    <span
      className={css({
        display: "inline-flex",
        alignItems: "center",
        gap: "6px",
        border: "1px solid",
        borderColor: "ui.border",
        bg: "transparent",
        fontWeight: "medium",
        lineHeight: "none",
        whiteSpace: "nowrap",
        userSelect: "none",
        fontSize: "xs",
        px: "2",
        py: "1",
        color: "ui.secondary",
        overflow: "hidden",
        textOverflow: "ellipsis",
      })}
      title={title}
    >
      {children}
    </span>
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
    <div>
      <div className={flex({ gap: "2", wrap: "wrap" })}>
        {shown.map((item) => (
          <Chip key={item} title={item}>
            {item}
          </Chip>
        ))}
      </div>

      {canCollapse && (
        <div className={css({ mt: "3" })}>
          <button
            type="button"
            className={button({ variant: "ghost", size: "sm" })}
            onClick={() => setExpanded((v) => !v)}
          >
            {expanded ? <ChevronUpIcon /> : <ChevronDownIcon />}
            {expanded ? "Show less" : `Show more (${normalized.length - visibleCount})`}
          </button>
        </div>
      )}
    </div>
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
    <div>
      <div className={flex({ direction: "column", gap: "2" })}>
        {shown.map((item) => (
          <div key={item} className={flex({ align: "start", gap: "2" })}>
            <span className={css({ color: "ui.tertiary", fontSize: "xs", flexShrink: 0, mt: "2px" })}>•</span>
            <span className={css({ fontSize: "sm", color: "ui.tertiary" })}>
              {item}
            </span>
          </div>
        ))}
      </div>

      {canCollapse && (
        <div className={css({ mt: "3" })}>
          <button
            type="button"
            className={button({ variant: "ghost", size: "sm" })}
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
          </button>
        </div>
      )}
    </div>
  );
}

function CompanyAvatar({
  name,
  logoUrl,
  size = 48,
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
      <img
        src={logoUrl}
        alt={name}
        className={css({
          flexShrink: 0,
          borderRadius: "50%",
          objectFit: "cover",
        })}
        style={{ width: size, height: size }}
      />
    );
  }

  return (
    <div
      className={css({
        flexShrink: 0,
        borderRadius: "50%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        bg: "accent.subtle",
        color: "accent.primary",
        fontWeight: "bold",
        fontSize: "sm",
        userSelect: "none",
      })}
      style={{ width: size, height: size }}
    >
      {initials}
    </div>
  );
}

function formatScore(score?: number | null): string {
  if (typeof score !== "number" || !Number.isFinite(score)) return "\u2014";
  return score.toFixed(2);
}

function Skeleton({ width, height }: { width?: string; height?: string }) {
  return (
    <div
      className={css({
        bg: "ui.surfaceRaised",
        borderRadius: "0",
        animation: "toolbar-spin 1.5s ease-in-out infinite alternate",
      })}
      style={{ width: width ?? "100%", height: height ?? "16px" }}
    />
  );
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
        <a
          href={linkedinHref}
          target="_blank"
          rel="noopener noreferrer"
          title={linkedinHref}
          className={css({
            display: "inline-flex",
            alignItems: "center",
            gap: "1",
            maxWidth: "100%",
            overflow: "hidden",
            color: "ui.secondary",
            textDecoration: "none",
            _hover: { textDecoration: "underline" },
          })}
        >
          <span className={css({ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" })}>linkedin.com</span>
          <ExternalLinkIcon />
        </a>
      ) : (
        <span className={css({ fontSize: "sm" })}>{"\u2014"}</span>
      ),
    },
    {
      label: "Job board",
      value: jobBoardHref ? (
        <a
          href={jobBoardHref}
          target="_blank"
          rel="noopener noreferrer"
          title={jobBoardHref}
          className={css({
            display: "inline-flex",
            alignItems: "center",
            gap: "1",
            maxWidth: "100%",
            overflow: "hidden",
            color: "ui.secondary",
            textDecoration: "none",
            _hover: { textDecoration: "underline" },
          })}
        >
          <span className={css({ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" })}>Jobs</span>
          <ExternalLinkIcon />
        </a>
      ) : (
        <span className={css({ fontSize: "sm" })}>{"\u2014"}</span>
      ),
    },
    ...(isAdmin
      ? [
          {
            label: "Crawl confidence",
            value: (
              <span className={css({ fontSize: "sm" })}>
                {formatScore(score)}
              </span>
            ),
          },
        ]
      : []),
    ...(updatedAt
      ? [
          {
            label: "Updated",
            value: (
              <span className={css({ fontSize: "sm" })}>
                {new Date(updatedAt).toLocaleDateString("en-GB", {
                  day: "numeric",
                  month: "short",
                  year: "numeric",
                })}
              </span>
            ),
          },
        ]
      : []),
  ];

  return (
    <div className={css({ bg: "ui.surface", border: "1px solid", borderColor: "ui.border", p: "3" })}>
      <span
        className={css({
          fontSize: "xs",
          color: "ui.tertiary",
          fontWeight: "medium",
          letterSpacing: "0.12em",
        })}
      >
        KEY FACTS
      </span>

      <div className={css({ mt: "3" })}>
        {rows.map((row, idx) => (
          <div key={row.label}>
            <div
              className={css({
                display: "flex",
                flexDirection: { base: "column", sm: "row" },
                alignItems: { base: "start", sm: "center" },
                justifyContent: "space-between",
                gap: "1",
                minWidth: "0",
                py: "1",
              })}
            >
              <span className={css({ fontSize: "xs", color: "ui.tertiary" })}>
                {row.label}
              </span>

              {/* right-aligned value, ellipsis-safe */}
              <div
                className={css({
                  minWidth: "0",
                  maxWidth: "100%",
                  textAlign: "right",
                })}
              >
                {row.value}
              </div>
            </div>

            {idx < rows.length - 1 ? (
              <hr className={css({ border: "none", borderTop: "1px solid", borderTopColor: "ui.border", my: "1" })} />
            ) : null}
          </div>
        ))}
      </div>
    </div>
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
    <>
      <button
        className={button({ variant: "ghost", size: "sm" })}
        onClick={() => handleOpenChange(true)}
      >
        <Link2Icon />
        Import Lead
      </button>

      <Modal open={open} onOpenChange={handleOpenChange} maxWidth="520px">
        <h3 className={css({ fontSize: "lg", fontWeight: "bold", color: "ui.heading", mb: "1" })}>
          Import LinkedIn Lead
        </h3>
        <p className={css({ fontSize: "sm", color: "ui.tertiary", mb: "4" })}>
          Paste a LinkedIn post to extract contact info for {companyName}.
        </p>

        {success ? (
          <div className={flex({ direction: "column", gap: "3" })}>
            <div className={callout({ variant: "success" })}>
              <CheckCircledIcon />
              <span>{success}</span>
            </div>
            <div className={flex({ justify: "flex-end" })}>
              <button
                className={button({ variant: "ghost", size: "sm" })}
                onClick={() => handleOpenChange(false)}
              >
                Close
              </button>
            </div>
          </div>
        ) : phase === "paste" ? (
          <div className={flex({ direction: "column", gap: "3" })}>
            {error && (
              <div className={callout({ variant: "error" })}>
                <InfoCircledIcon />
                <span>{error}</span>
              </div>
            )}

            <div className={flex({ direction: "column", gap: "1" })}>
              <span className={css({ fontSize: "sm", fontWeight: "medium" })}>
                LinkedIn post URL
              </span>
              <input
                className={input()}
                value={postUrl}
                onChange={(e) => setPostUrl(e.target.value)}
                placeholder="https://linkedin.com/feed/update/..."
              />
            </div>

            <div className={flex({ direction: "column", gap: "1" })}>
              <span className={css({ fontSize: "sm", fontWeight: "medium" })}>
                Post text
              </span>
              <textarea
                className={textarea()}
                value={rawText}
                onChange={(e) => setRawText(e.target.value)}
                placeholder="Paste the LinkedIn post text here..."
                rows={8}
              />
            </div>

            <div className={flex({ justify: "flex-end", gap: "2" })}>
              <button
                className={button({ variant: "ghost", size: "sm" })}
                onClick={() => handleOpenChange(false)}
              >
                Cancel
              </button>
              <button
                className={button({ variant: "ghost", size: "sm" })}
                onClick={handleExtract}
                disabled={!rawText.trim()}
              >
                Extract email
              </button>
            </div>
          </div>
        ) : (
          <div className={flex({ direction: "column", gap: "3" })}>
            {error && (
              <div className={callout({ variant: "error" })}>
                <InfoCircledIcon />
                <span>{error}</span>
              </div>
            )}

            <div className={flex({ gap: "3" })}>
              <div className={css({ flex: 1, display: "flex", flexDirection: "column", gap: "1" })}>
                <span className={css({ fontSize: "sm", fontWeight: "medium" })}>
                  First name
                </span>
                <input
                  className={input()}
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                />
              </div>
              <div className={css({ flex: 1, display: "flex", flexDirection: "column", gap: "1" })}>
                <span className={css({ fontSize: "sm", fontWeight: "medium" })}>
                  Last name
                </span>
                <input
                  className={input()}
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                />
              </div>
            </div>

            <div className={flex({ direction: "column", gap: "1" })}>
              <span className={css({ fontSize: "sm", fontWeight: "medium" })}>
                Email
              </span>
              <input
                className={input()}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>

            <div className={flex({ direction: "column", gap: "1" })}>
              <span className={css({ fontSize: "sm", fontWeight: "medium" })}>
                LinkedIn profile URL
              </span>
              <input
                className={input()}
                value={linkedinProfile}
                onChange={(e) => setLinkedinProfile(e.target.value)}
                placeholder="https://linkedin.com/in/..."
              />
            </div>

            <div className={flex({ justify: "flex-end", gap: "2" })}>
              <button
                className={button({ variant: "ghost", size: "sm" })}
                onClick={() => setPhase("paste")}
              >
                Back
              </button>
              <button
                className={button({ variant: "ghost", size: "sm" })}
                onClick={handleSave}
                disabled={saving}
              >
                {saving ? "Saving..." : "Create contact"}
              </button>
            </div>
          </div>
        )}
      </Modal>
    </>
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
    <>
      <button
        className={button({ variant: "ghost", size: "sm" })}
        onClick={handleOpen}
      >
        <Pencil1Icon />
        Edit
      </button>

      <Modal open={open} onOpenChange={setOpen} maxWidth="560px">
        <h3 className={css({ fontSize: "lg", fontWeight: "bold", color: "ui.heading", mb: "1" })}>
          Edit company
        </h3>
        <p className={css({ fontSize: "sm", color: "ui.tertiary", mb: "4" })}>
          Update company fields. Leave blank to keep existing value.
        </p>

        <div className={flex({ direction: "column", gap: "3" })}>
          {saveError && (
            <div className={callout({ variant: "error" })}>
              <InfoCircledIcon />
              <span>{saveError}</span>
            </div>
          )}

          <div className={flex({ direction: "column", gap: "1" })}>
            <span className={css({ fontSize: "sm", fontWeight: "medium" })}>Name</span>
            <input
              className={input()}
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              placeholder="Company name"
            />
          </div>

          <div className={flex({ direction: "column", gap: "1" })}>
            <span className={css({ fontSize: "sm", fontWeight: "medium" })}>Website</span>
            <input
              className={input()}
              value={form.website}
              onChange={(e) => setForm((f) => ({ ...f, website: e.target.value }))}
              placeholder="https://example.com"
            />
          </div>

          <div className={flex({ direction: "column", gap: "1" })}>
            <span className={css({ fontSize: "sm", fontWeight: "medium" })}>Logo URL</span>
            <input
              className={input()}
              value={form.logo_url}
              onChange={(e) => setForm((f) => ({ ...f, logo_url: e.target.value }))}
              placeholder="https://..."
            />
          </div>

          <div className={flex({ direction: "column", gap: "1" })}>
            <span className={css({ fontSize: "sm", fontWeight: "medium" })}>Size</span>
            <input
              className={input()}
              value={form.size}
              onChange={(e) => setForm((f) => ({ ...f, size: e.target.value }))}
              placeholder="e.g. 51-200"
            />
          </div>

          <div className={flex({ direction: "column", gap: "1" })}>
            <span className={css({ fontSize: "sm", fontWeight: "medium" })}>LinkedIn URL</span>
            <input
              className={input()}
              value={form.linkedin_url}
              onChange={(e) => setForm((f) => ({ ...f, linkedin_url: e.target.value }))}
              placeholder="https://linkedin.com/company/..."
            />
          </div>

          <div className={flex({ direction: "column", gap: "1" })}>
            <span className={css({ fontSize: "sm", fontWeight: "medium" })}>Job board URL</span>
            <input
              className={input()}
              value={form.job_board_url}
              onChange={(e) => setForm((f) => ({ ...f, job_board_url: e.target.value }))}
              placeholder="https://jobs.example.com/..."
            />
          </div>

          <div className={flex({ direction: "column", gap: "1" })}>
            <span className={css({ fontSize: "sm", fontWeight: "medium" })}>Category</span>
            <select
              className={select()}
              value={form.category ?? "__none__"}
              onChange={(e) =>
                setForm((f) => ({ ...f, category: e.target.value === "__none__" ? null : (e.target.value as CompanyCategory) }))
              }
            >
              <option value="__none__">{"\u2014 none \u2014"}</option>
              {CATEGORY_OPTIONS.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>

          <div className={flex({ direction: "column", gap: "1" })}>
            <span className={css({ fontSize: "sm", fontWeight: "medium" })}>
              Tags <span className={css({ fontSize: "xs", color: "ui.tertiary" })}>(comma-separated)</span>
            </span>
            <input
              className={input()}
              value={form.tags}
              onChange={(e) => setForm((f) => ({ ...f, tags: e.target.value }))}
              placeholder="tag1, tag2, tag3"
            />
          </div>

          <div className={flex({ direction: "column", gap: "1" })}>
            <span className={css({ fontSize: "sm", fontWeight: "medium" })}>
              Services <span className={css({ fontSize: "xs", color: "ui.tertiary" })}>(one per line)</span>
            </span>
            <textarea
              className={textarea()}
              value={form.services}
              onChange={(e) => setForm((f) => ({ ...f, services: e.target.value }))}
              placeholder={"Service A\nService B"}
              rows={4}
            />
          </div>

          <div className={flex({ direction: "column", gap: "1" })}>
            <span className={css({ fontSize: "sm", fontWeight: "medium" })}>Description</span>
            <textarea
              className={textarea()}
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              placeholder="Company description..."
              rows={4}
            />
          </div>
        </div>

        <div className={flex({ gap: "3", mt: "5", justify: "flex-end" })}>
          <button
            className={button({ variant: "ghost", size: "sm" })}
            onClick={() => setOpen(false)}
          >
            Cancel
          </button>
          <button
            className={button({ variant: "ghost", size: "sm" })}
            onClick={handleSave}
            disabled={loading}
          >
            {loading ? "Saving\u2026" : "Save"}
          </button>
        </div>
      </Modal>
    </>
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
      const patchInput: Record<string, string> = {};
      if (data.tagline) patchInput.description = data.tagline;
      if (data.logoUrl) patchInput.logo_url = data.logoUrl;
      if (Object.keys(patchInput).length > 0) {
        await updateCompanyDirect({ variables: { id: company.id, input: patchInput } });
        await refetch();
        setLinkedInFetchSuccess(`Updated: ${Object.keys(patchInput).join(", ")}`);
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

  /* -- Delete confirmation state -- */
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);

  if (loading) {
    return (
      <div className={css({ maxWidth: "1200px", mx: "auto", px: { base: "4", md: "6" } })}>
        <div className={flex({ direction: "column", gap: "4" })}>
          <div className={flex({ gap: "4", align: "center" })}>
            <Skeleton width="52px" height="52px" />
            <div className={css({ flex: 1, display: "flex", flexDirection: "column", gap: "2" })}>
              <Skeleton height="28px" width="60%" />
              <Skeleton height="16px" width="40%" />
            </div>
          </div>
          <Skeleton height="120px" />
          <Skeleton height="80px" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={css({ maxWidth: "1200px", mx: "auto", px: { base: "4", md: "6" } })}>
        <div className={callout({ variant: "error" })}>
          <InfoCircledIcon />
          <span>
            <strong>Error loading company:</strong> {error.message}
          </span>
        </div>
      </div>
    );
  }

  if (!company) {
    return (
      <div className={css({ maxWidth: "1200px", mx: "auto", px: { base: "4", md: "6" } })}>
        <div className={callout({ variant: "info" })}>
          <InfoCircledIcon />
          <span>Company not found.</span>
        </div>
      </div>
    );
  }

  return (
    <div className={css({ maxWidth: "1200px", mx: "auto", px: { base: "4", md: "6" } })}>
      <div className={flex({ direction: "column", gap: "5" })}>
        {/* Alerts */}
        {enhanceError && (
          <div className={callout({ variant: "error" })}>
            <InfoCircledIcon />
            <span>
              <strong>Enhancement error:</strong> {enhanceError}
            </span>
          </div>
        )}

        {enhanceSuccess && (
          <div className={callout({ variant: "success" })}>
            <InfoCircledIcon />
            <span>{enhanceSuccess}</span>
          </div>
        )}

        {analyzeError && (
          <div className={callout({ variant: "error" })}>
            <InfoCircledIcon />
            <span>
              <strong>Analysis error:</strong> {analyzeError}
            </span>
          </div>
        )}

        {analyzeSuccess && (
          <div className={callout({ variant: "success" })}>
            <InfoCircledIcon />
            <span>{analyzeSuccess}</span>
          </div>
        )}

        {linkedInFetchError && (
          <div className={callout({ variant: "error" })}>
            <InfoCircledIcon />
            <span>
              <strong>LinkedIn fetch error:</strong> {linkedInFetchError}
            </span>
          </div>
        )}

        {linkedInFetchSuccess && (
          <div className={callout({ variant: "success" })}>
            <LinkedInLogoIcon />
            <span>{linkedInFetchSuccess}</span>
          </div>
        )}

        {/* Header */}
        <div className={css({ bg: "ui.surface", border: "1px solid", borderColor: "ui.border", p: "5" })}>
          <div
            className={css({
              display: "flex",
              flexDirection: { base: "column", sm: "row" },
              gap: "4",
              alignItems: { base: "start", sm: "center" },
              justifyContent: "space-between",
            })}
          >
            <div className={flex({ gap: "4", align: "start", flex: 1, minWidth: 0 })}>
              <CompanyAvatar name={company.name} logoUrl={company.logo_url} size={56} />
              <div className={css({ flex: 1, minWidth: 0 })}>
                <h1 className={css({ fontSize: "2xl", fontWeight: "bold", color: "ui.heading", lineHeight: "1.2", overflowWrap: "break-word" })}>
                  {company.name}
                </h1>

                <div className={flex({ align: "center", gap: "3", mt: "2", wrap: "wrap" })}>
                  {websiteHref && (
                    <div className={flex({ align: "center", gap: "2", minWidth: 0 })}>
                      <GlobeIcon />
                      <a
                        href={websiteHref}
                        target="_blank"
                        rel="noopener noreferrer"
                        title={websiteHref}
                        className={css({
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "1",
                          minWidth: 0,
                          maxWidth: "100%",
                          overflow: "hidden",
                          color: "ui.secondary",
                          textDecoration: "none",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                          _hover: { textDecoration: "underline" },
                        })}
                      >
                        {websiteLabel || websiteHref}
                        <ExternalLinkIcon />
                      </a>
                    </div>
                  )}

                  {company.linkedin_url && (
                    <div className={flex({ align: "center", gap: "2" })}>
                      <a
                        href={coerceExternalUrl(company.linkedin_url) ?? ""}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={css({
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "1",
                          color: "ui.secondary",
                          textDecoration: "none",
                          _hover: { textDecoration: "underline" },
                        })}
                      >
                        <span className={css({ fontSize: "sm" })}>LinkedIn</span>
                        <ExternalLinkIcon />
                      </a>
                    </div>
                  )}
                </div>

                <div className={flex({ gap: "2", wrap: "wrap", mt: "3" })}>
                  {company.category ? (
                    <span
                      className={css({
                        display: "inline-flex",
                        alignItems: "center",
                        fontSize: "xs",
                        fontWeight: "medium",
                        px: "2",
                        py: "1",
                        border: "1px solid",
                      })}
                      style={{
                        color: CATEGORY_CSS[company.category]?.color ?? "var(--gray-9)",
                        borderColor: CATEGORY_CSS[company.category]?.borderColor ?? "var(--gray-6)",
                        backgroundColor: CATEGORY_CSS[company.category]?.bg ?? "var(--gray-3)",
                      }}
                    >
                      {company.category}
                    </span>
                  ) : null}
                  {company.size ? <Chip>{company.size}</Chip> : null}
                  {company.location ? <Chip>{company.location}</Chip> : null}
                  {company.score != null && (() => {
                    const sc = scoreColor(company.score);
                    const scCss = SCORE_CSS[sc];
                    return (
                      <span
                        className={css({
                          display: "inline-flex",
                          alignItems: "center",
                          fontSize: "xs",
                          fontWeight: "medium",
                          px: "2",
                          py: "1",
                          border: "1px solid",
                        })}
                        style={{
                          color: scCss.color,
                          borderColor: scCss.borderColor,
                          backgroundColor: scCss.bg,
                        }}
                      >
                        {"\u2605"} {company.score.toFixed(2)}
                      </span>
                    );
                  })()}
                </div>
              </div>
            </div>

            <div
              className={css({
                display: "flex",
                gap: "2",
                alignItems: "center",
                flexWrap: "wrap",
                justifyContent: { base: "start", sm: "end" },
              })}
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
                <button
                  className={button({ variant: "ghost", size: "sm" })}
                  onClick={handleEnhance}
                  disabled={isEnhancing}
                >
                  <MagicWandIcon />
                  {isEnhancing ? "Enhancing\u2026" : "Enhance"}
                </button>
              )}
              {isAdmin && company.linkedin_url && (
                <button
                  className={button({ variant: "ghost", size: "sm" })}
                  onClick={handleFetchLinkedIn}
                  disabled={isLinkedInFetching}
                >
                  <LinkedInLogoIcon />
                  {isLinkedInFetching ? "Fetching\u2026" : "Fetch LinkedIn"}
                </button>
              )}
              {isAdmin && company.website && (
                <button
                  className={button({ variant: "ghost", size: "sm" })}
                  onClick={handleAnalyze}
                  disabled={isAnalyzing}
                >
                  <MagicWandIcon />
                  {isAnalyzing ? "Analyzing\u2026" : company.deep_analysis ? "Re-analyze" : "Deep Analysis"}
                </button>
              )}
              {isAdmin && (
                <button
                  className={cx(
                    button({ variant: company?.blocked ? "solid" : "ghost", size: "sm" }),
                    company?.blocked ? css({ bg: "rgba(229, 72, 77, 0.8)", _hover: { bg: "rgba(229, 72, 77, 1)" } }) : ""
                  )}
                  onClick={handleToggleBlock}
                  disabled={isBlocking || isUnblocking}
                >
                  <CrossCircledIcon />
                  {isBlocking || isUnblocking ? "Updating\u2026" : company?.blocked ? "Blocked" : "Block"}
                </button>
              )}
              {isAdmin && (
                <>
                  <button
                    className={button({ variant: "ghost", size: "sm" })}
                    disabled={isDeleting}
                    onClick={() => setDeleteConfirmOpen(true)}
                  >
                    <TrashIcon />
                    {isDeleting ? "Deleting\u2026" : "Delete"}
                  </button>
                  <Modal open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen} maxWidth="400px">
                    <h3 className={css({ fontSize: "lg", fontWeight: "bold", color: "ui.heading", mb: "1" })}>
                      Delete company
                    </h3>
                    <p className={css({ fontSize: "sm", color: "ui.secondary", mb: "4" })}>
                      Are you sure you want to delete <strong>{company.name}</strong>? This action cannot be undone.
                    </p>
                    <div className={flex({ gap: "3", justify: "flex-end" })}>
                      <button
                        className={button({ variant: "ghost", size: "sm" })}
                        onClick={() => setDeleteConfirmOpen(false)}
                      >
                        Cancel
                      </button>
                      <button
                        className={button({ variant: "ghost", size: "sm" })}
                        onClick={() => { setDeleteConfirmOpen(false); handleDelete(); }}
                      >
                        Delete
                      </button>
                    </div>
                  </Modal>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Tab nav */}
        <nav className={tabList()}>
          <span className={tabTrigger({ active: true })}>Overview</span>
          {isAdmin && (
            <Link
              href={`/companies/${effectiveKey}/contacts`}
              className={tabTrigger()}
            >
              Contacts
            </Link>
          )}
          {isAdmin && (
            <Link
              href={`/companies/${effectiveKey}/emails`}
              className={tabTrigger()}
            >
              Emails
            </Link>
          )}
        </nav>

        <div className={css({ pt: "4" })}>
              <div className={flex({ direction: "column", gap: "5" })}>
                {/* Balanced 2/3 + 1/3 layout */}
                <div
                  className={css({
                    display: "flex",
                    flexDirection: { base: "column", md: "row" },
                    gap: "4",
                    alignItems: "start",
                  })}
                >
                  <div className={css({ flex: 2, minWidth: 0 })}>
                    <div className={flex({ direction: "column", gap: "4" })}>
                      {company.deep_analysis && (
                        <SectionCard title="Deep Analysis">
                          <div className={markdown()}>
                            <ReactMarkdown remarkPlugins={[remarkGfm]}>
                              {company.deep_analysis}
                            </ReactMarkdown>
                          </div>
                        </SectionCard>
                      )}

                      {company.description ? (
                        <SectionCard title="About">
                          <p
                            className={css({
                              fontSize: "base",
                              color: "ui.tertiary",
                              whiteSpace: "pre-wrap",
                            })}
                          >
                            {company.description}
                          </p>
                        </SectionCard>
                      ) : null}

                      {company.services?.length ? (
                        <SectionCard title="Services">
                          <CollapsibleChips items={company.services} visibleCount={8} />
                        </SectionCard>
                      ) : null}

                    </div>
                  </div>

                  <div className={css({ flex: 1, minWidth: 0 })}>
                    <div className={flex({ direction: "column", gap: "4" })}>
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
                    </div>
                  </div>
                </div>

                {/* Admin-only: Score breakdown */}
                {isAdmin && company.score_reasons?.length ? (
                  <SectionCard title="Score breakdown">
                    <div className={flex({ direction: "column", gap: "2" })}>
                      {company.score_reasons.map((reason: string, idx: number) => (
                        <div key={`${idx}-${reason}`} className={css({ px: "3", py: "1", bg: "ui.surfaceRaised" })}>
                          <span className={css({ fontSize: "sm", color: "ui.tertiary" })}>{reason}</span>
                        </div>
                      ))}
                    </div>
                  </SectionCard>
                ) : null}
              </div>
            </div>
      </div>
    </div>
  );
}
