import { Badge, Box, Container, Flex, Heading, Link as RxLink, Table, Text } from "@radix-ui/themes";
import Link from "next/link";

// Tier semantics for gh_ai_repos D1 leads — mirrors the /companies?tier=
// shape but derives tier from final_score + icp_disqualifier instead of
// the Neon ai_tier column (different DB, different scoring system).
//
//   tier=1        — hot:  not disqualified, score >= 0.7
//   tier=2        — warm: not disqualified, 0.5 <= score < 0.7
//   tier=3        — cold: not disqualified, 0.4 <= score < 0.5
//   tier=disq     — show only disqualified rows (audit view)
//   tier=all      — every row with score >= 0.4 (default)

export const dynamic = "force-dynamic";
export const revalidate = 0;

const D1_API = (acct: string, db: string) =>
  `https://api.cloudflare.com/client/v4/accounts/${acct}/d1/database/${db}/query`;

type Row = {
  full_name: string;
  html_url: string | null;
  stars: number;
  score: number;
  monetization_stage: string | null;
  matched_topic: string | null;
  topics_json: string | null;
  commercial_intent: string | null;
  buyer_persona: string | null;
  pain_points: string | null;
  icp_disqualifier: string | null;
};

async function loadLeads(tier: string): Promise<{ rows: Row[]; error?: string }> {
  const acct = process.env.CLOUDFLARE_ACCOUNT_ID;
  const tok = process.env.CLOUDFLARE_API_TOKEN;
  // The lead-gen-jobs D1 ID is not a secret — it's hardcoded in
  // edge/wrangler.jsonc. Override via env if a different DB is wired in
  // later (e.g. a staging mirror).
  const db =
    process.env.CLOUDFLARE_D1_LEADGEN_JOBS_ID ??
    "9531f206-acb4-4024-8d7c-d88e7b73bceb";
  if (!acct || !tok) {
    return {
      rows: [],
      error:
        "missing CLOUDFLARE_ACCOUNT_ID / CLOUDFLARE_API_TOKEN on the Vercel project",
    };
  }

  // Build the WHERE based on tier. We always join gh_lead_research so the
  // disqualifier column surfaces; LEFT JOIN keeps not-yet-researched rows.
  const whereByTier: Record<string, string> = {
    "1":
      "r.final_score >= 0.7 AND (lr.icp_disqualifier IS NULL OR lr.id IS NULL)",
    "2":
      "r.final_score >= 0.5 AND r.final_score < 0.7 AND (lr.icp_disqualifier IS NULL OR lr.id IS NULL)",
    "3":
      "r.final_score >= 0.4 AND r.final_score < 0.5 AND (lr.icp_disqualifier IS NULL OR lr.id IS NULL)",
    disq: "lr.icp_disqualifier IS NOT NULL",
    all: "r.final_score >= 0.4",
  };
  const where = whereByTier[tier] ?? whereByTier.all;

  const sql = `
    SELECT
      r.full_name, r.html_url, r.stars,
      ROUND(r.final_score, 3) AS score,
      r.monetization_stage, r.matched_topic, r.topics_json,
      r.commercial_intent, r.buyer_persona, r.pain_points,
      lr.icp_disqualifier
    FROM gh_repos r
    LEFT JOIN gh_lead_research lr ON lr.repo_id = r.id
    WHERE ${where}
    ORDER BY r.final_score DESC
    LIMIT 200
  `;

  const resp = await fetch(D1_API(acct, db), {
    method: "POST",
    headers: {
      Authorization: `Bearer ${tok}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ sql }),
    cache: "no-store",
  });

  if (!resp.ok) {
    return { rows: [], error: `D1 HTTP ${resp.status}: ${await resp.text()}` };
  }
  const payload: any = await resp.json();
  const results = payload?.result?.[0]?.results ?? [];
  return { rows: results as Row[] };
}

function parseJsonArray(s: string | null): string[] {
  if (!s) return [];
  try {
    const parsed = JSON.parse(s);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function tierLink(tier: string, label: string, current: string) {
  const active = current === tier;
  return (
    <Link href={`/gh-leads?tier=${tier}`} prefetch={false} style={{ textDecoration: "none" }}>
      <Badge size="2" variant={active ? "solid" : "soft"} color={active ? "iris" : "gray"}>
        {label}
      </Badge>
    </Link>
  );
}

type Props = {
  searchParams: Promise<{ tier?: string }>;
};

export default async function GhLeadsPage({ searchParams }: Props) {
  const sp = await searchParams;
  const tier = sp.tier ?? "all";
  const { rows, error } = await loadLeads(tier);

  return (
    <Container size="4" p="6">
      <Flex direction="column" gap="4">
        <Box>
          <Heading size="6">GitHub AI repo leads</Heading>
          <Text size="2" color="gray">
            Discovered by the <code>gh_ai_repos</code> LangGraph; researched by{" "}
            <code>gh_lead_research</code>. Stored in Cloudflare D1 (<code>lead-gen-jobs</code>).
          </Text>
        </Box>

        <Flex gap="2" wrap="wrap" align="center">
          <Text size="2" color="gray">Tier:</Text>
          {tierLink("1", "1 — hot (≥0.70)", tier)}
          {tierLink("2", "2 — warm (0.50–0.69)", tier)}
          {tierLink("3", "3 — cold (0.40–0.49)", tier)}
          {tierLink("all", "all", tier)}
          {tierLink("disq", "🚫 disqualified", tier)}
        </Flex>

        {error ? (
          <Box p="4" style={{ background: "var(--red-2)", borderRadius: 8 }}>
            <Text color="red" size="2">{error}</Text>
          </Box>
        ) : null}

        <Text size="2" color="gray">
          {rows.length} {rows.length === 1 ? "lead" : "leads"} matching tier <strong>{tier}</strong>
        </Text>

        <Table.Root variant="surface">
          <Table.Header>
            <Table.Row>
              <Table.ColumnHeaderCell>Repo</Table.ColumnHeaderCell>
              <Table.ColumnHeaderCell>★</Table.ColumnHeaderCell>
              <Table.ColumnHeaderCell>Score</Table.ColumnHeaderCell>
              <Table.ColumnHeaderCell>Stage</Table.ColumnHeaderCell>
              <Table.ColumnHeaderCell>Persona</Table.ColumnHeaderCell>
              <Table.ColumnHeaderCell>Tags</Table.ColumnHeaderCell>
              <Table.ColumnHeaderCell>Status</Table.ColumnHeaderCell>
            </Table.Row>
          </Table.Header>
          <Table.Body>
            {rows.map((r) => {
              const url = r.html_url ?? `https://github.com/${r.full_name}`;
              const topics = parseJsonArray(r.topics_json);
              const pains = parseJsonArray(r.pain_points);
              return (
                <Table.Row key={r.full_name}>
                  <Table.Cell>
                    <RxLink href={url} target="_blank" rel="noopener noreferrer" size="2">
                      {r.full_name}
                    </RxLink>
                  </Table.Cell>
                  <Table.Cell>
                    <Text size="1" color="gray">{r.stars.toLocaleString()}</Text>
                  </Table.Cell>
                  <Table.Cell>
                    <Text size="2" weight="medium">{r.score.toFixed(2)}</Text>
                  </Table.Cell>
                  <Table.Cell>
                    {r.monetization_stage ? (
                      <Badge size="1" color="green" variant="soft">{r.monetization_stage}</Badge>
                    ) : (
                      <Text size="1" color="gray">—</Text>
                    )}
                  </Table.Cell>
                  <Table.Cell>
                    {r.buyer_persona ? (
                      <Badge size="1" color="iris" variant="soft">{r.buyer_persona}</Badge>
                    ) : (
                      <Text size="1" color="gray">—</Text>
                    )}
                  </Table.Cell>
                  <Table.Cell>
                    <Flex gap="1" wrap="wrap" style={{ maxWidth: 360 }}>
                      {r.matched_topic ? (
                        <Badge size="1" color="amber" variant="soft">match:{r.matched_topic}</Badge>
                      ) : null}
                      {topics.slice(0, 6).map((t) => (
                        <Badge key={t} size="1" variant="surface">{t}</Badge>
                      ))}
                      {pains.slice(0, 3).map((p) => (
                        <Badge key={`pain-${p}`} size="1" color="ruby" variant="soft">pain:{p}</Badge>
                      ))}
                    </Flex>
                  </Table.Cell>
                  <Table.Cell>
                    {r.icp_disqualifier ? (
                      <Text size="1" color="red" title={r.icp_disqualifier}>
                        🚫 {r.icp_disqualifier.slice(0, 60)}
                        {r.icp_disqualifier.length > 60 ? "…" : ""}
                      </Text>
                    ) : (
                      <Badge size="1" color="grass" variant="soft">✓ clear</Badge>
                    )}
                  </Table.Cell>
                </Table.Row>
              );
            })}
          </Table.Body>
        </Table.Root>
      </Flex>
    </Container>
  );
}
