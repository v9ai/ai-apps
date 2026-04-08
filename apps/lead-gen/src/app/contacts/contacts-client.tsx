"use client";

import * as React from "react";
import { useCallback, useState } from "react";
import { useGetContactsQuery } from "@/__generated__/hooks";
import type { GetContactsQuery } from "@/__generated__/hooks";
import Link from "next/link";
import { useAuth } from "@/lib/auth-hooks";
import { ADMIN_EMAIL } from "@/lib/constants";
import { button } from "@/recipes/button";
import { css } from "styled-system/css";
import { flex } from "styled-system/patterns";
import {
  EnvelopeClosedIcon,
  ExclamationTriangleIcon,
  InfoCircledIcon,
  LinkedInLogoIcon,
  MagnifyingGlassIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
} from "@radix-ui/react-icons";

type Contact = NonNullable<
  GetContactsQuery["contacts"]["contacts"]
>[number];

const PAGE_SIZE = 50;

export function ContactsClient() {
  const { user } = useAuth();
  const isAdmin = user?.email === ADMIN_EMAIL;

  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [page, setPage] = useState(0);

  const debounceRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const handleSearch = useCallback((val: string) => {
    setSearch(val);
    setPage(0);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => setDebouncedSearch(val), 300);
  }, []);

  const { data, loading } = useGetContactsQuery({
    variables: {
      search: debouncedSearch || undefined,
      limit: PAGE_SIZE,
      offset: page * PAGE_SIZE,
    },
    skip: !isAdmin,
    fetchPolicy: "cache-and-network",
  });

  if (!isAdmin) {
    return (
      <div className={css({ maxWidth: "1200px", mx: "auto", px: "4", py: "8" })}>
        <div className={css({ display: "flex", gap: "3", p: "3", border: "1px solid", borderColor: "red.9", bg: "red.3" })}>
          <div className={css({ flexShrink: 0 })}>
            <ExclamationTriangleIcon />
          </div>
          <span>Access denied. Admin only.</span>
        </div>
      </div>
    );
  }

  const contactsList = data?.contacts?.contacts ?? [];
  const totalCount = data?.contacts?.totalCount ?? 0;
  const totalPages = Math.ceil(totalCount / PAGE_SIZE);

  return (
    <div className={css({ maxWidth: "1200px", mx: "auto", px: "4", py: { base: "4", md: "6" } })}>
      <div className={flex({ direction: "column", gap: "5" })}>
        <h2 className={css({ fontSize: "2xl", fontWeight: "bold", color: "ui.heading" })}>Contacts</h2>

        {/* Toolbar */}
        <div className={flex({ align: "center", justify: "space-between", gap: "3", wrap: "wrap" })}>
          <span className={css({ fontSize: "sm", color: "ui.tertiary" })}>
            {loading
              ? "Loading\u2026"
              : `${totalCount} contact${totalCount !== 1 ? "s" : ""}`}
          </span>
          <div style={{ width: 280 }}>
            <div className={css({ position: "relative" })}>
              <div className={css({ position: "absolute", left: "10px", top: "50%", transform: "translateY(-50%)", color: "ui.tertiary" })}>
                <MagnifyingGlassIcon />
              </div>
              <input
                className={css({ bg: "ui.surface", border: "1px solid", borderColor: "ui.border", color: "ui.body", p: "6px 10px", pl: "32px", width: "100%", outline: "none", fontSize: "sm", _focus: { borderColor: "accent.primary" } })}
                placeholder="Search contacts\u2026"
                value={search}
                onChange={(e) => handleSearch(e.target.value)}
              />
            </div>
          </div>
        </div>

        {/* Contacts list */}
        {loading && contactsList.length === 0 ? (
          <div className={flex({ justify: "center", py: "6" })}>
            <div className={css({ w: "16px", h: "16px", border: "2px solid", borderColor: "ui.border", borderTopColor: "accent.primary", borderRadius: "50%", animation: "spin 0.6s linear infinite" })} />
          </div>
        ) : contactsList.length === 0 ? (
          <div className={css({ display: "flex", gap: "3", p: "3", border: "1px solid", borderColor: "ui.border", bg: "ui.surface" })}>
            <div className={css({ flexShrink: 0 })}>
              <InfoCircledIcon />
            </div>
            <span>No contacts found.</span>
          </div>
        ) : (
          <div className={flex({ direction: "column", gap: "2" })}>
            {contactsList.map((contact) => (
              <ContactCard key={contact.id} contact={contact} />
            ))}
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className={flex({ justify: "center", align: "center", gap: "3" })}>
            <button
              className={button({ variant: "ghost", size: "md" })}
              disabled={page === 0}
              onClick={() => setPage((p) => p - 1)}
            >
              <ChevronLeftIcon />
              Previous
            </button>
            <span className={css({ fontSize: "sm", color: "ui.tertiary" })}>
              Page {page + 1} of {totalPages}
            </span>
            <button
              className={button({ variant: "ghost", size: "md" })}
              disabled={page >= totalPages - 1}
              onClick={() => setPage((p) => p + 1)}
            >
              Next
              <ChevronRightIcon />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function ContactCard({ contact }: { contact: Contact }) {
  return (
    <Link
      href={`/contacts/${contact.id}`}
      style={{ textDecoration: "none", color: "inherit" }}
    >
      <div
        className={css({ bg: "ui.surface", border: "1px solid", borderColor: "ui.border", p: "3", cursor: "pointer", transition: "box-shadow 0.15s" })}
      >
        <div className={css({ p: "3" })}>
          <div className={flex({ align: "start", justify: "space-between", gap: "3", wrap: "wrap" })}>
            <div style={{ minWidth: 0 }}>
              <div className={flex({ align: "center", gap: "2", wrap: "wrap" })}>
                <span className={css({ fontSize: "md", fontWeight: "medium" })}>
                  {contact.firstName} {contact.lastName}
                </span>
                {contact.emailVerified && (
                  <span className={css({ fontSize: "xs", px: "2", py: "1", border: "1px solid", borderColor: "status.positive", color: "status.positive", bg: "status.positiveDim" })}>
                    verified
                  </span>
                )}
                {contact.email && !contact.emailVerified && contact.nbResult && (
                  <span className={css({ fontSize: "xs", px: "2", py: "1", border: "1px solid", borderColor: "orange.9", color: "orange.9", bg: "orange.3" })}>
                    {contact.nbResult}
                  </span>
                )}
                {contact.doNotContact && (
                  <span className={css({ fontSize: "xs", px: "2", py: "1", border: "1px solid", borderColor: "red.9", color: "red.9", bg: "red.3" })}>
                    do not contact
                  </span>
                )}
              </div>

              {(contact.position || contact.company) && (
                <p className={css({ fontSize: "sm", color: "ui.tertiary", mt: "1" })}>
                  {contact.position}
                  {contact.position && contact.company && " \u00b7 "}
                  {contact.company}
                </p>
              )}

              <div className={flex({ gap: "3", mt: "2", wrap: "wrap", align: "center" })}>
                {contact.email && (
                  <div className={flex({ align: "center", gap: "1" })}>
                    <EnvelopeClosedIcon color="gray" />
                    <span className={css({ fontSize: "sm", color: "ui.tertiary" })}>
                      {contact.email}
                    </span>
                  </div>
                )}
                {contact.linkedinUrl && (
                  <div className={flex({ align: "center", gap: "1" })}>
                    <LinkedInLogoIcon color="gray" />
                    <span className={css({ fontSize: "sm", color: "ui.tertiary" })}>
                      LinkedIn
                    </span>
                  </div>
                )}
              </div>

              {contact.tags && contact.tags.length > 0 && (
                <div className={flex({ gap: "1", mt: "2", wrap: "wrap" })}>
                  {contact.tags.map((tag) => (
                    <span key={tag} className={css({ fontSize: "xs", fontWeight: "medium", px: "2", py: "1", border: "1px solid", borderColor: "ui.border", color: "ui.secondary", textTransform: "lowercase" })}>
                      {tag}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </Link>
  );
}
