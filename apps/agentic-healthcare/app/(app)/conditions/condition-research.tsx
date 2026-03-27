import { Badge, Callout, Card, Flex, Heading, Text } from "@radix-ui/themes";
import { withAuth } from "@/lib/auth-helpers";
import { db } from "@/lib/db";
import { conditionResearches } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { BookOpen, ExternalLink } from "lucide-react";
import { MarkdownProse } from "@/components/markdown-prose";
import { ResearchButton } from "./research-button";

type Paper = {
  paper_id: string;
  title: string;
  year: number;
  citation_count: number;
  abstract?: string;
  tldr?: string;
  url: string;
  authors: string[];
  source?: string;
};

async function getConditionResearch(conditionId: string) {
  await withAuth();

  const [data] = await db
    .select()
    .from(conditionResearches)
    .where(eq(conditionResearches.conditionId, conditionId));

  if (!data) return null;

  return {
    synthesis: data.synthesis,
    papers: data.papers as Paper[],
    paper_count: Number(data.paperCount) || 0,
    search_query: data.searchQuery,
    created_at: data.createdAt.toISOString(),
    updated_at: data.updatedAt.toISOString(),
  };
}

function formatAuthors(authors: string[]) {
  if (authors.length === 0) return "";
  if (authors.length <= 3) return authors.join(", ");
  return `${authors[0]}, ${authors[1]} et al.`;
}

export async function ConditionResearch({ conditionId }: { conditionId: string }) {
  const research = await getConditionResearch(conditionId);

  if (!research) {
    return (
      <Flex direction="column" gap="3">
        <Callout.Root color="gray">
          <Callout.Icon>
            <BookOpen size={16} />
          </Callout.Icon>
          <Callout.Text>No academic research yet.</Callout.Text>
        </Callout.Root>
        <ResearchButton conditionId={conditionId} hasExisting={false} />
      </Flex>
    );
  }

  return (
    <Flex direction="column" gap="3">
      {research.synthesis && (
        <Card>
          <Flex direction="column" gap="3">
            <Flex align="center" gap="2">
              <BookOpen size={16} style={{ color: "var(--indigo-11)" }} />
              <Heading size="3">Research Synthesis</Heading>
              <Badge color="indigo" variant="soft" size="1">
                {research.paper_count} papers
              </Badge>
            </Flex>
            <MarkdownProse content={research.synthesis} />
            <Text size="1" color="gray">
              {research.updated_at && new Date(research.updated_at).getTime() > new Date(research.created_at).getTime() + 1000
                ? `Updated ${new Date(research.updated_at).toLocaleDateString()}`
                : `Generated ${new Date(research.created_at).toLocaleDateString()}`}
              {research.search_query && ` from query: "${research.search_query}"`}
            </Text>
          </Flex>
        </Card>
      )}

      {research.papers.length > 0 && (
        <Card>
          <Flex direction="column" gap="3">
            <Heading size="3">Papers</Heading>
            <Flex direction="column" gap="2">
              {research.papers.map((paper) => (
                <Card key={paper.paper_id} variant="surface">
                  <Flex direction="column" gap="1">
                    <Flex align="start" justify="between" gap="2">
                      <a
                        href={paper.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{ textDecoration: "none" }}
                      >
                        <Flex align="center" gap="1">
                          <Text size="2" weight="medium" color="indigo">
                            {paper.title}
                          </Text>
                          <ExternalLink
                            size={12}
                            style={{
                              color: "var(--gray-8)",
                              flexShrink: 0,
                            }}
                          />
                        </Flex>
                      </a>
                    </Flex>
                    <Flex align="center" gap="2">
                      {paper.authors.length > 0 && (
                        <Text size="1" color="gray">
                          {formatAuthors(paper.authors)}
                        </Text>
                      )}
                      {paper.year > 0 && (
                        <Badge color="gray" variant="soft" size="1">
                          {paper.year}
                        </Badge>
                      )}
                      {paper.citation_count > 0 && (
                        <Text size="1" color="gray">
                          {paper.citation_count.toLocaleString()} citations
                        </Text>
                      )}
                      {paper.source && (
                        <Badge
                          color={
                            paper.source === "SemanticScholar"
                              ? "blue"
                              : paper.source === "OpenAlex"
                                ? "green"
                                : paper.source === "Crossref"
                                  ? "orange"
                                  : "violet"
                          }
                          variant="outline"
                          size="1"
                        >
                          {paper.source}
                        </Badge>
                      )}
                    </Flex>
                    {paper.tldr && (
                      <Text size="1" color="gray" style={{ lineHeight: 1.5 }}>
                        {paper.tldr}
                      </Text>
                    )}
                    {!paper.tldr && paper.abstract && (
                      <Text size="1" color="gray" style={{ lineHeight: 1.5 }}>
                        {paper.abstract.length > 300
                          ? paper.abstract.slice(0, 300) + "\u2026"
                          : paper.abstract}
                      </Text>
                    )}
                  </Flex>
                </Card>
              ))}
            </Flex>
          </Flex>
        </Card>
      )}

      <ResearchButton conditionId={conditionId} hasExisting={true} />
    </Flex>
  );
}
