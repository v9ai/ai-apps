export type Maybe<T> = T | null | undefined;
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
  analyzeProductICP: Product;
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


export type MutationAnalyzeProductIcpArgs = {
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
  highlights: Maybe<Scalars['JSON']['output']>;
  icpAnalysis: Maybe<Scalars['JSON']['output']>;
  icpAnalyzedAt: Maybe<Scalars['DateTime']['output']>;
  id: Scalars['Int']['output'];
  name: Scalars['String']['output'];
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
