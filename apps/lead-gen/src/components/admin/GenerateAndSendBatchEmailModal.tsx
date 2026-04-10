"use client";

import { useState, useEffect } from "react";
import {
  Badge,
  Box,
  Callout,
  Dialog,
  Flex,
  Heading,
  ScrollArea,
  Separator,
  Spinner,
  Text,
  TextArea,
  TextField,
} from "@radix-ui/themes";
import { button } from "@/recipes/button";
import {
  CheckCircledIcon,
  Cross2Icon,
  ExclamationTriangleIcon,
  MagicWandIcon,
  PaperPlaneIcon,
  Pencil1Icon,
  ResetIcon,
} from "@radix-ui/react-icons";

interface Contact {
  id: number;
  firstName: string;
  lastName?: string;
  email: string;
}

interface PreviewEmail {
  contactId: number;
  contactName: string;
  contactEmail: string;
  subject: string;
  body: string;
}

interface JobContext {
  title?: string;
  description?: string;
  requiredSkills?: string[];
  location?: string;
}

interface GenerateAndSendBatchEmailModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  companyId: number;
  companyName?: string;
  contacts: Contact[];
  onSuccess?: () => void;
  jobContext?: JobContext;
}

type Step = "generate" | "preview" | "sending" | "done";

export function GenerateAndSendBatchEmailModal({
  open,
  onOpenChange,
  companyId,
  companyName,
  contacts,
  onSuccess,
  jobContext,
}: GenerateAndSendBatchEmailModalProps) {
  const [step, setStep] = useState<Step>("generate");
  const [instructions, setInstructions] = useState("");
  const [generatedEmails, setGeneratedEmails] = useState<PreviewEmail[]>([]);
  const [editedEmails, setEditedEmails] = useState<Map<number, PreviewEmail>>(
    new Map(),
  );
  const [generating, setGenerating] = useState(false);
  const [genError, setGenError] = useState<string | null>(null);
  const [sendResult, setSendResult] = useState<{
    sent: number;
    failed: number;
    message: string;
  } | null>(null);
  const [expandedContact, setExpandedContact] = useState<number | null>(null);

  useEffect(() => {
    if (open) {
      setStep("generate");
      setGeneratedEmails([]);
      setEditedEmails(new Map());
      setGenError(null);
      setSendResult(null);
      setInstructions("");
      setExpandedContact(null);
    }
  }, [open]);

  async function handleGenerate() {
    setGenerating(true);
    setGenError(null);

    try {
      // Generate a template email, then personalize for each contact
      const res = await fetch("/api/emails/generate-batch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          companyName: companyName || undefined,
          instructions: instructions.trim() || undefined,
          recipientCount: contacts.length,
          jobContext: jobContext || undefined,
        }),
      });

      if (!res.ok) {
        throw new Error(await res.text());
      }

      const template = (await res.json()) as { subject: string; body: string };

      // Personalize for each contact
      const emails: PreviewEmail[] = contacts.map((c) => {
        const firstName = c.firstName.split(" ")[0] || c.firstName;
        const body = template.body.replace(/\{\{name\}\}/g, firstName);
        const hasGreeting = /^(hi|hey|hello)\s+/i.test(body.trim());
        const finalBody = hasGreeting ? body : `Hi ${firstName},\n\n${body}`;

        return {
          contactId: c.id,
          contactName: `${c.firstName} ${c.lastName || ""}`.trim(),
          contactEmail: c.email,
          subject: template.subject,
          body: finalBody,
        };
      });

      setGeneratedEmails(emails);
      setStep("preview");
    } catch (err) {
      setGenError(err instanceof Error ? err.message : "Generation failed");
    } finally {
      setGenerating(false);
    }
  }

  function handleEdit(contactId: number, field: "subject" | "body", value: string) {
    const original = generatedEmails.find((e) => e.contactId === contactId);
    if (!original) return;
    const current = editedEmails.get(contactId) || { ...original };
    const updated = { ...current, [field]: value };
    setEditedEmails(new Map(editedEmails.set(contactId, updated)));
  }

  function getEmail(contactId: number): PreviewEmail {
    return editedEmails.get(contactId) || generatedEmails.find((e) => e.contactId === contactId)!;
  }

  async function handleSend() {
    setStep("sending");

    const emailsToSend = generatedEmails.map((e) => {
      const final = getEmail(e.contactId);
      return {
        email: final.contactEmail,
        name: final.contactName,
        contactId: e.contactId,
      };
    });

    try {
      const res = await fetch("/api/emails/batch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          recipients: emailsToSend.map((e) => ({ email: e.email, name: e.name, contactId: e.contactId, companyId })),
          subject: getEmail(generatedEmails[0].contactId).subject,
          body: getEmail(generatedEmails[0].contactId).body,
          useScheduler: true,
        }),
      });

      const data = await res.json();
      setSendResult({
        sent: data.sent?.length ?? 0,
        failed: data.failed?.length ?? 0,
        message: data.message,
      });
      setStep("done");
      onSuccess?.();
    } catch (err) {
      setGenError(err instanceof Error ? err.message : "Send failed");
      setStep("preview");
    }
  }

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Content
        maxWidth="750px"
        style={{ maxHeight: "90vh", overflowY: "auto" }}
      >
        <Flex justify="between" align="center" mb="4">
          <Dialog.Title>
            <Heading size="5">
              Generate & Send {companyName ? `— ${companyName}` : ""}
            </Heading>
          </Dialog.Title>
          <Dialog.Close>
            <button className={button({ variant: "ghost", size: "sm" })} aria-label="Close">
              <Cross2Icon />
            </button>
          </Dialog.Close>
        </Flex>

        {/* Step 1: Generate */}
        {step === "generate" && (
          <Flex direction="column" gap="4">
            <Callout.Root color="blue" size="1">
              <Callout.Text>
                Generating personalized emails for {contacts.length} contact
                {contacts.length === 1 ? "" : "s"}
              </Callout.Text>
            </Callout.Root>

            <TextArea
              placeholder="Special instructions (e.g., mention their recent work, ask about specific roles)"
              value={instructions}
              onChange={(e) => setInstructions(e.target.value)}
              rows={4}
              size="2"
            />

            {genError && (
              <Callout.Root color="red" size="1">
                <Callout.Icon>
                  <ExclamationTriangleIcon />
                </Callout.Icon>
                <Callout.Text>{genError}</Callout.Text>
              </Callout.Root>
            )}

            <Flex justify="end" gap="3">
              <Dialog.Close>
                <button className={button({ variant: "ghost" })}>
                  Cancel
                </button>
              </Dialog.Close>
              <button
                className={button({})}
                disabled={generating}
                onClick={handleGenerate}
              >
                {generating ? (
                  <>
                    <Spinner size="1" /> Generating...
                  </>
                ) : (
                  <>
                    <MagicWandIcon /> Generate Emails
                  </>
                )}
              </button>
            </Flex>
          </Flex>
        )}

        {/* Step 2: Preview & Edit */}
        {step === "preview" && (
          <Flex direction="column" gap="4">
            <Flex justify="between" align="center">
              <Badge color="violet" size="2">
                {generatedEmails.length} email
                {generatedEmails.length !== 1 ? "s" : ""} generated
              </Badge>
              <Text size="1" color="gray">
                Click to edit before sending
              </Text>
            </Flex>

            <ScrollArea style={{ maxHeight: 400 }}>
              <Flex direction="column" gap="2">
                {generatedEmails.map((email) => {
                  const current = getEmail(email.contactId);
                  const isEdited = editedEmails.has(email.contactId);
                  const isExpanded = expandedContact === email.contactId;

                  return (
                    <Box
                      key={email.contactId}
                      style={{
                        border: "1px solid var(--gray-a5)",
                        borderRadius: 6,
                        padding: "var(--space-3)",
                      }}
                    >
                      <Flex
                        justify="between"
                        align="center"
                        role="button"
                        tabIndex={0}
                        style={{ cursor: "pointer" }}
                        onClick={() =>
                          setExpandedContact(isExpanded ? null : email.contactId)
                        }
                        onKeyDown={(e) => {
                          if (e.key === "Enter" || e.key === " ") {
                            e.preventDefault();
                            setExpandedContact(isExpanded ? null : email.contactId);
                          }
                        }}
                        aria-expanded={isExpanded}
                      >
                        <Flex gap="2" align="center">
                          <Text size="2" weight="medium">
                            {email.contactName}
                          </Text>
                          <Text size="1" color="gray">
                            {email.contactEmail}
                          </Text>
                          {isEdited && (
                            <Badge color="amber" size="1" variant="soft">
                              <Pencil1Icon /> Edited
                            </Badge>
                          )}
                        </Flex>
                      </Flex>

                      {isExpanded && (
                        <Flex direction="column" gap="2" mt="3">
                          <TextField.Root
                            value={current.subject}
                            onChange={(e) =>
                              handleEdit(email.contactId, "subject", e.target.value)
                            }
                            size="2"
                          />
                          <TextArea
                            value={current.body}
                            onChange={(e) =>
                              handleEdit(email.contactId, "body", e.target.value)
                            }
                            rows={8}
                            size="2"
                          />
                        </Flex>
                      )}
                    </Box>
                  );
                })}
              </Flex>
            </ScrollArea>

            <Separator size="4" />

            <Flex justify="between">
              <button
                className={button({ variant: "ghost" })}
                onClick={() => {
                  setStep("generate");
                  setGeneratedEmails([]);
                  setEditedEmails(new Map());
                }}
              >
                <ResetIcon /> Back
              </button>
              <button className={button({ variant: "solidGreen" })} onClick={handleSend}>
                <PaperPlaneIcon /> Send All Emails
              </button>
            </Flex>
          </Flex>
        )}

        {/* Step 3: Sending */}
        {step === "sending" && (
          <Flex direction="column" align="center" gap="4" py="8">
            <Spinner size="3" />
            <Text size="3" color="gray">
              Scheduling emails...
            </Text>
          </Flex>
        )}

        {/* Step 4: Done */}
        {step === "done" && sendResult && (
          <Flex direction="column" gap="4">
            <Callout.Root
              color={sendResult.failed === 0 ? "green" : "orange"}
              size="1"
            >
              <Callout.Icon>
                <CheckCircledIcon />
              </Callout.Icon>
              <Callout.Text>{sendResult.message}</Callout.Text>
            </Callout.Root>

            <Flex direction="column" gap="1">
              <Text size="2">Sent: {sendResult.sent}</Text>
              {sendResult.failed > 0 && (
                <Text size="2" color="red">
                  Failed: {sendResult.failed}
                </Text>
              )}
            </Flex>

            <Flex justify="end">
              <Dialog.Close>
                <button className={button({})}>Done</button>
              </Dialog.Close>
            </Flex>
          </Flex>
        )}
      </Dialog.Content>
    </Dialog.Root>
  );
}
