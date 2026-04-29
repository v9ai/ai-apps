/* This file was automatically generated. DO NOT UPDATE MANUALLY. */
    import type   { Resolvers } from './types.generated';
    import    { affirmation as Query_affirmation } from './resolvers/Query/affirmation';
import    { affirmations as Query_affirmations } from './resolvers/Query/affirmations';
import    { allIssues as Query_allIssues } from './resolvers/Query/allIssues';
import    { allNotes as Query_allNotes } from './resolvers/Query/allNotes';
import    { allRecommendedBooks as Query_allRecommendedBooks } from './resolvers/Query/allRecommendedBooks';
import    { allStories as Query_allStories } from './resolvers/Query/allStories';
import    { allTags as Query_allTags } from './resolvers/Query/allTags';
import    { allergies as Query_allergies } from './resolvers/Query/allergies';
import    { appointments as Query_appointments } from './resolvers/Query/appointments';
import    { audioFromR2 as Query_audioFromR2 } from './resolvers/Query/audioFromR2';
import    { behaviorObservation as Query_behaviorObservation } from './resolvers/Query/behaviorObservation';
import    { behaviorObservations as Query_behaviorObservations } from './resolvers/Query/behaviorObservations';
import    { bloodTests as Query_bloodTests } from './resolvers/Query/bloodTests';
import    { bogdanDiscussions as Query_bogdanDiscussions } from './resolvers/Query/bogdanDiscussions';
import    { claimCard as Query_claimCard } from './resolvers/Query/claimCard';
import    { claimCardsForNote as Query_claimCardsForNote } from './resolvers/Query/claimCardsForNote';
import    { condition as Query_condition } from './resolvers/Query/condition';
import    { conditionDeepResearch as Query_conditionDeepResearch } from './resolvers/Query/conditionDeepResearch';
import    { conditions as Query_conditions } from './resolvers/Query/conditions';
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
import    { doctor as Query_doctor } from './resolvers/Query/doctor';
import    { doctors as Query_doctors } from './resolvers/Query/doctors';
import    { familyDocuments as Query_familyDocuments } from './resolvers/Query/familyDocuments';
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
import    { healthcareMarkerTrend as Query_healthcareMarkerTrend } from './resolvers/Query/healthcareMarkerTrend';
import    { healthcareSearch as Query_healthcareSearch } from './resolvers/Query/healthcareSearch';
import    { healthcareSummary as Query_healthcareSummary } from './resolvers/Query/healthcareSummary';
import    { issue as Query_issue } from './resolvers/Query/issue';
import    { issues as Query_issues } from './resolvers/Query/issues';
import    { journalEntries as Query_journalEntries } from './resolvers/Query/journalEntries';
import    { journalEntry as Query_journalEntry } from './resolvers/Query/journalEntry';
import    { latestBogdanDiscussion as Query_latestBogdanDiscussion } from './resolvers/Query/latestBogdanDiscussion';
import    { medicalLetters as Query_medicalLetters } from './resolvers/Query/medicalLetters';
import    { medication as Query_medication } from './resolvers/Query/medication';
import    { medicationDeepResearch as Query_medicationDeepResearch } from './resolvers/Query/medicationDeepResearch';
import    { medications as Query_medications } from './resolvers/Query/medications';
import    { memoryBaseline as Query_memoryBaseline } from './resolvers/Query/memoryBaseline';
import    { memoryEntries as Query_memoryEntries } from './resolvers/Query/memoryEntries';
import    { mySharedFamilyMembers as Query_mySharedFamilyMembers } from './resolvers/Query/mySharedFamilyMembers';
import    { mySharedNotes as Query_mySharedNotes } from './resolvers/Query/mySharedNotes';
import    { note as Query_note } from './resolvers/Query/note';
import    { notes as Query_notes } from './resolvers/Query/notes';
import    { protocol as Query_protocol } from './resolvers/Query/protocol';
import    { protocols as Query_protocols } from './resolvers/Query/protocols';
import    { publicDiscussionGuide as Query_publicDiscussionGuide } from './resolvers/Query/publicDiscussionGuide';
import    { recommendedBooks as Query_recommendedBooks } from './resolvers/Query/recommendedBooks';
import    { regimenAnalysis as Query_regimenAnalysis } from './resolvers/Query/regimenAnalysis';
import    { relationship as Query_relationship } from './resolvers/Query/relationship';
import    { relationships as Query_relationships } from './resolvers/Query/relationships';
import    { research as Query_research } from './resolvers/Query/research';
import    { routineAnalyses as Query_routineAnalyses } from './resolvers/Query/routineAnalyses';
import    { routineAnalysis as Query_routineAnalysis } from './resolvers/Query/routineAnalysis';
import    { stories as Query_stories } from './resolvers/Query/stories';
import    { story as Query_story } from './resolvers/Query/story';
import    { symptoms as Query_symptoms } from './resolvers/Query/symptoms';
import    { tagLanguage as Query_tagLanguage } from './resolvers/Query/tagLanguage';
import    { task as Query_task } from './resolvers/Query/task';
import    { taskCounts as Query_taskCounts } from './resolvers/Query/taskCounts';
import    { tasks as Query_tasks } from './resolvers/Query/tasks';
import    { teacherFeedback as Query_teacherFeedback } from './resolvers/Query/teacherFeedback';
import    { teacherFeedbacks as Query_teacherFeedbacks } from './resolvers/Query/teacherFeedbacks';
import    { therapeuticQuestions as Query_therapeuticQuestions } from './resolvers/Query/therapeuticQuestions';
import    { userPreferences as Query_userPreferences } from './resolvers/Query/userPreferences';
import    { userSettings as Query_userSettings } from './resolvers/Query/userSettings';
import    { userStreak as Query_userStreak } from './resolvers/Query/userStreak';
import    { vaultStatus as Query_vaultStatus } from './resolvers/Query/vaultStatus';
import    { vehicle as Query_vehicle } from './resolvers/Query/vehicle';
import    { vehicles as Query_vehicles } from './resolvers/Query/vehicles';
import    { addAllergy as Mutation_addAllergy } from './resolvers/Mutation/addAllergy';
import    { addAppointment as Mutation_addAppointment } from './resolvers/Mutation/addAppointment';
import    { addCondition as Mutation_addCondition } from './resolvers/Mutation/addCondition';
import    { addDoctor as Mutation_addDoctor } from './resolvers/Mutation/addDoctor';
import    { addMedication as Mutation_addMedication } from './resolvers/Mutation/addMedication';
import    { addMemoryEntry as Mutation_addMemoryEntry } from './resolvers/Mutation/addMemoryEntry';
import    { addProtocol as Mutation_addProtocol } from './resolvers/Mutation/addProtocol';
import    { addSupplement as Mutation_addSupplement } from './resolvers/Mutation/addSupplement';
import    { addSymptom as Mutation_addSymptom } from './resolvers/Mutation/addSymptom';
import    { addTaskDependency as Mutation_addTaskDependency } from './resolvers/Mutation/addTaskDependency';
import    { addVehicle as Mutation_addVehicle } from './resolvers/Mutation/addVehicle';
import    { addVehiclePhoto as Mutation_addVehiclePhoto } from './resolvers/Mutation/addVehiclePhoto';
import    { addVehicleServiceRecord as Mutation_addVehicleServiceRecord } from './resolvers/Mutation/addVehicleServiceRecord';
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
import    { createTask as Mutation_createTask } from './resolvers/Mutation/createTask';
import    { createTeacherFeedback as Mutation_createTeacherFeedback } from './resolvers/Mutation/createTeacherFeedback';
import    { deleteAffirmation as Mutation_deleteAffirmation } from './resolvers/Mutation/deleteAffirmation';
import    { deleteAllergy as Mutation_deleteAllergy } from './resolvers/Mutation/deleteAllergy';
import    { deleteAppointment as Mutation_deleteAppointment } from './resolvers/Mutation/deleteAppointment';
import    { deleteBehaviorObservation as Mutation_deleteBehaviorObservation } from './resolvers/Mutation/deleteBehaviorObservation';
import    { deleteBloodTest as Mutation_deleteBloodTest } from './resolvers/Mutation/deleteBloodTest';
import    { deleteClaimCard as Mutation_deleteClaimCard } from './resolvers/Mutation/deleteClaimCard';
import    { deleteCondition as Mutation_deleteCondition } from './resolvers/Mutation/deleteCondition';
import    { deleteContact as Mutation_deleteContact } from './resolvers/Mutation/deleteContact';
import    { deleteContactFeedback as Mutation_deleteContactFeedback } from './resolvers/Mutation/deleteContactFeedback';
import    { deleteConversation as Mutation_deleteConversation } from './resolvers/Mutation/deleteConversation';
import    { deleteDeepAnalysis as Mutation_deleteDeepAnalysis } from './resolvers/Mutation/deleteDeepAnalysis';
import    { deleteDeepIssueAnalysis as Mutation_deleteDeepIssueAnalysis } from './resolvers/Mutation/deleteDeepIssueAnalysis';
import    { deleteDiscussionGuide as Mutation_deleteDiscussionGuide } from './resolvers/Mutation/deleteDiscussionGuide';
import    { deleteDoctor as Mutation_deleteDoctor } from './resolvers/Mutation/deleteDoctor';
import    { deleteFamilyMember as Mutation_deleteFamilyMember } from './resolvers/Mutation/deleteFamilyMember';
import    { deleteGame as Mutation_deleteGame } from './resolvers/Mutation/deleteGame';
import    { deleteGoal as Mutation_deleteGoal } from './resolvers/Mutation/deleteGoal';
import    { deleteHabit as Mutation_deleteHabit } from './resolvers/Mutation/deleteHabit';
import    { deleteHabitLog as Mutation_deleteHabitLog } from './resolvers/Mutation/deleteHabitLog';
import    { deleteIssue as Mutation_deleteIssue } from './resolvers/Mutation/deleteIssue';
import    { deleteIssueScreenshot as Mutation_deleteIssueScreenshot } from './resolvers/Mutation/deleteIssueScreenshot';
import    { deleteJournalAnalysis as Mutation_deleteJournalAnalysis } from './resolvers/Mutation/deleteJournalAnalysis';
import    { deleteJournalEntry as Mutation_deleteJournalEntry } from './resolvers/Mutation/deleteJournalEntry';
import    { deleteMedicalLetter as Mutation_deleteMedicalLetter } from './resolvers/Mutation/deleteMedicalLetter';
import    { deleteMedication as Mutation_deleteMedication } from './resolvers/Mutation/deleteMedication';
import    { deleteMemoryEntry as Mutation_deleteMemoryEntry } from './resolvers/Mutation/deleteMemoryEntry';
import    { deleteNote as Mutation_deleteNote } from './resolvers/Mutation/deleteNote';
import    { deleteProtocol as Mutation_deleteProtocol } from './resolvers/Mutation/deleteProtocol';
import    { deleteRecommendedBooks as Mutation_deleteRecommendedBooks } from './resolvers/Mutation/deleteRecommendedBooks';
import    { deleteRelationship as Mutation_deleteRelationship } from './resolvers/Mutation/deleteRelationship';
import    { deleteResearch as Mutation_deleteResearch } from './resolvers/Mutation/deleteResearch';
import    { deleteRoutineAnalysis as Mutation_deleteRoutineAnalysis } from './resolvers/Mutation/deleteRoutineAnalysis';
import    { deleteStory as Mutation_deleteStory } from './resolvers/Mutation/deleteStory';
import    { deleteSupplement as Mutation_deleteSupplement } from './resolvers/Mutation/deleteSupplement';
import    { deleteSymptom as Mutation_deleteSymptom } from './resolvers/Mutation/deleteSymptom';
import    { deleteTask as Mutation_deleteTask } from './resolvers/Mutation/deleteTask';
import    { deleteTeacherFeedback as Mutation_deleteTeacherFeedback } from './resolvers/Mutation/deleteTeacherFeedback';
import    { deleteTherapeuticQuestions as Mutation_deleteTherapeuticQuestions } from './resolvers/Mutation/deleteTherapeuticQuestions';
import    { deleteVehicle as Mutation_deleteVehicle } from './resolvers/Mutation/deleteVehicle';
import    { deleteVehiclePhoto as Mutation_deleteVehiclePhoto } from './resolvers/Mutation/deleteVehiclePhoto';
import    { deleteVehicleServiceRecord as Mutation_deleteVehicleServiceRecord } from './resolvers/Mutation/deleteVehicleServiceRecord';
import    { extractContactFeedbackIssues as Mutation_extractContactFeedbackIssues } from './resolvers/Mutation/extractContactFeedbackIssues';
import    { generateAffirmationsForFamilyMember as Mutation_generateAffirmationsForFamilyMember } from './resolvers/Mutation/generateAffirmationsForFamilyMember';
import    { generateAudio as Mutation_generateAudio } from './resolvers/Mutation/generateAudio';
import    { generateBogdanDiscussion as Mutation_generateBogdanDiscussion } from './resolvers/Mutation/generateBogdanDiscussion';
import    { generateConditionDeepResearch as Mutation_generateConditionDeepResearch } from './resolvers/Mutation/generateConditionDeepResearch';
import    { generateDeepAnalysis as Mutation_generateDeepAnalysis } from './resolvers/Mutation/generateDeepAnalysis';
import    { generateDeepIssueAnalysis as Mutation_generateDeepIssueAnalysis } from './resolvers/Mutation/generateDeepIssueAnalysis';
import    { generateDiscussionGuide as Mutation_generateDiscussionGuide } from './resolvers/Mutation/generateDiscussionGuide';
import    { generateGame as Mutation_generateGame } from './resolvers/Mutation/generateGame';
import    { generateHabitsForFamilyMember as Mutation_generateHabitsForFamilyMember } from './resolvers/Mutation/generateHabitsForFamilyMember';
import    { generateHabitsFromIssue as Mutation_generateHabitsFromIssue } from './resolvers/Mutation/generateHabitsFromIssue';
import    { generateJournalAnalysis as Mutation_generateJournalAnalysis } from './resolvers/Mutation/generateJournalAnalysis';
import    { generateLongFormText as Mutation_generateLongFormText } from './resolvers/Mutation/generateLongFormText';
import    { generateMedicationDeepResearch as Mutation_generateMedicationDeepResearch } from './resolvers/Mutation/generateMedicationDeepResearch';
import    { generateOpenAIAudio as Mutation_generateOpenAIAudio } from './resolvers/Mutation/generateOpenAIAudio';
import    { generateParentAdvice as Mutation_generateParentAdvice } from './resolvers/Mutation/generateParentAdvice';
import    { generateRecommendedBooks as Mutation_generateRecommendedBooks } from './resolvers/Mutation/generateRecommendedBooks';
import    { generateRegimenAnalysis as Mutation_generateRegimenAnalysis } from './resolvers/Mutation/generateRegimenAnalysis';
import    { generateResearch as Mutation_generateResearch } from './resolvers/Mutation/generateResearch';
import    { generateRoutineAnalysis as Mutation_generateRoutineAnalysis } from './resolvers/Mutation/generateRoutineAnalysis';
import    { generateTherapeuticQuestions as Mutation_generateTherapeuticQuestions } from './resolvers/Mutation/generateTherapeuticQuestions';
import    { linkContactToIssue as Mutation_linkContactToIssue } from './resolvers/Mutation/linkContactToIssue';
import    { linkIssues as Mutation_linkIssues } from './resolvers/Mutation/linkIssues';
import    { lockVault as Mutation_lockVault } from './resolvers/Mutation/lockVault';
import    { logGameCompletion as Mutation_logGameCompletion } from './resolvers/Mutation/logGameCompletion';
import    { logHabit as Mutation_logHabit } from './resolvers/Mutation/logHabit';
import    { markTeacherFeedbackExtracted as Mutation_markTeacherFeedbackExtracted } from './resolvers/Mutation/markTeacherFeedbackExtracted';
import    { parseTaskFromText as Mutation_parseTaskFromText } from './resolvers/Mutation/parseTaskFromText';
import    { recordCognitiveBaseline as Mutation_recordCognitiveBaseline } from './resolvers/Mutation/recordCognitiveBaseline';
import    { recordCognitiveCheckIn as Mutation_recordCognitiveCheckIn } from './resolvers/Mutation/recordCognitiveCheckIn';
import    { refreshClaimCard as Mutation_refreshClaimCard } from './resolvers/Mutation/refreshClaimCard';
import    { removeTaskDependency as Mutation_removeTaskDependency } from './resolvers/Mutation/removeTaskDependency';
import    { reorderTasks as Mutation_reorderTasks } from './resolvers/Mutation/reorderTasks';
import    { requestVehiclePhotoUpload as Mutation_requestVehiclePhotoUpload } from './resolvers/Mutation/requestVehiclePhotoUpload';
import    { sendConversationMessage as Mutation_sendConversationMessage } from './resolvers/Mutation/sendConversationMessage';
import    { sendHealthcareChatMessage as Mutation_sendHealthcareChatMessage } from './resolvers/Mutation/sendHealthcareChatMessage';
import    { setMedicationActive as Mutation_setMedicationActive } from './resolvers/Mutation/setMedicationActive';
import    { setMemoryBaseline as Mutation_setMemoryBaseline } from './resolvers/Mutation/setMemoryBaseline';
import    { setNoteVisibility as Mutation_setNoteVisibility } from './resolvers/Mutation/setNoteVisibility';
import    { setTagLanguage as Mutation_setTagLanguage } from './resolvers/Mutation/setTagLanguage';
import    { shareFamilyMember as Mutation_shareFamilyMember } from './resolvers/Mutation/shareFamilyMember';
import    { shareNote as Mutation_shareNote } from './resolvers/Mutation/shareNote';
import    { suggestTaskCategorization as Mutation_suggestTaskCategorization } from './resolvers/Mutation/suggestTaskCategorization';
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
import    { updateProtocolStatus as Mutation_updateProtocolStatus } from './resolvers/Mutation/updateProtocolStatus';
import    { updateRelationship as Mutation_updateRelationship } from './resolvers/Mutation/updateRelationship';
import    { updateStory as Mutation_updateStory } from './resolvers/Mutation/updateStory';
import    { updateTask as Mutation_updateTask } from './resolvers/Mutation/updateTask';
import    { updateTeacherFeedback as Mutation_updateTeacherFeedback } from './resolvers/Mutation/updateTeacherFeedback';
import    { updateUserPreferences as Mutation_updateUserPreferences } from './resolvers/Mutation/updateUserPreferences';
import    { updateUserSettings as Mutation_updateUserSettings } from './resolvers/Mutation/updateUserSettings';
import    { updateVehicle as Mutation_updateVehicle } from './resolvers/Mutation/updateVehicle';
import    { generationJob as Subscription_generationJob } from './resolvers/Subscription/generationJob';
import    { userGenerationJobs as Subscription_userGenerationJobs } from './resolvers/Subscription/userGenerationJobs';
import    { ActionableRecommendation } from './resolvers/ActionableRecommendation';
import    { Affirmation } from './resolvers/Affirmation';
import    { Allergy } from './resolvers/Allergy';
import    { AnticipatedReaction } from './resolvers/AnticipatedReaction';
import    { Appointment } from './resolvers/Appointment';
import    { AudioAsset } from './resolvers/AudioAsset';
import    { AudioFromR2Result } from './resolvers/AudioFromR2Result';
import    { AudioManifest } from './resolvers/AudioManifest';
import    { AudioMetadata } from './resolvers/AudioMetadata';
import    { AudioSegmentInfo } from './resolvers/AudioSegmentInfo';
import    { BehaviorObservation } from './resolvers/BehaviorObservation';
import    { BloodTest } from './resolvers/BloodTest';
import    { BogdanDiscussionGuide } from './resolvers/BogdanDiscussionGuide';
import    { BuildClaimCardsResult } from './resolvers/BuildClaimCardsResult';
import    { CheckNoteClaimsResult } from './resolvers/CheckNoteClaimsResult';
import    { Citation } from './resolvers/Citation';
import    { ClaimCard } from './resolvers/ClaimCard';
import    { ClaimProvenance } from './resolvers/ClaimProvenance';
import    { ClaimScope } from './resolvers/ClaimScope';
import    { CognitiveBaseline } from './resolvers/CognitiveBaseline';
import    { CognitiveCheckIn } from './resolvers/CognitiveCheckIn';
import    { Condition } from './resolvers/Condition';
import    { ConditionAgeManifestation } from './resolvers/ConditionAgeManifestation';
import    { ConditionComorbidity } from './resolvers/ConditionComorbidity';
import    { ConditionCriteriaMatchAdhd } from './resolvers/ConditionCriteriaMatchAdhd';
import    { ConditionCriterionASymptomGroup } from './resolvers/ConditionCriterionASymptomGroup';
import    { ConditionCriterionCheck } from './resolvers/ConditionCriterionCheck';
import    { ConditionDeepResearch } from './resolvers/ConditionDeepResearch';
import    { ConditionDifferentialCheck } from './resolvers/ConditionDifferentialCheck';
import    { ConditionMatchedSymptom } from './resolvers/ConditionMatchedSymptom';
import    { ConditionPathophysiology } from './resolvers/ConditionPathophysiology';
import    { ConditionProximityAssessment } from './resolvers/ConditionProximityAssessment';
import    { ConditionRedFlag } from './resolvers/ConditionRedFlag';
import    { ConditionTreatment } from './resolvers/ConditionTreatment';
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
import    { DeleteAllergyResult } from './resolvers/DeleteAllergyResult';
import    { DeleteAppointmentResult } from './resolvers/DeleteAppointmentResult';
import    { DeleteBehaviorObservationResult } from './resolvers/DeleteBehaviorObservationResult';
import    { DeleteBloodTestResult } from './resolvers/DeleteBloodTestResult';
import    { DeleteConditionResult } from './resolvers/DeleteConditionResult';
import    { DeleteContactFeedbackResult } from './resolvers/DeleteContactFeedbackResult';
import    { DeleteContactResult } from './resolvers/DeleteContactResult';
import    { DeleteConversationResult } from './resolvers/DeleteConversationResult';
import    { DeleteDeepAnalysisResult } from './resolvers/DeleteDeepAnalysisResult';
import    { DeleteDiscussionGuideResult } from './resolvers/DeleteDiscussionGuideResult';
import    { DeleteDoctorResult } from './resolvers/DeleteDoctorResult';
import    { DeleteFamilyMemberResult } from './resolvers/DeleteFamilyMemberResult';
import    { DeleteGameResult } from './resolvers/DeleteGameResult';
import    { DeleteGoalResult } from './resolvers/DeleteGoalResult';
import    { DeleteHabitResult } from './resolvers/DeleteHabitResult';
import    { DeleteIssueResult } from './resolvers/DeleteIssueResult';
import    { DeleteIssueScreenshotResult } from './resolvers/DeleteIssueScreenshotResult';
import    { DeleteJournalAnalysisResult } from './resolvers/DeleteJournalAnalysisResult';
import    { DeleteJournalEntryResult } from './resolvers/DeleteJournalEntryResult';
import    { DeleteMedicalLetterResult } from './resolvers/DeleteMedicalLetterResult';
import    { DeleteMedicationResult } from './resolvers/DeleteMedicationResult';
import    { DeleteMemoryEntryResult } from './resolvers/DeleteMemoryEntryResult';
import    { DeleteNoteResult } from './resolvers/DeleteNoteResult';
import    { DeleteProtocolResult } from './resolvers/DeleteProtocolResult';
import    { DeleteQuestionsResult } from './resolvers/DeleteQuestionsResult';
import    { DeleteRecommendedBooksResult } from './resolvers/DeleteRecommendedBooksResult';
import    { DeleteRelationshipResult } from './resolvers/DeleteRelationshipResult';
import    { DeleteResearchResult } from './resolvers/DeleteResearchResult';
import    { DeleteRoutineAnalysisResult } from './resolvers/DeleteRoutineAnalysisResult';
import    { DeleteStoryResult } from './resolvers/DeleteStoryResult';
import    { DeleteSupplementResult } from './resolvers/DeleteSupplementResult';
import    { DeleteSymptomResult } from './resolvers/DeleteSymptomResult';
import    { DeleteTaskResult } from './resolvers/DeleteTaskResult';
import    { DeleteTeacherFeedbackResult } from './resolvers/DeleteTeacherFeedbackResult';
import    { DeleteVehiclePhotoResult } from './resolvers/DeleteVehiclePhotoResult';
import    { DeleteVehicleResult } from './resolvers/DeleteVehicleResult';
import    { DeleteVehicleServiceRecordResult } from './resolvers/DeleteVehicleServiceRecordResult';
import    { DevelopmentalContext } from './resolvers/DevelopmentalContext';
import    { DiscussionGuide } from './resolvers/DiscussionGuide';
import    { DiscussionGuideCritique } from './resolvers/DiscussionGuideCritique';
import    { Doctor } from './resolvers/Doctor';
import    { EmotionalLandscape } from './resolvers/EmotionalLandscape';
import    { EvidenceItem } from './resolvers/EvidenceItem';
import    { EvidenceLocator } from './resolvers/EvidenceLocator';
import    { ExtractedIssue } from './resolvers/ExtractedIssue';
import    { FamilyDocument } from './resolvers/FamilyDocument';
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
import    { HealthcareChatResponse } from './resolvers/HealthcareChatResponse';
import    { HealthcareMarkerTrendHit } from './resolvers/HealthcareMarkerTrendHit';
import    { HealthcareMultiSearchResult } from './resolvers/HealthcareMultiSearchResult';
import    { HealthcareSearchHit } from './resolvers/HealthcareSearchHit';
import    { HealthcareSearchMarkerHit } from './resolvers/HealthcareSearchMarkerHit';
import    { HealthcareSearchTestHit } from './resolvers/HealthcareSearchTestHit';
import    { HealthcareSummary } from './resolvers/HealthcareSummary';
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
import    { MedicalLetter } from './resolvers/MedicalLetter';
import    { Medication } from './resolvers/Medication';
import    { MedicationAdverseEvent } from './resolvers/MedicationAdverseEvent';
import    { MedicationCorrelation } from './resolvers/MedicationCorrelation';
import    { MedicationDeepResearch } from './resolvers/MedicationDeepResearch';
import    { MedicationDosing } from './resolvers/MedicationDosing';
import    { MedicationIndication } from './resolvers/MedicationIndication';
import    { MedicationInteraction } from './resolvers/MedicationInteraction';
import    { MedicationPharmacology } from './resolvers/MedicationPharmacology';
import    { MemoryBaseline } from './resolvers/MemoryBaseline';
import    { MemoryEntry } from './resolvers/MemoryEntry';
import    { MicroScript } from './resolvers/MicroScript';
import    { Note } from './resolvers/Note';
import    { NoteAccess } from './resolvers/NoteAccess';
import    { NoteShare } from './resolvers/NoteShare';
import    { PaperCandidate } from './resolvers/PaperCandidate';
import    { ParentAdviceItem } from './resolvers/ParentAdviceItem';
import    { ParsedTask } from './resolvers/ParsedTask';
import    { PatternCluster } from './resolvers/PatternCluster';
import    { PipelineDiagnostics } from './resolvers/PipelineDiagnostics';
import    { PriorityRecommendation } from './resolvers/PriorityRecommendation';
import    { PriorityWeights } from './resolvers/PriorityWeights';
import    { Protocol } from './resolvers/Protocol';
import    { ProtocolDetail } from './resolvers/ProtocolDetail';
import    { ProtocolSupplement } from './resolvers/ProtocolSupplement';
import    { PublicDiscussionGuideResult } from './resolvers/PublicDiscussionGuideResult';
import    { RecommendedBook } from './resolvers/RecommendedBook';
import    { RegimenAnalysis } from './resolvers/RegimenAnalysis';
import    { RegimenFlag } from './resolvers/RegimenFlag';
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
import    { Symptom } from './resolvers/Symptom';
import    { TalkingPoint } from './resolvers/TalkingPoint';
import    { Task } from './resolvers/Task';
import    { TaskCategorization } from './resolvers/TaskCategorization';
import    { TaskCounts } from './resolvers/TaskCounts';
import    { TaskRef } from './resolvers/TaskRef';
import    { TeacherFeedback } from './resolvers/TeacherFeedback';
import    { TextSegment } from './resolvers/TextSegment';
import    { TherapeuticInsight } from './resolvers/TherapeuticInsight';
import    { TherapeuticQuestion } from './resolvers/TherapeuticQuestion';
import    { TimelineAnalysis } from './resolvers/TimelineAnalysis';
import    { TimelinePhase } from './resolvers/TimelinePhase';
import    { UnlinkContactResult } from './resolvers/UnlinkContactResult';
import    { UnlinkIssuesResult } from './resolvers/UnlinkIssuesResult';
import    { UserPreferences } from './resolvers/UserPreferences';
import    { UserSettings } from './resolvers/UserSettings';
import    { UserStreak } from './resolvers/UserStreak';
import    { VaultStatus } from './resolvers/VaultStatus';
import    { VaultUnlockResult } from './resolvers/VaultUnlockResult';
import    { Vehicle } from './resolvers/Vehicle';
import    { VehiclePhoto } from './resolvers/VehiclePhoto';
import    { VehiclePhotoUploadTicket } from './resolvers/VehiclePhotoUploadTicket';
import    { VehicleServiceRecord } from './resolvers/VehicleServiceRecord';
    export const resolvers: Resolvers = {
      Query: { affirmation: Query_affirmation,affirmations: Query_affirmations,allIssues: Query_allIssues,allNotes: Query_allNotes,allRecommendedBooks: Query_allRecommendedBooks,allStories: Query_allStories,allTags: Query_allTags,allergies: Query_allergies,appointments: Query_appointments,audioFromR2: Query_audioFromR2,behaviorObservation: Query_behaviorObservation,behaviorObservations: Query_behaviorObservations,bloodTests: Query_bloodTests,bogdanDiscussions: Query_bogdanDiscussions,claimCard: Query_claimCard,claimCardsForNote: Query_claimCardsForNote,condition: Query_condition,conditionDeepResearch: Query_conditionDeepResearch,conditions: Query_conditions,contact: Query_contact,contactFeedback: Query_contactFeedback,contactFeedbacks: Query_contactFeedbacks,contacts: Query_contacts,conversation: Query_conversation,conversationsForIssue: Query_conversationsForIssue,deepAnalyses: Query_deepAnalyses,deepAnalysis: Query_deepAnalysis,deepIssueAnalyses: Query_deepIssueAnalyses,deepIssueAnalysis: Query_deepIssueAnalysis,doctor: Query_doctor,doctors: Query_doctors,familyDocuments: Query_familyDocuments,familyMember: Query_familyMember,familyMembers: Query_familyMembers,game: Query_game,gameCompletions: Query_gameCompletions,games: Query_games,generationJob: Query_generationJob,generationJobs: Query_generationJobs,goal: Query_goal,goals: Query_goals,habit: Query_habit,habits: Query_habits,healthcareMarkerTrend: Query_healthcareMarkerTrend,healthcareSearch: Query_healthcareSearch,healthcareSummary: Query_healthcareSummary,issue: Query_issue,issues: Query_issues,journalEntries: Query_journalEntries,journalEntry: Query_journalEntry,latestBogdanDiscussion: Query_latestBogdanDiscussion,medicalLetters: Query_medicalLetters,medication: Query_medication,medicationDeepResearch: Query_medicationDeepResearch,medications: Query_medications,memoryBaseline: Query_memoryBaseline,memoryEntries: Query_memoryEntries,mySharedFamilyMembers: Query_mySharedFamilyMembers,mySharedNotes: Query_mySharedNotes,note: Query_note,notes: Query_notes,protocol: Query_protocol,protocols: Query_protocols,publicDiscussionGuide: Query_publicDiscussionGuide,recommendedBooks: Query_recommendedBooks,regimenAnalysis: Query_regimenAnalysis,relationship: Query_relationship,relationships: Query_relationships,research: Query_research,routineAnalyses: Query_routineAnalyses,routineAnalysis: Query_routineAnalysis,stories: Query_stories,story: Query_story,symptoms: Query_symptoms,tagLanguage: Query_tagLanguage,task: Query_task,taskCounts: Query_taskCounts,tasks: Query_tasks,teacherFeedback: Query_teacherFeedback,teacherFeedbacks: Query_teacherFeedbacks,therapeuticQuestions: Query_therapeuticQuestions,userPreferences: Query_userPreferences,userSettings: Query_userSettings,userStreak: Query_userStreak,vaultStatus: Query_vaultStatus,vehicle: Query_vehicle,vehicles: Query_vehicles },
      Mutation: { addAllergy: Mutation_addAllergy,addAppointment: Mutation_addAppointment,addCondition: Mutation_addCondition,addDoctor: Mutation_addDoctor,addMedication: Mutation_addMedication,addMemoryEntry: Mutation_addMemoryEntry,addProtocol: Mutation_addProtocol,addSupplement: Mutation_addSupplement,addSymptom: Mutation_addSymptom,addTaskDependency: Mutation_addTaskDependency,addVehicle: Mutation_addVehicle,addVehiclePhoto: Mutation_addVehiclePhoto,addVehicleServiceRecord: Mutation_addVehicleServiceRecord,buildClaimCards: Mutation_buildClaimCards,checkNoteClaims: Mutation_checkNoteClaims,convertIssueToGoal: Mutation_convertIssueToGoal,convertJournalEntryToIssue: Mutation_convertJournalEntryToIssue,createAffirmation: Mutation_createAffirmation,createContact: Mutation_createContact,createContactFeedback: Mutation_createContactFeedback,createConversation: Mutation_createConversation,createFamilyMember: Mutation_createFamilyMember,createGame: Mutation_createGame,createGoal: Mutation_createGoal,createHabit: Mutation_createHabit,createIssue: Mutation_createIssue,createJournalEntry: Mutation_createJournalEntry,createNote: Mutation_createNote,createRelatedIssue: Mutation_createRelatedIssue,createRelationship: Mutation_createRelationship,createStory: Mutation_createStory,createSubGoal: Mutation_createSubGoal,createTask: Mutation_createTask,createTeacherFeedback: Mutation_createTeacherFeedback,deleteAffirmation: Mutation_deleteAffirmation,deleteAllergy: Mutation_deleteAllergy,deleteAppointment: Mutation_deleteAppointment,deleteBehaviorObservation: Mutation_deleteBehaviorObservation,deleteBloodTest: Mutation_deleteBloodTest,deleteClaimCard: Mutation_deleteClaimCard,deleteCondition: Mutation_deleteCondition,deleteContact: Mutation_deleteContact,deleteContactFeedback: Mutation_deleteContactFeedback,deleteConversation: Mutation_deleteConversation,deleteDeepAnalysis: Mutation_deleteDeepAnalysis,deleteDeepIssueAnalysis: Mutation_deleteDeepIssueAnalysis,deleteDiscussionGuide: Mutation_deleteDiscussionGuide,deleteDoctor: Mutation_deleteDoctor,deleteFamilyMember: Mutation_deleteFamilyMember,deleteGame: Mutation_deleteGame,deleteGoal: Mutation_deleteGoal,deleteHabit: Mutation_deleteHabit,deleteHabitLog: Mutation_deleteHabitLog,deleteIssue: Mutation_deleteIssue,deleteIssueScreenshot: Mutation_deleteIssueScreenshot,deleteJournalAnalysis: Mutation_deleteJournalAnalysis,deleteJournalEntry: Mutation_deleteJournalEntry,deleteMedicalLetter: Mutation_deleteMedicalLetter,deleteMedication: Mutation_deleteMedication,deleteMemoryEntry: Mutation_deleteMemoryEntry,deleteNote: Mutation_deleteNote,deleteProtocol: Mutation_deleteProtocol,deleteRecommendedBooks: Mutation_deleteRecommendedBooks,deleteRelationship: Mutation_deleteRelationship,deleteResearch: Mutation_deleteResearch,deleteRoutineAnalysis: Mutation_deleteRoutineAnalysis,deleteStory: Mutation_deleteStory,deleteSupplement: Mutation_deleteSupplement,deleteSymptom: Mutation_deleteSymptom,deleteTask: Mutation_deleteTask,deleteTeacherFeedback: Mutation_deleteTeacherFeedback,deleteTherapeuticQuestions: Mutation_deleteTherapeuticQuestions,deleteVehicle: Mutation_deleteVehicle,deleteVehiclePhoto: Mutation_deleteVehiclePhoto,deleteVehicleServiceRecord: Mutation_deleteVehicleServiceRecord,extractContactFeedbackIssues: Mutation_extractContactFeedbackIssues,generateAffirmationsForFamilyMember: Mutation_generateAffirmationsForFamilyMember,generateAudio: Mutation_generateAudio,generateBogdanDiscussion: Mutation_generateBogdanDiscussion,generateConditionDeepResearch: Mutation_generateConditionDeepResearch,generateDeepAnalysis: Mutation_generateDeepAnalysis,generateDeepIssueAnalysis: Mutation_generateDeepIssueAnalysis,generateDiscussionGuide: Mutation_generateDiscussionGuide,generateGame: Mutation_generateGame,generateHabitsForFamilyMember: Mutation_generateHabitsForFamilyMember,generateHabitsFromIssue: Mutation_generateHabitsFromIssue,generateJournalAnalysis: Mutation_generateJournalAnalysis,generateLongFormText: Mutation_generateLongFormText,generateMedicationDeepResearch: Mutation_generateMedicationDeepResearch,generateOpenAIAudio: Mutation_generateOpenAIAudio,generateParentAdvice: Mutation_generateParentAdvice,generateRecommendedBooks: Mutation_generateRecommendedBooks,generateRegimenAnalysis: Mutation_generateRegimenAnalysis,generateResearch: Mutation_generateResearch,generateRoutineAnalysis: Mutation_generateRoutineAnalysis,generateTherapeuticQuestions: Mutation_generateTherapeuticQuestions,linkContactToIssue: Mutation_linkContactToIssue,linkIssues: Mutation_linkIssues,lockVault: Mutation_lockVault,logGameCompletion: Mutation_logGameCompletion,logHabit: Mutation_logHabit,markTeacherFeedbackExtracted: Mutation_markTeacherFeedbackExtracted,parseTaskFromText: Mutation_parseTaskFromText,recordCognitiveBaseline: Mutation_recordCognitiveBaseline,recordCognitiveCheckIn: Mutation_recordCognitiveCheckIn,refreshClaimCard: Mutation_refreshClaimCard,removeTaskDependency: Mutation_removeTaskDependency,reorderTasks: Mutation_reorderTasks,requestVehiclePhotoUpload: Mutation_requestVehiclePhotoUpload,sendConversationMessage: Mutation_sendConversationMessage,sendHealthcareChatMessage: Mutation_sendHealthcareChatMessage,setMedicationActive: Mutation_setMedicationActive,setMemoryBaseline: Mutation_setMemoryBaseline,setNoteVisibility: Mutation_setNoteVisibility,setTagLanguage: Mutation_setTagLanguage,shareFamilyMember: Mutation_shareFamilyMember,shareNote: Mutation_shareNote,suggestTaskCategorization: Mutation_suggestTaskCategorization,unlinkContactFromIssue: Mutation_unlinkContactFromIssue,unlinkGoalFamilyMember: Mutation_unlinkGoalFamilyMember,unlinkIssues: Mutation_unlinkIssues,unlockVault: Mutation_unlockVault,unshareFamilyMember: Mutation_unshareFamilyMember,unshareNote: Mutation_unshareNote,updateAffirmation: Mutation_updateAffirmation,updateBehaviorObservation: Mutation_updateBehaviorObservation,updateContact: Mutation_updateContact,updateContactFeedback: Mutation_updateContactFeedback,updateFamilyMember: Mutation_updateFamilyMember,updateGame: Mutation_updateGame,updateGoal: Mutation_updateGoal,updateHabit: Mutation_updateHabit,updateIssue: Mutation_updateIssue,updateJournalEntry: Mutation_updateJournalEntry,updateNote: Mutation_updateNote,updateProtocolStatus: Mutation_updateProtocolStatus,updateRelationship: Mutation_updateRelationship,updateStory: Mutation_updateStory,updateTask: Mutation_updateTask,updateTeacherFeedback: Mutation_updateTeacherFeedback,updateUserPreferences: Mutation_updateUserPreferences,updateUserSettings: Mutation_updateUserSettings,updateVehicle: Mutation_updateVehicle },
      Subscription: { generationJob: Subscription_generationJob,userGenerationJobs: Subscription_userGenerationJobs },
      ActionableRecommendation: ActionableRecommendation,
Affirmation: Affirmation,
Allergy: Allergy,
AnticipatedReaction: AnticipatedReaction,
Appointment: Appointment,
AudioAsset: AudioAsset,
AudioFromR2Result: AudioFromR2Result,
AudioManifest: AudioManifest,
AudioMetadata: AudioMetadata,
AudioSegmentInfo: AudioSegmentInfo,
BehaviorObservation: BehaviorObservation,
BloodTest: BloodTest,
BogdanDiscussionGuide: BogdanDiscussionGuide,
BuildClaimCardsResult: BuildClaimCardsResult,
CheckNoteClaimsResult: CheckNoteClaimsResult,
Citation: Citation,
ClaimCard: ClaimCard,
ClaimProvenance: ClaimProvenance,
ClaimScope: ClaimScope,
CognitiveBaseline: CognitiveBaseline,
CognitiveCheckIn: CognitiveCheckIn,
Condition: Condition,
ConditionAgeManifestation: ConditionAgeManifestation,
ConditionComorbidity: ConditionComorbidity,
ConditionCriteriaMatchAdhd: ConditionCriteriaMatchAdhd,
ConditionCriterionASymptomGroup: ConditionCriterionASymptomGroup,
ConditionCriterionCheck: ConditionCriterionCheck,
ConditionDeepResearch: ConditionDeepResearch,
ConditionDifferentialCheck: ConditionDifferentialCheck,
ConditionMatchedSymptom: ConditionMatchedSymptom,
ConditionPathophysiology: ConditionPathophysiology,
ConditionProximityAssessment: ConditionProximityAssessment,
ConditionRedFlag: ConditionRedFlag,
ConditionTreatment: ConditionTreatment,
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
DeleteAllergyResult: DeleteAllergyResult,
DeleteAppointmentResult: DeleteAppointmentResult,
DeleteBehaviorObservationResult: DeleteBehaviorObservationResult,
DeleteBloodTestResult: DeleteBloodTestResult,
DeleteConditionResult: DeleteConditionResult,
DeleteContactFeedbackResult: DeleteContactFeedbackResult,
DeleteContactResult: DeleteContactResult,
DeleteConversationResult: DeleteConversationResult,
DeleteDeepAnalysisResult: DeleteDeepAnalysisResult,
DeleteDiscussionGuideResult: DeleteDiscussionGuideResult,
DeleteDoctorResult: DeleteDoctorResult,
DeleteFamilyMemberResult: DeleteFamilyMemberResult,
DeleteGameResult: DeleteGameResult,
DeleteGoalResult: DeleteGoalResult,
DeleteHabitResult: DeleteHabitResult,
DeleteIssueResult: DeleteIssueResult,
DeleteIssueScreenshotResult: DeleteIssueScreenshotResult,
DeleteJournalAnalysisResult: DeleteJournalAnalysisResult,
DeleteJournalEntryResult: DeleteJournalEntryResult,
DeleteMedicalLetterResult: DeleteMedicalLetterResult,
DeleteMedicationResult: DeleteMedicationResult,
DeleteMemoryEntryResult: DeleteMemoryEntryResult,
DeleteNoteResult: DeleteNoteResult,
DeleteProtocolResult: DeleteProtocolResult,
DeleteQuestionsResult: DeleteQuestionsResult,
DeleteRecommendedBooksResult: DeleteRecommendedBooksResult,
DeleteRelationshipResult: DeleteRelationshipResult,
DeleteResearchResult: DeleteResearchResult,
DeleteRoutineAnalysisResult: DeleteRoutineAnalysisResult,
DeleteStoryResult: DeleteStoryResult,
DeleteSupplementResult: DeleteSupplementResult,
DeleteSymptomResult: DeleteSymptomResult,
DeleteTaskResult: DeleteTaskResult,
DeleteTeacherFeedbackResult: DeleteTeacherFeedbackResult,
DeleteVehiclePhotoResult: DeleteVehiclePhotoResult,
DeleteVehicleResult: DeleteVehicleResult,
DeleteVehicleServiceRecordResult: DeleteVehicleServiceRecordResult,
DevelopmentalContext: DevelopmentalContext,
DiscussionGuide: DiscussionGuide,
DiscussionGuideCritique: DiscussionGuideCritique,
Doctor: Doctor,
EmotionalLandscape: EmotionalLandscape,
EvidenceItem: EvidenceItem,
EvidenceLocator: EvidenceLocator,
ExtractedIssue: ExtractedIssue,
FamilyDocument: FamilyDocument,
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
HealthcareChatResponse: HealthcareChatResponse,
HealthcareMarkerTrendHit: HealthcareMarkerTrendHit,
HealthcareMultiSearchResult: HealthcareMultiSearchResult,
HealthcareSearchHit: HealthcareSearchHit,
HealthcareSearchMarkerHit: HealthcareSearchMarkerHit,
HealthcareSearchTestHit: HealthcareSearchTestHit,
HealthcareSummary: HealthcareSummary,
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
MedicalLetter: MedicalLetter,
Medication: Medication,
MedicationAdverseEvent: MedicationAdverseEvent,
MedicationCorrelation: MedicationCorrelation,
MedicationDeepResearch: MedicationDeepResearch,
MedicationDosing: MedicationDosing,
MedicationIndication: MedicationIndication,
MedicationInteraction: MedicationInteraction,
MedicationPharmacology: MedicationPharmacology,
MemoryBaseline: MemoryBaseline,
MemoryEntry: MemoryEntry,
MicroScript: MicroScript,
Note: Note,
NoteAccess: NoteAccess,
NoteShare: NoteShare,
PaperCandidate: PaperCandidate,
ParentAdviceItem: ParentAdviceItem,
ParsedTask: ParsedTask,
PatternCluster: PatternCluster,
PipelineDiagnostics: PipelineDiagnostics,
PriorityRecommendation: PriorityRecommendation,
PriorityWeights: PriorityWeights,
Protocol: Protocol,
ProtocolDetail: ProtocolDetail,
ProtocolSupplement: ProtocolSupplement,
PublicDiscussionGuideResult: PublicDiscussionGuideResult,
RecommendedBook: RecommendedBook,
RegimenAnalysis: RegimenAnalysis,
RegimenFlag: RegimenFlag,
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
Symptom: Symptom,
TalkingPoint: TalkingPoint,
Task: Task,
TaskCategorization: TaskCategorization,
TaskCounts: TaskCounts,
TaskRef: TaskRef,
TeacherFeedback: TeacherFeedback,
TextSegment: TextSegment,
TherapeuticInsight: TherapeuticInsight,
TherapeuticQuestion: TherapeuticQuestion,
TimelineAnalysis: TimelineAnalysis,
TimelinePhase: TimelinePhase,
UnlinkContactResult: UnlinkContactResult,
UnlinkIssuesResult: UnlinkIssuesResult,
UserPreferences: UserPreferences,
UserSettings: UserSettings,
UserStreak: UserStreak,
VaultStatus: VaultStatus,
VaultUnlockResult: VaultUnlockResult,
Vehicle: Vehicle,
VehiclePhoto: VehiclePhoto,
VehiclePhotoUploadTicket: VehiclePhotoUploadTicket,
VehicleServiceRecord: VehicleServiceRecord
    }