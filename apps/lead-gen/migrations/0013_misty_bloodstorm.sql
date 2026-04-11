DROP INDEX "idx_contacts_email";--> statement-breakpoint
CREATE UNIQUE INDEX "idx_contacts_email" ON "contacts" USING btree ("email");