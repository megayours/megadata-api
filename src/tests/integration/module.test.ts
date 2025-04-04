import { expect, test, describe } from "bun:test";
import "../setup";
import { createApp } from "../../index";
import { isErrorResponse } from "../helpers";
import type { Module } from "../../types/module";

const app = createApp();

describe("Module Routes", () => {
  test("GET /modules - should return list of modules", async () => {
    const response = await app.request('/modules');
    expect(response.status).toBe(200);
    const data = await response.json() as Module[];
    expect(Array.isArray(data)).toBe(true);
    expect(data.length).toBeGreaterThan(0);
    
    // Check if ERC721 module exists
    const erc721Module = data.find(m => m.id === 'erc721');
    expect(erc721Module).toBeDefined();
    expect(erc721Module?.name).toBe('ERC721');
    expect(erc721Module?.description).toBe('Standard ERC721 metadata schema');
    expect(erc721Module?.schema).toBeDefined();
  });

  test("GET /modules/:id - should return module by id", async () => {
    const response = await app.request('/modules/erc721');
    expect(response.status).toBe(200);
    const data = await response.json() as Module;
    if (!isErrorResponse(data)) {
      expect(data.id).toBe('erc721');
      expect(data.name).toBe('ERC721');
      expect(data.description).toBe('Standard ERC721 metadata schema');
      expect(data.schema).toBeDefined();
      expect(data.schema.type).toBe('object');
      expect(data.schema.required).toContain('name');
      expect(data.schema.required).toContain('description');
      expect(data.schema.required).toContain('image');
    }
  });

  test("GET /modules/:id - should return 404 for non-existent module", async () => {
    const response = await app.request('/modules/non-existent-module');
    expect(response.status).toBe(404);
  });
});

describe("Module Validation", () => {
  test("should validate valid ERC721 metadata", async () => {
    const validMetadata = {
      name: "Test Token",
      description: "A test token",
      image: "https://example.com/image.png",
      external_url: "https://example.com",
      attributes: [
        {
          trait_type: "Base",
          value: "Starfish"
        },
        {
          trait_type: "Level",
          value: 5
        }
      ]
    };

    const response = await app.request('/modules/erc721/validate', {
      method: 'POST',
      body: JSON.stringify(validMetadata),
      headers: {
        'Content-Type': 'application/json'
      }
    });

    expect(response.status).toBe(200);
    const data = await response.json() as { valid: boolean };
    expect(data.valid).toBe(true);
  });

  test("should reject invalid ERC721 metadata", async () => {
    const invalidMetadata = {
      // Missing required fields
      description: "A test token",
      image: "https://example.com/image.png"
    };

    const response = await app.request('/modules/erc721/validate', {
      method: 'POST',
      body: JSON.stringify(invalidMetadata),
      headers: {
        'Content-Type': 'application/json'
      }
    });

    expect(response.status).toBe(400);
    const data = await response.json() as { valid: boolean; errors: string[] };
    expect(data.valid).toBe(false);
    expect(data.errors).toBeDefined();
    expect(data.errors).toContain("must have required property 'name'");
  });

  test("should validate attributes with display_type", async () => {
    const metadata = {
      name: "Test Token",
      description: "A test token",
      image: "https://example.com/image.png",
      attributes: [
        {
          trait_type: "Power",
          value: 40,
          display_type: "boost_number"
        },
        {
          trait_type: "Stamina",
          value: 10,
          display_type: "boost_percentage"
        }
      ]
    };

    const response = await app.request('/modules/erc721/validate', {
      method: 'POST',
      body: JSON.stringify(metadata),
      headers: {
        'Content-Type': 'application/json'
      }
    });

    expect(response.status).toBe(200);
    const data = await response.json() as { valid: boolean };
    expect(data.valid).toBe(true);
  });

  test("should reject invalid attribute types", async () => {
    const metadata = {
      name: "Test Token",
      description: "A test token",
      image: "https://example.com/image.png",
      attributes: [
        {
          trait_type: "Power",
          value: "40", // Should be number for boost_number
          display_type: "boost_number"
        }
      ]
    };

    const response = await app.request('/modules/erc721/validate', {
      method: 'POST',
      body: JSON.stringify(metadata),
      headers: {
        'Content-Type': 'application/json'
      }
    });

    expect(response.status).toBe(400);
    const data = await response.json() as { valid: boolean; errors: string[] };
    expect(data.valid).toBe(false);
    expect(data.errors).toBeDefined();
  });
}); 