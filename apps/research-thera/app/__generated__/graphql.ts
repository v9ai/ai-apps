/* eslint-disable */
import { TypedDocumentNode as DocumentNode } from '@graphql-typed-document-node/core';
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


export type ConditionsQuery = { __typename?: 'Query', conditions: Array<{ __typename?: 'Condition', id: string, name: string, notes?: string | null, createdAt: string }> };

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


export const AddAllergyDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"AddAllergy"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"input"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"AddAllergyInput"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"addAllergy"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"Variable","name":{"kind":"Name","value":"input"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"familyMemberId"}},{"kind":"Field","name":{"kind":"Name","value":"kind"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"severity"}},{"kind":"Field","name":{"kind":"Name","value":"notes"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"familyMember"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"firstName"}},{"kind":"Field","name":{"kind":"Name","value":"name"}}]}}]}}]}}]} as unknown as DocumentNode<AddAllergyMutation, AddAllergyMutationVariables>;
export const AddAppointmentDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"AddAppointment"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"input"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"AddAppointmentInput"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"addAppointment"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"Variable","name":{"kind":"Name","value":"input"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"title"}},{"kind":"Field","name":{"kind":"Name","value":"doctorId"}},{"kind":"Field","name":{"kind":"Name","value":"familyMemberId"}},{"kind":"Field","name":{"kind":"Name","value":"provider"}},{"kind":"Field","name":{"kind":"Name","value":"notes"}},{"kind":"Field","name":{"kind":"Name","value":"appointmentDate"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}}]}}]}}]} as unknown as DocumentNode<AddAppointmentMutation, AddAppointmentMutationVariables>;
export const AddConditionDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"AddCondition"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"input"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"AddConditionInput"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"addCondition"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"Variable","name":{"kind":"Name","value":"input"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"notes"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}}]}}]}}]} as unknown as DocumentNode<AddConditionMutation, AddConditionMutationVariables>;
export const AddDoctorDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"AddDoctor"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"input"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"AddDoctorInput"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"addDoctor"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"Variable","name":{"kind":"Name","value":"input"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"specialty"}},{"kind":"Field","name":{"kind":"Name","value":"phone"}},{"kind":"Field","name":{"kind":"Name","value":"email"}},{"kind":"Field","name":{"kind":"Name","value":"address"}},{"kind":"Field","name":{"kind":"Name","value":"notes"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}}]}}]}}]} as unknown as DocumentNode<AddDoctorMutation, AddDoctorMutationVariables>;
export const AddMedicationDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"AddMedication"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"input"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"AddMedicationInput"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"addMedication"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"Variable","name":{"kind":"Name","value":"input"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"dosage"}},{"kind":"Field","name":{"kind":"Name","value":"frequency"}},{"kind":"Field","name":{"kind":"Name","value":"notes"}},{"kind":"Field","name":{"kind":"Name","value":"startDate"}},{"kind":"Field","name":{"kind":"Name","value":"endDate"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}}]}}]}}]} as unknown as DocumentNode<AddMedicationMutation, AddMedicationMutationVariables>;
export const AddMemoryEntryDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"AddMemoryEntry"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"input"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"AddMemoryEntryInput"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"addMemoryEntry"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"Variable","name":{"kind":"Name","value":"input"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"category"}},{"kind":"Field","name":{"kind":"Name","value":"description"}},{"kind":"Field","name":{"kind":"Name","value":"overallScore"}},{"kind":"Field","name":{"kind":"Name","value":"shortTermScore"}},{"kind":"Field","name":{"kind":"Name","value":"longTermScore"}},{"kind":"Field","name":{"kind":"Name","value":"workingMemoryScore"}},{"kind":"Field","name":{"kind":"Name","value":"recallSpeed"}},{"kind":"Field","name":{"kind":"Name","value":"loggedAt"}}]}}]}}]} as unknown as DocumentNode<AddMemoryEntryMutation, AddMemoryEntryMutationVariables>;
export const AddProtocolDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"AddProtocol"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"input"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"AddProtocolInput"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"addProtocol"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"Variable","name":{"kind":"Name","value":"input"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"slug"}},{"kind":"Field","name":{"kind":"Name","value":"status"}},{"kind":"Field","name":{"kind":"Name","value":"targetAreas"}},{"kind":"Field","name":{"kind":"Name","value":"supplementCount"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}}]}}]}}]} as unknown as DocumentNode<AddProtocolMutation, AddProtocolMutationVariables>;
export const AddSupplementDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"AddSupplement"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"protocolId"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"input"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"AddSupplementInput"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"addSupplement"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"protocolId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"protocolId"}}},{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"Variable","name":{"kind":"Name","value":"input"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"dosage"}},{"kind":"Field","name":{"kind":"Name","value":"frequency"}},{"kind":"Field","name":{"kind":"Name","value":"mechanism"}},{"kind":"Field","name":{"kind":"Name","value":"notes"}},{"kind":"Field","name":{"kind":"Name","value":"url"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}}]}}]}}]} as unknown as DocumentNode<AddSupplementMutation, AddSupplementMutationVariables>;
export const AddSymptomDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"AddSymptom"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"input"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"AddSymptomInput"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"addSymptom"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"Variable","name":{"kind":"Name","value":"input"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"description"}},{"kind":"Field","name":{"kind":"Name","value":"severity"}},{"kind":"Field","name":{"kind":"Name","value":"loggedAt"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}}]}}]}}]} as unknown as DocumentNode<AddSymptomMutation, AddSymptomMutationVariables>;
export const AllergiesDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"Allergies"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"allergies"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"familyMemberId"}},{"kind":"Field","name":{"kind":"Name","value":"kind"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"severity"}},{"kind":"Field","name":{"kind":"Name","value":"notes"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"familyMember"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"slug"}},{"kind":"Field","name":{"kind":"Name","value":"firstName"}},{"kind":"Field","name":{"kind":"Name","value":"name"}}]}}]}}]}}]} as unknown as DocumentNode<AllergiesQuery, AllergiesQueryVariables>;
export const AppointmentsDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"Appointments"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"appointments"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"title"}},{"kind":"Field","name":{"kind":"Name","value":"doctorId"}},{"kind":"Field","name":{"kind":"Name","value":"familyMemberId"}},{"kind":"Field","name":{"kind":"Name","value":"provider"}},{"kind":"Field","name":{"kind":"Name","value":"notes"}},{"kind":"Field","name":{"kind":"Name","value":"appointmentDate"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}}]}}]}}]} as unknown as DocumentNode<AppointmentsQuery, AppointmentsQueryVariables>;
export const BogdanDiscussionsDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"BogdanDiscussions"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"bogdanDiscussions"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"familyMemberId"}},{"kind":"Field","name":{"kind":"Name","value":"childAge"}},{"kind":"Field","name":{"kind":"Name","value":"behaviorSummary"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}}]}}]}}]} as unknown as DocumentNode<BogdanDiscussionsQuery, BogdanDiscussionsQueryVariables>;
export const CheckNoteClaimsDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"CheckNoteClaims"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"input"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"CheckNoteClaimsInput"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"checkNoteClaims"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"Variable","name":{"kind":"Name","value":"input"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"success"}},{"kind":"Field","name":{"kind":"Name","value":"message"}},{"kind":"Field","name":{"kind":"Name","value":"noteId"}},{"kind":"Field","name":{"kind":"Name","value":"cards"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"claim"}},{"kind":"Field","name":{"kind":"Name","value":"scope"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"population"}},{"kind":"Field","name":{"kind":"Name","value":"intervention"}},{"kind":"Field","name":{"kind":"Name","value":"comparator"}},{"kind":"Field","name":{"kind":"Name","value":"outcome"}},{"kind":"Field","name":{"kind":"Name","value":"timeframe"}},{"kind":"Field","name":{"kind":"Name","value":"setting"}}]}},{"kind":"Field","name":{"kind":"Name","value":"verdict"}},{"kind":"Field","name":{"kind":"Name","value":"confidence"}},{"kind":"Field","name":{"kind":"Name","value":"evidence"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"paper"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"title"}},{"kind":"Field","name":{"kind":"Name","value":"doi"}},{"kind":"Field","name":{"kind":"Name","value":"url"}},{"kind":"Field","name":{"kind":"Name","value":"year"}},{"kind":"Field","name":{"kind":"Name","value":"source"}},{"kind":"Field","name":{"kind":"Name","value":"authors"}},{"kind":"Field","name":{"kind":"Name","value":"abstract"}},{"kind":"Field","name":{"kind":"Name","value":"journal"}}]}},{"kind":"Field","name":{"kind":"Name","value":"polarity"}},{"kind":"Field","name":{"kind":"Name","value":"excerpt"}},{"kind":"Field","name":{"kind":"Name","value":"rationale"}},{"kind":"Field","name":{"kind":"Name","value":"score"}},{"kind":"Field","name":{"kind":"Name","value":"locator"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"section"}},{"kind":"Field","name":{"kind":"Name","value":"page"}},{"kind":"Field","name":{"kind":"Name","value":"url"}}]}}]}},{"kind":"Field","name":{"kind":"Name","value":"queries"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}},{"kind":"Field","name":{"kind":"Name","value":"provenance"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"generatedBy"}},{"kind":"Field","name":{"kind":"Name","value":"model"}},{"kind":"Field","name":{"kind":"Name","value":"sourceTools"}}]}},{"kind":"Field","name":{"kind":"Name","value":"notes"}}]}}]}}]}}]} as unknown as DocumentNode<CheckNoteClaimsMutation, CheckNoteClaimsMutationVariables>;
export const BuildClaimCardsFromTextDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"BuildClaimCardsFromText"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"buildClaimCards"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"ObjectValue","fields":[{"kind":"ObjectField","name":{"kind":"Name","value":"text"},"value":{"kind":"StringValue","value":"Cognitive Behavioral Therapy is effective for treating anxiety disorders.\nCBT reduces anxiety symptoms by 60-80% in most patients.\nThe effects of CBT persist for years after treatment ends.","block":true}},{"kind":"ObjectField","name":{"kind":"Name","value":"perSourceLimit"},"value":{"kind":"IntValue","value":"10"}},{"kind":"ObjectField","name":{"kind":"Name","value":"topK"},"value":{"kind":"IntValue","value":"5"}},{"kind":"ObjectField","name":{"kind":"Name","value":"useLlmJudge"},"value":{"kind":"BooleanValue","value":true}},{"kind":"ObjectField","name":{"kind":"Name","value":"sources"},"value":{"kind":"ListValue","values":[{"kind":"EnumValue","value":"CROSSREF"},{"kind":"EnumValue","value":"SEMANTIC_SCHOLAR"},{"kind":"EnumValue","value":"PUBMED"}]}}]}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"cards"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"claim"}},{"kind":"Field","name":{"kind":"Name","value":"verdict"}},{"kind":"Field","name":{"kind":"Name","value":"confidence"}},{"kind":"Field","name":{"kind":"Name","value":"evidence"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"paper"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"title"}},{"kind":"Field","name":{"kind":"Name","value":"authors"}},{"kind":"Field","name":{"kind":"Name","value":"doi"}},{"kind":"Field","name":{"kind":"Name","value":"year"}},{"kind":"Field","name":{"kind":"Name","value":"journal"}},{"kind":"Field","name":{"kind":"Name","value":"oaUrl"}}]}},{"kind":"Field","name":{"kind":"Name","value":"polarity"}},{"kind":"Field","name":{"kind":"Name","value":"excerpt"}},{"kind":"Field","name":{"kind":"Name","value":"rationale"}},{"kind":"Field","name":{"kind":"Name","value":"score"}}]}},{"kind":"Field","name":{"kind":"Name","value":"queries"}},{"kind":"Field","name":{"kind":"Name","value":"provenance"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"generatedBy"}},{"kind":"Field","name":{"kind":"Name","value":"model"}},{"kind":"Field","name":{"kind":"Name","value":"sourceTools"}}]}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}}]}}]}}]}}]} as unknown as DocumentNode<BuildClaimCardsFromTextMutation, BuildClaimCardsFromTextMutationVariables>;
export const BuildClaimCardsFromClaimsDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"BuildClaimCardsFromClaims"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"buildClaimCards"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"ObjectValue","fields":[{"kind":"ObjectField","name":{"kind":"Name","value":"claims"},"value":{"kind":"ListValue","values":[{"kind":"StringValue","value":"Mindfulness meditation reduces stress in adults with GAD","block":false},{"kind":"StringValue","value":"Exercise therapy improves mood in adults with major depressive disorder","block":false}]}},{"kind":"ObjectField","name":{"kind":"Name","value":"perSourceLimit"},"value":{"kind":"IntValue","value":"8"}},{"kind":"ObjectField","name":{"kind":"Name","value":"topK"},"value":{"kind":"IntValue","value":"4"}},{"kind":"ObjectField","name":{"kind":"Name","value":"useLlmJudge"},"value":{"kind":"BooleanValue","value":false}},{"kind":"ObjectField","name":{"kind":"Name","value":"sources"},"value":{"kind":"ListValue","values":[{"kind":"EnumValue","value":"SEMANTIC_SCHOLAR"},{"kind":"EnumValue","value":"OPENALEX"}]}}]}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"cards"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"claim"}},{"kind":"Field","name":{"kind":"Name","value":"verdict"}},{"kind":"Field","name":{"kind":"Name","value":"confidence"}},{"kind":"Field","name":{"kind":"Name","value":"evidence"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"paper"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"title"}},{"kind":"Field","name":{"kind":"Name","value":"doi"}}]}},{"kind":"Field","name":{"kind":"Name","value":"polarity"}},{"kind":"Field","name":{"kind":"Name","value":"score"}}]}}]}}]}}]}}]} as unknown as DocumentNode<BuildClaimCardsFromClaimsMutation, BuildClaimCardsFromClaimsMutationVariables>;
export const GetClaimCardDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"GetClaimCard"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"claimCard"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"id"},"value":{"kind":"StringValue","value":"claim_abc123def456","block":false}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"claim"}},{"kind":"Field","name":{"kind":"Name","value":"verdict"}},{"kind":"Field","name":{"kind":"Name","value":"confidence"}},{"kind":"Field","name":{"kind":"Name","value":"evidence"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"paper"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"title"}},{"kind":"Field","name":{"kind":"Name","value":"authors"}},{"kind":"Field","name":{"kind":"Name","value":"doi"}},{"kind":"Field","name":{"kind":"Name","value":"url"}},{"kind":"Field","name":{"kind":"Name","value":"year"}},{"kind":"Field","name":{"kind":"Name","value":"journal"}}]}},{"kind":"Field","name":{"kind":"Name","value":"polarity"}},{"kind":"Field","name":{"kind":"Name","value":"excerpt"}},{"kind":"Field","name":{"kind":"Name","value":"rationale"}},{"kind":"Field","name":{"kind":"Name","value":"score"}}]}},{"kind":"Field","name":{"kind":"Name","value":"scope"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"population"}},{"kind":"Field","name":{"kind":"Name","value":"intervention"}},{"kind":"Field","name":{"kind":"Name","value":"outcome"}}]}},{"kind":"Field","name":{"kind":"Name","value":"notes"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}}]}}]}}]} as unknown as DocumentNode<GetClaimCardQuery, GetClaimCardQueryVariables>;
export const GetClaimCardsForNoteDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"GetClaimCardsForNote"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"claimCardsForNote"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"noteId"},"value":{"kind":"IntValue","value":"1"}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"claim"}},{"kind":"Field","name":{"kind":"Name","value":"verdict"}},{"kind":"Field","name":{"kind":"Name","value":"confidence"}},{"kind":"Field","name":{"kind":"Name","value":"evidence"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"paper"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"title"}},{"kind":"Field","name":{"kind":"Name","value":"doi"}}]}},{"kind":"Field","name":{"kind":"Name","value":"polarity"}}]}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}}]}}]}}]} as unknown as DocumentNode<GetClaimCardsForNoteQuery, GetClaimCardsForNoteQueryVariables>;
export const RefreshClaimCardDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"RefreshClaimCard"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"refreshClaimCard"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"id"},"value":{"kind":"StringValue","value":"claim_abc123def456","block":false}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"claim"}},{"kind":"Field","name":{"kind":"Name","value":"verdict"}},{"kind":"Field","name":{"kind":"Name","value":"confidence"}},{"kind":"Field","name":{"kind":"Name","value":"evidence"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"paper"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"title"}},{"kind":"Field","name":{"kind":"Name","value":"doi"}},{"kind":"Field","name":{"kind":"Name","value":"year"}}]}},{"kind":"Field","name":{"kind":"Name","value":"polarity"}},{"kind":"Field","name":{"kind":"Name","value":"score"}}]}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}}]}}]}}]} as unknown as DocumentNode<RefreshClaimCardMutation, RefreshClaimCardMutationVariables>;
export const DeleteClaimCardDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"DeleteClaimCard"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"deleteClaimCard"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"id"},"value":{"kind":"StringValue","value":"claim_abc123def456","block":false}}]}]}}]} as unknown as DocumentNode<DeleteClaimCardMutation, DeleteClaimCardMutationVariables>;
export const ConditionsDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"Conditions"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"conditions"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"notes"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}}]}}]}}]} as unknown as DocumentNode<ConditionsQuery, ConditionsQueryVariables>;
export const ConvertIssueToGoalDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"ConvertIssueToGoal"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"id"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"Int"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"input"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"CreateGoalInput"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"convertIssueToGoal"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"id"},"value":{"kind":"Variable","name":{"kind":"Name","value":"id"}}},{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"Variable","name":{"kind":"Name","value":"input"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"familyMemberId"}},{"kind":"Field","name":{"kind":"Name","value":"createdBy"}},{"kind":"Field","name":{"kind":"Name","value":"slug"}},{"kind":"Field","name":{"kind":"Name","value":"title"}},{"kind":"Field","name":{"kind":"Name","value":"description"}},{"kind":"Field","name":{"kind":"Name","value":"status"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}}]}}]}}]} as unknown as DocumentNode<ConvertIssueToGoalMutation, ConvertIssueToGoalMutationVariables>;
export const ConvertJournalEntryToIssueDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"ConvertJournalEntryToIssue"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"id"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"Int"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"input"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ConvertJournalEntryToIssueInput"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"convertJournalEntryToIssue"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"id"},"value":{"kind":"Variable","name":{"kind":"Name","value":"id"}}},{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"Variable","name":{"kind":"Name","value":"input"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"journalEntryId"}},{"kind":"Field","name":{"kind":"Name","value":"feedbackId"}},{"kind":"Field","name":{"kind":"Name","value":"familyMemberId"}},{"kind":"Field","name":{"kind":"Name","value":"createdBy"}},{"kind":"Field","name":{"kind":"Name","value":"title"}},{"kind":"Field","name":{"kind":"Name","value":"description"}},{"kind":"Field","name":{"kind":"Name","value":"category"}},{"kind":"Field","name":{"kind":"Name","value":"severity"}},{"kind":"Field","name":{"kind":"Name","value":"recommendations"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}},{"kind":"Field","name":{"kind":"Name","value":"familyMember"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"firstName"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"slug"}}]}}]}}]}}]} as unknown as DocumentNode<ConvertJournalEntryToIssueMutation, ConvertJournalEntryToIssueMutationVariables>;
export const CreateAffirmationDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"CreateAffirmation"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"input"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"CreateAffirmationInput"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"createAffirmation"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"Variable","name":{"kind":"Name","value":"input"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"familyMemberId"}},{"kind":"Field","name":{"kind":"Name","value":"text"}},{"kind":"Field","name":{"kind":"Name","value":"category"}},{"kind":"Field","name":{"kind":"Name","value":"isActive"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}}]}}]}}]} as unknown as DocumentNode<CreateAffirmationMutation, CreateAffirmationMutationVariables>;
export const CreateContactDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"CreateContact"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"input"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"CreateContactInput"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"createContact"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"Variable","name":{"kind":"Name","value":"input"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"createdBy"}},{"kind":"Field","name":{"kind":"Name","value":"slug"}},{"kind":"Field","name":{"kind":"Name","value":"firstName"}},{"kind":"Field","name":{"kind":"Name","value":"lastName"}},{"kind":"Field","name":{"kind":"Name","value":"description"}},{"kind":"Field","name":{"kind":"Name","value":"role"}},{"kind":"Field","name":{"kind":"Name","value":"ageYears"}},{"kind":"Field","name":{"kind":"Name","value":"notes"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}}]}}]}}]} as unknown as DocumentNode<CreateContactMutation, CreateContactMutationVariables>;
export const CreateContactFeedbackDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"CreateContactFeedback"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"input"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"CreateContactFeedbackInput"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"createContactFeedback"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"Variable","name":{"kind":"Name","value":"input"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"contactId"}},{"kind":"Field","name":{"kind":"Name","value":"familyMemberId"}},{"kind":"Field","name":{"kind":"Name","value":"createdBy"}},{"kind":"Field","name":{"kind":"Name","value":"subject"}},{"kind":"Field","name":{"kind":"Name","value":"feedbackDate"}},{"kind":"Field","name":{"kind":"Name","value":"content"}},{"kind":"Field","name":{"kind":"Name","value":"tags"}},{"kind":"Field","name":{"kind":"Name","value":"source"}},{"kind":"Field","name":{"kind":"Name","value":"extracted"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}}]}}]}}]} as unknown as DocumentNode<CreateContactFeedbackMutation, CreateContactFeedbackMutationVariables>;
export const CreateConversationDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"CreateConversation"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"issueId"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"Int"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"message"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"createConversation"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"issueId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"issueId"}}},{"kind":"Argument","name":{"kind":"Name","value":"message"},"value":{"kind":"Variable","name":{"kind":"Name","value":"message"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"issueId"}},{"kind":"Field","name":{"kind":"Name","value":"userId"}},{"kind":"Field","name":{"kind":"Name","value":"title"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}},{"kind":"Field","name":{"kind":"Name","value":"messages"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"conversationId"}},{"kind":"Field","name":{"kind":"Name","value":"role"}},{"kind":"Field","name":{"kind":"Name","value":"content"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}}]}}]}}]}}]} as unknown as DocumentNode<CreateConversationMutation, CreateConversationMutationVariables>;
export const CreateFamilyMemberDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"CreateFamilyMember"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"input"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"CreateFamilyMemberInput"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"createFamilyMember"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"Variable","name":{"kind":"Name","value":"input"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"firstName"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"relationship"}},{"kind":"Field","name":{"kind":"Name","value":"email"}},{"kind":"Field","name":{"kind":"Name","value":"phone"}},{"kind":"Field","name":{"kind":"Name","value":"location"}},{"kind":"Field","name":{"kind":"Name","value":"occupation"}},{"kind":"Field","name":{"kind":"Name","value":"ageYears"}},{"kind":"Field","name":{"kind":"Name","value":"dateOfBirth"}},{"kind":"Field","name":{"kind":"Name","value":"bio"}},{"kind":"Field","name":{"kind":"Name","value":"allergies"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}}]}}]}}]} as unknown as DocumentNode<CreateFamilyMemberMutation, CreateFamilyMemberMutationVariables>;
export const CreateGameDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"CreateGame"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"input"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"CreateGameInput"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"createGame"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"Variable","name":{"kind":"Name","value":"input"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"type"}},{"kind":"Field","name":{"kind":"Name","value":"title"}},{"kind":"Field","name":{"kind":"Name","value":"description"}},{"kind":"Field","name":{"kind":"Name","value":"content"}},{"kind":"Field","name":{"kind":"Name","value":"language"}},{"kind":"Field","name":{"kind":"Name","value":"estimatedMinutes"}},{"kind":"Field","name":{"kind":"Name","value":"source"}},{"kind":"Field","name":{"kind":"Name","value":"goalId"}},{"kind":"Field","name":{"kind":"Name","value":"issueId"}},{"kind":"Field","name":{"kind":"Name","value":"familyMemberId"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}}]}}]}}]} as unknown as DocumentNode<CreateGameMutation, CreateGameMutationVariables>;
export const CreateGoalDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"CreateGoal"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"input"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"CreateGoalInput"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"createGoal"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"Variable","name":{"kind":"Name","value":"input"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"slug"}},{"kind":"Field","name":{"kind":"Name","value":"title"}},{"kind":"Field","name":{"kind":"Name","value":"description"}},{"kind":"Field","name":{"kind":"Name","value":"status"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}},{"kind":"Field","name":{"kind":"Name","value":"familyMemberId"}}]}}]}}]} as unknown as DocumentNode<CreateGoalMutation, CreateGoalMutationVariables>;
export const CreateHabitDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"CreateHabit"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"input"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"CreateHabitInput"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"createHabit"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"Variable","name":{"kind":"Name","value":"input"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"title"}},{"kind":"Field","name":{"kind":"Name","value":"description"}},{"kind":"Field","name":{"kind":"Name","value":"frequency"}},{"kind":"Field","name":{"kind":"Name","value":"targetCount"}},{"kind":"Field","name":{"kind":"Name","value":"status"}},{"kind":"Field","name":{"kind":"Name","value":"goalId"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}}]}}]}}]} as unknown as DocumentNode<CreateHabitMutation, CreateHabitMutationVariables>;
export const CreateIssueDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"CreateIssue"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"input"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"CreateIssueInput"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"createIssue"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"Variable","name":{"kind":"Name","value":"input"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"feedbackId"}},{"kind":"Field","name":{"kind":"Name","value":"familyMemberId"}},{"kind":"Field","name":{"kind":"Name","value":"createdBy"}},{"kind":"Field","name":{"kind":"Name","value":"title"}},{"kind":"Field","name":{"kind":"Name","value":"description"}},{"kind":"Field","name":{"kind":"Name","value":"category"}},{"kind":"Field","name":{"kind":"Name","value":"severity"}},{"kind":"Field","name":{"kind":"Name","value":"recommendations"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}}]}}]}}]} as unknown as DocumentNode<CreateIssueMutation, CreateIssueMutationVariables>;
export const CreateJournalEntryDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"CreateJournalEntry"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"input"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"CreateJournalEntryInput"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"createJournalEntry"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"Variable","name":{"kind":"Name","value":"input"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"createdBy"}},{"kind":"Field","name":{"kind":"Name","value":"familyMemberId"}},{"kind":"Field","name":{"kind":"Name","value":"title"}},{"kind":"Field","name":{"kind":"Name","value":"content"}},{"kind":"Field","name":{"kind":"Name","value":"mood"}},{"kind":"Field","name":{"kind":"Name","value":"moodScore"}},{"kind":"Field","name":{"kind":"Name","value":"tags"}},{"kind":"Field","name":{"kind":"Name","value":"goalId"}},{"kind":"Field","name":{"kind":"Name","value":"isPrivate"}},{"kind":"Field","name":{"kind":"Name","value":"isVault"}},{"kind":"Field","name":{"kind":"Name","value":"entryDate"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}}]}}]}}]} as unknown as DocumentNode<CreateJournalEntryMutation, CreateJournalEntryMutationVariables>;
export const CreateNoteDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"CreateNote"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"input"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"CreateNoteInput"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"createNote"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"Variable","name":{"kind":"Name","value":"input"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"entityId"}},{"kind":"Field","name":{"kind":"Name","value":"entityType"}},{"kind":"Field","name":{"kind":"Name","value":"createdBy"}},{"kind":"Field","name":{"kind":"Name","value":"noteType"}},{"kind":"Field","name":{"kind":"Name","value":"slug"}},{"kind":"Field","name":{"kind":"Name","value":"content"}},{"kind":"Field","name":{"kind":"Name","value":"createdBy"}},{"kind":"Field","name":{"kind":"Name","value":"tags"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}}]}}]}}]} as unknown as DocumentNode<CreateNoteMutation, CreateNoteMutationVariables>;
export const CreateRelatedIssueDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"CreateRelatedIssue"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"issueId"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"Int"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"input"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"CreateIssueInput"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"linkType"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"createRelatedIssue"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"issueId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"issueId"}}},{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"Variable","name":{"kind":"Name","value":"input"}}},{"kind":"Argument","name":{"kind":"Name","value":"linkType"},"value":{"kind":"Variable","name":{"kind":"Name","value":"linkType"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"linkType"}},{"kind":"Field","name":{"kind":"Name","value":"issue"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"title"}},{"kind":"Field","name":{"kind":"Name","value":"description"}},{"kind":"Field","name":{"kind":"Name","value":"category"}},{"kind":"Field","name":{"kind":"Name","value":"severity"}},{"kind":"Field","name":{"kind":"Name","value":"familyMemberId"}},{"kind":"Field","name":{"kind":"Name","value":"createdBy"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}}]}}]}}]}}]} as unknown as DocumentNode<CreateRelatedIssueMutation, CreateRelatedIssueMutationVariables>;
export const CreateRelationshipDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"CreateRelationship"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"input"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"CreateRelationshipInput"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"createRelationship"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"Variable","name":{"kind":"Name","value":"input"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"createdBy"}},{"kind":"Field","name":{"kind":"Name","value":"subjectType"}},{"kind":"Field","name":{"kind":"Name","value":"subjectId"}},{"kind":"Field","name":{"kind":"Name","value":"relatedType"}},{"kind":"Field","name":{"kind":"Name","value":"relatedId"}},{"kind":"Field","name":{"kind":"Name","value":"relationshipType"}},{"kind":"Field","name":{"kind":"Name","value":"context"}},{"kind":"Field","name":{"kind":"Name","value":"startDate"}},{"kind":"Field","name":{"kind":"Name","value":"status"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}}]}}]}}]} as unknown as DocumentNode<CreateRelationshipMutation, CreateRelationshipMutationVariables>;
export const CreateStoryDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"CreateStory"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"input"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"CreateStoryInput"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"createStory"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"Variable","name":{"kind":"Name","value":"input"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"goalId"}},{"kind":"Field","name":{"kind":"Name","value":"createdBy"}},{"kind":"Field","name":{"kind":"Name","value":"content"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}}]}}]}}]} as unknown as DocumentNode<CreateStoryMutation, CreateStoryMutationVariables>;
export const CreateSubGoalDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"CreateSubGoal"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"goalId"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"Int"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"input"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"CreateSubGoalInput"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"createSubGoal"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"goalId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"goalId"}}},{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"Variable","name":{"kind":"Name","value":"input"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"slug"}},{"kind":"Field","name":{"kind":"Name","value":"title"}},{"kind":"Field","name":{"kind":"Name","value":"description"}},{"kind":"Field","name":{"kind":"Name","value":"status"}},{"kind":"Field","name":{"kind":"Name","value":"parentGoalId"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}},{"kind":"Field","name":{"kind":"Name","value":"familyMemberId"}}]}}]}}]} as unknown as DocumentNode<CreateSubGoalMutation, CreateSubGoalMutationVariables>;
export const CreateTeacherFeedbackDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"CreateTeacherFeedback"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"input"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"CreateTeacherFeedbackInput"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"createTeacherFeedback"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"Variable","name":{"kind":"Name","value":"input"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"familyMemberId"}},{"kind":"Field","name":{"kind":"Name","value":"createdBy"}},{"kind":"Field","name":{"kind":"Name","value":"teacherName"}},{"kind":"Field","name":{"kind":"Name","value":"subject"}},{"kind":"Field","name":{"kind":"Name","value":"feedbackDate"}},{"kind":"Field","name":{"kind":"Name","value":"content"}},{"kind":"Field","name":{"kind":"Name","value":"tags"}},{"kind":"Field","name":{"kind":"Name","value":"source"}},{"kind":"Field","name":{"kind":"Name","value":"extracted"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}}]}}]}}]} as unknown as DocumentNode<CreateTeacherFeedbackMutation, CreateTeacherFeedbackMutationVariables>;
export const DeleteAffirmationDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"DeleteAffirmation"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"id"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"Int"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"deleteAffirmation"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"id"},"value":{"kind":"Variable","name":{"kind":"Name","value":"id"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"success"}},{"kind":"Field","name":{"kind":"Name","value":"message"}}]}}]}}]} as unknown as DocumentNode<DeleteAffirmationMutation, DeleteAffirmationMutationVariables>;
export const DeleteAllergyDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"DeleteAllergy"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"id"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"deleteAllergy"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"id"},"value":{"kind":"Variable","name":{"kind":"Name","value":"id"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"success"}}]}}]}}]} as unknown as DocumentNode<DeleteAllergyMutation, DeleteAllergyMutationVariables>;
export const DeleteAppointmentDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"DeleteAppointment"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"id"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"deleteAppointment"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"id"},"value":{"kind":"Variable","name":{"kind":"Name","value":"id"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"success"}}]}}]}}]} as unknown as DocumentNode<DeleteAppointmentMutation, DeleteAppointmentMutationVariables>;
export const DeleteBehaviorObservationDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"DeleteBehaviorObservation"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"id"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"Int"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"deleteBehaviorObservation"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"id"},"value":{"kind":"Variable","name":{"kind":"Name","value":"id"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"success"}},{"kind":"Field","name":{"kind":"Name","value":"message"}}]}}]}}]} as unknown as DocumentNode<DeleteBehaviorObservationMutation, DeleteBehaviorObservationMutationVariables>;
export const DeleteConditionDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"DeleteCondition"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"id"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"deleteCondition"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"id"},"value":{"kind":"Variable","name":{"kind":"Name","value":"id"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"success"}}]}}]}}]} as unknown as DocumentNode<DeleteConditionMutation, DeleteConditionMutationVariables>;
export const DeleteContactDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"DeleteContact"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"id"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"Int"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"deleteContact"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"id"},"value":{"kind":"Variable","name":{"kind":"Name","value":"id"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"success"}},{"kind":"Field","name":{"kind":"Name","value":"message"}}]}}]}}]} as unknown as DocumentNode<DeleteContactMutation, DeleteContactMutationVariables>;
export const DeleteContactFeedbackDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"DeleteContactFeedback"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"id"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"Int"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"deleteContactFeedback"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"id"},"value":{"kind":"Variable","name":{"kind":"Name","value":"id"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"success"}},{"kind":"Field","name":{"kind":"Name","value":"message"}}]}}]}}]} as unknown as DocumentNode<DeleteContactFeedbackMutation, DeleteContactFeedbackMutationVariables>;
export const DeleteConversationDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"DeleteConversation"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"id"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"Int"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"deleteConversation"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"id"},"value":{"kind":"Variable","name":{"kind":"Name","value":"id"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}}]}}]}}]} as unknown as DocumentNode<DeleteConversationMutation, DeleteConversationMutationVariables>;
export const DeleteDeepAnalysisDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"DeleteDeepAnalysis"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"id"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"Int"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"deleteDeepAnalysis"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"id"},"value":{"kind":"Variable","name":{"kind":"Name","value":"id"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"success"}},{"kind":"Field","name":{"kind":"Name","value":"message"}}]}}]}}]} as unknown as DocumentNode<DeleteDeepAnalysisMutation, DeleteDeepAnalysisMutationVariables>;
export const DeleteDeepIssueAnalysisDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"DeleteDeepIssueAnalysis"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"id"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"Int"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"deleteDeepIssueAnalysis"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"id"},"value":{"kind":"Variable","name":{"kind":"Name","value":"id"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"success"}},{"kind":"Field","name":{"kind":"Name","value":"message"}}]}}]}}]} as unknown as DocumentNode<DeleteDeepIssueAnalysisMutation, DeleteDeepIssueAnalysisMutationVariables>;
export const DeleteDiscussionGuideDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"DeleteDiscussionGuide"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"journalEntryId"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"Int"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"deleteDiscussionGuide"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"journalEntryId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"journalEntryId"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"success"}},{"kind":"Field","name":{"kind":"Name","value":"message"}}]}}]}}]} as unknown as DocumentNode<DeleteDiscussionGuideMutation, DeleteDiscussionGuideMutationVariables>;
export const DeleteDoctorDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"DeleteDoctor"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"id"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"deleteDoctor"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"id"},"value":{"kind":"Variable","name":{"kind":"Name","value":"id"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"success"}}]}}]}}]} as unknown as DocumentNode<DeleteDoctorMutation, DeleteDoctorMutationVariables>;
export const DeleteFamilyMemberDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"DeleteFamilyMember"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"id"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"Int"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"deleteFamilyMember"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"id"},"value":{"kind":"Variable","name":{"kind":"Name","value":"id"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"success"}},{"kind":"Field","name":{"kind":"Name","value":"message"}}]}}]}}]} as unknown as DocumentNode<DeleteFamilyMemberMutation, DeleteFamilyMemberMutationVariables>;
export const DeleteGameDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"DeleteGame"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"id"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"Int"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"deleteGame"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"id"},"value":{"kind":"Variable","name":{"kind":"Name","value":"id"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"success"}},{"kind":"Field","name":{"kind":"Name","value":"message"}}]}}]}}]} as unknown as DocumentNode<DeleteGameMutation, DeleteGameMutationVariables>;
export const DeleteGoalDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"DeleteGoal"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"id"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"Int"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"deleteGoal"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"id"},"value":{"kind":"Variable","name":{"kind":"Name","value":"id"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"success"}},{"kind":"Field","name":{"kind":"Name","value":"message"}}]}}]}}]} as unknown as DocumentNode<DeleteGoalMutation, DeleteGoalMutationVariables>;
export const DeleteHabitDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"DeleteHabit"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"id"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"Int"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"deleteHabit"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"id"},"value":{"kind":"Variable","name":{"kind":"Name","value":"id"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"success"}},{"kind":"Field","name":{"kind":"Name","value":"message"}}]}}]}}]} as unknown as DocumentNode<DeleteHabitMutation, DeleteHabitMutationVariables>;
export const DeleteHabitLogDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"DeleteHabitLog"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"id"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"Int"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"deleteHabitLog"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"id"},"value":{"kind":"Variable","name":{"kind":"Name","value":"id"}}}]}]}}]} as unknown as DocumentNode<DeleteHabitLogMutation, DeleteHabitLogMutationVariables>;
export const DeleteIssueDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"DeleteIssue"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"id"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"Int"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"deleteIssue"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"id"},"value":{"kind":"Variable","name":{"kind":"Name","value":"id"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"success"}},{"kind":"Field","name":{"kind":"Name","value":"message"}}]}}]}}]} as unknown as DocumentNode<DeleteIssueMutation, DeleteIssueMutationVariables>;
export const DeleteIssueScreenshotDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"DeleteIssueScreenshot"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"id"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"Int"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"deleteIssueScreenshot"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"id"},"value":{"kind":"Variable","name":{"kind":"Name","value":"id"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"success"}}]}}]}}]} as unknown as DocumentNode<DeleteIssueScreenshotMutation, DeleteIssueScreenshotMutationVariables>;
export const DeleteJournalAnalysisDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"DeleteJournalAnalysis"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"journalEntryId"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"Int"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"deleteJournalAnalysis"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"journalEntryId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"journalEntryId"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"success"}},{"kind":"Field","name":{"kind":"Name","value":"message"}}]}}]}}]} as unknown as DocumentNode<DeleteJournalAnalysisMutation, DeleteJournalAnalysisMutationVariables>;
export const DeleteJournalEntryDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"DeleteJournalEntry"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"id"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"Int"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"deleteJournalEntry"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"id"},"value":{"kind":"Variable","name":{"kind":"Name","value":"id"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"success"}},{"kind":"Field","name":{"kind":"Name","value":"message"}}]}}]}}]} as unknown as DocumentNode<DeleteJournalEntryMutation, DeleteJournalEntryMutationVariables>;
export const DeleteJournalRecommendedBooksDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"DeleteJournalRecommendedBooks"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"journalEntryId"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"Int"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"deleteRecommendedBooks"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"journalEntryId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"journalEntryId"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"success"}},{"kind":"Field","name":{"kind":"Name","value":"message"}},{"kind":"Field","name":{"kind":"Name","value":"deletedCount"}}]}}]}}]} as unknown as DocumentNode<DeleteJournalRecommendedBooksMutation, DeleteJournalRecommendedBooksMutationVariables>;
export const DeleteMedicationDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"DeleteMedication"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"id"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"deleteMedication"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"id"},"value":{"kind":"Variable","name":{"kind":"Name","value":"id"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"success"}}]}}]}}]} as unknown as DocumentNode<DeleteMedicationMutation, DeleteMedicationMutationVariables>;
export const DeleteMemoryEntryDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"DeleteMemoryEntry"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"id"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"deleteMemoryEntry"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"id"},"value":{"kind":"Variable","name":{"kind":"Name","value":"id"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"success"}}]}}]}}]} as unknown as DocumentNode<DeleteMemoryEntryMutation, DeleteMemoryEntryMutationVariables>;
export const DeleteNoteDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"DeleteNote"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"id"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"Int"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"deleteNote"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"id"},"value":{"kind":"Variable","name":{"kind":"Name","value":"id"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"success"}},{"kind":"Field","name":{"kind":"Name","value":"message"}}]}}]}}]} as unknown as DocumentNode<DeleteNoteMutation, DeleteNoteMutationVariables>;
export const DeleteProtocolDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"DeleteProtocol"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"id"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"deleteProtocol"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"id"},"value":{"kind":"Variable","name":{"kind":"Name","value":"id"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"success"}}]}}]}}]} as unknown as DocumentNode<DeleteProtocolMutation, DeleteProtocolMutationVariables>;
export const DeleteRecommendedBooksDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"DeleteRecommendedBooks"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"goalId"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"Int"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"deleteRecommendedBooks"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"goalId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"goalId"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"success"}},{"kind":"Field","name":{"kind":"Name","value":"message"}},{"kind":"Field","name":{"kind":"Name","value":"deletedCount"}}]}}]}}]} as unknown as DocumentNode<DeleteRecommendedBooksMutation, DeleteRecommendedBooksMutationVariables>;
export const DeleteRelationshipDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"DeleteRelationship"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"id"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"Int"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"deleteRelationship"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"id"},"value":{"kind":"Variable","name":{"kind":"Name","value":"id"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"success"}},{"kind":"Field","name":{"kind":"Name","value":"message"}}]}}]}}]} as unknown as DocumentNode<DeleteRelationshipMutation, DeleteRelationshipMutationVariables>;
export const DeleteResearchDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"DeleteResearch"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"goalId"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"Int"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"deleteResearch"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"goalId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"goalId"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"success"}},{"kind":"Field","name":{"kind":"Name","value":"message"}},{"kind":"Field","name":{"kind":"Name","value":"deletedCount"}}]}}]}}]} as unknown as DocumentNode<DeleteResearchMutation, DeleteResearchMutationVariables>;
export const DeleteRoutineAnalysisDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"DeleteRoutineAnalysis"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"id"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"Int"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"deleteRoutineAnalysis"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"id"},"value":{"kind":"Variable","name":{"kind":"Name","value":"id"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"success"}},{"kind":"Field","name":{"kind":"Name","value":"message"}}]}}]}}]} as unknown as DocumentNode<DeleteRoutineAnalysisMutation, DeleteRoutineAnalysisMutationVariables>;
export const DeleteStoryDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"DeleteStory"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"id"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"Int"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"deleteStory"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"id"},"value":{"kind":"Variable","name":{"kind":"Name","value":"id"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"success"}},{"kind":"Field","name":{"kind":"Name","value":"message"}}]}}]}}]} as unknown as DocumentNode<DeleteStoryMutation, DeleteStoryMutationVariables>;
export const DeleteSupplementDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"DeleteSupplement"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"id"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"deleteSupplement"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"id"},"value":{"kind":"Variable","name":{"kind":"Name","value":"id"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"success"}}]}}]}}]} as unknown as DocumentNode<DeleteSupplementMutation, DeleteSupplementMutationVariables>;
export const DeleteSymptomDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"DeleteSymptom"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"id"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"deleteSymptom"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"id"},"value":{"kind":"Variable","name":{"kind":"Name","value":"id"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"success"}}]}}]}}]} as unknown as DocumentNode<DeleteSymptomMutation, DeleteSymptomMutationVariables>;
export const DeleteTeacherFeedbackDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"DeleteTeacherFeedback"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"id"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"Int"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"deleteTeacherFeedback"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"id"},"value":{"kind":"Variable","name":{"kind":"Name","value":"id"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"success"}},{"kind":"Field","name":{"kind":"Name","value":"message"}}]}}]}}]} as unknown as DocumentNode<DeleteTeacherFeedbackMutation, DeleteTeacherFeedbackMutationVariables>;
export const DeleteTherapeuticQuestionsDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"DeleteTherapeuticQuestions"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"goalId"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"Int"}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"issueId"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"Int"}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"journalEntryId"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"Int"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"deleteTherapeuticQuestions"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"goalId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"goalId"}}},{"kind":"Argument","name":{"kind":"Name","value":"issueId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"issueId"}}},{"kind":"Argument","name":{"kind":"Name","value":"journalEntryId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"journalEntryId"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"success"}},{"kind":"Field","name":{"kind":"Name","value":"message"}},{"kind":"Field","name":{"kind":"Name","value":"deletedCount"}}]}}]}}]} as unknown as DocumentNode<DeleteTherapeuticQuestionsMutation, DeleteTherapeuticQuestionsMutationVariables>;
export const DoctorsDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"Doctors"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"doctors"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"specialty"}},{"kind":"Field","name":{"kind":"Name","value":"phone"}},{"kind":"Field","name":{"kind":"Name","value":"email"}},{"kind":"Field","name":{"kind":"Name","value":"address"}},{"kind":"Field","name":{"kind":"Name","value":"notes"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}}]}}]}}]} as unknown as DocumentNode<DoctorsQuery, DoctorsQueryVariables>;
export const ExtractContactFeedbackIssuesDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"ExtractContactFeedbackIssues"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"id"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"Int"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"extractContactFeedbackIssues"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"id"},"value":{"kind":"Variable","name":{"kind":"Name","value":"id"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"extracted"}},{"kind":"Field","name":{"kind":"Name","value":"extractedIssues"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"title"}},{"kind":"Field","name":{"kind":"Name","value":"description"}},{"kind":"Field","name":{"kind":"Name","value":"category"}},{"kind":"Field","name":{"kind":"Name","value":"severity"}},{"kind":"Field","name":{"kind":"Name","value":"recommendations"}}]}}]}}]}}]} as unknown as DocumentNode<ExtractContactFeedbackIssuesMutation, ExtractContactFeedbackIssuesMutationVariables>;
export const GenerateAffirmationsForFamilyMemberDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"GenerateAffirmationsForFamilyMember"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"familyMemberId"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"Int"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"count"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"Int"}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"categoryFocus"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"AffirmationCategory"}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"language"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"generateAffirmationsForFamilyMember"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"familyMemberId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"familyMemberId"}}},{"kind":"Argument","name":{"kind":"Name","value":"count"},"value":{"kind":"Variable","name":{"kind":"Name","value":"count"}}},{"kind":"Argument","name":{"kind":"Name","value":"categoryFocus"},"value":{"kind":"Variable","name":{"kind":"Name","value":"categoryFocus"}}},{"kind":"Argument","name":{"kind":"Name","value":"language"},"value":{"kind":"Variable","name":{"kind":"Name","value":"language"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"success"}},{"kind":"Field","name":{"kind":"Name","value":"message"}},{"kind":"Field","name":{"kind":"Name","value":"count"}},{"kind":"Field","name":{"kind":"Name","value":"affirmations"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"familyMemberId"}},{"kind":"Field","name":{"kind":"Name","value":"userId"}},{"kind":"Field","name":{"kind":"Name","value":"text"}},{"kind":"Field","name":{"kind":"Name","value":"category"}},{"kind":"Field","name":{"kind":"Name","value":"isActive"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}}]}}]}}]}}]} as unknown as DocumentNode<GenerateAffirmationsForFamilyMemberMutation, GenerateAffirmationsForFamilyMemberMutationVariables>;
export const GenerateAudioDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"GenerateAudio"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"goalId"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"Int"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"storyId"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"Int"}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"text"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"language"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"voice"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"generateAudio"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"goalId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"goalId"}}},{"kind":"Argument","name":{"kind":"Name","value":"storyId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"storyId"}}},{"kind":"Argument","name":{"kind":"Name","value":"text"},"value":{"kind":"Variable","name":{"kind":"Name","value":"text"}}},{"kind":"Argument","name":{"kind":"Name","value":"language"},"value":{"kind":"Variable","name":{"kind":"Name","value":"language"}}},{"kind":"Argument","name":{"kind":"Name","value":"voice"},"value":{"kind":"Variable","name":{"kind":"Name","value":"voice"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"success"}},{"kind":"Field","name":{"kind":"Name","value":"message"}},{"kind":"Field","name":{"kind":"Name","value":"jobId"}},{"kind":"Field","name":{"kind":"Name","value":"audioUrl"}}]}}]}}]} as unknown as DocumentNode<GenerateAudioMutation, GenerateAudioMutationVariables>;
export const GenerateBogdanDiscussionDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"GenerateBogdanDiscussion"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"generateBogdanDiscussion"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"success"}},{"kind":"Field","name":{"kind":"Name","value":"message"}},{"kind":"Field","name":{"kind":"Name","value":"jobId"}}]}}]}}]} as unknown as DocumentNode<GenerateBogdanDiscussionMutation, GenerateBogdanDiscussionMutationVariables>;
export const GenerateDeepAnalysisDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"GenerateDeepAnalysis"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"subjectType"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"DeepAnalysisSubjectType"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"subjectId"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"Int"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"triggerType"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"DeepAnalysisTriggerType"}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"triggerId"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"Int"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"generateDeepAnalysis"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"subjectType"},"value":{"kind":"Variable","name":{"kind":"Name","value":"subjectType"}}},{"kind":"Argument","name":{"kind":"Name","value":"subjectId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"subjectId"}}},{"kind":"Argument","name":{"kind":"Name","value":"triggerType"},"value":{"kind":"Variable","name":{"kind":"Name","value":"triggerType"}}},{"kind":"Argument","name":{"kind":"Name","value":"triggerId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"triggerId"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"success"}},{"kind":"Field","name":{"kind":"Name","value":"message"}},{"kind":"Field","name":{"kind":"Name","value":"jobId"}}]}}]}}]} as unknown as DocumentNode<GenerateDeepAnalysisMutation, GenerateDeepAnalysisMutationVariables>;
export const GenerateDeepIssueAnalysisDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"GenerateDeepIssueAnalysis"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"familyMemberId"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"Int"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"triggerIssueId"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"Int"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"generateDeepIssueAnalysis"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"familyMemberId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"familyMemberId"}}},{"kind":"Argument","name":{"kind":"Name","value":"triggerIssueId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"triggerIssueId"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"success"}},{"kind":"Field","name":{"kind":"Name","value":"message"}},{"kind":"Field","name":{"kind":"Name","value":"jobId"}}]}}]}}]} as unknown as DocumentNode<GenerateDeepIssueAnalysisMutation, GenerateDeepIssueAnalysisMutationVariables>;
export const GenerateDiscussionGuideDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"GenerateDiscussionGuide"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"journalEntryId"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"Int"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"generateDiscussionGuide"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"journalEntryId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"journalEntryId"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"success"}},{"kind":"Field","name":{"kind":"Name","value":"message"}},{"kind":"Field","name":{"kind":"Name","value":"jobId"}}]}}]}}]} as unknown as DocumentNode<GenerateDiscussionGuideMutation, GenerateDiscussionGuideMutationVariables>;
export const GenerateGameDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"GenerateGame"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"input"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"GenerateGameInput"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"generateGame"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"Variable","name":{"kind":"Name","value":"input"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"type"}},{"kind":"Field","name":{"kind":"Name","value":"title"}},{"kind":"Field","name":{"kind":"Name","value":"description"}},{"kind":"Field","name":{"kind":"Name","value":"content"}},{"kind":"Field","name":{"kind":"Name","value":"language"}},{"kind":"Field","name":{"kind":"Name","value":"estimatedMinutes"}},{"kind":"Field","name":{"kind":"Name","value":"source"}},{"kind":"Field","name":{"kind":"Name","value":"goalId"}},{"kind":"Field","name":{"kind":"Name","value":"issueId"}},{"kind":"Field","name":{"kind":"Name","value":"familyMemberId"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}}]}}]}}]} as unknown as DocumentNode<GenerateGameMutation, GenerateGameMutationVariables>;
export const GenerateHabitsForFamilyMemberDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"GenerateHabitsForFamilyMember"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"familyMemberId"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"Int"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"count"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"Int"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"generateHabitsForFamilyMember"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"familyMemberId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"familyMemberId"}}},{"kind":"Argument","name":{"kind":"Name","value":"count"},"value":{"kind":"Variable","name":{"kind":"Name","value":"count"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"success"}},{"kind":"Field","name":{"kind":"Name","value":"message"}},{"kind":"Field","name":{"kind":"Name","value":"count"}},{"kind":"Field","name":{"kind":"Name","value":"habits"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"title"}},{"kind":"Field","name":{"kind":"Name","value":"description"}},{"kind":"Field","name":{"kind":"Name","value":"frequency"}},{"kind":"Field","name":{"kind":"Name","value":"targetCount"}},{"kind":"Field","name":{"kind":"Name","value":"status"}},{"kind":"Field","name":{"kind":"Name","value":"familyMemberId"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}}]}}]}}]}}]} as unknown as DocumentNode<GenerateHabitsForFamilyMemberMutation, GenerateHabitsForFamilyMemberMutationVariables>;
export const GenerateHabitsFromIssueDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"GenerateHabitsFromIssue"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"issueId"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"Int"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"count"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"Int"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"generateHabitsFromIssue"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"issueId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"issueId"}}},{"kind":"Argument","name":{"kind":"Name","value":"count"},"value":{"kind":"Variable","name":{"kind":"Name","value":"count"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"success"}},{"kind":"Field","name":{"kind":"Name","value":"message"}},{"kind":"Field","name":{"kind":"Name","value":"count"}},{"kind":"Field","name":{"kind":"Name","value":"habits"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"title"}},{"kind":"Field","name":{"kind":"Name","value":"description"}},{"kind":"Field","name":{"kind":"Name","value":"frequency"}},{"kind":"Field","name":{"kind":"Name","value":"targetCount"}},{"kind":"Field","name":{"kind":"Name","value":"status"}},{"kind":"Field","name":{"kind":"Name","value":"familyMemberId"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}}]}}]}}]}}]} as unknown as DocumentNode<GenerateHabitsFromIssueMutation, GenerateHabitsFromIssueMutationVariables>;
export const GenerateJournalAnalysisDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"GenerateJournalAnalysis"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"journalEntryId"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"Int"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"generateJournalAnalysis"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"journalEntryId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"journalEntryId"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"success"}},{"kind":"Field","name":{"kind":"Name","value":"message"}},{"kind":"Field","name":{"kind":"Name","value":"jobId"}}]}}]}}]} as unknown as DocumentNode<GenerateJournalAnalysisMutation, GenerateJournalAnalysisMutationVariables>;
export const GenerateJournalRecommendedBooksDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"GenerateJournalRecommendedBooks"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"journalEntryId"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"Int"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"generateRecommendedBooks"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"journalEntryId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"journalEntryId"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"success"}},{"kind":"Field","name":{"kind":"Name","value":"message"}},{"kind":"Field","name":{"kind":"Name","value":"jobId"}},{"kind":"Field","name":{"kind":"Name","value":"books"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"goalId"}},{"kind":"Field","name":{"kind":"Name","value":"journalEntryId"}},{"kind":"Field","name":{"kind":"Name","value":"title"}},{"kind":"Field","name":{"kind":"Name","value":"authors"}},{"kind":"Field","name":{"kind":"Name","value":"year"}},{"kind":"Field","name":{"kind":"Name","value":"isbn"}},{"kind":"Field","name":{"kind":"Name","value":"description"}},{"kind":"Field","name":{"kind":"Name","value":"whyRecommended"}},{"kind":"Field","name":{"kind":"Name","value":"category"}},{"kind":"Field","name":{"kind":"Name","value":"amazonUrl"}},{"kind":"Field","name":{"kind":"Name","value":"generatedAt"}}]}}]}}]}}]} as unknown as DocumentNode<GenerateJournalRecommendedBooksMutation, GenerateJournalRecommendedBooksMutationVariables>;
export const GenerateLongFormTextDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"GenerateLongFormText"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"goalId"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"Int"}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"issueId"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"Int"}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"feedbackId"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"Int"}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"journalEntryId"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"Int"}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"familyMemberId"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"Int"}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"userContext"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"language"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"minutes"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"Int"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"generateLongFormText"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"goalId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"goalId"}}},{"kind":"Argument","name":{"kind":"Name","value":"issueId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"issueId"}}},{"kind":"Argument","name":{"kind":"Name","value":"feedbackId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"feedbackId"}}},{"kind":"Argument","name":{"kind":"Name","value":"journalEntryId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"journalEntryId"}}},{"kind":"Argument","name":{"kind":"Name","value":"familyMemberId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"familyMemberId"}}},{"kind":"Argument","name":{"kind":"Name","value":"userContext"},"value":{"kind":"Variable","name":{"kind":"Name","value":"userContext"}}},{"kind":"Argument","name":{"kind":"Name","value":"language"},"value":{"kind":"Variable","name":{"kind":"Name","value":"language"}}},{"kind":"Argument","name":{"kind":"Name","value":"minutes"},"value":{"kind":"Variable","name":{"kind":"Name","value":"minutes"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"success"}},{"kind":"Field","name":{"kind":"Name","value":"message"}},{"kind":"Field","name":{"kind":"Name","value":"jobId"}},{"kind":"Field","name":{"kind":"Name","value":"storyId"}},{"kind":"Field","name":{"kind":"Name","value":"text"}},{"kind":"Field","name":{"kind":"Name","value":"audioUrl"}},{"kind":"Field","name":{"kind":"Name","value":"manifestUrl"}},{"kind":"Field","name":{"kind":"Name","value":"segmentUrls"}}]}}]}}]} as unknown as DocumentNode<GenerateLongFormTextMutation, GenerateLongFormTextMutationVariables>;
export const GenerateLongFormTextRomanianDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"GenerateLongFormTextRomanian"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"goalId"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"Int"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"generateLongFormText"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"goalId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"goalId"}}},{"kind":"Argument","name":{"kind":"Name","value":"language"},"value":{"kind":"StringValue","value":"Romanian","block":false}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"success"}},{"kind":"Field","name":{"kind":"Name","value":"message"}},{"kind":"Field","name":{"kind":"Name","value":"text"}},{"kind":"Field","name":{"kind":"Name","value":"audioUrl"}},{"kind":"Field","name":{"kind":"Name","value":"manifestUrl"}},{"kind":"Field","name":{"kind":"Name","value":"segmentUrls"}}]}}]}}]} as unknown as DocumentNode<GenerateLongFormTextRomanianMutation, GenerateLongFormTextRomanianMutationVariables>;
export const GenerateOpenAiAudioDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"GenerateOpenAIAudio"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"input"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"GenerateOpenAIAudioInput"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"generateOpenAIAudio"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"Variable","name":{"kind":"Name","value":"input"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"success"}},{"kind":"Field","name":{"kind":"Name","value":"message"}},{"kind":"Field","name":{"kind":"Name","value":"jobId"}},{"kind":"Field","name":{"kind":"Name","value":"audioBuffer"}},{"kind":"Field","name":{"kind":"Name","value":"audioUrl"}},{"kind":"Field","name":{"kind":"Name","value":"sizeBytes"}},{"kind":"Field","name":{"kind":"Name","value":"duration"}}]}}]}}]} as unknown as DocumentNode<GenerateOpenAiAudioMutation, GenerateOpenAiAudioMutationVariables>;
export const GenerateParentAdviceDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"GenerateParentAdvice"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"goalId"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"Int"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"language"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"generateParentAdvice"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"goalId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"goalId"}}},{"kind":"Argument","name":{"kind":"Name","value":"language"},"value":{"kind":"Variable","name":{"kind":"Name","value":"language"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"success"}},{"kind":"Field","name":{"kind":"Name","value":"message"}},{"kind":"Field","name":{"kind":"Name","value":"parentAdvice"}}]}}]}}]} as unknown as DocumentNode<GenerateParentAdviceMutation, GenerateParentAdviceMutationVariables>;
export const GenerateRecommendedBooksDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"GenerateRecommendedBooks"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"goalId"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"Int"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"generateRecommendedBooks"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"goalId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"goalId"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"success"}},{"kind":"Field","name":{"kind":"Name","value":"message"}},{"kind":"Field","name":{"kind":"Name","value":"jobId"}},{"kind":"Field","name":{"kind":"Name","value":"books"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"goalId"}},{"kind":"Field","name":{"kind":"Name","value":"title"}},{"kind":"Field","name":{"kind":"Name","value":"authors"}},{"kind":"Field","name":{"kind":"Name","value":"year"}},{"kind":"Field","name":{"kind":"Name","value":"isbn"}},{"kind":"Field","name":{"kind":"Name","value":"description"}},{"kind":"Field","name":{"kind":"Name","value":"whyRecommended"}},{"kind":"Field","name":{"kind":"Name","value":"category"}},{"kind":"Field","name":{"kind":"Name","value":"amazonUrl"}},{"kind":"Field","name":{"kind":"Name","value":"generatedAt"}}]}}]}}]}}]} as unknown as DocumentNode<GenerateRecommendedBooksMutation, GenerateRecommendedBooksMutationVariables>;
export const GenerateResearchDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"GenerateResearch"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"goalId"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"Int"}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"issueId"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"Int"}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"feedbackId"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"Int"}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"journalEntryId"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"Int"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"generateResearch"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"goalId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"goalId"}}},{"kind":"Argument","name":{"kind":"Name","value":"issueId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"issueId"}}},{"kind":"Argument","name":{"kind":"Name","value":"feedbackId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"feedbackId"}}},{"kind":"Argument","name":{"kind":"Name","value":"journalEntryId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"journalEntryId"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"success"}},{"kind":"Field","name":{"kind":"Name","value":"message"}},{"kind":"Field","name":{"kind":"Name","value":"jobId"}},{"kind":"Field","name":{"kind":"Name","value":"count"}}]}}]}}]} as unknown as DocumentNode<GenerateResearchMutation, GenerateResearchMutationVariables>;
export const GenerateRoutineAnalysisDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"GenerateRoutineAnalysis"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"familyMemberId"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"Int"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"generateRoutineAnalysis"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"familyMemberId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"familyMemberId"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"success"}},{"kind":"Field","name":{"kind":"Name","value":"message"}},{"kind":"Field","name":{"kind":"Name","value":"jobId"}}]}}]}}]} as unknown as DocumentNode<GenerateRoutineAnalysisMutation, GenerateRoutineAnalysisMutationVariables>;
export const GenerateTherapeuticQuestionsDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"GenerateTherapeuticQuestions"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"goalId"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"Int"}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"issueId"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"Int"}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"journalEntryId"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"Int"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"generateTherapeuticQuestions"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"goalId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"goalId"}}},{"kind":"Argument","name":{"kind":"Name","value":"issueId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"issueId"}}},{"kind":"Argument","name":{"kind":"Name","value":"journalEntryId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"journalEntryId"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"success"}},{"kind":"Field","name":{"kind":"Name","value":"message"}},{"kind":"Field","name":{"kind":"Name","value":"jobId"}},{"kind":"Field","name":{"kind":"Name","value":"questions"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"goalId"}},{"kind":"Field","name":{"kind":"Name","value":"issueId"}},{"kind":"Field","name":{"kind":"Name","value":"journalEntryId"}},{"kind":"Field","name":{"kind":"Name","value":"question"}},{"kind":"Field","name":{"kind":"Name","value":"researchId"}},{"kind":"Field","name":{"kind":"Name","value":"researchTitle"}},{"kind":"Field","name":{"kind":"Name","value":"rationale"}},{"kind":"Field","name":{"kind":"Name","value":"generatedAt"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}}]}}]}}]}}]} as unknown as DocumentNode<GenerateTherapeuticQuestionsMutation, GenerateTherapeuticQuestionsMutationVariables>;
export const GetAffirmationsDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"GetAffirmations"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"familyMemberId"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"Int"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"affirmations"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"familyMemberId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"familyMemberId"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"familyMemberId"}},{"kind":"Field","name":{"kind":"Name","value":"text"}},{"kind":"Field","name":{"kind":"Name","value":"category"}},{"kind":"Field","name":{"kind":"Name","value":"isActive"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}}]}}]}}]} as unknown as DocumentNode<GetAffirmationsQuery, GetAffirmationsQueryVariables>;
export const GetAllIssuesDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"GetAllIssues"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"allIssues"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"familyMemberId"}},{"kind":"Field","name":{"kind":"Name","value":"title"}},{"kind":"Field","name":{"kind":"Name","value":"description"}},{"kind":"Field","name":{"kind":"Name","value":"category"}},{"kind":"Field","name":{"kind":"Name","value":"severity"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}},{"kind":"Field","name":{"kind":"Name","value":"familyMember"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"firstName"}},{"kind":"Field","name":{"kind":"Name","value":"name"}}]}}]}}]}}]} as unknown as DocumentNode<GetAllIssuesQuery, GetAllIssuesQueryVariables>;
export const GetAllNotesDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"GetAllNotes"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"allNotes"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"entityId"}},{"kind":"Field","name":{"kind":"Name","value":"entityType"}},{"kind":"Field","name":{"kind":"Name","value":"createdBy"}},{"kind":"Field","name":{"kind":"Name","value":"noteType"}},{"kind":"Field","name":{"kind":"Name","value":"slug"}},{"kind":"Field","name":{"kind":"Name","value":"title"}},{"kind":"Field","name":{"kind":"Name","value":"content"}},{"kind":"Field","name":{"kind":"Name","value":"createdBy"}},{"kind":"Field","name":{"kind":"Name","value":"tags"}},{"kind":"Field","name":{"kind":"Name","value":"goal"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"title"}},{"kind":"Field","name":{"kind":"Name","value":"description"}},{"kind":"Field","name":{"kind":"Name","value":"status"}}]}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}}]}}]}}]} as unknown as DocumentNode<GetAllNotesQuery, GetAllNotesQueryVariables>;
export const GetAllRecommendedBooksDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"GetAllRecommendedBooks"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"category"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"allRecommendedBooks"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"category"},"value":{"kind":"Variable","name":{"kind":"Name","value":"category"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"goalId"}},{"kind":"Field","name":{"kind":"Name","value":"title"}},{"kind":"Field","name":{"kind":"Name","value":"authors"}},{"kind":"Field","name":{"kind":"Name","value":"year"}},{"kind":"Field","name":{"kind":"Name","value":"isbn"}},{"kind":"Field","name":{"kind":"Name","value":"description"}},{"kind":"Field","name":{"kind":"Name","value":"whyRecommended"}},{"kind":"Field","name":{"kind":"Name","value":"category"}},{"kind":"Field","name":{"kind":"Name","value":"amazonUrl"}},{"kind":"Field","name":{"kind":"Name","value":"generatedAt"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}}]}}]}}]} as unknown as DocumentNode<GetAllRecommendedBooksQuery, GetAllRecommendedBooksQueryVariables>;
export const GetAllStoriesDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"GetAllStories"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"allStories"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"goalId"}},{"kind":"Field","name":{"kind":"Name","value":"issueId"}},{"kind":"Field","name":{"kind":"Name","value":"feedbackId"}},{"kind":"Field","name":{"kind":"Name","value":"createdBy"}},{"kind":"Field","name":{"kind":"Name","value":"content"}},{"kind":"Field","name":{"kind":"Name","value":"language"}},{"kind":"Field","name":{"kind":"Name","value":"minutes"}},{"kind":"Field","name":{"kind":"Name","value":"audioKey"}},{"kind":"Field","name":{"kind":"Name","value":"audioUrl"}},{"kind":"Field","name":{"kind":"Name","value":"audioGeneratedAt"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}},{"kind":"Field","name":{"kind":"Name","value":"goal"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"title"}},{"kind":"Field","name":{"kind":"Name","value":"slug"}}]}}]}}]}}]} as unknown as DocumentNode<GetAllStoriesQuery, GetAllStoriesQueryVariables>;
export const GetAllTagsDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"GetAllTags"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"allTags"}}]}}]} as unknown as DocumentNode<GetAllTagsQuery, GetAllTagsQueryVariables>;
export const GetAudioFromR2Document = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"GetAudioFromR2"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"key"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"audioFromR2"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"key"},"value":{"kind":"Variable","name":{"kind":"Name","value":"key"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"success"}},{"kind":"Field","name":{"kind":"Name","value":"message"}},{"kind":"Field","name":{"kind":"Name","value":"audioUrl"}},{"kind":"Field","name":{"kind":"Name","value":"key"}},{"kind":"Field","name":{"kind":"Name","value":"metadata"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"voice"}},{"kind":"Field","name":{"kind":"Name","value":"model"}},{"kind":"Field","name":{"kind":"Name","value":"textLength"}},{"kind":"Field","name":{"kind":"Name","value":"chunks"}},{"kind":"Field","name":{"kind":"Name","value":"generatedBy"}},{"kind":"Field","name":{"kind":"Name","value":"instructions"}}]}}]}}]}}]} as unknown as DocumentNode<GetAudioFromR2Query, GetAudioFromR2QueryVariables>;
export const GetBehaviorObservationDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"GetBehaviorObservation"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"id"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"Int"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"behaviorObservation"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"id"},"value":{"kind":"Variable","name":{"kind":"Name","value":"id"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"familyMemberId"}},{"kind":"Field","name":{"kind":"Name","value":"goalId"}},{"kind":"Field","name":{"kind":"Name","value":"createdBy"}},{"kind":"Field","name":{"kind":"Name","value":"observedAt"}},{"kind":"Field","name":{"kind":"Name","value":"observationType"}},{"kind":"Field","name":{"kind":"Name","value":"frequency"}},{"kind":"Field","name":{"kind":"Name","value":"intensity"}},{"kind":"Field","name":{"kind":"Name","value":"context"}},{"kind":"Field","name":{"kind":"Name","value":"notes"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}},{"kind":"Field","name":{"kind":"Name","value":"familyMember"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"firstName"}},{"kind":"Field","name":{"kind":"Name","value":"name"}}]}},{"kind":"Field","name":{"kind":"Name","value":"goal"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"title"}},{"kind":"Field","name":{"kind":"Name","value":"description"}}]}}]}}]}}]} as unknown as DocumentNode<GetBehaviorObservationQuery, GetBehaviorObservationQueryVariables>;
export const GetBehaviorObservationsDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"GetBehaviorObservations"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"familyMemberId"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"Int"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"goalId"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"Int"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"behaviorObservations"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"familyMemberId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"familyMemberId"}}},{"kind":"Argument","name":{"kind":"Name","value":"goalId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"goalId"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"familyMemberId"}},{"kind":"Field","name":{"kind":"Name","value":"goalId"}},{"kind":"Field","name":{"kind":"Name","value":"createdBy"}},{"kind":"Field","name":{"kind":"Name","value":"observedAt"}},{"kind":"Field","name":{"kind":"Name","value":"observationType"}},{"kind":"Field","name":{"kind":"Name","value":"frequency"}},{"kind":"Field","name":{"kind":"Name","value":"intensity"}},{"kind":"Field","name":{"kind":"Name","value":"context"}},{"kind":"Field","name":{"kind":"Name","value":"notes"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}},{"kind":"Field","name":{"kind":"Name","value":"familyMember"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"firstName"}},{"kind":"Field","name":{"kind":"Name","value":"name"}}]}},{"kind":"Field","name":{"kind":"Name","value":"goal"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"title"}}]}}]}}]}}]} as unknown as DocumentNode<GetBehaviorObservationsQuery, GetBehaviorObservationsQueryVariables>;
export const GetBogdanDiscussionJobsDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"GetBogdanDiscussionJobs"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"generationJobs"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"type"},"value":{"kind":"StringValue","value":"BOGDAN_DISCUSSION","block":false}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"type"}},{"kind":"Field","name":{"kind":"Name","value":"status"}},{"kind":"Field","name":{"kind":"Name","value":"progress"}},{"kind":"Field","name":{"kind":"Name","value":"error"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"message"}}]}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}}]}}]}}]} as unknown as DocumentNode<GetBogdanDiscussionJobsQuery, GetBogdanDiscussionJobsQueryVariables>;
export const GetContactDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"GetContact"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"id"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"Int"}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"slug"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"contact"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"id"},"value":{"kind":"Variable","name":{"kind":"Name","value":"id"}}},{"kind":"Argument","name":{"kind":"Name","value":"slug"},"value":{"kind":"Variable","name":{"kind":"Name","value":"slug"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"createdBy"}},{"kind":"Field","name":{"kind":"Name","value":"slug"}},{"kind":"Field","name":{"kind":"Name","value":"firstName"}},{"kind":"Field","name":{"kind":"Name","value":"lastName"}},{"kind":"Field","name":{"kind":"Name","value":"description"}},{"kind":"Field","name":{"kind":"Name","value":"role"}},{"kind":"Field","name":{"kind":"Name","value":"ageYears"}},{"kind":"Field","name":{"kind":"Name","value":"notes"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}}]}}]}}]} as unknown as DocumentNode<GetContactQuery, GetContactQueryVariables>;
export const GetContactFeedbackDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"GetContactFeedback"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"id"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"Int"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"contactFeedback"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"id"},"value":{"kind":"Variable","name":{"kind":"Name","value":"id"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"contactId"}},{"kind":"Field","name":{"kind":"Name","value":"familyMemberId"}},{"kind":"Field","name":{"kind":"Name","value":"createdBy"}},{"kind":"Field","name":{"kind":"Name","value":"subject"}},{"kind":"Field","name":{"kind":"Name","value":"feedbackDate"}},{"kind":"Field","name":{"kind":"Name","value":"content"}},{"kind":"Field","name":{"kind":"Name","value":"tags"}},{"kind":"Field","name":{"kind":"Name","value":"source"}},{"kind":"Field","name":{"kind":"Name","value":"extracted"}},{"kind":"Field","name":{"kind":"Name","value":"extractedIssues"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"title"}},{"kind":"Field","name":{"kind":"Name","value":"description"}},{"kind":"Field","name":{"kind":"Name","value":"category"}},{"kind":"Field","name":{"kind":"Name","value":"severity"}},{"kind":"Field","name":{"kind":"Name","value":"recommendations"}}]}},{"kind":"Field","name":{"kind":"Name","value":"stories"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"goalId"}},{"kind":"Field","name":{"kind":"Name","value":"language"}},{"kind":"Field","name":{"kind":"Name","value":"minutes"}},{"kind":"Field","name":{"kind":"Name","value":"content"}},{"kind":"Field","name":{"kind":"Name","value":"audioKey"}},{"kind":"Field","name":{"kind":"Name","value":"audioUrl"}},{"kind":"Field","name":{"kind":"Name","value":"audioGeneratedAt"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}}]}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}},{"kind":"Field","name":{"kind":"Name","value":"contact"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"firstName"}},{"kind":"Field","name":{"kind":"Name","value":"lastName"}},{"kind":"Field","name":{"kind":"Name","value":"slug"}}]}},{"kind":"Field","name":{"kind":"Name","value":"familyMember"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"firstName"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"slug"}}]}}]}}]}}]} as unknown as DocumentNode<GetContactFeedbackQuery, GetContactFeedbackQueryVariables>;
export const GetContactFeedbacksDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"GetContactFeedbacks"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"contactId"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"Int"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"familyMemberId"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"Int"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"contactFeedbacks"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"contactId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"contactId"}}},{"kind":"Argument","name":{"kind":"Name","value":"familyMemberId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"familyMemberId"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"contactId"}},{"kind":"Field","name":{"kind":"Name","value":"familyMemberId"}},{"kind":"Field","name":{"kind":"Name","value":"createdBy"}},{"kind":"Field","name":{"kind":"Name","value":"subject"}},{"kind":"Field","name":{"kind":"Name","value":"feedbackDate"}},{"kind":"Field","name":{"kind":"Name","value":"content"}},{"kind":"Field","name":{"kind":"Name","value":"tags"}},{"kind":"Field","name":{"kind":"Name","value":"source"}},{"kind":"Field","name":{"kind":"Name","value":"extracted"}},{"kind":"Field","name":{"kind":"Name","value":"extractedIssues"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"title"}},{"kind":"Field","name":{"kind":"Name","value":"description"}},{"kind":"Field","name":{"kind":"Name","value":"category"}},{"kind":"Field","name":{"kind":"Name","value":"severity"}},{"kind":"Field","name":{"kind":"Name","value":"recommendations"}}]}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}},{"kind":"Field","name":{"kind":"Name","value":"contact"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"firstName"}},{"kind":"Field","name":{"kind":"Name","value":"lastName"}},{"kind":"Field","name":{"kind":"Name","value":"slug"}}]}},{"kind":"Field","name":{"kind":"Name","value":"familyMember"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"firstName"}},{"kind":"Field","name":{"kind":"Name","value":"name"}}]}}]}}]}}]} as unknown as DocumentNode<GetContactFeedbacksQuery, GetContactFeedbacksQueryVariables>;
export const GetContactsDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"GetContacts"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"contacts"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"createdBy"}},{"kind":"Field","name":{"kind":"Name","value":"slug"}},{"kind":"Field","name":{"kind":"Name","value":"firstName"}},{"kind":"Field","name":{"kind":"Name","value":"lastName"}},{"kind":"Field","name":{"kind":"Name","value":"description"}},{"kind":"Field","name":{"kind":"Name","value":"role"}},{"kind":"Field","name":{"kind":"Name","value":"ageYears"}},{"kind":"Field","name":{"kind":"Name","value":"notes"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}}]}}]}}]} as unknown as DocumentNode<GetContactsQuery, GetContactsQueryVariables>;
export const GetConversationDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"GetConversation"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"id"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"Int"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"conversation"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"id"},"value":{"kind":"Variable","name":{"kind":"Name","value":"id"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"issueId"}},{"kind":"Field","name":{"kind":"Name","value":"userId"}},{"kind":"Field","name":{"kind":"Name","value":"title"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}},{"kind":"Field","name":{"kind":"Name","value":"messages"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"conversationId"}},{"kind":"Field","name":{"kind":"Name","value":"role"}},{"kind":"Field","name":{"kind":"Name","value":"content"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}}]}}]}}]}}]} as unknown as DocumentNode<GetConversationQuery, GetConversationQueryVariables>;
export const GetConversationsForIssueDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"GetConversationsForIssue"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"issueId"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"Int"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"conversationsForIssue"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"issueId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"issueId"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"issueId"}},{"kind":"Field","name":{"kind":"Name","value":"userId"}},{"kind":"Field","name":{"kind":"Name","value":"title"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}},{"kind":"Field","name":{"kind":"Name","value":"messages"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"conversationId"}},{"kind":"Field","name":{"kind":"Name","value":"role"}},{"kind":"Field","name":{"kind":"Name","value":"content"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}}]}}]}}]}}]} as unknown as DocumentNode<GetConversationsForIssueQuery, GetConversationsForIssueQueryVariables>;
export const GetDeepAnalysesDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"GetDeepAnalyses"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"subjectType"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"DeepAnalysisSubjectType"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"subjectId"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"Int"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"deepAnalyses"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"subjectType"},"value":{"kind":"Variable","name":{"kind":"Name","value":"subjectType"}}},{"kind":"Argument","name":{"kind":"Name","value":"subjectId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"subjectId"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"subjectType"}},{"kind":"Field","name":{"kind":"Name","value":"subjectId"}},{"kind":"Field","name":{"kind":"Name","value":"triggerType"}},{"kind":"Field","name":{"kind":"Name","value":"triggerId"}},{"kind":"Field","name":{"kind":"Name","value":"createdBy"}},{"kind":"Field","name":{"kind":"Name","value":"jobId"}},{"kind":"Field","name":{"kind":"Name","value":"summary"}},{"kind":"Field","name":{"kind":"Name","value":"patternClusters"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"description"}},{"kind":"Field","name":{"kind":"Name","value":"issueIds"}},{"kind":"Field","name":{"kind":"Name","value":"issueTitles"}},{"kind":"Field","name":{"kind":"Name","value":"categories"}},{"kind":"Field","name":{"kind":"Name","value":"pattern"}},{"kind":"Field","name":{"kind":"Name","value":"confidence"}},{"kind":"Field","name":{"kind":"Name","value":"suggestedRootCause"}}]}},{"kind":"Field","name":{"kind":"Name","value":"timelineAnalysis"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"phases"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"period"}},{"kind":"Field","name":{"kind":"Name","value":"issueIds"}},{"kind":"Field","name":{"kind":"Name","value":"description"}},{"kind":"Field","name":{"kind":"Name","value":"moodTrend"}},{"kind":"Field","name":{"kind":"Name","value":"keyEvents"}}]}},{"kind":"Field","name":{"kind":"Name","value":"moodCorrelation"}},{"kind":"Field","name":{"kind":"Name","value":"escalationTrend"}},{"kind":"Field","name":{"kind":"Name","value":"criticalPeriods"}}]}},{"kind":"Field","name":{"kind":"Name","value":"familySystemInsights"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"insight"}},{"kind":"Field","name":{"kind":"Name","value":"involvedMemberIds"}},{"kind":"Field","name":{"kind":"Name","value":"involvedMemberNames"}},{"kind":"Field","name":{"kind":"Name","value":"evidenceIssueIds"}},{"kind":"Field","name":{"kind":"Name","value":"systemicPattern"}},{"kind":"Field","name":{"kind":"Name","value":"actionable"}}]}},{"kind":"Field","name":{"kind":"Name","value":"priorityRecommendations"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"rank"}},{"kind":"Field","name":{"kind":"Name","value":"issueId"}},{"kind":"Field","name":{"kind":"Name","value":"issueTitle"}},{"kind":"Field","name":{"kind":"Name","value":"rationale"}},{"kind":"Field","name":{"kind":"Name","value":"urgency"}},{"kind":"Field","name":{"kind":"Name","value":"suggestedApproach"}},{"kind":"Field","name":{"kind":"Name","value":"relatedResearchIds"}}]}},{"kind":"Field","name":{"kind":"Name","value":"researchRelevance"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"patternClusterName"}},{"kind":"Field","name":{"kind":"Name","value":"relevantResearchIds"}},{"kind":"Field","name":{"kind":"Name","value":"relevantResearchTitles"}},{"kind":"Field","name":{"kind":"Name","value":"coverageGaps"}}]}},{"kind":"Field","name":{"kind":"Name","value":"parentAdvice"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"title"}},{"kind":"Field","name":{"kind":"Name","value":"advice"}},{"kind":"Field","name":{"kind":"Name","value":"targetIssueIds"}},{"kind":"Field","name":{"kind":"Name","value":"targetIssueTitles"}},{"kind":"Field","name":{"kind":"Name","value":"relatedPatternCluster"}},{"kind":"Field","name":{"kind":"Name","value":"relatedResearchIds"}},{"kind":"Field","name":{"kind":"Name","value":"relatedResearchTitles"}},{"kind":"Field","name":{"kind":"Name","value":"ageAppropriate"}},{"kind":"Field","name":{"kind":"Name","value":"developmentalContext"}},{"kind":"Field","name":{"kind":"Name","value":"priority"}},{"kind":"Field","name":{"kind":"Name","value":"concreteSteps"}}]}},{"kind":"Field","name":{"kind":"Name","value":"dataSnapshot"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"issueCount"}},{"kind":"Field","name":{"kind":"Name","value":"observationCount"}},{"kind":"Field","name":{"kind":"Name","value":"journalEntryCount"}},{"kind":"Field","name":{"kind":"Name","value":"contactFeedbackCount"}},{"kind":"Field","name":{"kind":"Name","value":"teacherFeedbackCount"}},{"kind":"Field","name":{"kind":"Name","value":"researchPaperCount"}},{"kind":"Field","name":{"kind":"Name","value":"relatedMemberIssueCount"}}]}},{"kind":"Field","name":{"kind":"Name","value":"model"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}}]}}]}}]} as unknown as DocumentNode<GetDeepAnalysesQuery, GetDeepAnalysesQueryVariables>;
export const GetDeepIssueAnalysesDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"GetDeepIssueAnalyses"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"familyMemberId"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"Int"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"deepIssueAnalyses"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"familyMemberId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"familyMemberId"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"familyMemberId"}},{"kind":"Field","name":{"kind":"Name","value":"triggerIssueId"}},{"kind":"Field","name":{"kind":"Name","value":"createdBy"}},{"kind":"Field","name":{"kind":"Name","value":"jobId"}},{"kind":"Field","name":{"kind":"Name","value":"summary"}},{"kind":"Field","name":{"kind":"Name","value":"patternClusters"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"description"}},{"kind":"Field","name":{"kind":"Name","value":"issueIds"}},{"kind":"Field","name":{"kind":"Name","value":"issueTitles"}},{"kind":"Field","name":{"kind":"Name","value":"categories"}},{"kind":"Field","name":{"kind":"Name","value":"pattern"}},{"kind":"Field","name":{"kind":"Name","value":"confidence"}},{"kind":"Field","name":{"kind":"Name","value":"suggestedRootCause"}}]}},{"kind":"Field","name":{"kind":"Name","value":"timelineAnalysis"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"phases"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"period"}},{"kind":"Field","name":{"kind":"Name","value":"issueIds"}},{"kind":"Field","name":{"kind":"Name","value":"description"}},{"kind":"Field","name":{"kind":"Name","value":"moodTrend"}},{"kind":"Field","name":{"kind":"Name","value":"keyEvents"}}]}},{"kind":"Field","name":{"kind":"Name","value":"moodCorrelation"}},{"kind":"Field","name":{"kind":"Name","value":"escalationTrend"}},{"kind":"Field","name":{"kind":"Name","value":"criticalPeriods"}}]}},{"kind":"Field","name":{"kind":"Name","value":"familySystemInsights"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"insight"}},{"kind":"Field","name":{"kind":"Name","value":"involvedMemberIds"}},{"kind":"Field","name":{"kind":"Name","value":"involvedMemberNames"}},{"kind":"Field","name":{"kind":"Name","value":"evidenceIssueIds"}},{"kind":"Field","name":{"kind":"Name","value":"systemicPattern"}},{"kind":"Field","name":{"kind":"Name","value":"actionable"}}]}},{"kind":"Field","name":{"kind":"Name","value":"priorityRecommendations"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"rank"}},{"kind":"Field","name":{"kind":"Name","value":"issueId"}},{"kind":"Field","name":{"kind":"Name","value":"issueTitle"}},{"kind":"Field","name":{"kind":"Name","value":"rationale"}},{"kind":"Field","name":{"kind":"Name","value":"urgency"}},{"kind":"Field","name":{"kind":"Name","value":"suggestedApproach"}},{"kind":"Field","name":{"kind":"Name","value":"relatedResearchIds"}}]}},{"kind":"Field","name":{"kind":"Name","value":"researchRelevance"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"patternClusterName"}},{"kind":"Field","name":{"kind":"Name","value":"relevantResearchIds"}},{"kind":"Field","name":{"kind":"Name","value":"relevantResearchTitles"}},{"kind":"Field","name":{"kind":"Name","value":"coverageGaps"}}]}},{"kind":"Field","name":{"kind":"Name","value":"parentAdvice"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"title"}},{"kind":"Field","name":{"kind":"Name","value":"advice"}},{"kind":"Field","name":{"kind":"Name","value":"targetIssueIds"}},{"kind":"Field","name":{"kind":"Name","value":"targetIssueTitles"}},{"kind":"Field","name":{"kind":"Name","value":"relatedPatternCluster"}},{"kind":"Field","name":{"kind":"Name","value":"relatedResearchIds"}},{"kind":"Field","name":{"kind":"Name","value":"relatedResearchTitles"}},{"kind":"Field","name":{"kind":"Name","value":"ageAppropriate"}},{"kind":"Field","name":{"kind":"Name","value":"developmentalContext"}},{"kind":"Field","name":{"kind":"Name","value":"priority"}},{"kind":"Field","name":{"kind":"Name","value":"concreteSteps"}}]}},{"kind":"Field","name":{"kind":"Name","value":"dataSnapshot"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"issueCount"}},{"kind":"Field","name":{"kind":"Name","value":"observationCount"}},{"kind":"Field","name":{"kind":"Name","value":"journalEntryCount"}},{"kind":"Field","name":{"kind":"Name","value":"contactFeedbackCount"}},{"kind":"Field","name":{"kind":"Name","value":"teacherFeedbackCount"}},{"kind":"Field","name":{"kind":"Name","value":"researchPaperCount"}},{"kind":"Field","name":{"kind":"Name","value":"relatedMemberIssueCount"}}]}},{"kind":"Field","name":{"kind":"Name","value":"model"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}}]}}]}}]} as unknown as DocumentNode<GetDeepIssueAnalysesQuery, GetDeepIssueAnalysesQueryVariables>;
export const GetFamilyMemberDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"GetFamilyMember"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"id"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"Int"}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"slug"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"familyMember"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"id"},"value":{"kind":"Variable","name":{"kind":"Name","value":"id"}}},{"kind":"Argument","name":{"kind":"Name","value":"slug"},"value":{"kind":"Variable","name":{"kind":"Name","value":"slug"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"userId"}},{"kind":"Field","name":{"kind":"Name","value":"slug"}},{"kind":"Field","name":{"kind":"Name","value":"firstName"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"ageYears"}},{"kind":"Field","name":{"kind":"Name","value":"relationship"}},{"kind":"Field","name":{"kind":"Name","value":"email"}},{"kind":"Field","name":{"kind":"Name","value":"phone"}},{"kind":"Field","name":{"kind":"Name","value":"location"}},{"kind":"Field","name":{"kind":"Name","value":"occupation"}},{"kind":"Field","name":{"kind":"Name","value":"dateOfBirth"}},{"kind":"Field","name":{"kind":"Name","value":"bio"}},{"kind":"Field","name":{"kind":"Name","value":"allergies"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}},{"kind":"Field","name":{"kind":"Name","value":"shares"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"familyMemberId"}},{"kind":"Field","name":{"kind":"Name","value":"email"}},{"kind":"Field","name":{"kind":"Name","value":"role"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"createdBy"}}]}},{"kind":"Field","name":{"kind":"Name","value":"goals"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"title"}},{"kind":"Field","name":{"kind":"Name","value":"status"}},{"kind":"Field","name":{"kind":"Name","value":"description"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}}]}},{"kind":"Field","name":{"kind":"Name","value":"behaviorObservations"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"familyMemberId"}},{"kind":"Field","name":{"kind":"Name","value":"goalId"}},{"kind":"Field","name":{"kind":"Name","value":"createdBy"}},{"kind":"Field","name":{"kind":"Name","value":"observedAt"}},{"kind":"Field","name":{"kind":"Name","value":"observationType"}},{"kind":"Field","name":{"kind":"Name","value":"frequency"}},{"kind":"Field","name":{"kind":"Name","value":"intensity"}},{"kind":"Field","name":{"kind":"Name","value":"context"}},{"kind":"Field","name":{"kind":"Name","value":"notes"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}}]}},{"kind":"Field","name":{"kind":"Name","value":"teacherFeedbacks"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"familyMemberId"}},{"kind":"Field","name":{"kind":"Name","value":"createdBy"}},{"kind":"Field","name":{"kind":"Name","value":"teacherName"}},{"kind":"Field","name":{"kind":"Name","value":"subject"}},{"kind":"Field","name":{"kind":"Name","value":"feedbackDate"}},{"kind":"Field","name":{"kind":"Name","value":"content"}},{"kind":"Field","name":{"kind":"Name","value":"tags"}},{"kind":"Field","name":{"kind":"Name","value":"source"}},{"kind":"Field","name":{"kind":"Name","value":"extracted"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}}]}},{"kind":"Field","name":{"kind":"Name","value":"issues"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"feedbackId"}},{"kind":"Field","name":{"kind":"Name","value":"familyMemberId"}},{"kind":"Field","name":{"kind":"Name","value":"createdBy"}},{"kind":"Field","name":{"kind":"Name","value":"title"}},{"kind":"Field","name":{"kind":"Name","value":"description"}},{"kind":"Field","name":{"kind":"Name","value":"category"}},{"kind":"Field","name":{"kind":"Name","value":"severity"}},{"kind":"Field","name":{"kind":"Name","value":"recommendations"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}}]}},{"kind":"Field","name":{"kind":"Name","value":"relationships"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"createdBy"}},{"kind":"Field","name":{"kind":"Name","value":"subjectType"}},{"kind":"Field","name":{"kind":"Name","value":"subjectId"}},{"kind":"Field","name":{"kind":"Name","value":"relatedType"}},{"kind":"Field","name":{"kind":"Name","value":"relatedId"}},{"kind":"Field","name":{"kind":"Name","value":"relationshipType"}},{"kind":"Field","name":{"kind":"Name","value":"context"}},{"kind":"Field","name":{"kind":"Name","value":"startDate"}},{"kind":"Field","name":{"kind":"Name","value":"status"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}},{"kind":"Field","name":{"kind":"Name","value":"related"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"type"}},{"kind":"Field","name":{"kind":"Name","value":"slug"}},{"kind":"Field","name":{"kind":"Name","value":"firstName"}},{"kind":"Field","name":{"kind":"Name","value":"lastName"}}]}}]}}]}}]}}]} as unknown as DocumentNode<GetFamilyMemberQuery, GetFamilyMemberQueryVariables>;
export const GetFamilyMembersDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"GetFamilyMembers"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"familyMembers"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"userId"}},{"kind":"Field","name":{"kind":"Name","value":"slug"}},{"kind":"Field","name":{"kind":"Name","value":"firstName"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"ageYears"}},{"kind":"Field","name":{"kind":"Name","value":"relationship"}},{"kind":"Field","name":{"kind":"Name","value":"email"}},{"kind":"Field","name":{"kind":"Name","value":"phone"}},{"kind":"Field","name":{"kind":"Name","value":"location"}},{"kind":"Field","name":{"kind":"Name","value":"occupation"}},{"kind":"Field","name":{"kind":"Name","value":"dateOfBirth"}},{"kind":"Field","name":{"kind":"Name","value":"bio"}},{"kind":"Field","name":{"kind":"Name","value":"allergies"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}},{"kind":"Field","name":{"kind":"Name","value":"shares"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"familyMemberId"}},{"kind":"Field","name":{"kind":"Name","value":"email"}},{"kind":"Field","name":{"kind":"Name","value":"role"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"createdBy"}}]}},{"kind":"Field","name":{"kind":"Name","value":"relationships"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"subjectType"}},{"kind":"Field","name":{"kind":"Name","value":"subjectId"}},{"kind":"Field","name":{"kind":"Name","value":"relatedType"}},{"kind":"Field","name":{"kind":"Name","value":"relatedId"}},{"kind":"Field","name":{"kind":"Name","value":"relationshipType"}},{"kind":"Field","name":{"kind":"Name","value":"status"}},{"kind":"Field","name":{"kind":"Name","value":"related"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"type"}},{"kind":"Field","name":{"kind":"Name","value":"slug"}},{"kind":"Field","name":{"kind":"Name","value":"firstName"}},{"kind":"Field","name":{"kind":"Name","value":"lastName"}}]}}]}}]}}]}}]} as unknown as DocumentNode<GetFamilyMembersQuery, GetFamilyMembersQueryVariables>;
export const GetGameDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"GetGame"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"id"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"Int"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"game"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"id"},"value":{"kind":"Variable","name":{"kind":"Name","value":"id"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"userId"}},{"kind":"Field","name":{"kind":"Name","value":"goalId"}},{"kind":"Field","name":{"kind":"Name","value":"issueId"}},{"kind":"Field","name":{"kind":"Name","value":"familyMemberId"}},{"kind":"Field","name":{"kind":"Name","value":"type"}},{"kind":"Field","name":{"kind":"Name","value":"title"}},{"kind":"Field","name":{"kind":"Name","value":"description"}},{"kind":"Field","name":{"kind":"Name","value":"content"}},{"kind":"Field","name":{"kind":"Name","value":"language"}},{"kind":"Field","name":{"kind":"Name","value":"estimatedMinutes"}},{"kind":"Field","name":{"kind":"Name","value":"source"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}},{"kind":"Field","name":{"kind":"Name","value":"goal"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"title"}}]}},{"kind":"Field","name":{"kind":"Name","value":"issue"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"title"}}]}},{"kind":"Field","name":{"kind":"Name","value":"completions"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"gameId"}},{"kind":"Field","name":{"kind":"Name","value":"durationSeconds"}},{"kind":"Field","name":{"kind":"Name","value":"responses"}},{"kind":"Field","name":{"kind":"Name","value":"linkedNoteId"}},{"kind":"Field","name":{"kind":"Name","value":"completedAt"}}]}}]}}]}}]} as unknown as DocumentNode<GetGameQuery, GetGameQueryVariables>;
export const GetGamesDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"GetGames"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"type"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"GameType"}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"goalId"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"Int"}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"issueId"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"Int"}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"familyMemberId"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"Int"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"games"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"type"},"value":{"kind":"Variable","name":{"kind":"Name","value":"type"}}},{"kind":"Argument","name":{"kind":"Name","value":"goalId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"goalId"}}},{"kind":"Argument","name":{"kind":"Name","value":"issueId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"issueId"}}},{"kind":"Argument","name":{"kind":"Name","value":"familyMemberId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"familyMemberId"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"userId"}},{"kind":"Field","name":{"kind":"Name","value":"goalId"}},{"kind":"Field","name":{"kind":"Name","value":"issueId"}},{"kind":"Field","name":{"kind":"Name","value":"familyMemberId"}},{"kind":"Field","name":{"kind":"Name","value":"type"}},{"kind":"Field","name":{"kind":"Name","value":"title"}},{"kind":"Field","name":{"kind":"Name","value":"description"}},{"kind":"Field","name":{"kind":"Name","value":"language"}},{"kind":"Field","name":{"kind":"Name","value":"estimatedMinutes"}},{"kind":"Field","name":{"kind":"Name","value":"source"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}}]}}]}}]} as unknown as DocumentNode<GetGamesQuery, GetGamesQueryVariables>;
export const GetGenerationJobDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"GetGenerationJob"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"id"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"generationJob"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"id"},"value":{"kind":"Variable","name":{"kind":"Name","value":"id"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"type"}},{"kind":"Field","name":{"kind":"Name","value":"goalId"}},{"kind":"Field","name":{"kind":"Name","value":"storyId"}},{"kind":"Field","name":{"kind":"Name","value":"status"}},{"kind":"Field","name":{"kind":"Name","value":"progress"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"result"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"audioUrl"}},{"kind":"Field","name":{"kind":"Name","value":"progress"}},{"kind":"Field","name":{"kind":"Name","value":"stage"}},{"kind":"Field","name":{"kind":"Name","value":"count"}},{"kind":"Field","name":{"kind":"Name","value":"message"}},{"kind":"Field","name":{"kind":"Name","value":"diagnostics"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"searchCount"}},{"kind":"Field","name":{"kind":"Name","value":"enrichedCount"}},{"kind":"Field","name":{"kind":"Name","value":"extractedCount"}},{"kind":"Field","name":{"kind":"Name","value":"qualifiedCount"}},{"kind":"Field","name":{"kind":"Name","value":"persistedCount"}},{"kind":"Field","name":{"kind":"Name","value":"searchUsedFallback"}},{"kind":"Field","name":{"kind":"Name","value":"enrichedDropped"}}]}}]}},{"kind":"Field","name":{"kind":"Name","value":"error"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"message"}}]}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}}]}}]}}]} as unknown as DocumentNode<GetGenerationJobQuery, GetGenerationJobQueryVariables>;
export const GetGenerationJobsDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"GetGenerationJobs"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"goalId"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"Int"}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"status"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"generationJobs"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"goalId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"goalId"}}},{"kind":"Argument","name":{"kind":"Name","value":"status"},"value":{"kind":"Variable","name":{"kind":"Name","value":"status"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"type"}},{"kind":"Field","name":{"kind":"Name","value":"storyId"}},{"kind":"Field","name":{"kind":"Name","value":"status"}},{"kind":"Field","name":{"kind":"Name","value":"progress"}},{"kind":"Field","name":{"kind":"Name","value":"result"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"audioUrl"}}]}},{"kind":"Field","name":{"kind":"Name","value":"error"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"message"}}]}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}}]}}]}}]} as unknown as DocumentNode<GetGenerationJobsQuery, GetGenerationJobsQueryVariables>;
export const GetGoalDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"GetGoal"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"id"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"Int"}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"slug"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"goal"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"id"},"value":{"kind":"Variable","name":{"kind":"Name","value":"id"}}},{"kind":"Argument","name":{"kind":"Name","value":"slug"},"value":{"kind":"Variable","name":{"kind":"Name","value":"slug"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"slug"}},{"kind":"Field","name":{"kind":"Name","value":"title"}},{"kind":"Field","name":{"kind":"Name","value":"description"}},{"kind":"Field","name":{"kind":"Name","value":"status"}},{"kind":"Field","name":{"kind":"Name","value":"priority"}},{"kind":"Field","name":{"kind":"Name","value":"targetDate"}},{"kind":"Field","name":{"kind":"Name","value":"tags"}},{"kind":"Field","name":{"kind":"Name","value":"familyMemberId"}},{"kind":"Field","name":{"kind":"Name","value":"familyMember"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"slug"}},{"kind":"Field","name":{"kind":"Name","value":"firstName"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"ageYears"}},{"kind":"Field","name":{"kind":"Name","value":"relationship"}}]}},{"kind":"Field","name":{"kind":"Name","value":"createdBy"}},{"kind":"Field","name":{"kind":"Name","value":"parentGoalId"}},{"kind":"Field","name":{"kind":"Name","value":"parentGoal"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"slug"}},{"kind":"Field","name":{"kind":"Name","value":"title"}},{"kind":"Field","name":{"kind":"Name","value":"status"}}]}},{"kind":"Field","name":{"kind":"Name","value":"therapeuticText"}},{"kind":"Field","name":{"kind":"Name","value":"therapeuticTextLanguage"}},{"kind":"Field","name":{"kind":"Name","value":"therapeuticTextGeneratedAt"}},{"kind":"Field","name":{"kind":"Name","value":"parentAdvice"}},{"kind":"Field","name":{"kind":"Name","value":"parentAdviceLanguage"}},{"kind":"Field","name":{"kind":"Name","value":"parentAdviceGeneratedAt"}},{"kind":"Field","name":{"kind":"Name","value":"storyLanguage"}},{"kind":"Field","name":{"kind":"Name","value":"subGoals"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"slug"}},{"kind":"Field","name":{"kind":"Name","value":"title"}},{"kind":"Field","name":{"kind":"Name","value":"description"}},{"kind":"Field","name":{"kind":"Name","value":"status"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}}]}},{"kind":"Field","name":{"kind":"Name","value":"notes"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"slug"}},{"kind":"Field","name":{"kind":"Name","value":"content"}},{"kind":"Field","name":{"kind":"Name","value":"noteType"}},{"kind":"Field","name":{"kind":"Name","value":"tags"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}}]}},{"kind":"Field","name":{"kind":"Name","value":"questions"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"question"}},{"kind":"Field","name":{"kind":"Name","value":"researchId"}},{"kind":"Field","name":{"kind":"Name","value":"researchTitle"}},{"kind":"Field","name":{"kind":"Name","value":"rationale"}},{"kind":"Field","name":{"kind":"Name","value":"generatedAt"}}]}},{"kind":"Field","name":{"kind":"Name","value":"research"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"title"}},{"kind":"Field","name":{"kind":"Name","value":"authors"}},{"kind":"Field","name":{"kind":"Name","value":"year"}},{"kind":"Field","name":{"kind":"Name","value":"journal"}},{"kind":"Field","name":{"kind":"Name","value":"doi"}},{"kind":"Field","name":{"kind":"Name","value":"url"}},{"kind":"Field","name":{"kind":"Name","value":"abstract"}},{"kind":"Field","name":{"kind":"Name","value":"keyFindings"}},{"kind":"Field","name":{"kind":"Name","value":"therapeuticTechniques"}},{"kind":"Field","name":{"kind":"Name","value":"evidenceLevel"}},{"kind":"Field","name":{"kind":"Name","value":"relevanceScore"}},{"kind":"Field","name":{"kind":"Name","value":"extractionConfidence"}}]}},{"kind":"Field","name":{"kind":"Name","value":"recommendedBooks"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"title"}},{"kind":"Field","name":{"kind":"Name","value":"authors"}},{"kind":"Field","name":{"kind":"Name","value":"year"}},{"kind":"Field","name":{"kind":"Name","value":"isbn"}},{"kind":"Field","name":{"kind":"Name","value":"description"}},{"kind":"Field","name":{"kind":"Name","value":"whyRecommended"}},{"kind":"Field","name":{"kind":"Name","value":"category"}},{"kind":"Field","name":{"kind":"Name","value":"amazonUrl"}},{"kind":"Field","name":{"kind":"Name","value":"generatedAt"}}]}},{"kind":"Field","name":{"kind":"Name","value":"stories"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"goalId"}},{"kind":"Field","name":{"kind":"Name","value":"issueId"}},{"kind":"Field","name":{"kind":"Name","value":"feedbackId"}},{"kind":"Field","name":{"kind":"Name","value":"createdBy"}},{"kind":"Field","name":{"kind":"Name","value":"content"}},{"kind":"Field","name":{"kind":"Name","value":"language"}},{"kind":"Field","name":{"kind":"Name","value":"minutes"}},{"kind":"Field","name":{"kind":"Name","value":"audioKey"}},{"kind":"Field","name":{"kind":"Name","value":"audioUrl"}},{"kind":"Field","name":{"kind":"Name","value":"audioGeneratedAt"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}}]}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}}]}}]}}]} as unknown as DocumentNode<GetGoalQuery, GetGoalQueryVariables>;
export const GetGoalsDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"GetGoals"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"familyMemberId"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"Int"}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"status"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"tag"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"goals"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"familyMemberId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"familyMemberId"}}},{"kind":"Argument","name":{"kind":"Name","value":"status"},"value":{"kind":"Variable","name":{"kind":"Name","value":"status"}}},{"kind":"Argument","name":{"kind":"Name","value":"tag"},"value":{"kind":"Variable","name":{"kind":"Name","value":"tag"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"title"}},{"kind":"Field","name":{"kind":"Name","value":"description"}},{"kind":"Field","name":{"kind":"Name","value":"status"}},{"kind":"Field","name":{"kind":"Name","value":"tags"}},{"kind":"Field","name":{"kind":"Name","value":"familyMemberId"}},{"kind":"Field","name":{"kind":"Name","value":"familyMember"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"firstName"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"relationship"}}]}},{"kind":"Field","name":{"kind":"Name","value":"createdBy"}},{"kind":"Field","name":{"kind":"Name","value":"parentGoalId"}},{"kind":"Field","name":{"kind":"Name","value":"notes"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"slug"}},{"kind":"Field","name":{"kind":"Name","value":"noteType"}},{"kind":"Field","name":{"kind":"Name","value":"tags"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}}]}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}}]}}]}}]} as unknown as DocumentNode<GetGoalsQuery, GetGoalsQueryVariables>;
export const GetHabitDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"GetHabit"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"id"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"Int"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"habit"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"id"},"value":{"kind":"Variable","name":{"kind":"Name","value":"id"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"title"}},{"kind":"Field","name":{"kind":"Name","value":"description"}},{"kind":"Field","name":{"kind":"Name","value":"frequency"}},{"kind":"Field","name":{"kind":"Name","value":"targetCount"}},{"kind":"Field","name":{"kind":"Name","value":"status"}},{"kind":"Field","name":{"kind":"Name","value":"goalId"}},{"kind":"Field","name":{"kind":"Name","value":"familyMemberId"}},{"kind":"Field","name":{"kind":"Name","value":"issueId"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}},{"kind":"Field","name":{"kind":"Name","value":"logs"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"habitId"}},{"kind":"Field","name":{"kind":"Name","value":"loggedDate"}},{"kind":"Field","name":{"kind":"Name","value":"count"}},{"kind":"Field","name":{"kind":"Name","value":"notes"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}}]}},{"kind":"Field","name":{"kind":"Name","value":"todayLog"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"loggedDate"}},{"kind":"Field","name":{"kind":"Name","value":"count"}}]}}]}}]}}]} as unknown as DocumentNode<GetHabitQuery, GetHabitQueryVariables>;
export const GetHabitsDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"GetHabits"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"status"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"familyMemberId"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"Int"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"habits"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"status"},"value":{"kind":"Variable","name":{"kind":"Name","value":"status"}}},{"kind":"Argument","name":{"kind":"Name","value":"familyMemberId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"familyMemberId"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"title"}},{"kind":"Field","name":{"kind":"Name","value":"description"}},{"kind":"Field","name":{"kind":"Name","value":"frequency"}},{"kind":"Field","name":{"kind":"Name","value":"targetCount"}},{"kind":"Field","name":{"kind":"Name","value":"status"}},{"kind":"Field","name":{"kind":"Name","value":"goalId"}},{"kind":"Field","name":{"kind":"Name","value":"familyMemberId"}},{"kind":"Field","name":{"kind":"Name","value":"issueId"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}},{"kind":"Field","name":{"kind":"Name","value":"todayLog"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"loggedDate"}},{"kind":"Field","name":{"kind":"Name","value":"count"}}]}}]}}]}}]} as unknown as DocumentNode<GetHabitsQuery, GetHabitsQueryVariables>;
export const GetIssueDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"GetIssue"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"id"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"Int"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"issue"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"id"},"value":{"kind":"Variable","name":{"kind":"Name","value":"id"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"feedbackId"}},{"kind":"Field","name":{"kind":"Name","value":"journalEntryId"}},{"kind":"Field","name":{"kind":"Name","value":"journalEntry"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"title"}},{"kind":"Field","name":{"kind":"Name","value":"entryDate"}}]}},{"kind":"Field","name":{"kind":"Name","value":"familyMemberId"}},{"kind":"Field","name":{"kind":"Name","value":"createdBy"}},{"kind":"Field","name":{"kind":"Name","value":"title"}},{"kind":"Field","name":{"kind":"Name","value":"description"}},{"kind":"Field","name":{"kind":"Name","value":"category"}},{"kind":"Field","name":{"kind":"Name","value":"severity"}},{"kind":"Field","name":{"kind":"Name","value":"recommendations"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}},{"kind":"Field","name":{"kind":"Name","value":"feedback"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"contactId"}},{"kind":"Field","name":{"kind":"Name","value":"familyMemberId"}},{"kind":"Field","name":{"kind":"Name","value":"subject"}},{"kind":"Field","name":{"kind":"Name","value":"feedbackDate"}},{"kind":"Field","name":{"kind":"Name","value":"content"}},{"kind":"Field","name":{"kind":"Name","value":"tags"}},{"kind":"Field","name":{"kind":"Name","value":"source"}},{"kind":"Field","name":{"kind":"Name","value":"extracted"}},{"kind":"Field","name":{"kind":"Name","value":"contact"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"firstName"}},{"kind":"Field","name":{"kind":"Name","value":"lastName"}},{"kind":"Field","name":{"kind":"Name","value":"slug"}}]}},{"kind":"Field","name":{"kind":"Name","value":"familyMember"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"firstName"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"slug"}}]}}]}},{"kind":"Field","name":{"kind":"Name","value":"familyMember"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"firstName"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"slug"}}]}},{"kind":"Field","name":{"kind":"Name","value":"relatedFamilyMemberId"}},{"kind":"Field","name":{"kind":"Name","value":"relatedFamilyMember"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"firstName"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"slug"}}]}},{"kind":"Field","name":{"kind":"Name","value":"stories"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"language"}},{"kind":"Field","name":{"kind":"Name","value":"minutes"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}}]}},{"kind":"Field","name":{"kind":"Name","value":"contacts"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"firstName"}},{"kind":"Field","name":{"kind":"Name","value":"lastName"}},{"kind":"Field","name":{"kind":"Name","value":"role"}},{"kind":"Field","name":{"kind":"Name","value":"slug"}}]}},{"kind":"Field","name":{"kind":"Name","value":"relatedIssues"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"linkType"}},{"kind":"Field","name":{"kind":"Name","value":"issue"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"title"}},{"kind":"Field","name":{"kind":"Name","value":"category"}},{"kind":"Field","name":{"kind":"Name","value":"severity"}},{"kind":"Field","name":{"kind":"Name","value":"familyMemberId"}},{"kind":"Field","name":{"kind":"Name","value":"familyMember"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"firstName"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"slug"}}]}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}}]}}]}},{"kind":"Field","name":{"kind":"Name","value":"screenshots"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"issueId"}},{"kind":"Field","name":{"kind":"Name","value":"url"}},{"kind":"Field","name":{"kind":"Name","value":"filename"}},{"kind":"Field","name":{"kind":"Name","value":"contentType"}},{"kind":"Field","name":{"kind":"Name","value":"sizeBytes"}},{"kind":"Field","name":{"kind":"Name","value":"caption"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}}]}}]}}]}}]} as unknown as DocumentNode<GetIssueQuery, GetIssueQueryVariables>;
export const GetIssuesDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"GetIssues"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"familyMemberId"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"Int"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"feedbackId"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"Int"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"issues"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"familyMemberId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"familyMemberId"}}},{"kind":"Argument","name":{"kind":"Name","value":"feedbackId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"feedbackId"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"feedbackId"}},{"kind":"Field","name":{"kind":"Name","value":"familyMemberId"}},{"kind":"Field","name":{"kind":"Name","value":"createdBy"}},{"kind":"Field","name":{"kind":"Name","value":"title"}},{"kind":"Field","name":{"kind":"Name","value":"description"}},{"kind":"Field","name":{"kind":"Name","value":"category"}},{"kind":"Field","name":{"kind":"Name","value":"severity"}},{"kind":"Field","name":{"kind":"Name","value":"recommendations"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}}]}}]}}]} as unknown as DocumentNode<GetIssuesQuery, GetIssuesQueryVariables>;
export const GetJournalEntriesDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"GetJournalEntries"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"familyMemberId"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"Int"}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"goalId"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"Int"}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"mood"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"tag"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"fromDate"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"toDate"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"journalEntries"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"familyMemberId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"familyMemberId"}}},{"kind":"Argument","name":{"kind":"Name","value":"goalId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"goalId"}}},{"kind":"Argument","name":{"kind":"Name","value":"mood"},"value":{"kind":"Variable","name":{"kind":"Name","value":"mood"}}},{"kind":"Argument","name":{"kind":"Name","value":"tag"},"value":{"kind":"Variable","name":{"kind":"Name","value":"tag"}}},{"kind":"Argument","name":{"kind":"Name","value":"fromDate"},"value":{"kind":"Variable","name":{"kind":"Name","value":"fromDate"}}},{"kind":"Argument","name":{"kind":"Name","value":"toDate"},"value":{"kind":"Variable","name":{"kind":"Name","value":"toDate"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"createdBy"}},{"kind":"Field","name":{"kind":"Name","value":"familyMemberId"}},{"kind":"Field","name":{"kind":"Name","value":"familyMember"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"firstName"}},{"kind":"Field","name":{"kind":"Name","value":"name"}}]}},{"kind":"Field","name":{"kind":"Name","value":"title"}},{"kind":"Field","name":{"kind":"Name","value":"content"}},{"kind":"Field","name":{"kind":"Name","value":"mood"}},{"kind":"Field","name":{"kind":"Name","value":"moodScore"}},{"kind":"Field","name":{"kind":"Name","value":"tags"}},{"kind":"Field","name":{"kind":"Name","value":"goalId"}},{"kind":"Field","name":{"kind":"Name","value":"goal"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"title"}}]}},{"kind":"Field","name":{"kind":"Name","value":"isPrivate"}},{"kind":"Field","name":{"kind":"Name","value":"isVault"}},{"kind":"Field","name":{"kind":"Name","value":"entryDate"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}}]}}]}}]} as unknown as DocumentNode<GetJournalEntriesQuery, GetJournalEntriesQueryVariables>;
export const GetJournalEntryDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"GetJournalEntry"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"id"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"Int"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"journalEntry"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"id"},"value":{"kind":"Variable","name":{"kind":"Name","value":"id"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"createdBy"}},{"kind":"Field","name":{"kind":"Name","value":"familyMemberId"}},{"kind":"Field","name":{"kind":"Name","value":"familyMember"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"firstName"}},{"kind":"Field","name":{"kind":"Name","value":"name"}}]}},{"kind":"Field","name":{"kind":"Name","value":"title"}},{"kind":"Field","name":{"kind":"Name","value":"content"}},{"kind":"Field","name":{"kind":"Name","value":"mood"}},{"kind":"Field","name":{"kind":"Name","value":"moodScore"}},{"kind":"Field","name":{"kind":"Name","value":"tags"}},{"kind":"Field","name":{"kind":"Name","value":"goalId"}},{"kind":"Field","name":{"kind":"Name","value":"goal"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"title"}},{"kind":"Field","name":{"kind":"Name","value":"description"}}]}},{"kind":"Field","name":{"kind":"Name","value":"issue"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"title"}},{"kind":"Field","name":{"kind":"Name","value":"category"}},{"kind":"Field","name":{"kind":"Name","value":"severity"}},{"kind":"Field","name":{"kind":"Name","value":"familyMember"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"firstName"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"slug"}}]}}]}},{"kind":"Field","name":{"kind":"Name","value":"isPrivate"}},{"kind":"Field","name":{"kind":"Name","value":"isVault"}},{"kind":"Field","name":{"kind":"Name","value":"entryDate"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}},{"kind":"Field","name":{"kind":"Name","value":"analysis"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"journalEntryId"}},{"kind":"Field","name":{"kind":"Name","value":"summary"}},{"kind":"Field","name":{"kind":"Name","value":"emotionalLandscape"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"primaryEmotions"}},{"kind":"Field","name":{"kind":"Name","value":"underlyingEmotions"}},{"kind":"Field","name":{"kind":"Name","value":"emotionalRegulation"}},{"kind":"Field","name":{"kind":"Name","value":"attachmentPatterns"}}]}},{"kind":"Field","name":{"kind":"Name","value":"therapeuticInsights"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"title"}},{"kind":"Field","name":{"kind":"Name","value":"observation"}},{"kind":"Field","name":{"kind":"Name","value":"clinicalRelevance"}},{"kind":"Field","name":{"kind":"Name","value":"relatedResearchIds"}}]}},{"kind":"Field","name":{"kind":"Name","value":"actionableRecommendations"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"title"}},{"kind":"Field","name":{"kind":"Name","value":"description"}},{"kind":"Field","name":{"kind":"Name","value":"priority"}},{"kind":"Field","name":{"kind":"Name","value":"concreteSteps"}},{"kind":"Field","name":{"kind":"Name","value":"relatedResearchIds"}}]}},{"kind":"Field","name":{"kind":"Name","value":"reflectionPrompts"}},{"kind":"Field","name":{"kind":"Name","value":"model"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}}]}},{"kind":"Field","name":{"kind":"Name","value":"discussionGuide"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"journalEntryId"}},{"kind":"Field","name":{"kind":"Name","value":"childAge"}},{"kind":"Field","name":{"kind":"Name","value":"behaviorSummary"}},{"kind":"Field","name":{"kind":"Name","value":"developmentalContext"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"stage"}},{"kind":"Field","name":{"kind":"Name","value":"explanation"}},{"kind":"Field","name":{"kind":"Name","value":"normalizedBehavior"}},{"kind":"Field","name":{"kind":"Name","value":"researchBasis"}}]}},{"kind":"Field","name":{"kind":"Name","value":"conversationStarters"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"opener"}},{"kind":"Field","name":{"kind":"Name","value":"context"}},{"kind":"Field","name":{"kind":"Name","value":"ageAppropriateNote"}}]}},{"kind":"Field","name":{"kind":"Name","value":"talkingPoints"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"point"}},{"kind":"Field","name":{"kind":"Name","value":"explanation"}},{"kind":"Field","name":{"kind":"Name","value":"researchBacking"}},{"kind":"Field","name":{"kind":"Name","value":"relatedResearchIds"}}]}},{"kind":"Field","name":{"kind":"Name","value":"languageGuide"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"whatToSay"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"phrase"}},{"kind":"Field","name":{"kind":"Name","value":"reason"}},{"kind":"Field","name":{"kind":"Name","value":"alternative"}}]}},{"kind":"Field","name":{"kind":"Name","value":"whatNotToSay"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"phrase"}},{"kind":"Field","name":{"kind":"Name","value":"reason"}},{"kind":"Field","name":{"kind":"Name","value":"alternative"}}]}}]}},{"kind":"Field","name":{"kind":"Name","value":"anticipatedReactions"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"reaction"}},{"kind":"Field","name":{"kind":"Name","value":"likelihood"}},{"kind":"Field","name":{"kind":"Name","value":"howToRespond"}}]}},{"kind":"Field","name":{"kind":"Name","value":"followUpPlan"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"action"}},{"kind":"Field","name":{"kind":"Name","value":"timing"}},{"kind":"Field","name":{"kind":"Name","value":"description"}}]}},{"kind":"Field","name":{"kind":"Name","value":"model"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}}]}}]}}]}}]} as unknown as DocumentNode<GetJournalEntryQuery, GetJournalEntryQueryVariables>;
export const GetJournalRecommendedBooksDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"GetJournalRecommendedBooks"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"journalEntryId"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"Int"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"recommendedBooks"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"journalEntryId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"journalEntryId"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"goalId"}},{"kind":"Field","name":{"kind":"Name","value":"journalEntryId"}},{"kind":"Field","name":{"kind":"Name","value":"title"}},{"kind":"Field","name":{"kind":"Name","value":"authors"}},{"kind":"Field","name":{"kind":"Name","value":"year"}},{"kind":"Field","name":{"kind":"Name","value":"isbn"}},{"kind":"Field","name":{"kind":"Name","value":"description"}},{"kind":"Field","name":{"kind":"Name","value":"whyRecommended"}},{"kind":"Field","name":{"kind":"Name","value":"category"}},{"kind":"Field","name":{"kind":"Name","value":"amazonUrl"}},{"kind":"Field","name":{"kind":"Name","value":"generatedAt"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}}]}}]}}]} as unknown as DocumentNode<GetJournalRecommendedBooksQuery, GetJournalRecommendedBooksQueryVariables>;
export const GetMySharedFamilyMembersDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"GetMySharedFamilyMembers"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"mySharedFamilyMembers"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"userId"}},{"kind":"Field","name":{"kind":"Name","value":"slug"}},{"kind":"Field","name":{"kind":"Name","value":"firstName"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"relationship"}},{"kind":"Field","name":{"kind":"Name","value":"email"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}}]}}]}}]} as unknown as DocumentNode<GetMySharedFamilyMembersQuery, GetMySharedFamilyMembersQueryVariables>;
export const GetNoteDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"GetNote"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"id"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"Int"}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"slug"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"note"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"id"},"value":{"kind":"Variable","name":{"kind":"Name","value":"id"}}},{"kind":"Argument","name":{"kind":"Name","value":"slug"},"value":{"kind":"Variable","name":{"kind":"Name","value":"slug"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"entityId"}},{"kind":"Field","name":{"kind":"Name","value":"entityType"}},{"kind":"Field","name":{"kind":"Name","value":"createdBy"}},{"kind":"Field","name":{"kind":"Name","value":"noteType"}},{"kind":"Field","name":{"kind":"Name","value":"slug"}},{"kind":"Field","name":{"kind":"Name","value":"title"}},{"kind":"Field","name":{"kind":"Name","value":"content"}},{"kind":"Field","name":{"kind":"Name","value":"createdBy"}},{"kind":"Field","name":{"kind":"Name","value":"tags"}},{"kind":"Field","name":{"kind":"Name","value":"goal"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"title"}},{"kind":"Field","name":{"kind":"Name","value":"description"}},{"kind":"Field","name":{"kind":"Name","value":"status"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}}]}},{"kind":"Field","name":{"kind":"Name","value":"linkedResearch"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"title"}},{"kind":"Field","name":{"kind":"Name","value":"authors"}},{"kind":"Field","name":{"kind":"Name","value":"year"}},{"kind":"Field","name":{"kind":"Name","value":"journal"}},{"kind":"Field","name":{"kind":"Name","value":"url"}},{"kind":"Field","name":{"kind":"Name","value":"therapeuticGoalType"}},{"kind":"Field","name":{"kind":"Name","value":"relevanceScore"}}]}},{"kind":"Field","name":{"kind":"Name","value":"claimCards"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"claim"}},{"kind":"Field","name":{"kind":"Name","value":"verdict"}},{"kind":"Field","name":{"kind":"Name","value":"confidence"}},{"kind":"Field","name":{"kind":"Name","value":"scope"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"population"}},{"kind":"Field","name":{"kind":"Name","value":"intervention"}},{"kind":"Field","name":{"kind":"Name","value":"comparator"}},{"kind":"Field","name":{"kind":"Name","value":"outcome"}},{"kind":"Field","name":{"kind":"Name","value":"timeframe"}},{"kind":"Field","name":{"kind":"Name","value":"setting"}}]}},{"kind":"Field","name":{"kind":"Name","value":"evidence"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"polarity"}},{"kind":"Field","name":{"kind":"Name","value":"score"}},{"kind":"Field","name":{"kind":"Name","value":"excerpt"}},{"kind":"Field","name":{"kind":"Name","value":"rationale"}},{"kind":"Field","name":{"kind":"Name","value":"locator"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"page"}},{"kind":"Field","name":{"kind":"Name","value":"section"}},{"kind":"Field","name":{"kind":"Name","value":"url"}}]}},{"kind":"Field","name":{"kind":"Name","value":"paper"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"title"}},{"kind":"Field","name":{"kind":"Name","value":"year"}},{"kind":"Field","name":{"kind":"Name","value":"doi"}},{"kind":"Field","name":{"kind":"Name","value":"url"}},{"kind":"Field","name":{"kind":"Name","value":"oaUrl"}},{"kind":"Field","name":{"kind":"Name","value":"source"}},{"kind":"Field","name":{"kind":"Name","value":"authors"}},{"kind":"Field","name":{"kind":"Name","value":"abstract"}},{"kind":"Field","name":{"kind":"Name","value":"journal"}}]}}]}},{"kind":"Field","name":{"kind":"Name","value":"queries"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}},{"kind":"Field","name":{"kind":"Name","value":"provenance"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"generatedBy"}},{"kind":"Field","name":{"kind":"Name","value":"model"}},{"kind":"Field","name":{"kind":"Name","value":"sourceTools"}}]}},{"kind":"Field","name":{"kind":"Name","value":"notes"}}]}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}}]}}]}}]} as unknown as DocumentNode<GetNoteQuery, GetNoteQueryVariables>;
export const GetNotesDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"GetNotes"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"entityId"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"Int"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"entityType"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"notes"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"entityId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"entityId"}}},{"kind":"Argument","name":{"kind":"Name","value":"entityType"},"value":{"kind":"Variable","name":{"kind":"Name","value":"entityType"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"entityId"}},{"kind":"Field","name":{"kind":"Name","value":"entityType"}},{"kind":"Field","name":{"kind":"Name","value":"createdBy"}},{"kind":"Field","name":{"kind":"Name","value":"noteType"}},{"kind":"Field","name":{"kind":"Name","value":"slug"}},{"kind":"Field","name":{"kind":"Name","value":"title"}},{"kind":"Field","name":{"kind":"Name","value":"content"}},{"kind":"Field","name":{"kind":"Name","value":"createdBy"}},{"kind":"Field","name":{"kind":"Name","value":"tags"}},{"kind":"Field","name":{"kind":"Name","value":"goal"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"title"}},{"kind":"Field","name":{"kind":"Name","value":"description"}},{"kind":"Field","name":{"kind":"Name","value":"status"}}]}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}}]}}]}}]} as unknown as DocumentNode<GetNotesQuery, GetNotesQueryVariables>;
export const GetPublicDiscussionGuideDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"GetPublicDiscussionGuide"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"journalEntryId"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"Int"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"publicDiscussionGuide"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"journalEntryId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"journalEntryId"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"entryTitle"}},{"kind":"Field","name":{"kind":"Name","value":"familyMemberName"}},{"kind":"Field","name":{"kind":"Name","value":"guide"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"journalEntryId"}},{"kind":"Field","name":{"kind":"Name","value":"childAge"}},{"kind":"Field","name":{"kind":"Name","value":"behaviorSummary"}},{"kind":"Field","name":{"kind":"Name","value":"developmentalContext"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"stage"}},{"kind":"Field","name":{"kind":"Name","value":"explanation"}},{"kind":"Field","name":{"kind":"Name","value":"normalizedBehavior"}},{"kind":"Field","name":{"kind":"Name","value":"researchBasis"}}]}},{"kind":"Field","name":{"kind":"Name","value":"conversationStarters"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"opener"}},{"kind":"Field","name":{"kind":"Name","value":"context"}},{"kind":"Field","name":{"kind":"Name","value":"ageAppropriateNote"}}]}},{"kind":"Field","name":{"kind":"Name","value":"talkingPoints"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"point"}},{"kind":"Field","name":{"kind":"Name","value":"explanation"}},{"kind":"Field","name":{"kind":"Name","value":"researchBacking"}},{"kind":"Field","name":{"kind":"Name","value":"relatedResearchIds"}}]}},{"kind":"Field","name":{"kind":"Name","value":"languageGuide"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"whatToSay"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"phrase"}},{"kind":"Field","name":{"kind":"Name","value":"reason"}},{"kind":"Field","name":{"kind":"Name","value":"alternative"}}]}},{"kind":"Field","name":{"kind":"Name","value":"whatNotToSay"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"phrase"}},{"kind":"Field","name":{"kind":"Name","value":"reason"}},{"kind":"Field","name":{"kind":"Name","value":"alternative"}}]}}]}},{"kind":"Field","name":{"kind":"Name","value":"anticipatedReactions"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"reaction"}},{"kind":"Field","name":{"kind":"Name","value":"likelihood"}},{"kind":"Field","name":{"kind":"Name","value":"howToRespond"}}]}},{"kind":"Field","name":{"kind":"Name","value":"followUpPlan"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"action"}},{"kind":"Field","name":{"kind":"Name","value":"timing"}},{"kind":"Field","name":{"kind":"Name","value":"description"}}]}},{"kind":"Field","name":{"kind":"Name","value":"model"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}}]}}]}}]}}]} as unknown as DocumentNode<GetPublicDiscussionGuideQuery, GetPublicDiscussionGuideQueryVariables>;
export const GetRecentJobsDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"GetRecentJobs"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"generationJobs"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"type"}},{"kind":"Field","name":{"kind":"Name","value":"goalId"}},{"kind":"Field","name":{"kind":"Name","value":"storyId"}},{"kind":"Field","name":{"kind":"Name","value":"status"}},{"kind":"Field","name":{"kind":"Name","value":"progress"}},{"kind":"Field","name":{"kind":"Name","value":"result"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"count"}},{"kind":"Field","name":{"kind":"Name","value":"stage"}},{"kind":"Field","name":{"kind":"Name","value":"audioUrl"}}]}},{"kind":"Field","name":{"kind":"Name","value":"error"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"message"}}]}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}}]}}]}}]} as unknown as DocumentNode<GetRecentJobsQuery, GetRecentJobsQueryVariables>;
export const GetRecommendedBooksDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"GetRecommendedBooks"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"goalId"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"Int"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"recommendedBooks"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"goalId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"goalId"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"goalId"}},{"kind":"Field","name":{"kind":"Name","value":"title"}},{"kind":"Field","name":{"kind":"Name","value":"authors"}},{"kind":"Field","name":{"kind":"Name","value":"year"}},{"kind":"Field","name":{"kind":"Name","value":"isbn"}},{"kind":"Field","name":{"kind":"Name","value":"description"}},{"kind":"Field","name":{"kind":"Name","value":"whyRecommended"}},{"kind":"Field","name":{"kind":"Name","value":"category"}},{"kind":"Field","name":{"kind":"Name","value":"amazonUrl"}},{"kind":"Field","name":{"kind":"Name","value":"generatedAt"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}}]}}]}}]} as unknown as DocumentNode<GetRecommendedBooksQuery, GetRecommendedBooksQueryVariables>;
export const GetRelationshipDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"GetRelationship"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"id"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"Int"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"relationship"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"id"},"value":{"kind":"Variable","name":{"kind":"Name","value":"id"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"createdBy"}},{"kind":"Field","name":{"kind":"Name","value":"subjectType"}},{"kind":"Field","name":{"kind":"Name","value":"subjectId"}},{"kind":"Field","name":{"kind":"Name","value":"relatedType"}},{"kind":"Field","name":{"kind":"Name","value":"relatedId"}},{"kind":"Field","name":{"kind":"Name","value":"relationshipType"}},{"kind":"Field","name":{"kind":"Name","value":"context"}},{"kind":"Field","name":{"kind":"Name","value":"startDate"}},{"kind":"Field","name":{"kind":"Name","value":"status"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}},{"kind":"Field","name":{"kind":"Name","value":"subject"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"type"}},{"kind":"Field","name":{"kind":"Name","value":"firstName"}},{"kind":"Field","name":{"kind":"Name","value":"lastName"}}]}},{"kind":"Field","name":{"kind":"Name","value":"related"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"type"}},{"kind":"Field","name":{"kind":"Name","value":"firstName"}},{"kind":"Field","name":{"kind":"Name","value":"lastName"}}]}}]}}]}}]} as unknown as DocumentNode<GetRelationshipQuery, GetRelationshipQueryVariables>;
export const GetRelationshipsDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"GetRelationships"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"subjectType"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"PersonType"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"subjectId"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"Int"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"relationships"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"subjectType"},"value":{"kind":"Variable","name":{"kind":"Name","value":"subjectType"}}},{"kind":"Argument","name":{"kind":"Name","value":"subjectId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"subjectId"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"createdBy"}},{"kind":"Field","name":{"kind":"Name","value":"subjectType"}},{"kind":"Field","name":{"kind":"Name","value":"subjectId"}},{"kind":"Field","name":{"kind":"Name","value":"relatedType"}},{"kind":"Field","name":{"kind":"Name","value":"relatedId"}},{"kind":"Field","name":{"kind":"Name","value":"relationshipType"}},{"kind":"Field","name":{"kind":"Name","value":"context"}},{"kind":"Field","name":{"kind":"Name","value":"startDate"}},{"kind":"Field","name":{"kind":"Name","value":"status"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}},{"kind":"Field","name":{"kind":"Name","value":"subject"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"type"}},{"kind":"Field","name":{"kind":"Name","value":"slug"}},{"kind":"Field","name":{"kind":"Name","value":"firstName"}},{"kind":"Field","name":{"kind":"Name","value":"lastName"}}]}},{"kind":"Field","name":{"kind":"Name","value":"related"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"type"}},{"kind":"Field","name":{"kind":"Name","value":"slug"}},{"kind":"Field","name":{"kind":"Name","value":"firstName"}},{"kind":"Field","name":{"kind":"Name","value":"lastName"}}]}}]}}]}}]} as unknown as DocumentNode<GetRelationshipsQuery, GetRelationshipsQueryVariables>;
export const GetResearchDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"GetResearch"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"goalId"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"Int"}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"issueId"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"Int"}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"feedbackId"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"Int"}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"journalEntryId"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"Int"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"research"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"goalId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"goalId"}}},{"kind":"Argument","name":{"kind":"Name","value":"issueId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"issueId"}}},{"kind":"Argument","name":{"kind":"Name","value":"feedbackId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"feedbackId"}}},{"kind":"Argument","name":{"kind":"Name","value":"journalEntryId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"journalEntryId"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"goalId"}},{"kind":"Field","name":{"kind":"Name","value":"feedbackId"}},{"kind":"Field","name":{"kind":"Name","value":"journalEntryId"}},{"kind":"Field","name":{"kind":"Name","value":"title"}},{"kind":"Field","name":{"kind":"Name","value":"authors"}},{"kind":"Field","name":{"kind":"Name","value":"year"}},{"kind":"Field","name":{"kind":"Name","value":"journal"}},{"kind":"Field","name":{"kind":"Name","value":"doi"}},{"kind":"Field","name":{"kind":"Name","value":"url"}},{"kind":"Field","name":{"kind":"Name","value":"abstract"}},{"kind":"Field","name":{"kind":"Name","value":"keyFindings"}},{"kind":"Field","name":{"kind":"Name","value":"therapeuticTechniques"}},{"kind":"Field","name":{"kind":"Name","value":"evidenceLevel"}},{"kind":"Field","name":{"kind":"Name","value":"relevanceScore"}},{"kind":"Field","name":{"kind":"Name","value":"extractedBy"}},{"kind":"Field","name":{"kind":"Name","value":"extractionConfidence"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}}]}}]}}]} as unknown as DocumentNode<GetResearchQuery, GetResearchQueryVariables>;
export const GetRoutineAnalysesDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"GetRoutineAnalyses"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"familyMemberId"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"Int"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"routineAnalyses"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"familyMemberId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"familyMemberId"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"familyMemberId"}},{"kind":"Field","name":{"kind":"Name","value":"createdBy"}},{"kind":"Field","name":{"kind":"Name","value":"jobId"}},{"kind":"Field","name":{"kind":"Name","value":"summary"}},{"kind":"Field","name":{"kind":"Name","value":"adherencePatterns"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"habitId"}},{"kind":"Field","name":{"kind":"Name","value":"habitTitle"}},{"kind":"Field","name":{"kind":"Name","value":"frequency"}},{"kind":"Field","name":{"kind":"Name","value":"targetCount"}},{"kind":"Field","name":{"kind":"Name","value":"observedCount"}},{"kind":"Field","name":{"kind":"Name","value":"consistency"}},{"kind":"Field","name":{"kind":"Name","value":"currentStreak"}},{"kind":"Field","name":{"kind":"Name","value":"longestStreak"}},{"kind":"Field","name":{"kind":"Name","value":"missedPattern"}},{"kind":"Field","name":{"kind":"Name","value":"interpretation"}}]}},{"kind":"Field","name":{"kind":"Name","value":"routineBalance"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"domainsCovered"}},{"kind":"Field","name":{"kind":"Name","value":"domainsMissing"}},{"kind":"Field","name":{"kind":"Name","value":"overEmphasized"}},{"kind":"Field","name":{"kind":"Name","value":"underEmphasized"}},{"kind":"Field","name":{"kind":"Name","value":"verdict"}}]}},{"kind":"Field","name":{"kind":"Name","value":"streaks"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"strongestHabitId"}},{"kind":"Field","name":{"kind":"Name","value":"strongestStreak"}},{"kind":"Field","name":{"kind":"Name","value":"weakestHabitId"}},{"kind":"Field","name":{"kind":"Name","value":"weakestStreak"}},{"kind":"Field","name":{"kind":"Name","value":"momentum"}}]}},{"kind":"Field","name":{"kind":"Name","value":"gaps"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"area"}},{"kind":"Field","name":{"kind":"Name","value":"rationale"}},{"kind":"Field","name":{"kind":"Name","value":"severity"}}]}},{"kind":"Field","name":{"kind":"Name","value":"optimizationSuggestions"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"title"}},{"kind":"Field","name":{"kind":"Name","value":"rationale"}},{"kind":"Field","name":{"kind":"Name","value":"priority"}},{"kind":"Field","name":{"kind":"Name","value":"changeType"}},{"kind":"Field","name":{"kind":"Name","value":"targetHabitId"}},{"kind":"Field","name":{"kind":"Name","value":"suggestedFrequency"}},{"kind":"Field","name":{"kind":"Name","value":"suggestedTargetCount"}},{"kind":"Field","name":{"kind":"Name","value":"concreteSteps"}},{"kind":"Field","name":{"kind":"Name","value":"ageAppropriate"}},{"kind":"Field","name":{"kind":"Name","value":"developmentalContext"}}]}},{"kind":"Field","name":{"kind":"Name","value":"researchRelevance"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"topic"}},{"kind":"Field","name":{"kind":"Name","value":"relevantResearchIds"}},{"kind":"Field","name":{"kind":"Name","value":"relevantResearchTitles"}},{"kind":"Field","name":{"kind":"Name","value":"coverageGaps"}}]}},{"kind":"Field","name":{"kind":"Name","value":"dataSnapshot"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"habitsCount"}},{"kind":"Field","name":{"kind":"Name","value":"activeDailyCount"}},{"kind":"Field","name":{"kind":"Name","value":"activeWeeklyCount"}},{"kind":"Field","name":{"kind":"Name","value":"logCount"}},{"kind":"Field","name":{"kind":"Name","value":"windowDays"}},{"kind":"Field","name":{"kind":"Name","value":"overallAdherence"}},{"kind":"Field","name":{"kind":"Name","value":"linkedGoalCount"}},{"kind":"Field","name":{"kind":"Name","value":"linkedIssueCount"}},{"kind":"Field","name":{"kind":"Name","value":"researchPaperCount"}},{"kind":"Field","name":{"kind":"Name","value":"issueCount"}},{"kind":"Field","name":{"kind":"Name","value":"journalEntryCount"}},{"kind":"Field","name":{"kind":"Name","value":"observationCount"}},{"kind":"Field","name":{"kind":"Name","value":"teacherFeedbackCount"}},{"kind":"Field","name":{"kind":"Name","value":"contactFeedbackCount"}},{"kind":"Field","name":{"kind":"Name","value":"narrowTherapyHabitsCount"}}]}},{"kind":"Field","name":{"kind":"Name","value":"model"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}}]}}]}}]} as unknown as DocumentNode<GetRoutineAnalysesQuery, GetRoutineAnalysesQueryVariables>;
export const GetRoutineAnalysisDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"GetRoutineAnalysis"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"id"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"Int"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"routineAnalysis"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"id"},"value":{"kind":"Variable","name":{"kind":"Name","value":"id"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"familyMemberId"}},{"kind":"Field","name":{"kind":"Name","value":"createdBy"}},{"kind":"Field","name":{"kind":"Name","value":"jobId"}},{"kind":"Field","name":{"kind":"Name","value":"summary"}},{"kind":"Field","name":{"kind":"Name","value":"adherencePatterns"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"habitId"}},{"kind":"Field","name":{"kind":"Name","value":"habitTitle"}},{"kind":"Field","name":{"kind":"Name","value":"frequency"}},{"kind":"Field","name":{"kind":"Name","value":"targetCount"}},{"kind":"Field","name":{"kind":"Name","value":"observedCount"}},{"kind":"Field","name":{"kind":"Name","value":"consistency"}},{"kind":"Field","name":{"kind":"Name","value":"currentStreak"}},{"kind":"Field","name":{"kind":"Name","value":"longestStreak"}},{"kind":"Field","name":{"kind":"Name","value":"missedPattern"}},{"kind":"Field","name":{"kind":"Name","value":"interpretation"}}]}},{"kind":"Field","name":{"kind":"Name","value":"routineBalance"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"domainsCovered"}},{"kind":"Field","name":{"kind":"Name","value":"domainsMissing"}},{"kind":"Field","name":{"kind":"Name","value":"overEmphasized"}},{"kind":"Field","name":{"kind":"Name","value":"underEmphasized"}},{"kind":"Field","name":{"kind":"Name","value":"verdict"}}]}},{"kind":"Field","name":{"kind":"Name","value":"streaks"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"strongestHabitId"}},{"kind":"Field","name":{"kind":"Name","value":"strongestStreak"}},{"kind":"Field","name":{"kind":"Name","value":"weakestHabitId"}},{"kind":"Field","name":{"kind":"Name","value":"weakestStreak"}},{"kind":"Field","name":{"kind":"Name","value":"momentum"}}]}},{"kind":"Field","name":{"kind":"Name","value":"gaps"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"area"}},{"kind":"Field","name":{"kind":"Name","value":"rationale"}},{"kind":"Field","name":{"kind":"Name","value":"severity"}}]}},{"kind":"Field","name":{"kind":"Name","value":"optimizationSuggestions"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"title"}},{"kind":"Field","name":{"kind":"Name","value":"rationale"}},{"kind":"Field","name":{"kind":"Name","value":"priority"}},{"kind":"Field","name":{"kind":"Name","value":"changeType"}},{"kind":"Field","name":{"kind":"Name","value":"targetHabitId"}},{"kind":"Field","name":{"kind":"Name","value":"suggestedFrequency"}},{"kind":"Field","name":{"kind":"Name","value":"suggestedTargetCount"}},{"kind":"Field","name":{"kind":"Name","value":"concreteSteps"}},{"kind":"Field","name":{"kind":"Name","value":"ageAppropriate"}},{"kind":"Field","name":{"kind":"Name","value":"developmentalContext"}}]}},{"kind":"Field","name":{"kind":"Name","value":"researchRelevance"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"topic"}},{"kind":"Field","name":{"kind":"Name","value":"relevantResearchIds"}},{"kind":"Field","name":{"kind":"Name","value":"relevantResearchTitles"}},{"kind":"Field","name":{"kind":"Name","value":"coverageGaps"}}]}},{"kind":"Field","name":{"kind":"Name","value":"dataSnapshot"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"habitsCount"}},{"kind":"Field","name":{"kind":"Name","value":"activeDailyCount"}},{"kind":"Field","name":{"kind":"Name","value":"activeWeeklyCount"}},{"kind":"Field","name":{"kind":"Name","value":"logCount"}},{"kind":"Field","name":{"kind":"Name","value":"windowDays"}},{"kind":"Field","name":{"kind":"Name","value":"overallAdherence"}},{"kind":"Field","name":{"kind":"Name","value":"linkedGoalCount"}},{"kind":"Field","name":{"kind":"Name","value":"linkedIssueCount"}},{"kind":"Field","name":{"kind":"Name","value":"researchPaperCount"}},{"kind":"Field","name":{"kind":"Name","value":"issueCount"}},{"kind":"Field","name":{"kind":"Name","value":"journalEntryCount"}},{"kind":"Field","name":{"kind":"Name","value":"observationCount"}},{"kind":"Field","name":{"kind":"Name","value":"teacherFeedbackCount"}},{"kind":"Field","name":{"kind":"Name","value":"contactFeedbackCount"}},{"kind":"Field","name":{"kind":"Name","value":"narrowTherapyHabitsCount"}}]}},{"kind":"Field","name":{"kind":"Name","value":"model"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}}]}}]}}]} as unknown as DocumentNode<GetRoutineAnalysisQuery, GetRoutineAnalysisQueryVariables>;
export const GetStoriesDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"GetStories"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"goalId"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"Int"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"stories"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"goalId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"goalId"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"goalId"}},{"kind":"Field","name":{"kind":"Name","value":"createdBy"}},{"kind":"Field","name":{"kind":"Name","value":"content"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}}]}}]}}]} as unknown as DocumentNode<GetStoriesQuery, GetStoriesQueryVariables>;
export const GetStoryDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"GetStory"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"id"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"Int"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"story"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"id"},"value":{"kind":"Variable","name":{"kind":"Name","value":"id"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"goalId"}},{"kind":"Field","name":{"kind":"Name","value":"issueId"}},{"kind":"Field","name":{"kind":"Name","value":"feedbackId"}},{"kind":"Field","name":{"kind":"Name","value":"createdBy"}},{"kind":"Field","name":{"kind":"Name","value":"content"}},{"kind":"Field","name":{"kind":"Name","value":"language"}},{"kind":"Field","name":{"kind":"Name","value":"minutes"}},{"kind":"Field","name":{"kind":"Name","value":"audioKey"}},{"kind":"Field","name":{"kind":"Name","value":"audioUrl"}},{"kind":"Field","name":{"kind":"Name","value":"audioGeneratedAt"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}},{"kind":"Field","name":{"kind":"Name","value":"goal"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"title"}},{"kind":"Field","name":{"kind":"Name","value":"slug"}}]}},{"kind":"Field","name":{"kind":"Name","value":"issue"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"title"}},{"kind":"Field","name":{"kind":"Name","value":"familyMember"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"firstName"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"slug"}}]}}]}}]}}]}}]} as unknown as DocumentNode<GetStoryQuery, GetStoryQueryVariables>;
export const GetTeacherFeedbacksDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"GetTeacherFeedbacks"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"familyMemberId"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"Int"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"teacherFeedbacks"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"familyMemberId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"familyMemberId"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"familyMemberId"}},{"kind":"Field","name":{"kind":"Name","value":"createdBy"}},{"kind":"Field","name":{"kind":"Name","value":"teacherName"}},{"kind":"Field","name":{"kind":"Name","value":"subject"}},{"kind":"Field","name":{"kind":"Name","value":"feedbackDate"}},{"kind":"Field","name":{"kind":"Name","value":"content"}},{"kind":"Field","name":{"kind":"Name","value":"tags"}},{"kind":"Field","name":{"kind":"Name","value":"source"}},{"kind":"Field","name":{"kind":"Name","value":"extracted"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}},{"kind":"Field","name":{"kind":"Name","value":"familyMember"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"firstName"}},{"kind":"Field","name":{"kind":"Name","value":"name"}}]}}]}}]}}]} as unknown as DocumentNode<GetTeacherFeedbacksQuery, GetTeacherFeedbacksQueryVariables>;
export const GetTherapeuticQuestionsDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"GetTherapeuticQuestions"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"goalId"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"Int"}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"issueId"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"Int"}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"journalEntryId"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"Int"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"therapeuticQuestions"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"goalId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"goalId"}}},{"kind":"Argument","name":{"kind":"Name","value":"issueId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"issueId"}}},{"kind":"Argument","name":{"kind":"Name","value":"journalEntryId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"journalEntryId"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"goalId"}},{"kind":"Field","name":{"kind":"Name","value":"issueId"}},{"kind":"Field","name":{"kind":"Name","value":"journalEntryId"}},{"kind":"Field","name":{"kind":"Name","value":"question"}},{"kind":"Field","name":{"kind":"Name","value":"researchId"}},{"kind":"Field","name":{"kind":"Name","value":"researchTitle"}},{"kind":"Field","name":{"kind":"Name","value":"rationale"}},{"kind":"Field","name":{"kind":"Name","value":"generatedAt"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}}]}}]}}]} as unknown as DocumentNode<GetTherapeuticQuestionsQuery, GetTherapeuticQuestionsQueryVariables>;
export const HealthcareSummaryDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"HealthcareSummary"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"healthcareSummary"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"bloodTestsCount"}},{"kind":"Field","name":{"kind":"Name","value":"conditionsCount"}},{"kind":"Field","name":{"kind":"Name","value":"medicationsCount"}},{"kind":"Field","name":{"kind":"Name","value":"symptomsCount"}},{"kind":"Field","name":{"kind":"Name","value":"appointmentsCount"}},{"kind":"Field","name":{"kind":"Name","value":"doctorsCount"}},{"kind":"Field","name":{"kind":"Name","value":"memoryEntriesCount"}},{"kind":"Field","name":{"kind":"Name","value":"protocolsCount"}}]}}]}}]} as unknown as DocumentNode<HealthcareSummaryQuery, HealthcareSummaryQueryVariables>;
export const LatestBogdanDiscussionDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"LatestBogdanDiscussion"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"latestBogdanDiscussion"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"familyMemberId"}},{"kind":"Field","name":{"kind":"Name","value":"childAge"}},{"kind":"Field","name":{"kind":"Name","value":"behaviorSummary"}},{"kind":"Field","name":{"kind":"Name","value":"developmentalContext"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"stage"}},{"kind":"Field","name":{"kind":"Name","value":"explanation"}},{"kind":"Field","name":{"kind":"Name","value":"normalizedBehavior"}},{"kind":"Field","name":{"kind":"Name","value":"researchBasis"}}]}},{"kind":"Field","name":{"kind":"Name","value":"conversationStarters"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"opener"}},{"kind":"Field","name":{"kind":"Name","value":"context"}},{"kind":"Field","name":{"kind":"Name","value":"ageAppropriateNote"}}]}},{"kind":"Field","name":{"kind":"Name","value":"talkingPoints"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"point"}},{"kind":"Field","name":{"kind":"Name","value":"explanation"}},{"kind":"Field","name":{"kind":"Name","value":"researchBacking"}},{"kind":"Field","name":{"kind":"Name","value":"citations"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"researchId"}},{"kind":"Field","name":{"kind":"Name","value":"doi"}},{"kind":"Field","name":{"kind":"Name","value":"title"}},{"kind":"Field","name":{"kind":"Name","value":"year"}},{"kind":"Field","name":{"kind":"Name","value":"authors"}},{"kind":"Field","name":{"kind":"Name","value":"url"}}]}},{"kind":"Field","name":{"kind":"Name","value":"microScript"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"parentOpener"}},{"kind":"Field","name":{"kind":"Name","value":"childResponse"}},{"kind":"Field","name":{"kind":"Name","value":"parentFollowUp"}}]}}]}},{"kind":"Field","name":{"kind":"Name","value":"languageGuide"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"whatToSay"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"phrase"}},{"kind":"Field","name":{"kind":"Name","value":"reason"}},{"kind":"Field","name":{"kind":"Name","value":"alternative"}}]}},{"kind":"Field","name":{"kind":"Name","value":"whatNotToSay"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"phrase"}},{"kind":"Field","name":{"kind":"Name","value":"reason"}},{"kind":"Field","name":{"kind":"Name","value":"alternative"}}]}}]}},{"kind":"Field","name":{"kind":"Name","value":"anticipatedReactions"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"reaction"}},{"kind":"Field","name":{"kind":"Name","value":"likelihood"}},{"kind":"Field","name":{"kind":"Name","value":"howToRespond"}}]}},{"kind":"Field","name":{"kind":"Name","value":"followUpPlan"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"action"}},{"kind":"Field","name":{"kind":"Name","value":"timing"}},{"kind":"Field","name":{"kind":"Name","value":"description"}}]}},{"kind":"Field","name":{"kind":"Name","value":"citations"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"researchId"}},{"kind":"Field","name":{"kind":"Name","value":"doi"}},{"kind":"Field","name":{"kind":"Name","value":"title"}},{"kind":"Field","name":{"kind":"Name","value":"year"}},{"kind":"Field","name":{"kind":"Name","value":"authors"}},{"kind":"Field","name":{"kind":"Name","value":"url"}}]}},{"kind":"Field","name":{"kind":"Name","value":"critique"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"scores"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"romanianFluency"}},{"kind":"Field","name":{"kind":"Name","value":"actionability"}},{"kind":"Field","name":{"kind":"Name","value":"citationCoverage"}},{"kind":"Field","name":{"kind":"Name","value":"ageAppropriateness"}},{"kind":"Field","name":{"kind":"Name","value":"internalConsistency"}},{"kind":"Field","name":{"kind":"Name","value":"microScriptDepth"}}]}},{"kind":"Field","name":{"kind":"Name","value":"weakSections"}},{"kind":"Field","name":{"kind":"Name","value":"refined"}}]}},{"kind":"Field","name":{"kind":"Name","value":"model"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}}]}}]}}]} as unknown as DocumentNode<LatestBogdanDiscussionQuery, LatestBogdanDiscussionQueryVariables>;
export const LinkContactToIssueDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"LinkContactToIssue"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"issueId"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"Int"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"contactId"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"Int"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"linkContactToIssue"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"issueId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"issueId"}}},{"kind":"Argument","name":{"kind":"Name","value":"contactId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"contactId"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"contact"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"firstName"}},{"kind":"Field","name":{"kind":"Name","value":"lastName"}},{"kind":"Field","name":{"kind":"Name","value":"role"}},{"kind":"Field","name":{"kind":"Name","value":"slug"}}]}}]}}]}}]} as unknown as DocumentNode<LinkContactToIssueMutation, LinkContactToIssueMutationVariables>;
export const LinkIssuesDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"LinkIssues"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"issueId"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"Int"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"linkedIssueId"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"Int"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"linkType"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"linkIssues"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"issueId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"issueId"}}},{"kind":"Argument","name":{"kind":"Name","value":"linkedIssueId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"linkedIssueId"}}},{"kind":"Argument","name":{"kind":"Name","value":"linkType"},"value":{"kind":"Variable","name":{"kind":"Name","value":"linkType"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"linkType"}},{"kind":"Field","name":{"kind":"Name","value":"issue"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"title"}},{"kind":"Field","name":{"kind":"Name","value":"category"}},{"kind":"Field","name":{"kind":"Name","value":"severity"}},{"kind":"Field","name":{"kind":"Name","value":"familyMemberId"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}}]}}]}}]}}]} as unknown as DocumentNode<LinkIssuesMutation, LinkIssuesMutationVariables>;
export const LockVaultDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"LockVault"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"lockVault"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"unlocked"}}]}}]}}]} as unknown as DocumentNode<LockVaultMutation, LockVaultMutationVariables>;
export const LogGameCompletionDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"LogGameCompletion"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"input"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"LogGameCompletionInput"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"logGameCompletion"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"Variable","name":{"kind":"Name","value":"input"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"gameId"}},{"kind":"Field","name":{"kind":"Name","value":"durationSeconds"}},{"kind":"Field","name":{"kind":"Name","value":"responses"}},{"kind":"Field","name":{"kind":"Name","value":"linkedNoteId"}},{"kind":"Field","name":{"kind":"Name","value":"completedAt"}}]}}]}}]} as unknown as DocumentNode<LogGameCompletionMutation, LogGameCompletionMutationVariables>;
export const LogHabitDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"LogHabit"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"habitId"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"Int"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"loggedDate"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"count"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"Int"}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"notes"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"logHabit"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"habitId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"habitId"}}},{"kind":"Argument","name":{"kind":"Name","value":"loggedDate"},"value":{"kind":"Variable","name":{"kind":"Name","value":"loggedDate"}}},{"kind":"Argument","name":{"kind":"Name","value":"count"},"value":{"kind":"Variable","name":{"kind":"Name","value":"count"}}},{"kind":"Argument","name":{"kind":"Name","value":"notes"},"value":{"kind":"Variable","name":{"kind":"Name","value":"notes"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"habitId"}},{"kind":"Field","name":{"kind":"Name","value":"loggedDate"}},{"kind":"Field","name":{"kind":"Name","value":"count"}},{"kind":"Field","name":{"kind":"Name","value":"notes"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}}]}}]}}]} as unknown as DocumentNode<LogHabitMutation, LogHabitMutationVariables>;
export const MedicationsDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"Medications"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"medications"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"familyMemberId"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"dosage"}},{"kind":"Field","name":{"kind":"Name","value":"frequency"}},{"kind":"Field","name":{"kind":"Name","value":"notes"}},{"kind":"Field","name":{"kind":"Name","value":"startDate"}},{"kind":"Field","name":{"kind":"Name","value":"endDate"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"familyMember"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"slug"}},{"kind":"Field","name":{"kind":"Name","value":"firstName"}},{"kind":"Field","name":{"kind":"Name","value":"name"}}]}}]}}]}}]} as unknown as DocumentNode<MedicationsQuery, MedicationsQueryVariables>;
export const MemoryEntriesDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"MemoryEntries"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"memoryEntries"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"category"}},{"kind":"Field","name":{"kind":"Name","value":"description"}},{"kind":"Field","name":{"kind":"Name","value":"context"}},{"kind":"Field","name":{"kind":"Name","value":"protocolId"}},{"kind":"Field","name":{"kind":"Name","value":"overallScore"}},{"kind":"Field","name":{"kind":"Name","value":"shortTermScore"}},{"kind":"Field","name":{"kind":"Name","value":"longTermScore"}},{"kind":"Field","name":{"kind":"Name","value":"workingMemoryScore"}},{"kind":"Field","name":{"kind":"Name","value":"recallSpeed"}},{"kind":"Field","name":{"kind":"Name","value":"loggedAt"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}}]}},{"kind":"Field","name":{"kind":"Name","value":"memoryBaseline"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"overallScore"}},{"kind":"Field","name":{"kind":"Name","value":"shortTermScore"}},{"kind":"Field","name":{"kind":"Name","value":"longTermScore"}},{"kind":"Field","name":{"kind":"Name","value":"workingMemoryScore"}},{"kind":"Field","name":{"kind":"Name","value":"recallSpeed"}},{"kind":"Field","name":{"kind":"Name","value":"recordedAt"}}]}}]}}]} as unknown as DocumentNode<MemoryEntriesQuery, MemoryEntriesQueryVariables>;
export const ProtocolDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"Protocol"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"slug"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"protocol"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"slug"},"value":{"kind":"Variable","name":{"kind":"Name","value":"slug"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"protocol"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"slug"}},{"kind":"Field","name":{"kind":"Name","value":"targetAreas"}},{"kind":"Field","name":{"kind":"Name","value":"status"}},{"kind":"Field","name":{"kind":"Name","value":"notes"}},{"kind":"Field","name":{"kind":"Name","value":"startDate"}},{"kind":"Field","name":{"kind":"Name","value":"endDate"}},{"kind":"Field","name":{"kind":"Name","value":"supplementCount"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}}]}},{"kind":"Field","name":{"kind":"Name","value":"supplements"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"dosage"}},{"kind":"Field","name":{"kind":"Name","value":"frequency"}},{"kind":"Field","name":{"kind":"Name","value":"mechanism"}},{"kind":"Field","name":{"kind":"Name","value":"targetAreas"}},{"kind":"Field","name":{"kind":"Name","value":"notes"}},{"kind":"Field","name":{"kind":"Name","value":"url"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}}]}},{"kind":"Field","name":{"kind":"Name","value":"baseline"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"memoryScore"}},{"kind":"Field","name":{"kind":"Name","value":"focusScore"}},{"kind":"Field","name":{"kind":"Name","value":"processingSpeedScore"}},{"kind":"Field","name":{"kind":"Name","value":"moodScore"}},{"kind":"Field","name":{"kind":"Name","value":"sleepScore"}},{"kind":"Field","name":{"kind":"Name","value":"recordedAt"}}]}},{"kind":"Field","name":{"kind":"Name","value":"checkIns"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"memoryScore"}},{"kind":"Field","name":{"kind":"Name","value":"focusScore"}},{"kind":"Field","name":{"kind":"Name","value":"processingSpeedScore"}},{"kind":"Field","name":{"kind":"Name","value":"moodScore"}},{"kind":"Field","name":{"kind":"Name","value":"sleepScore"}},{"kind":"Field","name":{"kind":"Name","value":"sideEffects"}},{"kind":"Field","name":{"kind":"Name","value":"notes"}},{"kind":"Field","name":{"kind":"Name","value":"recordedAt"}}]}}]}}]}}]} as unknown as DocumentNode<ProtocolQuery, ProtocolQueryVariables>;
export const ProtocolsDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"Protocols"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"protocols"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"slug"}},{"kind":"Field","name":{"kind":"Name","value":"targetAreas"}},{"kind":"Field","name":{"kind":"Name","value":"status"}},{"kind":"Field","name":{"kind":"Name","value":"notes"}},{"kind":"Field","name":{"kind":"Name","value":"startDate"}},{"kind":"Field","name":{"kind":"Name","value":"endDate"}},{"kind":"Field","name":{"kind":"Name","value":"supplementCount"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}}]}}]}}]} as unknown as DocumentNode<ProtocolsQuery, ProtocolsQueryVariables>;
export const RecordCognitiveBaselineDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"RecordCognitiveBaseline"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"protocolId"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"input"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"CognitiveScoresInput"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"recordCognitiveBaseline"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"protocolId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"protocolId"}}},{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"Variable","name":{"kind":"Name","value":"input"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"memoryScore"}},{"kind":"Field","name":{"kind":"Name","value":"focusScore"}},{"kind":"Field","name":{"kind":"Name","value":"processingSpeedScore"}},{"kind":"Field","name":{"kind":"Name","value":"moodScore"}},{"kind":"Field","name":{"kind":"Name","value":"sleepScore"}},{"kind":"Field","name":{"kind":"Name","value":"recordedAt"}}]}}]}}]} as unknown as DocumentNode<RecordCognitiveBaselineMutation, RecordCognitiveBaselineMutationVariables>;
export const RecordCognitiveCheckInDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"RecordCognitiveCheckIn"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"protocolId"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"input"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"CognitiveCheckInInput"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"recordCognitiveCheckIn"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"protocolId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"protocolId"}}},{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"Variable","name":{"kind":"Name","value":"input"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"memoryScore"}},{"kind":"Field","name":{"kind":"Name","value":"focusScore"}},{"kind":"Field","name":{"kind":"Name","value":"processingSpeedScore"}},{"kind":"Field","name":{"kind":"Name","value":"moodScore"}},{"kind":"Field","name":{"kind":"Name","value":"sleepScore"}},{"kind":"Field","name":{"kind":"Name","value":"sideEffects"}},{"kind":"Field","name":{"kind":"Name","value":"notes"}},{"kind":"Field","name":{"kind":"Name","value":"recordedAt"}}]}}]}}]} as unknown as DocumentNode<RecordCognitiveCheckInMutation, RecordCognitiveCheckInMutationVariables>;
export const SendConversationMessageDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"SendConversationMessage"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"conversationId"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"Int"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"message"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"sendConversationMessage"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"conversationId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"conversationId"}}},{"kind":"Argument","name":{"kind":"Name","value":"message"},"value":{"kind":"Variable","name":{"kind":"Name","value":"message"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"issueId"}},{"kind":"Field","name":{"kind":"Name","value":"userId"}},{"kind":"Field","name":{"kind":"Name","value":"title"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}},{"kind":"Field","name":{"kind":"Name","value":"messages"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"conversationId"}},{"kind":"Field","name":{"kind":"Name","value":"role"}},{"kind":"Field","name":{"kind":"Name","value":"content"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}}]}}]}}]}}]} as unknown as DocumentNode<SendConversationMessageMutation, SendConversationMessageMutationVariables>;
export const SetMemoryBaselineDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"SetMemoryBaseline"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"input"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"SetMemoryBaselineInput"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"setMemoryBaseline"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"Variable","name":{"kind":"Name","value":"input"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"overallScore"}},{"kind":"Field","name":{"kind":"Name","value":"shortTermScore"}},{"kind":"Field","name":{"kind":"Name","value":"longTermScore"}},{"kind":"Field","name":{"kind":"Name","value":"workingMemoryScore"}},{"kind":"Field","name":{"kind":"Name","value":"recallSpeed"}},{"kind":"Field","name":{"kind":"Name","value":"recordedAt"}}]}}]}}]} as unknown as DocumentNode<SetMemoryBaselineMutation, SetMemoryBaselineMutationVariables>;
export const ShareFamilyMemberDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"ShareFamilyMember"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"familyMemberId"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"Int"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"email"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"role"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"FamilyMemberShareRole"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"shareFamilyMember"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"familyMemberId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"familyMemberId"}}},{"kind":"Argument","name":{"kind":"Name","value":"email"},"value":{"kind":"Variable","name":{"kind":"Name","value":"email"}}},{"kind":"Argument","name":{"kind":"Name","value":"role"},"value":{"kind":"Variable","name":{"kind":"Name","value":"role"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"familyMemberId"}},{"kind":"Field","name":{"kind":"Name","value":"email"}},{"kind":"Field","name":{"kind":"Name","value":"role"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}}]}}]}}]} as unknown as DocumentNode<ShareFamilyMemberMutation, ShareFamilyMemberMutationVariables>;
export const SymptomsDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"Symptoms"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"symptoms"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"description"}},{"kind":"Field","name":{"kind":"Name","value":"severity"}},{"kind":"Field","name":{"kind":"Name","value":"loggedAt"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}}]}}]}}]} as unknown as DocumentNode<SymptomsQuery, SymptomsQueryVariables>;
export const TagLanguageDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"TagLanguage"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"tag"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"tagLanguage"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"tag"},"value":{"kind":"Variable","name":{"kind":"Name","value":"tag"}}}]}]}}]} as unknown as DocumentNode<TagLanguageQuery, TagLanguageQueryVariables>;
export const SetTagLanguageDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"SetTagLanguage"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"tag"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"language"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"setTagLanguage"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"tag"},"value":{"kind":"Variable","name":{"kind":"Name","value":"tag"}}},{"kind":"Argument","name":{"kind":"Name","value":"language"},"value":{"kind":"Variable","name":{"kind":"Name","value":"language"}}}]}]}}]} as unknown as DocumentNode<SetTagLanguageMutation, SetTagLanguageMutationVariables>;
export const UnlinkContactFromIssueDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"UnlinkContactFromIssue"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"issueId"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"Int"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"contactId"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"Int"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"unlinkContactFromIssue"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"issueId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"issueId"}}},{"kind":"Argument","name":{"kind":"Name","value":"contactId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"contactId"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"success"}}]}}]}}]} as unknown as DocumentNode<UnlinkContactFromIssueMutation, UnlinkContactFromIssueMutationVariables>;
export const UnlinkGoalFamilyMemberDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"UnlinkGoalFamilyMember"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"id"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"Int"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"unlinkGoalFamilyMember"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"id"},"value":{"kind":"Variable","name":{"kind":"Name","value":"id"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"familyMemberId"}},{"kind":"Field","name":{"kind":"Name","value":"familyMember"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"firstName"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"relationship"}}]}}]}}]}}]} as unknown as DocumentNode<UnlinkGoalFamilyMemberMutation, UnlinkGoalFamilyMemberMutationVariables>;
export const UnlinkIssuesDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"UnlinkIssues"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"issueId"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"Int"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"linkedIssueId"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"Int"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"unlinkIssues"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"issueId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"issueId"}}},{"kind":"Argument","name":{"kind":"Name","value":"linkedIssueId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"linkedIssueId"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"success"}}]}}]}}]} as unknown as DocumentNode<UnlinkIssuesMutation, UnlinkIssuesMutationVariables>;
export const UnlockVaultDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"UnlockVault"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"pin"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"unlockVault"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"pin"},"value":{"kind":"Variable","name":{"kind":"Name","value":"pin"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"success"}},{"kind":"Field","name":{"kind":"Name","value":"unlocked"}},{"kind":"Field","name":{"kind":"Name","value":"message"}}]}}]}}]} as unknown as DocumentNode<UnlockVaultMutation, UnlockVaultMutationVariables>;
export const UnshareFamilyMemberDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"UnshareFamilyMember"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"familyMemberId"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"Int"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"email"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"unshareFamilyMember"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"familyMemberId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"familyMemberId"}}},{"kind":"Argument","name":{"kind":"Name","value":"email"},"value":{"kind":"Variable","name":{"kind":"Name","value":"email"}}}]}]}}]} as unknown as DocumentNode<UnshareFamilyMemberMutation, UnshareFamilyMemberMutationVariables>;
export const UpdateAffirmationDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"UpdateAffirmation"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"id"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"Int"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"input"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"UpdateAffirmationInput"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"updateAffirmation"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"id"},"value":{"kind":"Variable","name":{"kind":"Name","value":"id"}}},{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"Variable","name":{"kind":"Name","value":"input"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"familyMemberId"}},{"kind":"Field","name":{"kind":"Name","value":"text"}},{"kind":"Field","name":{"kind":"Name","value":"category"}},{"kind":"Field","name":{"kind":"Name","value":"isActive"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}}]}}]}}]} as unknown as DocumentNode<UpdateAffirmationMutation, UpdateAffirmationMutationVariables>;
export const UpdateBehaviorObservationDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"UpdateBehaviorObservation"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"id"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"Int"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"input"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"UpdateBehaviorObservationInput"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"updateBehaviorObservation"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"id"},"value":{"kind":"Variable","name":{"kind":"Name","value":"id"}}},{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"Variable","name":{"kind":"Name","value":"input"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"familyMemberId"}},{"kind":"Field","name":{"kind":"Name","value":"goalId"}},{"kind":"Field","name":{"kind":"Name","value":"createdBy"}},{"kind":"Field","name":{"kind":"Name","value":"observedAt"}},{"kind":"Field","name":{"kind":"Name","value":"observationType"}},{"kind":"Field","name":{"kind":"Name","value":"frequency"}},{"kind":"Field","name":{"kind":"Name","value":"intensity"}},{"kind":"Field","name":{"kind":"Name","value":"context"}},{"kind":"Field","name":{"kind":"Name","value":"notes"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}}]}}]}}]} as unknown as DocumentNode<UpdateBehaviorObservationMutation, UpdateBehaviorObservationMutationVariables>;
export const UpdateContactDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"UpdateContact"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"id"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"Int"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"input"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"UpdateContactInput"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"updateContact"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"id"},"value":{"kind":"Variable","name":{"kind":"Name","value":"id"}}},{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"Variable","name":{"kind":"Name","value":"input"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"createdBy"}},{"kind":"Field","name":{"kind":"Name","value":"slug"}},{"kind":"Field","name":{"kind":"Name","value":"firstName"}},{"kind":"Field","name":{"kind":"Name","value":"lastName"}},{"kind":"Field","name":{"kind":"Name","value":"description"}},{"kind":"Field","name":{"kind":"Name","value":"role"}},{"kind":"Field","name":{"kind":"Name","value":"ageYears"}},{"kind":"Field","name":{"kind":"Name","value":"notes"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}}]}}]}}]} as unknown as DocumentNode<UpdateContactMutation, UpdateContactMutationVariables>;
export const UpdateContactFeedbackDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"UpdateContactFeedback"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"id"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"Int"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"input"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"UpdateContactFeedbackInput"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"updateContactFeedback"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"id"},"value":{"kind":"Variable","name":{"kind":"Name","value":"id"}}},{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"Variable","name":{"kind":"Name","value":"input"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"contactId"}},{"kind":"Field","name":{"kind":"Name","value":"familyMemberId"}},{"kind":"Field","name":{"kind":"Name","value":"createdBy"}},{"kind":"Field","name":{"kind":"Name","value":"subject"}},{"kind":"Field","name":{"kind":"Name","value":"feedbackDate"}},{"kind":"Field","name":{"kind":"Name","value":"content"}},{"kind":"Field","name":{"kind":"Name","value":"tags"}},{"kind":"Field","name":{"kind":"Name","value":"source"}},{"kind":"Field","name":{"kind":"Name","value":"extracted"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}}]}}]}}]} as unknown as DocumentNode<UpdateContactFeedbackMutation, UpdateContactFeedbackMutationVariables>;
export const UpdateFamilyMemberDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"UpdateFamilyMember"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"id"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"Int"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"input"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"UpdateFamilyMemberInput"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"updateFamilyMember"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"id"},"value":{"kind":"Variable","name":{"kind":"Name","value":"id"}}},{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"Variable","name":{"kind":"Name","value":"input"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"firstName"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"relationship"}},{"kind":"Field","name":{"kind":"Name","value":"email"}},{"kind":"Field","name":{"kind":"Name","value":"phone"}},{"kind":"Field","name":{"kind":"Name","value":"location"}},{"kind":"Field","name":{"kind":"Name","value":"occupation"}},{"kind":"Field","name":{"kind":"Name","value":"ageYears"}},{"kind":"Field","name":{"kind":"Name","value":"dateOfBirth"}},{"kind":"Field","name":{"kind":"Name","value":"bio"}},{"kind":"Field","name":{"kind":"Name","value":"allergies"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}}]}}]}}]} as unknown as DocumentNode<UpdateFamilyMemberMutation, UpdateFamilyMemberMutationVariables>;
export const UpdateGameDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"UpdateGame"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"id"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"Int"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"input"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"UpdateGameInput"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"updateGame"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"id"},"value":{"kind":"Variable","name":{"kind":"Name","value":"id"}}},{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"Variable","name":{"kind":"Name","value":"input"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"title"}},{"kind":"Field","name":{"kind":"Name","value":"description"}},{"kind":"Field","name":{"kind":"Name","value":"content"}},{"kind":"Field","name":{"kind":"Name","value":"language"}},{"kind":"Field","name":{"kind":"Name","value":"estimatedMinutes"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}}]}}]}}]} as unknown as DocumentNode<UpdateGameMutation, UpdateGameMutationVariables>;
export const UpdateGoalDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"UpdateGoal"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"id"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"Int"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"input"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"UpdateGoalInput"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"updateGoal"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"id"},"value":{"kind":"Variable","name":{"kind":"Name","value":"id"}}},{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"Variable","name":{"kind":"Name","value":"input"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"slug"}},{"kind":"Field","name":{"kind":"Name","value":"title"}},{"kind":"Field","name":{"kind":"Name","value":"description"}},{"kind":"Field","name":{"kind":"Name","value":"status"}},{"kind":"Field","name":{"kind":"Name","value":"tags"}},{"kind":"Field","name":{"kind":"Name","value":"familyMemberId"}},{"kind":"Field","name":{"kind":"Name","value":"familyMember"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"firstName"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"relationship"}}]}},{"kind":"Field","name":{"kind":"Name","value":"storyLanguage"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}}]}}]}}]} as unknown as DocumentNode<UpdateGoalMutation, UpdateGoalMutationVariables>;
export const UpdateHabitDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"UpdateHabit"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"id"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"Int"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"input"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"UpdateHabitInput"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"updateHabit"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"id"},"value":{"kind":"Variable","name":{"kind":"Name","value":"id"}}},{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"Variable","name":{"kind":"Name","value":"input"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"title"}},{"kind":"Field","name":{"kind":"Name","value":"description"}},{"kind":"Field","name":{"kind":"Name","value":"frequency"}},{"kind":"Field","name":{"kind":"Name","value":"targetCount"}},{"kind":"Field","name":{"kind":"Name","value":"status"}},{"kind":"Field","name":{"kind":"Name","value":"goalId"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}}]}}]}}]} as unknown as DocumentNode<UpdateHabitMutation, UpdateHabitMutationVariables>;
export const UpdateIssueDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"UpdateIssue"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"id"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"Int"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"input"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"UpdateIssueInput"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"updateIssue"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"id"},"value":{"kind":"Variable","name":{"kind":"Name","value":"id"}}},{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"Variable","name":{"kind":"Name","value":"input"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"feedbackId"}},{"kind":"Field","name":{"kind":"Name","value":"familyMemberId"}},{"kind":"Field","name":{"kind":"Name","value":"relatedFamilyMemberId"}},{"kind":"Field","name":{"kind":"Name","value":"createdBy"}},{"kind":"Field","name":{"kind":"Name","value":"title"}},{"kind":"Field","name":{"kind":"Name","value":"description"}},{"kind":"Field","name":{"kind":"Name","value":"category"}},{"kind":"Field","name":{"kind":"Name","value":"severity"}},{"kind":"Field","name":{"kind":"Name","value":"recommendations"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}}]}}]}}]} as unknown as DocumentNode<UpdateIssueMutation, UpdateIssueMutationVariables>;
export const UpdateJournalEntryDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"UpdateJournalEntry"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"id"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"Int"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"input"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"UpdateJournalEntryInput"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"updateJournalEntry"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"id"},"value":{"kind":"Variable","name":{"kind":"Name","value":"id"}}},{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"Variable","name":{"kind":"Name","value":"input"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"createdBy"}},{"kind":"Field","name":{"kind":"Name","value":"familyMemberId"}},{"kind":"Field","name":{"kind":"Name","value":"title"}},{"kind":"Field","name":{"kind":"Name","value":"content"}},{"kind":"Field","name":{"kind":"Name","value":"mood"}},{"kind":"Field","name":{"kind":"Name","value":"moodScore"}},{"kind":"Field","name":{"kind":"Name","value":"tags"}},{"kind":"Field","name":{"kind":"Name","value":"goalId"}},{"kind":"Field","name":{"kind":"Name","value":"isPrivate"}},{"kind":"Field","name":{"kind":"Name","value":"entryDate"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}}]}}]}}]} as unknown as DocumentNode<UpdateJournalEntryMutation, UpdateJournalEntryMutationVariables>;
export const UpdateNoteDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"UpdateNote"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"id"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"Int"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"input"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"UpdateNoteInput"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"updateNote"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"id"},"value":{"kind":"Variable","name":{"kind":"Name","value":"id"}}},{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"Variable","name":{"kind":"Name","value":"input"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"slug"}},{"kind":"Field","name":{"kind":"Name","value":"title"}},{"kind":"Field","name":{"kind":"Name","value":"entityId"}},{"kind":"Field","name":{"kind":"Name","value":"entityType"}},{"kind":"Field","name":{"kind":"Name","value":"createdBy"}},{"kind":"Field","name":{"kind":"Name","value":"noteType"}},{"kind":"Field","name":{"kind":"Name","value":"content"}},{"kind":"Field","name":{"kind":"Name","value":"tags"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}}]}}]}}]} as unknown as DocumentNode<UpdateNoteMutation, UpdateNoteMutationVariables>;
export const UpdateProtocolStatusDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"UpdateProtocolStatus"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"id"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"status"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"updateProtocolStatus"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"id"},"value":{"kind":"Variable","name":{"kind":"Name","value":"id"}}},{"kind":"Argument","name":{"kind":"Name","value":"status"},"value":{"kind":"Variable","name":{"kind":"Name","value":"status"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"status"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}}]}}]}}]} as unknown as DocumentNode<UpdateProtocolStatusMutation, UpdateProtocolStatusMutationVariables>;
export const UpdateRelationshipDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"UpdateRelationship"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"id"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"Int"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"input"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"UpdateRelationshipInput"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"updateRelationship"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"id"},"value":{"kind":"Variable","name":{"kind":"Name","value":"id"}}},{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"Variable","name":{"kind":"Name","value":"input"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"createdBy"}},{"kind":"Field","name":{"kind":"Name","value":"subjectType"}},{"kind":"Field","name":{"kind":"Name","value":"subjectId"}},{"kind":"Field","name":{"kind":"Name","value":"relatedType"}},{"kind":"Field","name":{"kind":"Name","value":"relatedId"}},{"kind":"Field","name":{"kind":"Name","value":"relationshipType"}},{"kind":"Field","name":{"kind":"Name","value":"context"}},{"kind":"Field","name":{"kind":"Name","value":"startDate"}},{"kind":"Field","name":{"kind":"Name","value":"status"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}}]}}]}}]} as unknown as DocumentNode<UpdateRelationshipMutation, UpdateRelationshipMutationVariables>;
export const UpdateStoryDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"UpdateStory"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"id"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"Int"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"input"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"UpdateStoryInput"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"updateStory"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"id"},"value":{"kind":"Variable","name":{"kind":"Name","value":"id"}}},{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"Variable","name":{"kind":"Name","value":"input"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"goalId"}},{"kind":"Field","name":{"kind":"Name","value":"createdBy"}},{"kind":"Field","name":{"kind":"Name","value":"content"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}}]}}]}}]} as unknown as DocumentNode<UpdateStoryMutation, UpdateStoryMutationVariables>;
export const UpdateTeacherFeedbackDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"UpdateTeacherFeedback"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"id"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"Int"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"input"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"UpdateTeacherFeedbackInput"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"updateTeacherFeedback"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"id"},"value":{"kind":"Variable","name":{"kind":"Name","value":"id"}}},{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"Variable","name":{"kind":"Name","value":"input"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"familyMemberId"}},{"kind":"Field","name":{"kind":"Name","value":"createdBy"}},{"kind":"Field","name":{"kind":"Name","value":"teacherName"}},{"kind":"Field","name":{"kind":"Name","value":"subject"}},{"kind":"Field","name":{"kind":"Name","value":"feedbackDate"}},{"kind":"Field","name":{"kind":"Name","value":"content"}},{"kind":"Field","name":{"kind":"Name","value":"tags"}},{"kind":"Field","name":{"kind":"Name","value":"source"}},{"kind":"Field","name":{"kind":"Name","value":"extracted"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}}]}}]}}]} as unknown as DocumentNode<UpdateTeacherFeedbackMutation, UpdateTeacherFeedbackMutationVariables>;
export const GetUserSettingsDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"GetUserSettings"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"userSettings"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"userId"}},{"kind":"Field","name":{"kind":"Name","value":"storyLanguage"}},{"kind":"Field","name":{"kind":"Name","value":"storyMinutes"}}]}}]}}]} as unknown as DocumentNode<GetUserSettingsQuery, GetUserSettingsQueryVariables>;
export const UpdateUserSettingsDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"UpdateUserSettings"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"storyLanguage"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"storyMinutes"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"Int"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"updateUserSettings"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"storyLanguage"},"value":{"kind":"Variable","name":{"kind":"Name","value":"storyLanguage"}}},{"kind":"Argument","name":{"kind":"Name","value":"storyMinutes"},"value":{"kind":"Variable","name":{"kind":"Name","value":"storyMinutes"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"userId"}},{"kind":"Field","name":{"kind":"Name","value":"storyLanguage"}},{"kind":"Field","name":{"kind":"Name","value":"storyMinutes"}}]}}]}}]} as unknown as DocumentNode<UpdateUserSettingsMutation, UpdateUserSettingsMutationVariables>;
export const VaultStatusDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"VaultStatus"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"vaultStatus"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"unlocked"}},{"kind":"Field","name":{"kind":"Name","value":"available"}}]}}]}}]} as unknown as DocumentNode<VaultStatusQuery, VaultStatusQueryVariables>;