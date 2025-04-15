import { SPECIAL_MODULES } from "../utils/constants";
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
      description: "The URI of the token's image",
      "x-upload": {
        type: "file",
        accept: "*/*",
        maxSize: "10MB",
        description: "Upload a file to generate the URI"
      }
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

const extendingCollectionSchema = {
  type: "object",
  required: ["source", "id"],
  properties: {
    source: { type: "string", description: "The source of the collection, e.g. a blockchain like Ethereum" },
    id: { type: "string", description: "The ID of the collection on the source, e.g. the contract address" }
  }
}

const multimediaAssetsSchema = {
  type: "object",
  required: ["multimedia"],
  properties: {
    multimedia: {
      type: "array",
      items: {
        type: "object",
        required: ["type", "uri"],
        properties: {
          id: { type: "string", description: "The ID of the multimedia asset" },
          uri: {
            type: "string",
            description: "The URI of the multimedia asset",
            "x-upload": {
              type: "file",
              accept: [
                // Images
                "image/png", "image/jpeg", "image/gif", "image/webp", "image/svg+xml",
                // Video
                "video/mp4", "video/webm", "video/ogg", "video/quicktime",
                // Audio
                "audio/mpeg", "audio/wav", "audio/ogg", "audio/mp3",
                // Documents
                "application/pdf", "application/msword", "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
                "application/vnd.ms-excel", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                "application/vnd.ms-powerpoint", "application/vnd.openxmlformats-officedocument.presentationml.presentation", "text/plain",
                // 2D & 3D Models
                "model/gltf-binary", "model/gltf+json", "model/obj", "model/stl", "model/3mf", "model/fbx", "model/vrml", "model/x3d+xml", "model/3dml", "application/octet-stream",
                // Multimedia archives
                "application/zip", "application/x-tar", "application/x-rar-compressed", "application/x-7z-compressed"
              ].join(", "),
              maxSize: "10MB",
              description: "Upload a file to generate the URI. Supports images, video, audio, documents, 2D/3D models, and multimedia archives."
            }
          }
        }
      }
    }
  }
}

const seedModules = async () => {
  try {
    await db
      .insert(module)
      .values({
        id: "erc721",
        name: "ERC721",
        description: "Format for standard ERC721 structured metadata",
        schema: erc721Schema
      })
      .onConflictDoUpdate({
        target: module.id,
        set: {
          name: "ERC721",
          description: "Format for standard ERC721 structured metadata",
          schema: erc721Schema
        }
      });

    await db
      .insert(module)
      .values({
        id: "extending_metadata",
        name: "Extending Metadata",
        description: "Enables the metadata of an existing URI to be extended",
        schema: extendingMetadataSchema
      })
      .onConflictDoUpdate({
        target: module.id,
        set: {
          name: "Extending Metadata",
          description: "Enables the metadata of an existing URI to be extended",
          schema: extendingMetadataSchema
        }
      });

    await db
      .insert(module)
      .values({
        id: SPECIAL_MODULES.EXTENDING_COLLECTION,
        name: "Extending Collection",
        description: "Enables the metadata of an existing collection to be extended",
        schema: extendingCollectionSchema
      })
      .onConflictDoUpdate({
        target: module.id,
        set: {
          name: "Extending Collection",
          description: "Enables the metadata of an existing collection to be extended",
          schema: extendingCollectionSchema
        }
      });

    await db
      .insert(module)
      .values({
        id: "multimedia_assets",
        name: "Multimedia Assets",
        description: "Enables the attachment of multimedia assets to a token",
        schema: multimediaAssetsSchema
      })
      .onConflictDoUpdate({
        target: module.id,
        set: {
          name: "Multimedia Assets",
          description: "Enables the attachment of multimedia assets to a token",
          schema: multimediaAssetsSchema
        }
      });
  } catch (error) {
    console.error("Error seeding modules:", error);
    throw error;
  }
};

seedModules().then(() => {
  console.log("Successfully seeded modules");
  process.exit(0);
}).catch((error) => {
  console.error("Error seeding modules:", error);
  process.exit(1);
}); 
