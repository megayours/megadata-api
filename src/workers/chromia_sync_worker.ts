import { eq, and, inArray, sql } from 'drizzle-orm';
import { db } from '@/db';
import { megadataToken, tokenModule, module as moduleTable, megadataCollection } from '@/db/schema';
import cron from 'node-cron';
import { AbstractionChainService } from '@/services/abstraction-chain.service';
import { formatData } from '@/utils/data-formatter';
import { sleep } from '@/lib/util';

const CRON_SCHEDULE = '*/1 * * * *'; // Check once per minute
const BATCH_SIZE = 10;

let isCronJobRunning = false;

console.log(`Scheduling chromia sync worker with schedule: ${CRON_SCHEDULE}`);

cron.schedule(CRON_SCHEDULE, async () => {
  if (isCronJobRunning) {
    console.log("Cron job still running, skipping this scheduled run.");
    return;
  }

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

console.log("Chromia sync worker scheduled.");

async function runWorker() {
  console.log("Running Chroimia Sync Worker...");

  // Fetch a batch of pending tokens
  const tokens = await db
    .select({
      row_id: megadataToken.row_id,
      id: megadataToken.id,
      collection_id: megadataToken.collection_id,
      data: megadataToken.data,
    })
    .from(megadataToken)
    .leftJoin(megadataCollection, eq(megadataToken.collection_id, megadataCollection.id))
    .where(and(eq(megadataToken.sync_status, 'pending'), eq(megadataCollection.is_published, true)))
    .orderBy(megadataToken.updated_at)
    .limit(100);

  if (tokens.length === 0) {
    console.log("No pending tokens found.");
    return;
  }

  console.log(`Received ${tokens.length} pending tokens to sync.`);

  // Group tokens by collection_id
  const groupedByCollection = new Map<number, typeof tokens>();
  for (const token of tokens) {
    if (!token.collection_id) continue;
    if (!groupedByCollection.has(token.collection_id)) {
      groupedByCollection.set(token.collection_id, []);
    }
    groupedByCollection.get(token.collection_id)!.push(token);
  }

  // Process each collection's tokens
  for (const [collectionId, collectionTokens] of groupedByCollection.entries()) {
    // Fetch modules for these tokens
    const tokenModules = await db
      .select({
        token_row_id: tokenModule.token_row_id,
        module_id: tokenModule.module_id,
        module_schema: moduleTable.schema,
      })
      .from(tokenModule)
      .leftJoin(moduleTable, eq(tokenModule.module_id, moduleTable.id))
      .where(inArray(tokenModule.token_row_id, collectionTokens.map(t => t.row_id)));

    // Group modules by token
    const tokenModulesMap = new Map<number, { id: string; schema: any }[]>();
    for (const tm of tokenModules) {
      if (!tokenModulesMap.has(tm.token_row_id)) {
        tokenModulesMap.set(tm.token_row_id, []);
      }
      if (tm.module_schema && typeof tm.module_id === 'string') {
        tokenModulesMap.get(tm.token_row_id)!.push({ id: tm.module_id, schema: tm.module_schema });
      }
    }

    // Prepare tokens with their modules
    const tokensWithModules = collectionTokens.map(token => ({
      id: token.id,
      data: token.data as Record<string, any>,
      modules: tokenModulesMap.get(token.row_id) || []
    }));

    // Collect unique modules for this batch
    const batchModules: { id: string; schema: any }[] = [];
    const seenModuleIds = new Set<string>();
    for (const token of tokensWithModules) {
      for (const mod of token.modules) {
        if (!seenModuleIds.has(mod.id)) {
          seenModuleIds.add(mod.id);
          batchModules.push(mod);
        }
      }
    }

    // Sync tokens
    await syncTokens(
      collectionId,
      tokensWithModules.map(t => ({ id: t.id, data: t.data })),
      batchModules
    );

    // Update sync status
    await db.update(megadataToken)
      .set({ sync_status: 'done', is_published: true })
      .where(and(
        eq(megadataToken.collection_id, collectionId),
        inArray(megadataToken.id, tokensWithModules.map(t => t.id))
      ));
  }
}

async function syncTokens(
  collectionId: number,
  tokenIds: { id: string, data: Record<string, any> }[],
  modules: { id: string, schema: any }[]
) {
  const tokensToCreate = [];
  const tokensToUpdate = [];

  const publishedItems = [];

  for (const token of tokenIds) {
    const publishedItem = await AbstractionChainService.getPublishedItem(collectionId, token.id);
    await sleep(1000);
    publishedItems.push(publishedItem);
  }

  const publishedIds = new Set(publishedItems.filter(item => item !== null).map(item => item.token_id));

  for (const token of tokenIds) {
    if (publishedIds.has(token.id)) {
      tokensToUpdate.push(token);
    } else {
      tokensToCreate.push(token);
    }
  }

  console.log(`Tokens to create: ${tokensToCreate.length}`);
  console.log(`Tokens to update: ${tokensToUpdate.length}`);

  if (tokensToCreate.length > 0) {
    await AbstractionChainService.createItems(collectionId, tokensToCreate.map(t => ({ id: t.id, data: formatData(t.data, modules) })));
  }

  if (tokensToUpdate.length > 0) {
    await AbstractionChainService.updateItems(collectionId, tokensToUpdate.map(t => ({ id: t.id, data: formatData(t.data, modules) })));
  }
}