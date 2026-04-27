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

export enum AffirmationCategory {
  Encouragement = 'ENCOURAGEMENT',
  Gratitude = 'GRATITUDE',
  Growth = 'GROWTH',
  SelfWorth = 'SELF_WORTH',
  Strength = 'STRENGTH'
}

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

export enum AllergyKind {
  Allergy = 'allergy',
  Intolerance = 'intolerance'
}

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

export enum BehaviorIntensity {
  High = 'HIGH',
  Low = 'LOW',
  Medium = 'MEDIUM'
}

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

export enum BehaviorObservationType {
  Avoidance = 'AVOIDANCE',
  Partial = 'PARTIAL',
  Refusal = 'REFUSAL',
  TargetOccurred = 'TARGET_OCCURRED'
}

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

export enum ClaimVerdict {
  Contradicted = 'CONTRADICTED',
  Insufficient = 'INSUFFICIENT',
  Mixed = 'MIXED',
  Supported = 'SUPPORTED',
  Unverified = 'UNVERIFIED'
}

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

export enum DeepAnalysisSubjectType {
  FamilyMember = 'FAMILY_MEMBER',
  Goal = 'GOAL',
  JournalEntry = 'JOURNAL_ENTRY',
  Note = 'NOTE'
}

export enum DeepAnalysisTriggerType {
  Feedback = 'FEEDBACK',
  Issue = 'ISSUE',
  Observation = 'OBSERVATION'
}

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

export enum DevelopmentalTier {
  Adult = 'ADULT',
  EarlyAdolescence = 'EARLY_ADOLESCENCE',
  EarlyChildhood = 'EARLY_CHILDHOOD',
  LateAdolescence = 'LATE_ADOLESCENCE',
  MiddleChildhood = 'MIDDLE_CHILDHOOD'
}

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

export enum EvidencePolarity {
  Contradicts = 'CONTRADICTS',
  Irrelevant = 'IRRELEVANT',
  Mixed = 'MIXED',
  Supports = 'SUPPORTS'
}

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


export type FamilyMemberBehaviorObservationsArgs = {
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

export enum FamilyMemberShareRole {
  Editor = 'EDITOR'
}

export type FamilySystemInsight = {
  __typename?: 'FamilySystemInsight';
  actionable: Scalars['Boolean']['output'];
  evidenceIssueIds: Array<Scalars['Int']['output']>;
  insight: Scalars['String']['output'];
  involvedMemberIds: Array<Scalars['Int']['output']>;
  involvedMemberNames: Array<Scalars['String']['output']>;
  systemicPattern?: Maybe<Scalars['String']['output']>;
};

export enum FeedbackSource {
  Email = 'EMAIL',
  Meeting = 'MEETING',
  Note = 'NOTE',
  Other = 'OTHER',
  Phone = 'PHONE',
  Report = 'REPORT'
}

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

export enum GameSource {
  Ai = 'AI',
  Seed = 'SEED',
  User = 'USER'
}

export enum GameType {
  CbtReframe = 'CBT_REFRAME',
  JournalPrompt = 'JOURNAL_PROMPT',
  Mindfulness = 'MINDFULNESS'
}

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

export type GenerateOpenAiAudioInput = {
  instructions?: InputMaybe<Scalars['String']['input']>;
  model?: InputMaybe<OpenAittsModel>;
  responseFormat?: InputMaybe<OpenAiAudioFormat>;
  speed?: InputMaybe<Scalars['Float']['input']>;
  storyId?: InputMaybe<Scalars['Int']['input']>;
  streamFormat?: InputMaybe<OpenAiStreamFormat>;
  text: Scalars['String']['input'];
  uploadToCloud?: InputMaybe<Scalars['Boolean']['input']>;
  voice?: InputMaybe<OpenAittsVoice>;
};

export type GenerateOpenAiAudioResult = {
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

export enum HabitFrequency {
  Daily = 'DAILY',
  Weekly = 'WEEKLY'
}

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

export enum HabitStatus {
  Active = 'ACTIVE',
  Archived = 'ARCHIVED',
  Paused = 'PAUSED'
}

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

export enum JobStatus {
  Failed = 'FAILED',
  Running = 'RUNNING',
  Succeeded = 'SUCCEEDED'
}

export enum JobType {
  Audio = 'AUDIO',
  DeepAnalysis = 'DEEP_ANALYSIS',
  Longform = 'LONGFORM',
  Questions = 'QUESTIONS',
  RecommendedBooks = 'RECOMMENDED_BOOKS',
  Research = 'RESEARCH',
  RoutineAnalysis = 'ROUTINE_ANALYSIS'
}

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
  generateOpenAIAudio: GenerateOpenAiAudioResult;
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


export type MutationAddAllergyArgs = {
  input: AddAllergyInput;
};


export type MutationAddAppointmentArgs = {
  input: AddAppointmentInput;
};


export type MutationAddConditionArgs = {
  input: AddConditionInput;
};


export type MutationAddDoctorArgs = {
  input: AddDoctorInput;
};


export type MutationAddMedicationArgs = {
  input: AddMedicationInput;
};


export type MutationAddMemoryEntryArgs = {
  input: AddMemoryEntryInput;
};


export type MutationAddProtocolArgs = {
  input: AddProtocolInput;
};


export type MutationAddSupplementArgs = {
  input: AddSupplementInput;
  protocolId: Scalars['ID']['input'];
};


export type MutationAddSymptomArgs = {
  input: AddSymptomInput;
};


export type MutationBuildClaimCardsArgs = {
  input: BuildClaimCardsInput;
};


export type MutationCheckNoteClaimsArgs = {
  input: CheckNoteClaimsInput;
};


export type MutationConvertIssueToGoalArgs = {
  id: Scalars['Int']['input'];
  input: CreateGoalInput;
};


export type MutationConvertJournalEntryToIssueArgs = {
  id: Scalars['Int']['input'];
  input: ConvertJournalEntryToIssueInput;
};


export type MutationCreateAffirmationArgs = {
  input: CreateAffirmationInput;
};


export type MutationCreateContactArgs = {
  input: CreateContactInput;
};


export type MutationCreateContactFeedbackArgs = {
  input: CreateContactFeedbackInput;
};


export type MutationCreateConversationArgs = {
  issueId: Scalars['Int']['input'];
  message: Scalars['String']['input'];
};


export type MutationCreateFamilyMemberArgs = {
  input: CreateFamilyMemberInput;
};


export type MutationCreateGameArgs = {
  input: CreateGameInput;
};


export type MutationCreateGoalArgs = {
  input: CreateGoalInput;
};


export type MutationCreateHabitArgs = {
  input: CreateHabitInput;
};


export type MutationCreateIssueArgs = {
  input: CreateIssueInput;
};


export type MutationCreateJournalEntryArgs = {
  input: CreateJournalEntryInput;
};


export type MutationCreateNoteArgs = {
  input: CreateNoteInput;
};


export type MutationCreateRelatedIssueArgs = {
  input: CreateIssueInput;
  issueId: Scalars['Int']['input'];
  linkType?: InputMaybe<Scalars['String']['input']>;
};


export type MutationCreateRelationshipArgs = {
  input: CreateRelationshipInput;
};


export type MutationCreateStoryArgs = {
  input: CreateStoryInput;
};


export type MutationCreateSubGoalArgs = {
  goalId: Scalars['Int']['input'];
  input: CreateSubGoalInput;
};


export type MutationCreateTeacherFeedbackArgs = {
  input: CreateTeacherFeedbackInput;
};


export type MutationDeleteAffirmationArgs = {
  id: Scalars['Int']['input'];
};


export type MutationDeleteAllergyArgs = {
  id: Scalars['ID']['input'];
};


export type MutationDeleteAppointmentArgs = {
  id: Scalars['ID']['input'];
};


export type MutationDeleteBehaviorObservationArgs = {
  id: Scalars['Int']['input'];
};


export type MutationDeleteBloodTestArgs = {
  id: Scalars['ID']['input'];
};


export type MutationDeleteClaimCardArgs = {
  id: Scalars['ID']['input'];
};


export type MutationDeleteConditionArgs = {
  id: Scalars['ID']['input'];
};


export type MutationDeleteContactArgs = {
  id: Scalars['Int']['input'];
};


export type MutationDeleteContactFeedbackArgs = {
  id: Scalars['Int']['input'];
};


export type MutationDeleteConversationArgs = {
  id: Scalars['Int']['input'];
};


export type MutationDeleteDeepAnalysisArgs = {
  id: Scalars['Int']['input'];
};


export type MutationDeleteDeepIssueAnalysisArgs = {
  id: Scalars['Int']['input'];
};


export type MutationDeleteDiscussionGuideArgs = {
  journalEntryId: Scalars['Int']['input'];
};


export type MutationDeleteDoctorArgs = {
  id: Scalars['ID']['input'];
};


export type MutationDeleteFamilyMemberArgs = {
  id: Scalars['Int']['input'];
};


export type MutationDeleteGameArgs = {
  id: Scalars['Int']['input'];
};


export type MutationDeleteGoalArgs = {
  id: Scalars['Int']['input'];
};


export type MutationDeleteHabitArgs = {
  id: Scalars['Int']['input'];
};


export type MutationDeleteHabitLogArgs = {
  id: Scalars['Int']['input'];
};


export type MutationDeleteIssueArgs = {
  id: Scalars['Int']['input'];
};


export type MutationDeleteIssueScreenshotArgs = {
  id: Scalars['Int']['input'];
};


export type MutationDeleteJournalAnalysisArgs = {
  journalEntryId: Scalars['Int']['input'];
};


export type MutationDeleteJournalEntryArgs = {
  id: Scalars['Int']['input'];
};


export type MutationDeleteMedicationArgs = {
  id: Scalars['ID']['input'];
};


export type MutationDeleteMemoryEntryArgs = {
  id: Scalars['ID']['input'];
};


export type MutationDeleteNoteArgs = {
  id: Scalars['Int']['input'];
};


export type MutationDeleteProtocolArgs = {
  id: Scalars['ID']['input'];
};


export type MutationDeleteRecommendedBooksArgs = {
  goalId?: InputMaybe<Scalars['Int']['input']>;
  journalEntryId?: InputMaybe<Scalars['Int']['input']>;
};


export type MutationDeleteRelationshipArgs = {
  id: Scalars['Int']['input'];
};


export type MutationDeleteResearchArgs = {
  goalId: Scalars['Int']['input'];
};


export type MutationDeleteRoutineAnalysisArgs = {
  id: Scalars['Int']['input'];
};


export type MutationDeleteStoryArgs = {
  id: Scalars['Int']['input'];
};


export type MutationDeleteSupplementArgs = {
  id: Scalars['ID']['input'];
};


export type MutationDeleteSymptomArgs = {
  id: Scalars['ID']['input'];
};


export type MutationDeleteTeacherFeedbackArgs = {
  id: Scalars['Int']['input'];
};


export type MutationDeleteTherapeuticQuestionsArgs = {
  goalId?: InputMaybe<Scalars['Int']['input']>;
  issueId?: InputMaybe<Scalars['Int']['input']>;
  journalEntryId?: InputMaybe<Scalars['Int']['input']>;
};


export type MutationExtractContactFeedbackIssuesArgs = {
  id: Scalars['Int']['input'];
};


export type MutationGenerateAffirmationsForFamilyMemberArgs = {
  categoryFocus?: InputMaybe<AffirmationCategory>;
  count?: InputMaybe<Scalars['Int']['input']>;
  familyMemberId: Scalars['Int']['input'];
  language?: InputMaybe<Scalars['String']['input']>;
};


export type MutationGenerateAudioArgs = {
  goalId: Scalars['Int']['input'];
  language?: InputMaybe<Scalars['String']['input']>;
  storyId?: InputMaybe<Scalars['Int']['input']>;
  text?: InputMaybe<Scalars['String']['input']>;
  voice?: InputMaybe<Scalars['String']['input']>;
};


export type MutationGenerateDeepAnalysisArgs = {
  subjectId: Scalars['Int']['input'];
  subjectType: DeepAnalysisSubjectType;
  triggerId?: InputMaybe<Scalars['Int']['input']>;
  triggerType?: InputMaybe<DeepAnalysisTriggerType>;
};


export type MutationGenerateDeepIssueAnalysisArgs = {
  familyMemberId: Scalars['Int']['input'];
  triggerIssueId?: InputMaybe<Scalars['Int']['input']>;
};


export type MutationGenerateDiscussionGuideArgs = {
  journalEntryId: Scalars['Int']['input'];
};


export type MutationGenerateGameArgs = {
  input: GenerateGameInput;
};


export type MutationGenerateHabitsForFamilyMemberArgs = {
  count?: InputMaybe<Scalars['Int']['input']>;
  familyMemberId: Scalars['Int']['input'];
};


export type MutationGenerateHabitsFromIssueArgs = {
  count?: InputMaybe<Scalars['Int']['input']>;
  issueId: Scalars['Int']['input'];
};


export type MutationGenerateJournalAnalysisArgs = {
  journalEntryId: Scalars['Int']['input'];
};


export type MutationGenerateLongFormTextArgs = {
  familyMemberId?: InputMaybe<Scalars['Int']['input']>;
  feedbackId?: InputMaybe<Scalars['Int']['input']>;
  goalId?: InputMaybe<Scalars['Int']['input']>;
  issueId?: InputMaybe<Scalars['Int']['input']>;
  journalEntryId?: InputMaybe<Scalars['Int']['input']>;
  language?: InputMaybe<Scalars['String']['input']>;
  minutes?: InputMaybe<Scalars['Int']['input']>;
  userContext?: InputMaybe<Scalars['String']['input']>;
};


export type MutationGenerateOpenAiAudioArgs = {
  input: GenerateOpenAiAudioInput;
};


export type MutationGenerateParentAdviceArgs = {
  goalId: Scalars['Int']['input'];
  language?: InputMaybe<Scalars['String']['input']>;
};


export type MutationGenerateRecommendedBooksArgs = {
  goalId?: InputMaybe<Scalars['Int']['input']>;
  journalEntryId?: InputMaybe<Scalars['Int']['input']>;
};


export type MutationGenerateResearchArgs = {
  feedbackId?: InputMaybe<Scalars['Int']['input']>;
  goalId?: InputMaybe<Scalars['Int']['input']>;
  issueId?: InputMaybe<Scalars['Int']['input']>;
  journalEntryId?: InputMaybe<Scalars['Int']['input']>;
};


export type MutationGenerateRoutineAnalysisArgs = {
  familyMemberId: Scalars['Int']['input'];
};


export type MutationGenerateTherapeuticQuestionsArgs = {
  goalId?: InputMaybe<Scalars['Int']['input']>;
  issueId?: InputMaybe<Scalars['Int']['input']>;
  journalEntryId?: InputMaybe<Scalars['Int']['input']>;
};


export type MutationLinkContactToIssueArgs = {
  contactId: Scalars['Int']['input'];
  issueId: Scalars['Int']['input'];
};


export type MutationLinkIssuesArgs = {
  issueId: Scalars['Int']['input'];
  linkType?: InputMaybe<Scalars['String']['input']>;
  linkedIssueId: Scalars['Int']['input'];
};


export type MutationLogGameCompletionArgs = {
  input: LogGameCompletionInput;
};


export type MutationLogHabitArgs = {
  count?: InputMaybe<Scalars['Int']['input']>;
  habitId: Scalars['Int']['input'];
  loggedDate: Scalars['String']['input'];
  notes?: InputMaybe<Scalars['String']['input']>;
};


export type MutationMarkTeacherFeedbackExtractedArgs = {
  id: Scalars['Int']['input'];
};


export type MutationRecordCognitiveBaselineArgs = {
  input: CognitiveScoresInput;
  protocolId: Scalars['ID']['input'];
};


export type MutationRecordCognitiveCheckInArgs = {
  input: CognitiveCheckInInput;
  protocolId: Scalars['ID']['input'];
};


export type MutationRefreshClaimCardArgs = {
  id: Scalars['ID']['input'];
};


export type MutationSendConversationMessageArgs = {
  conversationId: Scalars['Int']['input'];
  message: Scalars['String']['input'];
};


export type MutationSendHealthcareChatMessageArgs = {
  input: HealthcareChatInput;
};


export type MutationSetMemoryBaselineArgs = {
  input: SetMemoryBaselineInput;
};


export type MutationSetNoteVisibilityArgs = {
  noteId: Scalars['Int']['input'];
  visibility: NoteVisibility;
};


export type MutationSetTagLanguageArgs = {
  language: Scalars['String']['input'];
  tag: Scalars['String']['input'];
};


export type MutationShareFamilyMemberArgs = {
  email: Scalars['String']['input'];
  familyMemberId: Scalars['Int']['input'];
  role?: InputMaybe<FamilyMemberShareRole>;
};


export type MutationShareNoteArgs = {
  email: Scalars['String']['input'];
  noteId: Scalars['Int']['input'];
  role?: InputMaybe<NoteShareRole>;
};


export type MutationUnlinkContactFromIssueArgs = {
  contactId: Scalars['Int']['input'];
  issueId: Scalars['Int']['input'];
};


export type MutationUnlinkGoalFamilyMemberArgs = {
  id: Scalars['Int']['input'];
};


export type MutationUnlinkIssuesArgs = {
  issueId: Scalars['Int']['input'];
  linkedIssueId: Scalars['Int']['input'];
};


export type MutationUnlockVaultArgs = {
  pin: Scalars['String']['input'];
};


export type MutationUnshareFamilyMemberArgs = {
  email: Scalars['String']['input'];
  familyMemberId: Scalars['Int']['input'];
};


export type MutationUnshareNoteArgs = {
  email: Scalars['String']['input'];
  noteId: Scalars['Int']['input'];
};


export type MutationUpdateAffirmationArgs = {
  id: Scalars['Int']['input'];
  input: UpdateAffirmationInput;
};


export type MutationUpdateBehaviorObservationArgs = {
  id: Scalars['Int']['input'];
  input: UpdateBehaviorObservationInput;
};


export type MutationUpdateContactArgs = {
  id: Scalars['Int']['input'];
  input: UpdateContactInput;
};


export type MutationUpdateContactFeedbackArgs = {
  id: Scalars['Int']['input'];
  input: UpdateContactFeedbackInput;
};


export type MutationUpdateFamilyMemberArgs = {
  id: Scalars['Int']['input'];
  input: UpdateFamilyMemberInput;
};


export type MutationUpdateGameArgs = {
  id: Scalars['Int']['input'];
  input: UpdateGameInput;
};


export type MutationUpdateGoalArgs = {
  id: Scalars['Int']['input'];
  input: UpdateGoalInput;
};


export type MutationUpdateHabitArgs = {
  id: Scalars['Int']['input'];
  input: UpdateHabitInput;
};


export type MutationUpdateIssueArgs = {
  id: Scalars['Int']['input'];
  input: UpdateIssueInput;
};


export type MutationUpdateJournalEntryArgs = {
  id: Scalars['Int']['input'];
  input: UpdateJournalEntryInput;
};


export type MutationUpdateNoteArgs = {
  id: Scalars['Int']['input'];
  input: UpdateNoteInput;
};


export type MutationUpdateProtocolStatusArgs = {
  id: Scalars['ID']['input'];
  status: Scalars['String']['input'];
};


export type MutationUpdateRelationshipArgs = {
  id: Scalars['Int']['input'];
  input: UpdateRelationshipInput;
};


export type MutationUpdateStoryArgs = {
  id: Scalars['Int']['input'];
  input: UpdateStoryInput;
};


export type MutationUpdateTeacherFeedbackArgs = {
  id: Scalars['Int']['input'];
  input: UpdateTeacherFeedbackInput;
};


export type MutationUpdateUserSettingsArgs = {
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

export enum NoteShareRole {
  Editor = 'EDITOR',
  Reader = 'READER'
}

export enum NoteVisibility {
  Private = 'PRIVATE',
  Public = 'PUBLIC'
}

export enum OpenAiAudioFormat {
  Aac = 'AAC',
  Flac = 'FLAC',
  Mp3 = 'MP3',
  Opus = 'OPUS',
  Pcm = 'PCM',
  Wav = 'WAV'
}

export enum OpenAiStreamFormat {
  Audio = 'AUDIO',
  Sse = 'SSE'
}

export enum OpenAittsModel {
  Gpt_4OMiniTts = 'GPT_4O_MINI_TTS',
  Tts_1 = 'TTS_1',
  Tts_1Hd = 'TTS_1_HD'
}

export enum OpenAittsVoice {
  Alloy = 'ALLOY',
  Ash = 'ASH',
  Ballad = 'BALLAD',
  Cedar = 'CEDAR',
  Coral = 'CORAL',
  Echo = 'ECHO',
  Fable = 'FABLE',
  Marin = 'MARIN',
  Nova = 'NOVA',
  Onyx = 'ONYX',
  Sage = 'SAGE',
  Shimmer = 'SHIMMER',
  Verse = 'VERSE'
}

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

export enum PersonType {
  Contact = 'CONTACT',
  FamilyMember = 'FAMILY_MEMBER'
}

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


export type QueryAffirmationArgs = {
  id: Scalars['Int']['input'];
};


export type QueryAffirmationsArgs = {
  familyMemberId: Scalars['Int']['input'];
};


export type QueryAllRecommendedBooksArgs = {
  category?: InputMaybe<Scalars['String']['input']>;
};


export type QueryAudioFromR2Args = {
  key: Scalars['String']['input'];
};


export type QueryBehaviorObservationArgs = {
  id: Scalars['Int']['input'];
};


export type QueryBehaviorObservationsArgs = {
  familyMemberId: Scalars['Int']['input'];
  goalId?: InputMaybe<Scalars['Int']['input']>;
};


export type QueryClaimCardArgs = {
  id: Scalars['ID']['input'];
};


export type QueryClaimCardsForNoteArgs = {
  noteId: Scalars['Int']['input'];
};


export type QueryConditionArgs = {
  id: Scalars['ID']['input'];
};


export type QueryContactArgs = {
  id?: InputMaybe<Scalars['Int']['input']>;
  slug?: InputMaybe<Scalars['String']['input']>;
};


export type QueryContactFeedbackArgs = {
  id: Scalars['Int']['input'];
};


export type QueryContactFeedbacksArgs = {
  contactId: Scalars['Int']['input'];
  familyMemberId: Scalars['Int']['input'];
};


export type QueryConversationArgs = {
  id: Scalars['Int']['input'];
};


export type QueryConversationsForIssueArgs = {
  issueId: Scalars['Int']['input'];
};


export type QueryDeepAnalysesArgs = {
  subjectId: Scalars['Int']['input'];
  subjectType: DeepAnalysisSubjectType;
};


export type QueryDeepAnalysisArgs = {
  id: Scalars['Int']['input'];
};


export type QueryDeepIssueAnalysesArgs = {
  familyMemberId: Scalars['Int']['input'];
};


export type QueryDeepIssueAnalysisArgs = {
  id: Scalars['Int']['input'];
};


export type QueryFamilyMemberArgs = {
  id?: InputMaybe<Scalars['Int']['input']>;
  slug?: InputMaybe<Scalars['String']['input']>;
};


export type QueryGameArgs = {
  id: Scalars['Int']['input'];
};


export type QueryGameCompletionsArgs = {
  gameId: Scalars['Int']['input'];
};


export type QueryGamesArgs = {
  familyMemberId?: InputMaybe<Scalars['Int']['input']>;
  goalId?: InputMaybe<Scalars['Int']['input']>;
  issueId?: InputMaybe<Scalars['Int']['input']>;
  type?: InputMaybe<GameType>;
};


export type QueryGenerationJobArgs = {
  id: Scalars['String']['input'];
};


export type QueryGenerationJobsArgs = {
  goalId?: InputMaybe<Scalars['Int']['input']>;
  status?: InputMaybe<Scalars['String']['input']>;
  type?: InputMaybe<Scalars['String']['input']>;
};


export type QueryGoalArgs = {
  id?: InputMaybe<Scalars['Int']['input']>;
  slug?: InputMaybe<Scalars['String']['input']>;
};


export type QueryGoalsArgs = {
  familyMemberId?: InputMaybe<Scalars['Int']['input']>;
  status?: InputMaybe<Scalars['String']['input']>;
  tag?: InputMaybe<Scalars['String']['input']>;
};


export type QueryHabitArgs = {
  id: Scalars['Int']['input'];
};


export type QueryHabitsArgs = {
  familyMemberId?: InputMaybe<Scalars['Int']['input']>;
  status?: InputMaybe<Scalars['String']['input']>;
};


export type QueryHealthcareMarkerTrendArgs = {
  markerName?: InputMaybe<Scalars['String']['input']>;
  query: Scalars['String']['input'];
};


export type QueryHealthcareSearchArgs = {
  query: Scalars['String']['input'];
};


export type QueryIssueArgs = {
  id: Scalars['Int']['input'];
};


export type QueryIssuesArgs = {
  familyMemberId: Scalars['Int']['input'];
  feedbackId?: InputMaybe<Scalars['Int']['input']>;
};


export type QueryJournalEntriesArgs = {
  familyMemberId?: InputMaybe<Scalars['Int']['input']>;
  fromDate?: InputMaybe<Scalars['String']['input']>;
  goalId?: InputMaybe<Scalars['Int']['input']>;
  mood?: InputMaybe<Scalars['String']['input']>;
  tag?: InputMaybe<Scalars['String']['input']>;
  toDate?: InputMaybe<Scalars['String']['input']>;
};


export type QueryJournalEntryArgs = {
  id: Scalars['Int']['input'];
};


export type QueryNoteArgs = {
  id?: InputMaybe<Scalars['Int']['input']>;
  slug?: InputMaybe<Scalars['String']['input']>;
};


export type QueryNotesArgs = {
  entityId: Scalars['Int']['input'];
  entityType: Scalars['String']['input'];
};


export type QueryProtocolArgs = {
  slug: Scalars['String']['input'];
};


export type QueryPublicDiscussionGuideArgs = {
  journalEntryId: Scalars['Int']['input'];
};


export type QueryRecommendedBooksArgs = {
  goalId?: InputMaybe<Scalars['Int']['input']>;
  journalEntryId?: InputMaybe<Scalars['Int']['input']>;
};


export type QueryRelationshipArgs = {
  id: Scalars['Int']['input'];
};


export type QueryRelationshipsArgs = {
  subjectId: Scalars['Int']['input'];
  subjectType: PersonType;
};


export type QueryResearchArgs = {
  feedbackId?: InputMaybe<Scalars['Int']['input']>;
  goalId?: InputMaybe<Scalars['Int']['input']>;
  issueId?: InputMaybe<Scalars['Int']['input']>;
  journalEntryId?: InputMaybe<Scalars['Int']['input']>;
};


export type QueryRoutineAnalysesArgs = {
  familyMemberId: Scalars['Int']['input'];
};


export type QueryRoutineAnalysisArgs = {
  id: Scalars['Int']['input'];
};


export type QueryStoriesArgs = {
  goalId: Scalars['Int']['input'];
};


export type QueryStoryArgs = {
  id: Scalars['Int']['input'];
};


export type QueryTagLanguageArgs = {
  tag: Scalars['String']['input'];
};


export type QueryTeacherFeedbackArgs = {
  id: Scalars['Int']['input'];
};


export type QueryTeacherFeedbacksArgs = {
  familyMemberId: Scalars['Int']['input'];
};


export type QueryTherapeuticQuestionsArgs = {
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

export enum RelationshipStatus {
  Active = 'ACTIVE',
  Ended = 'ENDED'
}

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

export enum ResearchSource {
  Arxiv = 'ARXIV',
  Crossref = 'CROSSREF',
  Datacite = 'DATACITE',
  Europepmc = 'EUROPEPMC',
  Openalex = 'OPENALEX',
  Pubmed = 'PUBMED',
  SemanticScholar = 'SEMANTIC_SCHOLAR'
}

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


export type SubscriptionAudioJobStatusArgs = {
  jobId: Scalars['String']['input'];
};


export type SubscriptionResearchJobStatusArgs = {
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

export type AddAllergyMutationVariables = Exact<{
  input: AddAllergyInput;
}>;


export type AddAllergyMutation = { __typename?: 'Mutation', addAllergy: { __typename?: 'Allergy', id: string, familyMemberId?: number | null, kind: AllergyKind, name: string, severity?: string | null, notes?: string | null, createdAt: string, familyMember?: { __typename?: 'FamilyMember', id: number, firstName: string, name?: string | null } | null } };

export type AddAppointmentMutationVariables = Exact<{
  input: AddAppointmentInput;
}>;


export type AddAppointmentMutation = { __typename?: 'Mutation', addAppointment: { __typename?: 'Appointment', id: string, title: string, doctorId?: string | null, familyMemberId?: number | null, provider?: string | null, notes?: string | null, appointmentDate?: string | null, createdAt: string } };

export type AddConditionMutationVariables = Exact<{
  input: AddConditionInput;
}>;


export type AddConditionMutation = { __typename?: 'Mutation', addCondition: { __typename?: 'Condition', id: string, name: string, notes?: string | null, createdAt: string } };

export type AddDoctorMutationVariables = Exact<{
  input: AddDoctorInput;
}>;


export type AddDoctorMutation = { __typename?: 'Mutation', addDoctor: { __typename?: 'Doctor', id: string, name: string, specialty?: string | null, phone?: string | null, email?: string | null, address?: string | null, notes?: string | null, createdAt: string } };

export type AddMedicationMutationVariables = Exact<{
  input: AddMedicationInput;
}>;


export type AddMedicationMutation = { __typename?: 'Mutation', addMedication: { __typename?: 'Medication', id: string, name: string, dosage?: string | null, frequency?: string | null, notes?: string | null, startDate?: string | null, endDate?: string | null, createdAt: string } };

export type AddMemoryEntryMutationVariables = Exact<{
  input: AddMemoryEntryInput;
}>;


export type AddMemoryEntryMutation = { __typename?: 'Mutation', addMemoryEntry: { __typename?: 'MemoryEntry', id: string, category: string, description?: string | null, overallScore?: number | null, shortTermScore?: number | null, longTermScore?: number | null, workingMemoryScore?: number | null, recallSpeed?: number | null, loggedAt: string } };

export type AddProtocolMutationVariables = Exact<{
  input: AddProtocolInput;
}>;


export type AddProtocolMutation = { __typename?: 'Mutation', addProtocol: { __typename?: 'Protocol', id: string, name: string, slug: string, status: string, targetAreas: Array<string>, supplementCount: number, createdAt: string } };

export type AddSupplementMutationVariables = Exact<{
  protocolId: Scalars['ID']['input'];
  input: AddSupplementInput;
}>;


export type AddSupplementMutation = { __typename?: 'Mutation', addSupplement: { __typename?: 'ProtocolSupplement', id: string, name: string, dosage: string, frequency: string, mechanism?: string | null, notes?: string | null, url?: string | null, createdAt: string } };

export type AddSymptomMutationVariables = Exact<{
  input: AddSymptomInput;
}>;


export type AddSymptomMutation = { __typename?: 'Mutation', addSymptom: { __typename?: 'Symptom', id: string, description: string, severity?: string | null, loggedAt: string, createdAt: string } };

export type AllergiesQueryVariables = Exact<{ [key: string]: never; }>;


export type AllergiesQuery = { __typename?: 'Query', allergies: Array<{ __typename?: 'Allergy', id: string, familyMemberId?: number | null, kind: AllergyKind, name: string, severity?: string | null, notes?: string | null, createdAt: string, familyMember?: { __typename?: 'FamilyMember', id: number, slug?: string | null, firstName: string, name?: string | null } | null }> };

export type AppointmentsQueryVariables = Exact<{ [key: string]: never; }>;


export type AppointmentsQuery = { __typename?: 'Query', appointments: Array<{ __typename?: 'Appointment', id: string, title: string, doctorId?: string | null, familyMemberId?: number | null, provider?: string | null, notes?: string | null, appointmentDate?: string | null, createdAt: string }> };

export type BloodTestsQueryVariables = Exact<{ [key: string]: never; }>;


export type BloodTestsQuery = { __typename?: 'Query', bloodTests: Array<{ __typename?: 'BloodTest', id: string, fileName: string, status: string, testDate?: string | null, errorMessage?: string | null, uploadedAt: string, markersCount: number }> };

export type BogdanDiscussionsQueryVariables = Exact<{ [key: string]: never; }>;


export type BogdanDiscussionsQuery = { __typename?: 'Query', bogdanDiscussions: Array<{ __typename?: 'BogdanDiscussionGuide', id: number, familyMemberId: number, childAge?: number | null, behaviorSummary: string, createdAt: string }> };

export type CheckNoteClaimsMutationVariables = Exact<{
  input: CheckNoteClaimsInput;
}>;


export type CheckNoteClaimsMutation = { __typename?: 'Mutation', checkNoteClaims: { __typename?: 'CheckNoteClaimsResult', success: boolean, message?: string | null, noteId: number, cards: Array<{ __typename?: 'ClaimCard', id: string, claim: string, verdict: ClaimVerdict, confidence: number, queries: Array<string>, createdAt: string, updatedAt: string, notes?: string | null, scope?: { __typename?: 'ClaimScope', population?: string | null, intervention?: string | null, comparator?: string | null, outcome?: string | null, timeframe?: string | null, setting?: string | null } | null, evidence: Array<{ __typename?: 'EvidenceItem', polarity: EvidencePolarity, excerpt?: string | null, rationale?: string | null, score?: number | null, paper: { __typename?: 'PaperCandidate', title: string, doi?: string | null, url?: string | null, year?: number | null, source: string, authors?: Array<string> | null, abstract?: string | null, journal?: string | null }, locator?: { __typename?: 'EvidenceLocator', section?: string | null, page?: number | null, url?: string | null } | null }>, provenance: { __typename?: 'ClaimProvenance', generatedBy: string, model?: string | null, sourceTools: Array<string> } }> } };

export type BuildClaimCardsFromTextMutationVariables = Exact<{ [key: string]: never; }>;


export type BuildClaimCardsFromTextMutation = { __typename?: 'Mutation', buildClaimCards: { __typename?: 'BuildClaimCardsResult', cards: Array<{ __typename?: 'ClaimCard', id: string, claim: string, verdict: ClaimVerdict, confidence: number, queries: Array<string>, createdAt: string, evidence: Array<{ __typename?: 'EvidenceItem', polarity: EvidencePolarity, excerpt?: string | null, rationale?: string | null, score?: number | null, paper: { __typename?: 'PaperCandidate', title: string, authors?: Array<string> | null, doi?: string | null, year?: number | null, journal?: string | null, oaUrl?: string | null } }>, provenance: { __typename?: 'ClaimProvenance', generatedBy: string, model?: string | null, sourceTools: Array<string> } }> } };

export type BuildClaimCardsFromClaimsMutationVariables = Exact<{ [key: string]: never; }>;


export type BuildClaimCardsFromClaimsMutation = { __typename?: 'Mutation', buildClaimCards: { __typename?: 'BuildClaimCardsResult', cards: Array<{ __typename?: 'ClaimCard', id: string, claim: string, verdict: ClaimVerdict, confidence: number, evidence: Array<{ __typename?: 'EvidenceItem', polarity: EvidencePolarity, score?: number | null, paper: { __typename?: 'PaperCandidate', title: string, doi?: string | null } }> }> } };

export type GetClaimCardQueryVariables = Exact<{ [key: string]: never; }>;


export type GetClaimCardQuery = { __typename?: 'Query', claimCard?: { __typename?: 'ClaimCard', id: string, claim: string, verdict: ClaimVerdict, confidence: number, notes?: string | null, createdAt: string, updatedAt: string, evidence: Array<{ __typename?: 'EvidenceItem', polarity: EvidencePolarity, excerpt?: string | null, rationale?: string | null, score?: number | null, paper: { __typename?: 'PaperCandidate', title: string, authors?: Array<string> | null, doi?: string | null, url?: string | null, year?: number | null, journal?: string | null } }>, scope?: { __typename?: 'ClaimScope', population?: string | null, intervention?: string | null, outcome?: string | null } | null } | null };

export type GetClaimCardsForNoteQueryVariables = Exact<{ [key: string]: never; }>;


export type GetClaimCardsForNoteQuery = { __typename?: 'Query', claimCardsForNote: Array<{ __typename?: 'ClaimCard', id: string, claim: string, verdict: ClaimVerdict, confidence: number, createdAt: string, evidence: Array<{ __typename?: 'EvidenceItem', polarity: EvidencePolarity, paper: { __typename?: 'PaperCandidate', title: string, doi?: string | null } }> }> };

export type RefreshClaimCardMutationVariables = Exact<{ [key: string]: never; }>;


export type RefreshClaimCardMutation = { __typename?: 'Mutation', refreshClaimCard: { __typename?: 'ClaimCard', id: string, claim: string, verdict: ClaimVerdict, confidence: number, updatedAt: string, evidence: Array<{ __typename?: 'EvidenceItem', polarity: EvidencePolarity, score?: number | null, paper: { __typename?: 'PaperCandidate', title: string, doi?: string | null, year?: number | null } }> } };

export type DeleteClaimCardMutationVariables = Exact<{ [key: string]: never; }>;


export type DeleteClaimCardMutation = { __typename?: 'Mutation', deleteClaimCard: boolean };

export type ConditionsQueryVariables = Exact<{ [key: string]: never; }>;


export type ConditionsQuery = { __typename?: 'Query', conditions: Array<{ __typename?: 'Condition', id: string, familyMemberId?: number | null, name: string, notes?: string | null, createdAt: string, familyMember?: { __typename?: 'FamilyMember', id: number, slug?: string | null, firstName: string, name?: string | null } | null }> };

export type ConvertIssueToGoalMutationVariables = Exact<{
  id: Scalars['Int']['input'];
  input: CreateGoalInput;
}>;


export type ConvertIssueToGoalMutation = { __typename?: 'Mutation', convertIssueToGoal: { __typename?: 'Goal', id: number, familyMemberId?: number | null, createdBy: string, slug?: string | null, title: string, description?: string | null, status: string, createdAt: string, updatedAt: string } };

export type ConvertJournalEntryToIssueMutationVariables = Exact<{
  id: Scalars['Int']['input'];
  input: ConvertJournalEntryToIssueInput;
}>;


export type ConvertJournalEntryToIssueMutation = { __typename?: 'Mutation', convertJournalEntryToIssue: { __typename?: 'Issue', id: number, journalEntryId?: number | null, feedbackId?: number | null, familyMemberId: number, createdBy: string, title: string, description: string, category: string, severity: string, recommendations?: Array<string> | null, createdAt: string, updatedAt: string, familyMember?: { __typename?: 'FamilyMember', id: number, firstName: string, name?: string | null, slug?: string | null } | null } };

export type CreateAffirmationMutationVariables = Exact<{
  input: CreateAffirmationInput;
}>;


export type CreateAffirmationMutation = { __typename?: 'Mutation', createAffirmation: { __typename?: 'Affirmation', id: number, familyMemberId: number, text: string, category: AffirmationCategory, isActive: boolean, createdAt: string, updatedAt: string } };

export type CreateContactMutationVariables = Exact<{
  input: CreateContactInput;
}>;


export type CreateContactMutation = { __typename?: 'Mutation', createContact: { __typename?: 'Contact', id: number, createdBy: string, slug?: string | null, firstName: string, lastName?: string | null, description?: string | null, role?: string | null, ageYears?: number | null, notes?: string | null, createdAt: string, updatedAt: string } };

export type CreateContactFeedbackMutationVariables = Exact<{
  input: CreateContactFeedbackInput;
}>;


export type CreateContactFeedbackMutation = { __typename?: 'Mutation', createContactFeedback: { __typename?: 'ContactFeedback', id: number, contactId: number, familyMemberId: number, createdBy: string, subject?: string | null, feedbackDate: string, content: string, tags?: Array<string> | null, source?: FeedbackSource | null, extracted: boolean, createdAt: string, updatedAt: string } };

export type CreateConversationMutationVariables = Exact<{
  issueId: Scalars['Int']['input'];
  message: Scalars['String']['input'];
}>;


export type CreateConversationMutation = { __typename?: 'Mutation', createConversation: { __typename?: 'Conversation', id: number, issueId: number, userId: string, title?: string | null, createdAt: string, updatedAt: string, messages: Array<{ __typename?: 'ConversationMessage', id: number, conversationId: number, role: string, content: string, createdAt: string }> } };

export type CreateFamilyMemberMutationVariables = Exact<{
  input: CreateFamilyMemberInput;
}>;


export type CreateFamilyMemberMutation = { __typename?: 'Mutation', createFamilyMember: { __typename?: 'FamilyMember', id: number, firstName: string, name?: string | null, relationship?: string | null, email?: string | null, phone?: string | null, location?: string | null, occupation?: string | null, ageYears?: number | null, dateOfBirth?: string | null, bio?: string | null, allergies?: string | null, createdAt: string, updatedAt: string } };

export type CreateGameMutationVariables = Exact<{
  input: CreateGameInput;
}>;


export type CreateGameMutation = { __typename?: 'Mutation', createGame: { __typename?: 'Game', id: number, type: GameType, title: string, description?: string | null, content: string, language?: string | null, estimatedMinutes?: number | null, source: GameSource, goalId?: number | null, issueId?: number | null, familyMemberId?: number | null, createdAt: string, updatedAt: string } };

export type CreateGoalMutationVariables = Exact<{
  input: CreateGoalInput;
}>;


export type CreateGoalMutation = { __typename?: 'Mutation', createGoal: { __typename?: 'Goal', id: number, slug?: string | null, title: string, description?: string | null, status: string, createdAt: string, updatedAt: string, familyMemberId?: number | null } };

export type CreateHabitMutationVariables = Exact<{
  input: CreateHabitInput;
}>;


export type CreateHabitMutation = { __typename?: 'Mutation', createHabit: { __typename?: 'Habit', id: number, title: string, description?: string | null, frequency: HabitFrequency, targetCount: number, status: HabitStatus, goalId?: number | null, createdAt: string, updatedAt: string } };

export type CreateIssueMutationVariables = Exact<{
  input: CreateIssueInput;
}>;


export type CreateIssueMutation = { __typename?: 'Mutation', createIssue: { __typename?: 'Issue', id: number, feedbackId?: number | null, familyMemberId: number, createdBy: string, title: string, description: string, category: string, severity: string, recommendations?: Array<string> | null, createdAt: string, updatedAt: string } };

export type CreateJournalEntryMutationVariables = Exact<{
  input: CreateJournalEntryInput;
}>;


export type CreateJournalEntryMutation = { __typename?: 'Mutation', createJournalEntry: { __typename?: 'JournalEntry', id: number, createdBy: string, familyMemberId?: number | null, title?: string | null, content: string, mood?: string | null, moodScore?: number | null, tags?: Array<string> | null, goalId?: number | null, isPrivate: boolean, isVault: boolean, entryDate: string, createdAt: string, updatedAt: string } };

export type CreateNoteMutationVariables = Exact<{
  input: CreateNoteInput;
}>;


export type CreateNoteMutation = { __typename?: 'Mutation', createNote: { __typename?: 'Note', id: number, entityId: number, entityType: string, createdBy: string, noteType?: string | null, slug?: string | null, content: string, tags?: Array<string> | null, createdAt: string, updatedAt: string } };

export type CreateRelatedIssueMutationVariables = Exact<{
  issueId: Scalars['Int']['input'];
  input: CreateIssueInput;
  linkType?: InputMaybe<Scalars['String']['input']>;
}>;


export type CreateRelatedIssueMutation = { __typename?: 'Mutation', createRelatedIssue: { __typename?: 'IssueLink', id: number, linkType: string, issue: { __typename?: 'Issue', id: number, title: string, description: string, category: string, severity: string, familyMemberId: number, createdBy: string, createdAt: string, updatedAt: string } } };

export type CreateRelationshipMutationVariables = Exact<{
  input: CreateRelationshipInput;
}>;


export type CreateRelationshipMutation = { __typename?: 'Mutation', createRelationship: { __typename?: 'Relationship', id: number, createdBy: string, subjectType: PersonType, subjectId: number, relatedType: PersonType, relatedId: number, relationshipType: string, context?: string | null, startDate?: string | null, status: RelationshipStatus, createdAt: string, updatedAt: string } };

export type CreateStoryMutationVariables = Exact<{
  input: CreateStoryInput;
}>;


export type CreateStoryMutation = { __typename?: 'Mutation', createStory: { __typename?: 'Story', id: number, goalId?: number | null, createdBy?: string | null, content: string, createdAt: string, updatedAt: string } };

export type CreateSubGoalMutationVariables = Exact<{
  goalId: Scalars['Int']['input'];
  input: CreateSubGoalInput;
}>;


export type CreateSubGoalMutation = { __typename?: 'Mutation', createSubGoal: { __typename?: 'Goal', id: number, slug?: string | null, title: string, description?: string | null, status: string, parentGoalId?: number | null, createdAt: string, updatedAt: string, familyMemberId?: number | null } };

export type CreateTeacherFeedbackMutationVariables = Exact<{
  input: CreateTeacherFeedbackInput;
}>;


export type CreateTeacherFeedbackMutation = { __typename?: 'Mutation', createTeacherFeedback: { __typename?: 'TeacherFeedback', id: number, familyMemberId: number, createdBy: string, teacherName: string, subject?: string | null, feedbackDate: string, content: string, tags?: Array<string> | null, source?: FeedbackSource | null, extracted: boolean, createdAt: string, updatedAt: string } };

export type DeleteAffirmationMutationVariables = Exact<{
  id: Scalars['Int']['input'];
}>;


export type DeleteAffirmationMutation = { __typename?: 'Mutation', deleteAffirmation: { __typename?: 'DeleteAffirmationResult', success: boolean, message?: string | null } };

export type DeleteAllergyMutationVariables = Exact<{
  id: Scalars['ID']['input'];
}>;


export type DeleteAllergyMutation = { __typename?: 'Mutation', deleteAllergy: { __typename?: 'DeleteAllergyResult', success: boolean } };

export type DeleteAppointmentMutationVariables = Exact<{
  id: Scalars['ID']['input'];
}>;


export type DeleteAppointmentMutation = { __typename?: 'Mutation', deleteAppointment: { __typename?: 'DeleteAppointmentResult', success: boolean } };

export type DeleteBehaviorObservationMutationVariables = Exact<{
  id: Scalars['Int']['input'];
}>;


export type DeleteBehaviorObservationMutation = { __typename?: 'Mutation', deleteBehaviorObservation: { __typename?: 'DeleteBehaviorObservationResult', success: boolean, message?: string | null } };

export type DeleteBloodTestMutationVariables = Exact<{
  id: Scalars['ID']['input'];
}>;


export type DeleteBloodTestMutation = { __typename?: 'Mutation', deleteBloodTest: { __typename?: 'DeleteBloodTestResult', success: boolean } };

export type DeleteConditionMutationVariables = Exact<{
  id: Scalars['ID']['input'];
}>;


export type DeleteConditionMutation = { __typename?: 'Mutation', deleteCondition: { __typename?: 'DeleteConditionResult', success: boolean } };

export type DeleteContactMutationVariables = Exact<{
  id: Scalars['Int']['input'];
}>;


export type DeleteContactMutation = { __typename?: 'Mutation', deleteContact: { __typename?: 'DeleteContactResult', success: boolean, message?: string | null } };

export type DeleteContactFeedbackMutationVariables = Exact<{
  id: Scalars['Int']['input'];
}>;


export type DeleteContactFeedbackMutation = { __typename?: 'Mutation', deleteContactFeedback: { __typename?: 'DeleteContactFeedbackResult', success: boolean, message?: string | null } };

export type DeleteConversationMutationVariables = Exact<{
  id: Scalars['Int']['input'];
}>;


export type DeleteConversationMutation = { __typename?: 'Mutation', deleteConversation: { __typename?: 'DeleteConversationResult', id: number } };

export type DeleteDeepAnalysisMutationVariables = Exact<{
  id: Scalars['Int']['input'];
}>;


export type DeleteDeepAnalysisMutation = { __typename?: 'Mutation', deleteDeepAnalysis: { __typename?: 'DeleteDeepAnalysisResult', success: boolean, message?: string | null } };

export type DeleteDeepIssueAnalysisMutationVariables = Exact<{
  id: Scalars['Int']['input'];
}>;


export type DeleteDeepIssueAnalysisMutation = { __typename?: 'Mutation', deleteDeepIssueAnalysis: { __typename?: 'DeleteDeepAnalysisResult', success: boolean, message?: string | null } };

export type DeleteDiscussionGuideMutationVariables = Exact<{
  journalEntryId: Scalars['Int']['input'];
}>;


export type DeleteDiscussionGuideMutation = { __typename?: 'Mutation', deleteDiscussionGuide: { __typename?: 'DeleteDiscussionGuideResult', success: boolean, message?: string | null } };

export type DeleteDoctorMutationVariables = Exact<{
  id: Scalars['ID']['input'];
}>;


export type DeleteDoctorMutation = { __typename?: 'Mutation', deleteDoctor: { __typename?: 'DeleteDoctorResult', success: boolean } };

export type DeleteFamilyMemberMutationVariables = Exact<{
  id: Scalars['Int']['input'];
}>;


export type DeleteFamilyMemberMutation = { __typename?: 'Mutation', deleteFamilyMember: { __typename?: 'DeleteFamilyMemberResult', success: boolean, message?: string | null } };

export type DeleteGameMutationVariables = Exact<{
  id: Scalars['Int']['input'];
}>;


export type DeleteGameMutation = { __typename?: 'Mutation', deleteGame: { __typename?: 'DeleteGameResult', success: boolean, message?: string | null } };

export type DeleteGoalMutationVariables = Exact<{
  id: Scalars['Int']['input'];
}>;


export type DeleteGoalMutation = { __typename?: 'Mutation', deleteGoal: { __typename?: 'DeleteGoalResult', success: boolean, message?: string | null } };

export type DeleteHabitMutationVariables = Exact<{
  id: Scalars['Int']['input'];
}>;


export type DeleteHabitMutation = { __typename?: 'Mutation', deleteHabit: { __typename?: 'DeleteHabitResult', success: boolean, message?: string | null } };

export type DeleteHabitLogMutationVariables = Exact<{
  id: Scalars['Int']['input'];
}>;


export type DeleteHabitLogMutation = { __typename?: 'Mutation', deleteHabitLog: boolean };

export type DeleteIssueMutationVariables = Exact<{
  id: Scalars['Int']['input'];
}>;


export type DeleteIssueMutation = { __typename?: 'Mutation', deleteIssue: { __typename?: 'DeleteIssueResult', success: boolean, message?: string | null } };

export type DeleteIssueScreenshotMutationVariables = Exact<{
  id: Scalars['Int']['input'];
}>;


export type DeleteIssueScreenshotMutation = { __typename?: 'Mutation', deleteIssueScreenshot: { __typename?: 'DeleteIssueScreenshotResult', success: boolean } };

export type DeleteJournalAnalysisMutationVariables = Exact<{
  journalEntryId: Scalars['Int']['input'];
}>;


export type DeleteJournalAnalysisMutation = { __typename?: 'Mutation', deleteJournalAnalysis: { __typename?: 'DeleteJournalAnalysisResult', success: boolean, message?: string | null } };

export type DeleteJournalEntryMutationVariables = Exact<{
  id: Scalars['Int']['input'];
}>;


export type DeleteJournalEntryMutation = { __typename?: 'Mutation', deleteJournalEntry: { __typename?: 'DeleteJournalEntryResult', success: boolean, message?: string | null } };

export type DeleteJournalRecommendedBooksMutationVariables = Exact<{
  journalEntryId: Scalars['Int']['input'];
}>;


export type DeleteJournalRecommendedBooksMutation = { __typename?: 'Mutation', deleteRecommendedBooks: { __typename?: 'DeleteRecommendedBooksResult', success: boolean, message?: string | null, deletedCount: number } };

export type DeleteMedicationMutationVariables = Exact<{
  id: Scalars['ID']['input'];
}>;


export type DeleteMedicationMutation = { __typename?: 'Mutation', deleteMedication: { __typename?: 'DeleteMedicationResult', success: boolean } };

export type DeleteMemoryEntryMutationVariables = Exact<{
  id: Scalars['ID']['input'];
}>;


export type DeleteMemoryEntryMutation = { __typename?: 'Mutation', deleteMemoryEntry: { __typename?: 'DeleteMemoryEntryResult', success: boolean } };

export type DeleteNoteMutationVariables = Exact<{
  id: Scalars['Int']['input'];
}>;


export type DeleteNoteMutation = { __typename?: 'Mutation', deleteNote: { __typename?: 'DeleteNoteResult', success: boolean, message?: string | null } };

export type DeleteProtocolMutationVariables = Exact<{
  id: Scalars['ID']['input'];
}>;


export type DeleteProtocolMutation = { __typename?: 'Mutation', deleteProtocol: { __typename?: 'DeleteProtocolResult', success: boolean } };

export type DeleteRecommendedBooksMutationVariables = Exact<{
  goalId: Scalars['Int']['input'];
}>;


export type DeleteRecommendedBooksMutation = { __typename?: 'Mutation', deleteRecommendedBooks: { __typename?: 'DeleteRecommendedBooksResult', success: boolean, message?: string | null, deletedCount: number } };

export type DeleteRelationshipMutationVariables = Exact<{
  id: Scalars['Int']['input'];
}>;


export type DeleteRelationshipMutation = { __typename?: 'Mutation', deleteRelationship: { __typename?: 'DeleteRelationshipResult', success: boolean, message?: string | null } };

export type DeleteResearchMutationVariables = Exact<{
  goalId: Scalars['Int']['input'];
}>;


export type DeleteResearchMutation = { __typename?: 'Mutation', deleteResearch: { __typename?: 'DeleteResearchResult', success: boolean, message?: string | null, deletedCount: number } };

export type DeleteRoutineAnalysisMutationVariables = Exact<{
  id: Scalars['Int']['input'];
}>;


export type DeleteRoutineAnalysisMutation = { __typename?: 'Mutation', deleteRoutineAnalysis: { __typename?: 'DeleteRoutineAnalysisResult', success: boolean, message?: string | null } };

export type DeleteStoryMutationVariables = Exact<{
  id: Scalars['Int']['input'];
}>;


export type DeleteStoryMutation = { __typename?: 'Mutation', deleteStory: { __typename?: 'DeleteStoryResult', success: boolean, message?: string | null } };

export type DeleteSupplementMutationVariables = Exact<{
  id: Scalars['ID']['input'];
}>;


export type DeleteSupplementMutation = { __typename?: 'Mutation', deleteSupplement: { __typename?: 'DeleteSupplementResult', success: boolean } };

export type DeleteSymptomMutationVariables = Exact<{
  id: Scalars['ID']['input'];
}>;


export type DeleteSymptomMutation = { __typename?: 'Mutation', deleteSymptom: { __typename?: 'DeleteSymptomResult', success: boolean } };

export type DeleteTeacherFeedbackMutationVariables = Exact<{
  id: Scalars['Int']['input'];
}>;


export type DeleteTeacherFeedbackMutation = { __typename?: 'Mutation', deleteTeacherFeedback: { __typename?: 'DeleteTeacherFeedbackResult', success: boolean, message?: string | null } };

export type DeleteTherapeuticQuestionsMutationVariables = Exact<{
  goalId?: InputMaybe<Scalars['Int']['input']>;
  issueId?: InputMaybe<Scalars['Int']['input']>;
  journalEntryId?: InputMaybe<Scalars['Int']['input']>;
}>;


export type DeleteTherapeuticQuestionsMutation = { __typename?: 'Mutation', deleteTherapeuticQuestions: { __typename?: 'DeleteQuestionsResult', success: boolean, message?: string | null, deletedCount: number } };

export type DoctorsQueryVariables = Exact<{ [key: string]: never; }>;


export type DoctorsQuery = { __typename?: 'Query', doctors: Array<{ __typename?: 'Doctor', id: string, name: string, specialty?: string | null, phone?: string | null, email?: string | null, address?: string | null, notes?: string | null, createdAt: string }> };

export type ExtractContactFeedbackIssuesMutationVariables = Exact<{
  id: Scalars['Int']['input'];
}>;


export type ExtractContactFeedbackIssuesMutation = { __typename?: 'Mutation', extractContactFeedbackIssues: { __typename?: 'ContactFeedback', id: number, extracted: boolean, extractedIssues?: Array<{ __typename?: 'ExtractedIssue', title: string, description: string, category: string, severity: string, recommendations?: Array<string> | null }> | null } };

export type GenerateAffirmationsForFamilyMemberMutationVariables = Exact<{
  familyMemberId: Scalars['Int']['input'];
  count?: InputMaybe<Scalars['Int']['input']>;
  categoryFocus?: InputMaybe<AffirmationCategory>;
  language?: InputMaybe<Scalars['String']['input']>;
}>;


export type GenerateAffirmationsForFamilyMemberMutation = { __typename?: 'Mutation', generateAffirmationsForFamilyMember: { __typename?: 'GenerateAffirmationsResult', success: boolean, message?: string | null, count: number, affirmations: Array<{ __typename?: 'Affirmation', id: number, familyMemberId: number, userId: string, text: string, category: AffirmationCategory, isActive: boolean, createdAt: string, updatedAt: string }> } };

export type GenerateAudioMutationVariables = Exact<{
  goalId: Scalars['Int']['input'];
  storyId?: InputMaybe<Scalars['Int']['input']>;
  text?: InputMaybe<Scalars['String']['input']>;
  language?: InputMaybe<Scalars['String']['input']>;
  voice?: InputMaybe<Scalars['String']['input']>;
}>;


export type GenerateAudioMutation = { __typename?: 'Mutation', generateAudio: { __typename?: 'GenerateAudioResult', success: boolean, message?: string | null, jobId: string, audioUrl?: string | null } };

export type GenerateBogdanDiscussionMutationVariables = Exact<{ [key: string]: never; }>;


export type GenerateBogdanDiscussionMutation = { __typename?: 'Mutation', generateBogdanDiscussion: { __typename?: 'GenerateBogdanDiscussionResult', success: boolean, message?: string | null, jobId?: string | null } };

export type GenerateDeepAnalysisMutationVariables = Exact<{
  subjectType: DeepAnalysisSubjectType;
  subjectId: Scalars['Int']['input'];
  triggerType?: InputMaybe<DeepAnalysisTriggerType>;
  triggerId?: InputMaybe<Scalars['Int']['input']>;
}>;


export type GenerateDeepAnalysisMutation = { __typename?: 'Mutation', generateDeepAnalysis: { __typename?: 'GenerateDeepAnalysisResult', success: boolean, message?: string | null, jobId?: string | null } };

export type GenerateDeepIssueAnalysisMutationVariables = Exact<{
  familyMemberId: Scalars['Int']['input'];
  triggerIssueId?: InputMaybe<Scalars['Int']['input']>;
}>;


export type GenerateDeepIssueAnalysisMutation = { __typename?: 'Mutation', generateDeepIssueAnalysis: { __typename?: 'GenerateDeepAnalysisResult', success: boolean, message?: string | null, jobId?: string | null } };

export type GenerateDiscussionGuideMutationVariables = Exact<{
  journalEntryId: Scalars['Int']['input'];
}>;


export type GenerateDiscussionGuideMutation = { __typename?: 'Mutation', generateDiscussionGuide: { __typename?: 'GenerateDiscussionGuideResult', success: boolean, message?: string | null, jobId?: string | null } };

export type GenerateGameMutationVariables = Exact<{
  input: GenerateGameInput;
}>;


export type GenerateGameMutation = { __typename?: 'Mutation', generateGame: { __typename?: 'Game', id: number, type: GameType, title: string, description?: string | null, content: string, language?: string | null, estimatedMinutes?: number | null, source: GameSource, goalId?: number | null, issueId?: number | null, familyMemberId?: number | null, createdAt: string } };

export type GenerateHabitsForFamilyMemberMutationVariables = Exact<{
  familyMemberId: Scalars['Int']['input'];
  count?: InputMaybe<Scalars['Int']['input']>;
}>;


export type GenerateHabitsForFamilyMemberMutation = { __typename?: 'Mutation', generateHabitsForFamilyMember: { __typename?: 'GenerateHabitsResult', success: boolean, message?: string | null, count?: number | null, habits?: Array<{ __typename?: 'Habit', id: number, title: string, description?: string | null, frequency: HabitFrequency, targetCount: number, status: HabitStatus, familyMemberId?: number | null, createdAt: string }> | null } };

export type GenerateHabitsFromIssueMutationVariables = Exact<{
  issueId: Scalars['Int']['input'];
  count?: InputMaybe<Scalars['Int']['input']>;
}>;


export type GenerateHabitsFromIssueMutation = { __typename?: 'Mutation', generateHabitsFromIssue: { __typename?: 'GenerateHabitsResult', success: boolean, message?: string | null, count?: number | null, habits?: Array<{ __typename?: 'Habit', id: number, title: string, description?: string | null, frequency: HabitFrequency, targetCount: number, status: HabitStatus, familyMemberId?: number | null, createdAt: string }> | null } };

export type GenerateJournalAnalysisMutationVariables = Exact<{
  journalEntryId: Scalars['Int']['input'];
}>;


export type GenerateJournalAnalysisMutation = { __typename?: 'Mutation', generateJournalAnalysis: { __typename?: 'GenerateJournalAnalysisResult', success: boolean, message?: string | null, jobId?: string | null } };

export type GenerateJournalRecommendedBooksMutationVariables = Exact<{
  journalEntryId: Scalars['Int']['input'];
}>;


export type GenerateJournalRecommendedBooksMutation = { __typename?: 'Mutation', generateRecommendedBooks: { __typename?: 'GenerateRecommendedBooksResult', success: boolean, message?: string | null, jobId?: string | null, books: Array<{ __typename?: 'RecommendedBook', id: number, goalId?: number | null, journalEntryId?: number | null, title: string, authors: Array<string>, year?: number | null, isbn?: string | null, description: string, whyRecommended: string, category: string, amazonUrl?: string | null, generatedAt: string }> } };

export type GenerateLongFormTextMutationVariables = Exact<{
  goalId?: InputMaybe<Scalars['Int']['input']>;
  issueId?: InputMaybe<Scalars['Int']['input']>;
  feedbackId?: InputMaybe<Scalars['Int']['input']>;
  journalEntryId?: InputMaybe<Scalars['Int']['input']>;
  familyMemberId?: InputMaybe<Scalars['Int']['input']>;
  userContext?: InputMaybe<Scalars['String']['input']>;
  language?: InputMaybe<Scalars['String']['input']>;
  minutes?: InputMaybe<Scalars['Int']['input']>;
}>;


export type GenerateLongFormTextMutation = { __typename?: 'Mutation', generateLongFormText: { __typename?: 'GenerateLongFormTextResult', success: boolean, message?: string | null, jobId?: string | null, storyId?: number | null, text?: string | null, audioUrl?: string | null, manifestUrl?: string | null, segmentUrls?: Array<string> | null } };

export type GenerateLongFormTextRomanianMutationVariables = Exact<{
  goalId: Scalars['Int']['input'];
}>;


export type GenerateLongFormTextRomanianMutation = { __typename?: 'Mutation', generateLongFormText: { __typename?: 'GenerateLongFormTextResult', success: boolean, message?: string | null, text?: string | null, audioUrl?: string | null, manifestUrl?: string | null, segmentUrls?: Array<string> | null } };

export type GenerateOpenAiAudioMutationVariables = Exact<{
  input: GenerateOpenAiAudioInput;
}>;


export type GenerateOpenAiAudioMutation = { __typename?: 'Mutation', generateOpenAIAudio: { __typename?: 'GenerateOpenAIAudioResult', success: boolean, message?: string | null, jobId?: string | null, audioBuffer?: string | null, audioUrl?: string | null, sizeBytes?: number | null, duration?: number | null } };

export type GenerateParentAdviceMutationVariables = Exact<{
  goalId: Scalars['Int']['input'];
  language?: InputMaybe<Scalars['String']['input']>;
}>;


export type GenerateParentAdviceMutation = { __typename?: 'Mutation', generateParentAdvice: { __typename?: 'GenerateParentAdviceResult', success: boolean, message?: string | null, parentAdvice?: string | null } };

export type GenerateRecommendedBooksMutationVariables = Exact<{
  goalId: Scalars['Int']['input'];
}>;


export type GenerateRecommendedBooksMutation = { __typename?: 'Mutation', generateRecommendedBooks: { __typename?: 'GenerateRecommendedBooksResult', success: boolean, message?: string | null, jobId?: string | null, books: Array<{ __typename?: 'RecommendedBook', id: number, goalId?: number | null, title: string, authors: Array<string>, year?: number | null, isbn?: string | null, description: string, whyRecommended: string, category: string, amazonUrl?: string | null, generatedAt: string }> } };

export type GenerateResearchMutationVariables = Exact<{
  goalId?: InputMaybe<Scalars['Int']['input']>;
  issueId?: InputMaybe<Scalars['Int']['input']>;
  feedbackId?: InputMaybe<Scalars['Int']['input']>;
  journalEntryId?: InputMaybe<Scalars['Int']['input']>;
}>;


export type GenerateResearchMutation = { __typename?: 'Mutation', generateResearch: { __typename?: 'GenerateResearchResult', success: boolean, message?: string | null, jobId?: string | null, count?: number | null } };

export type GenerateRoutineAnalysisMutationVariables = Exact<{
  familyMemberId: Scalars['Int']['input'];
}>;


export type GenerateRoutineAnalysisMutation = { __typename?: 'Mutation', generateRoutineAnalysis: { __typename?: 'GenerateRoutineAnalysisResult', success: boolean, message?: string | null, jobId?: string | null } };

export type GenerateTherapeuticQuestionsMutationVariables = Exact<{
  goalId?: InputMaybe<Scalars['Int']['input']>;
  issueId?: InputMaybe<Scalars['Int']['input']>;
  journalEntryId?: InputMaybe<Scalars['Int']['input']>;
}>;


export type GenerateTherapeuticQuestionsMutation = { __typename?: 'Mutation', generateTherapeuticQuestions: { __typename?: 'GenerateQuestionsResult', success: boolean, message?: string | null, jobId?: string | null, questions: Array<{ __typename?: 'TherapeuticQuestion', id: number, goalId?: number | null, issueId?: number | null, journalEntryId?: number | null, question: string, researchId?: number | null, researchTitle?: string | null, rationale: string, generatedAt: string, createdAt: string, updatedAt: string }> } };

export type GetAffirmationsQueryVariables = Exact<{
  familyMemberId: Scalars['Int']['input'];
}>;


export type GetAffirmationsQuery = { __typename?: 'Query', affirmations: Array<{ __typename?: 'Affirmation', id: number, familyMemberId: number, text: string, category: AffirmationCategory, isActive: boolean, createdAt: string, updatedAt: string }> };

export type GetAllIssuesQueryVariables = Exact<{ [key: string]: never; }>;


export type GetAllIssuesQuery = { __typename?: 'Query', allIssues: Array<{ __typename?: 'Issue', id: number, familyMemberId: number, title: string, description: string, category: string, severity: string, createdAt: string, updatedAt: string, familyMember?: { __typename?: 'FamilyMember', id: number, firstName: string, name?: string | null } | null }> };

export type GetAllNotesQueryVariables = Exact<{ [key: string]: never; }>;


export type GetAllNotesQuery = { __typename?: 'Query', allNotes: Array<{ __typename?: 'Note', id: number, entityId: number, entityType: string, createdBy: string, noteType?: string | null, slug?: string | null, title?: string | null, content: string, tags?: Array<string> | null, createdAt: string, updatedAt: string, goal?: { __typename?: 'Goal', id: number, title: string, description?: string | null, status: string } | null }> };

export type GetAllRecommendedBooksQueryVariables = Exact<{
  category?: InputMaybe<Scalars['String']['input']>;
}>;


export type GetAllRecommendedBooksQuery = { __typename?: 'Query', allRecommendedBooks: Array<{ __typename?: 'RecommendedBook', id: number, goalId?: number | null, title: string, authors: Array<string>, year?: number | null, isbn?: string | null, description: string, whyRecommended: string, category: string, amazonUrl?: string | null, generatedAt: string, createdAt: string, updatedAt: string }> };

export type GetAllStoriesQueryVariables = Exact<{ [key: string]: never; }>;


export type GetAllStoriesQuery = { __typename?: 'Query', allStories: Array<{ __typename?: 'Story', id: number, goalId?: number | null, issueId?: number | null, feedbackId?: number | null, createdBy?: string | null, content: string, language?: string | null, minutes?: number | null, audioKey?: string | null, audioUrl?: string | null, audioGeneratedAt?: string | null, createdAt: string, updatedAt: string, goal?: { __typename?: 'Goal', id: number, title: string, slug?: string | null } | null }> };

export type GetAllTagsQueryVariables = Exact<{ [key: string]: never; }>;


export type GetAllTagsQuery = { __typename?: 'Query', allTags: Array<string> };

export type GetAudioFromR2QueryVariables = Exact<{
  key: Scalars['String']['input'];
}>;


export type GetAudioFromR2Query = { __typename?: 'Query', audioFromR2?: { __typename?: 'AudioFromR2Result', success: boolean, message?: string | null, audioUrl?: string | null, key?: string | null, metadata?: { __typename?: 'AudioMetadata', voice?: string | null, model?: string | null, textLength?: string | null, chunks?: string | null, generatedBy?: string | null, instructions?: string | null } | null } | null };

export type GetBehaviorObservationQueryVariables = Exact<{
  id: Scalars['Int']['input'];
}>;


export type GetBehaviorObservationQuery = { __typename?: 'Query', behaviorObservation?: { __typename?: 'BehaviorObservation', id: number, familyMemberId: number, goalId?: number | null, createdBy: string, observedAt: string, observationType: BehaviorObservationType, frequency?: number | null, intensity?: BehaviorIntensity | null, context?: string | null, notes?: string | null, createdAt: string, updatedAt: string, familyMember?: { __typename?: 'FamilyMember', id: number, firstName: string, name?: string | null } | null, goal?: { __typename?: 'Goal', id: number, title: string, description?: string | null } | null } | null };

export type GetBehaviorObservationsQueryVariables = Exact<{
  familyMemberId: Scalars['Int']['input'];
  goalId?: InputMaybe<Scalars['Int']['input']>;
}>;


export type GetBehaviorObservationsQuery = { __typename?: 'Query', behaviorObservations: Array<{ __typename?: 'BehaviorObservation', id: number, familyMemberId: number, goalId?: number | null, createdBy: string, observedAt: string, observationType: BehaviorObservationType, frequency?: number | null, intensity?: BehaviorIntensity | null, context?: string | null, notes?: string | null, createdAt: string, updatedAt: string, familyMember?: { __typename?: 'FamilyMember', id: number, firstName: string, name?: string | null } | null, goal?: { __typename?: 'Goal', id: number, title: string } | null }> };

export type GetBogdanDiscussionJobsQueryVariables = Exact<{ [key: string]: never; }>;


export type GetBogdanDiscussionJobsQuery = { __typename?: 'Query', generationJobs: Array<{ __typename?: 'GenerationJob', id: string, type: JobType, status: JobStatus, progress: number, createdAt: string, updatedAt: string, error?: { __typename?: 'JobError', message: string } | null }> };

export type GetContactQueryVariables = Exact<{
  id?: InputMaybe<Scalars['Int']['input']>;
  slug?: InputMaybe<Scalars['String']['input']>;
}>;


export type GetContactQuery = { __typename?: 'Query', contact?: { __typename?: 'Contact', id: number, createdBy: string, slug?: string | null, firstName: string, lastName?: string | null, description?: string | null, role?: string | null, ageYears?: number | null, notes?: string | null, createdAt: string, updatedAt: string } | null };

export type GetContactFeedbackQueryVariables = Exact<{
  id: Scalars['Int']['input'];
}>;


export type GetContactFeedbackQuery = { __typename?: 'Query', contactFeedback?: { __typename?: 'ContactFeedback', id: number, contactId: number, familyMemberId: number, createdBy: string, subject?: string | null, feedbackDate: string, content: string, tags?: Array<string> | null, source?: FeedbackSource | null, extracted: boolean, createdAt: string, updatedAt: string, extractedIssues?: Array<{ __typename?: 'ExtractedIssue', title: string, description: string, category: string, severity: string, recommendations?: Array<string> | null }> | null, stories: Array<{ __typename?: 'Story', id: number, goalId?: number | null, language?: string | null, minutes?: number | null, content: string, audioKey?: string | null, audioUrl?: string | null, audioGeneratedAt?: string | null, createdAt: string, updatedAt: string }>, contact?: { __typename?: 'Contact', id: number, firstName: string, lastName?: string | null, slug?: string | null } | null, familyMember?: { __typename?: 'FamilyMember', id: number, firstName: string, name?: string | null, slug?: string | null } | null } | null };

export type GetContactFeedbacksQueryVariables = Exact<{
  contactId: Scalars['Int']['input'];
  familyMemberId: Scalars['Int']['input'];
}>;


export type GetContactFeedbacksQuery = { __typename?: 'Query', contactFeedbacks: Array<{ __typename?: 'ContactFeedback', id: number, contactId: number, familyMemberId: number, createdBy: string, subject?: string | null, feedbackDate: string, content: string, tags?: Array<string> | null, source?: FeedbackSource | null, extracted: boolean, createdAt: string, updatedAt: string, extractedIssues?: Array<{ __typename?: 'ExtractedIssue', title: string, description: string, category: string, severity: string, recommendations?: Array<string> | null }> | null, contact?: { __typename?: 'Contact', id: number, firstName: string, lastName?: string | null, slug?: string | null } | null, familyMember?: { __typename?: 'FamilyMember', id: number, firstName: string, name?: string | null } | null }> };

export type GetContactsQueryVariables = Exact<{ [key: string]: never; }>;


export type GetContactsQuery = { __typename?: 'Query', contacts: Array<{ __typename?: 'Contact', id: number, createdBy: string, slug?: string | null, firstName: string, lastName?: string | null, description?: string | null, role?: string | null, ageYears?: number | null, notes?: string | null, createdAt: string, updatedAt: string }> };

export type GetConversationQueryVariables = Exact<{
  id: Scalars['Int']['input'];
}>;


export type GetConversationQuery = { __typename?: 'Query', conversation?: { __typename?: 'Conversation', id: number, issueId: number, userId: string, title?: string | null, createdAt: string, updatedAt: string, messages: Array<{ __typename?: 'ConversationMessage', id: number, conversationId: number, role: string, content: string, createdAt: string }> } | null };

export type GetConversationsForIssueQueryVariables = Exact<{
  issueId: Scalars['Int']['input'];
}>;


export type GetConversationsForIssueQuery = { __typename?: 'Query', conversationsForIssue: Array<{ __typename?: 'Conversation', id: number, issueId: number, userId: string, title?: string | null, createdAt: string, updatedAt: string, messages: Array<{ __typename?: 'ConversationMessage', id: number, conversationId: number, role: string, content: string, createdAt: string }> }> };

export type GetDeepAnalysesQueryVariables = Exact<{
  subjectType: DeepAnalysisSubjectType;
  subjectId: Scalars['Int']['input'];
}>;


export type GetDeepAnalysesQuery = { __typename?: 'Query', deepAnalyses: Array<{ __typename?: 'DeepAnalysis', id: number, subjectType: DeepAnalysisSubjectType, subjectId: number, triggerType?: DeepAnalysisTriggerType | null, triggerId?: number | null, createdBy: string, jobId?: string | null, summary: string, model: string, createdAt: string, updatedAt: string, patternClusters: Array<{ __typename?: 'PatternCluster', name: string, description: string, issueIds: Array<number>, issueTitles: Array<string>, categories: Array<string>, pattern: string, confidence: number, suggestedRootCause?: string | null }>, timelineAnalysis: { __typename?: 'TimelineAnalysis', moodCorrelation?: string | null, escalationTrend?: string | null, criticalPeriods: Array<string>, phases: Array<{ __typename?: 'TimelinePhase', period: string, issueIds: Array<number>, description: string, moodTrend?: string | null, keyEvents: Array<string> }> }, familySystemInsights: Array<{ __typename?: 'FamilySystemInsight', insight: string, involvedMemberIds: Array<number>, involvedMemberNames: Array<string>, evidenceIssueIds: Array<number>, systemicPattern?: string | null, actionable: boolean }>, priorityRecommendations: Array<{ __typename?: 'PriorityRecommendation', rank: number, issueId?: number | null, issueTitle?: string | null, rationale: string, urgency: string, suggestedApproach: string, relatedResearchIds?: Array<number> | null }>, researchRelevance: Array<{ __typename?: 'ResearchRelevanceMapping', patternClusterName: string, relevantResearchIds: Array<number>, relevantResearchTitles: Array<string>, coverageGaps: Array<string> }>, parentAdvice: Array<{ __typename?: 'ParentAdviceItem', title: string, advice: string, targetIssueIds: Array<number>, targetIssueTitles: Array<string>, relatedPatternCluster?: string | null, relatedResearchIds?: Array<number> | null, relatedResearchTitles?: Array<string> | null, ageAppropriate: boolean, developmentalContext?: string | null, priority: string, concreteSteps: Array<string> }>, dataSnapshot: { __typename?: 'DataSnapshot', issueCount: number, observationCount: number, journalEntryCount: number, contactFeedbackCount: number, teacherFeedbackCount: number, researchPaperCount: number, relatedMemberIssueCount: number } }> };

export type GetDeepIssueAnalysesQueryVariables = Exact<{
  familyMemberId: Scalars['Int']['input'];
}>;


export type GetDeepIssueAnalysesQuery = { __typename?: 'Query', deepIssueAnalyses: Array<{ __typename?: 'DeepIssueAnalysis', id: number, familyMemberId: number, triggerIssueId?: number | null, createdBy: string, jobId?: string | null, summary: string, model: string, createdAt: string, updatedAt: string, patternClusters: Array<{ __typename?: 'PatternCluster', name: string, description: string, issueIds: Array<number>, issueTitles: Array<string>, categories: Array<string>, pattern: string, confidence: number, suggestedRootCause?: string | null }>, timelineAnalysis: { __typename?: 'TimelineAnalysis', moodCorrelation?: string | null, escalationTrend?: string | null, criticalPeriods: Array<string>, phases: Array<{ __typename?: 'TimelinePhase', period: string, issueIds: Array<number>, description: string, moodTrend?: string | null, keyEvents: Array<string> }> }, familySystemInsights: Array<{ __typename?: 'FamilySystemInsight', insight: string, involvedMemberIds: Array<number>, involvedMemberNames: Array<string>, evidenceIssueIds: Array<number>, systemicPattern?: string | null, actionable: boolean }>, priorityRecommendations: Array<{ __typename?: 'PriorityRecommendation', rank: number, issueId?: number | null, issueTitle?: string | null, rationale: string, urgency: string, suggestedApproach: string, relatedResearchIds?: Array<number> | null }>, researchRelevance: Array<{ __typename?: 'ResearchRelevanceMapping', patternClusterName: string, relevantResearchIds: Array<number>, relevantResearchTitles: Array<string>, coverageGaps: Array<string> }>, parentAdvice: Array<{ __typename?: 'ParentAdviceItem', title: string, advice: string, targetIssueIds: Array<number>, targetIssueTitles: Array<string>, relatedPatternCluster?: string | null, relatedResearchIds?: Array<number> | null, relatedResearchTitles?: Array<string> | null, ageAppropriate: boolean, developmentalContext?: string | null, priority: string, concreteSteps: Array<string> }>, dataSnapshot: { __typename?: 'DataSnapshot', issueCount: number, observationCount: number, journalEntryCount: number, contactFeedbackCount: number, teacherFeedbackCount: number, researchPaperCount: number, relatedMemberIssueCount: number } }> };

export type GetFamilyMemberQueryVariables = Exact<{
  id?: InputMaybe<Scalars['Int']['input']>;
  slug?: InputMaybe<Scalars['String']['input']>;
}>;


export type GetFamilyMemberQuery = { __typename?: 'Query', familyMember?: { __typename?: 'FamilyMember', id: number, userId: string, slug?: string | null, firstName: string, name?: string | null, ageYears?: number | null, relationship?: string | null, email?: string | null, phone?: string | null, location?: string | null, occupation?: string | null, dateOfBirth?: string | null, bio?: string | null, allergies?: string | null, createdAt: string, updatedAt: string, shares: Array<{ __typename?: 'FamilyMemberShare', familyMemberId: number, email: string, role: FamilyMemberShareRole, createdAt: string, createdBy: string }>, goals: Array<{ __typename?: 'Goal', id: number, title: string, status: string, description?: string | null, createdAt: string }>, behaviorObservations: Array<{ __typename?: 'BehaviorObservation', id: number, familyMemberId: number, goalId?: number | null, createdBy: string, observedAt: string, observationType: BehaviorObservationType, frequency?: number | null, intensity?: BehaviorIntensity | null, context?: string | null, notes?: string | null, createdAt: string, updatedAt: string }>, teacherFeedbacks: Array<{ __typename?: 'TeacherFeedback', id: number, familyMemberId: number, createdBy: string, teacherName: string, subject?: string | null, feedbackDate: string, content: string, tags?: Array<string> | null, source?: FeedbackSource | null, extracted: boolean, createdAt: string, updatedAt: string }>, issues: Array<{ __typename?: 'Issue', id: number, feedbackId?: number | null, familyMemberId: number, createdBy: string, title: string, description: string, category: string, severity: string, recommendations?: Array<string> | null, createdAt: string, updatedAt: string }>, relationships: Array<{ __typename?: 'Relationship', id: number, createdBy: string, subjectType: PersonType, subjectId: number, relatedType: PersonType, relatedId: number, relationshipType: string, context?: string | null, startDate?: string | null, status: RelationshipStatus, createdAt: string, updatedAt: string, related?: { __typename?: 'RelationshipPerson', id: number, type: PersonType, slug?: string | null, firstName: string, lastName?: string | null } | null }> } | null };

export type GetFamilyMembersQueryVariables = Exact<{ [key: string]: never; }>;


export type GetFamilyMembersQuery = { __typename?: 'Query', familyMembers: Array<{ __typename?: 'FamilyMember', id: number, userId: string, slug?: string | null, firstName: string, name?: string | null, ageYears?: number | null, relationship?: string | null, email?: string | null, phone?: string | null, location?: string | null, occupation?: string | null, dateOfBirth?: string | null, bio?: string | null, allergies?: string | null, createdAt: string, updatedAt: string, shares: Array<{ __typename?: 'FamilyMemberShare', familyMemberId: number, email: string, role: FamilyMemberShareRole, createdAt: string, createdBy: string }>, relationships: Array<{ __typename?: 'Relationship', id: number, subjectType: PersonType, subjectId: number, relatedType: PersonType, relatedId: number, relationshipType: string, status: RelationshipStatus, related?: { __typename?: 'RelationshipPerson', id: number, type: PersonType, slug?: string | null, firstName: string, lastName?: string | null } | null }> }> };

export type GetGameQueryVariables = Exact<{
  id: Scalars['Int']['input'];
}>;


export type GetGameQuery = { __typename?: 'Query', game?: { __typename?: 'Game', id: number, userId: string, goalId?: number | null, issueId?: number | null, familyMemberId?: number | null, type: GameType, title: string, description?: string | null, content: string, language?: string | null, estimatedMinutes?: number | null, source: GameSource, createdAt: string, updatedAt: string, goal?: { __typename?: 'Goal', id: number, title: string } | null, issue?: { __typename?: 'Issue', id: number, title: string } | null, completions: Array<{ __typename?: 'GameCompletion', id: number, gameId: number, durationSeconds?: number | null, responses?: string | null, linkedNoteId?: number | null, completedAt: string }> } | null };

export type GetGamesQueryVariables = Exact<{
  type?: InputMaybe<GameType>;
  goalId?: InputMaybe<Scalars['Int']['input']>;
  issueId?: InputMaybe<Scalars['Int']['input']>;
  familyMemberId?: InputMaybe<Scalars['Int']['input']>;
}>;


export type GetGamesQuery = { __typename?: 'Query', games: Array<{ __typename?: 'Game', id: number, userId: string, goalId?: number | null, issueId?: number | null, familyMemberId?: number | null, type: GameType, title: string, description?: string | null, language?: string | null, estimatedMinutes?: number | null, source: GameSource, createdAt: string, updatedAt: string }> };

export type GetGenerationJobQueryVariables = Exact<{
  id: Scalars['String']['input'];
}>;


export type GetGenerationJobQuery = { __typename?: 'Query', generationJob?: { __typename?: 'GenerationJob', id: string, type: JobType, goalId?: number | null, storyId?: number | null, status: JobStatus, progress: number, createdAt: string, updatedAt: string, result?: { __typename?: 'JobResult', audioUrl?: string | null, progress?: number | null, stage?: string | null, count?: number | null, message?: string | null, diagnostics?: { __typename?: 'PipelineDiagnostics', searchCount?: number | null, enrichedCount?: number | null, extractedCount?: number | null, qualifiedCount?: number | null, persistedCount?: number | null, searchUsedFallback?: boolean | null, enrichedDropped?: number | null } | null } | null, error?: { __typename?: 'JobError', message: string } | null } | null };

export type GetGenerationJobsQueryVariables = Exact<{
  goalId?: InputMaybe<Scalars['Int']['input']>;
  status?: InputMaybe<Scalars['String']['input']>;
}>;


export type GetGenerationJobsQuery = { __typename?: 'Query', generationJobs: Array<{ __typename?: 'GenerationJob', id: string, type: JobType, storyId?: number | null, status: JobStatus, progress: number, updatedAt: string, result?: { __typename?: 'JobResult', audioUrl?: string | null } | null, error?: { __typename?: 'JobError', message: string } | null }> };

export type GetGoalQueryVariables = Exact<{
  id?: InputMaybe<Scalars['Int']['input']>;
  slug?: InputMaybe<Scalars['String']['input']>;
}>;


export type GetGoalQuery = { __typename?: 'Query', goal?: { __typename?: 'Goal', id: number, slug?: string | null, title: string, description?: string | null, status: string, priority: string, targetDate?: string | null, tags?: Array<string> | null, familyMemberId?: number | null, createdBy: string, parentGoalId?: number | null, therapeuticText?: string | null, therapeuticTextLanguage?: string | null, therapeuticTextGeneratedAt?: string | null, parentAdvice?: string | null, parentAdviceLanguage?: string | null, parentAdviceGeneratedAt?: string | null, storyLanguage?: string | null, createdAt: string, updatedAt: string, familyMember?: { __typename?: 'FamilyMember', id: number, slug?: string | null, firstName: string, name?: string | null, ageYears?: number | null, relationship?: string | null } | null, parentGoal?: { __typename?: 'Goal', id: number, slug?: string | null, title: string, status: string } | null, subGoals: Array<{ __typename?: 'Goal', id: number, slug?: string | null, title: string, description?: string | null, status: string, createdAt: string, updatedAt: string }>, notes: Array<{ __typename?: 'Note', id: number, slug?: string | null, content: string, noteType?: string | null, tags?: Array<string> | null, createdAt: string, updatedAt: string }>, questions: Array<{ __typename?: 'TherapeuticQuestion', id: number, question: string, researchId?: number | null, researchTitle?: string | null, rationale: string, generatedAt: string }>, research: Array<{ __typename?: 'Research', id: number, title: string, authors: Array<string>, year?: number | null, journal?: string | null, doi?: string | null, url?: string | null, abstract?: string | null, keyFindings: Array<string>, therapeuticTechniques: Array<string>, evidenceLevel?: string | null, relevanceScore: number, extractionConfidence: number }>, recommendedBooks: Array<{ __typename?: 'RecommendedBook', id: number, title: string, authors: Array<string>, year?: number | null, isbn?: string | null, description: string, whyRecommended: string, category: string, amazonUrl?: string | null, generatedAt: string }>, stories: Array<{ __typename?: 'Story', id: number, goalId?: number | null, issueId?: number | null, feedbackId?: number | null, createdBy?: string | null, content: string, language?: string | null, minutes?: number | null, audioKey?: string | null, audioUrl?: string | null, audioGeneratedAt?: string | null, createdAt: string, updatedAt: string }> } | null };

export type GetGoalsQueryVariables = Exact<{
  familyMemberId?: InputMaybe<Scalars['Int']['input']>;
  status?: InputMaybe<Scalars['String']['input']>;
  tag?: InputMaybe<Scalars['String']['input']>;
}>;


export type GetGoalsQuery = { __typename?: 'Query', goals: Array<{ __typename?: 'Goal', id: number, title: string, description?: string | null, status: string, tags?: Array<string> | null, familyMemberId?: number | null, createdBy: string, parentGoalId?: number | null, createdAt: string, updatedAt: string, familyMember?: { __typename?: 'FamilyMember', id: number, firstName: string, name?: string | null, relationship?: string | null } | null, notes: Array<{ __typename?: 'Note', id: number, slug?: string | null, noteType?: string | null, tags?: Array<string> | null, createdAt: string }> }> };

export type GetHabitQueryVariables = Exact<{
  id: Scalars['Int']['input'];
}>;


export type GetHabitQuery = { __typename?: 'Query', habit?: { __typename?: 'Habit', id: number, title: string, description?: string | null, frequency: HabitFrequency, targetCount: number, status: HabitStatus, goalId?: number | null, familyMemberId?: number | null, issueId?: number | null, createdAt: string, updatedAt: string, logs: Array<{ __typename?: 'HabitLog', id: number, habitId: number, loggedDate: string, count: number, notes?: string | null, createdAt: string }>, todayLog?: { __typename?: 'HabitLog', id: number, loggedDate: string, count: number } | null } | null };

export type GetHabitsQueryVariables = Exact<{
  status?: InputMaybe<Scalars['String']['input']>;
  familyMemberId?: InputMaybe<Scalars['Int']['input']>;
}>;


export type GetHabitsQuery = { __typename?: 'Query', habits: Array<{ __typename?: 'Habit', id: number, title: string, description?: string | null, frequency: HabitFrequency, targetCount: number, status: HabitStatus, goalId?: number | null, familyMemberId?: number | null, issueId?: number | null, createdAt: string, updatedAt: string, todayLog?: { __typename?: 'HabitLog', id: number, loggedDate: string, count: number } | null }> };

export type GetIssueQueryVariables = Exact<{
  id: Scalars['Int']['input'];
}>;


export type GetIssueQuery = { __typename?: 'Query', issue?: { __typename?: 'Issue', id: number, feedbackId?: number | null, journalEntryId?: number | null, familyMemberId: number, createdBy: string, title: string, description: string, category: string, severity: string, recommendations?: Array<string> | null, createdAt: string, updatedAt: string, relatedFamilyMemberId?: number | null, journalEntry?: { __typename?: 'JournalEntry', id: number, title?: string | null, entryDate: string } | null, feedback?: { __typename?: 'ContactFeedback', id: number, contactId: number, familyMemberId: number, subject?: string | null, feedbackDate: string, content: string, tags?: Array<string> | null, source?: FeedbackSource | null, extracted: boolean, contact?: { __typename?: 'Contact', id: number, firstName: string, lastName?: string | null, slug?: string | null } | null, familyMember?: { __typename?: 'FamilyMember', id: number, firstName: string, name?: string | null, slug?: string | null } | null } | null, familyMember?: { __typename?: 'FamilyMember', id: number, firstName: string, name?: string | null, slug?: string | null } | null, relatedFamilyMember?: { __typename?: 'FamilyMember', id: number, firstName: string, name?: string | null, slug?: string | null } | null, stories: Array<{ __typename?: 'Story', id: number, language?: string | null, minutes?: number | null, createdAt: string }>, contacts: Array<{ __typename?: 'Contact', id: number, firstName: string, lastName?: string | null, role?: string | null, slug?: string | null }>, relatedIssues: Array<{ __typename?: 'IssueLink', id: number, linkType: string, issue: { __typename?: 'Issue', id: number, title: string, category: string, severity: string, familyMemberId: number, createdAt: string, familyMember?: { __typename?: 'FamilyMember', id: number, firstName: string, name?: string | null, slug?: string | null } | null } }>, screenshots: Array<{ __typename?: 'IssueScreenshot', id: number, issueId: number, url: string, filename: string, contentType: string, sizeBytes: number, caption?: string | null, createdAt: string }> } | null };

export type GetIssuesQueryVariables = Exact<{
  familyMemberId: Scalars['Int']['input'];
  feedbackId?: InputMaybe<Scalars['Int']['input']>;
}>;


export type GetIssuesQuery = { __typename?: 'Query', issues: Array<{ __typename?: 'Issue', id: number, feedbackId?: number | null, familyMemberId: number, createdBy: string, title: string, description: string, category: string, severity: string, recommendations?: Array<string> | null, createdAt: string, updatedAt: string }> };

export type GetJournalEntriesQueryVariables = Exact<{
  familyMemberId?: InputMaybe<Scalars['Int']['input']>;
  goalId?: InputMaybe<Scalars['Int']['input']>;
  mood?: InputMaybe<Scalars['String']['input']>;
  tag?: InputMaybe<Scalars['String']['input']>;
  fromDate?: InputMaybe<Scalars['String']['input']>;
  toDate?: InputMaybe<Scalars['String']['input']>;
}>;


export type GetJournalEntriesQuery = { __typename?: 'Query', journalEntries: Array<{ __typename?: 'JournalEntry', id: number, createdBy: string, familyMemberId?: number | null, title?: string | null, content: string, mood?: string | null, moodScore?: number | null, tags?: Array<string> | null, goalId?: number | null, isPrivate: boolean, isVault: boolean, entryDate: string, createdAt: string, updatedAt: string, familyMember?: { __typename?: 'FamilyMember', id: number, firstName: string, name?: string | null } | null, goal?: { __typename?: 'Goal', id: number, title: string } | null }> };

export type GetJournalEntryQueryVariables = Exact<{
  id: Scalars['Int']['input'];
}>;


export type GetJournalEntryQuery = { __typename?: 'Query', journalEntry?: { __typename?: 'JournalEntry', id: number, createdBy: string, familyMemberId?: number | null, title?: string | null, content: string, mood?: string | null, moodScore?: number | null, tags?: Array<string> | null, goalId?: number | null, isPrivate: boolean, isVault: boolean, entryDate: string, createdAt: string, updatedAt: string, familyMember?: { __typename?: 'FamilyMember', id: number, firstName: string, name?: string | null } | null, goal?: { __typename?: 'Goal', id: number, title: string, description?: string | null } | null, issue?: { __typename?: 'Issue', id: number, title: string, category: string, severity: string, familyMember?: { __typename?: 'FamilyMember', id: number, firstName: string, name?: string | null, slug?: string | null } | null } | null, analysis?: { __typename?: 'JournalAnalysis', id: number, journalEntryId: number, summary: string, reflectionPrompts: Array<string>, model: string, createdAt: string, emotionalLandscape: { __typename?: 'EmotionalLandscape', primaryEmotions: Array<string>, underlyingEmotions: Array<string>, emotionalRegulation: string, attachmentPatterns?: string | null }, therapeuticInsights: Array<{ __typename?: 'TherapeuticInsight', title: string, observation: string, clinicalRelevance: string, relatedResearchIds?: Array<number> | null }>, actionableRecommendations: Array<{ __typename?: 'ActionableRecommendation', title: string, description: string, priority: string, concreteSteps: Array<string>, relatedResearchIds?: Array<number> | null }> } | null, discussionGuide?: { __typename?: 'DiscussionGuide', id: number, journalEntryId: number, childAge?: number | null, behaviorSummary: string, model: string, createdAt: string, developmentalContext: { __typename?: 'DevelopmentalContext', stage: string, explanation: string, normalizedBehavior: string, researchBasis?: string | null }, conversationStarters: Array<{ __typename?: 'ConversationStarter', opener: string, context: string, ageAppropriateNote?: string | null }>, talkingPoints: Array<{ __typename?: 'TalkingPoint', point: string, explanation: string, researchBacking?: string | null, relatedResearchIds?: Array<number> | null }>, languageGuide: { __typename?: 'LanguageGuide', whatToSay: Array<{ __typename?: 'LanguageExample', phrase: string, reason: string, alternative?: string | null }>, whatNotToSay: Array<{ __typename?: 'LanguageExample', phrase: string, reason: string, alternative?: string | null }> }, anticipatedReactions: Array<{ __typename?: 'AnticipatedReaction', reaction: string, likelihood: string, howToRespond: string }>, followUpPlan: Array<{ __typename?: 'FollowUpStep', action: string, timing: string, description: string }> } | null } | null };

export type GetJournalRecommendedBooksQueryVariables = Exact<{
  journalEntryId: Scalars['Int']['input'];
}>;


export type GetJournalRecommendedBooksQuery = { __typename?: 'Query', recommendedBooks: Array<{ __typename?: 'RecommendedBook', id: number, goalId?: number | null, journalEntryId?: number | null, title: string, authors: Array<string>, year?: number | null, isbn?: string | null, description: string, whyRecommended: string, category: string, amazonUrl?: string | null, generatedAt: string, createdAt: string, updatedAt: string }> };

export type GetMySharedFamilyMembersQueryVariables = Exact<{ [key: string]: never; }>;


export type GetMySharedFamilyMembersQuery = { __typename?: 'Query', mySharedFamilyMembers: Array<{ __typename?: 'FamilyMember', id: number, userId: string, slug?: string | null, firstName: string, name?: string | null, relationship?: string | null, email?: string | null, createdAt: string }> };

export type GetNoteQueryVariables = Exact<{
  id?: InputMaybe<Scalars['Int']['input']>;
  slug?: InputMaybe<Scalars['String']['input']>;
}>;


export type GetNoteQuery = { __typename?: 'Query', note?: { __typename?: 'Note', id: number, entityId: number, entityType: string, createdBy: string, noteType?: string | null, slug?: string | null, title?: string | null, content: string, tags?: Array<string> | null, createdAt: string, updatedAt: string, goal?: { __typename?: 'Goal', id: number, title: string, description?: string | null, status: string, createdAt: string } | null, linkedResearch?: Array<{ __typename?: 'Research', id: number, title: string, authors: Array<string>, year?: number | null, journal?: string | null, url?: string | null, therapeuticGoalType: string, relevanceScore: number }> | null, claimCards?: Array<{ __typename?: 'ClaimCard', id: string, claim: string, verdict: ClaimVerdict, confidence: number, queries: Array<string>, createdAt: string, updatedAt: string, notes?: string | null, scope?: { __typename?: 'ClaimScope', population?: string | null, intervention?: string | null, comparator?: string | null, outcome?: string | null, timeframe?: string | null, setting?: string | null } | null, evidence: Array<{ __typename?: 'EvidenceItem', polarity: EvidencePolarity, score?: number | null, excerpt?: string | null, rationale?: string | null, locator?: { __typename?: 'EvidenceLocator', page?: number | null, section?: string | null, url?: string | null } | null, paper: { __typename?: 'PaperCandidate', title: string, year?: number | null, doi?: string | null, url?: string | null, oaUrl?: string | null, source: string, authors?: Array<string> | null, abstract?: string | null, journal?: string | null } }>, provenance: { __typename?: 'ClaimProvenance', generatedBy: string, model?: string | null, sourceTools: Array<string> } }> | null } | null };

export type GetNotesQueryVariables = Exact<{
  entityId: Scalars['Int']['input'];
  entityType: Scalars['String']['input'];
}>;


export type GetNotesQuery = { __typename?: 'Query', notes: Array<{ __typename?: 'Note', id: number, entityId: number, entityType: string, createdBy: string, noteType?: string | null, slug?: string | null, title?: string | null, content: string, tags?: Array<string> | null, createdAt: string, updatedAt: string, goal?: { __typename?: 'Goal', id: number, title: string, description?: string | null, status: string } | null }> };

export type GetPublicDiscussionGuideQueryVariables = Exact<{
  journalEntryId: Scalars['Int']['input'];
}>;


export type GetPublicDiscussionGuideQuery = { __typename?: 'Query', publicDiscussionGuide?: { __typename?: 'PublicDiscussionGuideResult', entryTitle?: string | null, familyMemberName?: string | null, guide?: { __typename?: 'DiscussionGuide', id: number, journalEntryId: number, childAge?: number | null, behaviorSummary: string, model: string, createdAt: string, developmentalContext: { __typename?: 'DevelopmentalContext', stage: string, explanation: string, normalizedBehavior: string, researchBasis?: string | null }, conversationStarters: Array<{ __typename?: 'ConversationStarter', opener: string, context: string, ageAppropriateNote?: string | null }>, talkingPoints: Array<{ __typename?: 'TalkingPoint', point: string, explanation: string, researchBacking?: string | null, relatedResearchIds?: Array<number> | null }>, languageGuide: { __typename?: 'LanguageGuide', whatToSay: Array<{ __typename?: 'LanguageExample', phrase: string, reason: string, alternative?: string | null }>, whatNotToSay: Array<{ __typename?: 'LanguageExample', phrase: string, reason: string, alternative?: string | null }> }, anticipatedReactions: Array<{ __typename?: 'AnticipatedReaction', reaction: string, likelihood: string, howToRespond: string }>, followUpPlan: Array<{ __typename?: 'FollowUpStep', action: string, timing: string, description: string }> } | null } | null };

export type GetRecentJobsQueryVariables = Exact<{ [key: string]: never; }>;


export type GetRecentJobsQuery = { __typename?: 'Query', generationJobs: Array<{ __typename?: 'GenerationJob', id: string, type: JobType, goalId?: number | null, storyId?: number | null, status: JobStatus, progress: number, createdAt: string, updatedAt: string, result?: { __typename?: 'JobResult', count?: number | null, stage?: string | null, audioUrl?: string | null } | null, error?: { __typename?: 'JobError', message: string } | null }> };

export type GetRecommendedBooksQueryVariables = Exact<{
  goalId: Scalars['Int']['input'];
}>;


export type GetRecommendedBooksQuery = { __typename?: 'Query', recommendedBooks: Array<{ __typename?: 'RecommendedBook', id: number, goalId?: number | null, title: string, authors: Array<string>, year?: number | null, isbn?: string | null, description: string, whyRecommended: string, category: string, amazonUrl?: string | null, generatedAt: string, createdAt: string, updatedAt: string }> };

export type GetRelationshipQueryVariables = Exact<{
  id: Scalars['Int']['input'];
}>;


export type GetRelationshipQuery = { __typename?: 'Query', relationship?: { __typename?: 'Relationship', id: number, createdBy: string, subjectType: PersonType, subjectId: number, relatedType: PersonType, relatedId: number, relationshipType: string, context?: string | null, startDate?: string | null, status: RelationshipStatus, createdAt: string, updatedAt: string, subject?: { __typename?: 'RelationshipPerson', id: number, type: PersonType, firstName: string, lastName?: string | null } | null, related?: { __typename?: 'RelationshipPerson', id: number, type: PersonType, firstName: string, lastName?: string | null } | null } | null };

export type GetRelationshipsQueryVariables = Exact<{
  subjectType: PersonType;
  subjectId: Scalars['Int']['input'];
}>;


export type GetRelationshipsQuery = { __typename?: 'Query', relationships: Array<{ __typename?: 'Relationship', id: number, createdBy: string, subjectType: PersonType, subjectId: number, relatedType: PersonType, relatedId: number, relationshipType: string, context?: string | null, startDate?: string | null, status: RelationshipStatus, createdAt: string, updatedAt: string, subject?: { __typename?: 'RelationshipPerson', id: number, type: PersonType, slug?: string | null, firstName: string, lastName?: string | null } | null, related?: { __typename?: 'RelationshipPerson', id: number, type: PersonType, slug?: string | null, firstName: string, lastName?: string | null } | null }> };

export type GetResearchQueryVariables = Exact<{
  goalId?: InputMaybe<Scalars['Int']['input']>;
  issueId?: InputMaybe<Scalars['Int']['input']>;
  feedbackId?: InputMaybe<Scalars['Int']['input']>;
  journalEntryId?: InputMaybe<Scalars['Int']['input']>;
}>;


export type GetResearchQuery = { __typename?: 'Query', research: Array<{ __typename?: 'Research', id: number, goalId?: number | null, feedbackId?: number | null, journalEntryId?: number | null, title: string, authors: Array<string>, year?: number | null, journal?: string | null, doi?: string | null, url?: string | null, abstract?: string | null, keyFindings: Array<string>, therapeuticTechniques: Array<string>, evidenceLevel?: string | null, relevanceScore: number, extractedBy: string, extractionConfidence: number, createdAt: string }> };

export type GetRoutineAnalysesQueryVariables = Exact<{
  familyMemberId: Scalars['Int']['input'];
}>;


export type GetRoutineAnalysesQuery = { __typename?: 'Query', routineAnalyses: Array<{ __typename?: 'RoutineAnalysis', id: number, familyMemberId: number, createdBy: string, jobId?: string | null, summary: string, model: string, createdAt: string, updatedAt: string, adherencePatterns: Array<{ __typename?: 'HabitAdherence', habitId: number, habitTitle: string, frequency: string, targetCount: number, observedCount: number, consistency: number, currentStreak: number, longestStreak: number, missedPattern?: string | null, interpretation: string }>, routineBalance: { __typename?: 'RoutineBalance', domainsCovered: Array<string>, domainsMissing: Array<string>, overEmphasized: Array<string>, underEmphasized: Array<string>, verdict: string }, streaks: { __typename?: 'StreakSummary', strongestHabitId?: number | null, strongestStreak: number, weakestHabitId?: number | null, weakestStreak: number, momentum: string }, gaps: Array<{ __typename?: 'RoutineGap', area: string, rationale: string, severity: string }>, optimizationSuggestions: Array<{ __typename?: 'RoutineOptimization', title: string, rationale: string, priority: string, changeType: string, targetHabitId?: number | null, suggestedFrequency?: string | null, suggestedTargetCount?: number | null, concreteSteps: Array<string>, ageAppropriate: boolean, developmentalContext?: string | null }>, researchRelevance: Array<{ __typename?: 'RoutineResearchMapping', topic: string, relevantResearchIds: Array<number>, relevantResearchTitles: Array<string>, coverageGaps: Array<string> }>, dataSnapshot: { __typename?: 'RoutineDataSnapshot', habitsCount: number, activeDailyCount: number, activeWeeklyCount: number, logCount: number, windowDays: number, overallAdherence: number, linkedGoalCount: number, linkedIssueCount: number, researchPaperCount: number, issueCount?: number | null, journalEntryCount?: number | null, observationCount?: number | null, teacherFeedbackCount?: number | null, contactFeedbackCount?: number | null, narrowTherapyHabitsCount?: number | null } }> };

export type GetRoutineAnalysisQueryVariables = Exact<{
  id: Scalars['Int']['input'];
}>;


export type GetRoutineAnalysisQuery = { __typename?: 'Query', routineAnalysis?: { __typename?: 'RoutineAnalysis', id: number, familyMemberId: number, createdBy: string, jobId?: string | null, summary: string, model: string, createdAt: string, updatedAt: string, adherencePatterns: Array<{ __typename?: 'HabitAdherence', habitId: number, habitTitle: string, frequency: string, targetCount: number, observedCount: number, consistency: number, currentStreak: number, longestStreak: number, missedPattern?: string | null, interpretation: string }>, routineBalance: { __typename?: 'RoutineBalance', domainsCovered: Array<string>, domainsMissing: Array<string>, overEmphasized: Array<string>, underEmphasized: Array<string>, verdict: string }, streaks: { __typename?: 'StreakSummary', strongestHabitId?: number | null, strongestStreak: number, weakestHabitId?: number | null, weakestStreak: number, momentum: string }, gaps: Array<{ __typename?: 'RoutineGap', area: string, rationale: string, severity: string }>, optimizationSuggestions: Array<{ __typename?: 'RoutineOptimization', title: string, rationale: string, priority: string, changeType: string, targetHabitId?: number | null, suggestedFrequency?: string | null, suggestedTargetCount?: number | null, concreteSteps: Array<string>, ageAppropriate: boolean, developmentalContext?: string | null }>, researchRelevance: Array<{ __typename?: 'RoutineResearchMapping', topic: string, relevantResearchIds: Array<number>, relevantResearchTitles: Array<string>, coverageGaps: Array<string> }>, dataSnapshot: { __typename?: 'RoutineDataSnapshot', habitsCount: number, activeDailyCount: number, activeWeeklyCount: number, logCount: number, windowDays: number, overallAdherence: number, linkedGoalCount: number, linkedIssueCount: number, researchPaperCount: number, issueCount?: number | null, journalEntryCount?: number | null, observationCount?: number | null, teacherFeedbackCount?: number | null, contactFeedbackCount?: number | null, narrowTherapyHabitsCount?: number | null } } | null };

export type GetStoriesQueryVariables = Exact<{
  goalId: Scalars['Int']['input'];
}>;


export type GetStoriesQuery = { __typename?: 'Query', stories: Array<{ __typename?: 'Story', id: number, goalId?: number | null, createdBy?: string | null, content: string, createdAt: string, updatedAt: string }> };

export type GetStoryQueryVariables = Exact<{
  id: Scalars['Int']['input'];
}>;


export type GetStoryQuery = { __typename?: 'Query', story?: { __typename?: 'Story', id: number, goalId?: number | null, issueId?: number | null, feedbackId?: number | null, createdBy?: string | null, content: string, language?: string | null, minutes?: number | null, audioKey?: string | null, audioUrl?: string | null, audioGeneratedAt?: string | null, createdAt: string, updatedAt: string, goal?: { __typename?: 'Goal', id: number, title: string, slug?: string | null } | null, issue?: { __typename?: 'Issue', id: number, title: string, familyMember?: { __typename?: 'FamilyMember', id: number, firstName: string, name?: string | null, slug?: string | null } | null } | null } | null };

export type GetTeacherFeedbacksQueryVariables = Exact<{
  familyMemberId: Scalars['Int']['input'];
}>;


export type GetTeacherFeedbacksQuery = { __typename?: 'Query', teacherFeedbacks: Array<{ __typename?: 'TeacherFeedback', id: number, familyMemberId: number, createdBy: string, teacherName: string, subject?: string | null, feedbackDate: string, content: string, tags?: Array<string> | null, source?: FeedbackSource | null, extracted: boolean, createdAt: string, updatedAt: string, familyMember?: { __typename?: 'FamilyMember', id: number, firstName: string, name?: string | null } | null }> };

export type GetTherapeuticQuestionsQueryVariables = Exact<{
  goalId?: InputMaybe<Scalars['Int']['input']>;
  issueId?: InputMaybe<Scalars['Int']['input']>;
  journalEntryId?: InputMaybe<Scalars['Int']['input']>;
}>;


export type GetTherapeuticQuestionsQuery = { __typename?: 'Query', therapeuticQuestions: Array<{ __typename?: 'TherapeuticQuestion', id: number, goalId?: number | null, issueId?: number | null, journalEntryId?: number | null, question: string, researchId?: number | null, researchTitle?: string | null, rationale: string, generatedAt: string, createdAt: string, updatedAt: string }> };

export type HealthcareMarkerTrendQueryVariables = Exact<{
  query: Scalars['String']['input'];
  markerName?: InputMaybe<Scalars['String']['input']>;
}>;


export type HealthcareMarkerTrendQuery = { __typename?: 'Query', healthcareMarkerTrend: Array<{ __typename?: 'HealthcareMarkerTrendHit', markerId: string, testId: string, markerName: string, value: string, unit: string, flag: string, testDate?: string | null, fileName: string, similarity: number }> };

export type HealthcareSearchQueryVariables = Exact<{
  query: Scalars['String']['input'];
}>;


export type HealthcareSearchQuery = { __typename?: 'Query', healthcareSearch: { __typename?: 'HealthcareMultiSearchResult', tests: Array<{ __typename?: 'HealthcareSearchTestHit', id: string, testId: string, content: string, similarity: number, fileName?: string | null, testDate?: string | null }>, markers: Array<{ __typename?: 'HealthcareSearchMarkerHit', markerId: string, testId: string, markerName: string, content: string, combinedScore: number }>, conditions: Array<{ __typename?: 'HealthcareSearchHit', id: string, entityId: string, content: string, similarity: number }>, medications: Array<{ __typename?: 'HealthcareSearchHit', id: string, entityId: string, content: string, similarity: number }>, symptoms: Array<{ __typename?: 'HealthcareSearchHit', id: string, entityId: string, content: string, similarity: number }>, appointments: Array<{ __typename?: 'HealthcareSearchHit', id: string, entityId: string, content: string, similarity: number }> } };

export type HealthcareSummaryQueryVariables = Exact<{ [key: string]: never; }>;


export type HealthcareSummaryQuery = { __typename?: 'Query', healthcareSummary: { __typename?: 'HealthcareSummary', bloodTestsCount: number, conditionsCount: number, medicationsCount: number, symptomsCount: number, appointmentsCount: number, doctorsCount: number, memoryEntriesCount: number, protocolsCount: number } };

export type LatestBogdanDiscussionQueryVariables = Exact<{ [key: string]: never; }>;


export type LatestBogdanDiscussionQuery = { __typename?: 'Query', latestBogdanDiscussion?: { __typename?: 'BogdanDiscussionGuide', id: number, familyMemberId: number, childAge?: number | null, behaviorSummary: string, model: string, createdAt: string, developmentalContext: { __typename?: 'DevelopmentalContext', stage: string, explanation: string, normalizedBehavior: string, researchBasis?: string | null }, conversationStarters: Array<{ __typename?: 'ConversationStarter', opener: string, context: string, ageAppropriateNote?: string | null }>, talkingPoints: Array<{ __typename?: 'TalkingPoint', point: string, explanation: string, researchBacking?: string | null, citations?: Array<{ __typename?: 'Citation', researchId: number, doi?: string | null, title: string, year?: number | null, authors?: string | null, url?: string | null }> | null, microScript?: { __typename?: 'MicroScript', parentOpener: string, childResponse: string, parentFollowUp: string } | null }>, languageGuide: { __typename?: 'LanguageGuide', whatToSay: Array<{ __typename?: 'LanguageExample', phrase: string, reason: string, alternative?: string | null }>, whatNotToSay: Array<{ __typename?: 'LanguageExample', phrase: string, reason: string, alternative?: string | null }> }, anticipatedReactions: Array<{ __typename?: 'AnticipatedReaction', reaction: string, likelihood: string, howToRespond: string }>, followUpPlan: Array<{ __typename?: 'FollowUpStep', action: string, timing: string, description: string }>, citations: Array<{ __typename?: 'Citation', researchId: number, doi?: string | null, title: string, year?: number | null, authors?: string | null, url?: string | null }>, critique?: { __typename?: 'DiscussionGuideCritique', weakSections: Array<string>, refined: boolean, scores: { __typename?: 'CritiqueScores', romanianFluency: number, actionability: number, citationCoverage: number, ageAppropriateness: number, internalConsistency: number, microScriptDepth: number } } | null } | null };

export type LinkContactToIssueMutationVariables = Exact<{
  issueId: Scalars['Int']['input'];
  contactId: Scalars['Int']['input'];
}>;


export type LinkContactToIssueMutation = { __typename?: 'Mutation', linkContactToIssue: { __typename?: 'IssueContactLink', id: number, contact: { __typename?: 'Contact', id: number, firstName: string, lastName?: string | null, role?: string | null, slug?: string | null } } };

export type LinkIssuesMutationVariables = Exact<{
  issueId: Scalars['Int']['input'];
  linkedIssueId: Scalars['Int']['input'];
  linkType?: InputMaybe<Scalars['String']['input']>;
}>;


export type LinkIssuesMutation = { __typename?: 'Mutation', linkIssues: { __typename?: 'IssueLink', id: number, linkType: string, issue: { __typename?: 'Issue', id: number, title: string, category: string, severity: string, familyMemberId: number, createdAt: string } } };

export type LockVaultMutationVariables = Exact<{ [key: string]: never; }>;


export type LockVaultMutation = { __typename?: 'Mutation', lockVault: { __typename?: 'VaultStatus', unlocked: boolean } };

export type LogGameCompletionMutationVariables = Exact<{
  input: LogGameCompletionInput;
}>;


export type LogGameCompletionMutation = { __typename?: 'Mutation', logGameCompletion: { __typename?: 'GameCompletion', id: number, gameId: number, durationSeconds?: number | null, responses?: string | null, linkedNoteId?: number | null, completedAt: string } };

export type LogHabitMutationVariables = Exact<{
  habitId: Scalars['Int']['input'];
  loggedDate: Scalars['String']['input'];
  count?: InputMaybe<Scalars['Int']['input']>;
  notes?: InputMaybe<Scalars['String']['input']>;
}>;


export type LogHabitMutation = { __typename?: 'Mutation', logHabit: { __typename?: 'HabitLog', id: number, habitId: number, loggedDate: string, count: number, notes?: string | null, createdAt: string } };

export type MedicationsQueryVariables = Exact<{ [key: string]: never; }>;


export type MedicationsQuery = { __typename?: 'Query', medications: Array<{ __typename?: 'Medication', id: string, familyMemberId?: number | null, name: string, dosage?: string | null, frequency?: string | null, notes?: string | null, startDate?: string | null, endDate?: string | null, createdAt: string, familyMember?: { __typename?: 'FamilyMember', id: number, slug?: string | null, firstName: string, name?: string | null } | null }> };

export type MemoryEntriesQueryVariables = Exact<{ [key: string]: never; }>;


export type MemoryEntriesQuery = { __typename?: 'Query', memoryEntries: Array<{ __typename?: 'MemoryEntry', id: string, category: string, description?: string | null, context?: string | null, protocolId?: string | null, overallScore?: number | null, shortTermScore?: number | null, longTermScore?: number | null, workingMemoryScore?: number | null, recallSpeed?: number | null, loggedAt: string, createdAt: string }>, memoryBaseline?: { __typename?: 'MemoryBaseline', id: string, overallScore?: number | null, shortTermScore?: number | null, longTermScore?: number | null, workingMemoryScore?: number | null, recallSpeed?: number | null, recordedAt: string } | null };

export type ProtocolQueryVariables = Exact<{
  slug: Scalars['String']['input'];
}>;


export type ProtocolQuery = { __typename?: 'Query', protocol?: { __typename?: 'ProtocolDetail', protocol: { __typename?: 'Protocol', id: string, name: string, slug: string, targetAreas: Array<string>, status: string, notes?: string | null, startDate?: string | null, endDate?: string | null, supplementCount: number, createdAt: string, updatedAt: string }, supplements: Array<{ __typename?: 'ProtocolSupplement', id: string, name: string, dosage: string, frequency: string, mechanism?: string | null, targetAreas: Array<string>, notes?: string | null, url?: string | null, createdAt: string }>, baseline?: { __typename?: 'CognitiveBaseline', id: string, memoryScore?: number | null, focusScore?: number | null, processingSpeedScore?: number | null, moodScore?: number | null, sleepScore?: number | null, recordedAt: string } | null, checkIns: Array<{ __typename?: 'CognitiveCheckIn', id: string, memoryScore?: number | null, focusScore?: number | null, processingSpeedScore?: number | null, moodScore?: number | null, sleepScore?: number | null, sideEffects?: string | null, notes?: string | null, recordedAt: string }> } | null };

export type ProtocolsQueryVariables = Exact<{ [key: string]: never; }>;


export type ProtocolsQuery = { __typename?: 'Query', protocols: Array<{ __typename?: 'Protocol', id: string, name: string, slug: string, targetAreas: Array<string>, status: string, notes?: string | null, startDate?: string | null, endDate?: string | null, supplementCount: number, createdAt: string }> };

export type RecordCognitiveBaselineMutationVariables = Exact<{
  protocolId: Scalars['ID']['input'];
  input: CognitiveScoresInput;
}>;


export type RecordCognitiveBaselineMutation = { __typename?: 'Mutation', recordCognitiveBaseline: { __typename?: 'CognitiveBaseline', id: string, memoryScore?: number | null, focusScore?: number | null, processingSpeedScore?: number | null, moodScore?: number | null, sleepScore?: number | null, recordedAt: string } };

export type RecordCognitiveCheckInMutationVariables = Exact<{
  protocolId: Scalars['ID']['input'];
  input: CognitiveCheckInInput;
}>;


export type RecordCognitiveCheckInMutation = { __typename?: 'Mutation', recordCognitiveCheckIn: { __typename?: 'CognitiveCheckIn', id: string, memoryScore?: number | null, focusScore?: number | null, processingSpeedScore?: number | null, moodScore?: number | null, sleepScore?: number | null, sideEffects?: string | null, notes?: string | null, recordedAt: string } };

export type SendConversationMessageMutationVariables = Exact<{
  conversationId: Scalars['Int']['input'];
  message: Scalars['String']['input'];
}>;


export type SendConversationMessageMutation = { __typename?: 'Mutation', sendConversationMessage: { __typename?: 'Conversation', id: number, issueId: number, userId: string, title?: string | null, createdAt: string, updatedAt: string, messages: Array<{ __typename?: 'ConversationMessage', id: number, conversationId: number, role: string, content: string, createdAt: string }> } };

export type SendHealthcareChatMessageMutationVariables = Exact<{
  input: HealthcareChatInput;
}>;


export type SendHealthcareChatMessageMutation = { __typename?: 'Mutation', sendHealthcareChatMessage: { __typename?: 'HealthcareChatResponse', answer: string, intent: string, intentConfidence: number, retrievalSources: Array<string>, citations: Array<string>, guardPassed: boolean, guardIssues: Array<string> } };

export type SetMemoryBaselineMutationVariables = Exact<{
  input: SetMemoryBaselineInput;
}>;


export type SetMemoryBaselineMutation = { __typename?: 'Mutation', setMemoryBaseline: { __typename?: 'MemoryBaseline', id: string, overallScore?: number | null, shortTermScore?: number | null, longTermScore?: number | null, workingMemoryScore?: number | null, recallSpeed?: number | null, recordedAt: string } };

export type ShareFamilyMemberMutationVariables = Exact<{
  familyMemberId: Scalars['Int']['input'];
  email: Scalars['String']['input'];
  role?: InputMaybe<FamilyMemberShareRole>;
}>;


export type ShareFamilyMemberMutation = { __typename?: 'Mutation', shareFamilyMember: { __typename?: 'FamilyMemberShare', familyMemberId: number, email: string, role: FamilyMemberShareRole, createdAt: string } };

export type SymptomsQueryVariables = Exact<{ [key: string]: never; }>;


export type SymptomsQuery = { __typename?: 'Query', symptoms: Array<{ __typename?: 'Symptom', id: string, description: string, severity?: string | null, loggedAt: string, createdAt: string }> };

export type TagLanguageQueryVariables = Exact<{
  tag: Scalars['String']['input'];
}>;


export type TagLanguageQuery = { __typename?: 'Query', tagLanguage?: string | null };

export type SetTagLanguageMutationVariables = Exact<{
  tag: Scalars['String']['input'];
  language: Scalars['String']['input'];
}>;


export type SetTagLanguageMutation = { __typename?: 'Mutation', setTagLanguage: boolean };

export type UnlinkContactFromIssueMutationVariables = Exact<{
  issueId: Scalars['Int']['input'];
  contactId: Scalars['Int']['input'];
}>;


export type UnlinkContactFromIssueMutation = { __typename?: 'Mutation', unlinkContactFromIssue: { __typename?: 'UnlinkContactResult', success: boolean } };

export type UnlinkGoalFamilyMemberMutationVariables = Exact<{
  id: Scalars['Int']['input'];
}>;


export type UnlinkGoalFamilyMemberMutation = { __typename?: 'Mutation', unlinkGoalFamilyMember: { __typename?: 'Goal', id: number, familyMemberId?: number | null, familyMember?: { __typename?: 'FamilyMember', id: number, firstName: string, name?: string | null, relationship?: string | null } | null } };

export type UnlinkIssuesMutationVariables = Exact<{
  issueId: Scalars['Int']['input'];
  linkedIssueId: Scalars['Int']['input'];
}>;


export type UnlinkIssuesMutation = { __typename?: 'Mutation', unlinkIssues: { __typename?: 'UnlinkIssuesResult', success: boolean } };

export type UnlockVaultMutationVariables = Exact<{
  pin: Scalars['String']['input'];
}>;


export type UnlockVaultMutation = { __typename?: 'Mutation', unlockVault: { __typename?: 'VaultUnlockResult', success: boolean, unlocked: boolean, message?: string | null } };

export type UnshareFamilyMemberMutationVariables = Exact<{
  familyMemberId: Scalars['Int']['input'];
  email: Scalars['String']['input'];
}>;


export type UnshareFamilyMemberMutation = { __typename?: 'Mutation', unshareFamilyMember: boolean };

export type UpdateAffirmationMutationVariables = Exact<{
  id: Scalars['Int']['input'];
  input: UpdateAffirmationInput;
}>;


export type UpdateAffirmationMutation = { __typename?: 'Mutation', updateAffirmation: { __typename?: 'Affirmation', id: number, familyMemberId: number, text: string, category: AffirmationCategory, isActive: boolean, createdAt: string, updatedAt: string } };

export type UpdateBehaviorObservationMutationVariables = Exact<{
  id: Scalars['Int']['input'];
  input: UpdateBehaviorObservationInput;
}>;


export type UpdateBehaviorObservationMutation = { __typename?: 'Mutation', updateBehaviorObservation: { __typename?: 'BehaviorObservation', id: number, familyMemberId: number, goalId?: number | null, createdBy: string, observedAt: string, observationType: BehaviorObservationType, frequency?: number | null, intensity?: BehaviorIntensity | null, context?: string | null, notes?: string | null, createdAt: string, updatedAt: string } };

export type UpdateContactMutationVariables = Exact<{
  id: Scalars['Int']['input'];
  input: UpdateContactInput;
}>;


export type UpdateContactMutation = { __typename?: 'Mutation', updateContact: { __typename?: 'Contact', id: number, createdBy: string, slug?: string | null, firstName: string, lastName?: string | null, description?: string | null, role?: string | null, ageYears?: number | null, notes?: string | null, createdAt: string, updatedAt: string } };

export type UpdateContactFeedbackMutationVariables = Exact<{
  id: Scalars['Int']['input'];
  input: UpdateContactFeedbackInput;
}>;


export type UpdateContactFeedbackMutation = { __typename?: 'Mutation', updateContactFeedback: { __typename?: 'ContactFeedback', id: number, contactId: number, familyMemberId: number, createdBy: string, subject?: string | null, feedbackDate: string, content: string, tags?: Array<string> | null, source?: FeedbackSource | null, extracted: boolean, createdAt: string, updatedAt: string } };

export type UpdateFamilyMemberMutationVariables = Exact<{
  id: Scalars['Int']['input'];
  input: UpdateFamilyMemberInput;
}>;


export type UpdateFamilyMemberMutation = { __typename?: 'Mutation', updateFamilyMember: { __typename?: 'FamilyMember', id: number, firstName: string, name?: string | null, relationship?: string | null, email?: string | null, phone?: string | null, location?: string | null, occupation?: string | null, ageYears?: number | null, dateOfBirth?: string | null, bio?: string | null, allergies?: string | null, createdAt: string, updatedAt: string } };

export type UpdateGameMutationVariables = Exact<{
  id: Scalars['Int']['input'];
  input: UpdateGameInput;
}>;


export type UpdateGameMutation = { __typename?: 'Mutation', updateGame: { __typename?: 'Game', id: number, title: string, description?: string | null, content: string, language?: string | null, estimatedMinutes?: number | null, updatedAt: string } };

export type UpdateGoalMutationVariables = Exact<{
  id: Scalars['Int']['input'];
  input: UpdateGoalInput;
}>;


export type UpdateGoalMutation = { __typename?: 'Mutation', updateGoal: { __typename?: 'Goal', id: number, slug?: string | null, title: string, description?: string | null, status: string, tags?: Array<string> | null, familyMemberId?: number | null, storyLanguage?: string | null, createdAt: string, updatedAt: string, familyMember?: { __typename?: 'FamilyMember', id: number, firstName: string, name?: string | null, relationship?: string | null } | null } };

export type UpdateHabitMutationVariables = Exact<{
  id: Scalars['Int']['input'];
  input: UpdateHabitInput;
}>;


export type UpdateHabitMutation = { __typename?: 'Mutation', updateHabit: { __typename?: 'Habit', id: number, title: string, description?: string | null, frequency: HabitFrequency, targetCount: number, status: HabitStatus, goalId?: number | null, updatedAt: string } };

export type UpdateIssueMutationVariables = Exact<{
  id: Scalars['Int']['input'];
  input: UpdateIssueInput;
}>;


export type UpdateIssueMutation = { __typename?: 'Mutation', updateIssue: { __typename?: 'Issue', id: number, feedbackId?: number | null, familyMemberId: number, relatedFamilyMemberId?: number | null, createdBy: string, title: string, description: string, category: string, severity: string, recommendations?: Array<string> | null, createdAt: string, updatedAt: string } };

export type UpdateJournalEntryMutationVariables = Exact<{
  id: Scalars['Int']['input'];
  input: UpdateJournalEntryInput;
}>;


export type UpdateJournalEntryMutation = { __typename?: 'Mutation', updateJournalEntry: { __typename?: 'JournalEntry', id: number, createdBy: string, familyMemberId?: number | null, title?: string | null, content: string, mood?: string | null, moodScore?: number | null, tags?: Array<string> | null, goalId?: number | null, isPrivate: boolean, entryDate: string, createdAt: string, updatedAt: string } };

export type UpdateNoteMutationVariables = Exact<{
  id: Scalars['Int']['input'];
  input: UpdateNoteInput;
}>;


export type UpdateNoteMutation = { __typename?: 'Mutation', updateNote: { __typename?: 'Note', id: number, slug?: string | null, title?: string | null, entityId: number, entityType: string, createdBy: string, noteType?: string | null, content: string, tags?: Array<string> | null, createdAt: string, updatedAt: string } };

export type UpdateProtocolStatusMutationVariables = Exact<{
  id: Scalars['ID']['input'];
  status: Scalars['String']['input'];
}>;


export type UpdateProtocolStatusMutation = { __typename?: 'Mutation', updateProtocolStatus: { __typename?: 'Protocol', id: string, status: string, updatedAt: string } };

export type UpdateRelationshipMutationVariables = Exact<{
  id: Scalars['Int']['input'];
  input: UpdateRelationshipInput;
}>;


export type UpdateRelationshipMutation = { __typename?: 'Mutation', updateRelationship: { __typename?: 'Relationship', id: number, createdBy: string, subjectType: PersonType, subjectId: number, relatedType: PersonType, relatedId: number, relationshipType: string, context?: string | null, startDate?: string | null, status: RelationshipStatus, createdAt: string, updatedAt: string } };

export type UpdateStoryMutationVariables = Exact<{
  id: Scalars['Int']['input'];
  input: UpdateStoryInput;
}>;


export type UpdateStoryMutation = { __typename?: 'Mutation', updateStory: { __typename?: 'Story', id: number, goalId?: number | null, createdBy?: string | null, content: string, createdAt: string, updatedAt: string } };

export type UpdateTeacherFeedbackMutationVariables = Exact<{
  id: Scalars['Int']['input'];
  input: UpdateTeacherFeedbackInput;
}>;


export type UpdateTeacherFeedbackMutation = { __typename?: 'Mutation', updateTeacherFeedback: { __typename?: 'TeacherFeedback', id: number, familyMemberId: number, createdBy: string, teacherName: string, subject?: string | null, feedbackDate: string, content: string, tags?: Array<string> | null, source?: FeedbackSource | null, extracted: boolean, createdAt: string, updatedAt: string } };

export type GetUserSettingsQueryVariables = Exact<{ [key: string]: never; }>;


export type GetUserSettingsQuery = { __typename?: 'Query', userSettings: { __typename?: 'UserSettings', userId: string, storyLanguage: string, storyMinutes: number } };

export type UpdateUserSettingsMutationVariables = Exact<{
  storyLanguage: Scalars['String']['input'];
  storyMinutes?: InputMaybe<Scalars['Int']['input']>;
}>;


export type UpdateUserSettingsMutation = { __typename?: 'Mutation', updateUserSettings: { __typename?: 'UserSettings', userId: string, storyLanguage: string, storyMinutes: number } };

export type VaultStatusQueryVariables = Exact<{ [key: string]: never; }>;


export type VaultStatusQuery = { __typename?: 'Query', vaultStatus: { __typename?: 'VaultStatus', unlocked: boolean, available: boolean } };


export const AddAllergyDocument = gql`
    mutation AddAllergy($input: AddAllergyInput!) {
  addAllergy(input: $input) {
    id
    familyMemberId
    kind
    name
    severity
    notes
    createdAt
    familyMember {
      id
      firstName
      name
    }
  }
}
    `;
export type AddAllergyMutationFn = Apollo.MutationFunction<AddAllergyMutation, AddAllergyMutationVariables>;

/**
 * __useAddAllergyMutation__
 *
 * To run a mutation, you first call `useAddAllergyMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useAddAllergyMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [addAllergyMutation, { data, loading, error }] = useAddAllergyMutation({
 *   variables: {
 *      input: // value for 'input'
 *   },
 * });
 */
export function useAddAllergyMutation(baseOptions?: Apollo.MutationHookOptions<AddAllergyMutation, AddAllergyMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<AddAllergyMutation, AddAllergyMutationVariables>(AddAllergyDocument, options);
      }
export type AddAllergyMutationHookResult = ReturnType<typeof useAddAllergyMutation>;
export type AddAllergyMutationResult = Apollo.MutationResult<AddAllergyMutation>;
export type AddAllergyMutationOptions = Apollo.BaseMutationOptions<AddAllergyMutation, AddAllergyMutationVariables>;
export const AddAppointmentDocument = gql`
    mutation AddAppointment($input: AddAppointmentInput!) {
  addAppointment(input: $input) {
    id
    title
    doctorId
    familyMemberId
    provider
    notes
    appointmentDate
    createdAt
  }
}
    `;
export type AddAppointmentMutationFn = Apollo.MutationFunction<AddAppointmentMutation, AddAppointmentMutationVariables>;

/**
 * __useAddAppointmentMutation__
 *
 * To run a mutation, you first call `useAddAppointmentMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useAddAppointmentMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [addAppointmentMutation, { data, loading, error }] = useAddAppointmentMutation({
 *   variables: {
 *      input: // value for 'input'
 *   },
 * });
 */
export function useAddAppointmentMutation(baseOptions?: Apollo.MutationHookOptions<AddAppointmentMutation, AddAppointmentMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<AddAppointmentMutation, AddAppointmentMutationVariables>(AddAppointmentDocument, options);
      }
export type AddAppointmentMutationHookResult = ReturnType<typeof useAddAppointmentMutation>;
export type AddAppointmentMutationResult = Apollo.MutationResult<AddAppointmentMutation>;
export type AddAppointmentMutationOptions = Apollo.BaseMutationOptions<AddAppointmentMutation, AddAppointmentMutationVariables>;
export const AddConditionDocument = gql`
    mutation AddCondition($input: AddConditionInput!) {
  addCondition(input: $input) {
    id
    name
    notes
    createdAt
  }
}
    `;
export type AddConditionMutationFn = Apollo.MutationFunction<AddConditionMutation, AddConditionMutationVariables>;

/**
 * __useAddConditionMutation__
 *
 * To run a mutation, you first call `useAddConditionMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useAddConditionMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [addConditionMutation, { data, loading, error }] = useAddConditionMutation({
 *   variables: {
 *      input: // value for 'input'
 *   },
 * });
 */
export function useAddConditionMutation(baseOptions?: Apollo.MutationHookOptions<AddConditionMutation, AddConditionMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<AddConditionMutation, AddConditionMutationVariables>(AddConditionDocument, options);
      }
export type AddConditionMutationHookResult = ReturnType<typeof useAddConditionMutation>;
export type AddConditionMutationResult = Apollo.MutationResult<AddConditionMutation>;
export type AddConditionMutationOptions = Apollo.BaseMutationOptions<AddConditionMutation, AddConditionMutationVariables>;
export const AddDoctorDocument = gql`
    mutation AddDoctor($input: AddDoctorInput!) {
  addDoctor(input: $input) {
    id
    name
    specialty
    phone
    email
    address
    notes
    createdAt
  }
}
    `;
export type AddDoctorMutationFn = Apollo.MutationFunction<AddDoctorMutation, AddDoctorMutationVariables>;

/**
 * __useAddDoctorMutation__
 *
 * To run a mutation, you first call `useAddDoctorMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useAddDoctorMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [addDoctorMutation, { data, loading, error }] = useAddDoctorMutation({
 *   variables: {
 *      input: // value for 'input'
 *   },
 * });
 */
export function useAddDoctorMutation(baseOptions?: Apollo.MutationHookOptions<AddDoctorMutation, AddDoctorMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<AddDoctorMutation, AddDoctorMutationVariables>(AddDoctorDocument, options);
      }
export type AddDoctorMutationHookResult = ReturnType<typeof useAddDoctorMutation>;
export type AddDoctorMutationResult = Apollo.MutationResult<AddDoctorMutation>;
export type AddDoctorMutationOptions = Apollo.BaseMutationOptions<AddDoctorMutation, AddDoctorMutationVariables>;
export const AddMedicationDocument = gql`
    mutation AddMedication($input: AddMedicationInput!) {
  addMedication(input: $input) {
    id
    name
    dosage
    frequency
    notes
    startDate
    endDate
    createdAt
  }
}
    `;
export type AddMedicationMutationFn = Apollo.MutationFunction<AddMedicationMutation, AddMedicationMutationVariables>;

/**
 * __useAddMedicationMutation__
 *
 * To run a mutation, you first call `useAddMedicationMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useAddMedicationMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [addMedicationMutation, { data, loading, error }] = useAddMedicationMutation({
 *   variables: {
 *      input: // value for 'input'
 *   },
 * });
 */
export function useAddMedicationMutation(baseOptions?: Apollo.MutationHookOptions<AddMedicationMutation, AddMedicationMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<AddMedicationMutation, AddMedicationMutationVariables>(AddMedicationDocument, options);
      }
export type AddMedicationMutationHookResult = ReturnType<typeof useAddMedicationMutation>;
export type AddMedicationMutationResult = Apollo.MutationResult<AddMedicationMutation>;
export type AddMedicationMutationOptions = Apollo.BaseMutationOptions<AddMedicationMutation, AddMedicationMutationVariables>;
export const AddMemoryEntryDocument = gql`
    mutation AddMemoryEntry($input: AddMemoryEntryInput!) {
  addMemoryEntry(input: $input) {
    id
    category
    description
    overallScore
    shortTermScore
    longTermScore
    workingMemoryScore
    recallSpeed
    loggedAt
  }
}
    `;
export type AddMemoryEntryMutationFn = Apollo.MutationFunction<AddMemoryEntryMutation, AddMemoryEntryMutationVariables>;

/**
 * __useAddMemoryEntryMutation__
 *
 * To run a mutation, you first call `useAddMemoryEntryMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useAddMemoryEntryMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [addMemoryEntryMutation, { data, loading, error }] = useAddMemoryEntryMutation({
 *   variables: {
 *      input: // value for 'input'
 *   },
 * });
 */
export function useAddMemoryEntryMutation(baseOptions?: Apollo.MutationHookOptions<AddMemoryEntryMutation, AddMemoryEntryMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<AddMemoryEntryMutation, AddMemoryEntryMutationVariables>(AddMemoryEntryDocument, options);
      }
export type AddMemoryEntryMutationHookResult = ReturnType<typeof useAddMemoryEntryMutation>;
export type AddMemoryEntryMutationResult = Apollo.MutationResult<AddMemoryEntryMutation>;
export type AddMemoryEntryMutationOptions = Apollo.BaseMutationOptions<AddMemoryEntryMutation, AddMemoryEntryMutationVariables>;
export const AddProtocolDocument = gql`
    mutation AddProtocol($input: AddProtocolInput!) {
  addProtocol(input: $input) {
    id
    name
    slug
    status
    targetAreas
    supplementCount
    createdAt
  }
}
    `;
export type AddProtocolMutationFn = Apollo.MutationFunction<AddProtocolMutation, AddProtocolMutationVariables>;

/**
 * __useAddProtocolMutation__
 *
 * To run a mutation, you first call `useAddProtocolMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useAddProtocolMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [addProtocolMutation, { data, loading, error }] = useAddProtocolMutation({
 *   variables: {
 *      input: // value for 'input'
 *   },
 * });
 */
export function useAddProtocolMutation(baseOptions?: Apollo.MutationHookOptions<AddProtocolMutation, AddProtocolMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<AddProtocolMutation, AddProtocolMutationVariables>(AddProtocolDocument, options);
      }
export type AddProtocolMutationHookResult = ReturnType<typeof useAddProtocolMutation>;
export type AddProtocolMutationResult = Apollo.MutationResult<AddProtocolMutation>;
export type AddProtocolMutationOptions = Apollo.BaseMutationOptions<AddProtocolMutation, AddProtocolMutationVariables>;
export const AddSupplementDocument = gql`
    mutation AddSupplement($protocolId: ID!, $input: AddSupplementInput!) {
  addSupplement(protocolId: $protocolId, input: $input) {
    id
    name
    dosage
    frequency
    mechanism
    notes
    url
    createdAt
  }
}
    `;
export type AddSupplementMutationFn = Apollo.MutationFunction<AddSupplementMutation, AddSupplementMutationVariables>;

/**
 * __useAddSupplementMutation__
 *
 * To run a mutation, you first call `useAddSupplementMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useAddSupplementMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [addSupplementMutation, { data, loading, error }] = useAddSupplementMutation({
 *   variables: {
 *      protocolId: // value for 'protocolId'
 *      input: // value for 'input'
 *   },
 * });
 */
export function useAddSupplementMutation(baseOptions?: Apollo.MutationHookOptions<AddSupplementMutation, AddSupplementMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<AddSupplementMutation, AddSupplementMutationVariables>(AddSupplementDocument, options);
      }
export type AddSupplementMutationHookResult = ReturnType<typeof useAddSupplementMutation>;
export type AddSupplementMutationResult = Apollo.MutationResult<AddSupplementMutation>;
export type AddSupplementMutationOptions = Apollo.BaseMutationOptions<AddSupplementMutation, AddSupplementMutationVariables>;
export const AddSymptomDocument = gql`
    mutation AddSymptom($input: AddSymptomInput!) {
  addSymptom(input: $input) {
    id
    description
    severity
    loggedAt
    createdAt
  }
}
    `;
export type AddSymptomMutationFn = Apollo.MutationFunction<AddSymptomMutation, AddSymptomMutationVariables>;

/**
 * __useAddSymptomMutation__
 *
 * To run a mutation, you first call `useAddSymptomMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useAddSymptomMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [addSymptomMutation, { data, loading, error }] = useAddSymptomMutation({
 *   variables: {
 *      input: // value for 'input'
 *   },
 * });
 */
export function useAddSymptomMutation(baseOptions?: Apollo.MutationHookOptions<AddSymptomMutation, AddSymptomMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<AddSymptomMutation, AddSymptomMutationVariables>(AddSymptomDocument, options);
      }
export type AddSymptomMutationHookResult = ReturnType<typeof useAddSymptomMutation>;
export type AddSymptomMutationResult = Apollo.MutationResult<AddSymptomMutation>;
export type AddSymptomMutationOptions = Apollo.BaseMutationOptions<AddSymptomMutation, AddSymptomMutationVariables>;
export const AllergiesDocument = gql`
    query Allergies {
  allergies {
    id
    familyMemberId
    kind
    name
    severity
    notes
    createdAt
    familyMember {
      id
      slug
      firstName
      name
    }
  }
}
    `;

/**
 * __useAllergiesQuery__
 *
 * To run a query within a React component, call `useAllergiesQuery` and pass it any options that fit your needs.
 * When your component renders, `useAllergiesQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useAllergiesQuery({
 *   variables: {
 *   },
 * });
 */
export function useAllergiesQuery(baseOptions?: Apollo.QueryHookOptions<AllergiesQuery, AllergiesQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<AllergiesQuery, AllergiesQueryVariables>(AllergiesDocument, options);
      }
export function useAllergiesLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<AllergiesQuery, AllergiesQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<AllergiesQuery, AllergiesQueryVariables>(AllergiesDocument, options);
        }
// @ts-ignore
export function useAllergiesSuspenseQuery(baseOptions?: Apollo.SuspenseQueryHookOptions<AllergiesQuery, AllergiesQueryVariables>): Apollo.UseSuspenseQueryResult<AllergiesQuery, AllergiesQueryVariables>;
export function useAllergiesSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<AllergiesQuery, AllergiesQueryVariables>): Apollo.UseSuspenseQueryResult<AllergiesQuery | undefined, AllergiesQueryVariables>;
export function useAllergiesSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<AllergiesQuery, AllergiesQueryVariables>) {
          const options = baseOptions === Apollo.skipToken ? baseOptions : {...defaultOptions, ...baseOptions}
          return Apollo.useSuspenseQuery<AllergiesQuery, AllergiesQueryVariables>(AllergiesDocument, options);
        }
export type AllergiesQueryHookResult = ReturnType<typeof useAllergiesQuery>;
export type AllergiesLazyQueryHookResult = ReturnType<typeof useAllergiesLazyQuery>;
export type AllergiesSuspenseQueryHookResult = ReturnType<typeof useAllergiesSuspenseQuery>;
export type AllergiesQueryResult = Apollo.QueryResult<AllergiesQuery, AllergiesQueryVariables>;
export const AppointmentsDocument = gql`
    query Appointments {
  appointments {
    id
    title
    doctorId
    familyMemberId
    provider
    notes
    appointmentDate
    createdAt
  }
}
    `;

/**
 * __useAppointmentsQuery__
 *
 * To run a query within a React component, call `useAppointmentsQuery` and pass it any options that fit your needs.
 * When your component renders, `useAppointmentsQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useAppointmentsQuery({
 *   variables: {
 *   },
 * });
 */
export function useAppointmentsQuery(baseOptions?: Apollo.QueryHookOptions<AppointmentsQuery, AppointmentsQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<AppointmentsQuery, AppointmentsQueryVariables>(AppointmentsDocument, options);
      }
export function useAppointmentsLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<AppointmentsQuery, AppointmentsQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<AppointmentsQuery, AppointmentsQueryVariables>(AppointmentsDocument, options);
        }
// @ts-ignore
export function useAppointmentsSuspenseQuery(baseOptions?: Apollo.SuspenseQueryHookOptions<AppointmentsQuery, AppointmentsQueryVariables>): Apollo.UseSuspenseQueryResult<AppointmentsQuery, AppointmentsQueryVariables>;
export function useAppointmentsSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<AppointmentsQuery, AppointmentsQueryVariables>): Apollo.UseSuspenseQueryResult<AppointmentsQuery | undefined, AppointmentsQueryVariables>;
export function useAppointmentsSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<AppointmentsQuery, AppointmentsQueryVariables>) {
          const options = baseOptions === Apollo.skipToken ? baseOptions : {...defaultOptions, ...baseOptions}
          return Apollo.useSuspenseQuery<AppointmentsQuery, AppointmentsQueryVariables>(AppointmentsDocument, options);
        }
export type AppointmentsQueryHookResult = ReturnType<typeof useAppointmentsQuery>;
export type AppointmentsLazyQueryHookResult = ReturnType<typeof useAppointmentsLazyQuery>;
export type AppointmentsSuspenseQueryHookResult = ReturnType<typeof useAppointmentsSuspenseQuery>;
export type AppointmentsQueryResult = Apollo.QueryResult<AppointmentsQuery, AppointmentsQueryVariables>;
export const BloodTestsDocument = gql`
    query BloodTests {
  bloodTests {
    id
    fileName
    status
    testDate
    errorMessage
    uploadedAt
    markersCount
  }
}
    `;

/**
 * __useBloodTestsQuery__
 *
 * To run a query within a React component, call `useBloodTestsQuery` and pass it any options that fit your needs.
 * When your component renders, `useBloodTestsQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useBloodTestsQuery({
 *   variables: {
 *   },
 * });
 */
export function useBloodTestsQuery(baseOptions?: Apollo.QueryHookOptions<BloodTestsQuery, BloodTestsQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<BloodTestsQuery, BloodTestsQueryVariables>(BloodTestsDocument, options);
      }
export function useBloodTestsLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<BloodTestsQuery, BloodTestsQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<BloodTestsQuery, BloodTestsQueryVariables>(BloodTestsDocument, options);
        }
// @ts-ignore
export function useBloodTestsSuspenseQuery(baseOptions?: Apollo.SuspenseQueryHookOptions<BloodTestsQuery, BloodTestsQueryVariables>): Apollo.UseSuspenseQueryResult<BloodTestsQuery, BloodTestsQueryVariables>;
export function useBloodTestsSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<BloodTestsQuery, BloodTestsQueryVariables>): Apollo.UseSuspenseQueryResult<BloodTestsQuery | undefined, BloodTestsQueryVariables>;
export function useBloodTestsSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<BloodTestsQuery, BloodTestsQueryVariables>) {
          const options = baseOptions === Apollo.skipToken ? baseOptions : {...defaultOptions, ...baseOptions}
          return Apollo.useSuspenseQuery<BloodTestsQuery, BloodTestsQueryVariables>(BloodTestsDocument, options);
        }
export type BloodTestsQueryHookResult = ReturnType<typeof useBloodTestsQuery>;
export type BloodTestsLazyQueryHookResult = ReturnType<typeof useBloodTestsLazyQuery>;
export type BloodTestsSuspenseQueryHookResult = ReturnType<typeof useBloodTestsSuspenseQuery>;
export type BloodTestsQueryResult = Apollo.QueryResult<BloodTestsQuery, BloodTestsQueryVariables>;
export const BogdanDiscussionsDocument = gql`
    query BogdanDiscussions {
  bogdanDiscussions {
    id
    familyMemberId
    childAge
    behaviorSummary
    createdAt
  }
}
    `;

/**
 * __useBogdanDiscussionsQuery__
 *
 * To run a query within a React component, call `useBogdanDiscussionsQuery` and pass it any options that fit your needs.
 * When your component renders, `useBogdanDiscussionsQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useBogdanDiscussionsQuery({
 *   variables: {
 *   },
 * });
 */
export function useBogdanDiscussionsQuery(baseOptions?: Apollo.QueryHookOptions<BogdanDiscussionsQuery, BogdanDiscussionsQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<BogdanDiscussionsQuery, BogdanDiscussionsQueryVariables>(BogdanDiscussionsDocument, options);
      }
export function useBogdanDiscussionsLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<BogdanDiscussionsQuery, BogdanDiscussionsQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<BogdanDiscussionsQuery, BogdanDiscussionsQueryVariables>(BogdanDiscussionsDocument, options);
        }
// @ts-ignore
export function useBogdanDiscussionsSuspenseQuery(baseOptions?: Apollo.SuspenseQueryHookOptions<BogdanDiscussionsQuery, BogdanDiscussionsQueryVariables>): Apollo.UseSuspenseQueryResult<BogdanDiscussionsQuery, BogdanDiscussionsQueryVariables>;
export function useBogdanDiscussionsSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<BogdanDiscussionsQuery, BogdanDiscussionsQueryVariables>): Apollo.UseSuspenseQueryResult<BogdanDiscussionsQuery | undefined, BogdanDiscussionsQueryVariables>;
export function useBogdanDiscussionsSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<BogdanDiscussionsQuery, BogdanDiscussionsQueryVariables>) {
          const options = baseOptions === Apollo.skipToken ? baseOptions : {...defaultOptions, ...baseOptions}
          return Apollo.useSuspenseQuery<BogdanDiscussionsQuery, BogdanDiscussionsQueryVariables>(BogdanDiscussionsDocument, options);
        }
export type BogdanDiscussionsQueryHookResult = ReturnType<typeof useBogdanDiscussionsQuery>;
export type BogdanDiscussionsLazyQueryHookResult = ReturnType<typeof useBogdanDiscussionsLazyQuery>;
export type BogdanDiscussionsSuspenseQueryHookResult = ReturnType<typeof useBogdanDiscussionsSuspenseQuery>;
export type BogdanDiscussionsQueryResult = Apollo.QueryResult<BogdanDiscussionsQuery, BogdanDiscussionsQueryVariables>;
export const CheckNoteClaimsDocument = gql`
    mutation CheckNoteClaims($input: CheckNoteClaimsInput!) {
  checkNoteClaims(input: $input) {
    success
    message
    noteId
    cards {
      id
      claim
      scope {
        population
        intervention
        comparator
        outcome
        timeframe
        setting
      }
      verdict
      confidence
      evidence {
        paper {
          title
          doi
          url
          year
          source
          authors
          abstract
          journal
        }
        polarity
        excerpt
        rationale
        score
        locator {
          section
          page
          url
        }
      }
      queries
      createdAt
      updatedAt
      provenance {
        generatedBy
        model
        sourceTools
      }
      notes
    }
  }
}
    `;
export type CheckNoteClaimsMutationFn = Apollo.MutationFunction<CheckNoteClaimsMutation, CheckNoteClaimsMutationVariables>;

/**
 * __useCheckNoteClaimsMutation__
 *
 * To run a mutation, you first call `useCheckNoteClaimsMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useCheckNoteClaimsMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [checkNoteClaimsMutation, { data, loading, error }] = useCheckNoteClaimsMutation({
 *   variables: {
 *      input: // value for 'input'
 *   },
 * });
 */
export function useCheckNoteClaimsMutation(baseOptions?: Apollo.MutationHookOptions<CheckNoteClaimsMutation, CheckNoteClaimsMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<CheckNoteClaimsMutation, CheckNoteClaimsMutationVariables>(CheckNoteClaimsDocument, options);
      }
export type CheckNoteClaimsMutationHookResult = ReturnType<typeof useCheckNoteClaimsMutation>;
export type CheckNoteClaimsMutationResult = Apollo.MutationResult<CheckNoteClaimsMutation>;
export type CheckNoteClaimsMutationOptions = Apollo.BaseMutationOptions<CheckNoteClaimsMutation, CheckNoteClaimsMutationVariables>;
export const BuildClaimCardsFromTextDocument = gql`
    mutation BuildClaimCardsFromText {
  buildClaimCards(
    input: {text: """
    Cognitive Behavioral Therapy is effective for treating anxiety disorders.
    CBT reduces anxiety symptoms by 60-80% in most patients.
    The effects of CBT persist for years after treatment ends.
    """, perSourceLimit: 10, topK: 5, useLlmJudge: true, sources: [CROSSREF, SEMANTIC_SCHOLAR, PUBMED]}
  ) {
    cards {
      id
      claim
      verdict
      confidence
      evidence {
        paper {
          title
          authors
          doi
          year
          journal
          oaUrl
        }
        polarity
        excerpt
        rationale
        score
      }
      queries
      provenance {
        generatedBy
        model
        sourceTools
      }
      createdAt
    }
  }
}
    `;
export type BuildClaimCardsFromTextMutationFn = Apollo.MutationFunction<BuildClaimCardsFromTextMutation, BuildClaimCardsFromTextMutationVariables>;

/**
 * __useBuildClaimCardsFromTextMutation__
 *
 * To run a mutation, you first call `useBuildClaimCardsFromTextMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useBuildClaimCardsFromTextMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [buildClaimCardsFromTextMutation, { data, loading, error }] = useBuildClaimCardsFromTextMutation({
 *   variables: {
 *   },
 * });
 */
export function useBuildClaimCardsFromTextMutation(baseOptions?: Apollo.MutationHookOptions<BuildClaimCardsFromTextMutation, BuildClaimCardsFromTextMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<BuildClaimCardsFromTextMutation, BuildClaimCardsFromTextMutationVariables>(BuildClaimCardsFromTextDocument, options);
      }
export type BuildClaimCardsFromTextMutationHookResult = ReturnType<typeof useBuildClaimCardsFromTextMutation>;
export type BuildClaimCardsFromTextMutationResult = Apollo.MutationResult<BuildClaimCardsFromTextMutation>;
export type BuildClaimCardsFromTextMutationOptions = Apollo.BaseMutationOptions<BuildClaimCardsFromTextMutation, BuildClaimCardsFromTextMutationVariables>;
export const BuildClaimCardsFromClaimsDocument = gql`
    mutation BuildClaimCardsFromClaims {
  buildClaimCards(
    input: {claims: ["Mindfulness meditation reduces stress in adults with GAD", "Exercise therapy improves mood in adults with major depressive disorder"], perSourceLimit: 8, topK: 4, useLlmJudge: false, sources: [SEMANTIC_SCHOLAR, OPENALEX]}
  ) {
    cards {
      id
      claim
      verdict
      confidence
      evidence {
        paper {
          title
          doi
        }
        polarity
        score
      }
    }
  }
}
    `;
export type BuildClaimCardsFromClaimsMutationFn = Apollo.MutationFunction<BuildClaimCardsFromClaimsMutation, BuildClaimCardsFromClaimsMutationVariables>;

/**
 * __useBuildClaimCardsFromClaimsMutation__
 *
 * To run a mutation, you first call `useBuildClaimCardsFromClaimsMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useBuildClaimCardsFromClaimsMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [buildClaimCardsFromClaimsMutation, { data, loading, error }] = useBuildClaimCardsFromClaimsMutation({
 *   variables: {
 *   },
 * });
 */
export function useBuildClaimCardsFromClaimsMutation(baseOptions?: Apollo.MutationHookOptions<BuildClaimCardsFromClaimsMutation, BuildClaimCardsFromClaimsMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<BuildClaimCardsFromClaimsMutation, BuildClaimCardsFromClaimsMutationVariables>(BuildClaimCardsFromClaimsDocument, options);
      }
export type BuildClaimCardsFromClaimsMutationHookResult = ReturnType<typeof useBuildClaimCardsFromClaimsMutation>;
export type BuildClaimCardsFromClaimsMutationResult = Apollo.MutationResult<BuildClaimCardsFromClaimsMutation>;
export type BuildClaimCardsFromClaimsMutationOptions = Apollo.BaseMutationOptions<BuildClaimCardsFromClaimsMutation, BuildClaimCardsFromClaimsMutationVariables>;
export const GetClaimCardDocument = gql`
    query GetClaimCard {
  claimCard(id: "claim_abc123def456") {
    id
    claim
    verdict
    confidence
    evidence {
      paper {
        title
        authors
        doi
        url
        year
        journal
      }
      polarity
      excerpt
      rationale
      score
    }
    scope {
      population
      intervention
      outcome
    }
    notes
    createdAt
    updatedAt
  }
}
    `;

/**
 * __useGetClaimCardQuery__
 *
 * To run a query within a React component, call `useGetClaimCardQuery` and pass it any options that fit your needs.
 * When your component renders, `useGetClaimCardQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useGetClaimCardQuery({
 *   variables: {
 *   },
 * });
 */
export function useGetClaimCardQuery(baseOptions?: Apollo.QueryHookOptions<GetClaimCardQuery, GetClaimCardQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<GetClaimCardQuery, GetClaimCardQueryVariables>(GetClaimCardDocument, options);
      }
export function useGetClaimCardLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<GetClaimCardQuery, GetClaimCardQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<GetClaimCardQuery, GetClaimCardQueryVariables>(GetClaimCardDocument, options);
        }
// @ts-ignore
export function useGetClaimCardSuspenseQuery(baseOptions?: Apollo.SuspenseQueryHookOptions<GetClaimCardQuery, GetClaimCardQueryVariables>): Apollo.UseSuspenseQueryResult<GetClaimCardQuery, GetClaimCardQueryVariables>;
export function useGetClaimCardSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<GetClaimCardQuery, GetClaimCardQueryVariables>): Apollo.UseSuspenseQueryResult<GetClaimCardQuery | undefined, GetClaimCardQueryVariables>;
export function useGetClaimCardSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<GetClaimCardQuery, GetClaimCardQueryVariables>) {
          const options = baseOptions === Apollo.skipToken ? baseOptions : {...defaultOptions, ...baseOptions}
          return Apollo.useSuspenseQuery<GetClaimCardQuery, GetClaimCardQueryVariables>(GetClaimCardDocument, options);
        }
export type GetClaimCardQueryHookResult = ReturnType<typeof useGetClaimCardQuery>;
export type GetClaimCardLazyQueryHookResult = ReturnType<typeof useGetClaimCardLazyQuery>;
export type GetClaimCardSuspenseQueryHookResult = ReturnType<typeof useGetClaimCardSuspenseQuery>;
export type GetClaimCardQueryResult = Apollo.QueryResult<GetClaimCardQuery, GetClaimCardQueryVariables>;
export const GetClaimCardsForNoteDocument = gql`
    query GetClaimCardsForNote {
  claimCardsForNote(noteId: 1) {
    id
    claim
    verdict
    confidence
    evidence {
      paper {
        title
        doi
      }
      polarity
    }
    createdAt
  }
}
    `;

/**
 * __useGetClaimCardsForNoteQuery__
 *
 * To run a query within a React component, call `useGetClaimCardsForNoteQuery` and pass it any options that fit your needs.
 * When your component renders, `useGetClaimCardsForNoteQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useGetClaimCardsForNoteQuery({
 *   variables: {
 *   },
 * });
 */
export function useGetClaimCardsForNoteQuery(baseOptions?: Apollo.QueryHookOptions<GetClaimCardsForNoteQuery, GetClaimCardsForNoteQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<GetClaimCardsForNoteQuery, GetClaimCardsForNoteQueryVariables>(GetClaimCardsForNoteDocument, options);
      }
export function useGetClaimCardsForNoteLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<GetClaimCardsForNoteQuery, GetClaimCardsForNoteQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<GetClaimCardsForNoteQuery, GetClaimCardsForNoteQueryVariables>(GetClaimCardsForNoteDocument, options);
        }
// @ts-ignore
export function useGetClaimCardsForNoteSuspenseQuery(baseOptions?: Apollo.SuspenseQueryHookOptions<GetClaimCardsForNoteQuery, GetClaimCardsForNoteQueryVariables>): Apollo.UseSuspenseQueryResult<GetClaimCardsForNoteQuery, GetClaimCardsForNoteQueryVariables>;
export function useGetClaimCardsForNoteSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<GetClaimCardsForNoteQuery, GetClaimCardsForNoteQueryVariables>): Apollo.UseSuspenseQueryResult<GetClaimCardsForNoteQuery | undefined, GetClaimCardsForNoteQueryVariables>;
export function useGetClaimCardsForNoteSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<GetClaimCardsForNoteQuery, GetClaimCardsForNoteQueryVariables>) {
          const options = baseOptions === Apollo.skipToken ? baseOptions : {...defaultOptions, ...baseOptions}
          return Apollo.useSuspenseQuery<GetClaimCardsForNoteQuery, GetClaimCardsForNoteQueryVariables>(GetClaimCardsForNoteDocument, options);
        }
export type GetClaimCardsForNoteQueryHookResult = ReturnType<typeof useGetClaimCardsForNoteQuery>;
export type GetClaimCardsForNoteLazyQueryHookResult = ReturnType<typeof useGetClaimCardsForNoteLazyQuery>;
export type GetClaimCardsForNoteSuspenseQueryHookResult = ReturnType<typeof useGetClaimCardsForNoteSuspenseQuery>;
export type GetClaimCardsForNoteQueryResult = Apollo.QueryResult<GetClaimCardsForNoteQuery, GetClaimCardsForNoteQueryVariables>;
export const RefreshClaimCardDocument = gql`
    mutation RefreshClaimCard {
  refreshClaimCard(id: "claim_abc123def456") {
    id
    claim
    verdict
    confidence
    evidence {
      paper {
        title
        doi
        year
      }
      polarity
      score
    }
    updatedAt
  }
}
    `;
export type RefreshClaimCardMutationFn = Apollo.MutationFunction<RefreshClaimCardMutation, RefreshClaimCardMutationVariables>;

/**
 * __useRefreshClaimCardMutation__
 *
 * To run a mutation, you first call `useRefreshClaimCardMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useRefreshClaimCardMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [refreshClaimCardMutation, { data, loading, error }] = useRefreshClaimCardMutation({
 *   variables: {
 *   },
 * });
 */
export function useRefreshClaimCardMutation(baseOptions?: Apollo.MutationHookOptions<RefreshClaimCardMutation, RefreshClaimCardMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<RefreshClaimCardMutation, RefreshClaimCardMutationVariables>(RefreshClaimCardDocument, options);
      }
export type RefreshClaimCardMutationHookResult = ReturnType<typeof useRefreshClaimCardMutation>;
export type RefreshClaimCardMutationResult = Apollo.MutationResult<RefreshClaimCardMutation>;
export type RefreshClaimCardMutationOptions = Apollo.BaseMutationOptions<RefreshClaimCardMutation, RefreshClaimCardMutationVariables>;
export const DeleteClaimCardDocument = gql`
    mutation DeleteClaimCard {
  deleteClaimCard(id: "claim_abc123def456")
}
    `;
export type DeleteClaimCardMutationFn = Apollo.MutationFunction<DeleteClaimCardMutation, DeleteClaimCardMutationVariables>;

/**
 * __useDeleteClaimCardMutation__
 *
 * To run a mutation, you first call `useDeleteClaimCardMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useDeleteClaimCardMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [deleteClaimCardMutation, { data, loading, error }] = useDeleteClaimCardMutation({
 *   variables: {
 *   },
 * });
 */
export function useDeleteClaimCardMutation(baseOptions?: Apollo.MutationHookOptions<DeleteClaimCardMutation, DeleteClaimCardMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<DeleteClaimCardMutation, DeleteClaimCardMutationVariables>(DeleteClaimCardDocument, options);
      }
export type DeleteClaimCardMutationHookResult = ReturnType<typeof useDeleteClaimCardMutation>;
export type DeleteClaimCardMutationResult = Apollo.MutationResult<DeleteClaimCardMutation>;
export type DeleteClaimCardMutationOptions = Apollo.BaseMutationOptions<DeleteClaimCardMutation, DeleteClaimCardMutationVariables>;
export const ConditionsDocument = gql`
    query Conditions {
  conditions {
    id
    familyMemberId
    name
    notes
    createdAt
    familyMember {
      id
      slug
      firstName
      name
    }
  }
}
    `;

/**
 * __useConditionsQuery__
 *
 * To run a query within a React component, call `useConditionsQuery` and pass it any options that fit your needs.
 * When your component renders, `useConditionsQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useConditionsQuery({
 *   variables: {
 *   },
 * });
 */
export function useConditionsQuery(baseOptions?: Apollo.QueryHookOptions<ConditionsQuery, ConditionsQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<ConditionsQuery, ConditionsQueryVariables>(ConditionsDocument, options);
      }
export function useConditionsLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<ConditionsQuery, ConditionsQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<ConditionsQuery, ConditionsQueryVariables>(ConditionsDocument, options);
        }
// @ts-ignore
export function useConditionsSuspenseQuery(baseOptions?: Apollo.SuspenseQueryHookOptions<ConditionsQuery, ConditionsQueryVariables>): Apollo.UseSuspenseQueryResult<ConditionsQuery, ConditionsQueryVariables>;
export function useConditionsSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<ConditionsQuery, ConditionsQueryVariables>): Apollo.UseSuspenseQueryResult<ConditionsQuery | undefined, ConditionsQueryVariables>;
export function useConditionsSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<ConditionsQuery, ConditionsQueryVariables>) {
          const options = baseOptions === Apollo.skipToken ? baseOptions : {...defaultOptions, ...baseOptions}
          return Apollo.useSuspenseQuery<ConditionsQuery, ConditionsQueryVariables>(ConditionsDocument, options);
        }
export type ConditionsQueryHookResult = ReturnType<typeof useConditionsQuery>;
export type ConditionsLazyQueryHookResult = ReturnType<typeof useConditionsLazyQuery>;
export type ConditionsSuspenseQueryHookResult = ReturnType<typeof useConditionsSuspenseQuery>;
export type ConditionsQueryResult = Apollo.QueryResult<ConditionsQuery, ConditionsQueryVariables>;
export const ConvertIssueToGoalDocument = gql`
    mutation ConvertIssueToGoal($id: Int!, $input: CreateGoalInput!) {
  convertIssueToGoal(id: $id, input: $input) {
    id
    familyMemberId
    createdBy
    slug
    title
    description
    status
    createdAt
    updatedAt
  }
}
    `;
export type ConvertIssueToGoalMutationFn = Apollo.MutationFunction<ConvertIssueToGoalMutation, ConvertIssueToGoalMutationVariables>;

/**
 * __useConvertIssueToGoalMutation__
 *
 * To run a mutation, you first call `useConvertIssueToGoalMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useConvertIssueToGoalMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [convertIssueToGoalMutation, { data, loading, error }] = useConvertIssueToGoalMutation({
 *   variables: {
 *      id: // value for 'id'
 *      input: // value for 'input'
 *   },
 * });
 */
export function useConvertIssueToGoalMutation(baseOptions?: Apollo.MutationHookOptions<ConvertIssueToGoalMutation, ConvertIssueToGoalMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<ConvertIssueToGoalMutation, ConvertIssueToGoalMutationVariables>(ConvertIssueToGoalDocument, options);
      }
export type ConvertIssueToGoalMutationHookResult = ReturnType<typeof useConvertIssueToGoalMutation>;
export type ConvertIssueToGoalMutationResult = Apollo.MutationResult<ConvertIssueToGoalMutation>;
export type ConvertIssueToGoalMutationOptions = Apollo.BaseMutationOptions<ConvertIssueToGoalMutation, ConvertIssueToGoalMutationVariables>;
export const ConvertJournalEntryToIssueDocument = gql`
    mutation ConvertJournalEntryToIssue($id: Int!, $input: ConvertJournalEntryToIssueInput!) {
  convertJournalEntryToIssue(id: $id, input: $input) {
    id
    journalEntryId
    feedbackId
    familyMemberId
    createdBy
    title
    description
    category
    severity
    recommendations
    createdAt
    updatedAt
    familyMember {
      id
      firstName
      name
      slug
    }
  }
}
    `;
export type ConvertJournalEntryToIssueMutationFn = Apollo.MutationFunction<ConvertJournalEntryToIssueMutation, ConvertJournalEntryToIssueMutationVariables>;

/**
 * __useConvertJournalEntryToIssueMutation__
 *
 * To run a mutation, you first call `useConvertJournalEntryToIssueMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useConvertJournalEntryToIssueMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [convertJournalEntryToIssueMutation, { data, loading, error }] = useConvertJournalEntryToIssueMutation({
 *   variables: {
 *      id: // value for 'id'
 *      input: // value for 'input'
 *   },
 * });
 */
export function useConvertJournalEntryToIssueMutation(baseOptions?: Apollo.MutationHookOptions<ConvertJournalEntryToIssueMutation, ConvertJournalEntryToIssueMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<ConvertJournalEntryToIssueMutation, ConvertJournalEntryToIssueMutationVariables>(ConvertJournalEntryToIssueDocument, options);
      }
export type ConvertJournalEntryToIssueMutationHookResult = ReturnType<typeof useConvertJournalEntryToIssueMutation>;
export type ConvertJournalEntryToIssueMutationResult = Apollo.MutationResult<ConvertJournalEntryToIssueMutation>;
export type ConvertJournalEntryToIssueMutationOptions = Apollo.BaseMutationOptions<ConvertJournalEntryToIssueMutation, ConvertJournalEntryToIssueMutationVariables>;
export const CreateAffirmationDocument = gql`
    mutation CreateAffirmation($input: CreateAffirmationInput!) {
  createAffirmation(input: $input) {
    id
    familyMemberId
    text
    category
    isActive
    createdAt
    updatedAt
  }
}
    `;
export type CreateAffirmationMutationFn = Apollo.MutationFunction<CreateAffirmationMutation, CreateAffirmationMutationVariables>;

/**
 * __useCreateAffirmationMutation__
 *
 * To run a mutation, you first call `useCreateAffirmationMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useCreateAffirmationMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [createAffirmationMutation, { data, loading, error }] = useCreateAffirmationMutation({
 *   variables: {
 *      input: // value for 'input'
 *   },
 * });
 */
export function useCreateAffirmationMutation(baseOptions?: Apollo.MutationHookOptions<CreateAffirmationMutation, CreateAffirmationMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<CreateAffirmationMutation, CreateAffirmationMutationVariables>(CreateAffirmationDocument, options);
      }
export type CreateAffirmationMutationHookResult = ReturnType<typeof useCreateAffirmationMutation>;
export type CreateAffirmationMutationResult = Apollo.MutationResult<CreateAffirmationMutation>;
export type CreateAffirmationMutationOptions = Apollo.BaseMutationOptions<CreateAffirmationMutation, CreateAffirmationMutationVariables>;
export const CreateContactDocument = gql`
    mutation CreateContact($input: CreateContactInput!) {
  createContact(input: $input) {
    id
    createdBy
    slug
    firstName
    lastName
    description
    role
    ageYears
    notes
    createdAt
    updatedAt
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
export const CreateContactFeedbackDocument = gql`
    mutation CreateContactFeedback($input: CreateContactFeedbackInput!) {
  createContactFeedback(input: $input) {
    id
    contactId
    familyMemberId
    createdBy
    subject
    feedbackDate
    content
    tags
    source
    extracted
    createdAt
    updatedAt
  }
}
    `;
export type CreateContactFeedbackMutationFn = Apollo.MutationFunction<CreateContactFeedbackMutation, CreateContactFeedbackMutationVariables>;

/**
 * __useCreateContactFeedbackMutation__
 *
 * To run a mutation, you first call `useCreateContactFeedbackMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useCreateContactFeedbackMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [createContactFeedbackMutation, { data, loading, error }] = useCreateContactFeedbackMutation({
 *   variables: {
 *      input: // value for 'input'
 *   },
 * });
 */
export function useCreateContactFeedbackMutation(baseOptions?: Apollo.MutationHookOptions<CreateContactFeedbackMutation, CreateContactFeedbackMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<CreateContactFeedbackMutation, CreateContactFeedbackMutationVariables>(CreateContactFeedbackDocument, options);
      }
export type CreateContactFeedbackMutationHookResult = ReturnType<typeof useCreateContactFeedbackMutation>;
export type CreateContactFeedbackMutationResult = Apollo.MutationResult<CreateContactFeedbackMutation>;
export type CreateContactFeedbackMutationOptions = Apollo.BaseMutationOptions<CreateContactFeedbackMutation, CreateContactFeedbackMutationVariables>;
export const CreateConversationDocument = gql`
    mutation CreateConversation($issueId: Int!, $message: String!) {
  createConversation(issueId: $issueId, message: $message) {
    id
    issueId
    userId
    title
    createdAt
    updatedAt
    messages {
      id
      conversationId
      role
      content
      createdAt
    }
  }
}
    `;
export type CreateConversationMutationFn = Apollo.MutationFunction<CreateConversationMutation, CreateConversationMutationVariables>;

/**
 * __useCreateConversationMutation__
 *
 * To run a mutation, you first call `useCreateConversationMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useCreateConversationMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [createConversationMutation, { data, loading, error }] = useCreateConversationMutation({
 *   variables: {
 *      issueId: // value for 'issueId'
 *      message: // value for 'message'
 *   },
 * });
 */
export function useCreateConversationMutation(baseOptions?: Apollo.MutationHookOptions<CreateConversationMutation, CreateConversationMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<CreateConversationMutation, CreateConversationMutationVariables>(CreateConversationDocument, options);
      }
export type CreateConversationMutationHookResult = ReturnType<typeof useCreateConversationMutation>;
export type CreateConversationMutationResult = Apollo.MutationResult<CreateConversationMutation>;
export type CreateConversationMutationOptions = Apollo.BaseMutationOptions<CreateConversationMutation, CreateConversationMutationVariables>;
export const CreateFamilyMemberDocument = gql`
    mutation CreateFamilyMember($input: CreateFamilyMemberInput!) {
  createFamilyMember(input: $input) {
    id
    firstName
    name
    relationship
    email
    phone
    location
    occupation
    ageYears
    dateOfBirth
    bio
    allergies
    createdAt
    updatedAt
  }
}
    `;
export type CreateFamilyMemberMutationFn = Apollo.MutationFunction<CreateFamilyMemberMutation, CreateFamilyMemberMutationVariables>;

/**
 * __useCreateFamilyMemberMutation__
 *
 * To run a mutation, you first call `useCreateFamilyMemberMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useCreateFamilyMemberMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [createFamilyMemberMutation, { data, loading, error }] = useCreateFamilyMemberMutation({
 *   variables: {
 *      input: // value for 'input'
 *   },
 * });
 */
export function useCreateFamilyMemberMutation(baseOptions?: Apollo.MutationHookOptions<CreateFamilyMemberMutation, CreateFamilyMemberMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<CreateFamilyMemberMutation, CreateFamilyMemberMutationVariables>(CreateFamilyMemberDocument, options);
      }
export type CreateFamilyMemberMutationHookResult = ReturnType<typeof useCreateFamilyMemberMutation>;
export type CreateFamilyMemberMutationResult = Apollo.MutationResult<CreateFamilyMemberMutation>;
export type CreateFamilyMemberMutationOptions = Apollo.BaseMutationOptions<CreateFamilyMemberMutation, CreateFamilyMemberMutationVariables>;
export const CreateGameDocument = gql`
    mutation CreateGame($input: CreateGameInput!) {
  createGame(input: $input) {
    id
    type
    title
    description
    content
    language
    estimatedMinutes
    source
    goalId
    issueId
    familyMemberId
    createdAt
    updatedAt
  }
}
    `;
export type CreateGameMutationFn = Apollo.MutationFunction<CreateGameMutation, CreateGameMutationVariables>;

/**
 * __useCreateGameMutation__
 *
 * To run a mutation, you first call `useCreateGameMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useCreateGameMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [createGameMutation, { data, loading, error }] = useCreateGameMutation({
 *   variables: {
 *      input: // value for 'input'
 *   },
 * });
 */
export function useCreateGameMutation(baseOptions?: Apollo.MutationHookOptions<CreateGameMutation, CreateGameMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<CreateGameMutation, CreateGameMutationVariables>(CreateGameDocument, options);
      }
export type CreateGameMutationHookResult = ReturnType<typeof useCreateGameMutation>;
export type CreateGameMutationResult = Apollo.MutationResult<CreateGameMutation>;
export type CreateGameMutationOptions = Apollo.BaseMutationOptions<CreateGameMutation, CreateGameMutationVariables>;
export const CreateGoalDocument = gql`
    mutation CreateGoal($input: CreateGoalInput!) {
  createGoal(input: $input) {
    id
    slug
    title
    description
    status
    createdAt
    updatedAt
    familyMemberId
  }
}
    `;
export type CreateGoalMutationFn = Apollo.MutationFunction<CreateGoalMutation, CreateGoalMutationVariables>;

/**
 * __useCreateGoalMutation__
 *
 * To run a mutation, you first call `useCreateGoalMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useCreateGoalMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [createGoalMutation, { data, loading, error }] = useCreateGoalMutation({
 *   variables: {
 *      input: // value for 'input'
 *   },
 * });
 */
export function useCreateGoalMutation(baseOptions?: Apollo.MutationHookOptions<CreateGoalMutation, CreateGoalMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<CreateGoalMutation, CreateGoalMutationVariables>(CreateGoalDocument, options);
      }
export type CreateGoalMutationHookResult = ReturnType<typeof useCreateGoalMutation>;
export type CreateGoalMutationResult = Apollo.MutationResult<CreateGoalMutation>;
export type CreateGoalMutationOptions = Apollo.BaseMutationOptions<CreateGoalMutation, CreateGoalMutationVariables>;
export const CreateHabitDocument = gql`
    mutation CreateHabit($input: CreateHabitInput!) {
  createHabit(input: $input) {
    id
    title
    description
    frequency
    targetCount
    status
    goalId
    createdAt
    updatedAt
  }
}
    `;
export type CreateHabitMutationFn = Apollo.MutationFunction<CreateHabitMutation, CreateHabitMutationVariables>;

/**
 * __useCreateHabitMutation__
 *
 * To run a mutation, you first call `useCreateHabitMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useCreateHabitMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [createHabitMutation, { data, loading, error }] = useCreateHabitMutation({
 *   variables: {
 *      input: // value for 'input'
 *   },
 * });
 */
export function useCreateHabitMutation(baseOptions?: Apollo.MutationHookOptions<CreateHabitMutation, CreateHabitMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<CreateHabitMutation, CreateHabitMutationVariables>(CreateHabitDocument, options);
      }
export type CreateHabitMutationHookResult = ReturnType<typeof useCreateHabitMutation>;
export type CreateHabitMutationResult = Apollo.MutationResult<CreateHabitMutation>;
export type CreateHabitMutationOptions = Apollo.BaseMutationOptions<CreateHabitMutation, CreateHabitMutationVariables>;
export const CreateIssueDocument = gql`
    mutation CreateIssue($input: CreateIssueInput!) {
  createIssue(input: $input) {
    id
    feedbackId
    familyMemberId
    createdBy
    title
    description
    category
    severity
    recommendations
    createdAt
    updatedAt
  }
}
    `;
export type CreateIssueMutationFn = Apollo.MutationFunction<CreateIssueMutation, CreateIssueMutationVariables>;

/**
 * __useCreateIssueMutation__
 *
 * To run a mutation, you first call `useCreateIssueMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useCreateIssueMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [createIssueMutation, { data, loading, error }] = useCreateIssueMutation({
 *   variables: {
 *      input: // value for 'input'
 *   },
 * });
 */
export function useCreateIssueMutation(baseOptions?: Apollo.MutationHookOptions<CreateIssueMutation, CreateIssueMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<CreateIssueMutation, CreateIssueMutationVariables>(CreateIssueDocument, options);
      }
export type CreateIssueMutationHookResult = ReturnType<typeof useCreateIssueMutation>;
export type CreateIssueMutationResult = Apollo.MutationResult<CreateIssueMutation>;
export type CreateIssueMutationOptions = Apollo.BaseMutationOptions<CreateIssueMutation, CreateIssueMutationVariables>;
export const CreateJournalEntryDocument = gql`
    mutation CreateJournalEntry($input: CreateJournalEntryInput!) {
  createJournalEntry(input: $input) {
    id
    createdBy
    familyMemberId
    title
    content
    mood
    moodScore
    tags
    goalId
    isPrivate
    isVault
    entryDate
    createdAt
    updatedAt
  }
}
    `;
export type CreateJournalEntryMutationFn = Apollo.MutationFunction<CreateJournalEntryMutation, CreateJournalEntryMutationVariables>;

/**
 * __useCreateJournalEntryMutation__
 *
 * To run a mutation, you first call `useCreateJournalEntryMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useCreateJournalEntryMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [createJournalEntryMutation, { data, loading, error }] = useCreateJournalEntryMutation({
 *   variables: {
 *      input: // value for 'input'
 *   },
 * });
 */
export function useCreateJournalEntryMutation(baseOptions?: Apollo.MutationHookOptions<CreateJournalEntryMutation, CreateJournalEntryMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<CreateJournalEntryMutation, CreateJournalEntryMutationVariables>(CreateJournalEntryDocument, options);
      }
export type CreateJournalEntryMutationHookResult = ReturnType<typeof useCreateJournalEntryMutation>;
export type CreateJournalEntryMutationResult = Apollo.MutationResult<CreateJournalEntryMutation>;
export type CreateJournalEntryMutationOptions = Apollo.BaseMutationOptions<CreateJournalEntryMutation, CreateJournalEntryMutationVariables>;
export const CreateNoteDocument = gql`
    mutation CreateNote($input: CreateNoteInput!) {
  createNote(input: $input) {
    id
    entityId
    entityType
    createdBy
    noteType
    slug
    content
    createdBy
    tags
    createdAt
    updatedAt
  }
}
    `;
export type CreateNoteMutationFn = Apollo.MutationFunction<CreateNoteMutation, CreateNoteMutationVariables>;

/**
 * __useCreateNoteMutation__
 *
 * To run a mutation, you first call `useCreateNoteMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useCreateNoteMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [createNoteMutation, { data, loading, error }] = useCreateNoteMutation({
 *   variables: {
 *      input: // value for 'input'
 *   },
 * });
 */
export function useCreateNoteMutation(baseOptions?: Apollo.MutationHookOptions<CreateNoteMutation, CreateNoteMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<CreateNoteMutation, CreateNoteMutationVariables>(CreateNoteDocument, options);
      }
export type CreateNoteMutationHookResult = ReturnType<typeof useCreateNoteMutation>;
export type CreateNoteMutationResult = Apollo.MutationResult<CreateNoteMutation>;
export type CreateNoteMutationOptions = Apollo.BaseMutationOptions<CreateNoteMutation, CreateNoteMutationVariables>;
export const CreateRelatedIssueDocument = gql`
    mutation CreateRelatedIssue($issueId: Int!, $input: CreateIssueInput!, $linkType: String) {
  createRelatedIssue(issueId: $issueId, input: $input, linkType: $linkType) {
    id
    linkType
    issue {
      id
      title
      description
      category
      severity
      familyMemberId
      createdBy
      createdAt
      updatedAt
    }
  }
}
    `;
export type CreateRelatedIssueMutationFn = Apollo.MutationFunction<CreateRelatedIssueMutation, CreateRelatedIssueMutationVariables>;

/**
 * __useCreateRelatedIssueMutation__
 *
 * To run a mutation, you first call `useCreateRelatedIssueMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useCreateRelatedIssueMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [createRelatedIssueMutation, { data, loading, error }] = useCreateRelatedIssueMutation({
 *   variables: {
 *      issueId: // value for 'issueId'
 *      input: // value for 'input'
 *      linkType: // value for 'linkType'
 *   },
 * });
 */
export function useCreateRelatedIssueMutation(baseOptions?: Apollo.MutationHookOptions<CreateRelatedIssueMutation, CreateRelatedIssueMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<CreateRelatedIssueMutation, CreateRelatedIssueMutationVariables>(CreateRelatedIssueDocument, options);
      }
export type CreateRelatedIssueMutationHookResult = ReturnType<typeof useCreateRelatedIssueMutation>;
export type CreateRelatedIssueMutationResult = Apollo.MutationResult<CreateRelatedIssueMutation>;
export type CreateRelatedIssueMutationOptions = Apollo.BaseMutationOptions<CreateRelatedIssueMutation, CreateRelatedIssueMutationVariables>;
export const CreateRelationshipDocument = gql`
    mutation CreateRelationship($input: CreateRelationshipInput!) {
  createRelationship(input: $input) {
    id
    createdBy
    subjectType
    subjectId
    relatedType
    relatedId
    relationshipType
    context
    startDate
    status
    createdAt
    updatedAt
  }
}
    `;
export type CreateRelationshipMutationFn = Apollo.MutationFunction<CreateRelationshipMutation, CreateRelationshipMutationVariables>;

/**
 * __useCreateRelationshipMutation__
 *
 * To run a mutation, you first call `useCreateRelationshipMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useCreateRelationshipMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [createRelationshipMutation, { data, loading, error }] = useCreateRelationshipMutation({
 *   variables: {
 *      input: // value for 'input'
 *   },
 * });
 */
export function useCreateRelationshipMutation(baseOptions?: Apollo.MutationHookOptions<CreateRelationshipMutation, CreateRelationshipMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<CreateRelationshipMutation, CreateRelationshipMutationVariables>(CreateRelationshipDocument, options);
      }
export type CreateRelationshipMutationHookResult = ReturnType<typeof useCreateRelationshipMutation>;
export type CreateRelationshipMutationResult = Apollo.MutationResult<CreateRelationshipMutation>;
export type CreateRelationshipMutationOptions = Apollo.BaseMutationOptions<CreateRelationshipMutation, CreateRelationshipMutationVariables>;
export const CreateStoryDocument = gql`
    mutation CreateStory($input: CreateStoryInput!) {
  createStory(input: $input) {
    id
    goalId
    createdBy
    content
    createdAt
    updatedAt
  }
}
    `;
export type CreateStoryMutationFn = Apollo.MutationFunction<CreateStoryMutation, CreateStoryMutationVariables>;

/**
 * __useCreateStoryMutation__
 *
 * To run a mutation, you first call `useCreateStoryMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useCreateStoryMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [createStoryMutation, { data, loading, error }] = useCreateStoryMutation({
 *   variables: {
 *      input: // value for 'input'
 *   },
 * });
 */
export function useCreateStoryMutation(baseOptions?: Apollo.MutationHookOptions<CreateStoryMutation, CreateStoryMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<CreateStoryMutation, CreateStoryMutationVariables>(CreateStoryDocument, options);
      }
export type CreateStoryMutationHookResult = ReturnType<typeof useCreateStoryMutation>;
export type CreateStoryMutationResult = Apollo.MutationResult<CreateStoryMutation>;
export type CreateStoryMutationOptions = Apollo.BaseMutationOptions<CreateStoryMutation, CreateStoryMutationVariables>;
export const CreateSubGoalDocument = gql`
    mutation CreateSubGoal($goalId: Int!, $input: CreateSubGoalInput!) {
  createSubGoal(goalId: $goalId, input: $input) {
    id
    slug
    title
    description
    status
    parentGoalId
    createdAt
    updatedAt
    familyMemberId
  }
}
    `;
export type CreateSubGoalMutationFn = Apollo.MutationFunction<CreateSubGoalMutation, CreateSubGoalMutationVariables>;

/**
 * __useCreateSubGoalMutation__
 *
 * To run a mutation, you first call `useCreateSubGoalMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useCreateSubGoalMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [createSubGoalMutation, { data, loading, error }] = useCreateSubGoalMutation({
 *   variables: {
 *      goalId: // value for 'goalId'
 *      input: // value for 'input'
 *   },
 * });
 */
export function useCreateSubGoalMutation(baseOptions?: Apollo.MutationHookOptions<CreateSubGoalMutation, CreateSubGoalMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<CreateSubGoalMutation, CreateSubGoalMutationVariables>(CreateSubGoalDocument, options);
      }
export type CreateSubGoalMutationHookResult = ReturnType<typeof useCreateSubGoalMutation>;
export type CreateSubGoalMutationResult = Apollo.MutationResult<CreateSubGoalMutation>;
export type CreateSubGoalMutationOptions = Apollo.BaseMutationOptions<CreateSubGoalMutation, CreateSubGoalMutationVariables>;
export const CreateTeacherFeedbackDocument = gql`
    mutation CreateTeacherFeedback($input: CreateTeacherFeedbackInput!) {
  createTeacherFeedback(input: $input) {
    id
    familyMemberId
    createdBy
    teacherName
    subject
    feedbackDate
    content
    tags
    source
    extracted
    createdAt
    updatedAt
  }
}
    `;
export type CreateTeacherFeedbackMutationFn = Apollo.MutationFunction<CreateTeacherFeedbackMutation, CreateTeacherFeedbackMutationVariables>;

/**
 * __useCreateTeacherFeedbackMutation__
 *
 * To run a mutation, you first call `useCreateTeacherFeedbackMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useCreateTeacherFeedbackMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [createTeacherFeedbackMutation, { data, loading, error }] = useCreateTeacherFeedbackMutation({
 *   variables: {
 *      input: // value for 'input'
 *   },
 * });
 */
export function useCreateTeacherFeedbackMutation(baseOptions?: Apollo.MutationHookOptions<CreateTeacherFeedbackMutation, CreateTeacherFeedbackMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<CreateTeacherFeedbackMutation, CreateTeacherFeedbackMutationVariables>(CreateTeacherFeedbackDocument, options);
      }
export type CreateTeacherFeedbackMutationHookResult = ReturnType<typeof useCreateTeacherFeedbackMutation>;
export type CreateTeacherFeedbackMutationResult = Apollo.MutationResult<CreateTeacherFeedbackMutation>;
export type CreateTeacherFeedbackMutationOptions = Apollo.BaseMutationOptions<CreateTeacherFeedbackMutation, CreateTeacherFeedbackMutationVariables>;
export const DeleteAffirmationDocument = gql`
    mutation DeleteAffirmation($id: Int!) {
  deleteAffirmation(id: $id) {
    success
    message
  }
}
    `;
export type DeleteAffirmationMutationFn = Apollo.MutationFunction<DeleteAffirmationMutation, DeleteAffirmationMutationVariables>;

/**
 * __useDeleteAffirmationMutation__
 *
 * To run a mutation, you first call `useDeleteAffirmationMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useDeleteAffirmationMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [deleteAffirmationMutation, { data, loading, error }] = useDeleteAffirmationMutation({
 *   variables: {
 *      id: // value for 'id'
 *   },
 * });
 */
export function useDeleteAffirmationMutation(baseOptions?: Apollo.MutationHookOptions<DeleteAffirmationMutation, DeleteAffirmationMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<DeleteAffirmationMutation, DeleteAffirmationMutationVariables>(DeleteAffirmationDocument, options);
      }
export type DeleteAffirmationMutationHookResult = ReturnType<typeof useDeleteAffirmationMutation>;
export type DeleteAffirmationMutationResult = Apollo.MutationResult<DeleteAffirmationMutation>;
export type DeleteAffirmationMutationOptions = Apollo.BaseMutationOptions<DeleteAffirmationMutation, DeleteAffirmationMutationVariables>;
export const DeleteAllergyDocument = gql`
    mutation DeleteAllergy($id: ID!) {
  deleteAllergy(id: $id) {
    success
  }
}
    `;
export type DeleteAllergyMutationFn = Apollo.MutationFunction<DeleteAllergyMutation, DeleteAllergyMutationVariables>;

/**
 * __useDeleteAllergyMutation__
 *
 * To run a mutation, you first call `useDeleteAllergyMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useDeleteAllergyMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [deleteAllergyMutation, { data, loading, error }] = useDeleteAllergyMutation({
 *   variables: {
 *      id: // value for 'id'
 *   },
 * });
 */
export function useDeleteAllergyMutation(baseOptions?: Apollo.MutationHookOptions<DeleteAllergyMutation, DeleteAllergyMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<DeleteAllergyMutation, DeleteAllergyMutationVariables>(DeleteAllergyDocument, options);
      }
export type DeleteAllergyMutationHookResult = ReturnType<typeof useDeleteAllergyMutation>;
export type DeleteAllergyMutationResult = Apollo.MutationResult<DeleteAllergyMutation>;
export type DeleteAllergyMutationOptions = Apollo.BaseMutationOptions<DeleteAllergyMutation, DeleteAllergyMutationVariables>;
export const DeleteAppointmentDocument = gql`
    mutation DeleteAppointment($id: ID!) {
  deleteAppointment(id: $id) {
    success
  }
}
    `;
export type DeleteAppointmentMutationFn = Apollo.MutationFunction<DeleteAppointmentMutation, DeleteAppointmentMutationVariables>;

/**
 * __useDeleteAppointmentMutation__
 *
 * To run a mutation, you first call `useDeleteAppointmentMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useDeleteAppointmentMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [deleteAppointmentMutation, { data, loading, error }] = useDeleteAppointmentMutation({
 *   variables: {
 *      id: // value for 'id'
 *   },
 * });
 */
export function useDeleteAppointmentMutation(baseOptions?: Apollo.MutationHookOptions<DeleteAppointmentMutation, DeleteAppointmentMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<DeleteAppointmentMutation, DeleteAppointmentMutationVariables>(DeleteAppointmentDocument, options);
      }
export type DeleteAppointmentMutationHookResult = ReturnType<typeof useDeleteAppointmentMutation>;
export type DeleteAppointmentMutationResult = Apollo.MutationResult<DeleteAppointmentMutation>;
export type DeleteAppointmentMutationOptions = Apollo.BaseMutationOptions<DeleteAppointmentMutation, DeleteAppointmentMutationVariables>;
export const DeleteBehaviorObservationDocument = gql`
    mutation DeleteBehaviorObservation($id: Int!) {
  deleteBehaviorObservation(id: $id) {
    success
    message
  }
}
    `;
export type DeleteBehaviorObservationMutationFn = Apollo.MutationFunction<DeleteBehaviorObservationMutation, DeleteBehaviorObservationMutationVariables>;

/**
 * __useDeleteBehaviorObservationMutation__
 *
 * To run a mutation, you first call `useDeleteBehaviorObservationMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useDeleteBehaviorObservationMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [deleteBehaviorObservationMutation, { data, loading, error }] = useDeleteBehaviorObservationMutation({
 *   variables: {
 *      id: // value for 'id'
 *   },
 * });
 */
export function useDeleteBehaviorObservationMutation(baseOptions?: Apollo.MutationHookOptions<DeleteBehaviorObservationMutation, DeleteBehaviorObservationMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<DeleteBehaviorObservationMutation, DeleteBehaviorObservationMutationVariables>(DeleteBehaviorObservationDocument, options);
      }
export type DeleteBehaviorObservationMutationHookResult = ReturnType<typeof useDeleteBehaviorObservationMutation>;
export type DeleteBehaviorObservationMutationResult = Apollo.MutationResult<DeleteBehaviorObservationMutation>;
export type DeleteBehaviorObservationMutationOptions = Apollo.BaseMutationOptions<DeleteBehaviorObservationMutation, DeleteBehaviorObservationMutationVariables>;
export const DeleteBloodTestDocument = gql`
    mutation DeleteBloodTest($id: ID!) {
  deleteBloodTest(id: $id) {
    success
  }
}
    `;
export type DeleteBloodTestMutationFn = Apollo.MutationFunction<DeleteBloodTestMutation, DeleteBloodTestMutationVariables>;

/**
 * __useDeleteBloodTestMutation__
 *
 * To run a mutation, you first call `useDeleteBloodTestMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useDeleteBloodTestMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [deleteBloodTestMutation, { data, loading, error }] = useDeleteBloodTestMutation({
 *   variables: {
 *      id: // value for 'id'
 *   },
 * });
 */
export function useDeleteBloodTestMutation(baseOptions?: Apollo.MutationHookOptions<DeleteBloodTestMutation, DeleteBloodTestMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<DeleteBloodTestMutation, DeleteBloodTestMutationVariables>(DeleteBloodTestDocument, options);
      }
export type DeleteBloodTestMutationHookResult = ReturnType<typeof useDeleteBloodTestMutation>;
export type DeleteBloodTestMutationResult = Apollo.MutationResult<DeleteBloodTestMutation>;
export type DeleteBloodTestMutationOptions = Apollo.BaseMutationOptions<DeleteBloodTestMutation, DeleteBloodTestMutationVariables>;
export const DeleteConditionDocument = gql`
    mutation DeleteCondition($id: ID!) {
  deleteCondition(id: $id) {
    success
  }
}
    `;
export type DeleteConditionMutationFn = Apollo.MutationFunction<DeleteConditionMutation, DeleteConditionMutationVariables>;

/**
 * __useDeleteConditionMutation__
 *
 * To run a mutation, you first call `useDeleteConditionMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useDeleteConditionMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [deleteConditionMutation, { data, loading, error }] = useDeleteConditionMutation({
 *   variables: {
 *      id: // value for 'id'
 *   },
 * });
 */
export function useDeleteConditionMutation(baseOptions?: Apollo.MutationHookOptions<DeleteConditionMutation, DeleteConditionMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<DeleteConditionMutation, DeleteConditionMutationVariables>(DeleteConditionDocument, options);
      }
export type DeleteConditionMutationHookResult = ReturnType<typeof useDeleteConditionMutation>;
export type DeleteConditionMutationResult = Apollo.MutationResult<DeleteConditionMutation>;
export type DeleteConditionMutationOptions = Apollo.BaseMutationOptions<DeleteConditionMutation, DeleteConditionMutationVariables>;
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
export const DeleteContactFeedbackDocument = gql`
    mutation DeleteContactFeedback($id: Int!) {
  deleteContactFeedback(id: $id) {
    success
    message
  }
}
    `;
export type DeleteContactFeedbackMutationFn = Apollo.MutationFunction<DeleteContactFeedbackMutation, DeleteContactFeedbackMutationVariables>;

/**
 * __useDeleteContactFeedbackMutation__
 *
 * To run a mutation, you first call `useDeleteContactFeedbackMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useDeleteContactFeedbackMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [deleteContactFeedbackMutation, { data, loading, error }] = useDeleteContactFeedbackMutation({
 *   variables: {
 *      id: // value for 'id'
 *   },
 * });
 */
export function useDeleteContactFeedbackMutation(baseOptions?: Apollo.MutationHookOptions<DeleteContactFeedbackMutation, DeleteContactFeedbackMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<DeleteContactFeedbackMutation, DeleteContactFeedbackMutationVariables>(DeleteContactFeedbackDocument, options);
      }
export type DeleteContactFeedbackMutationHookResult = ReturnType<typeof useDeleteContactFeedbackMutation>;
export type DeleteContactFeedbackMutationResult = Apollo.MutationResult<DeleteContactFeedbackMutation>;
export type DeleteContactFeedbackMutationOptions = Apollo.BaseMutationOptions<DeleteContactFeedbackMutation, DeleteContactFeedbackMutationVariables>;
export const DeleteConversationDocument = gql`
    mutation DeleteConversation($id: Int!) {
  deleteConversation(id: $id) {
    id
  }
}
    `;
export type DeleteConversationMutationFn = Apollo.MutationFunction<DeleteConversationMutation, DeleteConversationMutationVariables>;

/**
 * __useDeleteConversationMutation__
 *
 * To run a mutation, you first call `useDeleteConversationMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useDeleteConversationMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [deleteConversationMutation, { data, loading, error }] = useDeleteConversationMutation({
 *   variables: {
 *      id: // value for 'id'
 *   },
 * });
 */
export function useDeleteConversationMutation(baseOptions?: Apollo.MutationHookOptions<DeleteConversationMutation, DeleteConversationMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<DeleteConversationMutation, DeleteConversationMutationVariables>(DeleteConversationDocument, options);
      }
export type DeleteConversationMutationHookResult = ReturnType<typeof useDeleteConversationMutation>;
export type DeleteConversationMutationResult = Apollo.MutationResult<DeleteConversationMutation>;
export type DeleteConversationMutationOptions = Apollo.BaseMutationOptions<DeleteConversationMutation, DeleteConversationMutationVariables>;
export const DeleteDeepAnalysisDocument = gql`
    mutation DeleteDeepAnalysis($id: Int!) {
  deleteDeepAnalysis(id: $id) {
    success
    message
  }
}
    `;
export type DeleteDeepAnalysisMutationFn = Apollo.MutationFunction<DeleteDeepAnalysisMutation, DeleteDeepAnalysisMutationVariables>;

/**
 * __useDeleteDeepAnalysisMutation__
 *
 * To run a mutation, you first call `useDeleteDeepAnalysisMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useDeleteDeepAnalysisMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [deleteDeepAnalysisMutation, { data, loading, error }] = useDeleteDeepAnalysisMutation({
 *   variables: {
 *      id: // value for 'id'
 *   },
 * });
 */
export function useDeleteDeepAnalysisMutation(baseOptions?: Apollo.MutationHookOptions<DeleteDeepAnalysisMutation, DeleteDeepAnalysisMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<DeleteDeepAnalysisMutation, DeleteDeepAnalysisMutationVariables>(DeleteDeepAnalysisDocument, options);
      }
export type DeleteDeepAnalysisMutationHookResult = ReturnType<typeof useDeleteDeepAnalysisMutation>;
export type DeleteDeepAnalysisMutationResult = Apollo.MutationResult<DeleteDeepAnalysisMutation>;
export type DeleteDeepAnalysisMutationOptions = Apollo.BaseMutationOptions<DeleteDeepAnalysisMutation, DeleteDeepAnalysisMutationVariables>;
export const DeleteDeepIssueAnalysisDocument = gql`
    mutation DeleteDeepIssueAnalysis($id: Int!) {
  deleteDeepIssueAnalysis(id: $id) {
    success
    message
  }
}
    `;
export type DeleteDeepIssueAnalysisMutationFn = Apollo.MutationFunction<DeleteDeepIssueAnalysisMutation, DeleteDeepIssueAnalysisMutationVariables>;

/**
 * __useDeleteDeepIssueAnalysisMutation__
 *
 * To run a mutation, you first call `useDeleteDeepIssueAnalysisMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useDeleteDeepIssueAnalysisMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [deleteDeepIssueAnalysisMutation, { data, loading, error }] = useDeleteDeepIssueAnalysisMutation({
 *   variables: {
 *      id: // value for 'id'
 *   },
 * });
 */
export function useDeleteDeepIssueAnalysisMutation(baseOptions?: Apollo.MutationHookOptions<DeleteDeepIssueAnalysisMutation, DeleteDeepIssueAnalysisMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<DeleteDeepIssueAnalysisMutation, DeleteDeepIssueAnalysisMutationVariables>(DeleteDeepIssueAnalysisDocument, options);
      }
export type DeleteDeepIssueAnalysisMutationHookResult = ReturnType<typeof useDeleteDeepIssueAnalysisMutation>;
export type DeleteDeepIssueAnalysisMutationResult = Apollo.MutationResult<DeleteDeepIssueAnalysisMutation>;
export type DeleteDeepIssueAnalysisMutationOptions = Apollo.BaseMutationOptions<DeleteDeepIssueAnalysisMutation, DeleteDeepIssueAnalysisMutationVariables>;
export const DeleteDiscussionGuideDocument = gql`
    mutation DeleteDiscussionGuide($journalEntryId: Int!) {
  deleteDiscussionGuide(journalEntryId: $journalEntryId) {
    success
    message
  }
}
    `;
export type DeleteDiscussionGuideMutationFn = Apollo.MutationFunction<DeleteDiscussionGuideMutation, DeleteDiscussionGuideMutationVariables>;

/**
 * __useDeleteDiscussionGuideMutation__
 *
 * To run a mutation, you first call `useDeleteDiscussionGuideMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useDeleteDiscussionGuideMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [deleteDiscussionGuideMutation, { data, loading, error }] = useDeleteDiscussionGuideMutation({
 *   variables: {
 *      journalEntryId: // value for 'journalEntryId'
 *   },
 * });
 */
export function useDeleteDiscussionGuideMutation(baseOptions?: Apollo.MutationHookOptions<DeleteDiscussionGuideMutation, DeleteDiscussionGuideMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<DeleteDiscussionGuideMutation, DeleteDiscussionGuideMutationVariables>(DeleteDiscussionGuideDocument, options);
      }
export type DeleteDiscussionGuideMutationHookResult = ReturnType<typeof useDeleteDiscussionGuideMutation>;
export type DeleteDiscussionGuideMutationResult = Apollo.MutationResult<DeleteDiscussionGuideMutation>;
export type DeleteDiscussionGuideMutationOptions = Apollo.BaseMutationOptions<DeleteDiscussionGuideMutation, DeleteDiscussionGuideMutationVariables>;
export const DeleteDoctorDocument = gql`
    mutation DeleteDoctor($id: ID!) {
  deleteDoctor(id: $id) {
    success
  }
}
    `;
export type DeleteDoctorMutationFn = Apollo.MutationFunction<DeleteDoctorMutation, DeleteDoctorMutationVariables>;

/**
 * __useDeleteDoctorMutation__
 *
 * To run a mutation, you first call `useDeleteDoctorMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useDeleteDoctorMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [deleteDoctorMutation, { data, loading, error }] = useDeleteDoctorMutation({
 *   variables: {
 *      id: // value for 'id'
 *   },
 * });
 */
export function useDeleteDoctorMutation(baseOptions?: Apollo.MutationHookOptions<DeleteDoctorMutation, DeleteDoctorMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<DeleteDoctorMutation, DeleteDoctorMutationVariables>(DeleteDoctorDocument, options);
      }
export type DeleteDoctorMutationHookResult = ReturnType<typeof useDeleteDoctorMutation>;
export type DeleteDoctorMutationResult = Apollo.MutationResult<DeleteDoctorMutation>;
export type DeleteDoctorMutationOptions = Apollo.BaseMutationOptions<DeleteDoctorMutation, DeleteDoctorMutationVariables>;
export const DeleteFamilyMemberDocument = gql`
    mutation DeleteFamilyMember($id: Int!) {
  deleteFamilyMember(id: $id) {
    success
    message
  }
}
    `;
export type DeleteFamilyMemberMutationFn = Apollo.MutationFunction<DeleteFamilyMemberMutation, DeleteFamilyMemberMutationVariables>;

/**
 * __useDeleteFamilyMemberMutation__
 *
 * To run a mutation, you first call `useDeleteFamilyMemberMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useDeleteFamilyMemberMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [deleteFamilyMemberMutation, { data, loading, error }] = useDeleteFamilyMemberMutation({
 *   variables: {
 *      id: // value for 'id'
 *   },
 * });
 */
export function useDeleteFamilyMemberMutation(baseOptions?: Apollo.MutationHookOptions<DeleteFamilyMemberMutation, DeleteFamilyMemberMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<DeleteFamilyMemberMutation, DeleteFamilyMemberMutationVariables>(DeleteFamilyMemberDocument, options);
      }
export type DeleteFamilyMemberMutationHookResult = ReturnType<typeof useDeleteFamilyMemberMutation>;
export type DeleteFamilyMemberMutationResult = Apollo.MutationResult<DeleteFamilyMemberMutation>;
export type DeleteFamilyMemberMutationOptions = Apollo.BaseMutationOptions<DeleteFamilyMemberMutation, DeleteFamilyMemberMutationVariables>;
export const DeleteGameDocument = gql`
    mutation DeleteGame($id: Int!) {
  deleteGame(id: $id) {
    success
    message
  }
}
    `;
export type DeleteGameMutationFn = Apollo.MutationFunction<DeleteGameMutation, DeleteGameMutationVariables>;

/**
 * __useDeleteGameMutation__
 *
 * To run a mutation, you first call `useDeleteGameMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useDeleteGameMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [deleteGameMutation, { data, loading, error }] = useDeleteGameMutation({
 *   variables: {
 *      id: // value for 'id'
 *   },
 * });
 */
export function useDeleteGameMutation(baseOptions?: Apollo.MutationHookOptions<DeleteGameMutation, DeleteGameMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<DeleteGameMutation, DeleteGameMutationVariables>(DeleteGameDocument, options);
      }
export type DeleteGameMutationHookResult = ReturnType<typeof useDeleteGameMutation>;
export type DeleteGameMutationResult = Apollo.MutationResult<DeleteGameMutation>;
export type DeleteGameMutationOptions = Apollo.BaseMutationOptions<DeleteGameMutation, DeleteGameMutationVariables>;
export const DeleteGoalDocument = gql`
    mutation DeleteGoal($id: Int!) {
  deleteGoal(id: $id) {
    success
    message
  }
}
    `;
export type DeleteGoalMutationFn = Apollo.MutationFunction<DeleteGoalMutation, DeleteGoalMutationVariables>;

/**
 * __useDeleteGoalMutation__
 *
 * To run a mutation, you first call `useDeleteGoalMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useDeleteGoalMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [deleteGoalMutation, { data, loading, error }] = useDeleteGoalMutation({
 *   variables: {
 *      id: // value for 'id'
 *   },
 * });
 */
export function useDeleteGoalMutation(baseOptions?: Apollo.MutationHookOptions<DeleteGoalMutation, DeleteGoalMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<DeleteGoalMutation, DeleteGoalMutationVariables>(DeleteGoalDocument, options);
      }
export type DeleteGoalMutationHookResult = ReturnType<typeof useDeleteGoalMutation>;
export type DeleteGoalMutationResult = Apollo.MutationResult<DeleteGoalMutation>;
export type DeleteGoalMutationOptions = Apollo.BaseMutationOptions<DeleteGoalMutation, DeleteGoalMutationVariables>;
export const DeleteHabitDocument = gql`
    mutation DeleteHabit($id: Int!) {
  deleteHabit(id: $id) {
    success
    message
  }
}
    `;
export type DeleteHabitMutationFn = Apollo.MutationFunction<DeleteHabitMutation, DeleteHabitMutationVariables>;

/**
 * __useDeleteHabitMutation__
 *
 * To run a mutation, you first call `useDeleteHabitMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useDeleteHabitMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [deleteHabitMutation, { data, loading, error }] = useDeleteHabitMutation({
 *   variables: {
 *      id: // value for 'id'
 *   },
 * });
 */
export function useDeleteHabitMutation(baseOptions?: Apollo.MutationHookOptions<DeleteHabitMutation, DeleteHabitMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<DeleteHabitMutation, DeleteHabitMutationVariables>(DeleteHabitDocument, options);
      }
export type DeleteHabitMutationHookResult = ReturnType<typeof useDeleteHabitMutation>;
export type DeleteHabitMutationResult = Apollo.MutationResult<DeleteHabitMutation>;
export type DeleteHabitMutationOptions = Apollo.BaseMutationOptions<DeleteHabitMutation, DeleteHabitMutationVariables>;
export const DeleteHabitLogDocument = gql`
    mutation DeleteHabitLog($id: Int!) {
  deleteHabitLog(id: $id)
}
    `;
export type DeleteHabitLogMutationFn = Apollo.MutationFunction<DeleteHabitLogMutation, DeleteHabitLogMutationVariables>;

/**
 * __useDeleteHabitLogMutation__
 *
 * To run a mutation, you first call `useDeleteHabitLogMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useDeleteHabitLogMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [deleteHabitLogMutation, { data, loading, error }] = useDeleteHabitLogMutation({
 *   variables: {
 *      id: // value for 'id'
 *   },
 * });
 */
export function useDeleteHabitLogMutation(baseOptions?: Apollo.MutationHookOptions<DeleteHabitLogMutation, DeleteHabitLogMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<DeleteHabitLogMutation, DeleteHabitLogMutationVariables>(DeleteHabitLogDocument, options);
      }
export type DeleteHabitLogMutationHookResult = ReturnType<typeof useDeleteHabitLogMutation>;
export type DeleteHabitLogMutationResult = Apollo.MutationResult<DeleteHabitLogMutation>;
export type DeleteHabitLogMutationOptions = Apollo.BaseMutationOptions<DeleteHabitLogMutation, DeleteHabitLogMutationVariables>;
export const DeleteIssueDocument = gql`
    mutation DeleteIssue($id: Int!) {
  deleteIssue(id: $id) {
    success
    message
  }
}
    `;
export type DeleteIssueMutationFn = Apollo.MutationFunction<DeleteIssueMutation, DeleteIssueMutationVariables>;

/**
 * __useDeleteIssueMutation__
 *
 * To run a mutation, you first call `useDeleteIssueMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useDeleteIssueMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [deleteIssueMutation, { data, loading, error }] = useDeleteIssueMutation({
 *   variables: {
 *      id: // value for 'id'
 *   },
 * });
 */
export function useDeleteIssueMutation(baseOptions?: Apollo.MutationHookOptions<DeleteIssueMutation, DeleteIssueMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<DeleteIssueMutation, DeleteIssueMutationVariables>(DeleteIssueDocument, options);
      }
export type DeleteIssueMutationHookResult = ReturnType<typeof useDeleteIssueMutation>;
export type DeleteIssueMutationResult = Apollo.MutationResult<DeleteIssueMutation>;
export type DeleteIssueMutationOptions = Apollo.BaseMutationOptions<DeleteIssueMutation, DeleteIssueMutationVariables>;
export const DeleteIssueScreenshotDocument = gql`
    mutation DeleteIssueScreenshot($id: Int!) {
  deleteIssueScreenshot(id: $id) {
    success
  }
}
    `;
export type DeleteIssueScreenshotMutationFn = Apollo.MutationFunction<DeleteIssueScreenshotMutation, DeleteIssueScreenshotMutationVariables>;

/**
 * __useDeleteIssueScreenshotMutation__
 *
 * To run a mutation, you first call `useDeleteIssueScreenshotMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useDeleteIssueScreenshotMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [deleteIssueScreenshotMutation, { data, loading, error }] = useDeleteIssueScreenshotMutation({
 *   variables: {
 *      id: // value for 'id'
 *   },
 * });
 */
export function useDeleteIssueScreenshotMutation(baseOptions?: Apollo.MutationHookOptions<DeleteIssueScreenshotMutation, DeleteIssueScreenshotMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<DeleteIssueScreenshotMutation, DeleteIssueScreenshotMutationVariables>(DeleteIssueScreenshotDocument, options);
      }
export type DeleteIssueScreenshotMutationHookResult = ReturnType<typeof useDeleteIssueScreenshotMutation>;
export type DeleteIssueScreenshotMutationResult = Apollo.MutationResult<DeleteIssueScreenshotMutation>;
export type DeleteIssueScreenshotMutationOptions = Apollo.BaseMutationOptions<DeleteIssueScreenshotMutation, DeleteIssueScreenshotMutationVariables>;
export const DeleteJournalAnalysisDocument = gql`
    mutation DeleteJournalAnalysis($journalEntryId: Int!) {
  deleteJournalAnalysis(journalEntryId: $journalEntryId) {
    success
    message
  }
}
    `;
export type DeleteJournalAnalysisMutationFn = Apollo.MutationFunction<DeleteJournalAnalysisMutation, DeleteJournalAnalysisMutationVariables>;

/**
 * __useDeleteJournalAnalysisMutation__
 *
 * To run a mutation, you first call `useDeleteJournalAnalysisMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useDeleteJournalAnalysisMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [deleteJournalAnalysisMutation, { data, loading, error }] = useDeleteJournalAnalysisMutation({
 *   variables: {
 *      journalEntryId: // value for 'journalEntryId'
 *   },
 * });
 */
export function useDeleteJournalAnalysisMutation(baseOptions?: Apollo.MutationHookOptions<DeleteJournalAnalysisMutation, DeleteJournalAnalysisMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<DeleteJournalAnalysisMutation, DeleteJournalAnalysisMutationVariables>(DeleteJournalAnalysisDocument, options);
      }
export type DeleteJournalAnalysisMutationHookResult = ReturnType<typeof useDeleteJournalAnalysisMutation>;
export type DeleteJournalAnalysisMutationResult = Apollo.MutationResult<DeleteJournalAnalysisMutation>;
export type DeleteJournalAnalysisMutationOptions = Apollo.BaseMutationOptions<DeleteJournalAnalysisMutation, DeleteJournalAnalysisMutationVariables>;
export const DeleteJournalEntryDocument = gql`
    mutation DeleteJournalEntry($id: Int!) {
  deleteJournalEntry(id: $id) {
    success
    message
  }
}
    `;
export type DeleteJournalEntryMutationFn = Apollo.MutationFunction<DeleteJournalEntryMutation, DeleteJournalEntryMutationVariables>;

/**
 * __useDeleteJournalEntryMutation__
 *
 * To run a mutation, you first call `useDeleteJournalEntryMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useDeleteJournalEntryMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [deleteJournalEntryMutation, { data, loading, error }] = useDeleteJournalEntryMutation({
 *   variables: {
 *      id: // value for 'id'
 *   },
 * });
 */
export function useDeleteJournalEntryMutation(baseOptions?: Apollo.MutationHookOptions<DeleteJournalEntryMutation, DeleteJournalEntryMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<DeleteJournalEntryMutation, DeleteJournalEntryMutationVariables>(DeleteJournalEntryDocument, options);
      }
export type DeleteJournalEntryMutationHookResult = ReturnType<typeof useDeleteJournalEntryMutation>;
export type DeleteJournalEntryMutationResult = Apollo.MutationResult<DeleteJournalEntryMutation>;
export type DeleteJournalEntryMutationOptions = Apollo.BaseMutationOptions<DeleteJournalEntryMutation, DeleteJournalEntryMutationVariables>;
export const DeleteJournalRecommendedBooksDocument = gql`
    mutation DeleteJournalRecommendedBooks($journalEntryId: Int!) {
  deleteRecommendedBooks(journalEntryId: $journalEntryId) {
    success
    message
    deletedCount
  }
}
    `;
export type DeleteJournalRecommendedBooksMutationFn = Apollo.MutationFunction<DeleteJournalRecommendedBooksMutation, DeleteJournalRecommendedBooksMutationVariables>;

/**
 * __useDeleteJournalRecommendedBooksMutation__
 *
 * To run a mutation, you first call `useDeleteJournalRecommendedBooksMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useDeleteJournalRecommendedBooksMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [deleteJournalRecommendedBooksMutation, { data, loading, error }] = useDeleteJournalRecommendedBooksMutation({
 *   variables: {
 *      journalEntryId: // value for 'journalEntryId'
 *   },
 * });
 */
export function useDeleteJournalRecommendedBooksMutation(baseOptions?: Apollo.MutationHookOptions<DeleteJournalRecommendedBooksMutation, DeleteJournalRecommendedBooksMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<DeleteJournalRecommendedBooksMutation, DeleteJournalRecommendedBooksMutationVariables>(DeleteJournalRecommendedBooksDocument, options);
      }
export type DeleteJournalRecommendedBooksMutationHookResult = ReturnType<typeof useDeleteJournalRecommendedBooksMutation>;
export type DeleteJournalRecommendedBooksMutationResult = Apollo.MutationResult<DeleteJournalRecommendedBooksMutation>;
export type DeleteJournalRecommendedBooksMutationOptions = Apollo.BaseMutationOptions<DeleteJournalRecommendedBooksMutation, DeleteJournalRecommendedBooksMutationVariables>;
export const DeleteMedicationDocument = gql`
    mutation DeleteMedication($id: ID!) {
  deleteMedication(id: $id) {
    success
  }
}
    `;
export type DeleteMedicationMutationFn = Apollo.MutationFunction<DeleteMedicationMutation, DeleteMedicationMutationVariables>;

/**
 * __useDeleteMedicationMutation__
 *
 * To run a mutation, you first call `useDeleteMedicationMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useDeleteMedicationMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [deleteMedicationMutation, { data, loading, error }] = useDeleteMedicationMutation({
 *   variables: {
 *      id: // value for 'id'
 *   },
 * });
 */
export function useDeleteMedicationMutation(baseOptions?: Apollo.MutationHookOptions<DeleteMedicationMutation, DeleteMedicationMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<DeleteMedicationMutation, DeleteMedicationMutationVariables>(DeleteMedicationDocument, options);
      }
export type DeleteMedicationMutationHookResult = ReturnType<typeof useDeleteMedicationMutation>;
export type DeleteMedicationMutationResult = Apollo.MutationResult<DeleteMedicationMutation>;
export type DeleteMedicationMutationOptions = Apollo.BaseMutationOptions<DeleteMedicationMutation, DeleteMedicationMutationVariables>;
export const DeleteMemoryEntryDocument = gql`
    mutation DeleteMemoryEntry($id: ID!) {
  deleteMemoryEntry(id: $id) {
    success
  }
}
    `;
export type DeleteMemoryEntryMutationFn = Apollo.MutationFunction<DeleteMemoryEntryMutation, DeleteMemoryEntryMutationVariables>;

/**
 * __useDeleteMemoryEntryMutation__
 *
 * To run a mutation, you first call `useDeleteMemoryEntryMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useDeleteMemoryEntryMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [deleteMemoryEntryMutation, { data, loading, error }] = useDeleteMemoryEntryMutation({
 *   variables: {
 *      id: // value for 'id'
 *   },
 * });
 */
export function useDeleteMemoryEntryMutation(baseOptions?: Apollo.MutationHookOptions<DeleteMemoryEntryMutation, DeleteMemoryEntryMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<DeleteMemoryEntryMutation, DeleteMemoryEntryMutationVariables>(DeleteMemoryEntryDocument, options);
      }
export type DeleteMemoryEntryMutationHookResult = ReturnType<typeof useDeleteMemoryEntryMutation>;
export type DeleteMemoryEntryMutationResult = Apollo.MutationResult<DeleteMemoryEntryMutation>;
export type DeleteMemoryEntryMutationOptions = Apollo.BaseMutationOptions<DeleteMemoryEntryMutation, DeleteMemoryEntryMutationVariables>;
export const DeleteNoteDocument = gql`
    mutation DeleteNote($id: Int!) {
  deleteNote(id: $id) {
    success
    message
  }
}
    `;
export type DeleteNoteMutationFn = Apollo.MutationFunction<DeleteNoteMutation, DeleteNoteMutationVariables>;

/**
 * __useDeleteNoteMutation__
 *
 * To run a mutation, you first call `useDeleteNoteMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useDeleteNoteMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [deleteNoteMutation, { data, loading, error }] = useDeleteNoteMutation({
 *   variables: {
 *      id: // value for 'id'
 *   },
 * });
 */
export function useDeleteNoteMutation(baseOptions?: Apollo.MutationHookOptions<DeleteNoteMutation, DeleteNoteMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<DeleteNoteMutation, DeleteNoteMutationVariables>(DeleteNoteDocument, options);
      }
export type DeleteNoteMutationHookResult = ReturnType<typeof useDeleteNoteMutation>;
export type DeleteNoteMutationResult = Apollo.MutationResult<DeleteNoteMutation>;
export type DeleteNoteMutationOptions = Apollo.BaseMutationOptions<DeleteNoteMutation, DeleteNoteMutationVariables>;
export const DeleteProtocolDocument = gql`
    mutation DeleteProtocol($id: ID!) {
  deleteProtocol(id: $id) {
    success
  }
}
    `;
export type DeleteProtocolMutationFn = Apollo.MutationFunction<DeleteProtocolMutation, DeleteProtocolMutationVariables>;

/**
 * __useDeleteProtocolMutation__
 *
 * To run a mutation, you first call `useDeleteProtocolMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useDeleteProtocolMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [deleteProtocolMutation, { data, loading, error }] = useDeleteProtocolMutation({
 *   variables: {
 *      id: // value for 'id'
 *   },
 * });
 */
export function useDeleteProtocolMutation(baseOptions?: Apollo.MutationHookOptions<DeleteProtocolMutation, DeleteProtocolMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<DeleteProtocolMutation, DeleteProtocolMutationVariables>(DeleteProtocolDocument, options);
      }
export type DeleteProtocolMutationHookResult = ReturnType<typeof useDeleteProtocolMutation>;
export type DeleteProtocolMutationResult = Apollo.MutationResult<DeleteProtocolMutation>;
export type DeleteProtocolMutationOptions = Apollo.BaseMutationOptions<DeleteProtocolMutation, DeleteProtocolMutationVariables>;
export const DeleteRecommendedBooksDocument = gql`
    mutation DeleteRecommendedBooks($goalId: Int!) {
  deleteRecommendedBooks(goalId: $goalId) {
    success
    message
    deletedCount
  }
}
    `;
export type DeleteRecommendedBooksMutationFn = Apollo.MutationFunction<DeleteRecommendedBooksMutation, DeleteRecommendedBooksMutationVariables>;

/**
 * __useDeleteRecommendedBooksMutation__
 *
 * To run a mutation, you first call `useDeleteRecommendedBooksMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useDeleteRecommendedBooksMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [deleteRecommendedBooksMutation, { data, loading, error }] = useDeleteRecommendedBooksMutation({
 *   variables: {
 *      goalId: // value for 'goalId'
 *   },
 * });
 */
export function useDeleteRecommendedBooksMutation(baseOptions?: Apollo.MutationHookOptions<DeleteRecommendedBooksMutation, DeleteRecommendedBooksMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<DeleteRecommendedBooksMutation, DeleteRecommendedBooksMutationVariables>(DeleteRecommendedBooksDocument, options);
      }
export type DeleteRecommendedBooksMutationHookResult = ReturnType<typeof useDeleteRecommendedBooksMutation>;
export type DeleteRecommendedBooksMutationResult = Apollo.MutationResult<DeleteRecommendedBooksMutation>;
export type DeleteRecommendedBooksMutationOptions = Apollo.BaseMutationOptions<DeleteRecommendedBooksMutation, DeleteRecommendedBooksMutationVariables>;
export const DeleteRelationshipDocument = gql`
    mutation DeleteRelationship($id: Int!) {
  deleteRelationship(id: $id) {
    success
    message
  }
}
    `;
export type DeleteRelationshipMutationFn = Apollo.MutationFunction<DeleteRelationshipMutation, DeleteRelationshipMutationVariables>;

/**
 * __useDeleteRelationshipMutation__
 *
 * To run a mutation, you first call `useDeleteRelationshipMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useDeleteRelationshipMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [deleteRelationshipMutation, { data, loading, error }] = useDeleteRelationshipMutation({
 *   variables: {
 *      id: // value for 'id'
 *   },
 * });
 */
export function useDeleteRelationshipMutation(baseOptions?: Apollo.MutationHookOptions<DeleteRelationshipMutation, DeleteRelationshipMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<DeleteRelationshipMutation, DeleteRelationshipMutationVariables>(DeleteRelationshipDocument, options);
      }
export type DeleteRelationshipMutationHookResult = ReturnType<typeof useDeleteRelationshipMutation>;
export type DeleteRelationshipMutationResult = Apollo.MutationResult<DeleteRelationshipMutation>;
export type DeleteRelationshipMutationOptions = Apollo.BaseMutationOptions<DeleteRelationshipMutation, DeleteRelationshipMutationVariables>;
export const DeleteResearchDocument = gql`
    mutation DeleteResearch($goalId: Int!) {
  deleteResearch(goalId: $goalId) {
    success
    message
    deletedCount
  }
}
    `;
export type DeleteResearchMutationFn = Apollo.MutationFunction<DeleteResearchMutation, DeleteResearchMutationVariables>;

/**
 * __useDeleteResearchMutation__
 *
 * To run a mutation, you first call `useDeleteResearchMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useDeleteResearchMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [deleteResearchMutation, { data, loading, error }] = useDeleteResearchMutation({
 *   variables: {
 *      goalId: // value for 'goalId'
 *   },
 * });
 */
export function useDeleteResearchMutation(baseOptions?: Apollo.MutationHookOptions<DeleteResearchMutation, DeleteResearchMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<DeleteResearchMutation, DeleteResearchMutationVariables>(DeleteResearchDocument, options);
      }
export type DeleteResearchMutationHookResult = ReturnType<typeof useDeleteResearchMutation>;
export type DeleteResearchMutationResult = Apollo.MutationResult<DeleteResearchMutation>;
export type DeleteResearchMutationOptions = Apollo.BaseMutationOptions<DeleteResearchMutation, DeleteResearchMutationVariables>;
export const DeleteRoutineAnalysisDocument = gql`
    mutation DeleteRoutineAnalysis($id: Int!) {
  deleteRoutineAnalysis(id: $id) {
    success
    message
  }
}
    `;
export type DeleteRoutineAnalysisMutationFn = Apollo.MutationFunction<DeleteRoutineAnalysisMutation, DeleteRoutineAnalysisMutationVariables>;

/**
 * __useDeleteRoutineAnalysisMutation__
 *
 * To run a mutation, you first call `useDeleteRoutineAnalysisMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useDeleteRoutineAnalysisMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [deleteRoutineAnalysisMutation, { data, loading, error }] = useDeleteRoutineAnalysisMutation({
 *   variables: {
 *      id: // value for 'id'
 *   },
 * });
 */
export function useDeleteRoutineAnalysisMutation(baseOptions?: Apollo.MutationHookOptions<DeleteRoutineAnalysisMutation, DeleteRoutineAnalysisMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<DeleteRoutineAnalysisMutation, DeleteRoutineAnalysisMutationVariables>(DeleteRoutineAnalysisDocument, options);
      }
export type DeleteRoutineAnalysisMutationHookResult = ReturnType<typeof useDeleteRoutineAnalysisMutation>;
export type DeleteRoutineAnalysisMutationResult = Apollo.MutationResult<DeleteRoutineAnalysisMutation>;
export type DeleteRoutineAnalysisMutationOptions = Apollo.BaseMutationOptions<DeleteRoutineAnalysisMutation, DeleteRoutineAnalysisMutationVariables>;
export const DeleteStoryDocument = gql`
    mutation DeleteStory($id: Int!) {
  deleteStory(id: $id) {
    success
    message
  }
}
    `;
export type DeleteStoryMutationFn = Apollo.MutationFunction<DeleteStoryMutation, DeleteStoryMutationVariables>;

/**
 * __useDeleteStoryMutation__
 *
 * To run a mutation, you first call `useDeleteStoryMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useDeleteStoryMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [deleteStoryMutation, { data, loading, error }] = useDeleteStoryMutation({
 *   variables: {
 *      id: // value for 'id'
 *   },
 * });
 */
export function useDeleteStoryMutation(baseOptions?: Apollo.MutationHookOptions<DeleteStoryMutation, DeleteStoryMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<DeleteStoryMutation, DeleteStoryMutationVariables>(DeleteStoryDocument, options);
      }
export type DeleteStoryMutationHookResult = ReturnType<typeof useDeleteStoryMutation>;
export type DeleteStoryMutationResult = Apollo.MutationResult<DeleteStoryMutation>;
export type DeleteStoryMutationOptions = Apollo.BaseMutationOptions<DeleteStoryMutation, DeleteStoryMutationVariables>;
export const DeleteSupplementDocument = gql`
    mutation DeleteSupplement($id: ID!) {
  deleteSupplement(id: $id) {
    success
  }
}
    `;
export type DeleteSupplementMutationFn = Apollo.MutationFunction<DeleteSupplementMutation, DeleteSupplementMutationVariables>;

/**
 * __useDeleteSupplementMutation__
 *
 * To run a mutation, you first call `useDeleteSupplementMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useDeleteSupplementMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [deleteSupplementMutation, { data, loading, error }] = useDeleteSupplementMutation({
 *   variables: {
 *      id: // value for 'id'
 *   },
 * });
 */
export function useDeleteSupplementMutation(baseOptions?: Apollo.MutationHookOptions<DeleteSupplementMutation, DeleteSupplementMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<DeleteSupplementMutation, DeleteSupplementMutationVariables>(DeleteSupplementDocument, options);
      }
export type DeleteSupplementMutationHookResult = ReturnType<typeof useDeleteSupplementMutation>;
export type DeleteSupplementMutationResult = Apollo.MutationResult<DeleteSupplementMutation>;
export type DeleteSupplementMutationOptions = Apollo.BaseMutationOptions<DeleteSupplementMutation, DeleteSupplementMutationVariables>;
export const DeleteSymptomDocument = gql`
    mutation DeleteSymptom($id: ID!) {
  deleteSymptom(id: $id) {
    success
  }
}
    `;
export type DeleteSymptomMutationFn = Apollo.MutationFunction<DeleteSymptomMutation, DeleteSymptomMutationVariables>;

/**
 * __useDeleteSymptomMutation__
 *
 * To run a mutation, you first call `useDeleteSymptomMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useDeleteSymptomMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [deleteSymptomMutation, { data, loading, error }] = useDeleteSymptomMutation({
 *   variables: {
 *      id: // value for 'id'
 *   },
 * });
 */
export function useDeleteSymptomMutation(baseOptions?: Apollo.MutationHookOptions<DeleteSymptomMutation, DeleteSymptomMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<DeleteSymptomMutation, DeleteSymptomMutationVariables>(DeleteSymptomDocument, options);
      }
export type DeleteSymptomMutationHookResult = ReturnType<typeof useDeleteSymptomMutation>;
export type DeleteSymptomMutationResult = Apollo.MutationResult<DeleteSymptomMutation>;
export type DeleteSymptomMutationOptions = Apollo.BaseMutationOptions<DeleteSymptomMutation, DeleteSymptomMutationVariables>;
export const DeleteTeacherFeedbackDocument = gql`
    mutation DeleteTeacherFeedback($id: Int!) {
  deleteTeacherFeedback(id: $id) {
    success
    message
  }
}
    `;
export type DeleteTeacherFeedbackMutationFn = Apollo.MutationFunction<DeleteTeacherFeedbackMutation, DeleteTeacherFeedbackMutationVariables>;

/**
 * __useDeleteTeacherFeedbackMutation__
 *
 * To run a mutation, you first call `useDeleteTeacherFeedbackMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useDeleteTeacherFeedbackMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [deleteTeacherFeedbackMutation, { data, loading, error }] = useDeleteTeacherFeedbackMutation({
 *   variables: {
 *      id: // value for 'id'
 *   },
 * });
 */
export function useDeleteTeacherFeedbackMutation(baseOptions?: Apollo.MutationHookOptions<DeleteTeacherFeedbackMutation, DeleteTeacherFeedbackMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<DeleteTeacherFeedbackMutation, DeleteTeacherFeedbackMutationVariables>(DeleteTeacherFeedbackDocument, options);
      }
export type DeleteTeacherFeedbackMutationHookResult = ReturnType<typeof useDeleteTeacherFeedbackMutation>;
export type DeleteTeacherFeedbackMutationResult = Apollo.MutationResult<DeleteTeacherFeedbackMutation>;
export type DeleteTeacherFeedbackMutationOptions = Apollo.BaseMutationOptions<DeleteTeacherFeedbackMutation, DeleteTeacherFeedbackMutationVariables>;
export const DeleteTherapeuticQuestionsDocument = gql`
    mutation DeleteTherapeuticQuestions($goalId: Int, $issueId: Int, $journalEntryId: Int) {
  deleteTherapeuticQuestions(
    goalId: $goalId
    issueId: $issueId
    journalEntryId: $journalEntryId
  ) {
    success
    message
    deletedCount
  }
}
    `;
export type DeleteTherapeuticQuestionsMutationFn = Apollo.MutationFunction<DeleteTherapeuticQuestionsMutation, DeleteTherapeuticQuestionsMutationVariables>;

/**
 * __useDeleteTherapeuticQuestionsMutation__
 *
 * To run a mutation, you first call `useDeleteTherapeuticQuestionsMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useDeleteTherapeuticQuestionsMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [deleteTherapeuticQuestionsMutation, { data, loading, error }] = useDeleteTherapeuticQuestionsMutation({
 *   variables: {
 *      goalId: // value for 'goalId'
 *      issueId: // value for 'issueId'
 *      journalEntryId: // value for 'journalEntryId'
 *   },
 * });
 */
export function useDeleteTherapeuticQuestionsMutation(baseOptions?: Apollo.MutationHookOptions<DeleteTherapeuticQuestionsMutation, DeleteTherapeuticQuestionsMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<DeleteTherapeuticQuestionsMutation, DeleteTherapeuticQuestionsMutationVariables>(DeleteTherapeuticQuestionsDocument, options);
      }
export type DeleteTherapeuticQuestionsMutationHookResult = ReturnType<typeof useDeleteTherapeuticQuestionsMutation>;
export type DeleteTherapeuticQuestionsMutationResult = Apollo.MutationResult<DeleteTherapeuticQuestionsMutation>;
export type DeleteTherapeuticQuestionsMutationOptions = Apollo.BaseMutationOptions<DeleteTherapeuticQuestionsMutation, DeleteTherapeuticQuestionsMutationVariables>;
export const DoctorsDocument = gql`
    query Doctors {
  doctors {
    id
    name
    specialty
    phone
    email
    address
    notes
    createdAt
  }
}
    `;

/**
 * __useDoctorsQuery__
 *
 * To run a query within a React component, call `useDoctorsQuery` and pass it any options that fit your needs.
 * When your component renders, `useDoctorsQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useDoctorsQuery({
 *   variables: {
 *   },
 * });
 */
export function useDoctorsQuery(baseOptions?: Apollo.QueryHookOptions<DoctorsQuery, DoctorsQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<DoctorsQuery, DoctorsQueryVariables>(DoctorsDocument, options);
      }
export function useDoctorsLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<DoctorsQuery, DoctorsQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<DoctorsQuery, DoctorsQueryVariables>(DoctorsDocument, options);
        }
// @ts-ignore
export function useDoctorsSuspenseQuery(baseOptions?: Apollo.SuspenseQueryHookOptions<DoctorsQuery, DoctorsQueryVariables>): Apollo.UseSuspenseQueryResult<DoctorsQuery, DoctorsQueryVariables>;
export function useDoctorsSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<DoctorsQuery, DoctorsQueryVariables>): Apollo.UseSuspenseQueryResult<DoctorsQuery | undefined, DoctorsQueryVariables>;
export function useDoctorsSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<DoctorsQuery, DoctorsQueryVariables>) {
          const options = baseOptions === Apollo.skipToken ? baseOptions : {...defaultOptions, ...baseOptions}
          return Apollo.useSuspenseQuery<DoctorsQuery, DoctorsQueryVariables>(DoctorsDocument, options);
        }
export type DoctorsQueryHookResult = ReturnType<typeof useDoctorsQuery>;
export type DoctorsLazyQueryHookResult = ReturnType<typeof useDoctorsLazyQuery>;
export type DoctorsSuspenseQueryHookResult = ReturnType<typeof useDoctorsSuspenseQuery>;
export type DoctorsQueryResult = Apollo.QueryResult<DoctorsQuery, DoctorsQueryVariables>;
export const ExtractContactFeedbackIssuesDocument = gql`
    mutation ExtractContactFeedbackIssues($id: Int!) {
  extractContactFeedbackIssues(id: $id) {
    id
    extracted
    extractedIssues {
      title
      description
      category
      severity
      recommendations
    }
  }
}
    `;
export type ExtractContactFeedbackIssuesMutationFn = Apollo.MutationFunction<ExtractContactFeedbackIssuesMutation, ExtractContactFeedbackIssuesMutationVariables>;

/**
 * __useExtractContactFeedbackIssuesMutation__
 *
 * To run a mutation, you first call `useExtractContactFeedbackIssuesMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useExtractContactFeedbackIssuesMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [extractContactFeedbackIssuesMutation, { data, loading, error }] = useExtractContactFeedbackIssuesMutation({
 *   variables: {
 *      id: // value for 'id'
 *   },
 * });
 */
export function useExtractContactFeedbackIssuesMutation(baseOptions?: Apollo.MutationHookOptions<ExtractContactFeedbackIssuesMutation, ExtractContactFeedbackIssuesMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<ExtractContactFeedbackIssuesMutation, ExtractContactFeedbackIssuesMutationVariables>(ExtractContactFeedbackIssuesDocument, options);
      }
export type ExtractContactFeedbackIssuesMutationHookResult = ReturnType<typeof useExtractContactFeedbackIssuesMutation>;
export type ExtractContactFeedbackIssuesMutationResult = Apollo.MutationResult<ExtractContactFeedbackIssuesMutation>;
export type ExtractContactFeedbackIssuesMutationOptions = Apollo.BaseMutationOptions<ExtractContactFeedbackIssuesMutation, ExtractContactFeedbackIssuesMutationVariables>;
export const GenerateAffirmationsForFamilyMemberDocument = gql`
    mutation GenerateAffirmationsForFamilyMember($familyMemberId: Int!, $count: Int, $categoryFocus: AffirmationCategory, $language: String) {
  generateAffirmationsForFamilyMember(
    familyMemberId: $familyMemberId
    count: $count
    categoryFocus: $categoryFocus
    language: $language
  ) {
    success
    message
    count
    affirmations {
      id
      familyMemberId
      userId
      text
      category
      isActive
      createdAt
      updatedAt
    }
  }
}
    `;
export type GenerateAffirmationsForFamilyMemberMutationFn = Apollo.MutationFunction<GenerateAffirmationsForFamilyMemberMutation, GenerateAffirmationsForFamilyMemberMutationVariables>;

/**
 * __useGenerateAffirmationsForFamilyMemberMutation__
 *
 * To run a mutation, you first call `useGenerateAffirmationsForFamilyMemberMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useGenerateAffirmationsForFamilyMemberMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [generateAffirmationsForFamilyMemberMutation, { data, loading, error }] = useGenerateAffirmationsForFamilyMemberMutation({
 *   variables: {
 *      familyMemberId: // value for 'familyMemberId'
 *      count: // value for 'count'
 *      categoryFocus: // value for 'categoryFocus'
 *      language: // value for 'language'
 *   },
 * });
 */
export function useGenerateAffirmationsForFamilyMemberMutation(baseOptions?: Apollo.MutationHookOptions<GenerateAffirmationsForFamilyMemberMutation, GenerateAffirmationsForFamilyMemberMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<GenerateAffirmationsForFamilyMemberMutation, GenerateAffirmationsForFamilyMemberMutationVariables>(GenerateAffirmationsForFamilyMemberDocument, options);
      }
export type GenerateAffirmationsForFamilyMemberMutationHookResult = ReturnType<typeof useGenerateAffirmationsForFamilyMemberMutation>;
export type GenerateAffirmationsForFamilyMemberMutationResult = Apollo.MutationResult<GenerateAffirmationsForFamilyMemberMutation>;
export type GenerateAffirmationsForFamilyMemberMutationOptions = Apollo.BaseMutationOptions<GenerateAffirmationsForFamilyMemberMutation, GenerateAffirmationsForFamilyMemberMutationVariables>;
export const GenerateAudioDocument = gql`
    mutation GenerateAudio($goalId: Int!, $storyId: Int, $text: String, $language: String, $voice: String) {
  generateAudio(
    goalId: $goalId
    storyId: $storyId
    text: $text
    language: $language
    voice: $voice
  ) {
    success
    message
    jobId
    audioUrl
  }
}
    `;
export type GenerateAudioMutationFn = Apollo.MutationFunction<GenerateAudioMutation, GenerateAudioMutationVariables>;

/**
 * __useGenerateAudioMutation__
 *
 * To run a mutation, you first call `useGenerateAudioMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useGenerateAudioMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [generateAudioMutation, { data, loading, error }] = useGenerateAudioMutation({
 *   variables: {
 *      goalId: // value for 'goalId'
 *      storyId: // value for 'storyId'
 *      text: // value for 'text'
 *      language: // value for 'language'
 *      voice: // value for 'voice'
 *   },
 * });
 */
export function useGenerateAudioMutation(baseOptions?: Apollo.MutationHookOptions<GenerateAudioMutation, GenerateAudioMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<GenerateAudioMutation, GenerateAudioMutationVariables>(GenerateAudioDocument, options);
      }
export type GenerateAudioMutationHookResult = ReturnType<typeof useGenerateAudioMutation>;
export type GenerateAudioMutationResult = Apollo.MutationResult<GenerateAudioMutation>;
export type GenerateAudioMutationOptions = Apollo.BaseMutationOptions<GenerateAudioMutation, GenerateAudioMutationVariables>;
export const GenerateBogdanDiscussionDocument = gql`
    mutation GenerateBogdanDiscussion {
  generateBogdanDiscussion {
    success
    message
    jobId
  }
}
    `;
export type GenerateBogdanDiscussionMutationFn = Apollo.MutationFunction<GenerateBogdanDiscussionMutation, GenerateBogdanDiscussionMutationVariables>;

/**
 * __useGenerateBogdanDiscussionMutation__
 *
 * To run a mutation, you first call `useGenerateBogdanDiscussionMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useGenerateBogdanDiscussionMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [generateBogdanDiscussionMutation, { data, loading, error }] = useGenerateBogdanDiscussionMutation({
 *   variables: {
 *   },
 * });
 */
export function useGenerateBogdanDiscussionMutation(baseOptions?: Apollo.MutationHookOptions<GenerateBogdanDiscussionMutation, GenerateBogdanDiscussionMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<GenerateBogdanDiscussionMutation, GenerateBogdanDiscussionMutationVariables>(GenerateBogdanDiscussionDocument, options);
      }
export type GenerateBogdanDiscussionMutationHookResult = ReturnType<typeof useGenerateBogdanDiscussionMutation>;
export type GenerateBogdanDiscussionMutationResult = Apollo.MutationResult<GenerateBogdanDiscussionMutation>;
export type GenerateBogdanDiscussionMutationOptions = Apollo.BaseMutationOptions<GenerateBogdanDiscussionMutation, GenerateBogdanDiscussionMutationVariables>;
export const GenerateDeepAnalysisDocument = gql`
    mutation GenerateDeepAnalysis($subjectType: DeepAnalysisSubjectType!, $subjectId: Int!, $triggerType: DeepAnalysisTriggerType, $triggerId: Int) {
  generateDeepAnalysis(
    subjectType: $subjectType
    subjectId: $subjectId
    triggerType: $triggerType
    triggerId: $triggerId
  ) {
    success
    message
    jobId
  }
}
    `;
export type GenerateDeepAnalysisMutationFn = Apollo.MutationFunction<GenerateDeepAnalysisMutation, GenerateDeepAnalysisMutationVariables>;

/**
 * __useGenerateDeepAnalysisMutation__
 *
 * To run a mutation, you first call `useGenerateDeepAnalysisMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useGenerateDeepAnalysisMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [generateDeepAnalysisMutation, { data, loading, error }] = useGenerateDeepAnalysisMutation({
 *   variables: {
 *      subjectType: // value for 'subjectType'
 *      subjectId: // value for 'subjectId'
 *      triggerType: // value for 'triggerType'
 *      triggerId: // value for 'triggerId'
 *   },
 * });
 */
export function useGenerateDeepAnalysisMutation(baseOptions?: Apollo.MutationHookOptions<GenerateDeepAnalysisMutation, GenerateDeepAnalysisMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<GenerateDeepAnalysisMutation, GenerateDeepAnalysisMutationVariables>(GenerateDeepAnalysisDocument, options);
      }
export type GenerateDeepAnalysisMutationHookResult = ReturnType<typeof useGenerateDeepAnalysisMutation>;
export type GenerateDeepAnalysisMutationResult = Apollo.MutationResult<GenerateDeepAnalysisMutation>;
export type GenerateDeepAnalysisMutationOptions = Apollo.BaseMutationOptions<GenerateDeepAnalysisMutation, GenerateDeepAnalysisMutationVariables>;
export const GenerateDeepIssueAnalysisDocument = gql`
    mutation GenerateDeepIssueAnalysis($familyMemberId: Int!, $triggerIssueId: Int) {
  generateDeepIssueAnalysis(
    familyMemberId: $familyMemberId
    triggerIssueId: $triggerIssueId
  ) {
    success
    message
    jobId
  }
}
    `;
export type GenerateDeepIssueAnalysisMutationFn = Apollo.MutationFunction<GenerateDeepIssueAnalysisMutation, GenerateDeepIssueAnalysisMutationVariables>;

/**
 * __useGenerateDeepIssueAnalysisMutation__
 *
 * To run a mutation, you first call `useGenerateDeepIssueAnalysisMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useGenerateDeepIssueAnalysisMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [generateDeepIssueAnalysisMutation, { data, loading, error }] = useGenerateDeepIssueAnalysisMutation({
 *   variables: {
 *      familyMemberId: // value for 'familyMemberId'
 *      triggerIssueId: // value for 'triggerIssueId'
 *   },
 * });
 */
export function useGenerateDeepIssueAnalysisMutation(baseOptions?: Apollo.MutationHookOptions<GenerateDeepIssueAnalysisMutation, GenerateDeepIssueAnalysisMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<GenerateDeepIssueAnalysisMutation, GenerateDeepIssueAnalysisMutationVariables>(GenerateDeepIssueAnalysisDocument, options);
      }
export type GenerateDeepIssueAnalysisMutationHookResult = ReturnType<typeof useGenerateDeepIssueAnalysisMutation>;
export type GenerateDeepIssueAnalysisMutationResult = Apollo.MutationResult<GenerateDeepIssueAnalysisMutation>;
export type GenerateDeepIssueAnalysisMutationOptions = Apollo.BaseMutationOptions<GenerateDeepIssueAnalysisMutation, GenerateDeepIssueAnalysisMutationVariables>;
export const GenerateDiscussionGuideDocument = gql`
    mutation GenerateDiscussionGuide($journalEntryId: Int!) {
  generateDiscussionGuide(journalEntryId: $journalEntryId) {
    success
    message
    jobId
  }
}
    `;
export type GenerateDiscussionGuideMutationFn = Apollo.MutationFunction<GenerateDiscussionGuideMutation, GenerateDiscussionGuideMutationVariables>;

/**
 * __useGenerateDiscussionGuideMutation__
 *
 * To run a mutation, you first call `useGenerateDiscussionGuideMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useGenerateDiscussionGuideMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [generateDiscussionGuideMutation, { data, loading, error }] = useGenerateDiscussionGuideMutation({
 *   variables: {
 *      journalEntryId: // value for 'journalEntryId'
 *   },
 * });
 */
export function useGenerateDiscussionGuideMutation(baseOptions?: Apollo.MutationHookOptions<GenerateDiscussionGuideMutation, GenerateDiscussionGuideMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<GenerateDiscussionGuideMutation, GenerateDiscussionGuideMutationVariables>(GenerateDiscussionGuideDocument, options);
      }
export type GenerateDiscussionGuideMutationHookResult = ReturnType<typeof useGenerateDiscussionGuideMutation>;
export type GenerateDiscussionGuideMutationResult = Apollo.MutationResult<GenerateDiscussionGuideMutation>;
export type GenerateDiscussionGuideMutationOptions = Apollo.BaseMutationOptions<GenerateDiscussionGuideMutation, GenerateDiscussionGuideMutationVariables>;
export const GenerateGameDocument = gql`
    mutation GenerateGame($input: GenerateGameInput!) {
  generateGame(input: $input) {
    id
    type
    title
    description
    content
    language
    estimatedMinutes
    source
    goalId
    issueId
    familyMemberId
    createdAt
  }
}
    `;
export type GenerateGameMutationFn = Apollo.MutationFunction<GenerateGameMutation, GenerateGameMutationVariables>;

/**
 * __useGenerateGameMutation__
 *
 * To run a mutation, you first call `useGenerateGameMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useGenerateGameMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [generateGameMutation, { data, loading, error }] = useGenerateGameMutation({
 *   variables: {
 *      input: // value for 'input'
 *   },
 * });
 */
export function useGenerateGameMutation(baseOptions?: Apollo.MutationHookOptions<GenerateGameMutation, GenerateGameMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<GenerateGameMutation, GenerateGameMutationVariables>(GenerateGameDocument, options);
      }
export type GenerateGameMutationHookResult = ReturnType<typeof useGenerateGameMutation>;
export type GenerateGameMutationResult = Apollo.MutationResult<GenerateGameMutation>;
export type GenerateGameMutationOptions = Apollo.BaseMutationOptions<GenerateGameMutation, GenerateGameMutationVariables>;
export const GenerateHabitsForFamilyMemberDocument = gql`
    mutation GenerateHabitsForFamilyMember($familyMemberId: Int!, $count: Int) {
  generateHabitsForFamilyMember(familyMemberId: $familyMemberId, count: $count) {
    success
    message
    count
    habits {
      id
      title
      description
      frequency
      targetCount
      status
      familyMemberId
      createdAt
    }
  }
}
    `;
export type GenerateHabitsForFamilyMemberMutationFn = Apollo.MutationFunction<GenerateHabitsForFamilyMemberMutation, GenerateHabitsForFamilyMemberMutationVariables>;

/**
 * __useGenerateHabitsForFamilyMemberMutation__
 *
 * To run a mutation, you first call `useGenerateHabitsForFamilyMemberMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useGenerateHabitsForFamilyMemberMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [generateHabitsForFamilyMemberMutation, { data, loading, error }] = useGenerateHabitsForFamilyMemberMutation({
 *   variables: {
 *      familyMemberId: // value for 'familyMemberId'
 *      count: // value for 'count'
 *   },
 * });
 */
export function useGenerateHabitsForFamilyMemberMutation(baseOptions?: Apollo.MutationHookOptions<GenerateHabitsForFamilyMemberMutation, GenerateHabitsForFamilyMemberMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<GenerateHabitsForFamilyMemberMutation, GenerateHabitsForFamilyMemberMutationVariables>(GenerateHabitsForFamilyMemberDocument, options);
      }
export type GenerateHabitsForFamilyMemberMutationHookResult = ReturnType<typeof useGenerateHabitsForFamilyMemberMutation>;
export type GenerateHabitsForFamilyMemberMutationResult = Apollo.MutationResult<GenerateHabitsForFamilyMemberMutation>;
export type GenerateHabitsForFamilyMemberMutationOptions = Apollo.BaseMutationOptions<GenerateHabitsForFamilyMemberMutation, GenerateHabitsForFamilyMemberMutationVariables>;
export const GenerateHabitsFromIssueDocument = gql`
    mutation GenerateHabitsFromIssue($issueId: Int!, $count: Int) {
  generateHabitsFromIssue(issueId: $issueId, count: $count) {
    success
    message
    count
    habits {
      id
      title
      description
      frequency
      targetCount
      status
      familyMemberId
      createdAt
    }
  }
}
    `;
export type GenerateHabitsFromIssueMutationFn = Apollo.MutationFunction<GenerateHabitsFromIssueMutation, GenerateHabitsFromIssueMutationVariables>;

/**
 * __useGenerateHabitsFromIssueMutation__
 *
 * To run a mutation, you first call `useGenerateHabitsFromIssueMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useGenerateHabitsFromIssueMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [generateHabitsFromIssueMutation, { data, loading, error }] = useGenerateHabitsFromIssueMutation({
 *   variables: {
 *      issueId: // value for 'issueId'
 *      count: // value for 'count'
 *   },
 * });
 */
export function useGenerateHabitsFromIssueMutation(baseOptions?: Apollo.MutationHookOptions<GenerateHabitsFromIssueMutation, GenerateHabitsFromIssueMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<GenerateHabitsFromIssueMutation, GenerateHabitsFromIssueMutationVariables>(GenerateHabitsFromIssueDocument, options);
      }
export type GenerateHabitsFromIssueMutationHookResult = ReturnType<typeof useGenerateHabitsFromIssueMutation>;
export type GenerateHabitsFromIssueMutationResult = Apollo.MutationResult<GenerateHabitsFromIssueMutation>;
export type GenerateHabitsFromIssueMutationOptions = Apollo.BaseMutationOptions<GenerateHabitsFromIssueMutation, GenerateHabitsFromIssueMutationVariables>;
export const GenerateJournalAnalysisDocument = gql`
    mutation GenerateJournalAnalysis($journalEntryId: Int!) {
  generateJournalAnalysis(journalEntryId: $journalEntryId) {
    success
    message
    jobId
  }
}
    `;
export type GenerateJournalAnalysisMutationFn = Apollo.MutationFunction<GenerateJournalAnalysisMutation, GenerateJournalAnalysisMutationVariables>;

/**
 * __useGenerateJournalAnalysisMutation__
 *
 * To run a mutation, you first call `useGenerateJournalAnalysisMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useGenerateJournalAnalysisMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [generateJournalAnalysisMutation, { data, loading, error }] = useGenerateJournalAnalysisMutation({
 *   variables: {
 *      journalEntryId: // value for 'journalEntryId'
 *   },
 * });
 */
export function useGenerateJournalAnalysisMutation(baseOptions?: Apollo.MutationHookOptions<GenerateJournalAnalysisMutation, GenerateJournalAnalysisMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<GenerateJournalAnalysisMutation, GenerateJournalAnalysisMutationVariables>(GenerateJournalAnalysisDocument, options);
      }
export type GenerateJournalAnalysisMutationHookResult = ReturnType<typeof useGenerateJournalAnalysisMutation>;
export type GenerateJournalAnalysisMutationResult = Apollo.MutationResult<GenerateJournalAnalysisMutation>;
export type GenerateJournalAnalysisMutationOptions = Apollo.BaseMutationOptions<GenerateJournalAnalysisMutation, GenerateJournalAnalysisMutationVariables>;
export const GenerateJournalRecommendedBooksDocument = gql`
    mutation GenerateJournalRecommendedBooks($journalEntryId: Int!) {
  generateRecommendedBooks(journalEntryId: $journalEntryId) {
    success
    message
    jobId
    books {
      id
      goalId
      journalEntryId
      title
      authors
      year
      isbn
      description
      whyRecommended
      category
      amazonUrl
      generatedAt
    }
  }
}
    `;
export type GenerateJournalRecommendedBooksMutationFn = Apollo.MutationFunction<GenerateJournalRecommendedBooksMutation, GenerateJournalRecommendedBooksMutationVariables>;

/**
 * __useGenerateJournalRecommendedBooksMutation__
 *
 * To run a mutation, you first call `useGenerateJournalRecommendedBooksMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useGenerateJournalRecommendedBooksMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [generateJournalRecommendedBooksMutation, { data, loading, error }] = useGenerateJournalRecommendedBooksMutation({
 *   variables: {
 *      journalEntryId: // value for 'journalEntryId'
 *   },
 * });
 */
export function useGenerateJournalRecommendedBooksMutation(baseOptions?: Apollo.MutationHookOptions<GenerateJournalRecommendedBooksMutation, GenerateJournalRecommendedBooksMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<GenerateJournalRecommendedBooksMutation, GenerateJournalRecommendedBooksMutationVariables>(GenerateJournalRecommendedBooksDocument, options);
      }
export type GenerateJournalRecommendedBooksMutationHookResult = ReturnType<typeof useGenerateJournalRecommendedBooksMutation>;
export type GenerateJournalRecommendedBooksMutationResult = Apollo.MutationResult<GenerateJournalRecommendedBooksMutation>;
export type GenerateJournalRecommendedBooksMutationOptions = Apollo.BaseMutationOptions<GenerateJournalRecommendedBooksMutation, GenerateJournalRecommendedBooksMutationVariables>;
export const GenerateLongFormTextDocument = gql`
    mutation GenerateLongFormText($goalId: Int, $issueId: Int, $feedbackId: Int, $journalEntryId: Int, $familyMemberId: Int, $userContext: String, $language: String, $minutes: Int) {
  generateLongFormText(
    goalId: $goalId
    issueId: $issueId
    feedbackId: $feedbackId
    journalEntryId: $journalEntryId
    familyMemberId: $familyMemberId
    userContext: $userContext
    language: $language
    minutes: $minutes
  ) {
    success
    message
    jobId
    storyId
    text
    audioUrl
    manifestUrl
    segmentUrls
  }
}
    `;
export type GenerateLongFormTextMutationFn = Apollo.MutationFunction<GenerateLongFormTextMutation, GenerateLongFormTextMutationVariables>;

/**
 * __useGenerateLongFormTextMutation__
 *
 * To run a mutation, you first call `useGenerateLongFormTextMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useGenerateLongFormTextMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [generateLongFormTextMutation, { data, loading, error }] = useGenerateLongFormTextMutation({
 *   variables: {
 *      goalId: // value for 'goalId'
 *      issueId: // value for 'issueId'
 *      feedbackId: // value for 'feedbackId'
 *      journalEntryId: // value for 'journalEntryId'
 *      familyMemberId: // value for 'familyMemberId'
 *      userContext: // value for 'userContext'
 *      language: // value for 'language'
 *      minutes: // value for 'minutes'
 *   },
 * });
 */
export function useGenerateLongFormTextMutation(baseOptions?: Apollo.MutationHookOptions<GenerateLongFormTextMutation, GenerateLongFormTextMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<GenerateLongFormTextMutation, GenerateLongFormTextMutationVariables>(GenerateLongFormTextDocument, options);
      }
export type GenerateLongFormTextMutationHookResult = ReturnType<typeof useGenerateLongFormTextMutation>;
export type GenerateLongFormTextMutationResult = Apollo.MutationResult<GenerateLongFormTextMutation>;
export type GenerateLongFormTextMutationOptions = Apollo.BaseMutationOptions<GenerateLongFormTextMutation, GenerateLongFormTextMutationVariables>;
export const GenerateLongFormTextRomanianDocument = gql`
    mutation GenerateLongFormTextRomanian($goalId: Int!) {
  generateLongFormText(goalId: $goalId, language: "Romanian") {
    success
    message
    text
    audioUrl
    manifestUrl
    segmentUrls
  }
}
    `;
export type GenerateLongFormTextRomanianMutationFn = Apollo.MutationFunction<GenerateLongFormTextRomanianMutation, GenerateLongFormTextRomanianMutationVariables>;

/**
 * __useGenerateLongFormTextRomanianMutation__
 *
 * To run a mutation, you first call `useGenerateLongFormTextRomanianMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useGenerateLongFormTextRomanianMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [generateLongFormTextRomanianMutation, { data, loading, error }] = useGenerateLongFormTextRomanianMutation({
 *   variables: {
 *      goalId: // value for 'goalId'
 *   },
 * });
 */
export function useGenerateLongFormTextRomanianMutation(baseOptions?: Apollo.MutationHookOptions<GenerateLongFormTextRomanianMutation, GenerateLongFormTextRomanianMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<GenerateLongFormTextRomanianMutation, GenerateLongFormTextRomanianMutationVariables>(GenerateLongFormTextRomanianDocument, options);
      }
export type GenerateLongFormTextRomanianMutationHookResult = ReturnType<typeof useGenerateLongFormTextRomanianMutation>;
export type GenerateLongFormTextRomanianMutationResult = Apollo.MutationResult<GenerateLongFormTextRomanianMutation>;
export type GenerateLongFormTextRomanianMutationOptions = Apollo.BaseMutationOptions<GenerateLongFormTextRomanianMutation, GenerateLongFormTextRomanianMutationVariables>;
export const GenerateOpenAiAudioDocument = gql`
    mutation GenerateOpenAIAudio($input: GenerateOpenAIAudioInput!) {
  generateOpenAIAudio(input: $input) {
    success
    message
    jobId
    audioBuffer
    audioUrl
    sizeBytes
    duration
  }
}
    `;
export type GenerateOpenAiAudioMutationFn = Apollo.MutationFunction<GenerateOpenAiAudioMutation, GenerateOpenAiAudioMutationVariables>;

/**
 * __useGenerateOpenAiAudioMutation__
 *
 * To run a mutation, you first call `useGenerateOpenAiAudioMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useGenerateOpenAiAudioMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [generateOpenAiAudioMutation, { data, loading, error }] = useGenerateOpenAiAudioMutation({
 *   variables: {
 *      input: // value for 'input'
 *   },
 * });
 */
export function useGenerateOpenAiAudioMutation(baseOptions?: Apollo.MutationHookOptions<GenerateOpenAiAudioMutation, GenerateOpenAiAudioMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<GenerateOpenAiAudioMutation, GenerateOpenAiAudioMutationVariables>(GenerateOpenAiAudioDocument, options);
      }
export type GenerateOpenAiAudioMutationHookResult = ReturnType<typeof useGenerateOpenAiAudioMutation>;
export type GenerateOpenAiAudioMutationResult = Apollo.MutationResult<GenerateOpenAiAudioMutation>;
export type GenerateOpenAiAudioMutationOptions = Apollo.BaseMutationOptions<GenerateOpenAiAudioMutation, GenerateOpenAiAudioMutationVariables>;
export const GenerateParentAdviceDocument = gql`
    mutation GenerateParentAdvice($goalId: Int!, $language: String) {
  generateParentAdvice(goalId: $goalId, language: $language) {
    success
    message
    parentAdvice
  }
}
    `;
export type GenerateParentAdviceMutationFn = Apollo.MutationFunction<GenerateParentAdviceMutation, GenerateParentAdviceMutationVariables>;

/**
 * __useGenerateParentAdviceMutation__
 *
 * To run a mutation, you first call `useGenerateParentAdviceMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useGenerateParentAdviceMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [generateParentAdviceMutation, { data, loading, error }] = useGenerateParentAdviceMutation({
 *   variables: {
 *      goalId: // value for 'goalId'
 *      language: // value for 'language'
 *   },
 * });
 */
export function useGenerateParentAdviceMutation(baseOptions?: Apollo.MutationHookOptions<GenerateParentAdviceMutation, GenerateParentAdviceMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<GenerateParentAdviceMutation, GenerateParentAdviceMutationVariables>(GenerateParentAdviceDocument, options);
      }
export type GenerateParentAdviceMutationHookResult = ReturnType<typeof useGenerateParentAdviceMutation>;
export type GenerateParentAdviceMutationResult = Apollo.MutationResult<GenerateParentAdviceMutation>;
export type GenerateParentAdviceMutationOptions = Apollo.BaseMutationOptions<GenerateParentAdviceMutation, GenerateParentAdviceMutationVariables>;
export const GenerateRecommendedBooksDocument = gql`
    mutation GenerateRecommendedBooks($goalId: Int!) {
  generateRecommendedBooks(goalId: $goalId) {
    success
    message
    jobId
    books {
      id
      goalId
      title
      authors
      year
      isbn
      description
      whyRecommended
      category
      amazonUrl
      generatedAt
    }
  }
}
    `;
export type GenerateRecommendedBooksMutationFn = Apollo.MutationFunction<GenerateRecommendedBooksMutation, GenerateRecommendedBooksMutationVariables>;

/**
 * __useGenerateRecommendedBooksMutation__
 *
 * To run a mutation, you first call `useGenerateRecommendedBooksMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useGenerateRecommendedBooksMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [generateRecommendedBooksMutation, { data, loading, error }] = useGenerateRecommendedBooksMutation({
 *   variables: {
 *      goalId: // value for 'goalId'
 *   },
 * });
 */
export function useGenerateRecommendedBooksMutation(baseOptions?: Apollo.MutationHookOptions<GenerateRecommendedBooksMutation, GenerateRecommendedBooksMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<GenerateRecommendedBooksMutation, GenerateRecommendedBooksMutationVariables>(GenerateRecommendedBooksDocument, options);
      }
export type GenerateRecommendedBooksMutationHookResult = ReturnType<typeof useGenerateRecommendedBooksMutation>;
export type GenerateRecommendedBooksMutationResult = Apollo.MutationResult<GenerateRecommendedBooksMutation>;
export type GenerateRecommendedBooksMutationOptions = Apollo.BaseMutationOptions<GenerateRecommendedBooksMutation, GenerateRecommendedBooksMutationVariables>;
export const GenerateResearchDocument = gql`
    mutation GenerateResearch($goalId: Int, $issueId: Int, $feedbackId: Int, $journalEntryId: Int) {
  generateResearch(
    goalId: $goalId
    issueId: $issueId
    feedbackId: $feedbackId
    journalEntryId: $journalEntryId
  ) {
    success
    message
    jobId
    count
  }
}
    `;
export type GenerateResearchMutationFn = Apollo.MutationFunction<GenerateResearchMutation, GenerateResearchMutationVariables>;

/**
 * __useGenerateResearchMutation__
 *
 * To run a mutation, you first call `useGenerateResearchMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useGenerateResearchMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [generateResearchMutation, { data, loading, error }] = useGenerateResearchMutation({
 *   variables: {
 *      goalId: // value for 'goalId'
 *      issueId: // value for 'issueId'
 *      feedbackId: // value for 'feedbackId'
 *      journalEntryId: // value for 'journalEntryId'
 *   },
 * });
 */
export function useGenerateResearchMutation(baseOptions?: Apollo.MutationHookOptions<GenerateResearchMutation, GenerateResearchMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<GenerateResearchMutation, GenerateResearchMutationVariables>(GenerateResearchDocument, options);
      }
export type GenerateResearchMutationHookResult = ReturnType<typeof useGenerateResearchMutation>;
export type GenerateResearchMutationResult = Apollo.MutationResult<GenerateResearchMutation>;
export type GenerateResearchMutationOptions = Apollo.BaseMutationOptions<GenerateResearchMutation, GenerateResearchMutationVariables>;
export const GenerateRoutineAnalysisDocument = gql`
    mutation GenerateRoutineAnalysis($familyMemberId: Int!) {
  generateRoutineAnalysis(familyMemberId: $familyMemberId) {
    success
    message
    jobId
  }
}
    `;
export type GenerateRoutineAnalysisMutationFn = Apollo.MutationFunction<GenerateRoutineAnalysisMutation, GenerateRoutineAnalysisMutationVariables>;

/**
 * __useGenerateRoutineAnalysisMutation__
 *
 * To run a mutation, you first call `useGenerateRoutineAnalysisMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useGenerateRoutineAnalysisMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [generateRoutineAnalysisMutation, { data, loading, error }] = useGenerateRoutineAnalysisMutation({
 *   variables: {
 *      familyMemberId: // value for 'familyMemberId'
 *   },
 * });
 */
export function useGenerateRoutineAnalysisMutation(baseOptions?: Apollo.MutationHookOptions<GenerateRoutineAnalysisMutation, GenerateRoutineAnalysisMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<GenerateRoutineAnalysisMutation, GenerateRoutineAnalysisMutationVariables>(GenerateRoutineAnalysisDocument, options);
      }
export type GenerateRoutineAnalysisMutationHookResult = ReturnType<typeof useGenerateRoutineAnalysisMutation>;
export type GenerateRoutineAnalysisMutationResult = Apollo.MutationResult<GenerateRoutineAnalysisMutation>;
export type GenerateRoutineAnalysisMutationOptions = Apollo.BaseMutationOptions<GenerateRoutineAnalysisMutation, GenerateRoutineAnalysisMutationVariables>;
export const GenerateTherapeuticQuestionsDocument = gql`
    mutation GenerateTherapeuticQuestions($goalId: Int, $issueId: Int, $journalEntryId: Int) {
  generateTherapeuticQuestions(
    goalId: $goalId
    issueId: $issueId
    journalEntryId: $journalEntryId
  ) {
    success
    message
    jobId
    questions {
      id
      goalId
      issueId
      journalEntryId
      question
      researchId
      researchTitle
      rationale
      generatedAt
      createdAt
      updatedAt
    }
  }
}
    `;
export type GenerateTherapeuticQuestionsMutationFn = Apollo.MutationFunction<GenerateTherapeuticQuestionsMutation, GenerateTherapeuticQuestionsMutationVariables>;

/**
 * __useGenerateTherapeuticQuestionsMutation__
 *
 * To run a mutation, you first call `useGenerateTherapeuticQuestionsMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useGenerateTherapeuticQuestionsMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [generateTherapeuticQuestionsMutation, { data, loading, error }] = useGenerateTherapeuticQuestionsMutation({
 *   variables: {
 *      goalId: // value for 'goalId'
 *      issueId: // value for 'issueId'
 *      journalEntryId: // value for 'journalEntryId'
 *   },
 * });
 */
export function useGenerateTherapeuticQuestionsMutation(baseOptions?: Apollo.MutationHookOptions<GenerateTherapeuticQuestionsMutation, GenerateTherapeuticQuestionsMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<GenerateTherapeuticQuestionsMutation, GenerateTherapeuticQuestionsMutationVariables>(GenerateTherapeuticQuestionsDocument, options);
      }
export type GenerateTherapeuticQuestionsMutationHookResult = ReturnType<typeof useGenerateTherapeuticQuestionsMutation>;
export type GenerateTherapeuticQuestionsMutationResult = Apollo.MutationResult<GenerateTherapeuticQuestionsMutation>;
export type GenerateTherapeuticQuestionsMutationOptions = Apollo.BaseMutationOptions<GenerateTherapeuticQuestionsMutation, GenerateTherapeuticQuestionsMutationVariables>;
export const GetAffirmationsDocument = gql`
    query GetAffirmations($familyMemberId: Int!) {
  affirmations(familyMemberId: $familyMemberId) {
    id
    familyMemberId
    text
    category
    isActive
    createdAt
    updatedAt
  }
}
    `;

/**
 * __useGetAffirmationsQuery__
 *
 * To run a query within a React component, call `useGetAffirmationsQuery` and pass it any options that fit your needs.
 * When your component renders, `useGetAffirmationsQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useGetAffirmationsQuery({
 *   variables: {
 *      familyMemberId: // value for 'familyMemberId'
 *   },
 * });
 */
export function useGetAffirmationsQuery(baseOptions: Apollo.QueryHookOptions<GetAffirmationsQuery, GetAffirmationsQueryVariables> & ({ variables: GetAffirmationsQueryVariables; skip?: boolean; } | { skip: boolean; }) ) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<GetAffirmationsQuery, GetAffirmationsQueryVariables>(GetAffirmationsDocument, options);
      }
export function useGetAffirmationsLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<GetAffirmationsQuery, GetAffirmationsQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<GetAffirmationsQuery, GetAffirmationsQueryVariables>(GetAffirmationsDocument, options);
        }
// @ts-ignore
export function useGetAffirmationsSuspenseQuery(baseOptions?: Apollo.SuspenseQueryHookOptions<GetAffirmationsQuery, GetAffirmationsQueryVariables>): Apollo.UseSuspenseQueryResult<GetAffirmationsQuery, GetAffirmationsQueryVariables>;
export function useGetAffirmationsSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<GetAffirmationsQuery, GetAffirmationsQueryVariables>): Apollo.UseSuspenseQueryResult<GetAffirmationsQuery | undefined, GetAffirmationsQueryVariables>;
export function useGetAffirmationsSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<GetAffirmationsQuery, GetAffirmationsQueryVariables>) {
          const options = baseOptions === Apollo.skipToken ? baseOptions : {...defaultOptions, ...baseOptions}
          return Apollo.useSuspenseQuery<GetAffirmationsQuery, GetAffirmationsQueryVariables>(GetAffirmationsDocument, options);
        }
export type GetAffirmationsQueryHookResult = ReturnType<typeof useGetAffirmationsQuery>;
export type GetAffirmationsLazyQueryHookResult = ReturnType<typeof useGetAffirmationsLazyQuery>;
export type GetAffirmationsSuspenseQueryHookResult = ReturnType<typeof useGetAffirmationsSuspenseQuery>;
export type GetAffirmationsQueryResult = Apollo.QueryResult<GetAffirmationsQuery, GetAffirmationsQueryVariables>;
export const GetAllIssuesDocument = gql`
    query GetAllIssues {
  allIssues {
    id
    familyMemberId
    title
    description
    category
    severity
    createdAt
    updatedAt
    familyMember {
      id
      firstName
      name
    }
  }
}
    `;

/**
 * __useGetAllIssuesQuery__
 *
 * To run a query within a React component, call `useGetAllIssuesQuery` and pass it any options that fit your needs.
 * When your component renders, `useGetAllIssuesQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useGetAllIssuesQuery({
 *   variables: {
 *   },
 * });
 */
export function useGetAllIssuesQuery(baseOptions?: Apollo.QueryHookOptions<GetAllIssuesQuery, GetAllIssuesQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<GetAllIssuesQuery, GetAllIssuesQueryVariables>(GetAllIssuesDocument, options);
      }
export function useGetAllIssuesLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<GetAllIssuesQuery, GetAllIssuesQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<GetAllIssuesQuery, GetAllIssuesQueryVariables>(GetAllIssuesDocument, options);
        }
// @ts-ignore
export function useGetAllIssuesSuspenseQuery(baseOptions?: Apollo.SuspenseQueryHookOptions<GetAllIssuesQuery, GetAllIssuesQueryVariables>): Apollo.UseSuspenseQueryResult<GetAllIssuesQuery, GetAllIssuesQueryVariables>;
export function useGetAllIssuesSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<GetAllIssuesQuery, GetAllIssuesQueryVariables>): Apollo.UseSuspenseQueryResult<GetAllIssuesQuery | undefined, GetAllIssuesQueryVariables>;
export function useGetAllIssuesSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<GetAllIssuesQuery, GetAllIssuesQueryVariables>) {
          const options = baseOptions === Apollo.skipToken ? baseOptions : {...defaultOptions, ...baseOptions}
          return Apollo.useSuspenseQuery<GetAllIssuesQuery, GetAllIssuesQueryVariables>(GetAllIssuesDocument, options);
        }
export type GetAllIssuesQueryHookResult = ReturnType<typeof useGetAllIssuesQuery>;
export type GetAllIssuesLazyQueryHookResult = ReturnType<typeof useGetAllIssuesLazyQuery>;
export type GetAllIssuesSuspenseQueryHookResult = ReturnType<typeof useGetAllIssuesSuspenseQuery>;
export type GetAllIssuesQueryResult = Apollo.QueryResult<GetAllIssuesQuery, GetAllIssuesQueryVariables>;
export const GetAllNotesDocument = gql`
    query GetAllNotes {
  allNotes {
    id
    entityId
    entityType
    createdBy
    noteType
    slug
    title
    content
    createdBy
    tags
    goal {
      id
      title
      description
      status
    }
    createdAt
    updatedAt
  }
}
    `;

/**
 * __useGetAllNotesQuery__
 *
 * To run a query within a React component, call `useGetAllNotesQuery` and pass it any options that fit your needs.
 * When your component renders, `useGetAllNotesQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useGetAllNotesQuery({
 *   variables: {
 *   },
 * });
 */
export function useGetAllNotesQuery(baseOptions?: Apollo.QueryHookOptions<GetAllNotesQuery, GetAllNotesQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<GetAllNotesQuery, GetAllNotesQueryVariables>(GetAllNotesDocument, options);
      }
export function useGetAllNotesLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<GetAllNotesQuery, GetAllNotesQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<GetAllNotesQuery, GetAllNotesQueryVariables>(GetAllNotesDocument, options);
        }
// @ts-ignore
export function useGetAllNotesSuspenseQuery(baseOptions?: Apollo.SuspenseQueryHookOptions<GetAllNotesQuery, GetAllNotesQueryVariables>): Apollo.UseSuspenseQueryResult<GetAllNotesQuery, GetAllNotesQueryVariables>;
export function useGetAllNotesSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<GetAllNotesQuery, GetAllNotesQueryVariables>): Apollo.UseSuspenseQueryResult<GetAllNotesQuery | undefined, GetAllNotesQueryVariables>;
export function useGetAllNotesSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<GetAllNotesQuery, GetAllNotesQueryVariables>) {
          const options = baseOptions === Apollo.skipToken ? baseOptions : {...defaultOptions, ...baseOptions}
          return Apollo.useSuspenseQuery<GetAllNotesQuery, GetAllNotesQueryVariables>(GetAllNotesDocument, options);
        }
export type GetAllNotesQueryHookResult = ReturnType<typeof useGetAllNotesQuery>;
export type GetAllNotesLazyQueryHookResult = ReturnType<typeof useGetAllNotesLazyQuery>;
export type GetAllNotesSuspenseQueryHookResult = ReturnType<typeof useGetAllNotesSuspenseQuery>;
export type GetAllNotesQueryResult = Apollo.QueryResult<GetAllNotesQuery, GetAllNotesQueryVariables>;
export const GetAllRecommendedBooksDocument = gql`
    query GetAllRecommendedBooks($category: String) {
  allRecommendedBooks(category: $category) {
    id
    goalId
    title
    authors
    year
    isbn
    description
    whyRecommended
    category
    amazonUrl
    generatedAt
    createdAt
    updatedAt
  }
}
    `;

/**
 * __useGetAllRecommendedBooksQuery__
 *
 * To run a query within a React component, call `useGetAllRecommendedBooksQuery` and pass it any options that fit your needs.
 * When your component renders, `useGetAllRecommendedBooksQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useGetAllRecommendedBooksQuery({
 *   variables: {
 *      category: // value for 'category'
 *   },
 * });
 */
export function useGetAllRecommendedBooksQuery(baseOptions?: Apollo.QueryHookOptions<GetAllRecommendedBooksQuery, GetAllRecommendedBooksQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<GetAllRecommendedBooksQuery, GetAllRecommendedBooksQueryVariables>(GetAllRecommendedBooksDocument, options);
      }
export function useGetAllRecommendedBooksLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<GetAllRecommendedBooksQuery, GetAllRecommendedBooksQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<GetAllRecommendedBooksQuery, GetAllRecommendedBooksQueryVariables>(GetAllRecommendedBooksDocument, options);
        }
// @ts-ignore
export function useGetAllRecommendedBooksSuspenseQuery(baseOptions?: Apollo.SuspenseQueryHookOptions<GetAllRecommendedBooksQuery, GetAllRecommendedBooksQueryVariables>): Apollo.UseSuspenseQueryResult<GetAllRecommendedBooksQuery, GetAllRecommendedBooksQueryVariables>;
export function useGetAllRecommendedBooksSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<GetAllRecommendedBooksQuery, GetAllRecommendedBooksQueryVariables>): Apollo.UseSuspenseQueryResult<GetAllRecommendedBooksQuery | undefined, GetAllRecommendedBooksQueryVariables>;
export function useGetAllRecommendedBooksSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<GetAllRecommendedBooksQuery, GetAllRecommendedBooksQueryVariables>) {
          const options = baseOptions === Apollo.skipToken ? baseOptions : {...defaultOptions, ...baseOptions}
          return Apollo.useSuspenseQuery<GetAllRecommendedBooksQuery, GetAllRecommendedBooksQueryVariables>(GetAllRecommendedBooksDocument, options);
        }
export type GetAllRecommendedBooksQueryHookResult = ReturnType<typeof useGetAllRecommendedBooksQuery>;
export type GetAllRecommendedBooksLazyQueryHookResult = ReturnType<typeof useGetAllRecommendedBooksLazyQuery>;
export type GetAllRecommendedBooksSuspenseQueryHookResult = ReturnType<typeof useGetAllRecommendedBooksSuspenseQuery>;
export type GetAllRecommendedBooksQueryResult = Apollo.QueryResult<GetAllRecommendedBooksQuery, GetAllRecommendedBooksQueryVariables>;
export const GetAllStoriesDocument = gql`
    query GetAllStories {
  allStories {
    id
    goalId
    issueId
    feedbackId
    createdBy
    content
    language
    minutes
    audioKey
    audioUrl
    audioGeneratedAt
    createdAt
    updatedAt
    goal {
      id
      title
      slug
    }
  }
}
    `;

/**
 * __useGetAllStoriesQuery__
 *
 * To run a query within a React component, call `useGetAllStoriesQuery` and pass it any options that fit your needs.
 * When your component renders, `useGetAllStoriesQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useGetAllStoriesQuery({
 *   variables: {
 *   },
 * });
 */
export function useGetAllStoriesQuery(baseOptions?: Apollo.QueryHookOptions<GetAllStoriesQuery, GetAllStoriesQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<GetAllStoriesQuery, GetAllStoriesQueryVariables>(GetAllStoriesDocument, options);
      }
export function useGetAllStoriesLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<GetAllStoriesQuery, GetAllStoriesQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<GetAllStoriesQuery, GetAllStoriesQueryVariables>(GetAllStoriesDocument, options);
        }
// @ts-ignore
export function useGetAllStoriesSuspenseQuery(baseOptions?: Apollo.SuspenseQueryHookOptions<GetAllStoriesQuery, GetAllStoriesQueryVariables>): Apollo.UseSuspenseQueryResult<GetAllStoriesQuery, GetAllStoriesQueryVariables>;
export function useGetAllStoriesSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<GetAllStoriesQuery, GetAllStoriesQueryVariables>): Apollo.UseSuspenseQueryResult<GetAllStoriesQuery | undefined, GetAllStoriesQueryVariables>;
export function useGetAllStoriesSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<GetAllStoriesQuery, GetAllStoriesQueryVariables>) {
          const options = baseOptions === Apollo.skipToken ? baseOptions : {...defaultOptions, ...baseOptions}
          return Apollo.useSuspenseQuery<GetAllStoriesQuery, GetAllStoriesQueryVariables>(GetAllStoriesDocument, options);
        }
export type GetAllStoriesQueryHookResult = ReturnType<typeof useGetAllStoriesQuery>;
export type GetAllStoriesLazyQueryHookResult = ReturnType<typeof useGetAllStoriesLazyQuery>;
export type GetAllStoriesSuspenseQueryHookResult = ReturnType<typeof useGetAllStoriesSuspenseQuery>;
export type GetAllStoriesQueryResult = Apollo.QueryResult<GetAllStoriesQuery, GetAllStoriesQueryVariables>;
export const GetAllTagsDocument = gql`
    query GetAllTags {
  allTags
}
    `;

/**
 * __useGetAllTagsQuery__
 *
 * To run a query within a React component, call `useGetAllTagsQuery` and pass it any options that fit your needs.
 * When your component renders, `useGetAllTagsQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useGetAllTagsQuery({
 *   variables: {
 *   },
 * });
 */
export function useGetAllTagsQuery(baseOptions?: Apollo.QueryHookOptions<GetAllTagsQuery, GetAllTagsQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<GetAllTagsQuery, GetAllTagsQueryVariables>(GetAllTagsDocument, options);
      }
export function useGetAllTagsLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<GetAllTagsQuery, GetAllTagsQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<GetAllTagsQuery, GetAllTagsQueryVariables>(GetAllTagsDocument, options);
        }
// @ts-ignore
export function useGetAllTagsSuspenseQuery(baseOptions?: Apollo.SuspenseQueryHookOptions<GetAllTagsQuery, GetAllTagsQueryVariables>): Apollo.UseSuspenseQueryResult<GetAllTagsQuery, GetAllTagsQueryVariables>;
export function useGetAllTagsSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<GetAllTagsQuery, GetAllTagsQueryVariables>): Apollo.UseSuspenseQueryResult<GetAllTagsQuery | undefined, GetAllTagsQueryVariables>;
export function useGetAllTagsSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<GetAllTagsQuery, GetAllTagsQueryVariables>) {
          const options = baseOptions === Apollo.skipToken ? baseOptions : {...defaultOptions, ...baseOptions}
          return Apollo.useSuspenseQuery<GetAllTagsQuery, GetAllTagsQueryVariables>(GetAllTagsDocument, options);
        }
export type GetAllTagsQueryHookResult = ReturnType<typeof useGetAllTagsQuery>;
export type GetAllTagsLazyQueryHookResult = ReturnType<typeof useGetAllTagsLazyQuery>;
export type GetAllTagsSuspenseQueryHookResult = ReturnType<typeof useGetAllTagsSuspenseQuery>;
export type GetAllTagsQueryResult = Apollo.QueryResult<GetAllTagsQuery, GetAllTagsQueryVariables>;
export const GetAudioFromR2Document = gql`
    query GetAudioFromR2($key: String!) {
  audioFromR2(key: $key) {
    success
    message
    audioUrl
    key
    metadata {
      voice
      model
      textLength
      chunks
      generatedBy
      instructions
    }
  }
}
    `;

/**
 * __useGetAudioFromR2Query__
 *
 * To run a query within a React component, call `useGetAudioFromR2Query` and pass it any options that fit your needs.
 * When your component renders, `useGetAudioFromR2Query` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useGetAudioFromR2Query({
 *   variables: {
 *      key: // value for 'key'
 *   },
 * });
 */
export function useGetAudioFromR2Query(baseOptions: Apollo.QueryHookOptions<GetAudioFromR2Query, GetAudioFromR2QueryVariables> & ({ variables: GetAudioFromR2QueryVariables; skip?: boolean; } | { skip: boolean; }) ) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<GetAudioFromR2Query, GetAudioFromR2QueryVariables>(GetAudioFromR2Document, options);
      }
export function useGetAudioFromR2LazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<GetAudioFromR2Query, GetAudioFromR2QueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<GetAudioFromR2Query, GetAudioFromR2QueryVariables>(GetAudioFromR2Document, options);
        }
// @ts-ignore
export function useGetAudioFromR2SuspenseQuery(baseOptions?: Apollo.SuspenseQueryHookOptions<GetAudioFromR2Query, GetAudioFromR2QueryVariables>): Apollo.UseSuspenseQueryResult<GetAudioFromR2Query, GetAudioFromR2QueryVariables>;
export function useGetAudioFromR2SuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<GetAudioFromR2Query, GetAudioFromR2QueryVariables>): Apollo.UseSuspenseQueryResult<GetAudioFromR2Query | undefined, GetAudioFromR2QueryVariables>;
export function useGetAudioFromR2SuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<GetAudioFromR2Query, GetAudioFromR2QueryVariables>) {
          const options = baseOptions === Apollo.skipToken ? baseOptions : {...defaultOptions, ...baseOptions}
          return Apollo.useSuspenseQuery<GetAudioFromR2Query, GetAudioFromR2QueryVariables>(GetAudioFromR2Document, options);
        }
export type GetAudioFromR2QueryHookResult = ReturnType<typeof useGetAudioFromR2Query>;
export type GetAudioFromR2LazyQueryHookResult = ReturnType<typeof useGetAudioFromR2LazyQuery>;
export type GetAudioFromR2SuspenseQueryHookResult = ReturnType<typeof useGetAudioFromR2SuspenseQuery>;
export type GetAudioFromR2QueryResult = Apollo.QueryResult<GetAudioFromR2Query, GetAudioFromR2QueryVariables>;
export const GetBehaviorObservationDocument = gql`
    query GetBehaviorObservation($id: Int!) {
  behaviorObservation(id: $id) {
    id
    familyMemberId
    goalId
    createdBy
    observedAt
    observationType
    frequency
    intensity
    context
    notes
    createdAt
    updatedAt
    familyMember {
      id
      firstName
      name
    }
    goal {
      id
      title
      description
    }
  }
}
    `;

/**
 * __useGetBehaviorObservationQuery__
 *
 * To run a query within a React component, call `useGetBehaviorObservationQuery` and pass it any options that fit your needs.
 * When your component renders, `useGetBehaviorObservationQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useGetBehaviorObservationQuery({
 *   variables: {
 *      id: // value for 'id'
 *   },
 * });
 */
export function useGetBehaviorObservationQuery(baseOptions: Apollo.QueryHookOptions<GetBehaviorObservationQuery, GetBehaviorObservationQueryVariables> & ({ variables: GetBehaviorObservationQueryVariables; skip?: boolean; } | { skip: boolean; }) ) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<GetBehaviorObservationQuery, GetBehaviorObservationQueryVariables>(GetBehaviorObservationDocument, options);
      }
export function useGetBehaviorObservationLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<GetBehaviorObservationQuery, GetBehaviorObservationQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<GetBehaviorObservationQuery, GetBehaviorObservationQueryVariables>(GetBehaviorObservationDocument, options);
        }
// @ts-ignore
export function useGetBehaviorObservationSuspenseQuery(baseOptions?: Apollo.SuspenseQueryHookOptions<GetBehaviorObservationQuery, GetBehaviorObservationQueryVariables>): Apollo.UseSuspenseQueryResult<GetBehaviorObservationQuery, GetBehaviorObservationQueryVariables>;
export function useGetBehaviorObservationSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<GetBehaviorObservationQuery, GetBehaviorObservationQueryVariables>): Apollo.UseSuspenseQueryResult<GetBehaviorObservationQuery | undefined, GetBehaviorObservationQueryVariables>;
export function useGetBehaviorObservationSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<GetBehaviorObservationQuery, GetBehaviorObservationQueryVariables>) {
          const options = baseOptions === Apollo.skipToken ? baseOptions : {...defaultOptions, ...baseOptions}
          return Apollo.useSuspenseQuery<GetBehaviorObservationQuery, GetBehaviorObservationQueryVariables>(GetBehaviorObservationDocument, options);
        }
export type GetBehaviorObservationQueryHookResult = ReturnType<typeof useGetBehaviorObservationQuery>;
export type GetBehaviorObservationLazyQueryHookResult = ReturnType<typeof useGetBehaviorObservationLazyQuery>;
export type GetBehaviorObservationSuspenseQueryHookResult = ReturnType<typeof useGetBehaviorObservationSuspenseQuery>;
export type GetBehaviorObservationQueryResult = Apollo.QueryResult<GetBehaviorObservationQuery, GetBehaviorObservationQueryVariables>;
export const GetBehaviorObservationsDocument = gql`
    query GetBehaviorObservations($familyMemberId: Int!, $goalId: Int) {
  behaviorObservations(familyMemberId: $familyMemberId, goalId: $goalId) {
    id
    familyMemberId
    goalId
    createdBy
    observedAt
    observationType
    frequency
    intensity
    context
    notes
    createdAt
    updatedAt
    familyMember {
      id
      firstName
      name
    }
    goal {
      id
      title
    }
  }
}
    `;

/**
 * __useGetBehaviorObservationsQuery__
 *
 * To run a query within a React component, call `useGetBehaviorObservationsQuery` and pass it any options that fit your needs.
 * When your component renders, `useGetBehaviorObservationsQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useGetBehaviorObservationsQuery({
 *   variables: {
 *      familyMemberId: // value for 'familyMemberId'
 *      goalId: // value for 'goalId'
 *   },
 * });
 */
export function useGetBehaviorObservationsQuery(baseOptions: Apollo.QueryHookOptions<GetBehaviorObservationsQuery, GetBehaviorObservationsQueryVariables> & ({ variables: GetBehaviorObservationsQueryVariables; skip?: boolean; } | { skip: boolean; }) ) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<GetBehaviorObservationsQuery, GetBehaviorObservationsQueryVariables>(GetBehaviorObservationsDocument, options);
      }
export function useGetBehaviorObservationsLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<GetBehaviorObservationsQuery, GetBehaviorObservationsQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<GetBehaviorObservationsQuery, GetBehaviorObservationsQueryVariables>(GetBehaviorObservationsDocument, options);
        }
// @ts-ignore
export function useGetBehaviorObservationsSuspenseQuery(baseOptions?: Apollo.SuspenseQueryHookOptions<GetBehaviorObservationsQuery, GetBehaviorObservationsQueryVariables>): Apollo.UseSuspenseQueryResult<GetBehaviorObservationsQuery, GetBehaviorObservationsQueryVariables>;
export function useGetBehaviorObservationsSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<GetBehaviorObservationsQuery, GetBehaviorObservationsQueryVariables>): Apollo.UseSuspenseQueryResult<GetBehaviorObservationsQuery | undefined, GetBehaviorObservationsQueryVariables>;
export function useGetBehaviorObservationsSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<GetBehaviorObservationsQuery, GetBehaviorObservationsQueryVariables>) {
          const options = baseOptions === Apollo.skipToken ? baseOptions : {...defaultOptions, ...baseOptions}
          return Apollo.useSuspenseQuery<GetBehaviorObservationsQuery, GetBehaviorObservationsQueryVariables>(GetBehaviorObservationsDocument, options);
        }
export type GetBehaviorObservationsQueryHookResult = ReturnType<typeof useGetBehaviorObservationsQuery>;
export type GetBehaviorObservationsLazyQueryHookResult = ReturnType<typeof useGetBehaviorObservationsLazyQuery>;
export type GetBehaviorObservationsSuspenseQueryHookResult = ReturnType<typeof useGetBehaviorObservationsSuspenseQuery>;
export type GetBehaviorObservationsQueryResult = Apollo.QueryResult<GetBehaviorObservationsQuery, GetBehaviorObservationsQueryVariables>;
export const GetBogdanDiscussionJobsDocument = gql`
    query GetBogdanDiscussionJobs {
  generationJobs(type: "BOGDAN_DISCUSSION") {
    id
    type
    status
    progress
    error {
      message
    }
    createdAt
    updatedAt
  }
}
    `;

/**
 * __useGetBogdanDiscussionJobsQuery__
 *
 * To run a query within a React component, call `useGetBogdanDiscussionJobsQuery` and pass it any options that fit your needs.
 * When your component renders, `useGetBogdanDiscussionJobsQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useGetBogdanDiscussionJobsQuery({
 *   variables: {
 *   },
 * });
 */
export function useGetBogdanDiscussionJobsQuery(baseOptions?: Apollo.QueryHookOptions<GetBogdanDiscussionJobsQuery, GetBogdanDiscussionJobsQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<GetBogdanDiscussionJobsQuery, GetBogdanDiscussionJobsQueryVariables>(GetBogdanDiscussionJobsDocument, options);
      }
export function useGetBogdanDiscussionJobsLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<GetBogdanDiscussionJobsQuery, GetBogdanDiscussionJobsQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<GetBogdanDiscussionJobsQuery, GetBogdanDiscussionJobsQueryVariables>(GetBogdanDiscussionJobsDocument, options);
        }
// @ts-ignore
export function useGetBogdanDiscussionJobsSuspenseQuery(baseOptions?: Apollo.SuspenseQueryHookOptions<GetBogdanDiscussionJobsQuery, GetBogdanDiscussionJobsQueryVariables>): Apollo.UseSuspenseQueryResult<GetBogdanDiscussionJobsQuery, GetBogdanDiscussionJobsQueryVariables>;
export function useGetBogdanDiscussionJobsSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<GetBogdanDiscussionJobsQuery, GetBogdanDiscussionJobsQueryVariables>): Apollo.UseSuspenseQueryResult<GetBogdanDiscussionJobsQuery | undefined, GetBogdanDiscussionJobsQueryVariables>;
export function useGetBogdanDiscussionJobsSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<GetBogdanDiscussionJobsQuery, GetBogdanDiscussionJobsQueryVariables>) {
          const options = baseOptions === Apollo.skipToken ? baseOptions : {...defaultOptions, ...baseOptions}
          return Apollo.useSuspenseQuery<GetBogdanDiscussionJobsQuery, GetBogdanDiscussionJobsQueryVariables>(GetBogdanDiscussionJobsDocument, options);
        }
export type GetBogdanDiscussionJobsQueryHookResult = ReturnType<typeof useGetBogdanDiscussionJobsQuery>;
export type GetBogdanDiscussionJobsLazyQueryHookResult = ReturnType<typeof useGetBogdanDiscussionJobsLazyQuery>;
export type GetBogdanDiscussionJobsSuspenseQueryHookResult = ReturnType<typeof useGetBogdanDiscussionJobsSuspenseQuery>;
export type GetBogdanDiscussionJobsQueryResult = Apollo.QueryResult<GetBogdanDiscussionJobsQuery, GetBogdanDiscussionJobsQueryVariables>;
export const GetContactDocument = gql`
    query GetContact($id: Int, $slug: String) {
  contact(id: $id, slug: $slug) {
    id
    createdBy
    slug
    firstName
    lastName
    description
    role
    ageYears
    notes
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
 *      slug: // value for 'slug'
 *   },
 * });
 */
export function useGetContactQuery(baseOptions?: Apollo.QueryHookOptions<GetContactQuery, GetContactQueryVariables>) {
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
export const GetContactFeedbackDocument = gql`
    query GetContactFeedback($id: Int!) {
  contactFeedback(id: $id) {
    id
    contactId
    familyMemberId
    createdBy
    subject
    feedbackDate
    content
    tags
    source
    extracted
    extractedIssues {
      title
      description
      category
      severity
      recommendations
    }
    stories {
      id
      goalId
      language
      minutes
      content
      audioKey
      audioUrl
      audioGeneratedAt
      createdAt
      updatedAt
    }
    createdAt
    updatedAt
    contact {
      id
      firstName
      lastName
      slug
    }
    familyMember {
      id
      firstName
      name
      slug
    }
  }
}
    `;

/**
 * __useGetContactFeedbackQuery__
 *
 * To run a query within a React component, call `useGetContactFeedbackQuery` and pass it any options that fit your needs.
 * When your component renders, `useGetContactFeedbackQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useGetContactFeedbackQuery({
 *   variables: {
 *      id: // value for 'id'
 *   },
 * });
 */
export function useGetContactFeedbackQuery(baseOptions: Apollo.QueryHookOptions<GetContactFeedbackQuery, GetContactFeedbackQueryVariables> & ({ variables: GetContactFeedbackQueryVariables; skip?: boolean; } | { skip: boolean; }) ) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<GetContactFeedbackQuery, GetContactFeedbackQueryVariables>(GetContactFeedbackDocument, options);
      }
export function useGetContactFeedbackLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<GetContactFeedbackQuery, GetContactFeedbackQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<GetContactFeedbackQuery, GetContactFeedbackQueryVariables>(GetContactFeedbackDocument, options);
        }
// @ts-ignore
export function useGetContactFeedbackSuspenseQuery(baseOptions?: Apollo.SuspenseQueryHookOptions<GetContactFeedbackQuery, GetContactFeedbackQueryVariables>): Apollo.UseSuspenseQueryResult<GetContactFeedbackQuery, GetContactFeedbackQueryVariables>;
export function useGetContactFeedbackSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<GetContactFeedbackQuery, GetContactFeedbackQueryVariables>): Apollo.UseSuspenseQueryResult<GetContactFeedbackQuery | undefined, GetContactFeedbackQueryVariables>;
export function useGetContactFeedbackSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<GetContactFeedbackQuery, GetContactFeedbackQueryVariables>) {
          const options = baseOptions === Apollo.skipToken ? baseOptions : {...defaultOptions, ...baseOptions}
          return Apollo.useSuspenseQuery<GetContactFeedbackQuery, GetContactFeedbackQueryVariables>(GetContactFeedbackDocument, options);
        }
export type GetContactFeedbackQueryHookResult = ReturnType<typeof useGetContactFeedbackQuery>;
export type GetContactFeedbackLazyQueryHookResult = ReturnType<typeof useGetContactFeedbackLazyQuery>;
export type GetContactFeedbackSuspenseQueryHookResult = ReturnType<typeof useGetContactFeedbackSuspenseQuery>;
export type GetContactFeedbackQueryResult = Apollo.QueryResult<GetContactFeedbackQuery, GetContactFeedbackQueryVariables>;
export const GetContactFeedbacksDocument = gql`
    query GetContactFeedbacks($contactId: Int!, $familyMemberId: Int!) {
  contactFeedbacks(contactId: $contactId, familyMemberId: $familyMemberId) {
    id
    contactId
    familyMemberId
    createdBy
    subject
    feedbackDate
    content
    tags
    source
    extracted
    extractedIssues {
      title
      description
      category
      severity
      recommendations
    }
    createdAt
    updatedAt
    contact {
      id
      firstName
      lastName
      slug
    }
    familyMember {
      id
      firstName
      name
    }
  }
}
    `;

/**
 * __useGetContactFeedbacksQuery__
 *
 * To run a query within a React component, call `useGetContactFeedbacksQuery` and pass it any options that fit your needs.
 * When your component renders, `useGetContactFeedbacksQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useGetContactFeedbacksQuery({
 *   variables: {
 *      contactId: // value for 'contactId'
 *      familyMemberId: // value for 'familyMemberId'
 *   },
 * });
 */
export function useGetContactFeedbacksQuery(baseOptions: Apollo.QueryHookOptions<GetContactFeedbacksQuery, GetContactFeedbacksQueryVariables> & ({ variables: GetContactFeedbacksQueryVariables; skip?: boolean; } | { skip: boolean; }) ) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<GetContactFeedbacksQuery, GetContactFeedbacksQueryVariables>(GetContactFeedbacksDocument, options);
      }
export function useGetContactFeedbacksLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<GetContactFeedbacksQuery, GetContactFeedbacksQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<GetContactFeedbacksQuery, GetContactFeedbacksQueryVariables>(GetContactFeedbacksDocument, options);
        }
// @ts-ignore
export function useGetContactFeedbacksSuspenseQuery(baseOptions?: Apollo.SuspenseQueryHookOptions<GetContactFeedbacksQuery, GetContactFeedbacksQueryVariables>): Apollo.UseSuspenseQueryResult<GetContactFeedbacksQuery, GetContactFeedbacksQueryVariables>;
export function useGetContactFeedbacksSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<GetContactFeedbacksQuery, GetContactFeedbacksQueryVariables>): Apollo.UseSuspenseQueryResult<GetContactFeedbacksQuery | undefined, GetContactFeedbacksQueryVariables>;
export function useGetContactFeedbacksSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<GetContactFeedbacksQuery, GetContactFeedbacksQueryVariables>) {
          const options = baseOptions === Apollo.skipToken ? baseOptions : {...defaultOptions, ...baseOptions}
          return Apollo.useSuspenseQuery<GetContactFeedbacksQuery, GetContactFeedbacksQueryVariables>(GetContactFeedbacksDocument, options);
        }
export type GetContactFeedbacksQueryHookResult = ReturnType<typeof useGetContactFeedbacksQuery>;
export type GetContactFeedbacksLazyQueryHookResult = ReturnType<typeof useGetContactFeedbacksLazyQuery>;
export type GetContactFeedbacksSuspenseQueryHookResult = ReturnType<typeof useGetContactFeedbacksSuspenseQuery>;
export type GetContactFeedbacksQueryResult = Apollo.QueryResult<GetContactFeedbacksQuery, GetContactFeedbacksQueryVariables>;
export const GetContactsDocument = gql`
    query GetContacts {
  contacts {
    id
    createdBy
    slug
    firstName
    lastName
    description
    role
    ageYears
    notes
    createdAt
    updatedAt
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
export const GetConversationDocument = gql`
    query GetConversation($id: Int!) {
  conversation(id: $id) {
    id
    issueId
    userId
    title
    createdAt
    updatedAt
    messages {
      id
      conversationId
      role
      content
      createdAt
    }
  }
}
    `;

/**
 * __useGetConversationQuery__
 *
 * To run a query within a React component, call `useGetConversationQuery` and pass it any options that fit your needs.
 * When your component renders, `useGetConversationQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useGetConversationQuery({
 *   variables: {
 *      id: // value for 'id'
 *   },
 * });
 */
export function useGetConversationQuery(baseOptions: Apollo.QueryHookOptions<GetConversationQuery, GetConversationQueryVariables> & ({ variables: GetConversationQueryVariables; skip?: boolean; } | { skip: boolean; }) ) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<GetConversationQuery, GetConversationQueryVariables>(GetConversationDocument, options);
      }
export function useGetConversationLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<GetConversationQuery, GetConversationQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<GetConversationQuery, GetConversationQueryVariables>(GetConversationDocument, options);
        }
// @ts-ignore
export function useGetConversationSuspenseQuery(baseOptions?: Apollo.SuspenseQueryHookOptions<GetConversationQuery, GetConversationQueryVariables>): Apollo.UseSuspenseQueryResult<GetConversationQuery, GetConversationQueryVariables>;
export function useGetConversationSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<GetConversationQuery, GetConversationQueryVariables>): Apollo.UseSuspenseQueryResult<GetConversationQuery | undefined, GetConversationQueryVariables>;
export function useGetConversationSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<GetConversationQuery, GetConversationQueryVariables>) {
          const options = baseOptions === Apollo.skipToken ? baseOptions : {...defaultOptions, ...baseOptions}
          return Apollo.useSuspenseQuery<GetConversationQuery, GetConversationQueryVariables>(GetConversationDocument, options);
        }
export type GetConversationQueryHookResult = ReturnType<typeof useGetConversationQuery>;
export type GetConversationLazyQueryHookResult = ReturnType<typeof useGetConversationLazyQuery>;
export type GetConversationSuspenseQueryHookResult = ReturnType<typeof useGetConversationSuspenseQuery>;
export type GetConversationQueryResult = Apollo.QueryResult<GetConversationQuery, GetConversationQueryVariables>;
export const GetConversationsForIssueDocument = gql`
    query GetConversationsForIssue($issueId: Int!) {
  conversationsForIssue(issueId: $issueId) {
    id
    issueId
    userId
    title
    createdAt
    updatedAt
    messages {
      id
      conversationId
      role
      content
      createdAt
    }
  }
}
    `;

/**
 * __useGetConversationsForIssueQuery__
 *
 * To run a query within a React component, call `useGetConversationsForIssueQuery` and pass it any options that fit your needs.
 * When your component renders, `useGetConversationsForIssueQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useGetConversationsForIssueQuery({
 *   variables: {
 *      issueId: // value for 'issueId'
 *   },
 * });
 */
export function useGetConversationsForIssueQuery(baseOptions: Apollo.QueryHookOptions<GetConversationsForIssueQuery, GetConversationsForIssueQueryVariables> & ({ variables: GetConversationsForIssueQueryVariables; skip?: boolean; } | { skip: boolean; }) ) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<GetConversationsForIssueQuery, GetConversationsForIssueQueryVariables>(GetConversationsForIssueDocument, options);
      }
export function useGetConversationsForIssueLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<GetConversationsForIssueQuery, GetConversationsForIssueQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<GetConversationsForIssueQuery, GetConversationsForIssueQueryVariables>(GetConversationsForIssueDocument, options);
        }
// @ts-ignore
export function useGetConversationsForIssueSuspenseQuery(baseOptions?: Apollo.SuspenseQueryHookOptions<GetConversationsForIssueQuery, GetConversationsForIssueQueryVariables>): Apollo.UseSuspenseQueryResult<GetConversationsForIssueQuery, GetConversationsForIssueQueryVariables>;
export function useGetConversationsForIssueSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<GetConversationsForIssueQuery, GetConversationsForIssueQueryVariables>): Apollo.UseSuspenseQueryResult<GetConversationsForIssueQuery | undefined, GetConversationsForIssueQueryVariables>;
export function useGetConversationsForIssueSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<GetConversationsForIssueQuery, GetConversationsForIssueQueryVariables>) {
          const options = baseOptions === Apollo.skipToken ? baseOptions : {...defaultOptions, ...baseOptions}
          return Apollo.useSuspenseQuery<GetConversationsForIssueQuery, GetConversationsForIssueQueryVariables>(GetConversationsForIssueDocument, options);
        }
export type GetConversationsForIssueQueryHookResult = ReturnType<typeof useGetConversationsForIssueQuery>;
export type GetConversationsForIssueLazyQueryHookResult = ReturnType<typeof useGetConversationsForIssueLazyQuery>;
export type GetConversationsForIssueSuspenseQueryHookResult = ReturnType<typeof useGetConversationsForIssueSuspenseQuery>;
export type GetConversationsForIssueQueryResult = Apollo.QueryResult<GetConversationsForIssueQuery, GetConversationsForIssueQueryVariables>;
export const GetDeepAnalysesDocument = gql`
    query GetDeepAnalyses($subjectType: DeepAnalysisSubjectType!, $subjectId: Int!) {
  deepAnalyses(subjectType: $subjectType, subjectId: $subjectId) {
    id
    subjectType
    subjectId
    triggerType
    triggerId
    createdBy
    jobId
    summary
    patternClusters {
      name
      description
      issueIds
      issueTitles
      categories
      pattern
      confidence
      suggestedRootCause
    }
    timelineAnalysis {
      phases {
        period
        issueIds
        description
        moodTrend
        keyEvents
      }
      moodCorrelation
      escalationTrend
      criticalPeriods
    }
    familySystemInsights {
      insight
      involvedMemberIds
      involvedMemberNames
      evidenceIssueIds
      systemicPattern
      actionable
    }
    priorityRecommendations {
      rank
      issueId
      issueTitle
      rationale
      urgency
      suggestedApproach
      relatedResearchIds
    }
    researchRelevance {
      patternClusterName
      relevantResearchIds
      relevantResearchTitles
      coverageGaps
    }
    parentAdvice {
      title
      advice
      targetIssueIds
      targetIssueTitles
      relatedPatternCluster
      relatedResearchIds
      relatedResearchTitles
      ageAppropriate
      developmentalContext
      priority
      concreteSteps
    }
    dataSnapshot {
      issueCount
      observationCount
      journalEntryCount
      contactFeedbackCount
      teacherFeedbackCount
      researchPaperCount
      relatedMemberIssueCount
    }
    model
    createdAt
    updatedAt
  }
}
    `;

/**
 * __useGetDeepAnalysesQuery__
 *
 * To run a query within a React component, call `useGetDeepAnalysesQuery` and pass it any options that fit your needs.
 * When your component renders, `useGetDeepAnalysesQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useGetDeepAnalysesQuery({
 *   variables: {
 *      subjectType: // value for 'subjectType'
 *      subjectId: // value for 'subjectId'
 *   },
 * });
 */
export function useGetDeepAnalysesQuery(baseOptions: Apollo.QueryHookOptions<GetDeepAnalysesQuery, GetDeepAnalysesQueryVariables> & ({ variables: GetDeepAnalysesQueryVariables; skip?: boolean; } | { skip: boolean; }) ) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<GetDeepAnalysesQuery, GetDeepAnalysesQueryVariables>(GetDeepAnalysesDocument, options);
      }
export function useGetDeepAnalysesLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<GetDeepAnalysesQuery, GetDeepAnalysesQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<GetDeepAnalysesQuery, GetDeepAnalysesQueryVariables>(GetDeepAnalysesDocument, options);
        }
// @ts-ignore
export function useGetDeepAnalysesSuspenseQuery(baseOptions?: Apollo.SuspenseQueryHookOptions<GetDeepAnalysesQuery, GetDeepAnalysesQueryVariables>): Apollo.UseSuspenseQueryResult<GetDeepAnalysesQuery, GetDeepAnalysesQueryVariables>;
export function useGetDeepAnalysesSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<GetDeepAnalysesQuery, GetDeepAnalysesQueryVariables>): Apollo.UseSuspenseQueryResult<GetDeepAnalysesQuery | undefined, GetDeepAnalysesQueryVariables>;
export function useGetDeepAnalysesSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<GetDeepAnalysesQuery, GetDeepAnalysesQueryVariables>) {
          const options = baseOptions === Apollo.skipToken ? baseOptions : {...defaultOptions, ...baseOptions}
          return Apollo.useSuspenseQuery<GetDeepAnalysesQuery, GetDeepAnalysesQueryVariables>(GetDeepAnalysesDocument, options);
        }
export type GetDeepAnalysesQueryHookResult = ReturnType<typeof useGetDeepAnalysesQuery>;
export type GetDeepAnalysesLazyQueryHookResult = ReturnType<typeof useGetDeepAnalysesLazyQuery>;
export type GetDeepAnalysesSuspenseQueryHookResult = ReturnType<typeof useGetDeepAnalysesSuspenseQuery>;
export type GetDeepAnalysesQueryResult = Apollo.QueryResult<GetDeepAnalysesQuery, GetDeepAnalysesQueryVariables>;
export const GetDeepIssueAnalysesDocument = gql`
    query GetDeepIssueAnalyses($familyMemberId: Int!) {
  deepIssueAnalyses(familyMemberId: $familyMemberId) {
    id
    familyMemberId
    triggerIssueId
    createdBy
    jobId
    summary
    patternClusters {
      name
      description
      issueIds
      issueTitles
      categories
      pattern
      confidence
      suggestedRootCause
    }
    timelineAnalysis {
      phases {
        period
        issueIds
        description
        moodTrend
        keyEvents
      }
      moodCorrelation
      escalationTrend
      criticalPeriods
    }
    familySystemInsights {
      insight
      involvedMemberIds
      involvedMemberNames
      evidenceIssueIds
      systemicPattern
      actionable
    }
    priorityRecommendations {
      rank
      issueId
      issueTitle
      rationale
      urgency
      suggestedApproach
      relatedResearchIds
    }
    researchRelevance {
      patternClusterName
      relevantResearchIds
      relevantResearchTitles
      coverageGaps
    }
    parentAdvice {
      title
      advice
      targetIssueIds
      targetIssueTitles
      relatedPatternCluster
      relatedResearchIds
      relatedResearchTitles
      ageAppropriate
      developmentalContext
      priority
      concreteSteps
    }
    dataSnapshot {
      issueCount
      observationCount
      journalEntryCount
      contactFeedbackCount
      teacherFeedbackCount
      researchPaperCount
      relatedMemberIssueCount
    }
    model
    createdAt
    updatedAt
  }
}
    `;

/**
 * __useGetDeepIssueAnalysesQuery__
 *
 * To run a query within a React component, call `useGetDeepIssueAnalysesQuery` and pass it any options that fit your needs.
 * When your component renders, `useGetDeepIssueAnalysesQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useGetDeepIssueAnalysesQuery({
 *   variables: {
 *      familyMemberId: // value for 'familyMemberId'
 *   },
 * });
 */
export function useGetDeepIssueAnalysesQuery(baseOptions: Apollo.QueryHookOptions<GetDeepIssueAnalysesQuery, GetDeepIssueAnalysesQueryVariables> & ({ variables: GetDeepIssueAnalysesQueryVariables; skip?: boolean; } | { skip: boolean; }) ) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<GetDeepIssueAnalysesQuery, GetDeepIssueAnalysesQueryVariables>(GetDeepIssueAnalysesDocument, options);
      }
export function useGetDeepIssueAnalysesLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<GetDeepIssueAnalysesQuery, GetDeepIssueAnalysesQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<GetDeepIssueAnalysesQuery, GetDeepIssueAnalysesQueryVariables>(GetDeepIssueAnalysesDocument, options);
        }
// @ts-ignore
export function useGetDeepIssueAnalysesSuspenseQuery(baseOptions?: Apollo.SuspenseQueryHookOptions<GetDeepIssueAnalysesQuery, GetDeepIssueAnalysesQueryVariables>): Apollo.UseSuspenseQueryResult<GetDeepIssueAnalysesQuery, GetDeepIssueAnalysesQueryVariables>;
export function useGetDeepIssueAnalysesSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<GetDeepIssueAnalysesQuery, GetDeepIssueAnalysesQueryVariables>): Apollo.UseSuspenseQueryResult<GetDeepIssueAnalysesQuery | undefined, GetDeepIssueAnalysesQueryVariables>;
export function useGetDeepIssueAnalysesSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<GetDeepIssueAnalysesQuery, GetDeepIssueAnalysesQueryVariables>) {
          const options = baseOptions === Apollo.skipToken ? baseOptions : {...defaultOptions, ...baseOptions}
          return Apollo.useSuspenseQuery<GetDeepIssueAnalysesQuery, GetDeepIssueAnalysesQueryVariables>(GetDeepIssueAnalysesDocument, options);
        }
export type GetDeepIssueAnalysesQueryHookResult = ReturnType<typeof useGetDeepIssueAnalysesQuery>;
export type GetDeepIssueAnalysesLazyQueryHookResult = ReturnType<typeof useGetDeepIssueAnalysesLazyQuery>;
export type GetDeepIssueAnalysesSuspenseQueryHookResult = ReturnType<typeof useGetDeepIssueAnalysesSuspenseQuery>;
export type GetDeepIssueAnalysesQueryResult = Apollo.QueryResult<GetDeepIssueAnalysesQuery, GetDeepIssueAnalysesQueryVariables>;
export const GetFamilyMemberDocument = gql`
    query GetFamilyMember($id: Int, $slug: String) {
  familyMember(id: $id, slug: $slug) {
    id
    userId
    slug
    firstName
    name
    ageYears
    relationship
    email
    phone
    location
    occupation
    dateOfBirth
    bio
    allergies
    createdAt
    updatedAt
    shares {
      familyMemberId
      email
      role
      createdAt
      createdBy
    }
    goals {
      id
      title
      status
      description
      createdAt
    }
    behaviorObservations {
      id
      familyMemberId
      goalId
      createdBy
      observedAt
      observationType
      frequency
      intensity
      context
      notes
      createdAt
      updatedAt
    }
    teacherFeedbacks {
      id
      familyMemberId
      createdBy
      teacherName
      subject
      feedbackDate
      content
      tags
      source
      extracted
      createdAt
      updatedAt
    }
    issues {
      id
      feedbackId
      familyMemberId
      createdBy
      title
      description
      category
      severity
      recommendations
      createdAt
      updatedAt
    }
    relationships {
      id
      createdBy
      subjectType
      subjectId
      relatedType
      relatedId
      relationshipType
      context
      startDate
      status
      createdAt
      updatedAt
      related {
        id
        type
        slug
        firstName
        lastName
      }
    }
  }
}
    `;

/**
 * __useGetFamilyMemberQuery__
 *
 * To run a query within a React component, call `useGetFamilyMemberQuery` and pass it any options that fit your needs.
 * When your component renders, `useGetFamilyMemberQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useGetFamilyMemberQuery({
 *   variables: {
 *      id: // value for 'id'
 *      slug: // value for 'slug'
 *   },
 * });
 */
export function useGetFamilyMemberQuery(baseOptions?: Apollo.QueryHookOptions<GetFamilyMemberQuery, GetFamilyMemberQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<GetFamilyMemberQuery, GetFamilyMemberQueryVariables>(GetFamilyMemberDocument, options);
      }
export function useGetFamilyMemberLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<GetFamilyMemberQuery, GetFamilyMemberQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<GetFamilyMemberQuery, GetFamilyMemberQueryVariables>(GetFamilyMemberDocument, options);
        }
// @ts-ignore
export function useGetFamilyMemberSuspenseQuery(baseOptions?: Apollo.SuspenseQueryHookOptions<GetFamilyMemberQuery, GetFamilyMemberQueryVariables>): Apollo.UseSuspenseQueryResult<GetFamilyMemberQuery, GetFamilyMemberQueryVariables>;
export function useGetFamilyMemberSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<GetFamilyMemberQuery, GetFamilyMemberQueryVariables>): Apollo.UseSuspenseQueryResult<GetFamilyMemberQuery | undefined, GetFamilyMemberQueryVariables>;
export function useGetFamilyMemberSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<GetFamilyMemberQuery, GetFamilyMemberQueryVariables>) {
          const options = baseOptions === Apollo.skipToken ? baseOptions : {...defaultOptions, ...baseOptions}
          return Apollo.useSuspenseQuery<GetFamilyMemberQuery, GetFamilyMemberQueryVariables>(GetFamilyMemberDocument, options);
        }
export type GetFamilyMemberQueryHookResult = ReturnType<typeof useGetFamilyMemberQuery>;
export type GetFamilyMemberLazyQueryHookResult = ReturnType<typeof useGetFamilyMemberLazyQuery>;
export type GetFamilyMemberSuspenseQueryHookResult = ReturnType<typeof useGetFamilyMemberSuspenseQuery>;
export type GetFamilyMemberQueryResult = Apollo.QueryResult<GetFamilyMemberQuery, GetFamilyMemberQueryVariables>;
export const GetFamilyMembersDocument = gql`
    query GetFamilyMembers {
  familyMembers {
    id
    userId
    slug
    firstName
    name
    ageYears
    relationship
    email
    phone
    location
    occupation
    dateOfBirth
    bio
    allergies
    createdAt
    updatedAt
    shares {
      familyMemberId
      email
      role
      createdAt
      createdBy
    }
    relationships {
      id
      subjectType
      subjectId
      relatedType
      relatedId
      relationshipType
      status
      related {
        id
        type
        slug
        firstName
        lastName
      }
    }
  }
}
    `;

/**
 * __useGetFamilyMembersQuery__
 *
 * To run a query within a React component, call `useGetFamilyMembersQuery` and pass it any options that fit your needs.
 * When your component renders, `useGetFamilyMembersQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useGetFamilyMembersQuery({
 *   variables: {
 *   },
 * });
 */
export function useGetFamilyMembersQuery(baseOptions?: Apollo.QueryHookOptions<GetFamilyMembersQuery, GetFamilyMembersQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<GetFamilyMembersQuery, GetFamilyMembersQueryVariables>(GetFamilyMembersDocument, options);
      }
export function useGetFamilyMembersLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<GetFamilyMembersQuery, GetFamilyMembersQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<GetFamilyMembersQuery, GetFamilyMembersQueryVariables>(GetFamilyMembersDocument, options);
        }
// @ts-ignore
export function useGetFamilyMembersSuspenseQuery(baseOptions?: Apollo.SuspenseQueryHookOptions<GetFamilyMembersQuery, GetFamilyMembersQueryVariables>): Apollo.UseSuspenseQueryResult<GetFamilyMembersQuery, GetFamilyMembersQueryVariables>;
export function useGetFamilyMembersSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<GetFamilyMembersQuery, GetFamilyMembersQueryVariables>): Apollo.UseSuspenseQueryResult<GetFamilyMembersQuery | undefined, GetFamilyMembersQueryVariables>;
export function useGetFamilyMembersSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<GetFamilyMembersQuery, GetFamilyMembersQueryVariables>) {
          const options = baseOptions === Apollo.skipToken ? baseOptions : {...defaultOptions, ...baseOptions}
          return Apollo.useSuspenseQuery<GetFamilyMembersQuery, GetFamilyMembersQueryVariables>(GetFamilyMembersDocument, options);
        }
export type GetFamilyMembersQueryHookResult = ReturnType<typeof useGetFamilyMembersQuery>;
export type GetFamilyMembersLazyQueryHookResult = ReturnType<typeof useGetFamilyMembersLazyQuery>;
export type GetFamilyMembersSuspenseQueryHookResult = ReturnType<typeof useGetFamilyMembersSuspenseQuery>;
export type GetFamilyMembersQueryResult = Apollo.QueryResult<GetFamilyMembersQuery, GetFamilyMembersQueryVariables>;
export const GetGameDocument = gql`
    query GetGame($id: Int!) {
  game(id: $id) {
    id
    userId
    goalId
    issueId
    familyMemberId
    type
    title
    description
    content
    language
    estimatedMinutes
    source
    createdAt
    updatedAt
    goal {
      id
      title
    }
    issue {
      id
      title
    }
    completions {
      id
      gameId
      durationSeconds
      responses
      linkedNoteId
      completedAt
    }
  }
}
    `;

/**
 * __useGetGameQuery__
 *
 * To run a query within a React component, call `useGetGameQuery` and pass it any options that fit your needs.
 * When your component renders, `useGetGameQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useGetGameQuery({
 *   variables: {
 *      id: // value for 'id'
 *   },
 * });
 */
export function useGetGameQuery(baseOptions: Apollo.QueryHookOptions<GetGameQuery, GetGameQueryVariables> & ({ variables: GetGameQueryVariables; skip?: boolean; } | { skip: boolean; }) ) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<GetGameQuery, GetGameQueryVariables>(GetGameDocument, options);
      }
export function useGetGameLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<GetGameQuery, GetGameQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<GetGameQuery, GetGameQueryVariables>(GetGameDocument, options);
        }
// @ts-ignore
export function useGetGameSuspenseQuery(baseOptions?: Apollo.SuspenseQueryHookOptions<GetGameQuery, GetGameQueryVariables>): Apollo.UseSuspenseQueryResult<GetGameQuery, GetGameQueryVariables>;
export function useGetGameSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<GetGameQuery, GetGameQueryVariables>): Apollo.UseSuspenseQueryResult<GetGameQuery | undefined, GetGameQueryVariables>;
export function useGetGameSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<GetGameQuery, GetGameQueryVariables>) {
          const options = baseOptions === Apollo.skipToken ? baseOptions : {...defaultOptions, ...baseOptions}
          return Apollo.useSuspenseQuery<GetGameQuery, GetGameQueryVariables>(GetGameDocument, options);
        }
export type GetGameQueryHookResult = ReturnType<typeof useGetGameQuery>;
export type GetGameLazyQueryHookResult = ReturnType<typeof useGetGameLazyQuery>;
export type GetGameSuspenseQueryHookResult = ReturnType<typeof useGetGameSuspenseQuery>;
export type GetGameQueryResult = Apollo.QueryResult<GetGameQuery, GetGameQueryVariables>;
export const GetGamesDocument = gql`
    query GetGames($type: GameType, $goalId: Int, $issueId: Int, $familyMemberId: Int) {
  games(
    type: $type
    goalId: $goalId
    issueId: $issueId
    familyMemberId: $familyMemberId
  ) {
    id
    userId
    goalId
    issueId
    familyMemberId
    type
    title
    description
    language
    estimatedMinutes
    source
    createdAt
    updatedAt
  }
}
    `;

/**
 * __useGetGamesQuery__
 *
 * To run a query within a React component, call `useGetGamesQuery` and pass it any options that fit your needs.
 * When your component renders, `useGetGamesQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useGetGamesQuery({
 *   variables: {
 *      type: // value for 'type'
 *      goalId: // value for 'goalId'
 *      issueId: // value for 'issueId'
 *      familyMemberId: // value for 'familyMemberId'
 *   },
 * });
 */
export function useGetGamesQuery(baseOptions?: Apollo.QueryHookOptions<GetGamesQuery, GetGamesQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<GetGamesQuery, GetGamesQueryVariables>(GetGamesDocument, options);
      }
export function useGetGamesLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<GetGamesQuery, GetGamesQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<GetGamesQuery, GetGamesQueryVariables>(GetGamesDocument, options);
        }
// @ts-ignore
export function useGetGamesSuspenseQuery(baseOptions?: Apollo.SuspenseQueryHookOptions<GetGamesQuery, GetGamesQueryVariables>): Apollo.UseSuspenseQueryResult<GetGamesQuery, GetGamesQueryVariables>;
export function useGetGamesSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<GetGamesQuery, GetGamesQueryVariables>): Apollo.UseSuspenseQueryResult<GetGamesQuery | undefined, GetGamesQueryVariables>;
export function useGetGamesSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<GetGamesQuery, GetGamesQueryVariables>) {
          const options = baseOptions === Apollo.skipToken ? baseOptions : {...defaultOptions, ...baseOptions}
          return Apollo.useSuspenseQuery<GetGamesQuery, GetGamesQueryVariables>(GetGamesDocument, options);
        }
export type GetGamesQueryHookResult = ReturnType<typeof useGetGamesQuery>;
export type GetGamesLazyQueryHookResult = ReturnType<typeof useGetGamesLazyQuery>;
export type GetGamesSuspenseQueryHookResult = ReturnType<typeof useGetGamesSuspenseQuery>;
export type GetGamesQueryResult = Apollo.QueryResult<GetGamesQuery, GetGamesQueryVariables>;
export const GetGenerationJobDocument = gql`
    query GetGenerationJob($id: String!) {
  generationJob(id: $id) {
    id
    type
    goalId
    storyId
    status
    progress
    createdAt
    result {
      audioUrl
      progress
      stage
      count
      message
      diagnostics {
        searchCount
        enrichedCount
        extractedCount
        qualifiedCount
        persistedCount
        searchUsedFallback
        enrichedDropped
      }
    }
    error {
      message
    }
    updatedAt
  }
}
    `;

/**
 * __useGetGenerationJobQuery__
 *
 * To run a query within a React component, call `useGetGenerationJobQuery` and pass it any options that fit your needs.
 * When your component renders, `useGetGenerationJobQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useGetGenerationJobQuery({
 *   variables: {
 *      id: // value for 'id'
 *   },
 * });
 */
export function useGetGenerationJobQuery(baseOptions: Apollo.QueryHookOptions<GetGenerationJobQuery, GetGenerationJobQueryVariables> & ({ variables: GetGenerationJobQueryVariables; skip?: boolean; } | { skip: boolean; }) ) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<GetGenerationJobQuery, GetGenerationJobQueryVariables>(GetGenerationJobDocument, options);
      }
export function useGetGenerationJobLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<GetGenerationJobQuery, GetGenerationJobQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<GetGenerationJobQuery, GetGenerationJobQueryVariables>(GetGenerationJobDocument, options);
        }
// @ts-ignore
export function useGetGenerationJobSuspenseQuery(baseOptions?: Apollo.SuspenseQueryHookOptions<GetGenerationJobQuery, GetGenerationJobQueryVariables>): Apollo.UseSuspenseQueryResult<GetGenerationJobQuery, GetGenerationJobQueryVariables>;
export function useGetGenerationJobSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<GetGenerationJobQuery, GetGenerationJobQueryVariables>): Apollo.UseSuspenseQueryResult<GetGenerationJobQuery | undefined, GetGenerationJobQueryVariables>;
export function useGetGenerationJobSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<GetGenerationJobQuery, GetGenerationJobQueryVariables>) {
          const options = baseOptions === Apollo.skipToken ? baseOptions : {...defaultOptions, ...baseOptions}
          return Apollo.useSuspenseQuery<GetGenerationJobQuery, GetGenerationJobQueryVariables>(GetGenerationJobDocument, options);
        }
export type GetGenerationJobQueryHookResult = ReturnType<typeof useGetGenerationJobQuery>;
export type GetGenerationJobLazyQueryHookResult = ReturnType<typeof useGetGenerationJobLazyQuery>;
export type GetGenerationJobSuspenseQueryHookResult = ReturnType<typeof useGetGenerationJobSuspenseQuery>;
export type GetGenerationJobQueryResult = Apollo.QueryResult<GetGenerationJobQuery, GetGenerationJobQueryVariables>;
export const GetGenerationJobsDocument = gql`
    query GetGenerationJobs($goalId: Int, $status: String) {
  generationJobs(goalId: $goalId, status: $status) {
    id
    type
    storyId
    status
    progress
    result {
      audioUrl
    }
    error {
      message
    }
    updatedAt
  }
}
    `;

/**
 * __useGetGenerationJobsQuery__
 *
 * To run a query within a React component, call `useGetGenerationJobsQuery` and pass it any options that fit your needs.
 * When your component renders, `useGetGenerationJobsQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useGetGenerationJobsQuery({
 *   variables: {
 *      goalId: // value for 'goalId'
 *      status: // value for 'status'
 *   },
 * });
 */
export function useGetGenerationJobsQuery(baseOptions?: Apollo.QueryHookOptions<GetGenerationJobsQuery, GetGenerationJobsQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<GetGenerationJobsQuery, GetGenerationJobsQueryVariables>(GetGenerationJobsDocument, options);
      }
export function useGetGenerationJobsLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<GetGenerationJobsQuery, GetGenerationJobsQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<GetGenerationJobsQuery, GetGenerationJobsQueryVariables>(GetGenerationJobsDocument, options);
        }
// @ts-ignore
export function useGetGenerationJobsSuspenseQuery(baseOptions?: Apollo.SuspenseQueryHookOptions<GetGenerationJobsQuery, GetGenerationJobsQueryVariables>): Apollo.UseSuspenseQueryResult<GetGenerationJobsQuery, GetGenerationJobsQueryVariables>;
export function useGetGenerationJobsSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<GetGenerationJobsQuery, GetGenerationJobsQueryVariables>): Apollo.UseSuspenseQueryResult<GetGenerationJobsQuery | undefined, GetGenerationJobsQueryVariables>;
export function useGetGenerationJobsSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<GetGenerationJobsQuery, GetGenerationJobsQueryVariables>) {
          const options = baseOptions === Apollo.skipToken ? baseOptions : {...defaultOptions, ...baseOptions}
          return Apollo.useSuspenseQuery<GetGenerationJobsQuery, GetGenerationJobsQueryVariables>(GetGenerationJobsDocument, options);
        }
export type GetGenerationJobsQueryHookResult = ReturnType<typeof useGetGenerationJobsQuery>;
export type GetGenerationJobsLazyQueryHookResult = ReturnType<typeof useGetGenerationJobsLazyQuery>;
export type GetGenerationJobsSuspenseQueryHookResult = ReturnType<typeof useGetGenerationJobsSuspenseQuery>;
export type GetGenerationJobsQueryResult = Apollo.QueryResult<GetGenerationJobsQuery, GetGenerationJobsQueryVariables>;
export const GetGoalDocument = gql`
    query GetGoal($id: Int, $slug: String) {
  goal(id: $id, slug: $slug) {
    id
    slug
    title
    description
    status
    priority
    targetDate
    tags
    familyMemberId
    familyMember {
      id
      slug
      firstName
      name
      ageYears
      relationship
    }
    createdBy
    parentGoalId
    parentGoal {
      id
      slug
      title
      status
    }
    therapeuticText
    therapeuticTextLanguage
    therapeuticTextGeneratedAt
    parentAdvice
    parentAdviceLanguage
    parentAdviceGeneratedAt
    storyLanguage
    subGoals {
      id
      slug
      title
      description
      status
      createdAt
      updatedAt
    }
    notes {
      id
      slug
      content
      noteType
      tags
      createdAt
      updatedAt
    }
    questions {
      id
      question
      researchId
      researchTitle
      rationale
      generatedAt
    }
    research {
      id
      title
      authors
      year
      journal
      doi
      url
      abstract
      keyFindings
      therapeuticTechniques
      evidenceLevel
      relevanceScore
      extractionConfidence
    }
    recommendedBooks {
      id
      title
      authors
      year
      isbn
      description
      whyRecommended
      category
      amazonUrl
      generatedAt
    }
    stories {
      id
      goalId
      issueId
      feedbackId
      createdBy
      content
      language
      minutes
      audioKey
      audioUrl
      audioGeneratedAt
      createdAt
      updatedAt
    }
    createdAt
    updatedAt
  }
}
    `;

/**
 * __useGetGoalQuery__
 *
 * To run a query within a React component, call `useGetGoalQuery` and pass it any options that fit your needs.
 * When your component renders, `useGetGoalQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useGetGoalQuery({
 *   variables: {
 *      id: // value for 'id'
 *      slug: // value for 'slug'
 *   },
 * });
 */
export function useGetGoalQuery(baseOptions?: Apollo.QueryHookOptions<GetGoalQuery, GetGoalQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<GetGoalQuery, GetGoalQueryVariables>(GetGoalDocument, options);
      }
export function useGetGoalLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<GetGoalQuery, GetGoalQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<GetGoalQuery, GetGoalQueryVariables>(GetGoalDocument, options);
        }
// @ts-ignore
export function useGetGoalSuspenseQuery(baseOptions?: Apollo.SuspenseQueryHookOptions<GetGoalQuery, GetGoalQueryVariables>): Apollo.UseSuspenseQueryResult<GetGoalQuery, GetGoalQueryVariables>;
export function useGetGoalSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<GetGoalQuery, GetGoalQueryVariables>): Apollo.UseSuspenseQueryResult<GetGoalQuery | undefined, GetGoalQueryVariables>;
export function useGetGoalSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<GetGoalQuery, GetGoalQueryVariables>) {
          const options = baseOptions === Apollo.skipToken ? baseOptions : {...defaultOptions, ...baseOptions}
          return Apollo.useSuspenseQuery<GetGoalQuery, GetGoalQueryVariables>(GetGoalDocument, options);
        }
export type GetGoalQueryHookResult = ReturnType<typeof useGetGoalQuery>;
export type GetGoalLazyQueryHookResult = ReturnType<typeof useGetGoalLazyQuery>;
export type GetGoalSuspenseQueryHookResult = ReturnType<typeof useGetGoalSuspenseQuery>;
export type GetGoalQueryResult = Apollo.QueryResult<GetGoalQuery, GetGoalQueryVariables>;
export const GetGoalsDocument = gql`
    query GetGoals($familyMemberId: Int, $status: String, $tag: String) {
  goals(familyMemberId: $familyMemberId, status: $status, tag: $tag) {
    id
    title
    description
    status
    tags
    familyMemberId
    familyMember {
      id
      firstName
      name
      relationship
    }
    createdBy
    parentGoalId
    notes {
      id
      slug
      noteType
      tags
      createdAt
    }
    createdAt
    updatedAt
  }
}
    `;

/**
 * __useGetGoalsQuery__
 *
 * To run a query within a React component, call `useGetGoalsQuery` and pass it any options that fit your needs.
 * When your component renders, `useGetGoalsQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useGetGoalsQuery({
 *   variables: {
 *      familyMemberId: // value for 'familyMemberId'
 *      status: // value for 'status'
 *      tag: // value for 'tag'
 *   },
 * });
 */
export function useGetGoalsQuery(baseOptions?: Apollo.QueryHookOptions<GetGoalsQuery, GetGoalsQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<GetGoalsQuery, GetGoalsQueryVariables>(GetGoalsDocument, options);
      }
export function useGetGoalsLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<GetGoalsQuery, GetGoalsQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<GetGoalsQuery, GetGoalsQueryVariables>(GetGoalsDocument, options);
        }
// @ts-ignore
export function useGetGoalsSuspenseQuery(baseOptions?: Apollo.SuspenseQueryHookOptions<GetGoalsQuery, GetGoalsQueryVariables>): Apollo.UseSuspenseQueryResult<GetGoalsQuery, GetGoalsQueryVariables>;
export function useGetGoalsSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<GetGoalsQuery, GetGoalsQueryVariables>): Apollo.UseSuspenseQueryResult<GetGoalsQuery | undefined, GetGoalsQueryVariables>;
export function useGetGoalsSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<GetGoalsQuery, GetGoalsQueryVariables>) {
          const options = baseOptions === Apollo.skipToken ? baseOptions : {...defaultOptions, ...baseOptions}
          return Apollo.useSuspenseQuery<GetGoalsQuery, GetGoalsQueryVariables>(GetGoalsDocument, options);
        }
export type GetGoalsQueryHookResult = ReturnType<typeof useGetGoalsQuery>;
export type GetGoalsLazyQueryHookResult = ReturnType<typeof useGetGoalsLazyQuery>;
export type GetGoalsSuspenseQueryHookResult = ReturnType<typeof useGetGoalsSuspenseQuery>;
export type GetGoalsQueryResult = Apollo.QueryResult<GetGoalsQuery, GetGoalsQueryVariables>;
export const GetHabitDocument = gql`
    query GetHabit($id: Int!) {
  habit(id: $id) {
    id
    title
    description
    frequency
    targetCount
    status
    goalId
    familyMemberId
    issueId
    createdAt
    updatedAt
    logs {
      id
      habitId
      loggedDate
      count
      notes
      createdAt
    }
    todayLog {
      id
      loggedDate
      count
    }
  }
}
    `;

/**
 * __useGetHabitQuery__
 *
 * To run a query within a React component, call `useGetHabitQuery` and pass it any options that fit your needs.
 * When your component renders, `useGetHabitQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useGetHabitQuery({
 *   variables: {
 *      id: // value for 'id'
 *   },
 * });
 */
export function useGetHabitQuery(baseOptions: Apollo.QueryHookOptions<GetHabitQuery, GetHabitQueryVariables> & ({ variables: GetHabitQueryVariables; skip?: boolean; } | { skip: boolean; }) ) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<GetHabitQuery, GetHabitQueryVariables>(GetHabitDocument, options);
      }
export function useGetHabitLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<GetHabitQuery, GetHabitQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<GetHabitQuery, GetHabitQueryVariables>(GetHabitDocument, options);
        }
// @ts-ignore
export function useGetHabitSuspenseQuery(baseOptions?: Apollo.SuspenseQueryHookOptions<GetHabitQuery, GetHabitQueryVariables>): Apollo.UseSuspenseQueryResult<GetHabitQuery, GetHabitQueryVariables>;
export function useGetHabitSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<GetHabitQuery, GetHabitQueryVariables>): Apollo.UseSuspenseQueryResult<GetHabitQuery | undefined, GetHabitQueryVariables>;
export function useGetHabitSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<GetHabitQuery, GetHabitQueryVariables>) {
          const options = baseOptions === Apollo.skipToken ? baseOptions : {...defaultOptions, ...baseOptions}
          return Apollo.useSuspenseQuery<GetHabitQuery, GetHabitQueryVariables>(GetHabitDocument, options);
        }
export type GetHabitQueryHookResult = ReturnType<typeof useGetHabitQuery>;
export type GetHabitLazyQueryHookResult = ReturnType<typeof useGetHabitLazyQuery>;
export type GetHabitSuspenseQueryHookResult = ReturnType<typeof useGetHabitSuspenseQuery>;
export type GetHabitQueryResult = Apollo.QueryResult<GetHabitQuery, GetHabitQueryVariables>;
export const GetHabitsDocument = gql`
    query GetHabits($status: String, $familyMemberId: Int) {
  habits(status: $status, familyMemberId: $familyMemberId) {
    id
    title
    description
    frequency
    targetCount
    status
    goalId
    familyMemberId
    issueId
    createdAt
    updatedAt
    todayLog {
      id
      loggedDate
      count
    }
  }
}
    `;

/**
 * __useGetHabitsQuery__
 *
 * To run a query within a React component, call `useGetHabitsQuery` and pass it any options that fit your needs.
 * When your component renders, `useGetHabitsQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useGetHabitsQuery({
 *   variables: {
 *      status: // value for 'status'
 *      familyMemberId: // value for 'familyMemberId'
 *   },
 * });
 */
export function useGetHabitsQuery(baseOptions?: Apollo.QueryHookOptions<GetHabitsQuery, GetHabitsQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<GetHabitsQuery, GetHabitsQueryVariables>(GetHabitsDocument, options);
      }
export function useGetHabitsLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<GetHabitsQuery, GetHabitsQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<GetHabitsQuery, GetHabitsQueryVariables>(GetHabitsDocument, options);
        }
// @ts-ignore
export function useGetHabitsSuspenseQuery(baseOptions?: Apollo.SuspenseQueryHookOptions<GetHabitsQuery, GetHabitsQueryVariables>): Apollo.UseSuspenseQueryResult<GetHabitsQuery, GetHabitsQueryVariables>;
export function useGetHabitsSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<GetHabitsQuery, GetHabitsQueryVariables>): Apollo.UseSuspenseQueryResult<GetHabitsQuery | undefined, GetHabitsQueryVariables>;
export function useGetHabitsSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<GetHabitsQuery, GetHabitsQueryVariables>) {
          const options = baseOptions === Apollo.skipToken ? baseOptions : {...defaultOptions, ...baseOptions}
          return Apollo.useSuspenseQuery<GetHabitsQuery, GetHabitsQueryVariables>(GetHabitsDocument, options);
        }
export type GetHabitsQueryHookResult = ReturnType<typeof useGetHabitsQuery>;
export type GetHabitsLazyQueryHookResult = ReturnType<typeof useGetHabitsLazyQuery>;
export type GetHabitsSuspenseQueryHookResult = ReturnType<typeof useGetHabitsSuspenseQuery>;
export type GetHabitsQueryResult = Apollo.QueryResult<GetHabitsQuery, GetHabitsQueryVariables>;
export const GetIssueDocument = gql`
    query GetIssue($id: Int!) {
  issue(id: $id) {
    id
    feedbackId
    journalEntryId
    journalEntry {
      id
      title
      entryDate
    }
    familyMemberId
    createdBy
    title
    description
    category
    severity
    recommendations
    createdAt
    updatedAt
    feedback {
      id
      contactId
      familyMemberId
      subject
      feedbackDate
      content
      tags
      source
      extracted
      contact {
        id
        firstName
        lastName
        slug
      }
      familyMember {
        id
        firstName
        name
        slug
      }
    }
    familyMember {
      id
      firstName
      name
      slug
    }
    relatedFamilyMemberId
    relatedFamilyMember {
      id
      firstName
      name
      slug
    }
    stories {
      id
      language
      minutes
      createdAt
    }
    contacts {
      id
      firstName
      lastName
      role
      slug
    }
    relatedIssues {
      id
      linkType
      issue {
        id
        title
        category
        severity
        familyMemberId
        familyMember {
          id
          firstName
          name
          slug
        }
        createdAt
      }
    }
    screenshots {
      id
      issueId
      url
      filename
      contentType
      sizeBytes
      caption
      createdAt
    }
  }
}
    `;

/**
 * __useGetIssueQuery__
 *
 * To run a query within a React component, call `useGetIssueQuery` and pass it any options that fit your needs.
 * When your component renders, `useGetIssueQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useGetIssueQuery({
 *   variables: {
 *      id: // value for 'id'
 *   },
 * });
 */
export function useGetIssueQuery(baseOptions: Apollo.QueryHookOptions<GetIssueQuery, GetIssueQueryVariables> & ({ variables: GetIssueQueryVariables; skip?: boolean; } | { skip: boolean; }) ) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<GetIssueQuery, GetIssueQueryVariables>(GetIssueDocument, options);
      }
export function useGetIssueLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<GetIssueQuery, GetIssueQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<GetIssueQuery, GetIssueQueryVariables>(GetIssueDocument, options);
        }
// @ts-ignore
export function useGetIssueSuspenseQuery(baseOptions?: Apollo.SuspenseQueryHookOptions<GetIssueQuery, GetIssueQueryVariables>): Apollo.UseSuspenseQueryResult<GetIssueQuery, GetIssueQueryVariables>;
export function useGetIssueSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<GetIssueQuery, GetIssueQueryVariables>): Apollo.UseSuspenseQueryResult<GetIssueQuery | undefined, GetIssueQueryVariables>;
export function useGetIssueSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<GetIssueQuery, GetIssueQueryVariables>) {
          const options = baseOptions === Apollo.skipToken ? baseOptions : {...defaultOptions, ...baseOptions}
          return Apollo.useSuspenseQuery<GetIssueQuery, GetIssueQueryVariables>(GetIssueDocument, options);
        }
export type GetIssueQueryHookResult = ReturnType<typeof useGetIssueQuery>;
export type GetIssueLazyQueryHookResult = ReturnType<typeof useGetIssueLazyQuery>;
export type GetIssueSuspenseQueryHookResult = ReturnType<typeof useGetIssueSuspenseQuery>;
export type GetIssueQueryResult = Apollo.QueryResult<GetIssueQuery, GetIssueQueryVariables>;
export const GetIssuesDocument = gql`
    query GetIssues($familyMemberId: Int!, $feedbackId: Int) {
  issues(familyMemberId: $familyMemberId, feedbackId: $feedbackId) {
    id
    feedbackId
    familyMemberId
    createdBy
    title
    description
    category
    severity
    recommendations
    createdAt
    updatedAt
  }
}
    `;

/**
 * __useGetIssuesQuery__
 *
 * To run a query within a React component, call `useGetIssuesQuery` and pass it any options that fit your needs.
 * When your component renders, `useGetIssuesQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useGetIssuesQuery({
 *   variables: {
 *      familyMemberId: // value for 'familyMemberId'
 *      feedbackId: // value for 'feedbackId'
 *   },
 * });
 */
export function useGetIssuesQuery(baseOptions: Apollo.QueryHookOptions<GetIssuesQuery, GetIssuesQueryVariables> & ({ variables: GetIssuesQueryVariables; skip?: boolean; } | { skip: boolean; }) ) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<GetIssuesQuery, GetIssuesQueryVariables>(GetIssuesDocument, options);
      }
export function useGetIssuesLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<GetIssuesQuery, GetIssuesQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<GetIssuesQuery, GetIssuesQueryVariables>(GetIssuesDocument, options);
        }
// @ts-ignore
export function useGetIssuesSuspenseQuery(baseOptions?: Apollo.SuspenseQueryHookOptions<GetIssuesQuery, GetIssuesQueryVariables>): Apollo.UseSuspenseQueryResult<GetIssuesQuery, GetIssuesQueryVariables>;
export function useGetIssuesSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<GetIssuesQuery, GetIssuesQueryVariables>): Apollo.UseSuspenseQueryResult<GetIssuesQuery | undefined, GetIssuesQueryVariables>;
export function useGetIssuesSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<GetIssuesQuery, GetIssuesQueryVariables>) {
          const options = baseOptions === Apollo.skipToken ? baseOptions : {...defaultOptions, ...baseOptions}
          return Apollo.useSuspenseQuery<GetIssuesQuery, GetIssuesQueryVariables>(GetIssuesDocument, options);
        }
export type GetIssuesQueryHookResult = ReturnType<typeof useGetIssuesQuery>;
export type GetIssuesLazyQueryHookResult = ReturnType<typeof useGetIssuesLazyQuery>;
export type GetIssuesSuspenseQueryHookResult = ReturnType<typeof useGetIssuesSuspenseQuery>;
export type GetIssuesQueryResult = Apollo.QueryResult<GetIssuesQuery, GetIssuesQueryVariables>;
export const GetJournalEntriesDocument = gql`
    query GetJournalEntries($familyMemberId: Int, $goalId: Int, $mood: String, $tag: String, $fromDate: String, $toDate: String) {
  journalEntries(
    familyMemberId: $familyMemberId
    goalId: $goalId
    mood: $mood
    tag: $tag
    fromDate: $fromDate
    toDate: $toDate
  ) {
    id
    createdBy
    familyMemberId
    familyMember {
      id
      firstName
      name
    }
    title
    content
    mood
    moodScore
    tags
    goalId
    goal {
      id
      title
    }
    isPrivate
    isVault
    entryDate
    createdAt
    updatedAt
  }
}
    `;

/**
 * __useGetJournalEntriesQuery__
 *
 * To run a query within a React component, call `useGetJournalEntriesQuery` and pass it any options that fit your needs.
 * When your component renders, `useGetJournalEntriesQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useGetJournalEntriesQuery({
 *   variables: {
 *      familyMemberId: // value for 'familyMemberId'
 *      goalId: // value for 'goalId'
 *      mood: // value for 'mood'
 *      tag: // value for 'tag'
 *      fromDate: // value for 'fromDate'
 *      toDate: // value for 'toDate'
 *   },
 * });
 */
export function useGetJournalEntriesQuery(baseOptions?: Apollo.QueryHookOptions<GetJournalEntriesQuery, GetJournalEntriesQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<GetJournalEntriesQuery, GetJournalEntriesQueryVariables>(GetJournalEntriesDocument, options);
      }
export function useGetJournalEntriesLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<GetJournalEntriesQuery, GetJournalEntriesQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<GetJournalEntriesQuery, GetJournalEntriesQueryVariables>(GetJournalEntriesDocument, options);
        }
// @ts-ignore
export function useGetJournalEntriesSuspenseQuery(baseOptions?: Apollo.SuspenseQueryHookOptions<GetJournalEntriesQuery, GetJournalEntriesQueryVariables>): Apollo.UseSuspenseQueryResult<GetJournalEntriesQuery, GetJournalEntriesQueryVariables>;
export function useGetJournalEntriesSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<GetJournalEntriesQuery, GetJournalEntriesQueryVariables>): Apollo.UseSuspenseQueryResult<GetJournalEntriesQuery | undefined, GetJournalEntriesQueryVariables>;
export function useGetJournalEntriesSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<GetJournalEntriesQuery, GetJournalEntriesQueryVariables>) {
          const options = baseOptions === Apollo.skipToken ? baseOptions : {...defaultOptions, ...baseOptions}
          return Apollo.useSuspenseQuery<GetJournalEntriesQuery, GetJournalEntriesQueryVariables>(GetJournalEntriesDocument, options);
        }
export type GetJournalEntriesQueryHookResult = ReturnType<typeof useGetJournalEntriesQuery>;
export type GetJournalEntriesLazyQueryHookResult = ReturnType<typeof useGetJournalEntriesLazyQuery>;
export type GetJournalEntriesSuspenseQueryHookResult = ReturnType<typeof useGetJournalEntriesSuspenseQuery>;
export type GetJournalEntriesQueryResult = Apollo.QueryResult<GetJournalEntriesQuery, GetJournalEntriesQueryVariables>;
export const GetJournalEntryDocument = gql`
    query GetJournalEntry($id: Int!) {
  journalEntry(id: $id) {
    id
    createdBy
    familyMemberId
    familyMember {
      id
      firstName
      name
    }
    title
    content
    mood
    moodScore
    tags
    goalId
    goal {
      id
      title
      description
    }
    issue {
      id
      title
      category
      severity
      familyMember {
        id
        firstName
        name
        slug
      }
    }
    isPrivate
    isVault
    entryDate
    createdAt
    updatedAt
    analysis {
      id
      journalEntryId
      summary
      emotionalLandscape {
        primaryEmotions
        underlyingEmotions
        emotionalRegulation
        attachmentPatterns
      }
      therapeuticInsights {
        title
        observation
        clinicalRelevance
        relatedResearchIds
      }
      actionableRecommendations {
        title
        description
        priority
        concreteSteps
        relatedResearchIds
      }
      reflectionPrompts
      model
      createdAt
    }
    discussionGuide {
      id
      journalEntryId
      childAge
      behaviorSummary
      developmentalContext {
        stage
        explanation
        normalizedBehavior
        researchBasis
      }
      conversationStarters {
        opener
        context
        ageAppropriateNote
      }
      talkingPoints {
        point
        explanation
        researchBacking
        relatedResearchIds
      }
      languageGuide {
        whatToSay {
          phrase
          reason
          alternative
        }
        whatNotToSay {
          phrase
          reason
          alternative
        }
      }
      anticipatedReactions {
        reaction
        likelihood
        howToRespond
      }
      followUpPlan {
        action
        timing
        description
      }
      model
      createdAt
    }
  }
}
    `;

/**
 * __useGetJournalEntryQuery__
 *
 * To run a query within a React component, call `useGetJournalEntryQuery` and pass it any options that fit your needs.
 * When your component renders, `useGetJournalEntryQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useGetJournalEntryQuery({
 *   variables: {
 *      id: // value for 'id'
 *   },
 * });
 */
export function useGetJournalEntryQuery(baseOptions: Apollo.QueryHookOptions<GetJournalEntryQuery, GetJournalEntryQueryVariables> & ({ variables: GetJournalEntryQueryVariables; skip?: boolean; } | { skip: boolean; }) ) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<GetJournalEntryQuery, GetJournalEntryQueryVariables>(GetJournalEntryDocument, options);
      }
export function useGetJournalEntryLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<GetJournalEntryQuery, GetJournalEntryQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<GetJournalEntryQuery, GetJournalEntryQueryVariables>(GetJournalEntryDocument, options);
        }
// @ts-ignore
export function useGetJournalEntrySuspenseQuery(baseOptions?: Apollo.SuspenseQueryHookOptions<GetJournalEntryQuery, GetJournalEntryQueryVariables>): Apollo.UseSuspenseQueryResult<GetJournalEntryQuery, GetJournalEntryQueryVariables>;
export function useGetJournalEntrySuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<GetJournalEntryQuery, GetJournalEntryQueryVariables>): Apollo.UseSuspenseQueryResult<GetJournalEntryQuery | undefined, GetJournalEntryQueryVariables>;
export function useGetJournalEntrySuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<GetJournalEntryQuery, GetJournalEntryQueryVariables>) {
          const options = baseOptions === Apollo.skipToken ? baseOptions : {...defaultOptions, ...baseOptions}
          return Apollo.useSuspenseQuery<GetJournalEntryQuery, GetJournalEntryQueryVariables>(GetJournalEntryDocument, options);
        }
export type GetJournalEntryQueryHookResult = ReturnType<typeof useGetJournalEntryQuery>;
export type GetJournalEntryLazyQueryHookResult = ReturnType<typeof useGetJournalEntryLazyQuery>;
export type GetJournalEntrySuspenseQueryHookResult = ReturnType<typeof useGetJournalEntrySuspenseQuery>;
export type GetJournalEntryQueryResult = Apollo.QueryResult<GetJournalEntryQuery, GetJournalEntryQueryVariables>;
export const GetJournalRecommendedBooksDocument = gql`
    query GetJournalRecommendedBooks($journalEntryId: Int!) {
  recommendedBooks(journalEntryId: $journalEntryId) {
    id
    goalId
    journalEntryId
    title
    authors
    year
    isbn
    description
    whyRecommended
    category
    amazonUrl
    generatedAt
    createdAt
    updatedAt
  }
}
    `;

/**
 * __useGetJournalRecommendedBooksQuery__
 *
 * To run a query within a React component, call `useGetJournalRecommendedBooksQuery` and pass it any options that fit your needs.
 * When your component renders, `useGetJournalRecommendedBooksQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useGetJournalRecommendedBooksQuery({
 *   variables: {
 *      journalEntryId: // value for 'journalEntryId'
 *   },
 * });
 */
export function useGetJournalRecommendedBooksQuery(baseOptions: Apollo.QueryHookOptions<GetJournalRecommendedBooksQuery, GetJournalRecommendedBooksQueryVariables> & ({ variables: GetJournalRecommendedBooksQueryVariables; skip?: boolean; } | { skip: boolean; }) ) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<GetJournalRecommendedBooksQuery, GetJournalRecommendedBooksQueryVariables>(GetJournalRecommendedBooksDocument, options);
      }
export function useGetJournalRecommendedBooksLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<GetJournalRecommendedBooksQuery, GetJournalRecommendedBooksQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<GetJournalRecommendedBooksQuery, GetJournalRecommendedBooksQueryVariables>(GetJournalRecommendedBooksDocument, options);
        }
// @ts-ignore
export function useGetJournalRecommendedBooksSuspenseQuery(baseOptions?: Apollo.SuspenseQueryHookOptions<GetJournalRecommendedBooksQuery, GetJournalRecommendedBooksQueryVariables>): Apollo.UseSuspenseQueryResult<GetJournalRecommendedBooksQuery, GetJournalRecommendedBooksQueryVariables>;
export function useGetJournalRecommendedBooksSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<GetJournalRecommendedBooksQuery, GetJournalRecommendedBooksQueryVariables>): Apollo.UseSuspenseQueryResult<GetJournalRecommendedBooksQuery | undefined, GetJournalRecommendedBooksQueryVariables>;
export function useGetJournalRecommendedBooksSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<GetJournalRecommendedBooksQuery, GetJournalRecommendedBooksQueryVariables>) {
          const options = baseOptions === Apollo.skipToken ? baseOptions : {...defaultOptions, ...baseOptions}
          return Apollo.useSuspenseQuery<GetJournalRecommendedBooksQuery, GetJournalRecommendedBooksQueryVariables>(GetJournalRecommendedBooksDocument, options);
        }
export type GetJournalRecommendedBooksQueryHookResult = ReturnType<typeof useGetJournalRecommendedBooksQuery>;
export type GetJournalRecommendedBooksLazyQueryHookResult = ReturnType<typeof useGetJournalRecommendedBooksLazyQuery>;
export type GetJournalRecommendedBooksSuspenseQueryHookResult = ReturnType<typeof useGetJournalRecommendedBooksSuspenseQuery>;
export type GetJournalRecommendedBooksQueryResult = Apollo.QueryResult<GetJournalRecommendedBooksQuery, GetJournalRecommendedBooksQueryVariables>;
export const GetMySharedFamilyMembersDocument = gql`
    query GetMySharedFamilyMembers {
  mySharedFamilyMembers {
    id
    userId
    slug
    firstName
    name
    relationship
    email
    createdAt
  }
}
    `;

/**
 * __useGetMySharedFamilyMembersQuery__
 *
 * To run a query within a React component, call `useGetMySharedFamilyMembersQuery` and pass it any options that fit your needs.
 * When your component renders, `useGetMySharedFamilyMembersQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useGetMySharedFamilyMembersQuery({
 *   variables: {
 *   },
 * });
 */
export function useGetMySharedFamilyMembersQuery(baseOptions?: Apollo.QueryHookOptions<GetMySharedFamilyMembersQuery, GetMySharedFamilyMembersQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<GetMySharedFamilyMembersQuery, GetMySharedFamilyMembersQueryVariables>(GetMySharedFamilyMembersDocument, options);
      }
export function useGetMySharedFamilyMembersLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<GetMySharedFamilyMembersQuery, GetMySharedFamilyMembersQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<GetMySharedFamilyMembersQuery, GetMySharedFamilyMembersQueryVariables>(GetMySharedFamilyMembersDocument, options);
        }
// @ts-ignore
export function useGetMySharedFamilyMembersSuspenseQuery(baseOptions?: Apollo.SuspenseQueryHookOptions<GetMySharedFamilyMembersQuery, GetMySharedFamilyMembersQueryVariables>): Apollo.UseSuspenseQueryResult<GetMySharedFamilyMembersQuery, GetMySharedFamilyMembersQueryVariables>;
export function useGetMySharedFamilyMembersSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<GetMySharedFamilyMembersQuery, GetMySharedFamilyMembersQueryVariables>): Apollo.UseSuspenseQueryResult<GetMySharedFamilyMembersQuery | undefined, GetMySharedFamilyMembersQueryVariables>;
export function useGetMySharedFamilyMembersSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<GetMySharedFamilyMembersQuery, GetMySharedFamilyMembersQueryVariables>) {
          const options = baseOptions === Apollo.skipToken ? baseOptions : {...defaultOptions, ...baseOptions}
          return Apollo.useSuspenseQuery<GetMySharedFamilyMembersQuery, GetMySharedFamilyMembersQueryVariables>(GetMySharedFamilyMembersDocument, options);
        }
export type GetMySharedFamilyMembersQueryHookResult = ReturnType<typeof useGetMySharedFamilyMembersQuery>;
export type GetMySharedFamilyMembersLazyQueryHookResult = ReturnType<typeof useGetMySharedFamilyMembersLazyQuery>;
export type GetMySharedFamilyMembersSuspenseQueryHookResult = ReturnType<typeof useGetMySharedFamilyMembersSuspenseQuery>;
export type GetMySharedFamilyMembersQueryResult = Apollo.QueryResult<GetMySharedFamilyMembersQuery, GetMySharedFamilyMembersQueryVariables>;
export const GetNoteDocument = gql`
    query GetNote($id: Int, $slug: String) {
  note(id: $id, slug: $slug) {
    id
    entityId
    entityType
    createdBy
    noteType
    slug
    title
    content
    createdBy
    tags
    goal {
      id
      title
      description
      status
      createdAt
    }
    linkedResearch {
      id
      title
      authors
      year
      journal
      url
      therapeuticGoalType
      relevanceScore
    }
    claimCards {
      id
      claim
      verdict
      confidence
      scope {
        population
        intervention
        comparator
        outcome
        timeframe
        setting
      }
      evidence {
        polarity
        score
        excerpt
        rationale
        locator {
          page
          section
          url
        }
        paper {
          title
          year
          doi
          url
          oaUrl
          source
          authors
          abstract
          journal
        }
      }
      queries
      createdAt
      updatedAt
      provenance {
        generatedBy
        model
        sourceTools
      }
      notes
    }
    createdAt
    updatedAt
  }
}
    `;

/**
 * __useGetNoteQuery__
 *
 * To run a query within a React component, call `useGetNoteQuery` and pass it any options that fit your needs.
 * When your component renders, `useGetNoteQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useGetNoteQuery({
 *   variables: {
 *      id: // value for 'id'
 *      slug: // value for 'slug'
 *   },
 * });
 */
export function useGetNoteQuery(baseOptions?: Apollo.QueryHookOptions<GetNoteQuery, GetNoteQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<GetNoteQuery, GetNoteQueryVariables>(GetNoteDocument, options);
      }
export function useGetNoteLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<GetNoteQuery, GetNoteQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<GetNoteQuery, GetNoteQueryVariables>(GetNoteDocument, options);
        }
// @ts-ignore
export function useGetNoteSuspenseQuery(baseOptions?: Apollo.SuspenseQueryHookOptions<GetNoteQuery, GetNoteQueryVariables>): Apollo.UseSuspenseQueryResult<GetNoteQuery, GetNoteQueryVariables>;
export function useGetNoteSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<GetNoteQuery, GetNoteQueryVariables>): Apollo.UseSuspenseQueryResult<GetNoteQuery | undefined, GetNoteQueryVariables>;
export function useGetNoteSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<GetNoteQuery, GetNoteQueryVariables>) {
          const options = baseOptions === Apollo.skipToken ? baseOptions : {...defaultOptions, ...baseOptions}
          return Apollo.useSuspenseQuery<GetNoteQuery, GetNoteQueryVariables>(GetNoteDocument, options);
        }
export type GetNoteQueryHookResult = ReturnType<typeof useGetNoteQuery>;
export type GetNoteLazyQueryHookResult = ReturnType<typeof useGetNoteLazyQuery>;
export type GetNoteSuspenseQueryHookResult = ReturnType<typeof useGetNoteSuspenseQuery>;
export type GetNoteQueryResult = Apollo.QueryResult<GetNoteQuery, GetNoteQueryVariables>;
export const GetNotesDocument = gql`
    query GetNotes($entityId: Int!, $entityType: String!) {
  notes(entityId: $entityId, entityType: $entityType) {
    id
    entityId
    entityType
    createdBy
    noteType
    slug
    title
    content
    createdBy
    tags
    goal {
      id
      title
      description
      status
    }
    createdAt
    updatedAt
  }
}
    `;

/**
 * __useGetNotesQuery__
 *
 * To run a query within a React component, call `useGetNotesQuery` and pass it any options that fit your needs.
 * When your component renders, `useGetNotesQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useGetNotesQuery({
 *   variables: {
 *      entityId: // value for 'entityId'
 *      entityType: // value for 'entityType'
 *   },
 * });
 */
export function useGetNotesQuery(baseOptions: Apollo.QueryHookOptions<GetNotesQuery, GetNotesQueryVariables> & ({ variables: GetNotesQueryVariables; skip?: boolean; } | { skip: boolean; }) ) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<GetNotesQuery, GetNotesQueryVariables>(GetNotesDocument, options);
      }
export function useGetNotesLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<GetNotesQuery, GetNotesQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<GetNotesQuery, GetNotesQueryVariables>(GetNotesDocument, options);
        }
// @ts-ignore
export function useGetNotesSuspenseQuery(baseOptions?: Apollo.SuspenseQueryHookOptions<GetNotesQuery, GetNotesQueryVariables>): Apollo.UseSuspenseQueryResult<GetNotesQuery, GetNotesQueryVariables>;
export function useGetNotesSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<GetNotesQuery, GetNotesQueryVariables>): Apollo.UseSuspenseQueryResult<GetNotesQuery | undefined, GetNotesQueryVariables>;
export function useGetNotesSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<GetNotesQuery, GetNotesQueryVariables>) {
          const options = baseOptions === Apollo.skipToken ? baseOptions : {...defaultOptions, ...baseOptions}
          return Apollo.useSuspenseQuery<GetNotesQuery, GetNotesQueryVariables>(GetNotesDocument, options);
        }
export type GetNotesQueryHookResult = ReturnType<typeof useGetNotesQuery>;
export type GetNotesLazyQueryHookResult = ReturnType<typeof useGetNotesLazyQuery>;
export type GetNotesSuspenseQueryHookResult = ReturnType<typeof useGetNotesSuspenseQuery>;
export type GetNotesQueryResult = Apollo.QueryResult<GetNotesQuery, GetNotesQueryVariables>;
export const GetPublicDiscussionGuideDocument = gql`
    query GetPublicDiscussionGuide($journalEntryId: Int!) {
  publicDiscussionGuide(journalEntryId: $journalEntryId) {
    entryTitle
    familyMemberName
    guide {
      id
      journalEntryId
      childAge
      behaviorSummary
      developmentalContext {
        stage
        explanation
        normalizedBehavior
        researchBasis
      }
      conversationStarters {
        opener
        context
        ageAppropriateNote
      }
      talkingPoints {
        point
        explanation
        researchBacking
        relatedResearchIds
      }
      languageGuide {
        whatToSay {
          phrase
          reason
          alternative
        }
        whatNotToSay {
          phrase
          reason
          alternative
        }
      }
      anticipatedReactions {
        reaction
        likelihood
        howToRespond
      }
      followUpPlan {
        action
        timing
        description
      }
      model
      createdAt
    }
  }
}
    `;

/**
 * __useGetPublicDiscussionGuideQuery__
 *
 * To run a query within a React component, call `useGetPublicDiscussionGuideQuery` and pass it any options that fit your needs.
 * When your component renders, `useGetPublicDiscussionGuideQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useGetPublicDiscussionGuideQuery({
 *   variables: {
 *      journalEntryId: // value for 'journalEntryId'
 *   },
 * });
 */
export function useGetPublicDiscussionGuideQuery(baseOptions: Apollo.QueryHookOptions<GetPublicDiscussionGuideQuery, GetPublicDiscussionGuideQueryVariables> & ({ variables: GetPublicDiscussionGuideQueryVariables; skip?: boolean; } | { skip: boolean; }) ) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<GetPublicDiscussionGuideQuery, GetPublicDiscussionGuideQueryVariables>(GetPublicDiscussionGuideDocument, options);
      }
export function useGetPublicDiscussionGuideLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<GetPublicDiscussionGuideQuery, GetPublicDiscussionGuideQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<GetPublicDiscussionGuideQuery, GetPublicDiscussionGuideQueryVariables>(GetPublicDiscussionGuideDocument, options);
        }
// @ts-ignore
export function useGetPublicDiscussionGuideSuspenseQuery(baseOptions?: Apollo.SuspenseQueryHookOptions<GetPublicDiscussionGuideQuery, GetPublicDiscussionGuideQueryVariables>): Apollo.UseSuspenseQueryResult<GetPublicDiscussionGuideQuery, GetPublicDiscussionGuideQueryVariables>;
export function useGetPublicDiscussionGuideSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<GetPublicDiscussionGuideQuery, GetPublicDiscussionGuideQueryVariables>): Apollo.UseSuspenseQueryResult<GetPublicDiscussionGuideQuery | undefined, GetPublicDiscussionGuideQueryVariables>;
export function useGetPublicDiscussionGuideSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<GetPublicDiscussionGuideQuery, GetPublicDiscussionGuideQueryVariables>) {
          const options = baseOptions === Apollo.skipToken ? baseOptions : {...defaultOptions, ...baseOptions}
          return Apollo.useSuspenseQuery<GetPublicDiscussionGuideQuery, GetPublicDiscussionGuideQueryVariables>(GetPublicDiscussionGuideDocument, options);
        }
export type GetPublicDiscussionGuideQueryHookResult = ReturnType<typeof useGetPublicDiscussionGuideQuery>;
export type GetPublicDiscussionGuideLazyQueryHookResult = ReturnType<typeof useGetPublicDiscussionGuideLazyQuery>;
export type GetPublicDiscussionGuideSuspenseQueryHookResult = ReturnType<typeof useGetPublicDiscussionGuideSuspenseQuery>;
export type GetPublicDiscussionGuideQueryResult = Apollo.QueryResult<GetPublicDiscussionGuideQuery, GetPublicDiscussionGuideQueryVariables>;
export const GetRecentJobsDocument = gql`
    query GetRecentJobs {
  generationJobs {
    id
    type
    goalId
    storyId
    status
    progress
    result {
      count
      stage
      audioUrl
    }
    error {
      message
    }
    createdAt
    updatedAt
  }
}
    `;

/**
 * __useGetRecentJobsQuery__
 *
 * To run a query within a React component, call `useGetRecentJobsQuery` and pass it any options that fit your needs.
 * When your component renders, `useGetRecentJobsQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useGetRecentJobsQuery({
 *   variables: {
 *   },
 * });
 */
export function useGetRecentJobsQuery(baseOptions?: Apollo.QueryHookOptions<GetRecentJobsQuery, GetRecentJobsQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<GetRecentJobsQuery, GetRecentJobsQueryVariables>(GetRecentJobsDocument, options);
      }
export function useGetRecentJobsLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<GetRecentJobsQuery, GetRecentJobsQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<GetRecentJobsQuery, GetRecentJobsQueryVariables>(GetRecentJobsDocument, options);
        }
// @ts-ignore
export function useGetRecentJobsSuspenseQuery(baseOptions?: Apollo.SuspenseQueryHookOptions<GetRecentJobsQuery, GetRecentJobsQueryVariables>): Apollo.UseSuspenseQueryResult<GetRecentJobsQuery, GetRecentJobsQueryVariables>;
export function useGetRecentJobsSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<GetRecentJobsQuery, GetRecentJobsQueryVariables>): Apollo.UseSuspenseQueryResult<GetRecentJobsQuery | undefined, GetRecentJobsQueryVariables>;
export function useGetRecentJobsSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<GetRecentJobsQuery, GetRecentJobsQueryVariables>) {
          const options = baseOptions === Apollo.skipToken ? baseOptions : {...defaultOptions, ...baseOptions}
          return Apollo.useSuspenseQuery<GetRecentJobsQuery, GetRecentJobsQueryVariables>(GetRecentJobsDocument, options);
        }
export type GetRecentJobsQueryHookResult = ReturnType<typeof useGetRecentJobsQuery>;
export type GetRecentJobsLazyQueryHookResult = ReturnType<typeof useGetRecentJobsLazyQuery>;
export type GetRecentJobsSuspenseQueryHookResult = ReturnType<typeof useGetRecentJobsSuspenseQuery>;
export type GetRecentJobsQueryResult = Apollo.QueryResult<GetRecentJobsQuery, GetRecentJobsQueryVariables>;
export const GetRecommendedBooksDocument = gql`
    query GetRecommendedBooks($goalId: Int!) {
  recommendedBooks(goalId: $goalId) {
    id
    goalId
    title
    authors
    year
    isbn
    description
    whyRecommended
    category
    amazonUrl
    generatedAt
    createdAt
    updatedAt
  }
}
    `;

/**
 * __useGetRecommendedBooksQuery__
 *
 * To run a query within a React component, call `useGetRecommendedBooksQuery` and pass it any options that fit your needs.
 * When your component renders, `useGetRecommendedBooksQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useGetRecommendedBooksQuery({
 *   variables: {
 *      goalId: // value for 'goalId'
 *   },
 * });
 */
export function useGetRecommendedBooksQuery(baseOptions: Apollo.QueryHookOptions<GetRecommendedBooksQuery, GetRecommendedBooksQueryVariables> & ({ variables: GetRecommendedBooksQueryVariables; skip?: boolean; } | { skip: boolean; }) ) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<GetRecommendedBooksQuery, GetRecommendedBooksQueryVariables>(GetRecommendedBooksDocument, options);
      }
export function useGetRecommendedBooksLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<GetRecommendedBooksQuery, GetRecommendedBooksQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<GetRecommendedBooksQuery, GetRecommendedBooksQueryVariables>(GetRecommendedBooksDocument, options);
        }
// @ts-ignore
export function useGetRecommendedBooksSuspenseQuery(baseOptions?: Apollo.SuspenseQueryHookOptions<GetRecommendedBooksQuery, GetRecommendedBooksQueryVariables>): Apollo.UseSuspenseQueryResult<GetRecommendedBooksQuery, GetRecommendedBooksQueryVariables>;
export function useGetRecommendedBooksSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<GetRecommendedBooksQuery, GetRecommendedBooksQueryVariables>): Apollo.UseSuspenseQueryResult<GetRecommendedBooksQuery | undefined, GetRecommendedBooksQueryVariables>;
export function useGetRecommendedBooksSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<GetRecommendedBooksQuery, GetRecommendedBooksQueryVariables>) {
          const options = baseOptions === Apollo.skipToken ? baseOptions : {...defaultOptions, ...baseOptions}
          return Apollo.useSuspenseQuery<GetRecommendedBooksQuery, GetRecommendedBooksQueryVariables>(GetRecommendedBooksDocument, options);
        }
export type GetRecommendedBooksQueryHookResult = ReturnType<typeof useGetRecommendedBooksQuery>;
export type GetRecommendedBooksLazyQueryHookResult = ReturnType<typeof useGetRecommendedBooksLazyQuery>;
export type GetRecommendedBooksSuspenseQueryHookResult = ReturnType<typeof useGetRecommendedBooksSuspenseQuery>;
export type GetRecommendedBooksQueryResult = Apollo.QueryResult<GetRecommendedBooksQuery, GetRecommendedBooksQueryVariables>;
export const GetRelationshipDocument = gql`
    query GetRelationship($id: Int!) {
  relationship(id: $id) {
    id
    createdBy
    subjectType
    subjectId
    relatedType
    relatedId
    relationshipType
    context
    startDate
    status
    createdAt
    updatedAt
    subject {
      id
      type
      firstName
      lastName
    }
    related {
      id
      type
      firstName
      lastName
    }
  }
}
    `;

/**
 * __useGetRelationshipQuery__
 *
 * To run a query within a React component, call `useGetRelationshipQuery` and pass it any options that fit your needs.
 * When your component renders, `useGetRelationshipQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useGetRelationshipQuery({
 *   variables: {
 *      id: // value for 'id'
 *   },
 * });
 */
export function useGetRelationshipQuery(baseOptions: Apollo.QueryHookOptions<GetRelationshipQuery, GetRelationshipQueryVariables> & ({ variables: GetRelationshipQueryVariables; skip?: boolean; } | { skip: boolean; }) ) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<GetRelationshipQuery, GetRelationshipQueryVariables>(GetRelationshipDocument, options);
      }
export function useGetRelationshipLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<GetRelationshipQuery, GetRelationshipQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<GetRelationshipQuery, GetRelationshipQueryVariables>(GetRelationshipDocument, options);
        }
// @ts-ignore
export function useGetRelationshipSuspenseQuery(baseOptions?: Apollo.SuspenseQueryHookOptions<GetRelationshipQuery, GetRelationshipQueryVariables>): Apollo.UseSuspenseQueryResult<GetRelationshipQuery, GetRelationshipQueryVariables>;
export function useGetRelationshipSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<GetRelationshipQuery, GetRelationshipQueryVariables>): Apollo.UseSuspenseQueryResult<GetRelationshipQuery | undefined, GetRelationshipQueryVariables>;
export function useGetRelationshipSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<GetRelationshipQuery, GetRelationshipQueryVariables>) {
          const options = baseOptions === Apollo.skipToken ? baseOptions : {...defaultOptions, ...baseOptions}
          return Apollo.useSuspenseQuery<GetRelationshipQuery, GetRelationshipQueryVariables>(GetRelationshipDocument, options);
        }
export type GetRelationshipQueryHookResult = ReturnType<typeof useGetRelationshipQuery>;
export type GetRelationshipLazyQueryHookResult = ReturnType<typeof useGetRelationshipLazyQuery>;
export type GetRelationshipSuspenseQueryHookResult = ReturnType<typeof useGetRelationshipSuspenseQuery>;
export type GetRelationshipQueryResult = Apollo.QueryResult<GetRelationshipQuery, GetRelationshipQueryVariables>;
export const GetRelationshipsDocument = gql`
    query GetRelationships($subjectType: PersonType!, $subjectId: Int!) {
  relationships(subjectType: $subjectType, subjectId: $subjectId) {
    id
    createdBy
    subjectType
    subjectId
    relatedType
    relatedId
    relationshipType
    context
    startDate
    status
    createdAt
    updatedAt
    subject {
      id
      type
      slug
      firstName
      lastName
    }
    related {
      id
      type
      slug
      firstName
      lastName
    }
  }
}
    `;

/**
 * __useGetRelationshipsQuery__
 *
 * To run a query within a React component, call `useGetRelationshipsQuery` and pass it any options that fit your needs.
 * When your component renders, `useGetRelationshipsQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useGetRelationshipsQuery({
 *   variables: {
 *      subjectType: // value for 'subjectType'
 *      subjectId: // value for 'subjectId'
 *   },
 * });
 */
export function useGetRelationshipsQuery(baseOptions: Apollo.QueryHookOptions<GetRelationshipsQuery, GetRelationshipsQueryVariables> & ({ variables: GetRelationshipsQueryVariables; skip?: boolean; } | { skip: boolean; }) ) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<GetRelationshipsQuery, GetRelationshipsQueryVariables>(GetRelationshipsDocument, options);
      }
export function useGetRelationshipsLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<GetRelationshipsQuery, GetRelationshipsQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<GetRelationshipsQuery, GetRelationshipsQueryVariables>(GetRelationshipsDocument, options);
        }
// @ts-ignore
export function useGetRelationshipsSuspenseQuery(baseOptions?: Apollo.SuspenseQueryHookOptions<GetRelationshipsQuery, GetRelationshipsQueryVariables>): Apollo.UseSuspenseQueryResult<GetRelationshipsQuery, GetRelationshipsQueryVariables>;
export function useGetRelationshipsSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<GetRelationshipsQuery, GetRelationshipsQueryVariables>): Apollo.UseSuspenseQueryResult<GetRelationshipsQuery | undefined, GetRelationshipsQueryVariables>;
export function useGetRelationshipsSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<GetRelationshipsQuery, GetRelationshipsQueryVariables>) {
          const options = baseOptions === Apollo.skipToken ? baseOptions : {...defaultOptions, ...baseOptions}
          return Apollo.useSuspenseQuery<GetRelationshipsQuery, GetRelationshipsQueryVariables>(GetRelationshipsDocument, options);
        }
export type GetRelationshipsQueryHookResult = ReturnType<typeof useGetRelationshipsQuery>;
export type GetRelationshipsLazyQueryHookResult = ReturnType<typeof useGetRelationshipsLazyQuery>;
export type GetRelationshipsSuspenseQueryHookResult = ReturnType<typeof useGetRelationshipsSuspenseQuery>;
export type GetRelationshipsQueryResult = Apollo.QueryResult<GetRelationshipsQuery, GetRelationshipsQueryVariables>;
export const GetResearchDocument = gql`
    query GetResearch($goalId: Int, $issueId: Int, $feedbackId: Int, $journalEntryId: Int) {
  research(
    goalId: $goalId
    issueId: $issueId
    feedbackId: $feedbackId
    journalEntryId: $journalEntryId
  ) {
    id
    goalId
    feedbackId
    journalEntryId
    title
    authors
    year
    journal
    doi
    url
    abstract
    keyFindings
    therapeuticTechniques
    evidenceLevel
    relevanceScore
    extractedBy
    extractionConfidence
    createdAt
  }
}
    `;

/**
 * __useGetResearchQuery__
 *
 * To run a query within a React component, call `useGetResearchQuery` and pass it any options that fit your needs.
 * When your component renders, `useGetResearchQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useGetResearchQuery({
 *   variables: {
 *      goalId: // value for 'goalId'
 *      issueId: // value for 'issueId'
 *      feedbackId: // value for 'feedbackId'
 *      journalEntryId: // value for 'journalEntryId'
 *   },
 * });
 */
export function useGetResearchQuery(baseOptions?: Apollo.QueryHookOptions<GetResearchQuery, GetResearchQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<GetResearchQuery, GetResearchQueryVariables>(GetResearchDocument, options);
      }
export function useGetResearchLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<GetResearchQuery, GetResearchQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<GetResearchQuery, GetResearchQueryVariables>(GetResearchDocument, options);
        }
// @ts-ignore
export function useGetResearchSuspenseQuery(baseOptions?: Apollo.SuspenseQueryHookOptions<GetResearchQuery, GetResearchQueryVariables>): Apollo.UseSuspenseQueryResult<GetResearchQuery, GetResearchQueryVariables>;
export function useGetResearchSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<GetResearchQuery, GetResearchQueryVariables>): Apollo.UseSuspenseQueryResult<GetResearchQuery | undefined, GetResearchQueryVariables>;
export function useGetResearchSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<GetResearchQuery, GetResearchQueryVariables>) {
          const options = baseOptions === Apollo.skipToken ? baseOptions : {...defaultOptions, ...baseOptions}
          return Apollo.useSuspenseQuery<GetResearchQuery, GetResearchQueryVariables>(GetResearchDocument, options);
        }
export type GetResearchQueryHookResult = ReturnType<typeof useGetResearchQuery>;
export type GetResearchLazyQueryHookResult = ReturnType<typeof useGetResearchLazyQuery>;
export type GetResearchSuspenseQueryHookResult = ReturnType<typeof useGetResearchSuspenseQuery>;
export type GetResearchQueryResult = Apollo.QueryResult<GetResearchQuery, GetResearchQueryVariables>;
export const GetRoutineAnalysesDocument = gql`
    query GetRoutineAnalyses($familyMemberId: Int!) {
  routineAnalyses(familyMemberId: $familyMemberId) {
    id
    familyMemberId
    createdBy
    jobId
    summary
    adherencePatterns {
      habitId
      habitTitle
      frequency
      targetCount
      observedCount
      consistency
      currentStreak
      longestStreak
      missedPattern
      interpretation
    }
    routineBalance {
      domainsCovered
      domainsMissing
      overEmphasized
      underEmphasized
      verdict
    }
    streaks {
      strongestHabitId
      strongestStreak
      weakestHabitId
      weakestStreak
      momentum
    }
    gaps {
      area
      rationale
      severity
    }
    optimizationSuggestions {
      title
      rationale
      priority
      changeType
      targetHabitId
      suggestedFrequency
      suggestedTargetCount
      concreteSteps
      ageAppropriate
      developmentalContext
    }
    researchRelevance {
      topic
      relevantResearchIds
      relevantResearchTitles
      coverageGaps
    }
    dataSnapshot {
      habitsCount
      activeDailyCount
      activeWeeklyCount
      logCount
      windowDays
      overallAdherence
      linkedGoalCount
      linkedIssueCount
      researchPaperCount
      issueCount
      journalEntryCount
      observationCount
      teacherFeedbackCount
      contactFeedbackCount
      narrowTherapyHabitsCount
    }
    model
    createdAt
    updatedAt
  }
}
    `;

/**
 * __useGetRoutineAnalysesQuery__
 *
 * To run a query within a React component, call `useGetRoutineAnalysesQuery` and pass it any options that fit your needs.
 * When your component renders, `useGetRoutineAnalysesQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useGetRoutineAnalysesQuery({
 *   variables: {
 *      familyMemberId: // value for 'familyMemberId'
 *   },
 * });
 */
export function useGetRoutineAnalysesQuery(baseOptions: Apollo.QueryHookOptions<GetRoutineAnalysesQuery, GetRoutineAnalysesQueryVariables> & ({ variables: GetRoutineAnalysesQueryVariables; skip?: boolean; } | { skip: boolean; }) ) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<GetRoutineAnalysesQuery, GetRoutineAnalysesQueryVariables>(GetRoutineAnalysesDocument, options);
      }
export function useGetRoutineAnalysesLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<GetRoutineAnalysesQuery, GetRoutineAnalysesQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<GetRoutineAnalysesQuery, GetRoutineAnalysesQueryVariables>(GetRoutineAnalysesDocument, options);
        }
// @ts-ignore
export function useGetRoutineAnalysesSuspenseQuery(baseOptions?: Apollo.SuspenseQueryHookOptions<GetRoutineAnalysesQuery, GetRoutineAnalysesQueryVariables>): Apollo.UseSuspenseQueryResult<GetRoutineAnalysesQuery, GetRoutineAnalysesQueryVariables>;
export function useGetRoutineAnalysesSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<GetRoutineAnalysesQuery, GetRoutineAnalysesQueryVariables>): Apollo.UseSuspenseQueryResult<GetRoutineAnalysesQuery | undefined, GetRoutineAnalysesQueryVariables>;
export function useGetRoutineAnalysesSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<GetRoutineAnalysesQuery, GetRoutineAnalysesQueryVariables>) {
          const options = baseOptions === Apollo.skipToken ? baseOptions : {...defaultOptions, ...baseOptions}
          return Apollo.useSuspenseQuery<GetRoutineAnalysesQuery, GetRoutineAnalysesQueryVariables>(GetRoutineAnalysesDocument, options);
        }
export type GetRoutineAnalysesQueryHookResult = ReturnType<typeof useGetRoutineAnalysesQuery>;
export type GetRoutineAnalysesLazyQueryHookResult = ReturnType<typeof useGetRoutineAnalysesLazyQuery>;
export type GetRoutineAnalysesSuspenseQueryHookResult = ReturnType<typeof useGetRoutineAnalysesSuspenseQuery>;
export type GetRoutineAnalysesQueryResult = Apollo.QueryResult<GetRoutineAnalysesQuery, GetRoutineAnalysesQueryVariables>;
export const GetRoutineAnalysisDocument = gql`
    query GetRoutineAnalysis($id: Int!) {
  routineAnalysis(id: $id) {
    id
    familyMemberId
    createdBy
    jobId
    summary
    adherencePatterns {
      habitId
      habitTitle
      frequency
      targetCount
      observedCount
      consistency
      currentStreak
      longestStreak
      missedPattern
      interpretation
    }
    routineBalance {
      domainsCovered
      domainsMissing
      overEmphasized
      underEmphasized
      verdict
    }
    streaks {
      strongestHabitId
      strongestStreak
      weakestHabitId
      weakestStreak
      momentum
    }
    gaps {
      area
      rationale
      severity
    }
    optimizationSuggestions {
      title
      rationale
      priority
      changeType
      targetHabitId
      suggestedFrequency
      suggestedTargetCount
      concreteSteps
      ageAppropriate
      developmentalContext
    }
    researchRelevance {
      topic
      relevantResearchIds
      relevantResearchTitles
      coverageGaps
    }
    dataSnapshot {
      habitsCount
      activeDailyCount
      activeWeeklyCount
      logCount
      windowDays
      overallAdherence
      linkedGoalCount
      linkedIssueCount
      researchPaperCount
      issueCount
      journalEntryCount
      observationCount
      teacherFeedbackCount
      contactFeedbackCount
      narrowTherapyHabitsCount
    }
    model
    createdAt
    updatedAt
  }
}
    `;

/**
 * __useGetRoutineAnalysisQuery__
 *
 * To run a query within a React component, call `useGetRoutineAnalysisQuery` and pass it any options that fit your needs.
 * When your component renders, `useGetRoutineAnalysisQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useGetRoutineAnalysisQuery({
 *   variables: {
 *      id: // value for 'id'
 *   },
 * });
 */
export function useGetRoutineAnalysisQuery(baseOptions: Apollo.QueryHookOptions<GetRoutineAnalysisQuery, GetRoutineAnalysisQueryVariables> & ({ variables: GetRoutineAnalysisQueryVariables; skip?: boolean; } | { skip: boolean; }) ) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<GetRoutineAnalysisQuery, GetRoutineAnalysisQueryVariables>(GetRoutineAnalysisDocument, options);
      }
export function useGetRoutineAnalysisLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<GetRoutineAnalysisQuery, GetRoutineAnalysisQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<GetRoutineAnalysisQuery, GetRoutineAnalysisQueryVariables>(GetRoutineAnalysisDocument, options);
        }
// @ts-ignore
export function useGetRoutineAnalysisSuspenseQuery(baseOptions?: Apollo.SuspenseQueryHookOptions<GetRoutineAnalysisQuery, GetRoutineAnalysisQueryVariables>): Apollo.UseSuspenseQueryResult<GetRoutineAnalysisQuery, GetRoutineAnalysisQueryVariables>;
export function useGetRoutineAnalysisSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<GetRoutineAnalysisQuery, GetRoutineAnalysisQueryVariables>): Apollo.UseSuspenseQueryResult<GetRoutineAnalysisQuery | undefined, GetRoutineAnalysisQueryVariables>;
export function useGetRoutineAnalysisSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<GetRoutineAnalysisQuery, GetRoutineAnalysisQueryVariables>) {
          const options = baseOptions === Apollo.skipToken ? baseOptions : {...defaultOptions, ...baseOptions}
          return Apollo.useSuspenseQuery<GetRoutineAnalysisQuery, GetRoutineAnalysisQueryVariables>(GetRoutineAnalysisDocument, options);
        }
export type GetRoutineAnalysisQueryHookResult = ReturnType<typeof useGetRoutineAnalysisQuery>;
export type GetRoutineAnalysisLazyQueryHookResult = ReturnType<typeof useGetRoutineAnalysisLazyQuery>;
export type GetRoutineAnalysisSuspenseQueryHookResult = ReturnType<typeof useGetRoutineAnalysisSuspenseQuery>;
export type GetRoutineAnalysisQueryResult = Apollo.QueryResult<GetRoutineAnalysisQuery, GetRoutineAnalysisQueryVariables>;
export const GetStoriesDocument = gql`
    query GetStories($goalId: Int!) {
  stories(goalId: $goalId) {
    id
    goalId
    createdBy
    content
    createdAt
    updatedAt
  }
}
    `;

/**
 * __useGetStoriesQuery__
 *
 * To run a query within a React component, call `useGetStoriesQuery` and pass it any options that fit your needs.
 * When your component renders, `useGetStoriesQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useGetStoriesQuery({
 *   variables: {
 *      goalId: // value for 'goalId'
 *   },
 * });
 */
export function useGetStoriesQuery(baseOptions: Apollo.QueryHookOptions<GetStoriesQuery, GetStoriesQueryVariables> & ({ variables: GetStoriesQueryVariables; skip?: boolean; } | { skip: boolean; }) ) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<GetStoriesQuery, GetStoriesQueryVariables>(GetStoriesDocument, options);
      }
export function useGetStoriesLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<GetStoriesQuery, GetStoriesQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<GetStoriesQuery, GetStoriesQueryVariables>(GetStoriesDocument, options);
        }
// @ts-ignore
export function useGetStoriesSuspenseQuery(baseOptions?: Apollo.SuspenseQueryHookOptions<GetStoriesQuery, GetStoriesQueryVariables>): Apollo.UseSuspenseQueryResult<GetStoriesQuery, GetStoriesQueryVariables>;
export function useGetStoriesSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<GetStoriesQuery, GetStoriesQueryVariables>): Apollo.UseSuspenseQueryResult<GetStoriesQuery | undefined, GetStoriesQueryVariables>;
export function useGetStoriesSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<GetStoriesQuery, GetStoriesQueryVariables>) {
          const options = baseOptions === Apollo.skipToken ? baseOptions : {...defaultOptions, ...baseOptions}
          return Apollo.useSuspenseQuery<GetStoriesQuery, GetStoriesQueryVariables>(GetStoriesDocument, options);
        }
export type GetStoriesQueryHookResult = ReturnType<typeof useGetStoriesQuery>;
export type GetStoriesLazyQueryHookResult = ReturnType<typeof useGetStoriesLazyQuery>;
export type GetStoriesSuspenseQueryHookResult = ReturnType<typeof useGetStoriesSuspenseQuery>;
export type GetStoriesQueryResult = Apollo.QueryResult<GetStoriesQuery, GetStoriesQueryVariables>;
export const GetStoryDocument = gql`
    query GetStory($id: Int!) {
  story(id: $id) {
    id
    goalId
    issueId
    feedbackId
    createdBy
    content
    language
    minutes
    audioKey
    audioUrl
    audioGeneratedAt
    createdAt
    updatedAt
    goal {
      id
      title
      slug
    }
    issue {
      id
      title
      familyMember {
        id
        firstName
        name
        slug
      }
    }
  }
}
    `;

/**
 * __useGetStoryQuery__
 *
 * To run a query within a React component, call `useGetStoryQuery` and pass it any options that fit your needs.
 * When your component renders, `useGetStoryQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useGetStoryQuery({
 *   variables: {
 *      id: // value for 'id'
 *   },
 * });
 */
export function useGetStoryQuery(baseOptions: Apollo.QueryHookOptions<GetStoryQuery, GetStoryQueryVariables> & ({ variables: GetStoryQueryVariables; skip?: boolean; } | { skip: boolean; }) ) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<GetStoryQuery, GetStoryQueryVariables>(GetStoryDocument, options);
      }
export function useGetStoryLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<GetStoryQuery, GetStoryQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<GetStoryQuery, GetStoryQueryVariables>(GetStoryDocument, options);
        }
// @ts-ignore
export function useGetStorySuspenseQuery(baseOptions?: Apollo.SuspenseQueryHookOptions<GetStoryQuery, GetStoryQueryVariables>): Apollo.UseSuspenseQueryResult<GetStoryQuery, GetStoryQueryVariables>;
export function useGetStorySuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<GetStoryQuery, GetStoryQueryVariables>): Apollo.UseSuspenseQueryResult<GetStoryQuery | undefined, GetStoryQueryVariables>;
export function useGetStorySuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<GetStoryQuery, GetStoryQueryVariables>) {
          const options = baseOptions === Apollo.skipToken ? baseOptions : {...defaultOptions, ...baseOptions}
          return Apollo.useSuspenseQuery<GetStoryQuery, GetStoryQueryVariables>(GetStoryDocument, options);
        }
export type GetStoryQueryHookResult = ReturnType<typeof useGetStoryQuery>;
export type GetStoryLazyQueryHookResult = ReturnType<typeof useGetStoryLazyQuery>;
export type GetStorySuspenseQueryHookResult = ReturnType<typeof useGetStorySuspenseQuery>;
export type GetStoryQueryResult = Apollo.QueryResult<GetStoryQuery, GetStoryQueryVariables>;
export const GetTeacherFeedbacksDocument = gql`
    query GetTeacherFeedbacks($familyMemberId: Int!) {
  teacherFeedbacks(familyMemberId: $familyMemberId) {
    id
    familyMemberId
    createdBy
    teacherName
    subject
    feedbackDate
    content
    tags
    source
    extracted
    createdAt
    updatedAt
    familyMember {
      id
      firstName
      name
    }
  }
}
    `;

/**
 * __useGetTeacherFeedbacksQuery__
 *
 * To run a query within a React component, call `useGetTeacherFeedbacksQuery` and pass it any options that fit your needs.
 * When your component renders, `useGetTeacherFeedbacksQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useGetTeacherFeedbacksQuery({
 *   variables: {
 *      familyMemberId: // value for 'familyMemberId'
 *   },
 * });
 */
export function useGetTeacherFeedbacksQuery(baseOptions: Apollo.QueryHookOptions<GetTeacherFeedbacksQuery, GetTeacherFeedbacksQueryVariables> & ({ variables: GetTeacherFeedbacksQueryVariables; skip?: boolean; } | { skip: boolean; }) ) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<GetTeacherFeedbacksQuery, GetTeacherFeedbacksQueryVariables>(GetTeacherFeedbacksDocument, options);
      }
export function useGetTeacherFeedbacksLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<GetTeacherFeedbacksQuery, GetTeacherFeedbacksQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<GetTeacherFeedbacksQuery, GetTeacherFeedbacksQueryVariables>(GetTeacherFeedbacksDocument, options);
        }
// @ts-ignore
export function useGetTeacherFeedbacksSuspenseQuery(baseOptions?: Apollo.SuspenseQueryHookOptions<GetTeacherFeedbacksQuery, GetTeacherFeedbacksQueryVariables>): Apollo.UseSuspenseQueryResult<GetTeacherFeedbacksQuery, GetTeacherFeedbacksQueryVariables>;
export function useGetTeacherFeedbacksSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<GetTeacherFeedbacksQuery, GetTeacherFeedbacksQueryVariables>): Apollo.UseSuspenseQueryResult<GetTeacherFeedbacksQuery | undefined, GetTeacherFeedbacksQueryVariables>;
export function useGetTeacherFeedbacksSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<GetTeacherFeedbacksQuery, GetTeacherFeedbacksQueryVariables>) {
          const options = baseOptions === Apollo.skipToken ? baseOptions : {...defaultOptions, ...baseOptions}
          return Apollo.useSuspenseQuery<GetTeacherFeedbacksQuery, GetTeacherFeedbacksQueryVariables>(GetTeacherFeedbacksDocument, options);
        }
export type GetTeacherFeedbacksQueryHookResult = ReturnType<typeof useGetTeacherFeedbacksQuery>;
export type GetTeacherFeedbacksLazyQueryHookResult = ReturnType<typeof useGetTeacherFeedbacksLazyQuery>;
export type GetTeacherFeedbacksSuspenseQueryHookResult = ReturnType<typeof useGetTeacherFeedbacksSuspenseQuery>;
export type GetTeacherFeedbacksQueryResult = Apollo.QueryResult<GetTeacherFeedbacksQuery, GetTeacherFeedbacksQueryVariables>;
export const GetTherapeuticQuestionsDocument = gql`
    query GetTherapeuticQuestions($goalId: Int, $issueId: Int, $journalEntryId: Int) {
  therapeuticQuestions(
    goalId: $goalId
    issueId: $issueId
    journalEntryId: $journalEntryId
  ) {
    id
    goalId
    issueId
    journalEntryId
    question
    researchId
    researchTitle
    rationale
    generatedAt
    createdAt
    updatedAt
  }
}
    `;

/**
 * __useGetTherapeuticQuestionsQuery__
 *
 * To run a query within a React component, call `useGetTherapeuticQuestionsQuery` and pass it any options that fit your needs.
 * When your component renders, `useGetTherapeuticQuestionsQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useGetTherapeuticQuestionsQuery({
 *   variables: {
 *      goalId: // value for 'goalId'
 *      issueId: // value for 'issueId'
 *      journalEntryId: // value for 'journalEntryId'
 *   },
 * });
 */
export function useGetTherapeuticQuestionsQuery(baseOptions?: Apollo.QueryHookOptions<GetTherapeuticQuestionsQuery, GetTherapeuticQuestionsQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<GetTherapeuticQuestionsQuery, GetTherapeuticQuestionsQueryVariables>(GetTherapeuticQuestionsDocument, options);
      }
export function useGetTherapeuticQuestionsLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<GetTherapeuticQuestionsQuery, GetTherapeuticQuestionsQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<GetTherapeuticQuestionsQuery, GetTherapeuticQuestionsQueryVariables>(GetTherapeuticQuestionsDocument, options);
        }
// @ts-ignore
export function useGetTherapeuticQuestionsSuspenseQuery(baseOptions?: Apollo.SuspenseQueryHookOptions<GetTherapeuticQuestionsQuery, GetTherapeuticQuestionsQueryVariables>): Apollo.UseSuspenseQueryResult<GetTherapeuticQuestionsQuery, GetTherapeuticQuestionsQueryVariables>;
export function useGetTherapeuticQuestionsSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<GetTherapeuticQuestionsQuery, GetTherapeuticQuestionsQueryVariables>): Apollo.UseSuspenseQueryResult<GetTherapeuticQuestionsQuery | undefined, GetTherapeuticQuestionsQueryVariables>;
export function useGetTherapeuticQuestionsSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<GetTherapeuticQuestionsQuery, GetTherapeuticQuestionsQueryVariables>) {
          const options = baseOptions === Apollo.skipToken ? baseOptions : {...defaultOptions, ...baseOptions}
          return Apollo.useSuspenseQuery<GetTherapeuticQuestionsQuery, GetTherapeuticQuestionsQueryVariables>(GetTherapeuticQuestionsDocument, options);
        }
export type GetTherapeuticQuestionsQueryHookResult = ReturnType<typeof useGetTherapeuticQuestionsQuery>;
export type GetTherapeuticQuestionsLazyQueryHookResult = ReturnType<typeof useGetTherapeuticQuestionsLazyQuery>;
export type GetTherapeuticQuestionsSuspenseQueryHookResult = ReturnType<typeof useGetTherapeuticQuestionsSuspenseQuery>;
export type GetTherapeuticQuestionsQueryResult = Apollo.QueryResult<GetTherapeuticQuestionsQuery, GetTherapeuticQuestionsQueryVariables>;
export const HealthcareMarkerTrendDocument = gql`
    query HealthcareMarkerTrend($query: String!, $markerName: String) {
  healthcareMarkerTrend(query: $query, markerName: $markerName) {
    markerId
    testId
    markerName
    value
    unit
    flag
    testDate
    fileName
    similarity
  }
}
    `;

/**
 * __useHealthcareMarkerTrendQuery__
 *
 * To run a query within a React component, call `useHealthcareMarkerTrendQuery` and pass it any options that fit your needs.
 * When your component renders, `useHealthcareMarkerTrendQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useHealthcareMarkerTrendQuery({
 *   variables: {
 *      query: // value for 'query'
 *      markerName: // value for 'markerName'
 *   },
 * });
 */
export function useHealthcareMarkerTrendQuery(baseOptions: Apollo.QueryHookOptions<HealthcareMarkerTrendQuery, HealthcareMarkerTrendQueryVariables> & ({ variables: HealthcareMarkerTrendQueryVariables; skip?: boolean; } | { skip: boolean; }) ) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<HealthcareMarkerTrendQuery, HealthcareMarkerTrendQueryVariables>(HealthcareMarkerTrendDocument, options);
      }
export function useHealthcareMarkerTrendLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<HealthcareMarkerTrendQuery, HealthcareMarkerTrendQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<HealthcareMarkerTrendQuery, HealthcareMarkerTrendQueryVariables>(HealthcareMarkerTrendDocument, options);
        }
// @ts-ignore
export function useHealthcareMarkerTrendSuspenseQuery(baseOptions?: Apollo.SuspenseQueryHookOptions<HealthcareMarkerTrendQuery, HealthcareMarkerTrendQueryVariables>): Apollo.UseSuspenseQueryResult<HealthcareMarkerTrendQuery, HealthcareMarkerTrendQueryVariables>;
export function useHealthcareMarkerTrendSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<HealthcareMarkerTrendQuery, HealthcareMarkerTrendQueryVariables>): Apollo.UseSuspenseQueryResult<HealthcareMarkerTrendQuery | undefined, HealthcareMarkerTrendQueryVariables>;
export function useHealthcareMarkerTrendSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<HealthcareMarkerTrendQuery, HealthcareMarkerTrendQueryVariables>) {
          const options = baseOptions === Apollo.skipToken ? baseOptions : {...defaultOptions, ...baseOptions}
          return Apollo.useSuspenseQuery<HealthcareMarkerTrendQuery, HealthcareMarkerTrendQueryVariables>(HealthcareMarkerTrendDocument, options);
        }
export type HealthcareMarkerTrendQueryHookResult = ReturnType<typeof useHealthcareMarkerTrendQuery>;
export type HealthcareMarkerTrendLazyQueryHookResult = ReturnType<typeof useHealthcareMarkerTrendLazyQuery>;
export type HealthcareMarkerTrendSuspenseQueryHookResult = ReturnType<typeof useHealthcareMarkerTrendSuspenseQuery>;
export type HealthcareMarkerTrendQueryResult = Apollo.QueryResult<HealthcareMarkerTrendQuery, HealthcareMarkerTrendQueryVariables>;
export const HealthcareSearchDocument = gql`
    query HealthcareSearch($query: String!) {
  healthcareSearch(query: $query) {
    tests {
      id
      testId
      content
      similarity
      fileName
      testDate
    }
    markers {
      markerId
      testId
      markerName
      content
      combinedScore
    }
    conditions {
      id
      entityId
      content
      similarity
    }
    medications {
      id
      entityId
      content
      similarity
    }
    symptoms {
      id
      entityId
      content
      similarity
    }
    appointments {
      id
      entityId
      content
      similarity
    }
  }
}
    `;

/**
 * __useHealthcareSearchQuery__
 *
 * To run a query within a React component, call `useHealthcareSearchQuery` and pass it any options that fit your needs.
 * When your component renders, `useHealthcareSearchQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useHealthcareSearchQuery({
 *   variables: {
 *      query: // value for 'query'
 *   },
 * });
 */
export function useHealthcareSearchQuery(baseOptions: Apollo.QueryHookOptions<HealthcareSearchQuery, HealthcareSearchQueryVariables> & ({ variables: HealthcareSearchQueryVariables; skip?: boolean; } | { skip: boolean; }) ) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<HealthcareSearchQuery, HealthcareSearchQueryVariables>(HealthcareSearchDocument, options);
      }
export function useHealthcareSearchLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<HealthcareSearchQuery, HealthcareSearchQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<HealthcareSearchQuery, HealthcareSearchQueryVariables>(HealthcareSearchDocument, options);
        }
// @ts-ignore
export function useHealthcareSearchSuspenseQuery(baseOptions?: Apollo.SuspenseQueryHookOptions<HealthcareSearchQuery, HealthcareSearchQueryVariables>): Apollo.UseSuspenseQueryResult<HealthcareSearchQuery, HealthcareSearchQueryVariables>;
export function useHealthcareSearchSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<HealthcareSearchQuery, HealthcareSearchQueryVariables>): Apollo.UseSuspenseQueryResult<HealthcareSearchQuery | undefined, HealthcareSearchQueryVariables>;
export function useHealthcareSearchSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<HealthcareSearchQuery, HealthcareSearchQueryVariables>) {
          const options = baseOptions === Apollo.skipToken ? baseOptions : {...defaultOptions, ...baseOptions}
          return Apollo.useSuspenseQuery<HealthcareSearchQuery, HealthcareSearchQueryVariables>(HealthcareSearchDocument, options);
        }
export type HealthcareSearchQueryHookResult = ReturnType<typeof useHealthcareSearchQuery>;
export type HealthcareSearchLazyQueryHookResult = ReturnType<typeof useHealthcareSearchLazyQuery>;
export type HealthcareSearchSuspenseQueryHookResult = ReturnType<typeof useHealthcareSearchSuspenseQuery>;
export type HealthcareSearchQueryResult = Apollo.QueryResult<HealthcareSearchQuery, HealthcareSearchQueryVariables>;
export const HealthcareSummaryDocument = gql`
    query HealthcareSummary {
  healthcareSummary {
    bloodTestsCount
    conditionsCount
    medicationsCount
    symptomsCount
    appointmentsCount
    doctorsCount
    memoryEntriesCount
    protocolsCount
  }
}
    `;

/**
 * __useHealthcareSummaryQuery__
 *
 * To run a query within a React component, call `useHealthcareSummaryQuery` and pass it any options that fit your needs.
 * When your component renders, `useHealthcareSummaryQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useHealthcareSummaryQuery({
 *   variables: {
 *   },
 * });
 */
export function useHealthcareSummaryQuery(baseOptions?: Apollo.QueryHookOptions<HealthcareSummaryQuery, HealthcareSummaryQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<HealthcareSummaryQuery, HealthcareSummaryQueryVariables>(HealthcareSummaryDocument, options);
      }
export function useHealthcareSummaryLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<HealthcareSummaryQuery, HealthcareSummaryQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<HealthcareSummaryQuery, HealthcareSummaryQueryVariables>(HealthcareSummaryDocument, options);
        }
// @ts-ignore
export function useHealthcareSummarySuspenseQuery(baseOptions?: Apollo.SuspenseQueryHookOptions<HealthcareSummaryQuery, HealthcareSummaryQueryVariables>): Apollo.UseSuspenseQueryResult<HealthcareSummaryQuery, HealthcareSummaryQueryVariables>;
export function useHealthcareSummarySuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<HealthcareSummaryQuery, HealthcareSummaryQueryVariables>): Apollo.UseSuspenseQueryResult<HealthcareSummaryQuery | undefined, HealthcareSummaryQueryVariables>;
export function useHealthcareSummarySuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<HealthcareSummaryQuery, HealthcareSummaryQueryVariables>) {
          const options = baseOptions === Apollo.skipToken ? baseOptions : {...defaultOptions, ...baseOptions}
          return Apollo.useSuspenseQuery<HealthcareSummaryQuery, HealthcareSummaryQueryVariables>(HealthcareSummaryDocument, options);
        }
export type HealthcareSummaryQueryHookResult = ReturnType<typeof useHealthcareSummaryQuery>;
export type HealthcareSummaryLazyQueryHookResult = ReturnType<typeof useHealthcareSummaryLazyQuery>;
export type HealthcareSummarySuspenseQueryHookResult = ReturnType<typeof useHealthcareSummarySuspenseQuery>;
export type HealthcareSummaryQueryResult = Apollo.QueryResult<HealthcareSummaryQuery, HealthcareSummaryQueryVariables>;
export const LatestBogdanDiscussionDocument = gql`
    query LatestBogdanDiscussion {
  latestBogdanDiscussion {
    id
    familyMemberId
    childAge
    behaviorSummary
    developmentalContext {
      stage
      explanation
      normalizedBehavior
      researchBasis
    }
    conversationStarters {
      opener
      context
      ageAppropriateNote
    }
    talkingPoints {
      point
      explanation
      researchBacking
      citations {
        researchId
        doi
        title
        year
        authors
        url
      }
      microScript {
        parentOpener
        childResponse
        parentFollowUp
      }
    }
    languageGuide {
      whatToSay {
        phrase
        reason
        alternative
      }
      whatNotToSay {
        phrase
        reason
        alternative
      }
    }
    anticipatedReactions {
      reaction
      likelihood
      howToRespond
    }
    followUpPlan {
      action
      timing
      description
    }
    citations {
      researchId
      doi
      title
      year
      authors
      url
    }
    critique {
      scores {
        romanianFluency
        actionability
        citationCoverage
        ageAppropriateness
        internalConsistency
        microScriptDepth
      }
      weakSections
      refined
    }
    model
    createdAt
  }
}
    `;

/**
 * __useLatestBogdanDiscussionQuery__
 *
 * To run a query within a React component, call `useLatestBogdanDiscussionQuery` and pass it any options that fit your needs.
 * When your component renders, `useLatestBogdanDiscussionQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useLatestBogdanDiscussionQuery({
 *   variables: {
 *   },
 * });
 */
export function useLatestBogdanDiscussionQuery(baseOptions?: Apollo.QueryHookOptions<LatestBogdanDiscussionQuery, LatestBogdanDiscussionQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<LatestBogdanDiscussionQuery, LatestBogdanDiscussionQueryVariables>(LatestBogdanDiscussionDocument, options);
      }
export function useLatestBogdanDiscussionLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<LatestBogdanDiscussionQuery, LatestBogdanDiscussionQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<LatestBogdanDiscussionQuery, LatestBogdanDiscussionQueryVariables>(LatestBogdanDiscussionDocument, options);
        }
// @ts-ignore
export function useLatestBogdanDiscussionSuspenseQuery(baseOptions?: Apollo.SuspenseQueryHookOptions<LatestBogdanDiscussionQuery, LatestBogdanDiscussionQueryVariables>): Apollo.UseSuspenseQueryResult<LatestBogdanDiscussionQuery, LatestBogdanDiscussionQueryVariables>;
export function useLatestBogdanDiscussionSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<LatestBogdanDiscussionQuery, LatestBogdanDiscussionQueryVariables>): Apollo.UseSuspenseQueryResult<LatestBogdanDiscussionQuery | undefined, LatestBogdanDiscussionQueryVariables>;
export function useLatestBogdanDiscussionSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<LatestBogdanDiscussionQuery, LatestBogdanDiscussionQueryVariables>) {
          const options = baseOptions === Apollo.skipToken ? baseOptions : {...defaultOptions, ...baseOptions}
          return Apollo.useSuspenseQuery<LatestBogdanDiscussionQuery, LatestBogdanDiscussionQueryVariables>(LatestBogdanDiscussionDocument, options);
        }
export type LatestBogdanDiscussionQueryHookResult = ReturnType<typeof useLatestBogdanDiscussionQuery>;
export type LatestBogdanDiscussionLazyQueryHookResult = ReturnType<typeof useLatestBogdanDiscussionLazyQuery>;
export type LatestBogdanDiscussionSuspenseQueryHookResult = ReturnType<typeof useLatestBogdanDiscussionSuspenseQuery>;
export type LatestBogdanDiscussionQueryResult = Apollo.QueryResult<LatestBogdanDiscussionQuery, LatestBogdanDiscussionQueryVariables>;
export const LinkContactToIssueDocument = gql`
    mutation LinkContactToIssue($issueId: Int!, $contactId: Int!) {
  linkContactToIssue(issueId: $issueId, contactId: $contactId) {
    id
    contact {
      id
      firstName
      lastName
      role
      slug
    }
  }
}
    `;
export type LinkContactToIssueMutationFn = Apollo.MutationFunction<LinkContactToIssueMutation, LinkContactToIssueMutationVariables>;

/**
 * __useLinkContactToIssueMutation__
 *
 * To run a mutation, you first call `useLinkContactToIssueMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useLinkContactToIssueMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [linkContactToIssueMutation, { data, loading, error }] = useLinkContactToIssueMutation({
 *   variables: {
 *      issueId: // value for 'issueId'
 *      contactId: // value for 'contactId'
 *   },
 * });
 */
export function useLinkContactToIssueMutation(baseOptions?: Apollo.MutationHookOptions<LinkContactToIssueMutation, LinkContactToIssueMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<LinkContactToIssueMutation, LinkContactToIssueMutationVariables>(LinkContactToIssueDocument, options);
      }
export type LinkContactToIssueMutationHookResult = ReturnType<typeof useLinkContactToIssueMutation>;
export type LinkContactToIssueMutationResult = Apollo.MutationResult<LinkContactToIssueMutation>;
export type LinkContactToIssueMutationOptions = Apollo.BaseMutationOptions<LinkContactToIssueMutation, LinkContactToIssueMutationVariables>;
export const LinkIssuesDocument = gql`
    mutation LinkIssues($issueId: Int!, $linkedIssueId: Int!, $linkType: String) {
  linkIssues(
    issueId: $issueId
    linkedIssueId: $linkedIssueId
    linkType: $linkType
  ) {
    id
    linkType
    issue {
      id
      title
      category
      severity
      familyMemberId
      createdAt
    }
  }
}
    `;
export type LinkIssuesMutationFn = Apollo.MutationFunction<LinkIssuesMutation, LinkIssuesMutationVariables>;

/**
 * __useLinkIssuesMutation__
 *
 * To run a mutation, you first call `useLinkIssuesMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useLinkIssuesMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [linkIssuesMutation, { data, loading, error }] = useLinkIssuesMutation({
 *   variables: {
 *      issueId: // value for 'issueId'
 *      linkedIssueId: // value for 'linkedIssueId'
 *      linkType: // value for 'linkType'
 *   },
 * });
 */
export function useLinkIssuesMutation(baseOptions?: Apollo.MutationHookOptions<LinkIssuesMutation, LinkIssuesMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<LinkIssuesMutation, LinkIssuesMutationVariables>(LinkIssuesDocument, options);
      }
export type LinkIssuesMutationHookResult = ReturnType<typeof useLinkIssuesMutation>;
export type LinkIssuesMutationResult = Apollo.MutationResult<LinkIssuesMutation>;
export type LinkIssuesMutationOptions = Apollo.BaseMutationOptions<LinkIssuesMutation, LinkIssuesMutationVariables>;
export const LockVaultDocument = gql`
    mutation LockVault {
  lockVault {
    unlocked
  }
}
    `;
export type LockVaultMutationFn = Apollo.MutationFunction<LockVaultMutation, LockVaultMutationVariables>;

/**
 * __useLockVaultMutation__
 *
 * To run a mutation, you first call `useLockVaultMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useLockVaultMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [lockVaultMutation, { data, loading, error }] = useLockVaultMutation({
 *   variables: {
 *   },
 * });
 */
export function useLockVaultMutation(baseOptions?: Apollo.MutationHookOptions<LockVaultMutation, LockVaultMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<LockVaultMutation, LockVaultMutationVariables>(LockVaultDocument, options);
      }
export type LockVaultMutationHookResult = ReturnType<typeof useLockVaultMutation>;
export type LockVaultMutationResult = Apollo.MutationResult<LockVaultMutation>;
export type LockVaultMutationOptions = Apollo.BaseMutationOptions<LockVaultMutation, LockVaultMutationVariables>;
export const LogGameCompletionDocument = gql`
    mutation LogGameCompletion($input: LogGameCompletionInput!) {
  logGameCompletion(input: $input) {
    id
    gameId
    durationSeconds
    responses
    linkedNoteId
    completedAt
  }
}
    `;
export type LogGameCompletionMutationFn = Apollo.MutationFunction<LogGameCompletionMutation, LogGameCompletionMutationVariables>;

/**
 * __useLogGameCompletionMutation__
 *
 * To run a mutation, you first call `useLogGameCompletionMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useLogGameCompletionMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [logGameCompletionMutation, { data, loading, error }] = useLogGameCompletionMutation({
 *   variables: {
 *      input: // value for 'input'
 *   },
 * });
 */
export function useLogGameCompletionMutation(baseOptions?: Apollo.MutationHookOptions<LogGameCompletionMutation, LogGameCompletionMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<LogGameCompletionMutation, LogGameCompletionMutationVariables>(LogGameCompletionDocument, options);
      }
export type LogGameCompletionMutationHookResult = ReturnType<typeof useLogGameCompletionMutation>;
export type LogGameCompletionMutationResult = Apollo.MutationResult<LogGameCompletionMutation>;
export type LogGameCompletionMutationOptions = Apollo.BaseMutationOptions<LogGameCompletionMutation, LogGameCompletionMutationVariables>;
export const LogHabitDocument = gql`
    mutation LogHabit($habitId: Int!, $loggedDate: String!, $count: Int, $notes: String) {
  logHabit(
    habitId: $habitId
    loggedDate: $loggedDate
    count: $count
    notes: $notes
  ) {
    id
    habitId
    loggedDate
    count
    notes
    createdAt
  }
}
    `;
export type LogHabitMutationFn = Apollo.MutationFunction<LogHabitMutation, LogHabitMutationVariables>;

/**
 * __useLogHabitMutation__
 *
 * To run a mutation, you first call `useLogHabitMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useLogHabitMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [logHabitMutation, { data, loading, error }] = useLogHabitMutation({
 *   variables: {
 *      habitId: // value for 'habitId'
 *      loggedDate: // value for 'loggedDate'
 *      count: // value for 'count'
 *      notes: // value for 'notes'
 *   },
 * });
 */
export function useLogHabitMutation(baseOptions?: Apollo.MutationHookOptions<LogHabitMutation, LogHabitMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<LogHabitMutation, LogHabitMutationVariables>(LogHabitDocument, options);
      }
export type LogHabitMutationHookResult = ReturnType<typeof useLogHabitMutation>;
export type LogHabitMutationResult = Apollo.MutationResult<LogHabitMutation>;
export type LogHabitMutationOptions = Apollo.BaseMutationOptions<LogHabitMutation, LogHabitMutationVariables>;
export const MedicationsDocument = gql`
    query Medications {
  medications {
    id
    familyMemberId
    name
    dosage
    frequency
    notes
    startDate
    endDate
    createdAt
    familyMember {
      id
      slug
      firstName
      name
    }
  }
}
    `;

/**
 * __useMedicationsQuery__
 *
 * To run a query within a React component, call `useMedicationsQuery` and pass it any options that fit your needs.
 * When your component renders, `useMedicationsQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useMedicationsQuery({
 *   variables: {
 *   },
 * });
 */
export function useMedicationsQuery(baseOptions?: Apollo.QueryHookOptions<MedicationsQuery, MedicationsQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<MedicationsQuery, MedicationsQueryVariables>(MedicationsDocument, options);
      }
export function useMedicationsLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<MedicationsQuery, MedicationsQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<MedicationsQuery, MedicationsQueryVariables>(MedicationsDocument, options);
        }
// @ts-ignore
export function useMedicationsSuspenseQuery(baseOptions?: Apollo.SuspenseQueryHookOptions<MedicationsQuery, MedicationsQueryVariables>): Apollo.UseSuspenseQueryResult<MedicationsQuery, MedicationsQueryVariables>;
export function useMedicationsSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<MedicationsQuery, MedicationsQueryVariables>): Apollo.UseSuspenseQueryResult<MedicationsQuery | undefined, MedicationsQueryVariables>;
export function useMedicationsSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<MedicationsQuery, MedicationsQueryVariables>) {
          const options = baseOptions === Apollo.skipToken ? baseOptions : {...defaultOptions, ...baseOptions}
          return Apollo.useSuspenseQuery<MedicationsQuery, MedicationsQueryVariables>(MedicationsDocument, options);
        }
export type MedicationsQueryHookResult = ReturnType<typeof useMedicationsQuery>;
export type MedicationsLazyQueryHookResult = ReturnType<typeof useMedicationsLazyQuery>;
export type MedicationsSuspenseQueryHookResult = ReturnType<typeof useMedicationsSuspenseQuery>;
export type MedicationsQueryResult = Apollo.QueryResult<MedicationsQuery, MedicationsQueryVariables>;
export const MemoryEntriesDocument = gql`
    query MemoryEntries {
  memoryEntries {
    id
    category
    description
    context
    protocolId
    overallScore
    shortTermScore
    longTermScore
    workingMemoryScore
    recallSpeed
    loggedAt
    createdAt
  }
  memoryBaseline {
    id
    overallScore
    shortTermScore
    longTermScore
    workingMemoryScore
    recallSpeed
    recordedAt
  }
}
    `;

/**
 * __useMemoryEntriesQuery__
 *
 * To run a query within a React component, call `useMemoryEntriesQuery` and pass it any options that fit your needs.
 * When your component renders, `useMemoryEntriesQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useMemoryEntriesQuery({
 *   variables: {
 *   },
 * });
 */
export function useMemoryEntriesQuery(baseOptions?: Apollo.QueryHookOptions<MemoryEntriesQuery, MemoryEntriesQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<MemoryEntriesQuery, MemoryEntriesQueryVariables>(MemoryEntriesDocument, options);
      }
export function useMemoryEntriesLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<MemoryEntriesQuery, MemoryEntriesQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<MemoryEntriesQuery, MemoryEntriesQueryVariables>(MemoryEntriesDocument, options);
        }
// @ts-ignore
export function useMemoryEntriesSuspenseQuery(baseOptions?: Apollo.SuspenseQueryHookOptions<MemoryEntriesQuery, MemoryEntriesQueryVariables>): Apollo.UseSuspenseQueryResult<MemoryEntriesQuery, MemoryEntriesQueryVariables>;
export function useMemoryEntriesSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<MemoryEntriesQuery, MemoryEntriesQueryVariables>): Apollo.UseSuspenseQueryResult<MemoryEntriesQuery | undefined, MemoryEntriesQueryVariables>;
export function useMemoryEntriesSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<MemoryEntriesQuery, MemoryEntriesQueryVariables>) {
          const options = baseOptions === Apollo.skipToken ? baseOptions : {...defaultOptions, ...baseOptions}
          return Apollo.useSuspenseQuery<MemoryEntriesQuery, MemoryEntriesQueryVariables>(MemoryEntriesDocument, options);
        }
export type MemoryEntriesQueryHookResult = ReturnType<typeof useMemoryEntriesQuery>;
export type MemoryEntriesLazyQueryHookResult = ReturnType<typeof useMemoryEntriesLazyQuery>;
export type MemoryEntriesSuspenseQueryHookResult = ReturnType<typeof useMemoryEntriesSuspenseQuery>;
export type MemoryEntriesQueryResult = Apollo.QueryResult<MemoryEntriesQuery, MemoryEntriesQueryVariables>;
export const ProtocolDocument = gql`
    query Protocol($slug: String!) {
  protocol(slug: $slug) {
    protocol {
      id
      name
      slug
      targetAreas
      status
      notes
      startDate
      endDate
      supplementCount
      createdAt
      updatedAt
    }
    supplements {
      id
      name
      dosage
      frequency
      mechanism
      targetAreas
      notes
      url
      createdAt
    }
    baseline {
      id
      memoryScore
      focusScore
      processingSpeedScore
      moodScore
      sleepScore
      recordedAt
    }
    checkIns {
      id
      memoryScore
      focusScore
      processingSpeedScore
      moodScore
      sleepScore
      sideEffects
      notes
      recordedAt
    }
  }
}
    `;

/**
 * __useProtocolQuery__
 *
 * To run a query within a React component, call `useProtocolQuery` and pass it any options that fit your needs.
 * When your component renders, `useProtocolQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useProtocolQuery({
 *   variables: {
 *      slug: // value for 'slug'
 *   },
 * });
 */
export function useProtocolQuery(baseOptions: Apollo.QueryHookOptions<ProtocolQuery, ProtocolQueryVariables> & ({ variables: ProtocolQueryVariables; skip?: boolean; } | { skip: boolean; }) ) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<ProtocolQuery, ProtocolQueryVariables>(ProtocolDocument, options);
      }
export function useProtocolLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<ProtocolQuery, ProtocolQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<ProtocolQuery, ProtocolQueryVariables>(ProtocolDocument, options);
        }
// @ts-ignore
export function useProtocolSuspenseQuery(baseOptions?: Apollo.SuspenseQueryHookOptions<ProtocolQuery, ProtocolQueryVariables>): Apollo.UseSuspenseQueryResult<ProtocolQuery, ProtocolQueryVariables>;
export function useProtocolSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<ProtocolQuery, ProtocolQueryVariables>): Apollo.UseSuspenseQueryResult<ProtocolQuery | undefined, ProtocolQueryVariables>;
export function useProtocolSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<ProtocolQuery, ProtocolQueryVariables>) {
          const options = baseOptions === Apollo.skipToken ? baseOptions : {...defaultOptions, ...baseOptions}
          return Apollo.useSuspenseQuery<ProtocolQuery, ProtocolQueryVariables>(ProtocolDocument, options);
        }
export type ProtocolQueryHookResult = ReturnType<typeof useProtocolQuery>;
export type ProtocolLazyQueryHookResult = ReturnType<typeof useProtocolLazyQuery>;
export type ProtocolSuspenseQueryHookResult = ReturnType<typeof useProtocolSuspenseQuery>;
export type ProtocolQueryResult = Apollo.QueryResult<ProtocolQuery, ProtocolQueryVariables>;
export const ProtocolsDocument = gql`
    query Protocols {
  protocols {
    id
    name
    slug
    targetAreas
    status
    notes
    startDate
    endDate
    supplementCount
    createdAt
  }
}
    `;

/**
 * __useProtocolsQuery__
 *
 * To run a query within a React component, call `useProtocolsQuery` and pass it any options that fit your needs.
 * When your component renders, `useProtocolsQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useProtocolsQuery({
 *   variables: {
 *   },
 * });
 */
export function useProtocolsQuery(baseOptions?: Apollo.QueryHookOptions<ProtocolsQuery, ProtocolsQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<ProtocolsQuery, ProtocolsQueryVariables>(ProtocolsDocument, options);
      }
export function useProtocolsLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<ProtocolsQuery, ProtocolsQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<ProtocolsQuery, ProtocolsQueryVariables>(ProtocolsDocument, options);
        }
// @ts-ignore
export function useProtocolsSuspenseQuery(baseOptions?: Apollo.SuspenseQueryHookOptions<ProtocolsQuery, ProtocolsQueryVariables>): Apollo.UseSuspenseQueryResult<ProtocolsQuery, ProtocolsQueryVariables>;
export function useProtocolsSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<ProtocolsQuery, ProtocolsQueryVariables>): Apollo.UseSuspenseQueryResult<ProtocolsQuery | undefined, ProtocolsQueryVariables>;
export function useProtocolsSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<ProtocolsQuery, ProtocolsQueryVariables>) {
          const options = baseOptions === Apollo.skipToken ? baseOptions : {...defaultOptions, ...baseOptions}
          return Apollo.useSuspenseQuery<ProtocolsQuery, ProtocolsQueryVariables>(ProtocolsDocument, options);
        }
export type ProtocolsQueryHookResult = ReturnType<typeof useProtocolsQuery>;
export type ProtocolsLazyQueryHookResult = ReturnType<typeof useProtocolsLazyQuery>;
export type ProtocolsSuspenseQueryHookResult = ReturnType<typeof useProtocolsSuspenseQuery>;
export type ProtocolsQueryResult = Apollo.QueryResult<ProtocolsQuery, ProtocolsQueryVariables>;
export const RecordCognitiveBaselineDocument = gql`
    mutation RecordCognitiveBaseline($protocolId: ID!, $input: CognitiveScoresInput!) {
  recordCognitiveBaseline(protocolId: $protocolId, input: $input) {
    id
    memoryScore
    focusScore
    processingSpeedScore
    moodScore
    sleepScore
    recordedAt
  }
}
    `;
export type RecordCognitiveBaselineMutationFn = Apollo.MutationFunction<RecordCognitiveBaselineMutation, RecordCognitiveBaselineMutationVariables>;

/**
 * __useRecordCognitiveBaselineMutation__
 *
 * To run a mutation, you first call `useRecordCognitiveBaselineMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useRecordCognitiveBaselineMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [recordCognitiveBaselineMutation, { data, loading, error }] = useRecordCognitiveBaselineMutation({
 *   variables: {
 *      protocolId: // value for 'protocolId'
 *      input: // value for 'input'
 *   },
 * });
 */
export function useRecordCognitiveBaselineMutation(baseOptions?: Apollo.MutationHookOptions<RecordCognitiveBaselineMutation, RecordCognitiveBaselineMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<RecordCognitiveBaselineMutation, RecordCognitiveBaselineMutationVariables>(RecordCognitiveBaselineDocument, options);
      }
export type RecordCognitiveBaselineMutationHookResult = ReturnType<typeof useRecordCognitiveBaselineMutation>;
export type RecordCognitiveBaselineMutationResult = Apollo.MutationResult<RecordCognitiveBaselineMutation>;
export type RecordCognitiveBaselineMutationOptions = Apollo.BaseMutationOptions<RecordCognitiveBaselineMutation, RecordCognitiveBaselineMutationVariables>;
export const RecordCognitiveCheckInDocument = gql`
    mutation RecordCognitiveCheckIn($protocolId: ID!, $input: CognitiveCheckInInput!) {
  recordCognitiveCheckIn(protocolId: $protocolId, input: $input) {
    id
    memoryScore
    focusScore
    processingSpeedScore
    moodScore
    sleepScore
    sideEffects
    notes
    recordedAt
  }
}
    `;
export type RecordCognitiveCheckInMutationFn = Apollo.MutationFunction<RecordCognitiveCheckInMutation, RecordCognitiveCheckInMutationVariables>;

/**
 * __useRecordCognitiveCheckInMutation__
 *
 * To run a mutation, you first call `useRecordCognitiveCheckInMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useRecordCognitiveCheckInMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [recordCognitiveCheckInMutation, { data, loading, error }] = useRecordCognitiveCheckInMutation({
 *   variables: {
 *      protocolId: // value for 'protocolId'
 *      input: // value for 'input'
 *   },
 * });
 */
export function useRecordCognitiveCheckInMutation(baseOptions?: Apollo.MutationHookOptions<RecordCognitiveCheckInMutation, RecordCognitiveCheckInMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<RecordCognitiveCheckInMutation, RecordCognitiveCheckInMutationVariables>(RecordCognitiveCheckInDocument, options);
      }
export type RecordCognitiveCheckInMutationHookResult = ReturnType<typeof useRecordCognitiveCheckInMutation>;
export type RecordCognitiveCheckInMutationResult = Apollo.MutationResult<RecordCognitiveCheckInMutation>;
export type RecordCognitiveCheckInMutationOptions = Apollo.BaseMutationOptions<RecordCognitiveCheckInMutation, RecordCognitiveCheckInMutationVariables>;
export const SendConversationMessageDocument = gql`
    mutation SendConversationMessage($conversationId: Int!, $message: String!) {
  sendConversationMessage(conversationId: $conversationId, message: $message) {
    id
    issueId
    userId
    title
    createdAt
    updatedAt
    messages {
      id
      conversationId
      role
      content
      createdAt
    }
  }
}
    `;
export type SendConversationMessageMutationFn = Apollo.MutationFunction<SendConversationMessageMutation, SendConversationMessageMutationVariables>;

/**
 * __useSendConversationMessageMutation__
 *
 * To run a mutation, you first call `useSendConversationMessageMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useSendConversationMessageMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [sendConversationMessageMutation, { data, loading, error }] = useSendConversationMessageMutation({
 *   variables: {
 *      conversationId: // value for 'conversationId'
 *      message: // value for 'message'
 *   },
 * });
 */
export function useSendConversationMessageMutation(baseOptions?: Apollo.MutationHookOptions<SendConversationMessageMutation, SendConversationMessageMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<SendConversationMessageMutation, SendConversationMessageMutationVariables>(SendConversationMessageDocument, options);
      }
export type SendConversationMessageMutationHookResult = ReturnType<typeof useSendConversationMessageMutation>;
export type SendConversationMessageMutationResult = Apollo.MutationResult<SendConversationMessageMutation>;
export type SendConversationMessageMutationOptions = Apollo.BaseMutationOptions<SendConversationMessageMutation, SendConversationMessageMutationVariables>;
export const SendHealthcareChatMessageDocument = gql`
    mutation SendHealthcareChatMessage($input: HealthcareChatInput!) {
  sendHealthcareChatMessage(input: $input) {
    answer
    intent
    intentConfidence
    retrievalSources
    citations
    guardPassed
    guardIssues
  }
}
    `;
export type SendHealthcareChatMessageMutationFn = Apollo.MutationFunction<SendHealthcareChatMessageMutation, SendHealthcareChatMessageMutationVariables>;

/**
 * __useSendHealthcareChatMessageMutation__
 *
 * To run a mutation, you first call `useSendHealthcareChatMessageMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useSendHealthcareChatMessageMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [sendHealthcareChatMessageMutation, { data, loading, error }] = useSendHealthcareChatMessageMutation({
 *   variables: {
 *      input: // value for 'input'
 *   },
 * });
 */
export function useSendHealthcareChatMessageMutation(baseOptions?: Apollo.MutationHookOptions<SendHealthcareChatMessageMutation, SendHealthcareChatMessageMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<SendHealthcareChatMessageMutation, SendHealthcareChatMessageMutationVariables>(SendHealthcareChatMessageDocument, options);
      }
export type SendHealthcareChatMessageMutationHookResult = ReturnType<typeof useSendHealthcareChatMessageMutation>;
export type SendHealthcareChatMessageMutationResult = Apollo.MutationResult<SendHealthcareChatMessageMutation>;
export type SendHealthcareChatMessageMutationOptions = Apollo.BaseMutationOptions<SendHealthcareChatMessageMutation, SendHealthcareChatMessageMutationVariables>;
export const SetMemoryBaselineDocument = gql`
    mutation SetMemoryBaseline($input: SetMemoryBaselineInput!) {
  setMemoryBaseline(input: $input) {
    id
    overallScore
    shortTermScore
    longTermScore
    workingMemoryScore
    recallSpeed
    recordedAt
  }
}
    `;
export type SetMemoryBaselineMutationFn = Apollo.MutationFunction<SetMemoryBaselineMutation, SetMemoryBaselineMutationVariables>;

/**
 * __useSetMemoryBaselineMutation__
 *
 * To run a mutation, you first call `useSetMemoryBaselineMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useSetMemoryBaselineMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [setMemoryBaselineMutation, { data, loading, error }] = useSetMemoryBaselineMutation({
 *   variables: {
 *      input: // value for 'input'
 *   },
 * });
 */
export function useSetMemoryBaselineMutation(baseOptions?: Apollo.MutationHookOptions<SetMemoryBaselineMutation, SetMemoryBaselineMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<SetMemoryBaselineMutation, SetMemoryBaselineMutationVariables>(SetMemoryBaselineDocument, options);
      }
export type SetMemoryBaselineMutationHookResult = ReturnType<typeof useSetMemoryBaselineMutation>;
export type SetMemoryBaselineMutationResult = Apollo.MutationResult<SetMemoryBaselineMutation>;
export type SetMemoryBaselineMutationOptions = Apollo.BaseMutationOptions<SetMemoryBaselineMutation, SetMemoryBaselineMutationVariables>;
export const ShareFamilyMemberDocument = gql`
    mutation ShareFamilyMember($familyMemberId: Int!, $email: String!, $role: FamilyMemberShareRole) {
  shareFamilyMember(familyMemberId: $familyMemberId, email: $email, role: $role) {
    familyMemberId
    email
    role
    createdAt
  }
}
    `;
export type ShareFamilyMemberMutationFn = Apollo.MutationFunction<ShareFamilyMemberMutation, ShareFamilyMemberMutationVariables>;

/**
 * __useShareFamilyMemberMutation__
 *
 * To run a mutation, you first call `useShareFamilyMemberMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useShareFamilyMemberMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [shareFamilyMemberMutation, { data, loading, error }] = useShareFamilyMemberMutation({
 *   variables: {
 *      familyMemberId: // value for 'familyMemberId'
 *      email: // value for 'email'
 *      role: // value for 'role'
 *   },
 * });
 */
export function useShareFamilyMemberMutation(baseOptions?: Apollo.MutationHookOptions<ShareFamilyMemberMutation, ShareFamilyMemberMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<ShareFamilyMemberMutation, ShareFamilyMemberMutationVariables>(ShareFamilyMemberDocument, options);
      }
export type ShareFamilyMemberMutationHookResult = ReturnType<typeof useShareFamilyMemberMutation>;
export type ShareFamilyMemberMutationResult = Apollo.MutationResult<ShareFamilyMemberMutation>;
export type ShareFamilyMemberMutationOptions = Apollo.BaseMutationOptions<ShareFamilyMemberMutation, ShareFamilyMemberMutationVariables>;
export const SymptomsDocument = gql`
    query Symptoms {
  symptoms {
    id
    description
    severity
    loggedAt
    createdAt
  }
}
    `;

/**
 * __useSymptomsQuery__
 *
 * To run a query within a React component, call `useSymptomsQuery` and pass it any options that fit your needs.
 * When your component renders, `useSymptomsQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useSymptomsQuery({
 *   variables: {
 *   },
 * });
 */
export function useSymptomsQuery(baseOptions?: Apollo.QueryHookOptions<SymptomsQuery, SymptomsQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<SymptomsQuery, SymptomsQueryVariables>(SymptomsDocument, options);
      }
export function useSymptomsLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<SymptomsQuery, SymptomsQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<SymptomsQuery, SymptomsQueryVariables>(SymptomsDocument, options);
        }
// @ts-ignore
export function useSymptomsSuspenseQuery(baseOptions?: Apollo.SuspenseQueryHookOptions<SymptomsQuery, SymptomsQueryVariables>): Apollo.UseSuspenseQueryResult<SymptomsQuery, SymptomsQueryVariables>;
export function useSymptomsSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<SymptomsQuery, SymptomsQueryVariables>): Apollo.UseSuspenseQueryResult<SymptomsQuery | undefined, SymptomsQueryVariables>;
export function useSymptomsSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<SymptomsQuery, SymptomsQueryVariables>) {
          const options = baseOptions === Apollo.skipToken ? baseOptions : {...defaultOptions, ...baseOptions}
          return Apollo.useSuspenseQuery<SymptomsQuery, SymptomsQueryVariables>(SymptomsDocument, options);
        }
export type SymptomsQueryHookResult = ReturnType<typeof useSymptomsQuery>;
export type SymptomsLazyQueryHookResult = ReturnType<typeof useSymptomsLazyQuery>;
export type SymptomsSuspenseQueryHookResult = ReturnType<typeof useSymptomsSuspenseQuery>;
export type SymptomsQueryResult = Apollo.QueryResult<SymptomsQuery, SymptomsQueryVariables>;
export const TagLanguageDocument = gql`
    query TagLanguage($tag: String!) {
  tagLanguage(tag: $tag)
}
    `;

/**
 * __useTagLanguageQuery__
 *
 * To run a query within a React component, call `useTagLanguageQuery` and pass it any options that fit your needs.
 * When your component renders, `useTagLanguageQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useTagLanguageQuery({
 *   variables: {
 *      tag: // value for 'tag'
 *   },
 * });
 */
export function useTagLanguageQuery(baseOptions: Apollo.QueryHookOptions<TagLanguageQuery, TagLanguageQueryVariables> & ({ variables: TagLanguageQueryVariables; skip?: boolean; } | { skip: boolean; }) ) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<TagLanguageQuery, TagLanguageQueryVariables>(TagLanguageDocument, options);
      }
export function useTagLanguageLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<TagLanguageQuery, TagLanguageQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<TagLanguageQuery, TagLanguageQueryVariables>(TagLanguageDocument, options);
        }
// @ts-ignore
export function useTagLanguageSuspenseQuery(baseOptions?: Apollo.SuspenseQueryHookOptions<TagLanguageQuery, TagLanguageQueryVariables>): Apollo.UseSuspenseQueryResult<TagLanguageQuery, TagLanguageQueryVariables>;
export function useTagLanguageSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<TagLanguageQuery, TagLanguageQueryVariables>): Apollo.UseSuspenseQueryResult<TagLanguageQuery | undefined, TagLanguageQueryVariables>;
export function useTagLanguageSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<TagLanguageQuery, TagLanguageQueryVariables>) {
          const options = baseOptions === Apollo.skipToken ? baseOptions : {...defaultOptions, ...baseOptions}
          return Apollo.useSuspenseQuery<TagLanguageQuery, TagLanguageQueryVariables>(TagLanguageDocument, options);
        }
export type TagLanguageQueryHookResult = ReturnType<typeof useTagLanguageQuery>;
export type TagLanguageLazyQueryHookResult = ReturnType<typeof useTagLanguageLazyQuery>;
export type TagLanguageSuspenseQueryHookResult = ReturnType<typeof useTagLanguageSuspenseQuery>;
export type TagLanguageQueryResult = Apollo.QueryResult<TagLanguageQuery, TagLanguageQueryVariables>;
export const SetTagLanguageDocument = gql`
    mutation SetTagLanguage($tag: String!, $language: String!) {
  setTagLanguage(tag: $tag, language: $language)
}
    `;
export type SetTagLanguageMutationFn = Apollo.MutationFunction<SetTagLanguageMutation, SetTagLanguageMutationVariables>;

/**
 * __useSetTagLanguageMutation__
 *
 * To run a mutation, you first call `useSetTagLanguageMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useSetTagLanguageMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [setTagLanguageMutation, { data, loading, error }] = useSetTagLanguageMutation({
 *   variables: {
 *      tag: // value for 'tag'
 *      language: // value for 'language'
 *   },
 * });
 */
export function useSetTagLanguageMutation(baseOptions?: Apollo.MutationHookOptions<SetTagLanguageMutation, SetTagLanguageMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<SetTagLanguageMutation, SetTagLanguageMutationVariables>(SetTagLanguageDocument, options);
      }
export type SetTagLanguageMutationHookResult = ReturnType<typeof useSetTagLanguageMutation>;
export type SetTagLanguageMutationResult = Apollo.MutationResult<SetTagLanguageMutation>;
export type SetTagLanguageMutationOptions = Apollo.BaseMutationOptions<SetTagLanguageMutation, SetTagLanguageMutationVariables>;
export const UnlinkContactFromIssueDocument = gql`
    mutation UnlinkContactFromIssue($issueId: Int!, $contactId: Int!) {
  unlinkContactFromIssue(issueId: $issueId, contactId: $contactId) {
    success
  }
}
    `;
export type UnlinkContactFromIssueMutationFn = Apollo.MutationFunction<UnlinkContactFromIssueMutation, UnlinkContactFromIssueMutationVariables>;

/**
 * __useUnlinkContactFromIssueMutation__
 *
 * To run a mutation, you first call `useUnlinkContactFromIssueMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useUnlinkContactFromIssueMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [unlinkContactFromIssueMutation, { data, loading, error }] = useUnlinkContactFromIssueMutation({
 *   variables: {
 *      issueId: // value for 'issueId'
 *      contactId: // value for 'contactId'
 *   },
 * });
 */
export function useUnlinkContactFromIssueMutation(baseOptions?: Apollo.MutationHookOptions<UnlinkContactFromIssueMutation, UnlinkContactFromIssueMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<UnlinkContactFromIssueMutation, UnlinkContactFromIssueMutationVariables>(UnlinkContactFromIssueDocument, options);
      }
export type UnlinkContactFromIssueMutationHookResult = ReturnType<typeof useUnlinkContactFromIssueMutation>;
export type UnlinkContactFromIssueMutationResult = Apollo.MutationResult<UnlinkContactFromIssueMutation>;
export type UnlinkContactFromIssueMutationOptions = Apollo.BaseMutationOptions<UnlinkContactFromIssueMutation, UnlinkContactFromIssueMutationVariables>;
export const UnlinkGoalFamilyMemberDocument = gql`
    mutation UnlinkGoalFamilyMember($id: Int!) {
  unlinkGoalFamilyMember(id: $id) {
    id
    familyMemberId
    familyMember {
      id
      firstName
      name
      relationship
    }
  }
}
    `;
export type UnlinkGoalFamilyMemberMutationFn = Apollo.MutationFunction<UnlinkGoalFamilyMemberMutation, UnlinkGoalFamilyMemberMutationVariables>;

/**
 * __useUnlinkGoalFamilyMemberMutation__
 *
 * To run a mutation, you first call `useUnlinkGoalFamilyMemberMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useUnlinkGoalFamilyMemberMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [unlinkGoalFamilyMemberMutation, { data, loading, error }] = useUnlinkGoalFamilyMemberMutation({
 *   variables: {
 *      id: // value for 'id'
 *   },
 * });
 */
export function useUnlinkGoalFamilyMemberMutation(baseOptions?: Apollo.MutationHookOptions<UnlinkGoalFamilyMemberMutation, UnlinkGoalFamilyMemberMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<UnlinkGoalFamilyMemberMutation, UnlinkGoalFamilyMemberMutationVariables>(UnlinkGoalFamilyMemberDocument, options);
      }
export type UnlinkGoalFamilyMemberMutationHookResult = ReturnType<typeof useUnlinkGoalFamilyMemberMutation>;
export type UnlinkGoalFamilyMemberMutationResult = Apollo.MutationResult<UnlinkGoalFamilyMemberMutation>;
export type UnlinkGoalFamilyMemberMutationOptions = Apollo.BaseMutationOptions<UnlinkGoalFamilyMemberMutation, UnlinkGoalFamilyMemberMutationVariables>;
export const UnlinkIssuesDocument = gql`
    mutation UnlinkIssues($issueId: Int!, $linkedIssueId: Int!) {
  unlinkIssues(issueId: $issueId, linkedIssueId: $linkedIssueId) {
    success
  }
}
    `;
export type UnlinkIssuesMutationFn = Apollo.MutationFunction<UnlinkIssuesMutation, UnlinkIssuesMutationVariables>;

/**
 * __useUnlinkIssuesMutation__
 *
 * To run a mutation, you first call `useUnlinkIssuesMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useUnlinkIssuesMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [unlinkIssuesMutation, { data, loading, error }] = useUnlinkIssuesMutation({
 *   variables: {
 *      issueId: // value for 'issueId'
 *      linkedIssueId: // value for 'linkedIssueId'
 *   },
 * });
 */
export function useUnlinkIssuesMutation(baseOptions?: Apollo.MutationHookOptions<UnlinkIssuesMutation, UnlinkIssuesMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<UnlinkIssuesMutation, UnlinkIssuesMutationVariables>(UnlinkIssuesDocument, options);
      }
export type UnlinkIssuesMutationHookResult = ReturnType<typeof useUnlinkIssuesMutation>;
export type UnlinkIssuesMutationResult = Apollo.MutationResult<UnlinkIssuesMutation>;
export type UnlinkIssuesMutationOptions = Apollo.BaseMutationOptions<UnlinkIssuesMutation, UnlinkIssuesMutationVariables>;
export const UnlockVaultDocument = gql`
    mutation UnlockVault($pin: String!) {
  unlockVault(pin: $pin) {
    success
    unlocked
    message
  }
}
    `;
export type UnlockVaultMutationFn = Apollo.MutationFunction<UnlockVaultMutation, UnlockVaultMutationVariables>;

/**
 * __useUnlockVaultMutation__
 *
 * To run a mutation, you first call `useUnlockVaultMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useUnlockVaultMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [unlockVaultMutation, { data, loading, error }] = useUnlockVaultMutation({
 *   variables: {
 *      pin: // value for 'pin'
 *   },
 * });
 */
export function useUnlockVaultMutation(baseOptions?: Apollo.MutationHookOptions<UnlockVaultMutation, UnlockVaultMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<UnlockVaultMutation, UnlockVaultMutationVariables>(UnlockVaultDocument, options);
      }
export type UnlockVaultMutationHookResult = ReturnType<typeof useUnlockVaultMutation>;
export type UnlockVaultMutationResult = Apollo.MutationResult<UnlockVaultMutation>;
export type UnlockVaultMutationOptions = Apollo.BaseMutationOptions<UnlockVaultMutation, UnlockVaultMutationVariables>;
export const UnshareFamilyMemberDocument = gql`
    mutation UnshareFamilyMember($familyMemberId: Int!, $email: String!) {
  unshareFamilyMember(familyMemberId: $familyMemberId, email: $email)
}
    `;
export type UnshareFamilyMemberMutationFn = Apollo.MutationFunction<UnshareFamilyMemberMutation, UnshareFamilyMemberMutationVariables>;

/**
 * __useUnshareFamilyMemberMutation__
 *
 * To run a mutation, you first call `useUnshareFamilyMemberMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useUnshareFamilyMemberMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [unshareFamilyMemberMutation, { data, loading, error }] = useUnshareFamilyMemberMutation({
 *   variables: {
 *      familyMemberId: // value for 'familyMemberId'
 *      email: // value for 'email'
 *   },
 * });
 */
export function useUnshareFamilyMemberMutation(baseOptions?: Apollo.MutationHookOptions<UnshareFamilyMemberMutation, UnshareFamilyMemberMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<UnshareFamilyMemberMutation, UnshareFamilyMemberMutationVariables>(UnshareFamilyMemberDocument, options);
      }
export type UnshareFamilyMemberMutationHookResult = ReturnType<typeof useUnshareFamilyMemberMutation>;
export type UnshareFamilyMemberMutationResult = Apollo.MutationResult<UnshareFamilyMemberMutation>;
export type UnshareFamilyMemberMutationOptions = Apollo.BaseMutationOptions<UnshareFamilyMemberMutation, UnshareFamilyMemberMutationVariables>;
export const UpdateAffirmationDocument = gql`
    mutation UpdateAffirmation($id: Int!, $input: UpdateAffirmationInput!) {
  updateAffirmation(id: $id, input: $input) {
    id
    familyMemberId
    text
    category
    isActive
    createdAt
    updatedAt
  }
}
    `;
export type UpdateAffirmationMutationFn = Apollo.MutationFunction<UpdateAffirmationMutation, UpdateAffirmationMutationVariables>;

/**
 * __useUpdateAffirmationMutation__
 *
 * To run a mutation, you first call `useUpdateAffirmationMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useUpdateAffirmationMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [updateAffirmationMutation, { data, loading, error }] = useUpdateAffirmationMutation({
 *   variables: {
 *      id: // value for 'id'
 *      input: // value for 'input'
 *   },
 * });
 */
export function useUpdateAffirmationMutation(baseOptions?: Apollo.MutationHookOptions<UpdateAffirmationMutation, UpdateAffirmationMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<UpdateAffirmationMutation, UpdateAffirmationMutationVariables>(UpdateAffirmationDocument, options);
      }
export type UpdateAffirmationMutationHookResult = ReturnType<typeof useUpdateAffirmationMutation>;
export type UpdateAffirmationMutationResult = Apollo.MutationResult<UpdateAffirmationMutation>;
export type UpdateAffirmationMutationOptions = Apollo.BaseMutationOptions<UpdateAffirmationMutation, UpdateAffirmationMutationVariables>;
export const UpdateBehaviorObservationDocument = gql`
    mutation UpdateBehaviorObservation($id: Int!, $input: UpdateBehaviorObservationInput!) {
  updateBehaviorObservation(id: $id, input: $input) {
    id
    familyMemberId
    goalId
    createdBy
    observedAt
    observationType
    frequency
    intensity
    context
    notes
    createdAt
    updatedAt
  }
}
    `;
export type UpdateBehaviorObservationMutationFn = Apollo.MutationFunction<UpdateBehaviorObservationMutation, UpdateBehaviorObservationMutationVariables>;

/**
 * __useUpdateBehaviorObservationMutation__
 *
 * To run a mutation, you first call `useUpdateBehaviorObservationMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useUpdateBehaviorObservationMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [updateBehaviorObservationMutation, { data, loading, error }] = useUpdateBehaviorObservationMutation({
 *   variables: {
 *      id: // value for 'id'
 *      input: // value for 'input'
 *   },
 * });
 */
export function useUpdateBehaviorObservationMutation(baseOptions?: Apollo.MutationHookOptions<UpdateBehaviorObservationMutation, UpdateBehaviorObservationMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<UpdateBehaviorObservationMutation, UpdateBehaviorObservationMutationVariables>(UpdateBehaviorObservationDocument, options);
      }
export type UpdateBehaviorObservationMutationHookResult = ReturnType<typeof useUpdateBehaviorObservationMutation>;
export type UpdateBehaviorObservationMutationResult = Apollo.MutationResult<UpdateBehaviorObservationMutation>;
export type UpdateBehaviorObservationMutationOptions = Apollo.BaseMutationOptions<UpdateBehaviorObservationMutation, UpdateBehaviorObservationMutationVariables>;
export const UpdateContactDocument = gql`
    mutation UpdateContact($id: Int!, $input: UpdateContactInput!) {
  updateContact(id: $id, input: $input) {
    id
    createdBy
    slug
    firstName
    lastName
    description
    role
    ageYears
    notes
    createdAt
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
export const UpdateContactFeedbackDocument = gql`
    mutation UpdateContactFeedback($id: Int!, $input: UpdateContactFeedbackInput!) {
  updateContactFeedback(id: $id, input: $input) {
    id
    contactId
    familyMemberId
    createdBy
    subject
    feedbackDate
    content
    tags
    source
    extracted
    createdAt
    updatedAt
  }
}
    `;
export type UpdateContactFeedbackMutationFn = Apollo.MutationFunction<UpdateContactFeedbackMutation, UpdateContactFeedbackMutationVariables>;

/**
 * __useUpdateContactFeedbackMutation__
 *
 * To run a mutation, you first call `useUpdateContactFeedbackMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useUpdateContactFeedbackMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [updateContactFeedbackMutation, { data, loading, error }] = useUpdateContactFeedbackMutation({
 *   variables: {
 *      id: // value for 'id'
 *      input: // value for 'input'
 *   },
 * });
 */
export function useUpdateContactFeedbackMutation(baseOptions?: Apollo.MutationHookOptions<UpdateContactFeedbackMutation, UpdateContactFeedbackMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<UpdateContactFeedbackMutation, UpdateContactFeedbackMutationVariables>(UpdateContactFeedbackDocument, options);
      }
export type UpdateContactFeedbackMutationHookResult = ReturnType<typeof useUpdateContactFeedbackMutation>;
export type UpdateContactFeedbackMutationResult = Apollo.MutationResult<UpdateContactFeedbackMutation>;
export type UpdateContactFeedbackMutationOptions = Apollo.BaseMutationOptions<UpdateContactFeedbackMutation, UpdateContactFeedbackMutationVariables>;
export const UpdateFamilyMemberDocument = gql`
    mutation UpdateFamilyMember($id: Int!, $input: UpdateFamilyMemberInput!) {
  updateFamilyMember(id: $id, input: $input) {
    id
    firstName
    name
    relationship
    email
    phone
    location
    occupation
    ageYears
    dateOfBirth
    bio
    allergies
    createdAt
    updatedAt
  }
}
    `;
export type UpdateFamilyMemberMutationFn = Apollo.MutationFunction<UpdateFamilyMemberMutation, UpdateFamilyMemberMutationVariables>;

/**
 * __useUpdateFamilyMemberMutation__
 *
 * To run a mutation, you first call `useUpdateFamilyMemberMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useUpdateFamilyMemberMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [updateFamilyMemberMutation, { data, loading, error }] = useUpdateFamilyMemberMutation({
 *   variables: {
 *      id: // value for 'id'
 *      input: // value for 'input'
 *   },
 * });
 */
export function useUpdateFamilyMemberMutation(baseOptions?: Apollo.MutationHookOptions<UpdateFamilyMemberMutation, UpdateFamilyMemberMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<UpdateFamilyMemberMutation, UpdateFamilyMemberMutationVariables>(UpdateFamilyMemberDocument, options);
      }
export type UpdateFamilyMemberMutationHookResult = ReturnType<typeof useUpdateFamilyMemberMutation>;
export type UpdateFamilyMemberMutationResult = Apollo.MutationResult<UpdateFamilyMemberMutation>;
export type UpdateFamilyMemberMutationOptions = Apollo.BaseMutationOptions<UpdateFamilyMemberMutation, UpdateFamilyMemberMutationVariables>;
export const UpdateGameDocument = gql`
    mutation UpdateGame($id: Int!, $input: UpdateGameInput!) {
  updateGame(id: $id, input: $input) {
    id
    title
    description
    content
    language
    estimatedMinutes
    updatedAt
  }
}
    `;
export type UpdateGameMutationFn = Apollo.MutationFunction<UpdateGameMutation, UpdateGameMutationVariables>;

/**
 * __useUpdateGameMutation__
 *
 * To run a mutation, you first call `useUpdateGameMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useUpdateGameMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [updateGameMutation, { data, loading, error }] = useUpdateGameMutation({
 *   variables: {
 *      id: // value for 'id'
 *      input: // value for 'input'
 *   },
 * });
 */
export function useUpdateGameMutation(baseOptions?: Apollo.MutationHookOptions<UpdateGameMutation, UpdateGameMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<UpdateGameMutation, UpdateGameMutationVariables>(UpdateGameDocument, options);
      }
export type UpdateGameMutationHookResult = ReturnType<typeof useUpdateGameMutation>;
export type UpdateGameMutationResult = Apollo.MutationResult<UpdateGameMutation>;
export type UpdateGameMutationOptions = Apollo.BaseMutationOptions<UpdateGameMutation, UpdateGameMutationVariables>;
export const UpdateGoalDocument = gql`
    mutation UpdateGoal($id: Int!, $input: UpdateGoalInput!) {
  updateGoal(id: $id, input: $input) {
    id
    slug
    title
    description
    status
    tags
    familyMemberId
    familyMember {
      id
      firstName
      name
      relationship
    }
    storyLanguage
    createdAt
    updatedAt
  }
}
    `;
export type UpdateGoalMutationFn = Apollo.MutationFunction<UpdateGoalMutation, UpdateGoalMutationVariables>;

/**
 * __useUpdateGoalMutation__
 *
 * To run a mutation, you first call `useUpdateGoalMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useUpdateGoalMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [updateGoalMutation, { data, loading, error }] = useUpdateGoalMutation({
 *   variables: {
 *      id: // value for 'id'
 *      input: // value for 'input'
 *   },
 * });
 */
export function useUpdateGoalMutation(baseOptions?: Apollo.MutationHookOptions<UpdateGoalMutation, UpdateGoalMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<UpdateGoalMutation, UpdateGoalMutationVariables>(UpdateGoalDocument, options);
      }
export type UpdateGoalMutationHookResult = ReturnType<typeof useUpdateGoalMutation>;
export type UpdateGoalMutationResult = Apollo.MutationResult<UpdateGoalMutation>;
export type UpdateGoalMutationOptions = Apollo.BaseMutationOptions<UpdateGoalMutation, UpdateGoalMutationVariables>;
export const UpdateHabitDocument = gql`
    mutation UpdateHabit($id: Int!, $input: UpdateHabitInput!) {
  updateHabit(id: $id, input: $input) {
    id
    title
    description
    frequency
    targetCount
    status
    goalId
    updatedAt
  }
}
    `;
export type UpdateHabitMutationFn = Apollo.MutationFunction<UpdateHabitMutation, UpdateHabitMutationVariables>;

/**
 * __useUpdateHabitMutation__
 *
 * To run a mutation, you first call `useUpdateHabitMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useUpdateHabitMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [updateHabitMutation, { data, loading, error }] = useUpdateHabitMutation({
 *   variables: {
 *      id: // value for 'id'
 *      input: // value for 'input'
 *   },
 * });
 */
export function useUpdateHabitMutation(baseOptions?: Apollo.MutationHookOptions<UpdateHabitMutation, UpdateHabitMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<UpdateHabitMutation, UpdateHabitMutationVariables>(UpdateHabitDocument, options);
      }
export type UpdateHabitMutationHookResult = ReturnType<typeof useUpdateHabitMutation>;
export type UpdateHabitMutationResult = Apollo.MutationResult<UpdateHabitMutation>;
export type UpdateHabitMutationOptions = Apollo.BaseMutationOptions<UpdateHabitMutation, UpdateHabitMutationVariables>;
export const UpdateIssueDocument = gql`
    mutation UpdateIssue($id: Int!, $input: UpdateIssueInput!) {
  updateIssue(id: $id, input: $input) {
    id
    feedbackId
    familyMemberId
    relatedFamilyMemberId
    createdBy
    title
    description
    category
    severity
    recommendations
    createdAt
    updatedAt
  }
}
    `;
export type UpdateIssueMutationFn = Apollo.MutationFunction<UpdateIssueMutation, UpdateIssueMutationVariables>;

/**
 * __useUpdateIssueMutation__
 *
 * To run a mutation, you first call `useUpdateIssueMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useUpdateIssueMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [updateIssueMutation, { data, loading, error }] = useUpdateIssueMutation({
 *   variables: {
 *      id: // value for 'id'
 *      input: // value for 'input'
 *   },
 * });
 */
export function useUpdateIssueMutation(baseOptions?: Apollo.MutationHookOptions<UpdateIssueMutation, UpdateIssueMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<UpdateIssueMutation, UpdateIssueMutationVariables>(UpdateIssueDocument, options);
      }
export type UpdateIssueMutationHookResult = ReturnType<typeof useUpdateIssueMutation>;
export type UpdateIssueMutationResult = Apollo.MutationResult<UpdateIssueMutation>;
export type UpdateIssueMutationOptions = Apollo.BaseMutationOptions<UpdateIssueMutation, UpdateIssueMutationVariables>;
export const UpdateJournalEntryDocument = gql`
    mutation UpdateJournalEntry($id: Int!, $input: UpdateJournalEntryInput!) {
  updateJournalEntry(id: $id, input: $input) {
    id
    createdBy
    familyMemberId
    title
    content
    mood
    moodScore
    tags
    goalId
    isPrivate
    entryDate
    createdAt
    updatedAt
  }
}
    `;
export type UpdateJournalEntryMutationFn = Apollo.MutationFunction<UpdateJournalEntryMutation, UpdateJournalEntryMutationVariables>;

/**
 * __useUpdateJournalEntryMutation__
 *
 * To run a mutation, you first call `useUpdateJournalEntryMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useUpdateJournalEntryMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [updateJournalEntryMutation, { data, loading, error }] = useUpdateJournalEntryMutation({
 *   variables: {
 *      id: // value for 'id'
 *      input: // value for 'input'
 *   },
 * });
 */
export function useUpdateJournalEntryMutation(baseOptions?: Apollo.MutationHookOptions<UpdateJournalEntryMutation, UpdateJournalEntryMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<UpdateJournalEntryMutation, UpdateJournalEntryMutationVariables>(UpdateJournalEntryDocument, options);
      }
export type UpdateJournalEntryMutationHookResult = ReturnType<typeof useUpdateJournalEntryMutation>;
export type UpdateJournalEntryMutationResult = Apollo.MutationResult<UpdateJournalEntryMutation>;
export type UpdateJournalEntryMutationOptions = Apollo.BaseMutationOptions<UpdateJournalEntryMutation, UpdateJournalEntryMutationVariables>;
export const UpdateNoteDocument = gql`
    mutation UpdateNote($id: Int!, $input: UpdateNoteInput!) {
  updateNote(id: $id, input: $input) {
    id
    slug
    title
    entityId
    entityType
    createdBy
    noteType
    content
    tags
    createdAt
    updatedAt
  }
}
    `;
export type UpdateNoteMutationFn = Apollo.MutationFunction<UpdateNoteMutation, UpdateNoteMutationVariables>;

/**
 * __useUpdateNoteMutation__
 *
 * To run a mutation, you first call `useUpdateNoteMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useUpdateNoteMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [updateNoteMutation, { data, loading, error }] = useUpdateNoteMutation({
 *   variables: {
 *      id: // value for 'id'
 *      input: // value for 'input'
 *   },
 * });
 */
export function useUpdateNoteMutation(baseOptions?: Apollo.MutationHookOptions<UpdateNoteMutation, UpdateNoteMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<UpdateNoteMutation, UpdateNoteMutationVariables>(UpdateNoteDocument, options);
      }
export type UpdateNoteMutationHookResult = ReturnType<typeof useUpdateNoteMutation>;
export type UpdateNoteMutationResult = Apollo.MutationResult<UpdateNoteMutation>;
export type UpdateNoteMutationOptions = Apollo.BaseMutationOptions<UpdateNoteMutation, UpdateNoteMutationVariables>;
export const UpdateProtocolStatusDocument = gql`
    mutation UpdateProtocolStatus($id: ID!, $status: String!) {
  updateProtocolStatus(id: $id, status: $status) {
    id
    status
    updatedAt
  }
}
    `;
export type UpdateProtocolStatusMutationFn = Apollo.MutationFunction<UpdateProtocolStatusMutation, UpdateProtocolStatusMutationVariables>;

/**
 * __useUpdateProtocolStatusMutation__
 *
 * To run a mutation, you first call `useUpdateProtocolStatusMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useUpdateProtocolStatusMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [updateProtocolStatusMutation, { data, loading, error }] = useUpdateProtocolStatusMutation({
 *   variables: {
 *      id: // value for 'id'
 *      status: // value for 'status'
 *   },
 * });
 */
export function useUpdateProtocolStatusMutation(baseOptions?: Apollo.MutationHookOptions<UpdateProtocolStatusMutation, UpdateProtocolStatusMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<UpdateProtocolStatusMutation, UpdateProtocolStatusMutationVariables>(UpdateProtocolStatusDocument, options);
      }
export type UpdateProtocolStatusMutationHookResult = ReturnType<typeof useUpdateProtocolStatusMutation>;
export type UpdateProtocolStatusMutationResult = Apollo.MutationResult<UpdateProtocolStatusMutation>;
export type UpdateProtocolStatusMutationOptions = Apollo.BaseMutationOptions<UpdateProtocolStatusMutation, UpdateProtocolStatusMutationVariables>;
export const UpdateRelationshipDocument = gql`
    mutation UpdateRelationship($id: Int!, $input: UpdateRelationshipInput!) {
  updateRelationship(id: $id, input: $input) {
    id
    createdBy
    subjectType
    subjectId
    relatedType
    relatedId
    relationshipType
    context
    startDate
    status
    createdAt
    updatedAt
  }
}
    `;
export type UpdateRelationshipMutationFn = Apollo.MutationFunction<UpdateRelationshipMutation, UpdateRelationshipMutationVariables>;

/**
 * __useUpdateRelationshipMutation__
 *
 * To run a mutation, you first call `useUpdateRelationshipMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useUpdateRelationshipMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [updateRelationshipMutation, { data, loading, error }] = useUpdateRelationshipMutation({
 *   variables: {
 *      id: // value for 'id'
 *      input: // value for 'input'
 *   },
 * });
 */
export function useUpdateRelationshipMutation(baseOptions?: Apollo.MutationHookOptions<UpdateRelationshipMutation, UpdateRelationshipMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<UpdateRelationshipMutation, UpdateRelationshipMutationVariables>(UpdateRelationshipDocument, options);
      }
export type UpdateRelationshipMutationHookResult = ReturnType<typeof useUpdateRelationshipMutation>;
export type UpdateRelationshipMutationResult = Apollo.MutationResult<UpdateRelationshipMutation>;
export type UpdateRelationshipMutationOptions = Apollo.BaseMutationOptions<UpdateRelationshipMutation, UpdateRelationshipMutationVariables>;
export const UpdateStoryDocument = gql`
    mutation UpdateStory($id: Int!, $input: UpdateStoryInput!) {
  updateStory(id: $id, input: $input) {
    id
    goalId
    createdBy
    content
    createdAt
    updatedAt
  }
}
    `;
export type UpdateStoryMutationFn = Apollo.MutationFunction<UpdateStoryMutation, UpdateStoryMutationVariables>;

/**
 * __useUpdateStoryMutation__
 *
 * To run a mutation, you first call `useUpdateStoryMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useUpdateStoryMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [updateStoryMutation, { data, loading, error }] = useUpdateStoryMutation({
 *   variables: {
 *      id: // value for 'id'
 *      input: // value for 'input'
 *   },
 * });
 */
export function useUpdateStoryMutation(baseOptions?: Apollo.MutationHookOptions<UpdateStoryMutation, UpdateStoryMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<UpdateStoryMutation, UpdateStoryMutationVariables>(UpdateStoryDocument, options);
      }
export type UpdateStoryMutationHookResult = ReturnType<typeof useUpdateStoryMutation>;
export type UpdateStoryMutationResult = Apollo.MutationResult<UpdateStoryMutation>;
export type UpdateStoryMutationOptions = Apollo.BaseMutationOptions<UpdateStoryMutation, UpdateStoryMutationVariables>;
export const UpdateTeacherFeedbackDocument = gql`
    mutation UpdateTeacherFeedback($id: Int!, $input: UpdateTeacherFeedbackInput!) {
  updateTeacherFeedback(id: $id, input: $input) {
    id
    familyMemberId
    createdBy
    teacherName
    subject
    feedbackDate
    content
    tags
    source
    extracted
    createdAt
    updatedAt
  }
}
    `;
export type UpdateTeacherFeedbackMutationFn = Apollo.MutationFunction<UpdateTeacherFeedbackMutation, UpdateTeacherFeedbackMutationVariables>;

/**
 * __useUpdateTeacherFeedbackMutation__
 *
 * To run a mutation, you first call `useUpdateTeacherFeedbackMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useUpdateTeacherFeedbackMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [updateTeacherFeedbackMutation, { data, loading, error }] = useUpdateTeacherFeedbackMutation({
 *   variables: {
 *      id: // value for 'id'
 *      input: // value for 'input'
 *   },
 * });
 */
export function useUpdateTeacherFeedbackMutation(baseOptions?: Apollo.MutationHookOptions<UpdateTeacherFeedbackMutation, UpdateTeacherFeedbackMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<UpdateTeacherFeedbackMutation, UpdateTeacherFeedbackMutationVariables>(UpdateTeacherFeedbackDocument, options);
      }
export type UpdateTeacherFeedbackMutationHookResult = ReturnType<typeof useUpdateTeacherFeedbackMutation>;
export type UpdateTeacherFeedbackMutationResult = Apollo.MutationResult<UpdateTeacherFeedbackMutation>;
export type UpdateTeacherFeedbackMutationOptions = Apollo.BaseMutationOptions<UpdateTeacherFeedbackMutation, UpdateTeacherFeedbackMutationVariables>;
export const GetUserSettingsDocument = gql`
    query GetUserSettings {
  userSettings {
    userId
    storyLanguage
    storyMinutes
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
 *   },
 * });
 */
export function useGetUserSettingsQuery(baseOptions?: Apollo.QueryHookOptions<GetUserSettingsQuery, GetUserSettingsQueryVariables>) {
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
    mutation UpdateUserSettings($storyLanguage: String!, $storyMinutes: Int) {
  updateUserSettings(storyLanguage: $storyLanguage, storyMinutes: $storyMinutes) {
    userId
    storyLanguage
    storyMinutes
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
 *      storyLanguage: // value for 'storyLanguage'
 *      storyMinutes: // value for 'storyMinutes'
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
export const VaultStatusDocument = gql`
    query VaultStatus {
  vaultStatus {
    unlocked
    available
  }
}
    `;

/**
 * __useVaultStatusQuery__
 *
 * To run a query within a React component, call `useVaultStatusQuery` and pass it any options that fit your needs.
 * When your component renders, `useVaultStatusQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useVaultStatusQuery({
 *   variables: {
 *   },
 * });
 */
export function useVaultStatusQuery(baseOptions?: Apollo.QueryHookOptions<VaultStatusQuery, VaultStatusQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<VaultStatusQuery, VaultStatusQueryVariables>(VaultStatusDocument, options);
      }
export function useVaultStatusLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<VaultStatusQuery, VaultStatusQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<VaultStatusQuery, VaultStatusQueryVariables>(VaultStatusDocument, options);
        }
// @ts-ignore
export function useVaultStatusSuspenseQuery(baseOptions?: Apollo.SuspenseQueryHookOptions<VaultStatusQuery, VaultStatusQueryVariables>): Apollo.UseSuspenseQueryResult<VaultStatusQuery, VaultStatusQueryVariables>;
export function useVaultStatusSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<VaultStatusQuery, VaultStatusQueryVariables>): Apollo.UseSuspenseQueryResult<VaultStatusQuery | undefined, VaultStatusQueryVariables>;
export function useVaultStatusSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<VaultStatusQuery, VaultStatusQueryVariables>) {
          const options = baseOptions === Apollo.skipToken ? baseOptions : {...defaultOptions, ...baseOptions}
          return Apollo.useSuspenseQuery<VaultStatusQuery, VaultStatusQueryVariables>(VaultStatusDocument, options);
        }
export type VaultStatusQueryHookResult = ReturnType<typeof useVaultStatusQuery>;
export type VaultStatusLazyQueryHookResult = ReturnType<typeof useVaultStatusLazyQuery>;
export type VaultStatusSuspenseQueryHookResult = ReturnType<typeof useVaultStatusSuspenseQuery>;
export type VaultStatusQueryResult = Apollo.QueryResult<VaultStatusQuery, VaultStatusQueryVariables>;