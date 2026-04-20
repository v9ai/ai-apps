import { pgTable, uuid, text, integer, timestamp } from "drizzle-orm/pg-core";
import { user } from "@ai-apps/auth/schema";

export { user, session, account, verification } from "@ai-apps/auth/schema";

export const cars = pgTable("cars", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  make: text("make").notNull(),
  model: text("model").notNull(),
  year: integer("year").notNull(),
  vin: text("vin"),
  licensePlate: text("license_plate"),
  nickname: text("nickname"),
  odometerMiles: integer("odometer_miles"),
  color: text("color"),
  notes: text("notes"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const carPhotos = pgTable("car_photos", {
  id: uuid("id").primaryKey().defaultRandom(),
  carId: uuid("car_id")
    .notNull()
    .references(() => cars.id, { onDelete: "cascade" }),
  r2Key: text("r2_key").notNull(),
  contentType: text("content_type").notNull(),
  sizeBytes: integer("size_bytes").notNull(),
  caption: text("caption"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const serviceRecords = pgTable("service_records", {
  id: uuid("id").primaryKey().defaultRandom(),
  carId: uuid("car_id")
    .notNull()
    .references(() => cars.id, { onDelete: "cascade" }),
  type: text("type").notNull(),
  serviceDate: timestamp("service_date").notNull(),
  odometerMiles: integer("odometer_miles"),
  costCents: integer("cost_cents"),
  vendor: text("vendor"),
  notes: text("notes"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export type Car = typeof cars.$inferSelect;
export type CarPhoto = typeof carPhotos.$inferSelect;
export type ServiceRecord = typeof serviceRecords.$inferSelect;
