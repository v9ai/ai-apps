import { pgTable, serial, integer, text, jsonb, timestamp, unique } from "drizzle-orm/pg-core";

export const topicResearch = pgTable("topic_research", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull(),
  topicName: text("topic_name").notNull(),
  mocUrls: jsonb("moc_urls").notNull().default([]),
  mocs: jsonb("mocs").notNull().default([]),
  analysis: jsonb("analysis").notNull().default({}),
  synthesis: jsonb("synthesis").notNull().default({}),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const favorites = pgTable("favorites", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull(),
  mocId: text("moc_id").notNull(),
  designer: text("designer").notNull(),
  name: text("name").notNull(),
  url: text("url").notNull(),
  pdfUrl: text("pdf_url"),
  parts: jsonb("parts").notNull().default([]),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  unique().on(t.userId, t.mocId),
]);

export const userParts = pgTable("user_parts", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull(),
  partNum: text("part_num").notNull(),
  name: text("name").notNull(),
  color: text("color").notNull().default("Any"),
  qty: integer("qty").notNull().default(1),
  imageUrl: text("image_url"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  unique().on(t.userId, t.partNum, t.color),
]);

export const partMocsCache = pgTable("part_mocs_cache", {
  id: serial("id").primaryKey(),
  partNum: text("part_num").notNull().unique(),
  partName: text("part_name").notNull(),
  summary: text("summary").notNull().default(""),
  mocs: jsonb("mocs").notNull().default([]),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});
