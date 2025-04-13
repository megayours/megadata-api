import { expect, test, describe } from "bun:test";
import "../setup";
import { testClient } from "hono/testing";
import { isErrorResponse } from "../helpers";
import { createTestApp } from "@/lib/create-app";
import router from "@/routes/module/module.index";
import { TEST_BYPASS_AUTH_HEADER } from "../../middleware/auth";

const app = testClient(createTestApp(router));

type ModuleResponse = {
  id: string;
  name: string;
  description?: string;
  version: string;
  createdAt: string;
  updatedAt: string;
};

describe("Module Routes", () => {
  test("GET /modules - should return list of modules", async () => {
    const response = await app.modules.$get(
      {},
      {
        headers: {
          'Content-Type': 'application/json',
          [TEST_BYPASS_AUTH_HEADER]: 'test_account'
        }
      }
    );
    expect(response.status).toBe(200);
    const data = await response.json() as ModuleResponse[];
    expect(Array.isArray(data)).toBe(true);
    expect(data.length).toBeGreaterThan(0);
    
    // Check if ERC721 module exists
    const erc721Module = data.find(m => m.id === 'erc721');
    expect(erc721Module).toBeDefined();
    expect(erc721Module?.name).toBe('ERC721');
  });

  test("GET /modules/:id - should return module by id", async () => {
    const response = await app.modules[":id"].$get(
      { param: { id: 'erc721' } },
      {
        headers: {
          'Content-Type': 'application/json',
          [TEST_BYPASS_AUTH_HEADER]: 'test_account'
        }
      }
    );
    expect(response.status).toBe(200);
    const data = await response.json() as ModuleResponse;
    expect(data).toBeDefined();
    expect(data.id).toBe('erc721');
    expect(data.name).toBe('ERC721');
  });

  test("GET /modules/:id - should return 404 for non-existent module", async () => {
    const response = await app.modules[":id"].$get(
      { param: { id: 'non-existent-module' } },
      {
        headers: {
          'Content-Type': 'application/json',
          [TEST_BYPASS_AUTH_HEADER]: 'test_account'
        }
      }
    );
    expect(response.status).toBe(404);
    const data = await response.json();
    expect(isErrorResponse(data)).toBe(true);
    if (isErrorResponse(data)) {
      expect(data.error).toBe('Module not found');
    }
  });
});
