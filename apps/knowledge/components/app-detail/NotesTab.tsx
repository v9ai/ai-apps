"use client";

import { Heading, Button, Flex, Text, Box, Card, TextArea } from "@radix-ui/themes";
import { Pencil1Icon } from "@radix-ui/react-icons";
import { useState } from "react";
import type { AppData, TabBaseProps } from "./types";

interface NotesTabProps extends TabBaseProps {
  onUpdate: (updated: AppData) => void;
}

export function NotesTab({ app, isAdmin, onUpdate }: NotesTabProps) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState("");
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch(`/api/applications/${app.slug}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notes: value }),
      });
      if (res.ok) {
        const updated = await res.json();
        onUpdate(updated);
        setEditing(false);
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card style={{ borderLeft: "3px solid var(--amber-6)", borderRadius: 0 }}>
      <Flex justify="between" align="center" mb="3">
        <Heading size="4">Notes</Heading>
        {isAdmin && !editing && (
          <Button
            variant="soft"
            size="1"
            onClick={() => {
              setValue(app.notes ?? "");
              setEditing(true);
            }}
          >
            <Pencil1Icon /> {app.notes ? "Edit" : "Add Notes"}
          </Button>
        )}
      </Flex>
      {editing ? (
        <Flex direction="column" gap="2">
          <TextArea
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder="Add notes about this application..."
            rows={12}
            style={{ minHeight: 200 }}
          />
          <Flex gap="2" justify="end">
            <Button
              variant="soft"
              color="gray"
              size="1"
              onClick={() => setEditing(false)}
            >
              Cancel
            </Button>
            <Button size="1" onClick={handleSave} disabled={saving}>
              {saving ? "Saving\u2026" : "Save"}
            </Button>
          </Flex>
        </Flex>
      ) : app.notes ? (
        <Box style={{ lineHeight: 1.7, fontSize: "var(--font-size-2)" }}>
          <pre style={{ whiteSpace: "pre-wrap", fontFamily: "inherit", margin: 0 }}>
            {app.notes}
          </pre>
        </Box>
      ) : (
        <Flex
          direction="column"
          align="center"
          justify="center"
          gap="2"
          py="6"
          style={{ opacity: 0.7 }}
        >
          <Text size="2" color="gray">No notes yet.</Text>
          {isAdmin && (
            <Button
              variant="soft"
              size="1"
              mt="1"
              onClick={() => {
                setValue("");
                setEditing(true);
              }}
            >
              Add Notes
            </Button>
          )}
        </Flex>
      )}
    </Card>
  );
}
