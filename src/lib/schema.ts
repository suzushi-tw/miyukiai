import { pgTable, unique, text, boolean, timestamp, foreignKey, index, bigint, integer, jsonb, serial, varchar, json, primaryKey } from "drizzle-orm/pg-core"
import { sql } from "drizzle-orm"



export const user = pgTable("user", {
  id: text().primaryKey().notNull(),
  name: text().notNull(),
  email: text().notNull(),
  emailVerified: boolean().notNull(),
  image: text(),
  createdAt: timestamp({ mode: 'string' }).notNull(),
  updatedAt: timestamp({ mode: 'string' }).notNull(),
}, (table) => [
  unique("user_email_key").on(table.email),
]);

export const session = pgTable("session", {
  id: text().primaryKey().notNull(),
  expiresAt: timestamp({ mode: 'string' }).notNull(),
  token: text().notNull(),
  createdAt: timestamp({ mode: 'string' }).notNull(),
  updatedAt: timestamp({ mode: 'string' }).notNull(),
  ipAddress: text(),
  userAgent: text(),
  userId: text().notNull(),
}, (table) => [
  foreignKey({
      columns: [table.userId],
      foreignColumns: [user.id],
      name: "session_userId_fkey"
    }),
  unique("session_token_key").on(table.token),
]);

export const account = pgTable("account", {
  id: text().primaryKey().notNull(),
  accountId: text().notNull(),
  providerId: text().notNull(),
  userId: text().notNull(),
  accessToken: text(),
  refreshToken: text(),
  idToken: text(),
  accessTokenExpiresAt: timestamp({ mode: 'string' }),
  refreshTokenExpiresAt: timestamp({ mode: 'string' }),
  scope: text(),
  password: text(),
  createdAt: timestamp({ mode: 'string' }).notNull(),
  updatedAt: timestamp({ mode: 'string' }).notNull(),
}, (table) => [
  foreignKey({
      columns: [table.userId],
      foreignColumns: [user.id],
      name: "account_userId_fkey"
    }),
]);

export const verification = pgTable("verification", {
  id: text().primaryKey().notNull(),
  identifier: text().notNull(),
  value: text().notNull(),
  expiresAt: timestamp({ mode: 'string' }).notNull(),
  createdAt: timestamp({ mode: 'string' }),
  updatedAt: timestamp({ mode: 'string' }),
});

export const model = pgTable("Model", {
  id: text().primaryKey().notNull(),
  name: text().notNull(),
  description: text(),
  version: text().default('1.0').notNull(),
  modelType: text().notNull(),  baseModel: text().notNull(),
  tags: text(),
  license: text(),
  userId: text().notNull(),
  fileUrl: text().notNull(),
  // Changed from bigint to text for easier JSON handling
  fileSize: text().notNull(),
  fileName: text().notNull(),
  downloads: integer().default(0).notNull(),
  createdAt: timestamp({ precision: 3, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
  updatedAt: timestamp({ precision: 3, mode: 'string' }).notNull(),
}, (table) => [
  index("Model_userId_idx").using("btree", table.userId.asc().nullsLast().op("text_ops")),
  foreignKey({
      columns: [table.userId],
      foreignColumns: [user.id],
      name: "Model_userId_fkey"
    }).onUpdate("cascade").onDelete("restrict"),
]);

export const modelImage = pgTable("ModelImage", {
  id: text().primaryKey().notNull(),
  modelId: text().notNull(),
  url: text().notNull(),
  metadata: jsonb(),
  createdAt: timestamp({ precision: 3, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
  userId: text().notNull(),
}, (table) => [
  index("ModelImage_modelId_idx").using("btree", table.modelId.asc().nullsLast().op("text_ops")),
  index("ModelImage_userId_idx").using("btree", table.userId.asc().nullsLast().op("text_ops")),
  foreignKey({
      columns: [table.modelId],
      foreignColumns: [model.id],
      name: "ModelImage_modelId_fkey"
    }).onUpdate("cascade").onDelete("cascade"),
  foreignKey({
      columns: [table.userId],
      foreignColumns: [user.id],
      name: "ModelImage_userId_fkey"
    }).onUpdate("cascade").onDelete("restrict"),
]);

export const comments = pgTable("comments", {
  id: serial().primaryKey().notNull(),
  page: varchar({ length: 256 }).default('default').notNull(),
  author: varchar({ length: 256 }).notNull(),
  content: json().notNull(),
  timestamp: timestamp({ mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
  thread: integer(),
}, (table) => [
  index("comments_page_idx").using("btree", table.page.asc().nullsLast().op("text_ops")),
]);

export const roles = pgTable("roles", {
  userId: varchar({ length: 256 }).primaryKey().notNull(),
  name: text().notNull(),
  canDelete: boolean().notNull(),
});

export const socialLink = pgTable("SocialLink", {
  id: text().primaryKey().notNull(),
  userId: text().notNull(),
  platform: text().notNull(),
  url: text().notNull(),
  icon: text().notNull(),
  createdAt: timestamp({ precision: 3, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
  updatedAt: timestamp({ precision: 3, mode: 'string' }).notNull(),
}, (table) => [
  index("SocialLink_userId_idx").using("btree", table.userId.asc().nullsLast().op("text_ops")),
  foreignKey({
      columns: [table.userId],
      foreignColumns: [user.id],
      name: "SocialLink_userId_fkey"
    }).onUpdate("cascade").onDelete("cascade"),
]);

export const rates = pgTable("rates", {
  userId: varchar({ length: 256 }).notNull(),
  commentId: integer().notNull(),
  like: boolean().notNull(),
}, (table) => [
  index("rates_commentId_idx").using("btree", table.commentId.asc().nullsLast().op("int4_ops")),
  foreignKey({
      columns: [table.commentId],
      foreignColumns: [comments.id],
      name: "rates_commentId_fkey"
    }).onUpdate("cascade").onDelete("cascade"),
  primaryKey({ columns: [table.userId, table.commentId], name: "rates_pkey"}),
]);
