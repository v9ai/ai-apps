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
  Application: ResolverTypeWrapper<Partial<Application>>;
  ApplicationInput: ResolverTypeWrapper<Partial<ApplicationInput>>;
  ApplicationStatus: ResolverTypeWrapper<Partial<ApplicationStatus>>;
  ApplyEmailPatternResult: ResolverTypeWrapper<Partial<ApplyEmailPatternResult>>;
  ArchiveEmailResult: ResolverTypeWrapper<Partial<ArchiveEmailResult>>;
  AshbyAddress: ResolverTypeWrapper<Partial<AshbyAddress>>;
  AshbyCompensation: ResolverTypeWrapper<Partial<AshbyCompensation>>;
  AshbyCompensationComponent: ResolverTypeWrapper<Partial<AshbyCompensationComponent>>;
  AshbyCompensationTier: ResolverTypeWrapper<Partial<AshbyCompensationTier>>;
  AshbyEnrichment: ResolverTypeWrapper<Partial<AshbyEnrichment>>;
  AshbyPostalAddress: ResolverTypeWrapper<Partial<AshbyPostalAddress>>;
  AshbySecondaryLocation: ResolverTypeWrapper<Partial<AshbySecondaryLocation>>;
  BatchRecipientInput: ResolverTypeWrapper<Partial<BatchRecipientInput>>;
  BlockJobsResult: ResolverTypeWrapper<Partial<BlockJobsResult>>;
  BlockedCompany: ResolverTypeWrapper<Partial<BlockedCompany>>;
  Boolean: ResolverTypeWrapper<Partial<Scalars['Boolean']['output']>>;
  CancelCompanyEmailsResult: ResolverTypeWrapper<Partial<CancelCompanyEmailsResult>>;
  CancelEmailResult: ResolverTypeWrapper<Partial<CancelEmailResult>>;
  ChatMessage: ResolverTypeWrapper<Partial<ChatMessage>>;
  ChatMessageInput: ResolverTypeWrapper<Partial<ChatMessageInput>>;
  ClassificationConfidence: ResolverTypeWrapper<Partial<ClassificationConfidence>>;
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
  CreateLangSmithPromptInput: ResolverTypeWrapper<Partial<CreateLangSmithPromptInput>>;
  CreateOpportunityInput: ResolverTypeWrapper<Partial<CreateOpportunityInput>>;
  CreatePromptInput: ResolverTypeWrapper<Partial<CreatePromptInput>>;
  CreateTaskInput: ResolverTypeWrapper<Partial<CreateTaskInput>>;
  DateTime: ResolverTypeWrapper<Partial<Scalars['DateTime']['output']>>;
  DeleteApplicationResponse: ResolverTypeWrapper<Partial<DeleteApplicationResponse>>;
  DeleteBlockedCompanyResult: ResolverTypeWrapper<Partial<DeleteBlockedCompanyResult>>;
  DeleteCampaignResult: ResolverTypeWrapper<Partial<DeleteCampaignResult>>;
  DeleteCompaniesResult: ResolverTypeWrapper<Partial<DeleteCompaniesResult>>;
  DeleteCompanyResponse: ResolverTypeWrapper<Partial<DeleteCompanyResponse>>;
  DeleteContactResult: ResolverTypeWrapper<Partial<DeleteContactResult>>;
  DeleteEmailTemplateResult: ResolverTypeWrapper<Partial<DeleteEmailTemplateResult>>;
  DeleteJobResponse: ResolverTypeWrapper<Partial<DeleteJobResponse>>;
  DeleteOpportunityResult: ResolverTypeWrapper<Partial<DeleteOpportunityResult>>;
  DeleteTaskResult: ResolverTypeWrapper<Partial<DeleteTaskResult>>;
  EmailAddress: ResolverTypeWrapper<Partial<Scalars['EmailAddress']['output']>>;
  EmailCampaign: ResolverTypeWrapper<Partial<EmailCampaign>>;
  EmailCampaignsResult: ResolverTypeWrapper<Partial<EmailCampaignsResult>>;
  EmailPreview: ResolverTypeWrapper<Partial<EmailPreview>>;
  EmailStats: ResolverTypeWrapper<Partial<EmailStats>>;
  EmailTemplate: ResolverTypeWrapper<Partial<EmailTemplate>>;
  EmailTemplatesResult: ResolverTypeWrapper<Partial<EmailTemplatesResult>>;
  EnhanceAllContactsResult: ResolverTypeWrapper<Partial<EnhanceAllContactsResult>>;
  EnhanceCompanyResponse: ResolverTypeWrapper<Partial<EnhanceCompanyResponse>>;
  EnhanceJobResponse: ResolverTypeWrapper<Partial<EnhanceJobResponse>>;
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
  GreenhouseCompliance: ResolverTypeWrapper<Partial<GreenhouseCompliance>>;
  GreenhouseDataCompliance: ResolverTypeWrapper<Partial<GreenhouseDataCompliance>>;
  GreenhouseDemographicQuestions: ResolverTypeWrapper<Partial<GreenhouseDemographicQuestions>>;
  GreenhouseDepartment: ResolverTypeWrapper<Partial<GreenhouseDepartment>>;
  GreenhouseMetadata: ResolverTypeWrapper<Partial<GreenhouseMetadata>>;
  GreenhouseOffice: ResolverTypeWrapper<Partial<GreenhouseOffice>>;
  GreenhouseQuestion: ResolverTypeWrapper<Partial<GreenhouseQuestion>>;
  GreenhouseQuestionField: ResolverTypeWrapper<Partial<GreenhouseQuestionField>>;
  ID: ResolverTypeWrapper<Partial<Scalars['ID']['output']>>;
  ImportCompaniesResult: ResolverTypeWrapper<Partial<ImportCompaniesResult>>;
  ImportCompanyResult: ResolverTypeWrapper<Partial<ImportCompanyResult>>;
  ImportCompanyWithContactsInput: ResolverTypeWrapper<Partial<ImportCompanyWithContactsInput>>;
  ImportContactInput: ResolverTypeWrapper<Partial<ImportContactInput>>;
  ImportContactsResult: ResolverTypeWrapper<Partial<ImportContactsResult>>;
  ImportResendResult: ResolverTypeWrapper<Partial<ImportResendResult>>;
  Int: ResolverTypeWrapper<Partial<Scalars['Int']['output']>>;
  JSON: ResolverTypeWrapper<Partial<Scalars['JSON']['output']>>;
  Job: ResolverTypeWrapper<Partial<Job>>;
  JobSkill: ResolverTypeWrapper<Partial<JobSkill>>;
  JobStatus: ResolverTypeWrapper<Partial<JobStatus>>;
  JobsResponse: ResolverTypeWrapper<Partial<JobsResponse>>;
  LangSmithPrompt: ResolverTypeWrapper<Partial<LangSmithPrompt>>;
  LangSmithPromptCommit: ResolverTypeWrapper<Partial<LangSmithPromptCommit>>;
  MarkRepliedResult: ResolverTypeWrapper<Partial<MarkRepliedResult>>;
  MergeCompaniesResult: ResolverTypeWrapper<Partial<MergeCompaniesResult>>;
  MergeDuplicateContactsResult: ResolverTypeWrapper<Partial<MergeDuplicateContactsResult>>;
  Mutation: ResolverTypeWrapper<Record<PropertyKey, never>>;
  OpportunitiesResult: ResolverTypeWrapper<Partial<OpportunitiesResult>>;
  Opportunity: ResolverTypeWrapper<Partial<Opportunity>>;
  PreviewEmailInput: ResolverTypeWrapper<Partial<PreviewEmailInput>>;
  ProcessAllJobsResponse: ResolverTypeWrapper<Partial<ProcessAllJobsResponse>>;
  Prompt: ResolverTypeWrapper<Partial<Prompt>>;
  PromptConfig: ResolverTypeWrapper<Partial<PromptConfig>>;
  PromptConfigInput: ResolverTypeWrapper<Partial<PromptConfigInput>>;
  PromptType: ResolverTypeWrapper<Partial<PromptType>>;
  PromptUsage: ResolverTypeWrapper<Partial<PromptUsage>>;
  PushLangSmithPromptInput: ResolverTypeWrapper<Partial<PushLangSmithPromptInput>>;
  Query: ResolverTypeWrapper<Record<PropertyKey, never>>;
  QuestionAnswer: ResolverTypeWrapper<Partial<QuestionAnswer>>;
  QuestionAnswerInput: ResolverTypeWrapper<Partial<QuestionAnswerInput>>;
  ReceivedEmail: ResolverTypeWrapper<Partial<ReceivedEmail>>;
  ReceivedEmailsResult: ResolverTypeWrapper<Partial<ReceivedEmailsResult>>;
  RegisteredPrompt: ResolverTypeWrapper<Partial<RegisteredPrompt>>;
  ResendEmailDetail: ResolverTypeWrapper<Partial<ResendEmailDetail>>;
  ResumeAnswer: ResolverTypeWrapper<Partial<ResumeAnswer>>;
  ResumeIngestResult: ResolverTypeWrapper<Partial<ResumeIngestResult>>;
  ResumeStatus: ResolverTypeWrapper<Partial<ResumeStatus>>;
  ResumeUploadResult: ResolverTypeWrapper<Partial<ResumeUploadResult>>;
  ScheduleBatchEmailsInput: ResolverTypeWrapper<Partial<ScheduleBatchEmailsInput>>;
  ScheduleBatchResult: ResolverTypeWrapper<Partial<ScheduleBatchResult>>;
  SendEmailInput: ResolverTypeWrapper<Partial<SendEmailInput>>;
  SendEmailResult: ResolverTypeWrapper<Partial<SendEmailResult>>;
  SendNowResult: ResolverTypeWrapper<Partial<SendNowResult>>;
  SendOutreachEmailInput: ResolverTypeWrapper<Partial<SendOutreachEmailInput>>;
  SendOutreachEmailResult: ResolverTypeWrapper<Partial<SendOutreachEmailResult>>;
  SkillMatch: ResolverTypeWrapper<Partial<SkillMatch>>;
  SkillMatchDetail: ResolverTypeWrapper<Partial<SkillMatchDetail>>;
  SourceType: ResolverTypeWrapper<Partial<SourceType>>;
  StackMutationResponse: ResolverTypeWrapper<Partial<StackMutationResponse>>;
  String: ResolverTypeWrapper<Partial<Scalars['String']['output']>>;
  SyncResendResult: ResolverTypeWrapper<Partial<SyncResendResult>>;
  Task: ResolverTypeWrapper<Partial<Task>>;
  TasksResult: ResolverTypeWrapper<Partial<TasksResult>>;
  TextToSqlResult: ResolverTypeWrapper<Partial<TextToSqlResult>>;
  URL: ResolverTypeWrapper<Partial<Scalars['URL']['output']>>;
  UnverifyContactsResult: ResolverTypeWrapper<Partial<UnverifyContactsResult>>;
  UpdateApplicationInput: ResolverTypeWrapper<Partial<UpdateApplicationInput>>;
  UpdateCampaignInput: ResolverTypeWrapper<Partial<UpdateCampaignInput>>;
  UpdateCompanyInput: ResolverTypeWrapper<Partial<UpdateCompanyInput>>;
  UpdateContactInput: ResolverTypeWrapper<Partial<UpdateContactInput>>;
  UpdateEmailTemplateInput: ResolverTypeWrapper<Partial<UpdateEmailTemplateInput>>;
  UpdateLangSmithPromptInput: ResolverTypeWrapper<Partial<UpdateLangSmithPromptInput>>;
  UpdateOpportunityInput: ResolverTypeWrapper<Partial<UpdateOpportunityInput>>;
  UpdateTaskInput: ResolverTypeWrapper<Partial<UpdateTaskInput>>;
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
  Application: Partial<Application>;
  ApplicationInput: Partial<ApplicationInput>;
  ApplyEmailPatternResult: Partial<ApplyEmailPatternResult>;
  ArchiveEmailResult: Partial<ArchiveEmailResult>;
  AshbyAddress: Partial<AshbyAddress>;
  AshbyCompensation: Partial<AshbyCompensation>;
  AshbyCompensationComponent: Partial<AshbyCompensationComponent>;
  AshbyCompensationTier: Partial<AshbyCompensationTier>;
  AshbyEnrichment: Partial<AshbyEnrichment>;
  AshbyPostalAddress: Partial<AshbyPostalAddress>;
  AshbySecondaryLocation: Partial<AshbySecondaryLocation>;
  BatchRecipientInput: Partial<BatchRecipientInput>;
  BlockJobsResult: Partial<BlockJobsResult>;
  BlockedCompany: Partial<BlockedCompany>;
  Boolean: Partial<Scalars['Boolean']['output']>;
  CancelCompanyEmailsResult: Partial<CancelCompanyEmailsResult>;
  CancelEmailResult: Partial<CancelEmailResult>;
  ChatMessage: Partial<ChatMessage>;
  ChatMessageInput: Partial<ChatMessageInput>;
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
  CreateLangSmithPromptInput: Partial<CreateLangSmithPromptInput>;
  CreateOpportunityInput: Partial<CreateOpportunityInput>;
  CreatePromptInput: Partial<CreatePromptInput>;
  CreateTaskInput: Partial<CreateTaskInput>;
  DateTime: Partial<Scalars['DateTime']['output']>;
  DeleteApplicationResponse: Partial<DeleteApplicationResponse>;
  DeleteBlockedCompanyResult: Partial<DeleteBlockedCompanyResult>;
  DeleteCampaignResult: Partial<DeleteCampaignResult>;
  DeleteCompaniesResult: Partial<DeleteCompaniesResult>;
  DeleteCompanyResponse: Partial<DeleteCompanyResponse>;
  DeleteContactResult: Partial<DeleteContactResult>;
  DeleteEmailTemplateResult: Partial<DeleteEmailTemplateResult>;
  DeleteJobResponse: Partial<DeleteJobResponse>;
  DeleteOpportunityResult: Partial<DeleteOpportunityResult>;
  DeleteTaskResult: Partial<DeleteTaskResult>;
  EmailAddress: Partial<Scalars['EmailAddress']['output']>;
  EmailCampaign: Partial<EmailCampaign>;
  EmailCampaignsResult: Partial<EmailCampaignsResult>;
  EmailPreview: Partial<EmailPreview>;
  EmailStats: Partial<EmailStats>;
  EmailTemplate: Partial<EmailTemplate>;
  EmailTemplatesResult: Partial<EmailTemplatesResult>;
  EnhanceAllContactsResult: Partial<EnhanceAllContactsResult>;
  EnhanceCompanyResponse: Partial<EnhanceCompanyResponse>;
  EnhanceJobResponse: Partial<EnhanceJobResponse>;
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
  GreenhouseCompliance: Partial<GreenhouseCompliance>;
  GreenhouseDataCompliance: Partial<GreenhouseDataCompliance>;
  GreenhouseDemographicQuestions: Partial<GreenhouseDemographicQuestions>;
  GreenhouseDepartment: Partial<GreenhouseDepartment>;
  GreenhouseMetadata: Partial<GreenhouseMetadata>;
  GreenhouseOffice: Partial<GreenhouseOffice>;
  GreenhouseQuestion: Partial<GreenhouseQuestion>;
  GreenhouseQuestionField: Partial<GreenhouseQuestionField>;
  ID: Partial<Scalars['ID']['output']>;
  ImportCompaniesResult: Partial<ImportCompaniesResult>;
  ImportCompanyResult: Partial<ImportCompanyResult>;
  ImportCompanyWithContactsInput: Partial<ImportCompanyWithContactsInput>;
  ImportContactInput: Partial<ImportContactInput>;
  ImportContactsResult: Partial<ImportContactsResult>;
  ImportResendResult: Partial<ImportResendResult>;
  Int: Partial<Scalars['Int']['output']>;
  JSON: Partial<Scalars['JSON']['output']>;
  Job: Partial<Job>;
  JobSkill: Partial<JobSkill>;
  JobsResponse: Partial<JobsResponse>;
  LangSmithPrompt: Partial<LangSmithPrompt>;
  LangSmithPromptCommit: Partial<LangSmithPromptCommit>;
  MarkRepliedResult: Partial<MarkRepliedResult>;
  MergeCompaniesResult: Partial<MergeCompaniesResult>;
  MergeDuplicateContactsResult: Partial<MergeDuplicateContactsResult>;
  Mutation: Record<PropertyKey, never>;
  OpportunitiesResult: Partial<OpportunitiesResult>;
  Opportunity: Partial<Opportunity>;
  PreviewEmailInput: Partial<PreviewEmailInput>;
  ProcessAllJobsResponse: Partial<ProcessAllJobsResponse>;
  Prompt: Partial<Prompt>;
  PromptConfig: Partial<PromptConfig>;
  PromptConfigInput: Partial<PromptConfigInput>;
  PromptUsage: Partial<PromptUsage>;
  PushLangSmithPromptInput: Partial<PushLangSmithPromptInput>;
  Query: Record<PropertyKey, never>;
  QuestionAnswer: Partial<QuestionAnswer>;
  QuestionAnswerInput: Partial<QuestionAnswerInput>;
  ReceivedEmail: Partial<ReceivedEmail>;
  ReceivedEmailsResult: Partial<ReceivedEmailsResult>;
  RegisteredPrompt: Partial<RegisteredPrompt>;
  ResendEmailDetail: Partial<ResendEmailDetail>;
  ResumeAnswer: Partial<ResumeAnswer>;
  ResumeIngestResult: Partial<ResumeIngestResult>;
  ResumeStatus: Partial<ResumeStatus>;
  ResumeUploadResult: Partial<ResumeUploadResult>;
  ScheduleBatchEmailsInput: Partial<ScheduleBatchEmailsInput>;
  ScheduleBatchResult: Partial<ScheduleBatchResult>;
  SendEmailInput: Partial<SendEmailInput>;
  SendEmailResult: Partial<SendEmailResult>;
  SendNowResult: Partial<SendNowResult>;
  SendOutreachEmailInput: Partial<SendOutreachEmailInput>;
  SendOutreachEmailResult: Partial<SendOutreachEmailResult>;
  SkillMatch: Partial<SkillMatch>;
  SkillMatchDetail: Partial<SkillMatchDetail>;
  StackMutationResponse: Partial<StackMutationResponse>;
  String: Partial<Scalars['String']['output']>;
  SyncResendResult: Partial<SyncResendResult>;
  Task: Partial<Task>;
  TasksResult: Partial<TasksResult>;
  TextToSqlResult: Partial<TextToSqlResult>;
  URL: Partial<Scalars['URL']['output']>;
  UnverifyContactsResult: Partial<UnverifyContactsResult>;
  UpdateApplicationInput: Partial<UpdateApplicationInput>;
  UpdateCampaignInput: Partial<UpdateCampaignInput>;
  UpdateCompanyInput: Partial<UpdateCompanyInput>;
  UpdateContactInput: Partial<UpdateContactInput>;
  UpdateEmailTemplateInput: Partial<UpdateEmailTemplateInput>;
  UpdateLangSmithPromptInput: Partial<UpdateLangSmithPromptInput>;
  UpdateOpportunityInput: Partial<UpdateOpportunityInput>;
  UpdateTaskInput: Partial<UpdateTaskInput>;
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

export type ApplicationResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['Application'] = ResolversParentTypes['Application']> = {
  aiInterviewQuestions?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  aiTechStack?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  companyKey?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  companyName?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  createdAt?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  email?: Resolver<ResolversTypes['EmailAddress'], ParentType, ContextType>;
  id?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  jobDescription?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  jobId?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  jobTitle?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  notes?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  questions?: Resolver<Array<ResolversTypes['QuestionAnswer']>, ParentType, ContextType>;
  resume?: Resolver<Maybe<ResolversTypes['Upload']>, ParentType, ContextType>;
  status?: Resolver<ResolversTypes['ApplicationStatus'], ParentType, ContextType>;
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

export type AshbyAddressResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['AshbyAddress'] = ResolversParentTypes['AshbyAddress']> = {
  postalAddress?: Resolver<Maybe<ResolversTypes['AshbyPostalAddress']>, ParentType, ContextType>;
};

export type AshbyCompensationResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['AshbyCompensation'] = ResolversParentTypes['AshbyCompensation']> = {
  compensationTierSummary?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  compensationTiers?: Resolver<Array<ResolversTypes['AshbyCompensationTier']>, ParentType, ContextType>;
  scrapeableCompensationSalarySummary?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  summaryComponents?: Resolver<Array<ResolversTypes['AshbyCompensationComponent']>, ParentType, ContextType>;
};

export type AshbyCompensationComponentResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['AshbyCompensationComponent'] = ResolversParentTypes['AshbyCompensationComponent']> = {
  compensationType?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  currencyCode?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  id?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  interval?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  maxValue?: Resolver<Maybe<ResolversTypes['Float']>, ParentType, ContextType>;
  minValue?: Resolver<Maybe<ResolversTypes['Float']>, ParentType, ContextType>;
  summary?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
};

export type AshbyCompensationTierResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['AshbyCompensationTier'] = ResolversParentTypes['AshbyCompensationTier']> = {
  additionalInformation?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  components?: Resolver<Array<ResolversTypes['AshbyCompensationComponent']>, ParentType, ContextType>;
  id?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  tierSummary?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  title?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
};

export type AshbyEnrichmentResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['AshbyEnrichment'] = ResolversParentTypes['AshbyEnrichment']> = {
  company_name?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  enriched_at?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  industry_tags?: Resolver<Array<ResolversTypes['String']>, ParentType, ContextType>;
  size_signal?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  tech_signals?: Resolver<Array<ResolversTypes['String']>, ParentType, ContextType>;
};

export type AshbyPostalAddressResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['AshbyPostalAddress'] = ResolversParentTypes['AshbyPostalAddress']> = {
  addressCountry?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  addressLocality?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  addressRegion?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
};

export type AshbySecondaryLocationResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['AshbySecondaryLocation'] = ResolversParentTypes['AshbySecondaryLocation']> = {
  address?: Resolver<Maybe<ResolversTypes['AshbyPostalAddress']>, ParentType, ContextType>;
  location?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
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

export type ChatMessageResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['ChatMessage'] = ResolversParentTypes['ChatMessage']> = {
  content?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  role?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
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
  opportunities?: Resolver<Array<ResolversTypes['Opportunity']>, ParentType, ContextType>;
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

export type DeleteApplicationResponseResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['DeleteApplicationResponse'] = ResolversParentTypes['DeleteApplicationResponse']> = {
  message?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  success?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
};

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

export type DeleteJobResponseResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['DeleteJobResponse'] = ResolversParentTypes['DeleteJobResponse']> = {
  message?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  success?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
};

export type DeleteOpportunityResultResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['DeleteOpportunityResult'] = ResolversParentTypes['DeleteOpportunityResult']> = {
  message?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  success?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
};

export type DeleteTaskResultResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['DeleteTaskResult'] = ResolversParentTypes['DeleteTaskResult']> = {
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

export type EnhanceJobResponseResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['EnhanceJobResponse'] = ResolversParentTypes['EnhanceJobResponse']> = {
  job?: Resolver<Maybe<ResolversTypes['Job']>, ParentType, ContextType>;
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

export type GreenhouseComplianceResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['GreenhouseCompliance'] = ResolversParentTypes['GreenhouseCompliance']> = {
  description?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  questions?: Resolver<Maybe<Array<ResolversTypes['GreenhouseQuestion']>>, ParentType, ContextType>;
  type?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
};

export type GreenhouseDataComplianceResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['GreenhouseDataCompliance'] = ResolversParentTypes['GreenhouseDataCompliance']> = {
  demographic_data_consent_applies?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  requires_consent?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  requires_processing_consent?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  requires_retention_consent?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  retention_period?: Resolver<Maybe<ResolversTypes['Int']>, ParentType, ContextType>;
  type?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
};

export type GreenhouseDemographicQuestionsResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['GreenhouseDemographicQuestions'] = ResolversParentTypes['GreenhouseDemographicQuestions']> = {
  description?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  header?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  questions?: Resolver<Maybe<Array<ResolversTypes['GreenhouseQuestion']>>, ParentType, ContextType>;
};

export type GreenhouseDepartmentResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['GreenhouseDepartment'] = ResolversParentTypes['GreenhouseDepartment']> = {
  child_ids?: Resolver<Maybe<Array<ResolversTypes['String']>>, ParentType, ContextType>;
  id?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  name?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  parent_id?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
};

export type GreenhouseMetadataResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['GreenhouseMetadata'] = ResolversParentTypes['GreenhouseMetadata']> = {
  id?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  name?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  value?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  value_type?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
};

export type GreenhouseOfficeResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['GreenhouseOffice'] = ResolversParentTypes['GreenhouseOffice']> = {
  child_ids?: Resolver<Maybe<Array<ResolversTypes['String']>>, ParentType, ContextType>;
  id?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  location?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  name?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  parent_id?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
};

export type GreenhouseQuestionResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['GreenhouseQuestion'] = ResolversParentTypes['GreenhouseQuestion']> = {
  description?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  fields?: Resolver<Maybe<Array<ResolversTypes['GreenhouseQuestionField']>>, ParentType, ContextType>;
  label?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  required?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
};

export type GreenhouseQuestionFieldResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['GreenhouseQuestionField'] = ResolversParentTypes['GreenhouseQuestionField']> = {
  name?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  type?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
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

export type JobResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['Job'] = ResolversParentTypes['Job']> = {
  absolute_url?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  applied?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  appliedAt?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  archived?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  ashby_address?: Resolver<Maybe<ResolversTypes['AshbyAddress']>, ParentType, ContextType>;
  ashby_apply_url?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  ashby_compensation?: Resolver<Maybe<ResolversTypes['AshbyCompensation']>, ParentType, ContextType>;
  ashby_department?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  ashby_employment_type?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  ashby_is_listed?: Resolver<Maybe<ResolversTypes['Boolean']>, ParentType, ContextType>;
  ashby_is_remote?: Resolver<Maybe<ResolversTypes['Boolean']>, ParentType, ContextType>;
  ashby_job_url?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  ashby_secondary_locations?: Resolver<Maybe<Array<ResolversTypes['AshbySecondaryLocation']>>, ParentType, ContextType>;
  ashby_team?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  company?: Resolver<Maybe<ResolversTypes['Company']>, ParentType, ContextType>;
  company_id?: Resolver<Maybe<ResolversTypes['Int']>, ParentType, ContextType>;
  company_key?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  company_name?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  compliance?: Resolver<Maybe<Array<ResolversTypes['GreenhouseCompliance']>>, ParentType, ContextType>;
  created_at?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  data_compliance?: Resolver<Maybe<Array<ResolversTypes['GreenhouseDataCompliance']>>, ParentType, ContextType>;
  demographic_questions?: Resolver<Maybe<ResolversTypes['GreenhouseDemographicQuestions']>, ParentType, ContextType>;
  departments?: Resolver<Maybe<Array<ResolversTypes['GreenhouseDepartment']>>, ParentType, ContextType>;
  description?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  external_id?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  id?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  internal_job_id?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  is_remote_eu?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  language?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  location?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  location_questions?: Resolver<Maybe<Array<ResolversTypes['GreenhouseQuestion']>>, ParentType, ContextType>;
  metadata?: Resolver<Maybe<Array<ResolversTypes['GreenhouseMetadata']>>, ParentType, ContextType>;
  offices?: Resolver<Maybe<Array<ResolversTypes['GreenhouseOffice']>>, ParentType, ContextType>;
  publishedAt?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  questions?: Resolver<Maybe<Array<ResolversTypes['GreenhouseQuestion']>>, ParentType, ContextType>;
  recruiter?: Resolver<Maybe<ResolversTypes['Contact']>, ParentType, ContextType>;
  remote_eu_confidence?: Resolver<Maybe<ResolversTypes['ClassificationConfidence']>, ParentType, ContextType>;
  remote_eu_reason?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  requisition_id?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  score?: Resolver<Maybe<ResolversTypes['Float']>, ParentType, ContextType>;
  score_reason?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  skillMatch?: Resolver<Maybe<ResolversTypes['SkillMatch']>, ParentType, ContextType>;
  skills?: Resolver<Maybe<Array<ResolversTypes['JobSkill']>>, ParentType, ContextType>;
  source_id?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  source_kind?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  status?: Resolver<Maybe<ResolversTypes['JobStatus']>, ParentType, ContextType>;
  title?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  updated_at?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  url?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
};

export type JobSkillResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['JobSkill'] = ResolversParentTypes['JobSkill']> = {
  confidence?: Resolver<Maybe<ResolversTypes['Float']>, ParentType, ContextType>;
  evidence?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  level?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  tag?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
};

export type JobsResponseResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['JobsResponse'] = ResolversParentTypes['JobsResponse']> = {
  jobs?: Resolver<Array<ResolversTypes['Job']>, ParentType, ContextType>;
  totalCount?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
};

export type LangSmithPromptResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['LangSmithPrompt'] = ResolversParentTypes['LangSmithPrompt']> = {
  createdAt?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  description?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  fullName?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  id?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  isArchived?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  isPublic?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  lastCommitHash?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  likedByAuthUser?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  numCommits?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  numDownloads?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  numLikes?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  numViews?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  owner?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  promptHandle?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  readme?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  tags?: Resolver<Array<ResolversTypes['String']>, ParentType, ContextType>;
  tenantId?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  updatedAt?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
};

export type LangSmithPromptCommitResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['LangSmithPromptCommit'] = ResolversParentTypes['LangSmithPromptCommit']> = {
  commitHash?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  examples?: Resolver<Array<ResolversTypes['JSON']>, ParentType, ContextType>;
  manifest?: Resolver<ResolversTypes['JSON'], ParentType, ContextType>;
  owner?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  promptName?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
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
  applyEmailPattern?: Resolver<ResolversTypes['ApplyEmailPatternResult'], ParentType, ContextType, RequireFields<MutationApplyEmailPatternArgs, 'companyId'>>;
  archiveEmail?: Resolver<ResolversTypes['ArchiveEmailResult'], ParentType, ContextType, RequireFields<MutationArchiveEmailArgs, 'id'>>;
  archiveJob?: Resolver<ResolversTypes['Job'], ParentType, ContextType, RequireFields<MutationArchiveJobArgs, 'id'>>;
  blockCompany?: Resolver<ResolversTypes['BlockedCompany'], ParentType, ContextType, RequireFields<MutationBlockCompanyArgs, 'name'>>;
  blockJobsByCompany?: Resolver<ResolversTypes['BlockJobsResult'], ParentType, ContextType, RequireFields<MutationBlockJobsByCompanyArgs, 'companyName'>>;
  cancelCompanyEmails?: Resolver<ResolversTypes['CancelCompanyEmailsResult'], ParentType, ContextType, RequireFields<MutationCancelCompanyEmailsArgs, 'companyId'>>;
  cancelScheduledEmail?: Resolver<ResolversTypes['CancelEmailResult'], ParentType, ContextType, RequireFields<MutationCancelScheduledEmailArgs, 'resendId'>>;
  completeTask?: Resolver<ResolversTypes['Task'], ParentType, ContextType, RequireFields<MutationCompleteTaskArgs, 'id'>>;
  createApplication?: Resolver<ResolversTypes['Application'], ParentType, ContextType, RequireFields<MutationCreateApplicationArgs, 'input'>>;
  createCompany?: Resolver<ResolversTypes['Company'], ParentType, ContextType, RequireFields<MutationCreateCompanyArgs, 'input'>>;
  createContact?: Resolver<ResolversTypes['Contact'], ParentType, ContextType, RequireFields<MutationCreateContactArgs, 'input'>>;
  createDraftCampaign?: Resolver<ResolversTypes['EmailCampaign'], ParentType, ContextType, RequireFields<MutationCreateDraftCampaignArgs, 'input'>>;
  createEmailTemplate?: Resolver<ResolversTypes['EmailTemplate'], ParentType, ContextType, RequireFields<MutationCreateEmailTemplateArgs, 'input'>>;
  createLangSmithPrompt?: Resolver<ResolversTypes['LangSmithPrompt'], ParentType, ContextType, RequireFields<MutationCreateLangSmithPromptArgs, 'promptIdentifier'>>;
  createOpportunity?: Resolver<ResolversTypes['Opportunity'], ParentType, ContextType, RequireFields<MutationCreateOpportunityArgs, 'input'>>;
  createPrompt?: Resolver<ResolversTypes['Prompt'], ParentType, ContextType, RequireFields<MutationCreatePromptArgs, 'input'>>;
  createTask?: Resolver<ResolversTypes['Task'], ParentType, ContextType, RequireFields<MutationCreateTaskArgs, 'input'>>;
  deleteAllJobs?: Resolver<ResolversTypes['DeleteJobResponse'], ParentType, ContextType>;
  deleteApplication?: Resolver<ResolversTypes['DeleteApplicationResponse'], ParentType, ContextType, RequireFields<MutationDeleteApplicationArgs, 'id'>>;
  deleteCampaign?: Resolver<ResolversTypes['DeleteCampaignResult'], ParentType, ContextType, RequireFields<MutationDeleteCampaignArgs, 'id'>>;
  deleteCompanies?: Resolver<ResolversTypes['DeleteCompaniesResult'], ParentType, ContextType, RequireFields<MutationDeleteCompaniesArgs, 'companyIds'>>;
  deleteCompany?: Resolver<ResolversTypes['DeleteCompanyResponse'], ParentType, ContextType, RequireFields<MutationDeleteCompanyArgs, 'id'>>;
  deleteContact?: Resolver<ResolversTypes['DeleteContactResult'], ParentType, ContextType, RequireFields<MutationDeleteContactArgs, 'id'>>;
  deleteEmailTemplate?: Resolver<ResolversTypes['DeleteEmailTemplateResult'], ParentType, ContextType, RequireFields<MutationDeleteEmailTemplateArgs, 'id'>>;
  deleteJob?: Resolver<ResolversTypes['DeleteJobResponse'], ParentType, ContextType, RequireFields<MutationDeleteJobArgs, 'id'>>;
  deleteLangSmithPrompt?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType, RequireFields<MutationDeleteLangSmithPromptArgs, 'promptIdentifier'>>;
  deleteOpportunity?: Resolver<ResolversTypes['DeleteOpportunityResult'], ParentType, ContextType, RequireFields<MutationDeleteOpportunityArgs, 'id'>>;
  deleteStackEntry?: Resolver<ResolversTypes['StackMutationResponse'], ParentType, ContextType, RequireFields<MutationDeleteStackEntryArgs, 'name'>>;
  deleteTask?: Resolver<ResolversTypes['DeleteTaskResult'], ParentType, ContextType, RequireFields<MutationDeleteTaskArgs, 'id'>>;
  enhanceAllContacts?: Resolver<ResolversTypes['EnhanceAllContactsResult'], ParentType, ContextType>;
  enhanceCompany?: Resolver<ResolversTypes['EnhanceCompanyResponse'], ParentType, ContextType, Partial<MutationEnhanceCompanyArgs>>;
  enhanceJobFromATS?: Resolver<ResolversTypes['EnhanceJobResponse'], ParentType, ContextType, RequireFields<MutationEnhanceJobFromAtsArgs, 'company' | 'jobId' | 'source'>>;
  findCompanyEmails?: Resolver<ResolversTypes['EnhanceAllContactsResult'], ParentType, ContextType, RequireFields<MutationFindCompanyEmailsArgs, 'companyId'>>;
  findContactEmail?: Resolver<ResolversTypes['FindContactEmailResult'], ParentType, ContextType, RequireFields<MutationFindContactEmailArgs, 'contactId'>>;
  generateEmail?: Resolver<ResolversTypes['GenerateEmailResult'], ParentType, ContextType, RequireFields<MutationGenerateEmailArgs, 'input'>>;
  generateReply?: Resolver<ResolversTypes['GenerateReplyResult'], ParentType, ContextType, RequireFields<MutationGenerateReplyArgs, 'input'>>;
  importCompanies?: Resolver<ResolversTypes['ImportCompaniesResult'], ParentType, ContextType, RequireFields<MutationImportCompaniesArgs, 'companies'>>;
  importCompanyWithContacts?: Resolver<ResolversTypes['ImportCompanyResult'], ParentType, ContextType, RequireFields<MutationImportCompanyWithContactsArgs, 'input'>>;
  importContacts?: Resolver<ResolversTypes['ImportContactsResult'], ParentType, ContextType, RequireFields<MutationImportContactsArgs, 'contacts'>>;
  importResendEmails?: Resolver<ResolversTypes['ImportResendResult'], ParentType, ContextType, Partial<MutationImportResendEmailsArgs>>;
  ingestResumeParse?: Resolver<Maybe<ResolversTypes['ResumeIngestResult']>, ParentType, ContextType, RequireFields<MutationIngestResumeParseArgs, 'email' | 'filename' | 'job_id'>>;
  ingest_company_snapshot?: Resolver<ResolversTypes['CompanySnapshot'], ParentType, ContextType, RequireFields<MutationIngest_Company_SnapshotArgs, 'company_id' | 'evidence' | 'fetched_at' | 'source_url'>>;
  launchEmailCampaign?: Resolver<ResolversTypes['EmailCampaign'], ParentType, ContextType, RequireFields<MutationLaunchEmailCampaignArgs, 'id'>>;
  markContactEmailVerified?: Resolver<ResolversTypes['Contact'], ParentType, ContextType, RequireFields<MutationMarkContactEmailVerifiedArgs, 'contactId' | 'verified'>>;
  markEmailReplied?: Resolver<ResolversTypes['MarkRepliedResult'], ParentType, ContextType, RequireFields<MutationMarkEmailRepliedArgs, 'resendId'>>;
  markJobApplied?: Resolver<ResolversTypes['Job'], ParentType, ContextType, RequireFields<MutationMarkJobAppliedArgs, 'id'>>;
  mergeDuplicateCompanies?: Resolver<ResolversTypes['MergeCompaniesResult'], ParentType, ContextType, RequireFields<MutationMergeDuplicateCompaniesArgs, 'companyIds'>>;
  mergeDuplicateContacts?: Resolver<ResolversTypes['MergeDuplicateContactsResult'], ParentType, ContextType, RequireFields<MutationMergeDuplicateContactsArgs, 'companyId'>>;
  previewEmail?: Resolver<ResolversTypes['EmailPreview'], ParentType, ContextType, RequireFields<MutationPreviewEmailArgs, 'input'>>;
  processAllJobs?: Resolver<ResolversTypes['ProcessAllJobsResponse'], ParentType, ContextType, Partial<MutationProcessAllJobsArgs>>;
  pushLangSmithPrompt?: Resolver<ResolversTypes['String'], ParentType, ContextType, RequireFields<MutationPushLangSmithPromptArgs, 'promptIdentifier'>>;
  rateResumeAnswer?: Resolver<Maybe<ResolversTypes['Boolean']>, ParentType, ContextType, RequireFields<MutationRateResumeAnswerArgs, 'helpful' | 'traceId'>>;
  reportJob?: Resolver<Maybe<ResolversTypes['Job']>, ParentType, ContextType, RequireFields<MutationReportJobArgs, 'id'>>;
  scheduleBatchEmails?: Resolver<ResolversTypes['ScheduleBatchResult'], ParentType, ContextType, RequireFields<MutationScheduleBatchEmailsArgs, 'input'>>;
  scheduleFollowUpBatch?: Resolver<ResolversTypes['FollowUpBatchResult'], ParentType, ContextType, RequireFields<MutationScheduleFollowUpBatchArgs, 'input'>>;
  sendEmail?: Resolver<ResolversTypes['SendEmailResult'], ParentType, ContextType, RequireFields<MutationSendEmailArgs, 'input'>>;
  sendOutreachEmail?: Resolver<ResolversTypes['SendOutreachEmailResult'], ParentType, ContextType, RequireFields<MutationSendOutreachEmailArgs, 'input'>>;
  sendScheduledEmailNow?: Resolver<ResolversTypes['SendNowResult'], ParentType, ContextType, RequireFields<MutationSendScheduledEmailNowArgs, 'resendId'>>;
  syncResendEmails?: Resolver<ResolversTypes['SyncResendResult'], ParentType, ContextType, Partial<MutationSyncResendEmailsArgs>>;
  unarchiveEmail?: Resolver<ResolversTypes['ArchiveEmailResult'], ParentType, ContextType, RequireFields<MutationUnarchiveEmailArgs, 'id'>>;
  unarchiveJob?: Resolver<ResolversTypes['Job'], ParentType, ContextType, RequireFields<MutationUnarchiveJobArgs, 'id'>>;
  unblockCompany?: Resolver<ResolversTypes['DeleteBlockedCompanyResult'], ParentType, ContextType, RequireFields<MutationUnblockCompanyArgs, 'id'>>;
  unverifyCompanyContacts?: Resolver<ResolversTypes['UnverifyContactsResult'], ParentType, ContextType, RequireFields<MutationUnverifyCompanyContactsArgs, 'companyId'>>;
  updateApplication?: Resolver<ResolversTypes['Application'], ParentType, ContextType, RequireFields<MutationUpdateApplicationArgs, 'id' | 'input'>>;
  updateCampaign?: Resolver<ResolversTypes['EmailCampaign'], ParentType, ContextType, RequireFields<MutationUpdateCampaignArgs, 'id' | 'input'>>;
  updateCompany?: Resolver<ResolversTypes['Company'], ParentType, ContextType, RequireFields<MutationUpdateCompanyArgs, 'id' | 'input'>>;
  updateContact?: Resolver<ResolversTypes['Contact'], ParentType, ContextType, RequireFields<MutationUpdateContactArgs, 'id' | 'input'>>;
  updateEmailTemplate?: Resolver<ResolversTypes['EmailTemplate'], ParentType, ContextType, RequireFields<MutationUpdateEmailTemplateArgs, 'id' | 'input'>>;
  updateLangSmithPrompt?: Resolver<ResolversTypes['LangSmithPrompt'], ParentType, ContextType, RequireFields<MutationUpdateLangSmithPromptArgs, 'input' | 'promptIdentifier'>>;
  updateOpportunity?: Resolver<ResolversTypes['Opportunity'], ParentType, ContextType, RequireFields<MutationUpdateOpportunityArgs, 'id' | 'input'>>;
  updatePromptLabel?: Resolver<ResolversTypes['Prompt'], ParentType, ContextType, RequireFields<MutationUpdatePromptLabelArgs, 'label' | 'name' | 'version'>>;
  updateTask?: Resolver<ResolversTypes['Task'], ParentType, ContextType, RequireFields<MutationUpdateTaskArgs, 'id' | 'input'>>;
  updateUserSettings?: Resolver<ResolversTypes['UserSettings'], ParentType, ContextType, RequireFields<MutationUpdateUserSettingsArgs, 'settings' | 'userId'>>;
  uploadResume?: Resolver<Maybe<ResolversTypes['ResumeUploadResult']>, ParentType, ContextType, RequireFields<MutationUploadResumeArgs, 'email' | 'filename' | 'resumePdf'>>;
  upsert_company_ats_boards?: Resolver<Array<ResolversTypes['ATSBoard']>, ParentType, ContextType, RequireFields<MutationUpsert_Company_Ats_BoardsArgs, 'boards' | 'company_id'>>;
  verifyContactEmail?: Resolver<ResolversTypes['VerifyEmailResult'], ParentType, ContextType, RequireFields<MutationVerifyContactEmailArgs, 'contactId'>>;
};

export type OpportunitiesResultResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['OpportunitiesResult'] = ResolversParentTypes['OpportunitiesResult']> = {
  opportunities?: Resolver<Array<ResolversTypes['Opportunity']>, ParentType, ContextType>;
  totalCount?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
};

export type OpportunityResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['Opportunity'] = ResolversParentTypes['Opportunity']> = {
  applicationNotes?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  applicationStatus?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  applied?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  appliedAt?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  company?: Resolver<Maybe<ResolversTypes['Company']>, ParentType, ContextType>;
  companyId?: Resolver<Maybe<ResolversTypes['Int']>, ParentType, ContextType>;
  contactId?: Resolver<Maybe<ResolversTypes['Int']>, ParentType, ContextType>;
  createdAt?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  deadline?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  endDate?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  firstSeen?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  id?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  lastSeen?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  metadata?: Resolver<Maybe<ResolversTypes['JSON']>, ParentType, ContextType>;
  rawContext?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  rewardText?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  rewardUsd?: Resolver<Maybe<ResolversTypes['Float']>, ParentType, ContextType>;
  score?: Resolver<Maybe<ResolversTypes['Int']>, ParentType, ContextType>;
  source?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  startDate?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  status?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  tags?: Resolver<Array<ResolversTypes['String']>, ParentType, ContextType>;
  title?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  updatedAt?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  url?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
};

export type ProcessAllJobsResponseResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['ProcessAllJobsResponse'] = ResolversParentTypes['ProcessAllJobsResponse']> = {
  enhanceErrors?: Resolver<Maybe<ResolversTypes['Int']>, ParentType, ContextType>;
  enhanced?: Resolver<Maybe<ResolversTypes['Int']>, ParentType, ContextType>;
  errors?: Resolver<Maybe<ResolversTypes['Int']>, ParentType, ContextType>;
  euRemote?: Resolver<Maybe<ResolversTypes['Int']>, ParentType, ContextType>;
  message?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  nonEuRemote?: Resolver<Maybe<ResolversTypes['Int']>, ParentType, ContextType>;
  processed?: Resolver<Maybe<ResolversTypes['Int']>, ParentType, ContextType>;
  success?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
};

export type PromptResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['Prompt'] = ResolversParentTypes['Prompt']> = {
  chatMessages?: Resolver<Maybe<Array<ResolversTypes['ChatMessage']>>, ParentType, ContextType>;
  config?: Resolver<Maybe<ResolversTypes['PromptConfig']>, ParentType, ContextType>;
  createdAt?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  createdBy?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  isUserSpecific?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  labels?: Resolver<Maybe<Array<ResolversTypes['String']>>, ParentType, ContextType>;
  name?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  prompt?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  tags?: Resolver<Maybe<Array<ResolversTypes['String']>>, ParentType, ContextType>;
  type?: Resolver<ResolversTypes['PromptType'], ParentType, ContextType>;
  updatedAt?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  version?: Resolver<Maybe<ResolversTypes['Int']>, ParentType, ContextType>;
};

export type PromptConfigResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['PromptConfig'] = ResolversParentTypes['PromptConfig']> = {
  max_tokens?: Resolver<Maybe<ResolversTypes['Int']>, ParentType, ContextType>;
  model?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  temperature?: Resolver<Maybe<ResolversTypes['Float']>, ParentType, ContextType>;
  top_p?: Resolver<Maybe<ResolversTypes['Float']>, ParentType, ContextType>;
};

export type PromptUsageResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['PromptUsage'] = ResolversParentTypes['PromptUsage']> = {
  label?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  promptName?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  traceId?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  usedAt?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  userEmail?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  version?: Resolver<Maybe<ResolversTypes['Int']>, ParentType, ContextType>;
};

export type QueryResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['Query'] = ResolversParentTypes['Query']> = {
  allCompanyTags?: Resolver<Array<ResolversTypes['String']>, ParentType, ContextType>;
  application?: Resolver<Maybe<ResolversTypes['Application']>, ParentType, ContextType, RequireFields<QueryApplicationArgs, 'id'>>;
  applications?: Resolver<Array<ResolversTypes['Application']>, ParentType, ContextType>;
  askAboutResume?: Resolver<Maybe<ResolversTypes['ResumeAnswer']>, ParentType, ContextType, RequireFields<QueryAskAboutResumeArgs, 'email' | 'question'>>;
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
  executeSql?: Resolver<ResolversTypes['TextToSqlResult'], ParentType, ContextType, RequireFields<QueryExecuteSqlArgs, 'sql'>>;
  findCompany?: Resolver<ResolversTypes['FindCompanyResult'], ParentType, ContextType, Partial<QueryFindCompanyArgs>>;
  job?: Resolver<Maybe<ResolversTypes['Job']>, ParentType, ContextType, RequireFields<QueryJobArgs, 'id'>>;
  jobs?: Resolver<ResolversTypes['JobsResponse'], ParentType, ContextType, Partial<QueryJobsArgs>>;
  langsmithPrompt?: Resolver<Maybe<ResolversTypes['LangSmithPrompt']>, ParentType, ContextType, RequireFields<QueryLangsmithPromptArgs, 'promptIdentifier'>>;
  langsmithPromptCommit?: Resolver<Maybe<ResolversTypes['LangSmithPromptCommit']>, ParentType, ContextType, RequireFields<QueryLangsmithPromptCommitArgs, 'promptIdentifier'>>;
  langsmithPrompts?: Resolver<Array<ResolversTypes['LangSmithPrompt']>, ParentType, ContextType, Partial<QueryLangsmithPromptsArgs>>;
  myPromptUsage?: Resolver<Array<ResolversTypes['PromptUsage']>, ParentType, ContextType, Partial<QueryMyPromptUsageArgs>>;
  opportunities?: Resolver<ResolversTypes['OpportunitiesResult'], ParentType, ContextType, Partial<QueryOpportunitiesArgs>>;
  opportunity?: Resolver<Maybe<ResolversTypes['Opportunity']>, ParentType, ContextType, RequireFields<QueryOpportunityArgs, 'id'>>;
  prompt?: Resolver<Maybe<ResolversTypes['Prompt']>, ParentType, ContextType, RequireFields<QueryPromptArgs, 'name'>>;
  prompts?: Resolver<Array<ResolversTypes['RegisteredPrompt']>, ParentType, ContextType>;
  receivedEmail?: Resolver<Maybe<ResolversTypes['ReceivedEmail']>, ParentType, ContextType, RequireFields<QueryReceivedEmailArgs, 'id'>>;
  receivedEmails?: Resolver<ResolversTypes['ReceivedEmailsResult'], ParentType, ContextType, Partial<QueryReceivedEmailsArgs>>;
  resendEmail?: Resolver<Maybe<ResolversTypes['ResendEmailDetail']>, ParentType, ContextType, RequireFields<QueryResendEmailArgs, 'resendId'>>;
  resumeStatus?: Resolver<Maybe<ResolversTypes['ResumeStatus']>, ParentType, ContextType, RequireFields<QueryResumeStatusArgs, 'email'>>;
  task?: Resolver<Maybe<ResolversTypes['Task']>, ParentType, ContextType, RequireFields<QueryTaskArgs, 'id'>>;
  tasks?: Resolver<ResolversTypes['TasksResult'], ParentType, ContextType, Partial<QueryTasksArgs>>;
  textToSql?: Resolver<ResolversTypes['TextToSqlResult'], ParentType, ContextType, RequireFields<QueryTextToSqlArgs, 'question'>>;
  userSettings?: Resolver<Maybe<ResolversTypes['UserSettings']>, ParentType, ContextType, RequireFields<QueryUserSettingsArgs, 'userId'>>;
};

export type QuestionAnswerResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['QuestionAnswer'] = ResolversParentTypes['QuestionAnswer']> = {
  answerText?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  questionId?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  questionText?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
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

export type RegisteredPromptResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['RegisteredPrompt'] = ResolversParentTypes['RegisteredPrompt']> = {
  content?: Resolver<Maybe<ResolversTypes['JSON']>, ParentType, ContextType>;
  labels?: Resolver<Array<ResolversTypes['String']>, ParentType, ContextType>;
  lastConfig?: Resolver<Maybe<ResolversTypes['JSON']>, ParentType, ContextType>;
  lastUpdatedAt?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  lastUsedBy?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  name?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  tags?: Resolver<Array<ResolversTypes['String']>, ParentType, ContextType>;
  type?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  usageCount?: Resolver<Maybe<ResolversTypes['Int']>, ParentType, ContextType>;
  versions?: Resolver<Array<ResolversTypes['Int']>, ParentType, ContextType>;
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

export type ResumeAnswerResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['ResumeAnswer'] = ResolversParentTypes['ResumeAnswer']> = {
  answer?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  context_count?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  trace_id?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
};

export type ResumeIngestResultResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['ResumeIngestResult'] = ResolversParentTypes['ResumeIngestResult']> = {
  chunks_stored?: Resolver<Maybe<ResolversTypes['Int']>, ParentType, ContextType>;
  error?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  job_id?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  resume_id?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  status?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  success?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
};

export type ResumeStatusResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['ResumeStatus'] = ResolversParentTypes['ResumeStatus']> = {
  chunk_count?: Resolver<Maybe<ResolversTypes['Int']>, ParentType, ContextType>;
  exists?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  filename?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  ingested_at?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  resume_id?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
};

export type ResumeUploadResultResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['ResumeUploadResult'] = ResolversParentTypes['ResumeUploadResult']> = {
  job_id?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  status?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  success?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  tier?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
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

export type SkillMatchResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['SkillMatch'] = ResolversParentTypes['SkillMatch']> = {
  details?: Resolver<Array<ResolversTypes['SkillMatchDetail']>, ParentType, ContextType>;
  jobCoverage?: Resolver<ResolversTypes['Float'], ParentType, ContextType>;
  matchedCount?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  requiredCoverage?: Resolver<ResolversTypes['Float'], ParentType, ContextType>;
  score?: Resolver<ResolversTypes['Float'], ParentType, ContextType>;
  totalPreferred?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  userCoverage?: Resolver<ResolversTypes['Float'], ParentType, ContextType>;
};

export type SkillMatchDetailResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['SkillMatchDetail'] = ResolversParentTypes['SkillMatchDetail']> = {
  level?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  matched?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  tag?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
};

export type StackMutationResponseResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['StackMutationResponse'] = ResolversParentTypes['StackMutationResponse']> = {
  message?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  success?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
};

export type SyncResendResultResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['SyncResendResult'] = ResolversParentTypes['SyncResendResult']> = {
  error?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  skippedCount?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  success?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  totalCount?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  updatedCount?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
};

export type TaskResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['Task'] = ResolversParentTypes['Task']> = {
  completedAt?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  createdAt?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  description?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  dueDate?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  entityId?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  entityType?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  id?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  priority?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  status?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  tags?: Resolver<Array<ResolversTypes['String']>, ParentType, ContextType>;
  title?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  updatedAt?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
};

export type TasksResultResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['TasksResult'] = ResolversParentTypes['TasksResult']> = {
  tasks?: Resolver<Array<ResolversTypes['Task']>, ParentType, ContextType>;
  totalCount?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
};

export type TextToSqlResultResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['TextToSqlResult'] = ResolversParentTypes['TextToSqlResult']> = {
  columns?: Resolver<Array<ResolversTypes['String']>, ParentType, ContextType>;
  drilldownSearchQuery?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  explanation?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  rows?: Resolver<Array<Maybe<Array<Maybe<ResolversTypes['JSON']>>>>, ParentType, ContextType>;
  sql?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
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
  jobs_per_page?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  new_job_alerts?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  preferred_locations?: Resolver<Maybe<Array<ResolversTypes['String']>>, ParentType, ContextType>;
  preferred_skills?: Resolver<Maybe<Array<ResolversTypes['String']>>, ParentType, ContextType>;
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
  Application?: ApplicationResolvers<ContextType>;
  ApplyEmailPatternResult?: ApplyEmailPatternResultResolvers<ContextType>;
  ArchiveEmailResult?: ArchiveEmailResultResolvers<ContextType>;
  AshbyAddress?: AshbyAddressResolvers<ContextType>;
  AshbyCompensation?: AshbyCompensationResolvers<ContextType>;
  AshbyCompensationComponent?: AshbyCompensationComponentResolvers<ContextType>;
  AshbyCompensationTier?: AshbyCompensationTierResolvers<ContextType>;
  AshbyEnrichment?: AshbyEnrichmentResolvers<ContextType>;
  AshbyPostalAddress?: AshbyPostalAddressResolvers<ContextType>;
  AshbySecondaryLocation?: AshbySecondaryLocationResolvers<ContextType>;
  BlockJobsResult?: BlockJobsResultResolvers<ContextType>;
  BlockedCompany?: BlockedCompanyResolvers<ContextType>;
  CancelCompanyEmailsResult?: CancelCompanyEmailsResultResolvers<ContextType>;
  CancelEmailResult?: CancelEmailResultResolvers<ContextType>;
  ChatMessage?: ChatMessageResolvers<ContextType>;
  CompaniesResponse?: CompaniesResponseResolvers<ContextType>;
  Company?: CompanyResolvers<ContextType>;
  CompanyContactEmail?: CompanyContactEmailResolvers<ContextType>;
  CompanyFact?: CompanyFactResolvers<ContextType>;
  CompanySnapshot?: CompanySnapshotResolvers<ContextType>;
  Contact?: ContactResolvers<ContextType>;
  ContactEmail?: ContactEmailResolvers<ContextType>;
  ContactsResult?: ContactsResultResolvers<ContextType>;
  DateTime?: GraphQLScalarType;
  DeleteApplicationResponse?: DeleteApplicationResponseResolvers<ContextType>;
  DeleteBlockedCompanyResult?: DeleteBlockedCompanyResultResolvers<ContextType>;
  DeleteCampaignResult?: DeleteCampaignResultResolvers<ContextType>;
  DeleteCompaniesResult?: DeleteCompaniesResultResolvers<ContextType>;
  DeleteCompanyResponse?: DeleteCompanyResponseResolvers<ContextType>;
  DeleteContactResult?: DeleteContactResultResolvers<ContextType>;
  DeleteEmailTemplateResult?: DeleteEmailTemplateResultResolvers<ContextType>;
  DeleteJobResponse?: DeleteJobResponseResolvers<ContextType>;
  DeleteOpportunityResult?: DeleteOpportunityResultResolvers<ContextType>;
  DeleteTaskResult?: DeleteTaskResultResolvers<ContextType>;
  EmailAddress?: GraphQLScalarType;
  EmailCampaign?: EmailCampaignResolvers<ContextType>;
  EmailCampaignsResult?: EmailCampaignsResultResolvers<ContextType>;
  EmailPreview?: EmailPreviewResolvers<ContextType>;
  EmailStats?: EmailStatsResolvers<ContextType>;
  EmailTemplate?: EmailTemplateResolvers<ContextType>;
  EmailTemplatesResult?: EmailTemplatesResultResolvers<ContextType>;
  EnhanceAllContactsResult?: EnhanceAllContactsResultResolvers<ContextType>;
  EnhanceCompanyResponse?: EnhanceCompanyResponseResolvers<ContextType>;
  EnhanceJobResponse?: EnhanceJobResponseResolvers<ContextType>;
  Evidence?: EvidenceResolvers<ContextType>;
  FindCompanyResult?: FindCompanyResultResolvers<ContextType>;
  FindContactEmailResult?: FindContactEmailResultResolvers<ContextType>;
  FollowUpBatchResult?: FollowUpBatchResultResolvers<ContextType>;
  FollowUpEmail?: FollowUpEmailResolvers<ContextType>;
  FollowUpEmailsResult?: FollowUpEmailsResultResolvers<ContextType>;
  GenerateEmailResult?: GenerateEmailResultResolvers<ContextType>;
  GenerateReplyResult?: GenerateReplyResultResolvers<ContextType>;
  GreenhouseCompliance?: GreenhouseComplianceResolvers<ContextType>;
  GreenhouseDataCompliance?: GreenhouseDataComplianceResolvers<ContextType>;
  GreenhouseDemographicQuestions?: GreenhouseDemographicQuestionsResolvers<ContextType>;
  GreenhouseDepartment?: GreenhouseDepartmentResolvers<ContextType>;
  GreenhouseMetadata?: GreenhouseMetadataResolvers<ContextType>;
  GreenhouseOffice?: GreenhouseOfficeResolvers<ContextType>;
  GreenhouseQuestion?: GreenhouseQuestionResolvers<ContextType>;
  GreenhouseQuestionField?: GreenhouseQuestionFieldResolvers<ContextType>;
  ImportCompaniesResult?: ImportCompaniesResultResolvers<ContextType>;
  ImportCompanyResult?: ImportCompanyResultResolvers<ContextType>;
  ImportContactsResult?: ImportContactsResultResolvers<ContextType>;
  ImportResendResult?: ImportResendResultResolvers<ContextType>;
  JSON?: GraphQLScalarType;
  Job?: JobResolvers<ContextType>;
  JobSkill?: JobSkillResolvers<ContextType>;
  JobsResponse?: JobsResponseResolvers<ContextType>;
  LangSmithPrompt?: LangSmithPromptResolvers<ContextType>;
  LangSmithPromptCommit?: LangSmithPromptCommitResolvers<ContextType>;
  MarkRepliedResult?: MarkRepliedResultResolvers<ContextType>;
  MergeCompaniesResult?: MergeCompaniesResultResolvers<ContextType>;
  MergeDuplicateContactsResult?: MergeDuplicateContactsResultResolvers<ContextType>;
  Mutation?: MutationResolvers<ContextType>;
  OpportunitiesResult?: OpportunitiesResultResolvers<ContextType>;
  Opportunity?: OpportunityResolvers<ContextType>;
  ProcessAllJobsResponse?: ProcessAllJobsResponseResolvers<ContextType>;
  Prompt?: PromptResolvers<ContextType>;
  PromptConfig?: PromptConfigResolvers<ContextType>;
  PromptUsage?: PromptUsageResolvers<ContextType>;
  Query?: QueryResolvers<ContextType>;
  QuestionAnswer?: QuestionAnswerResolvers<ContextType>;
  ReceivedEmail?: ReceivedEmailResolvers<ContextType>;
  ReceivedEmailsResult?: ReceivedEmailsResultResolvers<ContextType>;
  RegisteredPrompt?: RegisteredPromptResolvers<ContextType>;
  ResendEmailDetail?: ResendEmailDetailResolvers<ContextType>;
  ResumeAnswer?: ResumeAnswerResolvers<ContextType>;
  ResumeIngestResult?: ResumeIngestResultResolvers<ContextType>;
  ResumeStatus?: ResumeStatusResolvers<ContextType>;
  ResumeUploadResult?: ResumeUploadResultResolvers<ContextType>;
  ScheduleBatchResult?: ScheduleBatchResultResolvers<ContextType>;
  SendEmailResult?: SendEmailResultResolvers<ContextType>;
  SendNowResult?: SendNowResultResolvers<ContextType>;
  SendOutreachEmailResult?: SendOutreachEmailResultResolvers<ContextType>;
  SkillMatch?: SkillMatchResolvers<ContextType>;
  SkillMatchDetail?: SkillMatchDetailResolvers<ContextType>;
  StackMutationResponse?: StackMutationResponseResolvers<ContextType>;
  SyncResendResult?: SyncResendResultResolvers<ContextType>;
  Task?: TaskResolvers<ContextType>;
  TasksResult?: TasksResultResolvers<ContextType>;
  TextToSqlResult?: TextToSqlResultResolvers<ContextType>;
  URL?: GraphQLScalarType;
  UnverifyContactsResult?: UnverifyContactsResultResolvers<ContextType>;
  Upload?: GraphQLScalarType;
  UserSettings?: UserSettingsResolvers<ContextType>;
  VerifyEmailResult?: VerifyEmailResultResolvers<ContextType>;
  WarcPointer?: WarcPointerResolvers<ContextType>;
};

