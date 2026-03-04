/* This file was automatically generated. DO NOT UPDATE MANUALLY. */
    import type   { Resolvers } from './types.generated';
    import    { allNotes as Query_allNotes } from './resolvers/Query/allNotes';
import    { allStories as Query_allStories } from './resolvers/Query/allStories';
import    { audioFromR2 as Query_audioFromR2 } from './resolvers/Query/audioFromR2';
import    { behaviorObservation as Query_behaviorObservation } from './resolvers/Query/behaviorObservation';
import    { behaviorObservations as Query_behaviorObservations } from './resolvers/Query/behaviorObservations';
import    { claimCard as Query_claimCard } from './resolvers/Query/claimCard';
import    { claimCardsForNote as Query_claimCardsForNote } from './resolvers/Query/claimCardsForNote';
import    { contact as Query_contact } from './resolvers/Query/contact';
import    { contacts as Query_contacts } from './resolvers/Query/contacts';
import    { familyMember as Query_familyMember } from './resolvers/Query/familyMember';
import    { familyMemberCharacteristic as Query_familyMemberCharacteristic } from './resolvers/Query/familyMemberCharacteristic';
import    { familyMemberCharacteristics as Query_familyMemberCharacteristics } from './resolvers/Query/familyMemberCharacteristics';
import    { familyMembers as Query_familyMembers } from './resolvers/Query/familyMembers';
import    { generationJob as Query_generationJob } from './resolvers/Query/generationJob';
import    { generationJobs as Query_generationJobs } from './resolvers/Query/generationJobs';
import    { goal as Query_goal } from './resolvers/Query/goal';
import    { goalStory as Query_goalStory } from './resolvers/Query/goalStory';
import    { goals as Query_goals } from './resolvers/Query/goals';
import    { journalEntries as Query_journalEntries } from './resolvers/Query/journalEntries';
import    { journalEntry as Query_journalEntry } from './resolvers/Query/journalEntry';
import    { mySharedFamilyMembers as Query_mySharedFamilyMembers } from './resolvers/Query/mySharedFamilyMembers';
import    { mySharedNotes as Query_mySharedNotes } from './resolvers/Query/mySharedNotes';
import    { note as Query_note } from './resolvers/Query/note';
import    { notes as Query_notes } from './resolvers/Query/notes';
import    { relationship as Query_relationship } from './resolvers/Query/relationship';
import    { relationships as Query_relationships } from './resolvers/Query/relationships';
import    { research as Query_research } from './resolvers/Query/research';
import    { stories as Query_stories } from './resolvers/Query/stories';
import    { story as Query_story } from './resolvers/Query/story';
import    { therapeuticQuestions as Query_therapeuticQuestions } from './resolvers/Query/therapeuticQuestions';
import    { userSettings as Query_userSettings } from './resolvers/Query/userSettings';
import    { buildClaimCards as Mutation_buildClaimCards } from './resolvers/Mutation/buildClaimCards';
import    { checkNoteClaims as Mutation_checkNoteClaims } from './resolvers/Mutation/checkNoteClaims';
import    { createBehaviorObservation as Mutation_createBehaviorObservation } from './resolvers/Mutation/createBehaviorObservation';
import    { createContact as Mutation_createContact } from './resolvers/Mutation/createContact';
import    { createFamilyMember as Mutation_createFamilyMember } from './resolvers/Mutation/createFamilyMember';
import    { createFamilyMemberCharacteristic as Mutation_createFamilyMemberCharacteristic } from './resolvers/Mutation/createFamilyMemberCharacteristic';
import    { createGoal as Mutation_createGoal } from './resolvers/Mutation/createGoal';
import    { createJournalEntry as Mutation_createJournalEntry } from './resolvers/Mutation/createJournalEntry';
import    { createNote as Mutation_createNote } from './resolvers/Mutation/createNote';
import    { createRelationship as Mutation_createRelationship } from './resolvers/Mutation/createRelationship';
import    { createStory as Mutation_createStory } from './resolvers/Mutation/createStory';
import    { createSubGoal as Mutation_createSubGoal } from './resolvers/Mutation/createSubGoal';
import    { createUniqueOutcome as Mutation_createUniqueOutcome } from './resolvers/Mutation/createUniqueOutcome';
import    { deleteBehaviorObservation as Mutation_deleteBehaviorObservation } from './resolvers/Mutation/deleteBehaviorObservation';
import    { deleteClaimCard as Mutation_deleteClaimCard } from './resolvers/Mutation/deleteClaimCard';
import    { deleteContact as Mutation_deleteContact } from './resolvers/Mutation/deleteContact';
import    { deleteFamilyMember as Mutation_deleteFamilyMember } from './resolvers/Mutation/deleteFamilyMember';
import    { deleteFamilyMemberCharacteristic as Mutation_deleteFamilyMemberCharacteristic } from './resolvers/Mutation/deleteFamilyMemberCharacteristic';
import    { deleteGoal as Mutation_deleteGoal } from './resolvers/Mutation/deleteGoal';
import    { deleteJournalEntry as Mutation_deleteJournalEntry } from './resolvers/Mutation/deleteJournalEntry';
import    { deleteNote as Mutation_deleteNote } from './resolvers/Mutation/deleteNote';
import    { deleteRelationship as Mutation_deleteRelationship } from './resolvers/Mutation/deleteRelationship';
import    { deleteResearch as Mutation_deleteResearch } from './resolvers/Mutation/deleteResearch';
import    { deleteStory as Mutation_deleteStory } from './resolvers/Mutation/deleteStory';
import    { deleteTherapeuticQuestions as Mutation_deleteTherapeuticQuestions } from './resolvers/Mutation/deleteTherapeuticQuestions';
import    { deleteUniqueOutcome as Mutation_deleteUniqueOutcome } from './resolvers/Mutation/deleteUniqueOutcome';
import    { generateAudio as Mutation_generateAudio } from './resolvers/Mutation/generateAudio';
import    { generateLongFormText as Mutation_generateLongFormText } from './resolvers/Mutation/generateLongFormText';
import    { generateOpenAIAudio as Mutation_generateOpenAIAudio } from './resolvers/Mutation/generateOpenAIAudio';
import    { generateResearch as Mutation_generateResearch } from './resolvers/Mutation/generateResearch';
import    { generateTherapeuticQuestions as Mutation_generateTherapeuticQuestions } from './resolvers/Mutation/generateTherapeuticQuestions';
import    { refreshClaimCard as Mutation_refreshClaimCard } from './resolvers/Mutation/refreshClaimCard';
import    { setNoteVisibility as Mutation_setNoteVisibility } from './resolvers/Mutation/setNoteVisibility';
import    { shareFamilyMember as Mutation_shareFamilyMember } from './resolvers/Mutation/shareFamilyMember';
import    { shareNote as Mutation_shareNote } from './resolvers/Mutation/shareNote';
import    { unshareFamilyMember as Mutation_unshareFamilyMember } from './resolvers/Mutation/unshareFamilyMember';
import    { unshareNote as Mutation_unshareNote } from './resolvers/Mutation/unshareNote';
import    { updateBehaviorObservation as Mutation_updateBehaviorObservation } from './resolvers/Mutation/updateBehaviorObservation';
import    { updateContact as Mutation_updateContact } from './resolvers/Mutation/updateContact';
import    { updateFamilyMember as Mutation_updateFamilyMember } from './resolvers/Mutation/updateFamilyMember';
import    { updateFamilyMemberCharacteristic as Mutation_updateFamilyMemberCharacteristic } from './resolvers/Mutation/updateFamilyMemberCharacteristic';
import    { updateGoal as Mutation_updateGoal } from './resolvers/Mutation/updateGoal';
import    { updateJournalEntry as Mutation_updateJournalEntry } from './resolvers/Mutation/updateJournalEntry';
import    { updateNote as Mutation_updateNote } from './resolvers/Mutation/updateNote';
import    { updateRelationship as Mutation_updateRelationship } from './resolvers/Mutation/updateRelationship';
import    { updateStory as Mutation_updateStory } from './resolvers/Mutation/updateStory';
import    { updateUniqueOutcome as Mutation_updateUniqueOutcome } from './resolvers/Mutation/updateUniqueOutcome';
import    { updateUserSettings as Mutation_updateUserSettings } from './resolvers/Mutation/updateUserSettings';
import    { audioJobStatus as Subscription_audioJobStatus } from './resolvers/Subscription/audioJobStatus';
import    { researchJobStatus as Subscription_researchJobStatus } from './resolvers/Subscription/researchJobStatus';
import    { AudioAsset } from './resolvers/AudioAsset';
import    { AudioFromR2Result } from './resolvers/AudioFromR2Result';
import    { AudioManifest } from './resolvers/AudioManifest';
import    { AudioMetadata } from './resolvers/AudioMetadata';
import    { AudioSegmentInfo } from './resolvers/AudioSegmentInfo';
import    { BehaviorObservation } from './resolvers/BehaviorObservation';
import    { BuildClaimCardsResult } from './resolvers/BuildClaimCardsResult';
import    { CheckNoteClaimsResult } from './resolvers/CheckNoteClaimsResult';
import    { ClaimCard } from './resolvers/ClaimCard';
import    { ClaimProvenance } from './resolvers/ClaimProvenance';
import    { ClaimScope } from './resolvers/ClaimScope';
import    { Contact } from './resolvers/Contact';
import    { DeleteBehaviorObservationResult } from './resolvers/DeleteBehaviorObservationResult';
import    { DeleteContactResult } from './resolvers/DeleteContactResult';
import    { DeleteFamilyMemberCharacteristicResult } from './resolvers/DeleteFamilyMemberCharacteristicResult';
import    { DeleteFamilyMemberResult } from './resolvers/DeleteFamilyMemberResult';
import    { DeleteGoalResult } from './resolvers/DeleteGoalResult';
import    { DeleteJournalEntryResult } from './resolvers/DeleteJournalEntryResult';
import    { DeleteNoteResult } from './resolvers/DeleteNoteResult';
import    { DeleteQuestionsResult } from './resolvers/DeleteQuestionsResult';
import    { DeleteRelationshipResult } from './resolvers/DeleteRelationshipResult';
import    { DeleteResearchResult } from './resolvers/DeleteResearchResult';
import    { DeleteStoryResult } from './resolvers/DeleteStoryResult';
import    { DeleteUniqueOutcomeResult } from './resolvers/DeleteUniqueOutcomeResult';
import    { EvidenceItem } from './resolvers/EvidenceItem';
import    { EvidenceLocator } from './resolvers/EvidenceLocator';
import    { FamilyMember } from './resolvers/FamilyMember';
import    { FamilyMemberCharacteristic } from './resolvers/FamilyMemberCharacteristic';
import    { FamilyMemberShare } from './resolvers/FamilyMemberShare';
import    { GenerateAudioResult } from './resolvers/GenerateAudioResult';
import    { GenerateLongFormTextResult } from './resolvers/GenerateLongFormTextResult';
import    { GenerateOpenAIAudioResult } from './resolvers/GenerateOpenAIAudioResult';
import    { GenerateQuestionsResult } from './resolvers/GenerateQuestionsResult';
import    { GenerateResearchResult } from './resolvers/GenerateResearchResult';
import    { GenerationJob } from './resolvers/GenerationJob';
import    { Goal } from './resolvers/Goal';
import    { GoalStory } from './resolvers/GoalStory';
import    { JobError } from './resolvers/JobError';
import    { JobResult } from './resolvers/JobResult';
import    { JournalEntry } from './resolvers/JournalEntry';
import    { Note } from './resolvers/Note';
import    { NoteAccess } from './resolvers/NoteAccess';
import    { NoteShare } from './resolvers/NoteShare';
import    { PaperCandidate } from './resolvers/PaperCandidate';
import    { Relationship } from './resolvers/Relationship';
import    { RelationshipPerson } from './resolvers/RelationshipPerson';
import    { Research } from './resolvers/Research';
import    { Story } from './resolvers/Story';
import    { TextSegment } from './resolvers/TextSegment';
import    { TherapeuticQuestion } from './resolvers/TherapeuticQuestion';
import    { UniqueOutcome } from './resolvers/UniqueOutcome';
import    { UserSettings } from './resolvers/UserSettings';
    export const resolvers: Resolvers = {
      Query: { allNotes: Query_allNotes,allStories: Query_allStories,audioFromR2: Query_audioFromR2,behaviorObservation: Query_behaviorObservation,behaviorObservations: Query_behaviorObservations,claimCard: Query_claimCard,claimCardsForNote: Query_claimCardsForNote,contact: Query_contact,contacts: Query_contacts,familyMember: Query_familyMember,familyMemberCharacteristic: Query_familyMemberCharacteristic,familyMemberCharacteristics: Query_familyMemberCharacteristics,familyMembers: Query_familyMembers,generationJob: Query_generationJob,generationJobs: Query_generationJobs,goal: Query_goal,goalStory: Query_goalStory,goals: Query_goals,journalEntries: Query_journalEntries,journalEntry: Query_journalEntry,mySharedFamilyMembers: Query_mySharedFamilyMembers,mySharedNotes: Query_mySharedNotes,note: Query_note,notes: Query_notes,relationship: Query_relationship,relationships: Query_relationships,research: Query_research,stories: Query_stories,story: Query_story,therapeuticQuestions: Query_therapeuticQuestions,userSettings: Query_userSettings },
      Mutation: { buildClaimCards: Mutation_buildClaimCards,checkNoteClaims: Mutation_checkNoteClaims,createBehaviorObservation: Mutation_createBehaviorObservation,createContact: Mutation_createContact,createFamilyMember: Mutation_createFamilyMember,createFamilyMemberCharacteristic: Mutation_createFamilyMemberCharacteristic,createGoal: Mutation_createGoal,createJournalEntry: Mutation_createJournalEntry,createNote: Mutation_createNote,createRelationship: Mutation_createRelationship,createStory: Mutation_createStory,createSubGoal: Mutation_createSubGoal,createUniqueOutcome: Mutation_createUniqueOutcome,deleteBehaviorObservation: Mutation_deleteBehaviorObservation,deleteClaimCard: Mutation_deleteClaimCard,deleteContact: Mutation_deleteContact,deleteFamilyMember: Mutation_deleteFamilyMember,deleteFamilyMemberCharacteristic: Mutation_deleteFamilyMemberCharacteristic,deleteGoal: Mutation_deleteGoal,deleteJournalEntry: Mutation_deleteJournalEntry,deleteNote: Mutation_deleteNote,deleteRelationship: Mutation_deleteRelationship,deleteResearch: Mutation_deleteResearch,deleteStory: Mutation_deleteStory,deleteTherapeuticQuestions: Mutation_deleteTherapeuticQuestions,deleteUniqueOutcome: Mutation_deleteUniqueOutcome,generateAudio: Mutation_generateAudio,generateLongFormText: Mutation_generateLongFormText,generateOpenAIAudio: Mutation_generateOpenAIAudio,generateResearch: Mutation_generateResearch,generateTherapeuticQuestions: Mutation_generateTherapeuticQuestions,refreshClaimCard: Mutation_refreshClaimCard,setNoteVisibility: Mutation_setNoteVisibility,shareFamilyMember: Mutation_shareFamilyMember,shareNote: Mutation_shareNote,unshareFamilyMember: Mutation_unshareFamilyMember,unshareNote: Mutation_unshareNote,updateBehaviorObservation: Mutation_updateBehaviorObservation,updateContact: Mutation_updateContact,updateFamilyMember: Mutation_updateFamilyMember,updateFamilyMemberCharacteristic: Mutation_updateFamilyMemberCharacteristic,updateGoal: Mutation_updateGoal,updateJournalEntry: Mutation_updateJournalEntry,updateNote: Mutation_updateNote,updateRelationship: Mutation_updateRelationship,updateStory: Mutation_updateStory,updateUniqueOutcome: Mutation_updateUniqueOutcome,updateUserSettings: Mutation_updateUserSettings },
      Subscription: { audioJobStatus: Subscription_audioJobStatus,researchJobStatus: Subscription_researchJobStatus },
      AudioAsset: AudioAsset,
AudioFromR2Result: AudioFromR2Result,
AudioManifest: AudioManifest,
AudioMetadata: AudioMetadata,
AudioSegmentInfo: AudioSegmentInfo,
BehaviorObservation: BehaviorObservation,
BuildClaimCardsResult: BuildClaimCardsResult,
CheckNoteClaimsResult: CheckNoteClaimsResult,
ClaimCard: ClaimCard,
ClaimProvenance: ClaimProvenance,
ClaimScope: ClaimScope,
Contact: Contact,
DeleteBehaviorObservationResult: DeleteBehaviorObservationResult,
DeleteContactResult: DeleteContactResult,
DeleteFamilyMemberCharacteristicResult: DeleteFamilyMemberCharacteristicResult,
DeleteFamilyMemberResult: DeleteFamilyMemberResult,
DeleteGoalResult: DeleteGoalResult,
DeleteJournalEntryResult: DeleteJournalEntryResult,
DeleteNoteResult: DeleteNoteResult,
DeleteQuestionsResult: DeleteQuestionsResult,
DeleteRelationshipResult: DeleteRelationshipResult,
DeleteResearchResult: DeleteResearchResult,
DeleteStoryResult: DeleteStoryResult,
DeleteUniqueOutcomeResult: DeleteUniqueOutcomeResult,
EvidenceItem: EvidenceItem,
EvidenceLocator: EvidenceLocator,
FamilyMember: FamilyMember,
FamilyMemberCharacteristic: FamilyMemberCharacteristic,
FamilyMemberShare: FamilyMemberShare,
GenerateAudioResult: GenerateAudioResult,
GenerateLongFormTextResult: GenerateLongFormTextResult,
GenerateOpenAIAudioResult: GenerateOpenAIAudioResult,
GenerateQuestionsResult: GenerateQuestionsResult,
GenerateResearchResult: GenerateResearchResult,
GenerationJob: GenerationJob,
Goal: Goal,
GoalStory: GoalStory,
JobError: JobError,
JobResult: JobResult,
JournalEntry: JournalEntry,
Note: Note,
NoteAccess: NoteAccess,
NoteShare: NoteShare,
PaperCandidate: PaperCandidate,
Relationship: Relationship,
RelationshipPerson: RelationshipPerson,
Research: Research,
Story: Story,
TextSegment: TextSegment,
TherapeuticQuestion: TherapeuticQuestion,
UniqueOutcome: UniqueOutcome,
UserSettings: UserSettings
    }