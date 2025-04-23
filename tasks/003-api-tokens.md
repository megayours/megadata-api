# API Token Implementation

This feature allows users to create and manage API tokens for programmatic access to the API. API tokens are linked to user accounts and provide an alternative authentication method to JWT.

## Completed Tasks
- [ ] None yet

## In Progress Tasks
- [ ] Design database schema for API tokens

## Future Tasks
- [ ] Create database migration script for API tokens
- [ ] Implement API token generation service
- [ ] Implement API token validation service
- [ ] Update auth middleware to support API token authentication
- [ ] Create API endpoints for token management (CRUD operations)
- [ ] Implement last_accessed tracking for API tokens
- [ ] Add API token usage statistics
- [ ] Write tests for API token authentication
- [ ] Create documentation for API token usage

## Implementation Plan

### Database Schema
Add a new `api_token` table to store tokens with the following fields:
- `id`: A unique identifier for the token
- `token`: The hashed token value
- `account_id`: Reference to the account that owns the token
- `name`: User-provided name for the token's purpose
- `created_at`: When the token was created
- `updated_at`: When the token was last updated
- `last_accessed`: When the token was last used for authentication
- `expires_at`: Optional expiration date for the token

### Authentication Flow
1. Update the auth middleware to check for an API token header before falling back to JWT authentication
2. If an API token is provided, validate it against the database
3. If valid, retrieve the associated account and set it in the request context
4. Track the last_accessed timestamp for the token

### API Routes
Create new routes under a `/settings/api-tokens` path:
- `GET /settings/api-tokens` - List all tokens for the authenticated account
- `POST /settings/api-tokens` - Create a new API token
- `GET /settings/api-tokens/:id` - Get details for a specific token
- `DELETE /settings/api-tokens/:id` - Revoke a token by deleting it

## Relevant Files
- src/db/schema.ts - Add API token table schema
- src/middleware/auth.ts - Update to support API token authentication
- src/services/apiToken.service.ts - New service for token operations
- src/routes/settings/api-tokens.ts - New routes for token management 