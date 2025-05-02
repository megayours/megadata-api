CREATE INDEX "index_sync_status" ON "megadata_token" USING btree ("sync_status");--> statement-breakpoint
CREATE INDEX "index_collection_id" ON "megadata_token" USING btree ("collection_id");--> statement-breakpoint
CREATE INDEX "index_token_row_id" ON "token_module" USING btree ("token_row_id");