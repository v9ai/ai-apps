"use client";

import { useState, useMemo } from "react";
import { Popover, TextField, ScrollArea, Text, Flex, Box } from "@radix-ui/themes";
import { button } from "@/recipes/button";
import { MagnifyingGlassIcon, ChevronDownIcon } from "@radix-ui/react-icons";
import { useGetCompaniesQuery } from "@/__generated__/hooks";
import type { CompanyOrderBy } from "@/__generated__/graphql";

interface CompanySelectProps {
  value?: number | null;
  onChange: (companyId: number | null, companyName?: string) => void;
  placeholder?: string;
}

export function CompanySelect({ value, onChange, placeholder = "Select company..." }: CompanySelectProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");

  const { data, loading } = useGetCompaniesQuery({
    variables: { text: search || undefined, limit: 50, order_by: "NAME_ASC" as CompanyOrderBy },
  });

  const companies = data?.companies?.companies ?? [];

  const selectedCompany = useMemo(() => {
    if (!value) return null;
    return companies.find((c) => c.id === value) ?? null;
  }, [value, companies]);

  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      <Popover.Trigger>
        <button className={button({ variant: "outline" })} style={{ justifyContent: "space-between", width: "100%" }}>
          <Text truncate>{selectedCompany?.name ?? placeholder}</Text>
          <ChevronDownIcon />
        </button>
      </Popover.Trigger>
      <Popover.Content style={{ width: "320px", padding: "8px" }}>
        <Flex direction="column" gap="2">
          <TextField.Root
            placeholder="Search companies..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            autoFocus
          >
            <TextField.Slot>
              <MagnifyingGlassIcon />
            </TextField.Slot>
          </TextField.Root>
          <ScrollArea style={{ maxHeight: "240px" }}>
            <Flex direction="column" gap="1">
              {value && (
                <Box
                  role="button"
                  tabIndex={0}
                  onClick={() => { onChange(null); setOpen(false); }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      onChange(null);
                      setOpen(false);
                    }
                  }}
                  style={{ padding: "6px 8px", borderRadius: 4, cursor: "pointer" }}
                  className="hover:bg-gray-100"
                >
                  <Text size="2" color="gray">Clear selection</Text>
                </Box>
              )}
              {loading && <Text size="2" color="gray" style={{ padding: "6px 8px" }}>Loading...</Text>}
              {!loading && companies.length === 0 && (
                <Text size="2" color="gray" style={{ padding: "6px 8px" }}>No companies found</Text>
              )}
              {companies.map((company) => (
                <Box
                  key={company.id}
                  role="button"
                  tabIndex={0}
                  onClick={() => { onChange(company.id, company.name); setOpen(false); setSearch(""); }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      onChange(company.id, company.name);
                      setOpen(false);
                      setSearch("");
                    }
                  }}
                  style={{
                    padding: "6px 8px",
                    borderRadius: 4,
                    cursor: "pointer",
                    backgroundColor: company.id === value ? "var(--accent-3)" : undefined,
                  }}
                  className="hover:bg-gray-100"
                >
                  <Text size="2" weight={company.id === value ? "bold" : "regular"}>
                    {company.name}
                  </Text>
                </Box>
              ))}
            </Flex>
          </ScrollArea>
        </Flex>
      </Popover.Content>
    </Popover.Root>
  );
}
