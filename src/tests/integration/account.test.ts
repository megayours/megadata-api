import { expect, test, describe } from "bun:test";
import "../setup";
import { generateRandomAccount, isErrorResponse } from "../helpers";
import type { AccountResponse } from "../../routes/account/types";
import { createApp } from "../../index";

const app = createApp();

describe("Account Routes", () => {
  test("POST /accounts - should create a new account", async () => {
    const account = generateRandomAccount();
    const response = await app.request('/accounts', {
      method: 'POST',
      body: JSON.stringify({
        id: account.id,
        type: account.type,
      }),
      headers: {
        'Content-Type': 'application/json'
      }
    });

    expect(response.status).toBe(201);
    const data = await response.json() as AccountResponse;
    expect(data).toBeDefined();
    if (!isErrorResponse(data)) {
      expect(data.id).toBe(account.id);
      expect(data.type).toBe(account.type);
    }
  });

  test("GET /accounts/:id - should return account by id", async () => {
    const account = generateRandomAccount();
    
    // Create account first
    await app.request('/accounts', {
      method: 'POST',
      body: JSON.stringify({
        id: account.id,
        type: account.type,
      }),
      headers: {
        'Content-Type': 'application/json'
      }
    });

    // Get account by id
    const response = await app.request(`/accounts/${account.id}`);
    expect(response.status).toBe(200);
    const data = await response.json() as AccountResponse;
    if (!isErrorResponse(data)) {
      expect(data.id).toBe(account.id);
      expect(data.type).toBe(account.type);
    }
  });

  test("GET /accounts/:id - should return 404 for non-existent account", async () => {
    const response = await app.request('/accounts/non-existent-id');
    expect(response.status).toBe(404);
  });

  test("DELETE /accounts/:id - should delete account", async () => {
    const account = generateRandomAccount();
    
    // Create account first
    await app.request('/accounts', {
      method: 'POST',
      body: JSON.stringify({
        id: account.id,
        type: account.type,
      }),
      headers: {
        'Content-Type': 'application/json'
      }
    });

    // Delete the account
    const response = await app.request(`/accounts/${account.id}`, {
      method: 'DELETE'
    });
    expect(response.status).toBe(200);

    // Verify account is deleted
    const getResponse = await app.request(`/accounts/${account.id}`);
    expect(getResponse.status).toBe(404);
  });

  test("DELETE /accounts/:id - should return 404 for non-existent account", async () => {
    const response = await app.request('/accounts/non-existent-account', {
      method: 'DELETE'
    });
    expect(response.status).toBe(404);
  });
}); 