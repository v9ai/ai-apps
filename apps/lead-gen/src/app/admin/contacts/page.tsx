"use client";

import * as React from "react";
import { useCallback, useState, useRef, useEffect } from "react";
import {
  useGetContactsQuery,
  useCreateContactMutation,
  useDeleteContactMutation,
} from "@/__generated__/hooks";
import type { GetContactsQuery } from "@/__generated__/hooks";
import Link from "next/link";
import { useAuth } from "@/lib/auth-hooks";
import { ADMIN_EMAIL } from "@/lib/constants";
import { css } from "styled-system/css";
import { button } from "@/recipes/button";
import { Spinner } from "@/components/ui/Spinner";
import {
  EnvelopeClosedIcon,
  ExclamationTriangleIcon,
  InfoCircledIcon,
  LinkedInLogoIcon,
  MagnifyingGlassIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  PlusIcon,
  TrashIcon,
} from "@radix-ui/react-icons";

type Contact = NonNullable<
  GetContactsQuery["contacts"]["contacts"]
>[number];

const PAGE_SIZE = 50;

const container = css({ maxWidth: "1100px", mx: "auto", p: "8" });
const badge = (color: string, bg: string) => css({ display: "inline-flex", alignItems: "center", px: "2", py: "0.5", borderRadius: "sm", fontSize: "xs", fontWeight: "medium", color, bg });
const card = css({ border: "1px solid", borderColor: "ui.border", borderRadius: "lg", overflow: "hidden" });
const cardInner = css({ p: "3" });
const inputStyle = css({
  width: "100%",
  px: "3",
  py: "2",
  fontSize: "sm",
  border: "1px solid",
  borderColor: "ui.border",
  borderRadius: "md",
  bg: "transparent",
  color: "ui.primary",
  _placeholder: { color: "ui.tertiary" },
  _focus: { outline: "2px solid", outlineColor: "accent.primary", outlineOffset: "-1px" },
});
const searchWrapper = css({ position: "relative", width: "280px" });
const searchIcon = css({ position: "absolute", left: "10px", top: "50%", transform: "translateY(-50%)", color: "ui.tertiary", pointerEvents: "none" });
const searchInput = css({
  width: "100%",
  pl: "8",
  pr: "3",
  py: "2",
  fontSize: "sm",
  border: "1px solid",
  borderColor: "ui.border",
  borderRadius: "md",
  bg: "transparent",
  color: "ui.primary",
  _placeholder: { color: "ui.tertiary" },
  _focus: { outline: "2px solid", outlineColor: "accent.primary", outlineOffset: "-1px" },
});

export default function AdminContactsPage() {
  const { user } = useAuth();
  const isAdmin = user?.email === ADMIN_EMAIL;

  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [page, setPage] = useState(0);
  const [createOpen, setCreateOpen] = useState(false);
  const dialogRef = useRef<HTMLDialogElement>(null);

  const debounceRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const handleSearch = useCallback((val: string) => {
    setSearch(val);
    setPage(0);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => setDebouncedSearch(val), 300);
  }, []);

  const { data, loading, refetch } = useGetContactsQuery({
    variables: {
      search: debouncedSearch || undefined,
      limit: PAGE_SIZE,
      offset: page * PAGE_SIZE,
    },
    skip: !isAdmin,
    fetchPolicy: "cache-and-network",
  });

  const [createContact, { loading: creating }] = useCreateContactMutation();
  const [deleteContact] = useDeleteContactMutation();

  useEffect(() => {
    if (createOpen) {
      dialogRef.current?.showModal();
    } else {
      dialogRef.current?.close();
    }
  }, [createOpen]);

  if (!isAdmin) {
    return (
      <div className={css({ maxWidth: "768px", mx: "auto", p: "8" })}>
        <div className={css({ display: "flex", alignItems: "flex-start", gap: "3", p: "4", borderRadius: "md", bg: "var(--red-a3)", color: "var(--red-11)", border: "1px solid", borderColor: "var(--red-a6)" })}>
          <ExclamationTriangleIcon />
          <span className={css({ fontSize: "sm" })}>Access denied. Admin only.</span>
        </div>
      </div>
    );
  }

  const contactsList = data?.contacts?.contacts ?? [];
  const totalCount = data?.contacts?.totalCount ?? 0;
  const totalPages = Math.ceil(totalCount / PAGE_SIZE);

  async function handleCreate(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    await createContact({
      variables: {
        input: {
          firstName: fd.get("firstName") as string,
          lastName: fd.get("lastName") as string || undefined,
          email: fd.get("email") as string || undefined,
          position: fd.get("position") as string || undefined,
          linkedinUrl: fd.get("linkedinUrl") as string || undefined,
        },
      },
    });
    setCreateOpen(false);
    refetch();
  }

  async function handleDelete(id: number) {
    await deleteContact({ variables: { id } });
    refetch();
  }

  return (
    <div className={container}>
      <div className={css({ display: "flex", justifyContent: "space-between", alignItems: "center", mb: "6" })}>
        <h1 className={css({ fontSize: "2xl", fontWeight: "bold" })}>Contacts</h1>
        <button className={button({ variant: "ghost", size: "md" })} onClick={() => setCreateOpen(true)}>
          <PlusIcon /> New Contact
        </button>
      </div>

      {/* Create Contact Dialog */}
      <dialog
        ref={dialogRef}
        className={css({
          maxWidth: "450px",
          width: "90%",
          p: "6",
          borderRadius: "lg",
          border: "1px solid",
          borderColor: "ui.border",
          bg: "ui.background",
          color: "ui.primary",
          _backdrop: { bg: "rgba(0, 0, 0, 0.5)" },
        })}
        onClose={() => setCreateOpen(false)}
      >
        <h3 className={css({ fontSize: "lg", fontWeight: "bold", mb: "3" })}>New Contact</h3>
        <form onSubmit={handleCreate}>
          <div className={css({ display: "flex", flexDirection: "column", gap: "3", mt: "3" })}>
            <input className={inputStyle} name="firstName" placeholder="First name *" required />
            <input className={inputStyle} name="lastName" placeholder="Last name" />
            <input className={inputStyle} name="email" placeholder="Email" type="email" />
            <input className={inputStyle} name="position" placeholder="Position" />
            <input className={inputStyle} name="linkedinUrl" placeholder="LinkedIn URL" />
            <div className={css({ display: "flex", gap: "3", justifyContent: "flex-end", mt: "2" })}>
              <button type="button" className={button({ variant: "ghost" })} onClick={() => setCreateOpen(false)}>
                Cancel
              </button>
              <button className={button({ variant: "ghost" })} type="submit" disabled={creating}>
                {creating ? "Creating..." : "Create"}
              </button>
            </div>
          </div>
        </form>
      </dialog>

      <div className={css({ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "3", mb: "4" })}>
        <span className={css({ fontSize: "sm", color: "ui.secondary" })}>
          {loading ? "Loading..." : `${totalCount} contact${totalCount !== 1 ? "s" : ""}`}
        </span>
        <div className={searchWrapper}>
          <MagnifyingGlassIcon className={searchIcon} />
          <input
            className={searchInput}
            placeholder="Search contacts..."
            value={search}
            onChange={(e) => handleSearch(e.target.value)}
          />
        </div>
      </div>

      {loading && contactsList.length === 0 ? (
        <div className={css({ display: "flex", justifyContent: "center", py: "6" })}><Spinner size={20} /></div>
      ) : contactsList.length === 0 ? (
        <div className={css({ display: "flex", alignItems: "center", gap: "2", p: "4", borderRadius: "md", bg: "var(--gray-a3)", color: "var(--gray-11)", fontSize: "sm" })}>
          <InfoCircledIcon />
          <span>No contacts found.</span>
        </div>
      ) : (
        <div className={css({ display: "flex", flexDirection: "column", gap: "2" })}>
          {contactsList.map((contact) => (
            <div key={contact.id} className={card}>
              <div className={cardInner}>
                <div className={css({ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "3" })}>
                  <Link
                    href={`/contacts/${contact.id}`}
                    style={{ textDecoration: "none", color: "inherit", flex: 1 }}
                  >
                    <div className={css({ display: "flex", alignItems: "center", gap: "2", flexWrap: "wrap" })}>
                      <span className={css({ fontSize: "md", fontWeight: "medium" })}>
                        {contact.firstName} {contact.lastName}
                      </span>
                      {contact.emailVerified && (
                        <span className={badge("var(--green-11)", "var(--green-a3)")}>verified</span>
                      )}
                      {contact.doNotContact && (
                        <span className={badge("var(--red-11)", "var(--red-a3)")}>do not contact</span>
                      )}
                    </div>
                    {(contact.position || contact.company) && (
                      <p className={css({ fontSize: "sm", color: "ui.secondary", m: "0", mt: "1" })}>
                        {contact.position}{contact.position && contact.company && " -- "}{contact.company}
                      </p>
                    )}
                    <div className={css({ display: "flex", gap: "3", mt: "2", flexWrap: "wrap", alignItems: "center" })}>
                      {contact.email && (
                        <div className={css({ display: "flex", alignItems: "center", gap: "1" })}>
                          <EnvelopeClosedIcon className={css({ color: "ui.secondary" })} />
                          <span className={css({ fontSize: "sm", color: "ui.secondary" })}>{contact.email}</span>
                        </div>
                      )}
                      {contact.linkedinUrl && (
                        <div className={css({ display: "flex", alignItems: "center", gap: "1" })}>
                          <LinkedInLogoIcon className={css({ color: "ui.secondary" })} />
                          <span className={css({ fontSize: "sm", color: "ui.secondary" })}>LinkedIn</span>
                        </div>
                      )}
                    </div>
                    {contact.tags && contact.tags.length > 0 && (
                      <div className={css({ display: "flex", gap: "1", mt: "2", flexWrap: "wrap" })}>
                        {contact.tags.map((tag) => (
                          <span key={tag} className={badge("var(--gray-11)", "var(--gray-a3)")}>{tag}</span>
                        ))}
                      </div>
                    )}
                  </Link>
                  <button
                    className={button({ variant: "ghost", size: "sm" })}
                    onClick={() => handleDelete(contact.id)}
                  >
                    <TrashIcon />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {totalPages > 1 && (
        <div className={css({ display: "flex", justifyContent: "center", alignItems: "center", gap: "3", mt: "4" })}>
          <button className={button({ variant: "ghost", size: "md" })} disabled={page === 0} onClick={() => setPage((p) => p - 1)}>
            <ChevronLeftIcon /> Previous
          </button>
          <span className={css({ fontSize: "sm", color: "ui.secondary" })}>Page {page + 1} of {totalPages}</span>
          <button className={button({ variant: "ghost", size: "md" })} disabled={page >= totalPages - 1} onClick={() => setPage((p) => p + 1)}>
            Next <ChevronRightIcon />
          </button>
        </div>
      )}
    </div>
  );
}
