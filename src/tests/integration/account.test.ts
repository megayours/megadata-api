import { expect, test, describe, beforeAll } from "bun:test";
import { app } from "../../index";
import { generateRandomAccount, setupTestDatabase } from "../helpers";
import { edenTreaty } from "@elysiajs/eden";
import { config } from "dotenv";
import { join } from "path";

config({ path: join(process.cwd(), ".env.local") });

const api = edenTreaty<typeof app>('http://localhost:3000');

describe("Account Routes", () => {
  
  beforeAll(async () => {
    await setupTestDatabase();
  });

  test("POST /accounts - should create a new account", async () => {
    const account = generateRandomAccount();
    const response = await api.accounts.post({
      id: account.id,
      type: account.type,
    });
    expect(response.status).toBe(201);
    const data = response.data;
    expect(data?.id).toBe(account.id);
    expect(data?.type).toBe(account.type);
  });

  test("GET /accounts/:id - should return account by id", async () => {
    const account = generateRandomAccount();
    
    await api.accounts.post({
      id: account.id,
      type: account.type,
    });

    // Get account by id
    const response = await api.accounts[account.id]!.get();
    expect(response.status).toBe(200);
    const data = response.data;
    expect(data?.id).toBe(account.id);
    expect(data?.type).toBe(account.type);
  });

  test("GET /accounts/:id - should return 404 for non-existent account", async () => {
    const response = await api.accounts["non-existent-id"]!.get();
    expect(response.status).toBe(404);
  });

  test("DELETE /accounts/:id - should delete account", async () => {
    const account = generateRandomAccount();
    // Create account first

    await api.accounts.post({
      id: account.id,
      type: account.type,
    });

    const response = await api.accounts[account.id]!.delete();

    expect(response.status).toBe(200);

    // Verify account is deleted
    const getResponse = await api.accounts[account.id]!.get();
    expect(getResponse.status).toBe(404);
  });

  test("DELETE /accounts/:id - should return 404 for non-existent account", async () => {
    const response = await api.accounts["non-existant-id"]!.delete();
    expect(response.status).toBe(404);
  });
}); 