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

export type ApplyEmailPatternResult = {
  __typename: 'ApplyEmailPatternResult';
  contacts: Array<Contact>;
  contactsUpdated: Scalars['Int']['output'];
  message: Scalars['String']['output'];
  pattern: Maybe<Scalars['String']['output']>;
  success: Scalars['Boolean']['output'];
};

export type ArchiveEmailResult = {
  __typename: 'ArchiveEmailResult';
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
  | 'CONSULTANCY'
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

export type ContactMlScore = {
  __typename: 'ContactMLScore';
  authorityScore: Scalars['Float']['output'];
  contactId: Scalars['Int']['output'];
  department: Scalars['String']['output'];
  dmReasons: Array<Scalars['String']['output']>;
  isDecisionMaker: Scalars['Boolean']['output'];
  seniority: Scalars['String']['output'];
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

export type ContactReminder = {
  __typename: 'ContactReminder';
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
  __typename: 'ContactReminderWithContact';
  contact: Contact;
  reminder: ContactReminder;
};

export type ContactsResult = {
  __typename: 'ContactsResult';
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
  __typename: 'ImportContactsResult';
  errors: Array<Scalars['String']['output']>;
  failed: Scalars['Int']['output'];
  imported: Scalars['Int']['output'];
  success: Scalars['Boolean']['output'];
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
  applyEmailPattern: ApplyEmailPatternResult;
  archiveEmail: ArchiveEmailResult;
  blockCompany: Company;
  cancelCompanyEmails: CancelCompanyEmailsResult;
  cancelScheduledEmail: CancelEmailResult;
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
  dismissReminder: ContactReminder;
  enhanceAllContacts: EnhanceAllContactsResult;
  enhanceCompany: EnhanceCompanyResponse;
  enrichAIContactProfile: EnrichAiContactResult;
  enrichAIContactsForCompany: EnrichAiContactsBulkResult;
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
  snoozeReminder: ContactReminder;
  syncResendEmails: SyncResendResult;
  unarchiveEmail: ArchiveEmailResult;
  unblockCompany: Company;
  unverifyCompanyContacts: UnverifyContactsResult;
  updateCampaign: EmailCampaign;
  updateCompany: Company;
  updateContact: Contact;
  updateEmailTemplate: EmailTemplate;
  updateReminder: ContactReminder;
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
  __typename: 'Query';
  allCompanyTags: Array<Scalars['String']['output']>;
  companies: CompaniesResponse;
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
  __typename: 'ReceivedEmail';
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
  __typename: 'ReceivedEmailsResult';
  emails: Array<ReceivedEmail>;
  totalCount: Scalars['Int']['output'];
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

export type ScoreContactsMlResult = {
  __typename: 'ScoreContactsMLResult';
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

export type SourceType =
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

export type VerifyEmailResult = {
  __typename: 'VerifyEmailResult';
  flags: Maybe<Array<Scalars['String']['output']>>;
  message: Scalars['String']['output'];
  rawResult: Maybe<Scalars['String']['output']>;
  success: Scalars['Boolean']['output'];
  suggestedCorrection: Maybe<Scalars['String']['output']>;
  verified: Maybe<Scalars['Boolean']['output']>;
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
}>;


export type FindCompanyQuery = { __typename: 'Query', findCompany: { __typename: 'FindCompanyResult', found: boolean, company: { __typename: 'Company', id: number, key: string, name: string, website: string | null, email: string | null, location: string | null } | null } };

export type EvidenceFieldsFragment = { __typename: 'Evidence', source_type: SourceType, source_url: string, crawl_id: string | null, capture_timestamp: string | null, observed_at: string, method: ExtractMethod, extractor_version: string | null, http_status: number | null, mime: string | null, content_hash: string | null, warc: { __typename: 'WarcPointer', filename: string, offset: number, length: number, digest: string | null } | null } & { ' $fragmentName'?: 'EvidenceFieldsFragment' };

export type CompanyFactFieldsFragment = { __typename: 'CompanyFact', id: number, company_id: number, field: string, value_json: any | null, value_text: string | null, normalized_value: any | null, confidence: number, created_at: string, evidence: (
    { __typename: 'Evidence' }
    & { ' $fragmentRefs'?: { 'EvidenceFieldsFragment': EvidenceFieldsFragment } }
  ) } & { ' $fragmentName'?: 'CompanyFactFieldsFragment' };

export type CompanySnapshotFieldsFragment = { __typename: 'CompanySnapshot', id: number, company_id: number, source_url: string, crawl_id: string | null, capture_timestamp: string | null, fetched_at: string, http_status: number | null, mime: string | null, content_hash: string | null, text_sample: string | null, jsonld: any | null, extracted: any | null, created_at: string, evidence: (
    { __typename: 'Evidence' }
    & { ' $fragmentRefs'?: { 'EvidenceFieldsFragment': EvidenceFieldsFragment } }
  ) } & { ' $fragmentName'?: 'CompanySnapshotFieldsFragment' };

export type CompanyFieldsFragment = { __typename: 'Company', id: number, key: string, name: string, logo_url: string | null, website: string | null, description: string | null, industry: string | null, size: string | null, location: string | null, created_at: string, updated_at: string, linkedin_url: string | null, job_board_url: string | null, category: CompanyCategory, tags: Array<string>, services: Array<string>, service_taxonomy: Array<string>, industries: Array<string>, score: number, score_reasons: Array<string>, blocked: boolean, deep_analysis: string | null, last_seen_crawl_id: string | null, last_seen_capture_timestamp: string | null, last_seen_source_url: string | null } & { ' $fragmentName'?: 'CompanyFieldsFragment' };

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

export type GetContactQueryVariables = Exact<{
  id: Scalars['Int']['input'];
}>;


export type GetContactQuery = { __typename: 'Query', contact: { __typename: 'Contact', id: number, firstName: string, lastName: string, email: string | null, emails: Array<string>, bouncedEmails: Array<string>, linkedinUrl: string | null, company: string | null, companyId: number | null, position: string | null, emailVerified: boolean | null, doNotContact: boolean, githubHandle: string | null, telegramHandle: string | null, tags: Array<string>, nbStatus: string | null, nbResult: string | null, nbFlags: Array<string>, nbSuggestedCorrection: string | null, createdAt: string, updatedAt: string } | null };

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

export type GetContactEmailsQueryVariables = Exact<{
  contactId: Scalars['Int']['input'];
}>;


export type GetContactEmailsQuery = { __typename: 'Query', contactEmails: Array<{ __typename: 'ContactEmail', id: number, resendId: string, fromEmail: string, toEmails: Array<string>, subject: string, textContent: string | null, status: string, sentAt: string | null, recipientName: string | null, createdAt: string, updatedAt: string }> };

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
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
}>;


export type GetContactsQuery = { __typename: 'Query', contacts: { __typename: 'ContactsResult', totalCount: number, contacts: Array<{ __typename: 'Contact', id: number, firstName: string, lastName: string, email: string | null, bouncedEmails: Array<string>, linkedinUrl: string | null, position: string | null, company: string | null, companyId: number | null, githubHandle: string | null, telegramHandle: string | null, emailVerified: boolean | null, doNotContact: boolean, nbResult: string | null, tags: Array<string>, createdAt: string }> } };

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


export type CreateContactMutation = { __typename: 'Mutation', createContact: { __typename: 'Contact', id: number, firstName: string, lastName: string, email: string | null, linkedinUrl: string | null, position: string | null, companyId: number | null, githubHandle: string | null, telegramHandle: string | null, tags: Array<string> } };

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
}>;


export type GetReceivedEmailsQuery = { __typename: 'Query', receivedEmails: { __typename: 'ReceivedEmailsResult', totalCount: number, emails: Array<{ __typename: 'ReceivedEmail', id: number, resendId: string, fromEmail: string | null, toEmails: Array<string>, subject: string | null, receivedAt: string, archivedAt: string | null, createdAt: string }> } };

export type GetReceivedEmailQueryVariables = Exact<{
  id: Scalars['Int']['input'];
}>;


export type GetReceivedEmailQuery = { __typename: 'Query', receivedEmail: { __typename: 'ReceivedEmail', id: number, resendId: string, fromEmail: string | null, toEmails: Array<string>, ccEmails: Array<string>, replyToEmails: Array<string>, subject: string | null, messageId: string | null, htmlContent: string | null, textContent: string | null, attachments: any | null, receivedAt: string, archivedAt: string | null, createdAt: string, updatedAt: string } | null };

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

export type DueRemindersQueryVariables = Exact<{ [key: string]: never; }>;


export type DueRemindersQuery = { __typename: 'Query', dueReminders: Array<{ __typename: 'ContactReminderWithContact', reminder: { __typename: 'ContactReminder', id: number, contactId: number, remindAt: string, recurrence: string, note: string | null, status: string, snoozedUntil: string | null, createdAt: string, updatedAt: string }, contact: { __typename: 'Contact', id: number, firstName: string, lastName: string, position: string | null, tags: Array<string> } }> };

export type ContactRemindersQueryVariables = Exact<{
  contactId: Scalars['Int']['input'];
}>;


export type ContactRemindersQuery = { __typename: 'Query', contactReminders: Array<{ __typename: 'ContactReminder', id: number, contactId: number, remindAt: string, recurrence: string, note: string | null, status: string, snoozedUntil: string | null, createdAt: string, updatedAt: string }> };

export type CreateReminderMutationVariables = Exact<{
  input: CreateReminderInput;
}>;


export type CreateReminderMutation = { __typename: 'Mutation', createReminder: { __typename: 'ContactReminder', id: number, contactId: number, remindAt: string, recurrence: string, note: string | null, status: string, createdAt: string } };

export type UpdateReminderMutationVariables = Exact<{
  id: Scalars['Int']['input'];
  input: UpdateReminderInput;
}>;


export type UpdateReminderMutation = { __typename: 'Mutation', updateReminder: { __typename: 'ContactReminder', id: number, contactId: number, remindAt: string, recurrence: string, note: string | null, status: string, updatedAt: string } };

export type SnoozeReminderMutationVariables = Exact<{
  id: Scalars['Int']['input'];
  days: Scalars['Int']['input'];
}>;


export type SnoozeReminderMutation = { __typename: 'Mutation', snoozeReminder: { __typename: 'ContactReminder', id: number, contactId: number, remindAt: string, status: string, snoozedUntil: string | null, updatedAt: string } };

export type DismissReminderMutationVariables = Exact<{
  id: Scalars['Int']['input'];
}>;


export type DismissReminderMutation = { __typename: 'Mutation', dismissReminder: { __typename: 'ContactReminder', id: number, contactId: number, status: string, updatedAt: string } };

export type ComputeNextTouchScoresMutationVariables = Exact<{
  companyId: Scalars['Int']['input'];
}>;


export type ComputeNextTouchScoresMutation = { __typename: 'Mutation', computeNextTouchScores: { __typename: 'ComputeNextTouchScoresResult', success: boolean, message: string, contactsUpdated: number, topContacts: Array<{ __typename: 'ContactNextTouch', contactId: number, firstName: string, lastName: string, position: string | null, nextTouchScore: number, lastContactedAt: string | null }> } };

export type ScoreContactsMlMutationVariables = Exact<{
  companyId: Scalars['Int']['input'];
}>;


export type ScoreContactsMlMutation = { __typename: 'Mutation', scoreContactsML: { __typename: 'ScoreContactsMLResult', success: boolean, message: string, contactsScored: number, decisionMakersFound: number, results: Array<{ __typename: 'ContactMLScore', contactId: number, seniority: string, department: string, authorityScore: number, isDecisionMaker: boolean, dmReasons: Array<string> }> } };

export const EvidenceFieldsFragmentDoc = {"kind":"Document","definitions":[{"kind":"FragmentDefinition","name":{"kind":"Name","value":"EvidenceFields"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Evidence"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"source_type"}},{"kind":"Field","name":{"kind":"Name","value":"source_url"}},{"kind":"Field","name":{"kind":"Name","value":"crawl_id"}},{"kind":"Field","name":{"kind":"Name","value":"capture_timestamp"}},{"kind":"Field","name":{"kind":"Name","value":"observed_at"}},{"kind":"Field","name":{"kind":"Name","value":"method"}},{"kind":"Field","name":{"kind":"Name","value":"extractor_version"}},{"kind":"Field","name":{"kind":"Name","value":"http_status"}},{"kind":"Field","name":{"kind":"Name","value":"mime"}},{"kind":"Field","name":{"kind":"Name","value":"content_hash"}},{"kind":"Field","name":{"kind":"Name","value":"warc"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"filename"}},{"kind":"Field","name":{"kind":"Name","value":"offset"}},{"kind":"Field","name":{"kind":"Name","value":"length"}},{"kind":"Field","name":{"kind":"Name","value":"digest"}}]}}]}}]} as unknown as DocumentNode<EvidenceFieldsFragment, unknown>;
export const CompanyFactFieldsFragmentDoc = {"kind":"Document","definitions":[{"kind":"FragmentDefinition","name":{"kind":"Name","value":"CompanyFactFields"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"CompanyFact"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"company_id"}},{"kind":"Field","name":{"kind":"Name","value":"field"}},{"kind":"Field","name":{"kind":"Name","value":"value_json"}},{"kind":"Field","name":{"kind":"Name","value":"value_text"}},{"kind":"Field","name":{"kind":"Name","value":"normalized_value"}},{"kind":"Field","name":{"kind":"Name","value":"confidence"}},{"kind":"Field","name":{"kind":"Name","value":"evidence"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"EvidenceFields"}}]}},{"kind":"Field","name":{"kind":"Name","value":"created_at"}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"EvidenceFields"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Evidence"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"source_type"}},{"kind":"Field","name":{"kind":"Name","value":"source_url"}},{"kind":"Field","name":{"kind":"Name","value":"crawl_id"}},{"kind":"Field","name":{"kind":"Name","value":"capture_timestamp"}},{"kind":"Field","name":{"kind":"Name","value":"observed_at"}},{"kind":"Field","name":{"kind":"Name","value":"method"}},{"kind":"Field","name":{"kind":"Name","value":"extractor_version"}},{"kind":"Field","name":{"kind":"Name","value":"http_status"}},{"kind":"Field","name":{"kind":"Name","value":"mime"}},{"kind":"Field","name":{"kind":"Name","value":"content_hash"}},{"kind":"Field","name":{"kind":"Name","value":"warc"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"filename"}},{"kind":"Field","name":{"kind":"Name","value":"offset"}},{"kind":"Field","name":{"kind":"Name","value":"length"}},{"kind":"Field","name":{"kind":"Name","value":"digest"}}]}}]}}]} as unknown as DocumentNode<CompanyFactFieldsFragment, unknown>;
export const CompanySnapshotFieldsFragmentDoc = {"kind":"Document","definitions":[{"kind":"FragmentDefinition","name":{"kind":"Name","value":"CompanySnapshotFields"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"CompanySnapshot"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"company_id"}},{"kind":"Field","name":{"kind":"Name","value":"source_url"}},{"kind":"Field","name":{"kind":"Name","value":"crawl_id"}},{"kind":"Field","name":{"kind":"Name","value":"capture_timestamp"}},{"kind":"Field","name":{"kind":"Name","value":"fetched_at"}},{"kind":"Field","name":{"kind":"Name","value":"http_status"}},{"kind":"Field","name":{"kind":"Name","value":"mime"}},{"kind":"Field","name":{"kind":"Name","value":"content_hash"}},{"kind":"Field","name":{"kind":"Name","value":"text_sample"}},{"kind":"Field","name":{"kind":"Name","value":"jsonld"}},{"kind":"Field","name":{"kind":"Name","value":"extracted"}},{"kind":"Field","name":{"kind":"Name","value":"evidence"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"EvidenceFields"}}]}},{"kind":"Field","name":{"kind":"Name","value":"created_at"}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"EvidenceFields"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Evidence"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"source_type"}},{"kind":"Field","name":{"kind":"Name","value":"source_url"}},{"kind":"Field","name":{"kind":"Name","value":"crawl_id"}},{"kind":"Field","name":{"kind":"Name","value":"capture_timestamp"}},{"kind":"Field","name":{"kind":"Name","value":"observed_at"}},{"kind":"Field","name":{"kind":"Name","value":"method"}},{"kind":"Field","name":{"kind":"Name","value":"extractor_version"}},{"kind":"Field","name":{"kind":"Name","value":"http_status"}},{"kind":"Field","name":{"kind":"Name","value":"mime"}},{"kind":"Field","name":{"kind":"Name","value":"content_hash"}},{"kind":"Field","name":{"kind":"Name","value":"warc"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"filename"}},{"kind":"Field","name":{"kind":"Name","value":"offset"}},{"kind":"Field","name":{"kind":"Name","value":"length"}},{"kind":"Field","name":{"kind":"Name","value":"digest"}}]}}]}}]} as unknown as DocumentNode<CompanySnapshotFieldsFragment, unknown>;
export const CompanyFieldsFragmentDoc = {"kind":"Document","definitions":[{"kind":"FragmentDefinition","name":{"kind":"Name","value":"CompanyFields"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Company"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"key"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"logo_url"}},{"kind":"Field","name":{"kind":"Name","value":"website"}},{"kind":"Field","name":{"kind":"Name","value":"description"}},{"kind":"Field","name":{"kind":"Name","value":"industry"}},{"kind":"Field","name":{"kind":"Name","value":"size"}},{"kind":"Field","name":{"kind":"Name","value":"location"}},{"kind":"Field","name":{"kind":"Name","value":"created_at"}},{"kind":"Field","name":{"kind":"Name","value":"updated_at"}},{"kind":"Field","name":{"kind":"Name","value":"linkedin_url"}},{"kind":"Field","name":{"kind":"Name","value":"job_board_url"}},{"kind":"Field","name":{"kind":"Name","value":"category"}},{"kind":"Field","name":{"kind":"Name","value":"tags"}},{"kind":"Field","name":{"kind":"Name","value":"services"}},{"kind":"Field","name":{"kind":"Name","value":"service_taxonomy"}},{"kind":"Field","name":{"kind":"Name","value":"industries"}},{"kind":"Field","name":{"kind":"Name","value":"score"}},{"kind":"Field","name":{"kind":"Name","value":"score_reasons"}},{"kind":"Field","name":{"kind":"Name","value":"blocked"}},{"kind":"Field","name":{"kind":"Name","value":"deep_analysis"}},{"kind":"Field","name":{"kind":"Name","value":"last_seen_crawl_id"}},{"kind":"Field","name":{"kind":"Name","value":"last_seen_capture_timestamp"}},{"kind":"Field","name":{"kind":"Name","value":"last_seen_source_url"}}]}}]} as unknown as DocumentNode<CompanyFieldsFragment, unknown>;
export const GetUserSettingsDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"GetUserSettings"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"userId"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"userSettings"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"userId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"userId"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"excluded_companies"}}]}}]}}]} as unknown as DocumentNode<GetUserSettingsQuery, GetUserSettingsQueryVariables>;
export const UpdateUserSettingsDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"UpdateUserSettings"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"userId"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"settings"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"UserSettingsInput"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"updateUserSettings"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"userId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"userId"}}},{"kind":"Argument","name":{"kind":"Name","value":"settings"},"value":{"kind":"Variable","name":{"kind":"Name","value":"settings"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"user_id"}},{"kind":"Field","name":{"kind":"Name","value":"email_notifications"}},{"kind":"Field","name":{"kind":"Name","value":"daily_digest"}},{"kind":"Field","name":{"kind":"Name","value":"excluded_companies"}},{"kind":"Field","name":{"kind":"Name","value":"dark_mode"}},{"kind":"Field","name":{"kind":"Name","value":"created_at"}},{"kind":"Field","name":{"kind":"Name","value":"updated_at"}}]}}]}}]} as unknown as DocumentNode<UpdateUserSettingsMutation, UpdateUserSettingsMutationVariables>;
export const AllCompanyTagsDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"AllCompanyTags"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"allCompanyTags"}}]}}]} as unknown as DocumentNode<AllCompanyTagsQuery, AllCompanyTagsQueryVariables>;
export const FindCompanyDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"FindCompany"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"name"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"website"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"findCompany"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"name"},"value":{"kind":"Variable","name":{"kind":"Name","value":"name"}}},{"kind":"Argument","name":{"kind":"Name","value":"website"},"value":{"kind":"Variable","name":{"kind":"Name","value":"website"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"found"}},{"kind":"Field","name":{"kind":"Name","value":"company"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"key"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"website"}},{"kind":"Field","name":{"kind":"Name","value":"email"}},{"kind":"Field","name":{"kind":"Name","value":"location"}}]}}]}}]}}]} as unknown as DocumentNode<FindCompanyQuery, FindCompanyQueryVariables>;
export const CreateCompanyDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"CreateCompany"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"input"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"CreateCompanyInput"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"createCompany"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"Variable","name":{"kind":"Name","value":"input"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"CompanyFields"}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"CompanyFields"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Company"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"key"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"logo_url"}},{"kind":"Field","name":{"kind":"Name","value":"website"}},{"kind":"Field","name":{"kind":"Name","value":"description"}},{"kind":"Field","name":{"kind":"Name","value":"industry"}},{"kind":"Field","name":{"kind":"Name","value":"size"}},{"kind":"Field","name":{"kind":"Name","value":"location"}},{"kind":"Field","name":{"kind":"Name","value":"created_at"}},{"kind":"Field","name":{"kind":"Name","value":"updated_at"}},{"kind":"Field","name":{"kind":"Name","value":"linkedin_url"}},{"kind":"Field","name":{"kind":"Name","value":"job_board_url"}},{"kind":"Field","name":{"kind":"Name","value":"category"}},{"kind":"Field","name":{"kind":"Name","value":"tags"}},{"kind":"Field","name":{"kind":"Name","value":"services"}},{"kind":"Field","name":{"kind":"Name","value":"service_taxonomy"}},{"kind":"Field","name":{"kind":"Name","value":"industries"}},{"kind":"Field","name":{"kind":"Name","value":"score"}},{"kind":"Field","name":{"kind":"Name","value":"score_reasons"}},{"kind":"Field","name":{"kind":"Name","value":"blocked"}},{"kind":"Field","name":{"kind":"Name","value":"deep_analysis"}},{"kind":"Field","name":{"kind":"Name","value":"last_seen_crawl_id"}},{"kind":"Field","name":{"kind":"Name","value":"last_seen_capture_timestamp"}},{"kind":"Field","name":{"kind":"Name","value":"last_seen_source_url"}}]}}]} as unknown as DocumentNode<CreateCompanyMutation, CreateCompanyMutationVariables>;
export const UpdateCompanyDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"UpdateCompany"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"id"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"Int"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"input"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"UpdateCompanyInput"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"updateCompany"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"id"},"value":{"kind":"Variable","name":{"kind":"Name","value":"id"}}},{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"Variable","name":{"kind":"Name","value":"input"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"CompanyFields"}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"CompanyFields"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Company"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"key"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"logo_url"}},{"kind":"Field","name":{"kind":"Name","value":"website"}},{"kind":"Field","name":{"kind":"Name","value":"description"}},{"kind":"Field","name":{"kind":"Name","value":"industry"}},{"kind":"Field","name":{"kind":"Name","value":"size"}},{"kind":"Field","name":{"kind":"Name","value":"location"}},{"kind":"Field","name":{"kind":"Name","value":"created_at"}},{"kind":"Field","name":{"kind":"Name","value":"updated_at"}},{"kind":"Field","name":{"kind":"Name","value":"linkedin_url"}},{"kind":"Field","name":{"kind":"Name","value":"job_board_url"}},{"kind":"Field","name":{"kind":"Name","value":"category"}},{"kind":"Field","name":{"kind":"Name","value":"tags"}},{"kind":"Field","name":{"kind":"Name","value":"services"}},{"kind":"Field","name":{"kind":"Name","value":"service_taxonomy"}},{"kind":"Field","name":{"kind":"Name","value":"industries"}},{"kind":"Field","name":{"kind":"Name","value":"score"}},{"kind":"Field","name":{"kind":"Name","value":"score_reasons"}},{"kind":"Field","name":{"kind":"Name","value":"blocked"}},{"kind":"Field","name":{"kind":"Name","value":"deep_analysis"}},{"kind":"Field","name":{"kind":"Name","value":"last_seen_crawl_id"}},{"kind":"Field","name":{"kind":"Name","value":"last_seen_capture_timestamp"}},{"kind":"Field","name":{"kind":"Name","value":"last_seen_source_url"}}]}}]} as unknown as DocumentNode<UpdateCompanyMutation, UpdateCompanyMutationVariables>;
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
export const GetCompanyDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"GetCompany"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"id"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"Int"}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"key"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"company"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"id"},"value":{"kind":"Variable","name":{"kind":"Name","value":"id"}}},{"kind":"Argument","name":{"kind":"Name","value":"key"},"value":{"kind":"Variable","name":{"kind":"Name","value":"key"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"CompanyFields"}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"CompanyFields"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Company"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"key"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"logo_url"}},{"kind":"Field","name":{"kind":"Name","value":"website"}},{"kind":"Field","name":{"kind":"Name","value":"description"}},{"kind":"Field","name":{"kind":"Name","value":"industry"}},{"kind":"Field","name":{"kind":"Name","value":"size"}},{"kind":"Field","name":{"kind":"Name","value":"location"}},{"kind":"Field","name":{"kind":"Name","value":"created_at"}},{"kind":"Field","name":{"kind":"Name","value":"updated_at"}},{"kind":"Field","name":{"kind":"Name","value":"linkedin_url"}},{"kind":"Field","name":{"kind":"Name","value":"job_board_url"}},{"kind":"Field","name":{"kind":"Name","value":"category"}},{"kind":"Field","name":{"kind":"Name","value":"tags"}},{"kind":"Field","name":{"kind":"Name","value":"services"}},{"kind":"Field","name":{"kind":"Name","value":"service_taxonomy"}},{"kind":"Field","name":{"kind":"Name","value":"industries"}},{"kind":"Field","name":{"kind":"Name","value":"score"}},{"kind":"Field","name":{"kind":"Name","value":"score_reasons"}},{"kind":"Field","name":{"kind":"Name","value":"blocked"}},{"kind":"Field","name":{"kind":"Name","value":"deep_analysis"}},{"kind":"Field","name":{"kind":"Name","value":"last_seen_crawl_id"}},{"kind":"Field","name":{"kind":"Name","value":"last_seen_capture_timestamp"}},{"kind":"Field","name":{"kind":"Name","value":"last_seen_source_url"}}]}}]} as unknown as DocumentNode<GetCompanyQuery, GetCompanyQueryVariables>;
export const GetCompaniesDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"GetCompanies"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"text"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"order_by"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"CompanyOrderBy"}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"limit"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"Int"}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"offset"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"Int"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"companies"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"filter"},"value":{"kind":"ObjectValue","fields":[{"kind":"ObjectField","name":{"kind":"Name","value":"text"},"value":{"kind":"Variable","name":{"kind":"Name","value":"text"}}}]}},{"kind":"Argument","name":{"kind":"Name","value":"order_by"},"value":{"kind":"Variable","name":{"kind":"Name","value":"order_by"}}},{"kind":"Argument","name":{"kind":"Name","value":"limit"},"value":{"kind":"Variable","name":{"kind":"Name","value":"limit"}}},{"kind":"Argument","name":{"kind":"Name","value":"offset"},"value":{"kind":"Variable","name":{"kind":"Name","value":"offset"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"companies"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"CompanyFields"}}]}},{"kind":"Field","name":{"kind":"Name","value":"totalCount"}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"CompanyFields"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Company"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"key"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"logo_url"}},{"kind":"Field","name":{"kind":"Name","value":"website"}},{"kind":"Field","name":{"kind":"Name","value":"description"}},{"kind":"Field","name":{"kind":"Name","value":"industry"}},{"kind":"Field","name":{"kind":"Name","value":"size"}},{"kind":"Field","name":{"kind":"Name","value":"location"}},{"kind":"Field","name":{"kind":"Name","value":"created_at"}},{"kind":"Field","name":{"kind":"Name","value":"updated_at"}},{"kind":"Field","name":{"kind":"Name","value":"linkedin_url"}},{"kind":"Field","name":{"kind":"Name","value":"job_board_url"}},{"kind":"Field","name":{"kind":"Name","value":"category"}},{"kind":"Field","name":{"kind":"Name","value":"tags"}},{"kind":"Field","name":{"kind":"Name","value":"services"}},{"kind":"Field","name":{"kind":"Name","value":"service_taxonomy"}},{"kind":"Field","name":{"kind":"Name","value":"industries"}},{"kind":"Field","name":{"kind":"Name","value":"score"}},{"kind":"Field","name":{"kind":"Name","value":"score_reasons"}},{"kind":"Field","name":{"kind":"Name","value":"blocked"}},{"kind":"Field","name":{"kind":"Name","value":"deep_analysis"}},{"kind":"Field","name":{"kind":"Name","value":"last_seen_crawl_id"}},{"kind":"Field","name":{"kind":"Name","value":"last_seen_capture_timestamp"}},{"kind":"Field","name":{"kind":"Name","value":"last_seen_source_url"}}]}}]} as unknown as DocumentNode<GetCompaniesQuery, GetCompaniesQueryVariables>;
export const SearchCompaniesDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"SearchCompanies"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"filter"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"CompanyFilterInput"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"order_by"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"CompanyOrderBy"}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"limit"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"Int"}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"offset"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"Int"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"companies"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"filter"},"value":{"kind":"Variable","name":{"kind":"Name","value":"filter"}}},{"kind":"Argument","name":{"kind":"Name","value":"order_by"},"value":{"kind":"Variable","name":{"kind":"Name","value":"order_by"}}},{"kind":"Argument","name":{"kind":"Name","value":"limit"},"value":{"kind":"Variable","name":{"kind":"Name","value":"limit"}}},{"kind":"Argument","name":{"kind":"Name","value":"offset"},"value":{"kind":"Variable","name":{"kind":"Name","value":"offset"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"companies"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"CompanyFields"}}]}},{"kind":"Field","name":{"kind":"Name","value":"totalCount"}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"CompanyFields"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Company"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"key"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"logo_url"}},{"kind":"Field","name":{"kind":"Name","value":"website"}},{"kind":"Field","name":{"kind":"Name","value":"description"}},{"kind":"Field","name":{"kind":"Name","value":"industry"}},{"kind":"Field","name":{"kind":"Name","value":"size"}},{"kind":"Field","name":{"kind":"Name","value":"location"}},{"kind":"Field","name":{"kind":"Name","value":"created_at"}},{"kind":"Field","name":{"kind":"Name","value":"updated_at"}},{"kind":"Field","name":{"kind":"Name","value":"linkedin_url"}},{"kind":"Field","name":{"kind":"Name","value":"job_board_url"}},{"kind":"Field","name":{"kind":"Name","value":"category"}},{"kind":"Field","name":{"kind":"Name","value":"tags"}},{"kind":"Field","name":{"kind":"Name","value":"services"}},{"kind":"Field","name":{"kind":"Name","value":"service_taxonomy"}},{"kind":"Field","name":{"kind":"Name","value":"industries"}},{"kind":"Field","name":{"kind":"Name","value":"score"}},{"kind":"Field","name":{"kind":"Name","value":"score_reasons"}},{"kind":"Field","name":{"kind":"Name","value":"blocked"}},{"kind":"Field","name":{"kind":"Name","value":"deep_analysis"}},{"kind":"Field","name":{"kind":"Name","value":"last_seen_crawl_id"}},{"kind":"Field","name":{"kind":"Name","value":"last_seen_capture_timestamp"}},{"kind":"Field","name":{"kind":"Name","value":"last_seen_source_url"}}]}}]} as unknown as DocumentNode<SearchCompaniesQuery, SearchCompaniesQueryVariables>;
export const GetCompanyFactsDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"GetCompanyFacts"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"company_id"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"Int"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"field"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"limit"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"Int"}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"offset"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"Int"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"company_facts"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"company_id"},"value":{"kind":"Variable","name":{"kind":"Name","value":"company_id"}}},{"kind":"Argument","name":{"kind":"Name","value":"field"},"value":{"kind":"Variable","name":{"kind":"Name","value":"field"}}},{"kind":"Argument","name":{"kind":"Name","value":"limit"},"value":{"kind":"Variable","name":{"kind":"Name","value":"limit"}}},{"kind":"Argument","name":{"kind":"Name","value":"offset"},"value":{"kind":"Variable","name":{"kind":"Name","value":"offset"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"CompanyFactFields"}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"EvidenceFields"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Evidence"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"source_type"}},{"kind":"Field","name":{"kind":"Name","value":"source_url"}},{"kind":"Field","name":{"kind":"Name","value":"crawl_id"}},{"kind":"Field","name":{"kind":"Name","value":"capture_timestamp"}},{"kind":"Field","name":{"kind":"Name","value":"observed_at"}},{"kind":"Field","name":{"kind":"Name","value":"method"}},{"kind":"Field","name":{"kind":"Name","value":"extractor_version"}},{"kind":"Field","name":{"kind":"Name","value":"http_status"}},{"kind":"Field","name":{"kind":"Name","value":"mime"}},{"kind":"Field","name":{"kind":"Name","value":"content_hash"}},{"kind":"Field","name":{"kind":"Name","value":"warc"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"filename"}},{"kind":"Field","name":{"kind":"Name","value":"offset"}},{"kind":"Field","name":{"kind":"Name","value":"length"}},{"kind":"Field","name":{"kind":"Name","value":"digest"}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"CompanyFactFields"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"CompanyFact"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"company_id"}},{"kind":"Field","name":{"kind":"Name","value":"field"}},{"kind":"Field","name":{"kind":"Name","value":"value_json"}},{"kind":"Field","name":{"kind":"Name","value":"value_text"}},{"kind":"Field","name":{"kind":"Name","value":"normalized_value"}},{"kind":"Field","name":{"kind":"Name","value":"confidence"}},{"kind":"Field","name":{"kind":"Name","value":"evidence"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"EvidenceFields"}}]}},{"kind":"Field","name":{"kind":"Name","value":"created_at"}}]}}]} as unknown as DocumentNode<GetCompanyFactsQuery, GetCompanyFactsQueryVariables>;
export const CompanyAuditDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"CompanyAudit"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"key"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"company"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"key"},"value":{"kind":"Variable","name":{"kind":"Name","value":"key"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"CompanyFields"}},{"kind":"Field","name":{"kind":"Name","value":"facts"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"limit"},"value":{"kind":"IntValue","value":"200"}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"CompanyFactFields"}}]}},{"kind":"Field","name":{"kind":"Name","value":"facts_count"}},{"kind":"Field","name":{"kind":"Name","value":"snapshots"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"limit"},"value":{"kind":"IntValue","value":"10"}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"CompanySnapshotFields"}}]}},{"kind":"Field","name":{"kind":"Name","value":"snapshots_count"}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"EvidenceFields"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Evidence"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"source_type"}},{"kind":"Field","name":{"kind":"Name","value":"source_url"}},{"kind":"Field","name":{"kind":"Name","value":"crawl_id"}},{"kind":"Field","name":{"kind":"Name","value":"capture_timestamp"}},{"kind":"Field","name":{"kind":"Name","value":"observed_at"}},{"kind":"Field","name":{"kind":"Name","value":"method"}},{"kind":"Field","name":{"kind":"Name","value":"extractor_version"}},{"kind":"Field","name":{"kind":"Name","value":"http_status"}},{"kind":"Field","name":{"kind":"Name","value":"mime"}},{"kind":"Field","name":{"kind":"Name","value":"content_hash"}},{"kind":"Field","name":{"kind":"Name","value":"warc"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"filename"}},{"kind":"Field","name":{"kind":"Name","value":"offset"}},{"kind":"Field","name":{"kind":"Name","value":"length"}},{"kind":"Field","name":{"kind":"Name","value":"digest"}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"CompanyFields"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Company"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"key"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"logo_url"}},{"kind":"Field","name":{"kind":"Name","value":"website"}},{"kind":"Field","name":{"kind":"Name","value":"description"}},{"kind":"Field","name":{"kind":"Name","value":"industry"}},{"kind":"Field","name":{"kind":"Name","value":"size"}},{"kind":"Field","name":{"kind":"Name","value":"location"}},{"kind":"Field","name":{"kind":"Name","value":"created_at"}},{"kind":"Field","name":{"kind":"Name","value":"updated_at"}},{"kind":"Field","name":{"kind":"Name","value":"linkedin_url"}},{"kind":"Field","name":{"kind":"Name","value":"job_board_url"}},{"kind":"Field","name":{"kind":"Name","value":"category"}},{"kind":"Field","name":{"kind":"Name","value":"tags"}},{"kind":"Field","name":{"kind":"Name","value":"services"}},{"kind":"Field","name":{"kind":"Name","value":"service_taxonomy"}},{"kind":"Field","name":{"kind":"Name","value":"industries"}},{"kind":"Field","name":{"kind":"Name","value":"score"}},{"kind":"Field","name":{"kind":"Name","value":"score_reasons"}},{"kind":"Field","name":{"kind":"Name","value":"blocked"}},{"kind":"Field","name":{"kind":"Name","value":"deep_analysis"}},{"kind":"Field","name":{"kind":"Name","value":"last_seen_crawl_id"}},{"kind":"Field","name":{"kind":"Name","value":"last_seen_capture_timestamp"}},{"kind":"Field","name":{"kind":"Name","value":"last_seen_source_url"}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"CompanyFactFields"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"CompanyFact"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"company_id"}},{"kind":"Field","name":{"kind":"Name","value":"field"}},{"kind":"Field","name":{"kind":"Name","value":"value_json"}},{"kind":"Field","name":{"kind":"Name","value":"value_text"}},{"kind":"Field","name":{"kind":"Name","value":"normalized_value"}},{"kind":"Field","name":{"kind":"Name","value":"confidence"}},{"kind":"Field","name":{"kind":"Name","value":"evidence"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"EvidenceFields"}}]}},{"kind":"Field","name":{"kind":"Name","value":"created_at"}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"CompanySnapshotFields"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"CompanySnapshot"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"company_id"}},{"kind":"Field","name":{"kind":"Name","value":"source_url"}},{"kind":"Field","name":{"kind":"Name","value":"crawl_id"}},{"kind":"Field","name":{"kind":"Name","value":"capture_timestamp"}},{"kind":"Field","name":{"kind":"Name","value":"fetched_at"}},{"kind":"Field","name":{"kind":"Name","value":"http_status"}},{"kind":"Field","name":{"kind":"Name","value":"mime"}},{"kind":"Field","name":{"kind":"Name","value":"content_hash"}},{"kind":"Field","name":{"kind":"Name","value":"text_sample"}},{"kind":"Field","name":{"kind":"Name","value":"jsonld"}},{"kind":"Field","name":{"kind":"Name","value":"extracted"}},{"kind":"Field","name":{"kind":"Name","value":"evidence"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"EvidenceFields"}}]}},{"kind":"Field","name":{"kind":"Name","value":"created_at"}}]}}]} as unknown as DocumentNode<CompanyAuditQuery, CompanyAuditQueryVariables>;
export const GetContactDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"GetContact"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"id"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"Int"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"contact"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"id"},"value":{"kind":"Variable","name":{"kind":"Name","value":"id"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"firstName"}},{"kind":"Field","name":{"kind":"Name","value":"lastName"}},{"kind":"Field","name":{"kind":"Name","value":"email"}},{"kind":"Field","name":{"kind":"Name","value":"emails"}},{"kind":"Field","name":{"kind":"Name","value":"bouncedEmails"}},{"kind":"Field","name":{"kind":"Name","value":"linkedinUrl"}},{"kind":"Field","name":{"kind":"Name","value":"company"}},{"kind":"Field","name":{"kind":"Name","value":"companyId"}},{"kind":"Field","name":{"kind":"Name","value":"position"}},{"kind":"Field","name":{"kind":"Name","value":"emailVerified"}},{"kind":"Field","name":{"kind":"Name","value":"doNotContact"}},{"kind":"Field","name":{"kind":"Name","value":"githubHandle"}},{"kind":"Field","name":{"kind":"Name","value":"telegramHandle"}},{"kind":"Field","name":{"kind":"Name","value":"tags"}},{"kind":"Field","name":{"kind":"Name","value":"nbStatus"}},{"kind":"Field","name":{"kind":"Name","value":"nbResult"}},{"kind":"Field","name":{"kind":"Name","value":"nbFlags"}},{"kind":"Field","name":{"kind":"Name","value":"nbSuggestedCorrection"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}}]}}]}}]} as unknown as DocumentNode<GetContactQuery, GetContactQueryVariables>;
export const UpdateContactDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"UpdateContact"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"id"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"Int"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"input"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"UpdateContactInput"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"updateContact"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"id"},"value":{"kind":"Variable","name":{"kind":"Name","value":"id"}}},{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"Variable","name":{"kind":"Name","value":"input"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"firstName"}},{"kind":"Field","name":{"kind":"Name","value":"lastName"}},{"kind":"Field","name":{"kind":"Name","value":"email"}},{"kind":"Field","name":{"kind":"Name","value":"emails"}},{"kind":"Field","name":{"kind":"Name","value":"linkedinUrl"}},{"kind":"Field","name":{"kind":"Name","value":"position"}},{"kind":"Field","name":{"kind":"Name","value":"githubHandle"}},{"kind":"Field","name":{"kind":"Name","value":"telegramHandle"}},{"kind":"Field","name":{"kind":"Name","value":"doNotContact"}},{"kind":"Field","name":{"kind":"Name","value":"tags"}},{"kind":"Field","name":{"kind":"Name","value":"emailVerified"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}}]}}]}}]} as unknown as DocumentNode<UpdateContactMutation, UpdateContactMutationVariables>;
export const DeleteContactDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"DeleteContact"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"id"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"Int"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"deleteContact"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"id"},"value":{"kind":"Variable","name":{"kind":"Name","value":"id"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"success"}},{"kind":"Field","name":{"kind":"Name","value":"message"}}]}}]}}]} as unknown as DocumentNode<DeleteContactMutation, DeleteContactMutationVariables>;
export const GetResendEmailDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"GetResendEmail"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"resendId"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"resendEmail"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"resendId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"resendId"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"from"}},{"kind":"Field","name":{"kind":"Name","value":"to"}},{"kind":"Field","name":{"kind":"Name","value":"subject"}},{"kind":"Field","name":{"kind":"Name","value":"text"}},{"kind":"Field","name":{"kind":"Name","value":"html"}},{"kind":"Field","name":{"kind":"Name","value":"lastEvent"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"scheduledAt"}},{"kind":"Field","name":{"kind":"Name","value":"cc"}},{"kind":"Field","name":{"kind":"Name","value":"bcc"}}]}}]}}]} as unknown as DocumentNode<GetResendEmailQuery, GetResendEmailQueryVariables>;
export const GetContactEmailsDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"GetContactEmails"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"contactId"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"Int"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"contactEmails"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"contactId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"contactId"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"resendId"}},{"kind":"Field","name":{"kind":"Name","value":"fromEmail"}},{"kind":"Field","name":{"kind":"Name","value":"toEmails"}},{"kind":"Field","name":{"kind":"Name","value":"subject"}},{"kind":"Field","name":{"kind":"Name","value":"textContent"}},{"kind":"Field","name":{"kind":"Name","value":"status"}},{"kind":"Field","name":{"kind":"Name","value":"sentAt"}},{"kind":"Field","name":{"kind":"Name","value":"recipientName"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}}]}}]}}]} as unknown as DocumentNode<GetContactEmailsQuery, GetContactEmailsQueryVariables>;
export const GetCompanyContactEmailsDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"GetCompanyContactEmails"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"companyId"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"Int"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"companyContactEmails"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"companyId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"companyId"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"contactId"}},{"kind":"Field","name":{"kind":"Name","value":"resendId"}},{"kind":"Field","name":{"kind":"Name","value":"fromEmail"}},{"kind":"Field","name":{"kind":"Name","value":"toEmails"}},{"kind":"Field","name":{"kind":"Name","value":"subject"}},{"kind":"Field","name":{"kind":"Name","value":"textContent"}},{"kind":"Field","name":{"kind":"Name","value":"status"}},{"kind":"Field","name":{"kind":"Name","value":"sentAt"}},{"kind":"Field","name":{"kind":"Name","value":"scheduledAt"}},{"kind":"Field","name":{"kind":"Name","value":"recipientName"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}},{"kind":"Field","name":{"kind":"Name","value":"contactFirstName"}},{"kind":"Field","name":{"kind":"Name","value":"contactLastName"}},{"kind":"Field","name":{"kind":"Name","value":"contactPosition"}},{"kind":"Field","name":{"kind":"Name","value":"sequenceType"}},{"kind":"Field","name":{"kind":"Name","value":"sequenceNumber"}},{"kind":"Field","name":{"kind":"Name","value":"replyReceived"}},{"kind":"Field","name":{"kind":"Name","value":"followupStatus"}}]}}]}}]} as unknown as DocumentNode<GetCompanyContactEmailsQuery, GetCompanyContactEmailsQueryVariables>;
export const SyncResendEmailsDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"SyncResendEmails"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"companyId"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"Int"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"syncResendEmails"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"companyId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"companyId"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"success"}},{"kind":"Field","name":{"kind":"Name","value":"updatedCount"}},{"kind":"Field","name":{"kind":"Name","value":"skippedCount"}},{"kind":"Field","name":{"kind":"Name","value":"totalCount"}},{"kind":"Field","name":{"kind":"Name","value":"error"}}]}}]}}]} as unknown as DocumentNode<SyncResendEmailsMutation, SyncResendEmailsMutationVariables>;
export const ImportResendEmailsDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"ImportResendEmails"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"maxEmails"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"Int"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"importResendEmails"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"maxEmails"},"value":{"kind":"Variable","name":{"kind":"Name","value":"maxEmails"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"success"}},{"kind":"Field","name":{"kind":"Name","value":"totalFetched"}},{"kind":"Field","name":{"kind":"Name","value":"newCount"}},{"kind":"Field","name":{"kind":"Name","value":"updatedCount"}},{"kind":"Field","name":{"kind":"Name","value":"skippedCount"}},{"kind":"Field","name":{"kind":"Name","value":"errorCount"}},{"kind":"Field","name":{"kind":"Name","value":"contactMatchCount"}},{"kind":"Field","name":{"kind":"Name","value":"companyMatchCount"}},{"kind":"Field","name":{"kind":"Name","value":"durationMs"}},{"kind":"Field","name":{"kind":"Name","value":"error"}}]}}]}}]} as unknown as DocumentNode<ImportResendEmailsMutation, ImportResendEmailsMutationVariables>;
export const CancelCompanyEmailsDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"CancelCompanyEmails"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"companyId"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"Int"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"cancelCompanyEmails"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"companyId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"companyId"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"success"}},{"kind":"Field","name":{"kind":"Name","value":"message"}},{"kind":"Field","name":{"kind":"Name","value":"cancelledCount"}},{"kind":"Field","name":{"kind":"Name","value":"failedCount"}}]}}]}}]} as unknown as DocumentNode<CancelCompanyEmailsMutation, CancelCompanyEmailsMutationVariables>;
export const SendScheduledEmailNowDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"SendScheduledEmailNow"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"resendId"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"sendScheduledEmailNow"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"resendId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"resendId"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"success"}},{"kind":"Field","name":{"kind":"Name","value":"resendId"}},{"kind":"Field","name":{"kind":"Name","value":"error"}}]}}]}}]} as unknown as DocumentNode<SendScheduledEmailNowMutation, SendScheduledEmailNowMutationVariables>;
export const CancelScheduledEmailDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"CancelScheduledEmail"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"resendId"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"cancelScheduledEmail"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"resendId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"resendId"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"success"}},{"kind":"Field","name":{"kind":"Name","value":"error"}}]}}]}}]} as unknown as DocumentNode<CancelScheduledEmailMutation, CancelScheduledEmailMutationVariables>;
export const GetContactsDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"GetContacts"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"companyId"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"Int"}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"search"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"limit"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"Int"}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"offset"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"Int"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"contacts"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"companyId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"companyId"}}},{"kind":"Argument","name":{"kind":"Name","value":"search"},"value":{"kind":"Variable","name":{"kind":"Name","value":"search"}}},{"kind":"Argument","name":{"kind":"Name","value":"limit"},"value":{"kind":"Variable","name":{"kind":"Name","value":"limit"}}},{"kind":"Argument","name":{"kind":"Name","value":"offset"},"value":{"kind":"Variable","name":{"kind":"Name","value":"offset"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"contacts"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"firstName"}},{"kind":"Field","name":{"kind":"Name","value":"lastName"}},{"kind":"Field","name":{"kind":"Name","value":"email"}},{"kind":"Field","name":{"kind":"Name","value":"bouncedEmails"}},{"kind":"Field","name":{"kind":"Name","value":"linkedinUrl"}},{"kind":"Field","name":{"kind":"Name","value":"position"}},{"kind":"Field","name":{"kind":"Name","value":"company"}},{"kind":"Field","name":{"kind":"Name","value":"companyId"}},{"kind":"Field","name":{"kind":"Name","value":"githubHandle"}},{"kind":"Field","name":{"kind":"Name","value":"telegramHandle"}},{"kind":"Field","name":{"kind":"Name","value":"emailVerified"}},{"kind":"Field","name":{"kind":"Name","value":"doNotContact"}},{"kind":"Field","name":{"kind":"Name","value":"nbResult"}},{"kind":"Field","name":{"kind":"Name","value":"tags"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}}]}},{"kind":"Field","name":{"kind":"Name","value":"totalCount"}}]}}]}}]} as unknown as DocumentNode<GetContactsQuery, GetContactsQueryVariables>;
export const ImportContactsDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"ImportContacts"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"contacts"}},"type":{"kind":"NonNullType","type":{"kind":"ListType","type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ContactInput"}}}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"importContacts"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"contacts"},"value":{"kind":"Variable","name":{"kind":"Name","value":"contacts"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"success"}},{"kind":"Field","name":{"kind":"Name","value":"imported"}},{"kind":"Field","name":{"kind":"Name","value":"failed"}},{"kind":"Field","name":{"kind":"Name","value":"errors"}}]}}]}}]} as unknown as DocumentNode<ImportContactsMutation, ImportContactsMutationVariables>;
export const FindContactEmailDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"FindContactEmail"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"contactId"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"Int"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"findContactEmail"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"contactId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"contactId"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"success"}},{"kind":"Field","name":{"kind":"Name","value":"emailFound"}},{"kind":"Field","name":{"kind":"Name","value":"email"}},{"kind":"Field","name":{"kind":"Name","value":"verified"}},{"kind":"Field","name":{"kind":"Name","value":"message"}},{"kind":"Field","name":{"kind":"Name","value":"candidatesTried"}}]}}]}}]} as unknown as DocumentNode<FindContactEmailMutation, FindContactEmailMutationVariables>;
export const FindCompanyEmailsDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"FindCompanyEmails"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"companyId"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"Int"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"findCompanyEmails"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"companyId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"companyId"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"success"}},{"kind":"Field","name":{"kind":"Name","value":"message"}},{"kind":"Field","name":{"kind":"Name","value":"companiesProcessed"}},{"kind":"Field","name":{"kind":"Name","value":"totalContactsProcessed"}},{"kind":"Field","name":{"kind":"Name","value":"totalEmailsFound"}},{"kind":"Field","name":{"kind":"Name","value":"errors"}}]}}]}}]} as unknown as DocumentNode<FindCompanyEmailsMutation, FindCompanyEmailsMutationVariables>;
export const EnhanceAllContactsDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"EnhanceAllContacts"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"enhanceAllContacts"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"success"}},{"kind":"Field","name":{"kind":"Name","value":"message"}},{"kind":"Field","name":{"kind":"Name","value":"companiesProcessed"}},{"kind":"Field","name":{"kind":"Name","value":"totalContactsProcessed"}},{"kind":"Field","name":{"kind":"Name","value":"totalEmailsFound"}},{"kind":"Field","name":{"kind":"Name","value":"errors"}}]}}]}}]} as unknown as DocumentNode<EnhanceAllContactsMutation, EnhanceAllContactsMutationVariables>;
export const ApplyEmailPatternDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"ApplyEmailPattern"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"companyId"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"Int"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"applyEmailPattern"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"companyId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"companyId"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"success"}},{"kind":"Field","name":{"kind":"Name","value":"message"}},{"kind":"Field","name":{"kind":"Name","value":"contactsUpdated"}},{"kind":"Field","name":{"kind":"Name","value":"pattern"}},{"kind":"Field","name":{"kind":"Name","value":"contacts"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"email"}},{"kind":"Field","name":{"kind":"Name","value":"emailVerified"}}]}}]}}]}}]} as unknown as DocumentNode<ApplyEmailPatternMutation, ApplyEmailPatternMutationVariables>;
export const UnverifyCompanyContactsDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"UnverifyCompanyContacts"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"companyId"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"Int"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"unverifyCompanyContacts"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"companyId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"companyId"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"success"}},{"kind":"Field","name":{"kind":"Name","value":"count"}}]}}]}}]} as unknown as DocumentNode<UnverifyCompanyContactsMutation, UnverifyCompanyContactsMutationVariables>;
export const CreateContactDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"CreateContact"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"input"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"CreateContactInput"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"createContact"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"Variable","name":{"kind":"Name","value":"input"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"firstName"}},{"kind":"Field","name":{"kind":"Name","value":"lastName"}},{"kind":"Field","name":{"kind":"Name","value":"email"}},{"kind":"Field","name":{"kind":"Name","value":"linkedinUrl"}},{"kind":"Field","name":{"kind":"Name","value":"position"}},{"kind":"Field","name":{"kind":"Name","value":"companyId"}},{"kind":"Field","name":{"kind":"Name","value":"githubHandle"}},{"kind":"Field","name":{"kind":"Name","value":"telegramHandle"}},{"kind":"Field","name":{"kind":"Name","value":"tags"}}]}}]}}]} as unknown as DocumentNode<CreateContactMutation, CreateContactMutationVariables>;
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
export const GetReceivedEmailsDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"GetReceivedEmails"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"limit"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"Int"}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"offset"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"Int"}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"archived"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"Boolean"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"receivedEmails"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"limit"},"value":{"kind":"Variable","name":{"kind":"Name","value":"limit"}}},{"kind":"Argument","name":{"kind":"Name","value":"offset"},"value":{"kind":"Variable","name":{"kind":"Name","value":"offset"}}},{"kind":"Argument","name":{"kind":"Name","value":"archived"},"value":{"kind":"Variable","name":{"kind":"Name","value":"archived"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"emails"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"resendId"}},{"kind":"Field","name":{"kind":"Name","value":"fromEmail"}},{"kind":"Field","name":{"kind":"Name","value":"toEmails"}},{"kind":"Field","name":{"kind":"Name","value":"subject"}},{"kind":"Field","name":{"kind":"Name","value":"receivedAt"}},{"kind":"Field","name":{"kind":"Name","value":"archivedAt"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}}]}},{"kind":"Field","name":{"kind":"Name","value":"totalCount"}}]}}]}}]} as unknown as DocumentNode<GetReceivedEmailsQuery, GetReceivedEmailsQueryVariables>;
export const GetReceivedEmailDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"GetReceivedEmail"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"id"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"Int"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"receivedEmail"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"id"},"value":{"kind":"Variable","name":{"kind":"Name","value":"id"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"resendId"}},{"kind":"Field","name":{"kind":"Name","value":"fromEmail"}},{"kind":"Field","name":{"kind":"Name","value":"toEmails"}},{"kind":"Field","name":{"kind":"Name","value":"ccEmails"}},{"kind":"Field","name":{"kind":"Name","value":"replyToEmails"}},{"kind":"Field","name":{"kind":"Name","value":"subject"}},{"kind":"Field","name":{"kind":"Name","value":"messageId"}},{"kind":"Field","name":{"kind":"Name","value":"htmlContent"}},{"kind":"Field","name":{"kind":"Name","value":"textContent"}},{"kind":"Field","name":{"kind":"Name","value":"attachments"}},{"kind":"Field","name":{"kind":"Name","value":"receivedAt"}},{"kind":"Field","name":{"kind":"Name","value":"archivedAt"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}}]}}]}}]} as unknown as DocumentNode<GetReceivedEmailQuery, GetReceivedEmailQueryVariables>;
export const ArchiveEmailDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"ArchiveEmail"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"id"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"Int"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"archiveEmail"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"id"},"value":{"kind":"Variable","name":{"kind":"Name","value":"id"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"success"}},{"kind":"Field","name":{"kind":"Name","value":"message"}}]}}]}}]} as unknown as DocumentNode<ArchiveEmailMutation, ArchiveEmailMutationVariables>;
export const UnarchiveEmailDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"UnarchiveEmail"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"id"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"Int"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"unarchiveEmail"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"id"},"value":{"kind":"Variable","name":{"kind":"Name","value":"id"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"success"}},{"kind":"Field","name":{"kind":"Name","value":"message"}}]}}]}}]} as unknown as DocumentNode<UnarchiveEmailMutation, UnarchiveEmailMutationVariables>;
export const PreviewEmailDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"PreviewEmail"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"input"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"PreviewEmailInput"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"previewEmail"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"Variable","name":{"kind":"Name","value":"input"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"htmlContent"}},{"kind":"Field","name":{"kind":"Name","value":"subject"}},{"kind":"Field","name":{"kind":"Name","value":"drySendResult"}}]}}]}}]} as unknown as DocumentNode<PreviewEmailMutation, PreviewEmailMutationVariables>;
export const SendOutreachEmailDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"SendOutreachEmail"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"input"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"SendOutreachEmailInput"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"sendOutreachEmail"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"Variable","name":{"kind":"Name","value":"input"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"success"}},{"kind":"Field","name":{"kind":"Name","value":"emailId"}},{"kind":"Field","name":{"kind":"Name","value":"subject"}},{"kind":"Field","name":{"kind":"Name","value":"error"}}]}}]}}]} as unknown as DocumentNode<SendOutreachEmailMutation, SendOutreachEmailMutationVariables>;
export const GetEmailsNeedingFollowUpDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"GetEmailsNeedingFollowUp"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"limit"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"Int"}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"offset"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"Int"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"emailsNeedingFollowUp"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"limit"},"value":{"kind":"Variable","name":{"kind":"Name","value":"limit"}}},{"kind":"Argument","name":{"kind":"Name","value":"offset"},"value":{"kind":"Variable","name":{"kind":"Name","value":"offset"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"emails"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"contactId"}},{"kind":"Field","name":{"kind":"Name","value":"resendId"}},{"kind":"Field","name":{"kind":"Name","value":"fromEmail"}},{"kind":"Field","name":{"kind":"Name","value":"toEmails"}},{"kind":"Field","name":{"kind":"Name","value":"subject"}},{"kind":"Field","name":{"kind":"Name","value":"status"}},{"kind":"Field","name":{"kind":"Name","value":"sentAt"}},{"kind":"Field","name":{"kind":"Name","value":"sequenceType"}},{"kind":"Field","name":{"kind":"Name","value":"sequenceNumber"}},{"kind":"Field","name":{"kind":"Name","value":"followupStatus"}},{"kind":"Field","name":{"kind":"Name","value":"companyId"}},{"kind":"Field","name":{"kind":"Name","value":"recipientName"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}}]}},{"kind":"Field","name":{"kind":"Name","value":"totalCount"}}]}}]}}]} as unknown as DocumentNode<GetEmailsNeedingFollowUpQuery, GetEmailsNeedingFollowUpQueryVariables>;
export const GetEmailTemplatesDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"GetEmailTemplates"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"category"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"limit"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"Int"}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"offset"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"Int"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"emailTemplates"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"category"},"value":{"kind":"Variable","name":{"kind":"Name","value":"category"}}},{"kind":"Argument","name":{"kind":"Name","value":"limit"},"value":{"kind":"Variable","name":{"kind":"Name","value":"limit"}}},{"kind":"Argument","name":{"kind":"Name","value":"offset"},"value":{"kind":"Variable","name":{"kind":"Name","value":"offset"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"templates"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"description"}},{"kind":"Field","name":{"kind":"Name","value":"subject"}},{"kind":"Field","name":{"kind":"Name","value":"category"}},{"kind":"Field","name":{"kind":"Name","value":"tags"}},{"kind":"Field","name":{"kind":"Name","value":"isActive"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}}]}},{"kind":"Field","name":{"kind":"Name","value":"totalCount"}}]}}]}}]} as unknown as DocumentNode<GetEmailTemplatesQuery, GetEmailTemplatesQueryVariables>;
export const GetEmailTemplateDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"GetEmailTemplate"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"id"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"Int"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"emailTemplate"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"id"},"value":{"kind":"Variable","name":{"kind":"Name","value":"id"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"description"}},{"kind":"Field","name":{"kind":"Name","value":"subject"}},{"kind":"Field","name":{"kind":"Name","value":"htmlContent"}},{"kind":"Field","name":{"kind":"Name","value":"textContent"}},{"kind":"Field","name":{"kind":"Name","value":"category"}},{"kind":"Field","name":{"kind":"Name","value":"tags"}},{"kind":"Field","name":{"kind":"Name","value":"variables"}},{"kind":"Field","name":{"kind":"Name","value":"isActive"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}}]}}]}}]} as unknown as DocumentNode<GetEmailTemplateQuery, GetEmailTemplateQueryVariables>;
export const CreateEmailTemplateDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"CreateEmailTemplate"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"input"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"CreateEmailTemplateInput"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"createEmailTemplate"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"Variable","name":{"kind":"Name","value":"input"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"subject"}},{"kind":"Field","name":{"kind":"Name","value":"category"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}}]}}]}}]} as unknown as DocumentNode<CreateEmailTemplateMutation, CreateEmailTemplateMutationVariables>;
export const UpdateEmailTemplateDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"UpdateEmailTemplate"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"id"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"Int"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"input"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"UpdateEmailTemplateInput"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"updateEmailTemplate"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"id"},"value":{"kind":"Variable","name":{"kind":"Name","value":"id"}}},{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"Variable","name":{"kind":"Name","value":"input"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"subject"}},{"kind":"Field","name":{"kind":"Name","value":"isActive"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}}]}}]}}]} as unknown as DocumentNode<UpdateEmailTemplateMutation, UpdateEmailTemplateMutationVariables>;
export const DeleteEmailTemplateDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"DeleteEmailTemplate"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"id"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"Int"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"deleteEmailTemplate"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"id"},"value":{"kind":"Variable","name":{"kind":"Name","value":"id"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"success"}},{"kind":"Field","name":{"kind":"Name","value":"message"}}]}}]}}]} as unknown as DocumentNode<DeleteEmailTemplateMutation, DeleteEmailTemplateMutationVariables>;
export const DueRemindersDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"DueReminders"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"dueReminders"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"reminder"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"contactId"}},{"kind":"Field","name":{"kind":"Name","value":"remindAt"}},{"kind":"Field","name":{"kind":"Name","value":"recurrence"}},{"kind":"Field","name":{"kind":"Name","value":"note"}},{"kind":"Field","name":{"kind":"Name","value":"status"}},{"kind":"Field","name":{"kind":"Name","value":"snoozedUntil"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}}]}},{"kind":"Field","name":{"kind":"Name","value":"contact"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"firstName"}},{"kind":"Field","name":{"kind":"Name","value":"lastName"}},{"kind":"Field","name":{"kind":"Name","value":"position"}},{"kind":"Field","name":{"kind":"Name","value":"tags"}}]}}]}}]}}]} as unknown as DocumentNode<DueRemindersQuery, DueRemindersQueryVariables>;
export const ContactRemindersDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"ContactReminders"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"contactId"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"Int"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"contactReminders"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"contactId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"contactId"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"contactId"}},{"kind":"Field","name":{"kind":"Name","value":"remindAt"}},{"kind":"Field","name":{"kind":"Name","value":"recurrence"}},{"kind":"Field","name":{"kind":"Name","value":"note"}},{"kind":"Field","name":{"kind":"Name","value":"status"}},{"kind":"Field","name":{"kind":"Name","value":"snoozedUntil"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}}]}}]}}]} as unknown as DocumentNode<ContactRemindersQuery, ContactRemindersQueryVariables>;
export const CreateReminderDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"CreateReminder"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"input"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"CreateReminderInput"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"createReminder"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"Variable","name":{"kind":"Name","value":"input"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"contactId"}},{"kind":"Field","name":{"kind":"Name","value":"remindAt"}},{"kind":"Field","name":{"kind":"Name","value":"recurrence"}},{"kind":"Field","name":{"kind":"Name","value":"note"}},{"kind":"Field","name":{"kind":"Name","value":"status"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}}]}}]}}]} as unknown as DocumentNode<CreateReminderMutation, CreateReminderMutationVariables>;
export const UpdateReminderDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"UpdateReminder"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"id"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"Int"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"input"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"UpdateReminderInput"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"updateReminder"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"id"},"value":{"kind":"Variable","name":{"kind":"Name","value":"id"}}},{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"Variable","name":{"kind":"Name","value":"input"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"contactId"}},{"kind":"Field","name":{"kind":"Name","value":"remindAt"}},{"kind":"Field","name":{"kind":"Name","value":"recurrence"}},{"kind":"Field","name":{"kind":"Name","value":"note"}},{"kind":"Field","name":{"kind":"Name","value":"status"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}}]}}]}}]} as unknown as DocumentNode<UpdateReminderMutation, UpdateReminderMutationVariables>;
export const SnoozeReminderDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"SnoozeReminder"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"id"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"Int"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"days"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"Int"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"snoozeReminder"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"id"},"value":{"kind":"Variable","name":{"kind":"Name","value":"id"}}},{"kind":"Argument","name":{"kind":"Name","value":"days"},"value":{"kind":"Variable","name":{"kind":"Name","value":"days"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"contactId"}},{"kind":"Field","name":{"kind":"Name","value":"remindAt"}},{"kind":"Field","name":{"kind":"Name","value":"status"}},{"kind":"Field","name":{"kind":"Name","value":"snoozedUntil"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}}]}}]}}]} as unknown as DocumentNode<SnoozeReminderMutation, SnoozeReminderMutationVariables>;
export const DismissReminderDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"DismissReminder"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"id"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"Int"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"dismissReminder"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"id"},"value":{"kind":"Variable","name":{"kind":"Name","value":"id"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"contactId"}},{"kind":"Field","name":{"kind":"Name","value":"status"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}}]}}]}}]} as unknown as DocumentNode<DismissReminderMutation, DismissReminderMutationVariables>;
export const ComputeNextTouchScoresDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"ComputeNextTouchScores"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"companyId"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"Int"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"computeNextTouchScores"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"companyId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"companyId"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"success"}},{"kind":"Field","name":{"kind":"Name","value":"message"}},{"kind":"Field","name":{"kind":"Name","value":"contactsUpdated"}},{"kind":"Field","name":{"kind":"Name","value":"topContacts"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"contactId"}},{"kind":"Field","name":{"kind":"Name","value":"firstName"}},{"kind":"Field","name":{"kind":"Name","value":"lastName"}},{"kind":"Field","name":{"kind":"Name","value":"position"}},{"kind":"Field","name":{"kind":"Name","value":"nextTouchScore"}},{"kind":"Field","name":{"kind":"Name","value":"lastContactedAt"}}]}}]}}]}}]} as unknown as DocumentNode<ComputeNextTouchScoresMutation, ComputeNextTouchScoresMutationVariables>;
export const ScoreContactsMlDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"ScoreContactsML"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"companyId"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"Int"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"scoreContactsML"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"companyId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"companyId"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"success"}},{"kind":"Field","name":{"kind":"Name","value":"message"}},{"kind":"Field","name":{"kind":"Name","value":"contactsScored"}},{"kind":"Field","name":{"kind":"Name","value":"decisionMakersFound"}},{"kind":"Field","name":{"kind":"Name","value":"results"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"contactId"}},{"kind":"Field","name":{"kind":"Name","value":"seniority"}},{"kind":"Field","name":{"kind":"Name","value":"department"}},{"kind":"Field","name":{"kind":"Name","value":"authorityScore"}},{"kind":"Field","name":{"kind":"Name","value":"isDecisionMaker"}},{"kind":"Field","name":{"kind":"Name","value":"dmReasons"}}]}}]}}]}}]} as unknown as DocumentNode<ScoreContactsMlMutation, ScoreContactsMlMutationVariables>;