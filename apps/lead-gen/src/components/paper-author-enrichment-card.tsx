"use client";

/**
 * Paper-Author Enrichment Card.
 *
 * Renders the JSONB payloads that ``contact_enrich_paper_author_graph``
 * persists for paper-tagged contacts (OpenAlex profile, ORCID profile,
 * Semantic Scholar profile, GitHub profile, homepage scrape, PDF emails,
 * GitHub-handle resolution evidence). The contact-detail page renders this
 * card whenever any of those JSONB blobs are populated.
 *
 * Each branch is structurally similar:
 *   - small section heading
 *   - 3-6 key fields rendered as label/value rows
 *   - top-N collections (topics, papers, repos) as soft badges or compact lists
 *
 * The shape of each blob is defined by its respective node in
 * ``apps/lead-gen/backend/leadgen_agent/contact_enrich_paper_author_graph.py``.
 * Field accessors here are defensive — anything optional is rendered with a
 * ``—`` fallback so partial enrichments still display cleanly.
 */

import {
  Badge,
  Box,
  Card,
  Code,
  Flex,
  Heading,
  Link as RadixLink,
  Separator,
  Text,
} from "@radix-ui/themes";
import { ExternalLinkIcon, GitHubLogoIcon, LinkedInLogoIcon } from "@radix-ui/react-icons";

type Json = unknown;

type Props = {
  openalexProfile: Json;
  orcidProfile: Json;
  scholarProfile: Json;
  githubProfile: Json;
  homepageUrl: string | null;
  homepageExtract: Json;
  emailCandidates: Json;
  ghMatchStatus: string | null;
  ghMatchScore: number | null;
  ghMatchArm: string | null;
  ghMatchEvidenceRef: Json;
};

// ── tiny helpers ─────────────────────────────────────────────────────────────
const isObj = (v: unknown): v is Record<string, unknown> =>
  typeof v === "object" && v !== null && !Array.isArray(v);
const str = (v: unknown): string => (typeof v === "string" ? v : "");
const num = (v: unknown): number | null =>
  typeof v === "number" && Number.isFinite(v) ? v : null;
const arr = <T,>(v: unknown): T[] => (Array.isArray(v) ? (v as T[]) : []);

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <Flex justify="between" align="baseline" gap="3">
      <Text size="1" color="gray" style={{ minWidth: 110 }}>
        {label}
      </Text>
      <Text size="2" style={{ textAlign: "right" }}>
        {children}
      </Text>
    </Flex>
  );
}

export function PaperAuthorEnrichmentCard(props: Props) {
  const {
    openalexProfile,
    orcidProfile,
    scholarProfile,
    githubProfile,
    homepageUrl,
    homepageExtract,
    emailCandidates,
    ghMatchStatus,
    ghMatchScore,
    ghMatchArm,
    ghMatchEvidenceRef,
  } = props;

  const hasAny =
    isObj(openalexProfile) ||
    isObj(orcidProfile) ||
    isObj(scholarProfile) ||
    isObj(githubProfile) ||
    !!homepageUrl ||
    isObj(homepageExtract) ||
    Array.isArray(emailCandidates) ||
    !!ghMatchStatus;
  if (!hasAny) return null;

  return (
    <Card>
      <Box p="4">
        <Flex direction="column" gap="3">
          <Heading size="4">Paper-Author Enrichment</Heading>
          <Text size="1" color="gray">
            Aggregated by the contact_enrich_paper_author_graph fan-out. Each
            section is the persisted JSONB payload from one enricher branch.
          </Text>

          {isObj(openalexProfile) && <OpenalexSection profile={openalexProfile} />}
          {isObj(orcidProfile) && <OrcidSection profile={orcidProfile} />}
          {isObj(scholarProfile) && <ScholarSection profile={scholarProfile} />}
          {(ghMatchStatus || isObj(githubProfile)) && (
            <GithubSection
              profile={githubProfile}
              status={ghMatchStatus}
              score={ghMatchScore}
              arm={ghMatchArm}
              evidence={ghMatchEvidenceRef}
            />
          )}
          {(homepageUrl || isObj(homepageExtract)) && (
            <HomepageSection url={homepageUrl} extract={homepageExtract} />
          )}
          {Array.isArray(emailCandidates) && emailCandidates.length > 0 && (
            <EmailCandidatesSection candidates={emailCandidates} />
          )}
        </Flex>
      </Box>
    </Card>
  );
}

// ── per-branch sections ─────────────────────────────────────────────────────

function OpenalexSection({ profile }: { profile: Record<string, unknown> }) {
  // Sentinel rows persisted on no-match — show that explicitly.
  if (profile["resolved"] === false) {
    return (
      <SectionShell title="OpenAlex" badge="no_match">
        <Text size="2" color="gray">
          No OpenAlex match — {str(profile["reason"]) || "unknown reason"}
        </Text>
      </SectionShell>
    );
  }

  const id = str(profile["openalex_id"]);
  const orcid = str(profile["orcid"]);
  const institution = str(profile["institution"]);
  const country = str(profile["institution_country"]);
  const ror = str(profile["institution_ror"]);
  const instType = str(profile["institution_type"]);
  const works = num(profile["works_count"]);
  const cited = num(profile["cited_by_count"]);
  const hIndex = num(profile["h_index"]);
  const i10 = num(profile["i10_index"]);
  const conf = num(profile["match_confidence"]);
  const topics = arr<string>(profile["topics"]);
  const additionalTypes = arr<string>(profile["additional_institution_types"]);

  return (
    <SectionShell title="OpenAlex" badge={id ? "matched" : null}>
      <Flex direction="column" gap="2">
        {id && (
          <Row label="OpenAlex ID">
            <RadixLink href={`https://openalex.org/${id}`} target="_blank" rel="noopener noreferrer">
              {id} <ExternalLinkIcon style={{ display: "inline", verticalAlign: "middle" }} />
            </RadixLink>
          </Row>
        )}
        {orcid && (
          <Row label="ORCID">
            <RadixLink href={`https://orcid.org/${orcid}`} target="_blank" rel="noopener noreferrer">
              {orcid} <ExternalLinkIcon style={{ display: "inline", verticalAlign: "middle" }} />
            </RadixLink>
          </Row>
        )}
        {institution && (
          <Row label="Institution">
            {institution}
            {country ? ` · ${country}` : ""}
            {instType ? ` · ${instType}` : ""}
          </Row>
        )}
        {ror && (
          <Row label="ROR">
            <RadixLink href={ror.startsWith("http") ? ror : `https://ror.org/${ror}`} target="_blank" rel="noopener noreferrer">
              {ror.replace(/^https?:\/\/(www\.)?ror\.org\//, "")}{" "}
              <ExternalLinkIcon style={{ display: "inline", verticalAlign: "middle" }} />
            </RadixLink>
          </Row>
        )}
        {additionalTypes.length > 0 && (
          <Row label="Other affil. types">{additionalTypes.join(", ")}</Row>
        )}
        {works !== null && <Row label="Works">{works.toLocaleString()}</Row>}
        {cited !== null && <Row label="Cited by">{cited.toLocaleString()}</Row>}
        {hIndex !== null && <Row label="h-index">{hIndex}</Row>}
        {i10 !== null && <Row label="i10-index">{i10}</Row>}
        {conf !== null && <Row label="Match confidence">{(conf * 100).toFixed(0)}%</Row>}
        {topics.length > 0 && (
          <Box>
            <Text size="1" color="gray">Topics</Text>
            <Flex wrap="wrap" gap="1" mt="1">
              {topics.map((t) => (
                <Badge key={t} color="indigo" variant="soft" size="1">
                  {t}
                </Badge>
              ))}
            </Flex>
          </Box>
        )}
      </Flex>
    </SectionShell>
  );
}

function OrcidSection({ profile }: { profile: Record<string, unknown> }) {
  const orcid = str(profile["orcid"]);
  const bio = str(profile["biography"]);
  const employer = str(profile["current_employer"]);
  const employments = arr<Record<string, unknown>>(profile["employments"]);
  const educations = arr<Record<string, unknown>>(profile["educations"]);
  const urls = arr<Record<string, unknown>>(profile["researcher_urls"]);
  const externalIds = arr<Record<string, unknown>>(profile["external_ids"]);

  return (
    <SectionShell title="ORCID" badge={orcid ? "matched" : null}>
      <Flex direction="column" gap="2">
        {orcid && (
          <Row label="ORCID">
            <RadixLink href={`https://orcid.org/${orcid}`} target="_blank" rel="noopener noreferrer">
              {orcid} <ExternalLinkIcon style={{ display: "inline", verticalAlign: "middle" }} />
            </RadixLink>
          </Row>
        )}
        {employer && <Row label="Current employer">{employer}</Row>}
        {bio && (
          <Box>
            <Text size="1" color="gray">Biography</Text>
            <Text size="2" mt="1" style={{ whiteSpace: "pre-wrap" }}>
              {bio.length > 300 ? `${bio.slice(0, 300)}…` : bio}
            </Text>
          </Box>
        )}
        {employments.length > 0 && (
          <Box>
            <Text size="1" color="gray">
              Employment ({employments.length})
            </Text>
            <Flex direction="column" gap="1" mt="1">
              {employments.slice(0, 4).map((e, i) => (
                <Text key={i} size="2">
                  {str(e["organization"]) || "—"}
                  {e["role"] ? ` · ${str(e["role"])}` : ""}
                  {e["start_year"] ? ` · ${str(e["start_year"])}–${str(e["end_year"]) || "present"}` : ""}
                </Text>
              ))}
            </Flex>
          </Box>
        )}
        {educations.length > 0 && (
          <Box>
            <Text size="1" color="gray">
              Education ({educations.length})
            </Text>
            <Flex direction="column" gap="1" mt="1">
              {educations.slice(0, 4).map((e, i) => (
                <Text key={i} size="2">
                  {str(e["organization"]) || "—"}
                  {e["degree"] ? ` · ${str(e["degree"])}` : ""}
                  {e["start_year"] ? ` · ${str(e["start_year"])}–${str(e["end_year"]) || "present"}` : ""}
                </Text>
              ))}
            </Flex>
          </Box>
        )}
        {urls.length > 0 && (
          <Box>
            <Text size="1" color="gray">Researcher URLs</Text>
            <Flex direction="column" gap="1" mt="1">
              {urls.slice(0, 6).map((u, i) => (
                <RadixLink
                  key={i}
                  size="2"
                  href={str(u["url"])}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {str(u["raw_name"]) || str(u["url"])}
                </RadixLink>
              ))}
            </Flex>
          </Box>
        )}
        {externalIds.length > 0 && (
          <Row label="External IDs">
            {externalIds.map((e) => `${str(e["type"])}:${str(e["value"])}`).join(", ")}
          </Row>
        )}
      </Flex>
    </SectionShell>
  );
}

function ScholarSection({ profile }: { profile: Record<string, unknown> }) {
  const ssId = str(profile["semantic_scholar_id"]);
  const name = str(profile["name"]);
  const homepage = str(profile["homepage"]);
  const aff = str(profile["affiliation"]);
  const hIndex = num(profile["h_index"]);
  const paperCount = num(profile["paper_count"]);
  const citationCount = num(profile["citation_count"]);
  const papers = arr<Record<string, unknown>>(profile["papers"]);

  return (
    <SectionShell title="Semantic Scholar" badge={ssId ? "matched" : null}>
      <Flex direction="column" gap="2">
        {ssId && (
          <Row label="Author ID">
            <RadixLink
              href={`https://www.semanticscholar.org/author/${ssId}`}
              target="_blank"
              rel="noopener noreferrer"
            >
              {ssId} <ExternalLinkIcon style={{ display: "inline", verticalAlign: "middle" }} />
            </RadixLink>
          </Row>
        )}
        {name && <Row label="Name">{name}</Row>}
        {aff && <Row label="Affiliation">{aff}</Row>}
        {homepage && (
          <Row label="Homepage">
            <RadixLink href={homepage} target="_blank" rel="noopener noreferrer">
              {homepage.replace(/^https?:\/\//, "").slice(0, 40)}
            </RadixLink>
          </Row>
        )}
        {hIndex !== null && <Row label="h-index">{hIndex}</Row>}
        {paperCount !== null && <Row label="Papers">{paperCount.toLocaleString()}</Row>}
        {citationCount !== null && (
          <Row label="Citations">{citationCount.toLocaleString()}</Row>
        )}
        {papers.length > 0 && (
          <Box>
            <Text size="1" color="gray">
              Top papers ({papers.length})
            </Text>
            <Flex direction="column" gap="1" mt="1">
              {papers.slice(0, 5).map((p, i) => (
                <Text key={i} size="2">
                  {str(p["title"]) || "—"}
                  {p["year"] ? ` · ${str(p["year"])}` : ""}
                  {num(p["citation_count"]) !== null
                    ? ` · ${num(p["citation_count"])!.toLocaleString()} cites`
                    : ""}
                </Text>
              ))}
            </Flex>
          </Box>
        )}
      </Flex>
    </SectionShell>
  );
}

function GithubSection({
  profile,
  status,
  score,
  arm,
  evidence,
}: {
  profile: Json;
  status: string | null;
  score: number | null;
  arm: string | null;
  evidence: Json;
}) {
  const isHit = status === "hit" && isObj(profile);
  const matchedLogin = isObj(evidence) ? str(evidence["login"]) : "";

  if (!isHit) {
    return (
      <SectionShell
        title="GitHub"
        badge={status || null}
        badgeColor={status === "low_conf" ? "yellow" : status === "api_error" ? "red" : "gray"}
      >
        <Flex direction="column" gap="2">
          {arm && <Row label="Search arm">{arm}</Row>}
          {score !== null && (
            <Row label="Match score">
              {score.toFixed(3)}{" "}
              <Text size="1" color="gray">
                (hit ≥ 0.70, low_conf ≥ 0.45)
              </Text>
            </Row>
          )}
          {matchedLogin && (
            <Row label="Best candidate">
              <RadixLink
                href={`https://github.com/${matchedLogin}`}
                target="_blank"
                rel="noopener noreferrer"
              >
                <GitHubLogoIcon style={{ display: "inline", verticalAlign: "middle" }} />{" "}
                {matchedLogin}
              </RadixLink>
            </Row>
          )}
          {isObj(evidence) && Array.isArray(evidence["arms_matched"]) && (
            <Row label="Arms matched">
              {(evidence["arms_matched"] as unknown[]).map(String).join(", ")}
            </Row>
          )}
          {isObj(evidence) && str(evidence["bio_excerpt"]) && (
            <Box>
              <Text size="1" color="gray">Bio excerpt</Text>
              <Text size="2" mt="1" color="gray" style={{ fontStyle: "italic" }}>
                {str(evidence["bio_excerpt"])}
              </Text>
            </Box>
          )}
        </Flex>
      </SectionShell>
    );
  }

  // Full hit + profile
  const p = profile as Record<string, unknown>;
  const login = str(p["login"]);
  const name = str(p["name"]);
  const bio = str(p["bio"]);
  const company = str(p["company"]);
  const location = str(p["location"]);
  const blog = str(p["blog"]);
  const followers = num(p["followers"]);
  const publicRepos = num(p["public_repos"]);
  const totalCommits = num(p["total_commits"]);
  const lastPush = str(p["last_push_at"]);
  const orgLogins = arr<string>(p["org_logins"]);
  const topLangs = arr<Record<string, unknown>>(p["top_languages"]);
  const topTopics = arr<Record<string, unknown>>(p["top_topics"]);
  const aiTopicHits = arr<string>(p["ai_topic_hits"]);
  const pinned = arr<Record<string, unknown>>(p["pinned_repos"]);
  const social = arr<Record<string, unknown>>(p["social_accounts"]);
  const linkedinUrl = str(p["linkedin_url"]);
  const schemaVersion = num(p["schema_version"]);

  return (
    <SectionShell title="GitHub" badge="hit" badgeColor="green">
      <Flex direction="column" gap="2">
        <Row label="Login">
          <RadixLink
            href={`https://github.com/${login}`}
            target="_blank"
            rel="noopener noreferrer"
          >
            <GitHubLogoIcon style={{ display: "inline", verticalAlign: "middle" }} /> {login}
          </RadixLink>
        </Row>
        {name && <Row label="Name">{name}</Row>}
        {bio && (
          <Box>
            <Text size="1" color="gray">Bio</Text>
            <Text size="2" mt="1" style={{ whiteSpace: "pre-wrap" }}>
              {bio.length > 240 ? `${bio.slice(0, 240)}…` : bio}
            </Text>
          </Box>
        )}
        {company && <Row label="Company">{company}</Row>}
        {location && <Row label="Location">{location}</Row>}
        {blog && (
          <Row label="Website">
            <RadixLink href={blog.startsWith("http") ? blog : `https://${blog}`} target="_blank" rel="noopener noreferrer">
              {blog.replace(/^https?:\/\//, "").slice(0, 40)}
            </RadixLink>
          </Row>
        )}
        {followers !== null && <Row label="Followers">{followers.toLocaleString()}</Row>}
        {publicRepos !== null && <Row label="Public repos">{publicRepos}</Row>}
        {totalCommits !== null && <Row label="Total commits">{totalCommits.toLocaleString()}</Row>}
        {lastPush && (
          <Row label="Last push">{new Date(lastPush).toLocaleDateString()}</Row>
        )}
        {orgLogins.length > 0 && (
          <Box>
            <Text size="1" color="gray">Org memberships</Text>
            <Flex wrap="wrap" gap="1" mt="1">
              {orgLogins.map((o) => (
                <Badge key={o} color="violet" variant="soft" size="1">
                  {o}
                </Badge>
              ))}
            </Flex>
          </Box>
        )}
        {topLangs.length > 0 && (
          <Box>
            <Text size="1" color="gray">Top languages</Text>
            <Flex wrap="wrap" gap="1" mt="1">
              {topLangs.slice(0, 5).map((l, i) => (
                <Badge key={i} color="cyan" variant="soft" size="1">
                  {str(l["name"])}
                </Badge>
              ))}
            </Flex>
          </Box>
        )}
        {topTopics.length > 0 && (
          <Box>
            <Text size="1" color="gray">Top repo topics</Text>
            <Flex wrap="wrap" gap="1" mt="1">
              {topTopics.slice(0, 8).map((t, i) => (
                <Badge key={i} color="indigo" variant="soft" size="1">
                  {str(t["name"])}
                </Badge>
              ))}
            </Flex>
          </Box>
        )}
        {aiTopicHits.length > 0 && (
          <Row label="AI topic hits">{aiTopicHits.join(", ")}</Row>
        )}
        {pinned.length > 0 && (
          <Box>
            <Text size="1" color="gray">
              Pinned repos ({pinned.length})
            </Text>
            <Flex direction="column" gap="1" mt="1">
              {pinned.slice(0, 6).map((r, i) => (
                <Flex key={i} justify="between" gap="2">
                  <RadixLink
                    size="2"
                    href={str(r["html_url"])}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    {str(r["full_name"]) || str(r["name"])}
                  </RadixLink>
                  <Text size="1" color="gray">
                    {num(r["stars"]) !== null ? `★ ${num(r["stars"])}` : ""}
                    {str(r["language"]) ? ` · ${str(r["language"])}` : ""}
                  </Text>
                </Flex>
              ))}
            </Flex>
          </Box>
        )}
        {social.length > 0 && (
          <Box>
            <Text size="1" color="gray">Social accounts</Text>
            <Flex wrap="wrap" gap="1" mt="1">
              {social.map((s, i) => (
                <RadixLink
                  key={i}
                  size="1"
                  href={str(s["url"])}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {str(s["provider"]) === "LINKEDIN" ? (
                    <LinkedInLogoIcon style={{ display: "inline", verticalAlign: "middle" }} />
                  ) : null}{" "}
                  {str(s["display_name"]) || str(s["provider"])}
                </RadixLink>
              ))}
            </Flex>
          </Box>
        )}
        {linkedinUrl && (
          <Row label="LinkedIn (from socials)">
            <RadixLink href={linkedinUrl} target="_blank" rel="noopener noreferrer">
              <LinkedInLogoIcon style={{ display: "inline", verticalAlign: "middle" }} />{" "}
              {linkedinUrl.replace(/^https?:\/\/(www\.)?linkedin\.com\//, "")}
            </RadixLink>
          </Row>
        )}
        {(arm || score !== null) && (
          <Row label="Match meta">
            {arm ? <Code variant="ghost">{arm}</Code> : ""}{" "}
            {score !== null && `score=${score.toFixed(3)}`}
            {schemaVersion !== null ? ` · v${schemaVersion}` : ""}
          </Row>
        )}
      </Flex>
    </SectionShell>
  );
}

function HomepageSection({
  url,
  extract,
}: {
  url: string | null;
  extract: Json;
}) {
  const ex = isObj(extract) ? extract : null;
  const emails = ex ? arr<string>(ex["emails"]) : [];
  const links = ex ? arr<Record<string, unknown>>(ex["links"]) : [];
  const title = ex ? str(ex["title"]) : "";
  const text = ex ? str(ex["text"]) : "";

  return (
    <SectionShell title="Homepage" badge={url ? "scraped" : null}>
      <Flex direction="column" gap="2">
        {url && (
          <Row label="URL">
            <RadixLink href={url} target="_blank" rel="noopener noreferrer">
              {url.replace(/^https?:\/\//, "")} <ExternalLinkIcon style={{ display: "inline", verticalAlign: "middle" }} />
            </RadixLink>
          </Row>
        )}
        {title && <Row label="Page title">{title}</Row>}
        {emails.length > 0 && (
          <Row label="Emails on page">{emails.join(", ")}</Row>
        )}
        {links.length > 0 && (
          <Box>
            <Text size="1" color="gray">
              Outbound links ({links.length})
            </Text>
            <Flex direction="column" gap="1" mt="1">
              {links.slice(0, 6).map((l, i) => (
                <RadixLink
                  key={i}
                  size="1"
                  href={str(l["url"])}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {str(l["text"]) || str(l["url"])}
                </RadixLink>
              ))}
            </Flex>
          </Box>
        )}
        {text && (
          <Box>
            <Text size="1" color="gray">Page text excerpt</Text>
            <Text size="2" mt="1" color="gray" style={{ whiteSpace: "pre-wrap" }}>
              {text.length > 300 ? `${text.slice(0, 300)}…` : text}
            </Text>
          </Box>
        )}
      </Flex>
    </SectionShell>
  );
}

function EmailCandidatesSection({ candidates }: { candidates: unknown[] }) {
  const items = candidates.filter(isObj) as Record<string, unknown>[];
  if (items.length === 0) return null;
  return (
    <SectionShell title="Email candidates" badge={`${items.length}`}>
      <Flex direction="column" gap="1">
        {items.slice(0, 8).map((c, i) => (
          <Flex key={i} justify="between" gap="2">
            <Code variant="ghost">{str(c["email"]) || "—"}</Code>
            <Text size="1" color="gray">
              {num(c["confidence"]) !== null
                ? `${(num(c["confidence"])! * 100).toFixed(0)}%`
                : ""}
              {str(c["source"]) ? ` · ${str(c["source"])}` : ""}
            </Text>
          </Flex>
        ))}
      </Flex>
    </SectionShell>
  );
}

// ── shared chrome ───────────────────────────────────────────────────────────

function SectionShell({
  title,
  badge,
  badgeColor = "gray",
  children,
}: {
  title: string;
  badge?: string | null;
  badgeColor?:
    | "gray"
    | "green"
    | "yellow"
    | "red"
    | "indigo"
    | "violet"
    | "cyan"
    | "blue";
  children: React.ReactNode;
}) {
  return (
    <Box>
      <Separator size="4" mb="3" />
      <Flex align="center" gap="2" mb="2">
        <Heading size="3">{title}</Heading>
        {badge && (
          <Badge color={badgeColor} variant="soft" size="1">
            {badge}
          </Badge>
        )}
      </Flex>
      {children}
    </Box>
  );
}
