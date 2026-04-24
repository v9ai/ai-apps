/* eslint-disable */
import type { TypedDocumentNode as DocumentNode } from '@graphql-typed-document-node/core';
export type Maybe<T> = T | null;
export type InputMaybe<T> = T | null | undefined;
export type Exact<T extends { [key: string]: unknown }> = { [K in keyof T]: T[K] };
export type MakeOptional<T, K extends keyof T> = Omit<T, K> & { [SubKey in K]?: Maybe<T[SubKey]> };
export type MakeMaybe<T, K extends keyof T> = Omit<T, K> & { [SubKey in K]: Maybe<T[SubKey]> };
export type MakeEmpty<T extends { [key: string]: unknown }, K extends keyof T> = { [_ in K]?: never };
export type Incremental<T> = T | { [P in keyof T]?: P extends ' $fragmentName' | '__typename' ? T[P] : never };
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
  __typename: 'AnalyzeCompanyResponse';
  companyId: Maybe<Scalars['Int']['output']>;
  companyKey: Maybe<Scalars['String']['output']>;
  message: Maybe<Scalars['String']['output']>;
  success: Scalars['Boolean']['output'];
};

export type AnalyzePostsResult = {
  __typename: 'AnalyzePostsResult';
  analyzed: Scalars['Int']['output'];
  errors: Array<Scalars['String']['output']>;
  failed: Scalars['Int']['output'];
  success: Scalars['Boolean']['output'];
};

export type ApplyEmailPatternResult = {
  __typename: 'ApplyEmailPatternResult';
  contacts: Array<Contact>;
  contactsUpdated: Scalars['Int']['output'];
  message: Scalars['String']['output'];
  pattern: Maybe<Scalars['String']['output']>;
  success: Scalars['Boolean']['output'];
};

export type ArbitrageOpportunity = {
  __typename: 'ArbitrageOpportunity';
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
  __typename: 'ArbitrageRegion';
  avgPremium: Scalars['Float']['output'];
  count: Scalars['Int']['output'];
  region: Scalars['String']['output'];
};

export type ArbitrageReport = {
  __typename: 'ArbitrageReport';
  byRegion: Array<ArbitrageRegion>;
  topOpportunities: Array<ArbitrageOpportunity>;
  totalOpportunities: Scalars['Int']['output'];
};

export type ArchiveEmailResult = {
  __typename: 'ArchiveEmailResult';
  message: Scalars['String']['output'];
  success: Scalars['Boolean']['output'];
};

export type BatchDetectIntentResult = {
  __typename: 'BatchDetectIntentResult';
  errors: Array<Scalars['String']['output']>;
  processed: Scalars['Int']['output'];
  signalsDetected: Scalars['Int']['output'];
  success: Scalars['Boolean']['output'];
};

export type BatchDismissResult = {
  __typename: 'BatchDismissResult';
  dismissed: Scalars['Int']['output'];
  success: Scalars['Boolean']['output'];
};

export type BatchOperationResult = {
  __typename: 'BatchOperationResult';
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
  __typename: 'BatchSendDraftResult';
  errors: Array<Scalars['String']['output']>;
  failed: Scalars['Int']['output'];
  sent: Scalars['Int']['output'];
  success: Scalars['Boolean']['output'];
};

export type CancelCompanyEmailsResult = {
  __typename: 'CancelCompanyEmailsResult';
  cancelledCount: Scalars['Int']['output'];
  failedCount: Scalars['Int']['output'];
  message: Scalars['String']['output'];
  success: Scalars['Boolean']['output'];
};

export type CancelEmailResult = {
  __typename: 'CancelEmailResult';
  error: Maybe<Scalars['String']['output']>;
  success: Scalars['Boolean']['output'];
};

export type ClassificationCount = {
  __typename: 'ClassificationCount';
  classification: Scalars['String']['output'];
  count: Scalars['Int']['output'];
};

export type ClassifyBatchResult = {
  __typename: 'ClassifyBatchResult';
  classified: Scalars['Int']['output'];
  message: Scalars['String']['output'];
  success: Scalars['Boolean']['output'];
};

export type ClassifyEmailResult = {
  __typename: 'ClassifyEmailResult';
  classification: Maybe<Scalars['String']['output']>;
  confidence: Maybe<Scalars['Float']['output']>;
  matchedContactId: Maybe<Scalars['Int']['output']>;
  success: Scalars['Boolean']['output'];
};

export type CompaniesResponse = {
  __typename: 'CompaniesResponse';
  companies: Array<Company>;
  totalCount: Scalars['Int']['output'];
};

export type Company = {
  __typename: 'Company';
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


export type CompanyIntentScoreDetailsArgs = {
  productId?: InputMaybe<Scalars['Int']['input']>;
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
  __typename: 'CompanyContactEmail';
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
  __typename: 'CompanyFact';
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
  __typename: 'CompanyScrapedPostsResult';
  companyName: Scalars['String']['output'];
  firstScraped: Maybe<Scalars['String']['output']>;
  lastScraped: Maybe<Scalars['String']['output']>;
  peopleCount: Scalars['Int']['output'];
  posts: Array<ScrapedPost>;
  postsCount: Scalars['Int']['output'];
  slug: Scalars['String']['output'];
};

export type CompanySnapshot = {
  __typename: 'CompanySnapshot';
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
  __typename: 'CompanyVelocity';
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
  __typename: 'CompetitiveReport';
  fastestGrowing: Array<CompetitorProfile>;
  newEntrants: Array<CompetitorProfile>;
  period: Scalars['String']['output'];
  topHirers: Array<CompetitorProfile>;
};

export type Competitor = {
  __typename: 'Competitor';
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
  __typename: 'CompetitorAnalysis';
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
  __typename: 'CompetitorFeature';
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
  __typename: 'CompetitorIntegration';
  category: Maybe<Scalars['String']['output']>;
  id: Scalars['Int']['output'];
  integrationName: Scalars['String']['output'];
  integrationUrl: Maybe<Scalars['URL']['output']>;
};

export type CompetitorProfile = {
  __typename: 'CompetitorProfile';
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
  __typename: 'ComputeNextTouchScoresResult';
  contactsUpdated: Scalars['Int']['output'];
  message: Scalars['String']['output'];
  success: Scalars['Boolean']['output'];
  topContacts: Array<ContactNextTouch>;
};

export type Contact = {
  __typename: 'Contact';
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
  __typename: 'ContactAIGitHubRepo';
  description: Maybe<Scalars['String']['output']>;
  name: Scalars['String']['output'];
  stars: Scalars['Int']['output'];
  topics: Array<Scalars['String']['output']>;
};

export type ContactAiProfile = {
  __typename: 'ContactAIProfile';
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
  __typename: 'ContactEmail';
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
  __typename: 'ContactLoraScore';
  contactId: Scalars['Int']['output'];
  reasons: Array<Scalars['String']['output']>;
  score: Scalars['Float']['output'];
  tier: Scalars['String']['output'];
};

export type ContactMlScore = {
  __typename: 'ContactMLScore';
  authorityScore: Scalars['Float']['output'];
  contactId: Scalars['Int']['output'];
  department: Scalars['String']['output'];
  dmReasons: Array<Scalars['String']['output']>;
  isDecisionMaker: Scalars['Boolean']['output'];
  seniority: Scalars['String']['output'];
};

export type ContactMessage = {
  __typename: 'ContactMessage';
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
  __typename: 'ContactNextTouch';
  contactId: Scalars['Int']['output'];
  firstName: Scalars['String']['output'];
  lastContactedAt: Maybe<Scalars['String']['output']>;
  lastName: Scalars['String']['output'];
  nextTouchScore: Scalars['Float']['output'];
  position: Maybe<Scalars['String']['output']>;
};

export type ContactPaper = {
  __typename: 'ContactPaper';
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
  __typename: 'ContactWorkExperience';
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
  __typename: 'ContactsResult';
  contacts: Array<Contact>;
  totalCount: Scalars['Int']['output'];
};

export type CountRemoteVoyagerJobsInput = {
  /** Company LinkedIn numeric IDs to count remote jobs for */
  companyNumericIds: Array<Scalars['String']['input']>;
};

/** Result of a countRemoteVoyagerJobs mutation. */
export type CountRemoteVoyagerJobsResult = {
  __typename: 'CountRemoteVoyagerJobsResult';
  counts: Array<VoyagerCompanyJobCount>;
  errors: Array<Scalars['String']['output']>;
  success: Scalars['Boolean']['output'];
};

export type CrawlLog = {
  __typename: 'CrawlLog';
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
  personaMatchThreshold?: InputMaybe<Scalars['Float']['input']>;
  productAwareMode?: InputMaybe<Scalars['Boolean']['input']>;
  productId?: InputMaybe<Scalars['Int']['input']>;
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
  __typename: 'DailyJobCount';
  date: Scalars['String']['output'];
  newJobs24h: Scalars['Int']['output'];
  query: Scalars['String']['output'];
  remoteJobs: Scalars['Int']['output'];
  remoteRatio: Scalars['Float']['output'];
  totalJobs: Scalars['Int']['output'];
};

export type DataQualityScore = {
  __typename: 'DataQualityScore';
  completeness: Scalars['Float']['output'];
  composite: Scalars['Float']['output'];
  freshness: Scalars['Float']['output'];
  missingFields: Array<Scalars['String']['output']>;
  staleFields: Array<Scalars['String']['output']>;
};

export type DeleteCampaignResult = {
  __typename: 'DeleteCampaignResult';
  message: Maybe<Scalars['String']['output']>;
  success: Scalars['Boolean']['output'];
};

export type DeleteCompaniesResult = {
  __typename: 'DeleteCompaniesResult';
  deleted: Scalars['Int']['output'];
  message: Scalars['String']['output'];
  success: Scalars['Boolean']['output'];
};

export type DeleteCompanyResponse = {
  __typename: 'DeleteCompanyResponse';
  message: Maybe<Scalars['String']['output']>;
  success: Scalars['Boolean']['output'];
};

export type DeleteContactResult = {
  __typename: 'DeleteContactResult';
  message: Scalars['String']['output'];
  success: Scalars['Boolean']['output'];
};

export type DeleteEmailTemplateResult = {
  __typename: 'DeleteEmailTemplateResult';
  message: Maybe<Scalars['String']['output']>;
  success: Scalars['Boolean']['output'];
};

export type DetectIntentResult = {
  __typename: 'DetectIntentResult';
  intentScore: Maybe<Scalars['Float']['output']>;
  message: Maybe<Scalars['String']['output']>;
  signalsDetected: Scalars['Int']['output'];
  success: Scalars['Boolean']['output'];
};

export type DismissDraftResult = {
  __typename: 'DismissDraftResult';
  success: Scalars['Boolean']['output'];
};

export type DraftSummary = {
  __typename: 'DraftSummary';
  approved: Scalars['Int']['output'];
  byClassification: Array<ClassificationCount>;
  dismissed: Scalars['Int']['output'];
  pending: Scalars['Int']['output'];
  sent: Scalars['Int']['output'];
};

export type EmailCampaign = {
  __typename: 'EmailCampaign';
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
  personaMatchThreshold: Maybe<Scalars['Float']['output']>;
  product: Maybe<Product>;
  productAwareMode: Scalars['Boolean']['output'];
  productId: Maybe<Scalars['Int']['output']>;
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
  __typename: 'EmailCampaignsResult';
  campaigns: Array<EmailCampaign>;
  totalCount: Scalars['Int']['output'];
};

export type EmailPreview = {
  __typename: 'EmailPreview';
  drySendResult: Maybe<Scalars['String']['output']>;
  htmlContent: Scalars['String']['output'];
  subject: Scalars['String']['output'];
};

export type EmailStats = {
  __typename: 'EmailStats';
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
  __typename: 'EmailTemplate';
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
  __typename: 'EmailTemplatesResult';
  templates: Array<EmailTemplate>;
  totalCount: Scalars['Int']['output'];
};

export type EmailThread = {
  __typename: 'EmailThread';
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
  __typename: 'EmailThreadsResult';
  threads: Array<EmailThread>;
  totalCount: Scalars['Int']['output'];
};

export type EmergingRole = {
  __typename: 'EmergingRole';
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
  __typename: 'EmergingRolesReport';
  declining: Array<EmergingRole>;
  novelTitles: Array<EmergingRole>;
  period: Scalars['String']['output'];
  surging: Array<EmergingRole>;
};

export type EnhanceAllContactsResult = {
  __typename: 'EnhanceAllContactsResult';
  companiesProcessed: Scalars['Int']['output'];
  errors: Array<Scalars['String']['output']>;
  message: Scalars['String']['output'];
  success: Scalars['Boolean']['output'];
  totalContactsProcessed: Scalars['Int']['output'];
  totalEmailsFound: Scalars['Int']['output'];
};

export type EnhanceCompanyResponse = {
  __typename: 'EnhanceCompanyResponse';
  companyId: Maybe<Scalars['Int']['output']>;
  companyKey: Maybe<Scalars['String']['output']>;
  message: Maybe<Scalars['String']['output']>;
  success: Scalars['Boolean']['output'];
};

export type EnrichAiContactResult = {
  __typename: 'EnrichAIContactResult';
  aiProfile: Maybe<ContactAiProfile>;
  contactId: Scalars['Int']['output'];
  message: Scalars['String']['output'];
  success: Scalars['Boolean']['output'];
};

export type EnrichAiContactsBulkResult = {
  __typename: 'EnrichAIContactsBulkResult';
  enriched: Scalars['Int']['output'];
  errors: Array<Scalars['String']['output']>;
  message: Scalars['String']['output'];
  skipped: Scalars['Int']['output'];
  success: Scalars['Boolean']['output'];
};

export type EnrichContactPapersResult = {
  __typename: 'EnrichContactPapersResult';
  contactId: Scalars['Int']['output'];
  message: Scalars['String']['output'];
  papers: Array<ContactPaper>;
  papersEnrichedAt: Maybe<Scalars['String']['output']>;
  success: Scalars['Boolean']['output'];
  tags: Array<Scalars['String']['output']>;
  tagsAdded: Array<Scalars['String']['output']>;
};

export type Evidence = {
  __typename: 'Evidence';
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
  __typename: 'ExtractedSkill';
  confidence: Scalars['Float']['output'];
  label: Scalars['String']['output'];
  tag: Scalars['String']['output'];
};

export type FindCompanyResult = {
  __typename: 'FindCompanyResult';
  company: Maybe<Company>;
  found: Scalars['Boolean']['output'];
};

export type FindContactEmailResult = {
  __typename: 'FindContactEmailResult';
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
  __typename: 'FollowUpBatchResult';
  contactCount: Scalars['Int']['output'];
  emailIds: Array<Scalars['String']['output']>;
  message: Scalars['String']['output'];
  success: Scalars['Boolean']['output'];
};

export type FollowUpEmail = {
  __typename: 'FollowUpEmail';
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
  __typename: 'FollowUpEmailsResult';
  emails: Array<FollowUpEmail>;
  totalCount: Scalars['Int']['output'];
};

export type GenerateDraftsBatchResult = {
  __typename: 'GenerateDraftsBatchResult';
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
  __typename: 'GenerateEmailResult';
  html: Scalars['String']['output'];
  subject: Scalars['String']['output'];
  text: Scalars['String']['output'];
};

export type GenerateEmbeddingsResult = {
  __typename: 'GenerateEmbeddingsResult';
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
  __typename: 'GenerateReplyResult';
  body: Scalars['String']['output'];
  subject: Scalars['String']['output'];
};

export type GrowthReport = {
  __typename: 'GrowthReport';
  byIndustry: Array<IndustryGrowth>;
  byRegion: Array<RegionGrowth>;
  overallGrowthRate: Scalars['Float']['output'];
  period: Scalars['String']['output'];
};

export type ImportCompaniesResult = {
  __typename: 'ImportCompaniesResult';
  errors: Array<Scalars['String']['output']>;
  failed: Scalars['Int']['output'];
  imported: Scalars['Int']['output'];
  success: Scalars['Boolean']['output'];
};

export type ImportCompanyResult = {
  __typename: 'ImportCompanyResult';
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
  __typename: 'ImportContactsResult';
  errors: Array<Scalars['String']['output']>;
  failed: Scalars['Int']['output'];
  imported: Scalars['Int']['output'];
  success: Scalars['Boolean']['output'];
  updated: Scalars['Int']['output'];
};

export type ImportResendResult = {
  __typename: 'ImportResendResult';
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
  __typename: 'IndustryGrowth';
  currentCount: Scalars['Int']['output'];
  growthRate: Scalars['Float']['output'];
  industry: Scalars['String']['output'];
  previousCount: Scalars['Int']['output'];
  remoteRatio: Scalars['Float']['output'];
};

export type IntelRun = {
  __typename: 'IntelRun';
  error: Maybe<Scalars['String']['output']>;
  finishedAt: Maybe<Scalars['DateTime']['output']>;
  id: Scalars['ID']['output'];
  kind: Scalars['String']['output'];
  output: Maybe<Scalars['JSON']['output']>;
  productId: Scalars['Int']['output'];
  /** Streaming progress snapshot written by graph nodes as they execute. See migration 0063. */
  progress: Maybe<Scalars['JSON']['output']>;
  startedAt: Scalars['DateTime']['output'];
  status: Scalars['String']['output'];
  /** Aggregate USD cost across all LLM calls in this run. See migration 0066. */
  totalCostUsd: Maybe<Scalars['Float']['output']>;
};

export type IntelRunAccepted = {
  __typename: 'IntelRunAccepted';
  kind: Scalars['String']['output'];
  productId: Scalars['Int']['output'];
  runId: Scalars['ID']['output'];
  status: Scalars['String']['output'];
};

export type IntentDashboard = {
  __typename: 'IntentDashboard';
  companiesWithIntent: Scalars['Int']['output'];
  recentSignals: Array<IntentSignal>;
  signalsByType: Array<SignalTypeCount>;
  topIntentCompanies: Array<Company>;
  totalSignals: Scalars['Int']['output'];
};

export type IntentScore = {
  __typename: 'IntentScore';
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
  __typename: 'IntentSignal';
  companyId: Scalars['Int']['output'];
  competitor: Maybe<Competitor>;
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
  productId: Maybe<Scalars['Int']['output']>;
  rawText: Scalars['String']['output'];
  signalType: IntentSignalType;
  sourceType: Scalars['String']['output'];
  sourceUrl: Maybe<Scalars['String']['output']>;
};

export type IntentSignalType =
  | 'BUDGET_CYCLE'
  | 'COMPETITOR_MENTION'
  | 'GROWTH_SIGNAL'
  | 'HIRING_INTENT'
  | 'LEADERSHIP_CHANGE'
  | 'PRODUCT_LAUNCH'
  | 'TECH_ADOPTION';

export type IntentSignalsResponse = {
  __typename: 'IntentSignalsResponse';
  signals: Array<IntentSignal>;
  totalCount: Scalars['Int']['output'];
};

export type JobCountTrend = {
  __typename: 'JobCountTrend';
  avgDailyRemote: Scalars['Float']['output'];
  dataPoints: Array<DailyJobCount>;
  growthRate: Scalars['Float']['output'];
  period: Scalars['String']['output'];
  query: Scalars['String']['output'];
  trend: Scalars['String']['output'];
};

export type LinkedInPost = {
  __typename: 'LinkedInPost';
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
  __typename: 'LoraTierBreakdown';
  a: Scalars['Int']['output'];
  b: Scalars['Int']['output'];
  c: Scalars['Int']['output'];
  d: Scalars['Int']['output'];
};

export type MlStats = {
  __typename: 'MLStats';
  companiesEmbedded: Scalars['Int']['output'];
  lastEmbeddingAt: Maybe<Scalars['String']['output']>;
  modelsAvailable: Array<Scalars['String']['output']>;
  totalCompanies: Scalars['Int']['output'];
};

export type MarkRepliedResult = {
  __typename: 'MarkRepliedResult';
  message: Maybe<Scalars['String']['output']>;
  success: Scalars['Boolean']['output'];
};

export type MergeCompaniesResult = {
  __typename: 'MergeCompaniesResult';
  keptCompanyId: Maybe<Scalars['Int']['output']>;
  merged: Scalars['Int']['output'];
  message: Scalars['String']['output'];
  success: Scalars['Boolean']['output'];
};

export type MergeDuplicateContactsResult = {
  __typename: 'MergeDuplicateContactsResult';
  mergedCount: Scalars['Int']['output'];
  message: Scalars['String']['output'];
  removedCount: Scalars['Int']['output'];
  success: Scalars['Boolean']['output'];
};

export type Mutation = {
  __typename: 'Mutation';
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
  retagIntentSignalProducts: RefreshIntentResult;
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
  setProductPublished: Product;
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
  resumeFromRunId?: InputMaybe<Scalars['ID']['input']>;
};


export type MutationAnalyzeProductIcpArgs = {
  id: Scalars['Int']['input'];
};


export type MutationAnalyzeProductPricingArgs = {
  id: Scalars['Int']['input'];
};


export type MutationAnalyzeProductPricingAsyncArgs = {
  id: Scalars['Int']['input'];
  resumeFromRunId?: InputMaybe<Scalars['ID']['input']>;
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


export type MutationRetagIntentSignalProductsArgs = {
  productId: Scalars['Int']['input'];
};


export type MutationRunFullProductIntelArgs = {
  id: Scalars['Int']['input'];
};


export type MutationRunFullProductIntelAsyncArgs = {
  forceRefresh?: InputMaybe<Scalars['Boolean']['input']>;
  id: Scalars['Int']['input'];
  resumeFromRunId?: InputMaybe<Scalars['ID']['input']>;
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


export type MutationSetProductPublishedArgs = {
  id: Scalars['Int']['input'];
  published: Scalars['Boolean']['input'];
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
  __typename: 'Opportunity';
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
  __typename: 'PricingTier';
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
  __typename: 'Product';
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
  /** Latest (by created_at) competitor_analyses row for this product, if any. Used by the /products/[slug]/competitors UI. */
  latestCompetitorAnalysis: Maybe<CompetitorAnalysis>;
  name: Scalars['String']['output'];
  positioningAnalysis: Maybe<Scalars['JSON']['output']>;
  pricingAnalysis: Maybe<Scalars['JSON']['output']>;
  pricingAnalyzedAt: Maybe<Scalars['DateTime']['output']>;
  publishedAt: Maybe<Scalars['DateTime']['output']>;
  slug: Scalars['String']['output'];
  updatedAt: Scalars['DateTime']['output'];
  url: Scalars['URL']['output'];
};

export type ProductInput = {
  description?: InputMaybe<Scalars['String']['input']>;
  name: Scalars['String']['input'];
  url: Scalars['String']['input'];
};

/** One scored company for a given product — a row in company_product_signals joined with its company. */
export type ProductLead = {
  __typename: 'ProductLead';
  companyDescription: Maybe<Scalars['String']['output']>;
  companyDomain: Maybe<Scalars['String']['output']>;
  companyId: Scalars['Int']['output'];
  companyIndustry: Maybe<Scalars['String']['output']>;
  companyKey: Scalars['String']['output'];
  companyLocation: Maybe<Scalars['String']['output']>;
  companyLogoUrl: Maybe<Scalars['String']['output']>;
  companyName: Scalars['String']['output'];
  companySize: Maybe<Scalars['String']['output']>;
  regexScore: Scalars['Float']['output'];
  score: Scalars['Float']['output'];
  semanticScore: Maybe<Scalars['Float']['output']>;
  /** Vertical-specific signal payload; always includes schema_version. */
  signals: Maybe<Scalars['JSON']['output']>;
  /** 'hot' | 'warm' | 'cold' | null */
  tier: Maybe<Scalars['String']['output']>;
  updatedAt: Scalars['DateTime']['output'];
};

export type ProductLeadsConnection = {
  __typename: 'ProductLeadsConnection';
  coldCount: Scalars['Int']['output'];
  hotCount: Scalars['Int']['output'];
  leads: Array<ProductLead>;
  totalCount: Scalars['Int']['output'];
  warmCount: Scalars['Int']['output'];
};

export type QualityGateResult = {
  __typename: 'QualityGateResult';
  adjustedScore: Scalars['Float']['output'];
  flags: Array<Scalars['String']['output']>;
  pass: Scalars['Boolean']['output'];
  recommendations: Array<Scalars['String']['output']>;
};

export type Query = {
  __typename: 'Query';
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
  /** Scored leads for a product, ordered by tier then score desc. Backed by company_product_signals. */
  productLeads: ProductLeadsConnection;
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
  similarCompaniesByProfile: Array<Company>;
  similarPosts: Array<SimilarPost>;
  topCompaniesForProduct: Array<Company>;
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
  productId?: InputMaybe<Scalars['Int']['input']>;
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


export type QueryIntentDashboardArgs = {
  productId?: InputMaybe<Scalars['Int']['input']>;
};


export type QueryIntentSignalsArgs = {
  companyId: Scalars['Int']['input'];
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
  productId?: InputMaybe<Scalars['Int']['input']>;
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
  graphVersion?: InputMaybe<Scalars['String']['input']>;
  kind?: InputMaybe<Scalars['String']['input']>;
  minSchemaVersion?: InputMaybe<Scalars['String']['input']>;
  productId: Scalars['Int']['input'];
};


export type QueryProductLeadsArgs = {
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
  slug: Scalars['String']['input'];
  tier?: InputMaybe<Scalars['String']['input']>;
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


export type QuerySimilarCompaniesByProfileArgs = {
  companyId: Scalars['Int']['input'];
  limit?: InputMaybe<Scalars['Int']['input']>;
};


export type QuerySimilarPostsArgs = {
  limit?: InputMaybe<Scalars['Int']['input']>;
  minScore?: InputMaybe<Scalars['Float']['input']>;
  postId: Scalars['Int']['input'];
};


export type QueryTopCompaniesForProductArgs = {
  limit?: InputMaybe<Scalars['Int']['input']>;
  minScore?: InputMaybe<Scalars['Float']['input']>;
  productId: Scalars['Int']['input'];
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
  __typename: 'RankedContact';
  contact: Contact;
  rankScore: Scalars['Float']['output'];
  reasons: Array<Scalars['String']['output']>;
};

export type ReceivedEmail = {
  __typename: 'ReceivedEmail';
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
  __typename: 'ReceivedEmailsResult';
  emails: Array<ReceivedEmail>;
  totalCount: Scalars['Int']['output'];
};

export type RecommendedCompany = {
  __typename: 'RecommendedCompany';
  company: Company;
  reasons: Array<Scalars['String']['output']>;
  score: Scalars['Float']['output'];
};

export type RefreshIntentResult = {
  __typename: 'RefreshIntentResult';
  companiesUpdated: Scalars['Int']['output'];
  success: Scalars['Boolean']['output'];
};

export type RegionGrowth = {
  __typename: 'RegionGrowth';
  currentCount: Scalars['Int']['output'];
  growthRate: Scalars['Float']['output'];
  location: Scalars['String']['output'];
  previousCount: Scalars['Int']['output'];
  remoteCount: Scalars['Int']['output'];
};

export type Reminder = {
  __typename: 'Reminder';
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
  __typename: 'ReminderWithContact';
  contact: Contact;
  reminder: Reminder;
};

export type ReplyDraft = {
  __typename: 'ReplyDraft';
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
  __typename: 'ReplyDraftsResult';
  drafts: Array<ReplyDraft>;
  totalCount: Scalars['Int']['output'];
};

export type RepostReport = {
  __typename: 'RepostReport';
  avgDaysOpen: Scalars['Float']['output'];
  avgRepostCount: Scalars['Float']['output'];
  hardToFillJobs: Array<RepostSignal>;
  repostRate: Scalars['Float']['output'];
  repostedJobs: Scalars['Int']['output'];
  totalJobsTracked: Scalars['Int']['output'];
};

export type RepostSignal = {
  __typename: 'RepostSignal';
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
  __typename: 'ResendEmailDetail';
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
  __typename: 'SalaryBand';
  currency: Scalars['String']['output'];
  max: Scalars['Float']['output'];
  median: Scalars['Float']['output'];
  min: Scalars['Float']['output'];
  p25: Scalars['Float']['output'];
  p75: Scalars['Float']['output'];
  sampleCount: Scalars['Int']['output'];
};

export type SalaryRegionBreakdown = {
  __typename: 'SalaryRegionBreakdown';
  band: SalaryBand;
  region: Scalars['String']['output'];
};

export type SalarySeniorityBreakdown = {
  __typename: 'SalarySeniorityBreakdown';
  band: SalaryBand;
  level: Scalars['String']['output'];
};

export type SalaryTrend = {
  __typename: 'SalaryTrend';
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
  __typename: 'SalescueAnalyzeResult';
  errors: Array<SalescueModuleError>;
  modulesRun: Scalars['Int']['output'];
  results: Scalars['JSON']['output'];
  timings: Scalars['JSON']['output'];
  totalTime: Scalars['Float']['output'];
};

export type SalescueAnomalyResult = {
  __typename: 'SalescueAnomalyResult';
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
  __typename: 'SalescueBanditAlternative';
  sampledReward: Scalars['Float']['output'];
  subjectStyle: Scalars['String']['output'];
  template: Scalars['String']['output'];
  timing: Scalars['String']['output'];
};

export type SalescueBanditArm = {
  __typename: 'SalescueBanditArm';
  subjectStyle: Scalars['String']['output'];
  template: Scalars['String']['output'];
  timing: Scalars['String']['output'];
};

export type SalescueBanditResult = {
  __typename: 'SalescueBanditResult';
  alternatives: Array<SalescueBanditAlternative>;
  armIndex: Scalars['Int']['output'];
  bestArm: SalescueBanditArm;
  expectedReward: Scalars['Float']['output'];
  explorationTemperature: Scalars['Float']['output'];
  sampledReward: Scalars['Float']['output'];
  totalArms: Scalars['Int']['output'];
};

export type SalescueCallResult = {
  __typename: 'SalescueCallResult';
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
  __typename: 'SalescueCoachingCard';
  avoid: Array<Scalars['String']['output']>;
  example: Scalars['String']['output'];
  framework: Scalars['String']['output'];
  steps: Array<Scalars['String']['output']>;
};

export type SalescueCommitment = {
  __typename: 'SalescueCommitment';
  negated: Scalars['Boolean']['output'];
  pattern: Scalars['String']['output'];
  speaker: Scalars['String']['output'];
  turn: Scalars['Int']['output'];
  type: Scalars['String']['output'];
};

export type SalescueEmailgenResult = {
  __typename: 'SalescueEmailgenResult';
  contextUsed: Scalars['JSON']['output'];
  email: Scalars['String']['output'];
  emailType: Scalars['String']['output'];
  hasCallToAction: Scalars['Boolean']['output'];
  promptTokens: Scalars['Int']['output'];
  wordCount: Scalars['Int']['output'];
};

export type SalescueEntitiesResult = {
  __typename: 'SalescueEntitiesResult';
  entities: Array<SalescueEntity>;
  neuralCount: Scalars['Int']['output'];
  regexCount: Scalars['Int']['output'];
  typesFound: Array<Scalars['String']['output']>;
};

export type SalescueEntity = {
  __typename: 'SalescueEntity';
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
  __typename: 'SalescueGraphResult';
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
  __typename: 'SalescueGraphSignal';
  strength: Scalars['Float']['output'];
  type: Scalars['String']['output'];
  with: Scalars['String']['output'];
};

export type SalescueHealth = {
  __typename: 'SalescueHealth';
  device: Scalars['String']['output'];
  moduleCount: Scalars['Int']['output'];
  modules: Array<Scalars['String']['output']>;
  status: Scalars['String']['output'];
  version: Scalars['String']['output'];
};

export type SalescueIcpDimensionFit = {
  __typename: 'SalescueICPDimensionFit';
  distance: Scalars['Float']['output'];
  fit: Maybe<Scalars['Float']['output']>;
  icpSpread: Scalars['Float']['output'];
  status: Scalars['String']['output'];
};

export type SalescueIcpResult = {
  __typename: 'SalescueICPResult';
  dealbreakers: Array<Scalars['String']['output']>;
  dimensions: Scalars['JSON']['output'];
  missing: Array<Scalars['String']['output']>;
  qualified: Scalars['Boolean']['output'];
  score: Scalars['Float']['output'];
};

export type SalescueIntentResult = {
  __typename: 'SalescueIntentResult';
  confidence: Scalars['Float']['output'];
  dataPoints: Scalars['Int']['output'];
  distribution: Scalars['JSON']['output'];
  stage: Scalars['String']['output'];
  trajectory: Maybe<SalescueIntentTrajectory>;
};

export type SalescueIntentTrajectory = {
  __typename: 'SalescueIntentTrajectory';
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
  __typename: 'SalescueModuleError';
  error: Scalars['String']['output'];
  module: Scalars['String']['output'];
};

export type SalescueObjectionResult = {
  __typename: 'SalescueObjectionResult';
  category: Scalars['String']['output'];
  categoryConfidence: Scalars['Float']['output'];
  coaching: SalescueCoachingCard;
  objectionType: Scalars['String']['output'];
  severity: Scalars['Float']['output'];
  topTypes: Scalars['JSON']['output'];
  typeConfidence: Scalars['Float']['output'];
};

export type SalescueReplyEvidence = {
  __typename: 'SalescueReplyEvidence';
  label: Scalars['String']['output'];
  text: Scalars['String']['output'];
};

export type SalescueReplyResult = {
  __typename: 'SalescueReplyResult';
  active: Scalars['JSON']['output'];
  alternativeConfigs: Scalars['Int']['output'];
  configurationScore: Scalars['Float']['output'];
  evidence: Array<SalescueReplyEvidence>;
  primary: Scalars['String']['output'];
  scores: Scalars['JSON']['output'];
};

export type SalescueScoreCategories = {
  __typename: 'SalescueScoreCategories';
  analytics: Scalars['Float']['output'];
  automation: Scalars['Float']['output'];
  engagement: Scalars['Float']['output'];
  enrichment: Scalars['Float']['output'];
  intent: Scalars['Float']['output'];
  outreach: Scalars['Float']['output'];
};

export type SalescueScoreResult = {
  __typename: 'SalescueScoreResult';
  categories: SalescueScoreCategories;
  confidence: Scalars['Float']['output'];
  label: Scalars['String']['output'];
  nSignalsDetected: Scalars['Int']['output'];
  score: Scalars['Int']['output'];
  signals: Array<SalescueScoreSignal>;
};

export type SalescueScoreSignal = {
  __typename: 'SalescueScoreSignal';
  attendedPositions: Array<Scalars['Int']['output']>;
  attributionType: Scalars['String']['output'];
  category: Scalars['String']['output'];
  causalImpact: Scalars['Float']['output'];
  signal: Scalars['String']['output'];
  strength: Scalars['Float']['output'];
};

export type SalescueSentimentEvidence = {
  __typename: 'SalescueSentimentEvidence';
  signal: Scalars['String']['output'];
  text: Scalars['String']['output'];
};

export type SalescueSentimentResult = {
  __typename: 'SalescueSentimentResult';
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
  __typename: 'SalescueSimilarCompany';
  name: Scalars['String']['output'];
  similarity: Scalars['Float']['output'];
};

export type SalescueSpamResult = {
  __typename: 'SalescueSpamResult';
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
  __typename: 'SalescueSubjectRanking';
  rank: Scalars['Int']['output'];
  score: Scalars['Int']['output'];
  subject: Scalars['String']['output'];
};

export type SalescueSubjectResult = {
  __typename: 'SalescueSubjectResult';
  best: Scalars['String']['output'];
  ranking: Array<SalescueSubjectRanking>;
  worst: Scalars['String']['output'];
};

export type SalescueSurvivalResult = {
  __typename: 'SalescueSurvivalResult';
  medianDaysToConversion: Scalars['Float']['output'];
  pConvert30d: Scalars['Float']['output'];
  pConvert90d: Scalars['Float']['output'];
  riskConfidence: Scalars['Float']['output'];
  riskGroup: Scalars['String']['output'];
  survivalCurve: Scalars['JSON']['output'];
  weibullParams: Scalars['JSON']['output'];
};

export type SalescueTriggerEvent = {
  __typename: 'SalescueTriggerEvent';
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
  __typename: 'SalescueTriggerTemporalFeatures';
  pastSignal: Scalars['Float']['output'];
  recentSignal: Scalars['Float']['output'];
  todaySignal: Scalars['Float']['output'];
};

export type SalescueTriggersResult = {
  __typename: 'SalescueTriggersResult';
  events: Array<SalescueTriggerEvent>;
  primary: Maybe<SalescueTriggerEvent>;
};

export type SalescueTurningPoint = {
  __typename: 'SalescueTurningPoint';
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
  __typename: 'SaveCrawlLogResult';
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
  __typename: 'ScheduleBatchResult';
  failed: Scalars['Int']['output'];
  firstSendDate: Maybe<Scalars['String']['output']>;
  lastSendDate: Maybe<Scalars['String']['output']>;
  message: Scalars['String']['output'];
  scheduled: Scalars['Int']['output'];
  schedulingPlan: Maybe<Scalars['String']['output']>;
  success: Scalars['Boolean']['output'];
};

export type ScoreContactsLoraResult = {
  __typename: 'ScoreContactsLoraResult';
  contactsScored: Scalars['Int']['output'];
  message: Scalars['String']['output'];
  results: Array<ContactLoraScore>;
  success: Scalars['Boolean']['output'];
  tierBreakdown: LoraTierBreakdown;
};

export type ScoreContactsMlResult = {
  __typename: 'ScoreContactsMLResult';
  contactsScored: Scalars['Int']['output'];
  decisionMakersFound: Scalars['Int']['output'];
  message: Scalars['String']['output'];
  results: Array<ContactMlScore>;
  success: Scalars['Boolean']['output'];
};

export type ScrapedPost = {
  __typename: 'ScrapedPost';
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
  __typename: 'SendDraftResult';
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
  __typename: 'SendEmailResult';
  error: Maybe<Scalars['String']['output']>;
  id: Maybe<Scalars['String']['output']>;
  success: Scalars['Boolean']['output'];
};

export type SendNowResult = {
  __typename: 'SendNowResult';
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
  __typename: 'SendOutreachEmailResult';
  emailId: Maybe<Scalars['String']['output']>;
  error: Maybe<Scalars['String']['output']>;
  subject: Maybe<Scalars['String']['output']>;
  success: Scalars['Boolean']['output'];
};

export type SentReply = {
  __typename: 'SentReply';
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
  __typename: 'SignalTypeCount';
  count: Scalars['Int']['output'];
  signalType: IntentSignalType;
};

export type SimilarCompanyResult = {
  __typename: 'SimilarCompanyResult';
  company: Company;
  similarity: Scalars['Float']['output'];
};

export type SimilarPost = {
  __typename: 'SimilarPost';
  post: LinkedInPost;
  similarity: Scalars['Float']['output'];
};

export type SkillDemand = {
  __typename: 'SkillDemand';
  avgConfidence: Scalars['Float']['output'];
  count: Scalars['Int']['output'];
  escoLabel: Maybe<Scalars['String']['output']>;
  pctOfTotal: Scalars['Float']['output'];
  skill: Scalars['String']['output'];
  trend: Scalars['String']['output'];
  weeksInTop20: Scalars['Int']['output'];
};

export type SkillMatchResult = {
  __typename: 'SkillMatchResult';
  claimedSkills: Array<Scalars['String']['output']>;
  githubLanguages: Array<Scalars['String']['output']>;
  matched: Scalars['Boolean']['output'];
};

export type SkillsDemandReport = {
  __typename: 'SkillsDemandReport';
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
  __typename: 'SyncResendResult';
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
  __typename: 'SyncVoyagerJobsResult';
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
  __typename: 'ThreadMessage';
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
  __typename: 'TimeToFillEstimate';
  avgDays: Scalars['Float']['output'];
  medianDays: Scalars['Float']['output'];
  p90Days: Scalars['Float']['output'];
  sampleSize: Scalars['Int']['output'];
};

export type TimeToFillIndustry = {
  __typename: 'TimeToFillIndustry';
  estimate: TimeToFillEstimate;
  industry: Scalars['String']['output'];
};

export type TimeToFillRemoteComparison = {
  __typename: 'TimeToFillRemoteComparison';
  onsite: TimeToFillEstimate;
  remote: TimeToFillEstimate;
};

export type TimeToFillReport = {
  __typename: 'TimeToFillReport';
  byIndustry: Array<TimeToFillIndustry>;
  byRemoteVsOnsite: TimeToFillRemoteComparison;
  bySeniority: Array<TimeToFillSeniority>;
  overall: TimeToFillEstimate;
};

export type TimeToFillSeniority = {
  __typename: 'TimeToFillSeniority';
  estimate: TimeToFillEstimate;
  level: Scalars['String']['output'];
};

export type UnverifyContactsResult = {
  __typename: 'UnverifyContactsResult';
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
  personaMatchThreshold?: InputMaybe<Scalars['Float']['input']>;
  productAwareMode?: InputMaybe<Scalars['Boolean']['input']>;
  productId?: InputMaybe<Scalars['Int']['input']>;
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
  __typename: 'UpsertLinkedInPostsResult';
  errors: Array<Scalars['String']['output']>;
  inserted: Scalars['Int']['output'];
  success: Scalars['Boolean']['output'];
  updated: Scalars['Int']['output'];
};

export type UserSettings = {
  __typename: 'UserSettings';
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
  __typename: 'VerifyAuthenticityResult';
  authenticityScore: Scalars['Float']['output'];
  contactId: Scalars['Int']['output'];
  flags: Array<Scalars['String']['output']>;
  recommendations: Array<Scalars['String']['output']>;
  skillMatch: Maybe<SkillMatchResult>;
  success: Scalars['Boolean']['output'];
  verdict: Scalars['String']['output'];
};

export type VerifyCompanyContactsResult = {
  __typename: 'VerifyCompanyContactsResult';
  results: Array<VerifyAuthenticityResult>;
  review: Scalars['Int']['output'];
  success: Scalars['Boolean']['output'];
  suspicious: Scalars['Int']['output'];
  totalChecked: Scalars['Int']['output'];
  verified: Scalars['Int']['output'];
};

export type VerifyEmailResult = {
  __typename: 'VerifyEmailResult';
  flags: Maybe<Array<Scalars['String']['output']>>;
  message: Scalars['String']['output'];
  rawResult: Maybe<Scalars['String']['output']>;
  success: Scalars['Boolean']['output'];
  suggestedCorrection: Maybe<Scalars['String']['output']>;
  verified: Maybe<Scalars['Boolean']['output']>;
};

export type VoyagerAnalyticsDashboard = {
  __typename: 'VoyagerAnalyticsDashboard';
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
  __typename: 'VoyagerCompanyJobCount';
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
  __typename: 'VoyagerJobCard';
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
  __typename: 'VoyagerJobSearchResult';
  /** Whether more pages exist beyond the returned window */
  hasMore: Scalars['Boolean']['output'];
  jobs: Array<VoyagerJobCard>;
  totalCount: Scalars['Int']['output'];
};

/** Aggregate remote-work metrics derived from Voyager job data. */
export type VoyagerRemoteMetrics = {
  __typename: 'VoyagerRemoteMetrics';
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
  __typename: 'WarcPointer';
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
  __typename: 'WebhookEvent';
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
  __typename: 'WebhookEventsResult';
  events: Array<WebhookEvent>;
  totalCount: Scalars['Int']['output'];
};

export type GetUserSettingsQueryVariables = Exact<{
  userId: Scalars['String']['input'];
}>;


export type GetUserSettingsQuery = { __typename: 'Query', userSettings: { __typename: 'UserSettings', id: number, excluded_companies: Array<string> | null } | null };

export type UpdateUserSettingsMutationVariables = Exact<{
  userId: Scalars['String']['input'];
  settings: UserSettingsInput;
}>;


export type UpdateUserSettingsMutation = { __typename: 'Mutation', updateUserSettings: { __typename: 'UserSettings', id: number, user_id: string, email_notifications: boolean, daily_digest: boolean, excluded_companies: Array<string> | null, dark_mode: boolean, created_at: string, updated_at: string } };

export type AllCompanyTagsQueryVariables = Exact<{ [key: string]: never; }>;


export type AllCompanyTagsQuery = { __typename: 'Query', allCompanyTags: Array<string> };

export type FindCompanyQueryVariables = Exact<{
  name?: InputMaybe<Scalars['String']['input']>;
  website?: InputMaybe<Scalars['String']['input']>;
  linkedinUrl?: InputMaybe<Scalars['String']['input']>;
}>;


export type FindCompanyQuery = { __typename: 'Query', findCompany: { __typename: 'FindCompanyResult', found: boolean, company: { __typename: 'Company', id: number, key: string, name: string, website: string | null, email: string | null, location: string | null, linkedin_url: string | null } | null } };

export type EvidenceFieldsFragment = { __typename: 'Evidence', source_type: SourceType, source_url: string, crawl_id: string | null, capture_timestamp: string | null, observed_at: string, method: ExtractMethod, extractor_version: string | null, http_status: number | null, mime: string | null, content_hash: string | null, warc: { __typename: 'WarcPointer', filename: string, offset: number, length: number, digest: string | null } | null } & { ' $fragmentName'?: 'EvidenceFieldsFragment' };

export type CompanyFactFieldsFragment = { __typename: 'CompanyFact', id: number, company_id: number, field: string, value_json: any | null, value_text: string | null, normalized_value: any | null, confidence: number, created_at: string, evidence: (
    { __typename: 'Evidence' }
    & { ' $fragmentRefs'?: { 'EvidenceFieldsFragment': EvidenceFieldsFragment } }
  ) } & { ' $fragmentName'?: 'CompanyFactFieldsFragment' };

export type CompanySnapshotFieldsFragment = { __typename: 'CompanySnapshot', id: number, company_id: number, source_url: string, crawl_id: string | null, capture_timestamp: string | null, fetched_at: string, http_status: number | null, mime: string | null, content_hash: string | null, text_sample: string | null, jsonld: any | null, extracted: any | null, created_at: string, evidence: (
    { __typename: 'Evidence' }
    & { ' $fragmentRefs'?: { 'EvidenceFieldsFragment': EvidenceFieldsFragment } }
  ) } & { ' $fragmentName'?: 'CompanySnapshotFieldsFragment' };

export type CompanyFieldsFragment = { __typename: 'Company', id: number, key: string, name: string, logo_url: string | null, website: string | null, description: string | null, industry: string | null, size: string | null, location: string | null, created_at: string, updated_at: string, linkedin_url: string | null, job_board_url: string | null, category: CompanyCategory, tags: Array<string>, services: Array<string>, service_taxonomy: Array<string>, industries: Array<string>, score: number, score_reasons: Array<string>, blocked: boolean, deep_analysis: string | null, last_seen_crawl_id: string | null, last_seen_capture_timestamp: string | null, last_seen_source_url: string | null, opportunities: Array<{ __typename: 'Opportunity', id: string, title: string, url: string | null, status: string, score: number | null, rewardText: string | null, applied: boolean, appliedAt: string | null, tags: Array<string>, createdAt: string }> } & { ' $fragmentName'?: 'CompanyFieldsFragment' };

export type CreateCompanyMutationVariables = Exact<{
  input: CreateCompanyInput;
}>;


export type CreateCompanyMutation = { __typename: 'Mutation', createCompany: (
    { __typename: 'Company' }
    & { ' $fragmentRefs'?: { 'CompanyFieldsFragment': CompanyFieldsFragment } }
  ) };

export type UpdateCompanyMutationVariables = Exact<{
  id: Scalars['Int']['input'];
  input: UpdateCompanyInput;
}>;


export type UpdateCompanyMutation = { __typename: 'Mutation', updateCompany: (
    { __typename: 'Company' }
    & { ' $fragmentRefs'?: { 'CompanyFieldsFragment': CompanyFieldsFragment } }
  ) };

export type DeleteCompanyMutationVariables = Exact<{
  id: Scalars['Int']['input'];
}>;


export type DeleteCompanyMutation = { __typename: 'Mutation', deleteCompany: { __typename: 'DeleteCompanyResponse', success: boolean, message: string | null } };

export type AddCompanyFactsMutationVariables = Exact<{
  company_id: Scalars['Int']['input'];
  facts: Array<CompanyFactInput> | CompanyFactInput;
}>;


export type AddCompanyFactsMutation = { __typename: 'Mutation', add_company_facts: Array<(
    { __typename: 'CompanyFact' }
    & { ' $fragmentRefs'?: { 'CompanyFactFieldsFragment': CompanyFactFieldsFragment } }
  )> };

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


export type IngestCompanySnapshotMutation = { __typename: 'Mutation', ingest_company_snapshot: (
    { __typename: 'CompanySnapshot' }
    & { ' $fragmentRefs'?: { 'CompanySnapshotFieldsFragment': CompanySnapshotFieldsFragment } }
  ) };

export type MergeDuplicateCompaniesMutationVariables = Exact<{
  companyIds: Array<Scalars['Int']['input']> | Scalars['Int']['input'];
}>;


export type MergeDuplicateCompaniesMutation = { __typename: 'Mutation', mergeDuplicateCompanies: { __typename: 'MergeCompaniesResult', success: boolean, message: string, keptCompanyId: number | null, merged: number } };

export type DeleteCompaniesMutationVariables = Exact<{
  companyIds: Array<Scalars['Int']['input']> | Scalars['Int']['input'];
}>;


export type DeleteCompaniesMutation = { __typename: 'Mutation', deleteCompanies: { __typename: 'DeleteCompaniesResult', success: boolean, message: string, deleted: number } };

export type ImportCompanyWithContactsMutationVariables = Exact<{
  input: ImportCompanyWithContactsInput;
}>;


export type ImportCompanyWithContactsMutation = { __typename: 'Mutation', importCompanyWithContacts: { __typename: 'ImportCompanyResult', success: boolean, contactsImported: number, contactsSkipped: number, errors: Array<string>, company: { __typename: 'Company', id: number, key: string, name: string } | null } };

export type EnhanceCompanyMutationVariables = Exact<{
  id?: InputMaybe<Scalars['Int']['input']>;
  key?: InputMaybe<Scalars['String']['input']>;
}>;


export type EnhanceCompanyMutation = { __typename: 'Mutation', enhanceCompany: { __typename: 'EnhanceCompanyResponse', success: boolean, message: string | null, companyId: number | null, companyKey: string | null } };

export type AnalyzeCompanyMutationVariables = Exact<{
  id?: InputMaybe<Scalars['Int']['input']>;
  key?: InputMaybe<Scalars['String']['input']>;
}>;


export type AnalyzeCompanyMutation = { __typename: 'Mutation', analyzeCompany: { __typename: 'AnalyzeCompanyResponse', success: boolean, message: string | null, companyId: number | null, companyKey: string | null } };

export type ImportCompaniesMutationVariables = Exact<{
  companies: Array<CompanyImportInput> | CompanyImportInput;
}>;


export type ImportCompaniesMutation = { __typename: 'Mutation', importCompanies: { __typename: 'ImportCompaniesResult', success: boolean, imported: number, failed: number, errors: Array<string> } };

export type BlockCompanyMutationVariables = Exact<{
  id: Scalars['Int']['input'];
}>;


export type BlockCompanyMutation = { __typename: 'Mutation', blockCompany: { __typename: 'Company', id: number, key: string, blocked: boolean } };

export type UnblockCompanyMutationVariables = Exact<{
  id: Scalars['Int']['input'];
}>;


export type UnblockCompanyMutation = { __typename: 'Mutation', unblockCompany: { __typename: 'Company', id: number, key: string, blocked: boolean } };

export type GetCompanyQueryVariables = Exact<{
  id?: InputMaybe<Scalars['Int']['input']>;
  key?: InputMaybe<Scalars['String']['input']>;
}>;


export type GetCompanyQuery = { __typename: 'Query', company: (
    { __typename: 'Company' }
    & { ' $fragmentRefs'?: { 'CompanyFieldsFragment': CompanyFieldsFragment } }
  ) | null };

export type GetCompaniesQueryVariables = Exact<{
  text?: InputMaybe<Scalars['String']['input']>;
  order_by?: InputMaybe<CompanyOrderBy>;
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
}>;


export type GetCompaniesQuery = { __typename: 'Query', companies: { __typename: 'CompaniesResponse', totalCount: number, companies: Array<(
      { __typename: 'Company' }
      & { ' $fragmentRefs'?: { 'CompanyFieldsFragment': CompanyFieldsFragment } }
    )> } };

export type SearchCompaniesQueryVariables = Exact<{
  filter: CompanyFilterInput;
  order_by?: InputMaybe<CompanyOrderBy>;
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
}>;


export type SearchCompaniesQuery = { __typename: 'Query', companies: { __typename: 'CompaniesResponse', totalCount: number, companies: Array<(
      { __typename: 'Company' }
      & { ' $fragmentRefs'?: { 'CompanyFieldsFragment': CompanyFieldsFragment } }
    )> } };

export type GetCompanyFactsQueryVariables = Exact<{
  company_id: Scalars['Int']['input'];
  field?: InputMaybe<Scalars['String']['input']>;
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
}>;


export type GetCompanyFactsQuery = { __typename: 'Query', company_facts: Array<(
    { __typename: 'CompanyFact' }
    & { ' $fragmentRefs'?: { 'CompanyFactFieldsFragment': CompanyFactFieldsFragment } }
  )> };

export type CompanyAuditQueryVariables = Exact<{
  key: Scalars['String']['input'];
}>;


export type CompanyAuditQuery = { __typename: 'Query', company: (
    { __typename: 'Company', facts_count: number, snapshots_count: number, facts: Array<(
      { __typename: 'CompanyFact' }
      & { ' $fragmentRefs'?: { 'CompanyFactFieldsFragment': CompanyFactFieldsFragment } }
    )>, snapshots: Array<(
      { __typename: 'CompanySnapshot' }
      & { ' $fragmentRefs'?: { 'CompanySnapshotFieldsFragment': CompanySnapshotFieldsFragment } }
    )> }
    & { ' $fragmentRefs'?: { 'CompanyFieldsFragment': CompanyFieldsFragment } }
  ) | null };

export type PricingTierCoreFragment = { __typename: 'PricingTier', id: number, tierName: string, monthlyPriceUsd: number | null, annualPriceUsd: number | null, seatPriceUsd: number | null, currency: string, includedLimits: any | null, isCustomQuote: boolean, sortOrder: number } & { ' $fragmentName'?: 'PricingTierCoreFragment' };

export type CompetitorFeatureCoreFragment = { __typename: 'CompetitorFeature', id: number, tierName: string | null, featureText: string, category: string | null } & { ' $fragmentName'?: 'CompetitorFeatureCoreFragment' };

export type CompetitorIntegrationCoreFragment = { __typename: 'CompetitorIntegration', id: number, integrationName: string, integrationUrl: string | null, category: string | null } & { ' $fragmentName'?: 'CompetitorIntegrationCoreFragment' };

export type CompetitorCoreFragment = { __typename: 'Competitor', id: number, analysisId: number, name: string, url: string, domain: string | null, logoUrl: string | null, description: string | null, positioningHeadline: string | null, positioningTagline: string | null, targetAudience: string | null, status: CompetitorStatus, scrapedAt: string | null, scrapeError: string | null, createdAt: string } & { ' $fragmentName'?: 'CompetitorCoreFragment' };

export type CompetitorFullFragment = (
  { __typename: 'Competitor', pricingTiers: Array<(
    { __typename: 'PricingTier' }
    & { ' $fragmentRefs'?: { 'PricingTierCoreFragment': PricingTierCoreFragment } }
  )>, features: Array<(
    { __typename: 'CompetitorFeature' }
    & { ' $fragmentRefs'?: { 'CompetitorFeatureCoreFragment': CompetitorFeatureCoreFragment } }
  )>, integrations: Array<(
    { __typename: 'CompetitorIntegration' }
    & { ' $fragmentRefs'?: { 'CompetitorIntegrationCoreFragment': CompetitorIntegrationCoreFragment } }
  )> }
  & { ' $fragmentRefs'?: { 'CompetitorCoreFragment': CompetitorCoreFragment } }
) & { ' $fragmentName'?: 'CompetitorFullFragment' };

export type CompetitorAnalysisCoreFragment = { __typename: 'CompetitorAnalysis', id: number, status: CompetitorAnalysisStatus, createdBy: string | null, error: string | null, createdAt: string, updatedAt: string, product: (
    { __typename: 'Product' }
    & { ' $fragmentRefs'?: { 'ProductCoreFragment': ProductCoreFragment } }
  ) } & { ' $fragmentName'?: 'CompetitorAnalysisCoreFragment' };

export type CompetitorAnalysesQueryVariables = Exact<{ [key: string]: never; }>;


export type CompetitorAnalysesQuery = { __typename: 'Query', competitorAnalyses: Array<(
    { __typename: 'CompetitorAnalysis', competitors: Array<{ __typename: 'Competitor', id: number, name: string, status: CompetitorStatus }> }
    & { ' $fragmentRefs'?: { 'CompetitorAnalysisCoreFragment': CompetitorAnalysisCoreFragment } }
  )> };

export type CompetitorAnalysisQueryVariables = Exact<{
  id: Scalars['Int']['input'];
}>;


export type CompetitorAnalysisQuery = { __typename: 'Query', competitorAnalysis: (
    { __typename: 'CompetitorAnalysis', competitors: Array<(
      { __typename: 'Competitor' }
      & { ' $fragmentRefs'?: { 'CompetitorFullFragment': CompetitorFullFragment } }
    )> }
    & { ' $fragmentRefs'?: { 'CompetitorAnalysisCoreFragment': CompetitorAnalysisCoreFragment } }
  ) | null };

export type CreateCompetitorAnalysisMutationVariables = Exact<{
  productId: Scalars['Int']['input'];
}>;


export type CreateCompetitorAnalysisMutation = { __typename: 'Mutation', createCompetitorAnalysis: (
    { __typename: 'CompetitorAnalysis', competitors: Array<(
      { __typename: 'Competitor' }
      & { ' $fragmentRefs'?: { 'CompetitorCoreFragment': CompetitorCoreFragment } }
    )> }
    & { ' $fragmentRefs'?: { 'CompetitorAnalysisCoreFragment': CompetitorAnalysisCoreFragment } }
  ) };

export type ApproveCompetitorsMutationVariables = Exact<{
  analysisId: Scalars['Int']['input'];
  competitors: Array<CompetitorInput> | CompetitorInput;
}>;


export type ApproveCompetitorsMutation = { __typename: 'Mutation', approveCompetitors: (
    { __typename: 'CompetitorAnalysis', competitors: Array<(
      { __typename: 'Competitor' }
      & { ' $fragmentRefs'?: { 'CompetitorCoreFragment': CompetitorCoreFragment } }
    )> }
    & { ' $fragmentRefs'?: { 'CompetitorAnalysisCoreFragment': CompetitorAnalysisCoreFragment } }
  ) };

export type RescrapeCompetitorMutationVariables = Exact<{
  competitorId: Scalars['Int']['input'];
}>;


export type RescrapeCompetitorMutation = { __typename: 'Mutation', rescrapeCompetitor: (
    { __typename: 'Competitor' }
    & { ' $fragmentRefs'?: { 'CompetitorFullFragment': CompetitorFullFragment } }
  ) };

export type DeleteCompetitorAnalysisMutationVariables = Exact<{
  id: Scalars['Int']['input'];
}>;


export type DeleteCompetitorAnalysisMutation = { __typename: 'Mutation', deleteCompetitorAnalysis: boolean };

export type ProductCompetitorsBySlugQueryVariables = Exact<{
  slug: Scalars['String']['input'];
}>;


export type ProductCompetitorsBySlugQuery = { __typename: 'Query', productBySlug: (
    { __typename: 'Product', pricingAnalysis: any | null, positioningAnalysis: any | null, pricingAnalyzedAt: string | null, updatedAt: string, latestCompetitorAnalysis: (
      { __typename: 'CompetitorAnalysis', competitors: Array<(
        { __typename: 'Competitor' }
        & { ' $fragmentRefs'?: { 'CompetitorFullFragment': CompetitorFullFragment } }
      )> }
      & { ' $fragmentRefs'?: { 'CompetitorAnalysisCoreFragment': CompetitorAnalysisCoreFragment } }
    ) | null }
    & { ' $fragmentRefs'?: { 'ProductCoreFragment': ProductCoreFragment } }
  ) | null };

export type GetContactQueryVariables = Exact<{
  id?: InputMaybe<Scalars['Int']['input']>;
  slug?: InputMaybe<Scalars['String']['input']>;
}>;


export type GetContactQuery = { __typename: 'Query', contact: { __typename: 'Contact', id: number, slug: string | null, firstName: string, lastName: string, email: string | null, emails: Array<string>, bouncedEmails: Array<string>, linkedinUrl: string | null, company: string | null, companyId: number | null, position: string | null, emailVerified: boolean | null, doNotContact: boolean, githubHandle: string | null, telegramHandle: string | null, tags: Array<string>, notes: string | null, forwardingAlias: string | null, forwardingAliasRuleId: string | null, nbStatus: string | null, nbResult: string | null, nbFlags: Array<string>, nbSuggestedCorrection: string | null, createdAt: string, updatedAt: string, aiProfile: { __typename: 'ContactAIProfile', trigger: string, enrichedAt: string, linkedinHeadline: string | null, linkedinBio: string | null, specialization: string | null, skills: Array<string>, researchAreas: Array<string>, experienceLevel: string, synthesisConfidence: number, synthesisRationale: string | null, githubBio: string | null, githubTopLanguages: Array<string>, githubTotalStars: number, githubAiRepos: Array<{ __typename: 'ContactAIGitHubRepo', name: string, description: string | null, stars: number, topics: Array<string> }>, workExperience: Array<{ __typename: 'ContactWorkExperience', company: string, companyLogo: string | null, title: string, employmentType: string | null, startDate: string, endDate: string | null, duration: string | null, location: string | null, description: string | null, skills: Array<string> }> } | null } | null };

export type UpdateContactMutationVariables = Exact<{
  id: Scalars['Int']['input'];
  input: UpdateContactInput;
}>;


export type UpdateContactMutation = { __typename: 'Mutation', updateContact: { __typename: 'Contact', id: number, firstName: string, lastName: string, email: string | null, emails: Array<string>, linkedinUrl: string | null, position: string | null, githubHandle: string | null, telegramHandle: string | null, doNotContact: boolean, tags: Array<string>, emailVerified: boolean | null, updatedAt: string } };

export type DeleteContactMutationVariables = Exact<{
  id: Scalars['Int']['input'];
}>;


export type DeleteContactMutation = { __typename: 'Mutation', deleteContact: { __typename: 'DeleteContactResult', success: boolean, message: string } };

export type GetResendEmailQueryVariables = Exact<{
  resendId: Scalars['String']['input'];
}>;


export type GetResendEmailQuery = { __typename: 'Query', resendEmail: { __typename: 'ResendEmailDetail', id: string, from: string, to: Array<string>, subject: string | null, text: string | null, html: string | null, lastEvent: string | null, createdAt: string, scheduledAt: string | null, cc: Array<string> | null, bcc: Array<string> | null } | null };

export type GetContactMessagesQueryVariables = Exact<{
  contactId: Scalars['Int']['input'];
}>;


export type GetContactMessagesQuery = { __typename: 'Query', contactMessages: Array<{ __typename: 'ContactMessage', id: number, channel: string, direction: string, contactId: number | null, senderName: string | null, senderProfileUrl: string | null, content: string | null, subject: string | null, sentAt: string, classification: string | null, createdAt: string }> };

export type GetContactOpportunitiesQueryVariables = Exact<{
  contactId: Scalars['Int']['input'];
}>;


export type GetContactOpportunitiesQuery = { __typename: 'Query', contactOpportunities: Array<{ __typename: 'Opportunity', id: string, title: string, url: string | null, source: string | null, status: string, rewardText: string | null, rewardUsd: number | null, score: number | null, tags: Array<string>, applied: boolean, appliedAt: string | null, applicationStatus: string | null, companyName: string | null, createdAt: string }> };

export type GetContactEmailsQueryVariables = Exact<{
  contactId: Scalars['Int']['input'];
}>;


export type GetContactEmailsQuery = { __typename: 'Query', contactEmails: Array<{ __typename: 'ContactEmail', id: number, resendId: string, fromEmail: string, toEmails: Array<string>, subject: string, textContent: string | null, status: string, sentAt: string | null, recipientName: string | null, replyReceived: boolean, createdAt: string, updatedAt: string }>, contactReceivedEmails: Array<{ __typename: 'ReceivedEmail', id: number, fromEmail: string | null, subject: string | null, textContent: string | null, classification: string | null, classificationConfidence: number | null, receivedAt: string, createdAt: string }> };

export type GetCompanyContactEmailsQueryVariables = Exact<{
  companyId: Scalars['Int']['input'];
}>;


export type GetCompanyContactEmailsQuery = { __typename: 'Query', companyContactEmails: Array<{ __typename: 'CompanyContactEmail', id: number, contactId: number, resendId: string, fromEmail: string, toEmails: Array<string>, subject: string, textContent: string | null, status: string, sentAt: string | null, scheduledAt: string | null, recipientName: string | null, createdAt: string, updatedAt: string, contactFirstName: string, contactLastName: string, contactPosition: string | null, sequenceType: string | null, sequenceNumber: string | null, replyReceived: boolean, followupStatus: string | null }> };

export type SyncResendEmailsMutationVariables = Exact<{
  companyId?: InputMaybe<Scalars['Int']['input']>;
}>;


export type SyncResendEmailsMutation = { __typename: 'Mutation', syncResendEmails: { __typename: 'SyncResendResult', success: boolean, updatedCount: number, skippedCount: number, totalCount: number, error: string | null } };

export type ImportResendEmailsMutationVariables = Exact<{
  maxEmails?: InputMaybe<Scalars['Int']['input']>;
}>;


export type ImportResendEmailsMutation = { __typename: 'Mutation', importResendEmails: { __typename: 'ImportResendResult', success: boolean, totalFetched: number, newCount: number, updatedCount: number, skippedCount: number, errorCount: number, contactMatchCount: number, companyMatchCount: number, durationMs: number, error: string | null } };

export type CancelCompanyEmailsMutationVariables = Exact<{
  companyId: Scalars['Int']['input'];
}>;


export type CancelCompanyEmailsMutation = { __typename: 'Mutation', cancelCompanyEmails: { __typename: 'CancelCompanyEmailsResult', success: boolean, message: string, cancelledCount: number, failedCount: number } };

export type SendScheduledEmailNowMutationVariables = Exact<{
  resendId: Scalars['String']['input'];
}>;


export type SendScheduledEmailNowMutation = { __typename: 'Mutation', sendScheduledEmailNow: { __typename: 'SendNowResult', success: boolean, resendId: string | null, error: string | null } };

export type CancelScheduledEmailMutationVariables = Exact<{
  resendId: Scalars['String']['input'];
}>;


export type CancelScheduledEmailMutation = { __typename: 'Mutation', cancelScheduledEmail: { __typename: 'CancelEmailResult', success: boolean, error: string | null } };

export type GetContactsQueryVariables = Exact<{
  companyId?: InputMaybe<Scalars['Int']['input']>;
  search?: InputMaybe<Scalars['String']['input']>;
  tag?: InputMaybe<Scalars['String']['input']>;
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
}>;


export type GetContactsQuery = { __typename: 'Query', contacts: { __typename: 'ContactsResult', totalCount: number, contacts: Array<{ __typename: 'Contact', id: number, slug: string | null, firstName: string, lastName: string, email: string | null, bouncedEmails: Array<string>, linkedinUrl: string | null, position: string | null, company: string | null, companyId: number | null, githubHandle: string | null, telegramHandle: string | null, emailVerified: boolean | null, doNotContact: boolean, nbResult: string | null, tags: Array<string>, notes: string | null, createdAt: string, seniority: string | null, department: string | null, isDecisionMaker: boolean | null, authorityScore: number | null, nextTouchScore: number | null, lastContactedAt: string | null }> } };

export type ImportContactsMutationVariables = Exact<{
  contacts: Array<ContactInput> | ContactInput;
}>;


export type ImportContactsMutation = { __typename: 'Mutation', importContacts: { __typename: 'ImportContactsResult', success: boolean, imported: number, failed: number, errors: Array<string> } };

export type FindContactEmailMutationVariables = Exact<{
  contactId: Scalars['Int']['input'];
}>;


export type FindContactEmailMutation = { __typename: 'Mutation', findContactEmail: { __typename: 'FindContactEmailResult', success: boolean, emailFound: boolean, email: string | null, verified: boolean | null, message: string, candidatesTried: number } };

export type FindCompanyEmailsMutationVariables = Exact<{
  companyId: Scalars['Int']['input'];
}>;


export type FindCompanyEmailsMutation = { __typename: 'Mutation', findCompanyEmails: { __typename: 'EnhanceAllContactsResult', success: boolean, message: string, companiesProcessed: number, totalContactsProcessed: number, totalEmailsFound: number, errors: Array<string> } };

export type EnhanceAllContactsMutationVariables = Exact<{ [key: string]: never; }>;


export type EnhanceAllContactsMutation = { __typename: 'Mutation', enhanceAllContacts: { __typename: 'EnhanceAllContactsResult', success: boolean, message: string, companiesProcessed: number, totalContactsProcessed: number, totalEmailsFound: number, errors: Array<string> } };

export type ApplyEmailPatternMutationVariables = Exact<{
  companyId: Scalars['Int']['input'];
}>;


export type ApplyEmailPatternMutation = { __typename: 'Mutation', applyEmailPattern: { __typename: 'ApplyEmailPatternResult', success: boolean, message: string, contactsUpdated: number, pattern: string | null, contacts: Array<{ __typename: 'Contact', id: number, email: string | null, emailVerified: boolean | null }> } };

export type UnverifyCompanyContactsMutationVariables = Exact<{
  companyId: Scalars['Int']['input'];
}>;


export type UnverifyCompanyContactsMutation = { __typename: 'Mutation', unverifyCompanyContacts: { __typename: 'UnverifyContactsResult', success: boolean, count: number } };

export type CreateContactMutationVariables = Exact<{
  input: CreateContactInput;
}>;


export type CreateContactMutation = { __typename: 'Mutation', createContact: { __typename: 'Contact', id: number, slug: string | null, firstName: string, lastName: string, email: string | null, linkedinUrl: string | null, position: string | null, companyId: number | null, githubHandle: string | null, telegramHandle: string | null, tags: Array<string> } };

export type MergeDuplicateContactsMutationVariables = Exact<{
  companyId: Scalars['Int']['input'];
}>;


export type MergeDuplicateContactsMutation = { __typename: 'Mutation', mergeDuplicateContacts: { __typename: 'MergeDuplicateContactsResult', success: boolean, message: string, mergedCount: number, removedCount: number } };

export type MarkContactEmailVerifiedMutationVariables = Exact<{
  contactId: Scalars['Int']['input'];
  verified: Scalars['Boolean']['input'];
}>;


export type MarkContactEmailVerifiedMutation = { __typename: 'Mutation', markContactEmailVerified: { __typename: 'Contact', id: number, email: string | null, emailVerified: boolean | null } };

export type VerifyContactEmailMutationVariables = Exact<{
  contactId: Scalars['Int']['input'];
}>;


export type VerifyContactEmailMutation = { __typename: 'Mutation', verifyContactEmail: { __typename: 'VerifyEmailResult', success: boolean, verified: boolean | null, rawResult: string | null, flags: Array<string> | null, suggestedCorrection: string | null, message: string } };

export type GetEmailCampaignsQueryVariables = Exact<{
  status?: InputMaybe<Scalars['String']['input']>;
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
}>;


export type GetEmailCampaignsQuery = { __typename: 'Query', emailCampaigns: { __typename: 'EmailCampaignsResult', totalCount: number, campaigns: Array<{ __typename: 'EmailCampaign', id: string, companyId: number | null, name: string, status: string, mode: string | null, fromEmail: string | null, totalRecipients: number, emailsSent: number, emailsScheduled: number, emailsFailed: number, createdAt: string, updatedAt: string }> } };

export type GetEmailCampaignQueryVariables = Exact<{
  id: Scalars['String']['input'];
}>;


export type GetEmailCampaignQuery = { __typename: 'Query', emailCampaign: { __typename: 'EmailCampaign', id: string, companyId: number | null, name: string, status: string, sequence: any | null, delayDays: any | null, startAt: string | null, mode: string | null, fromEmail: string | null, replyTo: string | null, totalRecipients: number, emailsSent: number, emailsScheduled: number, emailsFailed: number, recipientEmails: Array<string>, createdAt: string, updatedAt: string } | null };

export type CreateDraftCampaignMutationVariables = Exact<{
  input: CreateCampaignInput;
}>;


export type CreateDraftCampaignMutation = { __typename: 'Mutation', createDraftCampaign: { __typename: 'EmailCampaign', id: string, name: string, status: string, createdAt: string } };

export type UpdateCampaignMutationVariables = Exact<{
  id: Scalars['String']['input'];
  input: UpdateCampaignInput;
}>;


export type UpdateCampaignMutation = { __typename: 'Mutation', updateCampaign: { __typename: 'EmailCampaign', id: string, name: string, status: string, updatedAt: string } };

export type DeleteCampaignMutationVariables = Exact<{
  id: Scalars['String']['input'];
}>;


export type DeleteCampaignMutation = { __typename: 'Mutation', deleteCampaign: { __typename: 'DeleteCampaignResult', success: boolean, message: string | null } };

export type LaunchEmailCampaignMutationVariables = Exact<{
  id: Scalars['String']['input'];
}>;


export type LaunchEmailCampaignMutation = { __typename: 'Mutation', launchEmailCampaign: { __typename: 'EmailCampaign', id: string, name: string, status: string, emailsSent: number, emailsScheduled: number, emailsFailed: number, updatedAt: string } };

export type SendEmailMutationVariables = Exact<{
  input: SendEmailInput;
}>;


export type SendEmailMutation = { __typename: 'Mutation', sendEmail: { __typename: 'SendEmailResult', success: boolean, id: string | null, error: string | null } };

export type GenerateEmailMutationVariables = Exact<{
  input: GenerateEmailInput;
}>;


export type GenerateEmailMutation = { __typename: 'Mutation', generateEmail: { __typename: 'GenerateEmailResult', subject: string, html: string, text: string } };

export type GenerateReplyMutationVariables = Exact<{
  input: GenerateReplyInput;
}>;


export type GenerateReplyMutation = { __typename: 'Mutation', generateReply: { __typename: 'GenerateReplyResult', subject: string, body: string } };

export type GetEmailStatsQueryVariables = Exact<{ [key: string]: never; }>;


export type GetEmailStatsQuery = { __typename: 'Query', emailStats: { __typename: 'EmailStats', sentToday: number, sentThisWeek: number, sentThisMonth: number, scheduledToday: number, scheduledFuture: number, totalSent: number, deliveredToday: number, deliveredThisWeek: number, deliveredThisMonth: number, bouncedToday: number, bouncedThisWeek: number, bouncedThisMonth: number, openedToday: number, openedThisWeek: number, openedThisMonth: number } };

export type GetReceivedEmailsQueryVariables = Exact<{
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
  archived?: InputMaybe<Scalars['Boolean']['input']>;
  classification?: InputMaybe<Scalars['String']['input']>;
}>;


export type GetReceivedEmailsQuery = { __typename: 'Query', receivedEmails: { __typename: 'ReceivedEmailsResult', totalCount: number, emails: Array<{ __typename: 'ReceivedEmail', id: number, resendId: string | null, fromEmail: string | null, toEmails: Array<string>, subject: string | null, receivedAt: string, archivedAt: string | null, classification: string | null, classificationConfidence: number | null, matchedContactId: number | null, textContent: string | null, htmlContent: string | null, createdAt: string }> } };

export type GetReceivedEmailQueryVariables = Exact<{
  id: Scalars['Int']['input'];
}>;


export type GetReceivedEmailQuery = { __typename: 'Query', receivedEmail: { __typename: 'ReceivedEmail', id: number, resendId: string | null, fromEmail: string | null, toEmails: Array<string>, ccEmails: Array<string>, replyToEmails: Array<string>, subject: string | null, messageId: string | null, htmlContent: string | null, textContent: string | null, attachments: any | null, receivedAt: string, archivedAt: string | null, classification: string | null, classificationConfidence: number | null, classifiedAt: string | null, matchedContactId: number | null, matchedOutboundId: number | null, createdAt: string, updatedAt: string, matchedContact: { __typename: 'Contact', id: number, firstName: string, lastName: string, forwardingAlias: string | null } | null, sentReplies: Array<{ __typename: 'SentReply', id: number, resendId: string | null, fromEmail: string, toEmails: Array<string>, subject: string, textContent: string | null, status: string, sentAt: string | null, createdAt: string }> } | null };

export type ArchiveEmailMutationVariables = Exact<{
  id: Scalars['Int']['input'];
}>;


export type ArchiveEmailMutation = { __typename: 'Mutation', archiveEmail: { __typename: 'ArchiveEmailResult', success: boolean, message: string } };

export type UnarchiveEmailMutationVariables = Exact<{
  id: Scalars['Int']['input'];
}>;


export type UnarchiveEmailMutation = { __typename: 'Mutation', unarchiveEmail: { __typename: 'ArchiveEmailResult', success: boolean, message: string } };

export type PreviewEmailMutationVariables = Exact<{
  input: PreviewEmailInput;
}>;


export type PreviewEmailMutation = { __typename: 'Mutation', previewEmail: { __typename: 'EmailPreview', htmlContent: string, subject: string, drySendResult: string | null } };

export type SendOutreachEmailMutationVariables = Exact<{
  input: SendOutreachEmailInput;
}>;


export type SendOutreachEmailMutation = { __typename: 'Mutation', sendOutreachEmail: { __typename: 'SendOutreachEmailResult', success: boolean, emailId: string | null, subject: string | null, error: string | null } };

export type GetEmailsNeedingFollowUpQueryVariables = Exact<{
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
}>;


export type GetEmailsNeedingFollowUpQuery = { __typename: 'Query', emailsNeedingFollowUp: { __typename: 'FollowUpEmailsResult', totalCount: number, emails: Array<{ __typename: 'FollowUpEmail', id: number, contactId: number, resendId: string, fromEmail: string, toEmails: Array<string>, subject: string, status: string, sentAt: string | null, sequenceType: string | null, sequenceNumber: string | null, followupStatus: string | null, companyId: number | null, recipientName: string | null, createdAt: string }> } };

export type GetWebhookEventsQueryVariables = Exact<{
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
  eventType?: InputMaybe<Scalars['String']['input']>;
}>;


export type GetWebhookEventsQuery = { __typename: 'Query', webhookEvents: { __typename: 'WebhookEventsResult', totalCount: number, events: Array<{ __typename: 'WebhookEvent', id: number, eventType: string, emailId: string | null, fromEmail: string | null, toEmails: string | null, subject: string | null, httpStatus: number | null, error: string | null, createdAt: string }> } };

export type GetEmailTemplatesQueryVariables = Exact<{
  category?: InputMaybe<Scalars['String']['input']>;
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
}>;


export type GetEmailTemplatesQuery = { __typename: 'Query', emailTemplates: { __typename: 'EmailTemplatesResult', totalCount: number, templates: Array<{ __typename: 'EmailTemplate', id: number, name: string, description: string | null, subject: string | null, category: string | null, tags: Array<string>, isActive: boolean, createdAt: string, updatedAt: string }> } };

export type GetEmailTemplateQueryVariables = Exact<{
  id: Scalars['Int']['input'];
}>;


export type GetEmailTemplateQuery = { __typename: 'Query', emailTemplate: { __typename: 'EmailTemplate', id: number, name: string, description: string | null, subject: string | null, htmlContent: string | null, textContent: string | null, category: string | null, tags: Array<string>, variables: Array<string>, isActive: boolean, createdAt: string, updatedAt: string } | null };

export type CreateEmailTemplateMutationVariables = Exact<{
  input: CreateEmailTemplateInput;
}>;


export type CreateEmailTemplateMutation = { __typename: 'Mutation', createEmailTemplate: { __typename: 'EmailTemplate', id: number, name: string, subject: string | null, category: string | null, createdAt: string } };

export type UpdateEmailTemplateMutationVariables = Exact<{
  id: Scalars['Int']['input'];
  input: UpdateEmailTemplateInput;
}>;


export type UpdateEmailTemplateMutation = { __typename: 'Mutation', updateEmailTemplate: { __typename: 'EmailTemplate', id: number, name: string, subject: string | null, isActive: boolean, updatedAt: string } };

export type DeleteEmailTemplateMutationVariables = Exact<{
  id: Scalars['Int']['input'];
}>;


export type DeleteEmailTemplateMutation = { __typename: 'Mutation', deleteEmailTemplate: { __typename: 'DeleteEmailTemplateResult', success: boolean, message: string | null } };

export type GetEmailThreadsQueryVariables = Exact<{
  classification?: InputMaybe<Scalars['String']['input']>;
  search?: InputMaybe<Scalars['String']['input']>;
  sortBy?: InputMaybe<Scalars['String']['input']>;
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
}>;


export type GetEmailThreadsQuery = { __typename: 'Query', emailThreads: { __typename: 'EmailThreadsResult', totalCount: number, threads: Array<{ __typename: 'EmailThread', contactId: number, contactSlug: string | null, contactName: string, contactEmail: string | null, contactPosition: string | null, companyName: string | null, companyKey: string | null, lastMessageAt: string, lastMessagePreview: string | null, lastMessageDirection: string, classification: string | null, classificationConfidence: number | null, totalMessages: number, hasReply: boolean, latestStatus: string | null, priorityScore: number | null, hasPendingDraft: boolean | null, draftId: number | null, conversationStage: string | null }> } };

export type GetEmailThreadQueryVariables = Exact<{
  contactId: Scalars['Int']['input'];
}>;


export type GetEmailThreadQuery = { __typename: 'Query', emailThread: { __typename: 'EmailThread', contactId: number, contactSlug: string | null, contactName: string, contactEmail: string | null, contactPosition: string | null, contactForwardingAlias: string | null, companyName: string | null, companyKey: string | null, classification: string | null, classificationConfidence: number | null, totalMessages: number, hasReply: boolean, messages: Array<{ __typename: 'ThreadMessage', id: number, direction: string, fromEmail: string, toEmails: Array<string>, subject: string, textContent: string | null, htmlContent: string | null, sentAt: string | null, status: string | null, sequenceType: string | null, sequenceNumber: string | null, classification: string | null, classificationConfidence: number | null }> } | null };

export type GetLinkedInPostsQueryVariables = Exact<{
  type?: InputMaybe<LinkedInPostType>;
  companyId?: InputMaybe<Scalars['Int']['input']>;
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
}>;


export type GetLinkedInPostsQuery = { __typename: 'Query', linkedinPosts: Array<{ __typename: 'LinkedInPost', id: number, type: LinkedInPostType, url: string, companyId: number | null, contactId: number | null, title: string | null, content: string | null, authorName: string | null, authorUrl: string | null, location: string | null, employmentType: string | null, postedAt: string | null, scrapedAt: string, rawData: any | null, analyzedAt: string | null, createdAt: string, skills: Array<{ __typename: 'ExtractedSkill', tag: string, label: string, confidence: number }> | null }> };

export type GetSimilarPostsQueryVariables = Exact<{
  postId: Scalars['Int']['input'];
  limit?: InputMaybe<Scalars['Int']['input']>;
  minScore?: InputMaybe<Scalars['Float']['input']>;
}>;


export type GetSimilarPostsQuery = { __typename: 'Query', similarPosts: Array<{ __typename: 'SimilarPost', similarity: number, post: { __typename: 'LinkedInPost', id: number, type: LinkedInPostType, url: string, title: string | null, content: string | null, authorName: string | null, analyzedAt: string | null, skills: Array<{ __typename: 'ExtractedSkill', tag: string, label: string, confidence: number }> | null } }> };

export type AnalyzeLinkedInPostsMutationVariables = Exact<{
  postIds?: InputMaybe<Array<Scalars['Int']['input']> | Scalars['Int']['input']>;
  limit?: InputMaybe<Scalars['Int']['input']>;
}>;


export type AnalyzeLinkedInPostsMutation = { __typename: 'Mutation', analyzeLinkedInPosts: { __typename: 'AnalyzePostsResult', success: boolean, analyzed: number, failed: number, errors: Array<string> } };

export type ProductCoreFragment = { __typename: 'Product', id: number, slug: string, name: string, url: string, domain: string | null, description: string | null, highlights: any | null, icpAnalysis: any | null, icpAnalyzedAt: string | null, pricingAnalysis: any | null, pricingAnalyzedAt: string | null, gtmAnalysis: any | null, gtmAnalyzedAt: string | null, intelReport: any | null, intelReportAt: string | null, positioningAnalysis: any | null, publishedAt: string | null, createdBy: string | null, createdAt: string, updatedAt: string } & { ' $fragmentName'?: 'ProductCoreFragment' };

export type IntelRunCoreFragment = { __typename: 'IntelRun', id: string, productId: number, kind: string, status: string, startedAt: string, finishedAt: string | null, error: string | null, output: any | null } & { ' $fragmentName'?: 'IntelRunCoreFragment' };

export type ProductsQueryVariables = Exact<{ [key: string]: never; }>;


export type ProductsQuery = { __typename: 'Query', products: Array<(
    { __typename: 'Product' }
    & { ' $fragmentRefs'?: { 'ProductCoreFragment': ProductCoreFragment } }
  )> };

export type ProductQueryVariables = Exact<{
  id: Scalars['Int']['input'];
}>;


export type ProductQuery = { __typename: 'Query', product: (
    { __typename: 'Product' }
    & { ' $fragmentRefs'?: { 'ProductCoreFragment': ProductCoreFragment } }
  ) | null };

export type ProductBySlugQueryVariables = Exact<{
  slug: Scalars['String']['input'];
}>;


export type ProductBySlugQuery = { __typename: 'Query', productBySlug: (
    { __typename: 'Product' }
    & { ' $fragmentRefs'?: { 'ProductCoreFragment': ProductCoreFragment } }
  ) | null };

export type PublicProductsQueryVariables = Exact<{
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
}>;


export type PublicProductsQuery = { __typename: 'Query', products: Array<{ __typename: 'Product', id: number, slug: string, name: string, domain: string | null, icpAnalyzedAt: string | null, pricingAnalyzedAt: string | null, gtmAnalyzedAt: string | null, intelReportAt: string | null }> };

export type PublicProductQueryVariables = Exact<{
  slug: Scalars['String']['input'];
}>;


export type PublicProductQuery = { __typename: 'Query', productBySlug: (
    { __typename: 'Product' }
    & { ' $fragmentRefs'?: { 'ProductCoreFragment': ProductCoreFragment } }
  ) | null };

export type PublicIntelRunQueryVariables = Exact<{
  id: Scalars['ID']['input'];
}>;


export type PublicIntelRunQuery = { __typename: 'Query', productIntelRun: (
    { __typename: 'IntelRun' }
    & { ' $fragmentRefs'?: { 'IntelRunCoreFragment': IntelRunCoreFragment } }
  ) | null };

export type PublicIntelRunsQueryVariables = Exact<{
  productId: Scalars['Int']['input'];
  kind?: InputMaybe<Scalars['String']['input']>;
}>;


export type PublicIntelRunsQuery = { __typename: 'Query', productIntelRuns: Array<{ __typename: 'IntelRun', id: string, kind: string, status: string, startedAt: string, finishedAt: string | null, error: string | null }> };

export type UpsertProductMutationVariables = Exact<{
  input: ProductInput;
}>;


export type UpsertProductMutation = { __typename: 'Mutation', upsertProduct: (
    { __typename: 'Product' }
    & { ' $fragmentRefs'?: { 'ProductCoreFragment': ProductCoreFragment } }
  ) };

export type DeleteProductMutationVariables = Exact<{
  id: Scalars['Int']['input'];
}>;


export type DeleteProductMutation = { __typename: 'Mutation', deleteProduct: boolean };

export type AnalyzeProductIcpMutationVariables = Exact<{
  id: Scalars['Int']['input'];
}>;


export type AnalyzeProductIcpMutation = { __typename: 'Mutation', analyzeProductICP: (
    { __typename: 'Product' }
    & { ' $fragmentRefs'?: { 'ProductCoreFragment': ProductCoreFragment } }
  ) };

export type EnhanceProductIcpMutationVariables = Exact<{
  id: Scalars['Int']['input'];
}>;


export type EnhanceProductIcpMutation = { __typename: 'Mutation', enhanceProductIcp: (
    { __typename: 'Product' }
    & { ' $fragmentRefs'?: { 'ProductCoreFragment': ProductCoreFragment } }
  ) };

export type AnalyzeProductPricingMutationVariables = Exact<{
  id: Scalars['Int']['input'];
}>;


export type AnalyzeProductPricingMutation = { __typename: 'Mutation', analyzeProductPricing: (
    { __typename: 'Product' }
    & { ' $fragmentRefs'?: { 'ProductCoreFragment': ProductCoreFragment } }
  ) };

export type AnalyzeProductGtmMutationVariables = Exact<{
  id: Scalars['Int']['input'];
}>;


export type AnalyzeProductGtmMutation = { __typename: 'Mutation', analyzeProductGTM: (
    { __typename: 'Product' }
    & { ' $fragmentRefs'?: { 'ProductCoreFragment': ProductCoreFragment } }
  ) };

export type RunFullProductIntelMutationVariables = Exact<{
  id: Scalars['Int']['input'];
}>;


export type RunFullProductIntelMutation = { __typename: 'Mutation', runFullProductIntel: (
    { __typename: 'Product' }
    & { ' $fragmentRefs'?: { 'ProductCoreFragment': ProductCoreFragment } }
  ) };

export type AnalyzeProductPricingAsyncMutationVariables = Exact<{
  id: Scalars['Int']['input'];
}>;


export type AnalyzeProductPricingAsyncMutation = { __typename: 'Mutation', analyzeProductPricingAsync: { __typename: 'IntelRunAccepted', runId: string, productId: number, kind: string, status: string } };

export type AnalyzeProductGtmAsyncMutationVariables = Exact<{
  id: Scalars['Int']['input'];
}>;


export type AnalyzeProductGtmAsyncMutation = { __typename: 'Mutation', analyzeProductGTMAsync: { __typename: 'IntelRunAccepted', runId: string, productId: number, kind: string, status: string } };

export type RunFullProductIntelAsyncMutationVariables = Exact<{
  id: Scalars['Int']['input'];
  forceRefresh?: InputMaybe<Scalars['Boolean']['input']>;
}>;


export type RunFullProductIntelAsyncMutation = { __typename: 'Mutation', runFullProductIntelAsync: { __typename: 'IntelRunAccepted', runId: string, productId: number, kind: string, status: string } };

export type SetProductPublishedMutationVariables = Exact<{
  id: Scalars['Int']['input'];
  published: Scalars['Boolean']['input'];
}>;


export type SetProductPublishedMutation = { __typename: 'Mutation', setProductPublished: (
    { __typename: 'Product' }
    & { ' $fragmentRefs'?: { 'ProductCoreFragment': ProductCoreFragment } }
  ) };

export type ProductLeadCoreFragment = { __typename: 'ProductLead', companyId: number, companyKey: string, companyName: string, companyDomain: string | null, companyLogoUrl: string | null, companyDescription: string | null, companyIndustry: string | null, companySize: string | null, companyLocation: string | null, tier: string | null, score: number, regexScore: number, semanticScore: number | null, signals: any | null, updatedAt: string } & { ' $fragmentName'?: 'ProductLeadCoreFragment' };

export type ProductLeadsQueryVariables = Exact<{
  slug: Scalars['String']['input'];
  tier?: InputMaybe<Scalars['String']['input']>;
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
}>;


export type ProductLeadsQuery = { __typename: 'Query', productLeads: { __typename: 'ProductLeadsConnection', totalCount: number, hotCount: number, warmCount: number, coldCount: number, leads: Array<(
      { __typename: 'ProductLead' }
      & { ' $fragmentRefs'?: { 'ProductLeadCoreFragment': ProductLeadCoreFragment } }
    )> } };

export type ProductLeadsPreviewQueryVariables = Exact<{
  slug: Scalars['String']['input'];
}>;


export type ProductLeadsPreviewQuery = { __typename: 'Query', productLeads: { __typename: 'ProductLeadsConnection', totalCount: number, hotCount: number, warmCount: number, leads: Array<{ __typename: 'ProductLead', companyId: number, companyKey: string, companyName: string, companyDomain: string | null, companyLogoUrl: string | null, tier: string | null, score: number }> } };

export type DueRemindersQueryVariables = Exact<{ [key: string]: never; }>;


export type DueRemindersQuery = { __typename: 'Query', dueReminders: Array<{ __typename: 'ReminderWithContact', reminder: { __typename: 'Reminder', id: number, entityType: string, entityId: number, remindAt: string, recurrence: string, note: string | null, status: string, snoozedUntil: string | null, createdAt: string, updatedAt: string }, contact: { __typename: 'Contact', id: number, slug: string | null, firstName: string, lastName: string, position: string | null, tags: Array<string> } }> };

export type RemindersQueryVariables = Exact<{
  entityType: Scalars['String']['input'];
  entityId: Scalars['Int']['input'];
}>;


export type RemindersQuery = { __typename: 'Query', reminders: Array<{ __typename: 'Reminder', id: number, entityType: string, entityId: number, remindAt: string, recurrence: string, note: string | null, status: string, snoozedUntil: string | null, createdAt: string, updatedAt: string }> };

export type CreateReminderMutationVariables = Exact<{
  input: CreateReminderInput;
}>;


export type CreateReminderMutation = { __typename: 'Mutation', createReminder: { __typename: 'Reminder', id: number, entityType: string, entityId: number, remindAt: string, recurrence: string, note: string | null, status: string, createdAt: string } };

export type UpdateReminderMutationVariables = Exact<{
  id: Scalars['Int']['input'];
  input: UpdateReminderInput;
}>;


export type UpdateReminderMutation = { __typename: 'Mutation', updateReminder: { __typename: 'Reminder', id: number, entityType: string, entityId: number, remindAt: string, recurrence: string, note: string | null, status: string, updatedAt: string } };

export type SnoozeReminderMutationVariables = Exact<{
  id: Scalars['Int']['input'];
  days: Scalars['Int']['input'];
}>;


export type SnoozeReminderMutation = { __typename: 'Mutation', snoozeReminder: { __typename: 'Reminder', id: number, entityType: string, entityId: number, remindAt: string, status: string, snoozedUntil: string | null, updatedAt: string } };

export type DismissReminderMutationVariables = Exact<{
  id: Scalars['Int']['input'];
}>;


export type DismissReminderMutation = { __typename: 'Mutation', dismissReminder: { __typename: 'Reminder', id: number, entityType: string, entityId: number, status: string, updatedAt: string } };

export type ComputeNextTouchScoresMutationVariables = Exact<{
  companyId: Scalars['Int']['input'];
}>;


export type ComputeNextTouchScoresMutation = { __typename: 'Mutation', computeNextTouchScores: { __typename: 'ComputeNextTouchScoresResult', success: boolean, message: string, contactsUpdated: number, topContacts: Array<{ __typename: 'ContactNextTouch', contactId: number, firstName: string, lastName: string, position: string | null, nextTouchScore: number, lastContactedAt: string | null }> } };

export type ScoreContactsMlMutationVariables = Exact<{
  companyId: Scalars['Int']['input'];
}>;


export type ScoreContactsMlMutation = { __typename: 'Mutation', scoreContactsML: { __typename: 'ScoreContactsMLResult', success: boolean, message: string, contactsScored: number, decisionMakersFound: number, results: Array<{ __typename: 'ContactMLScore', contactId: number, seniority: string, department: string, authorityScore: number, isDecisionMaker: boolean, dmReasons: Array<string> }> } };

export type GetReplyDraftsQueryVariables = Exact<{
  status?: InputMaybe<Scalars['String']['input']>;
  draftType?: InputMaybe<Scalars['String']['input']>;
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
}>;


export type GetReplyDraftsQuery = { __typename: 'Query', replyDrafts: { __typename: 'ReplyDraftsResult', totalCount: number, drafts: Array<{ __typename: 'ReplyDraft', id: number, receivedEmailId: number, contactId: number, status: string, draftType: string, subject: string, bodyText: string, bodyHtml: string | null, generationModel: string | null, contactName: string | null, contactEmail: string | null, companyName: string | null, classification: string | null, classificationConfidence: number | null, approvedAt: string | null, sentAt: string | null, createdAt: string, updatedAt: string }> } };

export type GetDraftSummaryQueryVariables = Exact<{ [key: string]: never; }>;


export type GetDraftSummaryQuery = { __typename: 'Query', draftSummary: { __typename: 'DraftSummary', pending: number, approved: number, sent: number, dismissed: number, byClassification: Array<{ __typename: 'ClassificationCount', classification: string, count: number }> } };

export type ApproveAndSendDraftMutationVariables = Exact<{
  draftId: Scalars['Int']['input'];
  editedSubject?: InputMaybe<Scalars['String']['input']>;
  editedBody?: InputMaybe<Scalars['String']['input']>;
}>;


export type ApproveAndSendDraftMutation = { __typename: 'Mutation', approveAndSendDraft: { __typename: 'SendDraftResult', success: boolean, resendId: string | null, error: string | null } };

export type DismissDraftMutationVariables = Exact<{
  draftId: Scalars['Int']['input'];
}>;


export type DismissDraftMutation = { __typename: 'Mutation', dismissDraft: { __typename: 'DismissDraftResult', success: boolean } };

export type RegenerateDraftMutationVariables = Exact<{
  draftId: Scalars['Int']['input'];
  instructions?: InputMaybe<Scalars['String']['input']>;
}>;


export type RegenerateDraftMutation = { __typename: 'Mutation', regenerateDraft: { __typename: 'ReplyDraft', id: number, subject: string, bodyText: string, status: string, createdAt: string } };

export type GenerateDraftsForPendingMutationVariables = Exact<{ [key: string]: never; }>;


export type GenerateDraftsForPendingMutation = { __typename: 'Mutation', generateDraftsForPending: { __typename: 'GenerateDraftsBatchResult', success: boolean, generated: number, skipped: number, failed: number, message: string } };

export type GenerateFollowUpDraftsMutationVariables = Exact<{
  daysAfterInitial?: InputMaybe<Scalars['Int']['input']>;
  daysAfterFollowUp1?: InputMaybe<Scalars['Int']['input']>;
  daysAfterFollowUp2?: InputMaybe<Scalars['Int']['input']>;
}>;


export type GenerateFollowUpDraftsMutation = { __typename: 'Mutation', generateFollowUpDrafts: { __typename: 'GenerateDraftsBatchResult', success: boolean, generated: number, skipped: number, failed: number, message: string } };

export type ApproveAllDraftsMutationVariables = Exact<{
  draftIds: Array<Scalars['Int']['input']> | Scalars['Int']['input'];
}>;


export type ApproveAllDraftsMutation = { __typename: 'Mutation', approveAllDrafts: { __typename: 'BatchSendDraftResult', success: boolean, sent: number, failed: number, errors: Array<string> } };

export type DismissAllDraftsMutationVariables = Exact<{
  draftIds: Array<Scalars['Int']['input']> | Scalars['Int']['input'];
}>;


export type DismissAllDraftsMutation = { __typename: 'Mutation', dismissAllDrafts: { __typename: 'BatchDismissResult', success: boolean, dismissed: number } };

export type GetCompanyScrapedPostsQueryVariables = Exact<{
  companySlug: Scalars['String']['input'];
}>;


export type GetCompanyScrapedPostsQuery = { __typename: 'Query', companyScrapedPosts: { __typename: 'CompanyScrapedPostsResult', companyName: string, slug: string, peopleCount: number, postsCount: number, posts: Array<{ __typename: 'ScrapedPost', personName: string, personLinkedinUrl: string, personHeadline: string | null, postUrl: string | null, postText: string | null, postedDate: string | null, reactionsCount: number, commentsCount: number, repostsCount: number, isRepost: boolean, originalAuthor: string | null, scrapedAt: string }> } };

export const EvidenceFieldsFragmentDoc = {"kind":"Document","definitions":[{"kind":"FragmentDefinition","name":{"kind":"Name","value":"EvidenceFields"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Evidence"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"source_type"}},{"kind":"Field","name":{"kind":"Name","value":"source_url"}},{"kind":"Field","name":{"kind":"Name","value":"crawl_id"}},{"kind":"Field","name":{"kind":"Name","value":"capture_timestamp"}},{"kind":"Field","name":{"kind":"Name","value":"observed_at"}},{"kind":"Field","name":{"kind":"Name","value":"method"}},{"kind":"Field","name":{"kind":"Name","value":"extractor_version"}},{"kind":"Field","name":{"kind":"Name","value":"http_status"}},{"kind":"Field","name":{"kind":"Name","value":"mime"}},{"kind":"Field","name":{"kind":"Name","value":"content_hash"}},{"kind":"Field","name":{"kind":"Name","value":"warc"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"filename"}},{"kind":"Field","name":{"kind":"Name","value":"offset"}},{"kind":"Field","name":{"kind":"Name","value":"length"}},{"kind":"Field","name":{"kind":"Name","value":"digest"}}]}}]}}]} as unknown as DocumentNode<EvidenceFieldsFragment, unknown>;
export const CompanyFactFieldsFragmentDoc = {"kind":"Document","definitions":[{"kind":"FragmentDefinition","name":{"kind":"Name","value":"CompanyFactFields"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"CompanyFact"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"company_id"}},{"kind":"Field","name":{"kind":"Name","value":"field"}},{"kind":"Field","name":{"kind":"Name","value":"value_json"}},{"kind":"Field","name":{"kind":"Name","value":"value_text"}},{"kind":"Field","name":{"kind":"Name","value":"normalized_value"}},{"kind":"Field","name":{"kind":"Name","value":"confidence"}},{"kind":"Field","name":{"kind":"Name","value":"evidence"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"EvidenceFields"}}]}},{"kind":"Field","name":{"kind":"Name","value":"created_at"}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"EvidenceFields"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Evidence"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"source_type"}},{"kind":"Field","name":{"kind":"Name","value":"source_url"}},{"kind":"Field","name":{"kind":"Name","value":"crawl_id"}},{"kind":"Field","name":{"kind":"Name","value":"capture_timestamp"}},{"kind":"Field","name":{"kind":"Name","value":"observed_at"}},{"kind":"Field","name":{"kind":"Name","value":"method"}},{"kind":"Field","name":{"kind":"Name","value":"extractor_version"}},{"kind":"Field","name":{"kind":"Name","value":"http_status"}},{"kind":"Field","name":{"kind":"Name","value":"mime"}},{"kind":"Field","name":{"kind":"Name","value":"content_hash"}},{"kind":"Field","name":{"kind":"Name","value":"warc"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"filename"}},{"kind":"Field","name":{"kind":"Name","value":"offset"}},{"kind":"Field","name":{"kind":"Name","value":"length"}},{"kind":"Field","name":{"kind":"Name","value":"digest"}}]}}]}}]} as unknown as DocumentNode<CompanyFactFieldsFragment, unknown>;
export const CompanySnapshotFieldsFragmentDoc = {"kind":"Document","definitions":[{"kind":"FragmentDefinition","name":{"kind":"Name","value":"CompanySnapshotFields"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"CompanySnapshot"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"company_id"}},{"kind":"Field","name":{"kind":"Name","value":"source_url"}},{"kind":"Field","name":{"kind":"Name","value":"crawl_id"}},{"kind":"Field","name":{"kind":"Name","value":"capture_timestamp"}},{"kind":"Field","name":{"kind":"Name","value":"fetched_at"}},{"kind":"Field","name":{"kind":"Name","value":"http_status"}},{"kind":"Field","name":{"kind":"Name","value":"mime"}},{"kind":"Field","name":{"kind":"Name","value":"content_hash"}},{"kind":"Field","name":{"kind":"Name","value":"text_sample"}},{"kind":"Field","name":{"kind":"Name","value":"jsonld"}},{"kind":"Field","name":{"kind":"Name","value":"extracted"}},{"kind":"Field","name":{"kind":"Name","value":"evidence"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"EvidenceFields"}}]}},{"kind":"Field","name":{"kind":"Name","value":"created_at"}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"EvidenceFields"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Evidence"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"source_type"}},{"kind":"Field","name":{"kind":"Name","value":"source_url"}},{"kind":"Field","name":{"kind":"Name","value":"crawl_id"}},{"kind":"Field","name":{"kind":"Name","value":"capture_timestamp"}},{"kind":"Field","name":{"kind":"Name","value":"observed_at"}},{"kind":"Field","name":{"kind":"Name","value":"method"}},{"kind":"Field","name":{"kind":"Name","value":"extractor_version"}},{"kind":"Field","name":{"kind":"Name","value":"http_status"}},{"kind":"Field","name":{"kind":"Name","value":"mime"}},{"kind":"Field","name":{"kind":"Name","value":"content_hash"}},{"kind":"Field","name":{"kind":"Name","value":"warc"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"filename"}},{"kind":"Field","name":{"kind":"Name","value":"offset"}},{"kind":"Field","name":{"kind":"Name","value":"length"}},{"kind":"Field","name":{"kind":"Name","value":"digest"}}]}}]}}]} as unknown as DocumentNode<CompanySnapshotFieldsFragment, unknown>;
export const CompanyFieldsFragmentDoc = {"kind":"Document","definitions":[{"kind":"FragmentDefinition","name":{"kind":"Name","value":"CompanyFields"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Company"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"key"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"logo_url"}},{"kind":"Field","name":{"kind":"Name","value":"website"}},{"kind":"Field","name":{"kind":"Name","value":"description"}},{"kind":"Field","name":{"kind":"Name","value":"industry"}},{"kind":"Field","name":{"kind":"Name","value":"size"}},{"kind":"Field","name":{"kind":"Name","value":"location"}},{"kind":"Field","name":{"kind":"Name","value":"created_at"}},{"kind":"Field","name":{"kind":"Name","value":"updated_at"}},{"kind":"Field","name":{"kind":"Name","value":"linkedin_url"}},{"kind":"Field","name":{"kind":"Name","value":"job_board_url"}},{"kind":"Field","name":{"kind":"Name","value":"category"}},{"kind":"Field","name":{"kind":"Name","value":"tags"}},{"kind":"Field","name":{"kind":"Name","value":"services"}},{"kind":"Field","name":{"kind":"Name","value":"service_taxonomy"}},{"kind":"Field","name":{"kind":"Name","value":"industries"}},{"kind":"Field","name":{"kind":"Name","value":"score"}},{"kind":"Field","name":{"kind":"Name","value":"score_reasons"}},{"kind":"Field","name":{"kind":"Name","value":"blocked"}},{"kind":"Field","name":{"kind":"Name","value":"deep_analysis"}},{"kind":"Field","name":{"kind":"Name","value":"last_seen_crawl_id"}},{"kind":"Field","name":{"kind":"Name","value":"last_seen_capture_timestamp"}},{"kind":"Field","name":{"kind":"Name","value":"last_seen_source_url"}},{"kind":"Field","name":{"kind":"Name","value":"opportunities"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"title"}},{"kind":"Field","name":{"kind":"Name","value":"url"}},{"kind":"Field","name":{"kind":"Name","value":"status"}},{"kind":"Field","name":{"kind":"Name","value":"score"}},{"kind":"Field","name":{"kind":"Name","value":"rewardText"}},{"kind":"Field","name":{"kind":"Name","value":"applied"}},{"kind":"Field","name":{"kind":"Name","value":"appliedAt"}},{"kind":"Field","name":{"kind":"Name","value":"tags"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}}]}}]}}]} as unknown as DocumentNode<CompanyFieldsFragment, unknown>;
export const CompetitorCoreFragmentDoc = {"kind":"Document","definitions":[{"kind":"FragmentDefinition","name":{"kind":"Name","value":"CompetitorCore"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Competitor"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"analysisId"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"url"}},{"kind":"Field","name":{"kind":"Name","value":"domain"}},{"kind":"Field","name":{"kind":"Name","value":"logoUrl"}},{"kind":"Field","name":{"kind":"Name","value":"description"}},{"kind":"Field","name":{"kind":"Name","value":"positioningHeadline"}},{"kind":"Field","name":{"kind":"Name","value":"positioningTagline"}},{"kind":"Field","name":{"kind":"Name","value":"targetAudience"}},{"kind":"Field","name":{"kind":"Name","value":"status"}},{"kind":"Field","name":{"kind":"Name","value":"scrapedAt"}},{"kind":"Field","name":{"kind":"Name","value":"scrapeError"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}}]}}]} as unknown as DocumentNode<CompetitorCoreFragment, unknown>;
export const PricingTierCoreFragmentDoc = {"kind":"Document","definitions":[{"kind":"FragmentDefinition","name":{"kind":"Name","value":"PricingTierCore"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"PricingTier"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"tierName"}},{"kind":"Field","name":{"kind":"Name","value":"monthlyPriceUsd"}},{"kind":"Field","name":{"kind":"Name","value":"annualPriceUsd"}},{"kind":"Field","name":{"kind":"Name","value":"seatPriceUsd"}},{"kind":"Field","name":{"kind":"Name","value":"currency"}},{"kind":"Field","name":{"kind":"Name","value":"includedLimits"}},{"kind":"Field","name":{"kind":"Name","value":"isCustomQuote"}},{"kind":"Field","name":{"kind":"Name","value":"sortOrder"}}]}}]} as unknown as DocumentNode<PricingTierCoreFragment, unknown>;
export const CompetitorFeatureCoreFragmentDoc = {"kind":"Document","definitions":[{"kind":"FragmentDefinition","name":{"kind":"Name","value":"CompetitorFeatureCore"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"CompetitorFeature"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"tierName"}},{"kind":"Field","name":{"kind":"Name","value":"featureText"}},{"kind":"Field","name":{"kind":"Name","value":"category"}}]}}]} as unknown as DocumentNode<CompetitorFeatureCoreFragment, unknown>;
export const CompetitorIntegrationCoreFragmentDoc = {"kind":"Document","definitions":[{"kind":"FragmentDefinition","name":{"kind":"Name","value":"CompetitorIntegrationCore"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"CompetitorIntegration"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"integrationName"}},{"kind":"Field","name":{"kind":"Name","value":"integrationUrl"}},{"kind":"Field","name":{"kind":"Name","value":"category"}}]}}]} as unknown as DocumentNode<CompetitorIntegrationCoreFragment, unknown>;
export const CompetitorFullFragmentDoc = {"kind":"Document","definitions":[{"kind":"FragmentDefinition","name":{"kind":"Name","value":"CompetitorFull"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Competitor"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"CompetitorCore"}},{"kind":"Field","name":{"kind":"Name","value":"pricingTiers"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"PricingTierCore"}}]}},{"kind":"Field","name":{"kind":"Name","value":"features"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"CompetitorFeatureCore"}}]}},{"kind":"Field","name":{"kind":"Name","value":"integrations"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"CompetitorIntegrationCore"}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"CompetitorCore"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Competitor"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"analysisId"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"url"}},{"kind":"Field","name":{"kind":"Name","value":"domain"}},{"kind":"Field","name":{"kind":"Name","value":"logoUrl"}},{"kind":"Field","name":{"kind":"Name","value":"description"}},{"kind":"Field","name":{"kind":"Name","value":"positioningHeadline"}},{"kind":"Field","name":{"kind":"Name","value":"positioningTagline"}},{"kind":"Field","name":{"kind":"Name","value":"targetAudience"}},{"kind":"Field","name":{"kind":"Name","value":"status"}},{"kind":"Field","name":{"kind":"Name","value":"scrapedAt"}},{"kind":"Field","name":{"kind":"Name","value":"scrapeError"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"PricingTierCore"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"PricingTier"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"tierName"}},{"kind":"Field","name":{"kind":"Name","value":"monthlyPriceUsd"}},{"kind":"Field","name":{"kind":"Name","value":"annualPriceUsd"}},{"kind":"Field","name":{"kind":"Name","value":"seatPriceUsd"}},{"kind":"Field","name":{"kind":"Name","value":"currency"}},{"kind":"Field","name":{"kind":"Name","value":"includedLimits"}},{"kind":"Field","name":{"kind":"Name","value":"isCustomQuote"}},{"kind":"Field","name":{"kind":"Name","value":"sortOrder"}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"CompetitorFeatureCore"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"CompetitorFeature"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"tierName"}},{"kind":"Field","name":{"kind":"Name","value":"featureText"}},{"kind":"Field","name":{"kind":"Name","value":"category"}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"CompetitorIntegrationCore"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"CompetitorIntegration"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"integrationName"}},{"kind":"Field","name":{"kind":"Name","value":"integrationUrl"}},{"kind":"Field","name":{"kind":"Name","value":"category"}}]}}]} as unknown as DocumentNode<CompetitorFullFragment, unknown>;
export const ProductCoreFragmentDoc = {"kind":"Document","definitions":[{"kind":"FragmentDefinition","name":{"kind":"Name","value":"ProductCore"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Product"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"slug"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"url"}},{"kind":"Field","name":{"kind":"Name","value":"domain"}},{"kind":"Field","name":{"kind":"Name","value":"description"}},{"kind":"Field","name":{"kind":"Name","value":"highlights"}},{"kind":"Field","name":{"kind":"Name","value":"icpAnalysis"}},{"kind":"Field","name":{"kind":"Name","value":"icpAnalyzedAt"}},{"kind":"Field","name":{"kind":"Name","value":"pricingAnalysis"}},{"kind":"Field","name":{"kind":"Name","value":"pricingAnalyzedAt"}},{"kind":"Field","name":{"kind":"Name","value":"gtmAnalysis"}},{"kind":"Field","name":{"kind":"Name","value":"gtmAnalyzedAt"}},{"kind":"Field","name":{"kind":"Name","value":"intelReport"}},{"kind":"Field","name":{"kind":"Name","value":"intelReportAt"}},{"kind":"Field","name":{"kind":"Name","value":"positioningAnalysis"}},{"kind":"Field","name":{"kind":"Name","value":"publishedAt"}},{"kind":"Field","name":{"kind":"Name","value":"createdBy"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}}]}}]} as unknown as DocumentNode<ProductCoreFragment, unknown>;
export const CompetitorAnalysisCoreFragmentDoc = {"kind":"Document","definitions":[{"kind":"FragmentDefinition","name":{"kind":"Name","value":"CompetitorAnalysisCore"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"CompetitorAnalysis"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"product"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"ProductCore"}}]}},{"kind":"Field","name":{"kind":"Name","value":"status"}},{"kind":"Field","name":{"kind":"Name","value":"createdBy"}},{"kind":"Field","name":{"kind":"Name","value":"error"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"ProductCore"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Product"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"slug"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"url"}},{"kind":"Field","name":{"kind":"Name","value":"domain"}},{"kind":"Field","name":{"kind":"Name","value":"description"}},{"kind":"Field","name":{"kind":"Name","value":"highlights"}},{"kind":"Field","name":{"kind":"Name","value":"icpAnalysis"}},{"kind":"Field","name":{"kind":"Name","value":"icpAnalyzedAt"}},{"kind":"Field","name":{"kind":"Name","value":"pricingAnalysis"}},{"kind":"Field","name":{"kind":"Name","value":"pricingAnalyzedAt"}},{"kind":"Field","name":{"kind":"Name","value":"gtmAnalysis"}},{"kind":"Field","name":{"kind":"Name","value":"gtmAnalyzedAt"}},{"kind":"Field","name":{"kind":"Name","value":"intelReport"}},{"kind":"Field","name":{"kind":"Name","value":"intelReportAt"}},{"kind":"Field","name":{"kind":"Name","value":"positioningAnalysis"}},{"kind":"Field","name":{"kind":"Name","value":"publishedAt"}},{"kind":"Field","name":{"kind":"Name","value":"createdBy"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}}]}}]} as unknown as DocumentNode<CompetitorAnalysisCoreFragment, unknown>;
export const IntelRunCoreFragmentDoc = {"kind":"Document","definitions":[{"kind":"FragmentDefinition","name":{"kind":"Name","value":"IntelRunCore"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"IntelRun"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"productId"}},{"kind":"Field","name":{"kind":"Name","value":"kind"}},{"kind":"Field","name":{"kind":"Name","value":"status"}},{"kind":"Field","name":{"kind":"Name","value":"startedAt"}},{"kind":"Field","name":{"kind":"Name","value":"finishedAt"}},{"kind":"Field","name":{"kind":"Name","value":"error"}},{"kind":"Field","name":{"kind":"Name","value":"output"}}]}}]} as unknown as DocumentNode<IntelRunCoreFragment, unknown>;
export const ProductLeadCoreFragmentDoc = {"kind":"Document","definitions":[{"kind":"FragmentDefinition","name":{"kind":"Name","value":"ProductLeadCore"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"ProductLead"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"companyId"}},{"kind":"Field","name":{"kind":"Name","value":"companyKey"}},{"kind":"Field","name":{"kind":"Name","value":"companyName"}},{"kind":"Field","name":{"kind":"Name","value":"companyDomain"}},{"kind":"Field","name":{"kind":"Name","value":"companyLogoUrl"}},{"kind":"Field","name":{"kind":"Name","value":"companyDescription"}},{"kind":"Field","name":{"kind":"Name","value":"companyIndustry"}},{"kind":"Field","name":{"kind":"Name","value":"companySize"}},{"kind":"Field","name":{"kind":"Name","value":"companyLocation"}},{"kind":"Field","name":{"kind":"Name","value":"tier"}},{"kind":"Field","name":{"kind":"Name","value":"score"}},{"kind":"Field","name":{"kind":"Name","value":"regexScore"}},{"kind":"Field","name":{"kind":"Name","value":"semanticScore"}},{"kind":"Field","name":{"kind":"Name","value":"signals"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}}]}}]} as unknown as DocumentNode<ProductLeadCoreFragment, unknown>;
export const GetUserSettingsDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"GetUserSettings"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"userId"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"userSettings"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"userId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"userId"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"excluded_companies"}}]}}]}}]} as unknown as DocumentNode<GetUserSettingsQuery, GetUserSettingsQueryVariables>;
export const UpdateUserSettingsDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"UpdateUserSettings"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"userId"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"settings"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"UserSettingsInput"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"updateUserSettings"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"userId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"userId"}}},{"kind":"Argument","name":{"kind":"Name","value":"settings"},"value":{"kind":"Variable","name":{"kind":"Name","value":"settings"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"user_id"}},{"kind":"Field","name":{"kind":"Name","value":"email_notifications"}},{"kind":"Field","name":{"kind":"Name","value":"daily_digest"}},{"kind":"Field","name":{"kind":"Name","value":"excluded_companies"}},{"kind":"Field","name":{"kind":"Name","value":"dark_mode"}},{"kind":"Field","name":{"kind":"Name","value":"created_at"}},{"kind":"Field","name":{"kind":"Name","value":"updated_at"}}]}}]}}]} as unknown as DocumentNode<UpdateUserSettingsMutation, UpdateUserSettingsMutationVariables>;
export const AllCompanyTagsDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"AllCompanyTags"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"allCompanyTags"}}]}}]} as unknown as DocumentNode<AllCompanyTagsQuery, AllCompanyTagsQueryVariables>;
export const FindCompanyDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"FindCompany"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"name"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"website"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"linkedinUrl"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"findCompany"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"name"},"value":{"kind":"Variable","name":{"kind":"Name","value":"name"}}},{"kind":"Argument","name":{"kind":"Name","value":"website"},"value":{"kind":"Variable","name":{"kind":"Name","value":"website"}}},{"kind":"Argument","name":{"kind":"Name","value":"linkedinUrl"},"value":{"kind":"Variable","name":{"kind":"Name","value":"linkedinUrl"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"found"}},{"kind":"Field","name":{"kind":"Name","value":"company"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"key"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"website"}},{"kind":"Field","name":{"kind":"Name","value":"email"}},{"kind":"Field","name":{"kind":"Name","value":"location"}},{"kind":"Field","name":{"kind":"Name","value":"linkedin_url"}}]}}]}}]}}]} as unknown as DocumentNode<FindCompanyQuery, FindCompanyQueryVariables>;
export const CreateCompanyDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"CreateCompany"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"input"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"CreateCompanyInput"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"createCompany"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"Variable","name":{"kind":"Name","value":"input"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"CompanyFields"}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"CompanyFields"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Company"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"key"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"logo_url"}},{"kind":"Field","name":{"kind":"Name","value":"website"}},{"kind":"Field","name":{"kind":"Name","value":"description"}},{"kind":"Field","name":{"kind":"Name","value":"industry"}},{"kind":"Field","name":{"kind":"Name","value":"size"}},{"kind":"Field","name":{"kind":"Name","value":"location"}},{"kind":"Field","name":{"kind":"Name","value":"created_at"}},{"kind":"Field","name":{"kind":"Name","value":"updated_at"}},{"kind":"Field","name":{"kind":"Name","value":"linkedin_url"}},{"kind":"Field","name":{"kind":"Name","value":"job_board_url"}},{"kind":"Field","name":{"kind":"Name","value":"category"}},{"kind":"Field","name":{"kind":"Name","value":"tags"}},{"kind":"Field","name":{"kind":"Name","value":"services"}},{"kind":"Field","name":{"kind":"Name","value":"service_taxonomy"}},{"kind":"Field","name":{"kind":"Name","value":"industries"}},{"kind":"Field","name":{"kind":"Name","value":"score"}},{"kind":"Field","name":{"kind":"Name","value":"score_reasons"}},{"kind":"Field","name":{"kind":"Name","value":"blocked"}},{"kind":"Field","name":{"kind":"Name","value":"deep_analysis"}},{"kind":"Field","name":{"kind":"Name","value":"last_seen_crawl_id"}},{"kind":"Field","name":{"kind":"Name","value":"last_seen_capture_timestamp"}},{"kind":"Field","name":{"kind":"Name","value":"last_seen_source_url"}},{"kind":"Field","name":{"kind":"Name","value":"opportunities"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"title"}},{"kind":"Field","name":{"kind":"Name","value":"url"}},{"kind":"Field","name":{"kind":"Name","value":"status"}},{"kind":"Field","name":{"kind":"Name","value":"score"}},{"kind":"Field","name":{"kind":"Name","value":"rewardText"}},{"kind":"Field","name":{"kind":"Name","value":"applied"}},{"kind":"Field","name":{"kind":"Name","value":"appliedAt"}},{"kind":"Field","name":{"kind":"Name","value":"tags"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}}]}}]}}]} as unknown as DocumentNode<CreateCompanyMutation, CreateCompanyMutationVariables>;
export const UpdateCompanyDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"UpdateCompany"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"id"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"Int"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"input"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"UpdateCompanyInput"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"updateCompany"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"id"},"value":{"kind":"Variable","name":{"kind":"Name","value":"id"}}},{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"Variable","name":{"kind":"Name","value":"input"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"CompanyFields"}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"CompanyFields"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Company"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"key"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"logo_url"}},{"kind":"Field","name":{"kind":"Name","value":"website"}},{"kind":"Field","name":{"kind":"Name","value":"description"}},{"kind":"Field","name":{"kind":"Name","value":"industry"}},{"kind":"Field","name":{"kind":"Name","value":"size"}},{"kind":"Field","name":{"kind":"Name","value":"location"}},{"kind":"Field","name":{"kind":"Name","value":"created_at"}},{"kind":"Field","name":{"kind":"Name","value":"updated_at"}},{"kind":"Field","name":{"kind":"Name","value":"linkedin_url"}},{"kind":"Field","name":{"kind":"Name","value":"job_board_url"}},{"kind":"Field","name":{"kind":"Name","value":"category"}},{"kind":"Field","name":{"kind":"Name","value":"tags"}},{"kind":"Field","name":{"kind":"Name","value":"services"}},{"kind":"Field","name":{"kind":"Name","value":"service_taxonomy"}},{"kind":"Field","name":{"kind":"Name","value":"industries"}},{"kind":"Field","name":{"kind":"Name","value":"score"}},{"kind":"Field","name":{"kind":"Name","value":"score_reasons"}},{"kind":"Field","name":{"kind":"Name","value":"blocked"}},{"kind":"Field","name":{"kind":"Name","value":"deep_analysis"}},{"kind":"Field","name":{"kind":"Name","value":"last_seen_crawl_id"}},{"kind":"Field","name":{"kind":"Name","value":"last_seen_capture_timestamp"}},{"kind":"Field","name":{"kind":"Name","value":"last_seen_source_url"}},{"kind":"Field","name":{"kind":"Name","value":"opportunities"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"title"}},{"kind":"Field","name":{"kind":"Name","value":"url"}},{"kind":"Field","name":{"kind":"Name","value":"status"}},{"kind":"Field","name":{"kind":"Name","value":"score"}},{"kind":"Field","name":{"kind":"Name","value":"rewardText"}},{"kind":"Field","name":{"kind":"Name","value":"applied"}},{"kind":"Field","name":{"kind":"Name","value":"appliedAt"}},{"kind":"Field","name":{"kind":"Name","value":"tags"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}}]}}]}}]} as unknown as DocumentNode<UpdateCompanyMutation, UpdateCompanyMutationVariables>;
export const DeleteCompanyDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"DeleteCompany"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"id"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"Int"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"deleteCompany"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"id"},"value":{"kind":"Variable","name":{"kind":"Name","value":"id"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"success"}},{"kind":"Field","name":{"kind":"Name","value":"message"}}]}}]}}]} as unknown as DocumentNode<DeleteCompanyMutation, DeleteCompanyMutationVariables>;
export const AddCompanyFactsDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"AddCompanyFacts"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"company_id"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"Int"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"facts"}},"type":{"kind":"NonNullType","type":{"kind":"ListType","type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"CompanyFactInput"}}}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"add_company_facts"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"company_id"},"value":{"kind":"Variable","name":{"kind":"Name","value":"company_id"}}},{"kind":"Argument","name":{"kind":"Name","value":"facts"},"value":{"kind":"Variable","name":{"kind":"Name","value":"facts"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"CompanyFactFields"}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"EvidenceFields"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Evidence"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"source_type"}},{"kind":"Field","name":{"kind":"Name","value":"source_url"}},{"kind":"Field","name":{"kind":"Name","value":"crawl_id"}},{"kind":"Field","name":{"kind":"Name","value":"capture_timestamp"}},{"kind":"Field","name":{"kind":"Name","value":"observed_at"}},{"kind":"Field","name":{"kind":"Name","value":"method"}},{"kind":"Field","name":{"kind":"Name","value":"extractor_version"}},{"kind":"Field","name":{"kind":"Name","value":"http_status"}},{"kind":"Field","name":{"kind":"Name","value":"mime"}},{"kind":"Field","name":{"kind":"Name","value":"content_hash"}},{"kind":"Field","name":{"kind":"Name","value":"warc"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"filename"}},{"kind":"Field","name":{"kind":"Name","value":"offset"}},{"kind":"Field","name":{"kind":"Name","value":"length"}},{"kind":"Field","name":{"kind":"Name","value":"digest"}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"CompanyFactFields"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"CompanyFact"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"company_id"}},{"kind":"Field","name":{"kind":"Name","value":"field"}},{"kind":"Field","name":{"kind":"Name","value":"value_json"}},{"kind":"Field","name":{"kind":"Name","value":"value_text"}},{"kind":"Field","name":{"kind":"Name","value":"normalized_value"}},{"kind":"Field","name":{"kind":"Name","value":"confidence"}},{"kind":"Field","name":{"kind":"Name","value":"evidence"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"EvidenceFields"}}]}},{"kind":"Field","name":{"kind":"Name","value":"created_at"}}]}}]} as unknown as DocumentNode<AddCompanyFactsMutation, AddCompanyFactsMutationVariables>;
export const IngestCompanySnapshotDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"IngestCompanySnapshot"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"company_id"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"Int"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"source_url"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"crawl_id"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"capture_timestamp"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"fetched_at"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"http_status"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"Int"}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"mime"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"content_hash"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"text_sample"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"jsonld"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"JSON"}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"extracted"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"JSON"}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"evidence"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"EvidenceInput"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"ingest_company_snapshot"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"company_id"},"value":{"kind":"Variable","name":{"kind":"Name","value":"company_id"}}},{"kind":"Argument","name":{"kind":"Name","value":"source_url"},"value":{"kind":"Variable","name":{"kind":"Name","value":"source_url"}}},{"kind":"Argument","name":{"kind":"Name","value":"crawl_id"},"value":{"kind":"Variable","name":{"kind":"Name","value":"crawl_id"}}},{"kind":"Argument","name":{"kind":"Name","value":"capture_timestamp"},"value":{"kind":"Variable","name":{"kind":"Name","value":"capture_timestamp"}}},{"kind":"Argument","name":{"kind":"Name","value":"fetched_at"},"value":{"kind":"Variable","name":{"kind":"Name","value":"fetched_at"}}},{"kind":"Argument","name":{"kind":"Name","value":"http_status"},"value":{"kind":"Variable","name":{"kind":"Name","value":"http_status"}}},{"kind":"Argument","name":{"kind":"Name","value":"mime"},"value":{"kind":"Variable","name":{"kind":"Name","value":"mime"}}},{"kind":"Argument","name":{"kind":"Name","value":"content_hash"},"value":{"kind":"Variable","name":{"kind":"Name","value":"content_hash"}}},{"kind":"Argument","name":{"kind":"Name","value":"text_sample"},"value":{"kind":"Variable","name":{"kind":"Name","value":"text_sample"}}},{"kind":"Argument","name":{"kind":"Name","value":"jsonld"},"value":{"kind":"Variable","name":{"kind":"Name","value":"jsonld"}}},{"kind":"Argument","name":{"kind":"Name","value":"extracted"},"value":{"kind":"Variable","name":{"kind":"Name","value":"extracted"}}},{"kind":"Argument","name":{"kind":"Name","value":"evidence"},"value":{"kind":"Variable","name":{"kind":"Name","value":"evidence"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"CompanySnapshotFields"}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"EvidenceFields"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Evidence"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"source_type"}},{"kind":"Field","name":{"kind":"Name","value":"source_url"}},{"kind":"Field","name":{"kind":"Name","value":"crawl_id"}},{"kind":"Field","name":{"kind":"Name","value":"capture_timestamp"}},{"kind":"Field","name":{"kind":"Name","value":"observed_at"}},{"kind":"Field","name":{"kind":"Name","value":"method"}},{"kind":"Field","name":{"kind":"Name","value":"extractor_version"}},{"kind":"Field","name":{"kind":"Name","value":"http_status"}},{"kind":"Field","name":{"kind":"Name","value":"mime"}},{"kind":"Field","name":{"kind":"Name","value":"content_hash"}},{"kind":"Field","name":{"kind":"Name","value":"warc"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"filename"}},{"kind":"Field","name":{"kind":"Name","value":"offset"}},{"kind":"Field","name":{"kind":"Name","value":"length"}},{"kind":"Field","name":{"kind":"Name","value":"digest"}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"CompanySnapshotFields"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"CompanySnapshot"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"company_id"}},{"kind":"Field","name":{"kind":"Name","value":"source_url"}},{"kind":"Field","name":{"kind":"Name","value":"crawl_id"}},{"kind":"Field","name":{"kind":"Name","value":"capture_timestamp"}},{"kind":"Field","name":{"kind":"Name","value":"fetched_at"}},{"kind":"Field","name":{"kind":"Name","value":"http_status"}},{"kind":"Field","name":{"kind":"Name","value":"mime"}},{"kind":"Field","name":{"kind":"Name","value":"content_hash"}},{"kind":"Field","name":{"kind":"Name","value":"text_sample"}},{"kind":"Field","name":{"kind":"Name","value":"jsonld"}},{"kind":"Field","name":{"kind":"Name","value":"extracted"}},{"kind":"Field","name":{"kind":"Name","value":"evidence"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"EvidenceFields"}}]}},{"kind":"Field","name":{"kind":"Name","value":"created_at"}}]}}]} as unknown as DocumentNode<IngestCompanySnapshotMutation, IngestCompanySnapshotMutationVariables>;
export const MergeDuplicateCompaniesDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"MergeDuplicateCompanies"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"companyIds"}},"type":{"kind":"NonNullType","type":{"kind":"ListType","type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"Int"}}}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"mergeDuplicateCompanies"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"companyIds"},"value":{"kind":"Variable","name":{"kind":"Name","value":"companyIds"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"success"}},{"kind":"Field","name":{"kind":"Name","value":"message"}},{"kind":"Field","name":{"kind":"Name","value":"keptCompanyId"}},{"kind":"Field","name":{"kind":"Name","value":"merged"}}]}}]}}]} as unknown as DocumentNode<MergeDuplicateCompaniesMutation, MergeDuplicateCompaniesMutationVariables>;
export const DeleteCompaniesDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"DeleteCompanies"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"companyIds"}},"type":{"kind":"NonNullType","type":{"kind":"ListType","type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"Int"}}}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"deleteCompanies"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"companyIds"},"value":{"kind":"Variable","name":{"kind":"Name","value":"companyIds"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"success"}},{"kind":"Field","name":{"kind":"Name","value":"message"}},{"kind":"Field","name":{"kind":"Name","value":"deleted"}}]}}]}}]} as unknown as DocumentNode<DeleteCompaniesMutation, DeleteCompaniesMutationVariables>;
export const ImportCompanyWithContactsDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"ImportCompanyWithContacts"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"input"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ImportCompanyWithContactsInput"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"importCompanyWithContacts"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"Variable","name":{"kind":"Name","value":"input"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"success"}},{"kind":"Field","name":{"kind":"Name","value":"company"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"key"}},{"kind":"Field","name":{"kind":"Name","value":"name"}}]}},{"kind":"Field","name":{"kind":"Name","value":"contactsImported"}},{"kind":"Field","name":{"kind":"Name","value":"contactsSkipped"}},{"kind":"Field","name":{"kind":"Name","value":"errors"}}]}}]}}]} as unknown as DocumentNode<ImportCompanyWithContactsMutation, ImportCompanyWithContactsMutationVariables>;
export const EnhanceCompanyDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"EnhanceCompany"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"id"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"Int"}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"key"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"enhanceCompany"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"id"},"value":{"kind":"Variable","name":{"kind":"Name","value":"id"}}},{"kind":"Argument","name":{"kind":"Name","value":"key"},"value":{"kind":"Variable","name":{"kind":"Name","value":"key"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"success"}},{"kind":"Field","name":{"kind":"Name","value":"message"}},{"kind":"Field","name":{"kind":"Name","value":"companyId"}},{"kind":"Field","name":{"kind":"Name","value":"companyKey"}}]}}]}}]} as unknown as DocumentNode<EnhanceCompanyMutation, EnhanceCompanyMutationVariables>;
export const AnalyzeCompanyDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"AnalyzeCompany"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"id"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"Int"}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"key"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"analyzeCompany"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"id"},"value":{"kind":"Variable","name":{"kind":"Name","value":"id"}}},{"kind":"Argument","name":{"kind":"Name","value":"key"},"value":{"kind":"Variable","name":{"kind":"Name","value":"key"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"success"}},{"kind":"Field","name":{"kind":"Name","value":"message"}},{"kind":"Field","name":{"kind":"Name","value":"companyId"}},{"kind":"Field","name":{"kind":"Name","value":"companyKey"}}]}}]}}]} as unknown as DocumentNode<AnalyzeCompanyMutation, AnalyzeCompanyMutationVariables>;
export const ImportCompaniesDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"ImportCompanies"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"companies"}},"type":{"kind":"NonNullType","type":{"kind":"ListType","type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"CompanyImportInput"}}}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"importCompanies"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"companies"},"value":{"kind":"Variable","name":{"kind":"Name","value":"companies"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"success"}},{"kind":"Field","name":{"kind":"Name","value":"imported"}},{"kind":"Field","name":{"kind":"Name","value":"failed"}},{"kind":"Field","name":{"kind":"Name","value":"errors"}}]}}]}}]} as unknown as DocumentNode<ImportCompaniesMutation, ImportCompaniesMutationVariables>;
export const BlockCompanyDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"BlockCompany"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"id"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"Int"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"blockCompany"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"id"},"value":{"kind":"Variable","name":{"kind":"Name","value":"id"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"key"}},{"kind":"Field","name":{"kind":"Name","value":"blocked"}}]}}]}}]} as unknown as DocumentNode<BlockCompanyMutation, BlockCompanyMutationVariables>;
export const UnblockCompanyDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"UnblockCompany"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"id"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"Int"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"unblockCompany"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"id"},"value":{"kind":"Variable","name":{"kind":"Name","value":"id"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"key"}},{"kind":"Field","name":{"kind":"Name","value":"blocked"}}]}}]}}]} as unknown as DocumentNode<UnblockCompanyMutation, UnblockCompanyMutationVariables>;
export const GetCompanyDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"GetCompany"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"id"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"Int"}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"key"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"company"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"id"},"value":{"kind":"Variable","name":{"kind":"Name","value":"id"}}},{"kind":"Argument","name":{"kind":"Name","value":"key"},"value":{"kind":"Variable","name":{"kind":"Name","value":"key"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"CompanyFields"}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"CompanyFields"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Company"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"key"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"logo_url"}},{"kind":"Field","name":{"kind":"Name","value":"website"}},{"kind":"Field","name":{"kind":"Name","value":"description"}},{"kind":"Field","name":{"kind":"Name","value":"industry"}},{"kind":"Field","name":{"kind":"Name","value":"size"}},{"kind":"Field","name":{"kind":"Name","value":"location"}},{"kind":"Field","name":{"kind":"Name","value":"created_at"}},{"kind":"Field","name":{"kind":"Name","value":"updated_at"}},{"kind":"Field","name":{"kind":"Name","value":"linkedin_url"}},{"kind":"Field","name":{"kind":"Name","value":"job_board_url"}},{"kind":"Field","name":{"kind":"Name","value":"category"}},{"kind":"Field","name":{"kind":"Name","value":"tags"}},{"kind":"Field","name":{"kind":"Name","value":"services"}},{"kind":"Field","name":{"kind":"Name","value":"service_taxonomy"}},{"kind":"Field","name":{"kind":"Name","value":"industries"}},{"kind":"Field","name":{"kind":"Name","value":"score"}},{"kind":"Field","name":{"kind":"Name","value":"score_reasons"}},{"kind":"Field","name":{"kind":"Name","value":"blocked"}},{"kind":"Field","name":{"kind":"Name","value":"deep_analysis"}},{"kind":"Field","name":{"kind":"Name","value":"last_seen_crawl_id"}},{"kind":"Field","name":{"kind":"Name","value":"last_seen_capture_timestamp"}},{"kind":"Field","name":{"kind":"Name","value":"last_seen_source_url"}},{"kind":"Field","name":{"kind":"Name","value":"opportunities"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"title"}},{"kind":"Field","name":{"kind":"Name","value":"url"}},{"kind":"Field","name":{"kind":"Name","value":"status"}},{"kind":"Field","name":{"kind":"Name","value":"score"}},{"kind":"Field","name":{"kind":"Name","value":"rewardText"}},{"kind":"Field","name":{"kind":"Name","value":"applied"}},{"kind":"Field","name":{"kind":"Name","value":"appliedAt"}},{"kind":"Field","name":{"kind":"Name","value":"tags"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}}]}}]}}]} as unknown as DocumentNode<GetCompanyQuery, GetCompanyQueryVariables>;
export const GetCompaniesDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"GetCompanies"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"text"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"order_by"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"CompanyOrderBy"}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"limit"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"Int"}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"offset"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"Int"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"companies"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"filter"},"value":{"kind":"ObjectValue","fields":[{"kind":"ObjectField","name":{"kind":"Name","value":"text"},"value":{"kind":"Variable","name":{"kind":"Name","value":"text"}}}]}},{"kind":"Argument","name":{"kind":"Name","value":"order_by"},"value":{"kind":"Variable","name":{"kind":"Name","value":"order_by"}}},{"kind":"Argument","name":{"kind":"Name","value":"limit"},"value":{"kind":"Variable","name":{"kind":"Name","value":"limit"}}},{"kind":"Argument","name":{"kind":"Name","value":"offset"},"value":{"kind":"Variable","name":{"kind":"Name","value":"offset"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"companies"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"CompanyFields"}}]}},{"kind":"Field","name":{"kind":"Name","value":"totalCount"}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"CompanyFields"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Company"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"key"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"logo_url"}},{"kind":"Field","name":{"kind":"Name","value":"website"}},{"kind":"Field","name":{"kind":"Name","value":"description"}},{"kind":"Field","name":{"kind":"Name","value":"industry"}},{"kind":"Field","name":{"kind":"Name","value":"size"}},{"kind":"Field","name":{"kind":"Name","value":"location"}},{"kind":"Field","name":{"kind":"Name","value":"created_at"}},{"kind":"Field","name":{"kind":"Name","value":"updated_at"}},{"kind":"Field","name":{"kind":"Name","value":"linkedin_url"}},{"kind":"Field","name":{"kind":"Name","value":"job_board_url"}},{"kind":"Field","name":{"kind":"Name","value":"category"}},{"kind":"Field","name":{"kind":"Name","value":"tags"}},{"kind":"Field","name":{"kind":"Name","value":"services"}},{"kind":"Field","name":{"kind":"Name","value":"service_taxonomy"}},{"kind":"Field","name":{"kind":"Name","value":"industries"}},{"kind":"Field","name":{"kind":"Name","value":"score"}},{"kind":"Field","name":{"kind":"Name","value":"score_reasons"}},{"kind":"Field","name":{"kind":"Name","value":"blocked"}},{"kind":"Field","name":{"kind":"Name","value":"deep_analysis"}},{"kind":"Field","name":{"kind":"Name","value":"last_seen_crawl_id"}},{"kind":"Field","name":{"kind":"Name","value":"last_seen_capture_timestamp"}},{"kind":"Field","name":{"kind":"Name","value":"last_seen_source_url"}},{"kind":"Field","name":{"kind":"Name","value":"opportunities"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"title"}},{"kind":"Field","name":{"kind":"Name","value":"url"}},{"kind":"Field","name":{"kind":"Name","value":"status"}},{"kind":"Field","name":{"kind":"Name","value":"score"}},{"kind":"Field","name":{"kind":"Name","value":"rewardText"}},{"kind":"Field","name":{"kind":"Name","value":"applied"}},{"kind":"Field","name":{"kind":"Name","value":"appliedAt"}},{"kind":"Field","name":{"kind":"Name","value":"tags"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}}]}}]}}]} as unknown as DocumentNode<GetCompaniesQuery, GetCompaniesQueryVariables>;
export const SearchCompaniesDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"SearchCompanies"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"filter"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"CompanyFilterInput"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"order_by"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"CompanyOrderBy"}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"limit"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"Int"}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"offset"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"Int"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"companies"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"filter"},"value":{"kind":"Variable","name":{"kind":"Name","value":"filter"}}},{"kind":"Argument","name":{"kind":"Name","value":"order_by"},"value":{"kind":"Variable","name":{"kind":"Name","value":"order_by"}}},{"kind":"Argument","name":{"kind":"Name","value":"limit"},"value":{"kind":"Variable","name":{"kind":"Name","value":"limit"}}},{"kind":"Argument","name":{"kind":"Name","value":"offset"},"value":{"kind":"Variable","name":{"kind":"Name","value":"offset"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"companies"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"CompanyFields"}}]}},{"kind":"Field","name":{"kind":"Name","value":"totalCount"}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"CompanyFields"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Company"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"key"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"logo_url"}},{"kind":"Field","name":{"kind":"Name","value":"website"}},{"kind":"Field","name":{"kind":"Name","value":"description"}},{"kind":"Field","name":{"kind":"Name","value":"industry"}},{"kind":"Field","name":{"kind":"Name","value":"size"}},{"kind":"Field","name":{"kind":"Name","value":"location"}},{"kind":"Field","name":{"kind":"Name","value":"created_at"}},{"kind":"Field","name":{"kind":"Name","value":"updated_at"}},{"kind":"Field","name":{"kind":"Name","value":"linkedin_url"}},{"kind":"Field","name":{"kind":"Name","value":"job_board_url"}},{"kind":"Field","name":{"kind":"Name","value":"category"}},{"kind":"Field","name":{"kind":"Name","value":"tags"}},{"kind":"Field","name":{"kind":"Name","value":"services"}},{"kind":"Field","name":{"kind":"Name","value":"service_taxonomy"}},{"kind":"Field","name":{"kind":"Name","value":"industries"}},{"kind":"Field","name":{"kind":"Name","value":"score"}},{"kind":"Field","name":{"kind":"Name","value":"score_reasons"}},{"kind":"Field","name":{"kind":"Name","value":"blocked"}},{"kind":"Field","name":{"kind":"Name","value":"deep_analysis"}},{"kind":"Field","name":{"kind":"Name","value":"last_seen_crawl_id"}},{"kind":"Field","name":{"kind":"Name","value":"last_seen_capture_timestamp"}},{"kind":"Field","name":{"kind":"Name","value":"last_seen_source_url"}},{"kind":"Field","name":{"kind":"Name","value":"opportunities"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"title"}},{"kind":"Field","name":{"kind":"Name","value":"url"}},{"kind":"Field","name":{"kind":"Name","value":"status"}},{"kind":"Field","name":{"kind":"Name","value":"score"}},{"kind":"Field","name":{"kind":"Name","value":"rewardText"}},{"kind":"Field","name":{"kind":"Name","value":"applied"}},{"kind":"Field","name":{"kind":"Name","value":"appliedAt"}},{"kind":"Field","name":{"kind":"Name","value":"tags"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}}]}}]}}]} as unknown as DocumentNode<SearchCompaniesQuery, SearchCompaniesQueryVariables>;
export const GetCompanyFactsDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"GetCompanyFacts"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"company_id"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"Int"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"field"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"limit"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"Int"}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"offset"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"Int"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"company_facts"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"company_id"},"value":{"kind":"Variable","name":{"kind":"Name","value":"company_id"}}},{"kind":"Argument","name":{"kind":"Name","value":"field"},"value":{"kind":"Variable","name":{"kind":"Name","value":"field"}}},{"kind":"Argument","name":{"kind":"Name","value":"limit"},"value":{"kind":"Variable","name":{"kind":"Name","value":"limit"}}},{"kind":"Argument","name":{"kind":"Name","value":"offset"},"value":{"kind":"Variable","name":{"kind":"Name","value":"offset"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"CompanyFactFields"}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"EvidenceFields"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Evidence"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"source_type"}},{"kind":"Field","name":{"kind":"Name","value":"source_url"}},{"kind":"Field","name":{"kind":"Name","value":"crawl_id"}},{"kind":"Field","name":{"kind":"Name","value":"capture_timestamp"}},{"kind":"Field","name":{"kind":"Name","value":"observed_at"}},{"kind":"Field","name":{"kind":"Name","value":"method"}},{"kind":"Field","name":{"kind":"Name","value":"extractor_version"}},{"kind":"Field","name":{"kind":"Name","value":"http_status"}},{"kind":"Field","name":{"kind":"Name","value":"mime"}},{"kind":"Field","name":{"kind":"Name","value":"content_hash"}},{"kind":"Field","name":{"kind":"Name","value":"warc"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"filename"}},{"kind":"Field","name":{"kind":"Name","value":"offset"}},{"kind":"Field","name":{"kind":"Name","value":"length"}},{"kind":"Field","name":{"kind":"Name","value":"digest"}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"CompanyFactFields"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"CompanyFact"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"company_id"}},{"kind":"Field","name":{"kind":"Name","value":"field"}},{"kind":"Field","name":{"kind":"Name","value":"value_json"}},{"kind":"Field","name":{"kind":"Name","value":"value_text"}},{"kind":"Field","name":{"kind":"Name","value":"normalized_value"}},{"kind":"Field","name":{"kind":"Name","value":"confidence"}},{"kind":"Field","name":{"kind":"Name","value":"evidence"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"EvidenceFields"}}]}},{"kind":"Field","name":{"kind":"Name","value":"created_at"}}]}}]} as unknown as DocumentNode<GetCompanyFactsQuery, GetCompanyFactsQueryVariables>;
export const CompanyAuditDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"CompanyAudit"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"key"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"company"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"key"},"value":{"kind":"Variable","name":{"kind":"Name","value":"key"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"CompanyFields"}},{"kind":"Field","name":{"kind":"Name","value":"facts"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"limit"},"value":{"kind":"IntValue","value":"200"}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"CompanyFactFields"}}]}},{"kind":"Field","name":{"kind":"Name","value":"facts_count"}},{"kind":"Field","name":{"kind":"Name","value":"snapshots"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"limit"},"value":{"kind":"IntValue","value":"10"}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"CompanySnapshotFields"}}]}},{"kind":"Field","name":{"kind":"Name","value":"snapshots_count"}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"EvidenceFields"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Evidence"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"source_type"}},{"kind":"Field","name":{"kind":"Name","value":"source_url"}},{"kind":"Field","name":{"kind":"Name","value":"crawl_id"}},{"kind":"Field","name":{"kind":"Name","value":"capture_timestamp"}},{"kind":"Field","name":{"kind":"Name","value":"observed_at"}},{"kind":"Field","name":{"kind":"Name","value":"method"}},{"kind":"Field","name":{"kind":"Name","value":"extractor_version"}},{"kind":"Field","name":{"kind":"Name","value":"http_status"}},{"kind":"Field","name":{"kind":"Name","value":"mime"}},{"kind":"Field","name":{"kind":"Name","value":"content_hash"}},{"kind":"Field","name":{"kind":"Name","value":"warc"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"filename"}},{"kind":"Field","name":{"kind":"Name","value":"offset"}},{"kind":"Field","name":{"kind":"Name","value":"length"}},{"kind":"Field","name":{"kind":"Name","value":"digest"}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"CompanyFields"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Company"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"key"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"logo_url"}},{"kind":"Field","name":{"kind":"Name","value":"website"}},{"kind":"Field","name":{"kind":"Name","value":"description"}},{"kind":"Field","name":{"kind":"Name","value":"industry"}},{"kind":"Field","name":{"kind":"Name","value":"size"}},{"kind":"Field","name":{"kind":"Name","value":"location"}},{"kind":"Field","name":{"kind":"Name","value":"created_at"}},{"kind":"Field","name":{"kind":"Name","value":"updated_at"}},{"kind":"Field","name":{"kind":"Name","value":"linkedin_url"}},{"kind":"Field","name":{"kind":"Name","value":"job_board_url"}},{"kind":"Field","name":{"kind":"Name","value":"category"}},{"kind":"Field","name":{"kind":"Name","value":"tags"}},{"kind":"Field","name":{"kind":"Name","value":"services"}},{"kind":"Field","name":{"kind":"Name","value":"service_taxonomy"}},{"kind":"Field","name":{"kind":"Name","value":"industries"}},{"kind":"Field","name":{"kind":"Name","value":"score"}},{"kind":"Field","name":{"kind":"Name","value":"score_reasons"}},{"kind":"Field","name":{"kind":"Name","value":"blocked"}},{"kind":"Field","name":{"kind":"Name","value":"deep_analysis"}},{"kind":"Field","name":{"kind":"Name","value":"last_seen_crawl_id"}},{"kind":"Field","name":{"kind":"Name","value":"last_seen_capture_timestamp"}},{"kind":"Field","name":{"kind":"Name","value":"last_seen_source_url"}},{"kind":"Field","name":{"kind":"Name","value":"opportunities"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"title"}},{"kind":"Field","name":{"kind":"Name","value":"url"}},{"kind":"Field","name":{"kind":"Name","value":"status"}},{"kind":"Field","name":{"kind":"Name","value":"score"}},{"kind":"Field","name":{"kind":"Name","value":"rewardText"}},{"kind":"Field","name":{"kind":"Name","value":"applied"}},{"kind":"Field","name":{"kind":"Name","value":"appliedAt"}},{"kind":"Field","name":{"kind":"Name","value":"tags"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"CompanyFactFields"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"CompanyFact"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"company_id"}},{"kind":"Field","name":{"kind":"Name","value":"field"}},{"kind":"Field","name":{"kind":"Name","value":"value_json"}},{"kind":"Field","name":{"kind":"Name","value":"value_text"}},{"kind":"Field","name":{"kind":"Name","value":"normalized_value"}},{"kind":"Field","name":{"kind":"Name","value":"confidence"}},{"kind":"Field","name":{"kind":"Name","value":"evidence"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"EvidenceFields"}}]}},{"kind":"Field","name":{"kind":"Name","value":"created_at"}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"CompanySnapshotFields"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"CompanySnapshot"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"company_id"}},{"kind":"Field","name":{"kind":"Name","value":"source_url"}},{"kind":"Field","name":{"kind":"Name","value":"crawl_id"}},{"kind":"Field","name":{"kind":"Name","value":"capture_timestamp"}},{"kind":"Field","name":{"kind":"Name","value":"fetched_at"}},{"kind":"Field","name":{"kind":"Name","value":"http_status"}},{"kind":"Field","name":{"kind":"Name","value":"mime"}},{"kind":"Field","name":{"kind":"Name","value":"content_hash"}},{"kind":"Field","name":{"kind":"Name","value":"text_sample"}},{"kind":"Field","name":{"kind":"Name","value":"jsonld"}},{"kind":"Field","name":{"kind":"Name","value":"extracted"}},{"kind":"Field","name":{"kind":"Name","value":"evidence"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"EvidenceFields"}}]}},{"kind":"Field","name":{"kind":"Name","value":"created_at"}}]}}]} as unknown as DocumentNode<CompanyAuditQuery, CompanyAuditQueryVariables>;
export const CompetitorAnalysesDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"CompetitorAnalyses"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"competitorAnalyses"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"CompetitorAnalysisCore"}},{"kind":"Field","name":{"kind":"Name","value":"competitors"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"status"}}]}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"ProductCore"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Product"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"slug"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"url"}},{"kind":"Field","name":{"kind":"Name","value":"domain"}},{"kind":"Field","name":{"kind":"Name","value":"description"}},{"kind":"Field","name":{"kind":"Name","value":"highlights"}},{"kind":"Field","name":{"kind":"Name","value":"icpAnalysis"}},{"kind":"Field","name":{"kind":"Name","value":"icpAnalyzedAt"}},{"kind":"Field","name":{"kind":"Name","value":"pricingAnalysis"}},{"kind":"Field","name":{"kind":"Name","value":"pricingAnalyzedAt"}},{"kind":"Field","name":{"kind":"Name","value":"gtmAnalysis"}},{"kind":"Field","name":{"kind":"Name","value":"gtmAnalyzedAt"}},{"kind":"Field","name":{"kind":"Name","value":"intelReport"}},{"kind":"Field","name":{"kind":"Name","value":"intelReportAt"}},{"kind":"Field","name":{"kind":"Name","value":"positioningAnalysis"}},{"kind":"Field","name":{"kind":"Name","value":"publishedAt"}},{"kind":"Field","name":{"kind":"Name","value":"createdBy"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"CompetitorAnalysisCore"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"CompetitorAnalysis"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"product"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"ProductCore"}}]}},{"kind":"Field","name":{"kind":"Name","value":"status"}},{"kind":"Field","name":{"kind":"Name","value":"createdBy"}},{"kind":"Field","name":{"kind":"Name","value":"error"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}}]}}]} as unknown as DocumentNode<CompetitorAnalysesQuery, CompetitorAnalysesQueryVariables>;
export const CompetitorAnalysisDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"CompetitorAnalysis"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"id"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"Int"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"competitorAnalysis"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"id"},"value":{"kind":"Variable","name":{"kind":"Name","value":"id"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"CompetitorAnalysisCore"}},{"kind":"Field","name":{"kind":"Name","value":"competitors"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"CompetitorFull"}}]}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"ProductCore"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Product"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"slug"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"url"}},{"kind":"Field","name":{"kind":"Name","value":"domain"}},{"kind":"Field","name":{"kind":"Name","value":"description"}},{"kind":"Field","name":{"kind":"Name","value":"highlights"}},{"kind":"Field","name":{"kind":"Name","value":"icpAnalysis"}},{"kind":"Field","name":{"kind":"Name","value":"icpAnalyzedAt"}},{"kind":"Field","name":{"kind":"Name","value":"pricingAnalysis"}},{"kind":"Field","name":{"kind":"Name","value":"pricingAnalyzedAt"}},{"kind":"Field","name":{"kind":"Name","value":"gtmAnalysis"}},{"kind":"Field","name":{"kind":"Name","value":"gtmAnalyzedAt"}},{"kind":"Field","name":{"kind":"Name","value":"intelReport"}},{"kind":"Field","name":{"kind":"Name","value":"intelReportAt"}},{"kind":"Field","name":{"kind":"Name","value":"positioningAnalysis"}},{"kind":"Field","name":{"kind":"Name","value":"publishedAt"}},{"kind":"Field","name":{"kind":"Name","value":"createdBy"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"CompetitorCore"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Competitor"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"analysisId"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"url"}},{"kind":"Field","name":{"kind":"Name","value":"domain"}},{"kind":"Field","name":{"kind":"Name","value":"logoUrl"}},{"kind":"Field","name":{"kind":"Name","value":"description"}},{"kind":"Field","name":{"kind":"Name","value":"positioningHeadline"}},{"kind":"Field","name":{"kind":"Name","value":"positioningTagline"}},{"kind":"Field","name":{"kind":"Name","value":"targetAudience"}},{"kind":"Field","name":{"kind":"Name","value":"status"}},{"kind":"Field","name":{"kind":"Name","value":"scrapedAt"}},{"kind":"Field","name":{"kind":"Name","value":"scrapeError"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"PricingTierCore"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"PricingTier"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"tierName"}},{"kind":"Field","name":{"kind":"Name","value":"monthlyPriceUsd"}},{"kind":"Field","name":{"kind":"Name","value":"annualPriceUsd"}},{"kind":"Field","name":{"kind":"Name","value":"seatPriceUsd"}},{"kind":"Field","name":{"kind":"Name","value":"currency"}},{"kind":"Field","name":{"kind":"Name","value":"includedLimits"}},{"kind":"Field","name":{"kind":"Name","value":"isCustomQuote"}},{"kind":"Field","name":{"kind":"Name","value":"sortOrder"}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"CompetitorFeatureCore"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"CompetitorFeature"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"tierName"}},{"kind":"Field","name":{"kind":"Name","value":"featureText"}},{"kind":"Field","name":{"kind":"Name","value":"category"}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"CompetitorIntegrationCore"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"CompetitorIntegration"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"integrationName"}},{"kind":"Field","name":{"kind":"Name","value":"integrationUrl"}},{"kind":"Field","name":{"kind":"Name","value":"category"}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"CompetitorAnalysisCore"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"CompetitorAnalysis"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"product"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"ProductCore"}}]}},{"kind":"Field","name":{"kind":"Name","value":"status"}},{"kind":"Field","name":{"kind":"Name","value":"createdBy"}},{"kind":"Field","name":{"kind":"Name","value":"error"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"CompetitorFull"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Competitor"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"CompetitorCore"}},{"kind":"Field","name":{"kind":"Name","value":"pricingTiers"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"PricingTierCore"}}]}},{"kind":"Field","name":{"kind":"Name","value":"features"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"CompetitorFeatureCore"}}]}},{"kind":"Field","name":{"kind":"Name","value":"integrations"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"CompetitorIntegrationCore"}}]}}]}}]} as unknown as DocumentNode<CompetitorAnalysisQuery, CompetitorAnalysisQueryVariables>;
export const CreateCompetitorAnalysisDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"CreateCompetitorAnalysis"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"productId"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"Int"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"createCompetitorAnalysis"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"productId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"productId"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"CompetitorAnalysisCore"}},{"kind":"Field","name":{"kind":"Name","value":"competitors"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"CompetitorCore"}}]}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"ProductCore"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Product"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"slug"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"url"}},{"kind":"Field","name":{"kind":"Name","value":"domain"}},{"kind":"Field","name":{"kind":"Name","value":"description"}},{"kind":"Field","name":{"kind":"Name","value":"highlights"}},{"kind":"Field","name":{"kind":"Name","value":"icpAnalysis"}},{"kind":"Field","name":{"kind":"Name","value":"icpAnalyzedAt"}},{"kind":"Field","name":{"kind":"Name","value":"pricingAnalysis"}},{"kind":"Field","name":{"kind":"Name","value":"pricingAnalyzedAt"}},{"kind":"Field","name":{"kind":"Name","value":"gtmAnalysis"}},{"kind":"Field","name":{"kind":"Name","value":"gtmAnalyzedAt"}},{"kind":"Field","name":{"kind":"Name","value":"intelReport"}},{"kind":"Field","name":{"kind":"Name","value":"intelReportAt"}},{"kind":"Field","name":{"kind":"Name","value":"positioningAnalysis"}},{"kind":"Field","name":{"kind":"Name","value":"publishedAt"}},{"kind":"Field","name":{"kind":"Name","value":"createdBy"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"CompetitorAnalysisCore"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"CompetitorAnalysis"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"product"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"ProductCore"}}]}},{"kind":"Field","name":{"kind":"Name","value":"status"}},{"kind":"Field","name":{"kind":"Name","value":"createdBy"}},{"kind":"Field","name":{"kind":"Name","value":"error"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"CompetitorCore"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Competitor"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"analysisId"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"url"}},{"kind":"Field","name":{"kind":"Name","value":"domain"}},{"kind":"Field","name":{"kind":"Name","value":"logoUrl"}},{"kind":"Field","name":{"kind":"Name","value":"description"}},{"kind":"Field","name":{"kind":"Name","value":"positioningHeadline"}},{"kind":"Field","name":{"kind":"Name","value":"positioningTagline"}},{"kind":"Field","name":{"kind":"Name","value":"targetAudience"}},{"kind":"Field","name":{"kind":"Name","value":"status"}},{"kind":"Field","name":{"kind":"Name","value":"scrapedAt"}},{"kind":"Field","name":{"kind":"Name","value":"scrapeError"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}}]}}]} as unknown as DocumentNode<CreateCompetitorAnalysisMutation, CreateCompetitorAnalysisMutationVariables>;
export const ApproveCompetitorsDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"ApproveCompetitors"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"analysisId"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"Int"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"competitors"}},"type":{"kind":"NonNullType","type":{"kind":"ListType","type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"CompetitorInput"}}}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"approveCompetitors"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"analysisId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"analysisId"}}},{"kind":"Argument","name":{"kind":"Name","value":"competitors"},"value":{"kind":"Variable","name":{"kind":"Name","value":"competitors"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"CompetitorAnalysisCore"}},{"kind":"Field","name":{"kind":"Name","value":"competitors"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"CompetitorCore"}}]}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"ProductCore"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Product"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"slug"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"url"}},{"kind":"Field","name":{"kind":"Name","value":"domain"}},{"kind":"Field","name":{"kind":"Name","value":"description"}},{"kind":"Field","name":{"kind":"Name","value":"highlights"}},{"kind":"Field","name":{"kind":"Name","value":"icpAnalysis"}},{"kind":"Field","name":{"kind":"Name","value":"icpAnalyzedAt"}},{"kind":"Field","name":{"kind":"Name","value":"pricingAnalysis"}},{"kind":"Field","name":{"kind":"Name","value":"pricingAnalyzedAt"}},{"kind":"Field","name":{"kind":"Name","value":"gtmAnalysis"}},{"kind":"Field","name":{"kind":"Name","value":"gtmAnalyzedAt"}},{"kind":"Field","name":{"kind":"Name","value":"intelReport"}},{"kind":"Field","name":{"kind":"Name","value":"intelReportAt"}},{"kind":"Field","name":{"kind":"Name","value":"positioningAnalysis"}},{"kind":"Field","name":{"kind":"Name","value":"publishedAt"}},{"kind":"Field","name":{"kind":"Name","value":"createdBy"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"CompetitorAnalysisCore"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"CompetitorAnalysis"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"product"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"ProductCore"}}]}},{"kind":"Field","name":{"kind":"Name","value":"status"}},{"kind":"Field","name":{"kind":"Name","value":"createdBy"}},{"kind":"Field","name":{"kind":"Name","value":"error"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"CompetitorCore"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Competitor"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"analysisId"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"url"}},{"kind":"Field","name":{"kind":"Name","value":"domain"}},{"kind":"Field","name":{"kind":"Name","value":"logoUrl"}},{"kind":"Field","name":{"kind":"Name","value":"description"}},{"kind":"Field","name":{"kind":"Name","value":"positioningHeadline"}},{"kind":"Field","name":{"kind":"Name","value":"positioningTagline"}},{"kind":"Field","name":{"kind":"Name","value":"targetAudience"}},{"kind":"Field","name":{"kind":"Name","value":"status"}},{"kind":"Field","name":{"kind":"Name","value":"scrapedAt"}},{"kind":"Field","name":{"kind":"Name","value":"scrapeError"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}}]}}]} as unknown as DocumentNode<ApproveCompetitorsMutation, ApproveCompetitorsMutationVariables>;
export const RescrapeCompetitorDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"RescrapeCompetitor"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"competitorId"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"Int"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"rescrapeCompetitor"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"competitorId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"competitorId"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"CompetitorFull"}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"CompetitorCore"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Competitor"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"analysisId"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"url"}},{"kind":"Field","name":{"kind":"Name","value":"domain"}},{"kind":"Field","name":{"kind":"Name","value":"logoUrl"}},{"kind":"Field","name":{"kind":"Name","value":"description"}},{"kind":"Field","name":{"kind":"Name","value":"positioningHeadline"}},{"kind":"Field","name":{"kind":"Name","value":"positioningTagline"}},{"kind":"Field","name":{"kind":"Name","value":"targetAudience"}},{"kind":"Field","name":{"kind":"Name","value":"status"}},{"kind":"Field","name":{"kind":"Name","value":"scrapedAt"}},{"kind":"Field","name":{"kind":"Name","value":"scrapeError"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"PricingTierCore"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"PricingTier"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"tierName"}},{"kind":"Field","name":{"kind":"Name","value":"monthlyPriceUsd"}},{"kind":"Field","name":{"kind":"Name","value":"annualPriceUsd"}},{"kind":"Field","name":{"kind":"Name","value":"seatPriceUsd"}},{"kind":"Field","name":{"kind":"Name","value":"currency"}},{"kind":"Field","name":{"kind":"Name","value":"includedLimits"}},{"kind":"Field","name":{"kind":"Name","value":"isCustomQuote"}},{"kind":"Field","name":{"kind":"Name","value":"sortOrder"}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"CompetitorFeatureCore"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"CompetitorFeature"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"tierName"}},{"kind":"Field","name":{"kind":"Name","value":"featureText"}},{"kind":"Field","name":{"kind":"Name","value":"category"}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"CompetitorIntegrationCore"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"CompetitorIntegration"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"integrationName"}},{"kind":"Field","name":{"kind":"Name","value":"integrationUrl"}},{"kind":"Field","name":{"kind":"Name","value":"category"}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"CompetitorFull"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Competitor"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"CompetitorCore"}},{"kind":"Field","name":{"kind":"Name","value":"pricingTiers"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"PricingTierCore"}}]}},{"kind":"Field","name":{"kind":"Name","value":"features"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"CompetitorFeatureCore"}}]}},{"kind":"Field","name":{"kind":"Name","value":"integrations"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"CompetitorIntegrationCore"}}]}}]}}]} as unknown as DocumentNode<RescrapeCompetitorMutation, RescrapeCompetitorMutationVariables>;
export const DeleteCompetitorAnalysisDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"DeleteCompetitorAnalysis"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"id"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"Int"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"deleteCompetitorAnalysis"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"id"},"value":{"kind":"Variable","name":{"kind":"Name","value":"id"}}}]}]}}]} as unknown as DocumentNode<DeleteCompetitorAnalysisMutation, DeleteCompetitorAnalysisMutationVariables>;
export const ProductCompetitorsBySlugDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"ProductCompetitorsBySlug"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"slug"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"productBySlug"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"slug"},"value":{"kind":"Variable","name":{"kind":"Name","value":"slug"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"ProductCore"}},{"kind":"Field","name":{"kind":"Name","value":"pricingAnalysis"}},{"kind":"Field","name":{"kind":"Name","value":"positioningAnalysis"}},{"kind":"Field","name":{"kind":"Name","value":"pricingAnalyzedAt"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}},{"kind":"Field","name":{"kind":"Name","value":"latestCompetitorAnalysis"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"CompetitorAnalysisCore"}},{"kind":"Field","name":{"kind":"Name","value":"competitors"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"CompetitorFull"}}]}}]}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"ProductCore"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Product"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"slug"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"url"}},{"kind":"Field","name":{"kind":"Name","value":"domain"}},{"kind":"Field","name":{"kind":"Name","value":"description"}},{"kind":"Field","name":{"kind":"Name","value":"highlights"}},{"kind":"Field","name":{"kind":"Name","value":"icpAnalysis"}},{"kind":"Field","name":{"kind":"Name","value":"icpAnalyzedAt"}},{"kind":"Field","name":{"kind":"Name","value":"pricingAnalysis"}},{"kind":"Field","name":{"kind":"Name","value":"pricingAnalyzedAt"}},{"kind":"Field","name":{"kind":"Name","value":"gtmAnalysis"}},{"kind":"Field","name":{"kind":"Name","value":"gtmAnalyzedAt"}},{"kind":"Field","name":{"kind":"Name","value":"intelReport"}},{"kind":"Field","name":{"kind":"Name","value":"intelReportAt"}},{"kind":"Field","name":{"kind":"Name","value":"positioningAnalysis"}},{"kind":"Field","name":{"kind":"Name","value":"publishedAt"}},{"kind":"Field","name":{"kind":"Name","value":"createdBy"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"CompetitorCore"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Competitor"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"analysisId"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"url"}},{"kind":"Field","name":{"kind":"Name","value":"domain"}},{"kind":"Field","name":{"kind":"Name","value":"logoUrl"}},{"kind":"Field","name":{"kind":"Name","value":"description"}},{"kind":"Field","name":{"kind":"Name","value":"positioningHeadline"}},{"kind":"Field","name":{"kind":"Name","value":"positioningTagline"}},{"kind":"Field","name":{"kind":"Name","value":"targetAudience"}},{"kind":"Field","name":{"kind":"Name","value":"status"}},{"kind":"Field","name":{"kind":"Name","value":"scrapedAt"}},{"kind":"Field","name":{"kind":"Name","value":"scrapeError"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"PricingTierCore"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"PricingTier"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"tierName"}},{"kind":"Field","name":{"kind":"Name","value":"monthlyPriceUsd"}},{"kind":"Field","name":{"kind":"Name","value":"annualPriceUsd"}},{"kind":"Field","name":{"kind":"Name","value":"seatPriceUsd"}},{"kind":"Field","name":{"kind":"Name","value":"currency"}},{"kind":"Field","name":{"kind":"Name","value":"includedLimits"}},{"kind":"Field","name":{"kind":"Name","value":"isCustomQuote"}},{"kind":"Field","name":{"kind":"Name","value":"sortOrder"}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"CompetitorFeatureCore"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"CompetitorFeature"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"tierName"}},{"kind":"Field","name":{"kind":"Name","value":"featureText"}},{"kind":"Field","name":{"kind":"Name","value":"category"}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"CompetitorIntegrationCore"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"CompetitorIntegration"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"integrationName"}},{"kind":"Field","name":{"kind":"Name","value":"integrationUrl"}},{"kind":"Field","name":{"kind":"Name","value":"category"}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"CompetitorAnalysisCore"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"CompetitorAnalysis"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"product"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"ProductCore"}}]}},{"kind":"Field","name":{"kind":"Name","value":"status"}},{"kind":"Field","name":{"kind":"Name","value":"createdBy"}},{"kind":"Field","name":{"kind":"Name","value":"error"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"CompetitorFull"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Competitor"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"CompetitorCore"}},{"kind":"Field","name":{"kind":"Name","value":"pricingTiers"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"PricingTierCore"}}]}},{"kind":"Field","name":{"kind":"Name","value":"features"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"CompetitorFeatureCore"}}]}},{"kind":"Field","name":{"kind":"Name","value":"integrations"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"CompetitorIntegrationCore"}}]}}]}}]} as unknown as DocumentNode<ProductCompetitorsBySlugQuery, ProductCompetitorsBySlugQueryVariables>;
export const GetContactDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"GetContact"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"id"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"Int"}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"slug"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"contact"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"id"},"value":{"kind":"Variable","name":{"kind":"Name","value":"id"}}},{"kind":"Argument","name":{"kind":"Name","value":"slug"},"value":{"kind":"Variable","name":{"kind":"Name","value":"slug"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"slug"}},{"kind":"Field","name":{"kind":"Name","value":"firstName"}},{"kind":"Field","name":{"kind":"Name","value":"lastName"}},{"kind":"Field","name":{"kind":"Name","value":"email"}},{"kind":"Field","name":{"kind":"Name","value":"emails"}},{"kind":"Field","name":{"kind":"Name","value":"bouncedEmails"}},{"kind":"Field","name":{"kind":"Name","value":"linkedinUrl"}},{"kind":"Field","name":{"kind":"Name","value":"company"}},{"kind":"Field","name":{"kind":"Name","value":"companyId"}},{"kind":"Field","name":{"kind":"Name","value":"position"}},{"kind":"Field","name":{"kind":"Name","value":"emailVerified"}},{"kind":"Field","name":{"kind":"Name","value":"doNotContact"}},{"kind":"Field","name":{"kind":"Name","value":"githubHandle"}},{"kind":"Field","name":{"kind":"Name","value":"telegramHandle"}},{"kind":"Field","name":{"kind":"Name","value":"tags"}},{"kind":"Field","name":{"kind":"Name","value":"notes"}},{"kind":"Field","name":{"kind":"Name","value":"forwardingAlias"}},{"kind":"Field","name":{"kind":"Name","value":"forwardingAliasRuleId"}},{"kind":"Field","name":{"kind":"Name","value":"nbStatus"}},{"kind":"Field","name":{"kind":"Name","value":"nbResult"}},{"kind":"Field","name":{"kind":"Name","value":"nbFlags"}},{"kind":"Field","name":{"kind":"Name","value":"nbSuggestedCorrection"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}},{"kind":"Field","name":{"kind":"Name","value":"aiProfile"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"trigger"}},{"kind":"Field","name":{"kind":"Name","value":"enrichedAt"}},{"kind":"Field","name":{"kind":"Name","value":"linkedinHeadline"}},{"kind":"Field","name":{"kind":"Name","value":"linkedinBio"}},{"kind":"Field","name":{"kind":"Name","value":"specialization"}},{"kind":"Field","name":{"kind":"Name","value":"skills"}},{"kind":"Field","name":{"kind":"Name","value":"researchAreas"}},{"kind":"Field","name":{"kind":"Name","value":"experienceLevel"}},{"kind":"Field","name":{"kind":"Name","value":"synthesisConfidence"}},{"kind":"Field","name":{"kind":"Name","value":"synthesisRationale"}},{"kind":"Field","name":{"kind":"Name","value":"githubBio"}},{"kind":"Field","name":{"kind":"Name","value":"githubTopLanguages"}},{"kind":"Field","name":{"kind":"Name","value":"githubTotalStars"}},{"kind":"Field","name":{"kind":"Name","value":"githubAiRepos"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"description"}},{"kind":"Field","name":{"kind":"Name","value":"stars"}},{"kind":"Field","name":{"kind":"Name","value":"topics"}}]}},{"kind":"Field","name":{"kind":"Name","value":"workExperience"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"company"}},{"kind":"Field","name":{"kind":"Name","value":"companyLogo"}},{"kind":"Field","name":{"kind":"Name","value":"title"}},{"kind":"Field","name":{"kind":"Name","value":"employmentType"}},{"kind":"Field","name":{"kind":"Name","value":"startDate"}},{"kind":"Field","name":{"kind":"Name","value":"endDate"}},{"kind":"Field","name":{"kind":"Name","value":"duration"}},{"kind":"Field","name":{"kind":"Name","value":"location"}},{"kind":"Field","name":{"kind":"Name","value":"description"}},{"kind":"Field","name":{"kind":"Name","value":"skills"}}]}}]}}]}}]}}]} as unknown as DocumentNode<GetContactQuery, GetContactQueryVariables>;
export const UpdateContactDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"UpdateContact"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"id"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"Int"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"input"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"UpdateContactInput"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"updateContact"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"id"},"value":{"kind":"Variable","name":{"kind":"Name","value":"id"}}},{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"Variable","name":{"kind":"Name","value":"input"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"firstName"}},{"kind":"Field","name":{"kind":"Name","value":"lastName"}},{"kind":"Field","name":{"kind":"Name","value":"email"}},{"kind":"Field","name":{"kind":"Name","value":"emails"}},{"kind":"Field","name":{"kind":"Name","value":"linkedinUrl"}},{"kind":"Field","name":{"kind":"Name","value":"position"}},{"kind":"Field","name":{"kind":"Name","value":"githubHandle"}},{"kind":"Field","name":{"kind":"Name","value":"telegramHandle"}},{"kind":"Field","name":{"kind":"Name","value":"doNotContact"}},{"kind":"Field","name":{"kind":"Name","value":"tags"}},{"kind":"Field","name":{"kind":"Name","value":"emailVerified"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}}]}}]}}]} as unknown as DocumentNode<UpdateContactMutation, UpdateContactMutationVariables>;
export const DeleteContactDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"DeleteContact"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"id"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"Int"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"deleteContact"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"id"},"value":{"kind":"Variable","name":{"kind":"Name","value":"id"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"success"}},{"kind":"Field","name":{"kind":"Name","value":"message"}}]}}]}}]} as unknown as DocumentNode<DeleteContactMutation, DeleteContactMutationVariables>;
export const GetResendEmailDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"GetResendEmail"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"resendId"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"resendEmail"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"resendId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"resendId"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"from"}},{"kind":"Field","name":{"kind":"Name","value":"to"}},{"kind":"Field","name":{"kind":"Name","value":"subject"}},{"kind":"Field","name":{"kind":"Name","value":"text"}},{"kind":"Field","name":{"kind":"Name","value":"html"}},{"kind":"Field","name":{"kind":"Name","value":"lastEvent"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"scheduledAt"}},{"kind":"Field","name":{"kind":"Name","value":"cc"}},{"kind":"Field","name":{"kind":"Name","value":"bcc"}}]}}]}}]} as unknown as DocumentNode<GetResendEmailQuery, GetResendEmailQueryVariables>;
export const GetContactMessagesDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"GetContactMessages"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"contactId"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"Int"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"contactMessages"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"contactId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"contactId"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"channel"}},{"kind":"Field","name":{"kind":"Name","value":"direction"}},{"kind":"Field","name":{"kind":"Name","value":"contactId"}},{"kind":"Field","name":{"kind":"Name","value":"senderName"}},{"kind":"Field","name":{"kind":"Name","value":"senderProfileUrl"}},{"kind":"Field","name":{"kind":"Name","value":"content"}},{"kind":"Field","name":{"kind":"Name","value":"subject"}},{"kind":"Field","name":{"kind":"Name","value":"sentAt"}},{"kind":"Field","name":{"kind":"Name","value":"classification"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}}]}}]}}]} as unknown as DocumentNode<GetContactMessagesQuery, GetContactMessagesQueryVariables>;
export const GetContactOpportunitiesDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"GetContactOpportunities"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"contactId"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"Int"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"contactOpportunities"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"contactId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"contactId"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"title"}},{"kind":"Field","name":{"kind":"Name","value":"url"}},{"kind":"Field","name":{"kind":"Name","value":"source"}},{"kind":"Field","name":{"kind":"Name","value":"status"}},{"kind":"Field","name":{"kind":"Name","value":"rewardText"}},{"kind":"Field","name":{"kind":"Name","value":"rewardUsd"}},{"kind":"Field","name":{"kind":"Name","value":"score"}},{"kind":"Field","name":{"kind":"Name","value":"tags"}},{"kind":"Field","name":{"kind":"Name","value":"applied"}},{"kind":"Field","name":{"kind":"Name","value":"appliedAt"}},{"kind":"Field","name":{"kind":"Name","value":"applicationStatus"}},{"kind":"Field","name":{"kind":"Name","value":"companyName"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}}]}}]}}]} as unknown as DocumentNode<GetContactOpportunitiesQuery, GetContactOpportunitiesQueryVariables>;
export const GetContactEmailsDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"GetContactEmails"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"contactId"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"Int"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"contactEmails"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"contactId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"contactId"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"resendId"}},{"kind":"Field","name":{"kind":"Name","value":"fromEmail"}},{"kind":"Field","name":{"kind":"Name","value":"toEmails"}},{"kind":"Field","name":{"kind":"Name","value":"subject"}},{"kind":"Field","name":{"kind":"Name","value":"textContent"}},{"kind":"Field","name":{"kind":"Name","value":"status"}},{"kind":"Field","name":{"kind":"Name","value":"sentAt"}},{"kind":"Field","name":{"kind":"Name","value":"recipientName"}},{"kind":"Field","name":{"kind":"Name","value":"replyReceived"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}}]}},{"kind":"Field","name":{"kind":"Name","value":"contactReceivedEmails"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"contactId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"contactId"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"fromEmail"}},{"kind":"Field","name":{"kind":"Name","value":"subject"}},{"kind":"Field","name":{"kind":"Name","value":"textContent"}},{"kind":"Field","name":{"kind":"Name","value":"classification"}},{"kind":"Field","name":{"kind":"Name","value":"classificationConfidence"}},{"kind":"Field","name":{"kind":"Name","value":"receivedAt"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}}]}}]}}]} as unknown as DocumentNode<GetContactEmailsQuery, GetContactEmailsQueryVariables>;
export const GetCompanyContactEmailsDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"GetCompanyContactEmails"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"companyId"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"Int"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"companyContactEmails"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"companyId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"companyId"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"contactId"}},{"kind":"Field","name":{"kind":"Name","value":"resendId"}},{"kind":"Field","name":{"kind":"Name","value":"fromEmail"}},{"kind":"Field","name":{"kind":"Name","value":"toEmails"}},{"kind":"Field","name":{"kind":"Name","value":"subject"}},{"kind":"Field","name":{"kind":"Name","value":"textContent"}},{"kind":"Field","name":{"kind":"Name","value":"status"}},{"kind":"Field","name":{"kind":"Name","value":"sentAt"}},{"kind":"Field","name":{"kind":"Name","value":"scheduledAt"}},{"kind":"Field","name":{"kind":"Name","value":"recipientName"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}},{"kind":"Field","name":{"kind":"Name","value":"contactFirstName"}},{"kind":"Field","name":{"kind":"Name","value":"contactLastName"}},{"kind":"Field","name":{"kind":"Name","value":"contactPosition"}},{"kind":"Field","name":{"kind":"Name","value":"sequenceType"}},{"kind":"Field","name":{"kind":"Name","value":"sequenceNumber"}},{"kind":"Field","name":{"kind":"Name","value":"replyReceived"}},{"kind":"Field","name":{"kind":"Name","value":"followupStatus"}}]}}]}}]} as unknown as DocumentNode<GetCompanyContactEmailsQuery, GetCompanyContactEmailsQueryVariables>;
export const SyncResendEmailsDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"SyncResendEmails"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"companyId"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"Int"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"syncResendEmails"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"companyId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"companyId"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"success"}},{"kind":"Field","name":{"kind":"Name","value":"updatedCount"}},{"kind":"Field","name":{"kind":"Name","value":"skippedCount"}},{"kind":"Field","name":{"kind":"Name","value":"totalCount"}},{"kind":"Field","name":{"kind":"Name","value":"error"}}]}}]}}]} as unknown as DocumentNode<SyncResendEmailsMutation, SyncResendEmailsMutationVariables>;
export const ImportResendEmailsDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"ImportResendEmails"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"maxEmails"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"Int"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"importResendEmails"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"maxEmails"},"value":{"kind":"Variable","name":{"kind":"Name","value":"maxEmails"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"success"}},{"kind":"Field","name":{"kind":"Name","value":"totalFetched"}},{"kind":"Field","name":{"kind":"Name","value":"newCount"}},{"kind":"Field","name":{"kind":"Name","value":"updatedCount"}},{"kind":"Field","name":{"kind":"Name","value":"skippedCount"}},{"kind":"Field","name":{"kind":"Name","value":"errorCount"}},{"kind":"Field","name":{"kind":"Name","value":"contactMatchCount"}},{"kind":"Field","name":{"kind":"Name","value":"companyMatchCount"}},{"kind":"Field","name":{"kind":"Name","value":"durationMs"}},{"kind":"Field","name":{"kind":"Name","value":"error"}}]}}]}}]} as unknown as DocumentNode<ImportResendEmailsMutation, ImportResendEmailsMutationVariables>;
export const CancelCompanyEmailsDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"CancelCompanyEmails"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"companyId"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"Int"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"cancelCompanyEmails"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"companyId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"companyId"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"success"}},{"kind":"Field","name":{"kind":"Name","value":"message"}},{"kind":"Field","name":{"kind":"Name","value":"cancelledCount"}},{"kind":"Field","name":{"kind":"Name","value":"failedCount"}}]}}]}}]} as unknown as DocumentNode<CancelCompanyEmailsMutation, CancelCompanyEmailsMutationVariables>;
export const SendScheduledEmailNowDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"SendScheduledEmailNow"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"resendId"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"sendScheduledEmailNow"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"resendId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"resendId"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"success"}},{"kind":"Field","name":{"kind":"Name","value":"resendId"}},{"kind":"Field","name":{"kind":"Name","value":"error"}}]}}]}}]} as unknown as DocumentNode<SendScheduledEmailNowMutation, SendScheduledEmailNowMutationVariables>;
export const CancelScheduledEmailDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"CancelScheduledEmail"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"resendId"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"cancelScheduledEmail"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"resendId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"resendId"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"success"}},{"kind":"Field","name":{"kind":"Name","value":"error"}}]}}]}}]} as unknown as DocumentNode<CancelScheduledEmailMutation, CancelScheduledEmailMutationVariables>;
export const GetContactsDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"GetContacts"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"companyId"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"Int"}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"search"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"tag"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"limit"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"Int"}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"offset"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"Int"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"contacts"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"companyId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"companyId"}}},{"kind":"Argument","name":{"kind":"Name","value":"search"},"value":{"kind":"Variable","name":{"kind":"Name","value":"search"}}},{"kind":"Argument","name":{"kind":"Name","value":"tag"},"value":{"kind":"Variable","name":{"kind":"Name","value":"tag"}}},{"kind":"Argument","name":{"kind":"Name","value":"limit"},"value":{"kind":"Variable","name":{"kind":"Name","value":"limit"}}},{"kind":"Argument","name":{"kind":"Name","value":"offset"},"value":{"kind":"Variable","name":{"kind":"Name","value":"offset"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"contacts"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"slug"}},{"kind":"Field","name":{"kind":"Name","value":"firstName"}},{"kind":"Field","name":{"kind":"Name","value":"lastName"}},{"kind":"Field","name":{"kind":"Name","value":"email"}},{"kind":"Field","name":{"kind":"Name","value":"bouncedEmails"}},{"kind":"Field","name":{"kind":"Name","value":"linkedinUrl"}},{"kind":"Field","name":{"kind":"Name","value":"position"}},{"kind":"Field","name":{"kind":"Name","value":"company"}},{"kind":"Field","name":{"kind":"Name","value":"companyId"}},{"kind":"Field","name":{"kind":"Name","value":"githubHandle"}},{"kind":"Field","name":{"kind":"Name","value":"telegramHandle"}},{"kind":"Field","name":{"kind":"Name","value":"emailVerified"}},{"kind":"Field","name":{"kind":"Name","value":"doNotContact"}},{"kind":"Field","name":{"kind":"Name","value":"nbResult"}},{"kind":"Field","name":{"kind":"Name","value":"tags"}},{"kind":"Field","name":{"kind":"Name","value":"notes"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"seniority"}},{"kind":"Field","name":{"kind":"Name","value":"department"}},{"kind":"Field","name":{"kind":"Name","value":"isDecisionMaker"}},{"kind":"Field","name":{"kind":"Name","value":"authorityScore"}},{"kind":"Field","name":{"kind":"Name","value":"nextTouchScore"}},{"kind":"Field","name":{"kind":"Name","value":"lastContactedAt"}}]}},{"kind":"Field","name":{"kind":"Name","value":"totalCount"}}]}}]}}]} as unknown as DocumentNode<GetContactsQuery, GetContactsQueryVariables>;
export const ImportContactsDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"ImportContacts"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"contacts"}},"type":{"kind":"NonNullType","type":{"kind":"ListType","type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ContactInput"}}}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"importContacts"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"contacts"},"value":{"kind":"Variable","name":{"kind":"Name","value":"contacts"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"success"}},{"kind":"Field","name":{"kind":"Name","value":"imported"}},{"kind":"Field","name":{"kind":"Name","value":"failed"}},{"kind":"Field","name":{"kind":"Name","value":"errors"}}]}}]}}]} as unknown as DocumentNode<ImportContactsMutation, ImportContactsMutationVariables>;
export const FindContactEmailDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"FindContactEmail"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"contactId"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"Int"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"findContactEmail"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"contactId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"contactId"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"success"}},{"kind":"Field","name":{"kind":"Name","value":"emailFound"}},{"kind":"Field","name":{"kind":"Name","value":"email"}},{"kind":"Field","name":{"kind":"Name","value":"verified"}},{"kind":"Field","name":{"kind":"Name","value":"message"}},{"kind":"Field","name":{"kind":"Name","value":"candidatesTried"}}]}}]}}]} as unknown as DocumentNode<FindContactEmailMutation, FindContactEmailMutationVariables>;
export const FindCompanyEmailsDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"FindCompanyEmails"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"companyId"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"Int"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"findCompanyEmails"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"companyId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"companyId"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"success"}},{"kind":"Field","name":{"kind":"Name","value":"message"}},{"kind":"Field","name":{"kind":"Name","value":"companiesProcessed"}},{"kind":"Field","name":{"kind":"Name","value":"totalContactsProcessed"}},{"kind":"Field","name":{"kind":"Name","value":"totalEmailsFound"}},{"kind":"Field","name":{"kind":"Name","value":"errors"}}]}}]}}]} as unknown as DocumentNode<FindCompanyEmailsMutation, FindCompanyEmailsMutationVariables>;
export const EnhanceAllContactsDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"EnhanceAllContacts"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"enhanceAllContacts"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"success"}},{"kind":"Field","name":{"kind":"Name","value":"message"}},{"kind":"Field","name":{"kind":"Name","value":"companiesProcessed"}},{"kind":"Field","name":{"kind":"Name","value":"totalContactsProcessed"}},{"kind":"Field","name":{"kind":"Name","value":"totalEmailsFound"}},{"kind":"Field","name":{"kind":"Name","value":"errors"}}]}}]}}]} as unknown as DocumentNode<EnhanceAllContactsMutation, EnhanceAllContactsMutationVariables>;
export const ApplyEmailPatternDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"ApplyEmailPattern"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"companyId"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"Int"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"applyEmailPattern"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"companyId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"companyId"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"success"}},{"kind":"Field","name":{"kind":"Name","value":"message"}},{"kind":"Field","name":{"kind":"Name","value":"contactsUpdated"}},{"kind":"Field","name":{"kind":"Name","value":"pattern"}},{"kind":"Field","name":{"kind":"Name","value":"contacts"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"email"}},{"kind":"Field","name":{"kind":"Name","value":"emailVerified"}}]}}]}}]}}]} as unknown as DocumentNode<ApplyEmailPatternMutation, ApplyEmailPatternMutationVariables>;
export const UnverifyCompanyContactsDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"UnverifyCompanyContacts"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"companyId"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"Int"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"unverifyCompanyContacts"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"companyId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"companyId"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"success"}},{"kind":"Field","name":{"kind":"Name","value":"count"}}]}}]}}]} as unknown as DocumentNode<UnverifyCompanyContactsMutation, UnverifyCompanyContactsMutationVariables>;
export const CreateContactDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"CreateContact"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"input"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"CreateContactInput"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"createContact"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"Variable","name":{"kind":"Name","value":"input"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"slug"}},{"kind":"Field","name":{"kind":"Name","value":"firstName"}},{"kind":"Field","name":{"kind":"Name","value":"lastName"}},{"kind":"Field","name":{"kind":"Name","value":"email"}},{"kind":"Field","name":{"kind":"Name","value":"linkedinUrl"}},{"kind":"Field","name":{"kind":"Name","value":"position"}},{"kind":"Field","name":{"kind":"Name","value":"companyId"}},{"kind":"Field","name":{"kind":"Name","value":"githubHandle"}},{"kind":"Field","name":{"kind":"Name","value":"telegramHandle"}},{"kind":"Field","name":{"kind":"Name","value":"tags"}}]}}]}}]} as unknown as DocumentNode<CreateContactMutation, CreateContactMutationVariables>;
export const MergeDuplicateContactsDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"MergeDuplicateContacts"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"companyId"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"Int"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"mergeDuplicateContacts"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"companyId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"companyId"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"success"}},{"kind":"Field","name":{"kind":"Name","value":"message"}},{"kind":"Field","name":{"kind":"Name","value":"mergedCount"}},{"kind":"Field","name":{"kind":"Name","value":"removedCount"}}]}}]}}]} as unknown as DocumentNode<MergeDuplicateContactsMutation, MergeDuplicateContactsMutationVariables>;
export const MarkContactEmailVerifiedDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"MarkContactEmailVerified"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"contactId"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"Int"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"verified"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"Boolean"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"markContactEmailVerified"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"contactId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"contactId"}}},{"kind":"Argument","name":{"kind":"Name","value":"verified"},"value":{"kind":"Variable","name":{"kind":"Name","value":"verified"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"email"}},{"kind":"Field","name":{"kind":"Name","value":"emailVerified"}}]}}]}}]} as unknown as DocumentNode<MarkContactEmailVerifiedMutation, MarkContactEmailVerifiedMutationVariables>;
export const VerifyContactEmailDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"VerifyContactEmail"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"contactId"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"Int"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"verifyContactEmail"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"contactId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"contactId"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"success"}},{"kind":"Field","name":{"kind":"Name","value":"verified"}},{"kind":"Field","name":{"kind":"Name","value":"rawResult"}},{"kind":"Field","name":{"kind":"Name","value":"flags"}},{"kind":"Field","name":{"kind":"Name","value":"suggestedCorrection"}},{"kind":"Field","name":{"kind":"Name","value":"message"}}]}}]}}]} as unknown as DocumentNode<VerifyContactEmailMutation, VerifyContactEmailMutationVariables>;
export const GetEmailCampaignsDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"GetEmailCampaigns"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"status"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"limit"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"Int"}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"offset"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"Int"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"emailCampaigns"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"status"},"value":{"kind":"Variable","name":{"kind":"Name","value":"status"}}},{"kind":"Argument","name":{"kind":"Name","value":"limit"},"value":{"kind":"Variable","name":{"kind":"Name","value":"limit"}}},{"kind":"Argument","name":{"kind":"Name","value":"offset"},"value":{"kind":"Variable","name":{"kind":"Name","value":"offset"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"campaigns"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"companyId"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"status"}},{"kind":"Field","name":{"kind":"Name","value":"mode"}},{"kind":"Field","name":{"kind":"Name","value":"fromEmail"}},{"kind":"Field","name":{"kind":"Name","value":"totalRecipients"}},{"kind":"Field","name":{"kind":"Name","value":"emailsSent"}},{"kind":"Field","name":{"kind":"Name","value":"emailsScheduled"}},{"kind":"Field","name":{"kind":"Name","value":"emailsFailed"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}}]}},{"kind":"Field","name":{"kind":"Name","value":"totalCount"}}]}}]}}]} as unknown as DocumentNode<GetEmailCampaignsQuery, GetEmailCampaignsQueryVariables>;
export const GetEmailCampaignDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"GetEmailCampaign"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"id"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"emailCampaign"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"id"},"value":{"kind":"Variable","name":{"kind":"Name","value":"id"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"companyId"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"status"}},{"kind":"Field","name":{"kind":"Name","value":"sequence"}},{"kind":"Field","name":{"kind":"Name","value":"delayDays"}},{"kind":"Field","name":{"kind":"Name","value":"startAt"}},{"kind":"Field","name":{"kind":"Name","value":"mode"}},{"kind":"Field","name":{"kind":"Name","value":"fromEmail"}},{"kind":"Field","name":{"kind":"Name","value":"replyTo"}},{"kind":"Field","name":{"kind":"Name","value":"totalRecipients"}},{"kind":"Field","name":{"kind":"Name","value":"emailsSent"}},{"kind":"Field","name":{"kind":"Name","value":"emailsScheduled"}},{"kind":"Field","name":{"kind":"Name","value":"emailsFailed"}},{"kind":"Field","name":{"kind":"Name","value":"recipientEmails"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}}]}}]}}]} as unknown as DocumentNode<GetEmailCampaignQuery, GetEmailCampaignQueryVariables>;
export const CreateDraftCampaignDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"CreateDraftCampaign"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"input"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"CreateCampaignInput"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"createDraftCampaign"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"Variable","name":{"kind":"Name","value":"input"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"status"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}}]}}]}}]} as unknown as DocumentNode<CreateDraftCampaignMutation, CreateDraftCampaignMutationVariables>;
export const UpdateCampaignDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"UpdateCampaign"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"id"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"input"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"UpdateCampaignInput"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"updateCampaign"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"id"},"value":{"kind":"Variable","name":{"kind":"Name","value":"id"}}},{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"Variable","name":{"kind":"Name","value":"input"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"status"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}}]}}]}}]} as unknown as DocumentNode<UpdateCampaignMutation, UpdateCampaignMutationVariables>;
export const DeleteCampaignDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"DeleteCampaign"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"id"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"deleteCampaign"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"id"},"value":{"kind":"Variable","name":{"kind":"Name","value":"id"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"success"}},{"kind":"Field","name":{"kind":"Name","value":"message"}}]}}]}}]} as unknown as DocumentNode<DeleteCampaignMutation, DeleteCampaignMutationVariables>;
export const LaunchEmailCampaignDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"LaunchEmailCampaign"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"id"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"launchEmailCampaign"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"id"},"value":{"kind":"Variable","name":{"kind":"Name","value":"id"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"status"}},{"kind":"Field","name":{"kind":"Name","value":"emailsSent"}},{"kind":"Field","name":{"kind":"Name","value":"emailsScheduled"}},{"kind":"Field","name":{"kind":"Name","value":"emailsFailed"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}}]}}]}}]} as unknown as DocumentNode<LaunchEmailCampaignMutation, LaunchEmailCampaignMutationVariables>;
export const SendEmailDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"SendEmail"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"input"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"SendEmailInput"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"sendEmail"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"Variable","name":{"kind":"Name","value":"input"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"success"}},{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"error"}}]}}]}}]} as unknown as DocumentNode<SendEmailMutation, SendEmailMutationVariables>;
export const GenerateEmailDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"GenerateEmail"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"input"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"GenerateEmailInput"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"generateEmail"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"Variable","name":{"kind":"Name","value":"input"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"subject"}},{"kind":"Field","name":{"kind":"Name","value":"html"}},{"kind":"Field","name":{"kind":"Name","value":"text"}}]}}]}}]} as unknown as DocumentNode<GenerateEmailMutation, GenerateEmailMutationVariables>;
export const GenerateReplyDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"GenerateReply"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"input"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"GenerateReplyInput"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"generateReply"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"Variable","name":{"kind":"Name","value":"input"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"subject"}},{"kind":"Field","name":{"kind":"Name","value":"body"}}]}}]}}]} as unknown as DocumentNode<GenerateReplyMutation, GenerateReplyMutationVariables>;
export const GetEmailStatsDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"GetEmailStats"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"emailStats"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"sentToday"}},{"kind":"Field","name":{"kind":"Name","value":"sentThisWeek"}},{"kind":"Field","name":{"kind":"Name","value":"sentThisMonth"}},{"kind":"Field","name":{"kind":"Name","value":"scheduledToday"}},{"kind":"Field","name":{"kind":"Name","value":"scheduledFuture"}},{"kind":"Field","name":{"kind":"Name","value":"totalSent"}},{"kind":"Field","name":{"kind":"Name","value":"deliveredToday"}},{"kind":"Field","name":{"kind":"Name","value":"deliveredThisWeek"}},{"kind":"Field","name":{"kind":"Name","value":"deliveredThisMonth"}},{"kind":"Field","name":{"kind":"Name","value":"bouncedToday"}},{"kind":"Field","name":{"kind":"Name","value":"bouncedThisWeek"}},{"kind":"Field","name":{"kind":"Name","value":"bouncedThisMonth"}},{"kind":"Field","name":{"kind":"Name","value":"openedToday"}},{"kind":"Field","name":{"kind":"Name","value":"openedThisWeek"}},{"kind":"Field","name":{"kind":"Name","value":"openedThisMonth"}}]}}]}}]} as unknown as DocumentNode<GetEmailStatsQuery, GetEmailStatsQueryVariables>;
export const GetReceivedEmailsDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"GetReceivedEmails"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"limit"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"Int"}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"offset"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"Int"}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"archived"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"Boolean"}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"classification"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"receivedEmails"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"limit"},"value":{"kind":"Variable","name":{"kind":"Name","value":"limit"}}},{"kind":"Argument","name":{"kind":"Name","value":"offset"},"value":{"kind":"Variable","name":{"kind":"Name","value":"offset"}}},{"kind":"Argument","name":{"kind":"Name","value":"archived"},"value":{"kind":"Variable","name":{"kind":"Name","value":"archived"}}},{"kind":"Argument","name":{"kind":"Name","value":"classification"},"value":{"kind":"Variable","name":{"kind":"Name","value":"classification"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"emails"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"resendId"}},{"kind":"Field","name":{"kind":"Name","value":"fromEmail"}},{"kind":"Field","name":{"kind":"Name","value":"toEmails"}},{"kind":"Field","name":{"kind":"Name","value":"subject"}},{"kind":"Field","name":{"kind":"Name","value":"receivedAt"}},{"kind":"Field","name":{"kind":"Name","value":"archivedAt"}},{"kind":"Field","name":{"kind":"Name","value":"classification"}},{"kind":"Field","name":{"kind":"Name","value":"classificationConfidence"}},{"kind":"Field","name":{"kind":"Name","value":"matchedContactId"}},{"kind":"Field","name":{"kind":"Name","value":"textContent"}},{"kind":"Field","name":{"kind":"Name","value":"htmlContent"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}}]}},{"kind":"Field","name":{"kind":"Name","value":"totalCount"}}]}}]}}]} as unknown as DocumentNode<GetReceivedEmailsQuery, GetReceivedEmailsQueryVariables>;
export const GetReceivedEmailDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"GetReceivedEmail"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"id"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"Int"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"receivedEmail"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"id"},"value":{"kind":"Variable","name":{"kind":"Name","value":"id"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"resendId"}},{"kind":"Field","name":{"kind":"Name","value":"fromEmail"}},{"kind":"Field","name":{"kind":"Name","value":"toEmails"}},{"kind":"Field","name":{"kind":"Name","value":"ccEmails"}},{"kind":"Field","name":{"kind":"Name","value":"replyToEmails"}},{"kind":"Field","name":{"kind":"Name","value":"subject"}},{"kind":"Field","name":{"kind":"Name","value":"messageId"}},{"kind":"Field","name":{"kind":"Name","value":"htmlContent"}},{"kind":"Field","name":{"kind":"Name","value":"textContent"}},{"kind":"Field","name":{"kind":"Name","value":"attachments"}},{"kind":"Field","name":{"kind":"Name","value":"receivedAt"}},{"kind":"Field","name":{"kind":"Name","value":"archivedAt"}},{"kind":"Field","name":{"kind":"Name","value":"classification"}},{"kind":"Field","name":{"kind":"Name","value":"classificationConfidence"}},{"kind":"Field","name":{"kind":"Name","value":"classifiedAt"}},{"kind":"Field","name":{"kind":"Name","value":"matchedContactId"}},{"kind":"Field","name":{"kind":"Name","value":"matchedContact"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"firstName"}},{"kind":"Field","name":{"kind":"Name","value":"lastName"}},{"kind":"Field","name":{"kind":"Name","value":"forwardingAlias"}}]}},{"kind":"Field","name":{"kind":"Name","value":"matchedOutboundId"}},{"kind":"Field","name":{"kind":"Name","value":"sentReplies"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"resendId"}},{"kind":"Field","name":{"kind":"Name","value":"fromEmail"}},{"kind":"Field","name":{"kind":"Name","value":"toEmails"}},{"kind":"Field","name":{"kind":"Name","value":"subject"}},{"kind":"Field","name":{"kind":"Name","value":"textContent"}},{"kind":"Field","name":{"kind":"Name","value":"status"}},{"kind":"Field","name":{"kind":"Name","value":"sentAt"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}}]}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}}]}}]}}]} as unknown as DocumentNode<GetReceivedEmailQuery, GetReceivedEmailQueryVariables>;
export const ArchiveEmailDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"ArchiveEmail"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"id"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"Int"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"archiveEmail"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"id"},"value":{"kind":"Variable","name":{"kind":"Name","value":"id"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"success"}},{"kind":"Field","name":{"kind":"Name","value":"message"}}]}}]}}]} as unknown as DocumentNode<ArchiveEmailMutation, ArchiveEmailMutationVariables>;
export const UnarchiveEmailDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"UnarchiveEmail"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"id"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"Int"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"unarchiveEmail"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"id"},"value":{"kind":"Variable","name":{"kind":"Name","value":"id"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"success"}},{"kind":"Field","name":{"kind":"Name","value":"message"}}]}}]}}]} as unknown as DocumentNode<UnarchiveEmailMutation, UnarchiveEmailMutationVariables>;
export const PreviewEmailDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"PreviewEmail"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"input"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"PreviewEmailInput"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"previewEmail"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"Variable","name":{"kind":"Name","value":"input"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"htmlContent"}},{"kind":"Field","name":{"kind":"Name","value":"subject"}},{"kind":"Field","name":{"kind":"Name","value":"drySendResult"}}]}}]}}]} as unknown as DocumentNode<PreviewEmailMutation, PreviewEmailMutationVariables>;
export const SendOutreachEmailDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"SendOutreachEmail"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"input"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"SendOutreachEmailInput"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"sendOutreachEmail"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"Variable","name":{"kind":"Name","value":"input"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"success"}},{"kind":"Field","name":{"kind":"Name","value":"emailId"}},{"kind":"Field","name":{"kind":"Name","value":"subject"}},{"kind":"Field","name":{"kind":"Name","value":"error"}}]}}]}}]} as unknown as DocumentNode<SendOutreachEmailMutation, SendOutreachEmailMutationVariables>;
export const GetEmailsNeedingFollowUpDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"GetEmailsNeedingFollowUp"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"limit"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"Int"}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"offset"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"Int"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"emailsNeedingFollowUp"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"limit"},"value":{"kind":"Variable","name":{"kind":"Name","value":"limit"}}},{"kind":"Argument","name":{"kind":"Name","value":"offset"},"value":{"kind":"Variable","name":{"kind":"Name","value":"offset"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"emails"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"contactId"}},{"kind":"Field","name":{"kind":"Name","value":"resendId"}},{"kind":"Field","name":{"kind":"Name","value":"fromEmail"}},{"kind":"Field","name":{"kind":"Name","value":"toEmails"}},{"kind":"Field","name":{"kind":"Name","value":"subject"}},{"kind":"Field","name":{"kind":"Name","value":"status"}},{"kind":"Field","name":{"kind":"Name","value":"sentAt"}},{"kind":"Field","name":{"kind":"Name","value":"sequenceType"}},{"kind":"Field","name":{"kind":"Name","value":"sequenceNumber"}},{"kind":"Field","name":{"kind":"Name","value":"followupStatus"}},{"kind":"Field","name":{"kind":"Name","value":"companyId"}},{"kind":"Field","name":{"kind":"Name","value":"recipientName"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}}]}},{"kind":"Field","name":{"kind":"Name","value":"totalCount"}}]}}]}}]} as unknown as DocumentNode<GetEmailsNeedingFollowUpQuery, GetEmailsNeedingFollowUpQueryVariables>;
export const GetWebhookEventsDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"GetWebhookEvents"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"limit"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"Int"}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"offset"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"Int"}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"eventType"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"webhookEvents"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"limit"},"value":{"kind":"Variable","name":{"kind":"Name","value":"limit"}}},{"kind":"Argument","name":{"kind":"Name","value":"offset"},"value":{"kind":"Variable","name":{"kind":"Name","value":"offset"}}},{"kind":"Argument","name":{"kind":"Name","value":"eventType"},"value":{"kind":"Variable","name":{"kind":"Name","value":"eventType"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"events"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"eventType"}},{"kind":"Field","name":{"kind":"Name","value":"emailId"}},{"kind":"Field","name":{"kind":"Name","value":"fromEmail"}},{"kind":"Field","name":{"kind":"Name","value":"toEmails"}},{"kind":"Field","name":{"kind":"Name","value":"subject"}},{"kind":"Field","name":{"kind":"Name","value":"httpStatus"}},{"kind":"Field","name":{"kind":"Name","value":"error"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}}]}},{"kind":"Field","name":{"kind":"Name","value":"totalCount"}}]}}]}}]} as unknown as DocumentNode<GetWebhookEventsQuery, GetWebhookEventsQueryVariables>;
export const GetEmailTemplatesDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"GetEmailTemplates"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"category"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"limit"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"Int"}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"offset"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"Int"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"emailTemplates"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"category"},"value":{"kind":"Variable","name":{"kind":"Name","value":"category"}}},{"kind":"Argument","name":{"kind":"Name","value":"limit"},"value":{"kind":"Variable","name":{"kind":"Name","value":"limit"}}},{"kind":"Argument","name":{"kind":"Name","value":"offset"},"value":{"kind":"Variable","name":{"kind":"Name","value":"offset"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"templates"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"description"}},{"kind":"Field","name":{"kind":"Name","value":"subject"}},{"kind":"Field","name":{"kind":"Name","value":"category"}},{"kind":"Field","name":{"kind":"Name","value":"tags"}},{"kind":"Field","name":{"kind":"Name","value":"isActive"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}}]}},{"kind":"Field","name":{"kind":"Name","value":"totalCount"}}]}}]}}]} as unknown as DocumentNode<GetEmailTemplatesQuery, GetEmailTemplatesQueryVariables>;
export const GetEmailTemplateDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"GetEmailTemplate"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"id"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"Int"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"emailTemplate"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"id"},"value":{"kind":"Variable","name":{"kind":"Name","value":"id"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"description"}},{"kind":"Field","name":{"kind":"Name","value":"subject"}},{"kind":"Field","name":{"kind":"Name","value":"htmlContent"}},{"kind":"Field","name":{"kind":"Name","value":"textContent"}},{"kind":"Field","name":{"kind":"Name","value":"category"}},{"kind":"Field","name":{"kind":"Name","value":"tags"}},{"kind":"Field","name":{"kind":"Name","value":"variables"}},{"kind":"Field","name":{"kind":"Name","value":"isActive"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}}]}}]}}]} as unknown as DocumentNode<GetEmailTemplateQuery, GetEmailTemplateQueryVariables>;
export const CreateEmailTemplateDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"CreateEmailTemplate"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"input"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"CreateEmailTemplateInput"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"createEmailTemplate"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"Variable","name":{"kind":"Name","value":"input"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"subject"}},{"kind":"Field","name":{"kind":"Name","value":"category"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}}]}}]}}]} as unknown as DocumentNode<CreateEmailTemplateMutation, CreateEmailTemplateMutationVariables>;
export const UpdateEmailTemplateDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"UpdateEmailTemplate"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"id"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"Int"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"input"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"UpdateEmailTemplateInput"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"updateEmailTemplate"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"id"},"value":{"kind":"Variable","name":{"kind":"Name","value":"id"}}},{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"Variable","name":{"kind":"Name","value":"input"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"subject"}},{"kind":"Field","name":{"kind":"Name","value":"isActive"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}}]}}]}}]} as unknown as DocumentNode<UpdateEmailTemplateMutation, UpdateEmailTemplateMutationVariables>;
export const DeleteEmailTemplateDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"DeleteEmailTemplate"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"id"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"Int"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"deleteEmailTemplate"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"id"},"value":{"kind":"Variable","name":{"kind":"Name","value":"id"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"success"}},{"kind":"Field","name":{"kind":"Name","value":"message"}}]}}]}}]} as unknown as DocumentNode<DeleteEmailTemplateMutation, DeleteEmailTemplateMutationVariables>;
export const GetEmailThreadsDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"GetEmailThreads"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"classification"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"search"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"sortBy"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"limit"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"Int"}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"offset"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"Int"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"emailThreads"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"classification"},"value":{"kind":"Variable","name":{"kind":"Name","value":"classification"}}},{"kind":"Argument","name":{"kind":"Name","value":"search"},"value":{"kind":"Variable","name":{"kind":"Name","value":"search"}}},{"kind":"Argument","name":{"kind":"Name","value":"sortBy"},"value":{"kind":"Variable","name":{"kind":"Name","value":"sortBy"}}},{"kind":"Argument","name":{"kind":"Name","value":"limit"},"value":{"kind":"Variable","name":{"kind":"Name","value":"limit"}}},{"kind":"Argument","name":{"kind":"Name","value":"offset"},"value":{"kind":"Variable","name":{"kind":"Name","value":"offset"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"threads"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"contactId"}},{"kind":"Field","name":{"kind":"Name","value":"contactSlug"}},{"kind":"Field","name":{"kind":"Name","value":"contactName"}},{"kind":"Field","name":{"kind":"Name","value":"contactEmail"}},{"kind":"Field","name":{"kind":"Name","value":"contactPosition"}},{"kind":"Field","name":{"kind":"Name","value":"companyName"}},{"kind":"Field","name":{"kind":"Name","value":"companyKey"}},{"kind":"Field","name":{"kind":"Name","value":"lastMessageAt"}},{"kind":"Field","name":{"kind":"Name","value":"lastMessagePreview"}},{"kind":"Field","name":{"kind":"Name","value":"lastMessageDirection"}},{"kind":"Field","name":{"kind":"Name","value":"classification"}},{"kind":"Field","name":{"kind":"Name","value":"classificationConfidence"}},{"kind":"Field","name":{"kind":"Name","value":"totalMessages"}},{"kind":"Field","name":{"kind":"Name","value":"hasReply"}},{"kind":"Field","name":{"kind":"Name","value":"latestStatus"}},{"kind":"Field","name":{"kind":"Name","value":"priorityScore"}},{"kind":"Field","name":{"kind":"Name","value":"hasPendingDraft"}},{"kind":"Field","name":{"kind":"Name","value":"draftId"}},{"kind":"Field","name":{"kind":"Name","value":"conversationStage"}}]}},{"kind":"Field","name":{"kind":"Name","value":"totalCount"}}]}}]}}]} as unknown as DocumentNode<GetEmailThreadsQuery, GetEmailThreadsQueryVariables>;
export const GetEmailThreadDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"GetEmailThread"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"contactId"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"Int"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"emailThread"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"contactId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"contactId"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"contactId"}},{"kind":"Field","name":{"kind":"Name","value":"contactSlug"}},{"kind":"Field","name":{"kind":"Name","value":"contactName"}},{"kind":"Field","name":{"kind":"Name","value":"contactEmail"}},{"kind":"Field","name":{"kind":"Name","value":"contactPosition"}},{"kind":"Field","name":{"kind":"Name","value":"contactForwardingAlias"}},{"kind":"Field","name":{"kind":"Name","value":"companyName"}},{"kind":"Field","name":{"kind":"Name","value":"companyKey"}},{"kind":"Field","name":{"kind":"Name","value":"classification"}},{"kind":"Field","name":{"kind":"Name","value":"classificationConfidence"}},{"kind":"Field","name":{"kind":"Name","value":"totalMessages"}},{"kind":"Field","name":{"kind":"Name","value":"hasReply"}},{"kind":"Field","name":{"kind":"Name","value":"messages"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"direction"}},{"kind":"Field","name":{"kind":"Name","value":"fromEmail"}},{"kind":"Field","name":{"kind":"Name","value":"toEmails"}},{"kind":"Field","name":{"kind":"Name","value":"subject"}},{"kind":"Field","name":{"kind":"Name","value":"textContent"}},{"kind":"Field","name":{"kind":"Name","value":"htmlContent"}},{"kind":"Field","name":{"kind":"Name","value":"sentAt"}},{"kind":"Field","name":{"kind":"Name","value":"status"}},{"kind":"Field","name":{"kind":"Name","value":"sequenceType"}},{"kind":"Field","name":{"kind":"Name","value":"sequenceNumber"}},{"kind":"Field","name":{"kind":"Name","value":"classification"}},{"kind":"Field","name":{"kind":"Name","value":"classificationConfidence"}}]}}]}}]}}]} as unknown as DocumentNode<GetEmailThreadQuery, GetEmailThreadQueryVariables>;
export const GetLinkedInPostsDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"GetLinkedInPosts"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"type"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"LinkedInPostType"}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"companyId"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"Int"}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"limit"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"Int"}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"offset"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"Int"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"linkedinPosts"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"type"},"value":{"kind":"Variable","name":{"kind":"Name","value":"type"}}},{"kind":"Argument","name":{"kind":"Name","value":"companyId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"companyId"}}},{"kind":"Argument","name":{"kind":"Name","value":"limit"},"value":{"kind":"Variable","name":{"kind":"Name","value":"limit"}}},{"kind":"Argument","name":{"kind":"Name","value":"offset"},"value":{"kind":"Variable","name":{"kind":"Name","value":"offset"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"type"}},{"kind":"Field","name":{"kind":"Name","value":"url"}},{"kind":"Field","name":{"kind":"Name","value":"companyId"}},{"kind":"Field","name":{"kind":"Name","value":"contactId"}},{"kind":"Field","name":{"kind":"Name","value":"title"}},{"kind":"Field","name":{"kind":"Name","value":"content"}},{"kind":"Field","name":{"kind":"Name","value":"authorName"}},{"kind":"Field","name":{"kind":"Name","value":"authorUrl"}},{"kind":"Field","name":{"kind":"Name","value":"location"}},{"kind":"Field","name":{"kind":"Name","value":"employmentType"}},{"kind":"Field","name":{"kind":"Name","value":"postedAt"}},{"kind":"Field","name":{"kind":"Name","value":"scrapedAt"}},{"kind":"Field","name":{"kind":"Name","value":"rawData"}},{"kind":"Field","name":{"kind":"Name","value":"skills"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"tag"}},{"kind":"Field","name":{"kind":"Name","value":"label"}},{"kind":"Field","name":{"kind":"Name","value":"confidence"}}]}},{"kind":"Field","name":{"kind":"Name","value":"analyzedAt"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}}]}}]}}]} as unknown as DocumentNode<GetLinkedInPostsQuery, GetLinkedInPostsQueryVariables>;
export const GetSimilarPostsDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"GetSimilarPosts"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"postId"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"Int"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"limit"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"Int"}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"minScore"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"Float"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"similarPosts"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"postId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"postId"}}},{"kind":"Argument","name":{"kind":"Name","value":"limit"},"value":{"kind":"Variable","name":{"kind":"Name","value":"limit"}}},{"kind":"Argument","name":{"kind":"Name","value":"minScore"},"value":{"kind":"Variable","name":{"kind":"Name","value":"minScore"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"post"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"type"}},{"kind":"Field","name":{"kind":"Name","value":"url"}},{"kind":"Field","name":{"kind":"Name","value":"title"}},{"kind":"Field","name":{"kind":"Name","value":"content"}},{"kind":"Field","name":{"kind":"Name","value":"authorName"}},{"kind":"Field","name":{"kind":"Name","value":"skills"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"tag"}},{"kind":"Field","name":{"kind":"Name","value":"label"}},{"kind":"Field","name":{"kind":"Name","value":"confidence"}}]}},{"kind":"Field","name":{"kind":"Name","value":"analyzedAt"}}]}},{"kind":"Field","name":{"kind":"Name","value":"similarity"}}]}}]}}]} as unknown as DocumentNode<GetSimilarPostsQuery, GetSimilarPostsQueryVariables>;
export const AnalyzeLinkedInPostsDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"AnalyzeLinkedInPosts"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"postIds"}},"type":{"kind":"ListType","type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"Int"}}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"limit"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"Int"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"analyzeLinkedInPosts"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"postIds"},"value":{"kind":"Variable","name":{"kind":"Name","value":"postIds"}}},{"kind":"Argument","name":{"kind":"Name","value":"limit"},"value":{"kind":"Variable","name":{"kind":"Name","value":"limit"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"success"}},{"kind":"Field","name":{"kind":"Name","value":"analyzed"}},{"kind":"Field","name":{"kind":"Name","value":"failed"}},{"kind":"Field","name":{"kind":"Name","value":"errors"}}]}}]}}]} as unknown as DocumentNode<AnalyzeLinkedInPostsMutation, AnalyzeLinkedInPostsMutationVariables>;
export const ProductsDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"Products"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"products"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"ProductCore"}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"ProductCore"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Product"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"slug"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"url"}},{"kind":"Field","name":{"kind":"Name","value":"domain"}},{"kind":"Field","name":{"kind":"Name","value":"description"}},{"kind":"Field","name":{"kind":"Name","value":"highlights"}},{"kind":"Field","name":{"kind":"Name","value":"icpAnalysis"}},{"kind":"Field","name":{"kind":"Name","value":"icpAnalyzedAt"}},{"kind":"Field","name":{"kind":"Name","value":"pricingAnalysis"}},{"kind":"Field","name":{"kind":"Name","value":"pricingAnalyzedAt"}},{"kind":"Field","name":{"kind":"Name","value":"gtmAnalysis"}},{"kind":"Field","name":{"kind":"Name","value":"gtmAnalyzedAt"}},{"kind":"Field","name":{"kind":"Name","value":"intelReport"}},{"kind":"Field","name":{"kind":"Name","value":"intelReportAt"}},{"kind":"Field","name":{"kind":"Name","value":"positioningAnalysis"}},{"kind":"Field","name":{"kind":"Name","value":"publishedAt"}},{"kind":"Field","name":{"kind":"Name","value":"createdBy"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}}]}}]} as unknown as DocumentNode<ProductsQuery, ProductsQueryVariables>;
export const ProductDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"Product"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"id"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"Int"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"product"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"id"},"value":{"kind":"Variable","name":{"kind":"Name","value":"id"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"ProductCore"}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"ProductCore"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Product"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"slug"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"url"}},{"kind":"Field","name":{"kind":"Name","value":"domain"}},{"kind":"Field","name":{"kind":"Name","value":"description"}},{"kind":"Field","name":{"kind":"Name","value":"highlights"}},{"kind":"Field","name":{"kind":"Name","value":"icpAnalysis"}},{"kind":"Field","name":{"kind":"Name","value":"icpAnalyzedAt"}},{"kind":"Field","name":{"kind":"Name","value":"pricingAnalysis"}},{"kind":"Field","name":{"kind":"Name","value":"pricingAnalyzedAt"}},{"kind":"Field","name":{"kind":"Name","value":"gtmAnalysis"}},{"kind":"Field","name":{"kind":"Name","value":"gtmAnalyzedAt"}},{"kind":"Field","name":{"kind":"Name","value":"intelReport"}},{"kind":"Field","name":{"kind":"Name","value":"intelReportAt"}},{"kind":"Field","name":{"kind":"Name","value":"positioningAnalysis"}},{"kind":"Field","name":{"kind":"Name","value":"publishedAt"}},{"kind":"Field","name":{"kind":"Name","value":"createdBy"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}}]}}]} as unknown as DocumentNode<ProductQuery, ProductQueryVariables>;
export const ProductBySlugDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"ProductBySlug"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"slug"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"productBySlug"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"slug"},"value":{"kind":"Variable","name":{"kind":"Name","value":"slug"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"ProductCore"}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"ProductCore"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Product"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"slug"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"url"}},{"kind":"Field","name":{"kind":"Name","value":"domain"}},{"kind":"Field","name":{"kind":"Name","value":"description"}},{"kind":"Field","name":{"kind":"Name","value":"highlights"}},{"kind":"Field","name":{"kind":"Name","value":"icpAnalysis"}},{"kind":"Field","name":{"kind":"Name","value":"icpAnalyzedAt"}},{"kind":"Field","name":{"kind":"Name","value":"pricingAnalysis"}},{"kind":"Field","name":{"kind":"Name","value":"pricingAnalyzedAt"}},{"kind":"Field","name":{"kind":"Name","value":"gtmAnalysis"}},{"kind":"Field","name":{"kind":"Name","value":"gtmAnalyzedAt"}},{"kind":"Field","name":{"kind":"Name","value":"intelReport"}},{"kind":"Field","name":{"kind":"Name","value":"intelReportAt"}},{"kind":"Field","name":{"kind":"Name","value":"positioningAnalysis"}},{"kind":"Field","name":{"kind":"Name","value":"publishedAt"}},{"kind":"Field","name":{"kind":"Name","value":"createdBy"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}}]}}]} as unknown as DocumentNode<ProductBySlugQuery, ProductBySlugQueryVariables>;
export const PublicProductsDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"PublicProducts"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"limit"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"Int"}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"offset"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"Int"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"products"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"limit"},"value":{"kind":"Variable","name":{"kind":"Name","value":"limit"}}},{"kind":"Argument","name":{"kind":"Name","value":"offset"},"value":{"kind":"Variable","name":{"kind":"Name","value":"offset"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"slug"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"domain"}},{"kind":"Field","name":{"kind":"Name","value":"icpAnalyzedAt"}},{"kind":"Field","name":{"kind":"Name","value":"pricingAnalyzedAt"}},{"kind":"Field","name":{"kind":"Name","value":"gtmAnalyzedAt"}},{"kind":"Field","name":{"kind":"Name","value":"intelReportAt"}}]}}]}}]} as unknown as DocumentNode<PublicProductsQuery, PublicProductsQueryVariables>;
export const PublicProductDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"PublicProduct"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"slug"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"productBySlug"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"slug"},"value":{"kind":"Variable","name":{"kind":"Name","value":"slug"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"ProductCore"}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"ProductCore"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Product"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"slug"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"url"}},{"kind":"Field","name":{"kind":"Name","value":"domain"}},{"kind":"Field","name":{"kind":"Name","value":"description"}},{"kind":"Field","name":{"kind":"Name","value":"highlights"}},{"kind":"Field","name":{"kind":"Name","value":"icpAnalysis"}},{"kind":"Field","name":{"kind":"Name","value":"icpAnalyzedAt"}},{"kind":"Field","name":{"kind":"Name","value":"pricingAnalysis"}},{"kind":"Field","name":{"kind":"Name","value":"pricingAnalyzedAt"}},{"kind":"Field","name":{"kind":"Name","value":"gtmAnalysis"}},{"kind":"Field","name":{"kind":"Name","value":"gtmAnalyzedAt"}},{"kind":"Field","name":{"kind":"Name","value":"intelReport"}},{"kind":"Field","name":{"kind":"Name","value":"intelReportAt"}},{"kind":"Field","name":{"kind":"Name","value":"positioningAnalysis"}},{"kind":"Field","name":{"kind":"Name","value":"publishedAt"}},{"kind":"Field","name":{"kind":"Name","value":"createdBy"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}}]}}]} as unknown as DocumentNode<PublicProductQuery, PublicProductQueryVariables>;
export const PublicIntelRunDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"PublicIntelRun"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"id"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"productIntelRun"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"id"},"value":{"kind":"Variable","name":{"kind":"Name","value":"id"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"IntelRunCore"}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"IntelRunCore"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"IntelRun"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"productId"}},{"kind":"Field","name":{"kind":"Name","value":"kind"}},{"kind":"Field","name":{"kind":"Name","value":"status"}},{"kind":"Field","name":{"kind":"Name","value":"startedAt"}},{"kind":"Field","name":{"kind":"Name","value":"finishedAt"}},{"kind":"Field","name":{"kind":"Name","value":"error"}},{"kind":"Field","name":{"kind":"Name","value":"output"}}]}}]} as unknown as DocumentNode<PublicIntelRunQuery, PublicIntelRunQueryVariables>;
export const PublicIntelRunsDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"PublicIntelRuns"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"productId"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"Int"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"kind"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"productIntelRuns"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"productId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"productId"}}},{"kind":"Argument","name":{"kind":"Name","value":"kind"},"value":{"kind":"Variable","name":{"kind":"Name","value":"kind"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"kind"}},{"kind":"Field","name":{"kind":"Name","value":"status"}},{"kind":"Field","name":{"kind":"Name","value":"startedAt"}},{"kind":"Field","name":{"kind":"Name","value":"finishedAt"}},{"kind":"Field","name":{"kind":"Name","value":"error"}}]}}]}}]} as unknown as DocumentNode<PublicIntelRunsQuery, PublicIntelRunsQueryVariables>;
export const UpsertProductDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"UpsertProduct"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"input"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ProductInput"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"upsertProduct"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"Variable","name":{"kind":"Name","value":"input"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"ProductCore"}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"ProductCore"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Product"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"slug"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"url"}},{"kind":"Field","name":{"kind":"Name","value":"domain"}},{"kind":"Field","name":{"kind":"Name","value":"description"}},{"kind":"Field","name":{"kind":"Name","value":"highlights"}},{"kind":"Field","name":{"kind":"Name","value":"icpAnalysis"}},{"kind":"Field","name":{"kind":"Name","value":"icpAnalyzedAt"}},{"kind":"Field","name":{"kind":"Name","value":"pricingAnalysis"}},{"kind":"Field","name":{"kind":"Name","value":"pricingAnalyzedAt"}},{"kind":"Field","name":{"kind":"Name","value":"gtmAnalysis"}},{"kind":"Field","name":{"kind":"Name","value":"gtmAnalyzedAt"}},{"kind":"Field","name":{"kind":"Name","value":"intelReport"}},{"kind":"Field","name":{"kind":"Name","value":"intelReportAt"}},{"kind":"Field","name":{"kind":"Name","value":"positioningAnalysis"}},{"kind":"Field","name":{"kind":"Name","value":"publishedAt"}},{"kind":"Field","name":{"kind":"Name","value":"createdBy"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}}]}}]} as unknown as DocumentNode<UpsertProductMutation, UpsertProductMutationVariables>;
export const DeleteProductDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"DeleteProduct"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"id"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"Int"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"deleteProduct"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"id"},"value":{"kind":"Variable","name":{"kind":"Name","value":"id"}}}]}]}}]} as unknown as DocumentNode<DeleteProductMutation, DeleteProductMutationVariables>;
export const AnalyzeProductIcpDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"AnalyzeProductICP"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"id"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"Int"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"analyzeProductICP"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"id"},"value":{"kind":"Variable","name":{"kind":"Name","value":"id"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"ProductCore"}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"ProductCore"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Product"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"slug"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"url"}},{"kind":"Field","name":{"kind":"Name","value":"domain"}},{"kind":"Field","name":{"kind":"Name","value":"description"}},{"kind":"Field","name":{"kind":"Name","value":"highlights"}},{"kind":"Field","name":{"kind":"Name","value":"icpAnalysis"}},{"kind":"Field","name":{"kind":"Name","value":"icpAnalyzedAt"}},{"kind":"Field","name":{"kind":"Name","value":"pricingAnalysis"}},{"kind":"Field","name":{"kind":"Name","value":"pricingAnalyzedAt"}},{"kind":"Field","name":{"kind":"Name","value":"gtmAnalysis"}},{"kind":"Field","name":{"kind":"Name","value":"gtmAnalyzedAt"}},{"kind":"Field","name":{"kind":"Name","value":"intelReport"}},{"kind":"Field","name":{"kind":"Name","value":"intelReportAt"}},{"kind":"Field","name":{"kind":"Name","value":"positioningAnalysis"}},{"kind":"Field","name":{"kind":"Name","value":"publishedAt"}},{"kind":"Field","name":{"kind":"Name","value":"createdBy"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}}]}}]} as unknown as DocumentNode<AnalyzeProductIcpMutation, AnalyzeProductIcpMutationVariables>;
export const EnhanceProductIcpDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"EnhanceProductIcp"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"id"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"Int"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"enhanceProductIcp"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"id"},"value":{"kind":"Variable","name":{"kind":"Name","value":"id"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"ProductCore"}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"ProductCore"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Product"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"slug"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"url"}},{"kind":"Field","name":{"kind":"Name","value":"domain"}},{"kind":"Field","name":{"kind":"Name","value":"description"}},{"kind":"Field","name":{"kind":"Name","value":"highlights"}},{"kind":"Field","name":{"kind":"Name","value":"icpAnalysis"}},{"kind":"Field","name":{"kind":"Name","value":"icpAnalyzedAt"}},{"kind":"Field","name":{"kind":"Name","value":"pricingAnalysis"}},{"kind":"Field","name":{"kind":"Name","value":"pricingAnalyzedAt"}},{"kind":"Field","name":{"kind":"Name","value":"gtmAnalysis"}},{"kind":"Field","name":{"kind":"Name","value":"gtmAnalyzedAt"}},{"kind":"Field","name":{"kind":"Name","value":"intelReport"}},{"kind":"Field","name":{"kind":"Name","value":"intelReportAt"}},{"kind":"Field","name":{"kind":"Name","value":"positioningAnalysis"}},{"kind":"Field","name":{"kind":"Name","value":"publishedAt"}},{"kind":"Field","name":{"kind":"Name","value":"createdBy"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}}]}}]} as unknown as DocumentNode<EnhanceProductIcpMutation, EnhanceProductIcpMutationVariables>;
export const AnalyzeProductPricingDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"AnalyzeProductPricing"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"id"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"Int"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"analyzeProductPricing"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"id"},"value":{"kind":"Variable","name":{"kind":"Name","value":"id"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"ProductCore"}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"ProductCore"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Product"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"slug"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"url"}},{"kind":"Field","name":{"kind":"Name","value":"domain"}},{"kind":"Field","name":{"kind":"Name","value":"description"}},{"kind":"Field","name":{"kind":"Name","value":"highlights"}},{"kind":"Field","name":{"kind":"Name","value":"icpAnalysis"}},{"kind":"Field","name":{"kind":"Name","value":"icpAnalyzedAt"}},{"kind":"Field","name":{"kind":"Name","value":"pricingAnalysis"}},{"kind":"Field","name":{"kind":"Name","value":"pricingAnalyzedAt"}},{"kind":"Field","name":{"kind":"Name","value":"gtmAnalysis"}},{"kind":"Field","name":{"kind":"Name","value":"gtmAnalyzedAt"}},{"kind":"Field","name":{"kind":"Name","value":"intelReport"}},{"kind":"Field","name":{"kind":"Name","value":"intelReportAt"}},{"kind":"Field","name":{"kind":"Name","value":"positioningAnalysis"}},{"kind":"Field","name":{"kind":"Name","value":"publishedAt"}},{"kind":"Field","name":{"kind":"Name","value":"createdBy"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}}]}}]} as unknown as DocumentNode<AnalyzeProductPricingMutation, AnalyzeProductPricingMutationVariables>;
export const AnalyzeProductGtmDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"AnalyzeProductGTM"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"id"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"Int"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"analyzeProductGTM"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"id"},"value":{"kind":"Variable","name":{"kind":"Name","value":"id"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"ProductCore"}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"ProductCore"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Product"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"slug"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"url"}},{"kind":"Field","name":{"kind":"Name","value":"domain"}},{"kind":"Field","name":{"kind":"Name","value":"description"}},{"kind":"Field","name":{"kind":"Name","value":"highlights"}},{"kind":"Field","name":{"kind":"Name","value":"icpAnalysis"}},{"kind":"Field","name":{"kind":"Name","value":"icpAnalyzedAt"}},{"kind":"Field","name":{"kind":"Name","value":"pricingAnalysis"}},{"kind":"Field","name":{"kind":"Name","value":"pricingAnalyzedAt"}},{"kind":"Field","name":{"kind":"Name","value":"gtmAnalysis"}},{"kind":"Field","name":{"kind":"Name","value":"gtmAnalyzedAt"}},{"kind":"Field","name":{"kind":"Name","value":"intelReport"}},{"kind":"Field","name":{"kind":"Name","value":"intelReportAt"}},{"kind":"Field","name":{"kind":"Name","value":"positioningAnalysis"}},{"kind":"Field","name":{"kind":"Name","value":"publishedAt"}},{"kind":"Field","name":{"kind":"Name","value":"createdBy"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}}]}}]} as unknown as DocumentNode<AnalyzeProductGtmMutation, AnalyzeProductGtmMutationVariables>;
export const RunFullProductIntelDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"RunFullProductIntel"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"id"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"Int"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"runFullProductIntel"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"id"},"value":{"kind":"Variable","name":{"kind":"Name","value":"id"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"ProductCore"}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"ProductCore"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Product"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"slug"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"url"}},{"kind":"Field","name":{"kind":"Name","value":"domain"}},{"kind":"Field","name":{"kind":"Name","value":"description"}},{"kind":"Field","name":{"kind":"Name","value":"highlights"}},{"kind":"Field","name":{"kind":"Name","value":"icpAnalysis"}},{"kind":"Field","name":{"kind":"Name","value":"icpAnalyzedAt"}},{"kind":"Field","name":{"kind":"Name","value":"pricingAnalysis"}},{"kind":"Field","name":{"kind":"Name","value":"pricingAnalyzedAt"}},{"kind":"Field","name":{"kind":"Name","value":"gtmAnalysis"}},{"kind":"Field","name":{"kind":"Name","value":"gtmAnalyzedAt"}},{"kind":"Field","name":{"kind":"Name","value":"intelReport"}},{"kind":"Field","name":{"kind":"Name","value":"intelReportAt"}},{"kind":"Field","name":{"kind":"Name","value":"positioningAnalysis"}},{"kind":"Field","name":{"kind":"Name","value":"publishedAt"}},{"kind":"Field","name":{"kind":"Name","value":"createdBy"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}}]}}]} as unknown as DocumentNode<RunFullProductIntelMutation, RunFullProductIntelMutationVariables>;
export const AnalyzeProductPricingAsyncDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"AnalyzeProductPricingAsync"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"id"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"Int"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"analyzeProductPricingAsync"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"id"},"value":{"kind":"Variable","name":{"kind":"Name","value":"id"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"runId"}},{"kind":"Field","name":{"kind":"Name","value":"productId"}},{"kind":"Field","name":{"kind":"Name","value":"kind"}},{"kind":"Field","name":{"kind":"Name","value":"status"}}]}}]}}]} as unknown as DocumentNode<AnalyzeProductPricingAsyncMutation, AnalyzeProductPricingAsyncMutationVariables>;
export const AnalyzeProductGtmAsyncDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"AnalyzeProductGTMAsync"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"id"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"Int"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"analyzeProductGTMAsync"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"id"},"value":{"kind":"Variable","name":{"kind":"Name","value":"id"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"runId"}},{"kind":"Field","name":{"kind":"Name","value":"productId"}},{"kind":"Field","name":{"kind":"Name","value":"kind"}},{"kind":"Field","name":{"kind":"Name","value":"status"}}]}}]}}]} as unknown as DocumentNode<AnalyzeProductGtmAsyncMutation, AnalyzeProductGtmAsyncMutationVariables>;
export const RunFullProductIntelAsyncDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"RunFullProductIntelAsync"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"id"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"Int"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"forceRefresh"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"Boolean"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"runFullProductIntelAsync"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"id"},"value":{"kind":"Variable","name":{"kind":"Name","value":"id"}}},{"kind":"Argument","name":{"kind":"Name","value":"forceRefresh"},"value":{"kind":"Variable","name":{"kind":"Name","value":"forceRefresh"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"runId"}},{"kind":"Field","name":{"kind":"Name","value":"productId"}},{"kind":"Field","name":{"kind":"Name","value":"kind"}},{"kind":"Field","name":{"kind":"Name","value":"status"}}]}}]}}]} as unknown as DocumentNode<RunFullProductIntelAsyncMutation, RunFullProductIntelAsyncMutationVariables>;
export const SetProductPublishedDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"SetProductPublished"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"id"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"Int"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"published"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"Boolean"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"setProductPublished"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"id"},"value":{"kind":"Variable","name":{"kind":"Name","value":"id"}}},{"kind":"Argument","name":{"kind":"Name","value":"published"},"value":{"kind":"Variable","name":{"kind":"Name","value":"published"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"ProductCore"}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"ProductCore"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Product"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"slug"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"url"}},{"kind":"Field","name":{"kind":"Name","value":"domain"}},{"kind":"Field","name":{"kind":"Name","value":"description"}},{"kind":"Field","name":{"kind":"Name","value":"highlights"}},{"kind":"Field","name":{"kind":"Name","value":"icpAnalysis"}},{"kind":"Field","name":{"kind":"Name","value":"icpAnalyzedAt"}},{"kind":"Field","name":{"kind":"Name","value":"pricingAnalysis"}},{"kind":"Field","name":{"kind":"Name","value":"pricingAnalyzedAt"}},{"kind":"Field","name":{"kind":"Name","value":"gtmAnalysis"}},{"kind":"Field","name":{"kind":"Name","value":"gtmAnalyzedAt"}},{"kind":"Field","name":{"kind":"Name","value":"intelReport"}},{"kind":"Field","name":{"kind":"Name","value":"intelReportAt"}},{"kind":"Field","name":{"kind":"Name","value":"positioningAnalysis"}},{"kind":"Field","name":{"kind":"Name","value":"publishedAt"}},{"kind":"Field","name":{"kind":"Name","value":"createdBy"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}}]}}]} as unknown as DocumentNode<SetProductPublishedMutation, SetProductPublishedMutationVariables>;
export const ProductLeadsDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"ProductLeads"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"slug"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"tier"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"limit"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"Int"}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"offset"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"Int"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"productLeads"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"slug"},"value":{"kind":"Variable","name":{"kind":"Name","value":"slug"}}},{"kind":"Argument","name":{"kind":"Name","value":"tier"},"value":{"kind":"Variable","name":{"kind":"Name","value":"tier"}}},{"kind":"Argument","name":{"kind":"Name","value":"limit"},"value":{"kind":"Variable","name":{"kind":"Name","value":"limit"}}},{"kind":"Argument","name":{"kind":"Name","value":"offset"},"value":{"kind":"Variable","name":{"kind":"Name","value":"offset"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"leads"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"ProductLeadCore"}}]}},{"kind":"Field","name":{"kind":"Name","value":"totalCount"}},{"kind":"Field","name":{"kind":"Name","value":"hotCount"}},{"kind":"Field","name":{"kind":"Name","value":"warmCount"}},{"kind":"Field","name":{"kind":"Name","value":"coldCount"}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"ProductLeadCore"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"ProductLead"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"companyId"}},{"kind":"Field","name":{"kind":"Name","value":"companyKey"}},{"kind":"Field","name":{"kind":"Name","value":"companyName"}},{"kind":"Field","name":{"kind":"Name","value":"companyDomain"}},{"kind":"Field","name":{"kind":"Name","value":"companyLogoUrl"}},{"kind":"Field","name":{"kind":"Name","value":"companyDescription"}},{"kind":"Field","name":{"kind":"Name","value":"companyIndustry"}},{"kind":"Field","name":{"kind":"Name","value":"companySize"}},{"kind":"Field","name":{"kind":"Name","value":"companyLocation"}},{"kind":"Field","name":{"kind":"Name","value":"tier"}},{"kind":"Field","name":{"kind":"Name","value":"score"}},{"kind":"Field","name":{"kind":"Name","value":"regexScore"}},{"kind":"Field","name":{"kind":"Name","value":"semanticScore"}},{"kind":"Field","name":{"kind":"Name","value":"signals"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}}]}}]} as unknown as DocumentNode<ProductLeadsQuery, ProductLeadsQueryVariables>;
export const ProductLeadsPreviewDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"ProductLeadsPreview"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"slug"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"productLeads"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"slug"},"value":{"kind":"Variable","name":{"kind":"Name","value":"slug"}}},{"kind":"Argument","name":{"kind":"Name","value":"limit"},"value":{"kind":"IntValue","value":"5"}},{"kind":"Argument","name":{"kind":"Name","value":"offset"},"value":{"kind":"IntValue","value":"0"}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"leads"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"companyId"}},{"kind":"Field","name":{"kind":"Name","value":"companyKey"}},{"kind":"Field","name":{"kind":"Name","value":"companyName"}},{"kind":"Field","name":{"kind":"Name","value":"companyDomain"}},{"kind":"Field","name":{"kind":"Name","value":"companyLogoUrl"}},{"kind":"Field","name":{"kind":"Name","value":"tier"}},{"kind":"Field","name":{"kind":"Name","value":"score"}}]}},{"kind":"Field","name":{"kind":"Name","value":"totalCount"}},{"kind":"Field","name":{"kind":"Name","value":"hotCount"}},{"kind":"Field","name":{"kind":"Name","value":"warmCount"}}]}}]}}]} as unknown as DocumentNode<ProductLeadsPreviewQuery, ProductLeadsPreviewQueryVariables>;
export const DueRemindersDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"DueReminders"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"dueReminders"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"reminder"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"entityType"}},{"kind":"Field","name":{"kind":"Name","value":"entityId"}},{"kind":"Field","name":{"kind":"Name","value":"remindAt"}},{"kind":"Field","name":{"kind":"Name","value":"recurrence"}},{"kind":"Field","name":{"kind":"Name","value":"note"}},{"kind":"Field","name":{"kind":"Name","value":"status"}},{"kind":"Field","name":{"kind":"Name","value":"snoozedUntil"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}}]}},{"kind":"Field","name":{"kind":"Name","value":"contact"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"slug"}},{"kind":"Field","name":{"kind":"Name","value":"firstName"}},{"kind":"Field","name":{"kind":"Name","value":"lastName"}},{"kind":"Field","name":{"kind":"Name","value":"position"}},{"kind":"Field","name":{"kind":"Name","value":"tags"}}]}}]}}]}}]} as unknown as DocumentNode<DueRemindersQuery, DueRemindersQueryVariables>;
export const RemindersDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"Reminders"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"entityType"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"entityId"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"Int"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"reminders"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"entityType"},"value":{"kind":"Variable","name":{"kind":"Name","value":"entityType"}}},{"kind":"Argument","name":{"kind":"Name","value":"entityId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"entityId"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"entityType"}},{"kind":"Field","name":{"kind":"Name","value":"entityId"}},{"kind":"Field","name":{"kind":"Name","value":"remindAt"}},{"kind":"Field","name":{"kind":"Name","value":"recurrence"}},{"kind":"Field","name":{"kind":"Name","value":"note"}},{"kind":"Field","name":{"kind":"Name","value":"status"}},{"kind":"Field","name":{"kind":"Name","value":"snoozedUntil"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}}]}}]}}]} as unknown as DocumentNode<RemindersQuery, RemindersQueryVariables>;
export const CreateReminderDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"CreateReminder"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"input"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"CreateReminderInput"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"createReminder"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"Variable","name":{"kind":"Name","value":"input"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"entityType"}},{"kind":"Field","name":{"kind":"Name","value":"entityId"}},{"kind":"Field","name":{"kind":"Name","value":"remindAt"}},{"kind":"Field","name":{"kind":"Name","value":"recurrence"}},{"kind":"Field","name":{"kind":"Name","value":"note"}},{"kind":"Field","name":{"kind":"Name","value":"status"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}}]}}]}}]} as unknown as DocumentNode<CreateReminderMutation, CreateReminderMutationVariables>;
export const UpdateReminderDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"UpdateReminder"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"id"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"Int"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"input"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"UpdateReminderInput"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"updateReminder"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"id"},"value":{"kind":"Variable","name":{"kind":"Name","value":"id"}}},{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"Variable","name":{"kind":"Name","value":"input"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"entityType"}},{"kind":"Field","name":{"kind":"Name","value":"entityId"}},{"kind":"Field","name":{"kind":"Name","value":"remindAt"}},{"kind":"Field","name":{"kind":"Name","value":"recurrence"}},{"kind":"Field","name":{"kind":"Name","value":"note"}},{"kind":"Field","name":{"kind":"Name","value":"status"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}}]}}]}}]} as unknown as DocumentNode<UpdateReminderMutation, UpdateReminderMutationVariables>;
export const SnoozeReminderDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"SnoozeReminder"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"id"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"Int"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"days"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"Int"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"snoozeReminder"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"id"},"value":{"kind":"Variable","name":{"kind":"Name","value":"id"}}},{"kind":"Argument","name":{"kind":"Name","value":"days"},"value":{"kind":"Variable","name":{"kind":"Name","value":"days"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"entityType"}},{"kind":"Field","name":{"kind":"Name","value":"entityId"}},{"kind":"Field","name":{"kind":"Name","value":"remindAt"}},{"kind":"Field","name":{"kind":"Name","value":"status"}},{"kind":"Field","name":{"kind":"Name","value":"snoozedUntil"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}}]}}]}}]} as unknown as DocumentNode<SnoozeReminderMutation, SnoozeReminderMutationVariables>;
export const DismissReminderDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"DismissReminder"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"id"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"Int"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"dismissReminder"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"id"},"value":{"kind":"Variable","name":{"kind":"Name","value":"id"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"entityType"}},{"kind":"Field","name":{"kind":"Name","value":"entityId"}},{"kind":"Field","name":{"kind":"Name","value":"status"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}}]}}]}}]} as unknown as DocumentNode<DismissReminderMutation, DismissReminderMutationVariables>;
export const ComputeNextTouchScoresDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"ComputeNextTouchScores"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"companyId"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"Int"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"computeNextTouchScores"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"companyId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"companyId"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"success"}},{"kind":"Field","name":{"kind":"Name","value":"message"}},{"kind":"Field","name":{"kind":"Name","value":"contactsUpdated"}},{"kind":"Field","name":{"kind":"Name","value":"topContacts"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"contactId"}},{"kind":"Field","name":{"kind":"Name","value":"firstName"}},{"kind":"Field","name":{"kind":"Name","value":"lastName"}},{"kind":"Field","name":{"kind":"Name","value":"position"}},{"kind":"Field","name":{"kind":"Name","value":"nextTouchScore"}},{"kind":"Field","name":{"kind":"Name","value":"lastContactedAt"}}]}}]}}]}}]} as unknown as DocumentNode<ComputeNextTouchScoresMutation, ComputeNextTouchScoresMutationVariables>;
export const ScoreContactsMlDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"ScoreContactsML"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"companyId"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"Int"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"scoreContactsML"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"companyId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"companyId"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"success"}},{"kind":"Field","name":{"kind":"Name","value":"message"}},{"kind":"Field","name":{"kind":"Name","value":"contactsScored"}},{"kind":"Field","name":{"kind":"Name","value":"decisionMakersFound"}},{"kind":"Field","name":{"kind":"Name","value":"results"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"contactId"}},{"kind":"Field","name":{"kind":"Name","value":"seniority"}},{"kind":"Field","name":{"kind":"Name","value":"department"}},{"kind":"Field","name":{"kind":"Name","value":"authorityScore"}},{"kind":"Field","name":{"kind":"Name","value":"isDecisionMaker"}},{"kind":"Field","name":{"kind":"Name","value":"dmReasons"}}]}}]}}]}}]} as unknown as DocumentNode<ScoreContactsMlMutation, ScoreContactsMlMutationVariables>;
export const GetReplyDraftsDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"GetReplyDrafts"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"status"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"draftType"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"limit"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"Int"}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"offset"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"Int"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"replyDrafts"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"status"},"value":{"kind":"Variable","name":{"kind":"Name","value":"status"}}},{"kind":"Argument","name":{"kind":"Name","value":"draftType"},"value":{"kind":"Variable","name":{"kind":"Name","value":"draftType"}}},{"kind":"Argument","name":{"kind":"Name","value":"limit"},"value":{"kind":"Variable","name":{"kind":"Name","value":"limit"}}},{"kind":"Argument","name":{"kind":"Name","value":"offset"},"value":{"kind":"Variable","name":{"kind":"Name","value":"offset"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"drafts"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"receivedEmailId"}},{"kind":"Field","name":{"kind":"Name","value":"contactId"}},{"kind":"Field","name":{"kind":"Name","value":"status"}},{"kind":"Field","name":{"kind":"Name","value":"draftType"}},{"kind":"Field","name":{"kind":"Name","value":"subject"}},{"kind":"Field","name":{"kind":"Name","value":"bodyText"}},{"kind":"Field","name":{"kind":"Name","value":"bodyHtml"}},{"kind":"Field","name":{"kind":"Name","value":"generationModel"}},{"kind":"Field","name":{"kind":"Name","value":"contactName"}},{"kind":"Field","name":{"kind":"Name","value":"contactEmail"}},{"kind":"Field","name":{"kind":"Name","value":"companyName"}},{"kind":"Field","name":{"kind":"Name","value":"classification"}},{"kind":"Field","name":{"kind":"Name","value":"classificationConfidence"}},{"kind":"Field","name":{"kind":"Name","value":"approvedAt"}},{"kind":"Field","name":{"kind":"Name","value":"sentAt"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}}]}},{"kind":"Field","name":{"kind":"Name","value":"totalCount"}}]}}]}}]} as unknown as DocumentNode<GetReplyDraftsQuery, GetReplyDraftsQueryVariables>;
export const GetDraftSummaryDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"GetDraftSummary"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"draftSummary"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"pending"}},{"kind":"Field","name":{"kind":"Name","value":"approved"}},{"kind":"Field","name":{"kind":"Name","value":"sent"}},{"kind":"Field","name":{"kind":"Name","value":"dismissed"}},{"kind":"Field","name":{"kind":"Name","value":"byClassification"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"classification"}},{"kind":"Field","name":{"kind":"Name","value":"count"}}]}}]}}]}}]} as unknown as DocumentNode<GetDraftSummaryQuery, GetDraftSummaryQueryVariables>;
export const ApproveAndSendDraftDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"ApproveAndSendDraft"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"draftId"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"Int"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"editedSubject"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"editedBody"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"approveAndSendDraft"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"draftId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"draftId"}}},{"kind":"Argument","name":{"kind":"Name","value":"editedSubject"},"value":{"kind":"Variable","name":{"kind":"Name","value":"editedSubject"}}},{"kind":"Argument","name":{"kind":"Name","value":"editedBody"},"value":{"kind":"Variable","name":{"kind":"Name","value":"editedBody"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"success"}},{"kind":"Field","name":{"kind":"Name","value":"resendId"}},{"kind":"Field","name":{"kind":"Name","value":"error"}}]}}]}}]} as unknown as DocumentNode<ApproveAndSendDraftMutation, ApproveAndSendDraftMutationVariables>;
export const DismissDraftDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"DismissDraft"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"draftId"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"Int"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"dismissDraft"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"draftId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"draftId"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"success"}}]}}]}}]} as unknown as DocumentNode<DismissDraftMutation, DismissDraftMutationVariables>;
export const RegenerateDraftDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"RegenerateDraft"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"draftId"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"Int"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"instructions"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"regenerateDraft"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"draftId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"draftId"}}},{"kind":"Argument","name":{"kind":"Name","value":"instructions"},"value":{"kind":"Variable","name":{"kind":"Name","value":"instructions"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"subject"}},{"kind":"Field","name":{"kind":"Name","value":"bodyText"}},{"kind":"Field","name":{"kind":"Name","value":"status"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}}]}}]}}]} as unknown as DocumentNode<RegenerateDraftMutation, RegenerateDraftMutationVariables>;
export const GenerateDraftsForPendingDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"GenerateDraftsForPending"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"generateDraftsForPending"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"success"}},{"kind":"Field","name":{"kind":"Name","value":"generated"}},{"kind":"Field","name":{"kind":"Name","value":"skipped"}},{"kind":"Field","name":{"kind":"Name","value":"failed"}},{"kind":"Field","name":{"kind":"Name","value":"message"}}]}}]}}]} as unknown as DocumentNode<GenerateDraftsForPendingMutation, GenerateDraftsForPendingMutationVariables>;
export const GenerateFollowUpDraftsDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"GenerateFollowUpDrafts"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"daysAfterInitial"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"Int"}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"daysAfterFollowUp1"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"Int"}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"daysAfterFollowUp2"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"Int"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"generateFollowUpDrafts"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"daysAfterInitial"},"value":{"kind":"Variable","name":{"kind":"Name","value":"daysAfterInitial"}}},{"kind":"Argument","name":{"kind":"Name","value":"daysAfterFollowUp1"},"value":{"kind":"Variable","name":{"kind":"Name","value":"daysAfterFollowUp1"}}},{"kind":"Argument","name":{"kind":"Name","value":"daysAfterFollowUp2"},"value":{"kind":"Variable","name":{"kind":"Name","value":"daysAfterFollowUp2"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"success"}},{"kind":"Field","name":{"kind":"Name","value":"generated"}},{"kind":"Field","name":{"kind":"Name","value":"skipped"}},{"kind":"Field","name":{"kind":"Name","value":"failed"}},{"kind":"Field","name":{"kind":"Name","value":"message"}}]}}]}}]} as unknown as DocumentNode<GenerateFollowUpDraftsMutation, GenerateFollowUpDraftsMutationVariables>;
export const ApproveAllDraftsDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"ApproveAllDrafts"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"draftIds"}},"type":{"kind":"NonNullType","type":{"kind":"ListType","type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"Int"}}}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"approveAllDrafts"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"draftIds"},"value":{"kind":"Variable","name":{"kind":"Name","value":"draftIds"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"success"}},{"kind":"Field","name":{"kind":"Name","value":"sent"}},{"kind":"Field","name":{"kind":"Name","value":"failed"}},{"kind":"Field","name":{"kind":"Name","value":"errors"}}]}}]}}]} as unknown as DocumentNode<ApproveAllDraftsMutation, ApproveAllDraftsMutationVariables>;
export const DismissAllDraftsDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"DismissAllDrafts"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"draftIds"}},"type":{"kind":"NonNullType","type":{"kind":"ListType","type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"Int"}}}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"dismissAllDrafts"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"draftIds"},"value":{"kind":"Variable","name":{"kind":"Name","value":"draftIds"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"success"}},{"kind":"Field","name":{"kind":"Name","value":"dismissed"}}]}}]}}]} as unknown as DocumentNode<DismissAllDraftsMutation, DismissAllDraftsMutationVariables>;
export const GetCompanyScrapedPostsDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"GetCompanyScrapedPosts"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"companySlug"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"companyScrapedPosts"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"companySlug"},"value":{"kind":"Variable","name":{"kind":"Name","value":"companySlug"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"companyName"}},{"kind":"Field","name":{"kind":"Name","value":"slug"}},{"kind":"Field","name":{"kind":"Name","value":"peopleCount"}},{"kind":"Field","name":{"kind":"Name","value":"postsCount"}},{"kind":"Field","name":{"kind":"Name","value":"posts"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"personName"}},{"kind":"Field","name":{"kind":"Name","value":"personLinkedinUrl"}},{"kind":"Field","name":{"kind":"Name","value":"personHeadline"}},{"kind":"Field","name":{"kind":"Name","value":"postUrl"}},{"kind":"Field","name":{"kind":"Name","value":"postText"}},{"kind":"Field","name":{"kind":"Name","value":"postedDate"}},{"kind":"Field","name":{"kind":"Name","value":"reactionsCount"}},{"kind":"Field","name":{"kind":"Name","value":"commentsCount"}},{"kind":"Field","name":{"kind":"Name","value":"repostsCount"}},{"kind":"Field","name":{"kind":"Name","value":"isRepost"}},{"kind":"Field","name":{"kind":"Name","value":"originalAuthor"}},{"kind":"Field","name":{"kind":"Name","value":"scrapedAt"}}]}}]}}]}}]} as unknown as DocumentNode<GetCompanyScrapedPostsQuery, GetCompanyScrapedPostsQueryVariables>;