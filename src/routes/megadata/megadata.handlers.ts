import { AccountService } from "@/services/account.service";
import * as HTTP_STATUS_CODES from "@/lib/http-status-codes";
import { getWalletAddress } from "@/lib/context-fetcher";
import { unauthorized } from "@/lib/responses";
import { and, eq, getTableColumns, sql } from "drizzle-orm";
import { externalCollection, megadataCollection, megadataToken, tokenModule } from "@/db/schema";
import { db, type ExternalCollection, type MegadataCollection } from "@/db";
import type { AppRouteHandler } from "@/lib/types";
import {
  ErrorResponseSchema,
  MegadataTokenResponseSchema
} from "./types";
import { SuccessResponseSchema } from "@/lib/schemas";
import type {
  GetCollectionTokens,
  GetToken,
  CreateToken,
  UpdateToken,
  DeleteToken,
  ValidateTokenPermissions
} from "./route-types";
import type {
  GetCollections,
  CreateCollection,
  GetCollection,
  PublishCollection,
  CreateExternalCollection
} from "./megadata.routes";
import { ApiError } from "@/utils/errors";
import { MegadataService } from "@/services/megadata.service";
import { getModules } from "@/services/module";
import { ModuleValidatorService } from "@/services/module-validator";
import type { Module } from "@/services/module-validator/types";
import { validateDataAgainstSchema } from "@/utils/schema";
import { SPECIAL_MODULES } from "@/utils/constants";
import { rpcConfig } from "@/config/rpc";
import { RpcService } from "@/services/rpc.service";
import { syncExternalCollection } from "@/workers/external_collection_worker";

const validatorService = new ModuleValidatorService();

export const getCollections: AppRouteHandler<GetCollections> = async (c) => {
  const accountId = getWalletAddress(c);
  if (!accountId) {
    return unauthorized(c);
  }

  const type = c.req.query('type');

  const collections = await db.select()
    .from(megadataCollection)
    .where(and(
      accountId ? eq(megadataCollection.account_id, accountId) : undefined,
      type ? eq(megadataCollection.type, type) : undefined
    ));

  return c.json(collections, HTTP_STATUS_CODES.OK);
};

export const getCollection: AppRouteHandler<GetCollection> = async (c) => {
  const walletAddress = getWalletAddress(c);
  if (!walletAddress) {
    return unauthorized(c);
  }

  const { collection_id } = c.req.valid('param');

  const collection = await db.select()
    .from(megadataCollection)
    .where(eq(megadataCollection.id, collection_id))
    .limit(1)
    .then(result => result[0] || null);

  if (!collection) {
    return c.json({ error: "Collection not found" }, HTTP_STATUS_CODES.NOT_FOUND);
  }

  return c.json(collection, HTTP_STATUS_CODES.OK);
};

export const createCollection: AppRouteHandler<CreateCollection> = async (c) => {
  const accountId = getWalletAddress(c);
  if (!accountId) {
    return unauthorized(c);
  }

  const body = c.req.valid('json');
  const { name } = body;

  const account = await AccountService.ensureAccount(accountId);

  const collection = await db.insert(megadataCollection)
    .values({ name, account_id: account.id })
    .returning()
    .then(result => {
      const record = result[0];
      if (!record) throw new ApiError("Failed to create collection", HTTP_STATUS_CODES.INTERNAL_SERVER_ERROR);
      return record;
    });

  return c.json(collection, HTTP_STATUS_CODES.CREATED);
}

export const createExternalCollection: AppRouteHandler<CreateExternalCollection> = async (c) => {
  const accountId = getWalletAddress(c);
  if (!accountId) {
    return unauthorized(c);
  }

  const body = c.req.valid('json');
  const { source, id, type } = body;

  const existingExternalCollection = await db.select()
    .from(externalCollection)
    .leftJoin(megadataCollection, eq(externalCollection.collection_id, megadataCollection.id))
    .where(and(
      eq(externalCollection.source, source),
      eq(externalCollection.id, id)
    ))
    .limit(1)
    .then(result => result[0]?.megadata_collection || null);

  if (existingExternalCollection) {
    return c.json(existingExternalCollection, HTTP_STATUS_CODES.OK);
  }

  // Fetch the contract name from RPC
  const nameResult = await RpcService.getContractName(body.source, body.type, body.id);
  if (nameResult.isErr()) {
    // Handle cases where name cannot be fetched (e.g., non-ERC721, RPC error)
    console.error(`Failed to fetch contract name for ${body.source}/${body.id}:`, nameResult.error);
    // Return specific error based on nameResult.error.status or context?
    c.status((nameResult.error.status) || 400);
    return c.json({ error: nameResult.error.context || "Failed to fetch contract name." }) as any;
  }
  const contractName = nameResult.value;

  const account = await AccountService.ensureAccount(accountId);

  const collection = await db.insert(megadataCollection)
    .values({ name: contractName, account_id: account.id, type })
    .returning()
    .then(result => {
      const record = result[0];
      if (!record) throw new ApiError("Failed to create collection", HTTP_STATUS_CODES.INTERNAL_SERVER_ERROR);
      return record;
    });

  await db.insert(externalCollection)
    .values({ collection_id: collection.id, source, id, type })
    .returning()
    .then(result => {
      const record = result[0];
      if (!record) throw new ApiError("Failed to create external collection details", HTTP_STATUS_CODES.INTERNAL_SERVER_ERROR);
      return record;
    });

  // Publish the collection immediately
  const publishResult = await MegadataService.publishCollection(collection, [], false);
  if (!publishResult) {
    return c.json({ error: "Failed to publish collection" }, HTTP_STATUS_CODES.INTERNAL_SERVER_ERROR);
  }

  // Construct the object expected by syncExternalCollection
  const workerArg = {
    // ExternalCollection part
    collection_id: collection.id,
    id: id,
    source: source,
    type: type,
    last_checked: Date.now(), // Assuming externalCollection creation time matches
    created_at: Date.now(), // Assuming externalCollection update time matches
    // MegadataCollection part
    megadata: {
      id: collection.id,
      name: collection.name,
      account_id: collection.account_id,
      type: collection.type,
      is_published: collection.is_published,
      created_at: collection.created_at,
      updated_at: collection.updated_at,
    }
  } as ExternalCollection & {
    megadata: MegadataCollection;
  };

  // Trigger worker to sync the collection
  // Use the correctly structured argument
  syncExternalCollection(workerArg);

  return c.json(collection, HTTP_STATUS_CODES.CREATED);
}

export const publishCollection: AppRouteHandler<PublishCollection> = async (c) => {
  const accountId = getWalletAddress(c);
  if (!accountId) {
    return unauthorized(c);
  }

  const { collection_id } = c.req.valid('param');
  const { token_ids, all } = c.req.valid('json');

  const collection = await db.select()
    .from(megadataCollection)
    .where(and(
      eq(megadataCollection.id, collection_id),
      eq(megadataCollection.account_id, accountId)
    ))
    .limit(1)
    .then(result => result[0] || null);

  if (!collection) {
    return c.json({ error: "Collection not found" }, HTTP_STATUS_CODES.NOT_FOUND);
  }

  const result = await MegadataService.publishCollection(collection, token_ids, all);
  return c.json({ success: result }, HTTP_STATUS_CODES.OK);
}

export const getCollectionTokens: AppRouteHandler<GetCollectionTokens> = async (c) => {
  const walletAddress = getWalletAddress(c);
  if (!walletAddress) {
    return unauthorized(c);
  }

  const { collection_id } = c.req.valid('param');
  const { page, limit } = c.req.valid('query');

  c.var.logger.info({ page, limit }, "Getting collection tokens");

  // Validate page and limit
  if (page <= 0) {
    return c.json({ error: "Page must be greater than 0" }, HTTP_STATUS_CODES.BAD_REQUEST);
  }
  if (limit <= 0) {
    return c.json({ error: "Limit must be greater than 0" }, HTTP_STATUS_CODES.BAD_REQUEST);
  }

  const collection = await db
    .select()
    .from(megadataCollection)
    .where(and(
      eq(megadataCollection.id, Number(collection_id)),
      eq(megadataCollection.account_id, walletAddress)
    ))
    .limit(1)
    .then(result => result[0] || null);

  if (!collection) {
    return c.json({ error: "Collection not found" }, HTTP_STATUS_CODES.NOT_FOUND);
  }

  const result = await Promise.all([
    // Get total count
    db.select({ count: sql<number>`count(*)::int` })
      .from(megadataToken)
      .where(eq(megadataToken.collection_id, collection_id))
      .then(result => result[0]?.count ?? 0),

    // Get paginated data with modules
    db.select({
      token: megadataToken,
      modules: sql<string[]>`array_agg(${tokenModule.module_id})`
    })
      .from(megadataToken)
      .leftJoin(tokenModule, eq(megadataToken.row_id, tokenModule.token_row_id))
      .where(eq(megadataToken.collection_id, collection_id))
      .groupBy(megadataToken.id, megadataToken.row_id)
      .limit(limit)
      .offset((page - 1) * limit)
      .orderBy(megadataToken.row_id)
      .then(results => results.map(({ token, modules }) => ({
        ...token,
        modules: modules.filter(Boolean) // Remove null values from the array
      })))
  ]).then(([total, tokens]) => ({
    tokens,
    total,
    page,
    limit
  }));

  return c.json(result, HTTP_STATUS_CODES.OK);
};

export const getToken: AppRouteHandler<GetToken> = async (c) => {
  const walletAddress = getWalletAddress(c);
  if (!walletAddress) {
    return unauthorized(c);
  }

  const { collection_id, token_id } = c.req.valid('param');

  const collection = await db.query.megadataCollection.findFirst({
    where: eq(megadataCollection.id, Number(collection_id))
  });

  if (!collection) {
    return c.json({ error: "Collection not found" }, HTTP_STATUS_CODES.NOT_FOUND);
  }

  const token = await db.select({
    ...getTableColumns(megadataToken),
    modules: sql<string[] | null>`array_agg(${tokenModule.module_id})`.as('modules')
  })
    .from(megadataToken)
    .leftJoin(tokenModule, eq(megadataToken.row_id, tokenModule.token_row_id))
    .where(and(
      eq(megadataToken.id, token_id),
      eq(megadataToken.collection_id, Number(collection_id))
    ))
    .groupBy(megadataToken.row_id)
    .limit(1)
    .then(result => {
      const record = result[0];
      if (!record) return null;
      return { ...record, modules: record.modules ?? [] };
    });

  return c.json(token, HTTP_STATUS_CODES.OK);
};

export const createToken: AppRouteHandler<CreateToken> = async (c) => {
  const walletAddress = getWalletAddress(c);
  if (!walletAddress) {
    return unauthorized(c);
  }

  const { collection_id } = c.req.valid('param');
  const tokens = c.req.valid('json');

  const collection = await db.select()
    .from(megadataCollection)
    .where(eq(megadataCollection.id, collection_id))
    .limit(1)
    .then(result => result[0] || null);

  if (!collection) {
    return c.json(ErrorResponseSchema.parse({ error: "Collection not found" }), HTTP_STATUS_CODES.NOT_FOUND);
  }

  if (collection.type === 'external') {
    return c.json(ErrorResponseSchema.parse({ error: "Tokens cannot be manually added to an external collection." }), HTTP_STATUS_CODES.METHOD_NOT_ALLOWED);
  }

  if (collection.account_id !== walletAddress) {
    return c.json(ErrorResponseSchema.parse({ error: "Forbidden" }), HTTP_STATUS_CODES.FORBIDDEN);
  }

  // Validate each token's data against all modules
  for (const token of tokens) {
    if (token.modules?.includes(SPECIAL_MODULES.EXTENDING_COLLECTION)) {
      return c.json(ErrorResponseSchema.parse({ error: "Forbidden" }), HTTP_STATUS_CODES.FORBIDDEN);
    }

    if (token.modules?.includes(SPECIAL_MODULES.EXTENDING_METADATA)) {
      return c.json(ErrorResponseSchema.parse({ error: "Forbidden" }), HTTP_STATUS_CODES.FORBIDDEN);
    }

    const modules = await getModules(token.modules);
    if (modules.isErr()) {
      return c.json(ErrorResponseSchema.parse({ error: modules.error.message }), HTTP_STATUS_CODES.BAD_REQUEST);
    }

    const validationResult = await validateDataAgainstSchema(token.data, modules.value.map(m => m.schema));
    if (validationResult.isErr()) {
      return c.json(ErrorResponseSchema.parse({ error: `Token ${token.id}: ${validationResult.error.message}` }), HTTP_STATUS_CODES.BAD_REQUEST);
    } else if (!validationResult.value) {
      return c.json(ErrorResponseSchema.parse({ error: `Token ${token.id}: Invalid data` }), HTTP_STATUS_CODES.BAD_REQUEST);
    }

    // Validate modules
    const moduleValidationResult = await validatorService.validate(
      modules.value.map(m => ({ type: m.id as Module['type'], config: m.schema as Module['config'] })),
      token.id,
      token.data as Record<string, unknown>,
      walletAddress
    );

    if (moduleValidationResult.isErr()) {
      return c.json(ErrorResponseSchema.parse({ error: `Token ${token.id}: ${moduleValidationResult.error.message}` }), HTTP_STATUS_CODES.BAD_REQUEST);
    }

    if (!moduleValidationResult.value.isValid) {
      return c.json(ErrorResponseSchema.parse({ error: `Token ${token.id}: ${moduleValidationResult.value.error}` }), HTTP_STATUS_CODES.FORBIDDEN);
    }

    token.data = validationResult.value;
  }

  const result = await MegadataService.createTokens(collection_id, tokens.map(t => ({
    ...t,
    collection_id
  })));
  if (result.isErr()) {
    return c.json(ErrorResponseSchema.parse({ error: result.error.message }), HTTP_STATUS_CODES.BAD_REQUEST);
  }

  return c.json(result.value.map(token => MegadataTokenResponseSchema.parse(token)), HTTP_STATUS_CODES.CREATED);
};

export const updateToken: AppRouteHandler<UpdateToken> = async (c) => {
  const walletAddress = getWalletAddress(c);
  if (!walletAddress) {
    return unauthorized(c);
  }

  const { collection_id, token_id } = c.req.valid('param');
  const { data, modules } = c.req.valid('json');

  const collection = await db.select()
    .from(megadataCollection)
    .where(eq(megadataCollection.id, collection_id))
    .limit(1)
    .then(result => result[0] || null);

  if (!collection) {
    return c.json(ErrorResponseSchema.parse({ error: "Collection not found" }), HTTP_STATUS_CODES.NOT_FOUND);
  }

  if (collection.type === 'external') {
    return c.json(ErrorResponseSchema.parse({ error: "Tokens in an external collection cannot be manually updated." }), HTTP_STATUS_CODES.METHOD_NOT_ALLOWED);
  }

  if (collection.account_id !== walletAddress) {
    return c.json(ErrorResponseSchema.parse({ error: "Forbidden" }), HTTP_STATUS_CODES.FORBIDDEN);
  }

  const modulesResult = await getModules(modules);
  if (modulesResult.isErr()) {
    return c.json(ErrorResponseSchema.parse({ error: modulesResult.error.message }), HTTP_STATUS_CODES.BAD_REQUEST);
  }

  const validationResult = await validateDataAgainstSchema(data, modulesResult.value.map(m => m.schema));
  if (validationResult.isErr()) {
    return c.json(ErrorResponseSchema.parse({ error: validationResult.error.message }), HTTP_STATUS_CODES.BAD_REQUEST);
  } else if (!validationResult.value) {
    return c.json(ErrorResponseSchema.parse({ error: "Invalid data" }), HTTP_STATUS_CODES.BAD_REQUEST);
  }

  const moduleValidationResult = await validatorService.validate(
    modulesResult.value.map(m => ({ type: m.id as Module['type'], config: m.schema as Module['config'] })),
    token_id,
    data as Record<string, unknown>,
    walletAddress
  );

  if (moduleValidationResult.isErr()) {
    return c.json(ErrorResponseSchema.parse({ error: moduleValidationResult.error.message }), HTTP_STATUS_CODES.BAD_REQUEST);
  }

  if (!moduleValidationResult.value.isValid) {
    return c.json(ErrorResponseSchema.parse({ error: moduleValidationResult.value.error }), HTTP_STATUS_CODES.FORBIDDEN);
  }

  const result = await MegadataService.updateToken(collection_id, token_id, validationResult.value, modules);
  if (result.isErr()) {
    return c.json(ErrorResponseSchema.parse({ error: result.error.message }), HTTP_STATUS_CODES.NOT_FOUND);
  }

  const token = result.value;
  if (!token) {
    return c.json(ErrorResponseSchema.parse({ error: "Token not found" }), HTTP_STATUS_CODES.NOT_FOUND);
  }

  return c.json(MegadataTokenResponseSchema.parse(token), HTTP_STATUS_CODES.OK);
};

export const deleteToken: AppRouteHandler<DeleteToken> = async (c) => {
  const walletAddress = getWalletAddress(c);
  if (!walletAddress) {
    return unauthorized(c);
  }

  const { collection_id, token_id } = c.req.valid('param');

  const collection = await db.select()
    .from(megadataCollection)
    .where(eq(megadataCollection.id, collection_id))
    .limit(1)
    .then(result => result[0] || null);

  if (!collection) {
    return c.json(ErrorResponseSchema.parse({ error: "Collection not found" }), HTTP_STATUS_CODES.NOT_FOUND);
  }

  if (collection.type === 'external') {
    return c.json(ErrorResponseSchema.parse({ error: "Tokens in an external collection cannot be manually deleted." }), HTTP_STATUS_CODES.METHOD_NOT_ALLOWED);
  }

  if (collection.account_id !== walletAddress) {
    return c.json(ErrorResponseSchema.parse({ error: "Forbidden" }), HTTP_STATUS_CODES.FORBIDDEN);
  }

  const result = await MegadataService.deleteToken(collection_id, token_id);
  if (result.isErr()) {
    return c.json(ErrorResponseSchema.parse({ error: result.error.message }), HTTP_STATUS_CODES.NOT_FOUND);
  }

  return c.json(SuccessResponseSchema.parse({ success: true }), HTTP_STATUS_CODES.OK);
};

export const validateTokenPermissions: AppRouteHandler<ValidateTokenPermissions> = async (c) => {
  const walletAddress = getWalletAddress(c);
  if (!walletAddress) {
    return unauthorized(c);
  }

  const { collection_id, token_id } = c.req.valid('param');

  const tokenResult = await MegadataService.getTokenById(collection_id, token_id);
  if (tokenResult.isErr()) {
    return c.json(ErrorResponseSchema.parse({ error: tokenResult.error.message }), HTTP_STATUS_CODES.NOT_FOUND);
  }

  const token = tokenResult.value;
  if (!token) {
    return c.json(ErrorResponseSchema.parse({ error: "Token not found" }), HTTP_STATUS_CODES.NOT_FOUND);
  }

  const modules = token.modules;
  if (!modules) {
    return c.json({ isValid: true }, HTTP_STATUS_CODES.OK);
  }

  const moduleValidationResult = await validatorService.validate(
    modules.map(m => ({
      type: m as Module['type'],
      config: {
        rpcs: rpcConfig,
        adminList: []
      } as Module['config']
    })),
    token_id,
    token.data as Record<string, unknown>,
    walletAddress
  );

  if (moduleValidationResult.isErr()) {
    return c.json(ErrorResponseSchema.parse({ error: moduleValidationResult.error.message }), HTTP_STATUS_CODES.BAD_REQUEST);
  }

  return c.json(moduleValidationResult.value, HTTP_STATUS_CODES.OK);
};
