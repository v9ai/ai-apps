import { gql } from '@apollo/client';
import * as Apollo from '@apollo/client';
export type Maybe<T> = T | null;
export type InputMaybe<T> = Maybe<T>;
export type Exact<T extends { [key: string]: unknown }> = { [K in keyof T]: T[K] };
export type MakeOptional<T, K extends keyof T> = Omit<T, K> & { [SubKey in K]?: Maybe<T[SubKey]> };
export type MakeMaybe<T, K extends keyof T> = Omit<T, K> & { [SubKey in K]: Maybe<T[SubKey]> };
export type MakeEmpty<T extends { [key: string]: unknown }, K extends keyof T> = { [_ in K]?: never };
export type Incremental<T> = T | { [P in keyof T]?: P extends ' $fragmentName' | '__typename' ? T[P] : never };
const defaultOptions = {} as const;
/** All built-in and custom scalars, mapped to their actual values */
export type Scalars = {
  ID: { input: string; output: string; }
  String: { input: string; output: string; }
  Boolean: { input: boolean; output: boolean; }
  Int: { input: number; output: number; }
  Float: { input: number; output: number; }
  DateTime: { input: string; output: string; }
  EmailAddress: { input: string; output: string; }
  JSON: { input: any; output: any; }
  URL: { input: string; output: string; }
  Upload: { input: File; output: File; }
};

export type AnalyzeCompanyResponse = {
  __typename?: 'AnalyzeCompanyResponse';
  companyId: Maybe<Scalars['Int']['output']>;
  companyKey: Maybe<Scalars['String']['output']>;
  message: Maybe<Scalars['String']['output']>;
  success: Scalars['Boolean']['output'];
};

export type AnalyzePostsResult = {
  __typename?: 'AnalyzePostsResult';
  analyzed: Scalars['Int']['output'];
  errors: Array<Scalars['String']['output']>;
  failed: Scalars['Int']['output'];
  success: Scalars['Boolean']['output'];
};

export type ApplyEmailPatternResult = {
  __typename?: 'ApplyEmailPatternResult';
  contacts: Array<Contact>;
  contactsUpdated: Scalars['Int']['output'];
  message: Scalars['String']['output'];
  pattern: Maybe<Scalars['String']['output']>;
  success: Scalars['Boolean']['output'];
};

export type ArbitrageOpportunity = {
  __typename?: 'ArbitrageOpportunity';
  companyName: Scalars['String']['output'];
  currency: Scalars['String']['output'];
  isHighSalaryRegionPay: Scalars['Boolean']['output'];
  jobTitle: Scalars['String']['output'];
  jobUrl: Scalars['String']['output'];
  postedLocation: Scalars['String']['output'];
  salaryMax: Scalars['Float']['output'];
  salaryMedian: Scalars['Float']['output'];
  salaryMin: Scalars['Float']['output'];
  salaryPercentile: Scalars['Float']['output'];
  salaryPremium: Scalars['Float']['output'];
};

export type ArbitrageRegion = {
  __typename?: 'ArbitrageRegion';
  avgPremium: Scalars['Float']['output'];
  count: Scalars['Int']['output'];
  region: Scalars['String']['output'];
};

export type ArbitrageReport = {
  __typename?: 'ArbitrageReport';
  byRegion: Array<ArbitrageRegion>;
  topOpportunities: Array<ArbitrageOpportunity>;
  totalOpportunities: Scalars['Int']['output'];
};

export type ArchiveEmailResult = {
  __typename?: 'ArchiveEmailResult';
  message: Scalars['String']['output'];
  success: Scalars['Boolean']['output'];
};

export type BatchDetectIntentResult = {
  __typename?: 'BatchDetectIntentResult';
  errors: Array<Scalars['String']['output']>;
  processed: Scalars['Int']['output'];
  signalsDetected: Scalars['Int']['output'];
  success: Scalars['Boolean']['output'];
};

export type BatchDismissResult = {
  __typename?: 'BatchDismissResult';
  dismissed: Scalars['Int']['output'];
  success: Scalars['Boolean']['output'];
};

export type BatchOperationResult = {
  __typename?: 'BatchOperationResult';
  affected: Scalars['Int']['output'];
  message: Maybe<Scalars['String']['output']>;
  success: Scalars['Boolean']['output'];
};

export type BatchRecipientInput = {
  companyId?: InputMaybe<Scalars['Int']['input']>;
  contactId?: InputMaybe<Scalars['Int']['input']>;
  email: Scalars['String']['input'];
  name: Scalars['String']['input'];
};

export type BatchSendDraftResult = {
  __typename?: 'BatchSendDraftResult';
  errors: Array<Scalars['String']['output']>;
  failed: Scalars['Int']['output'];
  sent: Scalars['Int']['output'];
  success: Scalars['Boolean']['output'];
};

export type CancelCompanyEmailsResult = {
  __typename?: 'CancelCompanyEmailsResult';
  cancelledCount: Scalars['Int']['output'];
  failedCount: Scalars['Int']['output'];
  message: Scalars['String']['output'];
  success: Scalars['Boolean']['output'];
};

export type CancelEmailResult = {
  __typename?: 'CancelEmailResult';
  error: Maybe<Scalars['String']['output']>;
  success: Scalars['Boolean']['output'];
};

export type ClassificationCount = {
  __typename?: 'ClassificationCount';
  classification: Scalars['String']['output'];
  count: Scalars['Int']['output'];
};

export type ClassifyBatchResult = {
  __typename?: 'ClassifyBatchResult';
  classified: Scalars['Int']['output'];
  message: Scalars['String']['output'];
  success: Scalars['Boolean']['output'];
};

export type ClassifyEmailResult = {
  __typename?: 'ClassifyEmailResult';
  classification: Maybe<Scalars['String']['output']>;
  confidence: Maybe<Scalars['Float']['output']>;
  matchedContactId: Maybe<Scalars['Int']['output']>;
  success: Scalars['Boolean']['output'];
};

export type CompaniesResponse = {
  __typename?: 'CompaniesResponse';
  companies: Array<Company>;
  totalCount: Scalars['Int']['output'];
};

export type Company = {
  __typename?: 'Company';
  ai_classification_confidence: Scalars['Float']['output'];
  ai_classification_reason: Maybe<Scalars['String']['output']>;
  ai_tier: Scalars['Int']['output'];
  blocked: Scalars['Boolean']['output'];
  category: CompanyCategory;
  contacts: Array<Contact>;
  created_at: Scalars['String']['output'];
  /** ML data quality assessment */
  dataQuality: DataQualityScore;
  deep_analysis: Maybe<Scalars['String']['output']>;
  description: Maybe<Scalars['String']['output']>;
  email: Maybe<Scalars['String']['output']>;
  emailsList: Array<Scalars['String']['output']>;
  facts: Array<CompanyFact>;
  facts_count: Scalars['Int']['output'];
  githubUrl: Maybe<Scalars['String']['output']>;
  /** ICP similarity score via embeddings (0-1) */
  icpSimilarity: Maybe<Scalars['Float']['output']>;
  id: Scalars['Int']['output'];
  industries: Array<Scalars['String']['output']>;
  industry: Maybe<Scalars['String']['output']>;
  intentScore: Scalars['Float']['output'];
  intentScoreDetails: Maybe<IntentScore>;
  intentScoreUpdatedAt: Maybe<Scalars['String']['output']>;
  intentSignalsCount: Scalars['Int']['output'];
  job_board_url: Maybe<Scalars['String']['output']>;
  key: Scalars['String']['output'];
  last_seen_capture_timestamp: Maybe<Scalars['String']['output']>;
  last_seen_crawl_id: Maybe<Scalars['String']['output']>;
  last_seen_source_url: Maybe<Scalars['String']['output']>;
  linkedin_url: Maybe<Scalars['String']['output']>;
  location: Maybe<Scalars['String']['output']>;
  logo_url: Maybe<Scalars['String']['output']>;
  name: Scalars['String']['output'];
  opportunities: Array<Opportunity>;
  /** ML quality gate evaluation */
  qualityGate: QualityGateResult;
  /** ML-computed rank score (0-1) */
  rankScore: Maybe<Scalars['Float']['output']>;
  score: Scalars['Float']['output'];
  score_reasons: Array<Scalars['String']['output']>;
  service_taxonomy: Array<Scalars['String']['output']>;
  services: Array<Scalars['String']['output']>;
  size: Maybe<Scalars['String']['output']>;
  snapshots: Array<CompanySnapshot>;
  snapshots_count: Scalars['Int']['output'];
  tags: Array<Scalars['String']['output']>;
  updated_at: Scalars['String']['output'];
  website: Maybe<Scalars['String']['output']>;
};


export type CompanyFactsArgs = {
  field?: InputMaybe<Scalars['String']['input']>;
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
};


export type CompanySnapshotsArgs = {
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
};

export type CompanyCategory =
  | 'AGENCY'
  | 'CONSULTANCY'
  | 'PRODUCT'
  | 'STAFFING'
  | 'UNKNOWN';

export type CompanyContactEmail = {
  __typename?: 'CompanyContactEmail';
  contactFirstName: Scalars['String']['output'];
  contactId: Scalars['Int']['output'];
  contactLastName: Scalars['String']['output'];
  contactPosition: Maybe<Scalars['String']['output']>;
  createdAt: Scalars['String']['output'];
  deliveredAt: Maybe<Scalars['String']['output']>;
  errorMessage: Maybe<Scalars['String']['output']>;
  followupStatus: Maybe<Scalars['String']['output']>;
  fromEmail: Scalars['String']['output'];
  id: Scalars['Int']['output'];
  openedAt: Maybe<Scalars['String']['output']>;
  recipientName: Maybe<Scalars['String']['output']>;
  replyReceived: Scalars['Boolean']['output'];
  resendId: Scalars['String']['output'];
  scheduledAt: Maybe<Scalars['String']['output']>;
  sentAt: Maybe<Scalars['String']['output']>;
  sequenceNumber: Maybe<Scalars['String']['output']>;
  sequenceType: Maybe<Scalars['String']['output']>;
  status: Scalars['String']['output'];
  subject: Scalars['String']['output'];
  textContent: Maybe<Scalars['String']['output']>;
  toEmails: Array<Scalars['String']['output']>;
  updatedAt: Scalars['String']['output'];
};

export type CompanyFact = {
  __typename?: 'CompanyFact';
  company_id: Scalars['Int']['output'];
  confidence: Scalars['Float']['output'];
  created_at: Scalars['String']['output'];
  evidence: Evidence;
  field: Scalars['String']['output'];
  id: Scalars['Int']['output'];
  normalized_value: Maybe<Scalars['JSON']['output']>;
  value_json: Maybe<Scalars['JSON']['output']>;
  value_text: Maybe<Scalars['String']['output']>;
};

export type CompanyFactInput = {
  confidence: Scalars['Float']['input'];
  evidence: EvidenceInput;
  field: Scalars['String']['input'];
  normalized_value?: InputMaybe<Scalars['JSON']['input']>;
  value_json?: InputMaybe<Scalars['JSON']['input']>;
  value_text?: InputMaybe<Scalars['String']['input']>;
};

export type CompanyFilterInput = {
  category?: InputMaybe<CompanyCategory>;
  min_ai_tier?: InputMaybe<Scalars['Int']['input']>;
  min_score?: InputMaybe<Scalars['Float']['input']>;
  service_taxonomy_any?: InputMaybe<Array<Scalars['String']['input']>>;
  text?: InputMaybe<Scalars['String']['input']>;
};

export type CompanyImportInput = {
  description?: InputMaybe<Scalars['String']['input']>;
  email?: InputMaybe<Scalars['String']['input']>;
  industry?: InputMaybe<Scalars['String']['input']>;
  linkedin_url?: InputMaybe<Scalars['String']['input']>;
  location?: InputMaybe<Scalars['String']['input']>;
  name: Scalars['String']['input'];
  size?: InputMaybe<Scalars['String']['input']>;
  website?: InputMaybe<Scalars['String']['input']>;
};

export type CompanyOrderBy =
  | 'CREATED_AT_DESC'
  | 'NAME_ASC'
  | 'SCORE_DESC'
  | 'UPDATED_AT_DESC';

export type CompanyScrapedPostsResult = {
  __typename?: 'CompanyScrapedPostsResult';
  companyName: Scalars['String']['output'];
  firstScraped: Maybe<Scalars['String']['output']>;
  lastScraped: Maybe<Scalars['String']['output']>;
  peopleCount: Scalars['Int']['output'];
  posts: Array<ScrapedPost>;
  postsCount: Scalars['Int']['output'];
  slug: Scalars['String']['output'];
};

export type CompanySnapshot = {
  __typename?: 'CompanySnapshot';
  capture_timestamp: Maybe<Scalars['String']['output']>;
  company_id: Scalars['Int']['output'];
  content_hash: Maybe<Scalars['String']['output']>;
  crawl_id: Maybe<Scalars['String']['output']>;
  created_at: Scalars['String']['output'];
  evidence: Evidence;
  extracted: Maybe<Scalars['JSON']['output']>;
  fetched_at: Scalars['String']['output'];
  http_status: Maybe<Scalars['Int']['output']>;
  id: Scalars['Int']['output'];
  jsonld: Maybe<Scalars['JSON']['output']>;
  mime: Maybe<Scalars['String']['output']>;
  source_url: Scalars['String']['output'];
  text_sample: Maybe<Scalars['String']['output']>;
};

export type CompanyVelocity = {
  __typename?: 'CompanyVelocity';
  companyId: Scalars['Int']['output'];
  companyKey: Scalars['String']['output'];
  companyName: Scalars['String']['output'];
  jobsPostedLastWeek: Scalars['Int']['output'];
  jobsPostedThisWeek: Scalars['Int']['output'];
  remoteJobsPercent: Scalars['Float']['output'];
  rollingAvgWeekly: Scalars['Float']['output'];
  velocityDelta: Scalars['Int']['output'];
  velocityTrend: Scalars['String']['output'];
};

export type CompetitiveReport = {
  __typename?: 'CompetitiveReport';
  fastestGrowing: Array<CompetitorProfile>;
  newEntrants: Array<CompetitorProfile>;
  period: Scalars['String']['output'];
  topHirers: Array<CompetitorProfile>;
};

export type Competitor = {
  __typename?: 'Competitor';
  analysisId: Scalars['Int']['output'];
  createdAt: Scalars['DateTime']['output'];
  description: Maybe<Scalars['String']['output']>;
  domain: Maybe<Scalars['String']['output']>;
  features: Array<CompetitorFeature>;
  id: Scalars['Int']['output'];
  integrations: Array<CompetitorIntegration>;
  logoUrl: Maybe<Scalars['URL']['output']>;
  name: Scalars['String']['output'];
  positioningHeadline: Maybe<Scalars['String']['output']>;
  positioningTagline: Maybe<Scalars['String']['output']>;
  pricingTiers: Array<PricingTier>;
  scrapeError: Maybe<Scalars['String']['output']>;
  scrapedAt: Maybe<Scalars['DateTime']['output']>;
  status: CompetitorStatus;
  targetAudience: Maybe<Scalars['String']['output']>;
  url: Scalars['String']['output'];
};

export type CompetitorAnalysis = {
  __typename?: 'CompetitorAnalysis';
  competitors: Array<Competitor>;
  createdAt: Scalars['DateTime']['output'];
  createdBy: Maybe<Scalars['String']['output']>;
  error: Maybe<Scalars['String']['output']>;
  id: Scalars['Int']['output'];
  product: Product;
  status: CompetitorAnalysisStatus;
  updatedAt: Scalars['DateTime']['output'];
};

export type CompetitorAnalysisStatus =
  | 'done'
  | 'failed'
  | 'pending_approval'
  | 'scraping';

export type CompetitorFeature = {
  __typename?: 'CompetitorFeature';
  category: Maybe<Scalars['String']['output']>;
  featureText: Scalars['String']['output'];
  id: Scalars['Int']['output'];
  tierName: Maybe<Scalars['String']['output']>;
};

export type CompetitorInput = {
  name: Scalars['String']['input'];
  url: Scalars['String']['input'];
};

export type CompetitorIntegration = {
  __typename?: 'CompetitorIntegration';
  category: Maybe<Scalars['String']['output']>;
  id: Scalars['Int']['output'];
  integrationName: Scalars['String']['output'];
  integrationUrl: Maybe<Scalars['URL']['output']>;
};

export type CompetitorProfile = {
  __typename?: 'CompetitorProfile';
  aiMlOpenings: Scalars['Int']['output'];
  avgSalaryMidpoint: Maybe<Scalars['Float']['output']>;
  companyId: Scalars['Int']['output'];
  companyKey: Scalars['String']['output'];
  companyName: Scalars['String']['output'];
  hiringVelocity: Scalars['Float']['output'];
  rank: Scalars['Int']['output'];
  remoteOpenings: Scalars['Int']['output'];
  remotePercent: Scalars['Float']['output'];
  topSkillsSought: Array<Scalars['String']['output']>;
  totalOpenings: Scalars['Int']['output'];
};

export type CompetitorStatus =
  | 'approved'
  | 'done'
  | 'failed'
  | 'scraping'
  | 'suggested';

export type ComputeNextTouchScoresResult = {
  __typename?: 'ComputeNextTouchScoresResult';
  contactsUpdated: Scalars['Int']['output'];
  message: Scalars['String']['output'];
  success: Scalars['Boolean']['output'];
  topContacts: Array<ContactNextTouch>;
};

export type Contact = {
  __typename?: 'Contact';
  aiProfile: Maybe<ContactAiProfile>;
  authenticityFlags: Array<Scalars['String']['output']>;
  authenticityScore: Maybe<Scalars['Float']['output']>;
  authenticityVerdict: Maybe<Scalars['String']['output']>;
  authorityScore: Maybe<Scalars['Float']['output']>;
  bouncedEmails: Array<Scalars['String']['output']>;
  company: Maybe<Scalars['String']['output']>;
  companyId: Maybe<Scalars['Int']['output']>;
  createdAt: Scalars['String']['output'];
  deletionFlaggedAt: Maybe<Scalars['String']['output']>;
  deletionReasons: Array<Scalars['String']['output']>;
  deletionScore: Maybe<Scalars['Float']['output']>;
  department: Maybe<Scalars['String']['output']>;
  dmReasons: Array<Scalars['String']['output']>;
  doNotContact: Scalars['Boolean']['output'];
  email: Maybe<Scalars['String']['output']>;
  emailVerified: Maybe<Scalars['Boolean']['output']>;
  emails: Array<Scalars['String']['output']>;
  firstName: Scalars['String']['output'];
  forwardingAlias: Maybe<Scalars['String']['output']>;
  forwardingAliasRuleId: Maybe<Scalars['String']['output']>;
  githubHandle: Maybe<Scalars['String']['output']>;
  id: Scalars['Int']['output'];
  isDecisionMaker: Maybe<Scalars['Boolean']['output']>;
  lastContactedAt: Maybe<Scalars['String']['output']>;
  lastName: Scalars['String']['output'];
  linkedinUrl: Maybe<Scalars['String']['output']>;
  loraReasons: Array<Scalars['String']['output']>;
  loraScoredAt: Maybe<Scalars['String']['output']>;
  loraTier: Maybe<Scalars['String']['output']>;
  nbExecutionTimeMs: Maybe<Scalars['Int']['output']>;
  nbFlags: Array<Scalars['String']['output']>;
  nbResult: Maybe<Scalars['String']['output']>;
  nbRetryToken: Maybe<Scalars['String']['output']>;
  nbStatus: Maybe<Scalars['String']['output']>;
  nbSuggestedCorrection: Maybe<Scalars['String']['output']>;
  nextTouchScore: Maybe<Scalars['Float']['output']>;
  notes: Maybe<Scalars['String']['output']>;
  papers: Array<ContactPaper>;
  papersEnrichedAt: Maybe<Scalars['String']['output']>;
  position: Maybe<Scalars['String']['output']>;
  seniority: Maybe<Scalars['String']['output']>;
  slug: Maybe<Scalars['String']['output']>;
  tags: Array<Scalars['String']['output']>;
  telegramHandle: Maybe<Scalars['String']['output']>;
  toBeDeleted: Scalars['Boolean']['output'];
  updatedAt: Scalars['String']['output'];
  userId: Maybe<Scalars['String']['output']>;
};

export type ContactAiGitHubRepo = {
  __typename?: 'ContactAIGitHubRepo';
  description: Maybe<Scalars['String']['output']>;
  name: Scalars['String']['output'];
  stars: Scalars['Int']['output'];
  topics: Array<Scalars['String']['output']>;
};

export type ContactAiProfile = {
  __typename?: 'ContactAIProfile';
  enrichedAt: Scalars['String']['output'];
  experienceLevel: Scalars['String']['output'];
  githubAiRepos: Array<ContactAiGitHubRepo>;
  githubBio: Maybe<Scalars['String']['output']>;
  githubTopLanguages: Array<Scalars['String']['output']>;
  githubTotalStars: Scalars['Int']['output'];
  linkedinBio: Maybe<Scalars['String']['output']>;
  linkedinHeadline: Maybe<Scalars['String']['output']>;
  researchAreas: Array<Scalars['String']['output']>;
  skills: Array<Scalars['String']['output']>;
  specialization: Maybe<Scalars['String']['output']>;
  synthesisConfidence: Scalars['Float']['output'];
  synthesisRationale: Maybe<Scalars['String']['output']>;
  trigger: Scalars['String']['output'];
  workExperience: Array<ContactWorkExperience>;
};

export type ContactEmail = {
  __typename?: 'ContactEmail';
  attachments: Maybe<Scalars['JSON']['output']>;
  ccEmails: Array<Scalars['String']['output']>;
  companyId: Maybe<Scalars['Int']['output']>;
  contactId: Scalars['Int']['output'];
  createdAt: Scalars['String']['output'];
  deliveredAt: Maybe<Scalars['String']['output']>;
  errorMessage: Maybe<Scalars['String']['output']>;
  followupStatus: Maybe<Scalars['String']['output']>;
  fromEmail: Scalars['String']['output'];
  headers: Maybe<Scalars['JSON']['output']>;
  htmlContent: Maybe<Scalars['String']['output']>;
  id: Scalars['Int']['output'];
  idempotencyKey: Maybe<Scalars['String']['output']>;
  openedAt: Maybe<Scalars['String']['output']>;
  parentEmailId: Maybe<Scalars['Int']['output']>;
  recipientName: Maybe<Scalars['String']['output']>;
  replyReceived: Scalars['Boolean']['output'];
  replyReceivedAt: Maybe<Scalars['String']['output']>;
  replyToEmails: Array<Scalars['String']['output']>;
  resendId: Scalars['String']['output'];
  scheduledAt: Maybe<Scalars['String']['output']>;
  sentAt: Maybe<Scalars['String']['output']>;
  sequenceNumber: Maybe<Scalars['String']['output']>;
  sequenceType: Maybe<Scalars['String']['output']>;
  status: Scalars['String']['output'];
  subject: Scalars['String']['output'];
  tags: Array<Scalars['String']['output']>;
  textContent: Maybe<Scalars['String']['output']>;
  toEmails: Array<Scalars['String']['output']>;
  updatedAt: Scalars['String']['output'];
};

export type ContactInput = {
  company?: InputMaybe<Scalars['String']['input']>;
  companyId?: InputMaybe<Scalars['Int']['input']>;
  email?: InputMaybe<Scalars['String']['input']>;
  emails?: InputMaybe<Array<Scalars['String']['input']>>;
  firstName: Scalars['String']['input'];
  githubHandle?: InputMaybe<Scalars['String']['input']>;
  lastName: Scalars['String']['input'];
  linkedinUrl?: InputMaybe<Scalars['String']['input']>;
  position?: InputMaybe<Scalars['String']['input']>;
  tags?: InputMaybe<Array<Scalars['String']['input']>>;
  telegramHandle?: InputMaybe<Scalars['String']['input']>;
};

export type ContactLoraScore = {
  __typename?: 'ContactLoraScore';
  contactId: Scalars['Int']['output'];
  reasons: Array<Scalars['String']['output']>;
  score: Scalars['Float']['output'];
  tier: Scalars['String']['output'];
};

export type ContactMlScore = {
  __typename?: 'ContactMLScore';
  authorityScore: Scalars['Float']['output'];
  contactId: Scalars['Int']['output'];
  department: Scalars['String']['output'];
  dmReasons: Array<Scalars['String']['output']>;
  isDecisionMaker: Scalars['Boolean']['output'];
  seniority: Scalars['String']['output'];
};

export type ContactMessage = {
  __typename?: 'ContactMessage';
  channel: Scalars['String']['output'];
  classification: Maybe<Scalars['String']['output']>;
  classificationConfidence: Maybe<Scalars['Float']['output']>;
  companyId: Maybe<Scalars['Int']['output']>;
  contactEmailId: Maybe<Scalars['Int']['output']>;
  contactId: Maybe<Scalars['Int']['output']>;
  content: Maybe<Scalars['String']['output']>;
  createdAt: Scalars['String']['output'];
  direction: Scalars['String']['output'];
  id: Scalars['Int']['output'];
  senderName: Maybe<Scalars['String']['output']>;
  senderProfileUrl: Maybe<Scalars['String']['output']>;
  sentAt: Scalars['String']['output'];
  subject: Maybe<Scalars['String']['output']>;
  updatedAt: Scalars['String']['output'];
};

export type ContactNextTouch = {
  __typename?: 'ContactNextTouch';
  contactId: Scalars['Int']['output'];
  firstName: Scalars['String']['output'];
  lastContactedAt: Maybe<Scalars['String']['output']>;
  lastName: Scalars['String']['output'];
  nextTouchScore: Scalars['Float']['output'];
  position: Maybe<Scalars['String']['output']>;
};

export type ContactPaper = {
  __typename?: 'ContactPaper';
  authors: Array<Scalars['String']['output']>;
  citationCount: Maybe<Scalars['Int']['output']>;
  doi: Maybe<Scalars['String']['output']>;
  source: Maybe<Scalars['String']['output']>;
  title: Scalars['String']['output'];
  url: Maybe<Scalars['String']['output']>;
  venue: Maybe<Scalars['String']['output']>;
  year: Maybe<Scalars['Int']['output']>;
};

export type ContactWorkExperience = {
  __typename?: 'ContactWorkExperience';
  company: Scalars['String']['output'];
  companyLogo: Maybe<Scalars['String']['output']>;
  description: Maybe<Scalars['String']['output']>;
  duration: Maybe<Scalars['String']['output']>;
  employmentType: Maybe<Scalars['String']['output']>;
  endDate: Maybe<Scalars['String']['output']>;
  location: Maybe<Scalars['String']['output']>;
  skills: Array<Scalars['String']['output']>;
  startDate: Scalars['String']['output'];
  title: Scalars['String']['output'];
};

export type ContactsResult = {
  __typename?: 'ContactsResult';
  contacts: Array<Contact>;
  totalCount: Scalars['Int']['output'];
};

export type CountRemoteVoyagerJobsInput = {
  /** Company LinkedIn numeric IDs to count remote jobs for */
  companyNumericIds: Array<Scalars['String']['input']>;
};

/** Result of a countRemoteVoyagerJobs mutation. */
export type CountRemoteVoyagerJobsResult = {
  __typename?: 'CountRemoteVoyagerJobsResult';
  counts: Array<VoyagerCompanyJobCount>;
  errors: Array<Scalars['String']['output']>;
  success: Scalars['Boolean']['output'];
};

export type CrawlLog = {
  __typename?: 'CrawlLog';
  companySlug: Scalars['String']['output'];
  completedAt: Maybe<Scalars['String']['output']>;
  createdAt: Scalars['String']['output'];
  durationMs: Scalars['Int']['output'];
  entries: Maybe<Scalars['JSON']['output']>;
  error: Maybe<Scalars['String']['output']>;
  filtered: Scalars['Int']['output'];
  id: Scalars['Int']['output'];
  saved: Scalars['Int']['output'];
  seedUrl: Scalars['String']['output'];
  skipped: Scalars['Int']['output'];
  startedAt: Scalars['String']['output'];
  status: Scalars['String']['output'];
  targets: Scalars['Int']['output'];
  totalRemoteJobs: Scalars['Int']['output'];
  visited: Scalars['Int']['output'];
};

export type CreateCampaignInput = {
  addAntiThreadHeader?: InputMaybe<Scalars['Boolean']['input']>;
  addUnsubscribeHeaders?: InputMaybe<Scalars['Boolean']['input']>;
  companyId?: InputMaybe<Scalars['Int']['input']>;
  createdBy?: InputMaybe<Scalars['String']['input']>;
  delayDays?: InputMaybe<Scalars['JSON']['input']>;
  fromEmail?: InputMaybe<Scalars['String']['input']>;
  mode?: InputMaybe<Scalars['String']['input']>;
  name: Scalars['String']['input'];
  recipientEmails?: InputMaybe<Array<Scalars['String']['input']>>;
  replyTo?: InputMaybe<Scalars['String']['input']>;
  sequence?: InputMaybe<Scalars['JSON']['input']>;
  totalEmailsPlanned?: InputMaybe<Scalars['Int']['input']>;
  unsubscribeUrl?: InputMaybe<Scalars['String']['input']>;
};

export type CreateCompanyInput = {
  ai_classification_confidence?: InputMaybe<Scalars['Float']['input']>;
  ai_classification_reason?: InputMaybe<Scalars['String']['input']>;
  ai_tier?: InputMaybe<Scalars['Int']['input']>;
  category?: InputMaybe<CompanyCategory>;
  description?: InputMaybe<Scalars['String']['input']>;
  email?: InputMaybe<Scalars['String']['input']>;
  emails?: InputMaybe<Array<Scalars['String']['input']>>;
  github_url?: InputMaybe<Scalars['String']['input']>;
  industries?: InputMaybe<Array<Scalars['String']['input']>>;
  industry?: InputMaybe<Scalars['String']['input']>;
  key: Scalars['String']['input'];
  linkedin_url?: InputMaybe<Scalars['String']['input']>;
  location?: InputMaybe<Scalars['String']['input']>;
  logo_url?: InputMaybe<Scalars['String']['input']>;
  name: Scalars['String']['input'];
  service_taxonomy?: InputMaybe<Array<Scalars['String']['input']>>;
  services?: InputMaybe<Array<Scalars['String']['input']>>;
  size?: InputMaybe<Scalars['String']['input']>;
  tags?: InputMaybe<Array<Scalars['String']['input']>>;
  website?: InputMaybe<Scalars['String']['input']>;
};

export type CreateContactInput = {
  companyId?: InputMaybe<Scalars['Int']['input']>;
  email?: InputMaybe<Scalars['String']['input']>;
  emails?: InputMaybe<Array<Scalars['String']['input']>>;
  firstName: Scalars['String']['input'];
  githubHandle?: InputMaybe<Scalars['String']['input']>;
  lastName?: InputMaybe<Scalars['String']['input']>;
  linkedinUrl?: InputMaybe<Scalars['String']['input']>;
  position?: InputMaybe<Scalars['String']['input']>;
  tags?: InputMaybe<Array<Scalars['String']['input']>>;
  telegramHandle?: InputMaybe<Scalars['String']['input']>;
};

export type CreateEmailTemplateInput = {
  category?: InputMaybe<Scalars['String']['input']>;
  description?: InputMaybe<Scalars['String']['input']>;
  htmlContent?: InputMaybe<Scalars['String']['input']>;
  name: Scalars['String']['input'];
  subject?: InputMaybe<Scalars['String']['input']>;
  tags?: InputMaybe<Array<Scalars['String']['input']>>;
  textContent?: InputMaybe<Scalars['String']['input']>;
  variables?: InputMaybe<Array<Scalars['String']['input']>>;
};

export type CreateOpportunityInput = {
  applied?: InputMaybe<Scalars['Boolean']['input']>;
  appliedAt?: InputMaybe<Scalars['String']['input']>;
  companyId?: InputMaybe<Scalars['Int']['input']>;
  contactId?: InputMaybe<Scalars['Int']['input']>;
  metadata?: InputMaybe<Scalars['String']['input']>;
  rawContext?: InputMaybe<Scalars['String']['input']>;
  rewardText?: InputMaybe<Scalars['String']['input']>;
  source?: InputMaybe<Scalars['String']['input']>;
  status?: InputMaybe<Scalars['String']['input']>;
  tags?: InputMaybe<Array<Scalars['String']['input']>>;
  title: Scalars['String']['input'];
  url?: InputMaybe<Scalars['String']['input']>;
};

export type CreateReminderInput = {
  entityId: Scalars['Int']['input'];
  entityType: Scalars['String']['input'];
  note?: InputMaybe<Scalars['String']['input']>;
  recurrence?: InputMaybe<Scalars['String']['input']>;
  remindAt: Scalars['String']['input'];
};

export type DailyJobCount = {
  __typename?: 'DailyJobCount';
  date: Scalars['String']['output'];
  newJobs24h: Scalars['Int']['output'];
  query: Scalars['String']['output'];
  remoteJobs: Scalars['Int']['output'];
  remoteRatio: Scalars['Float']['output'];
  totalJobs: Scalars['Int']['output'];
};

export type DataQualityScore = {
  __typename?: 'DataQualityScore';
  completeness: Scalars['Float']['output'];
  composite: Scalars['Float']['output'];
  freshness: Scalars['Float']['output'];
  missingFields: Array<Scalars['String']['output']>;
  staleFields: Array<Scalars['String']['output']>;
};

export type DeleteCampaignResult = {
  __typename?: 'DeleteCampaignResult';
  message: Maybe<Scalars['String']['output']>;
  success: Scalars['Boolean']['output'];
};

export type DeleteCompaniesResult = {
  __typename?: 'DeleteCompaniesResult';
  deleted: Scalars['Int']['output'];
  message: Scalars['String']['output'];
  success: Scalars['Boolean']['output'];
};

export type DeleteCompanyResponse = {
  __typename?: 'DeleteCompanyResponse';
  message: Maybe<Scalars['String']['output']>;
  success: Scalars['Boolean']['output'];
};

export type DeleteContactResult = {
  __typename?: 'DeleteContactResult';
  message: Scalars['String']['output'];
  success: Scalars['Boolean']['output'];
};

export type DeleteEmailTemplateResult = {
  __typename?: 'DeleteEmailTemplateResult';
  message: Maybe<Scalars['String']['output']>;
  success: Scalars['Boolean']['output'];
};

export type DetectIntentResult = {
  __typename?: 'DetectIntentResult';
  intentScore: Maybe<Scalars['Float']['output']>;
  message: Maybe<Scalars['String']['output']>;
  signalsDetected: Scalars['Int']['output'];
  success: Scalars['Boolean']['output'];
};

export type DismissDraftResult = {
  __typename?: 'DismissDraftResult';
  success: Scalars['Boolean']['output'];
};

export type DraftSummary = {
  __typename?: 'DraftSummary';
  approved: Scalars['Int']['output'];
  byClassification: Array<ClassificationCount>;
  dismissed: Scalars['Int']['output'];
  pending: Scalars['Int']['output'];
  sent: Scalars['Int']['output'];
};

export type EmailCampaign = {
  __typename?: 'EmailCampaign';
  addAntiThreadHeader: Scalars['Boolean']['output'];
  addUnsubscribeHeaders: Scalars['Boolean']['output'];
  companyId: Maybe<Scalars['Int']['output']>;
  createdAt: Scalars['String']['output'];
  createdBy: Maybe<Scalars['String']['output']>;
  delayDays: Maybe<Scalars['JSON']['output']>;
  emailsFailed: Scalars['Int']['output'];
  emailsScheduled: Scalars['Int']['output'];
  emailsSent: Scalars['Int']['output'];
  fromEmail: Maybe<Scalars['String']['output']>;
  id: Scalars['String']['output'];
  mode: Maybe<Scalars['String']['output']>;
  name: Scalars['String']['output'];
  recipientEmails: Array<Scalars['String']['output']>;
  replyTo: Maybe<Scalars['String']['output']>;
  sequence: Maybe<Scalars['JSON']['output']>;
  startAt: Maybe<Scalars['String']['output']>;
  status: Scalars['String']['output'];
  totalEmailsPlanned: Maybe<Scalars['Int']['output']>;
  totalRecipients: Scalars['Int']['output'];
  unsubscribeUrl: Maybe<Scalars['String']['output']>;
  updatedAt: Scalars['String']['output'];
};

export type EmailCampaignsResult = {
  __typename?: 'EmailCampaignsResult';
  campaigns: Array<EmailCampaign>;
  totalCount: Scalars['Int']['output'];
};

export type EmailPreview = {
  __typename?: 'EmailPreview';
  drySendResult: Maybe<Scalars['String']['output']>;
  htmlContent: Scalars['String']['output'];
  subject: Scalars['String']['output'];
};

export type EmailStats = {
  __typename?: 'EmailStats';
  bouncedThisMonth: Scalars['Int']['output'];
  bouncedThisWeek: Scalars['Int']['output'];
  bouncedToday: Scalars['Int']['output'];
  deliveredThisMonth: Scalars['Int']['output'];
  deliveredThisWeek: Scalars['Int']['output'];
  deliveredToday: Scalars['Int']['output'];
  openedThisMonth: Scalars['Int']['output'];
  openedThisWeek: Scalars['Int']['output'];
  openedToday: Scalars['Int']['output'];
  scheduledFuture: Scalars['Int']['output'];
  scheduledToday: Scalars['Int']['output'];
  sentThisMonth: Scalars['Int']['output'];
  sentThisWeek: Scalars['Int']['output'];
  sentToday: Scalars['Int']['output'];
  totalSent: Scalars['Int']['output'];
};

export type EmailTemplate = {
  __typename?: 'EmailTemplate';
  category: Maybe<Scalars['String']['output']>;
  createdAt: Scalars['String']['output'];
  description: Maybe<Scalars['String']['output']>;
  htmlContent: Maybe<Scalars['String']['output']>;
  id: Scalars['Int']['output'];
  isActive: Scalars['Boolean']['output'];
  name: Scalars['String']['output'];
  subject: Maybe<Scalars['String']['output']>;
  tags: Array<Scalars['String']['output']>;
  textContent: Maybe<Scalars['String']['output']>;
  updatedAt: Scalars['String']['output'];
  userId: Maybe<Scalars['String']['output']>;
  variables: Array<Scalars['String']['output']>;
};

export type EmailTemplatesResult = {
  __typename?: 'EmailTemplatesResult';
  templates: Array<EmailTemplate>;
  totalCount: Scalars['Int']['output'];
};

export type EmailThread = {
  __typename?: 'EmailThread';
  classification: Maybe<Scalars['String']['output']>;
  classificationConfidence: Maybe<Scalars['Float']['output']>;
  companyKey: Maybe<Scalars['String']['output']>;
  companyName: Maybe<Scalars['String']['output']>;
  contactEmail: Maybe<Scalars['String']['output']>;
  contactForwardingAlias: Maybe<Scalars['String']['output']>;
  contactId: Scalars['Int']['output'];
  contactName: Scalars['String']['output'];
  contactPosition: Maybe<Scalars['String']['output']>;
  contactSlug: Maybe<Scalars['String']['output']>;
  conversationStage: Maybe<Scalars['String']['output']>;
  draftId: Maybe<Scalars['Int']['output']>;
  hasPendingDraft: Maybe<Scalars['Boolean']['output']>;
  hasReply: Scalars['Boolean']['output'];
  lastMessageAt: Scalars['String']['output'];
  lastMessageDirection: Scalars['String']['output'];
  lastMessagePreview: Maybe<Scalars['String']['output']>;
  latestStatus: Maybe<Scalars['String']['output']>;
  messages: Array<ThreadMessage>;
  priorityScore: Maybe<Scalars['Float']['output']>;
  totalMessages: Scalars['Int']['output'];
};

export type EmailThreadsResult = {
  __typename?: 'EmailThreadsResult';
  threads: Array<EmailThread>;
  totalCount: Scalars['Int']['output'];
};

export type EmergingRole = {
  __typename?: 'EmergingRole';
  avgSalaryMidpoint: Maybe<Scalars['Float']['output']>;
  count: Scalars['Int']['output'];
  firstSeenDate: Scalars['String']['output'];
  isNovel: Scalars['Boolean']['output'];
  normalizedTitle: Scalars['String']['output'];
  title: Scalars['String']['output'];
  topCompanies: Array<Scalars['String']['output']>;
  topSkills: Array<Scalars['String']['output']>;
  weekOverWeekGrowth: Scalars['Float']['output'];
};

export type EmergingRolesReport = {
  __typename?: 'EmergingRolesReport';
  declining: Array<EmergingRole>;
  novelTitles: Array<EmergingRole>;
  period: Scalars['String']['output'];
  surging: Array<EmergingRole>;
};

export type EnhanceAllContactsResult = {
  __typename?: 'EnhanceAllContactsResult';
  companiesProcessed: Scalars['Int']['output'];
  errors: Array<Scalars['String']['output']>;
  message: Scalars['String']['output'];
  success: Scalars['Boolean']['output'];
  totalContactsProcessed: Scalars['Int']['output'];
  totalEmailsFound: Scalars['Int']['output'];
};

export type EnhanceCompanyResponse = {
  __typename?: 'EnhanceCompanyResponse';
  companyId: Maybe<Scalars['Int']['output']>;
  companyKey: Maybe<Scalars['String']['output']>;
  message: Maybe<Scalars['String']['output']>;
  success: Scalars['Boolean']['output'];
};

export type EnrichAiContactResult = {
  __typename?: 'EnrichAIContactResult';
  aiProfile: Maybe<ContactAiProfile>;
  contactId: Scalars['Int']['output'];
  message: Scalars['String']['output'];
  success: Scalars['Boolean']['output'];
};

export type EnrichAiContactsBulkResult = {
  __typename?: 'EnrichAIContactsBulkResult';
  enriched: Scalars['Int']['output'];
  errors: Array<Scalars['String']['output']>;
  message: Scalars['String']['output'];
  skipped: Scalars['Int']['output'];
  success: Scalars['Boolean']['output'];
};

export type EnrichContactPapersResult = {
  __typename?: 'EnrichContactPapersResult';
  contactId: Scalars['Int']['output'];
  message: Scalars['String']['output'];
  papers: Array<ContactPaper>;
  papersEnrichedAt: Maybe<Scalars['String']['output']>;
  success: Scalars['Boolean']['output'];
  tags: Array<Scalars['String']['output']>;
  tagsAdded: Array<Scalars['String']['output']>;
};

export type Evidence = {
  __typename?: 'Evidence';
  capture_timestamp: Maybe<Scalars['String']['output']>;
  content_hash: Maybe<Scalars['String']['output']>;
  crawl_id: Maybe<Scalars['String']['output']>;
  extractor_version: Maybe<Scalars['String']['output']>;
  http_status: Maybe<Scalars['Int']['output']>;
  method: ExtractMethod;
  mime: Maybe<Scalars['String']['output']>;
  observed_at: Scalars['String']['output'];
  source_type: SourceType;
  source_url: Scalars['String']['output'];
  warc: Maybe<WarcPointer>;
};

export type EvidenceInput = {
  capture_timestamp?: InputMaybe<Scalars['String']['input']>;
  content_hash?: InputMaybe<Scalars['String']['input']>;
  crawl_id?: InputMaybe<Scalars['String']['input']>;
  extractor_version?: InputMaybe<Scalars['String']['input']>;
  http_status?: InputMaybe<Scalars['Int']['input']>;
  method: ExtractMethod;
  mime?: InputMaybe<Scalars['String']['input']>;
  observed_at: Scalars['String']['input'];
  source_type: SourceType;
  source_url: Scalars['String']['input'];
  warc?: InputMaybe<WarcPointerInput>;
};

export type ExtractMethod =
  | 'DOM'
  | 'HEURISTIC'
  | 'JSONLD'
  | 'LLM'
  | 'META';

export type ExtractedSkill = {
  __typename?: 'ExtractedSkill';
  confidence: Scalars['Float']['output'];
  label: Scalars['String']['output'];
  tag: Scalars['String']['output'];
};

export type FindCompanyResult = {
  __typename?: 'FindCompanyResult';
  company: Maybe<Company>;
  found: Scalars['Boolean']['output'];
};

export type FindContactEmailResult = {
  __typename?: 'FindContactEmailResult';
  candidatesTried: Scalars['Int']['output'];
  email: Maybe<Scalars['String']['output']>;
  emailFound: Scalars['Boolean']['output'];
  message: Scalars['String']['output'];
  success: Scalars['Boolean']['output'];
  verified: Maybe<Scalars['Boolean']['output']>;
};

export type FollowUpBatchInput = {
  companyId: Scalars['Int']['input'];
  customInstructions?: InputMaybe<Scalars['String']['input']>;
  customSubject?: InputMaybe<Scalars['String']['input']>;
  daysAfter: Scalars['Int']['input'];
  sequenceNumber: Scalars['String']['input'];
};

export type FollowUpBatchResult = {
  __typename?: 'FollowUpBatchResult';
  contactCount: Scalars['Int']['output'];
  emailIds: Array<Scalars['String']['output']>;
  message: Scalars['String']['output'];
  success: Scalars['Boolean']['output'];
};

export type FollowUpEmail = {
  __typename?: 'FollowUpEmail';
  companyId: Maybe<Scalars['Int']['output']>;
  contactId: Scalars['Int']['output'];
  createdAt: Scalars['String']['output'];
  followupStatus: Maybe<Scalars['String']['output']>;
  fromEmail: Scalars['String']['output'];
  id: Scalars['Int']['output'];
  recipientName: Maybe<Scalars['String']['output']>;
  resendId: Scalars['String']['output'];
  sentAt: Maybe<Scalars['String']['output']>;
  sequenceNumber: Maybe<Scalars['String']['output']>;
  sequenceType: Maybe<Scalars['String']['output']>;
  status: Scalars['String']['output'];
  subject: Scalars['String']['output'];
  toEmails: Array<Scalars['String']['output']>;
};

export type FollowUpEmailsResult = {
  __typename?: 'FollowUpEmailsResult';
  emails: Array<FollowUpEmail>;
  totalCount: Scalars['Int']['output'];
};

export type GenerateDraftsBatchResult = {
  __typename?: 'GenerateDraftsBatchResult';
  failed: Scalars['Int']['output'];
  generated: Scalars['Int']['output'];
  message: Scalars['String']['output'];
  skipped: Scalars['Int']['output'];
  success: Scalars['Boolean']['output'];
};

export type GenerateEmailInput = {
  companyName?: InputMaybe<Scalars['String']['input']>;
  purpose: Scalars['String']['input'];
  recipientName: Scalars['String']['input'];
  recipientRole?: InputMaybe<Scalars['String']['input']>;
  templateId?: InputMaybe<Scalars['Int']['input']>;
  tone?: InputMaybe<Scalars['String']['input']>;
};

export type GenerateEmailResult = {
  __typename?: 'GenerateEmailResult';
  html: Scalars['String']['output'];
  subject: Scalars['String']['output'];
  text: Scalars['String']['output'];
};

export type GenerateEmbeddingsResult = {
  __typename?: 'GenerateEmbeddingsResult';
  errors: Array<Scalars['String']['output']>;
  failed: Scalars['Int']['output'];
  processed: Scalars['Int']['output'];
  success: Scalars['Boolean']['output'];
};

export type GenerateReplyInput = {
  additionalDetails?: InputMaybe<Scalars['String']['input']>;
  includeCalendly?: InputMaybe<Scalars['Boolean']['input']>;
  originalEmailContent: Scalars['String']['input'];
  originalSender: Scalars['String']['input'];
  replyTo?: InputMaybe<Scalars['String']['input']>;
  replyType?: InputMaybe<Scalars['String']['input']>;
  tone?: InputMaybe<Scalars['String']['input']>;
};

export type GenerateReplyResult = {
  __typename?: 'GenerateReplyResult';
  body: Scalars['String']['output'];
  subject: Scalars['String']['output'];
};

export type GrowthReport = {
  __typename?: 'GrowthReport';
  byIndustry: Array<IndustryGrowth>;
  byRegion: Array<RegionGrowth>;
  overallGrowthRate: Scalars['Float']['output'];
  period: Scalars['String']['output'];
};

export type ImportCompaniesResult = {
  __typename?: 'ImportCompaniesResult';
  errors: Array<Scalars['String']['output']>;
  failed: Scalars['Int']['output'];
  imported: Scalars['Int']['output'];
  success: Scalars['Boolean']['output'];
};

export type ImportCompanyResult = {
  __typename?: 'ImportCompanyResult';
  company: Maybe<Company>;
  contactsImported: Scalars['Int']['output'];
  contactsSkipped: Scalars['Int']['output'];
  errors: Array<Scalars['String']['output']>;
  success: Scalars['Boolean']['output'];
};

export type ImportCompanyWithContactsInput = {
  companyId?: InputMaybe<Scalars['Int']['input']>;
  companyName: Scalars['String']['input'];
  contacts: Array<ImportContactInput>;
  linkedinUrl?: InputMaybe<Scalars['String']['input']>;
  skillFilter?: InputMaybe<Array<Scalars['String']['input']>>;
  website?: InputMaybe<Scalars['String']['input']>;
};

export type ImportContactInput = {
  headline?: InputMaybe<Scalars['String']['input']>;
  linkedinUrl?: InputMaybe<Scalars['String']['input']>;
  name: Scalars['String']['input'];
  workEmail?: InputMaybe<Scalars['String']['input']>;
};

export type ImportContactsResult = {
  __typename?: 'ImportContactsResult';
  errors: Array<Scalars['String']['output']>;
  failed: Scalars['Int']['output'];
  imported: Scalars['Int']['output'];
  success: Scalars['Boolean']['output'];
  updated: Scalars['Int']['output'];
};

export type ImportResendResult = {
  __typename?: 'ImportResendResult';
  companyMatchCount: Scalars['Int']['output'];
  contactMatchCount: Scalars['Int']['output'];
  durationMs: Scalars['Int']['output'];
  error: Maybe<Scalars['String']['output']>;
  errorCount: Scalars['Int']['output'];
  newCount: Scalars['Int']['output'];
  skippedCount: Scalars['Int']['output'];
  success: Scalars['Boolean']['output'];
  totalFetched: Scalars['Int']['output'];
  updatedCount: Scalars['Int']['output'];
};

export type IndustryGrowth = {
  __typename?: 'IndustryGrowth';
  currentCount: Scalars['Int']['output'];
  growthRate: Scalars['Float']['output'];
  industry: Scalars['String']['output'];
  previousCount: Scalars['Int']['output'];
  remoteRatio: Scalars['Float']['output'];
};

export type IntelRun = {
  __typename?: 'IntelRun';
  error: Maybe<Scalars['String']['output']>;
  finishedAt: Maybe<Scalars['DateTime']['output']>;
  id: Scalars['ID']['output'];
  kind: Scalars['String']['output'];
  output: Maybe<Scalars['JSON']['output']>;
  productId: Scalars['Int']['output'];
  startedAt: Scalars['DateTime']['output'];
  status: Scalars['String']['output'];
};

export type IntelRunAccepted = {
  __typename?: 'IntelRunAccepted';
  kind: Scalars['String']['output'];
  productId: Scalars['Int']['output'];
  runId: Scalars['ID']['output'];
  status: Scalars['String']['output'];
};

export type IntentDashboard = {
  __typename?: 'IntentDashboard';
  companiesWithIntent: Scalars['Int']['output'];
  recentSignals: Array<IntentSignal>;
  signalsByType: Array<SignalTypeCount>;
  topIntentCompanies: Array<Company>;
  totalSignals: Scalars['Int']['output'];
};

export type IntentScore = {
  __typename?: 'IntentScore';
  budget: Scalars['Float']['output'];
  growth: Scalars['Float']['output'];
  hiring: Scalars['Float']['output'];
  leadership: Scalars['Float']['output'];
  overall: Scalars['Float']['output'];
  product: Scalars['Float']['output'];
  signalCount: Scalars['Int']['output'];
  tech: Scalars['Float']['output'];
  updatedAt: Maybe<Scalars['String']['output']>;
};

export type IntentSignal = {
  __typename?: 'IntentSignal';
  companyId: Scalars['Int']['output'];
  confidence: Scalars['Float']['output'];
  createdAt: Scalars['String']['output'];
  decayDays: Scalars['Int']['output'];
  decaysAt: Scalars['String']['output'];
  detectedAt: Scalars['String']['output'];
  evidence: Array<Scalars['String']['output']>;
  freshness: Scalars['Float']['output'];
  id: Scalars['Int']['output'];
  metadata: Maybe<Scalars['JSON']['output']>;
  modelVersion: Maybe<Scalars['String']['output']>;
  rawText: Scalars['String']['output'];
  signalType: IntentSignalType;
  sourceType: Scalars['String']['output'];
  sourceUrl: Maybe<Scalars['String']['output']>;
};

export type IntentSignalType =
  | 'BUDGET_CYCLE'
  | 'GROWTH_SIGNAL'
  | 'HIRING_INTENT'
  | 'LEADERSHIP_CHANGE'
  | 'PRODUCT_LAUNCH'
  | 'TECH_ADOPTION';

export type IntentSignalsResponse = {
  __typename?: 'IntentSignalsResponse';
  signals: Array<IntentSignal>;
  totalCount: Scalars['Int']['output'];
};

export type JobCountTrend = {
  __typename?: 'JobCountTrend';
  avgDailyRemote: Scalars['Float']['output'];
  dataPoints: Array<DailyJobCount>;
  growthRate: Scalars['Float']['output'];
  period: Scalars['String']['output'];
  query: Scalars['String']['output'];
  trend: Scalars['String']['output'];
};

export type LinkedInPost = {
  __typename?: 'LinkedInPost';
  analyzedAt: Maybe<Scalars['String']['output']>;
  authorName: Maybe<Scalars['String']['output']>;
  authorUrl: Maybe<Scalars['String']['output']>;
  companyId: Maybe<Scalars['Int']['output']>;
  contactId: Maybe<Scalars['Int']['output']>;
  content: Maybe<Scalars['String']['output']>;
  createdAt: Scalars['String']['output'];
  employmentType: Maybe<Scalars['String']['output']>;
  id: Scalars['Int']['output'];
  location: Maybe<Scalars['String']['output']>;
  postedAt: Maybe<Scalars['String']['output']>;
  rawData: Maybe<Scalars['JSON']['output']>;
  scrapedAt: Scalars['String']['output'];
  skills: Maybe<Array<ExtractedSkill>>;
  title: Maybe<Scalars['String']['output']>;
  type: LinkedInPostType;
  url: Scalars['String']['output'];
};

export type LinkedInPostType =
  | 'job'
  | 'post';

export type LoraTierBreakdown = {
  __typename?: 'LoraTierBreakdown';
  a: Scalars['Int']['output'];
  b: Scalars['Int']['output'];
  c: Scalars['Int']['output'];
  d: Scalars['Int']['output'];
};

export type MlStats = {
  __typename?: 'MLStats';
  companiesEmbedded: Scalars['Int']['output'];
  lastEmbeddingAt: Maybe<Scalars['String']['output']>;
  modelsAvailable: Array<Scalars['String']['output']>;
  totalCompanies: Scalars['Int']['output'];
};

export type MarkRepliedResult = {
  __typename?: 'MarkRepliedResult';
  message: Maybe<Scalars['String']['output']>;
  success: Scalars['Boolean']['output'];
};

export type MergeCompaniesResult = {
  __typename?: 'MergeCompaniesResult';
  keptCompanyId: Maybe<Scalars['Int']['output']>;
  merged: Scalars['Int']['output'];
  message: Scalars['String']['output'];
  success: Scalars['Boolean']['output'];
};

export type MergeDuplicateContactsResult = {
  __typename?: 'MergeDuplicateContactsResult';
  mergedCount: Scalars['Int']['output'];
  message: Scalars['String']['output'];
  removedCount: Scalars['Int']['output'];
  success: Scalars['Boolean']['output'];
};

export type Mutation = {
  __typename?: 'Mutation';
  add_company_facts: Array<CompanyFact>;
  analyzeCompany: AnalyzeCompanyResponse;
  analyzeLinkedInPosts: AnalyzePostsResult;
  analyzeProductGTM: Product;
  analyzeProductGTMAsync: IntelRunAccepted;
  analyzeProductICP: Product;
  analyzeProductPricing: Product;
  analyzeProductPricingAsync: IntelRunAccepted;
  applyEmailPattern: ApplyEmailPatternResult;
  approveAllDrafts: BatchSendDraftResult;
  approveAndSendDraft: SendDraftResult;
  approveCompetitors: CompetitorAnalysis;
  archiveEmail: ArchiveEmailResult;
  batchDetectIntent: BatchDetectIntentResult;
  batchScoreContactsLora: ScoreContactsLoraResult;
  blockCompany: Company;
  cancelCompanyEmails: CancelCompanyEmailsResult;
  cancelScheduledEmail: CancelEmailResult;
  classifyAllPending: ClassifyBatchResult;
  classifyReceivedEmail: ClassifyEmailResult;
  computeContactDeletionScores: BatchOperationResult;
  computeNextTouchScores: ComputeNextTouchScoresResult;
  /**
   * Count remote jobs for a batch of companies via Voyager API.
   * Stores counts as company metadata (for voyagerRemoteJobCounts query).
   * Admin only.
   */
  countRemoteVoyagerJobs: CountRemoteVoyagerJobsResult;
  createCompany: Company;
  createCompetitorAnalysis: CompetitorAnalysis;
  createContact: Contact;
  createDraftCampaign: EmailCampaign;
  createEmailTemplate: EmailTemplate;
  createOpportunity: Opportunity;
  createReminder: Reminder;
  deleteCampaign: DeleteCampaignResult;
  deleteCompanies: DeleteCompaniesResult;
  deleteCompany: DeleteCompanyResponse;
  deleteCompetitorAnalysis: Scalars['Boolean']['output'];
  deleteContact: DeleteContactResult;
  deleteEmailTemplate: DeleteEmailTemplateResult;
  deleteLinkedInPost: Scalars['Boolean']['output'];
  deleteProduct: Scalars['Boolean']['output'];
  detectIntentSignals: DetectIntentResult;
  dismissAllDrafts: BatchDismissResult;
  dismissDraft: DismissDraftResult;
  dismissReminder: Reminder;
  enhanceAllContacts: EnhanceAllContactsResult;
  enhanceCompany: EnhanceCompanyResponse;
  enhanceProductIcp: Product;
  enrichAIContactProfile: EnrichAiContactResult;
  enrichAIContactsForCompany: EnrichAiContactsBulkResult;
  enrichContactPapersAndTags: EnrichContactPapersResult;
  enrichOpportunityCandidates: EnrichAiContactsBulkResult;
  findCompanyEmails: EnhanceAllContactsResult;
  findContactEmail: FindContactEmailResult;
  flagContactsForDeletion: BatchOperationResult;
  /** Generate and store embeddings for companies missing them. Admin only. */
  generateCompanyEmbeddings: GenerateEmbeddingsResult;
  generateDraftsForPending: GenerateDraftsBatchResult;
  generateEmail: GenerateEmailResult;
  generateFollowUpDrafts: GenerateDraftsBatchResult;
  generateReply: GenerateReplyResult;
  importCompanies: ImportCompaniesResult;
  importCompanyWithContacts: ImportCompanyResult;
  importContacts: ImportContactsResult;
  importResendEmails: ImportResendResult;
  ingest_company_snapshot: CompanySnapshot;
  launchEmailCampaign: EmailCampaign;
  markContactEmailVerified: Contact;
  markEmailReplied: MarkRepliedResult;
  mergeDuplicateCompanies: MergeCompaniesResult;
  mergeDuplicateContacts: MergeDuplicateContactsResult;
  previewEmail: EmailPreview;
  purgeDeletedContacts: BatchOperationResult;
  refreshIntentScores: RefreshIntentResult;
  regenerateDraft: ReplyDraft;
  rescrapeCompetitor: Competitor;
  runFullProductIntel: Product;
  runFullProductIntelAsync: IntelRunAccepted;
  salescueAnalyze: SalescueAnalyzeResult;
  saveCrawlLog: SaveCrawlLogResult;
  scheduleBatchEmails: ScheduleBatchResult;
  scheduleFollowUpBatch: FollowUpBatchResult;
  scoreContactLora: Contact;
  scoreContactsML: ScoreContactsMlResult;
  sendEmail: SendEmailResult;
  sendOutreachEmail: SendOutreachEmailResult;
  sendScheduledEmailNow: SendNowResult;
  snoozeReminder: Reminder;
  syncResendEmails: SyncResendResult;
  /**
   * Fetch jobs from Voyager API and upsert into linkedin_posts (type='job').
   * Optionally creates intent_signals (hiring_intent) for each company with postings.
   * Admin only.
   */
  syncVoyagerJobs: SyncVoyagerJobsResult;
  unarchiveEmail: ArchiveEmailResult;
  unblockCompany: Company;
  unflagContactForDeletion: Contact;
  unverifyCompanyContacts: UnverifyContactsResult;
  updateCampaign: EmailCampaign;
  updateCompany: Company;
  updateContact: Contact;
  updateEmailTemplate: EmailTemplate;
  updateOpportunityTags: Opportunity;
  updateReminder: Reminder;
  updateUserSettings: UserSettings;
  upsertLinkedInPost: LinkedInPost;
  upsertLinkedInPosts: UpsertLinkedInPostsResult;
  upsertProduct: Product;
  /** Run fake account detection on all contacts for a company, optionally filtered by skills. */
  verifyCompanyContacts: VerifyCompanyContactsResult;
  /** Run fake account detection on a single contact. Enriches LinkedIn + GitHub, then scores. */
  verifyContactAuthenticity: VerifyAuthenticityResult;
  verifyContactEmail: VerifyEmailResult;
};


export type MutationAdd_Company_FactsArgs = {
  company_id: Scalars['Int']['input'];
  facts: Array<CompanyFactInput>;
};


export type MutationAnalyzeCompanyArgs = {
  id?: InputMaybe<Scalars['Int']['input']>;
  key?: InputMaybe<Scalars['String']['input']>;
};


export type MutationAnalyzeLinkedInPostsArgs = {
  limit?: InputMaybe<Scalars['Int']['input']>;
  postIds?: InputMaybe<Array<Scalars['Int']['input']>>;
};


export type MutationAnalyzeProductGtmArgs = {
  id: Scalars['Int']['input'];
};


export type MutationAnalyzeProductGtmAsyncArgs = {
  id: Scalars['Int']['input'];
};


export type MutationAnalyzeProductIcpArgs = {
  id: Scalars['Int']['input'];
};


export type MutationAnalyzeProductPricingArgs = {
  id: Scalars['Int']['input'];
};


export type MutationAnalyzeProductPricingAsyncArgs = {
  id: Scalars['Int']['input'];
};


export type MutationApplyEmailPatternArgs = {
  companyId: Scalars['Int']['input'];
};


export type MutationApproveAllDraftsArgs = {
  draftIds: Array<Scalars['Int']['input']>;
};


export type MutationApproveAndSendDraftArgs = {
  draftId: Scalars['Int']['input'];
  editedBody?: InputMaybe<Scalars['String']['input']>;
  editedSubject?: InputMaybe<Scalars['String']['input']>;
};


export type MutationApproveCompetitorsArgs = {
  analysisId: Scalars['Int']['input'];
  competitors: Array<CompetitorInput>;
};


export type MutationArchiveEmailArgs = {
  id: Scalars['Int']['input'];
};


export type MutationBatchDetectIntentArgs = {
  companyIds: Array<Scalars['Int']['input']>;
};


export type MutationBatchScoreContactsLoraArgs = {
  companyId: Scalars['Int']['input'];
  limit?: InputMaybe<Scalars['Int']['input']>;
};


export type MutationBlockCompanyArgs = {
  id: Scalars['Int']['input'];
};


export type MutationCancelCompanyEmailsArgs = {
  companyId: Scalars['Int']['input'];
};


export type MutationCancelScheduledEmailArgs = {
  resendId: Scalars['String']['input'];
};


export type MutationClassifyReceivedEmailArgs = {
  id: Scalars['Int']['input'];
};


export type MutationComputeContactDeletionScoresArgs = {
  companyId?: InputMaybe<Scalars['Int']['input']>;
};


export type MutationComputeNextTouchScoresArgs = {
  companyId: Scalars['Int']['input'];
};


export type MutationCountRemoteVoyagerJobsArgs = {
  input: CountRemoteVoyagerJobsInput;
};


export type MutationCreateCompanyArgs = {
  input: CreateCompanyInput;
};


export type MutationCreateCompetitorAnalysisArgs = {
  productId: Scalars['Int']['input'];
};


export type MutationCreateContactArgs = {
  input: CreateContactInput;
};


export type MutationCreateDraftCampaignArgs = {
  input: CreateCampaignInput;
};


export type MutationCreateEmailTemplateArgs = {
  input: CreateEmailTemplateInput;
};


export type MutationCreateOpportunityArgs = {
  input: CreateOpportunityInput;
};


export type MutationCreateReminderArgs = {
  input: CreateReminderInput;
};


export type MutationDeleteCampaignArgs = {
  id: Scalars['String']['input'];
};


export type MutationDeleteCompaniesArgs = {
  companyIds: Array<Scalars['Int']['input']>;
};


export type MutationDeleteCompanyArgs = {
  id: Scalars['Int']['input'];
};


export type MutationDeleteCompetitorAnalysisArgs = {
  id: Scalars['Int']['input'];
};


export type MutationDeleteContactArgs = {
  id: Scalars['Int']['input'];
};


export type MutationDeleteEmailTemplateArgs = {
  id: Scalars['Int']['input'];
};


export type MutationDeleteLinkedInPostArgs = {
  id: Scalars['Int']['input'];
};


export type MutationDeleteProductArgs = {
  id: Scalars['Int']['input'];
};


export type MutationDetectIntentSignalsArgs = {
  companyId: Scalars['Int']['input'];
};


export type MutationDismissAllDraftsArgs = {
  draftIds: Array<Scalars['Int']['input']>;
};


export type MutationDismissDraftArgs = {
  draftId: Scalars['Int']['input'];
};


export type MutationDismissReminderArgs = {
  id: Scalars['Int']['input'];
};


export type MutationEnhanceCompanyArgs = {
  id?: InputMaybe<Scalars['Int']['input']>;
  key?: InputMaybe<Scalars['String']['input']>;
};


export type MutationEnhanceProductIcpArgs = {
  id: Scalars['Int']['input'];
};


export type MutationEnrichAiContactProfileArgs = {
  contactId: Scalars['Int']['input'];
};


export type MutationEnrichAiContactsForCompanyArgs = {
  companyId: Scalars['Int']['input'];
};


export type MutationEnrichContactPapersAndTagsArgs = {
  contactId: Scalars['Int']['input'];
};


export type MutationEnrichOpportunityCandidatesArgs = {
  opportunityId: Scalars['String']['input'];
};


export type MutationFindCompanyEmailsArgs = {
  companyId: Scalars['Int']['input'];
};


export type MutationFindContactEmailArgs = {
  contactId: Scalars['Int']['input'];
};


export type MutationFlagContactsForDeletionArgs = {
  threshold?: InputMaybe<Scalars['Float']['input']>;
};


export type MutationGenerateCompanyEmbeddingsArgs = {
  batchSize?: InputMaybe<Scalars['Int']['input']>;
  companyIds?: InputMaybe<Array<Scalars['Int']['input']>>;
};


export type MutationGenerateEmailArgs = {
  input: GenerateEmailInput;
};


export type MutationGenerateFollowUpDraftsArgs = {
  daysAfterFollowUp1?: InputMaybe<Scalars['Int']['input']>;
  daysAfterFollowUp2?: InputMaybe<Scalars['Int']['input']>;
  daysAfterInitial?: InputMaybe<Scalars['Int']['input']>;
};


export type MutationGenerateReplyArgs = {
  input: GenerateReplyInput;
};


export type MutationImportCompaniesArgs = {
  companies: Array<CompanyImportInput>;
};


export type MutationImportCompanyWithContactsArgs = {
  input: ImportCompanyWithContactsInput;
};


export type MutationImportContactsArgs = {
  contacts: Array<ContactInput>;
};


export type MutationImportResendEmailsArgs = {
  maxEmails?: InputMaybe<Scalars['Int']['input']>;
};


export type MutationIngest_Company_SnapshotArgs = {
  capture_timestamp?: InputMaybe<Scalars['String']['input']>;
  company_id: Scalars['Int']['input'];
  content_hash?: InputMaybe<Scalars['String']['input']>;
  crawl_id?: InputMaybe<Scalars['String']['input']>;
  evidence: EvidenceInput;
  extracted?: InputMaybe<Scalars['JSON']['input']>;
  fetched_at: Scalars['String']['input'];
  http_status?: InputMaybe<Scalars['Int']['input']>;
  jsonld?: InputMaybe<Scalars['JSON']['input']>;
  mime?: InputMaybe<Scalars['String']['input']>;
  source_url: Scalars['String']['input'];
  text_sample?: InputMaybe<Scalars['String']['input']>;
};


export type MutationLaunchEmailCampaignArgs = {
  id: Scalars['String']['input'];
};


export type MutationMarkContactEmailVerifiedArgs = {
  contactId: Scalars['Int']['input'];
  verified: Scalars['Boolean']['input'];
};


export type MutationMarkEmailRepliedArgs = {
  resendId: Scalars['String']['input'];
};


export type MutationMergeDuplicateCompaniesArgs = {
  companyIds: Array<Scalars['Int']['input']>;
};


export type MutationMergeDuplicateContactsArgs = {
  companyId: Scalars['Int']['input'];
};


export type MutationPreviewEmailArgs = {
  input: PreviewEmailInput;
};


export type MutationPurgeDeletedContactsArgs = {
  companyId?: InputMaybe<Scalars['Int']['input']>;
};


export type MutationRegenerateDraftArgs = {
  draftId: Scalars['Int']['input'];
  instructions?: InputMaybe<Scalars['String']['input']>;
};


export type MutationRescrapeCompetitorArgs = {
  competitorId: Scalars['Int']['input'];
};


export type MutationRunFullProductIntelArgs = {
  id: Scalars['Int']['input'];
};


export type MutationRunFullProductIntelAsyncArgs = {
  forceRefresh?: InputMaybe<Scalars['Boolean']['input']>;
  id: Scalars['Int']['input'];
};


export type MutationSalescueAnalyzeArgs = {
  modules?: InputMaybe<Array<SalescueModule>>;
  text: Scalars['String']['input'];
};


export type MutationSaveCrawlLogArgs = {
  input: SaveCrawlLogInput;
};


export type MutationScheduleBatchEmailsArgs = {
  input: ScheduleBatchEmailsInput;
};


export type MutationScheduleFollowUpBatchArgs = {
  input: FollowUpBatchInput;
};


export type MutationScoreContactLoraArgs = {
  contactId: Scalars['Int']['input'];
};


export type MutationScoreContactsMlArgs = {
  companyId: Scalars['Int']['input'];
};


export type MutationSendEmailArgs = {
  input: SendEmailInput;
};


export type MutationSendOutreachEmailArgs = {
  input: SendOutreachEmailInput;
};


export type MutationSendScheduledEmailNowArgs = {
  resendId: Scalars['String']['input'];
};


export type MutationSnoozeReminderArgs = {
  days: Scalars['Int']['input'];
  id: Scalars['Int']['input'];
};


export type MutationSyncResendEmailsArgs = {
  companyId?: InputMaybe<Scalars['Int']['input']>;
};


export type MutationSyncVoyagerJobsArgs = {
  input: SyncVoyagerJobsInput;
};


export type MutationUnarchiveEmailArgs = {
  id: Scalars['Int']['input'];
};


export type MutationUnblockCompanyArgs = {
  id: Scalars['Int']['input'];
};


export type MutationUnflagContactForDeletionArgs = {
  id: Scalars['Int']['input'];
};


export type MutationUnverifyCompanyContactsArgs = {
  companyId: Scalars['Int']['input'];
};


export type MutationUpdateCampaignArgs = {
  id: Scalars['String']['input'];
  input: UpdateCampaignInput;
};


export type MutationUpdateCompanyArgs = {
  id: Scalars['Int']['input'];
  input: UpdateCompanyInput;
};


export type MutationUpdateContactArgs = {
  id: Scalars['Int']['input'];
  input: UpdateContactInput;
};


export type MutationUpdateEmailTemplateArgs = {
  id: Scalars['Int']['input'];
  input: UpdateEmailTemplateInput;
};


export type MutationUpdateOpportunityTagsArgs = {
  id: Scalars['String']['input'];
  tags: Array<Scalars['String']['input']>;
};


export type MutationUpdateReminderArgs = {
  id: Scalars['Int']['input'];
  input: UpdateReminderInput;
};


export type MutationUpdateUserSettingsArgs = {
  settings: UserSettingsInput;
  userId: Scalars['String']['input'];
};


export type MutationUpsertLinkedInPostArgs = {
  input: UpsertLinkedInPostInput;
};


export type MutationUpsertLinkedInPostsArgs = {
  inputs: Array<UpsertLinkedInPostInput>;
};


export type MutationUpsertProductArgs = {
  input: ProductInput;
};


export type MutationVerifyCompanyContactsArgs = {
  companyId: Scalars['Int']['input'];
  skillFilter?: InputMaybe<Array<Scalars['String']['input']>>;
};


export type MutationVerifyContactAuthenticityArgs = {
  contactId: Scalars['Int']['input'];
};


export type MutationVerifyContactEmailArgs = {
  contactId: Scalars['Int']['input'];
};

export type Opportunity = {
  __typename?: 'Opportunity';
  applicationNotes: Maybe<Scalars['String']['output']>;
  applicationStatus: Maybe<Scalars['String']['output']>;
  applied: Scalars['Boolean']['output'];
  appliedAt: Maybe<Scalars['String']['output']>;
  companyId: Maybe<Scalars['Int']['output']>;
  companyName: Maybe<Scalars['String']['output']>;
  contactId: Maybe<Scalars['Int']['output']>;
  createdAt: Scalars['String']['output'];
  deadline: Maybe<Scalars['String']['output']>;
  endDate: Maybe<Scalars['String']['output']>;
  firstSeen: Maybe<Scalars['String']['output']>;
  id: Scalars['String']['output'];
  lastSeen: Maybe<Scalars['String']['output']>;
  rewardText: Maybe<Scalars['String']['output']>;
  rewardUsd: Maybe<Scalars['Float']['output']>;
  score: Maybe<Scalars['Int']['output']>;
  source: Maybe<Scalars['String']['output']>;
  startDate: Maybe<Scalars['String']['output']>;
  status: Scalars['String']['output'];
  tags: Array<Scalars['String']['output']>;
  title: Scalars['String']['output'];
  updatedAt: Scalars['String']['output'];
  url: Maybe<Scalars['String']['output']>;
};

export type PreviewEmailInput = {
  content: Scalars['String']['input'];
  drySend?: InputMaybe<Scalars['Boolean']['input']>;
  recipientEmail: Scalars['String']['input'];
  subject: Scalars['String']['input'];
};

export type PricingTier = {
  __typename?: 'PricingTier';
  annualPriceUsd: Maybe<Scalars['Float']['output']>;
  currency: Scalars['String']['output'];
  id: Scalars['Int']['output'];
  includedLimits: Maybe<Scalars['JSON']['output']>;
  isCustomQuote: Scalars['Boolean']['output'];
  monthlyPriceUsd: Maybe<Scalars['Float']['output']>;
  seatPriceUsd: Maybe<Scalars['Float']['output']>;
  sortOrder: Scalars['Int']['output'];
  tierName: Scalars['String']['output'];
};

export type Product = {
  __typename?: 'Product';
  createdAt: Scalars['DateTime']['output'];
  createdBy: Maybe<Scalars['String']['output']>;
  description: Maybe<Scalars['String']['output']>;
  domain: Maybe<Scalars['String']['output']>;
  gtmAnalysis: Maybe<Scalars['JSON']['output']>;
  gtmAnalyzedAt: Maybe<Scalars['DateTime']['output']>;
  highlights: Maybe<Scalars['JSON']['output']>;
  icpAnalysis: Maybe<Scalars['JSON']['output']>;
  icpAnalyzedAt: Maybe<Scalars['DateTime']['output']>;
  id: Scalars['Int']['output'];
  intelReport: Maybe<Scalars['JSON']['output']>;
  intelReportAt: Maybe<Scalars['DateTime']['output']>;
  name: Scalars['String']['output'];
  pricingAnalysis: Maybe<Scalars['JSON']['output']>;
  pricingAnalyzedAt: Maybe<Scalars['DateTime']['output']>;
  slug: Scalars['String']['output'];
  updatedAt: Scalars['DateTime']['output'];
  url: Scalars['URL']['output'];
};

export type ProductInput = {
  description?: InputMaybe<Scalars['String']['input']>;
  name: Scalars['String']['input'];
  url: Scalars['String']['input'];
};

export type QualityGateResult = {
  __typename?: 'QualityGateResult';
  adjustedScore: Scalars['Float']['output'];
  flags: Array<Scalars['String']['output']>;
  pass: Scalars['Boolean']['output'];
  recommendations: Array<Scalars['String']['output']>;
};

export type Query = {
  __typename?: 'Query';
  allCompanyTags: Array<Scalars['String']['output']>;
  companies: CompaniesResponse;
  companiesByIntent: CompaniesResponse;
  /** Find companies similar to a given company by ID */
  companiesLike: Array<SimilarCompanyResult>;
  company: Maybe<Company>;
  companyContactEmails: Array<CompanyContactEmail>;
  companyScrapedPosts: CompanyScrapedPostsResult;
  company_facts: Array<CompanyFact>;
  company_snapshots: Array<CompanySnapshot>;
  competitorAnalyses: Array<CompetitorAnalysis>;
  competitorAnalysis: Maybe<CompetitorAnalysis>;
  contact: Maybe<Contact>;
  contactByEmail: Maybe<Contact>;
  contactByLinkedinUrl: Maybe<Contact>;
  contactEmails: Array<ContactEmail>;
  contactMessages: Array<ContactMessage>;
  contactOpportunities: Array<Opportunity>;
  contactReceivedEmails: Array<ReceivedEmail>;
  contacts: ContactsResult;
  crawlLog: Maybe<CrawlLog>;
  crawlLogs: Array<CrawlLog>;
  draftSummary: DraftSummary;
  dueReminders: Array<ReminderWithContact>;
  emailCampaign: Maybe<EmailCampaign>;
  emailCampaigns: EmailCampaignsResult;
  emailStats: EmailStats;
  emailTemplate: Maybe<EmailTemplate>;
  emailTemplates: EmailTemplatesResult;
  emailThread: Maybe<EmailThread>;
  emailThreads: EmailThreadsResult;
  emailsNeedingFollowUp: FollowUpEmailsResult;
  findCompany: FindCompanyResult;
  intentDashboard: IntentDashboard;
  intentSignals: IntentSignalsResponse;
  linkedinPost: Maybe<LinkedInPost>;
  linkedinPosts: Array<LinkedInPost>;
  /** ML model health and stats */
  mlStats: MlStats;
  opportunityByUrl: Maybe<Opportunity>;
  product: Maybe<Product>;
  productBySlug: Maybe<Product>;
  productIntelRun: Maybe<IntelRun>;
  productIntelRuns: Array<IntelRun>;
  products: Array<Product>;
  receivedEmail: Maybe<ReceivedEmail>;
  receivedEmails: ReceivedEmailsResult;
  /** Next best companies to contact based on ML scoring */
  recommendedCompanies: Array<RecommendedCompany>;
  /** Best contacts to reach within a company */
  recommendedContacts: Array<RankedContact>;
  reminders: Array<Reminder>;
  replyDrafts: ReplyDraftsResult;
  resendEmail: Maybe<ResendEmailDetail>;
  salescueEntities: SalescueEntitiesResult;
  salescueHealth: SalescueHealth;
  salescueIcp: SalescueIcpResult;
  salescueIntent: SalescueIntentResult;
  salescueObjection: SalescueObjectionResult;
  salescueReply: SalescueReplyResult;
  salescueScore: SalescueScoreResult;
  salescueSentiment: SalescueSentimentResult;
  salescueSpam: SalescueSpamResult;
  salescueSubject: SalescueSubjectResult;
  salescueTriggers: SalescueTriggersResult;
  /** Semantic similarity search: find companies matching a natural language query */
  similarCompanies: Array<SimilarCompanyResult>;
  similarPosts: Array<SimilarPost>;
  userSettings: Maybe<UserSettings>;
  /** Full analytics dashboard — runs all 10 metrics in parallel. */
  voyagerAnalyticsDashboard: VoyagerAnalyticsDashboard;
  /** 10. Geographic arbitrage opportunities (remote roles with high-salary-region pay). */
  voyagerArbitrage: ArbitrageReport;
  /**
   * Get all Voyager-sourced jobs for a specific company.
   * Reads from linkedin_posts where type='job' and raw_data contains voyager metadata.
   */
  voyagerCompanyJobs: Array<LinkedInPost>;
  /** 8. Competitive analysis (most aggressive remote hirers). */
  voyagerCompetitiveAnalysis: CompetitiveReport;
  /** 9. Emerging role detection (new job titles appearing). */
  voyagerEmergingRoles: EmergingRolesReport;
  /** 3. Remote job growth rate by industry and region. */
  voyagerGrowthReport: GrowthReport;
  /** 2. Company hiring velocity detection (jobs posted per week). */
  voyagerHiringVelocity: Array<CompanyVelocity>;
  /** 1. Daily remote job count tracking by query/keyword. */
  voyagerJobCountTrend: JobCountTrend;
  /**
   * Search LinkedIn jobs via Voyager API proxy.
   * Requires CSRF token forwarded from an authenticated LinkedIn session.
   * Results are NOT persisted — use syncVoyagerJobs to store.
   */
  voyagerJobSearch: VoyagerJobSearchResult;
  /**
   * Get cached remote job counts per company.
   * Reads from the most recent countRemoteVoyagerJobs result stored in DB,
   * NOT a live Voyager call. Use the mutation to refresh.
   */
  voyagerRemoteJobCounts: Array<VoyagerCompanyJobCount>;
  /** Aggregate remote-work metrics across all companies with Voyager data. */
  voyagerRemoteMetrics: VoyagerRemoteMetrics;
  /** 7. Repost frequency analysis (indicator of hard-to-fill roles). */
  voyagerRepostAnalysis: RepostReport;
  /** 4. Salary trend analysis for remote roles. */
  voyagerSalaryTrends: SalaryTrend;
  /** 5. Skills demand tracking (most requested skills in remote AI/ML jobs). */
  voyagerSkillsDemand: SkillsDemandReport;
  /** 6. Time-to-fill estimation (how long jobs stay open). */
  voyagerTimeToFill: TimeToFillReport;
  webhookEvents: WebhookEventsResult;
};


export type QueryCompaniesArgs = {
  filter?: InputMaybe<CompanyFilterInput>;
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
  order_by?: InputMaybe<CompanyOrderBy>;
};


export type QueryCompaniesByIntentArgs = {
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
  signalType?: InputMaybe<IntentSignalType>;
  threshold: Scalars['Float']['input'];
};


export type QueryCompaniesLikeArgs = {
  companyId: Scalars['Int']['input'];
  limit?: InputMaybe<Scalars['Int']['input']>;
  minScore?: InputMaybe<Scalars['Float']['input']>;
};


export type QueryCompanyArgs = {
  id?: InputMaybe<Scalars['Int']['input']>;
  key?: InputMaybe<Scalars['String']['input']>;
};


export type QueryCompanyContactEmailsArgs = {
  companyId: Scalars['Int']['input'];
};


export type QueryCompanyScrapedPostsArgs = {
  companySlug: Scalars['String']['input'];
};


export type QueryCompany_FactsArgs = {
  company_id: Scalars['Int']['input'];
  field?: InputMaybe<Scalars['String']['input']>;
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
};


export type QueryCompany_SnapshotsArgs = {
  company_id: Scalars['Int']['input'];
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
};


export type QueryCompetitorAnalysesArgs = {
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
};


export type QueryCompetitorAnalysisArgs = {
  id: Scalars['Int']['input'];
};


export type QueryContactArgs = {
  id?: InputMaybe<Scalars['Int']['input']>;
  slug?: InputMaybe<Scalars['String']['input']>;
};


export type QueryContactByEmailArgs = {
  email: Scalars['String']['input'];
};


export type QueryContactByLinkedinUrlArgs = {
  linkedinUrl: Scalars['String']['input'];
};


export type QueryContactEmailsArgs = {
  contactId: Scalars['Int']['input'];
};


export type QueryContactMessagesArgs = {
  contactId: Scalars['Int']['input'];
};


export type QueryContactOpportunitiesArgs = {
  contactId: Scalars['Int']['input'];
};


export type QueryContactReceivedEmailsArgs = {
  contactId: Scalars['Int']['input'];
};


export type QueryContactsArgs = {
  companyId?: InputMaybe<Scalars['Int']['input']>;
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
  search?: InputMaybe<Scalars['String']['input']>;
  tag?: InputMaybe<Scalars['String']['input']>;
};


export type QueryCrawlLogArgs = {
  id: Scalars['Int']['input'];
};


export type QueryCrawlLogsArgs = {
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
};


export type QueryEmailCampaignArgs = {
  id: Scalars['String']['input'];
};


export type QueryEmailCampaignsArgs = {
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
  status?: InputMaybe<Scalars['String']['input']>;
};


export type QueryEmailTemplateArgs = {
  id: Scalars['Int']['input'];
};


export type QueryEmailTemplatesArgs = {
  category?: InputMaybe<Scalars['String']['input']>;
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
};


export type QueryEmailThreadArgs = {
  contactId: Scalars['Int']['input'];
};


export type QueryEmailThreadsArgs = {
  classification?: InputMaybe<Scalars['String']['input']>;
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
  search?: InputMaybe<Scalars['String']['input']>;
  sortBy?: InputMaybe<Scalars['String']['input']>;
};


export type QueryEmailsNeedingFollowUpArgs = {
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
};


export type QueryFindCompanyArgs = {
  linkedinUrl?: InputMaybe<Scalars['String']['input']>;
  name?: InputMaybe<Scalars['String']['input']>;
  website?: InputMaybe<Scalars['String']['input']>;
};


export type QueryIntentSignalsArgs = {
  companyId: Scalars['Int']['input'];
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
  signalType?: InputMaybe<IntentSignalType>;
};


export type QueryLinkedinPostArgs = {
  id: Scalars['Int']['input'];
};


export type QueryLinkedinPostsArgs = {
  companyId?: InputMaybe<Scalars['Int']['input']>;
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
  type?: InputMaybe<LinkedInPostType>;
};


export type QueryOpportunityByUrlArgs = {
  url: Scalars['String']['input'];
};


export type QueryProductArgs = {
  id: Scalars['Int']['input'];
};


export type QueryProductBySlugArgs = {
  slug: Scalars['String']['input'];
};


export type QueryProductIntelRunArgs = {
  id: Scalars['ID']['input'];
};


export type QueryProductIntelRunsArgs = {
  kind?: InputMaybe<Scalars['String']['input']>;
  productId: Scalars['Int']['input'];
};


export type QueryProductsArgs = {
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
};


export type QueryReceivedEmailArgs = {
  id: Scalars['Int']['input'];
};


export type QueryReceivedEmailsArgs = {
  archived?: InputMaybe<Scalars['Boolean']['input']>;
  classification?: InputMaybe<Scalars['String']['input']>;
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
};


export type QueryRecommendedCompaniesArgs = {
  limit?: InputMaybe<Scalars['Int']['input']>;
  minScore?: InputMaybe<Scalars['Float']['input']>;
};


export type QueryRecommendedContactsArgs = {
  companyId: Scalars['Int']['input'];
  limit?: InputMaybe<Scalars['Int']['input']>;
};


export type QueryRemindersArgs = {
  entityId: Scalars['Int']['input'];
  entityType: Scalars['String']['input'];
};


export type QueryReplyDraftsArgs = {
  draftType?: InputMaybe<Scalars['String']['input']>;
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
  status?: InputMaybe<Scalars['String']['input']>;
};


export type QueryResendEmailArgs = {
  resendId: Scalars['String']['input'];
};


export type QuerySalescueEntitiesArgs = {
  text: Scalars['String']['input'];
};


export type QuerySalescueIcpArgs = {
  icp: Scalars['String']['input'];
  prospect: Scalars['String']['input'];
};


export type QuerySalescueIntentArgs = {
  text: Scalars['String']['input'];
};


export type QuerySalescueObjectionArgs = {
  text: Scalars['String']['input'];
};


export type QuerySalescueReplyArgs = {
  text: Scalars['String']['input'];
  touchpoint?: InputMaybe<Scalars['Int']['input']>;
};


export type QuerySalescueScoreArgs = {
  text: Scalars['String']['input'];
};


export type QuerySalescueSentimentArgs = {
  text: Scalars['String']['input'];
};


export type QuerySalescueSpamArgs = {
  text: Scalars['String']['input'];
};


export type QuerySalescueSubjectArgs = {
  subjects: Array<Scalars['String']['input']>;
};


export type QuerySalescueTriggersArgs = {
  text: Scalars['String']['input'];
};


export type QuerySimilarCompaniesArgs = {
  limit?: InputMaybe<Scalars['Int']['input']>;
  minAiTier?: InputMaybe<Scalars['Int']['input']>;
  minScore?: InputMaybe<Scalars['Float']['input']>;
  query: Scalars['String']['input'];
};


export type QuerySimilarPostsArgs = {
  limit?: InputMaybe<Scalars['Int']['input']>;
  minScore?: InputMaybe<Scalars['Float']['input']>;
  postId: Scalars['Int']['input'];
};


export type QueryUserSettingsArgs = {
  userId: Scalars['String']['input'];
};


export type QueryVoyagerAnalyticsDashboardArgs = {
  query?: InputMaybe<Scalars['String']['input']>;
};


export type QueryVoyagerArbitrageArgs = {
  minPremiumPercent?: InputMaybe<Scalars['Float']['input']>;
};


export type QueryVoyagerCompanyJobsArgs = {
  companyId: Scalars['Int']['input'];
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
};


export type QueryVoyagerCompetitiveAnalysisArgs = {
  period?: InputMaybe<Scalars['String']['input']>;
};


export type QueryVoyagerEmergingRolesArgs = {
  period?: InputMaybe<Scalars['String']['input']>;
};


export type QueryVoyagerGrowthReportArgs = {
  period?: InputMaybe<Scalars['String']['input']>;
};


export type QueryVoyagerHiringVelocityArgs = {
  limit?: InputMaybe<Scalars['Int']['input']>;
};


export type QueryVoyagerJobCountTrendArgs = {
  period?: InputMaybe<Scalars['String']['input']>;
  query: Scalars['String']['input'];
};


export type QueryVoyagerJobSearchArgs = {
  input: VoyagerJobSearchInput;
};


export type QueryVoyagerRemoteJobCountsArgs = {
  companyIds: Array<Scalars['Int']['input']>;
};


export type QueryVoyagerRemoteMetricsArgs = {
  minRemoteJobs?: InputMaybe<Scalars['Int']['input']>;
};


export type QueryVoyagerSalaryTrendsArgs = {
  period?: InputMaybe<Scalars['String']['input']>;
  query?: InputMaybe<Scalars['String']['input']>;
};


export type QueryVoyagerSkillsDemandArgs = {
  period?: InputMaybe<Scalars['String']['input']>;
  query?: InputMaybe<Scalars['String']['input']>;
};


export type QueryWebhookEventsArgs = {
  eventType?: InputMaybe<Scalars['String']['input']>;
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
};

export type RankedContact = {
  __typename?: 'RankedContact';
  contact: Contact;
  rankScore: Scalars['Float']['output'];
  reasons: Array<Scalars['String']['output']>;
};

export type ReceivedEmail = {
  __typename?: 'ReceivedEmail';
  archivedAt: Maybe<Scalars['String']['output']>;
  attachments: Maybe<Scalars['JSON']['output']>;
  ccEmails: Array<Scalars['String']['output']>;
  classification: Maybe<Scalars['String']['output']>;
  classificationConfidence: Maybe<Scalars['Float']['output']>;
  classifiedAt: Maybe<Scalars['String']['output']>;
  createdAt: Scalars['String']['output'];
  fromEmail: Maybe<Scalars['String']['output']>;
  htmlContent: Maybe<Scalars['String']['output']>;
  id: Scalars['Int']['output'];
  matchedContact: Maybe<Contact>;
  matchedContactId: Maybe<Scalars['Int']['output']>;
  matchedOutboundId: Maybe<Scalars['Int']['output']>;
  messageId: Maybe<Scalars['String']['output']>;
  receivedAt: Scalars['String']['output'];
  replyToEmails: Array<Scalars['String']['output']>;
  resendId: Maybe<Scalars['String']['output']>;
  sentReplies: Array<SentReply>;
  subject: Maybe<Scalars['String']['output']>;
  textContent: Maybe<Scalars['String']['output']>;
  toEmails: Array<Scalars['String']['output']>;
  updatedAt: Scalars['String']['output'];
};

export type ReceivedEmailsResult = {
  __typename?: 'ReceivedEmailsResult';
  emails: Array<ReceivedEmail>;
  totalCount: Scalars['Int']['output'];
};

export type RecommendedCompany = {
  __typename?: 'RecommendedCompany';
  company: Company;
  reasons: Array<Scalars['String']['output']>;
  score: Scalars['Float']['output'];
};

export type RefreshIntentResult = {
  __typename?: 'RefreshIntentResult';
  companiesUpdated: Scalars['Int']['output'];
  success: Scalars['Boolean']['output'];
};

export type RegionGrowth = {
  __typename?: 'RegionGrowth';
  currentCount: Scalars['Int']['output'];
  growthRate: Scalars['Float']['output'];
  location: Scalars['String']['output'];
  previousCount: Scalars['Int']['output'];
  remoteCount: Scalars['Int']['output'];
};

export type Reminder = {
  __typename?: 'Reminder';
  createdAt: Scalars['String']['output'];
  entityId: Scalars['Int']['output'];
  entityType: Scalars['String']['output'];
  id: Scalars['Int']['output'];
  note: Maybe<Scalars['String']['output']>;
  recurrence: Scalars['String']['output'];
  remindAt: Scalars['String']['output'];
  snoozedUntil: Maybe<Scalars['String']['output']>;
  status: Scalars['String']['output'];
  updatedAt: Scalars['String']['output'];
};

export type ReminderWithContact = {
  __typename?: 'ReminderWithContact';
  contact: Contact;
  reminder: Reminder;
};

export type ReplyDraft = {
  __typename?: 'ReplyDraft';
  approvedAt: Maybe<Scalars['String']['output']>;
  bodyHtml: Maybe<Scalars['String']['output']>;
  bodyText: Scalars['String']['output'];
  classification: Maybe<Scalars['String']['output']>;
  classificationConfidence: Maybe<Scalars['Float']['output']>;
  companyName: Maybe<Scalars['String']['output']>;
  contactEmail: Maybe<Scalars['String']['output']>;
  contactId: Scalars['Int']['output'];
  contactName: Maybe<Scalars['String']['output']>;
  createdAt: Scalars['String']['output'];
  draftType: Scalars['String']['output'];
  generationModel: Maybe<Scalars['String']['output']>;
  id: Scalars['Int']['output'];
  receivedEmailId: Scalars['Int']['output'];
  sentAt: Maybe<Scalars['String']['output']>;
  status: Scalars['String']['output'];
  subject: Scalars['String']['output'];
  updatedAt: Scalars['String']['output'];
};

export type ReplyDraftsResult = {
  __typename?: 'ReplyDraftsResult';
  drafts: Array<ReplyDraft>;
  totalCount: Scalars['Int']['output'];
};

export type RepostReport = {
  __typename?: 'RepostReport';
  avgDaysOpen: Scalars['Float']['output'];
  avgRepostCount: Scalars['Float']['output'];
  hardToFillJobs: Array<RepostSignal>;
  repostRate: Scalars['Float']['output'];
  repostedJobs: Scalars['Int']['output'];
  totalJobsTracked: Scalars['Int']['output'];
};

export type RepostSignal = {
  __typename?: 'RepostSignal';
  companyName: Scalars['String']['output'];
  daysSinceFirst: Scalars['Float']['output'];
  firstSeenDate: Scalars['String']['output'];
  isHardToFill: Scalars['Boolean']['output'];
  jobTitle: Scalars['String']['output'];
  jobUrl: Scalars['String']['output'];
  lastSeenDate: Scalars['String']['output'];
  repostCount: Scalars['Int']['output'];
};

export type ResendEmailDetail = {
  __typename?: 'ResendEmailDetail';
  bcc: Maybe<Array<Scalars['String']['output']>>;
  cc: Maybe<Array<Scalars['String']['output']>>;
  createdAt: Scalars['String']['output'];
  from: Scalars['String']['output'];
  html: Maybe<Scalars['String']['output']>;
  id: Scalars['String']['output'];
  lastEvent: Maybe<Scalars['String']['output']>;
  scheduledAt: Maybe<Scalars['String']['output']>;
  subject: Maybe<Scalars['String']['output']>;
  text: Maybe<Scalars['String']['output']>;
  to: Array<Scalars['String']['output']>;
};

export type SalaryBand = {
  __typename?: 'SalaryBand';
  currency: Scalars['String']['output'];
  max: Scalars['Float']['output'];
  median: Scalars['Float']['output'];
  min: Scalars['Float']['output'];
  p25: Scalars['Float']['output'];
  p75: Scalars['Float']['output'];
  sampleCount: Scalars['Int']['output'];
};

export type SalaryRegionBreakdown = {
  __typename?: 'SalaryRegionBreakdown';
  band: SalaryBand;
  region: Scalars['String']['output'];
};

export type SalarySeniorityBreakdown = {
  __typename?: 'SalarySeniorityBreakdown';
  band: SalaryBand;
  level: Scalars['String']['output'];
};

export type SalaryTrend = {
  __typename?: 'SalaryTrend';
  byRegion: Array<SalaryRegionBreakdown>;
  bySeniority: Array<SalarySeniorityBreakdown>;
  currentBand: SalaryBand;
  medianDelta: Scalars['Float']['output'];
  period: Scalars['String']['output'];
  previousBand: SalaryBand;
  query: Scalars['String']['output'];
  trend: Scalars['String']['output'];
};

export type SalescueAnalyzeResult = {
  __typename?: 'SalescueAnalyzeResult';
  errors: Array<SalescueModuleError>;
  modulesRun: Scalars['Int']['output'];
  results: Scalars['JSON']['output'];
  timings: Scalars['JSON']['output'];
  totalTime: Scalars['Float']['output'];
};

export type SalescueAnomalyResult = {
  __typename?: 'SalescueAnomalyResult';
  anomalyScore: Scalars['Float']['output'];
  anomalyType: Scalars['String']['output'];
  channelAttribution: Scalars['JSON']['output'];
  cosineSimilarity: Scalars['Float']['output'];
  isAnomalous: Scalars['Boolean']['output'];
  textPriorAdjustment: Scalars['Float']['output'];
  typeConfidence: Scalars['Float']['output'];
  zScore: Scalars['Float']['output'];
};

export type SalescueBanditAlternative = {
  __typename?: 'SalescueBanditAlternative';
  sampledReward: Scalars['Float']['output'];
  subjectStyle: Scalars['String']['output'];
  template: Scalars['String']['output'];
  timing: Scalars['String']['output'];
};

export type SalescueBanditArm = {
  __typename?: 'SalescueBanditArm';
  subjectStyle: Scalars['String']['output'];
  template: Scalars['String']['output'];
  timing: Scalars['String']['output'];
};

export type SalescueBanditResult = {
  __typename?: 'SalescueBanditResult';
  alternatives: Array<SalescueBanditAlternative>;
  armIndex: Scalars['Int']['output'];
  bestArm: SalescueBanditArm;
  expectedReward: Scalars['Float']['output'];
  explorationTemperature: Scalars['Float']['output'];
  sampledReward: Scalars['Float']['output'];
  totalArms: Scalars['Int']['output'];
};

export type SalescueCallResult = {
  __typename?: 'SalescueCallResult';
  action: Scalars['String']['output'];
  commitmentCount: Scalars['Int']['output'];
  commitments: Array<SalescueCommitment>;
  dealHealth: Scalars['Int']['output'];
  modelConfidence: Scalars['Float']['output'];
  momentum: Scalars['String']['output'];
  negatedCommitmentCount: Scalars['Int']['output'];
  turnScores: Array<Scalars['Float']['output']>;
  turnUncertainties: Array<Scalars['Float']['output']>;
  turningPoints: Array<SalescueTurningPoint>;
};

export type SalescueCoachingCard = {
  __typename?: 'SalescueCoachingCard';
  avoid: Array<Scalars['String']['output']>;
  example: Scalars['String']['output'];
  framework: Scalars['String']['output'];
  steps: Array<Scalars['String']['output']>;
};

export type SalescueCommitment = {
  __typename?: 'SalescueCommitment';
  negated: Scalars['Boolean']['output'];
  pattern: Scalars['String']['output'];
  speaker: Scalars['String']['output'];
  turn: Scalars['Int']['output'];
  type: Scalars['String']['output'];
};

export type SalescueEmailgenResult = {
  __typename?: 'SalescueEmailgenResult';
  contextUsed: Scalars['JSON']['output'];
  email: Scalars['String']['output'];
  emailType: Scalars['String']['output'];
  hasCallToAction: Scalars['Boolean']['output'];
  promptTokens: Scalars['Int']['output'];
  wordCount: Scalars['Int']['output'];
};

export type SalescueEntitiesResult = {
  __typename?: 'SalescueEntitiesResult';
  entities: Array<SalescueEntity>;
  neuralCount: Scalars['Int']['output'];
  regexCount: Scalars['Int']['output'];
  typesFound: Array<Scalars['String']['output']>;
};

export type SalescueEntity = {
  __typename?: 'SalescueEntity';
  confidence: Scalars['Float']['output'];
  endChar: Maybe<Scalars['Int']['output']>;
  role: Scalars['String']['output'];
  roleScores: Scalars['JSON']['output'];
  source: Scalars['String']['output'];
  startChar: Maybe<Scalars['Int']['output']>;
  text: Scalars['String']['output'];
  type: Scalars['String']['output'];
};

export type SalescueGraphResult = {
  __typename?: 'SalescueGraphResult';
  edgeCount: Maybe<Scalars['Int']['output']>;
  graphLabel: Scalars['String']['output'];
  graphScore: Scalars['Float']['output'];
  graphSignals: Array<SalescueGraphSignal>;
  labelConfidence: Scalars['Float']['output'];
  nodeCount: Maybe<Scalars['Int']['output']>;
  note: Maybe<Scalars['String']['output']>;
  similarCompanies: Array<SalescueSimilarCompany>;
};

export type SalescueGraphSignal = {
  __typename?: 'SalescueGraphSignal';
  strength: Scalars['Float']['output'];
  type: Scalars['String']['output'];
  with: Scalars['String']['output'];
};

export type SalescueHealth = {
  __typename?: 'SalescueHealth';
  device: Scalars['String']['output'];
  moduleCount: Scalars['Int']['output'];
  modules: Array<Scalars['String']['output']>;
  status: Scalars['String']['output'];
  version: Scalars['String']['output'];
};

export type SalescueIcpDimensionFit = {
  __typename?: 'SalescueICPDimensionFit';
  distance: Scalars['Float']['output'];
  fit: Maybe<Scalars['Float']['output']>;
  icpSpread: Scalars['Float']['output'];
  status: Scalars['String']['output'];
};

export type SalescueIcpResult = {
  __typename?: 'SalescueICPResult';
  dealbreakers: Array<Scalars['String']['output']>;
  dimensions: Scalars['JSON']['output'];
  missing: Array<Scalars['String']['output']>;
  qualified: Scalars['Boolean']['output'];
  score: Scalars['Float']['output'];
};

export type SalescueIntentResult = {
  __typename?: 'SalescueIntentResult';
  confidence: Scalars['Float']['output'];
  dataPoints: Scalars['Int']['output'];
  distribution: Scalars['JSON']['output'];
  stage: Scalars['String']['output'];
  trajectory: Maybe<SalescueIntentTrajectory>;
};

export type SalescueIntentTrajectory = {
  __typename?: 'SalescueIntentTrajectory';
  acceleration: Scalars['Float']['output'];
  currentIntensity: Scalars['Float']['output'];
  daysToPurchase: Scalars['Int']['output'];
  direction: Scalars['String']['output'];
  velocity: Scalars['Float']['output'];
};

export type SalescueModule =
  | 'ANOMALY'
  | 'BANDIT'
  | 'CALL'
  | 'EMAILGEN'
  | 'ENTITIES'
  | 'GRAPH'
  | 'ICP'
  | 'INTENT'
  | 'OBJECTION'
  | 'REPLY'
  | 'SCORE'
  | 'SENTIMENT'
  | 'SPAM'
  | 'SUBJECT'
  | 'SURVIVAL'
  | 'TRIGGERS';

export type SalescueModuleError = {
  __typename?: 'SalescueModuleError';
  error: Scalars['String']['output'];
  module: Scalars['String']['output'];
};

export type SalescueObjectionResult = {
  __typename?: 'SalescueObjectionResult';
  category: Scalars['String']['output'];
  categoryConfidence: Scalars['Float']['output'];
  coaching: SalescueCoachingCard;
  objectionType: Scalars['String']['output'];
  severity: Scalars['Float']['output'];
  topTypes: Scalars['JSON']['output'];
  typeConfidence: Scalars['Float']['output'];
};

export type SalescueReplyEvidence = {
  __typename?: 'SalescueReplyEvidence';
  label: Scalars['String']['output'];
  text: Scalars['String']['output'];
};

export type SalescueReplyResult = {
  __typename?: 'SalescueReplyResult';
  active: Scalars['JSON']['output'];
  alternativeConfigs: Scalars['Int']['output'];
  configurationScore: Scalars['Float']['output'];
  evidence: Array<SalescueReplyEvidence>;
  primary: Scalars['String']['output'];
  scores: Scalars['JSON']['output'];
};

export type SalescueScoreCategories = {
  __typename?: 'SalescueScoreCategories';
  analytics: Scalars['Float']['output'];
  automation: Scalars['Float']['output'];
  engagement: Scalars['Float']['output'];
  enrichment: Scalars['Float']['output'];
  intent: Scalars['Float']['output'];
  outreach: Scalars['Float']['output'];
};

export type SalescueScoreResult = {
  __typename?: 'SalescueScoreResult';
  categories: SalescueScoreCategories;
  confidence: Scalars['Float']['output'];
  label: Scalars['String']['output'];
  nSignalsDetected: Scalars['Int']['output'];
  score: Scalars['Int']['output'];
  signals: Array<SalescueScoreSignal>;
};

export type SalescueScoreSignal = {
  __typename?: 'SalescueScoreSignal';
  attendedPositions: Array<Scalars['Int']['output']>;
  attributionType: Scalars['String']['output'];
  category: Scalars['String']['output'];
  causalImpact: Scalars['Float']['output'];
  signal: Scalars['String']['output'];
  strength: Scalars['Float']['output'];
};

export type SalescueSentimentEvidence = {
  __typename?: 'SalescueSentimentEvidence';
  signal: Scalars['String']['output'];
  text: Scalars['String']['output'];
};

export type SalescueSentimentResult = {
  __typename?: 'SalescueSentimentResult';
  confidence: Scalars['Float']['output'];
  contextGate: Scalars['Float']['output'];
  evidence: Array<SalescueSentimentEvidence>;
  intent: Scalars['String']['output'];
  interactionWeight: Scalars['Float']['output'];
  interpretation: Maybe<Scalars['String']['output']>;
  inverted: Scalars['Boolean']['output'];
  sentiment: Scalars['String']['output'];
};

export type SalescueSimilarCompany = {
  __typename?: 'SalescueSimilarCompany';
  name: Scalars['String']['output'];
  similarity: Scalars['Float']['output'];
};

export type SalescueSpamResult = {
  __typename?: 'SalescueSpamResult';
  aiRisk: Scalars['Float']['output'];
  aspectScores: Scalars['JSON']['output'];
  categoryScores: Scalars['JSON']['output'];
  deliverability: Scalars['Int']['output'];
  gateConfidence: Scalars['Float']['output'];
  gateDecision: Scalars['String']['output'];
  provider: Scalars['String']['output'];
  providerScores: Scalars['JSON']['output'];
  riskFactors: Array<Scalars['String']['output']>;
  riskLevel: Scalars['String']['output'];
  spamCategory: Scalars['String']['output'];
  spamScore: Scalars['Float']['output'];
};

export type SalescueSubjectRanking = {
  __typename?: 'SalescueSubjectRanking';
  rank: Scalars['Int']['output'];
  score: Scalars['Int']['output'];
  subject: Scalars['String']['output'];
};

export type SalescueSubjectResult = {
  __typename?: 'SalescueSubjectResult';
  best: Scalars['String']['output'];
  ranking: Array<SalescueSubjectRanking>;
  worst: Scalars['String']['output'];
};

export type SalescueSurvivalResult = {
  __typename?: 'SalescueSurvivalResult';
  medianDaysToConversion: Scalars['Float']['output'];
  pConvert30d: Scalars['Float']['output'];
  pConvert90d: Scalars['Float']['output'];
  riskConfidence: Scalars['Float']['output'];
  riskGroup: Scalars['String']['output'];
  survivalCurve: Scalars['JSON']['output'];
  weibullParams: Scalars['JSON']['output'];
};

export type SalescueTriggerEvent = {
  __typename?: 'SalescueTriggerEvent';
  confidence: Scalars['Float']['output'];
  displacementCi: Array<Scalars['Float']['output']>;
  displacementDays: Scalars['Float']['output'];
  displacementUncertainty: Scalars['Float']['output'];
  fresh: Scalars['Boolean']['output'];
  freshness: Scalars['String']['output'];
  temporalFeatures: SalescueTriggerTemporalFeatures;
  type: Scalars['String']['output'];
};

export type SalescueTriggerTemporalFeatures = {
  __typename?: 'SalescueTriggerTemporalFeatures';
  pastSignal: Scalars['Float']['output'];
  recentSignal: Scalars['Float']['output'];
  todaySignal: Scalars['Float']['output'];
};

export type SalescueTriggersResult = {
  __typename?: 'SalescueTriggersResult';
  events: Array<SalescueTriggerEvent>;
  primary: Maybe<SalescueTriggerEvent>;
};

export type SalescueTurningPoint = {
  __typename?: 'SalescueTurningPoint';
  delta: Scalars['Float']['output'];
  direction: Scalars['String']['output'];
  probability: Scalars['Float']['output'];
  speaker: Scalars['String']['output'];
  turn: Scalars['Int']['output'];
  uncertainty: Scalars['Float']['output'];
};

export type SaveCrawlLogInput = {
  companySlug: Scalars['String']['input'];
  completedAt?: InputMaybe<Scalars['String']['input']>;
  durationMs: Scalars['Int']['input'];
  entries: Array<Scalars['String']['input']>;
  error?: InputMaybe<Scalars['String']['input']>;
  filtered: Scalars['Int']['input'];
  saved: Scalars['Int']['input'];
  seedUrl: Scalars['String']['input'];
  skipped: Scalars['Int']['input'];
  startedAt: Scalars['String']['input'];
  status: Scalars['String']['input'];
  targets: Scalars['Int']['input'];
  totalRemoteJobs?: InputMaybe<Scalars['Int']['input']>;
  visited: Scalars['Int']['input'];
};

export type SaveCrawlLogResult = {
  __typename?: 'SaveCrawlLogResult';
  crawlLogId: Maybe<Scalars['Int']['output']>;
  error: Maybe<Scalars['String']['output']>;
  success: Scalars['Boolean']['output'];
};

export type ScheduleBatchEmailsInput = {
  body: Scalars['String']['input'];
  /** Recipients with name and email */
  recipients: Array<BatchRecipientInput>;
  subject: Scalars['String']['input'];
  /** Use business day scheduling (Mon-Fri, 8am UTC, random delays) */
  useScheduler?: InputMaybe<Scalars['Boolean']['input']>;
};

export type ScheduleBatchResult = {
  __typename?: 'ScheduleBatchResult';
  failed: Scalars['Int']['output'];
  firstSendDate: Maybe<Scalars['String']['output']>;
  lastSendDate: Maybe<Scalars['String']['output']>;
  message: Scalars['String']['output'];
  scheduled: Scalars['Int']['output'];
  schedulingPlan: Maybe<Scalars['String']['output']>;
  success: Scalars['Boolean']['output'];
};

export type ScoreContactsLoraResult = {
  __typename?: 'ScoreContactsLoraResult';
  contactsScored: Scalars['Int']['output'];
  message: Scalars['String']['output'];
  results: Array<ContactLoraScore>;
  success: Scalars['Boolean']['output'];
  tierBreakdown: LoraTierBreakdown;
};

export type ScoreContactsMlResult = {
  __typename?: 'ScoreContactsMLResult';
  contactsScored: Scalars['Int']['output'];
  decisionMakersFound: Scalars['Int']['output'];
  message: Scalars['String']['output'];
  results: Array<ContactMlScore>;
  success: Scalars['Boolean']['output'];
};

export type ScrapedPost = {
  __typename?: 'ScrapedPost';
  authorName: Maybe<Scalars['String']['output']>;
  authorUrl: Maybe<Scalars['String']['output']>;
  commentsCount: Scalars['Int']['output'];
  isRepost: Scalars['Boolean']['output'];
  mediaType: Maybe<Scalars['String']['output']>;
  originalAuthor: Maybe<Scalars['String']['output']>;
  personHeadline: Maybe<Scalars['String']['output']>;
  personLinkedinUrl: Scalars['String']['output'];
  personName: Scalars['String']['output'];
  postText: Maybe<Scalars['String']['output']>;
  postUrl: Maybe<Scalars['String']['output']>;
  postedDate: Maybe<Scalars['String']['output']>;
  reactionsCount: Scalars['Int']['output'];
  repostsCount: Scalars['Int']['output'];
  scrapedAt: Scalars['String']['output'];
};

export type SendDraftResult = {
  __typename?: 'SendDraftResult';
  error: Maybe<Scalars['String']['output']>;
  resendId: Maybe<Scalars['String']['output']>;
  success: Scalars['Boolean']['output'];
};

export type SendEmailInput = {
  from?: InputMaybe<Scalars['String']['input']>;
  html: Scalars['String']['input'];
  replyTo?: InputMaybe<Scalars['String']['input']>;
  scheduledAt?: InputMaybe<Scalars['String']['input']>;
  subject: Scalars['String']['input'];
  text?: InputMaybe<Scalars['String']['input']>;
  to: Scalars['String']['input'];
};

export type SendEmailResult = {
  __typename?: 'SendEmailResult';
  error: Maybe<Scalars['String']['output']>;
  id: Maybe<Scalars['String']['output']>;
  success: Scalars['Boolean']['output'];
};

export type SendNowResult = {
  __typename?: 'SendNowResult';
  error: Maybe<Scalars['String']['output']>;
  resendId: Maybe<Scalars['String']['output']>;
  success: Scalars['Boolean']['output'];
};

export type SendOutreachEmailInput = {
  postText: Scalars['String']['input'];
  postUrl?: InputMaybe<Scalars['String']['input']>;
  recipientEmail?: InputMaybe<Scalars['String']['input']>;
  recipientName: Scalars['String']['input'];
  recipientRole?: InputMaybe<Scalars['String']['input']>;
  tone?: InputMaybe<Scalars['String']['input']>;
};

export type SendOutreachEmailResult = {
  __typename?: 'SendOutreachEmailResult';
  emailId: Maybe<Scalars['String']['output']>;
  error: Maybe<Scalars['String']['output']>;
  subject: Maybe<Scalars['String']['output']>;
  success: Scalars['Boolean']['output'];
};

export type SentReply = {
  __typename?: 'SentReply';
  createdAt: Scalars['String']['output'];
  fromEmail: Scalars['String']['output'];
  htmlContent: Maybe<Scalars['String']['output']>;
  id: Scalars['Int']['output'];
  resendId: Maybe<Scalars['String']['output']>;
  sentAt: Maybe<Scalars['String']['output']>;
  status: Scalars['String']['output'];
  subject: Scalars['String']['output'];
  textContent: Maybe<Scalars['String']['output']>;
  toEmails: Array<Scalars['String']['output']>;
};

export type SignalTypeCount = {
  __typename?: 'SignalTypeCount';
  count: Scalars['Int']['output'];
  signalType: IntentSignalType;
};

export type SimilarCompanyResult = {
  __typename?: 'SimilarCompanyResult';
  company: Company;
  similarity: Scalars['Float']['output'];
};

export type SimilarPost = {
  __typename?: 'SimilarPost';
  post: LinkedInPost;
  similarity: Scalars['Float']['output'];
};

export type SkillDemand = {
  __typename?: 'SkillDemand';
  avgConfidence: Scalars['Float']['output'];
  count: Scalars['Int']['output'];
  escoLabel: Maybe<Scalars['String']['output']>;
  pctOfTotal: Scalars['Float']['output'];
  skill: Scalars['String']['output'];
  trend: Scalars['String']['output'];
  weeksInTop20: Scalars['Int']['output'];
};

export type SkillMatchResult = {
  __typename?: 'SkillMatchResult';
  claimedSkills: Array<Scalars['String']['output']>;
  githubLanguages: Array<Scalars['String']['output']>;
  matched: Scalars['Boolean']['output'];
};

export type SkillsDemandReport = {
  __typename?: 'SkillsDemandReport';
  decliningSkills: Array<SkillDemand>;
  emergingSkills: Array<SkillDemand>;
  period: Scalars['String']['output'];
  query: Scalars['String']['output'];
  topSkills: Array<SkillDemand>;
  totalJobsAnalyzed: Scalars['Int']['output'];
};

export type SourceType =
  | 'BRAVE_SEARCH'
  | 'COMMONCRAWL'
  | 'LIVE_FETCH'
  | 'MANUAL'
  | 'PARTNER';

export type SyncResendResult = {
  __typename?: 'SyncResendResult';
  error: Maybe<Scalars['String']['output']>;
  skippedCount: Scalars['Int']['output'];
  success: Scalars['Boolean']['output'];
  totalCount: Scalars['Int']['output'];
  updatedCount: Scalars['Int']['output'];
};

export type SyncVoyagerJobsInput = {
  /** Company LinkedIn numeric IDs to sync jobs for */
  companyNumericIds: Array<Scalars['String']['input']>;
  /** Create intent_signals for hiring_intent. Default true. */
  createIntentSignals?: InputMaybe<Scalars['Boolean']['input']>;
  /** Link to existing companies by linkedin_url match. Default true. */
  matchCompanies?: InputMaybe<Scalars['Boolean']['input']>;
  /** Only sync remote jobs (workplaceType=2). Default true. */
  remoteOnly?: InputMaybe<Scalars['Boolean']['input']>;
};

/** Result of a syncVoyagerJobs mutation. */
export type SyncVoyagerJobsResult = {
  __typename?: 'SyncVoyagerJobsResult';
  /** Companies matched or newly created */
  companiesMatched: Scalars['Int']['output'];
  errors: Array<Scalars['String']['output']>;
  /** Intent signals created from job discoveries */
  intentSignalsCreated: Scalars['Int']['output'];
  success: Scalars['Boolean']['output'];
  /** Jobs upserted into linkedin_posts */
  upserted: Scalars['Int']['output'];
};

export type ThreadMessage = {
  __typename?: 'ThreadMessage';
  classification: Maybe<Scalars['String']['output']>;
  classificationConfidence: Maybe<Scalars['Float']['output']>;
  direction: Scalars['String']['output'];
  fromEmail: Scalars['String']['output'];
  htmlContent: Maybe<Scalars['String']['output']>;
  id: Scalars['Int']['output'];
  sentAt: Maybe<Scalars['String']['output']>;
  sequenceNumber: Maybe<Scalars['String']['output']>;
  sequenceType: Maybe<Scalars['String']['output']>;
  status: Maybe<Scalars['String']['output']>;
  subject: Scalars['String']['output'];
  textContent: Maybe<Scalars['String']['output']>;
  toEmails: Array<Scalars['String']['output']>;
};

export type TimeToFillEstimate = {
  __typename?: 'TimeToFillEstimate';
  avgDays: Scalars['Float']['output'];
  medianDays: Scalars['Float']['output'];
  p90Days: Scalars['Float']['output'];
  sampleSize: Scalars['Int']['output'];
};

export type TimeToFillIndustry = {
  __typename?: 'TimeToFillIndustry';
  estimate: TimeToFillEstimate;
  industry: Scalars['String']['output'];
};

export type TimeToFillRemoteComparison = {
  __typename?: 'TimeToFillRemoteComparison';
  onsite: TimeToFillEstimate;
  remote: TimeToFillEstimate;
};

export type TimeToFillReport = {
  __typename?: 'TimeToFillReport';
  byIndustry: Array<TimeToFillIndustry>;
  byRemoteVsOnsite: TimeToFillRemoteComparison;
  bySeniority: Array<TimeToFillSeniority>;
  overall: TimeToFillEstimate;
};

export type TimeToFillSeniority = {
  __typename?: 'TimeToFillSeniority';
  estimate: TimeToFillEstimate;
  level: Scalars['String']['output'];
};

export type UnverifyContactsResult = {
  __typename?: 'UnverifyContactsResult';
  count: Scalars['Int']['output'];
  success: Scalars['Boolean']['output'];
};

export type UpdateCampaignInput = {
  addAntiThreadHeader?: InputMaybe<Scalars['Boolean']['input']>;
  addUnsubscribeHeaders?: InputMaybe<Scalars['Boolean']['input']>;
  delayDays?: InputMaybe<Scalars['JSON']['input']>;
  fromEmail?: InputMaybe<Scalars['String']['input']>;
  mode?: InputMaybe<Scalars['String']['input']>;
  name?: InputMaybe<Scalars['String']['input']>;
  recipientEmails?: InputMaybe<Array<Scalars['String']['input']>>;
  replyTo?: InputMaybe<Scalars['String']['input']>;
  sequence?: InputMaybe<Scalars['JSON']['input']>;
  startAt?: InputMaybe<Scalars['String']['input']>;
  status?: InputMaybe<Scalars['String']['input']>;
  totalEmailsPlanned?: InputMaybe<Scalars['Int']['input']>;
  unsubscribeUrl?: InputMaybe<Scalars['String']['input']>;
};

export type UpdateCompanyInput = {
  ai_classification_confidence?: InputMaybe<Scalars['Float']['input']>;
  ai_classification_reason?: InputMaybe<Scalars['String']['input']>;
  ai_tier?: InputMaybe<Scalars['Int']['input']>;
  category?: InputMaybe<CompanyCategory>;
  description?: InputMaybe<Scalars['String']['input']>;
  email?: InputMaybe<Scalars['String']['input']>;
  emails?: InputMaybe<Array<Scalars['String']['input']>>;
  github_url?: InputMaybe<Scalars['String']['input']>;
  industries?: InputMaybe<Array<Scalars['String']['input']>>;
  industry?: InputMaybe<Scalars['String']['input']>;
  job_board_url?: InputMaybe<Scalars['String']['input']>;
  key?: InputMaybe<Scalars['String']['input']>;
  linkedin_url?: InputMaybe<Scalars['String']['input']>;
  location?: InputMaybe<Scalars['String']['input']>;
  logo_url?: InputMaybe<Scalars['String']['input']>;
  name?: InputMaybe<Scalars['String']['input']>;
  score?: InputMaybe<Scalars['Float']['input']>;
  score_reasons?: InputMaybe<Array<Scalars['String']['input']>>;
  service_taxonomy?: InputMaybe<Array<Scalars['String']['input']>>;
  services?: InputMaybe<Array<Scalars['String']['input']>>;
  size?: InputMaybe<Scalars['String']['input']>;
  tags?: InputMaybe<Array<Scalars['String']['input']>>;
  website?: InputMaybe<Scalars['String']['input']>;
};

export type UpdateContactInput = {
  company?: InputMaybe<Scalars['String']['input']>;
  companyId?: InputMaybe<Scalars['Int']['input']>;
  doNotContact?: InputMaybe<Scalars['Boolean']['input']>;
  email?: InputMaybe<Scalars['String']['input']>;
  emails?: InputMaybe<Array<Scalars['String']['input']>>;
  firstName?: InputMaybe<Scalars['String']['input']>;
  githubHandle?: InputMaybe<Scalars['String']['input']>;
  lastName?: InputMaybe<Scalars['String']['input']>;
  linkedinUrl?: InputMaybe<Scalars['String']['input']>;
  position?: InputMaybe<Scalars['String']['input']>;
  tags?: InputMaybe<Array<Scalars['String']['input']>>;
  telegramHandle?: InputMaybe<Scalars['String']['input']>;
};

export type UpdateEmailTemplateInput = {
  category?: InputMaybe<Scalars['String']['input']>;
  description?: InputMaybe<Scalars['String']['input']>;
  htmlContent?: InputMaybe<Scalars['String']['input']>;
  isActive?: InputMaybe<Scalars['Boolean']['input']>;
  name?: InputMaybe<Scalars['String']['input']>;
  subject?: InputMaybe<Scalars['String']['input']>;
  tags?: InputMaybe<Array<Scalars['String']['input']>>;
  textContent?: InputMaybe<Scalars['String']['input']>;
  variables?: InputMaybe<Array<Scalars['String']['input']>>;
};

export type UpdateReminderInput = {
  note?: InputMaybe<Scalars['String']['input']>;
  recurrence?: InputMaybe<Scalars['String']['input']>;
  remindAt?: InputMaybe<Scalars['String']['input']>;
  status?: InputMaybe<Scalars['String']['input']>;
};

export type UpsertLinkedInPostInput = {
  authorName?: InputMaybe<Scalars['String']['input']>;
  authorUrl?: InputMaybe<Scalars['String']['input']>;
  companyId?: InputMaybe<Scalars['Int']['input']>;
  contactId?: InputMaybe<Scalars['Int']['input']>;
  content?: InputMaybe<Scalars['String']['input']>;
  employmentType?: InputMaybe<Scalars['String']['input']>;
  location?: InputMaybe<Scalars['String']['input']>;
  postedAt?: InputMaybe<Scalars['String']['input']>;
  rawData?: InputMaybe<Scalars['JSON']['input']>;
  title?: InputMaybe<Scalars['String']['input']>;
  type: LinkedInPostType;
  url: Scalars['String']['input'];
};

export type UpsertLinkedInPostsResult = {
  __typename?: 'UpsertLinkedInPostsResult';
  errors: Array<Scalars['String']['output']>;
  inserted: Scalars['Int']['output'];
  success: Scalars['Boolean']['output'];
  updated: Scalars['Int']['output'];
};

export type UserSettings = {
  __typename?: 'UserSettings';
  created_at: Scalars['String']['output'];
  daily_digest: Scalars['Boolean']['output'];
  dark_mode: Scalars['Boolean']['output'];
  email_notifications: Scalars['Boolean']['output'];
  excluded_companies: Maybe<Array<Scalars['String']['output']>>;
  id: Scalars['Int']['output'];
  updated_at: Scalars['String']['output'];
  user_id: Scalars['String']['output'];
};

export type UserSettingsInput = {
  daily_digest?: InputMaybe<Scalars['Boolean']['input']>;
  dark_mode?: InputMaybe<Scalars['Boolean']['input']>;
  email_notifications?: InputMaybe<Scalars['Boolean']['input']>;
  excluded_companies?: InputMaybe<Array<Scalars['String']['input']>>;
};

export type VerifyAuthenticityResult = {
  __typename?: 'VerifyAuthenticityResult';
  authenticityScore: Scalars['Float']['output'];
  contactId: Scalars['Int']['output'];
  flags: Array<Scalars['String']['output']>;
  recommendations: Array<Scalars['String']['output']>;
  skillMatch: Maybe<SkillMatchResult>;
  success: Scalars['Boolean']['output'];
  verdict: Scalars['String']['output'];
};

export type VerifyCompanyContactsResult = {
  __typename?: 'VerifyCompanyContactsResult';
  results: Array<VerifyAuthenticityResult>;
  review: Scalars['Int']['output'];
  success: Scalars['Boolean']['output'];
  suspicious: Scalars['Int']['output'];
  totalChecked: Scalars['Int']['output'];
  verified: Scalars['Int']['output'];
};

export type VerifyEmailResult = {
  __typename?: 'VerifyEmailResult';
  flags: Maybe<Array<Scalars['String']['output']>>;
  message: Scalars['String']['output'];
  rawResult: Maybe<Scalars['String']['output']>;
  success: Scalars['Boolean']['output'];
  suggestedCorrection: Maybe<Scalars['String']['output']>;
  verified: Maybe<Scalars['Boolean']['output']>;
};

export type VoyagerAnalyticsDashboard = {
  __typename?: 'VoyagerAnalyticsDashboard';
  arbitrage: ArbitrageReport;
  competitiveAnalysis: CompetitiveReport;
  emergingRoles: EmergingRolesReport;
  generatedAt: Scalars['String']['output'];
  growthReport: GrowthReport;
  hiringVelocity: Array<CompanyVelocity>;
  jobCounts: JobCountTrend;
  query: Scalars['String']['output'];
  repostAnalysis: RepostReport;
  salaryTrends: SalaryTrend;
  skillsDemand: SkillsDemandReport;
  timeToFill: TimeToFillReport;
};

/** Remote job count for a single company (via Voyager jobCards endpoint). */
export type VoyagerCompanyJobCount = {
  __typename?: 'VoyagerCompanyJobCount';
  companyId: Scalars['Int']['output'];
  companyName: Scalars['String']['output'];
  companyNumericId: Scalars['String']['output'];
  fetchedAt: Scalars['String']['output'];
  remoteJobCount: Scalars['Int']['output'];
  /** 'ok' | 'auth_error' | 'rate_limited' | 'error' */
  status: Scalars['String']['output'];
};

/** A single job card returned by the Voyager jobSearch endpoint. */
export type VoyagerJobCard = {
  __typename?: 'VoyagerJobCard';
  /** Company name (denormalized from Voyager) */
  companyName: Maybe<Scalars['String']['output']>;
  /** Company LinkedIn numeric ID (for cross-referencing) */
  companyNumericId: Maybe<Scalars['String']['output']>;
  /** Employment type from Voyager (full-time, contract, etc.) */
  employmentType: Maybe<Scalars['String']['output']>;
  /** If stored locally, the linkedin_posts.id */
  linkedInPostId: Maybe<Scalars['Int']['output']>;
  /** Location string from Voyager */
  location: Maybe<Scalars['String']['output']>;
  /** When posted (ISO timestamp, derived from listedAt epoch) */
  postedAt: Maybe<Scalars['String']['output']>;
  /** Job title from Voyager payload */
  title: Scalars['String']['output'];
  /** LinkedIn canonical URL for this job */
  url: Scalars['String']['output'];
  /** LinkedIn job posting URN (e.g. urn:li:fsd_jobPosting:1234567890) */
  urn: Scalars['String']['output'];
  /** Workplace type: 1=on-site, 2=remote, 3=hybrid */
  workplaceType: Maybe<Scalars['Int']['output']>;
};

export type VoyagerJobSearchInput = {
  /** Company LinkedIn numeric IDs to filter by */
  companyIds?: InputMaybe<Array<Scalars['String']['input']>>;
  /** Geographic region ID (92000000 = Worldwide) */
  geoId?: InputMaybe<Scalars['String']['input']>;
  /** Free-text keyword query */
  keywords?: InputMaybe<Scalars['String']['input']>;
  /** Maximum results to return (capped at 100 server-side) */
  limit?: InputMaybe<Scalars['Int']['input']>;
  /** Pagination offset */
  offset?: InputMaybe<Scalars['Int']['input']>;
  /** Workplace type filter: 1=on-site, 2=remote, 3=hybrid */
  workplaceType?: InputMaybe<Scalars['Int']['input']>;
};

/** Paginated result from a Voyager job search. */
export type VoyagerJobSearchResult = {
  __typename?: 'VoyagerJobSearchResult';
  /** Whether more pages exist beyond the returned window */
  hasMore: Scalars['Boolean']['output'];
  jobs: Array<VoyagerJobCard>;
  totalCount: Scalars['Int']['output'];
};

/** Aggregate remote-work metrics derived from Voyager job data. */
export type VoyagerRemoteMetrics = {
  __typename?: 'VoyagerRemoteMetrics';
  /** Number of companies queried */
  companiesQueried: Scalars['Int']['output'];
  /** Number of companies that have at least 1 remote posting */
  companiesWithRemoteJobs: Scalars['Int']['output'];
  /** When this metrics snapshot was computed */
  computedAt: Scalars['String']['output'];
  /** Top companies by remote job count */
  topCompanies: Array<VoyagerCompanyJobCount>;
  /** Total remote jobs found across queried companies */
  totalRemoteJobs: Scalars['Int']['output'];
};

export type WarcPointer = {
  __typename?: 'WarcPointer';
  digest: Maybe<Scalars['String']['output']>;
  filename: Scalars['String']['output'];
  length: Scalars['Int']['output'];
  offset: Scalars['Int']['output'];
};

export type WarcPointerInput = {
  digest?: InputMaybe<Scalars['String']['input']>;
  filename: Scalars['String']['input'];
  length: Scalars['Int']['input'];
  offset: Scalars['Int']['input'];
};

export type WebhookEvent = {
  __typename?: 'WebhookEvent';
  createdAt: Scalars['String']['output'];
  emailId: Maybe<Scalars['String']['output']>;
  error: Maybe<Scalars['String']['output']>;
  eventType: Scalars['String']['output'];
  fromEmail: Maybe<Scalars['String']['output']>;
  httpStatus: Maybe<Scalars['Int']['output']>;
  id: Scalars['Int']['output'];
  payload: Maybe<Scalars['String']['output']>;
  subject: Maybe<Scalars['String']['output']>;
  toEmails: Maybe<Scalars['String']['output']>;
};

export type WebhookEventsResult = {
  __typename?: 'WebhookEventsResult';
  events: Array<WebhookEvent>;
  totalCount: Scalars['Int']['output'];
};

export type GetUserSettingsQueryVariables = Exact<{
  userId: Scalars['String']['input'];
}>;


export type GetUserSettingsQuery = { __typename?: 'Query', userSettings: { __typename?: 'UserSettings', id: number, excluded_companies: Array<string> | null } | null };

export type UpdateUserSettingsMutationVariables = Exact<{
  userId: Scalars['String']['input'];
  settings: UserSettingsInput;
}>;


export type UpdateUserSettingsMutation = { __typename?: 'Mutation', updateUserSettings: { __typename?: 'UserSettings', id: number, user_id: string, email_notifications: boolean, daily_digest: boolean, excluded_companies: Array<string> | null, dark_mode: boolean, created_at: string, updated_at: string } };

export type AllCompanyTagsQueryVariables = Exact<{ [key: string]: never; }>;


export type AllCompanyTagsQuery = { __typename?: 'Query', allCompanyTags: Array<string> };

export type FindCompanyQueryVariables = Exact<{
  name?: InputMaybe<Scalars['String']['input']>;
  website?: InputMaybe<Scalars['String']['input']>;
  linkedinUrl?: InputMaybe<Scalars['String']['input']>;
}>;


export type FindCompanyQuery = { __typename?: 'Query', findCompany: { __typename?: 'FindCompanyResult', found: boolean, company: { __typename?: 'Company', id: number, key: string, name: string, website: string | null, email: string | null, location: string | null, linkedin_url: string | null } | null } };

export type EvidenceFieldsFragment = { __typename?: 'Evidence', source_type: SourceType, source_url: string, crawl_id: string | null, capture_timestamp: string | null, observed_at: string, method: ExtractMethod, extractor_version: string | null, http_status: number | null, mime: string | null, content_hash: string | null, warc: { __typename?: 'WarcPointer', filename: string, offset: number, length: number, digest: string | null } | null };

export type CompanyFactFieldsFragment = { __typename?: 'CompanyFact', id: number, company_id: number, field: string, value_json: any | null, value_text: string | null, normalized_value: any | null, confidence: number, created_at: string, evidence: { __typename?: 'Evidence', source_type: SourceType, source_url: string, crawl_id: string | null, capture_timestamp: string | null, observed_at: string, method: ExtractMethod, extractor_version: string | null, http_status: number | null, mime: string | null, content_hash: string | null, warc: { __typename?: 'WarcPointer', filename: string, offset: number, length: number, digest: string | null } | null } };

export type CompanySnapshotFieldsFragment = { __typename?: 'CompanySnapshot', id: number, company_id: number, source_url: string, crawl_id: string | null, capture_timestamp: string | null, fetched_at: string, http_status: number | null, mime: string | null, content_hash: string | null, text_sample: string | null, jsonld: any | null, extracted: any | null, created_at: string, evidence: { __typename?: 'Evidence', source_type: SourceType, source_url: string, crawl_id: string | null, capture_timestamp: string | null, observed_at: string, method: ExtractMethod, extractor_version: string | null, http_status: number | null, mime: string | null, content_hash: string | null, warc: { __typename?: 'WarcPointer', filename: string, offset: number, length: number, digest: string | null } | null } };

export type CompanyFieldsFragment = { __typename?: 'Company', id: number, key: string, name: string, logo_url: string | null, website: string | null, description: string | null, industry: string | null, size: string | null, location: string | null, created_at: string, updated_at: string, linkedin_url: string | null, job_board_url: string | null, category: CompanyCategory, tags: Array<string>, services: Array<string>, service_taxonomy: Array<string>, industries: Array<string>, score: number, score_reasons: Array<string>, blocked: boolean, deep_analysis: string | null, last_seen_crawl_id: string | null, last_seen_capture_timestamp: string | null, last_seen_source_url: string | null, opportunities: Array<{ __typename?: 'Opportunity', id: string, title: string, url: string | null, status: string, score: number | null, rewardText: string | null, applied: boolean, appliedAt: string | null, tags: Array<string>, createdAt: string }> };

export type CreateCompanyMutationVariables = Exact<{
  input: CreateCompanyInput;
}>;


export type CreateCompanyMutation = { __typename?: 'Mutation', createCompany: { __typename?: 'Company', id: number, key: string, name: string, logo_url: string | null, website: string | null, description: string | null, industry: string | null, size: string | null, location: string | null, created_at: string, updated_at: string, linkedin_url: string | null, job_board_url: string | null, category: CompanyCategory, tags: Array<string>, services: Array<string>, service_taxonomy: Array<string>, industries: Array<string>, score: number, score_reasons: Array<string>, blocked: boolean, deep_analysis: string | null, last_seen_crawl_id: string | null, last_seen_capture_timestamp: string | null, last_seen_source_url: string | null, opportunities: Array<{ __typename?: 'Opportunity', id: string, title: string, url: string | null, status: string, score: number | null, rewardText: string | null, applied: boolean, appliedAt: string | null, tags: Array<string>, createdAt: string }> } };

export type UpdateCompanyMutationVariables = Exact<{
  id: Scalars['Int']['input'];
  input: UpdateCompanyInput;
}>;


export type UpdateCompanyMutation = { __typename?: 'Mutation', updateCompany: { __typename?: 'Company', id: number, key: string, name: string, logo_url: string | null, website: string | null, description: string | null, industry: string | null, size: string | null, location: string | null, created_at: string, updated_at: string, linkedin_url: string | null, job_board_url: string | null, category: CompanyCategory, tags: Array<string>, services: Array<string>, service_taxonomy: Array<string>, industries: Array<string>, score: number, score_reasons: Array<string>, blocked: boolean, deep_analysis: string | null, last_seen_crawl_id: string | null, last_seen_capture_timestamp: string | null, last_seen_source_url: string | null, opportunities: Array<{ __typename?: 'Opportunity', id: string, title: string, url: string | null, status: string, score: number | null, rewardText: string | null, applied: boolean, appliedAt: string | null, tags: Array<string>, createdAt: string }> } };

export type DeleteCompanyMutationVariables = Exact<{
  id: Scalars['Int']['input'];
}>;


export type DeleteCompanyMutation = { __typename?: 'Mutation', deleteCompany: { __typename?: 'DeleteCompanyResponse', success: boolean, message: string | null } };

export type AddCompanyFactsMutationVariables = Exact<{
  company_id: Scalars['Int']['input'];
  facts: Array<CompanyFactInput> | CompanyFactInput;
}>;


export type AddCompanyFactsMutation = { __typename?: 'Mutation', add_company_facts: Array<{ __typename?: 'CompanyFact', id: number, company_id: number, field: string, value_json: any | null, value_text: string | null, normalized_value: any | null, confidence: number, created_at: string, evidence: { __typename?: 'Evidence', source_type: SourceType, source_url: string, crawl_id: string | null, capture_timestamp: string | null, observed_at: string, method: ExtractMethod, extractor_version: string | null, http_status: number | null, mime: string | null, content_hash: string | null, warc: { __typename?: 'WarcPointer', filename: string, offset: number, length: number, digest: string | null } | null } }> };

export type IngestCompanySnapshotMutationVariables = Exact<{
  company_id: Scalars['Int']['input'];
  source_url: Scalars['String']['input'];
  crawl_id?: InputMaybe<Scalars['String']['input']>;
  capture_timestamp?: InputMaybe<Scalars['String']['input']>;
  fetched_at: Scalars['String']['input'];
  http_status?: InputMaybe<Scalars['Int']['input']>;
  mime?: InputMaybe<Scalars['String']['input']>;
  content_hash?: InputMaybe<Scalars['String']['input']>;
  text_sample?: InputMaybe<Scalars['String']['input']>;
  jsonld?: InputMaybe<Scalars['JSON']['input']>;
  extracted?: InputMaybe<Scalars['JSON']['input']>;
  evidence: EvidenceInput;
}>;


export type IngestCompanySnapshotMutation = { __typename?: 'Mutation', ingest_company_snapshot: { __typename?: 'CompanySnapshot', id: number, company_id: number, source_url: string, crawl_id: string | null, capture_timestamp: string | null, fetched_at: string, http_status: number | null, mime: string | null, content_hash: string | null, text_sample: string | null, jsonld: any | null, extracted: any | null, created_at: string, evidence: { __typename?: 'Evidence', source_type: SourceType, source_url: string, crawl_id: string | null, capture_timestamp: string | null, observed_at: string, method: ExtractMethod, extractor_version: string | null, http_status: number | null, mime: string | null, content_hash: string | null, warc: { __typename?: 'WarcPointer', filename: string, offset: number, length: number, digest: string | null } | null } } };

export type MergeDuplicateCompaniesMutationVariables = Exact<{
  companyIds: Array<Scalars['Int']['input']> | Scalars['Int']['input'];
}>;


export type MergeDuplicateCompaniesMutation = { __typename?: 'Mutation', mergeDuplicateCompanies: { __typename?: 'MergeCompaniesResult', success: boolean, message: string, keptCompanyId: number | null, merged: number } };

export type DeleteCompaniesMutationVariables = Exact<{
  companyIds: Array<Scalars['Int']['input']> | Scalars['Int']['input'];
}>;


export type DeleteCompaniesMutation = { __typename?: 'Mutation', deleteCompanies: { __typename?: 'DeleteCompaniesResult', success: boolean, message: string, deleted: number } };

export type ImportCompanyWithContactsMutationVariables = Exact<{
  input: ImportCompanyWithContactsInput;
}>;


export type ImportCompanyWithContactsMutation = { __typename?: 'Mutation', importCompanyWithContacts: { __typename?: 'ImportCompanyResult', success: boolean, contactsImported: number, contactsSkipped: number, errors: Array<string>, company: { __typename?: 'Company', id: number, key: string, name: string } | null } };

export type EnhanceCompanyMutationVariables = Exact<{
  id?: InputMaybe<Scalars['Int']['input']>;
  key?: InputMaybe<Scalars['String']['input']>;
}>;


export type EnhanceCompanyMutation = { __typename?: 'Mutation', enhanceCompany: { __typename?: 'EnhanceCompanyResponse', success: boolean, message: string | null, companyId: number | null, companyKey: string | null } };

export type AnalyzeCompanyMutationVariables = Exact<{
  id?: InputMaybe<Scalars['Int']['input']>;
  key?: InputMaybe<Scalars['String']['input']>;
}>;


export type AnalyzeCompanyMutation = { __typename?: 'Mutation', analyzeCompany: { __typename?: 'AnalyzeCompanyResponse', success: boolean, message: string | null, companyId: number | null, companyKey: string | null } };

export type ImportCompaniesMutationVariables = Exact<{
  companies: Array<CompanyImportInput> | CompanyImportInput;
}>;


export type ImportCompaniesMutation = { __typename?: 'Mutation', importCompanies: { __typename?: 'ImportCompaniesResult', success: boolean, imported: number, failed: number, errors: Array<string> } };

export type BlockCompanyMutationVariables = Exact<{
  id: Scalars['Int']['input'];
}>;


export type BlockCompanyMutation = { __typename?: 'Mutation', blockCompany: { __typename?: 'Company', id: number, key: string, blocked: boolean } };

export type UnblockCompanyMutationVariables = Exact<{
  id: Scalars['Int']['input'];
}>;


export type UnblockCompanyMutation = { __typename?: 'Mutation', unblockCompany: { __typename?: 'Company', id: number, key: string, blocked: boolean } };

export type GetCompanyQueryVariables = Exact<{
  id?: InputMaybe<Scalars['Int']['input']>;
  key?: InputMaybe<Scalars['String']['input']>;
}>;


export type GetCompanyQuery = { __typename?: 'Query', company: { __typename?: 'Company', id: number, key: string, name: string, logo_url: string | null, website: string | null, description: string | null, industry: string | null, size: string | null, location: string | null, created_at: string, updated_at: string, linkedin_url: string | null, job_board_url: string | null, category: CompanyCategory, tags: Array<string>, services: Array<string>, service_taxonomy: Array<string>, industries: Array<string>, score: number, score_reasons: Array<string>, blocked: boolean, deep_analysis: string | null, last_seen_crawl_id: string | null, last_seen_capture_timestamp: string | null, last_seen_source_url: string | null, opportunities: Array<{ __typename?: 'Opportunity', id: string, title: string, url: string | null, status: string, score: number | null, rewardText: string | null, applied: boolean, appliedAt: string | null, tags: Array<string>, createdAt: string }> } | null };

export type GetCompaniesQueryVariables = Exact<{
  text?: InputMaybe<Scalars['String']['input']>;
  order_by?: InputMaybe<CompanyOrderBy>;
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
}>;


export type GetCompaniesQuery = { __typename?: 'Query', companies: { __typename?: 'CompaniesResponse', totalCount: number, companies: Array<{ __typename?: 'Company', id: number, key: string, name: string, logo_url: string | null, website: string | null, description: string | null, industry: string | null, size: string | null, location: string | null, created_at: string, updated_at: string, linkedin_url: string | null, job_board_url: string | null, category: CompanyCategory, tags: Array<string>, services: Array<string>, service_taxonomy: Array<string>, industries: Array<string>, score: number, score_reasons: Array<string>, blocked: boolean, deep_analysis: string | null, last_seen_crawl_id: string | null, last_seen_capture_timestamp: string | null, last_seen_source_url: string | null, opportunities: Array<{ __typename?: 'Opportunity', id: string, title: string, url: string | null, status: string, score: number | null, rewardText: string | null, applied: boolean, appliedAt: string | null, tags: Array<string>, createdAt: string }> }> } };

export type SearchCompaniesQueryVariables = Exact<{
  filter: CompanyFilterInput;
  order_by?: InputMaybe<CompanyOrderBy>;
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
}>;


export type SearchCompaniesQuery = { __typename?: 'Query', companies: { __typename?: 'CompaniesResponse', totalCount: number, companies: Array<{ __typename?: 'Company', id: number, key: string, name: string, logo_url: string | null, website: string | null, description: string | null, industry: string | null, size: string | null, location: string | null, created_at: string, updated_at: string, linkedin_url: string | null, job_board_url: string | null, category: CompanyCategory, tags: Array<string>, services: Array<string>, service_taxonomy: Array<string>, industries: Array<string>, score: number, score_reasons: Array<string>, blocked: boolean, deep_analysis: string | null, last_seen_crawl_id: string | null, last_seen_capture_timestamp: string | null, last_seen_source_url: string | null, opportunities: Array<{ __typename?: 'Opportunity', id: string, title: string, url: string | null, status: string, score: number | null, rewardText: string | null, applied: boolean, appliedAt: string | null, tags: Array<string>, createdAt: string }> }> } };

export type GetCompanyFactsQueryVariables = Exact<{
  company_id: Scalars['Int']['input'];
  field?: InputMaybe<Scalars['String']['input']>;
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
}>;


export type GetCompanyFactsQuery = { __typename?: 'Query', company_facts: Array<{ __typename?: 'CompanyFact', id: number, company_id: number, field: string, value_json: any | null, value_text: string | null, normalized_value: any | null, confidence: number, created_at: string, evidence: { __typename?: 'Evidence', source_type: SourceType, source_url: string, crawl_id: string | null, capture_timestamp: string | null, observed_at: string, method: ExtractMethod, extractor_version: string | null, http_status: number | null, mime: string | null, content_hash: string | null, warc: { __typename?: 'WarcPointer', filename: string, offset: number, length: number, digest: string | null } | null } }> };

export type CompanyAuditQueryVariables = Exact<{
  key: Scalars['String']['input'];
}>;


export type CompanyAuditQuery = { __typename?: 'Query', company: { __typename?: 'Company', facts_count: number, snapshots_count: number, id: number, key: string, name: string, logo_url: string | null, website: string | null, description: string | null, industry: string | null, size: string | null, location: string | null, created_at: string, updated_at: string, linkedin_url: string | null, job_board_url: string | null, category: CompanyCategory, tags: Array<string>, services: Array<string>, service_taxonomy: Array<string>, industries: Array<string>, score: number, score_reasons: Array<string>, blocked: boolean, deep_analysis: string | null, last_seen_crawl_id: string | null, last_seen_capture_timestamp: string | null, last_seen_source_url: string | null, facts: Array<{ __typename?: 'CompanyFact', id: number, company_id: number, field: string, value_json: any | null, value_text: string | null, normalized_value: any | null, confidence: number, created_at: string, evidence: { __typename?: 'Evidence', source_type: SourceType, source_url: string, crawl_id: string | null, capture_timestamp: string | null, observed_at: string, method: ExtractMethod, extractor_version: string | null, http_status: number | null, mime: string | null, content_hash: string | null, warc: { __typename?: 'WarcPointer', filename: string, offset: number, length: number, digest: string | null } | null } }>, snapshots: Array<{ __typename?: 'CompanySnapshot', id: number, company_id: number, source_url: string, crawl_id: string | null, capture_timestamp: string | null, fetched_at: string, http_status: number | null, mime: string | null, content_hash: string | null, text_sample: string | null, jsonld: any | null, extracted: any | null, created_at: string, evidence: { __typename?: 'Evidence', source_type: SourceType, source_url: string, crawl_id: string | null, capture_timestamp: string | null, observed_at: string, method: ExtractMethod, extractor_version: string | null, http_status: number | null, mime: string | null, content_hash: string | null, warc: { __typename?: 'WarcPointer', filename: string, offset: number, length: number, digest: string | null } | null } }>, opportunities: Array<{ __typename?: 'Opportunity', id: string, title: string, url: string | null, status: string, score: number | null, rewardText: string | null, applied: boolean, appliedAt: string | null, tags: Array<string>, createdAt: string }> } | null };

export type PricingTierCoreFragment = { __typename?: 'PricingTier', id: number, tierName: string, monthlyPriceUsd: number | null, annualPriceUsd: number | null, seatPriceUsd: number | null, currency: string, includedLimits: any | null, isCustomQuote: boolean, sortOrder: number };

export type CompetitorFeatureCoreFragment = { __typename?: 'CompetitorFeature', id: number, tierName: string | null, featureText: string, category: string | null };

export type CompetitorIntegrationCoreFragment = { __typename?: 'CompetitorIntegration', id: number, integrationName: string, integrationUrl: string | null, category: string | null };

export type CompetitorCoreFragment = { __typename?: 'Competitor', id: number, analysisId: number, name: string, url: string, domain: string | null, logoUrl: string | null, description: string | null, positioningHeadline: string | null, positioningTagline: string | null, targetAudience: string | null, status: CompetitorStatus, scrapedAt: string | null, scrapeError: string | null, createdAt: string };

export type CompetitorFullFragment = { __typename?: 'Competitor', id: number, analysisId: number, name: string, url: string, domain: string | null, logoUrl: string | null, description: string | null, positioningHeadline: string | null, positioningTagline: string | null, targetAudience: string | null, status: CompetitorStatus, scrapedAt: string | null, scrapeError: string | null, createdAt: string, pricingTiers: Array<{ __typename?: 'PricingTier', id: number, tierName: string, monthlyPriceUsd: number | null, annualPriceUsd: number | null, seatPriceUsd: number | null, currency: string, includedLimits: any | null, isCustomQuote: boolean, sortOrder: number }>, features: Array<{ __typename?: 'CompetitorFeature', id: number, tierName: string | null, featureText: string, category: string | null }>, integrations: Array<{ __typename?: 'CompetitorIntegration', id: number, integrationName: string, integrationUrl: string | null, category: string | null }> };

export type CompetitorAnalysisCoreFragment = { __typename?: 'CompetitorAnalysis', id: number, status: CompetitorAnalysisStatus, createdBy: string | null, error: string | null, createdAt: string, updatedAt: string, product: { __typename?: 'Product', id: number, slug: string, name: string, url: string, domain: string | null, description: string | null, highlights: any | null, icpAnalysis: any | null, icpAnalyzedAt: string | null, pricingAnalysis: any | null, pricingAnalyzedAt: string | null, gtmAnalysis: any | null, gtmAnalyzedAt: string | null, intelReport: any | null, intelReportAt: string | null, createdBy: string | null, createdAt: string, updatedAt: string } };

export type CompetitorAnalysesQueryVariables = Exact<{ [key: string]: never; }>;


export type CompetitorAnalysesQuery = { __typename?: 'Query', competitorAnalyses: Array<{ __typename?: 'CompetitorAnalysis', id: number, status: CompetitorAnalysisStatus, createdBy: string | null, error: string | null, createdAt: string, updatedAt: string, competitors: Array<{ __typename?: 'Competitor', id: number, name: string, status: CompetitorStatus }>, product: { __typename?: 'Product', id: number, slug: string, name: string, url: string, domain: string | null, description: string | null, highlights: any | null, icpAnalysis: any | null, icpAnalyzedAt: string | null, pricingAnalysis: any | null, pricingAnalyzedAt: string | null, gtmAnalysis: any | null, gtmAnalyzedAt: string | null, intelReport: any | null, intelReportAt: string | null, createdBy: string | null, createdAt: string, updatedAt: string } }> };

export type CompetitorAnalysisQueryVariables = Exact<{
  id: Scalars['Int']['input'];
}>;


export type CompetitorAnalysisQuery = { __typename?: 'Query', competitorAnalysis: { __typename?: 'CompetitorAnalysis', id: number, status: CompetitorAnalysisStatus, createdBy: string | null, error: string | null, createdAt: string, updatedAt: string, competitors: Array<{ __typename?: 'Competitor', id: number, analysisId: number, name: string, url: string, domain: string | null, logoUrl: string | null, description: string | null, positioningHeadline: string | null, positioningTagline: string | null, targetAudience: string | null, status: CompetitorStatus, scrapedAt: string | null, scrapeError: string | null, createdAt: string, pricingTiers: Array<{ __typename?: 'PricingTier', id: number, tierName: string, monthlyPriceUsd: number | null, annualPriceUsd: number | null, seatPriceUsd: number | null, currency: string, includedLimits: any | null, isCustomQuote: boolean, sortOrder: number }>, features: Array<{ __typename?: 'CompetitorFeature', id: number, tierName: string | null, featureText: string, category: string | null }>, integrations: Array<{ __typename?: 'CompetitorIntegration', id: number, integrationName: string, integrationUrl: string | null, category: string | null }> }>, product: { __typename?: 'Product', id: number, slug: string, name: string, url: string, domain: string | null, description: string | null, highlights: any | null, icpAnalysis: any | null, icpAnalyzedAt: string | null, pricingAnalysis: any | null, pricingAnalyzedAt: string | null, gtmAnalysis: any | null, gtmAnalyzedAt: string | null, intelReport: any | null, intelReportAt: string | null, createdBy: string | null, createdAt: string, updatedAt: string } } | null };

export type CreateCompetitorAnalysisMutationVariables = Exact<{
  productId: Scalars['Int']['input'];
}>;


export type CreateCompetitorAnalysisMutation = { __typename?: 'Mutation', createCompetitorAnalysis: { __typename?: 'CompetitorAnalysis', id: number, status: CompetitorAnalysisStatus, createdBy: string | null, error: string | null, createdAt: string, updatedAt: string, competitors: Array<{ __typename?: 'Competitor', id: number, analysisId: number, name: string, url: string, domain: string | null, logoUrl: string | null, description: string | null, positioningHeadline: string | null, positioningTagline: string | null, targetAudience: string | null, status: CompetitorStatus, scrapedAt: string | null, scrapeError: string | null, createdAt: string }>, product: { __typename?: 'Product', id: number, slug: string, name: string, url: string, domain: string | null, description: string | null, highlights: any | null, icpAnalysis: any | null, icpAnalyzedAt: string | null, pricingAnalysis: any | null, pricingAnalyzedAt: string | null, gtmAnalysis: any | null, gtmAnalyzedAt: string | null, intelReport: any | null, intelReportAt: string | null, createdBy: string | null, createdAt: string, updatedAt: string } } };

export type ApproveCompetitorsMutationVariables = Exact<{
  analysisId: Scalars['Int']['input'];
  competitors: Array<CompetitorInput> | CompetitorInput;
}>;


export type ApproveCompetitorsMutation = { __typename?: 'Mutation', approveCompetitors: { __typename?: 'CompetitorAnalysis', id: number, status: CompetitorAnalysisStatus, createdBy: string | null, error: string | null, createdAt: string, updatedAt: string, competitors: Array<{ __typename?: 'Competitor', id: number, analysisId: number, name: string, url: string, domain: string | null, logoUrl: string | null, description: string | null, positioningHeadline: string | null, positioningTagline: string | null, targetAudience: string | null, status: CompetitorStatus, scrapedAt: string | null, scrapeError: string | null, createdAt: string }>, product: { __typename?: 'Product', id: number, slug: string, name: string, url: string, domain: string | null, description: string | null, highlights: any | null, icpAnalysis: any | null, icpAnalyzedAt: string | null, pricingAnalysis: any | null, pricingAnalyzedAt: string | null, gtmAnalysis: any | null, gtmAnalyzedAt: string | null, intelReport: any | null, intelReportAt: string | null, createdBy: string | null, createdAt: string, updatedAt: string } } };

export type RescrapeCompetitorMutationVariables = Exact<{
  competitorId: Scalars['Int']['input'];
}>;


export type RescrapeCompetitorMutation = { __typename?: 'Mutation', rescrapeCompetitor: { __typename?: 'Competitor', id: number, analysisId: number, name: string, url: string, domain: string | null, logoUrl: string | null, description: string | null, positioningHeadline: string | null, positioningTagline: string | null, targetAudience: string | null, status: CompetitorStatus, scrapedAt: string | null, scrapeError: string | null, createdAt: string, pricingTiers: Array<{ __typename?: 'PricingTier', id: number, tierName: string, monthlyPriceUsd: number | null, annualPriceUsd: number | null, seatPriceUsd: number | null, currency: string, includedLimits: any | null, isCustomQuote: boolean, sortOrder: number }>, features: Array<{ __typename?: 'CompetitorFeature', id: number, tierName: string | null, featureText: string, category: string | null }>, integrations: Array<{ __typename?: 'CompetitorIntegration', id: number, integrationName: string, integrationUrl: string | null, category: string | null }> } };

export type DeleteCompetitorAnalysisMutationVariables = Exact<{
  id: Scalars['Int']['input'];
}>;


export type DeleteCompetitorAnalysisMutation = { __typename?: 'Mutation', deleteCompetitorAnalysis: boolean };

export type GetContactQueryVariables = Exact<{
  id?: InputMaybe<Scalars['Int']['input']>;
  slug?: InputMaybe<Scalars['String']['input']>;
}>;


export type GetContactQuery = { __typename?: 'Query', contact: { __typename?: 'Contact', id: number, slug: string | null, firstName: string, lastName: string, email: string | null, emails: Array<string>, bouncedEmails: Array<string>, linkedinUrl: string | null, company: string | null, companyId: number | null, position: string | null, emailVerified: boolean | null, doNotContact: boolean, githubHandle: string | null, telegramHandle: string | null, tags: Array<string>, notes: string | null, forwardingAlias: string | null, forwardingAliasRuleId: string | null, nbStatus: string | null, nbResult: string | null, nbFlags: Array<string>, nbSuggestedCorrection: string | null, createdAt: string, updatedAt: string, aiProfile: { __typename?: 'ContactAIProfile', trigger: string, enrichedAt: string, linkedinHeadline: string | null, linkedinBio: string | null, specialization: string | null, skills: Array<string>, researchAreas: Array<string>, experienceLevel: string, synthesisConfidence: number, synthesisRationale: string | null, githubBio: string | null, githubTopLanguages: Array<string>, githubTotalStars: number, githubAiRepos: Array<{ __typename?: 'ContactAIGitHubRepo', name: string, description: string | null, stars: number, topics: Array<string> }>, workExperience: Array<{ __typename?: 'ContactWorkExperience', company: string, companyLogo: string | null, title: string, employmentType: string | null, startDate: string, endDate: string | null, duration: string | null, location: string | null, description: string | null, skills: Array<string> }> } | null } | null };

export type UpdateContactMutationVariables = Exact<{
  id: Scalars['Int']['input'];
  input: UpdateContactInput;
}>;


export type UpdateContactMutation = { __typename?: 'Mutation', updateContact: { __typename?: 'Contact', id: number, firstName: string, lastName: string, email: string | null, emails: Array<string>, linkedinUrl: string | null, position: string | null, githubHandle: string | null, telegramHandle: string | null, doNotContact: boolean, tags: Array<string>, emailVerified: boolean | null, updatedAt: string } };

export type DeleteContactMutationVariables = Exact<{
  id: Scalars['Int']['input'];
}>;


export type DeleteContactMutation = { __typename?: 'Mutation', deleteContact: { __typename?: 'DeleteContactResult', success: boolean, message: string } };

export type GetResendEmailQueryVariables = Exact<{
  resendId: Scalars['String']['input'];
}>;


export type GetResendEmailQuery = { __typename?: 'Query', resendEmail: { __typename?: 'ResendEmailDetail', id: string, from: string, to: Array<string>, subject: string | null, text: string | null, html: string | null, lastEvent: string | null, createdAt: string, scheduledAt: string | null, cc: Array<string> | null, bcc: Array<string> | null } | null };

export type GetContactMessagesQueryVariables = Exact<{
  contactId: Scalars['Int']['input'];
}>;


export type GetContactMessagesQuery = { __typename?: 'Query', contactMessages: Array<{ __typename?: 'ContactMessage', id: number, channel: string, direction: string, contactId: number | null, senderName: string | null, senderProfileUrl: string | null, content: string | null, subject: string | null, sentAt: string, classification: string | null, createdAt: string }> };

export type GetContactOpportunitiesQueryVariables = Exact<{
  contactId: Scalars['Int']['input'];
}>;


export type GetContactOpportunitiesQuery = { __typename?: 'Query', contactOpportunities: Array<{ __typename?: 'Opportunity', id: string, title: string, url: string | null, source: string | null, status: string, rewardText: string | null, rewardUsd: number | null, score: number | null, tags: Array<string>, applied: boolean, appliedAt: string | null, applicationStatus: string | null, companyName: string | null, createdAt: string }> };

export type GetContactEmailsQueryVariables = Exact<{
  contactId: Scalars['Int']['input'];
}>;


export type GetContactEmailsQuery = { __typename?: 'Query', contactEmails: Array<{ __typename?: 'ContactEmail', id: number, resendId: string, fromEmail: string, toEmails: Array<string>, subject: string, textContent: string | null, status: string, sentAt: string | null, recipientName: string | null, replyReceived: boolean, createdAt: string, updatedAt: string }>, contactReceivedEmails: Array<{ __typename?: 'ReceivedEmail', id: number, fromEmail: string | null, subject: string | null, textContent: string | null, classification: string | null, classificationConfidence: number | null, receivedAt: string, createdAt: string }> };

export type GetCompanyContactEmailsQueryVariables = Exact<{
  companyId: Scalars['Int']['input'];
}>;


export type GetCompanyContactEmailsQuery = { __typename?: 'Query', companyContactEmails: Array<{ __typename?: 'CompanyContactEmail', id: number, contactId: number, resendId: string, fromEmail: string, toEmails: Array<string>, subject: string, textContent: string | null, status: string, sentAt: string | null, scheduledAt: string | null, recipientName: string | null, createdAt: string, updatedAt: string, contactFirstName: string, contactLastName: string, contactPosition: string | null, sequenceType: string | null, sequenceNumber: string | null, replyReceived: boolean, followupStatus: string | null }> };

export type SyncResendEmailsMutationVariables = Exact<{
  companyId?: InputMaybe<Scalars['Int']['input']>;
}>;


export type SyncResendEmailsMutation = { __typename?: 'Mutation', syncResendEmails: { __typename?: 'SyncResendResult', success: boolean, updatedCount: number, skippedCount: number, totalCount: number, error: string | null } };

export type ImportResendEmailsMutationVariables = Exact<{
  maxEmails?: InputMaybe<Scalars['Int']['input']>;
}>;


export type ImportResendEmailsMutation = { __typename?: 'Mutation', importResendEmails: { __typename?: 'ImportResendResult', success: boolean, totalFetched: number, newCount: number, updatedCount: number, skippedCount: number, errorCount: number, contactMatchCount: number, companyMatchCount: number, durationMs: number, error: string | null } };

export type CancelCompanyEmailsMutationVariables = Exact<{
  companyId: Scalars['Int']['input'];
}>;


export type CancelCompanyEmailsMutation = { __typename?: 'Mutation', cancelCompanyEmails: { __typename?: 'CancelCompanyEmailsResult', success: boolean, message: string, cancelledCount: number, failedCount: number } };

export type SendScheduledEmailNowMutationVariables = Exact<{
  resendId: Scalars['String']['input'];
}>;


export type SendScheduledEmailNowMutation = { __typename?: 'Mutation', sendScheduledEmailNow: { __typename?: 'SendNowResult', success: boolean, resendId: string | null, error: string | null } };

export type CancelScheduledEmailMutationVariables = Exact<{
  resendId: Scalars['String']['input'];
}>;


export type CancelScheduledEmailMutation = { __typename?: 'Mutation', cancelScheduledEmail: { __typename?: 'CancelEmailResult', success: boolean, error: string | null } };

export type GetContactsQueryVariables = Exact<{
  companyId?: InputMaybe<Scalars['Int']['input']>;
  search?: InputMaybe<Scalars['String']['input']>;
  tag?: InputMaybe<Scalars['String']['input']>;
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
}>;


export type GetContactsQuery = { __typename?: 'Query', contacts: { __typename?: 'ContactsResult', totalCount: number, contacts: Array<{ __typename?: 'Contact', id: number, slug: string | null, firstName: string, lastName: string, email: string | null, bouncedEmails: Array<string>, linkedinUrl: string | null, position: string | null, company: string | null, companyId: number | null, githubHandle: string | null, telegramHandle: string | null, emailVerified: boolean | null, doNotContact: boolean, nbResult: string | null, tags: Array<string>, notes: string | null, createdAt: string, seniority: string | null, department: string | null, isDecisionMaker: boolean | null, authorityScore: number | null, nextTouchScore: number | null, lastContactedAt: string | null }> } };

export type ImportContactsMutationVariables = Exact<{
  contacts: Array<ContactInput> | ContactInput;
}>;


export type ImportContactsMutation = { __typename?: 'Mutation', importContacts: { __typename?: 'ImportContactsResult', success: boolean, imported: number, failed: number, errors: Array<string> } };

export type FindContactEmailMutationVariables = Exact<{
  contactId: Scalars['Int']['input'];
}>;


export type FindContactEmailMutation = { __typename?: 'Mutation', findContactEmail: { __typename?: 'FindContactEmailResult', success: boolean, emailFound: boolean, email: string | null, verified: boolean | null, message: string, candidatesTried: number } };

export type FindCompanyEmailsMutationVariables = Exact<{
  companyId: Scalars['Int']['input'];
}>;


export type FindCompanyEmailsMutation = { __typename?: 'Mutation', findCompanyEmails: { __typename?: 'EnhanceAllContactsResult', success: boolean, message: string, companiesProcessed: number, totalContactsProcessed: number, totalEmailsFound: number, errors: Array<string> } };

export type EnhanceAllContactsMutationVariables = Exact<{ [key: string]: never; }>;


export type EnhanceAllContactsMutation = { __typename?: 'Mutation', enhanceAllContacts: { __typename?: 'EnhanceAllContactsResult', success: boolean, message: string, companiesProcessed: number, totalContactsProcessed: number, totalEmailsFound: number, errors: Array<string> } };

export type ApplyEmailPatternMutationVariables = Exact<{
  companyId: Scalars['Int']['input'];
}>;


export type ApplyEmailPatternMutation = { __typename?: 'Mutation', applyEmailPattern: { __typename?: 'ApplyEmailPatternResult', success: boolean, message: string, contactsUpdated: number, pattern: string | null, contacts: Array<{ __typename?: 'Contact', id: number, email: string | null, emailVerified: boolean | null }> } };

export type UnverifyCompanyContactsMutationVariables = Exact<{
  companyId: Scalars['Int']['input'];
}>;


export type UnverifyCompanyContactsMutation = { __typename?: 'Mutation', unverifyCompanyContacts: { __typename?: 'UnverifyContactsResult', success: boolean, count: number } };

export type CreateContactMutationVariables = Exact<{
  input: CreateContactInput;
}>;


export type CreateContactMutation = { __typename?: 'Mutation', createContact: { __typename?: 'Contact', id: number, slug: string | null, firstName: string, lastName: string, email: string | null, linkedinUrl: string | null, position: string | null, companyId: number | null, githubHandle: string | null, telegramHandle: string | null, tags: Array<string> } };

export type MergeDuplicateContactsMutationVariables = Exact<{
  companyId: Scalars['Int']['input'];
}>;


export type MergeDuplicateContactsMutation = { __typename?: 'Mutation', mergeDuplicateContacts: { __typename?: 'MergeDuplicateContactsResult', success: boolean, message: string, mergedCount: number, removedCount: number } };

export type MarkContactEmailVerifiedMutationVariables = Exact<{
  contactId: Scalars['Int']['input'];
  verified: Scalars['Boolean']['input'];
}>;


export type MarkContactEmailVerifiedMutation = { __typename?: 'Mutation', markContactEmailVerified: { __typename?: 'Contact', id: number, email: string | null, emailVerified: boolean | null } };

export type VerifyContactEmailMutationVariables = Exact<{
  contactId: Scalars['Int']['input'];
}>;


export type VerifyContactEmailMutation = { __typename?: 'Mutation', verifyContactEmail: { __typename?: 'VerifyEmailResult', success: boolean, verified: boolean | null, rawResult: string | null, flags: Array<string> | null, suggestedCorrection: string | null, message: string } };

export type GetEmailCampaignsQueryVariables = Exact<{
  status?: InputMaybe<Scalars['String']['input']>;
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
}>;


export type GetEmailCampaignsQuery = { __typename?: 'Query', emailCampaigns: { __typename?: 'EmailCampaignsResult', totalCount: number, campaigns: Array<{ __typename?: 'EmailCampaign', id: string, companyId: number | null, name: string, status: string, mode: string | null, fromEmail: string | null, totalRecipients: number, emailsSent: number, emailsScheduled: number, emailsFailed: number, createdAt: string, updatedAt: string }> } };

export type GetEmailCampaignQueryVariables = Exact<{
  id: Scalars['String']['input'];
}>;


export type GetEmailCampaignQuery = { __typename?: 'Query', emailCampaign: { __typename?: 'EmailCampaign', id: string, companyId: number | null, name: string, status: string, sequence: any | null, delayDays: any | null, startAt: string | null, mode: string | null, fromEmail: string | null, replyTo: string | null, totalRecipients: number, emailsSent: number, emailsScheduled: number, emailsFailed: number, recipientEmails: Array<string>, createdAt: string, updatedAt: string } | null };

export type CreateDraftCampaignMutationVariables = Exact<{
  input: CreateCampaignInput;
}>;


export type CreateDraftCampaignMutation = { __typename?: 'Mutation', createDraftCampaign: { __typename?: 'EmailCampaign', id: string, name: string, status: string, createdAt: string } };

export type UpdateCampaignMutationVariables = Exact<{
  id: Scalars['String']['input'];
  input: UpdateCampaignInput;
}>;


export type UpdateCampaignMutation = { __typename?: 'Mutation', updateCampaign: { __typename?: 'EmailCampaign', id: string, name: string, status: string, updatedAt: string } };

export type DeleteCampaignMutationVariables = Exact<{
  id: Scalars['String']['input'];
}>;


export type DeleteCampaignMutation = { __typename?: 'Mutation', deleteCampaign: { __typename?: 'DeleteCampaignResult', success: boolean, message: string | null } };

export type LaunchEmailCampaignMutationVariables = Exact<{
  id: Scalars['String']['input'];
}>;


export type LaunchEmailCampaignMutation = { __typename?: 'Mutation', launchEmailCampaign: { __typename?: 'EmailCampaign', id: string, name: string, status: string, emailsSent: number, emailsScheduled: number, emailsFailed: number, updatedAt: string } };

export type SendEmailMutationVariables = Exact<{
  input: SendEmailInput;
}>;


export type SendEmailMutation = { __typename?: 'Mutation', sendEmail: { __typename?: 'SendEmailResult', success: boolean, id: string | null, error: string | null } };

export type GenerateEmailMutationVariables = Exact<{
  input: GenerateEmailInput;
}>;


export type GenerateEmailMutation = { __typename?: 'Mutation', generateEmail: { __typename?: 'GenerateEmailResult', subject: string, html: string, text: string } };

export type GenerateReplyMutationVariables = Exact<{
  input: GenerateReplyInput;
}>;


export type GenerateReplyMutation = { __typename?: 'Mutation', generateReply: { __typename?: 'GenerateReplyResult', subject: string, body: string } };

export type GetEmailStatsQueryVariables = Exact<{ [key: string]: never; }>;


export type GetEmailStatsQuery = { __typename?: 'Query', emailStats: { __typename?: 'EmailStats', sentToday: number, sentThisWeek: number, sentThisMonth: number, scheduledToday: number, scheduledFuture: number, totalSent: number, deliveredToday: number, deliveredThisWeek: number, deliveredThisMonth: number, bouncedToday: number, bouncedThisWeek: number, bouncedThisMonth: number, openedToday: number, openedThisWeek: number, openedThisMonth: number } };

export type GetReceivedEmailsQueryVariables = Exact<{
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
  archived?: InputMaybe<Scalars['Boolean']['input']>;
  classification?: InputMaybe<Scalars['String']['input']>;
}>;


export type GetReceivedEmailsQuery = { __typename?: 'Query', receivedEmails: { __typename?: 'ReceivedEmailsResult', totalCount: number, emails: Array<{ __typename?: 'ReceivedEmail', id: number, resendId: string | null, fromEmail: string | null, toEmails: Array<string>, subject: string | null, receivedAt: string, archivedAt: string | null, classification: string | null, classificationConfidence: number | null, matchedContactId: number | null, textContent: string | null, htmlContent: string | null, createdAt: string }> } };

export type GetReceivedEmailQueryVariables = Exact<{
  id: Scalars['Int']['input'];
}>;


export type GetReceivedEmailQuery = { __typename?: 'Query', receivedEmail: { __typename?: 'ReceivedEmail', id: number, resendId: string | null, fromEmail: string | null, toEmails: Array<string>, ccEmails: Array<string>, replyToEmails: Array<string>, subject: string | null, messageId: string | null, htmlContent: string | null, textContent: string | null, attachments: any | null, receivedAt: string, archivedAt: string | null, classification: string | null, classificationConfidence: number | null, classifiedAt: string | null, matchedContactId: number | null, matchedOutboundId: number | null, createdAt: string, updatedAt: string, matchedContact: { __typename?: 'Contact', id: number, firstName: string, lastName: string, forwardingAlias: string | null } | null, sentReplies: Array<{ __typename?: 'SentReply', id: number, resendId: string | null, fromEmail: string, toEmails: Array<string>, subject: string, textContent: string | null, status: string, sentAt: string | null, createdAt: string }> } | null };

export type ArchiveEmailMutationVariables = Exact<{
  id: Scalars['Int']['input'];
}>;


export type ArchiveEmailMutation = { __typename?: 'Mutation', archiveEmail: { __typename?: 'ArchiveEmailResult', success: boolean, message: string } };

export type UnarchiveEmailMutationVariables = Exact<{
  id: Scalars['Int']['input'];
}>;


export type UnarchiveEmailMutation = { __typename?: 'Mutation', unarchiveEmail: { __typename?: 'ArchiveEmailResult', success: boolean, message: string } };

export type PreviewEmailMutationVariables = Exact<{
  input: PreviewEmailInput;
}>;


export type PreviewEmailMutation = { __typename?: 'Mutation', previewEmail: { __typename?: 'EmailPreview', htmlContent: string, subject: string, drySendResult: string | null } };

export type SendOutreachEmailMutationVariables = Exact<{
  input: SendOutreachEmailInput;
}>;


export type SendOutreachEmailMutation = { __typename?: 'Mutation', sendOutreachEmail: { __typename?: 'SendOutreachEmailResult', success: boolean, emailId: string | null, subject: string | null, error: string | null } };

export type GetEmailsNeedingFollowUpQueryVariables = Exact<{
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
}>;


export type GetEmailsNeedingFollowUpQuery = { __typename?: 'Query', emailsNeedingFollowUp: { __typename?: 'FollowUpEmailsResult', totalCount: number, emails: Array<{ __typename?: 'FollowUpEmail', id: number, contactId: number, resendId: string, fromEmail: string, toEmails: Array<string>, subject: string, status: string, sentAt: string | null, sequenceType: string | null, sequenceNumber: string | null, followupStatus: string | null, companyId: number | null, recipientName: string | null, createdAt: string }> } };

export type GetWebhookEventsQueryVariables = Exact<{
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
  eventType?: InputMaybe<Scalars['String']['input']>;
}>;


export type GetWebhookEventsQuery = { __typename?: 'Query', webhookEvents: { __typename?: 'WebhookEventsResult', totalCount: number, events: Array<{ __typename?: 'WebhookEvent', id: number, eventType: string, emailId: string | null, fromEmail: string | null, toEmails: string | null, subject: string | null, httpStatus: number | null, error: string | null, createdAt: string }> } };

export type GetEmailTemplatesQueryVariables = Exact<{
  category?: InputMaybe<Scalars['String']['input']>;
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
}>;


export type GetEmailTemplatesQuery = { __typename?: 'Query', emailTemplates: { __typename?: 'EmailTemplatesResult', totalCount: number, templates: Array<{ __typename?: 'EmailTemplate', id: number, name: string, description: string | null, subject: string | null, category: string | null, tags: Array<string>, isActive: boolean, createdAt: string, updatedAt: string }> } };

export type GetEmailTemplateQueryVariables = Exact<{
  id: Scalars['Int']['input'];
}>;


export type GetEmailTemplateQuery = { __typename?: 'Query', emailTemplate: { __typename?: 'EmailTemplate', id: number, name: string, description: string | null, subject: string | null, htmlContent: string | null, textContent: string | null, category: string | null, tags: Array<string>, variables: Array<string>, isActive: boolean, createdAt: string, updatedAt: string } | null };

export type CreateEmailTemplateMutationVariables = Exact<{
  input: CreateEmailTemplateInput;
}>;


export type CreateEmailTemplateMutation = { __typename?: 'Mutation', createEmailTemplate: { __typename?: 'EmailTemplate', id: number, name: string, subject: string | null, category: string | null, createdAt: string } };

export type UpdateEmailTemplateMutationVariables = Exact<{
  id: Scalars['Int']['input'];
  input: UpdateEmailTemplateInput;
}>;


export type UpdateEmailTemplateMutation = { __typename?: 'Mutation', updateEmailTemplate: { __typename?: 'EmailTemplate', id: number, name: string, subject: string | null, isActive: boolean, updatedAt: string } };

export type DeleteEmailTemplateMutationVariables = Exact<{
  id: Scalars['Int']['input'];
}>;


export type DeleteEmailTemplateMutation = { __typename?: 'Mutation', deleteEmailTemplate: { __typename?: 'DeleteEmailTemplateResult', success: boolean, message: string | null } };

export type GetEmailThreadsQueryVariables = Exact<{
  classification?: InputMaybe<Scalars['String']['input']>;
  search?: InputMaybe<Scalars['String']['input']>;
  sortBy?: InputMaybe<Scalars['String']['input']>;
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
}>;


export type GetEmailThreadsQuery = { __typename?: 'Query', emailThreads: { __typename?: 'EmailThreadsResult', totalCount: number, threads: Array<{ __typename?: 'EmailThread', contactId: number, contactSlug: string | null, contactName: string, contactEmail: string | null, contactPosition: string | null, companyName: string | null, companyKey: string | null, lastMessageAt: string, lastMessagePreview: string | null, lastMessageDirection: string, classification: string | null, classificationConfidence: number | null, totalMessages: number, hasReply: boolean, latestStatus: string | null, priorityScore: number | null, hasPendingDraft: boolean | null, draftId: number | null, conversationStage: string | null }> } };

export type GetEmailThreadQueryVariables = Exact<{
  contactId: Scalars['Int']['input'];
}>;


export type GetEmailThreadQuery = { __typename?: 'Query', emailThread: { __typename?: 'EmailThread', contactId: number, contactSlug: string | null, contactName: string, contactEmail: string | null, contactPosition: string | null, contactForwardingAlias: string | null, companyName: string | null, companyKey: string | null, classification: string | null, classificationConfidence: number | null, totalMessages: number, hasReply: boolean, messages: Array<{ __typename?: 'ThreadMessage', id: number, direction: string, fromEmail: string, toEmails: Array<string>, subject: string, textContent: string | null, htmlContent: string | null, sentAt: string | null, status: string | null, sequenceType: string | null, sequenceNumber: string | null, classification: string | null, classificationConfidence: number | null }> } | null };

export type GetLinkedInPostsQueryVariables = Exact<{
  type?: InputMaybe<LinkedInPostType>;
  companyId?: InputMaybe<Scalars['Int']['input']>;
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
}>;


export type GetLinkedInPostsQuery = { __typename?: 'Query', linkedinPosts: Array<{ __typename?: 'LinkedInPost', id: number, type: LinkedInPostType, url: string, companyId: number | null, contactId: number | null, title: string | null, content: string | null, authorName: string | null, authorUrl: string | null, location: string | null, employmentType: string | null, postedAt: string | null, scrapedAt: string, rawData: any | null, analyzedAt: string | null, createdAt: string, skills: Array<{ __typename?: 'ExtractedSkill', tag: string, label: string, confidence: number }> | null }> };

export type GetSimilarPostsQueryVariables = Exact<{
  postId: Scalars['Int']['input'];
  limit?: InputMaybe<Scalars['Int']['input']>;
  minScore?: InputMaybe<Scalars['Float']['input']>;
}>;


export type GetSimilarPostsQuery = { __typename?: 'Query', similarPosts: Array<{ __typename?: 'SimilarPost', similarity: number, post: { __typename?: 'LinkedInPost', id: number, type: LinkedInPostType, url: string, title: string | null, content: string | null, authorName: string | null, analyzedAt: string | null, skills: Array<{ __typename?: 'ExtractedSkill', tag: string, label: string, confidence: number }> | null } }> };

export type AnalyzeLinkedInPostsMutationVariables = Exact<{
  postIds?: InputMaybe<Array<Scalars['Int']['input']> | Scalars['Int']['input']>;
  limit?: InputMaybe<Scalars['Int']['input']>;
}>;


export type AnalyzeLinkedInPostsMutation = { __typename?: 'Mutation', analyzeLinkedInPosts: { __typename?: 'AnalyzePostsResult', success: boolean, analyzed: number, failed: number, errors: Array<string> } };

export type ProductCoreFragment = { __typename?: 'Product', id: number, slug: string, name: string, url: string, domain: string | null, description: string | null, highlights: any | null, icpAnalysis: any | null, icpAnalyzedAt: string | null, pricingAnalysis: any | null, pricingAnalyzedAt: string | null, gtmAnalysis: any | null, gtmAnalyzedAt: string | null, intelReport: any | null, intelReportAt: string | null, createdBy: string | null, createdAt: string, updatedAt: string };

export type IntelRunCoreFragment = { __typename?: 'IntelRun', id: string, productId: number, kind: string, status: string, startedAt: string, finishedAt: string | null, error: string | null, output: any | null };

export type ProductsQueryVariables = Exact<{ [key: string]: never; }>;


export type ProductsQuery = { __typename?: 'Query', products: Array<{ __typename?: 'Product', id: number, slug: string, name: string, url: string, domain: string | null, description: string | null, highlights: any | null, icpAnalysis: any | null, icpAnalyzedAt: string | null, pricingAnalysis: any | null, pricingAnalyzedAt: string | null, gtmAnalysis: any | null, gtmAnalyzedAt: string | null, intelReport: any | null, intelReportAt: string | null, createdBy: string | null, createdAt: string, updatedAt: string }> };

export type ProductQueryVariables = Exact<{
  id: Scalars['Int']['input'];
}>;


export type ProductQuery = { __typename?: 'Query', product: { __typename?: 'Product', id: number, slug: string, name: string, url: string, domain: string | null, description: string | null, highlights: any | null, icpAnalysis: any | null, icpAnalyzedAt: string | null, pricingAnalysis: any | null, pricingAnalyzedAt: string | null, gtmAnalysis: any | null, gtmAnalyzedAt: string | null, intelReport: any | null, intelReportAt: string | null, createdBy: string | null, createdAt: string, updatedAt: string } | null };

export type ProductBySlugQueryVariables = Exact<{
  slug: Scalars['String']['input'];
}>;


export type ProductBySlugQuery = { __typename?: 'Query', productBySlug: { __typename?: 'Product', id: number, slug: string, name: string, url: string, domain: string | null, description: string | null, highlights: any | null, icpAnalysis: any | null, icpAnalyzedAt: string | null, pricingAnalysis: any | null, pricingAnalyzedAt: string | null, gtmAnalysis: any | null, gtmAnalyzedAt: string | null, intelReport: any | null, intelReportAt: string | null, createdBy: string | null, createdAt: string, updatedAt: string } | null };

export type PublicProductsQueryVariables = Exact<{
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
}>;


export type PublicProductsQuery = { __typename?: 'Query', products: Array<{ __typename?: 'Product', id: number, slug: string, name: string, domain: string | null, icpAnalyzedAt: string | null, pricingAnalyzedAt: string | null, gtmAnalyzedAt: string | null, intelReportAt: string | null }> };

export type PublicProductQueryVariables = Exact<{
  slug: Scalars['String']['input'];
}>;


export type PublicProductQuery = { __typename?: 'Query', productBySlug: { __typename?: 'Product', id: number, slug: string, name: string, url: string, domain: string | null, description: string | null, highlights: any | null, icpAnalysis: any | null, icpAnalyzedAt: string | null, pricingAnalysis: any | null, pricingAnalyzedAt: string | null, gtmAnalysis: any | null, gtmAnalyzedAt: string | null, intelReport: any | null, intelReportAt: string | null, createdBy: string | null, createdAt: string, updatedAt: string } | null };

export type PublicIntelRunQueryVariables = Exact<{
  id: Scalars['ID']['input'];
}>;


export type PublicIntelRunQuery = { __typename?: 'Query', productIntelRun: { __typename?: 'IntelRun', id: string, productId: number, kind: string, status: string, startedAt: string, finishedAt: string | null, error: string | null, output: any | null } | null };

export type PublicIntelRunsQueryVariables = Exact<{
  productId: Scalars['Int']['input'];
  kind?: InputMaybe<Scalars['String']['input']>;
}>;


export type PublicIntelRunsQuery = { __typename?: 'Query', productIntelRuns: Array<{ __typename?: 'IntelRun', id: string, kind: string, status: string, startedAt: string, finishedAt: string | null, error: string | null }> };

export type UpsertProductMutationVariables = Exact<{
  input: ProductInput;
}>;


export type UpsertProductMutation = { __typename?: 'Mutation', upsertProduct: { __typename?: 'Product', id: number, slug: string, name: string, url: string, domain: string | null, description: string | null, highlights: any | null, icpAnalysis: any | null, icpAnalyzedAt: string | null, pricingAnalysis: any | null, pricingAnalyzedAt: string | null, gtmAnalysis: any | null, gtmAnalyzedAt: string | null, intelReport: any | null, intelReportAt: string | null, createdBy: string | null, createdAt: string, updatedAt: string } };

export type DeleteProductMutationVariables = Exact<{
  id: Scalars['Int']['input'];
}>;


export type DeleteProductMutation = { __typename?: 'Mutation', deleteProduct: boolean };

export type AnalyzeProductIcpMutationVariables = Exact<{
  id: Scalars['Int']['input'];
}>;


export type AnalyzeProductIcpMutation = { __typename?: 'Mutation', analyzeProductICP: { __typename?: 'Product', id: number, slug: string, name: string, url: string, domain: string | null, description: string | null, highlights: any | null, icpAnalysis: any | null, icpAnalyzedAt: string | null, pricingAnalysis: any | null, pricingAnalyzedAt: string | null, gtmAnalysis: any | null, gtmAnalyzedAt: string | null, intelReport: any | null, intelReportAt: string | null, createdBy: string | null, createdAt: string, updatedAt: string } };

export type EnhanceProductIcpMutationVariables = Exact<{
  id: Scalars['Int']['input'];
}>;


export type EnhanceProductIcpMutation = { __typename?: 'Mutation', enhanceProductIcp: { __typename?: 'Product', id: number, slug: string, name: string, url: string, domain: string | null, description: string | null, highlights: any | null, icpAnalysis: any | null, icpAnalyzedAt: string | null, pricingAnalysis: any | null, pricingAnalyzedAt: string | null, gtmAnalysis: any | null, gtmAnalyzedAt: string | null, intelReport: any | null, intelReportAt: string | null, createdBy: string | null, createdAt: string, updatedAt: string } };

export type AnalyzeProductPricingMutationVariables = Exact<{
  id: Scalars['Int']['input'];
}>;


export type AnalyzeProductPricingMutation = { __typename?: 'Mutation', analyzeProductPricing: { __typename?: 'Product', id: number, slug: string, name: string, url: string, domain: string | null, description: string | null, highlights: any | null, icpAnalysis: any | null, icpAnalyzedAt: string | null, pricingAnalysis: any | null, pricingAnalyzedAt: string | null, gtmAnalysis: any | null, gtmAnalyzedAt: string | null, intelReport: any | null, intelReportAt: string | null, createdBy: string | null, createdAt: string, updatedAt: string } };

export type AnalyzeProductGtmMutationVariables = Exact<{
  id: Scalars['Int']['input'];
}>;


export type AnalyzeProductGtmMutation = { __typename?: 'Mutation', analyzeProductGTM: { __typename?: 'Product', id: number, slug: string, name: string, url: string, domain: string | null, description: string | null, highlights: any | null, icpAnalysis: any | null, icpAnalyzedAt: string | null, pricingAnalysis: any | null, pricingAnalyzedAt: string | null, gtmAnalysis: any | null, gtmAnalyzedAt: string | null, intelReport: any | null, intelReportAt: string | null, createdBy: string | null, createdAt: string, updatedAt: string } };

export type RunFullProductIntelMutationVariables = Exact<{
  id: Scalars['Int']['input'];
}>;


export type RunFullProductIntelMutation = { __typename?: 'Mutation', runFullProductIntel: { __typename?: 'Product', id: number, slug: string, name: string, url: string, domain: string | null, description: string | null, highlights: any | null, icpAnalysis: any | null, icpAnalyzedAt: string | null, pricingAnalysis: any | null, pricingAnalyzedAt: string | null, gtmAnalysis: any | null, gtmAnalyzedAt: string | null, intelReport: any | null, intelReportAt: string | null, createdBy: string | null, createdAt: string, updatedAt: string } };

export type AnalyzeProductPricingAsyncMutationVariables = Exact<{
  id: Scalars['Int']['input'];
}>;


export type AnalyzeProductPricingAsyncMutation = { __typename?: 'Mutation', analyzeProductPricingAsync: { __typename?: 'IntelRunAccepted', runId: string, productId: number, kind: string, status: string } };

export type AnalyzeProductGtmAsyncMutationVariables = Exact<{
  id: Scalars['Int']['input'];
}>;


export type AnalyzeProductGtmAsyncMutation = { __typename?: 'Mutation', analyzeProductGTMAsync: { __typename?: 'IntelRunAccepted', runId: string, productId: number, kind: string, status: string } };

export type RunFullProductIntelAsyncMutationVariables = Exact<{
  id: Scalars['Int']['input'];
  forceRefresh?: InputMaybe<Scalars['Boolean']['input']>;
}>;


export type RunFullProductIntelAsyncMutation = { __typename?: 'Mutation', runFullProductIntelAsync: { __typename?: 'IntelRunAccepted', runId: string, productId: number, kind: string, status: string } };

export type DueRemindersQueryVariables = Exact<{ [key: string]: never; }>;


export type DueRemindersQuery = { __typename?: 'Query', dueReminders: Array<{ __typename?: 'ReminderWithContact', reminder: { __typename?: 'Reminder', id: number, entityType: string, entityId: number, remindAt: string, recurrence: string, note: string | null, status: string, snoozedUntil: string | null, createdAt: string, updatedAt: string }, contact: { __typename?: 'Contact', id: number, slug: string | null, firstName: string, lastName: string, position: string | null, tags: Array<string> } }> };

export type RemindersQueryVariables = Exact<{
  entityType: Scalars['String']['input'];
  entityId: Scalars['Int']['input'];
}>;


export type RemindersQuery = { __typename?: 'Query', reminders: Array<{ __typename?: 'Reminder', id: number, entityType: string, entityId: number, remindAt: string, recurrence: string, note: string | null, status: string, snoozedUntil: string | null, createdAt: string, updatedAt: string }> };

export type CreateReminderMutationVariables = Exact<{
  input: CreateReminderInput;
}>;


export type CreateReminderMutation = { __typename?: 'Mutation', createReminder: { __typename?: 'Reminder', id: number, entityType: string, entityId: number, remindAt: string, recurrence: string, note: string | null, status: string, createdAt: string } };

export type UpdateReminderMutationVariables = Exact<{
  id: Scalars['Int']['input'];
  input: UpdateReminderInput;
}>;


export type UpdateReminderMutation = { __typename?: 'Mutation', updateReminder: { __typename?: 'Reminder', id: number, entityType: string, entityId: number, remindAt: string, recurrence: string, note: string | null, status: string, updatedAt: string } };

export type SnoozeReminderMutationVariables = Exact<{
  id: Scalars['Int']['input'];
  days: Scalars['Int']['input'];
}>;


export type SnoozeReminderMutation = { __typename?: 'Mutation', snoozeReminder: { __typename?: 'Reminder', id: number, entityType: string, entityId: number, remindAt: string, status: string, snoozedUntil: string | null, updatedAt: string } };

export type DismissReminderMutationVariables = Exact<{
  id: Scalars['Int']['input'];
}>;


export type DismissReminderMutation = { __typename?: 'Mutation', dismissReminder: { __typename?: 'Reminder', id: number, entityType: string, entityId: number, status: string, updatedAt: string } };

export type ComputeNextTouchScoresMutationVariables = Exact<{
  companyId: Scalars['Int']['input'];
}>;


export type ComputeNextTouchScoresMutation = { __typename?: 'Mutation', computeNextTouchScores: { __typename?: 'ComputeNextTouchScoresResult', success: boolean, message: string, contactsUpdated: number, topContacts: Array<{ __typename?: 'ContactNextTouch', contactId: number, firstName: string, lastName: string, position: string | null, nextTouchScore: number, lastContactedAt: string | null }> } };

export type ScoreContactsMlMutationVariables = Exact<{
  companyId: Scalars['Int']['input'];
}>;


export type ScoreContactsMlMutation = { __typename?: 'Mutation', scoreContactsML: { __typename?: 'ScoreContactsMLResult', success: boolean, message: string, contactsScored: number, decisionMakersFound: number, results: Array<{ __typename?: 'ContactMLScore', contactId: number, seniority: string, department: string, authorityScore: number, isDecisionMaker: boolean, dmReasons: Array<string> }> } };

export type GetReplyDraftsQueryVariables = Exact<{
  status?: InputMaybe<Scalars['String']['input']>;
  draftType?: InputMaybe<Scalars['String']['input']>;
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
}>;


export type GetReplyDraftsQuery = { __typename?: 'Query', replyDrafts: { __typename?: 'ReplyDraftsResult', totalCount: number, drafts: Array<{ __typename?: 'ReplyDraft', id: number, receivedEmailId: number, contactId: number, status: string, draftType: string, subject: string, bodyText: string, bodyHtml: string | null, generationModel: string | null, contactName: string | null, contactEmail: string | null, companyName: string | null, classification: string | null, classificationConfidence: number | null, approvedAt: string | null, sentAt: string | null, createdAt: string, updatedAt: string }> } };

export type GetDraftSummaryQueryVariables = Exact<{ [key: string]: never; }>;


export type GetDraftSummaryQuery = { __typename?: 'Query', draftSummary: { __typename?: 'DraftSummary', pending: number, approved: number, sent: number, dismissed: number, byClassification: Array<{ __typename?: 'ClassificationCount', classification: string, count: number }> } };

export type ApproveAndSendDraftMutationVariables = Exact<{
  draftId: Scalars['Int']['input'];
  editedSubject?: InputMaybe<Scalars['String']['input']>;
  editedBody?: InputMaybe<Scalars['String']['input']>;
}>;


export type ApproveAndSendDraftMutation = { __typename?: 'Mutation', approveAndSendDraft: { __typename?: 'SendDraftResult', success: boolean, resendId: string | null, error: string | null } };

export type DismissDraftMutationVariables = Exact<{
  draftId: Scalars['Int']['input'];
}>;


export type DismissDraftMutation = { __typename?: 'Mutation', dismissDraft: { __typename?: 'DismissDraftResult', success: boolean } };

export type RegenerateDraftMutationVariables = Exact<{
  draftId: Scalars['Int']['input'];
  instructions?: InputMaybe<Scalars['String']['input']>;
}>;


export type RegenerateDraftMutation = { __typename?: 'Mutation', regenerateDraft: { __typename?: 'ReplyDraft', id: number, subject: string, bodyText: string, status: string, createdAt: string } };

export type GenerateDraftsForPendingMutationVariables = Exact<{ [key: string]: never; }>;


export type GenerateDraftsForPendingMutation = { __typename?: 'Mutation', generateDraftsForPending: { __typename?: 'GenerateDraftsBatchResult', success: boolean, generated: number, skipped: number, failed: number, message: string } };

export type GenerateFollowUpDraftsMutationVariables = Exact<{
  daysAfterInitial?: InputMaybe<Scalars['Int']['input']>;
  daysAfterFollowUp1?: InputMaybe<Scalars['Int']['input']>;
  daysAfterFollowUp2?: InputMaybe<Scalars['Int']['input']>;
}>;


export type GenerateFollowUpDraftsMutation = { __typename?: 'Mutation', generateFollowUpDrafts: { __typename?: 'GenerateDraftsBatchResult', success: boolean, generated: number, skipped: number, failed: number, message: string } };

export type ApproveAllDraftsMutationVariables = Exact<{
  draftIds: Array<Scalars['Int']['input']> | Scalars['Int']['input'];
}>;


export type ApproveAllDraftsMutation = { __typename?: 'Mutation', approveAllDrafts: { __typename?: 'BatchSendDraftResult', success: boolean, sent: number, failed: number, errors: Array<string> } };

export type DismissAllDraftsMutationVariables = Exact<{
  draftIds: Array<Scalars['Int']['input']> | Scalars['Int']['input'];
}>;


export type DismissAllDraftsMutation = { __typename?: 'Mutation', dismissAllDrafts: { __typename?: 'BatchDismissResult', success: boolean, dismissed: number } };

export type GetCompanyScrapedPostsQueryVariables = Exact<{
  companySlug: Scalars['String']['input'];
}>;


export type GetCompanyScrapedPostsQuery = { __typename?: 'Query', companyScrapedPosts: { __typename?: 'CompanyScrapedPostsResult', companyName: string, slug: string, peopleCount: number, postsCount: number, posts: Array<{ __typename?: 'ScrapedPost', personName: string, personLinkedinUrl: string, personHeadline: string | null, postUrl: string | null, postText: string | null, postedDate: string | null, reactionsCount: number, commentsCount: number, repostsCount: number, isRepost: boolean, originalAuthor: string | null, scrapedAt: string }> } };

export const EvidenceFieldsFragmentDoc = gql`
    fragment EvidenceFields on Evidence {
  source_type
  source_url
  crawl_id
  capture_timestamp
  observed_at
  method
  extractor_version
  http_status
  mime
  content_hash
  warc {
    filename
    offset
    length
    digest
  }
}
    `;
export const CompanyFactFieldsFragmentDoc = gql`
    fragment CompanyFactFields on CompanyFact {
  id
  company_id
  field
  value_json
  value_text
  normalized_value
  confidence
  evidence {
    ...EvidenceFields
  }
  created_at
}
    ${EvidenceFieldsFragmentDoc}`;
export const CompanySnapshotFieldsFragmentDoc = gql`
    fragment CompanySnapshotFields on CompanySnapshot {
  id
  company_id
  source_url
  crawl_id
  capture_timestamp
  fetched_at
  http_status
  mime
  content_hash
  text_sample
  jsonld
  extracted
  evidence {
    ...EvidenceFields
  }
  created_at
}
    ${EvidenceFieldsFragmentDoc}`;
export const CompanyFieldsFragmentDoc = gql`
    fragment CompanyFields on Company {
  id
  key
  name
  logo_url
  website
  description
  industry
  size
  location
  created_at
  updated_at
  linkedin_url
  job_board_url
  category
  tags
  services
  service_taxonomy
  industries
  score
  score_reasons
  blocked
  deep_analysis
  last_seen_crawl_id
  last_seen_capture_timestamp
  last_seen_source_url
  opportunities {
    id
    title
    url
    status
    score
    rewardText
    applied
    appliedAt
    tags
    createdAt
  }
}
    `;
export const CompetitorCoreFragmentDoc = gql`
    fragment CompetitorCore on Competitor {
  id
  analysisId
  name
  url
  domain
  logoUrl
  description
  positioningHeadline
  positioningTagline
  targetAudience
  status
  scrapedAt
  scrapeError
  createdAt
}
    `;
export const PricingTierCoreFragmentDoc = gql`
    fragment PricingTierCore on PricingTier {
  id
  tierName
  monthlyPriceUsd
  annualPriceUsd
  seatPriceUsd
  currency
  includedLimits
  isCustomQuote
  sortOrder
}
    `;
export const CompetitorFeatureCoreFragmentDoc = gql`
    fragment CompetitorFeatureCore on CompetitorFeature {
  id
  tierName
  featureText
  category
}
    `;
export const CompetitorIntegrationCoreFragmentDoc = gql`
    fragment CompetitorIntegrationCore on CompetitorIntegration {
  id
  integrationName
  integrationUrl
  category
}
    `;
export const CompetitorFullFragmentDoc = gql`
    fragment CompetitorFull on Competitor {
  ...CompetitorCore
  pricingTiers {
    ...PricingTierCore
  }
  features {
    ...CompetitorFeatureCore
  }
  integrations {
    ...CompetitorIntegrationCore
  }
}
    ${CompetitorCoreFragmentDoc}
${PricingTierCoreFragmentDoc}
${CompetitorFeatureCoreFragmentDoc}
${CompetitorIntegrationCoreFragmentDoc}`;
export const ProductCoreFragmentDoc = gql`
    fragment ProductCore on Product {
  id
  slug
  name
  url
  domain
  description
  highlights
  icpAnalysis
  icpAnalyzedAt
  pricingAnalysis
  pricingAnalyzedAt
  gtmAnalysis
  gtmAnalyzedAt
  intelReport
  intelReportAt
  createdBy
  createdAt
  updatedAt
}
    `;
export const CompetitorAnalysisCoreFragmentDoc = gql`
    fragment CompetitorAnalysisCore on CompetitorAnalysis {
  id
  product {
    ...ProductCore
  }
  status
  createdBy
  error
  createdAt
  updatedAt
}
    ${ProductCoreFragmentDoc}`;
export const IntelRunCoreFragmentDoc = gql`
    fragment IntelRunCore on IntelRun {
  id
  productId
  kind
  status
  startedAt
  finishedAt
  error
  output
}
    `;
export const GetUserSettingsDocument = gql`
    query GetUserSettings($userId: String!) {
  userSettings(userId: $userId) {
    id
    excluded_companies
  }
}
    `;

/**
 * __useGetUserSettingsQuery__
 *
 * To run a query within a React component, call `useGetUserSettingsQuery` and pass it any options that fit your needs.
 * When your component renders, `useGetUserSettingsQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useGetUserSettingsQuery({
 *   variables: {
 *      userId: // value for 'userId'
 *   },
 * });
 */
export function useGetUserSettingsQuery(baseOptions: Apollo.QueryHookOptions<GetUserSettingsQuery, GetUserSettingsQueryVariables> & ({ variables: GetUserSettingsQueryVariables; skip?: boolean; } | { skip: boolean; }) ) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<GetUserSettingsQuery, GetUserSettingsQueryVariables>(GetUserSettingsDocument, options);
      }
export function useGetUserSettingsLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<GetUserSettingsQuery, GetUserSettingsQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<GetUserSettingsQuery, GetUserSettingsQueryVariables>(GetUserSettingsDocument, options);
        }
// @ts-ignore
export function useGetUserSettingsSuspenseQuery(baseOptions?: Apollo.SuspenseQueryHookOptions<GetUserSettingsQuery, GetUserSettingsQueryVariables>): Apollo.UseSuspenseQueryResult<GetUserSettingsQuery, GetUserSettingsQueryVariables>;
export function useGetUserSettingsSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<GetUserSettingsQuery, GetUserSettingsQueryVariables>): Apollo.UseSuspenseQueryResult<GetUserSettingsQuery | undefined, GetUserSettingsQueryVariables>;
export function useGetUserSettingsSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<GetUserSettingsQuery, GetUserSettingsQueryVariables>) {
          const options = baseOptions === Apollo.skipToken ? baseOptions : {...defaultOptions, ...baseOptions}
          return Apollo.useSuspenseQuery<GetUserSettingsQuery, GetUserSettingsQueryVariables>(GetUserSettingsDocument, options);
        }
export type GetUserSettingsQueryHookResult = ReturnType<typeof useGetUserSettingsQuery>;
export type GetUserSettingsLazyQueryHookResult = ReturnType<typeof useGetUserSettingsLazyQuery>;
export type GetUserSettingsSuspenseQueryHookResult = ReturnType<typeof useGetUserSettingsSuspenseQuery>;
export type GetUserSettingsQueryResult = Apollo.QueryResult<GetUserSettingsQuery, GetUserSettingsQueryVariables>;
export const UpdateUserSettingsDocument = gql`
    mutation UpdateUserSettings($userId: String!, $settings: UserSettingsInput!) {
  updateUserSettings(userId: $userId, settings: $settings) {
    id
    user_id
    email_notifications
    daily_digest
    excluded_companies
    dark_mode
    created_at
    updated_at
  }
}
    `;
export type UpdateUserSettingsMutationFn = Apollo.MutationFunction<UpdateUserSettingsMutation, UpdateUserSettingsMutationVariables>;

/**
 * __useUpdateUserSettingsMutation__
 *
 * To run a mutation, you first call `useUpdateUserSettingsMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useUpdateUserSettingsMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [updateUserSettingsMutation, { data, loading, error }] = useUpdateUserSettingsMutation({
 *   variables: {
 *      userId: // value for 'userId'
 *      settings: // value for 'settings'
 *   },
 * });
 */
export function useUpdateUserSettingsMutation(baseOptions?: Apollo.MutationHookOptions<UpdateUserSettingsMutation, UpdateUserSettingsMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<UpdateUserSettingsMutation, UpdateUserSettingsMutationVariables>(UpdateUserSettingsDocument, options);
      }
export type UpdateUserSettingsMutationHookResult = ReturnType<typeof useUpdateUserSettingsMutation>;
export type UpdateUserSettingsMutationResult = Apollo.MutationResult<UpdateUserSettingsMutation>;
export type UpdateUserSettingsMutationOptions = Apollo.BaseMutationOptions<UpdateUserSettingsMutation, UpdateUserSettingsMutationVariables>;
export const AllCompanyTagsDocument = gql`
    query AllCompanyTags {
  allCompanyTags
}
    `;

/**
 * __useAllCompanyTagsQuery__
 *
 * To run a query within a React component, call `useAllCompanyTagsQuery` and pass it any options that fit your needs.
 * When your component renders, `useAllCompanyTagsQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useAllCompanyTagsQuery({
 *   variables: {
 *   },
 * });
 */
export function useAllCompanyTagsQuery(baseOptions?: Apollo.QueryHookOptions<AllCompanyTagsQuery, AllCompanyTagsQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<AllCompanyTagsQuery, AllCompanyTagsQueryVariables>(AllCompanyTagsDocument, options);
      }
export function useAllCompanyTagsLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<AllCompanyTagsQuery, AllCompanyTagsQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<AllCompanyTagsQuery, AllCompanyTagsQueryVariables>(AllCompanyTagsDocument, options);
        }
// @ts-ignore
export function useAllCompanyTagsSuspenseQuery(baseOptions?: Apollo.SuspenseQueryHookOptions<AllCompanyTagsQuery, AllCompanyTagsQueryVariables>): Apollo.UseSuspenseQueryResult<AllCompanyTagsQuery, AllCompanyTagsQueryVariables>;
export function useAllCompanyTagsSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<AllCompanyTagsQuery, AllCompanyTagsQueryVariables>): Apollo.UseSuspenseQueryResult<AllCompanyTagsQuery | undefined, AllCompanyTagsQueryVariables>;
export function useAllCompanyTagsSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<AllCompanyTagsQuery, AllCompanyTagsQueryVariables>) {
          const options = baseOptions === Apollo.skipToken ? baseOptions : {...defaultOptions, ...baseOptions}
          return Apollo.useSuspenseQuery<AllCompanyTagsQuery, AllCompanyTagsQueryVariables>(AllCompanyTagsDocument, options);
        }
export type AllCompanyTagsQueryHookResult = ReturnType<typeof useAllCompanyTagsQuery>;
export type AllCompanyTagsLazyQueryHookResult = ReturnType<typeof useAllCompanyTagsLazyQuery>;
export type AllCompanyTagsSuspenseQueryHookResult = ReturnType<typeof useAllCompanyTagsSuspenseQuery>;
export type AllCompanyTagsQueryResult = Apollo.QueryResult<AllCompanyTagsQuery, AllCompanyTagsQueryVariables>;
export const FindCompanyDocument = gql`
    query FindCompany($name: String, $website: String, $linkedinUrl: String) {
  findCompany(name: $name, website: $website, linkedinUrl: $linkedinUrl) {
    found
    company {
      id
      key
      name
      website
      email
      location
      linkedin_url
    }
  }
}
    `;

/**
 * __useFindCompanyQuery__
 *
 * To run a query within a React component, call `useFindCompanyQuery` and pass it any options that fit your needs.
 * When your component renders, `useFindCompanyQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useFindCompanyQuery({
 *   variables: {
 *      name: // value for 'name'
 *      website: // value for 'website'
 *      linkedinUrl: // value for 'linkedinUrl'
 *   },
 * });
 */
export function useFindCompanyQuery(baseOptions?: Apollo.QueryHookOptions<FindCompanyQuery, FindCompanyQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<FindCompanyQuery, FindCompanyQueryVariables>(FindCompanyDocument, options);
      }
export function useFindCompanyLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<FindCompanyQuery, FindCompanyQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<FindCompanyQuery, FindCompanyQueryVariables>(FindCompanyDocument, options);
        }
// @ts-ignore
export function useFindCompanySuspenseQuery(baseOptions?: Apollo.SuspenseQueryHookOptions<FindCompanyQuery, FindCompanyQueryVariables>): Apollo.UseSuspenseQueryResult<FindCompanyQuery, FindCompanyQueryVariables>;
export function useFindCompanySuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<FindCompanyQuery, FindCompanyQueryVariables>): Apollo.UseSuspenseQueryResult<FindCompanyQuery | undefined, FindCompanyQueryVariables>;
export function useFindCompanySuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<FindCompanyQuery, FindCompanyQueryVariables>) {
          const options = baseOptions === Apollo.skipToken ? baseOptions : {...defaultOptions, ...baseOptions}
          return Apollo.useSuspenseQuery<FindCompanyQuery, FindCompanyQueryVariables>(FindCompanyDocument, options);
        }
export type FindCompanyQueryHookResult = ReturnType<typeof useFindCompanyQuery>;
export type FindCompanyLazyQueryHookResult = ReturnType<typeof useFindCompanyLazyQuery>;
export type FindCompanySuspenseQueryHookResult = ReturnType<typeof useFindCompanySuspenseQuery>;
export type FindCompanyQueryResult = Apollo.QueryResult<FindCompanyQuery, FindCompanyQueryVariables>;
export const CreateCompanyDocument = gql`
    mutation CreateCompany($input: CreateCompanyInput!) {
  createCompany(input: $input) {
    ...CompanyFields
  }
}
    ${CompanyFieldsFragmentDoc}`;
export type CreateCompanyMutationFn = Apollo.MutationFunction<CreateCompanyMutation, CreateCompanyMutationVariables>;

/**
 * __useCreateCompanyMutation__
 *
 * To run a mutation, you first call `useCreateCompanyMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useCreateCompanyMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [createCompanyMutation, { data, loading, error }] = useCreateCompanyMutation({
 *   variables: {
 *      input: // value for 'input'
 *   },
 * });
 */
export function useCreateCompanyMutation(baseOptions?: Apollo.MutationHookOptions<CreateCompanyMutation, CreateCompanyMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<CreateCompanyMutation, CreateCompanyMutationVariables>(CreateCompanyDocument, options);
      }
export type CreateCompanyMutationHookResult = ReturnType<typeof useCreateCompanyMutation>;
export type CreateCompanyMutationResult = Apollo.MutationResult<CreateCompanyMutation>;
export type CreateCompanyMutationOptions = Apollo.BaseMutationOptions<CreateCompanyMutation, CreateCompanyMutationVariables>;
export const UpdateCompanyDocument = gql`
    mutation UpdateCompany($id: Int!, $input: UpdateCompanyInput!) {
  updateCompany(id: $id, input: $input) {
    ...CompanyFields
  }
}
    ${CompanyFieldsFragmentDoc}`;
export type UpdateCompanyMutationFn = Apollo.MutationFunction<UpdateCompanyMutation, UpdateCompanyMutationVariables>;

/**
 * __useUpdateCompanyMutation__
 *
 * To run a mutation, you first call `useUpdateCompanyMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useUpdateCompanyMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [updateCompanyMutation, { data, loading, error }] = useUpdateCompanyMutation({
 *   variables: {
 *      id: // value for 'id'
 *      input: // value for 'input'
 *   },
 * });
 */
export function useUpdateCompanyMutation(baseOptions?: Apollo.MutationHookOptions<UpdateCompanyMutation, UpdateCompanyMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<UpdateCompanyMutation, UpdateCompanyMutationVariables>(UpdateCompanyDocument, options);
      }
export type UpdateCompanyMutationHookResult = ReturnType<typeof useUpdateCompanyMutation>;
export type UpdateCompanyMutationResult = Apollo.MutationResult<UpdateCompanyMutation>;
export type UpdateCompanyMutationOptions = Apollo.BaseMutationOptions<UpdateCompanyMutation, UpdateCompanyMutationVariables>;
export const DeleteCompanyDocument = gql`
    mutation DeleteCompany($id: Int!) {
  deleteCompany(id: $id) {
    success
    message
  }
}
    `;
export type DeleteCompanyMutationFn = Apollo.MutationFunction<DeleteCompanyMutation, DeleteCompanyMutationVariables>;

/**
 * __useDeleteCompanyMutation__
 *
 * To run a mutation, you first call `useDeleteCompanyMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useDeleteCompanyMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [deleteCompanyMutation, { data, loading, error }] = useDeleteCompanyMutation({
 *   variables: {
 *      id: // value for 'id'
 *   },
 * });
 */
export function useDeleteCompanyMutation(baseOptions?: Apollo.MutationHookOptions<DeleteCompanyMutation, DeleteCompanyMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<DeleteCompanyMutation, DeleteCompanyMutationVariables>(DeleteCompanyDocument, options);
      }
export type DeleteCompanyMutationHookResult = ReturnType<typeof useDeleteCompanyMutation>;
export type DeleteCompanyMutationResult = Apollo.MutationResult<DeleteCompanyMutation>;
export type DeleteCompanyMutationOptions = Apollo.BaseMutationOptions<DeleteCompanyMutation, DeleteCompanyMutationVariables>;
export const AddCompanyFactsDocument = gql`
    mutation AddCompanyFacts($company_id: Int!, $facts: [CompanyFactInput!]!) {
  add_company_facts(company_id: $company_id, facts: $facts) {
    ...CompanyFactFields
  }
}
    ${CompanyFactFieldsFragmentDoc}`;
export type AddCompanyFactsMutationFn = Apollo.MutationFunction<AddCompanyFactsMutation, AddCompanyFactsMutationVariables>;

/**
 * __useAddCompanyFactsMutation__
 *
 * To run a mutation, you first call `useAddCompanyFactsMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useAddCompanyFactsMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [addCompanyFactsMutation, { data, loading, error }] = useAddCompanyFactsMutation({
 *   variables: {
 *      company_id: // value for 'company_id'
 *      facts: // value for 'facts'
 *   },
 * });
 */
export function useAddCompanyFactsMutation(baseOptions?: Apollo.MutationHookOptions<AddCompanyFactsMutation, AddCompanyFactsMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<AddCompanyFactsMutation, AddCompanyFactsMutationVariables>(AddCompanyFactsDocument, options);
      }
export type AddCompanyFactsMutationHookResult = ReturnType<typeof useAddCompanyFactsMutation>;
export type AddCompanyFactsMutationResult = Apollo.MutationResult<AddCompanyFactsMutation>;
export type AddCompanyFactsMutationOptions = Apollo.BaseMutationOptions<AddCompanyFactsMutation, AddCompanyFactsMutationVariables>;
export const IngestCompanySnapshotDocument = gql`
    mutation IngestCompanySnapshot($company_id: Int!, $source_url: String!, $crawl_id: String, $capture_timestamp: String, $fetched_at: String!, $http_status: Int, $mime: String, $content_hash: String, $text_sample: String, $jsonld: JSON, $extracted: JSON, $evidence: EvidenceInput!) {
  ingest_company_snapshot(
    company_id: $company_id
    source_url: $source_url
    crawl_id: $crawl_id
    capture_timestamp: $capture_timestamp
    fetched_at: $fetched_at
    http_status: $http_status
    mime: $mime
    content_hash: $content_hash
    text_sample: $text_sample
    jsonld: $jsonld
    extracted: $extracted
    evidence: $evidence
  ) {
    ...CompanySnapshotFields
  }
}
    ${CompanySnapshotFieldsFragmentDoc}`;
export type IngestCompanySnapshotMutationFn = Apollo.MutationFunction<IngestCompanySnapshotMutation, IngestCompanySnapshotMutationVariables>;

/**
 * __useIngestCompanySnapshotMutation__
 *
 * To run a mutation, you first call `useIngestCompanySnapshotMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useIngestCompanySnapshotMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [ingestCompanySnapshotMutation, { data, loading, error }] = useIngestCompanySnapshotMutation({
 *   variables: {
 *      company_id: // value for 'company_id'
 *      source_url: // value for 'source_url'
 *      crawl_id: // value for 'crawl_id'
 *      capture_timestamp: // value for 'capture_timestamp'
 *      fetched_at: // value for 'fetched_at'
 *      http_status: // value for 'http_status'
 *      mime: // value for 'mime'
 *      content_hash: // value for 'content_hash'
 *      text_sample: // value for 'text_sample'
 *      jsonld: // value for 'jsonld'
 *      extracted: // value for 'extracted'
 *      evidence: // value for 'evidence'
 *   },
 * });
 */
export function useIngestCompanySnapshotMutation(baseOptions?: Apollo.MutationHookOptions<IngestCompanySnapshotMutation, IngestCompanySnapshotMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<IngestCompanySnapshotMutation, IngestCompanySnapshotMutationVariables>(IngestCompanySnapshotDocument, options);
      }
export type IngestCompanySnapshotMutationHookResult = ReturnType<typeof useIngestCompanySnapshotMutation>;
export type IngestCompanySnapshotMutationResult = Apollo.MutationResult<IngestCompanySnapshotMutation>;
export type IngestCompanySnapshotMutationOptions = Apollo.BaseMutationOptions<IngestCompanySnapshotMutation, IngestCompanySnapshotMutationVariables>;
export const MergeDuplicateCompaniesDocument = gql`
    mutation MergeDuplicateCompanies($companyIds: [Int!]!) {
  mergeDuplicateCompanies(companyIds: $companyIds) {
    success
    message
    keptCompanyId
    merged
  }
}
    `;
export type MergeDuplicateCompaniesMutationFn = Apollo.MutationFunction<MergeDuplicateCompaniesMutation, MergeDuplicateCompaniesMutationVariables>;

/**
 * __useMergeDuplicateCompaniesMutation__
 *
 * To run a mutation, you first call `useMergeDuplicateCompaniesMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useMergeDuplicateCompaniesMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [mergeDuplicateCompaniesMutation, { data, loading, error }] = useMergeDuplicateCompaniesMutation({
 *   variables: {
 *      companyIds: // value for 'companyIds'
 *   },
 * });
 */
export function useMergeDuplicateCompaniesMutation(baseOptions?: Apollo.MutationHookOptions<MergeDuplicateCompaniesMutation, MergeDuplicateCompaniesMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<MergeDuplicateCompaniesMutation, MergeDuplicateCompaniesMutationVariables>(MergeDuplicateCompaniesDocument, options);
      }
export type MergeDuplicateCompaniesMutationHookResult = ReturnType<typeof useMergeDuplicateCompaniesMutation>;
export type MergeDuplicateCompaniesMutationResult = Apollo.MutationResult<MergeDuplicateCompaniesMutation>;
export type MergeDuplicateCompaniesMutationOptions = Apollo.BaseMutationOptions<MergeDuplicateCompaniesMutation, MergeDuplicateCompaniesMutationVariables>;
export const DeleteCompaniesDocument = gql`
    mutation DeleteCompanies($companyIds: [Int!]!) {
  deleteCompanies(companyIds: $companyIds) {
    success
    message
    deleted
  }
}
    `;
export type DeleteCompaniesMutationFn = Apollo.MutationFunction<DeleteCompaniesMutation, DeleteCompaniesMutationVariables>;

/**
 * __useDeleteCompaniesMutation__
 *
 * To run a mutation, you first call `useDeleteCompaniesMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useDeleteCompaniesMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [deleteCompaniesMutation, { data, loading, error }] = useDeleteCompaniesMutation({
 *   variables: {
 *      companyIds: // value for 'companyIds'
 *   },
 * });
 */
export function useDeleteCompaniesMutation(baseOptions?: Apollo.MutationHookOptions<DeleteCompaniesMutation, DeleteCompaniesMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<DeleteCompaniesMutation, DeleteCompaniesMutationVariables>(DeleteCompaniesDocument, options);
      }
export type DeleteCompaniesMutationHookResult = ReturnType<typeof useDeleteCompaniesMutation>;
export type DeleteCompaniesMutationResult = Apollo.MutationResult<DeleteCompaniesMutation>;
export type DeleteCompaniesMutationOptions = Apollo.BaseMutationOptions<DeleteCompaniesMutation, DeleteCompaniesMutationVariables>;
export const ImportCompanyWithContactsDocument = gql`
    mutation ImportCompanyWithContacts($input: ImportCompanyWithContactsInput!) {
  importCompanyWithContacts(input: $input) {
    success
    company {
      id
      key
      name
    }
    contactsImported
    contactsSkipped
    errors
  }
}
    `;
export type ImportCompanyWithContactsMutationFn = Apollo.MutationFunction<ImportCompanyWithContactsMutation, ImportCompanyWithContactsMutationVariables>;

/**
 * __useImportCompanyWithContactsMutation__
 *
 * To run a mutation, you first call `useImportCompanyWithContactsMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useImportCompanyWithContactsMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [importCompanyWithContactsMutation, { data, loading, error }] = useImportCompanyWithContactsMutation({
 *   variables: {
 *      input: // value for 'input'
 *   },
 * });
 */
export function useImportCompanyWithContactsMutation(baseOptions?: Apollo.MutationHookOptions<ImportCompanyWithContactsMutation, ImportCompanyWithContactsMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<ImportCompanyWithContactsMutation, ImportCompanyWithContactsMutationVariables>(ImportCompanyWithContactsDocument, options);
      }
export type ImportCompanyWithContactsMutationHookResult = ReturnType<typeof useImportCompanyWithContactsMutation>;
export type ImportCompanyWithContactsMutationResult = Apollo.MutationResult<ImportCompanyWithContactsMutation>;
export type ImportCompanyWithContactsMutationOptions = Apollo.BaseMutationOptions<ImportCompanyWithContactsMutation, ImportCompanyWithContactsMutationVariables>;
export const EnhanceCompanyDocument = gql`
    mutation EnhanceCompany($id: Int, $key: String) {
  enhanceCompany(id: $id, key: $key) {
    success
    message
    companyId
    companyKey
  }
}
    `;
export type EnhanceCompanyMutationFn = Apollo.MutationFunction<EnhanceCompanyMutation, EnhanceCompanyMutationVariables>;

/**
 * __useEnhanceCompanyMutation__
 *
 * To run a mutation, you first call `useEnhanceCompanyMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useEnhanceCompanyMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [enhanceCompanyMutation, { data, loading, error }] = useEnhanceCompanyMutation({
 *   variables: {
 *      id: // value for 'id'
 *      key: // value for 'key'
 *   },
 * });
 */
export function useEnhanceCompanyMutation(baseOptions?: Apollo.MutationHookOptions<EnhanceCompanyMutation, EnhanceCompanyMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<EnhanceCompanyMutation, EnhanceCompanyMutationVariables>(EnhanceCompanyDocument, options);
      }
export type EnhanceCompanyMutationHookResult = ReturnType<typeof useEnhanceCompanyMutation>;
export type EnhanceCompanyMutationResult = Apollo.MutationResult<EnhanceCompanyMutation>;
export type EnhanceCompanyMutationOptions = Apollo.BaseMutationOptions<EnhanceCompanyMutation, EnhanceCompanyMutationVariables>;
export const AnalyzeCompanyDocument = gql`
    mutation AnalyzeCompany($id: Int, $key: String) {
  analyzeCompany(id: $id, key: $key) {
    success
    message
    companyId
    companyKey
  }
}
    `;
export type AnalyzeCompanyMutationFn = Apollo.MutationFunction<AnalyzeCompanyMutation, AnalyzeCompanyMutationVariables>;

/**
 * __useAnalyzeCompanyMutation__
 *
 * To run a mutation, you first call `useAnalyzeCompanyMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useAnalyzeCompanyMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [analyzeCompanyMutation, { data, loading, error }] = useAnalyzeCompanyMutation({
 *   variables: {
 *      id: // value for 'id'
 *      key: // value for 'key'
 *   },
 * });
 */
export function useAnalyzeCompanyMutation(baseOptions?: Apollo.MutationHookOptions<AnalyzeCompanyMutation, AnalyzeCompanyMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<AnalyzeCompanyMutation, AnalyzeCompanyMutationVariables>(AnalyzeCompanyDocument, options);
      }
export type AnalyzeCompanyMutationHookResult = ReturnType<typeof useAnalyzeCompanyMutation>;
export type AnalyzeCompanyMutationResult = Apollo.MutationResult<AnalyzeCompanyMutation>;
export type AnalyzeCompanyMutationOptions = Apollo.BaseMutationOptions<AnalyzeCompanyMutation, AnalyzeCompanyMutationVariables>;
export const ImportCompaniesDocument = gql`
    mutation ImportCompanies($companies: [CompanyImportInput!]!) {
  importCompanies(companies: $companies) {
    success
    imported
    failed
    errors
  }
}
    `;
export type ImportCompaniesMutationFn = Apollo.MutationFunction<ImportCompaniesMutation, ImportCompaniesMutationVariables>;

/**
 * __useImportCompaniesMutation__
 *
 * To run a mutation, you first call `useImportCompaniesMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useImportCompaniesMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [importCompaniesMutation, { data, loading, error }] = useImportCompaniesMutation({
 *   variables: {
 *      companies: // value for 'companies'
 *   },
 * });
 */
export function useImportCompaniesMutation(baseOptions?: Apollo.MutationHookOptions<ImportCompaniesMutation, ImportCompaniesMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<ImportCompaniesMutation, ImportCompaniesMutationVariables>(ImportCompaniesDocument, options);
      }
export type ImportCompaniesMutationHookResult = ReturnType<typeof useImportCompaniesMutation>;
export type ImportCompaniesMutationResult = Apollo.MutationResult<ImportCompaniesMutation>;
export type ImportCompaniesMutationOptions = Apollo.BaseMutationOptions<ImportCompaniesMutation, ImportCompaniesMutationVariables>;
export const BlockCompanyDocument = gql`
    mutation BlockCompany($id: Int!) {
  blockCompany(id: $id) {
    id
    key
    blocked
  }
}
    `;
export type BlockCompanyMutationFn = Apollo.MutationFunction<BlockCompanyMutation, BlockCompanyMutationVariables>;

/**
 * __useBlockCompanyMutation__
 *
 * To run a mutation, you first call `useBlockCompanyMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useBlockCompanyMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [blockCompanyMutation, { data, loading, error }] = useBlockCompanyMutation({
 *   variables: {
 *      id: // value for 'id'
 *   },
 * });
 */
export function useBlockCompanyMutation(baseOptions?: Apollo.MutationHookOptions<BlockCompanyMutation, BlockCompanyMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<BlockCompanyMutation, BlockCompanyMutationVariables>(BlockCompanyDocument, options);
      }
export type BlockCompanyMutationHookResult = ReturnType<typeof useBlockCompanyMutation>;
export type BlockCompanyMutationResult = Apollo.MutationResult<BlockCompanyMutation>;
export type BlockCompanyMutationOptions = Apollo.BaseMutationOptions<BlockCompanyMutation, BlockCompanyMutationVariables>;
export const UnblockCompanyDocument = gql`
    mutation UnblockCompany($id: Int!) {
  unblockCompany(id: $id) {
    id
    key
    blocked
  }
}
    `;
export type UnblockCompanyMutationFn = Apollo.MutationFunction<UnblockCompanyMutation, UnblockCompanyMutationVariables>;

/**
 * __useUnblockCompanyMutation__
 *
 * To run a mutation, you first call `useUnblockCompanyMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useUnblockCompanyMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [unblockCompanyMutation, { data, loading, error }] = useUnblockCompanyMutation({
 *   variables: {
 *      id: // value for 'id'
 *   },
 * });
 */
export function useUnblockCompanyMutation(baseOptions?: Apollo.MutationHookOptions<UnblockCompanyMutation, UnblockCompanyMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<UnblockCompanyMutation, UnblockCompanyMutationVariables>(UnblockCompanyDocument, options);
      }
export type UnblockCompanyMutationHookResult = ReturnType<typeof useUnblockCompanyMutation>;
export type UnblockCompanyMutationResult = Apollo.MutationResult<UnblockCompanyMutation>;
export type UnblockCompanyMutationOptions = Apollo.BaseMutationOptions<UnblockCompanyMutation, UnblockCompanyMutationVariables>;
export const GetCompanyDocument = gql`
    query GetCompany($id: Int, $key: String) {
  company(id: $id, key: $key) {
    ...CompanyFields
  }
}
    ${CompanyFieldsFragmentDoc}`;

/**
 * __useGetCompanyQuery__
 *
 * To run a query within a React component, call `useGetCompanyQuery` and pass it any options that fit your needs.
 * When your component renders, `useGetCompanyQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useGetCompanyQuery({
 *   variables: {
 *      id: // value for 'id'
 *      key: // value for 'key'
 *   },
 * });
 */
export function useGetCompanyQuery(baseOptions?: Apollo.QueryHookOptions<GetCompanyQuery, GetCompanyQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<GetCompanyQuery, GetCompanyQueryVariables>(GetCompanyDocument, options);
      }
export function useGetCompanyLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<GetCompanyQuery, GetCompanyQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<GetCompanyQuery, GetCompanyQueryVariables>(GetCompanyDocument, options);
        }
// @ts-ignore
export function useGetCompanySuspenseQuery(baseOptions?: Apollo.SuspenseQueryHookOptions<GetCompanyQuery, GetCompanyQueryVariables>): Apollo.UseSuspenseQueryResult<GetCompanyQuery, GetCompanyQueryVariables>;
export function useGetCompanySuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<GetCompanyQuery, GetCompanyQueryVariables>): Apollo.UseSuspenseQueryResult<GetCompanyQuery | undefined, GetCompanyQueryVariables>;
export function useGetCompanySuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<GetCompanyQuery, GetCompanyQueryVariables>) {
          const options = baseOptions === Apollo.skipToken ? baseOptions : {...defaultOptions, ...baseOptions}
          return Apollo.useSuspenseQuery<GetCompanyQuery, GetCompanyQueryVariables>(GetCompanyDocument, options);
        }
export type GetCompanyQueryHookResult = ReturnType<typeof useGetCompanyQuery>;
export type GetCompanyLazyQueryHookResult = ReturnType<typeof useGetCompanyLazyQuery>;
export type GetCompanySuspenseQueryHookResult = ReturnType<typeof useGetCompanySuspenseQuery>;
export type GetCompanyQueryResult = Apollo.QueryResult<GetCompanyQuery, GetCompanyQueryVariables>;
export const GetCompaniesDocument = gql`
    query GetCompanies($text: String, $order_by: CompanyOrderBy, $limit: Int, $offset: Int) {
  companies(
    filter: {text: $text}
    order_by: $order_by
    limit: $limit
    offset: $offset
  ) {
    companies {
      ...CompanyFields
    }
    totalCount
  }
}
    ${CompanyFieldsFragmentDoc}`;

/**
 * __useGetCompaniesQuery__
 *
 * To run a query within a React component, call `useGetCompaniesQuery` and pass it any options that fit your needs.
 * When your component renders, `useGetCompaniesQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useGetCompaniesQuery({
 *   variables: {
 *      text: // value for 'text'
 *      order_by: // value for 'order_by'
 *      limit: // value for 'limit'
 *      offset: // value for 'offset'
 *   },
 * });
 */
export function useGetCompaniesQuery(baseOptions?: Apollo.QueryHookOptions<GetCompaniesQuery, GetCompaniesQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<GetCompaniesQuery, GetCompaniesQueryVariables>(GetCompaniesDocument, options);
      }
export function useGetCompaniesLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<GetCompaniesQuery, GetCompaniesQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<GetCompaniesQuery, GetCompaniesQueryVariables>(GetCompaniesDocument, options);
        }
// @ts-ignore
export function useGetCompaniesSuspenseQuery(baseOptions?: Apollo.SuspenseQueryHookOptions<GetCompaniesQuery, GetCompaniesQueryVariables>): Apollo.UseSuspenseQueryResult<GetCompaniesQuery, GetCompaniesQueryVariables>;
export function useGetCompaniesSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<GetCompaniesQuery, GetCompaniesQueryVariables>): Apollo.UseSuspenseQueryResult<GetCompaniesQuery | undefined, GetCompaniesQueryVariables>;
export function useGetCompaniesSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<GetCompaniesQuery, GetCompaniesQueryVariables>) {
          const options = baseOptions === Apollo.skipToken ? baseOptions : {...defaultOptions, ...baseOptions}
          return Apollo.useSuspenseQuery<GetCompaniesQuery, GetCompaniesQueryVariables>(GetCompaniesDocument, options);
        }
export type GetCompaniesQueryHookResult = ReturnType<typeof useGetCompaniesQuery>;
export type GetCompaniesLazyQueryHookResult = ReturnType<typeof useGetCompaniesLazyQuery>;
export type GetCompaniesSuspenseQueryHookResult = ReturnType<typeof useGetCompaniesSuspenseQuery>;
export type GetCompaniesQueryResult = Apollo.QueryResult<GetCompaniesQuery, GetCompaniesQueryVariables>;
export const SearchCompaniesDocument = gql`
    query SearchCompanies($filter: CompanyFilterInput!, $order_by: CompanyOrderBy, $limit: Int, $offset: Int) {
  companies(filter: $filter, order_by: $order_by, limit: $limit, offset: $offset) {
    companies {
      ...CompanyFields
    }
    totalCount
  }
}
    ${CompanyFieldsFragmentDoc}`;

/**
 * __useSearchCompaniesQuery__
 *
 * To run a query within a React component, call `useSearchCompaniesQuery` and pass it any options that fit your needs.
 * When your component renders, `useSearchCompaniesQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useSearchCompaniesQuery({
 *   variables: {
 *      filter: // value for 'filter'
 *      order_by: // value for 'order_by'
 *      limit: // value for 'limit'
 *      offset: // value for 'offset'
 *   },
 * });
 */
export function useSearchCompaniesQuery(baseOptions: Apollo.QueryHookOptions<SearchCompaniesQuery, SearchCompaniesQueryVariables> & ({ variables: SearchCompaniesQueryVariables; skip?: boolean; } | { skip: boolean; }) ) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<SearchCompaniesQuery, SearchCompaniesQueryVariables>(SearchCompaniesDocument, options);
      }
export function useSearchCompaniesLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<SearchCompaniesQuery, SearchCompaniesQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<SearchCompaniesQuery, SearchCompaniesQueryVariables>(SearchCompaniesDocument, options);
        }
// @ts-ignore
export function useSearchCompaniesSuspenseQuery(baseOptions?: Apollo.SuspenseQueryHookOptions<SearchCompaniesQuery, SearchCompaniesQueryVariables>): Apollo.UseSuspenseQueryResult<SearchCompaniesQuery, SearchCompaniesQueryVariables>;
export function useSearchCompaniesSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<SearchCompaniesQuery, SearchCompaniesQueryVariables>): Apollo.UseSuspenseQueryResult<SearchCompaniesQuery | undefined, SearchCompaniesQueryVariables>;
export function useSearchCompaniesSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<SearchCompaniesQuery, SearchCompaniesQueryVariables>) {
          const options = baseOptions === Apollo.skipToken ? baseOptions : {...defaultOptions, ...baseOptions}
          return Apollo.useSuspenseQuery<SearchCompaniesQuery, SearchCompaniesQueryVariables>(SearchCompaniesDocument, options);
        }
export type SearchCompaniesQueryHookResult = ReturnType<typeof useSearchCompaniesQuery>;
export type SearchCompaniesLazyQueryHookResult = ReturnType<typeof useSearchCompaniesLazyQuery>;
export type SearchCompaniesSuspenseQueryHookResult = ReturnType<typeof useSearchCompaniesSuspenseQuery>;
export type SearchCompaniesQueryResult = Apollo.QueryResult<SearchCompaniesQuery, SearchCompaniesQueryVariables>;
export const GetCompanyFactsDocument = gql`
    query GetCompanyFacts($company_id: Int!, $field: String, $limit: Int, $offset: Int) {
  company_facts(
    company_id: $company_id
    field: $field
    limit: $limit
    offset: $offset
  ) {
    ...CompanyFactFields
  }
}
    ${CompanyFactFieldsFragmentDoc}`;

/**
 * __useGetCompanyFactsQuery__
 *
 * To run a query within a React component, call `useGetCompanyFactsQuery` and pass it any options that fit your needs.
 * When your component renders, `useGetCompanyFactsQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useGetCompanyFactsQuery({
 *   variables: {
 *      company_id: // value for 'company_id'
 *      field: // value for 'field'
 *      limit: // value for 'limit'
 *      offset: // value for 'offset'
 *   },
 * });
 */
export function useGetCompanyFactsQuery(baseOptions: Apollo.QueryHookOptions<GetCompanyFactsQuery, GetCompanyFactsQueryVariables> & ({ variables: GetCompanyFactsQueryVariables; skip?: boolean; } | { skip: boolean; }) ) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<GetCompanyFactsQuery, GetCompanyFactsQueryVariables>(GetCompanyFactsDocument, options);
      }
export function useGetCompanyFactsLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<GetCompanyFactsQuery, GetCompanyFactsQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<GetCompanyFactsQuery, GetCompanyFactsQueryVariables>(GetCompanyFactsDocument, options);
        }
// @ts-ignore
export function useGetCompanyFactsSuspenseQuery(baseOptions?: Apollo.SuspenseQueryHookOptions<GetCompanyFactsQuery, GetCompanyFactsQueryVariables>): Apollo.UseSuspenseQueryResult<GetCompanyFactsQuery, GetCompanyFactsQueryVariables>;
export function useGetCompanyFactsSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<GetCompanyFactsQuery, GetCompanyFactsQueryVariables>): Apollo.UseSuspenseQueryResult<GetCompanyFactsQuery | undefined, GetCompanyFactsQueryVariables>;
export function useGetCompanyFactsSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<GetCompanyFactsQuery, GetCompanyFactsQueryVariables>) {
          const options = baseOptions === Apollo.skipToken ? baseOptions : {...defaultOptions, ...baseOptions}
          return Apollo.useSuspenseQuery<GetCompanyFactsQuery, GetCompanyFactsQueryVariables>(GetCompanyFactsDocument, options);
        }
export type GetCompanyFactsQueryHookResult = ReturnType<typeof useGetCompanyFactsQuery>;
export type GetCompanyFactsLazyQueryHookResult = ReturnType<typeof useGetCompanyFactsLazyQuery>;
export type GetCompanyFactsSuspenseQueryHookResult = ReturnType<typeof useGetCompanyFactsSuspenseQuery>;
export type GetCompanyFactsQueryResult = Apollo.QueryResult<GetCompanyFactsQuery, GetCompanyFactsQueryVariables>;
export const CompanyAuditDocument = gql`
    query CompanyAudit($key: String!) {
  company(key: $key) {
    ...CompanyFields
    facts(limit: 200) {
      ...CompanyFactFields
    }
    facts_count
    snapshots(limit: 10) {
      ...CompanySnapshotFields
    }
    snapshots_count
  }
}
    ${CompanyFieldsFragmentDoc}
${CompanyFactFieldsFragmentDoc}
${CompanySnapshotFieldsFragmentDoc}`;

/**
 * __useCompanyAuditQuery__
 *
 * To run a query within a React component, call `useCompanyAuditQuery` and pass it any options that fit your needs.
 * When your component renders, `useCompanyAuditQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useCompanyAuditQuery({
 *   variables: {
 *      key: // value for 'key'
 *   },
 * });
 */
export function useCompanyAuditQuery(baseOptions: Apollo.QueryHookOptions<CompanyAuditQuery, CompanyAuditQueryVariables> & ({ variables: CompanyAuditQueryVariables; skip?: boolean; } | { skip: boolean; }) ) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<CompanyAuditQuery, CompanyAuditQueryVariables>(CompanyAuditDocument, options);
      }
export function useCompanyAuditLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<CompanyAuditQuery, CompanyAuditQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<CompanyAuditQuery, CompanyAuditQueryVariables>(CompanyAuditDocument, options);
        }
// @ts-ignore
export function useCompanyAuditSuspenseQuery(baseOptions?: Apollo.SuspenseQueryHookOptions<CompanyAuditQuery, CompanyAuditQueryVariables>): Apollo.UseSuspenseQueryResult<CompanyAuditQuery, CompanyAuditQueryVariables>;
export function useCompanyAuditSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<CompanyAuditQuery, CompanyAuditQueryVariables>): Apollo.UseSuspenseQueryResult<CompanyAuditQuery | undefined, CompanyAuditQueryVariables>;
export function useCompanyAuditSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<CompanyAuditQuery, CompanyAuditQueryVariables>) {
          const options = baseOptions === Apollo.skipToken ? baseOptions : {...defaultOptions, ...baseOptions}
          return Apollo.useSuspenseQuery<CompanyAuditQuery, CompanyAuditQueryVariables>(CompanyAuditDocument, options);
        }
export type CompanyAuditQueryHookResult = ReturnType<typeof useCompanyAuditQuery>;
export type CompanyAuditLazyQueryHookResult = ReturnType<typeof useCompanyAuditLazyQuery>;
export type CompanyAuditSuspenseQueryHookResult = ReturnType<typeof useCompanyAuditSuspenseQuery>;
export type CompanyAuditQueryResult = Apollo.QueryResult<CompanyAuditQuery, CompanyAuditQueryVariables>;
export const CompetitorAnalysesDocument = gql`
    query CompetitorAnalyses {
  competitorAnalyses {
    ...CompetitorAnalysisCore
    competitors {
      id
      name
      status
    }
  }
}
    ${CompetitorAnalysisCoreFragmentDoc}`;

/**
 * __useCompetitorAnalysesQuery__
 *
 * To run a query within a React component, call `useCompetitorAnalysesQuery` and pass it any options that fit your needs.
 * When your component renders, `useCompetitorAnalysesQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useCompetitorAnalysesQuery({
 *   variables: {
 *   },
 * });
 */
export function useCompetitorAnalysesQuery(baseOptions?: Apollo.QueryHookOptions<CompetitorAnalysesQuery, CompetitorAnalysesQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<CompetitorAnalysesQuery, CompetitorAnalysesQueryVariables>(CompetitorAnalysesDocument, options);
      }
export function useCompetitorAnalysesLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<CompetitorAnalysesQuery, CompetitorAnalysesQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<CompetitorAnalysesQuery, CompetitorAnalysesQueryVariables>(CompetitorAnalysesDocument, options);
        }
// @ts-ignore
export function useCompetitorAnalysesSuspenseQuery(baseOptions?: Apollo.SuspenseQueryHookOptions<CompetitorAnalysesQuery, CompetitorAnalysesQueryVariables>): Apollo.UseSuspenseQueryResult<CompetitorAnalysesQuery, CompetitorAnalysesQueryVariables>;
export function useCompetitorAnalysesSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<CompetitorAnalysesQuery, CompetitorAnalysesQueryVariables>): Apollo.UseSuspenseQueryResult<CompetitorAnalysesQuery | undefined, CompetitorAnalysesQueryVariables>;
export function useCompetitorAnalysesSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<CompetitorAnalysesQuery, CompetitorAnalysesQueryVariables>) {
          const options = baseOptions === Apollo.skipToken ? baseOptions : {...defaultOptions, ...baseOptions}
          return Apollo.useSuspenseQuery<CompetitorAnalysesQuery, CompetitorAnalysesQueryVariables>(CompetitorAnalysesDocument, options);
        }
export type CompetitorAnalysesQueryHookResult = ReturnType<typeof useCompetitorAnalysesQuery>;
export type CompetitorAnalysesLazyQueryHookResult = ReturnType<typeof useCompetitorAnalysesLazyQuery>;
export type CompetitorAnalysesSuspenseQueryHookResult = ReturnType<typeof useCompetitorAnalysesSuspenseQuery>;
export type CompetitorAnalysesQueryResult = Apollo.QueryResult<CompetitorAnalysesQuery, CompetitorAnalysesQueryVariables>;
export const CompetitorAnalysisDocument = gql`
    query CompetitorAnalysis($id: Int!) {
  competitorAnalysis(id: $id) {
    ...CompetitorAnalysisCore
    competitors {
      ...CompetitorFull
    }
  }
}
    ${CompetitorAnalysisCoreFragmentDoc}
${CompetitorFullFragmentDoc}`;

/**
 * __useCompetitorAnalysisQuery__
 *
 * To run a query within a React component, call `useCompetitorAnalysisQuery` and pass it any options that fit your needs.
 * When your component renders, `useCompetitorAnalysisQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useCompetitorAnalysisQuery({
 *   variables: {
 *      id: // value for 'id'
 *   },
 * });
 */
export function useCompetitorAnalysisQuery(baseOptions: Apollo.QueryHookOptions<CompetitorAnalysisQuery, CompetitorAnalysisQueryVariables> & ({ variables: CompetitorAnalysisQueryVariables; skip?: boolean; } | { skip: boolean; }) ) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<CompetitorAnalysisQuery, CompetitorAnalysisQueryVariables>(CompetitorAnalysisDocument, options);
      }
export function useCompetitorAnalysisLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<CompetitorAnalysisQuery, CompetitorAnalysisQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<CompetitorAnalysisQuery, CompetitorAnalysisQueryVariables>(CompetitorAnalysisDocument, options);
        }
// @ts-ignore
export function useCompetitorAnalysisSuspenseQuery(baseOptions?: Apollo.SuspenseQueryHookOptions<CompetitorAnalysisQuery, CompetitorAnalysisQueryVariables>): Apollo.UseSuspenseQueryResult<CompetitorAnalysisQuery, CompetitorAnalysisQueryVariables>;
export function useCompetitorAnalysisSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<CompetitorAnalysisQuery, CompetitorAnalysisQueryVariables>): Apollo.UseSuspenseQueryResult<CompetitorAnalysisQuery | undefined, CompetitorAnalysisQueryVariables>;
export function useCompetitorAnalysisSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<CompetitorAnalysisQuery, CompetitorAnalysisQueryVariables>) {
          const options = baseOptions === Apollo.skipToken ? baseOptions : {...defaultOptions, ...baseOptions}
          return Apollo.useSuspenseQuery<CompetitorAnalysisQuery, CompetitorAnalysisQueryVariables>(CompetitorAnalysisDocument, options);
        }
export type CompetitorAnalysisQueryHookResult = ReturnType<typeof useCompetitorAnalysisQuery>;
export type CompetitorAnalysisLazyQueryHookResult = ReturnType<typeof useCompetitorAnalysisLazyQuery>;
export type CompetitorAnalysisSuspenseQueryHookResult = ReturnType<typeof useCompetitorAnalysisSuspenseQuery>;
export type CompetitorAnalysisQueryResult = Apollo.QueryResult<CompetitorAnalysisQuery, CompetitorAnalysisQueryVariables>;
export const CreateCompetitorAnalysisDocument = gql`
    mutation CreateCompetitorAnalysis($productId: Int!) {
  createCompetitorAnalysis(productId: $productId) {
    ...CompetitorAnalysisCore
    competitors {
      ...CompetitorCore
    }
  }
}
    ${CompetitorAnalysisCoreFragmentDoc}
${CompetitorCoreFragmentDoc}`;
export type CreateCompetitorAnalysisMutationFn = Apollo.MutationFunction<CreateCompetitorAnalysisMutation, CreateCompetitorAnalysisMutationVariables>;

/**
 * __useCreateCompetitorAnalysisMutation__
 *
 * To run a mutation, you first call `useCreateCompetitorAnalysisMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useCreateCompetitorAnalysisMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [createCompetitorAnalysisMutation, { data, loading, error }] = useCreateCompetitorAnalysisMutation({
 *   variables: {
 *      productId: // value for 'productId'
 *   },
 * });
 */
export function useCreateCompetitorAnalysisMutation(baseOptions?: Apollo.MutationHookOptions<CreateCompetitorAnalysisMutation, CreateCompetitorAnalysisMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<CreateCompetitorAnalysisMutation, CreateCompetitorAnalysisMutationVariables>(CreateCompetitorAnalysisDocument, options);
      }
export type CreateCompetitorAnalysisMutationHookResult = ReturnType<typeof useCreateCompetitorAnalysisMutation>;
export type CreateCompetitorAnalysisMutationResult = Apollo.MutationResult<CreateCompetitorAnalysisMutation>;
export type CreateCompetitorAnalysisMutationOptions = Apollo.BaseMutationOptions<CreateCompetitorAnalysisMutation, CreateCompetitorAnalysisMutationVariables>;
export const ApproveCompetitorsDocument = gql`
    mutation ApproveCompetitors($analysisId: Int!, $competitors: [CompetitorInput!]!) {
  approveCompetitors(analysisId: $analysisId, competitors: $competitors) {
    ...CompetitorAnalysisCore
    competitors {
      ...CompetitorCore
    }
  }
}
    ${CompetitorAnalysisCoreFragmentDoc}
${CompetitorCoreFragmentDoc}`;
export type ApproveCompetitorsMutationFn = Apollo.MutationFunction<ApproveCompetitorsMutation, ApproveCompetitorsMutationVariables>;

/**
 * __useApproveCompetitorsMutation__
 *
 * To run a mutation, you first call `useApproveCompetitorsMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useApproveCompetitorsMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [approveCompetitorsMutation, { data, loading, error }] = useApproveCompetitorsMutation({
 *   variables: {
 *      analysisId: // value for 'analysisId'
 *      competitors: // value for 'competitors'
 *   },
 * });
 */
export function useApproveCompetitorsMutation(baseOptions?: Apollo.MutationHookOptions<ApproveCompetitorsMutation, ApproveCompetitorsMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<ApproveCompetitorsMutation, ApproveCompetitorsMutationVariables>(ApproveCompetitorsDocument, options);
      }
export type ApproveCompetitorsMutationHookResult = ReturnType<typeof useApproveCompetitorsMutation>;
export type ApproveCompetitorsMutationResult = Apollo.MutationResult<ApproveCompetitorsMutation>;
export type ApproveCompetitorsMutationOptions = Apollo.BaseMutationOptions<ApproveCompetitorsMutation, ApproveCompetitorsMutationVariables>;
export const RescrapeCompetitorDocument = gql`
    mutation RescrapeCompetitor($competitorId: Int!) {
  rescrapeCompetitor(competitorId: $competitorId) {
    ...CompetitorFull
  }
}
    ${CompetitorFullFragmentDoc}`;
export type RescrapeCompetitorMutationFn = Apollo.MutationFunction<RescrapeCompetitorMutation, RescrapeCompetitorMutationVariables>;

/**
 * __useRescrapeCompetitorMutation__
 *
 * To run a mutation, you first call `useRescrapeCompetitorMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useRescrapeCompetitorMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [rescrapeCompetitorMutation, { data, loading, error }] = useRescrapeCompetitorMutation({
 *   variables: {
 *      competitorId: // value for 'competitorId'
 *   },
 * });
 */
export function useRescrapeCompetitorMutation(baseOptions?: Apollo.MutationHookOptions<RescrapeCompetitorMutation, RescrapeCompetitorMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<RescrapeCompetitorMutation, RescrapeCompetitorMutationVariables>(RescrapeCompetitorDocument, options);
      }
export type RescrapeCompetitorMutationHookResult = ReturnType<typeof useRescrapeCompetitorMutation>;
export type RescrapeCompetitorMutationResult = Apollo.MutationResult<RescrapeCompetitorMutation>;
export type RescrapeCompetitorMutationOptions = Apollo.BaseMutationOptions<RescrapeCompetitorMutation, RescrapeCompetitorMutationVariables>;
export const DeleteCompetitorAnalysisDocument = gql`
    mutation DeleteCompetitorAnalysis($id: Int!) {
  deleteCompetitorAnalysis(id: $id)
}
    `;
export type DeleteCompetitorAnalysisMutationFn = Apollo.MutationFunction<DeleteCompetitorAnalysisMutation, DeleteCompetitorAnalysisMutationVariables>;

/**
 * __useDeleteCompetitorAnalysisMutation__
 *
 * To run a mutation, you first call `useDeleteCompetitorAnalysisMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useDeleteCompetitorAnalysisMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [deleteCompetitorAnalysisMutation, { data, loading, error }] = useDeleteCompetitorAnalysisMutation({
 *   variables: {
 *      id: // value for 'id'
 *   },
 * });
 */
export function useDeleteCompetitorAnalysisMutation(baseOptions?: Apollo.MutationHookOptions<DeleteCompetitorAnalysisMutation, DeleteCompetitorAnalysisMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<DeleteCompetitorAnalysisMutation, DeleteCompetitorAnalysisMutationVariables>(DeleteCompetitorAnalysisDocument, options);
      }
export type DeleteCompetitorAnalysisMutationHookResult = ReturnType<typeof useDeleteCompetitorAnalysisMutation>;
export type DeleteCompetitorAnalysisMutationResult = Apollo.MutationResult<DeleteCompetitorAnalysisMutation>;
export type DeleteCompetitorAnalysisMutationOptions = Apollo.BaseMutationOptions<DeleteCompetitorAnalysisMutation, DeleteCompetitorAnalysisMutationVariables>;
export const GetContactDocument = gql`
    query GetContact($id: Int, $slug: String) {
  contact(id: $id, slug: $slug) {
    id
    slug
    firstName
    lastName
    email
    emails
    bouncedEmails
    linkedinUrl
    company
    companyId
    position
    emailVerified
    doNotContact
    githubHandle
    telegramHandle
    tags
    notes
    forwardingAlias
    forwardingAliasRuleId
    nbStatus
    nbResult
    nbFlags
    nbSuggestedCorrection
    createdAt
    updatedAt
    aiProfile {
      trigger
      enrichedAt
      linkedinHeadline
      linkedinBio
      specialization
      skills
      researchAreas
      experienceLevel
      synthesisConfidence
      synthesisRationale
      githubBio
      githubTopLanguages
      githubTotalStars
      githubAiRepos {
        name
        description
        stars
        topics
      }
      workExperience {
        company
        companyLogo
        title
        employmentType
        startDate
        endDate
        duration
        location
        description
        skills
      }
    }
  }
}
    `;

/**
 * __useGetContactQuery__
 *
 * To run a query within a React component, call `useGetContactQuery` and pass it any options that fit your needs.
 * When your component renders, `useGetContactQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useGetContactQuery({
 *   variables: {
 *      id: // value for 'id'
 *      slug: // value for 'slug'
 *   },
 * });
 */
export function useGetContactQuery(baseOptions?: Apollo.QueryHookOptions<GetContactQuery, GetContactQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<GetContactQuery, GetContactQueryVariables>(GetContactDocument, options);
      }
export function useGetContactLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<GetContactQuery, GetContactQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<GetContactQuery, GetContactQueryVariables>(GetContactDocument, options);
        }
// @ts-ignore
export function useGetContactSuspenseQuery(baseOptions?: Apollo.SuspenseQueryHookOptions<GetContactQuery, GetContactQueryVariables>): Apollo.UseSuspenseQueryResult<GetContactQuery, GetContactQueryVariables>;
export function useGetContactSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<GetContactQuery, GetContactQueryVariables>): Apollo.UseSuspenseQueryResult<GetContactQuery | undefined, GetContactQueryVariables>;
export function useGetContactSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<GetContactQuery, GetContactQueryVariables>) {
          const options = baseOptions === Apollo.skipToken ? baseOptions : {...defaultOptions, ...baseOptions}
          return Apollo.useSuspenseQuery<GetContactQuery, GetContactQueryVariables>(GetContactDocument, options);
        }
export type GetContactQueryHookResult = ReturnType<typeof useGetContactQuery>;
export type GetContactLazyQueryHookResult = ReturnType<typeof useGetContactLazyQuery>;
export type GetContactSuspenseQueryHookResult = ReturnType<typeof useGetContactSuspenseQuery>;
export type GetContactQueryResult = Apollo.QueryResult<GetContactQuery, GetContactQueryVariables>;
export const UpdateContactDocument = gql`
    mutation UpdateContact($id: Int!, $input: UpdateContactInput!) {
  updateContact(id: $id, input: $input) {
    id
    firstName
    lastName
    email
    emails
    linkedinUrl
    position
    githubHandle
    telegramHandle
    doNotContact
    tags
    emailVerified
    updatedAt
  }
}
    `;
export type UpdateContactMutationFn = Apollo.MutationFunction<UpdateContactMutation, UpdateContactMutationVariables>;

/**
 * __useUpdateContactMutation__
 *
 * To run a mutation, you first call `useUpdateContactMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useUpdateContactMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [updateContactMutation, { data, loading, error }] = useUpdateContactMutation({
 *   variables: {
 *      id: // value for 'id'
 *      input: // value for 'input'
 *   },
 * });
 */
export function useUpdateContactMutation(baseOptions?: Apollo.MutationHookOptions<UpdateContactMutation, UpdateContactMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<UpdateContactMutation, UpdateContactMutationVariables>(UpdateContactDocument, options);
      }
export type UpdateContactMutationHookResult = ReturnType<typeof useUpdateContactMutation>;
export type UpdateContactMutationResult = Apollo.MutationResult<UpdateContactMutation>;
export type UpdateContactMutationOptions = Apollo.BaseMutationOptions<UpdateContactMutation, UpdateContactMutationVariables>;
export const DeleteContactDocument = gql`
    mutation DeleteContact($id: Int!) {
  deleteContact(id: $id) {
    success
    message
  }
}
    `;
export type DeleteContactMutationFn = Apollo.MutationFunction<DeleteContactMutation, DeleteContactMutationVariables>;

/**
 * __useDeleteContactMutation__
 *
 * To run a mutation, you first call `useDeleteContactMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useDeleteContactMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [deleteContactMutation, { data, loading, error }] = useDeleteContactMutation({
 *   variables: {
 *      id: // value for 'id'
 *   },
 * });
 */
export function useDeleteContactMutation(baseOptions?: Apollo.MutationHookOptions<DeleteContactMutation, DeleteContactMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<DeleteContactMutation, DeleteContactMutationVariables>(DeleteContactDocument, options);
      }
export type DeleteContactMutationHookResult = ReturnType<typeof useDeleteContactMutation>;
export type DeleteContactMutationResult = Apollo.MutationResult<DeleteContactMutation>;
export type DeleteContactMutationOptions = Apollo.BaseMutationOptions<DeleteContactMutation, DeleteContactMutationVariables>;
export const GetResendEmailDocument = gql`
    query GetResendEmail($resendId: String!) {
  resendEmail(resendId: $resendId) {
    id
    from
    to
    subject
    text
    html
    lastEvent
    createdAt
    scheduledAt
    cc
    bcc
  }
}
    `;

/**
 * __useGetResendEmailQuery__
 *
 * To run a query within a React component, call `useGetResendEmailQuery` and pass it any options that fit your needs.
 * When your component renders, `useGetResendEmailQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useGetResendEmailQuery({
 *   variables: {
 *      resendId: // value for 'resendId'
 *   },
 * });
 */
export function useGetResendEmailQuery(baseOptions: Apollo.QueryHookOptions<GetResendEmailQuery, GetResendEmailQueryVariables> & ({ variables: GetResendEmailQueryVariables; skip?: boolean; } | { skip: boolean; }) ) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<GetResendEmailQuery, GetResendEmailQueryVariables>(GetResendEmailDocument, options);
      }
export function useGetResendEmailLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<GetResendEmailQuery, GetResendEmailQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<GetResendEmailQuery, GetResendEmailQueryVariables>(GetResendEmailDocument, options);
        }
// @ts-ignore
export function useGetResendEmailSuspenseQuery(baseOptions?: Apollo.SuspenseQueryHookOptions<GetResendEmailQuery, GetResendEmailQueryVariables>): Apollo.UseSuspenseQueryResult<GetResendEmailQuery, GetResendEmailQueryVariables>;
export function useGetResendEmailSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<GetResendEmailQuery, GetResendEmailQueryVariables>): Apollo.UseSuspenseQueryResult<GetResendEmailQuery | undefined, GetResendEmailQueryVariables>;
export function useGetResendEmailSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<GetResendEmailQuery, GetResendEmailQueryVariables>) {
          const options = baseOptions === Apollo.skipToken ? baseOptions : {...defaultOptions, ...baseOptions}
          return Apollo.useSuspenseQuery<GetResendEmailQuery, GetResendEmailQueryVariables>(GetResendEmailDocument, options);
        }
export type GetResendEmailQueryHookResult = ReturnType<typeof useGetResendEmailQuery>;
export type GetResendEmailLazyQueryHookResult = ReturnType<typeof useGetResendEmailLazyQuery>;
export type GetResendEmailSuspenseQueryHookResult = ReturnType<typeof useGetResendEmailSuspenseQuery>;
export type GetResendEmailQueryResult = Apollo.QueryResult<GetResendEmailQuery, GetResendEmailQueryVariables>;
export const GetContactMessagesDocument = gql`
    query GetContactMessages($contactId: Int!) {
  contactMessages(contactId: $contactId) {
    id
    channel
    direction
    contactId
    senderName
    senderProfileUrl
    content
    subject
    sentAt
    classification
    createdAt
  }
}
    `;

/**
 * __useGetContactMessagesQuery__
 *
 * To run a query within a React component, call `useGetContactMessagesQuery` and pass it any options that fit your needs.
 * When your component renders, `useGetContactMessagesQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useGetContactMessagesQuery({
 *   variables: {
 *      contactId: // value for 'contactId'
 *   },
 * });
 */
export function useGetContactMessagesQuery(baseOptions: Apollo.QueryHookOptions<GetContactMessagesQuery, GetContactMessagesQueryVariables> & ({ variables: GetContactMessagesQueryVariables; skip?: boolean; } | { skip: boolean; }) ) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<GetContactMessagesQuery, GetContactMessagesQueryVariables>(GetContactMessagesDocument, options);
      }
export function useGetContactMessagesLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<GetContactMessagesQuery, GetContactMessagesQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<GetContactMessagesQuery, GetContactMessagesQueryVariables>(GetContactMessagesDocument, options);
        }
// @ts-ignore
export function useGetContactMessagesSuspenseQuery(baseOptions?: Apollo.SuspenseQueryHookOptions<GetContactMessagesQuery, GetContactMessagesQueryVariables>): Apollo.UseSuspenseQueryResult<GetContactMessagesQuery, GetContactMessagesQueryVariables>;
export function useGetContactMessagesSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<GetContactMessagesQuery, GetContactMessagesQueryVariables>): Apollo.UseSuspenseQueryResult<GetContactMessagesQuery | undefined, GetContactMessagesQueryVariables>;
export function useGetContactMessagesSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<GetContactMessagesQuery, GetContactMessagesQueryVariables>) {
          const options = baseOptions === Apollo.skipToken ? baseOptions : {...defaultOptions, ...baseOptions}
          return Apollo.useSuspenseQuery<GetContactMessagesQuery, GetContactMessagesQueryVariables>(GetContactMessagesDocument, options);
        }
export type GetContactMessagesQueryHookResult = ReturnType<typeof useGetContactMessagesQuery>;
export type GetContactMessagesLazyQueryHookResult = ReturnType<typeof useGetContactMessagesLazyQuery>;
export type GetContactMessagesSuspenseQueryHookResult = ReturnType<typeof useGetContactMessagesSuspenseQuery>;
export type GetContactMessagesQueryResult = Apollo.QueryResult<GetContactMessagesQuery, GetContactMessagesQueryVariables>;
export const GetContactOpportunitiesDocument = gql`
    query GetContactOpportunities($contactId: Int!) {
  contactOpportunities(contactId: $contactId) {
    id
    title
    url
    source
    status
    rewardText
    rewardUsd
    score
    tags
    applied
    appliedAt
    applicationStatus
    companyName
    createdAt
  }
}
    `;

/**
 * __useGetContactOpportunitiesQuery__
 *
 * To run a query within a React component, call `useGetContactOpportunitiesQuery` and pass it any options that fit your needs.
 * When your component renders, `useGetContactOpportunitiesQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useGetContactOpportunitiesQuery({
 *   variables: {
 *      contactId: // value for 'contactId'
 *   },
 * });
 */
export function useGetContactOpportunitiesQuery(baseOptions: Apollo.QueryHookOptions<GetContactOpportunitiesQuery, GetContactOpportunitiesQueryVariables> & ({ variables: GetContactOpportunitiesQueryVariables; skip?: boolean; } | { skip: boolean; }) ) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<GetContactOpportunitiesQuery, GetContactOpportunitiesQueryVariables>(GetContactOpportunitiesDocument, options);
      }
export function useGetContactOpportunitiesLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<GetContactOpportunitiesQuery, GetContactOpportunitiesQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<GetContactOpportunitiesQuery, GetContactOpportunitiesQueryVariables>(GetContactOpportunitiesDocument, options);
        }
// @ts-ignore
export function useGetContactOpportunitiesSuspenseQuery(baseOptions?: Apollo.SuspenseQueryHookOptions<GetContactOpportunitiesQuery, GetContactOpportunitiesQueryVariables>): Apollo.UseSuspenseQueryResult<GetContactOpportunitiesQuery, GetContactOpportunitiesQueryVariables>;
export function useGetContactOpportunitiesSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<GetContactOpportunitiesQuery, GetContactOpportunitiesQueryVariables>): Apollo.UseSuspenseQueryResult<GetContactOpportunitiesQuery | undefined, GetContactOpportunitiesQueryVariables>;
export function useGetContactOpportunitiesSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<GetContactOpportunitiesQuery, GetContactOpportunitiesQueryVariables>) {
          const options = baseOptions === Apollo.skipToken ? baseOptions : {...defaultOptions, ...baseOptions}
          return Apollo.useSuspenseQuery<GetContactOpportunitiesQuery, GetContactOpportunitiesQueryVariables>(GetContactOpportunitiesDocument, options);
        }
export type GetContactOpportunitiesQueryHookResult = ReturnType<typeof useGetContactOpportunitiesQuery>;
export type GetContactOpportunitiesLazyQueryHookResult = ReturnType<typeof useGetContactOpportunitiesLazyQuery>;
export type GetContactOpportunitiesSuspenseQueryHookResult = ReturnType<typeof useGetContactOpportunitiesSuspenseQuery>;
export type GetContactOpportunitiesQueryResult = Apollo.QueryResult<GetContactOpportunitiesQuery, GetContactOpportunitiesQueryVariables>;
export const GetContactEmailsDocument = gql`
    query GetContactEmails($contactId: Int!) {
  contactEmails(contactId: $contactId) {
    id
    resendId
    fromEmail
    toEmails
    subject
    textContent
    status
    sentAt
    recipientName
    replyReceived
    createdAt
    updatedAt
  }
  contactReceivedEmails(contactId: $contactId) {
    id
    fromEmail
    subject
    textContent
    classification
    classificationConfidence
    receivedAt
    createdAt
  }
}
    `;

/**
 * __useGetContactEmailsQuery__
 *
 * To run a query within a React component, call `useGetContactEmailsQuery` and pass it any options that fit your needs.
 * When your component renders, `useGetContactEmailsQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useGetContactEmailsQuery({
 *   variables: {
 *      contactId: // value for 'contactId'
 *   },
 * });
 */
export function useGetContactEmailsQuery(baseOptions: Apollo.QueryHookOptions<GetContactEmailsQuery, GetContactEmailsQueryVariables> & ({ variables: GetContactEmailsQueryVariables; skip?: boolean; } | { skip: boolean; }) ) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<GetContactEmailsQuery, GetContactEmailsQueryVariables>(GetContactEmailsDocument, options);
      }
export function useGetContactEmailsLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<GetContactEmailsQuery, GetContactEmailsQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<GetContactEmailsQuery, GetContactEmailsQueryVariables>(GetContactEmailsDocument, options);
        }
// @ts-ignore
export function useGetContactEmailsSuspenseQuery(baseOptions?: Apollo.SuspenseQueryHookOptions<GetContactEmailsQuery, GetContactEmailsQueryVariables>): Apollo.UseSuspenseQueryResult<GetContactEmailsQuery, GetContactEmailsQueryVariables>;
export function useGetContactEmailsSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<GetContactEmailsQuery, GetContactEmailsQueryVariables>): Apollo.UseSuspenseQueryResult<GetContactEmailsQuery | undefined, GetContactEmailsQueryVariables>;
export function useGetContactEmailsSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<GetContactEmailsQuery, GetContactEmailsQueryVariables>) {
          const options = baseOptions === Apollo.skipToken ? baseOptions : {...defaultOptions, ...baseOptions}
          return Apollo.useSuspenseQuery<GetContactEmailsQuery, GetContactEmailsQueryVariables>(GetContactEmailsDocument, options);
        }
export type GetContactEmailsQueryHookResult = ReturnType<typeof useGetContactEmailsQuery>;
export type GetContactEmailsLazyQueryHookResult = ReturnType<typeof useGetContactEmailsLazyQuery>;
export type GetContactEmailsSuspenseQueryHookResult = ReturnType<typeof useGetContactEmailsSuspenseQuery>;
export type GetContactEmailsQueryResult = Apollo.QueryResult<GetContactEmailsQuery, GetContactEmailsQueryVariables>;
export const GetCompanyContactEmailsDocument = gql`
    query GetCompanyContactEmails($companyId: Int!) {
  companyContactEmails(companyId: $companyId) {
    id
    contactId
    resendId
    fromEmail
    toEmails
    subject
    textContent
    status
    sentAt
    scheduledAt
    recipientName
    createdAt
    updatedAt
    contactFirstName
    contactLastName
    contactPosition
    sequenceType
    sequenceNumber
    replyReceived
    followupStatus
  }
}
    `;

/**
 * __useGetCompanyContactEmailsQuery__
 *
 * To run a query within a React component, call `useGetCompanyContactEmailsQuery` and pass it any options that fit your needs.
 * When your component renders, `useGetCompanyContactEmailsQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useGetCompanyContactEmailsQuery({
 *   variables: {
 *      companyId: // value for 'companyId'
 *   },
 * });
 */
export function useGetCompanyContactEmailsQuery(baseOptions: Apollo.QueryHookOptions<GetCompanyContactEmailsQuery, GetCompanyContactEmailsQueryVariables> & ({ variables: GetCompanyContactEmailsQueryVariables; skip?: boolean; } | { skip: boolean; }) ) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<GetCompanyContactEmailsQuery, GetCompanyContactEmailsQueryVariables>(GetCompanyContactEmailsDocument, options);
      }
export function useGetCompanyContactEmailsLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<GetCompanyContactEmailsQuery, GetCompanyContactEmailsQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<GetCompanyContactEmailsQuery, GetCompanyContactEmailsQueryVariables>(GetCompanyContactEmailsDocument, options);
        }
// @ts-ignore
export function useGetCompanyContactEmailsSuspenseQuery(baseOptions?: Apollo.SuspenseQueryHookOptions<GetCompanyContactEmailsQuery, GetCompanyContactEmailsQueryVariables>): Apollo.UseSuspenseQueryResult<GetCompanyContactEmailsQuery, GetCompanyContactEmailsQueryVariables>;
export function useGetCompanyContactEmailsSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<GetCompanyContactEmailsQuery, GetCompanyContactEmailsQueryVariables>): Apollo.UseSuspenseQueryResult<GetCompanyContactEmailsQuery | undefined, GetCompanyContactEmailsQueryVariables>;
export function useGetCompanyContactEmailsSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<GetCompanyContactEmailsQuery, GetCompanyContactEmailsQueryVariables>) {
          const options = baseOptions === Apollo.skipToken ? baseOptions : {...defaultOptions, ...baseOptions}
          return Apollo.useSuspenseQuery<GetCompanyContactEmailsQuery, GetCompanyContactEmailsQueryVariables>(GetCompanyContactEmailsDocument, options);
        }
export type GetCompanyContactEmailsQueryHookResult = ReturnType<typeof useGetCompanyContactEmailsQuery>;
export type GetCompanyContactEmailsLazyQueryHookResult = ReturnType<typeof useGetCompanyContactEmailsLazyQuery>;
export type GetCompanyContactEmailsSuspenseQueryHookResult = ReturnType<typeof useGetCompanyContactEmailsSuspenseQuery>;
export type GetCompanyContactEmailsQueryResult = Apollo.QueryResult<GetCompanyContactEmailsQuery, GetCompanyContactEmailsQueryVariables>;
export const SyncResendEmailsDocument = gql`
    mutation SyncResendEmails($companyId: Int) {
  syncResendEmails(companyId: $companyId) {
    success
    updatedCount
    skippedCount
    totalCount
    error
  }
}
    `;
export type SyncResendEmailsMutationFn = Apollo.MutationFunction<SyncResendEmailsMutation, SyncResendEmailsMutationVariables>;

/**
 * __useSyncResendEmailsMutation__
 *
 * To run a mutation, you first call `useSyncResendEmailsMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useSyncResendEmailsMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [syncResendEmailsMutation, { data, loading, error }] = useSyncResendEmailsMutation({
 *   variables: {
 *      companyId: // value for 'companyId'
 *   },
 * });
 */
export function useSyncResendEmailsMutation(baseOptions?: Apollo.MutationHookOptions<SyncResendEmailsMutation, SyncResendEmailsMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<SyncResendEmailsMutation, SyncResendEmailsMutationVariables>(SyncResendEmailsDocument, options);
      }
export type SyncResendEmailsMutationHookResult = ReturnType<typeof useSyncResendEmailsMutation>;
export type SyncResendEmailsMutationResult = Apollo.MutationResult<SyncResendEmailsMutation>;
export type SyncResendEmailsMutationOptions = Apollo.BaseMutationOptions<SyncResendEmailsMutation, SyncResendEmailsMutationVariables>;
export const ImportResendEmailsDocument = gql`
    mutation ImportResendEmails($maxEmails: Int) {
  importResendEmails(maxEmails: $maxEmails) {
    success
    totalFetched
    newCount
    updatedCount
    skippedCount
    errorCount
    contactMatchCount
    companyMatchCount
    durationMs
    error
  }
}
    `;
export type ImportResendEmailsMutationFn = Apollo.MutationFunction<ImportResendEmailsMutation, ImportResendEmailsMutationVariables>;

/**
 * __useImportResendEmailsMutation__
 *
 * To run a mutation, you first call `useImportResendEmailsMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useImportResendEmailsMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [importResendEmailsMutation, { data, loading, error }] = useImportResendEmailsMutation({
 *   variables: {
 *      maxEmails: // value for 'maxEmails'
 *   },
 * });
 */
export function useImportResendEmailsMutation(baseOptions?: Apollo.MutationHookOptions<ImportResendEmailsMutation, ImportResendEmailsMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<ImportResendEmailsMutation, ImportResendEmailsMutationVariables>(ImportResendEmailsDocument, options);
      }
export type ImportResendEmailsMutationHookResult = ReturnType<typeof useImportResendEmailsMutation>;
export type ImportResendEmailsMutationResult = Apollo.MutationResult<ImportResendEmailsMutation>;
export type ImportResendEmailsMutationOptions = Apollo.BaseMutationOptions<ImportResendEmailsMutation, ImportResendEmailsMutationVariables>;
export const CancelCompanyEmailsDocument = gql`
    mutation CancelCompanyEmails($companyId: Int!) {
  cancelCompanyEmails(companyId: $companyId) {
    success
    message
    cancelledCount
    failedCount
  }
}
    `;
export type CancelCompanyEmailsMutationFn = Apollo.MutationFunction<CancelCompanyEmailsMutation, CancelCompanyEmailsMutationVariables>;

/**
 * __useCancelCompanyEmailsMutation__
 *
 * To run a mutation, you first call `useCancelCompanyEmailsMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useCancelCompanyEmailsMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [cancelCompanyEmailsMutation, { data, loading, error }] = useCancelCompanyEmailsMutation({
 *   variables: {
 *      companyId: // value for 'companyId'
 *   },
 * });
 */
export function useCancelCompanyEmailsMutation(baseOptions?: Apollo.MutationHookOptions<CancelCompanyEmailsMutation, CancelCompanyEmailsMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<CancelCompanyEmailsMutation, CancelCompanyEmailsMutationVariables>(CancelCompanyEmailsDocument, options);
      }
export type CancelCompanyEmailsMutationHookResult = ReturnType<typeof useCancelCompanyEmailsMutation>;
export type CancelCompanyEmailsMutationResult = Apollo.MutationResult<CancelCompanyEmailsMutation>;
export type CancelCompanyEmailsMutationOptions = Apollo.BaseMutationOptions<CancelCompanyEmailsMutation, CancelCompanyEmailsMutationVariables>;
export const SendScheduledEmailNowDocument = gql`
    mutation SendScheduledEmailNow($resendId: String!) {
  sendScheduledEmailNow(resendId: $resendId) {
    success
    resendId
    error
  }
}
    `;
export type SendScheduledEmailNowMutationFn = Apollo.MutationFunction<SendScheduledEmailNowMutation, SendScheduledEmailNowMutationVariables>;

/**
 * __useSendScheduledEmailNowMutation__
 *
 * To run a mutation, you first call `useSendScheduledEmailNowMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useSendScheduledEmailNowMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [sendScheduledEmailNowMutation, { data, loading, error }] = useSendScheduledEmailNowMutation({
 *   variables: {
 *      resendId: // value for 'resendId'
 *   },
 * });
 */
export function useSendScheduledEmailNowMutation(baseOptions?: Apollo.MutationHookOptions<SendScheduledEmailNowMutation, SendScheduledEmailNowMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<SendScheduledEmailNowMutation, SendScheduledEmailNowMutationVariables>(SendScheduledEmailNowDocument, options);
      }
export type SendScheduledEmailNowMutationHookResult = ReturnType<typeof useSendScheduledEmailNowMutation>;
export type SendScheduledEmailNowMutationResult = Apollo.MutationResult<SendScheduledEmailNowMutation>;
export type SendScheduledEmailNowMutationOptions = Apollo.BaseMutationOptions<SendScheduledEmailNowMutation, SendScheduledEmailNowMutationVariables>;
export const CancelScheduledEmailDocument = gql`
    mutation CancelScheduledEmail($resendId: String!) {
  cancelScheduledEmail(resendId: $resendId) {
    success
    error
  }
}
    `;
export type CancelScheduledEmailMutationFn = Apollo.MutationFunction<CancelScheduledEmailMutation, CancelScheduledEmailMutationVariables>;

/**
 * __useCancelScheduledEmailMutation__
 *
 * To run a mutation, you first call `useCancelScheduledEmailMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useCancelScheduledEmailMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [cancelScheduledEmailMutation, { data, loading, error }] = useCancelScheduledEmailMutation({
 *   variables: {
 *      resendId: // value for 'resendId'
 *   },
 * });
 */
export function useCancelScheduledEmailMutation(baseOptions?: Apollo.MutationHookOptions<CancelScheduledEmailMutation, CancelScheduledEmailMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<CancelScheduledEmailMutation, CancelScheduledEmailMutationVariables>(CancelScheduledEmailDocument, options);
      }
export type CancelScheduledEmailMutationHookResult = ReturnType<typeof useCancelScheduledEmailMutation>;
export type CancelScheduledEmailMutationResult = Apollo.MutationResult<CancelScheduledEmailMutation>;
export type CancelScheduledEmailMutationOptions = Apollo.BaseMutationOptions<CancelScheduledEmailMutation, CancelScheduledEmailMutationVariables>;
export const GetContactsDocument = gql`
    query GetContacts($companyId: Int, $search: String, $tag: String, $limit: Int, $offset: Int) {
  contacts(
    companyId: $companyId
    search: $search
    tag: $tag
    limit: $limit
    offset: $offset
  ) {
    contacts {
      id
      slug
      firstName
      lastName
      email
      bouncedEmails
      linkedinUrl
      position
      company
      companyId
      githubHandle
      telegramHandle
      emailVerified
      doNotContact
      nbResult
      tags
      notes
      createdAt
      seniority
      department
      isDecisionMaker
      authorityScore
      nextTouchScore
      lastContactedAt
    }
    totalCount
  }
}
    `;

/**
 * __useGetContactsQuery__
 *
 * To run a query within a React component, call `useGetContactsQuery` and pass it any options that fit your needs.
 * When your component renders, `useGetContactsQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useGetContactsQuery({
 *   variables: {
 *      companyId: // value for 'companyId'
 *      search: // value for 'search'
 *      tag: // value for 'tag'
 *      limit: // value for 'limit'
 *      offset: // value for 'offset'
 *   },
 * });
 */
export function useGetContactsQuery(baseOptions?: Apollo.QueryHookOptions<GetContactsQuery, GetContactsQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<GetContactsQuery, GetContactsQueryVariables>(GetContactsDocument, options);
      }
export function useGetContactsLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<GetContactsQuery, GetContactsQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<GetContactsQuery, GetContactsQueryVariables>(GetContactsDocument, options);
        }
// @ts-ignore
export function useGetContactsSuspenseQuery(baseOptions?: Apollo.SuspenseQueryHookOptions<GetContactsQuery, GetContactsQueryVariables>): Apollo.UseSuspenseQueryResult<GetContactsQuery, GetContactsQueryVariables>;
export function useGetContactsSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<GetContactsQuery, GetContactsQueryVariables>): Apollo.UseSuspenseQueryResult<GetContactsQuery | undefined, GetContactsQueryVariables>;
export function useGetContactsSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<GetContactsQuery, GetContactsQueryVariables>) {
          const options = baseOptions === Apollo.skipToken ? baseOptions : {...defaultOptions, ...baseOptions}
          return Apollo.useSuspenseQuery<GetContactsQuery, GetContactsQueryVariables>(GetContactsDocument, options);
        }
export type GetContactsQueryHookResult = ReturnType<typeof useGetContactsQuery>;
export type GetContactsLazyQueryHookResult = ReturnType<typeof useGetContactsLazyQuery>;
export type GetContactsSuspenseQueryHookResult = ReturnType<typeof useGetContactsSuspenseQuery>;
export type GetContactsQueryResult = Apollo.QueryResult<GetContactsQuery, GetContactsQueryVariables>;
export const ImportContactsDocument = gql`
    mutation ImportContacts($contacts: [ContactInput!]!) {
  importContacts(contacts: $contacts) {
    success
    imported
    failed
    errors
  }
}
    `;
export type ImportContactsMutationFn = Apollo.MutationFunction<ImportContactsMutation, ImportContactsMutationVariables>;

/**
 * __useImportContactsMutation__
 *
 * To run a mutation, you first call `useImportContactsMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useImportContactsMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [importContactsMutation, { data, loading, error }] = useImportContactsMutation({
 *   variables: {
 *      contacts: // value for 'contacts'
 *   },
 * });
 */
export function useImportContactsMutation(baseOptions?: Apollo.MutationHookOptions<ImportContactsMutation, ImportContactsMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<ImportContactsMutation, ImportContactsMutationVariables>(ImportContactsDocument, options);
      }
export type ImportContactsMutationHookResult = ReturnType<typeof useImportContactsMutation>;
export type ImportContactsMutationResult = Apollo.MutationResult<ImportContactsMutation>;
export type ImportContactsMutationOptions = Apollo.BaseMutationOptions<ImportContactsMutation, ImportContactsMutationVariables>;
export const FindContactEmailDocument = gql`
    mutation FindContactEmail($contactId: Int!) {
  findContactEmail(contactId: $contactId) {
    success
    emailFound
    email
    verified
    message
    candidatesTried
  }
}
    `;
export type FindContactEmailMutationFn = Apollo.MutationFunction<FindContactEmailMutation, FindContactEmailMutationVariables>;

/**
 * __useFindContactEmailMutation__
 *
 * To run a mutation, you first call `useFindContactEmailMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useFindContactEmailMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [findContactEmailMutation, { data, loading, error }] = useFindContactEmailMutation({
 *   variables: {
 *      contactId: // value for 'contactId'
 *   },
 * });
 */
export function useFindContactEmailMutation(baseOptions?: Apollo.MutationHookOptions<FindContactEmailMutation, FindContactEmailMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<FindContactEmailMutation, FindContactEmailMutationVariables>(FindContactEmailDocument, options);
      }
export type FindContactEmailMutationHookResult = ReturnType<typeof useFindContactEmailMutation>;
export type FindContactEmailMutationResult = Apollo.MutationResult<FindContactEmailMutation>;
export type FindContactEmailMutationOptions = Apollo.BaseMutationOptions<FindContactEmailMutation, FindContactEmailMutationVariables>;
export const FindCompanyEmailsDocument = gql`
    mutation FindCompanyEmails($companyId: Int!) {
  findCompanyEmails(companyId: $companyId) {
    success
    message
    companiesProcessed
    totalContactsProcessed
    totalEmailsFound
    errors
  }
}
    `;
export type FindCompanyEmailsMutationFn = Apollo.MutationFunction<FindCompanyEmailsMutation, FindCompanyEmailsMutationVariables>;

/**
 * __useFindCompanyEmailsMutation__
 *
 * To run a mutation, you first call `useFindCompanyEmailsMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useFindCompanyEmailsMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [findCompanyEmailsMutation, { data, loading, error }] = useFindCompanyEmailsMutation({
 *   variables: {
 *      companyId: // value for 'companyId'
 *   },
 * });
 */
export function useFindCompanyEmailsMutation(baseOptions?: Apollo.MutationHookOptions<FindCompanyEmailsMutation, FindCompanyEmailsMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<FindCompanyEmailsMutation, FindCompanyEmailsMutationVariables>(FindCompanyEmailsDocument, options);
      }
export type FindCompanyEmailsMutationHookResult = ReturnType<typeof useFindCompanyEmailsMutation>;
export type FindCompanyEmailsMutationResult = Apollo.MutationResult<FindCompanyEmailsMutation>;
export type FindCompanyEmailsMutationOptions = Apollo.BaseMutationOptions<FindCompanyEmailsMutation, FindCompanyEmailsMutationVariables>;
export const EnhanceAllContactsDocument = gql`
    mutation EnhanceAllContacts {
  enhanceAllContacts {
    success
    message
    companiesProcessed
    totalContactsProcessed
    totalEmailsFound
    errors
  }
}
    `;
export type EnhanceAllContactsMutationFn = Apollo.MutationFunction<EnhanceAllContactsMutation, EnhanceAllContactsMutationVariables>;

/**
 * __useEnhanceAllContactsMutation__
 *
 * To run a mutation, you first call `useEnhanceAllContactsMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useEnhanceAllContactsMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [enhanceAllContactsMutation, { data, loading, error }] = useEnhanceAllContactsMutation({
 *   variables: {
 *   },
 * });
 */
export function useEnhanceAllContactsMutation(baseOptions?: Apollo.MutationHookOptions<EnhanceAllContactsMutation, EnhanceAllContactsMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<EnhanceAllContactsMutation, EnhanceAllContactsMutationVariables>(EnhanceAllContactsDocument, options);
      }
export type EnhanceAllContactsMutationHookResult = ReturnType<typeof useEnhanceAllContactsMutation>;
export type EnhanceAllContactsMutationResult = Apollo.MutationResult<EnhanceAllContactsMutation>;
export type EnhanceAllContactsMutationOptions = Apollo.BaseMutationOptions<EnhanceAllContactsMutation, EnhanceAllContactsMutationVariables>;
export const ApplyEmailPatternDocument = gql`
    mutation ApplyEmailPattern($companyId: Int!) {
  applyEmailPattern(companyId: $companyId) {
    success
    message
    contactsUpdated
    pattern
    contacts {
      id
      email
      emailVerified
    }
  }
}
    `;
export type ApplyEmailPatternMutationFn = Apollo.MutationFunction<ApplyEmailPatternMutation, ApplyEmailPatternMutationVariables>;

/**
 * __useApplyEmailPatternMutation__
 *
 * To run a mutation, you first call `useApplyEmailPatternMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useApplyEmailPatternMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [applyEmailPatternMutation, { data, loading, error }] = useApplyEmailPatternMutation({
 *   variables: {
 *      companyId: // value for 'companyId'
 *   },
 * });
 */
export function useApplyEmailPatternMutation(baseOptions?: Apollo.MutationHookOptions<ApplyEmailPatternMutation, ApplyEmailPatternMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<ApplyEmailPatternMutation, ApplyEmailPatternMutationVariables>(ApplyEmailPatternDocument, options);
      }
export type ApplyEmailPatternMutationHookResult = ReturnType<typeof useApplyEmailPatternMutation>;
export type ApplyEmailPatternMutationResult = Apollo.MutationResult<ApplyEmailPatternMutation>;
export type ApplyEmailPatternMutationOptions = Apollo.BaseMutationOptions<ApplyEmailPatternMutation, ApplyEmailPatternMutationVariables>;
export const UnverifyCompanyContactsDocument = gql`
    mutation UnverifyCompanyContacts($companyId: Int!) {
  unverifyCompanyContacts(companyId: $companyId) {
    success
    count
  }
}
    `;
export type UnverifyCompanyContactsMutationFn = Apollo.MutationFunction<UnverifyCompanyContactsMutation, UnverifyCompanyContactsMutationVariables>;

/**
 * __useUnverifyCompanyContactsMutation__
 *
 * To run a mutation, you first call `useUnverifyCompanyContactsMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useUnverifyCompanyContactsMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [unverifyCompanyContactsMutation, { data, loading, error }] = useUnverifyCompanyContactsMutation({
 *   variables: {
 *      companyId: // value for 'companyId'
 *   },
 * });
 */
export function useUnverifyCompanyContactsMutation(baseOptions?: Apollo.MutationHookOptions<UnverifyCompanyContactsMutation, UnverifyCompanyContactsMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<UnverifyCompanyContactsMutation, UnverifyCompanyContactsMutationVariables>(UnverifyCompanyContactsDocument, options);
      }
export type UnverifyCompanyContactsMutationHookResult = ReturnType<typeof useUnverifyCompanyContactsMutation>;
export type UnverifyCompanyContactsMutationResult = Apollo.MutationResult<UnverifyCompanyContactsMutation>;
export type UnverifyCompanyContactsMutationOptions = Apollo.BaseMutationOptions<UnverifyCompanyContactsMutation, UnverifyCompanyContactsMutationVariables>;
export const CreateContactDocument = gql`
    mutation CreateContact($input: CreateContactInput!) {
  createContact(input: $input) {
    id
    slug
    firstName
    lastName
    email
    linkedinUrl
    position
    companyId
    githubHandle
    telegramHandle
    tags
  }
}
    `;
export type CreateContactMutationFn = Apollo.MutationFunction<CreateContactMutation, CreateContactMutationVariables>;

/**
 * __useCreateContactMutation__
 *
 * To run a mutation, you first call `useCreateContactMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useCreateContactMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [createContactMutation, { data, loading, error }] = useCreateContactMutation({
 *   variables: {
 *      input: // value for 'input'
 *   },
 * });
 */
export function useCreateContactMutation(baseOptions?: Apollo.MutationHookOptions<CreateContactMutation, CreateContactMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<CreateContactMutation, CreateContactMutationVariables>(CreateContactDocument, options);
      }
export type CreateContactMutationHookResult = ReturnType<typeof useCreateContactMutation>;
export type CreateContactMutationResult = Apollo.MutationResult<CreateContactMutation>;
export type CreateContactMutationOptions = Apollo.BaseMutationOptions<CreateContactMutation, CreateContactMutationVariables>;
export const MergeDuplicateContactsDocument = gql`
    mutation MergeDuplicateContacts($companyId: Int!) {
  mergeDuplicateContacts(companyId: $companyId) {
    success
    message
    mergedCount
    removedCount
  }
}
    `;
export type MergeDuplicateContactsMutationFn = Apollo.MutationFunction<MergeDuplicateContactsMutation, MergeDuplicateContactsMutationVariables>;

/**
 * __useMergeDuplicateContactsMutation__
 *
 * To run a mutation, you first call `useMergeDuplicateContactsMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useMergeDuplicateContactsMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [mergeDuplicateContactsMutation, { data, loading, error }] = useMergeDuplicateContactsMutation({
 *   variables: {
 *      companyId: // value for 'companyId'
 *   },
 * });
 */
export function useMergeDuplicateContactsMutation(baseOptions?: Apollo.MutationHookOptions<MergeDuplicateContactsMutation, MergeDuplicateContactsMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<MergeDuplicateContactsMutation, MergeDuplicateContactsMutationVariables>(MergeDuplicateContactsDocument, options);
      }
export type MergeDuplicateContactsMutationHookResult = ReturnType<typeof useMergeDuplicateContactsMutation>;
export type MergeDuplicateContactsMutationResult = Apollo.MutationResult<MergeDuplicateContactsMutation>;
export type MergeDuplicateContactsMutationOptions = Apollo.BaseMutationOptions<MergeDuplicateContactsMutation, MergeDuplicateContactsMutationVariables>;
export const MarkContactEmailVerifiedDocument = gql`
    mutation MarkContactEmailVerified($contactId: Int!, $verified: Boolean!) {
  markContactEmailVerified(contactId: $contactId, verified: $verified) {
    id
    email
    emailVerified
  }
}
    `;
export type MarkContactEmailVerifiedMutationFn = Apollo.MutationFunction<MarkContactEmailVerifiedMutation, MarkContactEmailVerifiedMutationVariables>;

/**
 * __useMarkContactEmailVerifiedMutation__
 *
 * To run a mutation, you first call `useMarkContactEmailVerifiedMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useMarkContactEmailVerifiedMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [markContactEmailVerifiedMutation, { data, loading, error }] = useMarkContactEmailVerifiedMutation({
 *   variables: {
 *      contactId: // value for 'contactId'
 *      verified: // value for 'verified'
 *   },
 * });
 */
export function useMarkContactEmailVerifiedMutation(baseOptions?: Apollo.MutationHookOptions<MarkContactEmailVerifiedMutation, MarkContactEmailVerifiedMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<MarkContactEmailVerifiedMutation, MarkContactEmailVerifiedMutationVariables>(MarkContactEmailVerifiedDocument, options);
      }
export type MarkContactEmailVerifiedMutationHookResult = ReturnType<typeof useMarkContactEmailVerifiedMutation>;
export type MarkContactEmailVerifiedMutationResult = Apollo.MutationResult<MarkContactEmailVerifiedMutation>;
export type MarkContactEmailVerifiedMutationOptions = Apollo.BaseMutationOptions<MarkContactEmailVerifiedMutation, MarkContactEmailVerifiedMutationVariables>;
export const VerifyContactEmailDocument = gql`
    mutation VerifyContactEmail($contactId: Int!) {
  verifyContactEmail(contactId: $contactId) {
    success
    verified
    rawResult
    flags
    suggestedCorrection
    message
  }
}
    `;
export type VerifyContactEmailMutationFn = Apollo.MutationFunction<VerifyContactEmailMutation, VerifyContactEmailMutationVariables>;

/**
 * __useVerifyContactEmailMutation__
 *
 * To run a mutation, you first call `useVerifyContactEmailMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useVerifyContactEmailMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [verifyContactEmailMutation, { data, loading, error }] = useVerifyContactEmailMutation({
 *   variables: {
 *      contactId: // value for 'contactId'
 *   },
 * });
 */
export function useVerifyContactEmailMutation(baseOptions?: Apollo.MutationHookOptions<VerifyContactEmailMutation, VerifyContactEmailMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<VerifyContactEmailMutation, VerifyContactEmailMutationVariables>(VerifyContactEmailDocument, options);
      }
export type VerifyContactEmailMutationHookResult = ReturnType<typeof useVerifyContactEmailMutation>;
export type VerifyContactEmailMutationResult = Apollo.MutationResult<VerifyContactEmailMutation>;
export type VerifyContactEmailMutationOptions = Apollo.BaseMutationOptions<VerifyContactEmailMutation, VerifyContactEmailMutationVariables>;
export const GetEmailCampaignsDocument = gql`
    query GetEmailCampaigns($status: String, $limit: Int, $offset: Int) {
  emailCampaigns(status: $status, limit: $limit, offset: $offset) {
    campaigns {
      id
      companyId
      name
      status
      mode
      fromEmail
      totalRecipients
      emailsSent
      emailsScheduled
      emailsFailed
      createdAt
      updatedAt
    }
    totalCount
  }
}
    `;

/**
 * __useGetEmailCampaignsQuery__
 *
 * To run a query within a React component, call `useGetEmailCampaignsQuery` and pass it any options that fit your needs.
 * When your component renders, `useGetEmailCampaignsQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useGetEmailCampaignsQuery({
 *   variables: {
 *      status: // value for 'status'
 *      limit: // value for 'limit'
 *      offset: // value for 'offset'
 *   },
 * });
 */
export function useGetEmailCampaignsQuery(baseOptions?: Apollo.QueryHookOptions<GetEmailCampaignsQuery, GetEmailCampaignsQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<GetEmailCampaignsQuery, GetEmailCampaignsQueryVariables>(GetEmailCampaignsDocument, options);
      }
export function useGetEmailCampaignsLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<GetEmailCampaignsQuery, GetEmailCampaignsQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<GetEmailCampaignsQuery, GetEmailCampaignsQueryVariables>(GetEmailCampaignsDocument, options);
        }
// @ts-ignore
export function useGetEmailCampaignsSuspenseQuery(baseOptions?: Apollo.SuspenseQueryHookOptions<GetEmailCampaignsQuery, GetEmailCampaignsQueryVariables>): Apollo.UseSuspenseQueryResult<GetEmailCampaignsQuery, GetEmailCampaignsQueryVariables>;
export function useGetEmailCampaignsSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<GetEmailCampaignsQuery, GetEmailCampaignsQueryVariables>): Apollo.UseSuspenseQueryResult<GetEmailCampaignsQuery | undefined, GetEmailCampaignsQueryVariables>;
export function useGetEmailCampaignsSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<GetEmailCampaignsQuery, GetEmailCampaignsQueryVariables>) {
          const options = baseOptions === Apollo.skipToken ? baseOptions : {...defaultOptions, ...baseOptions}
          return Apollo.useSuspenseQuery<GetEmailCampaignsQuery, GetEmailCampaignsQueryVariables>(GetEmailCampaignsDocument, options);
        }
export type GetEmailCampaignsQueryHookResult = ReturnType<typeof useGetEmailCampaignsQuery>;
export type GetEmailCampaignsLazyQueryHookResult = ReturnType<typeof useGetEmailCampaignsLazyQuery>;
export type GetEmailCampaignsSuspenseQueryHookResult = ReturnType<typeof useGetEmailCampaignsSuspenseQuery>;
export type GetEmailCampaignsQueryResult = Apollo.QueryResult<GetEmailCampaignsQuery, GetEmailCampaignsQueryVariables>;
export const GetEmailCampaignDocument = gql`
    query GetEmailCampaign($id: String!) {
  emailCampaign(id: $id) {
    id
    companyId
    name
    status
    sequence
    delayDays
    startAt
    mode
    fromEmail
    replyTo
    totalRecipients
    emailsSent
    emailsScheduled
    emailsFailed
    recipientEmails
    createdAt
    updatedAt
  }
}
    `;

/**
 * __useGetEmailCampaignQuery__
 *
 * To run a query within a React component, call `useGetEmailCampaignQuery` and pass it any options that fit your needs.
 * When your component renders, `useGetEmailCampaignQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useGetEmailCampaignQuery({
 *   variables: {
 *      id: // value for 'id'
 *   },
 * });
 */
export function useGetEmailCampaignQuery(baseOptions: Apollo.QueryHookOptions<GetEmailCampaignQuery, GetEmailCampaignQueryVariables> & ({ variables: GetEmailCampaignQueryVariables; skip?: boolean; } | { skip: boolean; }) ) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<GetEmailCampaignQuery, GetEmailCampaignQueryVariables>(GetEmailCampaignDocument, options);
      }
export function useGetEmailCampaignLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<GetEmailCampaignQuery, GetEmailCampaignQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<GetEmailCampaignQuery, GetEmailCampaignQueryVariables>(GetEmailCampaignDocument, options);
        }
// @ts-ignore
export function useGetEmailCampaignSuspenseQuery(baseOptions?: Apollo.SuspenseQueryHookOptions<GetEmailCampaignQuery, GetEmailCampaignQueryVariables>): Apollo.UseSuspenseQueryResult<GetEmailCampaignQuery, GetEmailCampaignQueryVariables>;
export function useGetEmailCampaignSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<GetEmailCampaignQuery, GetEmailCampaignQueryVariables>): Apollo.UseSuspenseQueryResult<GetEmailCampaignQuery | undefined, GetEmailCampaignQueryVariables>;
export function useGetEmailCampaignSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<GetEmailCampaignQuery, GetEmailCampaignQueryVariables>) {
          const options = baseOptions === Apollo.skipToken ? baseOptions : {...defaultOptions, ...baseOptions}
          return Apollo.useSuspenseQuery<GetEmailCampaignQuery, GetEmailCampaignQueryVariables>(GetEmailCampaignDocument, options);
        }
export type GetEmailCampaignQueryHookResult = ReturnType<typeof useGetEmailCampaignQuery>;
export type GetEmailCampaignLazyQueryHookResult = ReturnType<typeof useGetEmailCampaignLazyQuery>;
export type GetEmailCampaignSuspenseQueryHookResult = ReturnType<typeof useGetEmailCampaignSuspenseQuery>;
export type GetEmailCampaignQueryResult = Apollo.QueryResult<GetEmailCampaignQuery, GetEmailCampaignQueryVariables>;
export const CreateDraftCampaignDocument = gql`
    mutation CreateDraftCampaign($input: CreateCampaignInput!) {
  createDraftCampaign(input: $input) {
    id
    name
    status
    createdAt
  }
}
    `;
export type CreateDraftCampaignMutationFn = Apollo.MutationFunction<CreateDraftCampaignMutation, CreateDraftCampaignMutationVariables>;

/**
 * __useCreateDraftCampaignMutation__
 *
 * To run a mutation, you first call `useCreateDraftCampaignMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useCreateDraftCampaignMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [createDraftCampaignMutation, { data, loading, error }] = useCreateDraftCampaignMutation({
 *   variables: {
 *      input: // value for 'input'
 *   },
 * });
 */
export function useCreateDraftCampaignMutation(baseOptions?: Apollo.MutationHookOptions<CreateDraftCampaignMutation, CreateDraftCampaignMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<CreateDraftCampaignMutation, CreateDraftCampaignMutationVariables>(CreateDraftCampaignDocument, options);
      }
export type CreateDraftCampaignMutationHookResult = ReturnType<typeof useCreateDraftCampaignMutation>;
export type CreateDraftCampaignMutationResult = Apollo.MutationResult<CreateDraftCampaignMutation>;
export type CreateDraftCampaignMutationOptions = Apollo.BaseMutationOptions<CreateDraftCampaignMutation, CreateDraftCampaignMutationVariables>;
export const UpdateCampaignDocument = gql`
    mutation UpdateCampaign($id: String!, $input: UpdateCampaignInput!) {
  updateCampaign(id: $id, input: $input) {
    id
    name
    status
    updatedAt
  }
}
    `;
export type UpdateCampaignMutationFn = Apollo.MutationFunction<UpdateCampaignMutation, UpdateCampaignMutationVariables>;

/**
 * __useUpdateCampaignMutation__
 *
 * To run a mutation, you first call `useUpdateCampaignMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useUpdateCampaignMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [updateCampaignMutation, { data, loading, error }] = useUpdateCampaignMutation({
 *   variables: {
 *      id: // value for 'id'
 *      input: // value for 'input'
 *   },
 * });
 */
export function useUpdateCampaignMutation(baseOptions?: Apollo.MutationHookOptions<UpdateCampaignMutation, UpdateCampaignMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<UpdateCampaignMutation, UpdateCampaignMutationVariables>(UpdateCampaignDocument, options);
      }
export type UpdateCampaignMutationHookResult = ReturnType<typeof useUpdateCampaignMutation>;
export type UpdateCampaignMutationResult = Apollo.MutationResult<UpdateCampaignMutation>;
export type UpdateCampaignMutationOptions = Apollo.BaseMutationOptions<UpdateCampaignMutation, UpdateCampaignMutationVariables>;
export const DeleteCampaignDocument = gql`
    mutation DeleteCampaign($id: String!) {
  deleteCampaign(id: $id) {
    success
    message
  }
}
    `;
export type DeleteCampaignMutationFn = Apollo.MutationFunction<DeleteCampaignMutation, DeleteCampaignMutationVariables>;

/**
 * __useDeleteCampaignMutation__
 *
 * To run a mutation, you first call `useDeleteCampaignMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useDeleteCampaignMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [deleteCampaignMutation, { data, loading, error }] = useDeleteCampaignMutation({
 *   variables: {
 *      id: // value for 'id'
 *   },
 * });
 */
export function useDeleteCampaignMutation(baseOptions?: Apollo.MutationHookOptions<DeleteCampaignMutation, DeleteCampaignMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<DeleteCampaignMutation, DeleteCampaignMutationVariables>(DeleteCampaignDocument, options);
      }
export type DeleteCampaignMutationHookResult = ReturnType<typeof useDeleteCampaignMutation>;
export type DeleteCampaignMutationResult = Apollo.MutationResult<DeleteCampaignMutation>;
export type DeleteCampaignMutationOptions = Apollo.BaseMutationOptions<DeleteCampaignMutation, DeleteCampaignMutationVariables>;
export const LaunchEmailCampaignDocument = gql`
    mutation LaunchEmailCampaign($id: String!) {
  launchEmailCampaign(id: $id) {
    id
    name
    status
    emailsSent
    emailsScheduled
    emailsFailed
    updatedAt
  }
}
    `;
export type LaunchEmailCampaignMutationFn = Apollo.MutationFunction<LaunchEmailCampaignMutation, LaunchEmailCampaignMutationVariables>;

/**
 * __useLaunchEmailCampaignMutation__
 *
 * To run a mutation, you first call `useLaunchEmailCampaignMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useLaunchEmailCampaignMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [launchEmailCampaignMutation, { data, loading, error }] = useLaunchEmailCampaignMutation({
 *   variables: {
 *      id: // value for 'id'
 *   },
 * });
 */
export function useLaunchEmailCampaignMutation(baseOptions?: Apollo.MutationHookOptions<LaunchEmailCampaignMutation, LaunchEmailCampaignMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<LaunchEmailCampaignMutation, LaunchEmailCampaignMutationVariables>(LaunchEmailCampaignDocument, options);
      }
export type LaunchEmailCampaignMutationHookResult = ReturnType<typeof useLaunchEmailCampaignMutation>;
export type LaunchEmailCampaignMutationResult = Apollo.MutationResult<LaunchEmailCampaignMutation>;
export type LaunchEmailCampaignMutationOptions = Apollo.BaseMutationOptions<LaunchEmailCampaignMutation, LaunchEmailCampaignMutationVariables>;
export const SendEmailDocument = gql`
    mutation SendEmail($input: SendEmailInput!) {
  sendEmail(input: $input) {
    success
    id
    error
  }
}
    `;
export type SendEmailMutationFn = Apollo.MutationFunction<SendEmailMutation, SendEmailMutationVariables>;

/**
 * __useSendEmailMutation__
 *
 * To run a mutation, you first call `useSendEmailMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useSendEmailMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [sendEmailMutation, { data, loading, error }] = useSendEmailMutation({
 *   variables: {
 *      input: // value for 'input'
 *   },
 * });
 */
export function useSendEmailMutation(baseOptions?: Apollo.MutationHookOptions<SendEmailMutation, SendEmailMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<SendEmailMutation, SendEmailMutationVariables>(SendEmailDocument, options);
      }
export type SendEmailMutationHookResult = ReturnType<typeof useSendEmailMutation>;
export type SendEmailMutationResult = Apollo.MutationResult<SendEmailMutation>;
export type SendEmailMutationOptions = Apollo.BaseMutationOptions<SendEmailMutation, SendEmailMutationVariables>;
export const GenerateEmailDocument = gql`
    mutation GenerateEmail($input: GenerateEmailInput!) {
  generateEmail(input: $input) {
    subject
    html
    text
  }
}
    `;
export type GenerateEmailMutationFn = Apollo.MutationFunction<GenerateEmailMutation, GenerateEmailMutationVariables>;

/**
 * __useGenerateEmailMutation__
 *
 * To run a mutation, you first call `useGenerateEmailMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useGenerateEmailMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [generateEmailMutation, { data, loading, error }] = useGenerateEmailMutation({
 *   variables: {
 *      input: // value for 'input'
 *   },
 * });
 */
export function useGenerateEmailMutation(baseOptions?: Apollo.MutationHookOptions<GenerateEmailMutation, GenerateEmailMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<GenerateEmailMutation, GenerateEmailMutationVariables>(GenerateEmailDocument, options);
      }
export type GenerateEmailMutationHookResult = ReturnType<typeof useGenerateEmailMutation>;
export type GenerateEmailMutationResult = Apollo.MutationResult<GenerateEmailMutation>;
export type GenerateEmailMutationOptions = Apollo.BaseMutationOptions<GenerateEmailMutation, GenerateEmailMutationVariables>;
export const GenerateReplyDocument = gql`
    mutation GenerateReply($input: GenerateReplyInput!) {
  generateReply(input: $input) {
    subject
    body
  }
}
    `;
export type GenerateReplyMutationFn = Apollo.MutationFunction<GenerateReplyMutation, GenerateReplyMutationVariables>;

/**
 * __useGenerateReplyMutation__
 *
 * To run a mutation, you first call `useGenerateReplyMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useGenerateReplyMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [generateReplyMutation, { data, loading, error }] = useGenerateReplyMutation({
 *   variables: {
 *      input: // value for 'input'
 *   },
 * });
 */
export function useGenerateReplyMutation(baseOptions?: Apollo.MutationHookOptions<GenerateReplyMutation, GenerateReplyMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<GenerateReplyMutation, GenerateReplyMutationVariables>(GenerateReplyDocument, options);
      }
export type GenerateReplyMutationHookResult = ReturnType<typeof useGenerateReplyMutation>;
export type GenerateReplyMutationResult = Apollo.MutationResult<GenerateReplyMutation>;
export type GenerateReplyMutationOptions = Apollo.BaseMutationOptions<GenerateReplyMutation, GenerateReplyMutationVariables>;
export const GetEmailStatsDocument = gql`
    query GetEmailStats {
  emailStats {
    sentToday
    sentThisWeek
    sentThisMonth
    scheduledToday
    scheduledFuture
    totalSent
    deliveredToday
    deliveredThisWeek
    deliveredThisMonth
    bouncedToday
    bouncedThisWeek
    bouncedThisMonth
    openedToday
    openedThisWeek
    openedThisMonth
  }
}
    `;

/**
 * __useGetEmailStatsQuery__
 *
 * To run a query within a React component, call `useGetEmailStatsQuery` and pass it any options that fit your needs.
 * When your component renders, `useGetEmailStatsQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useGetEmailStatsQuery({
 *   variables: {
 *   },
 * });
 */
export function useGetEmailStatsQuery(baseOptions?: Apollo.QueryHookOptions<GetEmailStatsQuery, GetEmailStatsQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<GetEmailStatsQuery, GetEmailStatsQueryVariables>(GetEmailStatsDocument, options);
      }
export function useGetEmailStatsLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<GetEmailStatsQuery, GetEmailStatsQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<GetEmailStatsQuery, GetEmailStatsQueryVariables>(GetEmailStatsDocument, options);
        }
// @ts-ignore
export function useGetEmailStatsSuspenseQuery(baseOptions?: Apollo.SuspenseQueryHookOptions<GetEmailStatsQuery, GetEmailStatsQueryVariables>): Apollo.UseSuspenseQueryResult<GetEmailStatsQuery, GetEmailStatsQueryVariables>;
export function useGetEmailStatsSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<GetEmailStatsQuery, GetEmailStatsQueryVariables>): Apollo.UseSuspenseQueryResult<GetEmailStatsQuery | undefined, GetEmailStatsQueryVariables>;
export function useGetEmailStatsSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<GetEmailStatsQuery, GetEmailStatsQueryVariables>) {
          const options = baseOptions === Apollo.skipToken ? baseOptions : {...defaultOptions, ...baseOptions}
          return Apollo.useSuspenseQuery<GetEmailStatsQuery, GetEmailStatsQueryVariables>(GetEmailStatsDocument, options);
        }
export type GetEmailStatsQueryHookResult = ReturnType<typeof useGetEmailStatsQuery>;
export type GetEmailStatsLazyQueryHookResult = ReturnType<typeof useGetEmailStatsLazyQuery>;
export type GetEmailStatsSuspenseQueryHookResult = ReturnType<typeof useGetEmailStatsSuspenseQuery>;
export type GetEmailStatsQueryResult = Apollo.QueryResult<GetEmailStatsQuery, GetEmailStatsQueryVariables>;
export const GetReceivedEmailsDocument = gql`
    query GetReceivedEmails($limit: Int, $offset: Int, $archived: Boolean, $classification: String) {
  receivedEmails(
    limit: $limit
    offset: $offset
    archived: $archived
    classification: $classification
  ) {
    emails {
      id
      resendId
      fromEmail
      toEmails
      subject
      receivedAt
      archivedAt
      classification
      classificationConfidence
      matchedContactId
      textContent
      htmlContent
      createdAt
    }
    totalCount
  }
}
    `;

/**
 * __useGetReceivedEmailsQuery__
 *
 * To run a query within a React component, call `useGetReceivedEmailsQuery` and pass it any options that fit your needs.
 * When your component renders, `useGetReceivedEmailsQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useGetReceivedEmailsQuery({
 *   variables: {
 *      limit: // value for 'limit'
 *      offset: // value for 'offset'
 *      archived: // value for 'archived'
 *      classification: // value for 'classification'
 *   },
 * });
 */
export function useGetReceivedEmailsQuery(baseOptions?: Apollo.QueryHookOptions<GetReceivedEmailsQuery, GetReceivedEmailsQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<GetReceivedEmailsQuery, GetReceivedEmailsQueryVariables>(GetReceivedEmailsDocument, options);
      }
export function useGetReceivedEmailsLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<GetReceivedEmailsQuery, GetReceivedEmailsQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<GetReceivedEmailsQuery, GetReceivedEmailsQueryVariables>(GetReceivedEmailsDocument, options);
        }
// @ts-ignore
export function useGetReceivedEmailsSuspenseQuery(baseOptions?: Apollo.SuspenseQueryHookOptions<GetReceivedEmailsQuery, GetReceivedEmailsQueryVariables>): Apollo.UseSuspenseQueryResult<GetReceivedEmailsQuery, GetReceivedEmailsQueryVariables>;
export function useGetReceivedEmailsSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<GetReceivedEmailsQuery, GetReceivedEmailsQueryVariables>): Apollo.UseSuspenseQueryResult<GetReceivedEmailsQuery | undefined, GetReceivedEmailsQueryVariables>;
export function useGetReceivedEmailsSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<GetReceivedEmailsQuery, GetReceivedEmailsQueryVariables>) {
          const options = baseOptions === Apollo.skipToken ? baseOptions : {...defaultOptions, ...baseOptions}
          return Apollo.useSuspenseQuery<GetReceivedEmailsQuery, GetReceivedEmailsQueryVariables>(GetReceivedEmailsDocument, options);
        }
export type GetReceivedEmailsQueryHookResult = ReturnType<typeof useGetReceivedEmailsQuery>;
export type GetReceivedEmailsLazyQueryHookResult = ReturnType<typeof useGetReceivedEmailsLazyQuery>;
export type GetReceivedEmailsSuspenseQueryHookResult = ReturnType<typeof useGetReceivedEmailsSuspenseQuery>;
export type GetReceivedEmailsQueryResult = Apollo.QueryResult<GetReceivedEmailsQuery, GetReceivedEmailsQueryVariables>;
export const GetReceivedEmailDocument = gql`
    query GetReceivedEmail($id: Int!) {
  receivedEmail(id: $id) {
    id
    resendId
    fromEmail
    toEmails
    ccEmails
    replyToEmails
    subject
    messageId
    htmlContent
    textContent
    attachments
    receivedAt
    archivedAt
    classification
    classificationConfidence
    classifiedAt
    matchedContactId
    matchedContact {
      id
      firstName
      lastName
      forwardingAlias
    }
    matchedOutboundId
    sentReplies {
      id
      resendId
      fromEmail
      toEmails
      subject
      textContent
      status
      sentAt
      createdAt
    }
    createdAt
    updatedAt
  }
}
    `;

/**
 * __useGetReceivedEmailQuery__
 *
 * To run a query within a React component, call `useGetReceivedEmailQuery` and pass it any options that fit your needs.
 * When your component renders, `useGetReceivedEmailQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useGetReceivedEmailQuery({
 *   variables: {
 *      id: // value for 'id'
 *   },
 * });
 */
export function useGetReceivedEmailQuery(baseOptions: Apollo.QueryHookOptions<GetReceivedEmailQuery, GetReceivedEmailQueryVariables> & ({ variables: GetReceivedEmailQueryVariables; skip?: boolean; } | { skip: boolean; }) ) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<GetReceivedEmailQuery, GetReceivedEmailQueryVariables>(GetReceivedEmailDocument, options);
      }
export function useGetReceivedEmailLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<GetReceivedEmailQuery, GetReceivedEmailQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<GetReceivedEmailQuery, GetReceivedEmailQueryVariables>(GetReceivedEmailDocument, options);
        }
// @ts-ignore
export function useGetReceivedEmailSuspenseQuery(baseOptions?: Apollo.SuspenseQueryHookOptions<GetReceivedEmailQuery, GetReceivedEmailQueryVariables>): Apollo.UseSuspenseQueryResult<GetReceivedEmailQuery, GetReceivedEmailQueryVariables>;
export function useGetReceivedEmailSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<GetReceivedEmailQuery, GetReceivedEmailQueryVariables>): Apollo.UseSuspenseQueryResult<GetReceivedEmailQuery | undefined, GetReceivedEmailQueryVariables>;
export function useGetReceivedEmailSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<GetReceivedEmailQuery, GetReceivedEmailQueryVariables>) {
          const options = baseOptions === Apollo.skipToken ? baseOptions : {...defaultOptions, ...baseOptions}
          return Apollo.useSuspenseQuery<GetReceivedEmailQuery, GetReceivedEmailQueryVariables>(GetReceivedEmailDocument, options);
        }
export type GetReceivedEmailQueryHookResult = ReturnType<typeof useGetReceivedEmailQuery>;
export type GetReceivedEmailLazyQueryHookResult = ReturnType<typeof useGetReceivedEmailLazyQuery>;
export type GetReceivedEmailSuspenseQueryHookResult = ReturnType<typeof useGetReceivedEmailSuspenseQuery>;
export type GetReceivedEmailQueryResult = Apollo.QueryResult<GetReceivedEmailQuery, GetReceivedEmailQueryVariables>;
export const ArchiveEmailDocument = gql`
    mutation ArchiveEmail($id: Int!) {
  archiveEmail(id: $id) {
    success
    message
  }
}
    `;
export type ArchiveEmailMutationFn = Apollo.MutationFunction<ArchiveEmailMutation, ArchiveEmailMutationVariables>;

/**
 * __useArchiveEmailMutation__
 *
 * To run a mutation, you first call `useArchiveEmailMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useArchiveEmailMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [archiveEmailMutation, { data, loading, error }] = useArchiveEmailMutation({
 *   variables: {
 *      id: // value for 'id'
 *   },
 * });
 */
export function useArchiveEmailMutation(baseOptions?: Apollo.MutationHookOptions<ArchiveEmailMutation, ArchiveEmailMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<ArchiveEmailMutation, ArchiveEmailMutationVariables>(ArchiveEmailDocument, options);
      }
export type ArchiveEmailMutationHookResult = ReturnType<typeof useArchiveEmailMutation>;
export type ArchiveEmailMutationResult = Apollo.MutationResult<ArchiveEmailMutation>;
export type ArchiveEmailMutationOptions = Apollo.BaseMutationOptions<ArchiveEmailMutation, ArchiveEmailMutationVariables>;
export const UnarchiveEmailDocument = gql`
    mutation UnarchiveEmail($id: Int!) {
  unarchiveEmail(id: $id) {
    success
    message
  }
}
    `;
export type UnarchiveEmailMutationFn = Apollo.MutationFunction<UnarchiveEmailMutation, UnarchiveEmailMutationVariables>;

/**
 * __useUnarchiveEmailMutation__
 *
 * To run a mutation, you first call `useUnarchiveEmailMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useUnarchiveEmailMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [unarchiveEmailMutation, { data, loading, error }] = useUnarchiveEmailMutation({
 *   variables: {
 *      id: // value for 'id'
 *   },
 * });
 */
export function useUnarchiveEmailMutation(baseOptions?: Apollo.MutationHookOptions<UnarchiveEmailMutation, UnarchiveEmailMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<UnarchiveEmailMutation, UnarchiveEmailMutationVariables>(UnarchiveEmailDocument, options);
      }
export type UnarchiveEmailMutationHookResult = ReturnType<typeof useUnarchiveEmailMutation>;
export type UnarchiveEmailMutationResult = Apollo.MutationResult<UnarchiveEmailMutation>;
export type UnarchiveEmailMutationOptions = Apollo.BaseMutationOptions<UnarchiveEmailMutation, UnarchiveEmailMutationVariables>;
export const PreviewEmailDocument = gql`
    mutation PreviewEmail($input: PreviewEmailInput!) {
  previewEmail(input: $input) {
    htmlContent
    subject
    drySendResult
  }
}
    `;
export type PreviewEmailMutationFn = Apollo.MutationFunction<PreviewEmailMutation, PreviewEmailMutationVariables>;

/**
 * __usePreviewEmailMutation__
 *
 * To run a mutation, you first call `usePreviewEmailMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `usePreviewEmailMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [previewEmailMutation, { data, loading, error }] = usePreviewEmailMutation({
 *   variables: {
 *      input: // value for 'input'
 *   },
 * });
 */
export function usePreviewEmailMutation(baseOptions?: Apollo.MutationHookOptions<PreviewEmailMutation, PreviewEmailMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<PreviewEmailMutation, PreviewEmailMutationVariables>(PreviewEmailDocument, options);
      }
export type PreviewEmailMutationHookResult = ReturnType<typeof usePreviewEmailMutation>;
export type PreviewEmailMutationResult = Apollo.MutationResult<PreviewEmailMutation>;
export type PreviewEmailMutationOptions = Apollo.BaseMutationOptions<PreviewEmailMutation, PreviewEmailMutationVariables>;
export const SendOutreachEmailDocument = gql`
    mutation SendOutreachEmail($input: SendOutreachEmailInput!) {
  sendOutreachEmail(input: $input) {
    success
    emailId
    subject
    error
  }
}
    `;
export type SendOutreachEmailMutationFn = Apollo.MutationFunction<SendOutreachEmailMutation, SendOutreachEmailMutationVariables>;

/**
 * __useSendOutreachEmailMutation__
 *
 * To run a mutation, you first call `useSendOutreachEmailMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useSendOutreachEmailMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [sendOutreachEmailMutation, { data, loading, error }] = useSendOutreachEmailMutation({
 *   variables: {
 *      input: // value for 'input'
 *   },
 * });
 */
export function useSendOutreachEmailMutation(baseOptions?: Apollo.MutationHookOptions<SendOutreachEmailMutation, SendOutreachEmailMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<SendOutreachEmailMutation, SendOutreachEmailMutationVariables>(SendOutreachEmailDocument, options);
      }
export type SendOutreachEmailMutationHookResult = ReturnType<typeof useSendOutreachEmailMutation>;
export type SendOutreachEmailMutationResult = Apollo.MutationResult<SendOutreachEmailMutation>;
export type SendOutreachEmailMutationOptions = Apollo.BaseMutationOptions<SendOutreachEmailMutation, SendOutreachEmailMutationVariables>;
export const GetEmailsNeedingFollowUpDocument = gql`
    query GetEmailsNeedingFollowUp($limit: Int, $offset: Int) {
  emailsNeedingFollowUp(limit: $limit, offset: $offset) {
    emails {
      id
      contactId
      resendId
      fromEmail
      toEmails
      subject
      status
      sentAt
      sequenceType
      sequenceNumber
      followupStatus
      companyId
      recipientName
      createdAt
    }
    totalCount
  }
}
    `;

/**
 * __useGetEmailsNeedingFollowUpQuery__
 *
 * To run a query within a React component, call `useGetEmailsNeedingFollowUpQuery` and pass it any options that fit your needs.
 * When your component renders, `useGetEmailsNeedingFollowUpQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useGetEmailsNeedingFollowUpQuery({
 *   variables: {
 *      limit: // value for 'limit'
 *      offset: // value for 'offset'
 *   },
 * });
 */
export function useGetEmailsNeedingFollowUpQuery(baseOptions?: Apollo.QueryHookOptions<GetEmailsNeedingFollowUpQuery, GetEmailsNeedingFollowUpQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<GetEmailsNeedingFollowUpQuery, GetEmailsNeedingFollowUpQueryVariables>(GetEmailsNeedingFollowUpDocument, options);
      }
export function useGetEmailsNeedingFollowUpLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<GetEmailsNeedingFollowUpQuery, GetEmailsNeedingFollowUpQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<GetEmailsNeedingFollowUpQuery, GetEmailsNeedingFollowUpQueryVariables>(GetEmailsNeedingFollowUpDocument, options);
        }
// @ts-ignore
export function useGetEmailsNeedingFollowUpSuspenseQuery(baseOptions?: Apollo.SuspenseQueryHookOptions<GetEmailsNeedingFollowUpQuery, GetEmailsNeedingFollowUpQueryVariables>): Apollo.UseSuspenseQueryResult<GetEmailsNeedingFollowUpQuery, GetEmailsNeedingFollowUpQueryVariables>;
export function useGetEmailsNeedingFollowUpSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<GetEmailsNeedingFollowUpQuery, GetEmailsNeedingFollowUpQueryVariables>): Apollo.UseSuspenseQueryResult<GetEmailsNeedingFollowUpQuery | undefined, GetEmailsNeedingFollowUpQueryVariables>;
export function useGetEmailsNeedingFollowUpSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<GetEmailsNeedingFollowUpQuery, GetEmailsNeedingFollowUpQueryVariables>) {
          const options = baseOptions === Apollo.skipToken ? baseOptions : {...defaultOptions, ...baseOptions}
          return Apollo.useSuspenseQuery<GetEmailsNeedingFollowUpQuery, GetEmailsNeedingFollowUpQueryVariables>(GetEmailsNeedingFollowUpDocument, options);
        }
export type GetEmailsNeedingFollowUpQueryHookResult = ReturnType<typeof useGetEmailsNeedingFollowUpQuery>;
export type GetEmailsNeedingFollowUpLazyQueryHookResult = ReturnType<typeof useGetEmailsNeedingFollowUpLazyQuery>;
export type GetEmailsNeedingFollowUpSuspenseQueryHookResult = ReturnType<typeof useGetEmailsNeedingFollowUpSuspenseQuery>;
export type GetEmailsNeedingFollowUpQueryResult = Apollo.QueryResult<GetEmailsNeedingFollowUpQuery, GetEmailsNeedingFollowUpQueryVariables>;
export const GetWebhookEventsDocument = gql`
    query GetWebhookEvents($limit: Int, $offset: Int, $eventType: String) {
  webhookEvents(limit: $limit, offset: $offset, eventType: $eventType) {
    events {
      id
      eventType
      emailId
      fromEmail
      toEmails
      subject
      httpStatus
      error
      createdAt
    }
    totalCount
  }
}
    `;

/**
 * __useGetWebhookEventsQuery__
 *
 * To run a query within a React component, call `useGetWebhookEventsQuery` and pass it any options that fit your needs.
 * When your component renders, `useGetWebhookEventsQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useGetWebhookEventsQuery({
 *   variables: {
 *      limit: // value for 'limit'
 *      offset: // value for 'offset'
 *      eventType: // value for 'eventType'
 *   },
 * });
 */
export function useGetWebhookEventsQuery(baseOptions?: Apollo.QueryHookOptions<GetWebhookEventsQuery, GetWebhookEventsQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<GetWebhookEventsQuery, GetWebhookEventsQueryVariables>(GetWebhookEventsDocument, options);
      }
export function useGetWebhookEventsLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<GetWebhookEventsQuery, GetWebhookEventsQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<GetWebhookEventsQuery, GetWebhookEventsQueryVariables>(GetWebhookEventsDocument, options);
        }
// @ts-ignore
export function useGetWebhookEventsSuspenseQuery(baseOptions?: Apollo.SuspenseQueryHookOptions<GetWebhookEventsQuery, GetWebhookEventsQueryVariables>): Apollo.UseSuspenseQueryResult<GetWebhookEventsQuery, GetWebhookEventsQueryVariables>;
export function useGetWebhookEventsSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<GetWebhookEventsQuery, GetWebhookEventsQueryVariables>): Apollo.UseSuspenseQueryResult<GetWebhookEventsQuery | undefined, GetWebhookEventsQueryVariables>;
export function useGetWebhookEventsSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<GetWebhookEventsQuery, GetWebhookEventsQueryVariables>) {
          const options = baseOptions === Apollo.skipToken ? baseOptions : {...defaultOptions, ...baseOptions}
          return Apollo.useSuspenseQuery<GetWebhookEventsQuery, GetWebhookEventsQueryVariables>(GetWebhookEventsDocument, options);
        }
export type GetWebhookEventsQueryHookResult = ReturnType<typeof useGetWebhookEventsQuery>;
export type GetWebhookEventsLazyQueryHookResult = ReturnType<typeof useGetWebhookEventsLazyQuery>;
export type GetWebhookEventsSuspenseQueryHookResult = ReturnType<typeof useGetWebhookEventsSuspenseQuery>;
export type GetWebhookEventsQueryResult = Apollo.QueryResult<GetWebhookEventsQuery, GetWebhookEventsQueryVariables>;
export const GetEmailTemplatesDocument = gql`
    query GetEmailTemplates($category: String, $limit: Int, $offset: Int) {
  emailTemplates(category: $category, limit: $limit, offset: $offset) {
    templates {
      id
      name
      description
      subject
      category
      tags
      isActive
      createdAt
      updatedAt
    }
    totalCount
  }
}
    `;

/**
 * __useGetEmailTemplatesQuery__
 *
 * To run a query within a React component, call `useGetEmailTemplatesQuery` and pass it any options that fit your needs.
 * When your component renders, `useGetEmailTemplatesQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useGetEmailTemplatesQuery({
 *   variables: {
 *      category: // value for 'category'
 *      limit: // value for 'limit'
 *      offset: // value for 'offset'
 *   },
 * });
 */
export function useGetEmailTemplatesQuery(baseOptions?: Apollo.QueryHookOptions<GetEmailTemplatesQuery, GetEmailTemplatesQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<GetEmailTemplatesQuery, GetEmailTemplatesQueryVariables>(GetEmailTemplatesDocument, options);
      }
export function useGetEmailTemplatesLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<GetEmailTemplatesQuery, GetEmailTemplatesQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<GetEmailTemplatesQuery, GetEmailTemplatesQueryVariables>(GetEmailTemplatesDocument, options);
        }
// @ts-ignore
export function useGetEmailTemplatesSuspenseQuery(baseOptions?: Apollo.SuspenseQueryHookOptions<GetEmailTemplatesQuery, GetEmailTemplatesQueryVariables>): Apollo.UseSuspenseQueryResult<GetEmailTemplatesQuery, GetEmailTemplatesQueryVariables>;
export function useGetEmailTemplatesSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<GetEmailTemplatesQuery, GetEmailTemplatesQueryVariables>): Apollo.UseSuspenseQueryResult<GetEmailTemplatesQuery | undefined, GetEmailTemplatesQueryVariables>;
export function useGetEmailTemplatesSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<GetEmailTemplatesQuery, GetEmailTemplatesQueryVariables>) {
          const options = baseOptions === Apollo.skipToken ? baseOptions : {...defaultOptions, ...baseOptions}
          return Apollo.useSuspenseQuery<GetEmailTemplatesQuery, GetEmailTemplatesQueryVariables>(GetEmailTemplatesDocument, options);
        }
export type GetEmailTemplatesQueryHookResult = ReturnType<typeof useGetEmailTemplatesQuery>;
export type GetEmailTemplatesLazyQueryHookResult = ReturnType<typeof useGetEmailTemplatesLazyQuery>;
export type GetEmailTemplatesSuspenseQueryHookResult = ReturnType<typeof useGetEmailTemplatesSuspenseQuery>;
export type GetEmailTemplatesQueryResult = Apollo.QueryResult<GetEmailTemplatesQuery, GetEmailTemplatesQueryVariables>;
export const GetEmailTemplateDocument = gql`
    query GetEmailTemplate($id: Int!) {
  emailTemplate(id: $id) {
    id
    name
    description
    subject
    htmlContent
    textContent
    category
    tags
    variables
    isActive
    createdAt
    updatedAt
  }
}
    `;

/**
 * __useGetEmailTemplateQuery__
 *
 * To run a query within a React component, call `useGetEmailTemplateQuery` and pass it any options that fit your needs.
 * When your component renders, `useGetEmailTemplateQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useGetEmailTemplateQuery({
 *   variables: {
 *      id: // value for 'id'
 *   },
 * });
 */
export function useGetEmailTemplateQuery(baseOptions: Apollo.QueryHookOptions<GetEmailTemplateQuery, GetEmailTemplateQueryVariables> & ({ variables: GetEmailTemplateQueryVariables; skip?: boolean; } | { skip: boolean; }) ) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<GetEmailTemplateQuery, GetEmailTemplateQueryVariables>(GetEmailTemplateDocument, options);
      }
export function useGetEmailTemplateLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<GetEmailTemplateQuery, GetEmailTemplateQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<GetEmailTemplateQuery, GetEmailTemplateQueryVariables>(GetEmailTemplateDocument, options);
        }
// @ts-ignore
export function useGetEmailTemplateSuspenseQuery(baseOptions?: Apollo.SuspenseQueryHookOptions<GetEmailTemplateQuery, GetEmailTemplateQueryVariables>): Apollo.UseSuspenseQueryResult<GetEmailTemplateQuery, GetEmailTemplateQueryVariables>;
export function useGetEmailTemplateSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<GetEmailTemplateQuery, GetEmailTemplateQueryVariables>): Apollo.UseSuspenseQueryResult<GetEmailTemplateQuery | undefined, GetEmailTemplateQueryVariables>;
export function useGetEmailTemplateSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<GetEmailTemplateQuery, GetEmailTemplateQueryVariables>) {
          const options = baseOptions === Apollo.skipToken ? baseOptions : {...defaultOptions, ...baseOptions}
          return Apollo.useSuspenseQuery<GetEmailTemplateQuery, GetEmailTemplateQueryVariables>(GetEmailTemplateDocument, options);
        }
export type GetEmailTemplateQueryHookResult = ReturnType<typeof useGetEmailTemplateQuery>;
export type GetEmailTemplateLazyQueryHookResult = ReturnType<typeof useGetEmailTemplateLazyQuery>;
export type GetEmailTemplateSuspenseQueryHookResult = ReturnType<typeof useGetEmailTemplateSuspenseQuery>;
export type GetEmailTemplateQueryResult = Apollo.QueryResult<GetEmailTemplateQuery, GetEmailTemplateQueryVariables>;
export const CreateEmailTemplateDocument = gql`
    mutation CreateEmailTemplate($input: CreateEmailTemplateInput!) {
  createEmailTemplate(input: $input) {
    id
    name
    subject
    category
    createdAt
  }
}
    `;
export type CreateEmailTemplateMutationFn = Apollo.MutationFunction<CreateEmailTemplateMutation, CreateEmailTemplateMutationVariables>;

/**
 * __useCreateEmailTemplateMutation__
 *
 * To run a mutation, you first call `useCreateEmailTemplateMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useCreateEmailTemplateMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [createEmailTemplateMutation, { data, loading, error }] = useCreateEmailTemplateMutation({
 *   variables: {
 *      input: // value for 'input'
 *   },
 * });
 */
export function useCreateEmailTemplateMutation(baseOptions?: Apollo.MutationHookOptions<CreateEmailTemplateMutation, CreateEmailTemplateMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<CreateEmailTemplateMutation, CreateEmailTemplateMutationVariables>(CreateEmailTemplateDocument, options);
      }
export type CreateEmailTemplateMutationHookResult = ReturnType<typeof useCreateEmailTemplateMutation>;
export type CreateEmailTemplateMutationResult = Apollo.MutationResult<CreateEmailTemplateMutation>;
export type CreateEmailTemplateMutationOptions = Apollo.BaseMutationOptions<CreateEmailTemplateMutation, CreateEmailTemplateMutationVariables>;
export const UpdateEmailTemplateDocument = gql`
    mutation UpdateEmailTemplate($id: Int!, $input: UpdateEmailTemplateInput!) {
  updateEmailTemplate(id: $id, input: $input) {
    id
    name
    subject
    isActive
    updatedAt
  }
}
    `;
export type UpdateEmailTemplateMutationFn = Apollo.MutationFunction<UpdateEmailTemplateMutation, UpdateEmailTemplateMutationVariables>;

/**
 * __useUpdateEmailTemplateMutation__
 *
 * To run a mutation, you first call `useUpdateEmailTemplateMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useUpdateEmailTemplateMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [updateEmailTemplateMutation, { data, loading, error }] = useUpdateEmailTemplateMutation({
 *   variables: {
 *      id: // value for 'id'
 *      input: // value for 'input'
 *   },
 * });
 */
export function useUpdateEmailTemplateMutation(baseOptions?: Apollo.MutationHookOptions<UpdateEmailTemplateMutation, UpdateEmailTemplateMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<UpdateEmailTemplateMutation, UpdateEmailTemplateMutationVariables>(UpdateEmailTemplateDocument, options);
      }
export type UpdateEmailTemplateMutationHookResult = ReturnType<typeof useUpdateEmailTemplateMutation>;
export type UpdateEmailTemplateMutationResult = Apollo.MutationResult<UpdateEmailTemplateMutation>;
export type UpdateEmailTemplateMutationOptions = Apollo.BaseMutationOptions<UpdateEmailTemplateMutation, UpdateEmailTemplateMutationVariables>;
export const DeleteEmailTemplateDocument = gql`
    mutation DeleteEmailTemplate($id: Int!) {
  deleteEmailTemplate(id: $id) {
    success
    message
  }
}
    `;
export type DeleteEmailTemplateMutationFn = Apollo.MutationFunction<DeleteEmailTemplateMutation, DeleteEmailTemplateMutationVariables>;

/**
 * __useDeleteEmailTemplateMutation__
 *
 * To run a mutation, you first call `useDeleteEmailTemplateMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useDeleteEmailTemplateMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [deleteEmailTemplateMutation, { data, loading, error }] = useDeleteEmailTemplateMutation({
 *   variables: {
 *      id: // value for 'id'
 *   },
 * });
 */
export function useDeleteEmailTemplateMutation(baseOptions?: Apollo.MutationHookOptions<DeleteEmailTemplateMutation, DeleteEmailTemplateMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<DeleteEmailTemplateMutation, DeleteEmailTemplateMutationVariables>(DeleteEmailTemplateDocument, options);
      }
export type DeleteEmailTemplateMutationHookResult = ReturnType<typeof useDeleteEmailTemplateMutation>;
export type DeleteEmailTemplateMutationResult = Apollo.MutationResult<DeleteEmailTemplateMutation>;
export type DeleteEmailTemplateMutationOptions = Apollo.BaseMutationOptions<DeleteEmailTemplateMutation, DeleteEmailTemplateMutationVariables>;
export const GetEmailThreadsDocument = gql`
    query GetEmailThreads($classification: String, $search: String, $sortBy: String, $limit: Int, $offset: Int) {
  emailThreads(
    classification: $classification
    search: $search
    sortBy: $sortBy
    limit: $limit
    offset: $offset
  ) {
    threads {
      contactId
      contactSlug
      contactName
      contactEmail
      contactPosition
      companyName
      companyKey
      lastMessageAt
      lastMessagePreview
      lastMessageDirection
      classification
      classificationConfidence
      totalMessages
      hasReply
      latestStatus
      priorityScore
      hasPendingDraft
      draftId
      conversationStage
    }
    totalCount
  }
}
    `;

/**
 * __useGetEmailThreadsQuery__
 *
 * To run a query within a React component, call `useGetEmailThreadsQuery` and pass it any options that fit your needs.
 * When your component renders, `useGetEmailThreadsQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useGetEmailThreadsQuery({
 *   variables: {
 *      classification: // value for 'classification'
 *      search: // value for 'search'
 *      sortBy: // value for 'sortBy'
 *      limit: // value for 'limit'
 *      offset: // value for 'offset'
 *   },
 * });
 */
export function useGetEmailThreadsQuery(baseOptions?: Apollo.QueryHookOptions<GetEmailThreadsQuery, GetEmailThreadsQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<GetEmailThreadsQuery, GetEmailThreadsQueryVariables>(GetEmailThreadsDocument, options);
      }
export function useGetEmailThreadsLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<GetEmailThreadsQuery, GetEmailThreadsQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<GetEmailThreadsQuery, GetEmailThreadsQueryVariables>(GetEmailThreadsDocument, options);
        }
// @ts-ignore
export function useGetEmailThreadsSuspenseQuery(baseOptions?: Apollo.SuspenseQueryHookOptions<GetEmailThreadsQuery, GetEmailThreadsQueryVariables>): Apollo.UseSuspenseQueryResult<GetEmailThreadsQuery, GetEmailThreadsQueryVariables>;
export function useGetEmailThreadsSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<GetEmailThreadsQuery, GetEmailThreadsQueryVariables>): Apollo.UseSuspenseQueryResult<GetEmailThreadsQuery | undefined, GetEmailThreadsQueryVariables>;
export function useGetEmailThreadsSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<GetEmailThreadsQuery, GetEmailThreadsQueryVariables>) {
          const options = baseOptions === Apollo.skipToken ? baseOptions : {...defaultOptions, ...baseOptions}
          return Apollo.useSuspenseQuery<GetEmailThreadsQuery, GetEmailThreadsQueryVariables>(GetEmailThreadsDocument, options);
        }
export type GetEmailThreadsQueryHookResult = ReturnType<typeof useGetEmailThreadsQuery>;
export type GetEmailThreadsLazyQueryHookResult = ReturnType<typeof useGetEmailThreadsLazyQuery>;
export type GetEmailThreadsSuspenseQueryHookResult = ReturnType<typeof useGetEmailThreadsSuspenseQuery>;
export type GetEmailThreadsQueryResult = Apollo.QueryResult<GetEmailThreadsQuery, GetEmailThreadsQueryVariables>;
export const GetEmailThreadDocument = gql`
    query GetEmailThread($contactId: Int!) {
  emailThread(contactId: $contactId) {
    contactId
    contactSlug
    contactName
    contactEmail
    contactPosition
    contactForwardingAlias
    companyName
    companyKey
    classification
    classificationConfidence
    totalMessages
    hasReply
    messages {
      id
      direction
      fromEmail
      toEmails
      subject
      textContent
      htmlContent
      sentAt
      status
      sequenceType
      sequenceNumber
      classification
      classificationConfidence
    }
  }
}
    `;

/**
 * __useGetEmailThreadQuery__
 *
 * To run a query within a React component, call `useGetEmailThreadQuery` and pass it any options that fit your needs.
 * When your component renders, `useGetEmailThreadQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useGetEmailThreadQuery({
 *   variables: {
 *      contactId: // value for 'contactId'
 *   },
 * });
 */
export function useGetEmailThreadQuery(baseOptions: Apollo.QueryHookOptions<GetEmailThreadQuery, GetEmailThreadQueryVariables> & ({ variables: GetEmailThreadQueryVariables; skip?: boolean; } | { skip: boolean; }) ) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<GetEmailThreadQuery, GetEmailThreadQueryVariables>(GetEmailThreadDocument, options);
      }
export function useGetEmailThreadLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<GetEmailThreadQuery, GetEmailThreadQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<GetEmailThreadQuery, GetEmailThreadQueryVariables>(GetEmailThreadDocument, options);
        }
// @ts-ignore
export function useGetEmailThreadSuspenseQuery(baseOptions?: Apollo.SuspenseQueryHookOptions<GetEmailThreadQuery, GetEmailThreadQueryVariables>): Apollo.UseSuspenseQueryResult<GetEmailThreadQuery, GetEmailThreadQueryVariables>;
export function useGetEmailThreadSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<GetEmailThreadQuery, GetEmailThreadQueryVariables>): Apollo.UseSuspenseQueryResult<GetEmailThreadQuery | undefined, GetEmailThreadQueryVariables>;
export function useGetEmailThreadSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<GetEmailThreadQuery, GetEmailThreadQueryVariables>) {
          const options = baseOptions === Apollo.skipToken ? baseOptions : {...defaultOptions, ...baseOptions}
          return Apollo.useSuspenseQuery<GetEmailThreadQuery, GetEmailThreadQueryVariables>(GetEmailThreadDocument, options);
        }
export type GetEmailThreadQueryHookResult = ReturnType<typeof useGetEmailThreadQuery>;
export type GetEmailThreadLazyQueryHookResult = ReturnType<typeof useGetEmailThreadLazyQuery>;
export type GetEmailThreadSuspenseQueryHookResult = ReturnType<typeof useGetEmailThreadSuspenseQuery>;
export type GetEmailThreadQueryResult = Apollo.QueryResult<GetEmailThreadQuery, GetEmailThreadQueryVariables>;
export const GetLinkedInPostsDocument = gql`
    query GetLinkedInPosts($type: LinkedInPostType, $companyId: Int, $limit: Int, $offset: Int) {
  linkedinPosts(
    type: $type
    companyId: $companyId
    limit: $limit
    offset: $offset
  ) {
    id
    type
    url
    companyId
    contactId
    title
    content
    authorName
    authorUrl
    location
    employmentType
    postedAt
    scrapedAt
    rawData
    skills {
      tag
      label
      confidence
    }
    analyzedAt
    createdAt
  }
}
    `;

/**
 * __useGetLinkedInPostsQuery__
 *
 * To run a query within a React component, call `useGetLinkedInPostsQuery` and pass it any options that fit your needs.
 * When your component renders, `useGetLinkedInPostsQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useGetLinkedInPostsQuery({
 *   variables: {
 *      type: // value for 'type'
 *      companyId: // value for 'companyId'
 *      limit: // value for 'limit'
 *      offset: // value for 'offset'
 *   },
 * });
 */
export function useGetLinkedInPostsQuery(baseOptions?: Apollo.QueryHookOptions<GetLinkedInPostsQuery, GetLinkedInPostsQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<GetLinkedInPostsQuery, GetLinkedInPostsQueryVariables>(GetLinkedInPostsDocument, options);
      }
export function useGetLinkedInPostsLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<GetLinkedInPostsQuery, GetLinkedInPostsQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<GetLinkedInPostsQuery, GetLinkedInPostsQueryVariables>(GetLinkedInPostsDocument, options);
        }
// @ts-ignore
export function useGetLinkedInPostsSuspenseQuery(baseOptions?: Apollo.SuspenseQueryHookOptions<GetLinkedInPostsQuery, GetLinkedInPostsQueryVariables>): Apollo.UseSuspenseQueryResult<GetLinkedInPostsQuery, GetLinkedInPostsQueryVariables>;
export function useGetLinkedInPostsSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<GetLinkedInPostsQuery, GetLinkedInPostsQueryVariables>): Apollo.UseSuspenseQueryResult<GetLinkedInPostsQuery | undefined, GetLinkedInPostsQueryVariables>;
export function useGetLinkedInPostsSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<GetLinkedInPostsQuery, GetLinkedInPostsQueryVariables>) {
          const options = baseOptions === Apollo.skipToken ? baseOptions : {...defaultOptions, ...baseOptions}
          return Apollo.useSuspenseQuery<GetLinkedInPostsQuery, GetLinkedInPostsQueryVariables>(GetLinkedInPostsDocument, options);
        }
export type GetLinkedInPostsQueryHookResult = ReturnType<typeof useGetLinkedInPostsQuery>;
export type GetLinkedInPostsLazyQueryHookResult = ReturnType<typeof useGetLinkedInPostsLazyQuery>;
export type GetLinkedInPostsSuspenseQueryHookResult = ReturnType<typeof useGetLinkedInPostsSuspenseQuery>;
export type GetLinkedInPostsQueryResult = Apollo.QueryResult<GetLinkedInPostsQuery, GetLinkedInPostsQueryVariables>;
export const GetSimilarPostsDocument = gql`
    query GetSimilarPosts($postId: Int!, $limit: Int, $minScore: Float) {
  similarPosts(postId: $postId, limit: $limit, minScore: $minScore) {
    post {
      id
      type
      url
      title
      content
      authorName
      skills {
        tag
        label
        confidence
      }
      analyzedAt
    }
    similarity
  }
}
    `;

/**
 * __useGetSimilarPostsQuery__
 *
 * To run a query within a React component, call `useGetSimilarPostsQuery` and pass it any options that fit your needs.
 * When your component renders, `useGetSimilarPostsQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useGetSimilarPostsQuery({
 *   variables: {
 *      postId: // value for 'postId'
 *      limit: // value for 'limit'
 *      minScore: // value for 'minScore'
 *   },
 * });
 */
export function useGetSimilarPostsQuery(baseOptions: Apollo.QueryHookOptions<GetSimilarPostsQuery, GetSimilarPostsQueryVariables> & ({ variables: GetSimilarPostsQueryVariables; skip?: boolean; } | { skip: boolean; }) ) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<GetSimilarPostsQuery, GetSimilarPostsQueryVariables>(GetSimilarPostsDocument, options);
      }
export function useGetSimilarPostsLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<GetSimilarPostsQuery, GetSimilarPostsQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<GetSimilarPostsQuery, GetSimilarPostsQueryVariables>(GetSimilarPostsDocument, options);
        }
// @ts-ignore
export function useGetSimilarPostsSuspenseQuery(baseOptions?: Apollo.SuspenseQueryHookOptions<GetSimilarPostsQuery, GetSimilarPostsQueryVariables>): Apollo.UseSuspenseQueryResult<GetSimilarPostsQuery, GetSimilarPostsQueryVariables>;
export function useGetSimilarPostsSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<GetSimilarPostsQuery, GetSimilarPostsQueryVariables>): Apollo.UseSuspenseQueryResult<GetSimilarPostsQuery | undefined, GetSimilarPostsQueryVariables>;
export function useGetSimilarPostsSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<GetSimilarPostsQuery, GetSimilarPostsQueryVariables>) {
          const options = baseOptions === Apollo.skipToken ? baseOptions : {...defaultOptions, ...baseOptions}
          return Apollo.useSuspenseQuery<GetSimilarPostsQuery, GetSimilarPostsQueryVariables>(GetSimilarPostsDocument, options);
        }
export type GetSimilarPostsQueryHookResult = ReturnType<typeof useGetSimilarPostsQuery>;
export type GetSimilarPostsLazyQueryHookResult = ReturnType<typeof useGetSimilarPostsLazyQuery>;
export type GetSimilarPostsSuspenseQueryHookResult = ReturnType<typeof useGetSimilarPostsSuspenseQuery>;
export type GetSimilarPostsQueryResult = Apollo.QueryResult<GetSimilarPostsQuery, GetSimilarPostsQueryVariables>;
export const AnalyzeLinkedInPostsDocument = gql`
    mutation AnalyzeLinkedInPosts($postIds: [Int!], $limit: Int) {
  analyzeLinkedInPosts(postIds: $postIds, limit: $limit) {
    success
    analyzed
    failed
    errors
  }
}
    `;
export type AnalyzeLinkedInPostsMutationFn = Apollo.MutationFunction<AnalyzeLinkedInPostsMutation, AnalyzeLinkedInPostsMutationVariables>;

/**
 * __useAnalyzeLinkedInPostsMutation__
 *
 * To run a mutation, you first call `useAnalyzeLinkedInPostsMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useAnalyzeLinkedInPostsMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [analyzeLinkedInPostsMutation, { data, loading, error }] = useAnalyzeLinkedInPostsMutation({
 *   variables: {
 *      postIds: // value for 'postIds'
 *      limit: // value for 'limit'
 *   },
 * });
 */
export function useAnalyzeLinkedInPostsMutation(baseOptions?: Apollo.MutationHookOptions<AnalyzeLinkedInPostsMutation, AnalyzeLinkedInPostsMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<AnalyzeLinkedInPostsMutation, AnalyzeLinkedInPostsMutationVariables>(AnalyzeLinkedInPostsDocument, options);
      }
export type AnalyzeLinkedInPostsMutationHookResult = ReturnType<typeof useAnalyzeLinkedInPostsMutation>;
export type AnalyzeLinkedInPostsMutationResult = Apollo.MutationResult<AnalyzeLinkedInPostsMutation>;
export type AnalyzeLinkedInPostsMutationOptions = Apollo.BaseMutationOptions<AnalyzeLinkedInPostsMutation, AnalyzeLinkedInPostsMutationVariables>;
export const ProductsDocument = gql`
    query Products {
  products {
    ...ProductCore
  }
}
    ${ProductCoreFragmentDoc}`;

/**
 * __useProductsQuery__
 *
 * To run a query within a React component, call `useProductsQuery` and pass it any options that fit your needs.
 * When your component renders, `useProductsQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useProductsQuery({
 *   variables: {
 *   },
 * });
 */
export function useProductsQuery(baseOptions?: Apollo.QueryHookOptions<ProductsQuery, ProductsQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<ProductsQuery, ProductsQueryVariables>(ProductsDocument, options);
      }
export function useProductsLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<ProductsQuery, ProductsQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<ProductsQuery, ProductsQueryVariables>(ProductsDocument, options);
        }
// @ts-ignore
export function useProductsSuspenseQuery(baseOptions?: Apollo.SuspenseQueryHookOptions<ProductsQuery, ProductsQueryVariables>): Apollo.UseSuspenseQueryResult<ProductsQuery, ProductsQueryVariables>;
export function useProductsSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<ProductsQuery, ProductsQueryVariables>): Apollo.UseSuspenseQueryResult<ProductsQuery | undefined, ProductsQueryVariables>;
export function useProductsSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<ProductsQuery, ProductsQueryVariables>) {
          const options = baseOptions === Apollo.skipToken ? baseOptions : {...defaultOptions, ...baseOptions}
          return Apollo.useSuspenseQuery<ProductsQuery, ProductsQueryVariables>(ProductsDocument, options);
        }
export type ProductsQueryHookResult = ReturnType<typeof useProductsQuery>;
export type ProductsLazyQueryHookResult = ReturnType<typeof useProductsLazyQuery>;
export type ProductsSuspenseQueryHookResult = ReturnType<typeof useProductsSuspenseQuery>;
export type ProductsQueryResult = Apollo.QueryResult<ProductsQuery, ProductsQueryVariables>;
export const ProductDocument = gql`
    query Product($id: Int!) {
  product(id: $id) {
    ...ProductCore
  }
}
    ${ProductCoreFragmentDoc}`;

/**
 * __useProductQuery__
 *
 * To run a query within a React component, call `useProductQuery` and pass it any options that fit your needs.
 * When your component renders, `useProductQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useProductQuery({
 *   variables: {
 *      id: // value for 'id'
 *   },
 * });
 */
export function useProductQuery(baseOptions: Apollo.QueryHookOptions<ProductQuery, ProductQueryVariables> & ({ variables: ProductQueryVariables; skip?: boolean; } | { skip: boolean; }) ) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<ProductQuery, ProductQueryVariables>(ProductDocument, options);
      }
export function useProductLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<ProductQuery, ProductQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<ProductQuery, ProductQueryVariables>(ProductDocument, options);
        }
// @ts-ignore
export function useProductSuspenseQuery(baseOptions?: Apollo.SuspenseQueryHookOptions<ProductQuery, ProductQueryVariables>): Apollo.UseSuspenseQueryResult<ProductQuery, ProductQueryVariables>;
export function useProductSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<ProductQuery, ProductQueryVariables>): Apollo.UseSuspenseQueryResult<ProductQuery | undefined, ProductQueryVariables>;
export function useProductSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<ProductQuery, ProductQueryVariables>) {
          const options = baseOptions === Apollo.skipToken ? baseOptions : {...defaultOptions, ...baseOptions}
          return Apollo.useSuspenseQuery<ProductQuery, ProductQueryVariables>(ProductDocument, options);
        }
export type ProductQueryHookResult = ReturnType<typeof useProductQuery>;
export type ProductLazyQueryHookResult = ReturnType<typeof useProductLazyQuery>;
export type ProductSuspenseQueryHookResult = ReturnType<typeof useProductSuspenseQuery>;
export type ProductQueryResult = Apollo.QueryResult<ProductQuery, ProductQueryVariables>;
export const ProductBySlugDocument = gql`
    query ProductBySlug($slug: String!) {
  productBySlug(slug: $slug) {
    ...ProductCore
  }
}
    ${ProductCoreFragmentDoc}`;

/**
 * __useProductBySlugQuery__
 *
 * To run a query within a React component, call `useProductBySlugQuery` and pass it any options that fit your needs.
 * When your component renders, `useProductBySlugQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useProductBySlugQuery({
 *   variables: {
 *      slug: // value for 'slug'
 *   },
 * });
 */
export function useProductBySlugQuery(baseOptions: Apollo.QueryHookOptions<ProductBySlugQuery, ProductBySlugQueryVariables> & ({ variables: ProductBySlugQueryVariables; skip?: boolean; } | { skip: boolean; }) ) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<ProductBySlugQuery, ProductBySlugQueryVariables>(ProductBySlugDocument, options);
      }
export function useProductBySlugLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<ProductBySlugQuery, ProductBySlugQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<ProductBySlugQuery, ProductBySlugQueryVariables>(ProductBySlugDocument, options);
        }
// @ts-ignore
export function useProductBySlugSuspenseQuery(baseOptions?: Apollo.SuspenseQueryHookOptions<ProductBySlugQuery, ProductBySlugQueryVariables>): Apollo.UseSuspenseQueryResult<ProductBySlugQuery, ProductBySlugQueryVariables>;
export function useProductBySlugSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<ProductBySlugQuery, ProductBySlugQueryVariables>): Apollo.UseSuspenseQueryResult<ProductBySlugQuery | undefined, ProductBySlugQueryVariables>;
export function useProductBySlugSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<ProductBySlugQuery, ProductBySlugQueryVariables>) {
          const options = baseOptions === Apollo.skipToken ? baseOptions : {...defaultOptions, ...baseOptions}
          return Apollo.useSuspenseQuery<ProductBySlugQuery, ProductBySlugQueryVariables>(ProductBySlugDocument, options);
        }
export type ProductBySlugQueryHookResult = ReturnType<typeof useProductBySlugQuery>;
export type ProductBySlugLazyQueryHookResult = ReturnType<typeof useProductBySlugLazyQuery>;
export type ProductBySlugSuspenseQueryHookResult = ReturnType<typeof useProductBySlugSuspenseQuery>;
export type ProductBySlugQueryResult = Apollo.QueryResult<ProductBySlugQuery, ProductBySlugQueryVariables>;
export const PublicProductsDocument = gql`
    query PublicProducts($limit: Int, $offset: Int) {
  products(limit: $limit, offset: $offset) {
    id
    slug
    name
    domain
    icpAnalyzedAt
    pricingAnalyzedAt
    gtmAnalyzedAt
    intelReportAt
  }
}
    `;

/**
 * __usePublicProductsQuery__
 *
 * To run a query within a React component, call `usePublicProductsQuery` and pass it any options that fit your needs.
 * When your component renders, `usePublicProductsQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = usePublicProductsQuery({
 *   variables: {
 *      limit: // value for 'limit'
 *      offset: // value for 'offset'
 *   },
 * });
 */
export function usePublicProductsQuery(baseOptions?: Apollo.QueryHookOptions<PublicProductsQuery, PublicProductsQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<PublicProductsQuery, PublicProductsQueryVariables>(PublicProductsDocument, options);
      }
export function usePublicProductsLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<PublicProductsQuery, PublicProductsQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<PublicProductsQuery, PublicProductsQueryVariables>(PublicProductsDocument, options);
        }
// @ts-ignore
export function usePublicProductsSuspenseQuery(baseOptions?: Apollo.SuspenseQueryHookOptions<PublicProductsQuery, PublicProductsQueryVariables>): Apollo.UseSuspenseQueryResult<PublicProductsQuery, PublicProductsQueryVariables>;
export function usePublicProductsSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<PublicProductsQuery, PublicProductsQueryVariables>): Apollo.UseSuspenseQueryResult<PublicProductsQuery | undefined, PublicProductsQueryVariables>;
export function usePublicProductsSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<PublicProductsQuery, PublicProductsQueryVariables>) {
          const options = baseOptions === Apollo.skipToken ? baseOptions : {...defaultOptions, ...baseOptions}
          return Apollo.useSuspenseQuery<PublicProductsQuery, PublicProductsQueryVariables>(PublicProductsDocument, options);
        }
export type PublicProductsQueryHookResult = ReturnType<typeof usePublicProductsQuery>;
export type PublicProductsLazyQueryHookResult = ReturnType<typeof usePublicProductsLazyQuery>;
export type PublicProductsSuspenseQueryHookResult = ReturnType<typeof usePublicProductsSuspenseQuery>;
export type PublicProductsQueryResult = Apollo.QueryResult<PublicProductsQuery, PublicProductsQueryVariables>;
export const PublicProductDocument = gql`
    query PublicProduct($slug: String!) {
  productBySlug(slug: $slug) {
    ...ProductCore
  }
}
    ${ProductCoreFragmentDoc}`;

/**
 * __usePublicProductQuery__
 *
 * To run a query within a React component, call `usePublicProductQuery` and pass it any options that fit your needs.
 * When your component renders, `usePublicProductQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = usePublicProductQuery({
 *   variables: {
 *      slug: // value for 'slug'
 *   },
 * });
 */
export function usePublicProductQuery(baseOptions: Apollo.QueryHookOptions<PublicProductQuery, PublicProductQueryVariables> & ({ variables: PublicProductQueryVariables; skip?: boolean; } | { skip: boolean; }) ) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<PublicProductQuery, PublicProductQueryVariables>(PublicProductDocument, options);
      }
export function usePublicProductLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<PublicProductQuery, PublicProductQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<PublicProductQuery, PublicProductQueryVariables>(PublicProductDocument, options);
        }
// @ts-ignore
export function usePublicProductSuspenseQuery(baseOptions?: Apollo.SuspenseQueryHookOptions<PublicProductQuery, PublicProductQueryVariables>): Apollo.UseSuspenseQueryResult<PublicProductQuery, PublicProductQueryVariables>;
export function usePublicProductSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<PublicProductQuery, PublicProductQueryVariables>): Apollo.UseSuspenseQueryResult<PublicProductQuery | undefined, PublicProductQueryVariables>;
export function usePublicProductSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<PublicProductQuery, PublicProductQueryVariables>) {
          const options = baseOptions === Apollo.skipToken ? baseOptions : {...defaultOptions, ...baseOptions}
          return Apollo.useSuspenseQuery<PublicProductQuery, PublicProductQueryVariables>(PublicProductDocument, options);
        }
export type PublicProductQueryHookResult = ReturnType<typeof usePublicProductQuery>;
export type PublicProductLazyQueryHookResult = ReturnType<typeof usePublicProductLazyQuery>;
export type PublicProductSuspenseQueryHookResult = ReturnType<typeof usePublicProductSuspenseQuery>;
export type PublicProductQueryResult = Apollo.QueryResult<PublicProductQuery, PublicProductQueryVariables>;
export const PublicIntelRunDocument = gql`
    query PublicIntelRun($id: ID!) {
  productIntelRun(id: $id) {
    ...IntelRunCore
  }
}
    ${IntelRunCoreFragmentDoc}`;

/**
 * __usePublicIntelRunQuery__
 *
 * To run a query within a React component, call `usePublicIntelRunQuery` and pass it any options that fit your needs.
 * When your component renders, `usePublicIntelRunQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = usePublicIntelRunQuery({
 *   variables: {
 *      id: // value for 'id'
 *   },
 * });
 */
export function usePublicIntelRunQuery(baseOptions: Apollo.QueryHookOptions<PublicIntelRunQuery, PublicIntelRunQueryVariables> & ({ variables: PublicIntelRunQueryVariables; skip?: boolean; } | { skip: boolean; }) ) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<PublicIntelRunQuery, PublicIntelRunQueryVariables>(PublicIntelRunDocument, options);
      }
export function usePublicIntelRunLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<PublicIntelRunQuery, PublicIntelRunQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<PublicIntelRunQuery, PublicIntelRunQueryVariables>(PublicIntelRunDocument, options);
        }
// @ts-ignore
export function usePublicIntelRunSuspenseQuery(baseOptions?: Apollo.SuspenseQueryHookOptions<PublicIntelRunQuery, PublicIntelRunQueryVariables>): Apollo.UseSuspenseQueryResult<PublicIntelRunQuery, PublicIntelRunQueryVariables>;
export function usePublicIntelRunSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<PublicIntelRunQuery, PublicIntelRunQueryVariables>): Apollo.UseSuspenseQueryResult<PublicIntelRunQuery | undefined, PublicIntelRunQueryVariables>;
export function usePublicIntelRunSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<PublicIntelRunQuery, PublicIntelRunQueryVariables>) {
          const options = baseOptions === Apollo.skipToken ? baseOptions : {...defaultOptions, ...baseOptions}
          return Apollo.useSuspenseQuery<PublicIntelRunQuery, PublicIntelRunQueryVariables>(PublicIntelRunDocument, options);
        }
export type PublicIntelRunQueryHookResult = ReturnType<typeof usePublicIntelRunQuery>;
export type PublicIntelRunLazyQueryHookResult = ReturnType<typeof usePublicIntelRunLazyQuery>;
export type PublicIntelRunSuspenseQueryHookResult = ReturnType<typeof usePublicIntelRunSuspenseQuery>;
export type PublicIntelRunQueryResult = Apollo.QueryResult<PublicIntelRunQuery, PublicIntelRunQueryVariables>;
export const PublicIntelRunsDocument = gql`
    query PublicIntelRuns($productId: Int!, $kind: String) {
  productIntelRuns(productId: $productId, kind: $kind) {
    id
    kind
    status
    startedAt
    finishedAt
    error
  }
}
    `;

/**
 * __usePublicIntelRunsQuery__
 *
 * To run a query within a React component, call `usePublicIntelRunsQuery` and pass it any options that fit your needs.
 * When your component renders, `usePublicIntelRunsQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = usePublicIntelRunsQuery({
 *   variables: {
 *      productId: // value for 'productId'
 *      kind: // value for 'kind'
 *   },
 * });
 */
export function usePublicIntelRunsQuery(baseOptions: Apollo.QueryHookOptions<PublicIntelRunsQuery, PublicIntelRunsQueryVariables> & ({ variables: PublicIntelRunsQueryVariables; skip?: boolean; } | { skip: boolean; }) ) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<PublicIntelRunsQuery, PublicIntelRunsQueryVariables>(PublicIntelRunsDocument, options);
      }
export function usePublicIntelRunsLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<PublicIntelRunsQuery, PublicIntelRunsQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<PublicIntelRunsQuery, PublicIntelRunsQueryVariables>(PublicIntelRunsDocument, options);
        }
// @ts-ignore
export function usePublicIntelRunsSuspenseQuery(baseOptions?: Apollo.SuspenseQueryHookOptions<PublicIntelRunsQuery, PublicIntelRunsQueryVariables>): Apollo.UseSuspenseQueryResult<PublicIntelRunsQuery, PublicIntelRunsQueryVariables>;
export function usePublicIntelRunsSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<PublicIntelRunsQuery, PublicIntelRunsQueryVariables>): Apollo.UseSuspenseQueryResult<PublicIntelRunsQuery | undefined, PublicIntelRunsQueryVariables>;
export function usePublicIntelRunsSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<PublicIntelRunsQuery, PublicIntelRunsQueryVariables>) {
          const options = baseOptions === Apollo.skipToken ? baseOptions : {...defaultOptions, ...baseOptions}
          return Apollo.useSuspenseQuery<PublicIntelRunsQuery, PublicIntelRunsQueryVariables>(PublicIntelRunsDocument, options);
        }
export type PublicIntelRunsQueryHookResult = ReturnType<typeof usePublicIntelRunsQuery>;
export type PublicIntelRunsLazyQueryHookResult = ReturnType<typeof usePublicIntelRunsLazyQuery>;
export type PublicIntelRunsSuspenseQueryHookResult = ReturnType<typeof usePublicIntelRunsSuspenseQuery>;
export type PublicIntelRunsQueryResult = Apollo.QueryResult<PublicIntelRunsQuery, PublicIntelRunsQueryVariables>;
export const UpsertProductDocument = gql`
    mutation UpsertProduct($input: ProductInput!) {
  upsertProduct(input: $input) {
    ...ProductCore
  }
}
    ${ProductCoreFragmentDoc}`;
export type UpsertProductMutationFn = Apollo.MutationFunction<UpsertProductMutation, UpsertProductMutationVariables>;

/**
 * __useUpsertProductMutation__
 *
 * To run a mutation, you first call `useUpsertProductMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useUpsertProductMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [upsertProductMutation, { data, loading, error }] = useUpsertProductMutation({
 *   variables: {
 *      input: // value for 'input'
 *   },
 * });
 */
export function useUpsertProductMutation(baseOptions?: Apollo.MutationHookOptions<UpsertProductMutation, UpsertProductMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<UpsertProductMutation, UpsertProductMutationVariables>(UpsertProductDocument, options);
      }
export type UpsertProductMutationHookResult = ReturnType<typeof useUpsertProductMutation>;
export type UpsertProductMutationResult = Apollo.MutationResult<UpsertProductMutation>;
export type UpsertProductMutationOptions = Apollo.BaseMutationOptions<UpsertProductMutation, UpsertProductMutationVariables>;
export const DeleteProductDocument = gql`
    mutation DeleteProduct($id: Int!) {
  deleteProduct(id: $id)
}
    `;
export type DeleteProductMutationFn = Apollo.MutationFunction<DeleteProductMutation, DeleteProductMutationVariables>;

/**
 * __useDeleteProductMutation__
 *
 * To run a mutation, you first call `useDeleteProductMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useDeleteProductMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [deleteProductMutation, { data, loading, error }] = useDeleteProductMutation({
 *   variables: {
 *      id: // value for 'id'
 *   },
 * });
 */
export function useDeleteProductMutation(baseOptions?: Apollo.MutationHookOptions<DeleteProductMutation, DeleteProductMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<DeleteProductMutation, DeleteProductMutationVariables>(DeleteProductDocument, options);
      }
export type DeleteProductMutationHookResult = ReturnType<typeof useDeleteProductMutation>;
export type DeleteProductMutationResult = Apollo.MutationResult<DeleteProductMutation>;
export type DeleteProductMutationOptions = Apollo.BaseMutationOptions<DeleteProductMutation, DeleteProductMutationVariables>;
export const AnalyzeProductIcpDocument = gql`
    mutation AnalyzeProductICP($id: Int!) {
  analyzeProductICP(id: $id) {
    ...ProductCore
  }
}
    ${ProductCoreFragmentDoc}`;
export type AnalyzeProductIcpMutationFn = Apollo.MutationFunction<AnalyzeProductIcpMutation, AnalyzeProductIcpMutationVariables>;

/**
 * __useAnalyzeProductIcpMutation__
 *
 * To run a mutation, you first call `useAnalyzeProductIcpMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useAnalyzeProductIcpMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [analyzeProductIcpMutation, { data, loading, error }] = useAnalyzeProductIcpMutation({
 *   variables: {
 *      id: // value for 'id'
 *   },
 * });
 */
export function useAnalyzeProductIcpMutation(baseOptions?: Apollo.MutationHookOptions<AnalyzeProductIcpMutation, AnalyzeProductIcpMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<AnalyzeProductIcpMutation, AnalyzeProductIcpMutationVariables>(AnalyzeProductIcpDocument, options);
      }
export type AnalyzeProductIcpMutationHookResult = ReturnType<typeof useAnalyzeProductIcpMutation>;
export type AnalyzeProductIcpMutationResult = Apollo.MutationResult<AnalyzeProductIcpMutation>;
export type AnalyzeProductIcpMutationOptions = Apollo.BaseMutationOptions<AnalyzeProductIcpMutation, AnalyzeProductIcpMutationVariables>;
export const EnhanceProductIcpDocument = gql`
    mutation EnhanceProductIcp($id: Int!) {
  enhanceProductIcp(id: $id) {
    ...ProductCore
  }
}
    ${ProductCoreFragmentDoc}`;
export type EnhanceProductIcpMutationFn = Apollo.MutationFunction<EnhanceProductIcpMutation, EnhanceProductIcpMutationVariables>;

/**
 * __useEnhanceProductIcpMutation__
 *
 * To run a mutation, you first call `useEnhanceProductIcpMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useEnhanceProductIcpMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [enhanceProductIcpMutation, { data, loading, error }] = useEnhanceProductIcpMutation({
 *   variables: {
 *      id: // value for 'id'
 *   },
 * });
 */
export function useEnhanceProductIcpMutation(baseOptions?: Apollo.MutationHookOptions<EnhanceProductIcpMutation, EnhanceProductIcpMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<EnhanceProductIcpMutation, EnhanceProductIcpMutationVariables>(EnhanceProductIcpDocument, options);
      }
export type EnhanceProductIcpMutationHookResult = ReturnType<typeof useEnhanceProductIcpMutation>;
export type EnhanceProductIcpMutationResult = Apollo.MutationResult<EnhanceProductIcpMutation>;
export type EnhanceProductIcpMutationOptions = Apollo.BaseMutationOptions<EnhanceProductIcpMutation, EnhanceProductIcpMutationVariables>;
export const AnalyzeProductPricingDocument = gql`
    mutation AnalyzeProductPricing($id: Int!) {
  analyzeProductPricing(id: $id) {
    ...ProductCore
  }
}
    ${ProductCoreFragmentDoc}`;
export type AnalyzeProductPricingMutationFn = Apollo.MutationFunction<AnalyzeProductPricingMutation, AnalyzeProductPricingMutationVariables>;

/**
 * __useAnalyzeProductPricingMutation__
 *
 * To run a mutation, you first call `useAnalyzeProductPricingMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useAnalyzeProductPricingMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [analyzeProductPricingMutation, { data, loading, error }] = useAnalyzeProductPricingMutation({
 *   variables: {
 *      id: // value for 'id'
 *   },
 * });
 */
export function useAnalyzeProductPricingMutation(baseOptions?: Apollo.MutationHookOptions<AnalyzeProductPricingMutation, AnalyzeProductPricingMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<AnalyzeProductPricingMutation, AnalyzeProductPricingMutationVariables>(AnalyzeProductPricingDocument, options);
      }
export type AnalyzeProductPricingMutationHookResult = ReturnType<typeof useAnalyzeProductPricingMutation>;
export type AnalyzeProductPricingMutationResult = Apollo.MutationResult<AnalyzeProductPricingMutation>;
export type AnalyzeProductPricingMutationOptions = Apollo.BaseMutationOptions<AnalyzeProductPricingMutation, AnalyzeProductPricingMutationVariables>;
export const AnalyzeProductGtmDocument = gql`
    mutation AnalyzeProductGTM($id: Int!) {
  analyzeProductGTM(id: $id) {
    ...ProductCore
  }
}
    ${ProductCoreFragmentDoc}`;
export type AnalyzeProductGtmMutationFn = Apollo.MutationFunction<AnalyzeProductGtmMutation, AnalyzeProductGtmMutationVariables>;

/**
 * __useAnalyzeProductGtmMutation__
 *
 * To run a mutation, you first call `useAnalyzeProductGtmMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useAnalyzeProductGtmMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [analyzeProductGtmMutation, { data, loading, error }] = useAnalyzeProductGtmMutation({
 *   variables: {
 *      id: // value for 'id'
 *   },
 * });
 */
export function useAnalyzeProductGtmMutation(baseOptions?: Apollo.MutationHookOptions<AnalyzeProductGtmMutation, AnalyzeProductGtmMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<AnalyzeProductGtmMutation, AnalyzeProductGtmMutationVariables>(AnalyzeProductGtmDocument, options);
      }
export type AnalyzeProductGtmMutationHookResult = ReturnType<typeof useAnalyzeProductGtmMutation>;
export type AnalyzeProductGtmMutationResult = Apollo.MutationResult<AnalyzeProductGtmMutation>;
export type AnalyzeProductGtmMutationOptions = Apollo.BaseMutationOptions<AnalyzeProductGtmMutation, AnalyzeProductGtmMutationVariables>;
export const RunFullProductIntelDocument = gql`
    mutation RunFullProductIntel($id: Int!) {
  runFullProductIntel(id: $id) {
    ...ProductCore
  }
}
    ${ProductCoreFragmentDoc}`;
export type RunFullProductIntelMutationFn = Apollo.MutationFunction<RunFullProductIntelMutation, RunFullProductIntelMutationVariables>;

/**
 * __useRunFullProductIntelMutation__
 *
 * To run a mutation, you first call `useRunFullProductIntelMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useRunFullProductIntelMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [runFullProductIntelMutation, { data, loading, error }] = useRunFullProductIntelMutation({
 *   variables: {
 *      id: // value for 'id'
 *   },
 * });
 */
export function useRunFullProductIntelMutation(baseOptions?: Apollo.MutationHookOptions<RunFullProductIntelMutation, RunFullProductIntelMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<RunFullProductIntelMutation, RunFullProductIntelMutationVariables>(RunFullProductIntelDocument, options);
      }
export type RunFullProductIntelMutationHookResult = ReturnType<typeof useRunFullProductIntelMutation>;
export type RunFullProductIntelMutationResult = Apollo.MutationResult<RunFullProductIntelMutation>;
export type RunFullProductIntelMutationOptions = Apollo.BaseMutationOptions<RunFullProductIntelMutation, RunFullProductIntelMutationVariables>;
export const AnalyzeProductPricingAsyncDocument = gql`
    mutation AnalyzeProductPricingAsync($id: Int!) {
  analyzeProductPricingAsync(id: $id) {
    runId
    productId
    kind
    status
  }
}
    `;
export type AnalyzeProductPricingAsyncMutationFn = Apollo.MutationFunction<AnalyzeProductPricingAsyncMutation, AnalyzeProductPricingAsyncMutationVariables>;

/**
 * __useAnalyzeProductPricingAsyncMutation__
 *
 * To run a mutation, you first call `useAnalyzeProductPricingAsyncMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useAnalyzeProductPricingAsyncMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [analyzeProductPricingAsyncMutation, { data, loading, error }] = useAnalyzeProductPricingAsyncMutation({
 *   variables: {
 *      id: // value for 'id'
 *   },
 * });
 */
export function useAnalyzeProductPricingAsyncMutation(baseOptions?: Apollo.MutationHookOptions<AnalyzeProductPricingAsyncMutation, AnalyzeProductPricingAsyncMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<AnalyzeProductPricingAsyncMutation, AnalyzeProductPricingAsyncMutationVariables>(AnalyzeProductPricingAsyncDocument, options);
      }
export type AnalyzeProductPricingAsyncMutationHookResult = ReturnType<typeof useAnalyzeProductPricingAsyncMutation>;
export type AnalyzeProductPricingAsyncMutationResult = Apollo.MutationResult<AnalyzeProductPricingAsyncMutation>;
export type AnalyzeProductPricingAsyncMutationOptions = Apollo.BaseMutationOptions<AnalyzeProductPricingAsyncMutation, AnalyzeProductPricingAsyncMutationVariables>;
export const AnalyzeProductGtmAsyncDocument = gql`
    mutation AnalyzeProductGTMAsync($id: Int!) {
  analyzeProductGTMAsync(id: $id) {
    runId
    productId
    kind
    status
  }
}
    `;
export type AnalyzeProductGtmAsyncMutationFn = Apollo.MutationFunction<AnalyzeProductGtmAsyncMutation, AnalyzeProductGtmAsyncMutationVariables>;

/**
 * __useAnalyzeProductGtmAsyncMutation__
 *
 * To run a mutation, you first call `useAnalyzeProductGtmAsyncMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useAnalyzeProductGtmAsyncMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [analyzeProductGtmAsyncMutation, { data, loading, error }] = useAnalyzeProductGtmAsyncMutation({
 *   variables: {
 *      id: // value for 'id'
 *   },
 * });
 */
export function useAnalyzeProductGtmAsyncMutation(baseOptions?: Apollo.MutationHookOptions<AnalyzeProductGtmAsyncMutation, AnalyzeProductGtmAsyncMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<AnalyzeProductGtmAsyncMutation, AnalyzeProductGtmAsyncMutationVariables>(AnalyzeProductGtmAsyncDocument, options);
      }
export type AnalyzeProductGtmAsyncMutationHookResult = ReturnType<typeof useAnalyzeProductGtmAsyncMutation>;
export type AnalyzeProductGtmAsyncMutationResult = Apollo.MutationResult<AnalyzeProductGtmAsyncMutation>;
export type AnalyzeProductGtmAsyncMutationOptions = Apollo.BaseMutationOptions<AnalyzeProductGtmAsyncMutation, AnalyzeProductGtmAsyncMutationVariables>;
export const RunFullProductIntelAsyncDocument = gql`
    mutation RunFullProductIntelAsync($id: Int!, $forceRefresh: Boolean) {
  runFullProductIntelAsync(id: $id, forceRefresh: $forceRefresh) {
    runId
    productId
    kind
    status
  }
}
    `;
export type RunFullProductIntelAsyncMutationFn = Apollo.MutationFunction<RunFullProductIntelAsyncMutation, RunFullProductIntelAsyncMutationVariables>;

/**
 * __useRunFullProductIntelAsyncMutation__
 *
 * To run a mutation, you first call `useRunFullProductIntelAsyncMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useRunFullProductIntelAsyncMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [runFullProductIntelAsyncMutation, { data, loading, error }] = useRunFullProductIntelAsyncMutation({
 *   variables: {
 *      id: // value for 'id'
 *      forceRefresh: // value for 'forceRefresh'
 *   },
 * });
 */
export function useRunFullProductIntelAsyncMutation(baseOptions?: Apollo.MutationHookOptions<RunFullProductIntelAsyncMutation, RunFullProductIntelAsyncMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<RunFullProductIntelAsyncMutation, RunFullProductIntelAsyncMutationVariables>(RunFullProductIntelAsyncDocument, options);
      }
export type RunFullProductIntelAsyncMutationHookResult = ReturnType<typeof useRunFullProductIntelAsyncMutation>;
export type RunFullProductIntelAsyncMutationResult = Apollo.MutationResult<RunFullProductIntelAsyncMutation>;
export type RunFullProductIntelAsyncMutationOptions = Apollo.BaseMutationOptions<RunFullProductIntelAsyncMutation, RunFullProductIntelAsyncMutationVariables>;
export const DueRemindersDocument = gql`
    query DueReminders {
  dueReminders {
    reminder {
      id
      entityType
      entityId
      remindAt
      recurrence
      note
      status
      snoozedUntil
      createdAt
      updatedAt
    }
    contact {
      id
      slug
      firstName
      lastName
      position
      tags
    }
  }
}
    `;

/**
 * __useDueRemindersQuery__
 *
 * To run a query within a React component, call `useDueRemindersQuery` and pass it any options that fit your needs.
 * When your component renders, `useDueRemindersQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useDueRemindersQuery({
 *   variables: {
 *   },
 * });
 */
export function useDueRemindersQuery(baseOptions?: Apollo.QueryHookOptions<DueRemindersQuery, DueRemindersQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<DueRemindersQuery, DueRemindersQueryVariables>(DueRemindersDocument, options);
      }
export function useDueRemindersLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<DueRemindersQuery, DueRemindersQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<DueRemindersQuery, DueRemindersQueryVariables>(DueRemindersDocument, options);
        }
// @ts-ignore
export function useDueRemindersSuspenseQuery(baseOptions?: Apollo.SuspenseQueryHookOptions<DueRemindersQuery, DueRemindersQueryVariables>): Apollo.UseSuspenseQueryResult<DueRemindersQuery, DueRemindersQueryVariables>;
export function useDueRemindersSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<DueRemindersQuery, DueRemindersQueryVariables>): Apollo.UseSuspenseQueryResult<DueRemindersQuery | undefined, DueRemindersQueryVariables>;
export function useDueRemindersSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<DueRemindersQuery, DueRemindersQueryVariables>) {
          const options = baseOptions === Apollo.skipToken ? baseOptions : {...defaultOptions, ...baseOptions}
          return Apollo.useSuspenseQuery<DueRemindersQuery, DueRemindersQueryVariables>(DueRemindersDocument, options);
        }
export type DueRemindersQueryHookResult = ReturnType<typeof useDueRemindersQuery>;
export type DueRemindersLazyQueryHookResult = ReturnType<typeof useDueRemindersLazyQuery>;
export type DueRemindersSuspenseQueryHookResult = ReturnType<typeof useDueRemindersSuspenseQuery>;
export type DueRemindersQueryResult = Apollo.QueryResult<DueRemindersQuery, DueRemindersQueryVariables>;
export const RemindersDocument = gql`
    query Reminders($entityType: String!, $entityId: Int!) {
  reminders(entityType: $entityType, entityId: $entityId) {
    id
    entityType
    entityId
    remindAt
    recurrence
    note
    status
    snoozedUntil
    createdAt
    updatedAt
  }
}
    `;

/**
 * __useRemindersQuery__
 *
 * To run a query within a React component, call `useRemindersQuery` and pass it any options that fit your needs.
 * When your component renders, `useRemindersQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useRemindersQuery({
 *   variables: {
 *      entityType: // value for 'entityType'
 *      entityId: // value for 'entityId'
 *   },
 * });
 */
export function useRemindersQuery(baseOptions: Apollo.QueryHookOptions<RemindersQuery, RemindersQueryVariables> & ({ variables: RemindersQueryVariables; skip?: boolean; } | { skip: boolean; }) ) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<RemindersQuery, RemindersQueryVariables>(RemindersDocument, options);
      }
export function useRemindersLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<RemindersQuery, RemindersQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<RemindersQuery, RemindersQueryVariables>(RemindersDocument, options);
        }
// @ts-ignore
export function useRemindersSuspenseQuery(baseOptions?: Apollo.SuspenseQueryHookOptions<RemindersQuery, RemindersQueryVariables>): Apollo.UseSuspenseQueryResult<RemindersQuery, RemindersQueryVariables>;
export function useRemindersSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<RemindersQuery, RemindersQueryVariables>): Apollo.UseSuspenseQueryResult<RemindersQuery | undefined, RemindersQueryVariables>;
export function useRemindersSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<RemindersQuery, RemindersQueryVariables>) {
          const options = baseOptions === Apollo.skipToken ? baseOptions : {...defaultOptions, ...baseOptions}
          return Apollo.useSuspenseQuery<RemindersQuery, RemindersQueryVariables>(RemindersDocument, options);
        }
export type RemindersQueryHookResult = ReturnType<typeof useRemindersQuery>;
export type RemindersLazyQueryHookResult = ReturnType<typeof useRemindersLazyQuery>;
export type RemindersSuspenseQueryHookResult = ReturnType<typeof useRemindersSuspenseQuery>;
export type RemindersQueryResult = Apollo.QueryResult<RemindersQuery, RemindersQueryVariables>;
export const CreateReminderDocument = gql`
    mutation CreateReminder($input: CreateReminderInput!) {
  createReminder(input: $input) {
    id
    entityType
    entityId
    remindAt
    recurrence
    note
    status
    createdAt
  }
}
    `;
export type CreateReminderMutationFn = Apollo.MutationFunction<CreateReminderMutation, CreateReminderMutationVariables>;

/**
 * __useCreateReminderMutation__
 *
 * To run a mutation, you first call `useCreateReminderMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useCreateReminderMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [createReminderMutation, { data, loading, error }] = useCreateReminderMutation({
 *   variables: {
 *      input: // value for 'input'
 *   },
 * });
 */
export function useCreateReminderMutation(baseOptions?: Apollo.MutationHookOptions<CreateReminderMutation, CreateReminderMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<CreateReminderMutation, CreateReminderMutationVariables>(CreateReminderDocument, options);
      }
export type CreateReminderMutationHookResult = ReturnType<typeof useCreateReminderMutation>;
export type CreateReminderMutationResult = Apollo.MutationResult<CreateReminderMutation>;
export type CreateReminderMutationOptions = Apollo.BaseMutationOptions<CreateReminderMutation, CreateReminderMutationVariables>;
export const UpdateReminderDocument = gql`
    mutation UpdateReminder($id: Int!, $input: UpdateReminderInput!) {
  updateReminder(id: $id, input: $input) {
    id
    entityType
    entityId
    remindAt
    recurrence
    note
    status
    updatedAt
  }
}
    `;
export type UpdateReminderMutationFn = Apollo.MutationFunction<UpdateReminderMutation, UpdateReminderMutationVariables>;

/**
 * __useUpdateReminderMutation__
 *
 * To run a mutation, you first call `useUpdateReminderMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useUpdateReminderMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [updateReminderMutation, { data, loading, error }] = useUpdateReminderMutation({
 *   variables: {
 *      id: // value for 'id'
 *      input: // value for 'input'
 *   },
 * });
 */
export function useUpdateReminderMutation(baseOptions?: Apollo.MutationHookOptions<UpdateReminderMutation, UpdateReminderMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<UpdateReminderMutation, UpdateReminderMutationVariables>(UpdateReminderDocument, options);
      }
export type UpdateReminderMutationHookResult = ReturnType<typeof useUpdateReminderMutation>;
export type UpdateReminderMutationResult = Apollo.MutationResult<UpdateReminderMutation>;
export type UpdateReminderMutationOptions = Apollo.BaseMutationOptions<UpdateReminderMutation, UpdateReminderMutationVariables>;
export const SnoozeReminderDocument = gql`
    mutation SnoozeReminder($id: Int!, $days: Int!) {
  snoozeReminder(id: $id, days: $days) {
    id
    entityType
    entityId
    remindAt
    status
    snoozedUntil
    updatedAt
  }
}
    `;
export type SnoozeReminderMutationFn = Apollo.MutationFunction<SnoozeReminderMutation, SnoozeReminderMutationVariables>;

/**
 * __useSnoozeReminderMutation__
 *
 * To run a mutation, you first call `useSnoozeReminderMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useSnoozeReminderMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [snoozeReminderMutation, { data, loading, error }] = useSnoozeReminderMutation({
 *   variables: {
 *      id: // value for 'id'
 *      days: // value for 'days'
 *   },
 * });
 */
export function useSnoozeReminderMutation(baseOptions?: Apollo.MutationHookOptions<SnoozeReminderMutation, SnoozeReminderMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<SnoozeReminderMutation, SnoozeReminderMutationVariables>(SnoozeReminderDocument, options);
      }
export type SnoozeReminderMutationHookResult = ReturnType<typeof useSnoozeReminderMutation>;
export type SnoozeReminderMutationResult = Apollo.MutationResult<SnoozeReminderMutation>;
export type SnoozeReminderMutationOptions = Apollo.BaseMutationOptions<SnoozeReminderMutation, SnoozeReminderMutationVariables>;
export const DismissReminderDocument = gql`
    mutation DismissReminder($id: Int!) {
  dismissReminder(id: $id) {
    id
    entityType
    entityId
    status
    updatedAt
  }
}
    `;
export type DismissReminderMutationFn = Apollo.MutationFunction<DismissReminderMutation, DismissReminderMutationVariables>;

/**
 * __useDismissReminderMutation__
 *
 * To run a mutation, you first call `useDismissReminderMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useDismissReminderMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [dismissReminderMutation, { data, loading, error }] = useDismissReminderMutation({
 *   variables: {
 *      id: // value for 'id'
 *   },
 * });
 */
export function useDismissReminderMutation(baseOptions?: Apollo.MutationHookOptions<DismissReminderMutation, DismissReminderMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<DismissReminderMutation, DismissReminderMutationVariables>(DismissReminderDocument, options);
      }
export type DismissReminderMutationHookResult = ReturnType<typeof useDismissReminderMutation>;
export type DismissReminderMutationResult = Apollo.MutationResult<DismissReminderMutation>;
export type DismissReminderMutationOptions = Apollo.BaseMutationOptions<DismissReminderMutation, DismissReminderMutationVariables>;
export const ComputeNextTouchScoresDocument = gql`
    mutation ComputeNextTouchScores($companyId: Int!) {
  computeNextTouchScores(companyId: $companyId) {
    success
    message
    contactsUpdated
    topContacts {
      contactId
      firstName
      lastName
      position
      nextTouchScore
      lastContactedAt
    }
  }
}
    `;
export type ComputeNextTouchScoresMutationFn = Apollo.MutationFunction<ComputeNextTouchScoresMutation, ComputeNextTouchScoresMutationVariables>;

/**
 * __useComputeNextTouchScoresMutation__
 *
 * To run a mutation, you first call `useComputeNextTouchScoresMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useComputeNextTouchScoresMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [computeNextTouchScoresMutation, { data, loading, error }] = useComputeNextTouchScoresMutation({
 *   variables: {
 *      companyId: // value for 'companyId'
 *   },
 * });
 */
export function useComputeNextTouchScoresMutation(baseOptions?: Apollo.MutationHookOptions<ComputeNextTouchScoresMutation, ComputeNextTouchScoresMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<ComputeNextTouchScoresMutation, ComputeNextTouchScoresMutationVariables>(ComputeNextTouchScoresDocument, options);
      }
export type ComputeNextTouchScoresMutationHookResult = ReturnType<typeof useComputeNextTouchScoresMutation>;
export type ComputeNextTouchScoresMutationResult = Apollo.MutationResult<ComputeNextTouchScoresMutation>;
export type ComputeNextTouchScoresMutationOptions = Apollo.BaseMutationOptions<ComputeNextTouchScoresMutation, ComputeNextTouchScoresMutationVariables>;
export const ScoreContactsMlDocument = gql`
    mutation ScoreContactsML($companyId: Int!) {
  scoreContactsML(companyId: $companyId) {
    success
    message
    contactsScored
    decisionMakersFound
    results {
      contactId
      seniority
      department
      authorityScore
      isDecisionMaker
      dmReasons
    }
  }
}
    `;
export type ScoreContactsMlMutationFn = Apollo.MutationFunction<ScoreContactsMlMutation, ScoreContactsMlMutationVariables>;

/**
 * __useScoreContactsMlMutation__
 *
 * To run a mutation, you first call `useScoreContactsMlMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useScoreContactsMlMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [scoreContactsMlMutation, { data, loading, error }] = useScoreContactsMlMutation({
 *   variables: {
 *      companyId: // value for 'companyId'
 *   },
 * });
 */
export function useScoreContactsMlMutation(baseOptions?: Apollo.MutationHookOptions<ScoreContactsMlMutation, ScoreContactsMlMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<ScoreContactsMlMutation, ScoreContactsMlMutationVariables>(ScoreContactsMlDocument, options);
      }
export type ScoreContactsMlMutationHookResult = ReturnType<typeof useScoreContactsMlMutation>;
export type ScoreContactsMlMutationResult = Apollo.MutationResult<ScoreContactsMlMutation>;
export type ScoreContactsMlMutationOptions = Apollo.BaseMutationOptions<ScoreContactsMlMutation, ScoreContactsMlMutationVariables>;
export const GetReplyDraftsDocument = gql`
    query GetReplyDrafts($status: String, $draftType: String, $limit: Int, $offset: Int) {
  replyDrafts(
    status: $status
    draftType: $draftType
    limit: $limit
    offset: $offset
  ) {
    drafts {
      id
      receivedEmailId
      contactId
      status
      draftType
      subject
      bodyText
      bodyHtml
      generationModel
      contactName
      contactEmail
      companyName
      classification
      classificationConfidence
      approvedAt
      sentAt
      createdAt
      updatedAt
    }
    totalCount
  }
}
    `;

/**
 * __useGetReplyDraftsQuery__
 *
 * To run a query within a React component, call `useGetReplyDraftsQuery` and pass it any options that fit your needs.
 * When your component renders, `useGetReplyDraftsQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useGetReplyDraftsQuery({
 *   variables: {
 *      status: // value for 'status'
 *      draftType: // value for 'draftType'
 *      limit: // value for 'limit'
 *      offset: // value for 'offset'
 *   },
 * });
 */
export function useGetReplyDraftsQuery(baseOptions?: Apollo.QueryHookOptions<GetReplyDraftsQuery, GetReplyDraftsQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<GetReplyDraftsQuery, GetReplyDraftsQueryVariables>(GetReplyDraftsDocument, options);
      }
export function useGetReplyDraftsLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<GetReplyDraftsQuery, GetReplyDraftsQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<GetReplyDraftsQuery, GetReplyDraftsQueryVariables>(GetReplyDraftsDocument, options);
        }
// @ts-ignore
export function useGetReplyDraftsSuspenseQuery(baseOptions?: Apollo.SuspenseQueryHookOptions<GetReplyDraftsQuery, GetReplyDraftsQueryVariables>): Apollo.UseSuspenseQueryResult<GetReplyDraftsQuery, GetReplyDraftsQueryVariables>;
export function useGetReplyDraftsSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<GetReplyDraftsQuery, GetReplyDraftsQueryVariables>): Apollo.UseSuspenseQueryResult<GetReplyDraftsQuery | undefined, GetReplyDraftsQueryVariables>;
export function useGetReplyDraftsSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<GetReplyDraftsQuery, GetReplyDraftsQueryVariables>) {
          const options = baseOptions === Apollo.skipToken ? baseOptions : {...defaultOptions, ...baseOptions}
          return Apollo.useSuspenseQuery<GetReplyDraftsQuery, GetReplyDraftsQueryVariables>(GetReplyDraftsDocument, options);
        }
export type GetReplyDraftsQueryHookResult = ReturnType<typeof useGetReplyDraftsQuery>;
export type GetReplyDraftsLazyQueryHookResult = ReturnType<typeof useGetReplyDraftsLazyQuery>;
export type GetReplyDraftsSuspenseQueryHookResult = ReturnType<typeof useGetReplyDraftsSuspenseQuery>;
export type GetReplyDraftsQueryResult = Apollo.QueryResult<GetReplyDraftsQuery, GetReplyDraftsQueryVariables>;
export const GetDraftSummaryDocument = gql`
    query GetDraftSummary {
  draftSummary {
    pending
    approved
    sent
    dismissed
    byClassification {
      classification
      count
    }
  }
}
    `;

/**
 * __useGetDraftSummaryQuery__
 *
 * To run a query within a React component, call `useGetDraftSummaryQuery` and pass it any options that fit your needs.
 * When your component renders, `useGetDraftSummaryQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useGetDraftSummaryQuery({
 *   variables: {
 *   },
 * });
 */
export function useGetDraftSummaryQuery(baseOptions?: Apollo.QueryHookOptions<GetDraftSummaryQuery, GetDraftSummaryQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<GetDraftSummaryQuery, GetDraftSummaryQueryVariables>(GetDraftSummaryDocument, options);
      }
export function useGetDraftSummaryLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<GetDraftSummaryQuery, GetDraftSummaryQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<GetDraftSummaryQuery, GetDraftSummaryQueryVariables>(GetDraftSummaryDocument, options);
        }
// @ts-ignore
export function useGetDraftSummarySuspenseQuery(baseOptions?: Apollo.SuspenseQueryHookOptions<GetDraftSummaryQuery, GetDraftSummaryQueryVariables>): Apollo.UseSuspenseQueryResult<GetDraftSummaryQuery, GetDraftSummaryQueryVariables>;
export function useGetDraftSummarySuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<GetDraftSummaryQuery, GetDraftSummaryQueryVariables>): Apollo.UseSuspenseQueryResult<GetDraftSummaryQuery | undefined, GetDraftSummaryQueryVariables>;
export function useGetDraftSummarySuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<GetDraftSummaryQuery, GetDraftSummaryQueryVariables>) {
          const options = baseOptions === Apollo.skipToken ? baseOptions : {...defaultOptions, ...baseOptions}
          return Apollo.useSuspenseQuery<GetDraftSummaryQuery, GetDraftSummaryQueryVariables>(GetDraftSummaryDocument, options);
        }
export type GetDraftSummaryQueryHookResult = ReturnType<typeof useGetDraftSummaryQuery>;
export type GetDraftSummaryLazyQueryHookResult = ReturnType<typeof useGetDraftSummaryLazyQuery>;
export type GetDraftSummarySuspenseQueryHookResult = ReturnType<typeof useGetDraftSummarySuspenseQuery>;
export type GetDraftSummaryQueryResult = Apollo.QueryResult<GetDraftSummaryQuery, GetDraftSummaryQueryVariables>;
export const ApproveAndSendDraftDocument = gql`
    mutation ApproveAndSendDraft($draftId: Int!, $editedSubject: String, $editedBody: String) {
  approveAndSendDraft(
    draftId: $draftId
    editedSubject: $editedSubject
    editedBody: $editedBody
  ) {
    success
    resendId
    error
  }
}
    `;
export type ApproveAndSendDraftMutationFn = Apollo.MutationFunction<ApproveAndSendDraftMutation, ApproveAndSendDraftMutationVariables>;

/**
 * __useApproveAndSendDraftMutation__
 *
 * To run a mutation, you first call `useApproveAndSendDraftMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useApproveAndSendDraftMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [approveAndSendDraftMutation, { data, loading, error }] = useApproveAndSendDraftMutation({
 *   variables: {
 *      draftId: // value for 'draftId'
 *      editedSubject: // value for 'editedSubject'
 *      editedBody: // value for 'editedBody'
 *   },
 * });
 */
export function useApproveAndSendDraftMutation(baseOptions?: Apollo.MutationHookOptions<ApproveAndSendDraftMutation, ApproveAndSendDraftMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<ApproveAndSendDraftMutation, ApproveAndSendDraftMutationVariables>(ApproveAndSendDraftDocument, options);
      }
export type ApproveAndSendDraftMutationHookResult = ReturnType<typeof useApproveAndSendDraftMutation>;
export type ApproveAndSendDraftMutationResult = Apollo.MutationResult<ApproveAndSendDraftMutation>;
export type ApproveAndSendDraftMutationOptions = Apollo.BaseMutationOptions<ApproveAndSendDraftMutation, ApproveAndSendDraftMutationVariables>;
export const DismissDraftDocument = gql`
    mutation DismissDraft($draftId: Int!) {
  dismissDraft(draftId: $draftId) {
    success
  }
}
    `;
export type DismissDraftMutationFn = Apollo.MutationFunction<DismissDraftMutation, DismissDraftMutationVariables>;

/**
 * __useDismissDraftMutation__
 *
 * To run a mutation, you first call `useDismissDraftMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useDismissDraftMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [dismissDraftMutation, { data, loading, error }] = useDismissDraftMutation({
 *   variables: {
 *      draftId: // value for 'draftId'
 *   },
 * });
 */
export function useDismissDraftMutation(baseOptions?: Apollo.MutationHookOptions<DismissDraftMutation, DismissDraftMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<DismissDraftMutation, DismissDraftMutationVariables>(DismissDraftDocument, options);
      }
export type DismissDraftMutationHookResult = ReturnType<typeof useDismissDraftMutation>;
export type DismissDraftMutationResult = Apollo.MutationResult<DismissDraftMutation>;
export type DismissDraftMutationOptions = Apollo.BaseMutationOptions<DismissDraftMutation, DismissDraftMutationVariables>;
export const RegenerateDraftDocument = gql`
    mutation RegenerateDraft($draftId: Int!, $instructions: String) {
  regenerateDraft(draftId: $draftId, instructions: $instructions) {
    id
    subject
    bodyText
    status
    createdAt
  }
}
    `;
export type RegenerateDraftMutationFn = Apollo.MutationFunction<RegenerateDraftMutation, RegenerateDraftMutationVariables>;

/**
 * __useRegenerateDraftMutation__
 *
 * To run a mutation, you first call `useRegenerateDraftMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useRegenerateDraftMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [regenerateDraftMutation, { data, loading, error }] = useRegenerateDraftMutation({
 *   variables: {
 *      draftId: // value for 'draftId'
 *      instructions: // value for 'instructions'
 *   },
 * });
 */
export function useRegenerateDraftMutation(baseOptions?: Apollo.MutationHookOptions<RegenerateDraftMutation, RegenerateDraftMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<RegenerateDraftMutation, RegenerateDraftMutationVariables>(RegenerateDraftDocument, options);
      }
export type RegenerateDraftMutationHookResult = ReturnType<typeof useRegenerateDraftMutation>;
export type RegenerateDraftMutationResult = Apollo.MutationResult<RegenerateDraftMutation>;
export type RegenerateDraftMutationOptions = Apollo.BaseMutationOptions<RegenerateDraftMutation, RegenerateDraftMutationVariables>;
export const GenerateDraftsForPendingDocument = gql`
    mutation GenerateDraftsForPending {
  generateDraftsForPending {
    success
    generated
    skipped
    failed
    message
  }
}
    `;
export type GenerateDraftsForPendingMutationFn = Apollo.MutationFunction<GenerateDraftsForPendingMutation, GenerateDraftsForPendingMutationVariables>;

/**
 * __useGenerateDraftsForPendingMutation__
 *
 * To run a mutation, you first call `useGenerateDraftsForPendingMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useGenerateDraftsForPendingMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [generateDraftsForPendingMutation, { data, loading, error }] = useGenerateDraftsForPendingMutation({
 *   variables: {
 *   },
 * });
 */
export function useGenerateDraftsForPendingMutation(baseOptions?: Apollo.MutationHookOptions<GenerateDraftsForPendingMutation, GenerateDraftsForPendingMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<GenerateDraftsForPendingMutation, GenerateDraftsForPendingMutationVariables>(GenerateDraftsForPendingDocument, options);
      }
export type GenerateDraftsForPendingMutationHookResult = ReturnType<typeof useGenerateDraftsForPendingMutation>;
export type GenerateDraftsForPendingMutationResult = Apollo.MutationResult<GenerateDraftsForPendingMutation>;
export type GenerateDraftsForPendingMutationOptions = Apollo.BaseMutationOptions<GenerateDraftsForPendingMutation, GenerateDraftsForPendingMutationVariables>;
export const GenerateFollowUpDraftsDocument = gql`
    mutation GenerateFollowUpDrafts($daysAfterInitial: Int, $daysAfterFollowUp1: Int, $daysAfterFollowUp2: Int) {
  generateFollowUpDrafts(
    daysAfterInitial: $daysAfterInitial
    daysAfterFollowUp1: $daysAfterFollowUp1
    daysAfterFollowUp2: $daysAfterFollowUp2
  ) {
    success
    generated
    skipped
    failed
    message
  }
}
    `;
export type GenerateFollowUpDraftsMutationFn = Apollo.MutationFunction<GenerateFollowUpDraftsMutation, GenerateFollowUpDraftsMutationVariables>;

/**
 * __useGenerateFollowUpDraftsMutation__
 *
 * To run a mutation, you first call `useGenerateFollowUpDraftsMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useGenerateFollowUpDraftsMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [generateFollowUpDraftsMutation, { data, loading, error }] = useGenerateFollowUpDraftsMutation({
 *   variables: {
 *      daysAfterInitial: // value for 'daysAfterInitial'
 *      daysAfterFollowUp1: // value for 'daysAfterFollowUp1'
 *      daysAfterFollowUp2: // value for 'daysAfterFollowUp2'
 *   },
 * });
 */
export function useGenerateFollowUpDraftsMutation(baseOptions?: Apollo.MutationHookOptions<GenerateFollowUpDraftsMutation, GenerateFollowUpDraftsMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<GenerateFollowUpDraftsMutation, GenerateFollowUpDraftsMutationVariables>(GenerateFollowUpDraftsDocument, options);
      }
export type GenerateFollowUpDraftsMutationHookResult = ReturnType<typeof useGenerateFollowUpDraftsMutation>;
export type GenerateFollowUpDraftsMutationResult = Apollo.MutationResult<GenerateFollowUpDraftsMutation>;
export type GenerateFollowUpDraftsMutationOptions = Apollo.BaseMutationOptions<GenerateFollowUpDraftsMutation, GenerateFollowUpDraftsMutationVariables>;
export const ApproveAllDraftsDocument = gql`
    mutation ApproveAllDrafts($draftIds: [Int!]!) {
  approveAllDrafts(draftIds: $draftIds) {
    success
    sent
    failed
    errors
  }
}
    `;
export type ApproveAllDraftsMutationFn = Apollo.MutationFunction<ApproveAllDraftsMutation, ApproveAllDraftsMutationVariables>;

/**
 * __useApproveAllDraftsMutation__
 *
 * To run a mutation, you first call `useApproveAllDraftsMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useApproveAllDraftsMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [approveAllDraftsMutation, { data, loading, error }] = useApproveAllDraftsMutation({
 *   variables: {
 *      draftIds: // value for 'draftIds'
 *   },
 * });
 */
export function useApproveAllDraftsMutation(baseOptions?: Apollo.MutationHookOptions<ApproveAllDraftsMutation, ApproveAllDraftsMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<ApproveAllDraftsMutation, ApproveAllDraftsMutationVariables>(ApproveAllDraftsDocument, options);
      }
export type ApproveAllDraftsMutationHookResult = ReturnType<typeof useApproveAllDraftsMutation>;
export type ApproveAllDraftsMutationResult = Apollo.MutationResult<ApproveAllDraftsMutation>;
export type ApproveAllDraftsMutationOptions = Apollo.BaseMutationOptions<ApproveAllDraftsMutation, ApproveAllDraftsMutationVariables>;
export const DismissAllDraftsDocument = gql`
    mutation DismissAllDrafts($draftIds: [Int!]!) {
  dismissAllDrafts(draftIds: $draftIds) {
    success
    dismissed
  }
}
    `;
export type DismissAllDraftsMutationFn = Apollo.MutationFunction<DismissAllDraftsMutation, DismissAllDraftsMutationVariables>;

/**
 * __useDismissAllDraftsMutation__
 *
 * To run a mutation, you first call `useDismissAllDraftsMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useDismissAllDraftsMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [dismissAllDraftsMutation, { data, loading, error }] = useDismissAllDraftsMutation({
 *   variables: {
 *      draftIds: // value for 'draftIds'
 *   },
 * });
 */
export function useDismissAllDraftsMutation(baseOptions?: Apollo.MutationHookOptions<DismissAllDraftsMutation, DismissAllDraftsMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<DismissAllDraftsMutation, DismissAllDraftsMutationVariables>(DismissAllDraftsDocument, options);
      }
export type DismissAllDraftsMutationHookResult = ReturnType<typeof useDismissAllDraftsMutation>;
export type DismissAllDraftsMutationResult = Apollo.MutationResult<DismissAllDraftsMutation>;
export type DismissAllDraftsMutationOptions = Apollo.BaseMutationOptions<DismissAllDraftsMutation, DismissAllDraftsMutationVariables>;
export const GetCompanyScrapedPostsDocument = gql`
    query GetCompanyScrapedPosts($companySlug: String!) {
  companyScrapedPosts(companySlug: $companySlug) {
    companyName
    slug
    peopleCount
    postsCount
    posts {
      personName
      personLinkedinUrl
      personHeadline
      postUrl
      postText
      postedDate
      reactionsCount
      commentsCount
      repostsCount
      isRepost
      originalAuthor
      scrapedAt
    }
  }
}
    `;

/**
 * __useGetCompanyScrapedPostsQuery__
 *
 * To run a query within a React component, call `useGetCompanyScrapedPostsQuery` and pass it any options that fit your needs.
 * When your component renders, `useGetCompanyScrapedPostsQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useGetCompanyScrapedPostsQuery({
 *   variables: {
 *      companySlug: // value for 'companySlug'
 *   },
 * });
 */
export function useGetCompanyScrapedPostsQuery(baseOptions: Apollo.QueryHookOptions<GetCompanyScrapedPostsQuery, GetCompanyScrapedPostsQueryVariables> & ({ variables: GetCompanyScrapedPostsQueryVariables; skip?: boolean; } | { skip: boolean; }) ) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<GetCompanyScrapedPostsQuery, GetCompanyScrapedPostsQueryVariables>(GetCompanyScrapedPostsDocument, options);
      }
export function useGetCompanyScrapedPostsLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<GetCompanyScrapedPostsQuery, GetCompanyScrapedPostsQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<GetCompanyScrapedPostsQuery, GetCompanyScrapedPostsQueryVariables>(GetCompanyScrapedPostsDocument, options);
        }
// @ts-ignore
export function useGetCompanyScrapedPostsSuspenseQuery(baseOptions?: Apollo.SuspenseQueryHookOptions<GetCompanyScrapedPostsQuery, GetCompanyScrapedPostsQueryVariables>): Apollo.UseSuspenseQueryResult<GetCompanyScrapedPostsQuery, GetCompanyScrapedPostsQueryVariables>;
export function useGetCompanyScrapedPostsSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<GetCompanyScrapedPostsQuery, GetCompanyScrapedPostsQueryVariables>): Apollo.UseSuspenseQueryResult<GetCompanyScrapedPostsQuery | undefined, GetCompanyScrapedPostsQueryVariables>;
export function useGetCompanyScrapedPostsSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<GetCompanyScrapedPostsQuery, GetCompanyScrapedPostsQueryVariables>) {
          const options = baseOptions === Apollo.skipToken ? baseOptions : {...defaultOptions, ...baseOptions}
          return Apollo.useSuspenseQuery<GetCompanyScrapedPostsQuery, GetCompanyScrapedPostsQueryVariables>(GetCompanyScrapedPostsDocument, options);
        }
export type GetCompanyScrapedPostsQueryHookResult = ReturnType<typeof useGetCompanyScrapedPostsQuery>;
export type GetCompanyScrapedPostsLazyQueryHookResult = ReturnType<typeof useGetCompanyScrapedPostsLazyQuery>;
export type GetCompanyScrapedPostsSuspenseQueryHookResult = ReturnType<typeof useGetCompanyScrapedPostsSuspenseQuery>;
export type GetCompanyScrapedPostsQueryResult = Apollo.QueryResult<GetCompanyScrapedPostsQuery, GetCompanyScrapedPostsQueryVariables>;