"use client";

import { useState } from "react";
import {
  Box,
  Card,
  Flex,
  Heading,
  Text,
  Badge,
  Button,
  Spinner,
} from "@radix-ui/themes";
import { ChevronDown, ChevronRight, ExternalLink, Eye, FileText } from "lucide-react";
import { useFamilyDocumentsQuery } from "../../__generated__/hooks";
import { MarkdownProse } from "../../components/MarkdownProse";

/**
 * Read-only listing of family_documents migrated from agentic-healthcare.
 * Surfaces title/type/date, expandable text content (markdown), R2 PDF view,
 * and external Drive link if present. Upload UI deferred — add an `/api/healthcare/
 * upload-family-document` route + form when needed.
 */
export function FamilyDocumentsSection({ familyMemberId }: { familyMemberId: number }) {
  const { data, loading, error } = useFamilyDocumentsQuery({
    variables: { familyMemberId },
  });
  const docs = data?.familyDocuments ?? [];

  if (loading) {
    return (
      <Flex justify="center" py="4">
        <Spinner size="2" />
      </Flex>
    );
  }
  if (error) {
    return (
      <Text size="1" color="red">
        Error loading documents: {error.message}
      </Text>
    );
  }
  if (docs.length === 0) {
    return null; // hidden when empty — keep the family page uncluttered
  }

  return (
    <Flex direction="column" gap="3">
      <Heading size="4">Documents ({docs.length})</Heading>
      <Flex direction="column" gap="2">
        {docs.map((d) => (
          <DocumentRow
            key={d.id}
            id={d.id}
            title={d.title}
            documentType={d.documentType}
            documentDate={d.documentDate ?? null}
            source={d.source ?? null}
            content={d.content ?? null}
            externalUrl={d.externalUrl ?? null}
            fileName={d.fileName ?? null}
            filePath={d.filePath ?? null}
          />
        ))}
      </Flex>
    </Flex>
  );
}

function DocumentRow({
  id,
  title,
  documentType,
  documentDate,
  source,
  content,
  externalUrl,
  fileName,
  filePath,
}: {
  id: string;
  title: string;
  documentType: string;
  documentDate: string | null;
  source: string | null;
  content: string | null;
  externalUrl: string | null;
  fileName: string | null;
  filePath: string | null;
}) {
  const [expanded, setExpanded] = useState(false);
  const hasContent = content && content.trim().length > 0;

  return (
    <Card>
      <Flex direction="column" gap="2" p="1">
        <Flex justify="between" align="start" gap="3">
          <Flex gap="2" align="start" style={{ flexGrow: 1, minWidth: 0 }}>
            <FileText size={16} color="var(--gray-9)" style={{ marginTop: 2 }} />
            <Flex direction="column" gap="1" style={{ minWidth: 0 }}>
              <Flex align="center" gap="2" wrap="wrap">
                <Text size="2" weight="medium">
                  {title}
                </Text>
                <Badge color="gray" variant="soft" size="1">
                  {documentType}
                </Badge>
                {source && (
                  <Badge color="indigo" variant="outline" size="1">
                    {source}
                  </Badge>
                )}
              </Flex>
              <Flex gap="3" wrap="wrap">
                {documentDate && (
                  <Text size="1" color="gray">
                    {documentDate}
                  </Text>
                )}
                {fileName && (
                  <Text size="1" color="gray">
                    {fileName}
                  </Text>
                )}
              </Flex>
            </Flex>
          </Flex>

          <Flex gap="1" align="center">
            {filePath && (
              <Button
                asChild
                variant="ghost"
                color="gray"
                size="1"
                aria-label="View PDF"
              >
                <a
                  href={`/api/healthcare/family-document-file/${id}`}
                  target="_blank"
                  rel="noreferrer"
                >
                  <Eye size={14} />
                </a>
              </Button>
            )}
            {externalUrl && (
              <Button
                asChild
                variant="ghost"
                color="gray"
                size="1"
                aria-label="Open external link"
              >
                <a href={externalUrl} target="_blank" rel="noreferrer">
                  <ExternalLink size={14} />
                </a>
              </Button>
            )}
            {hasContent && (
              <Button
                variant="ghost"
                color="gray"
                size="1"
                onClick={() => setExpanded((v) => !v)}
                aria-label={expanded ? "Collapse" : "Expand"}
              >
                {expanded ? (
                  <ChevronDown size={14} />
                ) : (
                  <ChevronRight size={14} />
                )}
              </Button>
            )}
          </Flex>
        </Flex>

        {expanded && hasContent && (
          <Box
            mt="2"
            pt="2"
            style={{ borderTop: "1px solid var(--gray-a4)" }}
          >
            <MarkdownProse content={content!} />
          </Box>
        )}
      </Flex>
    </Card>
  );
}
