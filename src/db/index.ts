import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';
import type { InferModel } from "drizzle-orm";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error('DATABASE_URL environment variable is not set');
}

// Create the connection
const client = postgres(connectionString);

// Create the Drizzle instance
export const db = drizzle(client, { schema });

// Export types
export type Account = InferModel<typeof schema.account>;
export type NewAccount = InferModel<typeof schema.account, "insert">;

export type MegadataCollection = InferModel<typeof schema.megadataCollection> & {
  modules?: string[];
};
export type NewMegadataCollection = InferModel<typeof schema.megadataCollection, "insert">;

export type MegadataToken = InferModel<typeof schema.megadataToken>;
export type NewMegadataToken = InferModel<typeof schema.megadataToken, "insert">;

export type Module = InferModel<typeof schema.module>;
export type NewModule = InferModel<typeof schema.module, "insert">;

export type CollectionModule = InferModel<typeof schema.collectionModule>;
export type NewCollectionModule = InferModel<typeof schema.collectionModule, "insert">; 