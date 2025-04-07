import { OpenAPIHono, z } from '@hono/zod-openapi';
import type { StatusCode } from 'hono/utils/http-status';
import { MegadataService } from '../../services/megadata.service';
import { AccountService } from '../../services/account.service';
import { validateTokenData, getCollectionModules } from '../../services/module';
import {
  getCollectionsRoute,
  createCollectionRoute,
  getCollectionRoute,
  updateCollectionRoute,
  deleteCollectionRoute,
  publishCollectionRoute,
  getCollectionTokensRoute,
  createTokenRoute,
  getTokenRoute,
  updateTokenRoute,
  deleteTokenRoute
} from './openapi';

const app = new OpenAPIHono();

// Route Handlers
app.openapi({ ...getCollectionsRoute, method: 'get', path: '/collections'}, async (c) => {
  const walletAddress = c.get('walletAddress');
  if (!walletAddress) {
    c.status(401 as StatusCode);
    return c.json({ error: "Unauthorized" }) as any;
  }
  
  const result = await MegadataService.getAllCollections(walletAddress);
  
  if (result.isErr()) {
    c.status(result.error.status as StatusCode);
    return c.json({ error: result.error.context }) as any;
  }
  
  return c.json(result.value);
});

app.openapi({ ...createCollectionRoute, method: 'post', path: '/collections'}, async (c) => {
  const walletAddress = c.get('walletAddress');
  if (!walletAddress) {
    c.status(401 as StatusCode);
    return c.json({ error: "Unauthorized" }) as any;
  }

  const body = await c.req.json();
  const { name, modules } = body;

  const accountResult = await AccountService.ensureAccount(walletAddress);
  if (accountResult.isErr()) {
    c.status(accountResult.error.status as StatusCode);
    return c.json({ error: accountResult.error.context }) as any;
  }

  const collectionResult = await MegadataService.createCollection({ name, account_id: walletAddress, modules });
  if (collectionResult.isErr()) {
    c.status(collectionResult.error.status as StatusCode);
    return c.json({ error: collectionResult.error.context }) as any;
  }
  
  c.status(201 as StatusCode);
  return c.json(collectionResult.value);
});

app.openapi({ ...getCollectionRoute, method: 'get', path: '/collections/{collection_id}'}, async (c) => {
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

app.openapi({ ...updateCollectionRoute, method: 'put', path: '/collections/{collection_id}'}, async (c) => {
  const walletAddress = c.get('walletAddress');
  if (!walletAddress) {
    c.status(401 as StatusCode);
    return c.json({ error: "Unauthorized" }) as any;
  }

  const id = Number(c.req.param('collection_id'));
  const { name, modules } = await c.req.json();

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

  const result = await MegadataService.updateCollection(id, name, modules);
  if (result.isErr()) {
    c.status(result.error.status as StatusCode);
    return c.json({ error: result.error.context }) as any;
  }
  
  const updatedCollection = result.value;
  if (!updatedCollection) {
    c.status(404 as StatusCode);
    return c.json({ error: "Collection not found" }) as any;
  }
  
  return c.json(updatedCollection);
});

app.openapi({ ...deleteCollectionRoute, method: 'delete', path: '/collections/{collection_id}'}, async (c) => {
  const walletAddress = c.get('walletAddress');
  if (!walletAddress) {
    c.status(401 as StatusCode);
    return c.json({ error: "Unauthorized" }) as any;
  }

  const id = Number(c.req.param('collection_id'));

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

  const result = await MegadataService.deleteCollection(id);
  if (result.isErr()) {
    c.status(result.error.status as StatusCode);
    return c.json({ error: result.error.context }) as any;
  }
  
  return c.json({ success: true });
});

app.openapi({ ...publishCollectionRoute, method: 'put', path: '/collections/{collection_id}/publish'}, async (c) => {
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

  const result = await MegadataService.publishCollection(id, token_ids, all);
  if (result.isErr()) {
    c.status(result.error.status as StatusCode);
    return c.json({ error: result.error.context }) as any;
  }
  
  return c.json({ success: true });
});

app.openapi({ ...getCollectionTokensRoute, method: 'get', path: '/collections/{collection_id}/tokens'}, async (c) => {
  const walletAddress = c.get('walletAddress');
  if (!walletAddress) {
    c.status(401 as StatusCode);
    return c.json({ error: "Unauthorized" }) as any;
  }

  const id = Number(c.req.param('collection_id'));
  const page = Number(c.req.query('page') || 1);
  const limit = Number(c.req.query('limit') || 20);

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

  const result = await MegadataService.getCollectionTokens(id, page, limit);
  if (result.isErr()) {
    c.status(result.error.status as StatusCode);
    return c.json({ error: result.error.context }) as any;
  }
  
  return c.json(result.value);
});

app.openapi({ ...createTokenRoute, method: 'post', path: '/collections/{collection_id}/tokens'}, async (c) => {
  const walletAddress = c.get('walletAddress');
  if (!walletAddress) {
    c.status(401 as StatusCode);
    return c.json({ error: "Unauthorized" }) as any;
  }

  const id = Number(c.req.param('collection_id'));
  const tokens = await c.req.json();

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

  // Get collection modules and validate data against each
  const modulesResult = await getCollectionModules(id);
  if (modulesResult.isErr()) {
    c.status(400 as StatusCode);
    return c.json({ error: modulesResult.error.message }) as any;
  }

  // Validate each token's data against all modules
  for (const token of tokens) {
    for (const { module } of modulesResult.value) {
      const validationResult = await validateTokenData(token.data, module.id);
      if (validationResult.isErr()) {
        c.status(400 as StatusCode);
        return c.json({ error: `Token ${token.id}: ${validationResult.error.message}` }) as any;
      }
    }
  }

  const tokenResult = await MegadataService.createTokens(id, tokens);
  if (tokenResult.isErr()) {
    c.status(tokenResult.error.status as StatusCode);
    return c.json({ error: tokenResult.error.context }) as any;
  }
  
  c.status(201 as StatusCode);
  return c.json(tokenResult.value);
});

app.openapi({ ...getTokenRoute, method: 'get', path: '/collections/{collection_id}/tokens/{token_id}'}, async (c) => {
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

app.openapi({ ...updateTokenRoute, method: 'put', path: '/collections/{collection_id}/tokens/{token_id}'}, async (c) => {
  const walletAddress = c.get('walletAddress');
  if (!walletAddress) {
    c.status(401 as StatusCode);
    return c.json({ error: "Unauthorized" }) as any;
  }

  const collectionId = Number(c.req.param('collection_id')!);
  const tokenId = c.req.param('token_id')!;
  const { data } = await c.req.json();

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

  // Get collection modules and validate data against each
  const modulesResult = await getCollectionModules(collectionId);
  if (modulesResult.isErr()) {
    c.status(400 as StatusCode);
    return c.json({ error: modulesResult.error.message }) as any;
  }

  for (const { module } of modulesResult.value) {
    const validationResult = await validateTokenData(data, module.id);
    if (validationResult.isErr()) {
      c.status(400 as StatusCode);
      return c.json({ error: validationResult.error.message }) as any;
    }
  }

  const result = await MegadataService.updateToken(collectionId, tokenId, data);
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

app.openapi({ ...deleteTokenRoute, method: 'delete', path: '/collections/{collection_id}/tokens/{token_id}'}, async (c) => {
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
  
  const result = await MegadataService.deleteToken(collectionId, tokenId);
  if (result.isErr()) {
    c.status(result.error.status as StatusCode);
    return c.json({ error: result.error.context }) as any;
  }
  
  return c.json({ success: true });
});

export { app as megadataRoutes };
