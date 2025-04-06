import { expect, test, describe, beforeEach } from "bun:test";
import "../setup";
import { randomUUID } from "crypto";
import { isErrorResponse } from "../helpers";
import { generateRandomAccount } from "../helpers";
import type { MegadataCollectionResponse, MegadataTokenResponse } from "../../routes/megadata/types";
import { createApp } from "../../index";

const app = createApp();

const generateRandomCollection = (accountId: string) => ({
  name: `Test-${randomUUID().slice(0, 8)}-${Date.now()}`,
  account_id: accountId,
  modules: ['erc721']
});

const generateRandomToken = (metadata?: Record<string, string>) => ({
  id: randomUUID().slice(0, 8),
  data: metadata || {
    name: `Test Name ${randomUUID().slice(0, 8)}`,
    description: `Test Description ${randomUUID().slice(0, 8)}`,
    image: `https://example.com/image.png`
  }
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
        'Content-Type': 'application/json'
      }
    });
  });

  test("POST /megadata/collections - should create new collection", async () => {
    const collection = generateRandomCollection(testAccount.id);
    const response = await app.request('/megadata/collections', {
      method: 'POST',
      body: JSON.stringify(collection),
      headers: {
        'Content-Type': 'application/json'
      }
    });
    console.log(response);
    expect(response.status).toBe(201);
    const data = await response.json() as MegadataCollectionResponse;
    if (!isErrorResponse(data)) {
      expect(data.name).toBe(collection.name);
      expect(data.account_id).toBe(collection.account_id);
      expect(data.is_published).toBe(false);
    }
  });

  test("GET /megadata/collections - should return collections for a given account_id", async () => {
    // Create two collections for the test account
    const collection1 = generateRandomCollection(testAccount.id);
    const collection2 = generateRandomCollection(testAccount.id);
    await app.request('/megadata/collections', { method: 'POST', body: JSON.stringify(collection1), headers: { 'Content-Type': 'application/json' } });
    const createResponse2 = await app.request('/megadata/collections', { method: 'POST', body: JSON.stringify(collection2), headers: { 'Content-Type': 'application/json' } });
    const createdCollection2 = await createResponse2.json() as MegadataCollectionResponse; // Keep track of one ID for later check

    // Fetch collections for the account
    const response = await app.request(`/megadata/collections?account_id=${testAccount.id}`);
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

  test("GET /megadata/collections - should return 400 if account_id is missing", async () => {
    const response = await app.request('/megadata/collections');
    expect(response.status).toBe(400);
  });

  test("GET /megadata/collections/:id - should return collection by id", async () => {
    // First create a collection
    const collection = generateRandomCollection(testAccount.id);
    const createResponse = await app.request('/megadata/collections', {
      method: 'POST',
      body: JSON.stringify(collection),
      headers: {
        'Content-Type': 'application/json'
      }
    });
    const createdCollection = await createResponse.json() as MegadataCollectionResponse;
    if (isErrorResponse(createdCollection)) {
      throw new Error("Failed to create test collection");
    }

    // Then get it by id
    const response = await app.request(`/megadata/collections/${createdCollection.id}`);
    expect(response.status).toBe(200);
    const data = await response.json() as MegadataCollectionResponse;
    if (!isErrorResponse(data)) {
      expect(data.id).toBe(createdCollection.id);
      expect(data.name).toBe(collection.name);
      expect(data.account_id).toBe(collection.account_id);
    }
  });

  test("GET /megadata/collections/:id - should return 404 for non-existent collection", async () => {
    const response = await app.request('/megadata/collections/999999');
    expect(response.status).toBe(404);
  });

  test("PUT /megadata/collections/:id - should update collection", async () => {
    // First create a collection
    const collection = generateRandomCollection(testAccount.id);
    const createResponse = await app.request('/megadata/collections', {
      method: 'POST',
      body: JSON.stringify(collection),
      headers: {
        'Content-Type': 'application/json'
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
        'Content-Type': 'application/json'
      }
    });
    console.log(response);
    expect(response.status).toBe(200);
    const data = await response.json() as MegadataCollectionResponse;
    if (!isErrorResponse(data)) {
      expect(data.id).toBe(createdCollection.id);
      expect(data.name).toBe(updateData.name);
    }
  });

  test("DELETE /megadata/collections/:id - should delete collection", async () => {
    // First create a collection
    const collection = generateRandomCollection(testAccount.id);
    const createResponse = await app.request('/megadata/collections', {
      method: 'POST',
      body: JSON.stringify(collection),
      headers: {
        'Content-Type': 'application/json'
      }
    });
    const createdCollection = await createResponse.json() as MegadataCollectionResponse;
    if (isErrorResponse(createdCollection)) {
      throw new Error("Failed to create test collection");
    }

    // Delete the collection
    const response = await app.request(`/megadata/collections/${createdCollection.id}`, {
      method: 'DELETE'
    });
    console.log(response);
    expect(response.status).toBe(200);

    // Verify it's deleted
    const getResponse = await app.request(`/megadata/collections/${createdCollection.id}`);
    expect(getResponse.status).toBe(404);
  });

  test("PUT /megadata/collections/:id/publish - should publish collection", async () => {
    // First create a collection
    const collection = generateRandomCollection(testAccount.id);
    const createResponse = await app.request('/megadata/collections', {
      method: 'POST',
      body: JSON.stringify(collection),
      headers: {
        'Content-Type': 'application/json'
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
      body: JSON.stringify([]),
      headers: {
        'Content-Type': 'application/json'
      }
    });
    expect(publishResponse.status).toBe(200);
    const publishData = await publishResponse.json();
    expect(publishData).toEqual({ success: true });

    // Verify collection is published
    const getResponse = await app.request(`/megadata/collections/${createdCollection.id}`);
    const data = await getResponse.json() as MegadataCollectionResponse;
    if (!isErrorResponse(data)) {
      expect(data.is_published).toBe(true);
    }
  });

  test("PUT /megadata/collections/:id/publish - should fail when collection does not exist", async () => {
    const response = await app.request('/megadata/collections/999999/publish', {
      method: 'PUT',
      body: JSON.stringify([]),
      headers: {
        'Content-Type': 'application/json'
      }
    });
    expect(response.status).toBe(404);
  });
});

describe("Megadata Token Routes", () => {
  let testAccount: { id: string; type: string };
  let testCollection: MegadataCollectionResponse;

  beforeEach(async () => {
    // Create a test account and collection that we'll use for all token tests
    testAccount = generateRandomAccount();
    await app.request('/accounts', {
      method: 'POST',
      body: JSON.stringify({
        id: testAccount.id,
        type: testAccount.type,
      }),
      headers: {
        'Content-Type': 'application/json'
      }
    });

    // Create a test collection
    const collection = generateRandomCollection(testAccount.id);
    const createResponse = await app.request('/megadata/collections', {
      method: 'POST',
      body: JSON.stringify(collection),
      headers: {
        'Content-Type': 'application/json'
      }
    });
    const createdCollection = await createResponse.json() as MegadataCollectionResponse;
    if (isErrorResponse(createdCollection)) {
      throw new Error("Failed to create test collection");
    }
    testCollection = createdCollection;
  });

  test("POST /megadata/collections/:id/tokens - should create new token", async () => {
    const token = generateRandomToken();
    const response = await app.request(`/megadata/collections/${testCollection.id}/tokens`, {
      method: 'POST',
      body: JSON.stringify([token]),
      headers: {
        'Content-Type': 'application/json'
      }
    });
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
        'Content-Type': 'application/json'
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
        const getResponse = await app.request(`/megadata/collections/${testCollection.id}/tokens/${createdToken.id}`);
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

  test("POST /megadata/collections/:id/tokens - should validate all tokens in batch", async () => {
    const tokens = [
      generateRandomToken(),
      generateRandomToken({ invalid: "data" }), // Invalid token data
      generateRandomToken()
    ];
    
    const response = await app.request(`/megadata/collections/${testCollection.id}/tokens`, {
      method: 'POST',
      body: JSON.stringify(tokens),
      headers: {
        'Content-Type': 'application/json'
      }
    });
    expect(response.status).toBe(400);
    const error = await response.json();
    expect(error).toHaveProperty('error');
  });

  test("GET /megadata/collections/:id/tokens/:token_id - should return token by id", async () => {
    // First create a token
    const token = generateRandomToken();
    const createResponse = await app.request(`/megadata/collections/${testCollection.id}/tokens`, {
      method: 'POST',
      body: JSON.stringify([token]),
      headers: {
        'Content-Type': 'application/json'
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
    const response = await app.request(`/megadata/collections/${testCollection.id}/tokens/${createdToken.id}`);
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
        'Content-Type': 'application/json'
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
      }
    };

    const response = await app.request(`/megadata/collections/${testCollection.id}/tokens/${createdToken.id}`, {
      method: 'PUT',
      body: JSON.stringify(updateData),
      headers: {
        'Content-Type': 'application/json'
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
        'Content-Type': 'application/json'
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
      method: 'DELETE'
    });
    expect(response.status).toBe(200);

    // Verify it's deleted
    const getResponse = await app.request(`/megadata/collections/${testCollection.id}/tokens/${createdToken.id}`);
    expect(getResponse.status).toBe(404);
  });

  test("PUT /megadata/collections/:id/tokens/:token_id/publish - should publish token", async () => {
    // First create a token
    const token = generateRandomToken();
    const createResponse = await app.request(`/megadata/collections/${testCollection.id}/tokens`, {
      method: 'POST',
      body: JSON.stringify([token]),
      headers: {
        'Content-Type': 'application/json'
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
      body: JSON.stringify([token.id]),
      headers: {
        'Content-Type': 'application/json'
      }
    });
    expect(publishResponse.status).toBe(200);
    const publishData = await publishResponse.json();
    expect(publishData).toEqual({ success: true });

    // Verify token is published
    const getResponse = await app.request(`/megadata/collections/${testCollection.id}/tokens/${createdToken.id}`);
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
        'Content-Type': 'application/json'
      }
    });

    // Test first page with default pagination
    const response1 = await app.request(`/megadata/collections/${testCollection.id}/tokens`);
    console.log(response1);
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
    const response2 = await app.request(`/megadata/collections/${testCollection.id}/tokens?page=2`);
    console.log(response2);
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
    const response3 = await app.request(`/megadata/collections/${testCollection.id}/tokens?limit=10`);
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
    const response1 = await app.request(`/megadata/collections/${testCollection.id}/tokens?page=0`);
    expect(response1.status).toBe(400);
    const error1 = await response1.json();
    expect(error1).toHaveProperty('error');

    // Test invalid limit
    const response2 = await app.request(`/megadata/collections/${testCollection.id}/tokens?limit=0`);
    expect(response2.status).toBe(400);
    const error2 = await response2.json();
    expect(error2).toHaveProperty('error');

    // Test limit exceeding maximum
    const response3 = await app.request(`/megadata/collections/${testCollection.id}/tokens?limit=101`);
    expect(response3.status).toBe(400);
    const error3 = await response3.json();
    expect(error3).toHaveProperty('error');
  });
}); 