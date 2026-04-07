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

export const scripts = pgTable("scripts", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull(),
  hub: text("hub").notNull(),
  template: text("template").notNull(),
  devices: jsonb("devices").notNull().default([]),
  hasRemote: integer("has_remote").notNull().default(0),
  instructions: text("instructions").notNull().default(""),
  code: text("code").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const userHubs = pgTable("user_hubs", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull(),
  name: text("name").notNull(),
  hubType: text("hub_type").notNull(),
  bleName: text("ble_name").notNull().default(""),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  unique().on(t.userId, t.name),
]);

export const wantList = pgTable("want_list", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull(),
  itemType: text("item_type").notNull(),
  itemNum: text("item_num").notNull(),
  name: text("name").notNull(),
  color: text("color").notNull().default(""),
  qty: integer("qty").notNull().default(1),
  price: integer("price"),
  url: text("url"),
  imageUrl: text("image_url"),
  notes: text("notes"),
  status: text("status").notNull().default("pending"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  unique().on(t.userId, t.itemType, t.itemNum, t.color),
]);

export const savedVideos = pgTable("saved_videos", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull(),
  videoId: text("video_id").notNull(),
  title: text("title").notNull(),
  channelName: text("channel_name").notNull().default(""),
  thumbnailUrl: text("thumbnail_url"),
  url: text("url").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  unique().on(t.userId, t.videoId),
]);

export const partMocsCache = pgTable("part_mocs_cache", {
  id: serial("id").primaryKey(),
  partNum: text("part_num").notNull().unique(),
  partName: text("part_name").notNull(),
  summary: text("summary").notNull().default(""),
  mocs: jsonb("mocs").notNull().default([]),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});
