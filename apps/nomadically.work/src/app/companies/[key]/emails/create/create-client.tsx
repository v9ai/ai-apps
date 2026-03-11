"use client";

import { useState } from "react";
import {
  useGetCompanyQuery,
  useGetContactsQuery,
} from "@/__generated__/hooks";
import Link from "next/link";
import { useAuth } from "@/lib/auth-hooks";
import { ADMIN_EMAIL } from "@/lib/constants";
import { useStreamingEmail } from "@/hooks/useStreamingEmail";
import { ComposeFromLinkedIn } from "@/components/admin/ComposeFromLinkedIn";
import { BatchEmailModal } from "@/components/admin/BatchEmailModal";
import {
  Badge,
  Box,
  Button,
  Callout,
  Checkbox,
  Code,
  Container,
  Flex,
  Heading,
  Select,
  Spinner,
  Tabs,
  Text,
  TextArea,
  TextField,
} from "@radix-ui/themes";
import {
  ArrowLeftIcon,
  CheckIcon,
  CopyIcon,
  EnvelopeClosedIcon,
  ExclamationTriangleIcon,
  InfoCircledIcon,
  LinkedInLogoIcon,
  MagicWandIcon,
  PaperPlaneIcon,
  PersonIcon,
} from "@radix-ui/react-icons";

// ─── Inline Compose ──────────────────────────────────────────────────────────

type Contact = NonNullable<
  NonNullable<ReturnType<typeof useGetContactsQuery>["data"]>["contacts"]
>["contacts"][number];

function InlineCompose({
  companyName,
  contacts,
  contactsLoading,
}: {
  companyName: string;
  contacts: Contact[];
  contactsLoading: boolean;
}) {
  const contactsWithEmail = contacts.filter((c) => c.email);

  const [selectedContactId, setSelectedContactId] = useState<string>("");
  const selectedContact = contactsWithEmail.find(
    (c) => String(c.id) === selectedContactId
  );

  const [instructions, setInstructions] = useState("");
  const [editSubject, setEditSubject] = useState("");
  const [editBody, setEditBody] = useState("");
  const [includeResume, setIncludeResume] = useState(false);
  const [sending, setSending] = useState(false);
  const [sendResult, setSendResult] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);
  const [step, setStep] = useState<"select" | "edit" | "sent">("select");
  const [copied, setCopied] = useState(false);

  const {
    content,
    partialContent,
    isStreaming,
    error: streamError,
    generate,
    stop,
    reset: resetStream,
  } = useStreamingEmail();

  const handleGenerate = async () => {
    if (!selectedContact) return;
    const name =
      [selectedContact.firstName, selectedContact.lastName]
        .filter(Boolean)
        .join(" ") || "there";
    await generate({
      recipientName: name,
      companyName,
      instructions: instructions || undefined,
    });
  };

  const handleProceedToEdit = () => {
    if (!content) return;
    setEditSubject(content.subject);
    setEditBody(content.body);
    setSendResult(null);
    setStep("edit");
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(`Subject: ${editSubject}\n\n${editBody}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSend = async () => {
    if (!selectedContact?.email) return;
    setSending(true);
    setSendResult(null);
    try {
      const res = await fetch("/api/emails/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contactId: selectedContact.id,
          to: selectedContact.email,
          name:
            [selectedContact.firstName, selectedContact.lastName]
              .filter(Boolean)
              .join(" ") || undefined,
          subject: editSubject,
          body: editBody,
          includeResume,
        }),
      });
      const json = (await res.json()) as {
        success: boolean;
        error?: string;
      };
      if (json.success) {
        setSendResult({
          type: "success",
          message: `Sent to ${selectedContact.email}`,
        });
        setStep("sent");
      } else {
        setSendResult({
          type: "error",
          message: json.error ?? "Send failed",
        });
      }
    } catch (err) {
      setSendResult({
        type: "error",
        message: err instanceof Error ? err.message : "Send failed",
      });
    } finally {
      setSending(false);
    }
  };

  const handleReset = () => {
    setSelectedContactId("");
    setInstructions("");
    setEditSubject("");
    setEditBody("");
    setIncludeResume(false);
    setSendResult(null);
    setCopied(false);
    setStep("select");
    resetStream();
  };

  if (contactsLoading) {
    return (
      <Flex justify="center" py="6">
        <Spinner size="2" />
      </Flex>
    );
  }

  if (contactsWithEmail.length === 0) {
    return (
      <Callout.Root color="gray" variant="soft">
        <Callout.Icon>
          <InfoCircledIcon />
        </Callout.Icon>
        <Callout.Text>
          No contacts with email addresses found for this company.
        </Callout.Text>
      </Callout.Root>
    );
  }

  return (
    <Flex direction="column" gap="4">
      {step === "select" && (
        <>
          <Box>
            <Text size="1" color="gray" weight="medium" mb="1" as="p">
              Contact
            </Text>
            <Select.Root
              value={selectedContactId}
              onValueChange={setSelectedContactId}
            >
              <Select.Trigger placeholder="Select a contact..." style={{ width: "100%" }} />
              <Select.Content>
                {contactsWithEmail.map((c) => (
                  <Select.Item key={c.id} value={String(c.id)}>
                    {[c.firstName, c.lastName].filter(Boolean).join(" ")}
                    {c.position ? ` — ${c.position}` : ""} ({c.email})
                  </Select.Item>
                ))}
              </Select.Content>
            </Select.Root>
          </Box>

          {selectedContact && (
            <>
              <Box>
                <Text size="1" color="gray" weight="medium" mb="1" as="p">
                  Instructions (optional)
                </Text>
                <TextArea
                  placeholder="E.g. mention their work on open-source, ask about remote roles..."
                  value={instructions}
                  onChange={(e) => setInstructions(e.target.value)}
                  rows={3}
                  disabled={isStreaming}
                />
              </Box>

              <Flex gap="2">
                <Button
                  onClick={handleGenerate}
                  loading={isStreaming}
                  disabled={isStreaming}
                >
                  <MagicWandIcon />
                  {isStreaming ? "Generating..." : "Generate Email"}
                </Button>
                {isStreaming && (
                  <Button variant="soft" color="red" onClick={stop}>
                    Stop
                  </Button>
                )}
                {content && !isStreaming && (
                  <Button
                    variant="soft"
                    color="gray"
                    onClick={() => resetStream()}
                  >
                    Regenerate
                  </Button>
                )}
              </Flex>

              {streamError && (
                <Callout.Root color="red" size="1">
                  <Callout.Icon>
                    <ExclamationTriangleIcon />
                  </Callout.Icon>
                  <Callout.Text>{streamError}</Callout.Text>
                </Callout.Root>
              )}

              {isStreaming && partialContent && (
                <Box>
                  <Text size="1" color="gray" mb="1" as="p">
                    Streaming...
                  </Text>
                  <Code
                    size="1"
                    style={{
                      display: "block",
                      whiteSpace: "pre-wrap",
                      maxHeight: 200,
                      overflow: "auto",
                    }}
                  >
                    {partialContent}
                  </Code>
                </Box>
              )}

              {content && !isStreaming && (
                <>
                  <Box
                    style={{
                      background: "var(--green-a2)",
                      borderRadius: "var(--radius-3)",
                      padding: "var(--space-4)",
                      border: "1px solid var(--green-a5)",
                    }}
                  >
                    <Flex justify="between" align="center" mb="2">
                      <Badge color="green" size="1">
                        <CheckIcon /> Generated
                      </Badge>
                    </Flex>
                    <Text size="1" color="gray" weight="bold" as="p" mb="1">
                      SUBJECT
                    </Text>
                    <Text size="2" weight="medium" as="p" mb="3">
                      {content.subject}
                    </Text>
                    <Text size="1" color="gray" weight="bold" as="p" mb="1">
                      BODY
                    </Text>
                    <Text
                      size="2"
                      as="p"
                      style={{ whiteSpace: "pre-wrap", lineHeight: "1.6" }}
                    >
                      {content.body}
                    </Text>
                  </Box>

                  <Flex asChild gap="2" align="center">
                    <label>
                      <Checkbox
                        checked={includeResume}
                        onCheckedChange={(checked) =>
                          setIncludeResume(checked === true)
                        }
                      />
                      <Text size="2">Attach resume</Text>
                    </label>
                  </Flex>

                  <Flex justify="end">
                    <Button onClick={handleProceedToEdit}>Edit & Send</Button>
                  </Flex>
                </>
              )}
            </>
          )}
        </>
      )}

      {step === "edit" && (
        <>
          <Box>
            <Text size="1" color="gray" weight="medium" mb="1" as="p">
              To
            </Text>
            <TextField.Root value={selectedContact?.email ?? ""} disabled />
          </Box>

          <Box>
            <Text size="1" color="gray" weight="medium" mb="1" as="p">
              Subject
            </Text>
            <TextField.Root
              value={editSubject}
              onChange={(e) => setEditSubject(e.target.value)}
            />
          </Box>

          <Box>
            <Text size="1" color="gray" weight="medium" mb="1" as="p">
              Body
            </Text>
            <TextArea
              value={editBody}
              onChange={(e) => setEditBody(e.target.value)}
              rows={12}
              style={{ fontFamily: "var(--default-font-family)" }}
            />
          </Box>

          <Flex asChild gap="2" align="center">
            <label>
              <Checkbox
                checked={includeResume}
                onCheckedChange={(checked) =>
                  setIncludeResume(checked === true)
                }
              />
              <Text size="2">Attach resume</Text>
            </label>
          </Flex>

          {sendResult && (
            <Callout.Root
              color={sendResult.type === "success" ? "green" : "red"}
              size="1"
            >
              <Callout.Icon>
                {sendResult.type === "success" ? (
                  <CheckIcon />
                ) : (
                  <ExclamationTriangleIcon />
                )}
              </Callout.Icon>
              <Callout.Text>{sendResult.message}</Callout.Text>
            </Callout.Root>
          )}

          <Flex gap="2" justify="between">
            <Button
              variant="soft"
              color="gray"
              onClick={() => setStep("select")}
            >
              Back
            </Button>
            <Flex gap="2">
              <Button variant="soft" onClick={handleCopy}>
                {copied ? <CheckIcon /> : <CopyIcon />}
                {copied ? "Copied" : "Copy"}
              </Button>
              <Button
                onClick={handleSend}
                loading={sending}
                disabled={sending || !editSubject || !editBody}
              >
                <PaperPlaneIcon />
                Send
              </Button>
            </Flex>
          </Flex>
        </>
      )}

      {step === "sent" && (
        <>
          <Callout.Root
            color={sendResult?.type === "success" ? "green" : "red"}
            size="2"
          >
            <Callout.Icon>
              {sendResult?.type === "success" ? (
                <CheckIcon />
              ) : (
                <ExclamationTriangleIcon />
              )}
            </Callout.Icon>
            <Callout.Text>
              {sendResult?.message ?? "Email sent successfully."}
            </Callout.Text>
          </Callout.Root>

          <Button variant="soft" onClick={handleReset}>
            Compose Another
          </Button>
        </>
      )}
    </Flex>
  );
}

// ─── Main Component ──────────────────────────────────────────────────────────

export function CreateEmailClient({
  companyKey,
}: {
  companyKey: string;
}) {
  const { user } = useAuth();
  const isAdmin = user?.email === ADMIN_EMAIL;

  const { data: companyData, loading: companyLoading } = useGetCompanyQuery({
    variables: { key: companyKey },
    skip: !isAdmin,
  });

  const company = companyData?.company ?? null;

  const { data: contactsData, loading: contactsLoading } =
    useGetContactsQuery({
      variables: { companyId: company?.id ?? 0, limit: 100 },
      skip: !company,
    });

  const contacts = contactsData?.contacts?.contacts ?? [];

  const batchRecipients = contacts
    .filter((c) => c.email && !c.doNotContact)
    .map((c) => ({
      email: c.email as string,
      name: `${c.firstName ?? ""} ${c.lastName ?? ""}`.trim(),
    }));

  const [batchEmailOpen, setBatchEmailOpen] = useState(false);

  if (!isAdmin) {
    return (
      <Container size="3" p="8">
        <Callout.Root color="red">
          <Callout.Icon>
            <ExclamationTriangleIcon />
          </Callout.Icon>
          <Callout.Text>Access denied. Admin only.</Callout.Text>
        </Callout.Root>
      </Container>
    );
  }

  if (companyLoading) {
    return (
      <Container size="3" p="8">
        <Flex justify="center">
          <Spinner size="3" />
        </Flex>
      </Container>
    );
  }

  if (!company) {
    return (
      <Container size="3" p="8">
        <Callout.Root color="gray">
          <Callout.Icon>
            <InfoCircledIcon />
          </Callout.Icon>
          <Callout.Text>Company not found.</Callout.Text>
        </Callout.Root>
      </Container>
    );
  }

  const contactsWithEmail = contacts.filter((c) => c.email);

  return (
    <Container size="3" p={{ initial: "4", md: "6" }}>
      <Flex direction="column" gap="5">
        {/* Header */}
        <Box>
          <Link
            href={`/companies/${companyKey}/emails`}
            style={{ textDecoration: "none" }}
          >
            <Flex align="center" gap="1" mb="3">
              <ArrowLeftIcon />
              <Text size="2" color="gray">
                Emails
              </Text>
            </Flex>
          </Link>
          <Flex align="center" gap="3">
            <Heading size="6">Compose Email</Heading>
            <Badge color="gray" variant="soft" size="2">
              {company.name}
            </Badge>
          </Flex>
        </Box>

        {/* Tabbed compose modes */}
        <Tabs.Root defaultValue="contact">
          <Tabs.List>
            <Tabs.Trigger value="contact">
              <Flex align="center" gap="2">
                <PersonIcon />
                <Text>Contact</Text>
                {!contactsLoading && contactsWithEmail.length > 0 && (
                  <Badge
                    color="gray"
                    variant="soft"
                    size="1"
                    style={{ minWidth: 20, textAlign: "center" }}
                  >
                    {contactsWithEmail.length}
                  </Badge>
                )}
              </Flex>
            </Tabs.Trigger>
            <Tabs.Trigger value="linkedin">
              <Flex align="center" gap="2">
                <LinkedInLogoIcon />
                <Text>LinkedIn</Text>
              </Flex>
            </Tabs.Trigger>
            <Tabs.Trigger value="batch">
              <Flex align="center" gap="2">
                <EnvelopeClosedIcon />
                <Text>Batch</Text>
                {!contactsLoading && batchRecipients.length > 0 && (
                  <Badge
                    color="blue"
                    variant="soft"
                    size="1"
                    style={{ minWidth: 20, textAlign: "center" }}
                  >
                    {batchRecipients.length}
                  </Badge>
                )}
              </Flex>
            </Tabs.Trigger>
          </Tabs.List>

          <Box pt="5">
            <Tabs.Content value="contact">
              <Box
                style={{
                  background: "var(--gray-a2)",
                  borderRadius: "var(--radius-3)",
                  padding: "var(--space-5)",
                  maxWidth: 640,
                }}
              >
                <Text size="2" color="gray" mb="4" as="p">
                  Select a contact and generate a personalized email with AI.
                </Text>
                <InlineCompose
                  companyName={company.name}
                  contacts={contacts}
                  contactsLoading={contactsLoading}
                />
              </Box>
            </Tabs.Content>

            <Tabs.Content value="linkedin">
              <Box
                style={{
                  background: "var(--gray-a2)",
                  borderRadius: "var(--radius-3)",
                  padding: "var(--space-5)",
                  maxWidth: 640,
                }}
              >
                <Text size="2" color="gray" mb="4" as="p">
                  Extract content from a LinkedIn post and compose a personalized
                  outreach email.
                </Text>
                <ComposeFromLinkedIn defaultCompanyName={company.name} />
              </Box>
            </Tabs.Content>

            <Tabs.Content value="batch">
              <Box
                style={{
                  background: "var(--gray-a2)",
                  borderRadius: "var(--radius-3)",
                  padding: "var(--space-5)",
                  maxWidth: 640,
                }}
              >
                <Text size="2" color="gray" mb="4" as="p">
                  Send a personalized email to all eligible contacts at once, with
                  optional business-day scheduling.
                </Text>
                {contactsLoading ? (
                  <Flex justify="center" py="6">
                    <Spinner size="2" />
                  </Flex>
                ) : batchRecipients.length === 0 ? (
                  <Callout.Root color="gray" variant="soft">
                    <Callout.Icon>
                      <InfoCircledIcon />
                    </Callout.Icon>
                    <Callout.Text>
                      No eligible contacts with email addresses found.
                    </Callout.Text>
                  </Callout.Root>
                ) : (
                  <Flex direction="column" gap="4">
                    <Flex align="center" gap="2">
                      <PersonIcon />
                      <Badge color="blue" variant="soft" size="2">
                        {batchRecipients.length} recipient
                        {batchRecipients.length === 1 ? "" : "s"}
                      </Badge>
                      <Text size="1" color="gray">
                        eligible (have email, not on do-not-contact list)
                      </Text>
                    </Flex>
                    <Button
                      onClick={() => setBatchEmailOpen(true)}
                      style={{ alignSelf: "flex-start" }}
                    >
                      <PaperPlaneIcon />
                      Compose Batch Email
                    </Button>
                    <BatchEmailModal
                      open={batchEmailOpen}
                      onOpenChange={setBatchEmailOpen}
                      recipients={batchRecipients}
                      defaultUseScheduler
                    />
                  </Flex>
                )}
              </Box>
            </Tabs.Content>
          </Box>
        </Tabs.Root>
      </Flex>
    </Container>
  );
}
