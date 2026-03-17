import { relations } from "drizzle-orm/relations";
import { familyMembers, familyMemberShares, issues, notes, noteShares, goals, stories, user, session, account } from "./schema";

export const familyMemberSharesRelations = relations(familyMemberShares, ({one}) => ({
	familyMember: one(familyMembers, {
		fields: [familyMemberShares.familyMemberId],
		references: [familyMembers.id]
	}),
}));

export const familyMembersRelations = relations(familyMembers, ({many}) => ({
	familyMemberShares: many(familyMemberShares),
	issues: many(issues),
}));

export const issuesRelations = relations(issues, ({one}) => ({
	familyMember: one(familyMembers, {
		fields: [issues.relatedFamilyMemberId],
		references: [familyMembers.id]
	}),
}));

export const noteSharesRelations = relations(noteShares, ({one}) => ({
	note: one(notes, {
		fields: [noteShares.noteId],
		references: [notes.id]
	}),
}));

export const notesRelations = relations(notes, ({many}) => ({
	noteShares: many(noteShares),
}));

export const storiesRelations = relations(stories, ({one}) => ({
	goal: one(goals, {
		fields: [stories.goalId],
		references: [goals.id]
	}),
}));

export const goalsRelations = relations(goals, ({many}) => ({
	stories: many(stories),
}));

export const sessionRelations = relations(session, ({one}) => ({
	user: one(user, {
		fields: [session.userId],
		references: [user.id]
	}),
}));

export const userRelations = relations(user, ({many}) => ({
	sessions: many(session),
	accounts: many(account),
}));

export const accountRelations = relations(account, ({one}) => ({
	user: one(user, {
		fields: [account.userId],
		references: [user.id]
	}),
}));