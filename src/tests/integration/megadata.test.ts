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
      body: JSON.stringify(token),
      headers: {
        'Content-Type': 'application/json'
      }
    });
    expect(response.status).toBe(201);
    const data = await response.json() as MegadataTokenResponse;
    if (!isErrorResponse(data)) {
      expect(data.collection_id).toBe(testCollection.id);
      expect(data.id).toBe(token.id);
      expect(data.data).toEqual(token.data);
      expect(data.is_published).toBe(false);
    }
  });

  test("GET /megadata/collections/:id/tokens/:token_id - should return token by id", async () => {
    // First create a token
    const token = generateRandomToken();
    const createResponse = await app.request(`/megadata/collections/${testCollection.id}/tokens`, {
      method: 'POST',
      body: JSON.stringify(token),
      headers: {
        'Content-Type': 'application/json'
      }
    });
    const createdToken = await createResponse.json() as MegadataTokenResponse;
    if (isErrorResponse(createdToken)) {
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
      body: JSON.stringify(token),
      headers: {
        'Content-Type': 'application/json'
      }
    });
    const createdToken = await createResponse.json() as MegadataTokenResponse;
    console.log("createdToken", createdToken);
    if (isErrorResponse(createdToken)) {
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
      body: JSON.stringify(token),
      headers: {
        'Content-Type': 'application/json'
      }
    });
    const createdToken = await createResponse.json() as MegadataTokenResponse;
    if (isErrorResponse(createdToken)) {
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
      body: JSON.stringify(token),
      headers: {
        'Content-Type': 'application/json'
      }
    });
    const createdToken = await createResponse.json() as MegadataTokenResponse;
    if (isErrorResponse(createdToken)) {
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
}); 