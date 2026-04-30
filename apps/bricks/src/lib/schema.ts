import { pgTable, serial, integer, text, jsonb, timestamp, unique, boolean } from "drizzle-orm/pg-core";

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
  name: text("name").notNull(),
  hub: text("hub").notNull(),
  template: text("template").notNull(),
  devices: jsonb("devices").notNull().default([]),
  hasRemote: integer("has_remote").notNull().default(0),
  instructions: text("instructions").notNull().default(""),
  code: text("code").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  unique().on(t.userId, t.name),
]);

export const hubTypeDocs = pgTable("hub_type_docs", {
  hubType: text("hub_type").primaryKey(),
  docsUrl: text("docs_url").notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
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

export const favoriteStores = pgTable("favorite_stores", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull(),
  storeName: text("store_name").notNull(),
  url: text("url").notNull(),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  unique().on(t.userId, t.url),
]);

export const setPricesCache = pgTable("set_prices_cache", {
  setNum: text("set_num").primaryKey(),
  usdRetail: integer("usd_retail"),
  gbpRetail: integer("gbp_retail"),
  eurRetail: integer("eur_retail"),
  usdMarket: integer("usd_market"),
  gbpMarket: integer("gbp_market"),
  eurMarket: integer("eur_market"),
  bricklinkId: integer("bricklink_id"),
  source: text("source").notNull().default("brickset"),
  found: boolean("found").notNull().default(false),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const partMocsCache = pgTable("part_mocs_cache", {
  id: serial("id").primaryKey(),
  partNum: text("part_num").notNull().unique(),
  partName: text("part_name").notNull(),
  summary: text("summary").notNull().default(""),
  mocs: jsonb("mocs").notNull().default([]),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const themes = pgTable("themes", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull(),
  slug: text("slug").notNull(),
  name: text("name").notNull(),
  description: text("description"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  unique().on(t.userId, t.slug),
]);

export const themeItems = pgTable("theme_items", {
  id: serial("id").primaryKey(),
  themeId: integer("theme_id").notNull().references(() => themes.id, { onDelete: "cascade" }),
  kind: text("kind").notNull(),
  refId: text("ref_id").notNull(),
  name: text("name").notNull(),
  imageUrl: text("image_url"),
  url: text("url"),
  designer: text("designer"),
  addedAt: timestamp("added_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  unique().on(t.themeId, t.kind, t.refId),
]);
