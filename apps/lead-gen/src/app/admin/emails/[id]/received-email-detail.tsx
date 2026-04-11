"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  useGetReceivedEmailQuery,
  useArchiveEmailMutation,
  useUnarchiveEmailMutation,
} from "@/__generated__/hooks";
import { button } from "@/recipes/button";
import { EmailComposer } from "@/components/admin/EmailComposer";
import {
  Badge,
  Box,
  Card,
  Container,
  Flex,
  Heading,
  Separator,
  Text,
} from "@radix-ui/themes";
import {
  ArrowLeftIcon,
  CheckCircledIcon,
  EnvelopeOpenIcon,
  PaperPlaneIcon,
} from "@radix-ui/react-icons";

const CLASSIFICATION_COLORS: Record<string, "green" | "red" | "orange" | "blue" | "gray" | "purple"> = {
  interested: "green",
  not_interested: "red",
  auto_reply: "gray",
  bounced: "orange",
  info_request: "blue",
  unsubscribe: "purple",
};

export function ReceivedEmailDetail({ emailId }: { emailId: number }) {
  const router = useRouter();
  const [replyOpen, setReplyOpen] = useState(false);
  const [toast, setToast] = useState<{ message: string } | null>(null);

  const handleSendSuccess = useCallback((toEmail: string) => {
    setToast({ message: `Email sent to ${toEmail}` });
  }, []);

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), 4000);
    return () => clearTimeout(timer);
  }, [toast]);

  const { data, loading, error, refetch } = useGetReceivedEmailQuery({
    variables: { id: emailId },
  });
  const [archiveEmail, { loading: archiving }] = useArchiveEmailMutation();
  const [unarchiveEmail, { loading: unarchiving }] = useUnarchiveEmailMutation();

  const email = data?.receivedEmail;

  if (loading) {
    return (
      <Container size="3" p="8">
        <Text color="gray">Loading…</Text>
      </Container>
    );
  }

  if (error || !email) {
    return (
      <Container size="3" p="8">
        <Flex direction="column" gap="3">
          <button
            className={button({ variant: "ghost", size: "sm" })}
            onClick={() => router.push("/admin/emails")}
          >
            <ArrowLeftIcon /> Back to Emails
          </button>
          <Card>
            <Text color="red" size="2">
              {error?.message || "Email not found"}
            </Text>
          </Card>
        </Flex>
      </Container>
    );
  }

  const isArchived = !!email.archivedAt;

  const handleToggleArchive = async () => {
    if (isArchived) {
      await unarchiveEmail({ variables: { id: emailId } });
    } else {
      await archiveEmail({ variables: { id: emailId } });
    }
    refetch();
  };

  return (
    <Container size="3" py="6" px="4">
      <Flex direction="column" gap="4">
        {/* Header */}
        <Flex justify="between" align="center">
          <button
            className={button({ variant: "ghost", size: "sm" })}
            onClick={() => router.push("/admin/emails")}
          >
            <ArrowLeftIcon /> Back to Emails
          </button>
          <Flex gap="2">
            <button
              className={button({ variant: "solid", size: "sm" })}
              onClick={() => setReplyOpen(true)}
            >
              <PaperPlaneIcon /> Reply
            </button>
            <button
              className={button({ variant: "ghost", size: "sm" })}
              onClick={handleToggleArchive}
              disabled={archiving || unarchiving}
            >
              {isArchived ? "Unarchive" : "Archive"}
            </button>
          </Flex>
        </Flex>

        {/* Subject + metadata */}
        <Card>
          <Flex direction="column" gap="3">
            <Flex gap="2" align="center">
              <EnvelopeOpenIcon width={20} height={20} />
              <Heading size="4">{email.subject || "(no subject)"}</Heading>
            </Flex>

            <Separator size="4" />

            <Flex direction="column" gap="1">
              <Flex gap="2" align="baseline">
                <Text size="2" weight="bold" style={{ minWidth: 50 }}>From</Text>
                <Text size="2">{email.fromEmail || "Unknown"}</Text>
              </Flex>
              <Flex gap="2" align="baseline">
                <Text size="2" weight="bold" style={{ minWidth: 50 }}>To</Text>
                <Text size="2">{email.toEmails?.join(", ") || "—"}</Text>
              </Flex>
              {email.ccEmails && email.ccEmails.length > 0 && (
                <Flex gap="2" align="baseline">
                  <Text size="2" weight="bold" style={{ minWidth: 50 }}>Cc</Text>
                  <Text size="2">{email.ccEmails.join(", ")}</Text>
                </Flex>
              )}
              {email.replyToEmails && email.replyToEmails.length > 0 && (
                <Flex gap="2" align="baseline">
                  <Text size="2" weight="bold" style={{ minWidth: 50 }}>Reply-To</Text>
                  <Text size="2">{email.replyToEmails.join(", ")}</Text>
                </Flex>
              )}
              <Flex gap="2" align="baseline">
                <Text size="2" weight="bold" style={{ minWidth: 50 }}>Date</Text>
                <Text size="2">{new Date(email.receivedAt).toLocaleString()}</Text>
              </Flex>
            </Flex>

            {/* Classification + status badges */}
            <Flex gap="2" wrap="wrap">
              {isArchived && <Badge color="gray" variant="soft">Archived</Badge>}
              {email.classification && (
                <Badge
                  color={CLASSIFICATION_COLORS[email.classification] || "gray"}
                  variant="soft"
                >
                  {email.classification}
                  {email.classificationConfidence != null &&
                    ` (${Math.round(email.classificationConfidence * 100)}%)`}
                </Badge>
              )}
              {email.matchedContactId && (
                <Badge color="blue" variant="soft">
                  Contact #{email.matchedContactId}
                </Badge>
              )}
            </Flex>
          </Flex>
        </Card>

        {/* Email body */}
        <Card>
          {email.htmlContent ? (
            <Box
              style={{
                maxHeight: "70vh",
                overflow: "auto",
              }}
              dangerouslySetInnerHTML={{ __html: email.htmlContent }}
            />
          ) : email.textContent ? (
            <Box
              style={{
                whiteSpace: "pre-wrap",
                fontFamily: "var(--default-font-family)",
                fontSize: "var(--font-size-2)",
                lineHeight: "var(--line-height-2)",
                maxHeight: "70vh",
                overflow: "auto",
              }}
            >
              {email.textContent}
            </Box>
          ) : (
            <Text color="gray" size="2">(no content)</Text>
          )}
        </Card>

        {/* Metadata footer */}
        {email.messageId && (
          <Text size="1" color="gray">
            Message-ID: {email.messageId}
          </Text>
        )}
      </Flex>

      {/* Reply dialog */}
      <EmailComposer
        open={replyOpen}
        onOpenChange={setReplyOpen}
        to={email.replyToEmails?.[0] || email.fromEmail || ""}
        name={email.fromEmail?.split("@")[0] || ""}
        subject={
          email.subject?.startsWith("Re:")
            ? email.subject
            : `Re: ${email.subject || ""}`
        }
        replyContext={
          `Replying to email from ${email.fromEmail || "unknown"} with subject "${email.subject || ""}". ` +
          `Original message:\n\n${email.textContent || "(no text content)"}`
        }
        onSuccess={handleSendSuccess}
      />

      {/* Success toast */}
      {toast && (
        <div
          style={{
            position: "fixed",
            bottom: 24,
            right: 24,
            padding: "12px 20px",
            backgroundColor: "#30A46C",
            color: "white",
            borderRadius: 6,
            boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
            zIndex: 9999,
            animation: "fadeIn 200ms ease-out",
          }}
        >
          <Flex align="center" gap="2">
            <CheckCircledIcon />
            <Text size="2" weight="medium">{toast.message}</Text>
          </Flex>
        </div>
      )}
    </Container>
  );
}
