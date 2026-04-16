import { NextRequest, NextResponse } from "next/server";
import {
  upsertCompany,
  upsertPerson,
  insertPosts,
  getCompanyPosts,
  getCompanyStats,
  personHasPosts,
  type PostInput,
} from "@/lib/posts-db";

// GET /api/companies/[slug]/posts — return all posts for a company
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;

  const stats = getCompanyStats(slug);
  if (!stats) {
    return NextResponse.json({ error: "Company not found" }, { status: 404 });
  }

  const posts = getCompanyPosts(slug);
  return NextResponse.json({ ...stats, posts });
}

// POST /api/companies/[slug]/posts — save scraped posts for a person
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  const body = await request.json();

  const {
    companyName,
    companyLinkedinUrl,
    personName,
    personLinkedinUrl,
    personHeadline,
    posts,
  } = body as {
    companyName: string;
    companyLinkedinUrl: string | null;
    personName: string;
    personLinkedinUrl: string;
    personHeadline: string | null;
    posts: PostInput[];
  };

  const companyId = upsertCompany(slug, companyName, companyLinkedinUrl);
  const personId = upsertPerson(companyId, personName, personLinkedinUrl, personHeadline);
  const result = insertPosts(personId, posts);

  return NextResponse.json({
    companyId,
    personId,
    ...result,
  });
}

// HEAD /api/companies/[slug]/posts?person=linkedinUrl — check if person has posts
export async function HEAD(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug: _slug } = await params;
  const personUrl = request.nextUrl.searchParams.get("person");
  if (!personUrl) {
    return new NextResponse(null, { status: 400 });
  }

  const hasPosts = personHasPosts(personUrl);
  return new NextResponse(null, {
    status: hasPosts ? 200 : 404,
    headers: { "X-Has-Posts": hasPosts ? "true" : "false" },
  });
}
