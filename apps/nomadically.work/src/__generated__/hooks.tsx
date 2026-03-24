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

export type Application = {
  __typename?: 'Application';
  aiInterviewQuestions: Maybe<Scalars['String']['output']>;
  aiTechStack: Maybe<Scalars['String']['output']>;
  companyKey: Maybe<Scalars['String']['output']>;
  companyName: Maybe<Scalars['String']['output']>;
  createdAt: Scalars['String']['output'];
  email: Scalars['EmailAddress']['output'];
  id: Scalars['Int']['output'];
  jobDescription: Maybe<Scalars['String']['output']>;
  jobId: Maybe<Scalars['String']['output']>;
  jobTitle: Maybe<Scalars['String']['output']>;
  notes: Maybe<Scalars['String']['output']>;
  questions: Array<QuestionAnswer>;
  resume: Maybe<Scalars['Upload']['output']>;
  status: ApplicationStatus;
};

export type ApplicationInput = {
  companyName?: InputMaybe<Scalars['String']['input']>;
  jobId?: InputMaybe<Scalars['String']['input']>;
  jobTitle?: InputMaybe<Scalars['String']['input']>;
  questions: Array<QuestionAnswerInput>;
  resume?: InputMaybe<Scalars['Upload']['input']>;
};

/**
 * Pipeline status for a tracked job application.
 * Maps to a kanban column in the UI.
 */
export type ApplicationStatus =
  | 'accepted'
  | 'pending'
  | 'rejected'
  | 'reviewed'
  | 'submitted';

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

export type AshbyAddress = {
  __typename?: 'AshbyAddress';
  postalAddress: Maybe<AshbyPostalAddress>;
};

export type AshbyCompensation = {
  __typename?: 'AshbyCompensation';
  compensationTierSummary: Maybe<Scalars['String']['output']>;
  compensationTiers: Array<AshbyCompensationTier>;
  scrapeableCompensationSalarySummary: Maybe<Scalars['String']['output']>;
  summaryComponents: Array<AshbyCompensationComponent>;
};

export type AshbyCompensationComponent = {
  __typename?: 'AshbyCompensationComponent';
  compensationType: Maybe<Scalars['String']['output']>;
  currencyCode: Maybe<Scalars['String']['output']>;
  id: Maybe<Scalars['String']['output']>;
  interval: Maybe<Scalars['String']['output']>;
  maxValue: Maybe<Scalars['Float']['output']>;
  minValue: Maybe<Scalars['Float']['output']>;
  summary: Maybe<Scalars['String']['output']>;
};

export type AshbyCompensationTier = {
  __typename?: 'AshbyCompensationTier';
  additionalInformation: Maybe<Scalars['String']['output']>;
  components: Array<AshbyCompensationComponent>;
  id: Maybe<Scalars['String']['output']>;
  tierSummary: Maybe<Scalars['String']['output']>;
  title: Maybe<Scalars['String']['output']>;
};

export type AshbyEnrichment = {
  __typename?: 'AshbyEnrichment';
  company_name: Maybe<Scalars['String']['output']>;
  enriched_at: Maybe<Scalars['String']['output']>;
  industry_tags: Array<Scalars['String']['output']>;
  size_signal: Maybe<Scalars['String']['output']>;
  tech_signals: Array<Scalars['String']['output']>;
};

export type AshbyPostalAddress = {
  __typename?: 'AshbyPostalAddress';
  addressCountry: Maybe<Scalars['String']['output']>;
  addressLocality: Maybe<Scalars['String']['output']>;
  addressRegion: Maybe<Scalars['String']['output']>;
};

export type AshbySecondaryLocation = {
  __typename?: 'AshbySecondaryLocation';
  address: Maybe<AshbyPostalAddress>;
  location: Scalars['String']['output'];
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

export type ChatMessage = {
  __typename?: 'ChatMessage';
  content: Scalars['String']['output'];
  role: Scalars['String']['output'];
};

export type ChatMessageInput = {
  content: Scalars['String']['input'];
  role: Scalars['String']['input'];
};

/** Confidence level of a classification result. */
export type ClassificationConfidence =
  | 'high'
  | 'low'
  | 'medium';

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
  opportunities: Array<Opportunity>;
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

export type CreateLangSmithPromptInput = {
  description?: InputMaybe<Scalars['String']['input']>;
  isPublic?: InputMaybe<Scalars['Boolean']['input']>;
  readme?: InputMaybe<Scalars['String']['input']>;
  tags?: InputMaybe<Array<Scalars['String']['input']>>;
};

export type CreateOpportunityInput = {
  applicationNotes?: InputMaybe<Scalars['String']['input']>;
  companyId?: InputMaybe<Scalars['Int']['input']>;
  contactId?: InputMaybe<Scalars['Int']['input']>;
  deadline?: InputMaybe<Scalars['String']['input']>;
  endDate?: InputMaybe<Scalars['String']['input']>;
  rewardText?: InputMaybe<Scalars['String']['input']>;
  rewardUsd?: InputMaybe<Scalars['Float']['input']>;
  source?: InputMaybe<Scalars['String']['input']>;
  startDate?: InputMaybe<Scalars['String']['input']>;
  status?: InputMaybe<Scalars['String']['input']>;
  tags?: InputMaybe<Array<Scalars['String']['input']>>;
  title: Scalars['String']['input'];
  url?: InputMaybe<Scalars['String']['input']>;
};

export type CreatePromptInput = {
  chatMessages?: InputMaybe<Array<ChatMessageInput>>;
  config?: InputMaybe<PromptConfigInput>;
  labels?: InputMaybe<Array<Scalars['String']['input']>>;
  name: Scalars['String']['input'];
  prompt?: InputMaybe<Scalars['String']['input']>;
  tags?: InputMaybe<Array<Scalars['String']['input']>>;
  type: PromptType;
};

export type CreateTaskInput = {
  description?: InputMaybe<Scalars['String']['input']>;
  dueDate?: InputMaybe<Scalars['String']['input']>;
  entityId?: InputMaybe<Scalars['String']['input']>;
  entityType?: InputMaybe<Scalars['String']['input']>;
  priority?: InputMaybe<Scalars['String']['input']>;
  status?: InputMaybe<Scalars['String']['input']>;
  tags?: InputMaybe<Array<Scalars['String']['input']>>;
  title: Scalars['String']['input'];
};

export type DeleteApplicationResponse = {
  __typename?: 'DeleteApplicationResponse';
  message: Maybe<Scalars['String']['output']>;
  success: Scalars['Boolean']['output'];
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

export type DeleteJobResponse = {
  __typename?: 'DeleteJobResponse';
  message: Maybe<Scalars['String']['output']>;
  success: Scalars['Boolean']['output'];
};

export type DeleteOpportunityResult = {
  __typename?: 'DeleteOpportunityResult';
  message: Maybe<Scalars['String']['output']>;
  success: Scalars['Boolean']['output'];
};

export type DeleteTaskResult = {
  __typename?: 'DeleteTaskResult';
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

/** Response from enhancing a job with ATS data */
export type EnhanceJobResponse = {
  __typename?: 'EnhanceJobResponse';
  /** The updated job record with enhanced data from the ATS */
  job: Maybe<Job>;
  /** Human-readable message about the operation result */
  message: Maybe<Scalars['String']['output']>;
  /** Whether the enhancement was successful */
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

export type GreenhouseCompliance = {
  __typename?: 'GreenhouseCompliance';
  description: Maybe<Scalars['String']['output']>;
  questions: Maybe<Array<GreenhouseQuestion>>;
  type: Scalars['String']['output'];
};

export type GreenhouseDataCompliance = {
  __typename?: 'GreenhouseDataCompliance';
  demographic_data_consent_applies: Scalars['Boolean']['output'];
  requires_consent: Scalars['Boolean']['output'];
  requires_processing_consent: Scalars['Boolean']['output'];
  requires_retention_consent: Scalars['Boolean']['output'];
  retention_period: Maybe<Scalars['Int']['output']>;
  type: Scalars['String']['output'];
};

export type GreenhouseDemographicQuestions = {
  __typename?: 'GreenhouseDemographicQuestions';
  description: Maybe<Scalars['String']['output']>;
  header: Maybe<Scalars['String']['output']>;
  questions: Maybe<Array<GreenhouseQuestion>>;
};

export type GreenhouseDepartment = {
  __typename?: 'GreenhouseDepartment';
  child_ids: Maybe<Array<Scalars['String']['output']>>;
  id: Scalars['String']['output'];
  name: Scalars['String']['output'];
  parent_id: Maybe<Scalars['String']['output']>;
};

export type GreenhouseMetadata = {
  __typename?: 'GreenhouseMetadata';
  id: Scalars['String']['output'];
  name: Scalars['String']['output'];
  value: Maybe<Scalars['String']['output']>;
  value_type: Maybe<Scalars['String']['output']>;
};

export type GreenhouseOffice = {
  __typename?: 'GreenhouseOffice';
  child_ids: Maybe<Array<Scalars['String']['output']>>;
  id: Scalars['String']['output'];
  location: Maybe<Scalars['String']['output']>;
  name: Scalars['String']['output'];
  parent_id: Maybe<Scalars['String']['output']>;
};

export type GreenhouseQuestion = {
  __typename?: 'GreenhouseQuestion';
  description: Maybe<Scalars['String']['output']>;
  fields: Maybe<Array<GreenhouseQuestionField>>;
  label: Scalars['String']['output'];
  required: Scalars['Boolean']['output'];
};

export type GreenhouseQuestionField = {
  __typename?: 'GreenhouseQuestionField';
  name: Maybe<Scalars['String']['output']>;
  type: Scalars['String']['output'];
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

export type Job = {
  __typename?: 'Job';
  absolute_url: Maybe<Scalars['String']['output']>;
  applied: Scalars['Boolean']['output'];
  appliedAt: Maybe<Scalars['String']['output']>;
  archived: Scalars['Boolean']['output'];
  ashby_address: Maybe<AshbyAddress>;
  ashby_apply_url: Maybe<Scalars['String']['output']>;
  ashby_compensation: Maybe<AshbyCompensation>;
  ashby_department: Maybe<Scalars['String']['output']>;
  ashby_employment_type: Maybe<Scalars['String']['output']>;
  ashby_is_listed: Maybe<Scalars['Boolean']['output']>;
  ashby_is_remote: Maybe<Scalars['Boolean']['output']>;
  ashby_job_url: Maybe<Scalars['String']['output']>;
  ashby_secondary_locations: Maybe<Array<AshbySecondaryLocation>>;
  ashby_team: Maybe<Scalars['String']['output']>;
  company: Maybe<Company>;
  company_id: Maybe<Scalars['Int']['output']>;
  company_key: Scalars['String']['output'];
  company_name: Maybe<Scalars['String']['output']>;
  compliance: Maybe<Array<GreenhouseCompliance>>;
  created_at: Scalars['String']['output'];
  data_compliance: Maybe<Array<GreenhouseDataCompliance>>;
  demographic_questions: Maybe<GreenhouseDemographicQuestions>;
  departments: Maybe<Array<GreenhouseDepartment>>;
  description: Maybe<Scalars['String']['output']>;
  external_id: Scalars['String']['output'];
  id: Scalars['Int']['output'];
  internal_job_id: Maybe<Scalars['String']['output']>;
  /** Whether this job is classified as Remote EU — read directly from the DB column. */
  is_remote_eu: Scalars['Boolean']['output'];
  language: Maybe<Scalars['String']['output']>;
  location: Maybe<Scalars['String']['output']>;
  location_questions: Maybe<Array<GreenhouseQuestion>>;
  metadata: Maybe<Array<GreenhouseMetadata>>;
  offices: Maybe<Array<GreenhouseOffice>>;
  /**
   * Canonical publication date. All ATS sources (Greenhouse, Ashby)
   * write to the unified first_published DB column at ingestion time.
   * Falls back to posted_at (ingestion timestamp) when no ATS date exists.
   */
  publishedAt: Scalars['String']['output'];
  questions: Maybe<Array<GreenhouseQuestion>>;
  recruiter: Maybe<Contact>;
  remote_eu_confidence: Maybe<ClassificationConfidence>;
  remote_eu_reason: Maybe<Scalars['String']['output']>;
  requisition_id: Maybe<Scalars['String']['output']>;
  score: Maybe<Scalars['Float']['output']>;
  score_reason: Maybe<Scalars['String']['output']>;
  skillMatch: Maybe<SkillMatch>;
  skills: Maybe<Array<JobSkill>>;
  source_id: Maybe<Scalars['String']['output']>;
  source_kind: Scalars['String']['output'];
  status: Maybe<JobStatus>;
  title: Scalars['String']['output'];
  updated_at: Scalars['String']['output'];
  url: Scalars['String']['output'];
};

export type JobSkill = {
  __typename?: 'JobSkill';
  confidence: Maybe<Scalars['Float']['output']>;
  evidence: Maybe<Scalars['String']['output']>;
  level: Scalars['String']['output'];
  tag: Scalars['String']['output'];
};

/**
 * Pipeline status for a job posting.
 * Mirrors workers/process-jobs/src/entry.py JobStatus enum — values must stay in sync.
 */
export type JobStatus =
  | 'enhanced'
  | 'error'
  | 'eu_remote'
  | 'new'
  | 'non_eu'
  | 'reported'
  | 'role_match'
  | 'role_nomatch';

export type JobsResponse = {
  __typename?: 'JobsResponse';
  jobs: Array<Job>;
  totalCount: Scalars['Int']['output'];
};

export type LangSmithPrompt = {
  __typename?: 'LangSmithPrompt';
  createdAt: Scalars['String']['output'];
  description: Maybe<Scalars['String']['output']>;
  fullName: Scalars['String']['output'];
  id: Scalars['String']['output'];
  isArchived: Scalars['Boolean']['output'];
  isPublic: Scalars['Boolean']['output'];
  lastCommitHash: Maybe<Scalars['String']['output']>;
  likedByAuthUser: Scalars['Boolean']['output'];
  numCommits: Scalars['Int']['output'];
  numDownloads: Scalars['Int']['output'];
  numLikes: Scalars['Int']['output'];
  numViews: Scalars['Int']['output'];
  owner: Maybe<Scalars['String']['output']>;
  promptHandle: Scalars['String']['output'];
  readme: Maybe<Scalars['String']['output']>;
  tags: Array<Scalars['String']['output']>;
  tenantId: Scalars['String']['output'];
  updatedAt: Scalars['String']['output'];
};

export type LangSmithPromptCommit = {
  __typename?: 'LangSmithPromptCommit';
  commitHash: Scalars['String']['output'];
  examples: Array<Scalars['JSON']['output']>;
  manifest: Scalars['JSON']['output'];
  owner: Scalars['String']['output'];
  promptName: Scalars['String']['output'];
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
  archiveJob: Job;
  blockCompany: BlockedCompany;
  blockJobsByCompany: BlockJobsResult;
  cancelCompanyEmails: CancelCompanyEmailsResult;
  cancelScheduledEmail: CancelEmailResult;
  completeTask: Task;
  createApplication: Application;
  createCompany: Company;
  createContact: Contact;
  createDraftCampaign: EmailCampaign;
  createEmailTemplate: EmailTemplate;
  createLangSmithPrompt: LangSmithPrompt;
  createOpportunity: Opportunity;
  createPrompt: Prompt;
  createTask: Task;
  deleteAllJobs: DeleteJobResponse;
  deleteApplication: DeleteApplicationResponse;
  deleteCampaign: DeleteCampaignResult;
  deleteCompanies: DeleteCompaniesResult;
  deleteCompany: DeleteCompanyResponse;
  deleteContact: DeleteContactResult;
  deleteEmailTemplate: DeleteEmailTemplateResult;
  deleteJob: DeleteJobResponse;
  deleteLangSmithPrompt: Scalars['Boolean']['output'];
  deleteOpportunity: DeleteOpportunityResult;
  deleteStackEntry: StackMutationResponse;
  deleteTask: DeleteTaskResult;
  enhanceAllContacts: EnhanceAllContactsResult;
  enhanceCompany: EnhanceCompanyResponse;
  /**
   * Enhance a job posting by fetching detailed data from the ATS (Applicant Tracking System).
   *
   * Supported ATS sources:
   * - greenhouse: Greenhouse ATS (https://greenhouse.io)
   * - ashby: Ashby ATS (https://ashbyhq.com)
   *
   * For Greenhouse:
   * - jobId: The job posting ID from the URL (e.g., "5802159004" from https://job-boards.greenhouse.io/grafanalabs/jobs/5802159004)
   * - company: The board token (e.g., "grafanalabs")
   *
   * For Ashby:
   * - jobId: The posting ID
   * - company: The board name
   *
   * The mutation will:
   * 1. Fetch comprehensive job data from the ATS API
   * 2. Save enhanced fields (description, departments, offices, questions, etc.)
   * 3. Return the updated job with full ATS data
   */
  enhanceJobFromATS: EnhanceJobResponse;
  findCompanyEmails: EnhanceAllContactsResult;
  findContactEmail: FindContactEmailResult;
  generateEmail: GenerateEmailResult;
  generateReply: GenerateReplyResult;
  importCompanies: ImportCompaniesResult;
  importCompanyWithContacts: ImportCompanyResult;
  importContacts: ImportContactsResult;
  importResendEmails: ImportResendResult;
  ingestResumeParse: Maybe<ResumeIngestResult>;
  ingest_company_snapshot: CompanySnapshot;
  launchEmailCampaign: EmailCampaign;
  markContactEmailVerified: Contact;
  markEmailReplied: MarkRepliedResult;
  markJobApplied: Job;
  mergeDuplicateCompanies: MergeCompaniesResult;
  mergeDuplicateContacts: MergeDuplicateContactsResult;
  previewEmail: EmailPreview;
  /**
   * Trigger classification/enhancement of all unprocessed jobs via the Cloudflare Worker.
   * Calls the classify-jobs CF worker (POST) which runs DeepSeek-based classification
   * for remote-EU eligibility on every unclassified job.
   */
  processAllJobs: ProcessAllJobsResponse;
  pushLangSmithPrompt: Scalars['String']['output'];
  rateResumeAnswer: Maybe<Scalars['Boolean']['output']>;
  /**
   * Report a job as irrelevant, spam, or incorrectly classified.
   * Sets the job status to "reported" so it can be reviewed or excluded.
   * Requires authentication.
   */
  reportJob: Maybe<Job>;
  scheduleBatchEmails: ScheduleBatchResult;
  scheduleFollowUpBatch: FollowUpBatchResult;
  sendEmail: SendEmailResult;
  sendOutreachEmail: SendOutreachEmailResult;
  sendScheduledEmailNow: SendNowResult;
  syncResendEmails: SyncResendResult;
  unarchiveEmail: ArchiveEmailResult;
  unarchiveJob: Job;
  unblockCompany: DeleteBlockedCompanyResult;
  unverifyCompanyContacts: UnverifyContactsResult;
  updateApplication: Application;
  updateCampaign: EmailCampaign;
  updateCompany: Company;
  updateContact: Contact;
  updateEmailTemplate: EmailTemplate;
  updateLangSmithPrompt: LangSmithPrompt;
  updateOpportunity: Opportunity;
  updatePromptLabel: Prompt;
  updateTask: Task;
  updateUserSettings: UserSettings;
  uploadResume: Maybe<ResumeUploadResult>;
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


export type MutationArchiveJobArgs = {
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


export type MutationCompleteTaskArgs = {
  id: Scalars['Int']['input'];
};


export type MutationCreateApplicationArgs = {
  input: ApplicationInput;
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


export type MutationCreateLangSmithPromptArgs = {
  input?: InputMaybe<CreateLangSmithPromptInput>;
  promptIdentifier: Scalars['String']['input'];
};


export type MutationCreateOpportunityArgs = {
  input: CreateOpportunityInput;
};


export type MutationCreatePromptArgs = {
  input: CreatePromptInput;
};


export type MutationCreateTaskArgs = {
  input: CreateTaskInput;
};


export type MutationDeleteApplicationArgs = {
  id: Scalars['Int']['input'];
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


export type MutationDeleteJobArgs = {
  id: Scalars['Int']['input'];
};


export type MutationDeleteLangSmithPromptArgs = {
  promptIdentifier: Scalars['String']['input'];
};


export type MutationDeleteOpportunityArgs = {
  id: Scalars['String']['input'];
};


export type MutationDeleteStackEntryArgs = {
  name: Scalars['String']['input'];
};


export type MutationDeleteTaskArgs = {
  id: Scalars['Int']['input'];
};


export type MutationEnhanceCompanyArgs = {
  id?: InputMaybe<Scalars['Int']['input']>;
  key?: InputMaybe<Scalars['String']['input']>;
};


export type MutationEnhanceJobFromAtsArgs = {
  company: Scalars['String']['input'];
  jobId: Scalars['String']['input'];
  source: Scalars['String']['input'];
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


export type MutationIngestResumeParseArgs = {
  email: Scalars['String']['input'];
  filename: Scalars['String']['input'];
  job_id: Scalars['String']['input'];
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


export type MutationMarkJobAppliedArgs = {
  id: Scalars['Int']['input'];
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


export type MutationProcessAllJobsArgs = {
  limit?: InputMaybe<Scalars['Int']['input']>;
};


export type MutationPushLangSmithPromptArgs = {
  input?: InputMaybe<PushLangSmithPromptInput>;
  promptIdentifier: Scalars['String']['input'];
};


export type MutationRateResumeAnswerArgs = {
  helpful: Scalars['Boolean']['input'];
  traceId: Scalars['ID']['input'];
};


export type MutationReportJobArgs = {
  id: Scalars['Int']['input'];
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


export type MutationUnarchiveJobArgs = {
  id: Scalars['Int']['input'];
};


export type MutationUnblockCompanyArgs = {
  id: Scalars['Int']['input'];
};


export type MutationUnverifyCompanyContactsArgs = {
  companyId: Scalars['Int']['input'];
};


export type MutationUpdateApplicationArgs = {
  id: Scalars['Int']['input'];
  input: UpdateApplicationInput;
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


export type MutationUpdateLangSmithPromptArgs = {
  input: UpdateLangSmithPromptInput;
  promptIdentifier: Scalars['String']['input'];
};


export type MutationUpdateOpportunityArgs = {
  id: Scalars['String']['input'];
  input: UpdateOpportunityInput;
};


export type MutationUpdatePromptLabelArgs = {
  label: Scalars['String']['input'];
  name: Scalars['String']['input'];
  version: Scalars['Int']['input'];
};


export type MutationUpdateTaskArgs = {
  id: Scalars['Int']['input'];
  input: UpdateTaskInput;
};


export type MutationUpdateUserSettingsArgs = {
  settings: UserSettingsInput;
  userId: Scalars['String']['input'];
};


export type MutationUploadResumeArgs = {
  email: Scalars['String']['input'];
  filename: Scalars['String']['input'];
  resumePdf: Scalars['String']['input'];
};


export type MutationUpsert_Company_Ats_BoardsArgs = {
  boards: Array<AtsBoardUpsertInput>;
  company_id: Scalars['Int']['input'];
};


export type MutationVerifyContactEmailArgs = {
  contactId: Scalars['Int']['input'];
};

export type OpportunitiesResult = {
  __typename?: 'OpportunitiesResult';
  opportunities: Array<Opportunity>;
  totalCount: Scalars['Int']['output'];
};

export type Opportunity = {
  __typename?: 'Opportunity';
  applicationNotes: Maybe<Scalars['String']['output']>;
  applicationStatus: Maybe<Scalars['String']['output']>;
  applied: Scalars['Boolean']['output'];
  appliedAt: Maybe<Scalars['String']['output']>;
  company: Maybe<Company>;
  companyId: Maybe<Scalars['Int']['output']>;
  contactId: Maybe<Scalars['Int']['output']>;
  createdAt: Scalars['String']['output'];
  deadline: Maybe<Scalars['String']['output']>;
  endDate: Maybe<Scalars['String']['output']>;
  firstSeen: Maybe<Scalars['String']['output']>;
  id: Scalars['String']['output'];
  lastSeen: Maybe<Scalars['String']['output']>;
  metadata: Maybe<Scalars['JSON']['output']>;
  rawContext: Maybe<Scalars['String']['output']>;
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

/** Response from triggering the classify-jobs Cloudflare Worker */
export type ProcessAllJobsResponse = {
  __typename?: 'ProcessAllJobsResponse';
  /** Number of errors during ATS enhancement */
  enhanceErrors: Maybe<Scalars['Int']['output']>;
  /** Number of jobs enhanced with ATS data in this run */
  enhanced: Maybe<Scalars['Int']['output']>;
  /** Number of errors encountered during classification */
  errors: Maybe<Scalars['Int']['output']>;
  /** Number of jobs classified as EU-remote */
  euRemote: Maybe<Scalars['Int']['output']>;
  message: Maybe<Scalars['String']['output']>;
  /** Number of jobs classified as non-EU */
  nonEuRemote: Maybe<Scalars['Int']['output']>;
  /** Number of jobs classified in this run */
  processed: Maybe<Scalars['Int']['output']>;
  success: Scalars['Boolean']['output'];
};

export type Prompt = {
  __typename?: 'Prompt';
  chatMessages: Maybe<Array<ChatMessage>>;
  config: Maybe<PromptConfig>;
  createdAt: Maybe<Scalars['String']['output']>;
  createdBy: Maybe<Scalars['String']['output']>;
  isUserSpecific: Scalars['Boolean']['output'];
  labels: Maybe<Array<Scalars['String']['output']>>;
  name: Scalars['String']['output'];
  prompt: Maybe<Scalars['String']['output']>;
  tags: Maybe<Array<Scalars['String']['output']>>;
  type: PromptType;
  updatedAt: Maybe<Scalars['String']['output']>;
  version: Maybe<Scalars['Int']['output']>;
};

export type PromptConfig = {
  __typename?: 'PromptConfig';
  max_tokens: Maybe<Scalars['Int']['output']>;
  model: Maybe<Scalars['String']['output']>;
  temperature: Maybe<Scalars['Float']['output']>;
  top_p: Maybe<Scalars['Float']['output']>;
};

export type PromptConfigInput = {
  max_tokens?: InputMaybe<Scalars['Int']['input']>;
  model?: InputMaybe<Scalars['String']['input']>;
  temperature?: InputMaybe<Scalars['Float']['input']>;
  top_p?: InputMaybe<Scalars['Float']['input']>;
};

export type PromptType =
  | 'CHAT'
  | 'TEXT';

export type PromptUsage = {
  __typename?: 'PromptUsage';
  label: Maybe<Scalars['String']['output']>;
  promptName: Scalars['String']['output'];
  traceId: Maybe<Scalars['String']['output']>;
  usedAt: Scalars['String']['output'];
  userEmail: Scalars['String']['output'];
  version: Maybe<Scalars['Int']['output']>;
};

export type PushLangSmithPromptInput = {
  description?: InputMaybe<Scalars['String']['input']>;
  isPublic?: InputMaybe<Scalars['Boolean']['input']>;
  object?: InputMaybe<Scalars['JSON']['input']>;
  parentCommitHash?: InputMaybe<Scalars['String']['input']>;
  readme?: InputMaybe<Scalars['String']['input']>;
  tags?: InputMaybe<Array<Scalars['String']['input']>>;
};

export type Query = {
  __typename?: 'Query';
  allCompanyTags: Array<Scalars['String']['output']>;
  application: Maybe<Application>;
  applications: Array<Application>;
  askAboutResume: Maybe<ResumeAnswer>;
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
  executeSql: TextToSqlResult;
  findCompany: FindCompanyResult;
  job: Maybe<Job>;
  jobs: JobsResponse;
  langsmithPrompt: Maybe<LangSmithPrompt>;
  langsmithPromptCommit: Maybe<LangSmithPromptCommit>;
  langsmithPrompts: Array<LangSmithPrompt>;
  myPromptUsage: Array<PromptUsage>;
  opportunities: OpportunitiesResult;
  opportunity: Maybe<Opportunity>;
  prompt: Maybe<Prompt>;
  prompts: Array<RegisteredPrompt>;
  receivedEmail: Maybe<ReceivedEmail>;
  receivedEmails: ReceivedEmailsResult;
  resendEmail: Maybe<ResendEmailDetail>;
  resumeStatus: Maybe<ResumeStatus>;
  task: Maybe<Task>;
  tasks: TasksResult;
  textToSql: TextToSqlResult;
  userSettings: Maybe<UserSettings>;
};


export type QueryApplicationArgs = {
  id: Scalars['Int']['input'];
};


export type QueryAskAboutResumeArgs = {
  email: Scalars['String']['input'];
  question: Scalars['String']['input'];
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


export type QueryExecuteSqlArgs = {
  sql: Scalars['String']['input'];
};


export type QueryFindCompanyArgs = {
  name?: InputMaybe<Scalars['String']['input']>;
  website?: InputMaybe<Scalars['String']['input']>;
};


export type QueryJobArgs = {
  id: Scalars['String']['input'];
};


export type QueryJobsArgs = {
  companyKey?: InputMaybe<Scalars['String']['input']>;
  excludedCompanies?: InputMaybe<Array<Scalars['String']['input']>>;
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
  remoteEuConfidence?: InputMaybe<Scalars['String']['input']>;
  search?: InputMaybe<Scalars['String']['input']>;
  showAll?: InputMaybe<Scalars['Boolean']['input']>;
  skills?: InputMaybe<Array<Scalars['String']['input']>>;
  sourceType?: InputMaybe<Scalars['String']['input']>;
  sourceTypes?: InputMaybe<Array<Scalars['String']['input']>>;
};


export type QueryLangsmithPromptArgs = {
  promptIdentifier: Scalars['String']['input'];
};


export type QueryLangsmithPromptCommitArgs = {
  includeModel?: InputMaybe<Scalars['Boolean']['input']>;
  promptIdentifier: Scalars['String']['input'];
};


export type QueryLangsmithPromptsArgs = {
  isArchived?: InputMaybe<Scalars['Boolean']['input']>;
  isPublic?: InputMaybe<Scalars['Boolean']['input']>;
  query?: InputMaybe<Scalars['String']['input']>;
};


export type QueryMyPromptUsageArgs = {
  limit?: InputMaybe<Scalars['Int']['input']>;
};


export type QueryOpportunitiesArgs = {
  companyId?: InputMaybe<Scalars['Int']['input']>;
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
  status?: InputMaybe<Scalars['String']['input']>;
};


export type QueryOpportunityArgs = {
  id: Scalars['String']['input'];
};


export type QueryPromptArgs = {
  label?: InputMaybe<Scalars['String']['input']>;
  name: Scalars['String']['input'];
  version?: InputMaybe<Scalars['Int']['input']>;
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


export type QueryResumeStatusArgs = {
  email: Scalars['String']['input'];
};


export type QueryTaskArgs = {
  id: Scalars['Int']['input'];
};


export type QueryTasksArgs = {
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
  priority?: InputMaybe<Scalars['String']['input']>;
  status?: InputMaybe<Scalars['String']['input']>;
};


export type QueryTextToSqlArgs = {
  question: Scalars['String']['input'];
};


export type QueryUserSettingsArgs = {
  userId: Scalars['String']['input'];
};

export type QuestionAnswer = {
  __typename?: 'QuestionAnswer';
  answerText: Scalars['String']['output'];
  questionId: Scalars['String']['output'];
  questionText: Scalars['String']['output'];
};

export type QuestionAnswerInput = {
  answerText: Scalars['String']['input'];
  questionId: Scalars['String']['input'];
  questionText: Scalars['String']['input'];
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

export type RegisteredPrompt = {
  __typename?: 'RegisteredPrompt';
  content: Maybe<Scalars['JSON']['output']>;
  labels: Array<Scalars['String']['output']>;
  lastConfig: Maybe<Scalars['JSON']['output']>;
  lastUpdatedAt: Scalars['String']['output'];
  lastUsedBy: Maybe<Scalars['String']['output']>;
  name: Scalars['String']['output'];
  tags: Array<Scalars['String']['output']>;
  type: Scalars['String']['output'];
  usageCount: Maybe<Scalars['Int']['output']>;
  versions: Array<Scalars['Int']['output']>;
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

export type ResumeAnswer = {
  __typename?: 'ResumeAnswer';
  answer: Scalars['String']['output'];
  context_count: Scalars['Int']['output'];
  trace_id: Maybe<Scalars['String']['output']>;
};

export type ResumeIngestResult = {
  __typename?: 'ResumeIngestResult';
  chunks_stored: Maybe<Scalars['Int']['output']>;
  error: Maybe<Scalars['String']['output']>;
  job_id: Scalars['String']['output'];
  resume_id: Maybe<Scalars['String']['output']>;
  status: Scalars['String']['output'];
  success: Scalars['Boolean']['output'];
};

export type ResumeStatus = {
  __typename?: 'ResumeStatus';
  chunk_count: Maybe<Scalars['Int']['output']>;
  exists: Scalars['Boolean']['output'];
  filename: Maybe<Scalars['String']['output']>;
  ingested_at: Maybe<Scalars['String']['output']>;
  resume_id: Maybe<Scalars['String']['output']>;
};

export type ResumeUploadResult = {
  __typename?: 'ResumeUploadResult';
  job_id: Scalars['String']['output'];
  status: Scalars['String']['output'];
  success: Scalars['Boolean']['output'];
  tier: Scalars['String']['output'];
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
  recipientEmail: Scalars['String']['input'];
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

export type SkillMatch = {
  __typename?: 'SkillMatch';
  details: Array<SkillMatchDetail>;
  jobCoverage: Scalars['Float']['output'];
  matchedCount: Scalars['Int']['output'];
  requiredCoverage: Scalars['Float']['output'];
  score: Scalars['Float']['output'];
  totalPreferred: Scalars['Int']['output'];
  userCoverage: Scalars['Float']['output'];
};

export type SkillMatchDetail = {
  __typename?: 'SkillMatchDetail';
  level: Scalars['String']['output'];
  matched: Scalars['Boolean']['output'];
  tag: Scalars['String']['output'];
};

export type SourceType =
  | 'COMMONCRAWL'
  | 'LIVE_FETCH'
  | 'MANUAL'
  | 'PARTNER';

export type StackMutationResponse = {
  __typename?: 'StackMutationResponse';
  message: Maybe<Scalars['String']['output']>;
  success: Scalars['Boolean']['output'];
};

export type SyncResendResult = {
  __typename?: 'SyncResendResult';
  error: Maybe<Scalars['String']['output']>;
  skippedCount: Scalars['Int']['output'];
  success: Scalars['Boolean']['output'];
  totalCount: Scalars['Int']['output'];
  updatedCount: Scalars['Int']['output'];
};

export type Task = {
  __typename?: 'Task';
  completedAt: Maybe<Scalars['String']['output']>;
  createdAt: Scalars['String']['output'];
  description: Maybe<Scalars['String']['output']>;
  dueDate: Maybe<Scalars['String']['output']>;
  entityId: Maybe<Scalars['String']['output']>;
  entityType: Maybe<Scalars['String']['output']>;
  id: Scalars['Int']['output'];
  priority: Scalars['String']['output'];
  status: Scalars['String']['output'];
  tags: Array<Scalars['String']['output']>;
  title: Scalars['String']['output'];
  updatedAt: Scalars['String']['output'];
};

export type TasksResult = {
  __typename?: 'TasksResult';
  tasks: Array<Task>;
  totalCount: Scalars['Int']['output'];
};

export type TextToSqlResult = {
  __typename?: 'TextToSqlResult';
  columns: Array<Scalars['String']['output']>;
  drilldownSearchQuery: Maybe<Scalars['String']['output']>;
  explanation: Maybe<Scalars['String']['output']>;
  rows: Array<Maybe<Array<Maybe<Scalars['JSON']['output']>>>>;
  sql: Scalars['String']['output'];
};

export type UnverifyContactsResult = {
  __typename?: 'UnverifyContactsResult';
  count: Scalars['Int']['output'];
  success: Scalars['Boolean']['output'];
};

export type UpdateApplicationInput = {
  companyName?: InputMaybe<Scalars['String']['input']>;
  jobDescription?: InputMaybe<Scalars['String']['input']>;
  jobId?: InputMaybe<Scalars['String']['input']>;
  jobTitle?: InputMaybe<Scalars['String']['input']>;
  notes?: InputMaybe<Scalars['String']['input']>;
  status?: InputMaybe<ApplicationStatus>;
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

export type UpdateLangSmithPromptInput = {
  description?: InputMaybe<Scalars['String']['input']>;
  isArchived?: InputMaybe<Scalars['Boolean']['input']>;
  isPublic?: InputMaybe<Scalars['Boolean']['input']>;
  readme?: InputMaybe<Scalars['String']['input']>;
  tags?: InputMaybe<Array<Scalars['String']['input']>>;
};

export type UpdateOpportunityInput = {
  applicationNotes?: InputMaybe<Scalars['String']['input']>;
  applicationStatus?: InputMaybe<Scalars['String']['input']>;
  applied?: InputMaybe<Scalars['Boolean']['input']>;
  appliedAt?: InputMaybe<Scalars['String']['input']>;
  companyId?: InputMaybe<Scalars['Int']['input']>;
  contactId?: InputMaybe<Scalars['Int']['input']>;
  deadline?: InputMaybe<Scalars['String']['input']>;
  endDate?: InputMaybe<Scalars['String']['input']>;
  rewardText?: InputMaybe<Scalars['String']['input']>;
  rewardUsd?: InputMaybe<Scalars['Float']['input']>;
  score?: InputMaybe<Scalars['Int']['input']>;
  source?: InputMaybe<Scalars['String']['input']>;
  startDate?: InputMaybe<Scalars['String']['input']>;
  status?: InputMaybe<Scalars['String']['input']>;
  tags?: InputMaybe<Array<Scalars['String']['input']>>;
  title?: InputMaybe<Scalars['String']['input']>;
  url?: InputMaybe<Scalars['String']['input']>;
};

export type UpdateTaskInput = {
  description?: InputMaybe<Scalars['String']['input']>;
  dueDate?: InputMaybe<Scalars['String']['input']>;
  entityId?: InputMaybe<Scalars['String']['input']>;
  entityType?: InputMaybe<Scalars['String']['input']>;
  priority?: InputMaybe<Scalars['String']['input']>;
  status?: InputMaybe<Scalars['String']['input']>;
  tags?: InputMaybe<Array<Scalars['String']['input']>>;
  title?: InputMaybe<Scalars['String']['input']>;
};

export type UserSettings = {
  __typename?: 'UserSettings';
  created_at: Scalars['String']['output'];
  daily_digest: Scalars['Boolean']['output'];
  dark_mode: Scalars['Boolean']['output'];
  email_notifications: Scalars['Boolean']['output'];
  excluded_companies: Maybe<Array<Scalars['String']['output']>>;
  id: Scalars['Int']['output'];
  jobs_per_page: Scalars['Int']['output'];
  new_job_alerts: Scalars['Boolean']['output'];
  preferred_locations: Maybe<Array<Scalars['String']['output']>>;
  preferred_skills: Maybe<Array<Scalars['String']['output']>>;
  updated_at: Scalars['String']['output'];
  user_id: Scalars['String']['output'];
};

export type UserSettingsInput = {
  daily_digest?: InputMaybe<Scalars['Boolean']['input']>;
  dark_mode?: InputMaybe<Scalars['Boolean']['input']>;
  email_notifications?: InputMaybe<Scalars['Boolean']['input']>;
  excluded_companies?: InputMaybe<Array<Scalars['String']['input']>>;
  jobs_per_page?: InputMaybe<Scalars['Int']['input']>;
  new_job_alerts?: InputMaybe<Scalars['Boolean']['input']>;
  preferred_locations?: InputMaybe<Array<Scalars['String']['input']>>;
  preferred_skills?: InputMaybe<Array<Scalars['String']['input']>>;
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

export type DeleteAllJobsMutationVariables = Exact<{ [key: string]: never; }>;


export type DeleteAllJobsMutation = { __typename?: 'Mutation', deleteAllJobs: { __typename?: 'DeleteJobResponse', success: boolean, message: string | null } };

export type DeleteJobMutationVariables = Exact<{
  id: Scalars['Int']['input'];
}>;


export type DeleteJobMutation = { __typename?: 'Mutation', deleteJob: { __typename?: 'DeleteJobResponse', success: boolean, message: string | null } };

export type DeleteStackEntryMutationVariables = Exact<{
  name: Scalars['String']['input'];
}>;


export type DeleteStackEntryMutation = { __typename?: 'Mutation', deleteStackEntry: { __typename?: 'StackMutationResponse', success: boolean, message: string | null } };

export type ExecuteSqlQueryVariables = Exact<{
  sql: Scalars['String']['input'];
}>;


export type ExecuteSqlQuery = { __typename?: 'Query', executeSql: { __typename?: 'TextToSqlResult', sql: string, explanation: string | null, columns: Array<string>, rows: Array<Array<any | null> | null>, drilldownSearchQuery: string | null } };

export type GetJobQueryVariables = Exact<{
  id: Scalars['String']['input'];
}>;


export type GetJobQuery = { __typename?: 'Query', job: { __typename?: 'Job', id: number, external_id: string, source_id: string | null, source_kind: string, company_id: number | null, company_key: string, title: string, location: string | null, url: string, description: string | null, publishedAt: string, score: number | null, score_reason: string | null, status: JobStatus | null, is_remote_eu: boolean, remote_eu_confidence: ClassificationConfidence | null, remote_eu_reason: string | null, absolute_url: string | null, internal_job_id: string | null, requisition_id: string | null, company_name: string | null, language: string | null, ashby_department: string | null, ashby_team: string | null, ashby_employment_type: string | null, ashby_is_remote: boolean | null, ashby_is_listed: boolean | null, ashby_job_url: string | null, ashby_apply_url: string | null, applied: boolean, appliedAt: string | null, archived: boolean, created_at: string, updated_at: string, company: { __typename?: 'Company', id: number, key: string, name: string, logo_url: string | null, website: string | null, description: string | null, industry: string | null, size: string | null, location: string | null, created_at: string, updated_at: string, linkedin_url: string | null, job_board_url: string | null, category: CompanyCategory, tags: Array<string>, services: Array<string>, service_taxonomy: Array<string>, industries: Array<string>, score: number, score_reasons: Array<string>, deep_analysis: string | null, last_seen_crawl_id: string | null, last_seen_capture_timestamp: string | null, last_seen_source_url: string | null, ashby_enrichment: { __typename?: 'AshbyEnrichment', company_name: string | null, industry_tags: Array<string>, tech_signals: Array<string>, size_signal: string | null, enriched_at: string | null } | null, ats_boards: Array<{ __typename?: 'ATSBoard', id: number, company_id: number, url: string, vendor: AtsVendor, board_type: AtsBoardType, confidence: number, is_active: boolean, first_seen_at: string, last_seen_at: string, created_at: string, updated_at: string, evidence: { __typename?: 'Evidence', source_type: SourceType, source_url: string, crawl_id: string | null, capture_timestamp: string | null, observed_at: string, method: ExtractMethod, extractor_version: string | null, http_status: number | null, mime: string | null, content_hash: string | null, warc: { __typename?: 'WarcPointer', filename: string, offset: number, length: number, digest: string | null } | null } }> } | null, skills: Array<{ __typename?: 'JobSkill', tag: string, level: string, confidence: number | null, evidence: string | null }> | null, skillMatch: { __typename?: 'SkillMatch', score: number, userCoverage: number, jobCoverage: number, requiredCoverage: number, matchedCount: number, totalPreferred: number, details: Array<{ __typename?: 'SkillMatchDetail', tag: string, level: string, matched: boolean }> } | null, metadata: Array<{ __typename?: 'GreenhouseMetadata', id: string, name: string, value: string | null, value_type: string | null }> | null, departments: Array<{ __typename?: 'GreenhouseDepartment', id: string, name: string, child_ids: Array<string> | null, parent_id: string | null }> | null, offices: Array<{ __typename?: 'GreenhouseOffice', id: string, name: string, location: string | null, child_ids: Array<string> | null, parent_id: string | null }> | null, questions: Array<{ __typename?: 'GreenhouseQuestion', description: string | null, label: string, required: boolean, fields: Array<{ __typename?: 'GreenhouseQuestionField', type: string, name: string | null }> | null }> | null, location_questions: Array<{ __typename?: 'GreenhouseQuestion', description: string | null, label: string, required: boolean, fields: Array<{ __typename?: 'GreenhouseQuestionField', type: string, name: string | null }> | null }> | null, compliance: Array<{ __typename?: 'GreenhouseCompliance', type: string, description: string | null, questions: Array<{ __typename?: 'GreenhouseQuestion', description: string | null, label: string, required: boolean, fields: Array<{ __typename?: 'GreenhouseQuestionField', type: string, name: string | null }> | null }> | null }> | null, demographic_questions: { __typename?: 'GreenhouseDemographicQuestions', header: string | null, description: string | null, questions: Array<{ __typename?: 'GreenhouseQuestion', description: string | null, label: string, required: boolean, fields: Array<{ __typename?: 'GreenhouseQuestionField', type: string, name: string | null }> | null }> | null } | null, data_compliance: Array<{ __typename?: 'GreenhouseDataCompliance', type: string, requires_consent: boolean, requires_processing_consent: boolean, requires_retention_consent: boolean, retention_period: number | null, demographic_data_consent_applies: boolean }> | null, ashby_secondary_locations: Array<{ __typename?: 'AshbySecondaryLocation', location: string, address: { __typename?: 'AshbyPostalAddress', addressLocality: string | null, addressRegion: string | null, addressCountry: string | null } | null }> | null, ashby_compensation: { __typename?: 'AshbyCompensation', compensationTierSummary: string | null, scrapeableCompensationSalarySummary: string | null, compensationTiers: Array<{ __typename?: 'AshbyCompensationTier', id: string | null, tierSummary: string | null, title: string | null, additionalInformation: string | null, components: Array<{ __typename?: 'AshbyCompensationComponent', id: string | null, summary: string | null, compensationType: string | null, interval: string | null, currencyCode: string | null, minValue: number | null, maxValue: number | null }> }>, summaryComponents: Array<{ __typename?: 'AshbyCompensationComponent', id: string | null, summary: string | null, compensationType: string | null, interval: string | null, currencyCode: string | null, minValue: number | null, maxValue: number | null }> } | null, ashby_address: { __typename?: 'AshbyAddress', postalAddress: { __typename?: 'AshbyPostalAddress', addressLocality: string | null, addressRegion: string | null, addressCountry: string | null } | null } | null } | null };

export type GetJobsQueryVariables = Exact<{
  sourceType?: InputMaybe<Scalars['String']['input']>;
  sourceTypes?: InputMaybe<Array<Scalars['String']['input']> | Scalars['String']['input']>;
  search?: InputMaybe<Scalars['String']['input']>;
  companyKey?: InputMaybe<Scalars['String']['input']>;
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
  excludedCompanies?: InputMaybe<Array<Scalars['String']['input']> | Scalars['String']['input']>;
  skills?: InputMaybe<Array<Scalars['String']['input']> | Scalars['String']['input']>;
  showAll?: InputMaybe<Scalars['Boolean']['input']>;
}>;


export type GetJobsQuery = { __typename?: 'Query', jobs: { __typename?: 'JobsResponse', totalCount: number, jobs: Array<{ __typename?: 'Job', id: number, external_id: string, source_kind: string, company_key: string, title: string, location: string | null, url: string, publishedAt: string, status: JobStatus | null, is_remote_eu: boolean, remote_eu_confidence: ClassificationConfidence | null, applied: boolean, archived: boolean, skills: Array<{ __typename?: 'JobSkill', tag: string, level: string }> | null }> } };

export type GetUserSettingsQueryVariables = Exact<{
  userId: Scalars['String']['input'];
}>;


export type GetUserSettingsQuery = { __typename?: 'Query', userSettings: { __typename?: 'UserSettings', id: number, preferred_locations: Array<string> | null, preferred_skills: Array<string> | null, excluded_companies: Array<string> | null } | null };

export type ProcessAllJobsMutationVariables = Exact<{
  limit?: InputMaybe<Scalars['Int']['input']>;
}>;


export type ProcessAllJobsMutation = { __typename?: 'Mutation', processAllJobs: { __typename?: 'ProcessAllJobsResponse', success: boolean, message: string | null, enhanced: number | null, enhanceErrors: number | null, processed: number | null, euRemote: number | null, nonEuRemote: number | null, errors: number | null } };

export type ReportJobMutationVariables = Exact<{
  id: Scalars['Int']['input'];
}>;


export type ReportJobMutation = { __typename?: 'Mutation', reportJob: { __typename?: 'Job', id: number, status: JobStatus | null } | null };

export type TextToSqlQueryVariables = Exact<{
  question: Scalars['String']['input'];
}>;


export type TextToSqlQuery = { __typename?: 'Query', textToSql: { __typename?: 'TextToSqlResult', sql: string, explanation: string | null, columns: Array<string>, rows: Array<Array<any | null> | null>, drilldownSearchQuery: string | null } };

export type UpdateUserSettingsMutationVariables = Exact<{
  userId: Scalars['String']['input'];
  settings: UserSettingsInput;
}>;


export type UpdateUserSettingsMutation = { __typename?: 'Mutation', updateUserSettings: { __typename?: 'UserSettings', id: number, user_id: string, email_notifications: boolean, daily_digest: boolean, new_job_alerts: boolean, preferred_locations: Array<string> | null, preferred_skills: Array<string> | null, excluded_companies: Array<string> | null, dark_mode: boolean, jobs_per_page: number, created_at: string, updated_at: string } };

export type ApplicationFieldsFragment = { __typename?: 'Application', id: number, email: string, jobId: string | null, resume: File | null, status: ApplicationStatus, notes: string | null, jobTitle: string | null, companyName: string | null, companyKey: string | null, jobDescription: string | null, aiInterviewQuestions: string | null, aiTechStack: string | null, createdAt: string, questions: Array<{ __typename?: 'QuestionAnswer', questionId: string, questionText: string, answerText: string }> };

export type GetApplicationsQueryVariables = Exact<{ [key: string]: never; }>;


export type GetApplicationsQuery = { __typename?: 'Query', applications: Array<{ __typename?: 'Application', id: number, email: string, jobId: string | null, resume: File | null, status: ApplicationStatus, notes: string | null, jobTitle: string | null, companyName: string | null, companyKey: string | null, jobDescription: string | null, aiInterviewQuestions: string | null, aiTechStack: string | null, createdAt: string, questions: Array<{ __typename?: 'QuestionAnswer', questionId: string, questionText: string, answerText: string }> }> };

export type GetApplicationQueryVariables = Exact<{
  id: Scalars['Int']['input'];
}>;


export type GetApplicationQuery = { __typename?: 'Query', application: { __typename?: 'Application', id: number, email: string, jobId: string | null, resume: File | null, status: ApplicationStatus, notes: string | null, jobTitle: string | null, companyName: string | null, companyKey: string | null, jobDescription: string | null, aiInterviewQuestions: string | null, aiTechStack: string | null, createdAt: string, questions: Array<{ __typename?: 'QuestionAnswer', questionId: string, questionText: string, answerText: string }> } | null };

export type CreateApplicationMutationVariables = Exact<{
  input: ApplicationInput;
}>;


export type CreateApplicationMutation = { __typename?: 'Mutation', createApplication: { __typename?: 'Application', id: number, email: string, jobId: string | null, resume: File | null, status: ApplicationStatus, notes: string | null, jobTitle: string | null, companyName: string | null, companyKey: string | null, jobDescription: string | null, aiInterviewQuestions: string | null, aiTechStack: string | null, createdAt: string, questions: Array<{ __typename?: 'QuestionAnswer', questionId: string, questionText: string, answerText: string }> } };

export type UpdateApplicationMutationVariables = Exact<{
  id: Scalars['Int']['input'];
  input: UpdateApplicationInput;
}>;


export type UpdateApplicationMutation = { __typename?: 'Mutation', updateApplication: { __typename?: 'Application', id: number, jobId: string | null, status: ApplicationStatus, notes: string | null, jobTitle: string | null, companyName: string | null, companyKey: string | null, jobDescription: string | null } };

export type DeleteApplicationMutationVariables = Exact<{
  id: Scalars['Int']['input'];
}>;


export type DeleteApplicationMutation = { __typename?: 'Mutation', deleteApplication: { __typename?: 'DeleteApplicationResponse', success: boolean, message: string | null } };

export type GetBlockedCompaniesQueryVariables = Exact<{ [key: string]: never; }>;


export type GetBlockedCompaniesQuery = { __typename?: 'Query', blockedCompanies: Array<{ __typename?: 'BlockedCompany', id: number, name: string, reason: string | null, createdAt: string }> };

export type BlockCompanyMutationVariables = Exact<{
  name: Scalars['String']['input'];
  reason?: InputMaybe<Scalars['String']['input']>;
}>;


export type BlockCompanyMutation = { __typename?: 'Mutation', blockCompany: { __typename?: 'BlockedCompany', id: number, name: string, reason: string | null, createdAt: string } };

export type UnblockCompanyMutationVariables = Exact<{
  id: Scalars['Int']['input'];
}>;


export type UnblockCompanyMutation = { __typename?: 'Mutation', unblockCompany: { __typename?: 'DeleteBlockedCompanyResult', success: boolean, message: string | null } };

export type AllCompanyTagsQueryVariables = Exact<{ [key: string]: never; }>;


export type AllCompanyTagsQuery = { __typename?: 'Query', allCompanyTags: Array<string> };

export type FindCompanyQueryVariables = Exact<{
  name?: InputMaybe<Scalars['String']['input']>;
  website?: InputMaybe<Scalars['String']['input']>;
}>;


export type FindCompanyQuery = { __typename?: 'Query', findCompany: { __typename?: 'FindCompanyResult', found: boolean, company: { __typename?: 'Company', id: number, key: string, name: string, website: string | null, email: string | null, location: string | null } | null } };

export type EvidenceFieldsFragment = { __typename?: 'Evidence', source_type: SourceType, source_url: string, crawl_id: string | null, capture_timestamp: string | null, observed_at: string, method: ExtractMethod, extractor_version: string | null, http_status: number | null, mime: string | null, content_hash: string | null, warc: { __typename?: 'WarcPointer', filename: string, offset: number, length: number, digest: string | null } | null };

export type AtsBoardFieldsFragment = { __typename?: 'ATSBoard', id: number, company_id: number, url: string, vendor: AtsVendor, board_type: AtsBoardType, confidence: number, is_active: boolean, first_seen_at: string, last_seen_at: string, created_at: string, updated_at: string, evidence: { __typename?: 'Evidence', source_type: SourceType, source_url: string, crawl_id: string | null, capture_timestamp: string | null, observed_at: string, method: ExtractMethod, extractor_version: string | null, http_status: number | null, mime: string | null, content_hash: string | null, warc: { __typename?: 'WarcPointer', filename: string, offset: number, length: number, digest: string | null } | null } };

export type CompanyFactFieldsFragment = { __typename?: 'CompanyFact', id: number, company_id: number, field: string, value_json: any | null, value_text: string | null, normalized_value: any | null, confidence: number, created_at: string, evidence: { __typename?: 'Evidence', source_type: SourceType, source_url: string, crawl_id: string | null, capture_timestamp: string | null, observed_at: string, method: ExtractMethod, extractor_version: string | null, http_status: number | null, mime: string | null, content_hash: string | null, warc: { __typename?: 'WarcPointer', filename: string, offset: number, length: number, digest: string | null } | null } };

export type CompanySnapshotFieldsFragment = { __typename?: 'CompanySnapshot', id: number, company_id: number, source_url: string, crawl_id: string | null, capture_timestamp: string | null, fetched_at: string, http_status: number | null, mime: string | null, content_hash: string | null, text_sample: string | null, jsonld: any | null, extracted: any | null, created_at: string, evidence: { __typename?: 'Evidence', source_type: SourceType, source_url: string, crawl_id: string | null, capture_timestamp: string | null, observed_at: string, method: ExtractMethod, extractor_version: string | null, http_status: number | null, mime: string | null, content_hash: string | null, warc: { __typename?: 'WarcPointer', filename: string, offset: number, length: number, digest: string | null } | null } };

export type CompanyFieldsFragment = { __typename?: 'Company', id: number, key: string, name: string, logo_url: string | null, website: string | null, description: string | null, industry: string | null, size: string | null, location: string | null, created_at: string, updated_at: string, linkedin_url: string | null, job_board_url: string | null, category: CompanyCategory, tags: Array<string>, services: Array<string>, service_taxonomy: Array<string>, industries: Array<string>, score: number, score_reasons: Array<string>, deep_analysis: string | null, last_seen_crawl_id: string | null, last_seen_capture_timestamp: string | null, last_seen_source_url: string | null, ashby_enrichment: { __typename?: 'AshbyEnrichment', company_name: string | null, industry_tags: Array<string>, tech_signals: Array<string>, size_signal: string | null, enriched_at: string | null } | null, ats_boards: Array<{ __typename?: 'ATSBoard', id: number, company_id: number, url: string, vendor: AtsVendor, board_type: AtsBoardType, confidence: number, is_active: boolean, first_seen_at: string, last_seen_at: string, created_at: string, updated_at: string, evidence: { __typename?: 'Evidence', source_type: SourceType, source_url: string, crawl_id: string | null, capture_timestamp: string | null, observed_at: string, method: ExtractMethod, extractor_version: string | null, http_status: number | null, mime: string | null, content_hash: string | null, warc: { __typename?: 'WarcPointer', filename: string, offset: number, length: number, digest: string | null } | null } }> };

export type CreateCompanyMutationVariables = Exact<{
  input: CreateCompanyInput;
}>;


export type CreateCompanyMutation = { __typename?: 'Mutation', createCompany: { __typename?: 'Company', id: number, key: string, name: string, logo_url: string | null, website: string | null, description: string | null, industry: string | null, size: string | null, location: string | null, created_at: string, updated_at: string, linkedin_url: string | null, job_board_url: string | null, category: CompanyCategory, tags: Array<string>, services: Array<string>, service_taxonomy: Array<string>, industries: Array<string>, score: number, score_reasons: Array<string>, deep_analysis: string | null, last_seen_crawl_id: string | null, last_seen_capture_timestamp: string | null, last_seen_source_url: string | null, ashby_enrichment: { __typename?: 'AshbyEnrichment', company_name: string | null, industry_tags: Array<string>, tech_signals: Array<string>, size_signal: string | null, enriched_at: string | null } | null, ats_boards: Array<{ __typename?: 'ATSBoard', id: number, company_id: number, url: string, vendor: AtsVendor, board_type: AtsBoardType, confidence: number, is_active: boolean, first_seen_at: string, last_seen_at: string, created_at: string, updated_at: string, evidence: { __typename?: 'Evidence', source_type: SourceType, source_url: string, crawl_id: string | null, capture_timestamp: string | null, observed_at: string, method: ExtractMethod, extractor_version: string | null, http_status: number | null, mime: string | null, content_hash: string | null, warc: { __typename?: 'WarcPointer', filename: string, offset: number, length: number, digest: string | null } | null } }> } };

export type UpdateCompanyMutationVariables = Exact<{
  id: Scalars['Int']['input'];
  input: UpdateCompanyInput;
}>;


export type UpdateCompanyMutation = { __typename?: 'Mutation', updateCompany: { __typename?: 'Company', id: number, key: string, name: string, logo_url: string | null, website: string | null, description: string | null, industry: string | null, size: string | null, location: string | null, created_at: string, updated_at: string, linkedin_url: string | null, job_board_url: string | null, category: CompanyCategory, tags: Array<string>, services: Array<string>, service_taxonomy: Array<string>, industries: Array<string>, score: number, score_reasons: Array<string>, deep_analysis: string | null, last_seen_crawl_id: string | null, last_seen_capture_timestamp: string | null, last_seen_source_url: string | null, ashby_enrichment: { __typename?: 'AshbyEnrichment', company_name: string | null, industry_tags: Array<string>, tech_signals: Array<string>, size_signal: string | null, enriched_at: string | null } | null, ats_boards: Array<{ __typename?: 'ATSBoard', id: number, company_id: number, url: string, vendor: AtsVendor, board_type: AtsBoardType, confidence: number, is_active: boolean, first_seen_at: string, last_seen_at: string, created_at: string, updated_at: string, evidence: { __typename?: 'Evidence', source_type: SourceType, source_url: string, crawl_id: string | null, capture_timestamp: string | null, observed_at: string, method: ExtractMethod, extractor_version: string | null, http_status: number | null, mime: string | null, content_hash: string | null, warc: { __typename?: 'WarcPointer', filename: string, offset: number, length: number, digest: string | null } | null } }> } };

export type DeleteCompanyMutationVariables = Exact<{
  id: Scalars['Int']['input'];
}>;


export type DeleteCompanyMutation = { __typename?: 'Mutation', deleteCompany: { __typename?: 'DeleteCompanyResponse', success: boolean, message: string | null } };

export type AddCompanyFactsMutationVariables = Exact<{
  company_id: Scalars['Int']['input'];
  facts: Array<CompanyFactInput> | CompanyFactInput;
}>;


export type AddCompanyFactsMutation = { __typename?: 'Mutation', add_company_facts: Array<{ __typename?: 'CompanyFact', id: number, company_id: number, field: string, value_json: any | null, value_text: string | null, normalized_value: any | null, confidence: number, created_at: string, evidence: { __typename?: 'Evidence', source_type: SourceType, source_url: string, crawl_id: string | null, capture_timestamp: string | null, observed_at: string, method: ExtractMethod, extractor_version: string | null, http_status: number | null, mime: string | null, content_hash: string | null, warc: { __typename?: 'WarcPointer', filename: string, offset: number, length: number, digest: string | null } | null } }> };

export type UpsertCompanyAtsBoardsMutationVariables = Exact<{
  company_id: Scalars['Int']['input'];
  boards: Array<AtsBoardUpsertInput> | AtsBoardUpsertInput;
}>;


export type UpsertCompanyAtsBoardsMutation = { __typename?: 'Mutation', upsert_company_ats_boards: Array<{ __typename?: 'ATSBoard', id: number, company_id: number, url: string, vendor: AtsVendor, board_type: AtsBoardType, confidence: number, is_active: boolean, first_seen_at: string, last_seen_at: string, created_at: string, updated_at: string, evidence: { __typename?: 'Evidence', source_type: SourceType, source_url: string, crawl_id: string | null, capture_timestamp: string | null, observed_at: string, method: ExtractMethod, extractor_version: string | null, http_status: number | null, mime: string | null, content_hash: string | null, warc: { __typename?: 'WarcPointer', filename: string, offset: number, length: number, digest: string | null } | null } }> };

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

export type BlockJobsByCompanyMutationVariables = Exact<{
  companyName: Scalars['String']['input'];
}>;


export type BlockJobsByCompanyMutation = { __typename?: 'Mutation', blockJobsByCompany: { __typename?: 'BlockJobsResult', success: boolean, message: string } };

export type ImportCompaniesMutationVariables = Exact<{
  companies: Array<CompanyImportInput> | CompanyImportInput;
}>;


export type ImportCompaniesMutation = { __typename?: 'Mutation', importCompanies: { __typename?: 'ImportCompaniesResult', success: boolean, imported: number, failed: number, errors: Array<string> } };

export type GetCompanyQueryVariables = Exact<{
  id?: InputMaybe<Scalars['Int']['input']>;
  key?: InputMaybe<Scalars['String']['input']>;
}>;


export type GetCompanyQuery = { __typename?: 'Query', company: { __typename?: 'Company', id: number, key: string, name: string, logo_url: string | null, website: string | null, description: string | null, industry: string | null, size: string | null, location: string | null, created_at: string, updated_at: string, linkedin_url: string | null, job_board_url: string | null, category: CompanyCategory, tags: Array<string>, services: Array<string>, service_taxonomy: Array<string>, industries: Array<string>, score: number, score_reasons: Array<string>, deep_analysis: string | null, last_seen_crawl_id: string | null, last_seen_capture_timestamp: string | null, last_seen_source_url: string | null, ashby_enrichment: { __typename?: 'AshbyEnrichment', company_name: string | null, industry_tags: Array<string>, tech_signals: Array<string>, size_signal: string | null, enriched_at: string | null } | null, ats_boards: Array<{ __typename?: 'ATSBoard', id: number, company_id: number, url: string, vendor: AtsVendor, board_type: AtsBoardType, confidence: number, is_active: boolean, first_seen_at: string, last_seen_at: string, created_at: string, updated_at: string, evidence: { __typename?: 'Evidence', source_type: SourceType, source_url: string, crawl_id: string | null, capture_timestamp: string | null, observed_at: string, method: ExtractMethod, extractor_version: string | null, http_status: number | null, mime: string | null, content_hash: string | null, warc: { __typename?: 'WarcPointer', filename: string, offset: number, length: number, digest: string | null } | null } }> } | null };

export type GetCompaniesQueryVariables = Exact<{
  text?: InputMaybe<Scalars['String']['input']>;
  order_by?: InputMaybe<CompanyOrderBy>;
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
}>;


export type GetCompaniesQuery = { __typename?: 'Query', companies: { __typename?: 'CompaniesResponse', totalCount: number, companies: Array<{ __typename?: 'Company', id: number, key: string, name: string, logo_url: string | null, website: string | null, description: string | null, industry: string | null, size: string | null, location: string | null, created_at: string, updated_at: string, linkedin_url: string | null, job_board_url: string | null, category: CompanyCategory, tags: Array<string>, services: Array<string>, service_taxonomy: Array<string>, industries: Array<string>, score: number, score_reasons: Array<string>, deep_analysis: string | null, last_seen_crawl_id: string | null, last_seen_capture_timestamp: string | null, last_seen_source_url: string | null, ashby_enrichment: { __typename?: 'AshbyEnrichment', company_name: string | null, industry_tags: Array<string>, tech_signals: Array<string>, size_signal: string | null, enriched_at: string | null } | null, ats_boards: Array<{ __typename?: 'ATSBoard', id: number, company_id: number, url: string, vendor: AtsVendor, board_type: AtsBoardType, confidence: number, is_active: boolean, first_seen_at: string, last_seen_at: string, created_at: string, updated_at: string, evidence: { __typename?: 'Evidence', source_type: SourceType, source_url: string, crawl_id: string | null, capture_timestamp: string | null, observed_at: string, method: ExtractMethod, extractor_version: string | null, http_status: number | null, mime: string | null, content_hash: string | null, warc: { __typename?: 'WarcPointer', filename: string, offset: number, length: number, digest: string | null } | null } }> }> } };

export type SearchCompaniesQueryVariables = Exact<{
  filter: CompanyFilterInput;
  order_by?: InputMaybe<CompanyOrderBy>;
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
}>;


export type SearchCompaniesQuery = { __typename?: 'Query', companies: { __typename?: 'CompaniesResponse', totalCount: number, companies: Array<{ __typename?: 'Company', id: number, key: string, name: string, logo_url: string | null, website: string | null, description: string | null, industry: string | null, size: string | null, location: string | null, created_at: string, updated_at: string, linkedin_url: string | null, job_board_url: string | null, category: CompanyCategory, tags: Array<string>, services: Array<string>, service_taxonomy: Array<string>, industries: Array<string>, score: number, score_reasons: Array<string>, deep_analysis: string | null, last_seen_crawl_id: string | null, last_seen_capture_timestamp: string | null, last_seen_source_url: string | null, ashby_enrichment: { __typename?: 'AshbyEnrichment', company_name: string | null, industry_tags: Array<string>, tech_signals: Array<string>, size_signal: string | null, enriched_at: string | null } | null, ats_boards: Array<{ __typename?: 'ATSBoard', id: number, company_id: number, url: string, vendor: AtsVendor, board_type: AtsBoardType, confidence: number, is_active: boolean, first_seen_at: string, last_seen_at: string, created_at: string, updated_at: string, evidence: { __typename?: 'Evidence', source_type: SourceType, source_url: string, crawl_id: string | null, capture_timestamp: string | null, observed_at: string, method: ExtractMethod, extractor_version: string | null, http_status: number | null, mime: string | null, content_hash: string | null, warc: { __typename?: 'WarcPointer', filename: string, offset: number, length: number, digest: string | null } | null } }> }> } };

export type GetCompanyFactsQueryVariables = Exact<{
  company_id: Scalars['Int']['input'];
  field?: InputMaybe<Scalars['String']['input']>;
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
}>;


export type GetCompanyFactsQuery = { __typename?: 'Query', company_facts: Array<{ __typename?: 'CompanyFact', id: number, company_id: number, field: string, value_json: any | null, value_text: string | null, normalized_value: any | null, confidence: number, created_at: string, evidence: { __typename?: 'Evidence', source_type: SourceType, source_url: string, crawl_id: string | null, capture_timestamp: string | null, observed_at: string, method: ExtractMethod, extractor_version: string | null, http_status: number | null, mime: string | null, content_hash: string | null, warc: { __typename?: 'WarcPointer', filename: string, offset: number, length: number, digest: string | null } | null } }> };

export type GetCompanyAtsBoardsQueryVariables = Exact<{
  company_id: Scalars['Int']['input'];
}>;


export type GetCompanyAtsBoardsQuery = { __typename?: 'Query', company_ats_boards: Array<{ __typename?: 'ATSBoard', id: number, company_id: number, url: string, vendor: AtsVendor, board_type: AtsBoardType, confidence: number, is_active: boolean, first_seen_at: string, last_seen_at: string, created_at: string, updated_at: string, evidence: { __typename?: 'Evidence', source_type: SourceType, source_url: string, crawl_id: string | null, capture_timestamp: string | null, observed_at: string, method: ExtractMethod, extractor_version: string | null, http_status: number | null, mime: string | null, content_hash: string | null, warc: { __typename?: 'WarcPointer', filename: string, offset: number, length: number, digest: string | null } | null } }> };

export type CompanyAuditQueryVariables = Exact<{
  key: Scalars['String']['input'];
}>;


export type CompanyAuditQuery = { __typename?: 'Query', company: { __typename?: 'Company', facts_count: number, snapshots_count: number, id: number, key: string, name: string, logo_url: string | null, website: string | null, description: string | null, industry: string | null, size: string | null, location: string | null, created_at: string, updated_at: string, linkedin_url: string | null, job_board_url: string | null, category: CompanyCategory, tags: Array<string>, services: Array<string>, service_taxonomy: Array<string>, industries: Array<string>, score: number, score_reasons: Array<string>, deep_analysis: string | null, last_seen_crawl_id: string | null, last_seen_capture_timestamp: string | null, last_seen_source_url: string | null, facts: Array<{ __typename?: 'CompanyFact', id: number, company_id: number, field: string, value_json: any | null, value_text: string | null, normalized_value: any | null, confidence: number, created_at: string, evidence: { __typename?: 'Evidence', source_type: SourceType, source_url: string, crawl_id: string | null, capture_timestamp: string | null, observed_at: string, method: ExtractMethod, extractor_version: string | null, http_status: number | null, mime: string | null, content_hash: string | null, warc: { __typename?: 'WarcPointer', filename: string, offset: number, length: number, digest: string | null } | null } }>, snapshots: Array<{ __typename?: 'CompanySnapshot', id: number, company_id: number, source_url: string, crawl_id: string | null, capture_timestamp: string | null, fetched_at: string, http_status: number | null, mime: string | null, content_hash: string | null, text_sample: string | null, jsonld: any | null, extracted: any | null, created_at: string, evidence: { __typename?: 'Evidence', source_type: SourceType, source_url: string, crawl_id: string | null, capture_timestamp: string | null, observed_at: string, method: ExtractMethod, extractor_version: string | null, http_status: number | null, mime: string | null, content_hash: string | null, warc: { __typename?: 'WarcPointer', filename: string, offset: number, length: number, digest: string | null } | null } }>, ashby_enrichment: { __typename?: 'AshbyEnrichment', company_name: string | null, industry_tags: Array<string>, tech_signals: Array<string>, size_signal: string | null, enriched_at: string | null } | null, ats_boards: Array<{ __typename?: 'ATSBoard', id: number, company_id: number, url: string, vendor: AtsVendor, board_type: AtsBoardType, confidence: number, is_active: boolean, first_seen_at: string, last_seen_at: string, created_at: string, updated_at: string, evidence: { __typename?: 'Evidence', source_type: SourceType, source_url: string, crawl_id: string | null, capture_timestamp: string | null, observed_at: string, method: ExtractMethod, extractor_version: string | null, http_status: number | null, mime: string | null, content_hash: string | null, warc: { __typename?: 'WarcPointer', filename: string, offset: number, length: number, digest: string | null } | null } }> } | null };

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

export type GetGreenhouseJobsQueryVariables = Exact<{
  search?: InputMaybe<Scalars['String']['input']>;
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
}>;


export type GetGreenhouseJobsQuery = { __typename?: 'Query', jobs: { __typename?: 'JobsResponse', totalCount: number, jobs: Array<{ __typename?: 'Job', id: number, external_id: string, source_id: string | null, source_kind: string, company_id: number | null, company_key: string, title: string, location: string | null, url: string, description: string | null, publishedAt: string, score: number | null, score_reason: string | null, is_remote_eu: boolean, remote_eu_confidence: ClassificationConfidence | null, remote_eu_reason: string | null, created_at: string, updated_at: string, company: { __typename?: 'Company', id: number, key: string, name: string, logo_url: string | null, website: string | null, description: string | null, industry: string | null, size: string | null, location: string | null, created_at: string, updated_at: string, linkedin_url: string | null, job_board_url: string | null, category: CompanyCategory, tags: Array<string>, services: Array<string>, service_taxonomy: Array<string>, industries: Array<string>, score: number, score_reasons: Array<string>, deep_analysis: string | null, last_seen_crawl_id: string | null, last_seen_capture_timestamp: string | null, last_seen_source_url: string | null, ashby_enrichment: { __typename?: 'AshbyEnrichment', company_name: string | null, industry_tags: Array<string>, tech_signals: Array<string>, size_signal: string | null, enriched_at: string | null } | null, ats_boards: Array<{ __typename?: 'ATSBoard', id: number, company_id: number, url: string, vendor: AtsVendor, board_type: AtsBoardType, confidence: number, is_active: boolean, first_seen_at: string, last_seen_at: string, created_at: string, updated_at: string, evidence: { __typename?: 'Evidence', source_type: SourceType, source_url: string, crawl_id: string | null, capture_timestamp: string | null, observed_at: string, method: ExtractMethod, extractor_version: string | null, http_status: number | null, mime: string | null, content_hash: string | null, warc: { __typename?: 'WarcPointer', filename: string, offset: number, length: number, digest: string | null } | null } }> } | null, skills: Array<{ __typename?: 'JobSkill', tag: string, level: string, confidence: number | null, evidence: string | null }> | null }> } };

export type GetGreenhouseJobByIdQueryVariables = Exact<{
  id: Scalars['String']['input'];
}>;


export type GetGreenhouseJobByIdQuery = { __typename?: 'Query', job: { __typename?: 'Job', id: number, external_id: string, source_id: string | null, source_kind: string, company_id: number | null, company_key: string, title: string, location: string | null, url: string, description: string | null, publishedAt: string, score: number | null, score_reason: string | null, is_remote_eu: boolean, remote_eu_confidence: ClassificationConfidence | null, remote_eu_reason: string | null, created_at: string, updated_at: string, company: { __typename?: 'Company', id: number, key: string, name: string, logo_url: string | null, website: string | null, description: string | null, industry: string | null, size: string | null, location: string | null, created_at: string, updated_at: string, linkedin_url: string | null, job_board_url: string | null, category: CompanyCategory, tags: Array<string>, services: Array<string>, service_taxonomy: Array<string>, industries: Array<string>, score: number, score_reasons: Array<string>, deep_analysis: string | null, last_seen_crawl_id: string | null, last_seen_capture_timestamp: string | null, last_seen_source_url: string | null, ashby_enrichment: { __typename?: 'AshbyEnrichment', company_name: string | null, industry_tags: Array<string>, tech_signals: Array<string>, size_signal: string | null, enriched_at: string | null } | null, ats_boards: Array<{ __typename?: 'ATSBoard', id: number, company_id: number, url: string, vendor: AtsVendor, board_type: AtsBoardType, confidence: number, is_active: boolean, first_seen_at: string, last_seen_at: string, created_at: string, updated_at: string, evidence: { __typename?: 'Evidence', source_type: SourceType, source_url: string, crawl_id: string | null, capture_timestamp: string | null, observed_at: string, method: ExtractMethod, extractor_version: string | null, http_status: number | null, mime: string | null, content_hash: string | null, warc: { __typename?: 'WarcPointer', filename: string, offset: number, length: number, digest: string | null } | null } }> } | null, skills: Array<{ __typename?: 'JobSkill', tag: string, level: string, confidence: number | null, evidence: string | null }> | null } | null };

export type EnhanceJobFromAtsMutationVariables = Exact<{
  jobId: Scalars['String']['input'];
  company: Scalars['String']['input'];
  source: Scalars['String']['input'];
}>;


export type EnhanceJobFromAtsMutation = { __typename?: 'Mutation', enhanceJobFromATS: { __typename?: 'EnhanceJobResponse', success: boolean, message: string | null, job: { __typename?: 'Job', id: number, external_id: string, source_id: string | null, source_kind: string, company_id: number | null, company_key: string, title: string, location: string | null, url: string, description: string | null, publishedAt: string, score: number | null, score_reason: string | null, is_remote_eu: boolean, remote_eu_confidence: ClassificationConfidence | null, remote_eu_reason: string | null, absolute_url: string | null, internal_job_id: string | null, requisition_id: string | null, company_name: string | null, language: string | null, created_at: string, updated_at: string, company: { __typename?: 'Company', id: number, key: string, name: string, logo_url: string | null, website: string | null, description: string | null, industry: string | null, size: string | null, location: string | null, created_at: string, updated_at: string, linkedin_url: string | null, job_board_url: string | null, category: CompanyCategory, tags: Array<string>, services: Array<string>, service_taxonomy: Array<string>, industries: Array<string>, score: number, score_reasons: Array<string>, deep_analysis: string | null, last_seen_crawl_id: string | null, last_seen_capture_timestamp: string | null, last_seen_source_url: string | null, ashby_enrichment: { __typename?: 'AshbyEnrichment', company_name: string | null, industry_tags: Array<string>, tech_signals: Array<string>, size_signal: string | null, enriched_at: string | null } | null, ats_boards: Array<{ __typename?: 'ATSBoard', id: number, company_id: number, url: string, vendor: AtsVendor, board_type: AtsBoardType, confidence: number, is_active: boolean, first_seen_at: string, last_seen_at: string, created_at: string, updated_at: string, evidence: { __typename?: 'Evidence', source_type: SourceType, source_url: string, crawl_id: string | null, capture_timestamp: string | null, observed_at: string, method: ExtractMethod, extractor_version: string | null, http_status: number | null, mime: string | null, content_hash: string | null, warc: { __typename?: 'WarcPointer', filename: string, offset: number, length: number, digest: string | null } | null } }> } | null, skills: Array<{ __typename?: 'JobSkill', tag: string, level: string, confidence: number | null, evidence: string | null }> | null, metadata: Array<{ __typename?: 'GreenhouseMetadata', id: string, name: string, value: string | null, value_type: string | null }> | null, departments: Array<{ __typename?: 'GreenhouseDepartment', id: string, name: string, child_ids: Array<string> | null, parent_id: string | null }> | null, offices: Array<{ __typename?: 'GreenhouseOffice', id: string, name: string, location: string | null, child_ids: Array<string> | null, parent_id: string | null }> | null, questions: Array<{ __typename?: 'GreenhouseQuestion', description: string | null, label: string, required: boolean, fields: Array<{ __typename?: 'GreenhouseQuestionField', type: string, name: string | null }> | null }> | null, location_questions: Array<{ __typename?: 'GreenhouseQuestion', description: string | null, label: string, required: boolean, fields: Array<{ __typename?: 'GreenhouseQuestionField', type: string, name: string | null }> | null }> | null, compliance: Array<{ __typename?: 'GreenhouseCompliance', type: string, description: string | null, questions: Array<{ __typename?: 'GreenhouseQuestion', description: string | null, label: string, required: boolean, fields: Array<{ __typename?: 'GreenhouseQuestionField', type: string, name: string | null }> | null }> | null }> | null, demographic_questions: { __typename?: 'GreenhouseDemographicQuestions', header: string | null, description: string | null, questions: Array<{ __typename?: 'GreenhouseQuestion', description: string | null, label: string, required: boolean, fields: Array<{ __typename?: 'GreenhouseQuestionField', type: string, name: string | null }> | null }> | null } | null, data_compliance: Array<{ __typename?: 'GreenhouseDataCompliance', type: string, requires_consent: boolean, requires_processing_consent: boolean, requires_retention_consent: boolean, retention_period: number | null, demographic_data_consent_applies: boolean }> | null } | null } };

export type MarkJobAppliedMutationVariables = Exact<{
  id: Scalars['Int']['input'];
}>;


export type MarkJobAppliedMutation = { __typename?: 'Mutation', markJobApplied: { __typename?: 'Job', id: number, applied: boolean, appliedAt: string | null } };

export type ArchiveJobMutationVariables = Exact<{
  id: Scalars['Int']['input'];
}>;


export type ArchiveJobMutation = { __typename?: 'Mutation', archiveJob: { __typename?: 'Job', id: number, archived: boolean } };

export type UnarchiveJobMutationVariables = Exact<{
  id: Scalars['Int']['input'];
}>;


export type UnarchiveJobMutation = { __typename?: 'Mutation', unarchiveJob: { __typename?: 'Job', id: number, archived: boolean } };

export type GetLangSmithPromptsQueryVariables = Exact<{
  isPublic?: InputMaybe<Scalars['Boolean']['input']>;
  isArchived?: InputMaybe<Scalars['Boolean']['input']>;
  query?: InputMaybe<Scalars['String']['input']>;
}>;


export type GetLangSmithPromptsQuery = { __typename?: 'Query', langsmithPrompts: Array<{ __typename?: 'LangSmithPrompt', id: string, promptHandle: string, fullName: string, description: string | null, readme: string | null, tenantId: string, createdAt: string, updatedAt: string, isPublic: boolean, isArchived: boolean, tags: Array<string>, owner: string | null, numLikes: number, numDownloads: number, numViews: number, numCommits: number, lastCommitHash: string | null, likedByAuthUser: boolean }> };

export type GetLangSmithPromptQueryVariables = Exact<{
  promptIdentifier: Scalars['String']['input'];
}>;


export type GetLangSmithPromptQuery = { __typename?: 'Query', langsmithPrompt: { __typename?: 'LangSmithPrompt', id: string, promptHandle: string, fullName: string, description: string | null, readme: string | null, tenantId: string, createdAt: string, updatedAt: string, isPublic: boolean, isArchived: boolean, tags: Array<string>, owner: string | null, numLikes: number, numDownloads: number, numViews: number, numCommits: number, lastCommitHash: string | null, likedByAuthUser: boolean } | null };

export type GetLangSmithPromptCommitQueryVariables = Exact<{
  promptIdentifier: Scalars['String']['input'];
  includeModel?: InputMaybe<Scalars['Boolean']['input']>;
}>;


export type GetLangSmithPromptCommitQuery = { __typename?: 'Query', langsmithPromptCommit: { __typename?: 'LangSmithPromptCommit', owner: string, promptName: string, commitHash: string, manifest: any, examples: Array<any> } | null };

export type CreateLangSmithPromptMutationVariables = Exact<{
  promptIdentifier: Scalars['String']['input'];
  input?: InputMaybe<CreateLangSmithPromptInput>;
}>;


export type CreateLangSmithPromptMutation = { __typename?: 'Mutation', createLangSmithPrompt: { __typename?: 'LangSmithPrompt', id: string, promptHandle: string, fullName: string, description: string | null, readme: string | null, tenantId: string, createdAt: string, updatedAt: string, isPublic: boolean, isArchived: boolean, tags: Array<string>, owner: string | null, numLikes: number, numDownloads: number, numViews: number, numCommits: number, lastCommitHash: string | null, likedByAuthUser: boolean } };

export type UpdateLangSmithPromptMutationVariables = Exact<{
  promptIdentifier: Scalars['String']['input'];
  input: UpdateLangSmithPromptInput;
}>;


export type UpdateLangSmithPromptMutation = { __typename?: 'Mutation', updateLangSmithPrompt: { __typename?: 'LangSmithPrompt', id: string, promptHandle: string, fullName: string, description: string | null, readme: string | null, tenantId: string, createdAt: string, updatedAt: string, isPublic: boolean, isArchived: boolean, tags: Array<string>, owner: string | null, numLikes: number, numDownloads: number, numViews: number, numCommits: number, lastCommitHash: string | null, likedByAuthUser: boolean } };

export type DeleteLangSmithPromptMutationVariables = Exact<{
  promptIdentifier: Scalars['String']['input'];
}>;


export type DeleteLangSmithPromptMutation = { __typename?: 'Mutation', deleteLangSmithPrompt: boolean };

export type PushLangSmithPromptMutationVariables = Exact<{
  promptIdentifier: Scalars['String']['input'];
  input?: InputMaybe<PushLangSmithPromptInput>;
}>;


export type PushLangSmithPromptMutation = { __typename?: 'Mutation', pushLangSmithPrompt: string };

export type GetOpportunitiesQueryVariables = Exact<{
  companyId?: InputMaybe<Scalars['Int']['input']>;
  status?: InputMaybe<Scalars['String']['input']>;
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
}>;


export type GetOpportunitiesQuery = { __typename?: 'Query', opportunities: { __typename?: 'OpportunitiesResult', totalCount: number, opportunities: Array<{ __typename?: 'Opportunity', id: string, title: string, url: string | null, source: string | null, status: string, rewardUsd: number | null, rewardText: string | null, deadline: string | null, tags: Array<string>, score: number | null, applied: boolean, appliedAt: string | null, applicationStatus: string | null, companyId: number | null, createdAt: string, updatedAt: string, company: { __typename?: 'Company', id: number, name: string, website: string | null } | null }> } };

export type GetOpportunityQueryVariables = Exact<{
  id: Scalars['String']['input'];
}>;


export type GetOpportunityQuery = { __typename?: 'Query', opportunity: { __typename?: 'Opportunity', id: string, title: string, url: string | null, source: string | null, status: string, rewardUsd: number | null, rewardText: string | null, startDate: string | null, endDate: string | null, deadline: string | null, firstSeen: string | null, lastSeen: string | null, score: number | null, rawContext: string | null, metadata: any | null, applied: boolean, appliedAt: string | null, applicationStatus: string | null, applicationNotes: string | null, tags: Array<string>, companyId: number | null, contactId: number | null, createdAt: string, updatedAt: string, company: { __typename?: 'Company', id: number, name: string, website: string | null } | null } | null };

export type CreateOpportunityMutationVariables = Exact<{
  input: CreateOpportunityInput;
}>;


export type CreateOpportunityMutation = { __typename?: 'Mutation', createOpportunity: { __typename?: 'Opportunity', id: string, title: string, url: string | null, source: string | null, status: string, companyId: number | null, createdAt: string } };

export type UpdateOpportunityMutationVariables = Exact<{
  id: Scalars['String']['input'];
  input: UpdateOpportunityInput;
}>;


export type UpdateOpportunityMutation = { __typename?: 'Mutation', updateOpportunity: { __typename?: 'Opportunity', id: string, title: string, status: string, applied: boolean, appliedAt: string | null, applicationStatus: string | null, applicationNotes: string | null, updatedAt: string } };

export type DeleteOpportunityMutationVariables = Exact<{
  id: Scalars['String']['input'];
}>;


export type DeleteOpportunityMutation = { __typename?: 'Mutation', deleteOpportunity: { __typename?: 'DeleteOpportunityResult', success: boolean, message: string | null } };

export type GetPromptsQueryVariables = Exact<{ [key: string]: never; }>;


export type GetPromptsQuery = { __typename?: 'Query', prompts: Array<{ __typename?: 'RegisteredPrompt', name: string, type: string, content: any | null, tags: Array<string>, labels: Array<string>, versions: Array<number>, lastUpdatedAt: string, lastConfig: any | null, usageCount: number | null, lastUsedBy: string | null }> };

export type GetMyPromptUsageQueryVariables = Exact<{
  limit?: InputMaybe<Scalars['Int']['input']>;
}>;


export type GetMyPromptUsageQuery = { __typename?: 'Query', myPromptUsage: Array<{ __typename?: 'PromptUsage', promptName: string, userEmail: string, version: number | null, label: string | null, usedAt: string, traceId: string | null }> };

export type CreatePromptMutationVariables = Exact<{
  input: CreatePromptInput;
}>;


export type CreatePromptMutation = { __typename?: 'Mutation', createPrompt: { __typename?: 'Prompt', name: string, version: number | null, type: PromptType, labels: Array<string> | null, tags: Array<string> | null, createdBy: string | null } };

export type ResumeStatusQueryVariables = Exact<{
  email: Scalars['String']['input'];
}>;


export type ResumeStatusQuery = { __typename?: 'Query', resumeStatus: { __typename?: 'ResumeStatus', exists: boolean, resume_id: string | null, chunk_count: number | null, filename: string | null, ingested_at: string | null } | null };

export type UploadResumeMutationVariables = Exact<{
  email: Scalars['String']['input'];
  resumePdf: Scalars['String']['input'];
  filename: Scalars['String']['input'];
}>;


export type UploadResumeMutation = { __typename?: 'Mutation', uploadResume: { __typename?: 'ResumeUploadResult', success: boolean, job_id: string, tier: string, status: string } | null };

export type IngestResumeParseMutationVariables = Exact<{
  email: Scalars['String']['input'];
  job_id: Scalars['String']['input'];
  filename: Scalars['String']['input'];
}>;


export type IngestResumeParseMutation = { __typename?: 'Mutation', ingestResumeParse: { __typename?: 'ResumeIngestResult', success: boolean, status: string, job_id: string, resume_id: string | null, chunks_stored: number | null, error: string | null } | null };

export type AskAboutResumeQueryVariables = Exact<{
  email: Scalars['String']['input'];
  question: Scalars['String']['input'];
}>;


export type AskAboutResumeQuery = { __typename?: 'Query', askAboutResume: { __typename?: 'ResumeAnswer', answer: string, context_count: number } | null };

export type GetTasksQueryVariables = Exact<{
  status?: InputMaybe<Scalars['String']['input']>;
  priority?: InputMaybe<Scalars['String']['input']>;
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
}>;


export type GetTasksQuery = { __typename?: 'Query', tasks: { __typename?: 'TasksResult', totalCount: number, tasks: Array<{ __typename?: 'Task', id: number, title: string, description: string | null, status: string, priority: string, dueDate: string | null, completedAt: string | null, entityType: string | null, entityId: string | null, tags: Array<string>, createdAt: string, updatedAt: string }> } };

export type GetTaskQueryVariables = Exact<{
  id: Scalars['Int']['input'];
}>;


export type GetTaskQuery = { __typename?: 'Query', task: { __typename?: 'Task', id: number, title: string, description: string | null, status: string, priority: string, dueDate: string | null, completedAt: string | null, entityType: string | null, entityId: string | null, tags: Array<string>, createdAt: string, updatedAt: string } | null };

export type CreateTaskMutationVariables = Exact<{
  input: CreateTaskInput;
}>;


export type CreateTaskMutation = { __typename?: 'Mutation', createTask: { __typename?: 'Task', id: number, title: string, status: string, priority: string, dueDate: string | null, tags: Array<string>, createdAt: string } };

export type UpdateTaskMutationVariables = Exact<{
  id: Scalars['Int']['input'];
  input: UpdateTaskInput;
}>;


export type UpdateTaskMutation = { __typename?: 'Mutation', updateTask: { __typename?: 'Task', id: number, title: string, status: string, priority: string, dueDate: string | null, tags: Array<string>, updatedAt: string } };

export type CompleteTaskMutationVariables = Exact<{
  id: Scalars['Int']['input'];
}>;


export type CompleteTaskMutation = { __typename?: 'Mutation', completeTask: { __typename?: 'Task', id: number, status: string, completedAt: string | null } };

export type DeleteTaskMutationVariables = Exact<{
  id: Scalars['Int']['input'];
}>;


export type DeleteTaskMutation = { __typename?: 'Mutation', deleteTask: { __typename?: 'DeleteTaskResult', success: boolean, message: string | null } };

export const ApplicationFieldsFragmentDoc = gql`
    fragment ApplicationFields on Application {
  id
  email
  jobId
  resume
  questions {
    questionId
    questionText
    answerText
  }
  status
  notes
  jobTitle
  companyName
  companyKey
  jobDescription
  aiInterviewQuestions
  aiTechStack
  createdAt
}
    `;
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
export const AtsBoardFieldsFragmentDoc = gql`
    fragment ATSBoardFields on ATSBoard {
  id
  company_id
  url
  vendor
  board_type
  confidence
  is_active
  first_seen_at
  last_seen_at
  evidence {
    ...EvidenceFields
  }
  created_at
  updated_at
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
  deep_analysis
  last_seen_crawl_id
  last_seen_capture_timestamp
  last_seen_source_url
  ashby_enrichment {
    company_name
    industry_tags
    tech_signals
    size_signal
    enriched_at
  }
  ats_boards {
    ...ATSBoardFields
  }
}
    ${AtsBoardFieldsFragmentDoc}`;
export const DeleteAllJobsDocument = gql`
    mutation DeleteAllJobs {
  deleteAllJobs {
    success
    message
  }
}
    `;
export type DeleteAllJobsMutationFn = Apollo.MutationFunction<DeleteAllJobsMutation, DeleteAllJobsMutationVariables>;

/**
 * __useDeleteAllJobsMutation__
 *
 * To run a mutation, you first call `useDeleteAllJobsMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useDeleteAllJobsMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [deleteAllJobsMutation, { data, loading, error }] = useDeleteAllJobsMutation({
 *   variables: {
 *   },
 * });
 */
export function useDeleteAllJobsMutation(baseOptions?: Apollo.MutationHookOptions<DeleteAllJobsMutation, DeleteAllJobsMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<DeleteAllJobsMutation, DeleteAllJobsMutationVariables>(DeleteAllJobsDocument, options);
      }
export type DeleteAllJobsMutationHookResult = ReturnType<typeof useDeleteAllJobsMutation>;
export type DeleteAllJobsMutationResult = Apollo.MutationResult<DeleteAllJobsMutation>;
export type DeleteAllJobsMutationOptions = Apollo.BaseMutationOptions<DeleteAllJobsMutation, DeleteAllJobsMutationVariables>;
export const DeleteJobDocument = gql`
    mutation DeleteJob($id: Int!) {
  deleteJob(id: $id) {
    success
    message
  }
}
    `;
export type DeleteJobMutationFn = Apollo.MutationFunction<DeleteJobMutation, DeleteJobMutationVariables>;

/**
 * __useDeleteJobMutation__
 *
 * To run a mutation, you first call `useDeleteJobMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useDeleteJobMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [deleteJobMutation, { data, loading, error }] = useDeleteJobMutation({
 *   variables: {
 *      id: // value for 'id'
 *   },
 * });
 */
export function useDeleteJobMutation(baseOptions?: Apollo.MutationHookOptions<DeleteJobMutation, DeleteJobMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<DeleteJobMutation, DeleteJobMutationVariables>(DeleteJobDocument, options);
      }
export type DeleteJobMutationHookResult = ReturnType<typeof useDeleteJobMutation>;
export type DeleteJobMutationResult = Apollo.MutationResult<DeleteJobMutation>;
export type DeleteJobMutationOptions = Apollo.BaseMutationOptions<DeleteJobMutation, DeleteJobMutationVariables>;
export const DeleteStackEntryDocument = gql`
    mutation DeleteStackEntry($name: String!) {
  deleteStackEntry(name: $name) {
    success
    message
  }
}
    `;
export type DeleteStackEntryMutationFn = Apollo.MutationFunction<DeleteStackEntryMutation, DeleteStackEntryMutationVariables>;

/**
 * __useDeleteStackEntryMutation__
 *
 * To run a mutation, you first call `useDeleteStackEntryMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useDeleteStackEntryMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [deleteStackEntryMutation, { data, loading, error }] = useDeleteStackEntryMutation({
 *   variables: {
 *      name: // value for 'name'
 *   },
 * });
 */
export function useDeleteStackEntryMutation(baseOptions?: Apollo.MutationHookOptions<DeleteStackEntryMutation, DeleteStackEntryMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<DeleteStackEntryMutation, DeleteStackEntryMutationVariables>(DeleteStackEntryDocument, options);
      }
export type DeleteStackEntryMutationHookResult = ReturnType<typeof useDeleteStackEntryMutation>;
export type DeleteStackEntryMutationResult = Apollo.MutationResult<DeleteStackEntryMutation>;
export type DeleteStackEntryMutationOptions = Apollo.BaseMutationOptions<DeleteStackEntryMutation, DeleteStackEntryMutationVariables>;
export const ExecuteSqlDocument = gql`
    query ExecuteSql($sql: String!) {
  executeSql(sql: $sql) {
    sql
    explanation
    columns
    rows
    drilldownSearchQuery
  }
}
    `;

/**
 * __useExecuteSqlQuery__
 *
 * To run a query within a React component, call `useExecuteSqlQuery` and pass it any options that fit your needs.
 * When your component renders, `useExecuteSqlQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useExecuteSqlQuery({
 *   variables: {
 *      sql: // value for 'sql'
 *   },
 * });
 */
export function useExecuteSqlQuery(baseOptions: Apollo.QueryHookOptions<ExecuteSqlQuery, ExecuteSqlQueryVariables> & ({ variables: ExecuteSqlQueryVariables; skip?: boolean; } | { skip: boolean; }) ) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<ExecuteSqlQuery, ExecuteSqlQueryVariables>(ExecuteSqlDocument, options);
      }
export function useExecuteSqlLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<ExecuteSqlQuery, ExecuteSqlQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<ExecuteSqlQuery, ExecuteSqlQueryVariables>(ExecuteSqlDocument, options);
        }
// @ts-ignore
export function useExecuteSqlSuspenseQuery(baseOptions?: Apollo.SuspenseQueryHookOptions<ExecuteSqlQuery, ExecuteSqlQueryVariables>): Apollo.UseSuspenseQueryResult<ExecuteSqlQuery, ExecuteSqlQueryVariables>;
export function useExecuteSqlSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<ExecuteSqlQuery, ExecuteSqlQueryVariables>): Apollo.UseSuspenseQueryResult<ExecuteSqlQuery | undefined, ExecuteSqlQueryVariables>;
export function useExecuteSqlSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<ExecuteSqlQuery, ExecuteSqlQueryVariables>) {
          const options = baseOptions === Apollo.skipToken ? baseOptions : {...defaultOptions, ...baseOptions}
          return Apollo.useSuspenseQuery<ExecuteSqlQuery, ExecuteSqlQueryVariables>(ExecuteSqlDocument, options);
        }
export type ExecuteSqlQueryHookResult = ReturnType<typeof useExecuteSqlQuery>;
export type ExecuteSqlLazyQueryHookResult = ReturnType<typeof useExecuteSqlLazyQuery>;
export type ExecuteSqlSuspenseQueryHookResult = ReturnType<typeof useExecuteSqlSuspenseQuery>;
export type ExecuteSqlQueryResult = Apollo.QueryResult<ExecuteSqlQuery, ExecuteSqlQueryVariables>;
export const GetJobDocument = gql`
    query GetJob($id: String!) {
  job(id: $id) {
    id
    external_id
    source_id
    source_kind
    company_id
    company_key
    company {
      ...CompanyFields
    }
    title
    location
    url
    description
    publishedAt
    score
    score_reason
    status
    is_remote_eu
    remote_eu_confidence
    remote_eu_reason
    skills {
      tag
      level
      confidence
      evidence
    }
    skillMatch {
      score
      userCoverage
      jobCoverage
      requiredCoverage
      matchedCount
      totalPreferred
      details {
        tag
        level
        matched
      }
    }
    absolute_url
    internal_job_id
    requisition_id
    company_name
    publishedAt
    language
    metadata {
      id
      name
      value
      value_type
    }
    departments {
      id
      name
      child_ids
      parent_id
    }
    offices {
      id
      name
      location
      child_ids
      parent_id
    }
    questions {
      description
      label
      required
      fields {
        type
        name
      }
    }
    location_questions {
      description
      label
      required
      fields {
        type
        name
      }
    }
    compliance {
      type
      description
      questions {
        description
        label
        required
        fields {
          type
          name
        }
      }
    }
    demographic_questions {
      header
      description
      questions {
        description
        label
        required
        fields {
          type
          name
        }
      }
    }
    data_compliance {
      type
      requires_consent
      requires_processing_consent
      requires_retention_consent
      retention_period
      demographic_data_consent_applies
    }
    ashby_department
    ashby_team
    ashby_employment_type
    ashby_is_remote
    ashby_is_listed
    ashby_job_url
    ashby_apply_url
    ashby_secondary_locations {
      location
      address {
        addressLocality
        addressRegion
        addressCountry
      }
    }
    ashby_compensation {
      compensationTierSummary
      scrapeableCompensationSalarySummary
      compensationTiers {
        id
        tierSummary
        title
        additionalInformation
        components {
          id
          summary
          compensationType
          interval
          currencyCode
          minValue
          maxValue
        }
      }
      summaryComponents {
        id
        summary
        compensationType
        interval
        currencyCode
        minValue
        maxValue
      }
    }
    ashby_address {
      postalAddress {
        addressLocality
        addressRegion
        addressCountry
      }
    }
    applied
    appliedAt
    archived
    created_at
    updated_at
  }
}
    ${CompanyFieldsFragmentDoc}`;

/**
 * __useGetJobQuery__
 *
 * To run a query within a React component, call `useGetJobQuery` and pass it any options that fit your needs.
 * When your component renders, `useGetJobQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useGetJobQuery({
 *   variables: {
 *      id: // value for 'id'
 *   },
 * });
 */
export function useGetJobQuery(baseOptions: Apollo.QueryHookOptions<GetJobQuery, GetJobQueryVariables> & ({ variables: GetJobQueryVariables; skip?: boolean; } | { skip: boolean; }) ) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<GetJobQuery, GetJobQueryVariables>(GetJobDocument, options);
      }
export function useGetJobLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<GetJobQuery, GetJobQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<GetJobQuery, GetJobQueryVariables>(GetJobDocument, options);
        }
// @ts-ignore
export function useGetJobSuspenseQuery(baseOptions?: Apollo.SuspenseQueryHookOptions<GetJobQuery, GetJobQueryVariables>): Apollo.UseSuspenseQueryResult<GetJobQuery, GetJobQueryVariables>;
export function useGetJobSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<GetJobQuery, GetJobQueryVariables>): Apollo.UseSuspenseQueryResult<GetJobQuery | undefined, GetJobQueryVariables>;
export function useGetJobSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<GetJobQuery, GetJobQueryVariables>) {
          const options = baseOptions === Apollo.skipToken ? baseOptions : {...defaultOptions, ...baseOptions}
          return Apollo.useSuspenseQuery<GetJobQuery, GetJobQueryVariables>(GetJobDocument, options);
        }
export type GetJobQueryHookResult = ReturnType<typeof useGetJobQuery>;
export type GetJobLazyQueryHookResult = ReturnType<typeof useGetJobLazyQuery>;
export type GetJobSuspenseQueryHookResult = ReturnType<typeof useGetJobSuspenseQuery>;
export type GetJobQueryResult = Apollo.QueryResult<GetJobQuery, GetJobQueryVariables>;
export const GetJobsDocument = gql`
    query GetJobs($sourceType: String, $sourceTypes: [String!], $search: String, $companyKey: String, $limit: Int, $offset: Int, $excludedCompanies: [String!], $skills: [String!], $showAll: Boolean) {
  jobs(
    sourceType: $sourceType
    sourceTypes: $sourceTypes
    search: $search
    companyKey: $companyKey
    limit: $limit
    offset: $offset
    excludedCompanies: $excludedCompanies
    skills: $skills
    showAll: $showAll
  ) {
    jobs {
      id
      external_id
      source_kind
      company_key
      title
      location
      url
      publishedAt
      status
      is_remote_eu
      remote_eu_confidence
      applied
      archived
      skills {
        tag
        level
      }
    }
    totalCount
  }
}
    `;

/**
 * __useGetJobsQuery__
 *
 * To run a query within a React component, call `useGetJobsQuery` and pass it any options that fit your needs.
 * When your component renders, `useGetJobsQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useGetJobsQuery({
 *   variables: {
 *      sourceType: // value for 'sourceType'
 *      sourceTypes: // value for 'sourceTypes'
 *      search: // value for 'search'
 *      companyKey: // value for 'companyKey'
 *      limit: // value for 'limit'
 *      offset: // value for 'offset'
 *      excludedCompanies: // value for 'excludedCompanies'
 *      skills: // value for 'skills'
 *      showAll: // value for 'showAll'
 *   },
 * });
 */
export function useGetJobsQuery(baseOptions?: Apollo.QueryHookOptions<GetJobsQuery, GetJobsQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<GetJobsQuery, GetJobsQueryVariables>(GetJobsDocument, options);
      }
export function useGetJobsLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<GetJobsQuery, GetJobsQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<GetJobsQuery, GetJobsQueryVariables>(GetJobsDocument, options);
        }
// @ts-ignore
export function useGetJobsSuspenseQuery(baseOptions?: Apollo.SuspenseQueryHookOptions<GetJobsQuery, GetJobsQueryVariables>): Apollo.UseSuspenseQueryResult<GetJobsQuery, GetJobsQueryVariables>;
export function useGetJobsSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<GetJobsQuery, GetJobsQueryVariables>): Apollo.UseSuspenseQueryResult<GetJobsQuery | undefined, GetJobsQueryVariables>;
export function useGetJobsSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<GetJobsQuery, GetJobsQueryVariables>) {
          const options = baseOptions === Apollo.skipToken ? baseOptions : {...defaultOptions, ...baseOptions}
          return Apollo.useSuspenseQuery<GetJobsQuery, GetJobsQueryVariables>(GetJobsDocument, options);
        }
export type GetJobsQueryHookResult = ReturnType<typeof useGetJobsQuery>;
export type GetJobsLazyQueryHookResult = ReturnType<typeof useGetJobsLazyQuery>;
export type GetJobsSuspenseQueryHookResult = ReturnType<typeof useGetJobsSuspenseQuery>;
export type GetJobsQueryResult = Apollo.QueryResult<GetJobsQuery, GetJobsQueryVariables>;
export const GetUserSettingsDocument = gql`
    query GetUserSettings($userId: String!) {
  userSettings(userId: $userId) {
    id
    preferred_locations
    preferred_skills
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
export const ProcessAllJobsDocument = gql`
    mutation ProcessAllJobs($limit: Int) {
  processAllJobs(limit: $limit) {
    success
    message
    enhanced
    enhanceErrors
    processed
    euRemote
    nonEuRemote
    errors
  }
}
    `;
export type ProcessAllJobsMutationFn = Apollo.MutationFunction<ProcessAllJobsMutation, ProcessAllJobsMutationVariables>;

/**
 * __useProcessAllJobsMutation__
 *
 * To run a mutation, you first call `useProcessAllJobsMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useProcessAllJobsMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [processAllJobsMutation, { data, loading, error }] = useProcessAllJobsMutation({
 *   variables: {
 *      limit: // value for 'limit'
 *   },
 * });
 */
export function useProcessAllJobsMutation(baseOptions?: Apollo.MutationHookOptions<ProcessAllJobsMutation, ProcessAllJobsMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<ProcessAllJobsMutation, ProcessAllJobsMutationVariables>(ProcessAllJobsDocument, options);
      }
export type ProcessAllJobsMutationHookResult = ReturnType<typeof useProcessAllJobsMutation>;
export type ProcessAllJobsMutationResult = Apollo.MutationResult<ProcessAllJobsMutation>;
export type ProcessAllJobsMutationOptions = Apollo.BaseMutationOptions<ProcessAllJobsMutation, ProcessAllJobsMutationVariables>;
export const ReportJobDocument = gql`
    mutation ReportJob($id: Int!) {
  reportJob(id: $id) {
    id
    status
  }
}
    `;
export type ReportJobMutationFn = Apollo.MutationFunction<ReportJobMutation, ReportJobMutationVariables>;

/**
 * __useReportJobMutation__
 *
 * To run a mutation, you first call `useReportJobMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useReportJobMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [reportJobMutation, { data, loading, error }] = useReportJobMutation({
 *   variables: {
 *      id: // value for 'id'
 *   },
 * });
 */
export function useReportJobMutation(baseOptions?: Apollo.MutationHookOptions<ReportJobMutation, ReportJobMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<ReportJobMutation, ReportJobMutationVariables>(ReportJobDocument, options);
      }
export type ReportJobMutationHookResult = ReturnType<typeof useReportJobMutation>;
export type ReportJobMutationResult = Apollo.MutationResult<ReportJobMutation>;
export type ReportJobMutationOptions = Apollo.BaseMutationOptions<ReportJobMutation, ReportJobMutationVariables>;
export const TextToSqlDocument = gql`
    query TextToSql($question: String!) {
  textToSql(question: $question) {
    sql
    explanation
    columns
    rows
    drilldownSearchQuery
  }
}
    `;

/**
 * __useTextToSqlQuery__
 *
 * To run a query within a React component, call `useTextToSqlQuery` and pass it any options that fit your needs.
 * When your component renders, `useTextToSqlQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useTextToSqlQuery({
 *   variables: {
 *      question: // value for 'question'
 *   },
 * });
 */
export function useTextToSqlQuery(baseOptions: Apollo.QueryHookOptions<TextToSqlQuery, TextToSqlQueryVariables> & ({ variables: TextToSqlQueryVariables; skip?: boolean; } | { skip: boolean; }) ) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<TextToSqlQuery, TextToSqlQueryVariables>(TextToSqlDocument, options);
      }
export function useTextToSqlLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<TextToSqlQuery, TextToSqlQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<TextToSqlQuery, TextToSqlQueryVariables>(TextToSqlDocument, options);
        }
// @ts-ignore
export function useTextToSqlSuspenseQuery(baseOptions?: Apollo.SuspenseQueryHookOptions<TextToSqlQuery, TextToSqlQueryVariables>): Apollo.UseSuspenseQueryResult<TextToSqlQuery, TextToSqlQueryVariables>;
export function useTextToSqlSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<TextToSqlQuery, TextToSqlQueryVariables>): Apollo.UseSuspenseQueryResult<TextToSqlQuery | undefined, TextToSqlQueryVariables>;
export function useTextToSqlSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<TextToSqlQuery, TextToSqlQueryVariables>) {
          const options = baseOptions === Apollo.skipToken ? baseOptions : {...defaultOptions, ...baseOptions}
          return Apollo.useSuspenseQuery<TextToSqlQuery, TextToSqlQueryVariables>(TextToSqlDocument, options);
        }
export type TextToSqlQueryHookResult = ReturnType<typeof useTextToSqlQuery>;
export type TextToSqlLazyQueryHookResult = ReturnType<typeof useTextToSqlLazyQuery>;
export type TextToSqlSuspenseQueryHookResult = ReturnType<typeof useTextToSqlSuspenseQuery>;
export type TextToSqlQueryResult = Apollo.QueryResult<TextToSqlQuery, TextToSqlQueryVariables>;
export const UpdateUserSettingsDocument = gql`
    mutation UpdateUserSettings($userId: String!, $settings: UserSettingsInput!) {
  updateUserSettings(userId: $userId, settings: $settings) {
    id
    user_id
    email_notifications
    daily_digest
    new_job_alerts
    preferred_locations
    preferred_skills
    excluded_companies
    dark_mode
    jobs_per_page
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
export const GetApplicationsDocument = gql`
    query GetApplications {
  applications {
    ...ApplicationFields
  }
}
    ${ApplicationFieldsFragmentDoc}`;

/**
 * __useGetApplicationsQuery__
 *
 * To run a query within a React component, call `useGetApplicationsQuery` and pass it any options that fit your needs.
 * When your component renders, `useGetApplicationsQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useGetApplicationsQuery({
 *   variables: {
 *   },
 * });
 */
export function useGetApplicationsQuery(baseOptions?: Apollo.QueryHookOptions<GetApplicationsQuery, GetApplicationsQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<GetApplicationsQuery, GetApplicationsQueryVariables>(GetApplicationsDocument, options);
      }
export function useGetApplicationsLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<GetApplicationsQuery, GetApplicationsQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<GetApplicationsQuery, GetApplicationsQueryVariables>(GetApplicationsDocument, options);
        }
// @ts-ignore
export function useGetApplicationsSuspenseQuery(baseOptions?: Apollo.SuspenseQueryHookOptions<GetApplicationsQuery, GetApplicationsQueryVariables>): Apollo.UseSuspenseQueryResult<GetApplicationsQuery, GetApplicationsQueryVariables>;
export function useGetApplicationsSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<GetApplicationsQuery, GetApplicationsQueryVariables>): Apollo.UseSuspenseQueryResult<GetApplicationsQuery | undefined, GetApplicationsQueryVariables>;
export function useGetApplicationsSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<GetApplicationsQuery, GetApplicationsQueryVariables>) {
          const options = baseOptions === Apollo.skipToken ? baseOptions : {...defaultOptions, ...baseOptions}
          return Apollo.useSuspenseQuery<GetApplicationsQuery, GetApplicationsQueryVariables>(GetApplicationsDocument, options);
        }
export type GetApplicationsQueryHookResult = ReturnType<typeof useGetApplicationsQuery>;
export type GetApplicationsLazyQueryHookResult = ReturnType<typeof useGetApplicationsLazyQuery>;
export type GetApplicationsSuspenseQueryHookResult = ReturnType<typeof useGetApplicationsSuspenseQuery>;
export type GetApplicationsQueryResult = Apollo.QueryResult<GetApplicationsQuery, GetApplicationsQueryVariables>;
export const GetApplicationDocument = gql`
    query GetApplication($id: Int!) {
  application(id: $id) {
    ...ApplicationFields
  }
}
    ${ApplicationFieldsFragmentDoc}`;

/**
 * __useGetApplicationQuery__
 *
 * To run a query within a React component, call `useGetApplicationQuery` and pass it any options that fit your needs.
 * When your component renders, `useGetApplicationQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useGetApplicationQuery({
 *   variables: {
 *      id: // value for 'id'
 *   },
 * });
 */
export function useGetApplicationQuery(baseOptions: Apollo.QueryHookOptions<GetApplicationQuery, GetApplicationQueryVariables> & ({ variables: GetApplicationQueryVariables; skip?: boolean; } | { skip: boolean; }) ) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<GetApplicationQuery, GetApplicationQueryVariables>(GetApplicationDocument, options);
      }
export function useGetApplicationLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<GetApplicationQuery, GetApplicationQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<GetApplicationQuery, GetApplicationQueryVariables>(GetApplicationDocument, options);
        }
// @ts-ignore
export function useGetApplicationSuspenseQuery(baseOptions?: Apollo.SuspenseQueryHookOptions<GetApplicationQuery, GetApplicationQueryVariables>): Apollo.UseSuspenseQueryResult<GetApplicationQuery, GetApplicationQueryVariables>;
export function useGetApplicationSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<GetApplicationQuery, GetApplicationQueryVariables>): Apollo.UseSuspenseQueryResult<GetApplicationQuery | undefined, GetApplicationQueryVariables>;
export function useGetApplicationSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<GetApplicationQuery, GetApplicationQueryVariables>) {
          const options = baseOptions === Apollo.skipToken ? baseOptions : {...defaultOptions, ...baseOptions}
          return Apollo.useSuspenseQuery<GetApplicationQuery, GetApplicationQueryVariables>(GetApplicationDocument, options);
        }
export type GetApplicationQueryHookResult = ReturnType<typeof useGetApplicationQuery>;
export type GetApplicationLazyQueryHookResult = ReturnType<typeof useGetApplicationLazyQuery>;
export type GetApplicationSuspenseQueryHookResult = ReturnType<typeof useGetApplicationSuspenseQuery>;
export type GetApplicationQueryResult = Apollo.QueryResult<GetApplicationQuery, GetApplicationQueryVariables>;
export const CreateApplicationDocument = gql`
    mutation CreateApplication($input: ApplicationInput!) {
  createApplication(input: $input) {
    ...ApplicationFields
  }
}
    ${ApplicationFieldsFragmentDoc}`;
export type CreateApplicationMutationFn = Apollo.MutationFunction<CreateApplicationMutation, CreateApplicationMutationVariables>;

/**
 * __useCreateApplicationMutation__
 *
 * To run a mutation, you first call `useCreateApplicationMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useCreateApplicationMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [createApplicationMutation, { data, loading, error }] = useCreateApplicationMutation({
 *   variables: {
 *      input: // value for 'input'
 *   },
 * });
 */
export function useCreateApplicationMutation(baseOptions?: Apollo.MutationHookOptions<CreateApplicationMutation, CreateApplicationMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<CreateApplicationMutation, CreateApplicationMutationVariables>(CreateApplicationDocument, options);
      }
export type CreateApplicationMutationHookResult = ReturnType<typeof useCreateApplicationMutation>;
export type CreateApplicationMutationResult = Apollo.MutationResult<CreateApplicationMutation>;
export type CreateApplicationMutationOptions = Apollo.BaseMutationOptions<CreateApplicationMutation, CreateApplicationMutationVariables>;
export const UpdateApplicationDocument = gql`
    mutation UpdateApplication($id: Int!, $input: UpdateApplicationInput!) {
  updateApplication(id: $id, input: $input) {
    id
    jobId
    status
    notes
    jobTitle
    companyName
    companyKey
    jobDescription
  }
}
    `;
export type UpdateApplicationMutationFn = Apollo.MutationFunction<UpdateApplicationMutation, UpdateApplicationMutationVariables>;

/**
 * __useUpdateApplicationMutation__
 *
 * To run a mutation, you first call `useUpdateApplicationMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useUpdateApplicationMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [updateApplicationMutation, { data, loading, error }] = useUpdateApplicationMutation({
 *   variables: {
 *      id: // value for 'id'
 *      input: // value for 'input'
 *   },
 * });
 */
export function useUpdateApplicationMutation(baseOptions?: Apollo.MutationHookOptions<UpdateApplicationMutation, UpdateApplicationMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<UpdateApplicationMutation, UpdateApplicationMutationVariables>(UpdateApplicationDocument, options);
      }
export type UpdateApplicationMutationHookResult = ReturnType<typeof useUpdateApplicationMutation>;
export type UpdateApplicationMutationResult = Apollo.MutationResult<UpdateApplicationMutation>;
export type UpdateApplicationMutationOptions = Apollo.BaseMutationOptions<UpdateApplicationMutation, UpdateApplicationMutationVariables>;
export const DeleteApplicationDocument = gql`
    mutation DeleteApplication($id: Int!) {
  deleteApplication(id: $id) {
    success
    message
  }
}
    `;
export type DeleteApplicationMutationFn = Apollo.MutationFunction<DeleteApplicationMutation, DeleteApplicationMutationVariables>;

/**
 * __useDeleteApplicationMutation__
 *
 * To run a mutation, you first call `useDeleteApplicationMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useDeleteApplicationMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [deleteApplicationMutation, { data, loading, error }] = useDeleteApplicationMutation({
 *   variables: {
 *      id: // value for 'id'
 *   },
 * });
 */
export function useDeleteApplicationMutation(baseOptions?: Apollo.MutationHookOptions<DeleteApplicationMutation, DeleteApplicationMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<DeleteApplicationMutation, DeleteApplicationMutationVariables>(DeleteApplicationDocument, options);
      }
export type DeleteApplicationMutationHookResult = ReturnType<typeof useDeleteApplicationMutation>;
export type DeleteApplicationMutationResult = Apollo.MutationResult<DeleteApplicationMutation>;
export type DeleteApplicationMutationOptions = Apollo.BaseMutationOptions<DeleteApplicationMutation, DeleteApplicationMutationVariables>;
export const GetBlockedCompaniesDocument = gql`
    query GetBlockedCompanies {
  blockedCompanies {
    id
    name
    reason
    createdAt
  }
}
    `;

/**
 * __useGetBlockedCompaniesQuery__
 *
 * To run a query within a React component, call `useGetBlockedCompaniesQuery` and pass it any options that fit your needs.
 * When your component renders, `useGetBlockedCompaniesQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useGetBlockedCompaniesQuery({
 *   variables: {
 *   },
 * });
 */
export function useGetBlockedCompaniesQuery(baseOptions?: Apollo.QueryHookOptions<GetBlockedCompaniesQuery, GetBlockedCompaniesQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<GetBlockedCompaniesQuery, GetBlockedCompaniesQueryVariables>(GetBlockedCompaniesDocument, options);
      }
export function useGetBlockedCompaniesLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<GetBlockedCompaniesQuery, GetBlockedCompaniesQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<GetBlockedCompaniesQuery, GetBlockedCompaniesQueryVariables>(GetBlockedCompaniesDocument, options);
        }
// @ts-ignore
export function useGetBlockedCompaniesSuspenseQuery(baseOptions?: Apollo.SuspenseQueryHookOptions<GetBlockedCompaniesQuery, GetBlockedCompaniesQueryVariables>): Apollo.UseSuspenseQueryResult<GetBlockedCompaniesQuery, GetBlockedCompaniesQueryVariables>;
export function useGetBlockedCompaniesSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<GetBlockedCompaniesQuery, GetBlockedCompaniesQueryVariables>): Apollo.UseSuspenseQueryResult<GetBlockedCompaniesQuery | undefined, GetBlockedCompaniesQueryVariables>;
export function useGetBlockedCompaniesSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<GetBlockedCompaniesQuery, GetBlockedCompaniesQueryVariables>) {
          const options = baseOptions === Apollo.skipToken ? baseOptions : {...defaultOptions, ...baseOptions}
          return Apollo.useSuspenseQuery<GetBlockedCompaniesQuery, GetBlockedCompaniesQueryVariables>(GetBlockedCompaniesDocument, options);
        }
export type GetBlockedCompaniesQueryHookResult = ReturnType<typeof useGetBlockedCompaniesQuery>;
export type GetBlockedCompaniesLazyQueryHookResult = ReturnType<typeof useGetBlockedCompaniesLazyQuery>;
export type GetBlockedCompaniesSuspenseQueryHookResult = ReturnType<typeof useGetBlockedCompaniesSuspenseQuery>;
export type GetBlockedCompaniesQueryResult = Apollo.QueryResult<GetBlockedCompaniesQuery, GetBlockedCompaniesQueryVariables>;
export const BlockCompanyDocument = gql`
    mutation BlockCompany($name: String!, $reason: String) {
  blockCompany(name: $name, reason: $reason) {
    id
    name
    reason
    createdAt
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
 *      name: // value for 'name'
 *      reason: // value for 'reason'
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
    success
    message
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
export const UpsertCompanyAtsBoardsDocument = gql`
    mutation UpsertCompanyATSBoards($company_id: Int!, $boards: [ATSBoardUpsertInput!]!) {
  upsert_company_ats_boards(company_id: $company_id, boards: $boards) {
    ...ATSBoardFields
  }
}
    ${AtsBoardFieldsFragmentDoc}`;
export type UpsertCompanyAtsBoardsMutationFn = Apollo.MutationFunction<UpsertCompanyAtsBoardsMutation, UpsertCompanyAtsBoardsMutationVariables>;

/**
 * __useUpsertCompanyAtsBoardsMutation__
 *
 * To run a mutation, you first call `useUpsertCompanyAtsBoardsMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useUpsertCompanyAtsBoardsMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [upsertCompanyAtsBoardsMutation, { data, loading, error }] = useUpsertCompanyAtsBoardsMutation({
 *   variables: {
 *      company_id: // value for 'company_id'
 *      boards: // value for 'boards'
 *   },
 * });
 */
export function useUpsertCompanyAtsBoardsMutation(baseOptions?: Apollo.MutationHookOptions<UpsertCompanyAtsBoardsMutation, UpsertCompanyAtsBoardsMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<UpsertCompanyAtsBoardsMutation, UpsertCompanyAtsBoardsMutationVariables>(UpsertCompanyAtsBoardsDocument, options);
      }
export type UpsertCompanyAtsBoardsMutationHookResult = ReturnType<typeof useUpsertCompanyAtsBoardsMutation>;
export type UpsertCompanyAtsBoardsMutationResult = Apollo.MutationResult<UpsertCompanyAtsBoardsMutation>;
export type UpsertCompanyAtsBoardsMutationOptions = Apollo.BaseMutationOptions<UpsertCompanyAtsBoardsMutation, UpsertCompanyAtsBoardsMutationVariables>;
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
export const BlockJobsByCompanyDocument = gql`
    mutation BlockJobsByCompany($companyName: String!) {
  blockJobsByCompany(companyName: $companyName) {
    success
    message
  }
}
    `;
export type BlockJobsByCompanyMutationFn = Apollo.MutationFunction<BlockJobsByCompanyMutation, BlockJobsByCompanyMutationVariables>;

/**
 * __useBlockJobsByCompanyMutation__
 *
 * To run a mutation, you first call `useBlockJobsByCompanyMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useBlockJobsByCompanyMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [blockJobsByCompanyMutation, { data, loading, error }] = useBlockJobsByCompanyMutation({
 *   variables: {
 *      companyName: // value for 'companyName'
 *   },
 * });
 */
export function useBlockJobsByCompanyMutation(baseOptions?: Apollo.MutationHookOptions<BlockJobsByCompanyMutation, BlockJobsByCompanyMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<BlockJobsByCompanyMutation, BlockJobsByCompanyMutationVariables>(BlockJobsByCompanyDocument, options);
      }
export type BlockJobsByCompanyMutationHookResult = ReturnType<typeof useBlockJobsByCompanyMutation>;
export type BlockJobsByCompanyMutationResult = Apollo.MutationResult<BlockJobsByCompanyMutation>;
export type BlockJobsByCompanyMutationOptions = Apollo.BaseMutationOptions<BlockJobsByCompanyMutation, BlockJobsByCompanyMutationVariables>;
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
export const GetCompanyAtsBoardsDocument = gql`
    query GetCompanyATSBoards($company_id: Int!) {
  company_ats_boards(company_id: $company_id) {
    ...ATSBoardFields
  }
}
    ${AtsBoardFieldsFragmentDoc}`;

/**
 * __useGetCompanyAtsBoardsQuery__
 *
 * To run a query within a React component, call `useGetCompanyAtsBoardsQuery` and pass it any options that fit your needs.
 * When your component renders, `useGetCompanyAtsBoardsQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useGetCompanyAtsBoardsQuery({
 *   variables: {
 *      company_id: // value for 'company_id'
 *   },
 * });
 */
export function useGetCompanyAtsBoardsQuery(baseOptions: Apollo.QueryHookOptions<GetCompanyAtsBoardsQuery, GetCompanyAtsBoardsQueryVariables> & ({ variables: GetCompanyAtsBoardsQueryVariables; skip?: boolean; } | { skip: boolean; }) ) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<GetCompanyAtsBoardsQuery, GetCompanyAtsBoardsQueryVariables>(GetCompanyAtsBoardsDocument, options);
      }
export function useGetCompanyAtsBoardsLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<GetCompanyAtsBoardsQuery, GetCompanyAtsBoardsQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<GetCompanyAtsBoardsQuery, GetCompanyAtsBoardsQueryVariables>(GetCompanyAtsBoardsDocument, options);
        }
// @ts-ignore
export function useGetCompanyAtsBoardsSuspenseQuery(baseOptions?: Apollo.SuspenseQueryHookOptions<GetCompanyAtsBoardsQuery, GetCompanyAtsBoardsQueryVariables>): Apollo.UseSuspenseQueryResult<GetCompanyAtsBoardsQuery, GetCompanyAtsBoardsQueryVariables>;
export function useGetCompanyAtsBoardsSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<GetCompanyAtsBoardsQuery, GetCompanyAtsBoardsQueryVariables>): Apollo.UseSuspenseQueryResult<GetCompanyAtsBoardsQuery | undefined, GetCompanyAtsBoardsQueryVariables>;
export function useGetCompanyAtsBoardsSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<GetCompanyAtsBoardsQuery, GetCompanyAtsBoardsQueryVariables>) {
          const options = baseOptions === Apollo.skipToken ? baseOptions : {...defaultOptions, ...baseOptions}
          return Apollo.useSuspenseQuery<GetCompanyAtsBoardsQuery, GetCompanyAtsBoardsQueryVariables>(GetCompanyAtsBoardsDocument, options);
        }
export type GetCompanyAtsBoardsQueryHookResult = ReturnType<typeof useGetCompanyAtsBoardsQuery>;
export type GetCompanyAtsBoardsLazyQueryHookResult = ReturnType<typeof useGetCompanyAtsBoardsLazyQuery>;
export type GetCompanyAtsBoardsSuspenseQueryHookResult = ReturnType<typeof useGetCompanyAtsBoardsSuspenseQuery>;
export type GetCompanyAtsBoardsQueryResult = Apollo.QueryResult<GetCompanyAtsBoardsQuery, GetCompanyAtsBoardsQueryVariables>;
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
export const GetGreenhouseJobsDocument = gql`
    query GetGreenhouseJobs($search: String, $limit: Int, $offset: Int) {
  jobs(sourceType: "greenhouse", search: $search, limit: $limit, offset: $offset) {
    jobs {
      id
      external_id
      source_id
      source_kind
      company_id
      company_key
      company {
        ...CompanyFields
      }
      title
      location
      url
      description
      publishedAt
      score
      score_reason
      is_remote_eu
      remote_eu_confidence
      remote_eu_reason
      skills {
        tag
        level
        confidence
        evidence
      }
      created_at
      updated_at
    }
    totalCount
  }
}
    ${CompanyFieldsFragmentDoc}`;

/**
 * __useGetGreenhouseJobsQuery__
 *
 * To run a query within a React component, call `useGetGreenhouseJobsQuery` and pass it any options that fit your needs.
 * When your component renders, `useGetGreenhouseJobsQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useGetGreenhouseJobsQuery({
 *   variables: {
 *      search: // value for 'search'
 *      limit: // value for 'limit'
 *      offset: // value for 'offset'
 *   },
 * });
 */
export function useGetGreenhouseJobsQuery(baseOptions?: Apollo.QueryHookOptions<GetGreenhouseJobsQuery, GetGreenhouseJobsQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<GetGreenhouseJobsQuery, GetGreenhouseJobsQueryVariables>(GetGreenhouseJobsDocument, options);
      }
export function useGetGreenhouseJobsLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<GetGreenhouseJobsQuery, GetGreenhouseJobsQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<GetGreenhouseJobsQuery, GetGreenhouseJobsQueryVariables>(GetGreenhouseJobsDocument, options);
        }
// @ts-ignore
export function useGetGreenhouseJobsSuspenseQuery(baseOptions?: Apollo.SuspenseQueryHookOptions<GetGreenhouseJobsQuery, GetGreenhouseJobsQueryVariables>): Apollo.UseSuspenseQueryResult<GetGreenhouseJobsQuery, GetGreenhouseJobsQueryVariables>;
export function useGetGreenhouseJobsSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<GetGreenhouseJobsQuery, GetGreenhouseJobsQueryVariables>): Apollo.UseSuspenseQueryResult<GetGreenhouseJobsQuery | undefined, GetGreenhouseJobsQueryVariables>;
export function useGetGreenhouseJobsSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<GetGreenhouseJobsQuery, GetGreenhouseJobsQueryVariables>) {
          const options = baseOptions === Apollo.skipToken ? baseOptions : {...defaultOptions, ...baseOptions}
          return Apollo.useSuspenseQuery<GetGreenhouseJobsQuery, GetGreenhouseJobsQueryVariables>(GetGreenhouseJobsDocument, options);
        }
export type GetGreenhouseJobsQueryHookResult = ReturnType<typeof useGetGreenhouseJobsQuery>;
export type GetGreenhouseJobsLazyQueryHookResult = ReturnType<typeof useGetGreenhouseJobsLazyQuery>;
export type GetGreenhouseJobsSuspenseQueryHookResult = ReturnType<typeof useGetGreenhouseJobsSuspenseQuery>;
export type GetGreenhouseJobsQueryResult = Apollo.QueryResult<GetGreenhouseJobsQuery, GetGreenhouseJobsQueryVariables>;
export const GetGreenhouseJobByIdDocument = gql`
    query GetGreenhouseJobById($id: String!) {
  job(id: $id) {
    id
    external_id
    source_id
    source_kind
    company_id
    company_key
    company {
      ...CompanyFields
    }
    title
    location
    url
    description
    publishedAt
    score
    score_reason
    is_remote_eu
    remote_eu_confidence
    remote_eu_reason
    skills {
      tag
      level
      confidence
      evidence
    }
    created_at
    updated_at
  }
}
    ${CompanyFieldsFragmentDoc}`;

/**
 * __useGetGreenhouseJobByIdQuery__
 *
 * To run a query within a React component, call `useGetGreenhouseJobByIdQuery` and pass it any options that fit your needs.
 * When your component renders, `useGetGreenhouseJobByIdQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useGetGreenhouseJobByIdQuery({
 *   variables: {
 *      id: // value for 'id'
 *   },
 * });
 */
export function useGetGreenhouseJobByIdQuery(baseOptions: Apollo.QueryHookOptions<GetGreenhouseJobByIdQuery, GetGreenhouseJobByIdQueryVariables> & ({ variables: GetGreenhouseJobByIdQueryVariables; skip?: boolean; } | { skip: boolean; }) ) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<GetGreenhouseJobByIdQuery, GetGreenhouseJobByIdQueryVariables>(GetGreenhouseJobByIdDocument, options);
      }
export function useGetGreenhouseJobByIdLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<GetGreenhouseJobByIdQuery, GetGreenhouseJobByIdQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<GetGreenhouseJobByIdQuery, GetGreenhouseJobByIdQueryVariables>(GetGreenhouseJobByIdDocument, options);
        }
// @ts-ignore
export function useGetGreenhouseJobByIdSuspenseQuery(baseOptions?: Apollo.SuspenseQueryHookOptions<GetGreenhouseJobByIdQuery, GetGreenhouseJobByIdQueryVariables>): Apollo.UseSuspenseQueryResult<GetGreenhouseJobByIdQuery, GetGreenhouseJobByIdQueryVariables>;
export function useGetGreenhouseJobByIdSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<GetGreenhouseJobByIdQuery, GetGreenhouseJobByIdQueryVariables>): Apollo.UseSuspenseQueryResult<GetGreenhouseJobByIdQuery | undefined, GetGreenhouseJobByIdQueryVariables>;
export function useGetGreenhouseJobByIdSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<GetGreenhouseJobByIdQuery, GetGreenhouseJobByIdQueryVariables>) {
          const options = baseOptions === Apollo.skipToken ? baseOptions : {...defaultOptions, ...baseOptions}
          return Apollo.useSuspenseQuery<GetGreenhouseJobByIdQuery, GetGreenhouseJobByIdQueryVariables>(GetGreenhouseJobByIdDocument, options);
        }
export type GetGreenhouseJobByIdQueryHookResult = ReturnType<typeof useGetGreenhouseJobByIdQuery>;
export type GetGreenhouseJobByIdLazyQueryHookResult = ReturnType<typeof useGetGreenhouseJobByIdLazyQuery>;
export type GetGreenhouseJobByIdSuspenseQueryHookResult = ReturnType<typeof useGetGreenhouseJobByIdSuspenseQuery>;
export type GetGreenhouseJobByIdQueryResult = Apollo.QueryResult<GetGreenhouseJobByIdQuery, GetGreenhouseJobByIdQueryVariables>;
export const EnhanceJobFromAtsDocument = gql`
    mutation EnhanceJobFromATS($jobId: String!, $company: String!, $source: String!) {
  enhanceJobFromATS(jobId: $jobId, company: $company, source: $source) {
    success
    message
    job {
      id
      external_id
      source_id
      source_kind
      company_id
      company_key
      company {
        ...CompanyFields
      }
      title
      location
      url
      description
      publishedAt
      score
      score_reason
      is_remote_eu
      remote_eu_confidence
      remote_eu_reason
      skills {
        tag
        level
        confidence
        evidence
      }
      absolute_url
      internal_job_id
      requisition_id
      company_name
      publishedAt
      language
      metadata {
        id
        name
        value
        value_type
      }
      departments {
        id
        name
        child_ids
        parent_id
      }
      offices {
        id
        name
        location
        child_ids
        parent_id
      }
      questions {
        description
        label
        required
        fields {
          type
          name
        }
      }
      location_questions {
        description
        label
        required
        fields {
          type
          name
        }
      }
      compliance {
        type
        description
        questions {
          description
          label
          required
          fields {
            type
            name
          }
        }
      }
      demographic_questions {
        header
        description
        questions {
          description
          label
          required
          fields {
            type
            name
          }
        }
      }
      data_compliance {
        type
        requires_consent
        requires_processing_consent
        requires_retention_consent
        retention_period
        demographic_data_consent_applies
      }
      created_at
      updated_at
    }
  }
}
    ${CompanyFieldsFragmentDoc}`;
export type EnhanceJobFromAtsMutationFn = Apollo.MutationFunction<EnhanceJobFromAtsMutation, EnhanceJobFromAtsMutationVariables>;

/**
 * __useEnhanceJobFromAtsMutation__
 *
 * To run a mutation, you first call `useEnhanceJobFromAtsMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useEnhanceJobFromAtsMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [enhanceJobFromAtsMutation, { data, loading, error }] = useEnhanceJobFromAtsMutation({
 *   variables: {
 *      jobId: // value for 'jobId'
 *      company: // value for 'company'
 *      source: // value for 'source'
 *   },
 * });
 */
export function useEnhanceJobFromAtsMutation(baseOptions?: Apollo.MutationHookOptions<EnhanceJobFromAtsMutation, EnhanceJobFromAtsMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<EnhanceJobFromAtsMutation, EnhanceJobFromAtsMutationVariables>(EnhanceJobFromAtsDocument, options);
      }
export type EnhanceJobFromAtsMutationHookResult = ReturnType<typeof useEnhanceJobFromAtsMutation>;
export type EnhanceJobFromAtsMutationResult = Apollo.MutationResult<EnhanceJobFromAtsMutation>;
export type EnhanceJobFromAtsMutationOptions = Apollo.BaseMutationOptions<EnhanceJobFromAtsMutation, EnhanceJobFromAtsMutationVariables>;
export const MarkJobAppliedDocument = gql`
    mutation MarkJobApplied($id: Int!) {
  markJobApplied(id: $id) {
    id
    applied
    appliedAt
  }
}
    `;
export type MarkJobAppliedMutationFn = Apollo.MutationFunction<MarkJobAppliedMutation, MarkJobAppliedMutationVariables>;

/**
 * __useMarkJobAppliedMutation__
 *
 * To run a mutation, you first call `useMarkJobAppliedMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useMarkJobAppliedMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [markJobAppliedMutation, { data, loading, error }] = useMarkJobAppliedMutation({
 *   variables: {
 *      id: // value for 'id'
 *   },
 * });
 */
export function useMarkJobAppliedMutation(baseOptions?: Apollo.MutationHookOptions<MarkJobAppliedMutation, MarkJobAppliedMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<MarkJobAppliedMutation, MarkJobAppliedMutationVariables>(MarkJobAppliedDocument, options);
      }
export type MarkJobAppliedMutationHookResult = ReturnType<typeof useMarkJobAppliedMutation>;
export type MarkJobAppliedMutationResult = Apollo.MutationResult<MarkJobAppliedMutation>;
export type MarkJobAppliedMutationOptions = Apollo.BaseMutationOptions<MarkJobAppliedMutation, MarkJobAppliedMutationVariables>;
export const ArchiveJobDocument = gql`
    mutation ArchiveJob($id: Int!) {
  archiveJob(id: $id) {
    id
    archived
  }
}
    `;
export type ArchiveJobMutationFn = Apollo.MutationFunction<ArchiveJobMutation, ArchiveJobMutationVariables>;

/**
 * __useArchiveJobMutation__
 *
 * To run a mutation, you first call `useArchiveJobMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useArchiveJobMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [archiveJobMutation, { data, loading, error }] = useArchiveJobMutation({
 *   variables: {
 *      id: // value for 'id'
 *   },
 * });
 */
export function useArchiveJobMutation(baseOptions?: Apollo.MutationHookOptions<ArchiveJobMutation, ArchiveJobMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<ArchiveJobMutation, ArchiveJobMutationVariables>(ArchiveJobDocument, options);
      }
export type ArchiveJobMutationHookResult = ReturnType<typeof useArchiveJobMutation>;
export type ArchiveJobMutationResult = Apollo.MutationResult<ArchiveJobMutation>;
export type ArchiveJobMutationOptions = Apollo.BaseMutationOptions<ArchiveJobMutation, ArchiveJobMutationVariables>;
export const UnarchiveJobDocument = gql`
    mutation UnarchiveJob($id: Int!) {
  unarchiveJob(id: $id) {
    id
    archived
  }
}
    `;
export type UnarchiveJobMutationFn = Apollo.MutationFunction<UnarchiveJobMutation, UnarchiveJobMutationVariables>;

/**
 * __useUnarchiveJobMutation__
 *
 * To run a mutation, you first call `useUnarchiveJobMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useUnarchiveJobMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [unarchiveJobMutation, { data, loading, error }] = useUnarchiveJobMutation({
 *   variables: {
 *      id: // value for 'id'
 *   },
 * });
 */
export function useUnarchiveJobMutation(baseOptions?: Apollo.MutationHookOptions<UnarchiveJobMutation, UnarchiveJobMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<UnarchiveJobMutation, UnarchiveJobMutationVariables>(UnarchiveJobDocument, options);
      }
export type UnarchiveJobMutationHookResult = ReturnType<typeof useUnarchiveJobMutation>;
export type UnarchiveJobMutationResult = Apollo.MutationResult<UnarchiveJobMutation>;
export type UnarchiveJobMutationOptions = Apollo.BaseMutationOptions<UnarchiveJobMutation, UnarchiveJobMutationVariables>;
export const GetLangSmithPromptsDocument = gql`
    query GetLangSmithPrompts($isPublic: Boolean, $isArchived: Boolean, $query: String) {
  langsmithPrompts(isPublic: $isPublic, isArchived: $isArchived, query: $query) {
    id
    promptHandle
    fullName
    description
    readme
    tenantId
    createdAt
    updatedAt
    isPublic
    isArchived
    tags
    owner
    numLikes
    numDownloads
    numViews
    numCommits
    lastCommitHash
    likedByAuthUser
  }
}
    `;

/**
 * __useGetLangSmithPromptsQuery__
 *
 * To run a query within a React component, call `useGetLangSmithPromptsQuery` and pass it any options that fit your needs.
 * When your component renders, `useGetLangSmithPromptsQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useGetLangSmithPromptsQuery({
 *   variables: {
 *      isPublic: // value for 'isPublic'
 *      isArchived: // value for 'isArchived'
 *      query: // value for 'query'
 *   },
 * });
 */
export function useGetLangSmithPromptsQuery(baseOptions?: Apollo.QueryHookOptions<GetLangSmithPromptsQuery, GetLangSmithPromptsQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<GetLangSmithPromptsQuery, GetLangSmithPromptsQueryVariables>(GetLangSmithPromptsDocument, options);
      }
export function useGetLangSmithPromptsLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<GetLangSmithPromptsQuery, GetLangSmithPromptsQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<GetLangSmithPromptsQuery, GetLangSmithPromptsQueryVariables>(GetLangSmithPromptsDocument, options);
        }
// @ts-ignore
export function useGetLangSmithPromptsSuspenseQuery(baseOptions?: Apollo.SuspenseQueryHookOptions<GetLangSmithPromptsQuery, GetLangSmithPromptsQueryVariables>): Apollo.UseSuspenseQueryResult<GetLangSmithPromptsQuery, GetLangSmithPromptsQueryVariables>;
export function useGetLangSmithPromptsSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<GetLangSmithPromptsQuery, GetLangSmithPromptsQueryVariables>): Apollo.UseSuspenseQueryResult<GetLangSmithPromptsQuery | undefined, GetLangSmithPromptsQueryVariables>;
export function useGetLangSmithPromptsSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<GetLangSmithPromptsQuery, GetLangSmithPromptsQueryVariables>) {
          const options = baseOptions === Apollo.skipToken ? baseOptions : {...defaultOptions, ...baseOptions}
          return Apollo.useSuspenseQuery<GetLangSmithPromptsQuery, GetLangSmithPromptsQueryVariables>(GetLangSmithPromptsDocument, options);
        }
export type GetLangSmithPromptsQueryHookResult = ReturnType<typeof useGetLangSmithPromptsQuery>;
export type GetLangSmithPromptsLazyQueryHookResult = ReturnType<typeof useGetLangSmithPromptsLazyQuery>;
export type GetLangSmithPromptsSuspenseQueryHookResult = ReturnType<typeof useGetLangSmithPromptsSuspenseQuery>;
export type GetLangSmithPromptsQueryResult = Apollo.QueryResult<GetLangSmithPromptsQuery, GetLangSmithPromptsQueryVariables>;
export const GetLangSmithPromptDocument = gql`
    query GetLangSmithPrompt($promptIdentifier: String!) {
  langsmithPrompt(promptIdentifier: $promptIdentifier) {
    id
    promptHandle
    fullName
    description
    readme
    tenantId
    createdAt
    updatedAt
    isPublic
    isArchived
    tags
    owner
    numLikes
    numDownloads
    numViews
    numCommits
    lastCommitHash
    likedByAuthUser
  }
}
    `;

/**
 * __useGetLangSmithPromptQuery__
 *
 * To run a query within a React component, call `useGetLangSmithPromptQuery` and pass it any options that fit your needs.
 * When your component renders, `useGetLangSmithPromptQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useGetLangSmithPromptQuery({
 *   variables: {
 *      promptIdentifier: // value for 'promptIdentifier'
 *   },
 * });
 */
export function useGetLangSmithPromptQuery(baseOptions: Apollo.QueryHookOptions<GetLangSmithPromptQuery, GetLangSmithPromptQueryVariables> & ({ variables: GetLangSmithPromptQueryVariables; skip?: boolean; } | { skip: boolean; }) ) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<GetLangSmithPromptQuery, GetLangSmithPromptQueryVariables>(GetLangSmithPromptDocument, options);
      }
export function useGetLangSmithPromptLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<GetLangSmithPromptQuery, GetLangSmithPromptQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<GetLangSmithPromptQuery, GetLangSmithPromptQueryVariables>(GetLangSmithPromptDocument, options);
        }
// @ts-ignore
export function useGetLangSmithPromptSuspenseQuery(baseOptions?: Apollo.SuspenseQueryHookOptions<GetLangSmithPromptQuery, GetLangSmithPromptQueryVariables>): Apollo.UseSuspenseQueryResult<GetLangSmithPromptQuery, GetLangSmithPromptQueryVariables>;
export function useGetLangSmithPromptSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<GetLangSmithPromptQuery, GetLangSmithPromptQueryVariables>): Apollo.UseSuspenseQueryResult<GetLangSmithPromptQuery | undefined, GetLangSmithPromptQueryVariables>;
export function useGetLangSmithPromptSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<GetLangSmithPromptQuery, GetLangSmithPromptQueryVariables>) {
          const options = baseOptions === Apollo.skipToken ? baseOptions : {...defaultOptions, ...baseOptions}
          return Apollo.useSuspenseQuery<GetLangSmithPromptQuery, GetLangSmithPromptQueryVariables>(GetLangSmithPromptDocument, options);
        }
export type GetLangSmithPromptQueryHookResult = ReturnType<typeof useGetLangSmithPromptQuery>;
export type GetLangSmithPromptLazyQueryHookResult = ReturnType<typeof useGetLangSmithPromptLazyQuery>;
export type GetLangSmithPromptSuspenseQueryHookResult = ReturnType<typeof useGetLangSmithPromptSuspenseQuery>;
export type GetLangSmithPromptQueryResult = Apollo.QueryResult<GetLangSmithPromptQuery, GetLangSmithPromptQueryVariables>;
export const GetLangSmithPromptCommitDocument = gql`
    query GetLangSmithPromptCommit($promptIdentifier: String!, $includeModel: Boolean) {
  langsmithPromptCommit(
    promptIdentifier: $promptIdentifier
    includeModel: $includeModel
  ) {
    owner
    promptName
    commitHash
    manifest
    examples
  }
}
    `;

/**
 * __useGetLangSmithPromptCommitQuery__
 *
 * To run a query within a React component, call `useGetLangSmithPromptCommitQuery` and pass it any options that fit your needs.
 * When your component renders, `useGetLangSmithPromptCommitQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useGetLangSmithPromptCommitQuery({
 *   variables: {
 *      promptIdentifier: // value for 'promptIdentifier'
 *      includeModel: // value for 'includeModel'
 *   },
 * });
 */
export function useGetLangSmithPromptCommitQuery(baseOptions: Apollo.QueryHookOptions<GetLangSmithPromptCommitQuery, GetLangSmithPromptCommitQueryVariables> & ({ variables: GetLangSmithPromptCommitQueryVariables; skip?: boolean; } | { skip: boolean; }) ) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<GetLangSmithPromptCommitQuery, GetLangSmithPromptCommitQueryVariables>(GetLangSmithPromptCommitDocument, options);
      }
export function useGetLangSmithPromptCommitLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<GetLangSmithPromptCommitQuery, GetLangSmithPromptCommitQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<GetLangSmithPromptCommitQuery, GetLangSmithPromptCommitQueryVariables>(GetLangSmithPromptCommitDocument, options);
        }
// @ts-ignore
export function useGetLangSmithPromptCommitSuspenseQuery(baseOptions?: Apollo.SuspenseQueryHookOptions<GetLangSmithPromptCommitQuery, GetLangSmithPromptCommitQueryVariables>): Apollo.UseSuspenseQueryResult<GetLangSmithPromptCommitQuery, GetLangSmithPromptCommitQueryVariables>;
export function useGetLangSmithPromptCommitSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<GetLangSmithPromptCommitQuery, GetLangSmithPromptCommitQueryVariables>): Apollo.UseSuspenseQueryResult<GetLangSmithPromptCommitQuery | undefined, GetLangSmithPromptCommitQueryVariables>;
export function useGetLangSmithPromptCommitSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<GetLangSmithPromptCommitQuery, GetLangSmithPromptCommitQueryVariables>) {
          const options = baseOptions === Apollo.skipToken ? baseOptions : {...defaultOptions, ...baseOptions}
          return Apollo.useSuspenseQuery<GetLangSmithPromptCommitQuery, GetLangSmithPromptCommitQueryVariables>(GetLangSmithPromptCommitDocument, options);
        }
export type GetLangSmithPromptCommitQueryHookResult = ReturnType<typeof useGetLangSmithPromptCommitQuery>;
export type GetLangSmithPromptCommitLazyQueryHookResult = ReturnType<typeof useGetLangSmithPromptCommitLazyQuery>;
export type GetLangSmithPromptCommitSuspenseQueryHookResult = ReturnType<typeof useGetLangSmithPromptCommitSuspenseQuery>;
export type GetLangSmithPromptCommitQueryResult = Apollo.QueryResult<GetLangSmithPromptCommitQuery, GetLangSmithPromptCommitQueryVariables>;
export const CreateLangSmithPromptDocument = gql`
    mutation CreateLangSmithPrompt($promptIdentifier: String!, $input: CreateLangSmithPromptInput) {
  createLangSmithPrompt(promptIdentifier: $promptIdentifier, input: $input) {
    id
    promptHandle
    fullName
    description
    readme
    tenantId
    createdAt
    updatedAt
    isPublic
    isArchived
    tags
    owner
    numLikes
    numDownloads
    numViews
    numCommits
    lastCommitHash
    likedByAuthUser
  }
}
    `;
export type CreateLangSmithPromptMutationFn = Apollo.MutationFunction<CreateLangSmithPromptMutation, CreateLangSmithPromptMutationVariables>;

/**
 * __useCreateLangSmithPromptMutation__
 *
 * To run a mutation, you first call `useCreateLangSmithPromptMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useCreateLangSmithPromptMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [createLangSmithPromptMutation, { data, loading, error }] = useCreateLangSmithPromptMutation({
 *   variables: {
 *      promptIdentifier: // value for 'promptIdentifier'
 *      input: // value for 'input'
 *   },
 * });
 */
export function useCreateLangSmithPromptMutation(baseOptions?: Apollo.MutationHookOptions<CreateLangSmithPromptMutation, CreateLangSmithPromptMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<CreateLangSmithPromptMutation, CreateLangSmithPromptMutationVariables>(CreateLangSmithPromptDocument, options);
      }
export type CreateLangSmithPromptMutationHookResult = ReturnType<typeof useCreateLangSmithPromptMutation>;
export type CreateLangSmithPromptMutationResult = Apollo.MutationResult<CreateLangSmithPromptMutation>;
export type CreateLangSmithPromptMutationOptions = Apollo.BaseMutationOptions<CreateLangSmithPromptMutation, CreateLangSmithPromptMutationVariables>;
export const UpdateLangSmithPromptDocument = gql`
    mutation UpdateLangSmithPrompt($promptIdentifier: String!, $input: UpdateLangSmithPromptInput!) {
  updateLangSmithPrompt(promptIdentifier: $promptIdentifier, input: $input) {
    id
    promptHandle
    fullName
    description
    readme
    tenantId
    createdAt
    updatedAt
    isPublic
    isArchived
    tags
    owner
    numLikes
    numDownloads
    numViews
    numCommits
    lastCommitHash
    likedByAuthUser
  }
}
    `;
export type UpdateLangSmithPromptMutationFn = Apollo.MutationFunction<UpdateLangSmithPromptMutation, UpdateLangSmithPromptMutationVariables>;

/**
 * __useUpdateLangSmithPromptMutation__
 *
 * To run a mutation, you first call `useUpdateLangSmithPromptMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useUpdateLangSmithPromptMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [updateLangSmithPromptMutation, { data, loading, error }] = useUpdateLangSmithPromptMutation({
 *   variables: {
 *      promptIdentifier: // value for 'promptIdentifier'
 *      input: // value for 'input'
 *   },
 * });
 */
export function useUpdateLangSmithPromptMutation(baseOptions?: Apollo.MutationHookOptions<UpdateLangSmithPromptMutation, UpdateLangSmithPromptMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<UpdateLangSmithPromptMutation, UpdateLangSmithPromptMutationVariables>(UpdateLangSmithPromptDocument, options);
      }
export type UpdateLangSmithPromptMutationHookResult = ReturnType<typeof useUpdateLangSmithPromptMutation>;
export type UpdateLangSmithPromptMutationResult = Apollo.MutationResult<UpdateLangSmithPromptMutation>;
export type UpdateLangSmithPromptMutationOptions = Apollo.BaseMutationOptions<UpdateLangSmithPromptMutation, UpdateLangSmithPromptMutationVariables>;
export const DeleteLangSmithPromptDocument = gql`
    mutation DeleteLangSmithPrompt($promptIdentifier: String!) {
  deleteLangSmithPrompt(promptIdentifier: $promptIdentifier)
}
    `;
export type DeleteLangSmithPromptMutationFn = Apollo.MutationFunction<DeleteLangSmithPromptMutation, DeleteLangSmithPromptMutationVariables>;

/**
 * __useDeleteLangSmithPromptMutation__
 *
 * To run a mutation, you first call `useDeleteLangSmithPromptMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useDeleteLangSmithPromptMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [deleteLangSmithPromptMutation, { data, loading, error }] = useDeleteLangSmithPromptMutation({
 *   variables: {
 *      promptIdentifier: // value for 'promptIdentifier'
 *   },
 * });
 */
export function useDeleteLangSmithPromptMutation(baseOptions?: Apollo.MutationHookOptions<DeleteLangSmithPromptMutation, DeleteLangSmithPromptMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<DeleteLangSmithPromptMutation, DeleteLangSmithPromptMutationVariables>(DeleteLangSmithPromptDocument, options);
      }
export type DeleteLangSmithPromptMutationHookResult = ReturnType<typeof useDeleteLangSmithPromptMutation>;
export type DeleteLangSmithPromptMutationResult = Apollo.MutationResult<DeleteLangSmithPromptMutation>;
export type DeleteLangSmithPromptMutationOptions = Apollo.BaseMutationOptions<DeleteLangSmithPromptMutation, DeleteLangSmithPromptMutationVariables>;
export const PushLangSmithPromptDocument = gql`
    mutation PushLangSmithPrompt($promptIdentifier: String!, $input: PushLangSmithPromptInput) {
  pushLangSmithPrompt(promptIdentifier: $promptIdentifier, input: $input)
}
    `;
export type PushLangSmithPromptMutationFn = Apollo.MutationFunction<PushLangSmithPromptMutation, PushLangSmithPromptMutationVariables>;

/**
 * __usePushLangSmithPromptMutation__
 *
 * To run a mutation, you first call `usePushLangSmithPromptMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `usePushLangSmithPromptMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [pushLangSmithPromptMutation, { data, loading, error }] = usePushLangSmithPromptMutation({
 *   variables: {
 *      promptIdentifier: // value for 'promptIdentifier'
 *      input: // value for 'input'
 *   },
 * });
 */
export function usePushLangSmithPromptMutation(baseOptions?: Apollo.MutationHookOptions<PushLangSmithPromptMutation, PushLangSmithPromptMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<PushLangSmithPromptMutation, PushLangSmithPromptMutationVariables>(PushLangSmithPromptDocument, options);
      }
export type PushLangSmithPromptMutationHookResult = ReturnType<typeof usePushLangSmithPromptMutation>;
export type PushLangSmithPromptMutationResult = Apollo.MutationResult<PushLangSmithPromptMutation>;
export type PushLangSmithPromptMutationOptions = Apollo.BaseMutationOptions<PushLangSmithPromptMutation, PushLangSmithPromptMutationVariables>;
export const GetOpportunitiesDocument = gql`
    query GetOpportunities($companyId: Int, $status: String, $limit: Int, $offset: Int) {
  opportunities(
    companyId: $companyId
    status: $status
    limit: $limit
    offset: $offset
  ) {
    opportunities {
      id
      title
      url
      source
      status
      rewardUsd
      rewardText
      deadline
      tags
      score
      applied
      appliedAt
      applicationStatus
      companyId
      company {
        id
        name
        website
      }
      createdAt
      updatedAt
    }
    totalCount
  }
}
    `;

/**
 * __useGetOpportunitiesQuery__
 *
 * To run a query within a React component, call `useGetOpportunitiesQuery` and pass it any options that fit your needs.
 * When your component renders, `useGetOpportunitiesQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useGetOpportunitiesQuery({
 *   variables: {
 *      companyId: // value for 'companyId'
 *      status: // value for 'status'
 *      limit: // value for 'limit'
 *      offset: // value for 'offset'
 *   },
 * });
 */
export function useGetOpportunitiesQuery(baseOptions?: Apollo.QueryHookOptions<GetOpportunitiesQuery, GetOpportunitiesQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<GetOpportunitiesQuery, GetOpportunitiesQueryVariables>(GetOpportunitiesDocument, options);
      }
export function useGetOpportunitiesLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<GetOpportunitiesQuery, GetOpportunitiesQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<GetOpportunitiesQuery, GetOpportunitiesQueryVariables>(GetOpportunitiesDocument, options);
        }
// @ts-ignore
export function useGetOpportunitiesSuspenseQuery(baseOptions?: Apollo.SuspenseQueryHookOptions<GetOpportunitiesQuery, GetOpportunitiesQueryVariables>): Apollo.UseSuspenseQueryResult<GetOpportunitiesQuery, GetOpportunitiesQueryVariables>;
export function useGetOpportunitiesSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<GetOpportunitiesQuery, GetOpportunitiesQueryVariables>): Apollo.UseSuspenseQueryResult<GetOpportunitiesQuery | undefined, GetOpportunitiesQueryVariables>;
export function useGetOpportunitiesSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<GetOpportunitiesQuery, GetOpportunitiesQueryVariables>) {
          const options = baseOptions === Apollo.skipToken ? baseOptions : {...defaultOptions, ...baseOptions}
          return Apollo.useSuspenseQuery<GetOpportunitiesQuery, GetOpportunitiesQueryVariables>(GetOpportunitiesDocument, options);
        }
export type GetOpportunitiesQueryHookResult = ReturnType<typeof useGetOpportunitiesQuery>;
export type GetOpportunitiesLazyQueryHookResult = ReturnType<typeof useGetOpportunitiesLazyQuery>;
export type GetOpportunitiesSuspenseQueryHookResult = ReturnType<typeof useGetOpportunitiesSuspenseQuery>;
export type GetOpportunitiesQueryResult = Apollo.QueryResult<GetOpportunitiesQuery, GetOpportunitiesQueryVariables>;
export const GetOpportunityDocument = gql`
    query GetOpportunity($id: String!) {
  opportunity(id: $id) {
    id
    title
    url
    source
    status
    rewardUsd
    rewardText
    startDate
    endDate
    deadline
    firstSeen
    lastSeen
    score
    rawContext
    metadata
    applied
    appliedAt
    applicationStatus
    applicationNotes
    tags
    companyId
    contactId
    company {
      id
      name
      website
    }
    createdAt
    updatedAt
  }
}
    `;

/**
 * __useGetOpportunityQuery__
 *
 * To run a query within a React component, call `useGetOpportunityQuery` and pass it any options that fit your needs.
 * When your component renders, `useGetOpportunityQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useGetOpportunityQuery({
 *   variables: {
 *      id: // value for 'id'
 *   },
 * });
 */
export function useGetOpportunityQuery(baseOptions: Apollo.QueryHookOptions<GetOpportunityQuery, GetOpportunityQueryVariables> & ({ variables: GetOpportunityQueryVariables; skip?: boolean; } | { skip: boolean; }) ) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<GetOpportunityQuery, GetOpportunityQueryVariables>(GetOpportunityDocument, options);
      }
export function useGetOpportunityLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<GetOpportunityQuery, GetOpportunityQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<GetOpportunityQuery, GetOpportunityQueryVariables>(GetOpportunityDocument, options);
        }
// @ts-ignore
export function useGetOpportunitySuspenseQuery(baseOptions?: Apollo.SuspenseQueryHookOptions<GetOpportunityQuery, GetOpportunityQueryVariables>): Apollo.UseSuspenseQueryResult<GetOpportunityQuery, GetOpportunityQueryVariables>;
export function useGetOpportunitySuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<GetOpportunityQuery, GetOpportunityQueryVariables>): Apollo.UseSuspenseQueryResult<GetOpportunityQuery | undefined, GetOpportunityQueryVariables>;
export function useGetOpportunitySuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<GetOpportunityQuery, GetOpportunityQueryVariables>) {
          const options = baseOptions === Apollo.skipToken ? baseOptions : {...defaultOptions, ...baseOptions}
          return Apollo.useSuspenseQuery<GetOpportunityQuery, GetOpportunityQueryVariables>(GetOpportunityDocument, options);
        }
export type GetOpportunityQueryHookResult = ReturnType<typeof useGetOpportunityQuery>;
export type GetOpportunityLazyQueryHookResult = ReturnType<typeof useGetOpportunityLazyQuery>;
export type GetOpportunitySuspenseQueryHookResult = ReturnType<typeof useGetOpportunitySuspenseQuery>;
export type GetOpportunityQueryResult = Apollo.QueryResult<GetOpportunityQuery, GetOpportunityQueryVariables>;
export const CreateOpportunityDocument = gql`
    mutation CreateOpportunity($input: CreateOpportunityInput!) {
  createOpportunity(input: $input) {
    id
    title
    url
    source
    status
    companyId
    createdAt
  }
}
    `;
export type CreateOpportunityMutationFn = Apollo.MutationFunction<CreateOpportunityMutation, CreateOpportunityMutationVariables>;

/**
 * __useCreateOpportunityMutation__
 *
 * To run a mutation, you first call `useCreateOpportunityMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useCreateOpportunityMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [createOpportunityMutation, { data, loading, error }] = useCreateOpportunityMutation({
 *   variables: {
 *      input: // value for 'input'
 *   },
 * });
 */
export function useCreateOpportunityMutation(baseOptions?: Apollo.MutationHookOptions<CreateOpportunityMutation, CreateOpportunityMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<CreateOpportunityMutation, CreateOpportunityMutationVariables>(CreateOpportunityDocument, options);
      }
export type CreateOpportunityMutationHookResult = ReturnType<typeof useCreateOpportunityMutation>;
export type CreateOpportunityMutationResult = Apollo.MutationResult<CreateOpportunityMutation>;
export type CreateOpportunityMutationOptions = Apollo.BaseMutationOptions<CreateOpportunityMutation, CreateOpportunityMutationVariables>;
export const UpdateOpportunityDocument = gql`
    mutation UpdateOpportunity($id: String!, $input: UpdateOpportunityInput!) {
  updateOpportunity(id: $id, input: $input) {
    id
    title
    status
    applied
    appliedAt
    applicationStatus
    applicationNotes
    updatedAt
  }
}
    `;
export type UpdateOpportunityMutationFn = Apollo.MutationFunction<UpdateOpportunityMutation, UpdateOpportunityMutationVariables>;

/**
 * __useUpdateOpportunityMutation__
 *
 * To run a mutation, you first call `useUpdateOpportunityMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useUpdateOpportunityMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [updateOpportunityMutation, { data, loading, error }] = useUpdateOpportunityMutation({
 *   variables: {
 *      id: // value for 'id'
 *      input: // value for 'input'
 *   },
 * });
 */
export function useUpdateOpportunityMutation(baseOptions?: Apollo.MutationHookOptions<UpdateOpportunityMutation, UpdateOpportunityMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<UpdateOpportunityMutation, UpdateOpportunityMutationVariables>(UpdateOpportunityDocument, options);
      }
export type UpdateOpportunityMutationHookResult = ReturnType<typeof useUpdateOpportunityMutation>;
export type UpdateOpportunityMutationResult = Apollo.MutationResult<UpdateOpportunityMutation>;
export type UpdateOpportunityMutationOptions = Apollo.BaseMutationOptions<UpdateOpportunityMutation, UpdateOpportunityMutationVariables>;
export const DeleteOpportunityDocument = gql`
    mutation DeleteOpportunity($id: String!) {
  deleteOpportunity(id: $id) {
    success
    message
  }
}
    `;
export type DeleteOpportunityMutationFn = Apollo.MutationFunction<DeleteOpportunityMutation, DeleteOpportunityMutationVariables>;

/**
 * __useDeleteOpportunityMutation__
 *
 * To run a mutation, you first call `useDeleteOpportunityMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useDeleteOpportunityMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [deleteOpportunityMutation, { data, loading, error }] = useDeleteOpportunityMutation({
 *   variables: {
 *      id: // value for 'id'
 *   },
 * });
 */
export function useDeleteOpportunityMutation(baseOptions?: Apollo.MutationHookOptions<DeleteOpportunityMutation, DeleteOpportunityMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<DeleteOpportunityMutation, DeleteOpportunityMutationVariables>(DeleteOpportunityDocument, options);
      }
export type DeleteOpportunityMutationHookResult = ReturnType<typeof useDeleteOpportunityMutation>;
export type DeleteOpportunityMutationResult = Apollo.MutationResult<DeleteOpportunityMutation>;
export type DeleteOpportunityMutationOptions = Apollo.BaseMutationOptions<DeleteOpportunityMutation, DeleteOpportunityMutationVariables>;
export const GetPromptsDocument = gql`
    query GetPrompts {
  prompts {
    name
    type
    content
    tags
    labels
    versions
    lastUpdatedAt
    lastConfig
    usageCount
    lastUsedBy
  }
}
    `;

/**
 * __useGetPromptsQuery__
 *
 * To run a query within a React component, call `useGetPromptsQuery` and pass it any options that fit your needs.
 * When your component renders, `useGetPromptsQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useGetPromptsQuery({
 *   variables: {
 *   },
 * });
 */
export function useGetPromptsQuery(baseOptions?: Apollo.QueryHookOptions<GetPromptsQuery, GetPromptsQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<GetPromptsQuery, GetPromptsQueryVariables>(GetPromptsDocument, options);
      }
export function useGetPromptsLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<GetPromptsQuery, GetPromptsQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<GetPromptsQuery, GetPromptsQueryVariables>(GetPromptsDocument, options);
        }
// @ts-ignore
export function useGetPromptsSuspenseQuery(baseOptions?: Apollo.SuspenseQueryHookOptions<GetPromptsQuery, GetPromptsQueryVariables>): Apollo.UseSuspenseQueryResult<GetPromptsQuery, GetPromptsQueryVariables>;
export function useGetPromptsSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<GetPromptsQuery, GetPromptsQueryVariables>): Apollo.UseSuspenseQueryResult<GetPromptsQuery | undefined, GetPromptsQueryVariables>;
export function useGetPromptsSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<GetPromptsQuery, GetPromptsQueryVariables>) {
          const options = baseOptions === Apollo.skipToken ? baseOptions : {...defaultOptions, ...baseOptions}
          return Apollo.useSuspenseQuery<GetPromptsQuery, GetPromptsQueryVariables>(GetPromptsDocument, options);
        }
export type GetPromptsQueryHookResult = ReturnType<typeof useGetPromptsQuery>;
export type GetPromptsLazyQueryHookResult = ReturnType<typeof useGetPromptsLazyQuery>;
export type GetPromptsSuspenseQueryHookResult = ReturnType<typeof useGetPromptsSuspenseQuery>;
export type GetPromptsQueryResult = Apollo.QueryResult<GetPromptsQuery, GetPromptsQueryVariables>;
export const GetMyPromptUsageDocument = gql`
    query GetMyPromptUsage($limit: Int) {
  myPromptUsage(limit: $limit) {
    promptName
    userEmail
    version
    label
    usedAt
    traceId
  }
}
    `;

/**
 * __useGetMyPromptUsageQuery__
 *
 * To run a query within a React component, call `useGetMyPromptUsageQuery` and pass it any options that fit your needs.
 * When your component renders, `useGetMyPromptUsageQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useGetMyPromptUsageQuery({
 *   variables: {
 *      limit: // value for 'limit'
 *   },
 * });
 */
export function useGetMyPromptUsageQuery(baseOptions?: Apollo.QueryHookOptions<GetMyPromptUsageQuery, GetMyPromptUsageQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<GetMyPromptUsageQuery, GetMyPromptUsageQueryVariables>(GetMyPromptUsageDocument, options);
      }
export function useGetMyPromptUsageLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<GetMyPromptUsageQuery, GetMyPromptUsageQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<GetMyPromptUsageQuery, GetMyPromptUsageQueryVariables>(GetMyPromptUsageDocument, options);
        }
// @ts-ignore
export function useGetMyPromptUsageSuspenseQuery(baseOptions?: Apollo.SuspenseQueryHookOptions<GetMyPromptUsageQuery, GetMyPromptUsageQueryVariables>): Apollo.UseSuspenseQueryResult<GetMyPromptUsageQuery, GetMyPromptUsageQueryVariables>;
export function useGetMyPromptUsageSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<GetMyPromptUsageQuery, GetMyPromptUsageQueryVariables>): Apollo.UseSuspenseQueryResult<GetMyPromptUsageQuery | undefined, GetMyPromptUsageQueryVariables>;
export function useGetMyPromptUsageSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<GetMyPromptUsageQuery, GetMyPromptUsageQueryVariables>) {
          const options = baseOptions === Apollo.skipToken ? baseOptions : {...defaultOptions, ...baseOptions}
          return Apollo.useSuspenseQuery<GetMyPromptUsageQuery, GetMyPromptUsageQueryVariables>(GetMyPromptUsageDocument, options);
        }
export type GetMyPromptUsageQueryHookResult = ReturnType<typeof useGetMyPromptUsageQuery>;
export type GetMyPromptUsageLazyQueryHookResult = ReturnType<typeof useGetMyPromptUsageLazyQuery>;
export type GetMyPromptUsageSuspenseQueryHookResult = ReturnType<typeof useGetMyPromptUsageSuspenseQuery>;
export type GetMyPromptUsageQueryResult = Apollo.QueryResult<GetMyPromptUsageQuery, GetMyPromptUsageQueryVariables>;
export const CreatePromptDocument = gql`
    mutation CreatePrompt($input: CreatePromptInput!) {
  createPrompt(input: $input) {
    name
    version
    type
    labels
    tags
    createdBy
  }
}
    `;
export type CreatePromptMutationFn = Apollo.MutationFunction<CreatePromptMutation, CreatePromptMutationVariables>;

/**
 * __useCreatePromptMutation__
 *
 * To run a mutation, you first call `useCreatePromptMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useCreatePromptMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [createPromptMutation, { data, loading, error }] = useCreatePromptMutation({
 *   variables: {
 *      input: // value for 'input'
 *   },
 * });
 */
export function useCreatePromptMutation(baseOptions?: Apollo.MutationHookOptions<CreatePromptMutation, CreatePromptMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<CreatePromptMutation, CreatePromptMutationVariables>(CreatePromptDocument, options);
      }
export type CreatePromptMutationHookResult = ReturnType<typeof useCreatePromptMutation>;
export type CreatePromptMutationResult = Apollo.MutationResult<CreatePromptMutation>;
export type CreatePromptMutationOptions = Apollo.BaseMutationOptions<CreatePromptMutation, CreatePromptMutationVariables>;
export const ResumeStatusDocument = gql`
    query ResumeStatus($email: String!) {
  resumeStatus(email: $email) {
    exists
    resume_id
    chunk_count
    filename
    ingested_at
  }
}
    `;

/**
 * __useResumeStatusQuery__
 *
 * To run a query within a React component, call `useResumeStatusQuery` and pass it any options that fit your needs.
 * When your component renders, `useResumeStatusQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useResumeStatusQuery({
 *   variables: {
 *      email: // value for 'email'
 *   },
 * });
 */
export function useResumeStatusQuery(baseOptions: Apollo.QueryHookOptions<ResumeStatusQuery, ResumeStatusQueryVariables> & ({ variables: ResumeStatusQueryVariables; skip?: boolean; } | { skip: boolean; }) ) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<ResumeStatusQuery, ResumeStatusQueryVariables>(ResumeStatusDocument, options);
      }
export function useResumeStatusLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<ResumeStatusQuery, ResumeStatusQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<ResumeStatusQuery, ResumeStatusQueryVariables>(ResumeStatusDocument, options);
        }
// @ts-ignore
export function useResumeStatusSuspenseQuery(baseOptions?: Apollo.SuspenseQueryHookOptions<ResumeStatusQuery, ResumeStatusQueryVariables>): Apollo.UseSuspenseQueryResult<ResumeStatusQuery, ResumeStatusQueryVariables>;
export function useResumeStatusSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<ResumeStatusQuery, ResumeStatusQueryVariables>): Apollo.UseSuspenseQueryResult<ResumeStatusQuery | undefined, ResumeStatusQueryVariables>;
export function useResumeStatusSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<ResumeStatusQuery, ResumeStatusQueryVariables>) {
          const options = baseOptions === Apollo.skipToken ? baseOptions : {...defaultOptions, ...baseOptions}
          return Apollo.useSuspenseQuery<ResumeStatusQuery, ResumeStatusQueryVariables>(ResumeStatusDocument, options);
        }
export type ResumeStatusQueryHookResult = ReturnType<typeof useResumeStatusQuery>;
export type ResumeStatusLazyQueryHookResult = ReturnType<typeof useResumeStatusLazyQuery>;
export type ResumeStatusSuspenseQueryHookResult = ReturnType<typeof useResumeStatusSuspenseQuery>;
export type ResumeStatusQueryResult = Apollo.QueryResult<ResumeStatusQuery, ResumeStatusQueryVariables>;
export const UploadResumeDocument = gql`
    mutation UploadResume($email: String!, $resumePdf: String!, $filename: String!) {
  uploadResume(email: $email, resumePdf: $resumePdf, filename: $filename) {
    success
    job_id
    tier
    status
  }
}
    `;
export type UploadResumeMutationFn = Apollo.MutationFunction<UploadResumeMutation, UploadResumeMutationVariables>;

/**
 * __useUploadResumeMutation__
 *
 * To run a mutation, you first call `useUploadResumeMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useUploadResumeMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [uploadResumeMutation, { data, loading, error }] = useUploadResumeMutation({
 *   variables: {
 *      email: // value for 'email'
 *      resumePdf: // value for 'resumePdf'
 *      filename: // value for 'filename'
 *   },
 * });
 */
export function useUploadResumeMutation(baseOptions?: Apollo.MutationHookOptions<UploadResumeMutation, UploadResumeMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<UploadResumeMutation, UploadResumeMutationVariables>(UploadResumeDocument, options);
      }
export type UploadResumeMutationHookResult = ReturnType<typeof useUploadResumeMutation>;
export type UploadResumeMutationResult = Apollo.MutationResult<UploadResumeMutation>;
export type UploadResumeMutationOptions = Apollo.BaseMutationOptions<UploadResumeMutation, UploadResumeMutationVariables>;
export const IngestResumeParseDocument = gql`
    mutation IngestResumeParse($email: String!, $job_id: String!, $filename: String!) {
  ingestResumeParse(email: $email, job_id: $job_id, filename: $filename) {
    success
    status
    job_id
    resume_id
    chunks_stored
    error
  }
}
    `;
export type IngestResumeParseMutationFn = Apollo.MutationFunction<IngestResumeParseMutation, IngestResumeParseMutationVariables>;

/**
 * __useIngestResumeParseMutation__
 *
 * To run a mutation, you first call `useIngestResumeParseMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useIngestResumeParseMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [ingestResumeParseMutation, { data, loading, error }] = useIngestResumeParseMutation({
 *   variables: {
 *      email: // value for 'email'
 *      job_id: // value for 'job_id'
 *      filename: // value for 'filename'
 *   },
 * });
 */
export function useIngestResumeParseMutation(baseOptions?: Apollo.MutationHookOptions<IngestResumeParseMutation, IngestResumeParseMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<IngestResumeParseMutation, IngestResumeParseMutationVariables>(IngestResumeParseDocument, options);
      }
export type IngestResumeParseMutationHookResult = ReturnType<typeof useIngestResumeParseMutation>;
export type IngestResumeParseMutationResult = Apollo.MutationResult<IngestResumeParseMutation>;
export type IngestResumeParseMutationOptions = Apollo.BaseMutationOptions<IngestResumeParseMutation, IngestResumeParseMutationVariables>;
export const AskAboutResumeDocument = gql`
    query AskAboutResume($email: String!, $question: String!) {
  askAboutResume(email: $email, question: $question) {
    answer
    context_count
  }
}
    `;

/**
 * __useAskAboutResumeQuery__
 *
 * To run a query within a React component, call `useAskAboutResumeQuery` and pass it any options that fit your needs.
 * When your component renders, `useAskAboutResumeQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useAskAboutResumeQuery({
 *   variables: {
 *      email: // value for 'email'
 *      question: // value for 'question'
 *   },
 * });
 */
export function useAskAboutResumeQuery(baseOptions: Apollo.QueryHookOptions<AskAboutResumeQuery, AskAboutResumeQueryVariables> & ({ variables: AskAboutResumeQueryVariables; skip?: boolean; } | { skip: boolean; }) ) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<AskAboutResumeQuery, AskAboutResumeQueryVariables>(AskAboutResumeDocument, options);
      }
export function useAskAboutResumeLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<AskAboutResumeQuery, AskAboutResumeQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<AskAboutResumeQuery, AskAboutResumeQueryVariables>(AskAboutResumeDocument, options);
        }
// @ts-ignore
export function useAskAboutResumeSuspenseQuery(baseOptions?: Apollo.SuspenseQueryHookOptions<AskAboutResumeQuery, AskAboutResumeQueryVariables>): Apollo.UseSuspenseQueryResult<AskAboutResumeQuery, AskAboutResumeQueryVariables>;
export function useAskAboutResumeSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<AskAboutResumeQuery, AskAboutResumeQueryVariables>): Apollo.UseSuspenseQueryResult<AskAboutResumeQuery | undefined, AskAboutResumeQueryVariables>;
export function useAskAboutResumeSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<AskAboutResumeQuery, AskAboutResumeQueryVariables>) {
          const options = baseOptions === Apollo.skipToken ? baseOptions : {...defaultOptions, ...baseOptions}
          return Apollo.useSuspenseQuery<AskAboutResumeQuery, AskAboutResumeQueryVariables>(AskAboutResumeDocument, options);
        }
export type AskAboutResumeQueryHookResult = ReturnType<typeof useAskAboutResumeQuery>;
export type AskAboutResumeLazyQueryHookResult = ReturnType<typeof useAskAboutResumeLazyQuery>;
export type AskAboutResumeSuspenseQueryHookResult = ReturnType<typeof useAskAboutResumeSuspenseQuery>;
export type AskAboutResumeQueryResult = Apollo.QueryResult<AskAboutResumeQuery, AskAboutResumeQueryVariables>;
export const GetTasksDocument = gql`
    query GetTasks($status: String, $priority: String, $limit: Int, $offset: Int) {
  tasks(status: $status, priority: $priority, limit: $limit, offset: $offset) {
    tasks {
      id
      title
      description
      status
      priority
      dueDate
      completedAt
      entityType
      entityId
      tags
      createdAt
      updatedAt
    }
    totalCount
  }
}
    `;

/**
 * __useGetTasksQuery__
 *
 * To run a query within a React component, call `useGetTasksQuery` and pass it any options that fit your needs.
 * When your component renders, `useGetTasksQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useGetTasksQuery({
 *   variables: {
 *      status: // value for 'status'
 *      priority: // value for 'priority'
 *      limit: // value for 'limit'
 *      offset: // value for 'offset'
 *   },
 * });
 */
export function useGetTasksQuery(baseOptions?: Apollo.QueryHookOptions<GetTasksQuery, GetTasksQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<GetTasksQuery, GetTasksQueryVariables>(GetTasksDocument, options);
      }
export function useGetTasksLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<GetTasksQuery, GetTasksQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<GetTasksQuery, GetTasksQueryVariables>(GetTasksDocument, options);
        }
// @ts-ignore
export function useGetTasksSuspenseQuery(baseOptions?: Apollo.SuspenseQueryHookOptions<GetTasksQuery, GetTasksQueryVariables>): Apollo.UseSuspenseQueryResult<GetTasksQuery, GetTasksQueryVariables>;
export function useGetTasksSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<GetTasksQuery, GetTasksQueryVariables>): Apollo.UseSuspenseQueryResult<GetTasksQuery | undefined, GetTasksQueryVariables>;
export function useGetTasksSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<GetTasksQuery, GetTasksQueryVariables>) {
          const options = baseOptions === Apollo.skipToken ? baseOptions : {...defaultOptions, ...baseOptions}
          return Apollo.useSuspenseQuery<GetTasksQuery, GetTasksQueryVariables>(GetTasksDocument, options);
        }
export type GetTasksQueryHookResult = ReturnType<typeof useGetTasksQuery>;
export type GetTasksLazyQueryHookResult = ReturnType<typeof useGetTasksLazyQuery>;
export type GetTasksSuspenseQueryHookResult = ReturnType<typeof useGetTasksSuspenseQuery>;
export type GetTasksQueryResult = Apollo.QueryResult<GetTasksQuery, GetTasksQueryVariables>;
export const GetTaskDocument = gql`
    query GetTask($id: Int!) {
  task(id: $id) {
    id
    title
    description
    status
    priority
    dueDate
    completedAt
    entityType
    entityId
    tags
    createdAt
    updatedAt
  }
}
    `;

/**
 * __useGetTaskQuery__
 *
 * To run a query within a React component, call `useGetTaskQuery` and pass it any options that fit your needs.
 * When your component renders, `useGetTaskQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useGetTaskQuery({
 *   variables: {
 *      id: // value for 'id'
 *   },
 * });
 */
export function useGetTaskQuery(baseOptions: Apollo.QueryHookOptions<GetTaskQuery, GetTaskQueryVariables> & ({ variables: GetTaskQueryVariables; skip?: boolean; } | { skip: boolean; }) ) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<GetTaskQuery, GetTaskQueryVariables>(GetTaskDocument, options);
      }
export function useGetTaskLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<GetTaskQuery, GetTaskQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<GetTaskQuery, GetTaskQueryVariables>(GetTaskDocument, options);
        }
// @ts-ignore
export function useGetTaskSuspenseQuery(baseOptions?: Apollo.SuspenseQueryHookOptions<GetTaskQuery, GetTaskQueryVariables>): Apollo.UseSuspenseQueryResult<GetTaskQuery, GetTaskQueryVariables>;
export function useGetTaskSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<GetTaskQuery, GetTaskQueryVariables>): Apollo.UseSuspenseQueryResult<GetTaskQuery | undefined, GetTaskQueryVariables>;
export function useGetTaskSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<GetTaskQuery, GetTaskQueryVariables>) {
          const options = baseOptions === Apollo.skipToken ? baseOptions : {...defaultOptions, ...baseOptions}
          return Apollo.useSuspenseQuery<GetTaskQuery, GetTaskQueryVariables>(GetTaskDocument, options);
        }
export type GetTaskQueryHookResult = ReturnType<typeof useGetTaskQuery>;
export type GetTaskLazyQueryHookResult = ReturnType<typeof useGetTaskLazyQuery>;
export type GetTaskSuspenseQueryHookResult = ReturnType<typeof useGetTaskSuspenseQuery>;
export type GetTaskQueryResult = Apollo.QueryResult<GetTaskQuery, GetTaskQueryVariables>;
export const CreateTaskDocument = gql`
    mutation CreateTask($input: CreateTaskInput!) {
  createTask(input: $input) {
    id
    title
    status
    priority
    dueDate
    tags
    createdAt
  }
}
    `;
export type CreateTaskMutationFn = Apollo.MutationFunction<CreateTaskMutation, CreateTaskMutationVariables>;

/**
 * __useCreateTaskMutation__
 *
 * To run a mutation, you first call `useCreateTaskMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useCreateTaskMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [createTaskMutation, { data, loading, error }] = useCreateTaskMutation({
 *   variables: {
 *      input: // value for 'input'
 *   },
 * });
 */
export function useCreateTaskMutation(baseOptions?: Apollo.MutationHookOptions<CreateTaskMutation, CreateTaskMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<CreateTaskMutation, CreateTaskMutationVariables>(CreateTaskDocument, options);
      }
export type CreateTaskMutationHookResult = ReturnType<typeof useCreateTaskMutation>;
export type CreateTaskMutationResult = Apollo.MutationResult<CreateTaskMutation>;
export type CreateTaskMutationOptions = Apollo.BaseMutationOptions<CreateTaskMutation, CreateTaskMutationVariables>;
export const UpdateTaskDocument = gql`
    mutation UpdateTask($id: Int!, $input: UpdateTaskInput!) {
  updateTask(id: $id, input: $input) {
    id
    title
    status
    priority
    dueDate
    tags
    updatedAt
  }
}
    `;
export type UpdateTaskMutationFn = Apollo.MutationFunction<UpdateTaskMutation, UpdateTaskMutationVariables>;

/**
 * __useUpdateTaskMutation__
 *
 * To run a mutation, you first call `useUpdateTaskMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useUpdateTaskMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [updateTaskMutation, { data, loading, error }] = useUpdateTaskMutation({
 *   variables: {
 *      id: // value for 'id'
 *      input: // value for 'input'
 *   },
 * });
 */
export function useUpdateTaskMutation(baseOptions?: Apollo.MutationHookOptions<UpdateTaskMutation, UpdateTaskMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<UpdateTaskMutation, UpdateTaskMutationVariables>(UpdateTaskDocument, options);
      }
export type UpdateTaskMutationHookResult = ReturnType<typeof useUpdateTaskMutation>;
export type UpdateTaskMutationResult = Apollo.MutationResult<UpdateTaskMutation>;
export type UpdateTaskMutationOptions = Apollo.BaseMutationOptions<UpdateTaskMutation, UpdateTaskMutationVariables>;
export const CompleteTaskDocument = gql`
    mutation CompleteTask($id: Int!) {
  completeTask(id: $id) {
    id
    status
    completedAt
  }
}
    `;
export type CompleteTaskMutationFn = Apollo.MutationFunction<CompleteTaskMutation, CompleteTaskMutationVariables>;

/**
 * __useCompleteTaskMutation__
 *
 * To run a mutation, you first call `useCompleteTaskMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useCompleteTaskMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [completeTaskMutation, { data, loading, error }] = useCompleteTaskMutation({
 *   variables: {
 *      id: // value for 'id'
 *   },
 * });
 */
export function useCompleteTaskMutation(baseOptions?: Apollo.MutationHookOptions<CompleteTaskMutation, CompleteTaskMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<CompleteTaskMutation, CompleteTaskMutationVariables>(CompleteTaskDocument, options);
      }
export type CompleteTaskMutationHookResult = ReturnType<typeof useCompleteTaskMutation>;
export type CompleteTaskMutationResult = Apollo.MutationResult<CompleteTaskMutation>;
export type CompleteTaskMutationOptions = Apollo.BaseMutationOptions<CompleteTaskMutation, CompleteTaskMutationVariables>;
export const DeleteTaskDocument = gql`
    mutation DeleteTask($id: Int!) {
  deleteTask(id: $id) {
    success
    message
  }
}
    `;
export type DeleteTaskMutationFn = Apollo.MutationFunction<DeleteTaskMutation, DeleteTaskMutationVariables>;

/**
 * __useDeleteTaskMutation__
 *
 * To run a mutation, you first call `useDeleteTaskMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useDeleteTaskMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [deleteTaskMutation, { data, loading, error }] = useDeleteTaskMutation({
 *   variables: {
 *      id: // value for 'id'
 *   },
 * });
 */
export function useDeleteTaskMutation(baseOptions?: Apollo.MutationHookOptions<DeleteTaskMutation, DeleteTaskMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<DeleteTaskMutation, DeleteTaskMutationVariables>(DeleteTaskDocument, options);
      }
export type DeleteTaskMutationHookResult = ReturnType<typeof useDeleteTaskMutation>;
export type DeleteTaskMutationResult = Apollo.MutationResult<DeleteTaskMutation>;
export type DeleteTaskMutationOptions = Apollo.BaseMutationOptions<DeleteTaskMutation, DeleteTaskMutationVariables>;