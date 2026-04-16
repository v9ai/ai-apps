"use client";

import { useState } from "react";
import { useFormStatus } from "react-dom";
import { Badge, Box, Button, Card, Flex, Heading, Text } from "@radix-ui/themes";
import { ChevronDown, ChevronRight, ExternalLink, FileText, Mail, ScrollText, Trash2 } from "lucide-react";
import { MarkdownProse } from "@/components/markdown-prose";
import { addFamilyDocument, deleteFamilyDocument } from "../document-actions";

type FamilyDocument = {
  id: string;
  title: string;
  documentType: string;
  documentDate: string | null;
  source: string | null;
  content: string | null;
  externalUrl: string | null;
  createdAt: Date;
};

const TYPE_CONFIG: Record<string, { color: "blue" | "orange" | "green" | "purple" | "gray"; label: string }> = {
  lab_result: { color: "blue", label: "Lab result" },
  email: { color: "orange", label: "Email" },
  summary: { color: "green", label: "Summary" },
  medical_report: { color: "purple", label: "Report" },
  other: { color: "gray", label: "Document" },
};

function TypeIcon({ type }: { type: string }) {
  const size = 15;
  const color = "var(--gray-8)";
  if (type === "email") return <Mail size={size} color={color} />;
  if (type === "summary") return <ScrollText size={size} color={color} />;
  return <FileText size={size} color={color} />;
}

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" size="2" disabled={pending}>
      {pending ? "Adding…" : "Add document"}
    </Button>
  );
}

function DocumentCard({
  doc,
  familyMemberSlug,
}: {
  doc: FamilyDocument;
  familyMemberSlug: string;
}) {
  const [expanded, setExpanded] = useState(false);
  const config = TYPE_CONFIG[doc.documentType] ?? TYPE_CONFIG.other;

  return (
    <Card>
      <Flex direction="column" gap="2">
        <Flex align="start" justify="between" gap="2">
          <Flex
            align="start"
            gap="2"
            style={{ flex: 1, minWidth: 0, cursor: doc.content ? "pointer" : "default" }}
            onClick={() => doc.content && setExpanded(!expanded)}
          >
            {doc.content && (
              <Box style={{ flexShrink: 0, marginTop: 2 }}>
                {expanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
              </Box>
            )}
            <TypeIcon type={doc.documentType} />
            <Flex direction="column" gap="1" style={{ flex: 1, minWidth: 0 }}>
              <Text size="2" weight="medium">{doc.title}</Text>
              <Flex align="center" gap="2" wrap="wrap">
                <Badge variant="soft" color={config.color} size="1">{config.label}</Badge>
                {doc.documentDate && (
                  <Text size="1" color="gray">
                    {new Date(doc.documentDate + "T00:00:00").toLocaleDateString()}
                  </Text>
                )}
                {doc.source && (
                  <Text size="1" color="gray" style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {doc.source}
                  </Text>
                )}
              </Flex>
            </Flex>
          </Flex>
          <Flex align="center" gap="2" style={{ flexShrink: 0 }}>
            {doc.externalUrl && (
              <Button size="1" variant="soft" asChild>
                <a href={doc.externalUrl} target="_blank" rel="noopener noreferrer">
                  <ExternalLink size={12} /> View
                </a>
              </Button>
            )}
            <form action={deleteFamilyDocument.bind(null, doc.id, familyMemberSlug)}>
              <Button size="1" variant="ghost" color="red" type="submit">
                <Trash2 size={13} />
              </Button>
            </form>
          </Flex>
        </Flex>

        {expanded && doc.content && (
          <Box
            style={{
              borderTop: "1px solid var(--gray-4)",
              paddingTop: 12,
              marginTop: 4,
            }}
          >
            <MarkdownProse content={doc.content} />
          </Box>
        )}
      </Flex>
    </Card>
  );
}

const inputStyle: React.CSSProperties = {
  fontSize: "var(--font-size-2)",
  color: "var(--gray-12)",
  padding: "6px 8px",
  border: "1px solid var(--gray-6)",
  borderRadius: "var(--radius-2)",
  background: "transparent",
  width: "100%",
  boxSizing: "border-box",
};

export function FamilyDocumentsSection({
  familyMemberId,
  familyMemberSlug,
  initialDocuments,
}: {
  familyMemberId: string;
  familyMemberSlug: string;
  initialDocuments: FamilyDocument[];
}) {
  const [showForm, setShowForm] = useState(false);

  return (
    <Flex direction="column" gap="3">
      <Flex align="center" justify="between">
        <Flex align="center" gap="2">
          <Heading size="4">Documents</Heading>
          {initialDocuments.length > 0 && (
            <Badge variant="soft" color="gray" size="1">{initialDocuments.length}</Badge>
          )}
        </Flex>
        <Button size="1" variant="soft" onClick={() => setShowForm(!showForm)}>
          {showForm ? "Cancel" : "Add"}
        </Button>
      </Flex>

      {showForm && (
        <Card>
          <form action={addFamilyDocument.bind(null, familyMemberId)}>
            <Flex direction="column" gap="3">
              <Flex direction="column" gap="1">
                <Text size="2" weight="medium">Title</Text>
                <input type="text" name="title" required style={inputStyle} placeholder="e.g. Blood test results" />
              </Flex>
              <Flex gap="3" wrap="wrap">
                <Flex direction="column" gap="1" style={{ flex: 1, minWidth: 140 }}>
                  <Text size="2" color="gray">Type</Text>
                  <select name="document_type" style={inputStyle}>
                    <option value="lab_result">Lab result</option>
                    <option value="medical_report">Medical report</option>
                    <option value="email">Email</option>
                    <option value="summary">Summary</option>
                    <option value="other">Other</option>
                  </select>
                </Flex>
                <Flex direction="column" gap="1" style={{ flex: 1, minWidth: 140 }}>
                  <Text size="2" color="gray">Date</Text>
                  <input type="date" name="document_date" style={inputStyle} />
                </Flex>
              </Flex>
              <Flex direction="column" gap="1">
                <Text size="2" color="gray">Source</Text>
                <input type="text" name="source" style={inputStyle} placeholder="e.g. Laboratory name, doctor" />
              </Flex>
              <Flex direction="column" gap="1">
                <Text size="2" color="gray">Content (markdown)</Text>
                <textarea name="content" rows={5} style={inputStyle} placeholder="Full text of the document..." />
              </Flex>
              <Flex direction="column" gap="1">
                <Text size="2" color="gray">External URL</Text>
                <input type="url" name="external_url" style={inputStyle} placeholder="https://drive.google.com/..." />
              </Flex>
              <Box>
                <SubmitButton />
              </Box>
            </Flex>
          </form>
        </Card>
      )}

      {initialDocuments.length > 0 ? (
        <Flex direction="column" gap="2">
          {initialDocuments.map((doc) => (
            <DocumentCard key={doc.id} doc={doc} familyMemberSlug={familyMemberSlug} />
          ))}
        </Flex>
      ) : (
        <Text size="2" color="gray">No documents yet.</Text>
      )}
    </Flex>
  );
}
