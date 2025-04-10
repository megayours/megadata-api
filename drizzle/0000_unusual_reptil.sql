CREATE TABLE "account" (
	"id" text PRIMARY KEY NOT NULL,
	"type" text NOT NULL,
	"created_at" integer DEFAULT EXTRACT(EPOCH FROM NOW())::integer NOT NULL,
	"updated_at" integer DEFAULT EXTRACT(EPOCH FROM NOW())::integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "external_collection" (
	"collection_id" integer PRIMARY KEY NOT NULL,
	"source" text NOT NULL,
	"id" text NOT NULL,
	"type" text NOT NULL,
	"last_checked" integer,
	"created_at" integer DEFAULT EXTRACT(EPOCH FROM NOW())::integer NOT NULL,
	"updated_at" integer DEFAULT EXTRACT(EPOCH FROM NOW())::integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "megadata_collection" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "megadata_collection_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"name" text NOT NULL,
	"account_id" text NOT NULL,
	"is_published" boolean DEFAULT false NOT NULL,
	"type" text DEFAULT 'default' NOT NULL,
	"created_at" integer DEFAULT EXTRACT(EPOCH FROM NOW())::integer NOT NULL,
	"updated_at" integer DEFAULT EXTRACT(EPOCH FROM NOW())::integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "megadata_token" (
	"row_id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "megadata_token_row_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"id" text NOT NULL,
	"collection_id" integer NOT NULL,
	"data" jsonb NOT NULL,
	"is_published" boolean DEFAULT false NOT NULL,
	"created_at" integer DEFAULT EXTRACT(EPOCH FROM NOW())::integer NOT NULL,
	"updated_at" integer DEFAULT EXTRACT(EPOCH FROM NOW())::integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "module" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"description" text NOT NULL,
	"schema" jsonb NOT NULL,
	"created_at" integer DEFAULT EXTRACT(EPOCH FROM NOW())::integer NOT NULL,
	"updated_at" integer DEFAULT EXTRACT(EPOCH FROM NOW())::integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "token_module" (
	"id" text PRIMARY KEY NOT NULL,
	"token_row_id" integer NOT NULL,
	"module_id" text NOT NULL,
	"created_at" integer DEFAULT EXTRACT(EPOCH FROM NOW())::integer NOT NULL,
	"updated_at" integer DEFAULT EXTRACT(EPOCH FROM NOW())::integer NOT NULL
);
--> statement-breakpoint
ALTER TABLE "external_collection" ADD CONSTRAINT "external_collection_collection_id_megadata_collection_id_fk" FOREIGN KEY ("collection_id") REFERENCES "public"."megadata_collection"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "megadata_collection" ADD CONSTRAINT "megadata_collection_account_id_account_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."account"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "megadata_token" ADD CONSTRAINT "megadata_token_collection_id_megadata_collection_id_fk" FOREIGN KEY ("collection_id") REFERENCES "public"."megadata_collection"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "token_module" ADD CONSTRAINT "token_module_token_row_id_megadata_token_row_id_fk" FOREIGN KEY ("token_row_id") REFERENCES "public"."megadata_token"("row_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "token_module" ADD CONSTRAINT "token_module_module_id_module_id_fk" FOREIGN KEY ("module_id") REFERENCES "public"."module"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "unique_external_collection" ON "external_collection" USING btree ("source","id","type");--> statement-breakpoint
CREATE UNIQUE INDEX "unique_token_id_collection_id" ON "megadata_token" USING btree ("id","collection_id");--> statement-breakpoint
CREATE UNIQUE INDEX "unique_token_module" ON "token_module" USING btree ("token_row_id","module_id");