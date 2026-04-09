"use client";

import { useState } from "react";
import {
  useGetLinkedInPostsQuery,
  useAnalyzeLinkedInPostsMutation,
  useGetSimilarPostsLazyQuery,
} from "@/__generated__/hooks";
import type { GetLinkedInPostsQuery } from "@/__generated__/hooks";
import { useAuth } from "@/lib/auth-hooks";
import { ADMIN_EMAIL } from "@/lib/constants";
import {
  Badge,
  Box,
  Callout,
  Card,
  Container,
  Dialog,
  Flex,
  Heading,
  Select,
  Spinner,
  Text,
} from "@radix-ui/themes";
import { button } from "@/recipes/button";
import {
  ExclamationTriangleIcon,
  InfoCircledIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  MixIcon,
  RocketIcon,
} from "@radix-ui/react-icons";

type Post = NonNullable<GetLinkedInPostsQuery["linkedinPosts"]>[number];

const PAGE_SIZE = 50;

export default function AdminLinkedInPostsPage() {
  const { user } = useAuth();
  const isAdmin = user?.email === ADMIN_EMAIL;

  const [page, setPage] = useState(0);
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [analyzedFilter, setAnalyzedFilter] = useState<string>("all");
  const [similarPostId, setSimilarPostId] = useState<number | null>(null);

  const { data, loading, refetch } = useGetLinkedInPostsQuery({
    variables: {
      type: typeFilter !== "all" ? (typeFilter as "post" | "job") : undefined,
      limit: PAGE_SIZE,
      offset: page * PAGE_SIZE,
    },
    skip: !isAdmin,
    fetchPolicy: "cache-and-network",
  });

  const [analyzeAll, { loading: analyzing }] =
    useAnalyzeLinkedInPostsMutation();

  const [fetchSimilar, { data: similarData, loading: similarLoading }] =
    useGetSimilarPostsLazyQuery();

  if (!isAdmin) {
    return (
      <Container size="3" p="8">
        <Callout.Root color="red">
          <Callout.Icon>
            <ExclamationTriangleIcon />
          </Callout.Icon>
          <Callout.Text>Access denied. Admin only.</Callout.Text>
        </Callout.Root>
      </Container>
    );
  }

  const posts = data?.linkedinPosts ?? [];
  const filtered =
    analyzedFilter === "all"
      ? posts
      : analyzedFilter === "analyzed"
        ? posts.filter((p) => p.analyzedAt)
        : posts.filter((p) => !p.analyzedAt);

  async function handleAnalyzeAll() {
    const result = await analyzeAll({ variables: { limit: 100 } });
    const r = result.data?.analyzeLinkedInPosts;
    if (r) {
      alert(
        r.success
          ? `Analyzed ${r.analyzed} posts.`
          : `Analyzed ${r.analyzed}, failed ${r.failed}: ${r.errors.join(", ")}`,
      );
    }
    refetch();
  }

  function handleShowSimilar(postId: number) {
    setSimilarPostId(postId);
    fetchSimilar({ variables: { postId, limit: 10, minScore: 0.3 } });
  }

  return (
    <Container size="4" p="8" style={{ maxWidth: 1200 }}>
      <Flex justify="between" align="center" mb="6">
        <Heading size="7">LinkedIn Posts</Heading>
        <button
          className={button({ variant: "solid", size: "md" })}
          onClick={handleAnalyzeAll}
          disabled={analyzing}
        >
          <RocketIcon /> {analyzing ? "analyzing..." : "analyze all"}
        </button>
      </Flex>

      <Flex align="center" gap="3" mb="4">
        <Text size="2" color="gray">
          {loading ? "Loading..." : `${posts.length} posts`}
        </Text>
        <Select.Root value={typeFilter} onValueChange={(v) => { setTypeFilter(v); setPage(0); }}>
          <Select.Trigger variant="ghost" />
          <Select.Content>
            <Select.Item value="all">all types</Select.Item>
            <Select.Item value="post">posts</Select.Item>
            <Select.Item value="job">jobs</Select.Item>
          </Select.Content>
        </Select.Root>
        <Select.Root value={analyzedFilter} onValueChange={(v) => { setAnalyzedFilter(v); setPage(0); }}>
          <Select.Trigger variant="ghost" />
          <Select.Content>
            <Select.Item value="all">all status</Select.Item>
            <Select.Item value="analyzed">analyzed</Select.Item>
            <Select.Item value="unanalyzed">unanalyzed</Select.Item>
          </Select.Content>
        </Select.Root>
      </Flex>

      {loading && filtered.length === 0 ? (
        <Flex justify="center" py="6">
          <Spinner size="3" />
        </Flex>
      ) : filtered.length === 0 ? (
        <Callout.Root color="gray" variant="soft">
          <Callout.Icon>
            <InfoCircledIcon />
          </Callout.Icon>
          <Callout.Text>
            No posts found. Scrape LinkedIn posts via the Chrome extension to populate this table.
          </Callout.Text>
        </Callout.Root>
      ) : (
        <Flex direction="column" gap="2">
          {filtered.map((post) => (
            <PostCard
              key={post.id}
              post={post}
              onShowSimilar={() => handleShowSimilar(post.id)}
            />
          ))}
        </Flex>
      )}

      {posts.length >= PAGE_SIZE && (
        <Flex justify="center" align="center" gap="3" mt="4">
          <button
            className={button({ variant: "ghost", size: "sm" })}
            onClick={() => setPage((p) => Math.max(0, p - 1))}
            disabled={page === 0}
          >
            <ChevronLeftIcon /> prev
          </button>
          <Text size="2" color="gray">
            page {page + 1}
          </Text>
          <button
            className={button({ variant: "ghost", size: "sm" })}
            onClick={() => setPage((p) => p + 1)}
            disabled={posts.length < PAGE_SIZE}
          >
            next <ChevronRightIcon />
          </button>
        </Flex>
      )}

      <Dialog.Root
        open={similarPostId !== null}
        onOpenChange={(open) => !open && setSimilarPostId(null)}
      >
        <Dialog.Content maxWidth="600px">
          <Dialog.Title>Similar Posts</Dialog.Title>
          {similarLoading ? (
            <Flex justify="center" py="4">
              <Spinner size="2" />
            </Flex>
          ) : (similarData?.similarPosts?.length ?? 0) === 0 ? (
            <Text size="2" color="gray">
              No similar posts found. Post may not have been analyzed yet.
            </Text>
          ) : (
            <Flex direction="column" gap="3" mt="3">
              {similarData?.similarPosts.map((sp) => (
                <Card key={sp.post.id} variant="surface">
                  <Box p="3">
                    <Flex justify="between" align="start" gap="2">
                      <Box style={{ flex: 1 }}>
                        <Text size="2" weight="medium">
                          {sp.post.authorName ?? "Unknown"}
                        </Text>
                        <Text
                          size="1"
                          color="gray"
                          as="p"
                          mt="1"
                          style={{
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            display: "-webkit-box",
                            WebkitLineClamp: 3,
                            WebkitBoxOrient: "vertical",
                          }}
                        >
                          {sp.post.content ?? sp.post.title ?? "No content"}
                        </Text>
                      </Box>
                      <Badge color="blue" variant="soft" size="1">
                        {(sp.similarity * 100).toFixed(0)}%
                      </Badge>
                    </Flex>
                  </Box>
                </Card>
              ))}
            </Flex>
          )}
          <Flex justify="end" mt="4">
            <Dialog.Close>
              <button className={button({ variant: "ghost", size: "sm" })}>
                close
              </button>
            </Dialog.Close>
          </Flex>
        </Dialog.Content>
      </Dialog.Root>
    </Container>
  );
}

function PostCard({
  post,
  onShowSimilar,
}: {
  post: Post;
  onShowSimilar: () => void;
}) {
  return (
    <Card>
      <Box p="3">
        <Flex align="start" justify="between" gap="3">
          <Box style={{ flex: 1, minWidth: 0 }}>
            <Flex align="center" gap="2" wrap="wrap">
              <Badge
                color={post.type === "job" ? "orange" : "blue"}
                variant="soft"
                size="1"
              >
                {post.type}
              </Badge>
              <Text size="2" weight="medium">
                {post.authorName ?? "Unknown author"}
              </Text>
              {post.analyzedAt && (
                <Badge color="green" variant="soft" size="1">
                  analyzed
                </Badge>
              )}
            </Flex>
            <Text
              size="1"
              color="gray"
              as="p"
              mt="1"
              style={{
                overflow: "hidden",
                textOverflow: "ellipsis",
                display: "-webkit-box",
                WebkitLineClamp: 2,
                WebkitBoxOrient: "vertical",
              }}
            >
              {post.content ?? post.title ?? "No content"}
            </Text>
            {post.skills && post.skills.length > 0 && (
              <Flex gap="1" mt="2" wrap="wrap">
                {post.skills.slice(0, 6).map((s) => (
                  <Badge key={s.tag} variant="outline" size="1">
                    {s.label}{" "}
                    <Text size="1" color="gray">
                      {(s.confidence * 100).toFixed(0)}%
                    </Text>
                  </Badge>
                ))}
                {post.skills.length > 6 && (
                  <Text size="1" color="gray">
                    +{post.skills.length - 6} more
                  </Text>
                )}
              </Flex>
            )}
          </Box>
          <Flex direction="column" gap="1" align="end">
            {post.postedAt && (
              <Text size="1" color="gray">
                {new Date(post.postedAt).toLocaleDateString()}
              </Text>
            )}
            {post.analyzedAt && (
              <button
                className={button({ variant: "ghost", size: "sm" })}
                onClick={onShowSimilar}
              >
                <MixIcon /> similar
              </button>
            )}
            <a
              href={post.url}
              target="_blank"
              rel="noopener noreferrer"
              className={button({ variant: "link", size: "sm" })}
            >
              open
            </a>
          </Flex>
        </Flex>
      </Box>
    </Card>
  );
}
