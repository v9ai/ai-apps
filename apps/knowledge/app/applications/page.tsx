"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Badge,
  Button,
  Card,
  Dialog,
  Flex,
  Heading,
  Select,
  Text,
  TextArea,
  TextField,
} from "@radix-ui/themes";
import { useSession } from "@/lib/auth-client";

type Application = {
  id: string;
  company: string;
  position: string;
  url: string | null;
  status: string;
  appliedAt: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
};

const STATUS_OPTIONS = [
  "saved",
  "applied",
  "interviewing",
  "offer",
  "rejected",
] as const;

const STATUS_COLORS: Record<string, "gray" | "blue" | "orange" | "green" | "red"> = {
  saved: "gray",
  applied: "blue",
  interviewing: "orange",
  offer: "green",
  rejected: "red",
};

const EMPTY_FORM = {
  company: "",
  position: "",
  url: "",
  status: "saved",
  notes: "",
  appliedAt: "",
};

export default function ApplicationsPage() {
  const { data: session, isPending } = useSession();
  const router = useRouter();
  const [apps, setApps] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);

  useEffect(() => {
    if (!isPending && !session?.user) {
      router.push("/login");
    }
  }, [isPending, session, router]);

  useEffect(() => {
    if (session?.user) {
      fetch("/api/applications")
        .then((r) => r.json())
        .then(setApps)
        .finally(() => setLoading(false));
    }
  }, [session]);

  if (isPending || !session?.user) return null;

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    const res = await fetch("/api/applications", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...form,
        appliedAt: form.appliedAt || null,
      }),
    });
    if (res.ok) {
      const row = await res.json();
      setApps((prev) => [row, ...prev]);
      setForm(EMPTY_FORM);
      setDialogOpen(false);
    }
  }

  async function handleStatusChange(id: string, status: string) {
    const res = await fetch(`/api/applications/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    if (res.ok) {
      const updated = await res.json();
      setApps((prev) => prev.map((a) => (a.id === id ? updated : a)));
    }
  }

  async function handleDelete(id: string) {
    const res = await fetch(`/api/applications/${id}`, { method: "DELETE" });
    if (res.ok) {
      setApps((prev) => prev.filter((a) => a.id !== id));
    }
  }

  return (
    <div className="apps-page">
      <div className="apps-topbar">
        <Link href="/" className="apps-back">
          &larr; Back
        </Link>
        <Heading size="5">Applications</Heading>
        <Dialog.Root open={dialogOpen} onOpenChange={setDialogOpen}>
          <Dialog.Trigger>
            <Button size="2">+ Add</Button>
          </Dialog.Trigger>
          <Dialog.Content maxWidth="480px">
            <Dialog.Title>New Application</Dialog.Title>
            <form onSubmit={handleAdd}>
              <Flex direction="column" gap="3" mt="3">
                <Flex direction="column" gap="1">
                  <Text as="label" size="2" weight="medium">Company *</Text>
                  <TextField.Root
                    value={form.company}
                    onChange={(e) => setForm((f) => ({ ...f, company: e.target.value }))}
                    required
                  />
                </Flex>
                <Flex direction="column" gap="1">
                  <Text as="label" size="2" weight="medium">Position *</Text>
                  <TextField.Root
                    value={form.position}
                    onChange={(e) => setForm((f) => ({ ...f, position: e.target.value }))}
                    required
                  />
                </Flex>
                <Flex direction="column" gap="1">
                  <Text as="label" size="2" weight="medium">Job URL</Text>
                  <TextField.Root
                    type="url"
                    value={form.url}
                    onChange={(e) => setForm((f) => ({ ...f, url: e.target.value }))}
                  />
                </Flex>
                <Flex direction="column" gap="1">
                  <Text as="label" size="2" weight="medium">Status</Text>
                  <Select.Root value={form.status} onValueChange={(v) => setForm((f) => ({ ...f, status: v }))}>
                    <Select.Trigger />
                    <Select.Content>
                      {STATUS_OPTIONS.map((s) => (
                        <Select.Item key={s} value={s}>
                          {s.charAt(0).toUpperCase() + s.slice(1)}
                        </Select.Item>
                      ))}
                    </Select.Content>
                  </Select.Root>
                </Flex>
                <Flex direction="column" gap="1">
                  <Text as="label" size="2" weight="medium">Applied Date</Text>
                  <TextField.Root
                    type="date"
                    value={form.appliedAt}
                    onChange={(e) => setForm((f) => ({ ...f, appliedAt: e.target.value }))}
                  />
                </Flex>
                <Flex direction="column" gap="1">
                  <Text as="label" size="2" weight="medium">Notes</Text>
                  <TextArea
                    value={form.notes}
                    onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                    rows={3}
                  />
                </Flex>
                <Flex gap="3" justify="end" mt="2">
                  <Dialog.Close>
                    <Button variant="soft" color="gray" type="button">Cancel</Button>
                  </Dialog.Close>
                  <Button type="submit">Save</Button>
                </Flex>
              </Flex>
            </form>
          </Dialog.Content>
        </Dialog.Root>
      </div>

      {loading ? (
        <Text size="3" color="gray" align="center" style={{ padding: 48 }}>
          Loading...
        </Text>
      ) : apps.length === 0 ? (
        <Flex direction="column" align="center" gap="3" style={{ padding: 64 }}>
          <Text size="4" color="gray">No applications yet</Text>
          <Text size="2" color="gray">Click &quot;+ Add&quot; to track your first job application.</Text>
        </Flex>
      ) : (
        <div className="apps-grid">
          {apps.map((app) => (
            <Card key={app.id} className="apps-card" asChild>
              <Link href={`/applications/${app.id}`} style={{ textDecoration: "none", color: "inherit" }}>
              <Flex direction="column" gap="2">
                <Flex justify="between" align="start">
                  <Flex direction="column" gap="1">
                    <Text size="3" weight="bold">{app.position}</Text>
                    <Text size="2" color="gray">{app.company}</Text>
                  </Flex>
                  <div onClick={(e) => e.preventDefault()}>
                    <Select.Root
                      value={app.status}
                      onValueChange={(v) => handleStatusChange(app.id, v)}
                    >
                      <Select.Trigger variant="ghost" />
                      <Select.Content>
                        {STATUS_OPTIONS.map((s) => (
                          <Select.Item key={s} value={s}>
                            {s.charAt(0).toUpperCase() + s.slice(1)}
                          </Select.Item>
                        ))}
                      </Select.Content>
                    </Select.Root>
                  </div>
                </Flex>
                <Flex gap="2" align="center" wrap="wrap">
                  <Badge color={STATUS_COLORS[app.status] || "gray"} variant="soft">
                    {app.status}
                  </Badge>
                  {app.appliedAt && (
                    <Text size="1" color="gray">
                      Applied {new Date(app.appliedAt).toLocaleDateString()}
                    </Text>
                  )}
                </Flex>
                {app.url && (
                  <a href={app.url} target="_blank" rel="noopener noreferrer" className="apps-link" onClick={(e) => e.stopPropagation()}>
                    View posting &rarr;
                  </a>
                )}
                {app.notes && (
                  <Text size="1" color="gray" style={{ whiteSpace: "pre-wrap" }}>
                    {app.notes}
                  </Text>
                )}
                <Flex justify="end" mt="1">
                  <Button
                    size="1"
                    variant="ghost"
                    color="red"
                    onClick={(e) => { e.preventDefault(); handleDelete(app.id); }}
                  >
                    Delete
                  </Button>
                </Flex>
              </Flex>
              </Link>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
