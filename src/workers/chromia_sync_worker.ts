import { eq, and, inArray } from 'drizzle-orm';
import { db } from '@/db';
import { megadataToken, tokenModule, module as moduleTable } from '@/db/schema';
import cron from 'node-cron';
import { AbstractionChainService } from '@/services/abstraction-chain.service';
import { formatData } from '@/utils/data-formatter';

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
  console.log("Running worker...");

  // 1. Fetch all pending tokens with their modules and module schemas in a single query
  const tokensWithModules = await db
    .select({
      row_id: megadataToken.row_id,
      id: megadataToken.id,
      collection_id: megadataToken.collection_id,
      data: megadataToken.data,
      module_id: tokenModule.module_id,
      module_schema: moduleTable.schema,
    })
    .from(megadataToken)
    .leftJoin(tokenModule, eq(megadataToken.row_id, tokenModule.token_row_id))
    .leftJoin(moduleTable, eq(tokenModule.module_id, moduleTable.id))
    .where(eq(megadataToken.sync_status, 'pending'))
    .orderBy(megadataToken.collection_id, megadataToken.updated_at);

  // 2. Group tokens by collection_id, and for each token aggregate all its modules
  type TokenGroup = {
    row_id: number;
    id: string;
    data: Record<string, any>;
    modules: { id: string; schema: any }[];
  };
  // Map: collection_id -> Map<token_id, TokenGroup>
  const grouped: Map<number, Map<string, TokenGroup>> = new Map();
  for (const row of tokensWithModules) {
    if (!row) continue;
    if (!row.collection_id || row.id === undefined) continue;
    if (!grouped.has(row.collection_id)) {
      grouped.set(row.collection_id, new Map());
    }
    const tokenMap = grouped.get(row.collection_id)!;
    if (!tokenMap.has(row.id)) {
      tokenMap.set(row.id, {
        row_id: row.row_id,
        id: row.id,
        data: row.data as Record<string, any>,
        modules: [],
      });
    }
    const tokenGroup = tokenMap.get(row.id)!;
    if (row.module_schema && typeof row.module_id === 'string') {
      // Only add if not already present
      if (!tokenGroup.modules.some(m => m.id === row.module_id)) {
        tokenGroup.modules.push({ id: row.module_id, schema: row.module_schema });
      }
    }
  }

  // 3. Iterate per group and call syncTokens
  for (const [collectionIdStr, tokenMap] of grouped.entries()) {
    const tokens = Array.from(tokenMap.values()).slice(0, BATCH_SIZE);
    if (!tokens || tokens.length === 0) continue;
    const collectionId = Number(collectionIdStr);
    // Collect all unique modules for this group
    const groupModules: { id: string; schema: any }[] = [];
    const seenModuleIds = new Set<string>();
    for (const token of tokens) {
      for (const mod of token.modules) {
        if (!seenModuleIds.has(mod.id)) {
          seenModuleIds.add(mod.id);
          groupModules.push(mod);
        }
      }
    }
    await syncTokens(
      collectionId,
      tokens.map((t: TokenGroup) => ({ id: t.id, data: t.data })),
      groupModules
    );

    // 4. Update sync_status to 'done' for these tokens
    await db.update(megadataToken)
      .set({ sync_status: 'done', is_published: true })
      .where(and(eq(megadataToken.collection_id, collectionId), inArray(megadataToken.id, tokens.map((t: TokenGroup) => t.id))));
  }
}

async function syncTokens(
  collectionId: number,
  tokenIds: { id: string, data: Record<string, any> }[],
  modules: { id: string, schema: any }[]
) {
  const tokensToCreate = [];
  const tokensToUpdate = [];

  const tokenPublishesPromises = [];

  for (const token of tokenIds) {
    const publishedItem = AbstractionChainService.getPublishedItem(collectionId, token.id);
    tokenPublishesPromises.push(publishedItem);
  }

  const publishedIds = new Set((await Promise.all(tokenPublishesPromises)).filter(item => item !== null).map(item => item.id));

  for (const token of tokenIds) {
    if (publishedIds.has(token.id)) {
      tokensToUpdate.push(token);
    } else {
      tokensToCreate.push(token);
    }
  }

  if (tokensToCreate.length > 0) {
    await AbstractionChainService.createItems(collectionId, tokensToCreate.map(t => ({ id: t.id, data: formatData(t.data, modules) })));
  }

  for (const token of tokensToUpdate) {
    await AbstractionChainService.updateItem(collectionId, token.id, formatData(token.data, modules));
  }
}