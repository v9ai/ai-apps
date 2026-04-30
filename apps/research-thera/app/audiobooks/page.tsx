"use client";

import {
  Box,
  Flex,
  Heading,
  Text,
  Card,
  Badge,
  Spinner,
  Separator,
} from "@radix-ui/themes";
import { useGetAllRecommendedAudiobooksQuery } from "@/app/__generated__/hooks";

const BOGDAN_FAMILY_MEMBER_ID = 2;

function categoryLabel(category: string): string {
  switch (category) {
    case "emotional-development":
      return "Dezvoltare Emoțională";
    case "similar-to":
      return "Recomandări Similare";
    default:
      return category;
  }
}

function categoryColor(category: string): "indigo" | "violet" | "gray" {
  switch (category) {
    case "emotional-development":
      return "indigo";
    case "similar-to":
      return "violet";
    default:
      return "gray";
  }
}

function formatLength(minutes: number | null | undefined): string | null {
  if (minutes == null || minutes <= 0) return null;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m} min`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

function voxaSearchUrl(title: string): string {
  return `https://voxa.ro/search?q=${encodeURIComponent(title)}`;
}

export default function AudiobooksPage() {
  const { data, loading, error } = useGetAllRecommendedAudiobooksQuery({
    variables: { familyMemberId: BOGDAN_FAMILY_MEMBER_ID },
  });

  const audiobooks = data?.allRecommendedAudiobooks ?? [];

  const grouped = new Map<string, typeof audiobooks>();
  for (const ab of audiobooks) {
    const list = grouped.get(ab.category) ?? [];
    list.push(ab);
    grouped.set(ab.category, list);
  }

  const orderedCategories = Array.from(grouped.keys()).sort((a, b) => {
    const order = ["emotional-development", "similar-to"];
    const ai = order.indexOf(a);
    const bi = order.indexOf(b);
    if (ai === -1 && bi === -1) return a.localeCompare(b);
    if (ai === -1) return 1;
    if (bi === -1) return -1;
    return ai - bi;
  });

  return (
    <Flex direction="column" gap="5">
      <Box>
        <Heading size={{ initial: "6", md: "8" }} weight="bold">
          Audiobooks pentru Bogdan
        </Heading>
        <Text size="2" color="gray" style={{ lineHeight: 1.6 }}>
          Audiobook-uri reale din catalogul{" "}
          <a
            href="https://voxa.ro"
            target="_blank"
            rel="noopener noreferrer"
            style={{ color: "var(--indigo-11)" }}
          >
            voxa.ro
          </a>
          , alese pe baza problemelor curente, observațiilor profesorilor și a articolelor de
          cercetare clinică legate de Bogdan. Fiecare link trimite direct în pagina de produs Voxa.
        </Text>
      </Box>

      {loading && (
        <Flex justify="center" align="center" style={{ minHeight: "200px" }}>
          <Spinner size="3" />
        </Flex>
      )}

      {error && (
        <Card>
          <Text color="red">Eroare la încărcare: {error.message}</Text>
        </Card>
      )}

      {!loading && !error && audiobooks.length === 0 && (
        <Card>
          <Flex direction="column" gap="2" p="4" align="center">
            <Text size="2" color="gray">
              Nu există încă recomandări de audiobook-uri pentru Bogdan.
            </Text>
          </Flex>
        </Card>
      )}

      {orderedCategories.map((category) => {
        const list = grouped.get(category) ?? [];
        return (
          <Flex direction="column" gap="3" key={category}>
            <Flex align="center" gap="2">
              <Badge variant="solid" color={categoryColor(category)} size="2">
                {categoryLabel(category)}
              </Badge>
              <Text size="2" color="gray">
                {list.length} {list.length === 1 ? "audiobook" : "audiobook-uri"}
              </Text>
            </Flex>

            {list.map((ab, idx) => {
              const length = formatLength(ab.lengthMinutes);
              return (
                <Card key={ab.id} variant="surface">
                  <Flex direction="column" gap="3" p="4">
                    <Flex justify="between" align="start" gap="3">
                      <Flex direction="column" gap="1" style={{ flex: 1, minWidth: 0 }}>
                        <Flex align="center" gap="2" wrap="wrap">
                          <Text
                            size="1"
                            weight="bold"
                            color="gray"
                            style={{ fontVariantNumeric: "tabular-nums" }}
                          >
                            {idx + 1}
                          </Text>
                          <Heading size="3">{ab.title}</Heading>
                          {ab.year != null && (
                            <Text size="2" color="gray">
                              ({ab.year})
                            </Text>
                          )}
                        </Flex>
                        {ab.authors.length > 0 && (
                          <Text size="2" color="gray">
                            {ab.authors.join(", ")}
                          </Text>
                        )}
                        {ab.narrators.length > 0 && (
                          <Text size="1" color="gray">
                            Narator: {ab.narrators.join(", ")}
                          </Text>
                        )}
                        <Flex align="center" gap="2" wrap="wrap" mt="1">
                          <Badge variant="solid" color="orange" size="1">
                            Voxa
                          </Badge>
                          {ab.ageBand && (
                            <Badge variant="soft" color="jade" size="1">
                              {ab.ageBand}
                            </Badge>
                          )}
                          {length && (
                            <Badge variant="outline" color="gray" size="1">
                              {length}
                            </Badge>
                          )}
                          <Badge variant="outline" color="gray" size="1">
                            {ab.language.toUpperCase()}
                          </Badge>
                        </Flex>
                      </Flex>
                    </Flex>

                    <Text size="2" style={{ lineHeight: "1.7" }}>
                      {ab.description}
                    </Text>

                    <Card
                      variant="classic"
                      style={{
                        backgroundColor: "var(--indigo-a2)",
                        border: "1px solid var(--indigo-a5)",
                      }}
                    >
                      <Flex direction="column" gap="1" p="3">
                        <Text size="1" weight="bold" color="indigo">
                          De ce această carte
                        </Text>
                        <Text size="2" color="indigo" style={{ lineHeight: "1.6" }}>
                          {ab.whyRecommended}
                        </Text>
                      </Flex>
                    </Card>

                    <Flex gap="3" align="center" wrap="wrap">
                      <a
                        href={ab.voxaUrl ?? voxaSearchUrl(ab.title)}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{ fontSize: 12, color: "var(--indigo-11)" }}
                      >
                        Deschide pe Voxa ↗
                      </a>
                    </Flex>
                  </Flex>
                </Card>
              );
            })}
          </Flex>
        );
      })}
    </Flex>
  );
}
