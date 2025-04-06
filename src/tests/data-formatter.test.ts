import { describe, it, expect } from "bun:test";
import { formatData } from "../utils/data-formatter";

const erc721Schema = {
  type: "object",
  required: ["name", "description", "image"],
  properties: {
    name: {
      type: "string",
      description: "The name of the token"
    },
    description: {
      type: "string",
      description: "A description of the token"
    },
    image: {
      type: "string",
      description: "The URI of the token's image"
    },
    external_url: {
      type: "string",
      description: "An external URL for the token"
    },
    attributes: {
      type: "array",
      items: {
        type: "object",
        required: ["trait_type", "value"],
        properties: {
          trait_type: {
            type: "string",
            description: "The name of the trait"
          },
          value: {
            oneOf: [
              { type: "string" },
              { type: "number" },
              { type: "boolean" }
            ],
            description: "The value of the trait"
          },
          display_type: {
            type: "string",
            enum: ["string", "number", "boost_number", "boost_percentage", "date"],
            description: "How the trait should be displayed"
          }
        }
      }
    }
  }
};

const extendingMetadataSchema = {
  type: "object",
  required: ["uri"],
  properties: {
    uri: { type: "string", description: "The URI of the metadata to extend" }
  }
};

describe("Data Formatter", () => {
  it('should include expected properties', () => {
    const data = {
      "name": "Test Token",
      "description": "This is a test token",
      "image": "https://example.com/image.png",
      "attributes": [
        {
          "trait_type": "Color",
          "value": "Red"
        },
        {
          "trait_type": "Size",
          "value": "Large"
        }
      ]
    };

    const modules = [
      {
        "id": "erc721",
        "schema": erc721Schema,
      }
    ];

    const formattedData = formatData(data, modules);

    expect(formattedData).toEqual({
      "erc721": {
        "name": "Test Token",
        "description": "This is a test token",
        "image": "https://example.com/image.png",
        "attributes": [
          {
            "trait_type": "Color",
            "value": "Red"
          },
          {
            "trait_type": "Size",
            "value": "Large"
          }
        ]
      }
    })
  });

  it('should exclude properties that are not in the schema', () => {
    const data = {
      "name": "Test Token",
      "description": "This is a test token",
      "image": "https://example.com/image.png",
      "unexpected_property": "This should be excluded"
    }

    const modules = [
      {
        "id": "erc721",
        "schema": erc721Schema,
      }
    ]

    const formattedData = formatData(data, modules);

    expect(formattedData).toEqual({
      "erc721": {
        "name": "Test Token",
        "description": "This is a test token",
        "image": "https://example.com/image.png",
      }
    })
  });

  it('should format data for multiple modules', () => {
    const data = {
      "name": "Test Token",
      "description": "This is a test token",
      "image": "https://example.com/image.png",
      "uri": "https://example.com/uri"
    }

    const modules = [
      {
        "id": "erc721",
        "schema": erc721Schema,
      },
      {
        "id": "extending_metadata",
        "schema": extendingMetadataSchema,
      }
    ]

    const formattedData = formatData(data, modules);

    expect(formattedData).toEqual({
      "erc721": {
        "name": "Test Token",
        "description": "This is a test token",
        "image": "https://example.com/image.png",
      },
      "extending_metadata": {
        "uri": "https://example.com/uri"
      }
    });
  })
});