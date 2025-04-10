import { expect, test, describe, beforeEach, mock } from "bun:test";
import "../setup";
import { randomUUID } from "crypto";
import { isErrorResponse } from "../helpers";
import { generateRandomAccount } from "../helpers";
import type { MegadataCollectionResponse, MegadataTokenResponse } from "../../routes/megadata/types";
import { createApp } from "../../index";
import { TEST_BYPASS_AUTH_HEADER } from "../../middleware/auth";
import { ok } from "neverthrow";
import { SPECIAL_MODULES } from "../../utils/constants";

// Mock AbstractionChainService
mock.module('../../services/abstraction-chain.service', () => ({
  AbstractionChainService: {
    createCollection: () => ok(true),
    createItems: () => ok(true),
    uploadFile: () => ok(undefined)
  }
}));

// Mock getRandomRpcUrl
mock.module('../../config/rpc', () => ({
  getRandomRpcUrl: () => ok('https://ethereum-rpc.publicnode.com')
}));

const app = createApp();

const generateRandomCollection = () => ({
  name: `Test-${randomUUID().slice(0, 8)}-${Date.now()}`,
  modules: ['erc721']
});

const generateRandomToken = (metadata?: Record<string, string>, modules?: string[]) => ({
  id: randomUUID().slice(0, 8),
  data: metadata || {
    name: `Test Name ${randomUUID().slice(0, 8)}`,
    description: `Test Description ${randomUUID().slice(0, 8)}`,
    image: `https://example.com/image.png`
  },
  modules: modules || ['erc721']
});

describe("Megadata Collection Routes", () => {
  let testAccount: { id: string; type: string };

  beforeEach(async () => {
    testAccount = generateRandomAccount();
    await app.request('/accounts', {
      method: 'POST',
      body: JSON.stringify({
        id: testAccount.id,
        type: testAccount.type,
      }),
      headers: {
        'Content-Type': 'application/json',
        [TEST_BYPASS_AUTH_HEADER]: testAccount.id
      }
    });
  });

  test("POST /megadata/collections - should create new collection", async () => {
    const collection = generateRandomCollection();
    const response = await app.request('/megadata/collections', {
      method: 'POST',
      body: JSON.stringify(collection),
      headers: {
        'Content-Type': 'application/json',
        [TEST_BYPASS_AUTH_HEADER]: testAccount.id
      }
    });
    expect(response.status).toBe(201);
    const data = await response.json() as MegadataCollectionResponse;
    if (!isErrorResponse(data)) {
      expect(data.name).toBe(collection.name);
      expect(data.account_id).toBe(testAccount.id);
      expect(data.is_published).toBe(false);
    }
  });

  test("GET /megadata/collections - should return collections for a given account_id", async () => {
    // Create two collections for the test account
    const collection1 = generateRandomCollection();
    const collection2 = generateRandomCollection();
    await app.request('/megadata/collections', { method: 'POST', body: JSON.stringify(collection1), headers: { 'Content-Type': 'application/json', [TEST_BYPASS_AUTH_HEADER]: testAccount.id } });
    const createResponse2 = await app.request('/megadata/collections', { method: 'POST', body: JSON.stringify(collection2), headers: { 'Content-Type': 'application/json', [TEST_BYPASS_AUTH_HEADER]: testAccount.id } });
    const createdCollection2 = await createResponse2.json() as MegadataCollectionResponse; // Keep track of one ID for later check

    // Fetch collections for the account
    const response = await app.request(`/megadata/collections?account_id=${testAccount.id}`, { headers: { 'Content-Type': 'application/json', [TEST_BYPASS_AUTH_HEADER]: testAccount.id } });
    expect(response.status).toBe(200);
    const data = await response.json() as MegadataCollectionResponse[];
    
    expect(Array.isArray(data)).toBe(true);
    // Check if at least one of the created collections is present
    const foundCollection = data.find(col => col.id === createdCollection2.id);
    expect(foundCollection).toBeDefined();
    if (foundCollection) {
      expect(foundCollection.name).toBe(collection2.name);
      expect(foundCollection.account_id).toBe(testAccount.id);
    }
    // Verify all returned collections belong to the correct account
    data.forEach(col => expect(col.account_id).toBe(testAccount.id));
  });

  test("GET /megadata/collections - should return 401 if account_id is missing", async () => {
    const response = await app.request('/megadata/collections');
    expect(response.status).toBe(401);
  });

  test("GET /megadata/collections/:id - should return collection by id", async () => {
    // First create a collection
    const collection = generateRandomCollection();
    const createResponse = await app.request('/megadata/collections', {
      method: 'POST',
      body: JSON.stringify(collection),
      headers: {
        'Content-Type': 'application/json',
        [TEST_BYPASS_AUTH_HEADER]: testAccount.id
      }
    });
    const createdCollection = await createResponse.json() as MegadataCollectionResponse;
    if (isErrorResponse(createdCollection)) {
      throw new Error("Failed to create test collection");
    }

    // Then get it by id
    const response = await app.request(`/megadata/collections/${createdCollection.id}`, {
      headers: {
        'Content-Type': 'application/json',
        [TEST_BYPASS_AUTH_HEADER]: testAccount.id
      }
    });
    expect(response.status).toBe(200);
    const data = await response.json() as MegadataCollectionResponse;
    if (!isErrorResponse(data)) {
      expect(data.id).toBe(createdCollection.id);
      expect(data.name).toBe(collection.name);
      expect(data.account_id).toBe(testAccount.id);
    }
  });

  test("GET /megadata/collections/:id - should return 404 for non-existent collection", async () => {
    const response = await app.request('/megadata/collections/999999', {
      headers: {
        'Content-Type': 'application/json',
        [TEST_BYPASS_AUTH_HEADER]: testAccount.id
      }
    });
    expect(response.status).toBe(404);
  });

  test("PUT /megadata/collections/:id - should update collection", async () => {
    // First create a collection
    const collection = generateRandomCollection();
    const createResponse = await app.request('/megadata/collections', {
      method: 'POST',
      body: JSON.stringify(collection),
      headers: {
        'Content-Type': 'application/json',
        [TEST_BYPASS_AUTH_HEADER]: testAccount.id
      }
    });
    const createdCollection = await createResponse.json() as MegadataCollectionResponse;
    if (isErrorResponse(createdCollection)) {
      throw new Error("Failed to create test collection");
    }

    // Update the collection
    const updateData = {
      name: "Updated Collection Name",
      modules: ['erc721']
    };

    const response = await app.request(`/megadata/collections/${createdCollection.id}`, {
      method: 'PUT',
      body: JSON.stringify(updateData),
      headers: {
        'Content-Type': 'application/json',
        [TEST_BYPASS_AUTH_HEADER]: testAccount.id
      }
    });
    expect(response.status).toBe(200);
    const data = await response.json() as MegadataCollectionResponse;
    if (!isErrorResponse(data)) {
      expect(data.id).toBe(createdCollection.id);
      expect(data.name).toBe(updateData.name);
    }
  });

  test("DELETE /megadata/collections/:id - should delete collection", async () => {
    // First create a collection
    const collection = generateRandomCollection();
    const createResponse = await app.request('/megadata/collections', {
      method: 'POST',
      body: JSON.stringify(collection),
      headers: {
        'Content-Type': 'application/json',
        [TEST_BYPASS_AUTH_HEADER]: testAccount.id
      }
    });
    const createdCollection = await createResponse.json() as MegadataCollectionResponse;
    if (isErrorResponse(createdCollection)) {
      throw new Error("Failed to create test collection");
    }

    // Delete the collection
    const response = await app.request(`/megadata/collections/${createdCollection.id}`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        [TEST_BYPASS_AUTH_HEADER]: testAccount.id
      }
    });
    expect(response.status).toBe(200);

    // Verify it's deleted
    const getResponse = await app.request(`/megadata/collections/${createdCollection.id}`, {
      headers: {
        'Content-Type': 'application/json',
        [TEST_BYPASS_AUTH_HEADER]: testAccount.id
      }
    });
    expect(getResponse.status).toBe(404);
  });

  test("PUT /megadata/collections/:id/publish - should publish collection", async () => {
    // First create a collection
    const collection = generateRandomCollection();
    const createResponse = await app.request('/megadata/collections', {
      method: 'POST',
      body: JSON.stringify(collection),
      headers: {
        'Content-Type': 'application/json',
        [TEST_BYPASS_AUTH_HEADER]: testAccount.id
      }
    });
    const createdCollection = await createResponse.json() as MegadataCollectionResponse;
    if (isErrorResponse(createdCollection)) {
      throw new Error("Failed to create test collection");
    }

    // Verify collection is not published initially
    expect(createdCollection.is_published).toBe(false);

    // Publish the collection
    const publishResponse = await app.request(`/megadata/collections/${createdCollection.id}/publish`, {
      method: 'PUT',
      body: JSON.stringify({ token_ids: [] }),
      headers: {
        'Content-Type': 'application/json',
        [TEST_BYPASS_AUTH_HEADER]: testAccount.id
      }
    });
    expect(publishResponse.status).toBe(200);
    const publishData = await publishResponse.json();
    expect(publishData).toEqual({ success: true });

    // Verify collection is published
    const getResponse = await app.request(`/megadata/collections/${createdCollection.id}`, {
      headers: {
        'Content-Type': 'application/json',
        [TEST_BYPASS_AUTH_HEADER]: testAccount.id
      }
    });
    const data = await getResponse.json() as MegadataCollectionResponse;
    if (!isErrorResponse(data)) {
      console.log(data);
      expect(data.is_published).toBe(true);
    }
  });

  test("PUT /megadata/collections/:id/publish - should fail when collection does not exist", async () => {
    const response = await app.request('/megadata/collections/999999/publish', {
      method: 'PUT',
      body: JSON.stringify({ token_ids: [] }),
      headers: {
        'Content-Type': 'application/json',
        [TEST_BYPASS_AUTH_HEADER]: testAccount.id
      }
    });
    expect(response.status).toBe(404);
  });
});

describe("Megadata Token Routes", () => {
  let testAccount: { id: string; type: string };
  let testCollection: MegadataCollectionResponse;

  beforeEach(async () => {
    testAccount = generateRandomAccount();
    await app.request('/accounts', {
      method: 'POST',
      body: JSON.stringify({
        id: testAccount.id,
        type: testAccount.type,
      }),
      headers: {
        'Content-Type': 'application/json',
        [TEST_BYPASS_AUTH_HEADER]: testAccount.id
      }
    });

    // Create a test collection
    const collection = generateRandomCollection();
    const createResponse = await app.request('/megadata/collections', {
      method: 'POST',
      body: JSON.stringify(collection),
      headers: {
        'Content-Type': 'application/json',
        [TEST_BYPASS_AUTH_HEADER]: testAccount.id
      }
    });
    testCollection = await createResponse.json() as MegadataCollectionResponse;
    if (isErrorResponse(testCollection)) {
      throw new Error("Failed to create test collection");
    }
  });

  test("POST /megadata/collections/:id/tokens - should create tokens with metadata from external source", async () => {
    const tokens = [
      {
        id: "0",
        data: {
          source: "ethereum",
          id: "0xBd3531dA5CF5857e7CfAA92426877b022e612cf8",
        },
        modules: [SPECIAL_MODULES.ERC721, SPECIAL_MODULES.EXTENDING_METADATA, SPECIAL_MODULES.EXTENDING_COLLECTION]
      },
    ];

    const response = await app.request(`/megadata/collections/${testCollection.id}/tokens`, {
      method: 'POST',
      body: JSON.stringify(tokens),
      headers: {
        'Content-Type': 'application/json',
        [TEST_BYPASS_AUTH_HEADER]: "0xB8074B33D8A9545c20FAbD4A700F2F656D237375"
      }
    });

    expect(response.status).toBe(201);
    const data = await response.json() as MegadataTokenResponse[];
    expect(Array.isArray(data)).toBe(true);
    expect(data).toHaveLength(1);
    if (data[0] && tokens[0]) {
      expect(data[0].id).toBe(tokens[0].id);
      expect(data[0].data["source"]).toBe("ethereum");
      expect(data[0].data["id"]).toBe("0xBd3531dA5CF5857e7CfAA92426877b022e612cf8");
      expect(data[0].data["name"]).toBeDefined();
      expect(data[0].data["description"]).toBeDefined();
      expect(data[0].data["image"]).toBeDefined();
      expect(data[0].data["attributes"]).toBeDefined();
    }
  });

  test("POST /megadata/collections/:id/tokens - should create new token", async () => {
    const token = generateRandomToken();
    console.log(token);
    const response = await app.request(`/megadata/collections/${testCollection.id}/tokens`, {
      method: 'POST',
      body: JSON.stringify([token]),
      headers: {
        'Content-Type': 'application/json',
        [TEST_BYPASS_AUTH_HEADER]: testAccount.id
      }
    });
    console.log(response);
    expect(response.status).toBe(201);
    const data = await response.json() as MegadataTokenResponse[];
    expect(Array.isArray(data)).toBe(true);
    expect(data.length).toBe(1);
    const createdToken = data[0];
    expect(createdToken).toBeDefined();
    if (createdToken && !isErrorResponse(createdToken)) {
      expect(createdToken.collection_id).toBe(testCollection.id);
      expect(createdToken.id).toBe(token.id);
      expect(createdToken.data).toEqual(token.data);
      expect(createdToken.is_published).toBe(false);
    }
  });

  test("POST /megadata/collections/:id/tokens - should create multiple tokens in batch", async () => {
    const tokens = [
      generateRandomToken(),
      generateRandomToken(),
      generateRandomToken()
    ];
    
    const response = await app.request(`/megadata/collections/${testCollection.id}/tokens`, {
      method: 'POST',
      body: JSON.stringify(tokens),
      headers: {
        'Content-Type': 'application/json',
        [TEST_BYPASS_AUTH_HEADER]: testAccount.id
      }
    });
    expect(response.status).toBe(201);
    const data = await response.json() as MegadataTokenResponse[];
    expect(Array.isArray(data)).toBe(true);
    expect(data.length).toBe(tokens.length);
    
    // Verify each token was created correctly
    data.forEach((createdToken, index) => {
      expect(createdToken).toBeDefined();
      if (createdToken && !isErrorResponse(createdToken) && index < tokens.length) {
        const expectedToken = tokens[index];
        expect(expectedToken).toBeDefined();
        if (expectedToken) {
          expect(createdToken.collection_id).toBe(testCollection.id);
          expect(createdToken.id).toBe(expectedToken.id);
          expect(createdToken.data).toEqual(expectedToken.data);
          expect(createdToken.is_published).toBe(false);
        }
      }
    });

    // Verify we can retrieve each token individually
    for (const createdToken of data) {
      expect(createdToken).toBeDefined();
      if (createdToken && !isErrorResponse(createdToken)) {
        const getResponse = await app.request(`/megadata/collections/${testCollection.id}/tokens/${createdToken.id}`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            [TEST_BYPASS_AUTH_HEADER]: testAccount.id
          }
        });
        expect(getResponse.status).toBe(200);
        const retrievedToken = await getResponse.json() as MegadataTokenResponse;
        if (!isErrorResponse(retrievedToken)) {
          expect(retrievedToken.id).toBe(createdToken.id);
          expect(retrievedToken.collection_id).toBe(testCollection.id);
          expect(retrievedToken.data).toEqual(createdToken.data);
        }
      }
    }
  });

  test("POST /megadata/collections/:id/tokens - should add tokens to collection and remove uknown metadata", async () => {
    const invalidToken = generateRandomToken({ invalid: "data" });
    
    const tokens = [ invalidToken ];
    
    const response = await app.request(`/megadata/collections/${testCollection.id}/tokens`, {
      method: 'POST',
      body: JSON.stringify(tokens),
      headers: {
        'Content-Type': 'application/json',
        [TEST_BYPASS_AUTH_HEADER]: testAccount.id
      }
    });
    expect(response.status).toBe(201);
    const data = await response.json() as MegadataTokenResponse[];
    expect(data.length).toBe(1);
    const metadata = data[0]?.data as Record<string, string>;
    expect(metadata["invalid"]).toBeUndefined();
  });

  test("GET /megadata/collections/:id/tokens/:token_id - should return token by id", async () => {
    // First create a token
    const token = generateRandomToken();
    const createResponse = await app.request(`/megadata/collections/${testCollection.id}/tokens`, {
      method: 'POST',
      body: JSON.stringify([token]),
      headers: {
        'Content-Type': 'application/json',
        [TEST_BYPASS_AUTH_HEADER]: testAccount.id
      }
    });
    const createdTokens = await createResponse.json() as MegadataTokenResponse[];
    if (isErrorResponse(createdTokens) || !Array.isArray(createdTokens) || createdTokens.length === 0) {
      throw new Error("Failed to create test token");
    }
    const createdToken = createdTokens[0];
    expect(createdToken).toBeDefined();
    if (!createdToken || isErrorResponse(createdToken)) {
      throw new Error("Failed to create test token");
    }

    // Then get it by id
    const response = await app.request(`/megadata/collections/${testCollection.id}/tokens/${createdToken.id}`, {
      headers: {
        'Content-Type': 'application/json',
        [TEST_BYPASS_AUTH_HEADER]: testAccount.id
      }
    });
    expect(response.status).toBe(200);
    const data = await response.json() as MegadataTokenResponse;
    if (!isErrorResponse(data)) {
      expect(data.id).toBe(createdToken.id);
      expect(data.collection_id).toBe(testCollection.id);
      expect(data.data).toEqual(token.data);
    }
  });

  test("PUT /megadata/collections/:id/tokens/:token_id - should update token", async () => {
    // First create a token
    const token = generateRandomToken();
    const createResponse = await app.request(`/megadata/collections/${testCollection.id}/tokens`, {
      method: 'POST',
      body: JSON.stringify([token]),
      headers: {
        'Content-Type': 'application/json',
        [TEST_BYPASS_AUTH_HEADER]: testAccount.id
      }
    });
    const createdTokens = await createResponse.json() as MegadataTokenResponse[];
    if (isErrorResponse(createdTokens) || !Array.isArray(createdTokens) || createdTokens.length === 0) {
      throw new Error("Failed to create test token");
    }
    const createdToken = createdTokens[0];
    expect(createdToken).toBeDefined();
    if (!createdToken || isErrorResponse(createdToken)) {
      throw new Error("Failed to create test token");
    }

    // Update the token
    const updateData = {
      data: {
        name: "Updated Name",
        description: "Updated Description",
        image: "https://example.com/updated-image.png"
      },
      modules: ['erc721']
    };

    const response = await app.request(`/megadata/collections/${testCollection.id}/tokens/${createdToken.id}`, {
      method: 'PUT',
      body: JSON.stringify(updateData),
      headers: {
        'Content-Type': 'application/json',
        [TEST_BYPASS_AUTH_HEADER]: testAccount.id
      }
    });
    expect(response.status).toBe(200);
    const data = await response.json() as MegadataTokenResponse;
    if (!isErrorResponse(data)) {
      expect(data.id).toBe(createdToken.id);
      expect(data.data).toEqual(updateData.data);
    }
  });

  test("DELETE /megadata/collections/:id/tokens/:token_id - should delete token", async () => {
    // First create a token
    const token = generateRandomToken();
    const createResponse = await app.request(`/megadata/collections/${testCollection.id}/tokens`, {
      method: 'POST',
      body: JSON.stringify([token]),
      headers: {
        'Content-Type': 'application/json',
        [TEST_BYPASS_AUTH_HEADER]: testAccount.id
      }
    });
    const createdTokens = await createResponse.json() as MegadataTokenResponse[];
    if (isErrorResponse(createdTokens) || !Array.isArray(createdTokens) || createdTokens.length === 0) {
      throw new Error("Failed to create test token");
    }
    const createdToken = createdTokens[0];
    expect(createdToken).toBeDefined();
    if (!createdToken || isErrorResponse(createdToken)) {
      throw new Error("Failed to create test token");
    }

    // Delete the token
    const response = await app.request(`/megadata/collections/${testCollection.id}/tokens/${createdToken.id}`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        [TEST_BYPASS_AUTH_HEADER]: testAccount.id
      }
    });
    expect(response.status).toBe(200);

    // Verify it's deleted
    const getResponse = await app.request(`/megadata/collections/${testCollection.id}/tokens/${createdToken.id}`, {
      headers: {
        'Content-Type': 'application/json',
        [TEST_BYPASS_AUTH_HEADER]: testAccount.id
      }
    });
    expect(getResponse.status).toBe(404);
  });

  test("PUT /megadata/collections/:id/tokens/:token_id/publish - should publish token", async () => {
    // First create a token
    const token = generateRandomToken();
    const createResponse = await app.request(`/megadata/collections/${testCollection.id}/tokens`, {
      method: 'POST',
      body: JSON.stringify([token]),
      headers: {
        'Content-Type': 'application/json',
        [TEST_BYPASS_AUTH_HEADER]: testAccount.id
      }
    });
    const createdTokens = await createResponse.json() as MegadataTokenResponse[];
    if (isErrorResponse(createdTokens) || !Array.isArray(createdTokens) || createdTokens.length === 0) {
      throw new Error("Failed to create test token");
    }
    const createdToken = createdTokens[0];
    expect(createdToken).toBeDefined();
    if (!createdToken || isErrorResponse(createdToken)) {
      throw new Error("Failed to create test token");
    }

    // Verify token is not published initially
    expect(createdToken.is_published).toBe(false);

    // Publish the collection with the token
    const publishResponse = await app.request(`/megadata/collections/${testCollection.id}/publish`, {
      method: 'PUT',
      body: JSON.stringify({ token_ids: [createdToken.id] }),
      headers: {
        'Content-Type': 'application/json',
        [TEST_BYPASS_AUTH_HEADER]: testAccount.id
      }
    });
    expect(publishResponse.status).toBe(200);
    const publishData = await publishResponse.json();
    expect(publishData).toEqual({ success: true });

    // Verify token is published
    const getResponse = await app.request(`/megadata/collections/${testCollection.id}/tokens/${createdToken.id}`, {
      headers: {
        'Content-Type': 'application/json',
        [TEST_BYPASS_AUTH_HEADER]: testAccount.id
      }
    });
    const data = await getResponse.json() as MegadataTokenResponse;
    if (!isErrorResponse(data)) {
      expect(data.is_published).toBe(true);
    }
  });

  test("GET /megadata/collections/:id/tokens - should return paginated tokens", async () => {
    // Create 25 tokens
    const tokens = Array.from({ length: 25 }, () => generateRandomToken());
    await app.request(`/megadata/collections/${testCollection.id}/tokens`, {
      method: 'POST',
      body: JSON.stringify(tokens),
      headers: {
        'Content-Type': 'application/json',
        [TEST_BYPASS_AUTH_HEADER]: testAccount.id
      }
    });

    // Test first page with default pagination
    const response1 = await app.request(`/megadata/collections/${testCollection.id}/tokens`, {
      headers: {
        'Content-Type': 'application/json',
        [TEST_BYPASS_AUTH_HEADER]: testAccount.id
      }
    });
    expect(response1.status).toBe(200);
    const data1 = await response1.json() as { data: MegadataTokenResponse[], pagination: { total: number, page: number, limit: number, total_pages: number } };
    expect(data1.data).toHaveLength(20); // Default limit
    expect(data1.pagination).toEqual({
      total: 25,
      page: 1,
      limit: 20,
      total_pages: 2
    });

    // Test second page
    const response2 = await app.request(`/megadata/collections/${testCollection.id}/tokens?page=2`, {
      headers: {
        'Content-Type': 'application/json',
        [TEST_BYPASS_AUTH_HEADER]: testAccount.id
      }
    });
    expect(response2.status).toBe(200);
    const data2 = await response2.json() as { data: MegadataTokenResponse[], pagination: { total: number, page: number, limit: number, total_pages: number } };
    expect(data2.data).toHaveLength(5); // Remaining tokens
    expect(data2.pagination).toEqual({
      total: 25,
      page: 2,
      limit: 20,
      total_pages: 2
    });

    // Test with custom limit
    const response3 = await app.request(`/megadata/collections/${testCollection.id}/tokens?limit=10`, {
      headers: {
        'Content-Type': 'application/json',
        [TEST_BYPASS_AUTH_HEADER]: testAccount.id
      }
    });
    expect(response3.status).toBe(200);
    const data3 = await response3.json() as { data: MegadataTokenResponse[], pagination: { total: number, page: number, limit: number, total_pages: number } };
    expect(data3.data).toHaveLength(10);
    expect(data3.pagination).toEqual({
      total: 25,
      page: 1,
      limit: 10,
      total_pages: 3
    });
  });

  test("GET /megadata/collections/:id/tokens - should validate pagination parameters", async () => {
    // Test invalid page
    const response1 = await app.request(`/megadata/collections/${testCollection.id}/tokens?page=0`, {
      headers: {
        'Content-Type': 'application/json',
        [TEST_BYPASS_AUTH_HEADER]: testAccount.id
      }
    });
    expect(response1.status).toBe(400);
    const error1 = await response1.json();
    expect(error1).toHaveProperty('error');

    // Test invalid limit
    const response2 = await app.request(`/megadata/collections/${testCollection.id}/tokens?limit=0`, {
      headers: {
        'Content-Type': 'application/json',
        [TEST_BYPASS_AUTH_HEADER]: testAccount.id
      }
    });
    expect(response2.status).toBe(400);
    const error2 = await response2.json();
    expect(error2).toHaveProperty('error');

    // Test limit exceeding maximum
    const response3 = await app.request(`/megadata/collections/${testCollection.id}/tokens?limit=101`, {
      headers: {
        'Content-Type': 'application/json',
        [TEST_BYPASS_AUTH_HEADER]: testAccount.id
      }
    });
    expect(response3.status).toBe(400);
    const error3 = await response3.json();
    expect(error3).toHaveProperty('error');
  });
});

describe("Token Permission Validation", () => {
  let testAccount: { id: string; type: string };
  let collection: MegadataCollectionResponse;
  let token: MegadataTokenResponse;

  beforeEach(async () => {
    testAccount = generateRandomAccount();
    await app.request('/accounts', {
      method: 'POST',
      body: JSON.stringify({
        id: testAccount.id,
        type: testAccount.type,
      }),
      headers: {
        'Content-Type': 'application/json',
        [TEST_BYPASS_AUTH_HEADER]: testAccount.id
      }
    });

    // Create a collection
    const collectionResponse = await app.request('/megadata/collections', {
      method: 'POST',
      body: JSON.stringify(generateRandomCollection()),
      headers: {
        'Content-Type': 'application/json',
        [TEST_BYPASS_AUTH_HEADER]: testAccount.id
      }
    });
    collection = (await collectionResponse.json()) as MegadataCollectionResponse;

    // Create a token
    const tokenResponse = await app.request(`/megadata/collections/${collection.id}/tokens`, {
      method: 'POST',
      body: JSON.stringify([generateRandomToken()]),
      headers: {
        'Content-Type': 'application/json',
        [TEST_BYPASS_AUTH_HEADER]: testAccount.id
      }
    });
    const tokens = (await tokenResponse.json()) as MegadataTokenResponse[];
    if (!tokens[0]) {
      throw new Error('Failed to create token');
    }
    token = tokens[0];
  });

  test("GET /megadata/collections/{collection_id}/tokens/{token_id}/validate - should validate token permissions for owner", async () => {
    const response = await app.request(`/megadata/collections/${collection.id}/tokens/${token.id}/validate`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        [TEST_BYPASS_AUTH_HEADER]: testAccount.id
      }
    });

    expect(response.status).toBe(200);
    const result = (await response.json()) as { isValid: boolean; error?: string };
    expect(result.isValid).toBe(true);
  });

  test("GET /megadata/collections/{collection_id}/tokens/{token_id}/validate - should return 401 for unauthorized request", async () => {
    const response = await app.request(`/megadata/collections/${collection.id}/tokens/${token.id}/validate`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    });

    expect(response.status).toBe(401);
    const result = await response.json();
    expect(isErrorResponse(result)).toBe(true);
  });

  test("GET /megadata/collections/{collection_id}/tokens/{token_id}/validate - should return 404 for non-existent token", async () => {
    const response = await app.request(`/megadata/collections/${collection.id}/tokens/non-existent/validate`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        [TEST_BYPASS_AUTH_HEADER]: testAccount.id
      }
    });

    expect(response.status).toBe(404);
    const result = await response.json();
    expect(isErrorResponse(result)).toBe(true);
  });

  test("GET /megadata/collections/{collection_id}/tokens/{token_id}/validate - should return 404 for non-existent collection", async () => {
    const response = await app.request(`/megadata/collections/999999/tokens/${token.id}/validate`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        [TEST_BYPASS_AUTH_HEADER]: testAccount.id
      }
    });

    expect(response.status).toBe(404);
    const result = await response.json();
    expect(isErrorResponse(result)).toBe(true);
  });
}); 