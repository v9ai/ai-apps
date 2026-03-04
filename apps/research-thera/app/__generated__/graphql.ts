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
  characteristicId?: Maybe<Scalars['Int']['output']>;
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

export enum CharacteristicCategory {
  PriorityConcern = 'PRIORITY_CONCERN',
  Strength = 'STRENGTH',
  SupportNeed = 'SUPPORT_NEED'
}

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

export enum ClaimVerdict {
  Contradicted = 'CONTRADICTED',
  Insufficient = 'INSUFFICIENT',
  Mixed = 'MIXED',
  Supported = 'SUPPORTED',
  Unverified = 'UNVERIFIED'
}

export type Contact = {
  __typename?: 'Contact';
  ageYears?: Maybe<Scalars['Int']['output']>;
  createdAt: Scalars['String']['output'];
  createdBy: Scalars['String']['output'];
  firstName: Scalars['String']['output'];
  id: Scalars['Int']['output'];
  lastName?: Maybe<Scalars['String']['output']>;
  notes?: Maybe<Scalars['String']['output']>;
  role?: Maybe<Scalars['String']['output']>;
  updatedAt: Scalars['String']['output'];
};

export type CreateBehaviorObservationInput = {
  characteristicId?: InputMaybe<Scalars['Int']['input']>;
  context?: InputMaybe<Scalars['String']['input']>;
  familyMemberId: Scalars['Int']['input'];
  frequency?: InputMaybe<Scalars['Int']['input']>;
  goalId?: InputMaybe<Scalars['Int']['input']>;
  intensity?: InputMaybe<BehaviorIntensity>;
  notes?: InputMaybe<Scalars['String']['input']>;
  observationType: BehaviorObservationType;
  observedAt: Scalars['String']['input'];
};

export type CreateContactInput = {
  ageYears?: InputMaybe<Scalars['Int']['input']>;
  firstName: Scalars['String']['input'];
  lastName?: InputMaybe<Scalars['String']['input']>;
  notes?: InputMaybe<Scalars['String']['input']>;
  role?: InputMaybe<Scalars['String']['input']>;
};

export type CreateFamilyMemberCharacteristicInput = {
  ageOfOnset?: InputMaybe<Scalars['Int']['input']>;
  category: CharacteristicCategory;
  description?: InputMaybe<Scalars['String']['input']>;
  durationWeeks?: InputMaybe<Scalars['Int']['input']>;
  externalizedName?: InputMaybe<Scalars['String']['input']>;
  familyMemberId: Scalars['Int']['input'];
  formulationStatus?: InputMaybe<FormulationStatus>;
  frequencyPerWeek?: InputMaybe<Scalars['Int']['input']>;
  impairmentDomains?: InputMaybe<Array<ImpairmentDomain>>;
  riskTier?: InputMaybe<RiskTier>;
  severity?: InputMaybe<SeverityLevel>;
  strengths?: InputMaybe<Scalars['String']['input']>;
  title: Scalars['String']['input'];
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

export type CreateUniqueOutcomeInput = {
  characteristicId: Scalars['Int']['input'];
  description: Scalars['String']['input'];
  observedAt: Scalars['String']['input'];
};

export type DeleteBehaviorObservationResult = {
  __typename?: 'DeleteBehaviorObservationResult';
  message?: Maybe<Scalars['String']['output']>;
  success: Scalars['Boolean']['output'];
};

export type DeleteContactResult = {
  __typename?: 'DeleteContactResult';
  message?: Maybe<Scalars['String']['output']>;
  success: Scalars['Boolean']['output'];
};

export type DeleteFamilyMemberCharacteristicResult = {
  __typename?: 'DeleteFamilyMemberCharacteristicResult';
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

export type DeleteUniqueOutcomeResult = {
  __typename?: 'DeleteUniqueOutcomeResult';
  message?: Maybe<Scalars['String']['output']>;
  success: Scalars['Boolean']['output'];
};

export enum DevelopmentalTier {
  Adult = 'ADULT',
  EarlyAdolescence = 'EARLY_ADOLESCENCE',
  EarlyChildhood = 'EARLY_CHILDHOOD',
  LateAdolescence = 'LATE_ADOLESCENCE',
  MiddleChildhood = 'MIDDLE_CHILDHOOD'
}

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
  location?: Maybe<Scalars['String']['output']>;
  name?: Maybe<Scalars['String']['output']>;
  occupation?: Maybe<Scalars['String']['output']>;
  phone?: Maybe<Scalars['String']['output']>;
  relationship?: Maybe<Scalars['String']['output']>;
  shares: Array<FamilyMemberShare>;
  updatedAt: Scalars['String']['output'];
  userId: Scalars['String']['output'];
};


export type FamilyMemberBehaviorObservationsArgs = {
  goalId?: InputMaybe<Scalars['Int']['input']>;
};

export type FamilyMemberCharacteristic = {
  __typename?: 'FamilyMemberCharacteristic';
  ageOfOnset?: Maybe<Scalars['Int']['output']>;
  behaviorObservations: Array<BehaviorObservation>;
  category: CharacteristicCategory;
  createdAt: Scalars['String']['output'];
  createdBy: Scalars['String']['output'];
  description?: Maybe<Scalars['String']['output']>;
  durationWeeks?: Maybe<Scalars['Int']['output']>;
  externalizedName?: Maybe<Scalars['String']['output']>;
  familyMember?: Maybe<FamilyMember>;
  familyMemberId: Scalars['Int']['output'];
  formulationStatus: FormulationStatus;
  frequencyPerWeek?: Maybe<Scalars['Int']['output']>;
  id: Scalars['Int']['output'];
  impairmentDomains: Array<ImpairmentDomain>;
  riskTier: RiskTier;
  severity?: Maybe<SeverityLevel>;
  strengths?: Maybe<Scalars['String']['output']>;
  title: Scalars['String']['output'];
  uniqueOutcomes: Array<UniqueOutcome>;
  updatedAt: Scalars['String']['output'];
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
  Editor = 'EDITOR',
  Viewer = 'VIEWER'
}

export enum FormulationStatus {
  Assessed = 'ASSESSED',
  Draft = 'DRAFT',
  Formulated = 'FORMULATED'
}

export type GenerateAudioResult = {
  __typename?: 'GenerateAudioResult';
  audioUrl?: Maybe<Scalars['String']['output']>;
  jobId: Scalars['String']['output'];
  message?: Maybe<Scalars['String']['output']>;
  success: Scalars['Boolean']['output'];
};

export type GenerateLongFormTextResult = {
  __typename?: 'GenerateLongFormTextResult';
  audioUrl?: Maybe<Scalars['String']['output']>;
  jobId?: Maybe<Scalars['String']['output']>;
  manifestUrl?: Maybe<Scalars['String']['output']>;
  message?: Maybe<Scalars['String']['output']>;
  segmentUrls?: Maybe<Array<Scalars['String']['output']>>;
  storyId?: Maybe<Scalars['Int']['output']>;
  success: Scalars['Boolean']['output'];
  text?: Maybe<Scalars['String']['output']>;
};

export type GenerateOpenAiAudioInput = {
  goalStoryId?: InputMaybe<Scalars['Int']['input']>;
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
  goalId: Scalars['Int']['output'];
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
  familyMemberId: Scalars['Int']['output'];
  id: Scalars['Int']['output'];
  notes: Array<Note>;
  parentGoal?: Maybe<Goal>;
  parentGoalId?: Maybe<Scalars['Int']['output']>;
  questions: Array<TherapeuticQuestion>;
  research: Array<Research>;
  slug?: Maybe<Scalars['String']['output']>;
  status: Scalars['String']['output'];
  stories: Array<GoalStory>;
  storyLanguage?: Maybe<Scalars['String']['output']>;
  subGoals: Array<Goal>;
  therapeuticText?: Maybe<Scalars['String']['output']>;
  therapeuticTextGeneratedAt?: Maybe<Scalars['String']['output']>;
  therapeuticTextLanguage?: Maybe<Scalars['String']['output']>;
  title: Scalars['String']['output'];
  updatedAt: Scalars['String']['output'];
  userStories: Array<Story>;
};

export type GoalStory = {
  __typename?: 'GoalStory';
  audioAssets: Array<AudioAsset>;
  audioGeneratedAt?: Maybe<Scalars['String']['output']>;
  audioKey?: Maybe<Scalars['String']['output']>;
  audioUrl?: Maybe<Scalars['String']['output']>;
  createdAt: Scalars['String']['output'];
  goalId: Scalars['Int']['output'];
  id: Scalars['Int']['output'];
  language: Scalars['String']['output'];
  minutes: Scalars['Int']['output'];
  segments: Array<TextSegment>;
  text: Scalars['String']['output'];
  updatedAt: Scalars['String']['output'];
};

export enum ImpairmentDomain {
  Academic = 'ACADEMIC',
  Family = 'FAMILY',
  Peer = 'PEER',
  Safety = 'SAFETY',
  SelfCare = 'SELF_CARE'
}

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
  manifestUrl?: Maybe<Scalars['String']['output']>;
  questions?: Maybe<Array<TherapeuticQuestion>>;
  segmentUrls?: Maybe<Array<Scalars['String']['output']>>;
  text?: Maybe<Scalars['String']['output']>;
};

export enum JobStatus {
  Failed = 'FAILED',
  Running = 'RUNNING',
  Succeeded = 'SUCCEEDED'
}

export enum JobType {
  Audio = 'AUDIO',
  Longform = 'LONGFORM',
  Questions = 'QUESTIONS',
  Research = 'RESEARCH'
}

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
  createBehaviorObservation: BehaviorObservation;
  createContact: Contact;
  createFamilyMember: FamilyMember;
  createFamilyMemberCharacteristic: FamilyMemberCharacteristic;
  createGoal: Goal;
  createJournalEntry: JournalEntry;
  createNote: Note;
  createRelationship: Relationship;
  createStory: Story;
  createSubGoal: Goal;
  createUniqueOutcome: UniqueOutcome;
  deleteBehaviorObservation: DeleteBehaviorObservationResult;
  deleteClaimCard: Scalars['Boolean']['output'];
  deleteContact: DeleteContactResult;
  deleteFamilyMember: DeleteFamilyMemberResult;
  deleteFamilyMemberCharacteristic: DeleteFamilyMemberCharacteristicResult;
  deleteGoal: DeleteGoalResult;
  deleteJournalEntry: DeleteJournalEntryResult;
  deleteNote: DeleteNoteResult;
  deleteRelationship: DeleteRelationshipResult;
  deleteResearch: DeleteResearchResult;
  deleteStory: DeleteStoryResult;
  deleteTherapeuticQuestions: DeleteQuestionsResult;
  deleteUniqueOutcome: DeleteUniqueOutcomeResult;
  generateAudio: GenerateAudioResult;
  generateLongFormText: GenerateLongFormTextResult;
  generateOpenAIAudio: GenerateOpenAiAudioResult;
  generateResearch: GenerateResearchResult;
  generateTherapeuticQuestions: GenerateQuestionsResult;
  refreshClaimCard: ClaimCard;
  setNoteVisibility: Note;
  shareFamilyMember: FamilyMemberShare;
  shareNote: NoteShare;
  unshareFamilyMember: Scalars['Boolean']['output'];
  unshareNote: Scalars['Boolean']['output'];
  updateBehaviorObservation: BehaviorObservation;
  updateContact: Contact;
  updateFamilyMember: FamilyMember;
  updateFamilyMemberCharacteristic: FamilyMemberCharacteristic;
  updateGoal: Goal;
  updateJournalEntry: JournalEntry;
  updateNote: Note;
  updateRelationship: Relationship;
  updateStory: Story;
  updateUniqueOutcome: UniqueOutcome;
  updateUserSettings: UserSettings;
};


export type MutationBuildClaimCardsArgs = {
  input: BuildClaimCardsInput;
};


export type MutationCheckNoteClaimsArgs = {
  input: CheckNoteClaimsInput;
};


export type MutationCreateBehaviorObservationArgs = {
  input: CreateBehaviorObservationInput;
};


export type MutationCreateContactArgs = {
  input: CreateContactInput;
};


export type MutationCreateFamilyMemberArgs = {
  input: CreateFamilyMemberInput;
};


export type MutationCreateFamilyMemberCharacteristicArgs = {
  input: CreateFamilyMemberCharacteristicInput;
};


export type MutationCreateGoalArgs = {
  input: CreateGoalInput;
};


export type MutationCreateJournalEntryArgs = {
  input: CreateJournalEntryInput;
};


export type MutationCreateNoteArgs = {
  input: CreateNoteInput;
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


export type MutationCreateUniqueOutcomeArgs = {
  input: CreateUniqueOutcomeInput;
};


export type MutationDeleteBehaviorObservationArgs = {
  id: Scalars['Int']['input'];
};


export type MutationDeleteClaimCardArgs = {
  id: Scalars['ID']['input'];
};


export type MutationDeleteContactArgs = {
  id: Scalars['Int']['input'];
};


export type MutationDeleteFamilyMemberArgs = {
  id: Scalars['Int']['input'];
};


export type MutationDeleteFamilyMemberCharacteristicArgs = {
  id: Scalars['Int']['input'];
};


export type MutationDeleteGoalArgs = {
  id: Scalars['Int']['input'];
};


export type MutationDeleteJournalEntryArgs = {
  id: Scalars['Int']['input'];
};


export type MutationDeleteNoteArgs = {
  id: Scalars['Int']['input'];
};


export type MutationDeleteRelationshipArgs = {
  id: Scalars['Int']['input'];
};


export type MutationDeleteResearchArgs = {
  goalId: Scalars['Int']['input'];
};


export type MutationDeleteStoryArgs = {
  id: Scalars['Int']['input'];
};


export type MutationDeleteTherapeuticQuestionsArgs = {
  goalId: Scalars['Int']['input'];
};


export type MutationDeleteUniqueOutcomeArgs = {
  id: Scalars['Int']['input'];
};


export type MutationGenerateAudioArgs = {
  goalId: Scalars['Int']['input'];
  language?: InputMaybe<Scalars['String']['input']>;
  storyId?: InputMaybe<Scalars['Int']['input']>;
  text?: InputMaybe<Scalars['String']['input']>;
  voice?: InputMaybe<Scalars['String']['input']>;
};


export type MutationGenerateLongFormTextArgs = {
  characteristicId?: InputMaybe<Scalars['Int']['input']>;
  goalId: Scalars['Int']['input'];
  language?: InputMaybe<Scalars['String']['input']>;
  minutes?: InputMaybe<Scalars['Int']['input']>;
};


export type MutationGenerateOpenAiAudioArgs = {
  input: GenerateOpenAiAudioInput;
};


export type MutationGenerateResearchArgs = {
  goalId: Scalars['Int']['input'];
};


export type MutationGenerateTherapeuticQuestionsArgs = {
  goalId: Scalars['Int']['input'];
};


export type MutationRefreshClaimCardArgs = {
  id: Scalars['ID']['input'];
};


export type MutationSetNoteVisibilityArgs = {
  noteId: Scalars['Int']['input'];
  visibility: NoteVisibility;
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


export type MutationUnshareFamilyMemberArgs = {
  email: Scalars['String']['input'];
  familyMemberId: Scalars['Int']['input'];
};


export type MutationUnshareNoteArgs = {
  email: Scalars['String']['input'];
  noteId: Scalars['Int']['input'];
};


export type MutationUpdateBehaviorObservationArgs = {
  id: Scalars['Int']['input'];
  input: UpdateBehaviorObservationInput;
};


export type MutationUpdateContactArgs = {
  id: Scalars['Int']['input'];
  input: UpdateContactInput;
};


export type MutationUpdateFamilyMemberArgs = {
  id: Scalars['Int']['input'];
  input: UpdateFamilyMemberInput;
};


export type MutationUpdateFamilyMemberCharacteristicArgs = {
  id: Scalars['Int']['input'];
  input: UpdateFamilyMemberCharacteristicInput;
};


export type MutationUpdateGoalArgs = {
  id: Scalars['Int']['input'];
  input: UpdateGoalInput;
};


export type MutationUpdateJournalEntryArgs = {
  id: Scalars['Int']['input'];
  input: UpdateJournalEntryInput;
};


export type MutationUpdateNoteArgs = {
  id: Scalars['Int']['input'];
  input: UpdateNoteInput;
};


export type MutationUpdateRelationshipArgs = {
  id: Scalars['Int']['input'];
  input: UpdateRelationshipInput;
};


export type MutationUpdateStoryArgs = {
  id: Scalars['Int']['input'];
  input: UpdateStoryInput;
};


export type MutationUpdateUniqueOutcomeArgs = {
  id: Scalars['Int']['input'];
  input: UpdateUniqueOutcomeInput;
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

export enum PersonType {
  Contact = 'CONTACT',
  FamilyMember = 'FAMILY_MEMBER'
}

export type Query = {
  __typename?: 'Query';
  allNotes: Array<Note>;
  allStories: Array<Story>;
  audioFromR2?: Maybe<AudioFromR2Result>;
  behaviorObservation?: Maybe<BehaviorObservation>;
  behaviorObservations: Array<BehaviorObservation>;
  claimCard?: Maybe<ClaimCard>;
  claimCardsForNote: Array<ClaimCard>;
  contact?: Maybe<Contact>;
  contacts: Array<Contact>;
  familyMember?: Maybe<FamilyMember>;
  familyMemberCharacteristic?: Maybe<FamilyMemberCharacteristic>;
  familyMemberCharacteristics: Array<FamilyMemberCharacteristic>;
  familyMembers: Array<FamilyMember>;
  generationJob?: Maybe<GenerationJob>;
  generationJobs: Array<GenerationJob>;
  goal?: Maybe<Goal>;
  goalStory?: Maybe<GoalStory>;
  goals: Array<Goal>;
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
  therapeuticQuestions: Array<TherapeuticQuestion>;
  userSettings: UserSettings;
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


export type QueryContactArgs = {
  id: Scalars['Int']['input'];
};


export type QueryFamilyMemberArgs = {
  id: Scalars['Int']['input'];
};


export type QueryFamilyMemberCharacteristicArgs = {
  id: Scalars['Int']['input'];
};


export type QueryFamilyMemberCharacteristicsArgs = {
  category?: InputMaybe<CharacteristicCategory>;
  familyMemberId: Scalars['Int']['input'];
};


export type QueryGenerationJobArgs = {
  id: Scalars['String']['input'];
};


export type QueryGenerationJobsArgs = {
  goalId?: InputMaybe<Scalars['Int']['input']>;
  status?: InputMaybe<Scalars['String']['input']>;
};


export type QueryGoalArgs = {
  id?: InputMaybe<Scalars['Int']['input']>;
  slug?: InputMaybe<Scalars['String']['input']>;
};


export type QueryGoalStoryArgs = {
  id: Scalars['Int']['input'];
};


export type QueryGoalsArgs = {
  familyMemberId?: InputMaybe<Scalars['Int']['input']>;
  status?: InputMaybe<Scalars['String']['input']>;
};


export type QueryJournalEntriesArgs = {
  familyMemberId?: InputMaybe<Scalars['Int']['input']>;
  fromDate?: InputMaybe<Scalars['String']['input']>;
  goalId?: InputMaybe<Scalars['Int']['input']>;
  mood?: InputMaybe<Scalars['String']['input']>;
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


export type QueryRelationshipArgs = {
  id: Scalars['Int']['input'];
};


export type QueryRelationshipsArgs = {
  subjectId: Scalars['Int']['input'];
  subjectType: PersonType;
};


export type QueryResearchArgs = {
  goalId: Scalars['Int']['input'];
};


export type QueryStoriesArgs = {
  goalId: Scalars['Int']['input'];
};


export type QueryStoryArgs = {
  id: Scalars['Int']['input'];
};


export type QueryTherapeuticQuestionsArgs = {
  goalId: Scalars['Int']['input'];
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
  goal?: Maybe<Goal>;
  goalId: Scalars['Int']['output'];
  id: Scalars['Int']['output'];
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

export enum ResearchSource {
  Arxiv = 'ARXIV',
  Crossref = 'CROSSREF',
  Datacite = 'DATACITE',
  Europepmc = 'EUROPEPMC',
  Openalex = 'OPENALEX',
  Pubmed = 'PUBMED',
  SemanticScholar = 'SEMANTIC_SCHOLAR'
}

export enum RiskTier {
  Concern = 'CONCERN',
  None = 'NONE',
  SafeguardingAlert = 'SAFEGUARDING_ALERT',
  Watch = 'WATCH'
}

export enum SeverityLevel {
  Mild = 'MILD',
  Moderate = 'MODERATE',
  Profound = 'PROFOUND',
  Severe = 'SEVERE'
}

export type Story = {
  __typename?: 'Story';
  audioGeneratedAt?: Maybe<Scalars['String']['output']>;
  audioKey?: Maybe<Scalars['String']['output']>;
  audioUrl?: Maybe<Scalars['String']['output']>;
  content: Scalars['String']['output'];
  createdAt: Scalars['String']['output'];
  createdBy: Scalars['String']['output'];
  goal?: Maybe<Goal>;
  goalId: Scalars['Int']['output'];
  id: Scalars['Int']['output'];
  updatedAt: Scalars['String']['output'];
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
  goalId: Scalars['Int']['output'];
  id: Scalars['Int']['output'];
  question: Scalars['String']['output'];
  rationale: Scalars['String']['output'];
  researchId?: Maybe<Scalars['Int']['output']>;
  researchTitle?: Maybe<Scalars['String']['output']>;
  updatedAt: Scalars['String']['output'];
};

export type UniqueOutcome = {
  __typename?: 'UniqueOutcome';
  characteristicId: Scalars['Int']['output'];
  createdAt: Scalars['String']['output'];
  createdBy: Scalars['String']['output'];
  description: Scalars['String']['output'];
  id: Scalars['Int']['output'];
  observedAt: Scalars['String']['output'];
  updatedAt: Scalars['String']['output'];
};

export type UpdateBehaviorObservationInput = {
  context?: InputMaybe<Scalars['String']['input']>;
  frequency?: InputMaybe<Scalars['Int']['input']>;
  intensity?: InputMaybe<BehaviorIntensity>;
  notes?: InputMaybe<Scalars['String']['input']>;
  observationType?: InputMaybe<BehaviorObservationType>;
  observedAt?: InputMaybe<Scalars['String']['input']>;
};

export type UpdateContactInput = {
  ageYears?: InputMaybe<Scalars['Int']['input']>;
  firstName?: InputMaybe<Scalars['String']['input']>;
  lastName?: InputMaybe<Scalars['String']['input']>;
  notes?: InputMaybe<Scalars['String']['input']>;
  role?: InputMaybe<Scalars['String']['input']>;
};

export type UpdateFamilyMemberCharacteristicInput = {
  ageOfOnset?: InputMaybe<Scalars['Int']['input']>;
  category?: InputMaybe<CharacteristicCategory>;
  description?: InputMaybe<Scalars['String']['input']>;
  durationWeeks?: InputMaybe<Scalars['Int']['input']>;
  externalizedName?: InputMaybe<Scalars['String']['input']>;
  formulationStatus?: InputMaybe<FormulationStatus>;
  frequencyPerWeek?: InputMaybe<Scalars['Int']['input']>;
  impairmentDomains?: InputMaybe<Array<ImpairmentDomain>>;
  riskTier?: InputMaybe<RiskTier>;
  severity?: InputMaybe<SeverityLevel>;
  strengths?: InputMaybe<Scalars['String']['input']>;
  title?: InputMaybe<Scalars['String']['input']>;
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
  status?: InputMaybe<Scalars['String']['input']>;
  storyLanguage?: InputMaybe<Scalars['String']['input']>;
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

export type UpdateUniqueOutcomeInput = {
  description?: InputMaybe<Scalars['String']['input']>;
  observedAt?: InputMaybe<Scalars['String']['input']>;
};

export type UserSettings = {
  __typename?: 'UserSettings';
  storyLanguage: Scalars['String']['output'];
  storyMinutes: Scalars['Int']['output'];
  userId: Scalars['String']['output'];
};

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

export type CreateBehaviorObservationMutationVariables = Exact<{
  input: CreateBehaviorObservationInput;
}>;


export type CreateBehaviorObservationMutation = { __typename?: 'Mutation', createBehaviorObservation: { __typename?: 'BehaviorObservation', id: number, familyMemberId: number, goalId?: number | null, createdBy: string, observedAt: string, observationType: BehaviorObservationType, frequency?: number | null, intensity?: BehaviorIntensity | null, context?: string | null, notes?: string | null, createdAt: string, updatedAt: string } };

export type CreateContactMutationVariables = Exact<{
  input: CreateContactInput;
}>;


export type CreateContactMutation = { __typename?: 'Mutation', createContact: { __typename?: 'Contact', id: number, createdBy: string, firstName: string, lastName?: string | null, role?: string | null, ageYears?: number | null, notes?: string | null, createdAt: string, updatedAt: string } };

export type CreateFamilyMemberMutationVariables = Exact<{
  input: CreateFamilyMemberInput;
}>;


export type CreateFamilyMemberMutation = { __typename?: 'Mutation', createFamilyMember: { __typename?: 'FamilyMember', id: number, firstName: string, name?: string | null, relationship?: string | null, email?: string | null, phone?: string | null, location?: string | null, occupation?: string | null, ageYears?: number | null, dateOfBirth?: string | null, bio?: string | null, createdAt: string, updatedAt: string } };

export type CreateFamilyMemberCharacteristicMutationVariables = Exact<{
  input: CreateFamilyMemberCharacteristicInput;
}>;


export type CreateFamilyMemberCharacteristicMutation = { __typename?: 'Mutation', createFamilyMemberCharacteristic: { __typename?: 'FamilyMemberCharacteristic', id: number, familyMemberId: number, createdBy: string, category: CharacteristicCategory, title: string, description?: string | null, severity?: SeverityLevel | null, frequencyPerWeek?: number | null, durationWeeks?: number | null, ageOfOnset?: number | null, impairmentDomains: Array<ImpairmentDomain>, formulationStatus: FormulationStatus, externalizedName?: string | null, strengths?: string | null, riskTier: RiskTier, createdAt: string, updatedAt: string } };

export type CreateGoalMutationVariables = Exact<{
  input: CreateGoalInput;
}>;


export type CreateGoalMutation = { __typename?: 'Mutation', createGoal: { __typename?: 'Goal', id: number, slug?: string | null, title: string, description?: string | null, status: string, createdAt: string, updatedAt: string, familyMemberId: number } };

export type CreateJournalEntryMutationVariables = Exact<{
  input: CreateJournalEntryInput;
}>;


export type CreateJournalEntryMutation = { __typename?: 'Mutation', createJournalEntry: { __typename?: 'JournalEntry', id: number, createdBy: string, familyMemberId?: number | null, title?: string | null, content: string, mood?: string | null, moodScore?: number | null, tags?: Array<string> | null, goalId?: number | null, isPrivate: boolean, entryDate: string, createdAt: string, updatedAt: string } };

export type CreateNoteMutationVariables = Exact<{
  input: CreateNoteInput;
}>;


export type CreateNoteMutation = { __typename?: 'Mutation', createNote: { __typename?: 'Note', id: number, entityId: number, entityType: string, createdBy: string, noteType?: string | null, slug?: string | null, content: string, tags?: Array<string> | null, createdAt: string, updatedAt: string } };

export type CreateRelationshipMutationVariables = Exact<{
  input: CreateRelationshipInput;
}>;


export type CreateRelationshipMutation = { __typename?: 'Mutation', createRelationship: { __typename?: 'Relationship', id: number, createdBy: string, subjectType: PersonType, subjectId: number, relatedType: PersonType, relatedId: number, relationshipType: string, context?: string | null, startDate?: string | null, status: RelationshipStatus, createdAt: string, updatedAt: string } };

export type CreateStoryMutationVariables = Exact<{
  input: CreateStoryInput;
}>;


export type CreateStoryMutation = { __typename?: 'Mutation', createStory: { __typename?: 'Story', id: number, goalId: number, createdBy: string, content: string, createdAt: string, updatedAt: string } };

export type CreateSubGoalMutationVariables = Exact<{
  goalId: Scalars['Int']['input'];
  input: CreateSubGoalInput;
}>;


export type CreateSubGoalMutation = { __typename?: 'Mutation', createSubGoal: { __typename?: 'Goal', id: number, slug?: string | null, title: string, description?: string | null, status: string, parentGoalId?: number | null, createdAt: string, updatedAt: string, familyMemberId: number } };

export type CreateUniqueOutcomeMutationVariables = Exact<{
  input: CreateUniqueOutcomeInput;
}>;


export type CreateUniqueOutcomeMutation = { __typename?: 'Mutation', createUniqueOutcome: { __typename?: 'UniqueOutcome', id: number, characteristicId: number, createdBy: string, observedAt: string, description: string, createdAt: string, updatedAt: string } };

export type DeleteBehaviorObservationMutationVariables = Exact<{
  id: Scalars['Int']['input'];
}>;


export type DeleteBehaviorObservationMutation = { __typename?: 'Mutation', deleteBehaviorObservation: { __typename?: 'DeleteBehaviorObservationResult', success: boolean, message?: string | null } };

export type DeleteContactMutationVariables = Exact<{
  id: Scalars['Int']['input'];
}>;


export type DeleteContactMutation = { __typename?: 'Mutation', deleteContact: { __typename?: 'DeleteContactResult', success: boolean, message?: string | null } };

export type DeleteFamilyMemberMutationVariables = Exact<{
  id: Scalars['Int']['input'];
}>;


export type DeleteFamilyMemberMutation = { __typename?: 'Mutation', deleteFamilyMember: { __typename?: 'DeleteFamilyMemberResult', success: boolean, message?: string | null } };

export type DeleteFamilyMemberCharacteristicMutationVariables = Exact<{
  id: Scalars['Int']['input'];
}>;


export type DeleteFamilyMemberCharacteristicMutation = { __typename?: 'Mutation', deleteFamilyMemberCharacteristic: { __typename?: 'DeleteFamilyMemberCharacteristicResult', success: boolean, message?: string | null } };

export type DeleteGoalMutationVariables = Exact<{
  id: Scalars['Int']['input'];
}>;


export type DeleteGoalMutation = { __typename?: 'Mutation', deleteGoal: { __typename?: 'DeleteGoalResult', success: boolean, message?: string | null } };

export type DeleteJournalEntryMutationVariables = Exact<{
  id: Scalars['Int']['input'];
}>;


export type DeleteJournalEntryMutation = { __typename?: 'Mutation', deleteJournalEntry: { __typename?: 'DeleteJournalEntryResult', success: boolean, message?: string | null } };

export type DeleteNoteMutationVariables = Exact<{
  id: Scalars['Int']['input'];
}>;


export type DeleteNoteMutation = { __typename?: 'Mutation', deleteNote: { __typename?: 'DeleteNoteResult', success: boolean, message?: string | null } };

export type DeleteRelationshipMutationVariables = Exact<{
  id: Scalars['Int']['input'];
}>;


export type DeleteRelationshipMutation = { __typename?: 'Mutation', deleteRelationship: { __typename?: 'DeleteRelationshipResult', success: boolean, message?: string | null } };

export type DeleteResearchMutationVariables = Exact<{
  goalId: Scalars['Int']['input'];
}>;


export type DeleteResearchMutation = { __typename?: 'Mutation', deleteResearch: { __typename?: 'DeleteResearchResult', success: boolean, message?: string | null, deletedCount: number } };

export type DeleteStoryMutationVariables = Exact<{
  id: Scalars['Int']['input'];
}>;


export type DeleteStoryMutation = { __typename?: 'Mutation', deleteStory: { __typename?: 'DeleteStoryResult', success: boolean, message?: string | null } };

export type DeleteUniqueOutcomeMutationVariables = Exact<{
  id: Scalars['Int']['input'];
}>;


export type DeleteUniqueOutcomeMutation = { __typename?: 'Mutation', deleteUniqueOutcome: { __typename?: 'DeleteUniqueOutcomeResult', success: boolean, message?: string | null } };

export type GenerateAudioMutationVariables = Exact<{
  goalId: Scalars['Int']['input'];
  storyId?: InputMaybe<Scalars['Int']['input']>;
  text?: InputMaybe<Scalars['String']['input']>;
  language?: InputMaybe<Scalars['String']['input']>;
  voice?: InputMaybe<Scalars['String']['input']>;
}>;


export type GenerateAudioMutation = { __typename?: 'Mutation', generateAudio: { __typename?: 'GenerateAudioResult', success: boolean, message?: string | null, jobId: string, audioUrl?: string | null } };

export type GenerateLongFormTextMutationVariables = Exact<{
  goalId: Scalars['Int']['input'];
  characteristicId?: InputMaybe<Scalars['Int']['input']>;
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

export type GenerateResearchMutationVariables = Exact<{
  goalId: Scalars['Int']['input'];
}>;


export type GenerateResearchMutation = { __typename?: 'Mutation', generateResearch: { __typename?: 'GenerateResearchResult', success: boolean, message?: string | null, jobId?: string | null, count?: number | null } };

export type GetAllNotesQueryVariables = Exact<{ [key: string]: never; }>;


export type GetAllNotesQuery = { __typename?: 'Query', allNotes: Array<{ __typename?: 'Note', id: number, entityId: number, entityType: string, createdBy: string, noteType?: string | null, slug?: string | null, title?: string | null, content: string, tags?: Array<string> | null, createdAt: string, updatedAt: string, goal?: { __typename?: 'Goal', id: number, title: string, description?: string | null, status: string } | null }> };

export type GetAllStoriesQueryVariables = Exact<{ [key: string]: never; }>;


export type GetAllStoriesQuery = { __typename?: 'Query', allStories: Array<{ __typename?: 'Story', id: number, goalId: number, createdBy: string, content: string, audioKey?: string | null, audioUrl?: string | null, audioGeneratedAt?: string | null, createdAt: string, updatedAt: string, goal?: { __typename?: 'Goal', id: number, title: string, slug?: string | null } | null }> };

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

export type GetContactQueryVariables = Exact<{
  id: Scalars['Int']['input'];
}>;


export type GetContactQuery = { __typename?: 'Query', contact?: { __typename?: 'Contact', id: number, createdBy: string, firstName: string, lastName?: string | null, role?: string | null, ageYears?: number | null, notes?: string | null, createdAt: string, updatedAt: string } | null };

export type GetContactsQueryVariables = Exact<{ [key: string]: never; }>;


export type GetContactsQuery = { __typename?: 'Query', contacts: Array<{ __typename?: 'Contact', id: number, createdBy: string, firstName: string, lastName?: string | null, role?: string | null, ageYears?: number | null, notes?: string | null, createdAt: string, updatedAt: string }> };

export type GetFamilyMemberQueryVariables = Exact<{
  id: Scalars['Int']['input'];
}>;


export type GetFamilyMemberQuery = { __typename?: 'Query', familyMember?: { __typename?: 'FamilyMember', id: number, userId: string, firstName: string, name?: string | null, ageYears?: number | null, relationship?: string | null, email?: string | null, phone?: string | null, location?: string | null, occupation?: string | null, dateOfBirth?: string | null, bio?: string | null, createdAt: string, updatedAt: string, shares: Array<{ __typename?: 'FamilyMemberShare', familyMemberId: number, email: string, role: FamilyMemberShareRole, createdAt: string, createdBy: string }>, goals: Array<{ __typename?: 'Goal', id: number, title: string, status: string, description?: string | null, createdAt: string }>, behaviorObservations: Array<{ __typename?: 'BehaviorObservation', id: number, observedAt: string, observationType: BehaviorObservationType, frequency?: number | null, intensity?: BehaviorIntensity | null, context?: string | null, notes?: string | null, createdAt: string }> } | null };

export type GetFamilyMemberCharacteristicQueryVariables = Exact<{
  id: Scalars['Int']['input'];
}>;


export type GetFamilyMemberCharacteristicQuery = { __typename?: 'Query', familyMemberCharacteristic?: { __typename?: 'FamilyMemberCharacteristic', id: number, familyMemberId: number, createdBy: string, category: CharacteristicCategory, title: string, description?: string | null, severity?: SeverityLevel | null, frequencyPerWeek?: number | null, durationWeeks?: number | null, ageOfOnset?: number | null, impairmentDomains: Array<ImpairmentDomain>, formulationStatus: FormulationStatus, externalizedName?: string | null, strengths?: string | null, riskTier: RiskTier, createdAt: string, updatedAt: string, uniqueOutcomes: Array<{ __typename?: 'UniqueOutcome', id: number, characteristicId: number, createdBy: string, observedAt: string, description: string, createdAt: string, updatedAt: string }>, behaviorObservations: Array<{ __typename?: 'BehaviorObservation', id: number, familyMemberId: number, goalId?: number | null, characteristicId?: number | null, createdBy: string, observedAt: string, observationType: BehaviorObservationType, frequency?: number | null, intensity?: BehaviorIntensity | null, context?: string | null, notes?: string | null, createdAt: string, updatedAt: string }> } | null };

export type GetFamilyMemberCharacteristicsQueryVariables = Exact<{
  familyMemberId: Scalars['Int']['input'];
  category?: InputMaybe<CharacteristicCategory>;
}>;


export type GetFamilyMemberCharacteristicsQuery = { __typename?: 'Query', familyMemberCharacteristics: Array<{ __typename?: 'FamilyMemberCharacteristic', id: number, familyMemberId: number, createdBy: string, category: CharacteristicCategory, title: string, description?: string | null, createdAt: string, updatedAt: string }> };

export type GetFamilyMembersQueryVariables = Exact<{ [key: string]: never; }>;


export type GetFamilyMembersQuery = { __typename?: 'Query', familyMembers: Array<{ __typename?: 'FamilyMember', id: number, userId: string, firstName: string, name?: string | null, ageYears?: number | null, relationship?: string | null, email?: string | null, phone?: string | null, location?: string | null, occupation?: string | null, dateOfBirth?: string | null, bio?: string | null, createdAt: string, updatedAt: string, shares: Array<{ __typename?: 'FamilyMemberShare', familyMemberId: number, email: string, role: FamilyMemberShareRole, createdAt: string, createdBy: string }> }> };

export type GetGenerationJobQueryVariables = Exact<{
  id: Scalars['String']['input'];
}>;


export type GetGenerationJobQuery = { __typename?: 'Query', generationJob?: { __typename?: 'GenerationJob', id: string, status: JobStatus, progress: number, updatedAt: string, result?: { __typename?: 'JobResult', audioUrl?: string | null } | null, error?: { __typename?: 'JobError', message: string } | null } | null };

export type GetGenerationJobsQueryVariables = Exact<{
  goalId?: InputMaybe<Scalars['Int']['input']>;
  status?: InputMaybe<Scalars['String']['input']>;
}>;


export type GetGenerationJobsQuery = { __typename?: 'Query', generationJobs: Array<{ __typename?: 'GenerationJob', id: string, type: JobType, storyId?: number | null, status: JobStatus, progress: number, updatedAt: string, result?: { __typename?: 'JobResult', audioUrl?: string | null } | null, error?: { __typename?: 'JobError', message: string } | null }> };

export type GetGoalQueryVariables = Exact<{
  id?: InputMaybe<Scalars['Int']['input']>;
  slug?: InputMaybe<Scalars['String']['input']>;
}>;


export type GetGoalQuery = { __typename?: 'Query', goal?: { __typename?: 'Goal', id: number, slug?: string | null, title: string, description?: string | null, status: string, familyMemberId: number, createdBy: string, parentGoalId?: number | null, therapeuticText?: string | null, therapeuticTextLanguage?: string | null, therapeuticTextGeneratedAt?: string | null, storyLanguage?: string | null, createdAt: string, updatedAt: string, familyMember?: { __typename?: 'FamilyMember', id: number, firstName: string, name?: string | null, ageYears?: number | null, relationship?: string | null } | null, parentGoal?: { __typename?: 'Goal', id: number, slug?: string | null, title: string, status: string } | null, subGoals: Array<{ __typename?: 'Goal', id: number, slug?: string | null, title: string, description?: string | null, status: string, createdAt: string, updatedAt: string }>, notes: Array<{ __typename?: 'Note', id: number, slug?: string | null, content: string, noteType?: string | null, tags?: Array<string> | null, createdAt: string, updatedAt: string }>, research: Array<{ __typename?: 'Research', id: number, title: string, authors: Array<string>, year?: number | null, journal?: string | null, url?: string | null }>, stories: Array<{ __typename?: 'GoalStory', id: number, goalId: number, language: string, minutes: number, text: string, createdAt: string, updatedAt: string }>, userStories: Array<{ __typename?: 'Story', id: number, goalId: number, createdBy: string, content: string, createdAt: string, updatedAt: string }> } | null };

export type GetGoalStoryQueryVariables = Exact<{
  id: Scalars['Int']['input'];
}>;


export type GetGoalStoryQuery = { __typename?: 'Query', goalStory?: { __typename?: 'GoalStory', id: number, goalId: number, language: string, minutes: number, text: string, audioKey?: string | null, audioUrl?: string | null, audioGeneratedAt?: string | null, createdAt: string, updatedAt: string } | null };

export type GetGoalsQueryVariables = Exact<{
  familyMemberId?: InputMaybe<Scalars['Int']['input']>;
  status?: InputMaybe<Scalars['String']['input']>;
}>;


export type GetGoalsQuery = { __typename?: 'Query', goals: Array<{ __typename?: 'Goal', id: number, title: string, description?: string | null, status: string, familyMemberId: number, createdBy: string, parentGoalId?: number | null, createdAt: string, updatedAt: string, familyMember?: { __typename?: 'FamilyMember', id: number, firstName: string, name?: string | null, relationship?: string | null } | null, notes: Array<{ __typename?: 'Note', id: number, slug?: string | null, noteType?: string | null, tags?: Array<string> | null, createdAt: string }> }> };

export type GetJournalEntriesQueryVariables = Exact<{
  familyMemberId?: InputMaybe<Scalars['Int']['input']>;
  goalId?: InputMaybe<Scalars['Int']['input']>;
  mood?: InputMaybe<Scalars['String']['input']>;
  fromDate?: InputMaybe<Scalars['String']['input']>;
  toDate?: InputMaybe<Scalars['String']['input']>;
}>;


export type GetJournalEntriesQuery = { __typename?: 'Query', journalEntries: Array<{ __typename?: 'JournalEntry', id: number, createdBy: string, familyMemberId?: number | null, title?: string | null, content: string, mood?: string | null, moodScore?: number | null, tags?: Array<string> | null, goalId?: number | null, isPrivate: boolean, entryDate: string, createdAt: string, updatedAt: string, familyMember?: { __typename?: 'FamilyMember', id: number, firstName: string, name?: string | null } | null, goal?: { __typename?: 'Goal', id: number, title: string } | null }> };

export type GetJournalEntryQueryVariables = Exact<{
  id: Scalars['Int']['input'];
}>;


export type GetJournalEntryQuery = { __typename?: 'Query', journalEntry?: { __typename?: 'JournalEntry', id: number, createdBy: string, familyMemberId?: number | null, title?: string | null, content: string, mood?: string | null, moodScore?: number | null, tags?: Array<string> | null, goalId?: number | null, isPrivate: boolean, entryDate: string, createdAt: string, updatedAt: string, familyMember?: { __typename?: 'FamilyMember', id: number, firstName: string, name?: string | null } | null, goal?: { __typename?: 'Goal', id: number, title: string, description?: string | null } | null } | null };

export type GetMySharedFamilyMembersQueryVariables = Exact<{ [key: string]: never; }>;


export type GetMySharedFamilyMembersQuery = { __typename?: 'Query', mySharedFamilyMembers: Array<{ __typename?: 'FamilyMember', id: number, userId: string, firstName: string, name?: string | null, relationship?: string | null, email?: string | null, createdAt: string }> };

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

export type GetRelationshipQueryVariables = Exact<{
  id: Scalars['Int']['input'];
}>;


export type GetRelationshipQuery = { __typename?: 'Query', relationship?: { __typename?: 'Relationship', id: number, createdBy: string, subjectType: PersonType, subjectId: number, relatedType: PersonType, relatedId: number, relationshipType: string, context?: string | null, startDate?: string | null, status: RelationshipStatus, createdAt: string, updatedAt: string, subject?: { __typename?: 'RelationshipPerson', id: number, type: PersonType, firstName: string, lastName?: string | null } | null, related?: { __typename?: 'RelationshipPerson', id: number, type: PersonType, firstName: string, lastName?: string | null } | null } | null };

export type GetRelationshipsQueryVariables = Exact<{
  subjectType: PersonType;
  subjectId: Scalars['Int']['input'];
}>;


export type GetRelationshipsQuery = { __typename?: 'Query', relationships: Array<{ __typename?: 'Relationship', id: number, createdBy: string, subjectType: PersonType, subjectId: number, relatedType: PersonType, relatedId: number, relationshipType: string, context?: string | null, startDate?: string | null, status: RelationshipStatus, createdAt: string, updatedAt: string, subject?: { __typename?: 'RelationshipPerson', id: number, type: PersonType, firstName: string, lastName?: string | null } | null, related?: { __typename?: 'RelationshipPerson', id: number, type: PersonType, firstName: string, lastName?: string | null } | null }> };

export type GetStoriesQueryVariables = Exact<{
  goalId: Scalars['Int']['input'];
}>;


export type GetStoriesQuery = { __typename?: 'Query', stories: Array<{ __typename?: 'Story', id: number, goalId: number, createdBy: string, content: string, createdAt: string, updatedAt: string }> };

export type GetStoryQueryVariables = Exact<{
  id: Scalars['Int']['input'];
}>;


export type GetStoryQuery = { __typename?: 'Query', story?: { __typename?: 'Story', id: number, goalId: number, createdBy: string, content: string, audioKey?: string | null, audioUrl?: string | null, audioGeneratedAt?: string | null, createdAt: string, updatedAt: string, goal?: { __typename?: 'Goal', id: number, title: string, slug?: string | null } | null } | null };

export type ShareFamilyMemberMutationVariables = Exact<{
  familyMemberId: Scalars['Int']['input'];
  email: Scalars['String']['input'];
  role?: InputMaybe<FamilyMemberShareRole>;
}>;


export type ShareFamilyMemberMutation = { __typename?: 'Mutation', shareFamilyMember: { __typename?: 'FamilyMemberShare', familyMemberId: number, email: string, role: FamilyMemberShareRole, createdAt: string } };

export type UnshareFamilyMemberMutationVariables = Exact<{
  familyMemberId: Scalars['Int']['input'];
  email: Scalars['String']['input'];
}>;


export type UnshareFamilyMemberMutation = { __typename?: 'Mutation', unshareFamilyMember: boolean };

export type UpdateBehaviorObservationMutationVariables = Exact<{
  id: Scalars['Int']['input'];
  input: UpdateBehaviorObservationInput;
}>;


export type UpdateBehaviorObservationMutation = { __typename?: 'Mutation', updateBehaviorObservation: { __typename?: 'BehaviorObservation', id: number, familyMemberId: number, goalId?: number | null, createdBy: string, observedAt: string, observationType: BehaviorObservationType, frequency?: number | null, intensity?: BehaviorIntensity | null, context?: string | null, notes?: string | null, createdAt: string, updatedAt: string } };

export type UpdateContactMutationVariables = Exact<{
  id: Scalars['Int']['input'];
  input: UpdateContactInput;
}>;


export type UpdateContactMutation = { __typename?: 'Mutation', updateContact: { __typename?: 'Contact', id: number, createdBy: string, firstName: string, lastName?: string | null, role?: string | null, ageYears?: number | null, notes?: string | null, createdAt: string, updatedAt: string } };

export type UpdateFamilyMemberMutationVariables = Exact<{
  id: Scalars['Int']['input'];
  input: UpdateFamilyMemberInput;
}>;


export type UpdateFamilyMemberMutation = { __typename?: 'Mutation', updateFamilyMember: { __typename?: 'FamilyMember', id: number, firstName: string, name?: string | null, relationship?: string | null, email?: string | null, phone?: string | null, location?: string | null, occupation?: string | null, ageYears?: number | null, dateOfBirth?: string | null, bio?: string | null, createdAt: string, updatedAt: string } };

export type UpdateFamilyMemberCharacteristicMutationVariables = Exact<{
  id: Scalars['Int']['input'];
  input: UpdateFamilyMemberCharacteristicInput;
}>;


export type UpdateFamilyMemberCharacteristicMutation = { __typename?: 'Mutation', updateFamilyMemberCharacteristic: { __typename?: 'FamilyMemberCharacteristic', id: number, familyMemberId: number, createdBy: string, category: CharacteristicCategory, title: string, description?: string | null, severity?: SeverityLevel | null, frequencyPerWeek?: number | null, durationWeeks?: number | null, ageOfOnset?: number | null, impairmentDomains: Array<ImpairmentDomain>, formulationStatus: FormulationStatus, externalizedName?: string | null, strengths?: string | null, riskTier: RiskTier, createdAt: string, updatedAt: string } };

export type UpdateGoalMutationVariables = Exact<{
  id: Scalars['Int']['input'];
  input: UpdateGoalInput;
}>;


export type UpdateGoalMutation = { __typename?: 'Mutation', updateGoal: { __typename?: 'Goal', id: number, slug?: string | null, title: string, description?: string | null, status: string, familyMemberId: number, storyLanguage?: string | null, createdAt: string, updatedAt: string, familyMember?: { __typename?: 'FamilyMember', id: number, firstName: string, name?: string | null, relationship?: string | null } | null } };

export type UpdateJournalEntryMutationVariables = Exact<{
  id: Scalars['Int']['input'];
  input: UpdateJournalEntryInput;
}>;


export type UpdateJournalEntryMutation = { __typename?: 'Mutation', updateJournalEntry: { __typename?: 'JournalEntry', id: number, createdBy: string, familyMemberId?: number | null, title?: string | null, content: string, mood?: string | null, moodScore?: number | null, tags?: Array<string> | null, goalId?: number | null, isPrivate: boolean, entryDate: string, createdAt: string, updatedAt: string } };

export type UpdateNoteMutationVariables = Exact<{
  id: Scalars['Int']['input'];
  input: UpdateNoteInput;
}>;


export type UpdateNoteMutation = { __typename?: 'Mutation', updateNote: { __typename?: 'Note', id: number, entityId: number, entityType: string, createdBy: string, noteType?: string | null, content: string, tags?: Array<string> | null, createdAt: string, updatedAt: string } };

export type UpdateRelationshipMutationVariables = Exact<{
  id: Scalars['Int']['input'];
  input: UpdateRelationshipInput;
}>;


export type UpdateRelationshipMutation = { __typename?: 'Mutation', updateRelationship: { __typename?: 'Relationship', id: number, createdBy: string, subjectType: PersonType, subjectId: number, relatedType: PersonType, relatedId: number, relationshipType: string, context?: string | null, startDate?: string | null, status: RelationshipStatus, createdAt: string, updatedAt: string } };

export type UpdateStoryMutationVariables = Exact<{
  id: Scalars['Int']['input'];
  input: UpdateStoryInput;
}>;


export type UpdateStoryMutation = { __typename?: 'Mutation', updateStory: { __typename?: 'Story', id: number, goalId: number, createdBy: string, content: string, createdAt: string, updatedAt: string } };

export type UpdateUniqueOutcomeMutationVariables = Exact<{
  id: Scalars['Int']['input'];
  input: UpdateUniqueOutcomeInput;
}>;


export type UpdateUniqueOutcomeMutation = { __typename?: 'Mutation', updateUniqueOutcome: { __typename?: 'UniqueOutcome', id: number, characteristicId: number, createdBy: string, observedAt: string, description: string, createdAt: string, updatedAt: string } };

export type GetUserSettingsQueryVariables = Exact<{ [key: string]: never; }>;


export type GetUserSettingsQuery = { __typename?: 'Query', userSettings: { __typename?: 'UserSettings', userId: string, storyLanguage: string, storyMinutes: number } };

export type UpdateUserSettingsMutationVariables = Exact<{
  storyLanguage: Scalars['String']['input'];
  storyMinutes?: InputMaybe<Scalars['Int']['input']>;
}>;


export type UpdateUserSettingsMutation = { __typename?: 'Mutation', updateUserSettings: { __typename?: 'UserSettings', userId: string, storyLanguage: string, storyMinutes: number } };


export const CheckNoteClaimsDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"CheckNoteClaims"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"input"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"CheckNoteClaimsInput"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"checkNoteClaims"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"Variable","name":{"kind":"Name","value":"input"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"success"}},{"kind":"Field","name":{"kind":"Name","value":"message"}},{"kind":"Field","name":{"kind":"Name","value":"noteId"}},{"kind":"Field","name":{"kind":"Name","value":"cards"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"claim"}},{"kind":"Field","name":{"kind":"Name","value":"scope"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"population"}},{"kind":"Field","name":{"kind":"Name","value":"intervention"}},{"kind":"Field","name":{"kind":"Name","value":"comparator"}},{"kind":"Field","name":{"kind":"Name","value":"outcome"}},{"kind":"Field","name":{"kind":"Name","value":"timeframe"}},{"kind":"Field","name":{"kind":"Name","value":"setting"}}]}},{"kind":"Field","name":{"kind":"Name","value":"verdict"}},{"kind":"Field","name":{"kind":"Name","value":"confidence"}},{"kind":"Field","name":{"kind":"Name","value":"evidence"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"paper"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"title"}},{"kind":"Field","name":{"kind":"Name","value":"doi"}},{"kind":"Field","name":{"kind":"Name","value":"url"}},{"kind":"Field","name":{"kind":"Name","value":"year"}},{"kind":"Field","name":{"kind":"Name","value":"source"}},{"kind":"Field","name":{"kind":"Name","value":"authors"}},{"kind":"Field","name":{"kind":"Name","value":"abstract"}},{"kind":"Field","name":{"kind":"Name","value":"journal"}}]}},{"kind":"Field","name":{"kind":"Name","value":"polarity"}},{"kind":"Field","name":{"kind":"Name","value":"excerpt"}},{"kind":"Field","name":{"kind":"Name","value":"rationale"}},{"kind":"Field","name":{"kind":"Name","value":"score"}},{"kind":"Field","name":{"kind":"Name","value":"locator"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"section"}},{"kind":"Field","name":{"kind":"Name","value":"page"}},{"kind":"Field","name":{"kind":"Name","value":"url"}}]}}]}},{"kind":"Field","name":{"kind":"Name","value":"queries"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}},{"kind":"Field","name":{"kind":"Name","value":"provenance"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"generatedBy"}},{"kind":"Field","name":{"kind":"Name","value":"model"}},{"kind":"Field","name":{"kind":"Name","value":"sourceTools"}}]}},{"kind":"Field","name":{"kind":"Name","value":"notes"}}]}}]}}]}}]} as unknown as DocumentNode<CheckNoteClaimsMutation, CheckNoteClaimsMutationVariables>;
export const BuildClaimCardsFromTextDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"BuildClaimCardsFromText"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"buildClaimCards"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"ObjectValue","fields":[{"kind":"ObjectField","name":{"kind":"Name","value":"text"},"value":{"kind":"StringValue","value":"Cognitive Behavioral Therapy is effective for treating anxiety disorders.\nCBT reduces anxiety symptoms by 60-80% in most patients.\nThe effects of CBT persist for years after treatment ends.","block":true}},{"kind":"ObjectField","name":{"kind":"Name","value":"perSourceLimit"},"value":{"kind":"IntValue","value":"10"}},{"kind":"ObjectField","name":{"kind":"Name","value":"topK"},"value":{"kind":"IntValue","value":"5"}},{"kind":"ObjectField","name":{"kind":"Name","value":"useLlmJudge"},"value":{"kind":"BooleanValue","value":true}},{"kind":"ObjectField","name":{"kind":"Name","value":"sources"},"value":{"kind":"ListValue","values":[{"kind":"EnumValue","value":"CROSSREF"},{"kind":"EnumValue","value":"SEMANTIC_SCHOLAR"},{"kind":"EnumValue","value":"PUBMED"}]}}]}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"cards"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"claim"}},{"kind":"Field","name":{"kind":"Name","value":"verdict"}},{"kind":"Field","name":{"kind":"Name","value":"confidence"}},{"kind":"Field","name":{"kind":"Name","value":"evidence"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"paper"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"title"}},{"kind":"Field","name":{"kind":"Name","value":"authors"}},{"kind":"Field","name":{"kind":"Name","value":"doi"}},{"kind":"Field","name":{"kind":"Name","value":"year"}},{"kind":"Field","name":{"kind":"Name","value":"journal"}},{"kind":"Field","name":{"kind":"Name","value":"oaUrl"}}]}},{"kind":"Field","name":{"kind":"Name","value":"polarity"}},{"kind":"Field","name":{"kind":"Name","value":"excerpt"}},{"kind":"Field","name":{"kind":"Name","value":"rationale"}},{"kind":"Field","name":{"kind":"Name","value":"score"}}]}},{"kind":"Field","name":{"kind":"Name","value":"queries"}},{"kind":"Field","name":{"kind":"Name","value":"provenance"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"generatedBy"}},{"kind":"Field","name":{"kind":"Name","value":"model"}},{"kind":"Field","name":{"kind":"Name","value":"sourceTools"}}]}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}}]}}]}}]}}]} as unknown as DocumentNode<BuildClaimCardsFromTextMutation, BuildClaimCardsFromTextMutationVariables>;
export const BuildClaimCardsFromClaimsDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"BuildClaimCardsFromClaims"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"buildClaimCards"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"ObjectValue","fields":[{"kind":"ObjectField","name":{"kind":"Name","value":"claims"},"value":{"kind":"ListValue","values":[{"kind":"StringValue","value":"Mindfulness meditation reduces stress in adults with GAD","block":false},{"kind":"StringValue","value":"Exercise therapy improves mood in adults with major depressive disorder","block":false}]}},{"kind":"ObjectField","name":{"kind":"Name","value":"perSourceLimit"},"value":{"kind":"IntValue","value":"8"}},{"kind":"ObjectField","name":{"kind":"Name","value":"topK"},"value":{"kind":"IntValue","value":"4"}},{"kind":"ObjectField","name":{"kind":"Name","value":"useLlmJudge"},"value":{"kind":"BooleanValue","value":false}},{"kind":"ObjectField","name":{"kind":"Name","value":"sources"},"value":{"kind":"ListValue","values":[{"kind":"EnumValue","value":"SEMANTIC_SCHOLAR"},{"kind":"EnumValue","value":"OPENALEX"}]}}]}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"cards"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"claim"}},{"kind":"Field","name":{"kind":"Name","value":"verdict"}},{"kind":"Field","name":{"kind":"Name","value":"confidence"}},{"kind":"Field","name":{"kind":"Name","value":"evidence"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"paper"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"title"}},{"kind":"Field","name":{"kind":"Name","value":"doi"}}]}},{"kind":"Field","name":{"kind":"Name","value":"polarity"}},{"kind":"Field","name":{"kind":"Name","value":"score"}}]}}]}}]}}]}}]} as unknown as DocumentNode<BuildClaimCardsFromClaimsMutation, BuildClaimCardsFromClaimsMutationVariables>;
export const GetClaimCardDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"GetClaimCard"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"claimCard"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"id"},"value":{"kind":"StringValue","value":"claim_abc123def456","block":false}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"claim"}},{"kind":"Field","name":{"kind":"Name","value":"verdict"}},{"kind":"Field","name":{"kind":"Name","value":"confidence"}},{"kind":"Field","name":{"kind":"Name","value":"evidence"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"paper"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"title"}},{"kind":"Field","name":{"kind":"Name","value":"authors"}},{"kind":"Field","name":{"kind":"Name","value":"doi"}},{"kind":"Field","name":{"kind":"Name","value":"url"}},{"kind":"Field","name":{"kind":"Name","value":"year"}},{"kind":"Field","name":{"kind":"Name","value":"journal"}}]}},{"kind":"Field","name":{"kind":"Name","value":"polarity"}},{"kind":"Field","name":{"kind":"Name","value":"excerpt"}},{"kind":"Field","name":{"kind":"Name","value":"rationale"}},{"kind":"Field","name":{"kind":"Name","value":"score"}}]}},{"kind":"Field","name":{"kind":"Name","value":"scope"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"population"}},{"kind":"Field","name":{"kind":"Name","value":"intervention"}},{"kind":"Field","name":{"kind":"Name","value":"outcome"}}]}},{"kind":"Field","name":{"kind":"Name","value":"notes"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}}]}}]}}]} as unknown as DocumentNode<GetClaimCardQuery, GetClaimCardQueryVariables>;
export const GetClaimCardsForNoteDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"GetClaimCardsForNote"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"claimCardsForNote"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"noteId"},"value":{"kind":"IntValue","value":"1"}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"claim"}},{"kind":"Field","name":{"kind":"Name","value":"verdict"}},{"kind":"Field","name":{"kind":"Name","value":"confidence"}},{"kind":"Field","name":{"kind":"Name","value":"evidence"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"paper"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"title"}},{"kind":"Field","name":{"kind":"Name","value":"doi"}}]}},{"kind":"Field","name":{"kind":"Name","value":"polarity"}}]}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}}]}}]}}]} as unknown as DocumentNode<GetClaimCardsForNoteQuery, GetClaimCardsForNoteQueryVariables>;
export const RefreshClaimCardDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"RefreshClaimCard"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"refreshClaimCard"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"id"},"value":{"kind":"StringValue","value":"claim_abc123def456","block":false}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"claim"}},{"kind":"Field","name":{"kind":"Name","value":"verdict"}},{"kind":"Field","name":{"kind":"Name","value":"confidence"}},{"kind":"Field","name":{"kind":"Name","value":"evidence"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"paper"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"title"}},{"kind":"Field","name":{"kind":"Name","value":"doi"}},{"kind":"Field","name":{"kind":"Name","value":"year"}}]}},{"kind":"Field","name":{"kind":"Name","value":"polarity"}},{"kind":"Field","name":{"kind":"Name","value":"score"}}]}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}}]}}]}}]} as unknown as DocumentNode<RefreshClaimCardMutation, RefreshClaimCardMutationVariables>;
export const DeleteClaimCardDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"DeleteClaimCard"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"deleteClaimCard"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"id"},"value":{"kind":"StringValue","value":"claim_abc123def456","block":false}}]}]}}]} as unknown as DocumentNode<DeleteClaimCardMutation, DeleteClaimCardMutationVariables>;
export const CreateBehaviorObservationDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"CreateBehaviorObservation"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"input"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"CreateBehaviorObservationInput"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"createBehaviorObservation"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"Variable","name":{"kind":"Name","value":"input"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"familyMemberId"}},{"kind":"Field","name":{"kind":"Name","value":"goalId"}},{"kind":"Field","name":{"kind":"Name","value":"createdBy"}},{"kind":"Field","name":{"kind":"Name","value":"observedAt"}},{"kind":"Field","name":{"kind":"Name","value":"observationType"}},{"kind":"Field","name":{"kind":"Name","value":"frequency"}},{"kind":"Field","name":{"kind":"Name","value":"intensity"}},{"kind":"Field","name":{"kind":"Name","value":"context"}},{"kind":"Field","name":{"kind":"Name","value":"notes"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}}]}}]}}]} as unknown as DocumentNode<CreateBehaviorObservationMutation, CreateBehaviorObservationMutationVariables>;
export const CreateContactDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"CreateContact"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"input"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"CreateContactInput"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"createContact"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"Variable","name":{"kind":"Name","value":"input"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"createdBy"}},{"kind":"Field","name":{"kind":"Name","value":"firstName"}},{"kind":"Field","name":{"kind":"Name","value":"lastName"}},{"kind":"Field","name":{"kind":"Name","value":"role"}},{"kind":"Field","name":{"kind":"Name","value":"ageYears"}},{"kind":"Field","name":{"kind":"Name","value":"notes"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}}]}}]}}]} as unknown as DocumentNode<CreateContactMutation, CreateContactMutationVariables>;
export const CreateFamilyMemberDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"CreateFamilyMember"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"input"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"CreateFamilyMemberInput"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"createFamilyMember"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"Variable","name":{"kind":"Name","value":"input"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"firstName"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"relationship"}},{"kind":"Field","name":{"kind":"Name","value":"email"}},{"kind":"Field","name":{"kind":"Name","value":"phone"}},{"kind":"Field","name":{"kind":"Name","value":"location"}},{"kind":"Field","name":{"kind":"Name","value":"occupation"}},{"kind":"Field","name":{"kind":"Name","value":"ageYears"}},{"kind":"Field","name":{"kind":"Name","value":"dateOfBirth"}},{"kind":"Field","name":{"kind":"Name","value":"bio"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}}]}}]}}]} as unknown as DocumentNode<CreateFamilyMemberMutation, CreateFamilyMemberMutationVariables>;
export const CreateFamilyMemberCharacteristicDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"CreateFamilyMemberCharacteristic"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"input"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"CreateFamilyMemberCharacteristicInput"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"createFamilyMemberCharacteristic"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"Variable","name":{"kind":"Name","value":"input"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"familyMemberId"}},{"kind":"Field","name":{"kind":"Name","value":"createdBy"}},{"kind":"Field","name":{"kind":"Name","value":"category"}},{"kind":"Field","name":{"kind":"Name","value":"title"}},{"kind":"Field","name":{"kind":"Name","value":"description"}},{"kind":"Field","name":{"kind":"Name","value":"severity"}},{"kind":"Field","name":{"kind":"Name","value":"frequencyPerWeek"}},{"kind":"Field","name":{"kind":"Name","value":"durationWeeks"}},{"kind":"Field","name":{"kind":"Name","value":"ageOfOnset"}},{"kind":"Field","name":{"kind":"Name","value":"impairmentDomains"}},{"kind":"Field","name":{"kind":"Name","value":"formulationStatus"}},{"kind":"Field","name":{"kind":"Name","value":"externalizedName"}},{"kind":"Field","name":{"kind":"Name","value":"strengths"}},{"kind":"Field","name":{"kind":"Name","value":"riskTier"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}}]}}]}}]} as unknown as DocumentNode<CreateFamilyMemberCharacteristicMutation, CreateFamilyMemberCharacteristicMutationVariables>;
export const CreateGoalDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"CreateGoal"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"input"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"CreateGoalInput"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"createGoal"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"Variable","name":{"kind":"Name","value":"input"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"slug"}},{"kind":"Field","name":{"kind":"Name","value":"title"}},{"kind":"Field","name":{"kind":"Name","value":"description"}},{"kind":"Field","name":{"kind":"Name","value":"status"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}},{"kind":"Field","name":{"kind":"Name","value":"familyMemberId"}}]}}]}}]} as unknown as DocumentNode<CreateGoalMutation, CreateGoalMutationVariables>;
export const CreateJournalEntryDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"CreateJournalEntry"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"input"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"CreateJournalEntryInput"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"createJournalEntry"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"Variable","name":{"kind":"Name","value":"input"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"createdBy"}},{"kind":"Field","name":{"kind":"Name","value":"familyMemberId"}},{"kind":"Field","name":{"kind":"Name","value":"title"}},{"kind":"Field","name":{"kind":"Name","value":"content"}},{"kind":"Field","name":{"kind":"Name","value":"mood"}},{"kind":"Field","name":{"kind":"Name","value":"moodScore"}},{"kind":"Field","name":{"kind":"Name","value":"tags"}},{"kind":"Field","name":{"kind":"Name","value":"goalId"}},{"kind":"Field","name":{"kind":"Name","value":"isPrivate"}},{"kind":"Field","name":{"kind":"Name","value":"entryDate"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}}]}}]}}]} as unknown as DocumentNode<CreateJournalEntryMutation, CreateJournalEntryMutationVariables>;
export const CreateNoteDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"CreateNote"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"input"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"CreateNoteInput"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"createNote"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"Variable","name":{"kind":"Name","value":"input"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"entityId"}},{"kind":"Field","name":{"kind":"Name","value":"entityType"}},{"kind":"Field","name":{"kind":"Name","value":"createdBy"}},{"kind":"Field","name":{"kind":"Name","value":"noteType"}},{"kind":"Field","name":{"kind":"Name","value":"slug"}},{"kind":"Field","name":{"kind":"Name","value":"content"}},{"kind":"Field","name":{"kind":"Name","value":"createdBy"}},{"kind":"Field","name":{"kind":"Name","value":"tags"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}}]}}]}}]} as unknown as DocumentNode<CreateNoteMutation, CreateNoteMutationVariables>;
export const CreateRelationshipDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"CreateRelationship"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"input"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"CreateRelationshipInput"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"createRelationship"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"Variable","name":{"kind":"Name","value":"input"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"createdBy"}},{"kind":"Field","name":{"kind":"Name","value":"subjectType"}},{"kind":"Field","name":{"kind":"Name","value":"subjectId"}},{"kind":"Field","name":{"kind":"Name","value":"relatedType"}},{"kind":"Field","name":{"kind":"Name","value":"relatedId"}},{"kind":"Field","name":{"kind":"Name","value":"relationshipType"}},{"kind":"Field","name":{"kind":"Name","value":"context"}},{"kind":"Field","name":{"kind":"Name","value":"startDate"}},{"kind":"Field","name":{"kind":"Name","value":"status"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}}]}}]}}]} as unknown as DocumentNode<CreateRelationshipMutation, CreateRelationshipMutationVariables>;
export const CreateStoryDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"CreateStory"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"input"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"CreateStoryInput"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"createStory"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"Variable","name":{"kind":"Name","value":"input"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"goalId"}},{"kind":"Field","name":{"kind":"Name","value":"createdBy"}},{"kind":"Field","name":{"kind":"Name","value":"content"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}}]}}]}}]} as unknown as DocumentNode<CreateStoryMutation, CreateStoryMutationVariables>;
export const CreateSubGoalDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"CreateSubGoal"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"goalId"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"Int"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"input"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"CreateSubGoalInput"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"createSubGoal"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"goalId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"goalId"}}},{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"Variable","name":{"kind":"Name","value":"input"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"slug"}},{"kind":"Field","name":{"kind":"Name","value":"title"}},{"kind":"Field","name":{"kind":"Name","value":"description"}},{"kind":"Field","name":{"kind":"Name","value":"status"}},{"kind":"Field","name":{"kind":"Name","value":"parentGoalId"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}},{"kind":"Field","name":{"kind":"Name","value":"familyMemberId"}}]}}]}}]} as unknown as DocumentNode<CreateSubGoalMutation, CreateSubGoalMutationVariables>;
export const CreateUniqueOutcomeDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"CreateUniqueOutcome"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"input"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"CreateUniqueOutcomeInput"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"createUniqueOutcome"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"Variable","name":{"kind":"Name","value":"input"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"characteristicId"}},{"kind":"Field","name":{"kind":"Name","value":"createdBy"}},{"kind":"Field","name":{"kind":"Name","value":"observedAt"}},{"kind":"Field","name":{"kind":"Name","value":"description"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}}]}}]}}]} as unknown as DocumentNode<CreateUniqueOutcomeMutation, CreateUniqueOutcomeMutationVariables>;
export const DeleteBehaviorObservationDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"DeleteBehaviorObservation"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"id"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"Int"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"deleteBehaviorObservation"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"id"},"value":{"kind":"Variable","name":{"kind":"Name","value":"id"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"success"}},{"kind":"Field","name":{"kind":"Name","value":"message"}}]}}]}}]} as unknown as DocumentNode<DeleteBehaviorObservationMutation, DeleteBehaviorObservationMutationVariables>;
export const DeleteContactDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"DeleteContact"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"id"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"Int"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"deleteContact"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"id"},"value":{"kind":"Variable","name":{"kind":"Name","value":"id"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"success"}},{"kind":"Field","name":{"kind":"Name","value":"message"}}]}}]}}]} as unknown as DocumentNode<DeleteContactMutation, DeleteContactMutationVariables>;
export const DeleteFamilyMemberDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"DeleteFamilyMember"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"id"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"Int"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"deleteFamilyMember"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"id"},"value":{"kind":"Variable","name":{"kind":"Name","value":"id"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"success"}},{"kind":"Field","name":{"kind":"Name","value":"message"}}]}}]}}]} as unknown as DocumentNode<DeleteFamilyMemberMutation, DeleteFamilyMemberMutationVariables>;
export const DeleteFamilyMemberCharacteristicDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"DeleteFamilyMemberCharacteristic"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"id"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"Int"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"deleteFamilyMemberCharacteristic"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"id"},"value":{"kind":"Variable","name":{"kind":"Name","value":"id"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"success"}},{"kind":"Field","name":{"kind":"Name","value":"message"}}]}}]}}]} as unknown as DocumentNode<DeleteFamilyMemberCharacteristicMutation, DeleteFamilyMemberCharacteristicMutationVariables>;
export const DeleteGoalDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"DeleteGoal"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"id"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"Int"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"deleteGoal"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"id"},"value":{"kind":"Variable","name":{"kind":"Name","value":"id"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"success"}},{"kind":"Field","name":{"kind":"Name","value":"message"}}]}}]}}]} as unknown as DocumentNode<DeleteGoalMutation, DeleteGoalMutationVariables>;
export const DeleteJournalEntryDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"DeleteJournalEntry"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"id"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"Int"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"deleteJournalEntry"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"id"},"value":{"kind":"Variable","name":{"kind":"Name","value":"id"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"success"}},{"kind":"Field","name":{"kind":"Name","value":"message"}}]}}]}}]} as unknown as DocumentNode<DeleteJournalEntryMutation, DeleteJournalEntryMutationVariables>;
export const DeleteNoteDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"DeleteNote"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"id"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"Int"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"deleteNote"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"id"},"value":{"kind":"Variable","name":{"kind":"Name","value":"id"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"success"}},{"kind":"Field","name":{"kind":"Name","value":"message"}}]}}]}}]} as unknown as DocumentNode<DeleteNoteMutation, DeleteNoteMutationVariables>;
export const DeleteRelationshipDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"DeleteRelationship"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"id"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"Int"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"deleteRelationship"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"id"},"value":{"kind":"Variable","name":{"kind":"Name","value":"id"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"success"}},{"kind":"Field","name":{"kind":"Name","value":"message"}}]}}]}}]} as unknown as DocumentNode<DeleteRelationshipMutation, DeleteRelationshipMutationVariables>;
export const DeleteResearchDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"DeleteResearch"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"goalId"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"Int"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"deleteResearch"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"goalId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"goalId"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"success"}},{"kind":"Field","name":{"kind":"Name","value":"message"}},{"kind":"Field","name":{"kind":"Name","value":"deletedCount"}}]}}]}}]} as unknown as DocumentNode<DeleteResearchMutation, DeleteResearchMutationVariables>;
export const DeleteStoryDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"DeleteStory"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"id"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"Int"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"deleteStory"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"id"},"value":{"kind":"Variable","name":{"kind":"Name","value":"id"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"success"}},{"kind":"Field","name":{"kind":"Name","value":"message"}}]}}]}}]} as unknown as DocumentNode<DeleteStoryMutation, DeleteStoryMutationVariables>;
export const DeleteUniqueOutcomeDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"DeleteUniqueOutcome"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"id"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"Int"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"deleteUniqueOutcome"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"id"},"value":{"kind":"Variable","name":{"kind":"Name","value":"id"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"success"}},{"kind":"Field","name":{"kind":"Name","value":"message"}}]}}]}}]} as unknown as DocumentNode<DeleteUniqueOutcomeMutation, DeleteUniqueOutcomeMutationVariables>;
export const GenerateAudioDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"GenerateAudio"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"goalId"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"Int"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"storyId"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"Int"}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"text"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"language"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"voice"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"generateAudio"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"goalId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"goalId"}}},{"kind":"Argument","name":{"kind":"Name","value":"storyId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"storyId"}}},{"kind":"Argument","name":{"kind":"Name","value":"text"},"value":{"kind":"Variable","name":{"kind":"Name","value":"text"}}},{"kind":"Argument","name":{"kind":"Name","value":"language"},"value":{"kind":"Variable","name":{"kind":"Name","value":"language"}}},{"kind":"Argument","name":{"kind":"Name","value":"voice"},"value":{"kind":"Variable","name":{"kind":"Name","value":"voice"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"success"}},{"kind":"Field","name":{"kind":"Name","value":"message"}},{"kind":"Field","name":{"kind":"Name","value":"jobId"}},{"kind":"Field","name":{"kind":"Name","value":"audioUrl"}}]}}]}}]} as unknown as DocumentNode<GenerateAudioMutation, GenerateAudioMutationVariables>;
export const GenerateLongFormTextDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"GenerateLongFormText"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"goalId"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"Int"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"characteristicId"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"Int"}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"language"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"minutes"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"Int"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"generateLongFormText"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"goalId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"goalId"}}},{"kind":"Argument","name":{"kind":"Name","value":"characteristicId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"characteristicId"}}},{"kind":"Argument","name":{"kind":"Name","value":"language"},"value":{"kind":"Variable","name":{"kind":"Name","value":"language"}}},{"kind":"Argument","name":{"kind":"Name","value":"minutes"},"value":{"kind":"Variable","name":{"kind":"Name","value":"minutes"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"success"}},{"kind":"Field","name":{"kind":"Name","value":"message"}},{"kind":"Field","name":{"kind":"Name","value":"jobId"}},{"kind":"Field","name":{"kind":"Name","value":"storyId"}},{"kind":"Field","name":{"kind":"Name","value":"text"}},{"kind":"Field","name":{"kind":"Name","value":"audioUrl"}},{"kind":"Field","name":{"kind":"Name","value":"manifestUrl"}},{"kind":"Field","name":{"kind":"Name","value":"segmentUrls"}}]}}]}}]} as unknown as DocumentNode<GenerateLongFormTextMutation, GenerateLongFormTextMutationVariables>;
export const GenerateLongFormTextRomanianDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"GenerateLongFormTextRomanian"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"goalId"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"Int"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"generateLongFormText"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"goalId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"goalId"}}},{"kind":"Argument","name":{"kind":"Name","value":"language"},"value":{"kind":"StringValue","value":"Romanian","block":false}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"success"}},{"kind":"Field","name":{"kind":"Name","value":"message"}},{"kind":"Field","name":{"kind":"Name","value":"text"}},{"kind":"Field","name":{"kind":"Name","value":"audioUrl"}},{"kind":"Field","name":{"kind":"Name","value":"manifestUrl"}},{"kind":"Field","name":{"kind":"Name","value":"segmentUrls"}}]}}]}}]} as unknown as DocumentNode<GenerateLongFormTextRomanianMutation, GenerateLongFormTextRomanianMutationVariables>;
export const GenerateOpenAiAudioDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"GenerateOpenAIAudio"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"input"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"GenerateOpenAIAudioInput"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"generateOpenAIAudio"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"Variable","name":{"kind":"Name","value":"input"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"success"}},{"kind":"Field","name":{"kind":"Name","value":"message"}},{"kind":"Field","name":{"kind":"Name","value":"jobId"}},{"kind":"Field","name":{"kind":"Name","value":"audioBuffer"}},{"kind":"Field","name":{"kind":"Name","value":"audioUrl"}},{"kind":"Field","name":{"kind":"Name","value":"sizeBytes"}},{"kind":"Field","name":{"kind":"Name","value":"duration"}}]}}]}}]} as unknown as DocumentNode<GenerateOpenAiAudioMutation, GenerateOpenAiAudioMutationVariables>;
export const GenerateResearchDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"GenerateResearch"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"goalId"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"Int"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"generateResearch"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"goalId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"goalId"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"success"}},{"kind":"Field","name":{"kind":"Name","value":"message"}},{"kind":"Field","name":{"kind":"Name","value":"jobId"}},{"kind":"Field","name":{"kind":"Name","value":"count"}}]}}]}}]} as unknown as DocumentNode<GenerateResearchMutation, GenerateResearchMutationVariables>;
export const GetAllNotesDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"GetAllNotes"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"allNotes"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"entityId"}},{"kind":"Field","name":{"kind":"Name","value":"entityType"}},{"kind":"Field","name":{"kind":"Name","value":"createdBy"}},{"kind":"Field","name":{"kind":"Name","value":"noteType"}},{"kind":"Field","name":{"kind":"Name","value":"slug"}},{"kind":"Field","name":{"kind":"Name","value":"title"}},{"kind":"Field","name":{"kind":"Name","value":"content"}},{"kind":"Field","name":{"kind":"Name","value":"createdBy"}},{"kind":"Field","name":{"kind":"Name","value":"tags"}},{"kind":"Field","name":{"kind":"Name","value":"goal"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"title"}},{"kind":"Field","name":{"kind":"Name","value":"description"}},{"kind":"Field","name":{"kind":"Name","value":"status"}}]}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}}]}}]}}]} as unknown as DocumentNode<GetAllNotesQuery, GetAllNotesQueryVariables>;
export const GetAllStoriesDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"GetAllStories"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"allStories"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"goalId"}},{"kind":"Field","name":{"kind":"Name","value":"createdBy"}},{"kind":"Field","name":{"kind":"Name","value":"content"}},{"kind":"Field","name":{"kind":"Name","value":"audioKey"}},{"kind":"Field","name":{"kind":"Name","value":"audioUrl"}},{"kind":"Field","name":{"kind":"Name","value":"audioGeneratedAt"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}},{"kind":"Field","name":{"kind":"Name","value":"goal"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"title"}},{"kind":"Field","name":{"kind":"Name","value":"slug"}}]}}]}}]}}]} as unknown as DocumentNode<GetAllStoriesQuery, GetAllStoriesQueryVariables>;
export const GetAudioFromR2Document = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"GetAudioFromR2"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"key"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"audioFromR2"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"key"},"value":{"kind":"Variable","name":{"kind":"Name","value":"key"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"success"}},{"kind":"Field","name":{"kind":"Name","value":"message"}},{"kind":"Field","name":{"kind":"Name","value":"audioUrl"}},{"kind":"Field","name":{"kind":"Name","value":"key"}},{"kind":"Field","name":{"kind":"Name","value":"metadata"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"voice"}},{"kind":"Field","name":{"kind":"Name","value":"model"}},{"kind":"Field","name":{"kind":"Name","value":"textLength"}},{"kind":"Field","name":{"kind":"Name","value":"chunks"}},{"kind":"Field","name":{"kind":"Name","value":"generatedBy"}},{"kind":"Field","name":{"kind":"Name","value":"instructions"}}]}}]}}]}}]} as unknown as DocumentNode<GetAudioFromR2Query, GetAudioFromR2QueryVariables>;
export const GetBehaviorObservationDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"GetBehaviorObservation"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"id"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"Int"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"behaviorObservation"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"id"},"value":{"kind":"Variable","name":{"kind":"Name","value":"id"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"familyMemberId"}},{"kind":"Field","name":{"kind":"Name","value":"goalId"}},{"kind":"Field","name":{"kind":"Name","value":"createdBy"}},{"kind":"Field","name":{"kind":"Name","value":"observedAt"}},{"kind":"Field","name":{"kind":"Name","value":"observationType"}},{"kind":"Field","name":{"kind":"Name","value":"frequency"}},{"kind":"Field","name":{"kind":"Name","value":"intensity"}},{"kind":"Field","name":{"kind":"Name","value":"context"}},{"kind":"Field","name":{"kind":"Name","value":"notes"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}},{"kind":"Field","name":{"kind":"Name","value":"familyMember"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"firstName"}},{"kind":"Field","name":{"kind":"Name","value":"name"}}]}},{"kind":"Field","name":{"kind":"Name","value":"goal"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"title"}},{"kind":"Field","name":{"kind":"Name","value":"description"}}]}}]}}]}}]} as unknown as DocumentNode<GetBehaviorObservationQuery, GetBehaviorObservationQueryVariables>;
export const GetBehaviorObservationsDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"GetBehaviorObservations"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"familyMemberId"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"Int"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"goalId"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"Int"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"behaviorObservations"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"familyMemberId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"familyMemberId"}}},{"kind":"Argument","name":{"kind":"Name","value":"goalId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"goalId"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"familyMemberId"}},{"kind":"Field","name":{"kind":"Name","value":"goalId"}},{"kind":"Field","name":{"kind":"Name","value":"createdBy"}},{"kind":"Field","name":{"kind":"Name","value":"observedAt"}},{"kind":"Field","name":{"kind":"Name","value":"observationType"}},{"kind":"Field","name":{"kind":"Name","value":"frequency"}},{"kind":"Field","name":{"kind":"Name","value":"intensity"}},{"kind":"Field","name":{"kind":"Name","value":"context"}},{"kind":"Field","name":{"kind":"Name","value":"notes"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}},{"kind":"Field","name":{"kind":"Name","value":"familyMember"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"firstName"}},{"kind":"Field","name":{"kind":"Name","value":"name"}}]}},{"kind":"Field","name":{"kind":"Name","value":"goal"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"title"}}]}}]}}]}}]} as unknown as DocumentNode<GetBehaviorObservationsQuery, GetBehaviorObservationsQueryVariables>;
export const GetContactDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"GetContact"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"id"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"Int"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"contact"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"id"},"value":{"kind":"Variable","name":{"kind":"Name","value":"id"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"createdBy"}},{"kind":"Field","name":{"kind":"Name","value":"firstName"}},{"kind":"Field","name":{"kind":"Name","value":"lastName"}},{"kind":"Field","name":{"kind":"Name","value":"role"}},{"kind":"Field","name":{"kind":"Name","value":"ageYears"}},{"kind":"Field","name":{"kind":"Name","value":"notes"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}}]}}]}}]} as unknown as DocumentNode<GetContactQuery, GetContactQueryVariables>;
export const GetContactsDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"GetContacts"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"contacts"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"createdBy"}},{"kind":"Field","name":{"kind":"Name","value":"firstName"}},{"kind":"Field","name":{"kind":"Name","value":"lastName"}},{"kind":"Field","name":{"kind":"Name","value":"role"}},{"kind":"Field","name":{"kind":"Name","value":"ageYears"}},{"kind":"Field","name":{"kind":"Name","value":"notes"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}}]}}]}}]} as unknown as DocumentNode<GetContactsQuery, GetContactsQueryVariables>;
export const GetFamilyMemberDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"GetFamilyMember"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"id"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"Int"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"familyMember"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"id"},"value":{"kind":"Variable","name":{"kind":"Name","value":"id"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"userId"}},{"kind":"Field","name":{"kind":"Name","value":"firstName"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"ageYears"}},{"kind":"Field","name":{"kind":"Name","value":"relationship"}},{"kind":"Field","name":{"kind":"Name","value":"email"}},{"kind":"Field","name":{"kind":"Name","value":"phone"}},{"kind":"Field","name":{"kind":"Name","value":"location"}},{"kind":"Field","name":{"kind":"Name","value":"occupation"}},{"kind":"Field","name":{"kind":"Name","value":"dateOfBirth"}},{"kind":"Field","name":{"kind":"Name","value":"bio"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}},{"kind":"Field","name":{"kind":"Name","value":"shares"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"familyMemberId"}},{"kind":"Field","name":{"kind":"Name","value":"email"}},{"kind":"Field","name":{"kind":"Name","value":"role"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"createdBy"}}]}},{"kind":"Field","name":{"kind":"Name","value":"goals"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"title"}},{"kind":"Field","name":{"kind":"Name","value":"status"}},{"kind":"Field","name":{"kind":"Name","value":"description"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}}]}},{"kind":"Field","name":{"kind":"Name","value":"behaviorObservations"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"observedAt"}},{"kind":"Field","name":{"kind":"Name","value":"observationType"}},{"kind":"Field","name":{"kind":"Name","value":"frequency"}},{"kind":"Field","name":{"kind":"Name","value":"intensity"}},{"kind":"Field","name":{"kind":"Name","value":"context"}},{"kind":"Field","name":{"kind":"Name","value":"notes"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}}]}}]}}]}}]} as unknown as DocumentNode<GetFamilyMemberQuery, GetFamilyMemberQueryVariables>;
export const GetFamilyMemberCharacteristicDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"GetFamilyMemberCharacteristic"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"id"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"Int"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"familyMemberCharacteristic"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"id"},"value":{"kind":"Variable","name":{"kind":"Name","value":"id"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"familyMemberId"}},{"kind":"Field","name":{"kind":"Name","value":"createdBy"}},{"kind":"Field","name":{"kind":"Name","value":"category"}},{"kind":"Field","name":{"kind":"Name","value":"title"}},{"kind":"Field","name":{"kind":"Name","value":"description"}},{"kind":"Field","name":{"kind":"Name","value":"severity"}},{"kind":"Field","name":{"kind":"Name","value":"frequencyPerWeek"}},{"kind":"Field","name":{"kind":"Name","value":"durationWeeks"}},{"kind":"Field","name":{"kind":"Name","value":"ageOfOnset"}},{"kind":"Field","name":{"kind":"Name","value":"impairmentDomains"}},{"kind":"Field","name":{"kind":"Name","value":"formulationStatus"}},{"kind":"Field","name":{"kind":"Name","value":"externalizedName"}},{"kind":"Field","name":{"kind":"Name","value":"strengths"}},{"kind":"Field","name":{"kind":"Name","value":"riskTier"}},{"kind":"Field","name":{"kind":"Name","value":"uniqueOutcomes"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"characteristicId"}},{"kind":"Field","name":{"kind":"Name","value":"createdBy"}},{"kind":"Field","name":{"kind":"Name","value":"observedAt"}},{"kind":"Field","name":{"kind":"Name","value":"description"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}}]}},{"kind":"Field","name":{"kind":"Name","value":"behaviorObservations"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"familyMemberId"}},{"kind":"Field","name":{"kind":"Name","value":"goalId"}},{"kind":"Field","name":{"kind":"Name","value":"characteristicId"}},{"kind":"Field","name":{"kind":"Name","value":"createdBy"}},{"kind":"Field","name":{"kind":"Name","value":"observedAt"}},{"kind":"Field","name":{"kind":"Name","value":"observationType"}},{"kind":"Field","name":{"kind":"Name","value":"frequency"}},{"kind":"Field","name":{"kind":"Name","value":"intensity"}},{"kind":"Field","name":{"kind":"Name","value":"context"}},{"kind":"Field","name":{"kind":"Name","value":"notes"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}}]}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}}]}}]}}]} as unknown as DocumentNode<GetFamilyMemberCharacteristicQuery, GetFamilyMemberCharacteristicQueryVariables>;
export const GetFamilyMemberCharacteristicsDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"GetFamilyMemberCharacteristics"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"familyMemberId"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"Int"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"category"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"CharacteristicCategory"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"familyMemberCharacteristics"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"familyMemberId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"familyMemberId"}}},{"kind":"Argument","name":{"kind":"Name","value":"category"},"value":{"kind":"Variable","name":{"kind":"Name","value":"category"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"familyMemberId"}},{"kind":"Field","name":{"kind":"Name","value":"createdBy"}},{"kind":"Field","name":{"kind":"Name","value":"category"}},{"kind":"Field","name":{"kind":"Name","value":"title"}},{"kind":"Field","name":{"kind":"Name","value":"description"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}}]}}]}}]} as unknown as DocumentNode<GetFamilyMemberCharacteristicsQuery, GetFamilyMemberCharacteristicsQueryVariables>;
export const GetFamilyMembersDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"GetFamilyMembers"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"familyMembers"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"userId"}},{"kind":"Field","name":{"kind":"Name","value":"firstName"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"ageYears"}},{"kind":"Field","name":{"kind":"Name","value":"relationship"}},{"kind":"Field","name":{"kind":"Name","value":"email"}},{"kind":"Field","name":{"kind":"Name","value":"phone"}},{"kind":"Field","name":{"kind":"Name","value":"location"}},{"kind":"Field","name":{"kind":"Name","value":"occupation"}},{"kind":"Field","name":{"kind":"Name","value":"dateOfBirth"}},{"kind":"Field","name":{"kind":"Name","value":"bio"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}},{"kind":"Field","name":{"kind":"Name","value":"shares"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"familyMemberId"}},{"kind":"Field","name":{"kind":"Name","value":"email"}},{"kind":"Field","name":{"kind":"Name","value":"role"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"createdBy"}}]}}]}}]}}]} as unknown as DocumentNode<GetFamilyMembersQuery, GetFamilyMembersQueryVariables>;
export const GetGenerationJobDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"GetGenerationJob"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"id"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"generationJob"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"id"},"value":{"kind":"Variable","name":{"kind":"Name","value":"id"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"status"}},{"kind":"Field","name":{"kind":"Name","value":"progress"}},{"kind":"Field","name":{"kind":"Name","value":"result"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"audioUrl"}}]}},{"kind":"Field","name":{"kind":"Name","value":"error"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"message"}}]}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}}]}}]}}]} as unknown as DocumentNode<GetGenerationJobQuery, GetGenerationJobQueryVariables>;
export const GetGenerationJobsDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"GetGenerationJobs"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"goalId"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"Int"}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"status"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"generationJobs"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"goalId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"goalId"}}},{"kind":"Argument","name":{"kind":"Name","value":"status"},"value":{"kind":"Variable","name":{"kind":"Name","value":"status"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"type"}},{"kind":"Field","name":{"kind":"Name","value":"storyId"}},{"kind":"Field","name":{"kind":"Name","value":"status"}},{"kind":"Field","name":{"kind":"Name","value":"progress"}},{"kind":"Field","name":{"kind":"Name","value":"result"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"audioUrl"}}]}},{"kind":"Field","name":{"kind":"Name","value":"error"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"message"}}]}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}}]}}]}}]} as unknown as DocumentNode<GetGenerationJobsQuery, GetGenerationJobsQueryVariables>;
export const GetGoalDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"GetGoal"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"id"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"Int"}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"slug"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"goal"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"id"},"value":{"kind":"Variable","name":{"kind":"Name","value":"id"}}},{"kind":"Argument","name":{"kind":"Name","value":"slug"},"value":{"kind":"Variable","name":{"kind":"Name","value":"slug"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"slug"}},{"kind":"Field","name":{"kind":"Name","value":"title"}},{"kind":"Field","name":{"kind":"Name","value":"description"}},{"kind":"Field","name":{"kind":"Name","value":"status"}},{"kind":"Field","name":{"kind":"Name","value":"familyMemberId"}},{"kind":"Field","name":{"kind":"Name","value":"familyMember"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"firstName"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"ageYears"}},{"kind":"Field","name":{"kind":"Name","value":"relationship"}}]}},{"kind":"Field","name":{"kind":"Name","value":"createdBy"}},{"kind":"Field","name":{"kind":"Name","value":"parentGoalId"}},{"kind":"Field","name":{"kind":"Name","value":"parentGoal"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"slug"}},{"kind":"Field","name":{"kind":"Name","value":"title"}},{"kind":"Field","name":{"kind":"Name","value":"status"}}]}},{"kind":"Field","name":{"kind":"Name","value":"therapeuticText"}},{"kind":"Field","name":{"kind":"Name","value":"therapeuticTextLanguage"}},{"kind":"Field","name":{"kind":"Name","value":"therapeuticTextGeneratedAt"}},{"kind":"Field","name":{"kind":"Name","value":"storyLanguage"}},{"kind":"Field","name":{"kind":"Name","value":"subGoals"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"slug"}},{"kind":"Field","name":{"kind":"Name","value":"title"}},{"kind":"Field","name":{"kind":"Name","value":"description"}},{"kind":"Field","name":{"kind":"Name","value":"status"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}}]}},{"kind":"Field","name":{"kind":"Name","value":"notes"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"slug"}},{"kind":"Field","name":{"kind":"Name","value":"content"}},{"kind":"Field","name":{"kind":"Name","value":"noteType"}},{"kind":"Field","name":{"kind":"Name","value":"tags"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}}]}},{"kind":"Field","name":{"kind":"Name","value":"research"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"title"}},{"kind":"Field","name":{"kind":"Name","value":"authors"}},{"kind":"Field","name":{"kind":"Name","value":"year"}},{"kind":"Field","name":{"kind":"Name","value":"journal"}},{"kind":"Field","name":{"kind":"Name","value":"url"}}]}},{"kind":"Field","name":{"kind":"Name","value":"stories"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"goalId"}},{"kind":"Field","name":{"kind":"Name","value":"language"}},{"kind":"Field","name":{"kind":"Name","value":"minutes"}},{"kind":"Field","name":{"kind":"Name","value":"text"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}}]}},{"kind":"Field","name":{"kind":"Name","value":"userStories"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"goalId"}},{"kind":"Field","name":{"kind":"Name","value":"createdBy"}},{"kind":"Field","name":{"kind":"Name","value":"content"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}}]}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}}]}}]}}]} as unknown as DocumentNode<GetGoalQuery, GetGoalQueryVariables>;
export const GetGoalStoryDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"GetGoalStory"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"id"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"Int"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"goalStory"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"id"},"value":{"kind":"Variable","name":{"kind":"Name","value":"id"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"goalId"}},{"kind":"Field","name":{"kind":"Name","value":"language"}},{"kind":"Field","name":{"kind":"Name","value":"minutes"}},{"kind":"Field","name":{"kind":"Name","value":"text"}},{"kind":"Field","name":{"kind":"Name","value":"audioKey"}},{"kind":"Field","name":{"kind":"Name","value":"audioUrl"}},{"kind":"Field","name":{"kind":"Name","value":"audioGeneratedAt"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}}]}}]}}]} as unknown as DocumentNode<GetGoalStoryQuery, GetGoalStoryQueryVariables>;
export const GetGoalsDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"GetGoals"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"familyMemberId"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"Int"}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"status"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"goals"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"familyMemberId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"familyMemberId"}}},{"kind":"Argument","name":{"kind":"Name","value":"status"},"value":{"kind":"Variable","name":{"kind":"Name","value":"status"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"title"}},{"kind":"Field","name":{"kind":"Name","value":"description"}},{"kind":"Field","name":{"kind":"Name","value":"status"}},{"kind":"Field","name":{"kind":"Name","value":"familyMemberId"}},{"kind":"Field","name":{"kind":"Name","value":"familyMember"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"firstName"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"relationship"}}]}},{"kind":"Field","name":{"kind":"Name","value":"createdBy"}},{"kind":"Field","name":{"kind":"Name","value":"parentGoalId"}},{"kind":"Field","name":{"kind":"Name","value":"notes"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"slug"}},{"kind":"Field","name":{"kind":"Name","value":"noteType"}},{"kind":"Field","name":{"kind":"Name","value":"tags"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}}]}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}}]}}]}}]} as unknown as DocumentNode<GetGoalsQuery, GetGoalsQueryVariables>;
export const GetJournalEntriesDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"GetJournalEntries"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"familyMemberId"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"Int"}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"goalId"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"Int"}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"mood"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"fromDate"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"toDate"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"journalEntries"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"familyMemberId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"familyMemberId"}}},{"kind":"Argument","name":{"kind":"Name","value":"goalId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"goalId"}}},{"kind":"Argument","name":{"kind":"Name","value":"mood"},"value":{"kind":"Variable","name":{"kind":"Name","value":"mood"}}},{"kind":"Argument","name":{"kind":"Name","value":"fromDate"},"value":{"kind":"Variable","name":{"kind":"Name","value":"fromDate"}}},{"kind":"Argument","name":{"kind":"Name","value":"toDate"},"value":{"kind":"Variable","name":{"kind":"Name","value":"toDate"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"createdBy"}},{"kind":"Field","name":{"kind":"Name","value":"familyMemberId"}},{"kind":"Field","name":{"kind":"Name","value":"familyMember"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"firstName"}},{"kind":"Field","name":{"kind":"Name","value":"name"}}]}},{"kind":"Field","name":{"kind":"Name","value":"title"}},{"kind":"Field","name":{"kind":"Name","value":"content"}},{"kind":"Field","name":{"kind":"Name","value":"mood"}},{"kind":"Field","name":{"kind":"Name","value":"moodScore"}},{"kind":"Field","name":{"kind":"Name","value":"tags"}},{"kind":"Field","name":{"kind":"Name","value":"goalId"}},{"kind":"Field","name":{"kind":"Name","value":"goal"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"title"}}]}},{"kind":"Field","name":{"kind":"Name","value":"isPrivate"}},{"kind":"Field","name":{"kind":"Name","value":"entryDate"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}}]}}]}}]} as unknown as DocumentNode<GetJournalEntriesQuery, GetJournalEntriesQueryVariables>;
export const GetJournalEntryDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"GetJournalEntry"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"id"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"Int"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"journalEntry"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"id"},"value":{"kind":"Variable","name":{"kind":"Name","value":"id"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"createdBy"}},{"kind":"Field","name":{"kind":"Name","value":"familyMemberId"}},{"kind":"Field","name":{"kind":"Name","value":"familyMember"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"firstName"}},{"kind":"Field","name":{"kind":"Name","value":"name"}}]}},{"kind":"Field","name":{"kind":"Name","value":"title"}},{"kind":"Field","name":{"kind":"Name","value":"content"}},{"kind":"Field","name":{"kind":"Name","value":"mood"}},{"kind":"Field","name":{"kind":"Name","value":"moodScore"}},{"kind":"Field","name":{"kind":"Name","value":"tags"}},{"kind":"Field","name":{"kind":"Name","value":"goalId"}},{"kind":"Field","name":{"kind":"Name","value":"goal"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"title"}},{"kind":"Field","name":{"kind":"Name","value":"description"}}]}},{"kind":"Field","name":{"kind":"Name","value":"isPrivate"}},{"kind":"Field","name":{"kind":"Name","value":"entryDate"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}}]}}]}}]} as unknown as DocumentNode<GetJournalEntryQuery, GetJournalEntryQueryVariables>;
export const GetMySharedFamilyMembersDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"GetMySharedFamilyMembers"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"mySharedFamilyMembers"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"userId"}},{"kind":"Field","name":{"kind":"Name","value":"firstName"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"relationship"}},{"kind":"Field","name":{"kind":"Name","value":"email"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}}]}}]}}]} as unknown as DocumentNode<GetMySharedFamilyMembersQuery, GetMySharedFamilyMembersQueryVariables>;
export const GetNoteDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"GetNote"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"id"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"Int"}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"slug"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"note"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"id"},"value":{"kind":"Variable","name":{"kind":"Name","value":"id"}}},{"kind":"Argument","name":{"kind":"Name","value":"slug"},"value":{"kind":"Variable","name":{"kind":"Name","value":"slug"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"entityId"}},{"kind":"Field","name":{"kind":"Name","value":"entityType"}},{"kind":"Field","name":{"kind":"Name","value":"createdBy"}},{"kind":"Field","name":{"kind":"Name","value":"noteType"}},{"kind":"Field","name":{"kind":"Name","value":"slug"}},{"kind":"Field","name":{"kind":"Name","value":"title"}},{"kind":"Field","name":{"kind":"Name","value":"content"}},{"kind":"Field","name":{"kind":"Name","value":"createdBy"}},{"kind":"Field","name":{"kind":"Name","value":"tags"}},{"kind":"Field","name":{"kind":"Name","value":"goal"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"title"}},{"kind":"Field","name":{"kind":"Name","value":"description"}},{"kind":"Field","name":{"kind":"Name","value":"status"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}}]}},{"kind":"Field","name":{"kind":"Name","value":"linkedResearch"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"title"}},{"kind":"Field","name":{"kind":"Name","value":"authors"}},{"kind":"Field","name":{"kind":"Name","value":"year"}},{"kind":"Field","name":{"kind":"Name","value":"journal"}},{"kind":"Field","name":{"kind":"Name","value":"url"}},{"kind":"Field","name":{"kind":"Name","value":"therapeuticGoalType"}},{"kind":"Field","name":{"kind":"Name","value":"relevanceScore"}}]}},{"kind":"Field","name":{"kind":"Name","value":"claimCards"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"claim"}},{"kind":"Field","name":{"kind":"Name","value":"verdict"}},{"kind":"Field","name":{"kind":"Name","value":"confidence"}},{"kind":"Field","name":{"kind":"Name","value":"scope"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"population"}},{"kind":"Field","name":{"kind":"Name","value":"intervention"}},{"kind":"Field","name":{"kind":"Name","value":"comparator"}},{"kind":"Field","name":{"kind":"Name","value":"outcome"}},{"kind":"Field","name":{"kind":"Name","value":"timeframe"}},{"kind":"Field","name":{"kind":"Name","value":"setting"}}]}},{"kind":"Field","name":{"kind":"Name","value":"evidence"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"polarity"}},{"kind":"Field","name":{"kind":"Name","value":"score"}},{"kind":"Field","name":{"kind":"Name","value":"excerpt"}},{"kind":"Field","name":{"kind":"Name","value":"rationale"}},{"kind":"Field","name":{"kind":"Name","value":"locator"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"page"}},{"kind":"Field","name":{"kind":"Name","value":"section"}},{"kind":"Field","name":{"kind":"Name","value":"url"}}]}},{"kind":"Field","name":{"kind":"Name","value":"paper"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"title"}},{"kind":"Field","name":{"kind":"Name","value":"year"}},{"kind":"Field","name":{"kind":"Name","value":"doi"}},{"kind":"Field","name":{"kind":"Name","value":"url"}},{"kind":"Field","name":{"kind":"Name","value":"oaUrl"}},{"kind":"Field","name":{"kind":"Name","value":"source"}},{"kind":"Field","name":{"kind":"Name","value":"authors"}},{"kind":"Field","name":{"kind":"Name","value":"abstract"}},{"kind":"Field","name":{"kind":"Name","value":"journal"}}]}}]}},{"kind":"Field","name":{"kind":"Name","value":"queries"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}},{"kind":"Field","name":{"kind":"Name","value":"provenance"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"generatedBy"}},{"kind":"Field","name":{"kind":"Name","value":"model"}},{"kind":"Field","name":{"kind":"Name","value":"sourceTools"}}]}},{"kind":"Field","name":{"kind":"Name","value":"notes"}}]}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}}]}}]}}]} as unknown as DocumentNode<GetNoteQuery, GetNoteQueryVariables>;
export const GetNotesDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"GetNotes"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"entityId"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"Int"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"entityType"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"notes"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"entityId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"entityId"}}},{"kind":"Argument","name":{"kind":"Name","value":"entityType"},"value":{"kind":"Variable","name":{"kind":"Name","value":"entityType"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"entityId"}},{"kind":"Field","name":{"kind":"Name","value":"entityType"}},{"kind":"Field","name":{"kind":"Name","value":"createdBy"}},{"kind":"Field","name":{"kind":"Name","value":"noteType"}},{"kind":"Field","name":{"kind":"Name","value":"slug"}},{"kind":"Field","name":{"kind":"Name","value":"title"}},{"kind":"Field","name":{"kind":"Name","value":"content"}},{"kind":"Field","name":{"kind":"Name","value":"createdBy"}},{"kind":"Field","name":{"kind":"Name","value":"tags"}},{"kind":"Field","name":{"kind":"Name","value":"goal"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"title"}},{"kind":"Field","name":{"kind":"Name","value":"description"}},{"kind":"Field","name":{"kind":"Name","value":"status"}}]}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}}]}}]}}]} as unknown as DocumentNode<GetNotesQuery, GetNotesQueryVariables>;
export const GetRelationshipDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"GetRelationship"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"id"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"Int"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"relationship"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"id"},"value":{"kind":"Variable","name":{"kind":"Name","value":"id"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"createdBy"}},{"kind":"Field","name":{"kind":"Name","value":"subjectType"}},{"kind":"Field","name":{"kind":"Name","value":"subjectId"}},{"kind":"Field","name":{"kind":"Name","value":"relatedType"}},{"kind":"Field","name":{"kind":"Name","value":"relatedId"}},{"kind":"Field","name":{"kind":"Name","value":"relationshipType"}},{"kind":"Field","name":{"kind":"Name","value":"context"}},{"kind":"Field","name":{"kind":"Name","value":"startDate"}},{"kind":"Field","name":{"kind":"Name","value":"status"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}},{"kind":"Field","name":{"kind":"Name","value":"subject"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"type"}},{"kind":"Field","name":{"kind":"Name","value":"firstName"}},{"kind":"Field","name":{"kind":"Name","value":"lastName"}}]}},{"kind":"Field","name":{"kind":"Name","value":"related"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"type"}},{"kind":"Field","name":{"kind":"Name","value":"firstName"}},{"kind":"Field","name":{"kind":"Name","value":"lastName"}}]}}]}}]}}]} as unknown as DocumentNode<GetRelationshipQuery, GetRelationshipQueryVariables>;
export const GetRelationshipsDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"GetRelationships"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"subjectType"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"PersonType"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"subjectId"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"Int"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"relationships"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"subjectType"},"value":{"kind":"Variable","name":{"kind":"Name","value":"subjectType"}}},{"kind":"Argument","name":{"kind":"Name","value":"subjectId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"subjectId"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"createdBy"}},{"kind":"Field","name":{"kind":"Name","value":"subjectType"}},{"kind":"Field","name":{"kind":"Name","value":"subjectId"}},{"kind":"Field","name":{"kind":"Name","value":"relatedType"}},{"kind":"Field","name":{"kind":"Name","value":"relatedId"}},{"kind":"Field","name":{"kind":"Name","value":"relationshipType"}},{"kind":"Field","name":{"kind":"Name","value":"context"}},{"kind":"Field","name":{"kind":"Name","value":"startDate"}},{"kind":"Field","name":{"kind":"Name","value":"status"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}},{"kind":"Field","name":{"kind":"Name","value":"subject"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"type"}},{"kind":"Field","name":{"kind":"Name","value":"firstName"}},{"kind":"Field","name":{"kind":"Name","value":"lastName"}}]}},{"kind":"Field","name":{"kind":"Name","value":"related"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"type"}},{"kind":"Field","name":{"kind":"Name","value":"firstName"}},{"kind":"Field","name":{"kind":"Name","value":"lastName"}}]}}]}}]}}]} as unknown as DocumentNode<GetRelationshipsQuery, GetRelationshipsQueryVariables>;
export const GetStoriesDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"GetStories"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"goalId"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"Int"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"stories"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"goalId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"goalId"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"goalId"}},{"kind":"Field","name":{"kind":"Name","value":"createdBy"}},{"kind":"Field","name":{"kind":"Name","value":"content"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}}]}}]}}]} as unknown as DocumentNode<GetStoriesQuery, GetStoriesQueryVariables>;
export const GetStoryDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"GetStory"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"id"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"Int"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"story"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"id"},"value":{"kind":"Variable","name":{"kind":"Name","value":"id"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"goalId"}},{"kind":"Field","name":{"kind":"Name","value":"createdBy"}},{"kind":"Field","name":{"kind":"Name","value":"content"}},{"kind":"Field","name":{"kind":"Name","value":"audioKey"}},{"kind":"Field","name":{"kind":"Name","value":"audioUrl"}},{"kind":"Field","name":{"kind":"Name","value":"audioGeneratedAt"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}},{"kind":"Field","name":{"kind":"Name","value":"goal"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"title"}},{"kind":"Field","name":{"kind":"Name","value":"slug"}}]}}]}}]}}]} as unknown as DocumentNode<GetStoryQuery, GetStoryQueryVariables>;
export const ShareFamilyMemberDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"ShareFamilyMember"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"familyMemberId"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"Int"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"email"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"role"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"FamilyMemberShareRole"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"shareFamilyMember"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"familyMemberId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"familyMemberId"}}},{"kind":"Argument","name":{"kind":"Name","value":"email"},"value":{"kind":"Variable","name":{"kind":"Name","value":"email"}}},{"kind":"Argument","name":{"kind":"Name","value":"role"},"value":{"kind":"Variable","name":{"kind":"Name","value":"role"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"familyMemberId"}},{"kind":"Field","name":{"kind":"Name","value":"email"}},{"kind":"Field","name":{"kind":"Name","value":"role"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}}]}}]}}]} as unknown as DocumentNode<ShareFamilyMemberMutation, ShareFamilyMemberMutationVariables>;
export const UnshareFamilyMemberDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"UnshareFamilyMember"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"familyMemberId"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"Int"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"email"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"unshareFamilyMember"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"familyMemberId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"familyMemberId"}}},{"kind":"Argument","name":{"kind":"Name","value":"email"},"value":{"kind":"Variable","name":{"kind":"Name","value":"email"}}}]}]}}]} as unknown as DocumentNode<UnshareFamilyMemberMutation, UnshareFamilyMemberMutationVariables>;
export const UpdateBehaviorObservationDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"UpdateBehaviorObservation"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"id"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"Int"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"input"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"UpdateBehaviorObservationInput"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"updateBehaviorObservation"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"id"},"value":{"kind":"Variable","name":{"kind":"Name","value":"id"}}},{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"Variable","name":{"kind":"Name","value":"input"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"familyMemberId"}},{"kind":"Field","name":{"kind":"Name","value":"goalId"}},{"kind":"Field","name":{"kind":"Name","value":"createdBy"}},{"kind":"Field","name":{"kind":"Name","value":"observedAt"}},{"kind":"Field","name":{"kind":"Name","value":"observationType"}},{"kind":"Field","name":{"kind":"Name","value":"frequency"}},{"kind":"Field","name":{"kind":"Name","value":"intensity"}},{"kind":"Field","name":{"kind":"Name","value":"context"}},{"kind":"Field","name":{"kind":"Name","value":"notes"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}}]}}]}}]} as unknown as DocumentNode<UpdateBehaviorObservationMutation, UpdateBehaviorObservationMutationVariables>;
export const UpdateContactDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"UpdateContact"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"id"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"Int"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"input"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"UpdateContactInput"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"updateContact"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"id"},"value":{"kind":"Variable","name":{"kind":"Name","value":"id"}}},{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"Variable","name":{"kind":"Name","value":"input"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"createdBy"}},{"kind":"Field","name":{"kind":"Name","value":"firstName"}},{"kind":"Field","name":{"kind":"Name","value":"lastName"}},{"kind":"Field","name":{"kind":"Name","value":"role"}},{"kind":"Field","name":{"kind":"Name","value":"ageYears"}},{"kind":"Field","name":{"kind":"Name","value":"notes"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}}]}}]}}]} as unknown as DocumentNode<UpdateContactMutation, UpdateContactMutationVariables>;
export const UpdateFamilyMemberDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"UpdateFamilyMember"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"id"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"Int"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"input"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"UpdateFamilyMemberInput"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"updateFamilyMember"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"id"},"value":{"kind":"Variable","name":{"kind":"Name","value":"id"}}},{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"Variable","name":{"kind":"Name","value":"input"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"firstName"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"relationship"}},{"kind":"Field","name":{"kind":"Name","value":"email"}},{"kind":"Field","name":{"kind":"Name","value":"phone"}},{"kind":"Field","name":{"kind":"Name","value":"location"}},{"kind":"Field","name":{"kind":"Name","value":"occupation"}},{"kind":"Field","name":{"kind":"Name","value":"ageYears"}},{"kind":"Field","name":{"kind":"Name","value":"dateOfBirth"}},{"kind":"Field","name":{"kind":"Name","value":"bio"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}}]}}]}}]} as unknown as DocumentNode<UpdateFamilyMemberMutation, UpdateFamilyMemberMutationVariables>;
export const UpdateFamilyMemberCharacteristicDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"UpdateFamilyMemberCharacteristic"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"id"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"Int"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"input"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"UpdateFamilyMemberCharacteristicInput"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"updateFamilyMemberCharacteristic"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"id"},"value":{"kind":"Variable","name":{"kind":"Name","value":"id"}}},{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"Variable","name":{"kind":"Name","value":"input"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"familyMemberId"}},{"kind":"Field","name":{"kind":"Name","value":"createdBy"}},{"kind":"Field","name":{"kind":"Name","value":"category"}},{"kind":"Field","name":{"kind":"Name","value":"title"}},{"kind":"Field","name":{"kind":"Name","value":"description"}},{"kind":"Field","name":{"kind":"Name","value":"severity"}},{"kind":"Field","name":{"kind":"Name","value":"frequencyPerWeek"}},{"kind":"Field","name":{"kind":"Name","value":"durationWeeks"}},{"kind":"Field","name":{"kind":"Name","value":"ageOfOnset"}},{"kind":"Field","name":{"kind":"Name","value":"impairmentDomains"}},{"kind":"Field","name":{"kind":"Name","value":"formulationStatus"}},{"kind":"Field","name":{"kind":"Name","value":"externalizedName"}},{"kind":"Field","name":{"kind":"Name","value":"strengths"}},{"kind":"Field","name":{"kind":"Name","value":"riskTier"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}}]}}]}}]} as unknown as DocumentNode<UpdateFamilyMemberCharacteristicMutation, UpdateFamilyMemberCharacteristicMutationVariables>;
export const UpdateGoalDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"UpdateGoal"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"id"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"Int"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"input"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"UpdateGoalInput"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"updateGoal"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"id"},"value":{"kind":"Variable","name":{"kind":"Name","value":"id"}}},{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"Variable","name":{"kind":"Name","value":"input"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"slug"}},{"kind":"Field","name":{"kind":"Name","value":"title"}},{"kind":"Field","name":{"kind":"Name","value":"description"}},{"kind":"Field","name":{"kind":"Name","value":"status"}},{"kind":"Field","name":{"kind":"Name","value":"familyMemberId"}},{"kind":"Field","name":{"kind":"Name","value":"familyMember"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"firstName"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"relationship"}}]}},{"kind":"Field","name":{"kind":"Name","value":"storyLanguage"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}}]}}]}}]} as unknown as DocumentNode<UpdateGoalMutation, UpdateGoalMutationVariables>;
export const UpdateJournalEntryDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"UpdateJournalEntry"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"id"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"Int"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"input"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"UpdateJournalEntryInput"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"updateJournalEntry"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"id"},"value":{"kind":"Variable","name":{"kind":"Name","value":"id"}}},{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"Variable","name":{"kind":"Name","value":"input"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"createdBy"}},{"kind":"Field","name":{"kind":"Name","value":"familyMemberId"}},{"kind":"Field","name":{"kind":"Name","value":"title"}},{"kind":"Field","name":{"kind":"Name","value":"content"}},{"kind":"Field","name":{"kind":"Name","value":"mood"}},{"kind":"Field","name":{"kind":"Name","value":"moodScore"}},{"kind":"Field","name":{"kind":"Name","value":"tags"}},{"kind":"Field","name":{"kind":"Name","value":"goalId"}},{"kind":"Field","name":{"kind":"Name","value":"isPrivate"}},{"kind":"Field","name":{"kind":"Name","value":"entryDate"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}}]}}]}}]} as unknown as DocumentNode<UpdateJournalEntryMutation, UpdateJournalEntryMutationVariables>;
export const UpdateNoteDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"UpdateNote"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"id"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"Int"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"input"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"UpdateNoteInput"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"updateNote"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"id"},"value":{"kind":"Variable","name":{"kind":"Name","value":"id"}}},{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"Variable","name":{"kind":"Name","value":"input"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"entityId"}},{"kind":"Field","name":{"kind":"Name","value":"entityType"}},{"kind":"Field","name":{"kind":"Name","value":"createdBy"}},{"kind":"Field","name":{"kind":"Name","value":"noteType"}},{"kind":"Field","name":{"kind":"Name","value":"content"}},{"kind":"Field","name":{"kind":"Name","value":"createdBy"}},{"kind":"Field","name":{"kind":"Name","value":"tags"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}}]}}]}}]} as unknown as DocumentNode<UpdateNoteMutation, UpdateNoteMutationVariables>;
export const UpdateRelationshipDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"UpdateRelationship"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"id"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"Int"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"input"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"UpdateRelationshipInput"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"updateRelationship"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"id"},"value":{"kind":"Variable","name":{"kind":"Name","value":"id"}}},{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"Variable","name":{"kind":"Name","value":"input"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"createdBy"}},{"kind":"Field","name":{"kind":"Name","value":"subjectType"}},{"kind":"Field","name":{"kind":"Name","value":"subjectId"}},{"kind":"Field","name":{"kind":"Name","value":"relatedType"}},{"kind":"Field","name":{"kind":"Name","value":"relatedId"}},{"kind":"Field","name":{"kind":"Name","value":"relationshipType"}},{"kind":"Field","name":{"kind":"Name","value":"context"}},{"kind":"Field","name":{"kind":"Name","value":"startDate"}},{"kind":"Field","name":{"kind":"Name","value":"status"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}}]}}]}}]} as unknown as DocumentNode<UpdateRelationshipMutation, UpdateRelationshipMutationVariables>;
export const UpdateStoryDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"UpdateStory"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"id"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"Int"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"input"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"UpdateStoryInput"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"updateStory"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"id"},"value":{"kind":"Variable","name":{"kind":"Name","value":"id"}}},{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"Variable","name":{"kind":"Name","value":"input"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"goalId"}},{"kind":"Field","name":{"kind":"Name","value":"createdBy"}},{"kind":"Field","name":{"kind":"Name","value":"content"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}}]}}]}}]} as unknown as DocumentNode<UpdateStoryMutation, UpdateStoryMutationVariables>;
export const UpdateUniqueOutcomeDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"UpdateUniqueOutcome"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"id"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"Int"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"input"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"UpdateUniqueOutcomeInput"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"updateUniqueOutcome"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"id"},"value":{"kind":"Variable","name":{"kind":"Name","value":"id"}}},{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"Variable","name":{"kind":"Name","value":"input"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"characteristicId"}},{"kind":"Field","name":{"kind":"Name","value":"createdBy"}},{"kind":"Field","name":{"kind":"Name","value":"observedAt"}},{"kind":"Field","name":{"kind":"Name","value":"description"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}}]}}]}}]} as unknown as DocumentNode<UpdateUniqueOutcomeMutation, UpdateUniqueOutcomeMutationVariables>;
export const GetUserSettingsDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"GetUserSettings"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"userSettings"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"userId"}},{"kind":"Field","name":{"kind":"Name","value":"storyLanguage"}},{"kind":"Field","name":{"kind":"Name","value":"storyMinutes"}}]}}]}}]} as unknown as DocumentNode<GetUserSettingsQuery, GetUserSettingsQueryVariables>;
export const UpdateUserSettingsDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"UpdateUserSettings"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"storyLanguage"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"storyMinutes"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"Int"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"updateUserSettings"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"storyLanguage"},"value":{"kind":"Variable","name":{"kind":"Name","value":"storyLanguage"}}},{"kind":"Argument","name":{"kind":"Name","value":"storyMinutes"},"value":{"kind":"Variable","name":{"kind":"Name","value":"storyMinutes"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"userId"}},{"kind":"Field","name":{"kind":"Name","value":"storyLanguage"}},{"kind":"Field","name":{"kind":"Name","value":"storyMinutes"}}]}}]}}]} as unknown as DocumentNode<UpdateUserSettingsMutation, UpdateUserSettingsMutationVariables>;