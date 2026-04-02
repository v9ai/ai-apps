import { GraphQLResolveInfo } from 'graphql';
import { GraphQLContext } from '../app/apollo/context';
export type Maybe<T> = T | null | undefined;
export type InputMaybe<T> = T | null | undefined;
export type Exact<T extends { [key: string]: unknown }> = { [K in keyof T]: T[K] };
export type MakeOptional<T, K extends keyof T> = Omit<T, K> & { [SubKey in K]?: Maybe<T[SubKey]> };
export type MakeMaybe<T, K extends keyof T> = Omit<T, K> & { [SubKey in K]: Maybe<T[SubKey]> };
export type MakeEmpty<T extends { [key: string]: unknown }, K extends keyof T> = { [_ in K]?: never };
export type Incremental<T> = T | { [P in keyof T]?: P extends ' $fragmentName' | '__typename' ? T[P] : never };
export type Omit<T, K extends keyof T> = Pick<T, Exclude<keyof T, K>>;
export type EnumResolverSignature<T, AllowedValues = any> = { [key in keyof T]?: AllowedValues };
export type RequireFields<T, K extends keyof T> = Omit<T, K> & { [P in K]-?: NonNullable<T[P]> };
/** All built-in and custom scalars, mapped to their actual values */
export type Scalars = {
  ID: { input: string; output: string | number; }
  String: { input: string; output: string; }
  Boolean: { input: boolean; output: boolean; }
  Int: { input: number; output: number; }
  Float: { input: number; output: number; }
};

export type AudioAsset = {
  __typename?: 'AudioAsset';
  createdAt: Scalars['String']['output'];
  createdBy: Scalars['String']['output'];
  goalId: Scalars['Int']['output'];
  id: Scalars['String']['output'];
  language: Scalars['String']['output'];
  manifest: AudioManifest;
  mimeType: Scalars['String']['output'];
  storyId?: Maybe<Scalars['Int']['output']>;
  voice: Scalars['String']['output'];
};

export type AudioFromR2Result = {
  __typename?: 'AudioFromR2Result';
  audioUrl?: Maybe<Scalars['String']['output']>;
  key?: Maybe<Scalars['String']['output']>;
  message?: Maybe<Scalars['String']['output']>;
  metadata?: Maybe<AudioMetadata>;
  success: Scalars['Boolean']['output'];
};

export type AudioManifest = {
  __typename?: 'AudioManifest';
  segmentCount: Scalars['Int']['output'];
  segments: Array<AudioSegmentInfo>;
  totalDuration?: Maybe<Scalars['Float']['output']>;
};

export type AudioMetadata = {
  __typename?: 'AudioMetadata';
  chunks?: Maybe<Scalars['String']['output']>;
  generatedBy?: Maybe<Scalars['String']['output']>;
  instructions?: Maybe<Scalars['String']['output']>;
  model?: Maybe<Scalars['String']['output']>;
  textLength?: Maybe<Scalars['String']['output']>;
  voice?: Maybe<Scalars['String']['output']>;
};

export type AudioSegmentInfo = {
  __typename?: 'AudioSegmentInfo';
  duration?: Maybe<Scalars['Float']['output']>;
  idx: Scalars['Int']['output'];
  url: Scalars['String']['output'];
};

export type BehaviorIntensity =
  | 'HIGH'
  | 'LOW'
  | 'MEDIUM';

export type BehaviorObservation = {
  __typename?: 'BehaviorObservation';
  context?: Maybe<Scalars['String']['output']>;
  createdAt: Scalars['String']['output'];
  createdBy: Scalars['String']['output'];
  familyMember?: Maybe<FamilyMember>;
  familyMemberId: Scalars['Int']['output'];
  frequency?: Maybe<Scalars['Int']['output']>;
  goal?: Maybe<Goal>;
  goalId?: Maybe<Scalars['Int']['output']>;
  id: Scalars['Int']['output'];
  intensity?: Maybe<BehaviorIntensity>;
  issueId?: Maybe<Scalars['Int']['output']>;
  notes?: Maybe<Scalars['String']['output']>;
  observationType: BehaviorObservationType;
  observedAt: Scalars['String']['output'];
  updatedAt: Scalars['String']['output'];
};

export type BehaviorObservationType =
  | 'AVOIDANCE'
  | 'PARTIAL'
  | 'REFUSAL'
  | 'TARGET_OCCURRED';

export type BuildClaimCardsInput = {
  claims?: InputMaybe<Array<Scalars['String']['input']>>;
  perSourceLimit?: InputMaybe<Scalars['Int']['input']>;
  sources?: InputMaybe<Array<ResearchSource>>;
  text?: InputMaybe<Scalars['String']['input']>;
  topK?: InputMaybe<Scalars['Int']['input']>;
  useLlmJudge?: InputMaybe<Scalars['Boolean']['input']>;
};

export type BuildClaimCardsResult = {
  __typename?: 'BuildClaimCardsResult';
  cards: Array<ClaimCard>;
};

export type CheckNoteClaimsInput = {
  evidenceTopK?: InputMaybe<Scalars['Int']['input']>;
  maxClaims?: InputMaybe<Scalars['Int']['input']>;
  maxSourcesToResolve?: InputMaybe<Scalars['Int']['input']>;
  noteId: Scalars['Int']['input'];
  sources?: InputMaybe<Array<ResearchSource>>;
  useJudge?: InputMaybe<Scalars['Boolean']['input']>;
};

export type CheckNoteClaimsResult = {
  __typename?: 'CheckNoteClaimsResult';
  cards: Array<ClaimCard>;
  message?: Maybe<Scalars['String']['output']>;
  noteId: Scalars['Int']['output'];
  success: Scalars['Boolean']['output'];
};

export type ClaimCard = {
  __typename?: 'ClaimCard';
  claim: Scalars['String']['output'];
  confidence: Scalars['Float']['output'];
  createdAt: Scalars['String']['output'];
  evidence: Array<EvidenceItem>;
  id: Scalars['ID']['output'];
  notes?: Maybe<Scalars['String']['output']>;
  provenance: ClaimProvenance;
  queries: Array<Scalars['String']['output']>;
  scope?: Maybe<ClaimScope>;
  updatedAt: Scalars['String']['output'];
  verdict: ClaimVerdict;
};

export type ClaimProvenance = {
  __typename?: 'ClaimProvenance';
  generatedBy: Scalars['String']['output'];
  model?: Maybe<Scalars['String']['output']>;
  sourceTools: Array<Scalars['String']['output']>;
};

export type ClaimScope = {
  __typename?: 'ClaimScope';
  comparator?: Maybe<Scalars['String']['output']>;
  intervention?: Maybe<Scalars['String']['output']>;
  outcome?: Maybe<Scalars['String']['output']>;
  population?: Maybe<Scalars['String']['output']>;
  setting?: Maybe<Scalars['String']['output']>;
  timeframe?: Maybe<Scalars['String']['output']>;
};

export type ClaimVerdict =
  | 'CONTRADICTED'
  | 'INSUFFICIENT'
  | 'MIXED'
  | 'SUPPORTED'
  | 'UNVERIFIED';

export type Contact = {
  __typename?: 'Contact';
  ageYears?: Maybe<Scalars['Int']['output']>;
  createdAt: Scalars['String']['output'];
  createdBy: Scalars['String']['output'];
  description?: Maybe<Scalars['String']['output']>;
  firstName: Scalars['String']['output'];
  id: Scalars['Int']['output'];
  lastName?: Maybe<Scalars['String']['output']>;
  notes?: Maybe<Scalars['String']['output']>;
  role?: Maybe<Scalars['String']['output']>;
  slug?: Maybe<Scalars['String']['output']>;
  updatedAt: Scalars['String']['output'];
};

export type ContactFeedback = {
  __typename?: 'ContactFeedback';
  contact?: Maybe<Contact>;
  contactId: Scalars['Int']['output'];
  content: Scalars['String']['output'];
  createdAt: Scalars['String']['output'];
  createdBy: Scalars['String']['output'];
  extracted: Scalars['Boolean']['output'];
  extractedIssues?: Maybe<Array<ExtractedIssue>>;
  familyMember?: Maybe<FamilyMember>;
  familyMemberId: Scalars['Int']['output'];
  feedbackDate: Scalars['String']['output'];
  id: Scalars['Int']['output'];
  issues: Array<Issue>;
  source?: Maybe<FeedbackSource>;
  stories: Array<Story>;
  subject?: Maybe<Scalars['String']['output']>;
  tags?: Maybe<Array<Scalars['String']['output']>>;
  updatedAt: Scalars['String']['output'];
};

export type Conversation = {
  __typename?: 'Conversation';
  createdAt: Scalars['String']['output'];
  id: Scalars['Int']['output'];
  issueId: Scalars['Int']['output'];
  messages: Array<ConversationMessage>;
  title?: Maybe<Scalars['String']['output']>;
  updatedAt: Scalars['String']['output'];
  userId: Scalars['String']['output'];
};

export type ConversationMessage = {
  __typename?: 'ConversationMessage';
  content: Scalars['String']['output'];
  conversationId: Scalars['Int']['output'];
  createdAt: Scalars['String']['output'];
  id: Scalars['Int']['output'];
  role: Scalars['String']['output'];
};

export type ConvertJournalEntryToIssueInput = {
  category: Scalars['String']['input'];
  description?: InputMaybe<Scalars['String']['input']>;
  familyMemberId: Scalars['Int']['input'];
  recommendations?: InputMaybe<Array<Scalars['String']['input']>>;
  severity: Scalars['String']['input'];
  title?: InputMaybe<Scalars['String']['input']>;
};

export type CreateContactFeedbackInput = {
  contactId: Scalars['Int']['input'];
  content: Scalars['String']['input'];
  familyMemberId: Scalars['Int']['input'];
  feedbackDate: Scalars['String']['input'];
  source?: InputMaybe<FeedbackSource>;
  subject?: InputMaybe<Scalars['String']['input']>;
  tags?: InputMaybe<Array<Scalars['String']['input']>>;
};

export type CreateContactInput = {
  ageYears?: InputMaybe<Scalars['Int']['input']>;
  description?: InputMaybe<Scalars['String']['input']>;
  firstName: Scalars['String']['input'];
  lastName?: InputMaybe<Scalars['String']['input']>;
  notes?: InputMaybe<Scalars['String']['input']>;
  role?: InputMaybe<Scalars['String']['input']>;
};

export type CreateFamilyMemberInput = {
  ageYears?: InputMaybe<Scalars['Int']['input']>;
  bio?: InputMaybe<Scalars['String']['input']>;
  dateOfBirth?: InputMaybe<Scalars['String']['input']>;
  email?: InputMaybe<Scalars['String']['input']>;
  firstName: Scalars['String']['input'];
  location?: InputMaybe<Scalars['String']['input']>;
  name?: InputMaybe<Scalars['String']['input']>;
  occupation?: InputMaybe<Scalars['String']['input']>;
  phone?: InputMaybe<Scalars['String']['input']>;
  relationship?: InputMaybe<Scalars['String']['input']>;
};

export type CreateGoalInput = {
  description?: InputMaybe<Scalars['String']['input']>;
  familyMemberId: Scalars['Int']['input'];
  title: Scalars['String']['input'];
};

export type CreateHabitInput = {
  description?: InputMaybe<Scalars['String']['input']>;
  familyMemberId?: InputMaybe<Scalars['Int']['input']>;
  frequency?: InputMaybe<HabitFrequency>;
  goalId?: InputMaybe<Scalars['Int']['input']>;
  issueId?: InputMaybe<Scalars['Int']['input']>;
  targetCount?: InputMaybe<Scalars['Int']['input']>;
  title: Scalars['String']['input'];
};

export type CreateIssueInput = {
  category: Scalars['String']['input'];
  description: Scalars['String']['input'];
  familyMemberId: Scalars['Int']['input'];
  feedbackId?: InputMaybe<Scalars['Int']['input']>;
  recommendations?: InputMaybe<Array<Scalars['String']['input']>>;
  severity: Scalars['String']['input'];
  title: Scalars['String']['input'];
};

export type CreateJournalEntryInput = {
  content: Scalars['String']['input'];
  entryDate: Scalars['String']['input'];
  familyMemberId?: InputMaybe<Scalars['Int']['input']>;
  goalId?: InputMaybe<Scalars['Int']['input']>;
  isPrivate?: InputMaybe<Scalars['Boolean']['input']>;
  mood?: InputMaybe<Scalars['String']['input']>;
  moodScore?: InputMaybe<Scalars['Int']['input']>;
  tags?: InputMaybe<Array<Scalars['String']['input']>>;
  title?: InputMaybe<Scalars['String']['input']>;
};

export type CreateNoteInput = {
  content: Scalars['String']['input'];
  entityId: Scalars['Int']['input'];
  entityType: Scalars['String']['input'];
  linkedResearchIds?: InputMaybe<Array<Scalars['Int']['input']>>;
  noteType?: InputMaybe<Scalars['String']['input']>;
  slug?: InputMaybe<Scalars['String']['input']>;
  tags?: InputMaybe<Array<Scalars['String']['input']>>;
  title?: InputMaybe<Scalars['String']['input']>;
};

export type CreateRelationshipInput = {
  context?: InputMaybe<Scalars['String']['input']>;
  relatedId: Scalars['Int']['input'];
  relatedType: PersonType;
  relationshipType: Scalars['String']['input'];
  startDate?: InputMaybe<Scalars['String']['input']>;
  status?: InputMaybe<RelationshipStatus>;
  subjectId: Scalars['Int']['input'];
  subjectType: PersonType;
};

export type CreateStoryInput = {
  content: Scalars['String']['input'];
  goalId: Scalars['Int']['input'];
};

export type CreateSubGoalInput = {
  description?: InputMaybe<Scalars['String']['input']>;
  title: Scalars['String']['input'];
};

export type CreateTeacherFeedbackInput = {
  content: Scalars['String']['input'];
  familyMemberId: Scalars['Int']['input'];
  feedbackDate: Scalars['String']['input'];
  source?: InputMaybe<FeedbackSource>;
  subject?: InputMaybe<Scalars['String']['input']>;
  tags?: InputMaybe<Array<Scalars['String']['input']>>;
  teacherName: Scalars['String']['input'];
};

export type DataSnapshot = {
  __typename?: 'DataSnapshot';
  contactFeedbackCount: Scalars['Int']['output'];
  issueCount: Scalars['Int']['output'];
  journalEntryCount: Scalars['Int']['output'];
  observationCount: Scalars['Int']['output'];
  relatedMemberIssueCount: Scalars['Int']['output'];
  researchPaperCount: Scalars['Int']['output'];
  teacherFeedbackCount: Scalars['Int']['output'];
};

export type DeepIssueAnalysis = {
  __typename?: 'DeepIssueAnalysis';
  createdAt: Scalars['String']['output'];
  createdBy: Scalars['String']['output'];
  dataSnapshot: DataSnapshot;
  familyMember?: Maybe<FamilyMember>;
  familyMemberId: Scalars['Int']['output'];
  familySystemInsights: Array<FamilySystemInsight>;
  id: Scalars['Int']['output'];
  jobId?: Maybe<Scalars['String']['output']>;
  model: Scalars['String']['output'];
  parentAdvice: Array<ParentAdviceItem>;
  patternClusters: Array<PatternCluster>;
  priorityRecommendations: Array<PriorityRecommendation>;
  researchRelevance: Array<ResearchRelevanceMapping>;
  summary: Scalars['String']['output'];
  timelineAnalysis: TimelineAnalysis;
  triggerIssue?: Maybe<Issue>;
  triggerIssueId?: Maybe<Scalars['Int']['output']>;
  updatedAt: Scalars['String']['output'];
};

export type DeleteBehaviorObservationResult = {
  __typename?: 'DeleteBehaviorObservationResult';
  message?: Maybe<Scalars['String']['output']>;
  success: Scalars['Boolean']['output'];
};

export type DeleteContactFeedbackResult = {
  __typename?: 'DeleteContactFeedbackResult';
  message?: Maybe<Scalars['String']['output']>;
  success: Scalars['Boolean']['output'];
};

export type DeleteContactResult = {
  __typename?: 'DeleteContactResult';
  message?: Maybe<Scalars['String']['output']>;
  success: Scalars['Boolean']['output'];
};

export type DeleteConversationResult = {
  __typename?: 'DeleteConversationResult';
  id: Scalars['Int']['output'];
};

export type DeleteDeepAnalysisResult = {
  __typename?: 'DeleteDeepAnalysisResult';
  message?: Maybe<Scalars['String']['output']>;
  success: Scalars['Boolean']['output'];
};

export type DeleteFamilyMemberResult = {
  __typename?: 'DeleteFamilyMemberResult';
  message?: Maybe<Scalars['String']['output']>;
  success: Scalars['Boolean']['output'];
};

export type DeleteGoalResult = {
  __typename?: 'DeleteGoalResult';
  message?: Maybe<Scalars['String']['output']>;
  success: Scalars['Boolean']['output'];
};

export type DeleteHabitResult = {
  __typename?: 'DeleteHabitResult';
  message?: Maybe<Scalars['String']['output']>;
  success: Scalars['Boolean']['output'];
};

export type DeleteIssueResult = {
  __typename?: 'DeleteIssueResult';
  message?: Maybe<Scalars['String']['output']>;
  success: Scalars['Boolean']['output'];
};

export type DeleteIssueScreenshotResult = {
  __typename?: 'DeleteIssueScreenshotResult';
  success: Scalars['Boolean']['output'];
};

export type DeleteJournalEntryResult = {
  __typename?: 'DeleteJournalEntryResult';
  message?: Maybe<Scalars['String']['output']>;
  success: Scalars['Boolean']['output'];
};

export type DeleteNoteResult = {
  __typename?: 'DeleteNoteResult';
  message?: Maybe<Scalars['String']['output']>;
  success: Scalars['Boolean']['output'];
};

export type DeleteQuestionsResult = {
  __typename?: 'DeleteQuestionsResult';
  deletedCount: Scalars['Int']['output'];
  message?: Maybe<Scalars['String']['output']>;
  success: Scalars['Boolean']['output'];
};

export type DeleteRelationshipResult = {
  __typename?: 'DeleteRelationshipResult';
  message?: Maybe<Scalars['String']['output']>;
  success: Scalars['Boolean']['output'];
};

export type DeleteResearchResult = {
  __typename?: 'DeleteResearchResult';
  deletedCount: Scalars['Int']['output'];
  message?: Maybe<Scalars['String']['output']>;
  success: Scalars['Boolean']['output'];
};

export type DeleteStoryResult = {
  __typename?: 'DeleteStoryResult';
  message?: Maybe<Scalars['String']['output']>;
  success: Scalars['Boolean']['output'];
};

export type DeleteTeacherFeedbackResult = {
  __typename?: 'DeleteTeacherFeedbackResult';
  message?: Maybe<Scalars['String']['output']>;
  success: Scalars['Boolean']['output'];
};

export type DevelopmentalTier =
  | 'ADULT'
  | 'EARLY_ADOLESCENCE'
  | 'EARLY_CHILDHOOD'
  | 'LATE_ADOLESCENCE'
  | 'MIDDLE_CHILDHOOD';

export type EvidenceItem = {
  __typename?: 'EvidenceItem';
  excerpt?: Maybe<Scalars['String']['output']>;
  locator?: Maybe<EvidenceLocator>;
  paper: PaperCandidate;
  polarity: EvidencePolarity;
  rationale?: Maybe<Scalars['String']['output']>;
  score?: Maybe<Scalars['Float']['output']>;
};

export type EvidenceLocator = {
  __typename?: 'EvidenceLocator';
  page?: Maybe<Scalars['Int']['output']>;
  section?: Maybe<Scalars['String']['output']>;
  url?: Maybe<Scalars['String']['output']>;
};

export type EvidencePolarity =
  | 'CONTRADICTS'
  | 'IRRELEVANT'
  | 'MIXED'
  | 'SUPPORTS';

export type ExtractedIssue = {
  __typename?: 'ExtractedIssue';
  category: Scalars['String']['output'];
  description: Scalars['String']['output'];
  recommendations?: Maybe<Array<Scalars['String']['output']>>;
  severity: Scalars['String']['output'];
  title: Scalars['String']['output'];
};

export type FamilyMember = {
  __typename?: 'FamilyMember';
  ageYears?: Maybe<Scalars['Int']['output']>;
  behaviorObservations: Array<BehaviorObservation>;
  bio?: Maybe<Scalars['String']['output']>;
  createdAt: Scalars['String']['output'];
  dateOfBirth?: Maybe<Scalars['String']['output']>;
  email?: Maybe<Scalars['String']['output']>;
  firstName: Scalars['String']['output'];
  goals: Array<Goal>;
  id: Scalars['Int']['output'];
  issues: Array<Issue>;
  location?: Maybe<Scalars['String']['output']>;
  name?: Maybe<Scalars['String']['output']>;
  occupation?: Maybe<Scalars['String']['output']>;
  phone?: Maybe<Scalars['String']['output']>;
  relationship?: Maybe<Scalars['String']['output']>;
  relationships: Array<Relationship>;
  shares: Array<FamilyMemberShare>;
  slug?: Maybe<Scalars['String']['output']>;
  teacherFeedbacks: Array<TeacherFeedback>;
  updatedAt: Scalars['String']['output'];
  userId: Scalars['String']['output'];
};


export type FamilyMemberbehaviorObservationsArgs = {
  goalId?: InputMaybe<Scalars['Int']['input']>;
};

export type FamilyMemberShare = {
  __typename?: 'FamilyMemberShare';
  createdAt: Scalars['String']['output'];
  createdBy: Scalars['String']['output'];
  email: Scalars['String']['output'];
  familyMemberId: Scalars['Int']['output'];
  role: FamilyMemberShareRole;
};

export type FamilyMemberShareRole =
  | 'EDITOR'
  | 'VIEWER';

export type FamilySystemInsight = {
  __typename?: 'FamilySystemInsight';
  actionable: Scalars['Boolean']['output'];
  evidenceIssueIds: Array<Scalars['Int']['output']>;
  insight: Scalars['String']['output'];
  involvedMemberIds: Array<Scalars['Int']['output']>;
  involvedMemberNames: Array<Scalars['String']['output']>;
  systemicPattern?: Maybe<Scalars['String']['output']>;
};

export type FeedbackSource =
  | 'EMAIL'
  | 'MEETING'
  | 'NOTE'
  | 'OTHER'
  | 'PHONE'
  | 'REPORT';

export type GenerateAudioResult = {
  __typename?: 'GenerateAudioResult';
  audioUrl?: Maybe<Scalars['String']['output']>;
  jobId: Scalars['String']['output'];
  message?: Maybe<Scalars['String']['output']>;
  success: Scalars['Boolean']['output'];
};

export type GenerateDeepAnalysisResult = {
  __typename?: 'GenerateDeepAnalysisResult';
  jobId?: Maybe<Scalars['String']['output']>;
  message?: Maybe<Scalars['String']['output']>;
  success: Scalars['Boolean']['output'];
};

export type GenerateHabitsResult = {
  __typename?: 'GenerateHabitsResult';
  count?: Maybe<Scalars['Int']['output']>;
  habits?: Maybe<Array<Habit>>;
  message?: Maybe<Scalars['String']['output']>;
  success: Scalars['Boolean']['output'];
};

export type GenerateLongFormTextResult = {
  __typename?: 'GenerateLongFormTextResult';
  audioUrl?: Maybe<Scalars['String']['output']>;
  evals?: Maybe<Scalars['String']['output']>;
  jobId?: Maybe<Scalars['String']['output']>;
  manifestUrl?: Maybe<Scalars['String']['output']>;
  message?: Maybe<Scalars['String']['output']>;
  segmentUrls?: Maybe<Array<Scalars['String']['output']>>;
  storyId?: Maybe<Scalars['Int']['output']>;
  success: Scalars['Boolean']['output'];
  text?: Maybe<Scalars['String']['output']>;
};

export type GenerateOpenAIAudioInput = {
  instructions?: InputMaybe<Scalars['String']['input']>;
  model?: InputMaybe<OpenAITTSModel>;
  responseFormat?: InputMaybe<OpenAIAudioFormat>;
  speed?: InputMaybe<Scalars['Float']['input']>;
  storyId?: InputMaybe<Scalars['Int']['input']>;
  streamFormat?: InputMaybe<OpenAIStreamFormat>;
  text: Scalars['String']['input'];
  uploadToCloud?: InputMaybe<Scalars['Boolean']['input']>;
  voice?: InputMaybe<OpenAITTSVoice>;
};

export type GenerateOpenAIAudioResult = {
  __typename?: 'GenerateOpenAIAudioResult';
  audioBuffer?: Maybe<Scalars['String']['output']>;
  audioUrl?: Maybe<Scalars['String']['output']>;
  duration?: Maybe<Scalars['Float']['output']>;
  jobId?: Maybe<Scalars['String']['output']>;
  key?: Maybe<Scalars['String']['output']>;
  message?: Maybe<Scalars['String']['output']>;
  sizeBytes?: Maybe<Scalars['Int']['output']>;
  success: Scalars['Boolean']['output'];
};

export type GenerateParentAdviceResult = {
  __typename?: 'GenerateParentAdviceResult';
  message?: Maybe<Scalars['String']['output']>;
  parentAdvice?: Maybe<Scalars['String']['output']>;
  success: Scalars['Boolean']['output'];
};

export type GenerateQuestionsResult = {
  __typename?: 'GenerateQuestionsResult';
  jobId?: Maybe<Scalars['String']['output']>;
  message?: Maybe<Scalars['String']['output']>;
  questions: Array<TherapeuticQuestion>;
  success: Scalars['Boolean']['output'];
};

export type GenerateResearchResult = {
  __typename?: 'GenerateResearchResult';
  count?: Maybe<Scalars['Int']['output']>;
  jobId?: Maybe<Scalars['String']['output']>;
  message?: Maybe<Scalars['String']['output']>;
  success: Scalars['Boolean']['output'];
};

export type GenerationJob = {
  __typename?: 'GenerationJob';
  createdAt: Scalars['String']['output'];
  error?: Maybe<JobError>;
  goalId?: Maybe<Scalars['Int']['output']>;
  id: Scalars['String']['output'];
  progress: Scalars['Float']['output'];
  result?: Maybe<JobResult>;
  status: JobStatus;
  storyId?: Maybe<Scalars['Int']['output']>;
  type: JobType;
  updatedAt: Scalars['String']['output'];
  userId: Scalars['String']['output'];
};

export type Goal = {
  __typename?: 'Goal';
  createdAt: Scalars['String']['output'];
  createdBy: Scalars['String']['output'];
  description?: Maybe<Scalars['String']['output']>;
  familyMember?: Maybe<FamilyMember>;
  familyMemberId?: Maybe<Scalars['Int']['output']>;
  id: Scalars['Int']['output'];
  notes: Array<Note>;
  parentAdvice?: Maybe<Scalars['String']['output']>;
  parentAdviceGeneratedAt?: Maybe<Scalars['String']['output']>;
  parentAdviceLanguage?: Maybe<Scalars['String']['output']>;
  parentGoal?: Maybe<Goal>;
  parentGoalId?: Maybe<Scalars['Int']['output']>;
  priority: Scalars['String']['output'];
  questions: Array<TherapeuticQuestion>;
  research: Array<Research>;
  slug?: Maybe<Scalars['String']['output']>;
  status: Scalars['String']['output'];
  stories: Array<Story>;
  storyLanguage?: Maybe<Scalars['String']['output']>;
  subGoals: Array<Goal>;
  tags?: Maybe<Array<Scalars['String']['output']>>;
  targetDate?: Maybe<Scalars['String']['output']>;
  therapeuticText?: Maybe<Scalars['String']['output']>;
  therapeuticTextGeneratedAt?: Maybe<Scalars['String']['output']>;
  therapeuticTextLanguage?: Maybe<Scalars['String']['output']>;
  title: Scalars['String']['output'];
  updatedAt: Scalars['String']['output'];
};

export type Habit = {
  __typename?: 'Habit';
  createdAt: Scalars['String']['output'];
  description?: Maybe<Scalars['String']['output']>;
  familyMemberId?: Maybe<Scalars['Int']['output']>;
  frequency: HabitFrequency;
  goalId?: Maybe<Scalars['Int']['output']>;
  id: Scalars['Int']['output'];
  issueId?: Maybe<Scalars['Int']['output']>;
  logs: Array<HabitLog>;
  status: HabitStatus;
  targetCount: Scalars['Int']['output'];
  title: Scalars['String']['output'];
  todayLog?: Maybe<HabitLog>;
  updatedAt: Scalars['String']['output'];
  userId: Scalars['String']['output'];
};

export type HabitFrequency =
  | 'DAILY'
  | 'WEEKLY';

export type HabitLog = {
  __typename?: 'HabitLog';
  count: Scalars['Int']['output'];
  createdAt: Scalars['String']['output'];
  habitId: Scalars['Int']['output'];
  id: Scalars['Int']['output'];
  loggedDate: Scalars['String']['output'];
  notes?: Maybe<Scalars['String']['output']>;
  userId: Scalars['String']['output'];
};

export type HabitStatus =
  | 'ACTIVE'
  | 'ARCHIVED'
  | 'PAUSED';

export type Issue = {
  __typename?: 'Issue';
  category: Scalars['String']['output'];
  contacts: Array<Contact>;
  conversations: Array<Conversation>;
  createdAt: Scalars['String']['output'];
  createdBy: Scalars['String']['output'];
  description: Scalars['String']['output'];
  familyMember?: Maybe<FamilyMember>;
  familyMemberId: Scalars['Int']['output'];
  feedback?: Maybe<ContactFeedback>;
  feedbackId?: Maybe<Scalars['Int']['output']>;
  id: Scalars['Int']['output'];
  journalEntry?: Maybe<JournalEntry>;
  journalEntryId?: Maybe<Scalars['Int']['output']>;
  questions: Array<TherapeuticQuestion>;
  recommendations?: Maybe<Array<Scalars['String']['output']>>;
  relatedFamilyMember?: Maybe<FamilyMember>;
  relatedFamilyMemberId?: Maybe<Scalars['Int']['output']>;
  relatedIssues: Array<IssueLink>;
  screenshots: Array<IssueScreenshot>;
  severity: Scalars['String']['output'];
  stories: Array<Story>;
  title: Scalars['String']['output'];
  updatedAt: Scalars['String']['output'];
};

export type IssueContactLink = {
  __typename?: 'IssueContactLink';
  contact: Contact;
  id: Scalars['Int']['output'];
};

export type IssueLink = {
  __typename?: 'IssueLink';
  id: Scalars['Int']['output'];
  issue: Issue;
  linkType: Scalars['String']['output'];
};

export type IssueScreenshot = {
  __typename?: 'IssueScreenshot';
  caption?: Maybe<Scalars['String']['output']>;
  contentType: Scalars['String']['output'];
  createdAt: Scalars['String']['output'];
  filename: Scalars['String']['output'];
  id: Scalars['Int']['output'];
  issueId: Scalars['Int']['output'];
  sizeBytes: Scalars['Int']['output'];
  url: Scalars['String']['output'];
};

export type JobError = {
  __typename?: 'JobError';
  code?: Maybe<Scalars['String']['output']>;
  details?: Maybe<Scalars['String']['output']>;
  message: Scalars['String']['output'];
};

export type JobResult = {
  __typename?: 'JobResult';
  assetId?: Maybe<Scalars['String']['output']>;
  audioUrl?: Maybe<Scalars['String']['output']>;
  count?: Maybe<Scalars['Int']['output']>;
  diagnostics?: Maybe<PipelineDiagnostics>;
  manifestUrl?: Maybe<Scalars['String']['output']>;
  progress?: Maybe<Scalars['Int']['output']>;
  questions?: Maybe<Array<TherapeuticQuestion>>;
  segmentUrls?: Maybe<Array<Scalars['String']['output']>>;
  stage?: Maybe<Scalars['String']['output']>;
  text?: Maybe<Scalars['String']['output']>;
};

export type JobStatus =
  | 'FAILED'
  | 'RUNNING'
  | 'SUCCEEDED';

export type JobType =
  | 'AUDIO'
  | 'LONGFORM'
  | 'QUESTIONS'
  | 'RESEARCH';

export type JournalEntry = {
  __typename?: 'JournalEntry';
  content: Scalars['String']['output'];
  createdAt: Scalars['String']['output'];
  createdBy: Scalars['String']['output'];
  entryDate: Scalars['String']['output'];
  familyMember?: Maybe<FamilyMember>;
  familyMemberId?: Maybe<Scalars['Int']['output']>;
  goal?: Maybe<Goal>;
  goalId?: Maybe<Scalars['Int']['output']>;
  id: Scalars['Int']['output'];
  isPrivate: Scalars['Boolean']['output'];
  issue?: Maybe<Issue>;
  mood?: Maybe<Scalars['String']['output']>;
  moodScore?: Maybe<Scalars['Int']['output']>;
  tags?: Maybe<Array<Scalars['String']['output']>>;
  title?: Maybe<Scalars['String']['output']>;
  updatedAt: Scalars['String']['output'];
};

export type Mutation = {
  __typename?: 'Mutation';
  buildClaimCards: BuildClaimCardsResult;
  checkNoteClaims: CheckNoteClaimsResult;
  convertIssueToGoal: Goal;
  convertJournalEntryToIssue: Issue;
  createContact: Contact;
  createContactFeedback: ContactFeedback;
  createConversation: Conversation;
  createFamilyMember: FamilyMember;
  createGoal: Goal;
  createHabit: Habit;
  createIssue: Issue;
  createJournalEntry: JournalEntry;
  createNote: Note;
  createRelatedIssue: IssueLink;
  createRelationship: Relationship;
  createStory: Story;
  createSubGoal: Goal;
  createTeacherFeedback: TeacherFeedback;
  deleteBehaviorObservation: DeleteBehaviorObservationResult;
  deleteClaimCard: Scalars['Boolean']['output'];
  deleteContact: DeleteContactResult;
  deleteContactFeedback: DeleteContactFeedbackResult;
  deleteConversation: DeleteConversationResult;
  deleteDeepIssueAnalysis: DeleteDeepAnalysisResult;
  deleteFamilyMember: DeleteFamilyMemberResult;
  deleteGoal: DeleteGoalResult;
  deleteHabit: DeleteHabitResult;
  deleteHabitLog: Scalars['Boolean']['output'];
  deleteIssue: DeleteIssueResult;
  deleteIssueScreenshot: DeleteIssueScreenshotResult;
  deleteJournalEntry: DeleteJournalEntryResult;
  deleteNote: DeleteNoteResult;
  deleteRelationship: DeleteRelationshipResult;
  deleteResearch: DeleteResearchResult;
  deleteStory: DeleteStoryResult;
  deleteTeacherFeedback: DeleteTeacherFeedbackResult;
  deleteTherapeuticQuestions: DeleteQuestionsResult;
  extractContactFeedbackIssues: ContactFeedback;
  generateAudio: GenerateAudioResult;
  generateDeepIssueAnalysis: GenerateDeepAnalysisResult;
  generateHabitsForFamilyMember: GenerateHabitsResult;
  generateHabitsFromIssue: GenerateHabitsResult;
  generateLongFormText: GenerateLongFormTextResult;
  generateOpenAIAudio: GenerateOpenAIAudioResult;
  generateParentAdvice: GenerateParentAdviceResult;
  generateResearch: GenerateResearchResult;
  generateTherapeuticQuestions: GenerateQuestionsResult;
  linkContactToIssue: IssueContactLink;
  linkIssues: IssueLink;
  logHabit: HabitLog;
  markTeacherFeedbackExtracted: TeacherFeedback;
  refreshClaimCard: ClaimCard;
  sendConversationMessage: Conversation;
  setNoteVisibility: Note;
  shareFamilyMember: FamilyMemberShare;
  shareNote: NoteShare;
  unlinkContactFromIssue: UnlinkContactResult;
  unlinkGoalFamilyMember: Goal;
  unlinkIssues: UnlinkIssuesResult;
  unshareFamilyMember: Scalars['Boolean']['output'];
  unshareNote: Scalars['Boolean']['output'];
  updateBehaviorObservation: BehaviorObservation;
  updateContact: Contact;
  updateContactFeedback: ContactFeedback;
  updateFamilyMember: FamilyMember;
  updateGoal: Goal;
  updateHabit: Habit;
  updateIssue: Issue;
  updateJournalEntry: JournalEntry;
  updateNote: Note;
  updateRelationship: Relationship;
  updateStory: Story;
  updateTeacherFeedback: TeacherFeedback;
  updateUserSettings: UserSettings;
};


export type MutationbuildClaimCardsArgs = {
  input: BuildClaimCardsInput;
};


export type MutationcheckNoteClaimsArgs = {
  input: CheckNoteClaimsInput;
};


export type MutationconvertIssueToGoalArgs = {
  id: Scalars['Int']['input'];
  input: CreateGoalInput;
};


export type MutationconvertJournalEntryToIssueArgs = {
  id: Scalars['Int']['input'];
  input: ConvertJournalEntryToIssueInput;
};


export type MutationcreateContactArgs = {
  input: CreateContactInput;
};


export type MutationcreateContactFeedbackArgs = {
  input: CreateContactFeedbackInput;
};


export type MutationcreateConversationArgs = {
  issueId: Scalars['Int']['input'];
  message: Scalars['String']['input'];
};


export type MutationcreateFamilyMemberArgs = {
  input: CreateFamilyMemberInput;
};


export type MutationcreateGoalArgs = {
  input: CreateGoalInput;
};


export type MutationcreateHabitArgs = {
  input: CreateHabitInput;
};


export type MutationcreateIssueArgs = {
  input: CreateIssueInput;
};


export type MutationcreateJournalEntryArgs = {
  input: CreateJournalEntryInput;
};


export type MutationcreateNoteArgs = {
  input: CreateNoteInput;
};


export type MutationcreateRelatedIssueArgs = {
  input: CreateIssueInput;
  issueId: Scalars['Int']['input'];
  linkType?: InputMaybe<Scalars['String']['input']>;
};


export type MutationcreateRelationshipArgs = {
  input: CreateRelationshipInput;
};


export type MutationcreateStoryArgs = {
  input: CreateStoryInput;
};


export type MutationcreateSubGoalArgs = {
  goalId: Scalars['Int']['input'];
  input: CreateSubGoalInput;
};


export type MutationcreateTeacherFeedbackArgs = {
  input: CreateTeacherFeedbackInput;
};


export type MutationdeleteBehaviorObservationArgs = {
  id: Scalars['Int']['input'];
};


export type MutationdeleteClaimCardArgs = {
  id: Scalars['ID']['input'];
};


export type MutationdeleteContactArgs = {
  id: Scalars['Int']['input'];
};


export type MutationdeleteContactFeedbackArgs = {
  id: Scalars['Int']['input'];
};


export type MutationdeleteConversationArgs = {
  id: Scalars['Int']['input'];
};


export type MutationdeleteDeepIssueAnalysisArgs = {
  id: Scalars['Int']['input'];
};


export type MutationdeleteFamilyMemberArgs = {
  id: Scalars['Int']['input'];
};


export type MutationdeleteGoalArgs = {
  id: Scalars['Int']['input'];
};


export type MutationdeleteHabitArgs = {
  id: Scalars['Int']['input'];
};


export type MutationdeleteHabitLogArgs = {
  id: Scalars['Int']['input'];
};


export type MutationdeleteIssueArgs = {
  id: Scalars['Int']['input'];
};


export type MutationdeleteIssueScreenshotArgs = {
  id: Scalars['Int']['input'];
};


export type MutationdeleteJournalEntryArgs = {
  id: Scalars['Int']['input'];
};


export type MutationdeleteNoteArgs = {
  id: Scalars['Int']['input'];
};


export type MutationdeleteRelationshipArgs = {
  id: Scalars['Int']['input'];
};


export type MutationdeleteResearchArgs = {
  goalId: Scalars['Int']['input'];
};


export type MutationdeleteStoryArgs = {
  id: Scalars['Int']['input'];
};


export type MutationdeleteTeacherFeedbackArgs = {
  id: Scalars['Int']['input'];
};


export type MutationdeleteTherapeuticQuestionsArgs = {
  goalId?: InputMaybe<Scalars['Int']['input']>;
  issueId?: InputMaybe<Scalars['Int']['input']>;
};


export type MutationextractContactFeedbackIssuesArgs = {
  id: Scalars['Int']['input'];
};


export type MutationgenerateAudioArgs = {
  goalId: Scalars['Int']['input'];
  language?: InputMaybe<Scalars['String']['input']>;
  storyId?: InputMaybe<Scalars['Int']['input']>;
  text?: InputMaybe<Scalars['String']['input']>;
  voice?: InputMaybe<Scalars['String']['input']>;
};


export type MutationgenerateDeepIssueAnalysisArgs = {
  familyMemberId: Scalars['Int']['input'];
  triggerIssueId?: InputMaybe<Scalars['Int']['input']>;
};


export type MutationgenerateHabitsForFamilyMemberArgs = {
  count?: InputMaybe<Scalars['Int']['input']>;
  familyMemberId: Scalars['Int']['input'];
};


export type MutationgenerateHabitsFromIssueArgs = {
  count?: InputMaybe<Scalars['Int']['input']>;
  issueId: Scalars['Int']['input'];
};


export type MutationgenerateLongFormTextArgs = {
  familyMemberId?: InputMaybe<Scalars['Int']['input']>;
  feedbackId?: InputMaybe<Scalars['Int']['input']>;
  goalId?: InputMaybe<Scalars['Int']['input']>;
  issueId?: InputMaybe<Scalars['Int']['input']>;
  language?: InputMaybe<Scalars['String']['input']>;
  minutes?: InputMaybe<Scalars['Int']['input']>;
  userContext?: InputMaybe<Scalars['String']['input']>;
};


export type MutationgenerateOpenAIAudioArgs = {
  input: GenerateOpenAIAudioInput;
};


export type MutationgenerateParentAdviceArgs = {
  goalId: Scalars['Int']['input'];
  language?: InputMaybe<Scalars['String']['input']>;
};


export type MutationgenerateResearchArgs = {
  feedbackId?: InputMaybe<Scalars['Int']['input']>;
  goalId?: InputMaybe<Scalars['Int']['input']>;
  issueId?: InputMaybe<Scalars['Int']['input']>;
};


export type MutationgenerateTherapeuticQuestionsArgs = {
  goalId?: InputMaybe<Scalars['Int']['input']>;
  issueId?: InputMaybe<Scalars['Int']['input']>;
};


export type MutationlinkContactToIssueArgs = {
  contactId: Scalars['Int']['input'];
  issueId: Scalars['Int']['input'];
};


export type MutationlinkIssuesArgs = {
  issueId: Scalars['Int']['input'];
  linkType?: InputMaybe<Scalars['String']['input']>;
  linkedIssueId: Scalars['Int']['input'];
};


export type MutationlogHabitArgs = {
  count?: InputMaybe<Scalars['Int']['input']>;
  habitId: Scalars['Int']['input'];
  loggedDate: Scalars['String']['input'];
  notes?: InputMaybe<Scalars['String']['input']>;
};


export type MutationmarkTeacherFeedbackExtractedArgs = {
  id: Scalars['Int']['input'];
};


export type MutationrefreshClaimCardArgs = {
  id: Scalars['ID']['input'];
};


export type MutationsendConversationMessageArgs = {
  conversationId: Scalars['Int']['input'];
  message: Scalars['String']['input'];
};


export type MutationsetNoteVisibilityArgs = {
  noteId: Scalars['Int']['input'];
  visibility: NoteVisibility;
};


export type MutationshareFamilyMemberArgs = {
  email: Scalars['String']['input'];
  familyMemberId: Scalars['Int']['input'];
  role?: InputMaybe<FamilyMemberShareRole>;
};


export type MutationshareNoteArgs = {
  email: Scalars['String']['input'];
  noteId: Scalars['Int']['input'];
  role?: InputMaybe<NoteShareRole>;
};


export type MutationunlinkContactFromIssueArgs = {
  contactId: Scalars['Int']['input'];
  issueId: Scalars['Int']['input'];
};


export type MutationunlinkGoalFamilyMemberArgs = {
  id: Scalars['Int']['input'];
};


export type MutationunlinkIssuesArgs = {
  issueId: Scalars['Int']['input'];
  linkedIssueId: Scalars['Int']['input'];
};


export type MutationunshareFamilyMemberArgs = {
  email: Scalars['String']['input'];
  familyMemberId: Scalars['Int']['input'];
};


export type MutationunshareNoteArgs = {
  email: Scalars['String']['input'];
  noteId: Scalars['Int']['input'];
};


export type MutationupdateBehaviorObservationArgs = {
  id: Scalars['Int']['input'];
  input: UpdateBehaviorObservationInput;
};


export type MutationupdateContactArgs = {
  id: Scalars['Int']['input'];
  input: UpdateContactInput;
};


export type MutationupdateContactFeedbackArgs = {
  id: Scalars['Int']['input'];
  input: UpdateContactFeedbackInput;
};


export type MutationupdateFamilyMemberArgs = {
  id: Scalars['Int']['input'];
  input: UpdateFamilyMemberInput;
};


export type MutationupdateGoalArgs = {
  id: Scalars['Int']['input'];
  input: UpdateGoalInput;
};


export type MutationupdateHabitArgs = {
  id: Scalars['Int']['input'];
  input: UpdateHabitInput;
};


export type MutationupdateIssueArgs = {
  id: Scalars['Int']['input'];
  input: UpdateIssueInput;
};


export type MutationupdateJournalEntryArgs = {
  id: Scalars['Int']['input'];
  input: UpdateJournalEntryInput;
};


export type MutationupdateNoteArgs = {
  id: Scalars['Int']['input'];
  input: UpdateNoteInput;
};


export type MutationupdateRelationshipArgs = {
  id: Scalars['Int']['input'];
  input: UpdateRelationshipInput;
};


export type MutationupdateStoryArgs = {
  id: Scalars['Int']['input'];
  input: UpdateStoryInput;
};


export type MutationupdateTeacherFeedbackArgs = {
  id: Scalars['Int']['input'];
  input: UpdateTeacherFeedbackInput;
};


export type MutationupdateUserSettingsArgs = {
  storyLanguage: Scalars['String']['input'];
  storyMinutes?: InputMaybe<Scalars['Int']['input']>;
};

export type Note = {
  __typename?: 'Note';
  claimCards?: Maybe<Array<ClaimCard>>;
  content: Scalars['String']['output'];
  createdAt: Scalars['String']['output'];
  createdBy: Scalars['String']['output'];
  entityId: Scalars['Int']['output'];
  entityType: Scalars['String']['output'];
  goal?: Maybe<Goal>;
  id: Scalars['Int']['output'];
  linkedResearch?: Maybe<Array<Research>>;
  noteType?: Maybe<Scalars['String']['output']>;
  shares: Array<NoteShare>;
  slug?: Maybe<Scalars['String']['output']>;
  tags?: Maybe<Array<Scalars['String']['output']>>;
  title?: Maybe<Scalars['String']['output']>;
  updatedAt: Scalars['String']['output'];
  viewerAccess: NoteAccess;
  visibility: NoteVisibility;
};

export type NoteAccess = {
  __typename?: 'NoteAccess';
  canEdit: Scalars['Boolean']['output'];
  canRead: Scalars['Boolean']['output'];
  reason?: Maybe<Scalars['String']['output']>;
};

export type NoteShare = {
  __typename?: 'NoteShare';
  createdAt: Scalars['String']['output'];
  createdBy: Scalars['String']['output'];
  email: Scalars['String']['output'];
  noteId: Scalars['Int']['output'];
  role: NoteShareRole;
};

export type NoteShareRole =
  | 'EDITOR'
  | 'READER';

export type NoteVisibility =
  | 'PRIVATE'
  | 'PUBLIC';

export type OpenAIAudioFormat =
  | 'AAC'
  | 'FLAC'
  | 'MP3'
  | 'OPUS'
  | 'PCM'
  | 'WAV';

export type OpenAIStreamFormat =
  | 'AUDIO'
  | 'SSE';

export type OpenAITTSModel =
  | 'GPT_4O_MINI_TTS'
  | 'TTS_1'
  | 'TTS_1_HD';

export type OpenAITTSVoice =
  | 'ALLOY'
  | 'ASH'
  | 'BALLAD'
  | 'CEDAR'
  | 'CORAL'
  | 'ECHO'
  | 'FABLE'
  | 'MARIN'
  | 'NOVA'
  | 'ONYX'
  | 'SAGE'
  | 'SHIMMER'
  | 'VERSE';

export type PaperCandidate = {
  __typename?: 'PaperCandidate';
  abstract?: Maybe<Scalars['String']['output']>;
  authors?: Maybe<Array<Scalars['String']['output']>>;
  doi?: Maybe<Scalars['String']['output']>;
  journal?: Maybe<Scalars['String']['output']>;
  oaStatus?: Maybe<Scalars['String']['output']>;
  oaUrl?: Maybe<Scalars['String']['output']>;
  source: Scalars['String']['output'];
  title: Scalars['String']['output'];
  url?: Maybe<Scalars['String']['output']>;
  year?: Maybe<Scalars['Int']['output']>;
};

export type ParentAdviceItem = {
  __typename?: 'ParentAdviceItem';
  advice: Scalars['String']['output'];
  ageAppropriate: Scalars['Boolean']['output'];
  concreteSteps: Array<Scalars['String']['output']>;
  developmentalContext?: Maybe<Scalars['String']['output']>;
  priority: Scalars['String']['output'];
  relatedPatternCluster?: Maybe<Scalars['String']['output']>;
  relatedResearchIds?: Maybe<Array<Scalars['Int']['output']>>;
  relatedResearchTitles?: Maybe<Array<Scalars['String']['output']>>;
  targetIssueIds: Array<Scalars['Int']['output']>;
  targetIssueTitles: Array<Scalars['String']['output']>;
  title: Scalars['String']['output'];
};

export type PatternCluster = {
  __typename?: 'PatternCluster';
  categories: Array<Scalars['String']['output']>;
  confidence: Scalars['Float']['output'];
  description: Scalars['String']['output'];
  issueIds: Array<Scalars['Int']['output']>;
  issueTitles: Array<Scalars['String']['output']>;
  name: Scalars['String']['output'];
  pattern: Scalars['String']['output'];
  suggestedRootCause?: Maybe<Scalars['String']['output']>;
};

export type PersonType =
  | 'CONTACT'
  | 'FAMILY_MEMBER';

export type PipelineDiagnostics = {
  __typename?: 'PipelineDiagnostics';
  enrichedCount?: Maybe<Scalars['Int']['output']>;
  enrichedDropped?: Maybe<Scalars['Int']['output']>;
  extractedCount?: Maybe<Scalars['Int']['output']>;
  persistedCount?: Maybe<Scalars['Int']['output']>;
  qualifiedCount?: Maybe<Scalars['Int']['output']>;
  searchCount?: Maybe<Scalars['Int']['output']>;
  searchUsedFallback?: Maybe<Scalars['Boolean']['output']>;
};

export type PriorityRecommendation = {
  __typename?: 'PriorityRecommendation';
  issueId?: Maybe<Scalars['Int']['output']>;
  issueTitle?: Maybe<Scalars['String']['output']>;
  rank: Scalars['Int']['output'];
  rationale: Scalars['String']['output'];
  relatedResearchIds?: Maybe<Array<Scalars['Int']['output']>>;
  suggestedApproach: Scalars['String']['output'];
  urgency: Scalars['String']['output'];
};

export type Query = {
  __typename?: 'Query';
  allIssues: Array<Issue>;
  allNotes: Array<Note>;
  allStories: Array<Story>;
  allTags: Array<Scalars['String']['output']>;
  audioFromR2?: Maybe<AudioFromR2Result>;
  behaviorObservation?: Maybe<BehaviorObservation>;
  behaviorObservations: Array<BehaviorObservation>;
  claimCard?: Maybe<ClaimCard>;
  claimCardsForNote: Array<ClaimCard>;
  contact?: Maybe<Contact>;
  contactFeedback?: Maybe<ContactFeedback>;
  contactFeedbacks: Array<ContactFeedback>;
  contacts: Array<Contact>;
  conversation?: Maybe<Conversation>;
  conversationsForIssue: Array<Conversation>;
  deepIssueAnalyses: Array<DeepIssueAnalysis>;
  deepIssueAnalysis?: Maybe<DeepIssueAnalysis>;
  familyMember?: Maybe<FamilyMember>;
  familyMembers: Array<FamilyMember>;
  generationJob?: Maybe<GenerationJob>;
  generationJobs: Array<GenerationJob>;
  goal?: Maybe<Goal>;
  goals: Array<Goal>;
  habit?: Maybe<Habit>;
  habits: Array<Habit>;
  issue?: Maybe<Issue>;
  issues: Array<Issue>;
  journalEntries: Array<JournalEntry>;
  journalEntry?: Maybe<JournalEntry>;
  mySharedFamilyMembers: Array<FamilyMember>;
  mySharedNotes: Array<Note>;
  note?: Maybe<Note>;
  notes: Array<Note>;
  relationship?: Maybe<Relationship>;
  relationships: Array<Relationship>;
  research: Array<Research>;
  stories: Array<Story>;
  story?: Maybe<Story>;
  teacherFeedback?: Maybe<TeacherFeedback>;
  teacherFeedbacks: Array<TeacherFeedback>;
  therapeuticQuestions: Array<TherapeuticQuestion>;
  userSettings: UserSettings;
};


export type QueryaudioFromR2Args = {
  key: Scalars['String']['input'];
};


export type QuerybehaviorObservationArgs = {
  id: Scalars['Int']['input'];
};


export type QuerybehaviorObservationsArgs = {
  familyMemberId: Scalars['Int']['input'];
  goalId?: InputMaybe<Scalars['Int']['input']>;
};


export type QueryclaimCardArgs = {
  id: Scalars['ID']['input'];
};


export type QueryclaimCardsForNoteArgs = {
  noteId: Scalars['Int']['input'];
};


export type QuerycontactArgs = {
  id?: InputMaybe<Scalars['Int']['input']>;
  slug?: InputMaybe<Scalars['String']['input']>;
};


export type QuerycontactFeedbackArgs = {
  id: Scalars['Int']['input'];
};


export type QuerycontactFeedbacksArgs = {
  contactId: Scalars['Int']['input'];
  familyMemberId: Scalars['Int']['input'];
};


export type QueryconversationArgs = {
  id: Scalars['Int']['input'];
};


export type QueryconversationsForIssueArgs = {
  issueId: Scalars['Int']['input'];
};


export type QuerydeepIssueAnalysesArgs = {
  familyMemberId: Scalars['Int']['input'];
};


export type QuerydeepIssueAnalysisArgs = {
  id: Scalars['Int']['input'];
};


export type QueryfamilyMemberArgs = {
  id?: InputMaybe<Scalars['Int']['input']>;
  slug?: InputMaybe<Scalars['String']['input']>;
};


export type QuerygenerationJobArgs = {
  id: Scalars['String']['input'];
};


export type QuerygenerationJobsArgs = {
  goalId?: InputMaybe<Scalars['Int']['input']>;
  status?: InputMaybe<Scalars['String']['input']>;
};


export type QuerygoalArgs = {
  id?: InputMaybe<Scalars['Int']['input']>;
  slug?: InputMaybe<Scalars['String']['input']>;
};


export type QuerygoalsArgs = {
  familyMemberId?: InputMaybe<Scalars['Int']['input']>;
  status?: InputMaybe<Scalars['String']['input']>;
  tag?: InputMaybe<Scalars['String']['input']>;
};


export type QueryhabitArgs = {
  id: Scalars['Int']['input'];
};


export type QueryhabitsArgs = {
  familyMemberId?: InputMaybe<Scalars['Int']['input']>;
  status?: InputMaybe<Scalars['String']['input']>;
};


export type QueryissueArgs = {
  id: Scalars['Int']['input'];
};


export type QueryissuesArgs = {
  familyMemberId: Scalars['Int']['input'];
  feedbackId?: InputMaybe<Scalars['Int']['input']>;
};


export type QueryjournalEntriesArgs = {
  familyMemberId?: InputMaybe<Scalars['Int']['input']>;
  fromDate?: InputMaybe<Scalars['String']['input']>;
  goalId?: InputMaybe<Scalars['Int']['input']>;
  mood?: InputMaybe<Scalars['String']['input']>;
  tag?: InputMaybe<Scalars['String']['input']>;
  toDate?: InputMaybe<Scalars['String']['input']>;
};


export type QueryjournalEntryArgs = {
  id: Scalars['Int']['input'];
};


export type QuerynoteArgs = {
  id?: InputMaybe<Scalars['Int']['input']>;
  slug?: InputMaybe<Scalars['String']['input']>;
};


export type QuerynotesArgs = {
  entityId: Scalars['Int']['input'];
  entityType: Scalars['String']['input'];
};


export type QueryrelationshipArgs = {
  id: Scalars['Int']['input'];
};


export type QueryrelationshipsArgs = {
  subjectId: Scalars['Int']['input'];
  subjectType: PersonType;
};


export type QueryresearchArgs = {
  feedbackId?: InputMaybe<Scalars['Int']['input']>;
  goalId?: InputMaybe<Scalars['Int']['input']>;
  issueId?: InputMaybe<Scalars['Int']['input']>;
};


export type QuerystoriesArgs = {
  goalId: Scalars['Int']['input'];
};


export type QuerystoryArgs = {
  id: Scalars['Int']['input'];
};


export type QueryteacherFeedbackArgs = {
  id: Scalars['Int']['input'];
};


export type QueryteacherFeedbacksArgs = {
  familyMemberId: Scalars['Int']['input'];
};


export type QuerytherapeuticQuestionsArgs = {
  goalId?: InputMaybe<Scalars['Int']['input']>;
  issueId?: InputMaybe<Scalars['Int']['input']>;
};

export type Relationship = {
  __typename?: 'Relationship';
  context?: Maybe<Scalars['String']['output']>;
  createdAt: Scalars['String']['output'];
  createdBy: Scalars['String']['output'];
  id: Scalars['Int']['output'];
  related?: Maybe<RelationshipPerson>;
  relatedId: Scalars['Int']['output'];
  relatedType: PersonType;
  relationshipType: Scalars['String']['output'];
  startDate?: Maybe<Scalars['String']['output']>;
  status: RelationshipStatus;
  subject?: Maybe<RelationshipPerson>;
  subjectId: Scalars['Int']['output'];
  subjectType: PersonType;
  updatedAt: Scalars['String']['output'];
};

export type RelationshipPerson = {
  __typename?: 'RelationshipPerson';
  firstName: Scalars['String']['output'];
  id: Scalars['Int']['output'];
  lastName?: Maybe<Scalars['String']['output']>;
  slug?: Maybe<Scalars['String']['output']>;
  type: PersonType;
};

export type RelationshipStatus =
  | 'ACTIVE'
  | 'ENDED';

export type Research = {
  __typename?: 'Research';
  abstract?: Maybe<Scalars['String']['output']>;
  authors: Array<Scalars['String']['output']>;
  createdAt: Scalars['String']['output'];
  doi?: Maybe<Scalars['String']['output']>;
  evidenceLevel?: Maybe<Scalars['String']['output']>;
  extractedBy: Scalars['String']['output'];
  extractionConfidence: Scalars['Float']['output'];
  feedbackId?: Maybe<Scalars['Int']['output']>;
  goal?: Maybe<Goal>;
  goalId?: Maybe<Scalars['Int']['output']>;
  id: Scalars['Int']['output'];
  issueId?: Maybe<Scalars['Int']['output']>;
  journal?: Maybe<Scalars['String']['output']>;
  keyFindings: Array<Scalars['String']['output']>;
  relevanceScore: Scalars['Float']['output'];
  therapeuticGoalType: Scalars['String']['output'];
  therapeuticTechniques: Array<Scalars['String']['output']>;
  title: Scalars['String']['output'];
  updatedAt: Scalars['String']['output'];
  url?: Maybe<Scalars['String']['output']>;
  year?: Maybe<Scalars['Int']['output']>;
};

export type ResearchRelevanceMapping = {
  __typename?: 'ResearchRelevanceMapping';
  coverageGaps: Array<Scalars['String']['output']>;
  patternClusterName: Scalars['String']['output'];
  relevantResearchIds: Array<Scalars['Int']['output']>;
  relevantResearchTitles: Array<Scalars['String']['output']>;
};

export type ResearchSource =
  | 'ARXIV'
  | 'CROSSREF'
  | 'DATACITE'
  | 'EUROPEPMC'
  | 'OPENALEX'
  | 'PUBMED'
  | 'SEMANTIC_SCHOLAR';

export type Story = {
  __typename?: 'Story';
  audioAssets: Array<AudioAsset>;
  audioGeneratedAt?: Maybe<Scalars['String']['output']>;
  audioKey?: Maybe<Scalars['String']['output']>;
  audioUrl?: Maybe<Scalars['String']['output']>;
  content: Scalars['String']['output'];
  createdAt: Scalars['String']['output'];
  createdBy?: Maybe<Scalars['String']['output']>;
  feedbackId?: Maybe<Scalars['Int']['output']>;
  goal?: Maybe<Goal>;
  goalId?: Maybe<Scalars['Int']['output']>;
  id: Scalars['Int']['output'];
  issue?: Maybe<Issue>;
  issueId?: Maybe<Scalars['Int']['output']>;
  language?: Maybe<Scalars['String']['output']>;
  minutes?: Maybe<Scalars['Int']['output']>;
  segments: Array<TextSegment>;
  updatedAt: Scalars['String']['output'];
};

export type Subscription = {
  __typename?: 'Subscription';
  audioJobStatus: GenerationJob;
  researchJobStatus: GenerationJob;
};


export type SubscriptionaudioJobStatusArgs = {
  jobId: Scalars['String']['input'];
};


export type SubscriptionresearchJobStatusArgs = {
  jobId: Scalars['String']['input'];
};

export type TeacherFeedback = {
  __typename?: 'TeacherFeedback';
  content: Scalars['String']['output'];
  createdAt: Scalars['String']['output'];
  createdBy: Scalars['String']['output'];
  extracted: Scalars['Boolean']['output'];
  familyMember?: Maybe<FamilyMember>;
  familyMemberId: Scalars['Int']['output'];
  feedbackDate: Scalars['String']['output'];
  id: Scalars['Int']['output'];
  source?: Maybe<FeedbackSource>;
  subject?: Maybe<Scalars['String']['output']>;
  tags?: Maybe<Array<Scalars['String']['output']>>;
  teacherName: Scalars['String']['output'];
  updatedAt: Scalars['String']['output'];
};

export type TextSegment = {
  __typename?: 'TextSegment';
  createdAt: Scalars['String']['output'];
  goalId: Scalars['Int']['output'];
  id: Scalars['Int']['output'];
  idx: Scalars['Int']['output'];
  storyId?: Maybe<Scalars['Int']['output']>;
  text: Scalars['String']['output'];
};

export type TherapeuticQuestion = {
  __typename?: 'TherapeuticQuestion';
  createdAt: Scalars['String']['output'];
  generatedAt: Scalars['String']['output'];
  goalId?: Maybe<Scalars['Int']['output']>;
  id: Scalars['Int']['output'];
  issueId?: Maybe<Scalars['Int']['output']>;
  question: Scalars['String']['output'];
  rationale: Scalars['String']['output'];
  researchId?: Maybe<Scalars['Int']['output']>;
  researchTitle?: Maybe<Scalars['String']['output']>;
  updatedAt: Scalars['String']['output'];
};

export type TimelineAnalysis = {
  __typename?: 'TimelineAnalysis';
  criticalPeriods: Array<Scalars['String']['output']>;
  escalationTrend?: Maybe<Scalars['String']['output']>;
  moodCorrelation?: Maybe<Scalars['String']['output']>;
  phases: Array<TimelinePhase>;
};

export type TimelinePhase = {
  __typename?: 'TimelinePhase';
  description: Scalars['String']['output'];
  issueIds: Array<Scalars['Int']['output']>;
  keyEvents: Array<Scalars['String']['output']>;
  moodTrend?: Maybe<Scalars['String']['output']>;
  period: Scalars['String']['output'];
};

export type UnlinkContactResult = {
  __typename?: 'UnlinkContactResult';
  success: Scalars['Boolean']['output'];
};

export type UnlinkIssuesResult = {
  __typename?: 'UnlinkIssuesResult';
  success: Scalars['Boolean']['output'];
};

export type UpdateBehaviorObservationInput = {
  context?: InputMaybe<Scalars['String']['input']>;
  frequency?: InputMaybe<Scalars['Int']['input']>;
  intensity?: InputMaybe<BehaviorIntensity>;
  notes?: InputMaybe<Scalars['String']['input']>;
  observationType?: InputMaybe<BehaviorObservationType>;
  observedAt?: InputMaybe<Scalars['String']['input']>;
};

export type UpdateContactFeedbackInput = {
  content?: InputMaybe<Scalars['String']['input']>;
  feedbackDate?: InputMaybe<Scalars['String']['input']>;
  source?: InputMaybe<FeedbackSource>;
  subject?: InputMaybe<Scalars['String']['input']>;
  tags?: InputMaybe<Array<Scalars['String']['input']>>;
};

export type UpdateContactInput = {
  ageYears?: InputMaybe<Scalars['Int']['input']>;
  description?: InputMaybe<Scalars['String']['input']>;
  firstName?: InputMaybe<Scalars['String']['input']>;
  lastName?: InputMaybe<Scalars['String']['input']>;
  notes?: InputMaybe<Scalars['String']['input']>;
  role?: InputMaybe<Scalars['String']['input']>;
  slug?: InputMaybe<Scalars['String']['input']>;
};

export type UpdateFamilyMemberInput = {
  ageYears?: InputMaybe<Scalars['Int']['input']>;
  bio?: InputMaybe<Scalars['String']['input']>;
  dateOfBirth?: InputMaybe<Scalars['String']['input']>;
  email?: InputMaybe<Scalars['String']['input']>;
  firstName?: InputMaybe<Scalars['String']['input']>;
  location?: InputMaybe<Scalars['String']['input']>;
  name?: InputMaybe<Scalars['String']['input']>;
  occupation?: InputMaybe<Scalars['String']['input']>;
  phone?: InputMaybe<Scalars['String']['input']>;
  relationship?: InputMaybe<Scalars['String']['input']>;
};

export type UpdateGoalInput = {
  description?: InputMaybe<Scalars['String']['input']>;
  familyMemberId?: InputMaybe<Scalars['Int']['input']>;
  priority?: InputMaybe<Scalars['String']['input']>;
  status?: InputMaybe<Scalars['String']['input']>;
  storyLanguage?: InputMaybe<Scalars['String']['input']>;
  tags?: InputMaybe<Array<Scalars['String']['input']>>;
  targetDate?: InputMaybe<Scalars['String']['input']>;
  title?: InputMaybe<Scalars['String']['input']>;
};

export type UpdateHabitInput = {
  description?: InputMaybe<Scalars['String']['input']>;
  frequency?: InputMaybe<HabitFrequency>;
  goalId?: InputMaybe<Scalars['Int']['input']>;
  status?: InputMaybe<HabitStatus>;
  targetCount?: InputMaybe<Scalars['Int']['input']>;
  title?: InputMaybe<Scalars['String']['input']>;
};

export type UpdateIssueInput = {
  category?: InputMaybe<Scalars['String']['input']>;
  description?: InputMaybe<Scalars['String']['input']>;
  familyMemberId?: InputMaybe<Scalars['Int']['input']>;
  recommendations?: InputMaybe<Array<Scalars['String']['input']>>;
  relatedFamilyMemberId?: InputMaybe<Scalars['Int']['input']>;
  severity?: InputMaybe<Scalars['String']['input']>;
  title?: InputMaybe<Scalars['String']['input']>;
};

export type UpdateJournalEntryInput = {
  content?: InputMaybe<Scalars['String']['input']>;
  entryDate?: InputMaybe<Scalars['String']['input']>;
  familyMemberId?: InputMaybe<Scalars['Int']['input']>;
  goalId?: InputMaybe<Scalars['Int']['input']>;
  isPrivate?: InputMaybe<Scalars['Boolean']['input']>;
  mood?: InputMaybe<Scalars['String']['input']>;
  moodScore?: InputMaybe<Scalars['Int']['input']>;
  tags?: InputMaybe<Array<Scalars['String']['input']>>;
  title?: InputMaybe<Scalars['String']['input']>;
};

export type UpdateNoteInput = {
  content?: InputMaybe<Scalars['String']['input']>;
  createdBy?: InputMaybe<Scalars['String']['input']>;
  linkedResearchIds?: InputMaybe<Array<Scalars['Int']['input']>>;
  noteType?: InputMaybe<Scalars['String']['input']>;
  tags?: InputMaybe<Array<Scalars['String']['input']>>;
  title?: InputMaybe<Scalars['String']['input']>;
};

export type UpdateRelationshipInput = {
  context?: InputMaybe<Scalars['String']['input']>;
  relationshipType?: InputMaybe<Scalars['String']['input']>;
  startDate?: InputMaybe<Scalars['String']['input']>;
  status?: InputMaybe<RelationshipStatus>;
};

export type UpdateStoryInput = {
  content?: InputMaybe<Scalars['String']['input']>;
};

export type UpdateTeacherFeedbackInput = {
  content?: InputMaybe<Scalars['String']['input']>;
  feedbackDate?: InputMaybe<Scalars['String']['input']>;
  source?: InputMaybe<FeedbackSource>;
  subject?: InputMaybe<Scalars['String']['input']>;
  tags?: InputMaybe<Array<Scalars['String']['input']>>;
  teacherName?: InputMaybe<Scalars['String']['input']>;
};

export type UserSettings = {
  __typename?: 'UserSettings';
  storyLanguage: Scalars['String']['output'];
  storyMinutes: Scalars['Int']['output'];
  userId: Scalars['String']['output'];
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
  AudioAsset: ResolverTypeWrapper<AudioAsset>;
  String: ResolverTypeWrapper<Scalars['String']['output']>;
  Int: ResolverTypeWrapper<Scalars['Int']['output']>;
  AudioFromR2Result: ResolverTypeWrapper<AudioFromR2Result>;
  Boolean: ResolverTypeWrapper<Scalars['Boolean']['output']>;
  AudioManifest: ResolverTypeWrapper<AudioManifest>;
  Float: ResolverTypeWrapper<Scalars['Float']['output']>;
  AudioMetadata: ResolverTypeWrapper<AudioMetadata>;
  AudioSegmentInfo: ResolverTypeWrapper<AudioSegmentInfo>;
  BehaviorIntensity: ResolverTypeWrapper<'LOW' | 'MEDIUM' | 'HIGH'>;
  BehaviorObservation: ResolverTypeWrapper<Omit<BehaviorObservation, 'familyMember' | 'goal' | 'intensity' | 'observationType'> & { familyMember?: Maybe<ResolversTypes['FamilyMember']>, goal?: Maybe<ResolversTypes['Goal']>, intensity?: Maybe<ResolversTypes['BehaviorIntensity']>, observationType: ResolversTypes['BehaviorObservationType'] }>;
  BehaviorObservationType: ResolverTypeWrapper<'REFUSAL' | 'TARGET_OCCURRED' | 'AVOIDANCE' | 'PARTIAL'>;
  BuildClaimCardsInput: BuildClaimCardsInput;
  BuildClaimCardsResult: ResolverTypeWrapper<Omit<BuildClaimCardsResult, 'cards'> & { cards: Array<ResolversTypes['ClaimCard']> }>;
  CheckNoteClaimsInput: CheckNoteClaimsInput;
  CheckNoteClaimsResult: ResolverTypeWrapper<Omit<CheckNoteClaimsResult, 'cards'> & { cards: Array<ResolversTypes['ClaimCard']> }>;
  ClaimCard: ResolverTypeWrapper<Omit<ClaimCard, 'evidence' | 'verdict'> & { evidence: Array<ResolversTypes['EvidenceItem']>, verdict: ResolversTypes['ClaimVerdict'] }>;
  ID: ResolverTypeWrapper<Scalars['ID']['output']>;
  ClaimProvenance: ResolverTypeWrapper<ClaimProvenance>;
  ClaimScope: ResolverTypeWrapper<ClaimScope>;
  ClaimVerdict: ResolverTypeWrapper<'CONTRADICTED' | 'INSUFFICIENT' | 'MIXED' | 'SUPPORTED' | 'UNVERIFIED'>;
  Contact: ResolverTypeWrapper<Contact>;
  ContactFeedback: ResolverTypeWrapper<Omit<ContactFeedback, 'familyMember' | 'issues' | 'source' | 'stories'> & { familyMember?: Maybe<ResolversTypes['FamilyMember']>, issues: Array<ResolversTypes['Issue']>, source?: Maybe<ResolversTypes['FeedbackSource']>, stories: Array<ResolversTypes['Story']> }>;
  Conversation: ResolverTypeWrapper<Conversation>;
  ConversationMessage: ResolverTypeWrapper<ConversationMessage>;
  ConvertJournalEntryToIssueInput: ConvertJournalEntryToIssueInput;
  CreateContactFeedbackInput: CreateContactFeedbackInput;
  CreateContactInput: CreateContactInput;
  CreateFamilyMemberInput: CreateFamilyMemberInput;
  CreateGoalInput: CreateGoalInput;
  CreateHabitInput: CreateHabitInput;
  CreateIssueInput: CreateIssueInput;
  CreateJournalEntryInput: CreateJournalEntryInput;
  CreateNoteInput: CreateNoteInput;
  CreateRelationshipInput: CreateRelationshipInput;
  CreateStoryInput: CreateStoryInput;
  CreateSubGoalInput: CreateSubGoalInput;
  CreateTeacherFeedbackInput: CreateTeacherFeedbackInput;
  DataSnapshot: ResolverTypeWrapper<DataSnapshot>;
  DeepIssueAnalysis: ResolverTypeWrapper<Omit<DeepIssueAnalysis, 'familyMember' | 'triggerIssue'> & { familyMember?: Maybe<ResolversTypes['FamilyMember']>, triggerIssue?: Maybe<ResolversTypes['Issue']> }>;
  DeleteBehaviorObservationResult: ResolverTypeWrapper<DeleteBehaviorObservationResult>;
  DeleteContactFeedbackResult: ResolverTypeWrapper<DeleteContactFeedbackResult>;
  DeleteContactResult: ResolverTypeWrapper<DeleteContactResult>;
  DeleteConversationResult: ResolverTypeWrapper<DeleteConversationResult>;
  DeleteDeepAnalysisResult: ResolverTypeWrapper<DeleteDeepAnalysisResult>;
  DeleteFamilyMemberResult: ResolverTypeWrapper<DeleteFamilyMemberResult>;
  DeleteGoalResult: ResolverTypeWrapper<DeleteGoalResult>;
  DeleteHabitResult: ResolverTypeWrapper<DeleteHabitResult>;
  DeleteIssueResult: ResolverTypeWrapper<DeleteIssueResult>;
  DeleteIssueScreenshotResult: ResolverTypeWrapper<DeleteIssueScreenshotResult>;
  DeleteJournalEntryResult: ResolverTypeWrapper<DeleteJournalEntryResult>;
  DeleteNoteResult: ResolverTypeWrapper<DeleteNoteResult>;
  DeleteQuestionsResult: ResolverTypeWrapper<DeleteQuestionsResult>;
  DeleteRelationshipResult: ResolverTypeWrapper<DeleteRelationshipResult>;
  DeleteResearchResult: ResolverTypeWrapper<DeleteResearchResult>;
  DeleteStoryResult: ResolverTypeWrapper<DeleteStoryResult>;
  DeleteTeacherFeedbackResult: ResolverTypeWrapper<DeleteTeacherFeedbackResult>;
  DevelopmentalTier: ResolverTypeWrapper<'EARLY_CHILDHOOD' | 'MIDDLE_CHILDHOOD' | 'EARLY_ADOLESCENCE' | 'LATE_ADOLESCENCE' | 'ADULT'>;
  EvidenceItem: ResolverTypeWrapper<Omit<EvidenceItem, 'polarity'> & { polarity: ResolversTypes['EvidencePolarity'] }>;
  EvidenceLocator: ResolverTypeWrapper<EvidenceLocator>;
  EvidencePolarity: ResolverTypeWrapper<'CONTRADICTS' | 'IRRELEVANT' | 'MIXED' | 'SUPPORTS'>;
  ExtractedIssue: ResolverTypeWrapper<ExtractedIssue>;
  FamilyMember: ResolverTypeWrapper<Omit<FamilyMember, 'behaviorObservations' | 'goals' | 'issues' | 'relationships' | 'shares' | 'teacherFeedbacks'> & { behaviorObservations: Array<ResolversTypes['BehaviorObservation']>, goals: Array<ResolversTypes['Goal']>, issues: Array<ResolversTypes['Issue']>, relationships: Array<ResolversTypes['Relationship']>, shares: Array<ResolversTypes['FamilyMemberShare']>, teacherFeedbacks: Array<ResolversTypes['TeacherFeedback']> }>;
  FamilyMemberShare: ResolverTypeWrapper<Omit<FamilyMemberShare, 'role'> & { role: ResolversTypes['FamilyMemberShareRole'] }>;
  FamilyMemberShareRole: ResolverTypeWrapper<'VIEWER' | 'EDITOR'>;
  FamilySystemInsight: ResolverTypeWrapper<FamilySystemInsight>;
  FeedbackSource: ResolverTypeWrapper<'EMAIL' | 'MEETING' | 'REPORT' | 'PHONE' | 'NOTE' | 'OTHER'>;
  GenerateAudioResult: ResolverTypeWrapper<GenerateAudioResult>;
  GenerateDeepAnalysisResult: ResolverTypeWrapper<GenerateDeepAnalysisResult>;
  GenerateHabitsResult: ResolverTypeWrapper<Omit<GenerateHabitsResult, 'habits'> & { habits?: Maybe<Array<ResolversTypes['Habit']>> }>;
  GenerateLongFormTextResult: ResolverTypeWrapper<GenerateLongFormTextResult>;
  GenerateOpenAIAudioInput: GenerateOpenAIAudioInput;
  GenerateOpenAIAudioResult: ResolverTypeWrapper<GenerateOpenAIAudioResult>;
  GenerateParentAdviceResult: ResolverTypeWrapper<GenerateParentAdviceResult>;
  GenerateQuestionsResult: ResolverTypeWrapper<GenerateQuestionsResult>;
  GenerateResearchResult: ResolverTypeWrapper<GenerateResearchResult>;
  GenerationJob: ResolverTypeWrapper<Omit<GenerationJob, 'status' | 'type'> & { status: ResolversTypes['JobStatus'], type: ResolversTypes['JobType'] }>;
  Goal: ResolverTypeWrapper<Omit<Goal, 'familyMember' | 'notes' | 'parentGoal' | 'research' | 'stories' | 'subGoals'> & { familyMember?: Maybe<ResolversTypes['FamilyMember']>, notes: Array<ResolversTypes['Note']>, parentGoal?: Maybe<ResolversTypes['Goal']>, research: Array<ResolversTypes['Research']>, stories: Array<ResolversTypes['Story']>, subGoals: Array<ResolversTypes['Goal']> }>;
  Habit: ResolverTypeWrapper<Omit<Habit, 'frequency' | 'status'> & { frequency: ResolversTypes['HabitFrequency'], status: ResolversTypes['HabitStatus'] }>;
  HabitFrequency: ResolverTypeWrapper<'DAILY' | 'WEEKLY'>;
  HabitLog: ResolverTypeWrapper<HabitLog>;
  HabitStatus: ResolverTypeWrapper<'ACTIVE' | 'PAUSED' | 'ARCHIVED'>;
  Issue: ResolverTypeWrapper<Omit<Issue, 'familyMember' | 'feedback' | 'journalEntry' | 'relatedFamilyMember' | 'relatedIssues' | 'stories'> & { familyMember?: Maybe<ResolversTypes['FamilyMember']>, feedback?: Maybe<ResolversTypes['ContactFeedback']>, journalEntry?: Maybe<ResolversTypes['JournalEntry']>, relatedFamilyMember?: Maybe<ResolversTypes['FamilyMember']>, relatedIssues: Array<ResolversTypes['IssueLink']>, stories: Array<ResolversTypes['Story']> }>;
  IssueContactLink: ResolverTypeWrapper<IssueContactLink>;
  IssueLink: ResolverTypeWrapper<Omit<IssueLink, 'issue'> & { issue: ResolversTypes['Issue'] }>;
  IssueScreenshot: ResolverTypeWrapper<IssueScreenshot>;
  JobError: ResolverTypeWrapper<JobError>;
  JobResult: ResolverTypeWrapper<JobResult>;
  JobStatus: ResolverTypeWrapper<'RUNNING' | 'SUCCEEDED' | 'FAILED'>;
  JobType: ResolverTypeWrapper<'AUDIO' | 'RESEARCH' | 'QUESTIONS' | 'LONGFORM'>;
  JournalEntry: ResolverTypeWrapper<Omit<JournalEntry, 'familyMember' | 'goal' | 'issue'> & { familyMember?: Maybe<ResolversTypes['FamilyMember']>, goal?: Maybe<ResolversTypes['Goal']>, issue?: Maybe<ResolversTypes['Issue']> }>;
  Mutation: ResolverTypeWrapper<Record<PropertyKey, never>>;
  Note: ResolverTypeWrapper<Omit<Note, 'claimCards' | 'goal' | 'linkedResearch' | 'shares' | 'visibility'> & { claimCards?: Maybe<Array<ResolversTypes['ClaimCard']>>, goal?: Maybe<ResolversTypes['Goal']>, linkedResearch?: Maybe<Array<ResolversTypes['Research']>>, shares: Array<ResolversTypes['NoteShare']>, visibility: ResolversTypes['NoteVisibility'] }>;
  NoteAccess: ResolverTypeWrapper<NoteAccess>;
  NoteShare: ResolverTypeWrapper<Omit<NoteShare, 'role'> & { role: ResolversTypes['NoteShareRole'] }>;
  NoteShareRole: ResolverTypeWrapper<'READER' | 'EDITOR'>;
  NoteVisibility: ResolverTypeWrapper<'PRIVATE' | 'PUBLIC'>;
  OpenAIAudioFormat: ResolverTypeWrapper<'MP3' | 'OPUS' | 'AAC' | 'FLAC' | 'WAV' | 'PCM'>;
  OpenAIStreamFormat: ResolverTypeWrapper<'SSE' | 'AUDIO'>;
  OpenAITTSModel: ResolverTypeWrapper<'TTS_1' | 'TTS_1_HD' | 'GPT_4O_MINI_TTS'>;
  OpenAITTSVoice: ResolverTypeWrapper<'ALLOY' | 'ASH' | 'BALLAD' | 'CORAL' | 'ECHO' | 'FABLE' | 'ONYX' | 'NOVA' | 'SAGE' | 'SHIMMER' | 'VERSE' | 'MARIN' | 'CEDAR'>;
  PaperCandidate: ResolverTypeWrapper<PaperCandidate>;
  ParentAdviceItem: ResolverTypeWrapper<ParentAdviceItem>;
  PatternCluster: ResolverTypeWrapper<PatternCluster>;
  PersonType: ResolverTypeWrapper<'FAMILY_MEMBER' | 'CONTACT'>;
  PipelineDiagnostics: ResolverTypeWrapper<PipelineDiagnostics>;
  PriorityRecommendation: ResolverTypeWrapper<PriorityRecommendation>;
  Query: ResolverTypeWrapper<Record<PropertyKey, never>>;
  Relationship: ResolverTypeWrapper<Omit<Relationship, 'related' | 'relatedType' | 'status' | 'subject' | 'subjectType'> & { related?: Maybe<ResolversTypes['RelationshipPerson']>, relatedType: ResolversTypes['PersonType'], status: ResolversTypes['RelationshipStatus'], subject?: Maybe<ResolversTypes['RelationshipPerson']>, subjectType: ResolversTypes['PersonType'] }>;
  RelationshipPerson: ResolverTypeWrapper<Omit<RelationshipPerson, 'type'> & { type: ResolversTypes['PersonType'] }>;
  RelationshipStatus: ResolverTypeWrapper<'ACTIVE' | 'ENDED'>;
  Research: ResolverTypeWrapper<Omit<Research, 'goal'> & { goal?: Maybe<ResolversTypes['Goal']> }>;
  ResearchRelevanceMapping: ResolverTypeWrapper<ResearchRelevanceMapping>;
  ResearchSource: ResolverTypeWrapper<'ARXIV' | 'CROSSREF' | 'DATACITE' | 'EUROPEPMC' | 'OPENALEX' | 'PUBMED' | 'SEMANTIC_SCHOLAR'>;
  Story: ResolverTypeWrapper<Omit<Story, 'goal' | 'issue'> & { goal?: Maybe<ResolversTypes['Goal']>, issue?: Maybe<ResolversTypes['Issue']> }>;
  Subscription: ResolverTypeWrapper<Record<PropertyKey, never>>;
  TeacherFeedback: ResolverTypeWrapper<Omit<TeacherFeedback, 'familyMember' | 'source'> & { familyMember?: Maybe<ResolversTypes['FamilyMember']>, source?: Maybe<ResolversTypes['FeedbackSource']> }>;
  TextSegment: ResolverTypeWrapper<TextSegment>;
  TherapeuticQuestion: ResolverTypeWrapper<TherapeuticQuestion>;
  TimelineAnalysis: ResolverTypeWrapper<TimelineAnalysis>;
  TimelinePhase: ResolverTypeWrapper<TimelinePhase>;
  UnlinkContactResult: ResolverTypeWrapper<UnlinkContactResult>;
  UnlinkIssuesResult: ResolverTypeWrapper<UnlinkIssuesResult>;
  UpdateBehaviorObservationInput: UpdateBehaviorObservationInput;
  UpdateContactFeedbackInput: UpdateContactFeedbackInput;
  UpdateContactInput: UpdateContactInput;
  UpdateFamilyMemberInput: UpdateFamilyMemberInput;
  UpdateGoalInput: UpdateGoalInput;
  UpdateHabitInput: UpdateHabitInput;
  UpdateIssueInput: UpdateIssueInput;
  UpdateJournalEntryInput: UpdateJournalEntryInput;
  UpdateNoteInput: UpdateNoteInput;
  UpdateRelationshipInput: UpdateRelationshipInput;
  UpdateStoryInput: UpdateStoryInput;
  UpdateTeacherFeedbackInput: UpdateTeacherFeedbackInput;
  UserSettings: ResolverTypeWrapper<UserSettings>;
};

/** Mapping between all available schema types and the resolvers parents */
export type ResolversParentTypes = {
  AudioAsset: AudioAsset;
  String: Scalars['String']['output'];
  Int: Scalars['Int']['output'];
  AudioFromR2Result: AudioFromR2Result;
  Boolean: Scalars['Boolean']['output'];
  AudioManifest: AudioManifest;
  Float: Scalars['Float']['output'];
  AudioMetadata: AudioMetadata;
  AudioSegmentInfo: AudioSegmentInfo;
  BehaviorObservation: Omit<BehaviorObservation, 'familyMember' | 'goal'> & { familyMember?: Maybe<ResolversParentTypes['FamilyMember']>, goal?: Maybe<ResolversParentTypes['Goal']> };
  BuildClaimCardsInput: BuildClaimCardsInput;
  BuildClaimCardsResult: Omit<BuildClaimCardsResult, 'cards'> & { cards: Array<ResolversParentTypes['ClaimCard']> };
  CheckNoteClaimsInput: CheckNoteClaimsInput;
  CheckNoteClaimsResult: Omit<CheckNoteClaimsResult, 'cards'> & { cards: Array<ResolversParentTypes['ClaimCard']> };
  ClaimCard: Omit<ClaimCard, 'evidence'> & { evidence: Array<ResolversParentTypes['EvidenceItem']> };
  ID: Scalars['ID']['output'];
  ClaimProvenance: ClaimProvenance;
  ClaimScope: ClaimScope;
  Contact: Contact;
  ContactFeedback: Omit<ContactFeedback, 'familyMember' | 'issues' | 'stories'> & { familyMember?: Maybe<ResolversParentTypes['FamilyMember']>, issues: Array<ResolversParentTypes['Issue']>, stories: Array<ResolversParentTypes['Story']> };
  Conversation: Conversation;
  ConversationMessage: ConversationMessage;
  ConvertJournalEntryToIssueInput: ConvertJournalEntryToIssueInput;
  CreateContactFeedbackInput: CreateContactFeedbackInput;
  CreateContactInput: CreateContactInput;
  CreateFamilyMemberInput: CreateFamilyMemberInput;
  CreateGoalInput: CreateGoalInput;
  CreateHabitInput: CreateHabitInput;
  CreateIssueInput: CreateIssueInput;
  CreateJournalEntryInput: CreateJournalEntryInput;
  CreateNoteInput: CreateNoteInput;
  CreateRelationshipInput: CreateRelationshipInput;
  CreateStoryInput: CreateStoryInput;
  CreateSubGoalInput: CreateSubGoalInput;
  CreateTeacherFeedbackInput: CreateTeacherFeedbackInput;
  DataSnapshot: DataSnapshot;
  DeepIssueAnalysis: Omit<DeepIssueAnalysis, 'familyMember' | 'triggerIssue'> & { familyMember?: Maybe<ResolversParentTypes['FamilyMember']>, triggerIssue?: Maybe<ResolversParentTypes['Issue']> };
  DeleteBehaviorObservationResult: DeleteBehaviorObservationResult;
  DeleteContactFeedbackResult: DeleteContactFeedbackResult;
  DeleteContactResult: DeleteContactResult;
  DeleteConversationResult: DeleteConversationResult;
  DeleteDeepAnalysisResult: DeleteDeepAnalysisResult;
  DeleteFamilyMemberResult: DeleteFamilyMemberResult;
  DeleteGoalResult: DeleteGoalResult;
  DeleteHabitResult: DeleteHabitResult;
  DeleteIssueResult: DeleteIssueResult;
  DeleteIssueScreenshotResult: DeleteIssueScreenshotResult;
  DeleteJournalEntryResult: DeleteJournalEntryResult;
  DeleteNoteResult: DeleteNoteResult;
  DeleteQuestionsResult: DeleteQuestionsResult;
  DeleteRelationshipResult: DeleteRelationshipResult;
  DeleteResearchResult: DeleteResearchResult;
  DeleteStoryResult: DeleteStoryResult;
  DeleteTeacherFeedbackResult: DeleteTeacherFeedbackResult;
  EvidenceItem: EvidenceItem;
  EvidenceLocator: EvidenceLocator;
  ExtractedIssue: ExtractedIssue;
  FamilyMember: Omit<FamilyMember, 'behaviorObservations' | 'goals' | 'issues' | 'relationships' | 'shares' | 'teacherFeedbacks'> & { behaviorObservations: Array<ResolversParentTypes['BehaviorObservation']>, goals: Array<ResolversParentTypes['Goal']>, issues: Array<ResolversParentTypes['Issue']>, relationships: Array<ResolversParentTypes['Relationship']>, shares: Array<ResolversParentTypes['FamilyMemberShare']>, teacherFeedbacks: Array<ResolversParentTypes['TeacherFeedback']> };
  FamilyMemberShare: FamilyMemberShare;
  FamilySystemInsight: FamilySystemInsight;
  GenerateAudioResult: GenerateAudioResult;
  GenerateDeepAnalysisResult: GenerateDeepAnalysisResult;
  GenerateHabitsResult: Omit<GenerateHabitsResult, 'habits'> & { habits?: Maybe<Array<ResolversParentTypes['Habit']>> };
  GenerateLongFormTextResult: GenerateLongFormTextResult;
  GenerateOpenAIAudioInput: GenerateOpenAIAudioInput;
  GenerateOpenAIAudioResult: GenerateOpenAIAudioResult;
  GenerateParentAdviceResult: GenerateParentAdviceResult;
  GenerateQuestionsResult: GenerateQuestionsResult;
  GenerateResearchResult: GenerateResearchResult;
  GenerationJob: GenerationJob;
  Goal: Omit<Goal, 'familyMember' | 'notes' | 'parentGoal' | 'research' | 'stories' | 'subGoals'> & { familyMember?: Maybe<ResolversParentTypes['FamilyMember']>, notes: Array<ResolversParentTypes['Note']>, parentGoal?: Maybe<ResolversParentTypes['Goal']>, research: Array<ResolversParentTypes['Research']>, stories: Array<ResolversParentTypes['Story']>, subGoals: Array<ResolversParentTypes['Goal']> };
  Habit: Habit;
  HabitLog: HabitLog;
  Issue: Omit<Issue, 'familyMember' | 'feedback' | 'journalEntry' | 'relatedFamilyMember' | 'relatedIssues' | 'stories'> & { familyMember?: Maybe<ResolversParentTypes['FamilyMember']>, feedback?: Maybe<ResolversParentTypes['ContactFeedback']>, journalEntry?: Maybe<ResolversParentTypes['JournalEntry']>, relatedFamilyMember?: Maybe<ResolversParentTypes['FamilyMember']>, relatedIssues: Array<ResolversParentTypes['IssueLink']>, stories: Array<ResolversParentTypes['Story']> };
  IssueContactLink: IssueContactLink;
  IssueLink: Omit<IssueLink, 'issue'> & { issue: ResolversParentTypes['Issue'] };
  IssueScreenshot: IssueScreenshot;
  JobError: JobError;
  JobResult: JobResult;
  JournalEntry: Omit<JournalEntry, 'familyMember' | 'goal' | 'issue'> & { familyMember?: Maybe<ResolversParentTypes['FamilyMember']>, goal?: Maybe<ResolversParentTypes['Goal']>, issue?: Maybe<ResolversParentTypes['Issue']> };
  Mutation: Record<PropertyKey, never>;
  Note: Omit<Note, 'claimCards' | 'goal' | 'linkedResearch' | 'shares'> & { claimCards?: Maybe<Array<ResolversParentTypes['ClaimCard']>>, goal?: Maybe<ResolversParentTypes['Goal']>, linkedResearch?: Maybe<Array<ResolversParentTypes['Research']>>, shares: Array<ResolversParentTypes['NoteShare']> };
  NoteAccess: NoteAccess;
  NoteShare: NoteShare;
  PaperCandidate: PaperCandidate;
  ParentAdviceItem: ParentAdviceItem;
  PatternCluster: PatternCluster;
  PipelineDiagnostics: PipelineDiagnostics;
  PriorityRecommendation: PriorityRecommendation;
  Query: Record<PropertyKey, never>;
  Relationship: Omit<Relationship, 'related' | 'subject'> & { related?: Maybe<ResolversParentTypes['RelationshipPerson']>, subject?: Maybe<ResolversParentTypes['RelationshipPerson']> };
  RelationshipPerson: RelationshipPerson;
  Research: Omit<Research, 'goal'> & { goal?: Maybe<ResolversParentTypes['Goal']> };
  ResearchRelevanceMapping: ResearchRelevanceMapping;
  Story: Omit<Story, 'goal' | 'issue'> & { goal?: Maybe<ResolversParentTypes['Goal']>, issue?: Maybe<ResolversParentTypes['Issue']> };
  Subscription: Record<PropertyKey, never>;
  TeacherFeedback: Omit<TeacherFeedback, 'familyMember'> & { familyMember?: Maybe<ResolversParentTypes['FamilyMember']> };
  TextSegment: TextSegment;
  TherapeuticQuestion: TherapeuticQuestion;
  TimelineAnalysis: TimelineAnalysis;
  TimelinePhase: TimelinePhase;
  UnlinkContactResult: UnlinkContactResult;
  UnlinkIssuesResult: UnlinkIssuesResult;
  UpdateBehaviorObservationInput: UpdateBehaviorObservationInput;
  UpdateContactFeedbackInput: UpdateContactFeedbackInput;
  UpdateContactInput: UpdateContactInput;
  UpdateFamilyMemberInput: UpdateFamilyMemberInput;
  UpdateGoalInput: UpdateGoalInput;
  UpdateHabitInput: UpdateHabitInput;
  UpdateIssueInput: UpdateIssueInput;
  UpdateJournalEntryInput: UpdateJournalEntryInput;
  UpdateNoteInput: UpdateNoteInput;
  UpdateRelationshipInput: UpdateRelationshipInput;
  UpdateStoryInput: UpdateStoryInput;
  UpdateTeacherFeedbackInput: UpdateTeacherFeedbackInput;
  UserSettings: UserSettings;
};

export type AudioAssetResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['AudioAsset'] = ResolversParentTypes['AudioAsset']> = {
  createdAt?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  createdBy?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  goalId?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  id?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  language?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  manifest?: Resolver<ResolversTypes['AudioManifest'], ParentType, ContextType>;
  mimeType?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  storyId?: Resolver<Maybe<ResolversTypes['Int']>, ParentType, ContextType>;
  voice?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
};

export type AudioFromR2ResultResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['AudioFromR2Result'] = ResolversParentTypes['AudioFromR2Result']> = {
  audioUrl?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  key?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  message?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  metadata?: Resolver<Maybe<ResolversTypes['AudioMetadata']>, ParentType, ContextType>;
  success?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
};

export type AudioManifestResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['AudioManifest'] = ResolversParentTypes['AudioManifest']> = {
  segmentCount?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  segments?: Resolver<Array<ResolversTypes['AudioSegmentInfo']>, ParentType, ContextType>;
  totalDuration?: Resolver<Maybe<ResolversTypes['Float']>, ParentType, ContextType>;
};

export type AudioMetadataResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['AudioMetadata'] = ResolversParentTypes['AudioMetadata']> = {
  chunks?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  generatedBy?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  instructions?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  model?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  textLength?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  voice?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
};

export type AudioSegmentInfoResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['AudioSegmentInfo'] = ResolversParentTypes['AudioSegmentInfo']> = {
  duration?: Resolver<Maybe<ResolversTypes['Float']>, ParentType, ContextType>;
  idx?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  url?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
};

export type BehaviorIntensityResolvers = EnumResolverSignature<{ HIGH?: any, LOW?: any, MEDIUM?: any }, ResolversTypes['BehaviorIntensity']>;

export type BehaviorObservationResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['BehaviorObservation'] = ResolversParentTypes['BehaviorObservation']> = {
  context?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  createdAt?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  createdBy?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  familyMember?: Resolver<Maybe<ResolversTypes['FamilyMember']>, ParentType, ContextType>;
  familyMemberId?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  frequency?: Resolver<Maybe<ResolversTypes['Int']>, ParentType, ContextType>;
  goal?: Resolver<Maybe<ResolversTypes['Goal']>, ParentType, ContextType>;
  goalId?: Resolver<Maybe<ResolversTypes['Int']>, ParentType, ContextType>;
  id?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  intensity?: Resolver<Maybe<ResolversTypes['BehaviorIntensity']>, ParentType, ContextType>;
  issueId?: Resolver<Maybe<ResolversTypes['Int']>, ParentType, ContextType>;
  notes?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  observationType?: Resolver<ResolversTypes['BehaviorObservationType'], ParentType, ContextType>;
  observedAt?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  updatedAt?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
};

export type BehaviorObservationTypeResolvers = EnumResolverSignature<{ AVOIDANCE?: any, PARTIAL?: any, REFUSAL?: any, TARGET_OCCURRED?: any }, ResolversTypes['BehaviorObservationType']>;

export type BuildClaimCardsResultResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['BuildClaimCardsResult'] = ResolversParentTypes['BuildClaimCardsResult']> = {
  cards?: Resolver<Array<ResolversTypes['ClaimCard']>, ParentType, ContextType>;
};

export type CheckNoteClaimsResultResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['CheckNoteClaimsResult'] = ResolversParentTypes['CheckNoteClaimsResult']> = {
  cards?: Resolver<Array<ResolversTypes['ClaimCard']>, ParentType, ContextType>;
  message?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  noteId?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  success?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
};

export type ClaimCardResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['ClaimCard'] = ResolversParentTypes['ClaimCard']> = {
  claim?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  confidence?: Resolver<ResolversTypes['Float'], ParentType, ContextType>;
  createdAt?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  evidence?: Resolver<Array<ResolversTypes['EvidenceItem']>, ParentType, ContextType>;
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  notes?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  provenance?: Resolver<ResolversTypes['ClaimProvenance'], ParentType, ContextType>;
  queries?: Resolver<Array<ResolversTypes['String']>, ParentType, ContextType>;
  scope?: Resolver<Maybe<ResolversTypes['ClaimScope']>, ParentType, ContextType>;
  updatedAt?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  verdict?: Resolver<ResolversTypes['ClaimVerdict'], ParentType, ContextType>;
};

export type ClaimProvenanceResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['ClaimProvenance'] = ResolversParentTypes['ClaimProvenance']> = {
  generatedBy?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  model?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  sourceTools?: Resolver<Array<ResolversTypes['String']>, ParentType, ContextType>;
};

export type ClaimScopeResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['ClaimScope'] = ResolversParentTypes['ClaimScope']> = {
  comparator?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  intervention?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  outcome?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  population?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  setting?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  timeframe?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
};

export type ClaimVerdictResolvers = EnumResolverSignature<{ CONTRADICTED?: any, INSUFFICIENT?: any, MIXED?: any, SUPPORTED?: any, UNVERIFIED?: any }, ResolversTypes['ClaimVerdict']>;

export type ContactResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['Contact'] = ResolversParentTypes['Contact']> = {
  ageYears?: Resolver<Maybe<ResolversTypes['Int']>, ParentType, ContextType>;
  createdAt?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  createdBy?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  description?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  firstName?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  id?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  lastName?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  notes?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  role?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  slug?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  updatedAt?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
};

export type ContactFeedbackResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['ContactFeedback'] = ResolversParentTypes['ContactFeedback']> = {
  contact?: Resolver<Maybe<ResolversTypes['Contact']>, ParentType, ContextType>;
  contactId?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  content?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  createdAt?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  createdBy?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  extracted?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  extractedIssues?: Resolver<Maybe<Array<ResolversTypes['ExtractedIssue']>>, ParentType, ContextType>;
  familyMember?: Resolver<Maybe<ResolversTypes['FamilyMember']>, ParentType, ContextType>;
  familyMemberId?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  feedbackDate?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  id?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  issues?: Resolver<Array<ResolversTypes['Issue']>, ParentType, ContextType>;
  source?: Resolver<Maybe<ResolversTypes['FeedbackSource']>, ParentType, ContextType>;
  stories?: Resolver<Array<ResolversTypes['Story']>, ParentType, ContextType>;
  subject?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  tags?: Resolver<Maybe<Array<ResolversTypes['String']>>, ParentType, ContextType>;
  updatedAt?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
};

export type ConversationResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['Conversation'] = ResolversParentTypes['Conversation']> = {
  createdAt?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  id?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  issueId?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  messages?: Resolver<Array<ResolversTypes['ConversationMessage']>, ParentType, ContextType>;
  title?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  updatedAt?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  userId?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
};

export type ConversationMessageResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['ConversationMessage'] = ResolversParentTypes['ConversationMessage']> = {
  content?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  conversationId?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  createdAt?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  id?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  role?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
};

export type DataSnapshotResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['DataSnapshot'] = ResolversParentTypes['DataSnapshot']> = {
  contactFeedbackCount?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  issueCount?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  journalEntryCount?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  observationCount?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  relatedMemberIssueCount?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  researchPaperCount?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  teacherFeedbackCount?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
};

export type DeepIssueAnalysisResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['DeepIssueAnalysis'] = ResolversParentTypes['DeepIssueAnalysis']> = {
  createdAt?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  createdBy?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  dataSnapshot?: Resolver<ResolversTypes['DataSnapshot'], ParentType, ContextType>;
  familyMember?: Resolver<Maybe<ResolversTypes['FamilyMember']>, ParentType, ContextType>;
  familyMemberId?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  familySystemInsights?: Resolver<Array<ResolversTypes['FamilySystemInsight']>, ParentType, ContextType>;
  id?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  jobId?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  model?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  parentAdvice?: Resolver<Array<ResolversTypes['ParentAdviceItem']>, ParentType, ContextType>;
  patternClusters?: Resolver<Array<ResolversTypes['PatternCluster']>, ParentType, ContextType>;
  priorityRecommendations?: Resolver<Array<ResolversTypes['PriorityRecommendation']>, ParentType, ContextType>;
  researchRelevance?: Resolver<Array<ResolversTypes['ResearchRelevanceMapping']>, ParentType, ContextType>;
  summary?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  timelineAnalysis?: Resolver<ResolversTypes['TimelineAnalysis'], ParentType, ContextType>;
  triggerIssue?: Resolver<Maybe<ResolversTypes['Issue']>, ParentType, ContextType>;
  triggerIssueId?: Resolver<Maybe<ResolversTypes['Int']>, ParentType, ContextType>;
  updatedAt?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
};

export type DeleteBehaviorObservationResultResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['DeleteBehaviorObservationResult'] = ResolversParentTypes['DeleteBehaviorObservationResult']> = {
  message?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  success?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
};

export type DeleteContactFeedbackResultResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['DeleteContactFeedbackResult'] = ResolversParentTypes['DeleteContactFeedbackResult']> = {
  message?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  success?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
};

export type DeleteContactResultResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['DeleteContactResult'] = ResolversParentTypes['DeleteContactResult']> = {
  message?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  success?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
};

export type DeleteConversationResultResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['DeleteConversationResult'] = ResolversParentTypes['DeleteConversationResult']> = {
  id?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
};

export type DeleteDeepAnalysisResultResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['DeleteDeepAnalysisResult'] = ResolversParentTypes['DeleteDeepAnalysisResult']> = {
  message?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  success?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
};

export type DeleteFamilyMemberResultResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['DeleteFamilyMemberResult'] = ResolversParentTypes['DeleteFamilyMemberResult']> = {
  message?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  success?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
};

export type DeleteGoalResultResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['DeleteGoalResult'] = ResolversParentTypes['DeleteGoalResult']> = {
  message?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  success?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
};

export type DeleteHabitResultResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['DeleteHabitResult'] = ResolversParentTypes['DeleteHabitResult']> = {
  message?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  success?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
};

export type DeleteIssueResultResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['DeleteIssueResult'] = ResolversParentTypes['DeleteIssueResult']> = {
  message?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  success?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
};

export type DeleteIssueScreenshotResultResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['DeleteIssueScreenshotResult'] = ResolversParentTypes['DeleteIssueScreenshotResult']> = {
  success?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
};

export type DeleteJournalEntryResultResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['DeleteJournalEntryResult'] = ResolversParentTypes['DeleteJournalEntryResult']> = {
  message?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  success?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
};

export type DeleteNoteResultResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['DeleteNoteResult'] = ResolversParentTypes['DeleteNoteResult']> = {
  message?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  success?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
};

export type DeleteQuestionsResultResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['DeleteQuestionsResult'] = ResolversParentTypes['DeleteQuestionsResult']> = {
  deletedCount?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  message?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  success?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
};

export type DeleteRelationshipResultResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['DeleteRelationshipResult'] = ResolversParentTypes['DeleteRelationshipResult']> = {
  message?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  success?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
};

export type DeleteResearchResultResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['DeleteResearchResult'] = ResolversParentTypes['DeleteResearchResult']> = {
  deletedCount?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  message?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  success?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
};

export type DeleteStoryResultResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['DeleteStoryResult'] = ResolversParentTypes['DeleteStoryResult']> = {
  message?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  success?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
};

export type DeleteTeacherFeedbackResultResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['DeleteTeacherFeedbackResult'] = ResolversParentTypes['DeleteTeacherFeedbackResult']> = {
  message?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  success?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
};

export type DevelopmentalTierResolvers = EnumResolverSignature<{ ADULT?: any, EARLY_ADOLESCENCE?: any, EARLY_CHILDHOOD?: any, LATE_ADOLESCENCE?: any, MIDDLE_CHILDHOOD?: any }, ResolversTypes['DevelopmentalTier']>;

export type EvidenceItemResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['EvidenceItem'] = ResolversParentTypes['EvidenceItem']> = {
  excerpt?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  locator?: Resolver<Maybe<ResolversTypes['EvidenceLocator']>, ParentType, ContextType>;
  paper?: Resolver<ResolversTypes['PaperCandidate'], ParentType, ContextType>;
  polarity?: Resolver<ResolversTypes['EvidencePolarity'], ParentType, ContextType>;
  rationale?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  score?: Resolver<Maybe<ResolversTypes['Float']>, ParentType, ContextType>;
};

export type EvidenceLocatorResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['EvidenceLocator'] = ResolversParentTypes['EvidenceLocator']> = {
  page?: Resolver<Maybe<ResolversTypes['Int']>, ParentType, ContextType>;
  section?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  url?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
};

export type EvidencePolarityResolvers = EnumResolverSignature<{ CONTRADICTS?: any, IRRELEVANT?: any, MIXED?: any, SUPPORTS?: any }, ResolversTypes['EvidencePolarity']>;

export type ExtractedIssueResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['ExtractedIssue'] = ResolversParentTypes['ExtractedIssue']> = {
  category?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  description?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  recommendations?: Resolver<Maybe<Array<ResolversTypes['String']>>, ParentType, ContextType>;
  severity?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  title?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
};

export type FamilyMemberResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['FamilyMember'] = ResolversParentTypes['FamilyMember']> = {
  ageYears?: Resolver<Maybe<ResolversTypes['Int']>, ParentType, ContextType>;
  behaviorObservations?: Resolver<Array<ResolversTypes['BehaviorObservation']>, ParentType, ContextType, Partial<FamilyMemberbehaviorObservationsArgs>>;
  bio?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  createdAt?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  dateOfBirth?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  email?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  firstName?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  goals?: Resolver<Array<ResolversTypes['Goal']>, ParentType, ContextType>;
  id?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  issues?: Resolver<Array<ResolversTypes['Issue']>, ParentType, ContextType>;
  location?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  name?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  occupation?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  phone?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  relationship?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  relationships?: Resolver<Array<ResolversTypes['Relationship']>, ParentType, ContextType>;
  shares?: Resolver<Array<ResolversTypes['FamilyMemberShare']>, ParentType, ContextType>;
  slug?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  teacherFeedbacks?: Resolver<Array<ResolversTypes['TeacherFeedback']>, ParentType, ContextType>;
  updatedAt?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  userId?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
};

export type FamilyMemberShareResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['FamilyMemberShare'] = ResolversParentTypes['FamilyMemberShare']> = {
  createdAt?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  createdBy?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  email?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  familyMemberId?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  role?: Resolver<ResolversTypes['FamilyMemberShareRole'], ParentType, ContextType>;
};

export type FamilyMemberShareRoleResolvers = EnumResolverSignature<{ EDITOR?: any, VIEWER?: any }, ResolversTypes['FamilyMemberShareRole']>;

export type FamilySystemInsightResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['FamilySystemInsight'] = ResolversParentTypes['FamilySystemInsight']> = {
  actionable?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  evidenceIssueIds?: Resolver<Array<ResolversTypes['Int']>, ParentType, ContextType>;
  insight?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  involvedMemberIds?: Resolver<Array<ResolversTypes['Int']>, ParentType, ContextType>;
  involvedMemberNames?: Resolver<Array<ResolversTypes['String']>, ParentType, ContextType>;
  systemicPattern?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
};

export type FeedbackSourceResolvers = EnumResolverSignature<{ EMAIL?: any, MEETING?: any, NOTE?: any, OTHER?: any, PHONE?: any, REPORT?: any }, ResolversTypes['FeedbackSource']>;

export type GenerateAudioResultResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['GenerateAudioResult'] = ResolversParentTypes['GenerateAudioResult']> = {
  audioUrl?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  jobId?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  message?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  success?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
};

export type GenerateDeepAnalysisResultResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['GenerateDeepAnalysisResult'] = ResolversParentTypes['GenerateDeepAnalysisResult']> = {
  jobId?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  message?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  success?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
};

export type GenerateHabitsResultResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['GenerateHabitsResult'] = ResolversParentTypes['GenerateHabitsResult']> = {
  count?: Resolver<Maybe<ResolversTypes['Int']>, ParentType, ContextType>;
  habits?: Resolver<Maybe<Array<ResolversTypes['Habit']>>, ParentType, ContextType>;
  message?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  success?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
};

export type GenerateLongFormTextResultResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['GenerateLongFormTextResult'] = ResolversParentTypes['GenerateLongFormTextResult']> = {
  audioUrl?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  evals?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  jobId?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  manifestUrl?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  message?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  segmentUrls?: Resolver<Maybe<Array<ResolversTypes['String']>>, ParentType, ContextType>;
  storyId?: Resolver<Maybe<ResolversTypes['Int']>, ParentType, ContextType>;
  success?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  text?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
};

export type GenerateOpenAIAudioResultResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['GenerateOpenAIAudioResult'] = ResolversParentTypes['GenerateOpenAIAudioResult']> = {
  audioBuffer?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  audioUrl?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  duration?: Resolver<Maybe<ResolversTypes['Float']>, ParentType, ContextType>;
  jobId?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  key?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  message?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  sizeBytes?: Resolver<Maybe<ResolversTypes['Int']>, ParentType, ContextType>;
  success?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
};

export type GenerateParentAdviceResultResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['GenerateParentAdviceResult'] = ResolversParentTypes['GenerateParentAdviceResult']> = {
  message?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  parentAdvice?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  success?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
};

export type GenerateQuestionsResultResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['GenerateQuestionsResult'] = ResolversParentTypes['GenerateQuestionsResult']> = {
  jobId?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  message?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  questions?: Resolver<Array<ResolversTypes['TherapeuticQuestion']>, ParentType, ContextType>;
  success?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
};

export type GenerateResearchResultResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['GenerateResearchResult'] = ResolversParentTypes['GenerateResearchResult']> = {
  count?: Resolver<Maybe<ResolversTypes['Int']>, ParentType, ContextType>;
  jobId?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  message?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  success?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
};

export type GenerationJobResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['GenerationJob'] = ResolversParentTypes['GenerationJob']> = {
  createdAt?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  error?: Resolver<Maybe<ResolversTypes['JobError']>, ParentType, ContextType>;
  goalId?: Resolver<Maybe<ResolversTypes['Int']>, ParentType, ContextType>;
  id?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  progress?: Resolver<ResolversTypes['Float'], ParentType, ContextType>;
  result?: Resolver<Maybe<ResolversTypes['JobResult']>, ParentType, ContextType>;
  status?: Resolver<ResolversTypes['JobStatus'], ParentType, ContextType>;
  storyId?: Resolver<Maybe<ResolversTypes['Int']>, ParentType, ContextType>;
  type?: Resolver<ResolversTypes['JobType'], ParentType, ContextType>;
  updatedAt?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  userId?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
};

export type GoalResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['Goal'] = ResolversParentTypes['Goal']> = {
  createdAt?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  createdBy?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  description?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  familyMember?: Resolver<Maybe<ResolversTypes['FamilyMember']>, ParentType, ContextType>;
  familyMemberId?: Resolver<Maybe<ResolversTypes['Int']>, ParentType, ContextType>;
  id?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  notes?: Resolver<Array<ResolversTypes['Note']>, ParentType, ContextType>;
  parentAdvice?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  parentAdviceGeneratedAt?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  parentAdviceLanguage?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  parentGoal?: Resolver<Maybe<ResolversTypes['Goal']>, ParentType, ContextType>;
  parentGoalId?: Resolver<Maybe<ResolversTypes['Int']>, ParentType, ContextType>;
  priority?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  questions?: Resolver<Array<ResolversTypes['TherapeuticQuestion']>, ParentType, ContextType>;
  research?: Resolver<Array<ResolversTypes['Research']>, ParentType, ContextType>;
  slug?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  status?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  stories?: Resolver<Array<ResolversTypes['Story']>, ParentType, ContextType>;
  storyLanguage?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  subGoals?: Resolver<Array<ResolversTypes['Goal']>, ParentType, ContextType>;
  tags?: Resolver<Maybe<Array<ResolversTypes['String']>>, ParentType, ContextType>;
  targetDate?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  therapeuticText?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  therapeuticTextGeneratedAt?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  therapeuticTextLanguage?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  title?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  updatedAt?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
};

export type HabitResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['Habit'] = ResolversParentTypes['Habit']> = {
  createdAt?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  description?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  familyMemberId?: Resolver<Maybe<ResolversTypes['Int']>, ParentType, ContextType>;
  frequency?: Resolver<ResolversTypes['HabitFrequency'], ParentType, ContextType>;
  goalId?: Resolver<Maybe<ResolversTypes['Int']>, ParentType, ContextType>;
  id?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  issueId?: Resolver<Maybe<ResolversTypes['Int']>, ParentType, ContextType>;
  logs?: Resolver<Array<ResolversTypes['HabitLog']>, ParentType, ContextType>;
  status?: Resolver<ResolversTypes['HabitStatus'], ParentType, ContextType>;
  targetCount?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  title?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  todayLog?: Resolver<Maybe<ResolversTypes['HabitLog']>, ParentType, ContextType>;
  updatedAt?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  userId?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
};

export type HabitFrequencyResolvers = EnumResolverSignature<{ DAILY?: any, WEEKLY?: any }, ResolversTypes['HabitFrequency']>;

export type HabitLogResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['HabitLog'] = ResolversParentTypes['HabitLog']> = {
  count?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  createdAt?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  habitId?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  id?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  loggedDate?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  notes?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  userId?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
};

export type HabitStatusResolvers = EnumResolverSignature<{ ACTIVE?: any, ARCHIVED?: any, PAUSED?: any }, ResolversTypes['HabitStatus']>;

export type IssueResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['Issue'] = ResolversParentTypes['Issue']> = {
  category?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  contacts?: Resolver<Array<ResolversTypes['Contact']>, ParentType, ContextType>;
  conversations?: Resolver<Array<ResolversTypes['Conversation']>, ParentType, ContextType>;
  createdAt?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  createdBy?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  description?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  familyMember?: Resolver<Maybe<ResolversTypes['FamilyMember']>, ParentType, ContextType>;
  familyMemberId?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  feedback?: Resolver<Maybe<ResolversTypes['ContactFeedback']>, ParentType, ContextType>;
  feedbackId?: Resolver<Maybe<ResolversTypes['Int']>, ParentType, ContextType>;
  id?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  journalEntry?: Resolver<Maybe<ResolversTypes['JournalEntry']>, ParentType, ContextType>;
  journalEntryId?: Resolver<Maybe<ResolversTypes['Int']>, ParentType, ContextType>;
  questions?: Resolver<Array<ResolversTypes['TherapeuticQuestion']>, ParentType, ContextType>;
  recommendations?: Resolver<Maybe<Array<ResolversTypes['String']>>, ParentType, ContextType>;
  relatedFamilyMember?: Resolver<Maybe<ResolversTypes['FamilyMember']>, ParentType, ContextType>;
  relatedFamilyMemberId?: Resolver<Maybe<ResolversTypes['Int']>, ParentType, ContextType>;
  relatedIssues?: Resolver<Array<ResolversTypes['IssueLink']>, ParentType, ContextType>;
  screenshots?: Resolver<Array<ResolversTypes['IssueScreenshot']>, ParentType, ContextType>;
  severity?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  stories?: Resolver<Array<ResolversTypes['Story']>, ParentType, ContextType>;
  title?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  updatedAt?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
};

export type IssueContactLinkResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['IssueContactLink'] = ResolversParentTypes['IssueContactLink']> = {
  contact?: Resolver<ResolversTypes['Contact'], ParentType, ContextType>;
  id?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
};

export type IssueLinkResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['IssueLink'] = ResolversParentTypes['IssueLink']> = {
  id?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  issue?: Resolver<ResolversTypes['Issue'], ParentType, ContextType>;
  linkType?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
};

export type IssueScreenshotResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['IssueScreenshot'] = ResolversParentTypes['IssueScreenshot']> = {
  caption?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  contentType?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  createdAt?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  filename?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  id?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  issueId?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  sizeBytes?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  url?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
};

export type JobErrorResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['JobError'] = ResolversParentTypes['JobError']> = {
  code?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  details?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  message?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
};

export type JobResultResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['JobResult'] = ResolversParentTypes['JobResult']> = {
  assetId?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  audioUrl?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  count?: Resolver<Maybe<ResolversTypes['Int']>, ParentType, ContextType>;
  diagnostics?: Resolver<Maybe<ResolversTypes['PipelineDiagnostics']>, ParentType, ContextType>;
  manifestUrl?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  progress?: Resolver<Maybe<ResolversTypes['Int']>, ParentType, ContextType>;
  questions?: Resolver<Maybe<Array<ResolversTypes['TherapeuticQuestion']>>, ParentType, ContextType>;
  segmentUrls?: Resolver<Maybe<Array<ResolversTypes['String']>>, ParentType, ContextType>;
  stage?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  text?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
};

export type JobStatusResolvers = EnumResolverSignature<{ FAILED?: any, RUNNING?: any, SUCCEEDED?: any }, ResolversTypes['JobStatus']>;

export type JobTypeResolvers = EnumResolverSignature<{ AUDIO?: any, LONGFORM?: any, QUESTIONS?: any, RESEARCH?: any }, ResolversTypes['JobType']>;

export type JournalEntryResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['JournalEntry'] = ResolversParentTypes['JournalEntry']> = {
  content?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  createdAt?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  createdBy?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  entryDate?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  familyMember?: Resolver<Maybe<ResolversTypes['FamilyMember']>, ParentType, ContextType>;
  familyMemberId?: Resolver<Maybe<ResolversTypes['Int']>, ParentType, ContextType>;
  goal?: Resolver<Maybe<ResolversTypes['Goal']>, ParentType, ContextType>;
  goalId?: Resolver<Maybe<ResolversTypes['Int']>, ParentType, ContextType>;
  id?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  isPrivate?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  issue?: Resolver<Maybe<ResolversTypes['Issue']>, ParentType, ContextType>;
  mood?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  moodScore?: Resolver<Maybe<ResolversTypes['Int']>, ParentType, ContextType>;
  tags?: Resolver<Maybe<Array<ResolversTypes['String']>>, ParentType, ContextType>;
  title?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  updatedAt?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
};

export type MutationResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['Mutation'] = ResolversParentTypes['Mutation']> = {
  buildClaimCards?: Resolver<ResolversTypes['BuildClaimCardsResult'], ParentType, ContextType, RequireFields<MutationbuildClaimCardsArgs, 'input'>>;
  checkNoteClaims?: Resolver<ResolversTypes['CheckNoteClaimsResult'], ParentType, ContextType, RequireFields<MutationcheckNoteClaimsArgs, 'input'>>;
  convertIssueToGoal?: Resolver<ResolversTypes['Goal'], ParentType, ContextType, RequireFields<MutationconvertIssueToGoalArgs, 'id' | 'input'>>;
  convertJournalEntryToIssue?: Resolver<ResolversTypes['Issue'], ParentType, ContextType, RequireFields<MutationconvertJournalEntryToIssueArgs, 'id' | 'input'>>;
  createContact?: Resolver<ResolversTypes['Contact'], ParentType, ContextType, RequireFields<MutationcreateContactArgs, 'input'>>;
  createContactFeedback?: Resolver<ResolversTypes['ContactFeedback'], ParentType, ContextType, RequireFields<MutationcreateContactFeedbackArgs, 'input'>>;
  createConversation?: Resolver<ResolversTypes['Conversation'], ParentType, ContextType, RequireFields<MutationcreateConversationArgs, 'issueId' | 'message'>>;
  createFamilyMember?: Resolver<ResolversTypes['FamilyMember'], ParentType, ContextType, RequireFields<MutationcreateFamilyMemberArgs, 'input'>>;
  createGoal?: Resolver<ResolversTypes['Goal'], ParentType, ContextType, RequireFields<MutationcreateGoalArgs, 'input'>>;
  createHabit?: Resolver<ResolversTypes['Habit'], ParentType, ContextType, RequireFields<MutationcreateHabitArgs, 'input'>>;
  createIssue?: Resolver<ResolversTypes['Issue'], ParentType, ContextType, RequireFields<MutationcreateIssueArgs, 'input'>>;
  createJournalEntry?: Resolver<ResolversTypes['JournalEntry'], ParentType, ContextType, RequireFields<MutationcreateJournalEntryArgs, 'input'>>;
  createNote?: Resolver<ResolversTypes['Note'], ParentType, ContextType, RequireFields<MutationcreateNoteArgs, 'input'>>;
  createRelatedIssue?: Resolver<ResolversTypes['IssueLink'], ParentType, ContextType, RequireFields<MutationcreateRelatedIssueArgs, 'input' | 'issueId'>>;
  createRelationship?: Resolver<ResolversTypes['Relationship'], ParentType, ContextType, RequireFields<MutationcreateRelationshipArgs, 'input'>>;
  createStory?: Resolver<ResolversTypes['Story'], ParentType, ContextType, RequireFields<MutationcreateStoryArgs, 'input'>>;
  createSubGoal?: Resolver<ResolversTypes['Goal'], ParentType, ContextType, RequireFields<MutationcreateSubGoalArgs, 'goalId' | 'input'>>;
  createTeacherFeedback?: Resolver<ResolversTypes['TeacherFeedback'], ParentType, ContextType, RequireFields<MutationcreateTeacherFeedbackArgs, 'input'>>;
  deleteBehaviorObservation?: Resolver<ResolversTypes['DeleteBehaviorObservationResult'], ParentType, ContextType, RequireFields<MutationdeleteBehaviorObservationArgs, 'id'>>;
  deleteClaimCard?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType, RequireFields<MutationdeleteClaimCardArgs, 'id'>>;
  deleteContact?: Resolver<ResolversTypes['DeleteContactResult'], ParentType, ContextType, RequireFields<MutationdeleteContactArgs, 'id'>>;
  deleteContactFeedback?: Resolver<ResolversTypes['DeleteContactFeedbackResult'], ParentType, ContextType, RequireFields<MutationdeleteContactFeedbackArgs, 'id'>>;
  deleteConversation?: Resolver<ResolversTypes['DeleteConversationResult'], ParentType, ContextType, RequireFields<MutationdeleteConversationArgs, 'id'>>;
  deleteDeepIssueAnalysis?: Resolver<ResolversTypes['DeleteDeepAnalysisResult'], ParentType, ContextType, RequireFields<MutationdeleteDeepIssueAnalysisArgs, 'id'>>;
  deleteFamilyMember?: Resolver<ResolversTypes['DeleteFamilyMemberResult'], ParentType, ContextType, RequireFields<MutationdeleteFamilyMemberArgs, 'id'>>;
  deleteGoal?: Resolver<ResolversTypes['DeleteGoalResult'], ParentType, ContextType, RequireFields<MutationdeleteGoalArgs, 'id'>>;
  deleteHabit?: Resolver<ResolversTypes['DeleteHabitResult'], ParentType, ContextType, RequireFields<MutationdeleteHabitArgs, 'id'>>;
  deleteHabitLog?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType, RequireFields<MutationdeleteHabitLogArgs, 'id'>>;
  deleteIssue?: Resolver<ResolversTypes['DeleteIssueResult'], ParentType, ContextType, RequireFields<MutationdeleteIssueArgs, 'id'>>;
  deleteIssueScreenshot?: Resolver<ResolversTypes['DeleteIssueScreenshotResult'], ParentType, ContextType, RequireFields<MutationdeleteIssueScreenshotArgs, 'id'>>;
  deleteJournalEntry?: Resolver<ResolversTypes['DeleteJournalEntryResult'], ParentType, ContextType, RequireFields<MutationdeleteJournalEntryArgs, 'id'>>;
  deleteNote?: Resolver<ResolversTypes['DeleteNoteResult'], ParentType, ContextType, RequireFields<MutationdeleteNoteArgs, 'id'>>;
  deleteRelationship?: Resolver<ResolversTypes['DeleteRelationshipResult'], ParentType, ContextType, RequireFields<MutationdeleteRelationshipArgs, 'id'>>;
  deleteResearch?: Resolver<ResolversTypes['DeleteResearchResult'], ParentType, ContextType, RequireFields<MutationdeleteResearchArgs, 'goalId'>>;
  deleteStory?: Resolver<ResolversTypes['DeleteStoryResult'], ParentType, ContextType, RequireFields<MutationdeleteStoryArgs, 'id'>>;
  deleteTeacherFeedback?: Resolver<ResolversTypes['DeleteTeacherFeedbackResult'], ParentType, ContextType, RequireFields<MutationdeleteTeacherFeedbackArgs, 'id'>>;
  deleteTherapeuticQuestions?: Resolver<ResolversTypes['DeleteQuestionsResult'], ParentType, ContextType, Partial<MutationdeleteTherapeuticQuestionsArgs>>;
  extractContactFeedbackIssues?: Resolver<ResolversTypes['ContactFeedback'], ParentType, ContextType, RequireFields<MutationextractContactFeedbackIssuesArgs, 'id'>>;
  generateAudio?: Resolver<ResolversTypes['GenerateAudioResult'], ParentType, ContextType, RequireFields<MutationgenerateAudioArgs, 'goalId'>>;
  generateDeepIssueAnalysis?: Resolver<ResolversTypes['GenerateDeepAnalysisResult'], ParentType, ContextType, RequireFields<MutationgenerateDeepIssueAnalysisArgs, 'familyMemberId'>>;
  generateHabitsForFamilyMember?: Resolver<ResolversTypes['GenerateHabitsResult'], ParentType, ContextType, RequireFields<MutationgenerateHabitsForFamilyMemberArgs, 'familyMemberId'>>;
  generateHabitsFromIssue?: Resolver<ResolversTypes['GenerateHabitsResult'], ParentType, ContextType, RequireFields<MutationgenerateHabitsFromIssueArgs, 'issueId'>>;
  generateLongFormText?: Resolver<ResolversTypes['GenerateLongFormTextResult'], ParentType, ContextType, Partial<MutationgenerateLongFormTextArgs>>;
  generateOpenAIAudio?: Resolver<ResolversTypes['GenerateOpenAIAudioResult'], ParentType, ContextType, RequireFields<MutationgenerateOpenAIAudioArgs, 'input'>>;
  generateParentAdvice?: Resolver<ResolversTypes['GenerateParentAdviceResult'], ParentType, ContextType, RequireFields<MutationgenerateParentAdviceArgs, 'goalId'>>;
  generateResearch?: Resolver<ResolversTypes['GenerateResearchResult'], ParentType, ContextType, Partial<MutationgenerateResearchArgs>>;
  generateTherapeuticQuestions?: Resolver<ResolversTypes['GenerateQuestionsResult'], ParentType, ContextType, Partial<MutationgenerateTherapeuticQuestionsArgs>>;
  linkContactToIssue?: Resolver<ResolversTypes['IssueContactLink'], ParentType, ContextType, RequireFields<MutationlinkContactToIssueArgs, 'contactId' | 'issueId'>>;
  linkIssues?: Resolver<ResolversTypes['IssueLink'], ParentType, ContextType, RequireFields<MutationlinkIssuesArgs, 'issueId' | 'linkedIssueId'>>;
  logHabit?: Resolver<ResolversTypes['HabitLog'], ParentType, ContextType, RequireFields<MutationlogHabitArgs, 'habitId' | 'loggedDate'>>;
  markTeacherFeedbackExtracted?: Resolver<ResolversTypes['TeacherFeedback'], ParentType, ContextType, RequireFields<MutationmarkTeacherFeedbackExtractedArgs, 'id'>>;
  refreshClaimCard?: Resolver<ResolversTypes['ClaimCard'], ParentType, ContextType, RequireFields<MutationrefreshClaimCardArgs, 'id'>>;
  sendConversationMessage?: Resolver<ResolversTypes['Conversation'], ParentType, ContextType, RequireFields<MutationsendConversationMessageArgs, 'conversationId' | 'message'>>;
  setNoteVisibility?: Resolver<ResolversTypes['Note'], ParentType, ContextType, RequireFields<MutationsetNoteVisibilityArgs, 'noteId' | 'visibility'>>;
  shareFamilyMember?: Resolver<ResolversTypes['FamilyMemberShare'], ParentType, ContextType, RequireFields<MutationshareFamilyMemberArgs, 'email' | 'familyMemberId'>>;
  shareNote?: Resolver<ResolversTypes['NoteShare'], ParentType, ContextType, RequireFields<MutationshareNoteArgs, 'email' | 'noteId'>>;
  unlinkContactFromIssue?: Resolver<ResolversTypes['UnlinkContactResult'], ParentType, ContextType, RequireFields<MutationunlinkContactFromIssueArgs, 'contactId' | 'issueId'>>;
  unlinkGoalFamilyMember?: Resolver<ResolversTypes['Goal'], ParentType, ContextType, RequireFields<MutationunlinkGoalFamilyMemberArgs, 'id'>>;
  unlinkIssues?: Resolver<ResolversTypes['UnlinkIssuesResult'], ParentType, ContextType, RequireFields<MutationunlinkIssuesArgs, 'issueId' | 'linkedIssueId'>>;
  unshareFamilyMember?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType, RequireFields<MutationunshareFamilyMemberArgs, 'email' | 'familyMemberId'>>;
  unshareNote?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType, RequireFields<MutationunshareNoteArgs, 'email' | 'noteId'>>;
  updateBehaviorObservation?: Resolver<ResolversTypes['BehaviorObservation'], ParentType, ContextType, RequireFields<MutationupdateBehaviorObservationArgs, 'id' | 'input'>>;
  updateContact?: Resolver<ResolversTypes['Contact'], ParentType, ContextType, RequireFields<MutationupdateContactArgs, 'id' | 'input'>>;
  updateContactFeedback?: Resolver<ResolversTypes['ContactFeedback'], ParentType, ContextType, RequireFields<MutationupdateContactFeedbackArgs, 'id' | 'input'>>;
  updateFamilyMember?: Resolver<ResolversTypes['FamilyMember'], ParentType, ContextType, RequireFields<MutationupdateFamilyMemberArgs, 'id' | 'input'>>;
  updateGoal?: Resolver<ResolversTypes['Goal'], ParentType, ContextType, RequireFields<MutationupdateGoalArgs, 'id' | 'input'>>;
  updateHabit?: Resolver<ResolversTypes['Habit'], ParentType, ContextType, RequireFields<MutationupdateHabitArgs, 'id' | 'input'>>;
  updateIssue?: Resolver<ResolversTypes['Issue'], ParentType, ContextType, RequireFields<MutationupdateIssueArgs, 'id' | 'input'>>;
  updateJournalEntry?: Resolver<ResolversTypes['JournalEntry'], ParentType, ContextType, RequireFields<MutationupdateJournalEntryArgs, 'id' | 'input'>>;
  updateNote?: Resolver<ResolversTypes['Note'], ParentType, ContextType, RequireFields<MutationupdateNoteArgs, 'id' | 'input'>>;
  updateRelationship?: Resolver<ResolversTypes['Relationship'], ParentType, ContextType, RequireFields<MutationupdateRelationshipArgs, 'id' | 'input'>>;
  updateStory?: Resolver<ResolversTypes['Story'], ParentType, ContextType, RequireFields<MutationupdateStoryArgs, 'id' | 'input'>>;
  updateTeacherFeedback?: Resolver<ResolversTypes['TeacherFeedback'], ParentType, ContextType, RequireFields<MutationupdateTeacherFeedbackArgs, 'id' | 'input'>>;
  updateUserSettings?: Resolver<ResolversTypes['UserSettings'], ParentType, ContextType, RequireFields<MutationupdateUserSettingsArgs, 'storyLanguage'>>;
};

export type NoteResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['Note'] = ResolversParentTypes['Note']> = {
  claimCards?: Resolver<Maybe<Array<ResolversTypes['ClaimCard']>>, ParentType, ContextType>;
  content?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  createdAt?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  createdBy?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  entityId?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  entityType?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  goal?: Resolver<Maybe<ResolversTypes['Goal']>, ParentType, ContextType>;
  id?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  linkedResearch?: Resolver<Maybe<Array<ResolversTypes['Research']>>, ParentType, ContextType>;
  noteType?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  shares?: Resolver<Array<ResolversTypes['NoteShare']>, ParentType, ContextType>;
  slug?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  tags?: Resolver<Maybe<Array<ResolversTypes['String']>>, ParentType, ContextType>;
  title?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  updatedAt?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  viewerAccess?: Resolver<ResolversTypes['NoteAccess'], ParentType, ContextType>;
  visibility?: Resolver<ResolversTypes['NoteVisibility'], ParentType, ContextType>;
};

export type NoteAccessResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['NoteAccess'] = ResolversParentTypes['NoteAccess']> = {
  canEdit?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  canRead?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  reason?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
};

export type NoteShareResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['NoteShare'] = ResolversParentTypes['NoteShare']> = {
  createdAt?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  createdBy?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  email?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  noteId?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  role?: Resolver<ResolversTypes['NoteShareRole'], ParentType, ContextType>;
};

export type NoteShareRoleResolvers = EnumResolverSignature<{ EDITOR?: any, READER?: any }, ResolversTypes['NoteShareRole']>;

export type NoteVisibilityResolvers = EnumResolverSignature<{ PRIVATE?: any, PUBLIC?: any }, ResolversTypes['NoteVisibility']>;

export type OpenAIAudioFormatResolvers = EnumResolverSignature<{ AAC?: any, FLAC?: any, MP3?: any, OPUS?: any, PCM?: any, WAV?: any }, ResolversTypes['OpenAIAudioFormat']>;

export type OpenAIStreamFormatResolvers = EnumResolverSignature<{ AUDIO?: any, SSE?: any }, ResolversTypes['OpenAIStreamFormat']>;

export type OpenAITTSModelResolvers = EnumResolverSignature<{ GPT_4O_MINI_TTS?: any, TTS_1?: any, TTS_1_HD?: any }, ResolversTypes['OpenAITTSModel']>;

export type OpenAITTSVoiceResolvers = EnumResolverSignature<{ ALLOY?: any, ASH?: any, BALLAD?: any, CEDAR?: any, CORAL?: any, ECHO?: any, FABLE?: any, MARIN?: any, NOVA?: any, ONYX?: any, SAGE?: any, SHIMMER?: any, VERSE?: any }, ResolversTypes['OpenAITTSVoice']>;

export type PaperCandidateResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['PaperCandidate'] = ResolversParentTypes['PaperCandidate']> = {
  abstract?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  authors?: Resolver<Maybe<Array<ResolversTypes['String']>>, ParentType, ContextType>;
  doi?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  journal?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  oaStatus?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  oaUrl?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  source?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  title?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  url?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  year?: Resolver<Maybe<ResolversTypes['Int']>, ParentType, ContextType>;
};

export type ParentAdviceItemResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['ParentAdviceItem'] = ResolversParentTypes['ParentAdviceItem']> = {
  advice?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  ageAppropriate?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  concreteSteps?: Resolver<Array<ResolversTypes['String']>, ParentType, ContextType>;
  developmentalContext?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  priority?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  relatedPatternCluster?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  relatedResearchIds?: Resolver<Maybe<Array<ResolversTypes['Int']>>, ParentType, ContextType>;
  relatedResearchTitles?: Resolver<Maybe<Array<ResolversTypes['String']>>, ParentType, ContextType>;
  targetIssueIds?: Resolver<Array<ResolversTypes['Int']>, ParentType, ContextType>;
  targetIssueTitles?: Resolver<Array<ResolversTypes['String']>, ParentType, ContextType>;
  title?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
};

export type PatternClusterResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['PatternCluster'] = ResolversParentTypes['PatternCluster']> = {
  categories?: Resolver<Array<ResolversTypes['String']>, ParentType, ContextType>;
  confidence?: Resolver<ResolversTypes['Float'], ParentType, ContextType>;
  description?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  issueIds?: Resolver<Array<ResolversTypes['Int']>, ParentType, ContextType>;
  issueTitles?: Resolver<Array<ResolversTypes['String']>, ParentType, ContextType>;
  name?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  pattern?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  suggestedRootCause?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
};

export type PersonTypeResolvers = EnumResolverSignature<{ CONTACT?: any, FAMILY_MEMBER?: any }, ResolversTypes['PersonType']>;

export type PipelineDiagnosticsResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['PipelineDiagnostics'] = ResolversParentTypes['PipelineDiagnostics']> = {
  enrichedCount?: Resolver<Maybe<ResolversTypes['Int']>, ParentType, ContextType>;
  enrichedDropped?: Resolver<Maybe<ResolversTypes['Int']>, ParentType, ContextType>;
  extractedCount?: Resolver<Maybe<ResolversTypes['Int']>, ParentType, ContextType>;
  persistedCount?: Resolver<Maybe<ResolversTypes['Int']>, ParentType, ContextType>;
  qualifiedCount?: Resolver<Maybe<ResolversTypes['Int']>, ParentType, ContextType>;
  searchCount?: Resolver<Maybe<ResolversTypes['Int']>, ParentType, ContextType>;
  searchUsedFallback?: Resolver<Maybe<ResolversTypes['Boolean']>, ParentType, ContextType>;
};

export type PriorityRecommendationResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['PriorityRecommendation'] = ResolversParentTypes['PriorityRecommendation']> = {
  issueId?: Resolver<Maybe<ResolversTypes['Int']>, ParentType, ContextType>;
  issueTitle?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  rank?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  rationale?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  relatedResearchIds?: Resolver<Maybe<Array<ResolversTypes['Int']>>, ParentType, ContextType>;
  suggestedApproach?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  urgency?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
};

export type QueryResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['Query'] = ResolversParentTypes['Query']> = {
  allIssues?: Resolver<Array<ResolversTypes['Issue']>, ParentType, ContextType>;
  allNotes?: Resolver<Array<ResolversTypes['Note']>, ParentType, ContextType>;
  allStories?: Resolver<Array<ResolversTypes['Story']>, ParentType, ContextType>;
  allTags?: Resolver<Array<ResolversTypes['String']>, ParentType, ContextType>;
  audioFromR2?: Resolver<Maybe<ResolversTypes['AudioFromR2Result']>, ParentType, ContextType, RequireFields<QueryaudioFromR2Args, 'key'>>;
  behaviorObservation?: Resolver<Maybe<ResolversTypes['BehaviorObservation']>, ParentType, ContextType, RequireFields<QuerybehaviorObservationArgs, 'id'>>;
  behaviorObservations?: Resolver<Array<ResolversTypes['BehaviorObservation']>, ParentType, ContextType, RequireFields<QuerybehaviorObservationsArgs, 'familyMemberId'>>;
  claimCard?: Resolver<Maybe<ResolversTypes['ClaimCard']>, ParentType, ContextType, RequireFields<QueryclaimCardArgs, 'id'>>;
  claimCardsForNote?: Resolver<Array<ResolversTypes['ClaimCard']>, ParentType, ContextType, RequireFields<QueryclaimCardsForNoteArgs, 'noteId'>>;
  contact?: Resolver<Maybe<ResolversTypes['Contact']>, ParentType, ContextType, Partial<QuerycontactArgs>>;
  contactFeedback?: Resolver<Maybe<ResolversTypes['ContactFeedback']>, ParentType, ContextType, RequireFields<QuerycontactFeedbackArgs, 'id'>>;
  contactFeedbacks?: Resolver<Array<ResolversTypes['ContactFeedback']>, ParentType, ContextType, RequireFields<QuerycontactFeedbacksArgs, 'contactId' | 'familyMemberId'>>;
  contacts?: Resolver<Array<ResolversTypes['Contact']>, ParentType, ContextType>;
  conversation?: Resolver<Maybe<ResolversTypes['Conversation']>, ParentType, ContextType, RequireFields<QueryconversationArgs, 'id'>>;
  conversationsForIssue?: Resolver<Array<ResolversTypes['Conversation']>, ParentType, ContextType, RequireFields<QueryconversationsForIssueArgs, 'issueId'>>;
  deepIssueAnalyses?: Resolver<Array<ResolversTypes['DeepIssueAnalysis']>, ParentType, ContextType, RequireFields<QuerydeepIssueAnalysesArgs, 'familyMemberId'>>;
  deepIssueAnalysis?: Resolver<Maybe<ResolversTypes['DeepIssueAnalysis']>, ParentType, ContextType, RequireFields<QuerydeepIssueAnalysisArgs, 'id'>>;
  familyMember?: Resolver<Maybe<ResolversTypes['FamilyMember']>, ParentType, ContextType, Partial<QueryfamilyMemberArgs>>;
  familyMembers?: Resolver<Array<ResolversTypes['FamilyMember']>, ParentType, ContextType>;
  generationJob?: Resolver<Maybe<ResolversTypes['GenerationJob']>, ParentType, ContextType, RequireFields<QuerygenerationJobArgs, 'id'>>;
  generationJobs?: Resolver<Array<ResolversTypes['GenerationJob']>, ParentType, ContextType, Partial<QuerygenerationJobsArgs>>;
  goal?: Resolver<Maybe<ResolversTypes['Goal']>, ParentType, ContextType, Partial<QuerygoalArgs>>;
  goals?: Resolver<Array<ResolversTypes['Goal']>, ParentType, ContextType, Partial<QuerygoalsArgs>>;
  habit?: Resolver<Maybe<ResolversTypes['Habit']>, ParentType, ContextType, RequireFields<QueryhabitArgs, 'id'>>;
  habits?: Resolver<Array<ResolversTypes['Habit']>, ParentType, ContextType, Partial<QueryhabitsArgs>>;
  issue?: Resolver<Maybe<ResolversTypes['Issue']>, ParentType, ContextType, RequireFields<QueryissueArgs, 'id'>>;
  issues?: Resolver<Array<ResolversTypes['Issue']>, ParentType, ContextType, RequireFields<QueryissuesArgs, 'familyMemberId'>>;
  journalEntries?: Resolver<Array<ResolversTypes['JournalEntry']>, ParentType, ContextType, Partial<QueryjournalEntriesArgs>>;
  journalEntry?: Resolver<Maybe<ResolversTypes['JournalEntry']>, ParentType, ContextType, RequireFields<QueryjournalEntryArgs, 'id'>>;
  mySharedFamilyMembers?: Resolver<Array<ResolversTypes['FamilyMember']>, ParentType, ContextType>;
  mySharedNotes?: Resolver<Array<ResolversTypes['Note']>, ParentType, ContextType>;
  note?: Resolver<Maybe<ResolversTypes['Note']>, ParentType, ContextType, Partial<QuerynoteArgs>>;
  notes?: Resolver<Array<ResolversTypes['Note']>, ParentType, ContextType, RequireFields<QuerynotesArgs, 'entityId' | 'entityType'>>;
  relationship?: Resolver<Maybe<ResolversTypes['Relationship']>, ParentType, ContextType, RequireFields<QueryrelationshipArgs, 'id'>>;
  relationships?: Resolver<Array<ResolversTypes['Relationship']>, ParentType, ContextType, RequireFields<QueryrelationshipsArgs, 'subjectId' | 'subjectType'>>;
  research?: Resolver<Array<ResolversTypes['Research']>, ParentType, ContextType, Partial<QueryresearchArgs>>;
  stories?: Resolver<Array<ResolversTypes['Story']>, ParentType, ContextType, RequireFields<QuerystoriesArgs, 'goalId'>>;
  story?: Resolver<Maybe<ResolversTypes['Story']>, ParentType, ContextType, RequireFields<QuerystoryArgs, 'id'>>;
  teacherFeedback?: Resolver<Maybe<ResolversTypes['TeacherFeedback']>, ParentType, ContextType, RequireFields<QueryteacherFeedbackArgs, 'id'>>;
  teacherFeedbacks?: Resolver<Array<ResolversTypes['TeacherFeedback']>, ParentType, ContextType, RequireFields<QueryteacherFeedbacksArgs, 'familyMemberId'>>;
  therapeuticQuestions?: Resolver<Array<ResolversTypes['TherapeuticQuestion']>, ParentType, ContextType, Partial<QuerytherapeuticQuestionsArgs>>;
  userSettings?: Resolver<ResolversTypes['UserSettings'], ParentType, ContextType>;
};

export type RelationshipResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['Relationship'] = ResolversParentTypes['Relationship']> = {
  context?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  createdAt?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  createdBy?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  id?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  related?: Resolver<Maybe<ResolversTypes['RelationshipPerson']>, ParentType, ContextType>;
  relatedId?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  relatedType?: Resolver<ResolversTypes['PersonType'], ParentType, ContextType>;
  relationshipType?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  startDate?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  status?: Resolver<ResolversTypes['RelationshipStatus'], ParentType, ContextType>;
  subject?: Resolver<Maybe<ResolversTypes['RelationshipPerson']>, ParentType, ContextType>;
  subjectId?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  subjectType?: Resolver<ResolversTypes['PersonType'], ParentType, ContextType>;
  updatedAt?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
};

export type RelationshipPersonResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['RelationshipPerson'] = ResolversParentTypes['RelationshipPerson']> = {
  firstName?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  id?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  lastName?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  slug?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  type?: Resolver<ResolversTypes['PersonType'], ParentType, ContextType>;
};

export type RelationshipStatusResolvers = EnumResolverSignature<{ ACTIVE?: any, ENDED?: any }, ResolversTypes['RelationshipStatus']>;

export type ResearchResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['Research'] = ResolversParentTypes['Research']> = {
  abstract?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  authors?: Resolver<Array<ResolversTypes['String']>, ParentType, ContextType>;
  createdAt?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  doi?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  evidenceLevel?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  extractedBy?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  extractionConfidence?: Resolver<ResolversTypes['Float'], ParentType, ContextType>;
  feedbackId?: Resolver<Maybe<ResolversTypes['Int']>, ParentType, ContextType>;
  goal?: Resolver<Maybe<ResolversTypes['Goal']>, ParentType, ContextType>;
  goalId?: Resolver<Maybe<ResolversTypes['Int']>, ParentType, ContextType>;
  id?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  issueId?: Resolver<Maybe<ResolversTypes['Int']>, ParentType, ContextType>;
  journal?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  keyFindings?: Resolver<Array<ResolversTypes['String']>, ParentType, ContextType>;
  relevanceScore?: Resolver<ResolversTypes['Float'], ParentType, ContextType>;
  therapeuticGoalType?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  therapeuticTechniques?: Resolver<Array<ResolversTypes['String']>, ParentType, ContextType>;
  title?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  updatedAt?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  url?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  year?: Resolver<Maybe<ResolversTypes['Int']>, ParentType, ContextType>;
};

export type ResearchRelevanceMappingResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['ResearchRelevanceMapping'] = ResolversParentTypes['ResearchRelevanceMapping']> = {
  coverageGaps?: Resolver<Array<ResolversTypes['String']>, ParentType, ContextType>;
  patternClusterName?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  relevantResearchIds?: Resolver<Array<ResolversTypes['Int']>, ParentType, ContextType>;
  relevantResearchTitles?: Resolver<Array<ResolversTypes['String']>, ParentType, ContextType>;
};

export type ResearchSourceResolvers = EnumResolverSignature<{ ARXIV?: any, CROSSREF?: any, DATACITE?: any, EUROPEPMC?: any, OPENALEX?: any, PUBMED?: any, SEMANTIC_SCHOLAR?: any }, ResolversTypes['ResearchSource']>;

export type StoryResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['Story'] = ResolversParentTypes['Story']> = {
  audioAssets?: Resolver<Array<ResolversTypes['AudioAsset']>, ParentType, ContextType>;
  audioGeneratedAt?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  audioKey?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  audioUrl?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  content?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  createdAt?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  createdBy?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  feedbackId?: Resolver<Maybe<ResolversTypes['Int']>, ParentType, ContextType>;
  goal?: Resolver<Maybe<ResolversTypes['Goal']>, ParentType, ContextType>;
  goalId?: Resolver<Maybe<ResolversTypes['Int']>, ParentType, ContextType>;
  id?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  issue?: Resolver<Maybe<ResolversTypes['Issue']>, ParentType, ContextType>;
  issueId?: Resolver<Maybe<ResolversTypes['Int']>, ParentType, ContextType>;
  language?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  minutes?: Resolver<Maybe<ResolversTypes['Int']>, ParentType, ContextType>;
  segments?: Resolver<Array<ResolversTypes['TextSegment']>, ParentType, ContextType>;
  updatedAt?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
};

export type SubscriptionResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['Subscription'] = ResolversParentTypes['Subscription']> = {
  audioJobStatus?: SubscriptionResolver<ResolversTypes['GenerationJob'], "audioJobStatus", ParentType, ContextType, RequireFields<SubscriptionaudioJobStatusArgs, 'jobId'>>;
  researchJobStatus?: SubscriptionResolver<ResolversTypes['GenerationJob'], "researchJobStatus", ParentType, ContextType, RequireFields<SubscriptionresearchJobStatusArgs, 'jobId'>>;
};

export type TeacherFeedbackResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['TeacherFeedback'] = ResolversParentTypes['TeacherFeedback']> = {
  content?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  createdAt?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  createdBy?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  extracted?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  familyMember?: Resolver<Maybe<ResolversTypes['FamilyMember']>, ParentType, ContextType>;
  familyMemberId?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  feedbackDate?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  id?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  source?: Resolver<Maybe<ResolversTypes['FeedbackSource']>, ParentType, ContextType>;
  subject?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  tags?: Resolver<Maybe<Array<ResolversTypes['String']>>, ParentType, ContextType>;
  teacherName?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  updatedAt?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
};

export type TextSegmentResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['TextSegment'] = ResolversParentTypes['TextSegment']> = {
  createdAt?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  goalId?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  id?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  idx?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  storyId?: Resolver<Maybe<ResolversTypes['Int']>, ParentType, ContextType>;
  text?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
};

export type TherapeuticQuestionResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['TherapeuticQuestion'] = ResolversParentTypes['TherapeuticQuestion']> = {
  createdAt?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  generatedAt?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  goalId?: Resolver<Maybe<ResolversTypes['Int']>, ParentType, ContextType>;
  id?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  issueId?: Resolver<Maybe<ResolversTypes['Int']>, ParentType, ContextType>;
  question?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  rationale?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  researchId?: Resolver<Maybe<ResolversTypes['Int']>, ParentType, ContextType>;
  researchTitle?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  updatedAt?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
};

export type TimelineAnalysisResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['TimelineAnalysis'] = ResolversParentTypes['TimelineAnalysis']> = {
  criticalPeriods?: Resolver<Array<ResolversTypes['String']>, ParentType, ContextType>;
  escalationTrend?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  moodCorrelation?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  phases?: Resolver<Array<ResolversTypes['TimelinePhase']>, ParentType, ContextType>;
};

export type TimelinePhaseResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['TimelinePhase'] = ResolversParentTypes['TimelinePhase']> = {
  description?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  issueIds?: Resolver<Array<ResolversTypes['Int']>, ParentType, ContextType>;
  keyEvents?: Resolver<Array<ResolversTypes['String']>, ParentType, ContextType>;
  moodTrend?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  period?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
};

export type UnlinkContactResultResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['UnlinkContactResult'] = ResolversParentTypes['UnlinkContactResult']> = {
  success?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
};

export type UnlinkIssuesResultResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['UnlinkIssuesResult'] = ResolversParentTypes['UnlinkIssuesResult']> = {
  success?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
};

export type UserSettingsResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['UserSettings'] = ResolversParentTypes['UserSettings']> = {
  storyLanguage?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  storyMinutes?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  userId?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
};

export type Resolvers<ContextType = GraphQLContext> = {
  AudioAsset?: AudioAssetResolvers<ContextType>;
  AudioFromR2Result?: AudioFromR2ResultResolvers<ContextType>;
  AudioManifest?: AudioManifestResolvers<ContextType>;
  AudioMetadata?: AudioMetadataResolvers<ContextType>;
  AudioSegmentInfo?: AudioSegmentInfoResolvers<ContextType>;
  BehaviorIntensity?: BehaviorIntensityResolvers;
  BehaviorObservation?: BehaviorObservationResolvers<ContextType>;
  BehaviorObservationType?: BehaviorObservationTypeResolvers;
  BuildClaimCardsResult?: BuildClaimCardsResultResolvers<ContextType>;
  CheckNoteClaimsResult?: CheckNoteClaimsResultResolvers<ContextType>;
  ClaimCard?: ClaimCardResolvers<ContextType>;
  ClaimProvenance?: ClaimProvenanceResolvers<ContextType>;
  ClaimScope?: ClaimScopeResolvers<ContextType>;
  ClaimVerdict?: ClaimVerdictResolvers;
  Contact?: ContactResolvers<ContextType>;
  ContactFeedback?: ContactFeedbackResolvers<ContextType>;
  Conversation?: ConversationResolvers<ContextType>;
  ConversationMessage?: ConversationMessageResolvers<ContextType>;
  DataSnapshot?: DataSnapshotResolvers<ContextType>;
  DeepIssueAnalysis?: DeepIssueAnalysisResolvers<ContextType>;
  DeleteBehaviorObservationResult?: DeleteBehaviorObservationResultResolvers<ContextType>;
  DeleteContactFeedbackResult?: DeleteContactFeedbackResultResolvers<ContextType>;
  DeleteContactResult?: DeleteContactResultResolvers<ContextType>;
  DeleteConversationResult?: DeleteConversationResultResolvers<ContextType>;
  DeleteDeepAnalysisResult?: DeleteDeepAnalysisResultResolvers<ContextType>;
  DeleteFamilyMemberResult?: DeleteFamilyMemberResultResolvers<ContextType>;
  DeleteGoalResult?: DeleteGoalResultResolvers<ContextType>;
  DeleteHabitResult?: DeleteHabitResultResolvers<ContextType>;
  DeleteIssueResult?: DeleteIssueResultResolvers<ContextType>;
  DeleteIssueScreenshotResult?: DeleteIssueScreenshotResultResolvers<ContextType>;
  DeleteJournalEntryResult?: DeleteJournalEntryResultResolvers<ContextType>;
  DeleteNoteResult?: DeleteNoteResultResolvers<ContextType>;
  DeleteQuestionsResult?: DeleteQuestionsResultResolvers<ContextType>;
  DeleteRelationshipResult?: DeleteRelationshipResultResolvers<ContextType>;
  DeleteResearchResult?: DeleteResearchResultResolvers<ContextType>;
  DeleteStoryResult?: DeleteStoryResultResolvers<ContextType>;
  DeleteTeacherFeedbackResult?: DeleteTeacherFeedbackResultResolvers<ContextType>;
  DevelopmentalTier?: DevelopmentalTierResolvers;
  EvidenceItem?: EvidenceItemResolvers<ContextType>;
  EvidenceLocator?: EvidenceLocatorResolvers<ContextType>;
  EvidencePolarity?: EvidencePolarityResolvers;
  ExtractedIssue?: ExtractedIssueResolvers<ContextType>;
  FamilyMember?: FamilyMemberResolvers<ContextType>;
  FamilyMemberShare?: FamilyMemberShareResolvers<ContextType>;
  FamilyMemberShareRole?: FamilyMemberShareRoleResolvers;
  FamilySystemInsight?: FamilySystemInsightResolvers<ContextType>;
  FeedbackSource?: FeedbackSourceResolvers;
  GenerateAudioResult?: GenerateAudioResultResolvers<ContextType>;
  GenerateDeepAnalysisResult?: GenerateDeepAnalysisResultResolvers<ContextType>;
  GenerateHabitsResult?: GenerateHabitsResultResolvers<ContextType>;
  GenerateLongFormTextResult?: GenerateLongFormTextResultResolvers<ContextType>;
  GenerateOpenAIAudioResult?: GenerateOpenAIAudioResultResolvers<ContextType>;
  GenerateParentAdviceResult?: GenerateParentAdviceResultResolvers<ContextType>;
  GenerateQuestionsResult?: GenerateQuestionsResultResolvers<ContextType>;
  GenerateResearchResult?: GenerateResearchResultResolvers<ContextType>;
  GenerationJob?: GenerationJobResolvers<ContextType>;
  Goal?: GoalResolvers<ContextType>;
  Habit?: HabitResolvers<ContextType>;
  HabitFrequency?: HabitFrequencyResolvers;
  HabitLog?: HabitLogResolvers<ContextType>;
  HabitStatus?: HabitStatusResolvers;
  Issue?: IssueResolvers<ContextType>;
  IssueContactLink?: IssueContactLinkResolvers<ContextType>;
  IssueLink?: IssueLinkResolvers<ContextType>;
  IssueScreenshot?: IssueScreenshotResolvers<ContextType>;
  JobError?: JobErrorResolvers<ContextType>;
  JobResult?: JobResultResolvers<ContextType>;
  JobStatus?: JobStatusResolvers;
  JobType?: JobTypeResolvers;
  JournalEntry?: JournalEntryResolvers<ContextType>;
  Mutation?: MutationResolvers<ContextType>;
  Note?: NoteResolvers<ContextType>;
  NoteAccess?: NoteAccessResolvers<ContextType>;
  NoteShare?: NoteShareResolvers<ContextType>;
  NoteShareRole?: NoteShareRoleResolvers;
  NoteVisibility?: NoteVisibilityResolvers;
  OpenAIAudioFormat?: OpenAIAudioFormatResolvers;
  OpenAIStreamFormat?: OpenAIStreamFormatResolvers;
  OpenAITTSModel?: OpenAITTSModelResolvers;
  OpenAITTSVoice?: OpenAITTSVoiceResolvers;
  PaperCandidate?: PaperCandidateResolvers<ContextType>;
  ParentAdviceItem?: ParentAdviceItemResolvers<ContextType>;
  PatternCluster?: PatternClusterResolvers<ContextType>;
  PersonType?: PersonTypeResolvers;
  PipelineDiagnostics?: PipelineDiagnosticsResolvers<ContextType>;
  PriorityRecommendation?: PriorityRecommendationResolvers<ContextType>;
  Query?: QueryResolvers<ContextType>;
  Relationship?: RelationshipResolvers<ContextType>;
  RelationshipPerson?: RelationshipPersonResolvers<ContextType>;
  RelationshipStatus?: RelationshipStatusResolvers;
  Research?: ResearchResolvers<ContextType>;
  ResearchRelevanceMapping?: ResearchRelevanceMappingResolvers<ContextType>;
  ResearchSource?: ResearchSourceResolvers;
  Story?: StoryResolvers<ContextType>;
  Subscription?: SubscriptionResolvers<ContextType>;
  TeacherFeedback?: TeacherFeedbackResolvers<ContextType>;
  TextSegment?: TextSegmentResolvers<ContextType>;
  TherapeuticQuestion?: TherapeuticQuestionResolvers<ContextType>;
  TimelineAnalysis?: TimelineAnalysisResolvers<ContextType>;
  TimelinePhase?: TimelinePhaseResolvers<ContextType>;
  UnlinkContactResult?: UnlinkContactResultResolvers<ContextType>;
  UnlinkIssuesResult?: UnlinkIssuesResultResolvers<ContextType>;
  UserSettings?: UserSettingsResolvers<ContextType>;
};

