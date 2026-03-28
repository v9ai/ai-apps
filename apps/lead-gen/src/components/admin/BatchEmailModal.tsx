"use client";

import { useState } from "react";
import {
  Badge,
  Box,
  Callout,
  Checkbox,
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
  CalendarIcon,
  CheckCircledIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  ClockIcon,
  Cross2Icon,
  CrossCircledIcon,
  ExclamationTriangleIcon,
  MagicWandIcon,
  PaperPlaneIcon,
} from "@radix-ui/react-icons";

interface Recipient {
  email: string;
  name: string;
}

interface SendResult {
  email: string;
  status: "sent" | "failed";
  scheduledAt?: string;
  batchDay?: number;
}

interface FailedResult {
  email: string;
  error: string;
}

interface BatchSendResponse {
  success: boolean;
  message: string;
  sent: SendResult[];
  failed: FailedResult[];
  schedulingPlan?: string;
}

interface JobContext {
  title?: string;
  description?: string;
  requiredSkills?: string[];
  location?: string;
}

interface BatchEmailModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  recipients: Recipient[];
  jobContext?: JobContext;
  defaultUseScheduler?: boolean;
}

type ModalState = "compose" | "sending" | "done";

export function BatchEmailModal({
  open,
  onOpenChange,
  recipients,
  jobContext,
  defaultUseScheduler,
}: BatchEmailModalProps) {
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [state, setState] = useState<ModalState>("compose");
  const [result, setResult] = useState<BatchSendResponse | null>(null);
  const [sendError, setSendError] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);
  const [genError, setGenError] = useState<string | null>(null);
  const [instructions, setInstructions] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [useScheduler, setUseScheduler] = useState(defaultUseScheduler ?? false);
  const [showRecipients, setShowRecipients] = useState(false);

  function resetForm() {
    setSubject("");
    setBody("");
    setState("compose");
    setResult(null);
    setSendError(null);
    setGenerating(false);
    setGenError(null);
    setInstructions("");
    setCompanyName("");
    setUseScheduler(defaultUseScheduler ?? false);
    setShowRecipients(false);
  }

  function handleOpenChange(nextOpen: boolean) {
    if (!nextOpen) resetForm();
    onOpenChange(nextOpen);
  }

  async function handleGenerate() {
    setGenerating(true);
    setGenError(null);
    try {
      const res = await fetch("/api/emails/generate-batch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          companyName: companyName.trim() || undefined,
          instructions: instructions.trim() || undefined,
          recipientCount: recipients.length,
          jobContext: jobContext || undefined,
        }),
      });
      if (!res.ok) {
        const err = await res.text();
        throw new Error(err || `HTTP ${res.status}`);
      }
      const data = (await res.json()) as { subject: string; body: string };
      setSubject(data.subject);
      setBody(data.body);
    } catch (err) {
      setGenError(err instanceof Error ? err.message : "Generation failed");
    } finally {
      setGenerating(false);
    }
  }

  async function handleSend() {
    if (!subject.trim() || !body.trim() || recipients.length === 0) return;

    setState("sending");
    setSendError(null);
    setResult(null);

    try {
      const payload: {
        recipients: Recipient[];
        subject: string;
        body: string;
        useScheduler?: boolean;
      } = {
        recipients,
        subject: subject.trim(),
        body: body.trim(),
        useScheduler,
      };

      const response = await fetch("/api/emails/batch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = (await response.json()) as BatchSendResponse;
      setResult(data);
      setState("done");
    } catch (err) {
      setSendError(err instanceof Error ? err.message : "Unexpected error");
      setState("compose");
    }
  }

  /** Preview first few recipients with personalized greeting */
  function previewPersonalization(name: string): string {
    const firstName = name.split(" ")[0] || name;
    const preview = body.replace(/\{\{name\}\}/g, firstName);
    const hasGreeting = /^(hi|hey|hello)\s+/i.test(preview.trim());
    if (!hasGreeting) return `Hi ${firstName},\n\n${preview}`;
    return preview;
  }

  const canSend =
    state === "compose" &&
    subject.trim().length > 0 &&
    body.trim().length > 0 &&
    recipients.length > 0;

  return (
    <Dialog.Root open={open} onOpenChange={handleOpenChange}>
      <Dialog.Content
        maxWidth="700px"
        style={{ maxHeight: "90vh", overflowY: "auto" }}
      >
        <Flex justify="between" align="center" mb="4">
          <Dialog.Title>
            <Heading size="5">Send Batch Email</Heading>
          </Dialog.Title>
          <Dialog.Close>
            <button className={button({ variant: "ghost", size: "sm" })} aria-label="Close">
              <Cross2Icon />
            </button>
          </Dialog.Close>
        </Flex>

        {state === "compose" && (
          <Flex direction="column" gap="4">
            {/* Recipients section */}
            <Box>
              <Flex gap="2" align="center" justify="between">
                <Flex gap="2" align="center">
                  <Text size="2" color="gray">
                    Recipients:
                  </Text>
                  <Badge color="blue" variant="soft" size="2">
                    {recipients.length} subscriber
                    {recipients.length === 1 ? "" : "s"}
                  </Badge>
                </Flex>
                <button
                  className={button({ variant: "ghost", size: "sm" })}
                  onClick={() => setShowRecipients(!showRecipients)}
                >
                  {showRecipients ? <ChevronUpIcon /> : <ChevronDownIcon />}
                  {showRecipients ? "Hide" : "Preview"}
                </button>
              </Flex>

              {showRecipients && (
                <Box
                  mt="2"
                  style={{
                    background: "var(--gray-a2)",
                    borderRadius: "var(--radius-2)",
                    padding: "var(--space-2)",
                  }}
                >
                  <ScrollArea style={{ maxHeight: 140 }}>
                    <Flex direction="column" gap="1">
                      {recipients.slice(0, 10).map((r) => (
                        <Flex key={r.email} gap="2" align="center">
                          <Text size="1" weight="medium">
                            {r.name}
                          </Text>
                          <Text size="1" color="gray">
                            {r.email}
                          </Text>
                        </Flex>
                      ))}
                      {recipients.length > 10 && (
                        <Text size="1" color="gray">
                          ...and {recipients.length - 10} more
                        </Text>
                      )}
                    </Flex>
                  </ScrollArea>
                </Box>
              )}
            </Box>

            {sendError !== null && (
              <Callout.Root color="red" size="1">
                <Callout.Icon>
                  <ExclamationTriangleIcon />
                </Callout.Icon>
                <Callout.Text>{sendError}</Callout.Text>
              </Callout.Root>
            )}

            {/* AI Generation */}
            <Box>
              <Text
                size="2"
                weight="medium"
                mb="2"
                style={{ display: "block" }}
              >
                AI Generation
              </Text>
              <Flex direction="column" gap="2">
                <TextField.Root
                  placeholder="Company name (optional)"
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  size="2"
                />
                <TextArea
                  placeholder="Instructions — e.g. pitch Rust/trading background, ask for a call"
                  value={instructions}
                  onChange={(e) => setInstructions(e.target.value)}
                  rows={3}
                  size="2"
                />
                <button
                  className={button({ variant: "ghost" })}
                  disabled={generating || state !== "compose"}
                  onClick={() => void handleGenerate()}
                >
                  {generating ? (
                    <>
                      <Spinner size="1" />
                      Generating with DeepSeek Reasoner...
                    </>
                  ) : (
                    <>
                      <MagicWandIcon />
                      Generate subject &amp; body
                    </>
                  )}
                </button>
                {genError !== null && (
                  <Callout.Root color="red" size="1">
                    <Callout.Icon>
                      <ExclamationTriangleIcon />
                    </Callout.Icon>
                    <Callout.Text>{genError}</Callout.Text>
                  </Callout.Root>
                )}
              </Flex>
            </Box>

            <Separator size="4" />

            {/* Subject */}
            <Box>
              <Text
                as="label"
                size="2"
                weight="medium"
                mb="1"
                style={{ display: "block" }}
              >
                Subject
              </Text>
              <TextField.Root
                placeholder="Email subject..."
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                size="2"
              />
            </Box>

            {/* Body */}
            <Box>
              <Text
                as="label"
                size="2"
                weight="medium"
                mb="1"
                style={{ display: "block" }}
              >
                Body
              </Text>
              <Text
                size="1"
                color="gray"
                mb="1"
                style={{ display: "block" }}
              >
                Use {"{{name}}"} for personalization. Separate paragraphs with a
                blank line.
              </Text>
              <TextArea
                placeholder={
                  "Hi {{name}},\n\nYour message here...\n\nThanks,\nThe Team"
                }
                value={body}
                onChange={(e) => setBody(e.target.value)}
                rows={10}
                size="2"
              />
            </Box>

            {/* Preview personalization */}
            {body.trim() && recipients.length > 0 && (
              <Box>
                <Text size="1" weight="medium" color="gray" mb="1" style={{ display: "block" }}>
                  Preview ({recipients[0].name}):
                </Text>
                <Box
                  style={{
                    background: "var(--gray-a2)",
                    borderRadius: "var(--radius-2)",
                    padding: "var(--space-2)",
                    fontSize: "var(--font-size-1)",
                    whiteSpace: "pre-wrap",
                    maxHeight: 120,
                    overflow: "auto",
                  }}
                >
                  {previewPersonalization(recipients[0].name)}
                </Box>
              </Box>
            )}

            <Separator size="4" />

            {/* Scheduling options */}
            <Box>
              <Text
                size="2"
                weight="medium"
                mb="2"
                style={{ display: "block" }}
              >
                Scheduling
              </Text>
              <Flex direction="column" gap="2">
                <Flex asChild gap="2" align="center">
                  <label>
                    <Checkbox
                      checked={useScheduler}
                      onCheckedChange={(checked) =>
                        setUseScheduler(checked === true)
                      }
                    />
                    <Text size="2">
                      Distribute across business days (Mon-Fri, 8am UTC)
                    </Text>
                  </label>
                </Flex>

                {useScheduler ? (
                  <Callout.Root color="blue" size="1">
                    <Callout.Icon>
                      <CalendarIcon />
                    </Callout.Icon>
                    <Callout.Text>
                      Emails will be distributed across business days with
                      random 2-45 minute delays between each. Adaptive rate:{" "}
                      {recipients.length < 50 ? "5" : Math.ceil(recipients.length / 30)}{" "}
                      emails/day.
                    </Callout.Text>
                  </Callout.Root>
                ) : (
                  <Flex gap="1" align="center">
                    <ClockIcon />
                    <Text size="1" color="gray">
                      All emails scheduled 10 minutes from now.
                    </Text>
                  </Flex>
                )}
              </Flex>
            </Box>

            <Flex justify="end" gap="3" mt="2">
              <Dialog.Close>
                <button className={button({ variant: "ghost" })}>
                  Cancel
                </button>
              </Dialog.Close>
              <button className={button({})} disabled={!canSend} onClick={handleSend}>
                <PaperPlaneIcon />
                {useScheduler ? "Schedule" : "Send"} to {recipients.length}{" "}
                recipient{recipients.length === 1 ? "" : "s"}
              </button>
            </Flex>
          </Flex>
        )}

        {state === "sending" && (
          <Flex direction="column" align="center" gap="4" py="8">
            <Spinner size="3" />
            <Text size="3" color="gray">
              {useScheduler
                ? "Scheduling emails across business days..."
                : "Sending emails..."}
            </Text>
          </Flex>
        )}

        {state === "done" && result !== null && (
          <Flex direction="column" gap="4">
            <Callout.Root
              color={result.success ? "green" : "orange"}
              size="1"
            >
              <Callout.Icon>
                {result.success ? (
                  <CheckCircledIcon />
                ) : (
                  <ExclamationTriangleIcon />
                )}
              </Callout.Icon>
              <Callout.Text>{result.message}</Callout.Text>
            </Callout.Root>

            {result.schedulingPlan && (
              <Callout.Root color="blue" size="1">
                <Callout.Icon>
                  <CalendarIcon />
                </Callout.Icon>
                <Callout.Text>{result.schedulingPlan}</Callout.Text>
              </Callout.Root>
            )}

            {result.sent.length > 0 && (
              <Box>
                <Flex gap="2" align="center" mb="2">
                  <CheckCircledIcon color="var(--green-9)" />
                  <Text size="2" weight="medium">
                    Sent ({result.sent.length})
                  </Text>
                </Flex>
                <ScrollArea style={{ maxHeight: 200 }}>
                  <Flex direction="column" gap="1">
                    {result.sent.map((r) => (
                      <Flex key={r.email} gap="2" align="center">
                        <Text size="1" color="gray">
                          {r.email}
                        </Text>
                        {r.batchDay && (
                          <Badge color="blue" variant="soft" size="1">
                            Day {r.batchDay}
                          </Badge>
                        )}
                        {r.scheduledAt && (
                          <Text size="1" color="gray">
                            {new Date(r.scheduledAt).toLocaleDateString("en-GB", {
                              weekday: "short",
                              month: "short",
                              day: "numeric",
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </Text>
                        )}
                      </Flex>
                    ))}
                  </Flex>
                </ScrollArea>
              </Box>
            )}

            {result.failed.length > 0 && (
              <Box>
                <Flex gap="2" align="center" mb="2">
                  <CrossCircledIcon color="var(--red-9)" />
                  <Text size="2" weight="medium">
                    Failed ({result.failed.length})
                  </Text>
                </Flex>
                <Flex direction="column" gap="1">
                  {result.failed.map((r) => (
                    <Text key={r.email} size="1" color="red">
                      {r.email}: {r.error}
                    </Text>
                  ))}
                </Flex>
              </Box>
            )}

            <Flex justify="end" gap="3" mt="2">
              <button className={button({ variant: "ghost" })} onClick={resetForm}>
                Compose Another
              </button>
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
