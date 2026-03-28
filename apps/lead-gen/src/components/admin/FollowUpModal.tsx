"use client";

import { useState, useEffect } from "react";
import {
  Badge,
  Box,
  Card,
  Checkbox,
  Dialog,
  Flex,
  ScrollArea,
  Spinner,
  Text,
  TextArea,
} from "@radix-ui/themes";
import { button } from "@/recipes/button";
import {
  ClockIcon,
  MagicWandIcon,
  PaperPlaneIcon,
  ReloadIcon,
  ArrowLeftIcon,
} from "@radix-ui/react-icons";
import { useGenerateEmailMutation } from "@/__generated__/hooks";

interface FollowUpModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  companyId: number;
  companyName?: string;
  companyDescription?: string;
  sentEmails: Array<{
    id: number;
    resendId: string;
    recipientEmail: string;
    recipientName?: string | null;
    subject: string;
    sentAt?: string | null;
    sequenceNumber?: string | null;
    sequenceType?: string | null;
    status: string;
  }>;
  onSuccess?: () => void;
}

interface EmailPreview {
  contactEmail: string;
  contactName: string;
  subject: string;
  body: string;
  originalEmailId: number;
  originalSubject: string;
  daysSinceOriginal: number;
}

export function FollowUpModal({
  open,
  onOpenChange,
  companyId,
  companyName,
  companyDescription,
  sentEmails,
  onSuccess,
}: FollowUpModalProps) {
  const [selectedEmails, setSelectedEmails] = useState<Set<number>>(new Set());
  const [generatedEmails, setGeneratedEmails] = useState<Map<number, EmailPreview>>(new Map());
  const [generating, setGenerating] = useState(false);
  const [sending, setSending] = useState(false);
  const [step, setStep] = useState<"select" | "preview">("select");

  const [generateEmail] = useGenerateEmailMutation();

  // Filter emails eligible for follow-up
  const eligibleEmails = sentEmails.filter(
    (email) =>
      (email.status === "sent" || email.status === "delivered" || email.status === "opened") &&
      (email.sequenceNumber === "0" || email.sequenceType === "initial") &&
      email.recipientEmail,
  );

  // Reset when modal opens
  useEffect(() => {
    if (open) {
      setSelectedEmails(new Set());
      setGeneratedEmails(new Map());
      setStep("select");
    }
  }, [open]);

  const toggleEmail = (emailId: number) => {
    const next = new Set(selectedEmails);
    if (next.has(emailId)) next.delete(emailId);
    else next.add(emailId);
    setSelectedEmails(next);
  };

  const selectAll = () => setSelectedEmails(new Set(eligibleEmails.map((e) => e.id)));
  const deselectAll = () => setSelectedEmails(new Set());

  const daysSince = (sentAt: string | null | undefined): number => {
    if (!sentAt) return 0;
    return Math.floor((Date.now() - new Date(sentAt).getTime()) / (1000 * 60 * 60 * 24));
  };

  const followUpInstructions = (originalSubject: string, days: number): string => {
    const timeRef = days <= 3 ? "a few days ago" : days <= 7 ? "last week" : "earlier";
    return `This is a FIRST FOLLOW-UP email sent ${days} days after the initial outreach about "${originalSubject}".

CRITICAL GUIDELINES:
- Reference the previous email naturally ("Following up on my message from ${timeRef}...")
- Keep it SHORT and FRIENDLY (max 120 words)
- Acknowledge they might be busy
- Gently reiterate interest without being pushy
- Include ONE specific question or simple call-to-action
- Maintain the same professional but approachable tone

DO NOT:
- Apologize excessively for following up
- Repeat everything from the first email
- Sound desperate or aggressive`;
  };

  const handleGenerate = async () => {
    if (selectedEmails.size === 0) return;
    setGenerating(true);
    const generated = new Map<number, EmailPreview>();

    try {
      for (const emailId of selectedEmails) {
        const original = eligibleEmails.find((e) => e.id === emailId);
        if (!original) continue;

        const days = daysSince(original.sentAt);
        const result = await generateEmail({
          variables: {
            input: {
              recipientName: original.recipientName || original.recipientEmail.split("@")[0],
              companyName: companyName ?? undefined,
              purpose: followUpInstructions(original.subject, days),
              tone: "professional and friendly",
            },
          },
        });

        if (result.data?.generateEmail) {
          generated.set(emailId, {
            contactEmail: original.recipientEmail,
            contactName: original.recipientName || original.recipientEmail,
            subject: result.data.generateEmail.subject,
            body: result.data.generateEmail.text,
            originalEmailId: emailId,
            originalSubject: original.subject,
            daysSinceOriginal: days,
          });
        }
      }

      setGeneratedEmails(generated);
      setStep("preview");
    } catch (err) {
      console.error("Failed to generate follow-ups:", err);
    } finally {
      setGenerating(false);
    }
  };

  const handleSend = async () => {
    setSending(true);
    try {
      const results = await Promise.allSettled(
        Array.from(generatedEmails.entries()).map(async ([emailId, preview]) => {
          const html = `<p>${preview.body.replace(/\n/g, "</p><p>")}</p>`;
          const response = await fetch("/api/email/send-single", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              to: preview.contactEmail,
              subject: preview.subject,
              html,
              text: preview.body,
              companyId,
              parentEmailId: emailId,
              sequenceType: "followup_1",
              sequenceNumber: 1,
              recipientName: preview.contactName,
            }),
          });
          if (!response.ok) throw new Error(`Failed to send to ${preview.contactEmail}`);
          return response.json();
        }),
      );

      const successful = results.filter((r) => r.status === "fulfilled").length;
      if (successful > 0) {
        onSuccess?.();
        onOpenChange(false);
      }
    } catch (err) {
      console.error("Failed to send follow-ups:", err);
    } finally {
      setSending(false);
    }
  };

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Content maxWidth="700px">
        <Dialog.Title>
          <Flex align="center" gap="2">
            <ClockIcon />
            Schedule Follow-up Emails {companyName && `- ${companyName}`}
          </Flex>
        </Dialog.Title>

        {step === "select" && (
          <Flex direction="column" gap="3" mt="3">
            <Flex justify="between" align="center">
              <Text size="2" color="gray">
                Select contacts for follow-up
              </Text>
              <Flex gap="2">
                <button className={button({ variant: "ghost", size: "sm" })} onClick={selectAll}>Select All</button>
                <button className={button({ variant: "ghost", size: "sm" })} onClick={deselectAll}>Deselect All</button>
              </Flex>
            </Flex>

            {eligibleEmails.length === 0 ? (
              <Card>
                <Text size="2" color="gray">
                  No emails eligible for follow-ups. Emails must be sent/delivered/opened initial outreach.
                </Text>
              </Card>
            ) : (
              <ScrollArea style={{ maxHeight: 400 }}>
                <Flex direction="column" gap="2">
                  {eligibleEmails.map((email) => {
                    const days = daysSince(email.sentAt);
                    return (
                      <Card
                        key={email.id}
                        style={{
                          cursor: "pointer",
                          borderColor: selectedEmails.has(email.id) ? "var(--accent-9)" : undefined,
                        }}
                        onClick={() => toggleEmail(email.id)}
                      >
                        <Flex gap="3" align="start">
                          <Checkbox
                            checked={selectedEmails.has(email.id)}
                            onCheckedChange={() => toggleEmail(email.id)}
                            onClick={(e) => e.stopPropagation()}
                          />
                          <Box style={{ flex: 1 }}>
                            <Text size="2" weight="bold">
                              {email.recipientName || email.recipientEmail}
                            </Text>
                            <Text size="1" color="gray" as="div">{email.recipientEmail}</Text>
                            <Text size="1" color="gray" as="div">Original: {email.subject}</Text>
                          </Box>
                          <Flex direction="column" align="end" gap="1">
                            <Badge
                              size="1"
                              color={email.status === "delivered" ? "green" : email.status === "opened" ? "blue" : "gray"}
                            >
                              {email.status}
                            </Badge>
                            <Text size="1" color="gray">{days}d ago</Text>
                          </Flex>
                        </Flex>
                      </Card>
                    );
                  })}
                </Flex>
              </ScrollArea>
            )}

            <Flex justify="between" align="center" mt="2">
              <Text size="1" color="gray">
                {selectedEmails.size} contact{selectedEmails.size !== 1 ? "s" : ""} selected
              </Text>
              <Flex gap="2">
                <Dialog.Close>
                  <button className={button({ variant: "ghost" })}>Cancel</button>
                </Dialog.Close>
                <button className={button({})} onClick={handleGenerate} disabled={selectedEmails.size === 0 || generating}>
                  {generating ? <><Spinner size="1" /> Generating...</> : <><MagicWandIcon /> Generate Follow-ups</>}
                </button>
              </Flex>
            </Flex>
          </Flex>
        )}

        {step === "preview" && (
          <Flex direction="column" gap="3" mt="3">
            <Text size="2" color="gray">
              Review and edit before sending ({generatedEmails.size} emails)
            </Text>

            <ScrollArea style={{ maxHeight: 400 }}>
              <Flex direction="column" gap="3">
                {Array.from(generatedEmails.entries()).map(([emailId, preview]) => (
                  <Card key={emailId}>
                    <Flex direction="column" gap="2">
                      <Flex justify="between" align="center">
                        <Box>
                          <Text size="2" weight="bold">To: {preview.contactName}</Text>
                          <Text size="1" color="gray" as="div">{preview.contactEmail}</Text>
                        </Box>
                      </Flex>

                      <Box>
                        <Text size="1" color="gray" weight="bold">Subject:</Text>
                        <Text size="2">{preview.subject}</Text>
                      </Box>

                      <Box>
                        <Text size="1" color="gray" weight="bold" mb="1">Body:</Text>
                        <TextArea
                          value={preview.body}
                          onChange={(e) => {
                            const updated = new Map(generatedEmails);
                            const current = updated.get(emailId);
                            if (current) {
                              updated.set(emailId, { ...current, body: e.target.value });
                              setGeneratedEmails(updated);
                            }
                          }}
                          rows={6}
                        />
                      </Box>

                      <Text size="1" color="gray">
                        Follow-up to: {preview.originalSubject} ({preview.daysSinceOriginal}d ago)
                      </Text>
                    </Flex>
                  </Card>
                ))}
              </Flex>
            </ScrollArea>

            <Flex justify="between" align="center" mt="2">
              <button className={button({ variant: "ghost" })} onClick={() => setStep("select")}>
                <ArrowLeftIcon /> Back
              </button>
              <button className={button({})} onClick={handleSend} disabled={generatedEmails.size === 0 || sending}>
                {sending ? <><Spinner size="1" /> Sending...</> : <><PaperPlaneIcon /> Send {generatedEmails.size} Follow-up{generatedEmails.size !== 1 ? "s" : ""}</>}
              </button>
            </Flex>
          </Flex>
        )}
      </Dialog.Content>
    </Dialog.Root>
  );
}
