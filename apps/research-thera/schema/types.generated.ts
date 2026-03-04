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

export type CharacteristicCategory =
  | 'PRIORITY_CONCERN'
  | 'STRENGTH'
  | 'SUPPORT_NEED';

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


export type FamilyMemberbehaviorObservationsArgs = {
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

export type FamilyMemberShareRole =
  | 'EDITOR'
  | 'VIEWER';

export type FormulationStatus =
  | 'ASSESSED'
  | 'DRAFT'
  | 'FORMULATED';

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

export type GenerateOpenAIAudioInput = {
  goalStoryId?: InputMaybe<Scalars['Int']['input']>;
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

export type ImpairmentDomain =
  | 'ACADEMIC'
  | 'FAMILY'
  | 'PEER'
  | 'SAFETY'
  | 'SELF_CARE';

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
  generateOpenAIAudio: GenerateOpenAIAudioResult;
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


export type MutationbuildClaimCardsArgs = {
  input: BuildClaimCardsInput;
};


export type MutationcheckNoteClaimsArgs = {
  input: CheckNoteClaimsInput;
};


export type MutationcreateBehaviorObservationArgs = {
  input: CreateBehaviorObservationInput;
};


export type MutationcreateContactArgs = {
  input: CreateContactInput;
};


export type MutationcreateFamilyMemberArgs = {
  input: CreateFamilyMemberInput;
};


export type MutationcreateFamilyMemberCharacteristicArgs = {
  input: CreateFamilyMemberCharacteristicInput;
};


export type MutationcreateGoalArgs = {
  input: CreateGoalInput;
};


export type MutationcreateJournalEntryArgs = {
  input: CreateJournalEntryInput;
};


export type MutationcreateNoteArgs = {
  input: CreateNoteInput;
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


export type MutationcreateUniqueOutcomeArgs = {
  input: CreateUniqueOutcomeInput;
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


export type MutationdeleteFamilyMemberArgs = {
  id: Scalars['Int']['input'];
};


export type MutationdeleteFamilyMemberCharacteristicArgs = {
  id: Scalars['Int']['input'];
};


export type MutationdeleteGoalArgs = {
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


export type MutationdeleteTherapeuticQuestionsArgs = {
  goalId: Scalars['Int']['input'];
};


export type MutationdeleteUniqueOutcomeArgs = {
  id: Scalars['Int']['input'];
};


export type MutationgenerateAudioArgs = {
  goalId: Scalars['Int']['input'];
  language?: InputMaybe<Scalars['String']['input']>;
  storyId?: InputMaybe<Scalars['Int']['input']>;
  text?: InputMaybe<Scalars['String']['input']>;
  voice?: InputMaybe<Scalars['String']['input']>;
};


export type MutationgenerateLongFormTextArgs = {
  characteristicId?: InputMaybe<Scalars['Int']['input']>;
  goalId: Scalars['Int']['input'];
  language?: InputMaybe<Scalars['String']['input']>;
  minutes?: InputMaybe<Scalars['Int']['input']>;
};


export type MutationgenerateOpenAIAudioArgs = {
  input: GenerateOpenAIAudioInput;
};


export type MutationgenerateResearchArgs = {
  goalId: Scalars['Int']['input'];
};


export type MutationgenerateTherapeuticQuestionsArgs = {
  goalId: Scalars['Int']['input'];
};


export type MutationrefreshClaimCardArgs = {
  id: Scalars['ID']['input'];
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


export type MutationupdateFamilyMemberArgs = {
  id: Scalars['Int']['input'];
  input: UpdateFamilyMemberInput;
};


export type MutationupdateFamilyMemberCharacteristicArgs = {
  id: Scalars['Int']['input'];
  input: UpdateFamilyMemberCharacteristicInput;
};


export type MutationupdateGoalArgs = {
  id: Scalars['Int']['input'];
  input: UpdateGoalInput;
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


export type MutationupdateUniqueOutcomeArgs = {
  id: Scalars['Int']['input'];
  input: UpdateUniqueOutcomeInput;
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

export type PersonType =
  | 'CONTACT'
  | 'FAMILY_MEMBER';

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
  id: Scalars['Int']['input'];
};


export type QueryfamilyMemberArgs = {
  id: Scalars['Int']['input'];
};


export type QueryfamilyMemberCharacteristicArgs = {
  id: Scalars['Int']['input'];
};


export type QueryfamilyMemberCharacteristicsArgs = {
  category?: InputMaybe<CharacteristicCategory>;
  familyMemberId: Scalars['Int']['input'];
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


export type QuerygoalStoryArgs = {
  id: Scalars['Int']['input'];
};


export type QuerygoalsArgs = {
  familyMemberId?: InputMaybe<Scalars['Int']['input']>;
  status?: InputMaybe<Scalars['String']['input']>;
};


export type QueryjournalEntriesArgs = {
  familyMemberId?: InputMaybe<Scalars['Int']['input']>;
  fromDate?: InputMaybe<Scalars['String']['input']>;
  goalId?: InputMaybe<Scalars['Int']['input']>;
  mood?: InputMaybe<Scalars['String']['input']>;
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
  goalId: Scalars['Int']['input'];
};


export type QuerystoriesArgs = {
  goalId: Scalars['Int']['input'];
};


export type QuerystoryArgs = {
  id: Scalars['Int']['input'];
};


export type QuerytherapeuticQuestionsArgs = {
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

export type ResearchSource =
  | 'ARXIV'
  | 'CROSSREF'
  | 'DATACITE'
  | 'EUROPEPMC'
  | 'OPENALEX'
  | 'PUBMED'
  | 'SEMANTIC_SCHOLAR';

export type RiskTier =
  | 'CONCERN'
  | 'NONE'
  | 'SAFEGUARDING_ALERT'
  | 'WATCH';

export type SeverityLevel =
  | 'MILD'
  | 'MODERATE'
  | 'PROFOUND'
  | 'SEVERE';

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


export type SubscriptionaudioJobStatusArgs = {
  jobId: Scalars['String']['input'];
};


export type SubscriptionresearchJobStatusArgs = {
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
  CharacteristicCategory: ResolverTypeWrapper<'STRENGTH' | 'SUPPORT_NEED' | 'PRIORITY_CONCERN'>;
  CheckNoteClaimsInput: CheckNoteClaimsInput;
  CheckNoteClaimsResult: ResolverTypeWrapper<Omit<CheckNoteClaimsResult, 'cards'> & { cards: Array<ResolversTypes['ClaimCard']> }>;
  ClaimCard: ResolverTypeWrapper<Omit<ClaimCard, 'evidence' | 'verdict'> & { evidence: Array<ResolversTypes['EvidenceItem']>, verdict: ResolversTypes['ClaimVerdict'] }>;
  ID: ResolverTypeWrapper<Scalars['ID']['output']>;
  ClaimProvenance: ResolverTypeWrapper<ClaimProvenance>;
  ClaimScope: ResolverTypeWrapper<ClaimScope>;
  ClaimVerdict: ResolverTypeWrapper<'CONTRADICTED' | 'INSUFFICIENT' | 'MIXED' | 'SUPPORTED' | 'UNVERIFIED'>;
  Contact: ResolverTypeWrapper<Contact>;
  CreateBehaviorObservationInput: CreateBehaviorObservationInput;
  CreateContactInput: CreateContactInput;
  CreateFamilyMemberCharacteristicInput: CreateFamilyMemberCharacteristicInput;
  CreateFamilyMemberInput: CreateFamilyMemberInput;
  CreateGoalInput: CreateGoalInput;
  CreateJournalEntryInput: CreateJournalEntryInput;
  CreateNoteInput: CreateNoteInput;
  CreateRelationshipInput: CreateRelationshipInput;
  CreateStoryInput: CreateStoryInput;
  CreateSubGoalInput: CreateSubGoalInput;
  CreateUniqueOutcomeInput: CreateUniqueOutcomeInput;
  DeleteBehaviorObservationResult: ResolverTypeWrapper<DeleteBehaviorObservationResult>;
  DeleteContactResult: ResolverTypeWrapper<DeleteContactResult>;
  DeleteFamilyMemberCharacteristicResult: ResolverTypeWrapper<DeleteFamilyMemberCharacteristicResult>;
  DeleteFamilyMemberResult: ResolverTypeWrapper<DeleteFamilyMemberResult>;
  DeleteGoalResult: ResolverTypeWrapper<DeleteGoalResult>;
  DeleteJournalEntryResult: ResolverTypeWrapper<DeleteJournalEntryResult>;
  DeleteNoteResult: ResolverTypeWrapper<DeleteNoteResult>;
  DeleteQuestionsResult: ResolverTypeWrapper<DeleteQuestionsResult>;
  DeleteRelationshipResult: ResolverTypeWrapper<DeleteRelationshipResult>;
  DeleteResearchResult: ResolverTypeWrapper<DeleteResearchResult>;
  DeleteStoryResult: ResolverTypeWrapper<DeleteStoryResult>;
  DeleteUniqueOutcomeResult: ResolverTypeWrapper<DeleteUniqueOutcomeResult>;
  DevelopmentalTier: ResolverTypeWrapper<'EARLY_CHILDHOOD' | 'MIDDLE_CHILDHOOD' | 'EARLY_ADOLESCENCE' | 'LATE_ADOLESCENCE' | 'ADULT'>;
  EvidenceItem: ResolverTypeWrapper<Omit<EvidenceItem, 'polarity'> & { polarity: ResolversTypes['EvidencePolarity'] }>;
  EvidenceLocator: ResolverTypeWrapper<EvidenceLocator>;
  EvidencePolarity: ResolverTypeWrapper<'CONTRADICTS' | 'IRRELEVANT' | 'MIXED' | 'SUPPORTS'>;
  FamilyMember: ResolverTypeWrapper<Omit<FamilyMember, 'behaviorObservations' | 'goals' | 'shares'> & { behaviorObservations: Array<ResolversTypes['BehaviorObservation']>, goals: Array<ResolversTypes['Goal']>, shares: Array<ResolversTypes['FamilyMemberShare']> }>;
  FamilyMemberCharacteristic: ResolverTypeWrapper<Omit<FamilyMemberCharacteristic, 'behaviorObservations' | 'category' | 'familyMember' | 'formulationStatus' | 'impairmentDomains' | 'riskTier' | 'severity'> & { behaviorObservations: Array<ResolversTypes['BehaviorObservation']>, category: ResolversTypes['CharacteristicCategory'], familyMember?: Maybe<ResolversTypes['FamilyMember']>, formulationStatus: ResolversTypes['FormulationStatus'], impairmentDomains: Array<ResolversTypes['ImpairmentDomain']>, riskTier: ResolversTypes['RiskTier'], severity?: Maybe<ResolversTypes['SeverityLevel']> }>;
  FamilyMemberShare: ResolverTypeWrapper<Omit<FamilyMemberShare, 'role'> & { role: ResolversTypes['FamilyMemberShareRole'] }>;
  FamilyMemberShareRole: ResolverTypeWrapper<'VIEWER' | 'EDITOR'>;
  FormulationStatus: ResolverTypeWrapper<'DRAFT' | 'ASSESSED' | 'FORMULATED'>;
  GenerateAudioResult: ResolverTypeWrapper<GenerateAudioResult>;
  GenerateLongFormTextResult: ResolverTypeWrapper<GenerateLongFormTextResult>;
  GenerateOpenAIAudioInput: GenerateOpenAIAudioInput;
  GenerateOpenAIAudioResult: ResolverTypeWrapper<GenerateOpenAIAudioResult>;
  GenerateQuestionsResult: ResolverTypeWrapper<GenerateQuestionsResult>;
  GenerateResearchResult: ResolverTypeWrapper<GenerateResearchResult>;
  GenerationJob: ResolverTypeWrapper<Omit<GenerationJob, 'status' | 'type'> & { status: ResolversTypes['JobStatus'], type: ResolversTypes['JobType'] }>;
  Goal: ResolverTypeWrapper<Omit<Goal, 'familyMember' | 'notes' | 'parentGoal' | 'research' | 'subGoals' | 'userStories'> & { familyMember?: Maybe<ResolversTypes['FamilyMember']>, notes: Array<ResolversTypes['Note']>, parentGoal?: Maybe<ResolversTypes['Goal']>, research: Array<ResolversTypes['Research']>, subGoals: Array<ResolversTypes['Goal']>, userStories: Array<ResolversTypes['Story']> }>;
  GoalStory: ResolverTypeWrapper<GoalStory>;
  ImpairmentDomain: ResolverTypeWrapper<'ACADEMIC' | 'PEER' | 'FAMILY' | 'SELF_CARE' | 'SAFETY'>;
  JobError: ResolverTypeWrapper<JobError>;
  JobResult: ResolverTypeWrapper<JobResult>;
  JobStatus: ResolverTypeWrapper<'RUNNING' | 'SUCCEEDED' | 'FAILED'>;
  JobType: ResolverTypeWrapper<'AUDIO' | 'RESEARCH' | 'QUESTIONS' | 'LONGFORM'>;
  JournalEntry: ResolverTypeWrapper<Omit<JournalEntry, 'familyMember' | 'goal'> & { familyMember?: Maybe<ResolversTypes['FamilyMember']>, goal?: Maybe<ResolversTypes['Goal']> }>;
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
  PersonType: ResolverTypeWrapper<'FAMILY_MEMBER' | 'CONTACT'>;
  Query: ResolverTypeWrapper<Record<PropertyKey, never>>;
  Relationship: ResolverTypeWrapper<Omit<Relationship, 'related' | 'relatedType' | 'status' | 'subject' | 'subjectType'> & { related?: Maybe<ResolversTypes['RelationshipPerson']>, relatedType: ResolversTypes['PersonType'], status: ResolversTypes['RelationshipStatus'], subject?: Maybe<ResolversTypes['RelationshipPerson']>, subjectType: ResolversTypes['PersonType'] }>;
  RelationshipPerson: ResolverTypeWrapper<Omit<RelationshipPerson, 'type'> & { type: ResolversTypes['PersonType'] }>;
  RelationshipStatus: ResolverTypeWrapper<'ACTIVE' | 'ENDED'>;
  Research: ResolverTypeWrapper<Omit<Research, 'goal'> & { goal?: Maybe<ResolversTypes['Goal']> }>;
  ResearchSource: ResolverTypeWrapper<'ARXIV' | 'CROSSREF' | 'DATACITE' | 'EUROPEPMC' | 'OPENALEX' | 'PUBMED' | 'SEMANTIC_SCHOLAR'>;
  RiskTier: ResolverTypeWrapper<'NONE' | 'WATCH' | 'CONCERN' | 'SAFEGUARDING_ALERT'>;
  SeverityLevel: ResolverTypeWrapper<'MILD' | 'MODERATE' | 'SEVERE' | 'PROFOUND'>;
  Story: ResolverTypeWrapper<Omit<Story, 'goal'> & { goal?: Maybe<ResolversTypes['Goal']> }>;
  Subscription: ResolverTypeWrapper<Record<PropertyKey, never>>;
  TextSegment: ResolverTypeWrapper<TextSegment>;
  TherapeuticQuestion: ResolverTypeWrapper<TherapeuticQuestion>;
  UniqueOutcome: ResolverTypeWrapper<UniqueOutcome>;
  UpdateBehaviorObservationInput: UpdateBehaviorObservationInput;
  UpdateContactInput: UpdateContactInput;
  UpdateFamilyMemberCharacteristicInput: UpdateFamilyMemberCharacteristicInput;
  UpdateFamilyMemberInput: UpdateFamilyMemberInput;
  UpdateGoalInput: UpdateGoalInput;
  UpdateJournalEntryInput: UpdateJournalEntryInput;
  UpdateNoteInput: UpdateNoteInput;
  UpdateRelationshipInput: UpdateRelationshipInput;
  UpdateStoryInput: UpdateStoryInput;
  UpdateUniqueOutcomeInput: UpdateUniqueOutcomeInput;
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
  CreateBehaviorObservationInput: CreateBehaviorObservationInput;
  CreateContactInput: CreateContactInput;
  CreateFamilyMemberCharacteristicInput: CreateFamilyMemberCharacteristicInput;
  CreateFamilyMemberInput: CreateFamilyMemberInput;
  CreateGoalInput: CreateGoalInput;
  CreateJournalEntryInput: CreateJournalEntryInput;
  CreateNoteInput: CreateNoteInput;
  CreateRelationshipInput: CreateRelationshipInput;
  CreateStoryInput: CreateStoryInput;
  CreateSubGoalInput: CreateSubGoalInput;
  CreateUniqueOutcomeInput: CreateUniqueOutcomeInput;
  DeleteBehaviorObservationResult: DeleteBehaviorObservationResult;
  DeleteContactResult: DeleteContactResult;
  DeleteFamilyMemberCharacteristicResult: DeleteFamilyMemberCharacteristicResult;
  DeleteFamilyMemberResult: DeleteFamilyMemberResult;
  DeleteGoalResult: DeleteGoalResult;
  DeleteJournalEntryResult: DeleteJournalEntryResult;
  DeleteNoteResult: DeleteNoteResult;
  DeleteQuestionsResult: DeleteQuestionsResult;
  DeleteRelationshipResult: DeleteRelationshipResult;
  DeleteResearchResult: DeleteResearchResult;
  DeleteStoryResult: DeleteStoryResult;
  DeleteUniqueOutcomeResult: DeleteUniqueOutcomeResult;
  EvidenceItem: EvidenceItem;
  EvidenceLocator: EvidenceLocator;
  FamilyMember: Omit<FamilyMember, 'behaviorObservations' | 'goals' | 'shares'> & { behaviorObservations: Array<ResolversParentTypes['BehaviorObservation']>, goals: Array<ResolversParentTypes['Goal']>, shares: Array<ResolversParentTypes['FamilyMemberShare']> };
  FamilyMemberCharacteristic: Omit<FamilyMemberCharacteristic, 'behaviorObservations' | 'familyMember'> & { behaviorObservations: Array<ResolversParentTypes['BehaviorObservation']>, familyMember?: Maybe<ResolversParentTypes['FamilyMember']> };
  FamilyMemberShare: FamilyMemberShare;
  GenerateAudioResult: GenerateAudioResult;
  GenerateLongFormTextResult: GenerateLongFormTextResult;
  GenerateOpenAIAudioInput: GenerateOpenAIAudioInput;
  GenerateOpenAIAudioResult: GenerateOpenAIAudioResult;
  GenerateQuestionsResult: GenerateQuestionsResult;
  GenerateResearchResult: GenerateResearchResult;
  GenerationJob: GenerationJob;
  Goal: Omit<Goal, 'familyMember' | 'notes' | 'parentGoal' | 'research' | 'subGoals' | 'userStories'> & { familyMember?: Maybe<ResolversParentTypes['FamilyMember']>, notes: Array<ResolversParentTypes['Note']>, parentGoal?: Maybe<ResolversParentTypes['Goal']>, research: Array<ResolversParentTypes['Research']>, subGoals: Array<ResolversParentTypes['Goal']>, userStories: Array<ResolversParentTypes['Story']> };
  GoalStory: GoalStory;
  JobError: JobError;
  JobResult: JobResult;
  JournalEntry: Omit<JournalEntry, 'familyMember' | 'goal'> & { familyMember?: Maybe<ResolversParentTypes['FamilyMember']>, goal?: Maybe<ResolversParentTypes['Goal']> };
  Mutation: Record<PropertyKey, never>;
  Note: Omit<Note, 'claimCards' | 'goal' | 'linkedResearch' | 'shares'> & { claimCards?: Maybe<Array<ResolversParentTypes['ClaimCard']>>, goal?: Maybe<ResolversParentTypes['Goal']>, linkedResearch?: Maybe<Array<ResolversParentTypes['Research']>>, shares: Array<ResolversParentTypes['NoteShare']> };
  NoteAccess: NoteAccess;
  NoteShare: NoteShare;
  PaperCandidate: PaperCandidate;
  Query: Record<PropertyKey, never>;
  Relationship: Omit<Relationship, 'related' | 'subject'> & { related?: Maybe<ResolversParentTypes['RelationshipPerson']>, subject?: Maybe<ResolversParentTypes['RelationshipPerson']> };
  RelationshipPerson: RelationshipPerson;
  Research: Omit<Research, 'goal'> & { goal?: Maybe<ResolversParentTypes['Goal']> };
  Story: Omit<Story, 'goal'> & { goal?: Maybe<ResolversParentTypes['Goal']> };
  Subscription: Record<PropertyKey, never>;
  TextSegment: TextSegment;
  TherapeuticQuestion: TherapeuticQuestion;
  UniqueOutcome: UniqueOutcome;
  UpdateBehaviorObservationInput: UpdateBehaviorObservationInput;
  UpdateContactInput: UpdateContactInput;
  UpdateFamilyMemberCharacteristicInput: UpdateFamilyMemberCharacteristicInput;
  UpdateFamilyMemberInput: UpdateFamilyMemberInput;
  UpdateGoalInput: UpdateGoalInput;
  UpdateJournalEntryInput: UpdateJournalEntryInput;
  UpdateNoteInput: UpdateNoteInput;
  UpdateRelationshipInput: UpdateRelationshipInput;
  UpdateStoryInput: UpdateStoryInput;
  UpdateUniqueOutcomeInput: UpdateUniqueOutcomeInput;
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
  characteristicId?: Resolver<Maybe<ResolversTypes['Int']>, ParentType, ContextType>;
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
  notes?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  observationType?: Resolver<ResolversTypes['BehaviorObservationType'], ParentType, ContextType>;
  observedAt?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  updatedAt?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
};

export type BehaviorObservationTypeResolvers = EnumResolverSignature<{ AVOIDANCE?: any, PARTIAL?: any, REFUSAL?: any, TARGET_OCCURRED?: any }, ResolversTypes['BehaviorObservationType']>;

export type BuildClaimCardsResultResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['BuildClaimCardsResult'] = ResolversParentTypes['BuildClaimCardsResult']> = {
  cards?: Resolver<Array<ResolversTypes['ClaimCard']>, ParentType, ContextType>;
};

export type CharacteristicCategoryResolvers = EnumResolverSignature<{ PRIORITY_CONCERN?: any, STRENGTH?: any, SUPPORT_NEED?: any }, ResolversTypes['CharacteristicCategory']>;

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
  firstName?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  id?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  lastName?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  notes?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  role?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  updatedAt?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
};

export type DeleteBehaviorObservationResultResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['DeleteBehaviorObservationResult'] = ResolversParentTypes['DeleteBehaviorObservationResult']> = {
  message?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  success?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
};

export type DeleteContactResultResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['DeleteContactResult'] = ResolversParentTypes['DeleteContactResult']> = {
  message?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  success?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
};

export type DeleteFamilyMemberCharacteristicResultResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['DeleteFamilyMemberCharacteristicResult'] = ResolversParentTypes['DeleteFamilyMemberCharacteristicResult']> = {
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

export type DeleteUniqueOutcomeResultResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['DeleteUniqueOutcomeResult'] = ResolversParentTypes['DeleteUniqueOutcomeResult']> = {
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
  location?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  name?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  occupation?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  phone?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  relationship?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  shares?: Resolver<Array<ResolversTypes['FamilyMemberShare']>, ParentType, ContextType>;
  updatedAt?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  userId?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
};

export type FamilyMemberCharacteristicResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['FamilyMemberCharacteristic'] = ResolversParentTypes['FamilyMemberCharacteristic']> = {
  ageOfOnset?: Resolver<Maybe<ResolversTypes['Int']>, ParentType, ContextType>;
  behaviorObservations?: Resolver<Array<ResolversTypes['BehaviorObservation']>, ParentType, ContextType>;
  category?: Resolver<ResolversTypes['CharacteristicCategory'], ParentType, ContextType>;
  createdAt?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  createdBy?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  description?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  durationWeeks?: Resolver<Maybe<ResolversTypes['Int']>, ParentType, ContextType>;
  externalizedName?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  familyMember?: Resolver<Maybe<ResolversTypes['FamilyMember']>, ParentType, ContextType>;
  familyMemberId?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  formulationStatus?: Resolver<ResolversTypes['FormulationStatus'], ParentType, ContextType>;
  frequencyPerWeek?: Resolver<Maybe<ResolversTypes['Int']>, ParentType, ContextType>;
  id?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  impairmentDomains?: Resolver<Array<ResolversTypes['ImpairmentDomain']>, ParentType, ContextType>;
  riskTier?: Resolver<ResolversTypes['RiskTier'], ParentType, ContextType>;
  severity?: Resolver<Maybe<ResolversTypes['SeverityLevel']>, ParentType, ContextType>;
  strengths?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  title?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  uniqueOutcomes?: Resolver<Array<ResolversTypes['UniqueOutcome']>, ParentType, ContextType>;
  updatedAt?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
};

export type FamilyMemberShareResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['FamilyMemberShare'] = ResolversParentTypes['FamilyMemberShare']> = {
  createdAt?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  createdBy?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  email?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  familyMemberId?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  role?: Resolver<ResolversTypes['FamilyMemberShareRole'], ParentType, ContextType>;
};

export type FamilyMemberShareRoleResolvers = EnumResolverSignature<{ EDITOR?: any, VIEWER?: any }, ResolversTypes['FamilyMemberShareRole']>;

export type FormulationStatusResolvers = EnumResolverSignature<{ ASSESSED?: any, DRAFT?: any, FORMULATED?: any }, ResolversTypes['FormulationStatus']>;

export type GenerateAudioResultResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['GenerateAudioResult'] = ResolversParentTypes['GenerateAudioResult']> = {
  audioUrl?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  jobId?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  message?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  success?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
};

export type GenerateLongFormTextResultResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['GenerateLongFormTextResult'] = ResolversParentTypes['GenerateLongFormTextResult']> = {
  audioUrl?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
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
  goalId?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
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
  familyMemberId?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  id?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  notes?: Resolver<Array<ResolversTypes['Note']>, ParentType, ContextType>;
  parentGoal?: Resolver<Maybe<ResolversTypes['Goal']>, ParentType, ContextType>;
  parentGoalId?: Resolver<Maybe<ResolversTypes['Int']>, ParentType, ContextType>;
  questions?: Resolver<Array<ResolversTypes['TherapeuticQuestion']>, ParentType, ContextType>;
  research?: Resolver<Array<ResolversTypes['Research']>, ParentType, ContextType>;
  slug?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  status?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  stories?: Resolver<Array<ResolversTypes['GoalStory']>, ParentType, ContextType>;
  storyLanguage?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  subGoals?: Resolver<Array<ResolversTypes['Goal']>, ParentType, ContextType>;
  therapeuticText?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  therapeuticTextGeneratedAt?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  therapeuticTextLanguage?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  title?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  updatedAt?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  userStories?: Resolver<Array<ResolversTypes['Story']>, ParentType, ContextType>;
};

export type GoalStoryResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['GoalStory'] = ResolversParentTypes['GoalStory']> = {
  audioAssets?: Resolver<Array<ResolversTypes['AudioAsset']>, ParentType, ContextType>;
  audioGeneratedAt?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  audioKey?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  audioUrl?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  createdAt?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  goalId?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  id?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  language?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  minutes?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  segments?: Resolver<Array<ResolversTypes['TextSegment']>, ParentType, ContextType>;
  text?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  updatedAt?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
};

export type ImpairmentDomainResolvers = EnumResolverSignature<{ ACADEMIC?: any, FAMILY?: any, PEER?: any, SAFETY?: any, SELF_CARE?: any }, ResolversTypes['ImpairmentDomain']>;

export type JobErrorResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['JobError'] = ResolversParentTypes['JobError']> = {
  code?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  details?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  message?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
};

export type JobResultResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['JobResult'] = ResolversParentTypes['JobResult']> = {
  assetId?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  audioUrl?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  count?: Resolver<Maybe<ResolversTypes['Int']>, ParentType, ContextType>;
  manifestUrl?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  questions?: Resolver<Maybe<Array<ResolversTypes['TherapeuticQuestion']>>, ParentType, ContextType>;
  segmentUrls?: Resolver<Maybe<Array<ResolversTypes['String']>>, ParentType, ContextType>;
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
  mood?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  moodScore?: Resolver<Maybe<ResolversTypes['Int']>, ParentType, ContextType>;
  tags?: Resolver<Maybe<Array<ResolversTypes['String']>>, ParentType, ContextType>;
  title?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  updatedAt?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
};

export type MutationResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['Mutation'] = ResolversParentTypes['Mutation']> = {
  buildClaimCards?: Resolver<ResolversTypes['BuildClaimCardsResult'], ParentType, ContextType, RequireFields<MutationbuildClaimCardsArgs, 'input'>>;
  checkNoteClaims?: Resolver<ResolversTypes['CheckNoteClaimsResult'], ParentType, ContextType, RequireFields<MutationcheckNoteClaimsArgs, 'input'>>;
  createBehaviorObservation?: Resolver<ResolversTypes['BehaviorObservation'], ParentType, ContextType, RequireFields<MutationcreateBehaviorObservationArgs, 'input'>>;
  createContact?: Resolver<ResolversTypes['Contact'], ParentType, ContextType, RequireFields<MutationcreateContactArgs, 'input'>>;
  createFamilyMember?: Resolver<ResolversTypes['FamilyMember'], ParentType, ContextType, RequireFields<MutationcreateFamilyMemberArgs, 'input'>>;
  createFamilyMemberCharacteristic?: Resolver<ResolversTypes['FamilyMemberCharacteristic'], ParentType, ContextType, RequireFields<MutationcreateFamilyMemberCharacteristicArgs, 'input'>>;
  createGoal?: Resolver<ResolversTypes['Goal'], ParentType, ContextType, RequireFields<MutationcreateGoalArgs, 'input'>>;
  createJournalEntry?: Resolver<ResolversTypes['JournalEntry'], ParentType, ContextType, RequireFields<MutationcreateJournalEntryArgs, 'input'>>;
  createNote?: Resolver<ResolversTypes['Note'], ParentType, ContextType, RequireFields<MutationcreateNoteArgs, 'input'>>;
  createRelationship?: Resolver<ResolversTypes['Relationship'], ParentType, ContextType, RequireFields<MutationcreateRelationshipArgs, 'input'>>;
  createStory?: Resolver<ResolversTypes['Story'], ParentType, ContextType, RequireFields<MutationcreateStoryArgs, 'input'>>;
  createSubGoal?: Resolver<ResolversTypes['Goal'], ParentType, ContextType, RequireFields<MutationcreateSubGoalArgs, 'goalId' | 'input'>>;
  createUniqueOutcome?: Resolver<ResolversTypes['UniqueOutcome'], ParentType, ContextType, RequireFields<MutationcreateUniqueOutcomeArgs, 'input'>>;
  deleteBehaviorObservation?: Resolver<ResolversTypes['DeleteBehaviorObservationResult'], ParentType, ContextType, RequireFields<MutationdeleteBehaviorObservationArgs, 'id'>>;
  deleteClaimCard?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType, RequireFields<MutationdeleteClaimCardArgs, 'id'>>;
  deleteContact?: Resolver<ResolversTypes['DeleteContactResult'], ParentType, ContextType, RequireFields<MutationdeleteContactArgs, 'id'>>;
  deleteFamilyMember?: Resolver<ResolversTypes['DeleteFamilyMemberResult'], ParentType, ContextType, RequireFields<MutationdeleteFamilyMemberArgs, 'id'>>;
  deleteFamilyMemberCharacteristic?: Resolver<ResolversTypes['DeleteFamilyMemberCharacteristicResult'], ParentType, ContextType, RequireFields<MutationdeleteFamilyMemberCharacteristicArgs, 'id'>>;
  deleteGoal?: Resolver<ResolversTypes['DeleteGoalResult'], ParentType, ContextType, RequireFields<MutationdeleteGoalArgs, 'id'>>;
  deleteJournalEntry?: Resolver<ResolversTypes['DeleteJournalEntryResult'], ParentType, ContextType, RequireFields<MutationdeleteJournalEntryArgs, 'id'>>;
  deleteNote?: Resolver<ResolversTypes['DeleteNoteResult'], ParentType, ContextType, RequireFields<MutationdeleteNoteArgs, 'id'>>;
  deleteRelationship?: Resolver<ResolversTypes['DeleteRelationshipResult'], ParentType, ContextType, RequireFields<MutationdeleteRelationshipArgs, 'id'>>;
  deleteResearch?: Resolver<ResolversTypes['DeleteResearchResult'], ParentType, ContextType, RequireFields<MutationdeleteResearchArgs, 'goalId'>>;
  deleteStory?: Resolver<ResolversTypes['DeleteStoryResult'], ParentType, ContextType, RequireFields<MutationdeleteStoryArgs, 'id'>>;
  deleteTherapeuticQuestions?: Resolver<ResolversTypes['DeleteQuestionsResult'], ParentType, ContextType, RequireFields<MutationdeleteTherapeuticQuestionsArgs, 'goalId'>>;
  deleteUniqueOutcome?: Resolver<ResolversTypes['DeleteUniqueOutcomeResult'], ParentType, ContextType, RequireFields<MutationdeleteUniqueOutcomeArgs, 'id'>>;
  generateAudio?: Resolver<ResolversTypes['GenerateAudioResult'], ParentType, ContextType, RequireFields<MutationgenerateAudioArgs, 'goalId'>>;
  generateLongFormText?: Resolver<ResolversTypes['GenerateLongFormTextResult'], ParentType, ContextType, RequireFields<MutationgenerateLongFormTextArgs, 'goalId'>>;
  generateOpenAIAudio?: Resolver<ResolversTypes['GenerateOpenAIAudioResult'], ParentType, ContextType, RequireFields<MutationgenerateOpenAIAudioArgs, 'input'>>;
  generateResearch?: Resolver<ResolversTypes['GenerateResearchResult'], ParentType, ContextType, RequireFields<MutationgenerateResearchArgs, 'goalId'>>;
  generateTherapeuticQuestions?: Resolver<ResolversTypes['GenerateQuestionsResult'], ParentType, ContextType, RequireFields<MutationgenerateTherapeuticQuestionsArgs, 'goalId'>>;
  refreshClaimCard?: Resolver<ResolversTypes['ClaimCard'], ParentType, ContextType, RequireFields<MutationrefreshClaimCardArgs, 'id'>>;
  setNoteVisibility?: Resolver<ResolversTypes['Note'], ParentType, ContextType, RequireFields<MutationsetNoteVisibilityArgs, 'noteId' | 'visibility'>>;
  shareFamilyMember?: Resolver<ResolversTypes['FamilyMemberShare'], ParentType, ContextType, RequireFields<MutationshareFamilyMemberArgs, 'email' | 'familyMemberId'>>;
  shareNote?: Resolver<ResolversTypes['NoteShare'], ParentType, ContextType, RequireFields<MutationshareNoteArgs, 'email' | 'noteId'>>;
  unshareFamilyMember?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType, RequireFields<MutationunshareFamilyMemberArgs, 'email' | 'familyMemberId'>>;
  unshareNote?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType, RequireFields<MutationunshareNoteArgs, 'email' | 'noteId'>>;
  updateBehaviorObservation?: Resolver<ResolversTypes['BehaviorObservation'], ParentType, ContextType, RequireFields<MutationupdateBehaviorObservationArgs, 'id' | 'input'>>;
  updateContact?: Resolver<ResolversTypes['Contact'], ParentType, ContextType, RequireFields<MutationupdateContactArgs, 'id' | 'input'>>;
  updateFamilyMember?: Resolver<ResolversTypes['FamilyMember'], ParentType, ContextType, RequireFields<MutationupdateFamilyMemberArgs, 'id' | 'input'>>;
  updateFamilyMemberCharacteristic?: Resolver<ResolversTypes['FamilyMemberCharacteristic'], ParentType, ContextType, RequireFields<MutationupdateFamilyMemberCharacteristicArgs, 'id' | 'input'>>;
  updateGoal?: Resolver<ResolversTypes['Goal'], ParentType, ContextType, RequireFields<MutationupdateGoalArgs, 'id' | 'input'>>;
  updateJournalEntry?: Resolver<ResolversTypes['JournalEntry'], ParentType, ContextType, RequireFields<MutationupdateJournalEntryArgs, 'id' | 'input'>>;
  updateNote?: Resolver<ResolversTypes['Note'], ParentType, ContextType, RequireFields<MutationupdateNoteArgs, 'id' | 'input'>>;
  updateRelationship?: Resolver<ResolversTypes['Relationship'], ParentType, ContextType, RequireFields<MutationupdateRelationshipArgs, 'id' | 'input'>>;
  updateStory?: Resolver<ResolversTypes['Story'], ParentType, ContextType, RequireFields<MutationupdateStoryArgs, 'id' | 'input'>>;
  updateUniqueOutcome?: Resolver<ResolversTypes['UniqueOutcome'], ParentType, ContextType, RequireFields<MutationupdateUniqueOutcomeArgs, 'id' | 'input'>>;
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

export type PersonTypeResolvers = EnumResolverSignature<{ CONTACT?: any, FAMILY_MEMBER?: any }, ResolversTypes['PersonType']>;

export type QueryResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['Query'] = ResolversParentTypes['Query']> = {
  allNotes?: Resolver<Array<ResolversTypes['Note']>, ParentType, ContextType>;
  allStories?: Resolver<Array<ResolversTypes['Story']>, ParentType, ContextType>;
  audioFromR2?: Resolver<Maybe<ResolversTypes['AudioFromR2Result']>, ParentType, ContextType, RequireFields<QueryaudioFromR2Args, 'key'>>;
  behaviorObservation?: Resolver<Maybe<ResolversTypes['BehaviorObservation']>, ParentType, ContextType, RequireFields<QuerybehaviorObservationArgs, 'id'>>;
  behaviorObservations?: Resolver<Array<ResolversTypes['BehaviorObservation']>, ParentType, ContextType, RequireFields<QuerybehaviorObservationsArgs, 'familyMemberId'>>;
  claimCard?: Resolver<Maybe<ResolversTypes['ClaimCard']>, ParentType, ContextType, RequireFields<QueryclaimCardArgs, 'id'>>;
  claimCardsForNote?: Resolver<Array<ResolversTypes['ClaimCard']>, ParentType, ContextType, RequireFields<QueryclaimCardsForNoteArgs, 'noteId'>>;
  contact?: Resolver<Maybe<ResolversTypes['Contact']>, ParentType, ContextType, RequireFields<QuerycontactArgs, 'id'>>;
  contacts?: Resolver<Array<ResolversTypes['Contact']>, ParentType, ContextType>;
  familyMember?: Resolver<Maybe<ResolversTypes['FamilyMember']>, ParentType, ContextType, RequireFields<QueryfamilyMemberArgs, 'id'>>;
  familyMemberCharacteristic?: Resolver<Maybe<ResolversTypes['FamilyMemberCharacteristic']>, ParentType, ContextType, RequireFields<QueryfamilyMemberCharacteristicArgs, 'id'>>;
  familyMemberCharacteristics?: Resolver<Array<ResolversTypes['FamilyMemberCharacteristic']>, ParentType, ContextType, RequireFields<QueryfamilyMemberCharacteristicsArgs, 'familyMemberId'>>;
  familyMembers?: Resolver<Array<ResolversTypes['FamilyMember']>, ParentType, ContextType>;
  generationJob?: Resolver<Maybe<ResolversTypes['GenerationJob']>, ParentType, ContextType, RequireFields<QuerygenerationJobArgs, 'id'>>;
  generationJobs?: Resolver<Array<ResolversTypes['GenerationJob']>, ParentType, ContextType, Partial<QuerygenerationJobsArgs>>;
  goal?: Resolver<Maybe<ResolversTypes['Goal']>, ParentType, ContextType, Partial<QuerygoalArgs>>;
  goalStory?: Resolver<Maybe<ResolversTypes['GoalStory']>, ParentType, ContextType, RequireFields<QuerygoalStoryArgs, 'id'>>;
  goals?: Resolver<Array<ResolversTypes['Goal']>, ParentType, ContextType, Partial<QuerygoalsArgs>>;
  journalEntries?: Resolver<Array<ResolversTypes['JournalEntry']>, ParentType, ContextType, Partial<QueryjournalEntriesArgs>>;
  journalEntry?: Resolver<Maybe<ResolversTypes['JournalEntry']>, ParentType, ContextType, RequireFields<QueryjournalEntryArgs, 'id'>>;
  mySharedFamilyMembers?: Resolver<Array<ResolversTypes['FamilyMember']>, ParentType, ContextType>;
  mySharedNotes?: Resolver<Array<ResolversTypes['Note']>, ParentType, ContextType>;
  note?: Resolver<Maybe<ResolversTypes['Note']>, ParentType, ContextType, Partial<QuerynoteArgs>>;
  notes?: Resolver<Array<ResolversTypes['Note']>, ParentType, ContextType, RequireFields<QuerynotesArgs, 'entityId' | 'entityType'>>;
  relationship?: Resolver<Maybe<ResolversTypes['Relationship']>, ParentType, ContextType, RequireFields<QueryrelationshipArgs, 'id'>>;
  relationships?: Resolver<Array<ResolversTypes['Relationship']>, ParentType, ContextType, RequireFields<QueryrelationshipsArgs, 'subjectId' | 'subjectType'>>;
  research?: Resolver<Array<ResolversTypes['Research']>, ParentType, ContextType, RequireFields<QueryresearchArgs, 'goalId'>>;
  stories?: Resolver<Array<ResolversTypes['Story']>, ParentType, ContextType, RequireFields<QuerystoriesArgs, 'goalId'>>;
  story?: Resolver<Maybe<ResolversTypes['Story']>, ParentType, ContextType, RequireFields<QuerystoryArgs, 'id'>>;
  therapeuticQuestions?: Resolver<Array<ResolversTypes['TherapeuticQuestion']>, ParentType, ContextType, RequireFields<QuerytherapeuticQuestionsArgs, 'goalId'>>;
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
  goal?: Resolver<Maybe<ResolversTypes['Goal']>, ParentType, ContextType>;
  goalId?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  id?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
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

export type ResearchSourceResolvers = EnumResolverSignature<{ ARXIV?: any, CROSSREF?: any, DATACITE?: any, EUROPEPMC?: any, OPENALEX?: any, PUBMED?: any, SEMANTIC_SCHOLAR?: any }, ResolversTypes['ResearchSource']>;

export type RiskTierResolvers = EnumResolverSignature<{ CONCERN?: any, NONE?: any, SAFEGUARDING_ALERT?: any, WATCH?: any }, ResolversTypes['RiskTier']>;

export type SeverityLevelResolvers = EnumResolverSignature<{ MILD?: any, MODERATE?: any, PROFOUND?: any, SEVERE?: any }, ResolversTypes['SeverityLevel']>;

export type StoryResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['Story'] = ResolversParentTypes['Story']> = {
  audioGeneratedAt?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  audioKey?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  audioUrl?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  content?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  createdAt?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  createdBy?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  goal?: Resolver<Maybe<ResolversTypes['Goal']>, ParentType, ContextType>;
  goalId?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  id?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  updatedAt?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
};

export type SubscriptionResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['Subscription'] = ResolversParentTypes['Subscription']> = {
  audioJobStatus?: SubscriptionResolver<ResolversTypes['GenerationJob'], "audioJobStatus", ParentType, ContextType, RequireFields<SubscriptionaudioJobStatusArgs, 'jobId'>>;
  researchJobStatus?: SubscriptionResolver<ResolversTypes['GenerationJob'], "researchJobStatus", ParentType, ContextType, RequireFields<SubscriptionresearchJobStatusArgs, 'jobId'>>;
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
  goalId?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  id?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  question?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  rationale?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  researchId?: Resolver<Maybe<ResolversTypes['Int']>, ParentType, ContextType>;
  researchTitle?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  updatedAt?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
};

export type UniqueOutcomeResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['UniqueOutcome'] = ResolversParentTypes['UniqueOutcome']> = {
  characteristicId?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  createdAt?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  createdBy?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  description?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  id?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  observedAt?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  updatedAt?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
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
  CharacteristicCategory?: CharacteristicCategoryResolvers;
  CheckNoteClaimsResult?: CheckNoteClaimsResultResolvers<ContextType>;
  ClaimCard?: ClaimCardResolvers<ContextType>;
  ClaimProvenance?: ClaimProvenanceResolvers<ContextType>;
  ClaimScope?: ClaimScopeResolvers<ContextType>;
  ClaimVerdict?: ClaimVerdictResolvers;
  Contact?: ContactResolvers<ContextType>;
  DeleteBehaviorObservationResult?: DeleteBehaviorObservationResultResolvers<ContextType>;
  DeleteContactResult?: DeleteContactResultResolvers<ContextType>;
  DeleteFamilyMemberCharacteristicResult?: DeleteFamilyMemberCharacteristicResultResolvers<ContextType>;
  DeleteFamilyMemberResult?: DeleteFamilyMemberResultResolvers<ContextType>;
  DeleteGoalResult?: DeleteGoalResultResolvers<ContextType>;
  DeleteJournalEntryResult?: DeleteJournalEntryResultResolvers<ContextType>;
  DeleteNoteResult?: DeleteNoteResultResolvers<ContextType>;
  DeleteQuestionsResult?: DeleteQuestionsResultResolvers<ContextType>;
  DeleteRelationshipResult?: DeleteRelationshipResultResolvers<ContextType>;
  DeleteResearchResult?: DeleteResearchResultResolvers<ContextType>;
  DeleteStoryResult?: DeleteStoryResultResolvers<ContextType>;
  DeleteUniqueOutcomeResult?: DeleteUniqueOutcomeResultResolvers<ContextType>;
  DevelopmentalTier?: DevelopmentalTierResolvers;
  EvidenceItem?: EvidenceItemResolvers<ContextType>;
  EvidenceLocator?: EvidenceLocatorResolvers<ContextType>;
  EvidencePolarity?: EvidencePolarityResolvers;
  FamilyMember?: FamilyMemberResolvers<ContextType>;
  FamilyMemberCharacteristic?: FamilyMemberCharacteristicResolvers<ContextType>;
  FamilyMemberShare?: FamilyMemberShareResolvers<ContextType>;
  FamilyMemberShareRole?: FamilyMemberShareRoleResolvers;
  FormulationStatus?: FormulationStatusResolvers;
  GenerateAudioResult?: GenerateAudioResultResolvers<ContextType>;
  GenerateLongFormTextResult?: GenerateLongFormTextResultResolvers<ContextType>;
  GenerateOpenAIAudioResult?: GenerateOpenAIAudioResultResolvers<ContextType>;
  GenerateQuestionsResult?: GenerateQuestionsResultResolvers<ContextType>;
  GenerateResearchResult?: GenerateResearchResultResolvers<ContextType>;
  GenerationJob?: GenerationJobResolvers<ContextType>;
  Goal?: GoalResolvers<ContextType>;
  GoalStory?: GoalStoryResolvers<ContextType>;
  ImpairmentDomain?: ImpairmentDomainResolvers;
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
  PersonType?: PersonTypeResolvers;
  Query?: QueryResolvers<ContextType>;
  Relationship?: RelationshipResolvers<ContextType>;
  RelationshipPerson?: RelationshipPersonResolvers<ContextType>;
  RelationshipStatus?: RelationshipStatusResolvers;
  Research?: ResearchResolvers<ContextType>;
  ResearchSource?: ResearchSourceResolvers;
  RiskTier?: RiskTierResolvers;
  SeverityLevel?: SeverityLevelResolvers;
  Story?: StoryResolvers<ContextType>;
  Subscription?: SubscriptionResolvers<ContextType>;
  TextSegment?: TextSegmentResolvers<ContextType>;
  TherapeuticQuestion?: TherapeuticQuestionResolvers<ContextType>;
  UniqueOutcome?: UniqueOutcomeResolvers<ContextType>;
  UserSettings?: UserSettingsResolvers<ContextType>;
};

