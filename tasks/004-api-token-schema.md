# API Token Schema Implementation

This task covers the detailed design and implementation of the database schema for API tokens.

## Completed Tasks
- [ ] None yet

## In Progress Tasks
- [ ] Design API token database schema
- [ ] Create schema migration

## Future Tasks
- [ ] Update schema.ts with TypeScript interfaces for API tokens
- [ ] Create schema validation using zod for API requests
- [ ] Add token hashing and validation utilities

## Implementation Plan

### Database Schema Details

The `api_token` table will be designed as follows:

```typescript
export const apiToken = pgTable("api_token", {
  id: text("id").primaryKey(), // UUID for the token
  token_hash: text("token_hash").notNull(), // Securely hashed token value
  account_id: text("account_id")
    .notNull()
    .references(() => account.id, { onDelete: 'cascade' }),
  name: text("name").notNull(), // A name to identify the token
  last_accessed: integer("last_accessed"), // Timestamp of last successful authentication
  expires_at: integer("expires_at"), // Optional expiration timestamp
  created_at: integer("created_at").notNull().default(sql`EXTRACT(EPOCH FROM NOW())::integer`),
  updated_at: integer("updated_at").notNull().default(sql`EXTRACT(EPOCH FROM NOW())::integer`),
});
```

### Token Format

The API token will be generated with the following format:
- Prefix: `mk_` (stands for "Megadata Key")
- Body: Random string of characters (cryptographically secure)
- Total length: 32 characters including prefix

Example: `mk_a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6`

### Security Considerations

1. Tokens should never be stored in plain text in the database
2. Use a secure hashing algorithm (e.g., bcrypt) for token storage
3. Rate limiting should be implemented to prevent brute force attacks
4. Tokens should be transmitted only over HTTPS

### Database Migration

A migration script will need to be created to add the `api_token` table to the database:

```typescript
export async function up(db: Kysely<any>): Promise<void> {
  await db.schema
    .createTable("api_token")
    .addColumn("id", "text", (col) => col.primaryKey())
    .addColumn("token_hash", "text", (col) => col.notNull())
    .addColumn("account_id", "text", (col) => col.notNull().references("account.id").onDelete("cascade"))
    .addColumn("name", "text", (col) => col.notNull())
    .addColumn("last_accessed", "integer")
    .addColumn("expires_at", "integer")
    .addColumn("created_at", "integer", (col) => col.notNull().defaultTo(sql`EXTRACT(EPOCH FROM NOW())::integer`))
    .addColumn("updated_at", "integer", (col) => col.notNull().defaultTo(sql`EXTRACT(EPOCH FROM NOW())::integer`))
    .execute();
}

export async function down(db: Kysely<any>): Promise<void> {
  await db.schema.dropTable("api_token").execute();
}
```

## Relevant Files
- src/db/schema.ts - Add API token table schema
- src/db/migrations/xxx_create_api_token_table.ts - Migration script 