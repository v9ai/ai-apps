import { getCompanyPosts, getCompanyStats } from "@/lib/posts-db";
import type { GraphQLContext } from "../context";
import { isAdminEmail } from "@/lib/admin";
import { companies } from "@/db/schema";
import { eq } from "drizzle-orm";

interface SqlitePost {
  person_name: string;
  person_linkedin_url: string;
  person_headline: string | null;
  post_url: string | null;
  post_text: string | null;
  posted_date: string | null;
  reactions_count: number;
  comments_count: number;
  reposts_count: number;
  media_type: string;
  is_repost: number;
  original_author: string | null;
  author_name: string | null;
  author_url: string | null;
  scraped_at: string;
}

interface SqliteStats {
  company_name: string;
  slug: string;
  people_count: number;
  posts_count: number;
  first_scraped: string | null;
  last_scraped: string | null;
}

const ScrapedPost = {
  personName:       (p: SqlitePost) => p.person_name,
  personLinkedinUrl:(p: SqlitePost) => p.person_linkedin_url,
  personHeadline:   (p: SqlitePost) => p.person_headline,
  postUrl:          (p: SqlitePost) => p.post_url,
  postText:         (p: SqlitePost) => p.post_text,
  postedDate:       (p: SqlitePost) => p.posted_date,
  reactionsCount:   (p: SqlitePost) => p.reactions_count,
  commentsCount:    (p: SqlitePost) => p.comments_count,
  repostsCount:     (p: SqlitePost) => p.reposts_count,
  mediaType:        (p: SqlitePost) => p.media_type,
  isRepost:         (p: SqlitePost) => !!p.is_repost,
  originalAuthor:   (p: SqlitePost) => p.original_author,
  authorName:       (p: SqlitePost) => p.author_name,
  authorUrl:        (p: SqlitePost) => p.author_url,
  scrapedAt:        (p: SqlitePost) => p.scraped_at,
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

      // Try the provided slug first (company.key from Neon, e.g. "oliver-bernard")
      // then the LinkedIn slug extracted from linkedin_url (e.g. "oliverbernard")
      const slugsToTry = [args.companySlug];

      const [company] = await context.db
        .select({ linkedin_url: companies.linkedin_url })
        .from(companies)
        .where(eq(companies.key, args.companySlug))
        .limit(1);

      if (company?.linkedin_url) {
        const match = company.linkedin_url.match(/\/company\/([^/?#]+)/);
        if (match && match[1] !== args.companySlug) {
          slugsToTry.push(match[1]);
        }
      }

      for (const slug of slugsToTry) {
        const stats = getCompanyStats(slug) as SqliteStats | undefined;
        if (stats) {
          const posts = getCompanyPosts(slug);
          return {
            companyName: stats.company_name,
            slug: stats.slug,
            peopleCount: stats.people_count,
            postsCount: stats.posts_count,
            firstScraped: stats.first_scraped,
            lastScraped: stats.last_scraped,
            posts,
          };
        }
      }

      return empty;
    },
  },
};
