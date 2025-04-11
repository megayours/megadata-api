import { expect, test, describe } from "bun:test";
import "../setup";
import { createApp } from "../../index";
import { isErrorResponse, makeTestRequest } from "../helpers";
import type { Module } from "../../types/module";

const app = createApp();

describe("Module Routes", () => {
  test("GET /modules - should return list of modules", async () => {
    const response = await makeTestRequest(app, '/modules');
    expect(response.status).toBe(200);
    const data = await response.json() as Module[];
    expect(Array.isArray(data)).toBe(true);
    expect(data.length).toBeGreaterThan(0);
    
    // Check if ERC721 module exists
    const erc721Module = data.find(m => m.id === 'erc721');
    expect(erc721Module).toBeDefined();
    expect(erc721Module?.name).toBe('ERC721');
    expect(erc721Module?.schema).toBeDefined();
  });

  test("GET /modules/:id - should return module by id", async () => {
    const response = await makeTestRequest(app, '/modules/erc721');
    expect(response.status).toBe(200);
    const data = await response.json() as Module;
    expect(data).toBeDefined();
    expect(data.id).toBe('erc721');
    expect(data.name).toBe('ERC721');
    expect(data.schema).toBeDefined();
  });

  test("GET /modules/:id - should return 404 for non-existent module", async () => {
    const response = await makeTestRequest(app, '/modules/non-existent-module');
    expect(response.status).toBe(404);
    const data = await response.json();
    expect(isErrorResponse(data)).toBe(true);
    if (isErrorResponse(data)) {
      expect(data.error).toBe('Module not found');
    }
  });
});
