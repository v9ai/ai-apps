"use client";

import { useState, useEffect } from "react";
import {
  Badge,
  Box,
  Callout,
  Card,
  Dialog,
  Flex,
  Heading,
  Spinner,
  Text,
  TextArea,
  TextField,
} from "@radix-ui/themes";
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

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Content
        maxWidth="650px"
        style={{ maxHeight: "90vh", overflowY: "auto" }}
      >
        <Flex justify="between" align="center" mb="4">
          <Dialog.Title>
            <Heading size="5">Edit Campaign</Heading>
          </Dialog.Title>
          <Dialog.Close>
            <button className={button({ variant: "ghost", size: "sm" })}>
              <Cross2Icon />
            </button>
          </Dialog.Close>
        </Flex>

        {loading ? (
          <Flex justify="center" py="8">
            <Spinner size="3" />
          </Flex>
        ) : (
          <Flex direction="column" gap="4">
            {success && (
              <Callout.Root color="green" size="1">
                <Callout.Icon>
                  <CheckCircledIcon />
                </Callout.Icon>
                <Callout.Text>{success}</Callout.Text>
              </Callout.Root>
            )}
            {error && (
              <Callout.Root color="red" size="1">
                <Callout.Icon>
                  <ExclamationTriangleIcon />
                </Callout.Icon>
                <Callout.Text>{error}</Callout.Text>
              </Callout.Root>
            )}

            {/* Campaign Name */}
            <Box>
              <Text size="2" weight="medium" mb="1">
                Campaign Name
              </Text>
              <TextField.Root
                value={campaignName}
                onChange={(e) => setCampaignName(e.target.value)}
                placeholder="Campaign name"
                size="2"
              />
            </Box>

            {/* Status */}
            {data?.emailCampaign && (
              <Flex gap="2" align="center">
                <Text size="2" color="gray">
                  Status:
                </Text>
                <Badge
                  color={
                    data.emailCampaign.status === "completed"
                      ? "green"
                      : data.emailCampaign.status === "running"
                        ? "orange"
                        : data.emailCampaign.status === "draft"
                          ? "gray"
                          : "red"
                  }
                  size="1"
                >
                  {data.emailCampaign.status}
                </Badge>
                <Text size="1" color="gray">
                  Sent: {data.emailCampaign.emailsSent}/
                  {data.emailCampaign.totalRecipients}
                </Text>
              </Flex>
            )}

            {/* Recipients */}
            <Box>
              <Text size="2" weight="medium" mb="1">
                Recipients
              </Text>
              <Flex gap="2" align="center">
                <Box style={{ flex: 1 }}>
                  <TextField.Root
                    value={recipientInput}
                    onChange={(e) => setRecipientInput(e.target.value)}
                    placeholder="Enter email address"
                    size="2"
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        handleAddRecipient();
                      }
                    }}
                  />
                </Box>
                <button
                  className={button({ variant: "ghost", size: "md" })}
                  onClick={handleAddRecipient}
                  disabled={!recipientInput.trim()}
                >
                  <PlusIcon />
                </button>
              </Flex>
              {recipients.length > 0 && (
                <Flex gap="1" wrap="wrap" mt="2">
                  {recipients.map((email) => (
                    <Badge key={email} color="gray" variant="soft" size="2">
                      {email}
                      <button
                        className={button({ variant: "ghost", size: "sm" })}
                        onClick={() => handleRemoveRecipient(email)}
                        style={{ marginLeft: 4, padding: 0 }}
                      >
                        <Cross2Icon />
                      </button>
                    </Badge>
                  ))}
                </Flex>
              )}
            </Box>

            {/* Email Sequence */}
            <Box>
              <Text size="2" weight="medium" mb="1">
                Email Sequence
              </Text>
              <Flex direction="column" gap="2">
                <TextField.Root
                  value={subjectInput}
                  onChange={(e) => setSubjectInput(e.target.value)}
                  placeholder="Subject"
                  size="2"
                />
                <Flex gap="2">
                  <Box style={{ flex: 1 }}>
                    <TextArea
                      value={bodyInput}
                      onChange={(e) => setBodyInput(e.target.value)}
                      placeholder="Body"
                      rows={3}
                      size="2"
                    />
                  </Box>
                  <button
                    className={button({ variant: "ghost", size: "md" })}
                    onClick={handleAddEmail}
                    disabled={!subjectInput.trim() || !bodyInput.trim()}
                  >
                    <PlusIcon />
                  </button>
                </Flex>
              </Flex>
              {emails.length > 0 && (
                <Flex direction="column" gap="1" mt="2">
                  {emails.map((email, i) => (
                    <Card key={`${i}-${email.subject}`} size="1">
                      <Flex justify="between" align="start" gap="2">
                        <Box style={{ flex: 1 }}>
                          <Text size="2" weight="medium">
                            {email.subject}
                          </Text>
                          <Text
                            size="1"
                            color="gray"
                            style={{ whiteSpace: "pre-wrap" }}
                          >
                            {email.body.substring(0, 100)}
                            {email.body.length > 100 ? "..." : ""}
                          </Text>
                        </Box>
                        <button
                          className={button({ variant: "ghost", size: "sm" })}
                          onClick={() => handleRemoveEmail(i)}
                        >
                          <Cross2Icon />
                        </button>
                      </Flex>
                    </Card>
                  ))}
                </Flex>
              )}
            </Box>

            {/* Actions */}
            <Flex justify="between" mt="2">
              <Flex gap="2">
                {data?.emailCampaign?.status === "draft" && (
                  <button
                    className={button({ variant: "solidGreen" })}
                    onClick={handleLaunch}
                    disabled={launching}
                  >
                    {launching ? (
                      <>
                        <Spinner size="1" /> Launching...
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
              </Flex>
              <Flex gap="2">
                <Dialog.Close>
                  <button className={button({ variant: "ghost" })}>
                    Cancel
                  </button>
                </Dialog.Close>
                <button
                  className={button({ variant: "ghost" })}
                  onClick={handleSave}
                  disabled={updating || !campaignName.trim()}
                >
                  {updating ? (
                    <>
                      <Spinner size="1" /> Saving...
                    </>
                  ) : (
                    <>
                      <Pencil1Icon /> Save
                    </>
                  )}
                </button>
              </Flex>
            </Flex>
          </Flex>
        )}
      </Dialog.Content>
    </Dialog.Root>
  );
}
