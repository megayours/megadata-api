# Module Validator Implementation

This feature implements a module validator system that validates token creation and updates based on attached modules. The initial implementation focuses on two modules: `extending_collection` and `extending_metadata`.

## Completed Tasks
- [x] Design module validator system architecture
- [x] Implement base module validator interface
- [x] Create extending_collection validator
  - [x] Extract source and id from metadata
  - [x] Implement Ethereum authentication checks
  - [x] Add admin list validation
- [x] Create extending_metadata validator
  - [x] Extract source, id, and contract from metadata
  - [x] Implement token ownership checks
  - [x] Add operator approval checks
  - [x] Add admin list validation
- [x] Add tests for module validators
  - [x] Extending collection validator tests
  - [x] Extending metadata validator tests
  - [x] Module validator service tests
- [x] Integrate validators with token endpoints
- [x] Add chain configuration config where we can configure a list of RPCs per source
- [x] Implement token permission validation endpoint
  - [x] Create new endpoint to validate token modification permissions
  - [x] Reuse existing module validator logic
  - [x] Accept collection, tokenId, and authentication as input
  - [x] Return validation result with success/failure and error message
  - [x] Add tests for the new endpoint

## Future Tasks
- [ ] Add error handling and logging

## Implementation Plan

### Architecture
1. Created a new module validator system in `src/services/module-validator/`:
   - `index.ts`: Main entry point for module validation
   - `types.ts`: Type definitions for modules and validation results
   - `base-validator.ts`: Base validator class with common functionality
   - `extending-collection.ts`: Implementation for extending_collection module
   - `extending-metadata.ts`: Implementation for extending_metadata module

2. The validator system:
   - Takes modules, metadata, and walletAddress as input
   - Returns a validation result with success/failure and error message
   - Uses neverthrow for error handling
   - Supports multiple validators through a Map-based registry
   - Skips validation for unknown module types

### extending_collection Module
1. Extracts properties from metadata:
   - source: blockchain (Ethereum only for now)
   - id: contract address

2. Implements authentication checks:
   - Checks ERC721 token ownership if module is present using `ethers`
   - Checks contract ownership if module is present using `ethers`
   - Checks against admin list
   - Returns appropriate error messages

### extending_metadata Module
1. Extracts properties from metadata:
   - source: blockchain (Ethereum only for now)
   - id: token ID
   - contract: contract address

2. Implements authentication checks:
   - Checks token ownership using `ownerOf` function
   - Checks operator approval using `isApprovedForAll` function
   - Checks against admin list
   - Returns appropriate error messages

### Error Handling
- Uses neverthrow with ResultAsync for all async operations
- Returns appropriate HTTP status codes
- Includes detailed error messages

## Relevant Files
- `src/routes/megadata/index.ts`: Token endpoints that use the validator
- `src/routes/megadata/openapi.ts`: OpenAPI definitions for token endpoints
- `src/services/module-validator/`: New directory for validator implementation
  - `index.ts`: Main entry point
  - `types.ts`: Type definitions
  - `base-validator.ts`: Base validator class
  - `extending-collection.ts`: Extending collection validator
  - `extending-metadata.ts`: Extending metadata validator
- `src/tests/module-validator/`: Test directory for validator tests
  - `extending-collection.test.ts`: Tests for extending collection validator
  - `extending-metadata.test.ts`: Tests for extending metadata validator
  - `module-validator-service.test.ts`: Tests for module validator service
- `src/types/bun-types.d.ts`: Type declarations for bun test runner
- `src/config/rpc.ts`: RPC configuration for different blockchain sources

## Technical Components
1. Ethereum RPC client for ownership checks
2. Admin list configuration
3. Module validation interface
4. Error handling utilities
5. Dynamic RPC URL configuration per source 