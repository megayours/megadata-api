import { db } from "../db";
import { externalCollection, megadataCollection, megadataToken, module } from "../db/schema";
import { handleDatabaseError } from "../db/helpers";
import type { ExternalCollection, MegadataCollection, Module, NewMegadataToken } from "../db";
import { err, ok, ResultAsync, Err } from "neverthrow";
import { eq, isNull, or, lt, sql, inArray } from "drizzle-orm"; // Add inArray back
import { AbstractionChainService } from "../services/abstraction-chain.service"; // Assuming this handles publishing
import { MegadataService } from "../services/megadata.service"; // Needed for token creation/publishing logic?
import { RpcService } from "../services/rpc.service"; // Placeholder - To be created
import { MetadataFetcherService } from "../services/metadata-fetcher.service"; // Assuming this can fetch external metadata
import type { Error } from "../types/error";
import cron from 'node-cron';
import { formatData } from "../utils/data-formatter";
import { SPECIAL_MODULES } from "../utils/constants";

const CHECK_INTERVAL_MS = 60 * 60 * 1000; // Check once per hour
const BATCH_SIZE = 10; // Process N collections per run to avoid overwhelming resources
const TOKEN_BATCH_SIZE = 10; // Create/publish tokens in batches

// Cron schedule (e.g., every hour at the start of the hour)
// For testing, you might use '*/5 * * * *' (every 5 minutes)
const CRON_SCHEDULE = '0 * * * *'; // Run at minute 0 of every hour

console.log(`Scheduling external collection worker with schedule: ${CRON_SCHEDULE}`);

// Flag to prevent concurrent runs
let isCronJobRunning = false;

cron.schedule(CRON_SCHEDULE, async () => {
  if (isCronJobRunning) {
    console.log("Cron job still running, skipping this scheduled run.");
    return;
  }

  console.log(`Cron job starting at ${new Date().toISOString()}`);
  isCronJobRunning = true;
  try {
    await runWorker();
  } catch (e) {
    console.error("Unhandled error during scheduled worker execution:", e);
  } finally {
    isCronJobRunning = false;
    console.log(`Cron job finished at ${new Date().toISOString()}`);
  }
});

console.log("External collection worker scheduled.");

export async function syncExternalCollection(extCollection: ExternalCollection & { megadata: MegadataCollection }): Promise<ResultAsync<boolean, Error>> {
  console.log(`Syncing external collection: ${extCollection.collection_id} (${extCollection.source}/${extCollection.id})`);

  try {
    // 1. Get all token IDs from the external source (RPC)
    const externalIdsResult = await RpcService.getTokenIds(
      extCollection.source as string,
      extCollection.type as string,
      extCollection.id as string
    );
    if (externalIdsResult.isErr()) {
      console.error(`  Failed to get external token IDs:`, externalIdsResult.error);
      return err(externalIdsResult.error); // Cannot proceed without external IDs
    }
    const externalIds = new Set(externalIdsResult.value);
    console.log(`  Found ${externalIds.size} token IDs externally.`);

    // 2. Get all existing token IDs from our database for this collection
    const existingTokensResult = await ResultAsync.fromPromise(
      db.select({ id: megadataToken.id })
        .from(megadataToken)
        .where(eq(megadataToken.collection_id, extCollection.collection_id)),
      handleDatabaseError
    );
    if (existingTokensResult.isErr()) {
      console.error(`  Failed to get existing token IDs from DB:`, existingTokensResult.error);
      return err(existingTokensResult.error); // Cannot proceed reliably
    }
    const existingIds = new Set(existingTokensResult.value.map(t => t.id));
    console.log(`  Found ${existingIds.size} token IDs in database.`);

    // 3. Determine missing token IDs (present externally, missing internally)
    const missingIds: string[] = [];
    for (const extId of externalIds) {
      if (!existingIds.has(extId)) {
        missingIds.push(extId);
      }
    }

    // 4. Determine removed token IDs (present internally, missing externally)
    const removedIds: string[] = [];
    for (const existingId of existingIds) {
      if (!externalIds.has(existingId)) {
        removedIds.push(existingId);
      }
    }

    // --- Handle Missing Tokens ---
    if (missingIds.length === 0) {
      console.log("  No new tokens to sync.");
      // No need to check removedIds again here, already handled above
      return ok(true); // Sync complete for now
    }

    console.log(`  Found ${missingIds.length} missing tokens to create.`);

    // --- Loop through only MISSING IDs ---
    let createdCount = 0;
    let publishedCount = 0;
    const tokensToCreate: NewMegadataToken[] = [];

    for (const tokenId of missingIds) {
      console.log(`  Fetching metadata for missing token ID: ${tokenId}`);
      // Fetch metadata for the missing token ID
      const metadataResult = await MetadataFetcherService.fetchMetadata(
        extCollection.source as string,
        extCollection.id as string,
        tokenId
      );
      if (metadataResult.isErr()) {
        console.error(`    Failed to fetch metadata for token ${tokenId}:`, metadataResult.error);
        continue; // Skip this token, maybe retry later?
      }
      const metadata = metadataResult.value;
      console.log(`    Metadata fetched for ${tokenId}`); // Less verbose logging

      tokensToCreate.push({
        id: tokenId,
        collection_id: extCollection.collection_id,
        data: metadata,
        is_published: true,
        modules: [extCollection.type, SPECIAL_MODULES.EXTENDING_METADATA, SPECIAL_MODULES.EXTENDING_COLLECTION]
      });

      // Batch creation/publishing logic
      if (tokensToCreate.length >= TOKEN_BATCH_SIZE) {
        console.log(`  Processing batch of ${tokensToCreate.length} tokens...`);
        const batchResult = await processTokenBatch(extCollection.collection_id, tokensToCreate);
        if (batchResult.isOk()) {
          createdCount += batchResult.value.created;
          publishedCount += batchResult.value.published;
        }
        // Clear batch even if processing failed for some
        tokensToCreate.length = 0;
      }
    }

    // Process any remaining tokens in the last batch
    if (tokensToCreate.length > 0) {
      console.log(`  Processing final batch of ${tokensToCreate.length} tokens...`);
      const batchResult = await processTokenBatch(extCollection.collection_id, tokensToCreate);
        if (batchResult.isOk()) {
          createdCount += batchResult.value.created;
          publishedCount += batchResult.value.published;
        }
    }

    console.log(`  Sync finished for collection ${extCollection.collection_id}. Created: ${createdCount}, Published: ${publishedCount}`);
    return ok(true);

  } catch (error) {
    console.error(`Error syncing collection ${extCollection.collection_id} (${extCollection.id}):`, error);
    // Use neverthrow err here
    return err(handleDatabaseError(error));
  }
}

// Helper function to process a batch of tokens (create + publish)
async function processTokenBatch(collectionId: number, tokens: NewMegadataToken[]): Promise<ResultAsync<{ created: number; published: number }, Error>> {
  let createdCount = 0;
  let publishedCount = 0;

  // 1. Create Tokens
  const createResult = await MegadataService.createTokens(collectionId, tokens);
  if (createResult.isErr()) {
    console.error(`    Error creating batch of tokens:`, createResult.error);
    // Decide how to handle partial failure - for now, return error, no publishing attempt
    return err(createResult.error);
  }
  const createdBatch = createResult.value;
  createdCount = createdBatch.length;
  if (createdCount === 0) {
    return ok({ created: 0, published: 0 }); // Nothing was created
  }
  console.log(`    Successfully created ${createdCount} tokens in DB.`);

  // 2. Publish Tokens
  const modulesResult = await ResultAsync.fromPromise<Module[], Error>(
    db.select()
      .from(module)
      .where(inArray(module.id, [SPECIAL_MODULES.EXTENDING_METADATA, SPECIAL_MODULES.EXTENDING_COLLECTION, SPECIAL_MODULES.ERC721])),
    (error) => handleDatabaseError(error)
  );

  if (modulesResult.isErr()) {
    return err(modulesResult.error);
  }

  console.log(`    Publishing batch of ${createdBatch.length} tokens...`);
  const publishResult = await AbstractionChainService.createItems(collectionId, createdBatch.map(t => ({ id: t.id, data: formatData(t.data as Record<string, any>, modulesResult.value) })));

  if (publishResult.isErr()) {
    console.error(`    Error publishing batch of tokens:`, publishResult.error);
    // Tokens were created but not published. Worker might retry later, or manual intervention needed.
    // Return success for creation part, but indicate 0 published.
    return ok({ created: createdCount, published: 0 });
  } else {
    // 3. Update is_published status
    const updateResult = await ResultAsync.fromPromise(
        db.update(megadataToken)
          .set({ is_published: true })
          .where(inArray(megadataToken.row_id, createdBatch.map(t => t.row_id)))
          .then(() => true),
        handleDatabaseError
      );

    if (updateResult.isErr()) {
        console.error(`    Error updating is_published status for batch:`, updateResult.error);
        // Published, but status update failed. Critical inconsistency.
        // Return success for creation, but 0 published for safety? Or specific error?
        return ok({ created: createdCount, published: 0 }); // Treat as not published for safety
    } else {
        publishedCount = createdBatch.length;
        console.log(`    Successfully published ${publishedCount} tokens.`);
        return ok({ created: createdCount, published: publishedCount });
    }
  }
}

// Main worker loop function
async function runWorker() {
  console.log("Running external collection worker...");
  const nowSeconds = Math.floor(Date.now() / 1000);
  const checkThreshold = nowSeconds - (CHECK_INTERVAL_MS / 1000);

  try {
    // Find external collections that haven't been checked recently or ever
    const collectionsToSync = await db
      .select()
      .from(externalCollection)
      .innerJoin(megadataCollection, eq(externalCollection.collection_id, megadataCollection.id))
      .where(
        or(
          isNull(externalCollection.last_checked),
          lt(externalCollection.last_checked, checkThreshold)
        )
      )
      .orderBy(sql`${externalCollection.last_checked} ASC NULLS FIRST`) // Process oldest/never checked first
      .limit(BATCH_SIZE);

    if (collectionsToSync.length === 0) {
      console.log("No external collections need syncing right now.");
      return;
    }

    console.log(`Found ${collectionsToSync.length} external collections to sync.`);

    for (const row of collectionsToSync) {
      // Use correct table names from the join result
      const extCol = row.external_collection;
      const megaCol = row.megadata_collection;

      if (!extCol || !megaCol) {
          console.error("Skipping row due to missing data after join:", row);
          continue;
      }

      const syncResult = await syncExternalCollection({ ...extCol, megadata: megaCol });

      const updateTimestamp = Math.floor(Date.now() / 1000);
      // Update last_checked timestamp regardless of sync success/failure
      // to avoid retrying constantly failing collections too quickly.
      // Consider adding a failure count or specific error state if needed.
      await ResultAsync.fromPromise(
          db.update(externalCollection)
            .set({ last_checked: updateTimestamp })
            .where(eq(externalCollection.collection_id, extCol.collection_id)),
          handleDatabaseError
        ).mapErr(e => console.error(`Failed to update last_checked for ${extCol.collection_id}:`, e));

      if (syncResult.isErr()) {
        console.error(`Finished syncing collection ${extCol.collection_id} with error.`);
        // Continue to the next collection
      }
    }

    console.log("External collection worker finished run.");

  } catch (error) {
    console.error("Fatal error in external collection worker:", error);
  }
}
