import { db } from "../db";
import { megadataCollection, megadataToken, collectionModule, module } from "../db/schema";
import { handleDatabaseError } from "../db/helpers";
import type { MegadataCollection, NewMegadataCollection, MegadataToken, NewMegadataToken, Module } from "../db";
import { err, ok, ResultAsync } from "neverthrow";
import { AbstractionChainService } from "./abstraction-chain.service";
import type { Error } from "../types/error";
import { eq, and, inArray, sql, getTableColumns } from "drizzle-orm";
import { nanoid } from "nanoid";
import { formatData } from "../utils/data-formatter";

export class MegadataService {
  static async getAllCollections(accountId: string): Promise<ResultAsync<MegadataCollection[], Error>> {
    return ResultAsync.fromPromise<MegadataCollection[], Error>(
      db.select({
        ...getTableColumns(megadataCollection),
        modules: sql<string[] | null>`array_agg(${collectionModule.module_id})`.as('modules')
      })
        .from(megadataCollection)
        .leftJoin(collectionModule, eq(megadataCollection.id, collectionModule.collection_id))
        .where(eq(megadataCollection.account_id, accountId))
        .groupBy(megadataCollection.id)
        .then(results => results.map(r => ({ ...r, modules: r.modules ?? [] }))),
      (error) => handleDatabaseError(error)
    );
  }

  static async getCollectionById(id: number): Promise<ResultAsync<MegadataCollection | null, Error>> {
    return ResultAsync.fromPromise<MegadataCollection | null, Error>(
      db.select({
        ...getTableColumns(megadataCollection),
        modules: sql<string[] | null>`array_agg(${collectionModule.module_id})`.as('modules')
      })
        .from(megadataCollection)
        .leftJoin(collectionModule, eq(megadataCollection.id, collectionModule.collection_id))
        .where(eq(megadataCollection.id, id))
        .groupBy(megadataCollection.id)
        .limit(1)
        .then(result => {
          const record = result[0];
          if (!record) return null;
          return { ...record, modules: record.modules ?? [] };
        }),
      (error) => handleDatabaseError(error)
    );
  }

  static async createCollection(collection: NewMegadataCollection & { modules?: string[] }): Promise<ResultAsync<MegadataCollection, Error>> {
    return ResultAsync.fromPromise<MegadataCollection, Error>(
      db.transaction(async (tx) => {
        const [record] = await tx.insert(megadataCollection)
          .values(collection)
          .returning();

        if (!record) throw new Error("Failed to create collection");

        if (collection.modules?.length) {
          await tx.insert(collectionModule)
            .values(collection.modules.map(moduleId => ({
              id: nanoid(),
              collection_id: record.id,
              module_id: moduleId
            })));
        }

        return record;
      }),
      (error) => handleDatabaseError(error)
    );
  }

  static async updateCollection(id: number, name: string, modules?: string[]): Promise<ResultAsync<MegadataCollection | null, Error>> {
    return ResultAsync.fromPromise<MegadataCollection | null, Error>(
      db.transaction(async (tx) => {
        const [record] = await tx.update(megadataCollection)
          .set({
            name,
            updated_at: Math.floor(Date.now() / 1000)
          })
          .where(eq(megadataCollection.id, id))
          .returning();

        if (!record) return null;

        if (modules) {
          await tx.delete(collectionModule)
            .where(eq(collectionModule.collection_id, id));

          if (modules.length) {
            await tx.insert(collectionModule)
              .values(modules.map(moduleId => ({
                id: nanoid(),
                collection_id: id,
                module_id: moduleId
              })));
          }
        }

        return record;
      }),
      (error) => handleDatabaseError(error)
    );
  }

  static async deleteCollection(id: number): Promise<ResultAsync<MegadataCollection | null, Error>> {
    return ResultAsync.fromPromise<MegadataCollection | null, Error>(
      db.delete(megadataCollection)
        .where(and(
          eq(megadataCollection.id, id),
          eq(megadataCollection.is_published, false)
        ))
        .returning()
        .then(result => result[0] ?? null),
      (error) => handleDatabaseError(error)
    );
  }

  static async publishCollection(id: number, tokenIds: string[]): Promise<ResultAsync<boolean, Error>> {
    const collectionResult = await this.getCollectionById(id);
    if (collectionResult.isErr()) {
      return err(collectionResult.error);
    }

    const collection = collectionResult.value;
    if (!collection) {
      return err({ context: "Collection not found", status: 404 });
    }

    if (!collection.is_published) {
      const chainResult = await AbstractionChainService.createCollection(collection.account_id, collection.id, collection.name);
      if (chainResult.isErr()) {
        return err({ context: chainResult.error.message, status: 500 });
      }

      const publishCollectionResult = await ResultAsync.fromPromise<boolean, Error>(
        db.update(megadataCollection)
          .set({ is_published: true })
          .where(eq(megadataCollection.id, id))
          .then(() => true),
        (error) => handleDatabaseError(error)
      );

      if (publishCollectionResult.isErr()) {
        return err(publishCollectionResult.error);
      }
    }

    const unPublishedTokens = await ResultAsync.fromPromise<MegadataToken[], Error>(
      db.select()
        .from(megadataToken)
        .where(and(
          eq(megadataToken.collection_id, id),
          eq(megadataToken.is_published, false)
        )),
      (error) => handleDatabaseError(error)
    );

    if (unPublishedTokens.isErr()) {
      return err(unPublishedTokens.error);
    }

    if (unPublishedTokens.value.length === 0) {
      return ok(true);
    }

    const toPublish = unPublishedTokens.value.filter(token => tokenIds.includes(token.id));

    if (toPublish.length === 0) {
        return ok(true);
    }

    const modulesResult = await ResultAsync.fromPromise<Module[], Error>(
      db.select({
        ...getTableColumns(module)
      })
        .from(collectionModule)
        .innerJoin(module, eq(collectionModule.module_id, module.id))
        .where(eq(collectionModule.collection_id, id)),
      (error) => handleDatabaseError(error)
    );

    if (modulesResult.isErr()) {
        return err(modulesResult.error);
    }
    const collectionModules = modulesResult.value;

    const itemsToCreate = toPublish.map(token => ({
        id: token.id,
        data: formatData(token.data as Record<string, any>, collectionModules)
    }));

    const createItemsResult = await AbstractionChainService.createItems(collection.id, itemsToCreate);

    if (createItemsResult.isErr()) {
        return err({ context: createItemsResult.error.message, status: 500 });
    }

    return ResultAsync.fromPromise<boolean, Error>(
      db.update(megadataToken)
        .set({ is_published: true })
        .where(and(
          eq(megadataToken.collection_id, id),
          inArray(megadataToken.id, toPublish.map(token => token.id))
        ))
        .then(() => true),
      (error) => handleDatabaseError(error)
    );
  }

  static async getCollectionTokens(collectionId: number, page: number = 1, limit: number = 20): Promise<ResultAsync<{ data: MegadataToken[], pagination: { total: number, page: number, limit: number, total_pages: number } }, Error>> {
    return ResultAsync.fromPromise(
      Promise.all([
        // Get total count
        db.select({ count: sql<number>`count(*)::int` })
          .from(megadataToken)
          .where(eq(megadataToken.collection_id, collectionId))
          .then(result => result[0]?.count ?? 0),
        
        // Get paginated data
        db.select()
          .from(megadataToken)
          .where(eq(megadataToken.collection_id, collectionId))
          .limit(limit)
          .offset((page - 1) * limit)
          .orderBy(megadataToken.row_id)
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

  static async getTokenById(collectionId: number, tokenId: string): Promise<ResultAsync<MegadataToken | null, Error>> {
    return ResultAsync.fromPromise<MegadataToken | null, Error>(
      db.select()
        .from(megadataToken)
        .where(and(
          eq(megadataToken.id, tokenId),
          eq(megadataToken.collection_id, collectionId)
        ))
        .limit(1)
        .then(result => result[0] ?? null),
      (error) => handleDatabaseError(error)
    );
  }

  static async createTokens(collectionId: number, tokens: NewMegadataToken[]): Promise<ResultAsync<MegadataToken[], Error>> {
    return ResultAsync.fromPromise<MegadataToken[], Error>(
      db.insert(megadataToken)
        .values(tokens.map(token => ({ ...token, collection_id: collectionId })))
        .returning(),
      (error) => handleDatabaseError(error)
    );
  }

  private static async createToken(collectionId: number, token: NewMegadataToken): Promise<ResultAsync<MegadataToken, Error>> {
    return ResultAsync.fromPromise<MegadataToken, Error>(
      db.insert(megadataToken)
        .values({ ...token, collection_id: collectionId })
        .returning()
        .then(result => {
          const record = result[0];
          if (!record) throw new Error("Failed to create token");
          return record;
        }),
      (error) => handleDatabaseError(error)
    );
  }

  static async updateToken(collectionId: number, tokenId: string, data: any): Promise<ResultAsync<MegadataToken | null, Error>> {
    return ResultAsync.fromPromise<MegadataToken | null, Error>(
      db.update(megadataToken)
        .set({
          data,
          updated_at: Math.floor(Date.now() / 1000)
        })
        .where(and(
          eq(megadataToken.id, tokenId),
          eq(megadataToken.collection_id, collectionId)
        ))
        .returning()
        .then(result => result[0] ?? null),
      (error) => handleDatabaseError(error)
    );
  }

  static async deleteToken(collectionId: number, tokenId: string): Promise<ResultAsync<MegadataToken | null, Error>> {
    return ResultAsync.fromPromise<MegadataToken | null, Error>(
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
} 