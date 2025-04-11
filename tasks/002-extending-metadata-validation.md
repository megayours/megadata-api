# Extending Metadata Validation Implementation

This feature implements validation and metadata fetching for tokens that use the `extending_metadata` module. When this module is used, we need to validate that `extending_collection` is also present and fetch metadata from the specified blockchain source.

## Completed Tasks
- [x] Implement validation for extending_metadata module dependency
  - Added check for extending_collection module presence
  - Updated validator to receive modules array
  - Added test cases for dependency validation
- [x] Add metadata fetching from blockchain
  - Created MetadataFetcherService to handle metadata fetching
  - Implemented tokenURI fetching from contract
  - Added IPFS URL handling via megarouter
  - Added metadata merging functionality
  - Added comprehensive test coverage
- [x] Implement metadata merging logic in MegadataService
  - Added fetchAndMergeMetadata method
  - Integrated with MetadataFetcherService
  - Handles both extending_metadata and extending_collection modules
  - Properly merges metadata with overrides
- [x] Add tests for the new functionality in MegadataService
  - Created tests for metadata fetching and merging
  - Added tests for error cases
  - Added tests for module validation
  - Added tests for metadata merging

## In Progress Tasks
- [ ] Add tests for the new functionality in MegadataService

## Future Tasks
- [ ] Add tests for the new functionality in MegadataService

## Implementation Plan

1. Validation Requirements:
   - When `extending_metadata` module is used, validate that `extending_collection` is also present ✅
   - Extract required metadata attributes:
     - source: blockchain (e.g. Ethereum)
     - id: contract address

2. Metadata Fetching:
   - Use RPC configuration to connect to the specified blockchain (source in the provided metadata) ✅
   - Implement tokenURI fetching from the specified contract (id in the provided metadata) ✅
   - Use our megarouter as a gateway in order to handle IPFS. E.g. if URL is ipfs://.... send a GET request to: `${process.env.NEXT_PUBLIC_MEGADATA_API_URI}/ext/${tokenURI}` ✅
   - Fetch metadata from the returned URI via megarouter ✅
   - Merge fetched metadata with the provided metadata (overriding potential conflicts) ✅

3. Data Storage:
   - Store the merged metadata in the database ✅
   - Ensure proper error handling using neverthrow ✅

## Relevant Files
- `src/services/module-validator/extending-metadata.ts`: Modified to implement the new validation ✅
- `src/services/module-validator/index.ts`: Updated to pass modules array to validators ✅
- `src/services/metadata-fetcher.service.ts`: Created to handle metadata fetching and merging ✅
- `src/services/megadata.service.ts`: Updated to handle metadata fetching and merging ✅
- `src/config/rpc.ts`: Contains RPC configuration for different blockchains
- `src/utils/data-formatter.ts`: May need updates for metadata merging
- `src/tests/module-validator/extending-metadata.test.ts`: Added new tests for the feature ✅
- `src/tests/metadata-fetcher.service.test.ts`: Added new tests for metadata fetching ✅
- `src/tests/services/megadata.service.test.ts`: Added new tests for metadata merging ✅

## Technical Components
1. Module Validation:
   - Check for required module dependencies ✅
   - Validate metadata structure
   - Use existing validator infrastructure

2. Blockchain Integration:
   - Use ethers.js for blockchain interaction ✅
   - Implement tokenURI fetching ✅
   - Route the tokenURI via our megarouter ✅
   - Handle metadata fetching and parsing ✅

3. Data Processing:
   - Implement metadata merging logic ✅
   - Handle different metadata formats ✅
   - Ensure data consistency ✅

## Environment Configuration
- No additional environment variables needed
- Uses existing RPC configuration 