import { Badge, Callout, Card, Flex, Heading, Text } from "@radix-ui/themes";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { BookOpen, ExternalLink } from "lucide-react";

type Paper = {
  paper_id: string;
  title: string;
  year: number;
  citation_count: number;
  abstract?: string;
  tldr?: string;
  url: string;
  authors: string[];
};

async function getConditionResearch(conditionId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  const { data } = await supabase
    .from("condition_researches")
    .select("synthesis, papers, paper_count, search_query, created_at")
    .eq("condition_id", conditionId)
    .single();

  return data as {
    synthesis: string | null;
    papers: Paper[];
    paper_count: number;
    search_query: string | null;
    created_at: string;
  } | null;
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
      <Callout.Root color="gray">
        <Callout.Icon>
          <BookOpen size={16} />
        </Callout.Icon>
        <Callout.Text>No academic research yet.</Callout.Text>
      </Callout.Root>
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
            <Text
              as="p"
              size="2"
              style={{ whiteSpace: "pre-wrap", lineHeight: 1.7 }}
            >
              {research.synthesis}
            </Text>
            <Text size="1" color="gray">
              Generated {new Date(research.created_at).toLocaleDateString()}
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
                    </Flex>
                    {paper.tldr && (
                      <Text size="1" color="gray" style={{ lineHeight: 1.5 }}>
                        {paper.tldr}
                      </Text>
                    )}
                  </Flex>
                </Card>
              ))}
            </Flex>
          </Flex>
        </Card>
      )}
    </Flex>
  );
}
