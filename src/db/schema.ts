import { pgTable, text, integer, jsonb, boolean, primaryKey } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

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
  created_at: integer("created_at").notNull().default(sql`EXTRACT(EPOCH FROM NOW())::integer`),
  updated_at: integer("updated_at").notNull().default(sql`EXTRACT(EPOCH FROM NOW())::integer`),
});

export const megadataToken = pgTable("megadata_token", {
  id: text("id").notNull(),
  collection_id: integer("collection_id")
    .notNull()
    .references(() => megadataCollection.id, { onDelete: 'cascade' }),
  data: jsonb("data").notNull(),
  is_published: boolean("is_published").notNull().default(false),
  created_at: integer("created_at").notNull().default(sql`EXTRACT(EPOCH FROM NOW())::integer`),
  updated_at: integer("updated_at").notNull().default(sql`EXTRACT(EPOCH FROM NOW())::integer`),
}, (table) => [
  primaryKey({ columns: [table.id, table.collection_id] }),
]);

export const module = pgTable("module", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description").notNull(),
  schema: jsonb("schema").notNull(),
  created_at: integer("created_at").notNull().default(sql`EXTRACT(EPOCH FROM NOW())::integer`),
  updated_at: integer("updated_at").notNull().default(sql`EXTRACT(EPOCH FROM NOW())::integer`),
});

export const collectionModule = pgTable("collection_module", {
  id: text("id").primaryKey(),
  collection_id: integer("collection_id")
    .notNull()
    .references(() => megadataCollection.id, { onDelete: 'cascade' }),
  module_id: text("module_id")
    .notNull()
    .references(() => module.id),
  created_at: integer("created_at").notNull().default(sql`EXTRACT(EPOCH FROM NOW())::integer`),
  updated_at: integer("updated_at").notNull().default(sql`EXTRACT(EPOCH FROM NOW())::integer`),
});