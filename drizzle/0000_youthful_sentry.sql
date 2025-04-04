CREATE TABLE "account" (
	"id" text PRIMARY KEY NOT NULL,
	"type" text NOT NULL,
	"created_at" integer DEFAULT EXTRACT(EPOCH FROM NOW())::integer NOT NULL,
	"updated_at" integer DEFAULT EXTRACT(EPOCH FROM NOW())::integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "collection_module" (
	"id" text PRIMARY KEY NOT NULL,
	"collection_id" integer NOT NULL,
	"module_id" text NOT NULL,
	"created_at" integer DEFAULT EXTRACT(EPOCH FROM NOW())::integer NOT NULL,
	"updated_at" integer DEFAULT EXTRACT(EPOCH FROM NOW())::integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "megadata_collection" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "megadata_collection_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"name" text NOT NULL,
	"account_id" text NOT NULL,
	"is_published" boolean DEFAULT false NOT NULL,
	"created_at" integer DEFAULT EXTRACT(EPOCH FROM NOW())::integer NOT NULL,
	"updated_at" integer DEFAULT EXTRACT(EPOCH FROM NOW())::integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "megadata_token" (
	"id" text NOT NULL,
	"collection_id" integer NOT NULL,
	"data" jsonb NOT NULL,
	"is_published" boolean DEFAULT false NOT NULL,
	"created_at" integer DEFAULT EXTRACT(EPOCH FROM NOW())::integer NOT NULL,
	"updated_at" integer DEFAULT EXTRACT(EPOCH FROM NOW())::integer NOT NULL,
	CONSTRAINT "megadata_token_id_collection_id_pk" PRIMARY KEY("id","collection_id")
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
ALTER TABLE "collection_module" ADD CONSTRAINT "collection_module_collection_id_megadata_collection_id_fk" FOREIGN KEY ("collection_id") REFERENCES "public"."megadata_collection"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "collection_module" ADD CONSTRAINT "collection_module_module_id_module_id_fk" FOREIGN KEY ("module_id") REFERENCES "public"."module"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "megadata_collection" ADD CONSTRAINT "megadata_collection_account_id_account_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."account"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "megadata_token" ADD CONSTRAINT "megadata_token_collection_id_megadata_collection_id_fk" FOREIGN KEY ("collection_id") REFERENCES "public"."megadata_collection"("id") ON DELETE cascade ON UPDATE no action;