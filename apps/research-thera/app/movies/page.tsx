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
import { useGetAllRecommendedMoviesQuery } from "@/app/__generated__/hooks";

const BOGDAN_FAMILY_MEMBER_ID = 2;

function categoryLabel(category: string): string {
  switch (category) {
    case "emotional-development":
      return "Emotional Development";
    case "similar-to":
      return "Similar Picks";
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

function platformColor(platform: string | null | undefined): "red" | "sky" | "gray" {
  if (platform === "Netflix") return "red";
  if (platform === "Disney+") return "sky";
  return "gray";
}

function imdbUrl(imdbId: string | null | undefined, title: string, year: number | null | undefined): string {
  if (imdbId) return `https://www.imdb.com/title/${imdbId}/`;
  const q = encodeURIComponent(year ? `${title} ${year}` : title);
  return `https://www.imdb.com/find/?q=${q}`;
}

export default function MoviesPage() {
  const { data, loading, error } = useGetAllRecommendedMoviesQuery({
    variables: { familyMemberId: BOGDAN_FAMILY_MEMBER_ID },
  });

  const movies = data?.allRecommendedMovies ?? [];

  const grouped = new Map<string, typeof movies>();
  for (const movie of movies) {
    const list = grouped.get(movie.category) ?? [];
    list.push(movie);
    grouped.set(movie.category, list);
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
          Movies for Bogdan
        </Heading>
        <Text size="2" color="gray" style={{ lineHeight: 1.6 }}>
          Filme curate pentru Bogdan — disponibile pe Netflix sau Disney+, cu accent pe
          dezvoltarea emoțională și teme adecvate vârstei.
        </Text>
      </Box>

      {loading && (
        <Flex justify="center" align="center" style={{ minHeight: "200px" }}>
          <Spinner size="3" />
        </Flex>
      )}

      {error && (
        <Card>
          <Text color="red">Failed to load movies: {error.message}</Text>
        </Card>
      )}

      {!loading && !error && movies.length === 0 && (
        <Card>
          <Flex direction="column" gap="2" p="4" align="center">
            <Text size="2" color="gray">
              Nu există încă recomandări de filme pentru Bogdan.
            </Text>
          </Flex>
        </Card>
      )}

      {orderedCategories.map((category) => {
        const categoryMovies = grouped.get(category) ?? [];
        return (
          <Flex direction="column" gap="3" key={category}>
            <Flex align="center" gap="2">
              <Badge variant="solid" color={categoryColor(category)} size="2">
                {categoryLabel(category)}
              </Badge>
              <Text size="2" color="gray">
                {categoryMovies.length} {categoryMovies.length === 1 ? "movie" : "movies"}
              </Text>
            </Flex>

            {categoryMovies.map((movie, idx) => (
              <Card key={movie.id} variant="surface">
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
                        <Heading size="3">{movie.title}</Heading>
                        {movie.year != null && (
                          <Text size="2" color="gray">
                            ({movie.year})
                          </Text>
                        )}
                      </Flex>
                      <Flex align="center" gap="2" wrap="wrap">
                        {movie.platform && (
                          <Badge variant="solid" color={platformColor(movie.platform)} size="1">
                            {movie.platform}
                          </Badge>
                        )}
                        {movie.rating && (
                          <Badge variant="outline" color="gray" size="1">
                            {movie.rating}
                          </Badge>
                        )}
                        {movie.ageBand && (
                          <Badge variant="soft" color="jade" size="1">
                            {movie.ageBand}
                          </Badge>
                        )}
                        {movie.imdbRating != null && (
                          <Badge variant="soft" color="amber" size="1">
                            IMDb {movie.imdbRating.toFixed(1)}
                          </Badge>
                        )}
                        {movie.genres.slice(0, 2).map((g) => (
                          <Badge key={g} variant="outline" color="gray" size="1">
                            {g}
                          </Badge>
                        ))}
                      </Flex>
                    </Flex>
                  </Flex>

                  <Text size="2" style={{ lineHeight: "1.7" }}>
                    {movie.description}
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
                        De ce acest film
                      </Text>
                      <Text size="2" color="indigo" style={{ lineHeight: "1.6" }}>
                        {movie.whyRecommended}
                      </Text>
                    </Flex>
                  </Card>

                  <Flex gap="3" align="center" wrap="wrap">
                    <a
                      href={imdbUrl(movie.imdbId, movie.title, movie.year)}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ fontSize: 12, color: "var(--indigo-11)" }}
                    >
                      IMDb ↗
                    </a>
                    {movie.justwatchUrl && (
                      <>
                        <Separator orientation="vertical" style={{ height: 12 }} />
                        <a
                          href={movie.justwatchUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{ fontSize: 12, color: "var(--indigo-11)" }}
                        >
                          JustWatch ↗
                        </a>
                      </>
                    )}
                  </Flex>
                </Flex>
              </Card>
            ))}
          </Flex>
        );
      })}
    </Flex>
  );
}
