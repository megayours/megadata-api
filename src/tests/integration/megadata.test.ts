import { expect, test, describe, beforeAll, beforeEach } from "bun:test";
import { app } from "../../index";
import { generateRandomAccount, setupTestDatabase } from "../helpers";
import { edenTreaty } from "@elysiajs/eden";
import { config } from "dotenv";
import { join } from "path";
import { randomUUID } from "crypto";

config({ path: join(process.cwd(), ".env.local") });

const api = edenTreaty<typeof app>('http://localhost:3000');

const generateRandomCollection = (accountId: string) => ({
  name: `Test Collection ${randomUUID().slice(0, 8)}`,
  account_id: accountId,
});

const generateRandomToken = () => ({
  data: {
    title: `Test Title ${randomUUID().slice(0, 8)}`,
    description: `Test Description ${randomUUID().slice(0, 8)}`,
    metadata: {
      key1: "value1",
      key2: "value2"
    }
  }
});

describe("Megadata Collection Routes", () => {
  let testAccount: { id: string; type: string };

  beforeAll(async () => {
    await setupTestDatabase();
    // Create a test account that we'll use for all megadata tests

  });

  beforeEach(async () => {
    testAccount = generateRandomAccount();
    await api.accounts.post({
      id: testAccount.id,
      type: testAccount.type,
    });
  });

  test("POST /megadata/collections - should create new collection", async () => {
    const collection = generateRandomCollection(testAccount.id);
    const response = await api.megadata.collections.post(collection);
    expect(response.status).toBe(200);
    const data = response.data;
    expect(data?.name).toBe(collection.name);
    expect(data?.account_id).toBe(collection.account_id);
    expect(data?.is_published).toBe(false);
  });

  test("POST /megadata/collections - should fail when account does not exist", async () => {
    const collection = generateRandomCollection("non-existent-id");
    const response = await api.megadata.collections.post(collection);
    expect(response.status).toBe(404);
  });

  test("GET /megadata/collections/:id - should return collection by id", async () => {
    // First create a collection
    const collection = generateRandomCollection(testAccount.id);
    const createResponse = await api.megadata.collections.post(collection);
    const createdCollection = createResponse.data;

    // Then get it by id
    const response = await api.megadata.collections[createdCollection?.id!]!.get();
    expect(response.status).toBe(200);
    const data = response.data;
    expect(data?.id).toBe(createdCollection?.id!);
    expect(data?.name).toBe(collection.name);
    expect(data?.account_id).toBe(collection.account_id);
  });

  test("GET /megadata/collections/:id - should return 404 for non-existent collection", async () => {
    const response = await api.megadata.collections[999999]!.get();
    expect(response.status).toBe(404);
  });

  test("PUT /megadata/collections/:id - should update collection", async () => {
    // First create a collection
    const collection = generateRandomCollection(testAccount.id);
    const createResponse = await api.megadata.collections.post(collection);
    const createdCollection = createResponse.data;

    // Update the collection
    const updateData = {
      name: "Updated Collection Name",
      account_id: testAccount.id
    };

    const response = await api.megadata.collections[createdCollection?.id!]!.put(updateData);
    expect(response.status).toBe(200);
    const data = response.data;
    expect(data?.id).toBe(createdCollection?.id!);
    expect(data?.name).toBe(updateData.name);
  });

  test("DELETE /megadata/collections/:id - should delete collection", async () => {
    // First create a collection
    const collection = generateRandomCollection(testAccount.id);
    const createResponse = await api.megadata.collections.post(collection);
    const createdCollection = createResponse.data;

    // Delete the collection
    const response = await api.megadata.collections[createdCollection?.id!]!.delete();
    expect(response.status).toBe(200);
    expect(response.data?.id).toBe(createdCollection?.id!);

    // Verify it's deleted
    const getResponse = await api.megadata.collections[createdCollection?.id!]!.get();
    expect(getResponse.status).toBe(404);
  });
});

describe("Megadata Token Routes", () => {
  let testAccount: { id: string; type: string };
  let testCollection: any;

  beforeAll(async () => {
    await setupTestDatabase();
  });

  beforeEach(async () => {
    // Create a test account and collection that we'll use for all token tests
    testAccount = generateRandomAccount();
    await api.accounts.post({
      id: testAccount.id,
      type: testAccount.type,
    });

    // Create a test collection
    const collection = generateRandomCollection(testAccount.id);
    const createResponse = await api.megadata.collections.post(collection);
    if (!createResponse.data?.id) {
      throw new Error("Failed to create test collection");
    }
    testCollection = createResponse.data;
  });

  test("GET /megadata/collections/:id/tokens - should return empty array when no tokens exist", async () => {
    const response = await api.megadata.collections[testCollection.id]!.tokens.get();
    expect(response.status).toBe(200);
    const data = response.data;
    expect(Array.isArray(data)).toBe(true);
    expect(data?.length).toBe(0);
  });

  test("POST /megadata/collections/:id/tokens - should create new token", async () => {
    const token = generateRandomToken();
    const response = await api.megadata.collections[testCollection.id]!.tokens.post(token);
    expect(response.status).toBe(201);
    const data = response.data;
    expect(data?.collection_id).toBe(testCollection.id);
    expect(data?.data).toEqual(token.data);
    expect(data?.is_published).toBe(false);
  });

  test("POST /megadata/collections/:id/tokens - should fail when collection does not exist", async () => {
    const token = generateRandomToken();
    const response = await api.megadata.collections[999999]!.tokens.post(token);
    expect(response.status).toBe(404);
  });

  test("GET /megadata/collections/:id/tokens/:token_id - should return token by id", async () => {
    // First create a token
    const token = generateRandomToken();
    console.log("testCollection", testCollection);
    const createResponse = await api.megadata.collections[testCollection.id]!.tokens.post(token);
    if (!createResponse.data?.id) {
      throw new Error("Failed to create test token");
    }
    const createdToken = createResponse.data;

    // Then get it by id
    const response = await api.megadata.collections[testCollection.id]!.tokens[createdToken.id]!.get();
    expect(response.status).toBe(200);
    const data = response.data;
    expect(data?.id).toBe(createdToken.id);
    expect(data?.collection_id).toBe(testCollection.id);
    expect(data?.data).toEqual(token.data);
  });

  test("GET /megadata/collections/:id/tokens/:token_id - should return 404 for non-existent token", async () => {
    const response = await api.megadata.collections[testCollection.id]!.tokens[999999]!.get();
    expect(response.status).toBe(404);
  });

  test("PUT /megadata/collections/:id/tokens/:token_id - should update token", async () => {
    // First create a token
    const token = generateRandomToken();
    const createResponse = await api.megadata.collections[testCollection.id]!.tokens.post(token);
    if (!createResponse.data?.id) {
      throw new Error("Failed to create test token");
    }
    const createdToken = createResponse.data;

    // Update the token
    const updateData = {
      data: {
        title: "Updated Title",
        description: "Updated Description"
      }
    };

    const response = await api.megadata.collections[testCollection.id]!.tokens[createdToken.id]!.put(updateData);
    expect(response.status).toBe(200);
    const data = response.data;
    expect(data?.id).toBe(createdToken.id);
    expect(data?.data).toEqual(updateData.data);
  });

  test("PUT /megadata/collections/:id/tokens/:token_id - should fail when token does not exist", async () => {
    const updateData = {
      data: {
        title: "Updated Title",
        description: "Updated Description"
      }
    };

    const response = await api.megadata.collections[testCollection.id]!.tokens[999999]!.put(updateData);
    expect(response.status).toBe(404);
  });

  test("DELETE /megadata/collections/:id/tokens/:token_id - should delete token", async () => {
    // First create a token
    const token = generateRandomToken();
    const createResponse = await api.megadata.collections[testCollection.id]!.tokens.post(token);
    if (!createResponse.data?.id) {
      throw new Error("Failed to create test token");
    }
    const createdToken = createResponse.data;

    // Delete the token
    const response = await api.megadata.collections[testCollection.id]!.tokens[createdToken.id]!.delete();
    expect(response.status).toBe(200);
    expect(response.data?.id).toBe(createdToken.id);

    // Verify it's deleted
    const getResponse = await api.megadata.collections[testCollection.id]!.tokens[createdToken.id]!.get();
    expect(getResponse.status).toBe(404);
  });

  test("DELETE /megadata/collections/:id/tokens/:token_id - should fail when token does not exist", async () => {
    const response = await api.megadata.collections[testCollection.id]!.tokens[999999]!.delete();
    expect(response.status).toBe(404);
  });
}); 