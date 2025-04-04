import { z } from "@hono/zod-openapi";
import { ErrorResponseSchema } from "../megadata/types";

export const UploadFileRequestSchema = z.object({
  file: z.string({ description: 'Base64 encoded file' }),
  contentType: z.string(),
  account: z.string()
});

export const UploadFileResponseSchema = z.object({
  hash: z.string({ description: 'Hash of the uploaded file in hex format' })
});

export const uploadFileRoute = {
  tags: ['megahub'],
  request: {
    body: {
      content: {
        'application/json': {
          schema: UploadFileRequestSchema
        }
      }
    }
  },
  responses: {
    201: {
      content: {
        'application/json': {
          schema: UploadFileResponseSchema
        }
      },
      description: 'Collection created successfully'
    },
    400: {
      content: {
        'application/json': {
          schema: ErrorResponseSchema
        }
      },
      description: 'Invalid request'
    },
    500: {
      content: {
        'application/json': {
          schema: ErrorResponseSchema
        }
      },
      description: 'Internal server error'
    }
  }
};
