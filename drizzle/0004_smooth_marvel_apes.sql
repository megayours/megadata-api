--> statement-breakpoint
CREATE INDEX CONCURRENTLY "index_updated_at" ON "megadata_token" USING btree ("updated_at");