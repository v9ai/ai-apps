import { Badge, Card, Flex, Heading, Text } from "@radix-ui/themes";
import Link from "next/link";
import { getRelatedMarkers } from "./update-action";

export async function RelatedMarkers({ conditionId }: { conditionId: string }) {
  const markers = await getRelatedMarkers(conditionId);

  if (markers.length === 0) return null;

  return (
    <Flex direction="column" gap="3">
      <Heading size="3">Related markers</Heading>
      {markers.map((m) => (
        <Card key={m.id}>
          <Flex direction="column" gap="1">
            <Flex justify="between" align="center">
              <Text size="2" weight="medium" asChild>
                <Link href={`/protected/blood-tests/${m.test_id}`}>
                  {m.marker_name}
                </Link>
              </Text>
              <Badge color="blue" variant="soft" size="1">
                {(m.similarity * 100).toFixed(0)}% match
              </Badge>
            </Flex>
            <Text size="1" color="gray" style={{ whiteSpace: "pre-wrap" }}>
              {m.content}
            </Text>
          </Flex>
        </Card>
      ))}
    </Flex>
  );
}
