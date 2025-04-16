import { db } from "../db";
import { megadataCollection, megadataToken, tokenModule, module, externalCollection } from "../db/schema";
import { handleDatabaseError } from "../db/helpers";
import type { MegadataCollection, NewMegadataCollection, MegadataToken, NewMegadataToken, ExternalCollection } from "../db";
import { ResultAsync } from "neverthrow";
import { AbstractionChainService } from "./abstraction-chain.service";
import { eq, and, inArray, sql, getTableColumns } from "drizzle-orm";
import { nanoid } from "nanoid";
import { formatData } from "../utils/data-formatter";
import { ApiError } from "@/utils/errors";

interface CreateExternalCollectionInput {
  name: string;
  account_id: string;
  source: string;
  external_id: string;
  type: string;
}

export class MegadataService {
  static async getAllCollections({ type, accountId }: { type?: string, accountId?: string }): Promise<ResultAsync<MegadataCollection[], ApiError>> {
    return ResultAsync.fromPromise<MegadataCollection[], ApiError>(
      db.select()
        .from(megadataCollection)
        .where(and(
          accountId ? eq(megadataCollection.account_id, accountId) : undefined,
          type ? eq(megadataCollection.type, type) : undefined
        )),
      (error) => handleDatabaseError(error)
    );
  }

  static async getCollectionById(id: number): Promise<ResultAsync<MegadataCollection | null, ApiError>> {
    return ResultAsync.fromPromise<MegadataCollection | null, ApiError>(
      db.select()
        .from(megadataCollection)
        .where(eq(megadataCollection.id, id))
        .limit(1)
        .then(result => result[0] || null),
      (error) => handleDatabaseError(error)
    );
  }

  static async createCollection(collection: NewMegadataCollection): Promise<ResultAsync<MegadataCollection, ApiError>> {
    return ResultAsync.fromPromise<MegadataCollection, ApiError>(
      db.insert(megadataCollection)
        .values(collection)
        .returning()
        .then(result => {
          const record = result[0];
          if (!record) throw new Error("Failed to create collection");
          return record;
        }),
      (error) => handleDatabaseError(error)
    );
  }

  static async publishCollection(collection: MegadataCollection, tokenIds: string[] = [], all: boolean = false): Promise<boolean> {
    if (!collection.is_published) {
      await AbstractionChainService.createCollection(collection.account_id, collection.id, collection.name);

      await db.update(megadataCollection)
        .set({ is_published: true })
        .where(eq(megadataCollection.id, collection.id))
        .then(() => true);
    }

    const tokens = await db.select({
      ...getTableColumns(megadataToken),
      modules: sql<{ id: string, schema: any }[]>`array_agg(json_build_object('id', ${module.id}, 'schema', ${module.schema}))`.as('modules')
    })
      .from(megadataToken)
      .leftJoin(tokenModule, eq(megadataToken.row_id, tokenModule.token_row_id))
      .leftJoin(module, eq(tokenModule.module_id, module.id))
      .where(and(
        eq(megadataToken.collection_id, collection.id),
        all ? undefined : inArray(megadataToken.id, tokenIds)
      ))
      .groupBy(megadataToken.id, megadataToken.row_id);

    if (tokens.length === 0) return true;

    const toPublish: { id: string, data: Record<string, any> }[] = [];

    for (const token of tokens) {
      const formattedData = formatData(token.data as Record<string, any>, token.modules ?? []);

      toPublish.push({
        id: token.id,
        data: formattedData
      });
    }

    await AbstractionChainService.createItems(collection.id, toPublish);

    return db.update(megadataToken)
      .set({ is_published: true })
      .where(and(
        eq(megadataToken.collection_id, collection.id),
        inArray(megadataToken.id, toPublish.map(token => token.id))
      ))
      .then(() => true);
  }

  static async getCollectionTokens(collectionId: number, page: number = 1, limit: number = 20): Promise<ResultAsync<{ data: MegadataToken[], pagination: { total: number, page: number, limit: number, total_pages: number } }, ApiError>> {
    return ResultAsync.fromPromise(
      Promise.all([
        // Get total count
        db.select({ count: sql<number>`count(*)::int` })
          .from(megadataToken)
          .where(eq(megadataToken.collection_id, collectionId))
          .then(result => result[0]?.count ?? 0),

        // Get paginated data with modules
        db.select({
          token: megadataToken,
          modules: sql<string[]>`array_agg(${tokenModule.module_id})`
        })
          .from(megadataToken)
          .leftJoin(tokenModule, eq(megadataToken.row_id, tokenModule.token_row_id))
          .where(eq(megadataToken.collection_id, collectionId))
          .groupBy(megadataToken.id, megadataToken.row_id)
          .limit(limit)
          .offset((page - 1) * limit)
          .orderBy(megadataToken.row_id)
          .then(results => results.map(({ token, modules }) => ({
            ...token,
            modules: modules.filter(Boolean) // Remove null values from the array
          })))
      ]).then(([total, data]) => {
        const total_pages = Math.ceil(total / limit);
        return {
          data,
          pagination: {
            total,
            page,
            limit,
            total_pages
          }
        };
      }),
      (error) => handleDatabaseError(error)
    );
  }

  static async getTokenById(collectionId: number, tokenId: string): Promise<ResultAsync<MegadataToken | null, ApiError>> {
    return ResultAsync.fromPromise<MegadataToken | null, ApiError>(
      db.select({
        ...getTableColumns(megadataToken),
        modules: sql<string[] | null>`array_agg(${tokenModule.module_id})`.as('modules')
      })
        .from(megadataToken)
        .leftJoin(tokenModule, eq(megadataToken.row_id, tokenModule.token_row_id))
        .where(and(
          eq(megadataToken.id, tokenId),
          eq(megadataToken.collection_id, collectionId)
        ))
        .groupBy(megadataToken.row_id)
        .limit(1)
        .then(result => {
          const record = result[0];
          if (!record) return null;
          return { ...record, modules: record.modules ?? [] };
        }),
      (error) => handleDatabaseError(error)
    );
  }

  static async createTokens(collectionId: number, tokens: NewMegadataToken[]): Promise<ResultAsync<MegadataToken[], ApiError>> {
    return ResultAsync.fromPromise<MegadataToken[], ApiError>(
      db.transaction(async (tx) => {
        // Create the tokens
        const createdTokens = await tx.insert(megadataToken)
          // Map potentially missing collection_id (though it should be present)
          .values(tokens.map(token => ({ ...token, collection_id: collectionId })))
          .returning();

        // Create the token modules and collect them for each token
        const tokensWithModulesResult = await Promise.all(createdTokens.map(async (token) => {
          // Handle potentially missing modules array
          const originalToken = tokens.find(t => t.id === token.id);
          const modulesToInsert = originalToken?.modules;
          if (modulesToInsert?.length) { // Only insert if modules array exists and is not empty
            await tx.insert(tokenModule)
              .values(modulesToInsert.map(moduleId => ({
                id: nanoid(),
                token_row_id: token.row_id,
                module_id: moduleId
              })));
          }
          return {
            ...token,
            modules: modulesToInsert ?? [] // Return empty array if modules were undefined
          };
        }));

        return tokensWithModulesResult;
      }),
      (error) => handleDatabaseError(error)
    );
  }

  static async updateToken(collectionId: number, tokenId: string, data: any, modules?: string[]): Promise<ResultAsync<MegadataToken | null, ApiError>> {
    return ResultAsync.fromPromise<MegadataToken | null, ApiError>(
      db.transaction(async (tx) => {
        // Get the existing token
        const [token] = await tx.select()
          .from(megadataToken)
          .where(and(
            eq(megadataToken.id, tokenId),
            eq(megadataToken.collection_id, collectionId)
          ));

        if (!token) {
          return null;
        }

        // If modules are provided, update the token modules
        if (modules?.length) {
          // Update token modules
          await tx.delete(tokenModule)
            .where(eq(tokenModule.token_row_id, token.row_id));

          await tx.insert(tokenModule)
            .values(modules.map(moduleId => ({
              id: nanoid(),
              token_row_id: token.row_id,
              module_id: moduleId
            })));
        }

        // Update the token data
        const [updatedToken] = await tx.update(megadataToken)
          .set({
            data: data,
            updated_at: Math.floor(Date.now() / 1000)
          })
          .where(and(
            eq(megadataToken.id, tokenId),
            eq(megadataToken.collection_id, collectionId)
          ))
          .returning();

        if (!updatedToken) {
          return null;
        }

        return { ...updatedToken, modules: modules ?? [] };
      }),
      (error) => handleDatabaseError(error)
    );
  }

  static async deleteToken(collectionId: number, tokenId: string): Promise<ResultAsync<MegadataToken | null, ApiError>> {
    return ResultAsync.fromPromise<MegadataToken | null, ApiError>(
      db.delete(megadataToken)
        .where(and(
          eq(megadataToken.id, tokenId),
          eq(megadataToken.collection_id, collectionId),
          eq(megadataToken.is_published, false)
        ))
        .returning()
        .then(result => result[0] ?? null),
      (error) => handleDatabaseError(error)
    );
  }

  static async updateTokenModules(collectionId: number, tokenId: string, modules: string[]): Promise<ResultAsync<boolean, ApiError>> {
    return ResultAsync.fromPromise<boolean, ApiError>(
      db.transaction(async (tx) => {
        const [token] = await tx.select()
          .from(megadataToken)
          .where(and(
            eq(megadataToken.id, tokenId),
            eq(megadataToken.collection_id, collectionId)
          ));

        if (!token) {
          throw new Error("Token not found");
        }

        await tx.delete(tokenModule)
          .where(eq(tokenModule.token_row_id, token.row_id));

        if (modules.length) {
          await tx.insert(tokenModule)
            .values(modules.map(moduleId => ({
              id: nanoid(),
              token_row_id: token.row_id,
              module_id: moduleId
            })));
        }

        return true;
      }),
      (error) => handleDatabaseError(error)
    );
  }

  static async createExternalCollection(input: CreateExternalCollectionInput): Promise<ExternalCollection | null> {
    return db.transaction(async (tx) => {
      // 1. Create the main collection record (using input.name)
      const newCollectionArray = await tx
        .insert(megadataCollection)
        .values({
          name: input.name,
          account_id: input.account_id,
          type: 'external',
          is_published: false,
        })
        .returning();

      const newCollection = newCollectionArray[0];
      if (!newCollection) {
        throw new Error("Failed to create megadata collection record.");
      }

      // 2. Create the external collection details record (using input.external_id)
      const ec = await tx
        .insert(externalCollection)
        .values({
          collection_id: newCollection.id,
          source: input.source,
          id: input.external_id,
          type: input.type,
          last_checked: null,
        })
        .returning()
        .then(result => result[0] ?? null);


      return ec;
    })
  }

  static async getExternalCollectionBySourceIdType(
    source: string,
    id: string,
    type: string
  ): Promise<ExternalCollection | null> {
    const ec = await db.query.externalCollection.findFirst({
      where: and(
        eq(sql`lower(${externalCollection.source})`, source.toLowerCase()),
        eq(sql`lower(${externalCollection.id})`, id.toLowerCase()),
        eq(sql`lower(${externalCollection.type})`, type.toLowerCase())
      )
    });

    return ec ?? null;
  }

  /**
   * Fetch a random set of tokens where the data JSON contains a specified attribute.
   * @param attribute The attribute key to look for in the data JSON
   * @param count The number of random tokens to return
   * @returns ResultAsync<{ collection_id: number, id: string, data: any }[], ApiError>
   */
  static async getRandomTokensByAttribute(attribute: string, count: number): Promise<ResultAsync<{ collection_id: number, id: string, data: any }[], ApiError>> {
    // Use SQL to filter tokens where data ? 'attribute' (Postgres JSONB key existence)
    return ResultAsync.fromPromise(
      db.select({
        collection_id: megadataToken.collection_id,
        id: megadataToken.id,
        data: megadataToken.data
      })
        .from(megadataToken)
        .where(sql`${megadataToken.data} ? ${attribute}`)
        .orderBy(sql`RANDOM()`)
        .limit(count),
      (error) => handleDatabaseError(error)
    );
  }
} 