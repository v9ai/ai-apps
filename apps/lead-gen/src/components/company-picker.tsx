"use client";

import { useState, useMemo, useCallback, useRef, useEffect } from "react";
import { css } from "styled-system/css";
import { flex } from "styled-system/patterns";
import { button } from "@/recipes/button";
import {
  MagnifyingGlassIcon,
  PlusIcon,
  Link2Icon,
} from "@radix-ui/react-icons";
import {
  useGetCompaniesQuery,
  useCreateCompanyMutation,
} from "@/__generated__/hooks";

interface CompanyPickerProps {
  /** Currently linked company key (null = no company linked) */
  companyKey: string | null | undefined;
  /** Company name to display / pre-fill when creating */
  companyName: string | null | undefined;
  /** Called when a company is selected or created */
  onLinked: (companyKey: string, companyName: string) => void;
}

export function CompanyPicker({
  companyKey,
  companyName,
  onLinked,
}: CompanyPickerProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const { data, loading, error: queryError } = useGetCompaniesQuery({
    variables: { text: search || undefined, limit: 20 },
    skip: !open,
  });
  const [createCompany] = useCreateCompanyMutation();

  const companies = useMemo(
    () => data?.companies?.companies ?? [],
    [data],
  );

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

  const handleSelect = useCallback(
    (key: string, name: string) => {
      onLinked(key, name);
      setOpen(false);
      setSearch("");
      setError(null);
    },
    [onLinked],
  );

  const handleCreate = useCallback(async () => {
    const name = search.trim() || companyName?.trim();
    if (!name) return;
    setCreating(true);
    setError(null);
    try {
      const key = name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "");
      const result = await createCompany({
        variables: { input: { key, name } },
        refetchQueries: ["GetCompanies", "GetApplication"],
      });
      const created = result.data?.createCompany;
      if (created) {
        onLinked(created.key, created.name);
        setOpen(false);
        setSearch("");
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to create company");
    } finally {
      setCreating(false);
    }
  }, [search, companyName, createCompany, onLinked]);

  // If company is already linked, show a simple link
  if (companyKey) {
    return null; // parent handles the linked state
  }

  const createName = search.trim() || companyName || "";

  return (
    <div ref={containerRef} className={css({ position: "relative", display: "inline-block" })}>
      <button
        className={button({ variant: "ghost", size: "sm" })}
        onClick={() => setOpen((prev) => !prev)}
      >
        <Link2Icon /> Link Company
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
            width: "300px",
          })}
        >
          {/* Search input */}
          <div className={css({ p: "2" })}>
            <div
              className={flex({
                align: "center",
                gap: "2",
              })}
              style={{
                border: "1px solid var(--colors-ui-border)",
                padding: "4px 8px",
                background: "var(--colors-ui-surface)",
              }}
            >
              <MagnifyingGlassIcon
                className={css({ color: "ui.tertiary", flexShrink: 0 })}
              />
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
          </div>

          <hr className={css({ border: "none", borderTop: "1px solid", borderColor: "ui.border" })} />

          {/* Results */}
          <div className={css({ overflowY: "auto", maxHeight: "200px" })}>
            <div className={css({ p: "1" })}>
              {loading && (
                <div className={css({ p: "3" })}>
                  <span className={css({ fontSize: "sm", color: "ui.tertiary" })}>Searching...</span>
                </div>
              )}
              {queryError && (
                <div className={css({ p: "3" })}>
                  <span className={css({ fontSize: "sm", color: "status.negative" })}>Failed to load companies</span>
                </div>
              )}
              {!loading && !queryError && companies.length === 0 && (
                <div className={css({ p: "3" })}>
                  <span className={css({ fontSize: "sm", color: "ui.tertiary" })}>No companies found</span>
                </div>
              )}
              {companies.map((c) => (
                <div
                  key={c.id}
                  role="button"
                  tabIndex={0}
                  onClick={() => handleSelect(c.key, c.name)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      handleSelect(c.key, c.name);
                    }
                  }}
                  className={css({
                    padding: "6px 10px",
                    cursor: "pointer",
                    _hover: {
                      bg: "accent.subtle",
                    },
                  })}
                >
                  <span className={css({ fontSize: "sm", fontWeight: "medium", display: "block" })}>{c.name}</span>
                  {c.website && (
                    <span className={css({ fontSize: "xs", color: "ui.tertiary", display: "block" })}>
                      {c.website.replace(/^https?:\/\//, "")}
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Create new */}
          {createName && (
            <>
              <hr className={css({ border: "none", borderTop: "1px solid", borderColor: "ui.border" })} />
              <div className={css({ p: "2" })}>
                <button
                  className={button({ variant: "ghost", size: "md" })}
                  style={{ width: "100%" }}
                  onClick={handleCreate}
                  disabled={creating}
                >
                  <PlusIcon />
                  {creating
                    ? "Creating..."
                    : `Create "${createName}"`}
                </button>
                {error && (
                  <div className={css({ fontSize: "xs", color: "status.negative", mt: "1" })}>
                    {error}
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
