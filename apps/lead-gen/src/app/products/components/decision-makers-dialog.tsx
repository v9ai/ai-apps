"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Badge,
  Box,
  Callout,
  Dialog,
  Flex,
  Spinner,
  Text,
} from "@radix-ui/themes";
import {
  CheckCircledIcon,
  InfoCircledIcon,
  PersonIcon,
} from "@radix-ui/react-icons";
import { css, cx } from "styled-system/css";
import { button } from "@/recipes/button";
import type { GetContactsQuery } from "@/__generated__/hooks";

export type ContactRow = GetContactsQuery["contacts"]["contacts"][number];

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  companyName: string;
  productName: string;
  contacts: ContactRow[];
  loading: boolean;
  submitting: boolean;
  error: string | null;
  onConfirm: (selectedEmails: string[]) => void | Promise<void>;
};

function isEligible(c: ContactRow): boolean {
  return Boolean(c.email && c.emailVerified && !c.doNotContact);
}

function rankScore(c: ContactRow): number {
  const dm = c.isDecisionMaker ? 1 : 0;
  const auth = c.authorityScore ?? 0;
  const next = c.nextTouchScore ?? 0;
  return dm * 1000 + auth * 100 + next;
}

function fullName(c: ContactRow): string {
  const parts = [c.firstName, c.lastName].filter(Boolean);
  return parts.length > 0 ? parts.join(" ") : "Unnamed contact";
}

function metaLine(c: ContactRow): string {
  const segs = [c.position, c.seniority, c.department].filter(Boolean) as string[];
  return segs.join(" · ");
}

export function DecisionMakersDialog({
  open,
  onOpenChange,
  companyName,
  productName,
  contacts,
  loading,
  submitting,
  error,
  onConfirm,
}: Props) {
  const sorted = useMemo(() => {
    return [...contacts].sort((a, b) => rankScore(b) - rankScore(a));
  }, [contacts]);

  const dms = useMemo(() => sorted.filter((c) => c.isDecisionMaker), [sorted]);
  const others = useMemo(() => sorted.filter((c) => !c.isDecisionMaker), [sorted]);

  const [selected, setSelected] = useState<Set<number>>(() => new Set());

  useEffect(() => {
    if (!open) return;
    const next = new Set<number>();
    for (const c of sorted) {
      if (isEligible(c)) next.add(c.id);
    }
    // eslint-disable-next-line react-hooks/set-state-in-effect -- reset eligible selection when dialog opens
    setSelected(next);
  }, [open, sorted]);

  const toggle = (id: number) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectedEmails = useMemo(() => {
    const emails: string[] = [];
    for (const c of sorted) {
      if (selected.has(c.id) && c.email) emails.push(c.email);
    }
    return emails;
  }, [selected, sorted]);

  const selectedCount = selectedEmails.length;
  const dmSelectedCount = useMemo(
    () => dms.filter((c) => selected.has(c.id) && c.email).length,
    [dms, selected],
  );

  const hasContacts = sorted.length > 0;

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Content maxWidth="640px">
        <Dialog.Title>Decision makers — {companyName}</Dialog.Title>
        <Dialog.Description size="2" color="gray">
          Review who will receive the {productName} campaign before the draft is created.
        </Dialog.Description>

        <Box mt="4">
          {loading && (
            <Flex align="center" gap="2">
              <Spinner size="2" />
              <Text size="2" color="gray">Loading contacts…</Text>
            </Flex>
          )}

          {!loading && error && (
            <Callout.Root color="red">
              <Callout.Icon><InfoCircledIcon /></Callout.Icon>
              <Callout.Text>{error}</Callout.Text>
            </Callout.Root>
          )}

          {!loading && !error && !hasContacts && (
            <Callout.Root color="amber">
              <Callout.Icon><PersonIcon /></Callout.Icon>
              <Callout.Text>
                No contacts on file for {companyName}. You can still create an empty
                draft and add recipients in the campaign editor.
              </Callout.Text>
            </Callout.Root>
          )}

          {!loading && !error && hasContacts && (
            <Flex direction="column" gap="3">
              {dms.length > 0 && (
                <ContactSection
                  label="Decision makers"
                  tone="green"
                  rows={dms}
                  selected={selected}
                  onToggle={toggle}
                />
              )}
              {others.length > 0 && (
                <ContactSection
                  label={dms.length > 0 ? "Other contacts" : "Contacts"}
                  tone="gray"
                  rows={others}
                  selected={selected}
                  onToggle={toggle}
                />
              )}
            </Flex>
          )}
        </Box>

        <Flex justify="between" align="center" mt="4" gap="3" wrap="wrap">
          <Text size="1" color="gray" className={css({ fontVariantNumeric: "tabular-nums" })}>
            {selectedCount} selected{dmSelectedCount > 0 ? ` · ${dmSelectedCount} decision maker${dmSelectedCount === 1 ? "" : "s"}` : ""}
          </Text>
          <Flex gap="2" align="center">
            <Dialog.Close>
              <button type="button" className={button({ variant: "ghost", size: "sm" })}>
                Cancel
              </button>
            </Dialog.Close>
            <button
              type="button"
              disabled={submitting || (hasContacts && selectedCount === 0)}
              onClick={() => void onConfirm(selectedEmails)}
              className={cx(button({ variant: "secondary", size: "sm" }))}
              aria-busy={submitting}
            >
              {submitting && <Spinner size="1" />}
              {submitting
                ? "Creating…"
                : hasContacts
                ? selectedCount === 0
                  ? "Select at least one"
                  : `Create campaign (${selectedCount})`
                : "Create empty draft"}
            </button>
          </Flex>
        </Flex>
      </Dialog.Content>
    </Dialog.Root>
  );
}

function ContactSection({
  label,
  tone,
  rows,
  selected,
  onToggle,
}: {
  label: string;
  tone: "green" | "gray";
  rows: ContactRow[];
  selected: Set<number>;
  onToggle: (id: number) => void;
}) {
  return (
    <Box>
      <Flex align="center" gap="2" mb="2">
        <Text
          size="1"
          color="gray"
          weight="bold"
          className={css({ textTransform: "uppercase", letterSpacing: "0.06em" })}
        >
          {label}
        </Text>
        <Badge color={tone} size="1" variant="soft">{rows.length}</Badge>
      </Flex>
      <Flex direction="column" gap="1">
        {rows.map((c) => (
          <ContactRowItem
            key={c.id}
            contact={c}
            checked={selected.has(c.id)}
            onToggle={onToggle}
          />
        ))}
      </Flex>
    </Box>
  );
}

function ContactRowItem({
  contact,
  checked,
  onToggle,
}: {
  contact: ContactRow;
  checked: boolean;
  onToggle: (id: number) => void;
}) {
  const disabled = !contact.email;
  const meta = metaLine(contact);
  return (
    <label
      className={css({
        display: "flex",
        alignItems: "flex-start",
        gap: "3",
        py: "2",
        px: "2",
        borderRadius: "sm",
        border: "1px solid",
        borderColor: "ui.border",
        bg: "ui.surface",
        cursor: disabled ? "not-allowed" : "pointer",
        opacity: disabled ? 0.55 : 1,
        _hover: disabled ? {} : { borderColor: "ui.borderHover", bg: "ui.surfaceHover" },
      })}
    >
      <input
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={() => onToggle(contact.id)}
        className={css({
          mt: "1",
          width: "16px",
          height: "16px",
          accentColor: "var(--accent-9)",
          flexShrink: 0,
          cursor: disabled ? "not-allowed" : "pointer",
        })}
      />
      <Flex direction="column" gap="1" className={css({ minWidth: 0, flex: 1 })}>
        <Flex align="center" gap="2" wrap="wrap">
          <Text size="2" weight="medium" className={css({ color: "gray.12" })}>
            {fullName(contact)}
          </Text>
          {contact.isDecisionMaker && (
            <Badge color="green" size="1">DM</Badge>
          )}
          {contact.authorityScore != null && contact.authorityScore > 0 && (
            <Badge color="gray" size="1" variant="soft">
              authority {contact.authorityScore.toFixed(2)}
            </Badge>
          )}
          {contact.emailVerified === false && (
            <Badge color="amber" size="1" variant="soft">unverified</Badge>
          )}
          {contact.doNotContact && (
            <Badge color="red" size="1" variant="soft">DNC</Badge>
          )}
          {!contact.email && (
            <Badge color="gray" size="1" variant="soft">no email</Badge>
          )}
        </Flex>
        {meta && (
          <Text size="1" color="gray">{meta}</Text>
        )}
        {contact.email && (
          <Text size="1" color="gray" className={css({ fontFamily: "mono" })}>
            {contact.email}
          </Text>
        )}
      </Flex>
      {contact.isDecisionMaker && (
        <span aria-hidden className={css({ color: "green.10", mt: "1" })}>
          <CheckCircledIcon />
        </span>
      )}
    </label>
  );
}
