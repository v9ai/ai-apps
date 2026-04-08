"use client";

import { useState, useMemo, useRef, useEffect } from "react";
import { css } from "styled-system/css";
import { flex } from "styled-system/patterns";
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
  const containerRef = useRef<HTMLDivElement>(null);

  const { data, loading } = useGetCompaniesQuery({
    variables: { text: search || undefined, limit: 50, order_by: "NAME_ASC" as CompanyOrderBy },
  });

  const companies = data?.companies?.companies ?? [];

  const selectedCompany = useMemo(() => {
    if (!value) return null;
    return companies.find((c) => c.id === value) ?? null;
  }, [value, companies]);

  // Close dropdown on outside click
  useEffect(() => {
    if (!open) return;
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  return (
    <div ref={containerRef} className={css({ position: "relative", width: "100%" })}>
      <button
        className={button({ variant: "outline" })}
        style={{ justifyContent: "space-between", width: "100%" }}
        onClick={() => setOpen((prev) => !prev)}
      >
        <span className={css({ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" })}>
          {selectedCompany?.name ?? placeholder}
        </span>
        <ChevronDownIcon />
      </button>

      {open && (
        <div
          className={css({
            position: "absolute",
            zIndex: 50,
            bg: "ui.surface",
            border: "1px solid",
            borderColor: "ui.border",
            mt: "1",
            width: "100%",
            p: "2",
          })}
        >
          <div className={flex({ direction: "column", gap: "2" })}>
            {/* Search input */}
            <div
              className={flex({ align: "center", gap: "2" })}
              style={{
                border: "1px solid var(--colors-ui-border)",
                padding: "6px 8px",
                background: "var(--colors-ui-surface)",
              }}
            >
              <MagnifyingGlassIcon className={css({ color: "ui.tertiary", flexShrink: 0 })} />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search companies..."
                autoFocus
                className={css({
                  border: "none",
                  outline: "none",
                  bg: "transparent",
                  flex: 1,
                  fontSize: "sm",
                  color: "ui.heading",
                })}
              />
            </div>

            {/* Options */}
            <div className={css({ overflowY: "auto", maxHeight: "240px" })}>
              <div className={flex({ direction: "column", gap: "1" })}>
                {value && (
                  <div
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
                    className={css({
                      padding: "6px 8px",
                      cursor: "pointer",
                      _hover: { bg: "ui.surfaceHover" },
                    })}
                  >
                    <span className={css({ fontSize: "sm", color: "ui.tertiary" })}>Clear selection</span>
                  </div>
                )}
                {loading && (
                  <span className={css({ fontSize: "sm", color: "ui.tertiary", padding: "6px 8px" })}>Loading...</span>
                )}
                {!loading && companies.length === 0 && (
                  <span className={css({ fontSize: "sm", color: "ui.tertiary", padding: "6px 8px" })}>No companies found</span>
                )}
                {companies.map((company) => (
                  <div
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
                    className={css({
                      padding: "6px 8px",
                      cursor: "pointer",
                      bg: company.id === value ? "accent.subtle" : undefined,
                      _hover: { bg: "ui.surfaceHover" },
                    })}
                  >
                    <span className={css({ fontSize: "sm", fontWeight: company.id === value ? "bold" : "normal" })}>
                      {company.name}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
