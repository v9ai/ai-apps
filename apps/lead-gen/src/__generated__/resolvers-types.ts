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

export type AtsBoard = {
  __typename?: 'ATSBoard';
  board_type: AtsBoardType;
  company_id: Scalars['Int']['output'];
  confidence: Scalars['Float']['output'];
  created_at: Scalars['String']['output'];
  evidence: Evidence;
  first_seen_at: Scalars['String']['output'];
  id: Scalars['Int']['output'];
  is_active: Scalars['Boolean']['output'];
  last_seen_at: Scalars['String']['output'];
  updated_at: Scalars['String']['output'];
  url: Scalars['String']['output'];
  vendor: AtsVendor;
};

export type AtsBoardType =
  | 'BOARD_API'
  | 'BOARD_WIDGET'
  | 'JOBS_PAGE'
  | 'UNKNOWN';

export type AtsBoardUpsertInput = {
  board_type: AtsBoardType;
  confidence: Scalars['Float']['input'];
  evidence: EvidenceInput;
  is_active: Scalars['Boolean']['input'];
  last_seen_at: Scalars['String']['input'];
  url: Scalars['String']['input'];
  vendor: AtsVendor;
};

export type AtsVendor =
  | 'ASHBY'
  | 'BREEZYHR'
  | 'GREENHOUSE'
  | 'ICIMS'
  | 'JAZZHR'
  | 'JOBVITE'
  | 'LEVER'
  | 'ORACLE_TALEO'
  | 'OTHER'
  | 'SAP_SUCCESSFACTORS'
  | 'SMARTRECRUITERS'
  | 'TEAMTAILOR'
  | 'WORKABLE';

export type AnalyzeCompanyResponse = {
  __typename?: 'AnalyzeCompanyResponse';
  companyId: Maybe<Scalars['Int']['output']>;
  companyKey: Maybe<Scalars['String']['output']>;
  message: Maybe<Scalars['String']['output']>;
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

export type AshbyEnrichment = {
  __typename?: 'AshbyEnrichment';
  company_name: Maybe<Scalars['String']['output']>;
  enriched_at: Maybe<Scalars['String']['output']>;
  industry_tags: Array<Scalars['String']['output']>;
  size_signal: Maybe<Scalars['String']['output']>;
  tech_signals: Array<Scalars['String']['output']>;
};

export type BatchRecipientInput = {
  companyId?: InputMaybe<Scalars['Int']['input']>;
  contactId?: InputMaybe<Scalars['Int']['input']>;
  email: Scalars['String']['input'];
  name: Scalars['String']['input'];
};

export type BlockJobsResult = {
  __typename?: 'BlockJobsResult';
  message: Scalars['String']['output'];
  success: Scalars['Boolean']['output'];
};

export type BlockedCompany = {
  __typename?: 'BlockedCompany';
  createdAt: Scalars['String']['output'];
  id: Scalars['Int']['output'];
  name: Scalars['String']['output'];
  reason: Maybe<Scalars['String']['output']>;
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
  ashby_enrichment: Maybe<AshbyEnrichment>;
  ats_boards: Array<AtsBoard>;
  category: CompanyCategory;
  contacts: Array<Contact>;
  created_at: Scalars['String']['output'];
  deep_analysis: Maybe<Scalars['String']['output']>;
  description: Maybe<Scalars['String']['output']>;
  email: Maybe<Scalars['String']['output']>;
  emailsList: Array<Scalars['String']['output']>;
  facts: Array<CompanyFact>;
  facts_count: Scalars['Int']['output'];
  githubUrl: Maybe<Scalars['String']['output']>;
  id: Scalars['Int']['output'];
  industries: Array<Scalars['String']['output']>;
  industry: Maybe<Scalars['String']['output']>;
  job_board_url: Maybe<Scalars['String']['output']>;
  key: Scalars['String']['output'];
  last_seen_capture_timestamp: Maybe<Scalars['String']['output']>;
  last_seen_crawl_id: Maybe<Scalars['String']['output']>;
  last_seen_source_url: Maybe<Scalars['String']['output']>;
  linkedin_url: Maybe<Scalars['String']['output']>;
  location: Maybe<Scalars['String']['output']>;
  logo_url: Maybe<Scalars['String']['output']>;
  name: Scalars['String']['output'];
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
  | 'DIRECTORY'
  | 'OTHER'
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
  category_in?: InputMaybe<Array<CompanyCategory>>;
  has_ats_boards?: InputMaybe<Scalars['Boolean']['input']>;
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

export type Contact = {
  __typename?: 'Contact';
  bouncedEmails: Array<Scalars['String']['output']>;
  company: Maybe<Scalars['String']['output']>;
  companyId: Maybe<Scalars['Int']['output']>;
  createdAt: Scalars['String']['output'];
  doNotContact: Scalars['Boolean']['output'];
  email: Maybe<Scalars['String']['output']>;
  emailVerified: Maybe<Scalars['Boolean']['output']>;
  emails: Array<Scalars['String']['output']>;
  firstName: Scalars['String']['output'];
  githubHandle: Maybe<Scalars['String']['output']>;
  id: Scalars['Int']['output'];
  lastName: Scalars['String']['output'];
  linkedinUrl: Maybe<Scalars['String']['output']>;
  nbExecutionTimeMs: Maybe<Scalars['Int']['output']>;
  nbFlags: Array<Scalars['String']['output']>;
  nbResult: Maybe<Scalars['String']['output']>;
  nbRetryToken: Maybe<Scalars['String']['output']>;
  nbStatus: Maybe<Scalars['String']['output']>;
  nbSuggestedCorrection: Maybe<Scalars['String']['output']>;
  position: Maybe<Scalars['String']['output']>;
  tags: Array<Scalars['String']['output']>;
  telegramHandle: Maybe<Scalars['String']['output']>;
  updatedAt: Scalars['String']['output'];
  userId: Maybe<Scalars['String']['output']>;
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

export type DeleteBlockedCompanyResult = {
  __typename?: 'DeleteBlockedCompanyResult';
  message: Maybe<Scalars['String']['output']>;
  success: Scalars['Boolean']['output'];
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
  website?: InputMaybe<Scalars['String']['input']>;
};

export type ImportContactInput = {
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
  applyEmailPattern: ApplyEmailPatternResult;
  archiveEmail: ArchiveEmailResult;
  blockCompany: BlockedCompany;
  blockJobsByCompany: BlockJobsResult;
  cancelCompanyEmails: CancelCompanyEmailsResult;
  cancelScheduledEmail: CancelEmailResult;
  createCompany: Company;
  createContact: Contact;
  createDraftCampaign: EmailCampaign;
  createEmailTemplate: EmailTemplate;
  deleteCampaign: DeleteCampaignResult;
  deleteCompanies: DeleteCompaniesResult;
  deleteCompany: DeleteCompanyResponse;
  deleteContact: DeleteContactResult;
  deleteEmailTemplate: DeleteEmailTemplateResult;
  enhanceAllContacts: EnhanceAllContactsResult;
  enhanceCompany: EnhanceCompanyResponse;
  findCompanyEmails: EnhanceAllContactsResult;
  findContactEmail: FindContactEmailResult;
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
  scheduleBatchEmails: ScheduleBatchResult;
  scheduleFollowUpBatch: FollowUpBatchResult;
  sendEmail: SendEmailResult;
  sendOutreachEmail: SendOutreachEmailResult;
  sendScheduledEmailNow: SendNowResult;
  syncResendEmails: SyncResendResult;
  unarchiveEmail: ArchiveEmailResult;
  unblockCompany: DeleteBlockedCompanyResult;
  unverifyCompanyContacts: UnverifyContactsResult;
  updateCampaign: EmailCampaign;
  updateCompany: Company;
  updateContact: Contact;
  updateEmailTemplate: EmailTemplate;
  updateUserSettings: UserSettings;
  upsert_company_ats_boards: Array<AtsBoard>;
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


export type MutationApplyEmailPatternArgs = {
  companyId: Scalars['Int']['input'];
};


export type MutationArchiveEmailArgs = {
  id: Scalars['Int']['input'];
};


export type MutationBlockCompanyArgs = {
  name: Scalars['String']['input'];
  reason?: InputMaybe<Scalars['String']['input']>;
};


export type MutationBlockJobsByCompanyArgs = {
  companyName: Scalars['String']['input'];
};


export type MutationCancelCompanyEmailsArgs = {
  companyId: Scalars['Int']['input'];
};


export type MutationCancelScheduledEmailArgs = {
  resendId: Scalars['String']['input'];
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


export type MutationEnhanceCompanyArgs = {
  id?: InputMaybe<Scalars['Int']['input']>;
  key?: InputMaybe<Scalars['String']['input']>;
};


export type MutationFindCompanyEmailsArgs = {
  companyId: Scalars['Int']['input'];
};


export type MutationFindContactEmailArgs = {
  contactId: Scalars['Int']['input'];
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


export type MutationScheduleBatchEmailsArgs = {
  input: ScheduleBatchEmailsInput;
};


export type MutationScheduleFollowUpBatchArgs = {
  input: FollowUpBatchInput;
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


export type MutationSyncResendEmailsArgs = {
  companyId?: InputMaybe<Scalars['Int']['input']>;
};


export type MutationUnarchiveEmailArgs = {
  id: Scalars['Int']['input'];
};


export type MutationUnblockCompanyArgs = {
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


export type MutationUpdateUserSettingsArgs = {
  settings: UserSettingsInput;
  userId: Scalars['String']['input'];
};


export type MutationUpsert_Company_Ats_BoardsArgs = {
  boards: Array<AtsBoardUpsertInput>;
  company_id: Scalars['Int']['input'];
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

export type Query = {
  __typename?: 'Query';
  allCompanyTags: Array<Scalars['String']['output']>;
  blockedCompanies: Array<BlockedCompany>;
  companies: CompaniesResponse;
  company: Maybe<Company>;
  companyContactEmails: Array<CompanyContactEmail>;
  company_ats_boards: Array<AtsBoard>;
  company_facts: Array<CompanyFact>;
  company_snapshots: Array<CompanySnapshot>;
  contact: Maybe<Contact>;
  contactByEmail: Maybe<Contact>;
  contactEmails: Array<ContactEmail>;
  contacts: ContactsResult;
  emailCampaign: Maybe<EmailCampaign>;
  emailCampaigns: EmailCampaignsResult;
  emailStats: EmailStats;
  emailTemplate: Maybe<EmailTemplate>;
  emailTemplates: EmailTemplatesResult;
  emailsNeedingFollowUp: FollowUpEmailsResult;
  findCompany: FindCompanyResult;
  receivedEmail: Maybe<ReceivedEmail>;
  receivedEmails: ReceivedEmailsResult;
  resendEmail: Maybe<ResendEmailDetail>;
  userSettings: Maybe<UserSettings>;
};


export type QueryCompaniesArgs = {
  filter?: InputMaybe<CompanyFilterInput>;
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
  order_by?: InputMaybe<CompanyOrderBy>;
};


export type QueryCompanyArgs = {
  id?: InputMaybe<Scalars['Int']['input']>;
  key?: InputMaybe<Scalars['String']['input']>;
};


export type QueryCompanyContactEmailsArgs = {
  companyId: Scalars['Int']['input'];
};


export type QueryCompany_Ats_BoardsArgs = {
  company_id: Scalars['Int']['input'];
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


export type QueryReceivedEmailArgs = {
  id: Scalars['Int']['input'];
};


export type QueryReceivedEmailsArgs = {
  archived?: InputMaybe<Scalars['Boolean']['input']>;
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
};


export type QueryResendEmailArgs = {
  resendId: Scalars['String']['input'];
};


export type QueryUserSettingsArgs = {
  userId: Scalars['String']['input'];
};

export type ReceivedEmail = {
  __typename?: 'ReceivedEmail';
  archivedAt: Maybe<Scalars['String']['output']>;
  attachments: Maybe<Scalars['JSON']['output']>;
  ccEmails: Array<Scalars['String']['output']>;
  createdAt: Scalars['String']['output'];
  fromEmail: Maybe<Scalars['String']['output']>;
  htmlContent: Maybe<Scalars['String']['output']>;
  id: Scalars['Int']['output'];
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

export type SourceType =
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
  ATSBoard: ResolverTypeWrapper<Partial<AtsBoard>>;
  ATSBoardType: ResolverTypeWrapper<Partial<AtsBoardType>>;
  ATSBoardUpsertInput: ResolverTypeWrapper<Partial<AtsBoardUpsertInput>>;
  ATSVendor: ResolverTypeWrapper<Partial<AtsVendor>>;
  AnalyzeCompanyResponse: ResolverTypeWrapper<Partial<AnalyzeCompanyResponse>>;
  ApplyEmailPatternResult: ResolverTypeWrapper<Partial<ApplyEmailPatternResult>>;
  ArchiveEmailResult: ResolverTypeWrapper<Partial<ArchiveEmailResult>>;
  AshbyEnrichment: ResolverTypeWrapper<Partial<AshbyEnrichment>>;
  BatchRecipientInput: ResolverTypeWrapper<Partial<BatchRecipientInput>>;
  BlockJobsResult: ResolverTypeWrapper<Partial<BlockJobsResult>>;
  BlockedCompany: ResolverTypeWrapper<Partial<BlockedCompany>>;
  Boolean: ResolverTypeWrapper<Partial<Scalars['Boolean']['output']>>;
  CancelCompanyEmailsResult: ResolverTypeWrapper<Partial<CancelCompanyEmailsResult>>;
  CancelEmailResult: ResolverTypeWrapper<Partial<CancelEmailResult>>;
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
  Contact: ResolverTypeWrapper<Partial<Contact>>;
  ContactEmail: ResolverTypeWrapper<Partial<ContactEmail>>;
  ContactInput: ResolverTypeWrapper<Partial<ContactInput>>;
  ContactsResult: ResolverTypeWrapper<Partial<ContactsResult>>;
  CreateCampaignInput: ResolverTypeWrapper<Partial<CreateCampaignInput>>;
  CreateCompanyInput: ResolverTypeWrapper<Partial<CreateCompanyInput>>;
  CreateContactInput: ResolverTypeWrapper<Partial<CreateContactInput>>;
  CreateEmailTemplateInput: ResolverTypeWrapper<Partial<CreateEmailTemplateInput>>;
  DateTime: ResolverTypeWrapper<Partial<Scalars['DateTime']['output']>>;
  DeleteBlockedCompanyResult: ResolverTypeWrapper<Partial<DeleteBlockedCompanyResult>>;
  DeleteCampaignResult: ResolverTypeWrapper<Partial<DeleteCampaignResult>>;
  DeleteCompaniesResult: ResolverTypeWrapper<Partial<DeleteCompaniesResult>>;
  DeleteCompanyResponse: ResolverTypeWrapper<Partial<DeleteCompanyResponse>>;
  DeleteContactResult: ResolverTypeWrapper<Partial<DeleteContactResult>>;
  DeleteEmailTemplateResult: ResolverTypeWrapper<Partial<DeleteEmailTemplateResult>>;
  EmailAddress: ResolverTypeWrapper<Partial<Scalars['EmailAddress']['output']>>;
  EmailCampaign: ResolverTypeWrapper<Partial<EmailCampaign>>;
  EmailCampaignsResult: ResolverTypeWrapper<Partial<EmailCampaignsResult>>;
  EmailPreview: ResolverTypeWrapper<Partial<EmailPreview>>;
  EmailStats: ResolverTypeWrapper<Partial<EmailStats>>;
  EmailTemplate: ResolverTypeWrapper<Partial<EmailTemplate>>;
  EmailTemplatesResult: ResolverTypeWrapper<Partial<EmailTemplatesResult>>;
  EnhanceAllContactsResult: ResolverTypeWrapper<Partial<EnhanceAllContactsResult>>;
  EnhanceCompanyResponse: ResolverTypeWrapper<Partial<EnhanceCompanyResponse>>;
  Evidence: ResolverTypeWrapper<Partial<Evidence>>;
  EvidenceInput: ResolverTypeWrapper<Partial<EvidenceInput>>;
  ExtractMethod: ResolverTypeWrapper<Partial<ExtractMethod>>;
  FindCompanyResult: ResolverTypeWrapper<Partial<FindCompanyResult>>;
  FindContactEmailResult: ResolverTypeWrapper<Partial<FindContactEmailResult>>;
  Float: ResolverTypeWrapper<Partial<Scalars['Float']['output']>>;
  FollowUpBatchInput: ResolverTypeWrapper<Partial<FollowUpBatchInput>>;
  FollowUpBatchResult: ResolverTypeWrapper<Partial<FollowUpBatchResult>>;
  FollowUpEmail: ResolverTypeWrapper<Partial<FollowUpEmail>>;
  FollowUpEmailsResult: ResolverTypeWrapper<Partial<FollowUpEmailsResult>>;
  GenerateEmailInput: ResolverTypeWrapper<Partial<GenerateEmailInput>>;
  GenerateEmailResult: ResolverTypeWrapper<Partial<GenerateEmailResult>>;
  GenerateReplyInput: ResolverTypeWrapper<Partial<GenerateReplyInput>>;
  GenerateReplyResult: ResolverTypeWrapper<Partial<GenerateReplyResult>>;
  ImportCompaniesResult: ResolverTypeWrapper<Partial<ImportCompaniesResult>>;
  ImportCompanyResult: ResolverTypeWrapper<Partial<ImportCompanyResult>>;
  ImportCompanyWithContactsInput: ResolverTypeWrapper<Partial<ImportCompanyWithContactsInput>>;
  ImportContactInput: ResolverTypeWrapper<Partial<ImportContactInput>>;
  ImportContactsResult: ResolverTypeWrapper<Partial<ImportContactsResult>>;
  ImportResendResult: ResolverTypeWrapper<Partial<ImportResendResult>>;
  Int: ResolverTypeWrapper<Partial<Scalars['Int']['output']>>;
  JSON: ResolverTypeWrapper<Partial<Scalars['JSON']['output']>>;
  MarkRepliedResult: ResolverTypeWrapper<Partial<MarkRepliedResult>>;
  MergeCompaniesResult: ResolverTypeWrapper<Partial<MergeCompaniesResult>>;
  MergeDuplicateContactsResult: ResolverTypeWrapper<Partial<MergeDuplicateContactsResult>>;
  Mutation: ResolverTypeWrapper<Record<PropertyKey, never>>;
  PreviewEmailInput: ResolverTypeWrapper<Partial<PreviewEmailInput>>;
  Query: ResolverTypeWrapper<Record<PropertyKey, never>>;
  ReceivedEmail: ResolverTypeWrapper<Partial<ReceivedEmail>>;
  ReceivedEmailsResult: ResolverTypeWrapper<Partial<ReceivedEmailsResult>>;
  ResendEmailDetail: ResolverTypeWrapper<Partial<ResendEmailDetail>>;
  ScheduleBatchEmailsInput: ResolverTypeWrapper<Partial<ScheduleBatchEmailsInput>>;
  ScheduleBatchResult: ResolverTypeWrapper<Partial<ScheduleBatchResult>>;
  SendEmailInput: ResolverTypeWrapper<Partial<SendEmailInput>>;
  SendEmailResult: ResolverTypeWrapper<Partial<SendEmailResult>>;
  SendNowResult: ResolverTypeWrapper<Partial<SendNowResult>>;
  SendOutreachEmailInput: ResolverTypeWrapper<Partial<SendOutreachEmailInput>>;
  SendOutreachEmailResult: ResolverTypeWrapper<Partial<SendOutreachEmailResult>>;
  SourceType: ResolverTypeWrapper<Partial<SourceType>>;
  String: ResolverTypeWrapper<Partial<Scalars['String']['output']>>;
  SyncResendResult: ResolverTypeWrapper<Partial<SyncResendResult>>;
  URL: ResolverTypeWrapper<Partial<Scalars['URL']['output']>>;
  UnverifyContactsResult: ResolverTypeWrapper<Partial<UnverifyContactsResult>>;
  UpdateCampaignInput: ResolverTypeWrapper<Partial<UpdateCampaignInput>>;
  UpdateCompanyInput: ResolverTypeWrapper<Partial<UpdateCompanyInput>>;
  UpdateContactInput: ResolverTypeWrapper<Partial<UpdateContactInput>>;
  UpdateEmailTemplateInput: ResolverTypeWrapper<Partial<UpdateEmailTemplateInput>>;
  Upload: ResolverTypeWrapper<Partial<Scalars['Upload']['output']>>;
  UserSettings: ResolverTypeWrapper<Partial<UserSettings>>;
  UserSettingsInput: ResolverTypeWrapper<Partial<UserSettingsInput>>;
  VerifyEmailResult: ResolverTypeWrapper<Partial<VerifyEmailResult>>;
  WarcPointer: ResolverTypeWrapper<Partial<WarcPointer>>;
  WarcPointerInput: ResolverTypeWrapper<Partial<WarcPointerInput>>;
};

/** Mapping between all available schema types and the resolvers parents */
export type ResolversParentTypes = {
  ATSBoard: Partial<AtsBoard>;
  ATSBoardUpsertInput: Partial<AtsBoardUpsertInput>;
  AnalyzeCompanyResponse: Partial<AnalyzeCompanyResponse>;
  ApplyEmailPatternResult: Partial<ApplyEmailPatternResult>;
  ArchiveEmailResult: Partial<ArchiveEmailResult>;
  AshbyEnrichment: Partial<AshbyEnrichment>;
  BatchRecipientInput: Partial<BatchRecipientInput>;
  BlockJobsResult: Partial<BlockJobsResult>;
  BlockedCompany: Partial<BlockedCompany>;
  Boolean: Partial<Scalars['Boolean']['output']>;
  CancelCompanyEmailsResult: Partial<CancelCompanyEmailsResult>;
  CancelEmailResult: Partial<CancelEmailResult>;
  CompaniesResponse: Partial<CompaniesResponse>;
  Company: Partial<Company>;
  CompanyContactEmail: Partial<CompanyContactEmail>;
  CompanyFact: Partial<CompanyFact>;
  CompanyFactInput: Partial<CompanyFactInput>;
  CompanyFilterInput: Partial<CompanyFilterInput>;
  CompanyImportInput: Partial<CompanyImportInput>;
  CompanySnapshot: Partial<CompanySnapshot>;
  Contact: Partial<Contact>;
  ContactEmail: Partial<ContactEmail>;
  ContactInput: Partial<ContactInput>;
  ContactsResult: Partial<ContactsResult>;
  CreateCampaignInput: Partial<CreateCampaignInput>;
  CreateCompanyInput: Partial<CreateCompanyInput>;
  CreateContactInput: Partial<CreateContactInput>;
  CreateEmailTemplateInput: Partial<CreateEmailTemplateInput>;
  DateTime: Partial<Scalars['DateTime']['output']>;
  DeleteBlockedCompanyResult: Partial<DeleteBlockedCompanyResult>;
  DeleteCampaignResult: Partial<DeleteCampaignResult>;
  DeleteCompaniesResult: Partial<DeleteCompaniesResult>;
  DeleteCompanyResponse: Partial<DeleteCompanyResponse>;
  DeleteContactResult: Partial<DeleteContactResult>;
  DeleteEmailTemplateResult: Partial<DeleteEmailTemplateResult>;
  EmailAddress: Partial<Scalars['EmailAddress']['output']>;
  EmailCampaign: Partial<EmailCampaign>;
  EmailCampaignsResult: Partial<EmailCampaignsResult>;
  EmailPreview: Partial<EmailPreview>;
  EmailStats: Partial<EmailStats>;
  EmailTemplate: Partial<EmailTemplate>;
  EmailTemplatesResult: Partial<EmailTemplatesResult>;
  EnhanceAllContactsResult: Partial<EnhanceAllContactsResult>;
  EnhanceCompanyResponse: Partial<EnhanceCompanyResponse>;
  Evidence: Partial<Evidence>;
  EvidenceInput: Partial<EvidenceInput>;
  FindCompanyResult: Partial<FindCompanyResult>;
  FindContactEmailResult: Partial<FindContactEmailResult>;
  Float: Partial<Scalars['Float']['output']>;
  FollowUpBatchInput: Partial<FollowUpBatchInput>;
  FollowUpBatchResult: Partial<FollowUpBatchResult>;
  FollowUpEmail: Partial<FollowUpEmail>;
  FollowUpEmailsResult: Partial<FollowUpEmailsResult>;
  GenerateEmailInput: Partial<GenerateEmailInput>;
  GenerateEmailResult: Partial<GenerateEmailResult>;
  GenerateReplyInput: Partial<GenerateReplyInput>;
  GenerateReplyResult: Partial<GenerateReplyResult>;
  ImportCompaniesResult: Partial<ImportCompaniesResult>;
  ImportCompanyResult: Partial<ImportCompanyResult>;
  ImportCompanyWithContactsInput: Partial<ImportCompanyWithContactsInput>;
  ImportContactInput: Partial<ImportContactInput>;
  ImportContactsResult: Partial<ImportContactsResult>;
  ImportResendResult: Partial<ImportResendResult>;
  Int: Partial<Scalars['Int']['output']>;
  JSON: Partial<Scalars['JSON']['output']>;
  MarkRepliedResult: Partial<MarkRepliedResult>;
  MergeCompaniesResult: Partial<MergeCompaniesResult>;
  MergeDuplicateContactsResult: Partial<MergeDuplicateContactsResult>;
  Mutation: Record<PropertyKey, never>;
  PreviewEmailInput: Partial<PreviewEmailInput>;
  Query: Record<PropertyKey, never>;
  ReceivedEmail: Partial<ReceivedEmail>;
  ReceivedEmailsResult: Partial<ReceivedEmailsResult>;
  ResendEmailDetail: Partial<ResendEmailDetail>;
  ScheduleBatchEmailsInput: Partial<ScheduleBatchEmailsInput>;
  ScheduleBatchResult: Partial<ScheduleBatchResult>;
  SendEmailInput: Partial<SendEmailInput>;
  SendEmailResult: Partial<SendEmailResult>;
  SendNowResult: Partial<SendNowResult>;
  SendOutreachEmailInput: Partial<SendOutreachEmailInput>;
  SendOutreachEmailResult: Partial<SendOutreachEmailResult>;
  String: Partial<Scalars['String']['output']>;
  SyncResendResult: Partial<SyncResendResult>;
  URL: Partial<Scalars['URL']['output']>;
  UnverifyContactsResult: Partial<UnverifyContactsResult>;
  UpdateCampaignInput: Partial<UpdateCampaignInput>;
  UpdateCompanyInput: Partial<UpdateCompanyInput>;
  UpdateContactInput: Partial<UpdateContactInput>;
  UpdateEmailTemplateInput: Partial<UpdateEmailTemplateInput>;
  Upload: Partial<Scalars['Upload']['output']>;
  UserSettings: Partial<UserSettings>;
  UserSettingsInput: Partial<UserSettingsInput>;
  VerifyEmailResult: Partial<VerifyEmailResult>;
  WarcPointer: Partial<WarcPointer>;
  WarcPointerInput: Partial<WarcPointerInput>;
};

export type AtsBoardResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['ATSBoard'] = ResolversParentTypes['ATSBoard']> = {
  board_type?: Resolver<ResolversTypes['ATSBoardType'], ParentType, ContextType>;
  company_id?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  confidence?: Resolver<ResolversTypes['Float'], ParentType, ContextType>;
  created_at?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  evidence?: Resolver<ResolversTypes['Evidence'], ParentType, ContextType>;
  first_seen_at?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  id?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  is_active?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  last_seen_at?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  updated_at?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  url?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  vendor?: Resolver<ResolversTypes['ATSVendor'], ParentType, ContextType>;
};

export type AnalyzeCompanyResponseResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['AnalyzeCompanyResponse'] = ResolversParentTypes['AnalyzeCompanyResponse']> = {
  companyId?: Resolver<Maybe<ResolversTypes['Int']>, ParentType, ContextType>;
  companyKey?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  message?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
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

export type AshbyEnrichmentResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['AshbyEnrichment'] = ResolversParentTypes['AshbyEnrichment']> = {
  company_name?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  enriched_at?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  industry_tags?: Resolver<Array<ResolversTypes['String']>, ParentType, ContextType>;
  size_signal?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  tech_signals?: Resolver<Array<ResolversTypes['String']>, ParentType, ContextType>;
};

export type BlockJobsResultResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['BlockJobsResult'] = ResolversParentTypes['BlockJobsResult']> = {
  message?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  success?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
};

export type BlockedCompanyResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['BlockedCompany'] = ResolversParentTypes['BlockedCompany']> = {
  createdAt?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  id?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  name?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  reason?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
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

export type CompaniesResponseResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['CompaniesResponse'] = ResolversParentTypes['CompaniesResponse']> = {
  companies?: Resolver<Array<ResolversTypes['Company']>, ParentType, ContextType>;
  totalCount?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
};

export type CompanyResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['Company'] = ResolversParentTypes['Company']> = {
  ai_classification_confidence?: Resolver<ResolversTypes['Float'], ParentType, ContextType>;
  ai_classification_reason?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  ai_tier?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  ashby_enrichment?: Resolver<Maybe<ResolversTypes['AshbyEnrichment']>, ParentType, ContextType>;
  ats_boards?: Resolver<Array<ResolversTypes['ATSBoard']>, ParentType, ContextType>;
  category?: Resolver<ResolversTypes['CompanyCategory'], ParentType, ContextType>;
  contacts?: Resolver<Array<ResolversTypes['Contact']>, ParentType, ContextType>;
  created_at?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  deep_analysis?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  description?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  email?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  emailsList?: Resolver<Array<ResolversTypes['String']>, ParentType, ContextType>;
  facts?: Resolver<Array<ResolversTypes['CompanyFact']>, ParentType, ContextType, Partial<CompanyFactsArgs>>;
  facts_count?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  githubUrl?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  id?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  industries?: Resolver<Array<ResolversTypes['String']>, ParentType, ContextType>;
  industry?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  job_board_url?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  key?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  last_seen_capture_timestamp?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  last_seen_crawl_id?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  last_seen_source_url?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  linkedin_url?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  location?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  logo_url?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  name?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
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

export type ContactResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['Contact'] = ResolversParentTypes['Contact']> = {
  bouncedEmails?: Resolver<Array<ResolversTypes['String']>, ParentType, ContextType>;
  company?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  companyId?: Resolver<Maybe<ResolversTypes['Int']>, ParentType, ContextType>;
  createdAt?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  doNotContact?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  email?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  emailVerified?: Resolver<Maybe<ResolversTypes['Boolean']>, ParentType, ContextType>;
  emails?: Resolver<Array<ResolversTypes['String']>, ParentType, ContextType>;
  firstName?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  githubHandle?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  id?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  lastName?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  linkedinUrl?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  nbExecutionTimeMs?: Resolver<Maybe<ResolversTypes['Int']>, ParentType, ContextType>;
  nbFlags?: Resolver<Array<ResolversTypes['String']>, ParentType, ContextType>;
  nbResult?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  nbRetryToken?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  nbStatus?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  nbSuggestedCorrection?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  position?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  tags?: Resolver<Array<ResolversTypes['String']>, ParentType, ContextType>;
  telegramHandle?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  updatedAt?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  userId?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
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

export type ContactsResultResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['ContactsResult'] = ResolversParentTypes['ContactsResult']> = {
  contacts?: Resolver<Array<ResolversTypes['Contact']>, ParentType, ContextType>;
  totalCount?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
};

export interface DateTimeScalarConfig extends GraphQLScalarTypeConfig<ResolversTypes['DateTime'], any> {
  name: 'DateTime';
}

export type DeleteBlockedCompanyResultResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['DeleteBlockedCompanyResult'] = ResolversParentTypes['DeleteBlockedCompanyResult']> = {
  message?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  success?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
};

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

export interface JsonScalarConfig extends GraphQLScalarTypeConfig<ResolversTypes['JSON'], any> {
  name: 'JSON';
}

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
  applyEmailPattern?: Resolver<ResolversTypes['ApplyEmailPatternResult'], ParentType, ContextType, RequireFields<MutationApplyEmailPatternArgs, 'companyId'>>;
  archiveEmail?: Resolver<ResolversTypes['ArchiveEmailResult'], ParentType, ContextType, RequireFields<MutationArchiveEmailArgs, 'id'>>;
  blockCompany?: Resolver<ResolversTypes['BlockedCompany'], ParentType, ContextType, RequireFields<MutationBlockCompanyArgs, 'name'>>;
  blockJobsByCompany?: Resolver<ResolversTypes['BlockJobsResult'], ParentType, ContextType, RequireFields<MutationBlockJobsByCompanyArgs, 'companyName'>>;
  cancelCompanyEmails?: Resolver<ResolversTypes['CancelCompanyEmailsResult'], ParentType, ContextType, RequireFields<MutationCancelCompanyEmailsArgs, 'companyId'>>;
  cancelScheduledEmail?: Resolver<ResolversTypes['CancelEmailResult'], ParentType, ContextType, RequireFields<MutationCancelScheduledEmailArgs, 'resendId'>>;
  createCompany?: Resolver<ResolversTypes['Company'], ParentType, ContextType, RequireFields<MutationCreateCompanyArgs, 'input'>>;
  createContact?: Resolver<ResolversTypes['Contact'], ParentType, ContextType, RequireFields<MutationCreateContactArgs, 'input'>>;
  createDraftCampaign?: Resolver<ResolversTypes['EmailCampaign'], ParentType, ContextType, RequireFields<MutationCreateDraftCampaignArgs, 'input'>>;
  createEmailTemplate?: Resolver<ResolversTypes['EmailTemplate'], ParentType, ContextType, RequireFields<MutationCreateEmailTemplateArgs, 'input'>>;
  deleteCampaign?: Resolver<ResolversTypes['DeleteCampaignResult'], ParentType, ContextType, RequireFields<MutationDeleteCampaignArgs, 'id'>>;
  deleteCompanies?: Resolver<ResolversTypes['DeleteCompaniesResult'], ParentType, ContextType, RequireFields<MutationDeleteCompaniesArgs, 'companyIds'>>;
  deleteCompany?: Resolver<ResolversTypes['DeleteCompanyResponse'], ParentType, ContextType, RequireFields<MutationDeleteCompanyArgs, 'id'>>;
  deleteContact?: Resolver<ResolversTypes['DeleteContactResult'], ParentType, ContextType, RequireFields<MutationDeleteContactArgs, 'id'>>;
  deleteEmailTemplate?: Resolver<ResolversTypes['DeleteEmailTemplateResult'], ParentType, ContextType, RequireFields<MutationDeleteEmailTemplateArgs, 'id'>>;
  enhanceAllContacts?: Resolver<ResolversTypes['EnhanceAllContactsResult'], ParentType, ContextType>;
  enhanceCompany?: Resolver<ResolversTypes['EnhanceCompanyResponse'], ParentType, ContextType, Partial<MutationEnhanceCompanyArgs>>;
  findCompanyEmails?: Resolver<ResolversTypes['EnhanceAllContactsResult'], ParentType, ContextType, RequireFields<MutationFindCompanyEmailsArgs, 'companyId'>>;
  findContactEmail?: Resolver<ResolversTypes['FindContactEmailResult'], ParentType, ContextType, RequireFields<MutationFindContactEmailArgs, 'contactId'>>;
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
  scheduleBatchEmails?: Resolver<ResolversTypes['ScheduleBatchResult'], ParentType, ContextType, RequireFields<MutationScheduleBatchEmailsArgs, 'input'>>;
  scheduleFollowUpBatch?: Resolver<ResolversTypes['FollowUpBatchResult'], ParentType, ContextType, RequireFields<MutationScheduleFollowUpBatchArgs, 'input'>>;
  sendEmail?: Resolver<ResolversTypes['SendEmailResult'], ParentType, ContextType, RequireFields<MutationSendEmailArgs, 'input'>>;
  sendOutreachEmail?: Resolver<ResolversTypes['SendOutreachEmailResult'], ParentType, ContextType, RequireFields<MutationSendOutreachEmailArgs, 'input'>>;
  sendScheduledEmailNow?: Resolver<ResolversTypes['SendNowResult'], ParentType, ContextType, RequireFields<MutationSendScheduledEmailNowArgs, 'resendId'>>;
  syncResendEmails?: Resolver<ResolversTypes['SyncResendResult'], ParentType, ContextType, Partial<MutationSyncResendEmailsArgs>>;
  unarchiveEmail?: Resolver<ResolversTypes['ArchiveEmailResult'], ParentType, ContextType, RequireFields<MutationUnarchiveEmailArgs, 'id'>>;
  unblockCompany?: Resolver<ResolversTypes['DeleteBlockedCompanyResult'], ParentType, ContextType, RequireFields<MutationUnblockCompanyArgs, 'id'>>;
  unverifyCompanyContacts?: Resolver<ResolversTypes['UnverifyContactsResult'], ParentType, ContextType, RequireFields<MutationUnverifyCompanyContactsArgs, 'companyId'>>;
  updateCampaign?: Resolver<ResolversTypes['EmailCampaign'], ParentType, ContextType, RequireFields<MutationUpdateCampaignArgs, 'id' | 'input'>>;
  updateCompany?: Resolver<ResolversTypes['Company'], ParentType, ContextType, RequireFields<MutationUpdateCompanyArgs, 'id' | 'input'>>;
  updateContact?: Resolver<ResolversTypes['Contact'], ParentType, ContextType, RequireFields<MutationUpdateContactArgs, 'id' | 'input'>>;
  updateEmailTemplate?: Resolver<ResolversTypes['EmailTemplate'], ParentType, ContextType, RequireFields<MutationUpdateEmailTemplateArgs, 'id' | 'input'>>;
  updateUserSettings?: Resolver<ResolversTypes['UserSettings'], ParentType, ContextType, RequireFields<MutationUpdateUserSettingsArgs, 'settings' | 'userId'>>;
  upsert_company_ats_boards?: Resolver<Array<ResolversTypes['ATSBoard']>, ParentType, ContextType, RequireFields<MutationUpsert_Company_Ats_BoardsArgs, 'boards' | 'company_id'>>;
  verifyContactEmail?: Resolver<ResolversTypes['VerifyEmailResult'], ParentType, ContextType, RequireFields<MutationVerifyContactEmailArgs, 'contactId'>>;
};

export type QueryResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['Query'] = ResolversParentTypes['Query']> = {
  allCompanyTags?: Resolver<Array<ResolversTypes['String']>, ParentType, ContextType>;
  blockedCompanies?: Resolver<Array<ResolversTypes['BlockedCompany']>, ParentType, ContextType>;
  companies?: Resolver<ResolversTypes['CompaniesResponse'], ParentType, ContextType, Partial<QueryCompaniesArgs>>;
  company?: Resolver<Maybe<ResolversTypes['Company']>, ParentType, ContextType, Partial<QueryCompanyArgs>>;
  companyContactEmails?: Resolver<Array<ResolversTypes['CompanyContactEmail']>, ParentType, ContextType, RequireFields<QueryCompanyContactEmailsArgs, 'companyId'>>;
  company_ats_boards?: Resolver<Array<ResolversTypes['ATSBoard']>, ParentType, ContextType, RequireFields<QueryCompany_Ats_BoardsArgs, 'company_id'>>;
  company_facts?: Resolver<Array<ResolversTypes['CompanyFact']>, ParentType, ContextType, RequireFields<QueryCompany_FactsArgs, 'company_id'>>;
  company_snapshots?: Resolver<Array<ResolversTypes['CompanySnapshot']>, ParentType, ContextType, RequireFields<QueryCompany_SnapshotsArgs, 'company_id'>>;
  contact?: Resolver<Maybe<ResolversTypes['Contact']>, ParentType, ContextType, RequireFields<QueryContactArgs, 'id'>>;
  contactByEmail?: Resolver<Maybe<ResolversTypes['Contact']>, ParentType, ContextType, RequireFields<QueryContactByEmailArgs, 'email'>>;
  contactEmails?: Resolver<Array<ResolversTypes['ContactEmail']>, ParentType, ContextType, RequireFields<QueryContactEmailsArgs, 'contactId'>>;
  contacts?: Resolver<ResolversTypes['ContactsResult'], ParentType, ContextType, Partial<QueryContactsArgs>>;
  emailCampaign?: Resolver<Maybe<ResolversTypes['EmailCampaign']>, ParentType, ContextType, RequireFields<QueryEmailCampaignArgs, 'id'>>;
  emailCampaigns?: Resolver<ResolversTypes['EmailCampaignsResult'], ParentType, ContextType, Partial<QueryEmailCampaignsArgs>>;
  emailStats?: Resolver<ResolversTypes['EmailStats'], ParentType, ContextType>;
  emailTemplate?: Resolver<Maybe<ResolversTypes['EmailTemplate']>, ParentType, ContextType, RequireFields<QueryEmailTemplateArgs, 'id'>>;
  emailTemplates?: Resolver<ResolversTypes['EmailTemplatesResult'], ParentType, ContextType, Partial<QueryEmailTemplatesArgs>>;
  emailsNeedingFollowUp?: Resolver<ResolversTypes['FollowUpEmailsResult'], ParentType, ContextType, Partial<QueryEmailsNeedingFollowUpArgs>>;
  findCompany?: Resolver<ResolversTypes['FindCompanyResult'], ParentType, ContextType, Partial<QueryFindCompanyArgs>>;
  receivedEmail?: Resolver<Maybe<ResolversTypes['ReceivedEmail']>, ParentType, ContextType, RequireFields<QueryReceivedEmailArgs, 'id'>>;
  receivedEmails?: Resolver<ResolversTypes['ReceivedEmailsResult'], ParentType, ContextType, Partial<QueryReceivedEmailsArgs>>;
  resendEmail?: Resolver<Maybe<ResolversTypes['ResendEmailDetail']>, ParentType, ContextType, RequireFields<QueryResendEmailArgs, 'resendId'>>;
  userSettings?: Resolver<Maybe<ResolversTypes['UserSettings']>, ParentType, ContextType, RequireFields<QueryUserSettingsArgs, 'userId'>>;
};

export type ReceivedEmailResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['ReceivedEmail'] = ResolversParentTypes['ReceivedEmail']> = {
  archivedAt?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  attachments?: Resolver<Maybe<ResolversTypes['JSON']>, ParentType, ContextType>;
  ccEmails?: Resolver<Array<ResolversTypes['String']>, ParentType, ContextType>;
  createdAt?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  fromEmail?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  htmlContent?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  id?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
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

export type ScheduleBatchResultResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['ScheduleBatchResult'] = ResolversParentTypes['ScheduleBatchResult']> = {
  failed?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  firstSendDate?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  lastSendDate?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  message?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  scheduled?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  schedulingPlan?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
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
  ATSBoard?: AtsBoardResolvers<ContextType>;
  AnalyzeCompanyResponse?: AnalyzeCompanyResponseResolvers<ContextType>;
  ApplyEmailPatternResult?: ApplyEmailPatternResultResolvers<ContextType>;
  ArchiveEmailResult?: ArchiveEmailResultResolvers<ContextType>;
  AshbyEnrichment?: AshbyEnrichmentResolvers<ContextType>;
  BlockJobsResult?: BlockJobsResultResolvers<ContextType>;
  BlockedCompany?: BlockedCompanyResolvers<ContextType>;
  CancelCompanyEmailsResult?: CancelCompanyEmailsResultResolvers<ContextType>;
  CancelEmailResult?: CancelEmailResultResolvers<ContextType>;
  CompaniesResponse?: CompaniesResponseResolvers<ContextType>;
  Company?: CompanyResolvers<ContextType>;
  CompanyContactEmail?: CompanyContactEmailResolvers<ContextType>;
  CompanyFact?: CompanyFactResolvers<ContextType>;
  CompanySnapshot?: CompanySnapshotResolvers<ContextType>;
  Contact?: ContactResolvers<ContextType>;
  ContactEmail?: ContactEmailResolvers<ContextType>;
  ContactsResult?: ContactsResultResolvers<ContextType>;
  DateTime?: GraphQLScalarType;
  DeleteBlockedCompanyResult?: DeleteBlockedCompanyResultResolvers<ContextType>;
  DeleteCampaignResult?: DeleteCampaignResultResolvers<ContextType>;
  DeleteCompaniesResult?: DeleteCompaniesResultResolvers<ContextType>;
  DeleteCompanyResponse?: DeleteCompanyResponseResolvers<ContextType>;
  DeleteContactResult?: DeleteContactResultResolvers<ContextType>;
  DeleteEmailTemplateResult?: DeleteEmailTemplateResultResolvers<ContextType>;
  EmailAddress?: GraphQLScalarType;
  EmailCampaign?: EmailCampaignResolvers<ContextType>;
  EmailCampaignsResult?: EmailCampaignsResultResolvers<ContextType>;
  EmailPreview?: EmailPreviewResolvers<ContextType>;
  EmailStats?: EmailStatsResolvers<ContextType>;
  EmailTemplate?: EmailTemplateResolvers<ContextType>;
  EmailTemplatesResult?: EmailTemplatesResultResolvers<ContextType>;
  EnhanceAllContactsResult?: EnhanceAllContactsResultResolvers<ContextType>;
  EnhanceCompanyResponse?: EnhanceCompanyResponseResolvers<ContextType>;
  Evidence?: EvidenceResolvers<ContextType>;
  FindCompanyResult?: FindCompanyResultResolvers<ContextType>;
  FindContactEmailResult?: FindContactEmailResultResolvers<ContextType>;
  FollowUpBatchResult?: FollowUpBatchResultResolvers<ContextType>;
  FollowUpEmail?: FollowUpEmailResolvers<ContextType>;
  FollowUpEmailsResult?: FollowUpEmailsResultResolvers<ContextType>;
  GenerateEmailResult?: GenerateEmailResultResolvers<ContextType>;
  GenerateReplyResult?: GenerateReplyResultResolvers<ContextType>;
  ImportCompaniesResult?: ImportCompaniesResultResolvers<ContextType>;
  ImportCompanyResult?: ImportCompanyResultResolvers<ContextType>;
  ImportContactsResult?: ImportContactsResultResolvers<ContextType>;
  ImportResendResult?: ImportResendResultResolvers<ContextType>;
  JSON?: GraphQLScalarType;
  MarkRepliedResult?: MarkRepliedResultResolvers<ContextType>;
  MergeCompaniesResult?: MergeCompaniesResultResolvers<ContextType>;
  MergeDuplicateContactsResult?: MergeDuplicateContactsResultResolvers<ContextType>;
  Mutation?: MutationResolvers<ContextType>;
  Query?: QueryResolvers<ContextType>;
  ReceivedEmail?: ReceivedEmailResolvers<ContextType>;
  ReceivedEmailsResult?: ReceivedEmailsResultResolvers<ContextType>;
  ResendEmailDetail?: ResendEmailDetailResolvers<ContextType>;
  ScheduleBatchResult?: ScheduleBatchResultResolvers<ContextType>;
  SendEmailResult?: SendEmailResultResolvers<ContextType>;
  SendNowResult?: SendNowResultResolvers<ContextType>;
  SendOutreachEmailResult?: SendOutreachEmailResultResolvers<ContextType>;
  SyncResendResult?: SyncResendResultResolvers<ContextType>;
  URL?: GraphQLScalarType;
  UnverifyContactsResult?: UnverifyContactsResultResolvers<ContextType>;
  Upload?: GraphQLScalarType;
  UserSettings?: UserSettingsResolvers<ContextType>;
  VerifyEmailResult?: VerifyEmailResultResolvers<ContextType>;
  WarcPointer?: WarcPointerResolvers<ContextType>;
};

