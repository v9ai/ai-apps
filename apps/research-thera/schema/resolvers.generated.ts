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
import    { contactFeedback as Query_contactFeedback } from './resolvers/Query/contactFeedback';
import    { contactFeedbacks as Query_contactFeedbacks } from './resolvers/Query/contactFeedbacks';
import    { contacts as Query_contacts } from './resolvers/Query/contacts';
import    { deepIssueAnalyses as Query_deepIssueAnalyses } from './resolvers/Query/deepIssueAnalyses';
import    { deepIssueAnalysis as Query_deepIssueAnalysis } from './resolvers/Query/deepIssueAnalysis';
import    { familyMember as Query_familyMember } from './resolvers/Query/familyMember';
import    { familyMembers as Query_familyMembers } from './resolvers/Query/familyMembers';
import    { generationJob as Query_generationJob } from './resolvers/Query/generationJob';
import    { generationJobs as Query_generationJobs } from './resolvers/Query/generationJobs';
import    { goal as Query_goal } from './resolvers/Query/goal';
import    { goals as Query_goals } from './resolvers/Query/goals';
import    { issue as Query_issue } from './resolvers/Query/issue';
import    { issues as Query_issues } from './resolvers/Query/issues';
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
import    { teacherFeedback as Query_teacherFeedback } from './resolvers/Query/teacherFeedback';
import    { teacherFeedbacks as Query_teacherFeedbacks } from './resolvers/Query/teacherFeedbacks';
import    { therapeuticQuestions as Query_therapeuticQuestions } from './resolvers/Query/therapeuticQuestions';
import    { userSettings as Query_userSettings } from './resolvers/Query/userSettings';
import    { buildClaimCards as Mutation_buildClaimCards } from './resolvers/Mutation/buildClaimCards';
import    { checkNoteClaims as Mutation_checkNoteClaims } from './resolvers/Mutation/checkNoteClaims';
import    { convertIssueToGoal as Mutation_convertIssueToGoal } from './resolvers/Mutation/convertIssueToGoal';
import    { convertJournalEntryToIssue as Mutation_convertJournalEntryToIssue } from './resolvers/Mutation/convertJournalEntryToIssue';
import    { createContact as Mutation_createContact } from './resolvers/Mutation/createContact';
import    { createContactFeedback as Mutation_createContactFeedback } from './resolvers/Mutation/createContactFeedback';
import    { createFamilyMember as Mutation_createFamilyMember } from './resolvers/Mutation/createFamilyMember';
import    { createGoal as Mutation_createGoal } from './resolvers/Mutation/createGoal';
import    { createIssue as Mutation_createIssue } from './resolvers/Mutation/createIssue';
import    { createJournalEntry as Mutation_createJournalEntry } from './resolvers/Mutation/createJournalEntry';
import    { createNote as Mutation_createNote } from './resolvers/Mutation/createNote';
import    { createRelatedIssue as Mutation_createRelatedIssue } from './resolvers/Mutation/createRelatedIssue';
import    { createRelationship as Mutation_createRelationship } from './resolvers/Mutation/createRelationship';
import    { createStory as Mutation_createStory } from './resolvers/Mutation/createStory';
import    { createSubGoal as Mutation_createSubGoal } from './resolvers/Mutation/createSubGoal';
import    { createTeacherFeedback as Mutation_createTeacherFeedback } from './resolvers/Mutation/createTeacherFeedback';
import    { deleteBehaviorObservation as Mutation_deleteBehaviorObservation } from './resolvers/Mutation/deleteBehaviorObservation';
import    { deleteClaimCard as Mutation_deleteClaimCard } from './resolvers/Mutation/deleteClaimCard';
import    { deleteContact as Mutation_deleteContact } from './resolvers/Mutation/deleteContact';
import    { deleteContactFeedback as Mutation_deleteContactFeedback } from './resolvers/Mutation/deleteContactFeedback';
import    { deleteDeepIssueAnalysis as Mutation_deleteDeepIssueAnalysis } from './resolvers/Mutation/deleteDeepIssueAnalysis';
import    { deleteFamilyMember as Mutation_deleteFamilyMember } from './resolvers/Mutation/deleteFamilyMember';
import    { deleteGoal as Mutation_deleteGoal } from './resolvers/Mutation/deleteGoal';
import    { deleteIssue as Mutation_deleteIssue } from './resolvers/Mutation/deleteIssue';
import    { deleteJournalEntry as Mutation_deleteJournalEntry } from './resolvers/Mutation/deleteJournalEntry';
import    { deleteNote as Mutation_deleteNote } from './resolvers/Mutation/deleteNote';
import    { deleteRelationship as Mutation_deleteRelationship } from './resolvers/Mutation/deleteRelationship';
import    { deleteResearch as Mutation_deleteResearch } from './resolvers/Mutation/deleteResearch';
import    { deleteStory as Mutation_deleteStory } from './resolvers/Mutation/deleteStory';
import    { deleteTeacherFeedback as Mutation_deleteTeacherFeedback } from './resolvers/Mutation/deleteTeacherFeedback';
import    { deleteTherapeuticQuestions as Mutation_deleteTherapeuticQuestions } from './resolvers/Mutation/deleteTherapeuticQuestions';
import    { extractContactFeedbackIssues as Mutation_extractContactFeedbackIssues } from './resolvers/Mutation/extractContactFeedbackIssues';
import    { generateAudio as Mutation_generateAudio } from './resolvers/Mutation/generateAudio';
import    { generateDeepIssueAnalysis as Mutation_generateDeepIssueAnalysis } from './resolvers/Mutation/generateDeepIssueAnalysis';
import    { generateLongFormText as Mutation_generateLongFormText } from './resolvers/Mutation/generateLongFormText';
import    { generateOpenAIAudio as Mutation_generateOpenAIAudio } from './resolvers/Mutation/generateOpenAIAudio';
import    { generateParentAdvice as Mutation_generateParentAdvice } from './resolvers/Mutation/generateParentAdvice';
import    { generateResearch as Mutation_generateResearch } from './resolvers/Mutation/generateResearch';
import    { generateTherapeuticQuestions as Mutation_generateTherapeuticQuestions } from './resolvers/Mutation/generateTherapeuticQuestions';
import    { linkIssues as Mutation_linkIssues } from './resolvers/Mutation/linkIssues';
import    { markTeacherFeedbackExtracted as Mutation_markTeacherFeedbackExtracted } from './resolvers/Mutation/markTeacherFeedbackExtracted';
import    { refreshClaimCard as Mutation_refreshClaimCard } from './resolvers/Mutation/refreshClaimCard';
import    { setNoteVisibility as Mutation_setNoteVisibility } from './resolvers/Mutation/setNoteVisibility';
import    { shareFamilyMember as Mutation_shareFamilyMember } from './resolvers/Mutation/shareFamilyMember';
import    { shareNote as Mutation_shareNote } from './resolvers/Mutation/shareNote';
import    { unlinkGoalFamilyMember as Mutation_unlinkGoalFamilyMember } from './resolvers/Mutation/unlinkGoalFamilyMember';
import    { unlinkIssues as Mutation_unlinkIssues } from './resolvers/Mutation/unlinkIssues';
import    { unshareFamilyMember as Mutation_unshareFamilyMember } from './resolvers/Mutation/unshareFamilyMember';
import    { unshareNote as Mutation_unshareNote } from './resolvers/Mutation/unshareNote';
import    { updateBehaviorObservation as Mutation_updateBehaviorObservation } from './resolvers/Mutation/updateBehaviorObservation';
import    { updateContact as Mutation_updateContact } from './resolvers/Mutation/updateContact';
import    { updateContactFeedback as Mutation_updateContactFeedback } from './resolvers/Mutation/updateContactFeedback';
import    { updateFamilyMember as Mutation_updateFamilyMember } from './resolvers/Mutation/updateFamilyMember';
import    { updateGoal as Mutation_updateGoal } from './resolvers/Mutation/updateGoal';
import    { updateIssue as Mutation_updateIssue } from './resolvers/Mutation/updateIssue';
import    { updateJournalEntry as Mutation_updateJournalEntry } from './resolvers/Mutation/updateJournalEntry';
import    { updateNote as Mutation_updateNote } from './resolvers/Mutation/updateNote';
import    { updateRelationship as Mutation_updateRelationship } from './resolvers/Mutation/updateRelationship';
import    { updateStory as Mutation_updateStory } from './resolvers/Mutation/updateStory';
import    { updateTeacherFeedback as Mutation_updateTeacherFeedback } from './resolvers/Mutation/updateTeacherFeedback';
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
import    { ContactFeedback } from './resolvers/ContactFeedback';
import    { DataSnapshot } from './resolvers/DataSnapshot';
import    { DeepIssueAnalysis } from './resolvers/DeepIssueAnalysis';
import    { DeleteBehaviorObservationResult } from './resolvers/DeleteBehaviorObservationResult';
import    { DeleteContactFeedbackResult } from './resolvers/DeleteContactFeedbackResult';
import    { DeleteContactResult } from './resolvers/DeleteContactResult';
import    { DeleteDeepAnalysisResult } from './resolvers/DeleteDeepAnalysisResult';
import    { DeleteFamilyMemberResult } from './resolvers/DeleteFamilyMemberResult';
import    { DeleteGoalResult } from './resolvers/DeleteGoalResult';
import    { DeleteIssueResult } from './resolvers/DeleteIssueResult';
import    { DeleteJournalEntryResult } from './resolvers/DeleteJournalEntryResult';
import    { DeleteNoteResult } from './resolvers/DeleteNoteResult';
import    { DeleteQuestionsResult } from './resolvers/DeleteQuestionsResult';
import    { DeleteRelationshipResult } from './resolvers/DeleteRelationshipResult';
import    { DeleteResearchResult } from './resolvers/DeleteResearchResult';
import    { DeleteStoryResult } from './resolvers/DeleteStoryResult';
import    { DeleteTeacherFeedbackResult } from './resolvers/DeleteTeacherFeedbackResult';
import    { EvidenceItem } from './resolvers/EvidenceItem';
import    { EvidenceLocator } from './resolvers/EvidenceLocator';
import    { ExtractedIssue } from './resolvers/ExtractedIssue';
import    { FamilyMember } from './resolvers/FamilyMember';
import    { FamilyMemberShare } from './resolvers/FamilyMemberShare';
import    { FamilySystemInsight } from './resolvers/FamilySystemInsight';
import    { GenerateAudioResult } from './resolvers/GenerateAudioResult';
import    { GenerateDeepAnalysisResult } from './resolvers/GenerateDeepAnalysisResult';
import    { GenerateLongFormTextResult } from './resolvers/GenerateLongFormTextResult';
import    { GenerateOpenAIAudioResult } from './resolvers/GenerateOpenAIAudioResult';
import    { GenerateParentAdviceResult } from './resolvers/GenerateParentAdviceResult';
import    { GenerateQuestionsResult } from './resolvers/GenerateQuestionsResult';
import    { GenerateResearchResult } from './resolvers/GenerateResearchResult';
import    { GenerationJob } from './resolvers/GenerationJob';
import    { Goal } from './resolvers/Goal';
import    { Issue } from './resolvers/Issue';
import    { IssueLink } from './resolvers/IssueLink';
import    { JobError } from './resolvers/JobError';
import    { JobResult } from './resolvers/JobResult';
import    { JournalEntry } from './resolvers/JournalEntry';
import    { Note } from './resolvers/Note';
import    { NoteAccess } from './resolvers/NoteAccess';
import    { NoteShare } from './resolvers/NoteShare';
import    { PaperCandidate } from './resolvers/PaperCandidate';
import    { ParentAdviceItem } from './resolvers/ParentAdviceItem';
import    { PatternCluster } from './resolvers/PatternCluster';
import    { PipelineDiagnostics } from './resolvers/PipelineDiagnostics';
import    { PriorityRecommendation } from './resolvers/PriorityRecommendation';
import    { Relationship } from './resolvers/Relationship';
import    { RelationshipPerson } from './resolvers/RelationshipPerson';
import    { Research } from './resolvers/Research';
import    { ResearchRelevanceMapping } from './resolvers/ResearchRelevanceMapping';
import    { Story } from './resolvers/Story';
import    { TeacherFeedback } from './resolvers/TeacherFeedback';
import    { TextSegment } from './resolvers/TextSegment';
import    { TherapeuticQuestion } from './resolvers/TherapeuticQuestion';
import    { TimelineAnalysis } from './resolvers/TimelineAnalysis';
import    { TimelinePhase } from './resolvers/TimelinePhase';
import    { UnlinkIssuesResult } from './resolvers/UnlinkIssuesResult';
import    { UserSettings } from './resolvers/UserSettings';
    export const resolvers: Resolvers = {
      Query: { allNotes: Query_allNotes,allStories: Query_allStories,audioFromR2: Query_audioFromR2,behaviorObservation: Query_behaviorObservation,behaviorObservations: Query_behaviorObservations,claimCard: Query_claimCard,claimCardsForNote: Query_claimCardsForNote,contact: Query_contact,contactFeedback: Query_contactFeedback,contactFeedbacks: Query_contactFeedbacks,contacts: Query_contacts,deepIssueAnalyses: Query_deepIssueAnalyses,deepIssueAnalysis: Query_deepIssueAnalysis,familyMember: Query_familyMember,familyMembers: Query_familyMembers,generationJob: Query_generationJob,generationJobs: Query_generationJobs,goal: Query_goal,goals: Query_goals,issue: Query_issue,issues: Query_issues,journalEntries: Query_journalEntries,journalEntry: Query_journalEntry,mySharedFamilyMembers: Query_mySharedFamilyMembers,mySharedNotes: Query_mySharedNotes,note: Query_note,notes: Query_notes,relationship: Query_relationship,relationships: Query_relationships,research: Query_research,stories: Query_stories,story: Query_story,teacherFeedback: Query_teacherFeedback,teacherFeedbacks: Query_teacherFeedbacks,therapeuticQuestions: Query_therapeuticQuestions,userSettings: Query_userSettings },
      Mutation: { buildClaimCards: Mutation_buildClaimCards,checkNoteClaims: Mutation_checkNoteClaims,convertIssueToGoal: Mutation_convertIssueToGoal,convertJournalEntryToIssue: Mutation_convertJournalEntryToIssue,createContact: Mutation_createContact,createContactFeedback: Mutation_createContactFeedback,createFamilyMember: Mutation_createFamilyMember,createGoal: Mutation_createGoal,createIssue: Mutation_createIssue,createJournalEntry: Mutation_createJournalEntry,createNote: Mutation_createNote,createRelatedIssue: Mutation_createRelatedIssue,createRelationship: Mutation_createRelationship,createStory: Mutation_createStory,createSubGoal: Mutation_createSubGoal,createTeacherFeedback: Mutation_createTeacherFeedback,deleteBehaviorObservation: Mutation_deleteBehaviorObservation,deleteClaimCard: Mutation_deleteClaimCard,deleteContact: Mutation_deleteContact,deleteContactFeedback: Mutation_deleteContactFeedback,deleteDeepIssueAnalysis: Mutation_deleteDeepIssueAnalysis,deleteFamilyMember: Mutation_deleteFamilyMember,deleteGoal: Mutation_deleteGoal,deleteIssue: Mutation_deleteIssue,deleteJournalEntry: Mutation_deleteJournalEntry,deleteNote: Mutation_deleteNote,deleteRelationship: Mutation_deleteRelationship,deleteResearch: Mutation_deleteResearch,deleteStory: Mutation_deleteStory,deleteTeacherFeedback: Mutation_deleteTeacherFeedback,deleteTherapeuticQuestions: Mutation_deleteTherapeuticQuestions,extractContactFeedbackIssues: Mutation_extractContactFeedbackIssues,generateAudio: Mutation_generateAudio,generateDeepIssueAnalysis: Mutation_generateDeepIssueAnalysis,generateLongFormText: Mutation_generateLongFormText,generateOpenAIAudio: Mutation_generateOpenAIAudio,generateParentAdvice: Mutation_generateParentAdvice,generateResearch: Mutation_generateResearch,generateTherapeuticQuestions: Mutation_generateTherapeuticQuestions,linkIssues: Mutation_linkIssues,markTeacherFeedbackExtracted: Mutation_markTeacherFeedbackExtracted,refreshClaimCard: Mutation_refreshClaimCard,setNoteVisibility: Mutation_setNoteVisibility,shareFamilyMember: Mutation_shareFamilyMember,shareNote: Mutation_shareNote,unlinkGoalFamilyMember: Mutation_unlinkGoalFamilyMember,unlinkIssues: Mutation_unlinkIssues,unshareFamilyMember: Mutation_unshareFamilyMember,unshareNote: Mutation_unshareNote,updateBehaviorObservation: Mutation_updateBehaviorObservation,updateContact: Mutation_updateContact,updateContactFeedback: Mutation_updateContactFeedback,updateFamilyMember: Mutation_updateFamilyMember,updateGoal: Mutation_updateGoal,updateIssue: Mutation_updateIssue,updateJournalEntry: Mutation_updateJournalEntry,updateNote: Mutation_updateNote,updateRelationship: Mutation_updateRelationship,updateStory: Mutation_updateStory,updateTeacherFeedback: Mutation_updateTeacherFeedback,updateUserSettings: Mutation_updateUserSettings },
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
ContactFeedback: ContactFeedback,
DataSnapshot: DataSnapshot,
DeepIssueAnalysis: DeepIssueAnalysis,
DeleteBehaviorObservationResult: DeleteBehaviorObservationResult,
DeleteContactFeedbackResult: DeleteContactFeedbackResult,
DeleteContactResult: DeleteContactResult,
DeleteDeepAnalysisResult: DeleteDeepAnalysisResult,
DeleteFamilyMemberResult: DeleteFamilyMemberResult,
DeleteGoalResult: DeleteGoalResult,
DeleteIssueResult: DeleteIssueResult,
DeleteJournalEntryResult: DeleteJournalEntryResult,
DeleteNoteResult: DeleteNoteResult,
DeleteQuestionsResult: DeleteQuestionsResult,
DeleteRelationshipResult: DeleteRelationshipResult,
DeleteResearchResult: DeleteResearchResult,
DeleteStoryResult: DeleteStoryResult,
DeleteTeacherFeedbackResult: DeleteTeacherFeedbackResult,
EvidenceItem: EvidenceItem,
EvidenceLocator: EvidenceLocator,
ExtractedIssue: ExtractedIssue,
FamilyMember: FamilyMember,
FamilyMemberShare: FamilyMemberShare,
FamilySystemInsight: FamilySystemInsight,
GenerateAudioResult: GenerateAudioResult,
GenerateDeepAnalysisResult: GenerateDeepAnalysisResult,
GenerateLongFormTextResult: GenerateLongFormTextResult,
GenerateOpenAIAudioResult: GenerateOpenAIAudioResult,
GenerateParentAdviceResult: GenerateParentAdviceResult,
GenerateQuestionsResult: GenerateQuestionsResult,
GenerateResearchResult: GenerateResearchResult,
GenerationJob: GenerationJob,
Goal: Goal,
Issue: Issue,
IssueLink: IssueLink,
JobError: JobError,
JobResult: JobResult,
JournalEntry: JournalEntry,
Note: Note,
NoteAccess: NoteAccess,
NoteShare: NoteShare,
PaperCandidate: PaperCandidate,
ParentAdviceItem: ParentAdviceItem,
PatternCluster: PatternCluster,
PipelineDiagnostics: PipelineDiagnostics,
PriorityRecommendation: PriorityRecommendation,
Relationship: Relationship,
RelationshipPerson: RelationshipPerson,
Research: Research,
ResearchRelevanceMapping: ResearchRelevanceMapping,
Story: Story,
TeacherFeedback: TeacherFeedback,
TextSegment: TextSegment,
TherapeuticQuestion: TherapeuticQuestion,
TimelineAnalysis: TimelineAnalysis,
TimelinePhase: TimelinePhase,
UnlinkIssuesResult: UnlinkIssuesResult,
UserSettings: UserSettings
    }