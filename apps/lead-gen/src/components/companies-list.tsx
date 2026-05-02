"use client";

import { useState, useRef, useCallback, useEffect, useMemo } from "react";
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
import type { CompanyOrderBy, CompanyFilterInput, CompanyCategory } from "@/__generated__/graphql";
import { useAuth } from "@/lib/auth-hooks";
import {
  Box,
  Checkbox,
  Container,
  Text,
  Flex,
  Spinner,
  IconButton,
  Dialog,
  TextArea,
  TextField,
  Select,
  Tabs,
} from "@radix-ui/themes";
import { button } from "@/recipes/button";
import { css } from "styled-system/css";
import { TrashIcon, PlusIcon, MixIcon, UploadIcon, MagicWandIcon } from "@radix-ui/react-icons";
import { ADMIN_EMAIL } from "@/lib/constants";
import { US_EU_EEA_CODES } from "@/lib/country-codes";
import { SearchInput } from "@/components/ui/SearchInput";

export function CompaniesList() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [searchTerm, setSearchTerm] = useState(searchParams.get("q") ?? "");
  const [category] = useState("ALL");
  const [sortBy, setSortBy] = useState(searchParams.get("sort") ?? "name");
  const [minTier, setMinTier] = useState(searchParams.get("tier") ?? "all");
  const [tagFilter, setTagFilter] = useState(searchParams.get("tag") ?? "");
  const [activeTab, setActiveTab] = useState(searchParams.get("tab") ?? "all");

  useEffect(() => {
    const next = searchParams.get("tag") ?? "";
    // eslint-disable-next-line react-hooks/set-state-in-effect -- syncing external URL state to local
    setTagFilter((cur) => (cur === next ? cur : next));
  }, [searchParams]);

  useEffect(() => {
    const params = new URLSearchParams();
    if (searchTerm) params.set("q", searchTerm);
    if (category !== "ALL") params.set("cat", category);
    if (sortBy !== "name") params.set("sort", sortBy);
    if (minTier !== "all") params.set("tier", minTier);
    if (tagFilter) params.set("tag", tagFilter);
    if (activeTab !== "all") params.set("tab", activeTab);
    const qs = params.toString();
    router.replace(`${pathname}${qs ? `?${qs}` : ""}`, { scroll: false });
  }, [searchTerm, category, sortBy, minTier, tagFilter, activeTab, router, pathname]);
  const observerRef = useRef<IntersectionObserver | null>(null);
  const { user } = useAuth();
  const [deleteCompanyMutation] = useDeleteCompanyMutation();
  const [createCompanyMutation, { loading: creating }] = useCreateCompanyMutation();

  const [deleteCompaniesMutation, { loading: bulkDeleting }] = useDeleteCompaniesMutation();
  const [mergeDuplicateCompaniesMutation, { loading: merging }] = useMergeDuplicateCompaniesMutation();
  const [importCompanyWithContactsMutation, { loading: importing }] = useImportCompanyWithContactsMutation();

  // Multi-select state
  const [selectedCompanies, setSelectedCompanies] = useState<Set<number>>(new Set());

  // ── Chrome-extension full-company batch scrape ──
  type BatchScrapeStatus =
    | { type: "idle" }
    | {
        type: "running";
        idx: number;
        total: number;
        companyName: string;
        phaseMessage: string;
      }
    | {
        type: "done";
        total: number;
        succeeded: number;
        failed: number;
        cancelled: boolean;
        skipped: number;
      }
    | { type: "error"; message: string };
  const [batchScrape, setBatchScrape] = useState<BatchScrapeStatus>({ type: "idle" });
  const lastBatchMessageRef = useRef<number>(0);

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
              companyName: item.name,
              website: item.website,
              linkedinUrl: item.linkedin_url || item.linkedinUrl,
              contacts: (item.contacts || []).map((c: Record<string, string>) => ({
                name: [c.firstName || c.first_name, c.lastName || c.last_name]
                  .filter(Boolean)
                  .join(" ")
                  .trim(),
                linkedinUrl: c.linkedinUrl || c.linkedin_url,
                workEmail: c.email,
                headline: c.position,
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
    ...(tagFilter ? { tags_any: [tagFilter] } : {}),
    ...(activeTab === "sales-tech"
      ? {
          service_taxonomy_any: [
            "Sales Engagement Platform",
            "Lead Generation Software",
            "CRM Software",
          ],
          country_in: [...US_EU_EEA_CODES],
        }
      : {}),
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

  const companies = useMemo(
    () => data?.companies.companies ?? [],
    [data?.companies.companies],
  );
  const totalCount = data?.companies.totalCount || 0;
  const hasMore = companies.length < totalCount;

  // ── Trigger chrome-extension batch full-company scrape ──
  const startBatchScrape = useCallback(
    (queue: { companyId: number; name: string; linkedinUrl: string }[], skipped: number) => {
      if (queue.length === 0) {
        if (skipped > 0) {
          setBatchScrape({
            type: "error",
            message: `No companies have a LinkedIn URL (${skipped} skipped). Add LinkedIn URLs first.`,
          });
        }
        return;
      }
      lastBatchMessageRef.current = Date.now();
      setBatchScrape({
        type: "running",
        idx: 0,
        total: queue.length,
        companyName: queue[0].name,
        phaseMessage: "Sending to extension…",
      });
      window.postMessage(
        {
          source: "lead-gen-ext",
          action: "scrapeCompanyFullBatch",
          companies: queue,
        },
        "*",
      );
    },
    [],
  );

  const handleBulkScrape = useCallback(() => {
    const selected = companies.filter((c) => selectedCompanies.has(c.id));
    const queue: { companyId: number; name: string; linkedinUrl: string }[] = [];
    let skipped = 0;
    for (const c of selected) {
      if (c.linkedin_url) {
        queue.push({ companyId: c.id, name: c.name, linkedinUrl: c.linkedin_url });
      } else {
        skipped++;
      }
    }
    startBatchScrape(queue, skipped);
  }, [companies, selectedCompanies, startBatchScrape]);

  const handleSingleScrape = useCallback(
    (company: { id: number; name: string; linkedin_url?: string | null }) => {
      if (!company.linkedin_url) return;
      startBatchScrape(
        [{ companyId: company.id, name: company.name, linkedinUrl: company.linkedin_url }],
        0,
      );
    },
    [startBatchScrape],
  );

  const handleCancelBatch = useCallback(() => {
    window.postMessage(
      { source: "lead-gen-ext", action: "stopCompanyFullBatch" },
      "*",
    );
  }, []);

  // Listen for extension batch progress / completion messages
  useEffect(() => {
    const handler = (e: MessageEvent) => {
      if (e.data?.source !== "lead-gen-bg") return;
      lastBatchMessageRef.current = Date.now();
      if (e.data.action === "companyBatchProgress") {
        setBatchScrape({
          type: "running",
          idx: e.data.idx,
          total: e.data.total,
          companyName: e.data.companyName,
          phaseMessage: e.data.phaseMessage,
        });
      } else if (e.data.action === "companyBatchComplete") {
        setBatchScrape({
          type: "done",
          total: e.data.total,
          succeeded: e.data.succeeded,
          failed: e.data.failed,
          cancelled: !!e.data.cancelled,
          skipped: 0,
        });
        void refetch();
      }
    };
    window.addEventListener("message", handler);
    return () => window.removeEventListener("message", handler);
  }, [refetch]);

  // Stale-detection: if no extension message arrives for 4 minutes while
  // running, assume the service worker died and surface an error.
  useEffect(() => {
    if (batchScrape.type !== "running") return;
    const id = setInterval(() => {
      if (Date.now() - lastBatchMessageRef.current > 240_000) {
        setBatchScrape({
          type: "error",
          message: "Batch scrape timed out — extension may have stopped. Try again.",
        });
      }
    }, 15_000);
    return () => clearInterval(id);
  }, [batchScrape.type]);

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
      <Container size="4" p="8">
        <Text color="red">Error loading companies: {error.message}</Text>
        <button
          className={`${button({ variant: "solid", size: "sm" })} ${css({ mt: "3" })}`}
          onClick={() => refetch()}
        >
          retry
        </button>
      </Container>
    );
  }

  return (
    <Container size="4" px="8">
      {/* header */}
      <Flex justify="between" align="center" py="2" mb="3">
        <span className={`yc-row-title ${css({ fontSize: "base" })}`}>
          companies
        </span>
        <Flex align="center" gap="3">
          <span className="yc-row-meta">
            {companies.length}/{totalCount}
          </span>
          {isAdmin && (
            <>
              {/* Import JSON */}
              <Dialog.Root open={importOpen} onOpenChange={setImportOpen}>
                <Dialog.Trigger>
                  <IconButton size="1" variant="ghost" style={{ cursor: "pointer" }}>
                    <UploadIcon width={14} height={14} />
                  </IconButton>
                </Dialog.Trigger>
                <Dialog.Content maxWidth="500px">
                  <Dialog.Title>Import companies (JSON)</Dialog.Title>
                  <Flex direction="column" gap="3" mt="2">
                    <Text size="1" color="gray">
                      Paste JSON array of companies. Each object: {"{"} name, website?, linkedin_url?, location?, contacts?: [{"{"} firstName, lastName, email?, position?, linkedinUrl? {"}"}] {"}"}
                    </Text>
                    <TextArea
                      placeholder='[{"name": "Acme Corp", "website": "https://acme.com", "contacts": [{"firstName": "Jane", "lastName": "Doe", "email": "jane@acme.com"}]}]'
                      value={importJson}
                      onChange={(e) => setImportJson(e.target.value)}
                      rows={8}
                      style={{ fontFamily: "monospace", fontSize: 12 }}
                    />
                    {importError && <Text size="1" color="red">{importError}</Text>}
                    <Flex gap="2" justify="end" mt="1">
                      <Dialog.Close>
                        <button className={button({ variant: "ghost", size: "md" })}>cancel</button>
                      </Dialog.Close>
                      <button className={button({ variant: "solid", size: "md" })} onClick={handleImport} disabled={importing}>
                        {importing ? "importing…" : "import"}
                      </button>
                    </Flex>
                  </Flex>
                </Dialog.Content>
              </Dialog.Root>

              {/* Merge duplicates */}
              <IconButton
                size="1"
                variant="ghost"
                style={{ cursor: "pointer" }}
                disabled={selectedCompanies.size < 2 || merging}
                onClick={handleMergeSelected}
                title="Merge selected"
              >
                <MixIcon width={14} height={14} />
              </IconButton>

              {/* Add company */}
              <Dialog.Root open={addOpen} onOpenChange={setAddOpen}>
                <Dialog.Trigger>
                  <IconButton size="1" variant="ghost" style={{ cursor: "pointer" }}>
                    <PlusIcon width={14} height={14} />
                  </IconButton>
                </Dialog.Trigger>
                <Dialog.Content maxWidth="400px">
                  <Dialog.Title>Add company</Dialog.Title>
                  <Flex direction="column" gap="3" mt="2">
                    <Box>
                      <Text size="1" color="gray" mb="1" as="div">name *</Text>
                      <TextField.Root
                        placeholder="Acme Corp"
                        value={addName}
                        onChange={(e) => setAddName(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && handleAddCompany()}
                      />
                    </Box>
                    <Box>
                      <Text size="1" color="gray" mb="1" as="div">website</Text>
                      <TextField.Root
                        placeholder="https://acme.com"
                        value={addWebsite}
                        onChange={(e) => setAddWebsite(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && handleAddCompany()}
                      />
                    </Box>
                    <Box>
                      <Text size="1" color="gray" mb="1" as="div">linkedin url</Text>
                      <TextField.Root
                        placeholder="https://linkedin.com/company/acme"
                        value={addLinkedin}
                        onChange={(e) => setAddLinkedin(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && handleAddCompany()}
                      />
                    </Box>
                    {addError && <Text size="1" color="red">{addError}</Text>}
                    <Flex gap="2" justify="end" mt="1">
                      <Dialog.Close>
                        <button className={button({ variant: "ghost", size: "md" })}>cancel</button>
                      </Dialog.Close>
                      <button className={button({ variant: "solid", size: "md" })} onClick={handleAddCompany} disabled={creating}>
                        {creating ? "adding…" : "add company"}
                      </button>
                    </Flex>
                  </Flex>
                </Dialog.Content>
              </Dialog.Root>
            </>
          )}
        </Flex>
      </Flex>

      {/* tabs */}
      <Tabs.Root value={activeTab} onValueChange={setActiveTab}>
        <Tabs.List mb="3">
          <Tabs.Trigger value="all">All</Tabs.Trigger>
          <Tabs.Trigger value="sales-tech">Sales Tech</Tabs.Trigger>
        </Tabs.List>
      </Tabs.Root>

      {/* search */}
      <Box mb="2">
        <SearchInput
          placeholder="search companies…"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </Box>

      {/* filter bar */}
      <Flex gap="3" align="center" mb="2" wrap="wrap">
        <Select.Root value={sortBy} onValueChange={setSortBy} size="1">
          <Select.Trigger variant="ghost" style={{ fontSize: 12 }} />
          <Select.Content>
            <Select.Item value="name">Sort: Name</Select.Item>
            <Select.Item value="score">Sort: Score</Select.Item>
          </Select.Content>
        </Select.Root>

        <Select.Root value={minTier} onValueChange={setMinTier} size="1">
          <Select.Trigger variant="ghost" style={{ fontSize: 12 }} />
          <Select.Content>
            <Select.Item value="all">Any AI tier</Select.Item>
            <Select.Item value="1">AI tier 1+</Select.Item>
            <Select.Item value="2">AI tier 2</Select.Item>
          </Select.Content>
        </Select.Root>

        {tagFilter && (
          <Flex
            align="center"
            gap="1"
            px="2"
            py="1"
            className={css({
              bg: "gray.3",
              borderRadius: "full",
              fontSize: "xs",
              border: "1px solid",
              borderColor: "gray.6",
            })}
          >
            <Text size="1">tag: {tagFilter}</Text>
            <button
              className={`${button({ variant: "ghost", size: "sm" })} ${css({ px: "1", py: "0", fontSize: "sm", lineHeight: "none" })}`}
              onClick={() => setTagFilter("")}
              aria-label="clear tag filter"
            >
              ×
            </button>
          </Flex>
        )}

        {(minTier !== "all" || sortBy !== "name" || tagFilter) && (
          <button
            className={button({ variant: "ghost", size: "sm" })}
            onClick={() => {
              setSortBy("name");
              setMinTier("all");
              setTagFilter("");
            }}
          >
            clear filters
          </button>
        )}
      </Flex>

      {/* bulk action bar */}
      {isAdmin && selectedCompanies.size > 0 && (
        <Flex
          align="center"
          gap="3"
          py="2"
          px="3"
          mb="2"
          className={css({
            bg: "accent.2",
            borderRadius: "md",
            border: "1px solid",
            borderColor: "accent.6",
          })}
        >
          <Text size="1" weight="bold">
            {selectedCompanies.size} selected
          </Text>
          <button
            className={button({ variant: "solid", size: "sm" })}
            onClick={handleBulkDelete}
            disabled={bulkDeleting}
          >
            <TrashIcon width={12} height={12} />
            {bulkDeleting ? "deleting…" : "delete"}
          </button>
          {selectedCompanies.size >= 2 && (
            <button
              className={button({ variant: "ghost", size: "sm" })}
              onClick={handleMergeSelected}
              disabled={merging}
            >
              <MixIcon width={12} height={12} />
              {merging ? "merging…" : "merge"}
            </button>
          )}
          <button
            className={button({ variant: "ghost", size: "sm" })}
            onClick={handleBulkScrape}
            disabled={batchScrape.type === "running"}
            title="Open each selected company's LinkedIn page in a background tab and scrape About + Posts + Jobs + People via the chrome extension."
          >
            <MagicWandIcon width={12} height={12} />
            scrape full ({selectedCompanies.size})
          </button>
          <button
            className={button({ variant: "ghost", size: "sm" })}
            onClick={() => setSelectedCompanies(new Set())}
          >
            clear
          </button>
        </Flex>
      )}

      {/* batch-scrape progress strip */}
      {(batchScrape.type === "running" ||
        batchScrape.type === "done" ||
        batchScrape.type === "error") && (
        <Flex
          align="center"
          gap="3"
          py="2"
          px="3"
          mb="2"
          className={css({
            bg: batchScrape.type === "error" ? "red.2" : "gray.2",
            borderRadius: "md",
            border: "1px solid",
            borderColor: batchScrape.type === "error" ? "red.6" : "gray.6",
          })}
        >
          {batchScrape.type === "running" && (
            <>
              <Spinner size="1" />
              <Text size="1" weight="bold">
                Scraping {batchScrape.idx}/{batchScrape.total}
              </Text>
              <Text size="1" color="gray">
                · {batchScrape.companyName} · {batchScrape.phaseMessage}
              </Text>
              <Box flexGrow="1" />
              <button
                className={button({ variant: "ghost", size: "sm" })}
                onClick={handleCancelBatch}
              >
                cancel
              </button>
            </>
          )}
          {batchScrape.type === "done" && (
            <>
              <Text size="1" weight="bold">
                {batchScrape.cancelled ? "Cancelled" : "Done"} ·{" "}
                {batchScrape.succeeded} succeeded
                {batchScrape.failed > 0 && `, ${batchScrape.failed} failed`}
              </Text>
              <Box flexGrow="1" />
              <button
                className={button({ variant: "ghost", size: "sm" })}
                onClick={() => setBatchScrape({ type: "idle" })}
              >
                dismiss
              </button>
            </>
          )}
          {batchScrape.type === "error" && (
            <>
              <Text size="1" color="red">
                {batchScrape.message}
              </Text>
              <Box flexGrow="1" />
              <button
                className={button({ variant: "ghost", size: "sm" })}
                onClick={() => setBatchScrape({ type: "idle" })}
              >
                dismiss
              </button>
            </>
          )}
        </Flex>
      )}

      {/* dense ruled list */}
      <div className={css({ borderTop: "1px solid", borderColor: "gray.6" })}>
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
              <Checkbox
                checked={selectedCompanies.has(company.id)}
                onCheckedChange={() => {
                  const next = new Set(selectedCompanies);
                  if (next.has(company.id)) next.delete(company.id);
                  else next.add(company.id);
                  setSelectedCompanies(next);
                }}
                onClick={(e) => e.stopPropagation()}
                style={{ marginRight: 8, flexShrink: 0 }}
              />
            )}

            {/* logo thumbnail */}
            {company.logo_url && (
              // eslint-disable-next-line @next/next/no-img-element -- arbitrary external logo URLs; next/image would require whitelisting every domain
              <img
                src={company.logo_url}
                alt=""
                style={{
                  width: 24,
                  height: 24,
                  objectFit: "contain",
                  marginRight: 10,
                  borderRadius: 4,
                  flexShrink: 0,
                }}
              />
            )}

            {/* left: name + inline meta */}
            <div
              style={{
                flex: 1,
                minWidth: 0,
                display: "flex",
                flexDirection: "column",
                gap: 2,
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
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
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                marginLeft: 12,
              }}
            >
              {company.website && (
                <span className={button({ variant: "ghost", size: "sm" })}>
                  website
                </span>
              )}
              {isAdmin && company.linkedin_url && (
                <IconButton
                  size="1"
                  variant="ghost"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    handleSingleScrape(company);
                  }}
                  disabled={batchScrape.type === "running"}
                  style={{ cursor: "pointer" }}
                  title="Scrape full company (About + Posts + Jobs + People) via chrome extension"
                >
                  <MagicWandIcon width={12} height={12} />
                </IconButton>
              )}
              {isAdmin && (
                <IconButton
                  size="1"
                  color="red"
                  variant="ghost"
                  onClick={(e) => handleDeleteCompany(company.id, e)}
                  style={{ cursor: "pointer" }}
                >
                  <TrashIcon width={12} height={12} />
                </IconButton>
              )}
            </div>
          </Link>
        ))}
      </div>

      {/* infinite scroll */}
      <Box ref={loadMoreRefCallback} py="4">
        {loading && (
          <Flex justify="center" align="center">
            <Spinner size="2" />
          </Flex>
        )}
        {!loading && hasMore && (
          <Flex justify="center">
            <span className="yc-row-meta">scroll for more…</span>
          </Flex>
        )}
        {!loading && !hasMore && companies.length > 0 && (
          <Flex justify="center">
            <span className="yc-row-meta">all companies loaded</span>
          </Flex>
        )}
      </Box>
    </Container>
  );
}
