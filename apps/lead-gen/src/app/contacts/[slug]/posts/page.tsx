import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/db";
import { contacts, companies } from "@/db/schema";
import { eq } from "drizzle-orm";
import { listD1Posts } from "@/lib/posts-d1-client";
import {
  Badge,
  Box,
  Card,
  Container,
  Flex,
  Link as RadixLink,
  Separator,
  TabNav,
  Text,
} from "@radix-ui/themes";
import {
  ArrowLeftIcon,
  ChatBubbleIcon,
  ExternalLinkIcon,
  HeartIcon,
  Share1Icon,
} from "@radix-ui/react-icons";

export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{ slug: string }>;
};

export default async function ContactPostsPage({ params }: Props) {
  const { slug } = await params;

  // Slug → contact (or numeric id, mirroring the contacts/[slug]/page.tsx provider).
  const numericId = /^\d+$/.test(slug) ? parseInt(slug, 10) : null;
  const cond = numericId !== null ? eq(contacts.id, numericId) : eq(contacts.slug, slug);
  const [contact] = await db.select().from(contacts).where(cond).limit(1);
  if (!contact) notFound();

  const company = contact.company_id
    ? (await db.select().from(companies).where(eq(companies.id, contact.company_id)).limit(1))[0]
    : null;

  // D1 `posts` rows use the schema default tenant_id='public' (the SQL
  // INSERTs in seeds/*-posts.sql don't specify it). Don't pass tenantId
  // here — let posts-d1-client default to "public" so we actually get
  // the rows back. The Neon contacts table uses tenant_id='vadim' for
  // historical reasons; the two stores aren't expected to match.
  const posts = await listD1Posts({
    contactId: contact.id,
    limit: 1000,
  });

  // Newest first when posted_at is parseable, fall back to id desc.
  const sorted = [...posts].sort((a, b) => {
    const ad = a.posted_at ? Date.parse(a.posted_at) : NaN;
    const bd = b.posted_at ? Date.parse(b.posted_at) : NaN;
    if (Number.isFinite(ad) && Number.isFinite(bd)) return bd - ad;
    return b.id - a.id;
  });

  const fullName = `${contact.first_name} ${contact.last_name ?? ""}`.trim();
  const contactSlug = contact.slug ?? String(contact.id);
  const companyKey = company?.key ?? null;

  return (
    <Container size="3" p={{ initial: "4", md: "6" }}>
      <Flex direction="column" gap="5">
        <Box>
          <Link href={`/contacts/${contactSlug}`} style={{ textDecoration: "none" }}>
            <Flex align="center" gap="1" mb="3">
              <ArrowLeftIcon />
              <Text size="2" color="gray">{fullName}</Text>
            </Flex>
          </Link>

          <Flex justify="between" align="end" wrap="wrap" gap="3">
            <Box>
              <Text size="6" weight="bold">{fullName}&apos;s Posts</Text>
              {company && (
                <Text size="2" color="gray" as="p" mt="1">
                  {contact.position ? `${contact.position} · ` : ""}
                  {companyKey ? (
                    <RadixLink asChild>
                      <Link href={`/companies/${companyKey}`}>{company.name}</Link>
                    </RadixLink>
                  ) : (
                    company.name
                  )}
                </Text>
              )}
            </Box>
            <Badge variant="soft" color="gray">
              {posts.length} post{posts.length === 1 ? "" : "s"} from D1
            </Badge>
          </Flex>

          <TabNav.Root mt="4">
            <TabNav.Link asChild>
              <Link href={`/contacts/${contactSlug}`}>Overview</Link>
            </TabNav.Link>
            <TabNav.Link asChild active>
              <Link href={`/contacts/${contactSlug}/posts`}>Posts</Link>
            </TabNav.Link>
          </TabNav.Root>
        </Box>

        {sorted.length === 0 ? (
          <Card><Box p="4"><Text color="gray">No posts in D1 for this contact.</Text></Box></Card>
        ) : (
          <Flex direction="column" gap="3">
            {sorted.map((p) => (
              <Card key={p.id}>
                <Box p="4">
                  <Flex direction="column" gap="2">
                    <Flex justify="between" align="start" gap="3">
                      <Flex direction="column" gap="1">
                        {p.posted_date && (
                          <Text size="1" color="gray">{p.posted_date}</Text>
                        )}
                        {p.is_repost && p.original_author && (
                          <Badge variant="soft" color="orange" size="1">
                            Reposted from {p.original_author}
                          </Badge>
                        )}
                      </Flex>
                      <Flex gap="2" align="center">
                        {p.media_type && p.media_type !== "none" && (
                          <Badge variant="soft" color="gray" size="1">{p.media_type}</Badge>
                        )}
                        {p.post_url && (
                          <RadixLink href={p.post_url} target="_blank" rel="noopener noreferrer">
                            <Flex align="center" gap="1">
                              <Text size="1">LinkedIn</Text>
                              <ExternalLinkIcon />
                            </Flex>
                          </RadixLink>
                        )}
                      </Flex>
                    </Flex>

                    {p.post_text && (
                      <Text size="2" style={{ whiteSpace: "pre-wrap" }}>
                        {p.post_text}
                      </Text>
                    )}

                    <Separator size="4" />

                    <Flex gap="4" align="center">
                      <Flex align="center" gap="1">
                        <HeartIcon />
                        <Text size="1" color="gray">{(p.reactions_count ?? 0).toLocaleString()}</Text>
                      </Flex>
                      <Flex align="center" gap="1">
                        <ChatBubbleIcon />
                        <Text size="1" color="gray">{(p.comments_count ?? 0).toLocaleString()}</Text>
                      </Flex>
                      <Flex align="center" gap="1">
                        <Share1Icon />
                        <Text size="1" color="gray">{(p.reposts_count ?? 0).toLocaleString()}</Text>
                      </Flex>
                      {p.job_embedding && (
                        <Badge variant="soft" color="green" size="1">embedded</Badge>
                      )}
                    </Flex>
                  </Flex>
                </Box>
              </Card>
            ))}
          </Flex>
        )}
      </Flex>
    </Container>
  );
}
