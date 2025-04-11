# 003 - External Collections Implementation

Allow users to create collections based on external sources like EVM chains (e.g., ERC721 contracts). These collections will be automatically populated and kept up-to-date by a background process.

## Completed Tasks
- [x] Define `external_collection` database schema (`src/db/schema.ts`) (updated id field)
- [x] Create database migration for the new `external_collection` table & rename
- [x] Define OpenAPI spec for `POST /external-collections` (`src/routes/megadata/openapi.ts`)
- [x] Implement API handler for `POST /external-collections` (`src/routes/megadata/index.ts`)
    - [x] Validate input (source, id, type) (Handled by Zod schema parsing in handler)
    - [x] Fetch contract name via RPC
    - [x] Create `megadata_collection` entry (mark as external?)
    - [x] Create `external_collection` entry linked to the `megadata_collection`
    - [-] ~~Trigger immediate publishing of the collection to the abstraction chain~~ (Removed - worker handles first publish)
- [x] Prevent manual token management (create/update/delete) for external collections via existing API routes
- [x] Implement/Verify `AbstractionChainService` methods (`createCollection`, `createItems`)

## In Progress Tasks
- [ ] Design and implement the background worker/process
    - [x] Basic worker structure with interval scheduling (`src/workers/external_collection_worker.ts`)
    - [x] RPC logic for `getContractName`, `getTotalSupply` and `getTokenIds` (assuming ERC721Enumerable) (`src/services/rpc.service.ts`)
    - [x] Metadata fetching logic using `tokenURI` (`src/services/metadata-fetcher.service.ts`)
    - [x] Logic to compare external IDs with internal DB IDs
    - [x] Logic to create missing `megadata_token` entries in the database (`MegadataService.createTokens` modified)
    - [x] Logic to trigger publishing of newly created tokens (`AbstractionChainService.createItems` called)
    - [x] Logic to update `last_checked` timestamp in `external_collection` table
    - [x] Detect and log removed tokens (present in DB, not in RPC result)
    - [x] Replace `setInterval` with a production-ready scheduler (e.g., cron, queue)
    - [-] Implement handling for token updates/burns (e.g., mark inactive/delete) (Decision: Log only for now)
    - [ ] Refine error handling and add retries for worker operations

## Future Tasks
- [ ] Update `MegadataService` further if needed (e.g., specific query functions for external collections)
- [ ] Write unit/integration tests for the new API route
- [ ] Write unit/integration tests for the background worker logic

## Implementation Plan

1.  **Database:** Add the `external_collection` table with fields `source`, `id`, `type`, `last_checked`, `collection_id` (foreign key to `megadata_collection.id`), and a unique constraint on (`source`, `id`, `type`). Add a `type` field (text, default 'default') to `megadata_collection` table instead of `is_external`. Rename `external_id` to `id` in `external_collection`. **(Done)**
2.  **API Route:** Create a new route `POST /external-collections` that takes `source`, `id`, and `type` as input. Fetches contract name via RPC. This route will create entries in both `megadata_collection` (with `type='external'`) and `external_collection`. **(Done)**
3.  **Background Worker:** Develop a separate process (or scheduled task) that:
    - Periodically queries the `external_collection` table for collections to check.
    - For each collection, calls the appropriate RPC (based on `source`, `type`) to get the list of token IDs (using ERC721Enumerable).
    - Fetches metadata for each token ID.
    - Compares with existing DB tokens and creates missing `megadata_token` entries.
    - Triggers the token publishing mechanism (`AbstractionChainService.createItems`) for each new token batch.
    - Handles updates/burns (detects removed tokens - currently logs).
    - Updates the `last_checked` timestamp.
    **(Core sync logic implemented assuming ERC721Enumerable, needs update/burn handling, error refinement)**
4.  **Service Layer:** Modify existing services like `MegadataService` to handle collections based on their `type`. Prevent manual token operations on collections where `type` is 'external'. Ensure `publishCollection` and potentially `publishToken` logic can be called independently by the new route and worker. **(Partially done - `createExternalCollection` added, manual token ops prevented in API handlers, `createTokens` modified)**
5.  **Testing:** Implement thorough tests covering the API endpoint and the worker's core logic.

## Relevant Files
- `src/db/schema.ts` ✅
- `src/db/index.ts` ✅
- `src/routes/megadata/openapi.ts` ✅
- `src/routes/megadata/types.ts` ✅
- `src/routes/megadata/index.ts` ✅
- `src/services/megadata.service.ts` ✅
- `src/services/abstraction-chain.service.ts` ✅ (Verified methods exist)
- `src/services/metadata-fetcher.service.ts` ✅
- `src/workers/external_collection_worker.ts` ✅ (Refined logic, uses cron)
- `src/services/rpc.service.ts` ✅ (Implemented ERC721Enumerable)
- `tasks/003-external-collections.md`
