"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import {
  Badge,
  Button,
  Card,
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

export default function ApplicationDetailPage() {
  const { data: session, isPending } = useSession();
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const [app, setApp] = useState<Application | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({
    company: "",
    position: "",
    url: "",
    status: "saved",
    notes: "",
    appliedAt: "",
  });

  useEffect(() => {
    if (!isPending && !session?.user) {
      router.push("/login");
    }
  }, [isPending, session, router]);

  useEffect(() => {
    if (session?.user && params.id) {
      fetch(`/api/applications/${params.id}`)
        .then((r) => {
          if (!r.ok) throw new Error("Not found");
          return r.json();
        })
        .then((data) => {
          setApp(data);
          setForm({
            company: data.company,
            position: data.position,
            url: data.url || "",
            status: data.status,
            notes: data.notes || "",
            appliedAt: data.appliedAt ? data.appliedAt.slice(0, 10) : "",
          });
        })
        .catch(() => setApp(null))
        .finally(() => setLoading(false));
    }
  }, [session, params.id]);

  if (isPending || !session?.user) return null;

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    const res = await fetch(`/api/applications/${params.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...form,
        url: form.url || null,
        notes: form.notes || null,
        appliedAt: form.appliedAt || null,
      }),
    });
    if (res.ok) {
      const updated = await res.json();
      setApp(updated);
      setForm({
        company: updated.company,
        position: updated.position,
        url: updated.url || "",
        status: updated.status,
        notes: updated.notes || "",
        appliedAt: updated.appliedAt ? updated.appliedAt.slice(0, 10) : "",
      });
      setEditing(false);
    }
  }

  async function handleDelete() {
    const res = await fetch(`/api/applications/${params.id}`, { method: "DELETE" });
    if (res.ok) {
      router.push("/applications");
    }
  }

  if (loading) {
    return (
      <div className="apps-page">
        <Text size="3" color="gray" align="center" style={{ padding: 48 }}>
          Loading...
        </Text>
      </div>
    );
  }

  if (!app) {
    return (
      <div className="apps-page">
        <Flex direction="column" align="center" gap="3" style={{ padding: 64 }}>
          <Text size="4" color="gray">Application not found</Text>
          <Link href="/applications" className="apps-back">
            &larr; Back to applications
          </Link>
        </Flex>
      </div>
    );
  }

  return (
    <div className="apps-page">
      <div className="apps-topbar">
        <Link href="/applications" className="apps-back">
          &larr; Back
        </Link>
        <Heading size="5">{app.position}</Heading>
        <Flex gap="2">
          {!editing && (
            <Button size="2" variant="soft" onClick={() => setEditing(true)}>
              Edit
            </Button>
          )}
          <Button size="2" variant="soft" color="red" onClick={handleDelete}>
            Delete
          </Button>
        </Flex>
      </div>

      {editing ? (
        <Card>
          <form onSubmit={handleSave}>
            <Flex direction="column" gap="3" p="2">
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
                  rows={4}
                />
              </Flex>
              <Flex gap="3" justify="end" mt="2">
                <Button variant="soft" color="gray" type="button" onClick={() => setEditing(false)}>
                  Cancel
                </Button>
                <Button type="submit">Save</Button>
              </Flex>
            </Flex>
          </form>
        </Card>
      ) : (
        <Flex direction="column" gap="4">
          <Card>
            <Flex direction="column" gap="3" p="2">
              <Flex justify="between" align="center">
                <Text size="2" color="gray">Company</Text>
                <Text size="3" weight="bold">{app.company}</Text>
              </Flex>
              <Flex justify="between" align="center">
                <Text size="2" color="gray">Status</Text>
                <Badge color={STATUS_COLORS[app.status] || "gray"} variant="soft" size="2">
                  {app.status.charAt(0).toUpperCase() + app.status.slice(1)}
                </Badge>
              </Flex>
              {app.url && (
                <Flex justify="between" align="center">
                  <Text size="2" color="gray">Job URL</Text>
                  <a href={app.url} target="_blank" rel="noopener noreferrer" className="apps-link">
                    View posting &rarr;
                  </a>
                </Flex>
              )}
              {app.appliedAt && (
                <Flex justify="between" align="center">
                  <Text size="2" color="gray">Applied</Text>
                  <Text size="2">{new Date(app.appliedAt).toLocaleDateString()}</Text>
                </Flex>
              )}
              <Flex justify="between" align="center">
                <Text size="2" color="gray">Created</Text>
                <Text size="2">{new Date(app.createdAt).toLocaleDateString()}</Text>
              </Flex>
              <Flex justify="between" align="center">
                <Text size="2" color="gray">Updated</Text>
                <Text size="2">{new Date(app.updatedAt).toLocaleDateString()}</Text>
              </Flex>
            </Flex>
          </Card>

          {app.notes && (
            <Card>
              <Flex direction="column" gap="2" p="2">
                <Text size="2" color="gray" weight="medium">Notes</Text>
                <Text size="2" style={{ whiteSpace: "pre-wrap" }}>{app.notes}</Text>
              </Flex>
            </Card>
          )}
        </Flex>
      )}
    </div>
  );
}
