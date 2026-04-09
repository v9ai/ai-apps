import type { GraphQLResolveInfo, GraphQLScalarType, GraphQLScalarTypeConfig } from 'graphql';
import type { GraphQLContext } from '../apollo/context';
export type Maybe<T> = T | null;
export type InputMaybe<T> = Maybe<T>;
export type Exact<T extends { [key: string]: unknown }> = { [K in keyof T]: T[K] };
export type MakeOptional<T, K extends keyof T> = Omit<T, K> & { [SubKey in K]?: Maybe<T[SubKey]> };
export type MakeMaybe<T, K extends keyof T> = Omit<T, K> & { [SubKey in K]: Maybe<T[SubKey]> };
export type MakeEmpty<T extends { [key: string]: unknown }, K extends keyof T> = { [_ in K]?: never };
export type Incremental<T> = T | { [P in keyof T]?: P extends ' $fragmentName' | '__typename' ? T[P] : never };
export type RequireFields<T, K extends keyof T> = Omit<T, K> & { [P in K]-?: NonNullable<T[P]> };
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
  linkedin_url?: InputMaybe<Scalars['String']['input']>;
  location?: InputMaybe<Scalars['String']['input']>;
  name: Scalars['String']['input'];
  website?: InputMaybe<Scalars['String']['input']>;
};

export type CompanyOrderBy =
  | 'CREATED_AT_DESC'
  | 'NAME_ASC'
  | 'SCORE_DESC'
  | 'UPDATED_AT_DESC';

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
  githubHandle: Maybe<Scalars['String']['output']>;
  id: Scalars['Int']['output'];
  isDecisionMaker: Maybe<Scalars['Boolean']['output']>;
  lastContactedAt: Maybe<Scalars['String']['output']>;
  lastName: Scalars['String']['output'];
  linkedinUrl: Maybe<Scalars['String']['output']>;
  nbExecutionTimeMs: Maybe<Scalars['Int']['output']>;
  nbFlags: Array<Scalars['String']['output']>;
  nbResult: Maybe<Scalars['String']['output']>;
  nbRetryToken: Maybe<Scalars['String']['output']>;
  nbStatus: Maybe<Scalars['String']['output']>;
  nbSuggestedCorrection: Maybe<Scalars['String']['output']>;
  nextTouchScore: Maybe<Scalars['Float']['output']>;
  position: Maybe<Scalars['String']['output']>;
  seniority: Maybe<Scalars['String']['output']>;
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

export type ContactMlScore = {
  __typename?: 'ContactMLScore';
  authorityScore: Scalars['Float']['output'];
  contactId: Scalars['Int']['output'];
  department: Scalars['String']['output'];
  dmReasons: Array<Scalars['String']['output']>;
  isDecisionMaker: Scalars['Boolean']['output'];
  seniority: Scalars['String']['output'];
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

export type ContactReminder = {
  __typename?: 'ContactReminder';
  contactId: Scalars['Int']['output'];
  createdAt: Scalars['String']['output'];
  id: Scalars['Int']['output'];
  note: Maybe<Scalars['String']['output']>;
  recurrence: Scalars['String']['output'];
  remindAt: Scalars['String']['output'];
  snoozedUntil: Maybe<Scalars['String']['output']>;
  status: Scalars['String']['output'];
  updatedAt: Scalars['String']['output'];
};

export type ContactReminderWithContact = {
  __typename?: 'ContactReminderWithContact';
  contact: Contact;
  reminder: ContactReminder;
};

export type ContactsResult = {
  __typename?: 'ContactsResult';
  contacts: Array<Contact>;
  totalCount: Scalars['Int']['output'];
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

export type CreateReminderInput = {
  contactId: Scalars['Int']['input'];
  note?: InputMaybe<Scalars['String']['input']>;
  recurrence?: InputMaybe<Scalars['String']['input']>;
  remindAt: Scalars['String']['input'];
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
  applyEmailPattern: ApplyEmailPatternResult;
  archiveEmail: ArchiveEmailResult;
  batchDetectIntent: BatchDetectIntentResult;
  blockCompany: Company;
  cancelCompanyEmails: CancelCompanyEmailsResult;
  cancelScheduledEmail: CancelEmailResult;
  classifyAllPending: ClassifyBatchResult;
  classifyReceivedEmail: ClassifyEmailResult;
  computeContactDeletionScores: BatchOperationResult;
  computeNextTouchScores: ComputeNextTouchScoresResult;
  createCompany: Company;
  createContact: Contact;
  createDraftCampaign: EmailCampaign;
  createEmailTemplate: EmailTemplate;
  createReminder: ContactReminder;
  deleteCampaign: DeleteCampaignResult;
  deleteCompanies: DeleteCompaniesResult;
  deleteCompany: DeleteCompanyResponse;
  deleteContact: DeleteContactResult;
  deleteEmailTemplate: DeleteEmailTemplateResult;
  deleteLinkedInPost: Scalars['Boolean']['output'];
  detectIntentSignals: DetectIntentResult;
  dismissReminder: ContactReminder;
  enhanceAllContacts: EnhanceAllContactsResult;
  enhanceCompany: EnhanceCompanyResponse;
  enrichAIContactProfile: EnrichAiContactResult;
  enrichAIContactsForCompany: EnrichAiContactsBulkResult;
  findCompanyEmails: EnhanceAllContactsResult;
  findContactEmail: FindContactEmailResult;
  flagContactsForDeletion: BatchOperationResult;
  /** Generate and store embeddings for companies missing them. Admin only. */
  generateCompanyEmbeddings: GenerateEmbeddingsResult;
  generateEmail: GenerateEmailResult;
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
  salescueAnalyze: SalescueAnalyzeResult;
  scheduleBatchEmails: ScheduleBatchResult;
  scheduleFollowUpBatch: FollowUpBatchResult;
  scoreContactsML: ScoreContactsMlResult;
  sendEmail: SendEmailResult;
  sendOutreachEmail: SendOutreachEmailResult;
  sendScheduledEmailNow: SendNowResult;
  snoozeReminder: ContactReminder;
  syncResendEmails: SyncResendResult;
  unarchiveEmail: ArchiveEmailResult;
  unblockCompany: Company;
  unflagContactForDeletion: Contact;
  unverifyCompanyContacts: UnverifyContactsResult;
  updateCampaign: EmailCampaign;
  updateCompany: Company;
  updateContact: Contact;
  updateEmailTemplate: EmailTemplate;
  updateReminder: ContactReminder;
  updateUserSettings: UserSettings;
  upsertLinkedInPost: LinkedInPost;
  upsertLinkedInPosts: UpsertLinkedInPostsResult;
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


export type MutationApplyEmailPatternArgs = {
  companyId: Scalars['Int']['input'];
};


export type MutationArchiveEmailArgs = {
  id: Scalars['Int']['input'];
};


export type MutationBatchDetectIntentArgs = {
  companyIds: Array<Scalars['Int']['input']>;
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


export type MutationCreateCompanyArgs = {
  input: CreateCompanyInput;
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


export type MutationDeleteContactArgs = {
  id: Scalars['Int']['input'];
};


export type MutationDeleteEmailTemplateArgs = {
  id: Scalars['Int']['input'];
};


export type MutationDeleteLinkedInPostArgs = {
  id: Scalars['Int']['input'];
};


export type MutationDetectIntentSignalsArgs = {
  companyId: Scalars['Int']['input'];
};


export type MutationDismissReminderArgs = {
  id: Scalars['Int']['input'];
};


export type MutationEnhanceCompanyArgs = {
  id?: InputMaybe<Scalars['Int']['input']>;
  key?: InputMaybe<Scalars['String']['input']>;
};


export type MutationEnrichAiContactProfileArgs = {
  contactId: Scalars['Int']['input'];
};


export type MutationEnrichAiContactsForCompanyArgs = {
  companyId: Scalars['Int']['input'];
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


export type MutationSalescueAnalyzeArgs = {
  modules?: InputMaybe<Array<SalescueModule>>;
  text: Scalars['String']['input'];
};


export type MutationScheduleBatchEmailsArgs = {
  input: ScheduleBatchEmailsInput;
};


export type MutationScheduleFollowUpBatchArgs = {
  input: FollowUpBatchInput;
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

export type PreviewEmailInput = {
  content: Scalars['String']['input'];
  drySend?: InputMaybe<Scalars['Boolean']['input']>;
  recipientEmail: Scalars['String']['input'];
  subject: Scalars['String']['input'];
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
  company_facts: Array<CompanyFact>;
  company_snapshots: Array<CompanySnapshot>;
  contact: Maybe<Contact>;
  contactByEmail: Maybe<Contact>;
  contactEmails: Array<ContactEmail>;
  contactReminders: Array<ContactReminder>;
  contacts: ContactsResult;
  dueReminders: Array<ContactReminderWithContact>;
  emailCampaign: Maybe<EmailCampaign>;
  emailCampaigns: EmailCampaignsResult;
  emailStats: EmailStats;
  emailTemplate: Maybe<EmailTemplate>;
  emailTemplates: EmailTemplatesResult;
  emailsNeedingFollowUp: FollowUpEmailsResult;
  findCompany: FindCompanyResult;
  intentDashboard: IntentDashboard;
  intentSignals: IntentSignalsResponse;
  linkedinPost: Maybe<LinkedInPost>;
  linkedinPosts: Array<LinkedInPost>;
  /** ML model health and stats */
  mlStats: MlStats;
  receivedEmail: Maybe<ReceivedEmail>;
  receivedEmails: ReceivedEmailsResult;
  /** Next best companies to contact based on ML scoring */
  recommendedCompanies: Array<RecommendedCompany>;
  /** Best contacts to reach within a company */
  recommendedContacts: Array<RankedContact>;
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


export type QueryContactArgs = {
  id: Scalars['Int']['input'];
};


export type QueryContactByEmailArgs = {
  email: Scalars['String']['input'];
};


export type QueryContactEmailsArgs = {
  contactId: Scalars['Int']['input'];
};


export type QueryContactRemindersArgs = {
  contactId: Scalars['Int']['input'];
};


export type QueryContactsArgs = {
  companyId?: InputMaybe<Scalars['Int']['input']>;
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
  search?: InputMaybe<Scalars['String']['input']>;
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


export type QueryEmailsNeedingFollowUpArgs = {
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
};


export type QueryFindCompanyArgs = {
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
  matchedContactId: Maybe<Scalars['Int']['output']>;
  matchedOutboundId: Maybe<Scalars['Int']['output']>;
  messageId: Maybe<Scalars['String']['output']>;
  receivedAt: Scalars['String']['output'];
  replyToEmails: Array<Scalars['String']['output']>;
  resendId: Scalars['String']['output'];
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

export type ScoreContactsMlResult = {
  __typename?: 'ScoreContactsMLResult';
  contactsScored: Scalars['Int']['output'];
  decisionMakersFound: Scalars['Int']['output'];
  message: Scalars['String']['output'];
  results: Array<ContactMlScore>;
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

export type SkillMatchResult = {
  __typename?: 'SkillMatchResult';
  claimedSkills: Array<Scalars['String']['output']>;
  githubLanguages: Array<Scalars['String']['output']>;
  matched: Scalars['Boolean']['output'];
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



export type ResolverTypeWrapper<T> = Promise<T> | T;


export type ResolverWithResolve<TResult, TParent, TContext, TArgs> = {
  resolve: ResolverFn<TResult, TParent, TContext, TArgs>;
};
export type Resolver<TResult, TParent = Record<PropertyKey, never>, TContext = Record<PropertyKey, never>, TArgs = Record<PropertyKey, never>> = ResolverFn<TResult, TParent, TContext, TArgs> | ResolverWithResolve<TResult, TParent, TContext, TArgs>;

export type ResolverFn<TResult, TParent, TContext, TArgs> = (
  parent: TParent,
  args: TArgs,
  context: TContext,
  info: GraphQLResolveInfo
) => Promise<TResult> | TResult;

export type SubscriptionSubscribeFn<TResult, TParent, TContext, TArgs> = (
  parent: TParent,
  args: TArgs,
  context: TContext,
  info: GraphQLResolveInfo
) => AsyncIterable<TResult> | Promise<AsyncIterable<TResult>>;

export type SubscriptionResolveFn<TResult, TParent, TContext, TArgs> = (
  parent: TParent,
  args: TArgs,
  context: TContext,
  info: GraphQLResolveInfo
) => TResult | Promise<TResult>;

export interface SubscriptionSubscriberObject<TResult, TKey extends string, TParent, TContext, TArgs> {
  subscribe: SubscriptionSubscribeFn<{ [key in TKey]: TResult }, TParent, TContext, TArgs>;
  resolve?: SubscriptionResolveFn<TResult, { [key in TKey]: TResult }, TContext, TArgs>;
}

export interface SubscriptionResolverObject<TResult, TParent, TContext, TArgs> {
  subscribe: SubscriptionSubscribeFn<any, TParent, TContext, TArgs>;
  resolve: SubscriptionResolveFn<TResult, any, TContext, TArgs>;
}

export type SubscriptionObject<TResult, TKey extends string, TParent, TContext, TArgs> =
  | SubscriptionSubscriberObject<TResult, TKey, TParent, TContext, TArgs>
  | SubscriptionResolverObject<TResult, TParent, TContext, TArgs>;

export type SubscriptionResolver<TResult, TKey extends string, TParent = Record<PropertyKey, never>, TContext = Record<PropertyKey, never>, TArgs = Record<PropertyKey, never>> =
  | ((...args: any[]) => SubscriptionObject<TResult, TKey, TParent, TContext, TArgs>)
  | SubscriptionObject<TResult, TKey, TParent, TContext, TArgs>;

export type TypeResolveFn<TTypes, TParent = Record<PropertyKey, never>, TContext = Record<PropertyKey, never>> = (
  parent: TParent,
  context: TContext,
  info: GraphQLResolveInfo
) => Maybe<TTypes> | Promise<Maybe<TTypes>>;

export type IsTypeOfResolverFn<T = Record<PropertyKey, never>, TContext = Record<PropertyKey, never>> = (obj: T, context: TContext, info: GraphQLResolveInfo) => boolean | Promise<boolean>;

export type NextResolverFn<T> = () => Promise<T>;

export type DirectiveResolverFn<TResult = Record<PropertyKey, never>, TParent = Record<PropertyKey, never>, TContext = Record<PropertyKey, never>, TArgs = Record<PropertyKey, never>> = (
  next: NextResolverFn<TResult>,
  parent: TParent,
  args: TArgs,
  context: TContext,
  info: GraphQLResolveInfo
) => TResult | Promise<TResult>;





/** Mapping between all available schema types and the resolvers types */
export type ResolversTypes = {
  AnalyzeCompanyResponse: ResolverTypeWrapper<Partial<AnalyzeCompanyResponse>>;
  AnalyzePostsResult: ResolverTypeWrapper<Partial<AnalyzePostsResult>>;
  ApplyEmailPatternResult: ResolverTypeWrapper<Partial<ApplyEmailPatternResult>>;
  ArchiveEmailResult: ResolverTypeWrapper<Partial<ArchiveEmailResult>>;
  BatchDetectIntentResult: ResolverTypeWrapper<Partial<BatchDetectIntentResult>>;
  BatchOperationResult: ResolverTypeWrapper<Partial<BatchOperationResult>>;
  BatchRecipientInput: ResolverTypeWrapper<Partial<BatchRecipientInput>>;
  Boolean: ResolverTypeWrapper<Partial<Scalars['Boolean']['output']>>;
  CancelCompanyEmailsResult: ResolverTypeWrapper<Partial<CancelCompanyEmailsResult>>;
  CancelEmailResult: ResolverTypeWrapper<Partial<CancelEmailResult>>;
  ClassifyBatchResult: ResolverTypeWrapper<Partial<ClassifyBatchResult>>;
  ClassifyEmailResult: ResolverTypeWrapper<Partial<ClassifyEmailResult>>;
  CompaniesResponse: ResolverTypeWrapper<Partial<CompaniesResponse>>;
  Company: ResolverTypeWrapper<Partial<Company>>;
  CompanyCategory: ResolverTypeWrapper<Partial<CompanyCategory>>;
  CompanyContactEmail: ResolverTypeWrapper<Partial<CompanyContactEmail>>;
  CompanyFact: ResolverTypeWrapper<Partial<CompanyFact>>;
  CompanyFactInput: ResolverTypeWrapper<Partial<CompanyFactInput>>;
  CompanyFilterInput: ResolverTypeWrapper<Partial<CompanyFilterInput>>;
  CompanyImportInput: ResolverTypeWrapper<Partial<CompanyImportInput>>;
  CompanyOrderBy: ResolverTypeWrapper<Partial<CompanyOrderBy>>;
  CompanySnapshot: ResolverTypeWrapper<Partial<CompanySnapshot>>;
  ComputeNextTouchScoresResult: ResolverTypeWrapper<Partial<ComputeNextTouchScoresResult>>;
  Contact: ResolverTypeWrapper<Partial<Contact>>;
  ContactAIGitHubRepo: ResolverTypeWrapper<Partial<ContactAiGitHubRepo>>;
  ContactAIProfile: ResolverTypeWrapper<Partial<ContactAiProfile>>;
  ContactEmail: ResolverTypeWrapper<Partial<ContactEmail>>;
  ContactInput: ResolverTypeWrapper<Partial<ContactInput>>;
  ContactMLScore: ResolverTypeWrapper<Partial<ContactMlScore>>;
  ContactNextTouch: ResolverTypeWrapper<Partial<ContactNextTouch>>;
  ContactReminder: ResolverTypeWrapper<Partial<ContactReminder>>;
  ContactReminderWithContact: ResolverTypeWrapper<Partial<ContactReminderWithContact>>;
  ContactsResult: ResolverTypeWrapper<Partial<ContactsResult>>;
  CreateCampaignInput: ResolverTypeWrapper<Partial<CreateCampaignInput>>;
  CreateCompanyInput: ResolverTypeWrapper<Partial<CreateCompanyInput>>;
  CreateContactInput: ResolverTypeWrapper<Partial<CreateContactInput>>;
  CreateEmailTemplateInput: ResolverTypeWrapper<Partial<CreateEmailTemplateInput>>;
  CreateReminderInput: ResolverTypeWrapper<Partial<CreateReminderInput>>;
  DataQualityScore: ResolverTypeWrapper<Partial<DataQualityScore>>;
  DateTime: ResolverTypeWrapper<Partial<Scalars['DateTime']['output']>>;
  DeleteCampaignResult: ResolverTypeWrapper<Partial<DeleteCampaignResult>>;
  DeleteCompaniesResult: ResolverTypeWrapper<Partial<DeleteCompaniesResult>>;
  DeleteCompanyResponse: ResolverTypeWrapper<Partial<DeleteCompanyResponse>>;
  DeleteContactResult: ResolverTypeWrapper<Partial<DeleteContactResult>>;
  DeleteEmailTemplateResult: ResolverTypeWrapper<Partial<DeleteEmailTemplateResult>>;
  DetectIntentResult: ResolverTypeWrapper<Partial<DetectIntentResult>>;
  EmailAddress: ResolverTypeWrapper<Partial<Scalars['EmailAddress']['output']>>;
  EmailCampaign: ResolverTypeWrapper<Partial<EmailCampaign>>;
  EmailCampaignsResult: ResolverTypeWrapper<Partial<EmailCampaignsResult>>;
  EmailPreview: ResolverTypeWrapper<Partial<EmailPreview>>;
  EmailStats: ResolverTypeWrapper<Partial<EmailStats>>;
  EmailTemplate: ResolverTypeWrapper<Partial<EmailTemplate>>;
  EmailTemplatesResult: ResolverTypeWrapper<Partial<EmailTemplatesResult>>;
  EnhanceAllContactsResult: ResolverTypeWrapper<Partial<EnhanceAllContactsResult>>;
  EnhanceCompanyResponse: ResolverTypeWrapper<Partial<EnhanceCompanyResponse>>;
  EnrichAIContactResult: ResolverTypeWrapper<Partial<EnrichAiContactResult>>;
  EnrichAIContactsBulkResult: ResolverTypeWrapper<Partial<EnrichAiContactsBulkResult>>;
  Evidence: ResolverTypeWrapper<Partial<Evidence>>;
  EvidenceInput: ResolverTypeWrapper<Partial<EvidenceInput>>;
  ExtractMethod: ResolverTypeWrapper<Partial<ExtractMethod>>;
  ExtractedSkill: ResolverTypeWrapper<Partial<ExtractedSkill>>;
  FindCompanyResult: ResolverTypeWrapper<Partial<FindCompanyResult>>;
  FindContactEmailResult: ResolverTypeWrapper<Partial<FindContactEmailResult>>;
  Float: ResolverTypeWrapper<Partial<Scalars['Float']['output']>>;
  FollowUpBatchInput: ResolverTypeWrapper<Partial<FollowUpBatchInput>>;
  FollowUpBatchResult: ResolverTypeWrapper<Partial<FollowUpBatchResult>>;
  FollowUpEmail: ResolverTypeWrapper<Partial<FollowUpEmail>>;
  FollowUpEmailsResult: ResolverTypeWrapper<Partial<FollowUpEmailsResult>>;
  GenerateEmailInput: ResolverTypeWrapper<Partial<GenerateEmailInput>>;
  GenerateEmailResult: ResolverTypeWrapper<Partial<GenerateEmailResult>>;
  GenerateEmbeddingsResult: ResolverTypeWrapper<Partial<GenerateEmbeddingsResult>>;
  GenerateReplyInput: ResolverTypeWrapper<Partial<GenerateReplyInput>>;
  GenerateReplyResult: ResolverTypeWrapper<Partial<GenerateReplyResult>>;
  ImportCompaniesResult: ResolverTypeWrapper<Partial<ImportCompaniesResult>>;
  ImportCompanyResult: ResolverTypeWrapper<Partial<ImportCompanyResult>>;
  ImportCompanyWithContactsInput: ResolverTypeWrapper<Partial<ImportCompanyWithContactsInput>>;
  ImportContactInput: ResolverTypeWrapper<Partial<ImportContactInput>>;
  ImportContactsResult: ResolverTypeWrapper<Partial<ImportContactsResult>>;
  ImportResendResult: ResolverTypeWrapper<Partial<ImportResendResult>>;
  Int: ResolverTypeWrapper<Partial<Scalars['Int']['output']>>;
  IntentDashboard: ResolverTypeWrapper<Partial<IntentDashboard>>;
  IntentScore: ResolverTypeWrapper<Partial<IntentScore>>;
  IntentSignal: ResolverTypeWrapper<Partial<IntentSignal>>;
  IntentSignalType: ResolverTypeWrapper<Partial<IntentSignalType>>;
  IntentSignalsResponse: ResolverTypeWrapper<Partial<IntentSignalsResponse>>;
  JSON: ResolverTypeWrapper<Partial<Scalars['JSON']['output']>>;
  LinkedInPost: ResolverTypeWrapper<Partial<LinkedInPost>>;
  LinkedInPostType: ResolverTypeWrapper<Partial<LinkedInPostType>>;
  MLStats: ResolverTypeWrapper<Partial<MlStats>>;
  MarkRepliedResult: ResolverTypeWrapper<Partial<MarkRepliedResult>>;
  MergeCompaniesResult: ResolverTypeWrapper<Partial<MergeCompaniesResult>>;
  MergeDuplicateContactsResult: ResolverTypeWrapper<Partial<MergeDuplicateContactsResult>>;
  Mutation: ResolverTypeWrapper<Record<PropertyKey, never>>;
  PreviewEmailInput: ResolverTypeWrapper<Partial<PreviewEmailInput>>;
  QualityGateResult: ResolverTypeWrapper<Partial<QualityGateResult>>;
  Query: ResolverTypeWrapper<Record<PropertyKey, never>>;
  RankedContact: ResolverTypeWrapper<Partial<RankedContact>>;
  ReceivedEmail: ResolverTypeWrapper<Partial<ReceivedEmail>>;
  ReceivedEmailsResult: ResolverTypeWrapper<Partial<ReceivedEmailsResult>>;
  RecommendedCompany: ResolverTypeWrapper<Partial<RecommendedCompany>>;
  RefreshIntentResult: ResolverTypeWrapper<Partial<RefreshIntentResult>>;
  ResendEmailDetail: ResolverTypeWrapper<Partial<ResendEmailDetail>>;
  SalescueAnalyzeResult: ResolverTypeWrapper<Partial<SalescueAnalyzeResult>>;
  SalescueAnomalyResult: ResolverTypeWrapper<Partial<SalescueAnomalyResult>>;
  SalescueBanditAlternative: ResolverTypeWrapper<Partial<SalescueBanditAlternative>>;
  SalescueBanditArm: ResolverTypeWrapper<Partial<SalescueBanditArm>>;
  SalescueBanditResult: ResolverTypeWrapper<Partial<SalescueBanditResult>>;
  SalescueCallResult: ResolverTypeWrapper<Partial<SalescueCallResult>>;
  SalescueCoachingCard: ResolverTypeWrapper<Partial<SalescueCoachingCard>>;
  SalescueCommitment: ResolverTypeWrapper<Partial<SalescueCommitment>>;
  SalescueEmailgenResult: ResolverTypeWrapper<Partial<SalescueEmailgenResult>>;
  SalescueEntitiesResult: ResolverTypeWrapper<Partial<SalescueEntitiesResult>>;
  SalescueEntity: ResolverTypeWrapper<Partial<SalescueEntity>>;
  SalescueGraphResult: ResolverTypeWrapper<Partial<SalescueGraphResult>>;
  SalescueGraphSignal: ResolverTypeWrapper<Partial<SalescueGraphSignal>>;
  SalescueHealth: ResolverTypeWrapper<Partial<SalescueHealth>>;
  SalescueICPDimensionFit: ResolverTypeWrapper<Partial<SalescueIcpDimensionFit>>;
  SalescueICPResult: ResolverTypeWrapper<Partial<SalescueIcpResult>>;
  SalescueIntentResult: ResolverTypeWrapper<Partial<SalescueIntentResult>>;
  SalescueIntentTrajectory: ResolverTypeWrapper<Partial<SalescueIntentTrajectory>>;
  SalescueModule: ResolverTypeWrapper<Partial<SalescueModule>>;
  SalescueModuleError: ResolverTypeWrapper<Partial<SalescueModuleError>>;
  SalescueObjectionResult: ResolverTypeWrapper<Partial<SalescueObjectionResult>>;
  SalescueReplyEvidence: ResolverTypeWrapper<Partial<SalescueReplyEvidence>>;
  SalescueReplyResult: ResolverTypeWrapper<Partial<SalescueReplyResult>>;
  SalescueScoreCategories: ResolverTypeWrapper<Partial<SalescueScoreCategories>>;
  SalescueScoreResult: ResolverTypeWrapper<Partial<SalescueScoreResult>>;
  SalescueScoreSignal: ResolverTypeWrapper<Partial<SalescueScoreSignal>>;
  SalescueSentimentEvidence: ResolverTypeWrapper<Partial<SalescueSentimentEvidence>>;
  SalescueSentimentResult: ResolverTypeWrapper<Partial<SalescueSentimentResult>>;
  SalescueSimilarCompany: ResolverTypeWrapper<Partial<SalescueSimilarCompany>>;
  SalescueSpamResult: ResolverTypeWrapper<Partial<SalescueSpamResult>>;
  SalescueSubjectRanking: ResolverTypeWrapper<Partial<SalescueSubjectRanking>>;
  SalescueSubjectResult: ResolverTypeWrapper<Partial<SalescueSubjectResult>>;
  SalescueSurvivalResult: ResolverTypeWrapper<Partial<SalescueSurvivalResult>>;
  SalescueTriggerEvent: ResolverTypeWrapper<Partial<SalescueTriggerEvent>>;
  SalescueTriggerTemporalFeatures: ResolverTypeWrapper<Partial<SalescueTriggerTemporalFeatures>>;
  SalescueTriggersResult: ResolverTypeWrapper<Partial<SalescueTriggersResult>>;
  SalescueTurningPoint: ResolverTypeWrapper<Partial<SalescueTurningPoint>>;
  ScheduleBatchEmailsInput: ResolverTypeWrapper<Partial<ScheduleBatchEmailsInput>>;
  ScheduleBatchResult: ResolverTypeWrapper<Partial<ScheduleBatchResult>>;
  ScoreContactsMLResult: ResolverTypeWrapper<Partial<ScoreContactsMlResult>>;
  SendEmailInput: ResolverTypeWrapper<Partial<SendEmailInput>>;
  SendEmailResult: ResolverTypeWrapper<Partial<SendEmailResult>>;
  SendNowResult: ResolverTypeWrapper<Partial<SendNowResult>>;
  SendOutreachEmailInput: ResolverTypeWrapper<Partial<SendOutreachEmailInput>>;
  SendOutreachEmailResult: ResolverTypeWrapper<Partial<SendOutreachEmailResult>>;
  SignalTypeCount: ResolverTypeWrapper<Partial<SignalTypeCount>>;
  SimilarCompanyResult: ResolverTypeWrapper<Partial<SimilarCompanyResult>>;
  SimilarPost: ResolverTypeWrapper<Partial<SimilarPost>>;
  SkillMatchResult: ResolverTypeWrapper<Partial<SkillMatchResult>>;
  SourceType: ResolverTypeWrapper<Partial<SourceType>>;
  String: ResolverTypeWrapper<Partial<Scalars['String']['output']>>;
  SyncResendResult: ResolverTypeWrapper<Partial<SyncResendResult>>;
  URL: ResolverTypeWrapper<Partial<Scalars['URL']['output']>>;
  UnverifyContactsResult: ResolverTypeWrapper<Partial<UnverifyContactsResult>>;
  UpdateCampaignInput: ResolverTypeWrapper<Partial<UpdateCampaignInput>>;
  UpdateCompanyInput: ResolverTypeWrapper<Partial<UpdateCompanyInput>>;
  UpdateContactInput: ResolverTypeWrapper<Partial<UpdateContactInput>>;
  UpdateEmailTemplateInput: ResolverTypeWrapper<Partial<UpdateEmailTemplateInput>>;
  UpdateReminderInput: ResolverTypeWrapper<Partial<UpdateReminderInput>>;
  Upload: ResolverTypeWrapper<Partial<Scalars['Upload']['output']>>;
  UpsertLinkedInPostInput: ResolverTypeWrapper<Partial<UpsertLinkedInPostInput>>;
  UpsertLinkedInPostsResult: ResolverTypeWrapper<Partial<UpsertLinkedInPostsResult>>;
  UserSettings: ResolverTypeWrapper<Partial<UserSettings>>;
  UserSettingsInput: ResolverTypeWrapper<Partial<UserSettingsInput>>;
  VerifyAuthenticityResult: ResolverTypeWrapper<Partial<VerifyAuthenticityResult>>;
  VerifyCompanyContactsResult: ResolverTypeWrapper<Partial<VerifyCompanyContactsResult>>;
  VerifyEmailResult: ResolverTypeWrapper<Partial<VerifyEmailResult>>;
  WarcPointer: ResolverTypeWrapper<Partial<WarcPointer>>;
  WarcPointerInput: ResolverTypeWrapper<Partial<WarcPointerInput>>;
};

/** Mapping between all available schema types and the resolvers parents */
export type ResolversParentTypes = {
  AnalyzeCompanyResponse: Partial<AnalyzeCompanyResponse>;
  AnalyzePostsResult: Partial<AnalyzePostsResult>;
  ApplyEmailPatternResult: Partial<ApplyEmailPatternResult>;
  ArchiveEmailResult: Partial<ArchiveEmailResult>;
  BatchDetectIntentResult: Partial<BatchDetectIntentResult>;
  BatchOperationResult: Partial<BatchOperationResult>;
  BatchRecipientInput: Partial<BatchRecipientInput>;
  Boolean: Partial<Scalars['Boolean']['output']>;
  CancelCompanyEmailsResult: Partial<CancelCompanyEmailsResult>;
  CancelEmailResult: Partial<CancelEmailResult>;
  ClassifyBatchResult: Partial<ClassifyBatchResult>;
  ClassifyEmailResult: Partial<ClassifyEmailResult>;
  CompaniesResponse: Partial<CompaniesResponse>;
  Company: Partial<Company>;
  CompanyContactEmail: Partial<CompanyContactEmail>;
  CompanyFact: Partial<CompanyFact>;
  CompanyFactInput: Partial<CompanyFactInput>;
  CompanyFilterInput: Partial<CompanyFilterInput>;
  CompanyImportInput: Partial<CompanyImportInput>;
  CompanySnapshot: Partial<CompanySnapshot>;
  ComputeNextTouchScoresResult: Partial<ComputeNextTouchScoresResult>;
  Contact: Partial<Contact>;
  ContactAIGitHubRepo: Partial<ContactAiGitHubRepo>;
  ContactAIProfile: Partial<ContactAiProfile>;
  ContactEmail: Partial<ContactEmail>;
  ContactInput: Partial<ContactInput>;
  ContactMLScore: Partial<ContactMlScore>;
  ContactNextTouch: Partial<ContactNextTouch>;
  ContactReminder: Partial<ContactReminder>;
  ContactReminderWithContact: Partial<ContactReminderWithContact>;
  ContactsResult: Partial<ContactsResult>;
  CreateCampaignInput: Partial<CreateCampaignInput>;
  CreateCompanyInput: Partial<CreateCompanyInput>;
  CreateContactInput: Partial<CreateContactInput>;
  CreateEmailTemplateInput: Partial<CreateEmailTemplateInput>;
  CreateReminderInput: Partial<CreateReminderInput>;
  DataQualityScore: Partial<DataQualityScore>;
  DateTime: Partial<Scalars['DateTime']['output']>;
  DeleteCampaignResult: Partial<DeleteCampaignResult>;
  DeleteCompaniesResult: Partial<DeleteCompaniesResult>;
  DeleteCompanyResponse: Partial<DeleteCompanyResponse>;
  DeleteContactResult: Partial<DeleteContactResult>;
  DeleteEmailTemplateResult: Partial<DeleteEmailTemplateResult>;
  DetectIntentResult: Partial<DetectIntentResult>;
  EmailAddress: Partial<Scalars['EmailAddress']['output']>;
  EmailCampaign: Partial<EmailCampaign>;
  EmailCampaignsResult: Partial<EmailCampaignsResult>;
  EmailPreview: Partial<EmailPreview>;
  EmailStats: Partial<EmailStats>;
  EmailTemplate: Partial<EmailTemplate>;
  EmailTemplatesResult: Partial<EmailTemplatesResult>;
  EnhanceAllContactsResult: Partial<EnhanceAllContactsResult>;
  EnhanceCompanyResponse: Partial<EnhanceCompanyResponse>;
  EnrichAIContactResult: Partial<EnrichAiContactResult>;
  EnrichAIContactsBulkResult: Partial<EnrichAiContactsBulkResult>;
  Evidence: Partial<Evidence>;
  EvidenceInput: Partial<EvidenceInput>;
  ExtractedSkill: Partial<ExtractedSkill>;
  FindCompanyResult: Partial<FindCompanyResult>;
  FindContactEmailResult: Partial<FindContactEmailResult>;
  Float: Partial<Scalars['Float']['output']>;
  FollowUpBatchInput: Partial<FollowUpBatchInput>;
  FollowUpBatchResult: Partial<FollowUpBatchResult>;
  FollowUpEmail: Partial<FollowUpEmail>;
  FollowUpEmailsResult: Partial<FollowUpEmailsResult>;
  GenerateEmailInput: Partial<GenerateEmailInput>;
  GenerateEmailResult: Partial<GenerateEmailResult>;
  GenerateEmbeddingsResult: Partial<GenerateEmbeddingsResult>;
  GenerateReplyInput: Partial<GenerateReplyInput>;
  GenerateReplyResult: Partial<GenerateReplyResult>;
  ImportCompaniesResult: Partial<ImportCompaniesResult>;
  ImportCompanyResult: Partial<ImportCompanyResult>;
  ImportCompanyWithContactsInput: Partial<ImportCompanyWithContactsInput>;
  ImportContactInput: Partial<ImportContactInput>;
  ImportContactsResult: Partial<ImportContactsResult>;
  ImportResendResult: Partial<ImportResendResult>;
  Int: Partial<Scalars['Int']['output']>;
  IntentDashboard: Partial<IntentDashboard>;
  IntentScore: Partial<IntentScore>;
  IntentSignal: Partial<IntentSignal>;
  IntentSignalsResponse: Partial<IntentSignalsResponse>;
  JSON: Partial<Scalars['JSON']['output']>;
  LinkedInPost: Partial<LinkedInPost>;
  MLStats: Partial<MlStats>;
  MarkRepliedResult: Partial<MarkRepliedResult>;
  MergeCompaniesResult: Partial<MergeCompaniesResult>;
  MergeDuplicateContactsResult: Partial<MergeDuplicateContactsResult>;
  Mutation: Record<PropertyKey, never>;
  PreviewEmailInput: Partial<PreviewEmailInput>;
  QualityGateResult: Partial<QualityGateResult>;
  Query: Record<PropertyKey, never>;
  RankedContact: Partial<RankedContact>;
  ReceivedEmail: Partial<ReceivedEmail>;
  ReceivedEmailsResult: Partial<ReceivedEmailsResult>;
  RecommendedCompany: Partial<RecommendedCompany>;
  RefreshIntentResult: Partial<RefreshIntentResult>;
  ResendEmailDetail: Partial<ResendEmailDetail>;
  SalescueAnalyzeResult: Partial<SalescueAnalyzeResult>;
  SalescueAnomalyResult: Partial<SalescueAnomalyResult>;
  SalescueBanditAlternative: Partial<SalescueBanditAlternative>;
  SalescueBanditArm: Partial<SalescueBanditArm>;
  SalescueBanditResult: Partial<SalescueBanditResult>;
  SalescueCallResult: Partial<SalescueCallResult>;
  SalescueCoachingCard: Partial<SalescueCoachingCard>;
  SalescueCommitment: Partial<SalescueCommitment>;
  SalescueEmailgenResult: Partial<SalescueEmailgenResult>;
  SalescueEntitiesResult: Partial<SalescueEntitiesResult>;
  SalescueEntity: Partial<SalescueEntity>;
  SalescueGraphResult: Partial<SalescueGraphResult>;
  SalescueGraphSignal: Partial<SalescueGraphSignal>;
  SalescueHealth: Partial<SalescueHealth>;
  SalescueICPDimensionFit: Partial<SalescueIcpDimensionFit>;
  SalescueICPResult: Partial<SalescueIcpResult>;
  SalescueIntentResult: Partial<SalescueIntentResult>;
  SalescueIntentTrajectory: Partial<SalescueIntentTrajectory>;
  SalescueModuleError: Partial<SalescueModuleError>;
  SalescueObjectionResult: Partial<SalescueObjectionResult>;
  SalescueReplyEvidence: Partial<SalescueReplyEvidence>;
  SalescueReplyResult: Partial<SalescueReplyResult>;
  SalescueScoreCategories: Partial<SalescueScoreCategories>;
  SalescueScoreResult: Partial<SalescueScoreResult>;
  SalescueScoreSignal: Partial<SalescueScoreSignal>;
  SalescueSentimentEvidence: Partial<SalescueSentimentEvidence>;
  SalescueSentimentResult: Partial<SalescueSentimentResult>;
  SalescueSimilarCompany: Partial<SalescueSimilarCompany>;
  SalescueSpamResult: Partial<SalescueSpamResult>;
  SalescueSubjectRanking: Partial<SalescueSubjectRanking>;
  SalescueSubjectResult: Partial<SalescueSubjectResult>;
  SalescueSurvivalResult: Partial<SalescueSurvivalResult>;
  SalescueTriggerEvent: Partial<SalescueTriggerEvent>;
  SalescueTriggerTemporalFeatures: Partial<SalescueTriggerTemporalFeatures>;
  SalescueTriggersResult: Partial<SalescueTriggersResult>;
  SalescueTurningPoint: Partial<SalescueTurningPoint>;
  ScheduleBatchEmailsInput: Partial<ScheduleBatchEmailsInput>;
  ScheduleBatchResult: Partial<ScheduleBatchResult>;
  ScoreContactsMLResult: Partial<ScoreContactsMlResult>;
  SendEmailInput: Partial<SendEmailInput>;
  SendEmailResult: Partial<SendEmailResult>;
  SendNowResult: Partial<SendNowResult>;
  SendOutreachEmailInput: Partial<SendOutreachEmailInput>;
  SendOutreachEmailResult: Partial<SendOutreachEmailResult>;
  SignalTypeCount: Partial<SignalTypeCount>;
  SimilarCompanyResult: Partial<SimilarCompanyResult>;
  SimilarPost: Partial<SimilarPost>;
  SkillMatchResult: Partial<SkillMatchResult>;
  String: Partial<Scalars['String']['output']>;
  SyncResendResult: Partial<SyncResendResult>;
  URL: Partial<Scalars['URL']['output']>;
  UnverifyContactsResult: Partial<UnverifyContactsResult>;
  UpdateCampaignInput: Partial<UpdateCampaignInput>;
  UpdateCompanyInput: Partial<UpdateCompanyInput>;
  UpdateContactInput: Partial<UpdateContactInput>;
  UpdateEmailTemplateInput: Partial<UpdateEmailTemplateInput>;
  UpdateReminderInput: Partial<UpdateReminderInput>;
  Upload: Partial<Scalars['Upload']['output']>;
  UpsertLinkedInPostInput: Partial<UpsertLinkedInPostInput>;
  UpsertLinkedInPostsResult: Partial<UpsertLinkedInPostsResult>;
  UserSettings: Partial<UserSettings>;
  UserSettingsInput: Partial<UserSettingsInput>;
  VerifyAuthenticityResult: Partial<VerifyAuthenticityResult>;
  VerifyCompanyContactsResult: Partial<VerifyCompanyContactsResult>;
  VerifyEmailResult: Partial<VerifyEmailResult>;
  WarcPointer: Partial<WarcPointer>;
  WarcPointerInput: Partial<WarcPointerInput>;
};

export type AnalyzeCompanyResponseResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['AnalyzeCompanyResponse'] = ResolversParentTypes['AnalyzeCompanyResponse']> = {
  companyId?: Resolver<Maybe<ResolversTypes['Int']>, ParentType, ContextType>;
  companyKey?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  message?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  success?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
};

export type AnalyzePostsResultResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['AnalyzePostsResult'] = ResolversParentTypes['AnalyzePostsResult']> = {
  analyzed?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  errors?: Resolver<Array<ResolversTypes['String']>, ParentType, ContextType>;
  failed?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  success?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
};

export type ApplyEmailPatternResultResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['ApplyEmailPatternResult'] = ResolversParentTypes['ApplyEmailPatternResult']> = {
  contacts?: Resolver<Array<ResolversTypes['Contact']>, ParentType, ContextType>;
  contactsUpdated?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  message?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  pattern?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  success?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
};

export type ArchiveEmailResultResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['ArchiveEmailResult'] = ResolversParentTypes['ArchiveEmailResult']> = {
  message?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  success?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
};

export type BatchDetectIntentResultResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['BatchDetectIntentResult'] = ResolversParentTypes['BatchDetectIntentResult']> = {
  errors?: Resolver<Array<ResolversTypes['String']>, ParentType, ContextType>;
  processed?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  signalsDetected?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  success?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
};

export type BatchOperationResultResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['BatchOperationResult'] = ResolversParentTypes['BatchOperationResult']> = {
  affected?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  message?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  success?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
};

export type CancelCompanyEmailsResultResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['CancelCompanyEmailsResult'] = ResolversParentTypes['CancelCompanyEmailsResult']> = {
  cancelledCount?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  failedCount?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  message?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  success?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
};

export type CancelEmailResultResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['CancelEmailResult'] = ResolversParentTypes['CancelEmailResult']> = {
  error?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  success?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
};

export type ClassifyBatchResultResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['ClassifyBatchResult'] = ResolversParentTypes['ClassifyBatchResult']> = {
  classified?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  message?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  success?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
};

export type ClassifyEmailResultResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['ClassifyEmailResult'] = ResolversParentTypes['ClassifyEmailResult']> = {
  classification?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  confidence?: Resolver<Maybe<ResolversTypes['Float']>, ParentType, ContextType>;
  matchedContactId?: Resolver<Maybe<ResolversTypes['Int']>, ParentType, ContextType>;
  success?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
};

export type CompaniesResponseResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['CompaniesResponse'] = ResolversParentTypes['CompaniesResponse']> = {
  companies?: Resolver<Array<ResolversTypes['Company']>, ParentType, ContextType>;
  totalCount?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
};

export type CompanyResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['Company'] = ResolversParentTypes['Company']> = {
  ai_classification_confidence?: Resolver<ResolversTypes['Float'], ParentType, ContextType>;
  ai_classification_reason?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  ai_tier?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  blocked?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  category?: Resolver<ResolversTypes['CompanyCategory'], ParentType, ContextType>;
  contacts?: Resolver<Array<ResolversTypes['Contact']>, ParentType, ContextType>;
  created_at?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  dataQuality?: Resolver<ResolversTypes['DataQualityScore'], ParentType, ContextType>;
  deep_analysis?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  description?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  email?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  emailsList?: Resolver<Array<ResolversTypes['String']>, ParentType, ContextType>;
  facts?: Resolver<Array<ResolversTypes['CompanyFact']>, ParentType, ContextType, Partial<CompanyFactsArgs>>;
  facts_count?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  githubUrl?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  icpSimilarity?: Resolver<Maybe<ResolversTypes['Float']>, ParentType, ContextType>;
  id?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  industries?: Resolver<Array<ResolversTypes['String']>, ParentType, ContextType>;
  industry?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  intentScore?: Resolver<ResolversTypes['Float'], ParentType, ContextType>;
  intentScoreDetails?: Resolver<Maybe<ResolversTypes['IntentScore']>, ParentType, ContextType>;
  intentScoreUpdatedAt?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  intentSignalsCount?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  job_board_url?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  key?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  last_seen_capture_timestamp?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  last_seen_crawl_id?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  last_seen_source_url?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  linkedin_url?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  location?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  logo_url?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  name?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  qualityGate?: Resolver<ResolversTypes['QualityGateResult'], ParentType, ContextType>;
  rankScore?: Resolver<Maybe<ResolversTypes['Float']>, ParentType, ContextType>;
  score?: Resolver<ResolversTypes['Float'], ParentType, ContextType>;
  score_reasons?: Resolver<Array<ResolversTypes['String']>, ParentType, ContextType>;
  service_taxonomy?: Resolver<Array<ResolversTypes['String']>, ParentType, ContextType>;
  services?: Resolver<Array<ResolversTypes['String']>, ParentType, ContextType>;
  size?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  snapshots?: Resolver<Array<ResolversTypes['CompanySnapshot']>, ParentType, ContextType, Partial<CompanySnapshotsArgs>>;
  snapshots_count?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  tags?: Resolver<Array<ResolversTypes['String']>, ParentType, ContextType>;
  updated_at?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  website?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
};

export type CompanyContactEmailResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['CompanyContactEmail'] = ResolversParentTypes['CompanyContactEmail']> = {
  contactFirstName?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  contactId?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  contactLastName?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  contactPosition?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  createdAt?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  deliveredAt?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  errorMessage?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  followupStatus?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  fromEmail?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  id?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  openedAt?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  recipientName?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  replyReceived?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  resendId?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  scheduledAt?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  sentAt?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  sequenceNumber?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  sequenceType?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  status?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  subject?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  textContent?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  toEmails?: Resolver<Array<ResolversTypes['String']>, ParentType, ContextType>;
  updatedAt?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
};

export type CompanyFactResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['CompanyFact'] = ResolversParentTypes['CompanyFact']> = {
  company_id?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  confidence?: Resolver<ResolversTypes['Float'], ParentType, ContextType>;
  created_at?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  evidence?: Resolver<ResolversTypes['Evidence'], ParentType, ContextType>;
  field?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  id?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  normalized_value?: Resolver<Maybe<ResolversTypes['JSON']>, ParentType, ContextType>;
  value_json?: Resolver<Maybe<ResolversTypes['JSON']>, ParentType, ContextType>;
  value_text?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
};

export type CompanySnapshotResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['CompanySnapshot'] = ResolversParentTypes['CompanySnapshot']> = {
  capture_timestamp?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  company_id?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  content_hash?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  crawl_id?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  created_at?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  evidence?: Resolver<ResolversTypes['Evidence'], ParentType, ContextType>;
  extracted?: Resolver<Maybe<ResolversTypes['JSON']>, ParentType, ContextType>;
  fetched_at?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  http_status?: Resolver<Maybe<ResolversTypes['Int']>, ParentType, ContextType>;
  id?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  jsonld?: Resolver<Maybe<ResolversTypes['JSON']>, ParentType, ContextType>;
  mime?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  source_url?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  text_sample?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
};

export type ComputeNextTouchScoresResultResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['ComputeNextTouchScoresResult'] = ResolversParentTypes['ComputeNextTouchScoresResult']> = {
  contactsUpdated?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  message?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  success?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  topContacts?: Resolver<Array<ResolversTypes['ContactNextTouch']>, ParentType, ContextType>;
};

export type ContactResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['Contact'] = ResolversParentTypes['Contact']> = {
  aiProfile?: Resolver<Maybe<ResolversTypes['ContactAIProfile']>, ParentType, ContextType>;
  authenticityFlags?: Resolver<Array<ResolversTypes['String']>, ParentType, ContextType>;
  authenticityScore?: Resolver<Maybe<ResolversTypes['Float']>, ParentType, ContextType>;
  authenticityVerdict?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  authorityScore?: Resolver<Maybe<ResolversTypes['Float']>, ParentType, ContextType>;
  bouncedEmails?: Resolver<Array<ResolversTypes['String']>, ParentType, ContextType>;
  company?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  companyId?: Resolver<Maybe<ResolversTypes['Int']>, ParentType, ContextType>;
  createdAt?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  deletionFlaggedAt?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  deletionReasons?: Resolver<Array<ResolversTypes['String']>, ParentType, ContextType>;
  deletionScore?: Resolver<Maybe<ResolversTypes['Float']>, ParentType, ContextType>;
  department?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  dmReasons?: Resolver<Array<ResolversTypes['String']>, ParentType, ContextType>;
  doNotContact?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  email?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  emailVerified?: Resolver<Maybe<ResolversTypes['Boolean']>, ParentType, ContextType>;
  emails?: Resolver<Array<ResolversTypes['String']>, ParentType, ContextType>;
  firstName?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  githubHandle?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  id?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  isDecisionMaker?: Resolver<Maybe<ResolversTypes['Boolean']>, ParentType, ContextType>;
  lastContactedAt?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  lastName?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  linkedinUrl?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  nbExecutionTimeMs?: Resolver<Maybe<ResolversTypes['Int']>, ParentType, ContextType>;
  nbFlags?: Resolver<Array<ResolversTypes['String']>, ParentType, ContextType>;
  nbResult?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  nbRetryToken?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  nbStatus?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  nbSuggestedCorrection?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  nextTouchScore?: Resolver<Maybe<ResolversTypes['Float']>, ParentType, ContextType>;
  position?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  seniority?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  tags?: Resolver<Array<ResolversTypes['String']>, ParentType, ContextType>;
  telegramHandle?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  toBeDeleted?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  updatedAt?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  userId?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
};

export type ContactAiGitHubRepoResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['ContactAIGitHubRepo'] = ResolversParentTypes['ContactAIGitHubRepo']> = {
  description?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  name?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  stars?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  topics?: Resolver<Array<ResolversTypes['String']>, ParentType, ContextType>;
};

export type ContactAiProfileResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['ContactAIProfile'] = ResolversParentTypes['ContactAIProfile']> = {
  enrichedAt?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  experienceLevel?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  githubAiRepos?: Resolver<Array<ResolversTypes['ContactAIGitHubRepo']>, ParentType, ContextType>;
  githubBio?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  githubTopLanguages?: Resolver<Array<ResolversTypes['String']>, ParentType, ContextType>;
  githubTotalStars?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  linkedinBio?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  linkedinHeadline?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  researchAreas?: Resolver<Array<ResolversTypes['String']>, ParentType, ContextType>;
  skills?: Resolver<Array<ResolversTypes['String']>, ParentType, ContextType>;
  specialization?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  synthesisConfidence?: Resolver<ResolversTypes['Float'], ParentType, ContextType>;
  synthesisRationale?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  trigger?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
};

export type ContactEmailResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['ContactEmail'] = ResolversParentTypes['ContactEmail']> = {
  attachments?: Resolver<Maybe<ResolversTypes['JSON']>, ParentType, ContextType>;
  ccEmails?: Resolver<Array<ResolversTypes['String']>, ParentType, ContextType>;
  companyId?: Resolver<Maybe<ResolversTypes['Int']>, ParentType, ContextType>;
  contactId?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  createdAt?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  deliveredAt?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  errorMessage?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  followupStatus?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  fromEmail?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  headers?: Resolver<Maybe<ResolversTypes['JSON']>, ParentType, ContextType>;
  htmlContent?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  id?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  idempotencyKey?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  openedAt?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  parentEmailId?: Resolver<Maybe<ResolversTypes['Int']>, ParentType, ContextType>;
  recipientName?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  replyReceived?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  replyReceivedAt?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  replyToEmails?: Resolver<Array<ResolversTypes['String']>, ParentType, ContextType>;
  resendId?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  scheduledAt?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  sentAt?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  sequenceNumber?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  sequenceType?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  status?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  subject?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  tags?: Resolver<Array<ResolversTypes['String']>, ParentType, ContextType>;
  textContent?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  toEmails?: Resolver<Array<ResolversTypes['String']>, ParentType, ContextType>;
  updatedAt?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
};

export type ContactMlScoreResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['ContactMLScore'] = ResolversParentTypes['ContactMLScore']> = {
  authorityScore?: Resolver<ResolversTypes['Float'], ParentType, ContextType>;
  contactId?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  department?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  dmReasons?: Resolver<Array<ResolversTypes['String']>, ParentType, ContextType>;
  isDecisionMaker?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  seniority?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
};

export type ContactNextTouchResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['ContactNextTouch'] = ResolversParentTypes['ContactNextTouch']> = {
  contactId?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  firstName?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  lastContactedAt?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  lastName?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  nextTouchScore?: Resolver<ResolversTypes['Float'], ParentType, ContextType>;
  position?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
};

export type ContactReminderResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['ContactReminder'] = ResolversParentTypes['ContactReminder']> = {
  contactId?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  createdAt?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  id?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  note?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  recurrence?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  remindAt?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  snoozedUntil?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  status?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  updatedAt?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
};

export type ContactReminderWithContactResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['ContactReminderWithContact'] = ResolversParentTypes['ContactReminderWithContact']> = {
  contact?: Resolver<ResolversTypes['Contact'], ParentType, ContextType>;
  reminder?: Resolver<ResolversTypes['ContactReminder'], ParentType, ContextType>;
};

export type ContactsResultResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['ContactsResult'] = ResolversParentTypes['ContactsResult']> = {
  contacts?: Resolver<Array<ResolversTypes['Contact']>, ParentType, ContextType>;
  totalCount?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
};

export type DataQualityScoreResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['DataQualityScore'] = ResolversParentTypes['DataQualityScore']> = {
  completeness?: Resolver<ResolversTypes['Float'], ParentType, ContextType>;
  composite?: Resolver<ResolversTypes['Float'], ParentType, ContextType>;
  freshness?: Resolver<ResolversTypes['Float'], ParentType, ContextType>;
  missingFields?: Resolver<Array<ResolversTypes['String']>, ParentType, ContextType>;
  staleFields?: Resolver<Array<ResolversTypes['String']>, ParentType, ContextType>;
};

export interface DateTimeScalarConfig extends GraphQLScalarTypeConfig<ResolversTypes['DateTime'], any> {
  name: 'DateTime';
}

export type DeleteCampaignResultResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['DeleteCampaignResult'] = ResolversParentTypes['DeleteCampaignResult']> = {
  message?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  success?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
};

export type DeleteCompaniesResultResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['DeleteCompaniesResult'] = ResolversParentTypes['DeleteCompaniesResult']> = {
  deleted?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  message?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  success?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
};

export type DeleteCompanyResponseResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['DeleteCompanyResponse'] = ResolversParentTypes['DeleteCompanyResponse']> = {
  message?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  success?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
};

export type DeleteContactResultResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['DeleteContactResult'] = ResolversParentTypes['DeleteContactResult']> = {
  message?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  success?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
};

export type DeleteEmailTemplateResultResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['DeleteEmailTemplateResult'] = ResolversParentTypes['DeleteEmailTemplateResult']> = {
  message?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  success?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
};

export type DetectIntentResultResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['DetectIntentResult'] = ResolversParentTypes['DetectIntentResult']> = {
  intentScore?: Resolver<Maybe<ResolversTypes['Float']>, ParentType, ContextType>;
  message?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  signalsDetected?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  success?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
};

export interface EmailAddressScalarConfig extends GraphQLScalarTypeConfig<ResolversTypes['EmailAddress'], any> {
  name: 'EmailAddress';
}

export type EmailCampaignResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['EmailCampaign'] = ResolversParentTypes['EmailCampaign']> = {
  addAntiThreadHeader?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  addUnsubscribeHeaders?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  companyId?: Resolver<Maybe<ResolversTypes['Int']>, ParentType, ContextType>;
  createdAt?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  createdBy?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  delayDays?: Resolver<Maybe<ResolversTypes['JSON']>, ParentType, ContextType>;
  emailsFailed?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  emailsScheduled?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  emailsSent?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  fromEmail?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  id?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  mode?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  name?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  recipientEmails?: Resolver<Array<ResolversTypes['String']>, ParentType, ContextType>;
  replyTo?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  sequence?: Resolver<Maybe<ResolversTypes['JSON']>, ParentType, ContextType>;
  startAt?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  status?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  totalEmailsPlanned?: Resolver<Maybe<ResolversTypes['Int']>, ParentType, ContextType>;
  totalRecipients?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  unsubscribeUrl?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  updatedAt?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
};

export type EmailCampaignsResultResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['EmailCampaignsResult'] = ResolversParentTypes['EmailCampaignsResult']> = {
  campaigns?: Resolver<Array<ResolversTypes['EmailCampaign']>, ParentType, ContextType>;
  totalCount?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
};

export type EmailPreviewResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['EmailPreview'] = ResolversParentTypes['EmailPreview']> = {
  drySendResult?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  htmlContent?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  subject?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
};

export type EmailStatsResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['EmailStats'] = ResolversParentTypes['EmailStats']> = {
  bouncedThisMonth?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  bouncedThisWeek?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  bouncedToday?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  deliveredThisMonth?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  deliveredThisWeek?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  deliveredToday?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  openedThisMonth?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  openedThisWeek?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  openedToday?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  scheduledFuture?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  scheduledToday?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  sentThisMonth?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  sentThisWeek?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  sentToday?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  totalSent?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
};

export type EmailTemplateResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['EmailTemplate'] = ResolversParentTypes['EmailTemplate']> = {
  category?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  createdAt?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  description?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  htmlContent?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  id?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  isActive?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  name?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  subject?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  tags?: Resolver<Array<ResolversTypes['String']>, ParentType, ContextType>;
  textContent?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  updatedAt?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  userId?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  variables?: Resolver<Array<ResolversTypes['String']>, ParentType, ContextType>;
};

export type EmailTemplatesResultResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['EmailTemplatesResult'] = ResolversParentTypes['EmailTemplatesResult']> = {
  templates?: Resolver<Array<ResolversTypes['EmailTemplate']>, ParentType, ContextType>;
  totalCount?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
};

export type EnhanceAllContactsResultResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['EnhanceAllContactsResult'] = ResolversParentTypes['EnhanceAllContactsResult']> = {
  companiesProcessed?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  errors?: Resolver<Array<ResolversTypes['String']>, ParentType, ContextType>;
  message?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  success?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  totalContactsProcessed?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  totalEmailsFound?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
};

export type EnhanceCompanyResponseResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['EnhanceCompanyResponse'] = ResolversParentTypes['EnhanceCompanyResponse']> = {
  companyId?: Resolver<Maybe<ResolversTypes['Int']>, ParentType, ContextType>;
  companyKey?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  message?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  success?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
};

export type EnrichAiContactResultResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['EnrichAIContactResult'] = ResolversParentTypes['EnrichAIContactResult']> = {
  aiProfile?: Resolver<Maybe<ResolversTypes['ContactAIProfile']>, ParentType, ContextType>;
  contactId?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  message?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  success?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
};

export type EnrichAiContactsBulkResultResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['EnrichAIContactsBulkResult'] = ResolversParentTypes['EnrichAIContactsBulkResult']> = {
  enriched?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  errors?: Resolver<Array<ResolversTypes['String']>, ParentType, ContextType>;
  message?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  skipped?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  success?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
};

export type EvidenceResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['Evidence'] = ResolversParentTypes['Evidence']> = {
  capture_timestamp?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  content_hash?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  crawl_id?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  extractor_version?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  http_status?: Resolver<Maybe<ResolversTypes['Int']>, ParentType, ContextType>;
  method?: Resolver<ResolversTypes['ExtractMethod'], ParentType, ContextType>;
  mime?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  observed_at?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  source_type?: Resolver<ResolversTypes['SourceType'], ParentType, ContextType>;
  source_url?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  warc?: Resolver<Maybe<ResolversTypes['WarcPointer']>, ParentType, ContextType>;
};

export type ExtractedSkillResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['ExtractedSkill'] = ResolversParentTypes['ExtractedSkill']> = {
  confidence?: Resolver<ResolversTypes['Float'], ParentType, ContextType>;
  label?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  tag?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
};

export type FindCompanyResultResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['FindCompanyResult'] = ResolversParentTypes['FindCompanyResult']> = {
  company?: Resolver<Maybe<ResolversTypes['Company']>, ParentType, ContextType>;
  found?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
};

export type FindContactEmailResultResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['FindContactEmailResult'] = ResolversParentTypes['FindContactEmailResult']> = {
  candidatesTried?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  email?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  emailFound?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  message?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  success?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  verified?: Resolver<Maybe<ResolversTypes['Boolean']>, ParentType, ContextType>;
};

export type FollowUpBatchResultResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['FollowUpBatchResult'] = ResolversParentTypes['FollowUpBatchResult']> = {
  contactCount?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  emailIds?: Resolver<Array<ResolversTypes['String']>, ParentType, ContextType>;
  message?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  success?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
};

export type FollowUpEmailResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['FollowUpEmail'] = ResolversParentTypes['FollowUpEmail']> = {
  companyId?: Resolver<Maybe<ResolversTypes['Int']>, ParentType, ContextType>;
  contactId?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  createdAt?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  followupStatus?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  fromEmail?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  id?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  recipientName?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  resendId?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  sentAt?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  sequenceNumber?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  sequenceType?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  status?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  subject?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  toEmails?: Resolver<Array<ResolversTypes['String']>, ParentType, ContextType>;
};

export type FollowUpEmailsResultResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['FollowUpEmailsResult'] = ResolversParentTypes['FollowUpEmailsResult']> = {
  emails?: Resolver<Array<ResolversTypes['FollowUpEmail']>, ParentType, ContextType>;
  totalCount?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
};

export type GenerateEmailResultResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['GenerateEmailResult'] = ResolversParentTypes['GenerateEmailResult']> = {
  html?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  subject?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  text?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
};

export type GenerateEmbeddingsResultResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['GenerateEmbeddingsResult'] = ResolversParentTypes['GenerateEmbeddingsResult']> = {
  errors?: Resolver<Array<ResolversTypes['String']>, ParentType, ContextType>;
  failed?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  processed?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  success?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
};

export type GenerateReplyResultResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['GenerateReplyResult'] = ResolversParentTypes['GenerateReplyResult']> = {
  body?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  subject?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
};

export type ImportCompaniesResultResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['ImportCompaniesResult'] = ResolversParentTypes['ImportCompaniesResult']> = {
  errors?: Resolver<Array<ResolversTypes['String']>, ParentType, ContextType>;
  failed?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  imported?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  success?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
};

export type ImportCompanyResultResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['ImportCompanyResult'] = ResolversParentTypes['ImportCompanyResult']> = {
  company?: Resolver<Maybe<ResolversTypes['Company']>, ParentType, ContextType>;
  contactsImported?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  contactsSkipped?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  errors?: Resolver<Array<ResolversTypes['String']>, ParentType, ContextType>;
  success?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
};

export type ImportContactsResultResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['ImportContactsResult'] = ResolversParentTypes['ImportContactsResult']> = {
  errors?: Resolver<Array<ResolversTypes['String']>, ParentType, ContextType>;
  failed?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  imported?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  success?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
};

export type ImportResendResultResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['ImportResendResult'] = ResolversParentTypes['ImportResendResult']> = {
  companyMatchCount?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  contactMatchCount?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  durationMs?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  error?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  errorCount?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  newCount?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  skippedCount?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  success?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  totalFetched?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  updatedCount?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
};

export type IntentDashboardResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['IntentDashboard'] = ResolversParentTypes['IntentDashboard']> = {
  companiesWithIntent?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  recentSignals?: Resolver<Array<ResolversTypes['IntentSignal']>, ParentType, ContextType>;
  signalsByType?: Resolver<Array<ResolversTypes['SignalTypeCount']>, ParentType, ContextType>;
  topIntentCompanies?: Resolver<Array<ResolversTypes['Company']>, ParentType, ContextType>;
  totalSignals?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
};

export type IntentScoreResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['IntentScore'] = ResolversParentTypes['IntentScore']> = {
  budget?: Resolver<ResolversTypes['Float'], ParentType, ContextType>;
  growth?: Resolver<ResolversTypes['Float'], ParentType, ContextType>;
  hiring?: Resolver<ResolversTypes['Float'], ParentType, ContextType>;
  leadership?: Resolver<ResolversTypes['Float'], ParentType, ContextType>;
  overall?: Resolver<ResolversTypes['Float'], ParentType, ContextType>;
  product?: Resolver<ResolversTypes['Float'], ParentType, ContextType>;
  signalCount?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  tech?: Resolver<ResolversTypes['Float'], ParentType, ContextType>;
  updatedAt?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
};

export type IntentSignalResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['IntentSignal'] = ResolversParentTypes['IntentSignal']> = {
  companyId?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  confidence?: Resolver<ResolversTypes['Float'], ParentType, ContextType>;
  createdAt?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  decayDays?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  decaysAt?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  detectedAt?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  evidence?: Resolver<Array<ResolversTypes['String']>, ParentType, ContextType>;
  freshness?: Resolver<ResolversTypes['Float'], ParentType, ContextType>;
  id?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  metadata?: Resolver<Maybe<ResolversTypes['JSON']>, ParentType, ContextType>;
  modelVersion?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  rawText?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  signalType?: Resolver<ResolversTypes['IntentSignalType'], ParentType, ContextType>;
  sourceType?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  sourceUrl?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
};

export type IntentSignalsResponseResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['IntentSignalsResponse'] = ResolversParentTypes['IntentSignalsResponse']> = {
  signals?: Resolver<Array<ResolversTypes['IntentSignal']>, ParentType, ContextType>;
  totalCount?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
};

export interface JsonScalarConfig extends GraphQLScalarTypeConfig<ResolversTypes['JSON'], any> {
  name: 'JSON';
}

export type LinkedInPostResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['LinkedInPost'] = ResolversParentTypes['LinkedInPost']> = {
  analyzedAt?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  authorName?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  authorUrl?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  companyId?: Resolver<Maybe<ResolversTypes['Int']>, ParentType, ContextType>;
  contactId?: Resolver<Maybe<ResolversTypes['Int']>, ParentType, ContextType>;
  content?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  createdAt?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  employmentType?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  id?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  location?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  postedAt?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  rawData?: Resolver<Maybe<ResolversTypes['JSON']>, ParentType, ContextType>;
  scrapedAt?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  skills?: Resolver<Maybe<Array<ResolversTypes['ExtractedSkill']>>, ParentType, ContextType>;
  title?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  type?: Resolver<ResolversTypes['LinkedInPostType'], ParentType, ContextType>;
  url?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
};

export type MlStatsResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['MLStats'] = ResolversParentTypes['MLStats']> = {
  companiesEmbedded?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  lastEmbeddingAt?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  modelsAvailable?: Resolver<Array<ResolversTypes['String']>, ParentType, ContextType>;
  totalCompanies?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
};

export type MarkRepliedResultResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['MarkRepliedResult'] = ResolversParentTypes['MarkRepliedResult']> = {
  message?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  success?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
};

export type MergeCompaniesResultResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['MergeCompaniesResult'] = ResolversParentTypes['MergeCompaniesResult']> = {
  keptCompanyId?: Resolver<Maybe<ResolversTypes['Int']>, ParentType, ContextType>;
  merged?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  message?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  success?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
};

export type MergeDuplicateContactsResultResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['MergeDuplicateContactsResult'] = ResolversParentTypes['MergeDuplicateContactsResult']> = {
  mergedCount?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  message?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  removedCount?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  success?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
};

export type MutationResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['Mutation'] = ResolversParentTypes['Mutation']> = {
  add_company_facts?: Resolver<Array<ResolversTypes['CompanyFact']>, ParentType, ContextType, RequireFields<MutationAdd_Company_FactsArgs, 'company_id' | 'facts'>>;
  analyzeCompany?: Resolver<ResolversTypes['AnalyzeCompanyResponse'], ParentType, ContextType, Partial<MutationAnalyzeCompanyArgs>>;
  analyzeLinkedInPosts?: Resolver<ResolversTypes['AnalyzePostsResult'], ParentType, ContextType, Partial<MutationAnalyzeLinkedInPostsArgs>>;
  applyEmailPattern?: Resolver<ResolversTypes['ApplyEmailPatternResult'], ParentType, ContextType, RequireFields<MutationApplyEmailPatternArgs, 'companyId'>>;
  archiveEmail?: Resolver<ResolversTypes['ArchiveEmailResult'], ParentType, ContextType, RequireFields<MutationArchiveEmailArgs, 'id'>>;
  batchDetectIntent?: Resolver<ResolversTypes['BatchDetectIntentResult'], ParentType, ContextType, RequireFields<MutationBatchDetectIntentArgs, 'companyIds'>>;
  blockCompany?: Resolver<ResolversTypes['Company'], ParentType, ContextType, RequireFields<MutationBlockCompanyArgs, 'id'>>;
  cancelCompanyEmails?: Resolver<ResolversTypes['CancelCompanyEmailsResult'], ParentType, ContextType, RequireFields<MutationCancelCompanyEmailsArgs, 'companyId'>>;
  cancelScheduledEmail?: Resolver<ResolversTypes['CancelEmailResult'], ParentType, ContextType, RequireFields<MutationCancelScheduledEmailArgs, 'resendId'>>;
  classifyAllPending?: Resolver<ResolversTypes['ClassifyBatchResult'], ParentType, ContextType>;
  classifyReceivedEmail?: Resolver<ResolversTypes['ClassifyEmailResult'], ParentType, ContextType, RequireFields<MutationClassifyReceivedEmailArgs, 'id'>>;
  computeContactDeletionScores?: Resolver<ResolversTypes['BatchOperationResult'], ParentType, ContextType, Partial<MutationComputeContactDeletionScoresArgs>>;
  computeNextTouchScores?: Resolver<ResolversTypes['ComputeNextTouchScoresResult'], ParentType, ContextType, RequireFields<MutationComputeNextTouchScoresArgs, 'companyId'>>;
  createCompany?: Resolver<ResolversTypes['Company'], ParentType, ContextType, RequireFields<MutationCreateCompanyArgs, 'input'>>;
  createContact?: Resolver<ResolversTypes['Contact'], ParentType, ContextType, RequireFields<MutationCreateContactArgs, 'input'>>;
  createDraftCampaign?: Resolver<ResolversTypes['EmailCampaign'], ParentType, ContextType, RequireFields<MutationCreateDraftCampaignArgs, 'input'>>;
  createEmailTemplate?: Resolver<ResolversTypes['EmailTemplate'], ParentType, ContextType, RequireFields<MutationCreateEmailTemplateArgs, 'input'>>;
  createReminder?: Resolver<ResolversTypes['ContactReminder'], ParentType, ContextType, RequireFields<MutationCreateReminderArgs, 'input'>>;
  deleteCampaign?: Resolver<ResolversTypes['DeleteCampaignResult'], ParentType, ContextType, RequireFields<MutationDeleteCampaignArgs, 'id'>>;
  deleteCompanies?: Resolver<ResolversTypes['DeleteCompaniesResult'], ParentType, ContextType, RequireFields<MutationDeleteCompaniesArgs, 'companyIds'>>;
  deleteCompany?: Resolver<ResolversTypes['DeleteCompanyResponse'], ParentType, ContextType, RequireFields<MutationDeleteCompanyArgs, 'id'>>;
  deleteContact?: Resolver<ResolversTypes['DeleteContactResult'], ParentType, ContextType, RequireFields<MutationDeleteContactArgs, 'id'>>;
  deleteEmailTemplate?: Resolver<ResolversTypes['DeleteEmailTemplateResult'], ParentType, ContextType, RequireFields<MutationDeleteEmailTemplateArgs, 'id'>>;
  deleteLinkedInPost?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType, RequireFields<MutationDeleteLinkedInPostArgs, 'id'>>;
  detectIntentSignals?: Resolver<ResolversTypes['DetectIntentResult'], ParentType, ContextType, RequireFields<MutationDetectIntentSignalsArgs, 'companyId'>>;
  dismissReminder?: Resolver<ResolversTypes['ContactReminder'], ParentType, ContextType, RequireFields<MutationDismissReminderArgs, 'id'>>;
  enhanceAllContacts?: Resolver<ResolversTypes['EnhanceAllContactsResult'], ParentType, ContextType>;
  enhanceCompany?: Resolver<ResolversTypes['EnhanceCompanyResponse'], ParentType, ContextType, Partial<MutationEnhanceCompanyArgs>>;
  enrichAIContactProfile?: Resolver<ResolversTypes['EnrichAIContactResult'], ParentType, ContextType, RequireFields<MutationEnrichAiContactProfileArgs, 'contactId'>>;
  enrichAIContactsForCompany?: Resolver<ResolversTypes['EnrichAIContactsBulkResult'], ParentType, ContextType, RequireFields<MutationEnrichAiContactsForCompanyArgs, 'companyId'>>;
  findCompanyEmails?: Resolver<ResolversTypes['EnhanceAllContactsResult'], ParentType, ContextType, RequireFields<MutationFindCompanyEmailsArgs, 'companyId'>>;
  findContactEmail?: Resolver<ResolversTypes['FindContactEmailResult'], ParentType, ContextType, RequireFields<MutationFindContactEmailArgs, 'contactId'>>;
  flagContactsForDeletion?: Resolver<ResolversTypes['BatchOperationResult'], ParentType, ContextType, Partial<MutationFlagContactsForDeletionArgs>>;
  generateCompanyEmbeddings?: Resolver<ResolversTypes['GenerateEmbeddingsResult'], ParentType, ContextType, Partial<MutationGenerateCompanyEmbeddingsArgs>>;
  generateEmail?: Resolver<ResolversTypes['GenerateEmailResult'], ParentType, ContextType, RequireFields<MutationGenerateEmailArgs, 'input'>>;
  generateReply?: Resolver<ResolversTypes['GenerateReplyResult'], ParentType, ContextType, RequireFields<MutationGenerateReplyArgs, 'input'>>;
  importCompanies?: Resolver<ResolversTypes['ImportCompaniesResult'], ParentType, ContextType, RequireFields<MutationImportCompaniesArgs, 'companies'>>;
  importCompanyWithContacts?: Resolver<ResolversTypes['ImportCompanyResult'], ParentType, ContextType, RequireFields<MutationImportCompanyWithContactsArgs, 'input'>>;
  importContacts?: Resolver<ResolversTypes['ImportContactsResult'], ParentType, ContextType, RequireFields<MutationImportContactsArgs, 'contacts'>>;
  importResendEmails?: Resolver<ResolversTypes['ImportResendResult'], ParentType, ContextType, Partial<MutationImportResendEmailsArgs>>;
  ingest_company_snapshot?: Resolver<ResolversTypes['CompanySnapshot'], ParentType, ContextType, RequireFields<MutationIngest_Company_SnapshotArgs, 'company_id' | 'evidence' | 'fetched_at' | 'source_url'>>;
  launchEmailCampaign?: Resolver<ResolversTypes['EmailCampaign'], ParentType, ContextType, RequireFields<MutationLaunchEmailCampaignArgs, 'id'>>;
  markContactEmailVerified?: Resolver<ResolversTypes['Contact'], ParentType, ContextType, RequireFields<MutationMarkContactEmailVerifiedArgs, 'contactId' | 'verified'>>;
  markEmailReplied?: Resolver<ResolversTypes['MarkRepliedResult'], ParentType, ContextType, RequireFields<MutationMarkEmailRepliedArgs, 'resendId'>>;
  mergeDuplicateCompanies?: Resolver<ResolversTypes['MergeCompaniesResult'], ParentType, ContextType, RequireFields<MutationMergeDuplicateCompaniesArgs, 'companyIds'>>;
  mergeDuplicateContacts?: Resolver<ResolversTypes['MergeDuplicateContactsResult'], ParentType, ContextType, RequireFields<MutationMergeDuplicateContactsArgs, 'companyId'>>;
  previewEmail?: Resolver<ResolversTypes['EmailPreview'], ParentType, ContextType, RequireFields<MutationPreviewEmailArgs, 'input'>>;
  purgeDeletedContacts?: Resolver<ResolversTypes['BatchOperationResult'], ParentType, ContextType, Partial<MutationPurgeDeletedContactsArgs>>;
  refreshIntentScores?: Resolver<ResolversTypes['RefreshIntentResult'], ParentType, ContextType>;
  salescueAnalyze?: Resolver<ResolversTypes['SalescueAnalyzeResult'], ParentType, ContextType, RequireFields<MutationSalescueAnalyzeArgs, 'text'>>;
  scheduleBatchEmails?: Resolver<ResolversTypes['ScheduleBatchResult'], ParentType, ContextType, RequireFields<MutationScheduleBatchEmailsArgs, 'input'>>;
  scheduleFollowUpBatch?: Resolver<ResolversTypes['FollowUpBatchResult'], ParentType, ContextType, RequireFields<MutationScheduleFollowUpBatchArgs, 'input'>>;
  scoreContactsML?: Resolver<ResolversTypes['ScoreContactsMLResult'], ParentType, ContextType, RequireFields<MutationScoreContactsMlArgs, 'companyId'>>;
  sendEmail?: Resolver<ResolversTypes['SendEmailResult'], ParentType, ContextType, RequireFields<MutationSendEmailArgs, 'input'>>;
  sendOutreachEmail?: Resolver<ResolversTypes['SendOutreachEmailResult'], ParentType, ContextType, RequireFields<MutationSendOutreachEmailArgs, 'input'>>;
  sendScheduledEmailNow?: Resolver<ResolversTypes['SendNowResult'], ParentType, ContextType, RequireFields<MutationSendScheduledEmailNowArgs, 'resendId'>>;
  snoozeReminder?: Resolver<ResolversTypes['ContactReminder'], ParentType, ContextType, RequireFields<MutationSnoozeReminderArgs, 'days' | 'id'>>;
  syncResendEmails?: Resolver<ResolversTypes['SyncResendResult'], ParentType, ContextType, Partial<MutationSyncResendEmailsArgs>>;
  unarchiveEmail?: Resolver<ResolversTypes['ArchiveEmailResult'], ParentType, ContextType, RequireFields<MutationUnarchiveEmailArgs, 'id'>>;
  unblockCompany?: Resolver<ResolversTypes['Company'], ParentType, ContextType, RequireFields<MutationUnblockCompanyArgs, 'id'>>;
  unflagContactForDeletion?: Resolver<ResolversTypes['Contact'], ParentType, ContextType, RequireFields<MutationUnflagContactForDeletionArgs, 'id'>>;
  unverifyCompanyContacts?: Resolver<ResolversTypes['UnverifyContactsResult'], ParentType, ContextType, RequireFields<MutationUnverifyCompanyContactsArgs, 'companyId'>>;
  updateCampaign?: Resolver<ResolversTypes['EmailCampaign'], ParentType, ContextType, RequireFields<MutationUpdateCampaignArgs, 'id' | 'input'>>;
  updateCompany?: Resolver<ResolversTypes['Company'], ParentType, ContextType, RequireFields<MutationUpdateCompanyArgs, 'id' | 'input'>>;
  updateContact?: Resolver<ResolversTypes['Contact'], ParentType, ContextType, RequireFields<MutationUpdateContactArgs, 'id' | 'input'>>;
  updateEmailTemplate?: Resolver<ResolversTypes['EmailTemplate'], ParentType, ContextType, RequireFields<MutationUpdateEmailTemplateArgs, 'id' | 'input'>>;
  updateReminder?: Resolver<ResolversTypes['ContactReminder'], ParentType, ContextType, RequireFields<MutationUpdateReminderArgs, 'id' | 'input'>>;
  updateUserSettings?: Resolver<ResolversTypes['UserSettings'], ParentType, ContextType, RequireFields<MutationUpdateUserSettingsArgs, 'settings' | 'userId'>>;
  upsertLinkedInPost?: Resolver<ResolversTypes['LinkedInPost'], ParentType, ContextType, RequireFields<MutationUpsertLinkedInPostArgs, 'input'>>;
  upsertLinkedInPosts?: Resolver<ResolversTypes['UpsertLinkedInPostsResult'], ParentType, ContextType, RequireFields<MutationUpsertLinkedInPostsArgs, 'inputs'>>;
  verifyCompanyContacts?: Resolver<ResolversTypes['VerifyCompanyContactsResult'], ParentType, ContextType, RequireFields<MutationVerifyCompanyContactsArgs, 'companyId'>>;
  verifyContactAuthenticity?: Resolver<ResolversTypes['VerifyAuthenticityResult'], ParentType, ContextType, RequireFields<MutationVerifyContactAuthenticityArgs, 'contactId'>>;
  verifyContactEmail?: Resolver<ResolversTypes['VerifyEmailResult'], ParentType, ContextType, RequireFields<MutationVerifyContactEmailArgs, 'contactId'>>;
};

export type QualityGateResultResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['QualityGateResult'] = ResolversParentTypes['QualityGateResult']> = {
  adjustedScore?: Resolver<ResolversTypes['Float'], ParentType, ContextType>;
  flags?: Resolver<Array<ResolversTypes['String']>, ParentType, ContextType>;
  pass?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  recommendations?: Resolver<Array<ResolversTypes['String']>, ParentType, ContextType>;
};

export type QueryResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['Query'] = ResolversParentTypes['Query']> = {
  allCompanyTags?: Resolver<Array<ResolversTypes['String']>, ParentType, ContextType>;
  companies?: Resolver<ResolversTypes['CompaniesResponse'], ParentType, ContextType, Partial<QueryCompaniesArgs>>;
  companiesByIntent?: Resolver<ResolversTypes['CompaniesResponse'], ParentType, ContextType, RequireFields<QueryCompaniesByIntentArgs, 'threshold'>>;
  companiesLike?: Resolver<Array<ResolversTypes['SimilarCompanyResult']>, ParentType, ContextType, RequireFields<QueryCompaniesLikeArgs, 'companyId'>>;
  company?: Resolver<Maybe<ResolversTypes['Company']>, ParentType, ContextType, Partial<QueryCompanyArgs>>;
  companyContactEmails?: Resolver<Array<ResolversTypes['CompanyContactEmail']>, ParentType, ContextType, RequireFields<QueryCompanyContactEmailsArgs, 'companyId'>>;
  company_facts?: Resolver<Array<ResolversTypes['CompanyFact']>, ParentType, ContextType, RequireFields<QueryCompany_FactsArgs, 'company_id'>>;
  company_snapshots?: Resolver<Array<ResolversTypes['CompanySnapshot']>, ParentType, ContextType, RequireFields<QueryCompany_SnapshotsArgs, 'company_id'>>;
  contact?: Resolver<Maybe<ResolversTypes['Contact']>, ParentType, ContextType, RequireFields<QueryContactArgs, 'id'>>;
  contactByEmail?: Resolver<Maybe<ResolversTypes['Contact']>, ParentType, ContextType, RequireFields<QueryContactByEmailArgs, 'email'>>;
  contactEmails?: Resolver<Array<ResolversTypes['ContactEmail']>, ParentType, ContextType, RequireFields<QueryContactEmailsArgs, 'contactId'>>;
  contactReminders?: Resolver<Array<ResolversTypes['ContactReminder']>, ParentType, ContextType, RequireFields<QueryContactRemindersArgs, 'contactId'>>;
  contacts?: Resolver<ResolversTypes['ContactsResult'], ParentType, ContextType, Partial<QueryContactsArgs>>;
  dueReminders?: Resolver<Array<ResolversTypes['ContactReminderWithContact']>, ParentType, ContextType>;
  emailCampaign?: Resolver<Maybe<ResolversTypes['EmailCampaign']>, ParentType, ContextType, RequireFields<QueryEmailCampaignArgs, 'id'>>;
  emailCampaigns?: Resolver<ResolversTypes['EmailCampaignsResult'], ParentType, ContextType, Partial<QueryEmailCampaignsArgs>>;
  emailStats?: Resolver<ResolversTypes['EmailStats'], ParentType, ContextType>;
  emailTemplate?: Resolver<Maybe<ResolversTypes['EmailTemplate']>, ParentType, ContextType, RequireFields<QueryEmailTemplateArgs, 'id'>>;
  emailTemplates?: Resolver<ResolversTypes['EmailTemplatesResult'], ParentType, ContextType, Partial<QueryEmailTemplatesArgs>>;
  emailsNeedingFollowUp?: Resolver<ResolversTypes['FollowUpEmailsResult'], ParentType, ContextType, Partial<QueryEmailsNeedingFollowUpArgs>>;
  findCompany?: Resolver<ResolversTypes['FindCompanyResult'], ParentType, ContextType, Partial<QueryFindCompanyArgs>>;
  intentDashboard?: Resolver<ResolversTypes['IntentDashboard'], ParentType, ContextType>;
  intentSignals?: Resolver<ResolversTypes['IntentSignalsResponse'], ParentType, ContextType, RequireFields<QueryIntentSignalsArgs, 'companyId'>>;
  linkedinPost?: Resolver<Maybe<ResolversTypes['LinkedInPost']>, ParentType, ContextType, RequireFields<QueryLinkedinPostArgs, 'id'>>;
  linkedinPosts?: Resolver<Array<ResolversTypes['LinkedInPost']>, ParentType, ContextType, Partial<QueryLinkedinPostsArgs>>;
  mlStats?: Resolver<ResolversTypes['MLStats'], ParentType, ContextType>;
  receivedEmail?: Resolver<Maybe<ResolversTypes['ReceivedEmail']>, ParentType, ContextType, RequireFields<QueryReceivedEmailArgs, 'id'>>;
  receivedEmails?: Resolver<ResolversTypes['ReceivedEmailsResult'], ParentType, ContextType, Partial<QueryReceivedEmailsArgs>>;
  recommendedCompanies?: Resolver<Array<ResolversTypes['RecommendedCompany']>, ParentType, ContextType, Partial<QueryRecommendedCompaniesArgs>>;
  recommendedContacts?: Resolver<Array<ResolversTypes['RankedContact']>, ParentType, ContextType, RequireFields<QueryRecommendedContactsArgs, 'companyId'>>;
  resendEmail?: Resolver<Maybe<ResolversTypes['ResendEmailDetail']>, ParentType, ContextType, RequireFields<QueryResendEmailArgs, 'resendId'>>;
  salescueEntities?: Resolver<ResolversTypes['SalescueEntitiesResult'], ParentType, ContextType, RequireFields<QuerySalescueEntitiesArgs, 'text'>>;
  salescueHealth?: Resolver<ResolversTypes['SalescueHealth'], ParentType, ContextType>;
  salescueIcp?: Resolver<ResolversTypes['SalescueICPResult'], ParentType, ContextType, RequireFields<QuerySalescueIcpArgs, 'icp' | 'prospect'>>;
  salescueIntent?: Resolver<ResolversTypes['SalescueIntentResult'], ParentType, ContextType, RequireFields<QuerySalescueIntentArgs, 'text'>>;
  salescueObjection?: Resolver<ResolversTypes['SalescueObjectionResult'], ParentType, ContextType, RequireFields<QuerySalescueObjectionArgs, 'text'>>;
  salescueReply?: Resolver<ResolversTypes['SalescueReplyResult'], ParentType, ContextType, RequireFields<QuerySalescueReplyArgs, 'text'>>;
  salescueScore?: Resolver<ResolversTypes['SalescueScoreResult'], ParentType, ContextType, RequireFields<QuerySalescueScoreArgs, 'text'>>;
  salescueSentiment?: Resolver<ResolversTypes['SalescueSentimentResult'], ParentType, ContextType, RequireFields<QuerySalescueSentimentArgs, 'text'>>;
  salescueSpam?: Resolver<ResolversTypes['SalescueSpamResult'], ParentType, ContextType, RequireFields<QuerySalescueSpamArgs, 'text'>>;
  salescueSubject?: Resolver<ResolversTypes['SalescueSubjectResult'], ParentType, ContextType, RequireFields<QuerySalescueSubjectArgs, 'subjects'>>;
  salescueTriggers?: Resolver<ResolversTypes['SalescueTriggersResult'], ParentType, ContextType, RequireFields<QuerySalescueTriggersArgs, 'text'>>;
  similarCompanies?: Resolver<Array<ResolversTypes['SimilarCompanyResult']>, ParentType, ContextType, RequireFields<QuerySimilarCompaniesArgs, 'query'>>;
  similarPosts?: Resolver<Array<ResolversTypes['SimilarPost']>, ParentType, ContextType, RequireFields<QuerySimilarPostsArgs, 'postId'>>;
  userSettings?: Resolver<Maybe<ResolversTypes['UserSettings']>, ParentType, ContextType, RequireFields<QueryUserSettingsArgs, 'userId'>>;
};

export type RankedContactResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['RankedContact'] = ResolversParentTypes['RankedContact']> = {
  contact?: Resolver<ResolversTypes['Contact'], ParentType, ContextType>;
  rankScore?: Resolver<ResolversTypes['Float'], ParentType, ContextType>;
  reasons?: Resolver<Array<ResolversTypes['String']>, ParentType, ContextType>;
};

export type ReceivedEmailResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['ReceivedEmail'] = ResolversParentTypes['ReceivedEmail']> = {
  archivedAt?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  attachments?: Resolver<Maybe<ResolversTypes['JSON']>, ParentType, ContextType>;
  ccEmails?: Resolver<Array<ResolversTypes['String']>, ParentType, ContextType>;
  classification?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  classificationConfidence?: Resolver<Maybe<ResolversTypes['Float']>, ParentType, ContextType>;
  classifiedAt?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  createdAt?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  fromEmail?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  htmlContent?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  id?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  matchedContactId?: Resolver<Maybe<ResolversTypes['Int']>, ParentType, ContextType>;
  matchedOutboundId?: Resolver<Maybe<ResolversTypes['Int']>, ParentType, ContextType>;
  messageId?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  receivedAt?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  replyToEmails?: Resolver<Array<ResolversTypes['String']>, ParentType, ContextType>;
  resendId?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  subject?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  textContent?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  toEmails?: Resolver<Array<ResolversTypes['String']>, ParentType, ContextType>;
  updatedAt?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
};

export type ReceivedEmailsResultResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['ReceivedEmailsResult'] = ResolversParentTypes['ReceivedEmailsResult']> = {
  emails?: Resolver<Array<ResolversTypes['ReceivedEmail']>, ParentType, ContextType>;
  totalCount?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
};

export type RecommendedCompanyResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['RecommendedCompany'] = ResolversParentTypes['RecommendedCompany']> = {
  company?: Resolver<ResolversTypes['Company'], ParentType, ContextType>;
  reasons?: Resolver<Array<ResolversTypes['String']>, ParentType, ContextType>;
  score?: Resolver<ResolversTypes['Float'], ParentType, ContextType>;
};

export type RefreshIntentResultResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['RefreshIntentResult'] = ResolversParentTypes['RefreshIntentResult']> = {
  companiesUpdated?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  success?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
};

export type ResendEmailDetailResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['ResendEmailDetail'] = ResolversParentTypes['ResendEmailDetail']> = {
  bcc?: Resolver<Maybe<Array<ResolversTypes['String']>>, ParentType, ContextType>;
  cc?: Resolver<Maybe<Array<ResolversTypes['String']>>, ParentType, ContextType>;
  createdAt?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  from?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  html?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  id?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  lastEvent?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  scheduledAt?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  subject?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  text?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  to?: Resolver<Array<ResolversTypes['String']>, ParentType, ContextType>;
};

export type SalescueAnalyzeResultResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['SalescueAnalyzeResult'] = ResolversParentTypes['SalescueAnalyzeResult']> = {
  errors?: Resolver<Array<ResolversTypes['SalescueModuleError']>, ParentType, ContextType>;
  modulesRun?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  results?: Resolver<ResolversTypes['JSON'], ParentType, ContextType>;
  timings?: Resolver<ResolversTypes['JSON'], ParentType, ContextType>;
  totalTime?: Resolver<ResolversTypes['Float'], ParentType, ContextType>;
};

export type SalescueAnomalyResultResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['SalescueAnomalyResult'] = ResolversParentTypes['SalescueAnomalyResult']> = {
  anomalyScore?: Resolver<ResolversTypes['Float'], ParentType, ContextType>;
  anomalyType?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  channelAttribution?: Resolver<ResolversTypes['JSON'], ParentType, ContextType>;
  cosineSimilarity?: Resolver<ResolversTypes['Float'], ParentType, ContextType>;
  isAnomalous?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  textPriorAdjustment?: Resolver<ResolversTypes['Float'], ParentType, ContextType>;
  typeConfidence?: Resolver<ResolversTypes['Float'], ParentType, ContextType>;
  zScore?: Resolver<ResolversTypes['Float'], ParentType, ContextType>;
};

export type SalescueBanditAlternativeResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['SalescueBanditAlternative'] = ResolversParentTypes['SalescueBanditAlternative']> = {
  sampledReward?: Resolver<ResolversTypes['Float'], ParentType, ContextType>;
  subjectStyle?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  template?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  timing?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
};

export type SalescueBanditArmResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['SalescueBanditArm'] = ResolversParentTypes['SalescueBanditArm']> = {
  subjectStyle?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  template?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  timing?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
};

export type SalescueBanditResultResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['SalescueBanditResult'] = ResolversParentTypes['SalescueBanditResult']> = {
  alternatives?: Resolver<Array<ResolversTypes['SalescueBanditAlternative']>, ParentType, ContextType>;
  armIndex?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  bestArm?: Resolver<ResolversTypes['SalescueBanditArm'], ParentType, ContextType>;
  expectedReward?: Resolver<ResolversTypes['Float'], ParentType, ContextType>;
  explorationTemperature?: Resolver<ResolversTypes['Float'], ParentType, ContextType>;
  sampledReward?: Resolver<ResolversTypes['Float'], ParentType, ContextType>;
  totalArms?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
};

export type SalescueCallResultResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['SalescueCallResult'] = ResolversParentTypes['SalescueCallResult']> = {
  action?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  commitmentCount?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  commitments?: Resolver<Array<ResolversTypes['SalescueCommitment']>, ParentType, ContextType>;
  dealHealth?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  modelConfidence?: Resolver<ResolversTypes['Float'], ParentType, ContextType>;
  momentum?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  negatedCommitmentCount?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  turnScores?: Resolver<Array<ResolversTypes['Float']>, ParentType, ContextType>;
  turnUncertainties?: Resolver<Array<ResolversTypes['Float']>, ParentType, ContextType>;
  turningPoints?: Resolver<Array<ResolversTypes['SalescueTurningPoint']>, ParentType, ContextType>;
};

export type SalescueCoachingCardResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['SalescueCoachingCard'] = ResolversParentTypes['SalescueCoachingCard']> = {
  avoid?: Resolver<Array<ResolversTypes['String']>, ParentType, ContextType>;
  example?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  framework?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  steps?: Resolver<Array<ResolversTypes['String']>, ParentType, ContextType>;
};

export type SalescueCommitmentResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['SalescueCommitment'] = ResolversParentTypes['SalescueCommitment']> = {
  negated?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  pattern?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  speaker?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  turn?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  type?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
};

export type SalescueEmailgenResultResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['SalescueEmailgenResult'] = ResolversParentTypes['SalescueEmailgenResult']> = {
  contextUsed?: Resolver<ResolversTypes['JSON'], ParentType, ContextType>;
  email?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  emailType?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  hasCallToAction?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  promptTokens?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  wordCount?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
};

export type SalescueEntitiesResultResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['SalescueEntitiesResult'] = ResolversParentTypes['SalescueEntitiesResult']> = {
  entities?: Resolver<Array<ResolversTypes['SalescueEntity']>, ParentType, ContextType>;
  neuralCount?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  regexCount?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  typesFound?: Resolver<Array<ResolversTypes['String']>, ParentType, ContextType>;
};

export type SalescueEntityResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['SalescueEntity'] = ResolversParentTypes['SalescueEntity']> = {
  confidence?: Resolver<ResolversTypes['Float'], ParentType, ContextType>;
  endChar?: Resolver<Maybe<ResolversTypes['Int']>, ParentType, ContextType>;
  role?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  roleScores?: Resolver<ResolversTypes['JSON'], ParentType, ContextType>;
  source?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  startChar?: Resolver<Maybe<ResolversTypes['Int']>, ParentType, ContextType>;
  text?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  type?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
};

export type SalescueGraphResultResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['SalescueGraphResult'] = ResolversParentTypes['SalescueGraphResult']> = {
  edgeCount?: Resolver<Maybe<ResolversTypes['Int']>, ParentType, ContextType>;
  graphLabel?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  graphScore?: Resolver<ResolversTypes['Float'], ParentType, ContextType>;
  graphSignals?: Resolver<Array<ResolversTypes['SalescueGraphSignal']>, ParentType, ContextType>;
  labelConfidence?: Resolver<ResolversTypes['Float'], ParentType, ContextType>;
  nodeCount?: Resolver<Maybe<ResolversTypes['Int']>, ParentType, ContextType>;
  note?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  similarCompanies?: Resolver<Array<ResolversTypes['SalescueSimilarCompany']>, ParentType, ContextType>;
};

export type SalescueGraphSignalResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['SalescueGraphSignal'] = ResolversParentTypes['SalescueGraphSignal']> = {
  strength?: Resolver<ResolversTypes['Float'], ParentType, ContextType>;
  type?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  with?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
};

export type SalescueHealthResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['SalescueHealth'] = ResolversParentTypes['SalescueHealth']> = {
  device?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  moduleCount?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  modules?: Resolver<Array<ResolversTypes['String']>, ParentType, ContextType>;
  status?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  version?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
};

export type SalescueIcpDimensionFitResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['SalescueICPDimensionFit'] = ResolversParentTypes['SalescueICPDimensionFit']> = {
  distance?: Resolver<ResolversTypes['Float'], ParentType, ContextType>;
  fit?: Resolver<Maybe<ResolversTypes['Float']>, ParentType, ContextType>;
  icpSpread?: Resolver<ResolversTypes['Float'], ParentType, ContextType>;
  status?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
};

export type SalescueIcpResultResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['SalescueICPResult'] = ResolversParentTypes['SalescueICPResult']> = {
  dealbreakers?: Resolver<Array<ResolversTypes['String']>, ParentType, ContextType>;
  dimensions?: Resolver<ResolversTypes['JSON'], ParentType, ContextType>;
  missing?: Resolver<Array<ResolversTypes['String']>, ParentType, ContextType>;
  qualified?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  score?: Resolver<ResolversTypes['Float'], ParentType, ContextType>;
};

export type SalescueIntentResultResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['SalescueIntentResult'] = ResolversParentTypes['SalescueIntentResult']> = {
  confidence?: Resolver<ResolversTypes['Float'], ParentType, ContextType>;
  dataPoints?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  distribution?: Resolver<ResolversTypes['JSON'], ParentType, ContextType>;
  stage?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  trajectory?: Resolver<Maybe<ResolversTypes['SalescueIntentTrajectory']>, ParentType, ContextType>;
};

export type SalescueIntentTrajectoryResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['SalescueIntentTrajectory'] = ResolversParentTypes['SalescueIntentTrajectory']> = {
  acceleration?: Resolver<ResolversTypes['Float'], ParentType, ContextType>;
  currentIntensity?: Resolver<ResolversTypes['Float'], ParentType, ContextType>;
  daysToPurchase?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  direction?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  velocity?: Resolver<ResolversTypes['Float'], ParentType, ContextType>;
};

export type SalescueModuleErrorResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['SalescueModuleError'] = ResolversParentTypes['SalescueModuleError']> = {
  error?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  module?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
};

export type SalescueObjectionResultResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['SalescueObjectionResult'] = ResolversParentTypes['SalescueObjectionResult']> = {
  category?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  categoryConfidence?: Resolver<ResolversTypes['Float'], ParentType, ContextType>;
  coaching?: Resolver<ResolversTypes['SalescueCoachingCard'], ParentType, ContextType>;
  objectionType?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  severity?: Resolver<ResolversTypes['Float'], ParentType, ContextType>;
  topTypes?: Resolver<ResolversTypes['JSON'], ParentType, ContextType>;
  typeConfidence?: Resolver<ResolversTypes['Float'], ParentType, ContextType>;
};

export type SalescueReplyEvidenceResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['SalescueReplyEvidence'] = ResolversParentTypes['SalescueReplyEvidence']> = {
  label?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  text?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
};

export type SalescueReplyResultResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['SalescueReplyResult'] = ResolversParentTypes['SalescueReplyResult']> = {
  active?: Resolver<ResolversTypes['JSON'], ParentType, ContextType>;
  alternativeConfigs?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  configurationScore?: Resolver<ResolversTypes['Float'], ParentType, ContextType>;
  evidence?: Resolver<Array<ResolversTypes['SalescueReplyEvidence']>, ParentType, ContextType>;
  primary?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  scores?: Resolver<ResolversTypes['JSON'], ParentType, ContextType>;
};

export type SalescueScoreCategoriesResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['SalescueScoreCategories'] = ResolversParentTypes['SalescueScoreCategories']> = {
  analytics?: Resolver<ResolversTypes['Float'], ParentType, ContextType>;
  automation?: Resolver<ResolversTypes['Float'], ParentType, ContextType>;
  engagement?: Resolver<ResolversTypes['Float'], ParentType, ContextType>;
  enrichment?: Resolver<ResolversTypes['Float'], ParentType, ContextType>;
  intent?: Resolver<ResolversTypes['Float'], ParentType, ContextType>;
  outreach?: Resolver<ResolversTypes['Float'], ParentType, ContextType>;
};

export type SalescueScoreResultResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['SalescueScoreResult'] = ResolversParentTypes['SalescueScoreResult']> = {
  categories?: Resolver<ResolversTypes['SalescueScoreCategories'], ParentType, ContextType>;
  confidence?: Resolver<ResolversTypes['Float'], ParentType, ContextType>;
  label?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  nSignalsDetected?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  score?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  signals?: Resolver<Array<ResolversTypes['SalescueScoreSignal']>, ParentType, ContextType>;
};

export type SalescueScoreSignalResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['SalescueScoreSignal'] = ResolversParentTypes['SalescueScoreSignal']> = {
  attendedPositions?: Resolver<Array<ResolversTypes['Int']>, ParentType, ContextType>;
  attributionType?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  category?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  causalImpact?: Resolver<ResolversTypes['Float'], ParentType, ContextType>;
  signal?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  strength?: Resolver<ResolversTypes['Float'], ParentType, ContextType>;
};

export type SalescueSentimentEvidenceResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['SalescueSentimentEvidence'] = ResolversParentTypes['SalescueSentimentEvidence']> = {
  signal?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  text?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
};

export type SalescueSentimentResultResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['SalescueSentimentResult'] = ResolversParentTypes['SalescueSentimentResult']> = {
  confidence?: Resolver<ResolversTypes['Float'], ParentType, ContextType>;
  contextGate?: Resolver<ResolversTypes['Float'], ParentType, ContextType>;
  evidence?: Resolver<Array<ResolversTypes['SalescueSentimentEvidence']>, ParentType, ContextType>;
  intent?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  interactionWeight?: Resolver<ResolversTypes['Float'], ParentType, ContextType>;
  interpretation?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  inverted?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  sentiment?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
};

export type SalescueSimilarCompanyResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['SalescueSimilarCompany'] = ResolversParentTypes['SalescueSimilarCompany']> = {
  name?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  similarity?: Resolver<ResolversTypes['Float'], ParentType, ContextType>;
};

export type SalescueSpamResultResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['SalescueSpamResult'] = ResolversParentTypes['SalescueSpamResult']> = {
  aiRisk?: Resolver<ResolversTypes['Float'], ParentType, ContextType>;
  aspectScores?: Resolver<ResolversTypes['JSON'], ParentType, ContextType>;
  categoryScores?: Resolver<ResolversTypes['JSON'], ParentType, ContextType>;
  deliverability?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  gateConfidence?: Resolver<ResolversTypes['Float'], ParentType, ContextType>;
  gateDecision?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  provider?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  providerScores?: Resolver<ResolversTypes['JSON'], ParentType, ContextType>;
  riskFactors?: Resolver<Array<ResolversTypes['String']>, ParentType, ContextType>;
  riskLevel?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  spamCategory?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  spamScore?: Resolver<ResolversTypes['Float'], ParentType, ContextType>;
};

export type SalescueSubjectRankingResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['SalescueSubjectRanking'] = ResolversParentTypes['SalescueSubjectRanking']> = {
  rank?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  score?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  subject?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
};

export type SalescueSubjectResultResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['SalescueSubjectResult'] = ResolversParentTypes['SalescueSubjectResult']> = {
  best?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  ranking?: Resolver<Array<ResolversTypes['SalescueSubjectRanking']>, ParentType, ContextType>;
  worst?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
};

export type SalescueSurvivalResultResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['SalescueSurvivalResult'] = ResolversParentTypes['SalescueSurvivalResult']> = {
  medianDaysToConversion?: Resolver<ResolversTypes['Float'], ParentType, ContextType>;
  pConvert30d?: Resolver<ResolversTypes['Float'], ParentType, ContextType>;
  pConvert90d?: Resolver<ResolversTypes['Float'], ParentType, ContextType>;
  riskConfidence?: Resolver<ResolversTypes['Float'], ParentType, ContextType>;
  riskGroup?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  survivalCurve?: Resolver<ResolversTypes['JSON'], ParentType, ContextType>;
  weibullParams?: Resolver<ResolversTypes['JSON'], ParentType, ContextType>;
};

export type SalescueTriggerEventResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['SalescueTriggerEvent'] = ResolversParentTypes['SalescueTriggerEvent']> = {
  confidence?: Resolver<ResolversTypes['Float'], ParentType, ContextType>;
  displacementCi?: Resolver<Array<ResolversTypes['Float']>, ParentType, ContextType>;
  displacementDays?: Resolver<ResolversTypes['Float'], ParentType, ContextType>;
  displacementUncertainty?: Resolver<ResolversTypes['Float'], ParentType, ContextType>;
  fresh?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  freshness?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  temporalFeatures?: Resolver<ResolversTypes['SalescueTriggerTemporalFeatures'], ParentType, ContextType>;
  type?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
};

export type SalescueTriggerTemporalFeaturesResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['SalescueTriggerTemporalFeatures'] = ResolversParentTypes['SalescueTriggerTemporalFeatures']> = {
  pastSignal?: Resolver<ResolversTypes['Float'], ParentType, ContextType>;
  recentSignal?: Resolver<ResolversTypes['Float'], ParentType, ContextType>;
  todaySignal?: Resolver<ResolversTypes['Float'], ParentType, ContextType>;
};

export type SalescueTriggersResultResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['SalescueTriggersResult'] = ResolversParentTypes['SalescueTriggersResult']> = {
  events?: Resolver<Array<ResolversTypes['SalescueTriggerEvent']>, ParentType, ContextType>;
  primary?: Resolver<Maybe<ResolversTypes['SalescueTriggerEvent']>, ParentType, ContextType>;
};

export type SalescueTurningPointResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['SalescueTurningPoint'] = ResolversParentTypes['SalescueTurningPoint']> = {
  delta?: Resolver<ResolversTypes['Float'], ParentType, ContextType>;
  direction?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  probability?: Resolver<ResolversTypes['Float'], ParentType, ContextType>;
  speaker?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  turn?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  uncertainty?: Resolver<ResolversTypes['Float'], ParentType, ContextType>;
};

export type ScheduleBatchResultResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['ScheduleBatchResult'] = ResolversParentTypes['ScheduleBatchResult']> = {
  failed?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  firstSendDate?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  lastSendDate?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  message?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  scheduled?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  schedulingPlan?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  success?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
};

export type ScoreContactsMlResultResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['ScoreContactsMLResult'] = ResolversParentTypes['ScoreContactsMLResult']> = {
  contactsScored?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  decisionMakersFound?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  message?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  results?: Resolver<Array<ResolversTypes['ContactMLScore']>, ParentType, ContextType>;
  success?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
};

export type SendEmailResultResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['SendEmailResult'] = ResolversParentTypes['SendEmailResult']> = {
  error?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  id?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  success?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
};

export type SendNowResultResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['SendNowResult'] = ResolversParentTypes['SendNowResult']> = {
  error?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  resendId?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  success?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
};

export type SendOutreachEmailResultResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['SendOutreachEmailResult'] = ResolversParentTypes['SendOutreachEmailResult']> = {
  emailId?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  error?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  subject?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  success?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
};

export type SignalTypeCountResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['SignalTypeCount'] = ResolversParentTypes['SignalTypeCount']> = {
  count?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  signalType?: Resolver<ResolversTypes['IntentSignalType'], ParentType, ContextType>;
};

export type SimilarCompanyResultResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['SimilarCompanyResult'] = ResolversParentTypes['SimilarCompanyResult']> = {
  company?: Resolver<ResolversTypes['Company'], ParentType, ContextType>;
  similarity?: Resolver<ResolversTypes['Float'], ParentType, ContextType>;
};

export type SimilarPostResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['SimilarPost'] = ResolversParentTypes['SimilarPost']> = {
  post?: Resolver<ResolversTypes['LinkedInPost'], ParentType, ContextType>;
  similarity?: Resolver<ResolversTypes['Float'], ParentType, ContextType>;
};

export type SkillMatchResultResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['SkillMatchResult'] = ResolversParentTypes['SkillMatchResult']> = {
  claimedSkills?: Resolver<Array<ResolversTypes['String']>, ParentType, ContextType>;
  githubLanguages?: Resolver<Array<ResolversTypes['String']>, ParentType, ContextType>;
  matched?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
};

export type SyncResendResultResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['SyncResendResult'] = ResolversParentTypes['SyncResendResult']> = {
  error?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  skippedCount?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  success?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  totalCount?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  updatedCount?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
};

export interface UrlScalarConfig extends GraphQLScalarTypeConfig<ResolversTypes['URL'], any> {
  name: 'URL';
}

export type UnverifyContactsResultResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['UnverifyContactsResult'] = ResolversParentTypes['UnverifyContactsResult']> = {
  count?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  success?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
};

export interface UploadScalarConfig extends GraphQLScalarTypeConfig<ResolversTypes['Upload'], any> {
  name: 'Upload';
}

export type UpsertLinkedInPostsResultResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['UpsertLinkedInPostsResult'] = ResolversParentTypes['UpsertLinkedInPostsResult']> = {
  errors?: Resolver<Array<ResolversTypes['String']>, ParentType, ContextType>;
  inserted?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  success?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  updated?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
};

export type UserSettingsResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['UserSettings'] = ResolversParentTypes['UserSettings']> = {
  created_at?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  daily_digest?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  dark_mode?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  email_notifications?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  excluded_companies?: Resolver<Maybe<Array<ResolversTypes['String']>>, ParentType, ContextType>;
  id?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  updated_at?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  user_id?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
};

export type VerifyAuthenticityResultResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['VerifyAuthenticityResult'] = ResolversParentTypes['VerifyAuthenticityResult']> = {
  authenticityScore?: Resolver<ResolversTypes['Float'], ParentType, ContextType>;
  contactId?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  flags?: Resolver<Array<ResolversTypes['String']>, ParentType, ContextType>;
  recommendations?: Resolver<Array<ResolversTypes['String']>, ParentType, ContextType>;
  skillMatch?: Resolver<Maybe<ResolversTypes['SkillMatchResult']>, ParentType, ContextType>;
  success?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  verdict?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
};

export type VerifyCompanyContactsResultResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['VerifyCompanyContactsResult'] = ResolversParentTypes['VerifyCompanyContactsResult']> = {
  results?: Resolver<Array<ResolversTypes['VerifyAuthenticityResult']>, ParentType, ContextType>;
  review?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  success?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  suspicious?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  totalChecked?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  verified?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
};

export type VerifyEmailResultResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['VerifyEmailResult'] = ResolversParentTypes['VerifyEmailResult']> = {
  flags?: Resolver<Maybe<Array<ResolversTypes['String']>>, ParentType, ContextType>;
  message?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  rawResult?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  success?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  suggestedCorrection?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  verified?: Resolver<Maybe<ResolversTypes['Boolean']>, ParentType, ContextType>;
};

export type WarcPointerResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['WarcPointer'] = ResolversParentTypes['WarcPointer']> = {
  digest?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  filename?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  length?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  offset?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
};

export type Resolvers<ContextType = GraphQLContext> = {
  AnalyzeCompanyResponse?: AnalyzeCompanyResponseResolvers<ContextType>;
  AnalyzePostsResult?: AnalyzePostsResultResolvers<ContextType>;
  ApplyEmailPatternResult?: ApplyEmailPatternResultResolvers<ContextType>;
  ArchiveEmailResult?: ArchiveEmailResultResolvers<ContextType>;
  BatchDetectIntentResult?: BatchDetectIntentResultResolvers<ContextType>;
  BatchOperationResult?: BatchOperationResultResolvers<ContextType>;
  CancelCompanyEmailsResult?: CancelCompanyEmailsResultResolvers<ContextType>;
  CancelEmailResult?: CancelEmailResultResolvers<ContextType>;
  ClassifyBatchResult?: ClassifyBatchResultResolvers<ContextType>;
  ClassifyEmailResult?: ClassifyEmailResultResolvers<ContextType>;
  CompaniesResponse?: CompaniesResponseResolvers<ContextType>;
  Company?: CompanyResolvers<ContextType>;
  CompanyContactEmail?: CompanyContactEmailResolvers<ContextType>;
  CompanyFact?: CompanyFactResolvers<ContextType>;
  CompanySnapshot?: CompanySnapshotResolvers<ContextType>;
  ComputeNextTouchScoresResult?: ComputeNextTouchScoresResultResolvers<ContextType>;
  Contact?: ContactResolvers<ContextType>;
  ContactAIGitHubRepo?: ContactAiGitHubRepoResolvers<ContextType>;
  ContactAIProfile?: ContactAiProfileResolvers<ContextType>;
  ContactEmail?: ContactEmailResolvers<ContextType>;
  ContactMLScore?: ContactMlScoreResolvers<ContextType>;
  ContactNextTouch?: ContactNextTouchResolvers<ContextType>;
  ContactReminder?: ContactReminderResolvers<ContextType>;
  ContactReminderWithContact?: ContactReminderWithContactResolvers<ContextType>;
  ContactsResult?: ContactsResultResolvers<ContextType>;
  DataQualityScore?: DataQualityScoreResolvers<ContextType>;
  DateTime?: GraphQLScalarType;
  DeleteCampaignResult?: DeleteCampaignResultResolvers<ContextType>;
  DeleteCompaniesResult?: DeleteCompaniesResultResolvers<ContextType>;
  DeleteCompanyResponse?: DeleteCompanyResponseResolvers<ContextType>;
  DeleteContactResult?: DeleteContactResultResolvers<ContextType>;
  DeleteEmailTemplateResult?: DeleteEmailTemplateResultResolvers<ContextType>;
  DetectIntentResult?: DetectIntentResultResolvers<ContextType>;
  EmailAddress?: GraphQLScalarType;
  EmailCampaign?: EmailCampaignResolvers<ContextType>;
  EmailCampaignsResult?: EmailCampaignsResultResolvers<ContextType>;
  EmailPreview?: EmailPreviewResolvers<ContextType>;
  EmailStats?: EmailStatsResolvers<ContextType>;
  EmailTemplate?: EmailTemplateResolvers<ContextType>;
  EmailTemplatesResult?: EmailTemplatesResultResolvers<ContextType>;
  EnhanceAllContactsResult?: EnhanceAllContactsResultResolvers<ContextType>;
  EnhanceCompanyResponse?: EnhanceCompanyResponseResolvers<ContextType>;
  EnrichAIContactResult?: EnrichAiContactResultResolvers<ContextType>;
  EnrichAIContactsBulkResult?: EnrichAiContactsBulkResultResolvers<ContextType>;
  Evidence?: EvidenceResolvers<ContextType>;
  ExtractedSkill?: ExtractedSkillResolvers<ContextType>;
  FindCompanyResult?: FindCompanyResultResolvers<ContextType>;
  FindContactEmailResult?: FindContactEmailResultResolvers<ContextType>;
  FollowUpBatchResult?: FollowUpBatchResultResolvers<ContextType>;
  FollowUpEmail?: FollowUpEmailResolvers<ContextType>;
  FollowUpEmailsResult?: FollowUpEmailsResultResolvers<ContextType>;
  GenerateEmailResult?: GenerateEmailResultResolvers<ContextType>;
  GenerateEmbeddingsResult?: GenerateEmbeddingsResultResolvers<ContextType>;
  GenerateReplyResult?: GenerateReplyResultResolvers<ContextType>;
  ImportCompaniesResult?: ImportCompaniesResultResolvers<ContextType>;
  ImportCompanyResult?: ImportCompanyResultResolvers<ContextType>;
  ImportContactsResult?: ImportContactsResultResolvers<ContextType>;
  ImportResendResult?: ImportResendResultResolvers<ContextType>;
  IntentDashboard?: IntentDashboardResolvers<ContextType>;
  IntentScore?: IntentScoreResolvers<ContextType>;
  IntentSignal?: IntentSignalResolvers<ContextType>;
  IntentSignalsResponse?: IntentSignalsResponseResolvers<ContextType>;
  JSON?: GraphQLScalarType;
  LinkedInPost?: LinkedInPostResolvers<ContextType>;
  MLStats?: MlStatsResolvers<ContextType>;
  MarkRepliedResult?: MarkRepliedResultResolvers<ContextType>;
  MergeCompaniesResult?: MergeCompaniesResultResolvers<ContextType>;
  MergeDuplicateContactsResult?: MergeDuplicateContactsResultResolvers<ContextType>;
  Mutation?: MutationResolvers<ContextType>;
  QualityGateResult?: QualityGateResultResolvers<ContextType>;
  Query?: QueryResolvers<ContextType>;
  RankedContact?: RankedContactResolvers<ContextType>;
  ReceivedEmail?: ReceivedEmailResolvers<ContextType>;
  ReceivedEmailsResult?: ReceivedEmailsResultResolvers<ContextType>;
  RecommendedCompany?: RecommendedCompanyResolvers<ContextType>;
  RefreshIntentResult?: RefreshIntentResultResolvers<ContextType>;
  ResendEmailDetail?: ResendEmailDetailResolvers<ContextType>;
  SalescueAnalyzeResult?: SalescueAnalyzeResultResolvers<ContextType>;
  SalescueAnomalyResult?: SalescueAnomalyResultResolvers<ContextType>;
  SalescueBanditAlternative?: SalescueBanditAlternativeResolvers<ContextType>;
  SalescueBanditArm?: SalescueBanditArmResolvers<ContextType>;
  SalescueBanditResult?: SalescueBanditResultResolvers<ContextType>;
  SalescueCallResult?: SalescueCallResultResolvers<ContextType>;
  SalescueCoachingCard?: SalescueCoachingCardResolvers<ContextType>;
  SalescueCommitment?: SalescueCommitmentResolvers<ContextType>;
  SalescueEmailgenResult?: SalescueEmailgenResultResolvers<ContextType>;
  SalescueEntitiesResult?: SalescueEntitiesResultResolvers<ContextType>;
  SalescueEntity?: SalescueEntityResolvers<ContextType>;
  SalescueGraphResult?: SalescueGraphResultResolvers<ContextType>;
  SalescueGraphSignal?: SalescueGraphSignalResolvers<ContextType>;
  SalescueHealth?: SalescueHealthResolvers<ContextType>;
  SalescueICPDimensionFit?: SalescueIcpDimensionFitResolvers<ContextType>;
  SalescueICPResult?: SalescueIcpResultResolvers<ContextType>;
  SalescueIntentResult?: SalescueIntentResultResolvers<ContextType>;
  SalescueIntentTrajectory?: SalescueIntentTrajectoryResolvers<ContextType>;
  SalescueModuleError?: SalescueModuleErrorResolvers<ContextType>;
  SalescueObjectionResult?: SalescueObjectionResultResolvers<ContextType>;
  SalescueReplyEvidence?: SalescueReplyEvidenceResolvers<ContextType>;
  SalescueReplyResult?: SalescueReplyResultResolvers<ContextType>;
  SalescueScoreCategories?: SalescueScoreCategoriesResolvers<ContextType>;
  SalescueScoreResult?: SalescueScoreResultResolvers<ContextType>;
  SalescueScoreSignal?: SalescueScoreSignalResolvers<ContextType>;
  SalescueSentimentEvidence?: SalescueSentimentEvidenceResolvers<ContextType>;
  SalescueSentimentResult?: SalescueSentimentResultResolvers<ContextType>;
  SalescueSimilarCompany?: SalescueSimilarCompanyResolvers<ContextType>;
  SalescueSpamResult?: SalescueSpamResultResolvers<ContextType>;
  SalescueSubjectRanking?: SalescueSubjectRankingResolvers<ContextType>;
  SalescueSubjectResult?: SalescueSubjectResultResolvers<ContextType>;
  SalescueSurvivalResult?: SalescueSurvivalResultResolvers<ContextType>;
  SalescueTriggerEvent?: SalescueTriggerEventResolvers<ContextType>;
  SalescueTriggerTemporalFeatures?: SalescueTriggerTemporalFeaturesResolvers<ContextType>;
  SalescueTriggersResult?: SalescueTriggersResultResolvers<ContextType>;
  SalescueTurningPoint?: SalescueTurningPointResolvers<ContextType>;
  ScheduleBatchResult?: ScheduleBatchResultResolvers<ContextType>;
  ScoreContactsMLResult?: ScoreContactsMlResultResolvers<ContextType>;
  SendEmailResult?: SendEmailResultResolvers<ContextType>;
  SendNowResult?: SendNowResultResolvers<ContextType>;
  SendOutreachEmailResult?: SendOutreachEmailResultResolvers<ContextType>;
  SignalTypeCount?: SignalTypeCountResolvers<ContextType>;
  SimilarCompanyResult?: SimilarCompanyResultResolvers<ContextType>;
  SimilarPost?: SimilarPostResolvers<ContextType>;
  SkillMatchResult?: SkillMatchResultResolvers<ContextType>;
  SyncResendResult?: SyncResendResultResolvers<ContextType>;
  URL?: GraphQLScalarType;
  UnverifyContactsResult?: UnverifyContactsResultResolvers<ContextType>;
  Upload?: GraphQLScalarType;
  UpsertLinkedInPostsResult?: UpsertLinkedInPostsResultResolvers<ContextType>;
  UserSettings?: UserSettingsResolvers<ContextType>;
  VerifyAuthenticityResult?: VerifyAuthenticityResultResolvers<ContextType>;
  VerifyCompanyContactsResult?: VerifyCompanyContactsResultResolvers<ContextType>;
  VerifyEmailResult?: VerifyEmailResultResolvers<ContextType>;
  WarcPointer?: WarcPointerResolvers<ContextType>;
};

