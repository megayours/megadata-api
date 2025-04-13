import { pgTable, text, integer, jsonb, boolean, uniqueIndex } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";

export const account = pgTable("account", {
  id: text("id").primaryKey(),
  type: text("type").notNull(),
  created_at: integer("created_at").notNull().default(sql`EXTRACT(EPOCH FROM NOW())::integer`),
  updated_at: integer("updated_at").notNull().default(sql`EXTRACT(EPOCH FROM NOW())::integer`),
});

export const megadataCollection = pgTable("megadata_collection", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  name: text("name").notNull(),
  account_id: text("account_id")
    .notNull()
    .references(() => account.id),
  is_published: boolean("is_published").notNull().default(false),
  type: text("type").notNull().default('default'),
  created_at: integer("created_at").notNull().default(sql`EXTRACT(EPOCH FROM NOW())::integer`),
  updated_at: integer("updated_at").notNull().default(sql`EXTRACT(EPOCH FROM NOW())::integer`),
});

export const selectCollectionsSchema = createSelectSchema(megadataCollection);
export const insertCollectionsSchema = createInsertSchema(
  megadataCollection,
  {
    name: schema => schema.min(1).max(255),
  }
).required()
  .omit({
    type: true,
    account_id: true,
    is_published: true,
    created_at: true,
    updated_at: true,
  });

export const megadataToken = pgTable("megadata_token", {
  row_id: integer("row_id").primaryKey().generatedAlwaysAsIdentity(),
  id: text("id").notNull(),
  collection_id: integer("collection_id")
    .notNull()
    .references(() => megadataCollection.id, { onDelete: 'cascade' }),
  data: jsonb("data").notNull(),
  is_published: boolean("is_published").notNull().default(false),
  created_at: integer("created_at").notNull().default(sql`EXTRACT(EPOCH FROM NOW())::integer`),
  updated_at: integer("updated_at").notNull().default(sql`EXTRACT(EPOCH FROM NOW())::integer`),
}, (table) => [
  uniqueIndex("unique_token_id_collection_id").on(table.id, table.collection_id),
]);

export const module = pgTable("module", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description").notNull(),
  schema: jsonb("schema").notNull(),
  created_at: integer("created_at").notNull().default(sql`EXTRACT(EPOCH FROM NOW())::integer`),
  updated_at: integer("updated_at").notNull().default(sql`EXTRACT(EPOCH FROM NOW())::integer`),
});

export const tokenModule = pgTable("token_module", {
  id: text("id").primaryKey(),
  token_row_id: integer("token_row_id")
    .notNull()
    .references(() => megadataToken.row_id, { onDelete: 'cascade' }),
  module_id: text("module_id")
    .notNull()
    .references(() => module.id),
  created_at: integer("created_at").notNull().default(sql`EXTRACT(EPOCH FROM NOW())::integer`),
  updated_at: integer("updated_at").notNull().default(sql`EXTRACT(EPOCH FROM NOW())::integer`),
}, (table) => [
  uniqueIndex("unique_token_module").on(table.token_row_id, table.module_id),
]);

export const externalCollection = pgTable("external_collection", {
  collection_id: integer("collection_id")
    .primaryKey()
    .references(() => megadataCollection.id, { onDelete: 'cascade' }),
  source: text("source").notNull(),
  id: text("id").notNull(),
  type: text("type").notNull(),
  last_checked: integer("last_checked"),
  created_at: integer("created_at").notNull().default(sql`EXTRACT(EPOCH FROM NOW())::integer`),
  updated_at: integer("updated_at").notNull().default(sql`EXTRACT(EPOCH FROM NOW())::integer`),
}, (table) => [
  uniqueIndex("unique_external_collection").on(table.source, table.id, table.type),
]);

export const selectExternalCollectionSchema = createSelectSchema(externalCollection);