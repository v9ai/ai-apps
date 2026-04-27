"use client";

import { useMemo, useState } from "react";
import {
  useGetCompanyQuery,
  useGetCompanyScrapedPostsQuery,
} from "@/__generated__/hooks";
import Link from "next/link";
import { useAuth } from "@/lib/auth-hooks";
import { ADMIN_EMAIL } from "@/lib/constants";
import { formatDistanceToNow, parseISO, isValid } from "date-fns";
import {
  Badge,
  Box,
  Callout,
  Card,
  Container,
  Flex,
  Link as RadixLink,
  Select,
  Separator,
  Spinner,
  TabNav,
  Text,
  TextField,
} from "@radix-ui/themes";
import {
  ArrowLeftIcon,
  ChatBubbleIcon,
  ExclamationTriangleIcon,
  ExternalLinkIcon,
  HeartIcon,
  InfoCircledIcon,
  MagnifyingGlassIcon,
  Share1Icon,
} from "@radix-ui/react-icons";

type SortMode = "recent" | "engagement";

type ScrapedPost = {
  personName: string;
  personLinkedinUrl: string;
  personHeadline?: string | null;
  postUrl?: string | null;
  postText?: string | null;
  postedDate?: string | null;
  reactionsCount: number;
  commentsCount: number;
  repostsCount: number;
  isRepost: boolean;
  originalAuthor?: string | null;
  scrapedAt: string;
};

function PostCard({ post }: { post: ScrapedPost }) {
  const ago = useMemo(() => {
    if (!post.postedDate) return null;
    const parsed = parseISO(post.postedDate);
    return isValid(parsed)
      ? formatDistanceToNow(parsed, { addSuffix: true })
      : post.postedDate;
  }, [post.postedDate]);

  const engagement =
    post.reactionsCount + post.commentsCount + post.repostsCount;

  return (
    <Card>
      <Box p="4">
        <Flex direction="column" gap="3">
          {/* Author */}
          <Flex align="start" justify="between" gap="3" wrap="wrap">
            <Flex direction="column" gap="1" style={{ minWidth: 0, flex: 1 }}>
              <Flex align="center" gap="2" wrap="wrap">
                <RadixLink
                  href={post.personLinkedinUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  size="2"
                  weight="medium"
                >
                  {post.personName}
                </RadixLink>
                {post.isRepost && (
                  <Badge color="gray" variant="soft" size="1">
                    Repost
                  </Badge>
                )}
              </Flex>
              {post.personHeadline && (
                <Text size="1" color="gray">
                  {post.personHeadline}
                </Text>
              )}
              {post.isRepost && post.originalAuthor && (
                <Text size="1" color="gray">
                  Originally by {post.originalAuthor}
                </Text>
              )}
            </Flex>
            <Flex direction="column" align="end" gap="1" flexShrink="0">
              {ago && (
                <Text size="1" color="gray">
                  {ago}
                </Text>
              )}
              {post.postUrl && (
                <RadixLink
                  href={post.postUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  size="1"
                >
                  <Flex align="center" gap="1">
                    <ExternalLinkIcon />
                    Open
                  </Flex>
                </RadixLink>
              )}
            </Flex>
          </Flex>

          {/* Body */}
          {post.postText && (
            <Text
              size="2"
              as="p"
              style={{ whiteSpace: "pre-wrap", lineHeight: 1.6 }}
            >
              {post.postText}
            </Text>
          )}

          {/* Engagement */}
          {engagement > 0 && (
            <>
              <Separator size="4" />
              <Flex gap="4" align="center" wrap="wrap">
                {post.reactionsCount > 0 && (
                  <Flex align="center" gap="1">
                    <HeartIcon />
                    <Text size="1" color="gray">
                      {post.reactionsCount.toLocaleString()}
                    </Text>
                  </Flex>
                )}
                {post.commentsCount > 0 && (
                  <Flex align="center" gap="1">
                    <ChatBubbleIcon />
                    <Text size="1" color="gray">
                      {post.commentsCount.toLocaleString()}
                    </Text>
                  </Flex>
                )}
                {post.repostsCount > 0 && (
                  <Flex align="center" gap="1">
                    <Share1Icon />
                    <Text size="1" color="gray">
                      {post.repostsCount.toLocaleString()}
                    </Text>
                  </Flex>
                )}
              </Flex>
            </>
          )}
        </Flex>
      </Box>
    </Card>
  );
}

export function CompanyPostsClient({ companyKey }: { companyKey: string }) {
  const { user } = useAuth();
  const isAdmin = user?.email === ADMIN_EMAIL;

  const [search, setSearch] = useState("");
  const [sortMode, setSortMode] = useState<SortMode>("recent");
  const [authorFilter, setAuthorFilter] = useState<string>("all");

  const { data: companyData, loading: companyLoading } = useGetCompanyQuery({
    variables: { key: companyKey },
    skip: !isAdmin,
  });

  const company = companyData?.company ?? null;

  const {
    data: postsData,
    loading: postsLoading,
    error: postsError,
  } = useGetCompanyScrapedPostsQuery({
    variables: { companySlug: companyKey },
    skip: !isAdmin,
  });

  const result = postsData?.companyScrapedPosts;
  const allPosts = useMemo<ScrapedPost[]>(
    () => (result?.posts ?? []) as ScrapedPost[],
    [result],
  );

  const authors = useMemo(() => {
    const names = new Set<string>();
    for (const p of allPosts) names.add(p.personName);
    return Array.from(names).sort();
  }, [allPosts]);

  const filteredPosts = useMemo(() => {
    const term = search.trim().toLowerCase();
    let list = allPosts.filter((p) => {
      if (authorFilter !== "all" && p.personName !== authorFilter) return false;
      if (!term) return true;
      const haystack = [
        p.personName,
        p.personHeadline,
        p.postText,
        p.originalAuthor,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return haystack.includes(term);
    });

    if (sortMode === "recent") {
      list = list.slice().sort((a, b) => {
        const ad = a.postedDate ? parseISO(a.postedDate).getTime() : 0;
        const bd = b.postedDate ? parseISO(b.postedDate).getTime() : 0;
        return bd - ad;
      });
    } else {
      list = list.slice().sort((a, b) => {
        const ae = a.reactionsCount + a.commentsCount + a.repostsCount;
        const be = b.reactionsCount + b.commentsCount + b.repostsCount;
        return be - ae;
      });
    }

    return list;
  }, [allPosts, search, authorFilter, sortMode]);

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

  if (companyLoading) {
    return (
      <Container size="3" p="8">
        <Flex justify="center">
          <Spinner size="3" />
        </Flex>
      </Container>
    );
  }

  if (!company) {
    return (
      <Container size="3" p="8">
        <Callout.Root color="gray">
          <Callout.Icon>
            <InfoCircledIcon />
          </Callout.Icon>
          <Callout.Text>Company not found.</Callout.Text>
        </Callout.Root>
      </Container>
    );
  }

  return (
    <Container size="3" p={{ initial: "4", md: "6" }}>
      <Flex direction="column" gap="5">
        {/* Header */}
        <Box>
          <Link
            href={`/companies/${companyKey}`}
            style={{ textDecoration: "none" }}
          >
            <Flex align="center" gap="1" mb="3">
              <ArrowLeftIcon />
              <Text size="2" color="gray">
                {company.name}
              </Text>
            </Flex>
          </Link>

          <TabNav.Root mb="4">
            <TabNav.Link asChild>
              <Link href={`/companies/${companyKey}`}>Overview</Link>
            </TabNav.Link>
            <TabNav.Link asChild>
              <Link href={`/companies/${companyKey}/contacts`}>Contacts</Link>
            </TabNav.Link>
            <TabNav.Link asChild>
              <Link href={`/companies/${companyKey}/emails`}>Emails</Link>
            </TabNav.Link>
            <TabNav.Link asChild active>
              <Link href={`/companies/${companyKey}/posts`}>Posts</Link>
            </TabNav.Link>
          </TabNav.Root>
        </Box>

        {/* Summary */}
        {result && (
          <Flex gap="4" align="center" wrap="wrap">
            <Text size="2" color="gray">
              {result.postsCount} post{result.postsCount !== 1 ? "s" : ""} from{" "}
              {result.peopleCount} {result.peopleCount === 1 ? "person" : "people"}
            </Text>
          </Flex>
        )}

        {/* Toolbar */}
        {allPosts.length > 0 && (
          <Flex gap="2" wrap="wrap" align="center">
            <Box style={{ minWidth: 220, flex: "1 1 220px" }}>
              <TextField.Root
                placeholder="Search posts…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              >
                <TextField.Slot>
                  <MagnifyingGlassIcon />
                </TextField.Slot>
              </TextField.Root>
            </Box>
            <Select.Root
              value={authorFilter}
              onValueChange={(v) => setAuthorFilter(v)}
            >
              <Select.Trigger variant="soft" placeholder="Author" />
              <Select.Content>
                <Select.Item value="all">All authors</Select.Item>
                {authors.map((name) => (
                  <Select.Item key={name} value={name}>
                    {name}
                  </Select.Item>
                ))}
              </Select.Content>
            </Select.Root>
            <Select.Root
              value={sortMode}
              onValueChange={(v) => setSortMode(v as SortMode)}
            >
              <Select.Trigger variant="soft" />
              <Select.Content>
                <Select.Item value="recent">Most recent</Select.Item>
                <Select.Item value="engagement">Top engagement</Select.Item>
              </Select.Content>
            </Select.Root>
            {(search || authorFilter !== "all") && (
              <Text size="1" color="gray">
                {filteredPosts.length} of {allPosts.length}
              </Text>
            )}
          </Flex>
        )}

        {/* Body */}
        {postsError ? (
          <Callout.Root color="red" variant="soft">
            <Callout.Icon>
              <ExclamationTriangleIcon />
            </Callout.Icon>
            <Callout.Text>
              Failed to load posts: {postsError.message}
            </Callout.Text>
          </Callout.Root>
        ) : postsLoading ? (
          <Flex justify="center" py="6">
            <Spinner size="3" />
          </Flex>
        ) : allPosts.length === 0 ? (
          <Callout.Root color="gray" variant="soft">
            <Callout.Icon>
              <InfoCircledIcon />
            </Callout.Icon>
            <Callout.Text>
              No posts have been scraped for this company yet.
            </Callout.Text>
          </Callout.Root>
        ) : filteredPosts.length === 0 ? (
          <Callout.Root color="gray" variant="soft">
            <Callout.Icon>
              <InfoCircledIcon />
            </Callout.Icon>
            <Callout.Text>No posts match your filters.</Callout.Text>
          </Callout.Root>
        ) : (
          <Flex direction="column" gap="3">
            {filteredPosts.map((post, idx) => (
              <PostCard key={post.postUrl ?? `${post.personName}-${idx}`} post={post} />
            ))}
          </Flex>
        )}
      </Flex>
    </Container>
  );
}
