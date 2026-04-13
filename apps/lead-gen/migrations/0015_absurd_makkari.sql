ALTER TABLE "contacts" ADD COLUMN "slug" text;--> statement-breakpoint
CREATE UNIQUE INDEX "idx_contacts_slug" ON "contacts" USING btree ("slug");