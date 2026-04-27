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

export type ActionableRecommendation = {
  __typename?: 'ActionableRecommendation';
  concreteSteps: Array<Scalars['String']['output']>;
  description: Scalars['String']['output'];
  priority: Scalars['String']['output'];
  relatedResearchIds?: Maybe<Array<Scalars['Int']['output']>>;
  title: Scalars['String']['output'];
};

export type AddAllergyInput = {
  familyMemberId?: InputMaybe<Scalars['Int']['input']>;
  kind: AllergyKind;
  name: Scalars['String']['input'];
  notes?: InputMaybe<Scalars['String']['input']>;
  severity?: InputMaybe<Scalars['String']['input']>;
};

export type AddAppointmentInput = {
  appointmentDate?: InputMaybe<Scalars['String']['input']>;
  doctorId?: InputMaybe<Scalars['ID']['input']>;
  familyMemberId?: InputMaybe<Scalars['Int']['input']>;
  notes?: InputMaybe<Scalars['String']['input']>;
  provider?: InputMaybe<Scalars['String']['input']>;
  title: Scalars['String']['input'];
};

export type AddConditionInput = {
  name: Scalars['String']['input'];
  notes?: InputMaybe<Scalars['String']['input']>;
};

export type AddDoctorInput = {
  address?: InputMaybe<Scalars['String']['input']>;
  email?: InputMaybe<Scalars['String']['input']>;
  name: Scalars['String']['input'];
  notes?: InputMaybe<Scalars['String']['input']>;
  phone?: InputMaybe<Scalars['String']['input']>;
  specialty?: InputMaybe<Scalars['String']['input']>;
};

export type AddMedicationInput = {
  dosage?: InputMaybe<Scalars['String']['input']>;
  endDate?: InputMaybe<Scalars['String']['input']>;
  frequency?: InputMaybe<Scalars['String']['input']>;
  name: Scalars['String']['input'];
  notes?: InputMaybe<Scalars['String']['input']>;
  startDate?: InputMaybe<Scalars['String']['input']>;
};

export type AddMemoryEntryInput = {
  category: Scalars['String']['input'];
  context?: InputMaybe<Scalars['String']['input']>;
  description?: InputMaybe<Scalars['String']['input']>;
  longTermScore?: InputMaybe<Scalars['Float']['input']>;
  overallScore?: InputMaybe<Scalars['Float']['input']>;
  protocolId?: InputMaybe<Scalars['ID']['input']>;
  recallSpeed?: InputMaybe<Scalars['Float']['input']>;
  shortTermScore?: InputMaybe<Scalars['Float']['input']>;
  workingMemoryScore?: InputMaybe<Scalars['Float']['input']>;
};

export type AddProtocolInput = {
  name: Scalars['String']['input'];
  notes?: InputMaybe<Scalars['String']['input']>;
  startDate?: InputMaybe<Scalars['String']['input']>;
  targetAreas?: InputMaybe<Array<Scalars['String']['input']>>;
};

export type AddSupplementInput = {
  dosage: Scalars['String']['input'];
  frequency: Scalars['String']['input'];
  mechanism?: InputMaybe<Scalars['String']['input']>;
  name: Scalars['String']['input'];
  notes?: InputMaybe<Scalars['String']['input']>;
  targetAreas?: InputMaybe<Array<Scalars['String']['input']>>;
  url?: InputMaybe<Scalars['String']['input']>;
};

export type AddSymptomInput = {
  description: Scalars['String']['input'];
  loggedAt?: InputMaybe<Scalars['String']['input']>;
  severity?: InputMaybe<Scalars['String']['input']>;
};

export type Affirmation = {
  __typename?: 'Affirmation';
  category: AffirmationCategory;
  createdAt: Scalars['String']['output'];
  familyMemberId: Scalars['Int']['output'];
  id: Scalars['Int']['output'];
  isActive: Scalars['Boolean']['output'];
  text: Scalars['String']['output'];
  updatedAt: Scalars['String']['output'];
  userId: Scalars['String']['output'];
};

export type AffirmationCategory =
  | 'ENCOURAGEMENT'
  | 'GRATITUDE'
  | 'GROWTH'
  | 'SELF_WORTH'
  | 'STRENGTH';

export type Allergy = {
  __typename?: 'Allergy';
  createdAt: Scalars['String']['output'];
  familyMember?: Maybe<FamilyMember>;
  familyMemberId?: Maybe<Scalars['Int']['output']>;
  id: Scalars['ID']['output'];
  kind: AllergyKind;
  name: Scalars['String']['output'];
  notes?: Maybe<Scalars['String']['output']>;
  severity?: Maybe<Scalars['String']['output']>;
  userId: Scalars['String']['output'];
};

export type AllergyKind =
  | 'allergy'
  | 'intolerance';

export type AnticipatedReaction = {
  __typename?: 'AnticipatedReaction';
  howToRespond: Scalars['String']['output'];
  likelihood: Scalars['String']['output'];
  reaction: Scalars['String']['output'];
};

export type Appointment = {
  __typename?: 'Appointment';
  appointmentDate?: Maybe<Scalars['String']['output']>;
  createdAt: Scalars['String']['output'];
  doctorId?: Maybe<Scalars['ID']['output']>;
  familyMemberId?: Maybe<Scalars['Int']['output']>;
  id: Scalars['ID']['output'];
  notes?: Maybe<Scalars['String']['output']>;
  provider?: Maybe<Scalars['String']['output']>;
  title: Scalars['String']['output'];
  userId: Scalars['String']['output'];
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

export type BloodTest = {
  __typename?: 'BloodTest';
  errorMessage?: Maybe<Scalars['String']['output']>;
  fileName: Scalars['String']['output'];
  filePath: Scalars['String']['output'];
  id: Scalars['ID']['output'];
  markersCount: Scalars['Int']['output'];
  status: Scalars['String']['output'];
  testDate?: Maybe<Scalars['String']['output']>;
  uploadedAt: Scalars['String']['output'];
  userId: Scalars['String']['output'];
};

export type BogdanDiscussionGuide = {
  __typename?: 'BogdanDiscussionGuide';
  anticipatedReactions: Array<AnticipatedReaction>;
  behaviorSummary: Scalars['String']['output'];
  childAge?: Maybe<Scalars['Int']['output']>;
  citations: Array<Citation>;
  conversationStarters: Array<ConversationStarter>;
  createdAt: Scalars['String']['output'];
  critique?: Maybe<DiscussionGuideCritique>;
  developmentalContext: DevelopmentalContext;
  familyMemberId: Scalars['Int']['output'];
  followUpPlan: Array<FollowUpStep>;
  id: Scalars['Int']['output'];
  languageGuide: LanguageGuide;
  model: Scalars['String']['output'];
  talkingPoints: Array<TalkingPoint>;
};

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

export type Citation = {
  __typename?: 'Citation';
  authors?: Maybe<Scalars['String']['output']>;
  doi?: Maybe<Scalars['String']['output']>;
  researchId: Scalars['Int']['output'];
  title: Scalars['String']['output'];
  url?: Maybe<Scalars['String']['output']>;
  year?: Maybe<Scalars['Int']['output']>;
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

export type CognitiveBaseline = {
  __typename?: 'CognitiveBaseline';
  focusScore?: Maybe<Scalars['Float']['output']>;
  id: Scalars['ID']['output'];
  memoryScore?: Maybe<Scalars['Float']['output']>;
  moodScore?: Maybe<Scalars['Float']['output']>;
  processingSpeedScore?: Maybe<Scalars['Float']['output']>;
  protocolId: Scalars['ID']['output'];
  recordedAt: Scalars['String']['output'];
  sleepScore?: Maybe<Scalars['Float']['output']>;
};

export type CognitiveCheckIn = {
  __typename?: 'CognitiveCheckIn';
  focusScore?: Maybe<Scalars['Float']['output']>;
  id: Scalars['ID']['output'];
  memoryScore?: Maybe<Scalars['Float']['output']>;
  moodScore?: Maybe<Scalars['Float']['output']>;
  notes?: Maybe<Scalars['String']['output']>;
  processingSpeedScore?: Maybe<Scalars['Float']['output']>;
  protocolId: Scalars['ID']['output'];
  recordedAt: Scalars['String']['output'];
  sideEffects?: Maybe<Scalars['String']['output']>;
  sleepScore?: Maybe<Scalars['Float']['output']>;
};

export type CognitiveCheckInInput = {
  focusScore?: InputMaybe<Scalars['Float']['input']>;
  memoryScore?: InputMaybe<Scalars['Float']['input']>;
  moodScore?: InputMaybe<Scalars['Float']['input']>;
  notes?: InputMaybe<Scalars['String']['input']>;
  processingSpeedScore?: InputMaybe<Scalars['Float']['input']>;
  sideEffects?: InputMaybe<Scalars['String']['input']>;
  sleepScore?: InputMaybe<Scalars['Float']['input']>;
};

export type CognitiveScoresInput = {
  focusScore?: InputMaybe<Scalars['Float']['input']>;
  memoryScore?: InputMaybe<Scalars['Float']['input']>;
  moodScore?: InputMaybe<Scalars['Float']['input']>;
  processingSpeedScore?: InputMaybe<Scalars['Float']['input']>;
  sleepScore?: InputMaybe<Scalars['Float']['input']>;
};

export type Condition = {
  __typename?: 'Condition';
  createdAt: Scalars['String']['output'];
  familyMember?: Maybe<FamilyMember>;
  familyMemberId?: Maybe<Scalars['Int']['output']>;
  id: Scalars['ID']['output'];
  name: Scalars['String']['output'];
  notes?: Maybe<Scalars['String']['output']>;
  userId: Scalars['String']['output'];
};

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

export type ConversationStarter = {
  __typename?: 'ConversationStarter';
  ageAppropriateNote?: Maybe<Scalars['String']['output']>;
  context: Scalars['String']['output'];
  opener: Scalars['String']['output'];
};

export type ConvertJournalEntryToIssueInput = {
  category: Scalars['String']['input'];
  description?: InputMaybe<Scalars['String']['input']>;
  familyMemberId: Scalars['Int']['input'];
  recommendations?: InputMaybe<Array<Scalars['String']['input']>>;
  severity: Scalars['String']['input'];
  title?: InputMaybe<Scalars['String']['input']>;
};

export type CreateAffirmationInput = {
  category?: InputMaybe<AffirmationCategory>;
  familyMemberId: Scalars['Int']['input'];
  text: Scalars['String']['input'];
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
  allergies?: InputMaybe<Scalars['String']['input']>;
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

export type CreateGameInput = {
  content: Scalars['String']['input'];
  description?: InputMaybe<Scalars['String']['input']>;
  estimatedMinutes?: InputMaybe<Scalars['Int']['input']>;
  familyMemberId?: InputMaybe<Scalars['Int']['input']>;
  goalId?: InputMaybe<Scalars['Int']['input']>;
  issueId?: InputMaybe<Scalars['Int']['input']>;
  language?: InputMaybe<Scalars['String']['input']>;
  title: Scalars['String']['input'];
  type: GameType;
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
  content?: InputMaybe<Scalars['String']['input']>;
  entryDate: Scalars['String']['input'];
  familyMemberId?: InputMaybe<Scalars['Int']['input']>;
  goalId?: InputMaybe<Scalars['Int']['input']>;
  isPrivate?: InputMaybe<Scalars['Boolean']['input']>;
  isVault?: InputMaybe<Scalars['Boolean']['input']>;
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

export type CritiqueScores = {
  __typename?: 'CritiqueScores';
  actionability: Scalars['Int']['output'];
  ageAppropriateness: Scalars['Int']['output'];
  citationCoverage: Scalars['Int']['output'];
  internalConsistency: Scalars['Int']['output'];
  microScriptDepth: Scalars['Int']['output'];
  romanianFluency: Scalars['Int']['output'];
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

export type DeepAnalysis = {
  __typename?: 'DeepAnalysis';
  createdAt: Scalars['String']['output'];
  createdBy: Scalars['String']['output'];
  dataSnapshot: DataSnapshot;
  familyMember?: Maybe<FamilyMember>;
  familySystemInsights: Array<FamilySystemInsight>;
  goal?: Maybe<Goal>;
  id: Scalars['Int']['output'];
  jobId?: Maybe<Scalars['String']['output']>;
  journalEntry?: Maybe<JournalEntry>;
  model: Scalars['String']['output'];
  note?: Maybe<Note>;
  parentAdvice: Array<ParentAdviceItem>;
  patternClusters: Array<PatternCluster>;
  priorityRecommendations: Array<PriorityRecommendation>;
  researchRelevance: Array<ResearchRelevanceMapping>;
  subjectId: Scalars['Int']['output'];
  subjectType: DeepAnalysisSubjectType;
  summary: Scalars['String']['output'];
  timelineAnalysis: TimelineAnalysis;
  triggerId?: Maybe<Scalars['Int']['output']>;
  triggerType?: Maybe<DeepAnalysisTriggerType>;
  updatedAt: Scalars['String']['output'];
};

export type DeepAnalysisSubjectType =
  | 'FAMILY_MEMBER'
  | 'GOAL'
  | 'JOURNAL_ENTRY'
  | 'NOTE';

export type DeepAnalysisTriggerType =
  | 'FEEDBACK'
  | 'ISSUE'
  | 'OBSERVATION';

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

export type DeleteAffirmationResult = {
  __typename?: 'DeleteAffirmationResult';
  message?: Maybe<Scalars['String']['output']>;
  success: Scalars['Boolean']['output'];
};

export type DeleteAllergyResult = {
  __typename?: 'DeleteAllergyResult';
  success: Scalars['Boolean']['output'];
};

export type DeleteAppointmentResult = {
  __typename?: 'DeleteAppointmentResult';
  success: Scalars['Boolean']['output'];
};

export type DeleteBehaviorObservationResult = {
  __typename?: 'DeleteBehaviorObservationResult';
  message?: Maybe<Scalars['String']['output']>;
  success: Scalars['Boolean']['output'];
};

export type DeleteBloodTestResult = {
  __typename?: 'DeleteBloodTestResult';
  success: Scalars['Boolean']['output'];
};

export type DeleteConditionResult = {
  __typename?: 'DeleteConditionResult';
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

export type DeleteDiscussionGuideResult = {
  __typename?: 'DeleteDiscussionGuideResult';
  message?: Maybe<Scalars['String']['output']>;
  success: Scalars['Boolean']['output'];
};

export type DeleteDoctorResult = {
  __typename?: 'DeleteDoctorResult';
  success: Scalars['Boolean']['output'];
};

export type DeleteFamilyMemberResult = {
  __typename?: 'DeleteFamilyMemberResult';
  message?: Maybe<Scalars['String']['output']>;
  success: Scalars['Boolean']['output'];
};

export type DeleteGameResult = {
  __typename?: 'DeleteGameResult';
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

export type DeleteJournalAnalysisResult = {
  __typename?: 'DeleteJournalAnalysisResult';
  message?: Maybe<Scalars['String']['output']>;
  success: Scalars['Boolean']['output'];
};

export type DeleteJournalEntryResult = {
  __typename?: 'DeleteJournalEntryResult';
  message?: Maybe<Scalars['String']['output']>;
  success: Scalars['Boolean']['output'];
};

export type DeleteMedicationResult = {
  __typename?: 'DeleteMedicationResult';
  success: Scalars['Boolean']['output'];
};

export type DeleteMemoryEntryResult = {
  __typename?: 'DeleteMemoryEntryResult';
  success: Scalars['Boolean']['output'];
};

export type DeleteNoteResult = {
  __typename?: 'DeleteNoteResult';
  message?: Maybe<Scalars['String']['output']>;
  success: Scalars['Boolean']['output'];
};

export type DeleteProtocolResult = {
  __typename?: 'DeleteProtocolResult';
  success: Scalars['Boolean']['output'];
};

export type DeleteQuestionsResult = {
  __typename?: 'DeleteQuestionsResult';
  deletedCount: Scalars['Int']['output'];
  message?: Maybe<Scalars['String']['output']>;
  success: Scalars['Boolean']['output'];
};

export type DeleteRecommendedBooksResult = {
  __typename?: 'DeleteRecommendedBooksResult';
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

export type DeleteRoutineAnalysisResult = {
  __typename?: 'DeleteRoutineAnalysisResult';
  message?: Maybe<Scalars['String']['output']>;
  success: Scalars['Boolean']['output'];
};

export type DeleteStoryResult = {
  __typename?: 'DeleteStoryResult';
  message?: Maybe<Scalars['String']['output']>;
  success: Scalars['Boolean']['output'];
};

export type DeleteSupplementResult = {
  __typename?: 'DeleteSupplementResult';
  success: Scalars['Boolean']['output'];
};

export type DeleteSymptomResult = {
  __typename?: 'DeleteSymptomResult';
  success: Scalars['Boolean']['output'];
};

export type DeleteTeacherFeedbackResult = {
  __typename?: 'DeleteTeacherFeedbackResult';
  message?: Maybe<Scalars['String']['output']>;
  success: Scalars['Boolean']['output'];
};

export type DevelopmentalContext = {
  __typename?: 'DevelopmentalContext';
  explanation: Scalars['String']['output'];
  normalizedBehavior: Scalars['String']['output'];
  researchBasis?: Maybe<Scalars['String']['output']>;
  stage: Scalars['String']['output'];
};

export type DevelopmentalTier =
  | 'ADULT'
  | 'EARLY_ADOLESCENCE'
  | 'EARLY_CHILDHOOD'
  | 'LATE_ADOLESCENCE'
  | 'MIDDLE_CHILDHOOD';

export type DiscussionGuide = {
  __typename?: 'DiscussionGuide';
  anticipatedReactions: Array<AnticipatedReaction>;
  behaviorSummary: Scalars['String']['output'];
  childAge?: Maybe<Scalars['Int']['output']>;
  conversationStarters: Array<ConversationStarter>;
  createdAt: Scalars['String']['output'];
  developmentalContext: DevelopmentalContext;
  followUpPlan: Array<FollowUpStep>;
  id: Scalars['Int']['output'];
  journalEntryId: Scalars['Int']['output'];
  languageGuide: LanguageGuide;
  model: Scalars['String']['output'];
  talkingPoints: Array<TalkingPoint>;
};

export type DiscussionGuideCritique = {
  __typename?: 'DiscussionGuideCritique';
  refined: Scalars['Boolean']['output'];
  scores: CritiqueScores;
  weakSections: Array<Scalars['String']['output']>;
};

export type Doctor = {
  __typename?: 'Doctor';
  address?: Maybe<Scalars['String']['output']>;
  createdAt: Scalars['String']['output'];
  email?: Maybe<Scalars['String']['output']>;
  id: Scalars['ID']['output'];
  name: Scalars['String']['output'];
  notes?: Maybe<Scalars['String']['output']>;
  phone?: Maybe<Scalars['String']['output']>;
  specialty?: Maybe<Scalars['String']['output']>;
  userId: Scalars['String']['output'];
};

export type EmotionalLandscape = {
  __typename?: 'EmotionalLandscape';
  attachmentPatterns?: Maybe<Scalars['String']['output']>;
  emotionalRegulation: Scalars['String']['output'];
  primaryEmotions: Array<Scalars['String']['output']>;
  underlyingEmotions: Array<Scalars['String']['output']>;
};

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
  affirmations: Array<Affirmation>;
  ageYears?: Maybe<Scalars['Int']['output']>;
  allergies?: Maybe<Scalars['String']['output']>;
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
  | 'EDITOR';

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

export type FollowUpStep = {
  __typename?: 'FollowUpStep';
  action: Scalars['String']['output'];
  description: Scalars['String']['output'];
  timing: Scalars['String']['output'];
};

export type Game = {
  __typename?: 'Game';
  completions: Array<GameCompletion>;
  content: Scalars['String']['output'];
  createdAt: Scalars['String']['output'];
  description?: Maybe<Scalars['String']['output']>;
  estimatedMinutes?: Maybe<Scalars['Int']['output']>;
  familyMemberId?: Maybe<Scalars['Int']['output']>;
  goal?: Maybe<Goal>;
  goalId?: Maybe<Scalars['Int']['output']>;
  id: Scalars['Int']['output'];
  issue?: Maybe<Issue>;
  issueId?: Maybe<Scalars['Int']['output']>;
  language?: Maybe<Scalars['String']['output']>;
  source: GameSource;
  title: Scalars['String']['output'];
  type: GameType;
  updatedAt: Scalars['String']['output'];
  userId: Scalars['String']['output'];
};

export type GameCompletion = {
  __typename?: 'GameCompletion';
  completedAt: Scalars['String']['output'];
  durationSeconds?: Maybe<Scalars['Int']['output']>;
  gameId: Scalars['Int']['output'];
  id: Scalars['Int']['output'];
  linkedNoteId?: Maybe<Scalars['Int']['output']>;
  responses?: Maybe<Scalars['String']['output']>;
  userId: Scalars['String']['output'];
};

export type GameSource =
  | 'AI'
  | 'SEED'
  | 'USER';

export type GameType =
  | 'CBT_REFRAME'
  | 'JOURNAL_PROMPT'
  | 'MINDFULNESS';

export type GenerateAffirmationsResult = {
  __typename?: 'GenerateAffirmationsResult';
  affirmations: Array<Affirmation>;
  count: Scalars['Int']['output'];
  message?: Maybe<Scalars['String']['output']>;
  success: Scalars['Boolean']['output'];
};

export type GenerateAudioResult = {
  __typename?: 'GenerateAudioResult';
  audioUrl?: Maybe<Scalars['String']['output']>;
  jobId: Scalars['String']['output'];
  message?: Maybe<Scalars['String']['output']>;
  success: Scalars['Boolean']['output'];
};

export type GenerateBogdanDiscussionResult = {
  __typename?: 'GenerateBogdanDiscussionResult';
  jobId?: Maybe<Scalars['String']['output']>;
  message?: Maybe<Scalars['String']['output']>;
  success: Scalars['Boolean']['output'];
};

export type GenerateDeepAnalysisResult = {
  __typename?: 'GenerateDeepAnalysisResult';
  jobId?: Maybe<Scalars['String']['output']>;
  message?: Maybe<Scalars['String']['output']>;
  success: Scalars['Boolean']['output'];
};

export type GenerateDiscussionGuideResult = {
  __typename?: 'GenerateDiscussionGuideResult';
  jobId?: Maybe<Scalars['String']['output']>;
  message?: Maybe<Scalars['String']['output']>;
  success: Scalars['Boolean']['output'];
};

export type GenerateGameInput = {
  familyMemberId?: InputMaybe<Scalars['Int']['input']>;
  goalId?: InputMaybe<Scalars['Int']['input']>;
  issueId?: InputMaybe<Scalars['Int']['input']>;
  language?: InputMaybe<Scalars['String']['input']>;
  type: GameType;
};

export type GenerateHabitsResult = {
  __typename?: 'GenerateHabitsResult';
  count?: Maybe<Scalars['Int']['output']>;
  habits?: Maybe<Array<Habit>>;
  message?: Maybe<Scalars['String']['output']>;
  success: Scalars['Boolean']['output'];
};

export type GenerateJournalAnalysisResult = {
  __typename?: 'GenerateJournalAnalysisResult';
  analysis?: Maybe<JournalAnalysis>;
  jobId?: Maybe<Scalars['String']['output']>;
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

export type GenerateRecommendedBooksResult = {
  __typename?: 'GenerateRecommendedBooksResult';
  books: Array<RecommendedBook>;
  jobId?: Maybe<Scalars['String']['output']>;
  message?: Maybe<Scalars['String']['output']>;
  success: Scalars['Boolean']['output'];
};

export type GenerateResearchResult = {
  __typename?: 'GenerateResearchResult';
  count?: Maybe<Scalars['Int']['output']>;
  jobId?: Maybe<Scalars['String']['output']>;
  message?: Maybe<Scalars['String']['output']>;
  success: Scalars['Boolean']['output'];
};

export type GenerateRoutineAnalysisResult = {
  __typename?: 'GenerateRoutineAnalysisResult';
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
  recommendedBooks: Array<RecommendedBook>;
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

export type HabitAdherence = {
  __typename?: 'HabitAdherence';
  consistency: Scalars['Float']['output'];
  currentStreak: Scalars['Int']['output'];
  frequency: Scalars['String']['output'];
  habitId: Scalars['Int']['output'];
  habitTitle: Scalars['String']['output'];
  interpretation: Scalars['String']['output'];
  longestStreak: Scalars['Int']['output'];
  missedPattern?: Maybe<Scalars['String']['output']>;
  observedCount: Scalars['Int']['output'];
  targetCount: Scalars['Int']['output'];
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

export type HealthcareChatInput = {
  messages: Array<HealthcareChatTurn>;
};

export type HealthcareChatResponse = {
  __typename?: 'HealthcareChatResponse';
  answer: Scalars['String']['output'];
  citations: Array<Scalars['String']['output']>;
  guardIssues: Array<Scalars['String']['output']>;
  guardPassed: Scalars['Boolean']['output'];
  intent: Scalars['String']['output'];
  intentConfidence: Scalars['Float']['output'];
  rerankScores: Array<Scalars['Float']['output']>;
  retrievalSources: Array<Scalars['String']['output']>;
};

export type HealthcareChatTurn = {
  content: Scalars['String']['input'];
  role: Scalars['String']['input'];
};

export type HealthcareMarkerTrendHit = {
  __typename?: 'HealthcareMarkerTrendHit';
  content: Scalars['String']['output'];
  fileName: Scalars['String']['output'];
  flag: Scalars['String']['output'];
  markerId: Scalars['ID']['output'];
  markerName: Scalars['String']['output'];
  similarity: Scalars['Float']['output'];
  testDate?: Maybe<Scalars['String']['output']>;
  testId: Scalars['ID']['output'];
  unit: Scalars['String']['output'];
  value: Scalars['String']['output'];
};

export type HealthcareMultiSearchResult = {
  __typename?: 'HealthcareMultiSearchResult';
  appointments: Array<HealthcareSearchHit>;
  conditions: Array<HealthcareSearchHit>;
  markers: Array<HealthcareSearchMarkerHit>;
  medications: Array<HealthcareSearchHit>;
  symptoms: Array<HealthcareSearchHit>;
  tests: Array<HealthcareSearchTestHit>;
};

export type HealthcareSearchHit = {
  __typename?: 'HealthcareSearchHit';
  content: Scalars['String']['output'];
  entityId: Scalars['ID']['output'];
  id: Scalars['ID']['output'];
  similarity: Scalars['Float']['output'];
};

export type HealthcareSearchMarkerHit = {
  __typename?: 'HealthcareSearchMarkerHit';
  combinedScore: Scalars['Float']['output'];
  content: Scalars['String']['output'];
  markerId: Scalars['ID']['output'];
  markerName: Scalars['String']['output'];
  testId: Scalars['ID']['output'];
  vectorSimilarity: Scalars['Float']['output'];
};

export type HealthcareSearchTestHit = {
  __typename?: 'HealthcareSearchTestHit';
  content: Scalars['String']['output'];
  fileName?: Maybe<Scalars['String']['output']>;
  id: Scalars['ID']['output'];
  similarity: Scalars['Float']['output'];
  testDate?: Maybe<Scalars['String']['output']>;
  testId: Scalars['ID']['output'];
};

export type HealthcareSummary = {
  __typename?: 'HealthcareSummary';
  appointmentsCount: Scalars['Int']['output'];
  bloodTestsCount: Scalars['Int']['output'];
  conditionsCount: Scalars['Int']['output'];
  doctorsCount: Scalars['Int']['output'];
  medicationsCount: Scalars['Int']['output'];
  memoryEntriesCount: Scalars['Int']['output'];
  protocolsCount: Scalars['Int']['output'];
  symptomsCount: Scalars['Int']['output'];
};

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
  message?: Maybe<Scalars['String']['output']>;
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
  | 'DEEP_ANALYSIS'
  | 'LONGFORM'
  | 'QUESTIONS'
  | 'RECOMMENDED_BOOKS'
  | 'RESEARCH'
  | 'ROUTINE_ANALYSIS';

export type JournalAnalysis = {
  __typename?: 'JournalAnalysis';
  actionableRecommendations: Array<ActionableRecommendation>;
  createdAt: Scalars['String']['output'];
  emotionalLandscape: EmotionalLandscape;
  id: Scalars['Int']['output'];
  journalEntryId: Scalars['Int']['output'];
  model: Scalars['String']['output'];
  reflectionPrompts: Array<Scalars['String']['output']>;
  summary: Scalars['String']['output'];
  therapeuticInsights: Array<TherapeuticInsight>;
};

export type JournalEntry = {
  __typename?: 'JournalEntry';
  analysis?: Maybe<JournalAnalysis>;
  content: Scalars['String']['output'];
  createdAt: Scalars['String']['output'];
  createdBy: Scalars['String']['output'];
  discussionGuide?: Maybe<DiscussionGuide>;
  entryDate: Scalars['String']['output'];
  familyMember?: Maybe<FamilyMember>;
  familyMemberId?: Maybe<Scalars['Int']['output']>;
  goal?: Maybe<Goal>;
  goalId?: Maybe<Scalars['Int']['output']>;
  id: Scalars['Int']['output'];
  isPrivate: Scalars['Boolean']['output'];
  isVault: Scalars['Boolean']['output'];
  issue?: Maybe<Issue>;
  mood?: Maybe<Scalars['String']['output']>;
  moodScore?: Maybe<Scalars['Int']['output']>;
  tags?: Maybe<Array<Scalars['String']['output']>>;
  title?: Maybe<Scalars['String']['output']>;
  updatedAt: Scalars['String']['output'];
};

export type LanguageExample = {
  __typename?: 'LanguageExample';
  alternative?: Maybe<Scalars['String']['output']>;
  phrase: Scalars['String']['output'];
  reason: Scalars['String']['output'];
};

export type LanguageGuide = {
  __typename?: 'LanguageGuide';
  whatNotToSay: Array<LanguageExample>;
  whatToSay: Array<LanguageExample>;
};

export type LogGameCompletionInput = {
  durationSeconds?: InputMaybe<Scalars['Int']['input']>;
  gameId: Scalars['Int']['input'];
  linkedNoteId?: InputMaybe<Scalars['Int']['input']>;
  responses?: InputMaybe<Scalars['String']['input']>;
};

export type Medication = {
  __typename?: 'Medication';
  createdAt: Scalars['String']['output'];
  dosage?: Maybe<Scalars['String']['output']>;
  endDate?: Maybe<Scalars['String']['output']>;
  familyMember?: Maybe<FamilyMember>;
  familyMemberId?: Maybe<Scalars['Int']['output']>;
  frequency?: Maybe<Scalars['String']['output']>;
  id: Scalars['ID']['output'];
  name: Scalars['String']['output'];
  notes?: Maybe<Scalars['String']['output']>;
  startDate?: Maybe<Scalars['String']['output']>;
  userId: Scalars['String']['output'];
};

export type MemoryBaseline = {
  __typename?: 'MemoryBaseline';
  id: Scalars['ID']['output'];
  longTermScore?: Maybe<Scalars['Float']['output']>;
  overallScore?: Maybe<Scalars['Float']['output']>;
  recallSpeed?: Maybe<Scalars['Float']['output']>;
  recordedAt: Scalars['String']['output'];
  shortTermScore?: Maybe<Scalars['Float']['output']>;
  userId: Scalars['String']['output'];
  workingMemoryScore?: Maybe<Scalars['Float']['output']>;
};

export type MemoryEntry = {
  __typename?: 'MemoryEntry';
  category: Scalars['String']['output'];
  context?: Maybe<Scalars['String']['output']>;
  createdAt: Scalars['String']['output'];
  description?: Maybe<Scalars['String']['output']>;
  id: Scalars['ID']['output'];
  loggedAt: Scalars['String']['output'];
  longTermScore?: Maybe<Scalars['Float']['output']>;
  overallScore?: Maybe<Scalars['Float']['output']>;
  protocolId?: Maybe<Scalars['ID']['output']>;
  recallSpeed?: Maybe<Scalars['Float']['output']>;
  shortTermScore?: Maybe<Scalars['Float']['output']>;
  userId: Scalars['String']['output'];
  workingMemoryScore?: Maybe<Scalars['Float']['output']>;
};

export type MicroScript = {
  __typename?: 'MicroScript';
  childResponse: Scalars['String']['output'];
  parentFollowUp: Scalars['String']['output'];
  parentOpener: Scalars['String']['output'];
};

export type Mutation = {
  __typename?: 'Mutation';
  addAllergy: Allergy;
  addAppointment: Appointment;
  addCondition: Condition;
  addDoctor: Doctor;
  addMedication: Medication;
  addMemoryEntry: MemoryEntry;
  addProtocol: Protocol;
  addSupplement: ProtocolSupplement;
  addSymptom: Symptom;
  buildClaimCards: BuildClaimCardsResult;
  checkNoteClaims: CheckNoteClaimsResult;
  convertIssueToGoal: Goal;
  convertJournalEntryToIssue: Issue;
  createAffirmation: Affirmation;
  createContact: Contact;
  createContactFeedback: ContactFeedback;
  createConversation: Conversation;
  createFamilyMember: FamilyMember;
  createGame: Game;
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
  deleteAffirmation: DeleteAffirmationResult;
  deleteAllergy: DeleteAllergyResult;
  deleteAppointment: DeleteAppointmentResult;
  deleteBehaviorObservation: DeleteBehaviorObservationResult;
  deleteBloodTest: DeleteBloodTestResult;
  deleteClaimCard: Scalars['Boolean']['output'];
  deleteCondition: DeleteConditionResult;
  deleteContact: DeleteContactResult;
  deleteContactFeedback: DeleteContactFeedbackResult;
  deleteConversation: DeleteConversationResult;
  deleteDeepAnalysis: DeleteDeepAnalysisResult;
  deleteDeepIssueAnalysis: DeleteDeepAnalysisResult;
  deleteDiscussionGuide: DeleteDiscussionGuideResult;
  deleteDoctor: DeleteDoctorResult;
  deleteFamilyMember: DeleteFamilyMemberResult;
  deleteGame: DeleteGameResult;
  deleteGoal: DeleteGoalResult;
  deleteHabit: DeleteHabitResult;
  deleteHabitLog: Scalars['Boolean']['output'];
  deleteIssue: DeleteIssueResult;
  deleteIssueScreenshot: DeleteIssueScreenshotResult;
  deleteJournalAnalysis: DeleteJournalAnalysisResult;
  deleteJournalEntry: DeleteJournalEntryResult;
  deleteMedication: DeleteMedicationResult;
  deleteMemoryEntry: DeleteMemoryEntryResult;
  deleteNote: DeleteNoteResult;
  deleteProtocol: DeleteProtocolResult;
  deleteRecommendedBooks: DeleteRecommendedBooksResult;
  deleteRelationship: DeleteRelationshipResult;
  deleteResearch: DeleteResearchResult;
  deleteRoutineAnalysis: DeleteRoutineAnalysisResult;
  deleteStory: DeleteStoryResult;
  deleteSupplement: DeleteSupplementResult;
  deleteSymptom: DeleteSymptomResult;
  deleteTeacherFeedback: DeleteTeacherFeedbackResult;
  deleteTherapeuticQuestions: DeleteQuestionsResult;
  extractContactFeedbackIssues: ContactFeedback;
  generateAffirmationsForFamilyMember: GenerateAffirmationsResult;
  generateAudio: GenerateAudioResult;
  generateBogdanDiscussion: GenerateBogdanDiscussionResult;
  generateDeepAnalysis: GenerateDeepAnalysisResult;
  generateDeepIssueAnalysis: GenerateDeepAnalysisResult;
  generateDiscussionGuide: GenerateDiscussionGuideResult;
  generateGame: Game;
  generateHabitsForFamilyMember: GenerateHabitsResult;
  generateHabitsFromIssue: GenerateHabitsResult;
  generateJournalAnalysis: GenerateJournalAnalysisResult;
  generateLongFormText: GenerateLongFormTextResult;
  generateOpenAIAudio: GenerateOpenAIAudioResult;
  generateParentAdvice: GenerateParentAdviceResult;
  generateRecommendedBooks: GenerateRecommendedBooksResult;
  generateResearch: GenerateResearchResult;
  generateRoutineAnalysis: GenerateRoutineAnalysisResult;
  generateTherapeuticQuestions: GenerateQuestionsResult;
  linkContactToIssue: IssueContactLink;
  linkIssues: IssueLink;
  lockVault: VaultStatus;
  logGameCompletion: GameCompletion;
  logHabit: HabitLog;
  markTeacherFeedbackExtracted: TeacherFeedback;
  recordCognitiveBaseline: CognitiveBaseline;
  recordCognitiveCheckIn: CognitiveCheckIn;
  refreshClaimCard: ClaimCard;
  sendConversationMessage: Conversation;
  sendHealthcareChatMessage: HealthcareChatResponse;
  setMemoryBaseline: MemoryBaseline;
  setNoteVisibility: Note;
  setTagLanguage: Scalars['Boolean']['output'];
  shareFamilyMember: FamilyMemberShare;
  shareNote: NoteShare;
  unlinkContactFromIssue: UnlinkContactResult;
  unlinkGoalFamilyMember: Goal;
  unlinkIssues: UnlinkIssuesResult;
  unlockVault: VaultUnlockResult;
  unshareFamilyMember: Scalars['Boolean']['output'];
  unshareNote: Scalars['Boolean']['output'];
  updateAffirmation: Affirmation;
  updateBehaviorObservation: BehaviorObservation;
  updateContact: Contact;
  updateContactFeedback: ContactFeedback;
  updateFamilyMember: FamilyMember;
  updateGame: Game;
  updateGoal: Goal;
  updateHabit: Habit;
  updateIssue: Issue;
  updateJournalEntry: JournalEntry;
  updateNote: Note;
  updateProtocolStatus: Protocol;
  updateRelationship: Relationship;
  updateStory: Story;
  updateTeacherFeedback: TeacherFeedback;
  updateUserSettings: UserSettings;
};


export type MutationaddAllergyArgs = {
  input: AddAllergyInput;
};


export type MutationaddAppointmentArgs = {
  input: AddAppointmentInput;
};


export type MutationaddConditionArgs = {
  input: AddConditionInput;
};


export type MutationaddDoctorArgs = {
  input: AddDoctorInput;
};


export type MutationaddMedicationArgs = {
  input: AddMedicationInput;
};


export type MutationaddMemoryEntryArgs = {
  input: AddMemoryEntryInput;
};


export type MutationaddProtocolArgs = {
  input: AddProtocolInput;
};


export type MutationaddSupplementArgs = {
  input: AddSupplementInput;
  protocolId: Scalars['ID']['input'];
};


export type MutationaddSymptomArgs = {
  input: AddSymptomInput;
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


export type MutationcreateAffirmationArgs = {
  input: CreateAffirmationInput;
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


export type MutationcreateGameArgs = {
  input: CreateGameInput;
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


export type MutationdeleteAffirmationArgs = {
  id: Scalars['Int']['input'];
};


export type MutationdeleteAllergyArgs = {
  id: Scalars['ID']['input'];
};


export type MutationdeleteAppointmentArgs = {
  id: Scalars['ID']['input'];
};


export type MutationdeleteBehaviorObservationArgs = {
  id: Scalars['Int']['input'];
};


export type MutationdeleteBloodTestArgs = {
  id: Scalars['ID']['input'];
};


export type MutationdeleteClaimCardArgs = {
  id: Scalars['ID']['input'];
};


export type MutationdeleteConditionArgs = {
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


export type MutationdeleteDeepAnalysisArgs = {
  id: Scalars['Int']['input'];
};


export type MutationdeleteDeepIssueAnalysisArgs = {
  id: Scalars['Int']['input'];
};


export type MutationdeleteDiscussionGuideArgs = {
  journalEntryId: Scalars['Int']['input'];
};


export type MutationdeleteDoctorArgs = {
  id: Scalars['ID']['input'];
};


export type MutationdeleteFamilyMemberArgs = {
  id: Scalars['Int']['input'];
};


export type MutationdeleteGameArgs = {
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


export type MutationdeleteJournalAnalysisArgs = {
  journalEntryId: Scalars['Int']['input'];
};


export type MutationdeleteJournalEntryArgs = {
  id: Scalars['Int']['input'];
};


export type MutationdeleteMedicationArgs = {
  id: Scalars['ID']['input'];
};


export type MutationdeleteMemoryEntryArgs = {
  id: Scalars['ID']['input'];
};


export type MutationdeleteNoteArgs = {
  id: Scalars['Int']['input'];
};


export type MutationdeleteProtocolArgs = {
  id: Scalars['ID']['input'];
};


export type MutationdeleteRecommendedBooksArgs = {
  goalId?: InputMaybe<Scalars['Int']['input']>;
  journalEntryId?: InputMaybe<Scalars['Int']['input']>;
};


export type MutationdeleteRelationshipArgs = {
  id: Scalars['Int']['input'];
};


export type MutationdeleteResearchArgs = {
  goalId: Scalars['Int']['input'];
};


export type MutationdeleteRoutineAnalysisArgs = {
  id: Scalars['Int']['input'];
};


export type MutationdeleteStoryArgs = {
  id: Scalars['Int']['input'];
};


export type MutationdeleteSupplementArgs = {
  id: Scalars['ID']['input'];
};


export type MutationdeleteSymptomArgs = {
  id: Scalars['ID']['input'];
};


export type MutationdeleteTeacherFeedbackArgs = {
  id: Scalars['Int']['input'];
};


export type MutationdeleteTherapeuticQuestionsArgs = {
  goalId?: InputMaybe<Scalars['Int']['input']>;
  issueId?: InputMaybe<Scalars['Int']['input']>;
  journalEntryId?: InputMaybe<Scalars['Int']['input']>;
};


export type MutationextractContactFeedbackIssuesArgs = {
  id: Scalars['Int']['input'];
};


export type MutationgenerateAffirmationsForFamilyMemberArgs = {
  categoryFocus?: InputMaybe<AffirmationCategory>;
  count?: InputMaybe<Scalars['Int']['input']>;
  familyMemberId: Scalars['Int']['input'];
  language?: InputMaybe<Scalars['String']['input']>;
};


export type MutationgenerateAudioArgs = {
  goalId: Scalars['Int']['input'];
  language?: InputMaybe<Scalars['String']['input']>;
  storyId?: InputMaybe<Scalars['Int']['input']>;
  text?: InputMaybe<Scalars['String']['input']>;
  voice?: InputMaybe<Scalars['String']['input']>;
};


export type MutationgenerateDeepAnalysisArgs = {
  subjectId: Scalars['Int']['input'];
  subjectType: DeepAnalysisSubjectType;
  triggerId?: InputMaybe<Scalars['Int']['input']>;
  triggerType?: InputMaybe<DeepAnalysisTriggerType>;
};


export type MutationgenerateDeepIssueAnalysisArgs = {
  familyMemberId: Scalars['Int']['input'];
  triggerIssueId?: InputMaybe<Scalars['Int']['input']>;
};


export type MutationgenerateDiscussionGuideArgs = {
  journalEntryId: Scalars['Int']['input'];
};


export type MutationgenerateGameArgs = {
  input: GenerateGameInput;
};


export type MutationgenerateHabitsForFamilyMemberArgs = {
  count?: InputMaybe<Scalars['Int']['input']>;
  familyMemberId: Scalars['Int']['input'];
};


export type MutationgenerateHabitsFromIssueArgs = {
  count?: InputMaybe<Scalars['Int']['input']>;
  issueId: Scalars['Int']['input'];
};


export type MutationgenerateJournalAnalysisArgs = {
  journalEntryId: Scalars['Int']['input'];
};


export type MutationgenerateLongFormTextArgs = {
  familyMemberId?: InputMaybe<Scalars['Int']['input']>;
  feedbackId?: InputMaybe<Scalars['Int']['input']>;
  goalId?: InputMaybe<Scalars['Int']['input']>;
  issueId?: InputMaybe<Scalars['Int']['input']>;
  journalEntryId?: InputMaybe<Scalars['Int']['input']>;
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


export type MutationgenerateRecommendedBooksArgs = {
  goalId?: InputMaybe<Scalars['Int']['input']>;
  journalEntryId?: InputMaybe<Scalars['Int']['input']>;
};


export type MutationgenerateResearchArgs = {
  feedbackId?: InputMaybe<Scalars['Int']['input']>;
  goalId?: InputMaybe<Scalars['Int']['input']>;
  issueId?: InputMaybe<Scalars['Int']['input']>;
  journalEntryId?: InputMaybe<Scalars['Int']['input']>;
};


export type MutationgenerateRoutineAnalysisArgs = {
  familyMemberId: Scalars['Int']['input'];
};


export type MutationgenerateTherapeuticQuestionsArgs = {
  goalId?: InputMaybe<Scalars['Int']['input']>;
  issueId?: InputMaybe<Scalars['Int']['input']>;
  journalEntryId?: InputMaybe<Scalars['Int']['input']>;
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


export type MutationlogGameCompletionArgs = {
  input: LogGameCompletionInput;
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


export type MutationrecordCognitiveBaselineArgs = {
  input: CognitiveScoresInput;
  protocolId: Scalars['ID']['input'];
};


export type MutationrecordCognitiveCheckInArgs = {
  input: CognitiveCheckInInput;
  protocolId: Scalars['ID']['input'];
};


export type MutationrefreshClaimCardArgs = {
  id: Scalars['ID']['input'];
};


export type MutationsendConversationMessageArgs = {
  conversationId: Scalars['Int']['input'];
  message: Scalars['String']['input'];
};


export type MutationsendHealthcareChatMessageArgs = {
  input: HealthcareChatInput;
};


export type MutationsetMemoryBaselineArgs = {
  input: SetMemoryBaselineInput;
};


export type MutationsetNoteVisibilityArgs = {
  noteId: Scalars['Int']['input'];
  visibility: NoteVisibility;
};


export type MutationsetTagLanguageArgs = {
  language: Scalars['String']['input'];
  tag: Scalars['String']['input'];
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


export type MutationunlockVaultArgs = {
  pin: Scalars['String']['input'];
};


export type MutationunshareFamilyMemberArgs = {
  email: Scalars['String']['input'];
  familyMemberId: Scalars['Int']['input'];
};


export type MutationunshareNoteArgs = {
  email: Scalars['String']['input'];
  noteId: Scalars['Int']['input'];
};


export type MutationupdateAffirmationArgs = {
  id: Scalars['Int']['input'];
  input: UpdateAffirmationInput;
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


export type MutationupdateGameArgs = {
  id: Scalars['Int']['input'];
  input: UpdateGameInput;
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


export type MutationupdateProtocolStatusArgs = {
  id: Scalars['ID']['input'];
  status: Scalars['String']['input'];
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

export type Protocol = {
  __typename?: 'Protocol';
  createdAt: Scalars['String']['output'];
  endDate?: Maybe<Scalars['String']['output']>;
  id: Scalars['ID']['output'];
  name: Scalars['String']['output'];
  notes?: Maybe<Scalars['String']['output']>;
  slug: Scalars['String']['output'];
  startDate?: Maybe<Scalars['String']['output']>;
  status: Scalars['String']['output'];
  supplementCount: Scalars['Int']['output'];
  targetAreas: Array<Scalars['String']['output']>;
  updatedAt: Scalars['String']['output'];
  userId: Scalars['String']['output'];
};

export type ProtocolDetail = {
  __typename?: 'ProtocolDetail';
  baseline?: Maybe<CognitiveBaseline>;
  checkIns: Array<CognitiveCheckIn>;
  protocol: Protocol;
  supplements: Array<ProtocolSupplement>;
};

export type ProtocolSupplement = {
  __typename?: 'ProtocolSupplement';
  createdAt: Scalars['String']['output'];
  dosage: Scalars['String']['output'];
  frequency: Scalars['String']['output'];
  id: Scalars['ID']['output'];
  mechanism?: Maybe<Scalars['String']['output']>;
  name: Scalars['String']['output'];
  notes?: Maybe<Scalars['String']['output']>;
  protocolId: Scalars['ID']['output'];
  targetAreas: Array<Scalars['String']['output']>;
  url?: Maybe<Scalars['String']['output']>;
};

export type PublicDiscussionGuideResult = {
  __typename?: 'PublicDiscussionGuideResult';
  entryTitle?: Maybe<Scalars['String']['output']>;
  familyMemberName?: Maybe<Scalars['String']['output']>;
  guide?: Maybe<DiscussionGuide>;
};

export type Query = {
  __typename?: 'Query';
  affirmation?: Maybe<Affirmation>;
  affirmations: Array<Affirmation>;
  allIssues: Array<Issue>;
  allNotes: Array<Note>;
  allRecommendedBooks: Array<RecommendedBook>;
  allStories: Array<Story>;
  allTags: Array<Scalars['String']['output']>;
  allergies: Array<Allergy>;
  appointments: Array<Appointment>;
  audioFromR2?: Maybe<AudioFromR2Result>;
  behaviorObservation?: Maybe<BehaviorObservation>;
  behaviorObservations: Array<BehaviorObservation>;
  bloodTests: Array<BloodTest>;
  bogdanDiscussions: Array<BogdanDiscussionGuide>;
  claimCard?: Maybe<ClaimCard>;
  claimCardsForNote: Array<ClaimCard>;
  condition?: Maybe<Condition>;
  conditions: Array<Condition>;
  contact?: Maybe<Contact>;
  contactFeedback?: Maybe<ContactFeedback>;
  contactFeedbacks: Array<ContactFeedback>;
  contacts: Array<Contact>;
  conversation?: Maybe<Conversation>;
  conversationsForIssue: Array<Conversation>;
  deepAnalyses: Array<DeepAnalysis>;
  deepAnalysis?: Maybe<DeepAnalysis>;
  deepIssueAnalyses: Array<DeepIssueAnalysis>;
  deepIssueAnalysis?: Maybe<DeepIssueAnalysis>;
  doctors: Array<Doctor>;
  familyMember?: Maybe<FamilyMember>;
  familyMembers: Array<FamilyMember>;
  game?: Maybe<Game>;
  gameCompletions: Array<GameCompletion>;
  games: Array<Game>;
  generationJob?: Maybe<GenerationJob>;
  generationJobs: Array<GenerationJob>;
  goal?: Maybe<Goal>;
  goals: Array<Goal>;
  habit?: Maybe<Habit>;
  habits: Array<Habit>;
  healthcareMarkerTrend: Array<HealthcareMarkerTrendHit>;
  healthcareSearch: HealthcareMultiSearchResult;
  healthcareSummary: HealthcareSummary;
  issue?: Maybe<Issue>;
  issues: Array<Issue>;
  journalEntries: Array<JournalEntry>;
  journalEntry?: Maybe<JournalEntry>;
  latestBogdanDiscussion?: Maybe<BogdanDiscussionGuide>;
  medications: Array<Medication>;
  memoryBaseline?: Maybe<MemoryBaseline>;
  memoryEntries: Array<MemoryEntry>;
  mySharedFamilyMembers: Array<FamilyMember>;
  mySharedNotes: Array<Note>;
  note?: Maybe<Note>;
  notes: Array<Note>;
  protocol?: Maybe<ProtocolDetail>;
  protocols: Array<Protocol>;
  publicDiscussionGuide?: Maybe<PublicDiscussionGuideResult>;
  recommendedBooks: Array<RecommendedBook>;
  relationship?: Maybe<Relationship>;
  relationships: Array<Relationship>;
  research: Array<Research>;
  routineAnalyses: Array<RoutineAnalysis>;
  routineAnalysis?: Maybe<RoutineAnalysis>;
  stories: Array<Story>;
  story?: Maybe<Story>;
  symptoms: Array<Symptom>;
  tagLanguage?: Maybe<Scalars['String']['output']>;
  teacherFeedback?: Maybe<TeacherFeedback>;
  teacherFeedbacks: Array<TeacherFeedback>;
  therapeuticQuestions: Array<TherapeuticQuestion>;
  userSettings: UserSettings;
  vaultStatus: VaultStatus;
};


export type QueryaffirmationArgs = {
  id: Scalars['Int']['input'];
};


export type QueryaffirmationsArgs = {
  familyMemberId: Scalars['Int']['input'];
};


export type QueryallRecommendedBooksArgs = {
  category?: InputMaybe<Scalars['String']['input']>;
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


export type QueryconditionArgs = {
  id: Scalars['ID']['input'];
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


export type QuerydeepAnalysesArgs = {
  subjectId: Scalars['Int']['input'];
  subjectType: DeepAnalysisSubjectType;
};


export type QuerydeepAnalysisArgs = {
  id: Scalars['Int']['input'];
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


export type QuerygameArgs = {
  id: Scalars['Int']['input'];
};


export type QuerygameCompletionsArgs = {
  gameId: Scalars['Int']['input'];
};


export type QuerygamesArgs = {
  familyMemberId?: InputMaybe<Scalars['Int']['input']>;
  goalId?: InputMaybe<Scalars['Int']['input']>;
  issueId?: InputMaybe<Scalars['Int']['input']>;
  type?: InputMaybe<GameType>;
};


export type QuerygenerationJobArgs = {
  id: Scalars['String']['input'];
};


export type QuerygenerationJobsArgs = {
  goalId?: InputMaybe<Scalars['Int']['input']>;
  status?: InputMaybe<Scalars['String']['input']>;
  type?: InputMaybe<Scalars['String']['input']>;
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


export type QueryhealthcareMarkerTrendArgs = {
  markerName?: InputMaybe<Scalars['String']['input']>;
  query: Scalars['String']['input'];
};


export type QueryhealthcareSearchArgs = {
  query: Scalars['String']['input'];
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


export type QueryprotocolArgs = {
  slug: Scalars['String']['input'];
};


export type QuerypublicDiscussionGuideArgs = {
  journalEntryId: Scalars['Int']['input'];
};


export type QueryrecommendedBooksArgs = {
  goalId?: InputMaybe<Scalars['Int']['input']>;
  journalEntryId?: InputMaybe<Scalars['Int']['input']>;
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
  journalEntryId?: InputMaybe<Scalars['Int']['input']>;
};


export type QueryroutineAnalysesArgs = {
  familyMemberId: Scalars['Int']['input'];
};


export type QueryroutineAnalysisArgs = {
  id: Scalars['Int']['input'];
};


export type QuerystoriesArgs = {
  goalId: Scalars['Int']['input'];
};


export type QuerystoryArgs = {
  id: Scalars['Int']['input'];
};


export type QuerytagLanguageArgs = {
  tag: Scalars['String']['input'];
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
  journalEntryId?: InputMaybe<Scalars['Int']['input']>;
};

export type RecommendedBook = {
  __typename?: 'RecommendedBook';
  amazonUrl?: Maybe<Scalars['String']['output']>;
  authors: Array<Scalars['String']['output']>;
  category: Scalars['String']['output'];
  createdAt: Scalars['String']['output'];
  description: Scalars['String']['output'];
  generatedAt: Scalars['String']['output'];
  goalId?: Maybe<Scalars['Int']['output']>;
  id: Scalars['Int']['output'];
  isbn?: Maybe<Scalars['String']['output']>;
  journalEntryId?: Maybe<Scalars['Int']['output']>;
  title: Scalars['String']['output'];
  updatedAt: Scalars['String']['output'];
  whyRecommended: Scalars['String']['output'];
  year?: Maybe<Scalars['Int']['output']>;
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
  journalEntryId?: Maybe<Scalars['Int']['output']>;
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

export type RoutineAnalysis = {
  __typename?: 'RoutineAnalysis';
  adherencePatterns: Array<HabitAdherence>;
  createdAt: Scalars['String']['output'];
  createdBy: Scalars['String']['output'];
  dataSnapshot: RoutineDataSnapshot;
  familyMember?: Maybe<FamilyMember>;
  familyMemberId: Scalars['Int']['output'];
  gaps: Array<RoutineGap>;
  id: Scalars['Int']['output'];
  jobId?: Maybe<Scalars['String']['output']>;
  model: Scalars['String']['output'];
  optimizationSuggestions: Array<RoutineOptimization>;
  researchRelevance: Array<RoutineResearchMapping>;
  routineBalance: RoutineBalance;
  streaks: StreakSummary;
  summary: Scalars['String']['output'];
  updatedAt: Scalars['String']['output'];
};

export type RoutineBalance = {
  __typename?: 'RoutineBalance';
  domainsCovered: Array<Scalars['String']['output']>;
  domainsMissing: Array<Scalars['String']['output']>;
  overEmphasized: Array<Scalars['String']['output']>;
  underEmphasized: Array<Scalars['String']['output']>;
  verdict: Scalars['String']['output'];
};

export type RoutineDataSnapshot = {
  __typename?: 'RoutineDataSnapshot';
  activeDailyCount: Scalars['Int']['output'];
  activeWeeklyCount: Scalars['Int']['output'];
  contactFeedbackCount?: Maybe<Scalars['Int']['output']>;
  habitsCount: Scalars['Int']['output'];
  issueCount?: Maybe<Scalars['Int']['output']>;
  journalEntryCount?: Maybe<Scalars['Int']['output']>;
  linkedGoalCount: Scalars['Int']['output'];
  linkedIssueCount: Scalars['Int']['output'];
  logCount: Scalars['Int']['output'];
  narrowTherapyHabitsCount?: Maybe<Scalars['Int']['output']>;
  observationCount?: Maybe<Scalars['Int']['output']>;
  overallAdherence: Scalars['Float']['output'];
  researchPaperCount: Scalars['Int']['output'];
  teacherFeedbackCount?: Maybe<Scalars['Int']['output']>;
  windowDays: Scalars['Int']['output'];
};

export type RoutineGap = {
  __typename?: 'RoutineGap';
  area: Scalars['String']['output'];
  rationale: Scalars['String']['output'];
  severity: Scalars['String']['output'];
};

export type RoutineOptimization = {
  __typename?: 'RoutineOptimization';
  ageAppropriate: Scalars['Boolean']['output'];
  changeType: Scalars['String']['output'];
  concreteSteps: Array<Scalars['String']['output']>;
  developmentalContext?: Maybe<Scalars['String']['output']>;
  priority: Scalars['String']['output'];
  rationale: Scalars['String']['output'];
  suggestedFrequency?: Maybe<Scalars['String']['output']>;
  suggestedTargetCount?: Maybe<Scalars['Int']['output']>;
  targetHabitId?: Maybe<Scalars['Int']['output']>;
  title: Scalars['String']['output'];
};

export type RoutineResearchMapping = {
  __typename?: 'RoutineResearchMapping';
  coverageGaps: Array<Scalars['String']['output']>;
  relevantResearchIds: Array<Scalars['Int']['output']>;
  relevantResearchTitles: Array<Scalars['String']['output']>;
  topic: Scalars['String']['output'];
};

export type SetMemoryBaselineInput = {
  longTermScore?: InputMaybe<Scalars['Float']['input']>;
  overallScore?: InputMaybe<Scalars['Float']['input']>;
  recallSpeed?: InputMaybe<Scalars['Float']['input']>;
  shortTermScore?: InputMaybe<Scalars['Float']['input']>;
  workingMemoryScore?: InputMaybe<Scalars['Float']['input']>;
};

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

export type StreakSummary = {
  __typename?: 'StreakSummary';
  momentum: Scalars['String']['output'];
  strongestHabitId?: Maybe<Scalars['Int']['output']>;
  strongestStreak: Scalars['Int']['output'];
  weakestHabitId?: Maybe<Scalars['Int']['output']>;
  weakestStreak: Scalars['Int']['output'];
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

export type Symptom = {
  __typename?: 'Symptom';
  createdAt: Scalars['String']['output'];
  description: Scalars['String']['output'];
  id: Scalars['ID']['output'];
  loggedAt: Scalars['String']['output'];
  severity?: Maybe<Scalars['String']['output']>;
  userId: Scalars['String']['output'];
};

export type TalkingPoint = {
  __typename?: 'TalkingPoint';
  citations?: Maybe<Array<Citation>>;
  explanation: Scalars['String']['output'];
  microScript?: Maybe<MicroScript>;
  point: Scalars['String']['output'];
  relatedResearchIds?: Maybe<Array<Scalars['Int']['output']>>;
  researchBacking?: Maybe<Scalars['String']['output']>;
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

export type TherapeuticInsight = {
  __typename?: 'TherapeuticInsight';
  clinicalRelevance: Scalars['String']['output'];
  observation: Scalars['String']['output'];
  relatedResearchIds?: Maybe<Array<Scalars['Int']['output']>>;
  title: Scalars['String']['output'];
};

export type TherapeuticQuestion = {
  __typename?: 'TherapeuticQuestion';
  createdAt: Scalars['String']['output'];
  generatedAt: Scalars['String']['output'];
  goalId?: Maybe<Scalars['Int']['output']>;
  id: Scalars['Int']['output'];
  issueId?: Maybe<Scalars['Int']['output']>;
  journalEntryId?: Maybe<Scalars['Int']['output']>;
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

export type UpdateAffirmationInput = {
  category?: InputMaybe<AffirmationCategory>;
  isActive?: InputMaybe<Scalars['Boolean']['input']>;
  text?: InputMaybe<Scalars['String']['input']>;
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
  allergies?: InputMaybe<Scalars['String']['input']>;
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

export type UpdateGameInput = {
  content?: InputMaybe<Scalars['String']['input']>;
  description?: InputMaybe<Scalars['String']['input']>;
  estimatedMinutes?: InputMaybe<Scalars['Int']['input']>;
  language?: InputMaybe<Scalars['String']['input']>;
  title?: InputMaybe<Scalars['String']['input']>;
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
  isVault?: InputMaybe<Scalars['Boolean']['input']>;
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

export type VaultStatus = {
  __typename?: 'VaultStatus';
  available: Scalars['Boolean']['output'];
  unlocked: Scalars['Boolean']['output'];
};

export type VaultUnlockResult = {
  __typename?: 'VaultUnlockResult';
  message?: Maybe<Scalars['String']['output']>;
  success: Scalars['Boolean']['output'];
  unlocked: Scalars['Boolean']['output'];
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
  ActionableRecommendation: ResolverTypeWrapper<ActionableRecommendation>;
  String: ResolverTypeWrapper<Scalars['String']['output']>;
  Int: ResolverTypeWrapper<Scalars['Int']['output']>;
  AddAllergyInput: AddAllergyInput;
  AddAppointmentInput: AddAppointmentInput;
  ID: ResolverTypeWrapper<Scalars['ID']['output']>;
  AddConditionInput: AddConditionInput;
  AddDoctorInput: AddDoctorInput;
  AddMedicationInput: AddMedicationInput;
  AddMemoryEntryInput: AddMemoryEntryInput;
  Float: ResolverTypeWrapper<Scalars['Float']['output']>;
  AddProtocolInput: AddProtocolInput;
  AddSupplementInput: AddSupplementInput;
  AddSymptomInput: AddSymptomInput;
  Affirmation: ResolverTypeWrapper<Omit<Affirmation, 'category'> & { category: ResolversTypes['AffirmationCategory'] }>;
  Boolean: ResolverTypeWrapper<Scalars['Boolean']['output']>;
  AffirmationCategory: ResolverTypeWrapper<'GRATITUDE' | 'STRENGTH' | 'ENCOURAGEMENT' | 'GROWTH' | 'SELF_WORTH'>;
  Allergy: ResolverTypeWrapper<Omit<Allergy, 'familyMember' | 'kind'> & { familyMember?: Maybe<ResolversTypes['FamilyMember']>, kind: ResolversTypes['AllergyKind'] }>;
  AllergyKind: ResolverTypeWrapper<'allergy' | 'intolerance'>;
  AnticipatedReaction: ResolverTypeWrapper<AnticipatedReaction>;
  Appointment: ResolverTypeWrapper<Appointment>;
  AudioAsset: ResolverTypeWrapper<AudioAsset>;
  AudioFromR2Result: ResolverTypeWrapper<AudioFromR2Result>;
  AudioManifest: ResolverTypeWrapper<AudioManifest>;
  AudioMetadata: ResolverTypeWrapper<AudioMetadata>;
  AudioSegmentInfo: ResolverTypeWrapper<AudioSegmentInfo>;
  BehaviorIntensity: ResolverTypeWrapper<'LOW' | 'MEDIUM' | 'HIGH'>;
  BehaviorObservation: ResolverTypeWrapper<Omit<BehaviorObservation, 'familyMember' | 'goal' | 'intensity' | 'observationType'> & { familyMember?: Maybe<ResolversTypes['FamilyMember']>, goal?: Maybe<ResolversTypes['Goal']>, intensity?: Maybe<ResolversTypes['BehaviorIntensity']>, observationType: ResolversTypes['BehaviorObservationType'] }>;
  BehaviorObservationType: ResolverTypeWrapper<'REFUSAL' | 'TARGET_OCCURRED' | 'AVOIDANCE' | 'PARTIAL'>;
  BloodTest: ResolverTypeWrapper<BloodTest>;
  BogdanDiscussionGuide: ResolverTypeWrapper<BogdanDiscussionGuide>;
  BuildClaimCardsInput: BuildClaimCardsInput;
  BuildClaimCardsResult: ResolverTypeWrapper<Omit<BuildClaimCardsResult, 'cards'> & { cards: Array<ResolversTypes['ClaimCard']> }>;
  CheckNoteClaimsInput: CheckNoteClaimsInput;
  CheckNoteClaimsResult: ResolverTypeWrapper<Omit<CheckNoteClaimsResult, 'cards'> & { cards: Array<ResolversTypes['ClaimCard']> }>;
  Citation: ResolverTypeWrapper<Citation>;
  ClaimCard: ResolverTypeWrapper<Omit<ClaimCard, 'evidence' | 'verdict'> & { evidence: Array<ResolversTypes['EvidenceItem']>, verdict: ResolversTypes['ClaimVerdict'] }>;
  ClaimProvenance: ResolverTypeWrapper<ClaimProvenance>;
  ClaimScope: ResolverTypeWrapper<ClaimScope>;
  ClaimVerdict: ResolverTypeWrapper<'CONTRADICTED' | 'INSUFFICIENT' | 'MIXED' | 'SUPPORTED' | 'UNVERIFIED'>;
  CognitiveBaseline: ResolverTypeWrapper<CognitiveBaseline>;
  CognitiveCheckIn: ResolverTypeWrapper<CognitiveCheckIn>;
  CognitiveCheckInInput: CognitiveCheckInInput;
  CognitiveScoresInput: CognitiveScoresInput;
  Condition: ResolverTypeWrapper<Omit<Condition, 'familyMember'> & { familyMember?: Maybe<ResolversTypes['FamilyMember']> }>;
  Contact: ResolverTypeWrapper<Contact>;
  ContactFeedback: ResolverTypeWrapper<Omit<ContactFeedback, 'familyMember' | 'issues' | 'source' | 'stories'> & { familyMember?: Maybe<ResolversTypes['FamilyMember']>, issues: Array<ResolversTypes['Issue']>, source?: Maybe<ResolversTypes['FeedbackSource']>, stories: Array<ResolversTypes['Story']> }>;
  Conversation: ResolverTypeWrapper<Conversation>;
  ConversationMessage: ResolverTypeWrapper<ConversationMessage>;
  ConversationStarter: ResolverTypeWrapper<ConversationStarter>;
  ConvertJournalEntryToIssueInput: ConvertJournalEntryToIssueInput;
  CreateAffirmationInput: CreateAffirmationInput;
  CreateContactFeedbackInput: CreateContactFeedbackInput;
  CreateContactInput: CreateContactInput;
  CreateFamilyMemberInput: CreateFamilyMemberInput;
  CreateGameInput: CreateGameInput;
  CreateGoalInput: CreateGoalInput;
  CreateHabitInput: CreateHabitInput;
  CreateIssueInput: CreateIssueInput;
  CreateJournalEntryInput: CreateJournalEntryInput;
  CreateNoteInput: CreateNoteInput;
  CreateRelationshipInput: CreateRelationshipInput;
  CreateStoryInput: CreateStoryInput;
  CreateSubGoalInput: CreateSubGoalInput;
  CreateTeacherFeedbackInput: CreateTeacherFeedbackInput;
  CritiqueScores: ResolverTypeWrapper<CritiqueScores>;
  DataSnapshot: ResolverTypeWrapper<DataSnapshot>;
  DeepAnalysis: ResolverTypeWrapper<Omit<DeepAnalysis, 'familyMember' | 'goal' | 'journalEntry' | 'note' | 'subjectType' | 'triggerType'> & { familyMember?: Maybe<ResolversTypes['FamilyMember']>, goal?: Maybe<ResolversTypes['Goal']>, journalEntry?: Maybe<ResolversTypes['JournalEntry']>, note?: Maybe<ResolversTypes['Note']>, subjectType: ResolversTypes['DeepAnalysisSubjectType'], triggerType?: Maybe<ResolversTypes['DeepAnalysisTriggerType']> }>;
  DeepAnalysisSubjectType: ResolverTypeWrapper<'GOAL' | 'NOTE' | 'JOURNAL_ENTRY' | 'FAMILY_MEMBER'>;
  DeepAnalysisTriggerType: ResolverTypeWrapper<'ISSUE' | 'OBSERVATION' | 'FEEDBACK'>;
  DeepIssueAnalysis: ResolverTypeWrapper<Omit<DeepIssueAnalysis, 'familyMember' | 'triggerIssue'> & { familyMember?: Maybe<ResolversTypes['FamilyMember']>, triggerIssue?: Maybe<ResolversTypes['Issue']> }>;
  DeleteAffirmationResult: ResolverTypeWrapper<DeleteAffirmationResult>;
  DeleteAllergyResult: ResolverTypeWrapper<DeleteAllergyResult>;
  DeleteAppointmentResult: ResolverTypeWrapper<DeleteAppointmentResult>;
  DeleteBehaviorObservationResult: ResolverTypeWrapper<DeleteBehaviorObservationResult>;
  DeleteBloodTestResult: ResolverTypeWrapper<DeleteBloodTestResult>;
  DeleteConditionResult: ResolverTypeWrapper<DeleteConditionResult>;
  DeleteContactFeedbackResult: ResolverTypeWrapper<DeleteContactFeedbackResult>;
  DeleteContactResult: ResolverTypeWrapper<DeleteContactResult>;
  DeleteConversationResult: ResolverTypeWrapper<DeleteConversationResult>;
  DeleteDeepAnalysisResult: ResolverTypeWrapper<DeleteDeepAnalysisResult>;
  DeleteDiscussionGuideResult: ResolverTypeWrapper<DeleteDiscussionGuideResult>;
  DeleteDoctorResult: ResolverTypeWrapper<DeleteDoctorResult>;
  DeleteFamilyMemberResult: ResolverTypeWrapper<DeleteFamilyMemberResult>;
  DeleteGameResult: ResolverTypeWrapper<DeleteGameResult>;
  DeleteGoalResult: ResolverTypeWrapper<DeleteGoalResult>;
  DeleteHabitResult: ResolverTypeWrapper<DeleteHabitResult>;
  DeleteIssueResult: ResolverTypeWrapper<DeleteIssueResult>;
  DeleteIssueScreenshotResult: ResolverTypeWrapper<DeleteIssueScreenshotResult>;
  DeleteJournalAnalysisResult: ResolverTypeWrapper<DeleteJournalAnalysisResult>;
  DeleteJournalEntryResult: ResolverTypeWrapper<DeleteJournalEntryResult>;
  DeleteMedicationResult: ResolverTypeWrapper<DeleteMedicationResult>;
  DeleteMemoryEntryResult: ResolverTypeWrapper<DeleteMemoryEntryResult>;
  DeleteNoteResult: ResolverTypeWrapper<DeleteNoteResult>;
  DeleteProtocolResult: ResolverTypeWrapper<DeleteProtocolResult>;
  DeleteQuestionsResult: ResolverTypeWrapper<DeleteQuestionsResult>;
  DeleteRecommendedBooksResult: ResolverTypeWrapper<DeleteRecommendedBooksResult>;
  DeleteRelationshipResult: ResolverTypeWrapper<DeleteRelationshipResult>;
  DeleteResearchResult: ResolverTypeWrapper<DeleteResearchResult>;
  DeleteRoutineAnalysisResult: ResolverTypeWrapper<DeleteRoutineAnalysisResult>;
  DeleteStoryResult: ResolverTypeWrapper<DeleteStoryResult>;
  DeleteSupplementResult: ResolverTypeWrapper<DeleteSupplementResult>;
  DeleteSymptomResult: ResolverTypeWrapper<DeleteSymptomResult>;
  DeleteTeacherFeedbackResult: ResolverTypeWrapper<DeleteTeacherFeedbackResult>;
  DevelopmentalContext: ResolverTypeWrapper<DevelopmentalContext>;
  DevelopmentalTier: ResolverTypeWrapper<'EARLY_CHILDHOOD' | 'MIDDLE_CHILDHOOD' | 'EARLY_ADOLESCENCE' | 'LATE_ADOLESCENCE' | 'ADULT'>;
  DiscussionGuide: ResolverTypeWrapper<DiscussionGuide>;
  DiscussionGuideCritique: ResolverTypeWrapper<DiscussionGuideCritique>;
  Doctor: ResolverTypeWrapper<Doctor>;
  EmotionalLandscape: ResolverTypeWrapper<EmotionalLandscape>;
  EvidenceItem: ResolverTypeWrapper<Omit<EvidenceItem, 'polarity'> & { polarity: ResolversTypes['EvidencePolarity'] }>;
  EvidenceLocator: ResolverTypeWrapper<EvidenceLocator>;
  EvidencePolarity: ResolverTypeWrapper<'CONTRADICTS' | 'IRRELEVANT' | 'MIXED' | 'SUPPORTS'>;
  ExtractedIssue: ResolverTypeWrapper<ExtractedIssue>;
  FamilyMember: ResolverTypeWrapper<Omit<FamilyMember, 'affirmations' | 'behaviorObservations' | 'goals' | 'issues' | 'relationships' | 'shares' | 'teacherFeedbacks'> & { affirmations: Array<ResolversTypes['Affirmation']>, behaviorObservations: Array<ResolversTypes['BehaviorObservation']>, goals: Array<ResolversTypes['Goal']>, issues: Array<ResolversTypes['Issue']>, relationships: Array<ResolversTypes['Relationship']>, shares: Array<ResolversTypes['FamilyMemberShare']>, teacherFeedbacks: Array<ResolversTypes['TeacherFeedback']> }>;
  FamilyMemberShare: ResolverTypeWrapper<Omit<FamilyMemberShare, 'role'> & { role: ResolversTypes['FamilyMemberShareRole'] }>;
  FamilyMemberShareRole: ResolverTypeWrapper<'EDITOR'>;
  FamilySystemInsight: ResolverTypeWrapper<FamilySystemInsight>;
  FeedbackSource: ResolverTypeWrapper<'EMAIL' | 'MEETING' | 'REPORT' | 'PHONE' | 'NOTE' | 'OTHER'>;
  FollowUpStep: ResolverTypeWrapper<FollowUpStep>;
  Game: ResolverTypeWrapper<Omit<Game, 'goal' | 'issue' | 'source' | 'type'> & { goal?: Maybe<ResolversTypes['Goal']>, issue?: Maybe<ResolversTypes['Issue']>, source: ResolversTypes['GameSource'], type: ResolversTypes['GameType'] }>;
  GameCompletion: ResolverTypeWrapper<GameCompletion>;
  GameSource: ResolverTypeWrapper<'SEED' | 'USER' | 'AI'>;
  GameType: ResolverTypeWrapper<'CBT_REFRAME' | 'MINDFULNESS' | 'JOURNAL_PROMPT'>;
  GenerateAffirmationsResult: ResolverTypeWrapper<Omit<GenerateAffirmationsResult, 'affirmations'> & { affirmations: Array<ResolversTypes['Affirmation']> }>;
  GenerateAudioResult: ResolverTypeWrapper<GenerateAudioResult>;
  GenerateBogdanDiscussionResult: ResolverTypeWrapper<GenerateBogdanDiscussionResult>;
  GenerateDeepAnalysisResult: ResolverTypeWrapper<GenerateDeepAnalysisResult>;
  GenerateDiscussionGuideResult: ResolverTypeWrapper<GenerateDiscussionGuideResult>;
  GenerateGameInput: GenerateGameInput;
  GenerateHabitsResult: ResolverTypeWrapper<Omit<GenerateHabitsResult, 'habits'> & { habits?: Maybe<Array<ResolversTypes['Habit']>> }>;
  GenerateJournalAnalysisResult: ResolverTypeWrapper<GenerateJournalAnalysisResult>;
  GenerateLongFormTextResult: ResolverTypeWrapper<GenerateLongFormTextResult>;
  GenerateOpenAIAudioInput: GenerateOpenAIAudioInput;
  GenerateOpenAIAudioResult: ResolverTypeWrapper<GenerateOpenAIAudioResult>;
  GenerateParentAdviceResult: ResolverTypeWrapper<GenerateParentAdviceResult>;
  GenerateQuestionsResult: ResolverTypeWrapper<GenerateQuestionsResult>;
  GenerateRecommendedBooksResult: ResolverTypeWrapper<GenerateRecommendedBooksResult>;
  GenerateResearchResult: ResolverTypeWrapper<GenerateResearchResult>;
  GenerateRoutineAnalysisResult: ResolverTypeWrapper<GenerateRoutineAnalysisResult>;
  GenerationJob: ResolverTypeWrapper<Omit<GenerationJob, 'status' | 'type'> & { status: ResolversTypes['JobStatus'], type: ResolversTypes['JobType'] }>;
  Goal: ResolverTypeWrapper<Omit<Goal, 'familyMember' | 'notes' | 'parentGoal' | 'research' | 'stories' | 'subGoals'> & { familyMember?: Maybe<ResolversTypes['FamilyMember']>, notes: Array<ResolversTypes['Note']>, parentGoal?: Maybe<ResolversTypes['Goal']>, research: Array<ResolversTypes['Research']>, stories: Array<ResolversTypes['Story']>, subGoals: Array<ResolversTypes['Goal']> }>;
  Habit: ResolverTypeWrapper<Omit<Habit, 'frequency' | 'status'> & { frequency: ResolversTypes['HabitFrequency'], status: ResolversTypes['HabitStatus'] }>;
  HabitAdherence: ResolverTypeWrapper<HabitAdherence>;
  HabitFrequency: ResolverTypeWrapper<'DAILY' | 'WEEKLY'>;
  HabitLog: ResolverTypeWrapper<HabitLog>;
  HabitStatus: ResolverTypeWrapper<'ACTIVE' | 'PAUSED' | 'ARCHIVED'>;
  HealthcareChatInput: HealthcareChatInput;
  HealthcareChatResponse: ResolverTypeWrapper<HealthcareChatResponse>;
  HealthcareChatTurn: HealthcareChatTurn;
  HealthcareMarkerTrendHit: ResolverTypeWrapper<HealthcareMarkerTrendHit>;
  HealthcareMultiSearchResult: ResolverTypeWrapper<HealthcareMultiSearchResult>;
  HealthcareSearchHit: ResolverTypeWrapper<HealthcareSearchHit>;
  HealthcareSearchMarkerHit: ResolverTypeWrapper<HealthcareSearchMarkerHit>;
  HealthcareSearchTestHit: ResolverTypeWrapper<HealthcareSearchTestHit>;
  HealthcareSummary: ResolverTypeWrapper<HealthcareSummary>;
  Issue: ResolverTypeWrapper<Omit<Issue, 'familyMember' | 'feedback' | 'journalEntry' | 'relatedFamilyMember' | 'relatedIssues' | 'stories'> & { familyMember?: Maybe<ResolversTypes['FamilyMember']>, feedback?: Maybe<ResolversTypes['ContactFeedback']>, journalEntry?: Maybe<ResolversTypes['JournalEntry']>, relatedFamilyMember?: Maybe<ResolversTypes['FamilyMember']>, relatedIssues: Array<ResolversTypes['IssueLink']>, stories: Array<ResolversTypes['Story']> }>;
  IssueContactLink: ResolverTypeWrapper<IssueContactLink>;
  IssueLink: ResolverTypeWrapper<Omit<IssueLink, 'issue'> & { issue: ResolversTypes['Issue'] }>;
  IssueScreenshot: ResolverTypeWrapper<IssueScreenshot>;
  JobError: ResolverTypeWrapper<JobError>;
  JobResult: ResolverTypeWrapper<JobResult>;
  JobStatus: ResolverTypeWrapper<'RUNNING' | 'SUCCEEDED' | 'FAILED'>;
  JobType: ResolverTypeWrapper<'AUDIO' | 'RESEARCH' | 'QUESTIONS' | 'LONGFORM' | 'DEEP_ANALYSIS' | 'RECOMMENDED_BOOKS' | 'ROUTINE_ANALYSIS'>;
  JournalAnalysis: ResolverTypeWrapper<JournalAnalysis>;
  JournalEntry: ResolverTypeWrapper<Omit<JournalEntry, 'familyMember' | 'goal' | 'issue'> & { familyMember?: Maybe<ResolversTypes['FamilyMember']>, goal?: Maybe<ResolversTypes['Goal']>, issue?: Maybe<ResolversTypes['Issue']> }>;
  LanguageExample: ResolverTypeWrapper<LanguageExample>;
  LanguageGuide: ResolverTypeWrapper<LanguageGuide>;
  LogGameCompletionInput: LogGameCompletionInput;
  Medication: ResolverTypeWrapper<Omit<Medication, 'familyMember'> & { familyMember?: Maybe<ResolversTypes['FamilyMember']> }>;
  MemoryBaseline: ResolverTypeWrapper<MemoryBaseline>;
  MemoryEntry: ResolverTypeWrapper<MemoryEntry>;
  MicroScript: ResolverTypeWrapper<MicroScript>;
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
  Protocol: ResolverTypeWrapper<Protocol>;
  ProtocolDetail: ResolverTypeWrapper<ProtocolDetail>;
  ProtocolSupplement: ResolverTypeWrapper<ProtocolSupplement>;
  PublicDiscussionGuideResult: ResolverTypeWrapper<PublicDiscussionGuideResult>;
  Query: ResolverTypeWrapper<Record<PropertyKey, never>>;
  RecommendedBook: ResolverTypeWrapper<RecommendedBook>;
  Relationship: ResolverTypeWrapper<Omit<Relationship, 'related' | 'relatedType' | 'status' | 'subject' | 'subjectType'> & { related?: Maybe<ResolversTypes['RelationshipPerson']>, relatedType: ResolversTypes['PersonType'], status: ResolversTypes['RelationshipStatus'], subject?: Maybe<ResolversTypes['RelationshipPerson']>, subjectType: ResolversTypes['PersonType'] }>;
  RelationshipPerson: ResolverTypeWrapper<Omit<RelationshipPerson, 'type'> & { type: ResolversTypes['PersonType'] }>;
  RelationshipStatus: ResolverTypeWrapper<'ACTIVE' | 'ENDED'>;
  Research: ResolverTypeWrapper<Omit<Research, 'goal'> & { goal?: Maybe<ResolversTypes['Goal']> }>;
  ResearchRelevanceMapping: ResolverTypeWrapper<ResearchRelevanceMapping>;
  ResearchSource: ResolverTypeWrapper<'ARXIV' | 'CROSSREF' | 'DATACITE' | 'EUROPEPMC' | 'OPENALEX' | 'PUBMED' | 'SEMANTIC_SCHOLAR'>;
  RoutineAnalysis: ResolverTypeWrapper<Omit<RoutineAnalysis, 'familyMember'> & { familyMember?: Maybe<ResolversTypes['FamilyMember']> }>;
  RoutineBalance: ResolverTypeWrapper<RoutineBalance>;
  RoutineDataSnapshot: ResolverTypeWrapper<RoutineDataSnapshot>;
  RoutineGap: ResolverTypeWrapper<RoutineGap>;
  RoutineOptimization: ResolverTypeWrapper<RoutineOptimization>;
  RoutineResearchMapping: ResolverTypeWrapper<RoutineResearchMapping>;
  SetMemoryBaselineInput: SetMemoryBaselineInput;
  Story: ResolverTypeWrapper<Omit<Story, 'goal' | 'issue'> & { goal?: Maybe<ResolversTypes['Goal']>, issue?: Maybe<ResolversTypes['Issue']> }>;
  StreakSummary: ResolverTypeWrapper<StreakSummary>;
  Subscription: ResolverTypeWrapper<Record<PropertyKey, never>>;
  Symptom: ResolverTypeWrapper<Symptom>;
  TalkingPoint: ResolverTypeWrapper<TalkingPoint>;
  TeacherFeedback: ResolverTypeWrapper<Omit<TeacherFeedback, 'familyMember' | 'source'> & { familyMember?: Maybe<ResolversTypes['FamilyMember']>, source?: Maybe<ResolversTypes['FeedbackSource']> }>;
  TextSegment: ResolverTypeWrapper<TextSegment>;
  TherapeuticInsight: ResolverTypeWrapper<TherapeuticInsight>;
  TherapeuticQuestion: ResolverTypeWrapper<TherapeuticQuestion>;
  TimelineAnalysis: ResolverTypeWrapper<TimelineAnalysis>;
  TimelinePhase: ResolverTypeWrapper<TimelinePhase>;
  UnlinkContactResult: ResolverTypeWrapper<UnlinkContactResult>;
  UnlinkIssuesResult: ResolverTypeWrapper<UnlinkIssuesResult>;
  UpdateAffirmationInput: UpdateAffirmationInput;
  UpdateBehaviorObservationInput: UpdateBehaviorObservationInput;
  UpdateContactFeedbackInput: UpdateContactFeedbackInput;
  UpdateContactInput: UpdateContactInput;
  UpdateFamilyMemberInput: UpdateFamilyMemberInput;
  UpdateGameInput: UpdateGameInput;
  UpdateGoalInput: UpdateGoalInput;
  UpdateHabitInput: UpdateHabitInput;
  UpdateIssueInput: UpdateIssueInput;
  UpdateJournalEntryInput: UpdateJournalEntryInput;
  UpdateNoteInput: UpdateNoteInput;
  UpdateRelationshipInput: UpdateRelationshipInput;
  UpdateStoryInput: UpdateStoryInput;
  UpdateTeacherFeedbackInput: UpdateTeacherFeedbackInput;
  UserSettings: ResolverTypeWrapper<UserSettings>;
  VaultStatus: ResolverTypeWrapper<VaultStatus>;
  VaultUnlockResult: ResolverTypeWrapper<VaultUnlockResult>;
};

/** Mapping between all available schema types and the resolvers parents */
export type ResolversParentTypes = {
  ActionableRecommendation: ActionableRecommendation;
  String: Scalars['String']['output'];
  Int: Scalars['Int']['output'];
  AddAllergyInput: AddAllergyInput;
  AddAppointmentInput: AddAppointmentInput;
  ID: Scalars['ID']['output'];
  AddConditionInput: AddConditionInput;
  AddDoctorInput: AddDoctorInput;
  AddMedicationInput: AddMedicationInput;
  AddMemoryEntryInput: AddMemoryEntryInput;
  Float: Scalars['Float']['output'];
  AddProtocolInput: AddProtocolInput;
  AddSupplementInput: AddSupplementInput;
  AddSymptomInput: AddSymptomInput;
  Affirmation: Affirmation;
  Boolean: Scalars['Boolean']['output'];
  Allergy: Omit<Allergy, 'familyMember'> & { familyMember?: Maybe<ResolversParentTypes['FamilyMember']> };
  AnticipatedReaction: AnticipatedReaction;
  Appointment: Appointment;
  AudioAsset: AudioAsset;
  AudioFromR2Result: AudioFromR2Result;
  AudioManifest: AudioManifest;
  AudioMetadata: AudioMetadata;
  AudioSegmentInfo: AudioSegmentInfo;
  BehaviorObservation: Omit<BehaviorObservation, 'familyMember' | 'goal'> & { familyMember?: Maybe<ResolversParentTypes['FamilyMember']>, goal?: Maybe<ResolversParentTypes['Goal']> };
  BloodTest: BloodTest;
  BogdanDiscussionGuide: BogdanDiscussionGuide;
  BuildClaimCardsInput: BuildClaimCardsInput;
  BuildClaimCardsResult: Omit<BuildClaimCardsResult, 'cards'> & { cards: Array<ResolversParentTypes['ClaimCard']> };
  CheckNoteClaimsInput: CheckNoteClaimsInput;
  CheckNoteClaimsResult: Omit<CheckNoteClaimsResult, 'cards'> & { cards: Array<ResolversParentTypes['ClaimCard']> };
  Citation: Citation;
  ClaimCard: Omit<ClaimCard, 'evidence'> & { evidence: Array<ResolversParentTypes['EvidenceItem']> };
  ClaimProvenance: ClaimProvenance;
  ClaimScope: ClaimScope;
  CognitiveBaseline: CognitiveBaseline;
  CognitiveCheckIn: CognitiveCheckIn;
  CognitiveCheckInInput: CognitiveCheckInInput;
  CognitiveScoresInput: CognitiveScoresInput;
  Condition: Omit<Condition, 'familyMember'> & { familyMember?: Maybe<ResolversParentTypes['FamilyMember']> };
  Contact: Contact;
  ContactFeedback: Omit<ContactFeedback, 'familyMember' | 'issues' | 'stories'> & { familyMember?: Maybe<ResolversParentTypes['FamilyMember']>, issues: Array<ResolversParentTypes['Issue']>, stories: Array<ResolversParentTypes['Story']> };
  Conversation: Conversation;
  ConversationMessage: ConversationMessage;
  ConversationStarter: ConversationStarter;
  ConvertJournalEntryToIssueInput: ConvertJournalEntryToIssueInput;
  CreateAffirmationInput: CreateAffirmationInput;
  CreateContactFeedbackInput: CreateContactFeedbackInput;
  CreateContactInput: CreateContactInput;
  CreateFamilyMemberInput: CreateFamilyMemberInput;
  CreateGameInput: CreateGameInput;
  CreateGoalInput: CreateGoalInput;
  CreateHabitInput: CreateHabitInput;
  CreateIssueInput: CreateIssueInput;
  CreateJournalEntryInput: CreateJournalEntryInput;
  CreateNoteInput: CreateNoteInput;
  CreateRelationshipInput: CreateRelationshipInput;
  CreateStoryInput: CreateStoryInput;
  CreateSubGoalInput: CreateSubGoalInput;
  CreateTeacherFeedbackInput: CreateTeacherFeedbackInput;
  CritiqueScores: CritiqueScores;
  DataSnapshot: DataSnapshot;
  DeepAnalysis: Omit<DeepAnalysis, 'familyMember' | 'goal' | 'journalEntry' | 'note'> & { familyMember?: Maybe<ResolversParentTypes['FamilyMember']>, goal?: Maybe<ResolversParentTypes['Goal']>, journalEntry?: Maybe<ResolversParentTypes['JournalEntry']>, note?: Maybe<ResolversParentTypes['Note']> };
  DeepIssueAnalysis: Omit<DeepIssueAnalysis, 'familyMember' | 'triggerIssue'> & { familyMember?: Maybe<ResolversParentTypes['FamilyMember']>, triggerIssue?: Maybe<ResolversParentTypes['Issue']> };
  DeleteAffirmationResult: DeleteAffirmationResult;
  DeleteAllergyResult: DeleteAllergyResult;
  DeleteAppointmentResult: DeleteAppointmentResult;
  DeleteBehaviorObservationResult: DeleteBehaviorObservationResult;
  DeleteBloodTestResult: DeleteBloodTestResult;
  DeleteConditionResult: DeleteConditionResult;
  DeleteContactFeedbackResult: DeleteContactFeedbackResult;
  DeleteContactResult: DeleteContactResult;
  DeleteConversationResult: DeleteConversationResult;
  DeleteDeepAnalysisResult: DeleteDeepAnalysisResult;
  DeleteDiscussionGuideResult: DeleteDiscussionGuideResult;
  DeleteDoctorResult: DeleteDoctorResult;
  DeleteFamilyMemberResult: DeleteFamilyMemberResult;
  DeleteGameResult: DeleteGameResult;
  DeleteGoalResult: DeleteGoalResult;
  DeleteHabitResult: DeleteHabitResult;
  DeleteIssueResult: DeleteIssueResult;
  DeleteIssueScreenshotResult: DeleteIssueScreenshotResult;
  DeleteJournalAnalysisResult: DeleteJournalAnalysisResult;
  DeleteJournalEntryResult: DeleteJournalEntryResult;
  DeleteMedicationResult: DeleteMedicationResult;
  DeleteMemoryEntryResult: DeleteMemoryEntryResult;
  DeleteNoteResult: DeleteNoteResult;
  DeleteProtocolResult: DeleteProtocolResult;
  DeleteQuestionsResult: DeleteQuestionsResult;
  DeleteRecommendedBooksResult: DeleteRecommendedBooksResult;
  DeleteRelationshipResult: DeleteRelationshipResult;
  DeleteResearchResult: DeleteResearchResult;
  DeleteRoutineAnalysisResult: DeleteRoutineAnalysisResult;
  DeleteStoryResult: DeleteStoryResult;
  DeleteSupplementResult: DeleteSupplementResult;
  DeleteSymptomResult: DeleteSymptomResult;
  DeleteTeacherFeedbackResult: DeleteTeacherFeedbackResult;
  DevelopmentalContext: DevelopmentalContext;
  DiscussionGuide: DiscussionGuide;
  DiscussionGuideCritique: DiscussionGuideCritique;
  Doctor: Doctor;
  EmotionalLandscape: EmotionalLandscape;
  EvidenceItem: EvidenceItem;
  EvidenceLocator: EvidenceLocator;
  ExtractedIssue: ExtractedIssue;
  FamilyMember: Omit<FamilyMember, 'affirmations' | 'behaviorObservations' | 'goals' | 'issues' | 'relationships' | 'shares' | 'teacherFeedbacks'> & { affirmations: Array<ResolversParentTypes['Affirmation']>, behaviorObservations: Array<ResolversParentTypes['BehaviorObservation']>, goals: Array<ResolversParentTypes['Goal']>, issues: Array<ResolversParentTypes['Issue']>, relationships: Array<ResolversParentTypes['Relationship']>, shares: Array<ResolversParentTypes['FamilyMemberShare']>, teacherFeedbacks: Array<ResolversParentTypes['TeacherFeedback']> };
  FamilyMemberShare: FamilyMemberShare;
  FamilySystemInsight: FamilySystemInsight;
  FollowUpStep: FollowUpStep;
  Game: Omit<Game, 'goal' | 'issue'> & { goal?: Maybe<ResolversParentTypes['Goal']>, issue?: Maybe<ResolversParentTypes['Issue']> };
  GameCompletion: GameCompletion;
  GenerateAffirmationsResult: Omit<GenerateAffirmationsResult, 'affirmations'> & { affirmations: Array<ResolversParentTypes['Affirmation']> };
  GenerateAudioResult: GenerateAudioResult;
  GenerateBogdanDiscussionResult: GenerateBogdanDiscussionResult;
  GenerateDeepAnalysisResult: GenerateDeepAnalysisResult;
  GenerateDiscussionGuideResult: GenerateDiscussionGuideResult;
  GenerateGameInput: GenerateGameInput;
  GenerateHabitsResult: Omit<GenerateHabitsResult, 'habits'> & { habits?: Maybe<Array<ResolversParentTypes['Habit']>> };
  GenerateJournalAnalysisResult: GenerateJournalAnalysisResult;
  GenerateLongFormTextResult: GenerateLongFormTextResult;
  GenerateOpenAIAudioInput: GenerateOpenAIAudioInput;
  GenerateOpenAIAudioResult: GenerateOpenAIAudioResult;
  GenerateParentAdviceResult: GenerateParentAdviceResult;
  GenerateQuestionsResult: GenerateQuestionsResult;
  GenerateRecommendedBooksResult: GenerateRecommendedBooksResult;
  GenerateResearchResult: GenerateResearchResult;
  GenerateRoutineAnalysisResult: GenerateRoutineAnalysisResult;
  GenerationJob: GenerationJob;
  Goal: Omit<Goal, 'familyMember' | 'notes' | 'parentGoal' | 'research' | 'stories' | 'subGoals'> & { familyMember?: Maybe<ResolversParentTypes['FamilyMember']>, notes: Array<ResolversParentTypes['Note']>, parentGoal?: Maybe<ResolversParentTypes['Goal']>, research: Array<ResolversParentTypes['Research']>, stories: Array<ResolversParentTypes['Story']>, subGoals: Array<ResolversParentTypes['Goal']> };
  Habit: Habit;
  HabitAdherence: HabitAdherence;
  HabitLog: HabitLog;
  HealthcareChatInput: HealthcareChatInput;
  HealthcareChatResponse: HealthcareChatResponse;
  HealthcareChatTurn: HealthcareChatTurn;
  HealthcareMarkerTrendHit: HealthcareMarkerTrendHit;
  HealthcareMultiSearchResult: HealthcareMultiSearchResult;
  HealthcareSearchHit: HealthcareSearchHit;
  HealthcareSearchMarkerHit: HealthcareSearchMarkerHit;
  HealthcareSearchTestHit: HealthcareSearchTestHit;
  HealthcareSummary: HealthcareSummary;
  Issue: Omit<Issue, 'familyMember' | 'feedback' | 'journalEntry' | 'relatedFamilyMember' | 'relatedIssues' | 'stories'> & { familyMember?: Maybe<ResolversParentTypes['FamilyMember']>, feedback?: Maybe<ResolversParentTypes['ContactFeedback']>, journalEntry?: Maybe<ResolversParentTypes['JournalEntry']>, relatedFamilyMember?: Maybe<ResolversParentTypes['FamilyMember']>, relatedIssues: Array<ResolversParentTypes['IssueLink']>, stories: Array<ResolversParentTypes['Story']> };
  IssueContactLink: IssueContactLink;
  IssueLink: Omit<IssueLink, 'issue'> & { issue: ResolversParentTypes['Issue'] };
  IssueScreenshot: IssueScreenshot;
  JobError: JobError;
  JobResult: JobResult;
  JournalAnalysis: JournalAnalysis;
  JournalEntry: Omit<JournalEntry, 'familyMember' | 'goal' | 'issue'> & { familyMember?: Maybe<ResolversParentTypes['FamilyMember']>, goal?: Maybe<ResolversParentTypes['Goal']>, issue?: Maybe<ResolversParentTypes['Issue']> };
  LanguageExample: LanguageExample;
  LanguageGuide: LanguageGuide;
  LogGameCompletionInput: LogGameCompletionInput;
  Medication: Omit<Medication, 'familyMember'> & { familyMember?: Maybe<ResolversParentTypes['FamilyMember']> };
  MemoryBaseline: MemoryBaseline;
  MemoryEntry: MemoryEntry;
  MicroScript: MicroScript;
  Mutation: Record<PropertyKey, never>;
  Note: Omit<Note, 'claimCards' | 'goal' | 'linkedResearch' | 'shares'> & { claimCards?: Maybe<Array<ResolversParentTypes['ClaimCard']>>, goal?: Maybe<ResolversParentTypes['Goal']>, linkedResearch?: Maybe<Array<ResolversParentTypes['Research']>>, shares: Array<ResolversParentTypes['NoteShare']> };
  NoteAccess: NoteAccess;
  NoteShare: NoteShare;
  PaperCandidate: PaperCandidate;
  ParentAdviceItem: ParentAdviceItem;
  PatternCluster: PatternCluster;
  PipelineDiagnostics: PipelineDiagnostics;
  PriorityRecommendation: PriorityRecommendation;
  Protocol: Protocol;
  ProtocolDetail: ProtocolDetail;
  ProtocolSupplement: ProtocolSupplement;
  PublicDiscussionGuideResult: PublicDiscussionGuideResult;
  Query: Record<PropertyKey, never>;
  RecommendedBook: RecommendedBook;
  Relationship: Omit<Relationship, 'related' | 'subject'> & { related?: Maybe<ResolversParentTypes['RelationshipPerson']>, subject?: Maybe<ResolversParentTypes['RelationshipPerson']> };
  RelationshipPerson: RelationshipPerson;
  Research: Omit<Research, 'goal'> & { goal?: Maybe<ResolversParentTypes['Goal']> };
  ResearchRelevanceMapping: ResearchRelevanceMapping;
  RoutineAnalysis: Omit<RoutineAnalysis, 'familyMember'> & { familyMember?: Maybe<ResolversParentTypes['FamilyMember']> };
  RoutineBalance: RoutineBalance;
  RoutineDataSnapshot: RoutineDataSnapshot;
  RoutineGap: RoutineGap;
  RoutineOptimization: RoutineOptimization;
  RoutineResearchMapping: RoutineResearchMapping;
  SetMemoryBaselineInput: SetMemoryBaselineInput;
  Story: Omit<Story, 'goal' | 'issue'> & { goal?: Maybe<ResolversParentTypes['Goal']>, issue?: Maybe<ResolversParentTypes['Issue']> };
  StreakSummary: StreakSummary;
  Subscription: Record<PropertyKey, never>;
  Symptom: Symptom;
  TalkingPoint: TalkingPoint;
  TeacherFeedback: Omit<TeacherFeedback, 'familyMember'> & { familyMember?: Maybe<ResolversParentTypes['FamilyMember']> };
  TextSegment: TextSegment;
  TherapeuticInsight: TherapeuticInsight;
  TherapeuticQuestion: TherapeuticQuestion;
  TimelineAnalysis: TimelineAnalysis;
  TimelinePhase: TimelinePhase;
  UnlinkContactResult: UnlinkContactResult;
  UnlinkIssuesResult: UnlinkIssuesResult;
  UpdateAffirmationInput: UpdateAffirmationInput;
  UpdateBehaviorObservationInput: UpdateBehaviorObservationInput;
  UpdateContactFeedbackInput: UpdateContactFeedbackInput;
  UpdateContactInput: UpdateContactInput;
  UpdateFamilyMemberInput: UpdateFamilyMemberInput;
  UpdateGameInput: UpdateGameInput;
  UpdateGoalInput: UpdateGoalInput;
  UpdateHabitInput: UpdateHabitInput;
  UpdateIssueInput: UpdateIssueInput;
  UpdateJournalEntryInput: UpdateJournalEntryInput;
  UpdateNoteInput: UpdateNoteInput;
  UpdateRelationshipInput: UpdateRelationshipInput;
  UpdateStoryInput: UpdateStoryInput;
  UpdateTeacherFeedbackInput: UpdateTeacherFeedbackInput;
  UserSettings: UserSettings;
  VaultStatus: VaultStatus;
  VaultUnlockResult: VaultUnlockResult;
};

export type ActionableRecommendationResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['ActionableRecommendation'] = ResolversParentTypes['ActionableRecommendation']> = {
  concreteSteps?: Resolver<Array<ResolversTypes['String']>, ParentType, ContextType>;
  description?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  priority?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  relatedResearchIds?: Resolver<Maybe<Array<ResolversTypes['Int']>>, ParentType, ContextType>;
  title?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
};

export type AffirmationResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['Affirmation'] = ResolversParentTypes['Affirmation']> = {
  category?: Resolver<ResolversTypes['AffirmationCategory'], ParentType, ContextType>;
  createdAt?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  familyMemberId?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  id?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  isActive?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  text?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  updatedAt?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  userId?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
};

export type AffirmationCategoryResolvers = EnumResolverSignature<{ ENCOURAGEMENT?: any, GRATITUDE?: any, GROWTH?: any, SELF_WORTH?: any, STRENGTH?: any }, ResolversTypes['AffirmationCategory']>;

export type AllergyResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['Allergy'] = ResolversParentTypes['Allergy']> = {
  createdAt?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  familyMember?: Resolver<Maybe<ResolversTypes['FamilyMember']>, ParentType, ContextType>;
  familyMemberId?: Resolver<Maybe<ResolversTypes['Int']>, ParentType, ContextType>;
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  kind?: Resolver<ResolversTypes['AllergyKind'], ParentType, ContextType>;
  name?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  notes?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  severity?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  userId?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
};

export type AllergyKindResolvers = EnumResolverSignature<{ allergy?: any, intolerance?: any }, ResolversTypes['AllergyKind']>;

export type AnticipatedReactionResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['AnticipatedReaction'] = ResolversParentTypes['AnticipatedReaction']> = {
  howToRespond?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  likelihood?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  reaction?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
};

export type AppointmentResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['Appointment'] = ResolversParentTypes['Appointment']> = {
  appointmentDate?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  createdAt?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  doctorId?: Resolver<Maybe<ResolversTypes['ID']>, ParentType, ContextType>;
  familyMemberId?: Resolver<Maybe<ResolversTypes['Int']>, ParentType, ContextType>;
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  notes?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  provider?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  title?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  userId?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
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

export type BloodTestResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['BloodTest'] = ResolversParentTypes['BloodTest']> = {
  errorMessage?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  fileName?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  filePath?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  markersCount?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  status?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  testDate?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  uploadedAt?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  userId?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
};

export type BogdanDiscussionGuideResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['BogdanDiscussionGuide'] = ResolversParentTypes['BogdanDiscussionGuide']> = {
  anticipatedReactions?: Resolver<Array<ResolversTypes['AnticipatedReaction']>, ParentType, ContextType>;
  behaviorSummary?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  childAge?: Resolver<Maybe<ResolversTypes['Int']>, ParentType, ContextType>;
  citations?: Resolver<Array<ResolversTypes['Citation']>, ParentType, ContextType>;
  conversationStarters?: Resolver<Array<ResolversTypes['ConversationStarter']>, ParentType, ContextType>;
  createdAt?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  critique?: Resolver<Maybe<ResolversTypes['DiscussionGuideCritique']>, ParentType, ContextType>;
  developmentalContext?: Resolver<ResolversTypes['DevelopmentalContext'], ParentType, ContextType>;
  familyMemberId?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  followUpPlan?: Resolver<Array<ResolversTypes['FollowUpStep']>, ParentType, ContextType>;
  id?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  languageGuide?: Resolver<ResolversTypes['LanguageGuide'], ParentType, ContextType>;
  model?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  talkingPoints?: Resolver<Array<ResolversTypes['TalkingPoint']>, ParentType, ContextType>;
};

export type BuildClaimCardsResultResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['BuildClaimCardsResult'] = ResolversParentTypes['BuildClaimCardsResult']> = {
  cards?: Resolver<Array<ResolversTypes['ClaimCard']>, ParentType, ContextType>;
};

export type CheckNoteClaimsResultResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['CheckNoteClaimsResult'] = ResolversParentTypes['CheckNoteClaimsResult']> = {
  cards?: Resolver<Array<ResolversTypes['ClaimCard']>, ParentType, ContextType>;
  message?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  noteId?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  success?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
};

export type CitationResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['Citation'] = ResolversParentTypes['Citation']> = {
  authors?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  doi?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  researchId?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  title?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  url?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  year?: Resolver<Maybe<ResolversTypes['Int']>, ParentType, ContextType>;
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

export type CognitiveBaselineResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['CognitiveBaseline'] = ResolversParentTypes['CognitiveBaseline']> = {
  focusScore?: Resolver<Maybe<ResolversTypes['Float']>, ParentType, ContextType>;
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  memoryScore?: Resolver<Maybe<ResolversTypes['Float']>, ParentType, ContextType>;
  moodScore?: Resolver<Maybe<ResolversTypes['Float']>, ParentType, ContextType>;
  processingSpeedScore?: Resolver<Maybe<ResolversTypes['Float']>, ParentType, ContextType>;
  protocolId?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  recordedAt?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  sleepScore?: Resolver<Maybe<ResolversTypes['Float']>, ParentType, ContextType>;
};

export type CognitiveCheckInResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['CognitiveCheckIn'] = ResolversParentTypes['CognitiveCheckIn']> = {
  focusScore?: Resolver<Maybe<ResolversTypes['Float']>, ParentType, ContextType>;
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  memoryScore?: Resolver<Maybe<ResolversTypes['Float']>, ParentType, ContextType>;
  moodScore?: Resolver<Maybe<ResolversTypes['Float']>, ParentType, ContextType>;
  notes?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  processingSpeedScore?: Resolver<Maybe<ResolversTypes['Float']>, ParentType, ContextType>;
  protocolId?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  recordedAt?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  sideEffects?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  sleepScore?: Resolver<Maybe<ResolversTypes['Float']>, ParentType, ContextType>;
};

export type ConditionResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['Condition'] = ResolversParentTypes['Condition']> = {
  createdAt?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  familyMember?: Resolver<Maybe<ResolversTypes['FamilyMember']>, ParentType, ContextType>;
  familyMemberId?: Resolver<Maybe<ResolversTypes['Int']>, ParentType, ContextType>;
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  name?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  notes?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  userId?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
};

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

export type ConversationStarterResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['ConversationStarter'] = ResolversParentTypes['ConversationStarter']> = {
  ageAppropriateNote?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  context?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  opener?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
};

export type CritiqueScoresResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['CritiqueScores'] = ResolversParentTypes['CritiqueScores']> = {
  actionability?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  ageAppropriateness?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  citationCoverage?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  internalConsistency?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  microScriptDepth?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  romanianFluency?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
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

export type DeepAnalysisResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['DeepAnalysis'] = ResolversParentTypes['DeepAnalysis']> = {
  createdAt?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  createdBy?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  dataSnapshot?: Resolver<ResolversTypes['DataSnapshot'], ParentType, ContextType>;
  familyMember?: Resolver<Maybe<ResolversTypes['FamilyMember']>, ParentType, ContextType>;
  familySystemInsights?: Resolver<Array<ResolversTypes['FamilySystemInsight']>, ParentType, ContextType>;
  goal?: Resolver<Maybe<ResolversTypes['Goal']>, ParentType, ContextType>;
  id?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  jobId?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  journalEntry?: Resolver<Maybe<ResolversTypes['JournalEntry']>, ParentType, ContextType>;
  model?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  note?: Resolver<Maybe<ResolversTypes['Note']>, ParentType, ContextType>;
  parentAdvice?: Resolver<Array<ResolversTypes['ParentAdviceItem']>, ParentType, ContextType>;
  patternClusters?: Resolver<Array<ResolversTypes['PatternCluster']>, ParentType, ContextType>;
  priorityRecommendations?: Resolver<Array<ResolversTypes['PriorityRecommendation']>, ParentType, ContextType>;
  researchRelevance?: Resolver<Array<ResolversTypes['ResearchRelevanceMapping']>, ParentType, ContextType>;
  subjectId?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  subjectType?: Resolver<ResolversTypes['DeepAnalysisSubjectType'], ParentType, ContextType>;
  summary?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  timelineAnalysis?: Resolver<ResolversTypes['TimelineAnalysis'], ParentType, ContextType>;
  triggerId?: Resolver<Maybe<ResolversTypes['Int']>, ParentType, ContextType>;
  triggerType?: Resolver<Maybe<ResolversTypes['DeepAnalysisTriggerType']>, ParentType, ContextType>;
  updatedAt?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
};

export type DeepAnalysisSubjectTypeResolvers = EnumResolverSignature<{ FAMILY_MEMBER?: any, GOAL?: any, JOURNAL_ENTRY?: any, NOTE?: any }, ResolversTypes['DeepAnalysisSubjectType']>;

export type DeepAnalysisTriggerTypeResolvers = EnumResolverSignature<{ FEEDBACK?: any, ISSUE?: any, OBSERVATION?: any }, ResolversTypes['DeepAnalysisTriggerType']>;

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

export type DeleteAffirmationResultResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['DeleteAffirmationResult'] = ResolversParentTypes['DeleteAffirmationResult']> = {
  message?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  success?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
};

export type DeleteAllergyResultResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['DeleteAllergyResult'] = ResolversParentTypes['DeleteAllergyResult']> = {
  success?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
};

export type DeleteAppointmentResultResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['DeleteAppointmentResult'] = ResolversParentTypes['DeleteAppointmentResult']> = {
  success?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
};

export type DeleteBehaviorObservationResultResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['DeleteBehaviorObservationResult'] = ResolversParentTypes['DeleteBehaviorObservationResult']> = {
  message?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  success?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
};

export type DeleteBloodTestResultResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['DeleteBloodTestResult'] = ResolversParentTypes['DeleteBloodTestResult']> = {
  success?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
};

export type DeleteConditionResultResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['DeleteConditionResult'] = ResolversParentTypes['DeleteConditionResult']> = {
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

export type DeleteDiscussionGuideResultResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['DeleteDiscussionGuideResult'] = ResolversParentTypes['DeleteDiscussionGuideResult']> = {
  message?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  success?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
};

export type DeleteDoctorResultResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['DeleteDoctorResult'] = ResolversParentTypes['DeleteDoctorResult']> = {
  success?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
};

export type DeleteFamilyMemberResultResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['DeleteFamilyMemberResult'] = ResolversParentTypes['DeleteFamilyMemberResult']> = {
  message?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  success?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
};

export type DeleteGameResultResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['DeleteGameResult'] = ResolversParentTypes['DeleteGameResult']> = {
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

export type DeleteJournalAnalysisResultResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['DeleteJournalAnalysisResult'] = ResolversParentTypes['DeleteJournalAnalysisResult']> = {
  message?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  success?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
};

export type DeleteJournalEntryResultResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['DeleteJournalEntryResult'] = ResolversParentTypes['DeleteJournalEntryResult']> = {
  message?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  success?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
};

export type DeleteMedicationResultResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['DeleteMedicationResult'] = ResolversParentTypes['DeleteMedicationResult']> = {
  success?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
};

export type DeleteMemoryEntryResultResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['DeleteMemoryEntryResult'] = ResolversParentTypes['DeleteMemoryEntryResult']> = {
  success?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
};

export type DeleteNoteResultResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['DeleteNoteResult'] = ResolversParentTypes['DeleteNoteResult']> = {
  message?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  success?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
};

export type DeleteProtocolResultResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['DeleteProtocolResult'] = ResolversParentTypes['DeleteProtocolResult']> = {
  success?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
};

export type DeleteQuestionsResultResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['DeleteQuestionsResult'] = ResolversParentTypes['DeleteQuestionsResult']> = {
  deletedCount?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  message?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  success?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
};

export type DeleteRecommendedBooksResultResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['DeleteRecommendedBooksResult'] = ResolversParentTypes['DeleteRecommendedBooksResult']> = {
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

export type DeleteRoutineAnalysisResultResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['DeleteRoutineAnalysisResult'] = ResolversParentTypes['DeleteRoutineAnalysisResult']> = {
  message?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  success?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
};

export type DeleteStoryResultResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['DeleteStoryResult'] = ResolversParentTypes['DeleteStoryResult']> = {
  message?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  success?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
};

export type DeleteSupplementResultResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['DeleteSupplementResult'] = ResolversParentTypes['DeleteSupplementResult']> = {
  success?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
};

export type DeleteSymptomResultResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['DeleteSymptomResult'] = ResolversParentTypes['DeleteSymptomResult']> = {
  success?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
};

export type DeleteTeacherFeedbackResultResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['DeleteTeacherFeedbackResult'] = ResolversParentTypes['DeleteTeacherFeedbackResult']> = {
  message?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  success?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
};

export type DevelopmentalContextResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['DevelopmentalContext'] = ResolversParentTypes['DevelopmentalContext']> = {
  explanation?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  normalizedBehavior?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  researchBasis?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  stage?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
};

export type DevelopmentalTierResolvers = EnumResolverSignature<{ ADULT?: any, EARLY_ADOLESCENCE?: any, EARLY_CHILDHOOD?: any, LATE_ADOLESCENCE?: any, MIDDLE_CHILDHOOD?: any }, ResolversTypes['DevelopmentalTier']>;

export type DiscussionGuideResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['DiscussionGuide'] = ResolversParentTypes['DiscussionGuide']> = {
  anticipatedReactions?: Resolver<Array<ResolversTypes['AnticipatedReaction']>, ParentType, ContextType>;
  behaviorSummary?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  childAge?: Resolver<Maybe<ResolversTypes['Int']>, ParentType, ContextType>;
  conversationStarters?: Resolver<Array<ResolversTypes['ConversationStarter']>, ParentType, ContextType>;
  createdAt?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  developmentalContext?: Resolver<ResolversTypes['DevelopmentalContext'], ParentType, ContextType>;
  followUpPlan?: Resolver<Array<ResolversTypes['FollowUpStep']>, ParentType, ContextType>;
  id?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  journalEntryId?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  languageGuide?: Resolver<ResolversTypes['LanguageGuide'], ParentType, ContextType>;
  model?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  talkingPoints?: Resolver<Array<ResolversTypes['TalkingPoint']>, ParentType, ContextType>;
};

export type DiscussionGuideCritiqueResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['DiscussionGuideCritique'] = ResolversParentTypes['DiscussionGuideCritique']> = {
  refined?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  scores?: Resolver<ResolversTypes['CritiqueScores'], ParentType, ContextType>;
  weakSections?: Resolver<Array<ResolversTypes['String']>, ParentType, ContextType>;
};

export type DoctorResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['Doctor'] = ResolversParentTypes['Doctor']> = {
  address?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  createdAt?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  email?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  name?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  notes?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  phone?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  specialty?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  userId?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
};

export type EmotionalLandscapeResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['EmotionalLandscape'] = ResolversParentTypes['EmotionalLandscape']> = {
  attachmentPatterns?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  emotionalRegulation?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  primaryEmotions?: Resolver<Array<ResolversTypes['String']>, ParentType, ContextType>;
  underlyingEmotions?: Resolver<Array<ResolversTypes['String']>, ParentType, ContextType>;
};

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
  affirmations?: Resolver<Array<ResolversTypes['Affirmation']>, ParentType, ContextType>;
  ageYears?: Resolver<Maybe<ResolversTypes['Int']>, ParentType, ContextType>;
  allergies?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
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

export type FamilyMemberShareRoleResolvers = EnumResolverSignature<{ EDITOR?: any }, ResolversTypes['FamilyMemberShareRole']>;

export type FamilySystemInsightResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['FamilySystemInsight'] = ResolversParentTypes['FamilySystemInsight']> = {
  actionable?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  evidenceIssueIds?: Resolver<Array<ResolversTypes['Int']>, ParentType, ContextType>;
  insight?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  involvedMemberIds?: Resolver<Array<ResolversTypes['Int']>, ParentType, ContextType>;
  involvedMemberNames?: Resolver<Array<ResolversTypes['String']>, ParentType, ContextType>;
  systemicPattern?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
};

export type FeedbackSourceResolvers = EnumResolverSignature<{ EMAIL?: any, MEETING?: any, NOTE?: any, OTHER?: any, PHONE?: any, REPORT?: any }, ResolversTypes['FeedbackSource']>;

export type FollowUpStepResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['FollowUpStep'] = ResolversParentTypes['FollowUpStep']> = {
  action?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  description?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  timing?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
};

export type GameResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['Game'] = ResolversParentTypes['Game']> = {
  completions?: Resolver<Array<ResolversTypes['GameCompletion']>, ParentType, ContextType>;
  content?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  createdAt?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  description?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  estimatedMinutes?: Resolver<Maybe<ResolversTypes['Int']>, ParentType, ContextType>;
  familyMemberId?: Resolver<Maybe<ResolversTypes['Int']>, ParentType, ContextType>;
  goal?: Resolver<Maybe<ResolversTypes['Goal']>, ParentType, ContextType>;
  goalId?: Resolver<Maybe<ResolversTypes['Int']>, ParentType, ContextType>;
  id?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  issue?: Resolver<Maybe<ResolversTypes['Issue']>, ParentType, ContextType>;
  issueId?: Resolver<Maybe<ResolversTypes['Int']>, ParentType, ContextType>;
  language?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  source?: Resolver<ResolversTypes['GameSource'], ParentType, ContextType>;
  title?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  type?: Resolver<ResolversTypes['GameType'], ParentType, ContextType>;
  updatedAt?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  userId?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
};

export type GameCompletionResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['GameCompletion'] = ResolversParentTypes['GameCompletion']> = {
  completedAt?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  durationSeconds?: Resolver<Maybe<ResolversTypes['Int']>, ParentType, ContextType>;
  gameId?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  id?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  linkedNoteId?: Resolver<Maybe<ResolversTypes['Int']>, ParentType, ContextType>;
  responses?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  userId?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
};

export type GameSourceResolvers = EnumResolverSignature<{ AI?: any, SEED?: any, USER?: any }, ResolversTypes['GameSource']>;

export type GameTypeResolvers = EnumResolverSignature<{ CBT_REFRAME?: any, JOURNAL_PROMPT?: any, MINDFULNESS?: any }, ResolversTypes['GameType']>;

export type GenerateAffirmationsResultResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['GenerateAffirmationsResult'] = ResolversParentTypes['GenerateAffirmationsResult']> = {
  affirmations?: Resolver<Array<ResolversTypes['Affirmation']>, ParentType, ContextType>;
  count?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  message?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  success?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
};

export type GenerateAudioResultResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['GenerateAudioResult'] = ResolversParentTypes['GenerateAudioResult']> = {
  audioUrl?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  jobId?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  message?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  success?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
};

export type GenerateBogdanDiscussionResultResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['GenerateBogdanDiscussionResult'] = ResolversParentTypes['GenerateBogdanDiscussionResult']> = {
  jobId?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  message?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  success?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
};

export type GenerateDeepAnalysisResultResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['GenerateDeepAnalysisResult'] = ResolversParentTypes['GenerateDeepAnalysisResult']> = {
  jobId?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  message?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  success?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
};

export type GenerateDiscussionGuideResultResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['GenerateDiscussionGuideResult'] = ResolversParentTypes['GenerateDiscussionGuideResult']> = {
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

export type GenerateJournalAnalysisResultResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['GenerateJournalAnalysisResult'] = ResolversParentTypes['GenerateJournalAnalysisResult']> = {
  analysis?: Resolver<Maybe<ResolversTypes['JournalAnalysis']>, ParentType, ContextType>;
  jobId?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
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

export type GenerateRecommendedBooksResultResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['GenerateRecommendedBooksResult'] = ResolversParentTypes['GenerateRecommendedBooksResult']> = {
  books?: Resolver<Array<ResolversTypes['RecommendedBook']>, ParentType, ContextType>;
  jobId?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  message?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  success?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
};

export type GenerateResearchResultResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['GenerateResearchResult'] = ResolversParentTypes['GenerateResearchResult']> = {
  count?: Resolver<Maybe<ResolversTypes['Int']>, ParentType, ContextType>;
  jobId?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  message?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  success?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
};

export type GenerateRoutineAnalysisResultResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['GenerateRoutineAnalysisResult'] = ResolversParentTypes['GenerateRoutineAnalysisResult']> = {
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
  recommendedBooks?: Resolver<Array<ResolversTypes['RecommendedBook']>, ParentType, ContextType>;
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

export type HabitAdherenceResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['HabitAdherence'] = ResolversParentTypes['HabitAdherence']> = {
  consistency?: Resolver<ResolversTypes['Float'], ParentType, ContextType>;
  currentStreak?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  frequency?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  habitId?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  habitTitle?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  interpretation?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  longestStreak?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  missedPattern?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  observedCount?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  targetCount?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
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

export type HealthcareChatResponseResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['HealthcareChatResponse'] = ResolversParentTypes['HealthcareChatResponse']> = {
  answer?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  citations?: Resolver<Array<ResolversTypes['String']>, ParentType, ContextType>;
  guardIssues?: Resolver<Array<ResolversTypes['String']>, ParentType, ContextType>;
  guardPassed?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  intent?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  intentConfidence?: Resolver<ResolversTypes['Float'], ParentType, ContextType>;
  rerankScores?: Resolver<Array<ResolversTypes['Float']>, ParentType, ContextType>;
  retrievalSources?: Resolver<Array<ResolversTypes['String']>, ParentType, ContextType>;
};

export type HealthcareMarkerTrendHitResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['HealthcareMarkerTrendHit'] = ResolversParentTypes['HealthcareMarkerTrendHit']> = {
  content?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  fileName?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  flag?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  markerId?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  markerName?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  similarity?: Resolver<ResolversTypes['Float'], ParentType, ContextType>;
  testDate?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  testId?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  unit?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  value?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
};

export type HealthcareMultiSearchResultResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['HealthcareMultiSearchResult'] = ResolversParentTypes['HealthcareMultiSearchResult']> = {
  appointments?: Resolver<Array<ResolversTypes['HealthcareSearchHit']>, ParentType, ContextType>;
  conditions?: Resolver<Array<ResolversTypes['HealthcareSearchHit']>, ParentType, ContextType>;
  markers?: Resolver<Array<ResolversTypes['HealthcareSearchMarkerHit']>, ParentType, ContextType>;
  medications?: Resolver<Array<ResolversTypes['HealthcareSearchHit']>, ParentType, ContextType>;
  symptoms?: Resolver<Array<ResolversTypes['HealthcareSearchHit']>, ParentType, ContextType>;
  tests?: Resolver<Array<ResolversTypes['HealthcareSearchTestHit']>, ParentType, ContextType>;
};

export type HealthcareSearchHitResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['HealthcareSearchHit'] = ResolversParentTypes['HealthcareSearchHit']> = {
  content?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  entityId?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  similarity?: Resolver<ResolversTypes['Float'], ParentType, ContextType>;
};

export type HealthcareSearchMarkerHitResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['HealthcareSearchMarkerHit'] = ResolversParentTypes['HealthcareSearchMarkerHit']> = {
  combinedScore?: Resolver<ResolversTypes['Float'], ParentType, ContextType>;
  content?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  markerId?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  markerName?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  testId?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  vectorSimilarity?: Resolver<ResolversTypes['Float'], ParentType, ContextType>;
};

export type HealthcareSearchTestHitResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['HealthcareSearchTestHit'] = ResolversParentTypes['HealthcareSearchTestHit']> = {
  content?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  fileName?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  similarity?: Resolver<ResolversTypes['Float'], ParentType, ContextType>;
  testDate?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  testId?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
};

export type HealthcareSummaryResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['HealthcareSummary'] = ResolversParentTypes['HealthcareSummary']> = {
  appointmentsCount?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  bloodTestsCount?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  conditionsCount?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  doctorsCount?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  medicationsCount?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  memoryEntriesCount?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  protocolsCount?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  symptomsCount?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
};

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
  message?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  progress?: Resolver<Maybe<ResolversTypes['Int']>, ParentType, ContextType>;
  questions?: Resolver<Maybe<Array<ResolversTypes['TherapeuticQuestion']>>, ParentType, ContextType>;
  segmentUrls?: Resolver<Maybe<Array<ResolversTypes['String']>>, ParentType, ContextType>;
  stage?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  text?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
};

export type JobStatusResolvers = EnumResolverSignature<{ FAILED?: any, RUNNING?: any, SUCCEEDED?: any }, ResolversTypes['JobStatus']>;

export type JobTypeResolvers = EnumResolverSignature<{ AUDIO?: any, DEEP_ANALYSIS?: any, LONGFORM?: any, QUESTIONS?: any, RECOMMENDED_BOOKS?: any, RESEARCH?: any, ROUTINE_ANALYSIS?: any }, ResolversTypes['JobType']>;

export type JournalAnalysisResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['JournalAnalysis'] = ResolversParentTypes['JournalAnalysis']> = {
  actionableRecommendations?: Resolver<Array<ResolversTypes['ActionableRecommendation']>, ParentType, ContextType>;
  createdAt?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  emotionalLandscape?: Resolver<ResolversTypes['EmotionalLandscape'], ParentType, ContextType>;
  id?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  journalEntryId?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  model?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  reflectionPrompts?: Resolver<Array<ResolversTypes['String']>, ParentType, ContextType>;
  summary?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  therapeuticInsights?: Resolver<Array<ResolversTypes['TherapeuticInsight']>, ParentType, ContextType>;
};

export type JournalEntryResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['JournalEntry'] = ResolversParentTypes['JournalEntry']> = {
  analysis?: Resolver<Maybe<ResolversTypes['JournalAnalysis']>, ParentType, ContextType>;
  content?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  createdAt?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  createdBy?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  discussionGuide?: Resolver<Maybe<ResolversTypes['DiscussionGuide']>, ParentType, ContextType>;
  entryDate?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  familyMember?: Resolver<Maybe<ResolversTypes['FamilyMember']>, ParentType, ContextType>;
  familyMemberId?: Resolver<Maybe<ResolversTypes['Int']>, ParentType, ContextType>;
  goal?: Resolver<Maybe<ResolversTypes['Goal']>, ParentType, ContextType>;
  goalId?: Resolver<Maybe<ResolversTypes['Int']>, ParentType, ContextType>;
  id?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  isPrivate?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  isVault?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  issue?: Resolver<Maybe<ResolversTypes['Issue']>, ParentType, ContextType>;
  mood?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  moodScore?: Resolver<Maybe<ResolversTypes['Int']>, ParentType, ContextType>;
  tags?: Resolver<Maybe<Array<ResolversTypes['String']>>, ParentType, ContextType>;
  title?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  updatedAt?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
};

export type LanguageExampleResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['LanguageExample'] = ResolversParentTypes['LanguageExample']> = {
  alternative?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  phrase?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  reason?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
};

export type LanguageGuideResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['LanguageGuide'] = ResolversParentTypes['LanguageGuide']> = {
  whatNotToSay?: Resolver<Array<ResolversTypes['LanguageExample']>, ParentType, ContextType>;
  whatToSay?: Resolver<Array<ResolversTypes['LanguageExample']>, ParentType, ContextType>;
};

export type MedicationResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['Medication'] = ResolversParentTypes['Medication']> = {
  createdAt?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  dosage?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  endDate?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  familyMember?: Resolver<Maybe<ResolversTypes['FamilyMember']>, ParentType, ContextType>;
  familyMemberId?: Resolver<Maybe<ResolversTypes['Int']>, ParentType, ContextType>;
  frequency?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  name?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  notes?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  startDate?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  userId?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
};

export type MemoryBaselineResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['MemoryBaseline'] = ResolversParentTypes['MemoryBaseline']> = {
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  longTermScore?: Resolver<Maybe<ResolversTypes['Float']>, ParentType, ContextType>;
  overallScore?: Resolver<Maybe<ResolversTypes['Float']>, ParentType, ContextType>;
  recallSpeed?: Resolver<Maybe<ResolversTypes['Float']>, ParentType, ContextType>;
  recordedAt?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  shortTermScore?: Resolver<Maybe<ResolversTypes['Float']>, ParentType, ContextType>;
  userId?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  workingMemoryScore?: Resolver<Maybe<ResolversTypes['Float']>, ParentType, ContextType>;
};

export type MemoryEntryResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['MemoryEntry'] = ResolversParentTypes['MemoryEntry']> = {
  category?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  context?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  createdAt?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  description?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  loggedAt?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  longTermScore?: Resolver<Maybe<ResolversTypes['Float']>, ParentType, ContextType>;
  overallScore?: Resolver<Maybe<ResolversTypes['Float']>, ParentType, ContextType>;
  protocolId?: Resolver<Maybe<ResolversTypes['ID']>, ParentType, ContextType>;
  recallSpeed?: Resolver<Maybe<ResolversTypes['Float']>, ParentType, ContextType>;
  shortTermScore?: Resolver<Maybe<ResolversTypes['Float']>, ParentType, ContextType>;
  userId?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  workingMemoryScore?: Resolver<Maybe<ResolversTypes['Float']>, ParentType, ContextType>;
};

export type MicroScriptResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['MicroScript'] = ResolversParentTypes['MicroScript']> = {
  childResponse?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  parentFollowUp?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  parentOpener?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
};

export type MutationResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['Mutation'] = ResolversParentTypes['Mutation']> = {
  addAllergy?: Resolver<ResolversTypes['Allergy'], ParentType, ContextType, RequireFields<MutationaddAllergyArgs, 'input'>>;
  addAppointment?: Resolver<ResolversTypes['Appointment'], ParentType, ContextType, RequireFields<MutationaddAppointmentArgs, 'input'>>;
  addCondition?: Resolver<ResolversTypes['Condition'], ParentType, ContextType, RequireFields<MutationaddConditionArgs, 'input'>>;
  addDoctor?: Resolver<ResolversTypes['Doctor'], ParentType, ContextType, RequireFields<MutationaddDoctorArgs, 'input'>>;
  addMedication?: Resolver<ResolversTypes['Medication'], ParentType, ContextType, RequireFields<MutationaddMedicationArgs, 'input'>>;
  addMemoryEntry?: Resolver<ResolversTypes['MemoryEntry'], ParentType, ContextType, RequireFields<MutationaddMemoryEntryArgs, 'input'>>;
  addProtocol?: Resolver<ResolversTypes['Protocol'], ParentType, ContextType, RequireFields<MutationaddProtocolArgs, 'input'>>;
  addSupplement?: Resolver<ResolversTypes['ProtocolSupplement'], ParentType, ContextType, RequireFields<MutationaddSupplementArgs, 'input' | 'protocolId'>>;
  addSymptom?: Resolver<ResolversTypes['Symptom'], ParentType, ContextType, RequireFields<MutationaddSymptomArgs, 'input'>>;
  buildClaimCards?: Resolver<ResolversTypes['BuildClaimCardsResult'], ParentType, ContextType, RequireFields<MutationbuildClaimCardsArgs, 'input'>>;
  checkNoteClaims?: Resolver<ResolversTypes['CheckNoteClaimsResult'], ParentType, ContextType, RequireFields<MutationcheckNoteClaimsArgs, 'input'>>;
  convertIssueToGoal?: Resolver<ResolversTypes['Goal'], ParentType, ContextType, RequireFields<MutationconvertIssueToGoalArgs, 'id' | 'input'>>;
  convertJournalEntryToIssue?: Resolver<ResolversTypes['Issue'], ParentType, ContextType, RequireFields<MutationconvertJournalEntryToIssueArgs, 'id' | 'input'>>;
  createAffirmation?: Resolver<ResolversTypes['Affirmation'], ParentType, ContextType, RequireFields<MutationcreateAffirmationArgs, 'input'>>;
  createContact?: Resolver<ResolversTypes['Contact'], ParentType, ContextType, RequireFields<MutationcreateContactArgs, 'input'>>;
  createContactFeedback?: Resolver<ResolversTypes['ContactFeedback'], ParentType, ContextType, RequireFields<MutationcreateContactFeedbackArgs, 'input'>>;
  createConversation?: Resolver<ResolversTypes['Conversation'], ParentType, ContextType, RequireFields<MutationcreateConversationArgs, 'issueId' | 'message'>>;
  createFamilyMember?: Resolver<ResolversTypes['FamilyMember'], ParentType, ContextType, RequireFields<MutationcreateFamilyMemberArgs, 'input'>>;
  createGame?: Resolver<ResolversTypes['Game'], ParentType, ContextType, RequireFields<MutationcreateGameArgs, 'input'>>;
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
  deleteAffirmation?: Resolver<ResolversTypes['DeleteAffirmationResult'], ParentType, ContextType, RequireFields<MutationdeleteAffirmationArgs, 'id'>>;
  deleteAllergy?: Resolver<ResolversTypes['DeleteAllergyResult'], ParentType, ContextType, RequireFields<MutationdeleteAllergyArgs, 'id'>>;
  deleteAppointment?: Resolver<ResolversTypes['DeleteAppointmentResult'], ParentType, ContextType, RequireFields<MutationdeleteAppointmentArgs, 'id'>>;
  deleteBehaviorObservation?: Resolver<ResolversTypes['DeleteBehaviorObservationResult'], ParentType, ContextType, RequireFields<MutationdeleteBehaviorObservationArgs, 'id'>>;
  deleteBloodTest?: Resolver<ResolversTypes['DeleteBloodTestResult'], ParentType, ContextType, RequireFields<MutationdeleteBloodTestArgs, 'id'>>;
  deleteClaimCard?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType, RequireFields<MutationdeleteClaimCardArgs, 'id'>>;
  deleteCondition?: Resolver<ResolversTypes['DeleteConditionResult'], ParentType, ContextType, RequireFields<MutationdeleteConditionArgs, 'id'>>;
  deleteContact?: Resolver<ResolversTypes['DeleteContactResult'], ParentType, ContextType, RequireFields<MutationdeleteContactArgs, 'id'>>;
  deleteContactFeedback?: Resolver<ResolversTypes['DeleteContactFeedbackResult'], ParentType, ContextType, RequireFields<MutationdeleteContactFeedbackArgs, 'id'>>;
  deleteConversation?: Resolver<ResolversTypes['DeleteConversationResult'], ParentType, ContextType, RequireFields<MutationdeleteConversationArgs, 'id'>>;
  deleteDeepAnalysis?: Resolver<ResolversTypes['DeleteDeepAnalysisResult'], ParentType, ContextType, RequireFields<MutationdeleteDeepAnalysisArgs, 'id'>>;
  deleteDeepIssueAnalysis?: Resolver<ResolversTypes['DeleteDeepAnalysisResult'], ParentType, ContextType, RequireFields<MutationdeleteDeepIssueAnalysisArgs, 'id'>>;
  deleteDiscussionGuide?: Resolver<ResolversTypes['DeleteDiscussionGuideResult'], ParentType, ContextType, RequireFields<MutationdeleteDiscussionGuideArgs, 'journalEntryId'>>;
  deleteDoctor?: Resolver<ResolversTypes['DeleteDoctorResult'], ParentType, ContextType, RequireFields<MutationdeleteDoctorArgs, 'id'>>;
  deleteFamilyMember?: Resolver<ResolversTypes['DeleteFamilyMemberResult'], ParentType, ContextType, RequireFields<MutationdeleteFamilyMemberArgs, 'id'>>;
  deleteGame?: Resolver<ResolversTypes['DeleteGameResult'], ParentType, ContextType, RequireFields<MutationdeleteGameArgs, 'id'>>;
  deleteGoal?: Resolver<ResolversTypes['DeleteGoalResult'], ParentType, ContextType, RequireFields<MutationdeleteGoalArgs, 'id'>>;
  deleteHabit?: Resolver<ResolversTypes['DeleteHabitResult'], ParentType, ContextType, RequireFields<MutationdeleteHabitArgs, 'id'>>;
  deleteHabitLog?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType, RequireFields<MutationdeleteHabitLogArgs, 'id'>>;
  deleteIssue?: Resolver<ResolversTypes['DeleteIssueResult'], ParentType, ContextType, RequireFields<MutationdeleteIssueArgs, 'id'>>;
  deleteIssueScreenshot?: Resolver<ResolversTypes['DeleteIssueScreenshotResult'], ParentType, ContextType, RequireFields<MutationdeleteIssueScreenshotArgs, 'id'>>;
  deleteJournalAnalysis?: Resolver<ResolversTypes['DeleteJournalAnalysisResult'], ParentType, ContextType, RequireFields<MutationdeleteJournalAnalysisArgs, 'journalEntryId'>>;
  deleteJournalEntry?: Resolver<ResolversTypes['DeleteJournalEntryResult'], ParentType, ContextType, RequireFields<MutationdeleteJournalEntryArgs, 'id'>>;
  deleteMedication?: Resolver<ResolversTypes['DeleteMedicationResult'], ParentType, ContextType, RequireFields<MutationdeleteMedicationArgs, 'id'>>;
  deleteMemoryEntry?: Resolver<ResolversTypes['DeleteMemoryEntryResult'], ParentType, ContextType, RequireFields<MutationdeleteMemoryEntryArgs, 'id'>>;
  deleteNote?: Resolver<ResolversTypes['DeleteNoteResult'], ParentType, ContextType, RequireFields<MutationdeleteNoteArgs, 'id'>>;
  deleteProtocol?: Resolver<ResolversTypes['DeleteProtocolResult'], ParentType, ContextType, RequireFields<MutationdeleteProtocolArgs, 'id'>>;
  deleteRecommendedBooks?: Resolver<ResolversTypes['DeleteRecommendedBooksResult'], ParentType, ContextType, Partial<MutationdeleteRecommendedBooksArgs>>;
  deleteRelationship?: Resolver<ResolversTypes['DeleteRelationshipResult'], ParentType, ContextType, RequireFields<MutationdeleteRelationshipArgs, 'id'>>;
  deleteResearch?: Resolver<ResolversTypes['DeleteResearchResult'], ParentType, ContextType, RequireFields<MutationdeleteResearchArgs, 'goalId'>>;
  deleteRoutineAnalysis?: Resolver<ResolversTypes['DeleteRoutineAnalysisResult'], ParentType, ContextType, RequireFields<MutationdeleteRoutineAnalysisArgs, 'id'>>;
  deleteStory?: Resolver<ResolversTypes['DeleteStoryResult'], ParentType, ContextType, RequireFields<MutationdeleteStoryArgs, 'id'>>;
  deleteSupplement?: Resolver<ResolversTypes['DeleteSupplementResult'], ParentType, ContextType, RequireFields<MutationdeleteSupplementArgs, 'id'>>;
  deleteSymptom?: Resolver<ResolversTypes['DeleteSymptomResult'], ParentType, ContextType, RequireFields<MutationdeleteSymptomArgs, 'id'>>;
  deleteTeacherFeedback?: Resolver<ResolversTypes['DeleteTeacherFeedbackResult'], ParentType, ContextType, RequireFields<MutationdeleteTeacherFeedbackArgs, 'id'>>;
  deleteTherapeuticQuestions?: Resolver<ResolversTypes['DeleteQuestionsResult'], ParentType, ContextType, Partial<MutationdeleteTherapeuticQuestionsArgs>>;
  extractContactFeedbackIssues?: Resolver<ResolversTypes['ContactFeedback'], ParentType, ContextType, RequireFields<MutationextractContactFeedbackIssuesArgs, 'id'>>;
  generateAffirmationsForFamilyMember?: Resolver<ResolversTypes['GenerateAffirmationsResult'], ParentType, ContextType, RequireFields<MutationgenerateAffirmationsForFamilyMemberArgs, 'familyMemberId'>>;
  generateAudio?: Resolver<ResolversTypes['GenerateAudioResult'], ParentType, ContextType, RequireFields<MutationgenerateAudioArgs, 'goalId'>>;
  generateBogdanDiscussion?: Resolver<ResolversTypes['GenerateBogdanDiscussionResult'], ParentType, ContextType>;
  generateDeepAnalysis?: Resolver<ResolversTypes['GenerateDeepAnalysisResult'], ParentType, ContextType, RequireFields<MutationgenerateDeepAnalysisArgs, 'subjectId' | 'subjectType'>>;
  generateDeepIssueAnalysis?: Resolver<ResolversTypes['GenerateDeepAnalysisResult'], ParentType, ContextType, RequireFields<MutationgenerateDeepIssueAnalysisArgs, 'familyMemberId'>>;
  generateDiscussionGuide?: Resolver<ResolversTypes['GenerateDiscussionGuideResult'], ParentType, ContextType, RequireFields<MutationgenerateDiscussionGuideArgs, 'journalEntryId'>>;
  generateGame?: Resolver<ResolversTypes['Game'], ParentType, ContextType, RequireFields<MutationgenerateGameArgs, 'input'>>;
  generateHabitsForFamilyMember?: Resolver<ResolversTypes['GenerateHabitsResult'], ParentType, ContextType, RequireFields<MutationgenerateHabitsForFamilyMemberArgs, 'familyMemberId'>>;
  generateHabitsFromIssue?: Resolver<ResolversTypes['GenerateHabitsResult'], ParentType, ContextType, RequireFields<MutationgenerateHabitsFromIssueArgs, 'issueId'>>;
  generateJournalAnalysis?: Resolver<ResolversTypes['GenerateJournalAnalysisResult'], ParentType, ContextType, RequireFields<MutationgenerateJournalAnalysisArgs, 'journalEntryId'>>;
  generateLongFormText?: Resolver<ResolversTypes['GenerateLongFormTextResult'], ParentType, ContextType, Partial<MutationgenerateLongFormTextArgs>>;
  generateOpenAIAudio?: Resolver<ResolversTypes['GenerateOpenAIAudioResult'], ParentType, ContextType, RequireFields<MutationgenerateOpenAIAudioArgs, 'input'>>;
  generateParentAdvice?: Resolver<ResolversTypes['GenerateParentAdviceResult'], ParentType, ContextType, RequireFields<MutationgenerateParentAdviceArgs, 'goalId'>>;
  generateRecommendedBooks?: Resolver<ResolversTypes['GenerateRecommendedBooksResult'], ParentType, ContextType, Partial<MutationgenerateRecommendedBooksArgs>>;
  generateResearch?: Resolver<ResolversTypes['GenerateResearchResult'], ParentType, ContextType, Partial<MutationgenerateResearchArgs>>;
  generateRoutineAnalysis?: Resolver<ResolversTypes['GenerateRoutineAnalysisResult'], ParentType, ContextType, RequireFields<MutationgenerateRoutineAnalysisArgs, 'familyMemberId'>>;
  generateTherapeuticQuestions?: Resolver<ResolversTypes['GenerateQuestionsResult'], ParentType, ContextType, Partial<MutationgenerateTherapeuticQuestionsArgs>>;
  linkContactToIssue?: Resolver<ResolversTypes['IssueContactLink'], ParentType, ContextType, RequireFields<MutationlinkContactToIssueArgs, 'contactId' | 'issueId'>>;
  linkIssues?: Resolver<ResolversTypes['IssueLink'], ParentType, ContextType, RequireFields<MutationlinkIssuesArgs, 'issueId' | 'linkedIssueId'>>;
  lockVault?: Resolver<ResolversTypes['VaultStatus'], ParentType, ContextType>;
  logGameCompletion?: Resolver<ResolversTypes['GameCompletion'], ParentType, ContextType, RequireFields<MutationlogGameCompletionArgs, 'input'>>;
  logHabit?: Resolver<ResolversTypes['HabitLog'], ParentType, ContextType, RequireFields<MutationlogHabitArgs, 'habitId' | 'loggedDate'>>;
  markTeacherFeedbackExtracted?: Resolver<ResolversTypes['TeacherFeedback'], ParentType, ContextType, RequireFields<MutationmarkTeacherFeedbackExtractedArgs, 'id'>>;
  recordCognitiveBaseline?: Resolver<ResolversTypes['CognitiveBaseline'], ParentType, ContextType, RequireFields<MutationrecordCognitiveBaselineArgs, 'input' | 'protocolId'>>;
  recordCognitiveCheckIn?: Resolver<ResolversTypes['CognitiveCheckIn'], ParentType, ContextType, RequireFields<MutationrecordCognitiveCheckInArgs, 'input' | 'protocolId'>>;
  refreshClaimCard?: Resolver<ResolversTypes['ClaimCard'], ParentType, ContextType, RequireFields<MutationrefreshClaimCardArgs, 'id'>>;
  sendConversationMessage?: Resolver<ResolversTypes['Conversation'], ParentType, ContextType, RequireFields<MutationsendConversationMessageArgs, 'conversationId' | 'message'>>;
  sendHealthcareChatMessage?: Resolver<ResolversTypes['HealthcareChatResponse'], ParentType, ContextType, RequireFields<MutationsendHealthcareChatMessageArgs, 'input'>>;
  setMemoryBaseline?: Resolver<ResolversTypes['MemoryBaseline'], ParentType, ContextType, RequireFields<MutationsetMemoryBaselineArgs, 'input'>>;
  setNoteVisibility?: Resolver<ResolversTypes['Note'], ParentType, ContextType, RequireFields<MutationsetNoteVisibilityArgs, 'noteId' | 'visibility'>>;
  setTagLanguage?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType, RequireFields<MutationsetTagLanguageArgs, 'language' | 'tag'>>;
  shareFamilyMember?: Resolver<ResolversTypes['FamilyMemberShare'], ParentType, ContextType, RequireFields<MutationshareFamilyMemberArgs, 'email' | 'familyMemberId'>>;
  shareNote?: Resolver<ResolversTypes['NoteShare'], ParentType, ContextType, RequireFields<MutationshareNoteArgs, 'email' | 'noteId'>>;
  unlinkContactFromIssue?: Resolver<ResolversTypes['UnlinkContactResult'], ParentType, ContextType, RequireFields<MutationunlinkContactFromIssueArgs, 'contactId' | 'issueId'>>;
  unlinkGoalFamilyMember?: Resolver<ResolversTypes['Goal'], ParentType, ContextType, RequireFields<MutationunlinkGoalFamilyMemberArgs, 'id'>>;
  unlinkIssues?: Resolver<ResolversTypes['UnlinkIssuesResult'], ParentType, ContextType, RequireFields<MutationunlinkIssuesArgs, 'issueId' | 'linkedIssueId'>>;
  unlockVault?: Resolver<ResolversTypes['VaultUnlockResult'], ParentType, ContextType, RequireFields<MutationunlockVaultArgs, 'pin'>>;
  unshareFamilyMember?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType, RequireFields<MutationunshareFamilyMemberArgs, 'email' | 'familyMemberId'>>;
  unshareNote?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType, RequireFields<MutationunshareNoteArgs, 'email' | 'noteId'>>;
  updateAffirmation?: Resolver<ResolversTypes['Affirmation'], ParentType, ContextType, RequireFields<MutationupdateAffirmationArgs, 'id' | 'input'>>;
  updateBehaviorObservation?: Resolver<ResolversTypes['BehaviorObservation'], ParentType, ContextType, RequireFields<MutationupdateBehaviorObservationArgs, 'id' | 'input'>>;
  updateContact?: Resolver<ResolversTypes['Contact'], ParentType, ContextType, RequireFields<MutationupdateContactArgs, 'id' | 'input'>>;
  updateContactFeedback?: Resolver<ResolversTypes['ContactFeedback'], ParentType, ContextType, RequireFields<MutationupdateContactFeedbackArgs, 'id' | 'input'>>;
  updateFamilyMember?: Resolver<ResolversTypes['FamilyMember'], ParentType, ContextType, RequireFields<MutationupdateFamilyMemberArgs, 'id' | 'input'>>;
  updateGame?: Resolver<ResolversTypes['Game'], ParentType, ContextType, RequireFields<MutationupdateGameArgs, 'id' | 'input'>>;
  updateGoal?: Resolver<ResolversTypes['Goal'], ParentType, ContextType, RequireFields<MutationupdateGoalArgs, 'id' | 'input'>>;
  updateHabit?: Resolver<ResolversTypes['Habit'], ParentType, ContextType, RequireFields<MutationupdateHabitArgs, 'id' | 'input'>>;
  updateIssue?: Resolver<ResolversTypes['Issue'], ParentType, ContextType, RequireFields<MutationupdateIssueArgs, 'id' | 'input'>>;
  updateJournalEntry?: Resolver<ResolversTypes['JournalEntry'], ParentType, ContextType, RequireFields<MutationupdateJournalEntryArgs, 'id' | 'input'>>;
  updateNote?: Resolver<ResolversTypes['Note'], ParentType, ContextType, RequireFields<MutationupdateNoteArgs, 'id' | 'input'>>;
  updateProtocolStatus?: Resolver<ResolversTypes['Protocol'], ParentType, ContextType, RequireFields<MutationupdateProtocolStatusArgs, 'id' | 'status'>>;
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

export type ProtocolResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['Protocol'] = ResolversParentTypes['Protocol']> = {
  createdAt?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  endDate?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  name?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  notes?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  slug?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  startDate?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  status?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  supplementCount?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  targetAreas?: Resolver<Array<ResolversTypes['String']>, ParentType, ContextType>;
  updatedAt?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  userId?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
};

export type ProtocolDetailResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['ProtocolDetail'] = ResolversParentTypes['ProtocolDetail']> = {
  baseline?: Resolver<Maybe<ResolversTypes['CognitiveBaseline']>, ParentType, ContextType>;
  checkIns?: Resolver<Array<ResolversTypes['CognitiveCheckIn']>, ParentType, ContextType>;
  protocol?: Resolver<ResolversTypes['Protocol'], ParentType, ContextType>;
  supplements?: Resolver<Array<ResolversTypes['ProtocolSupplement']>, ParentType, ContextType>;
};

export type ProtocolSupplementResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['ProtocolSupplement'] = ResolversParentTypes['ProtocolSupplement']> = {
  createdAt?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  dosage?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  frequency?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  mechanism?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  name?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  notes?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  protocolId?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  targetAreas?: Resolver<Array<ResolversTypes['String']>, ParentType, ContextType>;
  url?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
};

export type PublicDiscussionGuideResultResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['PublicDiscussionGuideResult'] = ResolversParentTypes['PublicDiscussionGuideResult']> = {
  entryTitle?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  familyMemberName?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  guide?: Resolver<Maybe<ResolversTypes['DiscussionGuide']>, ParentType, ContextType>;
};

export type QueryResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['Query'] = ResolversParentTypes['Query']> = {
  affirmation?: Resolver<Maybe<ResolversTypes['Affirmation']>, ParentType, ContextType, RequireFields<QueryaffirmationArgs, 'id'>>;
  affirmations?: Resolver<Array<ResolversTypes['Affirmation']>, ParentType, ContextType, RequireFields<QueryaffirmationsArgs, 'familyMemberId'>>;
  allIssues?: Resolver<Array<ResolversTypes['Issue']>, ParentType, ContextType>;
  allNotes?: Resolver<Array<ResolversTypes['Note']>, ParentType, ContextType>;
  allRecommendedBooks?: Resolver<Array<ResolversTypes['RecommendedBook']>, ParentType, ContextType, Partial<QueryallRecommendedBooksArgs>>;
  allStories?: Resolver<Array<ResolversTypes['Story']>, ParentType, ContextType>;
  allTags?: Resolver<Array<ResolversTypes['String']>, ParentType, ContextType>;
  allergies?: Resolver<Array<ResolversTypes['Allergy']>, ParentType, ContextType>;
  appointments?: Resolver<Array<ResolversTypes['Appointment']>, ParentType, ContextType>;
  audioFromR2?: Resolver<Maybe<ResolversTypes['AudioFromR2Result']>, ParentType, ContextType, RequireFields<QueryaudioFromR2Args, 'key'>>;
  behaviorObservation?: Resolver<Maybe<ResolversTypes['BehaviorObservation']>, ParentType, ContextType, RequireFields<QuerybehaviorObservationArgs, 'id'>>;
  behaviorObservations?: Resolver<Array<ResolversTypes['BehaviorObservation']>, ParentType, ContextType, RequireFields<QuerybehaviorObservationsArgs, 'familyMemberId'>>;
  bloodTests?: Resolver<Array<ResolversTypes['BloodTest']>, ParentType, ContextType>;
  bogdanDiscussions?: Resolver<Array<ResolversTypes['BogdanDiscussionGuide']>, ParentType, ContextType>;
  claimCard?: Resolver<Maybe<ResolversTypes['ClaimCard']>, ParentType, ContextType, RequireFields<QueryclaimCardArgs, 'id'>>;
  claimCardsForNote?: Resolver<Array<ResolversTypes['ClaimCard']>, ParentType, ContextType, RequireFields<QueryclaimCardsForNoteArgs, 'noteId'>>;
  condition?: Resolver<Maybe<ResolversTypes['Condition']>, ParentType, ContextType, RequireFields<QueryconditionArgs, 'id'>>;
  conditions?: Resolver<Array<ResolversTypes['Condition']>, ParentType, ContextType>;
  contact?: Resolver<Maybe<ResolversTypes['Contact']>, ParentType, ContextType, Partial<QuerycontactArgs>>;
  contactFeedback?: Resolver<Maybe<ResolversTypes['ContactFeedback']>, ParentType, ContextType, RequireFields<QuerycontactFeedbackArgs, 'id'>>;
  contactFeedbacks?: Resolver<Array<ResolversTypes['ContactFeedback']>, ParentType, ContextType, RequireFields<QuerycontactFeedbacksArgs, 'contactId' | 'familyMemberId'>>;
  contacts?: Resolver<Array<ResolversTypes['Contact']>, ParentType, ContextType>;
  conversation?: Resolver<Maybe<ResolversTypes['Conversation']>, ParentType, ContextType, RequireFields<QueryconversationArgs, 'id'>>;
  conversationsForIssue?: Resolver<Array<ResolversTypes['Conversation']>, ParentType, ContextType, RequireFields<QueryconversationsForIssueArgs, 'issueId'>>;
  deepAnalyses?: Resolver<Array<ResolversTypes['DeepAnalysis']>, ParentType, ContextType, RequireFields<QuerydeepAnalysesArgs, 'subjectId' | 'subjectType'>>;
  deepAnalysis?: Resolver<Maybe<ResolversTypes['DeepAnalysis']>, ParentType, ContextType, RequireFields<QuerydeepAnalysisArgs, 'id'>>;
  deepIssueAnalyses?: Resolver<Array<ResolversTypes['DeepIssueAnalysis']>, ParentType, ContextType, RequireFields<QuerydeepIssueAnalysesArgs, 'familyMemberId'>>;
  deepIssueAnalysis?: Resolver<Maybe<ResolversTypes['DeepIssueAnalysis']>, ParentType, ContextType, RequireFields<QuerydeepIssueAnalysisArgs, 'id'>>;
  doctors?: Resolver<Array<ResolversTypes['Doctor']>, ParentType, ContextType>;
  familyMember?: Resolver<Maybe<ResolversTypes['FamilyMember']>, ParentType, ContextType, Partial<QueryfamilyMemberArgs>>;
  familyMembers?: Resolver<Array<ResolversTypes['FamilyMember']>, ParentType, ContextType>;
  game?: Resolver<Maybe<ResolversTypes['Game']>, ParentType, ContextType, RequireFields<QuerygameArgs, 'id'>>;
  gameCompletions?: Resolver<Array<ResolversTypes['GameCompletion']>, ParentType, ContextType, RequireFields<QuerygameCompletionsArgs, 'gameId'>>;
  games?: Resolver<Array<ResolversTypes['Game']>, ParentType, ContextType, Partial<QuerygamesArgs>>;
  generationJob?: Resolver<Maybe<ResolversTypes['GenerationJob']>, ParentType, ContextType, RequireFields<QuerygenerationJobArgs, 'id'>>;
  generationJobs?: Resolver<Array<ResolversTypes['GenerationJob']>, ParentType, ContextType, Partial<QuerygenerationJobsArgs>>;
  goal?: Resolver<Maybe<ResolversTypes['Goal']>, ParentType, ContextType, Partial<QuerygoalArgs>>;
  goals?: Resolver<Array<ResolversTypes['Goal']>, ParentType, ContextType, Partial<QuerygoalsArgs>>;
  habit?: Resolver<Maybe<ResolversTypes['Habit']>, ParentType, ContextType, RequireFields<QueryhabitArgs, 'id'>>;
  habits?: Resolver<Array<ResolversTypes['Habit']>, ParentType, ContextType, Partial<QueryhabitsArgs>>;
  healthcareMarkerTrend?: Resolver<Array<ResolversTypes['HealthcareMarkerTrendHit']>, ParentType, ContextType, RequireFields<QueryhealthcareMarkerTrendArgs, 'query'>>;
  healthcareSearch?: Resolver<ResolversTypes['HealthcareMultiSearchResult'], ParentType, ContextType, RequireFields<QueryhealthcareSearchArgs, 'query'>>;
  healthcareSummary?: Resolver<ResolversTypes['HealthcareSummary'], ParentType, ContextType>;
  issue?: Resolver<Maybe<ResolversTypes['Issue']>, ParentType, ContextType, RequireFields<QueryissueArgs, 'id'>>;
  issues?: Resolver<Array<ResolversTypes['Issue']>, ParentType, ContextType, RequireFields<QueryissuesArgs, 'familyMemberId'>>;
  journalEntries?: Resolver<Array<ResolversTypes['JournalEntry']>, ParentType, ContextType, Partial<QueryjournalEntriesArgs>>;
  journalEntry?: Resolver<Maybe<ResolversTypes['JournalEntry']>, ParentType, ContextType, RequireFields<QueryjournalEntryArgs, 'id'>>;
  latestBogdanDiscussion?: Resolver<Maybe<ResolversTypes['BogdanDiscussionGuide']>, ParentType, ContextType>;
  medications?: Resolver<Array<ResolversTypes['Medication']>, ParentType, ContextType>;
  memoryBaseline?: Resolver<Maybe<ResolversTypes['MemoryBaseline']>, ParentType, ContextType>;
  memoryEntries?: Resolver<Array<ResolversTypes['MemoryEntry']>, ParentType, ContextType>;
  mySharedFamilyMembers?: Resolver<Array<ResolversTypes['FamilyMember']>, ParentType, ContextType>;
  mySharedNotes?: Resolver<Array<ResolversTypes['Note']>, ParentType, ContextType>;
  note?: Resolver<Maybe<ResolversTypes['Note']>, ParentType, ContextType, Partial<QuerynoteArgs>>;
  notes?: Resolver<Array<ResolversTypes['Note']>, ParentType, ContextType, RequireFields<QuerynotesArgs, 'entityId' | 'entityType'>>;
  protocol?: Resolver<Maybe<ResolversTypes['ProtocolDetail']>, ParentType, ContextType, RequireFields<QueryprotocolArgs, 'slug'>>;
  protocols?: Resolver<Array<ResolversTypes['Protocol']>, ParentType, ContextType>;
  publicDiscussionGuide?: Resolver<Maybe<ResolversTypes['PublicDiscussionGuideResult']>, ParentType, ContextType, RequireFields<QuerypublicDiscussionGuideArgs, 'journalEntryId'>>;
  recommendedBooks?: Resolver<Array<ResolversTypes['RecommendedBook']>, ParentType, ContextType, Partial<QueryrecommendedBooksArgs>>;
  relationship?: Resolver<Maybe<ResolversTypes['Relationship']>, ParentType, ContextType, RequireFields<QueryrelationshipArgs, 'id'>>;
  relationships?: Resolver<Array<ResolversTypes['Relationship']>, ParentType, ContextType, RequireFields<QueryrelationshipsArgs, 'subjectId' | 'subjectType'>>;
  research?: Resolver<Array<ResolversTypes['Research']>, ParentType, ContextType, Partial<QueryresearchArgs>>;
  routineAnalyses?: Resolver<Array<ResolversTypes['RoutineAnalysis']>, ParentType, ContextType, RequireFields<QueryroutineAnalysesArgs, 'familyMemberId'>>;
  routineAnalysis?: Resolver<Maybe<ResolversTypes['RoutineAnalysis']>, ParentType, ContextType, RequireFields<QueryroutineAnalysisArgs, 'id'>>;
  stories?: Resolver<Array<ResolversTypes['Story']>, ParentType, ContextType, RequireFields<QuerystoriesArgs, 'goalId'>>;
  story?: Resolver<Maybe<ResolversTypes['Story']>, ParentType, ContextType, RequireFields<QuerystoryArgs, 'id'>>;
  symptoms?: Resolver<Array<ResolversTypes['Symptom']>, ParentType, ContextType>;
  tagLanguage?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType, RequireFields<QuerytagLanguageArgs, 'tag'>>;
  teacherFeedback?: Resolver<Maybe<ResolversTypes['TeacherFeedback']>, ParentType, ContextType, RequireFields<QueryteacherFeedbackArgs, 'id'>>;
  teacherFeedbacks?: Resolver<Array<ResolversTypes['TeacherFeedback']>, ParentType, ContextType, RequireFields<QueryteacherFeedbacksArgs, 'familyMemberId'>>;
  therapeuticQuestions?: Resolver<Array<ResolversTypes['TherapeuticQuestion']>, ParentType, ContextType, Partial<QuerytherapeuticQuestionsArgs>>;
  userSettings?: Resolver<ResolversTypes['UserSettings'], ParentType, ContextType>;
  vaultStatus?: Resolver<ResolversTypes['VaultStatus'], ParentType, ContextType>;
};

export type RecommendedBookResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['RecommendedBook'] = ResolversParentTypes['RecommendedBook']> = {
  amazonUrl?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  authors?: Resolver<Array<ResolversTypes['String']>, ParentType, ContextType>;
  category?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  createdAt?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  description?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  generatedAt?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  goalId?: Resolver<Maybe<ResolversTypes['Int']>, ParentType, ContextType>;
  id?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  isbn?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  journalEntryId?: Resolver<Maybe<ResolversTypes['Int']>, ParentType, ContextType>;
  title?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  updatedAt?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  whyRecommended?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  year?: Resolver<Maybe<ResolversTypes['Int']>, ParentType, ContextType>;
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
  journalEntryId?: Resolver<Maybe<ResolversTypes['Int']>, ParentType, ContextType>;
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

export type RoutineAnalysisResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['RoutineAnalysis'] = ResolversParentTypes['RoutineAnalysis']> = {
  adherencePatterns?: Resolver<Array<ResolversTypes['HabitAdherence']>, ParentType, ContextType>;
  createdAt?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  createdBy?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  dataSnapshot?: Resolver<ResolversTypes['RoutineDataSnapshot'], ParentType, ContextType>;
  familyMember?: Resolver<Maybe<ResolversTypes['FamilyMember']>, ParentType, ContextType>;
  familyMemberId?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  gaps?: Resolver<Array<ResolversTypes['RoutineGap']>, ParentType, ContextType>;
  id?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  jobId?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  model?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  optimizationSuggestions?: Resolver<Array<ResolversTypes['RoutineOptimization']>, ParentType, ContextType>;
  researchRelevance?: Resolver<Array<ResolversTypes['RoutineResearchMapping']>, ParentType, ContextType>;
  routineBalance?: Resolver<ResolversTypes['RoutineBalance'], ParentType, ContextType>;
  streaks?: Resolver<ResolversTypes['StreakSummary'], ParentType, ContextType>;
  summary?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  updatedAt?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
};

export type RoutineBalanceResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['RoutineBalance'] = ResolversParentTypes['RoutineBalance']> = {
  domainsCovered?: Resolver<Array<ResolversTypes['String']>, ParentType, ContextType>;
  domainsMissing?: Resolver<Array<ResolversTypes['String']>, ParentType, ContextType>;
  overEmphasized?: Resolver<Array<ResolversTypes['String']>, ParentType, ContextType>;
  underEmphasized?: Resolver<Array<ResolversTypes['String']>, ParentType, ContextType>;
  verdict?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
};

export type RoutineDataSnapshotResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['RoutineDataSnapshot'] = ResolversParentTypes['RoutineDataSnapshot']> = {
  activeDailyCount?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  activeWeeklyCount?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  contactFeedbackCount?: Resolver<Maybe<ResolversTypes['Int']>, ParentType, ContextType>;
  habitsCount?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  issueCount?: Resolver<Maybe<ResolversTypes['Int']>, ParentType, ContextType>;
  journalEntryCount?: Resolver<Maybe<ResolversTypes['Int']>, ParentType, ContextType>;
  linkedGoalCount?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  linkedIssueCount?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  logCount?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  narrowTherapyHabitsCount?: Resolver<Maybe<ResolversTypes['Int']>, ParentType, ContextType>;
  observationCount?: Resolver<Maybe<ResolversTypes['Int']>, ParentType, ContextType>;
  overallAdherence?: Resolver<ResolversTypes['Float'], ParentType, ContextType>;
  researchPaperCount?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  teacherFeedbackCount?: Resolver<Maybe<ResolversTypes['Int']>, ParentType, ContextType>;
  windowDays?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
};

export type RoutineGapResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['RoutineGap'] = ResolversParentTypes['RoutineGap']> = {
  area?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  rationale?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  severity?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
};

export type RoutineOptimizationResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['RoutineOptimization'] = ResolversParentTypes['RoutineOptimization']> = {
  ageAppropriate?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  changeType?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  concreteSteps?: Resolver<Array<ResolversTypes['String']>, ParentType, ContextType>;
  developmentalContext?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  priority?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  rationale?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  suggestedFrequency?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  suggestedTargetCount?: Resolver<Maybe<ResolversTypes['Int']>, ParentType, ContextType>;
  targetHabitId?: Resolver<Maybe<ResolversTypes['Int']>, ParentType, ContextType>;
  title?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
};

export type RoutineResearchMappingResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['RoutineResearchMapping'] = ResolversParentTypes['RoutineResearchMapping']> = {
  coverageGaps?: Resolver<Array<ResolversTypes['String']>, ParentType, ContextType>;
  relevantResearchIds?: Resolver<Array<ResolversTypes['Int']>, ParentType, ContextType>;
  relevantResearchTitles?: Resolver<Array<ResolversTypes['String']>, ParentType, ContextType>;
  topic?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
};

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

export type StreakSummaryResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['StreakSummary'] = ResolversParentTypes['StreakSummary']> = {
  momentum?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  strongestHabitId?: Resolver<Maybe<ResolversTypes['Int']>, ParentType, ContextType>;
  strongestStreak?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  weakestHabitId?: Resolver<Maybe<ResolversTypes['Int']>, ParentType, ContextType>;
  weakestStreak?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
};

export type SubscriptionResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['Subscription'] = ResolversParentTypes['Subscription']> = {
  audioJobStatus?: SubscriptionResolver<ResolversTypes['GenerationJob'], "audioJobStatus", ParentType, ContextType, RequireFields<SubscriptionaudioJobStatusArgs, 'jobId'>>;
  researchJobStatus?: SubscriptionResolver<ResolversTypes['GenerationJob'], "researchJobStatus", ParentType, ContextType, RequireFields<SubscriptionresearchJobStatusArgs, 'jobId'>>;
};

export type SymptomResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['Symptom'] = ResolversParentTypes['Symptom']> = {
  createdAt?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  description?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  loggedAt?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  severity?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  userId?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
};

export type TalkingPointResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['TalkingPoint'] = ResolversParentTypes['TalkingPoint']> = {
  citations?: Resolver<Maybe<Array<ResolversTypes['Citation']>>, ParentType, ContextType>;
  explanation?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  microScript?: Resolver<Maybe<ResolversTypes['MicroScript']>, ParentType, ContextType>;
  point?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  relatedResearchIds?: Resolver<Maybe<Array<ResolversTypes['Int']>>, ParentType, ContextType>;
  researchBacking?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
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

export type TherapeuticInsightResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['TherapeuticInsight'] = ResolversParentTypes['TherapeuticInsight']> = {
  clinicalRelevance?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  observation?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  relatedResearchIds?: Resolver<Maybe<Array<ResolversTypes['Int']>>, ParentType, ContextType>;
  title?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
};

export type TherapeuticQuestionResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['TherapeuticQuestion'] = ResolversParentTypes['TherapeuticQuestion']> = {
  createdAt?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  generatedAt?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  goalId?: Resolver<Maybe<ResolversTypes['Int']>, ParentType, ContextType>;
  id?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  issueId?: Resolver<Maybe<ResolversTypes['Int']>, ParentType, ContextType>;
  journalEntryId?: Resolver<Maybe<ResolversTypes['Int']>, ParentType, ContextType>;
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

export type VaultStatusResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['VaultStatus'] = ResolversParentTypes['VaultStatus']> = {
  available?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  unlocked?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
};

export type VaultUnlockResultResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['VaultUnlockResult'] = ResolversParentTypes['VaultUnlockResult']> = {
  message?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  success?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  unlocked?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
};

export type Resolvers<ContextType = GraphQLContext> = {
  ActionableRecommendation?: ActionableRecommendationResolvers<ContextType>;
  Affirmation?: AffirmationResolvers<ContextType>;
  AffirmationCategory?: AffirmationCategoryResolvers;
  Allergy?: AllergyResolvers<ContextType>;
  AllergyKind?: AllergyKindResolvers;
  AnticipatedReaction?: AnticipatedReactionResolvers<ContextType>;
  Appointment?: AppointmentResolvers<ContextType>;
  AudioAsset?: AudioAssetResolvers<ContextType>;
  AudioFromR2Result?: AudioFromR2ResultResolvers<ContextType>;
  AudioManifest?: AudioManifestResolvers<ContextType>;
  AudioMetadata?: AudioMetadataResolvers<ContextType>;
  AudioSegmentInfo?: AudioSegmentInfoResolvers<ContextType>;
  BehaviorIntensity?: BehaviorIntensityResolvers;
  BehaviorObservation?: BehaviorObservationResolvers<ContextType>;
  BehaviorObservationType?: BehaviorObservationTypeResolvers;
  BloodTest?: BloodTestResolvers<ContextType>;
  BogdanDiscussionGuide?: BogdanDiscussionGuideResolvers<ContextType>;
  BuildClaimCardsResult?: BuildClaimCardsResultResolvers<ContextType>;
  CheckNoteClaimsResult?: CheckNoteClaimsResultResolvers<ContextType>;
  Citation?: CitationResolvers<ContextType>;
  ClaimCard?: ClaimCardResolvers<ContextType>;
  ClaimProvenance?: ClaimProvenanceResolvers<ContextType>;
  ClaimScope?: ClaimScopeResolvers<ContextType>;
  ClaimVerdict?: ClaimVerdictResolvers;
  CognitiveBaseline?: CognitiveBaselineResolvers<ContextType>;
  CognitiveCheckIn?: CognitiveCheckInResolvers<ContextType>;
  Condition?: ConditionResolvers<ContextType>;
  Contact?: ContactResolvers<ContextType>;
  ContactFeedback?: ContactFeedbackResolvers<ContextType>;
  Conversation?: ConversationResolvers<ContextType>;
  ConversationMessage?: ConversationMessageResolvers<ContextType>;
  ConversationStarter?: ConversationStarterResolvers<ContextType>;
  CritiqueScores?: CritiqueScoresResolvers<ContextType>;
  DataSnapshot?: DataSnapshotResolvers<ContextType>;
  DeepAnalysis?: DeepAnalysisResolvers<ContextType>;
  DeepAnalysisSubjectType?: DeepAnalysisSubjectTypeResolvers;
  DeepAnalysisTriggerType?: DeepAnalysisTriggerTypeResolvers;
  DeepIssueAnalysis?: DeepIssueAnalysisResolvers<ContextType>;
  DeleteAffirmationResult?: DeleteAffirmationResultResolvers<ContextType>;
  DeleteAllergyResult?: DeleteAllergyResultResolvers<ContextType>;
  DeleteAppointmentResult?: DeleteAppointmentResultResolvers<ContextType>;
  DeleteBehaviorObservationResult?: DeleteBehaviorObservationResultResolvers<ContextType>;
  DeleteBloodTestResult?: DeleteBloodTestResultResolvers<ContextType>;
  DeleteConditionResult?: DeleteConditionResultResolvers<ContextType>;
  DeleteContactFeedbackResult?: DeleteContactFeedbackResultResolvers<ContextType>;
  DeleteContactResult?: DeleteContactResultResolvers<ContextType>;
  DeleteConversationResult?: DeleteConversationResultResolvers<ContextType>;
  DeleteDeepAnalysisResult?: DeleteDeepAnalysisResultResolvers<ContextType>;
  DeleteDiscussionGuideResult?: DeleteDiscussionGuideResultResolvers<ContextType>;
  DeleteDoctorResult?: DeleteDoctorResultResolvers<ContextType>;
  DeleteFamilyMemberResult?: DeleteFamilyMemberResultResolvers<ContextType>;
  DeleteGameResult?: DeleteGameResultResolvers<ContextType>;
  DeleteGoalResult?: DeleteGoalResultResolvers<ContextType>;
  DeleteHabitResult?: DeleteHabitResultResolvers<ContextType>;
  DeleteIssueResult?: DeleteIssueResultResolvers<ContextType>;
  DeleteIssueScreenshotResult?: DeleteIssueScreenshotResultResolvers<ContextType>;
  DeleteJournalAnalysisResult?: DeleteJournalAnalysisResultResolvers<ContextType>;
  DeleteJournalEntryResult?: DeleteJournalEntryResultResolvers<ContextType>;
  DeleteMedicationResult?: DeleteMedicationResultResolvers<ContextType>;
  DeleteMemoryEntryResult?: DeleteMemoryEntryResultResolvers<ContextType>;
  DeleteNoteResult?: DeleteNoteResultResolvers<ContextType>;
  DeleteProtocolResult?: DeleteProtocolResultResolvers<ContextType>;
  DeleteQuestionsResult?: DeleteQuestionsResultResolvers<ContextType>;
  DeleteRecommendedBooksResult?: DeleteRecommendedBooksResultResolvers<ContextType>;
  DeleteRelationshipResult?: DeleteRelationshipResultResolvers<ContextType>;
  DeleteResearchResult?: DeleteResearchResultResolvers<ContextType>;
  DeleteRoutineAnalysisResult?: DeleteRoutineAnalysisResultResolvers<ContextType>;
  DeleteStoryResult?: DeleteStoryResultResolvers<ContextType>;
  DeleteSupplementResult?: DeleteSupplementResultResolvers<ContextType>;
  DeleteSymptomResult?: DeleteSymptomResultResolvers<ContextType>;
  DeleteTeacherFeedbackResult?: DeleteTeacherFeedbackResultResolvers<ContextType>;
  DevelopmentalContext?: DevelopmentalContextResolvers<ContextType>;
  DevelopmentalTier?: DevelopmentalTierResolvers;
  DiscussionGuide?: DiscussionGuideResolvers<ContextType>;
  DiscussionGuideCritique?: DiscussionGuideCritiqueResolvers<ContextType>;
  Doctor?: DoctorResolvers<ContextType>;
  EmotionalLandscape?: EmotionalLandscapeResolvers<ContextType>;
  EvidenceItem?: EvidenceItemResolvers<ContextType>;
  EvidenceLocator?: EvidenceLocatorResolvers<ContextType>;
  EvidencePolarity?: EvidencePolarityResolvers;
  ExtractedIssue?: ExtractedIssueResolvers<ContextType>;
  FamilyMember?: FamilyMemberResolvers<ContextType>;
  FamilyMemberShare?: FamilyMemberShareResolvers<ContextType>;
  FamilyMemberShareRole?: FamilyMemberShareRoleResolvers;
  FamilySystemInsight?: FamilySystemInsightResolvers<ContextType>;
  FeedbackSource?: FeedbackSourceResolvers;
  FollowUpStep?: FollowUpStepResolvers<ContextType>;
  Game?: GameResolvers<ContextType>;
  GameCompletion?: GameCompletionResolvers<ContextType>;
  GameSource?: GameSourceResolvers;
  GameType?: GameTypeResolvers;
  GenerateAffirmationsResult?: GenerateAffirmationsResultResolvers<ContextType>;
  GenerateAudioResult?: GenerateAudioResultResolvers<ContextType>;
  GenerateBogdanDiscussionResult?: GenerateBogdanDiscussionResultResolvers<ContextType>;
  GenerateDeepAnalysisResult?: GenerateDeepAnalysisResultResolvers<ContextType>;
  GenerateDiscussionGuideResult?: GenerateDiscussionGuideResultResolvers<ContextType>;
  GenerateHabitsResult?: GenerateHabitsResultResolvers<ContextType>;
  GenerateJournalAnalysisResult?: GenerateJournalAnalysisResultResolvers<ContextType>;
  GenerateLongFormTextResult?: GenerateLongFormTextResultResolvers<ContextType>;
  GenerateOpenAIAudioResult?: GenerateOpenAIAudioResultResolvers<ContextType>;
  GenerateParentAdviceResult?: GenerateParentAdviceResultResolvers<ContextType>;
  GenerateQuestionsResult?: GenerateQuestionsResultResolvers<ContextType>;
  GenerateRecommendedBooksResult?: GenerateRecommendedBooksResultResolvers<ContextType>;
  GenerateResearchResult?: GenerateResearchResultResolvers<ContextType>;
  GenerateRoutineAnalysisResult?: GenerateRoutineAnalysisResultResolvers<ContextType>;
  GenerationJob?: GenerationJobResolvers<ContextType>;
  Goal?: GoalResolvers<ContextType>;
  Habit?: HabitResolvers<ContextType>;
  HabitAdherence?: HabitAdherenceResolvers<ContextType>;
  HabitFrequency?: HabitFrequencyResolvers;
  HabitLog?: HabitLogResolvers<ContextType>;
  HabitStatus?: HabitStatusResolvers;
  HealthcareChatResponse?: HealthcareChatResponseResolvers<ContextType>;
  HealthcareMarkerTrendHit?: HealthcareMarkerTrendHitResolvers<ContextType>;
  HealthcareMultiSearchResult?: HealthcareMultiSearchResultResolvers<ContextType>;
  HealthcareSearchHit?: HealthcareSearchHitResolvers<ContextType>;
  HealthcareSearchMarkerHit?: HealthcareSearchMarkerHitResolvers<ContextType>;
  HealthcareSearchTestHit?: HealthcareSearchTestHitResolvers<ContextType>;
  HealthcareSummary?: HealthcareSummaryResolvers<ContextType>;
  Issue?: IssueResolvers<ContextType>;
  IssueContactLink?: IssueContactLinkResolvers<ContextType>;
  IssueLink?: IssueLinkResolvers<ContextType>;
  IssueScreenshot?: IssueScreenshotResolvers<ContextType>;
  JobError?: JobErrorResolvers<ContextType>;
  JobResult?: JobResultResolvers<ContextType>;
  JobStatus?: JobStatusResolvers;
  JobType?: JobTypeResolvers;
  JournalAnalysis?: JournalAnalysisResolvers<ContextType>;
  JournalEntry?: JournalEntryResolvers<ContextType>;
  LanguageExample?: LanguageExampleResolvers<ContextType>;
  LanguageGuide?: LanguageGuideResolvers<ContextType>;
  Medication?: MedicationResolvers<ContextType>;
  MemoryBaseline?: MemoryBaselineResolvers<ContextType>;
  MemoryEntry?: MemoryEntryResolvers<ContextType>;
  MicroScript?: MicroScriptResolvers<ContextType>;
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
  Protocol?: ProtocolResolvers<ContextType>;
  ProtocolDetail?: ProtocolDetailResolvers<ContextType>;
  ProtocolSupplement?: ProtocolSupplementResolvers<ContextType>;
  PublicDiscussionGuideResult?: PublicDiscussionGuideResultResolvers<ContextType>;
  Query?: QueryResolvers<ContextType>;
  RecommendedBook?: RecommendedBookResolvers<ContextType>;
  Relationship?: RelationshipResolvers<ContextType>;
  RelationshipPerson?: RelationshipPersonResolvers<ContextType>;
  RelationshipStatus?: RelationshipStatusResolvers;
  Research?: ResearchResolvers<ContextType>;
  ResearchRelevanceMapping?: ResearchRelevanceMappingResolvers<ContextType>;
  ResearchSource?: ResearchSourceResolvers;
  RoutineAnalysis?: RoutineAnalysisResolvers<ContextType>;
  RoutineBalance?: RoutineBalanceResolvers<ContextType>;
  RoutineDataSnapshot?: RoutineDataSnapshotResolvers<ContextType>;
  RoutineGap?: RoutineGapResolvers<ContextType>;
  RoutineOptimization?: RoutineOptimizationResolvers<ContextType>;
  RoutineResearchMapping?: RoutineResearchMappingResolvers<ContextType>;
  Story?: StoryResolvers<ContextType>;
  StreakSummary?: StreakSummaryResolvers<ContextType>;
  Subscription?: SubscriptionResolvers<ContextType>;
  Symptom?: SymptomResolvers<ContextType>;
  TalkingPoint?: TalkingPointResolvers<ContextType>;
  TeacherFeedback?: TeacherFeedbackResolvers<ContextType>;
  TextSegment?: TextSegmentResolvers<ContextType>;
  TherapeuticInsight?: TherapeuticInsightResolvers<ContextType>;
  TherapeuticQuestion?: TherapeuticQuestionResolvers<ContextType>;
  TimelineAnalysis?: TimelineAnalysisResolvers<ContextType>;
  TimelinePhase?: TimelinePhaseResolvers<ContextType>;
  UnlinkContactResult?: UnlinkContactResultResolvers<ContextType>;
  UnlinkIssuesResult?: UnlinkIssuesResultResolvers<ContextType>;
  UserSettings?: UserSettingsResolvers<ContextType>;
  VaultStatus?: VaultStatusResolvers<ContextType>;
  VaultUnlockResult?: VaultUnlockResultResolvers<ContextType>;
};

