"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Box,
  Callout,
  Checkbox,
  Dialog,
  Flex,
  Select,
  Spinner,
  Text,
  TextArea,
  TextField,
} from "@radix-ui/themes";
import { button } from "@/recipes/button";
import {
  PaperPlaneIcon,
  MagicWandIcon,
  ClockIcon,
  Cross2Icon,
  ExclamationTriangleIcon,
} from "@radix-ui/react-icons";
import {
  useGenerateReplyMutation,
  useSendEmailMutation,
} from "@/__generated__/hooks";
import { REPLY_TYPE_OPTIONS } from "@/lib/email/reply-types";
import { vadimSignature } from "@/lib/email/signature";

interface ReplyFormProps {
  originalEmail: {
    from: string;
    to: string | string[];
    subject?: string | null;
    html?: string | null;
    text?: string | null;
    replyToOptions?: Array<{
      value: string;
      label: string;
    }> | null;
    recommendedReplyTo?: string | null;
  };
  onSuccess?: () => void;
}

export function ReplyForm({ originalEmail, onSuccess }: ReplyFormProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [additionalDetails, setAdditionalDetails] = useState("");
  const [replyType, setReplyType] = useState<string>("polite_decline");
  const [error, setError] = useState("");
  const [includeCalendly, setIncludeCalendly] = useState(false);
  const [selectedRecipient, setSelectedRecipient] = useState<string>(
    originalEmail.recommendedReplyTo || originalEmail.from,
  );

  const [generateReply, { loading: generating }] = useGenerateReplyMutation();
  const [sendEmail, { loading: sending }] = useSendEmailMutation();

  const recipientOptions = originalEmail.replyToOptions || [
    {
      value: originalEmail.from,
      label: `${originalEmail.from} (Original Sender)`,
    },
  ];

  const handleGenerate = async () => {
    setError("");
    try {
      const originalContent = originalEmail.text || originalEmail.html || "";
      const { data } = await generateReply({
        variables: {
          input: {
            originalEmailContent: originalContent,
            originalSender: originalEmail.from,
            additionalDetails: additionalDetails || undefined,
            tone: "professional",
            replyType: replyType || undefined,
            includeCalendly,
            replyTo: selectedRecipient,
          },
        },
      });

      if (data?.generateReply) {
        setMessage(data.generateReply.body);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to generate reply");
    }
  };

  const handleSend = async () => {
    if (!message.trim()) {
      setError("Please enter a message");
      return;
    }
    setError("");

    try {
      const calendlyLink = includeCalendly
        ? `<p><a href="https://calendly.com/nicolad" style="color: #228be6; text-decoration: none;">Schedule a call: https://calendly.com/nicolad</a></p>`
        : "";

      const replyHtml = `
        <div style="font-family: system-ui, -apple-system, sans-serif; max-width: 600px;">
          <div style="white-space: pre-wrap;">${message.replace(/\n/g, "<br>")}</div>
          ${calendlyLink}
          ${vadimSignature}
          <br>
          <hr style="border: none; border-top: 1px solid #e0e0e0; margin: 20px 0;">
          <div style="color: #666; font-size: 14px;">
            <p><strong>On ${new Date().toLocaleDateString()}, ${originalEmail.from} wrote:</strong></p>
            <blockquote style="margin: 10px 0; padding-left: 15px; border-left: 3px solid #e0e0e0; color: #666;">
              ${originalEmail.html || originalEmail.text?.replace(/\n/g, "<br>") || ""}
            </blockquote>
          </div>
        </div>
      `;

      const { data } = await sendEmail({
        variables: {
          input: {
            to: selectedRecipient,
            subject: originalEmail.subject?.startsWith("Re: ")
              ? originalEmail.subject
              : `Re: ${originalEmail.subject || "No Subject"}`,
            html: replyHtml,
            text: message,
          },
        },
      });

      if (!data?.sendEmail.success) {
        throw new Error(data?.sendEmail.error || "Failed to schedule reply");
      }

      setMessage("");
      setOpen(false);
      onSuccess?.();
      router.refresh();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to send reply");
    }
  };

  const handleOpenChange = (isOpen: boolean) => {
    setOpen(isOpen);
    if (!isOpen) {
      setMessage("");
      setError("");
      setAdditionalDetails("");
    }
  };

  return (
    <Dialog.Root open={open} onOpenChange={handleOpenChange}>
      <Dialog.Trigger>
        <button className={button({ variant: "ghost" })}>
          <PaperPlaneIcon /> Reply
        </button>
      </Dialog.Trigger>

      <Dialog.Content
        maxWidth="600px"
        style={{ maxHeight: "90vh", overflowY: "auto" }}
      >
        <Flex justify="between" align="center" mb="4">
          <Dialog.Title>
            <Text size="5" weight="bold">
              Reply to Email
            </Text>
          </Dialog.Title>
          <Dialog.Close>
            <button className={button({ variant: "ghost", size: "sm" })} aria-label="Close">
              <Cross2Icon />
            </button>
          </Dialog.Close>
        </Flex>

        <Flex gap="1" align="center" mb="4">
          <ClockIcon />
          <Text size="1" color="gray">
            Email will be sent immediately
          </Text>
        </Flex>

        <Flex direction="column" gap="3">
          <Box>
            <Text size="2" weight="medium" mb="1">
              From
            </Text>
            <TextField.Root value="contact@vadim.blog" readOnly size="2" />
          </Box>

          {recipientOptions.length > 1 ? (
            <Box>
              <Text size="2" weight="medium" mb="1">
                Reply To
              </Text>
              <Select.Root
                value={selectedRecipient}
                onValueChange={setSelectedRecipient}
              >
                <Select.Trigger />
                <Select.Content>
                  {recipientOptions.map((opt) => (
                    <Select.Item key={opt.value} value={opt.value}>
                      {opt.label}
                    </Select.Item>
                  ))}
                </Select.Content>
              </Select.Root>
            </Box>
          ) : (
            <Box>
              <Text size="2" weight="medium" mb="1">
                To
              </Text>
              <TextField.Root
                value={originalEmail.from}
                readOnly
                size="2"
              />
            </Box>
          )}

          <Box>
            <Text size="2" weight="medium" mb="1">
              Subject
            </Text>
            <TextField.Root
              value={
                originalEmail.subject?.startsWith("Re: ")
                  ? originalEmail.subject
                  : `Re: ${originalEmail.subject || "No Subject"}`
              }
              readOnly
              size="2"
            />
          </Box>

          <Box>
            <Text size="2" weight="medium" mb="1">
              Reply Type
            </Text>
            <Select.Root value={replyType} onValueChange={setReplyType}>
              <Select.Trigger placeholder="Select reply type" />
              <Select.Content>
                {REPLY_TYPE_OPTIONS.map((opt) => (
                  <Select.Item key={opt.value} value={opt.value}>
                    {opt.label}
                  </Select.Item>
                ))}
              </Select.Content>
            </Select.Root>
          </Box>

          <Box>
            <Text size="2" weight="medium" mb="1">
              Additional Details (Optional)
            </Text>
            <TextArea
              placeholder="Add any specific details you want to include in the AI-generated reply..."
              value={additionalDetails}
              onChange={(e) => setAdditionalDetails(e.target.value)}
              rows={2}
              size="2"
            />
          </Box>

          <button
            className={button({ variant: "ghost" })}
            onClick={handleGenerate}
            disabled={generating}
          >
            {generating ? (
              <>
                <Spinner size="1" /> Generating AI Reply...
              </>
            ) : (
              <>
                <MagicWandIcon /> Generate AI Reply
              </>
            )}
          </button>

          <Box>
            <Text size="2" weight="medium" mb="1">
              Message
            </Text>
            <TextArea
              placeholder="Type your reply here or use the Generate AI Reply button..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={12}
              size="2"
            />
          </Box>

          <Flex gap="4" align="center">
            <Text as="label" size="2">
              <Flex gap="2" align="center">
                <Checkbox
                  checked={includeCalendly}
                  onCheckedChange={(checked) =>
                    setIncludeCalendly(checked === true)
                  }
                />
                Include Calendly link
              </Flex>
            </Text>
          </Flex>

          {error && (
            <Callout.Root color="red" size="1">
              <Callout.Icon>
                <ExclamationTriangleIcon />
              </Callout.Icon>
              <Callout.Text>{error}</Callout.Text>
            </Callout.Root>
          )}

          <Flex justify="end" gap="3">
            <Dialog.Close>
              <button className={button({ variant: "ghost" })} disabled={sending}>
                Cancel
              </button>
            </Dialog.Close>
            <button
              className={button({ variant: "ghost" })}
              onClick={handleSend}
              disabled={sending || !message.trim()}
            >
              {sending ? (
                <>
                  <Spinner size="1" /> Sending...
                </>
              ) : (
                <>
                  <PaperPlaneIcon /> Send Reply
                </>
              )}
            </button>
          </Flex>
        </Flex>
      </Dialog.Content>
    </Dialog.Root>
  );
}
