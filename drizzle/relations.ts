import { relations } from "drizzle-orm/relations";
import { user, session, account, model, modelImage, comments, rates } from "./schema";

export const sessionRelations = relations(session, ({one}) => ({
	user: one(user, {
		fields: [session.userId],
		references: [user.id]
	}),
}));

export const userRelations = relations(user, ({many}) => ({
	sessions: many(session),
	accounts: many(account),
	models: many(model),
}));

export const accountRelations = relations(account, ({one}) => ({
	user: one(user, {
		fields: [account.userId],
		references: [user.id]
	}),
}));

export const modelRelations = relations(model, ({one, many}) => ({
	user: one(user, {
		fields: [model.userId],
		references: [user.id]
	}),
	modelImages: many(modelImage),
}));

export const modelImageRelations = relations(modelImage, ({one}) => ({
	model: one(model, {
		fields: [modelImage.modelId],
		references: [model.id]
	}),
}));

export const ratesRelations = relations(rates, ({one}) => ({
	comment: one(comments, {
		fields: [rates.commentId],
		references: [comments.id]
	}),
}));

export const commentsRelations = relations(comments, ({many}) => ({
	rates: many(rates),
}));