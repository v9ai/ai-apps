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
export const CreateBehaviorObservationDocument = gql`
    mutation CreateBehaviorObservation($input: CreateBehaviorObservationInput!) {
  createBehaviorObservation(input: $input) {
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
export type CreateBehaviorObservationMutationFn = Apollo.MutationFunction<CreateBehaviorObservationMutation, CreateBehaviorObservationMutationVariables>;

/**
 * __useCreateBehaviorObservationMutation__
 *
 * To run a mutation, you first call `useCreateBehaviorObservationMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useCreateBehaviorObservationMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [createBehaviorObservationMutation, { data, loading, error }] = useCreateBehaviorObservationMutation({
 *   variables: {
 *      input: // value for 'input'
 *   },
 * });
 */
export function useCreateBehaviorObservationMutation(baseOptions?: Apollo.MutationHookOptions<CreateBehaviorObservationMutation, CreateBehaviorObservationMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<CreateBehaviorObservationMutation, CreateBehaviorObservationMutationVariables>(CreateBehaviorObservationDocument, options);
      }
export type CreateBehaviorObservationMutationHookResult = ReturnType<typeof useCreateBehaviorObservationMutation>;
export type CreateBehaviorObservationMutationResult = Apollo.MutationResult<CreateBehaviorObservationMutation>;
export type CreateBehaviorObservationMutationOptions = Apollo.BaseMutationOptions<CreateBehaviorObservationMutation, CreateBehaviorObservationMutationVariables>;
export const CreateContactDocument = gql`
    mutation CreateContact($input: CreateContactInput!) {
  createContact(input: $input) {
    id
    createdBy
    firstName
    lastName
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
export const CreateFamilyMemberCharacteristicDocument = gql`
    mutation CreateFamilyMemberCharacteristic($input: CreateFamilyMemberCharacteristicInput!) {
  createFamilyMemberCharacteristic(input: $input) {
    id
    familyMemberId
    createdBy
    category
    title
    description
    severity
    frequencyPerWeek
    durationWeeks
    ageOfOnset
    impairmentDomains
    formulationStatus
    externalizedName
    strengths
    riskTier
    createdAt
    updatedAt
  }
}
    `;
export type CreateFamilyMemberCharacteristicMutationFn = Apollo.MutationFunction<CreateFamilyMemberCharacteristicMutation, CreateFamilyMemberCharacteristicMutationVariables>;

/**
 * __useCreateFamilyMemberCharacteristicMutation__
 *
 * To run a mutation, you first call `useCreateFamilyMemberCharacteristicMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useCreateFamilyMemberCharacteristicMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [createFamilyMemberCharacteristicMutation, { data, loading, error }] = useCreateFamilyMemberCharacteristicMutation({
 *   variables: {
 *      input: // value for 'input'
 *   },
 * });
 */
export function useCreateFamilyMemberCharacteristicMutation(baseOptions?: Apollo.MutationHookOptions<CreateFamilyMemberCharacteristicMutation, CreateFamilyMemberCharacteristicMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<CreateFamilyMemberCharacteristicMutation, CreateFamilyMemberCharacteristicMutationVariables>(CreateFamilyMemberCharacteristicDocument, options);
      }
export type CreateFamilyMemberCharacteristicMutationHookResult = ReturnType<typeof useCreateFamilyMemberCharacteristicMutation>;
export type CreateFamilyMemberCharacteristicMutationResult = Apollo.MutationResult<CreateFamilyMemberCharacteristicMutation>;
export type CreateFamilyMemberCharacteristicMutationOptions = Apollo.BaseMutationOptions<CreateFamilyMemberCharacteristicMutation, CreateFamilyMemberCharacteristicMutationVariables>;
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
export const CreateUniqueOutcomeDocument = gql`
    mutation CreateUniqueOutcome($input: CreateUniqueOutcomeInput!) {
  createUniqueOutcome(input: $input) {
    id
    characteristicId
    createdBy
    observedAt
    description
    createdAt
    updatedAt
  }
}
    `;
export type CreateUniqueOutcomeMutationFn = Apollo.MutationFunction<CreateUniqueOutcomeMutation, CreateUniqueOutcomeMutationVariables>;

/**
 * __useCreateUniqueOutcomeMutation__
 *
 * To run a mutation, you first call `useCreateUniqueOutcomeMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useCreateUniqueOutcomeMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [createUniqueOutcomeMutation, { data, loading, error }] = useCreateUniqueOutcomeMutation({
 *   variables: {
 *      input: // value for 'input'
 *   },
 * });
 */
export function useCreateUniqueOutcomeMutation(baseOptions?: Apollo.MutationHookOptions<CreateUniqueOutcomeMutation, CreateUniqueOutcomeMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<CreateUniqueOutcomeMutation, CreateUniqueOutcomeMutationVariables>(CreateUniqueOutcomeDocument, options);
      }
export type CreateUniqueOutcomeMutationHookResult = ReturnType<typeof useCreateUniqueOutcomeMutation>;
export type CreateUniqueOutcomeMutationResult = Apollo.MutationResult<CreateUniqueOutcomeMutation>;
export type CreateUniqueOutcomeMutationOptions = Apollo.BaseMutationOptions<CreateUniqueOutcomeMutation, CreateUniqueOutcomeMutationVariables>;
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
export const DeleteFamilyMemberCharacteristicDocument = gql`
    mutation DeleteFamilyMemberCharacteristic($id: Int!) {
  deleteFamilyMemberCharacteristic(id: $id) {
    success
    message
  }
}
    `;
export type DeleteFamilyMemberCharacteristicMutationFn = Apollo.MutationFunction<DeleteFamilyMemberCharacteristicMutation, DeleteFamilyMemberCharacteristicMutationVariables>;

/**
 * __useDeleteFamilyMemberCharacteristicMutation__
 *
 * To run a mutation, you first call `useDeleteFamilyMemberCharacteristicMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useDeleteFamilyMemberCharacteristicMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [deleteFamilyMemberCharacteristicMutation, { data, loading, error }] = useDeleteFamilyMemberCharacteristicMutation({
 *   variables: {
 *      id: // value for 'id'
 *   },
 * });
 */
export function useDeleteFamilyMemberCharacteristicMutation(baseOptions?: Apollo.MutationHookOptions<DeleteFamilyMemberCharacteristicMutation, DeleteFamilyMemberCharacteristicMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<DeleteFamilyMemberCharacteristicMutation, DeleteFamilyMemberCharacteristicMutationVariables>(DeleteFamilyMemberCharacteristicDocument, options);
      }
export type DeleteFamilyMemberCharacteristicMutationHookResult = ReturnType<typeof useDeleteFamilyMemberCharacteristicMutation>;
export type DeleteFamilyMemberCharacteristicMutationResult = Apollo.MutationResult<DeleteFamilyMemberCharacteristicMutation>;
export type DeleteFamilyMemberCharacteristicMutationOptions = Apollo.BaseMutationOptions<DeleteFamilyMemberCharacteristicMutation, DeleteFamilyMemberCharacteristicMutationVariables>;
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
export const DeleteUniqueOutcomeDocument = gql`
    mutation DeleteUniqueOutcome($id: Int!) {
  deleteUniqueOutcome(id: $id) {
    success
    message
  }
}
    `;
export type DeleteUniqueOutcomeMutationFn = Apollo.MutationFunction<DeleteUniqueOutcomeMutation, DeleteUniqueOutcomeMutationVariables>;

/**
 * __useDeleteUniqueOutcomeMutation__
 *
 * To run a mutation, you first call `useDeleteUniqueOutcomeMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useDeleteUniqueOutcomeMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [deleteUniqueOutcomeMutation, { data, loading, error }] = useDeleteUniqueOutcomeMutation({
 *   variables: {
 *      id: // value for 'id'
 *   },
 * });
 */
export function useDeleteUniqueOutcomeMutation(baseOptions?: Apollo.MutationHookOptions<DeleteUniqueOutcomeMutation, DeleteUniqueOutcomeMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<DeleteUniqueOutcomeMutation, DeleteUniqueOutcomeMutationVariables>(DeleteUniqueOutcomeDocument, options);
      }
export type DeleteUniqueOutcomeMutationHookResult = ReturnType<typeof useDeleteUniqueOutcomeMutation>;
export type DeleteUniqueOutcomeMutationResult = Apollo.MutationResult<DeleteUniqueOutcomeMutation>;
export type DeleteUniqueOutcomeMutationOptions = Apollo.BaseMutationOptions<DeleteUniqueOutcomeMutation, DeleteUniqueOutcomeMutationVariables>;
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
export const GenerateLongFormTextDocument = gql`
    mutation GenerateLongFormText($goalId: Int!, $characteristicId: Int, $language: String, $minutes: Int) {
  generateLongFormText(
    goalId: $goalId
    characteristicId: $characteristicId
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
 *      characteristicId: // value for 'characteristicId'
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
export const GenerateResearchDocument = gql`
    mutation GenerateResearch($goalId: Int!) {
  generateResearch(goalId: $goalId) {
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
export const GetAllStoriesDocument = gql`
    query GetAllStories {
  allStories {
    id
    goalId
    createdBy
    content
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
export const GetContactDocument = gql`
    query GetContact($id: Int!) {
  contact(id: $id) {
    id
    createdBy
    firstName
    lastName
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
export const GetContactsDocument = gql`
    query GetContacts {
  contacts {
    id
    createdBy
    firstName
    lastName
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
export const GetFamilyMemberDocument = gql`
    query GetFamilyMember($id: Int!) {
  familyMember(id: $id) {
    id
    userId
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
      observedAt
      observationType
      frequency
      intensity
      context
      notes
      createdAt
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
 *   },
 * });
 */
export function useGetFamilyMemberQuery(baseOptions: Apollo.QueryHookOptions<GetFamilyMemberQuery, GetFamilyMemberQueryVariables> & ({ variables: GetFamilyMemberQueryVariables; skip?: boolean; } | { skip: boolean; }) ) {
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
export const GetFamilyMemberCharacteristicDocument = gql`
    query GetFamilyMemberCharacteristic($id: Int!) {
  familyMemberCharacteristic(id: $id) {
    id
    familyMemberId
    createdBy
    category
    title
    description
    severity
    frequencyPerWeek
    durationWeeks
    ageOfOnset
    impairmentDomains
    formulationStatus
    externalizedName
    strengths
    riskTier
    uniqueOutcomes {
      id
      characteristicId
      createdBy
      observedAt
      description
      createdAt
      updatedAt
    }
    behaviorObservations {
      id
      familyMemberId
      goalId
      characteristicId
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
    createdAt
    updatedAt
  }
}
    `;

/**
 * __useGetFamilyMemberCharacteristicQuery__
 *
 * To run a query within a React component, call `useGetFamilyMemberCharacteristicQuery` and pass it any options that fit your needs.
 * When your component renders, `useGetFamilyMemberCharacteristicQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useGetFamilyMemberCharacteristicQuery({
 *   variables: {
 *      id: // value for 'id'
 *   },
 * });
 */
export function useGetFamilyMemberCharacteristicQuery(baseOptions: Apollo.QueryHookOptions<GetFamilyMemberCharacteristicQuery, GetFamilyMemberCharacteristicQueryVariables> & ({ variables: GetFamilyMemberCharacteristicQueryVariables; skip?: boolean; } | { skip: boolean; }) ) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<GetFamilyMemberCharacteristicQuery, GetFamilyMemberCharacteristicQueryVariables>(GetFamilyMemberCharacteristicDocument, options);
      }
export function useGetFamilyMemberCharacteristicLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<GetFamilyMemberCharacteristicQuery, GetFamilyMemberCharacteristicQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<GetFamilyMemberCharacteristicQuery, GetFamilyMemberCharacteristicQueryVariables>(GetFamilyMemberCharacteristicDocument, options);
        }
// @ts-ignore
export function useGetFamilyMemberCharacteristicSuspenseQuery(baseOptions?: Apollo.SuspenseQueryHookOptions<GetFamilyMemberCharacteristicQuery, GetFamilyMemberCharacteristicQueryVariables>): Apollo.UseSuspenseQueryResult<GetFamilyMemberCharacteristicQuery, GetFamilyMemberCharacteristicQueryVariables>;
export function useGetFamilyMemberCharacteristicSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<GetFamilyMemberCharacteristicQuery, GetFamilyMemberCharacteristicQueryVariables>): Apollo.UseSuspenseQueryResult<GetFamilyMemberCharacteristicQuery | undefined, GetFamilyMemberCharacteristicQueryVariables>;
export function useGetFamilyMemberCharacteristicSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<GetFamilyMemberCharacteristicQuery, GetFamilyMemberCharacteristicQueryVariables>) {
          const options = baseOptions === Apollo.skipToken ? baseOptions : {...defaultOptions, ...baseOptions}
          return Apollo.useSuspenseQuery<GetFamilyMemberCharacteristicQuery, GetFamilyMemberCharacteristicQueryVariables>(GetFamilyMemberCharacteristicDocument, options);
        }
export type GetFamilyMemberCharacteristicQueryHookResult = ReturnType<typeof useGetFamilyMemberCharacteristicQuery>;
export type GetFamilyMemberCharacteristicLazyQueryHookResult = ReturnType<typeof useGetFamilyMemberCharacteristicLazyQuery>;
export type GetFamilyMemberCharacteristicSuspenseQueryHookResult = ReturnType<typeof useGetFamilyMemberCharacteristicSuspenseQuery>;
export type GetFamilyMemberCharacteristicQueryResult = Apollo.QueryResult<GetFamilyMemberCharacteristicQuery, GetFamilyMemberCharacteristicQueryVariables>;
export const GetFamilyMemberCharacteristicsDocument = gql`
    query GetFamilyMemberCharacteristics($familyMemberId: Int!, $category: CharacteristicCategory) {
  familyMemberCharacteristics(
    familyMemberId: $familyMemberId
    category: $category
  ) {
    id
    familyMemberId
    createdBy
    category
    title
    description
    createdAt
    updatedAt
  }
}
    `;

/**
 * __useGetFamilyMemberCharacteristicsQuery__
 *
 * To run a query within a React component, call `useGetFamilyMemberCharacteristicsQuery` and pass it any options that fit your needs.
 * When your component renders, `useGetFamilyMemberCharacteristicsQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useGetFamilyMemberCharacteristicsQuery({
 *   variables: {
 *      familyMemberId: // value for 'familyMemberId'
 *      category: // value for 'category'
 *   },
 * });
 */
export function useGetFamilyMemberCharacteristicsQuery(baseOptions: Apollo.QueryHookOptions<GetFamilyMemberCharacteristicsQuery, GetFamilyMemberCharacteristicsQueryVariables> & ({ variables: GetFamilyMemberCharacteristicsQueryVariables; skip?: boolean; } | { skip: boolean; }) ) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<GetFamilyMemberCharacteristicsQuery, GetFamilyMemberCharacteristicsQueryVariables>(GetFamilyMemberCharacteristicsDocument, options);
      }
export function useGetFamilyMemberCharacteristicsLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<GetFamilyMemberCharacteristicsQuery, GetFamilyMemberCharacteristicsQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<GetFamilyMemberCharacteristicsQuery, GetFamilyMemberCharacteristicsQueryVariables>(GetFamilyMemberCharacteristicsDocument, options);
        }
// @ts-ignore
export function useGetFamilyMemberCharacteristicsSuspenseQuery(baseOptions?: Apollo.SuspenseQueryHookOptions<GetFamilyMemberCharacteristicsQuery, GetFamilyMemberCharacteristicsQueryVariables>): Apollo.UseSuspenseQueryResult<GetFamilyMemberCharacteristicsQuery, GetFamilyMemberCharacteristicsQueryVariables>;
export function useGetFamilyMemberCharacteristicsSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<GetFamilyMemberCharacteristicsQuery, GetFamilyMemberCharacteristicsQueryVariables>): Apollo.UseSuspenseQueryResult<GetFamilyMemberCharacteristicsQuery | undefined, GetFamilyMemberCharacteristicsQueryVariables>;
export function useGetFamilyMemberCharacteristicsSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<GetFamilyMemberCharacteristicsQuery, GetFamilyMemberCharacteristicsQueryVariables>) {
          const options = baseOptions === Apollo.skipToken ? baseOptions : {...defaultOptions, ...baseOptions}
          return Apollo.useSuspenseQuery<GetFamilyMemberCharacteristicsQuery, GetFamilyMemberCharacteristicsQueryVariables>(GetFamilyMemberCharacteristicsDocument, options);
        }
export type GetFamilyMemberCharacteristicsQueryHookResult = ReturnType<typeof useGetFamilyMemberCharacteristicsQuery>;
export type GetFamilyMemberCharacteristicsLazyQueryHookResult = ReturnType<typeof useGetFamilyMemberCharacteristicsLazyQuery>;
export type GetFamilyMemberCharacteristicsSuspenseQueryHookResult = ReturnType<typeof useGetFamilyMemberCharacteristicsSuspenseQuery>;
export type GetFamilyMemberCharacteristicsQueryResult = Apollo.QueryResult<GetFamilyMemberCharacteristicsQuery, GetFamilyMemberCharacteristicsQueryVariables>;
export const GetFamilyMembersDocument = gql`
    query GetFamilyMembers {
  familyMembers {
    id
    userId
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
    createdAt
    updatedAt
    shares {
      familyMemberId
      email
      role
      createdAt
      createdBy
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
export const GetGenerationJobDocument = gql`
    query GetGenerationJob($id: String!) {
  generationJob(id: $id) {
    id
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
    familyMemberId
    familyMember {
      id
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
    research {
      id
      title
      authors
      year
      journal
      url
    }
    stories {
      id
      goalId
      language
      minutes
      text
      createdAt
      updatedAt
    }
    userStories {
      id
      goalId
      createdBy
      content
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
export const GetGoalStoryDocument = gql`
    query GetGoalStory($id: Int!) {
  goalStory(id: $id) {
    id
    goalId
    language
    minutes
    text
    audioKey
    audioUrl
    audioGeneratedAt
    createdAt
    updatedAt
  }
}
    `;

/**
 * __useGetGoalStoryQuery__
 *
 * To run a query within a React component, call `useGetGoalStoryQuery` and pass it any options that fit your needs.
 * When your component renders, `useGetGoalStoryQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useGetGoalStoryQuery({
 *   variables: {
 *      id: // value for 'id'
 *   },
 * });
 */
export function useGetGoalStoryQuery(baseOptions: Apollo.QueryHookOptions<GetGoalStoryQuery, GetGoalStoryQueryVariables> & ({ variables: GetGoalStoryQueryVariables; skip?: boolean; } | { skip: boolean; }) ) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<GetGoalStoryQuery, GetGoalStoryQueryVariables>(GetGoalStoryDocument, options);
      }
export function useGetGoalStoryLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<GetGoalStoryQuery, GetGoalStoryQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<GetGoalStoryQuery, GetGoalStoryQueryVariables>(GetGoalStoryDocument, options);
        }
// @ts-ignore
export function useGetGoalStorySuspenseQuery(baseOptions?: Apollo.SuspenseQueryHookOptions<GetGoalStoryQuery, GetGoalStoryQueryVariables>): Apollo.UseSuspenseQueryResult<GetGoalStoryQuery, GetGoalStoryQueryVariables>;
export function useGetGoalStorySuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<GetGoalStoryQuery, GetGoalStoryQueryVariables>): Apollo.UseSuspenseQueryResult<GetGoalStoryQuery | undefined, GetGoalStoryQueryVariables>;
export function useGetGoalStorySuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<GetGoalStoryQuery, GetGoalStoryQueryVariables>) {
          const options = baseOptions === Apollo.skipToken ? baseOptions : {...defaultOptions, ...baseOptions}
          return Apollo.useSuspenseQuery<GetGoalStoryQuery, GetGoalStoryQueryVariables>(GetGoalStoryDocument, options);
        }
export type GetGoalStoryQueryHookResult = ReturnType<typeof useGetGoalStoryQuery>;
export type GetGoalStoryLazyQueryHookResult = ReturnType<typeof useGetGoalStoryLazyQuery>;
export type GetGoalStorySuspenseQueryHookResult = ReturnType<typeof useGetGoalStorySuspenseQuery>;
export type GetGoalStoryQueryResult = Apollo.QueryResult<GetGoalStoryQuery, GetGoalStoryQueryVariables>;
export const GetGoalsDocument = gql`
    query GetGoals($familyMemberId: Int, $status: String) {
  goals(familyMemberId: $familyMemberId, status: $status) {
    id
    title
    description
    status
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
export const GetJournalEntriesDocument = gql`
    query GetJournalEntries($familyMemberId: Int, $goalId: Int, $mood: String, $fromDate: String, $toDate: String) {
  journalEntries(
    familyMemberId: $familyMemberId
    goalId: $goalId
    mood: $mood
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
    isPrivate
    entryDate
    createdAt
    updatedAt
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
export const GetMySharedFamilyMembersDocument = gql`
    query GetMySharedFamilyMembers {
  mySharedFamilyMembers {
    id
    userId
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
    createdBy
    content
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
    firstName
    lastName
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
export const UpdateFamilyMemberCharacteristicDocument = gql`
    mutation UpdateFamilyMemberCharacteristic($id: Int!, $input: UpdateFamilyMemberCharacteristicInput!) {
  updateFamilyMemberCharacteristic(id: $id, input: $input) {
    id
    familyMemberId
    createdBy
    category
    title
    description
    severity
    frequencyPerWeek
    durationWeeks
    ageOfOnset
    impairmentDomains
    formulationStatus
    externalizedName
    strengths
    riskTier
    createdAt
    updatedAt
  }
}
    `;
export type UpdateFamilyMemberCharacteristicMutationFn = Apollo.MutationFunction<UpdateFamilyMemberCharacteristicMutation, UpdateFamilyMemberCharacteristicMutationVariables>;

/**
 * __useUpdateFamilyMemberCharacteristicMutation__
 *
 * To run a mutation, you first call `useUpdateFamilyMemberCharacteristicMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useUpdateFamilyMemberCharacteristicMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [updateFamilyMemberCharacteristicMutation, { data, loading, error }] = useUpdateFamilyMemberCharacteristicMutation({
 *   variables: {
 *      id: // value for 'id'
 *      input: // value for 'input'
 *   },
 * });
 */
export function useUpdateFamilyMemberCharacteristicMutation(baseOptions?: Apollo.MutationHookOptions<UpdateFamilyMemberCharacteristicMutation, UpdateFamilyMemberCharacteristicMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<UpdateFamilyMemberCharacteristicMutation, UpdateFamilyMemberCharacteristicMutationVariables>(UpdateFamilyMemberCharacteristicDocument, options);
      }
export type UpdateFamilyMemberCharacteristicMutationHookResult = ReturnType<typeof useUpdateFamilyMemberCharacteristicMutation>;
export type UpdateFamilyMemberCharacteristicMutationResult = Apollo.MutationResult<UpdateFamilyMemberCharacteristicMutation>;
export type UpdateFamilyMemberCharacteristicMutationOptions = Apollo.BaseMutationOptions<UpdateFamilyMemberCharacteristicMutation, UpdateFamilyMemberCharacteristicMutationVariables>;
export const UpdateGoalDocument = gql`
    mutation UpdateGoal($id: Int!, $input: UpdateGoalInput!) {
  updateGoal(id: $id, input: $input) {
    id
    slug
    title
    description
    status
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
    entityId
    entityType
    createdBy
    noteType
    content
    createdBy
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
export const UpdateUniqueOutcomeDocument = gql`
    mutation UpdateUniqueOutcome($id: Int!, $input: UpdateUniqueOutcomeInput!) {
  updateUniqueOutcome(id: $id, input: $input) {
    id
    characteristicId
    createdBy
    observedAt
    description
    createdAt
    updatedAt
  }
}
    `;
export type UpdateUniqueOutcomeMutationFn = Apollo.MutationFunction<UpdateUniqueOutcomeMutation, UpdateUniqueOutcomeMutationVariables>;

/**
 * __useUpdateUniqueOutcomeMutation__
 *
 * To run a mutation, you first call `useUpdateUniqueOutcomeMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useUpdateUniqueOutcomeMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [updateUniqueOutcomeMutation, { data, loading, error }] = useUpdateUniqueOutcomeMutation({
 *   variables: {
 *      id: // value for 'id'
 *      input: // value for 'input'
 *   },
 * });
 */
export function useUpdateUniqueOutcomeMutation(baseOptions?: Apollo.MutationHookOptions<UpdateUniqueOutcomeMutation, UpdateUniqueOutcomeMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<UpdateUniqueOutcomeMutation, UpdateUniqueOutcomeMutationVariables>(UpdateUniqueOutcomeDocument, options);
      }
export type UpdateUniqueOutcomeMutationHookResult = ReturnType<typeof useUpdateUniqueOutcomeMutation>;
export type UpdateUniqueOutcomeMutationResult = Apollo.MutationResult<UpdateUniqueOutcomeMutation>;
export type UpdateUniqueOutcomeMutationOptions = Apollo.BaseMutationOptions<UpdateUniqueOutcomeMutation, UpdateUniqueOutcomeMutationVariables>;
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