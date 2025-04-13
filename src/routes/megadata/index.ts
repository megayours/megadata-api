import { OpenAPIHono, z } from '@hono/zod-openapi';
import type { StatusCode } from 'hono/utils/http-status';
import { MegadataService } from '../../services/megadata.service';
import { AccountService } from '../../services/account.service';
import { getModules } from '../../services/module';
import { ModuleValidatorService } from '../../services/module-validator';
import type { Module } from '../../services/module-validator/types';
import {
  getCollectionsRoute,
  createCollectionRoute,
  getCollectionRoute,
  publishCollectionRoute,
  createExternalCollectionRoute,
  getCollectionTokensRoute,
  createTokenRoute,
  getTokenRoute,
  updateTokenRoute,
  deleteTokenRoute,
  validateTokenPermissionsRoute
} from './openapi';
import { validateDataAgainstSchema } from '../../utils/schema';
import type { NewMegadataToken } from '../../db';
import { rpcConfig } from '../../config/rpc';
import type { CreateExternalCollectionRequest } from './types';
import { RpcService } from '../../services/rpc.service';
import { syncExternalCollection } from '../../workers/external_collection_worker';
import { SPECIAL_MODULES } from '../../utils/constants';

const app = new OpenAPIHono();
const validatorService = new ModuleValidatorService();

// Route Handlers
app.openapi({ ...getCollectionsRoute, method: 'get', path: '/collections' }, async (c) => {
  const walletAddress = c.get('walletAddress');
  if (!walletAddress) {
    c.status(401 as StatusCode);
    return c.json({ error: "Unauthorized" }) as any;
  }

  const type = c.req.query('type');

  const result = await MegadataService.getAllCollections({ accountId: type ? undefined : walletAddress, type });

  if (result.isErr()) {
    c.status(result.error.status as StatusCode);
    return c.json({ error: result.error.context }) as any;
  }

  return c.json(result.value);
});

app.openapi({ ...createCollectionRoute, method: 'post', path: '/collections' }, async (c) => {
  const walletAddress = c.get('walletAddress');
  if (!walletAddress) {
    c.status(401 as StatusCode);
    return c.json({ error: "Unauthorized" }) as any;
  }

  const body = await c.req.json();
  const { name } = body;

  const accountResult = await AccountService.ensureAccount(walletAddress);
  if (accountResult.isErr()) {
    c.status(accountResult.error.status as StatusCode);
    return c.json({ error: accountResult.error.context }) as any;
  }

  const collectionResult = await MegadataService.createCollection({ name, account_id: walletAddress });
  if (collectionResult.isErr()) {
    c.status(collectionResult.error.status as StatusCode);
    return c.json({ error: collectionResult.error.context }) as any;
  }

  c.status(201 as StatusCode);
  return c.json(collectionResult.value);
});

app.openapi({ ...getCollectionRoute, method: 'get', path: '/collections/{collection_id}' }, async (c) => {
  const walletAddress = c.get('walletAddress');
  if (!walletAddress) {
    c.status(401 as StatusCode);
    return c.json({ error: "Unauthorized" }) as any;
  }

  const id = Number(c.req.param('collection_id'));
  const result = await MegadataService.getCollectionById(id);

  if (result.isErr()) {
    c.status(result.error.status as StatusCode);
    return c.json({ error: result.error.context }) as any;
  }

  const collection = result.value;
  if (!collection) {
    c.status(404 as StatusCode);
    return c.json({ error: "Collection not found" }) as any;
  }

  // Verify the collection belongs to the authenticated user
  if (collection.account_id !== walletAddress) {
    c.status(403 as StatusCode);
    return c.json({ error: "Forbidden" }) as any;
  }

  return c.json(collection);
});

app.openapi({ ...publishCollectionRoute, method: 'put', path: '/collections/{collection_id}/publish' }, async (c) => {
  const walletAddress = c.get('walletAddress');
  if (!walletAddress) {
    c.status(401 as StatusCode);
    return c.json({ error: "Unauthorized" }) as any;
  }

  const id = Number(c.req.param('collection_id'));
  const { token_ids, all } = await c.req.json();

  // Verify the collection belongs to the authenticated user
  const collectionResult = await MegadataService.getCollectionById(id);
  if (collectionResult.isErr()) {
    c.status(collectionResult.error.status as StatusCode);
    return c.json({ error: collectionResult.error.context }) as any;
  }

  const collection = collectionResult.value;
  if (!collection) {
    c.status(404 as StatusCode);
    return c.json({ error: "Collection not found" }) as any;
  }

  if (collection.account_id !== walletAddress) {
    c.status(403 as StatusCode);
    return c.json({ error: "Forbidden" }) as any;
  }

  const result = await MegadataService.publishCollection(walletAddress, id, token_ids, all);
  if (result.isErr()) {
    console.log(`Error publishing collection`, result.error);
    c.status(result.error.status as StatusCode);
    return c.json({ error: result.error.context }, 500) as any;
  }

  return c.json({ success: true });
});

app.openapi({ ...getCollectionTokensRoute, method: 'get', path: '/collections/{collection_id}/tokens' }, async (c) => {
  console.log(`GET /collections/${c.req.param('collection_id')}/tokens`);
  const walletAddress = c.get('walletAddress');
  if (!walletAddress) {
    c.status(401 as StatusCode);
    return c.json({ error: "Unauthorized" }) as any;
  }

  const collectionId = c.req.param('collection_id');
  if (!collectionId) {
    c.status(400 as StatusCode);
    return c.json({ error: "Collection ID is required" }) as any;
  }

  const id = Number(collectionId);
  const page = Number(c.req.query('page') || 1);
  const limit = Number(c.req.query('limit') || 20);

  if (page < 1 || limit < 1 || limit > 100) {
    c.status(400 as StatusCode);
    return c.json({ error: "Invalid pagination parameters" }) as any;
  }

  // Verify the collection belongs to the authenticated user
  const collectionResult = await MegadataService.getCollectionById(id);
  if (collectionResult.isErr()) {
    c.status(collectionResult.error.status as StatusCode);
    return c.json({ error: collectionResult.error.context }) as any;
  }

  console.log(`Collection Resullt`, collectionResult.value);

  const collection = collectionResult.value;
  if (!collection) {
    c.status(404 as StatusCode);
    return c.json({ error: "Collection not found" }) as any;
  }

  if (collection.account_id !== walletAddress) {
    c.status(403 as StatusCode);
    return c.json({ error: "Forbidden" }) as any;
  }

  const result = await MegadataService.getCollectionTokens(id, page, limit);
  if (result.isErr()) {
    c.status(result.error.status as StatusCode);
    return c.json({ error: result.error.context }) as any;
  }

  return c.json(result.value);
});

app.openapi({ ...getTokenRoute, method: 'get', path: '/collections/{collection_id}/tokens/{token_id}' }, async (c) => {
  const walletAddress = c.get('walletAddress');
  if (!walletAddress) {
    c.status(401 as StatusCode);
    return c.json({ error: "Unauthorized" }) as any;
  }

  const collectionId = Number(c.req.param('collection_id')!);
  const tokenId = c.req.param('token_id')!;

  // Verify the collection belongs to the authenticated user
  const collectionResult = await MegadataService.getCollectionById(collectionId);
  if (collectionResult.isErr()) {
    c.status(collectionResult.error.status as StatusCode);
    return c.json({ error: collectionResult.error.context }) as any;
  }

  const collection = collectionResult.value;
  if (!collection) {
    c.status(404 as StatusCode);
    return c.json({ error: "Collection not found" }) as any;
  }

  if (collection.account_id !== walletAddress) {
    c.status(403 as StatusCode);
    return c.json({ error: "Forbidden" }) as any;
  }

  const result = await MegadataService.getTokenById(collectionId, tokenId);
  if (result.isErr()) {
    c.status(result.error.status as StatusCode);
    return c.json({ error: result.error.context }) as any;
  }

  const token = result.value;
  if (!token) {
    c.status(404 as StatusCode);
    return c.json({ error: "Token not found" }) as any;
  }

  return c.json(token);
});

app.openapi({ ...createTokenRoute, method: 'post', path: '/collections/{collection_id}/tokens' }, async (c) => {
  console.log(`POST /collections/${c.req.param('collection_id')}/tokens`);
  const walletAddress = c.get('walletAddress');
  if (!walletAddress) {
    c.status(401 as StatusCode);
    return c.json({ error: "Unauthorized" }) as any;
  }

  const id = Number(c.req.param('collection_id'));
  const tokens: NewMegadataToken[] = await c.req.json();

  // Verify the collection belongs to the authenticated user
  const collectionResult = await MegadataService.getCollectionById(id);
  if (collectionResult.isErr()) {
    c.status(collectionResult.error.status as StatusCode);
    return c.json({ error: collectionResult.error.context }) as any;
  }

  console.log(collectionResult.value);

  const collection = collectionResult.value;
  if (!collection) {
    c.status(404 as StatusCode);
    return c.json({ error: "Collection not found" }) as any;
  }

  // **** Add check for external collection ****
  if (collection.type === 'external') {
    c.status(405 as StatusCode); // Method Not Allowed
    return c.json({ error: "Tokens cannot be manually added to an external collection." }) as any;
  }

  // Validate each token's data against all modules
  for (const token of tokens) {
    if (token.modules?.includes(SPECIAL_MODULES.EXTENDING_COLLECTION)) {
      console.log(`Token ${token.id} has ${SPECIAL_MODULES.EXTENDING_COLLECTION} module`);
      c.status(403);
      return c.json({ error: "Forbidden" }) as any;
    }

    if (token.modules?.includes(SPECIAL_MODULES.EXTENDING_METADATA)) {
      console.log(`Token ${token.id} has ${SPECIAL_MODULES.EXTENDING_METADATA} module`);
      c.status(403);
      return c.json({ error: "Forbidden" }) as any;
    }

    const modules = await getModules(token.modules);
    if (modules.isErr()) {
      console.error(modules.error);
      c.status(400 as StatusCode);
      return c.json({ error: modules.error.message }) as any;
    }

    const validationResult = await validateDataAgainstSchema(token.data, modules.value.map(m => m.schema));
    if (validationResult.isErr()) {
      c.status(400 as StatusCode);
      return c.json({ error: `Token ${token.id}: ${validationResult.error.message}` }) as any;
    } else if (!validationResult.value) {
      c.status(400 as StatusCode);
      return c.json({ error: `Token ${token.id}: Invalid data` }) as any;
    }

    // Validate modules
    const moduleValidationResult = await validatorService.validate(
      modules.value.map(m => ({ type: m.id as Module['type'], config: m.schema as Module['config'] })),
      token.id,
      token.data as Record<string, unknown>,
      walletAddress
    );

    if (moduleValidationResult.isErr()) {
      c.status(400 as StatusCode);
      return c.json({ error: `Token ${token.id}: ${moduleValidationResult.error.message}` }) as any;
    }

    if (!moduleValidationResult.value.isValid) {
      console.error(`Token ${token.id} validation failed`, moduleValidationResult.value);
      c.status(403 as StatusCode);
      return c.json({ error: `Token ${token.id}: ${moduleValidationResult.value.error}` }) as any;
    }

    token.data = validationResult.value;
    console.log(`Token ${token.id} data`, token.data);
  }

  const tokenResult = await MegadataService.createTokens(id, tokens);
  if (tokenResult.isErr()) {
    console.error(`Error creating tokens`, tokenResult.error);
    c.status(tokenResult.error.status as StatusCode);
    return c.json({ error: tokenResult.error.context }) as any;
  }

  console.log(`Returning success`)

  c.status(201 as StatusCode);
  return c.json(tokenResult.value);
});

app.openapi({ ...updateTokenRoute, method: 'put', path: '/collections/{collection_id}/tokens/{token_id}' }, async (c) => {
  const walletAddress = c.get('walletAddress');
  if (!walletAddress) {
    c.status(401 as StatusCode);
    return c.json({ error: "Unauthorized" });
  }

  const collectionId = Number(c.req.param('collection_id')!);
  console.log(`PUT /collections/${collectionId}/tokens/${c.req.param('token_id')}`);
  const tokenId = c.req.param('token_id')!;
  const { data, modules }: { data: unknown, modules: string[] } = await c.req.json();

  // Verify the collection belongs to the authenticated user
  const collectionResult = await MegadataService.getCollectionById(collectionId);
  if (collectionResult.isErr()) {
    c.status(collectionResult.error.status as StatusCode);
    return c.json({ error: collectionResult.error.context }) as any;
  }

  const collection = collectionResult.value;
  if (!collection) {
    c.status(404 as StatusCode);
    return c.json({ error: "Collection not found" }) as any;
  }

  // **** Add check for external collection ****
  if (collection.type === 'external') {
    c.status(405 as StatusCode); // Method Not Allowed
    return c.json({ error: "Tokens in an external collection cannot be manually updated." }) as any;
  }

  // Original check for owner (already present, keep it)
  if (collection.account_id !== walletAddress) {
    c.status(403 as StatusCode);
    return c.json({ error: "Forbidden" }) as any;
  }

  // Get collection modules and validate data against each
  const modulesResult = await getModules(modules);
  if (modulesResult.isErr()) {
    console.error(modulesResult.error);
    c.status(400 as StatusCode);
    return c.json({ error: modulesResult.error.message }) as any;
  }

  const validationResult = await validateDataAgainstSchema(data, modulesResult.value.map(m => m.schema));
  if (validationResult.isErr()) {
    c.status(400 as StatusCode);
    return c.json({ error: validationResult.error.message }) as any;
  } else if (!validationResult.value) {
    c.status(400 as StatusCode);
    return c.json({ error: "Invalid data" }) as any;
  }

  // Validate modules
  const moduleValidationResult = await validatorService.validate(
    modulesResult.value.map(m => ({ type: m.id as Module['type'], config: m.schema as Module['config'] })),
    tokenId,
    data as Record<string, unknown>,
    walletAddress
  );

  if (moduleValidationResult.isErr()) {
    c.status(400 as StatusCode);
    return c.json({ error: moduleValidationResult.error.message }) as any;
  }

  if (!moduleValidationResult.value.isValid) {
    c.status(403 as StatusCode);
    return c.json({ error: moduleValidationResult.value.error }) as any;
  }

  const result = await MegadataService.updateToken(collectionId, tokenId, validationResult.value, modules);
  if (result.isErr()) {
    c.status(result.error.status as StatusCode);
    return c.json({ error: result.error.context }) as any;
  }

  const token = result.value;
  if (!token) {
    c.status(404 as StatusCode);
    return c.json({ error: "Token not found" }) as any;
  }

  return c.json(token);
});

app.openapi(validateTokenPermissionsRoute, async (c) => {
  console.log(`POST /collections/${c.req.param('collection_id')}/tokens/${c.req.param('token_id')}/validate`);
  const walletAddress = c.get('walletAddress');
  if (!walletAddress) {
    c.status(401 as StatusCode);
    return c.json({ error: "Unauthorized" }) as any;
  }

  const collectionId = Number(c.req.param('collection_id')!);
  const tokenId = c.req.param('token_id')!;

  // Get the token to validate
  const tokenResult = await MegadataService.getTokenById(collectionId, tokenId);
  if (tokenResult.isErr()) {
    console.log(`Error getting token`, tokenResult.error);
    c.status(tokenResult.error.status as StatusCode);
    return c.json({ error: tokenResult.error.context }) as any;
  }

  const token = tokenResult.value;
  if (!token) {
    c.status(404 as StatusCode);
    console.log(`Token not found`);
    return c.json({ error: "Token not found" }) as any;
  }

  const modules = token.modules;
  if (!modules) {
    c.status(200 as StatusCode);
    console.log(`No modules found`);
    return c.json({ isValid: true });
  }

  const moduleValidationResult = await validatorService.validate(
    modules.map(m => ({
      type: m as Module['type'], config: {
        rpcs: rpcConfig,
        adminList: []
      } as Module['config']
    })),
    tokenId,
    token.data as Record<string, unknown>,
    walletAddress
  );

  if (moduleValidationResult.isErr()) {
    c.status(400 as StatusCode);
    return c.json({ error: moduleValidationResult.error.message }) as any;
  }

  return c.json(moduleValidationResult.value);
});

app.openapi({ ...deleteTokenRoute, method: 'delete', path: '/collections/{collection_id}/tokens/{token_id}' }, async (c) => {
  console.log(`DELETE /collections/${c.req.param('collection_id')}/tokens/${c.req.param('token_id')}`);
  const walletAddress = c.get('walletAddress');
  if (!walletAddress) {
    c.status(401 as StatusCode);
    return c.json({ error: "Unauthorized" }) as any;
  }

  const collectionId = Number(c.req.param('collection_id')!);
  const tokenId = c.req.param('token_id')!;

  // Verify the collection belongs to the authenticated user
  const collectionResult = await MegadataService.getCollectionById(collectionId);
  if (collectionResult.isErr()) {
    c.status(collectionResult.error.status as StatusCode);
    return c.json({ error: collectionResult.error.context }) as any;
  }

  const collection = collectionResult.value;
  if (!collection) {
    c.status(404 as StatusCode);
    return c.json({ error: "Collection not found" }) as any;
  }

  // **** Add check for external collection ****
  if (collection.type === 'external') {
    c.status(405 as StatusCode); // Method Not Allowed
    return c.json({ error: "Tokens in an external collection cannot be manually deleted." }) as any;
  }

  // Original check for owner (already present, keep it)
  if (collection.account_id !== walletAddress) {
    c.status(403 as StatusCode);
    return c.json({ error: "Forbidden" }) as any;
  }

  const result = await MegadataService.deleteToken(collectionId, tokenId);
  if (result.isErr()) {
    c.status(result.error.status as StatusCode);
    return c.json({ error: result.error.context }) as any;
  }

  return c.json({ success: true });
});

// **** Update External Collection Route Handler ****
app.openapi(createExternalCollectionRoute, async (c) => {
  const walletAddress = c.get('walletAddress');
  if (!walletAddress) {
    c.status(401 as StatusCode);
    return c.json({ error: "Unauthorized" }) as any;
  }

  const body: CreateExternalCollectionRequest = await c.req.json();

  // Check if the collection already exists, if so return the existing collection
  const existingCollectionResult = await MegadataService.getExternalCollectionBySourceIdType(body.source, body.id, body.type);
  if (existingCollectionResult.isOk()) {
    c.status(200 as StatusCode);
    return c.json(existingCollectionResult.value) as any;
  }

  // Ensure account exists (keep this)
  const accountResult = await AccountService.ensureAccount(walletAddress);
  if (accountResult.isErr()) {
    c.status(accountResult.error.status as StatusCode);
    return c.json({ error: accountResult.error.context }) as any;
  }

  // Fetch the contract name from RPC
  const nameResult = await RpcService.getContractName(body.source, body.type, body.id);
  if (nameResult.isErr()) {
    // Handle cases where name cannot be fetched (e.g., non-ERC721, RPC error)
    console.error(`Failed to fetch contract name for ${body.source}/${body.id}:`, nameResult.error);
    // Return specific error based on nameResult.error.status or context?
    c.status((nameResult.error.status as StatusCode) || 400);
    return c.json({ error: nameResult.error.context || "Failed to fetch contract name." }) as any;
  }
  const contractName = nameResult.value;

  // Create the external collection in the database using fetched name
  const collectionResult = await MegadataService.createExternalCollection({
    name: contractName, // Use fetched name
    account_id: walletAddress,
    source: body.source,
    external_id: body.id, // Use the correct field name from the request
    type: body.type,
  });

  if (collectionResult.isErr()) {
    // Handle potential unique constraint violation specifically
    if (collectionResult.error.context?.includes('unique constraint')) {
      c.status(409 as StatusCode); // Conflict
      return c.json({ error: "External collection with this source, id, and type already exists." }) as any;
    }
    console.error("Error creating external collection:", collectionResult.error);
    c.status(collectionResult.error.status as StatusCode);
    return c.json({ error: collectionResult.error.context }) as any;
  }

  const newCollection = collectionResult.value;

  // Publish the collection immediately
  const publishResult = await MegadataService.publishCollection(walletAddress, newCollection.id, [], false);
  if (publishResult.isErr()) {
    console.error("Error publishing collection:", publishResult.error);
    c.status(publishResult.error.status as StatusCode);
    return c.json({ error: publishResult.error.context }) as any;
  }

  // Construct the object expected by syncExternalCollection
  const workerArg = {
    // ExternalCollection part
    collection_id: newCollection.id,
    id: newCollection.external_details.id,
    source: newCollection.external_details.source,
    type: newCollection.external_details.type,
    last_checked: newCollection.external_details.last_checked,
    created_at: newCollection.created_at, // Assuming externalCollection creation time matches
    updated_at: newCollection.updated_at, // Assuming externalCollection update time matches
    // MegadataCollection part
    megadata: {
      id: newCollection.id,
      name: newCollection.name,
      account_id: newCollection.account_id,
      type: newCollection.type,
      is_published: newCollection.is_published,
      created_at: newCollection.created_at,
      updated_at: newCollection.updated_at,
    }
  };

  // Trigger worker to sync the collection
  // Use the correctly structured argument
  syncExternalCollection(workerArg);

  c.status(201 as StatusCode);
  return c.json(newCollection as any);
});

export { app as megadataRoutes };
