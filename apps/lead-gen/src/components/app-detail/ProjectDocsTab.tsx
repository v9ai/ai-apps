"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import {
  Heading,
  Flex,
  Text,
  Box,
  Card,
  Badge,
  Skeleton,
  TextField,
} from "@radix-ui/themes";
import {
  MagnifyingGlassIcon,
  FileTextIcon,
  ChevronDownIcon,
  ChevronRightIcon,
} from "@radix-ui/react-icons";
import { useSearchParams, useRouter } from "next/navigation";
import type { TabBaseProps } from "./types";

interface TocEntry {
  id: string;
  title: string;
  group: string;
  file: string;
  byteSize: number;
}

interface Toc {
  sections: TocEntry[];
}

const GROUP_COLORS: Record<string, "teal" | "blue" | "violet" | "orange"> = {
  Overview: "teal",
  "Technical Reference": "blue",
  "Interview Preparation": "violet",
  OpenSpec: "orange",
};

export function ProjectDocsTab({ app }: TabBaseProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [toc, setToc] = useState<Toc | null>(null);
  const [tocLoading, setTocLoading] = useState(true);
  const [activeSection, setActiveSection] = useState<string | null>(
    searchParams.get("section") ?? null,
  );
  const [content, setContent] = useState<string | null>(null);
  const [contentLoading, setContentLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(
    new Set(),
  );

  // Fetch TOC on mount
  useEffect(() => {
    fetch("/docs/lh-ai-fs/toc.json")
      .then((r) => r.json() as Promise<Toc>)
      .then((data) => {
        setToc(data);
        // Auto-select first section if none specified
        if (!activeSection && data.sections.length > 0) {
          setActiveSection(data.sections[0].id);
        }
      })
      .catch(() => setToc({ sections: [] }))
      .finally(() => setTocLoading(false));
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Fetch section content when active section changes
  useEffect(() => {
    if (!toc || !activeSection) return;
    const entry = toc.sections.find((s) => s.id === activeSection);
    if (!entry) return;

    setContentLoading(true);
    setContent(null);
    fetch(`/docs/lh-ai-fs/${entry.file}`)
      .then((r) => r.text())
      .then(setContent)
      .catch(() => setContent("*Failed to load section.*"))
      .finally(() => setContentLoading(false));
  }, [toc, activeSection]);

  // Persist section in URL
  const handleSelectSection = useCallback(
    (id: string) => {
      setActiveSection(id);
      const url = new URL(window.location.href);
      url.searchParams.set("section", id);
      router.replace(url.pathname + url.search, { scroll: false });
    },
    [router],
  );

  const toggleGroup = useCallback((group: string) => {
    setCollapsedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(group)) next.delete(group);
      else next.add(group);
      return next;
    });
  }, []);

  // Group sections and filter by search
  const grouped = useMemo(() => {
    if (!toc) return [];
    const lowerSearch = search.toLowerCase();
    const groups: { name: string; entries: TocEntry[] }[] = [];
    const groupMap = new Map<string, TocEntry[]>();

    for (const entry of toc.sections) {
      if (lowerSearch && !entry.title.toLowerCase().includes(lowerSearch))
        continue;
      if (!groupMap.has(entry.group)) {
        groupMap.set(entry.group, []);
        groups.push({ name: entry.group, entries: groupMap.get(entry.group)! });
      }
      groupMap.get(entry.group)!.push(entry);
    }
    return groups;
  }, [toc, search]);

  const activeEntry = toc?.sections.find((s) => s.id === activeSection);

  if (tocLoading) {
    return (
      <Card>
        <Skeleton height="400px" />
      </Card>
    );
  }

  if (!toc || toc.sections.length === 0) {
    return (
      <Card>
        <Flex direction="column" align="center" gap="3" p="6">
          <FileTextIcon width={32} height={32} color="var(--gray-8)" />
          <Text size="2" color="gray">
            No docs found. Run{" "}
            <code
              style={{
                fontSize: "var(--font-size-1)",
                backgroundColor: "var(--gray-3)",
                padding: "2px 6px",
              }}
            >
              npx tsx scripts/build-lh-docs.ts
            </code>{" "}
            to build the docs.
          </Text>
        </Flex>
      </Card>
    );
  }

  return (
    <Card>
      <Flex justify="between" align="center" mb="3">
        <Flex align="center" gap="2">
          <Heading size="4">Project Docs</Heading>
          <Badge size="1" variant="soft" color="teal">
            {toc.sections.length} sections
          </Badge>
        </Flex>
      </Flex>

      <Flex gap="4" direction={{ initial: "column", md: "row" }}>
        {/* Sidebar TOC */}
        <Box
          style={{ minWidth: 240, maxWidth: 280, flexShrink: 0 }}
          display={{ initial: "none", md: "block" }}
        >
          <SidebarToc
            grouped={grouped}
            activeSection={activeSection}
            collapsedGroups={collapsedGroups}
            search={search}
            onSearch={setSearch}
            onSelect={handleSelectSection}
            onToggleGroup={toggleGroup}
          />
        </Box>

        {/* Mobile TOC (collapsible) */}
        <Box display={{ initial: "block", md: "none" }} mb="3">
          <MobileToc
            grouped={grouped}
            activeSection={activeSection}
            activeEntry={activeEntry}
            search={search}
            onSearch={setSearch}
            onSelect={handleSelectSection}
          />
        </Box>

        {/* Content pane */}
        <Box style={{ flex: 1, minWidth: 0 }}>
          {contentLoading ? (
            <Skeleton height="300px" />
          ) : content ? (
            <Box
              className="deep-dive-content"
              style={{ fontSize: "var(--font-size-2)", lineHeight: 1.7 }}
            >
              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                {content}
              </ReactMarkdown>
            </Box>
          ) : (
            <Text size="2" color="gray">
              Select a section from the sidebar.
            </Text>
          )}
        </Box>
      </Flex>
    </Card>
  );
}

// --- Sidebar TOC ---
function SidebarToc({
  grouped,
  activeSection,
  collapsedGroups,
  search,
  onSearch,
  onSelect,
  onToggleGroup,
}: {
  grouped: { name: string; entries: TocEntry[] }[];
  activeSection: string | null;
  collapsedGroups: Set<string>;
  search: string;
  onSearch: (v: string) => void;
  onSelect: (id: string) => void;
  onToggleGroup: (group: string) => void;
}) {
  return (
    <Box>
      <TextField.Root
        size="1"
        placeholder="Filter sections..."
        value={search}
        onChange={(e) => onSearch(e.target.value)}
        mb="3"
      >
        <TextField.Slot>
          <MagnifyingGlassIcon height={14} width={14} />
        </TextField.Slot>
      </TextField.Root>

      <Box
        style={{
          maxHeight: "calc(100vh - 280px)",
          overflowY: "auto",
          paddingRight: 4,
        }}
      >
        {grouped.map((group) => {
          const isCollapsed = collapsedGroups.has(group.name);
          const color = GROUP_COLORS[group.name] ?? "gray";
          return (
            <Box key={group.name} mb="3">
              <Flex
                align="center"
                gap="1"
                mb="1"
                onClick={() => onToggleGroup(group.name)}
                style={{ cursor: "pointer", userSelect: "none" }}
              >
                {isCollapsed ? (
                  <ChevronRightIcon
                    width={12}
                    height={12}
                    color="var(--gray-9)"
                  />
                ) : (
                  <ChevronDownIcon
                    width={12}
                    height={12}
                    color="var(--gray-9)"
                  />
                )}
                <Text
                  size="1"
                  weight="bold"
                  style={{ color: `var(--${color}-11)` }}
                >
                  {group.name}
                </Text>
                <Badge size="1" variant="soft" color={color} ml="1">
                  {group.entries.length}
                </Badge>
              </Flex>
              {!isCollapsed &&
                group.entries.map((entry) => (
                  <Box
                    key={entry.id}
                    onClick={() => onSelect(entry.id)}
                    py="1"
                    px="2"
                    ml="3"
                    style={{
                      cursor: "pointer",
                      borderRadius: "var(--radius-1)",
                      backgroundColor:
                        activeSection === entry.id
                          ? `var(--${color}-3)`
                          : "transparent",
                      borderLeft:
                        activeSection === entry.id
                          ? `2px solid var(--${color}-9)`
                          : "2px solid transparent",
                    }}
                  >
                    <Text
                      size="1"
                      weight={activeSection === entry.id ? "bold" : "regular"}
                      style={{
                        color:
                          activeSection === entry.id
                            ? `var(--${color}-11)`
                            : "var(--gray-11)",
                        display: "block",
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                      }}
                    >
                      {entry.title}
                    </Text>
                  </Box>
                ))}
            </Box>
          );
        })}
      </Box>
    </Box>
  );
}

// --- Mobile TOC (select dropdown style) ---
function MobileToc({
  grouped,
  activeSection,
  activeEntry,
  search,
  onSearch,
  onSelect,
}: {
  grouped: { name: string; entries: TocEntry[] }[];
  activeSection: string | null;
  activeEntry: TocEntry | undefined;
  search: string;
  onSearch: (v: string) => void;
  onSelect: (id: string) => void;
}) {
  const [open, setOpen] = useState(false);

  return (
    <Box>
      <Flex
        align="center"
        gap="2"
        p="2"
        onClick={() => setOpen(!open)}
        style={{
          cursor: "pointer",
          backgroundColor: "var(--gray-2)",
          borderRadius: "var(--radius-2)",
        }}
      >
        <FileTextIcon width={14} height={14} />
        <Text size="2" weight="medium" style={{ flex: 1 }}>
          {activeEntry?.title ?? "Select section"}
        </Text>
        {open ? (
          <ChevronDownIcon width={14} height={14} />
        ) : (
          <ChevronRightIcon width={14} height={14} />
        )}
      </Flex>

      {open && (
        <Box
          mt="2"
          p="2"
          style={{
            backgroundColor: "var(--gray-2)",
            borderRadius: "var(--radius-2)",
            maxHeight: 400,
            overflowY: "auto",
          }}
        >
          <TextField.Root
            size="1"
            placeholder="Filter..."
            value={search}
            onChange={(e) => onSearch(e.target.value)}
            mb="2"
          >
            <TextField.Slot>
              <MagnifyingGlassIcon height={14} width={14} />
            </TextField.Slot>
          </TextField.Root>

          {grouped.map((group) => (
            <Box key={group.name} mb="2">
              <Text
                size="1"
                weight="bold"
                style={{
                  color: `var(--${GROUP_COLORS[group.name] ?? "gray"}-11)`,
                }}
                mb="1"
                as="div"
              >
                {group.name}
              </Text>
              {group.entries.map((entry) => (
                <Box
                  key={entry.id}
                  onClick={() => {
                    onSelect(entry.id);
                    setOpen(false);
                  }}
                  py="1"
                  px="2"
                  style={{
                    cursor: "pointer",
                    borderRadius: "var(--radius-1)",
                    backgroundColor:
                      activeSection === entry.id
                        ? "var(--accent-3)"
                        : "transparent",
                  }}
                >
                  <Text size="1">{entry.title}</Text>
                </Box>
              ))}
            </Box>
          ))}
        </Box>
      )}
    </Box>
  );
}
