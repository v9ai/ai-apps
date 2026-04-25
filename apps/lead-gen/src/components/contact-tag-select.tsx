"use client";

import { useState, useMemo } from "react";
import { Popover, TextField, ScrollArea, Text, Flex, Box } from "@radix-ui/themes";
import { button } from "@/recipes/button";
import { MagnifyingGlassIcon, ChevronDownIcon } from "@radix-ui/react-icons";
import { useGetContactTagsQuery } from "@/__generated__/hooks";

interface ContactTagSelectProps {
  value?: string | null;
  onChange: (tag: string | null) => void;
  placeholder?: string;
}

export function ContactTagSelect({ value, onChange, placeholder = "Filter by tag..." }: ContactTagSelectProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");

  const { data, loading } = useGetContactTagsQuery({ fetchPolicy: "cache-and-network" });

  const allTags = useMemo(() => data?.contactTags ?? [], [data?.contactTags]);

  const filteredTags = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return allTags;
    return allTags.filter((t) => t.tag.toLowerCase().includes(q));
  }, [allTags, search]);

  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      <Popover.Trigger>
        <button className={button({ variant: "outline", size: "sm" })} style={{ justifyContent: "space-between", minWidth: 200 }}>
          <Text truncate>{value ?? placeholder}</Text>
          <ChevronDownIcon />
        </button>
      </Popover.Trigger>
      <Popover.Content style={{ width: "280px", padding: "8px" }}>
        <Flex direction="column" gap="2">
          <TextField.Root
            placeholder="Search tags..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            autoFocus
          >
            <TextField.Slot>
              <MagnifyingGlassIcon />
            </TextField.Slot>
          </TextField.Root>
          <ScrollArea style={{ maxHeight: "260px" }}>
            <Flex direction="column" gap="1">
              {value && (
                <Box
                  role="button"
                  tabIndex={0}
                  onClick={() => { onChange(null); setOpen(false); setSearch(""); }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      onChange(null);
                      setOpen(false);
                      setSearch("");
                    }
                  }}
                  style={{ padding: "6px 8px", borderRadius: 4, cursor: "pointer" }}
                  className="hover:bg-gray-100"
                >
                  <Text size="2" color="gray">Clear filter</Text>
                </Box>
              )}
              {loading && allTags.length === 0 && (
                <Text size="2" color="gray" style={{ padding: "6px 8px" }}>Loading...</Text>
              )}
              {!loading && filteredTags.length === 0 && (
                <Text size="2" color="gray" style={{ padding: "6px 8px" }}>No tags found</Text>
              )}
              {filteredTags.map((t) => (
                <Box
                  key={t.tag}
                  role="button"
                  tabIndex={0}
                  onClick={() => { onChange(t.tag); setOpen(false); setSearch(""); }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      onChange(t.tag);
                      setOpen(false);
                      setSearch("");
                    }
                  }}
                  style={{
                    padding: "6px 8px",
                    borderRadius: 4,
                    cursor: "pointer",
                    backgroundColor: t.tag === value ? "var(--accent-3)" : undefined,
                  }}
                  className="hover:bg-gray-100"
                >
                  <Flex justify="between" align="center" gap="2">
                    <Text size="2" weight={t.tag === value ? "bold" : "regular"} truncate>
                      {t.tag}
                    </Text>
                    <Text size="1" color="gray">{t.count}</Text>
                  </Flex>
                </Box>
              ))}
            </Flex>
          </ScrollArea>
        </Flex>
      </Popover.Content>
    </Popover.Root>
  );
}
