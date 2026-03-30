import { Badge, Box, Callout, Card, Flex, Heading, Text } from "@radix-ui/themes";
import Link from "next/link";
import { getRelatedMarkers } from "./update-action";
import { MagicWandIcon } from "@radix-ui/react-icons";
import { ExternalLink } from "lucide-react";
import { SimilarityBadge } from "./similarity-badge";
import { css } from "styled-system/css";

const externalIconClass = css({ color: "var(--gray-8)" });
const markerContentClass = css({ whiteSpace: "pre-wrap" });

function barColor(pct: number): string {
  if (pct >= 70) return "var(--green-9)";
  if (pct >= 50) return "var(--indigo-9)";
  return "var(--gray-8)";
}

export async function RelatedMarkers({ conditionId }: { conditionId: string }) {
  const markers = await getRelatedMarkers(conditionId);

  return (
    <Card>
      <Flex direction="column" gap="3">
        <Flex direction="column" gap="1">
          <Flex align="center" gap="2">
            <MagicWandIcon style={{ color: "var(--indigo-11)" }} />
            <Heading size="3">Related Markers</Heading>
            <Badge color="indigo" variant="soft" size="1">AI-matched</Badge>
          </Flex>
          <Text size="1" color="gray">
            Blood markers semantically matched to this condition using vector embeddings.
          </Text>
        </Flex>

        {markers.length === 0 ? (
          <Callout.Root color="gray">
            <Callout.Text>
              No related markers found yet. Upload blood test results to see AI-matched markers here.
            </Callout.Text>
          </Callout.Root>
        ) : (
          <Flex direction="column" gap="2">
            {markers.map((m) => {
              const pct = Math.round(m.similarity * 100);
              return (
                <Card key={m.id} asChild className="card-hover">
                  <Link href={`/blood-tests/${m.test_id}`}>
                    <Flex direction="column" gap="1">
                      <Flex justify="between" align="center">
                        <Flex align="center" gap="2">
                          <Text size="2" weight="medium">
                            {m.marker_name}
                          </Text>
                          <ExternalLink size={12} className={externalIconClass} />
                        </Flex>
                        <SimilarityBadge similarity={m.similarity} />
                      </Flex>
                      <Text size="1" color="gray" className={markerContentClass}>
                        {m.content}
                      </Text>
                      <Box
                        mt="1"
                        className={css({
                          height: "3px",
                          borderRadius: "2px",
                          background: "var(--gray-a3)",
                          overflow: "hidden",
                        })}
                      >
                        <Box
                          className={css({
                            height: "100%",
                            borderRadius: "2px",
                            transition: "width 300ms ease",
                          })}
                          style={{
                            width: `${pct}%`,
                            background: barColor(pct),
                          }}
                        />
                      </Box>
                    </Flex>
                  </Link>
                </Card>
              );
            })}
          </Flex>
        )}
      </Flex>
    </Card>
  );
}
