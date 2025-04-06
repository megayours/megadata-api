import { db } from "./index";
import { module } from "./schema";

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

const seedModules = async () => {
  try {
    // await db.insert(module).values({
    //   id: "erc721",
    //   name: "ERC721",
    //   description: "Format for standard ERC721 structured metadata",
    //   schema: erc721Schema
    // });

    await db.insert(module).values({
      id: "extending_metadata",
      name: "Extending Metadata",
      description: "Enables the metadata of an existing URI to be extended",
      schema: extendingMetadataSchema
    });
  } catch (error) {
    console.error("Error seeding modules:", error);
    throw error;
  }
};

seedModules().then(() => {
  console.log("Successfully seeded modules");
}).catch((error) => {
  console.error("Error seeding modules:", error);
  throw error;
}); 
