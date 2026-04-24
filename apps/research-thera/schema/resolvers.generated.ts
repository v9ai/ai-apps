/* This file was automatically generated. DO NOT UPDATE MANUALLY. */
    import type   { Resolvers } from './types.generated';
    import    { affirmation as Query_affirmation } from './resolvers/Query/affirmation';
import    { affirmations as Query_affirmations } from './resolvers/Query/affirmations';
import    { allIssues as Query_allIssues } from './resolvers/Query/allIssues';
import    { allNotes as Query_allNotes } from './resolvers/Query/allNotes';
import    { allRecommendedBooks as Query_allRecommendedBooks } from './resolvers/Query/allRecommendedBooks';
import    { allStories as Query_allStories } from './resolvers/Query/allStories';
import    { allTags as Query_allTags } from './resolvers/Query/allTags';
import    { audioFromR2 as Query_audioFromR2 } from './resolvers/Query/audioFromR2';
import    { behaviorObservation as Query_behaviorObservation } from './resolvers/Query/behaviorObservation';
import    { behaviorObservations as Query_behaviorObservations } from './resolvers/Query/behaviorObservations';
import    { bogdanDiscussions as Query_bogdanDiscussions } from './resolvers/Query/bogdanDiscussions';
import    { claimCard as Query_claimCard } from './resolvers/Query/claimCard';
import    { claimCardsForNote as Query_claimCardsForNote } from './resolvers/Query/claimCardsForNote';
import    { contact as Query_contact } from './resolvers/Query/contact';
import    { contactFeedback as Query_contactFeedback } from './resolvers/Query/contactFeedback';
import    { contactFeedbacks as Query_contactFeedbacks } from './resolvers/Query/contactFeedbacks';
import    { contacts as Query_contacts } from './resolvers/Query/contacts';
import    { conversation as Query_conversation } from './resolvers/Query/conversation';
import    { conversationsForIssue as Query_conversationsForIssue } from './resolvers/Query/conversationsForIssue';
import    { deepAnalyses as Query_deepAnalyses } from './resolvers/Query/deepAnalyses';
import    { deepAnalysis as Query_deepAnalysis } from './resolvers/Query/deepAnalysis';
import    { deepIssueAnalyses as Query_deepIssueAnalyses } from './resolvers/Query/deepIssueAnalyses';
import    { deepIssueAnalysis as Query_deepIssueAnalysis } from './resolvers/Query/deepIssueAnalysis';
import    { familyMember as Query_familyMember } from './resolvers/Query/familyMember';
import    { familyMembers as Query_familyMembers } from './resolvers/Query/familyMembers';
import    { game as Query_game } from './resolvers/Query/game';
import    { gameCompletions as Query_gameCompletions } from './resolvers/Query/gameCompletions';
import    { games as Query_games } from './resolvers/Query/games';
import    { generationJob as Query_generationJob } from './resolvers/Query/generationJob';
import    { generationJobs as Query_generationJobs } from './resolvers/Query/generationJobs';
import    { goal as Query_goal } from './resolvers/Query/goal';
import    { goals as Query_goals } from './resolvers/Query/goals';
import    { habit as Query_habit } from './resolvers/Query/habit';
import    { habits as Query_habits } from './resolvers/Query/habits';
import    { issue as Query_issue } from './resolvers/Query/issue';
import    { issues as Query_issues } from './resolvers/Query/issues';
import    { journalEntries as Query_journalEntries } from './resolvers/Query/journalEntries';
import    { journalEntry as Query_journalEntry } from './resolvers/Query/journalEntry';
import    { latestBogdanDiscussion as Query_latestBogdanDiscussion } from './resolvers/Query/latestBogdanDiscussion';
import    { mySharedFamilyMembers as Query_mySharedFamilyMembers } from './resolvers/Query/mySharedFamilyMembers';
import    { mySharedNotes as Query_mySharedNotes } from './resolvers/Query/mySharedNotes';
import    { note as Query_note } from './resolvers/Query/note';
import    { notes as Query_notes } from './resolvers/Query/notes';
import    { publicDiscussionGuide as Query_publicDiscussionGuide } from './resolvers/Query/publicDiscussionGuide';
import    { recommendedBooks as Query_recommendedBooks } from './resolvers/Query/recommendedBooks';
import    { relationship as Query_relationship } from './resolvers/Query/relationship';
import    { relationships as Query_relationships } from './resolvers/Query/relationships';
import    { research as Query_research } from './resolvers/Query/research';
import    { routineAnalyses as Query_routineAnalyses } from './resolvers/Query/routineAnalyses';
import    { routineAnalysis as Query_routineAnalysis } from './resolvers/Query/routineAnalysis';
import    { stories as Query_stories } from './resolvers/Query/stories';
import    { story as Query_story } from './resolvers/Query/story';
import    { tagLanguage as Query_tagLanguage } from './resolvers/Query/tagLanguage';
import    { teacherFeedback as Query_teacherFeedback } from './resolvers/Query/teacherFeedback';
import    { teacherFeedbacks as Query_teacherFeedbacks } from './resolvers/Query/teacherFeedbacks';
import    { therapeuticQuestions as Query_therapeuticQuestions } from './resolvers/Query/therapeuticQuestions';
import    { userSettings as Query_userSettings } from './resolvers/Query/userSettings';
import    { vaultStatus as Query_vaultStatus } from './resolvers/Query/vaultStatus';
import    { buildClaimCards as Mutation_buildClaimCards } from './resolvers/Mutation/buildClaimCards';
import    { checkNoteClaims as Mutation_checkNoteClaims } from './resolvers/Mutation/checkNoteClaims';
import    { convertIssueToGoal as Mutation_convertIssueToGoal } from './resolvers/Mutation/convertIssueToGoal';
import    { convertJournalEntryToIssue as Mutation_convertJournalEntryToIssue } from './resolvers/Mutation/convertJournalEntryToIssue';
import    { createAffirmation as Mutation_createAffirmation } from './resolvers/Mutation/createAffirmation';
import    { createContact as Mutation_createContact } from './resolvers/Mutation/createContact';
import    { createContactFeedback as Mutation_createContactFeedback } from './resolvers/Mutation/createContactFeedback';
import    { createConversation as Mutation_createConversation } from './resolvers/Mutation/createConversation';
import    { createFamilyMember as Mutation_createFamilyMember } from './resolvers/Mutation/createFamilyMember';
import    { createGame as Mutation_createGame } from './resolvers/Mutation/createGame';
import    { createGoal as Mutation_createGoal } from './resolvers/Mutation/createGoal';
import    { createHabit as Mutation_createHabit } from './resolvers/Mutation/createHabit';
import    { createIssue as Mutation_createIssue } from './resolvers/Mutation/createIssue';
import    { createJournalEntry as Mutation_createJournalEntry } from './resolvers/Mutation/createJournalEntry';
import    { createNote as Mutation_createNote } from './resolvers/Mutation/createNote';
import    { createRelatedIssue as Mutation_createRelatedIssue } from './resolvers/Mutation/createRelatedIssue';
import    { createRelationship as Mutation_createRelationship } from './resolvers/Mutation/createRelationship';
import    { createStory as Mutation_createStory } from './resolvers/Mutation/createStory';
import    { createSubGoal as Mutation_createSubGoal } from './resolvers/Mutation/createSubGoal';
import    { createTeacherFeedback as Mutation_createTeacherFeedback } from './resolvers/Mutation/createTeacherFeedback';
import    { deleteAffirmation as Mutation_deleteAffirmation } from './resolvers/Mutation/deleteAffirmation';
import    { deleteBehaviorObservation as Mutation_deleteBehaviorObservation } from './resolvers/Mutation/deleteBehaviorObservation';
import    { deleteClaimCard as Mutation_deleteClaimCard } from './resolvers/Mutation/deleteClaimCard';
import    { deleteContact as Mutation_deleteContact } from './resolvers/Mutation/deleteContact';
import    { deleteContactFeedback as Mutation_deleteContactFeedback } from './resolvers/Mutation/deleteContactFeedback';
import    { deleteConversation as Mutation_deleteConversation } from './resolvers/Mutation/deleteConversation';
import    { deleteDeepAnalysis as Mutation_deleteDeepAnalysis } from './resolvers/Mutation/deleteDeepAnalysis';
import    { deleteDeepIssueAnalysis as Mutation_deleteDeepIssueAnalysis } from './resolvers/Mutation/deleteDeepIssueAnalysis';
import    { deleteDiscussionGuide as Mutation_deleteDiscussionGuide } from './resolvers/Mutation/deleteDiscussionGuide';
import    { deleteFamilyMember as Mutation_deleteFamilyMember } from './resolvers/Mutation/deleteFamilyMember';
import    { deleteGame as Mutation_deleteGame } from './resolvers/Mutation/deleteGame';
import    { deleteGoal as Mutation_deleteGoal } from './resolvers/Mutation/deleteGoal';
import    { deleteHabit as Mutation_deleteHabit } from './resolvers/Mutation/deleteHabit';
import    { deleteHabitLog as Mutation_deleteHabitLog } from './resolvers/Mutation/deleteHabitLog';
import    { deleteIssue as Mutation_deleteIssue } from './resolvers/Mutation/deleteIssue';
import    { deleteIssueScreenshot as Mutation_deleteIssueScreenshot } from './resolvers/Mutation/deleteIssueScreenshot';
import    { deleteJournalAnalysis as Mutation_deleteJournalAnalysis } from './resolvers/Mutation/deleteJournalAnalysis';
import    { deleteJournalEntry as Mutation_deleteJournalEntry } from './resolvers/Mutation/deleteJournalEntry';
import    { deleteNote as Mutation_deleteNote } from './resolvers/Mutation/deleteNote';
import    { deleteRecommendedBooks as Mutation_deleteRecommendedBooks } from './resolvers/Mutation/deleteRecommendedBooks';
import    { deleteRelationship as Mutation_deleteRelationship } from './resolvers/Mutation/deleteRelationship';
import    { deleteResearch as Mutation_deleteResearch } from './resolvers/Mutation/deleteResearch';
import    { deleteRoutineAnalysis as Mutation_deleteRoutineAnalysis } from './resolvers/Mutation/deleteRoutineAnalysis';
import    { deleteStory as Mutation_deleteStory } from './resolvers/Mutation/deleteStory';
import    { deleteTeacherFeedback as Mutation_deleteTeacherFeedback } from './resolvers/Mutation/deleteTeacherFeedback';
import    { deleteTherapeuticQuestions as Mutation_deleteTherapeuticQuestions } from './resolvers/Mutation/deleteTherapeuticQuestions';
import    { extractContactFeedbackIssues as Mutation_extractContactFeedbackIssues } from './resolvers/Mutation/extractContactFeedbackIssues';
import    { generateAffirmationsForFamilyMember as Mutation_generateAffirmationsForFamilyMember } from './resolvers/Mutation/generateAffirmationsForFamilyMember';
import    { generateAudio as Mutation_generateAudio } from './resolvers/Mutation/generateAudio';
import    { generateBogdanDiscussion as Mutation_generateBogdanDiscussion } from './resolvers/Mutation/generateBogdanDiscussion';
import    { generateDeepAnalysis as Mutation_generateDeepAnalysis } from './resolvers/Mutation/generateDeepAnalysis';
import    { generateDeepIssueAnalysis as Mutation_generateDeepIssueAnalysis } from './resolvers/Mutation/generateDeepIssueAnalysis';
import    { generateDiscussionGuide as Mutation_generateDiscussionGuide } from './resolvers/Mutation/generateDiscussionGuide';
import    { generateGame as Mutation_generateGame } from './resolvers/Mutation/generateGame';
import    { generateHabitsForFamilyMember as Mutation_generateHabitsForFamilyMember } from './resolvers/Mutation/generateHabitsForFamilyMember';
import    { generateHabitsFromIssue as Mutation_generateHabitsFromIssue } from './resolvers/Mutation/generateHabitsFromIssue';
import    { generateJournalAnalysis as Mutation_generateJournalAnalysis } from './resolvers/Mutation/generateJournalAnalysis';
import    { generateLongFormText as Mutation_generateLongFormText } from './resolvers/Mutation/generateLongFormText';
import    { generateOpenAIAudio as Mutation_generateOpenAIAudio } from './resolvers/Mutation/generateOpenAIAudio';
import    { generateParentAdvice as Mutation_generateParentAdvice } from './resolvers/Mutation/generateParentAdvice';
import    { generateRecommendedBooks as Mutation_generateRecommendedBooks } from './resolvers/Mutation/generateRecommendedBooks';
import    { generateResearch as Mutation_generateResearch } from './resolvers/Mutation/generateResearch';
import    { generateRoutineAnalysis as Mutation_generateRoutineAnalysis } from './resolvers/Mutation/generateRoutineAnalysis';
import    { generateTherapeuticQuestions as Mutation_generateTherapeuticQuestions } from './resolvers/Mutation/generateTherapeuticQuestions';
import    { linkContactToIssue as Mutation_linkContactToIssue } from './resolvers/Mutation/linkContactToIssue';
import    { linkIssues as Mutation_linkIssues } from './resolvers/Mutation/linkIssues';
import    { lockVault as Mutation_lockVault } from './resolvers/Mutation/lockVault';
import    { logGameCompletion as Mutation_logGameCompletion } from './resolvers/Mutation/logGameCompletion';
import    { logHabit as Mutation_logHabit } from './resolvers/Mutation/logHabit';
import    { markTeacherFeedbackExtracted as Mutation_markTeacherFeedbackExtracted } from './resolvers/Mutation/markTeacherFeedbackExtracted';
import    { refreshClaimCard as Mutation_refreshClaimCard } from './resolvers/Mutation/refreshClaimCard';
import    { sendConversationMessage as Mutation_sendConversationMessage } from './resolvers/Mutation/sendConversationMessage';
import    { setNoteVisibility as Mutation_setNoteVisibility } from './resolvers/Mutation/setNoteVisibility';
import    { setTagLanguage as Mutation_setTagLanguage } from './resolvers/Mutation/setTagLanguage';
import    { shareFamilyMember as Mutation_shareFamilyMember } from './resolvers/Mutation/shareFamilyMember';
import    { shareNote as Mutation_shareNote } from './resolvers/Mutation/shareNote';
import    { unlinkContactFromIssue as Mutation_unlinkContactFromIssue } from './resolvers/Mutation/unlinkContactFromIssue';
import    { unlinkGoalFamilyMember as Mutation_unlinkGoalFamilyMember } from './resolvers/Mutation/unlinkGoalFamilyMember';
import    { unlinkIssues as Mutation_unlinkIssues } from './resolvers/Mutation/unlinkIssues';
import    { unlockVault as Mutation_unlockVault } from './resolvers/Mutation/unlockVault';
import    { unshareFamilyMember as Mutation_unshareFamilyMember } from './resolvers/Mutation/unshareFamilyMember';
import    { unshareNote as Mutation_unshareNote } from './resolvers/Mutation/unshareNote';
import    { updateAffirmation as Mutation_updateAffirmation } from './resolvers/Mutation/updateAffirmation';
import    { updateBehaviorObservation as Mutation_updateBehaviorObservation } from './resolvers/Mutation/updateBehaviorObservation';
import    { updateContact as Mutation_updateContact } from './resolvers/Mutation/updateContact';
import    { updateContactFeedback as Mutation_updateContactFeedback } from './resolvers/Mutation/updateContactFeedback';
import    { updateFamilyMember as Mutation_updateFamilyMember } from './resolvers/Mutation/updateFamilyMember';
import    { updateGame as Mutation_updateGame } from './resolvers/Mutation/updateGame';
import    { updateGoal as Mutation_updateGoal } from './resolvers/Mutation/updateGoal';
import    { updateHabit as Mutation_updateHabit } from './resolvers/Mutation/updateHabit';
import    { updateIssue as Mutation_updateIssue } from './resolvers/Mutation/updateIssue';
import    { updateJournalEntry as Mutation_updateJournalEntry } from './resolvers/Mutation/updateJournalEntry';
import    { updateNote as Mutation_updateNote } from './resolvers/Mutation/updateNote';
import    { updateRelationship as Mutation_updateRelationship } from './resolvers/Mutation/updateRelationship';
import    { updateStory as Mutation_updateStory } from './resolvers/Mutation/updateStory';
import    { updateTeacherFeedback as Mutation_updateTeacherFeedback } from './resolvers/Mutation/updateTeacherFeedback';
import    { updateUserSettings as Mutation_updateUserSettings } from './resolvers/Mutation/updateUserSettings';
import    { audioJobStatus as Subscription_audioJobStatus } from './resolvers/Subscription/audioJobStatus';
import    { researchJobStatus as Subscription_researchJobStatus } from './resolvers/Subscription/researchJobStatus';
import    { ActionableRecommendation } from './resolvers/ActionableRecommendation';
import    { Affirmation } from './resolvers/Affirmation';
import    { AnticipatedReaction } from './resolvers/AnticipatedReaction';
import    { AudioAsset } from './resolvers/AudioAsset';
import    { AudioFromR2Result } from './resolvers/AudioFromR2Result';
import    { AudioManifest } from './resolvers/AudioManifest';
import    { AudioMetadata } from './resolvers/AudioMetadata';
import    { AudioSegmentInfo } from './resolvers/AudioSegmentInfo';
import    { BehaviorObservation } from './resolvers/BehaviorObservation';
import    { BogdanDiscussionGuide } from './resolvers/BogdanDiscussionGuide';
import    { BuildClaimCardsResult } from './resolvers/BuildClaimCardsResult';
import    { CheckNoteClaimsResult } from './resolvers/CheckNoteClaimsResult';
import    { Citation } from './resolvers/Citation';
import    { ClaimCard } from './resolvers/ClaimCard';
import    { ClaimProvenance } from './resolvers/ClaimProvenance';
import    { ClaimScope } from './resolvers/ClaimScope';
import    { Contact } from './resolvers/Contact';
import    { ContactFeedback } from './resolvers/ContactFeedback';
import    { Conversation } from './resolvers/Conversation';
import    { ConversationMessage } from './resolvers/ConversationMessage';
import    { ConversationStarter } from './resolvers/ConversationStarter';
import    { CritiqueScores } from './resolvers/CritiqueScores';
import    { DataSnapshot } from './resolvers/DataSnapshot';
import    { DeepAnalysis } from './resolvers/DeepAnalysis';
import    { DeepIssueAnalysis } from './resolvers/DeepIssueAnalysis';
import    { DeleteAffirmationResult } from './resolvers/DeleteAffirmationResult';
import    { DeleteBehaviorObservationResult } from './resolvers/DeleteBehaviorObservationResult';
import    { DeleteContactFeedbackResult } from './resolvers/DeleteContactFeedbackResult';
import    { DeleteContactResult } from './resolvers/DeleteContactResult';
import    { DeleteConversationResult } from './resolvers/DeleteConversationResult';
import    { DeleteDeepAnalysisResult } from './resolvers/DeleteDeepAnalysisResult';
import    { DeleteDiscussionGuideResult } from './resolvers/DeleteDiscussionGuideResult';
import    { DeleteFamilyMemberResult } from './resolvers/DeleteFamilyMemberResult';
import    { DeleteGameResult } from './resolvers/DeleteGameResult';
import    { DeleteGoalResult } from './resolvers/DeleteGoalResult';
import    { DeleteHabitResult } from './resolvers/DeleteHabitResult';
import    { DeleteIssueResult } from './resolvers/DeleteIssueResult';
import    { DeleteIssueScreenshotResult } from './resolvers/DeleteIssueScreenshotResult';
import    { DeleteJournalAnalysisResult } from './resolvers/DeleteJournalAnalysisResult';
import    { DeleteJournalEntryResult } from './resolvers/DeleteJournalEntryResult';
import    { DeleteNoteResult } from './resolvers/DeleteNoteResult';
import    { DeleteQuestionsResult } from './resolvers/DeleteQuestionsResult';
import    { DeleteRecommendedBooksResult } from './resolvers/DeleteRecommendedBooksResult';
import    { DeleteRelationshipResult } from './resolvers/DeleteRelationshipResult';
import    { DeleteResearchResult } from './resolvers/DeleteResearchResult';
import    { DeleteRoutineAnalysisResult } from './resolvers/DeleteRoutineAnalysisResult';
import    { DeleteStoryResult } from './resolvers/DeleteStoryResult';
import    { DeleteTeacherFeedbackResult } from './resolvers/DeleteTeacherFeedbackResult';
import    { DevelopmentalContext } from './resolvers/DevelopmentalContext';
import    { DiscussionGuide } from './resolvers/DiscussionGuide';
import    { DiscussionGuideCritique } from './resolvers/DiscussionGuideCritique';
import    { EmotionalLandscape } from './resolvers/EmotionalLandscape';
import    { EvidenceItem } from './resolvers/EvidenceItem';
import    { EvidenceLocator } from './resolvers/EvidenceLocator';
import    { ExtractedIssue } from './resolvers/ExtractedIssue';
import    { FamilyMember } from './resolvers/FamilyMember';
import    { FamilyMemberShare } from './resolvers/FamilyMemberShare';
import    { FamilySystemInsight } from './resolvers/FamilySystemInsight';
import    { FollowUpStep } from './resolvers/FollowUpStep';
import    { Game } from './resolvers/Game';
import    { GameCompletion } from './resolvers/GameCompletion';
import    { GenerateAffirmationsResult } from './resolvers/GenerateAffirmationsResult';
import    { GenerateAudioResult } from './resolvers/GenerateAudioResult';
import    { GenerateBogdanDiscussionResult } from './resolvers/GenerateBogdanDiscussionResult';
import    { GenerateDeepAnalysisResult } from './resolvers/GenerateDeepAnalysisResult';
import    { GenerateDiscussionGuideResult } from './resolvers/GenerateDiscussionGuideResult';
import    { GenerateHabitsResult } from './resolvers/GenerateHabitsResult';
import    { GenerateJournalAnalysisResult } from './resolvers/GenerateJournalAnalysisResult';
import    { GenerateLongFormTextResult } from './resolvers/GenerateLongFormTextResult';
import    { GenerateOpenAIAudioResult } from './resolvers/GenerateOpenAIAudioResult';
import    { GenerateParentAdviceResult } from './resolvers/GenerateParentAdviceResult';
import    { GenerateQuestionsResult } from './resolvers/GenerateQuestionsResult';
import    { GenerateRecommendedBooksResult } from './resolvers/GenerateRecommendedBooksResult';
import    { GenerateResearchResult } from './resolvers/GenerateResearchResult';
import    { GenerateRoutineAnalysisResult } from './resolvers/GenerateRoutineAnalysisResult';
import    { GenerationJob } from './resolvers/GenerationJob';
import    { Goal } from './resolvers/Goal';
import    { Habit } from './resolvers/Habit';
import    { HabitAdherence } from './resolvers/HabitAdherence';
import    { HabitLog } from './resolvers/HabitLog';
import    { Issue } from './resolvers/Issue';
import    { IssueContactLink } from './resolvers/IssueContactLink';
import    { IssueLink } from './resolvers/IssueLink';
import    { IssueScreenshot } from './resolvers/IssueScreenshot';
import    { JobError } from './resolvers/JobError';
import    { JobResult } from './resolvers/JobResult';
import    { JournalAnalysis } from './resolvers/JournalAnalysis';
import    { JournalEntry } from './resolvers/JournalEntry';
import    { LanguageExample } from './resolvers/LanguageExample';
import    { LanguageGuide } from './resolvers/LanguageGuide';
import    { Note } from './resolvers/Note';
import    { NoteAccess } from './resolvers/NoteAccess';
import    { NoteShare } from './resolvers/NoteShare';
import    { PaperCandidate } from './resolvers/PaperCandidate';
import    { ParentAdviceItem } from './resolvers/ParentAdviceItem';
import    { PatternCluster } from './resolvers/PatternCluster';
import    { PipelineDiagnostics } from './resolvers/PipelineDiagnostics';
import    { PriorityRecommendation } from './resolvers/PriorityRecommendation';
import    { PublicDiscussionGuideResult } from './resolvers/PublicDiscussionGuideResult';
import    { RecommendedBook } from './resolvers/RecommendedBook';
import    { Relationship } from './resolvers/Relationship';
import    { RelationshipPerson } from './resolvers/RelationshipPerson';
import    { Research } from './resolvers/Research';
import    { ResearchRelevanceMapping } from './resolvers/ResearchRelevanceMapping';
import    { RoutineAnalysis } from './resolvers/RoutineAnalysis';
import    { RoutineBalance } from './resolvers/RoutineBalance';
import    { RoutineDataSnapshot } from './resolvers/RoutineDataSnapshot';
import    { RoutineGap } from './resolvers/RoutineGap';
import    { RoutineOptimization } from './resolvers/RoutineOptimization';
import    { RoutineResearchMapping } from './resolvers/RoutineResearchMapping';
import    { Story } from './resolvers/Story';
import    { StreakSummary } from './resolvers/StreakSummary';
import    { TalkingPoint } from './resolvers/TalkingPoint';
import    { TeacherFeedback } from './resolvers/TeacherFeedback';
import    { TextSegment } from './resolvers/TextSegment';
import    { TherapeuticInsight } from './resolvers/TherapeuticInsight';
import    { TherapeuticQuestion } from './resolvers/TherapeuticQuestion';
import    { TimelineAnalysis } from './resolvers/TimelineAnalysis';
import    { TimelinePhase } from './resolvers/TimelinePhase';
import    { UnlinkContactResult } from './resolvers/UnlinkContactResult';
import    { UnlinkIssuesResult } from './resolvers/UnlinkIssuesResult';
import    { UserSettings } from './resolvers/UserSettings';
import    { VaultStatus } from './resolvers/VaultStatus';
import    { VaultUnlockResult } from './resolvers/VaultUnlockResult';
    export const resolvers: Resolvers = {
      Query: { affirmation: Query_affirmation,affirmations: Query_affirmations,allIssues: Query_allIssues,allNotes: Query_allNotes,allRecommendedBooks: Query_allRecommendedBooks,allStories: Query_allStories,allTags: Query_allTags,audioFromR2: Query_audioFromR2,behaviorObservation: Query_behaviorObservation,behaviorObservations: Query_behaviorObservations,bogdanDiscussions: Query_bogdanDiscussions,claimCard: Query_claimCard,claimCardsForNote: Query_claimCardsForNote,contact: Query_contact,contactFeedback: Query_contactFeedback,contactFeedbacks: Query_contactFeedbacks,contacts: Query_contacts,conversation: Query_conversation,conversationsForIssue: Query_conversationsForIssue,deepAnalyses: Query_deepAnalyses,deepAnalysis: Query_deepAnalysis,deepIssueAnalyses: Query_deepIssueAnalyses,deepIssueAnalysis: Query_deepIssueAnalysis,familyMember: Query_familyMember,familyMembers: Query_familyMembers,game: Query_game,gameCompletions: Query_gameCompletions,games: Query_games,generationJob: Query_generationJob,generationJobs: Query_generationJobs,goal: Query_goal,goals: Query_goals,habit: Query_habit,habits: Query_habits,issue: Query_issue,issues: Query_issues,journalEntries: Query_journalEntries,journalEntry: Query_journalEntry,latestBogdanDiscussion: Query_latestBogdanDiscussion,mySharedFamilyMembers: Query_mySharedFamilyMembers,mySharedNotes: Query_mySharedNotes,note: Query_note,notes: Query_notes,publicDiscussionGuide: Query_publicDiscussionGuide,recommendedBooks: Query_recommendedBooks,relationship: Query_relationship,relationships: Query_relationships,research: Query_research,routineAnalyses: Query_routineAnalyses,routineAnalysis: Query_routineAnalysis,stories: Query_stories,story: Query_story,tagLanguage: Query_tagLanguage,teacherFeedback: Query_teacherFeedback,teacherFeedbacks: Query_teacherFeedbacks,therapeuticQuestions: Query_therapeuticQuestions,userSettings: Query_userSettings,vaultStatus: Query_vaultStatus },
      Mutation: { buildClaimCards: Mutation_buildClaimCards,checkNoteClaims: Mutation_checkNoteClaims,convertIssueToGoal: Mutation_convertIssueToGoal,convertJournalEntryToIssue: Mutation_convertJournalEntryToIssue,createAffirmation: Mutation_createAffirmation,createContact: Mutation_createContact,createContactFeedback: Mutation_createContactFeedback,createConversation: Mutation_createConversation,createFamilyMember: Mutation_createFamilyMember,createGame: Mutation_createGame,createGoal: Mutation_createGoal,createHabit: Mutation_createHabit,createIssue: Mutation_createIssue,createJournalEntry: Mutation_createJournalEntry,createNote: Mutation_createNote,createRelatedIssue: Mutation_createRelatedIssue,createRelationship: Mutation_createRelationship,createStory: Mutation_createStory,createSubGoal: Mutation_createSubGoal,createTeacherFeedback: Mutation_createTeacherFeedback,deleteAffirmation: Mutation_deleteAffirmation,deleteBehaviorObservation: Mutation_deleteBehaviorObservation,deleteClaimCard: Mutation_deleteClaimCard,deleteContact: Mutation_deleteContact,deleteContactFeedback: Mutation_deleteContactFeedback,deleteConversation: Mutation_deleteConversation,deleteDeepAnalysis: Mutation_deleteDeepAnalysis,deleteDeepIssueAnalysis: Mutation_deleteDeepIssueAnalysis,deleteDiscussionGuide: Mutation_deleteDiscussionGuide,deleteFamilyMember: Mutation_deleteFamilyMember,deleteGame: Mutation_deleteGame,deleteGoal: Mutation_deleteGoal,deleteHabit: Mutation_deleteHabit,deleteHabitLog: Mutation_deleteHabitLog,deleteIssue: Mutation_deleteIssue,deleteIssueScreenshot: Mutation_deleteIssueScreenshot,deleteJournalAnalysis: Mutation_deleteJournalAnalysis,deleteJournalEntry: Mutation_deleteJournalEntry,deleteNote: Mutation_deleteNote,deleteRecommendedBooks: Mutation_deleteRecommendedBooks,deleteRelationship: Mutation_deleteRelationship,deleteResearch: Mutation_deleteResearch,deleteRoutineAnalysis: Mutation_deleteRoutineAnalysis,deleteStory: Mutation_deleteStory,deleteTeacherFeedback: Mutation_deleteTeacherFeedback,deleteTherapeuticQuestions: Mutation_deleteTherapeuticQuestions,extractContactFeedbackIssues: Mutation_extractContactFeedbackIssues,generateAffirmationsForFamilyMember: Mutation_generateAffirmationsForFamilyMember,generateAudio: Mutation_generateAudio,generateBogdanDiscussion: Mutation_generateBogdanDiscussion,generateDeepAnalysis: Mutation_generateDeepAnalysis,generateDeepIssueAnalysis: Mutation_generateDeepIssueAnalysis,generateDiscussionGuide: Mutation_generateDiscussionGuide,generateGame: Mutation_generateGame,generateHabitsForFamilyMember: Mutation_generateHabitsForFamilyMember,generateHabitsFromIssue: Mutation_generateHabitsFromIssue,generateJournalAnalysis: Mutation_generateJournalAnalysis,generateLongFormText: Mutation_generateLongFormText,generateOpenAIAudio: Mutation_generateOpenAIAudio,generateParentAdvice: Mutation_generateParentAdvice,generateRecommendedBooks: Mutation_generateRecommendedBooks,generateResearch: Mutation_generateResearch,generateRoutineAnalysis: Mutation_generateRoutineAnalysis,generateTherapeuticQuestions: Mutation_generateTherapeuticQuestions,linkContactToIssue: Mutation_linkContactToIssue,linkIssues: Mutation_linkIssues,lockVault: Mutation_lockVault,logGameCompletion: Mutation_logGameCompletion,logHabit: Mutation_logHabit,markTeacherFeedbackExtracted: Mutation_markTeacherFeedbackExtracted,refreshClaimCard: Mutation_refreshClaimCard,sendConversationMessage: Mutation_sendConversationMessage,setNoteVisibility: Mutation_setNoteVisibility,setTagLanguage: Mutation_setTagLanguage,shareFamilyMember: Mutation_shareFamilyMember,shareNote: Mutation_shareNote,unlinkContactFromIssue: Mutation_unlinkContactFromIssue,unlinkGoalFamilyMember: Mutation_unlinkGoalFamilyMember,unlinkIssues: Mutation_unlinkIssues,unlockVault: Mutation_unlockVault,unshareFamilyMember: Mutation_unshareFamilyMember,unshareNote: Mutation_unshareNote,updateAffirmation: Mutation_updateAffirmation,updateBehaviorObservation: Mutation_updateBehaviorObservation,updateContact: Mutation_updateContact,updateContactFeedback: Mutation_updateContactFeedback,updateFamilyMember: Mutation_updateFamilyMember,updateGame: Mutation_updateGame,updateGoal: Mutation_updateGoal,updateHabit: Mutation_updateHabit,updateIssue: Mutation_updateIssue,updateJournalEntry: Mutation_updateJournalEntry,updateNote: Mutation_updateNote,updateRelationship: Mutation_updateRelationship,updateStory: Mutation_updateStory,updateTeacherFeedback: Mutation_updateTeacherFeedback,updateUserSettings: Mutation_updateUserSettings },
      Subscription: { audioJobStatus: Subscription_audioJobStatus,researchJobStatus: Subscription_researchJobStatus },
      ActionableRecommendation: ActionableRecommendation,
Affirmation: Affirmation,
AnticipatedReaction: AnticipatedReaction,
AudioAsset: AudioAsset,
AudioFromR2Result: AudioFromR2Result,
AudioManifest: AudioManifest,
AudioMetadata: AudioMetadata,
AudioSegmentInfo: AudioSegmentInfo,
BehaviorObservation: BehaviorObservation,
BogdanDiscussionGuide: BogdanDiscussionGuide,
BuildClaimCardsResult: BuildClaimCardsResult,
CheckNoteClaimsResult: CheckNoteClaimsResult,
Citation: Citation,
ClaimCard: ClaimCard,
ClaimProvenance: ClaimProvenance,
ClaimScope: ClaimScope,
Contact: Contact,
ContactFeedback: ContactFeedback,
Conversation: Conversation,
ConversationMessage: ConversationMessage,
ConversationStarter: ConversationStarter,
CritiqueScores: CritiqueScores,
DataSnapshot: DataSnapshot,
DeepAnalysis: DeepAnalysis,
DeepIssueAnalysis: DeepIssueAnalysis,
DeleteAffirmationResult: DeleteAffirmationResult,
DeleteBehaviorObservationResult: DeleteBehaviorObservationResult,
DeleteContactFeedbackResult: DeleteContactFeedbackResult,
DeleteContactResult: DeleteContactResult,
DeleteConversationResult: DeleteConversationResult,
DeleteDeepAnalysisResult: DeleteDeepAnalysisResult,
DeleteDiscussionGuideResult: DeleteDiscussionGuideResult,
DeleteFamilyMemberResult: DeleteFamilyMemberResult,
DeleteGameResult: DeleteGameResult,
DeleteGoalResult: DeleteGoalResult,
DeleteHabitResult: DeleteHabitResult,
DeleteIssueResult: DeleteIssueResult,
DeleteIssueScreenshotResult: DeleteIssueScreenshotResult,
DeleteJournalAnalysisResult: DeleteJournalAnalysisResult,
DeleteJournalEntryResult: DeleteJournalEntryResult,
DeleteNoteResult: DeleteNoteResult,
DeleteQuestionsResult: DeleteQuestionsResult,
DeleteRecommendedBooksResult: DeleteRecommendedBooksResult,
DeleteRelationshipResult: DeleteRelationshipResult,
DeleteResearchResult: DeleteResearchResult,
DeleteRoutineAnalysisResult: DeleteRoutineAnalysisResult,
DeleteStoryResult: DeleteStoryResult,
DeleteTeacherFeedbackResult: DeleteTeacherFeedbackResult,
DevelopmentalContext: DevelopmentalContext,
DiscussionGuide: DiscussionGuide,
DiscussionGuideCritique: DiscussionGuideCritique,
EmotionalLandscape: EmotionalLandscape,
EvidenceItem: EvidenceItem,
EvidenceLocator: EvidenceLocator,
ExtractedIssue: ExtractedIssue,
FamilyMember: FamilyMember,
FamilyMemberShare: FamilyMemberShare,
FamilySystemInsight: FamilySystemInsight,
FollowUpStep: FollowUpStep,
Game: Game,
GameCompletion: GameCompletion,
GenerateAffirmationsResult: GenerateAffirmationsResult,
GenerateAudioResult: GenerateAudioResult,
GenerateBogdanDiscussionResult: GenerateBogdanDiscussionResult,
GenerateDeepAnalysisResult: GenerateDeepAnalysisResult,
GenerateDiscussionGuideResult: GenerateDiscussionGuideResult,
GenerateHabitsResult: GenerateHabitsResult,
GenerateJournalAnalysisResult: GenerateJournalAnalysisResult,
GenerateLongFormTextResult: GenerateLongFormTextResult,
GenerateOpenAIAudioResult: GenerateOpenAIAudioResult,
GenerateParentAdviceResult: GenerateParentAdviceResult,
GenerateQuestionsResult: GenerateQuestionsResult,
GenerateRecommendedBooksResult: GenerateRecommendedBooksResult,
GenerateResearchResult: GenerateResearchResult,
GenerateRoutineAnalysisResult: GenerateRoutineAnalysisResult,
GenerationJob: GenerationJob,
Goal: Goal,
Habit: Habit,
HabitAdherence: HabitAdherence,
HabitLog: HabitLog,
Issue: Issue,
IssueContactLink: IssueContactLink,
IssueLink: IssueLink,
IssueScreenshot: IssueScreenshot,
JobError: JobError,
JobResult: JobResult,
JournalAnalysis: JournalAnalysis,
JournalEntry: JournalEntry,
LanguageExample: LanguageExample,
LanguageGuide: LanguageGuide,
Note: Note,
NoteAccess: NoteAccess,
NoteShare: NoteShare,
PaperCandidate: PaperCandidate,
ParentAdviceItem: ParentAdviceItem,
PatternCluster: PatternCluster,
PipelineDiagnostics: PipelineDiagnostics,
PriorityRecommendation: PriorityRecommendation,
PublicDiscussionGuideResult: PublicDiscussionGuideResult,
RecommendedBook: RecommendedBook,
Relationship: Relationship,
RelationshipPerson: RelationshipPerson,
Research: Research,
ResearchRelevanceMapping: ResearchRelevanceMapping,
RoutineAnalysis: RoutineAnalysis,
RoutineBalance: RoutineBalance,
RoutineDataSnapshot: RoutineDataSnapshot,
RoutineGap: RoutineGap,
RoutineOptimization: RoutineOptimization,
RoutineResearchMapping: RoutineResearchMapping,
Story: Story,
StreakSummary: StreakSummary,
TalkingPoint: TalkingPoint,
TeacherFeedback: TeacherFeedback,
TextSegment: TextSegment,
TherapeuticInsight: TherapeuticInsight,
TherapeuticQuestion: TherapeuticQuestion,
TimelineAnalysis: TimelineAnalysis,
TimelinePhase: TimelinePhase,
UnlinkContactResult: UnlinkContactResult,
UnlinkIssuesResult: UnlinkIssuesResult,
UserSettings: UserSettings,
VaultStatus: VaultStatus,
VaultUnlockResult: VaultUnlockResult
    }