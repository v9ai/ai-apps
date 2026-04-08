"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import Link from "next/link";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import {
  useSearchCompaniesQuery,
  useDeleteCompanyMutation,
  useCreateCompanyMutation,
  useDeleteCompaniesMutation,
  useMergeDuplicateCompaniesMutation,
  useImportCompanyWithContactsMutation,
} from "@/__generated__/hooks";
import type { SearchCompaniesQuery, CompanyOrderBy, CompanyFilterInput, CompanyCategory } from "@/__generated__/graphql";
import { useAuth } from "@/lib/auth-hooks";
import { css, cx } from "styled-system/css";
import { flex } from "styled-system/patterns";
import { button } from "@/recipes/button";
import { input } from "@/recipes/input";
import { textarea } from "@/recipes/input";
import { select } from "@/recipes/select";
import { overlay, dialog, dialogFooter } from "@/recipes/modal";
import { IconButton } from "@/components/ui/IconButton";
import { Spinner } from "@/components/ui/Spinner";
import { Container } from "@/components/ui/Container";
import { TrashIcon, PlusIcon, MixIcon, UploadIcon } from "@radix-ui/react-icons";
import { ADMIN_EMAIL } from "@/lib/constants";

type Company = SearchCompaniesQuery["companies"]["companies"][number];

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

export function CompaniesList() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [searchTerm, setSearchTerm] = useState(searchParams.get("q") ?? "");
  const [category, setCategory] = useState(searchParams.get("cat") ?? "CONSULTANCY");
  const [sortBy, setSortBy] = useState(searchParams.get("sort") ?? "name");
  const [minTier, setMinTier] = useState(searchParams.get("tier") ?? "all");

  useEffect(() => {
    const params = new URLSearchParams();
    if (searchTerm) params.set("q", searchTerm);
    if (category !== "CONSULTANCY") params.set("cat", category);
    if (sortBy !== "name") params.set("sort", sortBy);
    if (minTier !== "all") params.set("tier", minTier);
    const qs = params.toString();
    router.replace(`${pathname}${qs ? `?${qs}` : ""}`, { scroll: false });
  }, [searchTerm, category, sortBy, minTier, router, pathname]); // eslint-disable-line react-hooks/exhaustive-deps
  const observerRef = useRef<IntersectionObserver | null>(null);
  const { user } = useAuth();
  const [deleteCompanyMutation] = useDeleteCompanyMutation();
  const [createCompanyMutation, { loading: creating }] = useCreateCompanyMutation();

  const [deleteCompaniesMutation, { loading: bulkDeleting }] = useDeleteCompaniesMutation();
  const [mergeDuplicateCompaniesMutation, { loading: merging }] = useMergeDuplicateCompaniesMutation();
  const [importCompanyWithContactsMutation, { loading: importing }] = useImportCompanyWithContactsMutation();

  // Multi-select state
  const [selectedCompanies, setSelectedCompanies] = useState<Set<number>>(new Set());

  // Add company dialog state
  const [addOpen, setAddOpen] = useState(false);
  const [addName, setAddName] = useState("");
  const [addWebsite, setAddWebsite] = useState("");
  const [addLinkedin, setAddLinkedin] = useState("");
  const [addError, setAddError] = useState("");

  // Import JSON dialog state
  const [importOpen, setImportOpen] = useState(false);
  const [importJson, setImportJson] = useState("");
  const [importError, setImportError] = useState("");

  // Check if current user is admin
  const isAdmin = user?.email === ADMIN_EMAIL;

  const handleAddCompany = async () => {
    setAddError("");
    const name = addName.trim();
    if (!name) {
      setAddError("Name is required");
      return;
    }
    const key = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
    try {
      await createCompanyMutation({
        variables: {
          input: {
            key,
            name,
            website: addWebsite.trim() || undefined,
            linkedin_url: addLinkedin.trim() || undefined,
          },
        },
        refetchQueries: ["SearchCompanies"],
        awaitRefetchQueries: true,
      });
      setAddOpen(false);
      setAddName("");
      setAddWebsite("");
      setAddLinkedin("");
      router.push(`/companies/${key}`);
    } catch (err) {
      setAddError(err instanceof Error ? err.message : "Failed to create company");
    }
  };

  // Handle delete company
  const handleDeleteCompany = async (
    companyId: number,
    e: React.MouseEvent,
  ) => {
    e.preventDefault();
    e.stopPropagation();

    try {
      await deleteCompanyMutation({
        variables: { id: companyId },
        refetchQueries: ["SearchCompanies"],
        awaitRefetchQueries: true,
      });
    } catch (error) {
      console.error("Error deleting company:", error);
    }
  };

  // Toggle company selection
  const toggleCompany = (id: number, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const next = new Set(selectedCompanies);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedCompanies(next);
  };

  // Bulk delete
  const handleBulkDelete = async () => {
    if (selectedCompanies.size === 0) return;
    try {
      await deleteCompaniesMutation({
        variables: { companyIds: Array.from(selectedCompanies) },
        refetchQueries: ["SearchCompanies"],
        awaitRefetchQueries: true,
      });
      setSelectedCompanies(new Set());
    } catch (err) {
      console.error("Error deleting companies:", err);
    }
  };

  // Merge selected
  const handleMergeSelected = async () => {
    if (selectedCompanies.size < 2) return;
    try {
      await mergeDuplicateCompaniesMutation({
        variables: { companyIds: Array.from(selectedCompanies) },
        refetchQueries: ["SearchCompanies"],
        awaitRefetchQueries: true,
      });
      setSelectedCompanies(new Set());
    } catch (err) {
      console.error("Error merging companies:", err);
    }
  };

  // Import JSON
  const handleImport = async () => {
    setImportError("");
    let parsed;
    try {
      parsed = JSON.parse(importJson);
    } catch {
      setImportError("Invalid JSON");
      return;
    }
    // Accept single object or array
    const items = Array.isArray(parsed) ? parsed : [parsed];
    try {
      for (const item of items) {
        await importCompanyWithContactsMutation({
          variables: {
            input: {
              name: item.name,
              website: item.website,
              linkedinUrl: item.linkedin_url || item.linkedinUrl,
              location: item.location,
              contacts: (item.contacts || []).map((c: Record<string, string>) => ({
                firstName: c.firstName || c.first_name,
                lastName: c.lastName || c.last_name,
                email: c.email,
                position: c.position,
                linkedinUrl: c.linkedinUrl || c.linkedin_url,
              })),
            },
          },
        });
      }
      await refetch();
      setImportOpen(false);
      setImportJson("");
    } catch (err) {
      setImportError(err instanceof Error ? err.message : "Import failed");
    }
  };

  const filter: CompanyFilterInput = {
    ...(searchTerm ? { text: searchTerm } : {}),
    ...(category !== "ALL" ? { category: category as CompanyCategory } : {}),
    ...(minTier !== "all" ? { min_ai_tier: parseInt(minTier, 10) } : {}),
  };
  const orderBy = (sortBy === "score" ? "SCORE_DESC" : "NAME_ASC") as CompanyOrderBy;

  const { loading, error, data, refetch, fetchMore } = useSearchCompaniesQuery({
    variables: {
      filter,
      order_by: orderBy,
      limit: 20,
      offset: 0,
    },
    pollInterval: 60000,
    notifyOnNetworkStatusChange: true,
  });

  const companies = data?.companies.companies || [];
  const totalCount = data?.companies.totalCount || 0;
  const hasMore = companies.length < totalCount;

  // Load more companies
  const loadMore = useCallback(async () => {
    if (!hasMore || loading) return;

    try {
      await fetchMore({
        variables: {
          offset: companies.length,
        },
        updateQuery: (prev, { fetchMoreResult }) => {
          if (!fetchMoreResult) return prev;
          return {
            companies: {
              ...fetchMoreResult.companies,
              companies: [
                ...prev.companies.companies,
                ...fetchMoreResult.companies.companies,
              ],
            },
          };
        },
      });
    } catch (err) {
      console.error("Error loading more companies:", err);
    }
  }, [hasMore, loading, companies.length, fetchMore]);

  // Ref callback for infinite scroll
  const loadMoreRefCallback = useCallback(
    (node: HTMLDivElement | null) => {
      if (observerRef.current) observerRef.current.disconnect();

      if (node && hasMore && !loading) {
        observerRef.current = new IntersectionObserver(
          (entries) => {
            if (entries[0].isIntersecting) {
              loadMore();
            }
          },
          { threshold: 0.1 },
        );
        observerRef.current.observe(node);
      }
    },
    [hasMore, loading, loadMore],
  );

  if (error) {
    return (
      <Container size="xl" className={css({ py: "8" })}>
        <span className={css({ fontSize: "sm", color: "rgba(229,72,77,0.9)" })}>Error loading companies: {error.message}</span>
        <button
          className={button({ variant: "solid", size: "sm" })}
          onClick={() => refetch()}
          style={{ marginTop: 12 }}
        >
          retry
        </button>
      </Container>
    );
  }

  return (
    <Container size="xl" className={css({ px: "8" })}>
      {/* header */}
      <div className={flex({ justify: "space-between", align: "center", py: "2", mb: "3" })}>
        <span className={css({ fontSize: "base" }) + " yc-row-title"}>
          companies
        </span>
        <div className={flex({ align: "center", gap: "3" })}>
          <span className="yc-row-meta">
            {companies.length}/{totalCount}
          </span>
          {isAdmin && (
            <>
              {/* Import JSON */}
              <IconButton
                size="sm"
                variant="ghost"
                label="Import JSON"
                onClick={() => setImportOpen(true)}
              >
                <UploadIcon width={14} height={14} />
              </IconButton>
              <Modal open={importOpen} onOpenChange={setImportOpen} maxWidth="500px">
                <h3 className={css({ fontSize: "lg", fontWeight: "bold", color: "ui.heading", mb: "2" })}>
                  Import companies (JSON)
                </h3>
                <div className={flex({ direction: "column", gap: "3", mt: "2" })}>
                  <span className={css({ fontSize: "xs", color: "ui.tertiary" })}>
                    Paste JSON array of companies. Each object: {"{"} name, website?, linkedin_url?, location?, contacts?: [{"{"} firstName, lastName, email?, position?, linkedinUrl? {"}"}] {"}"}
                  </span>
                  <textarea
                    className={textarea()}
                    placeholder='[{"name": "Acme Corp", "website": "https://acme.com", "contacts": [{"firstName": "Jane", "lastName": "Doe", "email": "jane@acme.com"}]}]'
                    value={importJson}
                    onChange={(e) => setImportJson(e.target.value)}
                    rows={8}
                    style={{ fontFamily: "monospace", fontSize: 12 }}
                  />
                  {importError && <span className={css({ fontSize: "xs", color: "rgba(229,72,77,0.9)" })}>{importError}</span>}
                  <div className={dialogFooter()}>
                    <button className={button({ variant: "ghost", size: "md" })} onClick={() => setImportOpen(false)}>cancel</button>
                    <button className={button({ variant: "solid", size: "md" })} onClick={handleImport} disabled={importing}>
                      {importing ? "importing..." : "import"}
                    </button>
                  </div>
                </div>
              </Modal>

              {/* Merge duplicates */}
              <IconButton
                size="sm"
                variant="ghost"
                label="Merge selected"
                disabled={selectedCompanies.size < 2 || merging}
                onClick={handleMergeSelected}
              >
                <MixIcon width={14} height={14} />
              </IconButton>

              {/* Add company */}
              <IconButton
                size="sm"
                variant="ghost"
                label="Add company"
                onClick={() => setAddOpen(true)}
              >
                <PlusIcon width={14} height={14} />
              </IconButton>
              <Modal open={addOpen} onOpenChange={setAddOpen} maxWidth="400px">
                <h3 className={css({ fontSize: "lg", fontWeight: "bold", color: "ui.heading", mb: "2" })}>
                  Add company
                </h3>
                <div className={flex({ direction: "column", gap: "3", mt: "2" })}>
                  <div>
                    <div className={css({ fontSize: "xs", color: "ui.tertiary", mb: "1" })}>name *</div>
                    <input
                      className={input()}
                      placeholder="Acme Corp"
                      value={addName}
                      onChange={(e) => setAddName(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && handleAddCompany()}
                    />
                  </div>
                  <div>
                    <div className={css({ fontSize: "xs", color: "ui.tertiary", mb: "1" })}>website</div>
                    <input
                      className={input()}
                      placeholder="https://acme.com"
                      value={addWebsite}
                      onChange={(e) => setAddWebsite(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && handleAddCompany()}
                    />
                  </div>
                  <div>
                    <div className={css({ fontSize: "xs", color: "ui.tertiary", mb: "1" })}>linkedin url</div>
                    <input
                      className={input()}
                      placeholder="https://linkedin.com/company/acme"
                      value={addLinkedin}
                      onChange={(e) => setAddLinkedin(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && handleAddCompany()}
                    />
                  </div>
                  {addError && <span className={css({ fontSize: "xs", color: "rgba(229,72,77,0.9)" })}>{addError}</span>}
                  <div className={dialogFooter()}>
                    <button className={button({ variant: "ghost", size: "md" })} onClick={() => setAddOpen(false)}>cancel</button>
                    <button className={button({ variant: "solid", size: "md" })} onClick={handleAddCompany} disabled={creating}>
                      {creating ? "adding..." : "add company"}
                    </button>
                  </div>
                </div>
              </Modal>
            </>
          )}
        </div>
      </div>

      {/* search */}
      <div className="yc-search" style={{ marginBottom: 8 }}>
        <input
          placeholder="search companies..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      {/* filter bar */}
      <div className={flex({ gap: "3", align: "center", mb: "2", wrap: "wrap" })}>
        <select
          className={select({ size: "sm" })}
          value={category}
          onChange={(e) => setCategory(e.target.value)}
        >
          <option value="ALL">All categories</option>
          <option value="CONSULTANCY">Consultancy</option>
        </select>

        <select
          className={select({ size: "sm" })}
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value)}
        >
          <option value="name">Sort: Name</option>
          <option value="score">Sort: Score</option>
        </select>

        <select
          className={select({ size: "sm" })}
          value={minTier}
          onChange={(e) => setMinTier(e.target.value)}
        >
          <option value="all">Any AI tier</option>
          <option value="1">AI tier 1+</option>
          <option value="2">AI tier 2</option>
        </select>

        {(category !== "CONSULTANCY" || minTier !== "all" || sortBy !== "name") && (
          <button
            className={button({ variant: "ghost", size: "sm" })}
            onClick={() => {
              setCategory("CONSULTANCY");
              setSortBy("name");
              setMinTier("all");
            }}
          >
            clear filters
          </button>
        )}
      </div>

      {/* bulk action bar */}
      {isAdmin && selectedCompanies.size > 0 && (
        <div
          className={flex({ align: "center", gap: "3", py: "2", px: "3", mb: "2" })}
          style={{
            background: "var(--colors-accent-subtle)",
            borderRadius: 0,
            border: "1px solid var(--colors-accent-border)",
          }}
        >
          <span className={css({ fontSize: "xs", fontWeight: "bold" })}>
            {selectedCompanies.size} selected
          </span>
          <button
            className={button({ variant: "solid", size: "sm" })}
            onClick={handleBulkDelete}
            disabled={bulkDeleting}
          >
            <TrashIcon width={12} height={12} />
            {bulkDeleting ? "deleting..." : "delete"}
          </button>
          {selectedCompanies.size >= 2 && (
            <button
              className={button({ variant: "ghost", size: "sm" })}
              onClick={handleMergeSelected}
              disabled={merging}
            >
              <MixIcon width={12} height={12} />
              {merging ? "merging..." : "merge"}
            </button>
          )}
          <button
            className={button({ variant: "ghost", size: "sm" })}
            onClick={() => setSelectedCompanies(new Set())}
          >
            clear
          </button>
        </div>
      )}

      {/* dense ruled list */}
      <div className={css({ borderTop: "1px solid", borderTopColor: "ui.border" })}>
        {companies.map((company) => (
          <Link
            key={company.id}
            href={`/companies/${company.key}`}
            target="_blank"
            rel="noopener noreferrer"
            className="yc-row"
          >
            {/* checkbox for multi-select */}
            {isAdmin && (
              <input
                type="checkbox"
                checked={selectedCompanies.has(company.id)}
                onChange={() => {
                  const next = new Set(selectedCompanies);
                  if (next.has(company.id)) next.delete(company.id);
                  else next.add(company.id);
                  setSelectedCompanies(next);
                }}
                onClick={(e) => e.stopPropagation()}
                className={css({ mr: "2", flexShrink: 0, cursor: "pointer", accentColor: "var(--colors-accent-primary)" })}
              />
            )}

            {/* logo thumbnail */}
            {company.logo_url && (
              <img
                src={company.logo_url}
                alt=""
                className={css({
                  width: "24px",
                  height: "24px",
                  objectFit: "contain",
                  mr: "10px",
                  borderRadius: "0",
                  flexShrink: 0,
                })}
              />
            )}

            {/* left: name + inline meta */}
            <div
              className={css({
                flex: 1,
                minWidth: 0,
                display: "flex",
                flexDirection: "column",
                gap: "2px",
              })}
            >
              <div className={css({ display: "flex", alignItems: "center", gap: "8px" })}>
                <span className="yc-row-title">{company.name}</span>
              </div>
              <span className="yc-row-meta">
                {company.key && <span>{company.key}</span>}
                {company.location && <span> · {company.location}</span>}
                {company.tags && company.tags.length > 0 && (
                  <span>
                    {" · "}
                    {company.tags.slice(0, 3).join(", ")}
                    {company.tags.length > 3 && ` +${company.tags.length - 3}`}
                  </span>
                )}
                {company.score > 0 && (
                  <span> · {company.score.toFixed(1)}</span>
                )}
                {company.category && company.category !== "UNKNOWN" && (
                  <span> · {company.category.toLowerCase()}</span>
                )}
              </span>
            </div>

            {/* right: website + admin */}
            <div
              className={css({
                display: "flex",
                alignItems: "center",
                gap: "6px",
                ml: "12px",
              })}
            >
              {company.website && (
                <span className={button({ variant: "ghost", size: "sm" })}>
                  website
                </span>
              )}
              {isAdmin && (
                <IconButton
                  size="sm"
                  variant="ghost"
                  label="Delete company"
                  onClick={(e) => handleDeleteCompany(company.id, e)}
                  className={css({ color: "rgba(229,72,77,0.9)", _hover: { color: "rgba(229,72,77,1)" } })}
                >
                  <TrashIcon width={12} height={12} />
                </IconButton>
              )}
            </div>
          </Link>
        ))}
      </div>

      {/* infinite scroll */}
      <div ref={loadMoreRefCallback} className={css({ py: "4" })}>
        {loading && (
          <div className={flex({ justify: "center", align: "center" })}>
            <Spinner size={20} />
          </div>
        )}
        {!loading && hasMore && (
          <div className={flex({ justify: "center" })}>
            <span className="yc-row-meta">scroll for more...</span>
          </div>
        )}
        {!loading && !hasMore && companies.length > 0 && (
          <div className={flex({ justify: "center" })}>
            <span className="yc-row-meta">all companies loaded</span>
          </div>
        )}
      </div>
    </Container>
  );
}
