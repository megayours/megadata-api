ALTER TABLE "megadata_token" DROP CONSTRAINT "megadata_token_id_collection_id_pk";--> statement-breakpoint

-- First add row_id as nullable
ALTER TABLE "megadata_token" ADD COLUMN "row_id" integer;--> statement-breakpoint

-- Create sequence
CREATE SEQUENCE IF NOT EXISTS megadata_token_row_id_seq START WITH 1;--> statement-breakpoint

-- Update existing records with sequence values
UPDATE "megadata_token" SET row_id = nextval('megadata_token_row_id_seq') WHERE row_id IS NULL ORDER BY created_at;--> statement-breakpoint

-- Now make it NOT NULL and set it as IDENTITY
ALTER TABLE "megadata_token" ALTER COLUMN "row_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "megadata_token" ALTER COLUMN "row_id" SET DEFAULT nextval('megadata_token_row_id_seq');--> statement-breakpoint
ALTER TABLE "megadata_token" ALTER COLUMN "row_id" SET GENERATED ALWAYS AS IDENTITY;--> statement-breakpoint
ALTER TABLE "megadata_token" ADD PRIMARY KEY (row_id);--> statement-breakpoint
CREATE UNIQUE INDEX "unique_token_id_collection_id" ON "megadata_token" USING btree ("id","collection_id");
