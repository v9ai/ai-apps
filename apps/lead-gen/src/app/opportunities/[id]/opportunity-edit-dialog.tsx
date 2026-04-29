"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Box,
  Callout,
  Dialog,
  Flex,
  Select,
  Text,
  TextArea,
  TextField,
} from "@radix-ui/themes";
import { InfoCircledIcon, Pencil1Icon } from "@radix-ui/react-icons";
import { button } from "@/recipes/button";
import {
  updateOpportunity,
  type OpportunityEditableFields,
} from "../actions";

type EditableOpportunity = {
  id: string;
  title: string;
  url: string | null;
  source: string | null;
  status: string;
  reward_usd: number | null;
  reward_text: string | null;
  start_date: string | null;
  end_date: string | null;
  deadline: string | null;
  applied: boolean;
  applied_at: string | null;
  application_status: string | null;
  application_notes: string | null;
  raw_context: string | null;
};

const STATUS_OPTIONS = [
  "open",
  "applied",
  "interviewing",
  "offer",
  "rejected",
  "closed",
] as const;

// Truncate ISO datetime to YYYY-MM-DD for <input type="date">
function toDateInput(v: string | null): string {
  if (!v) return "";
  return v.length >= 10 ? v.slice(0, 10) : v;
}

// Truncate ISO datetime to YYYY-MM-DDTHH:MM for <input type="datetime-local">
function toDateTimeInput(v: string | null): string {
  if (!v) return "";
  return v.length >= 16 ? v.slice(0, 16) : v;
}

// Empty string from a form input means "clear the field" → null
function nullable(v: string): string | null {
  return v.trim() === "" ? null : v;
}

export function OpportunityEditDialog({
  opportunity: opp,
}: {
  opportunity: EditableOpportunity;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const [title, setTitle] = useState(opp.title);
  const [url, setUrl] = useState(opp.url ?? "");
  const [source, setSource] = useState(opp.source ?? "");
  const [status, setStatus] = useState(opp.status);
  const [rewardText, setRewardText] = useState(opp.reward_text ?? "");
  const [rewardUsd, setRewardUsd] = useState(
    opp.reward_usd != null ? String(opp.reward_usd) : "",
  );
  const [startDate, setStartDate] = useState(toDateInput(opp.start_date));
  const [endDate, setEndDate] = useState(toDateInput(opp.end_date));
  const [deadline, setDeadline] = useState(toDateInput(opp.deadline));
  const [applied, setApplied] = useState(opp.applied);
  const [appliedAt, setAppliedAt] = useState(toDateTimeInput(opp.applied_at));
  const [applicationStatus, setApplicationStatus] = useState(
    opp.application_status ?? "",
  );
  const [applicationNotes, setApplicationNotes] = useState(
    opp.application_notes ?? "",
  );
  const [rawContext, setRawContext] = useState(opp.raw_context ?? "");

  function reset() {
    setTitle(opp.title);
    setUrl(opp.url ?? "");
    setSource(opp.source ?? "");
    setStatus(opp.status);
    setRewardText(opp.reward_text ?? "");
    setRewardUsd(opp.reward_usd != null ? String(opp.reward_usd) : "");
    setStartDate(toDateInput(opp.start_date));
    setEndDate(toDateInput(opp.end_date));
    setDeadline(toDateInput(opp.deadline));
    setApplied(opp.applied);
    setAppliedAt(toDateTimeInput(opp.applied_at));
    setApplicationStatus(opp.application_status ?? "");
    setApplicationNotes(opp.application_notes ?? "");
    setRawContext(opp.raw_context ?? "");
    setError(null);
  }

  function handleOpenChange(next: boolean) {
    setOpen(next);
    if (!next) reset();
  }

  function handleSave() {
    setError(null);
    if (!title.trim()) {
      setError("Title is required");
      return;
    }

    const rewardUsdNum =
      rewardUsd.trim() === "" ? null : Number(rewardUsd);
    if (rewardUsdNum != null && Number.isNaN(rewardUsdNum)) {
      setError("Reward (USD) must be a number");
      return;
    }

    const fields: OpportunityEditableFields = {
      title: title.trim(),
      url: nullable(url),
      source: nullable(source),
      status,
      reward_text: nullable(rewardText),
      reward_usd: rewardUsdNum,
      start_date: nullable(startDate),
      end_date: nullable(endDate),
      deadline: nullable(deadline),
      applied,
      applied_at: applied ? (nullable(appliedAt) ?? new Date().toISOString()) : null,
      application_status: nullable(applicationStatus),
      application_notes: nullable(applicationNotes),
      raw_context: nullable(rawContext),
    };

    startTransition(async () => {
      const result = await updateOpportunity(opp.id, fields);
      if ("error" in result && result.error) {
        setError(result.error);
        return;
      }
      setOpen(false);
      router.refresh();
    });
  }

  return (
    <Dialog.Root open={open} onOpenChange={handleOpenChange}>
      <Dialog.Trigger>
        <button className={button({ variant: "ghost", size: "md" })}>
          <Pencil1Icon />
          Edit
        </button>
      </Dialog.Trigger>

      <Dialog.Content maxWidth="640px">
        <Dialog.Title>Edit opportunity</Dialog.Title>
        <Dialog.Description size="2" color="gray" mb="4">
          {opp.id}
        </Dialog.Description>

        <Flex direction="column" gap="3">
          <Box>
            <Text size="1" color="gray" weight="medium" mb="1" as="p">Title</Text>
            <TextField.Root value={title} onChange={(e) => setTitle(e.target.value)} />
          </Box>

          <Flex gap="3" wrap="wrap">
            <Box style={{ flex: 1, minWidth: 240 }}>
              <Text size="1" color="gray" weight="medium" mb="1" as="p">URL</Text>
              <TextField.Root
                type="url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
              />
            </Box>
            <Box style={{ width: 160 }}>
              <Text size="1" color="gray" weight="medium" mb="1" as="p">Source</Text>
              <TextField.Root
                value={source}
                onChange={(e) => setSource(e.target.value)}
              />
            </Box>
          </Flex>

          <Flex gap="3" wrap="wrap" align="end">
            <Box style={{ width: 160 }}>
              <Text size="1" color="gray" weight="medium" mb="1" as="p">Status</Text>
              <Select.Root value={status} onValueChange={setStatus}>
                <Select.Trigger />
                <Select.Content>
                  {STATUS_OPTIONS.map((s) => (
                    <Select.Item key={s} value={s}>{s}</Select.Item>
                  ))}
                </Select.Content>
              </Select.Root>
            </Box>
            <Box style={{ flex: 1, minWidth: 180 }}>
              <Text size="1" color="gray" weight="medium" mb="1" as="p">Compensation (text)</Text>
              <TextField.Root
                placeholder="e.g. €130k + bonus"
                value={rewardText}
                onChange={(e) => setRewardText(e.target.value)}
              />
            </Box>
            <Box style={{ width: 140 }}>
              <Text size="1" color="gray" weight="medium" mb="1" as="p">Reward (USD)</Text>
              <TextField.Root
                type="number"
                value={rewardUsd}
                onChange={(e) => setRewardUsd(e.target.value)}
              />
            </Box>
          </Flex>

          <Flex gap="3" wrap="wrap">
            <Box style={{ flex: 1, minWidth: 140 }}>
              <Text size="1" color="gray" weight="medium" mb="1" as="p">Start date</Text>
              <TextField.Root
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </Box>
            <Box style={{ flex: 1, minWidth: 140 }}>
              <Text size="1" color="gray" weight="medium" mb="1" as="p">End date</Text>
              <TextField.Root
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </Box>
            <Box style={{ flex: 1, minWidth: 140 }}>
              <Text size="1" color="gray" weight="medium" mb="1" as="p">Deadline</Text>
              <TextField.Root
                type="date"
                value={deadline}
                onChange={(e) => setDeadline(e.target.value)}
              />
            </Box>
          </Flex>

          <Flex gap="3" wrap="wrap" align="end">
            <Flex align="center" gap="2" style={{ minWidth: 100 }}>
              <input
                type="checkbox"
                id="oppAppliedEdit"
                checked={applied}
                onChange={(e) => setApplied(e.target.checked)}
              />
              <Text size="2" as="label" htmlFor="oppAppliedEdit">Applied</Text>
            </Flex>
            <Box style={{ flex: 1, minWidth: 200 }}>
              <Text size="1" color="gray" weight="medium" mb="1" as="p">Applied at</Text>
              <TextField.Root
                type="datetime-local"
                value={appliedAt}
                onChange={(e) => setAppliedAt(e.target.value)}
                disabled={!applied}
              />
            </Box>
            <Box style={{ flex: 1, minWidth: 180 }}>
              <Text size="1" color="gray" weight="medium" mb="1" as="p">Application status</Text>
              <TextField.Root
                placeholder="e.g. screening, take-home"
                value={applicationStatus}
                onChange={(e) => setApplicationStatus(e.target.value)}
              />
            </Box>
          </Flex>

          <Box>
            <Text size="1" color="gray" weight="medium" mb="1" as="p">Application notes</Text>
            <TextArea
              rows={3}
              value={applicationNotes}
              onChange={(e) => setApplicationNotes(e.target.value)}
            />
          </Box>

          <Box>
            <Text size="1" color="gray" weight="medium" mb="1" as="p">Job description / raw context</Text>
            <TextArea
              rows={8}
              value={rawContext}
              onChange={(e) => setRawContext(e.target.value)}
            />
          </Box>

          {error && (
            <Callout.Root color="red" size="1">
              <Callout.Icon><InfoCircledIcon /></Callout.Icon>
              <Callout.Text>{error}</Callout.Text>
            </Callout.Root>
          )}

          <Flex justify="between" gap="2" wrap="wrap">
            <Dialog.Close>
              <button className={button({ variant: "ghost" })}>Cancel</button>
            </Dialog.Close>
            <button
              className={button({ variant: "solidGreen" })}
              onClick={handleSave}
              disabled={isPending || !title.trim()}
            >
              {isPending ? "Saving…" : "Save"}
            </button>
          </Flex>
        </Flex>
      </Dialog.Content>
    </Dialog.Root>
  );
}
