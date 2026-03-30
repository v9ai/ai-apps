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

export type Contact = {
  __typename?: 'Contact';
  authorityScore: Maybe<Scalars['Float']['output']>;
  bouncedEmails: Array<Scalars['String']['output']>;
  company: Maybe<Scalars['String']['output']>;
  companyId: Maybe<Scalars['Int']['output']>;
  createdAt: Scalars['String']['output'];
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
  lastName: Scalars['String']['output'];
  linkedinUrl: Maybe<Scalars['String']['output']>;
  nbExecutionTimeMs: Maybe<Scalars['Int']['output']>;
  nbFlags: Array<Scalars['String']['output']>;
  nbResult: Maybe<Scalars['String']['output']>;
  nbRetryToken: Maybe<Scalars['String']['output']>;
  nbStatus: Maybe<Scalars['String']['output']>;
  nbSuggestedCorrection: Maybe<Scalars['String']['output']>;
  position: Maybe<Scalars['String']['output']>;
  seniority: Maybe<Scalars['String']['output']>;
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

export type ContactMlScore = {
  __typename?: 'ContactMLScore';
  authorityScore: Scalars['Float']['output'];
  contactId: Scalars['Int']['output'];
  department: Scalars['String']['output'];
  dmReasons: Array<Scalars['String']['output']>;
  isDecisionMaker: Scalars['Boolean']['output'];
  seniority: Scalars['String']['output'];
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
  blockCompany: Company;
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
  scoreContactsML: ScoreContactsMlResult;
  sendEmail: SendEmailResult;
  sendOutreachEmail: SendOutreachEmailResult;
  sendScheduledEmailNow: SendNowResult;
  syncResendEmails: SyncResendResult;
  unarchiveEmail: ArchiveEmailResult;
  unblockCompany: Company;
  unverifyCompanyContacts: UnverifyContactsResult;
  updateCampaign: EmailCampaign;
  updateCompany: Company;
  updateContact: Contact;
  updateEmailTemplate: EmailTemplate;
  updateUserSettings: UserSettings;
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
  id: Scalars['Int']['input'];
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
  companies: CompaniesResponse;
  company: Maybe<Company>;
  companyContactEmails: Array<CompanyContactEmail>;
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
}>;


export type FindCompanyQuery = { __typename?: 'Query', findCompany: { __typename?: 'FindCompanyResult', found: boolean, company: { __typename?: 'Company', id: number, key: string, name: string, website: string | null, email: string | null, location: string | null } | null } };

export type EvidenceFieldsFragment = { __typename?: 'Evidence', source_type: SourceType, source_url: string, crawl_id: string | null, capture_timestamp: string | null, observed_at: string, method: ExtractMethod, extractor_version: string | null, http_status: number | null, mime: string | null, content_hash: string | null, warc: { __typename?: 'WarcPointer', filename: string, offset: number, length: number, digest: string | null } | null };

export type CompanyFactFieldsFragment = { __typename?: 'CompanyFact', id: number, company_id: number, field: string, value_json: any | null, value_text: string | null, normalized_value: any | null, confidence: number, created_at: string, evidence: { __typename?: 'Evidence', source_type: SourceType, source_url: string, crawl_id: string | null, capture_timestamp: string | null, observed_at: string, method: ExtractMethod, extractor_version: string | null, http_status: number | null, mime: string | null, content_hash: string | null, warc: { __typename?: 'WarcPointer', filename: string, offset: number, length: number, digest: string | null } | null } };

export type CompanySnapshotFieldsFragment = { __typename?: 'CompanySnapshot', id: number, company_id: number, source_url: string, crawl_id: string | null, capture_timestamp: string | null, fetched_at: string, http_status: number | null, mime: string | null, content_hash: string | null, text_sample: string | null, jsonld: any | null, extracted: any | null, created_at: string, evidence: { __typename?: 'Evidence', source_type: SourceType, source_url: string, crawl_id: string | null, capture_timestamp: string | null, observed_at: string, method: ExtractMethod, extractor_version: string | null, http_status: number | null, mime: string | null, content_hash: string | null, warc: { __typename?: 'WarcPointer', filename: string, offset: number, length: number, digest: string | null } | null } };

export type CompanyFieldsFragment = { __typename?: 'Company', id: number, key: string, name: string, logo_url: string | null, website: string | null, description: string | null, industry: string | null, size: string | null, location: string | null, created_at: string, updated_at: string, linkedin_url: string | null, job_board_url: string | null, category: CompanyCategory, tags: Array<string>, services: Array<string>, service_taxonomy: Array<string>, industries: Array<string>, score: number, score_reasons: Array<string>, blocked: boolean, deep_analysis: string | null, last_seen_crawl_id: string | null, last_seen_capture_timestamp: string | null, last_seen_source_url: string | null };

export type CreateCompanyMutationVariables = Exact<{
  input: CreateCompanyInput;
}>;


export type CreateCompanyMutation = { __typename?: 'Mutation', createCompany: { __typename?: 'Company', id: number, key: string, name: string, logo_url: string | null, website: string | null, description: string | null, industry: string | null, size: string | null, location: string | null, created_at: string, updated_at: string, linkedin_url: string | null, job_board_url: string | null, category: CompanyCategory, tags: Array<string>, services: Array<string>, service_taxonomy: Array<string>, industries: Array<string>, score: number, score_reasons: Array<string>, blocked: boolean, deep_analysis: string | null, last_seen_crawl_id: string | null, last_seen_capture_timestamp: string | null, last_seen_source_url: string | null } };

export type UpdateCompanyMutationVariables = Exact<{
  id: Scalars['Int']['input'];
  input: UpdateCompanyInput;
}>;


export type UpdateCompanyMutation = { __typename?: 'Mutation', updateCompany: { __typename?: 'Company', id: number, key: string, name: string, logo_url: string | null, website: string | null, description: string | null, industry: string | null, size: string | null, location: string | null, created_at: string, updated_at: string, linkedin_url: string | null, job_board_url: string | null, category: CompanyCategory, tags: Array<string>, services: Array<string>, service_taxonomy: Array<string>, industries: Array<string>, score: number, score_reasons: Array<string>, blocked: boolean, deep_analysis: string | null, last_seen_crawl_id: string | null, last_seen_capture_timestamp: string | null, last_seen_source_url: string | null } };

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


export type GetCompanyQuery = { __typename?: 'Query', company: { __typename?: 'Company', id: number, key: string, name: string, logo_url: string | null, website: string | null, description: string | null, industry: string | null, size: string | null, location: string | null, created_at: string, updated_at: string, linkedin_url: string | null, job_board_url: string | null, category: CompanyCategory, tags: Array<string>, services: Array<string>, service_taxonomy: Array<string>, industries: Array<string>, score: number, score_reasons: Array<string>, blocked: boolean, deep_analysis: string | null, last_seen_crawl_id: string | null, last_seen_capture_timestamp: string | null, last_seen_source_url: string | null } | null };

export type GetCompaniesQueryVariables = Exact<{
  text?: InputMaybe<Scalars['String']['input']>;
  order_by?: InputMaybe<CompanyOrderBy>;
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
}>;


export type GetCompaniesQuery = { __typename?: 'Query', companies: { __typename?: 'CompaniesResponse', totalCount: number, companies: Array<{ __typename?: 'Company', id: number, key: string, name: string, logo_url: string | null, website: string | null, description: string | null, industry: string | null, size: string | null, location: string | null, created_at: string, updated_at: string, linkedin_url: string | null, job_board_url: string | null, category: CompanyCategory, tags: Array<string>, services: Array<string>, service_taxonomy: Array<string>, industries: Array<string>, score: number, score_reasons: Array<string>, blocked: boolean, deep_analysis: string | null, last_seen_crawl_id: string | null, last_seen_capture_timestamp: string | null, last_seen_source_url: string | null }> } };

export type SearchCompaniesQueryVariables = Exact<{
  filter: CompanyFilterInput;
  order_by?: InputMaybe<CompanyOrderBy>;
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
}>;


export type SearchCompaniesQuery = { __typename?: 'Query', companies: { __typename?: 'CompaniesResponse', totalCount: number, companies: Array<{ __typename?: 'Company', id: number, key: string, name: string, logo_url: string | null, website: string | null, description: string | null, industry: string | null, size: string | null, location: string | null, created_at: string, updated_at: string, linkedin_url: string | null, job_board_url: string | null, category: CompanyCategory, tags: Array<string>, services: Array<string>, service_taxonomy: Array<string>, industries: Array<string>, score: number, score_reasons: Array<string>, blocked: boolean, deep_analysis: string | null, last_seen_crawl_id: string | null, last_seen_capture_timestamp: string | null, last_seen_source_url: string | null }> } };

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


export type CompanyAuditQuery = { __typename?: 'Query', company: { __typename?: 'Company', facts_count: number, snapshots_count: number, id: number, key: string, name: string, logo_url: string | null, website: string | null, description: string | null, industry: string | null, size: string | null, location: string | null, created_at: string, updated_at: string, linkedin_url: string | null, job_board_url: string | null, category: CompanyCategory, tags: Array<string>, services: Array<string>, service_taxonomy: Array<string>, industries: Array<string>, score: number, score_reasons: Array<string>, blocked: boolean, deep_analysis: string | null, last_seen_crawl_id: string | null, last_seen_capture_timestamp: string | null, last_seen_source_url: string | null, facts: Array<{ __typename?: 'CompanyFact', id: number, company_id: number, field: string, value_json: any | null, value_text: string | null, normalized_value: any | null, confidence: number, created_at: string, evidence: { __typename?: 'Evidence', source_type: SourceType, source_url: string, crawl_id: string | null, capture_timestamp: string | null, observed_at: string, method: ExtractMethod, extractor_version: string | null, http_status: number | null, mime: string | null, content_hash: string | null, warc: { __typename?: 'WarcPointer', filename: string, offset: number, length: number, digest: string | null } | null } }>, snapshots: Array<{ __typename?: 'CompanySnapshot', id: number, company_id: number, source_url: string, crawl_id: string | null, capture_timestamp: string | null, fetched_at: string, http_status: number | null, mime: string | null, content_hash: string | null, text_sample: string | null, jsonld: any | null, extracted: any | null, created_at: string, evidence: { __typename?: 'Evidence', source_type: SourceType, source_url: string, crawl_id: string | null, capture_timestamp: string | null, observed_at: string, method: ExtractMethod, extractor_version: string | null, http_status: number | null, mime: string | null, content_hash: string | null, warc: { __typename?: 'WarcPointer', filename: string, offset: number, length: number, digest: string | null } | null } }> } | null };

export type GetContactQueryVariables = Exact<{
  id: Scalars['Int']['input'];
}>;


export type GetContactQuery = { __typename?: 'Query', contact: { __typename?: 'Contact', id: number, firstName: string, lastName: string, email: string | null, emails: Array<string>, bouncedEmails: Array<string>, linkedinUrl: string | null, company: string | null, companyId: number | null, position: string | null, emailVerified: boolean | null, doNotContact: boolean, githubHandle: string | null, telegramHandle: string | null, tags: Array<string>, nbStatus: string | null, nbResult: string | null, nbFlags: Array<string>, nbSuggestedCorrection: string | null, createdAt: string, updatedAt: string } | null };

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

export type GetContactEmailsQueryVariables = Exact<{
  contactId: Scalars['Int']['input'];
}>;


export type GetContactEmailsQuery = { __typename?: 'Query', contactEmails: Array<{ __typename?: 'ContactEmail', id: number, resendId: string, fromEmail: string, toEmails: Array<string>, subject: string, textContent: string | null, status: string, sentAt: string | null, recipientName: string | null, createdAt: string, updatedAt: string }> };

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
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
}>;


export type GetContactsQuery = { __typename?: 'Query', contacts: { __typename?: 'ContactsResult', totalCount: number, contacts: Array<{ __typename?: 'Contact', id: number, firstName: string, lastName: string, email: string | null, bouncedEmails: Array<string>, linkedinUrl: string | null, position: string | null, company: string | null, companyId: number | null, githubHandle: string | null, telegramHandle: string | null, emailVerified: boolean | null, doNotContact: boolean, nbResult: string | null, tags: Array<string>, createdAt: string }> } };

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


export type CreateContactMutation = { __typename?: 'Mutation', createContact: { __typename?: 'Contact', id: number, firstName: string, lastName: string, email: string | null, linkedinUrl: string | null, position: string | null, companyId: number | null, githubHandle: string | null, telegramHandle: string | null, tags: Array<string> } };

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
}>;


export type GetReceivedEmailsQuery = { __typename?: 'Query', receivedEmails: { __typename?: 'ReceivedEmailsResult', totalCount: number, emails: Array<{ __typename?: 'ReceivedEmail', id: number, resendId: string, fromEmail: string | null, toEmails: Array<string>, subject: string | null, receivedAt: string, archivedAt: string | null, createdAt: string }> } };

export type GetReceivedEmailQueryVariables = Exact<{
  id: Scalars['Int']['input'];
}>;


export type GetReceivedEmailQuery = { __typename?: 'Query', receivedEmail: { __typename?: 'ReceivedEmail', id: number, resendId: string, fromEmail: string | null, toEmails: Array<string>, ccEmails: Array<string>, replyToEmails: Array<string>, subject: string | null, messageId: string | null, htmlContent: string | null, textContent: string | null, attachments: any | null, receivedAt: string, archivedAt: string | null, createdAt: string, updatedAt: string } | null };

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
    query FindCompany($name: String, $website: String) {
  findCompany(name: $name, website: $website) {
    found
    company {
      id
      key
      name
      website
      email
      location
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
export const GetContactDocument = gql`
    query GetContact($id: Int!) {
  contact(id: $id) {
    id
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
    nbStatus
    nbResult
    nbFlags
    nbSuggestedCorrection
    createdAt
    updatedAt
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
 *   },
 * });
 */
export function useGetContactQuery(baseOptions: Apollo.QueryHookOptions<GetContactQuery, GetContactQueryVariables> & ({ variables: GetContactQueryVariables; skip?: boolean; } | { skip: boolean; }) ) {
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
    createdAt
    updatedAt
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
    query GetContacts($companyId: Int, $search: String, $limit: Int, $offset: Int) {
  contacts(companyId: $companyId, search: $search, limit: $limit, offset: $offset) {
    contacts {
      id
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
      createdAt
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
    query GetReceivedEmails($limit: Int, $offset: Int, $archived: Boolean) {
  receivedEmails(limit: $limit, offset: $offset, archived: $archived) {
    emails {
      id
      resendId
      fromEmail
      toEmails
      subject
      receivedAt
      archivedAt
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