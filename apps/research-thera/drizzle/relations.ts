import { relations } from "drizzle-orm/relations";
import { user, account, session, audioAssets, audioSegments, goals, stories } from "./schema";

export const accountRelations = relations(account, ({one}) => ({
	user: one(user, {
		fields: [account.userId],
		references: [user.id]
	}),
}));

export const userRelations = relations(user, ({many}) => ({
	accounts: many(account),
	sessions: many(session),
}));

export const sessionRelations = relations(session, ({one}) => ({
	user: one(user, {
		fields: [session.userId],
		references: [user.id]
	}),
}));

export const audioSegmentsRelations = relations(audioSegments, ({one}) => ({
	audioAsset: one(audioAssets, {
		fields: [audioSegments.assetId],
		references: [audioAssets.id]
	}),
}));

export const audioAssetsRelations = relations(audioAssets, ({many}) => ({
	audioSegments: many(audioSegments),
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