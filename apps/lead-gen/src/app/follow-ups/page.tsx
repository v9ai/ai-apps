"use client";

import { css } from "styled-system/css";
import { useState } from "react";
import {
  useGetEmailsNeedingFollowUpQuery,
  useDueRemindersQuery,
  useDismissReminderMutation,
  useSnoozeReminderMutation,
} from "@/__generated__/hooks";
import Link from "next/link";
import { button } from "@/recipes/button";
import { Spinner } from "@/components/ui/Spinner";
import { ExclamationTriangleIcon } from "@radix-ui/react-icons";

const statusColors: Record<string, string> = {
  sent: "var(--blue-9)",
  delivered: "var(--green-9)",
  opened: "var(--orange-9)",
};

const statusBgColors: Record<string, string> = {
  sent: "var(--blue-a3)",
  delivered: "var(--green-a3)",
  opened: "var(--orange-a3)",
};

function daysSince(dateStr: string | null | undefined): number | null {
  if (!dateStr) return null;
  const diff = Date.now() - new Date(dateStr).getTime();
  return Math.floor(diff / (1000 * 60 * 60 * 24));
}

function daysUntil(dateStr: string | null | undefined): number | null {
  if (!dateStr) return null;
  const diff = new Date(dateStr).getTime() - Date.now();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

const container = css({ maxWidth: "1200px", mx: "auto", p: "6" });
const heading = css({ fontSize: "xl", fontWeight: "bold", mb: "4" });
const flexBetween = css({ display: "flex", justifyContent: "space-between", alignItems: "center", mb: "4" });
const flexCenter = css({ display: "flex", justifyContent: "center", py: "8" });
const grayText = css({ fontSize: "sm", color: "ui.secondary" });
const table = css({ width: "100%", borderCollapse: "collapse", border: "1px solid", borderColor: "ui.border", borderRadius: "md", overflow: "hidden" });
const th = css({ textAlign: "left", p: "3", fontSize: "xs", fontWeight: "medium", color: "ui.secondary", borderBottom: "1px solid", borderColor: "ui.border", bg: "ui.subtle" });
const td = css({ p: "3", borderBottom: "1px solid", borderColor: "ui.border", fontSize: "sm" });
const badge = (color: string, bg: string) => css({ display: "inline-flex", alignItems: "center", px: "2", py: "0.5", borderRadius: "sm", fontSize: "xs", fontWeight: "medium", color, bg });
const tabList = css({ display: "flex", gap: "0", borderBottom: "1px solid", borderColor: "ui.border", mb: "4" });
const tabTrigger = (active: boolean) => css({
  px: "4",
  py: "2",
  fontSize: "sm",
  fontWeight: "medium",
  cursor: "pointer",
  borderBottom: "2px solid",
  borderColor: active ? "accent.primary" : "transparent",
  color: active ? "ui.primary" : "ui.secondary",
  bg: "transparent",
  display: "flex",
  alignItems: "center",
  gap: "2",
  _hover: { color: "ui.primary" },
});
const selectStyle = css({
  px: "3",
  py: "1.5",
  fontSize: "sm",
  borderRadius: "md",
  border: "1px solid",
  borderColor: "ui.border",
  bg: "transparent",
  color: "ui.primary",
  cursor: "pointer",
});

function DaysBadge({ days }: { days: number | null }) {
  if (days === null) return null;
  const color = days > 7 ? "var(--red-9)" : days > 3 ? "var(--orange-9)" : "var(--gray-11)";
  const bg = days > 7 ? "var(--red-a3)" : days > 3 ? "var(--orange-a3)" : "var(--gray-a3)";
  return <span className={badge(color, bg)}>{days}d</span>;
}

function StatusBadge({ status }: { status: string }) {
  return (
    <span className={badge(statusColors[status] ?? "var(--gray-11)", statusBgColors[status] ?? "var(--gray-a3)")}>
      {status}
    </span>
  );
}

function CountBadge({ count, color, bg }: { count: number; color: string; bg: string }) {
  if (count === 0) return null;
  return <span className={badge(color, bg)}>{count}</span>;
}

export default function FollowUpsPage() {
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [tagFilter, setTagFilter] = useState<string>("all");
  const [tab, setTab] = useState<string>("emails");

  const { data: emailData, loading: emailLoading, error: emailError } = useGetEmailsNeedingFollowUpQuery({
    variables: { limit: 100 },
  });
  const { data: remindersData, loading: remindersLoading, error: remindersError, refetch: refetchReminders } = useDueRemindersQuery({
    fetchPolicy: "cache-and-network",
  });
  const [dismissReminder] = useDismissReminderMutation();
  const [snoozeReminder] = useSnoozeReminderMutation();

  const allEmails = emailData?.emailsNeedingFollowUp?.emails ?? [];
  const totalCount = emailData?.emailsNeedingFollowUp?.totalCount ?? 0;
  const emails = statusFilter === "all" ? allEmails : allEmails.filter((e) => e.status === statusFilter);
  const dueReminders = remindersData?.dueReminders ?? [];
  const allTags = Array.from(new Set(dueReminders.flatMap((r) => r.contact.tags ?? []))).sort();
  const filteredReminders = tagFilter === "all" ? dueReminders : dueReminders.filter((r) => (r.contact.tags ?? []).includes(tagFilter));

  if (emailError || remindersError) {
    const message = emailError?.message ?? remindersError?.message ?? "Unknown error";
    return (
      <div className={container}>
        <div className={css({ display: "flex", alignItems: "flex-start", gap: "3", p: "4", borderRadius: "md", bg: "var(--red-a3)", color: "var(--red-11)", border: "1px solid", borderColor: "var(--red-a6)" })}>
          <ExclamationTriangleIcon />
          <span className={css({ fontSize: "sm" })}>Failed to load follow-ups: {message}</span>
        </div>
      </div>
    );
  }

  return (
    <div className={container}>
      <h1 className={heading}>Follow-ups &amp; Reminders</h1>

      <div className={tabList}>
        <button className={tabTrigger(tab === "emails")} onClick={() => setTab("emails")}>
          Emails needing follow-up
          <CountBadge count={totalCount} color="var(--orange-9)" bg="var(--orange-a3)" />
        </button>
        <button className={tabTrigger(tab === "reminders")} onClick={() => setTab("reminders")}>
          Due reminders
          <CountBadge count={dueReminders.length} color="var(--red-9)" bg="var(--red-a3)" />
        </button>
      </div>

      {/* Email follow-ups tab */}
      {tab === "emails" && (
        <>
          <div className={flexBetween}>
            <span className={grayText}>{totalCount} email(s) without replies</span>
            <select className={selectStyle} value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
              <option value="all">All statuses</option>
              <option value="sent">Sent</option>
              <option value="delivered">Delivered</option>
              <option value="opened">Opened</option>
            </select>
          </div>

          {emailLoading ? (
            <div className={flexCenter}><Spinner size={20} /></div>
          ) : emails.length === 0 ? (
            <span className={grayText}>No emails needing follow-up.</span>
          ) : (
            <table className={table}>
              <thead>
                <tr>
                  <th className={th}>Recipient</th>
                  <th className={th}>Subject</th>
                  <th className={th}>Status</th>
                  <th className={th}>Sequence</th>
                  <th className={th}>Days Ago</th>
                  <th className={th}>Sent</th>
                </tr>
              </thead>
              <tbody>
                {emails.map((email) => {
                  const days = daysSince(email.sentAt);
                  return (
                    <tr key={email.id}>
                      <td className={td}>
                        <span className={css({ fontSize: "sm", fontWeight: "medium" })}>
                          {email.recipientName ?? email.toEmails[0] ?? "-"}
                        </span>
                        {email.recipientName && (
                          <span className={css({ fontSize: "xs", color: "ui.secondary", ml: "1" })}>{email.toEmails[0]}</span>
                        )}
                      </td>
                      <td className={td}>
                        <span className={css({ fontSize: "sm", display: "block", maxWidth: "300px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" })}>
                          {email.subject}
                        </span>
                      </td>
                      <td className={td}>
                        <StatusBadge status={email.status} />
                      </td>
                      <td className={td}>
                        <span className={css({ fontSize: "sm" })}>
                          {email.sequenceType === "initial" ? "Initial" : `#${email.sequenceNumber ?? "?"}`}
                        </span>
                      </td>
                      <td className={td}>
                        <DaysBadge days={days} />
                      </td>
                      <td className={td}>
                        <span className={css({ fontSize: "xs", color: "ui.secondary" })}>
                          {email.sentAt ? new Date(email.sentAt).toLocaleDateString() : "-"}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </>
      )}

      {/* Due reminders tab */}
      {tab === "reminders" && (
        <>
          <div className={flexBetween}>
            <span className={grayText}>
              {dueReminders.length === 0
                ? "No reminders due."
                : `${filteredReminders.length} of ${dueReminders.length} reminder(s) due or overdue.`}
            </span>
            {allTags.length > 0 && (
              <select className={selectStyle} value={tagFilter} onChange={(e) => setTagFilter(e.target.value)}>
                <option value="all">All tags</option>
                {allTags.map((tag) => (
                  <option key={tag} value={tag}>{tag}</option>
                ))}
              </select>
            )}
          </div>

          {remindersLoading ? (
            <div className={flexCenter}><Spinner size={20} /></div>
          ) : filteredReminders.length === 0 ? null : (
            <table className={table}>
              <thead>
                <tr>
                  <th className={th}>Contact</th>
                  <th className={th}>Tags</th>
                  <th className={th}>Note</th>
                  <th className={th}>Due</th>
                  <th className={th}>Recurrence</th>
                  <th className={th}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredReminders.map(({ reminder, contact }) => {
                  const overdueDays = daysSince(reminder.remindAt);
                  const daysLeft = daysUntil(reminder.remindAt);
                  return (
                    <tr key={reminder.id}>
                      <td className={td}>
                        <Link href={`/contacts/${contact.id}`} className={css({ textDecoration: "none" })}>
                          <span className={css({ fontSize: "sm", fontWeight: "medium", color: "accent.primary" })}>
                            {contact.firstName} {contact.lastName}
                          </span>
                        </Link>
                        {contact.position && (
                          <p className={css({ fontSize: "xs", color: "ui.secondary", m: "0" })}>{contact.position}</p>
                        )}
                      </td>
                      <td className={td}>
                        <div className={css({ display: "flex", gap: "1", flexWrap: "wrap" })}>
                          {(contact.tags ?? []).length > 0
                            ? contact.tags!.map((tag) => (
                                <span key={tag} className={badge("var(--gray-11)", "var(--gray-a3)")}>{tag}</span>
                              ))
                            : <span className={css({ fontSize: "xs", color: "ui.secondary" })}>--</span>}
                        </div>
                      </td>
                      <td className={td}>
                        <span className={css({ fontSize: "sm", color: "ui.secondary" })}>{reminder.note ?? "--"}</span>
                      </td>
                      <td className={td}>
                        {overdueDays !== null && overdueDays > 0 ? (
                          <span className={badge("var(--red-9)", "var(--red-a3)")}>{overdueDays}d overdue</span>
                        ) : daysLeft !== null && daysLeft <= 0 ? (
                          <span className={badge("var(--red-9)", "var(--red-a3)")}>today</span>
                        ) : (
                          <span className={css({ fontSize: "xs", color: "ui.secondary" })}>
                            {new Date(reminder.remindAt).toLocaleDateString()}
                          </span>
                        )}
                      </td>
                      <td className={td}>
                        <span className={badge(
                          reminder.recurrence === "none" ? "var(--gray-11)" : "var(--blue-9)",
                          reminder.recurrence === "none" ? "var(--gray-a3)" : "var(--blue-a3)"
                        )}>
                          {reminder.recurrence === "none" ? "one-time" : reminder.recurrence}
                        </span>
                      </td>
                      <td className={td}>
                        <div className={css({ display: "flex", gap: "2" })}>
                          <button
                            className={button({ variant: "ghost", size: "sm" })}
                            onClick={async () => {
                              await dismissReminder({ variables: { id: reminder.id } });
                              refetchReminders();
                            }}
                          >
                            Done
                          </button>
                          <button
                            className={button({ variant: "ghost", size: "sm" })}
                            onClick={async () => {
                              await snoozeReminder({ variables: { id: reminder.id, days: 7 } });
                              refetchReminders();
                            }}
                          >
                            Snooze 7d
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </>
      )}
    </div>
  );
}
