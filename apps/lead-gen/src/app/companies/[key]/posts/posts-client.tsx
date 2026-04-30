"use client";

import { useMemo } from "react";
import {
  useGetCompanyQuery,
  useGetCompanyScrapedPostsQuery,
} from "@/__generated__/hooks";
import { useAuth } from "@/lib/auth-hooks";
import { ADMIN_EMAIL } from "@/lib/constants";
import { formatDistanceToNow, parseISO, isValid } from "date-fns";
import { button } from "@/recipes/button";
import {
  Badge,
  Box,
  Callout,
  Card,
  Flex,
  Link as RadixLink,
  Separator,
  Spinner,
  Text,
} from "@radix-ui/themes";
import {
  ChatBubbleIcon,
  ExclamationTriangleIcon,
  ExternalLinkIcon,
  HeartIcon,
  InfoCircledIcon,
  ReloadIcon,
  Share1Icon,
} from "@radix-ui/react-icons";

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

  const { data: companyData, loading: companyLoading } = useGetCompanyQuery({
    variables: { key: companyKey },
    skip: !isAdmin,
  });

  const company = companyData?.company ?? null;

  const {
    data: postsData,
    loading: postsLoading,
    error: postsError,
    refetch,
  } = useGetCompanyScrapedPostsQuery({
    variables: { companySlug: companyKey },
    skip: !isAdmin,
  });

  const result = postsData?.companyScrapedPosts;
  const posts = useMemo<ScrapedPost[]>(
    () =>
      ((result?.posts ?? []) as ScrapedPost[]).slice().sort((a, b) => {
        const ad = a.postedDate ? parseISO(a.postedDate).getTime() : 0;
        const bd = b.postedDate ? parseISO(b.postedDate).getTime() : 0;
        return bd - ad;
      }),
    [result],
  );

  if (!isAdmin) {
    return (
      <Callout.Root color="red">
        <Callout.Icon>
          <ExclamationTriangleIcon />
        </Callout.Icon>
        <Callout.Text>Access denied. Admin only.</Callout.Text>
      </Callout.Root>
    );
  }

  if (companyLoading) {
    return (
      <Flex justify="center">
        <Spinner size="3" />
      </Flex>
    );
  }

  if (!company) {
    return (
      <Callout.Root color="gray">
        <Callout.Icon>
          <InfoCircledIcon />
        </Callout.Icon>
        <Callout.Text>Company not found.</Callout.Text>
      </Callout.Root>
    );
  }

  return (
    <Flex direction="column" gap="5">
        {/* Toolbar */}
        <Flex gap="3" align="center" wrap="wrap">
          <button
            className={button({ variant: "ghost", size: "sm" })}
            onClick={() => void refetch()}
            disabled={postsLoading}
          >
            {postsLoading ? <Spinner size="1" /> : <ReloadIcon />}
            Refresh
          </button>
          {result && (
            <Text size="2" color="gray">
              {result.postsCount} post{result.postsCount !== 1 ? "s" : ""} from{" "}
              {result.peopleCount} {result.peopleCount === 1 ? "person" : "people"}
            </Text>
          )}
        </Flex>

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
        ) : postsLoading && posts.length === 0 ? (
          <Flex justify="center" py="6">
            <Spinner size="3" />
          </Flex>
        ) : posts.length === 0 ? (
          <Callout.Root color="gray" variant="soft">
            <Callout.Icon>
              <InfoCircledIcon />
            </Callout.Icon>
            <Callout.Text>
              No posts have been scraped for this company yet.
            </Callout.Text>
          </Callout.Root>
        ) : (
          <Flex direction="column" gap="3">
            {posts.map((post, idx) => (
              <PostCard
                key={post.postUrl ?? `${post.personName}-${idx}`}
                post={post}
              />
            ))}
          </Flex>
        )}
    </Flex>
  );
}
