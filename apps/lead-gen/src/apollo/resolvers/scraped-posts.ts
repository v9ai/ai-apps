import type { GraphQLContext } from "../context";
import { isAdminEmail } from "@/lib/admin";
import { listD1PostsByCompanyKey, type D1PostRow } from "@/lib/posts-d1-client";

const ScrapedPost = {
  personName:        (p: D1PostRow) => p.author_name ?? "",
  personLinkedinUrl: (p: D1PostRow) => p.author_url ?? "",
  personHeadline:    (_p: D1PostRow) => null,
  postUrl:           (p: D1PostRow) => p.post_url,
  postText:          (p: D1PostRow) => p.post_text,
  postedDate:        (p: D1PostRow) => p.posted_date ?? p.posted_at,
  reactionsCount:    (p: D1PostRow) => p.reactions_count,
  commentsCount:     (p: D1PostRow) => p.comments_count,
  repostsCount:      (p: D1PostRow) => p.reposts_count,
  mediaType:         (p: D1PostRow) => p.media_type,
  isRepost:          (p: D1PostRow) => !!p.is_repost,
  originalAuthor:    (p: D1PostRow) => p.original_author,
  authorName:        (p: D1PostRow) => p.author_name,
  authorUrl:         (p: D1PostRow) => p.author_url,
  scrapedAt:         (p: D1PostRow) => p.scraped_at,
};

export const scrapedPostResolvers = {
  ScrapedPost,

  Query: {
    async companyScrapedPosts(
      _parent: unknown,
      args: { companySlug: string },
      context: GraphQLContext,
    ) {
      if (!context.userId || !isAdminEmail(context.userEmail)) {
        throw new Error("Forbidden");
      }

      const empty = {
        companyName: args.companySlug,
        slug: args.companySlug,
        peopleCount: 0,
        postsCount: 0,
        firstScraped: null,
        lastScraped: null,
        posts: [],
      };

      const rows = await listD1PostsByCompanyKey(args.companySlug, 1000);
      const posts = rows.filter((r) => r.type === "post");

      if (posts.length === 0) return empty;

      const peopleCount = new Set(
        posts.map((p) => p.author_url).filter((u): u is string => !!u),
      ).size;

      let firstScraped: string | null = null;
      let lastScraped: string | null = null;
      for (const p of posts) {
        if (!p.scraped_at) continue;
        if (firstScraped === null || p.scraped_at < firstScraped) firstScraped = p.scraped_at;
        if (lastScraped === null || p.scraped_at > lastScraped) lastScraped = p.scraped_at;
      }

      const companyName = posts.find((p) => p.company_name)?.company_name ?? args.companySlug;

      return {
        companyName,
        slug: args.companySlug,
        peopleCount,
        postsCount: posts.length,
        firstScraped,
        lastScraped,
        posts,
      };
    },
  },
};
