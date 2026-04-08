"use client";

import { useState, useEffect } from "react";
import { css } from "styled-system/css";
import { button } from "@/recipes/button";
import {
  Cross2Icon,
  ExclamationTriangleIcon,
  CheckCircledIcon,
  PlusIcon,
  Pencil1Icon,
  StopIcon,
} from "@radix-ui/react-icons";
import {
  useGetEmailCampaignQuery,
  useUpdateCampaignMutation,
  useLaunchEmailCampaignMutation,
} from "@/__generated__/hooks";

// ── Reusable form styles ─────────────────────────────────────────────────────

const inputStyles = css({
  bg: "ui.surface",
  border: "1px solid",
  borderColor: "ui.border",
  color: "ui.body",
  p: "6px 10px",
  fontSize: "base",
  width: "100%",
  outline: "none",
  fontFamily: "inherit",
  borderRadius: "0",
  _focus: { borderColor: "accent.primary" },
  _placeholder: { color: "ui.tertiary" },
});

const textareaStyles = css({
  bg: "ui.surface",
  border: "1px solid",
  borderColor: "ui.border",
  color: "ui.body",
  p: "2",
  fontSize: "base",
  width: "100%",
  outline: "none",
  fontFamily: "inherit",
  borderRadius: "0",
  resize: "vertical",
  minHeight: "80px",
  _focus: { borderColor: "accent.primary" },
  _placeholder: { color: "ui.tertiary" },
});

const labelStyles = css({
  fontSize: "sm",
  fontWeight: "medium",
  color: "ui.secondary",
  mb: "1",
  display: "block",
});

const spinnerStyles = css({
  display: "inline-block",
  width: "16px",
  height: "16px",
  border: "2px solid",
  borderColor: "ui.border",
  borderTopColor: "accent.primary",
  borderRadius: "50%",
  animation: "spin 0.6s linear infinite",
});

const spinnerLargeStyles = css({
  display: "inline-block",
  width: "32px",
  height: "32px",
  border: "3px solid",
  borderColor: "ui.border",
  borderTopColor: "accent.primary",
  borderRadius: "50%",
  animation: "spin 0.6s linear infinite",
});

interface EditCampaignDialogProps {
  campaignId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export function EditCampaignDialog({
  campaignId,
  open,
  onOpenChange,
  onSuccess,
}: EditCampaignDialogProps) {
  const [campaignName, setCampaignName] = useState("");
  const [recipients, setRecipients] = useState<string[]>([]);
  const [recipientInput, setRecipientInput] = useState("");
  const [emails, setEmails] = useState<
    Array<{ subject: string; body: string }>
  >([]);
  const [subjectInput, setSubjectInput] = useState("");
  const [bodyInput, setBodyInput] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const { data, loading, refetch } = useGetEmailCampaignQuery({
    variables: { id: campaignId },
    skip: !open || !campaignId,
  });

  const [updateCampaign, { loading: updating }] = useUpdateCampaignMutation();
  const [launchCampaign, { loading: launching }] =
    useLaunchEmailCampaignMutation();

  useEffect(() => {
    if (data?.emailCampaign) {
      setCampaignName(data.emailCampaign.name);
      if (data.emailCampaign.recipientEmails) {
        setRecipients(data.emailCampaign.recipientEmails);
      }
      if (data.emailCampaign.sequence) {
        try {
          const seq =
            typeof data.emailCampaign.sequence === "string"
              ? JSON.parse(data.emailCampaign.sequence)
              : data.emailCampaign.sequence;
          if (Array.isArray(seq)) setEmails(seq);
        } catch {
          /* ignore */
        }
      }
    }
  }, [data]);

  useEffect(() => {
    if (!open) {
      setError(null);
      setSuccess(null);
    }
  }, [open]);

  const handleAddRecipient = () => {
    const email = recipientInput.trim();
    if (email && !recipients.includes(email)) {
      setRecipients([...recipients, email]);
      setRecipientInput("");
    }
  };

  const handleRemoveRecipient = (email: string) => {
    setRecipients(recipients.filter((r) => r !== email));
  };

  const handleAddEmail = () => {
    if (subjectInput.trim() && bodyInput.trim()) {
      setEmails([
        ...emails,
        { subject: subjectInput.trim(), body: bodyInput.trim() },
      ]);
      setSubjectInput("");
      setBodyInput("");
    }
  };

  const handleRemoveEmail = (index: number) => {
    setEmails(emails.filter((_, i) => i !== index));
  };

  const handleSave = async () => {
    if (!campaignName.trim()) return;
    setError(null);
    try {
      const result = await updateCampaign({
        variables: {
          id: campaignId,
          input: {
            name: campaignName,
            recipientEmails:
              recipients.length > 0 ? recipients : undefined,
            sequence:
              emails.length > 0 ? JSON.stringify(emails) : undefined,
          },
        },
      });
      if (result.data?.updateCampaign) {
        setSuccess("Campaign updated!");
        setTimeout(() => setSuccess(null), 3000);
        await refetch();
        onSuccess?.();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Update failed");
    }
  };

  const handleStop = async () => {
    setError(null);
    try {
      await updateCampaign({
        variables: { id: campaignId, input: { status: "stopped" } },
      });
      onOpenChange(false);
      onSuccess?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to stop");
    }
  };

  const handleLaunch = async () => {
    setError(null);
    try {
      await launchCampaign({ variables: { id: campaignId } });
      setSuccess("Campaign launched!");
      await refetch();
      onSuccess?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Launch failed");
    }
  };

  if (!open) return null;

  return (
    <>
      {/* Overlay */}
      <div
        className={css({
          position: "fixed",
          inset: 0,
          zIndex: 50,
          bg: "rgba(10, 10, 15, 0.85)",
          backdropFilter: "blur(12px)",
        })}
        onClick={() => onOpenChange(false)}
      />
      {/* Panel */}
      <div
        className={css({
          position: "fixed",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          zIndex: 51,
          bg: "ui.surface",
          border: "1px solid",
          borderColor: "ui.border",
          width: "100%",
          maxWidth: "650px",
          maxHeight: "90vh",
          overflowY: "auto",
          p: "6",
        })}
      >
        {/* Header */}
        <div
          className={css({
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            pb: "4",
            mb: "4",
            borderBottom: "1px solid",
            borderBottomColor: "ui.border",
          })}
        >
          <h2 className={css({ fontSize: "xl", fontWeight: "bold", color: "ui.heading" })}>
            Edit Campaign
          </h2>
          <button
            className={button({ variant: "ghost", size: "sm" })}
            aria-label="Close"
            onClick={() => onOpenChange(false)}
          >
            <Cross2Icon />
          </button>
        </div>

        {loading ? (
          <div className={css({ display: "flex", justifyContent: "center", py: "8" })}>
            <div className={spinnerLargeStyles} />
          </div>
        ) : (
          <div className={css({ display: "flex", flexDirection: "column", gap: "4" })}>
            {success && (
              <div className={css({ display: "flex", gap: "3", p: "3", border: "1px solid", borderColor: "green.500/30", bg: "green.500/10" })}>
                <CheckCircledIcon />
                <span className={css({ fontSize: "sm", color: "ui.body" })}>{success}</span>
              </div>
            )}
            {error && (
              <div className={css({ display: "flex", gap: "3", p: "3", border: "1px solid", borderColor: "red.500/30", bg: "red.500/10" })}>
                <ExclamationTriangleIcon />
                <span className={css({ fontSize: "sm", color: "ui.body" })}>{error}</span>
              </div>
            )}

            {/* Campaign Name */}
            <div>
              <label className={labelStyles}>Campaign Name</label>
              <input
                className={inputStyles}
                value={campaignName}
                onChange={(e) => setCampaignName(e.target.value)}
                placeholder="Campaign name"
              />
            </div>

            {/* Status */}
            {data?.emailCampaign && (
              <div className={css({ display: "flex", gap: "2", alignItems: "center" })}>
                <span className={css({ fontSize: "sm", color: "ui.tertiary" })}>
                  Status:
                </span>
                <span
                  className={css({
                    fontSize: "xs",
                    px: "2",
                    py: "1",
                    border: "1px solid",
                    borderColor: "ui.border",
                    color: "ui.secondary",
                  })}
                >
                  {data.emailCampaign.status}
                </span>
                <span className={css({ fontSize: "xs", color: "ui.tertiary" })}>
                  Sent: {data.emailCampaign.emailsSent}/
                  {data.emailCampaign.totalRecipients}
                </span>
              </div>
            )}

            {/* Recipients */}
            <div>
              <label className={labelStyles}>Recipients</label>
              <div className={css({ display: "flex", gap: "2", alignItems: "center" })}>
                <div style={{ flex: 1 }}>
                  <input
                    className={inputStyles}
                    value={recipientInput}
                    onChange={(e) => setRecipientInput(e.target.value)}
                    placeholder="Enter email address"
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        handleAddRecipient();
                      }
                    }}
                  />
                </div>
                <button
                  className={button({ variant: "ghost", size: "md" })}
                  onClick={handleAddRecipient}
                  disabled={!recipientInput.trim()}
                >
                  <PlusIcon />
                </button>
              </div>
              {recipients.length > 0 && (
                <div className={css({ display: "flex", gap: "1", flexWrap: "wrap", mt: "2" })}>
                  {recipients.map((email) => (
                    <span
                      key={email}
                      className={css({
                        fontSize: "xs",
                        px: "2",
                        py: "1",
                        border: "1px solid",
                        borderColor: "ui.border",
                        color: "ui.secondary",
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "1",
                      })}
                    >
                      {email}
                      <button
                        className={button({ variant: "ghost", size: "sm" })}
                        onClick={() => handleRemoveRecipient(email)}
                        style={{ marginLeft: 4, padding: 0 }}
                      >
                        <Cross2Icon />
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Email Sequence */}
            <div>
              <label className={labelStyles}>Email Sequence</label>
              <div className={css({ display: "flex", flexDirection: "column", gap: "2" })}>
                <input
                  className={inputStyles}
                  value={subjectInput}
                  onChange={(e) => setSubjectInput(e.target.value)}
                  placeholder="Subject"
                />
                <div className={css({ display: "flex", gap: "2" })}>
                  <div style={{ flex: 1 }}>
                    <textarea
                      className={textareaStyles}
                      value={bodyInput}
                      onChange={(e) => setBodyInput(e.target.value)}
                      placeholder="Body"
                      rows={3}
                    />
                  </div>
                  <button
                    className={button({ variant: "ghost", size: "md" })}
                    onClick={handleAddEmail}
                    disabled={!subjectInput.trim() || !bodyInput.trim()}
                  >
                    <PlusIcon />
                  </button>
                </div>
              </div>
              {emails.length > 0 && (
                <div className={css({ display: "flex", flexDirection: "column", gap: "1", mt: "2" })}>
                  {emails.map((email, i) => (
                    <div
                      key={`${i}-${email.subject}`}
                      className={css({
                        border: "1px solid",
                        borderColor: "ui.border",
                        p: "3",
                      })}
                    >
                      <div className={css({ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "2" })}>
                        <div style={{ flex: 1 }}>
                          <span className={css({ fontSize: "sm", fontWeight: "medium", color: "ui.body" })}>
                            {email.subject}
                          </span>
                          <span
                            className={css({ fontSize: "xs", color: "ui.tertiary", whiteSpace: "pre-wrap", display: "block" })}
                          >
                            {email.body.substring(0, 100)}
                            {email.body.length > 100 ? "..." : ""}
                          </span>
                        </div>
                        <button
                          className={button({ variant: "ghost", size: "sm" })}
                          onClick={() => handleRemoveEmail(i)}
                        >
                          <Cross2Icon />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Actions */}
            <div className={css({ display: "flex", justifyContent: "space-between", mt: "2" })}>
              <div className={css({ display: "flex", gap: "2" })}>
                {data?.emailCampaign?.status === "draft" && (
                  <button
                    className={button({ variant: "solidGreen" })}
                    onClick={handleLaunch}
                    disabled={launching}
                  >
                    {launching ? (
                      <>
                        <div className={spinnerStyles} /> Launching...
                      </>
                    ) : (
                      "Launch Campaign"
                    )}
                  </button>
                )}
                {(data?.emailCampaign?.status === "running" ||
                  data?.emailCampaign?.status === "pending") && (
                  <button className={button({ variant: "ghost" })} onClick={handleStop}>
                    <StopIcon /> Stop
                  </button>
                )}
              </div>
              <div className={css({ display: "flex", gap: "2" })}>
                <button
                  className={button({ variant: "ghost" })}
                  onClick={() => onOpenChange(false)}
                >
                  Cancel
                </button>
                <button
                  className={button({ variant: "ghost" })}
                  onClick={handleSave}
                  disabled={updating || !campaignName.trim()}
                >
                  {updating ? (
                    <>
                      <div className={spinnerStyles} /> Saving...
                    </>
                  ) : (
                    <>
                      <Pencil1Icon /> Save
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
