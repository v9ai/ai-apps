export type PaperSource =
  | "semantic_scholar"
  | "open_alex"
  | "crossref"
  | "core"
  | "arxiv"
  | "zenodo";

export interface ResearchPaper {
  title: string;
  abstract_text?: string;
  authors: string[];
  year?: number;
  doi?: string;
  citation_count?: number;
  url?: string;
  pdf_url?: string;
  source: PaperSource;
  source_id: string;
  fields_of_study?: string[];
  published_date?: string;
  primary_category?: string;
  categories?: string[];
  affiliations?: string[];
  venue?: string;
}

export interface SearchArgs {
  query: string;
  year?: string;
  min_citations?: number;
  limit?: number;
}

// ─── Semantic Scholar ────────────────────────────────────────────────────────

export interface ScholarAuthor {
  authorId?: string;
  name?: string;
}

export interface ScholarOpenAccessPdf {
  url?: string;
  status?: string;
}

export interface ScholarTldr {
  model?: string;
  text?: string;
}

export interface ScholarPaper {
  paperId?: string;
  title?: string;
  abstract?: string;
  year?: number;
  citationCount?: number;
  influentialCitationCount?: number;
  tldr?: ScholarTldr;
  openAccessPdf?: ScholarOpenAccessPdf;
  authors?: ScholarAuthor[];
  fieldsOfStudy?: string[];
  url?: string;
  venue?: string;
  publicationDate?: string;
  isOpenAccess?: boolean;
}

export interface ScholarSearchResponse {
  total?: number;
  offset?: number;
  next?: number;
  data: ScholarPaper[];
}

// ─── arXiv ───────────────────────────────────────────────────────────────────

export interface ArxivPaper {
  arxiv_id: string;
  title: string;
  summary: string;
  authors: string[];
  published: string;
  updated?: string;
  categories: string[];
  pdf_url?: string;
  doi?: string;
  comment?: string;
  journal_ref?: string;
  link_url?: string;
}

// ─── OpenAlex ────────────────────────────────────────────────────────────────

export interface OpenAlexAuthor {
  id?: string;
  display_name?: string;
}

export interface OpenAlexInstitution {
  id?: string;
  display_name?: string;
  ror?: string;
  country_code?: string;
  type?: string;
}

export interface OpenAlexAuthorship {
  author?: OpenAlexAuthor;
  author_position?: string;
  institutions?: OpenAlexInstitution[];
  raw_affiliation_strings?: string[];
}

export interface OpenAlexPrimaryLocation {
  source?: { id?: string; display_name?: string; type?: string };
  pdf_url?: string;
  landing_page_url?: string;
}

export interface OpenAlexWork {
  id?: string;
  doi?: string;
  title?: string;
  publication_year?: number;
  publication_date?: string;
  cited_by_count?: number;
  authorships?: OpenAlexAuthorship[];
  abstract_inverted_index?: Record<string, number[]>;
  primary_location?: OpenAlexPrimaryLocation;
  open_access?: { is_oa?: boolean; oa_url?: string };
}

export interface OpenAlexSearchResponse {
  meta?: { count?: number; per_page?: number; page?: number };
  results: OpenAlexWork[];
}

// ─── Crossref ────────────────────────────────────────────────────────────────

export interface CrossrefAuthor {
  given?: string;
  family?: string;
}

export interface CrossrefLink {
  URL?: string;
  "content-type"?: string;
}

export interface CrossrefDateParts {
  "date-parts"?: number[][];
}

export interface CrossrefWork {
  DOI?: string;
  title?: string[];
  abstract?: string;
  author?: CrossrefAuthor[];
  published?: CrossrefDateParts;
  "is-referenced-by-count"?: number;
  link?: CrossrefLink[];
  "container-title"?: string[];
  type?: string;
  URL?: string;
}

export interface CrossrefResponse {
  status?: string;
  message?: {
    "total-results"?: number;
    items?: CrossrefWork[];
  };
}

// ─── CORE ────────────────────────────────────────────────────────────────────

export interface CoreAuthor {
  name?: string;
}

export interface CoreWork {
  id?: number;
  doi?: string;
  title?: string;
  abstract?: string;
  authors?: CoreAuthor[];
  yearPublished?: number;
  citationCount?: number;
  downloadUrl?: string;
  sourceFulltextUrls?: string[];
  language?: { code?: string; name?: string };
}

export interface CoreSearchResponse {
  totalHits?: number;
  limit?: number;
  offset?: number;
  results: CoreWork[];
}

// ─── Zenodo ──────────────────────────────────────────────────────────────────

export interface ZenodoCreator {
  name?: string;
  affiliation?: string;
  orcid?: string;
}

export interface ZenodoResourceType {
  type?: string;
  subtype?: string;
  title?: string;
}

export interface ZenodoFileLinks {
  self?: string;
}

export interface ZenodoFile {
  id?: string;
  key?: string;
  size?: number;
  checksum?: string;
  links?: ZenodoFileLinks;
}

export interface ZenodoMetadata {
  title?: string;
  description?: string;
  publication_date?: string;
  doi?: string;
  creators?: ZenodoCreator[];
  keywords?: string[];
  resource_type?: ZenodoResourceType;
  journal?: { title?: string };
  subjects?: { term?: string }[];
}

export interface ZenodoRecord {
  id?: number;
  doi?: string;
  title?: string;
  metadata?: ZenodoMetadata;
  files?: ZenodoFile[];
  links?: { self?: string; self_html?: string; doi?: string };
  stats?: { downloads?: number; views?: number };
}

export interface ZenodoSearchResponse {
  hits?: {
    total?: number;
    hits: ZenodoRecord[];
  };
}

// ─── PubMed (NCBI E-utilities) ───────────────────────────────────────────────

export interface PubMedAuthor {
  name?: string;
}

export interface PubMedSummary {
  uid?: string;
  title?: string;
  pubdate?: string;
  authors?: PubMedAuthor[];
  fulljournalname?: string;
  source?: string;
  elocationid?: string;
  articleids?: Array<{ idtype?: string; value?: string }>;
}

export interface PubMedESearchResponse {
  esearchresult?: { idlist?: string[]; count?: string };
}

export interface PubMedESummaryResponse {
  result?: Record<string, PubMedSummary | string[]>;
}

// ─── Europe PMC ──────────────────────────────────────────────────────────────

export interface EuropePmcResult {
  id?: string;
  pmid?: string;
  doi?: string;
  title?: string;
  authorString?: string;
  journalTitle?: string;
  pubYear?: string;
  abstractText?: string;
}

export interface EuropePmcResponse {
  hitCount?: number;
  resultList?: { result?: EuropePmcResult[] };
}

// ─── DataCite ────────────────────────────────────────────────────────────────

export interface DataCiteCreator {
  name?: string;
  givenName?: string;
  familyName?: string;
}

export interface DataCiteDescription {
  description?: string;
  descriptionType?: string;
}

export interface DataCiteAttributes {
  doi?: string;
  url?: string;
  publicationYear?: number;
  titles?: Array<{ title?: string }>;
  creators?: DataCiteCreator[];
  descriptions?: DataCiteDescription[];
  publisher?: string;
  container?: { title?: string };
}

export interface DataCiteItem {
  id?: string;
  attributes?: DataCiteAttributes;
}

export interface DataCiteResponse {
  data?: DataCiteItem[];
}

// ─── Unpaywall ───────────────────────────────────────────────────────────────

export interface UnpaywallLocation {
  url?: string;
  url_for_pdf?: string;
  host_type?: string;
  version?: string;
}

export interface UnpaywallResponse {
  doi?: string;
  oa_status?: string;
  is_oa?: boolean;
  best_oa_location?: UnpaywallLocation;
}

// ─── CSL-JSON (DOI content negotiation) ──────────────────────────────────────

export interface CslJsonAuthor {
  given?: string;
  family?: string;
  name?: string;
}

export interface CslJsonResponse {
  DOI?: string;
  URL?: string;
  title?: string;
  "title-short"?: string;
  author?: CslJsonAuthor[];
  issued?: CrossrefDateParts;
  published?: CrossrefDateParts;
  abstract?: string;
  "container-title"?: string;
  publisher?: string;
}

// ─── Candidate / Details (richer search-layer shape) ─────────────────────────

export type CandidateSourceBase =
  | "crossref"
  | "pubmed"
  | "semantic_scholar"
  | "openalex"
  | "arxiv"
  | "europepmc"
  | "datacite"
  | "core"
  | "zenodo";

/** Canonical sources plus callers' custom labels (e.g. "linked", "doi"). */
export type CandidateSource = CandidateSourceBase | (string & {});

export interface PaperCandidate {
  title: string;
  doi?: string;
  url?: string;
  year?: number;
  source: CandidateSource;
  authors?: string[];
  abstract?: string;
  journal?: string;
  publicationType?: string;
  tldr?: string;
  citationCount?: number;
  influentialCitationCount?: number;
  fieldsOfStudy?: string[];
  isOpenAccess?: boolean;
  openAccessPdfUrl?: string;
  s2PaperId?: string;
  [key: string]: unknown;
}

export interface PaperDetails extends PaperCandidate {
  abstract: string;
  authors: string[];
  oaUrl?: string;
  oaStatus?: string;
}

// ─── LLM Provider ────────────────────────────────────────────────────────────

export type LlmProvider =
  | { kind: "deepseek"; apiKey: string; baseUrl?: string; model?: string }
  | { kind: "qwen"; apiKey: string; model: string };

export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface ChatOptions {
  temperature?: number;
  max_tokens?: number;
}

export interface ChatResult {
  content: string;
  model: string;
  usage?: { prompt_tokens?: number; completion_tokens?: number; total_tokens?: number };
}
